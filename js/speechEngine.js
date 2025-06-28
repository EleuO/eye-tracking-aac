class SpeechEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.selectedVoice = null;
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speechRateSlider = document.getElementById('speechRate');
        this.speechRateValue = document.getElementById('speechRateValue');
        this.speechVolumeSlider = document.getElementById('speechVolume');
        this.speechVolumeValue = document.getElementById('speechVolumeValue');
        this.testSpeechBtn = document.getElementById('testSpeechBtn');
        this.speakBtn = document.getElementById('speakBtn');
        this.copyBtn = document.getElementById('copyBtn');
        
        this.settings = {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            preferredVoice: null,
            autoReadCharacters: false
        };
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadVoices();
            this.loadSettings();
            this.setupEventListeners();
            this.setupUI();
            
            // 音声読み込み完了を待つ
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => {
                    this.loadVoices();
                };
            }
            
        } catch (error) {
            console.error('音声エンジン初期化エラー:', error);
        }
    }
    
    setupEventListeners() {
        // 読み上げボタン
        this.speakBtn?.addEventListener('click', () => {
            const text = window.characterBoard?.getMessage() || '';
            if (text.trim()) {
                this.speak(text);
            }
        });
        
        // コピーボタン
        this.copyBtn?.addEventListener('click', () => {
            this.copyToClipboard();
        });
        
        // 音声テストボタン
        this.testSpeechBtn?.addEventListener('click', () => {
            this.testSpeech();
        });
        
        // 設定変更
        this.speechRateSlider?.addEventListener('input', (e) => {
            this.settings.rate = parseFloat(e.target.value);
            this.speechRateValue.textContent = this.settings.rate.toFixed(1);
            this.saveSettings();
        });
        
        this.speechVolumeSlider?.addEventListener('input', (e) => {
            this.settings.volume = parseFloat(e.target.value);
            this.speechVolumeValue.textContent = this.settings.volume.toFixed(1);
            this.saveSettings();
        });
        
        this.voiceSelect?.addEventListener('change', (e) => {
            this.selectVoice(e.target.value);
        });
    }
    
    async loadVoices() {
        return new Promise((resolve) => {
            const loadVoicesImpl = () => {
                this.voices = this.synth.getVoices();
                
                if (this.voices.length > 0) {
                    this.populateVoiceSelect();
                    this.selectBestVoice();
                    resolve();
                } else {
                    // 音声がまだ読み込まれていない場合は少し待つ
                    setTimeout(loadVoicesImpl, 100);
                }
            };
            
            loadVoicesImpl();
        });
    }
    
    populateVoiceSelect() {
        if (!this.voiceSelect) return;
        
        this.voiceSelect.innerHTML = '<option value="">音声を選択...</option>';
        
        // 日本語音声を優先的に表示
        const japaneseVoices = this.voices.filter(voice => 
            voice.lang.includes('ja') || voice.name.includes('日本')
        );
        
        const otherVoices = this.voices.filter(voice => 
            !voice.lang.includes('ja') && !voice.name.includes('日本')
        );
        
        // 日本語音声セクション
        if (japaneseVoices.length > 0) {
            const japaneseGroup = document.createElement('optgroup');
            japaneseGroup.label = '日本語音声';
            
            japaneseVoices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.value = voice.voiceURI || voice.name;
                option.textContent = this.formatVoiceName(voice);
                option.dataset.lang = voice.lang;
                option.dataset.gender = this.detectGender(voice.name);
                japaneseGroup.appendChild(option);
            });
            
            this.voiceSelect.appendChild(japaneseGroup);
        }
        
        // その他の音声セクション
        if (otherVoices.length > 0) {
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = 'その他の音声';
            
            otherVoices.slice(0, 10).forEach((voice) => { // 最大10個まで
                const option = document.createElement('option');
                option.value = voice.voiceURI || voice.name;
                option.textContent = this.formatVoiceName(voice);
                option.dataset.lang = voice.lang;
                option.dataset.gender = this.detectGender(voice.name);
                otherGroup.appendChild(option);
            });
            
            this.voiceSelect.appendChild(otherGroup);
        }
    }
    
    formatVoiceName(voice) {
        let name = voice.name;
        
        // macOSの音声名を日本語化
        const voiceNameMap = {
            'Kyoko': 'Kyoko (女性)',
            'Otoya': 'Otoya (男性)',
            'Siri Female': 'Siri (女性)',
            'Siri Male': 'Siri (男性)'
        };
        
        if (voiceNameMap[name]) {
            name = voiceNameMap[name];
        }
        
        // 性別を推定して表示
        const gender = this.detectGender(voice.name);
        if (gender && !name.includes('(')) {
            name += ` (${gender})`;
        }
        
        return name;
    }
    
    detectGender(voiceName) {
        const femaleKeywords = ['kyoko', 'female', '女性', 'woman', 'lady'];
        const maleKeywords = ['otoya', 'male', '男性', 'man'];
        
        const lowerName = voiceName.toLowerCase();
        
        if (femaleKeywords.some(keyword => lowerName.includes(keyword))) {
            return '女性';
        } else if (maleKeywords.some(keyword => lowerName.includes(keyword))) {
            return '男性';
        }
        
        return null;
    }
    
    selectBestVoice() {
        // 保存された設定から復元
        if (this.settings.preferredVoice) {
            const savedVoice = this.voices.find(voice => 
                (voice.voiceURI || voice.name) === this.settings.preferredVoice
            );
            if (savedVoice) {
                this.selectedVoice = savedVoice;
                this.voiceSelect.value = this.settings.preferredVoice;
                return;
            }
        }
        
        // 日本語音声を自動選択
        const japaneseVoices = this.voices.filter(voice => 
            voice.lang.includes('ja') || voice.name.includes('日本')
        );
        
        if (japaneseVoices.length === 0) {
            console.warn('日本語音声が見つかりません');
            this.selectedVoice = this.voices[0] || null;
            return;
        }
        
        // 優先度: Kyoko > Otoya > その他
        const preferredNames = ['Kyoko', 'Otoya'];
        
        for (const preferredName of preferredNames) {
            const voice = japaneseVoices.find(v => 
                v.name.includes(preferredName)
            );
            if (voice) {
                this.selectedVoice = voice;
                this.voiceSelect.value = voice.voiceURI || voice.name;
                return;
            }
        }
        
        // 見つからない場合は最初の日本語音声を使用
        this.selectedVoice = japaneseVoices[0];
        this.voiceSelect.value = this.selectedVoice.voiceURI || this.selectedVoice.name;
    }
    
    selectVoice(voiceId) {
        if (!voiceId) {
            this.selectedVoice = null;
            return;
        }
        
        const voice = this.voices.find(v => 
            (v.voiceURI || v.name) === voiceId
        );
        
        if (voice) {
            this.selectedVoice = voice;
            this.settings.preferredVoice = voiceId;
            this.saveSettings();
            
            console.log('音声を変更しました:', voice.name);
        }
    }
    
    speak(text, options = {}) {
        if (!text || !text.trim()) return;
        
        // 既存の発話を停止
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text.trim());
        
        // 音声設定
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }
        
        utterance.rate = options.rate || this.settings.rate;
        utterance.pitch = options.pitch || this.settings.pitch;
        utterance.volume = options.volume || this.settings.volume;
        utterance.lang = 'ja-JP';
        
        // イベントハンドラ
        utterance.onstart = () => {
            console.log('音声再生開始:', text);
            this.speakBtn?.classList.add('speaking');
        };
        
        utterance.onend = () => {
            console.log('音声再生終了');
            this.speakBtn?.classList.remove('speaking');
        };
        
        utterance.onerror = (event) => {
            console.error('音声再生エラー:', event.error);
            this.speakBtn?.classList.remove('speaking');
            this.showNotification('音声再生でエラーが発生しました', 'error');
        };
        
        // 音声再生
        this.synth.speak(utterance);
        
        return utterance;
    }
    
    speakCharacter(char) {
        if (!this.settings.autoReadCharacters) return;
        
        // 特殊文字の読み方を定義
        const charReadings = {
            ' ': 'スペース',
            '\n': '改行',
            '。': '句点',
            '、': '読点',
            '！': '感嘆符',
            '？': '疑問符',
            'ー': '長音符'
        };
        
        const reading = charReadings[char] || char;
        this.speak(reading, { rate: 1.5, volume: 0.5 });
    }
    
    testSpeech() {
        const testMessage = 'こんにちは。これは音声テストです。視線入力式意思伝達装置が正常に動作しています。';
        this.speak(testMessage);
    }
    
    async copyToClipboard() {
        const text = window.characterBoard?.getMessage() || '';
        
        if (!text.trim()) {
            this.showNotification('コピーする文字がありません', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('クリップボードにコピーしました', 'success');
            
            // 音声フィードバック
            this.speak('クリップボードにコピーしました', { rate: 1.2 });
            
        } catch (error) {
            console.error('クリップボードコピーエラー:', error);
            
            // フォールバック: テキスト選択
            try {
                const messageOutput = document.getElementById('messageOutput');
                messageOutput.select();
                document.execCommand('copy');
                this.showNotification('テキストを選択しました。Ctrl+Cでコピーしてください', 'info');
            } catch (fallbackError) {
                this.showNotification('コピーに失敗しました', 'error');
            }
        }
    }
    
    setupUI() {
        // スライダーの初期値設定
        if (this.speechRateSlider) {
            this.speechRateSlider.value = this.settings.rate;
        }
        if (this.speechRateValue) {
            this.speechRateValue.textContent = this.settings.rate.toFixed(1);
        }
        if (this.speechVolumeSlider) {
            this.speechVolumeSlider.value = this.settings.volume;
        }
        if (this.speechVolumeValue) {
            this.speechVolumeValue.textContent = this.settings.volume.toFixed(1);
        }
        
        // 読み上げボタンにキーボードショートカット表示
        if (this.speakBtn) {
            this.speakBtn.title = '読み上げ (Ctrl+Enter)';
        }
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.speakBtn?.click();
            }
        });
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('aac_speech_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('音声設定の読み込みエラー:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('aac_speech_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('音声設定の保存エラー:', error);
        }
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        this.setupUI();
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
            top: 80px;
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
    
    // 音声合成の利用可能性チェック
    isAvailable() {
        return 'speechSynthesis' in window;
    }
    
    // 現在の設定を取得
    getSettings() {
        return { ...this.settings };
    }
    
    // 音声を停止
    stop() {
        this.synth.cancel();
        this.speakBtn?.classList.remove('speaking');
    }
    
    // 利用可能な音声一覧を取得
    getVoices() {
        return this.voices.filter(voice => 
            voice.lang.includes('ja') || voice.name.includes('日本')
        );
    }
}