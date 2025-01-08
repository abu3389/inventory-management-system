import { defineStore } from 'pinia'
const { ipcRenderer } = require('electron')

export const useBrandStore = defineStore('brand', () => {
  // 获取品牌列表
  const getBrands = async () => {
    try {
      const result = await ipcRenderer.invoke('brand:getBrands')
      return result
    } catch (error) {
      console.error('获取品牌列表失败:', error)
      return { success: false, error: '获取品牌列表失败' }
    }
  }

  // 创建品牌
  const createBrand = async (brandData) => {
    try {
      const result = await ipcRenderer.invoke('brand:createBrand', brandData)
      return result
    } catch (error) {
      console.error('创建品牌失败:', error)
      return { success: false, error: '创建品牌失败' }
    }
  }

  // 更新品牌
  const updateBrand = async (brandId, brandData) => {
    try {
      const result = await ipcRenderer.invoke('brand:updateBrand', {
        brandId,
        ...brandData
      })
      return result
    } catch (error) {
      console.error('更新品牌失败:', error)
      return { success: false, error: '更新品牌失败' }
    }
  }

  // 删除品牌
  const deleteBrand = async (brandId) => {
    try {
      const result = await ipcRenderer.invoke('brand:deleteBrand', { brandId })
      return result
    } catch (error) {
      console.error('删除品牌失败:', error)
      return { success: false, error: '删除品牌失败' }
    }
  }

  return {
    getBrands,
    createBrand,
    updateBrand,
    deleteBrand
  }
}) 