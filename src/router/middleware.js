import { useAuthStore } from "../stores/auth";
import { ElMessage } from "element-plus";

// 用于标记是否是首次加载
let isFirstLoad = true;
// 初始化标志，用于防止闪烁
let isInitialized = false;

// 获取初始路由，根据登录状态决定显示登录页还是主页
export function getInitialRoute(authStore) {
  return authStore.isAuthenticated ? "/" : "/login";
}

export function setupRouterGuards(router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    const { ipcRenderer } = window.require("electron");

    // 控制窗口大小
    if (["/login", "/register"].includes(to.path)) {
      ipcRenderer.send("switch-to-login-window", true);
    } else {
      // 只有在首次加载时居中窗口
      ipcRenderer.send("switch-to-main-window", isFirstLoad);
      isFirstLoad = false;
    }

    // 不需要登录的路由直接放行
    if (!to.meta.requiresAuth) {
      // 如果用户已经登录，则重定向到主页
      if (to.path === "/login" && authStore.isAuthenticated) {
        return next("/");
      }
      return next();
    }

    // 未登录时重定向到登录页
    if (!authStore.isAuthenticated) {
      // 如果路由变化是因为直接访问需要登录的页面，不显示警告消息
      if (from.name) {
        ElMessage.warning("请先登录");
      }
      return next("/login");
    }

    // 检查角色权限
    const userRole = authStore.user?.role;

    // 如果是超级管理员（ID为1），拥有所有权限
    if (userRole.id === 1) {
      return next();
    }

    // 检查路由路径是否在用户权限列表中
    const userPermissions = userRole.permissions || [];

    console.log("当前路由路径:", to.path);
    console.log("用户权限列表:", userPermissions);

    if (!userPermissions.includes(to.path)) {
      ElMessage.error("无权访问此页面");
      return next(from.path || "/");
    }

    next();
  });
}
