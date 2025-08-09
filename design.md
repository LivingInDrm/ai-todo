# 极简 TodoList — 产品设计文档

> **一句话定位**
> 极简的代办管理(todo list)APP，支持语音输入

---

## 0. 产品范围

| 功能模块   | 说明                                 | MVP 必含 |
| ------ | ---------------------------------- | ------ |
| 任务生命周期 | 新建、查看 / 编辑、完成 / 恢复、延后、置顶、删除、紧急标记   | ✅      |
| 三视图    | **Focus / Backlog / Done** 列表切换    | ✅      |
| 语音输入   | Whisper → LLM 解析批量操作，插入「待确认区」      | ✅      |
| 本地提醒   | `due_ts – 30 min` 推送（仅含日期默认 09:00） |   ✅    |
| 云同步    | Supabase Realtime；最后写入覆盖           | ✅      |
| 设置     | 注册登录/语言切换                  | ✅  |

---

## 1. 核心设计理念



1. **极简视图**
   仅 **Focus / Backlog / Done** 三个列表，任务按时序与状态自然流转。
2. **单入口卡片**
   新建、查看、编辑统一在底部 **Bottom Sheet** 中完成。
3. **最少隐式手势**

   * 右滑 ≈ 30 %：完成 ↔ 恢复
   * 左滑 → ⋯：延后 / 置顶 / 删除
4. **字段极简**
   `id, title, due_ts, urgent, status, completed_ts, created_ts, updated_ts, pending, remote_id（用于本地数据库对齐supabase的id)`
5. **所见即所得 & 可撤销**
   列表即真数据，所有批量操作 3 s 内可一键撤销。

---

## 2. 信息架构（IA）

```
TaskListScreen (单页)
├─ Tabs：Focus | Backlog | Done
├─ Draft 区域（该区域不是常驻的，仅在语音输入功能的过程中展现）
│   └─ 动作标识（新增、更改、完成、删除）
│   └─ TaskCell
├─ Active 区域
│   └─ TaskCell …
└─ EmptyState（视图专属文案）
底部：🎤 语音输入 | ➕ 新增任务
顶栏右：⚙ 设置入口
```

---

## 3. 关键用户动作（八大动作）

| 动作          | 触发方式                         | 系统行为                    |
| ----------- | ---------------------------- | ----------------------- |
| 新建          | 右下 **＋** → 输入标题 → 关闭卡片       | 自动保存并插入列表               |
| 查看 / 编辑     | 点任务行                         | 打开 Bottom Sheet 实时修改    |
| 完成 / 恢复     | **右滑≈30 %**                  | `status` 切换；自动迁移列表      |
| 延后          | 左滑 → ⋯ → 今晚 / 明天 / 本周末 / 自定义 | 更新 `due_ts`             |
| 置顶（仅 Focus） | 左滑 → ⋯ → 置顶                  | 将任务置于 Focus 首位          |
| 删除          | 左滑 → ⋯ → 删除                  | 本地移除并同步云端               |
| 同步          | 列表下拉                         | 触发 Supabase Realtime 覆盖 |

> **Draft 特殊动作**
> 在待确认区，任务亦可 **右滑≈30 %** 直接确认并移出 Draft，跳过复选框流程。

---

## 4. 列表视图与排序逻辑

| 视图          | 任务范围                | 排序                      |
| ----------- | ------------------- | ----------------------- |
| **Focus**   | 今日、逾期、未来 7 天        | `due_ts ↑`              |
| **Backlog** | 无日期或 `due_ts ≥ 8 天` | `created_ts ↓`          |
| **Done**    | 最近 30 天已完成          | `completed_ts ↓`（右滑可恢复） |

### 4.1 Empty State 文案

* **Focus**：今天没有待办，好好休息！
* **Backlog**：暂无计划任务，来点灵感吧～
* **Done**：近 30 天无已完成任务

### 4.2 TaskCell 结构

```
☐ / ✅ | ❗️3 px 红条（可选） | 标题 ≤ 2 行 | HH:mm / MM-DD
```

* 完成任务：标题灰 50 % + 删除线，红条隐藏
* Focus 显示 HH\:mm，其余视图显示 MM-DD

---

## 5. 任务卡片 Bottom Sheet

| 模块          | 行为                                             |
| ----------- | ---------------------------------------------- |
| **标题输入**    | 自动聚焦，可多行（≤ 2 行）；空标题关闭视为放弃                      |
| **🕒 日期按钮** | 未设时显「添加日期」→ 调系统 DateTimePicker；已设时显示日期，可点 ✕ 清空 |
| **❗️ 紧急按钮** | 切换普通 / 紧急（红条）                                  |
| **关闭手势**    | 右上 ✕ 或下滑；`debounce 400 ms` 自动保存，关闭时强制 flush    |

