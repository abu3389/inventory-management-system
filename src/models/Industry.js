const { DataTypes } = require('sequelize');
const db = require('../database');

const Industry = db.define('Industry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Industries',
      key: 'id'
    },
    field: 'parent_id'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  path: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'Industries',
  timestamps: true,
  underscored: true
});

module.exports = Industry; 