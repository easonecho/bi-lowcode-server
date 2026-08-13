/**
 * ============================================================================
 * BI 低代码平台 - 统一响应格式
 * ============================================================================
 * 所有 API 接口返回统一的 JSON 格式:
 * { code: 0, message: "success", data: {...} }
 * ============================================================================
 */

export interface ApiResponse<T = any> {
  code: number;        // 0=成功, 非0=失败
  message: string;     // 提示信息
  data?: T;            // 返回数据
}

export class ResponseUtil {
  /** 成功响应 */
  static success<T>(data?: T, message: string = 'success'): ApiResponse<T> {
    return { code: 0, message, data };
  }

  /** 失败响应 */
  static error(message: string = 'error', code: number = -1): ApiResponse {
    return { code, message, data: undefined };
  }

  /** 分页响应 */
  static paginate<T>(list: T[], total: number, page: number, pageSize: number): ApiResponse {
    return {
      code: 0,
      message: 'success',
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
