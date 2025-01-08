import { defineStore } from 'pinia'
const { ipcRenderer } = require('electron')

export const useStyleStore = defineStore('style', () => {
  // 获取款式分类列表
  const getStyles = async (industryId) => {
    try {
      const result = await ipcRenderer.invoke('style:getStyles', { industryId })
      return result
    } catch (error) {
      console.error('获取款式分类列表失败:', error)
      return { success: false, error: '获取款式分类列表失败' }
    }
  }

  // 创建款式分类
  const createStyle = async (styleData) => {
    try {
      const result = await ipcRenderer.invoke('style:createStyle', styleData)
      return result
    } catch (error) {
      console.error('创建款式分类失败:', error)
      return { success: false, error: '创建款式分类失败' }
    }
  }

  // 更新款式分类
  const updateStyle = async (styleId, styleData) => {
    try {
      const result = await ipcRenderer.invoke('style:updateStyle', {
        styleId,
        ...styleData
      })
      return result
    } catch (error) {
      console.error('更新款式分类失败:', error)
      return { success: false, error: '更新款式分类失败' }
    }
  }

  // 删除款式分类
  const deleteStyle = async (styleId) => {
    try {
      const result = await ipcRenderer.invoke('style:deleteStyle', { styleId })
      return result
    } catch (error) {
      console.error('删除款式分类失败:', error)
      return { success: false, error: '删除款式分类失败' }
    }
  }

  return {
    getStyles,
    createStyle,
    updateStyle,
    deleteStyle
  }
}) 