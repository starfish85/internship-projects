import pygame
import random
import sys
from datetime import datetime
import mysql.connector
from mysql.connector import Error

# ==================== 数据库配置 ====================
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'port': 3307,
    'database': 'game_db'
}

# ==================== 数据库工具函数 ====================
def init_database():
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS game_db")
        cursor.execute("USE game_db")
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS snake_scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            score INT NOT NULL,
            playtime DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
        cursor.execute(create_table_sql)
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"数据库初始化失败: {e}")
        return False

def save_score(score):
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO snake_scores (score) VALUES (%s)", (score,))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"保存分数失败: {e}")
        return False

def get_high_score():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(score) FROM snake_scores")
        res = cursor.fetchone()
        cursor.close()
        conn.close()
        return res[0] if res[0] is not None else 0
    except Error as e:
        print(f"读取最高分失败: {e}")
        return 0

# ==================== 游戏基础配置 ====================
WINDOW_WIDTH = 600
WINDOW_HEIGHT = 680
GRID_SIZE = 20
GRID_WIDTH = WINDOW_WIDTH // GRID_SIZE
GRID_HEIGHT = (WINDOW_HEIGHT - 80) // GRID_SIZE  # 顶部留80px显示信息

# 颜色常量
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
DARK_GREEN = (0, 200, 0)
GRAY = (128, 128, 128)
YELLOW = (255, 255, 0)
BLUE = (100, 150, 255)
DARK_BLUE = (50, 80, 200)
ORANGE = (255, 165, 0)

# 移动方向
UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)

# 难度配置（移除emoji）
DIFFICULTY_CONFIG = {
    '简单': {'speed': 6, 'label': '简单'},
    '中等': {'speed': 12, 'label': '中等'},
    '困难': {'speed': 18, 'label': '困难'}
}

# ==================== 按钮类 ====================
class Button:
    def __init__(self, x, y, width, height, text, color, hover_color, text_color=WHITE):
        self.rect = pygame.Rect(x, y, width, height)
        self.text = text
        self.color = color
        self.hover_color = hover_color
        self.text_color = text_color
        self.is_hovered = False

    def draw(self, screen, font):
        color = self.hover_color if self.is_hovered else self.color
        pygame.draw.rect(screen, color, self.rect, border_radius=10)
        pygame.draw.rect(screen, WHITE, self.rect, 2, border_radius=10)
        text_surface = font.render(self.text, True, self.text_color)
        text_rect = text_surface.get_rect(center=self.rect.center)
        screen.blit(text_surface, text_rect)

    def handle_event(self, event):
        if event.type == pygame.MOUSEMOTION:
            self.is_hovered = self.rect.collidepoint(event.pos)
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if self.rect.collidepoint(event.pos):
                return True
        return False

