import mysql.connector
from mysql.connector import Error

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='123456',
        port=3307,
        database='clock_db'
    )
    
    if conn.is_connected():
        print("✅ MySQL 连接成功！")
        print("📊 数据库版本:", conn.get_server_info())
        conn.close()
        
except Error as e:
    print(f"❌ 连接失败: {e}")