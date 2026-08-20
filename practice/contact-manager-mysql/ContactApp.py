import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import mysql.connector
from mysql.connector import Error
import csv
import os
from datetime import datetime

# ==================== 数据库配置 ====================
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'port': 3307,
    'database': 'contacts_db'
}

# ==================== 数据库操作 ====================

def init_database():
    """初始化数据库和表"""
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
        cursor = conn.cursor()
        
        cursor.execute("CREATE DATABASE IF NOT EXISTS contacts_db")
        cursor.execute("USE contacts_db")
        
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            phone VARCHAR(20) NOT NULL UNIQUE,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_name (name),
            INDEX idx_phone (phone)
        )
        """
        cursor.execute(create_table_sql)
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"⚠️ 数据库初始化失败: {e}")
        return False


def check_phone_exists(phone, exclude_id=None):
    """检查电话号码是否已存在"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        if exclude_id:
            sql = "SELECT id FROM contacts WHERE phone = %s AND id != %s"
            cursor.execute(sql, (phone, exclude_id))
        else:
            sql = "SELECT id FROM contacts WHERE phone = %s"
            cursor.execute(sql, (phone,))
        
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        return result is not None
    except Error as e:
        print(f"⚠️ 检查电话失败: {e}")
        return False


def add_contact(name, phone, note):
    """添加联系人（带电话重复校验）"""
    if check_phone_exists(phone):
        return False, f"电话 {phone} 已存在，请勿重复添加"
    
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = "INSERT INTO contacts (name, phone, note) VALUES (%s, %s, %s)"
        cursor.execute(sql, (name, phone, note))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True, "添加成功"
    except Error as e:
        return False, str(e)


