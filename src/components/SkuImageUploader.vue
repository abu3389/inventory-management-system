<template>
  <div class="sku-image-uploader">
    <div class="image-actions">
      <el-button type="primary" @click="openFileDialog">
        <el-icon><Upload /></el-icon>
        上传图片
      </el-button>
      <el-button type="info" @click="refreshImages" :loading="refreshing">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      <span class="upload-tip">支持 JPG、PNG 格式，单个文件不超过 5MB</span>
    </div>
    
    <div v-if="imageList.length > 0" class="image-list">
      <el-row :gutter="12">
        <el-col 
          v-for="(image, index) in imageList" 
          :key="index" 
          :xs="12" 
          :sm="8" 
          :md="6" 
          :lg="4" 
          class="image-item-col"
        >
          <div class="image-item">
            <div class="image-wrapper">
              <el-image 
                :src="image.base64Url || image.url" 
                fit="cover"
                @click="previewImage(index)"
                class="thumbnail"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    加载失败
                  </div>
                </template>
              </el-image>
              <div class="image-actions-overlay">
                <el-button 
                  type="danger" 
                  circle 
                  size="small" 
                  @click="removeImage(index)"
                  class="delete-btn"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="image-info">
              <span class="image-name" :title="image.fileName">{{ image.fileName }}</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
    
    <div v-else class="empty-list">
      <el-icon><Picture /></el-icon>
      <p>暂无图片，请上传</p>
    </div>

    <!-- 图片预览 -->
    <teleport to="body">
      <el-image-viewer
        v-if="showViewer"
        :url-list="imageUrlList"
        :initial-index="previewIndex"
        @close="showViewer = false"
      />
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Delete, Picture, Refresh } from '@element-plus/icons-vue'
const { ipcRenderer } = require('electron')

const props = defineProps({
  styleCode: {
    type: String,
    required: true
  },
  skuCode: {
    type: String,
    required: true
  },
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 图片列表
const imageList = ref([])

// 更新组件内部图片列表
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    imageList.value = [...newVal]
  } else {
    imageList.value = []
  }
}, { immediate: true, deep: true })

// 预览相关
const showViewer = ref(false)
const previewIndex = ref(0)
const imageUrlList = computed(() => imageList.value.map(img => img.base64Url || img.url))

// 刷新状态
const refreshing = ref(false)

// 打开文件选择对话框
const openFileDialog = async () => {
  try {
    const result = await ipcRenderer.invoke('dialog:openFile', {
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      uploadFiles(result.filePaths)
    }
  } catch (error) {
    console.error('选择文件失败:', error)
    ElMessage.error('选择文件失败')
  }
}

// 上传文件到指定目录
const uploadFiles = async (filePaths) => {
  try {
    if (!props.styleCode || !props.skuCode) {
      ElMessage.warning('请先填写款号和SKU编号')
      return
    }
    
    const result = await ipcRenderer.invoke('sku:uploadImages', {
      filePaths,
      styleCode: props.styleCode,
      skuCode: props.skuCode,
      existingCount: imageList.value.length
    })
    
    if (result.success) {
      // 添加新上传的图片到列表
      const newImageList = [...imageList.value, ...result.images]
      imageList.value = newImageList
      
      // 更新父组件的值
      emit('update:modelValue', newImageList)
      emit('change', newImageList)
      
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(result.error || '上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败')
  }
}

// 预览图片
const previewImage = (index) => {
  previewIndex.value = index
  showViewer.value = true
}

// 删除图片
const removeImage = async (index) => {
  try {
    // 二次确认
    await ElMessageBox.confirm(
      '确定要删除这张图片吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const imageToRemove = imageList.value[index]
    
    // 如果图片有ID，说明是已保存到数据库的图片，需要调用后端删除
    if (imageToRemove.id) {
      const result = await ipcRenderer.invoke('sku:deleteImage', {
        imageId: imageToRemove.id,
        filePath: imageToRemove.filePath
      })
      
      if (!result.success) {
        ElMessage.error(result.error || '删除失败')
        return
      }
    }
    
    // 从列表中移除
    const newImageList = [...imageList.value]
    newImageList.splice(index, 1)
    imageList.value = newImageList
    
    // 更新父组件的值
    emit('update:modelValue', newImageList)
    emit('change', newImageList)
    
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
    // 如果是用户取消删除，不做任何操作
  }
}

// 刷新图片列表
const refreshImages = async () => {
  if (!props.styleCode || !props.skuCode) {
    ElMessage.warning('无法获取款号或SKU编号')
    return
  }
  
  try {
    refreshing.value = true
    
    const result = await ipcRenderer.invoke('sku:getImages', {
      styleCode: props.styleCode,
      skuCode: props.skuCode
    })
    
    if (result.success) {
      const newImageList = result.images || []
      imageList.value = newImageList
      
      // 更新父组件的值
      emit('update:modelValue', newImageList)
      emit('change', newImageList)
      
      if (newImageList.length > 0) {
        ElMessage.success('刷新成功')
      }
    } else {
      ElMessage.error(result.error || '刷新失败')
    }
  } catch (error) {
    console.error('刷新失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped>
.sku-image-uploader {
  margin-bottom: 20px;
}

.image-actions {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.upload-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}

.image-list {
  margin-top: 15px;
}

.image-item-col {
  margin-bottom: 15px;
}

.image-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s;
  background-color: #fff;
}

.image-item:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.image-wrapper {
  position: relative;
  padding-bottom: 100%;
  height: 0;
  overflow: hidden;
}

.thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.image-actions-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-wrapper:hover .image-actions-overlay {
  opacity: 1;
}

.delete-btn {
  opacity: 0.9;
}

.image-info {
  padding: 8px;
}

.image-name {
  display: block;
  font-size: 12px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-list {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 150px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #909399;
  margin-top: 15px;
}

.empty-list .el-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.image-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

.image-error .el-icon {
  font-size: 24px;
  margin-bottom: 5px;
}
</style> 