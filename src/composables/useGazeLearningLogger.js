import { ref, reactive } from 'vue'

/**
 * 視線学習データ収集システム
 * 患者さんのための革命的プロダクト開発用
 * 
 * 目的: あなたの視線パターンを学習し、
 *      将来の軽量AIモデルの訓練データを蓄積
 */
export function useGazeLearningLogger() {
  // 学習データ状態
  const isLogging = ref(false)
  const loggedSessions = ref(0)
  const totalDataPoints = ref(0)
  
  // 現在の学習セッション
  const currentSession = reactive({
    sessionId: null,
    startTime: null,
    dataPoints: [],
    lastIntention: null
  })
  
  // 統計情報
  const stats = reactive({
    accuracyRate: 0,
    mostFrequentZone: null,
    averageGazeTime: 0,
    dataQuality: 0
  })
  
  /**
   * 学習データ収集開始
   */
  const startLogging = () => {
    isLogging.value = true
    currentSession.sessionId = `session_${Date.now()}`
    currentSession.startTime = Date.now()
    currentSession.dataPoints = []
    
    console.log('🎯 学習データ収集開始 - 患者さんのために！')
    console.log(`📊 セッションID: ${currentSession.sessionId}`)
  }
  
  /**
   * 学習データ収集停止
   */
  const stopLogging = () => {
    if (!isLogging.value) return
    
    isLogging.value = false
    
    // セッションデータを保存
    saveSessionData()
    
    // セッション統計更新
    loggedSessions.value++
    totalDataPoints.value += currentSession.dataPoints.length
    
    console.log(`✅ セッション完了: ${currentSession.dataPoints.length}件のデータを収集`)
    
    // セッションリセット
    currentSession.sessionId = null
    currentSession.startTime = null
    currentSession.dataPoints = []
  }
  
  /**
   * 視線イベントの記録
   * @param {Object} gazeData - 現在の視線データ
   * @param {Object} faceData - 顔検出データ  
   * @param {Number} detectedZone - システムが検出したゾーン
   * @param {Number} intendedZone - 実際に見ていたゾーン（手動入力）
   */
  const logGazeEvent = (gazeData, faceData, detectedZone, intendedZone = null) => {
    if (!isLogging.value) return
    
    const timestamp = Date.now()
    
    const dataPoint = {
      // タイムスタンプ
      timestamp,
      sessionTime: timestamp - currentSession.startTime,
      
      // 視線データ（現在のシステム）
      gazePoint: gazeData ? {
        x: gazeData.x,
        y: gazeData.y,
        confidence: gazeData.confidence
      } : null,
      
      // 顔検出データ（OpenCV）
      faceData: {
        headPose: { ...faceData.headPose },
        facePosition: {
          x: faceData.x,
          y: faceData.y,
          width: faceData.width,
          height: faceData.height
        },
        confidence: faceData.confidence,
        landmarks: faceData.landmarks ? { ...faceData.landmarks } : null
      },
      
      // ゾーン情報
      detectedZone,        // システムの判定
      intendedZone,        // 実際の意図（ラベル）
      isCorrect: intendedZone !== null ? (detectedZone === intendedZone) : null,
      
      // 環境情報
      environment: {
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        userAgent: navigator.userAgent.substring(0, 100), // プライバシー考慮で短縮
        timestamp: new Date().toISOString()
      }
    }
    
    currentSession.dataPoints.push(dataPoint)
    
    // リアルタイム統計更新
    updateRealtimeStats()
    
    // 定期的にローカルストレージに保存（データ失存防止）
    if (currentSession.dataPoints.length % 10 === 0) {
      saveSessionData()
    }
  }
  
  /**
   * 意図修正（ユーザーが手動で実際の意図を入力）
   * @param {Number} actualZone - 実際に見ていたゾーン
   */
  const correctLastIntention = (actualZone) => {
    if (currentSession.dataPoints.length === 0) return
    
    const lastDataPoint = currentSession.dataPoints[currentSession.dataPoints.length - 1]
    lastDataPoint.intendedZone = actualZone
    lastDataPoint.isCorrect = lastDataPoint.detectedZone === actualZone
    lastDataPoint.correctedManually = true
    lastDataPoint.correctionTime = Date.now()
    
    console.log(`🔧 意図修正: 検出=${lastDataPoint.detectedZone} → 実際=${actualZone}`)
    
    // 統計更新
    updateRealtimeStats()
    
    // 即座に保存
    saveSessionData()
  }
  
  /**
   * 意図を事前に設定（次のガゼポイントの意図を予告）
   * @param {Number} intendedZone - これから見るゾーン
   */
  const setNextIntention = (intendedZone) => {
    currentSession.lastIntention = intendedZone
    console.log(`👁️ 次の意図設定: ゾーン${intendedZone}を見ます`)
  }
  
  /**
   * リアルタイム統計更新
   */
  const updateRealtimeStats = () => {
    const validDataPoints = currentSession.dataPoints.filter(dp => dp.isCorrect !== null)
    
    if (validDataPoints.length === 0) return
    
    // 精度計算
    const correctPredictions = validDataPoints.filter(dp => dp.isCorrect).length
    stats.accuracyRate = Math.round((correctPredictions / validDataPoints.length) * 100)
    
    // 最頻ゾーン計算
    const zoneCounts = {}
    validDataPoints.forEach(dp => {
      const zone = dp.intendedZone
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1
    })
    
    const maxZone = Object.keys(zoneCounts).reduce((a, b) => 
      zoneCounts[a] > zoneCounts[b] ? a : b, 0)
    stats.mostFrequentZone = parseInt(maxZone)
    
    // データ品質スコア（0-100）
    const qualityFactors = [
      validDataPoints.length > 10 ? 25 : (validDataPoints.length / 10) * 25, // データ量
      stats.accuracyRate > 70 ? 25 : (stats.accuracyRate / 70) * 25,         // 精度
      validDataPoints.some(dp => dp.faceData.confidence > 0.8) ? 25 : 0,     // 顔検出品質
      validDataPoints.some(dp => dp.gazePoint?.confidence > 0.7) ? 25 : 0     // 視線品質
    ]
    
    stats.dataQuality = Math.round(qualityFactors.reduce((a, b) => a + b, 0))
  }
  
  /**
   * セッションデータの永続化
   */
  const saveSessionData = () => {
    try {
      const sessionData = {
        sessionId: currentSession.sessionId,
        startTime: currentSession.startTime,
        endTime: Date.now(),
        dataPoints: currentSession.dataPoints,
        stats: { ...stats }
      }
      
      // ローカルストレージに保存
      const existingSessions = JSON.parse(localStorage.getItem('gazeLearningSessions') || '[]')
      
      // 既存セッションの更新または新規追加
      const existingIndex = existingSessions.findIndex(s => s.sessionId === sessionData.sessionId)
      if (existingIndex >= 0) {
        existingSessions[existingIndex] = sessionData
      } else {
        existingSessions.push(sessionData)
      }
      
      // 最新100セッションのみ保持（ストレージ容量制限）
      const recentSessions = existingSessions.slice(-100)
      
      localStorage.setItem('gazeLearningSessions', JSON.stringify(recentSessions))
      
      console.log(`💾 学習データ保存完了: ${sessionData.dataPoints.length}件`)
      
    } catch (err) {
      console.error('❌ 学習データ保存エラー:', err)
    }
  }
  
  /**
   * 学習データのエクスポート（将来のAIモデル訓練用）
   * @param {String} format - 'json' | 'csv'
   */
  const exportLearningData = (format = 'json') => {
    try {
      const allSessions = JSON.parse(localStorage.getItem('gazeLearningSessions') || '[]')
      
      if (format === 'csv') {
        // CSV形式でエクスポート
        const csvData = convertToCSV(allSessions)
        downloadFile(csvData, 'gaze_learning_data.csv', 'text/csv')
      } else {
        // JSON形式でエクスポート
        const jsonData = JSON.stringify(allSessions, null, 2)
        downloadFile(jsonData, 'gaze_learning_data.json', 'application/json')
      }
      
      console.log(`📤 学習データエクスポート完了: ${allSessions.length}セッション`)
      
    } catch (err) {
      console.error('❌ エクスポートエラー:', err)
    }
  }
  
  /**
   * 学習データの統計サマリー取得
   */
  const getLearningStatistics = () => {
    try {
      const allSessions = JSON.parse(localStorage.getItem('gazeLearningSessions') || '[]')
      
      const totalDataPoints = allSessions.reduce((sum, session) => sum + session.dataPoints.length, 0)
      const totalSessions = allSessions.length
      
      let totalCorrect = 0
      let totalLabeled = 0
      
      allSessions.forEach(session => {
        session.dataPoints.forEach(dp => {
          if (dp.isCorrect !== null) {
            totalLabeled++
            if (dp.isCorrect) totalCorrect++
          }
        })
      })
      
      return {
        totalSessions,
        totalDataPoints,
        totalLabeled,
        overallAccuracy: totalLabeled > 0 ? Math.round((totalCorrect / totalLabeled) * 100) : 0,
        averageDataPointsPerSession: totalSessions > 0 ? Math.round(totalDataPoints / totalSessions) : 0,
        dataQuality: stats.dataQuality
      }
      
    } catch (err) {
      console.error('❌ 統計取得エラー:', err)
      return null
    }
  }
  
  /**
   * CSV変換ヘルパー
   */
  const convertToCSV = (sessions) => {
    const headers = [
      'sessionId', 'timestamp', 'headPose_yaw', 'headPose_pitch', 'headPose_roll',
      'faceX', 'faceY', 'faceWidth', 'faceHeight', 'faceConfidence',
      'gazeX', 'gazeY', 'gazeConfidence', 'detectedZone', 'intendedZone', 'isCorrect'
    ]
    
    let csvContent = headers.join(',') + '\n'
    
    sessions.forEach(session => {
      session.dataPoints.forEach(dp => {
        const row = [
          session.sessionId,
          dp.timestamp,
          dp.faceData.headPose.yaw || '',
          dp.faceData.headPose.pitch || '',
          dp.faceData.headPose.roll || '',
          dp.faceData.facePosition.x || '',
          dp.faceData.facePosition.y || '',
          dp.faceData.facePosition.width || '',
          dp.faceData.facePosition.height || '',
          dp.faceData.confidence || '',
          dp.gazePoint?.x || '',
          dp.gazePoint?.y || '',
          dp.gazePoint?.confidence || '',
          dp.detectedZone || '',
          dp.intendedZone || '',
          dp.isCorrect || ''
        ]
        csvContent += row.join(',') + '\n'
      })
    })
    
    return csvContent
  }
  
  /**
   * ファイルダウンロードヘルパー
   */
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
  
  // 初期化時に既存データを読み込み
  const loadExistingData = () => {
    try {
      const existingSessions = JSON.parse(localStorage.getItem('gazeLearningSessions') || '[]')
      loggedSessions.value = existingSessions.length
      totalDataPoints.value = existingSessions.reduce((sum, session) => sum + session.dataPoints.length, 0)
    } catch (err) {
      console.error('❌ 既存データ読み込みエラー:', err)
    }
  }
  
  // 初期化
  loadExistingData()
  
  return {
    // 状態
    isLogging,
    loggedSessions,
    totalDataPoints,
    currentSession,
    stats,
    
    // メソッド
    startLogging,
    stopLogging,
    logGazeEvent,
    correctLastIntention,
    setNextIntention,
    exportLearningData,
    getLearningStatistics
  }
}