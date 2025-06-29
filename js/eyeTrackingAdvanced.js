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
        try {
            // カメラ状態の詳細チェック
            if (!window.cameraManager?.isCameraActive()) {
                this.showCalibrationError('カメラが起動していません。先にカメラを選択してください。', 'camera_not_active');
                return false;
            }
            
            // WebGazerの状態チェック
            if (typeof webgazer === 'undefined') {
                this.showCalibrationError('WebGazer.jsが読み込まれていません。ページをリロードしてください。', 'webgazer_not_loaded');
                return false;
            }
            
            // WebGazerの初期化確認
            if (!webgazer.isReady()) {
                this.showCalibrationError('WebGazerが初期化されていません。しばらく待ってから再試行してください。', 'webgazer_not_ready');
                return false;
            }
            
            console.log('🚀 キャリブレーション開始');
            
            this.isCalibrating = true;
            this.currentCalibrationIndex = 0;
            this.calibrationOverlay.classList.add('active');
            this.calibrationTotal.textContent = this.calibrationPoints.length;
            
            window.cameraManager?.updateStatus('キャリブレーション中...', 'calibrating');
            
            // WebGazerのデータをクリア
            webgazer.clearData();
            
            // キャリブレーション用のガゼリスナーを設定
            this.setupCalibrationGazeListener();
            
            // エラー監視タイマーを設定
            this.setupCalibrationErrorMonitoring();
            
            await this.showCalibrationPoint();
            return true;
            
        } catch (error) {
            console.error('キャリブレーション開始エラー:', error);
            this.showCalibrationError(`キャリブレーションの開始に失敗しました: ${error.message}`, 'start_error');
            return false;
        }
    }
    
    // キャリブレーションエラーの表示
    showCalibrationError(message, errorType = 'generic') {
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'calibration-error-overlay';
        errorOverlay.innerHTML = `
            <div class="error-content">
                <h2>⚠️ キャリブレーションエラー</h2>
                <p class="error-message">${message}</p>
                <div class="error-actions">
                    ${this.getErrorActions(errorType)}
                </div>
            </div>
        `;
        
        document.body.appendChild(errorOverlay);
        
        // エラータイプに応じた対処法を設定
        this.setupErrorHandlers(errorOverlay, errorType);
        
        // 自動削除（30秒後）
        setTimeout(() => {
            if (document.body.contains(errorOverlay)) {
                errorOverlay.remove();
            }
        }, 30000);
    }
    
    // エラータイプに応じたアクションボタンを生成
    getErrorActions(errorType) {
        switch (errorType) {
            case 'camera_not_active':
                return `
                    <button id="openCameraSettings" class="primary-btn">カメラ設定を開く</button>
                    <button id="retryCalibration" class="secondary-btn">再試行</button>
                    <button id="dismissError" class="tertiary-btn">閉じる</button>
                `;
            case 'webgazer_not_loaded':
                return `
                    <button id="reloadPage" class="primary-btn">ページをリロード</button>
                    <button id="dismissError" class="tertiary-btn">閉じる</button>
                `;
            case 'webgazer_not_ready':
                return `
                    <button id="waitAndRetry" class="primary-btn">待機して再試行</button>
                    <button id="retryCalibration" class="secondary-btn">すぐに再試行</button>
                    <button id="dismissError" class="tertiary-btn">閉じる</button>
                `;
            default:
                return `
                    <button id="retryCalibration" class="primary-btn">再試行</button>
                    <button id="dismissError" class="tertiary-btn">閉じる</button>
                `;
        }
    }
    
    // エラーハンドラーの設定
    setupErrorHandlers(errorOverlay, errorType) {
        const openCameraSettings = errorOverlay.querySelector('#openCameraSettings');
        const retryCalibration = errorOverlay.querySelector('#retryCalibration');
        const reloadPage = errorOverlay.querySelector('#reloadPage');
        const waitAndRetry = errorOverlay.querySelector('#waitAndRetry');
        const dismissError = errorOverlay.querySelector('#dismissError');
        
        if (openCameraSettings) {
            openCameraSettings.addEventListener('click', () => {
                errorOverlay.remove();
                // カメラ設定パネルを開く（カメラマネージャーに依存）
                if (window.cameraManager && window.cameraManager.showCameraSelection) {
                    window.cameraManager.showCameraSelection();
                }
            });
        }
        
        if (retryCalibration) {
            retryCalibration.addEventListener('click', () => {
                errorOverlay.remove();
                setTimeout(() => this.startCalibration(), 500);
            });
        }
        
        if (reloadPage) {
            reloadPage.addEventListener('click', () => {
                window.location.reload();
            });
        }
        
        if (waitAndRetry) {
            waitAndRetry.addEventListener('click', () => {
                errorOverlay.remove();
                this.updateCalibrationStatus('WebGazer初期化を待機中...', 'initializing');
                setTimeout(() => {
                    this.startCalibration();
                }, 3000);
            });
        }
        
        if (dismissError) {
            dismissError.addEventListener('click', () => {
                errorOverlay.remove();
            });
        }
    }
    
    // キャリブレーション中のエラー監視
    setupCalibrationErrorMonitoring() {
        this.calibrationErrorMonitor = {
            startTime: Date.now(),
            lastDataTime: Date.now(),
            noDataWarningShown: false,
            stuckWarningShown: false
        };
        
        // 定期的にエラー状況をチェック
        this.calibrationErrorInterval = setInterval(() => {
            if (!this.isCalibrating) {
                clearInterval(this.calibrationErrorInterval);
                return;
            }
            
            const now = Date.now();
            const timeSinceStart = now - this.calibrationErrorMonitor.startTime;
            const timeSinceLastData = now - this.calibrationErrorMonitor.lastDataTime;
            
            // 10秒間データが来ない場合
            if (timeSinceLastData > 10000 && !this.calibrationErrorMonitor.noDataWarningShown) {
                this.calibrationErrorMonitor.noDataWarningShown = true;
                this.updateCalibrationStatus('視線データが受信されていません。カメラの向きや照明を確認してください', 'warning');
            }
            
            // 同じポイントで2分以上経過
            if (timeSinceStart > 120000 && !this.calibrationErrorMonitor.stuckWarningShown) {
                this.calibrationErrorMonitor.stuckWarningShown = true;
                console.warn('キャリブレーションが長時間停止しています');
                this.showCalibrationStuckDialog();
            }
        }, 5000);
    }
    
    // キャリブレーション停止ダイアログ
    showCalibrationStuckDialog() {
        const stuckDialog = document.createElement('div');
        stuckDialog.className = 'calibration-stuck-dialog';
        stuckDialog.innerHTML = `
            <div class="stuck-content">
                <h3>🕐 キャリブレーションが停止中</h3>
                <p>キャリブレーションが長時間停止しています。</p>
                <div class="stuck-actions">
                    <button id="skipCurrentPoint" class="primary-btn">このポイントをスキップ</button>
                    <button id="restartCalibration" class="secondary-btn">最初からやり直し</button>
                    <button id="continueWaiting" class="tertiary-btn">続行</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(stuckDialog);
        
        document.getElementById('skipCurrentPoint').addEventListener('click', () => {
            stuckDialog.remove();
            this.proceedToNextCalibrationPoint();
        });
        
        document.getElementById('restartCalibration').addEventListener('click', () => {
            stuckDialog.remove();
            this.resetCalibration();
            setTimeout(() => this.startCalibration(), 500);
        });
        
        document.getElementById('continueWaiting').addEventListener('click', () => {
            stuckDialog.remove();
            this.calibrationErrorMonitor.stuckWarningShown = false;
        });
        
        // 10秒後に自動削除
        setTimeout(() => {
            if (document.body.contains(stuckDialog)) {
                stuckDialog.remove();
            }
        }, 10000);
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
        
        // 新しいポイントを作成（適応的サイズ）
        const pointElement = document.createElement('div');
        pointElement.className = 'calibration-point adaptive-point';
        pointElement.style.left = (point.x * 100) + '%';
        pointElement.style.top = (point.y * 100) + '%';
        
        // 初期サイズ：大きめからスタート
        pointElement.style.width = '40px';
        pointElement.style.height = '40px';
        pointElement.style.transition = 'all 0.3s ease';
        
        // 視線距離表示エリアを追加
        const distanceIndicator = document.createElement('div');
        distanceIndicator.className = 'distance-indicator';
        pointElement.appendChild(distanceIndicator);
        
        // リアルタイム情報表示エリア
        const infoDisplay = document.createElement('div');
        infoDisplay.className = 'calibration-info-display';
        infoDisplay.innerHTML = `
            <div class="info-panel">
                <div class="step-info">点 ${this.currentCalibrationIndex + 1}/${this.calibrationPoints.length}</div>
                <div class="status-info" id="statusInfo">視線を検出中...</div>
                <div class="distance-info" id="distanceInfo">-</div>
                <div class="progress-info" id="progressInfo">距離: 60px以内で2秒間安定</div>
            </div>
        `;
        
        this.calibrationPointsContainer.appendChild(pointElement);
        this.calibrationPointsContainer.appendChild(infoDisplay);
        
        // ステップを更新
        this.calibrationStep.textContent = this.currentCalibrationIndex + 1;
        
        // 音声フィードバック
        this.speakCalibrationInstruction(this.currentCalibrationIndex + 1);
        
        // キャリブレーション中の視線ポイント表示を強制有効化
        this.showCalibrationGazePoint();
        
        // WebGazerの状態を確認
        this.checkWebGazerStatus();
        
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
        // ガゼポイント要素を確実に取得
        this.gazePoint = document.getElementById('gazePoint');
        
        if (!this.gazePoint) {
            console.error('ガゼポイント要素が見つかりません');
            return;
        }
        
        // 強制的に表示
        this.gazePoint.style.display = 'block';
        this.gazePoint.style.position = 'fixed';
        this.gazePoint.style.zIndex = '9999';
        this.gazePoint.style.pointerEvents = 'none';
        this.gazePoint.style.width = '15px';
        this.gazePoint.style.height = '15px';
        this.gazePoint.style.background = '#ff6b6b';
        this.gazePoint.style.border = '3px solid #ffffff';
        this.gazePoint.style.borderRadius = '50%';
        this.gazePoint.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.3)';
        this.gazePoint.style.transform = 'translate(-50%, -50%)';
        
        this.gazePoint.classList.add('active', 'calibration-mode');
        
        console.log('キャリブレーション用視線ポイントを表示しました');
    }
    
    hideCalibrationGazePoint() {
        if (this.gazePoint) {
            this.gazePoint.classList.remove('calibration-mode');
            this.gazePoint.style.background = '';
            this.gazePoint.style.borderColor = '';
        }
    }
    
    // 新しいメソッド: 視線データの有効性をチェック（強化版）
    isValidGazeData(gazeData) {
        if (!gazeData || typeof gazeData.x !== 'number' || typeof gazeData.y !== 'number') {
            console.log('無効なデータ形式:', gazeData);
            return false;
        }
        
        // NaN や Infinity のチェック
        if (!isFinite(gazeData.x) || !isFinite(gazeData.y)) {
            console.log('数値が無限大またはNaN:', gazeData);
            return false;
        }
        
        // 画面範囲外のチェック（マージンを含む）
        const margin = 100; // 100pxのマージンを許可
        if (gazeData.x < -margin || gazeData.x > window.innerWidth + margin || 
            gazeData.y < -margin || gazeData.y > window.innerHeight + margin) {
            console.log('画面範囲外の視線データ:', gazeData, `画面サイズ: ${window.innerWidth}x${window.innerHeight}`);
            return false;
        }
        
        // 異常な値のチェック（原点固定）
        if (gazeData.x === 0 && gazeData.y === 0) {
            console.log('原点固定の異常データ:', gazeData);
            return false;
        }
        
        // 連続する同一座標のチェック
        if (this.calibrationGazeData.lastValidGaze) {
            const lastGaze = this.calibrationGazeData.lastValidGaze;
            if (gazeData.x === lastGaze.x && gazeData.y === lastGaze.y) {
                // 連続する同一座標をカウント
                this.calibrationGazeData.identicalDataCount = (this.calibrationGazeData.identicalDataCount || 0) + 1;
                if (this.calibrationGazeData.identicalDataCount > 10) {
                    console.log('連続する同一座標データが多すぎます:', gazeData);
                    return false;
                }
            } else {
                this.calibrationGazeData.identicalDataCount = 0;
            }
            
            // 前回の視線と比較して異常なジャンプを検出（段階的チェック）
            const jumpDistance = Math.sqrt(
                Math.pow(gazeData.x - lastGaze.x, 2) + 
                Math.pow(gazeData.y - lastGaze.y, 2)
            );
            
            // 段階的な閾値設定
            let jumpThreshold = 400; // デフォルト閾値
            
            // 最近の視線履歴の安定性に基づいて閾値を調整
            if (this.calibrationGazeData.gazeHistory.length > 5) {
                const recentHistory = this.calibrationGazeData.gazeHistory.slice(-5);
                const distances = [];
                
                for (let i = 1; i < recentHistory.length; i++) {
                    const dist = Math.sqrt(
                        Math.pow(recentHistory[i].x - recentHistory[i-1].x, 2) + 
                        Math.pow(recentHistory[i].y - recentHistory[i-1].y, 2)
                    );
                    distances.push(dist);
                }
                
                const avgMovement = distances.reduce((sum, d) => sum + d, 0) / distances.length;
                
                // 平均移動距離に基づいて閾値を動的調整
                if (avgMovement < 50) {
                    jumpThreshold = 250; // 安定している場合は厳しく
                } else if (avgMovement > 150) {
                    jumpThreshold = 500; // 不安定な場合は緩く
                }
            }
            
            if (jumpDistance > jumpThreshold) {
                console.log(`異常な視線ジャンプを検出: ${Math.round(jumpDistance)}px (閾値: ${jumpThreshold}px)`);
                console.log(`前回: (${Math.round(lastGaze.x)}, ${Math.round(lastGaze.y)}) → 今回: (${Math.round(gazeData.x)}, ${Math.round(gazeData.y)})`);
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
    
    // 新しいメソッド: 視線安定性を厳密にチェック（強化版）
    checkGazeStability(currentDistance) {
        const threshold = this.calibrationGazeData.accuracyThreshold;
        const history = this.calibrationGazeData.gazeHistory;
        
        // 現在の距離が閾値以内か
        if (currentDistance > threshold) {
            return false;
        }
        
        // 最低限必要なデータ履歴の確認
        if (history.length < 5) {
            return false;
        }
        
        // 過去1.5秒間のデータをチェック（より長期間の安定性）
        const checkPeriod = 1500; // 1.5秒
        const cutoffTime = Date.now() - checkPeriod;
        const recentHistory = history.filter(entry => entry.timestamp > cutoffTime);
        
        // 十分なデータポイントがあるか（最低10ポイント）
        if (recentHistory.length < 10) {
            return false;
        }
        
        // 1. 平均距離チェック
        const averageDistance = recentHistory.reduce((sum, entry) => sum + entry.distance, 0) / recentHistory.length;
        if (averageDistance > threshold * 0.8) { // より厳しい基準（80%）
            return false;
        }
        
        // 2. 変動性チェック（標準偏差）
        const distances = recentHistory.map(entry => entry.distance);
        const variance = distances.reduce((sum, dist) => sum + Math.pow(dist - averageDistance, 2), 0) / distances.length;
        const standardDeviation = Math.sqrt(variance);
        
        if (standardDeviation > 25) { // 25px以上の標準偏差は不安定
            return false;
        }
        
        // 3. 連続性チェック（大きなジャンプがないか）
        let jumpCount = 0;
        for (let i = 1; i < recentHistory.length; i++) {
            const prev = recentHistory[i - 1];
            const curr = recentHistory[i];
            
            const jumpDistance = Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + 
                Math.pow(curr.y - prev.y, 2)
            );
            
            if (jumpDistance > 30) { // 30px以上のジャンプをカウント
                jumpCount++;
            }
        }
        
        // ジャンプが全体の20%を超える場合は不安定
        const jumpRatio = jumpCount / (recentHistory.length - 1);
        if (jumpRatio > 0.2) {
            return false;
        }
        
        // 4. 最近の改善傾向チェック
        const halfPoint = Math.floor(recentHistory.length / 2);
        const firstHalf = recentHistory.slice(0, halfPoint);
        const secondHalf = recentHistory.slice(halfPoint);
        
        const firstHalfAvg = firstHalf.reduce((sum, entry) => sum + entry.distance, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, entry) => sum + entry.distance, 0) / secondHalf.length;
        
        // 後半の精度が前半より悪化している場合は不安定
        if (secondHalfAvg > firstHalfAvg + 10) {
            return false;
        }
        
        // 5. 最終確認：直近のデータが全て閾値以内か
        const veryRecentHistory = recentHistory.slice(-5);
        const allRecentWithinThreshold = veryRecentHistory.every(entry => entry.distance <= threshold);
        
        if (!allRecentWithinThreshold) {
            return false;
        }
        
        // すべての条件をクリアした場合のみ安定とみなす
        console.log(`視線安定性確認: 平均距離=${Math.round(averageDistance)}px, 標準偏差=${Math.round(standardDeviation)}px, ジャンプ率=${Math.round(jumpRatio * 100)}%`);
        return true;
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
    
    // WebGazerの状態確認メソッド
    checkWebGazerStatus() {
        if (typeof webgazer === 'undefined') {
            console.error('WebGazer.jsが読み込まれていません');
            this.updateCalibrationStatus('WebGazer.jsが読み込まれていません', 'error');
            return false;
        }
        
        // WebGazerの初期化状態をチェック
        const isReady = webgazer.isReady();
        console.log(`WebGazer準備状態: ${isReady}`);
        
        if (!isReady) {
            console.warn('WebGazerが初期化されていません。初期化を試行します...');
            this.updateCalibrationStatus('WebGazerを初期化中...', 'initializing');
            this.initializeWebGazer();
            return false;
        }
        
        // 視線データの受信状況をチェック
        let dataReceived = false;
        const testListener = (data) => {
            if (data) {
                dataReceived = true;
                console.log('WebGazerからの視線データ受信を確認:', data);
            }
        };
        
        webgazer.setGazeListener(testListener);
        
        // 2秒後にデータ受信状況を確認
        setTimeout(() => {
            if (dataReceived) {
                console.log('✓ WebGazerは正常に動作しています');
                this.updateCalibrationStatus('WebGazer動作確認完了', 'ready');
            } else {
                console.warn('⚠ WebGazerからデータが受信されていません');
                this.updateCalibrationStatus('視線データが受信されていません。カメラ許可を確認してください', 'warning');
            }
            
            // テストリスナーを削除し、通常のリスナーに戻す
            webgazer.clearGazeListener();
            this.ensureGazeListener();
        }, 2000);
        
        return true;
    }
    
    // キャリブレーション状態の更新
    updateCalibrationStatus(message, type = 'info') {
        const statusInfo = document.getElementById('statusInfo');
        if (statusInfo) {
            statusInfo.textContent = message;
            
            const colors = {
                'error': '#e74c3c',
                'warning': '#f39c12',
                'initializing': '#3498db',
                'ready': '#27ae60',
                'info': '#ffffff'
            };
            
            statusInfo.style.color = colors[type] || colors.info;
        }
        
        // カメラマネージャーにも状態を通知
        if (window.cameraManager && type === 'error') {
            window.cameraManager.updateStatus(message, 'error');
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
        
        // エラー監視タイマーを更新
        if (this.calibrationErrorMonitor) {
            this.calibrationErrorMonitor.lastDataTime = Date.now();
        }
        
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
        const statusInfo = document.getElementById('statusInfo');
        const distanceInfo = document.getElementById('distanceInfo');
        
        if (!pointElement || !distanceIndicator) return;
        
        // 適応的サイズ変更（距離に応じて小さく）
        let pointSize = 40; // 初期サイズ
        let status = '';
        let statusColor = '#ffffff';
        
        if (distance < 30) {
            pointElement.style.background = '#27ae60';
            pointElement.style.boxShadow = '0 0 30px rgba(39, 174, 96, 0.8)';
            pointSize = 15; // 最小サイズ
            status = '🎉 優秀! このまま維持';
            statusColor = '#27ae60';
        } else if (distance < this.calibrationGazeData.accuracyThreshold) {
            pointElement.style.background = '#f39c12';
            pointElement.style.boxShadow = '0 0 25px rgba(243, 156, 18, 0.8)';
            pointSize = 25; // 中間サイズ
            status = '👀 良好! あと少し';
            statusColor = '#f39c12';
        } else if (distance < 100) {
            pointElement.style.background = '#e74c3c';
            pointElement.style.boxShadow = '0 0 20px rgba(231, 76, 60, 0.8)';
            pointSize = 35; // 大きめ
            status = '🎯 調整中... より近づいて';
            statusColor = '#e74c3c';
        } else {
            pointElement.style.background = '#95a5a6';
            pointElement.style.boxShadow = '0 0 15px rgba(149, 165, 166, 0.6)';
            pointSize = 40; // 最大サイズ
            status = '🔍 検出中... 赤い点を見つめて';
            statusColor = '#95a5a6';
        }
        
        // サイズをスムーズに変更
        pointElement.style.width = pointSize + 'px';
        pointElement.style.height = pointSize + 'px';
        
        // 詳細な距離情報を表示
        distanceIndicator.innerHTML = `
            <div style="font-size: 12px; color: white; font-weight: bold;">${Math.round(distance)}px</div>
        `;
        
        // リアルタイムステータス更新
        if (statusInfo) {
            statusInfo.innerHTML = status;
            statusInfo.style.color = statusColor;
        }
        
        if (distanceInfo) {
            distanceInfo.innerHTML = `
                距離: <strong>${Math.round(distance)}px</strong> 
                ${distance < this.calibrationGazeData.accuracyThreshold ? 
                    '<span style="color: #27ae60;">✓ OK</span>' : 
                    '<span style="color: #e74c3c;">✗ 近づいて</span>'}
            `;
        }
        
        // 視線座標も表示（デバッグ用）
        if (gazeData) {
            const point = this.calibrationGazeData.currentPoint;
            const targetX = point.x * window.innerWidth;
            const targetY = point.y * window.innerHeight;
            
            console.log(`👁️ 視線: (${Math.round(gazeData.x)}, ${Math.round(gazeData.y)}) → ターゲット: (${Math.round(targetX)}, ${Math.round(targetY)}) = ${Math.round(distance)}px [${status.replace(/�[�-�]|�[�-�]|�[�-�]/g, '')}]`);
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
            const rawPositions = []; // 生の座標データも保存
            const targetX = point.x * window.innerWidth;
            const targetY = point.y * window.innerHeight;
            const measurementDuration = 2000; // 2秒間測定（より長く）
            const startTime = Date.now();
            let validSampleCount = 0;
            let invalidSampleCount = 0;
            
            console.log(`精度測定開始: ターゲット(${Math.round(targetX)}, ${Math.round(targetY)})`);
            
            const gazeListener = (data) => {
                const elapsed = Date.now() - startTime;
                
                if (elapsed > measurementDuration) {
                    // 測定終了
                    webgazer.removeGazeListener(gazeListener);
                    
                    console.log(`精度測定完了: 有効サンプル${validSampleCount}個, 無効サンプル${invalidSampleCount}個`);
                    
                    if (measurements.length === 0) {
                        resolve({ 
                            distance: 999, 
                            accuracy: 0, 
                            sampleCount: 0,
                            validSampleCount: 0,
                            invalidSampleCount: invalidSampleCount,
                            targetX: targetX,
                            targetY: targetY,
                            reliability: 0
                        });
                        return;
                    }
                    
                    // 詳細統計を計算
                    const avgDistance = measurements.reduce((sum, m) => sum + m, 0) / measurements.length;
                    const minDistance = Math.min(...measurements);
                    const maxDistance = Math.max(...measurements);
                    
                    // 標準偏差を計算
                    const variance = measurements.reduce((sum, m) => sum + Math.pow(m - avgDistance, 2), 0) / measurements.length;
                    const standardDeviation = Math.sqrt(variance);
                    
                    // 精度スコアを計算（複数の要因を考慮）
                    const distanceScore = Math.max(0, 1 - (avgDistance / 150)); // 150pxで精度ゼロ
                    const consistencyScore = Math.max(0, 1 - (standardDeviation / 100)); // 一貫性スコア
                    const reliabilityScore = validSampleCount / (validSampleCount + invalidSampleCount);
                    
                    const overallAccuracy = (distanceScore * 0.5) + (consistencyScore * 0.3) + (reliabilityScore * 0.2);
                    
                    // 外れ値を除去した改善された平均を計算
                    const sortedDistances = [...measurements].sort((a, b) => a - b);
                    const q1Index = Math.floor(sortedDistances.length * 0.25);
                    const q3Index = Math.floor(sortedDistances.length * 0.75);
                    const iqr = sortedDistances[q3Index] - sortedDistances[q1Index];
                    const lowerBound = sortedDistances[q1Index] - (1.5 * iqr);
                    const upperBound = sortedDistances[q3Index] + (1.5 * iqr);
                    
                    const filteredMeasurements = measurements.filter(m => m >= lowerBound && m <= upperBound);
                    const robustAvgDistance = filteredMeasurements.length > 0 ? 
                        filteredMeasurements.reduce((sum, m) => sum + m, 0) / filteredMeasurements.length : avgDistance;
                    
                    resolve({
                        distance: avgDistance,
                        robustDistance: robustAvgDistance, // 外れ値除去後の平均
                        accuracy: overallAccuracy,
                        sampleCount: measurements.length,
                        validSampleCount: validSampleCount,
                        invalidSampleCount: invalidSampleCount,
                        targetX: targetX,
                        targetY: targetY,
                        minDistance: minDistance,
                        maxDistance: maxDistance,
                        standardDeviation: standardDeviation,
                        reliability: reliabilityScore,
                        consistencyScore: consistencyScore,
                        distanceScore: distanceScore,
                        outlierCount: measurements.length - filteredMeasurements.length
                    });
                    return;
                }
                
                // データ品質チェック
                if (data && typeof data.x === 'number' && typeof data.y === 'number' && 
                    isFinite(data.x) && isFinite(data.y)) {
                    
                    // 基本的な範囲チェック
                    if (data.x >= -100 && data.x <= window.innerWidth + 100 && 
                        data.y >= -100 && data.y <= window.innerHeight + 100) {
                        
                        const distance = Math.sqrt(
                            Math.pow(data.x - targetX, 2) + 
                            Math.pow(data.y - targetY, 2)
                        );
                        
                        measurements.push(distance);
                        rawPositions.push({ x: data.x, y: data.y, distance: distance, timestamp: elapsed });
                        validSampleCount++;
                        
                        // リアルタイムでの距離情報（デバッグ用）
                        if (validSampleCount % 10 === 0) {
                            console.log(`測定中 (${Math.round(elapsed/1000)}s): 距離=${Math.round(distance)}px, サンプル=${validSampleCount}`);
                        }
                    } else {
                        invalidSampleCount++;
                    }
                } else {
                    invalidSampleCount++;
                }
            };
            
            if (typeof webgazer !== 'undefined') {
                webgazer.setGazeListener(gazeListener);
            } else {
                resolve({ 
                    distance: 999, 
                    accuracy: 0, 
                    sampleCount: 0,
                    validSampleCount: 0,
                    invalidSampleCount: 0,
                    reliability: 0
                });
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
        
        // より詳細な品質評価
        let qualityRating = '低';
        let qualityColor = '#e74c3c';
        let qualityIcon = '⚠️';
        
        if (results.overallAccuracy >= 0.85) {
            qualityRating = '優秀';
            qualityColor = '#27ae60';
            qualityIcon = '🎉';
        } else if (results.overallAccuracy >= 0.7) {
            qualityRating = '良好';
            qualityColor = '#2ecc71';
            qualityIcon = '✅';
        } else if (results.overallAccuracy >= 0.55) {
            qualityRating = '普通';
            qualityColor = '#f39c12';
            qualityIcon = '⚡';
        } else if (results.overallAccuracy >= 0.4) {
            qualityRating = '低め';
            qualityColor = '#e67e22';
            qualityIcon = '⚠️';
        }
        
        // 詳細統計の計算
        const totalSamples = results.measurements.reduce((sum, m) => sum + m.sampleCount, 0);
        const totalValidSamples = results.measurements.reduce((sum, m) => sum + (m.validSampleCount || m.sampleCount), 0);
        const totalInvalidSamples = results.measurements.reduce((sum, m) => sum + (m.invalidSampleCount || 0), 0);
        const overallReliability = totalValidSamples / (totalValidSamples + totalInvalidSamples);
        
        // 各領域（画面の部分）の精度分析
        const regionAnalysis = this.analyzeRegionAccuracy(results.measurements);
        
        resultsOverlay.innerHTML = `
            <div class="accuracy-results-content">
                <h2>${qualityIcon} キャリブレーション精度レポート</h2>
                <div class="accuracy-score" style="color: ${qualityColor}">
                    ${accuracyPercent}% (${qualityRating})
                </div>
                
                <div class="accuracy-summary">
                    <div class="summary-card">
                        <h3>📊 総合統計</h3>
                        <div class="metric-row">
                            <span class="metric-label">平均誤差:</span>
                            <span class="metric-value">${avgDistance}px</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">最高精度:</span>
                            <span class="metric-value">${Math.round(results.bestDistance)}px</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">最低精度:</span>
                            <span class="metric-value">${Math.round(results.worstDistance)}px</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">データ信頼性:</span>
                            <span class="metric-value">${(overallReliability * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <h3>🎯 詳細分析</h3>
                        <div class="metric-row">
                            <span class="metric-label">サンプル数:</span>
                            <span class="metric-value">${totalValidSamples} / ${totalValidSamples + totalInvalidSamples}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">標準偏差:</span>
                            <span class="metric-value">${this.calculateOverallStandardDeviation(results.measurements).toFixed(1)}px</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">外れ値:</span>
                            <span class="metric-value">${results.measurements.reduce((sum, m) => sum + (m.outlierCount || 0), 0)}個</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">一貫性:</span>
                            <span class="metric-value">${(results.measurements.reduce((sum, m) => sum + (m.consistencyScore || 0), 0) / results.measurements.length * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="region-analysis">
                    <h3>📍 画面領域別精度</h3>
                    <div class="region-grid">
                        ${regionAnalysis.map(region => `
                            <div class="region-item" style="background-color: ${this.getRegionColor(region.accuracy)}">
                                <div class="region-name">${region.name}</div>
                                <div class="region-accuracy">${(region.accuracy * 100).toFixed(0)}%</div>
                                <div class="region-distance">${Math.round(region.avgDistance)}px</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="accuracy-recommendation">
                    <h3>💡 推奨事項</h3>
                    <p>${this.getDetailedRecommendation(results, regionAnalysis)}</p>
                </div>
                
                <div class="accuracy-actions">
                    <button id="retryCalibration" class="primary-btn">🔄 再キャリブレーション</button>
                    <button id="continueWithCurrentCalibration" class="secondary-btn">✅ このまま続行</button>
                    <button id="showDetailedReport" class="tertiary-btn">📈 詳細レポート</button>
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
        
        document.getElementById('showDetailedReport').addEventListener('click', () => {
            this.showDetailedAccuracyReport(results);
        });
        
        // 15秒後に自動で続行（より長く）
        setTimeout(() => {
            if (document.body.contains(resultsOverlay)) {
                resultsOverlay.remove();
            }
        }, 15000);
    }
    
    // 画面領域別の精度分析
    analyzeRegionAccuracy(measurements) {
        const regions = [
            { name: '左上', bounds: { xMin: 0, xMax: 0.33, yMin: 0, yMax: 0.33 } },
            { name: '中央上', bounds: { xMin: 0.33, xMax: 0.67, yMin: 0, yMax: 0.33 } },
            { name: '右上', bounds: { xMin: 0.67, xMax: 1, yMin: 0, yMax: 0.33 } },
            { name: '左中', bounds: { xMin: 0, xMax: 0.33, yMin: 0.33, yMax: 0.67 } },
            { name: '中央', bounds: { xMin: 0.33, xMax: 0.67, yMin: 0.33, yMax: 0.67 } },
            { name: '右中', bounds: { xMin: 0.67, xMax: 1, yMin: 0.33, yMax: 0.67 } },
            { name: '左下', bounds: { xMin: 0, xMax: 0.33, yMin: 0.67, yMax: 1 } },
            { name: '中央下', bounds: { xMin: 0.33, xMax: 0.67, yMin: 0.67, yMax: 1 } },
            { name: '右下', bounds: { xMin: 0.67, xMax: 1, yMin: 0.67, yMax: 1 } }
        ];
        
        return regions.map(region => {
            const regionMeasurements = measurements.filter(m => {
                const relativeX = m.targetX / window.innerWidth;
                const relativeY = m.targetY / window.innerHeight;
                return relativeX >= region.bounds.xMin && relativeX < region.bounds.xMax &&
                       relativeY >= region.bounds.yMin && relativeY < region.bounds.yMax;
            });
            
            if (regionMeasurements.length === 0) {
                return { ...region, accuracy: 0, avgDistance: 999, count: 0 };
            }
            
            const avgDistance = regionMeasurements.reduce((sum, m) => sum + m.distance, 0) / regionMeasurements.length;
            const accuracy = Math.max(0, 1 - (avgDistance / 150));
            
            return {
                ...region,
                accuracy: accuracy,
                avgDistance: avgDistance,
                count: regionMeasurements.length
            };
        });
    }
    
    // 領域の色を決定
    getRegionColor(accuracy) {
        if (accuracy >= 0.8) return 'rgba(39, 174, 96, 0.8)';
        if (accuracy >= 0.6) return 'rgba(241, 196, 15, 0.8)';
        if (accuracy >= 0.4) return 'rgba(230, 126, 34, 0.8)';
        return 'rgba(231, 76, 60, 0.8)';
    }
    
    // 全体の標準偏差を計算
    calculateOverallStandardDeviation(measurements) {
        const allDistances = measurements.map(m => m.distance);
        const avgDistance = allDistances.reduce((sum, d) => sum + d, 0) / allDistances.length;
        const variance = allDistances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / allDistances.length;
        return Math.sqrt(variance);
    }
    
    // 詳細な推奨事項を生成
    getDetailedRecommendation(results, regionAnalysis) {
        const avgAccuracy = results.overallAccuracy;
        const worstRegion = regionAnalysis.reduce((worst, region) => 
            region.accuracy < worst.accuracy ? region : worst
        );
        const bestRegion = regionAnalysis.reduce((best, region) => 
            region.accuracy > best.accuracy ? region : best
        );
        
        let recommendation = '';
        
        if (avgAccuracy >= 0.85) {
            recommendation = '素晴らしい精度です！視線追跡は正確に動作し、快適に使用できます。';
        } else if (avgAccuracy >= 0.7) {
            recommendation = '良好な精度です。実用的な精度で視線追跡をご利用いただけます。';
        } else if (avgAccuracy >= 0.55) {
            recommendation = '使用可能な精度ですが、';
            if (worstRegion.accuracy < 0.4) {
                recommendation += `画面の${worstRegion.name}領域の精度が低いです。`;
            }
            recommendation += '再キャリブレーションを検討してください。';
        } else {
            recommendation = '精度が低すぎます。再キャリブレーションを強く推奨します。';
            if (worstRegion.accuracy < 0.3) {
                recommendation += `特に画面の${worstRegion.name}領域で問題があります。`;
            }
        }
        
        // 環境的な推奨事項を追加
        const totalSamples = results.measurements.reduce((sum, m) => sum + (m.validSampleCount || m.sampleCount), 0);
        const totalInvalid = results.measurements.reduce((sum, m) => sum + (m.invalidSampleCount || 0), 0);
        const reliability = totalSamples / (totalSamples + totalInvalid);
        
        if (reliability < 0.8) {
            recommendation += ' データの信頼性が低いため、照明環境や座る位置を調整してください。';
        }
        
        return recommendation;
    }
    
    // 詳細レポートを表示
    showDetailedAccuracyReport(results) {
        console.log('📊 詳細精度レポート:', results);
        alert(`詳細レポート:\n\n測定点数: ${results.measurements.length}\n平均精度: ${(results.overallAccuracy * 100).toFixed(1)}%\n\n各測定点の詳細がコンソールに出力されました。`);
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
        if (!this.gazePoint) {
            this.gazePoint = document.getElementById('gazePoint');
            if (!this.gazePoint) return;
        }
        
        // キャリブレーション中は強制表示
        if (this.isCalibrating) {
            this.gazePoint.style.display = 'block';
            this.gazePoint.style.left = gazeData.x + 'px';
            this.gazePoint.style.top = gazeData.y + 'px';
        } else if (this.settings.showGazePoint) {
            this.gazePoint.style.left = gazeData.x + 'px';
            this.gazePoint.style.top = gazeData.y + 'px';
            this.gazePoint.style.width = this.settings.gazePointSize + 'px';
            this.gazePoint.style.height = this.settings.gazePointSize + 'px';
        }
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