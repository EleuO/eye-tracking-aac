import { ref, reactive } from 'vue'

export function useCameraManager() {
  // カメラ状態
  const cameras = ref([])
  const selectedCamera = ref(null)
  const isCameraActive = ref(false)
  const isLoading = ref(false)
  const error = ref(null)

  // カメラ情報
  const cameraInfo = reactive({
    deviceId: null,
    label: '',
    resolution: { width: 0, height: 0 }
  })

  // 利用可能なカメラを取得
  const getCameras = async () => {
    try {
      isLoading.value = true
      
      // まずカメラ許可を取得
      await navigator.mediaDevices.getUserMedia({ video: true })
      
      // デバイス一覧を取得
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      cameras.value = videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `カメラ ${cameras.value.length + 1}`,
        groupId: device.groupId
      }))
      
      console.log('📹 利用可能なカメラ:', cameras.value)
      
      // デフォルトカメラを選択
      if (cameras.value.length > 0 && !selectedCamera.value) {
        selectedCamera.value = cameras.value[0]
      }
      
    } catch (err) {
      console.error('❌ カメラ取得エラー:', err)
      error.value = 'カメラアクセスが拒否されました。ブラウザ設定でカメラ許可を確認してください。'
    } finally {
      isLoading.value = false
    }
  }

  // カメラを選択
  const selectCamera = async (camera) => {
    try {
      console.log('📹 カメラ選択開始:', camera.label)
      
      selectedCamera.value = camera
      cameraInfo.deviceId = camera.deviceId
      cameraInfo.label = camera.label
      
      // まず直接カメラストリームを取得してテスト
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: camera.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      // 解像度情報を取得
      const videoTrack = stream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()
      
      cameraInfo.resolution.width = settings.width || 0
      cameraInfo.resolution.height = settings.height || 0
      
      console.log('📹 カメラストリーム取得成功:', {
        label: camera.label,
        resolution: `${cameraInfo.resolution.width}x${cameraInfo.resolution.height}`,
        deviceId: camera.deviceId
      })
      
      // WebGazerが準備できていればカメラを設定
      if (typeof webgazer !== 'undefined' && webgazer.isReady()) {
        console.log('🔧 WebGazerにカメラを設定中...')
        
        await webgazer.setConstraints({
          video: {
            deviceId: { exact: camera.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
        
        console.log('✅ WebGazerカメラ設定完了')
      } else {
        console.log('⚠️ WebGazerが準備できていませんが、カメラは選択されました')
      }
      
      // ストリームを一旦停止（WebGazerが管理するため）
      stream.getTracks().forEach(track => track.stop())
      
      isCameraActive.value = true
      console.log('✅ カメラ選択完了:', camera.label)
      
    } catch (err) {
      console.error('❌ カメラ選択エラー:', err)
      error.value = `カメラの選択に失敗しました: ${err.message}`
      isCameraActive.value = false
    }
  }

  // カメラストリームの情報を取得
  const getCameraStream = async () => {
    try {
      if (!selectedCamera.value) return null
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedCamera.value.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      // 解像度情報を取得
      const videoTrack = stream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()
      
      cameraInfo.resolution.width = settings.width || 0
      cameraInfo.resolution.height = settings.height || 0
      
      console.log('📹 カメラストリーム情報:', {
        label: selectedCamera.value.label,
        resolution: `${cameraInfo.resolution.width}x${cameraInfo.resolution.height}`
      })
      
      return stream
      
    } catch (err) {
      console.error('❌ カメラストリーム取得エラー:', err)
      throw err
    }
  }

  // カメラを停止
  const stopCamera = () => {
    isCameraActive.value = false
    console.log('⏹️ カメラ停止')
  }

  // 初期化時にカメラ一覧を取得
  const initializeCameras = async () => {
    await getCameras()
  }

  return {
    // 状態
    cameras,
    selectedCamera,
    isCameraActive,
    isLoading,
    error,
    cameraInfo,
    
    // メソッド
    getCameras,
    selectCamera,
    getCameraStream,
    stopCamera,
    initializeCameras
  }
}