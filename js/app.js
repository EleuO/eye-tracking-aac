class AACApplication {
    constructor() {
        this.version = '2.0.0';
        this.initialized = false;
        this.components = {};
        
        // エラーハンドリング
        this.setupErrorHandling();
        
        // 初期化
        this.init();
    }
    
    async init() {
        try {
            console.log(`AAC視線入力式意思伝達装置 v${this.version} 初期化開始`);
            
            // ブラウザ互換性チェック
            if (!this.checkBrowserCompatibility()) {
                this.showCriticalError('お使いのブラウザはサポートされていません。Chrome、Firefox、Safariの最新版をご使用ください。');
                return;
            }
            
            // コンポーネント初期化
            await this.initializeComponents();
            
            // グローバル参照を設定
            this.setupGlobalReferences();
            
            // 統合イベントリスナー
            this.setupApplicationEvents();
            
            this.initialized = true;
            console.log('AAC システム初期化完了');
            
            // 初期化完了通知
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.showCriticalError('システムの初期化に失敗しました。ページを再読み込みしてください。');
        }
    }
    
    async initializeComponents() {
        const initSteps = [
            {
                name: 'カメラマネージャー',
                init: () => {
                    this.components.cameraManager = new CameraManager();
                    window.cameraManager = this.components.cameraManager;
                }
            },
            {
                name: '設定マネージャー',
                init: () => {
                    this.components.settingsManager = new SettingsManager();
                    window.settingsManager = this.components.settingsManager;
                }
            },
            {
                name: '音声エンジン',
                init: () => {
                    this.components.speechEngine = new SpeechEngine();
                    window.speechEngine = this.components.speechEngine;
                }
            },
            {
                name: '文字盤',
                init: () => {
                    this.components.characterBoard = new CharacterBoard();
                    window.characterBoard = this.components.characterBoard;
                }
            },
            {
                name: 'プリセットマネージャー',
                init: () => {
                    this.components.presetManager = new PresetManager();
                    window.presetManager = this.components.presetManager;
                }
            },
            {
                name: '視線追跡システム',
                init: () => {
                    this.components.eyeTracker = new AdvancedEyeTracker();
                    window.eyeTracker = this.components.eyeTracker;
                }
            }
        ];
        
        for (const step of initSteps) {
            try {
                console.log(`${step.name}を初期化中...`);
                await step.init();
                console.log(`${step.name}初期化完了`);
            } catch (error) {
                console.error(`${step.name}初期化エラー:`, error);
                throw new Error(`${step.name}の初期化に失敗しました: ${error.message}`);
            }
        }
    }
    
    setupGlobalReferences() {
        // グローバルアクセス用
        window.aacApp = this;
        
        // レガシー互換性
        window.aacApplication = this;
    }
    
    setupApplicationEvents() {
        // ページの可視性変更
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onApplicationHidden();
            } else {
                this.onApplicationVisible();
            }
        });
        
        // ウィンドウのリサイズ
        window.addEventListener('resize', this.debounce(() => {
            this.onWindowResize();
        }, 250));
        
        // ページのアンロード前
        window.addEventListener('beforeunload', (e) => {
            this.onBeforeUnload(e);
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // エラーイベント
        window.addEventListener('error', (e) => {
            this.handleRuntimeError(e);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.handlePromiseRejection(e);
        });
    }
    
    setupErrorHandling() {
        // グローバルエラーハンドラ
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logError('Runtime Error', event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.logError('Promise Rejection', event.reason);
        });
    }
    
    checkBrowserCompatibility() {
        // 必要な機能をチェック
        const requiredFeatures = [
            'navigator.mediaDevices',
            'navigator.mediaDevices.getUserMedia',
            'speechSynthesis',
            'localStorage',
            'Promise',
            'fetch'
        ];
        
        const missingFeatures = requiredFeatures.filter(feature => {
            try {
                return !this.getNestedProperty(window, feature);
            } catch {
                return true;
            }
        });
        
        if (missingFeatures.length > 0) {
            console.error('Missing browser features:', missingFeatures);
            return false;
        }
        
        return true;
    }
    
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    onApplicationHidden() {
        console.log('アプリケーションが非表示になりました');
        
        // 視線追跡を一時停止
        if (this.components.eyeTracker) {
            this.components.eyeTracker.pauseTracking();
        }
        
        // 音声を停止
        if (this.components.speechEngine) {
            this.components.speechEngine.stop();
        }
    }
    
    onApplicationVisible() {
        console.log('アプリケーションが表示されました');
        
        // 視線追跡を再開
        if (this.components.eyeTracker) {
            this.components.eyeTracker.resumeTracking();
        }
    }
    
    onWindowResize() {
        console.log('ウィンドウサイズが変更されました');
        
        // キャリブレーションをリセット（必要に応じて）
        if (this.components.eyeTracker?.isCalibrated) {
            const resetCalibration = confirm('画面サイズが変わりました。キャリブレーションをやり直しますか？');
            if (resetCalibration) {
                this.components.eyeTracker.resetCalibration();
            }
        }
    }
    
    onBeforeUnload(event) {
        // 未保存の変更があるかチェック
        const message = this.components.characterBoard?.getMessage();
        if (message && message.trim().length > 0) {
            const confirmMessage = '入力したメッセージが失われます。本当にページを離れますか？';
            event.preventDefault();
            event.returnValue = confirmMessage;
            return confirmMessage;
        }
    }
    
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + キーの組み合わせ
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'Enter':
                    // 読み上げ
                    event.preventDefault();
                    this.components.speechEngine?.speakBtn?.click();
                    break;
                case 's':
                    // 設定を開く
                    event.preventDefault();
                    this.components.settingsManager?.showSettings();
                    break;
                case 'd':
                    // 全削除
                    event.preventDefault();
                    this.components.characterBoard?.executeAction('clear');
                    break;
                case 'Backspace':
                    // 最後の文字を削除
                    event.preventDefault();
                    this.components.characterBoard?.executeAction('delete');
                    break;
            }
        }
        
        // ESCキー
        if (event.key === 'Escape') {
            // モーダルを閉じる
            this.components.settingsManager?.hideSettings();
            
            // キャリブレーションをキャンセル
            if (this.components.eyeTracker?.isCalibrating) {
                this.components.eyeTracker.cancelCalibration();
            }
        }
        
        // F1キー（ヘルプ）
        if (event.key === 'F1') {
            event.preventDefault();
            this.showHelp();
        }
    }
    
    handleRuntimeError(event) {
        console.error('Runtime error:', event.error);
        this.logError('Runtime Error', event.error);
        
        // 致命的エラーかどうか判定
        if (this.isCriticalError(event.error)) {
            this.showCriticalError('システムエラーが発生しました。ページを再読み込みしてください。');
        }
    }
    
    handlePromiseRejection(event) {
        console.error('Promise rejection:', event.reason);
        this.logError('Promise Rejection', event.reason);
    }
    
    isCriticalError(error) {
        const criticalPatterns = [
            /camera/i,
            /webgazer/i,
            /speechsynthesis/i,
            /localstorage/i
        ];
        
        const errorMessage = error?.message || error?.toString() || '';
        return criticalPatterns.some(pattern => pattern.test(errorMessage));
    }
    
    logError(type, error) {
        const errorLog = {
            type: type,
            message: error?.message || error?.toString(),
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        try {
            const existingLogs = JSON.parse(localStorage.getItem('aac_error_logs') || '[]');
            existingLogs.push(errorLog);
            
            // 最新100件のみ保持
            if (existingLogs.length > 100) {
                existingLogs.splice(0, existingLogs.length - 100);
            }
            
            localStorage.setItem('aac_error_logs', JSON.stringify(existingLogs));
        } catch (e) {
            console.error('Error log storage failed:', e);
        }
    }
    
    showWelcomeMessage() {
        const isFirstTime = !localStorage.getItem('aac_app_used_before');
        
        if (isFirstTime) {
            setTimeout(() => {
                const message = `視線入力式意思伝達装置へようこそ！\n\n1. カメラを選択してください\n2. キャリブレーションを実行してください\n3. 視線で文字を選択できます\n\n設定ボタンから詳細設定が可能です。`;
                
                if (this.components.speechEngine) {
                    this.components.speechEngine.speak('視線入力式意思伝達装置へようこそ。まず、カメラを選択してキャリブレーションを実行してください。');
                }
                
                alert(message);
                localStorage.setItem('aac_app_used_before', 'true');
            }, 1000);
        }
    }
    
    showHelp() {
        const helpContent = `
        視線入力式意思伝達装置 - ヘルプ
        
        【基本操作】
        1. カメラを選択
        2. キャリブレーション実行
        3. 文字を1.5秒見つめて選択
        4. 読み上げボタンで音声出力
        
        【キーボードショートカット】
        • Ctrl+Enter: 読み上げ
        • Ctrl+S: 設定を開く
        • Ctrl+D: 全削除
        • Ctrl+Backspace: 最後の文字を削除
        • F1: このヘルプを表示
        • ESC: モーダルを閉じる
        
        【トラブルシューティング】
        • カメラが映らない → ブラウザの許可設定を確認
        • 視線追跡が正確でない → キャリブレーションをやり直す
        • 音声が出ない → システムの音量設定を確認
        `;
        
        alert(helpContent);
    }
    
    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
        `;
        
        errorDiv.innerHTML = `
            <div style="max-width: 600px;">
                <h1 style="color: #e74c3c; margin-bottom: 20px;">🚨 システムエラー</h1>
                <p style="font-size: 18px; line-height: 1.6; margin-bottom: 30px;">${message}</p>
                <button onclick="location.reload()" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 16px;
                    border-radius: 8px;
                    cursor: pointer;
                ">ページを再読み込み</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    // ユーティリティ関数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // システム情報取得
    getSystemInfo() {
        return {
            version: this.version,
            initialized: this.initialized,
            userAgent: navigator.userAgent,
            components: Object.keys(this.components),
            settings: this.components.settingsManager?.getAllSettings(),
            errors: this.getErrorLogs()
        };
    }
    
    getErrorLogs() {
        try {
            return JSON.parse(localStorage.getItem('aac_error_logs') || '[]');
        } catch {
            return [];
        }
    }
    
    // デバッグ用
    enableDebugMode() {
        console.log('デバッグモードを有効にしました');
        window.aacDebug = {
            app: this,
            components: this.components,
            systemInfo: this.getSystemInfo(),
            clearErrors: () => localStorage.removeItem('aac_error_logs'),
            exportLogs: () => {
                const logs = this.getErrorLogs();
                const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `aac_error_logs_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        };
    }
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM読み込み完了 - AACアプリケーション開始');
    new AACApplication();
});

// デバッグモード（開発時用）
if (window.location.hash === '#debug') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.aacApp?.enableDebugMode();
        }, 1000);
    });
}