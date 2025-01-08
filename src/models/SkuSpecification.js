const { DataTypes } = require('sequelize');
const db = require('../database');

const SkuSpecification = db.define('SkuSpecification', {
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
  specificationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'specifications',
      key: 'id'
    },
    field: 'specification_id'
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '规格值'
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '单位'
  }
}, {
  tableName: 'sku_specifications',
  timestamps: true,
  underscored: true
});

module.exports = SkuSpecification; 