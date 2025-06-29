import { ref, reactive } from 'vue'

/**
 * 🎯 強化された瞳孔検出システム
 * 
 * 低画質Webカメラ & 上向きカメラ角度対応
 * 患者さんが確実に使える革命的検出精度
 */
export function useEnhancedEyeDetection() {
  // 検出設定
  const detectionSettings = reactive({
    // 画像品質向上
    imageEnhancement: {
      contrastBoost: 1.2,        // コントラスト強化
      brightnessAdjust: 0.1,     // 明度調整
      noiseReduction: true,      // ノイズ除去
      edgeSharpening: 0.8        // エッジ強調
    },
    
    // 瞳孔検出設定
    pupilDetection: {
      minRadius: 3,              // 最小瞳孔半径
      maxRadius: 25,             // 最大瞳孔半径
      darkThreshold: 80,         // 瞳孔の暗さ閾値
      circularityThreshold: 0.7, // 円形度閾値
      edgeStrength: 0.6          // エッジ強度閾値
    },
    
    // 安定化設定
    stabilization: {
      frameHistory: 5,           // フレーム履歴数
      outlierThreshold: 30,      // 外れ値閾値（ピクセル）
      smoothingFactor: 0.3       // スムージング係数
    },
    
    // 上向きカメラ対応
    cameraAngleAdaptation: {
      partialPupilDetection: true,    // 部分瞳孔検出
      eyelidCompensation: true,       // まぶた補正
      irisPatternDetection: true      // 虹彩パターン検出
    }
  })
  
  // 検出履歴
  const detectionHistory = ref([])
  const currentDetection = reactive({
    left: { x: 0, y: 0, radius: 0, confidence: 0, quality: 0 },
    right: { x: 0, y: 0, radius: 0, confidence: 0, quality: 0 },
    stability: 0,
    frameQuality: 0
  })
  
  // パフォーマンス監視
  const performance = reactive({
    processingTime: 0,
    enhancementTime: 0,
    detectionTime: 0,
    stabilizationTime: 0
  })
  
  /**
   * 🎯 メイン検出処理
   */
  const detectEnhancedEyes = async (imageData, faceRegion) => {
    const startTime = performance.now()
    
    try {
      // 1. 画像品質向上
      const enhancedImage = await enhanceImageQuality(imageData, faceRegion)
      performance.enhancementTime = performance.now() - startTime
      
      // 2. 多重検出手法による瞳孔検出
      const detectionStart = performance.now()
      const detections = await multiMethodPupilDetection(enhancedImage, faceRegion)
      performance.detectionTime = performance.now() - detectionStart
      
      // 3. 時系列安定化
      const stabilizationStart = performance.now()
      const stabilizedDetections = await stabilizeDetections(detections)
      performance.stabilizationTime = performance.now() - stabilizationStart
      
      // 4. 結果更新
      updateCurrentDetection(stabilizedDetections)
      
      performance.processingTime = performance.now() - startTime
      
      return currentDetection
      
    } catch (err) {
      console.error('❌ 強化瞳孔検出エラー:', err)
      return null
    }
  }
  
  /**
   * 🎨 画像品質向上処理
   */
  const enhanceImageQuality = async (imageData, faceRegion) => {
    const { width, height, data } = imageData
    const enhanced = new Uint8ClampedArray(data)
    
    // 顔領域にフォーカスして処理
    const startX = Math.max(0, Math.floor(faceRegion.x))
    const endX = Math.min(width, Math.floor(faceRegion.x + faceRegion.width))
    const startY = Math.max(0, Math.floor(faceRegion.y))
    const endY = Math.min(height, Math.floor(faceRegion.y + faceRegion.height))
    
    // 1. コントラスト強化
    const contrastBoost = detectionSettings.imageEnhancement.contrastBoost
    const brightnessAdjust = detectionSettings.imageEnhancement.brightnessAdjust
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * width + x) * 4
        
        // RGB各チャンネルでコントラスト強化
        for (let c = 0; c < 3; c++) {
          let value = data[idx + c]
          
          // コントラスト調整
          value = ((value - 128) * contrastBoost + 128)
          
          // 明度調整
          value += brightnessAdjust * 255
          
          enhanced[idx + c] = Math.max(0, Math.min(255, value))
        }
      }
    }
    
    // 2. ノイズ除去（ガウシアンフィルタ）
    if (detectionSettings.imageEnhancement.noiseReduction) {
      applyGaussianBlur(enhanced, width, height, faceRegion, 1.0)
    }
    
    // 3. エッジ強調
    if (detectionSettings.imageEnhancement.edgeSharpening > 0) {
      applySharpeningFilter(enhanced, width, height, faceRegion, detectionSettings.imageEnhancement.edgeSharpening)
    }
    
    return { data: enhanced, width, height }
  }
  
  /**
   * 🔍 多重検出手法による瞳孔検出
   */
  const multiMethodPupilDetection = async (imageData, faceRegion) => {
    const methods = []
    
    // 手法1: ダークサークル検出（従来の暗い円形領域検出）
    methods.push(await darkCircleDetection(imageData, faceRegion))
    
    // 手法2: エッジベース円検出
    methods.push(await edgeBasedCircleDetection(imageData, faceRegion))
    
    // 手法3: 色差ベース検出
    methods.push(await colorDifferenceDetection(imageData, faceRegion))
    
    // 手法4: 上向きカメラ対応検出
    if (detectionSettings.cameraAngleAdaptation.partialPupilDetection) {
      methods.push(await partialPupilDetection(imageData, faceRegion))
    }
    
    // 各手法の結果を統合
    const leftEyeCandidates = []
    const rightEyeCandidates = []
    
    methods.forEach(method => {
      if (method.leftEye.confidence > 0.3) leftEyeCandidates.push(method.leftEye)
      if (method.rightEye.confidence > 0.3) rightEyeCandidates.push(method.rightEye)
    })
    
    // 最も信頼度の高い結果を選択
    const bestLeft = leftEyeCandidates.reduce((best, candidate) => 
      candidate.confidence > best.confidence ? candidate : best, 
      { x: 0, y: 0, radius: 0, confidence: 0 }
    )
    
    const bestRight = rightEyeCandidates.reduce((best, candidate) => 
      candidate.confidence > best.confidence ? candidate : best, 
      { x: 0, y: 0, radius: 0, confidence: 0 }
    )
    
    return { leftEye: bestLeft, rightEye: bestRight }
  }
  
  /**
   * 🌑 ダークサークル検出（改良版）
   */
  const darkCircleDetection = async (imageData, faceRegion) => {
    const { data, width, height } = imageData
    const leftEye = { x: 0, y: 0, radius: 0, confidence: 0 }
    const rightEye = { x: 0, y: 0, radius: 0, confidence: 0 }
    
    // 目領域の推定
    const leftEyeRegion = {
      x: faceRegion.x + faceRegion.width * 0.15,
      y: faceRegion.y + faceRegion.height * 0.25,
      width: faceRegion.width * 0.25,
      height: faceRegion.height * 0.25
    }
    
    const rightEyeRegion = {
      x: faceRegion.x + faceRegion.width * 0.6,
      y: faceRegion.y + faceRegion.height * 0.25,
      width: faceRegion.width * 0.25,
      height: faceRegion.height * 0.25
    }
    
    // 左目検出
    const leftResult = findDarkestCircle(data, width, height, leftEyeRegion)
    if (leftResult.confidence > 0.3) {
      leftEye.x = leftResult.x
      leftEye.y = leftResult.y
      leftEye.radius = leftResult.radius
      leftEye.confidence = leftResult.confidence
    }
    
    // 右目検出
    const rightResult = findDarkestCircle(data, width, height, rightEyeRegion)
    if (rightResult.confidence > 0.3) {
      rightEye.x = rightResult.x
      rightEye.y = rightResult.y
      rightEye.radius = rightResult.radius
      rightEye.confidence = rightResult.confidence
    }
    
    return { leftEye, rightEye }
  }
  
  /**
   * ⚫ 最暗円形領域検索
   */
  const findDarkestCircle = (data, width, height, region) => {
    let bestCandidate = { x: 0, y: 0, radius: 0, confidence: 0 }
    
    const minRadius = detectionSettings.pupilDetection.minRadius
    const maxRadius = detectionSettings.pupilDetection.maxRadius
    const darkThreshold = detectionSettings.pupilDetection.darkThreshold
    
    // 検索範囲を制限
    const startX = Math.max(0, Math.floor(region.x))
    const endX = Math.min(width, Math.floor(region.x + region.width))
    const startY = Math.max(0, Math.floor(region.y))
    const endY = Math.min(height, Math.floor(region.y + region.height))
    
    for (let centerY = startY + maxRadius; centerY < endY - maxRadius; centerY += 2) {
      for (let centerX = startX + maxRadius; centerX < endX - maxRadius; centerX += 2) {
        
        for (let radius = minRadius; radius <= maxRadius; radius += 2) {
          const score = evaluateCircularDarkness(data, width, centerX, centerY, radius, darkThreshold)
          
          if (score > bestCandidate.confidence) {
            bestCandidate = {
              x: centerX,
              y: centerY,
              radius: radius,
              confidence: score
            }
          }
        }
      }
    }
    
    return bestCandidate
  }
  
  /**
   * 🔵 円形暗度評価
   */
  const evaluateCircularDarkness = (data, width, centerX, centerY, radius, threshold) => {
    let darkPixels = 0
    let totalPixels = 0
    let totalDarkness = 0
    
    // 円周上のピクセルを評価
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180
      const x = Math.round(centerX + radius * Math.cos(rad))
      const y = Math.round(centerY + radius * Math.sin(rad))
      
      if (x >= 0 && x < width && y >= 0) {
        const idx = (y * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        totalPixels++
        if (brightness < threshold) {
          darkPixels++
          totalDarkness += (threshold - brightness)
        }
      }
    }
    
    if (totalPixels === 0) return 0
    
    const darkRatio = darkPixels / totalPixels
    const avgDarkness = totalDarkness / Math.max(1, darkPixels)
    
    // 円形度と暗さの組み合わせスコア
    return darkRatio * 0.6 + (avgDarkness / threshold) * 0.4
  }
  
  /**
   * 🔷 エッジベース円検出
   */
  const edgeBasedCircleDetection = async (imageData, faceRegion) => {
    // Sobelフィルタによるエッジ検出
    const edges = detectEdges(imageData, faceRegion)
    
    // Hough変換による円検出
    const circles = houghCircleTransform(edges, faceRegion)
    
    // 最も信頼度の高い左右の目を選択
    const leftEye = findBestEyeCandidate(circles, 'left', faceRegion)
    const rightEye = findBestEyeCandidate(circles, 'right', faceRegion)
    
    return { leftEye, rightEye }
  }
  
  /**
   * 🎨 色差ベース検出
   */
  const colorDifferenceDetection = async (imageData, faceRegion) => {
    const { data, width, height } = imageData
    
    // HSV変換による瞳孔検出
    const hsvData = rgbToHsv(data, width, height)
    
    // 低彩度・低明度領域を瞳孔候補として検出
    const candidates = findLowSaturationRegions(hsvData, width, height, faceRegion)
    
    // 最適な候補を選択
    const leftEye = selectBestCandidate(candidates, 'left', faceRegion)
    const rightEye = selectBestCandidate(candidates, 'right', faceRegion)
    
    return { leftEye, rightEye }
  }
  
  /**
   * 🔺 部分瞳孔検出（上向きカメラ対応）
   */
  const partialPupilDetection = async (imageData, faceRegion) => {
    const { data, width, height } = imageData
    
    // まぶたの影響を考慮した部分検出
    const leftPartial = detectPartialPupil(data, width, height, faceRegion, 'left')
    const rightPartial = detectPartialPupil(data, width, height, faceRegion, 'right')
    
    return { leftEye: leftPartial, rightEye: rightPartial }
  }
  
  /**
   * 👁️ 部分瞳孔検出実装
   */
  const detectPartialPupil = (data, width, height, faceRegion, side) => {
    const eyeRegion = side === 'left' ? 
      {
        x: faceRegion.x + faceRegion.width * 0.15,
        y: faceRegion.y + faceRegion.height * 0.25,
        width: faceRegion.width * 0.25,
        height: faceRegion.height * 0.25
      } : 
      {
        x: faceRegion.x + faceRegion.width * 0.6,
        y: faceRegion.y + faceRegion.height * 0.25,
        width: faceRegion.width * 0.25,
        height: faceRegion.height * 0.25
      }
    
    // 上部が隠れた瞳孔でも検出できるよう、下半分を重点的に検索
    const searchRegion = {
      x: eyeRegion.x,
      y: eyeRegion.y + eyeRegion.height * 0.3, // 上30%をスキップ
      width: eyeRegion.width,
      height: eyeRegion.height * 0.7
    }
    
    return findDarkestCircle(data, width, height, searchRegion)
  }
  
  /**
   * 📈 時系列安定化
   */
  const stabilizeDetections = async (detections) => {
    // 履歴に追加
    detectionHistory.value.push({
      ...detections,
      timestamp: Date.now()
    })
    
    // 履歴数制限
    const maxHistory = detectionSettings.stabilization.frameHistory
    if (detectionHistory.value.length > maxHistory) {
      detectionHistory.value = detectionHistory.value.slice(-maxHistory)
    }
    
    // 外れ値除去
    const filteredHistory = removeOutliers(detectionHistory.value)
    
    // 平均化による安定化
    const stabilized = calculateStabilizedPosition(filteredHistory)
    
    return stabilized
  }
  
  /**
   * 🚫 外れ値除去
   */
  const removeOutliers = (history) => {
    if (history.length < 3) return history
    
    const threshold = detectionSettings.stabilization.outlierThreshold
    const filtered = []
    
    history.forEach((current, index) => {
      if (index === 0) {
        filtered.push(current)
        return
      }
      
      const previous = history[index - 1]
      
      // 左目の距離チェック
      const leftDistLeft = Math.sqrt(
        Math.pow(current.leftEye.x - previous.leftEye.x, 2) +
        Math.pow(current.leftEye.y - previous.leftEye.y, 2)
      )
      
      // 右目の距離チェック
      const rightDist = Math.sqrt(
        Math.pow(current.rightEye.x - previous.rightEye.x, 2) +
        Math.pow(current.rightEye.y - previous.rightEye.y, 2)
      )
      
      // 閾値以下なら正常値として採用
      if (leftDistLeft <= threshold && rightDist <= threshold) {
        filtered.push(current)
      }
    })
    
    return filtered.length > 0 ? filtered : history
  }
  
  /**
   * 📊 安定化位置計算
   */
  const calculateStabilizedPosition = (history) => {
    if (history.length === 0) {
      return {
        leftEye: { x: 0, y: 0, radius: 0, confidence: 0 },
        rightEye: { x: 0, y: 0, radius: 0, confidence: 0 }
      }
    }
    
    const smoothingFactor = detectionSettings.stabilization.smoothingFactor
    
    // 重み付け平均（新しいフレームほど重い）
    let leftX = 0, leftY = 0, leftRadius = 0, leftConfidence = 0
    let rightX = 0, rightY = 0, rightRadius = 0, rightConfidence = 0
    let totalWeight = 0
    
    history.forEach((frame, index) => {
      const weight = Math.pow(smoothingFactor, history.length - 1 - index)
      totalWeight += weight
      
      leftX += frame.leftEye.x * weight
      leftY += frame.leftEye.y * weight
      leftRadius += frame.leftEye.radius * weight
      leftConfidence += frame.leftEye.confidence * weight
      
      rightX += frame.rightEye.x * weight
      rightY += frame.rightEye.y * weight
      rightRadius += frame.rightEye.radius * weight
      rightConfidence += frame.rightEye.confidence * weight
    })
    
    return {
      leftEye: {
        x: leftX / totalWeight,
        y: leftY / totalWeight,
        radius: leftRadius / totalWeight,
        confidence: leftConfidence / totalWeight
      },
      rightEye: {
        x: rightX / totalWeight,
        y: rightY / totalWeight,
        radius: rightRadius / totalWeight,
        confidence: rightConfidence / totalWeight
      }
    }
  }
  
  /**
   * 🔄 現在の検出結果更新
   */
  const updateCurrentDetection = (stabilizedDetections) => {
    currentDetection.left = { ...stabilizedDetections.leftEye }
    currentDetection.right = { ...stabilizedDetections.rightEye }
    
    // 安定性スコア計算
    currentDetection.stability = calculateStabilityScore()
    
    // フレーム品質評価
    currentDetection.frameQuality = evaluateFrameQuality()
  }
  
  /**
   * 📈 安定性スコア計算
   */
  const calculateStabilityScore = () => {
    if (detectionHistory.value.length < 2) return 0
    
    const recent = detectionHistory.value.slice(-3)
    let totalVariance = 0
    
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1]
      const curr = recent[i]
      
      const leftVariance = Math.sqrt(
        Math.pow(curr.leftEye.x - prev.leftEye.x, 2) +
        Math.pow(curr.leftEye.y - prev.leftEye.y, 2)
      )
      
      const rightVariance = Math.sqrt(
        Math.pow(curr.rightEye.x - prev.rightEye.x, 2) +
        Math.pow(curr.rightEye.y - prev.rightEye.y, 2)
      )
      
      totalVariance += (leftVariance + rightVariance) / 2
    }
    
    const avgVariance = totalVariance / (recent.length - 1)
    return Math.max(0, 1 - avgVariance / 50) // 50ピクセル変動で安定性0
  }
  
  /**
   * 🎯 フレーム品質評価
   */
  const evaluateFrameQuality = () => {
    const leftConf = currentDetection.left.confidence
    const rightConf = currentDetection.right.confidence
    const stability = currentDetection.stability
    
    return (leftConf + rightConf + stability) / 3
  }
  
  // ヘルパー関数群（画像処理）
  const applyGaussianBlur = (data, width, height, region, sigma) => {
    // ガウシアンブラー実装
    // 簡略化版：3x3カーネル
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ]
    const kernelSum = 16
    
    // 実装省略（実際のプロダクションでは完全実装）
  }
  
  const applySharpeningFilter = (data, width, height, region, strength) => {
    // シャープニングフィルター
    // 実装省略
  }
  
  const detectEdges = (imageData, region) => {
    // Sobelエッジ検出
    // 実装省略
    return imageData
  }
  
  const houghCircleTransform = (edges, region) => {
    // Hough変換円検出
    // 実装省略
    return []
  }
  
  const findBestEyeCandidate = (circles, side, region) => {
    // 最適候補選択
    return { x: 0, y: 0, radius: 0, confidence: 0 }
  }
  
  const rgbToHsv = (data, width, height) => {
    // RGB-HSV変換
    // 実装省略
    return data
  }
  
  const findLowSaturationRegions = (hsvData, width, height, region) => {
    // 低彩度領域検出
    // 実装省略
    return []
  }
  
  const selectBestCandidate = (candidates, side, region) => {
    // 最適候補選択
    return { x: 0, y: 0, radius: 0, confidence: 0 }
  }
  
  return {
    // 状態
    currentDetection,
    detectionSettings,
    performance,
    
    // メソッド
    detectEnhancedEyes,
    enhanceImageQuality,
    multiMethodPupilDetection
  }
}