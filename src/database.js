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

// 检查是否有数据库备份，如果有且当前没有数据库，则恢复备份
const backupDbPath = path.join(userDataPath, 'backups', 'inventory.db.backup')
if (!fs.existsSync(dbPath) && fs.existsSync(backupDbPath)) {
  try {
    // 确保目标目录存在
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    
    // 复制备份文件
    fs.copyFileSync(backupDbPath, dbPath)
    console.log('已恢复数据库备份')
    
    // 检查是否有图片备份，如果有，恢复图片
    const backupImagesPath = path.join(userDataPath, 'backups', 'images')
    const imagesPath = path.join(userDataPath, 'images')
    
    if (fs.existsSync(backupImagesPath)) {
      // 确保图片目录存在
      if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath, { recursive: true })
      }
      
      // 复制图片文件夹的内容（这里简化处理，实际可能需要递归复制）
      const copyDir = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true })
        
        entries.forEach(entry => {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          
          if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) {
              fs.mkdirSync(destPath, { recursive: true })
            }
            copyDir(srcPath, destPath)
          } else {
            fs.copyFileSync(srcPath, destPath)
          }
        })
      }
      
      copyDir(backupImagesPath, imagesPath)
      console.log('已恢复图片备份')
    }
  } catch (error) {
    console.error('恢复备份失败:', error)
  }
}

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