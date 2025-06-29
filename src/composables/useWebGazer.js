import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'

export function useWebGazer() {
  // 状態管理
  const isInitialized = ref(false)
  const isCalibrated = ref(false)
  const isTracking = ref(false)
  const gazeData = reactive({ x: 0, y: 0 })
  const lastValidGaze = reactive({ x: 0, y: 0 })
  
  // WebGazer関連の状態
  const webgazerReady = ref(false)
  const error = ref(null)
  
  // 設定
  const settings = reactive({
    showGazePoint: true,
    gazePointSize: 15,
    enableSmoothing: true,
    smoothingFactor: 0.3
  })

  // WebGazer初期化
  const initializeWebGazer = async () => {
    try {
      console.log('🚀 WebGazer初期化開始')
      
      if (typeof webgazer === 'undefined') {
        throw new Error('WebGazer.jsが読み込まれていません')
      }

      // 画面情報を詳細にログ出力
      const screenInfo = {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        colorDepth: window.screen.colorDepth,
        orientation: window.screen.orientation?.angle || 0
      }
      
      console.log('📺 画面情報:', screenInfo)

      // WebGazerを初期化（より詳細な設定）
      console.log('🔧 WebGazer設定開始...')
      
      webgazer
        .setRegression('ridge') // ridge回帰（線形回帰）
        .setTracker('clmtrackr') // CLMトラッカー（顔認識）
        .setGazeListener(handleGazeData)

      // カメラ制約を設定（高解像度）
      console.log('📹 カメラ制約を設定中...')
      // 注意: setConstraintsは非推奨のため、WebGazer.beginでカメラを自動設定

      // WebGazerを開始
      console.log('▶️ WebGazer開始中...')
      await webgazer.begin()

      // UIを非表示に設定
      webgazer.showVideoPreview(false)
      webgazer.showPredictionPoints(false)
      webgazer.showFaceOverlay(false)
      webgazer.showFaceFeedbackBox(false)

      // WebGazerが完全に準備できるまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 2000))

      // WebGazerの内部状態を確認
      const webgazerInfo = {
        isReady: webgazer.isReady(),
        regression: webgazer.getRegression(),
        tracker: webgazer.getTracker()
      }
      
      console.log('🔍 WebGazer内部情報:', webgazerInfo)

      webgazerReady.value = true
      isInitialized.value = true
      
      console.log('✅ WebGazer初期化完了')
      console.log('🎯 視線追跡準備完了 - カメラを選択してキャリブレーションを開始してください')
      
    } catch (err) {
      console.error('❌ WebGazer初期化エラー:', err)
      error.value = err.message
      
      // エラーの詳細をログ
      if (err.name === 'NotAllowedError') {
        console.error('📹 カメラアクセスが拒否されました')
        error.value = 'カメラアクセスが拒否されました。ブラウザ設定でカメラ許可を確認してください。'
      } else if (err.name === 'NotFoundError') {
        console.error('📹 カメラが見つかりません')
        error.value = 'カメラが見つかりません。カメラが接続されているか確認してください。'
      }
    }
  }

  // ガゼリスナーを動的に設定（キャリブレーション用）
  const setGazeListener = (callback) => {
    if (typeof webgazer !== 'undefined' && webgazer.isReady()) {
      webgazer.setGazeListener(callback)
      console.log('👁️ ガゼリスナーを設定しました')
      return true
    } else {
      console.error('❌ WebGazerが準備できていません')
      return false
    }
  }

  // ガゼリスナーをクリア
  const clearGazeListener = () => {
    if (typeof webgazer !== 'undefined') {
      webgazer.clearGazeListener()
      console.log('🗑️ ガゼリスナーをクリアしました')
    }
  }

  // 視線データ範囲の統計（デバッグ用）
  const gazeStats = reactive({
    minX: Infinity, maxX: -Infinity,
    minY: Infinity, maxY: -Infinity,
    samples: 0,
    lastUpdate: 0
  })

  // 視線データ処理（改良版 + 詳細デバッグ）
  const handleGazeData = (data, timestamp) => {
    // 基本的なデータ検証
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number' || 
        !isFinite(data.x) || !isFinite(data.y)) {
      if (Math.random() < 0.05) { // 5%の確率でログ
        console.log('❌ 無効な視線データ:', data)
      }
      return
    }

    // 画面情報を取得
    const screenInfo = {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1
    }

    // 統計情報を更新
    gazeStats.samples++
    gazeStats.minX = Math.min(gazeStats.minX, data.x)
    gazeStats.maxX = Math.max(gazeStats.maxX, data.x)
    gazeStats.minY = Math.min(gazeStats.minY, data.y)
    gazeStats.maxY = Math.max(gazeStats.maxY, data.y)

    // 詳細デバッグログ（5秒ごと）
    const now = Date.now()
    if (now - gazeStats.lastUpdate > 5000) {
      gazeStats.lastUpdate = now
      console.log('👁️ 視線データ統計 (5秒間):', {
        samples: gazeStats.samples,
        xRange: `${Math.round(gazeStats.minX)} - ${Math.round(gazeStats.maxX)} (幅: ${Math.round(gazeStats.maxX - gazeStats.minX)})`,
        yRange: `${Math.round(gazeStats.minY)} - ${Math.round(gazeStats.maxY)} (幅: ${Math.round(gazeStats.maxY - gazeStats.minY)})`,
        screen: `${screenInfo.windowWidth}x${screenInfo.windowHeight} (物理: ${screenInfo.screenWidth}x${screenInfo.screenHeight})`,
        pixelRatio: screenInfo.devicePixelRatio
      })
    }

    // より緩い範囲チェック（統計ベース）
    const margin = Math.max(screenInfo.windowWidth * 0.5, 500) // ウィンドウ幅の50%または500px
    if (data.x < -margin || data.x > screenInfo.windowWidth + margin || 
        data.y < -margin || data.y > screenInfo.windowHeight + margin) {
      if (Math.random() < 0.05) { // 5%の確率でログ
        console.log('⚠️ 範囲外視線データ:', {
          gaze: `(${Math.round(data.x)}, ${Math.round(data.y)})`,
          window: `${screenInfo.windowWidth}x${screenInfo.windowHeight}`,
          margin: margin
        })
      }
      return
    }

    // リアルタイム視線データログ（10%の確率）
    if (Math.random() < 0.1) {
      console.log('👁️ 視線データ受信:', {
        raw: `(${Math.round(data.x)}, ${Math.round(data.y)})`,
        normalized: `(${(data.x / screenInfo.windowWidth * 100).toFixed(1)}%, ${(data.y / screenInfo.windowHeight * 100).toFixed(1)}%)`,
        timestamp: timestamp
      })
    }

    // スムージング処理
    if (settings.enableSmoothing && lastValidGaze.x !== 0 && lastValidGaze.y !== 0) {
      const alpha = settings.smoothingFactor
      gazeData.x = alpha * data.x + (1 - alpha) * lastValidGaze.x
      gazeData.y = alpha * data.y + (1 - alpha) * lastValidGaze.y
    } else {
      gazeData.x = data.x
      gazeData.y = data.y
    }

    // 最後の有効な視線を更新
    lastValidGaze.x = gazeData.x
    lastValidGaze.y = gazeData.y

    // トラッキング状態を更新
    if (!isTracking.value) {
      isTracking.value = true
      console.log('✅ 視線追跡開始')
    }
  }

  // トラッキング開始
  const startTracking = () => {
    if (webgazerReady.value && isCalibrated.value) {
      isTracking.value = true
      console.log('👁️ 視線追跡開始')
    }
  }

  // トラッキング停止
  const stopTracking = () => {
    isTracking.value = false
    console.log('⏸️ 視線追跡停止')
  }

  // WebGazer停止
  const stopWebGazer = () => {
    if (typeof webgazer !== 'undefined' && webgazer.isReady()) {
      webgazer.end()
      console.log('🛑 WebGazer終了')
    }
    isInitialized.value = false
    webgazerReady.value = false
    isTracking.value = false
  }

  // ライフサイクル管理
  onMounted(() => {
    initializeWebGazer()
  })

  onUnmounted(() => {
    stopWebGazer()
  })

  // 設定の監視
  watch(() => settings.showGazePoint, (newValue) => {
    console.log('👁️ 視線ポイント表示:', newValue ? 'ON' : 'OFF')
  })

  return {
    // 状態
    isInitialized,
    isCalibrated,
    isTracking,
    gazeData,
    webgazerReady,
    error,
    settings,
    
    // メソッド
    initializeWebGazer,
    startTracking,
    stopTracking,
    stopWebGazer,
    setGazeListener,
    clearGazeListener,
    handleGazeData // キャリブレーション中の視覚更新用
  }
}