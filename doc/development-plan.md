# WebConsole — 开发计划

> Steam Deck 风格的 Web 游戏机：手柄即可全程操作，浏览器内畅玩 SNES / GBA / GBC 等经典游戏，统一基于 EmulatorJS，后端 Go。目标是在交互逻辑、界面布局、动效上**高度还原 SteamOS / Deck UI**。

**已锁定决策（v2, 2026-06-03）：① 不做 DOS；② 单用户本地鉴权；③ 前端 = React 18 + Framer Motion；④ 视觉目标 = 高保真仿 SteamOS（仅还原设计系统，不搬用 Valve 商标/素材）。**

---

## 0. 本文档怎么用（给后续开发 agent）

- 这是**单一事实来源（single source of truth）**。每个开发任务对应第 11 节的一个 **Phase**。
- 启动新 agent 时告诉它：「阅读 `doc/development-plan.md`，执行 **Phase N**，完成后勾选验收清单」。
- 每个 Phase 有：**目标 / 任务清单 / 交付物 / 验收标准（可自测）/ 关键文件**。按编号顺序推进。
- 改动架构/接口/选型，**必须回写本文档**。代码注释、变量、commit 用英文；本文档中英混排。

---

## 1. 产品愿景与范围

### 1.1 一句话定位
自托管、**手柄优先**的网页游戏机。打开即是 SteamOS Big Picture 那样的大图块界面：手柄方向键浏览、A 启动、进游戏后手柄直接操作模拟器，B/Guide 唤出游戏内菜单。

### 1.2 目标平台（模拟核心）
| 平台 | EmulatorJS `EJS_core` | 底层 libretro core | 优先级 |
|------|----------------------|---------------------|--------|
| NES（红白机）| `nes` | fceumm / nestopia | **Demo 基础**（已有测试 ROM） |
| SNES（超任）| `snes` | snes9x | P0 目标 |
| GBA | `gba` | mGBA | P0 目标 |
| GB / GBC | `gb` | gambatte（GB/GBC 同核）| P0 目标 |
| ~~DOS~~ | — | — | **不做**（已决定，见 §10）|

> NES/SNES/GBA/GB/GBC 全是 EmulatorJS 一等公民，共用同一套接入代码，只换 `EJS_core` 和 ROM 文件。技术栈因此保持**单一 EmulatorJS**，无第二引擎。

### 1.3 范围边界
- **做**：游戏库浏览、手柄导航、模拟器播放、即时存档（save state）本地存储、最近游玩、平台分类、控制器/画面设置、高保真 SteamOS 风格 UI + 动效。
- **不做**：DOS、联机 netplay、社交/评论、成就系统、多用户权限（**单用户本地**，固定 `userId="local"`，无登录流程）。
- **内容合规**：**不内置、不抓取任何受版权 ROM**。Demo 仅用 NESDev 公开测试 ROM（`test-roms/`）。正式内容由部署者提供合法 ROM（自有卡带 dump / homebrew / 公有领域 / 授权）。
- **视觉合规**：还原 SteamOS 的**设计系统与交互**（布局、配色风格、玻璃拟态、焦点动效），但**不使用 Valve 的商标/专有素材**：Steam logo、Steam 按钮字形、专有插画、"Steam" 字样、Motiva Sans 字体。详见 §9.4。

---

## 2. 技术栈决策（已锁定）

### 2.1 前端：React 18 + TypeScript + Vite + Framer Motion
**为什么 React**：SteamOS 的 Deck UI / Big Picture **本身就是 React 跑在 Chromium(CEF) 上**（据 Decky Loader / `@decky/ui` 社区逆向）。所以 React 是离"原件"最近的选择，且本项目最大 UX 风险——**手柄空间导航**与**共享元素过渡**——在 React 生态有最成熟的现成方案。（注：`decky-frontend-lib` 只能在 Steam 运行时内复用 Valve 组件，独立站点无法直接引用，故观感需自实现。）

