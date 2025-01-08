<template>
  <div class="sku-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>SKU组合管理</h3>
          <div class="header-buttons">
            <el-button 
              type="primary" 
              @click="handleBatchCreateFolders" 
              :disabled="selectedSkus.length === 0"
            >
              <el-icon><Folder /></el-icon>
              批量生成文件夹
            </el-button>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增SKU组合
            </el-button>
          </div>
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
              children: 'children',
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
          <el-form-item label="款号">
            <el-input
              v-model="searchStyleCode"
              placeholder="请输入款号"
              clearable
              @input="handleSearch"
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="SKU组合名称">
            <el-input
              v-model="searchName"
              placeholder="请输入SKU组合名称"
              clearable
              @input="handleSearch"
              style="width: 200px"
            />
          </el-form-item>
        </el-form>
      </div>

      <el-table 
        :data="skuList" 
        style="width: 100%" 
        v-loading="loading"
        border
        ref="skuTable"
        row-key="styleCode"
        @select="handleSelect"
        @select-all="handleSelectAll"
      >
        <el-table-column 
          type="selection" 
          width="55" 
          :selectable="handleSelectable"
          :reserve-selection="true"
        />
        <el-table-column type="expand">
          <template #default="props">
            <div class="sku-combinations-expand">
              <el-table :data="props.row.children" border>
                <el-table-column label="SKU编号" prop="code" min-width="80" />
                <el-table-column
                  v-for="spec in props.row.children[0].specifications"
                  :key="spec.specification.id"
                  :label="spec.specification.name + (spec.specification.unit ? `（${spec.specification.unit}）` : '')"
                  min-width="150"
                >
                  <template #default="{ row }">
                    {{ row.specifications.find(s => s.specificationId === spec.specificationId)?.value || '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="建议零售单价（元）"
                  prop="stock.suggestedPrice"
                  min-width="160"
                >
                  <template #default="{ row }">
                    {{ row.stock?.suggestedPrice?.toFixed(2) || '0.00' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="进货折扣"
                  prop="stock.discount"
                  min-width="120"
                >
                  <template #default="{ row }">
                    {{ row.stock?.discount?.toFixed(2) || '0.00' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="进货单价（元）"
                  prop="stock.price"
                  min-width="150"
                >
                  <template #default="{ row }">
                    {{ row.stock?.price?.toFixed(2) || '0.00' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="附加成本（元）"
                  prop="stock.additionalCost"
                  min-width="150"
                >
                  <template #default="{ row }">
                    {{ row.stock?.additionalCost?.toFixed(2) || '0.00' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="成本单价（元）"
                  prop="stock.totalCost"
                  min-width="150"
                >
                  <template #default="{ row }">
                    {{ row.stock?.totalCost?.toFixed(2) || '0.00' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="数量"
                  prop="stock.quantity"
                  min-width="100"
                >
                  <template #default="{ row }">
                    {{ row.stock?.quantity || '0' }}
                  </template>
                </el-table-column>
                <el-table-column label="单位" prop="specifications[0].unit" width="80" />
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="styleCode" label="款号" min-width="120" />
        <el-table-column prop="name" label="SKU组合名称" min-width="120" />
        <el-table-column label="总库存" min-width="120">
          <template #default="{ row }">
            {{ getTotalStock(row) }}
          </template>
        </el-table-column>
        <el-table-column label="所属行业" min-width="120">
          <template #default="{ row }">
            {{ row.industry?.name || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="primary" link @click="handleCopy(row)">复制</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- SKU表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogType.value === 'edit' ? '编辑SKU组合' : '新增SKU组合'"
        width="800px"
        :close-on-click-modal="false"
        destroy-on-close
        @close="handleDialogClose"
      >
        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-width="110px"
          class="sku-form"
        >
          <el-form-item
            v-if="dialogType.value === 'edit'"
            label="所属行业"
            prop="industryId"
            required
          >
            <el-tree-select
              v-model="selectedIndustryId"
              :data="industries"
              placeholder="请选择行业"
              clearable
              style="width: 100%"
              node-key="id"
              :props="{
                label: 'name',
                children: 'children',
              }"
              check-strictly
              :render-after-expand="false"
              @change="handleIndustryChange"
            />
          </el-form-item>
          <el-form-item label="款号" prop="styleCode">
            <el-input v-model="form.styleCode" placeholder="请输入款号" />
          </el-form-item>
          <el-form-item label="SKU组合名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入SKU组合名称" />
          </el-form-item>
          <el-form-item label="规格属性">
            <el-select
              v-model="selectedSpecs"
              multiple
              filterable
              style="width: 100%"
              placeholder="请选择规格属性"
              @change="handleSpecificationChange"
            >
              <el-option
                v-for="spec in specifications"
                :key="spec.id"
                :label="spec.name"
                :value="spec.id"
              />
            </el-select>
          </el-form-item>

          <!-- 规格组合列表 -->
          <div class="sku-combinations" v-if="selectedSpecs.length > 0">
            <div class="combinations-header">
              <h4>规格组合列表</h4>
              <el-button type="primary" @click="handleAddCombination">
                <el-icon><Plus /></el-icon>
                添加组合
              </el-button>
            </div>

            <el-table :data="form.combinations" style="width: 100%" border>
              <el-table-column label="SKU编号" min-width="80">
                <template #default="{ row }">
                  <el-input v-model="row.code" placeholder="" />
                </template>
              </el-table-column>
              <el-table-column
                v-for="specId in selectedSpecs"
                :key="specId"
                :label="getSpecificationLabel(specId)"
                min-width="150"
              >
                <template #header>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>{{ getSpecificationLabel(specId) }}</span>
                    <el-switch
                      v-model="syncStatus.specs[specId]"
                      size="small"
                      style="margin-left: 8px;"
                      @change="(val) => handleSyncChange('specs', specId, val)"
                    />
                  </div>
                </template>
                <template #default="{ row }">
                  <el-select
                    v-if="getSpecification(specId)?.presetValues?.length"
                    v-model="row.specValues[specId]"
                    filterable
                    allow-create
                    placeholder=""
                    @change="(val) => handleSpecValueChange(val, row, specId)"
                  >
                    <el-option
                      v-for="value in getSpecification(specId).presetValues"
                      :key="value"
                      :label="value"
                      :value="value"
                    />
                  </el-select>
                  <el-input
                    v-else
                    v-model="row.specValues[specId]"
                    @input="(val) => handleSpecValueChange(val, row, specId)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="建议��售单价（元）" min-width="200">
                <template #header>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>建议零售单价（元）</span>
                    <el-switch
                      v-model="syncStatus.suggestedPrice"
                      size="small"
                      style="margin-left: 8px;"
                      @change="(val) => handleSyncChange('suggestedPrice', null, val)"
                    />
                  </div>
                </template>
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.suggestedPrice"
                    :precision="2"
                    :step="1"
                    :min="0"
                    style="width: 100%"
                    @input="(val) => handleSuggestedPriceChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="进货折扣" min-width="150">
                <template #header>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>进货折扣</span>
                    <el-switch
                      v-model="syncStatus.discount"
                      size="small"
                      style="margin-left: 8px;"
                      @change="(val) => handleSyncChange('discount', null, val)"
                    />
                  </div>
                </template>
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.discount"
                    :precision="2"
                    :step="0.1"
                    :min="0"
                    :max="1"
                    style="width: 100%"
                    @input="(val) => handleDiscountChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="进货单价（元）" min-width="180">
                <template #header>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>进货单价（元）</span>
                    <el-switch
                      v-model="syncStatus.price"
                      size="small"
                      style="margin-left: 8px;"
                      @change="(val) => handleSyncChange('price', null, val)"
                    />
                  </div>
                </template>
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.price"
                    :precision="2"
                    :step="1"
                    :min="0"
                    style="width: 100%"
                    @input="(val) => handlePriceChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="附加成本（元）" min-width="180">
                <template #header>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>附加成本（元）</span>
                    <el-switch
                      v-model="syncStatus.additionalCost"
                      size="small"
                      style="margin-left: 8px;"
                      @change="(val) => handleSyncChange('additionalCost', null, val)"
                    />
                  </div>
                </template>
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.additionalCost"
                    :precision="2"
                    :step="1"
                    :min="0"
                    style="width: 100%"
                    @input="(val) => handleCostChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="成本单价（元）" min-width="180">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.totalCost"
                    :precision="2"
                    :step="1"
                    :min="0"
                    style="width: 100%"
                    :disabled="true"
                  />
                </template>
              </el-table-column>
              <el-table-column label="数量" min-width="150">
                <template #header>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>数量</span>
                    <el-switch
                      v-model="syncStatus.quantity"
                      size="small"
                      style="margin-left: 8px;"
                      @change="(val) => handleSyncChange('quantity', null, val)"
                    />
                  </div>
                </template>
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.quantity"
                    :min="0"
                    :precision="0"
                    style="width: 100%"
                    @input="(val) => handleQuantityChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="单位" width="100">
                <template #header>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>单位</span>
                    <el-switch
                      v-model="syncStatus.unit"
                      size="small"
                      style="margin-left: 8px;"
                      @change="(val) => handleSyncChange('unit', null, val)"
                    />
                  </div>
                </template>
                <template #default="{ row }">
                  <el-input
                    v-model="row.unit"
                    @input="(val) => handleUnitChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row, $index }">
                  <div class="operation-buttons">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="handleCopyCombination($index)"
                      >复制</el-button
                    >
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click="handleDeleteCombination($index)"
                      >删除</el-button
                    >
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="handleCancel">取消</el-button>
            <el-button
              type="primary"
              @click="handleSubmit"
              :loading="submitting"
              >确定</el-button
            >
          </span>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Folder } from "@element-plus/icons-vue";
import { useSkuStore } from "../stores/sku";
const { ipcRenderer } = require("electron");

const skuStore = useSkuStore();
const skus = ref([]);
const specifications = ref([]);
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const dialogType = ref('add');
const selectedSpecs = ref([]);
const industries = ref([]);
const selectedIndustryId = ref(null);
const allIndustries = ref([]);
const selectedSkus = ref([]);

const form = ref({
  id: null,
  name: "",
  styleCode: "",
  combinations: [],
});

const rules = {
  styleCode: [{ required: true, message: "请输入款号", trigger: "blur" }],
  name: [
    { min: 2, max: 50, message: "长度在 2 到 50 个字符", trigger: "blur" },
  ],
};

const formRules = computed(() => {
  const baseRules = { ...rules };
  if (dialogType.value === 'edit') {
    baseRules.industryId = [
      { required: true, message: "请选择所属行业", trigger: "change" },
    ];
  }
  return baseRules;
});

const formRef = ref(null);

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

// 分页和搜索相关的数据
const searchStyleCode = ref('')
const searchName = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const skuList = ref([])

// 当前选中的款号列表
const currentSelection = ref([]);
// 最大可选数量
const maxLength = ref(999);

// 控制行是否可选
const handleSelectable = (row) => {
  // 检查当前行是否已被选择
  const isChecked = currentSelection.value.includes(row.styleCode);
  // 如果当前行已被选择，则允许取消选择
  if (isChecked) {
    return true;
  }
  // 如果当前行未被选择，检查是否超过最大限制
  return currentSelection.value.length < maxLength.value;
};

// 处理单行选择
const handleSelect = (val, row) => {
  const index = currentSelection.value.indexOf(row.styleCode);
  if (index === -1) {
    currentSelection.value.push(row.styleCode);
  } else {
    currentSelection.value.splice(index, 1);
  }
  selectedSkus.value = val;
};

// 处理全选
const handleSelectAll = (val) => {
  if (val.length) {
    // 判断是全选还是取消全选
    const isAllSelect = skuList.value.every(item =>
      val.some(valItem => valItem.styleCode === item.styleCode)
    );

    if (isAllSelect) {
      // 全选：添加新增的差集
      const diff = val.filter(
        item => !currentSelection.value.includes(item.styleCode)
      );
      
      if (currentSelection.value.length + diff.length > maxLength.value) {
        // 超过最大限制，截断添加
        const allowedDiff = diff.slice(0, maxLength.value - currentSelection.value.length);
        currentSelection.value = currentSelection.value.concat(
          allowedDiff.map(item => item.styleCode)
        );
        // 取消超出限制的行的选中状态
        diff.slice(allowedDiff.length).forEach(item => {
          skuTable.value?.toggleRowSelection(item, false);
        });
      } else {
        // 未超过限制，全部添加
        currentSelection.value = currentSelection.value.concat(
          diff.map(item => item.styleCode)
        );
      }
    } else {
      // 取消全选：从已选中列表中移除当前页的数据
      currentSelection.value = currentSelection.value.filter(
        styleCode => !skuList.value.some(item => item.styleCode === styleCode)
      );
    }
  } else {
    // 清空选择
    currentSelection.value = [];
  }
  selectedSkus.value = val;
};

// 获取SKU列表
const fetchSkus = async () => {
  loading.value = true;
  try {
    const result = await ipcRenderer.invoke("sku:getSkusByPage", {
      page: currentPage.value,
      pageSize: pageSize.value,
      styleCode: searchStyleCode.value,
      name: searchName.value,
      industryId: selectedIndustryId.value,
    });

    if (result.success) {
      skuList.value = result.skus.map(group => ({
        ...group,
        id: group.styleCode,
      }));
      total.value = result.total;

      // 恢复选中状态
      if (currentSelection.value.length) {
        nextTick(() => {
          currentSelection.value.forEach(styleCode => {
            skuList.value.forEach(item => {
              if (item.styleCode === styleCode) {
                skuTable.value?.toggleRowSelection(item, true);
              }
            });
          });
        });
      } else {
        skuTable.value?.clearSelection();
      }
    } else {
      ElMessage.error(result.error || "获取SKU列表失败");
    }
  } catch (error) {
    console.error("获取SKU列表失败:", error);
    ElMessage.error("获取SKU列表失败");
  } finally {
    loading.value = false;
  }
};

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1;
  fetchSkus();
};

// 处理每页显示数量变化
const handleSizeChange = (val) => {
  pageSize.value = val;
  currentPage.value = 1;
  fetchSkus();
};

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchSkus();
};

// 处理行业变化
const handleIndustryChange = () => {
  currentPage.value = 1;
  fetchSkus();
  fetchSpecifications();
};

// 获所有子行业ID
const getChildIndustryIds = (industryId, industries) => {
  const ids = [industryId];
  const findChildren = (parentId) => {
    industries.forEach((industry) => {
      if (industry.parentId === parentId) {
        ids.push(industry.id);
        findChildren(industry.id);
      }
    });
  };
  findChildren(industryId);
  return ids;
};

// 获取行业列表
const fetchIndustries = async () => {
  try {
    const result = await ipcRenderer.invoke("industry:getIndustries");
    if (result.success) {
      // 将树形结构扁平化，留parentId信息
      const flattenIndustries = (items, parentId = null) => {
        let result = [];
        items.forEach((item) => {
          const { children, ...rest } = item;
          result.push({ ...rest, parentId });
          if (children?.length) {
            result = result.concat(flattenIndustries(children, item.id));
          }
        });
        return result;
      };
      // 保存扁平化的行业列表用于查子行业
      allIndustries.value = flattenIndustries(result.industries);
      // 保存树形结构用于显示
      industries.value = result.industries;
    } else {
      ElMessage.error(result.error || "获取行业列表失败");
    }
  } catch (error) {
    console.error("获取行业列表失败:", error);
    ElMessage.error("获取行业列表失败");
  }
};

// 获取规格属性列表
const fetchSpecifications = async () => {
  if (!selectedIndustryId.value) {
    specifications.value = [];
    return;
  }

  try {
    const result = await ipcRenderer.invoke(
      "specification:getSpecifications",
      selectedIndustryId.value
    );
    if (result.success) {
      // 将树形结构扁平化
      const flattenSpecifications = (items) => {
        let result = [];
        for (const item of items) {
          result.push(item);
          if (item.children?.length) {
            result = result.concat(flattenSpecifications(item.children));
          }
        }
        return result;
      };
      specifications.value = flattenSpecifications(result.specifications);
    } else {
      ElMessage.error(result.error || "获取规格属性列表失败");
    }
  } catch (error) {
    console.error("获取规格属性列表失败:", error);
    ElMessage.error("获取规格属性列表失败");
  }
};

// 根据ID获取规格属性名称
const getSpecificationName = (id) => {
  const spec = specifications.value.find((s) => s.id === id);
  return spec ? spec.name : "";
};

// 根据ID获取规格属性对象
const getSpecification = (id) => {
  return specifications.value.find((s) => s.id === id);
};

// 理规格属性选择变化
const handleSpecificationChange = (value) => {
  // 清空组合列表
  form.value.combinations = [];
};

// 更新成本单价
const updateTotalCost = (row) => {
  const price = Number(row.price || 0);
  const additionalCost = Number(row.additionalCost || 0);
  row.totalCost = Number((price + additionalCost).toFixed(2));
};

// 添加规格组合
const handleAddCombination = () => {
  // 获取当前最大编号
  const currentCodes = form.value.combinations.map(item => {
    const num = parseInt(item.code) || 0;
    return isNaN(num) ? 0 : num;
  });
  const maxCode = currentCodes.length > 0 ? Math.max(...currentCodes) : 0;
  
  const combination = {
    code: String(maxCode + 1),
    specValues: {},
    suggestedPrice: 0,
    discount: 0,
    price: 0,
    additionalCost: 0,
    totalCost: 0,
    quantity: 0,
    unit: getSpecification(selectedSpecs.value[0])?.unit || "",
  };
  form.value.combinations.push(combination);
  // 初始化时计算成本单价
  updateTotalCost(combination);
};

// 删除规格组合
const handleDeleteCombination = (index) => {
  form.value.combinations.splice(index, 1);
};

// 复制规格组合
const handleCopyCombination = (index) => {
  // 获取当前最大编号
  const currentCodes = form.value.combinations.map(item => {
    const num = parseInt(item.code) || 0;
    return isNaN(num) ? 0 : num;
  });
  const maxCode = currentCodes.length > 0 ? Math.max(...currentCodes) : 0;
  
  const original = form.value.combinations[index];
  const copy = {
    code: String(maxCode + 1),
    specValues: { ...original.specValues },
    suggestedPrice: original.suggestedPrice,
    discount: original.discount,
    price: original.price,
    additionalCost: original.additionalCost,
    totalCost: original.totalCost,
    quantity: original.quantity,
    unit: original.unit,
  };
  form.value.combinations.push(copy);
};

const handleAdd = () => {
  dialogType.value = 'add';
  selectedSpecs.value = [];
  // 重置表单数据和同步状态
  form.value = {
    id: null,
    name: "",
    styleCode: "",
    combinations: [],
  };
  syncStatus.value = {
    specs: {},
    suggestedPrice: false,
    discount: false,
    price: false,
    additionalCost: false,
    quantity: false,
    unit: false
  };
  // 新增时直接获取规格属性列表
  fetchSpecifications();
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  dialogType.value = 'edit';
  const firstSku = row.children[0];
  
  // 重置表单数据和同步状态
  syncStatus.value = {
    specs: {},
    suggestedPrice: false,
    discount: false,
    price: false,
    additionalCost: false,
    quantity: false,
    unit: false
  };
  
  // 设置基本信息，确保使用正确的ID
  form.value = {
    id: row.children.map(sku => sku.id.toString()), // 保存所有子SKU的ID为字符串
    name: row.name,
    styleCode: row.styleCode,
    industryId: firstSku.specifications[0]?.specification?.industryId,
    combinations: [],
  };

  // 设置所属行业
  selectedIndustryId.value = firstSku.specifications[0]?.specification?.industryId;

  // 获取规格属性列表
  fetchSpecifications();
  
  // 设置已选规格属性
  selectedSpecs.value = Array.from(
    new Set(
      row.children.flatMap((sku) =>
        sku.specifications.map((spec) => spec.specificationId)
      )
    )
  );
  
  // 设置规格组合，确保保存每个组合的原始ID
  form.value.combinations = row.children
    .map((sku) => ({
      id: sku.id, // 保存原始ID
      code: sku.code,
      specValues: Object.fromEntries(
        sku.specifications.map((spec) => [spec.specificationId, spec.value])
      ),
      suggestedPrice: sku.stock?.suggestedPrice || 0,
      discount: sku.stock?.discount || 0,
      price: sku.stock?.price || 0,
      additionalCost: sku.stock?.additionalCost || 0,
      totalCost: sku.stock?.totalCost || 0,
      quantity: sku.stock?.quantity || 0,
      unit: sku.specifications[0]?.unit || "",
    }))
    .sort((a, b) => {
      const numA = parseInt(a.code) || 0;
      const numB = parseInt(b.code) || 0;
      return numA - numB;
    });
  
  dialogVisible.value = true;
};

const handleDelete = (row) => {
  ElMessageBox.confirm("确认删除该SKU组合吗？删除后不可恢复。", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      const skuIds = row.children.map((sku) => sku.id);
      const result = await ipcRenderer.invoke("sku:deleteSkus", { skuIds });
      if (result.success) {
        ElMessage.success("删除成功");
        fetchSkus();
      } else {
        ElMessage.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      ElMessage.error("删除失败");
    }
  });
};

// 修改对话框关闭和取消按钮的处理
const handleDialogClose = () => {
  dialogVisible.value = false;
}

const handleCancel = () => {
  dialogVisible.value = false;
}

// 修改表单提交处理函数
const handleSubmit = async () => {
  if (!formRef.value) return;
  
  try {
    submitting.value = true;
    
    // 验证表单
    await formRef.value.validate();
    
    // 获取所有规格组合数据，确保所有值都是基本类型
    const combinations = form.value.combinations.map(item => {
      // 确保所有数值都是数字类型
      const suggestedPrice = Number(item.suggestedPrice) || 0;
      const discount = Number(item.discount) || 0;
      const price = Number(item.price) || 0;
      const additionalCost = Number(item.additionalCost) || 0;
      const totalCost = Number(item.totalCost) || 0;
      const quantity = Number(item.quantity) || 0;

      return {
        code: String(item.code),
        specifications: selectedSpecs.value.map(specId => ({
          specificationId: Number(specId),
          value: String(item.specValues[specId] || ''),
          unit: String(item.unit || '')
        })),
        stock: {
          suggestedPrice,
          discount,
          price,
          additionalCost,
          totalCost,
          quantity
        }
      };
    });

    const params = {
      name: String(form.value.name),
      styleCode: String(form.value.styleCode),
      combinations
    };

    // 如果是编辑模式，添加skuIds，确保是有效的数字数组
    if (dialogType.value === 'edit' && Array.isArray(form.value.id)) {
      const skuIds = form.value.id
        .map(id => {
          const numId = parseInt(id);
          return !isNaN(numId) && numId > 0 ? numId : null;
        })
        .filter(id => id !== null);

      if (skuIds.length === 0) {
        throw new Error('无效的SKU ID');
      }
      
      params.skuIds = skuIds;
    }

    // 调用后端接口
    const result = await ipcRenderer.invoke(
      dialogType.value === 'edit' ? 'sku:updateSku' : 'sku:createSku',
      params
    );

    if (result.success) {
      ElMessage.success(dialogType.value === 'edit' ? '更新成功' : '创建成功');
      dialogVisible.value = false;
      fetchSkus();
    } else {
      ElMessage.error(result.error || (dialogType.value === 'edit' ? '更新失败' : '创建失败'));
    }
  } catch (error) {
    console.error('提交失败:', error);
    ElMessage.error(dialogType.value === 'edit' ? '更新失败' : '创建失败');
  } finally {
    submitting.value = false;
  }
};

const groupedSkus = computed(() => {
  // 如果没有选择行业，返回空数组
  if (!selectedIndustryId.value) {
    return [];
  }

  const groups = new Map();
  
  // 按 name 和 styleCode 分组，根据中行业进行筛选
  skus.value
    .filter((sku) => {
      // 获选中行业及其所有子行业的ID
      const industryIds = getChildIndustryIds(
        selectedIndustryId.value,
        allIndustries.value
      );

      // 如果SKU的行业ID在选中的行业及其子行业，则示
      return industryIds.includes(
        sku.specifications?.[0]?.specification?.industryId
      );
    })
    .forEach((sku) => {
    const key = `${sku.name}-${sku.styleCode}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        name: sku.name,
        styleCode: sku.styleCode,
        createdAt: sku.createdAt,
          industry: sku.industry,
        isGroup: true,
          children: [],
          hasChildren: true,
      });
    }
      // 加组合 SKU 作为子节点
    groups.get(key).children.push({
      ...sku,
        id: `${sku.id}-child`,
      isGroup: false,
        hasChildren: false,
    });
  });
  
  // 对每个组内的组合按SKU编号排序
  for (const group of groups.values()) {
    group.children.sort((a, b) => {
      const numA = parseInt(a.code) || 0;
      const numB = parseInt(b.code) || 0;
      return numA - numB;
    });
  }
  
  // 将分组换为数组并按创建时间排序
  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
});

// 根据ID获取规格属性的完整标签（含单位）
const getSpecificationLabel = (id) => {
  const spec = specifications.value.find((s) => s.id === id);
  if (!spec) return "";
  return spec.unit ? `${spec.name}（${spec.unit}）` : spec.name;
};

const stockColumnLabel = (row) => {
  const unit = row.children?.[0]?.specifications?.[0]?.unit;
  return unit ? `库存（${unit}）` : "库存";
};

// 添加同步状态管理
const syncStatus = ref({
  specs: {}, // 规格属性的同步状态
  suggestedPrice: false,
  discount: false,
  price: false,
  additionalCost: false,
  quantity: false,
  unit: false
})

// 添加同步相关的处理函数
const handleSyncChange = (field, specId, value) => {
  if (field === 'specs') {
    syncStatus.value.specs[specId] = value;
  } else {
    syncStatus.value[field] = value;
  }
}

// 修改规格值变化处理函数
const handleSpecValueChange = (value, currentRow, specId) => {
  if (syncStatus.value.specs[specId]) {
    form.value.combinations.forEach(row => {
      if (row !== currentRow) {
        row.specValues[specId] = value;
      }
    });
  }
}

// 修改建议零售价变化处理函数
const handleSuggestedPriceChange = (currentRow, value) => {
  currentRow.suggestedPrice = value;
  // 如果折扣为0或未设置，视为不打折（折扣为1）
  const discount = currentRow.discount || 1;
  currentRow.price = Number((value * discount).toFixed(2));
  updateTotalCost(currentRow);
  
  // 如果开启了同步
  if (syncStatus.value.suggestedPrice) {
    form.value.combinations.forEach(row => {
      if (row !== currentRow) {
        row.suggestedPrice = value;
        // 如果折扣为0或未设置，视为不打折（折扣为1）
        const rowDiscount = row.discount || 1;
        row.price = Number((value * rowDiscount).toFixed(2));
        updateTotalCost(row);
      }
    });
  }
}

// 修改进货折扣变化处理函数
const handleDiscountChange = (currentRow, value) => {
  currentRow.discount = value;
  // 如果有建议零售单价，更新进货单价
  if (currentRow.suggestedPrice) {
    // 如果折扣为0或未设置，视为不打折（折扣为1）
    const discount = value || 1;
    currentRow.price = Number((currentRow.suggestedPrice * discount).toFixed(2));
    updateTotalCost(currentRow);
  }
  
  // 如果开启了同步
  if (syncStatus.value.discount) {
    form.value.combinations.forEach(row => {
      if (row !== currentRow) {
        row.discount = value;
        // 如果建议零售单价，更新进货单价
        if (row.suggestedPrice) {
          // 果折扣为0或未设置，视为不打折（折扣为1）
          const discount = value || 1;
          row.price = Number((row.suggestedPrice * discount).toFixed(2));
          updateTotalCost(row);
        }
      }
    });
  }
}

// 修改进货单价变化处理函数
const handlePriceChange = (currentRow, value) => {
  if (syncStatus.value.price) {
    form.value.combinations.forEach(row => {
      if (row !== currentRow) {
        row.price = value;
        updateTotalCost(row);
      }
    });
  }
  currentRow.price = value;
  updateTotalCost(currentRow);
}

// 修改附加成本变化处理函数
const handleCostChange = (currentRow, value) => {
  if (syncStatus.value.additionalCost) {
    form.value.combinations.forEach(row => {
      if (row !== currentRow) {
        row.additionalCost = value;
        updateTotalCost(row);
      }
    });
  }
  currentRow.additionalCost = value;
  updateTotalCost(currentRow);
}

// 修改数量变化处理函数
const handleQuantityChange = (currentRow, value) => {
  if (syncStatus.value.quantity) {
    form.value.combinations.forEach(row => {
      if (row !== currentRow) {
        row.quantity = value;
      }
    });
  }
}

// 修改单位变化处理函数
const handleUnitChange = (currentRow, value) => {
  if (syncStatus.value.unit) {
    form.value.combinations.forEach(row => {
      if (row !== currentRow) {
        row.unit = value;
      }
    });
  }
}

// 计算SKU组合的总库存
const getTotalStock = (row) => {
  if (!row.children) return 0;
  return row.children.reduce((total, sku) => total + (sku.stock?.quantity || 0), 0);
};

// 处理复制按钮点击
const handleCopy = (row) => {
  dialogType.value = 'add'
  const firstSku = row.children[0]
  
  // 设置基本信息
  form.value = {
    id: null,
    name: '',
    styleCode: '',
    industryId: firstSku.specifications[0]?.specification?.industryId,
    combinations: []
  }

  // 设置所属行业
  selectedIndustryId.value = firstSku.specifications[0]?.specification?.industryId

  // 获取规格属性列表
  fetchSpecifications()
  
  // 设置已选规格属性
  selectedSpecs.value = Array.from(
    new Set(
      row.children.flatMap((sku) =>
        sku.specifications.map((spec) => spec.specificationId)
      )
    )
  )
  
  // 复制规格组合数据
  form.value.combinations = row.children
    .map((sku) => ({
      code: sku.code,
      specValues: Object.fromEntries(
        sku.specifications.map((spec) => [spec.specificationId, spec.value])
      ),
      suggestedPrice: sku.stock?.suggestedPrice || 0,
      discount: sku.stock?.discount || 0,
      price: sku.stock?.price || 0,
      additionalCost: sku.stock?.additionalCost || 0,
      totalCost: sku.stock?.totalCost || 0,
      quantity: sku.stock?.quantity || 0,
      unit: sku.specifications[0]?.unit || ""
    }))
    .sort((a, b) => {
      const numA = parseInt(a.code) || 0;
      const numB = parseInt(b.code) || 0;
      return numA - numB;
    });

  dialogVisible.value = true
}

const handleSelectionChange = (selection) => {
  selectedSkus.value = selection;
};

const handleBatchCreateFolders = async () => {
  try {
    // 调用electron的showOpenDialog来选择目录
    const result = await ipcRenderer.invoke('dialog:showOpenDialog', {
      properties: ['openDirectory']
    });

    if (result.canceled) {
      return;
    }

    const targetPath = result.filePaths[0];
    
    // 获取选中的款号列表
    const styleCodeList = selectedSkus.value.map(sku => sku.styleCode);
    
    // 调用后端创建文件夹
    const createResult = await ipcRenderer.invoke('folder:batchCreate', {
      targetPath,
      styleCodeList
    });

    if (createResult.success) {
      ElMessage.success('文件夹创建成功');
    } else {
      ElMessage.error(createResult.error || '文件夹创建失败');
    }
  } catch (error) {
    console.error('创建文件夹失败:', error);
    ElMessage.error('创建文件夹失败');
  }
};

const getRowKey = (row) => {
  return row.styleCode;
};

// 添加表格配置
const tableConfig = {
  rowKey: 'styleCode',
  reserveSelection: true,
  defaultExpandAll: false,
};

// 添加表格引用
const skuTable = ref(null);

onMounted(async () => {
  await fetchIndustries();
});
</script>

<style scoped>
.sku-management {
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

.spec-value-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

:deep(.el-tag) {
  margin-right: 4px;
  margin-bottom: 4px;
}

.el-divider {
  margin: 16px 0;
}

.sku-combinations {
  margin-top: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 20px;
}

.combinations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.combinations-header h4 {
  margin: 0;
  color: #606266;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-table .el-input) {
  width: 100%;
}

.sku-combinations-expand {
  padding: 20px;
}

.sku-combinations-expand :deep(.el-table) {
  margin-top: 0;
}

.operation-buttons {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.operation-buttons :deep(.el-button) {
  padding: 0 4px;
  height: 24px;
  min-height: 24px;
}

.industry-select {
  margin-bottom: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

.sku-form {
  padding: 0;
}

.sku-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.sku-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.sku-combinations {
  margin-top: 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 20px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.header-buttons {
  display: flex;
  gap: 10px;
}
</style> 
