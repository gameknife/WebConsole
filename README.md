# WebConsole

> **Steam Deck 风格、手柄优先的自托管网页游戏机。** 打开浏览器即是 SteamOS Big Picture 那样的大图块界面：手柄方向键浏览、A 启动、进游戏后手柄直接操作模拟器，Guide 唤出游戏内菜单。NES / SNES / GBA / GB(C) 经典游戏统一基于 EmulatorJS，后端 Go，单文件即可部署。

界面高保真还原 SteamOS Deck UI 的**设计系统与交互**（不使用 Valve 任何商标/专有素材）。

---

## ✨ 特性

- 🎮 **手柄优先**：方向移动跟手、焦点高亮（spring 缩放 + 蓝色光晕）、**焦点记忆**、QAM 快捷菜单、游戏内菜单——全程不碰鼠标键盘即可走完「选游戏 → 启动 → 存档 → 退出」。
- 🕹️ **多平台模拟**：单一 EmulatorJS 引擎运行 NES / SNES / GBA / GB(C)；放入 ROM 目录自动入库。
- 💾 **即时存档**：多槽位存档/读档，带截图缩略图；游玩历史与「继续游戏」货架。
- 🎨 **高保真 SteamOS UI**：暗色玻璃拟态设计系统、Framer Motion 动效、骨架屏与页面过渡。
- 📦 **单二进制部署**：前端经 `embed.FS` 内嵌进 Go，单个可执行文件同源提供 API + 前端 + ROM 静态资源；另有多阶段 Docker 镜像。
- 🔒 **单用户本地**：固定 `userId="local"`，无登录流程。

> 状态：开发计划 9 个阶段（Phase 0–8）**全部完成并验证**，功能完整。详见 [`doc/development-plan.md`](doc/development-plan.md)。

---

## 🧱 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Norigin 空间导航 + TanStack Query + Zustand
- **后端**：Go 1.25 + Gin + GORM + SQLite（`glebarez/sqlite`，底层 `modernc.org/sqlite`，**纯 Go 无 CGO**）
- **模拟器**：EmulatorJS（CDN 或自托管，单引擎覆盖全部平台）

---

## 🚀 快速开始

### 开发模式

```bash
# 后端（:8080）—— 首次启动会从 test-roms/ 导入 4 个 NES 公开测试 ROM
cd backend && go run ./cmd/webconsole
# 健康检查
curl http://localhost:8080/healthz

# 前端（:5173，自动代理 /api /roms /covers /saves → :8080）
cd frontend && npm install && npm run dev
```

打开 http://localhost:5173 。

### 生产：单文件二进制

```bash
# Linux / macOS
./build.sh                    # 构建前端 → 内嵌进 Go → 编译出单个可执行文件
cd backend && ./webconsole    # 打开 http://localhost:8080（API + 前端 + ROM 同源）
```

```bat
:: Windows（在能找到 npm/go 的终端中运行，如 fnm/nvm 环境）
build.bat
cd backend && webconsole.exe  :: 打开 http://localhost:8080
```

### Docker

```bash
docker build -t webconsole .
docker run -p 8080:8080 -v "$PWD/data:/data" webconsole
```

多阶段构建（node 构建前端 → go 内嵌编译，`CGO_ENABLED=0`）→ distroless 静态镜像；挂载 `/data` 卷持久化游戏库、ROM、存档与数据库。

> 配置在 [`backend/config.yaml`](backend/config.yaml)（监听地址、数据目录、EmulatorJS 数据源、Gin 模式）；容器用 [`backend/config.docker.yaml`](backend/config.docker.yaml)。

---

## 🎮 操作（默认映射）

| 输入 | 手柄 | 键盘 | 作用 |
|------|------|------|------|
| 移动焦点 | 方向键 / 左摇杆 | 方向键 | 在图块/菜单间导航 |
| 确认 | A | Enter | 启动游戏 / 选择菜单项 |
| 返回 | B | Backspace | 返回上一页 / 关闭弹层 |
| 切换平台 Tab | LB / RB | Tab | 上一个 / 下一个平台 |
| 菜单 / QAM | Guide / Start(长按) | Esc | 唤出 QAM 或游戏内菜单 |

进入游戏后手柄交给 EmulatorJS；按 Guide（或 Esc）唤出**游戏内菜单**：继续 / 存档 / 读档 / 重置 / 退出。

---

## 🕹️ 添加游戏（多平台）

把 ROM 放进 `data/roms/<platform>/` 并重启后端即自动入库（显示名取自文件名，封面可选）：

| 目录 | 平台 | 核 | 扩展名 |
|------|------|----|--------|
| `data/roms/nes/`  | NES      | `nes`  | `.nes` |
| `data/roms/snes/` | SNES     | `snes` | `.smc` `.sfc` |
| `data/roms/gba/`  | GBA      | `gba`  | `.gba` |
| `data/roms/gb/`   | GB / GBC | `gb`   | `.gb` `.gbc` |

---

## 📁 目录结构

```
WebConsole/
├── doc/                      # 文档（development-plan.md = 单一事实来源；technical-overview.md = 技术总览）
├── test-roms/               # NESDev 公开测试 ROM（demo）
├── backend/                 # Go（Gin + GORM + SQLite，cmd/ + internal/{config,model,repository,service,handler,router,storage,seed,web}）
├── frontend/                # React（Vite + TS + Tailwind + Framer Motion，src/{api,input,design,emulator,components,features,store,routes}）
├── data/                    # 运行时数据（git 忽略）：roms/ covers/ saves/ webconsole.db
├── build.sh                 # 前端构建 → 内嵌 → 单二进制
└── Dockerfile               # 多阶段构建
```

---

## 📚 文档

- [`doc/development-plan.md`](doc/development-plan.md) — 开发计划与决策记录（单一事实来源）
- [`doc/technical-overview.md`](doc/technical-overview.md) — 技术总览、核心实现细节、部署方法、后续开发方向

---

## ⚖️ 内容与商标合规

- **不内置、不抓取任何受版权 ROM**。Demo 仅含 NESDev 公开测试 ROM；正式内容由部署者提供合法 ROM（自有卡带 dump / homebrew / 公有领域 / 授权）。
- UI 仅还原 SteamOS 的**设计系统与交互**，**不使用** Valve 的商标/专有素材（Steam logo、Motiva Sans、专有插画等）。项目使用自有品牌名、开源图标（Lucide）与字体（Inter）。

---

## 📝 约定

代码注释、变量、commit 用英文；文档中英混排。架构 / 接口 / 选型变更需同步回写 [`doc/development-plan.md`](doc/development-plan.md) 与 [`doc/technical-overview.md`](doc/technical-overview.md)。