---

## 6. 时间与提醒

* DateTimePicker 支持分钟级；仅日期则默认 09:00。
* 本地通知：`due_ts – 30 min` 推送。
* 启动时自动清理 30 天前 Done 记录。

---

## 7. 数据模型与同步

```sql
CREATE TABLE tasks (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  due_ts       INTEGER,          -- NULL = 无日期
  urgent       INTEGER DEFAULT 0,
  status       INTEGER DEFAULT 0,-- 0 active | 1 completed
  pending      INTEGER DEFAULT 0,-- 0 正式 | 1 草稿
  pinned_at    INTEGER DEFAULT 0,
  remote_id    TEXT,
  completed_ts INTEGER,
  created_ts   INTEGER,
  updated_ts   INTEGER
);
```

* **本地存储**：expo-sqlite
* **云同步**：Supabase Realtime「最后写入覆盖」策略
* **错误处理**：网络失败 Toast 提示；语音按钮离线置灰

---

## 8. 语音输入模块

### 8.1 功能定位

一句语音 / 文本 → 解析多条 Todo 草稿 → 插入 **Focus** 顶部「⏳ 待确认区」→ 用户勾选确认，批量新增 / 更新 / 完成任务。

### 8.2 核心流程

1. **录音**
   长按 🎤（≤ 60 s）；结束后 Whisper → LLM → `operations[]`。
2. **写入草稿**
   `pending=1` 写入 expo-sqlite；Draft 区域淡入。
3. **用户确认**
   * 草稿行复选框默认选中，可逐条取消。
   * 底部浮条：**全选 / 取消全选** + **确认**（≥ 1 项高亮）。
   * 点击确认：批量将选中草稿 pending→0；未勾选草稿即时删除
   * **右滑≈30 %**：可直接单条确认并转 Active。
4. **撤销窗口**
   Snackbar 停留 3 s：「已添加 N 项，已完成 M 项 · 撤销」。

### 8.3 界面要素

| 元素              | 说明                                                           |
| --------------- | ------------------------------------------------------------ |
| **Draft 区域**    | 平时隐藏，仅在该流程中出现在 Focus 顶部，淡蓝背景；标题「⏳ 待确认 (N)」，支持点击 **折叠 / 展开**；超出 10 条截断并提示 |
| **草稿 TaskCell** | 继承现有样式 + 勾选框；动作图标区分色：➕蓝 / ✎黄 / ✓绿                            |
| **底部浮条**        | 随列表滚动淡入淡出，安全区内固定                                             |
| **Snackbar**    | 呈现提交结果 + 撤销按钮                                                |

### 8.4 数据与事务

* 草稿及批量确认均打包为单事务；失败整体回滚。
* **App 退出**：`pending=1` 记录持久保存，重启后 Draft 仍在。
* 撤销在 3 s 内逆转同一事务。

### 8.5 边界与错误处理

| 场景        | 行为                    |
| --------- | --------------------- |
| 解析失败      | Toast「暂未识别任务」，不产生草稿   |
| 草稿 > 10 条 | 仅保留前 10 条，多余丢弃并提示     |
| 离线模式      | 语音按钮置灰，提示「离线模式暂不支持语音」 |

### 8.6 动效

| 动作         | 动效                                        |
| ---------- | ----------------------------------------- |
| Draft 区域出现 | `opacity 0→1`, `translateY 16→0` (200 ms) |
| 勾选切换       | 勾选框缩放 +15 %, 颜色过渡 100 ms                  |
| 草稿转正式      | 行背景淡化至白色并下滑补位 (200 ms)                    |

---

## 9. 组件复用一览

| 类型      | 名称                 | 作用                 | 复用策略            |
| ------- | ------------------ | ------------------ | --------------- |
| **页面**  | TaskListScreen     | 三视图按过滤规则渲染         | 单页复用            |
|         | SettingsScreen（可选） | 主题切换 / 清理 Done 等   | MVP 可暂缓         |
| **弹层**  | TaskDetailSheet    | 新建 / 查看 / 编辑一体     | 全局唯一            |
|         | MoreActionSheet    | 延后 / 置顶 / 删除菜单     | 全列表共用           |
| **列表项** | TaskCell           | 复选框 + 红条 + 标题 + 时间 | 状态决定样式          |
| **辅助**  | EmptyState         | 空列表占位插画 + 文案       | 三视图共用           |
|         | SyncToast          | 同步成功 / 失败提示        | 全局复用            |
|         | DateTimeButton     | 🕒 按钮 + 时间展示       | Bottom Sheet 复用 |

---

