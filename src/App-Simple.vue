<template>
  <div class="simple-aac-app">
    <!-- ヘッダー -->
    <header class="app-header">
      <h1>🎯 シンプル視線AAC - 即座使用可能</h1>
      <div class="status-bar">
        <div class="status-indicator status-ready">
          {{ currentMode }}モード
        </div>
        <div class="instructions">
          {{ instructions }}
        </div>
      </div>
    </header>

    <!-- メインエリア: 9ゾーンインターフェース -->
    <main class="zone-interface">
      <div class="zone-grid">
        <div 
          v-for="zone in zones"
          :key="zone.id"
          class="zone-cell"
          :class="{
            'zone-hovered': hoveredZone === zone.id,
            'zone-selected': selectedZone === zone.id,
            'zone-dwell': dwellingZone === zone.id
          }"
          @mouseenter="startHover(zone.id)"
          @mouseleave="endHover()"
          @click="selectZone(zone.id)"
        >
          <div class="zone-content">
            <div class="zone-name">{{ zone.name }}</div>
            <div class="zone-number">{{ zone.id + 1 }}</div>
            
            <!-- ドウェル進行バー -->
            <div 
              v-if="dwellingZone === zone.id && dwellProgress > 0"
              class="dwell-progress"
              :style="{ width: `${dwellProgress}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 中央表示エリア -->
      <div class="center-display" v-if="selectedZone !== null">
        <h2>選択されたゾーン</h2>
        <div class="selected-zone-info">
          <div class="zone-name-large">{{ zones[selectedZone].name }}</div>
          <div class="zone-details">
            ゾーン {{ selectedZone + 1 }} | 選択時刻: {{ selectionTime }}
          </div>
          <button @click="clearSelection" class="clear-btn">
            クリア
          </button>
        </div>
      </div>

      <!-- ヘルプエリア -->
      <div class="help-section">
        <h3>💡 使用方法</h3>
        <div class="help-grid">
          <div class="help-item">
            <strong>🖱️ マウス:</strong> ホバーで1.5秒待機で選択
          </div>
          <div class="help-item">
            <strong>⌨️ キーボード:</strong> 1-9キーで直接選択
          </div>
          <div class="help-item">
            <strong>📱 タッチ:</strong> タップで即座選択
          </div>
          <div class="help-item">
            <strong>🔧 設定:</strong> 下のスライダーで調整
          </div>
        </div>
      </div>
    </main>

    <!-- 設定パネル -->
    <aside class="settings-panel">
      <h3>⚙️ 設定</h3>
      
      <div class="setting-group">
        <label>
          ドウェル時間: {{ dwellTime }}ms
          <input 
            type="range" 
            min="500" 
            max="3000" 
            step="100"
            v-model="dwellTime"
          >
        </label>
      </div>

      <div class="setting-group">
        <label>
          入力モード:
          <select v-model="inputMode">
            <option value="mouse">マウス + ドウェル</option>
            <option value="keyboard">キーボード</option>
            <option value="touch">タッチ</option>
            <option value="hybrid">ハイブリッド</option>
          </select>
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input type="checkbox" v-model="soundEnabled">
          音声フィードバック
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input type="checkbox" v-model="vibrationEnabled">
          触覚フィードバック (対応デバイス)
        </label>
      </div>

      <!-- 統計 -->
      <div class="stats-section">
        <h4>📊 使用統計</h4>
        <div class="stat-item">
          総選択回数: {{ stats.totalSelections }}
        </div>
        <div class="stat-item">
          平均選択時間: {{ Math.round(stats.avgSelectionTime) }}ms
        </div>
        <div class="stat-item">
          最後の選択: {{ stats.lastSelection || 'なし' }}
        </div>
      </div>
    </aside>

    <!-- 選択履歴 -->
    <div class="history-panel">
      <h3>📋 選択履歴</h3>
      <div class="history-list">
        <div 
          v-for="(item, index) in selectionHistory.slice(-5)" 
          :key="index"
          class="history-item"
        >
          {{ item.zoneName }} - {{ item.time }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

// 状態管理
const hoveredZone = ref(null)
const selectedZone = ref(null)
const dwellingZone = ref(null)
const dwellProgress = ref(0)
const dwellTime = ref(1500) // ms
const inputMode = ref('hybrid')
const soundEnabled = ref(true)
const vibrationEnabled = ref(true)

// 9ゾーン定義
const zones = reactive([
  { id: 0, name: '左上', row: 0, col: 0 },
  { id: 1, name: '上中央', row: 0, col: 1 },
  { id: 2, name: '右上', row: 0, col: 2 },
  { id: 3, name: '左中央', row: 1, col: 0 },
  { id: 4, name: '中央', row: 1, col: 1 },
  { id: 5, name: '右中央', row: 1, col: 2 },
  { id: 6, name: '左下', row: 2, col: 0 },
  { id: 7, name: '下中央', row: 2, col: 1 },
  { id: 8, name: '右下', row: 2, col: 2 }
])

// 統計
const stats = reactive({
  totalSelections: 0,
  avgSelectionTime: 0,
  lastSelection: null
})

// 選択履歴
const selectionHistory = reactive([])

// 計算されたプロパティ
const currentMode = computed(() => {
  switch (inputMode.value) {
    case 'mouse': return 'マウス'
    case 'keyboard': return 'キーボード'
    case 'touch': return 'タッチ'
    case 'hybrid': return 'ハイブリッド'
    default: return 'シンプル'
  }
})

const instructions = computed(() => {
  switch (inputMode.value) {
    case 'mouse': return 'マウスを1.5秒ホバーで選択'
    case 'keyboard': return '1-9キーで直接選択'
    case 'touch': return 'タップして選択'
    case 'hybrid': return 'マウス・キーボード・タッチ全て使用可能'
    default: return '複数の入力方法が使用可能'
  }
})

const selectionTime = computed(() => {
  if (selectedZone.value !== null && selectionHistory.length > 0) {
    return selectionHistory[selectionHistory.length - 1].time
  }
  return ''
})

// ドウェルタイマー
let dwellTimer = null
let dwellStartTime = null

/**
 * ホバー開始
 */
const startHover = (zoneId) => {
  if (inputMode.value !== 'mouse' && inputMode.value !== 'hybrid') return
  
  hoveredZone.value = zoneId
  dwellingZone.value = zoneId
  dwellStartTime = Date.now()
  
  // ドウェルタイマー開始
  dwellTimer = setInterval(() => {
    if (dwellingZone.value === zoneId) {
      const elapsed = Date.now() - dwellStartTime
      dwellProgress.value = Math.min((elapsed / dwellTime.value) * 100, 100)
      
      if (dwellProgress.value >= 100) {
        selectZone(zoneId)
        endHover()
      }
    }
  }, 50)
}

/**
 * ホバー終了
 */
const endHover = () => {
  hoveredZone.value = null
  dwellingZone.value = null
  dwellProgress.value = 0
  
  if (dwellTimer) {
    clearInterval(dwellTimer)
    dwellTimer = null
  }
}

/**
 * ゾーン選択
 */
const selectZone = (zoneId) => {
  const zone = zones[zoneId]
  selectedZone.value = zoneId
  
  // 統計更新
  stats.totalSelections++
  stats.lastSelection = zone.name
  
  // 選択時間計算
  const selectionDuration = dwellStartTime ? Date.now() - dwellStartTime : 0
  stats.avgSelectionTime = ((stats.avgSelectionTime * (stats.totalSelections - 1)) + selectionDuration) / stats.totalSelections
  
  // 履歴追加
  selectionHistory.push({
    zoneId,
    zoneName: zone.name,
    time: new Date().toLocaleTimeString(),
    duration: selectionDuration
  })
  
  // フィードバック
  provideFeedback(zone.name)
  
  console.log(`✅ ゾーン選択: ${zone.name}`)
}

/**
 * 選択クリア
 */
const clearSelection = () => {
  selectedZone.value = null
  endHover()
}

/**
 * フィードバック提供
 */
const provideFeedback = (zoneName) => {
  // 音声フィードバック
  if (soundEnabled.value && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(zoneName)
    utterance.lang = 'ja-JP'
    utterance.rate = 1.2
    utterance.volume = 0.5
    speechSynthesis.speak(utterance)
  }
  
  // 触覚フィードバック
  if (vibrationEnabled.value && 'vibrate' in navigator) {
    navigator.vibrate(100)
  }
}

/**
 * キーボードイベントハンドラー
 */
const handleKeydown = (e) => {
  if (inputMode.value !== 'keyboard' && inputMode.value !== 'hybrid') return
  
  const key = parseInt(e.key)
  if (key >= 1 && key <= 9) {
    e.preventDefault()
    selectZone(key - 1)
  }
  
  if (e.key === 'Escape') {
    clearSelection()
  }
}

// イベントリスナー
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  console.log('🚀 シンプルAAC システム開始 - 即座使用可能！')
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  endHover()
})
</script>

