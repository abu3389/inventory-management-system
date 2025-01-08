<template>
  <div class="style-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>款式分类管理</h3>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增款式分类
          </el-button>
        </div>
      </template>

      <!-- 行业选择 -->
      <div class="industry-select">
        <el-form-item label="选择行业">
          <el-tree-select
            v-model="selectedIndustryId"
            :data="industries"
            placeholder="请选择行业"
            clearable
            style="width: 100%"
            node-key="id"
            :props="{
              label: 'name',
              children: 'children'
            }"
            check-strictly
            :render-after-expand="false"
            @change="handleIndustryChange"
          />
        </el-form-item>
      </div>

      <!-- 搜索区域 -->
      <div class="search-section">
        <el-form inline>
          <el-form-item label="分类名称">
            <el-input
              v-model="searchName"
              placeholder="请输入分类名称"
              clearable
              @input="handleSearch"
              style="width: 200px"
            />
          </el-form-item>
        </el-form>
      </div>

      <el-table
        :data="filteredStyles"
        style="width: 100%"
        v-loading="loading"
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column prop="name" label="分类名称" />
        <!-- <el-table-column prop="level" label="层级" width="100" /> -->
        <el-table-column prop="industry.name" label="所属行业" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleAdd(scope.row)">添加子分类</el-button>
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
          <el-form-item label="所属行业" prop="industryId">
            <el-tree-select
              v-model="form.industryId"
              :data="currentIndustryTree"
              placeholder="请选择所属行业"
              clearable
              style="width: 100%"
              node-key="id"
              :props="{
                label: 'name',
                children: 'children'
              }"
              check-strictly
              :render-after-expand="false"
            />
          </el-form-item>
          <el-form-item label="父级分类" prop="parentId">
            <el-tree-select
              v-model="form.parentId"
              :data="availableParents"
              placeholder="请选择父级分类"
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
            <div class="select-tip">不选择则为顶级分类</div>
          </el-form-item>
          <el-form-item label="分类名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入分类名称" />
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
import { useStyleStore } from '../stores/style'
import { useIndustryStore } from '../stores/industry'

const styleStore = useStyleStore()
const industryStore = useIndustryStore()

const styles = ref([])
const industries = ref([])
const selectedIndustryId = ref(null)
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const form = ref({
  id: null,
  name: '',
  parentId: null,
  industryId: null
})

const rules = {
  industryId: [
    { required: true, message: '请选择所属行业', trigger: 'change' }
  ],
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
}

const formRef = ref(null)

const searchName = ref('')

// 过滤后的款式分类列表
const filteredStyles = computed(() => {
  if (!searchName.value) {
    return styles.value;
  }
  
  const searchText = searchName.value.toLowerCase();
  
  // 深度复制数据以避免修改原始数据
  const cloneData = JSON.parse(JSON.stringify(styles.value));
  
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
    return form.value.parentId ? '添加子分类' : '新增分类'
  }
  return '编辑分类'
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
  try {
    const result = await industryStore.getIndustries()
    if (result.success) {
      industries.value = result.industries
    } else {
      ElMessage.error(result.error || '获取行业列表失败')
    }
  } catch (error) {
    console.error('获取行业列表失败:', error)
    ElMessage.error('获取行业列表失败')
  }
}

const fetchStyles = async () => {
  if (!selectedIndustryId.value) {
    styles.value = []
    return
  }

  loading.value = true
  try {
    styles.value = []
    const result = await styleStore.getStyles(selectedIndustryId.value)
    if (result.success) {
      await nextTick()
      styles.value = result.styles
    } else {
      ElMessage.error(result.error || '获取款式分类列表失败')
    }
  } catch (error) {
    console.error('获取款式分类列表失败:', error)
    ElMessage.error('获取款式分类列表失败')
  } finally {
    loading.value = false
  }
}

const handleIndustryChange = () => {
  fetchStyles()
}

const handleAdd = (row = null) => {
  if (!selectedIndustryId.value) {
    ElMessage.warning('请先选择行业')
    return
  }

  dialogType.value = 'add'
  form.value = {
    id: null,
    name: '',
    parentId: row ? row.id : null,
    industryId: selectedIndustryId.value
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  form.value = {
    id: row.id,
    name: row.name,
    parentId: row.parentId || null,
    industryId: row.industryId
  }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  // 检查是否有子分类
  if (row.children && row.children.length > 0) {
    ElMessage.warning('该分类下还有子分类，请先删除子分类')
    return
  }

  ElMessageBox.confirm('确认删除该分类吗？删除后不可恢复。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const result = await styleStore.deleteStyle(row.id)
      if (result.success) {
        ElMessage.success('删除成功')
        fetchStyles()
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
          result = await styleStore.createStyle({
            name: form.value.name,
            parentId: form.value.parentId,
            industryId: form.value.industryId
          })
        } else {
          result = await styleStore.updateStyle(form.value.id, {
            name: form.value.name,
            parentId: form.value.parentId,
            industryId: form.value.industryId
          })
        }

        if (result.success) {
          ElMessage.success(dialogType.value === 'add' ? '新增成功' : '更新成功')
          dialogVisible.value = false
          await fetchStyles()
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

// 计算可选的父级分类（排除自身及其子分类）
const availableParents = computed(() => {
  const cloneData = JSON.parse(JSON.stringify(styles.value))
  
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

// 计算当前选中行业及其子行业树
const currentIndustryTree = computed(() => {
  if (!selectedIndustryId.value || !industries.value.length) return []
  
  const findIndustry = (id, items) => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children?.length) {
        const found = findIndustry(id, item.children)
        if (found) return found
      }
    }
    return null
  }
  
  const currentIndustry = findIndustry(selectedIndustryId.value, industries.value)
  return currentIndustry ? [currentIndustry] : []
})

// 初始化
fetchIndustries()
</script>

<style scoped>
.style-management {
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
.industry-select {
  margin-bottom: 16px;
}
.search-section {
  margin-bottom: 0;
}
</style> 