| 关注点 | 选型 | 说明 |
|--------|------|------|
| 框架 | React 18 + TypeScript | 与 Valve Deck UI 同栈 |
| 构建 | Vite | HMR 快 |
| 样式 | Tailwind CSS + CSS 变量 token | SteamOS 暗色玻璃拟态设计系统（§9）|
| **动效** | **Framer Motion**（核心，非可选）| `layoutId` 共享元素过渡（图块→hero）、spring 焦点物理、页面过渡——SteamOS 标志性动效靠它 |
| 空间导航 | **`@noriginmedia/norigin-spatial-navigation`**（首选）或 BBC `lrud` | 焦点树 + 焦点记忆（核心，§8）|
| 手柄输入 | 自研 hook（Gamepad API 轮询）| 把手柄信号翻译成方向意图/动作，喂给导航库（§8）|
| 路由 | React Router v6 | + 原生 View Transitions API（Chromium）增强页面过渡 |
| 服务端状态 | TanStack Query | 列表/详情缓存 |
| 客户端状态 | Zustand | 输入模式、设置、手柄/焦点状态 |
| 图标 | Lucide 或 Phosphor（开源）| **不**用 Valve 专有图标 |
| 字体 | Inter 或 Fira Sans（开源）| 替代 Valve 专有的 Motiva Sans |
| 模拟器 | EmulatorJS | `EJS_*` + `loader.js`，封装成 `<EmulatorPlayer>`（§7）|

### 2.2 后端：Go + Gin + SQLite
| 关注点 | 选型 | 说明 |
|--------|------|------|
| 语言 | Go 1.22+ | |
| Web 框架 | **Gin** | 备选 Chi / Fiber |
| 数据库 | **SQLite**（`modernc.org/sqlite`，纯 Go 无 CGO）| 单文件、单二进制；扩容路径 → PostgreSQL |
| ORM | **GORM** | |
| 文件存储 | 本地 FS（`data/roms`、`data/covers`、`data/saves`）| HTTP 静态 + Range |
| 鉴权 | **单用户本地**：固定 `userId="local"`，无登录 | 所有写接口默认归属 local；将来要多用户再加 JWT（不在本计划范围）|

### 2.3 部署：单一二进制
`vite build` 产物经 Go `embed.FS` 内嵌，单个 `webconsole` 同源提供 API + SPA + ROM/封面静态资源。EmulatorJS 引擎数据 MVP 用 CDN，主机/离线形态自托管（§12）。

---

## 3. 系统架构

```
┌──────────────────────────────────────────────────────────┐
│ Browser (React SPA, 手柄优先, SteamOS 风格)                │
│                                                            │
│  GamepadProvider (轮询 navigator.getGamepads)              │
│        │ 方向意图 / 按键事件                                │
│        ▼                                                   │
│  Spatial Navigation (Norigin: 焦点树 + 焦点记忆)           │
│        │   + Framer Motion (共享元素过渡 / spring)         │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Library 货架 │   │ GameDetail   │   │ EmulatorPlayer │  │
│  │ /网格 + QAM  │──▶│ hero 大图    │──▶│ (EmulatorJS)   │  │
│  └─────────────┘   └──────────────┘   └────────────────┘  │
│        │ React Query                          │ save state │
└────────┼──────────────────────────────────────┼───────────┘
         │ REST /api/v1/*  (userId 固定 local)   │
         ▼                                       ▼
┌──────────────────────────────────────────────────────────┐
│ Go 后端 (Gin)                                              │
│  handlers → services → repositories → GORM → SQLite        │
│  静态: /roms/*  /covers/*  /saves/*  (Range)  +  embed 前端 │
└──────────────────────────────────────────────────────────┘
         │  data/ (roms / covers / saves / webconsole.db)
```

**双模式输入**（§8）：`launcher`（手柄驱动 UI 焦点）↔ `ingame`（手柄交给 EmulatorJS，长按 Guide 唤出游戏内菜单）。

---

## 4. 目录结构（monorepo）

```
WebConsole/
├── doc/development-plan.md
├── test-roms/                        # 已有：NESDev 公开测试 ROM + demo
├── backend/                          # Go
│   ├── cmd/webconsole/main.go        # 入口（embed 前端 dist）
│   ├── internal/{config,model,repository,service,handler,router,storage}
│   ├── config.yaml
│   └── go.mod
├── frontend/                         # React
│   ├── src/
│   │   ├── api/                      # API client + React Query hooks
│   │   ├── input/                   # GamepadProvider, useGamepad, 按键映射
│   │   ├── design/                  # 设计系统：tokens.css, theme, primitives
│   │   ├── components/              # GameTile, Shelf, FocusGlow, QuickAccessMenu…
│   │   ├── features/{library,detail,player,settings}/
│   │   ├── store/                   # Zustand
│   │   ├── routes/                  # React Router
│   │   └── styles/                  # Tailwind 入口
│   ├── public/emulatorjs/data/      # （可选）自托管 EmulatorJS 引擎数据
│   ├── vite.config.ts               # dev proxy → backend
│   └── package.json
├── data/                             # 运行时数据（git 忽略）: roms/ covers/ saves/ webconsole.db
└── README.md
```

