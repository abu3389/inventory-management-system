<template>
  <div class="user-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>用户管理</h3>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            添加用户
          </el-button>
        </div>
      </template>

      <el-table :data="users" style="width: 100%" v-loading="loading">
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="createdAt" label="创建时间">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="isAdmin" label="角色">
          <template #default="{ row }">
            <el-tag v-if="row.role" type="success">
              {{ row.role.name }}
            </el-tag>
            <el-tag v-else type="info">未分配角色</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'danger' : 'success'">
              {{ row.status === 0 ? "已冻结" : "正常" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="handleEdit(row)"
              :disabled="row.role?.id === 1 || row.id === authStore.user?.id"
            >
              编辑
            </el-button>
            <el-button
              type="warning"
              link
              @click="handleResetPassword(row)"
              :disabled="row.role?.id === 1 && authStore.user?.id !== 1"
            >
              重置密码
            </el-button>
            <el-button
              :type="row.status === 0 ? 'success' : 'danger'"
              link
              @click="handleToggleStatus(row)"
              :disabled="row.role?.id === 1 || row.id === authStore.user?.id"
            >
              {{ row.status === 0 ? "解冻" : "冻结" }}
            </el-button>
            <el-button
              type="danger"
              link
              :disabled="row.role?.id === 1 || authStore.user?.role?.id !== 1"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '添加用户'"
      width="500px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" />
        </el-form-item>
        <template v-if="!isEdit">
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              show-password
            />
          </el-form-item>
        </template>
        <el-form-item label="角色">
          <el-select v-model="form.roleId" placeholder="请选择角色" clearable>
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
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

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetPasswordDialogVisible"
      title="重置密码"
      width="500px"
    >
      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordForm"
        :rules="resetPasswordRules"
        label-width="100px"
      >
        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="resetPasswordForm.password"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="resetPasswordForm.confirmPassword"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetPasswordDialogVisible = false"
            >取消</el-button
          >
          <el-button
            type="primary"
            @click="handleResetPasswordSubmit"
            :loading="submitting"
          >
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const resetPasswordDialogVisible = ref(false);
const users = ref([]);
const formRef = ref(null);
const resetPasswordFormRef = ref(null);
const roles = ref([]);
const isEdit = ref(false);

const form = reactive({
  id: null,
  username: "",
  password: "",
  confirmPassword: "",
  roleId: null,
});

const resetPasswordForm = reactive({
  userId: null,
  password: "",
  confirmPassword: "",
});

const rules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, message: "用户名长度至少为3个字符", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: "用户名只能包含字母、数字和下划线",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度至少为6个字符", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: "密码只能包含字母、数字和下划线",
      trigger: "blur",
    },
  ],
  confirmPassword: [
    { required: true, message: "请再次输入密码", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error("两次输入密码不一致!"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

const resetPasswordRules = {
  password: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, message: "密码长度至少为6个字符", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: "密码只能包含字母、数字和下划线",
      trigger: "blur",
    },
  ],
  confirmPassword: [
    { required: true, message: "请再次输入新密码", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (value !== resetPasswordForm.password) {
          callback(new Error("两次输入密码不一致!"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
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

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true;
  try {
    const result = await authStore.getUsers();
    if (result.success) {
      users.value = result.users;
    } else {
      ElMessage.error(result.error || "获取用户列表失败");
    }
  } catch (error) {
    console.error("获取用户列表失败:", error);
    ElMessage.error("获取用户列表失败");
  } finally {
    loading.value = false;
  }
};

// 获取角色列表
const fetchRoles = async () => {
  try {
    const result = await authStore.getRoles();
    if (result.success) {
      // 过滤掉超级管理员角色
      roles.value = result.roles.filter((role) => role.id !== 1);
    } else {
      ElMessage.error(result.error || "获取角色列表失败");
    }
  } catch (error) {
    console.error("获取角色列表失败:", error);
    ElMessage.error("获取角色列表失败");
  }
};

// 在组件挂载和路由进入时获取数据
onMounted(async () => {
  await Promise.all([fetchUsers(), fetchRoles()]);
});

const handleAdd = () => {
  isEdit.value = false;
  form.id = null;
  form.username = "";
  form.password = "";
  form.roleId = null;
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  // 不能编辑超级管理员和自己
  if (row.role?.id === 1) {
    ElMessage.warning("超级管理员用户不能被编辑");
    return;
  }
  if (row.id === authStore.user?.id) {
    ElMessage.warning("不能编辑当前登录用户");
    return;
  }

  isEdit.value = true;
  form.id = row.id;
  form.username = row.username;
  form.password = "";
  form.roleId = row.role?.id || null;
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    // 根据是否是编辑式使用不同的���证规则
    if (isEdit.value) {
      // 编辑模式只验证用户名
      await formRef.value.validateField("username");
    } else {
      // 创建模式验证所有字段
      await formRef.value.validate();
    }

    submitting.value = true;

    let result;
    if (isEdit.value) {
      // 编辑用户
      result = await authStore.updateUser({
        id: form.id,
        username: form.username,
        roleId: form.roleId,
      });
    } else {
      // 创建用户
      result = await authStore.createUser({
        username: form.username,
        password: form.password,
        roleId: form.roleId,
      });
    }

    if (result.success) {
      ElMessage.success(isEdit.value ? "编辑用户成功" : "添加用户成功");
      dialogVisible.value = false;
      fetchUsers();
    } else {
      ElMessage.error(
        result.error || (isEdit.value ? "编辑用户失败" : "添加用户失败")
      );
    }
  } catch (error) {
    console.error("表单验证失败:", error);
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (user) => {
  // 检查当前用户是否是超级管理员
  if (authStore.user?.role?.id !== 1) {
    ElMessage.warning("只有超级管理员可以删除用户");
    return;
  }

  // 如果是超级管理员，不允许删除
  if (user.role?.id === 1) {
    ElMessage.warning("超级管理员用户不能被删除");
    return;
  }

  try {
    await ElMessageBox.confirm("确定要删除该用户吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const result = await authStore.deleteUser(user.id);
    if (result.success) {
      ElMessage.success("删除用户成功");
      fetchUsers();
    } else {
      ElMessage.error(result.error || "删除用户失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除用户失败:", error);
    }
  }
};

const handleResetPassword = (user) => {
  // 如果是超级管理员，只能重置自己的密码
  if (user.role?.id === 1 && user.id !== authStore.user?.id) {
    ElMessage.warning("不能重置其他超级管理员的密码");
    return;
  }

  resetPasswordForm.userId = user.id;
  resetPasswordForm.password = "";
  resetPasswordForm.confirmPassword = "";
  resetPasswordDialogVisible.value = true;
};

const handleResetPasswordSubmit = async () => {
  if (!resetPasswordFormRef.value) return;

  try {
    await resetPasswordFormRef.value.validate();
    submitting.value = true;

    const result = await authStore.resetUserPassword(
      resetPasswordForm.userId,
      resetPasswordForm.password
    );

    if (result.success) {
      ElMessage.success("重置密码成功");
      resetPasswordDialogVisible.value = false;

      // 如果是重置自己的密码，则退出登录
      if (resetPasswordForm.userId === authStore.user?.id) {
        ElMessage.info("密码已重置，请重新登录");
        setTimeout(() => {
          authStore.clearAllData();
          router.push("/login");
        }, 1500);
      }
    } else {
      ElMessage.error(result.error || "重置密码失败");
    }
  } catch (error) {
    console.error("表单验证失败:", error);
  } finally {
    submitting.value = false;
  }
};

// 添加处理冻结/解冻的函数
const handleToggleStatus = async (user) => {
  // 不能冻结超级管理员和自己
  if (user.role?.id === 1) {
    ElMessage.warning("超级管理员用户不能被冻结");
    return;
  }
  if (user.id === authStore.user?.id) {
    ElMessage.warning("不能冻结当前登录用户");
    return;
  }

  try {
    const action = user.status === 0 ? "解冻" : "冻结";
    await ElMessageBox.confirm(`确定要${action}该用户吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const result = await authStore.updateUser({
      id: user.id,
      username: user.username,
      roleId: user.role?.id,
      status: user.status === 0 ? 1 : 0,
    });

    if (result.success) {
      ElMessage.success(`${action}用户成功`);
      fetchUsers();
    } else {
      ElMessage.error(result.error || `${action}用户失败`);
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("操作失败:", error);
      ElMessage.error("操作失败");
    }
  }
};
</script>

<style scoped>
.user-management {
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
</style>
