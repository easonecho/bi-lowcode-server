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

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建种子数据...\n');

  // ===========================================================================
  // 1. 创建部门 (P1 新增)
  // ===========================================================================
  console.log('1. 创建部门...');
  const rootDept = await prisma.department.upsert({
    where: { id: 1 },
    update: { name: '总部', parentId: null, sort: 0, status: 1, tenantId: 1, code: 'HQ' },
    create: { name: '总部', parentId: null, sort: 0, status: 1, tenantId: 1, code: 'HQ' },
  });
  const techDept = await prisma.department.upsert({
    where: { id: 2 },
    update: { name: '技术部', parentId: 1, sort: 1, status: 1, tenantId: 1, code: 'TECH' },
    create: { name: '技术部', parentId: 1, sort: 1, status: 1, tenantId: 1, code: 'TECH' },
  });
  const bizDept = await prisma.department.upsert({
    where: { id: 3 },
    update: { name: '业务部', parentId: 1, sort: 2, status: 1, tenantId: 1, code: 'BIZ' },
    create: { name: '业务部', parentId: 1, sort: 2, status: 1, tenantId: 1, code: 'BIZ' },
  });
  console.log(`   - ${rootDept.name} / ${techDept.name} / ${bizDept.name}`);

  // ===========================================================================
  // 2. 创建角色
  // ===========================================================================
  console.log('\n2. 创建角色...');
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: { deleted: false },
    create: {
      name: '系统管理员',
      code: 'ADMIN',
      description: '拥有系统全部权限',
      permissions: JSON.stringify(['*']),
      dsType: 'all',
      tenantId: 1,
    },
  });

  const defaultUserRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: { deleted: false },
    create: {
      name: '普通用户',
      code: 'USER',
      description: '只能查看和操作自己的资源',
      permissions: JSON.stringify([
        'dashboard:view', 'dashboard:create', 'dashboard:edit',
        'chart:view', 'chart:create', 'chart:edit',
        'dataset:view', 'datasource:view',
      ]),
      dsType: 'oneself',
      tenantId: 1,
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { code: 'VIEWER' },
    update: { deleted: false },
    create: {
      name: '访客',
      code: 'VIEWER',
      description: '只能查看公开的仪表板',
      permissions: JSON.stringify(['dashboard:view']),
      dsType: 'all',
      tenantId: 1,
    },
  });

  console.log(`   - ${adminRole.name}(ADMIN) / ${defaultUserRole.name}(USER) / ${viewerRole.name}(VIEWER)`);

  // ===========================================================================
  // 3. 创建用户 (含多角色关联 P0)
  // ===========================================================================
  console.log('\n3. 创建用户...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

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
  });

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
  });

  // 创建用户-角色多对多关联 (P0: upsert 保证幂等)
  const userRolesToCreate = [
    { userId: admin.id, roleId: adminRole.id },
    { userId: admin.id, roleId: viewerRole.id },
    { userId: user.id, roleId: defaultUserRole.id },
  ];
  for (const ur of userRolesToCreate) {
    await prisma.userRole.upsert({
      where: { userId_roleId: ur },
      update: {},
      create: ur,
    });
  }

  console.log(`   - admin / admin123 (部门: ${techDept.name}, 角色: ADMIN+VIEWER)`);
  console.log(`   - user  / user123  (部门: ${bizDept.name}, 角色: USER)`);

  // ===========================================================================
  // 4. 创建数据源
  // ===========================================================================
  console.log('\n4. 创建数据源...');
  let ds = await prisma.datasource.findFirst({
    where: { creatorId: admin.id, name: '本地 MySQL 数据库', deleted: false },
  });
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
    });
  }
  console.log(`   - ${ds.name} (ID: ${ds.id})`);

  // ===========================================================================
  // 5. 创建数据集
  // ===========================================================================
  console.log('\n5. 创建数据集...');

  async function ensureDataset(name: string, inputFactory: (datasourceId: number) => any) {
    let d = await prisma.dataset.findFirst({
      where: { creatorId: admin.id, name, deleted: false },
    });
    if (!d) {
      d = await prisma.dataset.create({ data: inputFactory(ds!.id) });
    }
    return d;
  }

  const dataset1 = await ensureDataset('用户统计', (dsId: number) => ({
    name: '用户统计',
    description: '按角色统计用户数量',
    datasourceId: dsId,
    sql: "SELECT r.name AS role_name, COUNT(u.id) AS user_count FROM roles r LEFT JOIN users u ON r.id = u.role_id WHERE u.del_flag = 0 GROUP BY r.id, r.name ORDER BY user_count DESC",
    fields: JSON.stringify([
      { name: 'role_name', type: 'string', label: '角色名称' },
      { name: 'user_count', type: 'number', label: '用户数量' },
    ]),
    cacheEnabled: true,
    cacheTtl: 300,
    creatorId: admin.id,
    tenantId: 1,
    createBy: 'admin',
  }));
  const dataset2 = await ensureDataset('数据源使用情况', (dsId: number) => ({
    name: '数据源使用情况',
    description: '统计每个数据源下的数据集数量',
    datasourceId: dsId,
    sql: "SELECT ds.name AS datasource_name, COUNT(d.id) AS dataset_count FROM datasources ds LEFT JOIN datasets d ON ds.id = d.datasource_id WHERE ds.del_flag = 0 GROUP BY ds.id, ds.name ORDER BY dataset_count DESC",
    fields: JSON.stringify([
      { name: 'datasource_name', type: 'string', label: '数据源名称' },
      { name: 'dataset_count', type: 'number', label: '数据集数量' },
    ]),
    cacheEnabled: true,
    cacheTtl: 600,
    creatorId: admin.id,
    tenantId: 1,
    createBy: 'admin',
  }));
  const dataset3 = await ensureDataset('仪表板图表统计', (dsId: number) => ({
    name: '仪表板图表统计',
    description: '统计每个仪表板下的图表数量',
    datasourceId: dsId,
    sql: "SELECT d.name AS dashboard_name, COUNT(c.id) AS chart_count FROM dashboards d LEFT JOIN charts c ON d.id = c.dashboard_id WHERE d.del_flag = 0 GROUP BY d.id, d.name ORDER BY chart_count DESC",
    fields: JSON.stringify([
      { name: 'dashboard_name', type: 'string', label: '仪表板名称' },
      { name: 'chart_count', type: 'number', label: '图表数量' },
    ]),
    cacheEnabled: false,
    creatorId: admin.id,
    tenantId: 1,
    createBy: 'admin',
  }));
  console.log(`   - ${dataset1.name} / ${dataset2.name} / ${dataset3.name}`);

  // ===========================================================================
  // 6. 创建仪表板
  // ===========================================================================
  console.log('\n6. 创建仪表板...');

  async function ensureDashboard(name: string, input: any) {
    let d = await prisma.dashboard.findFirst({
      where: { creatorId: admin.id, name, deleted: false },
    });
    if (!d) {
      d = await prisma.dashboard.create({ data: { ...input, creatorId: admin.id, createBy: 'admin' } });
    }
    return d;
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
  });
  const dashboard2 = await ensureDashboard('数据分析', {
    name: '数据分析',
    description: '数据源和数据集分析仪表板',
    layout: JSON.stringify([{ i: 'chart-2', x: 0, y: 0, w: 12, h: 10 }]),
    status: 1,
    isPublic: false,
    tenantId: 1,
  });
  console.log(`   - ${dashboard1.name} (公开) / ${dashboard2.name} (私有)`);

  // ===========================================================================
  // 7. 创建图表 (P0: 含 creatorId)
  // ===========================================================================
  console.log('\n7. 创建图表...');

  async function ensureChart(name: string, dashboardId: number, input: any) {
    let c = await prisma.chart.findFirst({
      where: { creatorId: admin.id, name, dashboardId, deleted: false },
    });
    if (!c) {
      c = await prisma.chart.create({
        data: { ...input, creatorId: admin.id, createBy: 'admin' },
      });
    }
    return c;
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
  });
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
  });
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
  });
  console.log(`   - ${chart1.name}(pie) / ${chart2.name}(bar) / ${chart3.name}(bar)`);

  // ===========================================================================
  // 8. 创建仪表板分享 (P1 新增)
  // ===========================================================================
  console.log('\n8. 创建仪表板分享...');
  const shareCount = await prisma.dashboardShare.count({
    where: { dashboardId: dashboard2.id, roleId: viewerRole.id },
  });
  if (shareCount === 0) {
    await prisma.dashboardShare.create({
      data: { dashboardId: dashboard2.id, roleId: viewerRole.id, permission: 'view' },
    });
  }
  console.log(`   - 仪表板"${dashboard2.name}"分享给角色: ${viewerRole.name} (只读)`);

  // ===========================================================================
  // 9. 创建数据字典 (P1 新增)
  // ===========================================================================
  console.log('\n9. 创建数据字典...');

  async function ensureDict(type: string, name: string, description: string) {
    let d = await prisma.dict.findUnique({ where: { type } });
    if (!d) {
      d = await prisma.dict.create({
        data: { type, name, description, status: 1 },
      });
    }
    return d;
  }

  const chartTypeDict = await ensureDict('chart_type', '图表类型', 'BI 编辑器支持的图表类型');
  const dsTypeDict = await ensureDict('datasource_type', '数据源类型', '支持的数据源类型');
  const dashboardStatusDict = await ensureDict('dashboard_status', '仪表板状态', '仪表板发布状态');

  async function upsertDictItem(dictId: number, label: string, value: string, sort: number) {
    const existing = await prisma.dictItem.findFirst({
      where: { dictId, label, value },
    });
    if (!existing) {
      await prisma.dictItem.create({
        data: { dictId, label, value, sort, status: 1 },
      });
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
  ];
  for (const item of chartTypes) {
    await upsertDictItem(chartTypeDict.id, item.label, item.value, item.sort);
  }

  const dsTypes = [
    { label: 'MySQL', value: 'mysql', sort: 1 },
    { label: 'PostgreSQL', value: 'postgresql', sort: 2 },
    { label: 'MongoDB', value: 'mongodb', sort: 3 },
  ];
  for (const item of dsTypes) {
    await upsertDictItem(dsTypeDict.id, item.label, item.value, item.sort);
  }

  const dashStatuses = [
    { label: '草稿', value: '0', sort: 1 },
    { label: '已发布', value: '1', sort: 2 },
  ];
  for (const item of dashStatuses) {
    await upsertDictItem(dashboardStatusDict.id, item.label, item.value, item.sort);
  }
  console.log(`   - 图表类型(${chartTypes.length}项) / 数据源类型(${dsTypes.length}项) / 仪表板状态(${dashStatuses.length}项)`);

  // ===========================================================================
  // 完成
  // ===========================================================================
  console.log('\n========================================');
  console.log('  种子数据创建完成!');
  console.log('========================================');
  console.log('  测试账号:');
  console.log('    管理员: admin / admin123 (ADMIN+VIEWER)');
  console.log('    普通用户: user / user123 (USER)');
  console.log('========================================\n');
}

main()
  .catch((e: any) => {
    console.error('种子数据创建失败:', e && e.stack ? e.stack : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
