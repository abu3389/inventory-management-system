<template>
  <div class="role-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>角色管理</h3>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            添加角色
          </el-button>
        </div>
      </template>

      <el-table :data="roles" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="角色名称" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.id === 1 ? 'danger' : 'primary'">{{ row.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="权限" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag 
              v-for="permission in row.permissions" 
              :key="permission"
              size="small"
              class="permission-tag"
            >
              {{ getPermissionLabel(permission) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              link 
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button 
              type="danger" 
              link 
              @click="handleDelete(row)"
              :disabled="row.id === 1"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑角色对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑角色' : '添加角色'"
      width="600px"
      @closed="handleDialogClose"
      @open="handleDialogOpen"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="菜单权限">
          <el-tree
            ref="menuTree"
            :data="menuOptions"
            show-checkbox
            node-key="path"
            :props="{
              label: 'title',
              children: 'children',
            }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const roles = ref([]);
const formRef = ref(null);
const menuTree = ref(null);

// 从路由配置生成菜单树
const generateMenuTree = (routes) => {
  return routes
    .filter(route => route.path !== '/login' && route.meta?.title) // 排除登录页和没有标题的路由
    .map(route => {
      const menuItem = {
        title: route.meta.title,
        path: route.path,
        children: []
      };

      if (route.children) {
        menuItem.children = route.children
          .filter(child => child.meta?.title) // 只包含有标题的子路由
          .map(child => ({
            title: child.meta.title,
            path: `${route.path}/${child.path}`
          }));
      }

      return menuItem;
    });
};

// 获取菜单选项
const menuOptions = computed(() => {
  return generateMenuTree(router.options.routes);
});

const form = reactive({
  id: null,
  name: "",
  description: "",
  permissions: [],
});

const rules = {
  name: [
    { required: true, message: "请输入角色名称", trigger: "blur" },
    { min: 2, message: "角色名称长度至少为2个字符", trigger: "blur" },
  ],
  description: [{ max: 200, message: "描述最多200个字符", trigger: "blur" }],
};

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

// 获取角色列表
const fetchRoles = async () => {
  loading.value = true;
  try {
    const result = await authStore.getRoles();
    console.log("获取角色列表结果:", result);
    if (result.success) {
      roles.value = result.roles || [];
      console.log("处理后的角色列表:", roles.value);
    } else {
      ElMessage.error(result.error || "获取角色列表失败");
    }
  } catch (error) {
    console.error("获取角色列表失败:", error);
    ElMessage.error("获取角色列表失败");
  } finally {
    loading.value = false;
  }
};

// 在组件挂载时获取数据
onMounted(async () => {
  await fetchRoles();
});

const handleAdd = () => {
  isEdit.value = false;
  form.id = null;
  form.name = "";
  form.description = "";
  form.permissions = [];
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  isEdit.value = true;
  form.id = row.id;
  form.name = row.name;
  form.description = row.description;
  form.permissions = row.permissions || [];
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitting.value = true;

    // 获取树中的菜单权限
    const checkedNodes = menuTree.value.getCheckedNodes();
    const halfCheckedNodes = menuTree.value.getHalfCheckedNodes();
    
    // 收集所有选中的路径
    const permissions = new Set();
    
    // 添加完全选中的节点路径
    checkedNodes.forEach(node => {
      permissions.add(node.path);
    });
    
    // 添加半选中的节点路径
    halfCheckedNodes.forEach(node => {
      permissions.add(node.path);
    });

    // 构建一个纯数据对象
    const roleData = {
      name: form.name,
      description: form.description,
      permissions: Array.from(permissions)
    };

    const result = isEdit.value
      ? await authStore.updateRole(form.id, roleData)
      : await authStore.createRole(roleData);

    if (result.success) {
      ElMessage.success(isEdit.value ? "编辑角色成功" : "添加角色成功");
      dialogVisible.value = false;
      fetchRoles();
    } else {
      ElMessage.error(
        result.error || (isEdit.value ? "编辑角色失败" : "添加角色失败")
      );
    }
  } catch (error) {
    console.error("表单验证失败:", error);
  } finally {
    submitting.value = false;
  }
};

// 监听对话框打开事件
const handleDialogOpen = () => {
  nextTick(() => {
    if (menuTree.value) {
      // 先清空所有选中状态
      menuTree.value.setCheckedKeys([]);
      
      // 设置选中状态
      const permissions = form.permissions || [];
      
      // 找出所有父节点路径
      const parentPaths = new Set();
      permissions.forEach(path => {
        // 如果是子路径，添加其父路径
        if (path.includes('/')) {
          const parentPath = path.split('/').slice(0, -1).join('/');
          if (parentPath) {
            parentPaths.add(parentPath);
          }
        }
      });

      // 先设置父节点
      [...parentPaths].forEach(path => {
        menuTree.value.setChecked(path, true, false);
      });

      // 再设置子节点
      permissions.forEach(path => {
        menuTree.value.setChecked(path, true, false);
      });
    }
  });
};

// 监听对话框关闭事件
const handleDialogClose = () => {
  form.permissions = [];
  if (menuTree.value) {
    menuTree.value.setCheckedKeys([]);
  }
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      "确定要删除该角色吗？删除后不可恢复，且已分配该角色的用户将失去相应权限。",
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    const result = await authStore.deleteRole(row.id);
    if (result.success) {
      ElMessage.success("删除角色成功");
      fetchRoles();
    } else {
      ElMessage.error(result.error || "删除角色失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除角色失败:", error);
    }
  }
};

// 添加新的 getPermissionLabel 函数
const getPermissionLabel = (permission) => {
  // 递归查找路由标题
  const findRouteTitle = (routes, path) => {
    for (const route of routes) {
      // 检查当前路由
      if (route.path === path || `/${route.path}` === path) {
        return route.meta?.title;
      }
      // 检查子路由
      if (route.children) {
        const childPath = path.replace(`${route.path}/`, '');
        const childTitle = findRouteTitle(route.children, childPath);
        if (childTitle) return childTitle;
      }
    }
    return null;
  };

  const title = findRouteTitle(router.options.routes, permission);
  return title || permission;
};
</script>

<style scoped>
.role-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  color: #409eff;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.permission-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

:deep(.el-tag) {
  margin: 2px;
}

:deep(.el-table .cell) {
  white-space: normal;
  line-height: 24px;
}
</style>
