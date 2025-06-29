import { ref, reactive, computed } from 'vue'

export function useCalibration() {
  // キャリブレーション状態
  const isCalibrating = ref(false)
  const currentIndex = ref(0)
  const isCompleted = ref(false)
  
  // キャリブレーション設定
  const settings = reactive({
    requiredStableTime: 2000, // 2秒間安定
    accuracyThreshold: 60,    // 60px以内
    dwellTime: 1500          // ドウェル時間
  })

  // キャリブレーションポイント生成（シンプル版：9点）
  const generateCalibrationPoints = () => {
    const margin = 0.15 // 画面端から15%のマージン
    return [
      // 四隅
      { x: margin, y: margin },
      { x: 1 - margin, y: margin },
      { x: margin, y: 1 - margin },
      { x: 1 - margin, y: 1 - margin },
      
      // 中央の十字
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: margin },
      { x: 0.5, y: 1 - margin },
      { x: margin, y: 0.5 },
      { x: 1 - margin, y: 0.5 }
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
    
    // キャリブレーション用のガゼリスナーを設定
    if (setGazeListener) {
      const success = setGazeListener((data, timestamp) => {
        console.log('📊 キャリブレーション視線データ受信:', { x: Math.round(data?.x || 0), y: Math.round(data?.y || 0) })
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

    // デバッグ情報
    if (Math.random() < 0.3) { // 30%の確率でログ
      console.log(`🎯 視線追跡: 視線(${Math.round(gazeData.x)}, ${Math.round(gazeData.y)}) → ターゲット(${Math.round(targetX)}, ${Math.round(targetY)}) = ${Math.round(distance)}px`)
    }

    // 精度判定（シンプル版）
    const isAccurate = distance < settings.accuracyThreshold
    
    if (isAccurate) {
      if (!gazeTracking.isStable) {
        gazeTracking.isStable = true
        gazeTracking.stableStartTime = Date.now()
        console.log(`✅ 安定した視線を検出: ${Math.round(distance)}px (閾値: ${settings.accuracyThreshold}px)`)
      }
      
      const stableDuration = Date.now() - gazeTracking.stableStartTime
      gazeTracking.progress = Math.min(stableDuration / settings.requiredStableTime, 1)
      
      // 進行状況をログ
      if (Math.random() < 0.2) { // 20%の確率でログ
        console.log(`⏳ 安定性進行: ${Math.round(gazeTracking.progress * 100)}% (${Math.round(stableDuration)}ms / ${settings.requiredStableTime}ms)`)
      }
      
      // 十分な時間安定していれば次へ
      if (gazeTracking.progress >= 1) {
        console.log(`🎉 ポイント ${currentIndex.value + 1} 完了！`)
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
  }

  // 視線追跡状態をリセット
  const resetGazeTracking = () => {
    gazeTracking.isStable = false
    gazeTracking.stableStartTime = null
    gazeTracking.progress = 0
    gazeTracking.distance = Infinity
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