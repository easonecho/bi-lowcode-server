/**
 * ============================================================================
 * BI 低代码平台 - 数据库种子数据 (企业级重构)
 * ============================================================================
 * 创建测试数据: 部门、角色、用户(含多角色)、数据源、数据集、仪表板、图表、字典
 * 运行: npm run prisma:seed
 *
 * Prisma Client 委托名说明 (基于 prisma/schema.prisma 的 model 名驼峰→小写):
 *   model User       -> prisma.user
 *   model Role       -> prisma.role
 *   model Department -> prisma.department
 *   model UserRole   -> prisma.userRole
 *   model Datasource -> prisma.datasource   (注意: 小写 s, 不是 dataSource)
 *   model Dataset    -> prisma.dataset
 *   model Dashboard  -> prisma.dashboard
 *   model DashboardShare -> prisma.dashboardShare
 *   model Chart      -> prisma.chart
 *   model OperationLog -> prisma.operationLog
 *   model Dict       -> prisma.dict
 *   model DictItem   -> prisma.dictItem
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建种子数据...\n')

  // ===========================================================================
  // 1. 创建部门 (P1 新增)
  // ===========================================================================
  console.log('1. 创建部门...')
  const rootDept = await prisma.department.upsert({
    where: { id: 1 },
    update: { name: '总部', parentId: null, sort: 0, status: 1, tenantId: 1, code: 'HQ' },
    create: { name: '总部', parentId: null, sort: 0, status: 1, tenantId: 1, code: 'HQ' },
  })
  const techDept = await prisma.department.upsert({
    where: { id: 2 },
    update: { name: '技术部', parentId: 1, sort: 1, status: 1, tenantId: 1, code: 'TECH' },
    create: { name: '技术部', parentId: 1, sort: 1, status: 1, tenantId: 1, code: 'TECH' },
  })
  const bizDept = await prisma.department.upsert({
    where: { id: 3 },
    update: { name: '业务部', parentId: 1, sort: 2, status: 1, tenantId: 1, code: 'BIZ' },
    create: { name: '业务部', parentId: 1, sort: 2, status: 1, tenantId: 1, code: 'BIZ' },
  })
  console.log(`   - ${rootDept.name} / ${techDept.name} / ${bizDept.name}`)

  // ===========================================================================
  // 2. 创建角色
  // ===========================================================================
  console.log('\n2. 创建角色...')
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: { deleted: false, permissions: JSON.stringify(['*']), dsType: 'all' },
    create: {
      name: '系统管理员',
      code: 'ADMIN',
      description: '拥有系统全部权限',
      permissions: JSON.stringify(['*']),
      dsType: 'all',
      tenantId: 1,
    },
  })

  const defaultUserRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: {
      deleted: false,
      permissions: JSON.stringify([
        'dashboard:view',
        'dashboard:create',
        'dashboard:edit',
        'chart:view',
        'chart:create',
        'chart:edit',
        'dataset:view',
        'datasource:view',
      ]),
      dsType: 'oneself',
    },
    create: {
      name: '普通用户',
      code: 'USER',
      description: '只能查看和操作自己的资源',
      permissions: JSON.stringify([
        'dashboard:view',
        'dashboard:create',
        'dashboard:edit',
        'chart:view',
        'chart:create',
        'chart:edit',
        'dataset:view',
        'datasource:view',
      ]),
      dsType: 'oneself',
      tenantId: 1,
    },
  })

  const viewerRole = await prisma.role.upsert({
    where: { code: 'VIEWER' },
    update: { deleted: false, permissions: JSON.stringify(['dashboard:view']), dsType: 'all' },
    create: {
      name: '访客',
      code: 'VIEWER',
      description: '只能查看公开的仪表板',
      permissions: JSON.stringify(['dashboard:view']),
      dsType: 'all',
      tenantId: 1,
    },
  })

  console.log(
    `   - ${adminRole.name}(ADMIN) / ${defaultUserRole.name}(USER) / ${viewerRole.name}(VIEWER)`,
  )

  // ===========================================================================
  // 3. 创建用户 (含多角色关联 P0)
  // ===========================================================================
  console.log('\n3. 创建用户...')
  const adminPassword = await bcrypt.hash('admin123', 10)
  const userPassword = await bcrypt.hash('user123', 10)

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { deleted: false, deptId: techDept.id, tenantId: 1 },
    create: {
      username: 'admin',
      password: adminPassword,
      email: 'admin@bi-lowcode.com',
      nickname: '系统管理员',
      roleId: adminRole.id,
      deptId: techDept.id,
      tenantId: 1,
      createBy: 'system',
    },
  })

  const user = await prisma.user.upsert({
    where: { username: 'user' },
    update: { deleted: false, deptId: bizDept.id, tenantId: 1 },
    create: {
      username: 'user',
      password: userPassword,
      email: 'user@bi-lowcode.com',
      nickname: '测试用户',
      roleId: defaultUserRole.id,
      deptId: bizDept.id,
      tenantId: 1,
      createBy: 'system',
    },
  })

  // 创建用户-角色多对多关联 (P0: upsert 保证幂等)
  const userRolesToCreate = [
    { userId: admin.id, roleId: adminRole.id },
    { userId: admin.id, roleId: viewerRole.id },
    { userId: user.id, roleId: defaultUserRole.id },
  ]
  for (const ur of userRolesToCreate) {
    await prisma.userRole.upsert({
      where: { userId_roleId: ur },
      update: {},
      create: ur,
    })
  }

  console.log(`   - admin / admin123 (部门: ${techDept.name}, 角色: ADMIN+VIEWER)`)
  console.log(`   - user  / user123  (部门: ${bizDept.name}, 角色: USER)`)

  // ===========================================================================
  // 4. 创建数据源
  // ===========================================================================
  console.log('\n4. 创建数据源...')
  let ds = await prisma.datasource.findFirst({
    where: { creatorId: admin.id, name: '本地 MySQL 数据库', deleted: false },
  })
  if (!ds) {
    ds = await prisma.datasource.create({
      data: {
        name: '本地 MySQL 数据库',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'root123456',
        database: 'bi_lowcode',
        description: '本地开发环境 MySQL 数据库',
        status: 1,
        creatorId: admin.id,
        tenantId: 1,
        createBy: 'admin',
      },
    })
  }
  console.log(`   - ${ds.name} (ID: ${ds.id})`)

  // ===========================================================================
  // 5. 创建数据集
  // ===========================================================================
  console.log('\n5. 创建数据集...')

  async function ensureDataset(name: string, inputFactory: (datasourceId: number) => any) {
    let d = await prisma.dataset.findFirst({
      where: { creatorId: admin.id, name, deleted: false },
    })
    if (!d) {
      d = await prisma.dataset.create({ data: inputFactory(ds!.id) })
    }
    return d
  }

  const dataset1 = await ensureDataset('用户统计', (dsId: number) => ({
    name: '用户统计',
    description: '按角色统计用户数量',
    datasourceId: dsId,
    sql: 'SELECT r.name AS role_name, COUNT(u.id) AS user_count FROM roles r LEFT JOIN users u ON r.id = u.roleId WHERE u.del_flag = 0 GROUP BY r.id, r.name ORDER BY user_count DESC',
    fields: JSON.stringify([
      { name: 'role_name', type: 'string', label: '角色名称' },
      { name: 'user_count', type: 'number', label: '用户数量' },
    ]),
    cacheEnabled: true,
    cacheTtl: 300,
    creatorId: admin.id,
    tenantId: 1,
    createBy: 'admin',
  }))
  const dataset2 = await ensureDataset('数据源使用情况', (dsId: number) => ({
    name: '数据源使用情况',
    description: '统计每个数据源下的数据集数量',
    datasourceId: dsId,
    sql: 'SELECT ds.name AS datasource_name, COUNT(d.id) AS dataset_count FROM datasources ds LEFT JOIN datasets d ON ds.id = d.datasourceId WHERE ds.del_flag = 0 GROUP BY ds.id, ds.name ORDER BY dataset_count DESC',
    fields: JSON.stringify([
      { name: 'datasource_name', type: 'string', label: '数据源名称' },
      { name: 'dataset_count', type: 'number', label: '数据集数量' },
    ]),
    cacheEnabled: true,
    cacheTtl: 600,
    creatorId: admin.id,
    tenantId: 1,
    createBy: 'admin',
  }))
  const dataset3 = await ensureDataset('仪表板图表统计', (dsId: number) => ({
    name: '仪表板图表统计',
    description: '统计每个仪表板下的图表数量',
    datasourceId: dsId,
    sql: 'SELECT d.name AS dashboard_name, COUNT(c.id) AS chart_count FROM dashboards d LEFT JOIN charts c ON d.id = c.dashboardId WHERE d.del_flag = 0 GROUP BY d.id, d.name ORDER BY chart_count DESC',
    fields: JSON.stringify([
      { name: 'dashboard_name', type: 'string', label: '仪表板名称' },
      { name: 'chart_count', type: 'number', label: '图表数量' },
    ]),
    cacheEnabled: false,
    creatorId: admin.id,
    tenantId: 1,
    createBy: 'admin',
  }))
  console.log(`   - ${dataset1.name} / ${dataset2.name} / ${dataset3.name}`)

  // ===========================================================================
  // 6. 创建仪表板
  // ===========================================================================
  console.log('\n6. 创建仪表板...')

  async function ensureDashboard(name: string, input: any) {
    let d = await prisma.dashboard.findFirst({
      where: { creatorId: admin.id, name, deleted: false },
    })
    if (!d) {
      d = await prisma.dashboard.create({
        data: { ...input, creatorId: admin.id, createBy: 'admin' },
      })
    }
    return d
  }

  const dashboard1 = await ensureDashboard('系统概览', {
    name: '系统概览',
    description: '系统整体运行情况的概览仪表板',
    layout: JSON.stringify([
      { i: 'chart-1', x: 0, y: 0, w: 6, h: 8 },
      { i: 'chart-2', x: 6, y: 0, w: 6, h: 8 },
      { i: 'chart-3', x: 0, y: 8, w: 12, h: 8 },
    ]),
    status: 1,
    isPublic: true,
    tenantId: 1,
  })
  const dashboard2 = await ensureDashboard('数据分析', {
    name: '数据分析',
    description: '数据源和数据集分析仪表板',
    layout: JSON.stringify([{ i: 'chart-2', x: 0, y: 0, w: 12, h: 10 }]),
    status: 1,
    isPublic: false,
    tenantId: 1,
  })
  console.log(`   - ${dashboard1.name} (公开) / ${dashboard2.name} (私有)`)

  // ===========================================================================
  // 7. 创建图表 (P0: 含 creatorId)
  // ===========================================================================
  console.log('\n7. 创建图表...')

  async function ensureChart(name: string, dashboardId: number, input: any) {
    let c = await prisma.chart.findFirst({
      where: { creatorId: admin.id, name, dashboardId, deleted: false },
    })
    if (!c) {
      c = await prisma.chart.create({
        data: { ...input, creatorId: admin.id, createBy: 'admin' },
      })
    }
    return c
  }

  const chart1 = await ensureChart('用户角色分布', dashboard1.id, {
    name: '用户角色分布',
    type: 'pie',
    description: '各角色下的用户数量分布',
    config: JSON.stringify({
      title: { text: '用户角色分布', left: 'center' },
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' },
      series: [{ name: '用户数量', type: 'pie', radius: '60%', data: [] }],
    }),
    datasetId: dataset1.id,
    dashboardId: dashboard1.id,
    position: JSON.stringify({ x: 0, y: 0, w: 6, h: 8 }),
    tenantId: 1,
  })
  const chart2 = await ensureChart('数据源数据集统计', dashboard1.id, {
    name: '数据源数据集统计',
    type: 'bar',
    description: '各数据源下的数据集数量对比',
    config: JSON.stringify({
      title: { text: '数据源数据集统计' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'number' },
      series: [{ name: '数据集数量', type: 'bar', data: [] }],
    }),
    datasetId: dataset2.id,
    dashboardId: dashboard1.id,
    position: JSON.stringify({ x: 6, y: 0, w: 6, h: 8 }),
    tenantId: 1,
  })
  const chart3 = await ensureChart('仪表板图表数量', dashboard1.id, {
    name: '仪表板图表数量',
    type: 'bar',
    description: '各仪表板下的图表数量',
    config: JSON.stringify({
      title: { text: '仪表板图表数量' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'number' },
      series: [{ name: '图表数量', type: 'bar', data: [] }],
    }),
    datasetId: dataset3.id,
    dashboardId: dashboard1.id,
    position: JSON.stringify({ x: 0, y: 8, w: 12, h: 8 }),
    tenantId: 1,
  })
  console.log(`   - ${chart1.name}(pie) / ${chart2.name}(bar) / ${chart3.name}(bar)`)

  // ===========================================================================
  // 8. 创建仪表板分享 (P1 新增)
  // ===========================================================================
  console.log('\n8. 创建仪表板分享...')
  const shareCount = await prisma.dashboardShare.count({
    where: { dashboardId: dashboard2.id, roleId: viewerRole.id },
  })
  if (shareCount === 0) {
    await prisma.dashboardShare.create({
      data: { dashboardId: dashboard2.id, roleId: viewerRole.id, permission: 'view' },
    })
  }
  console.log(`   - 仪表板"${dashboard2.name}"分享给角色: ${viewerRole.name} (只读)`)

  // ===========================================================================
  // 9. 创建数据字典 (P1 新增)
  // ===========================================================================
  console.log('\n9. 创建数据字典...')

  async function ensureDict(type: string, name: string, description: string) {
    let d = await prisma.dict.findUnique({ where: { type } })
    if (!d) {
      d = await prisma.dict.create({
        data: { type, name, description, status: 1 },
      })
    }
    return d
  }

  const chartTypeDict = await ensureDict('chart_type', '图表类型', 'BI 编辑器支持的图表类型')
  const dsTypeDict = await ensureDict('datasource_type', '数据源类型', '支持的数据源类型')
  const dashboardStatusDict = await ensureDict('dashboard_status', '仪表板状态', '仪表板发布状态')

  async function upsertDictItem(dictId: number, label: string, value: string, sort: number) {
    const existing = await prisma.dictItem.findFirst({
      where: { dictId, label, value },
    })
    if (!existing) {
      await prisma.dictItem.create({
        data: { dictId, label, value, sort, status: 1 },
      })
    }
  }

  const chartTypes = [
    { label: '柱状图', value: 'bar', sort: 1 },
    { label: '折线图', value: 'line', sort: 2 },
    { label: '饼图', value: 'pie', sort: 3 },
    { label: '散点图', value: 'scatter', sort: 4 },
    { label: '表格', value: 'table', sort: 5 },
    { label: '仪表盘', value: 'gauge', sort: 6 },
    { label: '地图', value: 'map', sort: 7 },
    { label: '面积图', value: 'area', sort: 8 },
  ]
  for (const item of chartTypes) {
    await upsertDictItem(chartTypeDict.id, item.label, item.value, item.sort)
  }

  const dsTypes = [
    { label: 'MySQL', value: 'mysql', sort: 1 },
    { label: 'PostgreSQL', value: 'postgresql', sort: 2 },
    { label: 'MongoDB', value: 'mongodb', sort: 3 },
  ]
  for (const item of dsTypes) {
    await upsertDictItem(dsTypeDict.id, item.label, item.value, item.sort)
  }

  const dashStatuses = [
    { label: '草稿', value: '0', sort: 1 },
    { label: '已发布', value: '1', sort: 2 },
  ]
  for (const item of dashStatuses) {
    await upsertDictItem(dashboardStatusDict.id, item.label, item.value, item.sort)
  }
  console.log(
    `   - 图表类型(${chartTypes.length}项) / 数据源类型(${dsTypes.length}项) / 仪表板状态(${dashStatuses.length}项)`,
  )

  // ===========================================================================
  // 10. 初始化菜单与权限 (P0 新增)
  // ===========================================================================
  console.log('\n10. 初始化菜单与权限...')

  const menus = [
    {
      id: 1,
      name: '看板管理',
      parentId: 0,
      orderNum: 1,
      path: '/dashboard',
      component: 'dashboard/index',
      menuType: 'C',
      icon: 'DataBoard',
      perms: null,
    },
    {
      id: 3,
      name: '模板管理',
      parentId: 0,
      orderNum: 2,
      path: '/dashboard-templates',
      component: 'dashboard-templates/index',
      menuType: 'C',
      icon: 'Files',
      perms: null,
    },
    {
      id: 2,
      name: 'BI编辑器',
      parentId: 0,
      orderNum: 3,
      path: '/bi-editor',
      component: 'bi-editor/index',
      menuType: 'C',
      icon: 'Edit',
      perms: null,
    },
    {
      id: 101,
      name: '用户管理',
      parentId: 0,
      orderNum: 10,
      path: '/system/users',
      component: 'system/users',
      menuType: 'C',
      icon: 'User',
      perms: 'system:user:list',
    },
    {
      id: 1011,
      name: '用户查询',
      parentId: 101,
      orderNum: 1,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:user:query',
    },
    {
      id: 1012,
      name: '用户新增',
      parentId: 101,
      orderNum: 2,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:user:add',
    },
    {
      id: 1013,
      name: '用户修改',
      parentId: 101,
      orderNum: 3,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:user:edit',
    },
    {
      id: 1014,
      name: '用户删除',
      parentId: 101,
      orderNum: 4,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:user:remove',
    },
    {
      id: 102,
      name: '角色管理',
      parentId: 0,
      orderNum: 11,
      path: '/system/roles',
      component: 'system/roles',
      menuType: 'C',
      icon: 'UserFilled',
      perms: 'system:role:list',
    },
    {
      id: 1021,
      name: '角色查询',
      parentId: 102,
      orderNum: 1,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:role:query',
    },
    {
      id: 1022,
      name: '角色新增',
      parentId: 102,
      orderNum: 2,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:role:add',
    },
    {
      id: 1023,
      name: '角色修改',
      parentId: 102,
      orderNum: 3,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:role:edit',
    },
    {
      id: 1024,
      name: '角色删除',
      parentId: 102,
      orderNum: 4,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:role:remove',
    },
    {
      id: 1025,
      name: '分配菜单',
      parentId: 102,
      orderNum: 5,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:role:menu',
    },
    {
      id: 103,
      name: '菜单管理',
      parentId: 0,
      orderNum: 12,
      path: '/system/menus',
      component: 'system/menus',
      menuType: 'C',
      icon: 'Menu',
      perms: 'system:menu:list',
    },
    {
      id: 1031,
      name: '菜单查询',
      parentId: 103,
      orderNum: 1,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:menu:query',
    },
    {
      id: 1032,
      name: '菜单新增',
      parentId: 103,
      orderNum: 2,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:menu:add',
    },
    {
      id: 1033,
      name: '菜单修改',
      parentId: 103,
      orderNum: 3,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:menu:edit',
    },
    {
      id: 1034,
      name: '菜单删除',
      parentId: 103,
      orderNum: 4,
      path: null,
      component: null,
      menuType: 'F',
      icon: '#',
      perms: 'system:menu:remove',
    },
    {
      id: 104,
      name: '部门管理',
      parentId: 0,
      orderNum: 13,
      path: '/system/departments',
      component: 'system/departments',
      menuType: 'C',
      icon: 'OfficeBuilding',
      perms: 'system:dept:list',
    },
    {
      id: 105,
      name: '数据源管理',
      parentId: 0,
      orderNum: 14,
      path: '/system/datasources',
      component: 'system/datasources',
      menuType: 'C',
      icon: 'Coin',
      perms: 'system:datasource:list',
    },
    {
      id: 106,
      name: '数据集管理',
      parentId: 0,
      orderNum: 15,
      path: '/system/datasets',
      component: 'system/datasets',
      menuType: 'C',
      icon: 'Histogram',
      perms: 'system:dataset:list',
    },
    {
      id: 20,
      name: '数据大屏',
      parentId: 0,
      orderNum: 20,
      path: '/screen',
      component: 'screen/index',
      menuType: 'C',
      icon: 'Monitor',
      perms: 'screen:view',
    },
  ]

  for (const m of menus) {
    await prisma.menu.upsert({
      where: { id: m.id },
      update: {
        name: m.name,
        parentId: m.parentId,
        orderNum: m.orderNum,
        path: m.path,
        component: m.component,
        menuType: m.menuType,
        icon: m.icon,
        perms: m.perms,
        visible: true,
        isCache: true,
        query: null,
        isFrame: false,
        status: 1,
        tenantId: 1,
      },
      create: {
        id: m.id,
        name: m.name,
        parentId: m.parentId,
        orderNum: m.orderNum,
        path: m.path,
        component: m.component,
        menuType: m.menuType,
        icon: m.icon,
        perms: m.perms,
        tenantId: 1,
        createBy: 'system',
      },
    })
  }

  // 软删除旧的「系统管理」一级目录 (id=10)，其子菜单已提升为顶级
  await prisma.menu.updateMany({
    where: { id: 10, deleted: false },
    data: { deleted: true },
  })

  console.log(
    `   - 菜单 ${menus.length} 条 (含 ${menus.filter((m) => m.menuType === 'F').length} 个按钮权限)`,
  )

  // 角色菜单分配
  const adminMenuIds = menus.map((m) => m.id)
  const userMenuIds = menus
    .filter((m) => m.menuType !== 'F' && [1, 2, 3, 105, 106, 20].includes(m.id))
    .map((m) => m.id)
  const viewerMenuIds = menus
    .filter((m) => m.menuType !== 'F' && [1, 3, 20].includes(m.id))
    .map((m) => m.id)

  async function assignRoleMenus(roleId: number, ids: number[]) {
    await prisma.roleMenu.deleteMany({ where: { roleId } })
    if (ids.length > 0) {
      await prisma.roleMenu.createMany({
        data: ids.map((menuId) => ({ roleId, menuId })),
        skipDuplicates: true,
      })
    }
  }
  await assignRoleMenus(adminRole.id, adminMenuIds)
  await assignRoleMenus(defaultUserRole.id, userMenuIds)
  await assignRoleMenus(viewerRole.id, viewerMenuIds)
  console.log(
    `   - 角色菜单分配: ADMIN(${adminMenuIds.length}) / USER(${userMenuIds.length}) / VIEWER(${viewerMenuIds.length})`,
  )

  // ===========================================================================
  // 11. 创建仪表板模板 (预置模板 + 用户模板)
  // ===========================================================================
  console.log('\n11. 创建仪表板模板...')

  // 通用画布配置
  const tplCanvas = {
    width: 1920,
    height: 1080,
    zoom: 1,
    backgroundColor: '#ffffff',
    backgroundImage: '',
    showGrid: false,
    gridSize: 10,
    snapToGrid: false,
    showRuler: true,
    showGuides: true,
    scrollX: 0,
    scrollY: 0,
  }

  // 预置模板布局: 销售数据看板
  const salesLayout = {
    version: '1.0',
    canvas: { ...tplCanvas },
    guides: [],
    components: [
      {
        id: 't1',
        type: 'text',
        x: 0,
        y: 0,
        width: 1920,
        height: 80,
        props: { content: '销售数据看板', fontSize: 32, align: 'center' },
        style: { backgroundColor: '#1f6feb', color: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'k1',
        type: 'indicator',
        x: 40,
        y: 100,
        width: 440,
        height: 140,
        props: { title: '总销售额', value: '¥1,234,567', unit: '', trend: 12.5 },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'k2',
        type: 'indicator',
        x: 500,
        y: 100,
        width: 440,
        height: 140,
        props: { title: '订单数', value: '8,654', unit: '单', trend: 8.3 },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'k3',
        type: 'indicator',
        x: 960,
        y: 100,
        width: 440,
        height: 140,
        props: { title: '客单价', value: '¥142.7', unit: '', trend: -2.1 },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'k4',
        type: 'indicator',
        x: 1420,
        y: 100,
        width: 440,
        height: 140,
        props: { title: '新增客户', value: '328', unit: '人', trend: 15.6 },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'c1',
        type: 'line-chart',
        x: 40,
        y: 260,
        width: 900,
        height: 360,
        props: { title: '销售趋势', smooth: true },
        dataConfig: {
          categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
          series: [{ name: '销售额', data: [120, 132, 101, 134, 90, 230] }],
        },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'c2',
        type: 'pie-chart',
        x: 960,
        y: 260,
        width: 900,
        height: 360,
        props: { title: '品类占比' },
        dataConfig: {
          categories: ['数码', '服饰', '家居', '食品', '其他'],
          series: [
            {
              name: '占比',
              data: [
                { value: 1048, name: '数码' },
                { value: 735, name: '服饰' },
                { value: 580, name: '家居' },
                { value: 484, name: '食品' },
                { value: 300, name: '其他' },
              ],
            },
          ],
        },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'c3',
        type: 'bar-chart',
        x: 40,
        y: 640,
        width: 1820,
        height: 400,
        props: { title: '区域销售对比' },
        dataConfig: {
          categories: ['华东', '华南', '华北', '西南', '西北', '东北'],
          series: [{ name: '销售额', data: [320, 302, 301, 234, 190, 250] }],
        },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
    ],
  }

  // 预置模板布局: 运营监控看板
  const opsLayout = {
    version: '1.0',
    canvas: { ...tplCanvas, backgroundColor: '#0d1117' },
    guides: [],
    components: [
      {
        id: 't1',
        type: 'text',
        x: 0,
        y: 0,
        width: 1920,
        height: 80,
        props: { content: '运营监控看板', fontSize: 32, align: 'center' },
        style: { backgroundColor: '#161b22', color: '#58a6ff', borderRadius: 8 },
      },
      {
        id: 'g1',
        type: 'gauge',
        x: 40,
        y: 100,
        width: 600,
        height: 360,
        props: { title: 'CPU 使用率', value: 68, max: 100 },
        style: { backgroundColor: '#161b22', borderRadius: 8 },
      },
      {
        id: 'g2',
        type: 'gauge',
        x: 660,
        y: 100,
        width: 600,
        height: 360,
        props: { title: '内存使用率', value: 76, max: 100 },
        style: { backgroundColor: '#161b22', borderRadius: 8 },
      },
      {
        id: 'g3',
        type: 'gauge',
        x: 1280,
        y: 100,
        width: 600,
        height: 360,
        props: { title: '磁盘使用率', value: 45, max: 100 },
        style: { backgroundColor: '#161b22', borderRadius: 8 },
      },
      {
        id: 'k1',
        type: 'indicator',
        x: 40,
        y: 480,
        width: 440,
        height: 120,
        props: { title: '在线用户', value: '1,256', unit: '人', trend: 5.2 },
        style: { backgroundColor: '#161b22', color: '#58a6ff', borderRadius: 8 },
      },
      {
        id: 'k2',
        type: 'indicator',
        x: 500,
        y: 480,
        width: 440,
        height: 120,
        props: { title: 'QPS', value: '8,432', unit: '', trend: 12.8 },
        style: { backgroundColor: '#161b22', color: '#58a6ff', borderRadius: 8 },
      },
      {
        id: 'k3',
        type: 'indicator',
        x: 960,
        y: 480,
        width: 440,
        height: 120,
        props: { title: '响应时间', value: '128', unit: 'ms', trend: -8.4 },
        style: { backgroundColor: '#161b22', color: '#58a6ff', borderRadius: 8 },
      },
      {
        id: 'k4',
        type: 'indicator',
        x: 1420,
        y: 480,
        width: 440,
        height: 120,
        props: { title: '错误率', value: '0.12', unit: '%', trend: -0.05 },
        style: { backgroundColor: '#161b22', color: '#58a6ff', borderRadius: 8 },
      },
      {
        id: 'c1',
        type: 'line-chart',
        x: 40,
        y: 620,
        width: 1820,
        height: 420,
        props: { title: '24h 系统指标趋势', smooth: true, area: true },
        dataConfig: {
          categories: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
          series: [
            { name: 'CPU', data: [45, 38, 42, 68, 72, 75, 68, 55] },
            { name: '内存', data: [62, 60, 65, 76, 78, 80, 76, 70] },
          ],
        },
        style: { backgroundColor: '#161b22', borderRadius: 8 },
      },
    ],
  }

  // 预置模板布局: 用户分析看板
  const userAnalysisLayout = {
    version: '1.0',
    canvas: { ...tplCanvas },
    guides: [],
    components: [
      {
        id: 't1',
        type: 'text',
        x: 0,
        y: 0,
        width: 1920,
        height: 80,
        props: { content: '用户分析看板', fontSize: 32, align: 'center' },
        style: { backgroundColor: '#6f42c1', color: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'k1',
        type: 'indicator',
        x: 40,
        y: 100,
        width: 440,
        height: 140,
        props: { title: '活跃用户', value: '24,532', unit: '', trend: 6.8 },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'k2',
        type: 'indicator',
        x: 500,
        y: 100,
        width: 440,
        height: 140,
        props: { title: '新增用户', value: '1,254', unit: '', trend: 14.2 },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'k3',
        type: 'indicator',
        x: 960,
        y: 100,
        width: 440,
        height: 140,
        props: { title: '留存率', value: '68.5', unit: '%', trend: 2.3 },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'k4',
        type: 'indicator',
        x: 1420,
        y: 100,
        width: 440,
        height: 140,
        props: { title: '转化率', value: '4.8', unit: '%', trend: 0.6 },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'c1',
        type: 'line-chart',
        x: 40,
        y: 260,
        width: 900,
        height: 360,
        props: { title: '用户增长趋势', smooth: true },
        dataConfig: {
          categories: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月'],
          series: [
            { name: '总用户', data: [12000, 13500, 14800, 16200, 18500, 21300, 24500, 26800] },
            { name: '新增', data: [800, 1500, 1300, 1400, 2300, 3200, 3200, 2300] },
          ],
        },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'c2',
        type: 'pie-chart',
        x: 960,
        y: 260,
        width: 900,
        height: 360,
        props: { title: '用户渠道分布' },
        dataConfig: {
          series: [
            {
              name: '渠道',
              data: [
                { value: 5800, name: '搜索引擎' },
                { value: 4200, name: '社交媒体' },
                { value: 3100, name: '直接访问' },
                { value: 1800, name: '邮件' },
                { value: 2400, name: '其他' },
              ],
            },
          ],
        },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
      {
        id: 'c3',
        type: 'table',
        x: 40,
        y: 640,
        width: 1820,
        height: 400,
        props: { title: '用户明细' },
        dataConfig: {
          columns: [
            { key: 'name', label: '用户名' },
            { key: 'channel', label: '渠道' },
            { key: 'registerTime', label: '注册时间' },
            { key: 'lastLogin', label: '最近登录' },
          ],
          rows: [
            {
              name: 'alice',
              channel: '搜索引擎',
              registerTime: '2025-01-12',
              lastLogin: '2025-08-21',
            },
            {
              name: 'bob',
              channel: '社交媒体',
              registerTime: '2025-03-08',
              lastLogin: '2025-08-22',
            },
          ],
        },
        style: { backgroundColor: '#ffffff', borderRadius: 8 },
      },
    ],
  }

  // 预置模板布局: 空白看板
  const blankLayout = {
    version: '1.0',
    canvas: { ...tplCanvas },
    guides: [],
    components: [],
  }

  // 用户模板布局: 销售周报
  const weeklySalesLayout = {
    version: '1.0',
    canvas: { ...tplCanvas, width: 1280, height: 720 },
    guides: [],
    components: [
      {
        id: 't1',
        type: 'text',
        x: 0,
        y: 0,
        width: 1280,
        height: 60,
        props: { content: '本周销售周报', fontSize: 24, align: 'left' },
        style: { backgroundColor: '#ffffff' },
      },
      {
        id: 'c1',
        type: 'bar-chart',
        x: 0,
        y: 80,
        width: 620,
        height: 300,
        props: { title: '本周每日销售额' },
        dataConfig: {
          categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
          series: [{ name: '销售额', data: [8200, 9320, 9010, 9340, 12900, 13300, 11200] }],
        },
      },
      {
        id: 'c2',
        type: 'table',
        x: 640,
        y: 80,
        width: 640,
        height: 300,
        props: { title: '本周订单明细' },
        dataConfig: {
          columns: [
            { key: 'orderId', label: '订单号' },
            { key: 'amount', label: '金额' },
            { key: 'status', label: '状态' },
          ],
        },
      },
      {
        id: 'k1',
        type: 'indicator',
        x: 0,
        y: 400,
        width: 400,
        height: 120,
        props: { title: '本周总额', value: '¥63,310' },
      },
      {
        id: 'k2',
        type: 'indicator',
        x: 420,
        y: 400,
        width: 400,
        height: 120,
        props: { title: '订单总数', value: '284 单' },
      },
      {
        id: 'k3',
        type: 'indicator',
        x: 840,
        y: 400,
        width: 400,
        height: 120,
        props: { title: '环比', value: '+8.3%' },
      },
    ],
  }

  // 用户模板布局: 系统概览模板
  const sysOverviewLayout = {
    version: '1.0',
    canvas: { ...tplCanvas, width: 1280, height: 800 },
    guides: [],
    components: [
      {
        id: 't1',
        type: 'text',
        x: 0,
        y: 0,
        width: 1280,
        height: 60,
        props: { content: '系统概览', fontSize: 24, align: 'left' },
      },
      {
        id: 'c1',
        type: 'pie-chart',
        x: 0,
        y: 80,
        width: 620,
        height: 360,
        props: { title: '用户角色分布' },
        dataConfig: {
          series: [
            {
              name: '用户数',
              data: [
                { value: 1, name: '管理员' },
                { value: 1, name: '普通用户' },
                { value: 1, name: '访客' },
              ],
            },
          ],
        },
      },
      {
        id: 'c2',
        type: 'bar-chart',
        x: 640,
        y: 80,
        width: 640,
        height: 360,
        props: { title: '数据源数据集统计' },
        dataConfig: { categories: ['本地 MySQL'], series: [{ name: '数据集数', data: [3] }] },
      },
      {
        id: 'k1',
        type: 'indicator',
        x: 0,
        y: 460,
        width: 410,
        height: 140,
        props: { title: '用户总数', value: '3' },
      },
      {
        id: 'k2',
        type: 'indicator',
        x: 430,
        y: 460,
        width: 410,
        height: 140,
        props: { title: '数据源总数', value: '1' },
      },
      {
        id: 'k3',
        type: 'indicator',
        x: 860,
        y: 460,
        width: 420,
        height: 140,
        props: { title: '仪表板总数', value: '2' },
      },
    ],
  }

  // 用户模板布局: 财务月报
  const financeMonthlyLayout = {
    version: '1.0',
    canvas: { ...tplCanvas, width: 1280, height: 900 },
    guides: [],
    components: [
      {
        id: 't1',
        type: 'text',
        x: 0,
        y: 0,
        width: 1280,
        height: 60,
        props: { content: '2025 年 8 月财务月报', fontSize: 24, align: 'left' },
      },
      {
        id: 'k1',
        type: 'indicator',
        x: 0,
        y: 80,
        width: 410,
        height: 140,
        props: { title: '本月营收', value: '¥568,200', trend: 8.5 },
      },
      {
        id: 'k2',
        type: 'indicator',
        x: 430,
        y: 80,
        width: 410,
        height: 140,
        props: { title: '本月支出', value: '¥342,500', trend: 3.2 },
      },
      {
        id: 'k3',
        type: 'indicator',
        x: 860,
        y: 80,
        width: 420,
        height: 140,
        props: { title: '净利润', value: '¥225,700', trend: 18.4 },
      },
      {
        id: 'c1',
        type: 'line-chart',
        x: 0,
        y: 240,
        width: 1280,
        height: 360,
        props: { title: '营收/支出趋势', smooth: true, area: true },
        dataConfig: {
          categories: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月'],
          series: [
            {
              name: '营收',
              data: [420000, 435000, 450000, 468000, 482000, 495000, 528000, 568200],
            },
            {
              name: '支出',
              data: [280000, 295000, 310000, 318000, 325000, 332000, 338000, 342500],
            },
          ],
        },
      },
      {
        id: 'c2',
        type: 'pie-chart',
        x: 0,
        y: 620,
        width: 620,
        height: 260,
        props: { title: '支出结构' },
        dataConfig: {
          series: [
            {
              name: '支出',
              data: [
                { value: 142000, name: '人力成本' },
                { value: 86000, name: '运营成本' },
                { value: 64500, name: '营销推广' },
                { value: 50000, name: '其他' },
              ],
            },
          ],
        },
      },
      {
        id: 'c3',
        type: 'table',
        x: 640,
        y: 620,
        width: 640,
        height: 260,
        props: { title: '本月主要支出项' },
        dataConfig: {
          columns: [
            { key: 'item', label: '支出项' },
            { key: 'amount', label: '金额' },
            { key: 'ratio', label: '占比' },
          ],
          rows: [
            { item: '人力成本', amount: '¥142,000', ratio: '41.5%' },
            { item: '运营成本', amount: '¥86,000', ratio: '25.1%' },
          ],
        },
      },
    ],
  }

  // 预置模板定义
  /**
   * 鐢熸垚 SVG 缂╃暐鍥?Data URL (鐢ㄤ簬妯℃澘鍒楄〃棰勮, 閬垮厤瀛樺偍 emoji 鏂囨湰)
   */
  function svgThumb(bg: string, fg: string, title: string, subtitle: string): string {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'><rect width='320' height='180' fill='${bg}'/><text x='160' y='78' font-size='52' font-weight='700' fill='${fg}' text-anchor='middle' font-family='sans-serif'>${title}</text><text x='160' y='150' font-size='14' fill='${fg}' text-anchor='middle' font-family='sans-serif' opacity='0.75'>${subtitle}</text></svg>`
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  }

  // 预置模板定义
  const presetTemplates = [
    {
      name: '销售数据看板',
      description: '含指标卡、趋势图、占比图、明细表的销售分析模板',
      category: 'business',
      thumbnail: svgThumb('#1f6feb', '#ffffff', '销售', '销售数据看板'),
      isPublic: true,
      isSystem: true,
      layout: salesLayout,
    },
    {
      name: '运营监控看板',
      description: '含仪表盘、实时指标、趋势图的运维监控模板',
      category: 'operations',
      thumbnail: svgThumb('#0d1117', '#58a6ff', '运营', '运营监控看板'),
      isPublic: true,
      isSystem: true,
      layout: opsLayout,
    },
    {
      name: '用户分析看板',
      description: '用户增长、留存、渠道分布、用户明细分析模板',
      category: 'business',
      thumbnail: svgThumb('#6f42c1', '#ffffff', '用户', '用户分析看板'),
      isPublic: true,
      isSystem: true,
      layout: userAnalysisLayout,
    },
    {
      name: '空白看板',
      description: '从零开始，自由搭建',
      category: 'basic',
      thumbnail: svgThumb('#f6f8fa', '#57606a', '空白', '从零开始'),
      isPublic: true,
      isSystem: true,
      layout: blankLayout,
    },
  ]

  // 用户模板定义
  const userTemplates = [
    {
      name: '销售周报模板',
      description: '适用于每周销售数据回顾, 含 KPI/柱状图/明细表',
      category: 'report',
      thumbnail: svgThumb('#2da44e', '#ffffff', '周报', '销售周报模板'),
      isPublic: true,
      isSystem: false,
      layout: weeklySalesLayout,
    },
    {
      name: '系统概览模板',
      description: '系统用户/数据源/仪表板统计概览',
      category: 'system',
      thumbnail: svgThumb('#0969da', '#ffffff', '系统', '系统概览模板'),
      isPublic: true,
      isSystem: false,
      layout: sysOverviewLayout,
    },
    {
      name: '财务月报模板',
      description: '营收/支出/净利润分析, 含趋势图与饼图',
      category: 'finance',
      thumbnail: svgThumb('#d4a017', '#ffffff', '财务', '财务月报模板'),
      isPublic: false,
      isSystem: false,
      layout: financeMonthlyLayout,
    },
  ]

  async function ensureTemplate(name: string, def: any, creatorId: number, tenantId: number) {
    let t = await prisma.dashboardTemplate.findFirst({
      where: { name, deleted: false, tenantId },
    })
    if (!t) {
      t = await prisma.dashboardTemplate.create({
        data: {
          name: def.name,
          description: def.description,
          layout: def.layout,
          thumbnail: def.thumbnail,
          category: def.category,
          isPublic: def.isPublic,
          isSystem: def.isSystem,
          creatorId,
          createBy: 'system',
          tenantId,
        } as any,
      })
    } else {
      // 已存在则更新 (保证幂等且能更新内容)
      t = await prisma.dashboardTemplate.update({
        where: { id: t.id },
        data: {
          description: def.description,
          layout: def.layout,
          thumbnail: def.thumbnail,
          category: def.category,
          isPublic: def.isPublic,
          isSystem: def.isSystem,
          updateBy: 'system',
        } as any,
      })
    }
    return t
  }

  const tenantId = 1
  let presetCount = 0
  let userCount = 0
  for (const def of presetTemplates) {
    await ensureTemplate(def.name, def, admin.id, tenantId)
    presetCount++
  }
  for (const def of userTemplates) {
    await ensureTemplate(def.name, def, admin.id, tenantId)
    userCount++
  }
  console.log(`   - 预置模板 ${presetCount} 个 / 用户模板 ${userCount} 个`)

  // ===========================================================================
  // 完成
  // ===========================================================================
  console.log('\n========================================')
  console.log('  种子数据创建完成!')
  console.log('========================================')
  console.log('  测试账号:')
  console.log('    管理员: admin / admin123 (ADMIN+VIEWER)')
  console.log('    普通用户: user / user123 (USER)')
  console.log('========================================\n')
}

main()
  .catch((e: any) => {
    console.error('种子数据创建失败:', e && e.stack ? e.stack : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
