import { Context, Next } from 'koa'
import { BizException } from '../utils/biz-error'
import { ErrorCode } from '../constants/error-code'
import { getRequestContext } from '../utils/request-context'

function isSuper(ctx: Context): boolean {
  const ids: number[] | undefined = (ctx.state.user as any)?.roleIds
  return Array.isArray(ids) && ids.includes(1)
}

export function requirePerms(...perms: string[]) {
  return async (ctx: Context, next: Next) => {
    if (isSuper(ctx)) return next()
    const rc = getRequestContext()
    const set = new Set<string>(rc?.perms ?? [])
    for (const p of perms) {
      if (!set.has(p)) throw new BizException(ErrorCode.FORBIDDEN, `缺少权限: ${p}`)
    }
    return next()
  }
}

export function requireAnyPerms(perms: string[]) {
  return async (ctx: Context, next: Next) => {
    if (isSuper(ctx)) return next()
    const rc = getRequestContext()
    const set = new Set<string>(rc?.perms ?? [])
    const hit = perms.some((p) => set.has(p))
    if (!hit) throw new BizException(ErrorCode.FORBIDDEN, `缺少任一权限: ${perms.join('/')}`)
    return next()
  }
}
