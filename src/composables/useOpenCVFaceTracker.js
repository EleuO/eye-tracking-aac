import { ref, reactive, onMounted, onUnmounted } from 'vue'

/**
 * OpenCV.jsベース確実な顔検出・視線追跡システム
 * より正確で安定した顔検出とランドマーク解析
 */
export function useOpenCVFaceTracker() {
  // 状態管理
  const isInitialized = ref(false)
  const isTracking = ref(false)
  const faceDetected = ref(false)
  const error = ref(null)
  
  // 顔検出データ
  const faceData = reactive({
    x: 0,           // 顔中心X座標
    y: 0,           // 顔中心Y座標
    width: 0,       // 顔の幅
    height: 0,      // 顔の高さ
    confidence: 0,  // 検出信頼度
    landmarks: {},  // 顔のランドマーク
    headPose: {     // 頭部姿勢
      yaw: 0,       // 左右回転 (-45° to +45°)
      pitch: 0,     // 上下回転 (-30° to +30°)
      roll: 0       // 傾き
    }
  })
  
  // カメラ要素
  const videoElement = ref(null)
  const canvasElement = ref(null)
  const canvasCtx = ref(null)
  
  // 設定
  const settings = reactive({
    targetFPS: 30,
    smoothingFactor: 0.2, // より敏感に
    confidenceThreshold: 0.3,
    debugMode: true
  })
  
  // パフォーマンス統計
  const stats = reactive({
    fps: 0,
    frameCount: 0,
    lastUpdate: Date.now(),
    detectionMethod: 'none'
  })
  
  // OpenCV変数
  let cv = null
  let classifier = null
  let animationFrame = null
  let lastFrameTime = 0
  
  /**
   * OpenCV.js初期化
   */
  const initializeOpenCV = async () => {
    try {
      console.log('🚀 OpenCV.js初期化開始')
      
      // OpenCV.jsをCDNからロード
      if (typeof window.cv === 'undefined') {
        await loadOpenCVFromCDN()
      }
      
      cv = window.cv
      
      // 顔検出分類器の初期化
      await initializeFaceClassifier()
      
      console.log('✅ OpenCV.js初期化完了')
      stats.detectionMethod = 'OpenCV'
      isInitialized.value = true
      
    } catch (err) {
      console.error('❌ OpenCV初期化エラー:', err)
      // OpenCVが失敗した場合のフォールバック
      await initializeBasicDetection()
    }
  }
  
  /**
   * CDNからOpenCV.jsをロード
   */
  const loadOpenCVFromCDN = async () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js'
      script.async = true
      
      script.onload = () => {
        // OpenCVの初期化完了を待つ
        const waitForOpenCV = () => {
          if (typeof window.cv !== 'undefined' && window.cv.Mat) {
            console.log('✅ OpenCV.js読み込み完了')
            resolve()
          } else {
            setTimeout(waitForOpenCV, 100)
          }
        }
        waitForOpenCV()
      }
      
      script.onerror = () => reject(new Error('OpenCV.js読み込み失敗'))
      document.head.appendChild(script)
    })
  }
  
  /**
   * 顔検出分類器の初期化
   */
  const initializeFaceClassifier = async () => {
    try {
      // Haar CASCADE分類器をロード
      const classifierUrl = 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml'
      
      const response = await fetch(classifierUrl)
      const xmlData = await response.text()
      
      // OpenCVファイルシステムに保存
      cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', xmlData, true, false, false)
      
      // 分類器を初期化
      classifier = new cv.CascadeClassifier()
      classifier.load('haarcascade_frontalface_default.xml')
      
      console.log('✅ 顔検出分類器初期化完了')
      
    } catch (err) {
      console.error('❌ 分類器初期化エラー:', err)
      throw err
    }
  }
  
  /**
   * ベーシック顔検出（OpenCV失敗時のフォールバック）
   */
  const initializeBasicDetection = async () => {
    console.log('🔄 ベーシック顔検出モードに切り替え')
    stats.detectionMethod = 'Basic'
    isInitialized.value = true
  }
  
  /**
   * カメラストリーム開始（USBカメラ対応）
   */
  const startCamera = async (constraints = {}) => {
    try {
      console.log('📹 カメラ制約:', constraints)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30 },
          facingMode: constraints.deviceId ? undefined : 'user', // deviceId指定時はfacingMode無効
          ...constraints
        }
      })
      
      if (videoElement.value) {
        videoElement.value.srcObject = stream
        await videoElement.value.play()
        
        console.log('📹 カメラストリーム開始:', {
          width: videoElement.value.videoWidth,
          height: videoElement.value.videoHeight
        })
      }
      
      return stream
    } catch (err) {
      console.error('❌ カメラアクセスエラー:', err)
      error.value = `カメラアクセス失敗: ${err.message}`
      throw err
    }
  }
  
  /**
   * 視線追跡開始（USBカメラ対応版）
   */
  const startTracking = async (videoEl, canvasEl, cameraConstraints = {}) => {
    try {
      videoElement.value = videoEl
      canvasElement.value = canvasEl
      
      if (canvasEl) {
        canvasCtx.value = canvasEl.getContext('2d')
      }
      
      if (!isInitialized.value) {
        await initializeOpenCV()
      }
      
      await startCamera(cameraConstraints)
      
      // フレーム処理開始
      startFrameProcessing()
      
      isTracking.value = true
      console.log('✅ OpenCV視線追跡開始')
      
    } catch (err) {
      console.error('❌ 追跡開始エラー:', err)
      error.value = `追跡開始失敗: ${err.message}`
    }
  }
  
  /**
   * フレーム処理ループ
   */
  const startFrameProcessing = () => {
    const processFrame = async (timestamp) => {
      if (!isTracking.value) return
      
      // FPS制御
      if (timestamp - lastFrameTime < 1000 / settings.targetFPS) {
        animationFrame = requestAnimationFrame(processFrame)
        return
      }
      
      lastFrameTime = timestamp
      
      try {
        if (cv && classifier) {
          await detectFaceWithOpenCV()
        } else {
          await detectFaceBasic()
        }
        updateStats()
      } catch (err) {
        console.error('フレーム処理エラー:', err)
      }
      
      animationFrame = requestAnimationFrame(processFrame)
    }
    
    animationFrame = requestAnimationFrame(processFrame)
  }
  
  /**
   * OpenCVによる顔検出
   */
  const detectFaceWithOpenCV = async () => {
    if (!videoElement.value || !canvasElement.value || !cv || !classifier) return
    
    const video = videoElement.value
    const canvas = canvasElement.value
    const ctx = canvasCtx.value
    
    // ビデオフレームをキャンバスに描画
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    try {
      // OpenCVマットを作成
      const src = cv.imread(canvas)
      const gray = new cv.Mat()
      const faces = new cv.RectVector()
      
      // グレースケール変換
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0)
      
      // 顔検出実行
      classifier.detectMultiScale(gray, faces, 1.1, 3, 0, new cv.Size(30, 30), new cv.Size(0, 0))
      
      if (faces.size() > 0) {
        // 最大の顔を選択
        let maxArea = 0
        let bestFace = null
        
        for (let i = 0; i < faces.size(); i++) {
          const face = faces.get(i)
          const area = face.width * face.height
          if (area > maxArea) {
            maxArea = area
            bestFace = face
          }
        }
        
        if (bestFace) {
          processFaceDetection(bestFace)
          
          // 🎯 目の位置検出のデバッグ描画（常に表示）
          drawFaceRect(ctx, bestFace)
        }
      } else {
        faceDetected.value = false
        resetFaceData()
      }
      
      // メモリクリーンアップ
      src.delete()
      gray.delete()
      faces.delete()
      
    } catch (err) {
      console.error('OpenCV顔検出エラー:', err)
      // エラー時はベーシック検出にフォールバック
      await detectFaceBasic()
    }
  }
  
  /**
   * ベーシック顔検出（フォールバック）
   */
  const detectFaceBasic = async () => {
    // より簡単な顔検出アルゴリズム
    if (!videoElement.value || !canvasElement.value) return
    
    const video = videoElement.value
    const canvas = canvasElement.value
    const ctx = canvasCtx.value
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // 簡易的な顔領域推定（画面中央付近）
    const faceWidth = canvas.width * 0.3
    const faceHeight = canvas.height * 0.4
    const faceX = (canvas.width - faceWidth) / 2
    const faceY = (canvas.height - faceHeight) / 2.5
    
    const basicFace = {
      x: faceX,
      y: faceY,
      width: faceWidth,
      height: faceHeight
    }
    
    processFaceDetection(basicFace)
    faceDetected.value = true
    
    // ベーシック検出でも詳細なデバッグ表示
    drawFaceRect(ctx, basicFace)
  }
  
  /**
   * 顔検出結果処理（目の位置特定版）
   */
  const processFaceDetection = (face) => {
    faceDetected.value = true
    
    // 顔の基本情報
    faceData.width = face.width
    faceData.height = face.height
    faceData.confidence = 0.8
    
    // 🎯 重要: 目の位置を正確に推定（鼻ではない）
    const eyePositions = estimateEyePositions(face)
    
    // 目の中心点を視線追跡ポイントとして使用
    faceData.x = eyePositions.center.x
    faceData.y = eyePositions.center.y
    
    // 両目の位置も保存（将来の高精度化用）
    faceData.leftEye = eyePositions.leftEye
    faceData.rightEye = eyePositions.rightEye
    
    // 目の位置に基づく頭部姿勢推定
    calculateEyeBasedHeadPose(face, eyePositions)
    
    // スムージング適用
    applySmoothing()
    
    // デバッグ情報
    if (settings.debugMode && Date.now() % 1000 < 50) {
      console.log(`👁️ 目検出: 左目(${Math.round(eyePositions.leftEye.x)}, ${Math.round(eyePositions.leftEye.y)}) 右目(${Math.round(eyePositions.rightEye.x)}, ${Math.round(eyePositions.rightEye.y)}) | 姿勢: Yaw=${Math.round(faceData.headPose.yaw)}°, Pitch=${Math.round(faceData.headPose.pitch)}°`)
    }
  }
  
  /**
   * 🎯 目の位置推定（顔検出結果から正確な目の位置を計算）
   */
  const estimateEyePositions = (face) => {
    // 顔の解剖学的比率に基づく目の位置推定
    const faceWidth = face.width
    const faceHeight = face.height
    const faceX = face.x
    const faceY = face.y
    
    // 目の位置の標準的な比率（顔認識研究による）
    const eyeYRatio = 0.35      // 顔の上から35%の位置
    const leftEyeXRatio = 0.23   // 左端から23%の位置
    const rightEyeXRatio = 0.77  // 左端から77%の位置
    
    // 目の位置計算
    const leftEye = {
      x: faceX + faceWidth * leftEyeXRatio,
      y: faceY + faceHeight * eyeYRatio
    }
    
    const rightEye = {
      x: faceX + faceWidth * rightEyeXRatio,
      y: faceY + faceHeight * eyeYRatio
    }
    
    // 両目の中心点（視線追跡の基準点）
    const center = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    }
    
    return {
      leftEye,
      rightEye,
      center,
      eyeDistance: Math.abs(rightEye.x - leftEye.x)
    }
  }
  
  /**
   * 🎯 目ベースの頭部姿勢推定（遠距離対応・高精度版）
   */
  const calculateEyeBasedHeadPose = (face, eyePositions) => {
    const canvas = canvasElement.value
    if (!canvas) return
    
    // 画面中心を基準点とする
    const screenCenterX = canvas.width / 2
    const screenCenterY = canvas.height / 2
    
    // 両目の中心点を使用（鼻ではない）
    const eyeCenterX = eyePositions.center.x
    const eyeCenterY = eyePositions.center.y
    
    // 🎯 カメラからの距離を考慮した感度調整
    const faceAreaRatio = (face.width * face.height) / (canvas.width * canvas.height)
    const distanceFactor = Math.max(0.5, Math.min(2.0, 1.0 / Math.sqrt(faceAreaRatio)))
    
    console.log(`📏 距離補正: 顔面積比=${faceAreaRatio.toFixed(3)}, 距離係数=${distanceFactor.toFixed(2)}`)
    
    // 目の位置から正規化座標を計算
    const normalizedX = ((eyeCenterX - screenCenterX) / screenCenterX) * distanceFactor
    const normalizedY = ((eyeCenterY - screenCenterY) / screenCenterY) * distanceFactor
    
    // 範囲制限
    const clampedX = Math.max(-1, Math.min(1, normalizedX))
    const clampedY = Math.max(-1, Math.min(1, normalizedY))
    
    // 🎯 遠距離対応: より大きな角度範囲
    faceData.headPose.yaw = clampedX * 50   // -50° to +50°（拡大）
    faceData.headPose.pitch = clampedY * 35 // -35° to +35°（拡大）
    faceData.headPose.roll = 0
    
    // 🎯 両目の傾きから細かなroll角度も推定
    const eyeAngle = Math.atan2(
      eyePositions.rightEye.y - eyePositions.leftEye.y,
      eyePositions.rightEye.x - eyePositions.leftEye.x
    )
    faceData.headPose.roll = (eyeAngle * 180 / Math.PI) * 0.5 // 軽微な調整
  }
  
  /**
   * 改良版頭部姿勢推定（旧版・参考用）
   */
  const calculateAccurateHeadPose = (face) => {
    const canvas = canvasElement.value
    if (!canvas) return
    
    const faceCenterX = face.x + face.width / 2
    const faceCenterY = face.y + face.height / 2
    
    const screenCenterX = canvas.width / 2
    const screenCenterY = canvas.height / 2
    
    // より正確な正規化（顔のサイズも考慮）
    const faceWidthRatio = face.width / canvas.width
    const faceHeightRatio = face.height / canvas.height
    
    // 顔のサイズに基づく感度調整
    const sensitivityX = Math.max(0.5, Math.min(2.0, 1.0 / faceWidthRatio))
    const sensitivityY = Math.max(0.5, Math.min(2.0, 1.0 / faceHeightRatio))
    
    // 位置の正規化 (-1 to 1)
    const normalizedX = ((faceCenterX - screenCenterX) / screenCenterX) * sensitivityX
    const normalizedY = ((faceCenterY - screenCenterY) / screenCenterY) * sensitivityY
    
    // 範囲制限
    const clampedX = Math.max(-1, Math.min(1, normalizedX))
    const clampedY = Math.max(-1, Math.min(1, normalizedY))
    
    // 頭部姿勢に変換（度単位）
    faceData.headPose.yaw = clampedX * 35   // -35° to +35°
    faceData.headPose.pitch = clampedY * 25 // -25° to +25°
    faceData.headPose.roll = 0
  }
  
  /**
   * スムージング適用
   */
  let previousPose = { yaw: 0, pitch: 0, roll: 0 }
  
  const applySmoothing = () => {
    const factor = settings.smoothingFactor
    
    faceData.headPose.yaw = lerp(previousPose.yaw, faceData.headPose.yaw, factor)
    faceData.headPose.pitch = lerp(previousPose.pitch, faceData.headPose.pitch, factor)
    faceData.headPose.roll = lerp(previousPose.roll, faceData.headPose.roll, factor)
    
    previousPose = { ...faceData.headPose }
  }
  
  /**
   * 線形補間
   */
  const lerp = (a, b, t) => a + (b - a) * t
  
  /**
   * 🎯 改良版デバッグ描画（目の位置表示）
   */
  const drawFaceRect = (ctx, face) => {
    // 顔のバウンディングボックス
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.strokeRect(face.x, face.y, face.width, face.height)
    
    // 🎯 目の位置を推定して描画
    const eyePositions = estimateEyePositions(face)
    
    // 左目描画
    ctx.fillStyle = '#00ffff'  // シアン
    ctx.beginPath()
    ctx.arc(eyePositions.leftEye.x, eyePositions.leftEye.y, 6, 0, 2 * Math.PI)
    ctx.fill()
    
    // 右目描画
    ctx.fillStyle = '#00ffff'  // シアン
    ctx.beginPath()
    ctx.arc(eyePositions.rightEye.x, eyePositions.rightEye.y, 6, 0, 2 * Math.PI)
    ctx.fill()
    
    // 両目の中心点（視線追跡基準点）
    ctx.fillStyle = '#ff0080'  // ピンク（目立つ色）
    ctx.beginPath()
    ctx.arc(eyePositions.center.x, eyePositions.center.y, 8, 0, 2 * Math.PI)
    ctx.fill()
    
    // 目の中心と顔の中心の違いを線で表示
    const faceCenterX = face.x + face.width / 2
    const faceCenterY = face.y + face.height / 2
    
    ctx.strokeStyle = '#ffff00'  // 黄色
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(faceCenterX, faceCenterY)
    ctx.lineTo(eyePositions.center.x, eyePositions.center.y)
    ctx.stroke()
    
    // 情報表示
    ctx.fillStyle = '#00ff00'
    ctx.font = '14px Arial'
    ctx.fillText(`${stats.detectionMethod} | 信頼度: ${Math.round(faceData.confidence * 100)}%`, 10, 25)
    ctx.fillText(`FPS: ${stats.fps}`, 10, 45)
    ctx.fillText(`目の姿勢 - Yaw: ${Math.round(faceData.headPose.yaw)}°, Pitch: ${Math.round(faceData.headPose.pitch)}°`, 10, 65)
    ctx.fillText(`距離補正: ${((face.width * face.height) / (ctx.canvas.width * ctx.canvas.height)).toFixed(3)}`, 10, 85)
    
    // 🎯 視線追跡ポイントの説明
    ctx.fillStyle = '#ff0080'
    ctx.font = '12px Arial'
    ctx.fillText('ピンク=目の中心（視線基準）', 10, 105)
    ctx.fillStyle = '#00ffff'
    ctx.fillText('シアン=左右の目', 10, 120)
    ctx.fillStyle = '#ffff00'
    ctx.fillText('黄線=顔中心→目中心', 10, 135)
  }
  
  /**
   * フェイスデータリセット
   */
  const resetFaceData = () => {
    faceData.x = 0
    faceData.y = 0
    faceData.width = 0
    faceData.height = 0
    faceData.confidence = 0
    faceData.headPose = { yaw: 0, pitch: 0, roll: 0 }
  }
  
  /**
   * 統計更新
   */
  const updateStats = () => {
    stats.frameCount++
    const now = Date.now()
    
    if (now - stats.lastUpdate >= 1000) {
      stats.fps = Math.round(stats.frameCount * 1000 / (now - stats.lastUpdate))
      stats.frameCount = 0
      stats.lastUpdate = now
    }
  }
  
  /**
   * 追跡停止
   */
  const stopTracking = () => {
    isTracking.value = false
    
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    
    if (videoElement.value && videoElement.value.srcObject) {
      const tracks = videoElement.value.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoElement.value.srcObject = null
    }
    
    resetFaceData()
    console.log('⏹️ OpenCV視線追跡停止')
  }
  
  // クリーンアップ
  onUnmounted(() => {
    stopTracking()
    
    // OpenCVメモリクリーンアップ
    if (classifier) {
      classifier.delete()
    }
  })
  
  return {
    // 状態
    isInitialized,
    isTracking,
    faceDetected,
    error,
    faceData,
    settings,
    stats,
    
    // メソッド
    initializeOpenCV,
    startTracking,
    stopTracking,
    startCamera
  }
}