---

## 5. 数据模型（GORM + SQLite）

```go
type Game struct {
    ID          string    `gorm:"primaryKey" json:"id"`
    Name        string    `json:"name"`
    NameCn      string    `json:"nameCn"`
    Platform    string    `gorm:"index" json:"platform"` // nes/snes/gb/gbc/gba
    Core        string    `json:"core"`                  // EmulatorJS EJS_core
    Description string    `json:"description"`
    CoverPath   string    `json:"cover"`
    RomPath     string    `json:"-"`
    BiosPath    string    `json:"-"`
    FileSize    int64     `json:"fileSize"`
    PlayCount   int64     `json:"playCount"`
    Tags        string    `json:"tags"`                  // JSON 数组字符串
    CreatedAt   time.Time `json:"createdAt"`
    UpdatedAt   time.Time `json:"updatedAt"`
}

type SaveState struct {
    ID         string    `gorm:"primaryKey" json:"id"`
    GameID     string    `gorm:"index" json:"gameId"`
    UserID     string    `gorm:"index" json:"userId"`   // 固定 "local"
    Slot       int       `json:"slot"`
    StatePath  string    `json:"-"`
    Screenshot string    `json:"screenshot"`
    SizeBytes  int64     `json:"sizeBytes"`
    CreatedAt  time.Time `json:"createdAt"`
    UpdatedAt  time.Time `json:"updatedAt"`
}

type PlayHistory struct {
    ID           string    `gorm:"primaryKey" json:"id"`
    GameID       string    `gorm:"index" json:"gameId"`
    UserID       string    `gorm:"index" json:"userId"`  // 固定 "local"
    LastPlayedAt time.Time `json:"lastPlayedAt"`
    PlaySeconds  int64     `json:"playSeconds"`
}
```

> 单用户本地：`userId` 全部写死 `"local"`，无 User 表、无登录。将来要多用户再引入 JWT + User（超出本计划）。

---

## 6. REST API 规范（`/api/v1`）

响应包 `{ "data": ... }`；错误 `{ "error": {"code","message"} }`。所有写接口隐式 `userId="local"`。

| Method | Path | 说明 | 参数 / Body |
|--------|------|------|-------------|
| GET | `/games` | 列表（分页/筛选）| `platform, search, tag, sort, page, pageSize` |
| GET | `/games/{id}` | 详情（含 `romUrl,biosUrl,core`）| |
| GET | `/games/recent` | 最近游玩（货架）| `limit` |
| GET | `/games/most-played` | 最热门 | `limit` |
| GET | `/stats/platforms` | 各平台数量 | |
| GET | `/tags` | 全部标签 | |
| POST | `/history/record` | 上报游玩时长 | `{ gameId, seconds }` |
| GET | `/saves/game/{gameId}` | 存档槽列表 | |
| POST | `/saves/slot` | 上传/覆盖槽（multipart）| `gameId, slot, state, screenshot` |
| GET | `/saves/download/{saveId}` | 下载存档二进制 | |
| DELETE | `/saves/{saveId}` | 删除存档 | |
| GET | `/config` | 前端运行时配置 | `emulatorjsDataPath` 等 |
| GET | `/settings` / PUT | 本地设置（手柄映射/画面）| 也可前端 localStorage |

静态（Gin + `http.ServeContent`，支持 Range）：`/roms/{platform}/{file}`、`/covers/{...}`、存档走 `/saves/download/{id}`。

`GET /api/v1/games/{id}` 示例：
```json
{ "data": {
  "id": "1", "name": "nestest", "nameCn": "NES CPU 测试",
  "platform": "nes", "core": "nes",
  "cover": "/covers/nes/nestest.png", "romUrl": "/roms/nes/nestest.nes",
  "biosUrl": "", "fileSize": 24592, "playCount": 0, "tags": ["测试"]
}}
```

---

## 7. EmulatorJS 集成（单引擎，直接封装）

已在 `test-roms/index.html` 验证。React 中封装 `<EmulatorPlayer game onSaveState onExit />`：

