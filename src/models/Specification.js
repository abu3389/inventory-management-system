const { DataTypes } = require('sequelize');
const db = require('../database');

const Specification = db.define('Specification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '规格属性名称'
  },
  industryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'industry_id',
    comment: '所属行业ID',
    references: {
      model: 'industries',
      key: 'id'
    }
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'parent_id',
    comment: '父级ID',
    references: {
      model: 'specifications',
      key: 'id'
    }
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '层级'
  },
  path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '路径'
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '单位'
  },
  presetValues: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '预设值',
    get() {
      const rawValue = this.getDataValue('presetValues');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('presetValues', value ? JSON.stringify(value) : null);
    }
  }
}, {
  tableName: 'specifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'industry_id', 'parent_id'],
      name: 'specifications_name_industry_parent_unique'
    }
  ]
});

module.exports = Specification; 