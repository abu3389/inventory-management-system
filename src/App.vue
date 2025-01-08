<template>
  <div class="app">
    <router-view v-slot="{ Component }">
      <template v-if="!isLoginPage">
        <div class="app-container">
          <TitleBar 
            :title="currentTitle" 
            @toggle-menu="handleMenuToggle" 
          />
          <div class="main-container">
            <SideMenu 
              ref="menuRef"
              :is-collapse="isCollapse"
              class="side-menu"
            />
            <div class="content">
              <component :is="Component" />
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <component :is="Component" />
      </template>
    </router-view>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TitleBar from './components/TitleBar.vue'
import SideMenu from './components/SideMenu.vue'

const route = useRoute()
const menuRef = ref(null)
const isCollapse = ref(false)

const isLoginPage = computed(() => route.path === '/login')

const currentTitle = computed(() => {
  const currentRoute = route.matched[route.matched.length - 1]
  return currentRoute?.meta?.title || ''
})

const handleMenuToggle = () => {
  isCollapse.value = !isCollapse.value
}

// 监听路由变化，确保在路由切换时组件已经准备好
watch(
  () => route.path,
  () => {
    if (menuRef.value) {
      menuRef.value.toggleCollapse(isCollapse.value)
    }
  }
)
</script>

<style>
.app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.side-menu {
  flex-shrink: 0;
  transition: width 0.3s;
}

.content {
  flex: 1;
  overflow: auto;
  background-color: #f0f2f5;
  padding: 20px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>