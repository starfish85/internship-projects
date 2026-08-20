import mysql.connector
from mysql.connector import Error
import pandas as pd
from datetime import datetime
import os

# ==================== 数据库配置 ====================
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'port': 3307,
    'database': 'shop_db'
}

# ==================== 导出目录配置 ====================
OUTPUT_DIR = "exports"
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ==================== 数据库连接 ====================

def get_db_connection():
    """获取数据库连接"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"❌ 数据库连接失败: {e}")
        return None


def load_all_orders():
    """加载所有订单数据（status=1 已支付）"""
    conn = get_db_connection()
    if not conn:
        return None
    
    sql = """
    SELECT 
        id,
        order_no,
        user_id,
        total_amount,
        status,
        created_at
    FROM orders
    WHERE status = 1
    ORDER BY created_at DESC
    """
    
    try:
        df = pd.read_sql(sql, conn)
        print(f"✅ 成功加载 {len(df)} 条已支付订单数据")
        # 确保金额为数值类型，防止数据库读取异常
        df["total_amount"] = pd.to_numeric(df["total_amount"], errors="coerce")
        return df
    except Exception as e:
        print(f"❌ 加载数据失败: {e}")
        return None
    finally:
        conn.close()


# ==================== 任务1：筛选导出 CSV ====================

def export_filtered_orders(df):
    """
    任务1：筛选 '已支付' 且金额 > 100 的订单，导出 CSV
    """
    print("\n" + "=" * 60)
    print("   📤 任务1：筛选导出 CSV（金额 > 100）")
    print("=" * 60)
    
    # 1. 筛选数据（filtered 保留原始数字，用于统计计算！）
    filtered = df[df['total_amount'] > 100].copy()
    
    # 8. 【先执行统计！！不再污染原始filtered】
    print(f"\n📊 筛选结果:")
    print(f"  - 原始数据: {len(df)} 条")
    print(f"  - 筛选后: {len(filtered)} 条")
    if len(filtered) > 0:
        print(f"  - 占比: {len(filtered)/len(df)*100:.1f}%")
        print(f"  - 平均金额: ¥{filtered['total_amount'].mean():.2f}")
        print(f"  - 总金额: ¥{filtered['total_amount'].sum():.2f}")
    else:
        print("  ⚠️ 筛选后无符合条件订单！")
    
    # 复制一份专门用来格式化导出，不影响原始filtered
    export_df = filtered.copy()

    # 2. 添加序号列（从1开始）
    export_df.insert(0, 'index', range(1, len(export_df) + 1))
    
    # 3. 格式化金额（仅作用于导出副本）
    export_df['total_amount'] = export_df['total_amount'].map(lambda x: f"¥{x:.2f}")
    
    # 4. 格式化日期
    export_df['created_at'] = export_df['created_at'].dt.strftime('%Y-%m-%d %H:%M:%S')
    
    # 5. 选择导出列（按业务需求排序）
    export_cols = ['index', 'order_no', 'user_id', 'total_amount', 'created_at']
    export_df = export_df[export_cols]
    
    # 6. 生成文件名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"orders_amount_gt_100_{timestamp}.csv"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    # 7. 导出 CSV
    export_df.to_csv(filepath, index=False, encoding='utf-8-sig')
    
    print(f"\n✅ 已导出: {filepath}")
    print(f"📋 预览前5行:")
    print(export_df.head().to_string(index=False))
    
    return filtered


# ==================== 任务2：按用户分组统计 ====================

def export_user_stats(df):
    """
    任务2：按用户分组统计消费额，降序导出报表
    """
    print("\n" + "=" * 60)
    print("   📊 任务2：按用户分组统计消费额")
    print("=" * 60)
    
    # 1. 分组统计
    stats = df.groupby('user_id').agg({
        'total_amount': ['count', 'sum', 'mean', 'min', 'max']
    }).reset_index()
    
    # 2. 重命名列
    stats.columns = ['user_id', 'order_count', 'total_spent', 'avg_amount', 'min_amount', 'max_amount']
    
    # 3. 按消费额降序排列
    stats = stats.sort_values('total_spent', ascending=False)
    
    # 4. 添加排名列
    stats.insert(0, 'rank', range(1, len(stats) + 1))
    
    # 【先打印统计信息，再格式化字符串】
    total_users = len(stats)
    total_spent = df['total_amount'].sum()
    print(f"\n📊 统计结果:")
    print(f"  - 总用户数: {total_users} 人")
    print(f"  - 总消费额: ¥{total_spent:,.2f}")
    print(f"  - 人均消费: ¥{total_spent/total_users:.2f}")
    if len(stats) > 0:
        print(f"  - 最高消费用户: ID {stats.iloc[0]['user_id']} (¥{stats.iloc[0]['total_spent']:.2f})")

    # 创建导出副本进行格式化，保留原始stats数值
    export_stats = stats.copy()
    export_stats['total_spent'] = export_stats['total_spent'].map(lambda x: f"¥{x:.2f}")
    export_stats['avg_amount'] = export_stats['avg_amount'].map(lambda x: f"¥{x:.2f}")
    export_stats['min_amount'] = export_stats['min_amount'].map(lambda x: f"¥{x:.2f}")
    export_stats['max_amount'] = export_stats['max_amount'].map(lambda x: f"¥{x:.2f}")
    
    # 6. 生成文件名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"user_spending_stats_{timestamp}.csv"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    # 7. 导出 CSV
    export_stats.to_csv(filepath, index=False, encoding='utf-8-sig')
    
    print(f"\n✅ 已导出: {filepath}")
    print(f"📋 预览前5行:")
    print(export_stats.head().to_string(index=False))
    
    return stats


# ==================== 任务3：额外分析 ====================

def additional_analysis(df, filtered_df, stats_df):
    """
    额外分析：合并打印一些补充统计
    """
    print("\n" + "=" * 60)
    print("   📈 补充分析")
    print("=" * 60)
    
    # 1. 金额分布
    bins = [0, 100, 500, 1000, 5000, 10000, float('inf')]
    labels = ['1-100', '101-500', '501-1000', '1001-5000', '5001-10000', '10000+']
    df['amount_range'] = pd.cut(df['total_amount'], bins=bins, labels=labels, right=False)
    distribution = df['amount_range'].value_counts().sort_index()
    
    print(f"\n📊 订单金额分布:")
    for range_label, count in distribution.items():
        print(f"  {range_label}: {count} 单 ({count/len(df)*100:.1f}%)")
    
    # 2. 总数据概览
    print(f"\n📊 数据概览:")
    print(f"  - 总订单数: {len(df):,} 单")
    print(f"  - 总消费金额: ¥{df['total_amount'].sum():,.2f}")
    print(f"  - 平均订单金额: ¥{df['total_amount'].mean():.2f}")
    print(f"  - 中位数订单金额: ¥{df['total_amount'].median():.2f}")
    print(f"  - 最高单笔订单: ¥{df['total_amount'].max():.2f}")
    print(f"  - 最低单笔订单: ¥{df['total_amount'].min():.2f}")


# ==================== 主程序 ====================

def main():
    print("=" * 60)
    print("   📊 订单数据分析处理系统")
    print("=" * 60)
    print(f"⏰ 运行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 1. 加载数据
    df = load_all_orders()
    if df is None or df.empty:
        print("❌ 无数据可处理")
        return
    
    # 2. 任务1：筛选导出
    filtered_df = export_filtered_orders(df)
    
    # 3. 任务2：分组统计
    stats_df = export_user_stats(df)
    
    # 4. 额外分析
    additional_analysis(df, filtered_df, stats_df)
    
    print("\n" + "=" * 60)
    print("   ✅ 所有任务完成！")
    print(f"📁 文件保存在: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 60)


if __name__ == "__main__":
    main()