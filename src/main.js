import { createApp } from 'vue'
// WebGazer.js版（旧）
// import App from './App.vue'  
// MediaPipe版（複雑 - 初期化に問題）
// import App from './App-MediaPipe.vue'
// シンプル版（マウス・キーボードのみ）
// import App from './App-Simple.vue'
// 視線入力版（新）- シンプル顔検出 + 視線ベースAAC
import App from './App-EyeGaze.vue'
import './assets/css/main.css'

// エラーハンドリング追加
window.addEventListener('error', (e) => {
  console.error('🚨 Global Error:', e.error)
  console.error('File:', e.filename, 'Line:', e.lineno)
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('🚨 Unhandled Promise Rejection:', e.reason)
})

console.log('🚀 Vue3 AAC アプリケーション開始')
console.log('🌐 Environment:', {
  production: import.meta.env.PROD,
  base: import.meta.env.BASE_URL,
  mode: import.meta.env.MODE
})

try {
  const app = createApp(App)
  
  // Vue エラーハンドラー
  app.config.errorHandler = (err, vm, info) => {
    console.error('🚨 Vue Error:', err)
    console.error('Info:', info)
    console.error('Component:', vm)
  }
  
  console.log('📱 Vue アプリケーションマウント中...')
  app.mount('#app')
  console.log('✅ Vue アプリケーションマウント完了')
  
} catch (error) {
  console.error('❌ Vue アプリケーション起動エラー:', error)
  
  // フォールバック画面を表示
  document.getElementById('app').innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>🚨 エラーが発生しました</h1>
      <p>アプリケーションの読み込みに失敗しました。</p>
      <p>コンソール（F12）でエラー詳細を確認してください。</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; margin: 10px; background: #e74c3c; color: white; border: none; border-radius: 5px;">
        再読み込み
      </button>
    </div>
  `
}