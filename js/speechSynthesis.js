class SpeechSynthesisManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.selectedVoice = null;
        this.settings = {
            voiceType: 'female',
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        };
        
        this.init();
    }
    
    init() {
        this.loadVoices();
        this.loadSettings();
        this.setupSettingsUI();
        
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                this.loadVoices();
            };
        }
    }
    
    loadVoices() {
        this.voices = this.synth.getVoices();
        this.selectBestVoice();
    }
    
    selectBestVoice() {
        const japaneseVoices = this.voices.filter(voice => 
            voice.lang.includes('ja') || voice.name.includes('日本')
        );
        
        if (japaneseVoices.length === 0) {
            console.warn('日本語音声が見つかりません。デフォルト音声を使用します。');
            this.selectedVoice = this.voices[0] || null;
            return;
        }
        
        const preferredNames = this.settings.voiceType === 'female' 
            ? ['Kyoko', 'Otoya', '女性', 'female']
            : ['Otoya', 'Kyoko', '男性', 'male'];
        
        for (const prefName of preferredNames) {
            const voice = japaneseVoices.find(v => 
                v.name.toLowerCase().includes(prefName.toLowerCase())
            );
            if (voice) {
                this.selectedVoice = voice;
                return;
            }
        }
        
        this.selectedVoice = japaneseVoices[0];
    }
    
    speak(text) {
        if (!text.trim()) return;
        
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }
        
        utterance.rate = this.settings.rate;
        utterance.pitch = this.settings.pitch;
        utterance.volume = this.settings.volume;
        utterance.lang = 'ja-JP';
        
        utterance.onstart = () => {
            console.log('音声再生開始:', text);
        };
        
        utterance.onend = () => {
            console.log('音声再生終了');
        };
        
        utterance.onerror = (event) => {
            console.error('音声再生エラー:', event.error);
        };
        
        this.synth.speak(utterance);
    }
    
    stop() {
        this.synth.cancel();
    }
    
    setupSettingsUI() {
        const voiceTypeSelect = document.getElementById('voiceType');
        const speechRateSlider = document.getElementById('speechRate');
        const rateValueSpan = document.getElementById('rateValue');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        
        if (voiceTypeSelect) {
            voiceTypeSelect.value = this.settings.voiceType;
            voiceTypeSelect.addEventListener('change', (e) => {
                this.settings.voiceType = e.target.value;
                this.selectBestVoice();
            });
        }
        
        if (speechRateSlider) {
            speechRateSlider.value = this.settings.rate;
            speechRateSlider.addEventListener('input', (e) => {
                this.settings.rate = parseFloat(e.target.value);
                if (rateValueSpan) {
                    rateValueSpan.textContent = this.settings.rate.toFixed(1);
                }
            });
        }
        
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
                this.showNotification('設定を保存しました');
            });
        }
        
        if (rateValueSpan) {
            rateValueSpan.textContent = this.settings.rate.toFixed(1);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('aac_speech_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('設定の読み込みエラー:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('aac_speech_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('設定の保存エラー:', error);
        }
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }
    
    getAvailableVoices() {
        return this.voices.filter(voice => 
            voice.lang.includes('ja') || voice.name.includes('日本')
        );
    }
    
    testVoice() {
        this.speak('こんにちは。これは音声テストです。');
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);