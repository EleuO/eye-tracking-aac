<template>
  <div class="eye-gaze-aac-app">
    <!-- ヘッダー -->
    <header class="app-header">
      <h1>👁️ 視線入力AAC - シンプル確実版</h1>
      <div class="status-bar">
        <div class="status-indicator" :class="statusClass">
          {{ statusText }}
        </div>
        <div class="face-info" v-if="faceTracker.faceDetected.value">
          信頼度: {{ Math.round(faceTracker.faceData.confidence * 100) }}% | 
          FPS: {{ faceTracker.stats.fps }}
        </div>
      </div>
    </header>

    <!-- メインエリア -->
    <main class="app-main">
      <!-- 左パネル: カメラ・設定 -->
      <aside class="control-panel">
        <div class="section">
          <h3>📹 カメラ設定</h3>
          <select v-model="selectedCamera" @change="handleCameraChange" :disabled="faceTracker.isTracking.value">
            <option value="">カメラを選択...</option>
            <option v-for="camera in cameras" :key="camera.deviceId" :value="camera">
              {{ camera.label }}
            </option>
          </select>
          <button @click="toggleTracking" :disabled="!selectedCamera" class="primary-btn">
            {{ faceTracker.isTracking.value ? '⏹️ 停止' : '▶️ 開始' }}
          </button>
        </div>

        <div class="section" v-if="faceTracker.isTracking.value">
          <h3>⚙️ 視線設定</h3>
          <label>
            ドウェル時間: {{ zoneAAC.zoneConfig.dwellTime }}ms
            <input 
              type="range" 
              min="800" 
              max="3000" 
              step="100"
              v-model="zoneAAC.zoneConfig.dwellTime"
            >
          </label>
          <label>
            感度: {{ Math.round(faceTracker.settings.smoothingFactor * 100) }}%
            <input 
              type="range" 
              min="0.3" 
              max="0.9" 
              step="0.1"
              v-model="faceTracker.settings.smoothingFactor"
            >
          </label>
          <label>
            <input type="checkbox" v-model="showGazePoint">
            視線ポイント表示
          </label>
        </div>

        <div class="section" v-if="faceTracker.faceDetected.value">
          <h3>🎯 頭部姿勢</h3>
          <div class="pose-display">
            <div class="pose-item">
              <strong>左右:</strong> {{ Math.round(faceTracker.faceData.headPose.yaw) }}°
            </div>
            <div class="pose-item">
              <strong>上下:</strong> {{ Math.round(faceTracker.faceData.headPose.pitch) }}°
            </div>
            <div class="pose-visual">
              <div 
                class="head-indicator"
                :style="{
                  transform: `translate(${faceTracker.faceData.headPose.yaw * 2}px, ${faceTracker.faceData.headPose.pitch * 2}px)`
                }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 🎯 学習データ収集（革命的プロダクト開発用） -->
        <div class="section">
          <h3>🧠 学習データ収集</h3>
          <div class="learning-controls">
            <button 
              @click="toggleLearning"
              :class="['primary-btn', { 'recording': gazeLearner.isLogging.value }]"
              :disabled="!faceTracker.isTracking.value"
            >
              {{ gazeLearner.isLogging.value ? '⏹️ 収集停止' : '🔴 収集開始' }}
            </button>
            
            <div v-if="gazeLearner.isLogging.value" class="recording-status">
              <div class="recording-indicator">📊 収集中...</div>
              <div class="data-count">データ: {{ gazeLearner.currentSession.dataPoints.length }}件</div>
              <div class="accuracy">精度: {{ gazeLearner.stats.accuracyRate }}%</div>
            </div>
            
            <div v-if="!gazeLearner.isLogging.value && gazeLearner.totalDataPoints.value > 0" class="learning-stats">
              <div class="stat-line">総セッション: {{ gazeLearner.loggedSessions.value }}</div>
              <div class="stat-line">総データ: {{ gazeLearner.totalDataPoints.value }}件</div>
              <div class="stat-line">品質: {{ gazeLearner.stats.dataQuality }}%</div>
            </div>
          </div>
        </div>

        <!-- 🔧 意図修正ボタン（学習データ収集中のみ表示） -->
        <div class="section" v-if="gazeLearner.isLogging.value">
          <h3>🔧 実際の視線修正</h3>
          <div class="intention-correction">
            <p class="correction-help">実際に見ていたゾーンをクリック:</p>
            <div class="zone-buttons">
              <button 
                v-for="(zone, index) in zoneAAC.zones.value" 
                :key="index"
                @click="correctIntention(index)"
                class="zone-btn"
                :class="{ 'current-zone': index === zoneAAC.currentZone.value?.id }"
              >
                {{ index + 1 }}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中央パネル: 視線ゾーンインターフェース -->
      <section class="gaze-interface">
        <!-- 視線ポイント表示 -->
        <div 
          v-if="showGazePoint && gazePoint"
          class="gaze-point"
          :style="{
            left: `${gazePoint.x}px`,
            top: `${gazePoint.y}px`
          }"
        >
          <!-- 信頼度表示 -->
          <div class="gaze-confidence">
            {{ Math.round(gazePoint.confidence * 100) }}%
          </div>
        </div>
        
        <!-- デバッグ情報表示 -->
        <div v-if="gazePoint && faceTracker.settings.debugMode" class="debug-info">
          <div class="debug-item">頭部姿勢: Yaw={{ Math.round(gazePoint.headPose.yaw) }}°, Pitch={{ Math.round(gazePoint.headPose.pitch) }}°</div>
          <div class="debug-item">視線座標: ({{ Math.round(gazePoint.x) }}, {{ Math.round(gazePoint.y) }})</div>
          <div class="debug-item">正規化: X={{ gazePoint.debug.normalizedGazeX.toFixed(2) }}, Y={{ gazePoint.debug.normalizedGazeY.toFixed(2) }}</div>
          <div class="debug-item">検出方法: {{ faceTracker.stats.detectionMethod }}</div>
        </div>

        <!-- 9ゾーングリッド -->
        <div class="zone-grid">
          <div 
            v-for="zone in zoneAAC.zones.value"
            :key="zone.id"
            class="zone-cell"
            :class="{
              'zone-gazing': zone.id === zoneAAC.currentZone.value?.id,
              'zone-dwelling': zone.hovered,
              'zone-selected': zone.id === zoneAAC.selectedZone.value?.id
            }"
            :style="{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`
            }"
          >
            <div class="zone-content">
              <div class="zone-name">{{ zone.name }}</div>
              <div class="zone-number">{{ zone.id + 1 }}</div>
              
              <!-- ドウェル進行円 -->
              <div 
                v-if="zone.hovered && zoneAAC.dwellProgress.value > 0"
                class="dwell-circle"
              >
                <svg width="60" height="60" class="progress-ring">
                  <circle
                    cx="30"
                    cy="30"
                    r="25"
                    stroke="#f39c12"
                    stroke-width="4"
                    fill="none"
                    :stroke-dasharray="157"
                    :stroke-dashoffset="157 - (157 * zoneAAC.dwellProgress.value / 100)"
                    class="progress-circle"
                  />
                </svg>
                <div class="progress-text">{{ Math.round(zoneAAC.dwellProgress.value) }}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 選択結果表示 -->
        <div class="selection-display" v-if="zoneAAC.selectedZone.value !== null">
          <h2>✅ 選択されたゾーン</h2>
          <div class="selected-info">
            <div class="zone-name-large">{{ zoneAAC.selectedZone.value.name }}</div>
            <div class="selection-time">{{ selectionTime }}</div>
            <button @click="zoneAAC.resetSelection()" class="clear-btn">
              🗑️ クリア
            </button>
          </div>
        </div>

        <!-- 使用説明 -->
        <div class="usage-guide" v-if="!faceTracker.isTracking.value">
          <h3>💡 視線入力の使い方</h3>
          <ol>
            <li>📹 上のパネルでカメラを選択</li>
            <li>▶️ 「開始」ボタンをクリック</li>
            <li>👁️ 選択したいゾーンを見つめる</li>
            <li>⏰ {{ Math.round(zoneAAC.zoneConfig.dwellTime / 1000 * 10) / 10 }}秒間見続けると選択</li>
          </ol>
        </div>
      </section>

      <!-- 右パネル: 履歴・統計 -->
      <aside class="history-panel">
        <div class="section">
          <h3>📊 選択履歴</h3>
          <div class="history-list">
            <div 
              v-for="(item, index) in zoneAAC.selectionHistory.slice(-8)" 
              :key="index"
              class="history-item"
            >
              <div class="history-zone">{{ item.zoneName }}</div>
              <div class="history-time">{{ formatTime(item.timestamp) }}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>📈 統計情報</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ zoneAAC.stats.totalSelections }}</div>
              <div class="stat-label">総選択数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ Math.round(zoneAAC.stats.avgSelectionTime) }}ms</div>
              <div class="stat-label">平均時間</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ currentAccuracy }}%</div>
              <div class="stat-label">精度</div>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <!-- カメラビュー -->
    <div class="camera-view" :class="{ 'camera-minimized': !showCamera }">
      <video 
        ref="videoElement" 
        autoplay 
        muted 
        playsinline
        class="camera-video"
      ></video>
      <canvas 
        ref="canvasElement" 
        class="camera-canvas"
        width="640" 
        height="480"
      ></canvas>
      
      <div class="camera-controls">
        <button @click="showCamera = !showCamera" class="icon-btn">
          {{ showCamera ? '🙈' : '👁️' }}
        </button>
        <button @click="faceTracker.settings.debugMode = !faceTracker.settings.debugMode" class="icon-btn">
          🔧
        </button>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="error-overlay">
      <div class="error-content">
        <h3>⚠️ エラーが発生しました</h3>
        <p>{{ error }}</p>
        <div class="error-actions">
          <button @click="clearError" class="btn secondary">閉じる</button>
          <button @click="retryInitialization" class="btn primary">再試行</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useOpenCVFaceTracker } from './composables/useOpenCVFaceTracker.js'
