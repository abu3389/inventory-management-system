<template>
  <div class="inventory">
    <div class="inventory-header">
      <el-button type="primary" @click="dialogVisible = true">添加商品</el-button>
      <el-input
        v-model="searchQuery"
        placeholder="搜索商品"
        style="width: 200px"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <el-table :data="filteredItems" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="商品名称" />
      <el-table-column prop="category" label="类别" />
      <el-table-column prop="quantity" label="数量" />
      <el-table-column prop="price" label="单价" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button
            size="small"
            @click="handleEdit(scope.row)"
          >编辑</el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleDelete(scope.row)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingItem ? '编辑商品' : '添加商品'"
      width="500px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="商品名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类别" required>
          <el-input v-model="form.category" />
        </el-form-item>
        <el-form-item label="数量" required>
          <el-input-number v-model="form.quantity" :min="0" />
        </el-form-item>
        <el-form-item label="单价" required>
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useInventoryStore } from '../stores/inventory'

const inventoryStore = useInventoryStore()

const searchQuery = ref('')
const dialogVisible = ref(false)
const editingItem = ref(null)
const form = ref({
  name: '',
  category: '',
  quantity: 0,
  price: 0
})

const filteredItems = computed(() => {
  return inventoryStore.searchItems(searchQuery.value)
})

const handleEdit = (item) => {
  editingItem.value = item
  form.value = { ...item }
  dialogVisible.value = true
}

const handleDelete = (item) => {
  ElMessageBox.confirm(
    '确定要删除这个商品吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    inventoryStore.deleteItem(item.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleSave = () => {
  if (!form.value.name || !form.value.category) {
    ElMessage.warning('请填写必填项')
    return
  }
  
  if (editingItem.value) {
    inventoryStore.updateItem({ ...form.value, id: editingItem.value.id })
    ElMessage.success('更新成功')
  } else {
    inventoryStore.addItem(form.value)
    ElMessage.success('添加成功')
  }
  dialogVisible.value = false
  editingItem.value = null
  form.value = { name: '', category: '', quantity: 0, price: 0 }
}

// 添加一些示例数据
if (inventoryStore.items.length === 0) {
  inventoryStore.addItem({
    name: '示例商品1',
    category: '电子产品',
    quantity: 100,
    price: 999.99
  })
  inventoryStore.addItem({
    name: '示例商品2',
    category: '办公用品',
    quantity: 50,
    price: 199.99
  })
}

const handleSearch = () => {
  // 搜索功能已通过计算属性 filteredItems 自动处理
}
</script>

<style scoped>
.inventory {
  height: 100%;
  padding: 20px;
  background-color: #f0f2f5;
}

.inventory-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-table {
  border-radius: 4px;
  margin-bottom: 20px;
  background-color: #fff;
}

:deep(.el-dialog__body) {
  padding-top: 20px;
  padding-bottom: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style> 