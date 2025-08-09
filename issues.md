### 前端代码审查问题清单（按优先级排序）

#### 严重


✅ 本地数据库与 Supabase 的任务 ID 不一致，初始同步会重复创建并导致云端/本地数据分叉 [FIXED]
  - 现状：初始同步时将远端记录以本地创建的方式写入 WatermelonDB，但 WatermelonDB `create()` 不接受自定义 ID，导致远端 `id` 与本地 `id` 不同；随后又用本地 `id` 回写 Supabase（upsert），会产生新的云端记录，形成双份数据与持续分叉。
  - 涉及：
    - `features/task/taskSync.ts`：`syncTaskToLocal()` 使用 `useTaskStore.getState().createTask(localTask, true)` 创建本地任务，传入的 `id` 实际被忽略。
    - `features/task/taskStore.ts`：`createTask()` 中注释已指出 WatermelonDB 不支持自定义 ID，并且按当前实现会生成新的本地 ID。
  - 影响：
    - 远端记录无法与本地精确对应；
    - 后续实时/离线同步将持续制造重复项；
    - 删除/更新会应用到错误的记录。
  - 建议（三选一，优先级递减）：
    1) 使用 WatermelonDB 官方同步方案（`@nozbe/watermelondb/sync`）或 `prepareCreateFromDirtyRaw`/`unsafeSetRaw` 等原生插入途径，确保按远端 `id` 写入本地；
    2) 在本地 schema 中新增 `remote_id` 字段，完整建立远端 ID 与本地 ID 的映射，并在所有同步方向上统一使用 `remote_id` 作为云端主键；
    3) 抛弃以本地为源的 upsert，改为仅拉取远端、在本地维护 shadow 映射，禁止将本地随机 ID 回写为云端主键。

- OpenAI Chat 接口仍使用旧式 `functions` 字段，已被 `tools`（function calling）替代
  - 现状：`services/openai.ts` 中向 `v1/chat/completions` 传入 `functions` 与 `function_call`，并从 `message.function_call` 取结果。这是旧接口写法，后续可能失效或行为不稳定。
  - 涉及：`services/openai.ts`（`parseTaskOperations`）
  - 建议：迁移到 `tools: [{ type: 'function', function: { name, parameters } }]` 与 `tool_choice`，并从 `tool_calls` 解析。顺便增加对 429/5xx 的退避重试与 JSON 解析兜底。

- 语音转写使用 `whisper-1`，存在弃用/不可用风险
  - 现状：`transcribeAudio()` 使用 `model: 'whisper-1'` 调用 `v1/audio/transcriptions`。根据最新平台变更，建议改用更稳定的新模型（如 `gpt-4o-mini-transcribe`）或确认 `whisper-1` 在移动端可用性与配额。
  - 涉及：`services/openai.ts`
  - 建议：切换到当前官方推荐的转写模型；为 413/实体过大等错误添加重试与压缩策略（录音超长时提示或分段）。

#### 高

- 推送 Token 注册缺少 EAS Project 配置，可能拿不到 Expo Push Token
  - 现状：`notificationService.registerPushToken()` 依赖 `Constants.easConfig?.projectId` / `expoConfig.extra.eas.projectId` / 环境变量 `EXPO_PUBLIC_EAS_PROJECT_ID`，但 `app.json` 未配置 `extra.eas.projectId` 且项目未显式声明 notifications 插件。
  - 涉及：`app.json`、`features/notify/notificationService.ts`
  - 建议：
    - 在 `app.json` 增加：
      ```json
      {
        "expo": {
          "plugins": ["expo-notifications"],
          "extra": { "eas": { "projectId": "<YOUR_PROJECT_ID>" } },
          "ios": { "bundleIdentifier": "<your.bundle.id>" },
          "android": { "package": "<your.android.package>" }
        }
      }
      ```
    - 若采用环境变量，确保在构建环境显式注入并验证。

- 在客户端直接使用 OpenAI API Key（公开变量），存在泄露/滥用风险
  - 现状：使用 `EXPO_PUBLIC_OPENAI_API_KEY` 并在客户端直连 OpenAI。此做法在生产环境不安全，容易泄露或被滥用。
  - 涉及：`services/openai.ts`
  - 建议：通过自有后端（或边缘函数）代理 OpenAI 请求，服务端存储密钥，并在代理层做鉴权/速率限制。

- 任务列表计数/排序每次渲染重复计算，影响性能
  - 现状：`TaskListScreen` 中多次调用 `getFocusTasks()`/`getBacklogTasks()`/`getDoneTasks()`（用于列表与顶部 `TaskTabs` 计数），实际会多次过滤与排序。
  - 涉及：`app/task-list.tsx`、`features/task/taskStore.ts`
  - 建议：为这三个 selector 做 memo（基于 `tasks` 的浅比较或时间戳版本号），或在 store 内部维护派生数据，减少重复计算。

