# 项目问题清单（Phase 7 ~ 9）

> 本清单聚焦与 design.md 不一致或有风险的实现点，优先级按 高/中/低 标注。

## P7 – Supabase 集成 / 同步

- [高] ✅ 草稿确认未触发云端同步 [已修复]
  - 描述：`features/draft/draftStore.ts` 的 `confirmSelectedDrafts / confirmSingleDraft` 仅更新本地 WatermelonDB，并删除草稿，未调用 `taskSyncService.syncTaskToSupabase` 或 `deleteTaskFromSupabase`。
  - 影响：跨设备不一致；通过语音确认生成/修改/删除的任务不会同步到云端。
  - 涉及：`features/draft/draftStore.ts`、`features/task/taskSync.ts`
  - 修复内容：
    - add：确认后调用 `syncTaskToSupabase(任务)` 并设置提醒
    - update：更新目标任务后调用 `syncTaskToSupabase(目标任务)` 并更新提醒
    - complete：完成目标任务后调用 `syncTaskToSupabase(目标任务)` 并取消提醒
    - delete：删除目标任务后调用 `deleteTaskFromSupabase(targetTaskId)` 并取消提醒
  - 验收：在另一设备收到 Realtime 事件可见一致状态；手动下拉刷新后仍一致。

- [中] ✅ 离线队列未持久化 [已修复]
  - 描述：`taskSyncService` 仅用内存 `Map` 暂存重试队列，App 重启后丢失。
  - 影响：离线修改在重启后无法自动上云，潜在数据丢失。
  - 涉及：`features/task/taskSync.ts`
  - 修复内容：
    - 使用 AsyncStorage 持久化离线队列
    - 启动时自动加载并处理离线队列
    - 实现指数退避重试机制（最大5分钟间隔）
    - 成功同步后清理持久化队列
  - 验收：离线创建/修改/删除 → 重启 → 联网后自动上云。

- [中] 认证方式与设计不一致
  - 描述：当前 UI 使用邮箱+密码；设计建议 Magic Link / OAuth。虽有 `authService.signInWithMagicLink`，但未接入 UI。
  - 影响：与设计偏差；可能影响注册/登录转化与安全体验。
  - 涉及：`app/auth.tsx`、`features/auth/authService.ts`
  - 建议：在登录页提供 Magic Link（默认）并保留密码登录为备选；路由保护与状态提示优化。
  - 验收：用户可通过邮件链接完成登录；状态联动正常。

- [中] ✅ 登出后的本地数据隔离 [已修复]
  - 描述：登出仅清 session，未清理或隔离本地数据。
  - 影响：账号切换时可能看到上个账号的本地任务；隐私与一致性风险。
  - 涉及：`features/auth/authStore.ts`、`db/**`
  - 修复内容：
    - 登出时清除所有本地任务数据
    - 取消所有本地通知
    - 清理离线同步队列
    - 清除用户相关的缓存数据
    - 登录时自动触发初始同步
  - 验收：账号切换后不再看到前一账号的数据。

- [中] ✅ Push Token 未上报到 Supabase [已修复]
  - 描述：未将 APNs/FCM token 写入 `profiles.push_token`。
  - 影响：服务端推送/调度能力受限。
  - 涉及：`features/notify/notificationService.ts`、`features/auth/authService.ts`
  - 修复内容：
    - 在请求通知权限后自动获取推送令牌
    - 调用 `authService.updateProfile({ push_token })` 上传到 Supabase
    - 添加错误处理和日志记录
  - 验收：`profiles.push_token` 按用户写入成功。

## P8 – 本地提醒

- [中-高] ✅ 草稿确认未联动提醒 [已修复]
  - 描述：通过草稿流完成/删除未取消提醒；新增/更新未必调度提醒。
  - 影响：已完成/已删除任务仍然推送；新增/更新错过提醒。
  - 涉及：`features/draft/draftStore.ts`、`features/notify/reminderService.ts`
  - 修复内容（已在 P7 修复中完成）：
    - add：确认后调用 `reminderService.setReminder(task)`
    - update：更新后根据 due_ts 变化调用 `reminderService.setReminder(task)`
    - complete/delete：调用 `reminderService.cancelReminder(taskId)`
  - 验收：对应操作后已排定/取消的本地通知与任务状态一致。

- [低] ✅ 通知 handler 使用非标准字段 [已修复]
  - 描述：`shouldShowBanner`/`shouldShowList` 可能非 Expo 标准字段，存在不兼容风险。
  - 涉及：`features/notify/notificationService.ts`
  - 修复内容：移除非标准的 `shouldShowBanner` 和 `shouldShowList` 字段，仅保留官方支持的字段
  - 验收：应用通知行为正常，无警告日志。

- [低] ✅ 启动时未清理 30 天前 Done 记录 [已修复]
  - 描述：设计要求启动清理历史 Done；实现缺失。
  - 涉及：启动流程 `_layout.tsx`、`features/task/taskStore.ts`
  - 修复内容：
    - 在 taskStore 中添加 `cleanupOldDoneTasks` 方法
    - 查询并删除 completed_ts < now - 30d 的记录
    - 取消相关提醒并同步删除到云端
    - 在 _layout.tsx 启动时自动调用清理
  - 验收：超期记录被清理；提醒同步取消。

## P9 – 设置页

- [低-中] GDPR/CCPA 数据删除入口缺失
  - 描述：设计要求提供数据删除能力；设置页无入口。
  - 影响：合规与用户控制力不足。
  - 建议：在设置页新增“删除数据”入口，调用后端/Edge Function 或执行 `delete from todos where user_id=…`；提供确认与进度反馈。
  - 验收：执行后远端数据清空，客户端同步清理。

