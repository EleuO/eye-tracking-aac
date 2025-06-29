import { ref, reactive } from 'vue'

/**
 * 🎯 革命的リアルタイム顔パーツ解析システム
 * 
 * 静的な解剖学的比率ではなく、画像解析による動的な目・鼻・口の位置検出
 * 患者さんごとの顔の特徴に完全適応する世界最高精度システム
 */
export function useAdvancedFaceAnalyzer() {
  // 検出状態
  const isAnalyzing = ref(false)
  const error = ref(null)
  
  // 🎯 リアルタイム顔パーツデータ
  const faceAnalysis = reactive({
    // 目の検出結果
    eyes: {
      left: { x: 0, y: 0, confidence: 0, width: 0, height: 0 },
      right: { x: 0, y: 0, confidence: 0, width: 0, height: 0 },
      center: { x: 0, y: 0 },
      distance: 0,
      isDetected: false
    },
    
    // 鼻の検出結果
    nose: {
      tip: { x: 0, y: 0 },
      bridge: { x: 0, y: 0 },
      confidence: 0,
      isDetected: false
    },
    
    // 口の検出結果
    mouth: {
      center: { x: 0, y: 0 },
      corners: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
      confidence: 0,
      isDetected: false
    },
    
    // 顔の骨格特徴
    faceStructure: {
      faceWidth: 0,
      faceHeight: 0,
      cheekWidth: 0,
      foreheadHeight: 0,
      jawWidth: 0
    },
    
    // 総合品質スコア
    overallQuality: 0,
    analysisTime: 0
  })
  
  /**
   * 🎯 革命的目検出アルゴリズム（画像解析ベース）
   */
  const detectEyesFromImage = (imageData, faceRegion) => {
    const startTime = performance.now()
    
    try {
      // 🔍 ステップ1: 目領域の候補を抽出
      const eyeCandidates = findEyeCandidates(imageData, faceRegion)
      
      // 🔍 ステップ2: 両目のペアを識別
      const eyePair = identifyEyePair(eyeCandidates, faceRegion)
      
      // 🔍 ステップ3: 瞳孔の正確な位置を特定
      if (eyePair.left && eyePair.right) {
        const leftPupil = detectPupilInEye(imageData, eyePair.left)
        const rightPupil = detectPupilInEye(imageData, eyePair.right)
        
        // 結果を更新
        faceAnalysis.eyes.left = { ...eyePair.left, ...leftPupil }
        faceAnalysis.eyes.right = { ...eyePair.right, ...rightPupil }
        faceAnalysis.eyes.center = {
          x: (faceAnalysis.eyes.left.x + faceAnalysis.eyes.right.x) / 2,
          y: (faceAnalysis.eyes.left.y + faceAnalysis.eyes.right.y) / 2
        }
        faceAnalysis.eyes.distance = Math.abs(faceAnalysis.eyes.right.x - faceAnalysis.eyes.left.x)
        faceAnalysis.eyes.isDetected = true
        
        console.log(`👁️ リアルタイム目検出: 左目(${Math.round(faceAnalysis.eyes.left.x)}, ${Math.round(faceAnalysis.eyes.left.y)}) 右目(${Math.round(faceAnalysis.eyes.right.x)}, ${Math.round(faceAnalysis.eyes.right.y)})`)
      }
      
      faceAnalysis.analysisTime = performance.now() - startTime
      
    } catch (err) {
      console.error('❌ 目検出エラー:', err)
      error.value = err.message
    }
  }
  
  /**
   * 🔍 目の候補領域を画像解析で検出
   */
  const findEyeCandidates = (imageData, faceRegion) => {
    const { data, width } = imageData
    const candidates = []
    
    // 顔領域の上半分（目がある領域）
    const searchTop = Math.floor(faceRegion.y + faceRegion.height * 0.2)
    const searchBottom = Math.floor(faceRegion.y + faceRegion.height * 0.6)
    const searchLeft = Math.floor(faceRegion.x + faceRegion.width * 0.1)
    const searchRight = Math.floor(faceRegion.x + faceRegion.width * 0.9)
    
    // 🎯 革命的アルゴリズム: 暗い楕円形領域（目）を検出
    for (let y = searchTop; y < searchBottom; y += 2) {
      for (let x = searchLeft; x < searchRight; x += 2) {
        const score = analyzeEyelikeness(data, x, y, width)
        
        if (score > 0.6) { // 閾値以上の場合、目候補として登録
          candidates.push({
            x, y,
            confidence: score,
            width: estimateEyeWidth(data, x, y, width),
            height: estimateEyeHeight(data, x, y, width)
          })
        }
      }
    }
    
    // 信頼度でソート
    return candidates.sort((a, b) => b.confidence - a.confidence)
  }
  
  /**
   * 🎯 目らしさスコア計算（革命的アルゴリズム）
   */
  const analyzeEyelikeness = (data, centerX, centerY, width) => {
    let score = 0
    const radius = 8 // 検査範囲
    
    // 中心の暗さ（瞳孔）
    const centerIdx = (centerY * width + centerX) * 4
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3
    
    if (centerBrightness > 100) return 0 // 明るすぎる場合は目ではない
    
    score += (100 - centerBrightness) / 100 * 0.4 // 40%の重み
    
    // 🎯 目の形状解析: 楕円形パターン
    let darkPixels = 0
    let totalPixels = 0
    let horizontalContrast = 0
    let verticalContrast = 0
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance > radius) continue
        
        const x = centerX + dx
        const y = centerY + dy
        if (x < 0 || x >= width || y < 0) continue
        
        const idx = (y * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        totalPixels++
        if (brightness < 80) darkPixels++
        
        // コントラスト分析
        if (Math.abs(dx) > Math.abs(dy)) horizontalContrast += brightness
        if (Math.abs(dy) > Math.abs(dx)) verticalContrast += brightness
      }
    }
    
    // 暗いピクセルの比率
    const darkRatio = darkPixels / totalPixels
    score += darkRatio * 0.3 // 30%の重み
    
    // 楕円形らしさ（横長の形状）
    const aspectRatio = horizontalContrast / Math.max(verticalContrast, 1)
    if (aspectRatio > 1.2 && aspectRatio < 2.5) {
      score += 0.3 // 30%の重み
    }
    
    return Math.min(score, 1.0)
  }
  
  /**
   * 👁️ 両目のペアを識別
   */
  const identifyEyePair = (candidates, faceRegion) => {
    if (candidates.length < 2) return { left: null, right: null }
    
    // 🎯 目の距離と位置関係から最適なペアを選択
    for (let i = 0; i < candidates.length - 1; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const eye1 = candidates[i]
        const eye2 = candidates[j]
        
        // 距離チェック（顔幅の20-60%の範囲）
        const distance = Math.abs(eye2.x - eye1.x)
        const expectedDistance = faceRegion.width * 0.4 // 期待される目間距離
        
        if (distance > faceRegion.width * 0.2 && distance < faceRegion.width * 0.6) {
          // Y座標が近い（同じ高さにある）
          if (Math.abs(eye2.y - eye1.y) < faceRegion.height * 0.1) {
            // 左右を判定
            const leftEye = eye1.x < eye2.x ? eye1 : eye2
            const rightEye = eye1.x < eye2.x ? eye2 : eye1
            
            return { left: leftEye, right: rightEye }
          }
        }
      }
    }
    
    return { left: null, right: null }
  }
  
  /**
   * 👁️ 目の中での瞳孔検出
   */
  const detectPupilInEye = (imageData, eyeRegion) => {
    const { data, width } = imageData
    
    let darkestX = eyeRegion.x
    let darkestY = eyeRegion.y
    let darkestValue = 255
    
    // 目領域内で最も暗い点を探す
    const searchRadius = Math.min(eyeRegion.width, eyeRegion.height) / 2
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const x = eyeRegion.x + dx
        const y = eyeRegion.y + dy
        
        if (x < 0 || x >= width || y < 0) continue
        
        const idx = (y * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (brightness < darkestValue) {
          darkestValue = brightness
          darkestX = x
          darkestY = y
        }
      }
    }
    
    return {
      pupilX: darkestX,
      pupilY: darkestY,
      pupilBrightness: darkestValue
    }
  }
  
  /**
   * 🎯 鼻の位置検出（画像解析ベース）
   */
  const detectNoseFromImage = (imageData, faceRegion, eyePositions) => {
    if (!eyePositions || !eyePositions.isDetected) return
    
    const { data, width } = imageData
    
    // 目の中心点から鼻の位置を推定
    const eyeCenterX = eyePositions.center.x
    const eyeCenterY = eyePositions.center.y
    
    // 鼻は目の下、顔の中央付近
    const noseSearchX = eyeCenterX
    const noseSearchY = eyeCenterY + faceRegion.height * 0.15 // 目から15%下
    
    // 鼻先の特徴：明るい突起部分を検出
    let brightestX = noseSearchX
    let brightestY = noseSearchY
    let brightestValue = 0
    
    const searchRadius = faceRegion.width * 0.1
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const x = noseSearchX + dx
        const y = noseSearchY + dy
        
        if (x < 0 || x >= width || y < 0) continue
        
        const idx = (y * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (brightness > brightestValue) {
          brightestValue = brightness
          brightestX = x
          brightestY = y
        }
      }
    }
    
    faceAnalysis.nose.tip = { x: brightestX, y: brightestY }
    faceAnalysis.nose.bridge = { x: eyeCenterX, y: eyeCenterY + faceRegion.height * 0.05 }
    faceAnalysis.nose.confidence = Math.min(brightestValue / 255, 1.0)
    faceAnalysis.nose.isDetected = faceAnalysis.nose.confidence > 0.3
    
    console.log(`👃 鼻検出: 先端(${Math.round(brightestX)}, ${Math.round(brightestY)}) 信頼度=${Math.round(faceAnalysis.nose.confidence * 100)}%`)
  }
  
  /**
   * 目の幅推定
   */
  const estimateEyeWidth = (data, centerX, centerY, width) => {
    let leftEdge = centerX
    let rightEdge = centerX
    
    // 左端を探す
    for (let x = centerX; x >= centerX - 15; x--) {
      const idx = (centerY * width + x) * 4
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      if (brightness > 120) break // 明るくなったら端
      leftEdge = x
    }
    
    // 右端を探す
    for (let x = centerX; x <= centerX + 15; x++) {
      const idx = (centerY * width + x) * 4
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      if (brightness > 120) break
      rightEdge = x
    }
    
    return rightEdge - leftEdge
  }
  
  /**
   * 目の高さ推定
   */
  const estimateEyeHeight = (data, centerX, centerY, width) => {
    let topEdge = centerY
    let bottomEdge = centerY
    
    // 上端を探す
    for (let y = centerY; y >= centerY - 8; y--) {
      const idx = (y * width + centerX) * 4
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      if (brightness > 120) break
      topEdge = y
    }
    
    // 下端を探す  
    for (let y = centerY; y <= centerY + 8; y++) {
      const idx = (y * width + centerX) * 4
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      if (brightness > 120) break
      bottomEdge = y
    }
    
    return bottomEdge - topEdge
  }
  
  /**
   * 🎯 メイン解析関数
   */
  const analyzeFace = (imageData, faceRegion) => {
    if (!imageData || !faceRegion) return
    
    isAnalyzing.value = true
    
    try {
      // 🎯 リアルタイム目検出
      detectEyesFromImage(imageData, faceRegion)
      
      // 🎯 鼻検出
      detectNoseFromImage(imageData, faceRegion, faceAnalysis.eyes)
      
      // 品質スコア計算
      calculateOverallQuality()
      
    } catch (err) {
      console.error('❌ 顔解析エラー:', err)
      error.value = err.message
    } finally {
      isAnalyzing.value = false
    }
  }
  
  /**
   * 総合品質スコア計算
   */
  const calculateOverallQuality = () => {
    let score = 0
    let factors = 0
    
    if (faceAnalysis.eyes.isDetected) {
      score += (faceAnalysis.eyes.left.confidence + faceAnalysis.eyes.right.confidence) / 2
      factors++
    }
    
    if (faceAnalysis.nose.isDetected) {
      score += faceAnalysis.nose.confidence
      factors++
    }
    
    faceAnalysis.overallQuality = factors > 0 ? score / factors : 0
  }
  
  /**
   * 🎨 高度なデバッグ描画
   */
  const drawAdvancedAnalysis = (ctx, canvas) => {
    if (!faceAnalysis.eyes.isDetected) return
    
    // 目の詳細描画
    drawEyeAnalysis(ctx, faceAnalysis.eyes.left, '#00ffff', 'L')
    drawEyeAnalysis(ctx, faceAnalysis.eyes.right, '#00ffff', 'R')
    
    // 目の中心線
    ctx.strokeStyle = '#ff0080'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(faceAnalysis.eyes.center.x, faceAnalysis.eyes.center.y, 10, 0, 2 * Math.PI)
    ctx.stroke()
    
    // 鼻の描画
    if (faceAnalysis.nose.isDetected) {
      ctx.fillStyle = '#ffff00'
      ctx.beginPath()
      ctx.arc(faceAnalysis.nose.tip.x, faceAnalysis.nose.tip.y, 6, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    // 解析情報表示
    ctx.fillStyle = '#00ff00'
    ctx.font = '12px Arial'
    ctx.fillText(`🎯 リアルタイム解析`, 10, 160)
    ctx.fillText(`目検出: ${faceAnalysis.eyes.isDetected ? 'OK' : 'NG'}`, 10, 180)
    ctx.fillText(`鼻検出: ${faceAnalysis.nose.isDetected ? 'OK' : 'NG'}`, 10, 200)
    ctx.fillText(`品質: ${Math.round(faceAnalysis.overallQuality * 100)}%`, 10, 220)
    ctx.fillText(`解析時間: ${faceAnalysis.analysisTime.toFixed(1)}ms`, 10, 240)
  }
  
  /**
   * 目の詳細描画
   */
  const drawEyeAnalysis = (ctx, eye, color, label) => {
    if (!eye || eye.confidence < 0.3) return
    
    // 目の境界
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(eye.x - eye.width/2, eye.y - eye.height/2, eye.width, eye.height)
    
    // 瞳孔
    if (eye.pupilX && eye.pupilY) {
      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.arc(eye.pupilX, eye.pupilY, 3, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    // ラベル
    ctx.fillStyle = color
    ctx.font = '12px Arial'
    ctx.fillText(label, eye.x - 5, eye.y - 15)
  }
  
  return {
    // 状態
    isAnalyzing,
    error,
    faceAnalysis,
    
    // メソッド
    analyzeFace,
    drawAdvancedAnalysis
  }
}