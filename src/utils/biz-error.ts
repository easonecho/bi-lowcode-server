/**
 * ============================================================================
 * BI 低代码平台 - 业务异常类
 * ============================================================================
 * 参考 jvs 的 BusinessException，统一业务错误抛出方式
 * 用法: throw new BizException(ErrorCode.USER_NOT_FOUND)
 *      throw new BizException(ErrorCode.USER_NOT_FOUND, '自定义消息')
 * ============================================================================
 */

import { ErrorCode, ErrorMessage } from '../constants/error-code';

export class BizException extends Error {
  /** 业务错误码 */
  readonly code: number;
  /** HTTP 状态码 (默认 400) */
  readonly statusCode: number;

  constructor(code: number, message?: string, statusCode: number = 400) {
    super(message || ErrorMessage[code] || '未知错误');
    this.name = 'BizException';
    this.code = code;
    this.statusCode = statusCode;
  }

  /** 快捷构造: 未授权 (401) */
  static unauthorized(message?: string): BizException {
    return new BizException(ErrorCode.UNAUTHORIZED, message, 401);
  }

  /** 快捷构造: 权限不足 (403) */
  static forbidden(message?: string): BizException {
    return new BizException(ErrorCode.FORBIDDEN, message, 403);
  }

  /** 快捷构造: 资源不存在 (404) */
  static notFound(code: number = ErrorCode.NOT_FOUND, message?: string): BizException {
    return new BizException(code, message, 404);
  }

  /** 快捷构造: 参数错误 (400) */
  static paramError(message?: string): BizException {
    return new BizException(ErrorCode.PARAM_ERROR, message, 400);
  }

  /** 快捷构造: 服务器内部错误 (500) */
  static internal(message?: string): BizException {
    return new BizException(ErrorCode.INTERNAL_ERROR, message, 500);
  }
}
