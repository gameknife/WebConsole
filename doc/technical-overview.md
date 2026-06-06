# WebConsole — 技术总览与部署文档

> Steam Deck 风格、**手柄优先**的自托管网页游戏机。浏览器内畅玩 NES / SNES / GBA / GB(C) 经典游戏，统一基于 EmulatorJS，后端 Go，前端 React 18，界面高保真仿 SteamOS Big Picture。
>
> 文档版本：v1（2026-06-03）。开发路线图与决策记录见 [`development-plan.md`](development-plan.md)（单一事实来源）。

---

## 1. 当前状态

开发计划中的 **全部 9 个阶段（Phase 0–8）均已完成并经过验证**，应用功能完整：

| 能力 | 说明 |
|------|------|
| 游戏库浏览 | 暗色玻璃拟态网格 + 平台分类 Tab + 「继续游戏」货架 |
| 手柄导航 | 方向移动、焦点高亮/记忆、确认/返回、QAM、游戏内菜单，全程可不碰鼠标 |
| 模拟器播放 | EmulatorJS 单引擎运行 NES/SNES/GBA/GB(C)，切游戏彻底销毁无残留 |
| 即时存档 | 多槽位存档/读档（含截图缩略图）、游玩历史、时长上报 |
| 多平台 | 目录扫描自动入库，平台→核映射 |
| 单二进制部署 | 前端 `embed.FS` 内嵌进 Go，单文件同源提供 API + SPA + ROM |

完整闭环（无需鼠标）：**浏览 → 方向键导航 → A 启动 → 游戏运行 → Guide 唤出菜单 → 存档/读档 → 退出 → 继续游戏货架**。

---

## 2. 技术栈

### 2.1 前端
| 关注点 | 选型 | 说明 |
|--------|------|------|
| 框架 | React 18 + TypeScript | 与 Valve Deck UI 同栈 |
| 构建 | Vite 5 | HMR、`embed` 产物 |
| 样式 | Tailwind CSS 3 + CSS 变量 token | SteamOS 暗色玻璃拟态设计系统 |
| 动效 | Framer Motion 11 | spring 焦点物理、页面过渡、入场动画 |
| 空间导航 | `@noriginmedia/norigin-spatial-navigation` **v3.1.0** | 焦点树 + 焦点记忆 |
| 手柄输入 | 自研 hook（Gamepad API 轮询） | 信号 → 语义事件 |
| 路由 | React Router v6 | |
| 服务端状态 | TanStack Query v5 | 列表/详情缓存 |
| 客户端状态 | Zustand（+ persist） | 输入模式、平台、设置、焦点记忆 |
| 图标 / 字体 | Lucide / Inter | 开源，替代 Valve 专有素材 |
| 模拟器 | EmulatorJS（CDN 或自托管） | 封装为 `<EmulatorPlayer>` |

### 2.2 后端
| 关注点 | 选型 | 说明 |
|--------|------|------|
| 语言 | Go 1.25 | |
| Web 框架 | Gin | |
| 数据库 | SQLite（`github.com/glebarez/sqlite`，底层 `modernc.org/sqlite`，**纯 Go 无 CGO**） | 单文件、单二进制 |
| ORM | GORM | AutoMigrate |
| 文件存储 | 本地 FS（`data/roms`、`data/covers`、`data/saves`） | HTTP 静态 + Range |
| 鉴权 | **单用户本地**：固定 `userId="local"`，无登录 | |

---

## 3. 目录结构

