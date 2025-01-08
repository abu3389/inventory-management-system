import { initializeApp } from './init'

// 异步初始化应用
initializeApp().then(app => {
  app.mount('#app')
})
