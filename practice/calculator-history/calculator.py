import re
import os
from datetime import datetime
import mysql.connector
from mysql.connector import Error

# ==================== 数据库配置 ====================
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'port': 3307,
    'database': 'calc_db'
}

# ==================== 运算符优先级 ====================
PRECEDENCE = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2
}

# ==================== 数据库操作 ====================

def init_history_table():
    """初始化历史记录表"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS calc_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            expression TEXT NOT NULL,
            result VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        cursor.execute(create_table_sql)
        
        # 创建索引（如果不存在）
        try:
            cursor.execute("CREATE INDEX idx_created_at ON calc_history(created_at)")
        except Error:
            pass  # 索引已存在
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"⚠️ 数据库初始化失败: {e}")
        print("将继续运行，但不保存历史记录")
        return False


def save_history(expression, result):
    """保存计算记录到数据库"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = "INSERT INTO calc_history (expression, result) VALUES (%s, %s)"
        cursor.execute(sql, (expression, str(result)))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"⚠️ 保存历史记录失败: {e}")
        return False


def show_history(limit=10):
    """显示最近的历史记录"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = """
        SELECT id, expression, result, created_at 
        FROM calc_history 
        ORDER BY created_at DESC 
        LIMIT %s
        """
        cursor.execute(sql, (limit,))
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        if not rows:
            print("📭 暂无历史记录")
            return
        
        print("\n" + "=" * 60)
        print("   📜 最近的计算历史")
        print("=" * 60)
        for row in rows:
            print(f"  {row[3].strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"  {row[1]} = {row[2]}")
            print("-" * 40)
        
    except Error as e:
        print(f"⚠️ 读取历史记录失败: {e}")


# ==================== 计算器核心 ====================

def apply_operator(operators, operands):
    """弹出运算符和两个操作数，计算结果并压回操作数栈"""
    op = operators.pop()
    right = operands.pop()
    left = operands.pop()
    
    if op == '+':
        result = left + right
    elif op == '-':
        result = left - right
    elif op == '*':
        result = left * right
    elif op == '/':
        if right == 0:
            raise ZeroDivisionError("❌ 错误：除数不能为0")
        result = left / right
    
    operands.append(result)


def should_pop_operator(current_op, top_op):
    """判断当前运算符是否应该弹出栈顶运算符"""
    if top_op == '(':
        return False
    return PRECEDENCE[current_op] <= PRECEDENCE[top_op]


def calculate(expression):
    """
    使用双栈法（调度场算法）计算表达式
    支持：+、-、*、/、()、小数、负数
    """
    expression = expression.replace(' ', '')
    
    if not expression:
        return None
    
    operators = []
    operands = []
    i = 0
    length = len(expression)
    
    while i < length:
        ch = expression[i]
        
        # ----- 处理数字（包括小数和负数） -----
        if ch.isdigit() or (ch == '-' and (i == 0 or expression[i-1] in '+-*/(')):
            if ch == '-':
                i += 1
                if i >= length or not (expression[i].isdigit() or expression[i] == '.'):
                    raise ValueError("❌ 语法错误：'-' 后面没有数字")
            
            num_str = ''
            if i > 0 and expression[i-1] == '-' and (i-1 >= 0) and (i-1 == 0 or expression[i-2] in '+-*/('):
                num_str = '-'
                i -= 1  # 回退一位，让下面的循环能正确处理负号
            elif expression[i-1] == '-' and (i-1 >= 0):
                # 可能是负号，但需要判断
                pass
            
            # 修正负号处理
            if i > 0 and expression[i-1] == '-':
                if i-1 == 0 or expression[i-2] in '+-*/(':
                    num_str = '-'
                # 如果是减号，则不是负号
            
            while i < length and (expression[i].isdigit() or expression[i] == '.'):
                num_str += expression[i]
                i += 1
            
            if num_str.count('.') > 1:
                raise ValueError(f"❌ 语法错误：数字 '{num_str}' 包含多个小数点")
            
            operands.append(float(num_str))
            continue
        
        # ----- 处理左括号 -----
        elif ch == '(':
            operators.append(ch)
            i += 1
        
        # ----- 处理右括号 -----
        elif ch == ')':
            while operators and operators[-1] != '(':
                apply_operator(operators, operands)
            
            if not operators:
                raise ValueError("❌ 语法错误：括号不匹配")
            
            operators.pop()
            i += 1
        
        # ----- 处理运算符 -----
        elif ch in '+-*/':
            while operators and operators[-1] != '(' and should_pop_operator(ch, operators[-1]):
                apply_operator(operators, operands)
            
            operators.append(ch)
            i += 1
        
        else:
            raise ValueError(f"❌ 语法错误：不支持的字符 '{ch}'")
    
    # ----- 表达式结束，弹出所有运算符计算 -----
    while operators:
        if operators[-1] == '(':
            raise ValueError("❌ 语法错误：括号不匹配")
        apply_operator(operators, operands)
    
    if len(operands) != 1:
        raise ValueError("❌ 语法错误：表达式格式错误")
    
    result = operands[0]
    if result.is_integer():
        return int(result)
    return result


# ==================== 主程序 ====================

def main():
    """主程序 - 交互式计算器（带历史记录）"""
    print("=" * 50)
    print("   🖥️  黑屏计算器 v2.0")
    print("=" * 50)
    print("支持：+  -  *  /  ( )  小数  负数")
    print("特殊命令：")
    print("  'history'  - 查看最近10条计算历史")
    print("  'clear'    - 清屏")
    print("  'q'        - 退出")
    print("=" * 50)
    print()
    
    # 初始化数据库
    db_available = init_history_table()
    if db_available:
        print("✅ 历史记录已开启\n")
    
    while True:
        try:
            expr = input(">>> ").strip()
            
            # ----- 退出 -----
            if expr.lower() in ('q', 'quit', 'exit'):
                print("👋 再见！")
                break
            
            # ----- 清屏 -----
            if expr.lower() == 'clear':
                os.system('cls' if os.name == 'nt' else 'clear')
                continue
            
            # ----- 查看历史 -----
            if expr.lower() == 'history':
                show_history(10)
                continue
            
            # ----- 空输入 -----
            if not expr:
                continue
            
            # ----- 计算结果 -----
            result = calculate(expr)
            
            # 显示结果
            print(f"= {result}")
            
            # 保存到数据库
            if db_available:
                save_history(expr, result)
            
            print()
            
        except ZeroDivisionError as e:
            print(e)
            print()
        except ValueError as e:
            print(e)
            print()
        except Exception as e:
            print(f"❌ 发生错误：{e}")
            print()


if __name__ == "__main__":
    main()