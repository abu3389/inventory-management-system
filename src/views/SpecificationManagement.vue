<template>
  <div class="specification-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>规格属性管理</h3>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增规格属性
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
          <el-form-item label="属性名称">
            <el-input
              v-model="searchName"
              placeholder="请输入属性名称"
              clearable
              @input="handleSearch"
              style="width: 200px"
            />
          </el-form-item>
        </el-form>
      </div>

      <el-table
        :data="filteredSpecifications"
        style="width: 100%"
        v-loading="loading"
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column prop="name" label="属性名称" />
        <el-table-column label="预设值" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="value in row.presetValues" :key="value" size="small">{{ value }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column label="所属行业" min-width="120">
          <template #default="{ row }">
            {{ row.specIndustry?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleAdd(scope.row)">添加子属性</el-button>
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
          <el-form-item label="所属行业" prop="industryId" required>
            <el-tree-select
              v-model="form.industryId"
              :data="industries"
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
          <el-form-item label="父级属性" prop="parentId">
            <el-tree-select
              v-model="form.parentId"
              :data="availableParents"
              placeholder="请选择父级属性"
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
            <div class="select-tip">不选择则为顶级属性</div>
          </el-form-item>
          <el-form-item label="属性名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入属性名称" />
          </el-form-item>
          <el-form-item label="单位" prop="unit">
            <el-input v-model="form.unit" placeholder="请输入单位" />
          </el-form-item>
          <el-form-item label="预设值" prop="presetValues">
            <el-select
              v-model="form.presetValues"
              multiple
              filterable
              allow-create
              default-first-option
              clear-on-select
              :reserve-keyword="false"
              style="width: 100%"
              placeholder="请输入预设值，回车确认"
            />
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
const { ipcRenderer } = require('electron')

// 基础数据
const industries = ref([])
const selectedIndustryId = ref(null)
const loading = ref(false)
const specifications = ref([])
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const searchName = ref('')

// 表单数据
const form = ref({
  id: null,
  name: '',
  parentId: null,
  industryId: null,
  unit: '',
  presetValues: []
})

// 表单验证规则
const rules = {
  industryId: [
    { required: true, message: '请选择所属行业', trigger: 'change' }
  ],
  name: [
    { required: true, message: '请输入属性名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
}

// 对话框标题
const getDialogTitle = computed(() => {
  if (dialogType.value === 'add') {
    return form.value.parentId ? '添加子属性' : '新增属性'
  }
  return '编辑属性'
})

// 日期格式化
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 获取行业列表
const fetchIndustries = async () => {
  try {
    const result = await ipcRenderer.invoke('industry:getIndustries')
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

// 获取规格属性列表
const fetchSpecifications = async () => {
  if (!selectedIndustryId.value) {
    specifications.value = []
    return
  }

  loading.value = true
  try {
    const result = await ipcRenderer.invoke('specification:getSpecifications', selectedIndustryId.value)
    if (result.success) {
      specifications.value = result.specifications || []
    } else {
      ElMessage.error(result.error || '获取规���属性列表失败')
    }
  } catch (error) {
    console.error('获取规格属性列表失败:', error)
    ElMessage.error('获取规格属性列表失败')
  } finally {
    loading.value = false
  }
}

// 处理行业变化
const handleIndustryChange = () => {
  fetchSpecifications()
}

// 新增属性
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
    industryId: selectedIndustryId.value,
    unit: '',
    presetValues: []
  }
  dialogVisible.value = true
}

// 编辑属性
const handleEdit = (row) => {
  dialogType.value = 'edit'
  form.value = {
    id: row.id,
    name: row.name || '',
    parentId: row.parentId || null,
    industryId: row.industryId || null,
    unit: row.unit || '',
    presetValues: Array.isArray(row.presetValues) ? [...row.presetValues] : []
  }
  dialogVisible.value = true
}

// 删除属性
const handleDelete = (row) => {
  if (row.children?.length > 0) {
    ElMessage.warning('该属性下还有子属性，请先删除子属性')
    return
  }

  ElMessageBox.confirm('确认删除该属性吗？删除后不可恢复。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const result = await ipcRenderer.invoke('specification:deleteSpecification', { specificationId: row.id })
      if (result.success) {
        ElMessage.success('删除成功')
        fetchSpecifications()
      } else {
        ElMessage.error(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    submitting.value = true
    const params = {
      name: form.value.name?.trim(),
      parentId: form.value.parentId || null,
      industryId: form.value.industryId || null,
      unit: form.value.unit?.trim() || '',
      presetValues: form.value.presetValues?.filter(Boolean) || []
    }

    if (dialogType.value === 'edit') {
      params.specificationId = form.value.id
    }

    const action = dialogType.value === 'add' ? 'createSpecification' : 'updateSpecification'
    const result = await ipcRenderer.invoke(`specification:${action}`, params)

    if (result.success) {
      ElMessage.success(dialogType.value === 'add' ? '新增成功' : '更新成��')
      dialogVisible.value = false
      fetchSpecifications()
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

// 计算可选的父级属性
const availableParents = computed(() => {
  const cloneData = JSON.parse(JSON.stringify(specifications.value))
  
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

// 过滤后的规格属性列表
const filteredSpecifications = computed(() => {
  if (!searchName.value) {
    return specifications.value;
  }
  
  const searchText = searchName.value.toLowerCase();
  
  // 深度复制数据以避免修改原始数据
  const cloneData = JSON.parse(JSON.stringify(specifications.value));
  
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

// 初始化
onMounted(async () => {
  await fetchIndustries()
})
</script>

<style scoped>
.specification-management {
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

.industry-select {
  margin-bottom: 20px;
}

.select-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-tag) {
  margin-right: 4px;
  margin-bottom: 4px;
}

.search-section {
  margin-bottom: 0;
}
</style> 