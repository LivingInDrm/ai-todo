### 依赖与兼容性

- [ ] React/React Native/Expo 版本组合存在兼容性风险：`expo@~53` 通常绑定特定的 RN/React 版本，但当前为 `react@19.0.0`、`react-native@0.79.5`。建议使用 `npx expo install` 对齐 Expo SDK 支持矩阵（通常是 React 18.x 与 Expo 绑定的 RN 版本）。
- [ ] 缺少依赖：代码中使用了 `expo-constants`，但 `package.json` 未声明。请添加依赖并运行安装。
- [ ] `react-native-web@^0.20.0` 与当前 React/RN 组合需再次核对 Expo 53 的兼容表，建议同样通过 `npx expo install react-native-web` 对齐。
- [ ] `expo-router@^5.1.4` 与 Expo 53 的兼容性请确认（建议遵循 Expo 官方模板版本）。

### 安全与配置

- [ ] OpenAI API Key 使用了 `EXPO_PUBLIC_OPENAI_API_KEY`（任何 `EXPO_PUBLIC_` 前缀的变量都会被打包到客户端），存在泄露风险。建议：
  - 后端代理调用（自建服务或 Supabase Edge Functions），客户端仅发送业务参数；
  - 或使用安全存储结合自有后端换取短期 token，避免把长效密钥下发到客户端。

### 数据模型与类型一致性

- [ ] `TaskData.dueTs` 类型为 `number | undefined`，但仓库 `mapRowToTask` 会返回 `null`（来自 `due_ts`），导致运行时混用 `null/undefined`。建议统一：
  - 映射层将 `null` 归一为 `undefined`；
  - 或将类型定义改为 `number | null | undefined` 并在上层统一判空逻辑。
- [ ] `db/models/Task.ts` 中：
  - `markAsActive()` 使用 `completedTs: undefined` 清空完成时间，但仓库层仅在值为 `null` 时写入空值，`undefined` 会跳过更新，导致字段未清空。应改为传入 `null`；
  - `unpin()` 使用 `pinnedAt: undefined`，同理不会清空字段，建议改为 `null`。

### 业务逻辑与初始化

- [ ] `app/_layout.tsx` 启动时直接调用 `taskRepository.cleanupOldDoneTasks()` 清理历史完成任务，但这会跳过：
  - 取消本地通知（`reminderService.cancelReminder`）；
  - 云端删除同步（`taskSyncService.deleteTaskFromSupabase`）。
  建议改为调用 `useTaskStore().cleanupOldDoneTasks()`，以保持与设计文档一致的完整清理流程。

### 同步/离线队列

- [ ] 离线队列键值使用 `task.remoteId || task.id`，整体设计合理。但在首次获取远端任务并本地缺失时，需确保不会与已入队的删除操作产生键冲突（当前代码已做跳过处理，可保留此项观察）。

### Store 与重复实现

- [ ] `features/draft/draftStore.ts` 同时存在 `confirmSelectedDrafts` 与 `confirmDrafts` 两套确认逻辑：
  - 两者实现细节不一致（一个走 `Task` 实例方法，一个走 `repository + 事务`），且返回值结构不同；
  - UI 侧使用 `confirmSelectedDrafts()`，语音流 `voiceFlow` 使用 `confirmDrafts()`。
  建议：合并为单一实现，保证撤销、提醒、云同步、统计结果一致，减少维护成本与行为分叉。

### 测试与 Mock 问题

- [ ] `jest.setup.ts` 对 `expo-file-system` 的 mock 仅提供了 `readAsStringAsync`，但实际代码在语音流程中使用了 `FileSystem.getInfoAsync`。建议补充：
  - `getInfoAsync` 返回 `{ exists: true, size: 小于25MB }` 等；
  - 如有需要，补充 `writeAsStringAsync`、`getUriAsync` 等常用 API 的基本桩实现。
- [ ] `@react-native-community/netinfo` 的 mock：`addEventListener` 返回了 `{ unsubscribe }` 对象，但组件中期望其返回“函数”。建议改为返回函数以与真实 API 行为一致，避免组件测试或未来集成测试报错。
- [ ] 测试版 SQLite 适配器 `setup/mock/sqliteDatabase.ts` 中 `getAllAsync`（Focus 视图）包含了 `due_ts === null` 的任务，和真实仓库实现不一致（真实实现会排除无日期任务）。建议修正 mock 逻辑以保持一致，防止用例“伪绿”。

### 仓库层与约束

- [ ] `TaskRepository.create` 允许空字符串标题（`''`），与 `taskStore.createTask` 的非空校验不一致。为保证数据层完整性，建议：
  - 仓库层也进行非空校验并抛错；
  - 或在表结构增加 `CHECK(length(title) > 0)` 约束（同时需处理历史数据迁移）。

### 通知与平台适配

- [ ] `notificationService.setNotificationHandler` 中包含非标准字段（`shouldShowBanner/shouldShowList`），现以 `@ts-ignore` 消除类型。长期建议按平台能力做分支或移除不受支持字段，避免后续 SDK 升级时出现行为偏差。
- [ ] 推送注册依赖 `expo-constants` 的 `projectId`，请补充依赖并确保在 EAS 项目里配置 `EXPO_PUBLIC_EAS_PROJECT_ID` 或在 `app.json/app.config` 里提供对应的 extra 配置。

### 其他可优化项

- [ ] `db/sqliteDatabase.resetDatabase()` 仅清空 `tasks` 表，不清空 `migrations`。若在测试中期望“完全干净”的环境，可考虑提供测试专用的 full reset（同时清空 `migrations`）。
- [ ] OpenAI 接口：使用 `model: 'whisper-1'`、Chat Completions + function_call 的老式参数。可后续评估迁移到最新 API（若上线环境需要）。

---

如需我直接提交修复 PR：
- 依赖对齐：执行 `npx expo install` 并补充 `expo-constants`；
- 修复类型与模型：统一 `null/undefined`，修正 `markAsActive/unpin`；
- 清理逻辑：`_layout` 改用 `taskStore.cleanupOldDoneTasks()`；
- 测试稳定性：完善 `expo-file-system` 与 `NetInfo` 的 mock，并修正 SQLite mock 的 Focus 视图过滤；
- 草稿确认：合并 `confirmSelectedDrafts/confirmDrafts`。

