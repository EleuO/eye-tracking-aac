class PresetManager {
    constructor() {
        this.presets = [];
        this.presetsList = document.getElementById('presetsList');
        this.savePresetBtn = document.getElementById('savePresetBtn');
        this.messageText = document.getElementById('messageText');
        
        this.init();
    }
    
    init() {
        this.loadPresets();
        this.setupEventListeners();
        this.renderPresets();
        this.createDefaultPresets();
    }
    
    setupEventListeners() {
        if (this.savePresetBtn) {
            this.savePresetBtn.addEventListener('click', () => {
                this.showSavePresetDialog();
            });
        }
    }
    
    createDefaultPresets() {
        if (this.presets.length === 0) {
            const defaultPresets = [
                'おはよう',
                'こんにちは',
                'ありがとう',
                'すみません',
                'はい',
                'いいえ',
                '助けて',
                'お疲れ様',
                'おやすみ',
                'お腹が空いた',
                '水が飲みたい',
                'トイレに行きたい',
                '痛い',
                '大丈夫'
            ];
            
            defaultPresets.forEach(text => {
                this.addPreset(text);
            });
            
            this.savePresets();
            this.renderPresets();
        }
    }
    
    showSavePresetDialog() {
        const text = this.messageText.value.trim();
        if (!text) {
            this.showNotification('保存するメッセージを入力してください', 'warning');
            return;
        }
        
        if (text.length > 50) {
            this.showNotification('プリセットは50文字以内で保存してください', 'warning');
            return;
        }
        
        if (this.presets.some(preset => preset.text === text)) {
            this.showNotification('このメッセージは既に保存されています', 'warning');
            return;
        }
        
        const name = prompt('プリセット名を入力してください（空白の場合はメッセージがそのまま名前になります）:');
        if (name === null) return;
        
        this.addPreset(text, name.trim() || text);
        this.savePresets();
        this.renderPresets();
        this.showNotification('プリセットを保存しました', 'success');
    }
    
    addPreset(text, name = null) {
        const preset = {
            id: Date.now().toString(),
            text: text,
            name: name || text,
            createdAt: new Date().toISOString()
        };
        
        this.presets.push(preset);
        return preset;
    }
    
    deletePreset(id) {
        const preset = this.presets.find(p => p.id === id);
        if (!preset) return;
        
        if (confirm(`「${preset.name}」を削除しますか？`)) {
            this.presets = this.presets.filter(p => p.id !== id);
            this.savePresets();
            this.renderPresets();
            this.showNotification('プリセットを削除しました', 'success');
        }
    }
    
    editPreset(id) {
        const preset = this.presets.find(p => p.id === id);
        if (!preset) return;
        
        const newText = prompt('新しいメッセージを入力してください:', preset.text);
        if (newText === null) return;
        
        const trimmedText = newText.trim();
        if (!trimmedText) {
            this.showNotification('メッセージは空にできません', 'warning');
            return;
        }
        
        if (trimmedText.length > 50) {
            this.showNotification('メッセージは50文字以内で入力してください', 'warning');
            return;
        }
        
        const newName = prompt('新しいプリセット名を入力してください:', preset.name);
        if (newName === null) return;
        
        preset.text = trimmedText;
        preset.name = newName.trim() || trimmedText;
        preset.updatedAt = new Date().toISOString();
        
        this.savePresets();
        this.renderPresets();
        this.showNotification('プリセットを更新しました', 'success');
    }
    
    usePreset(id) {
        const preset = this.presets.find(p => p.id === id);
        if (!preset) return;
        
        this.messageText.value = preset.text;
        window.aacApp.updateCharacterCount();
        this.showNotification(`「${preset.name}」を選択しました`, 'info');
    }
    
    renderPresets() {
        if (!this.presetsList) return;
        
        this.presetsList.innerHTML = '';
        
        if (this.presets.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'プリセットがありません';
            emptyMessage.style.cssText = `
                text-align: center;
                color: #7f8c8d;
                padding: 20px;
                font-style: italic;
            `;
            this.presetsList.appendChild(emptyMessage);
            return;
        }
        
        this.presets.forEach(preset => {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            
            presetItem.innerHTML = `
                <div class="preset-text" title="${preset.text}">${preset.name}</div>
                <div class="preset-controls">
                    <button class="edit-btn" title="編集">編集</button>
                    <button class="delete-btn" title="削除">削除</button>
                </div>
            `;
            
            const textDiv = presetItem.querySelector('.preset-text');
            const editBtn = presetItem.querySelector('.edit-btn');
            const deleteBtn = presetItem.querySelector('.delete-btn');
            
            textDiv.addEventListener('click', () => {
                this.usePreset(preset.id);
            });
            
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editPreset(preset.id);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePreset(preset.id);
            });
            
            this.presetsList.appendChild(presetItem);
        });
    }
    
    loadPresets() {
        try {
            const saved = localStorage.getItem('aac_presets');
            if (saved) {
                this.presets = JSON.parse(saved);
            }
        } catch (error) {
            console.error('プリセットの読み込みエラー:', error);
            this.presets = [];
        }
    }
    
    savePresets() {
        try {
            localStorage.setItem('aac_presets', JSON.stringify(this.presets));
        } catch (error) {
            console.error('プリセットの保存エラー:', error);
        }
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
            top: 20px;
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
    
    exportPresets() {
        const data = {
            presets: this.presets,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aac_presets_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('プリセットをエクスポートしました', 'success');
    }
    
    importPresets(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.presets && Array.isArray(data.presets)) {
                    const importCount = data.presets.length;
                    this.presets = [...this.presets, ...data.presets];
                    this.savePresets();
                    this.renderPresets();
                    this.showNotification(`${importCount}個のプリセットをインポートしました`, 'success');
                } else {
                    this.showNotification('無効なファイル形式です', 'error');
                }
            } catch (error) {
                console.error('インポートエラー:', error);
                this.showNotification('ファイルの読み込みに失敗しました', 'error');
            }
        };
        reader.readAsText(file);
    }
}