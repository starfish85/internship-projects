import tkinter as tk
from tkinter import messagebox, ttk
import mysql.connector
from mysql.connector import Error
import bcrypt
import re
import os
import json
import redis
import threading
import time

# ==================== 数据库配置 ====================
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'port': 3307,
    'database': 'user_db'
}

# ==================== Redis 配置 ====================
REDIS_CONFIG = {
    'host': 'localhost',
    'port': 6379,
    'db': 0,
    'decode_responses': True
}

# ==================== 锁定配置 ====================
MAX_FAILED_ATTEMPTS = 3
LOCK_DURATION_SECONDS = 120  # 2分钟

# ==================== 本地缓存配置 ====================
CACHE_FILE = "login_cache.json"

# 全局redis缓存连接，避免重复创建
_redis_client = None

# ==================== Redis 连接（单例） ====================
def get_redis_connection():
    global _redis_client
    if _redis_client is not None:
        try:
            _redis_client.ping()
            return _redis_client
        except:
            _redis_client = None
    try:
        r = redis.Redis(**REDIS_CONFIG, socket_timeout=0.5, protocol=2)
        r.ping()
        _redis_client = r
        return r
    except Exception as e:
        print(f"⚠️ Redis 连接失败: {e}")
        return None


def get_failed_key(username):
    """生成失败记录 Key"""
    return f"login_failed:{username}"


def get_lock_key(username):
    """生成锁定 Key"""
    return f"login_locked:{username}"


def record_failed_attempt(username):
    """
    记录失败尝试
    返回: (是否被锁定, 剩余锁定秒数, 当前失败次数)
    """
    r = get_redis_connection()
    if not r:
        return False, 0, 0
    
    failed_key = get_failed_key(username)
    lock_key = get_lock_key(username)
    
    # 检查是否已被锁定
    lock_ttl = r.ttl(lock_key)
    if lock_ttl > 0:
        return True, lock_ttl, 0
    
    # 增加失败次数
    attempts = r.incr(failed_key)
    
    # 设置过期时间（如果第一次失败）
    if attempts == 1:
        r.expire(failed_key, 300)  # 5分钟内连续失败才计数
    
    # 如果达到阈值，锁定账号
    if attempts >= MAX_FAILED_ATTEMPTS:
        r.setex(lock_key, LOCK_DURATION_SECONDS, "locked")
        r.delete(failed_key)  # 清除失败计数
        return True, LOCK_DURATION_SECONDS, attempts
    
    return False, 0, attempts


def reset_failed_attempts(username):
    """重置失败记录（登录成功后调用）"""
    r = get_redis_connection()
    if not r:
        return
    
    failed_key = get_failed_key(username)
    lock_key = get_lock_key(username)
    r.delete(failed_key, lock_key)


def get_lock_status(username):
    """获取锁定状态"""
    r = get_redis_connection()
    if not r:
        return False, 0
    
    lock_key = get_lock_key(username)
    ttl = r.ttl(lock_key)
    if ttl > 0:
        return True, ttl
    return False, 0


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
        
        cursor.execute("CREATE DATABASE IF NOT EXISTS user_db")
        cursor.execute("USE user_db")
        
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_username (username),
            INDEX idx_email (email)
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


def register_user(username, password, email):
    """注册用户"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return False, "用户名已存在"
        
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return False, "邮箱已被注册"
        
        salt = bcrypt.gensalt(rounds=12)
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
        
        sql = "INSERT INTO users (username, password, email) VALUES (%s, %s, %s)"
        cursor.execute(sql, (username, hashed_password.decode('utf-8'), email))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True, "注册成功！"
        
    except Error as e:
        return False, f"数据库错误: {e}"


def login_user(username, password):
    """
    登录验证（带失败次数记录）
    """
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = "SELECT id, username, password FROM users WHERE username = %s"
        cursor.execute(sql, (username,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            # 用户名不存在，也记录一次失败（防止暴力破解）
            record_failed_attempt(username)
            return False, "用户名或密码错误"
        
        user_id, db_username, hashed_password = user
        
        # 验证密码
        if bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8')):
            # 登录成功，重置失败记录
            reset_failed_attempts(username)
            return True, db_username
        else:
            # 密码错误，记录失败
            record_failed_attempt(username)
            return False, "用户名或密码错误"
            
    except Error as e:
        return False, f"数据库错误: {e}"


def validate_email(email):
    """简单验证邮箱格式"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


