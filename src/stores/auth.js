import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
const { ipcRenderer } = window.require('electron')

export const useAuthStore = defineStore('auth', () => {
  // 从 localStorage 恢复用户状态
  const storedUser = localStorage.getItem('user')
  const user = ref(storedUser ? JSON.parse(storedUser) : null)
  const isAuthenticated = computed(() => !!user.value)

  // 登录
  const login = async (username, password) => {
    try {
      console.log('Attempting login...')
      const result = await ipcRenderer.invoke('auth:login', { username, password })
      console.log('Login result:', result)
      if (result.success && result.user) {
        // 确保用户信息包含角色信息
        if (!result.user.role) {
          console.error('登录返回的用户信息中缺少角色信息:', result.user)
          return { success: false, error: '获取用户角色信息失败' }
        }
        user.value = result.user
        // 存储完整的用户信息，包括角色
        localStorage.setItem('user', JSON.stringify(result.user))
        console.log('登录成功，用户信息：', result.user)
        console.log('用户角色和权限：', result.user.role)
        // 通知主进程切换到主窗口
        ipcRenderer.send('switch-to-main-window')
      }
      return result
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, error: '登录失败' }
    }
  }

  // 注册
  const register = async (username, password) => {
    try {
      console.log('Attempting registration...')
      const result = await ipcRenderer.invoke('auth:register', { username, password })
      console.log('Registration result:', result)
      if (result.success && result.user) {
        // 确保用户信息包含角色信息
        if (!result.user.role) {
          console.error('注册返回的用户信息中缺少角色信息:', result.user)
          return { success: false, error: '获取用户角色信息失败' }
        }
        user.value = result.user
        // 存储完整的用户信息，包括角色
        localStorage.setItem('user', JSON.stringify(result.user))
        console.log('注册成功，用户信息：', result.user)
        console.log('用户角色和权限：', result.user.role)
        // 通知主进程切换到主窗口
        ipcRenderer.send('switch-to-main-window')
      }
      return result
    } catch (error) {
      console.error('注册失败:', error)
      return { success: false, error: error.message || '注册失败' }
    }
  }

  // 退出登录
  const logout = async () => {
    clearAllData()
    ipcRenderer.send('auth:logout')
    return { success: true }
  }

  // 清除所有存储的数据
  const clearAllData = () => {
    user.value = null
    // 清除所有本地存储
    localStorage.clear()
    sessionStorage.clear()
  }

  // 更新密码
  const updatePassword = async (userId, oldPassword, newPassword) => {
    try {
      const result = await ipcRenderer.invoke('auth:updatePassword', {
        userId,
        oldPassword,
        newPassword
      })
      return result
    } catch (error) {
      console.error('更新密码失败:', error)
      return { success: false, error: error.message || '更新密码失败' }
    }
  }

  // 获取用户列表
  const getUsers = async () => {
    try {
      console.log('auth store: 开始获取用户列表')
      const result = await ipcRenderer.invoke('auth:getUsers')
      console.log('auth store: 获取用户列表结果:', result)
      return result
    } catch (error) {
      console.error('auth store: 获取用户列表失败:', error)
      return { success: false, error: '获取用户列表失败' }
    }
  }

  // 创建用户
  const createUser = async (userData) => {
    try {
      const result = await ipcRenderer.invoke('auth:createUser', userData)
      return result
    } catch (error) {
      console.error('创建用户失败:', error)
      return { success: false, error: error.message || '创建用户失败' }
    }
  }

  // 更新用户角色
  const updateUserRole = async (userId, roleId) => {
    try {
      const result = await ipcRenderer.invoke('auth:updateUserRole', {
        userId,
        roleId
      })
      return result
    } catch (error) {
      console.error('更新用户角色失败:', error)
      return { success: false, error: '更新用户角色失败' }
    }
  }

  // 删除用户
  const deleteUser = async (userId) => {
    try {
      const result = await ipcRenderer.invoke('auth:deleteUser', { userId })
      return result
    } catch (error) {
      console.error('删除用户失败:', error)
      return { success: false, error: error.message || '删除用户失败' }
    }
  }

  // 重置用户密码
  const resetUserPassword = async (userId, newPassword) => {
    try {
      const result = await ipcRenderer.invoke('auth:resetUserPassword', {
        userId,
        newPassword
      })
      return result
    } catch (error) {
      console.error('重置密码失败:', error)
      return { success: false, error: error.message || '重置密码失败' }
    }
  }

  // 获取角色列表
  const getRoles = async () => {
    try {
      const result = await ipcRenderer.invoke('auth:getRoles')
      return result
    } catch (error) {
      console.error('获取角色列表失败:', error)
      return { success: false, error: '获取角色列表失败' }
    }
  }

  // 创建角色
  const createRole = async (roleData) => {
    try {
      // 确保数据是纯对象
      const data = {
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions.map(String) // 确保权限是字符串数组
      };

      const result = await ipcRenderer.invoke('auth:createRole', data);
      return result;
    } catch (error) {
      console.error('创建角色失败:', error);
      return { success: false, error: '创建角色失败' };
    }
  };

  // 更新角色
  const updateRole = async (roleId, roleData) => {
    try {
      // 确保数据是纯对象
      const data = {
        roleId,
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions.map(String) // 确保权限是字符串数组
      };
      
      const result = await ipcRenderer.invoke('auth:updateRole', data);
      return result;
    } catch (error) {
      console.error('更新角色失败:', error);
      return { success: false, error: '更新角色失败' };
    }
  };

  // 删除角色
  const deleteRole = async (roleId) => {
    try {
      const result = await ipcRenderer.invoke('auth:deleteRole', { roleId })
      return result
    } catch (error) {
      console.error('删除角色失败:', error)
      return { success: false, error: '删除角色失败' }
    }
  }

  // 更新用户
  const updateUser = async (userData) => {
    try {
      console.log("开始更新用户，传递的数据:", userData);
      const { ipcRenderer } = window.require("electron");
      const result = await ipcRenderer.invoke("auth:updateUser", userData);
      console.log("更新用户结果:", result);
      return result;
    } catch (error) {
      console.error("更新用户失败:", error);
      return { success: false, error: "更新用户失败" };
    }
  };

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    clearAllData,
    updatePassword,
    getUsers,
    createUser,
    updateUser,
    updateUserRole,
    deleteUser,
    resetUserPassword,
    getRoles,
    createRole,
    updateRole,
    deleteRole
  }
})