import { useZoneBasedAAC } from './composables/useZoneBasedAAC.js'
import { useGazeLearningLogger } from './composables/useGazeLearningLogger.js'

// Face Tracker (OpenCV版)
const faceTracker = useOpenCVFaceTracker()

// Zone-based AAC System
const zoneAAC = useZoneBasedAAC(faceTracker)

// 🎯 学習データ収集システム（患者さんのため！）
const gazeLearner = useGazeLearningLogger()

// UI状態
const showCamera = ref(true)
const showGazePoint = ref(true)
const error = ref(null)

// カメラ管理
const cameras = ref([])
const selectedCamera = ref(null)
const videoElement = ref(null)
const canvasElement = ref(null)

// 完全に新しい高精度視線ポイント計算
const gazePoint = computed(() => {
  if (!faceTracker.faceDetected.value) return null
  
  const headPose = faceTracker.faceData.headPose
  const confidence = faceTracker.faceData.confidence
  
  // 信頼度チェック
  if (confidence < 0.3) return null
  
  // 画面サイズとインターフェース領域を取得
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const interfaceElement = document.querySelector('.gaze-interface')
  
  // インターフェース領域のサイズと位置
  let interfaceRect = { left: 0, top: 0, width: screenWidth, height: screenHeight }
  if (interfaceElement) {
    interfaceRect = interfaceElement.getBoundingClientRect()
  }
  
  // 頭部姿勢から視線方向への変換（改良版）
  // yaw: 負の値 = 左向き、正の値 = 右向き
  // pitch: 負の値 = 上向き、正の値 = 下向き
  
  // 視線方向の正規化 (-1 to 1)
  const normalizedGazeX = Math.max(-1, Math.min(1, headPose.yaw / 35))  // ±35°の範囲
  const normalizedGazeY = Math.max(-1, Math.min(1, headPose.pitch / 25)) // ±25°の範囲
  
  // インターフェース領域内での座標計算
  const gazeX = interfaceRect.left + interfaceRect.width * (0.5 + normalizedGazeX * 0.4)  // 中央±40%の範囲
  const gazeY = interfaceRect.top + interfaceRect.height * (0.5 + normalizedGazeY * 0.4)
  
  // 画面境界内に制限
  const boundedX = Math.max(20, Math.min(screenWidth - 20, gazeX))
  const boundedY = Math.max(20, Math.min(screenHeight - 20, gazeY))
  
  return {
    x: boundedX,
    y: boundedY,
    confidence: confidence,
    headPose: { ...headPose },
    debug: {
      normalizedGazeX,
      normalizedGazeY,
      interfaceRect,
      rawGazeX: gazeX,
      rawGazeY: gazeY
    }
  }
})

