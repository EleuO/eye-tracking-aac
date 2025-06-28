class PresetManager {
    constructor() {
        this.presetsGrid = document.getElementById('presetsGrid');
        this.addPresetBtn = document.getElementById('addPresetBtn');
        
        this.presets = [];
        this.maxPresets = 20;
        this.maxPresetLength = 50;
        
        this.init();
    }
    
    init() {
        this.loadPresets();
        this.setupEventListeners();
        this.createDefaultPresets();
        this.renderPresets();
    }
    
    setupEventListeners() {
        this.addPresetBtn?.addEventListener('click', () => {
            this.showAddPresetDialog();
        });
    }
    
    createDefaultPresets() {
        if (this.presets.length === 0) {
            const defaultPresets = [
                { text: 'おはようございます', category: '挨拶' },
                { text: 'こんにちは', category: '挨拶' },
                { text: 'こんばんは', category: '挨拶' },
                { text: 'おやすみなさい', category: '挨拶' },
                { text: 'ありがとうございます', category: '感謝' },
                { text: 'すみません', category: '謝罪' },
                { text: 'ごめんなさい', category: '謝罪' },
                { text: 'はい', category: '返事' },
                { text: 'いいえ', category: '返事' },
                { text: 'わかりました', category: '返事' },
                { text: 'お疲れ様でした', category: '仕事' },
                { text: 'よろしくお願いします', category: '仕事' },
                { text: 'お腹が空きました', category: '体調' },
                { text: '喉が渇きました', category: '体調' },
                { text: '疲れました', category: '体調' },
                { text: '痛いです', category: '体調' },
                { text: 'トイレに行きたいです', category: '体調' },
                { text: '助けてください', category: '緊急' },
                { text: '大丈夫です', category: '体調' },
                { text: 'ちょっと待ってください', category: 'その他' }
            ];
            
            defaultPresets.forEach(preset => {
                this.addPreset(preset.text, preset.category);
            });
            
            this.savePresets();
        }
    }
    
    addPreset(text, category = 'その他', id = null) {
        if (this.presets.length >= this.maxPresets) {
            this.showNotification('プリセットの上限に達しました', 'warning');
            return null;
        }
        
        if (text.length > this.maxPresetLength) {
            this.showNotification(`プリセットは${this.maxPresetLength}文字以内で入力してください`, 'warning');
            return null;
        }
        
        // 重複チェック
        if (this.presets.some(preset => preset.text === text)) {
            this.showNotification('同じプリセットが既に存在します', 'warning');
            return null;
        }
        
        const preset = {
            id: id || this.generateId(),
            text: text,
            category: category,
            createdAt: new Date().toISOString(),
            usageCount: 0
        };
        
        this.presets.push(preset);
        this.sortPresets();
        return preset;
    }
    
    removePreset(id) {
        const index = this.presets.findIndex(preset => preset.id === id);
        if (index !== -1) {
            this.presets.splice(index, 1);
            return true;
        }
        return false;
    }
    
    updatePreset(id, newText, newCategory) {
        const preset = this.presets.find(p => p.id === id);
        if (preset) {
            preset.text = newText;
            preset.category = newCategory;
            preset.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }
    
    usePreset(id) {
        const preset = this.presets.find(p => p.id === id);
        if (preset) {
            preset.usageCount++;
            preset.lastUsed = new Date().toISOString();
            
            // メッセージに設定
            if (window.characterBoard) {
                window.characterBoard.setMessage(preset.text);
            }
            
            // 音声フィードバック
            if (window.speechEngine) {
                window.speechEngine.speak(`${preset.text}を選択しました`);
            }
            
            this.savePresets();
            this.renderPresets(); // 使用頻度順にソート表示
            
            return true;
        }
        return false;
    }
    
    renderPresets() {
        if (!this.presetsGrid) return;
        
        this.presetsGrid.innerHTML = '';
        
        if (this.presets.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-presets';
            emptyMessage.textContent = 'プリセットがありません';
            emptyMessage.style.cssText = `
                grid-column: 1 / -1;
                text-align: center;
                padding: 40px 20px;
                color: #7f8c8d;
                font-style: italic;
                background: #f8f9fa;
                border-radius: 10px;
                border: 2px dashed #bdc3c7;
            `;
            this.presetsGrid.appendChild(emptyMessage);
            return;
        }
        
        // カテゴリ別にグループ化
        const categories = this.groupByCategory();
        
        Object.keys(categories).forEach(category => {
            // カテゴリヘッダー
            if (Object.keys(categories).length > 1) {
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'category-header';
                categoryHeader.textContent = category;
                categoryHeader.style.cssText = `
                    grid-column: 1 / -1;
                    font-weight: 700;
                    color: #2c3e50;
                    margin: 15px 0 10px 0;
                    padding: 10px 15px;
                    background: linear-gradient(145deg, #ecf0f1, #d5dbdb);
                    border-radius: 8px;
                    border-left: 4px solid #3498db;
                `;
                this.presetsGrid.appendChild(categoryHeader);
            }
            
            // プリセットボタン
            categories[category].forEach(preset => {
                const presetElement = this.createPresetElement(preset);
                this.presetsGrid.appendChild(presetElement);
            });
        });
    }
    
    createPresetElement(preset) {
        const element = document.createElement('div');
        element.className = 'preset-item';
        element.style.cssText = `
            position: relative;
            background: linear-gradient(145deg, #ffffff, #f0f0f0);
            border: 2px solid #bdc3c7;
            border-radius: 10px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        `;
        
        // プリセットテキスト
        const textElement = document.createElement('div');
        textElement.className = 'preset-text';
        textElement.textContent = preset.text;
        textElement.style.cssText = `
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
            line-height: 1.4;
            word-wrap: break-word;
        `;
        
        // 使用回数表示
        const statsElement = document.createElement('div');
        statsElement.className = 'preset-stats';
        statsElement.textContent = `使用回数: ${preset.usageCount}`;
        statsElement.style.cssText = `
            font-size: 12px;
            color: #7f8c8d;
            margin-bottom: 10px;
        `;
        
        // コントロールボタン
        const controlsElement = document.createElement('div');
        controlsElement.className = 'preset-controls';
        controlsElement.style.cssText = `
            display: flex;
            gap: 5px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '編集';
        editBtn.className = 'control-btn small';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            this.showEditPresetDialog(preset);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '削除';
        deleteBtn.className = 'control-btn small';
        deleteBtn.style.background = '#e74c3c';
        deleteBtn.style.color = 'white';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.confirmDeletePreset(preset);
        };
        
        controlsElement.appendChild(editBtn);
        controlsElement.appendChild(deleteBtn);
        
        // 要素を組み立て
        element.appendChild(textElement);
        element.appendChild(statsElement);
        element.appendChild(controlsElement);
        
        // イベントハンドラ
        element.addEventListener('click', () => {
            this.usePreset(preset.id);
            element.classList.add('preset-btn'); // CSS適用のため
        });
        
        element.addEventListener('mouseenter', () => {
            element.style.background = 'linear-gradient(145deg, #27ae60, #229954)';
            element.style.color = 'white';
            element.style.borderColor = '#229954';
            element.style.transform = 'translateY(-2px)';
            element.style.boxShadow = '0 8px 20px rgba(39, 174, 96, 0.3)';
            controlsElement.style.opacity = '1';
            textElement.style.color = 'white';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.background = 'linear-gradient(145deg, #ffffff, #f0f0f0)';
            element.style.color = '#2c3e50';
            element.style.borderColor = '#bdc3c7';
            element.style.transform = 'translateY(0)';
            element.style.boxShadow = 'none';
            controlsElement.style.opacity = '0';
            textElement.style.color = '#2c3e50';
        });
        
        // 視線入力対応
        element.classList.add('preset-btn');
        element.dataset.text = preset.text;
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label', `プリセット: ${preset.text}`);
        
        return element;
    }
    
    groupByCategory() {
        const categories = {};
        
        this.presets.forEach(preset => {
            const category = preset.category || 'その他';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(preset);
        });
        
        // カテゴリ内で使用頻度順にソート
        Object.keys(categories).forEach(category => {
            categories[category].sort((a, b) => b.usageCount - a.usageCount);
        });
        
        return categories;
    }
    
    sortPresets() {
        this.presets.sort((a, b) => {
            // 使用頻度 > 最新使用日時 > 作成日時の順でソート
            if (b.usageCount !== a.usageCount) {
                return b.usageCount - a.usageCount;
            }
            
            const aLastUsed = a.lastUsed || a.createdAt;
            const bLastUsed = b.lastUsed || b.createdAt;
            
            return new Date(bLastUsed) - new Date(aLastUsed);
        });
    }
    
    showAddPresetDialog() {
        const text = window.characterBoard?.getMessage() || '';
        
        if (!text.trim()) {
            this.showNotification('保存するメッセージを入力してください', 'warning');
            return;
        }
        
        if (text.length > this.maxPresetLength) {
            this.showNotification(`プリセットは${this.maxPresetLength}文字以内で保存してください`, 'warning');
            return;
        }
        
        const category = prompt('カテゴリを入力してください（空白の場合は「その他」）:') || 'その他';
        
        if (this.addPreset(text, category)) {
            this.savePresets();
            this.renderPresets();
            this.showNotification('プリセットを保存しました', 'success');
        }
    }
    
    showEditPresetDialog(preset) {
        const newText = prompt('プリセットテキストを編集:', preset.text);
        if (newText === null) return;
        
        const trimmedText = newText.trim();
        if (!trimmedText) {
            this.showNotification('プリセットは空にできません', 'warning');
            return;
        }
        
        if (trimmedText.length > this.maxPresetLength) {
            this.showNotification(`プリセットは${this.maxPresetLength}文字以内で入力してください`, 'warning');
            return;
        }
        
        const newCategory = prompt('カテゴリを編集:', preset.category) || preset.category;
        
        if (this.updatePreset(preset.id, trimmedText, newCategory)) {
            this.savePresets();
            this.renderPresets();
            this.showNotification('プリセットを更新しました', 'success');
        }
    }
    
    confirmDeletePreset(preset) {
        if (confirm(`「${preset.text}」を削除しますか？`)) {
            if (this.removePreset(preset.id)) {
                this.savePresets();
                this.renderPresets();
                this.showNotification('プリセットを削除しました', 'success');
            }
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    loadPresets() {
        try {
            const saved = localStorage.getItem('aac_presets');
            if (saved) {
                this.presets = JSON.parse(saved);
                
                // 古いフォーマットとの互換性
                this.presets = this.presets.map(preset => ({
                    id: preset.id || this.generateId(),
                    text: preset.text,
                    category: preset.category || 'その他',
                    createdAt: preset.createdAt || new Date().toISOString(),
                    usageCount: preset.usageCount || 0,
                    lastUsed: preset.lastUsed || null
                }));
            }
        } catch (error) {
            console.error('プリセット読み込みエラー:', error);
            this.presets = [];
        }
    }
    
    savePresets() {
        try {
            localStorage.setItem('aac_presets', JSON.stringify(this.presets));
        } catch (error) {
            console.error('プリセット保存エラー:', error);
        }
    }
    
    exportPresets() {
        const data = {
            presets: this.presets,
            exportDate: new Date().toISOString(),
            version: '2.0'
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
    
    importPresets(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.presets || !Array.isArray(data.presets)) {
                    throw new Error('無効なファイル形式です');
                }
                
                const importCount = data.presets.length;
                const validPresets = data.presets.filter(preset => 
                    preset.text && preset.text.length <= this.maxPresetLength
                );
                
                this.presets = [...this.presets, ...validPresets];
                this.savePresets();
                this.renderPresets();
                
                this.showNotification(`${validPresets.length}個のプリセットをインポートしました`, 'success');
                
            } catch (error) {
                console.error('インポートエラー:', error);
                this.showNotification('ファイルの読み込みに失敗しました', 'error');
            }
        };
        
        reader.readAsText(file);
    }
    
    getStats() {
        return {
            totalPresets: this.presets.length,
            categories: Object.keys(this.groupByCategory()).length,
            totalUsage: this.presets.reduce((sum, preset) => sum + preset.usageCount, 0),
            mostUsed: this.presets.reduce((max, preset) => 
                preset.usageCount > (max?.usageCount || 0) ? preset : max, null
            )
        };
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
            top: 120px;
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
}