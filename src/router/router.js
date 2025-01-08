import { createRouter, createWebHashHistory } from 'vue-router'
import { setupRouterGuards } from './middleware'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { 
      requiresAuth: true,
      permission: '/',
      title: '仪表盘',
      icon: 'Odometer',
    }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/Inventory.vue'),
    meta: { 
      requiresAuth: true,
      permission: '/inventory',
      title: '库存管理',
      icon: 'Box'
    }
  },
  {
    path: '/industries',
    name: 'IndustryManagement',
    component: () => import('@/views/IndustryManagement.vue'),
    meta: { 
      requiresAuth: true,
      permission: '/industries',
      title: '行业管理',
      icon: 'Shop'
    }
  },
  {
    path: '/brands',
    name: 'BrandManagement',
    component: () => import('@/views/BrandManagement.vue'),
    meta: { 
      requiresAuth: true,
      permission: '/brands',
      title: '品牌管理',
      icon: 'Goods'
    }
  },
  {
    path: '/styles',
    name: 'StyleManagement',
    component: () => import('@/views/StyleManagement.vue'),
    meta: {
      title: '款式分类管理',
      requiresAuth: true,
      permission: '/styles',
      icon: 'Brush'
    }
  },
  {
    path: '/specifications',
    name: 'SpecificationManagement',
    component: () => import('@/views/SpecificationManagement.vue'),
    meta: {
      title: '规格属性管理',
      requiresAuth: true,
      permission: '/specifications',
      icon: 'List'
    }
  },
  {
    path: '/skus',
    name: 'SkuManagement',
    component: () => import('@/views/SkuManagement.vue'),
    meta: {
      title: 'SKU组合管理',
      requiresAuth: true,
      permission: '/skus',
      icon: 'Tickets'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    meta: { 
      requiresAuth: true,
      permission: '/settings',
      title: '系统设置',
      icon: 'Setting'
    },
    children: [
      {
        path: 'change-password',
        name: 'ChangePassword',
        component: () => import('@/views/ChangePassword.vue'),
        meta: { 
          title: '修改密码',
          requiresAuth: true,
          permission: '/settings/change-password',
          icon: 'Lock'
        }
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('@/views/UserManagement.vue'),
        meta: { 
          requiresAuth: true,
          permission: '/settings/users',
          title: '用户管理',
          icon: 'User'
        }
      },
      {
        path: 'roles',
        name: 'RoleManagement',
        component: () => import('@/views/RoleManagement.vue'),
        meta: { 
          requiresAuth: true,
          permission: '/settings/roles',
          title: '角色管理',
          icon: 'UserFilled'
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 设置路由守卫
setupRouterGuards(router)

export default router
