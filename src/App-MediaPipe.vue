<template>
  <div class="mediapipe-aac-app">
    <!-- ヘッダー -->
    <header class="app-header">
      <h1>🎯 MediaPipe AAC - 高精度視線入力システム</h1>
      <div class="status-bar">
        <div class="status-indicator" :class="statusClass">
          {{ statusText }}
        </div>
        <div class="stats" v-if="faceTracker.stats.fps > 0">
          FPS: {{ faceTracker.stats.fps }} | 
          信頼度: {{ Math.round(faceTracker.faceData.confidence * 100) }}%
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="app-main">
      <!-- 左パネル: コントロール -->
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
          <h3>⚙️ ゾーン設定</h3>
          <label>
            ドウェル時間: {{ zoneAAC.zoneConfig.dwellTime }}ms
            <input 
              type="range" 
              min="500" 
              max="3000" 
              step="100"
              v-model="zoneAAC.zoneConfig.dwellTime"
            >
          </label>
          <label>
            信頼度閾値: {{ Math.round(zoneAAC.zoneConfig.confidenceThreshold * 100) }}%
            <input 
              type="range" 
              min="0.3" 
              max="0.9" 
              step="0.1"
              v-model="zoneAAC.zoneConfig.confidenceThreshold"
            >
          </label>
        </div>

        <div class="section" v-if="zoneAAC.selectionHistory.length > 0">
          <h3>📊 選択履歴</h3>
          <div class="selection-history">
            <div 
              v-for="selection in zoneAAC.selectionHistory.slice(-5)" 
              :key="selection.timestamp"
              class="history-item"
            >
              {{ selection.zoneName }} ({{ selection.dwellTime }}ms)
            </div>
          </div>
        </div>
      </aside>

      <!-- 中央パネル: ゾーンインターフェース -->
      <section class="zone-interface">
        <div class="zone-grid">
          <div 
            v-for="zone in zoneAAC.zones.value"
            :key="zone.id"
            class="zone-cell"
            :class="{
              'zone-hovered': zone.hovered,
              'zone-active': zone.active,
              'zone-current': zoneAAC.currentZone.value?.id === zone.id
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
              <div class="zone-id">{{ zone.id + 1 }}</div>
              
              <!-- ドウェル進行バー -->
              <div 
                v-if="zone.hovered && zoneAAC.dwellProgress.value > 0"
                class="dwell-progress"
                :style="{ width: `${zoneAAC.dwellProgress.value * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 中央表示エリア -->
        <div class="center-display" v-if="zoneAAC.selectedZone.value">
          <h2>選択されたゾーン</h2>
          <div class="selected-zone-info">
            <div class="zone-name-large">{{ zoneAAC.selectedZone.value.name }}</div>
            <div class="zone-details">
              ID: {{ zoneAAC.selectedZone.value.id + 1 }} | 
              座標: ({{ Math.round(zoneAAC.selectedZone.value.centerX) }}, {{ Math.round(zoneAAC.selectedZone.value.centerY) }})
            </div>
          </div>
        </div>
      </section>

      <!-- 右パネル: デバッグ情報 -->
      <aside class="debug-panel" v-if="showDebug">
        <div class="section">
          <h3>🔍 デバッグ情報</h3>
          
          <div class="debug-item">
            <strong>顔検出:</strong> {{ faceTracker.faceDetected.value ? '✅' : '❌' }}
          </div>
          
          <div class="debug-item" v-if="faceTracker.faceDetected.value">
            <strong>顔位置:</strong> 
            ({{ Math.round(faceTracker.faceData.x) }}, {{ Math.round(faceTracker.faceData.y) }})
          </div>
          
          <div class="debug-item" v-if="faceTracker.faceDetected.value">
            <strong>頭部姿勢:</strong><br>
            Yaw: {{ Math.round(faceTracker.faceData.headPose.yaw) }}°<br>
            Pitch: {{ Math.round(faceTracker.faceData.headPose.pitch) }}°<br>
            Roll: {{ Math.round(faceTracker.faceData.headPose.roll) }}°
          </div>
          
          <div class="debug-item" v-if="zoneAAC.currentZone.value">
            <strong>現在のゾーン:</strong> {{ zoneAAC.currentZone.value.name }}
          </div>
          
          <div class="debug-item">
            <strong>ドウェル進行:</strong> {{ Math.round(zoneAAC.dwellProgress.value * 100) }}%
          </div>
        </div>
      </aside>
    </main>

    <!-- カメラビュー -->
    <div class="camera-container" :class="{ 'camera-hidden': !showCamera }">
      <video 
        ref="videoElement" 
        autoplay 
        muted 
        playsinline
        class="camera-video"
      ></video>
      <canvas 
        ref="canvasElement" 
        class="camera-overlay"
        width="640" 
        height="480"
      ></canvas>
      
      <div class="camera-controls">
        <button @click="showCamera = !showCamera" class="icon-btn">
          {{ showCamera ? '🙈' : '👁️' }}
        </button>
        <button @click="showDebug = !showDebug" class="icon-btn">
          🔧
        </button>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="error-overlay">
      <div class="error-content">
        <h3>⚠️ エラーが発生しました</h3>
        <p>{{ error }}</p>
        <button @click="clearError" class="primary-btn">閉じる</button>
      </div>
    </div>

    <!-- フォールバックモード通知 -->
    <div v-if="faceTracker.error.value && faceTracker.error.value.includes('フォールバック')" 
         class="fallback-notification">
      <div class="notification-content">
        <h4>🖱️ フォールバックモード有効</h4>
        <p>MediaPipeが利用できないため、マウス操作モードで動作しています。</p>
        <div class="fallback-instructions">
          <p><strong>操作方法:</strong></p>
          <ul>
            <li>🖱️ マウス移動で視線をシミュレート</li>
            <li>⌨️ 矢印キーでも操作可能</li>
            <li>📱 タッチデバイスではタッチで操作</li>
          </ul>
        </div>
        <button @click="faceTracker.error.value = null" class="notification-close">
          ✕
        </button>
      </div>
    </div>

    <!-- ローディング表示 -->
    <div v-if="!faceTracker.isInitialized.value" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <h3>システム初期化中...</h3>
        <p id="loading-message">MediaPipeを読み込み中...</p>
        <div class="loading-progress">
          <div class="progress-steps">
            <div class="step">📦 ライブラリ読み込み</div>
            <div class="step">🎯 顔検出エンジン初期化</div>
            <div class="step">📹 カメラ準備</div>
            <div class="step">✅ 準備完了</div>
          </div>
        </div>
        <div class="loading-tips">
          <p><strong>💡 ヒント:</strong></p>
          <ul>
            <li>カメラアクセスを許可してください</li>
            <li>15秒以上かかる場合は自動でフォールバックモードに切り替わります</li>
            <li>フォールバックモードではマウス操作が可能です</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useMediaPipeFaceTracker } from './composables/useMediaPipeFaceTracker.js'
