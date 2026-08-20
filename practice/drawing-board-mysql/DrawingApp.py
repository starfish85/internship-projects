import tkinter as tk
from tkinter import colorchooser, ttk, messagebox, filedialog
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
    'database': 'draw_db'
}

# ==================== 数据库操作 ====================

def init_draw_history_table():
    """初始化数据库和表"""
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
        cursor = conn.cursor()
        
        cursor.execute("CREATE DATABASE IF NOT EXISTS draw_db")
        cursor.execute("USE draw_db")
        
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS draw_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            canvas_width INT DEFAULT 0,
            canvas_height INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_file_name (file_name),
            INDEX idx_created_at (created_at)
        )
        """
        cursor.execute(create_table_sql)
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ 数据库初始化成功")
        return True
    except Error as e:
        print(f"⚠️ 数据库初始化失败: {e}")
        return False


def save_draw_history(file_name, file_path, width, height):
    """保存画板历史记录到数据库"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = """
        INSERT INTO draw_history (file_name, file_path, canvas_width, canvas_height)
        VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (file_name, file_path, width, height))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"⚠️ 保存历史记录失败: {e}")
        return False


def show_history_from_db():
    """从数据库查询历史记录"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = """
        SELECT id, file_name, canvas_width, canvas_height, created_at
        FROM draw_history
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
            result += f"   📐 {row[2]} x {row[3]} 像素\n"
            result += "-" * 70 + "\n"
        
        return result
    except Error as e:
        return f"⚠️ 读取历史记录失败: {e}"


# ==================== 画板主类 ====================

class DrawingApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🎨 画板 v2.0")
        self.root.geometry("1000x700")
        self.root.resizable(True, True)

        # ===== 状态变量 =====
        self.current_tool = "pen"
        self.current_color = "#000000"
        self.pen_size = 3
        self.eraser_size = 20

        self.start_x = None
        self.start_y = None
        self.current_shape = None
        self.draw_mode = "normal"

        # ===== 数据库初始化 =====
        self.db_available = init_draw_history_table()

        # ===== 初始化界面 =====
        self._create_toolbar()
        self._create_canvas()
        self._create_status_bar()
        self._bind_shortcuts()

        if self.db_available:
            self._update_status("✅ 数据库已连接，历史记录已开启")
        else:
            self._update_status("⚠️ 数据库未连接，历史记录不可用")

    # ==================== 创建界面 ====================

    def _create_toolbar(self):
        toolbar = tk.Frame(self.root, relief=tk.RAISED, bd=2, bg="#f0f0f0")
        toolbar.pack(side=tk.TOP, fill=tk.X)

        tools = [
            ("✏️ 笔", "pen"),
            ("📏 线", "line"),
            ("⬜ 矩形", "rect"),
            ("⭕ 圆", "circle"),
            ("🧹 橡皮", "eraser"),
            ("🗑️ 清空", "clear"),
            ("📜 历史", "history"),
        ]

        for text, tool in tools:
            if tool == "clear":
                btn = tk.Button(toolbar, text=text, command=self.clear_canvas)
            elif tool == "history":
                btn = tk.Button(toolbar, text=text, command=self.show_history)
            else:
                btn = tk.Button(toolbar, text=text,
                                command=lambda t=tool: self.set_tool(t))
            btn.pack(side=tk.LEFT, padx=2, pady=4)

        tk.Label(toolbar, text=" | ", bg="#f0f0f0").pack(side=tk.LEFT, padx=5)

        self.color_btn = tk.Button(
            toolbar,
            text="🎨 颜色",
            bg=self.current_color,
            fg="white",
            command=self.choose_color,
            width=10
        )
        self.color_btn.pack(side=tk.LEFT, padx=5, pady=4)

        tk.Label(toolbar, text="粗细:", bg="#f0f0f0").pack(side=tk.LEFT, padx=5)

        self.size_var = tk.IntVar(value=self.pen_size)
        self.size_spinbox = tk.Spinbox(
            toolbar,
            from_=1,
            to=50,
            width=5,
            textvariable=self.size_var,
            command=self._update_size
        )
        self.size_spinbox.pack(side=tk.LEFT, padx=2)

        self.info_label = tk.Label(
            toolbar,
            text="工具: 笔 | 颜色: 黑色 | 粗细: 3",
            bg="#f0f0f0",
            fg="#333"
        )
        self.info_label.pack(side=tk.RIGHT, padx=15)

    def _create_canvas(self):
        self.canvas = tk.Canvas(
            self.root,
            bg="white",
            cursor="cross",
            width=900,
            height=600
        )
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        self.canvas.bind("<ButtonPress-1>", self.on_mouse_down)
        self.canvas.bind("<B1-Motion>", self.on_mouse_move)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_up)

    def _create_status_bar(self):
        self.status_bar = tk.Label(
            self.root,
            text="就绪 | 提示: 按住鼠标拖动画图",
            anchor=tk.W,
            relief=tk.SUNKEN,
            bd=1
        )
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def _bind_shortcuts(self):
        self.root.bind("<Control-c>", self.choose_color_event)
        self.root.bind("<Control-z>", lambda e: self.undo())
        self.root.bind("<Control-s>", lambda e: self.save())

    # ==================== 工具管理 ====================

    def set_tool(self, tool):
        self.current_tool = tool
        if tool == "eraser":
            self.draw_mode = "eraser"
            self.status_bar.config(text="模式: 橡皮擦")
        else:
            self.draw_mode = "normal"
            self.status_bar.config(text=f"工具: {tool}")
        self._update_info()

    def choose_color(self):
        color = colorchooser.askcolor(title="选择颜色", initialcolor=self.current_color)
        if color:
            self.current_color = color[1]
            self.color_btn.config(bg=self.current_color)
            r, g, b = int(color[0][0]), int(color[0][1]), int(color[0][2])
            brightness = (r * 299 + g * 587 + b * 114) / 1000
            self.color_btn.config(fg="white" if brightness < 128 else "black")
            self._update_info()

    def choose_color_event(self, event):
        self.choose_color()

    def _update_size(self):
        val = self.size_var.get()
        self.pen_size = val
        self.eraser_size = val
        self._update_info()

    def _update_info(self):
        tool_names = {
            "pen": "笔",
            "line": "线",
            "rect": "矩形",
            "circle": "圆",
            "eraser": "橡皮"
        }
        tool_name = tool_names.get(self.current_tool, self.current_tool)
        size = self.eraser_size if self.current_tool == "eraser" else self.pen_size
        self.info_label.config(
            text=f"工具: {tool_name} | 颜色: {self.current_color} | 粗细: {size}"
        )

    # ==================== 绘图核心 ====================

    def on_mouse_down(self, event):
        self.start_x = event.x
        self.start_y = event.y

        if self.current_shape:
            self.canvas.delete(self.current_shape)
            self.current_shape = None

        self.shape_start_x = event.x
        self.shape_start_y = event.y

        if self.draw_mode == "eraser":
            self._erase(event.x, event.y)

    def on_mouse_move(self, event):
        x, y = event.x, event.y

        if self.draw_mode == "eraser":
            self._erase(x, y)
            return

        if self.current_tool == "pen":
            self.canvas.create_line(
                self.start_x, self.start_y, x, y,
                fill=self.current_color,
                width=self.pen_size,
                capstyle=tk.ROUND,
                smooth=True
            )
            self.start_x = x
            self.start_y = y

        else:
            if self.current_shape:
                self.canvas.delete(self.current_shape)

            self.current_shape = self._draw_shape(
                self.shape_start_x,
                self.shape_start_y,
                x,
                y,
                preview=True
            )

    def on_mouse_up(self, event):
        x, y = event.x, event.y

        if self.draw_mode == "eraser":
            return

        if self.current_tool == "pen":
            pass
        else:
            if self.current_shape:
                self.canvas.delete(self.current_shape)
                self.current_shape = None

            self._draw_shape(
                self.shape_start_x,
                self.shape_start_y,
                x,
                y,
                preview=False
            )

    def _draw_shape(self, x1, y1, x2, y2, preview=False):
        fill_color = "" if preview else self.current_color
        outline_color = self.current_color

        if self.current_tool == "line":
            return self.canvas.create_line(
                x1, y1, x2, y2,
                fill=outline_color,
                width=self.pen_size,
                capstyle=tk.ROUND
            )

        elif self.current_tool == "rect":
            return self.canvas.create_rectangle(
                x1, y1, x2, y2,
                outline=outline_color,
                fill=fill_color,
                width=self.pen_size
            )

        elif self.current_tool == "circle":
            return self.canvas.create_oval(
                x1, y1, x2, y2,
                outline=outline_color,
                fill=fill_color,
                width=self.pen_size
            )

        return None

    def _erase(self, x, y):
        items = self.canvas.find_overlapping(
            x - self.eraser_size // 2,
            y - self.eraser_size // 2,
            x + self.eraser_size // 2,
            y + self.eraser_size // 2
        )
        for item in items:
            self.canvas.delete(item)

    # ==================== ⭐ 保存（升级版） ====================

    def save(self):
        """保存为 PostScript 文件，并记录到 MySQL"""
        file_path = filedialog.asksaveasfilename(
            title="保存图片",
            defaultextension=".ps",
            filetypes=[("PostScript 文件", "*.ps"), ("所有文件", "*.*")]
        )

        if not file_path:
            return

        try:
            # 保存文件
            self.canvas.postscript(file=file_path, colormode='color')

            # 获取画布尺寸
            width = self.canvas.winfo_width()
            height = self.canvas.winfo_height()

            # 如果画布还没渲染完成，用默认尺寸
            if width <= 1 or height <= 1:
                width = 900
                height = 600

            file_name = os.path.basename(file_path)

            # ===== ⭐ 保存到 MySQL =====
            if self.db_available:
                if save_draw_history(file_name, file_path, width, height):
                    self._update_status(f"✅ 已保存: {file_name} (历史已记录)")

                    # 显示保存成功弹窗
                    messagebox.showinfo(
                        "保存成功",
                        f"✅ 文件已保存\n\n"
                        f"📄 文件名: {file_name}\n"
                        f"📐 尺寸: {width} x {height} 像素\n"
                        f"💾 已存入数据库: draw_history"
                    )
                else:
                    self._update_status(f"⚠️ 文件已保存，但历史记录失败")
                    messagebox.showwarning(
                        "保存成功但历史记录失败",
                        f"文件已保存: {file_name}\n"
                        f"但写入 MySQL 失败，请检查数据库连接"
                    )
            else:
                self._update_status(f"已保存: {file_path}")
                messagebox.showinfo("保存成功", f"文件已保存: {file_name}\n(历史记录未开启)")

        except Exception as e:
            messagebox.showerror("保存失败", f"无法保存文件:\n{str(e)}")
            self._update_status(f"❌ 保存失败: {e}")

    # ==================== 其他功能 ====================

    def clear_canvas(self):
        if messagebox.askyesno("确认", "确定要清空画布吗？"):
            self.canvas.delete("all")
            self._update_status("已清空画布")

    def undo(self):
        items = self.canvas.find_all()
        if items:
            last_item = items[-1]
            self.canvas.delete(last_item)
            self._update_status("已撤销一步")
        else:
            self._update_status("无可撤销内容")

    def show_history(self):
        """显示历史记录"""
        if not self.db_available:
            messagebox.showwarning("提示", "数据库未连接，无法查看历史记录")
            return

        history_text = show_history_from_db()

        history_window = tk.Toplevel(self.root)
        history_window.title("📜 保存历史记录")
        history_window.geometry("700x500")
        history_window.transient(self.root)
        history_window.grab_set()

        text_area = tk.Text(
            history_window,
            wrap=tk.WORD,
            font=("Consolas", 10),
            bg="#f5f5f5"
        )
        text_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        text_area.insert("1.0", history_text)
        text_area.config(state=tk.DISABLED)

        btn_close = tk.Button(history_window, text="关闭", command=history_window.destroy)
        btn_close.pack(pady=5)

    def _update_status(self, message):
        self.status_bar.config(text=message)

    def run(self):
        self.root.mainloop()


# ==================== 程序入口 ====================

if __name__ == "__main__":
    root = tk.Tk()
    app = DrawingApp(root)
    app.run()