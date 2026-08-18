/**
 * ============================================================================
 * BI 低代码平台 - OpenAPI 3.0 规范定义
 * ============================================================================
 * 此文件定义了所有 API 接口的文档规范
 * - 用于生成 Swagger UI 文档
 * - 用于导入 YApi 进行接口管理
 * ============================================================================
 */

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'BI 低代码平台 API',
    description:
      'BI 低代码平台服务端接口文档\n\n## 功能模块\n- 用户认证 (登录/注册/JWT)\n- 用户管理 (CRUD/角色)\n- 数据源管理 (CRUD/连接测试)\n- 数据集管理 (CRUD/SQL查询)\n- 仪表板管理 (CRUD/布局)\n- 图表管理 (CRUD/8种图表类型)\n- 数据导出 (CSV/JSON)',
    version: '1.0.0',
    contact: {
      name: 'BI Low-Code Team',
      email: 'admin@bi-lowcode.com',
    },
  },
  servers: [
    {
      url: process.env.SWAGGER_URL || `http://localhost:${process.env.PORT || '3000'}`,
      description: process.env.NODE_ENV || 'development',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Token 认证，格式: Bearer <token>',
      },
    },
    schemas: {
      // ==================== 通用响应 ====================
      ApiResponse: {
        type: 'object',
        properties: {
          code: { type: 'integer', description: '状态码 (0=成功)' },
          message: { type: 'string', description: '提示信息' },
          data: { description: '返回数据' },
        },
      },
      PaginateResponse: {
        type: 'object',
        properties: {
          code: { type: 'integer' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              list: { type: 'array', items: {} },
              total: { type: 'integer' },
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
      // ==================== 用户模型 ====================
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: '用户ID' },
          username: { type: 'string', description: '用户名' },
          email: { type: 'string', description: '邮箱' },
          phone: { type: 'string', description: '手机号' },
          nickname: { type: 'string', description: '昵称' },
          avatar: { type: 'string', description: '头像URL' },
          status: { type: 'integer', description: '状态 (0=禁用, 1=启用)' },
          roleId: { type: 'integer', description: '角色ID' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', description: '角色名称' },
          code: { type: 'string', description: '角色编码' },
          description: { type: 'string' },
          permissions: { type: 'string', description: '权限列表 (JSON)' },
        },
      },
      // ==================== 数据源模型 ====================
      DataSource: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', description: '数据源名称' },
          type: { type: 'string', description: '类型 (mysql/postgresql)' },
          host: { type: 'string', description: '主机地址' },
          port: { type: 'integer', description: '端口' },
          username: { type: 'string', description: '用户名' },
          database: { type: 'string', description: '数据库名' },
          status: { type: 'integer', description: '状态 (0=未连接, 1=已连接)' },
          description: { type: 'string' },
        },
      },
      // ==================== 数据集模型 ====================
      Dataset: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', description: '数据集名称' },
          description: { type: 'string' },
          datasourceId: { type: 'integer', description: '关联数据源ID' },
          sql: { type: 'string', description: 'SQL查询语句' },
          fields: { type: 'object', description: '字段定义' },
          cacheEnabled: { type: 'boolean', description: '是否启用缓存' },
          cacheTtl: { type: 'integer', description: '缓存时间(秒)' },
        },
      },
      // ==================== 仪表板模型 ====================
      Dashboard: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', description: '仪表板名称' },
          description: { type: 'string' },
          layout: { type: 'object', description: '布局配置' },
          status: { type: 'integer', description: '状态 (0=草稿, 1=已发布)' },
          isPublic: { type: 'boolean', description: '是否公开' },
        },
      },
      // ==================== 图表模型 ====================
      Chart: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', description: '图表名称' },
          type: { type: 'string', description: '图表类型 (bar/line/pie/table/gauge/map)' },
          description: { type: 'string' },
          config: { type: 'object', description: '图表配置' },
          datasetId: { type: 'integer', description: '关联数据集ID' },
          dashboardId: { type: 'integer', description: '关联仪表板ID' },
          position: { type: 'object', description: '位置配置' },
        },
      },
    },
  },
  // ==================== 默认安全要求 ====================
  security: [{ BearerAuth: [] }],
  // ==================== 接口定义 ====================
  paths: {
    // ==================== 认证模块 ====================
    '/api/auth/register': {
      post: {
        tags: ['认证'],
        summary: '用户注册',
        description: '注册新用户账号',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: {
                    type: 'string',
                    description: '用户名 (3-50字符)',
                    example: 'newuser',
                  },
                  password: { type: 'string', description: '密码 (至少6位)', example: '123456' },
                  email: { type: 'string', description: '邮箱', example: 'user@example.com' },
                  nickname: { type: 'string', description: '昵称', example: '新用户' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '注册成功',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['认证'],
        summary: '用户登录',
        description: '用户登录获取 JWT Token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', description: '用户名', example: 'admin' },
                  password: { type: 'string', description: '密码', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '登录成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '登录成功' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string', description: 'JWT Token' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/profile': {
      get: {
        tags: ['认证'],
        summary: '获取当前用户信息',
        description: '获取当前登录用户的详细信息',
        responses: {
          200: {
            description: '成功',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } },
            },
          },
          401: { description: '未认证' },
        },
      },
    },
    // ==================== 用户管理 ====================
    '/api/users': {
      get: {
        tags: ['用户管理'],
        summary: '获取用户列表',
        description: '分页获取用户列表',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: '页码',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            description: '每页数量',
            schema: { type: 'integer', default: 10 },
          },
          { name: 'keyword', in: 'query', description: '搜索关键词', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: '成功',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PaginateResponse' } },
            },
          },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['用户管理'],
        summary: '获取用户详情',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: '成功',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } },
            },
          },
        },
      },
      put: {
        tags: ['用户管理'],
        summary: '更新用户信息',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  nickname: { type: 'string' },
                  avatar: { type: 'string' },
                  status: { type: 'integer' },
                  roleId: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['用户管理'],
        summary: '删除用户',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '删除成功' } },
      },
    },
    '/api/users/{id}/password': {
      put: {
        tags: ['用户管理'],
        summary: '修改密码',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: {
                  oldPassword: { type: 'string', description: '旧密码' },
                  newPassword: { type: 'string', description: '新密码 (至少6位)' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '密码修改成功' } },
      },
    },
    '/api/users/roles/all': {
      get: {
        tags: ['用户管理'],
        summary: '获取所有角色',
        responses: { 200: { description: '成功' } },
      },
    },
    // ==================== 数据源管理 ====================
    '/api/datasources': {
      get: {
        tags: ['数据源管理'],
        summary: '获取数据源列表',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: '成功' } },
      },
      post: {
        tags: ['数据源管理'],
        summary: '创建数据源',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type', 'host', 'port', 'username', 'password', 'database'],
                properties: {
                  name: { type: 'string', description: '数据源名称' },
                  type: { type: 'string', description: '类型', enum: ['mysql', 'postgresql'] },
                  host: { type: 'string', description: '主机地址', example: 'localhost' },
                  port: { type: 'integer', description: '端口', example: 3306 },
                  username: { type: 'string', description: '用户名' },
                  password: { type: 'string', description: '密码' },
                  database: { type: 'string', description: '数据库名' },
                  description: { type: 'string', description: '描述' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '创建成功' } },
      },
    },
    '/api/datasources/{id}': {
      get: {
        tags: ['数据源管理'],
        summary: '获取数据源详情',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '成功' } },
      },
      put: {
        tags: ['数据源管理'],
        summary: '更新数据源',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataSource' } } },
        },
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['数据源管理'],
        summary: '删除数据源',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '删除成功' } },
      },
    },
    '/api/datasources/{id}/test': {
      post: {
        tags: ['数据源管理'],
        summary: '测试数据源连接',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '连接成功' } },
      },
    },
    '/api/datasources/{id}/tables': {
      get: {
        tags: ['数据源管理'],
        summary: '获取数据源的表列表',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '成功' } },
      },
    },
    // ==================== 数据集管理 ====================
    '/api/datasets': {
      get: {
        tags: ['数据集管理'],
        summary: '获取数据集列表',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'datasourceId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '成功' } },
      },
      post: {
        tags: ['数据集管理'],
        summary: '创建数据集',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'datasourceId', 'sql'],
                properties: {
                  name: { type: 'string', description: '数据集名称' },
                  description: { type: 'string' },
                  datasourceId: { type: 'integer', description: '数据源ID' },
                  sql: { type: 'string', description: 'SQL查询语句' },
                  fields: { type: 'object', description: '字段定义' },
                  cacheEnabled: { type: 'boolean' },
                  cacheTtl: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '创建成功' } },
      },
    },
    '/api/datasets/{id}': {
      get: {
        tags: ['数据集管理'],
        summary: '获取数据集详情',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '成功' } },
      },
      put: {
        tags: ['数据集管理'],
        summary: '更新数据集',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Dataset' } } },
        },
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['数据集管理'],
        summary: '删除数据集',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '删除成功' } },
      },
    },
    '/api/datasets/{id}/preview': {
      post: {
        tags: ['数据集管理'],
        summary: '预览数据集数据',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  limit: { type: 'integer', default: 100 },
                  offset: { type: 'integer', default: 0 },
                },
              },
            },
          },
        },
        responses: { 200: { description: '成功' } },
      },
    },
    '/api/datasets/{id}/execute': {
      post: {
        tags: ['数据集管理'],
        summary: '执行数据集SQL',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '成功' } },
      },
    },
    // ==================== 仪表板管理 ====================
    '/api/dashboards': {
      get: {
        tags: ['仪表板管理'],
        summary: '获取仪表板列表',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '成功' } },
      },
      post: {
        tags: ['仪表板管理'],
        summary: '创建仪表板',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', description: '仪表板名称' },
                  description: { type: 'string' },
                  layout: { type: 'object', description: '布局配置' },
                  isPublic: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '创建成功' } },
      },
    },
    '/api/dashboards/{id}': {
      get: {
        tags: ['仪表板管理'],
        summary: '获取仪表板详情',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '成功' } },
      },
      put: {
        tags: ['仪表板管理'],
        summary: '更新仪表板',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Dashboard' } } },
        },
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['仪表板管理'],
        summary: '删除仪表板',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '删除成功' } },
      },
    },
    // ==================== 图表管理 ====================
    '/api/charts': {
      get: {
        tags: ['图表管理'],
        summary: '获取图表列表',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'dashboardId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '成功' } },
      },
      post: {
        tags: ['图表管理'],
        summary: '创建图表',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type', 'config', 'datasetId'],
                properties: {
                  name: { type: 'string', description: '图表名称' },
                  type: {
                    type: 'string',
                    description: '图表类型',
                    enum: ['bar', 'line', 'pie', 'table', 'gauge', 'map', 'scatter', 'area'],
                  },
                  description: { type: 'string' },
                  config: { type: 'object', description: '图表配置 (ECharts配置)' },
                  datasetId: { type: 'integer', description: '数据集ID' },
                  dashboardId: { type: 'integer', description: '仪表板ID' },
                  position: { type: 'object', description: '位置配置' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '创建成功' } },
      },
    },
    '/api/charts/types/list': {
      get: {
        tags: ['图表管理'],
        summary: '获取图表类型列表',
        description: '获取所有支持的图表类型',
        responses: { 200: { description: '成功' } },
      },
    },
    '/api/charts/{id}': {
      get: {
        tags: ['图表管理'],
        summary: '获取图表详情',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '成功' } },
      },
      put: {
        tags: ['图表管理'],
        summary: '更新图表',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Chart' } } },
        },
        responses: { 200: { description: '更新成功' } },
      },
      delete: {
        tags: ['图表管理'],
        summary: '删除图表',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '删除成功' } },
      },
    },
    '/api/charts/{id}/data': {
      post: {
        tags: ['图表管理'],
        summary: '获取图表数据',
        description: '执行关联数据集的SQL获取图表数据',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '成功' } },
      },
    },
    // ==================== 数据导出 ====================
    '/api/export/dataset/{id}/csv': {
      post: {
        tags: ['数据导出'],
        summary: '导出数据集为CSV',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'CSV文件下载' } },
      },
    },
    '/api/export/dataset/{id}/json': {
      post: {
        tags: ['数据导出'],
        summary: '导出数据集为JSON',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'JSON文件下载' } },
      },
    },
    '/api/export/chart/{id}/data': {
      get: {
        tags: ['数据导出'],
        summary: '导出图表数据',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'JSON文件下载' } },
      },
    },
  },
}