import { useZoneBasedAAC } from './composables/useZoneBasedAAC.js'

// MediaPipe Face Tracker
const faceTracker = useMediaPipeFaceTracker()

// Zone-based AAC System
const zoneAAC = useZoneBasedAAC(faceTracker)

// UI状態
const showCamera = ref(true)
const showDebug = ref(false)
const error = ref(null)

// カメラ管理
const cameras = ref([])
const selectedCamera = ref(null)
const videoElement = ref(null)
const canvasElement = ref(null)

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
  if (faceTracker.error.value && faceTracker.error.value.includes('フォールバック')) {
    return 'フォールバックモード (マウス操作)'
  }
  if (!faceTracker.faceDetected.value) return '顔を検出中...'
  return '追跡中'
})

// メインループ
let processingLoop = null

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
    
    // MediaPipe Face Tracker開始
    await faceTracker.startTracking(videoElement.value, canvasElement.value)
    
    // 処理ループ開始
    startProcessingLoop()
    
    console.log('✅ MediaPipe追跡開始')
    
  } catch (err) {
    error.value = `追跡開始エラー: ${err.message}`
  }
}

/**
 * 追跡停止
 */
const stopTracking = async () => {
  faceTracker.stopTracking()
  stopProcessingLoop()
  zoneAAC.resetSelection()
  
  console.log('⏹️ MediaPipe追跡停止')
}