## 10. 低保真线框（Focus 示例）

```text
┌────────────────────────────────────┐
│ Focus | Backlog | Done        ⚙   │
├────────────────────────────────────┤
│ ⏳ 待确认 (3)                       │
│ ─────────────────────────────────── │
│  + □ 明早 10:00 开产品会              │
│  - □ 明天 09:00 提交报告              │
│  x □ 下午 3 点 发周报                 │
├────────────────────────────────────┤
│  □ 写周报                          │
│  □ 修复登录 Bug                  │
│  □ 预订晚餐餐厅                    │
│                                    │
│  （空态 ：插画 + “今天没有待办…”） │
└───────────────┬───────────────┬───┘
                │      🎤       │ ➕ │
                └───────────────┴───┘
```

---

## 11. 技术架构

### 11.1 技术栈

| 层级     | 选型                             |
| ------ | ------------------------------ |
| 客户端    | Expo + React Native            |
| 本地存储   | expo-sqlite          |
| 实时同步   | Supabase Realtime              |
| 云转写    | OpenAI Whisper API             |
| LLM 解析 | OpenAI GPT-4o function calling |
| 推送     | FCM（Android）/ APNs（iOS）        |

### 11.2 整体技术架构一览

```
┌───────────────────────────── Mobile Client (Expo + React Native) ─────────────────────────────┐
│ ① 录音                                                                                         │
│      • expo-av 捕获 PCM (16 kHz mono)                                                          │
│      • 5 s 分段上传 Whisper REST API                                                          │
│ ② 实时转写回显                                                                                 │
│ ③ 文本 → GPT-4o (函数调用)                                                                    │
│      • add_todo / update_todo / complete_todo                                                 │
│ ④ 本地缓存 + UI                                                                               │
│      • zustand + expo-sqlite/mmkv                                                             │
│ ⑤ Supabase Realtime 订阅                                                                      │
│      • 自动合并远端变更                                                                        │
│ ⑥ Expo Notifications                                                                         │
└──────────────▲────────────────────────────────────────────────────────────────────────────────┘
               │ JWT（Auth） + HTTPS
               ▼
┌────────────────────────────── Supabase （仅存储与鉴权） ───────────────────────────────┐
│ Auth – 邮箱 / Google → JWT                                                     │
│ Postgres – `todos` 表 + RLS（每行归属当前用户）                                          │
│ Realtime – WebSocket 广播行级事件                                                      │
└──────────────▲─────────────────────────────────────────────────────────────────────────┘
               │ 行级事件
               ▼
┌────────────────── Scheduler Micro-service ──────────────────┐
│ • Cloudflare Workers / Vercel Cron（每 15 min）              │
│ • 查询 30 min 内到期且未完成的 Todo                           │
│ • 调 FCM / APNs 推送提醒                                      │
│ • 仅持 Supabase Service Key 的只读权限                        │
└──────────────────────────────────────────────────────────────┘
```

---

#### 11.3 移动端（Expo + React Native）

| 责任       | 关键实现                                                                       |
| -------- | -------------------------------------------------------------------------- |
| **语音录制** | `expo-av` & `Audio.Recording`，后台前台均可用                                      |
| **转写请求** | `fetch` → `https://api.openai.com/v1/audio/transcriptions`，MPEG-4 / WAV 均可 |
| **意图解析** | OpenAI Chat Completion + 函数调用，解析 `function_call` 返回 `{action, payload}`    |
| **本地状态** | `zustand` 全局 store；SQLite 缓存离线队列；MMKV 做首屏冷启动加速                             |
| **数据写入** | 调 Supabase JS SDK `insert/update/delete`，失败时进入离线队列，网络恢复后自动 flush           |
| **实时数据** | `supabase.channel('todos')` 监听行级事件，合并到本地 store                             |
| **推送**   | `expo-notifications` 注册 FCM / APNs token，存入 `profiles.push_token`          |

---

### 11.4. Supabase（托管层）

* **Auth**：OAuth 2 + Magic Link；JWT 通过 Expo SecureStore 缓存
* **Postgres**：

  * `todos` 表字段：`id, user_id, title, due_at, status, priority, tags`
  * 行级安全 (RLS)：`auth.uid() = user_id`
* **Realtime**：行级变化事件广播；客户端仅订阅自己 UID 的 channel
* **Edge Functions**：**禁用业务逻辑**（保持 supabase=存储层）；仅未来做分析/埋点上报

---

### 11.5. Scheduler 微服务

| 模块          | 说明                                                       |
| ----------- | -------------------------------------------------------- |
| **Cron 触发** | `*/15 * * * *` 查询 `due_at between now() and now()+30min` |
| **推送**      | 调用 FCM / APNs，payload `{ todo_id, title, due_at }`       |
| **安全**      | 环境变量持 `SUPABASE_SERVICE_KEY`（只读），OpenAI Key 不在此层         |

