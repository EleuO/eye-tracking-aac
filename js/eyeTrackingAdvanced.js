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
        
        // キャリブレーション用のガゼリスナーを設定
        this.setupCalibrationGazeListener();
        
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
        
        // 視線距離表示エリアを追加
        const distanceIndicator = document.createElement('div');
        distanceIndicator.className = 'distance-indicator';
        pointElement.appendChild(distanceIndicator);
        
        this.calibrationPointsContainer.appendChild(pointElement);
        
        // ステップを更新
        this.calibrationStep.textContent = this.currentCalibrationIndex + 1;
        
        // 音声フィードバック
        this.speakCalibrationInstruction(this.currentCalibrationIndex + 1);
        
        // キャリブレーション中のガゼポイント表示を有効化
        this.showCalibrationGazePoint();
        
        // インタラクティブな進行システム
        this.startInteractiveCalibration(point, pointElement);
    }
    
    setupCalibrationGazeListener() {
        // キャリブレーション中の視線データ初期化
        this.calibrationGazeData = {
            currentPoint: null,
            gazeDistance: Infinity,
            isGazeStable: false,
            stableStartTime: null,
            requiredStableTime: 2000, // 2秒間安定（より厳密に）
            accuracyThreshold: 60, // 60px以内で安定判定
            progressLocked: false,
            gazeHistory: [], // 視線履歴
            lastValidGaze: null
        };
        
        // WebGazerのガゼリスナーを強制的に設定
        this.ensureGazeListener();
    }
    
    showCalibrationGazePoint() {
        if (this.gazePoint) {
            this.gazePoint.classList.add('active', 'calibration-mode');
            this.gazePoint.style.background = '#ff6b6b';
            this.gazePoint.style.borderColor = '#ffffff';
        }
    }
    
    hideCalibrationGazePoint() {
        if (this.gazePoint) {
            this.gazePoint.classList.remove('calibration-mode');
            this.gazePoint.style.background = '';
            this.gazePoint.style.borderColor = '';
        }
    }
    
    // 新しいメソッド: 視線データの有効性をチェック
    isValidGazeData(gazeData) {
        if (!gazeData || typeof gazeData.x !== 'number' || typeof gazeData.y !== 'number') {
            return false;
        }
        
        // 画面範囲内かチェック
        if (gazeData.x < 0 || gazeData.x > window.innerWidth || 
            gazeData.y < 0 || gazeData.y > window.innerHeight) {
            return false;
        }
        
        // 異常な値のチェック
        if (gazeData.x === 0 && gazeData.y === 0) {
            return false;
        }
        
        // 前回の視線と比較して異常なジャンプを検出
        if (this.calibrationGazeData.lastValidGaze) {
            const lastGaze = this.calibrationGazeData.lastValidGaze;
            const jumpDistance = Math.sqrt(
                Math.pow(gazeData.x - lastGaze.x, 2) + 
                Math.pow(gazeData.y - lastGaze.y, 2)
            );
            
            // 300px以上の急激な移動は異常とみなす
            if (jumpDistance > 300) {
                console.log(`異常な視線ジャンプを検出: ${Math.round(jumpDistance)}px`);
                return false;
            }
        }
        
        return true;
    }
    
    // 新しいメソッド: 視線履歴を更新
    updateGazeHistory(gazeData, distance) {
        const timestamp = Date.now();
        this.calibrationGazeData.gazeHistory.push({
            x: gazeData.x,
            y: gazeData.y,
            distance: distance,
            timestamp: timestamp
        });
        
        // 履歴は直近5秒分だけ保持
        const fiveSecondsAgo = timestamp - 5000;
        this.calibrationGazeData.gazeHistory = this.calibrationGazeData.gazeHistory.filter(
            entry => entry.timestamp > fiveSecondsAgo
        );
    }
    
    // 新しいメソッド: 視線安定性を厳密にチェック
    checkGazeStability(currentDistance) {
        const threshold = this.calibrationGazeData.accuracyThreshold;
        const history = this.calibrationGazeData.gazeHistory;
        
        // 現在の距離が闾値以内か
        if (currentDistance > threshold) {
            return false;
        }
        
        // 過去1秒間のデータをチェック
        const oneSecondAgo = Date.now() - 1000;
        const recentHistory = history.filter(entry => entry.timestamp > oneSecondAgo);
        
        // 十分なデータポイントがあるか（10Hzで収集していると仮定）
        if (recentHistory.length < 8) {
            return false;
        }
        
        // 過去1秒間の平均距離が闾値以内か
        const averageDistance = recentHistory.reduce((sum, entry) => sum + entry.distance, 0) / recentHistory.length;
        if (averageDistance > threshold) {
            return false;
        }
        
        // 大きな変動がないかチェック
        const maxDistance = Math.max(...recentHistory.map(entry => entry.distance));
        const minDistance = Math.min(...recentHistory.map(entry => entry.distance));
        const variability = maxDistance - minDistance;
        
        // 変動幅が40px以内なら安定とみなす
        return variability < 40;
    }
    
    // 新しいメソッド: ガゼリスナーの確実な設定
    ensureGazeListener() {
        if (typeof webgazer !== 'undefined') {
            // 既存のリスナーを一度クリア
            webgazer.clearGazeListener();
            
            // 新しいリスナーを設定
            webgazer.setGazeListener((data, timestamp) => {
                if (data && this.isTracking) {
                    this.handleGazeData(data, timestamp);
                }
            });
            
            console.log('キャリブレーション用ガゼリスナーを設定しました');
        }
    }
    
    // 新しいメソッド: 視線モニタリングを開始
    startGazeMonitoring() {
        console.log(`キャリブレーションポイント ${this.currentCalibrationIndex + 1} の視線モニタリングを開始`);
        console.log(`条件: ${this.calibrationGazeData.accuracyThreshold}px以内で${this.calibrationGazeData.requiredStableTime/1000}秒間安定`);
        
        // 視線データの受信確認
        const checkInterval = setInterval(() => {
            if (!this.calibrationGazeData.currentPoint) {
                clearInterval(checkInterval);
                return;
            }
            
            const recentData = this.calibrationGazeData.gazeHistory.filter(
                entry => Date.now() - entry.timestamp < 1000
            );
            
            if (recentData.length === 0) {
                console.warn('視線データが受信されていません。WebGazerの状態を確認してください。');
            }
        }, 2000);
    }
    
    processCalibrationGaze(gazeData) {
        if (!this.calibrationGazeData.currentPoint || this.calibrationGazeData.progressLocked) return;
        
        // 視線データの有効性を厳密にチェック
        if (!this.isValidGazeData(gazeData)) {
            console.log('無効な視線データを除外:', gazeData);
            return;
        }
        
        const point = this.calibrationGazeData.currentPoint;
        const targetX = point.x * window.innerWidth;
        const targetY = point.y * window.innerHeight;
        
        // 視線とターゲットの距離を計算
        const distance = Math.sqrt(
            Math.pow(gazeData.x - targetX, 2) + 
            Math.pow(gazeData.y - targetY, 2)
        );
        
        // 視線履歴を更新
        this.updateGazeHistory(gazeData, distance);
        
        this.calibrationGazeData.gazeDistance = distance;
        this.calibrationGazeData.lastValidGaze = gazeData;
        
        // 視覚的フィードバックを更新
        this.updateCalibrationFeedback(distance, gazeData);
        
        // 安定性をより厳密にチェック
        const isStableAndAccurate = this.checkGazeStability(distance);
        
        if (isStableAndAccurate) {
            if (!this.calibrationGazeData.isGazeStable) {
                this.calibrationGazeData.isGazeStable = true;
                this.calibrationGazeData.stableStartTime = Date.now();
                console.log(`安定した視線を検出: ${Math.round(distance)}px, ターゲット: ${Math.round(targetX)}, ${Math.round(targetY)}`);
            }
            
            const stableDuration = Date.now() - this.calibrationGazeData.stableStartTime;
            const progress = Math.min(stableDuration / this.calibrationGazeData.requiredStableTime, 1);
            
            this.updateCalibrationProgress(progress);
            
            // 進行条件: 2秒間安定 + 十分な精度
            if (progress >= 1) {
                console.log(`キャリブレーション点 ${this.currentCalibrationIndex + 1} 完了: ${Math.round(distance)}px精度`);
                this.calibrationGazeData.progressLocked = true; // 重複進行を防止
                this.proceedToNextCalibrationPoint();
            }
        } else {
            // 不安定な場合はリセット
            if (this.calibrationGazeData.isGazeStable) {
                console.log(`視線が不安定になりました: ${Math.round(distance)}px`);
            }
            this.calibrationGazeData.isGazeStable = false;
            this.calibrationGazeData.stableStartTime = null;
            this.updateCalibrationProgress(0);
        }
    }
    
    updateCalibrationFeedback(distance, gazeData) {
        const pointElement = document.querySelector('.calibration-point');
        const distanceIndicator = pointElement?.querySelector('.distance-indicator');
        
        if (!pointElement || !distanceIndicator) return;
        
        // より詳細な色分けとフィードバック
        let status = '';
        if (distance < 30) {
            pointElement.style.background = '#27ae60'; // 緑：非常に近い
            pointElement.style.boxShadow = '0 0 30px rgba(39, 174, 96, 0.8)';
            status = '優秀';
        } else if (distance < this.calibrationGazeData.accuracyThreshold) {
            pointElement.style.background = '#f39c12'; // オレンジ：許容範囲
            pointElement.style.boxShadow = '0 0 25px rgba(243, 156, 18, 0.8)';
            status = '良好';
        } else if (distance < 100) {
            pointElement.style.background = '#e74c3c'; // 赤：遠い
            pointElement.style.boxShadow = '0 0 20px rgba(231, 76, 60, 0.8)';
            status = '要調整';
        } else {
            pointElement.style.background = '#95a5a6'; // グレー：非常に遠い
            pointElement.style.boxShadow = '0 0 15px rgba(149, 165, 166, 0.6)';
            status = '検出失敗';
        }
        
        // 詳細な距離情報を表示
        distanceIndicator.innerHTML = `
            <div style="font-size: 10px; color: white;">${Math.round(distance)}px</div>
            <div style="font-size: 8px; color: ${distance < this.calibrationGazeData.accuracyThreshold ? '#27ae60' : '#e74c3c'};">${status}</div>
        `;
        
        // 視線座標も表示（デバッグ用）
        if (gazeData) {
            const point = this.calibrationGazeData.currentPoint;
            const targetX = point.x * window.innerWidth;
            const targetY = point.y * window.innerHeight;
            
            console.log(`視線: (${Math.round(gazeData.x)}, ${Math.round(gazeData.y)}) → ターゲット: (${Math.round(targetX)}, ${Math.round(targetY)}) = ${Math.round(distance)}px`);
        }
    }
    
    updateCalibrationProgress(progress) {
        const pointElement = document.querySelector('.calibration-point');
        if (!pointElement) return;
        
        // プログレスリングを更新または作成
        let progressRing = pointElement.querySelector('.progress-ring');
        if (!progressRing) {
            progressRing = document.createElement('div');
            progressRing.className = 'progress-ring';
            progressRing.innerHTML = `
                <svg width="40" height="40">
                    <circle cx="20" cy="20" r="15" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.3"/>
                    <circle cx="20" cy="20" r="15" stroke="#ffffff" stroke-width="3" fill="none" 
                            stroke-dasharray="94.25" stroke-dashoffset="94.25" class="progress-circle"/>
                </svg>
            `;
            pointElement.appendChild(progressRing);
        }
        
        const progressCircle = progressRing.querySelector('.progress-circle');
        if (progressCircle) {
            const circumference = 94.25;
            const offset = circumference - (progress * circumference);
            progressCircle.style.strokeDashoffset = offset;
        }
    }
    
    startInteractiveCalibration(point, pointElement) {
        this.calibrationGazeData.currentPoint = point;
        this.calibrationGazeData.isGazeStable = false;
        this.calibrationGazeData.stableStartTime = null;
        this.calibrationGazeData.progressLocked = false;
        
        // 緊急時のクリックフォールバック（デバッグ用）
        let clickCount = 0;
        pointElement.addEventListener('click', () => {
            clickCount++;
            if (clickCount >= 3) { // 3回クリックで強制進行
                console.log('緊急フォールバック: 3回クリックで進行');
                this.proceedToNextCalibrationPoint();
            } else {
                // 通常は視線での進行を促す
                console.log(`視線で${point.x * 100}%, ${point.y * 100}%の位置を見つめてください (クリック${clickCount}/3)`);
            }
        });
        
        // 視線データの監視を開始
        this.startGazeMonitoring();
    }
    
    proceedToNextCalibrationPoint() {
        const point = this.calibrationGazeData.currentPoint;
        if (!point || this.calibrationGazeData.progressLocked !== true) return;
        
        // 進行音
        this.playProgressSound();
        
        // キャリブレーションデータを記録
        this.recordCalibrationPoint(point);
        
        const pointElement = document.querySelector('.calibration-point');
        if (pointElement) {
            pointElement.classList.add('completed');
            pointElement.style.background = '#27ae60';
            pointElement.style.transform = 'translate(-50%, -50%) scale(1.2)';
        }
        
        // 次のポイントへ進む
        setTimeout(() => {
            this.currentCalibrationIndex++;
            this.calibrationGazeData.currentPoint = null;
            this.calibrationGazeData.progressLocked = false;
            this.showCalibrationPoint();
        }, 1000);
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
    
    playProgressSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // 音声再生できない場合は無視
        }
    }
    
    async completeCalibration() {
        this.isCalibrating = false;
        this.isCalibrated = true;
        this.isTracking = true;
        
        // キャリブレーションモードのガゼポイントを非表示
        this.hideCalibrationGazePoint();
        
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
        return new Promise((resolve) => {
            this.showAccuracyTestOverlay();
            
            const testData = {
                testPoints: [],
                currentIndex: 0,
                measurements: [],
                startTime: Date.now()
            };
            
            // 精度テスト用の9点を生成
            const testPositions = [
                { x: 0.15, y: 0.15 }, { x: 0.5, y: 0.15 }, { x: 0.85, y: 0.15 },
                { x: 0.15, y: 0.5 },  { x: 0.5, y: 0.5 },  { x: 0.85, y: 0.5 },
                { x: 0.15, y: 0.85 }, { x: 0.5, y: 0.85 }, { x: 0.85, y: 0.85 }
            ];
            
            testData.testPoints = testPositions;
            
            this.runAccuracyTest(testData).then((results) => {
                this.hideAccuracyTestOverlay();
                this.showAccuracyResults(results);
                resolve(results.overallAccuracy);
            });
        });
    }
    
    showAccuracyTestOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'accuracyTestOverlay';
        overlay.className = 'accuracy-test-overlay';
        overlay.innerHTML = `
            <div class="accuracy-test-content">
                <h2>精度テスト</h2>
                <p>赤い点を順番に見つめてください</p>
                <div class="accuracy-progress">
                    <span id="accuracyStep">1</span> / <span id="accuracyTotal">9</span>
                </div>
                <div class="accuracy-points-container" id="accuracyPointsContainer"></div>
                <button id="skipAccuracyTest" class="control-btn">スキップ</button>
            </div>
        `;
        document.body.appendChild(overlay);
        
        document.getElementById('skipAccuracyTest').addEventListener('click', () => {
            this.skipAccuracyTest();
        });
    }
    
    hideAccuracyTestOverlay() {
        const overlay = document.getElementById('accuracyTestOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    async runAccuracyTest(testData) {
        return new Promise((resolve) => {
            const results = {
                measurements: [],
                overallAccuracy: 0,
                averageDistance: 0,
                worstDistance: 0,
                bestDistance: Infinity
            };
            
            const testNextPoint = async () => {
                if (testData.currentIndex >= testData.testPoints.length) {
                    // テスト完了
                    this.calculateAccuracyResults(testData.measurements, results);
                    resolve(results);
                    return;
                }
                
                const point = testData.testPoints[testData.currentIndex];
                await this.showAccuracyTestPoint(point, testData.currentIndex + 1);
                
                // 精度測定を開始
                this.measurePointAccuracy(point).then((measurement) => {
                    testData.measurements.push(measurement);
                    testData.currentIndex++;
                    
                    setTimeout(() => {
                        testNextPoint();
                    }, 500);
                });
            };
            
            testNextPoint();
        });
    }
    
    async showAccuracyTestPoint(point, step) {
        return new Promise((resolve) => {
            const container = document.getElementById('accuracyPointsContainer');
            const stepElement = document.getElementById('accuracyStep');
            
            // 前のポイントを削除
            container.innerHTML = '';
            
            // ステップ更新
            if (stepElement) {
                stepElement.textContent = step;
            }
            
            // 新しいポイントを作成
            const pointElement = document.createElement('div');
            pointElement.className = 'accuracy-test-point';
            pointElement.style.left = (point.x * 100) + '%';
            pointElement.style.top = (point.y * 100) + '%';
            
            container.appendChild(pointElement);
            
            // 1秒待ってから測定開始
            setTimeout(resolve, 1000);
        });
    }
    
    async measurePointAccuracy(point) {
        return new Promise((resolve) => {
            const measurements = [];
            const targetX = point.x * window.innerWidth;
            const targetY = point.y * window.innerHeight;
            const measurementDuration = 1500; // 1.5秒間測定
            const startTime = Date.now();
            
            const gazeListener = (data) => {
                if (Date.now() - startTime > measurementDuration) {
                    // 測定終了
                    webgazer.removeGazeListener(gazeListener);
                    
                    if (measurements.length === 0) {
                        resolve({ distance: 999, accuracy: 0, sampleCount: 0 });
                        return;
                    }
                    
                    // 結果を計算
                    const avgDistance = measurements.reduce((sum, m) => sum + m, 0) / measurements.length;
                    const accuracy = Math.max(0, 1 - (avgDistance / 200)); // 200pxで精度ゼロ
                    
                    resolve({
                        distance: avgDistance,
                        accuracy: accuracy,
                        sampleCount: measurements.length,
                        targetX: targetX,
                        targetY: targetY
                    });
                    return;
                }
                
                if (data && typeof data.x === 'number' && typeof data.y === 'number') {
                    const distance = Math.sqrt(
                        Math.pow(data.x - targetX, 2) + 
                        Math.pow(data.y - targetY, 2)
                    );
                    measurements.push(distance);
                }
            };
            
            if (typeof webgazer !== 'undefined') {
                webgazer.setGazeListener(gazeListener);
            } else {
                resolve({ distance: 999, accuracy: 0, sampleCount: 0 });
            }
        });
    }
    
    calculateAccuracyResults(measurements, results) {
        if (measurements.length === 0) {
            results.overallAccuracy = 0;
            results.averageDistance = 999;
            return;
        }
        
        results.measurements = measurements;
        
        // 平均精度を計算
        const totalAccuracy = measurements.reduce((sum, m) => sum + m.accuracy, 0);
        results.overallAccuracy = totalAccuracy / measurements.length;
        
        // 平均距離を計算
        const totalDistance = measurements.reduce((sum, m) => sum + m.distance, 0);
        results.averageDistance = totalDistance / measurements.length;
        
        // 最高・最低距離
        results.worstDistance = Math.max(...measurements.map(m => m.distance));
        results.bestDistance = Math.min(...measurements.map(m => m.distance));
    }
    
    showAccuracyResults(results) {
        const resultsOverlay = document.createElement('div');
        resultsOverlay.className = 'accuracy-results-overlay';
        
        const accuracyPercent = (results.overallAccuracy * 100).toFixed(1);
        const avgDistance = Math.round(results.averageDistance);
        
        let qualityRating = '低';
        let qualityColor = '#e74c3c';
        
        if (results.overallAccuracy >= 0.8) {
            qualityRating = '優秀';
            qualityColor = '#27ae60';
        } else if (results.overallAccuracy >= 0.6) {
            qualityRating = '良好';
            qualityColor = '#f39c12';
        } else if (results.overallAccuracy >= 0.4) {
            qualityRating = '普通';
            qualityColor = '#e67e22';
        }
        
        resultsOverlay.innerHTML = `
            <div class="accuracy-results-content">
                <h2>キャリブレーション精度レポート</h2>
                <div class="accuracy-score" style="color: ${qualityColor}">
                    ${accuracyPercent}% (${qualityRating})
                </div>
                <div class="accuracy-details">
                    <div class="accuracy-metric">
                        <span class="metric-label">平均距離:</span>
                        <span class="metric-value">${avgDistance}px</span>
                    </div>
                    <div class="accuracy-metric">
                        <span class="metric-label">最高精度:</span>
                        <span class="metric-value">${Math.round(results.bestDistance)}px</span>
                    </div>
                    <div class="accuracy-metric">
                        <span class="metric-label">最低精度:</span>
                        <span class="metric-value">${Math.round(results.worstDistance)}px</span>
                    </div>
                </div>
                <div class="accuracy-recommendation">
                    ${this.getAccuracyRecommendation(results.overallAccuracy)}
                </div>
                <div class="accuracy-actions">
                    <button id="retryCalibration" class="primary-btn">再キャリブレーション</button>
                    <button id="continueWithCurrentCalibration" class="secondary-btn">このまま続行</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(resultsOverlay);
        
        // イベントリスナーを設定
        document.getElementById('retryCalibration').addEventListener('click', () => {
            resultsOverlay.remove();
            this.resetCalibration();
            setTimeout(() => this.startCalibration(), 500);
        });
        
        document.getElementById('continueWithCurrentCalibration').addEventListener('click', () => {
            resultsOverlay.remove();
        });
        
        // 10秒後に自動で続行
        setTimeout(() => {
            if (document.body.contains(resultsOverlay)) {
                resultsOverlay.remove();
            }
        }, 10000);
    }
    
    getAccuracyRecommendation(accuracy) {
        if (accuracy >= 0.8) {
            return '優秀な精度です。視線追跡が正確に動作します。';
        } else if (accuracy >= 0.6) {
            return '良好な精度です。ほとんどの操作で問題ありません。';
        } else if (accuracy >= 0.4) {
            return '普通の精度です。使用可能ですが、再キャリブレーションを推奨します。';
        } else {
            return '精度が低いです。再キャリブレーションを強く推奨します。';
        }
    }
    
    skipAccuracyTest() {
        this.hideAccuracyTestOverlay();
        // デフォルト精度で続行
        return Promise.resolve(0.7);
    }
    
    cancelCalibration() {
        this.isCalibrating = false;
        this.hideCalibrationGazePoint();
        this.calibrationOverlay.classList.remove('active');
        this.calibrationGazeData = null;
        window.cameraManager?.updateStatus('キャリブレーションがキャンセルされました', 'connected');
    }
    
    resetCalibration() {
        this.isCalibrated = false;
        this.isTracking = false;
        this.isCalibrating = false;
        this.currentCalibrationIndex = 0;
        this.hideGazePoint();
        this.hideCalibrationGazePoint();
        this.disableInterface();
        
        // 精度テスト関連のオーバーレイを削除
        const accuracyOverlay = document.getElementById('accuracyTestOverlay');
        if (accuracyOverlay) {
            accuracyOverlay.remove();
        }
        
        const resultsOverlay = document.querySelector('.accuracy-results-overlay');
        if (resultsOverlay) {
            resultsOverlay.remove();
        }
        
        if (typeof webgazer !== 'undefined') {
            webgazer.clearData();
        }
        
        window.cameraManager?.updateStatus('キャリブレーションをリセットしました', 'connected');
    }
    
    handleGazeData(data, timestamp) {
        // キャリブレーション中は特別な処理
        if (this.isCalibrating) {
            // キャリブレーション中はスムージングなしでより正確なデータを使用
            if (data && typeof data.x === 'number' && typeof data.y === 'number') {
                this.updateGazePoint(data); // 生データでガゼポイント更新
                this.processCalibrationGaze(data);
            }
            return;
        }
        
        // 通常時の処理（既存のロジック）
        if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') {
            return;
        }
        
        if (data.x < 0 || data.x > window.innerWidth || 
            data.y < 0 || data.y > window.innerHeight) {
            return;
        }
        
        this.gazeHistory.push({ ...data, timestamp });
        if (this.gazeHistory.length > this.maxHistoryLength) {
            this.gazeHistory.shift();
        }
        
        if (this.settings.enableSmoothing) {
            this.smoothedGaze = this.applySmoothingFilter(data);
        } else {
            this.smoothedGaze = data;
        }
        
        this.updateGazePoint(this.smoothedGaze);
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