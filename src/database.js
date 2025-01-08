const { Sequelize } = require('sequelize')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const isDev = process.env.NODE_ENV === 'development'

// 获取用户数据目录
const userDataPath = isDev ? path.join(__dirname, '../data') : app.getPath('userData')
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true })
}

// 数据库文件路径
const dbPath = path.join(userDataPath, 'inventory.db')
console.log('数据库文件路径:', dbPath)

// 创建 Sequelize 实例
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: isDev ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true
  }
})

module.exports = sequelize 