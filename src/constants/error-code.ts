/**
 * ============================================================================
 * BI 低代码平台 - 业务错误码定义
 * ============================================================================
 * 参考 jvs 的 BusinessException 错误码体系
 * 规范: 0=成功, 1xxxx=通用错误, 2xxxx=用户模块, 3xxxx=数据源模块,
 *       4xxxx=数据集模块, 5xxxx=仪表板模块, 6xxxx=图表模块, 7xxxx=导出模块
 *       21xxx=角色模块, 22xxx=部门模块
 * ============================================================================
 */

export const ErrorCode = {
  // 通用错误
  SUCCESS: 0,
  UNKNOWN_ERROR: 10000,
  PARAM_ERROR: 10001,
  UNAUTHORIZED: 10002,
  FORBIDDEN: 10003,
  NOT_FOUND: 10004,
  CONFLICT: 10005,
  INTERNAL_ERROR: 10006,
  RATE_LIMIT: 10007,

  // 用户模块 2xxxx
  USER_NOT_FOUND: 20001,
  USER_ALREADY_EXISTS: 20002,
  USER_PASSWORD_ERROR: 20003,
  USER_DISABLED: 20004,
  USER_CANNOT_DELETE_SELF: 20005,

  // 角色模块 21xxx
  ROLE_NOT_FOUND: 21001,
  ROLE_NAME_EXISTS: 21002,
  ROLE_CODE_EXISTS: 21003,
  ROLE_HAS_USERS: 21004,
  ROLE_CANNOT_MODIFY_BUILTIN: 21005,

  // 部门模块 22xxx
  DEPT_NOT_FOUND: 22001,
  DEPT_NAME_EXISTS: 22002,
  DEPT_HAS_USERS: 22003,
  DEPT_HAS_CHILDREN: 22004,
  DEPT_PARENT_INVALID: 22005,

  // 数据源模块 3xxxx
  DATASOURCE_NOT_FOUND: 30001,
  DATASOURCE_NAME_EXISTS: 30002,
  DATASOURCE_HAS_DATASETS: 30003,
  DATASOURCE_CONNECT_FAILED: 30004,
  DATASOURCE_TYPE_NOT_SUPPORTED: 30005,

  // 数据集模块 4xxxx
  DATASET_NOT_FOUND: 40001,
  DATASET_HAS_CHARTS: 40002,
  DATASET_SQL_INVALID: 40003,
  DATASET_QUERY_FAILED: 40004,
  DATASET_SQL_NOT_READONLY: 40005,

  // 仪表板模块 5xxxx
  DASHBOARD_NOT_FOUND: 50001,
  DASHBOARD_NAME_EMPTY: 50002,
  DASHBOARD_SHARE_NOT_FOUND: 50003,
  DASHBOARD_SHARE_EXPIRED: 50004,
  DASHBOARD_SHARE_PASSWORD_REQUIRED: 50005,
  DASHBOARD_SHARE_PASSWORD_INVALID: 50006,
  // 仪表板分组 51xxx (P2-3)
  DASHBOARD_GROUP_NOT_FOUND: 51001,
  DASHBOARD_GROUP_NAME_EXISTS: 51002,
  DASHBOARD_GROUP_HAS_DASHBOARDS: 51003,
  // 仪表板模板 52xxx (P2-3)
  DASHBOARD_TEMPLATE_NOT_FOUND: 52001,
  DASHBOARD_TEMPLATE_NAME_EXISTS: 52002,
  DASHBOARD_TEMPLATE_IS_SYSTEM: 52003, // 系统预置模板不可修改/删除

  // 系统配置 53xxx (P2-4)
  SYS_CONFIG_NOT_FOUND: 53001,
  SYS_CONFIG_KEY_EXISTS: 53002,
  // 岗位 54xxx (P2-4)
  POSITION_NOT_FOUND: 54001,
  POSITION_CODE_EXISTS: 54002,
  // 定时任务 55xxx (P2-4)
  TASK_NOT_FOUND: 55001,
  TASK_NAME_EXISTS: 55002,
  TASK_CRON_INVALID: 55003,

  // 图表模块 6xxxx
  CHART_NOT_FOUND: 60001,

  // 菜单模块 23xxx
  MENU_NOT_FOUND: 23001,
  MENU_NAME_EXISTS: 23002,
  MENU_HAS_CHILDREN: 23003,
  MENU_PARENT_INVALID: 23004,
  MENU_NOT_PERMIT: 23005,
  MENU_PATH_EXISTS: 23006,
  MENU_BUILTIN_CANNOT_DELETE: 23007,
  MENU_PARENT_NOT_FOUND: 23008,
  MENU_SELF_PARENT: 23009,
  // 导出模块 7xxxx
  EXPORT_FAILED: 70001,
  EXPORT_TYPE_NOT_SUPPORTED: 70002,
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

/** 错误码对应的默认消息 */
export const ErrorMessage: Record<number, string> = {
  [ErrorCode.SUCCESS]: 'success',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.PARAM_ERROR]: '参数错误',
  [ErrorCode.UNAUTHORIZED]: '未授权，请先登录',
  [ErrorCode.FORBIDDEN]: '权限不足',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.CONFLICT]: '资源冲突',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.RATE_LIMIT]: '请求过于频繁，请稍后再试',

  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户名已存在',
  [ErrorCode.USER_PASSWORD_ERROR]: '用户名或密码错误',
  [ErrorCode.USER_DISABLED]: '账号已被禁用',
  [ErrorCode.USER_CANNOT_DELETE_SELF]: '不能删除自己',

  [ErrorCode.ROLE_NOT_FOUND]: '角色不存在',
  [ErrorCode.ROLE_NAME_EXISTS]: '角色名称已存在',
  [ErrorCode.ROLE_CODE_EXISTS]: '角色编码已存在',
  [ErrorCode.ROLE_HAS_USERS]: '该角色下存在用户，无法删除',
  [ErrorCode.ROLE_CANNOT_MODIFY_BUILTIN]: '内置角色不可修改或删除',

  [ErrorCode.DEPT_NOT_FOUND]: '部门不存在',
  [ErrorCode.DEPT_NAME_EXISTS]: '部门名称已存在',
  [ErrorCode.DEPT_HAS_USERS]: '该部门下存在用户，无法删除',
  [ErrorCode.DEPT_HAS_CHILDREN]: '该部门下存在子部门，无法删除',
  [ErrorCode.DEPT_PARENT_INVALID]: '父部门无效',

  [ErrorCode.DATASOURCE_NOT_FOUND]: '数据源不存在',
  [ErrorCode.DATASOURCE_NAME_EXISTS]: '数据源名称已存在',
  [ErrorCode.DATASOURCE_HAS_DATASETS]: '该数据源下存在数据集，无法删除',
  [ErrorCode.DATASOURCE_CONNECT_FAILED]: '数据源连接失败',
  [ErrorCode.DATASOURCE_TYPE_NOT_SUPPORTED]: '不支持的数据源类型',

  [ErrorCode.DATASET_NOT_FOUND]: '数据集不存在',
  [ErrorCode.DATASET_HAS_CHARTS]: '该数据集下存在图表，无法删除',
  [ErrorCode.DATASET_SQL_INVALID]: 'SQL 语句无效',
  [ErrorCode.DATASET_QUERY_FAILED]: '数据查询失败',
  [ErrorCode.DATASET_SQL_NOT_READONLY]: '仅允许执行 SELECT 查询',

  [ErrorCode.DASHBOARD_NOT_FOUND]: '仪表板不存在',
  [ErrorCode.DASHBOARD_NAME_EMPTY]: '仪表板名称不能为空',
  [ErrorCode.DASHBOARD_SHARE_NOT_FOUND]: '分享链接不存在',
  [ErrorCode.DASHBOARD_SHARE_EXPIRED]: '分享链接已过期',
  [ErrorCode.DASHBOARD_SHARE_PASSWORD_REQUIRED]: '请输入访问密码',
  [ErrorCode.DASHBOARD_SHARE_PASSWORD_INVALID]: '访问密码错误',

  [ErrorCode.DASHBOARD_GROUP_NOT_FOUND]: '仪表板分组不存在',
  [ErrorCode.DASHBOARD_GROUP_NAME_EXISTS]: '分组名称已存在',
  [ErrorCode.DASHBOARD_GROUP_HAS_DASHBOARDS]: '该分组下存在仪表板，无法删除',

  [ErrorCode.DASHBOARD_TEMPLATE_NOT_FOUND]: '仪表板模板不存在',
  [ErrorCode.DASHBOARD_TEMPLATE_NAME_EXISTS]: '模板名称已存在',
  [ErrorCode.DASHBOARD_TEMPLATE_IS_SYSTEM]: '系统预置模板不可修改或删除',

  [ErrorCode.SYS_CONFIG_NOT_FOUND]: '系统配置不存在',
  [ErrorCode.SYS_CONFIG_KEY_EXISTS]: '配置键名已存在',
  [ErrorCode.POSITION_NOT_FOUND]: '岗位不存在',
  [ErrorCode.POSITION_CODE_EXISTS]: '岗位编码已存在',
  [ErrorCode.TASK_NOT_FOUND]: '定时任务不存在',
  [ErrorCode.TASK_NAME_EXISTS]: '任务名称已存在',
  [ErrorCode.TASK_CRON_INVALID]: 'cron 表达式无效',

  [ErrorCode.CHART_NOT_FOUND]: '图表不存在',

  [ErrorCode.MENU_NOT_FOUND]: '菜单不存在',
  [ErrorCode.MENU_NAME_EXISTS]: '菜单名称已存在',
  [ErrorCode.MENU_HAS_CHILDREN]: '存在子菜单，无法删除',
  [ErrorCode.MENU_PARENT_INVALID]: '上级菜单选择错误',
  [ErrorCode.MENU_NOT_PERMIT]: '没有菜单操作权限',
  [ErrorCode.MENU_PATH_EXISTS]: '菜单路由路径已存在',
  [ErrorCode.MENU_BUILTIN_CANNOT_DELETE]: '内置菜单不允许删除',
  [ErrorCode.MENU_PARENT_NOT_FOUND]: '父级菜单不存在',
  [ErrorCode.MENU_SELF_PARENT]: '父级菜单不能是自己',
  [ErrorCode.EXPORT_FAILED]: '导出失败',
  [ErrorCode.EXPORT_TYPE_NOT_SUPPORTED]: '不支持的导出类型',
}
