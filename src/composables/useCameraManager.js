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
      
      // デフォルトカメラを選択して自動アクティブ化
      if (cameras.value.length > 0 && !selectedCamera.value) {
        console.log('🎯 デフォルトカメラを自動選択中...', cameras.value[0].label)
        await selectCamera(cameras.value[0])
        console.log('✅ デフォルトカメラの自動アクティブ化完了')
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
      
      // WebGazerキャリブレーション保持でカメラストリーム切り替え
      if (typeof webgazer !== 'undefined' && webgazer.isReady()) {
        console.log('🔧 WebGazerカメラストリーム切り替え中...')
        
        try {
          // 既存ストリームを停止
          stream.getTracks().forEach(track => track.stop())
          
          // 新しいカメラストリームを取得
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: camera.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
          })
          
          // WebGazerのビデオ要素を直接更新（キャリブレーションデータ保持）
          const videoPreview = document.getElementById('webgazerVideoContainer')
          if (videoPreview) {
            const videoElement = videoPreview.querySelector('video')
            if (videoElement) {
              videoElement.srcObject = newStream
              await videoElement.play()
              console.log('✅ WebGazerビデオストリーム更新完了')
            }
          }
          
          // ストリームを更新後、WebGazerが程定するまで少し待つ
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          console.log('✅ WebGazerカメラ切り替え完了（キャリブレーション保持）')
          
        } catch (err) {
          console.log('⚠️ WebGazerカメラ切り替えエラー:', err)
          
          // フォールバック: 従来の再初期化方式
          console.log('🔄 フォールバック: WebGazer再初期化を実行...')
          try {
            await webgazer.end()
            await new Promise(resolve => setTimeout(resolve, 1000))
            await webgazer.begin()
            console.log('✅ WebGazerフォールバック再初期化完了')
          } catch (fallbackErr) {
            console.error('❌ WebGazerフォールバック失敗:', fallbackErr)
          }
        }
      } else {
        console.log('⚠️ WebGazerが準備できていませんが、カメラは選択されました')
      }
      
      // 注意: ストリームは上記でWebGazer更新時に既に停止済み
      
      isCameraActive.value = true
      console.log('✅ カメラ選択完了:', camera.label)
      console.log('🎯 キャリブレーションボタンが有効になりました！ isCameraActive:', isCameraActive.value)
      
    } catch (err) {
      console.error('❌ カメラ選択エラー:', err)
      error.value = `カメラの選択に失敗しました: ${err.message}`
      isCameraActive.value = false
      
      // エラー後の自動リトライ機能
      console.log('🔄 5秒後にカメラ再選択を試行します...')
      setTimeout(async () => {
        if (!isCameraActive.value && cameras.value.length > 0) {
          console.log('🔄 カメラ自動リトライ中...')
          try {
            await selectCamera(cameras.value[0])
          } catch (retryErr) {
            console.error('❌ リトライ失敗:', retryErr)
          }
        }
      }, 5000)
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

  // カメラ状態をリセットして再初期化
  const resetCameraState = async () => {
    console.log('🔄 カメラ状態をリセット中...')
    isCameraActive.value = false
    error.value = null
    
    if (cameras.value.length > 0) {
      try {
        await selectCamera(cameras.value[0])
        console.log('✅ カメラ状態リセット完了')
      } catch (err) {
        console.error('❌ カメラリセット失敗:', err)
      }
    }
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
    initializeCameras,
    resetCameraState
  }
}