---

### 11.6 数据流 & 时序

1. **用户讲话** → 客户端 5 s 音频块 → Whisper → **文本**
2. **文本** → GPT-4o → `function_call` → `{action, payload}`
3. 客户端将 payload 写入 **Supabase**；本地 UI 立即渲染
4. Supabase 触发 **Realtime** 事件 → 其他设备同步
5. Scheduler 周期性拉取到期任务 → **推送提醒** （保证离线用户也能收到）

---

### 11.7 安全与合规

* **OpenAI Key** 存于 app config server，客户端通过临时签名 Token 调用
* 所有通信走 **TLS 1.3**；JWT 有效期短（默认 1 h，后台静默刷新）
* 用户可在设置页触发 GDPR/CCPA 数据删除：直接 `delete from todos where user_id=…`
* 最小权限原则：客户端仅有其自身行级数据；Scheduler 仅 select 权限


### 11.9 代码库结构
AI-TODO/
├── app/                             # Expo Router 页面目录
│   ├── _layout.tsx                  # 顶层导航结构（Tabs / Stack）
│   ├── index.tsx                    # 首页跳转或重定向
│   └── task-list.tsx                # 三视图统一页面（通过 param 控制 focus/backlog/done）
│
├── components/                      # 纯展示型 UI 组件（无副作用、状态）
│   ├── TaskCell.tsx                 # 单条任务（支持草稿/完成/紧急）
│   ├── TaskTabs.tsx                 # 顶部切换栏（Focus / Backlog / Done）
│   ├── EmptyState.tsx              # 空状态文案与插画
│   ├── BottomSheet.tsx             # 通用底部弹窗容器
│   ├── DateTimeButton.tsx          # 日期选择按钮
│   ├── VoiceButton.tsx             # 🎤 长按语音按钮
│   ├── Snackbar.tsx                # 操作提示条（如“添加成功 · 撤销”）
│   └── FloatingBar.tsx             # 草稿操作浮层（全选 / 确认）
│
├── features/                        # 功能模块（状态、逻辑、UI 逻辑分发）
│   ├── task/                        # 任务管理（增删改查、同步）
│   │   ├── taskStore.ts             # zustand 状态（全任务列表）
│   │   ├── taskService.ts           # 本地/远程任务操作封装
│   │   ├── useFilteredTasks.ts      # 按视图筛选任务列表
│   │   └── taskSync.ts              # Supabase 实时订阅 / 合并
│   │
│   ├── draft/                       # 草稿任务流（pending=1）
│   │   ├── draftStore.ts            # zustand 状态（草稿任务）
│   │   └── draftFlow.ts             # 草稿流程（确认 / 撤销 / 删除）
│   │
│   ├── voice/                       # 语音识别流程组织器（不负责 API 细节）
│   │   ├── recorder.ts              # expo-av 录音封装
│   │   └── voiceFlow.ts             # 转写 → LLM → 草稿写入
│   │
│   ├── auth/                        # 登录、身份识别
│   │   ├── authStore.ts             # 当前用户状态
│   │   └── authService.ts           # 登录/登出流程
│   │
│   └── notify/                      # 推送通知调度逻辑
│       ├── registerPushToken.ts     # 注册 FCM / APNs token
│       └── reminderService.ts       # 设置/清理任务提醒
│
├── services/                        # 对外 API 调用封装
│   ├── supabase.ts                  # Supabase 客户端初始化与封装
│   ├── openai.ts                    # Whisper / GPT API 封装
│   └── analytics.ts                 # 埋点（可选）
│
├── db/                              # 本地数据库：expo-sqlite
│   ├── database.ts                  # 初始化 DB 实例
│   ├── schema.ts                    # 表结构定义
│   └── models/
│       └── Task.ts                  # Task Model 映射定义
│
├── lib/                             # 通用工具方法 / 类型 / 常量
│   ├── date.ts                      # 日期解析/格式化工具
│   ├── uuid.ts                      # ID 生成器
│   ├── constants.ts                 # Tab key / 枚举 / 限值
│   ├── types.ts                     # 全局类型定义（Task, Operation 等）
│   └── i18n.ts                      # 多语言配置（如使用）
│
├── assets/                          # 插图 / 图标 / 声音
│   ├── images/
│   ├── icons/
│   └── sounds/
│
├── .env                             # 环境变量（OpenAI / Supabase keys 等）
├── app.config.ts                    # Expo App 配置（名称、图标、权限等）
├── tsconfig.json
└── package.json