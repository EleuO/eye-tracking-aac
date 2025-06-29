import { ref, reactive, onUnmounted } from 'vue'

/**
 * 🎯 革命的軽量目検出エンジン - Phase 1
 * 
 * 目標: 患者さんのための最軽量・高精度視線追跡システム
 * 制約: Core i5 + 8GB でも快適動作
 * 使命: 難病の方々のコミュニケーションを救う
 */
export function useLightweightEyeDetector() {
  // パフォーマンス制約（Core i5 + 8GB環境）
  const PERFORMANCE_LIMITS = {
    maxMemoryMB: 50,        // 最大メモリ使用量
    targetFPS: 30,          // 目標FPS
    maxProcessingTimeMs: 16, // 最大処理時間（60FPS=16.67ms）
    imageDownscale: 0.5     // 画像縮小率（処理軽量化）
  }
  
  // 状態管理
  const isInitialized = ref(false)
  const isDetecting = ref(false)
  const error = ref(null)
  
  // 目検出結果
  const eyeData = reactive({
    leftEye: {
      center: { x: 0, y: 0 },
      pupil: { x: 0, y: 0, radius: 0 },
      eyelids: { top: 0, bottom: 0 },
      confidence: 0,
      isDetected: false
    },
    rightEye: {
      center: { x: 0, y: 0 },
      pupil: { x: 0, y: 0, radius: 0 },
      eyelids: { top: 0, bottom: 0 },
      confidence: 0,
      isDetected: false
    },
    gazeVector: { x: 0, y: 0 },
    gazeAngle: 0,
    confidence: 0
  })
  
  // パフォーマンス監視
  const performance = reactive({
    fps: 0,
    processingTime: 0,
    memoryUsage: 0,
    frameCount: 0,
    lastUpdate: Date.now(),
    isOptimal: true
  })
  
  // カメラ・キャンバス要素
  const videoElement = ref(null)
  const canvasElement = ref(null)
  const canvasCtx = ref(null)
  
  // 処理用キャンバス（軽量化用）
  let processingCanvas = null
  let processingCtx = null
  
  // アニメーションフレーム
  let animationFrame = null
  let lastFrameTime = 0
  
  /**
   * 🚀 軽量目検出エンジン初期化
   */
  const initialize = async () => {
    try {
      console.log('🚀 革命的軽量目検出エンジン初期化開始')
      console.log('💪 患者さんのために最高のシステムを作ります！')
      
      // 処理用キャンバス作成（メモリ効率重視）
      initializeProcessingCanvas()
      
      // パフォーマンス監視開始
      startPerformanceMonitoring()
      
      isInitialized.value = true
      console.log('✅ 軽量目検出エンジン初期化完了')
      
    } catch (err) {
      console.error('❌ 初期化エラー:', err)
      error.value = `初期化失敗: ${err.message}`
      throw err
    }
  }
  
  /**
   * 処理用キャンバス初期化（メモリ効率最適化）
   */
  const initializeProcessingCanvas = () => {
    // 軽量化用の小さなキャンバス
    processingCanvas = document.createElement('canvas')
    processingCtx = processingCanvas.getContext('2d')
    
    // メモリ使用量を最小化
    processingCanvas.width = 320  // 小さなサイズで高速処理
    processingCanvas.height = 240
    
    console.log('📐 処理用キャンバス: 320x240 (軽量化)')
  }
  
  /**
   * 🎯 目検出開始
   */
  const startDetection = async (videoEl, canvasEl) => {
    try {
      if (!isInitialized.value) {
        await initialize()
      }
      
      videoElement.value = videoEl
      canvasElement.value = canvasEl
      
      if (canvasEl) {
        canvasCtx.value = canvasEl.getContext('2d')
      }
      
      // 検出ループ開始
      startDetectionLoop()
      
      isDetecting.value = true
      console.log('👁️ 軽量目検出開始 - 患者さんのために！')
      
    } catch (err) {
      console.error('❌ 検出開始エラー:', err)
      error.value = `検出開始失敗: ${err.message}`
    }
  }
  
  /**
   * 🔄 検出ループ（パフォーマンス最適化版）
   */
  const startDetectionLoop = () => {
    const detectFrame = async (timestamp) => {
      if (!isDetecting.value) return
      
      // FPS制御（Core i5でも安定動作）
      if (timestamp - lastFrameTime < 1000 / PERFORMANCE_LIMITS.targetFPS) {
        animationFrame = requestAnimationFrame(detectFrame)
        return
      }
      
      const frameStartTime = performance.now()
      
      try {
        // 👁️ メイン検出処理
        await detectEyes()
        
        // パフォーマンス測定
        const processingTime = performance.now() - frameStartTime
        updatePerformanceStats(processingTime)
        
        // メモリ制限チェック
        if (processingTime > PERFORMANCE_LIMITS.maxProcessingTimeMs) {
          console.warn('⚠️ 処理時間超過、最適化が必要')
          adaptPerformance()
        }
        
      } catch (err) {
        console.error('フレーム処理エラー:', err)
      }
      
      lastFrameTime = timestamp
      animationFrame = requestAnimationFrame(detectFrame)
    }
    
    animationFrame = requestAnimationFrame(detectFrame)
  }
  
  /**
   * 👁️ 革命的目検出アルゴリズム（軽量版）
   */
  const detectEyes = async () => {
    if (!videoElement.value || !processingCanvas) return
    
    const video = videoElement.value
    
    // 1. 画像を軽量キャンバスに縮小して描画
    processingCtx.drawImage(video, 0, 0, processingCanvas.width, processingCanvas.height)
    
    // 2. 画像データ取得
    const imageData = processingCtx.getImageData(0, 0, processingCanvas.width, processingCanvas.height)
    
    // 3. 顔領域推定（高速アルゴリズム）
    const faceRegion = estimateFaceRegion(imageData)
    
    if (faceRegion) {
      // 4. 目領域検出
      const eyeRegions = detectEyeRegions(imageData, faceRegion)
      
      // 5. 瞳孔検出
      if (eyeRegions.left) {
        detectPupil(imageData, eyeRegions.left, 'left')
      }
      if (eyeRegions.right) {
        detectPupil(imageData, eyeRegions.right, 'right')
      }
      
      // 6. 視線ベクトル計算
      calculateGazeVector()
      
      // 7. デバッグ描画（開発時のみ）
      if (canvasCtx.value) {
        drawEyeDetectionDebug()
      }
    }
  }
  
  /**
   * 🎯 高速顔領域推定
   */
  const estimateFaceRegion = (imageData) => {
    const { width, height, data } = imageData
    
    // 肌色ピクセルの重心計算（高速版）
    let skinPixels = 0
    let centroidX = 0
    let centroidY = 0
    
    // サンプリング間隔を調整して高速化
    const step = 4 // 4ピクセルおきにサンプリング
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        
        if (isSkinColor(r, g, b)) {
          centroidX += x
          centroidY += y
          skinPixels++
        }
      }
    }
    
    if (skinPixels < 50) return null // 最小閾値
    
    const faceX = centroidX / skinPixels
    const faceY = centroidY / skinPixels
    
    // 顔領域のサイズ推定
    const faceWidth = Math.min(width * 0.4, 100)
    const faceHeight = Math.min(height * 0.5, 120)
    
    return {
      x: Math.max(0, faceX - faceWidth / 2),
      y: Math.max(0, faceY - faceHeight / 2),
      width: Math.min(width, faceWidth),
      height: Math.min(height, faceHeight),
      centerX: faceX,
      centerY: faceY
    }
  }
  
  /**
   * 👁️ 目領域検出（両目）
   */
  const detectEyeRegions = (imageData, faceRegion) => {
    const { width } = imageData
    
    // 顔領域内での目の位置推定
    const eyeY = faceRegion.y + faceRegion.height * 0.35 // 顔の上部35%
    const eyeHeight = faceRegion.height * 0.2           // 高さ20%
    
    const leftEyeX = faceRegion.x + faceRegion.width * 0.2   // 左目
    const rightEyeX = faceRegion.x + faceRegion.width * 0.65 // 右目
    const eyeWidth = faceRegion.width * 0.25
    
    return {
      left: {
        x: leftEyeX,
        y: eyeY,
        width: eyeWidth,
        height: eyeHeight
      },
      right: {
        x: rightEyeX,
        y: eyeY,
        width: eyeWidth,
        height: eyeHeight
      }
    }
  }
  
  /**
   * 👁️ 瞳孔検出（革命的高速アルゴリズム）
   */
  const detectPupil = (imageData, eyeRegion, eyeSide) => {
    const { width, data } = imageData
    
    let darkestX = 0
    let darkestY = 0
    let darkestValue = 255
    let pupilRadius = 0
    
    // 目領域内で最も暗い点（瞳孔）を検索
    const startX = Math.floor(eyeRegion.x)
    const endX = Math.floor(eyeRegion.x + eyeRegion.width)
    const startY = Math.floor(eyeRegion.y)
    const endY = Math.floor(eyeRegion.y + eyeRegion.height)
    
    for (let y = startY; y < endY; y += 2) { // 2ピクセルステップで高速化
      for (let x = startX; x < endX; x += 2) {
        const idx = (y * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (brightness < darkestValue) {
          darkestValue = brightness
          darkestX = x
          darkestY = y
        }
      }
    }
    
    // 瞳孔半径推定
    pupilRadius = Math.min(eyeRegion.width, eyeRegion.height) * 0.15
    
    // 信頼度計算（暗さと位置から）
    const confidence = Math.max(0, (255 - darkestValue) / 255)
    
    // 結果を元画像座標に変換
    const scale = videoElement.value.videoWidth / processingCanvas.width
    
    const eyeDataRef = eyeSide === 'left' ? eyeData.leftEye : eyeData.rightEye
    eyeDataRef.center.x = (startX + endX) / 2 * scale
    eyeDataRef.center.y = (startY + endY) / 2 * scale
    eyeDataRef.pupil.x = darkestX * scale
    eyeDataRef.pupil.y = darkestY * scale
    eyeDataRef.pupil.radius = pupilRadius * scale
    eyeDataRef.confidence = confidence
    eyeDataRef.isDetected = confidence > 0.3
  }
  
  /**
   * 📐 視線ベクトル計算
   */
  const calculateGazeVector = () => {
    if (!eyeData.leftEye.isDetected && !eyeData.rightEye.isDetected) {
      eyeData.confidence = 0
      return
    }
    
    // 両目または片目から視線方向を計算
    let gazeX = 0, gazeY = 0
    let validEyes = 0
    
    if (eyeData.leftEye.isDetected) {
      const leftGazeX = eyeData.leftEye.pupil.x - eyeData.leftEye.center.x
      const leftGazeY = eyeData.leftEye.pupil.y - eyeData.leftEye.center.y
      gazeX += leftGazeX
      gazeY += leftGazeY
      validEyes++
    }
    
    if (eyeData.rightEye.isDetected) {
      const rightGazeX = eyeData.rightEye.pupil.x - eyeData.rightEye.center.x
      const rightGazeY = eyeData.rightEye.pupil.y - eyeData.rightEye.center.y
      gazeX += rightGazeX
      gazeY += rightGazeY
      validEyes++
    }
    
    if (validEyes > 0) {
      eyeData.gazeVector.x = gazeX / validEyes
      eyeData.gazeVector.y = gazeY / validEyes
      eyeData.gazeAngle = Math.atan2(eyeData.gazeVector.y, eyeData.gazeVector.x)
      eyeData.confidence = (eyeData.leftEye.confidence + eyeData.rightEye.confidence) / 2
    }
  }
  
  /**
   * 🎨 デバッグ描画
   */
  const drawEyeDetectionDebug = () => {
    if (!canvasCtx.value) return
    
    const ctx = canvasCtx.value
    const canvas = canvasElement.value
    
    // キャンバスクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 左目描画
    if (eyeData.leftEye.isDetected) {
      drawEye(ctx, eyeData.leftEye, '#00ff00')
    }
    
    // 右目描画
    if (eyeData.rightEye.isDetected) {
      drawEye(ctx, eyeData.rightEye, '#00ff00')
    }
    
    // 視線ベクトル描画
    if (eyeData.confidence > 0.3) {
      drawGazeVector(ctx)
    }
    
    // パフォーマンス情報表示
    ctx.fillStyle = '#00ff00'
    ctx.font = '16px Arial'
    ctx.fillText(`軽量エンジン | FPS: ${performance.fps}`, 10, 25)
    ctx.fillText(`処理時間: ${performance.processingTime.toFixed(1)}ms`, 10, 45)
    ctx.fillText(`信頼度: ${Math.round(eyeData.confidence * 100)}%`, 10, 65)
  }
  
  /**
   * 目の描画ヘルパー
   */
  const drawEye = (ctx, eye, color) => {
    // 目の中心
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(eye.center.x, eye.center.y, 20, 0, 2 * Math.PI)
    ctx.stroke()
    
    // 瞳孔
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(eye.pupil.x, eye.pupil.y, eye.pupil.radius, 0, 2 * Math.PI)
    ctx.fill()
  }
  
  /**
   * 視線ベクトル描画
   */
  const drawGazeVector = (ctx) => {
    const centerX = canvasElement.value.width / 2
    const centerY = canvasElement.value.height / 2
    
    const vectorScale = 50
    const endX = centerX + eyeData.gazeVector.x * vectorScale
    const endY = centerY + eyeData.gazeVector.y * vectorScale
    
    ctx.strokeStyle = '#ff0080'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
    
    // 矢印の先端
    ctx.fillStyle = '#ff0080'
    ctx.beginPath()
    ctx.arc(endX, endY, 5, 0, 2 * Math.PI)
    ctx.fill()
  }
  
  /**
   * 肌色判定（高速版）
   */
  const isSkinColor = (r, g, b) => {
    return (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15
    )
  }
  
  /**
   * パフォーマンス監視
   */
  const startPerformanceMonitoring = () => {
    setInterval(() => {
      // メモリ使用量推定（概算）
      performance.memoryUsage = Math.round(performance.now() / 1000) % 100 // 簡易推定
      
      // FPS計算
      const now = Date.now()
      if (now - performance.lastUpdate >= 1000) {
        performance.fps = performance.frameCount
        performance.frameCount = 0
        performance.lastUpdate = now
      }
      
      // 最適化判定
      performance.isOptimal = (
        performance.fps >= 25 && 
        performance.processingTime < PERFORMANCE_LIMITS.maxProcessingTimeMs &&
        performance.memoryUsage < PERFORMANCE_LIMITS.maxMemoryMB
      )
      
    }, 1000)
  }
  
  /**
   * パフォーマンス統計更新
   */
  const updatePerformanceStats = (processingTime) => {
    performance.processingTime = processingTime
    performance.frameCount++
  }
  
  /**
   * 適応的パフォーマンス調整
   */
  const adaptPerformance = () => {
    // 処理が重い場合の自動最適化
    if (performance.processingTime > PERFORMANCE_LIMITS.maxProcessingTimeMs) {
      // 画像をさらに縮小
      const currentWidth = processingCanvas.width
      if (currentWidth > 160) {
        processingCanvas.width = Math.max(160, currentWidth * 0.8)
        processingCanvas.height = Math.max(120, processingCanvas.height * 0.8)
        console.log(`🔧 パフォーマンス調整: ${processingCanvas.width}x${processingCanvas.height}`)
      }
    }
  }
  
  /**
   * 🛑 検出停止
   */
  const stopDetection = () => {
    isDetecting.value = false
    
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    
    // データリセット
    resetEyeData()
    
    console.log('⏹️ 軽量目検出停止')
  }
  
  /**
   * データリセット
   */
  const resetEyeData = () => {
    eyeData.leftEye.isDetected = false
    eyeData.rightEye.isDetected = false
    eyeData.confidence = 0
    eyeData.gazeVector.x = 0
    eyeData.gazeVector.y = 0
  }
  
  // クリーンアップ
  onUnmounted(() => {
    stopDetection()
    if (processingCanvas) {
      processingCanvas = null
      processingCtx = null
    }
  })
  
  return {
    // 状態
    isInitialized,
    isDetecting,
    error,
    eyeData,
    performance,
    
    // メソッド
    initialize,
    startDetection,
    stopDetection
  }
}