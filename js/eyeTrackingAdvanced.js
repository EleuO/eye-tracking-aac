class AdvancedEyeTracker {
    constructor() {
        this.calibrationOverlay = document.getElementById('calibrationOverlay');
        this.calibrationTitle = document.getElementById('calibrationTitle');
        this.calibrationInstructions = document.getElementById('calibrationInstructions');
        this.calibrationStep = document.getElementById('calibrationStep');
        this.calibrationTotal = document.getElementById('calibrationTotal');
        this.calibrationPointsContainer = document.getElementById('calibrationPointsContainer');
        this.cancelCalibrationBtn = document.getElementById('cancelCalibrationBtn');
        this.gazePoint = document.getElementById('gazePoint');
        this.progressIndicator = document.getElementById('progressIndicator');
        
        // キャリブレーション設定
        this.calibrationPoints = this.generateCalibrationPoints();
        this.currentCalibrationIndex = 0;
        this.isCalibrating = false;
        this.isCalibrated = false;
        this.isTracking = false;
        
        // 視線データ管理
        this.gazeHistory = [];
        this.smoothedGaze = { x: 0, y: 0 };
        this.smoothingFactor = 0.3;
        this.maxHistoryLength = 10;
        
        // ドウェル管理
        this.dwellTime = 1500;
        this.currentTarget = null;
        this.dwellStartTime = null;
        this.dwellProgress = 0;
        this.dwellThreshold = 50; // ピクセル
        
        // 設定
        this.settings = {
            showGazePoint: true,
            gazePointSize: 10,
            enableSmoothing: true,
            dwellTime: 1500,
            calibrationAccuracy: 0.8
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.initializeWebGazer();
    }
    
    setupEventListeners() {
        // キャリブレーションボタン
        document.getElementById('startCalibrationBtn')?.addEventListener('click', () => {
            this.startCalibration();
        });
        
        document.getElementById('resetCalibrationBtn')?.addEventListener('click', () => {
            this.resetCalibration();
        });
        
        this.cancelCalibrationBtn?.addEventListener('click', () => {
            this.cancelCalibration();
        });
        
        // ドウェル時間設定
        const dwellTimeSlider = document.getElementById('dwellTime');
        const dwellTimeValue = document.getElementById('dwellTimeValue');
        
        if (dwellTimeSlider && dwellTimeValue) {
            dwellTimeSlider.addEventListener('input', (e) => {
                this.dwellTime = parseInt(e.target.value);
                dwellTimeValue.textContent = (this.dwellTime / 1000).toFixed(1) + '秒';
                this.settings.dwellTime = this.dwellTime;
                this.saveSettings();
            });
        }
        
        // ページの可視性変更イベント
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTracking();
            } else if (this.isCalibrated) {
                this.resumeTracking();
            }
        });
    }
    
    async initializeWebGazer() {
        try {
            if (typeof webgazer === 'undefined') {
                throw new Error('WebGazer.jsが読み込まれていません');
            }
            
            // WebGazerの初期設定
            await webgazer.setRegression('ridge')
                .setTracker('clmtrackr')
                .setGazeListener((data, timestamp) => {
                    if (data && this.isTracking) {
                        this.handleGazeData(data, timestamp);
                    }
                })
                .begin();
            
            // UIを非表示に
            webgazer.showVideoPreview(false);
            webgazer.showPredictionPoints(false);
            webgazer.showFaceOverlay(false);
            webgazer.showFaceFeedbackBox(false);
            
            console.log('WebGazer初期化完了');
            
        } catch (error) {
            console.error('WebGazer初期化エラー:', error);
            window.cameraManager?.updateStatus('視線追跡の初期化に失敗しました', 'error');
        }
    }
    
    generateCalibrationPoints() {
        // 13点キャリブレーション（より正確）
        const margin = 0.1; // 画面端からのマージン（10%）
        const points = [
            // 四隅
            { x: margin, y: margin },
            { x: 1 - margin, y: margin },
            { x: margin, y: 1 - margin },
            { x: 1 - margin, y: 1 - margin },
            
            // 中央の十字
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: margin },
            { x: 0.5, y: 1 - margin },
            { x: margin, y: 0.5 },
            { x: 1 - margin, y: 0.5 },
            
            // 中間点
            { x: 0.25, y: 0.25 },
            { x: 0.75, y: 0.25 },
            { x: 0.25, y: 0.75 },
            { x: 0.75, y: 0.75 }
        ];
        
        return points;
    }
    
    async startCalibration() {
        if (!window.cameraManager?.isCameraActive()) {
            alert('カメラが起動していません。先にカメラを選択してください。');
            return;
        }
        
        this.isCalibrating = true;
        this.currentCalibrationIndex = 0;
        this.calibrationOverlay.classList.add('active');
        this.calibrationTotal.textContent = this.calibrationPoints.length;
        
        window.cameraManager?.updateStatus('キャリブレーション中...', 'calibrating');
        
        // WebGazerのデータをクリア
        if (typeof webgazer !== 'undefined') {
            webgazer.clearData();
        }
        
        await this.showCalibrationPoint();
    }
    
    async showCalibrationPoint() {
        if (this.currentCalibrationIndex >= this.calibrationPoints.length) {
            await this.completeCalibration();
            return;
        }
        
        const point = this.calibrationPoints[this.currentCalibrationIndex];
        
        // 前のポイントを削除
        const existingPoint = this.calibrationPointsContainer.querySelector('.calibration-point');
        if (existingPoint) {
            existingPoint.remove();
        }
        
        // 新しいポイントを作成
        const pointElement = document.createElement('div');
        pointElement.className = 'calibration-point';
        pointElement.style.left = (point.x * 100) + '%';
        pointElement.style.top = (point.y * 100) + '%';
        
        this.calibrationPointsContainer.appendChild(pointElement);
        
        // ステップを更新
        this.calibrationStep.textContent = this.currentCalibrationIndex + 1;
        
        // 音声フィードバック
        this.speakCalibrationInstruction(this.currentCalibrationIndex + 1);
        
        // クリックイベントまたは自動進行
        let timeoutId;
        const proceed = () => {
            clearTimeout(timeoutId);
            this.recordCalibrationPoint(point);
            pointElement.classList.add('completed');
            
            setTimeout(() => {
                this.currentCalibrationIndex++;
                this.showCalibrationPoint();
            }, 500);
        };
        
        pointElement.addEventListener('click', proceed);
        
        // 3秒後に自動進行
        timeoutId = setTimeout(proceed, 3000);
    }
    
    recordCalibrationPoint(point) {
        if (typeof webgazer !== 'undefined') {
            const screenX = point.x * window.innerWidth;
            const screenY = point.y * window.innerHeight;
            
            // 複数回記録して精度を向上
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    webgazer.recordScreenPosition(screenX, screenY);
                }, i * 50);
            }
        }
    }
    
    async completeCalibration() {
        this.isCalibrating = false;
        this.isCalibrated = true;
        this.isTracking = true;
        
        this.calibrationOverlay.classList.remove('active');
        
        // キャリブレーション精度をテスト
        const accuracy = await this.testCalibrationAccuracy();
        
        if (accuracy < this.settings.calibrationAccuracy) {
            const retry = confirm(`キャリブレーション精度: ${(accuracy * 100).toFixed(1)}%\n精度が低いです。再度キャリブレーションしますか？`);
            if (retry) {
                this.resetCalibration();
                setTimeout(() => this.startCalibration(), 500);
                return;
            }
        }
        
        window.cameraManager?.updateStatus('キャリブレーション完了 - 視線追跡開始', 'calibrated');
        this.showGazePoint();
        this.enableInterface();
        
        // 完了音
        this.playCalibrationComplete();
    }
    
    async testCalibrationAccuracy() {
        // 簡易的な精度テスト
        return new Promise((resolve) => {
            let testPoints = 0;
            let accuratePoints = 0;
            const testPositions = [
                { x: 0.2, y: 0.2 },
                { x: 0.8, y: 0.2 },
                { x: 0.5, y: 0.5 },
                { x: 0.2, y: 0.8 },
                { x: 0.8, y: 0.8 }
            ];
            
            const testGaze = (data) => {
                if (testPoints < testPositions.length) {
                    const expectedPos = testPositions[testPoints];
                    const expectedX = expectedPos.x * window.innerWidth;
                    const expectedY = expectedPos.y * window.innerHeight;
                    
                    const distance = Math.sqrt(
                        Math.pow(data.x - expectedX, 2) + 
                        Math.pow(data.y - expectedY, 2)
                    );
                    
                    if (distance < 100) { // 100px以内なら正確
                        accuratePoints++;
                    }
                    
                    testPoints++;
                    
                    if (testPoints >= testPositions.length) {
                        webgazer.removeGazeListener(testGaze);
                        resolve(accuratePoints / testPositions.length);
                    }
                }
            };
            
            if (typeof webgazer !== 'undefined') {
                webgazer.setGazeListener(testGaze);
                
                // タイムアウト
                setTimeout(() => {
                    webgazer.removeGazeListener(testGaze);
                    resolve(0.5); // デフォルト値
                }, 5000);
            } else {
                resolve(0.5);
            }
        });
    }
    
    cancelCalibration() {
        this.isCalibrating = false;
        this.calibrationOverlay.classList.remove('active');
        window.cameraManager?.updateStatus('キャリブレーションがキャンセルされました', 'connected');
    }
    
    resetCalibration() {
        this.isCalibrated = false;
        this.isTracking = false;
        this.currentCalibrationIndex = 0;
        this.hideGazePoint();
        this.disableInterface();
        
        if (typeof webgazer !== 'undefined') {
            webgazer.clearData();
        }
        
        window.cameraManager?.updateStatus('キャリブレーションをリセットしました', 'connected');
    }
    
    handleGazeData(data, timestamp) {
        // データの有効性チェック
        if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') {
            return;
        }
        
        // 画面範囲外のデータを除外
        if (data.x < 0 || data.x > window.innerWidth || 
            data.y < 0 || data.y > window.innerHeight) {
            return;
        }
        
        // 履歴に追加
        this.gazeHistory.push({ ...data, timestamp });
        if (this.gazeHistory.length > this.maxHistoryLength) {
            this.gazeHistory.shift();
        }
        
        // スムージング適用
        if (this.settings.enableSmoothing) {
            this.smoothedGaze = this.applySmoothingFilter(data);
        } else {
            this.smoothedGaze = data;
        }
        
        // ガゼポイント更新
        this.updateGazePoint(this.smoothedGaze);
        
        // 文字選択処理
        this.processCharacterSelection(this.smoothedGaze);
    }
    
    applySmoothingFilter(newData) {
        if (this.gazeHistory.length < 2) {
            return newData;
        }
        
        const alpha = this.smoothingFactor;
        return {
            x: alpha * newData.x + (1 - alpha) * this.smoothedGaze.x,
            y: alpha * newData.y + (1 - alpha) * this.smoothedGaze.y
        };
    }
    
    updateGazePoint(gazeData) {
        if (!this.settings.showGazePoint || !this.gazePoint) return;
        
        this.gazePoint.style.left = gazeData.x + 'px';
        this.gazePoint.style.top = gazeData.y + 'px';
        this.gazePoint.style.width = this.settings.gazePointSize + 'px';
        this.gazePoint.style.height = this.settings.gazePointSize + 'px';
    }
    
    processCharacterSelection(gazeData) {
        const element = document.elementFromPoint(gazeData.x, gazeData.y);
        
        if (this.isSelectableElement(element)) {
            if (this.currentTarget === element) {
                // 同じ要素を見続けている
                const elapsedTime = Date.now() - this.dwellStartTime;
                this.dwellProgress = Math.min(elapsedTime / this.dwellTime, 1);
                
                this.updateDwellProgress(element, this.dwellProgress);
                
                if (this.dwellProgress >= 1) {
                    this.selectElement(element);
                    this.resetDwell();
                }
            } else {
                // 新しい要素
                this.resetDwell();
                this.startDwell(element);
            }
        } else {
            // 選択可能な要素ではない
            this.resetDwell();
        }
    }
    
    isSelectableElement(element) {
        return element && (
            element.classList.contains('char-btn') ||
            element.classList.contains('function-btn') ||
            element.classList.contains('preset-btn') ||
            element.classList.contains('primary-btn') ||
            element.classList.contains('control-btn')
        );
    }
    
    startDwell(element) {
        this.currentTarget = element;
        this.dwellStartTime = Date.now();
        this.dwellProgress = 0;
        
        element.classList.add('gaze-hover');
        this.showProgressIndicator(element);
    }
    
    resetDwell() {
        if (this.currentTarget) {
            this.currentTarget.classList.remove('gaze-hover', 'gaze-selecting');
            this.hideProgressIndicator();
            this.currentTarget = null;
        }
        this.dwellStartTime = null;
        this.dwellProgress = 0;
    }
    
    updateDwellProgress(element, progress) {
        if (progress > 0.5) {
            element.classList.add('gaze-selecting');
        }
        
        this.updateProgressIndicator(progress);
    }
    
    selectElement(element) {
        element.classList.add('selected');
        element.classList.remove('gaze-hover', 'gaze-selecting');
        
        // 選択音
        this.playSelectionSound();
        
        // 要素タイプに応じた処理
        if (element.classList.contains('char-btn')) {
            const char = element.textContent;
            window.characterBoard?.addCharacter(char);
        } else if (element.classList.contains('function-btn')) {
            const action = element.dataset.action;
            const char = element.dataset.char;
            
            if (action) {
                window.characterBoard?.executeAction(action);
            } else if (char) {
                window.characterBoard?.addCharacter(char);
            }
        } else if (element.classList.contains('preset-btn')) {
            const text = element.dataset.text;
            if (text) {
                window.characterBoard?.setMessage(text);
            }
        } else {
            // ボタンクリックをシミュレート
            element.click();
        }
        
        // アニメーション後にクラスを削除
        setTimeout(() => {
            element.classList.remove('selected');
        }, 600);
    }
    
    showProgressIndicator(element) {
        const rect = element.getBoundingClientRect();
        this.progressIndicator.style.left = (rect.left + rect.width / 2) + 'px';
        this.progressIndicator.style.top = (rect.top + rect.height / 2) + 'px';
        this.progressIndicator.classList.add('active');
    }
    
    hideProgressIndicator() {
        this.progressIndicator.classList.remove('active');
    }
    
    updateProgressIndicator(progress) {
        const circle = this.progressIndicator.querySelector('.progress-fill');
        const text = this.progressIndicator.querySelector('.progress-text');
        
        if (circle && text) {
            const circumference = 157;
            const offset = circumference - (progress * circumference);
            circle.style.strokeDashoffset = offset;
            text.textContent = Math.round(progress * 100) + '%';
        }
    }
    
    showGazePoint() {
        if (this.settings.showGazePoint) {
            this.gazePoint.classList.add('active');
        }
    }
    
    hideGazePoint() {
        this.gazePoint.classList.remove('active');
    }
    
    pauseTracking() {
        this.isTracking = false;
        this.resetDwell();
        this.hideGazePoint();
    }
    
    resumeTracking() {
        if (this.isCalibrated) {
            this.isTracking = true;
            this.showGazePoint();
        }
    }
    
    enableInterface() {
        // 文字盤とボタンを有効化
        document.getElementById('messageOutput').disabled = false;
        document.getElementById('speakBtn').disabled = false;
        document.getElementById('copyBtn').disabled = false;
        document.getElementById('addPresetBtn').disabled = false;
        
        const charButtons = document.querySelectorAll('.char-btn, .function-btn');
        charButtons.forEach(btn => btn.disabled = false);
    }
    
    disableInterface() {
        // 文字盤とボタンを無効化
        document.getElementById('speakBtn').disabled = true;
        document.getElementById('copyBtn').disabled = true;
        document.getElementById('addPresetBtn').disabled = true;
    }
    
    speakCalibrationInstruction(step) {
        if (window.speechEngine) {
            window.speechEngine.speak(`キャリブレーション ${step} 番目の点を見つめてください`);
        }
    }
    
    playCalibrationComplete() {
        if (window.speechEngine) {
            window.speechEngine.speak('キャリブレーションが完了しました。視線で文字を選択できます。');
        }
    }
    
    playSelectionSound() {
        // 簡易的な選択音（Web Audio APIを使用）
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // 音声再生できない場合は無視
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('aac_eye_tracking_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                this.applySettings();
            }
        } catch (error) {
            console.error('視線追跡設定の読み込みエラー:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('aac_eye_tracking_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('視線追跡設定の保存エラー:', error);
        }
    }
    
    applySettings() {
        this.dwellTime = this.settings.dwellTime;
        
        // UI要素の更新
        const dwellTimeSlider = document.getElementById('dwellTime');
        const dwellTimeValue = document.getElementById('dwellTimeValue');
        
        if (dwellTimeSlider) {
            dwellTimeSlider.value = this.dwellTime;
        }
        if (dwellTimeValue) {
            dwellTimeValue.textContent = (this.dwellTime / 1000).toFixed(1) + '秒';
        }
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.applySettings();
        this.saveSettings();
    }
}