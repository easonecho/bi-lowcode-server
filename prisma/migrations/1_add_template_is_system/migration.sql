-- ============================================================================
-- 迁移: 为 dashboard_templates 增加 is_system 字段 (区分预置模板与用户模板)
-- 适配 MySQL 8.0+
-- ============================================================================
ALTER TABLE dashboard_templates
  ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '是否系统预置模板 (true=预置, false=用户创建)'
  AFTER is_public;

CREATE INDEX dashboard_templates_is_system_idx
  ON dashboard_templates (is_system);
