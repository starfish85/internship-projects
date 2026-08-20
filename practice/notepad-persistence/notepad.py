import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, simpledialog
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
    'database': 'note_db'
}

# ==================== 数据库操作 ====================

def init_history_table():
    """初始化数据库和表（如果不存在则创建）"""
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
        cursor = conn.cursor()
        
        # 创建数据库
        cursor.execute("CREATE DATABASE IF NOT EXISTS note_db")
        cursor.execute("USE note_db")
        
        # 创建表
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS note_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500),
            content_summary VARCHAR(255) NOT NULL,
            content_length INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_file_name (file_name),
            INDEX idx_created_at (created_at)
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


def save_note_history(file_name, file_path, content):
    """保存笔记历史记录到数据库"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 生成摘要（前50字，去除首尾空白）
        content_clean = content.strip()
        content_length = len(content_clean)
        summary = content_clean[:50] if len(content_clean) > 50 else content_clean
        # 如果内容为空，摘要显示为"(空文档)"
        if not summary:
            summary = "(空文档)"
        
        sql = """
        INSERT INTO note_history (file_name, file_path, content_summary, content_length)
        VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (file_name, file_path, summary, content_length))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"⚠️ 保存历史记录失败: {e}")
        return False


def show_history_from_db():
    """从数据库查询并显示历史记录"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = """
        SELECT id, file_name, content_summary, content_length, created_at
        FROM note_history
        ORDER BY created_at DESC
        LIMIT 20
        """
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        if not rows:
            return "📭 暂无历史记录\n"
        
        result = "=" * 70 + "\n"
        result += "   📜 最近20条保存历史\n"
        result += "=" * 70 + "\n\n"
        
        for row in rows:
            result += f"   #{row[0]}  {row[4].strftime('%Y-%m-%d %H:%M:%S')}\n"
            result += f"   📄 {row[1]}\n"
            result += f"   📝 {row[2]}\n"
            result += f"   📊 共 {row[3]} 字\n"
            result += "-" * 70 + "\n"
        
        return result
    except Error as e:
        return f"⚠️ 读取历史记录失败: {e}"


# ==================== 记事本主类 ====================

class Notepad:
    def __init__(self, root):
        """初始化记事本"""
        self.root = root
        self.root.title("📝 记事本 - 未命名")
        self.root.geometry("900x650")
        
        # 当前文件路径（None 表示新建文件）
        self.current_file = None
        
        # 当前内容（用于判断是否有修改）
        self.last_saved_content = ""

        # -------------------------- 修复点：先创建所有界面组件（包含状态栏）--------------------------
        self._create_menu()
        self._create_toolbar()
        self._create_text_widget()
        self._create_status_bar()  # 先实例化 status_bar，再调用_update_status
        
        # 绑定快捷键
        self._bind_shortcuts()
        
        # 绑定窗口关闭事件
        self.root.protocol("WM_DELETE_WINDOW", self.quit_app)
        
        # 设置窗口图标（可选）
        try:
            self.root.iconbitmap(default='notepad.ico')
        except:
            pass

        # -------------------------- 后初始化数据库、更新状态栏文字 --------------------------
        self.db_available = init_history_table()
        if self.db_available:
            self._update_status("✅ 数据库已连接，历史记录已开启")
        else:
            self._update_status("⚠️ 数据库未连接，历史记录不可用")
    
    # ==================== 创建界面组件 ====================
    
    def _create_menu(self):
        """创建菜单栏"""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)
        
        # ----- 文件菜单 -----
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="文件", menu=file_menu)
        file_menu.add_command(label="新建", command=self.new_file, accelerator="Ctrl+N")
        file_menu.add_command(label="打开", command=self.open_file, accelerator="Ctrl+O")
        file_menu.add_command(label="保存", command=self.save_file, accelerator="Ctrl+S")
        file_menu.add_command(label="另存为", command=self.save_as_file, accelerator="Ctrl+Shift+S")
        file_menu.add_separator()
        file_menu.add_command(label="查看历史", command=self.show_history, accelerator="Ctrl+H")
        file_menu.add_separator()
        file_menu.add_command(label="退出", command=self.quit_app, accelerator="Ctrl+Q")
        
        # ----- 编辑菜单 -----
        edit_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="编辑", menu=edit_menu)
        edit_menu.add_command(label="撤销", command=self.undo, accelerator="Ctrl+Z")
        edit_menu.add_separator()
        edit_menu.add_command(label="剪切", command=self.cut, accelerator="Ctrl+X")
        edit_menu.add_command(label="复制", command=self.copy, accelerator="Ctrl+C")
        edit_menu.add_command(label="粘贴", command=self.paste, accelerator="Ctrl+V")
        edit_menu.add_command(label="删除", command=self.delete_selection, accelerator="Delete")
        edit_menu.add_separator()
        edit_menu.add_command(label="查找", command=self.show_find_dialog, accelerator="Ctrl+F")
        edit_menu.add_separator()
        edit_menu.add_command(label="全选", command=self.select_all, accelerator="Ctrl+A")
        
        # ----- 格式菜单 -----
        format_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="格式", menu=format_menu)
        format_menu.add_command(label="字体", command=self.change_font)
        format_menu.add_command(label="自动换行", command=self.toggle_word_wrap)
        
        # ----- 帮助菜单 -----
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="帮助", menu=help_menu)
        help_menu.add_command(label="关于", command=self.show_about)
    
    def _create_toolbar(self):
        """创建工具栏"""
        toolbar = tk.Frame(self.root, relief=tk.RAISED, bd=1)
        toolbar.pack(side=tk.TOP, fill=tk.X)
        
        # 工具按钮
        btn_new = tk.Button(toolbar, text="新建", command=self.new_file)
        btn_new.pack(side=tk.LEFT, padx=2, pady=2)
        
        btn_open = tk.Button(toolbar, text="打开", command=self.open_file)
        btn_open.pack(side=tk.LEFT, padx=2, pady=2)
        
        btn_save = tk.Button(toolbar, text="保存", command=self.save_file)
        btn_save.pack(side=tk.LEFT, padx=2, pady=2)
        
        tk.Label(toolbar, text="|").pack(side=tk.LEFT, padx=5)
        
        btn_cut = tk.Button(toolbar, text="剪切", command=self.cut)
        btn_cut.pack(side=tk.LEFT, padx=2, pady=2)
        
        btn_copy = tk.Button(toolbar, text="复制", command=self.copy)
        btn_copy.pack(side=tk.LEFT, padx=2, pady=2)
        
        btn_paste = tk.Button(toolbar, text="粘贴", command=self.paste)
        btn_paste.pack(side=tk.LEFT, padx=2, pady=2)
        
        tk.Label(toolbar, text="|").pack(side=tk.LEFT, padx=5)
        
        btn_find = tk.Button(toolbar, text="查找", command=self.show_find_dialog)
        btn_find.pack(side=tk.LEFT, padx=2, pady=2)
        
        btn_history = tk.Button(toolbar, text="历史", command=self.show_history)
        btn_history.pack(side=tk.LEFT, padx=2, pady=2)
    
    def _create_text_widget(self):
        """创建文本编辑区域"""
        self.text_widget = scrolledtext.ScrolledText(
            self.root,
            wrap=tk.WORD,
            font=("微软雅黑", 12),
            undo=True,
            maxundo=100
        )
        self.text_widget.pack(fill=tk.BOTH, expand=True)
    
    def _create_status_bar(self):
        """创建状态栏"""
        self.status_bar = tk.Label(
            self.root,
            text="就绪",
            anchor=tk.W,
            relief=tk.SUNKEN,
            bd=1
        )
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
    
    def _bind_shortcuts(self):
        """绑定快捷键"""
        self.root.bind("<Control-n>", lambda e: self.new_file())
        self.root.bind("<Control-o>", lambda e: self.open_file())
        self.root.bind("<Control-s>", lambda e: self.save_file())
        self.root.bind("<Control-S>", lambda e: self.save_as_file())
        self.root.bind("<Control-q>", lambda e: self.quit_app())
        
        self.root.bind("<Control-z>", lambda e: self.undo())
        self.root.bind("<Control-x>", lambda e: self.cut())
        self.root.bind("<Control-c>", lambda e: self.copy())
        self.root.bind("<Control-v>", lambda e: self.paste())
        self.root.bind("<Control-f>", lambda e: self.show_find_dialog())
        self.root.bind("<Control-h>", lambda e: self.show_history())
        self.root.bind("<Control-a>", lambda e: self.select_all())
    
    # ==================== 文件操作 ====================
    
    def new_file(self):
        """新建文件"""
        if self._check_save():
            self.text_widget.delete("1.0", tk.END)
            self.current_file = None
            self.last_saved_content = ""
            self.root.title("📝 记事本 - 未命名")
            self._update_status("新建文件")
    
    def open_file(self):
        """打开文件"""
        if not self._check_save():
            return
        
        file_path = filedialog.askopenfilename(
            title="打开文件",
            filetypes=[
                ("文本文件", "*.txt"),
                ("所有文件", "*.*")
            ]
        )
        
        if not file_path:
            return
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            self.text_widget.delete("1.0", tk.END)
            self.text_widget.insert("1.0", content)
            self.current_file = file_path
            self.last_saved_content = content
            self.root.title(f"📝 记事本 - {os.path.basename(file_path)}")
            self._update_status(f"已打开: {file_path}")
            
        except Exception as e:
            messagebox.showerror("错误", f"无法打开文件:\n{str(e)}")
    
    def save_file(self):
        """保存文件（核心：保存前记录到MySQL）"""
        if self.current_file:
            self._save_to_file(self.current_file)
        else:
            self.save_as_file()
    
    def save_as_file(self):
        """另存为"""
        file_path = filedialog.asksaveasfilename(
            title="保存文件",
            defaultextension=".txt",
            filetypes=[
                ("文本文件", "*.txt"),
                ("所有文件", "*.*")
            ]
        )
        
        if not file_path:
            return
        
        self._save_to_file(file_path)
    
    def _save_to_file(self, file_path):
        """保存到指定文件"""
        try:
            content = self.text_widget.get("1.0", tk.END)
            
            # 写入文件
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            
            # 更新状态
            self.current_file = file_path
            self.last_saved_content = content
            self.root.title(f"📝 记事本 - {os.path.basename(file_path)}")
            self._update_status(f"已保存: {file_path}")
            
            # ========== ⭐ 新增：保存历史记录到MySQL ==========
            if self.db_available:
                file_name = os.path.basename(file_path)
                if save_note_history(file_name, file_path, content):
                    self._update_status(f"已保存: {file_path} ✅ 历史已记录")
                else:
                    self._update_status(f"已保存: {file_path} ⚠️ 历史记录失败")
            
            # 显示保存成功提示
            if self.db_available:
                # 显示摘要信息
                content_clean = content.strip()
                summary = content_clean[:30] if len(content_clean) > 30 else content_clean
                if not summary:
                    summary = "(空文档)"
                messagebox.showinfo("保存成功", 
                    f"✅ 文件已保存\n\n"
                    f"📄 文件名: {os.path.basename(file_path)}\n"
                    f"📝 摘要: {summary}...\n"
                    f"📊 字数: {len(content_clean)} 字\n"
                    f"💾 已存入数据库: note_db.note_history"
                )
            
        except Exception as e:
            messagebox.showerror("错误", f"无法保存文件:\n{str(e)}")
    
    def _check_save(self):
        """检查是否需要保存"""
        current_content = self.text_widget.get("1.0", tk.END)
        if current_content.strip() and current_content != self.last_saved_content:
            result = messagebox.askyesnocancel(
                "记事本",
                "当前内容未保存，是否保存？"
            )
            if result is None:
                return False
            elif result:
                self.save_file()
        return True
    
    def quit_app(self):
        """退出程序"""
        if self._check_save():
            self.root.quit()
    
    # ==================== 编辑操作 ====================
    
    def undo(self):
        try:
            self.text_widget.edit_undo()
        except:
            pass
    
    def cut(self):
        self.copy()
        self.delete_selection()
    
    def copy(self):
        try:
            self.root.clipboard_clear()
            text = self.text_widget.selection_get()
            self.root.clipboard_append(text)
        except tk.TclError:
            pass
    
    def paste(self):
        try:
            text = self.root.clipboard_get()
            self.text_widget.insert(tk.INSERT, text)
        except tk.TclError:
            pass
    
    def delete_selection(self):
        try:
            self.text_widget.delete(tk.SEL_FIRST, tk.SEL_LAST)
        except tk.TclError:
            pass
    
    def select_all(self):
        self.text_widget.tag_add(tk.SEL, "1.0", tk.END)
        self.text_widget.mark_set(tk.INSERT, "1.0")
        self.text_widget.see(tk.INSERT)
    
    # ==================== 查找与替换 ====================
    
    def show_find_dialog(self):
        self._find_replace_dialog(is_replace=False)
    
    def _find_replace_dialog(self, is_replace):
        """查找/替换对话框"""
        dialog = tk.Toplevel(self.root)
        dialog.title("查找" if not is_replace else "查找与替换")
        dialog.geometry("400x200")
        dialog.resizable(False, False)
        
        dialog.transient(self.root)
        dialog.grab_set()
        
        tk.Label(dialog, text="查找:").grid(row=0, column=0, padx=10, pady=10, sticky=tk.W)
        entry_find = tk.Entry(dialog, width=30)
        entry_find.grid(row=0, column=1, padx=10, pady=10)
        entry_find.focus()
        
        entry_replace = None
        if is_replace:
            tk.Label(dialog, text="替换为:").grid(row=1, column=0, padx=10, pady=10, sticky=tk.W)
            entry_replace = tk.Entry(dialog, width=30)
            entry_replace.grid(row=1, column=1, padx=10, pady=10)
        
        var_nocase = tk.IntVar()
        tk.Checkbutton(dialog, text="不区分大小写", variable=var_nocase).grid(
            row=2 if not is_replace else 3, column=0, columnspan=2, padx=10, pady=5, sticky=tk.W
        )
        
        button_frame = tk.Frame(dialog)
        button_frame.grid(row=3 if not is_replace else 4, column=0, columnspan=2, pady=10)
        
        def do_find():
            target = entry_find.get()
            if not target:
                return
            
            start = "1.0"
            if self.text_widget.tag_ranges(tk.SEL):
                start = self.text_widget.index(tk.SEL_END)
            
            options = {}
            if var_nocase.get():
                options['nocase'] = True
            
            pos = self.text_widget.search(target, start, tk.END, **options)
            
            if pos:
                end = f"{pos}+{len(target)}c"
                self.text_widget.tag_remove(tk.SEL, "1.0", tk.END)
                self.text_widget.tag_add(tk.SEL, pos, end)
                self.text_widget.mark_set(tk.INSERT, end)
                self.text_widget.see(pos)
                self._update_status(f"找到: {target}")
            else:
                messagebox.showinfo("记事本", f"未找到: {target}")
        
        def do_replace():
            if not is_replace:
                return
            target = entry_find.get()
            replacement = entry_replace.get()
            
            if not target:
                return
            
            options = {}
            if var_nocase.get():
                options['nocase'] = True
            
            try:
                pos = self.text_widget.index(tk.SEL_FIRST)
                end = self.text_widget.index(tk.SEL_LAST)
                selected_text = self.text_widget.get(pos, end)
                compare_func = str.casefold if var_nocase.get() else str.__eq__
                if compare_func(selected_text, target):
                    self.text_widget.delete(pos, end)
                    self.text_widget.insert(pos, replacement)
                    self._update_status(f"已替换: {target} → {replacement}")
                    return
            except tk.TclError:
                pass
            
            start = self.text_widget.index(tk.INSERT)
            pos = self.text_widget.search(target, start, tk.END,** options)
            
            if pos:
                end = f"{pos}+{len(target)}c"
                self.text_widget.delete(pos, end)
                self.text_widget.insert(pos, replacement)
                self._update_status(f"已替换: {target} → {replacement}")
                self.text_widget.mark_set(tk.INSERT, f"{pos}+{len(replacement)}c")
            else:
                messagebox.showinfo("记事本", f"未找到: {target}")
        
        def replace_all():
            if not is_replace:
                return
            
            target = entry_find.get()
            replacement = entry_replace.get()
            
            if not target:
                return
            
            options = {}
            if var_nocase.get():
                options['nocase'] = True
            
            count = 0
            start = "1.0"
            
            while True:
                pos = self.text_widget.search(target, start, tk.END, **options)
                if not pos:
                    break
                
                end = f"{pos}+{len(target)}c"
                self.text_widget.delete(pos, end)
                self.text_widget.insert(pos, replacement)
                count += 1
                start = f"{pos}+{len(replacement)}c"
            
            if count > 0:
                messagebox.showinfo("记事本", f"已替换 {count} 处")
                self._update_status(f"替换全部: {target} → {replacement}，共 {count} 处")
            else:
                messagebox.showinfo("记事本", f"未找到: {target}")
        
        tk.Button(button_frame, text="查找下一个", command=do_find).pack(side=tk.LEFT, padx=5)
        
        if is_replace:
            tk.Button(button_frame, text="替换", command=do_replace).pack(side=tk.LEFT, padx=5)
            tk.Button(button_frame, text="替换全部", command=replace_all).pack(side=tk.LEFT, padx=5)
        
        tk.Button(button_frame, text="关闭", command=dialog.destroy).pack(side=tk.LEFT, padx=5)
        
        entry_find.bind("<Return>", lambda e: do_find())
        if entry_replace:
            entry_replace.bind("<Return>", lambda e: do_replace())
    
    # ==================== 格式操作 ====================
    
    def change_font(self):
        size = simpledialog.askinteger(
            "字体大小",
            "请输入字体大小 (12-30):",
            minvalue=12,
            maxvalue=30
        )
        if size:
            self.text_widget.configure(font=("微软雅黑", size))
            self._update_status(f"字体大小: {size}")
    
    def toggle_word_wrap(self):
        current_wrap = self.text_widget.cget("wrap")
        new_wrap = tk.CHAR if current_wrap == tk.WORD else tk.WORD
        self.text_widget.configure(wrap=new_wrap)
        self._update_status(f"自动换行: {'开启' if new_wrap == tk.WORD else '关闭'}")
    
    # ==================== ⭐ 新增：查看历史记录 ====================
    
    def show_history(self):
        """显示历史记录（从MySQL读取）"""
        if not self.db_available:
            messagebox.showwarning("提示", "数据库未连接，无法查看历史记录")
            return
        
        history_text = show_history_from_db()
        
        # 创建历史记录窗口
        history_window = tk.Toplevel(self.root)
        history_window.title("📜 保存历史记录")
        history_window.geometry("700x500")
        history_window.transient(self.root)
        history_window.grab_set()
        
        # 显示历史记录
        text_area = scrolledtext.ScrolledText(
            history_window,
            wrap=tk.WORD,
            font=("Consolas", 10),
            bg="#f5f5f5"
        )
        text_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        text_area.insert("1.0", history_text)
        text_area.config(state=tk.DISABLED)  # 只读
        
        # 关闭按钮
        btn_close = tk.Button(history_window, text="关闭", command=history_window.destroy)
        btn_close.pack(pady=5)
    
    # ==================== 帮助 ====================
    
    def show_about(self):
        messagebox.showinfo(
            "关于记事本",
            "📝 记事本 v2.0（MySQL版）\n\n"
            "一款简单的文本编辑器\n"
            "基于 Python + tkinter 开发\n\n"
            "⭐ 新增功能：\n"
            "• 每次保存自动记录到 MySQL\n"
            "• 记录文件名、摘要、字数、时间\n"
            "• 支持查看历史记录\n\n"
            "快捷键：\n"
            "Ctrl+N 新建 | Ctrl+O 打开\n"
            "Ctrl+S 保存 | Ctrl+Shift+S 另存为\n"
            "Ctrl+F 查找 | Ctrl+H 查看历史\n"
            "Ctrl+Z 撤销 | Ctrl+A 全选"
        )
    
    # ==================== 状态栏 ====================
    
    def _update_status(self, message):
        self.status_bar.config(text=message)


# ==================== 程序入口 ====================

if __name__ == "__main__":
    root = tk.Tk()
    app = Notepad(root)
    root.mainloop()