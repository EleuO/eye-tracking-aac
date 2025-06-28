class EyeTrackingManager {
    constructor() {
        this.isCalibrated = false;
        this.isTracking = false;
        this.camera = document.getElementById('camera');
        this.overlay = document.getElementById('overlay');
        this.calibrationStatus = document.getElementById('calibrationStatus');
        this.characterGrid = document.getElementById('characterGrid');
        
        this.gazeData = [];
        this.calibrationPoints = [];
        this.dwellTime = 1500;
        this.currentHoverElement = null;
        this.hoverStartTime = null;
        this.selectionTimeout = null;
        
        this.init();
    }
    
    async init() {
        try {
            await this.initializeCamera();
            this.initializeWebGazer();
            this.setupOverlay();
            this.updateStatus('カメラが準備できました。キャリブレーションを開始してください。', 'ready');
        } catch (error) {
            console.error('初期化エラー:', error);
            this.updateStatus('カメラの初期化に失敗しました。', 'error');
        }
    }
    
    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1080 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }
            });
            
            this.camera.srcObject = stream;
            this.camera.onloadedmetadata = () => {
                this.camera.play();
            };
            
            return stream;
        } catch (error) {
            throw new Error('ウェブカメラへのアクセスに失敗しました: ' + error.message);
        }
    }
    
    initializeWebGazer() {
        if (typeof webgazer === 'undefined') {
            console.error('WebGazer.jsが読み込まれていません');
            this.updateStatus('視線追跡ライブラリの読み込みに失敗しました。', 'error');
            return;
        }
        
        webgazer.setGazeListener((data, elapsedTime) => {
            if (data && this.isTracking) {
                this.handleGazeData(data, elapsedTime);
            }
        }).begin();
        
        webgazer.showVideo(false);
        webgazer.showPredictionPoints(false);
    }
    
    setupOverlay() {
        if (this.overlay && this.camera) {
            this.overlay.width = this.camera.videoWidth || 640;
            this.overlay.height = this.camera.videoHeight || 480;
            this.overlay.style.position = 'absolute';
            this.overlay.style.top = this.camera.offsetTop + 'px';
            this.overlay.style.left = this.camera.offsetLeft + 'px';
        }
    }
    
    async startCalibration() {
        if (typeof webgazer === 'undefined') {
            this.updateStatus('WebGazer.jsが利用できません。', 'error');
            return;
        }
        
        this.updateStatus('キャリブレーション中...', 'calibrating');
        
        try {
            webgazer.clearData();
            
            const calibrationPoints = [
                { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
                { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
                { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 }
            ];
            
            await this.runCalibrationSequence(calibrationPoints);
            
            this.isCalibrated = true;
            this.isTracking = true;
            this.updateStatus('キャリブレーション完了！視線追跡が有効になりました。', 'ready');
            
            setTimeout(() => {
                this.updateStatus('文字を見つめて選択してください。', 'ready');
            }, 2000);
            
        } catch (error) {
            console.error('キャリブレーションエラー:', error);
            this.updateStatus('キャリブレーションに失敗しました。', 'error');
        }
    }
    
    async runCalibrationSequence(points) {
        const overlay = this.createCalibrationOverlay();
        
        for (let i = 0; i < points.length; i++) {
            await this.calibratePoint(points[i], overlay, i + 1, points.length);
        }
        
        document.body.removeChild(overlay);
    }
    
    createCalibrationOverlay() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
    
    async calibratePoint(point, overlay, current, total) {
        return new Promise((resolve) => {
            const dot = document.createElement('div');
            dot.style.cssText = `
                position: absolute;
                width: 20px;
                height: 20px;
                background: #e74c3c;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 20px rgba(231, 76, 60, 0.6);
                animation: pulse 0.5s infinite alternate;
                left: ${point.x * 100}vw;
                top: ${point.y * 100}vh;
                transform: translate(-50%, -50%);
                cursor: pointer;
            `;
            
            const instruction = document.createElement('div');
            instruction.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                pointer-events: none;
            `;
            instruction.innerHTML = `
                <div>赤い点を見つめてクリックしてください</div>
                <div style="font-size: 18px; margin-top: 10px;">${current}/${total}</div>
            `;
            
            overlay.appendChild(dot);
            overlay.appendChild(instruction);
            
            const calibrate = () => {
                webgazer.recordScreenPosition(
                    point.x * window.innerWidth,
                    point.y * window.innerHeight
                );
                
                dot.style.background = '#27ae60';
                setTimeout(() => {
                    overlay.removeChild(dot);
                    overlay.removeChild(instruction);
                    resolve();
                }, 300);
            };
            
            dot.addEventListener('click', calibrate);
            
            setTimeout(calibrate, 3000);
        });
    }
    
    handleGazeData(data, elapsedTime) {
        this.gazeData.push({
            x: data.x,
            y: data.y,
            timestamp: elapsedTime
        });
        
        if (this.gazeData.length > 30) {
            this.gazeData.shift();
        }
        
        this.processGazeForSelection(data);
    }
    
    processGazeForSelection(data) {
        const element = document.elementFromPoint(data.x, data.y);
        
        if (element && element.classList.contains('character-btn')) {
            if (this.currentHoverElement === element) {
                const hoverDuration = Date.now() - this.hoverStartTime;
                
                if (hoverDuration >= this.dwellTime) {
                    this.selectElement(element);
                    this.resetHover();
                } else {
                    this.updateHoverProgress(element, hoverDuration / this.dwellTime);
                }
            } else {
                this.resetHover();
                this.startHover(element);
            }
        } else {
            this.resetHover();
        }
    }
    
    startHover(element) {
        this.currentHoverElement = element;
        this.hoverStartTime = Date.now();
        element.classList.add('gaze-hover');
        this.createProgressIndicator(element);
    }
    
    resetHover() {
        if (this.currentHoverElement) {
            this.currentHoverElement.classList.remove('gaze-hover');
            this.removeProgressIndicator();
            this.currentHoverElement = null;
            this.hoverStartTime = null;
        }
        
        if (this.selectionTimeout) {
            clearTimeout(this.selectionTimeout);
            this.selectionTimeout = null;
        }
    }
    
    createProgressIndicator(element) {
        const indicator = document.createElement('div');
        indicator.className = 'gaze-progress';
        indicator.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: rgba(52, 152, 219, 0.3);
            border-radius: 2px;
            overflow: hidden;
            pointer-events: none;
        `;
        
        const progress = document.createElement('div');
        progress.className = 'gaze-progress-bar';
        progress.style.cssText = `
            height: 100%;
            width: 0%;
            background: #3498db;
            transition: width 0.1s ease;
        `;
        
        indicator.appendChild(progress);
        element.appendChild(indicator);
    }
    
    updateHoverProgress(element, progress) {
        const progressBar = element.querySelector('.gaze-progress-bar');
        if (progressBar) {
            progressBar.style.width = (progress * 100) + '%';
        }
    }
    
    removeProgressIndicator() {
        if (this.currentHoverElement) {
            const indicator = this.currentHoverElement.querySelector('.gaze-progress');
            if (indicator) {
                indicator.remove();
            }
        }
    }
    
    selectElement(element) {
        element.classList.add('gaze-selected');
        
        const char = element.textContent;
        if (window.aacApp) {
            window.aacApp.selectCharacterByGaze(char);
        }
        
        setTimeout(() => {
            element.classList.remove('gaze-selected');
        }, 500);
    }
    
    updateStatus(message, type = 'info') {
        if (this.calibrationStatus) {
            this.calibrationStatus.textContent = message;
            this.calibrationStatus.className = `status ${type}`;
        }
    }
    
    pauseTracking() {
        this.isTracking = false;
    }
    
    resumeTracking() {
        if (this.isCalibrated) {
            this.isTracking = true;
        }
    }
    
    stopTracking() {
        this.isTracking = false;
        this.isCalibrated = false;
        if (typeof webgazer !== 'undefined') {
            webgazer.end();
        }
        this.updateStatus('視線追跡を停止しました。', 'info');
    }
}

const gazeStyles = document.createElement('style');
gazeStyles.textContent = `
    .character-btn.gaze-hover {
        background: #3498db !important;
        color: white !important;
        transform: scale(1.1);
        box-shadow: 0 0 20px rgba(52, 152, 219, 0.5);
    }
    
    .character-btn.gaze-selected {
        background: #e74c3c !important;
        color: white !important;
        transform: scale(1.2);
        box-shadow: 0 0 25px rgba(231, 76, 60, 0.8);
    }
    
    @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(1); }
        100% { transform: translate(-50%, -50%) scale(1.2); }
    }
`;
document.head.appendChild(gazeStyles);