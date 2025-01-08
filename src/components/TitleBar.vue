<template>
  <div class="title-bar">
    <div class="left">
      <div class="menu-trigger" @click="toggleMenu">
        <el-icon :class="{ 'is-collapse': isCollapse }">
          <Fold v-if="isCollapse" />
          <Expand v-else />
        </el-icon>
      </div>
      <div class="divider"></div>
      <div class="breadcrumb">
        <el-icon><Location /></el-icon>
        <span class="title">{{ title }}</span>
      </div>
    </div>
    <div class="center">
      <span class="app-title">库存管理系统</span>
    </div>
    <div class="right">
      <div class="user-info">
        <el-dropdown trigger="hover" @command="handleCommand">
          <div class="user-dropdown-trigger">
            <el-avatar :size="28" class="user-avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <span class="username">{{ authStore.user?.username }}</span>
            <el-icon class="more-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="changePassword">
                <el-icon><Lock /></el-icon>
                <span>修改密码</span>
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon>
                <span>退出登录</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="divider"></div>
      <div class="window-controls">
        <div class="control-btn" @click="minimize" title="最小化">
          <el-icon><Minus /></el-icon>
        </div>
        <div
          class="control-btn"
          @click="maximize"
          :title="isMaximized ? '还原' : '最大化'"
        >
          <el-icon><FullScreen v-if="!isMaximized" /><Crop v-else /></el-icon>
        </div>
        <div class="control-btn close" @click="close" title="关闭">
          <el-icon><Close /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  Fold,
  Expand,
  User,
  ArrowDown,
  Lock,
  SwitchButton,
  Minus,
  FullScreen,
  Crop,
  Close,
  Location,
} from "@element-plus/icons-vue";
import { useAuthStore } from "../stores/auth";

const { ipcRenderer } = window.require("electron");

defineProps({
  title: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["toggle-menu"]);
const router = useRouter();
const authStore = useAuthStore();

const isCollapse = ref(false);
const isMaximized = ref(false);

const toggleMenu = () => {
  isCollapse.value = !isCollapse.value;
  emit("toggle-menu", isCollapse.value);
};

const handleCommand = async (command) => {
  switch (command) {
    case "changePassword":
      router.push("/settings/change-password");
      break;
    case "logout":
      handleLogout();
      break;
  }
};

const handleLogout = async () => {
  try {
    const result = await authStore.logout();
    if (result.success) {
      ElMessage.success("已退出登录");
      router.push("/login");
    }
  } catch (error) {
    console.error("退出登录失败:", error);
    ElMessage.error("退出登录失败");
  }
};

// 窗口控制
const minimize = () => {
  ipcRenderer.send("window-minimize");
};

const maximize = () => {
  ipcRenderer.send("window-maximize");
  isMaximized.value = !isMaximized.value;
};

const close = () => {
  ipcRenderer.send("window-close");
};
</script>

<style scoped>
.title-bar {
  height: 48px;
  background-color: #304156;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  color: #fff;
  user-select: none;
  border-bottom: 1px solid #1f2d3d;
}

.left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 200px;
  -webkit-app-region: no-drag;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #bfcbd9;
}

.breadcrumb .el-icon {
  font-size: 16px;
}

.divider {
  width: 1px;
  height: 20px;
  background-color: rgba(191, 203, 217, 0.2);
}

.center {
  flex: 1;
  text-align: center;
}

.app-title {
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  letter-spacing: 1px;
}

.right {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:focus-visible {
    outline: none;
    background-color: transparent;
  }
}

.user-dropdown-trigger:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  background-color: #263445;
  color: #fff;
}

.username {
  color: #e5eaf3;
  font-weight: 500;
}

.more-icon {
  font-size: 12px;
  color: #e5eaf3;
  transition: transform 0.3s;
}

:deep(.el-dropdown.is-active) .more-icon {
  transform: rotate(180deg);
}

.menu-trigger {
  -webkit-app-region: no-drag;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  color: #bfcbd9;
}

.menu-trigger:hover {
  background-color: #263445;
  color: #fff;
}

.menu-trigger .el-icon {
  font-size: 18px;
  transition: transform 0.3s;
}

.menu-trigger .el-icon.is-collapse {
  transform: rotate(180deg);
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: #bfcbd9;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-app-region: no-drag;
  border-radius: 4px;
  transition: all 0.2s;
  color: #bfcbd9;
}

.control-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.control-btn.close:hover {
  background-color: #e81123;
}

.control-btn .el-icon {
  font-size: 16px;
  color: inherit;
}

.control-btn:hover .el-icon {
  color: #fff;
}

:deep(.el-dropdown-menu) {
  padding: 4px 0;
  border: none;
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  margin-top: 8px;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  border-radius: 4px;
  margin: 0 4px;

  &:focus-visible {
    outline: none;
    background-color: transparent;
  }

  &:hover {
    background-color: #f5f7fa;
  }

  &[command="logout"] {
    color: #f56c6c;

    &:hover {
      background-color: #fff1f0;
    }

    :is(i) {
      color: #f56c6c;
    }
  }

  &[command="changePassword"] {
    color: #409eff;

    &:hover {
      background-color: #ecf5ff;
    }

    :is(i) {
      color: #409eff;
    }
  }
}

:deep(.el-dropdown-menu__item.is-divided) {
  position: relative;
  margin-top: 4px;
  padding-top: 10px;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 8px;
    right: 8px;
    height: 1px;
    background-color: #f0f0f0;
  }
}

:deep(.el-dropdown-menu__item[command="logout"]) {
  color: #f56c6c;
}

:deep(.el-dropdown-menu__item[command="logout"]) :is(i) {
  color: #f56c6c;
}

:deep(.el-dropdown-menu__item[command="logout"]:hover) {
  background-color: #fff1f0;
}

:deep(.el-dropdown-menu__item[command="changePassword"]) {
  color: #409eff;
}

:deep(.el-dropdown-menu__item[command="changePassword"]) :is(i) {
  color: #409eff;
}

:deep(.el-dropdown-menu__item[command="changePassword"]:hover) {
  background-color: #ecf5ff;
}

:deep(.el-dropdown-menu__item.is-divided) {
  position: relative;
}
</style>
