<template>
  <div class="brand-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>品牌管理</h3>
          <el-button type="primary" :icon="Plus" @click="handleAdd">新增品牌</el-button>
        </div>
      </template>

      <div class="search-section">
        <el-form :inline="true">
          <el-form-item label="品牌名称">
            <el-input
              v-model="searchName"
              placeholder="请输入品牌名称"
              style="width: 200px"
              clearable
            />
          </el-form-item>
        </el-form>
      </div>

      <el-table
        :data="filteredBrands"
        border
        v-loading="loading"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="品牌名称" min-width="120" />
        <el-table-column label="所属行业" min-width="120">
          <template #default="{ row }">
            {{ row.industry?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" min-width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="联系方式" min-width="120" />
        <el-table-column prop="address" label="地址" min-width="150" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog
        v-model="dialogVisible"
        :title="dialogType === 'add' ? '新增品牌' : '编辑品牌'"
        width="600px"
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item label="品牌名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入品牌名称" />
          </el-form-item>
          <el-form-item label="所属行业" prop="industryId">
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
          <el-form-item label="联系人" prop="contact">
            <el-input v-model="form.contact" placeholder="请输入联系人" />
          </el-form-item>
          <el-form-item label="联系方式" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入联系方式" />
          </el-form-item>
          <el-form-item label="地址" prop="address">
            <el-input v-model="form.address" placeholder="请输入地址" />
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注"
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
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useBrandStore } from '../stores/brand'
import { useIndustryStore } from '../stores/industry'

const brandStore = useBrandStore()
const industryStore = useIndustryStore()
const brands = ref([])
const industries = ref([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const form = ref({
  id: null,
  name: '',
  industryId: null,
  contact: '',
  phone: '',
  address: '',
  remark: ''
})

const rules = {
  name: [
    { required: true, message: '请输入品牌名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  industryId: [
    { required: true, message: '请选择所属行业', trigger: 'change' }
  ],
  contact: [
    { max: 20, message: '长度不能超过 20 个字符', trigger: 'blur' }
  ],
  phone: [
    { max: 20, message: '长度不能超过 20 个字符', trigger: 'blur' }
  ],
  address: [
    { max: 100, message: '长度不能超过 100 个字符', trigger: 'blur' }
  ],
  remark: [
    { max: 200, message: '长度不能超过 200 个字符', trigger: 'blur' }
  ]
}

const formRef = ref(null)

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

const fetchBrands = async () => {
  loading.value = true
  try {
    const result = await brandStore.getBrands()
    if (result.success) {
      brands.value = result.brands
    }
  } catch (error) {
    console.error('获取品牌列表失败:', error)
  } finally {
    loading.value = false
  }
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

const handleAdd = () => {
  dialogType.value = 'add'
  form.value = {
    id: null,
    name: '',
    industryId: null,
    contact: '',
    phone: '',
    address: '',
    remark: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该品牌吗？删除后不可恢复。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const result = await brandStore.deleteBrand(row.id)
      if (result.success) {
        ElMessage.success('删除成功')
        fetchBrands()
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
          result = await brandStore.createBrand({
            name: form.value.name,
            industryId: form.value.industryId,
            contact: form.value.contact,
            phone: form.value.phone,
            address: form.value.address,
            remark: form.value.remark
          })
        } else {
          result = await brandStore.updateBrand(form.value.id, {
            name: form.value.name,
            industryId: form.value.industryId,
            contact: form.value.contact,
            phone: form.value.phone,
            address: form.value.address,
            remark: form.value.remark
          })
        }

        if (result.success) {
          ElMessage.success(dialogType.value === 'add' ? '新增成功' : '更新成功')
          dialogVisible.value = false
          fetchBrands()
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

const searchName = ref('')

// 过滤后的品牌列表
const filteredBrands = computed(() => {
  if (!searchName.value) {
    return brands.value;
  }
  return brands.value.filter(brand => 
    brand.name.toLowerCase().includes(searchName.value.toLowerCase())
  );
});

onMounted(async () => {
  await Promise.all([fetchBrands(), fetchIndustries()])
})
</script>

<style scoped>
.brand-management {
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
.search-section {
  margin-bottom: 0;
}
</style> 