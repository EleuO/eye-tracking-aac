class CharacterBoard {
    constructor() {
        this.characterGrid = document.getElementById('characterGrid');
        this.messageOutput = document.getElementById('messageOutput');
        this.charCount = document.getElementById('charCount');
        
        // 50音配列（視線入力に最適化）
        this.characters = [
            // 第1行: あ行
            ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'],
            // 第2行: か行
            ['か', 'き', 'く', 'け', 'こ', 'カ', 'キ', 'ク', 'ケ', 'コ'],
            // 第3行: さ行
            ['さ', 'し', 'す', 'せ', 'そ', 'サ', 'シ', 'ス', 'セ', 'ソ'],
            // 第4行: た行
            ['た', 'ち', 'つ', 'て', 'と', 'タ', 'チ', 'ツ', 'テ', 'ト'],
            // 第5行: な行
            ['な', 'に', 'ぬ', 'ね', 'の', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
            // 第6行: は行
            ['は', 'ひ', 'ふ', 'へ', 'ほ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
            // 第7行: ま行
            ['ま', 'み', 'む', 'め', 'も', 'マ', 'ミ', 'ム', 'メ', 'モ'],
            // 第8行: や行・ら行
            ['や', 'ゆ', 'よ', 'ら', 'り', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ'],
            // 第9行: ら行・わ行
            ['る', 'れ', 'ろ', 'わ', 'ん', 'ル', 'レ', 'ロ', 'ワ', 'ン'],
            // 第10行: 記号・数字
            ['。', '、', '！', '？', 'ー', '１', '２', '３', '４', '５']
        ];
        
        // 濁音・半濁音対応表
        this.dakutenMap = {
            'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
            'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
            'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
            'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
            'カ': 'ガ', 'キ': 'ギ', 'ク': 'グ', 'ケ': 'ゲ', 'コ': 'ゴ',
            'サ': 'ザ', 'シ': 'ジ', 'ス': 'ズ', 'セ': 'ゼ', 'ソ': 'ゾ',
            'タ': 'ダ', 'チ': 'ヂ', 'ツ': 'ヅ', 'テ': 'デ', 'ト': 'ド',
            'ハ': 'バ', 'ヒ': 'ビ', 'フ': 'ブ', 'ヘ': 'ベ', 'ホ': 'ボ'
        };
        
        this.handakutenMap = {
            'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
            'ハ': 'パ', 'ヒ': 'ピ', 'フ': 'プ', 'ヘ': 'ペ', 'ホ': 'ポ'
        };
        
        // 小文字対応表
        this.komojiMap = {
            'あ': 'ぁ', 'い': 'ぃ', 'う': 'ぅ', 'え': 'ぇ', 'お': 'ぉ',
            'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ', 'つ': 'っ',
            'ア': 'ァ', 'イ': 'ィ', 'ウ': 'ゥ', 'エ': 'ェ', 'オ': 'ォ',
            'ヤ': 'ャ', 'ユ': 'ュ', 'ヨ': 'ョ', 'ツ': 'ッ'
        };
        
        this.currentMode = 'hiragana'; // hiragana, katakana, numbers, symbols
        this.isShiftMode = false; // 濁音・半濁音モード
        this.maxLength = 100;
        
        this.init();
    }
    
    init() {
        this.createCharacterGrid();
        this.setupEventListeners();
        this.updateCharacterCount();
    }
    
    createCharacterGrid() {
        this.characterGrid.innerHTML = '';
        
        // モード切替ボタンを作成
        this.createModeButtons();
        
        // 文字ボタンを作成
        this.characters.forEach((row, rowIndex) => {
            row.forEach((char, colIndex) => {
                const button = this.createCharacterButton(char, rowIndex, colIndex);
                this.characterGrid.appendChild(button);
            });
        });
        
        // 特殊機能ボタンを作成
        this.createSpecialButtons();
    }
    
    createModeButtons() {
        const modeContainer = document.createElement('div');
        modeContainer.className = 'mode-buttons';
        modeContainer.style.cssText = `
            grid-column: 1 / -1;
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
        `;
        
        const modes = [
            { key: 'hiragana', label: 'あ', title: 'ひらがな' },
            { key: 'katakana', label: 'ア', title: 'カタカナ' },
            { key: 'numbers', label: '１', title: '数字' },
            { key: 'symbols', label: '記', title: '記号' }
        ];
        
        modes.forEach(mode => {
            const button = document.createElement('button');
            button.className = 'mode-btn control-btn small';
            button.textContent = mode.label;
            button.title = mode.title;
            button.onclick = () => this.switchMode(mode.key);
            
            if (mode.key === this.currentMode) {
                button.classList.add('active');
            }
            
            modeContainer.appendChild(button);
        });
        
        // 濁音・半濁音ボタン
        const shiftButton = document.createElement('button');
        shiftButton.className = 'shift-btn control-btn small';
        shiftButton.textContent = '゛゜';
        shiftButton.title = '濁音・半濁音';
        shiftButton.onclick = () => this.toggleShiftMode();
        
        if (this.isShiftMode) {
            shiftButton.classList.add('active');
        }
        
        modeContainer.appendChild(shiftButton);
        
        this.characterGrid.appendChild(modeContainer);
    }
    
    createCharacterButton(char, row, col) {
        const button = document.createElement('button');
        button.className = 'char-btn';
        button.textContent = char;
        button.dataset.char = char;
        button.dataset.row = row;
        button.dataset.col = col;
        
        // クリックイベント（マウス・タッチ用）
        button.addEventListener('click', (e) => {
            e.preventDefault();
            this.addCharacter(char);
        });
        
        // 視線入力対応のため、追加のデータ属性を設定
        button.setAttribute('tabindex', '0');
        button.setAttribute('aria-label', `文字 ${char}`);
        
        return button;
    }
    
    createSpecialButtons() {
        const specialContainer = document.createElement('div');
        specialContainer.className = 'special-buttons';
        specialContainer.style.cssText = `
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 5px;
            margin-top: 10px;
        `;
        
        const specialButtons = [
            { text: 'スペース', action: 'space', char: ' ' },
            { text: '削除', action: 'delete', char: null },
            { text: '全削除', action: 'clear', char: null },
            { text: '小文字', action: 'komoji', char: null },
            { text: '改行', action: 'newline', char: '\n' }
        ];
        
        specialButtons.forEach(spec => {
            const button = document.createElement('button');
            button.className = 'function-btn';
            button.textContent = spec.text;
            
            if (spec.action) {
                button.dataset.action = spec.action;
            }
            if (spec.char) {
                button.dataset.char = spec.char;
            }
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (spec.action) {
                    this.executeAction(spec.action);
                } else if (spec.char) {
                    this.addCharacter(spec.char);
                }
            });
            
            specialContainer.appendChild(button);
        });
        
        this.characterGrid.appendChild(specialContainer);
    }
    
    setupEventListeners() {
        // メッセージ出力の変更監視
        this.messageOutput.addEventListener('input', () => {
            this.updateCharacterCount();
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.target === this.messageOutput) {
                this.updateCharacterCount();
            }
        });
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        this.updateCharacterDisplay();
        
        // モードボタンの表示更新
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => btn.classList.remove('active'));
        
        const activeButton = Array.from(modeButtons).find(btn => {
            const modeMap = { 'あ': 'hiragana', 'ア': 'katakana', '１': 'numbers', '記': 'symbols' };
            return modeMap[btn.textContent] === mode;
        });
        
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    toggleShiftMode() {
        this.isShiftMode = !this.isShiftMode;
        this.updateCharacterDisplay();
        
        // シフトボタンの表示更新
        const shiftButton = document.querySelector('.shift-btn');
        if (shiftButton) {
            if (this.isShiftMode) {
                shiftButton.classList.add('active');
            } else {
                shiftButton.classList.remove('active');
            }
        }
    }
    
    updateCharacterDisplay() {
        const charButtons = document.querySelectorAll('.char-btn');
        
        charButtons.forEach(button => {
            const originalChar = button.dataset.char;
            let displayChar = originalChar;
            
            // シフトモードの場合、濁音・半濁音に変換
            if (this.isShiftMode) {
                if (this.dakutenMap[originalChar]) {
                    displayChar = this.dakutenMap[originalChar];
                } else if (this.handakutenMap[originalChar]) {
                    displayChar = this.handakutenMap[originalChar];
                }
            }
            
            button.textContent = displayChar;
        });
    }
    
    addCharacter(char) {
        const currentText = this.messageOutput.value;
        
        if (currentText.length >= this.maxLength) {
            this.showNotification('文字数の上限に達しました', 'warning');
            return;
        }
        
        // シフトモードの場合、濁音・半濁音に変換
        let finalChar = char;
        if (this.isShiftMode) {
            if (this.dakutenMap[char]) {
                finalChar = this.dakutenMap[char];
            } else if (this.handakutenMap[char]) {
                finalChar = this.handakutenMap[char];
            }
            
            // シフトモードを自動解除
            this.isShiftMode = false;
            this.toggleShiftMode();
        }
        
        this.messageOutput.value = currentText + finalChar;
        this.updateCharacterCount();
        
        // 音声フィードバック
        if (window.speechEngine) {
            window.speechEngine.speakCharacter(finalChar);
        }
        
        // 自動スクロール
        this.messageOutput.scrollTop = this.messageOutput.scrollHeight;
    }
    
    executeAction(action) {
        switch (action) {
            case 'delete':
                this.deleteLastCharacter();
                break;
            case 'clear':
                this.clearMessage();
                break;
            case 'space':
                this.addCharacter(' ');
                break;
            case 'newline':
                this.addCharacter('\n');
                break;
            case 'komoji':
                this.convertToKomoji();
                break;
            default:
                console.warn('不明なアクション:', action);
        }
    }
    
    deleteLastCharacter() {
        const currentText = this.messageOutput.value;
        if (currentText.length > 0) {
            this.messageOutput.value = currentText.slice(0, -1);
            this.updateCharacterCount();
            
            // 音声フィードバック
            if (window.speechEngine) {
                window.speechEngine.speak('削除');
            }
        }
    }
    
    clearMessage() {
        if (this.messageOutput.value.length > 0) {
            const confirm = window.confirm || (() => true);
            if (confirm('すべての文字を削除しますか？')) {
                this.messageOutput.value = '';
                this.updateCharacterCount();
                
                // 音声フィードバック
                if (window.speechEngine) {
                    window.speechEngine.speak('全削除しました');
                }
            }
        }
    }
    
    convertToKomoji() {
        const currentText = this.messageOutput.value;
        if (currentText.length === 0) return;
        
        const lastChar = currentText.slice(-1);
        if (this.komojiMap[lastChar]) {
            const newText = currentText.slice(0, -1) + this.komojiMap[lastChar];
            this.messageOutput.value = newText;
            
            // 音声フィードバック
            if (window.speechEngine) {
                window.speechEngine.speak('小文字に変換');
            }
        }
    }
    
    setMessage(text) {
        if (text.length > this.maxLength) {
            text = text.substring(0, this.maxLength);
        }
        
        this.messageOutput.value = text;
        this.updateCharacterCount();
    }
    
    getMessage() {
        return this.messageOutput.value;
    }
    
    updateCharacterCount() {
        const count = this.messageOutput.value.length;
        this.charCount.textContent = count;
        
        // 文字数に応じた色変更
        this.charCount.className = 'char-count';
        if (count >= this.maxLength) {
            this.charCount.style.color = '#e74c3c';
        } else if (count >= this.maxLength * 0.8) {
            this.charCount.style.color = '#f39c12';
        } else {
            this.charCount.style.color = '#7f8c8d';
        }
        
        // 読み上げボタンとコピーボタンの状態更新
        const speakBtn = document.getElementById('speakBtn');
        const copyBtn = document.getElementById('copyBtn');
        
        if (speakBtn) {
            speakBtn.disabled = count === 0;
        }
        if (copyBtn) {
            copyBtn.disabled = count === 0;
        }
    }
    
    showNotification(message, type = 'info') {
        // 通知表示（簡易版）
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'warning' ? '#f39c12' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
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
    
    // 予測入力機能（将来の拡張用）
    suggestWords(input) {
        // 簡易的な単語予測
        const commonWords = [
            'ありがとう', 'おはよう', 'こんにちは', 'こんばんは',
            'すみません', 'ごめんなさい', 'はい', 'いいえ',
            'おつかれさま', 'よろしく', 'おやすみ'
        ];
        
        return commonWords.filter(word => 
            word.startsWith(input) && word !== input
        ).slice(0, 5);
    }
    
    // 単語補完機能
    completeWord(partial) {
        const suggestions = this.suggestWords(partial);
        if (suggestions.length > 0) {
            return suggestions[0];
        }
        return partial;
    }
}