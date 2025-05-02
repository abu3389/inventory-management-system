import { defineStore } from 'pinia'
const { ipcRenderer } = require('electron')

export const useSkuImageStore = defineStore('skuImage', () => {
  // 获取SKU图片列表
  const getImages = async (styleCode, skuCode) => {
    try {
      const result = await ipcRenderer.invoke('sku:getImages', {
        styleCode,
        skuCode
      })
      return result
    } catch (error) {
      console.error('获取SKU图片失败:', error)
      return { success: false, error: '获取SKU图片失败' }
    }
  }

  // 上传SKU图片
  const uploadImages = async (params) => {
    try {
      const result = await ipcRenderer.invoke('sku:uploadImages', params)
      return result
    } catch (error) {
      console.error('上传SKU图片失败:', error)
      return { success: false, error: '上传SKU图片失败' }
    }
  }

  // 删除SKU图片
  const deleteImage = async (imageId, filePath) => {
    try {
      const result = await ipcRenderer.invoke('sku:deleteImage', {
        imageId,
        filePath
      })
      return result
    } catch (error) {
      console.error('删除SKU图片失败:', error)
      return { success: false, error: '删除SKU图片失败' }
    }
  }

  // 批量保存SKU图片数据
  const saveBatchImages = async (skuId, images) => {
    try {
      // 过滤图片数据，只保留必要的属性，避免传递不可序列化的对象
      const filteredImages = images.map(img => ({
        id: img.id,
        fileName: img.fileName,
        filePath: img.filePath,
        order: img.order
      }))
      
      const result = await ipcRenderer.invoke('sku:saveBatchImages', {
        skuId,
        images: filteredImages
      })
      return result
    } catch (error) {
      console.error('保存SKU图片失败:', error)
      return { success: false, error: '保存SKU图片失败' }
    }
  }

  return {
    getImages,
    uploadImages,
    deleteImage,
    saveBatchImages
  }
}) 