```ts
window.EJS_player = '#game';
window.EJS_core = game.core;             // 'nes'|'snes'|'gba'|'gb'
window.EJS_gameUrl = game.romUrl;        // 后端 /roms/...
window.EJS_biosUrl = game.biosUrl || '';
window.EJS_pathtodata = config.emulatorjsDataPath; // CDN 或 /emulatorjs/data/
window.EJS_startOnLoaded = true;
window.EJS_gameID = game.id;
```

封装要点：
- 组件卸载**必须彻底销毁** EmulatorJS（清空 `#game`、删除 `EJS_*` 全局、移除注入 script），否则切游戏会串画面。
- 切游戏 = 卸载旧实例 + 重新初始化，不复用。
- ROM 走后端流式（Range）。GB/GBC 都用 `gb` 核。
- **无多引擎适配器**（DOS 已砍）；保留一个薄 `EmulatorPlayer` 边界即可。
- 存档链路：游戏内菜单导出 state（二进制）+ 截帧 → `POST /saves/slot` → `data/saves/`；读档 `GET /saves/download/{id}` → 喂回 EmulatorJS。

---

## 8. 手柄导航系统（核心难点）

### 8.1 输入采集（Gamepad API 无事件，需轮询）
```
requestAnimationFrame 循环
  → navigator.getGamepads()[0]
  → 读 axes(左摇杆) + buttons(dpad/A/B/X/Y/LB/RB/Start/Select/Guide)
  → 边沿检测 + 方向去抖（首触 + 长按 repeat-delay）
  → 派发语义事件:
      DIRECTION: up/down/left/right
      ACTION: confirm(A)/back(B)/context(X,Y)/tabPrev(LB)/tabNext(RB)/menu(Start)/guide(长按)
```

### 8.2 对接 Norigin
- 可聚焦元素用 `useFocusable()` 注册进焦点树。
- `DIRECTION` → `navigateByDirection(...)`；`confirm` → 激活当前焦点；`back` → 后退/关弹层。
- 焦点变化自动 `scrollIntoView`（货架/网格跟随滚动）。
- **焦点记忆**（SteamOS 关键手感）：离开一行/区块再回来，焦点回到上次位置——用 Norigin 的 focus key 持久化或自管 per-section last-focused map。
- **键盘镜像**：方向键/Enter/Esc 映射同一套语义事件，便于无手柄调试。

### 8.3 双模式 + QAM
- Zustand `inputMode: 'launcher' | 'ingame'`。
- 进 `<EmulatorPlayer>` → `ingame`，暂停 launcher 方向导航（不与 EmulatorJS 抢手柄）。
- 长按 Guide/Start → **游戏内覆盖菜单**（半透明玻璃，手柄可导航：继续/存档/读档/重置/退出）；打开时临时切回 launcher 导航，关闭还给游戏。
- **QAM（Quick Access Menu）**：仿 SteamOS 侧拉快捷菜单（音量/画面比例/滤镜/退出），launcher 与 ingame 均可由肩键/Guide 唤出。

### 8.4 验收手感基线
- 网格内方向移动跟手、长按连续滚动、焦点高亮清晰（spring 缩放 + 光晕）、焦点记忆生效。
- 全流程（选游戏→启动→存档→退出）**不碰鼠标键盘**可完成。

---

## 9. SteamOS 高保真设计系统

> 目标：交互逻辑、界面布局、动效**高度还原 SteamOS Deck UI**。还原"系统"，不搬"素材"（§9.4）。

### 9.1 设计 Token（`frontend/src/design/tokens.css`，原创近似值，非 Valve 实际数值）
```css
:root{
  /* 暗色蓝灰底 + 玻璃拟态 */
  --bg-0:#0e1419; --bg-1:#171d25; --bg-2:#1f2730; --panel:rgba(31,39,48,.72);
  --text-0:#eef3f8; --text-1:#aebaccc; --text-dim:#6b7785;
  --accent:#4ba7ff; --accent-strong:#1a9fff;      /* 蓝色高亮（focus/选中）*/
  --focus-glow:0 0 0 3px rgba(75,167,255,.9), 0 8px 30px rgba(75,167,255,.35);
  --radius:14px; --radius-lg:22px;
  --blur:18px;                                      /* backdrop-filter */
  --shelf-gap:18px; --tile-w:200px; --tile-ratio: 3/4;
}
```
- 配色基调：极暗蓝灰背景 + 半透明面板 + `backdrop-filter: blur()`（玻璃拟态），蓝色高亮表达焦点/选中。
- 字体：**Inter / Fira Sans**（开源，替代 Motiva Sans）；大字重标题 + 宽松字距。
- 图标：**Lucide / Phosphor**（开源）。