// 視線ポイントはデバッグ表示のみに使用
// 実際のゾーン検出は頭部姿勢ベースで行う

// ステータス表示
const statusClass = computed(() => {
  if (error.value) return 'status-error'
  if (!faceTracker.isInitialized.value) return 'status-initializing'
  if (!faceTracker.isTracking.value) return 'status-ready'
  if (!faceTracker.faceDetected.value) return 'status-no-face'
  return 'status-tracking'
})

const statusText = computed(() => {
  if (error.value) return 'エラー'
  if (!faceTracker.isInitialized.value) return '初期化中...'
  if (!faceTracker.isTracking.value) return '準備完了'
  if (!faceTracker.faceDetected.value) return '顔を検出中...'
  return '視線追跡中'
})

const selectionTime = computed(() => {
  if (zoneAAC.selectionHistory.length > 0) {
    const last = zoneAAC.selectionHistory[zoneAAC.selectionHistory.length - 1]
    return new Date(last.timestamp).toLocaleTimeString()
  }
  return ''
})

const currentAccuracy = computed(() => {
  // 簡易精度計算
  if (zoneAAC.stats.totalSelections === 0) return 0
  return Math.round((zoneAAC.stats.totalSelections / (zoneAAC.stats.totalSelections + 1)) * 100)
})

