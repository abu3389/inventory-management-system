const { app, ipcMain, BrowserWindow, dialog } = require("electron");
const { Op } = require("sequelize");
const fs = require('fs');
const path = require('path');

// 初始化数据库
const db = require("../database");
const User = require("../models/User");
const Role = require("../models/Role");
const Industry = require("../models/Industry");
const Brand = require("../models/Brand");
const Style = require("../models/Style");
const Specification = require("../models/Specification");
const Sku = require("../models/Sku");
const SkuSpecification = require("../models/SkuSpecification");
const SkuStock = require("../models/SkuStock");

// 等待数据库初始化完成
async function initDatabase() {
  try {
    await db.authenticate();
    console.log("数据库连接成功");

    // 同步基础表
    await Role.sync();
    await User.sync();
    await Industry.sync();
    await Style.sync();
    
    // 强制重新创建 SKU 相关的表（按照依赖顺序）
    await SkuStock.sync({ force: false });
    await SkuSpecification.sync({ force: false });
    await Sku.sync({ force: false });
    await Specification.sync({ force: false });

    // 建立模型
    // User 和 Role 的关联
    User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
    Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

    // Brand 和 Industry 的关联
    Brand.belongsTo(Industry, { foreignKey: 'industryId', as: 'brandIndustry' });
    Industry.hasMany(Brand, { foreignKey: 'industryId', as: 'brands' });

    // Style 和 Industry 的关联
    Style.belongsTo(Industry, { foreignKey: 'industryId', as: 'styleIndustry' });
    Industry.hasMany(Style, { foreignKey: 'industryId', as: 'styles' });

    // Specification 和 Industry 的关联
    Specification.belongsTo(Industry, { foreignKey: 'industryId', as: 'specIndustry' });
    Industry.hasMany(Specification, { foreignKey: 'industryId', as: 'specifications' });

    // Specification 的自关联
    Specification.belongsTo(Specification, { foreignKey: 'parentId', as: 'parentSpec' });
    Specification.hasMany(Specification, { foreignKey: 'parentId', as: 'childSpecs' });

    // SKU 相关的关联
    Sku.hasMany(SkuSpecification, { foreignKey: 'skuId', as: 'specifications' });
    SkuSpecification.belongsTo(Sku, { foreignKey: 'skuId', as: 'sku' });
    
    SkuSpecification.belongsTo(Specification, { foreignKey: 'specificationId', as: 'specification' });
    Specification.hasMany(SkuSpecification, { foreignKey: 'specificationId', as: 'skuSpecifications' });
    
    Sku.hasOne(SkuStock, { foreignKey: 'skuId', as: 'stock' });
    SkuStock.belongsTo(Sku, { foreignKey: 'skuId', as: 'sku' });

    console.log('数据库同步完成');
  } catch (error) {
    console.error('数据库同步失败:', error);
    throw error;
  }
}