```
WebConsole/
├── doc/                              # 文档（development-plan.md = 单一事实来源）
├── test-roms/                        # NESDev 公开测试 ROM（demo 用）
├── backend/                          # Go 后端
│   ├── cmd/webconsole/main.go        # 入口：加载配置 → 打开存储 → seed → 起 Gin
│   ├── internal/
│   │   ├── config/                   # config.yaml 加载（含默认值）
│   │   ├── model/                    # Game / SaveState / PlayHistory（GORM）
│   │   ├── repository/               # 数据访问层（game/save/history repo）
│   │   ├── service/                  # 业务逻辑 + DTO（game/save/history service）
│   │   ├── handler/                  # Gin HTTP handler + 统一响应包
│   │   ├── router/                   # 路由装配 + CORS + 静态服务
│   │   ├── storage/                  # SQLite 打开 + AutoMigrate + 目录创建
│   │   ├── seed/                     # 测试 ROM 导入 + 多平台目录扫描
│   │   └── web/                      # //go:embed all:dist —— 内嵌前端 + SPA fallback
│   ├── config.yaml                   # 开发配置
│   └── config.docker.yaml            # 容器配置（/data 卷）
├── frontend/                         # React 前端
│   └── src/
│       ├── api/                      # client（envelope 解包）、hooks（React Query）、saves（命令式）、types
│       ├── input/                    # semantics（按键映射）、useGamepad（轮询）、GamepadProvider（语义→导航）
│       ├── design/                   # tokens.css、platforms（平台/核映射）
│       ├── emulator/                 # EmulatorPlayer、InGameMenu、controls（EJS 封装）、类型声明
│       ├── components/               # GameTile、Shelf、PlatformTabs、TopBar、QuickAccessMenu、Skeleton、AnimatedOutlet、Layout
│       ├── features/{library,detail,player,settings}/
│       ├── store/                    # useAppStore（UI 状态）、useSettings（持久化设置）
│       └── routes/                   # AppRoutes
├── data/                             # 运行时数据（git 忽略）：roms/ covers/ saves/ webconsole.db
├── build.sh                          # 前端构建 → 内嵌 → 单二进制
├── Dockerfile                        # 多阶段构建（node → go → distroless）
└── README.md
```

---