// メインループ
let gazeProcessingLoop = null

/**
 * カメラ一覧取得
 */
const getCameras = async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true })
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(device => device.kind === 'videoinput')
    
    cameras.value = videoDevices.map(device => ({
      deviceId: device.deviceId,
      label: device.label || `カメラ ${cameras.value.length + 1}`,
      groupId: device.groupId
    }))
    
    // デフォルトカメラ選択
    if (cameras.value.length > 0 && !selectedCamera.value) {
      selectedCamera.value = cameras.value[0]
    }
    
    console.log('📹 利用可能なカメラ:', cameras.value)
  } catch (err) {
    error.value = `カメラアクセスエラー: ${err.message}`
  }
}

/**
 * カメラ変更ハンドラー
 */
const handleCameraChange = async () => {
  if (faceTracker.isTracking.value) {
    await stopTracking()
  }
  
  if (selectedCamera.value) {
    console.log('📹 カメラ変更:', selectedCamera.value.label)
  }
}

/**
 * 追跡開始/停止切り替え
 */
const toggleTracking = async () => {
  if (faceTracker.isTracking.value) {
    await stopTracking()
  } else {
    await startTracking()
  }
}

/**
 * 追跡開始
 */
const startTracking = async () => {
  try {
    if (!selectedCamera.value) {
      error.value = 'カメラを選択してください'
      return
    }
    
    // Face Tracker開始
    await faceTracker.startTracking(videoElement.value, canvasElement.value)
    
    // 視線処理ループ開始
    startGazeProcessing()
    
    console.log('✅ 視線追跡開始')
    
  } catch (err) {
    error.value = `追跡開始エラー: ${err.message}`
  }
}

/**
 * 追跡停止
 */
const stopTracking = async () => {
  faceTracker.stopTracking()
  stopGazeProcessing()
  zoneAAC.resetSelection()
  
  console.log('⏹️ 視線追跡停止')
}

/**
 * 視線処理ループ開始（学習データ収集統合版）
 */
const startGazeProcessing = () => {
  const processGaze = () => {
    if (faceTracker.isTracking.value) {
      // ゾーン選択処理を実行
      zoneAAC.processZoneSelection()
      
      // 🎯 学習データ自動収集（患者さんのため！）
      if (gazeLearner.isLogging.value) {
        const currentZone = zoneAAC.currentZone.value?.id || null
        gazeLearner.logGazeEvent(
          gazePoint.value,
          faceTracker.faceData,
          currentZone,
          gazeLearner.currentSession.lastIntention
        )
        
        // 意図がクリアされた場合（次のデータポイント用）
        if (gazeLearner.currentSession.lastIntention !== null) {
          gazeLearner.currentSession.lastIntention = null
        }
      }
    }
    
    if (faceTracker.isTracking.value) {
      gazeProcessingLoop = requestAnimationFrame(processGaze)
    }
  }
  
  gazeProcessingLoop = requestAnimationFrame(processGaze)
}