### 9.2 布局（仿 Big Picture）
- 顶部状态条：时间、设置入口、平台 Tab（全部 / NES / SNES / GBA / GB(C)）。
- 首行货架「继续游戏」（最近游玩，带存档缩略图）→ 下方分平台货架或大网格。
- 详情页：全幅 **hero 大图** + 元数据 + 主按钮「开始游戏」/「继续（有存档）」+ 存档槽列表。
- **QAM** 侧拉快捷菜单（§8.3）。

### 9.3 动效（Framer Motion）
- **焦点态**：`spring` 缩放 1.0→~1.06 + `--focus-glow` 光晕 + 轻微上浮阴影。
- **共享元素过渡**：图块→详情 hero 用 `layoutId` 形变/crossfade（SteamOS 标志动效）。
- **货架滚动**：缓动 + 惯性感；焦点驱动 `scrollIntoView` 平滑跟随。
- **页面/弹层过渡**：Framer Motion + 可叠加原生 View Transitions API（Chromium）。
- 60fps：全部走 GPU 合成的 transform/opacity，**不用 canvas/WebGL**（DOM 足够，Steam 自身亦 DOM/CEF）。

### 9.4 商标/素材红线（务必遵守）
- ✅ 可做：布局结构、交互模式、玻璃拟态暗色风、蓝色高亮基调、自有图标字体、近似配色。
- ❌ 不可：Steam logo / Steam 按钮字形、Valve 专有插画与背景图、"Steam" 字样品牌、Motiva Sans 字体文件。
- 自创品牌名与 logo（项目名 **WebConsole**），避免与 Valve 商标混淆。

---

## 10. DOS —— 已决定不做

EmulatorJS 无 DOS 核（已核实）。为保持**单一 EmulatorJS 技术栈**，本项目**不支持 DOS**。因此也不需要多引擎适配器层，`<EmulatorPlayer>` 直接封装 EmulatorJS 即可。若将来确有需求，再单独评估引入 `js-dos`，但不在当前计划内。

---

## 11. 分阶段开发路线图

> 每个 Phase 可独立交给一个 agent。按序执行。✅ 验收必须可自测。

### Phase 0 — 仓库脚手架与工具链
- 建 `backend/`（`go mod init` + Gin hello）、`frontend/`（Vite+React+TS+Tailwind）、根 `README`、`.gitignore`（忽略 `data/ node_modules dist`）、`data/{roms,covers,saves}` 占位。
- ✅ `go run ./cmd/webconsole` 起 :8080 健康检查；`npm run dev` 起前端空页；`vite.config.ts` 配 `/api`、`/roms`、`/covers`、`/saves` 代理。

### Phase 1 — 后端 MVP（游戏库 + 静态 ROM 服务）
- GORM 模型 + SQLite AutoMigrate；实现 `/games`、`/games/{id}`、`/stats/platforms`、`/config`；`/roms/*`、`/covers/*` 静态（Range）；**seed 脚本**导入 `test-roms/` 4 个 NES ROM 到 `data/roms/nes/`（platform=nes, core=nes, 占位封面）。
- ✅ `curl /api/v1/games?platform=nes` 返回 4 条；`/games/{id}` 含 `romUrl`；`curl -r 0-1023 /roms/nes/nestest.nes` 返回 206。

### Phase 2 — 前端基础 + 设计系统奠基
- API client + React Query hooks；路由（`/` 库、`/game/:id` 详情、`/play/:id` 播放）。
- **设计系统**：`design/tokens.css`（§9.1）、Tailwind 主题接入 token、Inter/Fira Sans 字体、Lucide 图标、玻璃拟态面板与按钮 primitives。
- `GameTile` / `Shelf` / 平台 Tab；拉 `/games`、`/stats/platforms` 渲染库。
- ✅ 首页 SteamOS 暗色风显示 4 个 NES 图块，点击进详情；设计 token 全局生效。

### Phase 3 — 手柄导航系统（核心）
- 装 Norigin 并 `init()`；`GamepadProvider` + `useGamepad`（§8 轮询/边沿/去抖）；语义事件→`navigateByDirection`/`setFocus`；键盘镜像；**焦点记忆**；焦点高亮（spring 缩放 + `--focus-glow`）+ `scrollIntoView`；Zustand `inputMode`；QAM 骨架。
- ✅ 满足 §8.4 手感基线；拔掉鼠标用手柄/方向键全程导航；焦点记忆生效。

