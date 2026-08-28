/**
 * 仪表板模板分类枚举 (服务端统一管理)
 * - 避免用户自由输入导致类型分散、筛选不可控
 * - value: 存储值 (英文 key, 规范且 i18n 友好)
 * - label: 默认中文显示 (前端可通过 i18nKey 本地化)
 * - i18nKey: 前端 i18n 翻译 key
 */
export interface TemplateCategoryOption {
  value: string
  label: string
  i18nKey: string
}

export const TEMPLATE_CATEGORIES: TemplateCategoryOption[] = [
  { value: 'basic', label: '基础', i18nKey: 'templateCategory.basic' },
  { value: 'business', label: '业务分析', i18nKey: 'templateCategory.business' },
  { value: 'operations', label: '运营监控', i18nKey: 'templateCategory.operations' },
  { value: 'finance', label: '财务', i18nKey: 'templateCategory.finance' },
  { value: 'report', label: '报表周报', i18nKey: 'templateCategory.report' },
  { value: 'system', label: '系统监控', i18nKey: 'templateCategory.system' },
  { value: 'other', label: '其他', i18nKey: 'templateCategory.other' },
]

/** 所有合法分类 value 数组 (用于校验) */
export const TEMPLATE_CATEGORY_VALUES = TEMPLATE_CATEGORIES.map((c) => c.value)

/** 校验 value 是否为合法分类 */
export function isValidTemplateCategory(value: string): boolean {
  return TEMPLATE_CATEGORY_VALUES.includes(value)
}

/** 根据 value 获取选项 */
export function getTemplateCategoryOption(value: string): TemplateCategoryOption | undefined {
  return TEMPLATE_CATEGORIES.find((c) => c.value === value)
}
