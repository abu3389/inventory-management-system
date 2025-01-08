<template>
  <div id="side-menu">
    <el-menu
      :default-active="activeIndex"
      class="el-menu-vertical"
      :collapse="isCollapse"
      router
      background-color="#304156"
      text-color="#bfcbd9"
      active-text-color="#409EFF"
    >
      <!-- 主菜单 -->
      <template v-for="route in mainMenuRoutes" :key="route.path">
        <el-menu-item v-if="hasPermission(route)" :index="route.path">
          <el-icon v-if="route.meta?.icon">
            <component :is="route.meta.icon" />
          </el-icon>
          <template #title>
            <span>{{ route.meta?.title || route.name }}</span>
          </template>
        </el-menu-item>
      </template>

      <!-- 分隔线 -->
      <div
        class="menu-divider"
        :class="{ 'menu-divider-collapsed': isCollapse }"
      ></div>

      <!-- 底部菜单 -->
      <template v-for="route in bottomMenuRoutes" :key="route.path">
        <el-sub-menu
          v-if="hasPermission(route) && route.children && route.children.length"
          :index="route.path"
        >
          <template #title>
            <el-icon v-if="route.meta?.icon">
              <component :is="route.meta.icon" />
            </el-icon>
            <span>{{ route.meta?.title || route.name }}</span>
          </template>
          <el-menu-item
            v-for="child in filterPermittedRoutes(route.children)"
            :key="child.path"
            :index="route.path + '/' + child.path"
          >
            <el-icon v-if="child.meta?.icon">
              <component :is="child.meta.icon" />
            </el-icon>
            <template #title>
              <span>{{ child.meta?.title || child.name }}</span>
            </template>
          </el-menu-item>
        </el-sub-menu>
      </template>
    </el-menu>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";

const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// 检查用户是否有权限访问路由
const hasPermission = (route) => {
  // 不需要权限的路由
  if (!route.meta?.requiresAuth) {
    return true;
  }

  // 检查用户角色权限
  const userRole = authStore.user?.role;
  if (!userRole) {
    return false;
  }

  // 如果是超级管理员（ID为1），拥有所有权限
  if (userRole.id === 1) {
    return true;
  }

  // 检查路由路径是否在用户权限列表中
  const userPermissions = userRole.permissions || [];
  return userPermissions.includes(route?.meta?.permission);
};

// 过滤有权限的子路由
const filterPermittedRoutes = (routes) => {
  return routes.filter((route) => hasPermission(route));
};

// 主菜单路由
const mainMenuRoutes = computed(() => {
  return router.options.routes.filter((route) => {
    return (
      route.path !== "/login" &&
      !route.path.startsWith("/settings") &&
      !route.meta?.hidden
    );
  });
});

// 底部菜单路由
const bottomMenuRoutes = computed(() => {
  return router.options.routes.filter((route) => {
    return route.path === "/settings";
  });
});

const activeIndex = computed(() => route.path);

// 暴露切换折叠方法给父组件
defineExpose({
  toggleCollapse: (value) => {
    props.isCollapse = value;
  },
});
</script>

<style scoped>
#side-menu {
  height: 100%;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
}

.el-menu {
  border-right: none;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.el-menu-vertical:not(.el-menu--collapse) {
  width: 200px;
}

.el-menu--collapse {
  width: 64px;
}

.menu-divider {
  margin: auto 12px 16px;
  height: 1px;
  background-color: rgba(191, 203, 217, 0.2);
}

.menu-divider-collapsed {
  margin: auto 8px 16px;
}

.el-menu-item {
  display: flex;
  align-items: center;
}

.el-menu-item .el-icon,
:deep(.el-sub-menu .el-icon) {
  margin-right: 8px;
  font-size: 18px;
}

.el-menu-item span {
  margin-left: 4px;
}

:deep(.el-menu-item.is-active) {
  background-color: #263445 !important;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: #263445 !important;
}

:deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: #409eff !important;
}

:deep(.el-menu--collapse) .menu-divider {
  margin: auto 4px 16px;
}
</style>
