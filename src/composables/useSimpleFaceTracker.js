import { ref, reactive, onMounted, onUnmounted } from 'vue'

/**
 * シンプル顔検出ベース視線追跡システム
 * MediaPipeの複雑な初期化を回避し、ブラウザネイティブAPIを活用
 */
export function useSimpleFaceTracker() {
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
    headPose: {     // 頭部姿勢推定
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
    smoothingFactor: 0.3, // より敏感に（0.7 → 0.3）
    confidenceThreshold: 0.3, // より低い閾値で検出（0.5 → 0.3）
    debugMode: true
  })
  
  // パフォーマンス統計
  const stats = reactive({
    fps: 0,
    frameCount: 0,
    lastUpdate: Date.now()
  })
  
  // Face Detection API
  let faceDetector = null
  let animationFrame = null
  let lastFrameTime = 0
  
  /**
   * ブラウザネイティブFace Detection初期化
   */
  const initializeFaceDetection = async () => {
    try {
      console.log('🚀 ブラウザネイティブ顔検出初期化開始')
      
      // ブラウザ対応チェック
      if (!('FaceDetector' in window)) {
        console.log('⚠️ ブラウザネイティブFaceDetectorが利用できません')
        await initializeFallbackDetection()
        return
      }
      
      // Face Detector初期化
      faceDetector = new FaceDetector({
        maxDetectedFaces: 1,
        fastMode: true
      })
      
      console.log('✅ ブラウザネイティブ顔検出初期化完了')
      isInitialized.value = true
      
    } catch (err) {
      console.error('❌ ネイティブ顔検出初期化エラー:', err)
      await initializeFallbackDetection()
    }
  }
  
  /**
   * フォールバック: OpenCVベース顔検出
   */
  const initializeFallbackDetection = async () => {
    console.log('🔄 フォールバック顔検出システム初期化中...')
    
    try {
      // シンプルな顔領域推定システム
      await initializeSimpleFaceDetection()
      
      console.log('✅ フォールバック顔検出初期化完了')
      isInitialized.value = true
      
    } catch (err) {
      console.error('❌ フォールバック初期化失敗:', err)
      error.value = '顔検出システムの初期化に失敗しました'
    }
  }
  
  /**
   * 超シンプル顔検出（色ベース）
   */
  const initializeSimpleFaceDetection = async () => {
    console.log('🎯 シンプル顔検出システム初期化')
    
    // 肌色ベース顔領域推定システム
    // HSV色空間で肌色範囲を検出
    isInitialized.value = true
  }
  
  /**
   * カメラストリーム開始
   */
  const startCamera = async (constraints = {}) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
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
   * 視線追跡開始
   */
  const startTracking = async (videoEl, canvasEl) => {
    try {
      videoElement.value = videoEl
      canvasElement.value = canvasEl
      
      if (canvasEl) {
        canvasCtx.value = canvasEl.getContext('2d')
      }
      
      if (!isInitialized.value) {
        await initializeFaceDetection()
      }
      
      await startCamera()
      
      // フレーム処理開始
      startFrameProcessing()
      
      isTracking.value = true
      console.log('✅ シンプル視線追跡開始')
      
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
        await detectFace()
        updateStats()
      } catch (err) {
        console.error('フレーム処理エラー:', err)
      }
      
      animationFrame = requestAnimationFrame(processFrame)
    }
    
    animationFrame = requestAnimationFrame(processFrame)
  }
  
  /**
   * 顔検出実行
   */
  const detectFace = async () => {
    if (!videoElement.value || !canvasElement.value) return
    
    const video = videoElement.value
    const canvas = canvasElement.value
    const ctx = canvasCtx.value
    
    // ビデオフレームをキャンバスに描画
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    if (faceDetector) {
      // ブラウザネイティブ顔検出
      try {
        const faces = await faceDetector.detect(canvas)
        processFaceDetectionResults(faces)
      } catch (err) {
        // フォールバック検出
        processSimpleFaceDetection(ctx, canvas)
      }
    } else {
      // シンプル顔検出
      processSimpleFaceDetection(ctx, canvas)
    }
  }
  
  /**
   * 顔検出結果処理
   */
  const processFaceDetectionResults = (faces) => {
    if (faces && faces.length > 0) {
      const face = faces[0]
      
      faceDetected.value = true
      
      // 顔の位置・サイズ更新
      const bbox = face.boundingBox
      faceData.x = bbox.x + bbox.width / 2
      faceData.y = bbox.y + bbox.height / 2
      faceData.width = bbox.width
      faceData.height = bbox.height
      faceData.confidence = face.confidence || 0.8
      
      // 簡易頭部姿勢推定
      calculateSimpleHeadPose(bbox)
      
      // デバッグ描画
      if (settings.debugMode) {
        drawFaceDebug(bbox)
      }
      
    } else {
      faceDetected.value = false
      resetFaceData()
    }
  }
  
  /**
   * シンプル顔検出（色ベース）
   */
  const processSimpleFaceDetection = (ctx, canvas) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    let skinPixelCount = 0
    let totalPixels = 0
    let centroidX = 0
    let centroidY = 0
    
    // 肌色検出（簡易版）
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // 肌色判定（簡易HSV範囲）
      if (isSkinColor(r, g, b)) {
        const pixelIndex = i / 4
        const x = pixelIndex % canvas.width
        const y = Math.floor(pixelIndex / canvas.width)
        
        centroidX += x
        centroidY += y
        skinPixelCount++
      }
      totalPixels++
    }
    
    // 顔中心推定
    if (skinPixelCount > totalPixels * 0.05) { // 5%以上が肌色
      faceDetected.value = true
      
      faceData.x = centroidX / skinPixelCount
      faceData.y = centroidY / skinPixelCount
      faceData.width = Math.sqrt(skinPixelCount) * 2
      faceData.height = Math.sqrt(skinPixelCount) * 2.5
      faceData.confidence = Math.min(skinPixelCount / (totalPixels * 0.1), 1)
      
      // 簡易頭部姿勢推定
      calculateSimpleHeadPose({
        x: faceData.x - faceData.width / 2,
        y: faceData.y - faceData.height / 2,
        width: faceData.width,
        height: faceData.height
      })
      
    } else {
      faceDetected.value = false
      resetFaceData()
    }
  }
  
  /**
   * 改良版肌色判定（より広範囲の肌色に対応）
   */
  const isSkinColor = (r, g, b) => {
    // より広範囲の肌色判定
    const rgbCondition1 = (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15 &&
      r - b > 15
    )
    
    // 追加の肌色判定（アジア系、白人系）
    const rgbCondition2 = (
      r > 80 && g > 50 && b > 30 &&
      r > b && g > b &&
      Math.abs(r - g) < 30
    )
    
    // HSV変換による判定
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    
    let h = 0
    if (delta > 0) {
      if (max === r) h = ((g - b) / delta) % 6
      else if (max === g) h = (b - r) / delta + 2
      else h = (r - g) / delta + 4
      h *= 60
    }
    
    const s = max === 0 ? 0 : delta / max
    const v = max / 255
    
    // 肌色のHSV範囲
    const hsvCondition = (
      ((h >= 0 && h <= 30) || (h >= 330 && h <= 360)) &&
      s >= 0.2 && s <= 0.7 &&
      v >= 0.4 && v <= 0.95
    )
    
    return rgbCondition1 || rgbCondition2 || hsvCondition
  }
  
  /**
   * 改良版頭部姿勢推定（より高精度）
   */
  const calculateSimpleHeadPose = (bbox) => {
    const canvas = canvasElement.value
    if (!canvas) return
    
    const faceCenterX = bbox.x + bbox.width / 2
    const faceCenterY = bbox.y + bbox.height / 2
    
    const screenCenterX = canvas.width / 2
    const screenCenterY = canvas.height / 2
    
    // 正規化座標 (-1 to 1) - より感度を高める
    const normalizedX = (faceCenterX - screenCenterX) / (screenCenterX * 0.6) // 感度UP
    const normalizedY = (faceCenterY - screenCenterY) / (screenCenterY * 0.6) // 感度UP
    
    // 範囲制限
    const clampedX = Math.max(-1, Math.min(1, normalizedX))
    const clampedY = Math.max(-1, Math.min(1, normalizedY))
    
    // 頭部姿勢に変換（度単位） - より大きな角度範囲
    faceData.headPose.yaw = clampedX * 45  // -45° to +45°
    faceData.headPose.pitch = clampedY * 35 // -35° to +35°
    faceData.headPose.roll = 0 // 簡略化
    
    // スムージング適用
    applySmoothing()
    
    // デバッグログ（開発時のみ）
    if (settings.debugMode && Date.now() % 1000 < 50) {
      console.log(`頭部姿勢: Yaw=${Math.round(faceData.headPose.yaw)}°, Pitch=${Math.round(faceData.headPose.pitch)}°`)
    }
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
   * デバッグ描画
   */
  const drawFaceDebug = (bbox) => {
    const ctx = canvasCtx.value
    if (!ctx) return
    
    // 顔のバウンディングボックス
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height)
    
    // 中心点
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(faceData.x, faceData.y, 5, 0, 2 * Math.PI)
    ctx.fill()
    
    // 信頼度表示
    ctx.fillStyle = '#00ff00'
    ctx.font = '16px Arial'
    ctx.fillText(`信頼度: ${Math.round(faceData.confidence * 100)}%`, 10, 30)
    ctx.fillText(`FPS: ${stats.fps}`, 10, 50)
    
    // 頭部姿勢表示
    ctx.fillText(`Yaw: ${Math.round(faceData.headPose.yaw)}°`, 10, 70)
    ctx.fillText(`Pitch: ${Math.round(faceData.headPose.pitch)}°`, 10, 90)
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
    console.log('⏹️ シンプル視線追跡停止')
  }
  
  // クリーンアップ
  onUnmounted(() => {
    stopTracking()
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
    initializeFaceDetection,
    startTracking,
    stopTracking,
    startCamera
  }
}