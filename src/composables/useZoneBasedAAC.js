import { ref, reactive, computed, watch } from 'vue'

/**
 * 9ゾーンベースAAC入力システム
 * 顔の向きに基づく確実な選択システム - WebGazer.jsの完全代替
 */
export function useZoneBasedAAC(faceTracker) {
  // 状態管理
  const currentZone = ref(null)
  const isSelecting = ref(false)
  const selectedZone = ref(null)
  const dwellProgress = ref(0)
  
  // 9ゾーン設定（より応答性重視）
  const zoneConfig = reactive({
    gridSize: 3,           // 3x3グリッド
    dwellTime: 1000,       // ドウェル時間短縮（1500 → 1000ms）
    confidenceThreshold: 0.4,  // 閾値緩和（0.7 → 0.4）
    stabilityThreshold: 200,   // 安定性判定短縮（300 → 200ms）
    smoothing: true,       // スムージング有効
    visualFeedback: true   // 視覚フィードバック有効
  })
  
  // ゾーン定義（3x3グリッド）
  const zones = computed(() => {
    const cols = zoneConfig.gridSize
    const rows = zoneConfig.gridSize
    const zoneWidth = 100 / cols
    const zoneHeight = 100 / rows
    
    const zoneList = []
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const zoneId = row * cols + col
        const zoneName = getZoneName(row, col)
        
        zoneList.push({
          id: zoneId,
          name: zoneName,
          row,
          col,
          x: col * zoneWidth,      // X位置（%）
          y: row * zoneHeight,     // Y位置（%）
          width: zoneWidth,        // 幅（%）
          height: zoneHeight,      // 高さ（%）
          centerX: col * zoneWidth + zoneWidth / 2,   // 中心X（%）
          centerY: row * zoneHeight + zoneHeight / 2, // 中心Y（%）
          active: false,           // アクティブ状態
          hovered: false,          // ホバー状態
          dwellStart: null         // ドウェル開始時刻
        })
      }
    }
    
    return zoneList
  })
  
  /**
   * ゾーン名を取得
   */
  const getZoneName = (row, col) => {
    const rowNames = ['上', '中', '下']
    const colNames = ['左', '中央', '右']
    
    if (row === 1 && col === 1) {
      return '中央'
    }
    
    return `${rowNames[row]}${colNames[col]}`
  }
  
  // 選択履歴
  const selectionHistory = reactive([])
  
  // パフォーマンス統計
  const stats = reactive({
    totalSelections: 0,
    avgSelectionTime: 0,
    accuracyRate: 0,
    zoneHitCounts: {}
  })
  
  /**
   * 顔の向きからゾーンを推定
   */
  const detectTargetZone = () => {
    if (!faceTracker || !faceTracker.faceDetected.value) {
      return null
    }
    
    const faceData = faceTracker.faceData
    
    // 信頼度チェック
    if (faceData.confidence < zoneConfig.confidenceThreshold) {
      return null
    }
    
    // 頭部姿勢から画面ゾーンをマッピング
    const { yaw, pitch } = faceData.headPose
    
    // Yaw（左右）→ 列マッピング（より敏感に）
    let targetCol = 1 // デフォルト中央
    if (yaw < -8) {  // 感度UP（-15 → -8）
      targetCol = 2 // 右を見る → 右列
    } else if (yaw > 8) { // 感度UP（15 → 8）
      targetCol = 0 // 左を見る → 左列
    }
    
    // Pitch（上下）→ 行マッピング（より敏感に）
    let targetRow = 1 // デフォルト中央
    if (pitch < -6) { // 感度UP（-10 → -6）
      targetRow = 0 // 上を見る → 上行
    } else if (pitch > 6) { // 感度UP（10 → 6）
      targetRow = 2 // 下を見る → 下行
    }
    
    // ゾーンIDを計算
    const zoneId = targetRow * zoneConfig.gridSize + targetCol
    
    // デバッグログ（開発時）
    if (Date.now() % 2000 < 50) { // 2秒に1回
      console.log(`🎯 ゾーン検出: Yaw=${Math.round(yaw)}°, Pitch=${Math.round(pitch)}°, TargetZone=${zoneId}`)
    }
    
    return zones.value.find(zone => zone.id === zoneId)
  }
  
  /**
   * ゾーン選択処理のメインループ
   */
  const processZoneSelection = () => {
    const targetZone = detectTargetZone()
    
    // ゾーン変更検出
    if (targetZone?.id !== currentZone.value?.id) {
      resetDwellSelection()
      currentZone.value = targetZone
      
      if (targetZone) {
        startDwellTimer(targetZone)
      }
    }
    
    // ドウェル進行処理
    if (currentZone.value && isSelecting.value) {
      updateDwellProgress()
    }
  }
  
  /**
   * ドウェルタイマー開始
   */
  const startDwellTimer = (zone) => {
    if (!zone) return
    
    isSelecting.value = true
    zone.dwellStart = Date.now()
    zone.hovered = true
    
    // 他のゾーンのホバー状態をクリア
    zones.value.forEach(z => {
      if (z.id !== zone.id) {
        z.hovered = false
        z.dwellStart = null
      }
    })
    
    console.log(`🎯 ゾーン選択開始: ${zone.name}`)
  }
  
  /**
   * ドウェル進行状況更新
   */
  const updateDwellProgress = () => {
    if (!currentZone.value || !currentZone.value.dwellStart) {
      return
    }
    
    const elapsed = Date.now() - currentZone.value.dwellStart
    const progress = Math.min(elapsed / zoneConfig.dwellTime, 1)
    
    dwellProgress.value = progress
    
    // 選択完了判定
    if (progress >= 1) {
      completeZoneSelection(currentZone.value)
    }
  }
  
  /**
   * ゾーン選択完了
   */
  const completeZoneSelection = (zone) => {
    if (!zone) return
    
    selectedZone.value = zone
    zone.active = true
    
    // 選択履歴に追加
    selectionHistory.push({
      zoneId: zone.id,
      zoneName: zone.name,
      timestamp: Date.now(),
      dwellTime: Date.now() - zone.dwellStart
    })
    
    // 統計更新
    updateStats(zone)
    
    console.log(`✅ ゾーン選択完了: ${zone.name}`)
    
    // フィードバック
    provideFeedback(zone)
    
    // 選択状態リセット
    setTimeout(() => {
      resetSelection()
    }, 500)
  }
  
  /**
   * 選択フィードバック提供
   */
  const provideFeedback = (zone) => {
    // 視覚フィードバック
    if (zoneConfig.visualFeedback) {
      zone.active = true
      setTimeout(() => {
        zone.active = false
      }, 300)
    }
    
    // 音声フィードバック（オプション）
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(zone.name)
      utterance.lang = 'ja-JP'
      utterance.rate = 1.2
      utterance.volume = 0.5
      speechSynthesis.speak(utterance)
    }
    
    // 触覚フィードバック（可能な場合）
    if ('vibrate' in navigator) {
      navigator.vibrate(100)
    }
  }
  
  /**
   * ドウェル選択リセット
   */
  const resetDwellSelection = () => {
    isSelecting.value = false
    dwellProgress.value = 0
    
    zones.value.forEach(zone => {
      zone.hovered = false
      zone.dwellStart = null
    })
  }
  
  /**
   * 選択状態リセット
   */
  const resetSelection = () => {
    selectedZone.value = null
    resetDwellSelection()
    
    zones.value.forEach(zone => {
      zone.active = false
    })
  }
  
  /**
   * 統計情報更新
   */
  const updateStats = (zone) => {
    stats.totalSelections++
    
    // ゾーン別ヒット数
    if (!stats.zoneHitCounts[zone.id]) {
      stats.zoneHitCounts[zone.id] = 0
    }
    stats.zoneHitCounts[zone.id]++
    
    // 平均選択時間
    const dwellTime = Date.now() - zone.dwellStart
    stats.avgSelectionTime = ((stats.avgSelectionTime * (stats.totalSelections - 1)) + dwellTime) / stats.totalSelections
  }
  
  /**
   * 設定更新
   */
  const updateConfig = (newConfig) => {
    Object.assign(zoneConfig, newConfig)
    console.log('⚙️ ゾーン設定更新:', zoneConfig)
  }
  
  /**
   * ゾーンをIDで取得
   */
  const getZoneById = (zoneId) => {
    return zones.value.find(zone => zone.id === zoneId)
  }
  
  /**
   * ゾーンを座標で取得
   */
  const getZoneByCoordinates = (x, y) => {
    return zones.value.find(zone => {
      return x >= zone.x && x < zone.x + zone.width &&
             y >= zone.y && y < zone.y + zone.height
    })
  }
  
  /**
   * デバッグ情報取得
   */
  const getDebugInfo = () => {
    return {
      currentZone: currentZone.value,
      isSelecting: isSelecting.value,
      dwellProgress: dwellProgress.value,
      faceData: faceTracker?.faceData,
      zones: zones.value,
      stats: stats,
      history: selectionHistory.slice(-10) // 最新10件
    }
  }
  
  // ウォッチャー
  watch(() => faceTracker?.faceDetected.value, (detected) => {
    if (!detected) {
      resetDwellSelection()
    }
  })
  
  return {
    // 状態
    currentZone,
    isSelecting,
    selectedZone,
    dwellProgress,
    zones,
    zoneConfig,
    selectionHistory,
    stats,
    
    // メソッド
    processZoneSelection,
    resetSelection,
    updateConfig,
    getZoneById,
    getZoneByCoordinates,
    getDebugInfo,
    
    // 内部メソッド（デバッグ用）
    detectTargetZone,
    startDwellTimer,
    completeZoneSelection
  }
}