// 注册所有 IPC 处理程序
function registerIpcHandlers() {
  // 验证用户是否存在
  ipcMain.handle("auth:validateUser", async (event, { userId }) => {
    try {
      console.log("主进程: 验证用户:", userId);
      const user = await User.findByPk(userId);
      console.log("主进程: 用户验证结果:", !!user);
      return {
        success: !!user,
      };
    } catch (error) {
      console.error("主进程: 验证失败:", error);
      return { success: false };
    }
  });

  // 数据库检查处理器
  ipcMain.handle("database:check", async () => {
    try {
      await db.authenticate();
      // 检查 users 表是否存在
      await User.findAll({ limit: 1 });
      return { success: true };
    } catch (error) {
      console.error("数据库检查失败:", error);
      return { success: false };
    }
  });

  // 注册处理函数
  ipcMain.handle("auth:register", async (event, { username, password }) => {
    try {
      // 检查用户名是否已存在
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return { success: false, error: "用名已存在" };
      }

      // 检查是否是第一个用户
      const isFirstUser = await User.isFirstUser();

      let role = null;
      if (isFirstUser) {
        // 创建超级管理员角色
        role = await Role.create({
          id: 1,
          name: "超级管理员",
          description: "系统超级管理员，拥有所有权限",
          permissions: [
            "/",
            "/inventory",
            "/brands",
            "/styles",
            "/specifications",
            "/industries",
            "/settings",
            "/settings/change-password",
            "/settings/users",
            "/settings/roles",
          ],
        });

        console.log("创建的超级管理员角色:", role.toJSON());

        // 建第一个用户并绑定超级管理员角色
        const user = await User.create({
          username,
          password,
          roleId: role.id, // 直接使用创建的角色ID
          status: 1, // 设置默认状态为正常
        });

        console.log("创建的用户:", user.toJSON());

        // 获取含角��信息的整用户信息
        const userWithRole = await User.findOne({
          where: { id: user.id },
          include: [
            {
              model: Role,
              as: "role",
            },
          ],
        });

        if (!userWithRole) {
          throw new Error("无法获取用户信息");
        }

        console.log("返回的用户信息:", userWithRole.toJSON());

        // 返回用户信息（不包含密码）
        const { password: _, ...userWithoutPassword } = userWithRole.toJSON();
        return { success: true, user: userWithoutPassword };
      } else {
        // 查找或创建普通用户角色
        let normalRole = await Role.findOne({ where: { name: "普通用户" } });
        if (!normalRole) {
          normalRole = await Role.create({
            name: "普通用户",
            description: "普通用户，具有基本权限",
            permissions: [
              "/",
              "/inventory",
              "/brands",
              "/styles",
              "/specifications",
              "/industries",
              "/settings",
              "/settings/change-password",
            ],
          });
          console.log("创建的普通用户角色:", normalRole.toJSON());
        }

        // 创建通用户并绑定普通用户角色
        const user = await User.create({
          username,
          password,
          roleId: normalRole.id,
          status: 1, // 设置默认状态为正常
        });

        console.log("创建的普通用户:", user.toJSON());

        // 获取包含角色信息的完整用户信息
        const userWithRole = await User.findOne({
          where: { id: user.id },
          include: [
            {
              model: Role,
              as: "role",
            },
          ],
        });

        if (!userWithRole) {
          throw new Error("无法获取用户信息");
        }

        console.log("返回的用户信息:", userWithRole.toJSON());

        // 返回用户信息（不包含密码）
        const { password: _, ...userWithoutPassword } = userWithRole.toJSON();
        return { success: true, user: userWithoutPassword };
      }
    } catch (error) {
      console.error("注册失败:", error);
      return { success: false, error: "注册失败" };
    }
  });

  // 登录处理函数
  ipcMain.handle("auth:login", async (event, { username, password }) => {
    try {
      console.log("尝试登录用户:", username);

      // 使用 raw: false 确保返回 Sequelize 实例
      const user = await User.findOne({
        where: { username },
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["id", "name", "permissions"],
            required: false, // 使用 left join
          },
        ],
        raw: false,
      });

      if (!user) {
        console.log("用户不存在:", username);
        return { success: false, error: "用户名或密码错误" };
      }

      console.log("找到用户:", JSON.stringify(user.toJSON(), null, 2));

      // 检查账户状态
      if (user.status === 0) {
        console.log("账户已被冻结:", username);
        return { success: false, error: "账户被冻结，请联系管理员" };
      }

      const isValid = await user.validatePassword(password);
      if (!isValid) {
        console.log("密码验证失败");
        return { success: false, error: "用户名或密码错误" };
      }

      console.log("密码验证成功");

      // 返回用户信息（不包含密码）
      const { password: _, ...userWithoutPassword } = user.toJSON();
      console.log(
        "登录成功，返回用户信息：",
        JSON.stringify(userWithoutPassword, null, 2)
      );
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("登录失败:", error);
      return { success: false, error: "登录失败" };
    }
  });

  // 更新密码处理函数
  ipcMain.handle("auth:updatePassword", async (event, { userId, oldPassword, newPassword }) => {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return { success: false, error: "用户不存在" };
      }

      const isValid = await user.validatePassword(oldPassword);
      if (!isValid) {
        return { success: false, error: "原密码错误" };
      }

      await user.update({ password: newPassword });
      return { success: true };
    } catch (error) {
      console.error("更新密码失败:", error);
      return { success: false, error: "更新密码失败" };
    }
  });

  // 获取用户列表
  ipcMain.handle("auth:getUsers", async () => {
    try {
      console.log("主进程: 开始获取用户列表");
      const users = await User.findAll({
        attributes: ["id", "username", "status", "createdAt", "updatedAt"],
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["id", "name", "permissions"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      console.log("主进程: 查询到的用户数量:", users.length);
      console.log(
        "主进程: 用户表详情:",
        JSON.stringify(
          users.map((user) => user.toJSON()),
          null,
          2
        )
      );

      const userList = users.map((user) => user.toJSON());
      console.log("进程: 处理后的用户列表:", userList);

      return {
        success: true,
        users: userList,
      };
    } catch (error) {
      console.error("主进程: 获取用户列表失败:", error);
      return { success: false, error: "获取用户列表失败" };
    }
  });

  // 创建用户
  ipcMain.handle("auth:createUser", async (event, userData) => {
    try {
      // 检查用户名是否已存在
      const existingUser = await User.findOne({
        where: { username: userData.username },
      });
      if (existingUser) {
        return { success: false, error: "用户名已存在" };
      }

      // 设置默认状态为正常
      userData.status = 1;
      console.log("创建用户，设置的数据:", userData);

      const user = await User.create(userData);
      console.log("创建的用户:", user.toJSON());

      // 获取包含角色信息的完整用户信息
      const userWithRole = await User.findOne({
        where: { id: user.id },
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["id", "name", "permissions"],
          },
        ],
      });

      const { password: _, ...userWithoutPassword } = userWithRole.toJSON();
      console.log("返回前端的用户数据:", userWithoutPassword);
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("创建用户失败:", error);
      return { success: false, error: "创建用户失败" };
    }
  });

  // 更新用户角色
  ipcMain.handle("auth:updateUserRole", async (event, { userId, isAdmin, roleId }) => {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return { success: false, error: "用户不存在" };
      }

      // 如果提供了roleId，检查角色是否存在
      if (roleId) {
        const role = await Role.findByPk(roleId);
        if (!role) {
          return { success: false, error: "角色不存在" };
        }
      }

      // 更新用户管理员状态和角色
      await user.update({
        isAdmin: isAdmin !== undefined ? isAdmin : user.isAdmin,
        roleId: roleId !== undefined ? roleId : user.roleId,
      });
      return { success: true };
    } catch (error) {
      console.error("更新用户角色失败:", error);
      return { success: false, error: "更新用户角色失败" };
    }
  });

  // 删除用户
  ipcMain.handle("auth:deleteUser", async (event, { userId }) => {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return { success: false, error: "用户不存在" };
      }

      await user.destroy();
      return { success: true };
    } catch (error) {
      console.error("删除用户失败:", error);
      return { success: false, error: "删除用户失败" };
    }
  });

  // ���置用户密码处理器
  ipcMain.handle("auth:resetUserPassword", async (event, { userId, newPassword }) => {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return { success: false, error: "用户不存在" };
      }

      await user.update({ password: newPassword });
      return { success: true };
    } catch (error) {
      console.error("重置密码失败:", error);
      return { success: false, error: "重置密码失败" };
    }
  });

  // 获取角色列表
  ipcMain.handle("auth:getRoles", async () => {
    try {
      const roles = await Role.findAll({
        attributes: ["id", "name", "description", "permissions", "createdAt"],
        order: [["createdAt", "DESC"]],
      });

      // 将 Sequelize 模型实例转换为普通对象
      const roleList = roles.map((role) => {
        const roleData = role.toJSON();
        return {
          ...roleData,
          createdAt: roleData.createdAt
            ? new Date(roleData.createdAt).toISOString()
            : null,
        };
      });

      console.log("获取到的角色列表:", JSON.stringify(roleList, null, 2));
      return { success: true, roles: roleList };
    } catch (error) {
      console.error("获取角色列表失败:", error);
      return { success: false, error: "获取角色列表失败" };
    }
  });

  // 创建角色
  ipcMain.handle("auth:createRole", async (event, roleData) => {
    try {
      // 检查角色名是否存在
      const existingRole = await Role.findOne({
        where: { name: roleData.name },
      });
      if (existingRole) {
        return { success: false, error: "角色名已存在" };
      }

      const role = await Role.create(roleData);
      return { success: true, role };
    } catch (error) {
      console.error("创建角色失败:", error);
      return { success: false, error: "创建角色失败" };
    }
  });

  // 更新角色
  ipcMain.handle("auth:updateRole", async (event, { roleId, ...roleData }) => {
    try {
      const role = await Role.findByPk(roleId);
      if (!role) {
        return { success: false, error: "角色不存在" };
      }

      // 检查新角色名是否与其他角色冲突
      if (roleData.name !== role.name) {
        const existingRole = await Role.findOne({
          where: { name: roleData.name },
        });
        if (existingRole) {
          return { success: false, error: "角色名已存在" };
        }
      }

      await role.update(roleData);
      return { success: true };
    } catch (error) {
      console.error("更新角色失败:", error);
      return { success: false, error: "更新角色失败" };
    }
  });

  // 删除角色
  ipcMain.handle("auth:deleteRole", async (event, { roleId }) => {
    try {
      const role = await Role.findByPk(roleId);
      if (!role) {
        return { success: false, error: "角色不存在" };
      }

      // 检查是否有用户正在使用该角色
      const usersWithRole = await User.count({ where: { roleId } });
      if (usersWithRole > 0) {
        return { success: false, error: "该角色还有用户，无法删除" };
      }

      await role.destroy();
      return { success: true };
    } catch (error) {
      console.error("删除角色失败:", error);
      return { success: false, error: "删除角色失败" };
    }
  });

  // 更新用户
  ipcMain.handle("auth:updateUser", async (event, userData) => {
    try {
      console.log("开始更新用户，接收到的数据:", userData);

      const user = await User.findByPk(userData.id);
      if (!user) {
        console.log("用户不存在:", userData.id);
        return { success: false, error: "用户不存在" };
      }

      console.log("找到用户:", user.toJSON());

      // 如果修改了用户名，检查是否与其他用户冲突
      if (userData.username && userData.username !== user.username) {
        const existingUser = await User.findOne({
          where: { username: userData.username },
        });
        if (existingUser) {
          console.log("用户名已存在:", userData.username);
          return { success: false, error: "用户名已存在" };
        }
      }

      // 如果提供了roleId，检查角色是否存在
      if (userData.roleId) {
        const role = await Role.findByPk(userData.roleId);
        if (!role) {
          console.log("角色不存在:", userData.roleId);
          return { success: false, error: "角色不存在" };
        }
      }

      // 更新用户信息
      const updateData = {};
      if (userData.username) updateData.username = userData.username;
      if (userData.roleId !== undefined) updateData.roleId = userData.roleId;
      if (userData.status !== undefined) updateData.status = userData.status;

      console.log("准备更新的数据:", updateData);

      await user.update(updateData);
      console.log("更新成功，更新后的用户数据:", user.toJSON());

      // 获取更新后的户信息（包含角色）
      const updatedUser = await User.findOne({
        where: { id: user.id },
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["id", "name", "description", "permissions"],
          },
        ],
      });

      const { password: _, ...userWithoutPassword } = updatedUser.toJSON();
      console.log("返回给前端的用户数据:", userWithoutPassword);
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("更新用户失败:", error);
      return { success: false, error: "更新用户失败" };
    }
  });

  // 获取行业列表
  ipcMain.handle("industry:getIndustries", async () => {
    try {
      const industries = await Industry.findAll({
        order: [
          ["level", "ASC"],
          ["createdAt", "ASC"],
        ],
      });

      // 将表转换为树形结构
      const buildTree = (items, parentId = null) => {
        const result = [];
        for (const item of items) {
          if (item.parentId === parentId) {
            const children = buildTree(items, item.id);
            const node = item.toJSON();
            if (children.length) {
              node.children = children;
            }
            result.push(node);
          }
        }
        return result;
      };

      const industryTree = buildTree(industries);
      return { success: true, industries: industryTree };
    } catch (error) {
      console.error("获取行业列表失败:", error);
      return { success: false, error: "获取行业列表失败" };
    }
  });

  // 创建行业
  ipcMain.handle("industry:createIndustry", async (event, industryData) => {
    try {
      // 检查行业是否已存在（只在同一父级下检查）
      const existingIndustry = await Industry.findOne({
        where: { 
          name: industryData.name,
          parentId: industryData.parentId || null
        }
      });
      if (existingIndustry) {
        return { success: false, error: "同级行业下���存在相同名称的行业" };
      }

      // 计算层级和路径
      let level = 1;
      let path = null;

      if (industryData.parentId) {
        const parent = await Industry.findByPk(industryData.parentId);
        if (!parent) {
          return { success: false, error: "父级行业不存在" };
        }
        level = parent.level + 1;
        path = parent.path ? `${parent.path},${parent.id}` : String(parent.id);
      }

      const industry = await Industry.create({
        ...industryData,
        level,
        path,
      });

      return { success: true, industry: industry.toJSON() };
    } catch (error) {
      console.error("创建行业失败:", error);
      return { success: false, error: "创建行业失败" };
    }
  });

  // 更新行业
  ipcMain.handle("industry:updateIndustry", async (event, { industryId, ...industryData }) => {
    try {
      const industry = await Industry.findByPk(industryId);
      if (!industry) {
        return { success: false, error: "行业不存在" };
      }

      // 检查新名称是否与其他行业重复
      if (industryData.name !== industry.name) {
        const existingIndustry = await Industry.findOne({
          where: { 
            name: industryData.name,
            parentId: industryData.parentId || industry.parentId, // 添加父级ID作为条件
            id: { [Op.ne]: industryId } // 除前正在编辑的行业
          }
        });
        if (existingIndustry) {
          return { success: false, error: "同级行业下已存在相同名称的行业" };
        }
      }

      // 如果更新了父级ID
      if (industryData.parentId !== industry.parentId) {
        // 如果父级ID为空或空字符串，将其设置为顶级行业
        if (!industryData.parentId || industryData.parentId === '') {
          industryData.parentId = null;
          industryData.level = 1;
          industryData.path = null;
        } else {
          // 如果选择了新的父级，检查父级是否存在并验证
          const parent = await Industry.findByPk(industryData.parentId);
          if (!parent) {
            return { success: false, error: "父级行业不存在" };
          }
          // 检查是否会形成循环引用
          if (parent.path && parent.path.split(",").includes(String(industryId))) {
            return { success: false, error: "不能选择子行业作为父级" };
          }
          industryData.level = parent.level + 1;
          industryData.path = parent.path ? `${parent.path},${parent.id}` : String(parent.id);
        }

        // 更新所有行业的层级和路径
        const updateChildren = async (parentId, parentLevel, parentPath) => {
          const children = await Industry.findAll({ where: { parentId } });
          for (const child of children) {
            const childLevel = parentLevel + 1;
            const childPath = parentPath
              ? `${parentPath},${parentId}`
              : String(parentId);
            await child.update({ level: childLevel, path: childPath });
            await updateChildren(child.id, childLevel, childPath);
          }
        };

        await updateChildren(industryId, industryData.level, industryData.path);
      }

      await industry.update(industryData);
      return { success: true, industry: industry.toJSON() };
    } catch (error) {
      console.error("更新行业失败:", error);
      return { success: false, error: "更新行业失败" };
    }
  });

  // 删除行业
  ipcMain.handle("industry:deleteIndustry", async (event, { industryId }) => {
    try {
      const industry = await Industry.findByPk(industryId);
      if (!industry) {
        return { success: false, error: "行业不存在" };
      }

      // 检查是否有子行业
      const childrenCount = await Industry.count({
        where: { parentId: industryId },
      });
      if (childrenCount > 0) {
        return { success: false, error: "该行业��还有子行业，先删除子行业" };
      }

      // 检查是否存关联的品牌
      const relatedBrands = await Brand.count({
        where: { industryId },
      });

      if (relatedBrands > 0) {
        return { success: false, error: "该行业下存在关联的品牌，无法删除" };
      }

      await industry.destroy();
      return { success: true };
    } catch (error) {
      console.error("删除行业失败:", error);
      return { success: false, error: "删除行业失败" };
    }
  });

  // 获品牌列表
  ipcMain.handle("brand:getBrands", async () => {
    try {
      const brands = await Brand.findAll({
        include: [
          {
            model: Industry,
            as: "brandIndustry",
            attributes: ['id', 'name']
          }
        ],
        order: [["createdAt", "DESC"]]
      });

      const brandList = brands.map(brand => {
        const brandData = brand.toJSON();
        return {
          ...brandData,
          industry: brandData.brandIndustry, // 添加 industry 字段保持兼容
          createdAt: brandData.createdAt ? new Date(brandData.createdAt).toISOString() : null
        };
      });

      return { success: true, brands: brandList };
    } catch (error) {
      console.error("获取品牌列表失败:", error);
      return { success: false, error: "获取品牌列表失败" };
    }
  });

  // 创建品牌
  ipcMain.handle("brand:createBrand", async (event, brandData) => {
    try {
      // 检查品牌名是否已存在
      const existingBrand = await Brand.findOne({
        where: { name: brandData.name },
      });
      if (existingBrand) {
        return { success: false, error: "品牌名称已存在" };
      }

      // 检查行业是否存在
      const industry = await Industry.findByPk(brandData.industryId);
      if (!industry) {
        return { success: false, error: "所选行业不存在" };
      }

      const brand = await Brand.create(brandData);

      // 获取包含行业信息的完整品牌信息
      const brandWithIndustry = await Brand.findOne({
        where: { id: brand.id },
        include: [
          {
            model: Industry,
            as: "brandIndustry",
            attributes: ["id", "name"],
          },
        ],
      });

      const result = brandWithIndustry.toJSON();
      return {
        success: true,
        brand: {
          ...result,
          createdAt: result.createdAt
            ? new Date(result.createdAt).toISOString()
            : null,
        },
      };
    } catch (error) {
      console.error("创建品牌失败:", error);
      return { success: false, error: "创建品牌失败" };
    }
  });

  // 更新品牌
  ipcMain.handle(
    "brand:updateBrand",
    async (event, { brandId, ...brandData }) => {
      try {
        const brand = await Brand.findByPk(brandId);
        if (!brand) {
          return { success: false, error: "品牌不存在" };
        }

        // 检查新品牌名是否与其他品牌重复
        if (brandData.name !== brand.name) {
          const existingBrand = await Brand.findOne({
            where: { name: brandData.name },
          });
          if (existingBrand) {
            return { success: false, error: "品牌名称已存在" };
          }
        }

        // 如果更新了行业，检查行业是否存在
        if (brandData.industryId) {
          const industry = await Industry.findByPk(brandData.industryId);
          if (!industry) {
            return { success: false, error: "所选行业不存在" };
          }
        }

        await brand.update(brandData);

        // 获取更新后的完整品牌信息
        const updatedBrand = await Brand.findOne({
          where: { id: brand.id },
          include: [
            {
              model: Industry,
              as: "brandIndustry",
              attributes: ["id", "name"],
            },
          ],
        });

        const result = updatedBrand.toJSON();
        return {
          success: true,
          brand: {
            ...result,
            createdAt: result.createdAt
              ? new Date(result.createdAt).toISOString()
              : null,
          },
        };
      } catch (error) {
        console.error("更新品牌失败:", error);
        return { success: false, error: "更新品牌失败" };
      }
    }
  );

  // 删除品牌
  ipcMain.handle("brand:deleteBrand", async (event, { brandId }) => {
    try {
      const brand = await Brand.findByPk(brandId);
      if (!brand) {
        return { success: false, error: "品牌不存在" };
      }

      await brand.destroy();
      return { success: true };
    } catch (error) {
      console.error("删除品牌失败:", error);
      return { success: false, error: "删除品牌失败" };
    }
  });

  // 获取款式分类列表
  ipcMain.handle("style:getStyles", async (event, { industryId }) => {
    try {
      // 获取选中行业及其所有子行业的ID
      const getIndustryIds = async (rootId) => {
        const ids = [rootId];
        const children = await Industry.findAll({ where: { parentId: rootId } });
        for (const child of children) {
          const childIds = await getIndustryIds(child.id);
          ids.push(...childIds);
        }
        return ids;
      };

      const industryIds = await getIndustryIds(industryId);
      
      // 获取所有款式分类，并关联行业表
      const allStyles = await Style.findAll({
        where: { industryId: industryIds },
        include: [
          {
            model: Industry,
            as: 'styleIndustry',
            attributes: ['id', 'name']
          }
        ],
        order: [
          ["level", "ASC"],
          ["createdAt", "ASC"],
        ],
      });

      // 将列表转换为树形结构
      const buildTree = (items, parentId = null) => {
        const result = [];
        for (const item of items) {
          if (item.parentId === parentId) {
            const children = buildTree(items, item.id);
            const node = item.toJSON();
            node.industry = node.styleIndustry; // 添加 industry 字段以保持兼容
            if (children.length) {
              node.children = children;
            }
            result.push(node);
          }
        }
        return result;
      };

      const styleTree = buildTree(allStyles);
      return { success: true, styles: styleTree };
    } catch (error) {
      console.error("获取款式分类列表失败:", error);
      return { success: false, error: "获取款式分类列表失败" };
    }
  });

  // 创建款式分类
  ipcMain.handle("style:createStyle", async (event, styleData) => {
    try {
      // 检查款式分类名是否已存在（只在同一行业的同一父级下检查）
      const existingStyle = await Style.findOne({
        where: { 
          name: styleData.name, 
          industryId: styleData.industryId,
          parentId: styleData.parentId || null // 如果没有父级则为null
        },
      });
      if (existingStyle) {
        return { success: false, error: "同级分类下已存在相同名称的款式分类" };
      }

      // 计算层级和路径
      let level = 1;
      let path = null;

      if (styleData.parentId) {
        const parent = await Style.findByPk(styleData.parentId);
        if (!parent) {
          return { success: false, error: "父级分类不存在" };
        }
        level = parent.level + 1;
        path = parent.path ? `${parent.path},${parent.id}` : String(parent.id);
      }

      const style = await Style.create({
        ...styleData,
        level,
        path,
      });

      return { success: true, style: style.toJSON() };
    } catch (error) {
      console.error("创建款式分类失败:", error);
      return { success: false, error: "创建款式分类失败" };
    }
  });

  // 更新款式分类
  ipcMain.handle("style:updateStyle", async (event, { styleId, ...styleData }) => {
    try {
      const style = await Style.findByPk(styleId);
      if (!style) {
        return { success: false, error: "款式分类不存在" };
      }

      // 检查新名称是否与其他分类重复
      if (styleData.name !== style.name) {
        const existingStyle = await Style.findOne({
          where: { 
            name: styleData.name, 
            industryId: styleData.industryId || style.industryId,
            parentId: styleData.parentId || style.parentId, // 添加父级ID作为条件
            id: { [Op.ne]: styleId } // 排除当前正在编辑的分类
          }
        });
        if (existingStyle) {
          return { success: false, error: "同级分类下已存在相同名称的款式分类" };
        }
      }

      // 如果更新了父级ID
      if (styleData.parentId !== style.parentId) {
        // 如果父级ID为空或空字符串，将分类移动到当前行业的顶级
        if (!styleData.parentId || styleData.parentId === '') {
          styleData.parentId = null;
          styleData.level = 1;
          styleData.path = null;
        } else {
          // 如果选择了新的父级，检查父级是否存在并验证
          const parent = await Style.findByPk(styleData.parentId);
          if (!parent) {
            return { success: false, error: "父级分类不存在" };
          }
          // 检查是否会形成循环引用
          if (parent.path && parent.path.split(",").includes(String(styleId))) {
            return { success: false, error: "不能选择子分类作为父级" };
          }
          styleData.level = parent.level + 1;
          styleData.path = parent.path ? `${parent.path},${parent.id}` : String(parent.id);
        }

        // 更新所有子分类的层级和路径
        const updateChildren = async (parentId, parentLevel, parentPath) => {
          const children = await Style.findAll({ where: { parentId } });
          for (const child of children) {
            const childLevel = parentLevel + 1;
            const childPath = parentPath
              ? `${parentPath},${parentId}`
              : String(parentId);
            await child.update({ level: childLevel, path: childPath });
            await updateChildren(child.id, childLevel, childPath);
          }
        };

        await updateChildren(styleId, styleData.level, styleData.path);
      }

      await style.update(styleData);
      return { success: true, style: style.toJSON() };
    } catch (error) {
      console.error("更新款式��类失败:", error);
      return { success: false, error: "更新款式分类失败" };
    }
  });

  // 删除款式分类
  ipcMain.handle("style:deleteStyle", async (event, { styleId }) => {
    try {
      const style = await Style.findByPk(styleId);
      if (!style) {
        return { success: false, error: "款式分类不存在" };
      }

      // 检查是否有子分类
      const hasChildren = await Style.findOne({
        where: { parentId: styleId }
      });
      if (hasChildren) {
        return { success: false, error: "请先删除子分类" };
      }

      await style.destroy();
      return { success: true };
    } catch (error) {
      console.error("删除款式分类失败:", error);
      return { success: false, error: "删除款式分类失败" };
    }
  });

  // 获取规格属性列表
  ipcMain.handle("specification:getSpecifications", async (event, industryId) => {
    try {
      console.log('获取规格属性列表，行业ID:', industryId)
      
      if (!industryId) {
        console.log('未提供行业ID')
        return { success: false, error: '请选择行业' }
      }

      // 获取选中行业及其所有子行业的ID
      const getIndustryIds = async (rootId) => {
        const ids = [rootId]
        const children = await Industry.findAll({ where: { parentId: rootId } })
        for (const child of children) {
          const childIds = await getIndustryIds(child.id)
          ids.push(...childIds)
        }
        return ids
      }

      const industryIds = await getIndustryIds(industryId)
      console.log('包含的所有行业ID:', industryIds)

      const specifications = await Specification.findAll({
        where: {
          industryId: {
            [Op.in]: industryIds
          }
        },
        include: [
          {
            model: Industry,
            as: 'specIndustry',
            attributes: ['id', 'name']
          },
          {
            model: Specification,
            as: 'parentSpec',
            attributes: ['id', 'name']
          }
        ],
        order: [
          ["level", "ASC"],
          ["createdAt", "ASC"],
        ],
      })

      console.log('查询到的规格属性数量:', specifications.length)

      // 将列表转换为树形结构
      const buildTree = (items, parentId = null) => {
        const result = []
        for (const item of items) {
          if (item.parentId === parentId) {
            const children = buildTree(items, item.id)
            const node = item.toJSON()
            if (children.length) {
              node.children = children
            }
            result.push(node)
          }
        }
        return result
      }

      const specificationTree = buildTree(specifications)
      console.log('转换后的树形结构规格属性数量:', specificationTree.length)

      return { 
        success: true, 
        specifications: specificationTree 
      }
    } catch (error) {
      console.error("获取规格属性列表失败:", error)
      console.error("错误堆栈:", error.stack)
      return { 
        success: false, 
        error: error.message || "获取规格属性列表失败" 
      }
    }
  })

  // 创建规格属性
  ipcMain.handle('specification:createSpecification', async (event, params) => {
    try {
      if (!params.industryId) {
        return { success: false, error: '请选择行业' };
      }

      // 检查名称是否已存在（只在同一父级和同一行业下检查）
      const existingSpec = await Specification.findOne({
        where: { 
          name: params.name,
          parentId: params.parentId || null,
          industryId: params.industryId
        }
      });
      if (existingSpec) {
        return { success: false, error: '同级属性下已存在同名称的规格属性' };
      }

      // 处理父级ID
      let level = 1;
      let path = null;
      if (params.parentId) {
        const parent = await Specification.findByPk(params.parentId);
        if (!parent) {
          return { success: false, error: '父级规格属性不存在' };
        }
        // 检查父级是否属于同一行业
        if (parent.industryId !== params.industryId) {
          return { success: false, error: '父级规格属性必须属于同一行业' };
        }
        level = parent.level + 1;
        path = parent.path ? `${parent.path},${parent.id}` : String(parent.id);
      }

      // 创建规格属性
      const specification = await Specification.create({
        name: params.name,
        presetValues: params.presetValues,
        unit: params.unit,
        parentId: params.parentId,
        industryId: params.industryId,
        level,
        path
      });

      return { success: true, specification: specification.toJSON() };
    } catch (error) {
      console.error('创建规格属性失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新规格属性
  ipcMain.handle('specification:updateSpecification', async (event, params) => {
    try {
      const { specificationId, ...updateData } = params;
      
      // 检查规格属性是否存在
      const specification = await Specification.findByPk(specificationId);
      if (!specification) {
        return { success: false, error: '规格属性不存在' };
      }

      // 检查行业是否存在
      if (updateData.industryId) {
        const industry = await Industry.findByPk(updateData.industryId);
        if (!industry) {
          return { success: false, error: '所选行业不存在' };
        }
      }

      // 检查新名称是否与其他规格属性重复（同一行业和父级下）
      if (updateData.name !== specification.name || updateData.industryId !== specification.industryId) {
        const existingSpec = await Specification.findOne({
          where: { 
            name: updateData.name,
            parentId: updateData.parentId || specification.parentId,
            industryId: updateData.industryId || specification.industryId,
            id: { [Op.ne]: specificationId }
          }
        });
        if (existingSpec) {
          return { success: false, error: '同级属性下已存在相同名称的规格属性' };
        }
      }

      // 如果更新了父级ID，需要重新计算层级和路径
      if ('parentId' in updateData) {
        // 如果父级ID为空或空字符串，将其设置为顶级分类
        if (!updateData.parentId || updateData.parentId === '') {
          updateData.parentId = null;
          updateData.level = 1;
          updateData.path = null;
        } else {
          const parent = await Specification.findByPk(updateData.parentId);
          if (!parent) {
            return { success: false, error: '父级规格属性不存在' };
          }
          // 检查父级是否属于同一行业
          if (parent.industryId !== (updateData.industryId || specification.industryId)) {
            return { success: false, error: '父级规格属性必须属于同一行业' };
          }
          // 检查是否会形成循环引用
          if (parent.path && parent.path.split(',').includes(String(specificationId))) {
            return { success: false, error: '不能选择子规格属性作为父级' };
          }
          updateData.level = parent.level + 1;
          updateData.path = parent.path ? `${parent.path},${parent.id}` : String(parent.id);
        }

        // 更新所有子规格属性的层级和路径
        const children = await Specification.findAll({
          where: {
            path: {
              [Op.like]: `%${specification.id}%`
            }
          }
        });
        for (const child of children) {
          const childPath = child.path ? child.path.split(',') : [];
          const index = childPath.indexOf(String(specification.id));
          const newPath = updateData.path 
            ? [...updateData.path.split(','), ...childPath.slice(index)]
            : [String(specification.id), ...childPath.slice(index + 1)];
          await child.update({
            level: updateData.level + (child.level - specification.level),
            path: newPath.join(',')
          });
        }
      }

      // 更新规格属性
      await specification.update(updateData);

      // 获取更新后的完整数据
      const updatedSpec = await Specification.findOne({
        where: { id: specificationId },
        include: [
          {
            model: Industry,
            as: 'specIndustry',
            attributes: ['id', 'name']
          },
          {
            model: Specification,
            as: 'parentSpec',
            attributes: ['id', 'name']
          }
        ]
      });

      return { success: true, specification: updatedSpec.toJSON() };
    } catch (error) {
      console.error('更新规格属性失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除规格属性
  ipcMain.handle('specification:deleteSpecification', async (event, { specificationId }) => {
    try {
      const specification = await Specification.findByPk(specificationId);
      if (!specification) {
        return { success: false, error: '规格属性不存在' };
      }

      // 检查是否有子规格性
      const hasChildren = await Specification.findOne({
        where: { parentId: specificationId }
      });
      if (hasChildren) {
        return { success: false, error: '请先删除子规格属性' };
      }

      await specification.destroy();
      return { success: true };
    } catch (error) {
      console.error('删除规格属性失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取SKU列表
  ipcMain.handle("sku:getSkus", async () => {
    try {
      const skus = await Sku.findAll({
        include: [
          {
            model: SkuSpecification,
            as: 'specifications',
            include: [
              {
                model: Specification,
                as: 'specification',
                attributes: ['id', 'name', 'unit', 'presetValues', 'industryId'],
                include: [
                  {
                    model: Industry,
                    as: 'specIndustry',
                    attributes: ['id', 'name']
                  }
                ]
              }
            ]
          },
          {
            model: SkuStock,
            as: 'stock'
          }
        ],
        order: [["createdAt", "DESC"]]
      });

      // 处理数据，将行业信息添加到顶层
      const processedSkus = skus.map(sku => {
        const skuData = sku.toJSON();
        // 从第一个规格中获取行业信息
        if (skuData.specifications && skuData.specifications.length > 0) {
          const firstSpec = skuData.specifications[0];
          skuData.industry = firstSpec.specification.specIndustry;
          skuData.industryId = firstSpec.specification.industryId;
        }
        return skuData;
      });

      return { success: true, skus: processedSkus };
    } catch (error) {
      console.error("获取SKU列表失败:", error);
      return { success: false, error: "获取SKU列表失败" };
    }
  });

  // 分页获取SKU列表
  ipcMain.handle("sku:getSkusByPage", async (event, params) => {
    try {
      const { page = 1, pageSize = 10, styleCode = '', name = '', industryId } = params;

      // 构建查询条件
      const where = {};
      if (styleCode) {
        where.styleCode = {
          [Op.like]: `%${styleCode}%`
        };
      }
      if (name) {
        where.name = {
          [Op.like]: `%${name}%`
        };
      }

      // 如果选择了行业，获取该行业及其子行业的所有SKU
      let industryIds = [];
      if (industryId) {
        const getIndustryIds = async (rootId) => {
          const ids = [rootId];
          const children = await Industry.findAll({ where: { parentId: rootId } });
          for (const child of children) {
            const childIds = await getIndustryIds(child.id);
            ids.push(...childIds);
          }
          return ids;
        };
        industryIds = await getIndustryIds(industryId);
      }

      // 首先获取所有符合条件的SKU组合（按款号和名称分组）
      const allSkus = await Sku.findAll({
        where,
        include: [
          {
            model: SkuSpecification,
            as: 'specifications',
            required: true,
            include: [
              {
                model: Specification,
                as: 'specification',
                required: true,
                attributes: ['id', 'name', 'unit', 'presetValues', 'industryId'],
                ...(industryId && {
                  where: {
                    industryId: {
                      [Op.in]: industryIds
                    }
                  }
                }),
                include: [
                  {
                    model: Industry,
                    as: 'specIndustry',
                    attributes: ['id', 'name']
                  }
                ]
              }
            ]
          },
          {
            model: SkuStock,
            as: 'stock'
          }
        ],
        order: [["createdAt", "DESC"]]
      });

      // 处理数据，将行业信息添加到顶层
      const processedSkus = allSkus.map(sku => {
        const skuData = sku.toJSON();
        if (skuData.specifications && skuData.specifications.length > 0) {
          const firstSpec = skuData.specifications[0];
          skuData.industry = firstSpec.specification.specIndustry;
          skuData.industryId = firstSpec.specification.industryId;
        }
        return skuData;
      });

      // 按款号和名称分组
      const groups = new Map();
      processedSkus.forEach((sku) => {
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
        groups.get(key).children.push({
          ...sku,
          id: `${sku.id}-child`,
          isGroup: false,
          hasChildren: false,
        });
      });

      // 将分组转换为数组并按创建时间排序
      const groupedSkus = Array.from(groups.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // 计算总分组数
      const total = groupedSkus.length;

      // 对分组后的数据进行分页
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pagedSkus = groupedSkus.slice(start, end);

      // 对每个组内的组合按SKU编号排序
      pagedSkus.forEach(group => {
        group.children.sort((a, b) => {
          const numA = parseInt(a.code) || 0;
          const numB = parseInt(b.code) || 0;
          return numA - numB;
        });
      });

      return { 
        success: true, 
        skus: pagedSkus,
        total: total
      };
    } catch (error) {
      console.error("分页获取SKU列表失败:", error);
      return { success: false, error: "获取SKU列���失败" };
    }
  });

  // 创建SKU
  ipcMain.handle("sku:createSku", async (event, skuData) => {
    const t = await db.transaction();
    try {
      // 创建每个规格组合
      const createdSkus = await Promise.all(skuData.combinations.map(combination => 
        // 创建组SKU
        Sku.create({
          name: skuData.name,
          code: combination.code,
          styleCode: skuData.styleCode
        }, { transaction: t })
        .then(async (combinationSku) => {
          // 创建规格值
          await Promise.all(combination.specifications.map(spec => 
            SkuSpecification.create({
              skuId: combinationSku.id,
              specificationId: spec.specificationId,
              value: spec.value,
              unit: spec.unit
            }, { transaction: t })
          ));

          // 创建库存信息
          await SkuStock.create({
            skuId: combinationSku.id,
            suggestedPrice: combination.stock.suggestedPrice,
            discount: combination.stock.discount,
            price: combination.stock.price,
            additionalCost: combination.stock.additionalCost,
            totalCost: combination.stock.totalCost,
            quantity: combination.stock.quantity
          }, { transaction: t });

          return combinationSku;
        })
      ));

      await t.commit();

      // 获取完整的SKU信息
      const skus = await Sku.findAll({
        where: { name: skuData.name },
        include: [
          {
            model: SkuSpecification,
            as: 'specifications',
            include: [
              {
                model: Specification,
                as: 'specification',
                attributes: ['id', 'name', 'unit', 'industryId'],
                include: [
                  {
                    model: Industry,
                    as: 'specIndustry',
                    attributes: ['id', 'name']
                  }
                ]
              }
            ]
          },
          {
            model: SkuStock,
            as: 'stock',
            attributes: ['suggestedPrice', 'discount', 'price', 'additionalCost', 'totalCost', 'quantity']
          }
        ]
      });

      return { success: true, skus: skus.map(s => s.toJSON()) };
    } catch (error) {
      await t.rollback();
      console.error("创建SKU失败:", error);
      return { success: false, error: "创建SKU失败" };
    }
  });

  // 更新SKU
  ipcMain.handle("sku:updateSku", async (event, { skuIds, ...skuData }) => {
    const t = await db.transaction();
    try {
      // 获取要更新的SKU记录
      const skusToUpdate = await Sku.findAll({
        where: {
          id: {
            [Op.in]: skuIds
          }
        },
        transaction: t
      });

      if (skusToUpdate.length === 0) {
        await t.rollback();
        return { success: false, error: "SKU不存在" };
      }

      // 删除这些SKU的规格值和库存信息
      await SkuSpecification.destroy({
        where: {
          skuId: {
            [Op.in]: skuIds
          }
        },
        transaction: t
      });

      await SkuStock.destroy({
        where: {
          skuId: {
            [Op.in]: skuIds
          }
        },
        transaction: t
      });

      // 更新现有SKU的基本信息
      await Promise.all(skusToUpdate.map((sku, index) => 
        sku.update({
          name: skuData.name,
          code: skuData.combinations[index].code,
          styleCode: skuData.styleCode
        }, { transaction: t })
      ));

      // 创建新的SKU组合
      const newCombinations = skuData.combinations.slice(skusToUpdate.length);
      const newSkus = await Promise.all(newCombinations.map(combination => 
        Sku.create({
          name: skuData.name,
          code: combination.code,
          styleCode: skuData.styleCode
        }, { transaction: t })
      ));

      // 合并所有SKU记录（现有的和新创建的）
      const allSkus = [...skusToUpdate, ...newSkus];

      // 创建新的规格值和库存信息
      await Promise.all(skuData.combinations.map((combination, index) => 
        Promise.all([
          // 创建规格值
          ...combination.specifications.map(spec => 
            SkuSpecification.create({
              skuId: allSkus[index].id,
              specificationId: spec.specificationId,
              value: spec.value,
              unit: spec.unit
            }, { transaction: t })
          ),
          // 创建库存信息
          SkuStock.create({
            skuId: allSkus[index].id,
            suggestedPrice: combination.stock.suggestedPrice,
            discount: combination.stock.discount,
            price: combination.stock.price,
            additionalCost: combination.stock.additionalCost,
            totalCost: combination.stock.totalCost,
            quantity: combination.stock.quantity
          }, { transaction: t })
        ])
      ));

      await t.commit();

      // 获取更新后的完整SKU信息
      const updatedSkus = await Sku.findAll({
        where: {
          id: {
            [Op.in]: allSkus.map(sku => sku.id)
          }
        },
        include: [
          {
            model: SkuSpecification,
            as: 'specifications',
            include: [
              {
                model: Specification,
                as: 'specification',
                attributes: ['id', 'name', 'unit', 'industryId'],
                include: [
                  {
                    model: Industry,
                    as: 'specIndustry',
                    attributes: ['id', 'name']
                  }
                ]
              }
            ]
          },
          {
            model: SkuStock,
            as: 'stock',
            attributes: ['suggestedPrice', 'discount', 'price', 'additionalCost', 'totalCost', 'quantity']
          }
        ]
      });

      return { success: true, skus: updatedSkus.map(s => s.toJSON()) };
    } catch (error) {
      await t.rollback();
      console.error("更新SKU失败:", error);
      return { success: false, error: "更新SKU失败" };
    }
  });

  // 删除SKU
  ipcMain.handle("sku:deleteSku", async (event, { skuId }) => {
    const t = await db.transaction();
    try {
      // 获取要删除的 SKU 记录
      const sku = await Sku.findByPk(skuId, { transaction: t });
      if (!sku) {
        await t.rollback();
        return { success: false, error: "SKU不存在" };
      }

      // 删除 SKU 规格值
      await SkuSpecification.destroy({
        where: {
          skuId: sku.id
        },
        transaction: t
      });

      // 删除 SKU 库存
      await SkuStock.destroy({
        where: {
          skuId: sku.id
        },
        transaction: t
      });

      // 删除 SKU
      await sku.destroy({ transaction: t });

      await t.commit();
      return { success: true };
    } catch (error) {
      await t.rollback();
      console.error("删除SKU失败:", error);
      return { success: false, error: "删除SKU失败" };
    }
  });

  // 批量删除SKU
  ipcMain.handle('sku:deleteSkus', async (event, { skuIds }) => {
    const t = await db.transaction();
    try {
      console.log('开始删除SKU, 接收到的skuIds:', skuIds);

      // 处理传入的 skuIds,提取数字部分
      const numericSkuIds = skuIds.map(id => parseInt(id.split('-')[0]));
      console.log('处理后的numericSkuIds:', numericSkuIds);

      // 获取要删除的所有 SKU 记录
      const skusToDelete = await Sku.findAll({
        where: {
          id: {
            [Op.in]: numericSkuIds
          }
        },
        transaction: t
      });
      console.log('查找到的SKU记录:', skusToDelete.map(sku => sku.toJSON()));

      if (skusToDelete.length === 0) {
        console.log('未找到要删除的SKU记录');
        await t.rollback();
        return { success: false, error: 'SKU不存在' };
      }

      // 删除 SKU 规格值
      const specResult = await SkuSpecification.destroy({
        where: {
          skuId: {
            [Op.in]: numericSkuIds
          }
        },
        transaction: t
      });
      console.log('删除SKU规格值结果:', specResult);

      // 删除 SKU 库存
      const stockResult = await SkuStock.destroy({
        where: {
          skuId: {
            [Op.in]: numericSkuIds
          }
        },
        transaction: t
      });
      console.log('删除SKU库存结果:', stockResult);

      // 删除 SKU
      const skuResult = await Sku.destroy({
        where: {
          id: {
            [Op.in]: numericSkuIds
          }
        },
        transaction: t
      });
      console.log('删除SKU结果:', skuResult);

      await t.commit();
      console.log('删除SKU操作完成，事务已提交');
      return { success: true };
    } catch (error) {
      await t.rollback();
      console.error('删除SKU失败，详细错误:', error);
      console.error('错误堆栈:', error.stack);
      return { success: false, error: '删除SKU失败' };
    }
  });

  // 显示目录选择对话框
  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const win = BrowserWindow.getFocusedWindow();
    return dialog.showOpenDialog(win, {
      ...options,
      properties: options.properties || ['openDirectory'],
      title: '选择目标文件夹',
      buttonLabel: '选择文件夹'
    });
  });

  // 批量创建文件夹
  ipcMain.handle('folder:batchCreate', async (event, { targetPath, styleCodeList }) => {
    try {
      // 去重款号列表
      const uniqueStyleCodes = [...new Set(styleCodeList)];
      
      // 创建文件夹
      for (const styleCode of uniqueStyleCodes) {
        const folderPath = path.join(targetPath, styleCode);
        
        // 检查文件夹是否已存在
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('批量创建文件夹失败:', error);
      return { success: false, error: error.message };
    }
  });
}

ipcMain.on("switch-to-login-window", (event, shouldCenter = true) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.setSize(400, 520);
    if (shouldCenter) {
      win.center();
    }
  }
});

ipcMain.on("switch-to-main-window", (event, shouldCenter = true) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.setSize(1200, 800);
    if (shouldCenter) {
      win.center();
    }
  }
});

// 窗口控制事件理
ipcMain.on("window-minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.minimize();
  }
});

ipcMain.on("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.restore();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.close();
  }
});

app.whenReady().then(async () => {
  try {
    await initDatabase();
    registerIpcHandlers();
    const win = new BrowserWindow({
      width: 400,
      height: 520,
      frame: false,
      titleBarStyle: "hidden",
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // 根据环境加载不同URL
    if (process.env.NODE_ENV === "development") {
      // 开发环境：载开发服务器URL
      win.loadURL("http://localhost:5173/#/login");
      // 打开开发者工具
      win.webContents.openDevTools();
    } else {
      // 生产：加载打包后的文件
      win.loadFile("dist/index.html", { hash: "/login" });
    }

    // 监渲染进程准备就绪的事件
    ipcMain.handle("app:checkAuth", async () => {
      try {
        // 检查本地存储中是否在用户信息
        const userData = win.webContents.session.getStorageData;
        return { isAuthenticated: !!userData };
      } catch (error) {
        console.error("验证用户状态失败:", error);
        return { isAuthenticated: false };
      }
    });
  } catch (error) {
    console.error("应用程序初始化失败:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // Handle activating logic here, if needed
  }
});
