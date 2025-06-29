<template>
  <div v-if="isCalibrating" class="calibration-overlay">
    <div class="calibration-content">
      <!-- ヘッダー情報 -->
      <div class="calibration-header">
        <h2 class="calibration-title">視線キャリブレーション</h2>
        <div class="calibration-progress">
          <span class="progress-text">
            {{ currentIndex + 1 }} / {{ calibrationPoints.length }}
          </span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progress + '%' }"
            ></div>
          </div>
        </div>
        <button 
          @click="$emit('cancel')"
          class="cancel-btn"
        >
          キャンセル
        </button>
      </div>

      <!-- 指示テキスト -->
      <div class="calibration-instructions">
        <p class="instruction-text">
          <span class="highlight">赤い円</span>を見つめてください
        </p>
        <div class="status-info">
          <div class="distance-display">
            距離: <span class="distance-value">{{ Math.round(gazeTracking.distance) }}px</span>
            <span v-if="gazeTracking.distance < 60" class="status-good">✓ OK</span>
            <span v-else class="status-need">要調整</span>
          </div>
          <div class="stability-display">
            安定性: 
            <div class="stability-bar">
              <div 
                class="stability-fill"
                :style="{ width: (gazeTracking.progress * 100) + '%' }"
              ></div>
            </div>
            {{ Math.round(gazeTracking.progress * 100) }}%
          </div>
        </div>
      </div>

      <!-- キャリブレーションポイント -->
      <div class="calibration-points">
        <div
          v-if="currentPoint"
          class="calibration-point"
          :class="{
            'stable': gazeTracking.isStable,
            'completing': gazeTracking.progress > 0.8
          }"
          :style="calibrationPointStyle"
        >
          <div class="point-inner"></div>
          <div class="point-ring"></div>
          
          <!-- プログレスリング -->
          <svg class="progress-ring" width="60" height="60">
            <circle
              cx="30"
              cy="30" 
              r="25"
              stroke="rgba(255,255,255,0.3)"
              stroke-width="3"
              fill="none"
            />
            <circle
              cx="30"
              cy="30"
              r="25"
              stroke="#ffffff"
              stroke-width="3"
              fill="none"
              stroke-dasharray="157"
              :stroke-dashoffset="157 - (gazeTracking.progress * 157)"
              class="progress-circle"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isCalibrating: {
    type: Boolean,
    required: true
  },
  currentIndex: {
    type: Number,
    required: true
  },
  currentPoint: {
    type: Object,
    default: null
  },
  calibrationPoints: {
    type: Array,
    required: true
  },
  gazeTracking: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['cancel'])

// 進行度計算
const progress = computed(() => {
  return Math.round((props.currentIndex / props.calibrationPoints.length) * 100)
})

// キャリブレーションポイントのスタイル
const calibrationPointStyle = computed(() => {
  if (!props.currentPoint) return {}
  
  return {
    left: (props.currentPoint.x * 100) + '%',
    top: (props.currentPoint.y * 100) + '%'
  }
})
</script>

<style scoped>
.calibration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calibration-content {
  position: relative;
  width: 100%;
  height: 100%;
}

.calibration-header {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  color: white;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.calibration-title {
  font-size: 2rem;
  margin-bottom: 10px;
}

.calibration-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 1.2rem;
  font-weight: bold;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: width 0.3s ease;
}

.cancel-btn {
  padding: 10px 20px;
  background: rgba(231, 76, 60, 0.8);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s ease;
}

.cancel-btn:hover {
  background: rgba(231, 76, 60, 1);
}

.calibration-instructions {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  color: white;
  z-index: 10001;
}

.instruction-text {
  font-size: 1.5rem;
  margin-bottom: 20px;
}

.highlight {
  color: #ff6b6b;
  font-weight: bold;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.distance-display, .stability-display {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
}

.distance-value {
  font-weight: bold;
  color: #3498db;
}

.status-good {
  color: #2ecc71;
  font-weight: bold;
}

.status-need {
  color: #e74c3c;
  font-weight: bold;
}

.stability-bar {
  width: 100px;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.stability-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #2ecc71);
  transition: width 0.1s ease;
}

.calibration-points {
  position: relative;
  width: 100%;
  height: 100%;
}

.calibration-point {
  position: absolute;
  width: 40px;
  height: 40px;
  background: #ff6b6b;
  border: 3px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
  animation: pulse 1.5s ease-in-out infinite;
}

.calibration-point.stable {
  background: #f39c12;
  box-shadow: 0 0 25px rgba(243, 156, 18, 0.8);
  animation: none;
}

.calibration-point.completing {
  background: #2ecc71;
  box-shadow: 0 0 30px rgba(46, 204, 113, 0.8);
  transform: translate(-50%, -50%) scale(1.1);
}

.point-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.point-ring {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: ring-pulse 2s ease-in-out infinite;
}

.progress-ring {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 60px;
  height: 60px;
  transform: rotate(-90deg);
}

.progress-circle {
  transition: stroke-dashoffset 0.1s ease;
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.8;
  }
}

@keyframes ring-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.2;
  }
}

/* ===== レスポンシブ対応 ===== */
@media (max-width: 768px) {
  .calibration-header {
    top: 20px;
    padding: 0 20px;
  }
  
  .calibration-title {
    font-size: 1.5rem;
  }
  
  .progress-text {
    font-size: 1rem;
  }
  
  .progress-bar {
    width: 150px;
  }
  
  .calibration-instructions {
    bottom: 60px;
    padding: 0 20px;
  }
  
  .instruction-text {
    font-size: 1.2rem;
  }
  
  .distance-display, .stability-display {
    font-size: 0.9rem;
  }
  
  .stability-bar {
    width: 80px;
  }
  
  .calibration-point {
    width: 50px;
    height: 50px;
  }
  
  .point-inner {
    width: 25px;
    height: 25px;
  }
  
  .point-ring {
    top: -15px;
    left: -15px;
    width: 80px;
    height: 80px;
  }
  
  .progress-ring {
    top: -15px;
    left: -15px;
    width: 80px;
    height: 80px;
  }
}

@media (max-width: 480px) {
  .calibration-header {
    top: 10px;
    padding: 0 10px;
  }
  
  .calibration-title {
    font-size: 1.3rem;
  }
  
  .progress-text {
    font-size: 0.9rem;
  }
  
  .progress-bar {
    width: 120px;
    height: 6px;
  }
  
  .cancel-btn {
    padding: 8px 16px;
    font-size: 0.9rem;
  }
  
  .calibration-instructions {
    bottom: 40px;
    padding: 0 15px;
  }
  
  .instruction-text {
    font-size: 1rem;
  }
  
  .status-info {
    gap: 8px;
  }
  
  .distance-display, .stability-display {
    font-size: 0.8rem;
    gap: 8px;
  }
  
  .stability-bar {
    width: 60px;
  }
}

/* ===== 高DPI画面対応 ===== */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .calibration-point {
    box-shadow: 0 0 30px rgba(255, 107, 107, 0.9);
  }
  
  .calibration-point.stable {
    box-shadow: 0 0 35px rgba(243, 156, 18, 0.9);
  }
  
  .calibration-point.completing {
    box-shadow: 0 0 40px rgba(46, 204, 113, 0.9);
  }
}
</style>