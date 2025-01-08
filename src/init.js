import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './styles/main.scss'
import App from './App.vue'
import router from './router/router'
import { setupRouterGuards } from './router/middleware'
import { useAuthStore } from './stores/auth'

export async function initializeApp() {
  const app = createApp(App)
  const pinia = createPinia()
  
  // 注册 Pinia 持久化插件
  pinia.use(piniaPluginPersistedstate)
  
  // 先安装 pinia
  app.use(pinia)
  
  // 初始化 auth store
  const authStore = useAuthStore()
  
  // 检查初始状态
  const { ipcRenderer } = window.require('electron')
  try {
    // 检查数据库状态
    const dbResult = await ipcRenderer.invoke('database:check')
    if (!dbResult.success) {
      console.error('数据库检查失败')
      authStore.clearAllData()
    } else if (authStore.isAuthenticated) {
      // 验证用户是否在数据库中存在
      const userResult = await ipcRenderer.invoke('auth:validateUser', { 
        userId: authStore.user.id 
      })
      if (!userResult.success) {
        console.log('用户验证失败，清除缓存')
        authStore.clearAllData()
      }
    }
  } catch (error) {
    console.error('初始化检查失败:', error)
    authStore.clearAllData()
  }

  // 注册所有图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  // 安装其他插件
  app.use(router)
  app.use(ElementPlus)

  // 设置路由守卫
  setupRouterGuards(router)

  return app
} 