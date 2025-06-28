# 視線入力式意思伝達装置 (Eye-Tracking AAC Device)

視線で操作できる日本語対応の意思伝達装置（AAC: Augmentative and Alternative Communication）です。

## 🌟 特徴

- **高精度視線追跡**: WebGazer.jsによる13点キャリブレーション
- **日本語対応**: 50音配列、ひらがな・カタカナ・数字・記号
- **音声合成**: 自然な日本語音声読み上げ（男性・女性選択可能）
- **プリセット機能**: よく使う言葉の登録・管理
- **アクセシビリティ**: 高コントラスト、フォントサイズ調整
- **視線フィードバック**: リアルタイムガゼポイント表示

## 🚀 使用方法

1. **デモサイトにアクセス**: [https://YOUR_USERNAME.github.io/eye-tracking-aac](https://YOUR_USERNAME.github.io/eye-tracking-aac)
2. **カメラアクセスを許可**
3. **キャリブレーション実行**: 13個の点を順番に見つめる
4. **文字選択**: 視線で1.5秒見つめて文字を選択
5. **音声出力**: 読み上げボタンで発話

## 🛠️ 技術仕様

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **視線追跡**: WebGazer.js
- **音声合成**: Web Speech API
- **対応ブラウザ**: Chrome, Firefox, Safari (最新版)
- **カメラ要件**: 1080p対応ウェブカメラ推奨

## 📁 プロジェクト構成

```
eye-tracking-aac/
├── index.html          # メインページ
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── app.js          # アプリケーション統合
│   ├── cameraManager.js     # カメラ管理
│   ├── eyeTrackingAdvanced.js # 視線追跡
│   ├── characterBoard.js    # 文字盤
│   ├── speechEngine.js      # 音声合成
│   ├── presetManager.js     # プリセット管理
│   └── settingsManager.js   # 設定管理
└── README.md           # このファイル
```

## 🎯 対象ユーザー

- ALS患者
- 脳性麻痺の方
- 脊髄損傷の方
- その他運動機能に制限のある方
- 視線入力技術の研究者・開発者

## ⚙️ 設定項目

- **視線設定**: ガゼポイント表示、スムージング、ドウェル時間
- **音声設定**: 話速、音量、音声タイプ
- **表示設定**: 高コントラスト、フォントサイズ
- **キャリブレーション**: 精度調整、リセット機能

## 🔧 開発・カスタマイズ

### ローカル開発環境

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/eye-tracking-aac.git
cd eye-tracking-aac

# ローカルサーバー起動
python3 -m http.server 8000
# または
npx http-server -p 8000

# ブラウザでアクセス
open http://localhost:8000
```

### キャリブレーション精度向上

```javascript
// ドウェル時間調整 (js/eyeTrackingAdvanced.js)
this.dwellTime = 1500; // ミリ秒

// キャリブレーション点数変更
this.calibrationPoints = this.generateCalibrationPoints(); // 13点
```

## 📝 ライセンス

MIT License - 商用・非商用問わず自由に利用可能

## 🤝 コントリビューション

Issues、Pull Requestsを歓迎します！

### 開発ガイドライン

1. 機能追加前にIssueで相談
2. アクセシビリティを最優先
3. 日本語コメント推奨
4. モバイル対応考慮

## 📞 サポート

- **GitHub Issues**: バグ報告・機能要望
- **Discussions**: 使用方法の質問・アイデア共有

## 🙏 謝辞

- [WebGazer.js](https://webgazer.cs.brown.edu/) - 視線追跡ライブラリ
- 視線入力技術の研究者の皆様
- AAC利用者・支援者の皆様

---

**⚠️ 重要**: このソフトウェアは支援技術として提供されますが、医療機器ではありません。医療用途での使用は専門家にご相談ください。