### Phase 4 — EmulatorJS 播放器集成
- `<EmulatorPlayer>`（设 `EJS_*`、加载 `loader.js`、卸载彻底销毁）；详情页「开始游戏」→ `/play/:id`；`inputMode='ingame'` 切换；引擎数据源走 `/config`（MVP 用 CDN）。
- ✅ 4 个 NES ROM 均可启动运行，手柄能操作游戏；退出回库无残留实例（切换不串画面）。

### Phase 5 — 即时存档 + 游玩历史
- 后端 `/saves/*`、`/history/record`、`/games/recent`；前端游戏内菜单（存档/读档/重置/退出，手柄可导航）；存档上传截图 + 二进制；首页「继续游戏」货架。
- ✅ 存档→退出→「继续游戏」出现→重进读档恢复；多槽位；时长上报。

### Phase 6 — SteamOS 高保真打磨（动效 + QAM）
- **共享元素过渡**（`layoutId` 图块↔hero）；spring 焦点物理细调；hero 详情页全幅大图；货架惯性滚动；QAM 完整化；加载/骨架/空/错误态；开机引导焦点；（可选）View Transitions API。
- ✅ 整体观感与导航过渡高度接近 SteamOS Deck UI；60fps 无跳变。

### Phase 7 — 接入真实平台 SNES / GBA / GB(C)
- 后端支持 `snes/gba/gb` platform/core；导入流程支持多平台（`data/roms/<platform>/`）；前端平台 Tab + 核映射验证；用**合法 homebrew/公有领域 ROM** 各放 1–2 个端到端验证（**禁止**版权 ROM 入库）。
- ✅ 每平台 ≥1 款 homebrew 可启动；切平台/切核无串扰。

### Phase 8 — 设置 + 单二进制打包部署
- 设置页（手柄映射/画面比例/滤镜/引擎数据源）；`vite build` → Go `embed.FS` 内嵌；（可选）自托管 EmulatorJS `data/` 离线；Dockerfile；`config.yaml`；README 部署文档。
- ✅ `go build` 出单文件，运行后浏览器访问即得完整应用（API+前端+ROM 同源）。

---

## 12. 部署

- **开发**：后端 `go run` :8080；前端 `vite dev` :5173，代理 `/api`、`/roms`、`/covers`、`/saves`。
- **生产**：`vite build` → `frontend/dist` 经 `//go:embed` 内嵌；Go 同源提供 SPA（fallback index.html）+ API + 静态。单二进制 + `data/` 目录。
- **EmulatorJS 数据**：MVP 用官方 CDN `https://cdn.emulatorjs.org/stable/data/`；离线/主机形态自托管 `frontend/public/emulatorjs/data/`，`/config` 下发路径切换，前端不改代码。
- **Docker**：多阶段（node build 前端 → go build 内嵌），distroless 镜像 + 挂载 `data/` 卷。

---

## 13. 风险与决策记录

### 已决策（v2）
1. **不做 DOS** —— 保持单一 EmulatorJS 栈。
2. **单用户本地鉴权** —— 固定 `userId="local"`，无登录；多用户超出范围。
3. **前端 = React 18 + Framer Motion** + Norigin/lrud + Tailwind。
4. **高保真仿 SteamOS** —— 还原设计系统/交互/动效，**不搬用 Valve 商标/素材**（§9.4）。

### 风险
| 项 | 风险 | 处理 |
|----|------|------|
| ROM 版权 | 内置商业 ROM 违法 | 仅测试/homebrew/公有领域；正式内容由部署者提供 |
| 手柄导航手感 | 项目最大 UX 风险 | Norigin + 焦点记忆；Phase 3 单独立项早验证 |
| 共享元素过渡复杂度 | 高保真动效易卡顿 | Framer Motion `layoutId` + 仅 transform/opacity；Phase 6 专项 |
| EmulatorJS 实例生命周期 | 卸载不净串画面 | `<EmulatorPlayer>` 严格销毁；切游戏=重建 |
| 大 ROM 流式 | 分块读 ROM | 后端静态 Range（Phase 1 必须）|
| **SteamOS 商标/素材** | 仿外观越界侵权 | 严守 §9.4 红线：还原系统不搬素材，自有品牌/图标/字体 |

---

*文档版本：v2（2026-06-03）—— 四项决策已锁定。后续每次架构/接口变更请同步更新本文件。*