- iOS/Android 权限与原生配置缺失，影响录音与通知
  - 现状：
    - 使用了麦克风录音（`expo-av`）与本地/推送通知（`expo-notifications`），但 `app.json` 未声明 `plugins: ["expo-notifications"]`，也未提供麦克风用途描述；录音时设置了 `staysActiveInBackground: true`，iOS 背景录音通常需要 `UIBackgroundModes: ["audio"]`。
  - 涉及：`app.json`、`features/voice/recorder.ts`、`features/notify/*`
  - 建议：
    - 在 `app.json` 中增加：
      - iOS: `infoPlist.NSMicrophoneUsageDescription`（麦克风用途文案），如："用于语音添加待办"；如需后台录音，再评估是否添加 `infoPlist.UIBackgroundModes = ["audio"]`。
      - Android: 若需，补充 `permissions`（通常 Expo 会按需注入，但建议显式管理）。
      - `plugins: ["expo-notifications"]` 并完成推送渠道/权限声明。

#### 中

- TaskDetailSheet 自动保存副作用重复，可能造成多次触发
  - 现状：已存在一个依赖 `[title, currentTask, dueDate, isUrgent, debouncedAutoSave]` 的 `useEffect`，下方又有一个仅依赖 `[dueDate, isUrgent]` 的副作用，同样调用 `debouncedAutoSave`，导致某些变更双重触发。
  - 涉及：`components/TaskDetailSheet.tsx`
  - 建议：删除第二个重复的 `useEffect([dueDate, isUrgent])`，仅保留合并后的一个副作用。

- Android 13+ 通知权限声明与行为核对
  - 现状：代码中动态申请权限，但 `app.json` 未声明插件与相关权限。某些机型可能需要在 `plugins: ["expo-notifications"]` 下声明默认渠道/权限文案。
  - 涉及：`app.json`、`features/notify/notificationService.ts`
  - 建议：通过插件生成原生配置，确保在 Android 13+ 上正常拉起权限与渠道。

- 过期提醒的补救逻辑可能重复调度
  - 现状：`reminderService.checkAndUpdateExpiredReminders()` 在提醒时间已过而任务未到期时，直接以 0 分钟提前量再调度一次，但未显式取消可能仍存的旧通知（虽然多数情况下旧通知已过期）。
  - 涉及：`features/notify/reminderService.ts`
  - 建议：在二次调度前尝试 `cancelReminder(task.id)`，保证不会出现双重排程。

- 国际化不一致
  - 现状：多数 UI 为中文，但 `TaskTabs` 标签仍为英文（Focus/Backlog/Done），`AuthScreen` 亦为英文提示。
  - 涉及：`components/TaskTabs.tsx`、`app/auth.tsx`
  - 建议：统一接入 i18n（例如 `i18next`），确保文案一致且可切换。

#### 低

- 未使用的导入/样式
  - 现状：`components/TaskTabs.tsx` 引入 `Animated` 但未使用；个别样式/变量未用。
  - 建议：清理无用引用，减小 bundle 体积。

- 通知 handler 使用了平台特定字段并 `@ts-ignore`
  - 现状：`notificationService` 中的 `shouldShowBanner/shouldShowList` 通过 `@ts-ignore` 使用，可能在部分平台类型/行为不一致。
  - 建议：按平台分支设置，或移除不必要字段，避免未来 SDK 升级时的类型/行为偏差。

- 语音录音参数与跨平台兼容
  - 现状：录音采样率/编码器在部分低端机型或 Web 可能不可用。
  - 涉及：`features/voice/recorder.ts`
  - 建议：根据 `Platform.OS` 精细化配置与能力探测，失败时回退到更保守的配置；为超时/失败添加更细致的错误提示。

- 导航：点击通知后的跳转尚未实现
  - 现状：`handleNotificationResponse` 中有 TODO。
  - 建议：结合 `expo-router` 深链（`/task-list?id=<taskId>`）实现直达任务详情。

- 设计一致性
  - 现状：采用 emoji 作为操作图标（删除/置顶等）风格轻量但不统一。
  - 建议：后续统一采用 icon 库（如 `@expo/vector-icons`）。

---

#### 附：关键代码引用（便于定位）

```1:80:/Users/xiaochunliu/ai-todo/features/task/taskSync.ts
// 初始同步 -> 本地创建使用 createTask，无法保留远端 id
await this.syncTaskToLocal(remoteTask);
...
await taskStore.createTask(localTask, true); // 不会携带远端 id
```

```67:105:/Users/xiaochunliu/ai-todo/features/task/taskStore.ts
// createTask 明确说明：WatermelonDB 不支持自定义 ID
// 实际会生成新的本地 ID，与远端 id 脱钩
```

```171:206:/Users/xiaochunliu/ai-todo/services/openai.ts
// 旧式 function calling：functions + function_call
// 建议迁移到 tools + tool_calls
```

empty
