<template>
  <div class="industry-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>行业管理</h3>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增行业
          </el-button>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-section">
        <el-form inline>
          <el-form-item label="行业名称">
            <el-input
              v-model="searchName"
              placeholder="请输入行业名称"
              clearable
              @input="handleSearch"
              style="width: 200px"
            />
          </el-form-item>
        </el-form>
      </div>

      <el-table
        :data="filteredIndustries"
        style="width: 100%"
        v-loading="loading"
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column prop="name" label="行业名称" min-width="200" />
        <el-table-column prop="level" label="层级" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleAdd(scope.row)">添加子行业</el-button>
            <el-button type="primary" link @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog
        v-model="dialogVisible"
        :title="getDialogTitle"
        width="500px"
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item label="父级行业" prop="parentId">
            <el-tree-select
              v-model="form.parentId"
              :data="availableParents"
              placeholder="请选择父级行业"
              clearable
              style="width: 100%"
              :disabled="dialogType === 'edit' && form.id === form.parentId"
              node-key="id"
              :props="{
                label: 'name',
                children: 'children'
              }"
              check-strictly
              :render-after-expand="false"
            />
            <div class="select-tip">不选择则为顶级行业</div>
          </el-form-item>
          <el-form-item label="行业名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入行业名称" />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
          </span>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useIndustryStore } from '../stores/industry'

const industryStore = useIndustryStore()
const industries = ref([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const form = ref({
  id: null,
  name: '',
  parentId: null
})

const rules = {
  name: [
    { required: true, message: '请输入行业名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
}

const formRef = ref(null)

const searchName = ref('')

// 过滤后的行业列表
const filteredIndustries = computed(() => {
  if (!searchName.value) {
    return industries.value;
  }
  
  const searchText = searchName.value.toLowerCase();
  
  // 深度复制数据以避免修改原始数据
  const cloneData = JSON.parse(JSON.stringify(industries.value));
  
  // 递归搜索并标记匹配的节点
  const markMatchNodes = (nodes) => {
    return nodes.filter(node => {
      // 检查当前节点
      const isMatch = node.name.toLowerCase().includes(searchText);
      
      // 递归检查子节点
      if (node.children && node.children.length) {
        node.children = markMatchNodes(node.children);
        // 如果子节点有匹配，保留父节点
        return isMatch || node.children.length > 0;
      }
      
      return isMatch;
    });
  };
  
  return markMatchNodes(cloneData);
});

// 计算对话框标题
const getDialogTitle = computed(() => {
  if (dialogType.value === 'add') {
    return form.value.parentId ? '添加子行业' : '新增行业'
  }
  return '编辑行业'
})

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const fetchIndustries = async () => {
  loading.value = true
  try {
    industries.value = []
    const result = await industryStore.getIndustries()
    if (result.success) {
      await nextTick()
      industries.value = result.industries
    } else {
      ElMessage.error(result.error || '获取行业列表失败')
    }
  } catch (error) {
    console.error('获取行业列表失败:', error)
    ElMessage.error('获取行业列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = (row = null) => {
  dialogType.value = 'add'
  form.value = {
    id: null,
    name: '',
    parentId: row ? row.id : null
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  form.value = {
    id: row.id,
    name: row.name,
    parentId: row.parentId || null
  }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  // 检查是否有子行业
  if (row.children && row.children.length > 0) {
    ElMessage.warning('该行业下还有子行业，请先删除子行业')
    return
  }

  ElMessageBox.confirm('确认删除该行业吗？删除后不可恢复。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const result = await industryStore.deleteIndustry(row.id)
      if (result.success) {
        ElMessage.success('删除成功')
        fetchIndustries()
      } else {
        ElMessage.error(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  })
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        let result
        if (dialogType.value === 'add') {
          result = await industryStore.createIndustry({
            name: form.value.name,
            parentId: form.value.parentId
          })
        } else {
          result = await industryStore.updateIndustry(form.value.id, {
            name: form.value.name,
            parentId: form.value.parentId
          })
        }

        if (result.success) {
          ElMessage.success(dialogType.value === 'add' ? '新增成功' : '更新成功')
          dialogVisible.value = false
          await fetchIndustries()
        } else {
          ElMessage.error(result.error || (dialogType.value === 'add' ? '新增失败' : '更新失败'))
        }
      } catch (error) {
        console.error(dialogType.value === 'add' ? '新增失败:' : '更新失败:', error)
        ElMessage.error(dialogType.value === 'add' ? '新增失败' : '更新失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

// 计算可选的父级行业（排除自身及其子行业）
const availableParents = computed(() => {
  const cloneData = JSON.parse(JSON.stringify(industries.value))
  
  if (dialogType.value === 'edit' && form.value.id) {
    const filterTree = (items) => {
      return items.filter(item => {
        if (item.id === form.value.id) return false
        
        if (item.children?.length) {
          item.children = filterTree(item.children)
        }
        
        return true
      })
    }
    
    return filterTree(cloneData)
  }
  
  return cloneData
})

fetchIndustries()
</script>

<style scoped>
.industry-management {
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
  gap: 10px;
}
.select-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.search-section {
  margin-bottom: 0;
}
</style> 