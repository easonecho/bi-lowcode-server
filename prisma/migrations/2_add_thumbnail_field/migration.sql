-- ============================================================================
-- 迁移: 为 dashboards 增加 thumbnail 字段; dashboard_templates.thumbnail 改 TEXT
-- 适配 MySQL 8.0+
-- ============================================================================

-- 1) dashboards 新增缩略图快照列 (TEXT, 存 base64 Data URL)
ALTER TABLE dashboards
  ADD COLUMN thumbnail TEXT NULL COMMENT '缩略图快照 (PNG/JPEG data URL)' AFTER layout;

-- 2) dashboard_templates.thumbnail 由 VARCHAR(500) 升级为 TEXT (存 Data URL)
ALTER TABLE dashboard_templates
  MODIFY COLUMN thumbnail TEXT NULL COMMENT '缩略图快照 (PNG/JPEG data URL)';