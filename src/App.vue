<template>
  <div id="app" class="app-container">
    <!-- ヘッダー -->
    <header class="app-header">
      <div class="header-left">
        <h1>視線入力式AAC</h1>
        <div class="status-indicator" :class="statusClass">
          <span class="status-dot"></span>
          <span class="status-text">{{ statusText }}</span>
        </div>
      </div>
      
      <div class="header-right">
        <!-- カメラ選択 -->
        <div class="camera-controls">
          <select 
            v-model="selectedCamera" 
            @change="handleCameraSelect"
            :disabled="isCalibrating"
            class="camera-select"
          >
            <option value="">カメラを選択...</option>
            <option 
              v-for="camera in cameras" 
              :key="camera.deviceId"
              :value="camera"
            >
              {{ camera.label }}
            </option>
          </select>
          <div v-if="cameraInfo.resolution.width > 0" class="camera-info">
            {{ cameraInfo.resolution.width }}×{{ cameraInfo.resolution.height }}
          </div>
        </div>

        <!-- キャリブレーションボタン -->
        <button 
          @click="handleStartCalibration"
          :disabled="!isCameraActive || isCalibrating"
          class="primary-btn calibration-btn"
        >
          <span class="btn-icon">🎯</span>
          {{ isCalibrating ? 'キャリブレーション中...' : 'キャリブレーション開始' }}
        </button>

        <!-- 設定パネル -->
        <div class="settings-panel">
          <label class="setting-item">
            <input 
              v-model="settings.showGazePoint" 
              type="checkbox"
            />
            <span class="setting-label">視線ポイント</span>
          </label>
          <label class="setting-item">
            <input 
              v-model="settings.enableSmoothing" 
              type="checkbox"
            />
            <span class="setting-label">スムージング</span>
          </label>
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="main-content">
      <!-- 開発中の表示 -->
      <div class="dev-info">
        <h2>🚧 Vue3移行中 - 基本機能テスト</h2>
        <div class="dev-stats">
          <div class="stat-item">
            <span class="stat-label">WebGazer:</span>
            <span class="stat-value">{{ webgazerReady ? '✅ 準備完了' : '❌ 未準備' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">キャリブレーション:</span>
            <span class="stat-value">{{ isCalibrated ? '✅ 完了' : '❌ 未完了' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">視線追跡:</span>
            <span class="stat-value">{{ isTracking ? '👁️ 追跡中' : '⏸️ 停止中' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">視線位置:</span>
            <span class="stat-value">
              X: {{ Math.round(gazeData.x) }}, Y: {{ Math.round(gazeData.y) }}
            </span>
          </div>
        </div>

        <!-- デバッグ情報 -->
        <div v-if="isCalibrating" class="debug-info">
          <h3>🎯 キャリブレーション情報</h3>
          <div class="debug-stats">
            <div>現在のポイント: {{ currentIndex + 1 }} / {{ calibrationPoints.length }}</div>
            <div>距離: {{ Math.round(gazeTracking.distance) }}px</div>
            <div>安定性: {{ Math.round(gazeTracking.progress * 100) }}%</div>
            <div>状態: {{ gazeTracking.isStable ? '安定' : '不安定' }}</div>
          </div>
        </div>
      </div>

      <!-- 後で実装する文字盤エリア -->
      <div class="character-board-placeholder">
        <p>📝 文字盤は次のフェーズで実装予定</p>
        <p>まずは視線ポイントとキャリブレーションをテストしてください</p>
      </div>
    </main>

    <!-- 視線ポイント -->
    <GazePoint 
      :gaze-data="gazeData"
      :is-tracking="isTracking"
      :is-calibrating="isCalibrating"
      :show-gaze-point="settings.showGazePoint"
      :size="settings.gazePointSize"
    />

    <!-- キャリブレーションオーバーレイ -->
    <CalibrationOverlay 
      :is-calibrating="isCalibrating"
      :current-index="currentIndex"
      :current-point="currentPoint"
      :calibration-points="calibrationPoints"
      :gaze-tracking="gazeTracking"
      @cancel="handleCancelCalibration"
    />

    <!-- エラー表示 -->
    <div v-if="error" class="error-overlay">
      <div class="error-content">
        <h3>⚠️ エラー</h3>
        <p>{{ error }}</p>
        <button @click="error = null" class="primary-btn">閉じる</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import { useWebGazer } from './composables/useWebGazer.js'
import { useCalibration } from './composables/useCalibration.js'
import { useCameraManager } from './composables/useCameraManager.js'
import GazePoint from './components/EyeTracker/GazePoint.vue'
import CalibrationOverlay from './components/EyeTracker/CalibrationOverlay.vue'

// WebGazer統合
const {
  isInitialized,
  isTracking,
  gazeData,
  webgazerReady,
  error,
  settings,
  startTracking,
  stopTracking,
  setGazeListener,
  clearGazeListener
} = useWebGazer()

// カメラ管理
const {
  cameras,
  selectedCamera,
  isCameraActive,
  cameraInfo,
  selectCamera,
  initializeCameras
} = useCameraManager()

// ローカル状態
const isCalibrated = ref(false)

// キャリブレーション統合
const {
  isCalibrating,
  currentIndex,
  currentPoint,
  calibrationPoints,
  gazeTracking,
  startCalibration,
  processGazeData,
  completeCalibration,
  cancelCalibration
} = useCalibration()

// ステータス表示
const statusClass = computed(() => {
  if (error.value) return 'status-error'
  if (isTracking.value) return 'status-tracking'
  if (isCalibrated.value) return 'status-calibrated'
  if (webgazerReady.value) return 'status-ready'
  return 'status-initializing'
})

const statusText = computed(() => {
  if (error.value) return 'エラー'
  if (isTracking.value) return '視線追跡中'
  if (isCalibrated.value) return 'キャリブレーション完了'
  if (webgazerReady.value) return '準備完了'
  return '初期化中...'
})

// カメラ選択ハンドラー
const handleCameraSelect = async () => {
  if (selectedCamera.value) {
    try {
      await selectCamera(selectedCamera.value)
      console.log('✅ カメラ選択完了:', selectedCamera.value.label)
    } catch (err) {
      error.value = `カメラ選択エラー: ${err.message}`
    }
  }
}

// キャリブレーション開始
const handleStartCalibration = () => {
  if (!isCameraActive.value) {
    error.value = 'カメラを選択してください'
    return
  }
  
  if (!webgazerReady.value) {
    error.value = 'WebGazerが準備できていません'
    return
  }
  
  console.log('🎯 キャリブレーション開始要求')
  
  // キャリブレーション開始（ガゼリスナー設定を渡す）
  const success = startCalibration(setGazeListener)
  
  if (!success) {
    error.value = 'キャリブレーションの開始に失敗しました'
    console.error('❌ キャリブレーション開始失敗')
  } else {
    console.log('✅ キャリブレーション開始成功')
  }
}

// キャリブレーションキャンセル
const handleCancelCalibration = () => {
  console.log('❌ キャリブレーションキャンセル')
  cancelCalibration()
  
  // 通常のガゼリスナーに戻す
  setTimeout(() => {
    setGazeListener((data, timestamp) => {
      // 通常時の処理に戻す（何もしない、useWebGazer内で処理）
    })
  }, 100)
}

// 初期化
onMounted(async () => {
  // カメラ一覧を取得
  await initializeCameras()
})

// 視線データの処理はガゼリスナー内で直接行う

// キャリブレーション完了時の処理
watch(isCalibrating, (newIsCalibrating, oldIsCalibrating) => {
  if (oldIsCalibrating && !newIsCalibrating) {
    // キャリブレーションが終了した
    console.log('🏁 キャリブレーション終了検出')
    
    if (currentIndex.value === calibrationPoints.value.length) {
      // 全ポイント完了
      isCalibrated.value = true
      console.log('🎉 キャリブレーション完了！視線追跡を開始します')
      
      // 通常のガゼリスナーに戻す
      setTimeout(() => {
        const gazeHandler = (data, timestamp) => {
          // useWebGazer内のhandleGazeDataを呼び出す
          // （内部で自動処理される）
        }
        setGazeListener(gazeHandler)
        
        // 視線追跡開始
        startTracking()
      }, 500)
    } else {
      // キャンセルされた場合
      console.log('❌ キャリブレーションがキャンセルされました')
      
      // 通常のガゼリスナーに戻す
      setTimeout(() => {
        setGazeListener((data, timestamp) => {
          // 通常処理
        })
      }, 100)
    }
  }
})
</script>

<style>
/* グローバルスタイルはmain.cssから読み込まれる */

/* ===== レスポンシブヘッダー ===== */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  padding: 15px 25px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h1 {
  font-size: 1.8rem;
  color: #2c3e50;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

/* ===== カメラコントロール ===== */
.camera-controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 200px;
}

.camera-select {
  padding: 8px 12px;
  border: 2px solid #bdc3c7;
  border-radius: 8px;
  background: white;
  font-size: 0.9rem;
  color: #2c3e50;
  transition: border-color 0.3s ease;
}

.camera-select:focus {
  outline: none;
  border-color: #3498db;
}

.camera-select:disabled {
  background: #ecf0f1;
  color: #7f8c8d;
}

.camera-info {
  font-size: 0.8rem;
  color: #7f8c8d;
  text-align: center;
  font-family: monospace;
}

/* ===== キャリブレーションボタン ===== */
.calibration-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 1rem;
  min-width: 180px;
  justify-content: center;
}

.btn-icon {
  font-size: 1.2rem;
}

.calibration-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
  opacity: 0.6;
}

/* ===== 設定パネル ===== */
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 15px;
  border-radius: 10px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.setting-item:hover {
  opacity: 0.8;
}

.setting-label {
  user-select: none;
}

.setting-item input[type="checkbox"] {
  accent-color: #3498db;
  transform: scale(1.1);
}

/* ===== レスポンシブ対応 ===== */
@media (max-width: 1200px) {
  .header-right {
    gap: 15px;
  }
  
  .camera-controls {
    min-width: 180px;
  }
  
  .calibration-btn {
    min-width: 160px;
    padding: 10px 16px;
  }
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    text-align: center;
  }
  
  .header-left {
    flex-direction: column;
    gap: 10px;
  }
  
  .header-left h1 {
    font-size: 1.5rem;
  }
  
  .header-right {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .camera-controls {
    width: 100%;
    max-width: 300px;
  }
  
  .calibration-btn {
    width: 100%;
    max-width: 300px;
  }
  
  .settings-panel {
    flex-direction: row;
    justify-content: center;
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 10px 15px;
  }
  
  .header-left h1 {
    font-size: 1.3rem;
  }
  
  .header-right {
    gap: 10px;
  }
}

/* ===== 開発中表示スタイル ===== */
.dev-info {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.dev-info h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
}

.dev-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 15px;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.stat-label {
  font-weight: bold;
  color: #2c3e50;
}

.stat-value {
  color: #3498db;
  font-family: monospace;
}

.debug-info {
  background: rgba(241, 196, 15, 0.1);
  border-radius: 10px;
  padding: 15px;
  border-left: 4px solid #f1c40f;
}

.debug-info h3 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.debug-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  font-family: monospace;
  color: #7f8c8d;
}

.character-board-placeholder {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 40px;
  text-align: center;
  color: #7f8c8d;
  font-size: 1.2rem;
  border: 2px dashed #bdc3c7;
}

.character-board-placeholder p {
  margin-bottom: 10px;
}

.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20000;
}

.error-content {
  background: white;
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  max-width: 400px;
}

.error-content h3 {
  color: #e74c3c;
  margin-bottom: 15px;
}

.error-content p {
  color: #2c3e50;
  margin-bottom: 20px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>