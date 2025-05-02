<template>
  <div class="sku-thumbnail">
    <div v-if="loading" class="thumbnail-loader">
      <el-icon class="loading-icon"><Loading /></el-icon>
    </div>
    <div
      v-else-if="imageList.length === 0"
      class="no-images"
      @click="loadImages"
    >
      <el-icon><Picture /></el-icon>
    </div>
    <div v-else class="thumbnail-container">
      <div class="thumbnail-image" @click="viewImages">
        <el-image :src="imageList[0].base64Url || imageList[0].url" fit="cover">
          <template #error>
            <div class="image-error">
              <el-icon><PictureFilled /></el-icon>
            </div>
          </template>
        </el-image>
        <div v-if="imageList.length > 1" class="image-count">
          <span>+{{ imageList.length }}</span>
        </div>
      </div>
    </div>

    <!-- 大图预览 -->
    <teleport to="body">
      <el-image-viewer
        v-if="showViewer"
        :url-list="imageUrlList"
        :initial-index="0"
        @close="showViewer = false"
      />
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineExpose } from "vue";
import { ElMessage } from "element-plus";
import { Picture, PictureFilled, Loading } from "@element-plus/icons-vue";
const { ipcRenderer } = require("electron");

const props = defineProps({
  styleCode: {
    type: String,
    required: true,
  },
  skuCode: {
    type: String,
    required: true,
  },
  // 是否自动加载图片
  autoLoad: {
    type: Boolean,
    default: true,
  },
});

// 图片列表
const imageList = ref([]);
const loading = ref(false);
const showViewer = ref(false);

// 图片URL列表
const imageUrlList = computed(() =>
  imageList.value.map((img) => img.base64Url || img.url)
);

// 加载图片
const loadImages = async () => {
  if (!props.styleCode || !props.skuCode) {
    return;
  }

  try {
    loading.value = true;

    const result = await ipcRenderer.invoke("sku:getImages", {
      styleCode: props.styleCode,
      skuCode: props.skuCode,
    });

    if (result.success) {
      imageList.value = result.images || [];
    } else {
      console.error("获取图片失败:", result.error);
    }
  } catch (error) {
    console.error("获取图片失败:", error);
  } finally {
    loading.value = false;
  }
};

// 查看大图
const viewImages = () => {
  if (imageList.value.length > 0) {
    showViewer.value = true;
  }
};

// 如果设置了自动加载，则组件挂载后自动加载图片
onMounted(() => {
  if (props.autoLoad) {
    loadImages();
  }
});

// 暴露刷新方法给父组件
defineExpose({
  refreshImages: loadImages
});
</script>

<style scoped>
.sku-thumbnail {
  width: 60px;
  height: 60px;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
}

.thumbnail-loader,
.no-images,
.thumbnail-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.loading-icon {
  font-size: 20px;
  animation: loading-rotate 2s linear infinite;
}

@keyframes loading-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.no-images .el-icon {
  font-size: 24px;
  color: #909399;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  position: relative;
}

.image-error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
  background: #f5f7fa;
}

.image-count {
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 2px 6px;
  font-size: 12px;
  border-top-left-radius: 4px;
}
</style>
