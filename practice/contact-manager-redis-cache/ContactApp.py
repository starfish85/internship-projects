import csv
import json
import os
from time import perf_counter
from datetime import datetime

import tkinter as tk
from tkinter import ttk, messagebox, filedialog

import mysql.connector
from mysql.connector import Error

try:
    import redis
except ImportError:
    redis = None


DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "123456",
    "port": 3307,
    "database": "contacts_db",
}

REDIS_CONFIG = {
    "host": "127.0.0.1",
    "port": 6379,
    "db": 0,
    "decode_responses": True,
    "socket_connect_timeout": 1,
    "socket_timeout": 1,
    "protocol": 2,
}

CACHE_TTL = 60
CACHE_PREFIX = "contact_app:contacts"
_redis_client = None


def init_database():
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            port=DB_CONFIG["port"],
        )
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS contacts_db")
        cursor.execute("USE contacts_db")
        cursor.execute(
            """
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
        )
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"数据库初始化失败: {e}")
        return False


def get_redis_client():
    global _redis_client
    if redis is None:
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        client = redis.Redis(**REDIS_CONFIG)
        client.ping()
        _redis_client = client
        return _redis_client
    except Exception as e:
        print(f"Redis 不可用，已自动降级为 MySQL 查询: {e}")
        return None


def _cache_key(keyword=None):
    if not keyword:
        return f"{CACHE_PREFIX}:all"
    normalized = keyword.strip().lower()
    return f"{CACHE_PREFIX}:search:{normalized}"


def _serialize_rows(rows):
    return json.dumps([list(row) for row in rows], ensure_ascii=False, default=str)


def _deserialize_rows(payload):
    data = json.loads(payload)
    return [tuple(item) for item in data]


def clear_contact_cache():
    client = get_redis_client()
    if client is None:
        return
    try:
        for key in client.scan_iter(f"{CACHE_PREFIX}:*"):
            client.delete(key)
    except Exception as e:
        print(f"清理 Redis 缓存失败: {e}")


def check_phone_exists(phone, exclude_id=None):
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
        print(f"检查手机号失败: {e}")
        return False


def _fetch_contacts_from_mysql(keyword=None):
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    if keyword:
        cursor.execute(
            """
            SELECT id, name, phone, note
            FROM contacts
            WHERE name LIKE %s OR phone LIKE %s
            ORDER BY name
            """,
            (f"%{keyword}%", f"%{keyword}%"),
        )
    else:
        cursor.execute("SELECT id, name, phone, note FROM contacts ORDER BY name")

    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def load_contacts(keyword=None):
    cache_key = _cache_key(keyword)
    client = get_redis_client()
    redis_ms = None

    if client is not None:
        try:
            t0 = perf_counter()
            cached = client.get(cache_key)
            redis_ms = (perf_counter() - t0) * 1000
            if cached is not None:
                rows = _deserialize_rows(cached)
                return rows, f"Redis命中 {redis_ms:.2f} ms"
        except Exception as e:
            print(f"读取 Redis 缓存失败: {e}")

    t1 = perf_counter()
    rows = _fetch_contacts_from_mysql(keyword)
    mysql_ms = (perf_counter() - t1) * 1000

    if client is not None:
        try:
            client.setex(cache_key, CACHE_TTL, _serialize_rows(rows))
            if redis_ms is None:
                return rows, f"MySQL {mysql_ms:.2f} ms，已写入 Redis 缓存 {CACHE_TTL}s"
            return rows, f"Redis未命中 {redis_ms:.2f} ms -> MySQL {mysql_ms:.2f} ms，已缓存 {CACHE_TTL}s"
        except Exception as e:
            print(f"写入 Redis 缓存失败: {e}")

    return rows, f"MySQL {mysql_ms:.2f} ms"


def get_all_contacts():
    rows, _ = load_contacts(None)
    return rows


def search_contacts(keyword):
    rows, _ = load_contacts(keyword)
    return rows


def add_contact(name, phone, note):
    if check_phone_exists(phone):
        return False, f"电话 {phone} 已存在，请勿重复添加"

    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO contacts (name, phone, note) VALUES (%s, %s, %s)",
            (name, phone, note),
        )
        conn.commit()
        cursor.close()
        conn.close()
        clear_contact_cache()
        return True, "添加成功"
    except Error as e:
        return False, str(e)


def update_contact(contact_id, name, phone, note):
    if check_phone_exists(phone, exclude_id=contact_id):
        return False, f"电话 {phone} 已被其他联系人使用"

    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE contacts SET name = %s, phone = %s, note = %s WHERE id = %s",
            (name, phone, note, contact_id),
        )
        conn.commit()
        cursor.close()
        conn.close()
        clear_contact_cache()
        return True, "修改成功"
    except Error as e:
        return False, str(e)


def delete_contact(contact_id):
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM contacts WHERE id = %s", (contact_id,))
        conn.commit()
        cursor.close()
        conn.close()
        clear_contact_cache()
        return True, "删除成功"
    except Error as e:
        return False, str(e)


def export_all_contacts_to_csv(file_path):
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, phone, note, created_at, updated_at FROM contacts ORDER BY name"
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        if not rows:
            return False, "通讯录为空，没有数据可导出"

        with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["ID", "姓名", "电话", "备注", "创建时间", "更新时间"])
            for row in rows:
                writer.writerow(row)

        return True, f"成功导出 {len(rows)} 条记录到 {os.path.basename(file_path)}"
    except Error as e:
        return False, str(e)


class ContactApp:
    def __init__(self, root):
        self.root = root
        self.root.title("通讯录管理系统")
        self.root.geometry("900x600")
        self.root.resizable(True, True)

        self.selected_id = None

        if not init_database():
            messagebox.showerror("错误", "数据库初始化失败，请检查 MySQL 连接")
            self.root.quit()
            return

        self._create_widgets()
        self.refresh_list()

    def _create_widgets(self):
        title_label = tk.Label(
            self.root,
            text="通讯录管理系统",
            font=("微软雅黑", 18, "bold"),
            fg="#333333",
        )
        title_label.pack(pady=10)

        main_frame = tk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        left_frame = tk.Frame(main_frame, width=430)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 5))

        search_frame = tk.Frame(left_frame)
        search_frame.pack(fill=tk.X, pady=(0, 5))

        tk.Label(search_frame, text="搜索:").pack(side=tk.LEFT, padx=(0, 5))
        self.search_entry = tk.Entry(search_frame)
        self.search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        self.search_entry.bind("<KeyRelease>", self.on_search)

        btn_search = tk.Button(search_frame, text="搜索", command=self.on_search)
        btn_search.pack(side=tk.RIGHT, padx=(2, 0))

        btn_clear_search = tk.Button(
            search_frame, text="清除", command=self.clear_search
        )
        btn_clear_search.pack(side=tk.RIGHT, padx=(0, 2))

        tree_frame = tk.Frame(left_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True)

        columns = ("id", "name", "phone", "note")
        self.tree = ttk.Treeview(
            tree_frame,
            columns=columns,
            show="headings",
            selectmode="browse",
        )
        self.tree.heading("id", text="ID")
        self.tree.heading("name", text="姓名")
        self.tree.heading("phone", text="电话")
        self.tree.heading("note", text="备注")

        self.tree.column("id", width=60, anchor=tk.CENTER)
        self.tree.column("name", width=120, anchor=tk.W)
        self.tree.column("phone", width=120, anchor=tk.W)
        self.tree.column("note", width=160, anchor=tk.W)

        tree_scrollbar = ttk.Scrollbar(
            tree_frame, orient=tk.VERTICAL, command=self.tree.yview
        )
        self.tree.configure(yscrollcommand=tree_scrollbar.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        tree_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.bind("<<TreeviewSelect>>", self.on_select)

        self.count_label = tk.Label(left_frame, text="共 0 条记录", anchor=tk.W)
        self.count_label.pack(fill=tk.X, pady=(5, 0))

        right_frame = tk.Frame(main_frame, width=360)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=(5, 0))

        form_frame = tk.LabelFrame(right_frame, text="联系人信息")
        form_frame.pack(fill=tk.X, pady=(0, 10))

        tk.Label(form_frame, text="姓名").grid(row=0, column=0, sticky=tk.W, padx=8, pady=6)
        self.name_entry = tk.Entry(form_frame, width=28)
        self.name_entry.grid(row=0, column=1, padx=8, pady=6, sticky=tk.EW)

        tk.Label(form_frame, text="电话").grid(row=1, column=0, sticky=tk.W, padx=8, pady=6)
        self.phone_entry = tk.Entry(form_frame, width=28)
        self.phone_entry.grid(row=1, column=1, padx=8, pady=6, sticky=tk.EW)

        tk.Label(form_frame, text="备注").grid(row=2, column=0, sticky=tk.W, padx=8, pady=6)
        self.note_entry = tk.Entry(form_frame, width=28)
        self.note_entry.grid(row=2, column=1, padx=8, pady=6, sticky=tk.EW)

        form_frame.columnconfigure(1, weight=1)

        btn_frame = tk.Frame(right_frame)
        btn_frame.pack(fill=tk.X, pady=5)

        self.btn_add = tk.Button(
            btn_frame, text="添加", command=self.on_add, bg="#4CAF50", fg="white", width=10
        )
        self.btn_add.pack(side=tk.LEFT, padx=3)

        self.btn_update = tk.Button(
            btn_frame, text="修改", command=self.on_update, bg="#2196F3", fg="white", width=10
        )
        self.btn_update.pack(side=tk.LEFT, padx=3)

        self.btn_delete = tk.Button(
            btn_frame, text="删除", command=self.on_delete, bg="#F44336", fg="white", width=10
        )
        self.btn_delete.pack(side=tk.LEFT, padx=3)

        self.btn_refresh = tk.Button(
            btn_frame, text="刷新", command=self.refresh_list, bg="#FF9800", fg="white", width=10
        )
        self.btn_refresh.pack(side=tk.LEFT, padx=3)

        btn_frame2 = tk.Frame(right_frame)
        btn_frame2.pack(fill=tk.X, pady=5)

        self.btn_export = tk.Button(
            btn_frame2,
            text="导出全部",
            command=self.on_export,
            bg="#9C27B0",
            fg="white",
            width=20,
        )
        self.btn_export.pack(side=tk.LEFT, padx=3)

        self.status_bar = tk.Label(
            self.root,
            text="就绪",
            anchor=tk.W,
            relief=tk.SUNKEN,
            bd=1,
            fg="#666666",
        )
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def refresh_list(self, keyword=None):
        for item in self.tree.get_children():
            self.tree.delete(item)

        rows, query_info = load_contacts(keyword)
        for row in rows:
            self.tree.insert("", tk.END, values=row)

        self.count_label.config(text=f"共 {len(rows)} 条记录")
        self.status_bar.config(text=f"{query_info} | 共 {len(rows)} 条记录")

        self.selected_id = None
        self._clear_form()

    def clear_search(self):
        self.search_entry.delete(0, tk.END)
        self.refresh_list()

    def on_search(self, event=None):
        keyword = self.search_entry.get().strip()
        self.refresh_list(keyword if keyword else None)

    def on_select(self, event):
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
        self.note_entry.insert(0, values[3] if len(values) > 3 and values[3] else "")
        self.status_bar.config(text=f"已选择: {values[1]}")

    def _clear_form(self):
        self.name_entry.delete(0, tk.END)
        self.phone_entry.delete(0, tk.END)
        self.note_entry.delete(0, tk.END)
        self.selected_id = None

    def _get_form_data(self):
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
        if not self.selected_id:
            messagebox.showwarning("提示", "请先在列表中选择要删除的联系人")
            return

        name = self.name_entry.get().strip() or "未命名"
        if not messagebox.askyesno("确认", f"确定要删除 {name} 吗？\n此操作不可恢复！"):
            return

        success, msg = delete_contact(self.selected_id)
        if success:
            messagebox.showinfo("成功", msg)
            self._clear_form()
            self.refresh_list()
        else:
            messagebox.showerror("错误", f"删除失败: {msg}")

    def on_export(self):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        default_filename = f"通讯录_全部_{timestamp}.csv"

        file_path = filedialog.asksaveasfilename(
            title="导出通讯录",
            defaultextension=".csv",
            initialfile=default_filename,
            filetypes=[("CSV 文件", "*.csv"), ("所有文件", "*.*")],
        )

        if not file_path:
            return

        success, msg = export_all_contacts_to_csv(file_path)
        if success:
            messagebox.showinfo("导出成功", msg)
            self.status_bar.config(text=msg)
        else:
            messagebox.showerror("导出失败", f"导出失败: {msg}")
            self.status_bar.config(text="导出失败")


if __name__ == "__main__":
    root = tk.Tk()
    app = ContactApp(root)
    root.mainloop()