# ==================== 蛇类 ====================
class Snake:
    def __init__(self):
        self.body = [
            (GRID_WIDTH // 2, GRID_HEIGHT // 2),
            (GRID_WIDTH // 2 - 1, GRID_HEIGHT // 2),
            (GRID_WIDTH // 2 - 2, GRID_HEIGHT // 2)
        ]
        self.direction = RIGHT
        self.next_direction = RIGHT
        self.grow_flag = False

    def head(self):
        return self.body[0]

    def change_direction(self, new_dir):
        if (new_dir[0] * -1, new_dir[1] * -1) != self.direction:
            self.next_direction = new_dir

    def move(self):
        self.direction = self.next_direction
        head = self.head()
        new_head = (head[0] + self.direction[0], head[1] + self.direction[1])
        self.body.insert(0, new_head)
        if not self.grow_flag:
            self.body.pop()
        else:
            self.grow_flag = False

    def grow(self):
        self.grow_flag = True

    def check_self_collision(self):
        return self.head() in self.body[1:]

    def check_boundary_collision(self):
        x, y = self.head()
        return x < 0 or x >= GRID_WIDTH or y < 0 or y >= GRID_HEIGHT

# ==================== 食物类 ====================
class Food:
    def __init__(self):
        self.position = (0, 0)
        self.spawn()

    def spawn(self, snake_body=None):
        snake_body = snake_body if snake_body else []
        while True:
            pos = (random.randint(0, GRID_WIDTH - 1), random.randint(0, GRID_HEIGHT - 1))
            if pos not in snake_body:
                self.position = pos
                break

    def get_position(self):
        return self.position

# ==================== 游戏主类 ====================
class Game:
    def __init__(self):
        # 数据库初始化
        self.db_available = False
        try:
            self.db_available = init_database()
        except Exception as e:
            print("数据库初始化异常，关闭记分功能：", e)
        self.high_score = get_high_score() if self.db_available else 0

        pygame.init()
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("贪吃蛇 - 难度选择版")
        pygame.key.stop_text_input()
        self.clock = pygame.time.Clock()

        # 【核心修复】统一使用系统黑体SimHei，彻底杜绝中文乱码，不再读取字体文件
        self.font = pygame.font.SysFont("SimHei", 28)
        self.small_font = pygame.font.SysFont("SimHei", 20)
        self.tiny_font = pygame.font.SysFont("SimHei", 16)
        self.title_font = pygame.font.SysFont("SimHei", 52)

        # 游戏状态
        self.current_difficulty = '中等'
        self.show_menu = True
        self.game_started = False

        # 创建难度按钮
        self._create_buttons()

        # 重置游戏
        self.reset()

    def _create_buttons(self):
        """创建难度选择按钮"""
        btn_width = 130
        btn_height = 55
        spacing = 25
        total_width = btn_width * 3 + spacing * 2
        start_x = (WINDOW_WIDTH - total_width) // 2
        start_y = 270

        self.difficulty_buttons = []

        difficulties = ['简单', '中等', '困难']
        colors = [(GREEN, (0, 180, 0)), (ORANGE, (200, 130, 0)), (RED, (180, 0, 0))]

        for i, (diff, (color, hover_color)) in enumerate(zip(difficulties, colors)):
            x = start_x + i * (btn_width + spacing)
            btn = Button(x, start_y, btn_width, btn_height,
                        DIFFICULTY_CONFIG[diff]['label'], color, hover_color)
            btn.difficulty = diff
            self.difficulty_buttons.append(btn)

    def reset(self):
        """重置一局游戏所有状态"""
        self.snake = Snake()
        self.food = Food()
        self.food.spawn(self.snake.body)
        self.score = 0
        self.game_over = False
        self.paused = False
        self.saved = False
        # 根据难度设置速度
        self.speed = DIFFICULTY_CONFIG[self.current_difficulty]['speed']

    def handle_events(self):
        """完整事件处理"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False

            # 菜单状态：只处理按钮点击
            if self.show_menu:
                for btn in self.difficulty_buttons:
                    if btn.handle_event(event):
                        self.current_difficulty = btn.difficulty
                        self.show_menu = False
                        self.game_started = True
                        self.reset()
                        return True
                continue

            # 游戏状态
            if event.type == pygame.KEYDOWN:
                # 游戏结束按 R 返回菜单
                if self.game_over:
                    if event.key == pygame.K_r:
                        self.show_menu = True
                        self.game_started = False
                    continue

                # 暂停/继续（空格键）
                if event.key == pygame.K_SPACE:
                    self.paused = not self.paused
                    continue

                # 方向控制
                if not self.paused:
                    if event.key == pygame.K_UP:
                        self.snake.change_direction(UP)
                    elif event.key == pygame.K_DOWN:
                        self.snake.change_direction(DOWN)
                    elif event.key == pygame.K_LEFT:
                        self.snake.change_direction(LEFT)
                    elif event.key == pygame.K_RIGHT:
                        self.snake.change_direction(RIGHT)

        return True

    def update(self):
        """游戏逻辑更新"""
        if self.game_over or self.paused or self.show_menu:
            return

        self.snake.move()

        # 吃到食物
        if self.snake.head() == self.food.get_position():
            self.snake.grow()
            self.score += 10
            self.food.spawn(self.snake.body)
            if self.speed < 20 and self.score % 100 == 0:
                self.speed += 1

        # 碰撞触发游戏结束
        if self.snake.check_self_collision() or self.snake.check_boundary_collision():
            self.game_over = True
            if self.db_available and not self.saved:
                try:
                    save_score(self.score)
                    self.saved = True
                    new_hs = get_high_score()
                    if new_hs > self.high_score:
                        self.high_score = new_hs
                except Exception as e:
                    print("分数保存失败：", e)

    def draw_menu(self):
        """绘制开始菜单"""
        self.screen.fill(BLACK)

        # 标题
        title_text = self.title_font.render("贪吃蛇", True, GREEN)
        self.screen.blit(title_text,
                         (WINDOW_WIDTH // 2 - title_text.get_width() // 2, 80))

        # 子标题
        sub_text = self.small_font.render("选择难度开始游戏", True, WHITE)
        self.screen.blit(sub_text,
                         (WINDOW_WIDTH // 2 - sub_text.get_width() // 2, 170))

        # 最高分显示
        high_text = self.small_font.render(f"历史最高分: {self.high_score}", True, YELLOW)
        self.screen.blit(high_text,
                         (WINDOW_WIDTH // 2 - high_text.get_width() // 2, 215))

        # 绘制难度按钮
        for btn in self.difficulty_buttons:
            btn.draw(self.screen, self.small_font)

        # 底部提示
        tip_text = self.tiny_font.render("点击选择难度，按 空格键 暂停游戏", True, GRAY)
        self.screen.blit(tip_text,
                         (WINDOW_WIDTH // 2 - tip_text.get_width() // 2,
                          WINDOW_HEIGHT - 40))

        pygame.display.flip()

    def draw_info_bar(self):
        """绘制顶部信息栏"""
        pygame.draw.rect(self.screen, (30, 30, 30), (0, 0, WINDOW_WIDTH, 70))
        pygame.draw.line(self.screen, GRAY, (0, 70), (WINDOW_WIDTH, 70), 2)

        # 难度标签（左侧）
        diff_label = DIFFICULTY_CONFIG[self.current_difficulty]['label']
        diff_text = self.tiny_font.render(diff_label, True, YELLOW)
        self.screen.blit(diff_text, (15, 8))

        # 分数（左中）
        score_text = self.font.render(f"分数: {self.score}", True, YELLOW)
        self.screen.blit(score_text, (15, 35))

        # 最高分（中间）
        high_text = self.font.render(f"最高: {self.high_score}", True, YELLOW)
        high_x = WINDOW_WIDTH // 2 - high_text.get_width() // 2
        self.screen.blit(high_text, (high_x, 10))

        # 速度（中间偏下）
        speed_text = self.tiny_font.render(f"速度: {self.speed}", True, WHITE)
        speed_x = WINDOW_WIDTH // 2 - speed_text.get_width() // 2
        self.screen.blit(speed_text, (speed_x, 45))

        # 操作提示（右上角）
        hint_text = self.tiny_font.render("SPACE暂停  R菜单", True, GRAY)
        self.screen.blit(hint_text, (WINDOW_WIDTH - 155, 25))

    def draw(self):
        """渲染全部画面"""
        # 菜单模式
        if self.show_menu:
            self.draw_menu()
            return

        self.screen.fill(BLACK)
        self.draw_info_bar()

        # 绘制食物（坐标偏移 +70）
        fx, fy = self.food.get_position()
        pygame.draw.rect(self.screen, RED,
                         (fx * GRID_SIZE, fy * GRID_SIZE + 70, GRID_SIZE, GRID_SIZE))

        # 绘制蛇（坐标偏移 +70）
        for idx, (x, y) in enumerate(self.snake.body):
            color = DARK_GREEN if idx == 0 else GREEN
            pygame.draw.rect(self.screen, color,
                             (x * GRID_SIZE, y * GRID_SIZE + 70, GRID_SIZE, GRID_SIZE))
            if idx == 0:
                pygame.draw.rect(self.screen, WHITE,
                                 (x * GRID_SIZE, y * GRID_SIZE + 70, GRID_SIZE, GRID_SIZE), 2)

        # 游戏结束遮罩弹窗
        if self.game_over:
            overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
            overlay.set_alpha(160)
            overlay.fill(BLACK)
            self.screen.blit(overlay, (0, 0))

            # 文字渲染（全部移除emoji）
            over_txt = self.font.render("游戏结束", True, RED)
            score_txt = self.font.render(f"本次得分: {self.score}", True, WHITE)
            high_txt = self.font.render(f"历史最高: {self.high_score}", True, YELLOW)
            restart_txt = self.small_font.render("按 R 返回菜单", True, WHITE)

            y_base = 140
            self.screen.blit(over_txt, (WINDOW_WIDTH // 2 - over_txt.get_width() // 2, y_base))
            self.screen.blit(score_txt, (WINDOW_WIDTH // 2 - score_txt.get_width() // 2, y_base + 50))
            self.screen.blit(high_txt, (WINDOW_WIDTH // 2 - high_txt.get_width() // 2, y_base + 100))
            self.screen.blit(restart_txt, (WINDOW_WIDTH // 2 - restart_txt.get_width() // 2, y_base + 160))

            # 双保险：实时轮询按键
            keys = pygame.key.get_pressed()
            if keys[pygame.K_r]:
                self.show_menu = True
                self.game_started = False

        # 暂停文字（移除⏸）
        if self.paused and not self.game_over:
            pause_overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
            pause_overlay.set_alpha(100)
            pause_overlay.fill(BLACK)
            self.screen.blit(pause_overlay, (0, 0))

            pause_txt = self.font.render("暂停中", True, WHITE)
            self.screen.blit(pause_txt,
                             (WINDOW_WIDTH // 2 - pause_txt.get_width() // 2,
                              WINDOW_HEIGHT // 2 - 30))

            resume_txt = self.small_font.render("按 空格键 继续", True, GRAY)
            self.screen.blit(resume_txt,
                             (WINDOW_WIDTH // 2 - resume_txt.get_width() // 2,
                              WINDOW_HEIGHT // 2 + 30))

        pygame.display.flip()

    def run(self):
        """主游戏循环"""
        running = True
        while running:
            running = self.handle_events()
            self.update()
            self.draw()
            # 菜单状态使用较低帧率，游戏中正常帧率
            self.clock.tick(self.speed if not self.show_menu else 30)

        pygame.quit()
        sys.exit()

# 程序入口
if __name__ == "__main__":
    game = Game()
    game.run()