const { DataTypes } = require('sequelize');
const db = require('../database');

const SkuStock = db.define('SkuStock', {
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
  suggestedPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '建议零售单价',
    field: 'suggested_price'
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '进货折扣'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '进货单价'
  },
  additionalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '附加成本',
    field: 'additional_cost'
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '成本单价',
    field: 'total_cost'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '库存数量'
  }
}, {
  tableName: 'sku_stocks',
  timestamps: true,
  underscored: true
});

module.exports = SkuStock; 