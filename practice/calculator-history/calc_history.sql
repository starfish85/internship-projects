-- ========== 创建历史记录表 ==========
CREATE TABLE IF NOT EXISTS calc_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expression TEXT NOT NULL,
    result VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== 推荐索引 ==========
-- 1. 按时间查询历史记录（最常用）
CREATE INDEX idx_created_at ON calc_history(created_at);

-- 2. 如果要按表达式内容搜索（可选）
-- CREATE FULLTEXT INDEX idx_expression ON calc_history(expression);