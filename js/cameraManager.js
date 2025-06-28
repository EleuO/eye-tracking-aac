class CameraManager {
    constructor() {
        this.cameraSelect = document.getElementById('cameraSelect');
        this.refreshCameraBtn = document.getElementById('refreshCameraBtn');
        this.cameraVideo = document.getElementById('cameraVideo');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.calibrationStatus = document.getElementById('calibrationStatus');
        
        this.availableCameras = [];
        this.currentStream = null;
        this.selectedDeviceId = null;
        
        this.init();
    }
    
    async init() {
        try {
            await this.detectCameras();
            this.setupEventListeners();
            this.updateStatus('カメラを選択してください', 'waiting');
        } catch (error) {
            console.error('カメラマネージャーの初期化エラー:', error);
            this.updateStatus('カメラアクセスエラー', 'error');
        }
    }
    
    setupEventListeners() {
        this.cameraSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.selectCamera(e.target.value);
            } else {
                this.stopCamera();
            }
        });
        
        this.refreshCameraBtn.addEventListener('click', () => {
            this.refreshCameras();
        });
        
        this.cameraVideo.addEventListener('loadedmetadata', () => {
            console.log('カメラストリーム準備完了');
            this.updateStatus('カメラ接続完了', 'connected');
            this.enableCalibrationButton();
        });
        
        this.cameraVideo.addEventListener('error', (e) => {
            console.error('カメラストリームエラー:', e);
            this.updateStatus('カメラストリームエラー', 'error');
        });
    }
    
    async detectCameras() {
        try {
            // まずメディアデバイスの許可を求める
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            
            // デバイス一覧を取得
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            this.availableCameras = videoDevices;
            this.populateCameraSelect();
            
            console.log('検出されたカメラ:', videoDevices.length);
            
        } catch (error) {
            console.error('カメラ検出エラー:', error);
            this.updateStatus('カメラアクセス許可が必要です', 'error');
            throw error;
        }
    }
    
    populateCameraSelect() {
        // 既存のオプションをクリア
        this.cameraSelect.innerHTML = '<option value="">カメラを選択してください</option>';
        
        this.availableCameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            
            // カメラ名の表示を改善
            let cameraName = camera.label || `カメラ ${index + 1}`;
            
            // 一般的なカメラ名を日本語化
            if (cameraName.includes('FaceTime')) {
                cameraName = 'FaceTime HDカメラ';
            } else if (cameraName.includes('Built-in')) {
                cameraName = '内蔵カメラ';
            } else if (cameraName.includes('External') || cameraName.includes('USB')) {
                cameraName = '外部カメラ (USB)';
            }
            
            option.textContent = cameraName;
            this.cameraSelect.appendChild(option);
        });
        
        // デフォルトで最初のカメラを選択
        if (this.availableCameras.length > 0) {
            this.cameraSelect.value = this.availableCameras[0].deviceId;
            this.selectCamera(this.availableCameras[0].deviceId);
        }
    }
    
    async selectCamera(deviceId) {
        try {
            this.updateStatus('カメラを起動中...', 'connecting');
            
            // 既存のストリームを停止
            this.stopCamera();
            
            // 新しいストリームを開始
            const constraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 30, min: 15 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.currentStream = stream;
            this.selectedDeviceId = deviceId;
            this.cameraVideo.srcObject = stream;
            
            // ストリーム情報をログ出力
            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            console.log('カメラ設定:', {
                width: settings.width,
                height: settings.height,
                frameRate: settings.frameRate,
                deviceId: settings.deviceId
            });
            
            // カメラが実際に開始されるのを待つ
            return new Promise((resolve) => {
                this.cameraVideo.onloadedmetadata = () => {
                    this.cameraVideo.play();
                    resolve();
                };
            });
            
        } catch (error) {
            console.error('カメラ選択エラー:', error);
            this.updateStatus('カメラの起動に失敗しました', 'error');
            this.disableCalibrationButton();
            throw error;
        }
    }
    
    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => {
                track.stop();
            });
            this.currentStream = null;
        }
        
        if (this.cameraVideo.srcObject) {
            this.cameraVideo.srcObject = null;
        }
        
        this.selectedDeviceId = null;
        this.updateStatus('カメラを選択してください', 'waiting');
        this.disableCalibrationButton();
    }
    
    async refreshCameras() {
        try {
            this.updateStatus('カメラを検索中...', 'connecting');
            this.refreshCameraBtn.disabled = true;
            
            await this.detectCameras();
            
            // 現在選択されていたカメラを再選択
            if (this.selectedDeviceId) {
                const stillExists = this.availableCameras.find(
                    camera => camera.deviceId === this.selectedDeviceId
                );
                if (stillExists) {
                    this.cameraSelect.value = this.selectedDeviceId;
                } else {
                    this.stopCamera();
                }
            }
            
        } catch (error) {
            console.error('カメラリフレッシュエラー:', error);
            this.updateStatus('カメラの検索に失敗しました', 'error');
        } finally {
            this.refreshCameraBtn.disabled = false;
        }
    }
    
    updateStatus(message, type) {
        this.statusText.textContent = message;
        this.calibrationStatus.textContent = message;
        
        // ステータスインジケーターの更新
        this.statusIndicator.className = 'status-indicator';
        this.calibrationStatus.className = 'calibration-status';
        
        switch (type) {
            case 'connected':
                this.statusIndicator.classList.add('connected');
                this.calibrationStatus.classList.add('ready');
                break;
            case 'calibrated':
                this.statusIndicator.classList.add('calibrated');
                this.calibrationStatus.classList.add('calibrated');
                break;
            case 'connecting':
            case 'calibrating':
                this.calibrationStatus.classList.add('calibrating');
                break;
            case 'error':
                // デフォルトの赤いインジケーター
                break;
            case 'waiting':
            default:
                // デフォルトスタイル
                break;
        }
    }
    
    enableCalibrationButton() {
        const calibrationBtn = document.getElementById('startCalibrationBtn');
        const resetBtn = document.getElementById('resetCalibrationBtn');
        
        if (calibrationBtn) {
            calibrationBtn.disabled = false;
        }
        if (resetBtn) {
            resetBtn.disabled = false;
        }
    }
    
    disableCalibrationButton() {
        const calibrationBtn = document.getElementById('startCalibrationBtn');
        const resetBtn = document.getElementById('resetCalibrationBtn');
        
        if (calibrationBtn) {
            calibrationBtn.disabled = true;
        }
        if (resetBtn) {
            resetBtn.disabled = true;
        }
    }
    
    getCameraStream() {
        return this.currentStream;
    }
    
    getCameraVideo() {
        return this.cameraVideo;
    }
    
    getSelectedDevice() {
        return this.availableCameras.find(
            camera => camera.deviceId === this.selectedDeviceId
        );
    }
    
    isCameraActive() {
        return this.currentStream !== null && 
               this.cameraVideo.srcObject !== null &&
               this.cameraVideo.readyState >= 2;
    }
    
    getCameraSettings() {
        if (!this.currentStream) return null;
        
        const videoTrack = this.currentStream.getVideoTracks()[0];
        return videoTrack ? videoTrack.getSettings() : null;
    }
    
    // カメラ品質の調整
    async adjustCameraQuality(quality = 'high') {
        if (!this.selectedDeviceId) return;
        
        const qualitySettings = {
            low: { width: 640, height: 480, frameRate: 15 },
            medium: { width: 960, height: 720, frameRate: 24 },
            high: { width: 1280, height: 720, frameRate: 30 },
            ultra: { width: 1920, height: 1080, frameRate: 30 }
        };
        
        const settings = qualitySettings[quality] || qualitySettings.high;
        
        try {
            const constraints = {
                video: {
                    deviceId: { exact: this.selectedDeviceId },
                    width: { ideal: settings.width },
                    height: { ideal: settings.height },
                    frameRate: { ideal: settings.frameRate }
                }
            };
            
            await this.selectCamera(this.selectedDeviceId);
            console.log(`カメラ品質を${quality}に調整しました`);
            
        } catch (error) {
            console.error('カメラ品質調整エラー:', error);
        }
    }
}