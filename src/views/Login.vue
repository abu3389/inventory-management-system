<template>
  <div class="login-container">
    <div class="window-controls">
      <el-button 
        class="control-btn" 
        text 
        @click="minimizeWindow"
      >
        <el-icon><Minus /></el-icon>
      </el-button>
      <el-button 
        class="control-btn close-btn" 
        text 
        @click="closeWindow"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <div class="login-content">
      <div class="login-header">
        <h2>{{ isLogin ? '登录' : '注册' }}</h2>
      </div>
      
      <el-form 
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="form.username" 
            placeholder="请输入用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        
        <el-form-item v-if="!isLogin" label="确认密码" prop="confirmPassword">
          <el-input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="请再次输入密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="loading"
            class="submit-btn"
            @click="handleSubmit"
          >
            {{ isLogin ? '登录' : '注册' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="form-footer">
        <el-button 
          link 
          type="primary" 
          class="toggle-btn"
          @click="toggleMode"
        >
          {{ isLogin ? '没有账号？立即注册' : '已有账号？立即登录' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Minus, Close } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
const { ipcRenderer } = require('electron')

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const loading = ref(false)
const isLogin = ref(true)

const form = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const validatePass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请输入密码'))
  } else {
    if (form.confirmPassword !== '') {
      formRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

const validatePass2 = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入密码不一致!'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度至少为3个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '密码只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  confirmPassword: [
    { validator: validatePass2, trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    const result = isLogin.value
      ? await authStore.login(form.username, form.password)
      : await authStore.register(form.username, form.password)
    
    if (result.success) {
      ElMessage.success(isLogin.value ? '登录成功' : '注册成功')
      router.push('/')
    } else {
      ElMessage.error(result.error)
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  form.username = ''
  form.password = ''
  form.confirmPassword = ''
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const minimizeWindow = () => {
  ipcRenderer.send('window-minimize')
}

const closeWindow = () => {
  ipcRenderer.send('window-close')
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-app-region: drag;
  position: relative;
}

.login-content {
  width: 300px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  -webkit-app-region: no-drag;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-header h2 {
  margin: 0;
  font-size: 26px;
  color: #fff;
  font-weight: 500;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 500;
  font-size: 14px;
  padding-bottom: 2px;
  line-height: 1.2;
  height: 18px;
}

:deep(.el-form-item) {
  margin-bottom: 24px;
  position: relative;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.3s;
  padding: 0 12px;
  height: 36px;
}

:deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.12);
}

:deep(.el-input__wrapper.is-focus) {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.15);
}

:deep(.el-input__inner) {
  color: #fff;
  height: 34px;
  line-height: 34px;
  font-size: 14px;
}

:deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.el-input__prefix-inner) {
  margin-right: 6px;
}

:deep(.el-input__prefix-inner .el-icon) {
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
}

.submit-btn {
  width: 100%;
  height: 38px;
  font-size: 15px;
  font-weight: 500;
  margin-top: 4px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.submit-btn:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.submit-btn:active {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  transform: translateY(0);
}

.form-footer {
  margin-top: 24px;
  text-align: center;
}

:deep(.toggle-btn) {
  font-size: 15px;
  height: 22px;
  padding: 0;
  color: rgba(255, 255, 255, 0.9);
}

:deep(.toggle-btn:hover) {
  color: #fff;
}

:deep(.el-form-item__error) {
  color: rgba(255, 182, 193, 0.9);
  font-size: 12px;
  margin-top: 4px;
  position: absolute;
  top: 100%;
  left: 0;
  padding-top: 2px;
  line-height: 1.2;
}

.window-controls {
  position: fixed;
  top: 0;
  right: 0;
  padding: 4px;
  display: flex;
  gap: 0;
  -webkit-app-region: no-drag;
  z-index: 1000;
}

.control-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  transition: all 0.3s;
  background: transparent;
  cursor: pointer;
  border: none;
}

.control-btn :deep(.el-icon) {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.control-btn:active {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn:hover :deep(.el-icon) {
  color: rgba(0, 0, 0, 0.8);
}

.close-btn:hover {
  background: rgba(232, 17, 35, 0.7);
}

.close-btn:active {
  background: rgba(232, 17, 35, 0.8);
}

.close-btn:hover :deep(.el-icon) {
  color: rgba(0, 0, 0, 0.8);
}
</style> 