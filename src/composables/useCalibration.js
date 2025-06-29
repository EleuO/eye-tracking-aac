import { ref, reactive, computed } from 'vue'

export function useCalibration(handleGazeDataCallback = null) {
  // キャリブレーション状態
  const isCalibrating = ref(false)
  const currentIndex = ref(0)
  const isCompleted = ref(false)
  
  // モダンキャリブレーション設定（ユーザーフレンドリー）
  const settings = reactive({
    requiredStableTime: 1200, // 1.2秒で高速化
    accuracyThreshold: 80,    // 80pxでユーザーフレンドリーに
    dwellTime: 1000,          // ドウェル時間短縮
    minSamples: 15,           // 最小サンプル数
    stabilityThreshold: 0.7,  // 安定性闾値
    adaptiveMode: true        // アダプティブモード
  })

  // モダンキャリブレーションポイント生成（5点 + ユーザーフレンドリー順序）
  const generateCalibrationPoints = () => {
    const margin = 0.12 // 画面端から12%のマージン（少し狭く）
    
    // 中央から始めてユーザーにやさしい順序で配置
    return [
      { x: 0.5, y: 0.5, id: 'center', description: '中央から始めましょう' },
      { x: margin, y: margin, id: 'top-left', description: '左上を見つめてください' },
      { x: 1 - margin, y: margin, id: 'top-right', description: '右上を見つめてください' },
      { x: margin, y: 1 - margin, id: 'bottom-left', description: '左下を見つめてください' },
      { x: 1 - margin, y: 1 - margin, id: 'bottom-right', description: '最後は右下です' }
    ]
  }

  const calibrationPoints = ref(generateCalibrationPoints())
  
  // 現在のポイント
  const currentPoint = computed(() => {
    if (currentIndex.value < calibrationPoints.value.length) {
      return calibrationPoints.value[currentIndex.value]
    }
    return null
  })

  // 進行状況
  const progress = computed(() => {
    return Math.round((currentIndex.value / calibrationPoints.value.length) * 100)
  })

  // 現在のポイントの画面座標
  const currentPointScreen = computed(() => {
    if (!currentPoint.value) return { x: 0, y: 0 }
    
    return {
      x: currentPoint.value.x * window.innerWidth,
      y: currentPoint.value.y * window.innerHeight
    }
  })

  // キャリブレーション用の視線データ追跡
  const gazeTracking = reactive({
    isStable: false,
    stableStartTime: null,
    distance: Infinity,
    progress: 0
  })

  // キャリブレーション開始
  const startCalibration = (setGazeListener) => {
    console.log('🎯 キャリブレーション開始')
    
    // WebGazerのデータをクリア
    if (typeof webgazer !== 'undefined' && webgazer.isReady()) {
      webgazer.clearData()
      console.log('🗑️ WebGazerデータをクリアしました')
    }
    
    isCalibrating.value = true
    currentIndex.value = 0
    isCompleted.value = false
    resetGazeTracking()
    
    // キャリブレーション用のガゼリスナーを設定（視覚更新も継続）
    if (setGazeListener) {
      const success = setGazeListener((data, timestamp) => {
        console.log('📊 キャリブレーション視線データ受信:', { x: Math.round(data?.x || 0), y: Math.round(data?.y || 0) })
        
        // 視覚的な視線ポイント更新を継続（青い丸の表示）
        if (handleGazeDataCallback && typeof handleGazeDataCallback === 'function') {
          console.log('👁️ 視覚更新も実行中...')
          handleGazeDataCallback(data, timestamp)
        }
        
        // キャリブレーション処理も実行
        processGazeData(data)
      })
      
      if (!success) {
        console.error('❌ ガゼリスナーの設定に失敗しました')
        return false
      }
    }
    
    console.log('✅ キャリブレーション開始完了')
    return true
  }

  // 視線データの処理
  const processGazeData = (gazeData) => {
    if (!isCalibrating.value || !currentPoint.value) {
      console.log('⚠️ キャリブレーション状態異常:', { isCalibrating: isCalibrating.value, hasCurrentPoint: !!currentPoint.value })
      return
    }

    // データ検証
    if (!gazeData || typeof gazeData.x !== 'number' || typeof gazeData.y !== 'number') {
      console.log('⚠️ 無効な視線データ:', gazeData)
      return
    }

    const targetX = currentPointScreen.value.x
    const targetY = currentPointScreen.value.y
    
    // 距離計算
    const distance = Math.sqrt(
      Math.pow(gazeData.x - targetX, 2) + 
      Math.pow(gazeData.y - targetY, 2)
    )
    
    gazeTracking.distance = distance
    gazeTracking.samples = (gazeTracking.samples || 0) + 1
    
    // スムージング用の最近の距離を保存
    gazeTracking.recentDistances = gazeTracking.recentDistances || []
    gazeTracking.recentDistances.push(distance)
    if (gazeTracking.recentDistances.length > 5) {
      gazeTracking.recentDistances.shift()
    }
    
    // 平滑化された距離を計算
    const avgDistance = gazeTracking.recentDistances.reduce((a, b) => a + b, 0) / gazeTracking.recentDistances.length

    // デバッグ情報
    if (Math.random() < 0.3) { // 30%の確率でログ
      console.log(`🎯 視線追跡: 視線(${Math.round(gazeData.x)}, ${Math.round(gazeData.y)}) → ターゲット(${Math.round(targetX)}, ${Math.round(targetY)}) = ${Math.round(distance)}px`)
    }

    // 精度判定（スムージング版 + アダプティブ）
    const isAccurate = avgDistance < settings.accuracyThreshold
    const isVeryAccurate = avgDistance < settings.accuracyThreshold * 0.6 // 非常に精度が高い場合
    
    if (isAccurate) {
      if (!gazeTracking.isStable) {
        gazeTracking.isStable = true
        gazeTracking.stableStartTime = Date.now()
        console.log(`✅ 安定した視線を検出: ${Math.round(distance)}px (閾値: ${settings.accuracyThreshold}px)`)
      }
      
      const stableDuration = Date.now() - gazeTracking.stableStartTime
      
      // アダプティブ時間計算（精度が高いほど早く進む）
      let requiredTime = settings.requiredStableTime
      if (settings.adaptiveMode) {
        if (isVeryAccurate) {
          requiredTime = settings.requiredStableTime * 0.7 // 30%短縮
        }
        // 十分なサンプル数があれば早期完了を許可
        if (gazeTracking.samples >= settings.minSamples && isVeryAccurate) {
          requiredTime = Math.min(requiredTime, settings.requiredStableTime * 0.5)
        }
      }
      
      gazeTracking.progress = Math.min(stableDuration / requiredTime, 1)
      
      // ユーザーフレンドリーフィードバック
      if (Math.random() < 0.1) { // 10%でログでスパムを防ぐ
        const pointDesc = currentPoint.value.description || `ポイント ${currentIndex.value + 1}`
        console.log(`🎯 ${pointDesc}: ${Math.round(gazeTracking.progress * 100)}% (精度: ${Math.round(avgDistance)}px)`)
      }
      
      // 十分な時間安定していれば次へ
      if (gazeTracking.progress >= 1) {
        console.log(`🎉 ${currentPoint.value.description || 'ポイント'} キャリブレーション完了！`)
        recordCalibrationPoint()
        proceedToNext()
      }
    } else {
      // 不安定になったらリセット
      if (gazeTracking.isStable) {
        console.log(`⚠️ 視線が不安定: ${Math.round(distance)}px (閾値: ${settings.accuracyThreshold}px)`)
        resetGazeTracking()
      }
    }
    
    // タイムアウト防止（最大時間で強制進行）
    const totalTime = Date.now() - (gazeTracking.pointStartTime || Date.now())
    if (totalTime > (settings.requiredStableTime * 4)) {
      console.log('⏰ タイムアウトで次のポイントへ進みます')
      recordCalibrationPoint()
      proceedToNext()
    }
  }

  // 視線追跡状態をリセット
  const resetGazeTracking = () => {
    gazeTracking.isStable = false
    gazeTracking.stableStartTime = null
    gazeTracking.progress = 0
    gazeTracking.distance = Infinity
    gazeTracking.samples = 0
    gazeTracking.recentDistances = []
    gazeTracking.pointStartTime = Date.now() // ポイント開始時刻を記録
  }

  // キャリブレーションポイントを記録
  const recordCalibrationPoint = () => {
    if (typeof webgazer !== 'undefined' && currentPoint.value) {
      const screenX = currentPointScreen.value.x
      const screenY = currentPointScreen.value.y
      
      // 複数回記録して精度を向上
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          webgazer.recordScreenPosition(screenX, screenY)
        }, i * 50)
      }
      
      console.log(`📍 ポイント記録: (${Math.round(screenX)}, ${Math.round(screenY)})`)
    }
  }

  // 次のポイントに進む
  const proceedToNext = () => {
    console.log(`✅ ポイント ${currentIndex.value + 1} 完了`)
    
    currentIndex.value++
    resetGazeTracking()
    
    // 全ポイント完了チェック
    if (currentIndex.value >= calibrationPoints.value.length) {
      completeCalibration()
    }
  }

  // キャリブレーション完了
  const completeCalibration = () => {
    console.log('🎉 キャリブレーション完了!')
    
    isCalibrating.value = false
    isCompleted.value = true
    
    // 完了イベントを発火（親コンポーネントで処理）
  }

  // キャリブレーションキャンセル
  const cancelCalibration = () => {
    console.log('❌ キャリブレーションキャンセル')
    
    isCalibrating.value = false
    isCompleted.value = false
    currentIndex.value = 0
    resetGazeTracking()
  }

  // リセット
  const resetCalibration = () => {
    isCompleted.value = false
    currentIndex.value = 0
    resetGazeTracking()
    
    if (typeof webgazer !== 'undefined') {
      webgazer.clearData()
    }
  }

  return {
    // 状態
    isCalibrating,
    isCompleted,
    currentIndex,
    currentPoint,
    currentPointScreen,
    progress,
    calibrationPoints,
    gazeTracking,
    settings,
    
    // メソッド
    startCalibration,
    processGazeData,
    proceedToNext,
    completeCalibration,
    cancelCalibration,
    resetCalibration
  }
}