def get_all_contacts():
    """获取所有联系人"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = "SELECT id, name, phone, note FROM contacts ORDER BY name"
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return rows
    except Error as e:
        return []


def search_contacts(keyword):
    """搜索联系人（按姓名或电话模糊匹配）"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = """
        SELECT id, name, phone, note FROM contacts 
        WHERE name LIKE %s OR phone LIKE %s
        ORDER BY name
        """
        keyword = f"%{keyword}%"
        cursor.execute(sql, (keyword, keyword))
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return rows
    except Error as e:
        return []


def update_contact(contact_id, name, phone, note):
    """更新联系人（带电话重复校验）"""
    if check_phone_exists(phone, exclude_id=contact_id):
        return False, f"电话 {phone} 已被其他联系人使用"
    
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = "UPDATE contacts SET name = %s, phone = %s, note = %s WHERE id = %s"
        cursor.execute(sql, (name, phone, note, contact_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True, "修改成功"
    except Error as e:
        return False, str(e)


def delete_contact(contact_id):
    """删除联系人"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = "DELETE FROM contacts WHERE id = %s"
        cursor.execute(sql, (contact_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True, "删除成功"
    except Error as e:
        return False, str(e)


def export_all_contacts_to_csv(file_path):
    """导出所有联系人到 CSV 文件"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 查询所有数据
        sql = "SELECT id, name, phone, note, created_at, updated_at FROM contacts ORDER BY name"
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        if not rows:
            return False, "通讯录为空，没有数据可导出"
        
        # 写入 CSV（使用 utf-8-sig 让 Excel 正常显示中文）
        with open(file_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            
            # 写入表头
            writer.writerow(['ID', '姓名', '电话', '备注', '创建时间', '更新时间'])
            
            # 写入数据
            for row in rows:
                writer.writerow(row)
        
        return True, f"成功导出 {len(rows)} 条记录到 {os.path.basename(file_path)}"
    except Error as e:
        return False, str(e)


# ==================== GUI 主程序 ====================

class ContactApp:
    def __init__(self, root):
        self.root = root
        self.root.title("📇 通讯录管理系统")
        self.root.geometry("800x580")
        self.root.resizable(True, True)
        
        self.selected_id = None
        
        if not init_database():
            messagebox.showerror("错误", "数据库初始化失败，请检查 MySQL 连接")
            self.root.quit()
            return
        
        self._create_widgets()
        self.refresh_list()
    
    # ==================== 创建界面 ====================
    
    def _create_widgets(self):
        """创建所有界面组件"""
        
        # ---- 顶部：标题 ----
        title_label = tk.Label(
            self.root,
            text="📇 通讯录管理系统",
            font=("微软雅黑", 18, "bold"),
            fg="#333"
        )
        title_label.pack(pady=10)
        
        # ---- 主框架（左右布局） ----
        main_frame = tk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # ---- 左侧：联系人列表 ----
        left_frame = tk.Frame(main_frame, width=380)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 5))
        
        # 搜索框
        search_frame = tk.Frame(left_frame)
        search_frame.pack(fill=tk.X, pady=(0, 5))
        
        tk.Label(search_frame, text="🔍 搜索:").pack(side=tk.LEFT, padx=(0, 5))
        self.search_entry = tk.Entry(search_frame)
        self.search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        self.search_entry.bind("<KeyRelease>", self.on_search)
        
        btn_search = tk.Button(search_frame, text="搜索", command=self.on_search)
        btn_search.pack(side=tk.RIGHT, padx=(2, 0))
        
        btn_clear_search = tk.Button(search_frame, text="清除", command=self.clear_search)
        btn_clear_search.pack(side=tk.RIGHT, padx=(0, 2))
        
        # 列表（带滚动条）
        list_frame = tk.Frame(left_frame)
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        columns = ("id", "name", "phone", "note")
        self.tree = ttk.Treeview(
            list_frame,
            columns=columns,
            show="headings",
            yscrollcommand=scrollbar.set,
            height=18
        )
        scrollbar.config(command=self.tree.yview)
        
        self.tree.heading("id", text="ID")
        self.tree.heading("name", text="姓名")
        self.tree.heading("phone", text="电话")
        self.tree.heading("note", text="备注")
        
        self.tree.column("id", width=40, anchor=tk.CENTER)
        self.tree.column("name", width=100)
        self.tree.column("phone", width=120)
        self.tree.column("note", width=150)
        
        self.tree.pack(fill=tk.BOTH, expand=True)
        
        self.tree.bind("<<TreeviewSelect>>", self.on_select)
        
        # 显示总数
        self.count_label = tk.Label(left_frame, text="共 0 条记录", fg="#666")
        self.count_label.pack(pady=(5, 0))
        
        # ---- 右侧：操作面板 ----
        right_frame = tk.Frame(main_frame, width=350)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(5, 0))
        
        # 表单区域
        form_frame = tk.LabelFrame(right_frame, text="联系人信息", font=("微软雅黑", 11))
        form_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(form_frame, text="姓名:").grid(row=0, column=0, padx=10, pady=8, sticky=tk.W)
        self.name_entry = tk.Entry(form_frame, width=25)
        self.name_entry.grid(row=0, column=1, padx=10, pady=8)
        
        tk.Label(form_frame, text="电话:").grid(row=1, column=0, padx=10, pady=8, sticky=tk.W)
        self.phone_entry = tk.Entry(form_frame, width=25)
        self.phone_entry.grid(row=1, column=1, padx=10, pady=8)
        
        tk.Label(form_frame, text="备注:").grid(row=2, column=0, padx=10, pady=8, sticky=tk.W)
        self.note_entry = tk.Entry(form_frame, width=25)
        self.note_entry.grid(row=2, column=1, padx=10, pady=8)
        
        # 按钮区域（第一行：增删改查）
        btn_frame = tk.Frame(right_frame)
        btn_frame.pack(fill=tk.X, pady=5)
        
        self.btn_add = tk.Button(
            btn_frame,
            text="➕ 添加",
            command=self.on_add,
            bg="#4CAF50",
            fg="white",
            font=("微软雅黑", 10),
            width=9
        )
        self.btn_add.pack(side=tk.LEFT, padx=3)
        
        self.btn_update = tk.Button(
            btn_frame,
            text="✏️ 修改",
            command=self.on_update,
            bg="#2196F3",
            fg="white",
            font=("微软雅黑", 10),
            width=9
        )
        self.btn_update.pack(side=tk.LEFT, padx=3)
        
        self.btn_delete = tk.Button(
            btn_frame,
            text="🗑️ 删除",
            command=self.on_delete,
            bg="#f44336",
            fg="white",
            font=("微软雅黑", 10),
            width=9
        )
        self.btn_delete.pack(side=tk.LEFT, padx=3)
        
        self.btn_refresh = tk.Button(
            btn_frame,
            text="🔄 刷新",
            command=self.refresh_list,
            bg="#FF9800",
            fg="white",
            font=("微软雅黑", 10),
            width=9
        )
        self.btn_refresh.pack(side=tk.LEFT, padx=3)
        
        # 按钮区域（第二行：导出）
        btn_frame2 = tk.Frame(right_frame)
        btn_frame2.pack(fill=tk.X, pady=5)
        
        self.btn_export = tk.Button(
            btn_frame2,
            text="📤 导出全部",
            command=self.on_export,
            bg="#9C27B0",
            fg="white",
            font=("微软雅黑", 10),
            width=20
        )
        self.btn_export.pack(side=tk.LEFT, padx=3)
        
        # ---- 底部状态栏 ----
        self.status_bar = tk.Label(
            self.root,
            text="就绪",
            anchor=tk.W,
            relief=tk.SUNKEN,
            bd=1,
            fg="#666"
        )
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
    
    # ==================== 功能实现 ====================
    
    def refresh_list(self, keyword=None):
        """刷新联系人列表"""
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        if keyword:
            rows = search_contacts(keyword)
        else:
            rows = get_all_contacts()
        
        for row in rows:
            self.tree.insert("", tk.END, values=row)
        
        self.count_label.config(text=f"共 {len(rows)} 条记录")
        self.status_bar.config(text=f"加载完成，共 {len(rows)} 条记录")
        
        self.selected_id = None
        self._clear_form()
    
    def clear_search(self):
        """清除搜索框并刷新"""
        self.search_entry.delete(0, tk.END)
        self.refresh_list()
    
    def on_search(self, event=None):
        """搜索事件"""
        keyword = self.search_entry.get().strip()
        self.refresh_list(keyword if keyword else None)
    
    def on_select(self, event):
        """选中列表项事件"""
        selected = self.tree.selection()
        if not selected:
            return
        
        values = self.tree.item(selected[0], "values")
        if not values:
            return
        
        self.selected_id = values[0]
        
        self.name_entry.delete(0, tk.END)
        self.name_entry.insert(0, values[1])
        
        self.phone_entry.delete(0, tk.END)
        self.phone_entry.insert(0, values[2])
        
        self.note_entry.delete(0, tk.END)
        self.note_entry.insert(0, values[3] if values[3] else "")
        
        self.status_bar.config(text=f"已选择: {values[1]}")
    
    def _clear_form(self):
        """清空表单"""
        self.name_entry.delete(0, tk.END)
        self.phone_entry.delete(0, tk.END)
        self.note_entry.delete(0, tk.END)
        self.selected_id = None
    
    def _get_form_data(self):
        """获取表单数据"""
        name = self.name_entry.get().strip()
        phone = self.phone_entry.get().strip()
        note = self.note_entry.get().strip()
        
        if not name:
            messagebox.showwarning("提示", "姓名不能为空")
            return None, None, None
        
        if not phone:
            messagebox.showwarning("提示", "电话不能为空")
            return None, None, None
        
        return name, phone, note
    
    def on_add(self):
        """添加联系人"""
        name, phone, note = self._get_form_data()
        if name is None:
            return
        
        success, msg = add_contact(name, phone, note)
        if success:
            messagebox.showinfo("成功", msg)
            self._clear_form()
            self.refresh_list()
        else:
            messagebox.showerror("错误", f"添加失败: {msg}")
    
    def on_update(self):
        """修改联系人"""
        if not self.selected_id:
            messagebox.showwarning("提示", "请先在列表中选择要修改的联系人")
            return
        
        name, phone, note = self._get_form_data()
        if name is None:
            return
        
        if not messagebox.askyesno("确认", "确定要修改该联系人吗？"):
            return
        
        success, msg = update_contact(self.selected_id, name, phone, note)
        if success:
            messagebox.showinfo("成功", msg)
            self._clear_form()
            self.refresh_list()
        else:
            messagebox.showerror("错误", f"修改失败: {msg}")
    
    def on_delete(self):
        """删除联系人"""
        if not self.selected_id:
            messagebox.showwarning("提示", "请先在列表中选择要删除的联系人")
            return
        
        name = self.name_entry.get().strip() or "未命名"
        
        if not messagebox.askyesno("确认", f"确定要删除「{name}」吗？\n此操作不可恢复！"):
            return
        
        success, msg = delete_contact(self.selected_id)
        if success:
            messagebox.showinfo("成功", msg)
            self._clear_form()
            self.refresh_list()
        else:
            messagebox.showerror("错误", f"删除失败: {msg}")
    
    # ==================== ⭐ 导出功能 ====================
    
    def on_export(self):
        """导出全部联系人到 CSV"""
        # 打开保存文件对话框
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        default_filename = f"通讯录_全部_{timestamp}.csv"
        
        file_path = filedialog.asksaveasfilename(
            title="导出通讯录",
            defaultextension=".csv",
            initialfile=default_filename,
            filetypes=[
                ("CSV 文件", "*.csv"),
                ("所有文件", "*.*")
            ]
        )
        
        if not file_path:
            return
        
        success, msg = export_all_contacts_to_csv(file_path)
        
        if success:
            messagebox.showinfo("导出成功", msg)
            self.status_bar.config(text=f"✅ {msg}")
        else:
            messagebox.showerror("导出失败", f"导出失败: {msg}")
            self.status_bar.config(text=f"❌ 导出失败")


# ==================== 程序入口 ====================

if __name__ == "__main__":
    root = tk.Tk()
    app = ContactApp(root)
    root.mainloop()