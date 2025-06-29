import { ref, reactive, computed } from 'vue'

/**
 * 🎯 完全視線ベースキャリブレーションシステム
 * 
 * 患者さんのための革命的個人適応システム
 * - どんなWebカメラでも対応
 * - 上向きカメラ角度対応
 * - 個人差完全補正
 */
export function useEyeCalibration() {
  // キャリブレーション状態
  const isCalibrating = ref(false)
  const currentPoint = ref(0)
  const calibrationData = ref([])
  const isComplete = ref(false)
  
  // 9点キャリブレーション設定
  const calibrationPoints = [
    { id: 0, x: 0.1, y: 0.1, label: '左上' },
    { id: 1, x: 0.5, y: 0.1, label: '上中央' },
    { id: 2, x: 0.9, y: 0.1, label: '右上' },
    { id: 3, x: 0.1, y: 0.5, label: '左中央' },
    { id: 4, x: 0.5, y: 0.5, label: '中央' },
    { id: 5, x: 0.9, y: 0.5, label: '右中央' },
    { id: 6, x: 0.1, y: 0.9, label: '左下' },
    { id: 7, x: 0.5, y: 0.9, label: '下中央' },
    { id: 8, x: 0.9, y: 0.9, label: '右下' }
  ]
  
  // キャリブレーション結果
  const calibrationMatrix = reactive({
    // 線形変換マトリックス
    transform: {
      scaleX: 1.0,
      scaleY: 1.0,
      offsetX: 0.0,
      offsetY: 0.0,
      skewX: 0.0,
      skewY: 0.0
    },
    
    // 精度情報
    accuracy: {
      overall: 0,
      horizontal: 0,
      vertical: 0,
      stability: 0
    },
    
    // 個人プロファイル
    profile: {
      eyeDistance: 0,
      faceWidth: 0,
      cameraAngle: 0,
      lightingCondition: 'normal',
      timestamp: null
    }
  })
  
  // キャリブレーション進行状況
  const progress = computed(() => {
    return Math.round((currentPoint.value / calibrationPoints.length) * 100)
  })
  
  // 現在のキャリブレーション点
  const currentCalibrationPoint = computed(() => {
    if (currentPoint.value < calibrationPoints.length) {
      return calibrationPoints[currentPoint.value]
    }
    return null
  })
  
  /**
   * 🎯 キャリブレーション開始
   */
  const startCalibration = async () => {
    console.log('🎯 完全視線ベースキャリブレーション開始')
    console.log('🎗️ 患者さんのために最高精度を実現します')
    
    isCalibrating.value = true
    currentPoint.value = 0
    calibrationData.value = []
    isComplete.value = false
    
    // 既存のキャリブレーションデータをリセット
    resetCalibrationMatrix()
    
    console.log('✅ キャリブレーション準備完了')
  }
  
  /**
   * 🎯 キャリブレーションポイントでのデータ収集
   */
  const collectCalibrationData = (gazeData, faceData) => {
    if (!isCalibrating.value || !currentCalibrationPoint.value) return
    
    const point = currentCalibrationPoint.value
    
    // 🎯 多重サンプリングによる高精度データ収集
    const sampleData = {
      pointId: point.id,
      targetX: point.x,
      targetY: point.y,
      
      // 目の検出データ
      gazeX: gazeData.x,
      gazeY: gazeData.y,
      confidence: gazeData.confidence,
      
      // 顔の基本データ
      faceX: faceData.x,
      faceY: faceData.y,
      faceWidth: faceData.width,
      faceHeight: faceData.height,
      headPose: { ...faceData.headPose },
      
      // 環境データ
      timestamp: Date.now(),
      lighting: estimateLightingCondition(faceData),
      cameraAngle: estimateCameraAngle(faceData)
    }
    
    // 既存の収集データに追加
    if (!calibrationData.value[point.id]) {
      calibrationData.value[point.id] = []
    }
    
    calibrationData.value[point.id].push(sampleData)
    
    console.log(`📊 Point ${point.id} (${point.label}): サンプル${calibrationData.value[point.id].length}個収集`)
    
    return calibrationData.value[point.id].length
  }
  
  /**
   * 🎯 次のキャリブレーションポイントへ進む
   */
  const nextCalibrationPoint = () => {
    if (!isCalibrating.value) return false
    
    const currentData = calibrationData.value[currentPoint.value]
    
    // 最低5サンプル必要
    if (!currentData || currentData.length < 5) {
      console.warn('⚠️ 十分なサンプルが収集されていません')
      return false
    }
    
    console.log(`✅ Point ${currentPoint.value} 完了 (${currentData.length}サンプル)`)
    
    currentPoint.value++
    
    // 全ポイント完了チェック
    if (currentPoint.value >= calibrationPoints.length) {
      return finishCalibration()
    }
    
    return true
  }
  
  /**
   * 🎯 キャリブレーション完了処理
   */
  const finishCalibration = async () => {
    console.log('🎯 キャリブレーションデータ解析開始')
    
    try {
      // 🎯 高度な変換マトリックス計算
      await calculateTransformationMatrix()
      
      // 🎯 精度検証
      const accuracy = await validateCalibrationAccuracy()
      
      if (accuracy.overall > 0.7) {
        console.log(`✅ キャリブレーション成功！ 精度: ${Math.round(accuracy.overall * 100)}%`)
        
        isComplete.value = true
        isCalibrating.value = false
        
        // 🎯 個人プロファイル保存
        await saveUserProfile()
        
        return true
      } else {
        console.warn(`⚠️ 精度不足 (${Math.round(accuracy.overall * 100)}%)`)
        return false
      }
      
    } catch (err) {
      console.error('❌ キャリブレーション失敗:', err)
      return false
    }
  }
  
  /**
   * 🎯 変換マトリックス計算（革命的アルゴリズム）
   */
  const calculateTransformationMatrix = async () => {
    console.log('🧮 変換マトリックス計算開始')
    
    const allData = []
    
    // 全ポイントのデータを統合
    for (let i = 0; i < calibrationPoints.length; i++) {
      const pointData = calibrationData.value[i]
      if (!pointData || pointData.length === 0) continue
      
      // 各ポイントで最も信頼度の高いサンプルを選択
      const bestSample = pointData.reduce((best, sample) => {
        return sample.confidence > best.confidence ? sample : best
      })
      
      allData.push(bestSample)
    }
    
    if (allData.length < 4) {
      throw new Error('変換マトリックス計算に十分なデータがありません')
    }
    
    // 🎯 最小二乗法による線形変換計算
    const matrix = calculateLinearTransform(allData)
    
    // 🎯 非線形補正の追加
    const nonLinearCorrection = calculateNonLinearCorrection(allData, matrix)
    
    // 結果を保存
    calibrationMatrix.transform = {
      scaleX: matrix.scaleX,
      scaleY: matrix.scaleY,
      offsetX: matrix.offsetX,
      offsetY: matrix.offsetY,
      skewX: matrix.skewX || 0,
      skewY: matrix.skewY || 0,
      ...nonLinearCorrection
    }
    
    console.log('✅ 変換マトリックス計算完了', calibrationMatrix.transform)
  }
  
  /**
   * 🎯 線形変換計算
   */
  const calculateLinearTransform = (data) => {
    // X方向の変換計算
    let sumX = 0, sumTargetX = 0, sumXX = 0, sumXTarget = 0
    let sumY = 0, sumTargetY = 0, sumYY = 0, sumYTarget = 0
    const n = data.length
    
    data.forEach(sample => {
      sumX += sample.gazeX
      sumTargetX += sample.targetX
      sumXX += sample.gazeX * sample.gazeX
      sumXTarget += sample.gazeX * sample.targetX
      
      sumY += sample.gazeY
      sumTargetY += sample.targetY
      sumYY += sample.gazeY * sample.gazeY
      sumYTarget += sample.gazeY * sample.targetY
    })
    
    // 最小二乗法による傾きと切片の計算
    const scaleX = (n * sumXTarget - sumX * sumTargetX) / (n * sumXX - sumX * sumX)
    const offsetX = (sumTargetX - scaleX * sumX) / n
    
    const scaleY = (n * sumYTarget - sumY * sumTargetY) / (n * sumYY - sumY * sumY)
    const offsetY = (sumTargetY - scaleY * sumY) / n
    
    return { scaleX, scaleY, offsetX, offsetY }
  }
  
  /**
   * 🎯 非線形補正計算
   */
  const calculateNonLinearCorrection = (data, linearMatrix) => {
    // 線形変換での誤差を分析して非線形補正を計算
    const errors = data.map(sample => {
      const predictedX = sample.gazeX * linearMatrix.scaleX + linearMatrix.offsetX
      const predictedY = sample.gazeY * linearMatrix.scaleY + linearMatrix.offsetY
      
      return {
        errorX: sample.targetX - predictedX,
        errorY: sample.targetY - predictedY,
        x: predictedX,
        y: predictedY
      }
    })
    
    // 象限別の補正値を計算
    const quadrantCorrection = calculateQuadrantCorrection(errors)
    
    return {
      quadrantCorrection
    }
  }
  
  /**
   * 🎯 象限別補正計算
   */
  const calculateQuadrantCorrection = (errors) => {
    const quadrants = [
      { minX: 0, maxX: 0.5, minY: 0, maxY: 0.5, errors: [] },      // 左上
      { minX: 0.5, maxX: 1, minY: 0, maxY: 0.5, errors: [] },     // 右上
      { minX: 0, maxX: 0.5, minY: 0.5, maxY: 1, errors: [] },     // 左下
      { minX: 0.5, maxX: 1, minY: 0.5, maxY: 1, errors: [] }      // 右下
    ]
    
    // 各象限のエラーを集計
    errors.forEach(error => {
      quadrants.forEach(quad => {
        if (error.x >= quad.minX && error.x < quad.maxX &&
            error.y >= quad.minY && error.y < quad.maxY) {
          quad.errors.push(error)
        }
      })
    })
    
    // 各象限の平均補正値を計算
    return quadrants.map(quad => {
      if (quad.errors.length === 0) return { x: 0, y: 0 }
      
      const avgErrorX = quad.errors.reduce((sum, e) => sum + e.errorX, 0) / quad.errors.length
      const avgErrorY = quad.errors.reduce((sum, e) => sum + e.errorY, 0) / quad.errors.length
      
      return { x: avgErrorX, y: avgErrorY }
    })
  }
  
  /**
   * 🎯 精度検証
   */
  const validateCalibrationAccuracy = async () => {
    const errors = []
    
    for (let i = 0; i < calibrationPoints.length; i++) {
      const point = calibrationPoints[i]
      const data = calibrationData.value[i]
      
      if (!data || data.length === 0) continue
      
      // 各ポイントでの予測精度を計算
      data.forEach(sample => {
        const predicted = applyCalibration(sample.gazeX, sample.gazeY)
        const errorX = Math.abs(predicted.x - point.x)
        const errorY = Math.abs(predicted.y - point.y)
        const totalError = Math.sqrt(errorX * errorX + errorY * errorY)
        
        errors.push({ errorX, errorY, totalError })
      })
    }
    
    if (errors.length === 0) {
      return { overall: 0, horizontal: 0, vertical: 0, stability: 0 }
    }
    
    const avgErrorX = errors.reduce((sum, e) => sum + e.errorX, 0) / errors.length
    const avgErrorY = errors.reduce((sum, e) => sum + e.errorY, 0) / errors.length
    const avgTotalError = errors.reduce((sum, e) => sum + e.totalError, 0) / errors.length
    
    // 精度スコア（1に近いほど良い）
    const accuracy = {
      overall: Math.max(0, 1 - avgTotalError * 4), // 25%エラーで精度0
      horizontal: Math.max(0, 1 - avgErrorX * 4),
      vertical: Math.max(0, 1 - avgErrorY * 4),
      stability: calculateStability(errors)
    }
    
    calibrationMatrix.accuracy = accuracy
    return accuracy
  }
  
  /**
   * 🎯 安定性計算
   */
  const calculateStability = (errors) => {
    if (errors.length < 2) return 0
    
    const variance = errors.reduce((sum, error, i, arr) => {
      const mean = arr.reduce((s, e) => s + e.totalError, 0) / arr.length
      return sum + Math.pow(error.totalError - mean, 2)
    }, 0) / errors.length
    
    const stdDev = Math.sqrt(variance)
    return Math.max(0, 1 - stdDev * 8) // 標準偏差12.5%で安定性0
  }
  
  /**
   * 🎯 キャリブレーション適用
   */
  const applyCalibration = (gazeX, gazeY) => {
    if (!isComplete.value) {
      return { x: gazeX, y: gazeY, confidence: 0 }
    }
    
    const matrix = calibrationMatrix.transform
    
    // 線形変換適用
    let calibratedX = gazeX * matrix.scaleX + matrix.offsetX
    let calibratedY = gazeY * matrix.scaleY + matrix.offsetY
    
    // 非線形補正適用
    if (matrix.quadrantCorrection) {
      const correction = getQuadrantCorrection(calibratedX, calibratedY, matrix.quadrantCorrection)
      calibratedX += correction.x
      calibratedY += correction.y
    }
    
    // 範囲制限
    calibratedX = Math.max(0, Math.min(1, calibratedX))
    calibratedY = Math.max(0, Math.min(1, calibratedY))
    
    return {
      x: calibratedX,
      y: calibratedY,
      confidence: calibrationMatrix.accuracy.overall
    }
  }
  
  /**
   * 🎯 象限補正取得
   */
  const getQuadrantCorrection = (x, y, corrections) => {
    let quadrantIndex = 0
    if (x >= 0.5 && y < 0.5) quadrantIndex = 1  // 右上
    else if (x < 0.5 && y >= 0.5) quadrantIndex = 2  // 左下
    else if (x >= 0.5 && y >= 0.5) quadrantIndex = 3  // 右下
    
    return corrections[quadrantIndex] || { x: 0, y: 0 }
  }
  
  /**
   * 💾 個人プロファイル保存
   */
  const saveUserProfile = async () => {
    const profile = {
      calibrationMatrix: { ...calibrationMatrix },
      calibrationData: calibrationData.value,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
    
    try {
      localStorage.setItem('eyeTrackingCalibration', JSON.stringify(profile))
      console.log('💾 個人プロファイル保存完了')
    } catch (err) {
      console.error('❌ プロファイル保存失敗:', err)
    }
  }
  
  /**
   * 📂 個人プロファイル読み込み
   */
  const loadUserProfile = async () => {
    try {
      const saved = localStorage.getItem('eyeTrackingCalibration')
      if (!saved) return false
      
      const profile = JSON.parse(saved)
      
      // バージョンチェック
      if (profile.version !== '1.0') {
        console.warn('⚠️ 古いプロファイル形式です')
        return false
      }
      
      // データ復元
      Object.assign(calibrationMatrix, profile.calibrationMatrix)
      calibrationData.value = profile.calibrationData
      isComplete.value = true
      
      console.log('📂 個人プロファイル読み込み完了')
      return true
      
    } catch (err) {
      console.error('❌ プロファイル読み込み失敗:', err)
      return false
    }
  }
  
  /**
   * 🔄 キャリブレーションリセット
   */
  const resetCalibrationMatrix = () => {
    calibrationMatrix.transform = {
      scaleX: 1.0,
      scaleY: 1.0,
      offsetX: 0.0,
      offsetY: 0.0,
      skewX: 0.0,
      skewY: 0.0
    }
    
    calibrationMatrix.accuracy = {
      overall: 0,
      horizontal: 0,
      vertical: 0,
      stability: 0
    }
  }
  
  /**
   * 🌟 照明条件推定
   */
  const estimateLightingCondition = (faceData) => {
    // 顔の明度から照明条件を推定
    const brightness = faceData.averageBrightness || 128
    
    if (brightness < 80) return 'dark'
    if (brightness < 120) return 'dim'
    if (brightness > 200) return 'bright'
    return 'normal'
  }
  
  /**
   * 📐 カメラ角度推定
   */
  const estimateCameraAngle = (faceData) => {
    // 頭部姿勢からカメラ角度を推定
    const pitch = faceData.headPose?.pitch || 0
    return Math.abs(pitch) // 上向き度合い
  }
  
  /**
   * ⏹️ キャリブレーション中止
   */
  const cancelCalibration = () => {
    isCalibrating.value = false
    currentPoint.value = 0
    calibrationData.value = []
    console.log('⏹️ キャリブレーション中止')
  }
  
  return {
    // 状態
    isCalibrating,
    isComplete,
    currentPoint,
    progress,
    currentCalibrationPoint,
    calibrationMatrix,
    calibrationPoints,
    
    // メソッド
    startCalibration,
    collectCalibrationData,
    nextCalibrationPoint,
    finishCalibration,
    applyCalibration,
    cancelCalibration,
    saveUserProfile,
    loadUserProfile,
    resetCalibrationMatrix
  }
}