-- ============================================================================
-- BI 低代码平台 - 完整数据库迁移脚本
-- 包含所有表的 CREATE TABLE 语句 (含 P0/P1/P2 全部表)
-- 适配 MySQL 8.0+
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. 用户/角色/部门模块
-- ============================================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `nickname` VARCHAR(50) NULL,
  `avatar` VARCHAR(255) NULL,
  `status` INT NOT NULL DEFAULT 1,
  `role_id` INT NOT NULL,
  `dept_id` INT NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_username_key`(`username`),
  INDEX `users_role_id_idx`(`role_id`),
  INDEX `users_dept_id_idx`(`dept_id`),
  INDEX `users_tenant_id_idx`(`tenant_id`),
  INDEX `users_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NULL,
  `description` VARCHAR(200) NULL,
  `permissions` JSON NULL,
  `ds_type` VARCHAR(20) NOT NULL DEFAULT 'ALL',
  `ds_dept_ids` JSON NULL,
  `status` INT NOT NULL DEFAULT 1,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `roles_code_key`(`code`),
  INDEX `roles_tenant_id_idx`(`tenant_id`),
  INDEX `roles_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `user_roles_user_id_idx`(`user_id`),
  INDEX `user_roles_role_id_idx`(`role_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `parent_id` INT NOT NULL DEFAULT 0,
  `sort` INT NOT NULL DEFAULT 0,
  `leader_id` INT NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(50) NULL,
  `status` INT NOT NULL DEFAULT 1,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `departments_parent_id_idx`(`parent_id`),
  INDEX `departments_leader_id_idx`(`leader_id`),
  INDEX `departments_tenant_id_idx`(`tenant_id`),
  INDEX `departments_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 2. 数据源/数据集/仪表板/图表模块
-- ============================================================================

CREATE TABLE IF NOT EXISTS `datasources` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `host` VARCHAR(100) NULL,
  `port` INT NULL,
  `database_name` VARCHAR(100) NULL,
  `username` VARCHAR(100) NULL,
  `password` VARCHAR(255) NULL,
  `options` JSON NULL,
  `creator_id` INT NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `datasources_creator_id_idx`(`creator_id`),
  INDEX `datasources_tenant_id_idx`(`tenant_id`),
  INDEX `datasources_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `datasets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NULL,
  `datasource_id` INT NOT NULL,
  `sql` LONGTEXT NOT NULL,
  `fields` JSON NULL,
  `params` JSON NULL,
  `cache_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `cache_ttl` INT NULL,
  `creator_id` INT NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `datasets_datasource_id_idx`(`datasource_id`),
  INDEX `datasets_creator_id_idx`(`creator_id`),
  INDEX `datasets_tenant_id_idx`(`tenant_id`),
  INDEX `datasets_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dashboards` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NULL,
  `layout` JSON NULL,
  `theme` VARCHAR(50) NULL,
  `status` INT NOT NULL DEFAULT 0,
  `is_public` BOOLEAN NOT NULL DEFAULT FALSE,
  `share_token` VARCHAR(100) NULL,
  `group_id` INT NULL,
  `creator_id` INT NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `dashboards_share_token_key`(`share_token`),
  INDEX `dashboards_group_id_idx`(`group_id`),
  INDEX `dashboards_creator_id_idx`(`creator_id`),
  INDEX `dashboards_tenant_id_idx`(`tenant_id`),
  INDEX `dashboards_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dashboard_shares` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `dashboard_id` INT NOT NULL,
  `user_id` INT NULL,
  `role_id` INT NULL,
  `permission` VARCHAR(20) NOT NULL DEFAULT 'view',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `dashboard_shares_dashboard_id_idx`(`dashboard_id`),
  INDEX `dashboard_shares_user_id_idx`(`user_id`),
  INDEX `dashboard_shares_role_id_idx`(`role_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `charts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `description` VARCHAR(500) NULL,
  `config` JSON NOT NULL,
  `dataset_id` INT NOT NULL,
  `dashboard_id` INT NULL,
  `position` JSON NULL,
  `creator_id` INT NOT NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `charts_dataset_id_idx`(`dataset_id`),
  INDEX `charts_dashboard_id_idx`(`dashboard_id`),
  INDEX `charts_creator_id_idx`(`creator_id`),
  INDEX `charts_tenant_id_idx`(`tenant_id`),
  INDEX `charts_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 3. 仪表板收藏 (P0/P1 新增)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `dashboard_favorites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `dashboard_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `dashboard_favorites_user_id_dashboard_id_key`(`user_id`, `dashboard_id`),
  INDEX `dashboard_favorites_user_id_idx`(`user_id`),
  INDEX `dashboard_favorites_dashboard_id_idx`(`dashboard_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 4. 仪表板分组 (P2-3 新增)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `dashboard_groups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `creator_id` INT NOT NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `dashboard_groups_creator_id_idx`(`creator_id`),
  INDEX `dashboard_groups_tenant_id_idx`(`tenant_id`),
  INDEX `dashboard_groups_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 5. 仪表板模板 (P2-3 新增)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `dashboard_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NULL,
  `layout` JSON NULL,
  `thumbnail` VARCHAR(500) NULL,
  `category` VARCHAR(50) NULL,
  `is_public` BOOLEAN NOT NULL DEFAULT TRUE,
  `creator_id` INT NOT NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `dashboard_templates_creator_id_idx`(`creator_id`),
  INDEX `dashboard_templates_tenant_id_idx`(`tenant_id`),
  INDEX `dashboard_templates_del_flag_idx`(`del_flag`),
  INDEX `dashboard_templates_category_idx`(`category`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 6. 菜单与按钮权限 (P0 新增: RBAC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `menus` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `parent_id` INT NOT NULL DEFAULT 0,
  `order_num` INT NOT NULL DEFAULT 0,
  `path` VARCHAR(200) NULL,
  `component` VARCHAR(255) NULL,
  `query` VARCHAR(255) NULL,
  `is_frame` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_cache` BOOLEAN NOT NULL DEFAULT TRUE,
  `menu_type` VARCHAR(1) NOT NULL DEFAULT 'C',
  `visible` BOOLEAN NOT NULL DEFAULT TRUE,
  `status` INT NOT NULL DEFAULT 1,
  `perms` VARCHAR(100) NULL,
  `icon` VARCHAR(100) NOT NULL DEFAULT '#',
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `del_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `menus_parent_id_idx`(`parent_id`),
  INDEX `menus_tenant_id_idx`(`tenant_id`),
  INDEX `menus_menu_type_idx`(`menu_type`),
  INDEX `menus_del_flag_idx`(`del_flag`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_menus` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `menu_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `role_menus_role_id_menu_id_key`(`role_id`, `menu_id`),
  INDEX `role_menus_role_id_idx`(`role_id`),
  INDEX `role_menus_menu_id_idx`(`menu_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 7. 数据字典 (P1 新增)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `dicts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(200) NULL,
  `status` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `dicts_type_key`(`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dict_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `dict_id` INT NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `value` VARCHAR(100) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `dict_items_dict_id_idx`(`dict_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 8. 操作日志 (P1 新增)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `username` VARCHAR(50) NULL,
  `module` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `path` VARCHAR(500) NOT NULL,
  `params` JSON NULL,
  `ip` VARCHAR(50) NULL,
  `user_agent` VARCHAR(500) NULL,
  `status` INT NOT NULL,
  `duration` INT NULL,
  `error_msg` TEXT NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `operation_logs_user_id_idx`(`user_id`),
  INDEX `operation_logs_module_idx`(`module`),
  INDEX `operation_logs_created_at_idx`(`created_at`),
  INDEX `operation_logs_tenant_id_idx`(`tenant_id`),
  INDEX `operation_logs_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 9. 系统配置 (P2-4 新增)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` LONGTEXT NULL,
  `config_name` VARCHAR(100) NOT NULL,
  `config_type` VARCHAR(20) NOT NULL DEFAULT 'string',
  `description` VARCHAR(500) NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `system_configs_config_key_key`(`config_key`),
  INDEX `system_configs_tenant_id_idx`(`tenant_id`),
  INDEX `system_configs_sort_idx`(`sort`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 10. 岗位管理 (P2-4 新增)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `positions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` INT NOT NULL DEFAULT 1,
  `description` VARCHAR(500) NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `positions_code_key`(`code`),
  INDEX `positions_tenant_id_idx`(`tenant_id`),
  INDEX `positions_status_idx`(`status`),
  INDEX `positions_sort_idx`(`sort`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 11. 定时任务 (P2-4 新增)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `scheduled_tasks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `cron` VARCHAR(50) NOT NULL,
  `handler` VARCHAR(200) NOT NULL,
  `params` JSON NULL,
  `status` INT NOT NULL DEFAULT 1,
  `description` VARCHAR(500) NULL,
  `last_run_at` DATETIME(3) NULL,
  `last_result` VARCHAR(500) NULL,
  `tenant_id` INT NOT NULL DEFAULT 1,
  `create_by` VARCHAR(50) NULL,
  `update_by` VARCHAR(50) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `scheduled_tasks_tenant_id_idx`(`tenant_id`),
  INDEX `scheduled_tasks_status_idx`(`status`),
  INDEX `scheduled_tasks_name_idx`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 外键约束 (在建表之后添加, 避免循环依赖)
-- ============================================================================
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `users` ADD CONSTRAINT `users_dept_id_fkey` FOREIGN KEY (`dept_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `departments` ADD CONSTRAINT `departments_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `departments` ADD CONSTRAINT `departments_leader_id_fkey` FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `datasets` ADD CONSTRAINT `datasets_datasource_id_fkey` FOREIGN KEY (`datasource_id`) REFERENCES `datasources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `dashboard_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `dashboard_shares` ADD CONSTRAINT `dashboard_shares_dashboard_id_fkey` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_shares` ADD CONSTRAINT `dashboard_shares_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_shares` ADD CONSTRAINT `dashboard_shares_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_favorites` ADD CONSTRAINT `dashboard_favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_favorites` ADD CONSTRAINT `dashboard_favorites_dashboard_id_fkey` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_groups` ADD CONSTRAINT `dashboard_groups_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `dashboard_templates` ADD CONSTRAINT `dashboard_templates_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `charts` ADD CONSTRAINT `charts_dataset_id_fkey` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `charts` ADD CONSTRAINT `charts_dashboard_id_fkey` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `charts` ADD CONSTRAINT `charts_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `role_menus` ADD CONSTRAINT `role_menus_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `role_menus` ADD CONSTRAINT `role_menus_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dict_items` ADD CONSTRAINT `dict_items_dict_id_fkey` FOREIGN KEY (`dict_id`) REFERENCES `dicts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;