# ==================== 缓存操作 ====================

def save_login_cache(username):
    """保存登录状态到本地缓存"""
    try:
        data = {'username': username, 'remember': True}
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存缓存失败: {e}")
        return False


def load_login_cache():
    """从本地缓存读取登录状态"""
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if data.get('remember', False):
                return data.get('username')
        return None
    except Exception as e:
        print(f"读取缓存失败: {e}")
        return None


def clear_login_cache():
    """清除本地缓存"""
    try:
        if os.path.exists(CACHE_FILE):
            os.remove(CACHE_FILE)
        return True
    except Exception as e:
        print(f"清除缓存失败: {e}")
        return False


# ==================== 主应用类 ====================

class LoginApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🔐 用户登录系统")
        self.root.geometry("420x450")
        self.root.resizable(False, False)
        self.lock_timer_id = None  # 存储倒计时定时器ID，用于销毁
        
        # 初始化数据库
        if not init_database():
            messagebox.showerror("错误", "数据库初始化失败，请检查 MySQL 连接")
            self.root.quit()
            return
        
        # 当前登录用户
        self.current_user = None
        
        # 创建界面
        self._create_widgets()
        
        # 默认显示登录界面
        self.show_login()
        
        # 自动登录检测
        self._check_auto_login()
    
    # ==================== 创建界面 ====================
    
    def _create_widgets(self):
        """居中版界面布局"""
        self.main_frame = tk.Frame(self.root)
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        self.main_frame.columnconfigure(0, weight=1)

        # 标题
        self.title_label = tk.Label(
            self.main_frame,
            text="🔐 用户登录系统",
            font=("微软雅黑", 20, "bold"),
            fg="#333"
        )
        self.title_label.grid(row=0, column=0, pady=(25, 15))

        # 切换按钮栏
        self.switch_frame = tk.Frame(self.main_frame)
        self.switch_frame.grid(row=1, column=0, pady=(0, 10))

        self.btn_login_tab = tk.Button(
            self.switch_frame,
            text="登录",
            command=self.show_login,
            font=("微软雅黑", 11),
            bg="#2196F3",
            fg="white",
            width=12
        )
        self.btn_login_tab.pack(side=tk.LEFT, padx=5)

        self.btn_register_tab = tk.Button(
            self.switch_frame,
            text="注册",
            command=self.show_register,
            font=("微软雅黑", 11),
            bg="#4CAF50",
            fg="white",
            width=12
        )
        self.btn_register_tab.pack(side=tk.LEFT, padx=5)

        # ========== ⭐ 锁定提示栏 ==========
        self.lock_frame = tk.Frame(self.main_frame)
        self.lock_frame.grid(row=2, column=0, pady=(0, 5))

        self.lock_label = tk.Label(
            self.lock_frame,
            text="",
            font=("微软雅黑", 10),
            fg="#f44336"
        )
        self.lock_label.pack()

        # ========== 登录界面 ==========
        self.login_frame = tk.Frame(self.main_frame)
        self.login_frame.columnconfigure(0, weight=1)
        self.login_frame.columnconfigure(1, weight=1)

        tk.Label(self.login_frame, text="用户名:", font=("微软雅黑", 11)).grid(
            row=0, column=0, padx=5, pady=12, sticky=tk.E
        )
        self.login_username = tk.Entry(self.login_frame, font=("微软雅黑", 11), width=25)
        self.login_username.grid(row=0, column=1, padx=5, pady=12, sticky=tk.W)
        self.login_username.bind("<Return>", lambda e: self.do_login())
        self.login_username.bind("<KeyRelease>", self._on_username_change)

        tk.Label(self.login_frame, text="密码:", font=("微软雅黑", 11)).grid(
            row=1, column=0, padx=5, pady=12, sticky=tk.E
        )
        self.login_password = tk.Entry(self.login_frame, font=("微软雅黑", 11), width=25, show="*")
        self.login_password.grid(row=1, column=1, padx=5, pady=12, sticky=tk.W)
        self.login_password.bind("<Return>", lambda e: self.do_login())

        # 记住我复选框
        self.remember_var = tk.IntVar(value=1)
        self.remember_check = tk.Checkbutton(
            self.login_frame,
            text="记住我",
            variable=self.remember_var,
            font=("微软雅黑", 10),
            anchor=tk.W
        )
        self.remember_check.grid(row=2, column=0, columnspan=2, padx=30, pady=(0, 5), sticky=tk.W)

        self.btn_login = tk.Button(
            self.login_frame,
            text="登录",
            command=self.do_login,
            font=("微软雅黑", 12),
            bg="#2196F3",
            fg="white",
            width=20
        )
        self.btn_login.grid(row=3, column=0, columnspan=2, pady=10)

        # 错误提示
        self.error_label = tk.Label(
            self.login_frame,
            text="",
            font=("微软雅黑", 9),
            fg="#f44336"
        )
        self.error_label.grid(row=4, column=0, columnspan=2)

        # ========== 注册界面 ==========
        self.register_frame = tk.Frame(self.main_frame)
        self.register_frame.columnconfigure(0, weight=1)
        self.register_frame.columnconfigure(1, weight=1)

        tk.Label(self.register_frame, text="用户名:", font=("微软雅黑", 11)).grid(
            row=0, column=0, padx=5, pady=8, sticky=tk.E
        )
        self.reg_username = tk.Entry(self.register_frame, font=("微软雅黑", 11), width=25)
        self.reg_username.grid(row=0, column=1, padx=5, pady=8, sticky=tk.W)
        self.reg_username.bind("<Return>", lambda e: self.do_register())

        tk.Label(self.register_frame, text="密码:", font=("微软雅黑", 11)).grid(
            row=1, column=0, padx=5, pady=8, sticky=tk.E
        )
        self.reg_password = tk.Entry(self.register_frame, font=("微软雅黑", 11), width=25, show="*")
        self.reg_password.grid(row=1, column=1, padx=5, pady=8, sticky=tk.W)
        self.reg_password.bind("<Return>", lambda e: self.do_register())

        tk.Label(self.register_frame, text="确认密码:", font=("微软雅黑", 11)).grid(
            row=2, column=0, padx=5, pady=8, sticky=tk.E
        )
        self.reg_confirm = tk.Entry(self.register_frame, font=("微软雅黑", 11), width=25, show="*")
        self.reg_confirm.grid(row=2, column=1, padx=5, pady=8, sticky=tk.W)
        self.reg_confirm.bind("<Return>", lambda e: self.do_register())

        tk.Label(self.register_frame, text="邮箱:", font=("微软雅黑", 11)).grid(
            row=3, column=0, padx=5, pady=8, sticky=tk.E
        )
        self.reg_email = tk.Entry(self.register_frame, font=("微软雅黑", 11), width=25)
        self.reg_email.grid(row=3, column=1, padx=5, pady=8, sticky=tk.W)
        self.reg_email.bind("<Return>", lambda e: self.do_register())

        self.btn_register = tk.Button(
            self.register_frame,
            text="注册",
            command=self.do_register,
            font=("微软雅黑", 12),
            bg="#4CAF50",
            fg="white",
            width=20
        )
        self.btn_register.grid(row=4, column=0, columnspan=2, pady=15)

        # 提示文字
        self.hint_label = tk.Label(
            self.main_frame,
            text="",
            font=("微软雅黑", 10),
            fg="#666"
        )
        self.hint_label.grid(row=5, column=0, pady=(5, 0))

        # ========== 欢迎界面 ==========
        self.welcome_frame = tk.Frame(self.main_frame)
        self.welcome_frame.columnconfigure(0, weight=1)

        self.welcome_label = tk.Label(
            self.welcome_frame,
            text="",
            font=("微软雅黑", 18, "bold"),
            fg="#4CAF50"
        )
        self.welcome_label.grid(row=0, column=0, pady=40)

        self.welcome_sub_label = tk.Label(
            self.welcome_frame,
            text="登录成功！",
            font=("微软雅黑", 12),
            fg="#666"
        )
        self.welcome_sub_label.grid(row=1, column=0, pady=10)

        self.btn_logout = tk.Button(
            self.welcome_frame,
            text="退出登录",
            command=self.logout,
            font=("微软雅黑", 11),
            bg="#f44336",
            fg="white",
            width=15
        )
        self.btn_logout.grid(row=2, column=0, pady=30)

    # ==================== 界面切换 ====================
    
    def show_login(self):
        """显示登录界面"""
        # 销毁旧倒计时定时器，防止堆积卡死
        if self.lock_timer_id is not None:
            self.root.after_cancel(self.lock_timer_id)
            self.lock_timer_id = None
            
        self.register_frame.grid_forget()
        self.welcome_frame.grid_forget()
        self.lock_frame.grid(row=2, column=0, pady=(0, 5))
        self.login_frame.grid(row=3, column=0, pady=5)
        
        self.hint_label.config(text="")
        self.title_label.config(text="🔐 用户登录系统")
        self.error_label.config(text="")
        self.lock_label.config(text="")
        
        # 异步检查锁定状态，不阻塞界面
        username = self.login_username.get().strip()
        if username:
            threading.Thread(target=self._async_check_lock, args=(username,), daemon=True).start()
        
        self.login_username.focus()
        
        cached_user = load_login_cache()
        if cached_user:
            self.login_username.delete(0, tk.END)
            self.login_username.insert(0, cached_user)
            self.login_password.focus()
        else:
            self.login_username.delete(0, tk.END)
            self.login_password.delete(0, tk.END)

    def show_register(self):
        """显示注册界面"""
        if self.lock_timer_id is not None:
            self.root.after_cancel(self.lock_timer_id)
            self.lock_timer_id = None
            
        self.login_frame.grid_forget()
        self.welcome_frame.grid_forget()
        self.lock_frame.grid_forget()
        self.register_frame.grid(row=2, column=0, pady=5)
        self.hint_label.config(text="")
        self.title_label.config(text="📝 注册新账号")
        self.error_label.config(text="")
        self.lock_label.config(text="")
        self.reg_username.focus()
        self.reg_username.delete(0, tk.END)
        self.reg_password.delete(0, tk.END)
        self.reg_confirm.delete(0, tk.END)
        self.reg_email.delete(0, tk.END)

    def show_welcome(self, username):
        """显示欢迎界面"""
        if self.lock_timer_id is not None:
            self.root.after_cancel(self.lock_timer_id)
            self.lock_timer_id = None
            
        self.login_frame.grid_forget()
        self.register_frame.grid_forget()
        self.lock_frame.grid_forget()
        self.welcome_frame.grid(row=2, column=0, pady=5)
        self.title_label.config(text="👋 欢迎回来")
        self.welcome_label.config(text=f"欢迎你，{username} ！")
        self.hint_label.config(text="")
        self.current_user = username

    # ==================== ⭐ 异步锁定检查（解决主线程阻塞） ====================
    def _async_check_lock(self, username):
        """子线程查询锁定状态，避免阻塞GUI"""
        is_locked, ttl = get_lock_status(username)
        # 切回主线程更新UI
        self.root.after(0, self._update_lock_ui, is_locked, ttl, username)
        
    def _update_lock_ui(self, is_locked, ttl, username):
        """主线程更新锁定提示UI"""
        if is_locked and ttl > 0:
            minutes = ttl // 60
            seconds = ttl % 60
            self.lock_label.config(text=f"🔒 账号已锁定，请等待 {minutes}分{seconds}秒 后重试")
            self.btn_login.config(state=tk.DISABLED)
            # 只保存一个定时器ID，避免无限递归堆积
            if self.lock_timer_id is not None:
                self.root.after_cancel(self.lock_timer_id)
            self.lock_timer_id = self.root.after(1000, lambda: self._countdown_tick(username))
        else:
            self.lock_label.config(text="")
            self.btn_login.config(state=tk.NORMAL)
            if self.lock_timer_id is not None:
                self.root.after_cancel(self.lock_timer_id)
                self.lock_timer_id = None

    def _countdown_tick(self, username):
        """单次倒计时，不递归无限创建"""
        threading.Thread(target=self._async_check_lock, args=(username,), daemon=True).start()

    def _on_username_change(self, event):
        """用户名输入变化时异步检查锁定状态"""
        username = self.login_username.get().strip()
        if username:
            threading.Thread(target=self._async_check_lock, args=(username,), daemon=True).start()

    # ==================== 自动登录 ====================
    
    def _check_auto_login(self):
        """检查是否有缓存，自动登录"""
        cached_user = load_login_cache()
        if cached_user:
            # 异步查询锁定
            def task():
                is_locked, _ = get_lock_status(cached_user)
                if is_locked:
                    self.root.after(0, lambda: self.hint_label.config(text="⚠️ 账号已被锁定，请等待解锁"))
                    return
                self.root.after(0, lambda: self.show_welcome(cached_user))
                self.root.after(0, lambda: self.hint_label.config(text="✅ 已自动登录（缓存）"))
            threading.Thread(target=task, daemon=True).start()
        else:
            self.hint_label.config(text="")

    # ==================== 功能实现 ====================
    
    def do_login(self):
        """执行登录"""
        username = self.login_username.get().strip()
        password = self.login_password.get()
        remember = self.remember_var.get() == 1

        if not username or not password:
            messagebox.showwarning("提示", "请输入用户名和密码")
            return

        # 异步校验锁定状态，防止卡顿
        def login_task():
            is_locked, ttl = get_lock_status(username)
            if is_locked:
                minutes = ttl // 60
                seconds = ttl % 60
                self.root.after(0, lambda: messagebox.showwarning("账号已锁定", f"该账号已被锁定，请等待 {minutes}分{seconds}秒 后重试"))
                self.root.after(0, lambda: self._async_check_lock(username))
                return
            
            success, result = login_user(username, password)
            def ui_update():
                if success:
                    # 重置失败记录
                    reset_failed_attempts(username)
                    if remember:
                        save_login_cache(username)
                    else:
                        clear_login_cache()
                    self.show_welcome(result)
                    self.hint_label.config(text="✅ 登录成功")
                else:
                    # 检查是否因为锁定而失败
                    is_locked_after, ttl_after = get_lock_status(username)
                    if is_locked_after:
                        minutes = ttl_after // 60
                        seconds = ttl_after % 60
                        messagebox.showerror("账号已锁定", f"连续输错密码超过 {MAX_FAILED_ATTEMPTS} 次\n账号已被锁定 {minutes}分{seconds}秒")
                        self._async_check_lock(username)
                    else:
                        messagebox.showerror("登录失败", result)
                    self.login_password.delete(0, tk.END)
                    self.login_password.focus()
            self.root.after(0, ui_update)
        threading.Thread(target=login_task, daemon=True).start()

    def do_register(self):
        """执行注册"""
        username = self.reg_username.get().strip()
        password = self.reg_password.get()
        confirm = self.reg_confirm.get()
        email = self.reg_email.get().strip()

        if not username:
            messagebox.showwarning("提示", "请输入用户名")
            self.reg_username.focus()
            return

        if len(username) < 3:
            messagebox.showwarning("提示", "用户名至少3个字符")
            self.reg_username.focus()
            return

        if not password:
            messagebox.showwarning("提示", "请输入密码")
            self.reg_password.focus()
            return

        if len(password) < 6:
            messagebox.showwarning("提示", "密码至少6个字符")
            self.reg_password.focus()
            return

        if password != confirm:
            messagebox.showwarning("提示", "两次密码输入不一致")
            self.reg_confirm.delete(0, tk.END)
            self.reg_confirm.focus()
            return

        if not email:
            messagebox.showwarning("提示", "请输入邮箱")
            self.reg_email.focus()
            return

        if not validate_email(email):
            messagebox.showwarning("提示", "邮箱格式不正确")
            self.reg_email.focus()
            return

        def reg_task():
            success, result = register_user(username, password, email)
            def ui_update():
                if success:
                    messagebox.showinfo("注册成功", f"✅ {result}\n\n请点击「登录」标签登录")
                    self.show_login()
                    self.login_username.insert(0, username)
                    self.login_password.focus()
                else:
                    messagebox.showerror("注册失败", result)
            self.root.after(0, ui_update)
        threading.Thread(target=reg_task, daemon=True).start()

    def logout(self):
        """退出登录并清除缓存"""
        self.current_user = None
        clear_login_cache()
        self.show_login()
        self.hint_label.config(text="已退出登录，缓存已清除")


# ==================== 程序入口 ====================

if __name__ == "__main__":
    root = tk.Tk()
    app = LoginApp(root)
    root.mainloop()