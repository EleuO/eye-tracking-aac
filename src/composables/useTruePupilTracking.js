import { ref, reactive, computed } from 'vue'

/**
 * 🎯 真の瞳孔追跡システム（革命的眼球運動検出）
 * 
 * 患者さんのための微細な眼球運動検出
 * - 頭部姿勢ではなく実際の瞳孔位置を追跡
 * - 難病患者の微細な眼球運動に対応
 * - 外付けカメラ特化最適化
 */
export function useTruePupilTracking() {
  // 瞳孔追跡状態
  const isTracking = ref(false)
  const isCalibrated = ref(false)
  const error = ref(null)
  
  // 瞳孔データ
  const pupilData = reactive({
    left: {
      x: 0,
      y: 0,
      radius: 0,
      confidence: 0,
      isDetected: false
    },
    right: {
      x: 0,
      y: 0,
      radius: 0,
      confidence: 0,
      isDetected: false
    },
    // 眼球運動計算
    movement: {
      leftDelta: { x: 0, y: 0 },
      rightDelta: { x: 0, y: 0 },
      avgDelta: { x: 0, y: 0 },
      magnitude: 0
    }
  })
  
  // ベースライン（中央視線位置）
  const baseline = reactive({
    left: { x: 0, y: 0, radius: 0 },
    right: { x: 0, y: 0, radius: 0 },
    isSet: false,
    timestamp: null
  })
  
  // 設定（患者向け高感度）
  const settings = reactive({
    // 感度設定
    sensitivity: 3.0,           // 眼球運動の増幅率
    microMovementThreshold: 2,  // 微細運動の最小閾値（ピクセル）
    smoothingFactor: 0.7,       // スムージング係数
    
    // 検出設定
    minPupilRadius: 4,          // 最小瞳孔半径
    maxPupilRadius: 20,         // 最大瞳孔半径
    confidenceThreshold: 0.6,   // 信頼度閾値
    
    // 外付けカメラ最適化
    useExternalCameraOptimization: true,
    contrastEnhancement: 1.5,   // コントラスト強化
    noiseReduction: true        // ノイズ除去
  })
  
  // 履歴データ（安定化用）
  const history = ref([])
  const maxHistorySize = 10
  
  // 統計情報
  const stats = reactive({
    detectionRate: 0,
    movementRange: { x: 0, y: 0 },
    averageMovement: 0,
    lastUpdate: Date.now()
  })
  
  /**
   * 🎯 真の瞳孔検出（外付けカメラ特化）
   */
  const detectTruePupils = async (imageData, faceRegion) => {
    if (!imageData || !faceRegion) return null
    
    try {
      // 1. 外付けカメラ向け画像前処理
      const enhancedImage = await enhanceForExternalCamera(imageData, faceRegion)
      
      // 2. 高精度瞳孔検出
      const detectionResult = await detectPupilsWithHighPrecision(enhancedImage, faceRegion)
      
      // 3. 眼球運動計算
      if (detectionResult.leftEye.isDetected || detectionResult.rightEye.isDetected) {
        calculateEyeMovement(detectionResult)
        
        // 4. 履歴に追加
        addToHistory(detectionResult)
        
        // 5. 安定化処理
        const stabilized = stabilizeMovement()
        
        return stabilized
      }
      
      return null
      
    } catch (err) {
      console.error('❌ 真の瞳孔検出エラー:', err)
      error.value = err.message
      return null
    }
  }
  
  /**
   * 🎨 外付けカメラ向け画像強化
   */
  const enhanceForExternalCamera = async (imageData, faceRegion) => {
    const { data, width, height } = imageData
    const enhanced = new Uint8ClampedArray(data)
    
    // 顔領域にフォーカス
    const faceX = Math.max(0, Math.floor(faceRegion.x))
    const faceY = Math.max(0, Math.floor(faceRegion.y))
    const faceWidth = Math.min(width - faceX, Math.floor(faceRegion.width))
    const faceHeight = Math.min(height - faceY, Math.floor(faceRegion.height))
    
    // 外付けカメラ特有の問題対応
    for (let y = faceY; y < faceY + faceHeight; y++) {
      for (let x = faceX; x < faceX + faceWidth; x++) {
        const idx = (y * width + x) * 4
        
        // コントラスト強化（外付けカメラの低コントラスト対応）
        for (let c = 0; c < 3; c++) {
          let value = data[idx + c]
          
          // 適応的コントラスト強化
          value = ((value - 128) * settings.contrastEnhancement + 128)
          
          // ガンマ補正（暗部強調）
          value = Math.pow(value / 255, 0.8) * 255
          
          enhanced[idx + c] = Math.max(0, Math.min(255, value))
        }
      }
    }
    
    // ノイズ除去（外付けカメラのノイズ対応）
    if (settings.noiseReduction) {
      applyAdvancedNoiseReduction(enhanced, width, height, { x: faceX, y: faceY, width: faceWidth, height: faceHeight })
    }
    
    return { data: enhanced, width, height }
  }
  
  /**
   * 🔍 高精度瞳孔検出
   */
  const detectPupilsWithHighPrecision = async (imageData, faceRegion) => {
    const { data, width, height } = imageData
    
    // 目領域の精密推定
    const eyeRegions = estimatePreciseEyeRegions(faceRegion)
    
    // 左目検出
    const leftResult = await detectSinglePupil(data, width, height, eyeRegions.left, 'left')
    
    // 右目検出
    const rightResult = await detectSinglePupil(data, width, height, eyeRegions.right, 'right')
    
    return {
      leftEye: leftResult,
      rightEye: rightResult,
      timestamp: Date.now()
    }
  }
  
  /**
   * 👁️ 単一瞳孔の高精度検出
   */
  const detectSinglePupil = async (data, width, height, eyeRegion, side) => {
    const result = {
      x: 0,
      y: 0,
      radius: 0,
      confidence: 0,
      isDetected: false
    }
    
    // 検索範囲設定
    const searchX = Math.max(0, Math.floor(eyeRegion.x))
    const searchY = Math.max(0, Math.floor(eyeRegion.y))
    const searchWidth = Math.min(width - searchX, Math.floor(eyeRegion.width))
    const searchHeight = Math.min(height - searchY, Math.floor(eyeRegion.height))
    
    let bestCandidate = { x: 0, y: 0, radius: 0, score: 0 }
    
    // 多重解像度スキャン（粗い→細かい）
    for (let resolution = 4; resolution >= 1; resolution /= 2) {
      const step = Math.max(1, resolution)
      
      for (let y = searchY; y < searchY + searchHeight - settings.maxPupilRadius; y += step) {
        for (let x = searchX; x < searchX + searchWidth - settings.maxPupilRadius; x += step) {
          
          // 各候補位置で瞳孔らしさを評価
          const score = evaluatePupilCandidate(data, width, x, y)
          
          if (score > bestCandidate.score) {
            // より詳細な解析
            const detailedResult = analyzeDetailedPupil(data, width, height, x, y)
            
            if (detailedResult.score > bestCandidate.score) {
              bestCandidate = {
                x: detailedResult.x,
                y: detailedResult.y,
                radius: detailedResult.radius,
                score: detailedResult.score
              }
            }
          }
        }
      }
    }
    
    // 結果の検証
    if (bestCandidate.score > settings.confidenceThreshold) {
      result.x = bestCandidate.x
      result.y = bestCandidate.y
      result.radius = bestCandidate.radius
      result.confidence = bestCandidate.score
      result.isDetected = true
      
      console.log(`👁️ ${side}目検出: (${Math.round(result.x)}, ${Math.round(result.y)}) 半径=${Math.round(result.radius)} 信頼度=${Math.round(result.confidence * 100)}%`)
    }
    
    return result
  }
  
  /**
   * 🎯 瞳孔候補の評価
   */
  const evaluatePupilCandidate = (data, width, centerX, centerY) => {
    let score = 0
    let sampledPixels = 0
    let darkPixels = 0
    let totalDarkness = 0
    
    // 円形サンプリング
    for (let radius = settings.minPupilRadius; radius <= settings.maxPupilRadius; radius += 2) {
      let radiusScore = 0
      let radiusPixels = 0
      
      // 円周上のサンプリング
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = (angle * Math.PI) / 180
        const x = Math.round(centerX + radius * Math.cos(rad))
        const y = Math.round(centerY + radius * Math.sin(rad))
        
        if (x >= 0 && x < width && y >= 0) {
          const idx = (y * width + x) * 4
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
          
          radiusPixels++
          sampledPixels++
          
          // 瞳孔は暗い
          if (brightness < 70) {
            darkPixels++
            radiusScore += (70 - brightness) / 70
            totalDarkness += brightness
          }
          
          // 瞳孔周辺は明るい（虹彩）
          if (radius > settings.minPupilRadius + 2) {
            if (brightness > 90 && brightness < 180) {
              radiusScore += 0.3 // 適切な明度の虹彩
            }
          }
        }
      }
      
      if (radiusPixels > 0) {
        score += radiusScore / radiusPixels
      }
    }
    
    // 総合スコア計算
    if (sampledPixels > 0) {
      const darkRatio = darkPixels / sampledPixels
      const avgDarkness = totalDarkness / Math.max(1, darkPixels)
      
      // 最終スコア
      score = (score / sampledPixels) * darkRatio * (1 - avgDarkness / 255)
    }
    
    return Math.min(1.0, score)
  }
  
  /**
   * 🔬 詳細瞳孔解析
   */
  const analyzeDetailedPupil = (data, width, height, centerX, centerY) => {
    let bestRadius = settings.minPupilRadius
    let bestScore = 0
    let bestX = centerX
    let bestY = centerY
    
    // 中心位置の微調整（±2ピクセル）
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const testX = centerX + dx
        const testY = centerY + dy
        
        // 最適半径の探索
        for (let radius = settings.minPupilRadius; radius <= settings.maxPupilRadius; radius++) {
          const score = calculateCircularityScore(data, width, testX, testY, radius)
          
          if (score > bestScore) {
            bestScore = score
            bestRadius = radius
            bestX = testX
            bestY = testY
          }
        }
      }
    }
    
    return {
      x: bestX,
      y: bestY,
      radius: bestRadius,
      score: bestScore
    }
  }
  
  /**
   * ⭕ 円形度スコア計算
   */
  const calculateCircularityScore = (data, width, centerX, centerY, radius) => {
    let score = 0
    let samples = 0
    
    // 内部（瞳孔）の暗さチェック
    let innerDarkness = 0
    let innerSamples = 0
    
    for (let angle = 0; angle < 360; angle += 20) {
      const rad = (angle * Math.PI) / 180
      const innerRadius = radius * 0.7
      const x = Math.round(centerX + innerRadius * Math.cos(rad))
      const y = Math.round(centerY + innerRadius * Math.sin(rad))
      
      if (x >= 0 && x < width && y >= 0) {
        const idx = (y * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        innerDarkness += brightness
        innerSamples++
      }
    }
    
    const avgInnerDarkness = innerSamples > 0 ? innerDarkness / innerSamples : 255
    
    // 境界の一貫性チェック
    let boundaryConsistency = 0
    let boundarySamples = 0
    
    for (let angle = 0; angle < 360; angle += 10) {
      const rad = (angle * Math.PI) / 180
      const x = Math.round(centerX + radius * Math.cos(rad))
      const y = Math.round(centerY + radius * Math.sin(rad))
      
      if (x >= 0 && x < width && y >= 0) {
        const idx = (y * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        // 境界は内部より明るいはず
        if (brightness > avgInnerDarkness) {
          boundaryConsistency += 1
        }
        
        boundarySamples++
      }
    }
    
    // スコア計算
    const darknessScore = Math.max(0, (255 - avgInnerDarkness) / 255)
    const consistencyScore = boundarySamples > 0 ? boundaryConsistency / boundarySamples : 0
    
    return (darknessScore * 0.7 + consistencyScore * 0.3)
  }
  
  /**
   * 📐 精密目領域推定
   */
  const estimatePreciseEyeRegions = (faceRegion) => {
    const faceWidth = faceRegion.width
    const faceHeight = faceRegion.height
    const faceX = faceRegion.x
    const faceY = faceRegion.y
    
    // より正確な目の位置（外付けカメラ向け調整）
    const eyeYRatio = 0.38        // 顔の上から38%
    const eyeHeightRatio = 0.15   // 高さ15%
    const eyeWidthRatio = 0.22    // 幅22%
    
    const leftEyeXRatio = 0.25    // 左目位置
    const rightEyeXRatio = 0.75   // 右目位置
    
    const eyeY = faceY + faceHeight * eyeYRatio
    const eyeHeight = faceHeight * eyeHeightRatio
    const eyeWidth = faceWidth * eyeWidthRatio
    
    return {
      left: {
        x: faceX + faceWidth * leftEyeXRatio - eyeWidth / 2,
        y: eyeY - eyeHeight / 2,
        width: eyeWidth,
        height: eyeHeight
      },
      right: {
        x: faceX + faceWidth * rightEyeXRatio - eyeWidth / 2,
        y: eyeY - eyeHeight / 2,
        width: eyeWidth,
        height: eyeHeight
      }
    }
  }
  
  /**
   * 🎯 眼球運動計算（核心部分）
   */
  const calculateEyeMovement = (detection) => {
    if (!baseline.isSet) {
      console.log('⚠️ ベースライン未設定 - 眼球運動計算スキップ')
      return
    }
    
    // 左目の運動計算
    if (detection.leftEye.isDetected && baseline.left.x > 0) {
      pupilData.movement.leftDelta.x = (detection.leftEye.x - baseline.left.x) * settings.sensitivity
      pupilData.movement.leftDelta.y = (detection.leftEye.y - baseline.left.y) * settings.sensitivity
    }
    
    // 右目の運動計算
    if (detection.rightEye.isDetected && baseline.right.x > 0) {
      pupilData.movement.rightDelta.x = (detection.rightEye.x - baseline.right.x) * settings.sensitivity
      pupilData.movement.rightDelta.y = (detection.rightEye.y - baseline.right.y) * settings.sensitivity
    }
    
    // 平均運動ベクトル
    let avgX = 0, avgY = 0, validEyes = 0
    
    if (detection.leftEye.isDetected) {
      avgX += pupilData.movement.leftDelta.x
      avgY += pupilData.movement.leftDelta.y
      validEyes++
    }
    
    if (detection.rightEye.isDetected) {
      avgX += pupilData.movement.rightDelta.x
      avgY += pupilData.movement.rightDelta.y
      validEyes++
    }
    
    if (validEyes > 0) {
      pupilData.movement.avgDelta.x = avgX / validEyes
      pupilData.movement.avgDelta.y = avgY / validEyes
      pupilData.movement.magnitude = Math.sqrt(
        pupilData.movement.avgDelta.x ** 2 + pupilData.movement.avgDelta.y ** 2
      )
      
      // 微細運動の検出ログ
      if (pupilData.movement.magnitude > settings.microMovementThreshold) {
        console.log(`👁️ 眼球運動検出: (${pupilData.movement.avgDelta.x.toFixed(1)}, ${pupilData.movement.avgDelta.y.toFixed(1)}) 強度=${pupilData.movement.magnitude.toFixed(1)}`)
      }
    }
    
    // 瞳孔データ更新
    pupilData.left = { ...detection.leftEye }
    pupilData.right = { ...detection.rightEye }
  }
  
  /**
   * 📍 ベースライン設定（中央視線位置）
   */
  const setBaseline = () => {
    if (pupilData.left.isDetected || pupilData.right.isDetected) {
      baseline.left = { ...pupilData.left }
      baseline.right = { ...pupilData.right }
      baseline.isSet = true
      baseline.timestamp = Date.now()
      
      console.log('📍 ベースライン設定完了')
      console.log(`左目: (${baseline.left.x.toFixed(1)}, ${baseline.left.y.toFixed(1)})`)
      console.log(`右目: (${baseline.right.x.toFixed(1)}, ${baseline.right.y.toFixed(1)})`)
      
      return true
    }
    
    console.warn('⚠️ ベースライン設定失敗 - 瞳孔が検出されていません')
    return false
  }
  
  /**
   * 🔄 ベースラインリセット
   */
  const resetBaseline = () => {
    baseline.left = { x: 0, y: 0, radius: 0 }
    baseline.right = { x: 0, y: 0, radius: 0 }
    baseline.isSet = false
    baseline.timestamp = null
    
    console.log('🔄 ベースラインリセット完了')
  }
  
  /**
   * 📊 履歴管理
   */
  const addToHistory = (detection) => {
    history.value.push({
      ...detection,
      movement: { ...pupilData.movement }
    })
    
    if (history.value.length > maxHistorySize) {
      history.value = history.value.slice(-maxHistorySize)
    }
  }
  
  /**
   * 🎛️ 運動安定化
   */
  const stabilizeMovement = () => {
    if (history.value.length < 2) return pupilData.movement
    
    const recent = history.value.slice(-3)
    let avgX = 0, avgY = 0
    
    recent.forEach(item => {
      avgX += item.movement.avgDelta.x
      avgY += item.movement.avgDelta.y
    })
    
    const stabilized = {
      x: avgX / recent.length,
      y: avgY / recent.length,
      magnitude: Math.sqrt((avgX / recent.length) ** 2 + (avgY / recent.length) ** 2),
      confidence: recent.reduce((sum, item) => {
        return sum + Math.max(item.leftEye.confidence, item.rightEye.confidence)
      }, 0) / recent.length
    }
    
    return stabilized
  }
  
  /**
   * 📈 統計更新
   */
  const updateStats = () => {
    const now = Date.now()
    
    // 検出率計算
    const recentDetections = history.value.slice(-10)
    const detectedCount = recentDetections.filter(item => 
      item.leftEye.isDetected || item.rightEye.isDetected
    ).length
    
    stats.detectionRate = recentDetections.length > 0 ? 
      (detectedCount / recentDetections.length) * 100 : 0
    
    // 運動範囲更新
    if (history.value.length > 5) {
      const movements = history.value.slice(-10).map(item => item.movement)
      stats.movementRange.x = Math.max(...movements.map(m => Math.abs(m.avgDelta.x)))
      stats.movementRange.y = Math.max(...movements.map(m => Math.abs(m.avgDelta.y)))
      stats.averageMovement = movements.reduce((sum, m) => sum + m.magnitude, 0) / movements.length
    }
    
    stats.lastUpdate = now
  }
  
  /**
   * 🎛️ 設定調整
   */
  const adjustSensitivity = (newSensitivity) => {
    settings.sensitivity = Math.max(0.5, Math.min(10.0, newSensitivity))
    console.log(`🎛️ 感度調整: ${settings.sensitivity}`)
  }
  
  /**
   * 🔧 高度ノイズ除去
   */
  const applyAdvancedNoiseReduction = (data, width, height, region) => {
    // メディアンフィルタによるノイズ除去
    const kernelSize = 3
    const half = Math.floor(kernelSize / 2)
    
    for (let y = region.y + half; y < region.y + region.height - half; y++) {
      for (let x = region.x + half; x < region.x + region.width - half; x++) {
        for (let c = 0; c < 3; c++) {
          const values = []
          
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c
              values.push(data[idx])
            }
          }
          
          values.sort((a, b) => a - b)
          const medianValue = values[Math.floor(values.length / 2)]
          
          const idx = (y * width + x) * 4 + c
          data[idx] = medianValue
        }
      }
    }
  }
  
  // 視線方向計算（計算プロパティ）
  const gazeDirection = computed(() => {
    if (!baseline.isSet) return { x: 0, y: 0, confidence: 0 }
    
    const movement = pupilData.movement.avgDelta
    
    // 視線方向を画面座標系に変換
    const screenX = movement.x * 0.5  // X方向感度調整
    const screenY = movement.y * 0.5  // Y方向感度調整
    
    // 信頼度計算
    const confidence = Math.max(pupilData.left.confidence, pupilData.right.confidence)
    
    return {
      x: screenX,
      y: screenY,
      confidence: confidence,
      magnitude: movement.magnitude
    }
  })
  
  return {
    // 状態
    isTracking,
    isCalibrated,
    error,
    pupilData,
    baseline,
    settings,
    stats,
    history,
    
    // 計算プロパティ
    gazeDirection,
    
    // メソッド
    detectTruePupils,
    setBaseline,
    resetBaseline,
    adjustSensitivity,
    updateStats
  }
}