## 4. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (React SPA · 手柄优先 · SteamOS 风格)                 │
│                                                               │
│  GamepadProvider (RAF 轮询 navigator.getGamepads)             │
│        │ 语义事件: DIRECTION / confirm / back / guide ...      │
│        ▼                                                      │
│  Norigin 空间导航 (焦点树 + 焦点记忆) + Framer Motion (spring) │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │ Library 网格 │──▶│ GameDetail   │──▶│ EmulatorPlayer   │   │
│  │ + QAM 货架   │   │ hero 大图    │   │ (EmulatorJS)     │   │
│  └─────────────┘   └──────────────┘   └────────┬─────────┘   │
│        │ React Query                  InGameMenu│ 存档/读档    │
└────────┼─────────────────────────────────────┼──────────────┘
         │ REST /api/v1/*  (userId 固定 local)  │ multipart 上传
         ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Go 后端 (Gin)                                                 │
│  handler → service → repository → GORM → SQLite               │
│  静态: /roms/* /covers/* /saves/*(截图, Range)                │
│  内嵌: web.embed.FS → SPA（NoRoute fallback index.html）      │
└─────────────────────────────────────────────────────────────┘
         │ data/ (roms / covers / saves / webconsole.db)
```

**双模式输入**：`launcher`（手柄驱动 UI 焦点）↔ `ingame`（手柄交给 EmulatorJS）。覆盖层（QAM / 游戏内菜单）打开时临时恢复 launcher 导航。

---

## 5. 核心技术细节

### 5.1 手柄导航（项目最大难点）

- **输入采集**：`useGamepad` 用 `requestAnimationFrame` 轮询（Gamepad API 无事件）。按钮做**边沿检测**（上升沿触发一次），方向做**去抖 + 连发**（首触立即、380ms 后开始、之后每 90ms 一次），左摇杆带死区。
- **语义映射**：原始按键 → `DIRECTION(up/down/left/right)` 与 `ACTION(confirm/back/context/tabPrev/tabNext/menu/guide)`，应用其余部分与按键索引解耦。
- **对接 Norigin**：`init({ shouldFocusDOMNode: true })` 让焦点元素获得真实 DOM 焦点。`DIRECTION → navigateByDirection`；`confirm → document.activeElement.click()`；键盘的方向键/Enter 由 Norigin 原生处理，Escape→`menu`、Backspace→`back` 由自有监听补齐。
- **焦点记忆**：网格在路由跳转时会卸载，Norigin 自带的 `saveLastFocusedChild` 不足以跨页恢复，因此把最后聚焦的游戏 id 持久化在 Zustand（`lastFocusedGameId`），返回库时 `setFocus('GAME-<id>')` 还原。
- **双模式与覆盖层**：`navActive = launcher || qamOpen || ingameMenuOpen` 统一判断是否启用 UI 导航；进入游戏暂停 Norigin，把手柄让给模拟器，仅 Guide 按钮被拦截用于唤出菜单。

> 已解决的坑：键盘 Enter 会同时触发 Norigin 的 `onEnterPress` 与原生按钮 click，导致重复导航 —— 通过在 Enter 上 `preventDefault` 抑制原生激活解决。

### 5.2 EmulatorJS 集成与生命周期（iframe 隔离）

- **`<EmulatorPlayer>` 把 EmulatorJS 跑在同源 `<iframe srcDoc>` 里**。srcdoc 内联脚本设置 `EJS_*` 全局并加载 `loader.js`；所有 URL 用 `location.origin` 绝对化（srcdoc 的 base 可能是 `about:srcdoc`，根相对路径会失效）。
- **彻底销毁**：组件卸载即移除 iframe，整套引擎上下文（emscripten 模块、WebGL、RAF、AudioContext、全部全局）随之销毁——**这是修复「退出后再进黑屏」的关键**。早期在主窗口删全局的方式无法真正杀掉运行中的引擎，导致再次进入黑屏；iframe 方案保证每次启动都是全新实例。
- **退出一致性**：EmulatorJS 自带的「Exit Emulation」按钮通过 `EJS_emulator.on('exit', …)`（在 srcdoc 的 `EJS_ready` 中注册）→ `postMessage` 通知父窗口 → 导航回主页。这样**引擎内置退出与应用退出殊途同归**，都会完整卸载 iframe。
- **跨窗口桥接**：`EJS_emulator` 现在位于 iframe 的 `contentWindow`。`emulator/bridge.ts` 注册该窗口，`controls.ts` 据此读取实例（同源 iframe 可直接访问）。
- **存档链路**：`gameManager.getState()` 取状态（`Uint8Array`，同步）、`screenshot()` 取 PNG（Promise）；读档 `loadState(bytes)`；重置 `restart()`。
  - 关键坑：`screenshot()` 在模拟器**暂停后会挂起**（无新帧）。游戏内菜单因此在**调用 pause 之前**先抓取状态与截图快照，存档时再上传。

### 5.3 设计系统（高保真仿 SteamOS）

- `design/tokens.css` 定义暗色蓝灰底、半透明面板、`backdrop-filter` 玻璃拟态、蓝色焦点高亮（`--focus-glow`）、圆角/间距/图块尺寸等 token，并映射进 Tailwind 主题（`bg-bg-1`、`text-accent`、`shadow-focus` 等）。
- 动效：焦点态 spring 缩放 + 光晕；路由 `AnimatedOutlet` 用 `AnimatePresence mode="wait"` 做交叉淡入；详情页 hero 缩放入场 + 元数据上浮；骨架屏 shimmer；货架平滑滚动。
- **合规红线**：仅还原设计系统与交互，不使用 Valve 商标/专有素材；自有品牌名 WebConsole、开源图标（Lucide）与字体（Inter）。

### 5.4 数据模型与 API

模型：`Game`（含 platform/core/romPath/playCount/tags）、`SaveState`（gameId/slot/statePath/screenshot）、`PlayHistory`（gameId/lastPlayedAt/playSeconds）。`userId` 全部固定 `"local"`。

REST（`/api/v1`，成功包 `{data}`，错误包 `{error:{code,message}}`）：

| Method | Path | 说明 |
|--------|------|------|
| GET | `/games` | 列表（platform/search/tag/sort/page/pageSize） |
| GET | `/games/:id` | 详情（含 romUrl/core） |
| GET | `/games/recent` · `/games/most-played` | 最近 / 最热门货架 |
| GET | `/stats/platforms` · `/tags` · `/config` | 平台计数 / 标签 / 运行时配置 |
| POST | `/history/record` | 上报游玩时长（+1 次播放计数） |
| GET | `/saves/game/:gameId` | 存档槽列表 |
| POST | `/saves/slot` | 上传/覆盖槽（multipart：gameId/slot/state/screenshot） |
| GET | `/saves/download/:saveId` | 下载状态二进制 |
| DELETE | `/saves/:saveId` | 删除存档 |

静态：`/roms/*`、`/covers/*`、`/saves/*`（截图）均支持 Range（`http.FileServer`）。

### 5.5 单二进制内嵌

`backend/internal/web/web.go` 用 `//go:embed all:dist` 内嵌前端产物；`NoRoute` 兜底返回 `index.html`（支持客户端路由），并放行 `api/ roms/ covers/ saves/` 前缀避免遮蔽。开发态 dist 仅占位文件，`Available()` 返回 false，转而走 Vite 代理。

---

## 6. 部署方法

### 6.1 开发模式

```bash
# 后端（:8080）
cd backend && go run ./cmd/webconsole
# 健康检查：curl http://localhost:8080/healthz
# 首次启动会从 test-roms/ 导入 4 个 NES 测试 ROM 到 data/roms/nes/

# 前端（:5173，代理 /api /roms /covers /saves → :8080）
cd frontend && npm install && npm run dev
```

### 6.2 生产：单文件二进制

```bash
./build.sh                  # 构建前端 → 内嵌进 backend/internal/web/dist → go build
cd backend && ./webconsole  # 浏览器打开 http://localhost:8080（API + 前端 + ROM 同源）
```

配置在 `backend/config.yaml`：`addr`、`dataDir`、`testRomsDir`、`emulatorjsDataPath`、`ginMode`。运行时数据落在 `data/`。

### 6.3 Docker

```bash
docker build -t webconsole .
docker run -p 8080:8080 -v "$PWD/data:/data" webconsole
```

多阶段构建（node 构建前端 → go 内嵌编译，`CGO_ENABLED=0`）→ distroless 静态镜像；挂载 `/data` 卷持久化游戏库、ROM、存档与数据库。

### 6.4 添加游戏（多平台）

把 ROM 放进 `data/roms/<platform>/` 并重启后端即自动入库（按文件名取显示名）：

| 目录 | 平台 | 核 | 扩展名 |
|------|------|----|--------|
| `nes/`  | NES      | `nes`  | `.nes` |
| `snes/` | SNES     | `snes` | `.smc` `.sfc` |
| `gba/`  | GBA      | `gba`  | `.gba` |
| `gb/`   | GB / GBC | `gb`   | `.gb` `.gbc` |

> **内容合规**：项目不内置、不抓取任何受版权 ROM；Demo 仅含 NESDev 公开测试 ROM。正式内容由部署者提供合法 ROM（自有卡带 dump / homebrew / 公有领域 / 授权）。

### 6.5 EmulatorJS 引擎数据源

设置页可在「服务器默认 / 官方 CDN / 自托管」间切换（持久化在 localStorage）。离线/主机形态可把引擎数据放到 `frontend/public/emulatorjs/data/` 并选「自托管」（`/emulatorjs/data/`）。

---

## 7. 已知问题与取舍

- **跨路由共享元素动效（layoutId 图块↔hero）**：曾用 `AnimatePresence mode="popLayout"` 实现，但页面重叠期间 Norigin 会读到已脱离布局的焦点节点（告警风暴 + 危及手柄焦点树——本项目第一风险）。**取舍：优先焦点稳定性**，改为干净的交叉淡入 + hero 入场动画。后续可用「持久化共享层 + FLIP」方式重做。
- **Norigin 告警**：`motion.button` 与 `useFocusable` 的 ref 时序会产生 “Component added without a node reference” 告警，自 Phase 3 起即存在，**仅为控制台噪音，焦点功能验证正常**。
- 设置页的控制器自定义映射、画面滤镜目前为占位，尚未实现。

---

## 8. 后续开发方向

按优先级与价值排序：

### 8.1 体验打磨（短期）—— ✅ 已完成（2026-06-06）
- ✅ **共享元素过渡（FLIP 图块↔hero）**：点击图块时记录封面视口矩形（`store.transitionCover`），详情页用独立的 `fixed` overlay 层（`SharedCoverMorph`，transform translate+scale）从该矩形 FLIP 形变到 hero，再清除并露出真实 hero。纯视觉层，不进焦点树；带 700ms 安全清除兜底。
- ✅ **消除 Norigin 告警**：`useFocusable` 的 ref 一律挂到「已渲染的真实 DOM 节点」——图块/详情按钮用普通 `<button>` + 内层 `motion` 子元素；网格容器始终渲染；QAM/游戏内菜单拆成「仅打开时挂载」的内层 Panel。焦点恢复改为同步 `setFocus` 叶子键（rAF 在无绘制时不触发）。
- ✅ **封面与元数据**：后端 `PATCH /games/:id`（名称/描述/标签）+ `POST /games/:id/cover`（封面上传）；详情页「编辑」弹窗（封面选择 + 字段），保存后失效查询缓存；图块封面加 `onError` 回退占位。
- ✅ **QAM 完整化（音量）**：`VolumeControl` 组件在 QAM 与游戏内菜单中调节音量，持久化到 `settings.volume`，游戏内 `live` 模式实时调用 `EJS_emulator.setVolume`。

**本阶段附带修复**：`AnimatePresence mode="wait"` + `useOutlet` 会导致导航卡死（URL 变了但新页不挂载），已改为按 pathname keyed 的 `motion.div` 纯淡入；移除 `React.StrictMode`（dev 双挂载搅乱 AnimatePresence/焦点树，生产本就不双挂载）。

**8.1 有意延后（低 ROI / 已有替代）**：
- 画面比例/滤镜的「应用层」实时调节——EmulatorJS 自带设置菜单（游戏内菜单栏「控制设置」等）已可调，WebConsole 原生封装延后。
- 原生 View Transitions API——当前 FLIP + 路由淡入已够；且仅 Chromium、属计划内「可选」，延后。

### 8.2 功能扩展（中期）
- **设置落地**：控制器按键自定义映射 UI、画面比例/着色器、引擎参数；后端 `/settings` 持久化（或继续 localStorage）。
- **存档增强**：自动存档/快速存档槽、云端/外部备份导出导入、存档管理页。
- **游戏库管理**：扫描进度反馈、删除/隐藏游戏接口（当前扫描只增不删）、标签/收藏/排序完善、搜索框。
- **更多平台评估**：保持单一 EmulatorJS 栈前提下评估其支持的更多核（如 N64、PCE 等）；DOS 仍不在范围（无核）。

### 8.3 工程与质量（持续）
- **测试**：后端 service/handler 单测 + API 集成测试；前端组件测试与手柄导航的端到端测试（Playwright + 虚拟 Gamepad）。
- **CI/CD**：GitHub Actions 跑 `go vet`/`go test`、`tsc`/`eslint`/`vite build`，并产出多平台二进制与 Docker 镜像。
- **可观测性**：结构化日志、基础指标、错误上报。
- **健壮性**：大 ROM 流式与并发存档的压力测试；EmulatorJS 版本升级回归。

### 8.4 多用户（远期，超出当前范围）
- 引入 JWT + User 表，把写接口的固定 `userId="local"` 改为按用户隔离；每用户独立游戏库/存档/历史。设计上已为此预留（所有写接口都带 `userId`）。

---

*维护提示：架构/接口/选型变更请同步回写本文件与 [`development-plan.md`](development-plan.md)。代码注释、变量、commit 用英文；文档中英混排。*
