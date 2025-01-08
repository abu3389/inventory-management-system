<template>
  <div class="dashboard">
    <div class="stat-cards">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-header">
            <span class="stat-title">总库存数量</span>
          </div>
          <div class="stat-value">{{ inventoryStore.totalItems }}</div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-header">
            <span class="stat-title">库存种类</span>
          </div>
          <div class="stat-value">{{ inventoryStore.itemCategories }}</div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-header">
            <span class="stat-title">低库存警告</span>
          </div>
          <div class="stat-value">{{ inventoryStore.lowStockItems }}</div>
        </div>
      </el-card>
    </div>

    <!-- 可以在这里添加更多内容，比如图表等 -->
  </div>
</template>

<script setup>
import { useInventoryStore } from '../stores/inventory'

const inventoryStore = useInventoryStore()
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  height: 180px;
  transition: all 0.3s;
  cursor: pointer;
  background-color: #fff;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.stat-header {
  margin-bottom: 20px;
}

.stat-title {
  font-size: 16px;
  color: #606266;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #409EFF;
}
</style> 