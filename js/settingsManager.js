class SettingsManager {
    constructor() {
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        
        // 設定要素
        this.gazePointSizeSlider = document.getElementById('gazePointSize');
        this.gazePointSizeValue = document.getElementById('gazePointSizeValue');
        this.showGazePointCheckbox = document.getElementById('showGazePoint');
        this.gazeSmoothingCheckbox = document.getElementById('gazeSmoothing');
        this.highContrastCheckbox = document.getElementById('highContrast');
        this.fontSizeSelect = document.getElementById('fontSize');
        
        this.defaultSettings = {
            // 視線設定
            gazePointSize: 10,
            showGazePoint: true,
            gazeSmoothing: true,
            dwellTime: 1500,
            calibrationAccuracy: 0.8,
            
            // 表示設定
            highContrast: false,
            fontSize: 'normal',
            theme: 'default',
            
            // 音声設定
            speechRate: 1.0,
            speechVolume: 1.0,
            preferredVoice: null,
            autoReadCharacters: false,
            
            // その他
            autoSave: true,
            confirmActions: true,
            showTutorial: true
        };
        
        this.settings = { ...this.defaultSettings };
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.setupUI();
        this.applySettings();
    }
    
    setupEventListeners() {
        // モーダル表示・非表示
        this.settingsBtn?.addEventListener('click', () => {
            this.showSettings();
        });
        
        this.closeSettingsBtn?.addEventListener('click', () => {
            this.hideSettings();
        });
        
        // モーダル外クリックで閉じる
        this.settingsModal?.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });
        
        // 設定保存・リセット
        this.saveSettingsBtn?.addEventListener('click', () => {
            this.saveSettings();
            this.hideSettings();
        });
        
        this.resetSettingsBtn?.addEventListener('click', () => {
            this.resetToDefaults();
        });
        
        // 設定変更イベント
        this.setupSettingChangeListeners();
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.settingsModal?.classList.contains('active')) {
                this.hideSettings();
            }
        });
    }
    
    setupSettingChangeListeners() {
        // ガゼポイントサイズ
        this.gazePointSizeSlider?.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.settings.gazePointSize = size;
            this.gazePointSizeValue.textContent = size + 'px';
            this.updateGazePointSize(size);
        });
        
        // ガゼポイント表示
        this.showGazePointCheckbox?.addEventListener('change', (e) => {
            this.settings.showGazePoint = e.target.checked;
            this.updateGazePointVisibility(e.target.checked);
        });
        
        // 視線スムージング
        this.gazeSmoothingCheckbox?.addEventListener('change', (e) => {
            this.settings.gazeSmoothing = e.target.checked;
            this.updateGazeSmoothing(e.target.checked);
        });
        
        // 高コントラストモード
        this.highContrastCheckbox?.addEventListener('change', (e) => {
            this.settings.highContrast = e.target.checked;
            this.updateHighContrast(e.target.checked);
        });
        
        // フォントサイズ
        this.fontSizeSelect?.addEventListener('change', (e) => {
            this.settings.fontSize = e.target.value;
            this.updateFontSize(e.target.value);
        });
    }
    
    setupUI() {
        // スライダーと値の初期設定
        if (this.gazePointSizeSlider) {
            this.gazePointSizeSlider.value = this.settings.gazePointSize;
        }
        if (this.gazePointSizeValue) {
            this.gazePointSizeValue.textContent = this.settings.gazePointSize + 'px';
        }
        
        // チェックボックスの初期設定
        if (this.showGazePointCheckbox) {
            this.showGazePointCheckbox.checked = this.settings.showGazePoint;
        }
        if (this.gazeSmoothingCheckbox) {
            this.gazeSmoothingCheckbox.checked = this.settings.gazeSmoothing;
        }
        if (this.highContrastCheckbox) {
            this.highContrastCheckbox.checked = this.settings.highContrast;
        }
        
        // セレクトボックスの初期設定
        if (this.fontSizeSelect) {
            this.fontSizeSelect.value = this.settings.fontSize;
        }
    }
    
    showSettings() {
        this.settingsModal?.classList.add('active');
        
        // フォーカス管理
        const firstInput = this.settingsModal?.querySelector('input, select, button');
        if (firstInput) {
            firstInput.focus();
        }
    }
    
    hideSettings() {
        this.settingsModal?.classList.remove('active');
    }
    
    updateGazePointSize(size) {
        const gazePoint = document.getElementById('gazePoint');
        if (gazePoint) {
            gazePoint.style.width = size + 'px';
            gazePoint.style.height = size + 'px';
        }
        
        // 視線追跡システムに通知
        if (window.eyeTracker) {
            window.eyeTracker.updateSettings({ gazePointSize: size });
        }
    }
    
    updateGazePointVisibility(show) {
        const gazePoint = document.getElementById('gazePoint');
        if (gazePoint) {
            if (show) {
                gazePoint.style.display = 'block';
            } else {
                gazePoint.style.display = 'none';
            }
        }
        
        // 視線追跡システムに通知
        if (window.eyeTracker) {
            window.eyeTracker.updateSettings({ showGazePoint: show });
        }
    }
    
    updateGazeSmoothing(enabled) {
        // 視線追跡システムに通知
        if (window.eyeTracker) {
            window.eyeTracker.updateSettings({ enableSmoothing: enabled });
        }
    }
    
    updateHighContrast(enabled) {
        const body = document.body;
        if (enabled) {
            body.classList.add('high-contrast');
        } else {
            body.classList.remove('high-contrast');
        }
    }
    
    updateFontSize(size) {
        const body = document.body;
        
        // 既存のフォントサイズクラスを削除
        body.classList.remove('font-large', 'font-extra-large');
        
        // 新しいフォントサイズクラスを追加
        switch (size) {
            case 'large':
                body.classList.add('font-large');
                break;
            case 'extra-large':
                body.classList.add('font-extra-large');
                break;
            default:
                // 'normal' の場合は何もしない
                break;
        }
    }
    
    applySettings() {
        // すべての設定を適用
        this.updateGazePointSize(this.settings.gazePointSize);
        this.updateGazePointVisibility(this.settings.showGazePoint);
        this.updateGazeSmoothing(this.settings.gazeSmoothing);
        this.updateHighContrast(this.settings.highContrast);
        this.updateFontSize(this.settings.fontSize);
        
        // 他のシステムに設定を通知
        if (window.eyeTracker) {
            window.eyeTracker.updateSettings({
                showGazePoint: this.settings.showGazePoint,
                gazePointSize: this.settings.gazePointSize,
                enableSmoothing: this.settings.gazeSmoothing,
                dwellTime: this.settings.dwellTime
            });
        }
        
        if (window.speechEngine) {
            window.speechEngine.updateSettings({
                rate: this.settings.speechRate,
                volume: this.settings.speechVolume,
                preferredVoice: this.settings.preferredVoice,
                autoReadCharacters: this.settings.autoReadCharacters
            });
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('aac_app_settings');
            if (saved) {
                const loadedSettings = JSON.parse(saved);
                this.settings = { ...this.defaultSettings, ...loadedSettings };
            }
        } catch (error) {
            console.error('設定読み込みエラー:', error);
            this.settings = { ...this.defaultSettings };
        }
    }
    
    saveSettings() {
        try {
            // 他のシステムから最新の設定を取得
            if (window.eyeTracker) {
                const eyeSettings = window.eyeTracker.getSettings?.() || {};
                this.settings = { ...this.settings, ...eyeSettings };
            }
            
            if (window.speechEngine) {
                const speechSettings = window.speechEngine.getSettings?.() || {};
                this.settings = { ...this.settings, ...speechSettings };
            }
            
            localStorage.setItem('aac_app_settings', JSON.stringify(this.settings));
            this.showNotification('設定を保存しました', 'success');
            
        } catch (error) {
            console.error('設定保存エラー:', error);
            this.showNotification('設定の保存に失敗しました', 'error');
        }
    }
    
    resetToDefaults() {
        if (confirm('すべての設定をリセットしますか？')) {
            this.settings = { ...this.defaultSettings };
            this.setupUI();
            this.applySettings();
            this.saveSettings();
            this.showNotification('設定をリセットしました', 'success');
        }
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        
        // 即座に適用
        switch (key) {
            case 'gazePointSize':
                this.updateGazePointSize(value);
                break;
            case 'showGazePoint':
                this.updateGazePointVisibility(value);
                break;
            case 'gazeSmoothing':
                this.updateGazeSmoothing(value);
                break;
            case 'highContrast':
                this.updateHighContrast(value);
                break;
            case 'fontSize':
                this.updateFontSize(value);
                break;
        }
        
        // 自動保存が有効な場合は保存
        if (this.settings.autoSave) {
            this.saveSettings();
        }
    }
    
    getSetting(key) {
        return this.settings[key];
    }
    
    getAllSettings() {
        return { ...this.settings };
    }
    
    exportSettings() {
        const data = {
            settings: this.settings,
            exportDate: new Date().toISOString(),
            version: '1.0',
            application: 'AAC Eye Tracking Device'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aac_settings_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('設定をエクスポートしました', 'success');
    }
    
    importSettings(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.settings) {
                    throw new Error('無効なファイル形式です');
                }
                
                // 設定をマージ（デフォルト値で不足分を補完）
                this.settings = { ...this.defaultSettings, ...data.settings };
                
                this.setupUI();
                this.applySettings();
                this.saveSettings();
                
                this.showNotification('設定をインポートしました', 'success');
                
            } catch (error) {
                console.error('インポートエラー:', error);
                this.showNotification('ファイルの読み込みに失敗しました', 'error');
            }
        };
        
        reader.readAsText(file);
    }
    
    createSettingsBackup() {
        const backup = {
            settings: this.settings,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        try {
            localStorage.setItem('aac_settings_backup', JSON.stringify(backup));
            console.log('設定のバックアップを作成しました');
        } catch (error) {
            console.error('バックアップ作成エラー:', error);
        }
    }
    
    restoreFromBackup() {
        try {
            const backup = localStorage.getItem('aac_settings_backup');
            if (backup) {
                const data = JSON.parse(backup);
                this.settings = { ...this.defaultSettings, ...data.settings };
                this.setupUI();
                this.applySettings();
                this.saveSettings();
                this.showNotification('バックアップから設定を復元しました', 'success');
                return true;
            }
        } catch (error) {
            console.error('バックアップ復元エラー:', error);
        }
        return false;
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        const colors = {
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c',
            info: '#3498db'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 160px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-weight: 600;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 設定の妥当性チェック
    validateSettings(settings) {
        const validations = {
            gazePointSize: (val) => val >= 5 && val <= 25,
            dwellTime: (val) => val >= 500 && val <= 5000,
            speechRate: (val) => val >= 0.5 && val <= 2.0,
            speechVolume: (val) => val >= 0 && val <= 1.0,
            fontSize: (val) => ['normal', 'large', 'extra-large'].includes(val)
        };
        
        for (const [key, validator] of Object.entries(validations)) {
            if (settings[key] !== undefined && !validator(settings[key])) {
                console.warn(`無効な設定値: ${key} = ${settings[key]}`);
                delete settings[key];
            }
        }
        
        return settings;
    }
}