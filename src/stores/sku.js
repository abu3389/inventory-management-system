import { defineStore } from 'pinia'
const { ipcRenderer } = require('electron')

export const useSkuStore = defineStore('sku', () => {
  // 获取SKU列表
  const getSkus = async () => {
    try {
      const result = await ipcRenderer.invoke('sku:getSkus')
      return result
    } catch (error) {
      console.error('获取SKU列表失败:', error)
      return { success: false, error: '获取SKU列表失败' }
    }
  }

  // 创建SKU
  const createSku = async (skuData) => {
    try {
      const result = await ipcRenderer.invoke('sku:createSku', skuData)
      return result
    } catch (error) {
      console.error('创建SKU失败:', error)
      return { success: false, error: '创建SKU失败' }
    }
  }

  // 更新SKU
  const updateSku = async (skuId, skuData) => {
    try {
      const result = await ipcRenderer.invoke('sku:updateSku', {
        skuId,
        ...skuData
      })
      return result
    } catch (error) {
      console.error('更新SKU失败:', error)
      return { success: false, error: '更新SKU失败' }
    }
  }

  // 删除SKU
  const deleteSku = async (skuId) => {
    try {
      const result = await ipcRenderer.invoke('sku:deleteSku', { skuId })
      return result
    } catch (error) {
      console.error('删除SKU失败:', error)
      return { success: false, error: '删除SKU失败' }
    }
  }

  return {
    getSkus,
    createSku,
    updateSku,
    deleteSku
  }
}) 