import { defineStore } from 'pinia'
const { ipcRenderer } = require('electron')

export const useIndustryStore = defineStore('industry', () => {
  // 获取行业列表
  const getIndustries = async () => {
    try {
      const result = await ipcRenderer.invoke('industry:getIndustries')
      return result
    } catch (error) {
      console.error('获取行业列表失败:', error)
      return { success: false, error: '获取行业列表失败' }
    }
  }

  // 创建行业
  const createIndustry = async (industryData) => {
    try {
      const result = await ipcRenderer.invoke('industry:createIndustry', industryData)
      return result
    } catch (error) {
      console.error('创建行业失败:', error)
      return { success: false, error: '创建行业失败' }
    }
  }

  // 更新行业
  const updateIndustry = async (industryId, industryData) => {
    try {
      const result = await ipcRenderer.invoke('industry:updateIndustry', {
        industryId,
        ...industryData
      })
      return result
    } catch (error) {
      console.error('更新行业失败:', error)
      return { success: false, error: '更新行业失败' }
    }
  }

  // 删除行业
  const deleteIndustry = async (industryId) => {
    try {
      const result = await ipcRenderer.invoke('industry:deleteIndustry', { industryId })
      return result
    } catch (error) {
      console.error('删除行业失败:', error)
      return { success: false, error: '删除行业失败' }
    }
  }

  return {
    getIndustries,
    createIndustry,
    updateIndustry,
    deleteIndustry
  }
}) 