<style scoped>
.simple-aac-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', Arial, sans-serif;
  padding: 1rem;
  display: grid;
  grid-template-areas: 
    "header header header"
    "zones zones settings"
    "zones zones history";
  grid-template-columns: 1fr 1fr 300px;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}

.app-header {
  grid-area: header;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  padding: 1rem 2rem;
  border-radius: 10px;
}

.app-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-indicator {
  background: #27ae60;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9rem;
}

.instructions {
  font-size: 1rem;
  opacity: 0.9;
}

.zone-interface {
  grid-area: zones;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 2rem;
  position: relative;
}

.zone-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 10px;
  height: 400px;
  margin-bottom: 2rem;
}

.zone-cell {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.zone-cell:hover,
.zone-cell.zone-hovered {
  background: rgba(52, 152, 219, 0.3);
  border-color: #3498db;
  transform: scale(1.05);
}

.zone-cell.zone-selected {
  background: rgba(46, 204, 113, 0.5);
  border-color: #2ecc71;
  animation: pulse 1s ease-in-out;
}

.zone-cell.zone-dwell {
  border-color: #f39c12;
  border-width: 3px;
}

.zone-content {
  text-align: center;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.zone-name {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.zone-number {
  font-size: 2rem;
  font-weight: bold;
  opacity: 0.7;
}

.dwell-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: #f39c12;
  transition: width 0.1s ease;
  border-radius: 0 0 8px 8px;
}

.center-display {
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1.5rem;
  margin-top: 1rem;
}

.zone-name-large {
  font-size: 2.5rem;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 1rem;
}

.zone-details {
  font-size: 1.1rem;
  opacity: 0.8;
  margin-bottom: 1rem;
}

.clear-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

.clear-btn:hover {
  background: #c0392b;
}

.help-section {
  margin-top: 2rem;
}

.help-section h3 {
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.help-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.help-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.settings-panel {
  grid-area: settings;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 1rem;
  height: fit-content;
}

.settings-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 0.5rem;
}

.setting-group {
  margin-bottom: 1rem;
}

.setting-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

input[type="range"], select {
  width: 100%;
  margin-top: 0.25rem;
}

input[type="checkbox"] {
  margin-right: 0.5rem;
}

.stats-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

.stats-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.stat-item {
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
  font-family: monospace;
}

.history-panel {
  grid-area: history;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 1rem;
  height: fit-content;
}

.history-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 0.5rem;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: 5px;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

@keyframes pulse {
  0% { transform: scale(1.05); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1.05); }
}

@media (max-width: 1200px) {
  .simple-aac-app {
    grid-template-areas:
      "header"
      "zones"
      "settings"
      "history";
    grid-template-columns: 1fr;
  }
  
  .help-grid {
    grid-template-columns: 1fr;
  }
}
</style>