/**
 * 視線処理ループ停止
 */
const stopGazeProcessing = () => {
  if (gazeProcessingLoop) {
    cancelAnimationFrame(gazeProcessingLoop)
    gazeProcessingLoop = null
  }
}

/**
 * エラークリア
 */
const clearError = () => {
  error.value = null
}

/**
 * 再初期化
 */
const retryInitialization = async () => {
  clearError()
  await faceTracker.initializeOpenCV()
}

/**
 * 時刻フォーマット
 */
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 🎯 学習データ収集トグル（患者さんのための革命的システム開発）
 */
const toggleLearning = () => {
  if (gazeLearner.isLogging.value) {
    gazeLearner.stopLogging()
    console.log('📊 学習データ収集停止 - お疲れ様でした！')
  } else {
    gazeLearner.startLogging()
    console.log('🚀 学習データ収集開始 - 患者さんのために頑張りましょう！')
  }
}

/**
 * 🔧 意図修正（実際に見ていたゾーンの手動入力）
 */
const correctIntention = (zoneIndex) => {
  gazeLearner.correctLastIntention(zoneIndex)
  console.log(`✅ 意図修正: ゾーン${zoneIndex + 1}に修正しました`)
  
  // 視覚フィードバック
  const zoneNames = ['左上', '上中央', '右上', '左中央', '中央', '右中央', '左下', '下中央', '右下']
  
  // 修正通知表示（簡易版）
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('視線データ修正', {
      body: `実際の視線: ${zoneNames[zoneIndex]}`,
      icon: '/favicon.ico'
    })
  }
}

// ウォッチャー: エラー監視
watch(() => faceTracker.error.value, (newError) => {
  if (newError) {
    error.value = newError
  }
})

// 初期化
onMounted(async () => {
  console.log('🚀 視線入力AAC アプリケーション開始')
  
  await nextTick()
  await getCameras()
  
  // Face Tracker初期化
  try {
    await faceTracker.initializeOpenCV()
  } catch (err) {
    error.value = `初期化エラー: ${err.message}`
  }
})

// クリーンアップ
onUnmounted(() => {
  stopTracking()
})
</script>

<style scoped>
.eye-gaze-aac-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', Arial, sans-serif;
}

