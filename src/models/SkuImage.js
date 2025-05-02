const { DataTypes } = require('sequelize');
const db = require('../database');

const SkuImage = db.define('SkuImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  skuId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'skus',
      key: 'id'
    },
    field: 'sku_id'
  },
  styleCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '款号',
    field: 'style_code'
  },
  skuCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'SKU编号',
    field: 'sku_code'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '文件名',
    field: 'file_name'
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '文件路径',
    field: 'file_path'
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '排序顺序'
  }
}, {
  tableName: 'sku_images',
  timestamps: true,
  underscored: true
});

module.exports = SkuImage; 