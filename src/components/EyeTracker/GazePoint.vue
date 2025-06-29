<template>
  <div 
    v-if="shouldShow"
    ref="gazePoint"
    class="gaze-point"
    :class="{ 
      'active': isTracking,
      'calibration-mode': isCalibrating 
    }"
    :style="gazePointStyle"
  >
    <div class="gaze-point-inner"></div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  gazeData: {
    type: Object,
    required: true
  },
  isTracking: {
    type: Boolean,
    default: false
  },
  isCalibrating: {
    type: Boolean,
    default: false
  },
  showGazePoint: {
    type: Boolean,
    default: true
  },
  size: {
    type: Number,
    default: 15
  }
})

const gazePoint = ref(null)

// 表示条件
const shouldShow = computed(() => {
  return props.showGazePoint && (props.isTracking || props.isCalibrating)
})

// 視線ポイントのスタイル
const gazePointStyle = computed(() => {
  const baseStyle = {
    left: `${props.gazeData.x}px`,
    top: `${props.gazeData.y}px`,
    width: `${props.size}px`,
    height: `${props.size}px`,
    transform: 'translate(-50%, -50%)'
  }

  // キャリブレーション中は特別なスタイル
  if (props.isCalibrating) {
    return {
      ...baseStyle,
      background: '#ff6b6b',
      border: '3px solid #ffffff',
      boxShadow: '0 0 20px rgba(255, 107, 107, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.3)'
    }
  }

  return baseStyle
})
</script>

<style scoped>
.gaze-point {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  border-radius: 50%;
  background: #3498db;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 15px rgba(52, 152, 219, 0.6);
  transition: all 0.1s ease;
  opacity: 0;
}

.gaze-point.active {
  opacity: 1;
}

.gaze-point.calibration-mode {
  opacity: 1;
  animation: pulse-calibration 1s ease-in-out infinite;
}

.gaze-point-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
}

@keyframes pulse-calibration {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.8;
  }
}

/* より目立つアニメーション */
.gaze-point.active {
  animation: gaze-pulse 2s ease-in-out infinite;
}

@keyframes gaze-pulse {
  0%, 100% { 
    box-shadow: 0 0 15px rgba(52, 152, 219, 0.6);
  }
  50% { 
    box-shadow: 0 0 25px rgba(52, 152, 219, 0.9);
  }
}
</style>