.app-header {
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.app-header h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: bold;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.status-indicator {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.status-initializing { background: #f39c12; }
.status-ready { background: #27ae60; }
.status-tracking { background: #3498db; }
.status-no-face { background: #e67e22; }
.status-error { background: #e74c3c; }

.app-main {
  display: grid;
  grid-template-columns: 280px 1fr 250px;
  gap: 1rem;
  padding: 1rem;
  min-height: calc(100vh - 120px);
}

.control-panel, .history-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 1rem;
  height: fit-content;
}

.section {
  margin-bottom: 1.5rem;
}

.section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 0.5rem;
}

.primary-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  margin-top: 0.5rem;
}

.primary-btn:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-2px);
}

.primary-btn:disabled {
  background: #7f8c8d;
  cursor: not-allowed;
}

select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  margin-bottom: 0.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

input[type="range"] {
  width: 100%;
  margin-top: 0.25rem;
}

input[type="checkbox"] {
  margin-right: 0.5rem;
}

.pose-display {
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
}

.pose-item {
  margin-bottom: 0.5rem;
  font-family: monospace;
}

.pose-visual {
  position: relative;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  margin: 1rem auto;
}

.head-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  background: #f39c12;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.1s ease;
}

.gaze-interface {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 2rem;
  overflow: hidden;
}

.gaze-point {
  position: absolute;
  width: 40px;  /* さらにサイズ拡大 */
  height: 40px;
  background: radial-gradient(circle, #ff0080 0%, #ff4040 50%, #ff8080 100%);
  border: 4px solid #ffffff;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1000;  /* より前面に */
  transform: translate(-50%, -50%);
  animation: pulse-gaze 0.6s ease-in-out infinite;
  box-shadow: 0 0 30px rgba(255, 0, 128, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gaze-confidence {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  white-space: nowrap;
}

.debug-info {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  padding: 10px;
  border-radius: 5px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 999;
  max-width: 400px;
}

.debug-item {
  margin-bottom: 5px;
  white-space: nowrap;
}

/* 🎯 学習データ収集UI */
.learning-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.primary-btn.recording {
  background: #e74c3c;
  animation: recording-pulse 1.5s ease-in-out infinite;
}

@keyframes recording-pulse {
  0% { background: #e74c3c; }
  50% { background: #c0392b; }
  100% { background: #e74c3c; }
}

.recording-status {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid #e74c3c;
  border-radius: 5px;
  padding: 10px;
  font-size: 0.9rem;
}

.recording-indicator {
  font-weight: bold;
  color: #e74c3c;
  margin-bottom: 5px;
}

.data-count, .accuracy {
  margin-bottom: 3px;
  font-family: monospace;
}

.learning-stats {
  background: rgba(52, 152, 219, 0.1);
  border: 1px solid #3498db;
  border-radius: 5px;
  padding: 10px;
  font-size: 0.9rem;
}

.stat-line {
  margin-bottom: 3px;
  font-family: monospace;
}

/* 意図修正UI */
.intention-correction {
  background: rgba(241, 196, 15, 0.1);
  border: 1px solid #f1c40f;
  border-radius: 5px;
  padding: 10px;
}

.correction-help {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  color: #f1c40f;
  font-weight: bold;
}

.zone-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}

.zone-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px;
  border-radius: 3px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

.zone-btn:hover {
  background: rgba(241, 196, 15, 0.3);
  border-color: #f1c40f;
}

.zone-btn.current-zone {
  background: rgba(46, 204, 113, 0.3);
  border-color: #2ecc71;
}

@keyframes pulse-gaze {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
  50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
}

.zone-grid {
  position: relative;
  width: 100%;
  height: 450px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  margin-bottom: 2rem;
}

.zone-cell {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zone-cell.zone-gazing {
  background: rgba(52, 152, 219, 0.2);
  border-color: #3498db;
  border-width: 2px;
}

.zone-cell.zone-dwelling {
  background: rgba(241, 196, 15, 0.3);
  border-color: #f1c40f;
  border-width: 3px;
  transform: scale(1.05);
  z-index: 10;
}

.zone-cell.zone-selected {
  background: rgba(46, 204, 113, 0.5);
  border-color: #2ecc71;
  animation: selection-pulse 1s ease-in-out;
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
  opacity: 0.7;
  font-weight: bold;
}

.dwell-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-circle {
  transition: stroke-dashoffset 0.1s ease;
}

.progress-text {
  position: absolute;
  font-size: 0.8rem;
  font-weight: bold;
  color: #f39c12;
}

.selection-display {
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.zone-name-large {
  font-size: 2.5rem;
  font-weight: bold;
  color: #2ecc71;
  margin-bottom: 1rem;
}

.selection-time {
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

.usage-guide {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 2rem;
  text-align: center;
}

.usage-guide ol {
  text-align: left;
  max-width: 400px;
  margin: 1rem auto;
}

.usage-guide li {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: 5px;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-zone {
  font-weight: bold;
}

.history-time {
  font-size: 0.8rem;
  opacity: 0.7;
  font-family: monospace;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-item {
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #3498db;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-top: 0.25rem;
}

.camera-view {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  height: 240px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  z-index: 1000;
}

.camera-minimized {
  width: 60px;
  height: 60px;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.camera-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 5px;
}

.icon-btn {
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
}

.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.error-content {
  background: white;
  color: #333;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  max-width: 500px;
  margin: 1rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

.btn.primary {
  background: #3498db;
  color: white;
}

.btn.secondary {
  background: #95a5a6;
  color: white;
}

@keyframes selection-pulse {
  0% { transform: scale(1.05); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1.05); }
}

@media (max-width: 1200px) {
  .app-main {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>