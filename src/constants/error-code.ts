/**
 * ============================================================================
 * BI 低代码平台 - 业务错误码定义
 * ============================================================================
 * 参考 jvs 的 BusinessException 错误码体系
 * 规范: 0=成功, 1xxxx=通用错误, 2xxxx=用户模块, 3xxxx=数据源模块,
 *       4xxxx=数据集模块, 5xxxx=仪表板模块, 6xxxx=图表模块, 7xxxx=导出模块
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

  // 图表模块 6xxxx
  CHART_NOT_FOUND: 60001,

  // 导出模块 7xxxx
  EXPORT_FAILED: 70001,
  EXPORT_TYPE_NOT_SUPPORTED: 70002,
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

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

  [ErrorCode.CHART_NOT_FOUND]: '图表不存在',

  [ErrorCode.EXPORT_FAILED]: '导出失败',
  [ErrorCode.EXPORT_TYPE_NOT_SUPPORTED]: '不支持的导出类型',
};