/**
 * 処理ループ開始
 */
const startProcessingLoop = () => {
  const processFrame = () => {
    if (faceTracker.isTracking.value) {
      // ゾーン選択処理
      zoneAAC.processZoneSelection()
      
      // 次フレーム予約
      processingLoop = requestAnimationFrame(processFrame)
    }
  }
  
  processingLoop = requestAnimationFrame(processFrame)
}

/**
 * 処理ループ停止
 */
const stopProcessingLoop = () => {
  if (processingLoop) {
    cancelAnimationFrame(processingLoop)
    processingLoop = null
  }
}

/**
 * エラークリア
 */
const clearError = () => {
  error.value = null
}

// 初期化
onMounted(async () => {
  console.log('🚀 MediaPipe AAC アプリケーション開始')
  
  await nextTick()
  await getCameras()
  
  // MediaPipe初期化
  try {
    await faceTracker.initializeFaceDetection()
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
.mediapipe-aac-app {
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
  grid-template-columns: 300px 1fr 250px;
  gap: 1rem;
  padding: 1rem;
  min-height: calc(100vh - 120px);
}

.control-panel, .debug-panel {
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

.zone-interface {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 2rem;
  overflow: hidden;
}

.zone-grid {
  position: relative;
  width: 100%;
  height: 500px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
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

.zone-cell:hover,
.zone-cell.zone-hovered {
  background: rgba(52, 152, 219, 0.3);
  border-color: #3498db;
  transform: scale(1.05);
  z-index: 10;
}

.zone-cell.zone-active {
  background: rgba(46, 204, 113, 0.5);
  border-color: #2ecc71;
  animation: pulse 0.5s ease-in-out;
}

.zone-cell.zone-current {
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
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.zone-id {
  font-size: 2rem;
  opacity: 0.7;
  font-weight: bold;
}

.dwell-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: #f39c12;
  transition: width 0.1s ease;
  border-radius: 0 0 0 2px;
}

.center-display {
  text-align: center;
  margin-top: 2rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.zone-name-large {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #3498db;
}

.zone-details {
  font-size: 1.1rem;
  opacity: 0.8;
}

.camera-container {
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

.camera-hidden {
  width: 60px;
  height: 60px;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-overlay {
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
}

.selection-history {
  max-height: 150px;
  overflow-y: auto;
}

.history-item {
  padding: 0.25rem 0;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-item {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-family: monospace;
}

.error-overlay, .loading-overlay {
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

.error-content, .loading-content {
  background: white;
  color: #333;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  max-width: 600px;
  margin: 1rem;
}

.loading-progress {
  margin: 1.5rem 0;
}

.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
  margin: 1rem 0;
}

.step {
  padding: 0.5rem;
  background: rgba(52, 152, 219, 0.1);
  border-left: 3px solid #3498db;
  border-radius: 3px;
  font-size: 0.9rem;
}

.loading-tips {
  background: rgba(241, 196, 15, 0.1);
  border: 1px solid #f1c40f;
  border-radius: 5px;
  padding: 1rem;
  margin-top: 1.5rem;
  text-align: left;
}

.loading-tips ul {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
}

.loading-tips li {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes pulse {
  0% { transform: scale(1.05); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1.05); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fallback-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9000;
  max-width: 350px;
}

.notification-content {
  background: rgba(241, 196, 15, 0.95);
  color: #333;
  padding: 1.5rem;
  border-radius: 10px;
  border: 2px solid #f39c12;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.notification-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.fallback-instructions {
  margin-top: 1rem;
  background: rgba(255, 255, 255, 0.3);
  padding: 0.75rem;
  border-radius: 5px;
}

.fallback-instructions ul {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
}

.fallback-instructions li {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.notification-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #333;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.notification-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

@media (max-width: 1200px) {
  .app-main {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .debug-panel {
    order: -1;
  }
  
  .fallback-notification {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>