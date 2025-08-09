## 运行环境兼容性核对（iOS / Android / Web）

本项目基于 Expo（SDK 53）、React Native 0.79.5、React 19、expo-router 5、Reanimated 3。以下从配置与代码两方面核对各平台兼容性，并给出必要的改进建议。

### 结论概览
- iOS：基本兼容，可正常运行与发布；需按需完善推送权限配置与打包标识。
- Android：基本兼容，可正常运行与发布；需配置 FCM 等推送能力。
- Web：当前不完全兼容（功能缺失/崩溃风险）。主要阻塞在语音录音、通知、日期选择与底部弹窗组件。

---

### 关键依赖与配置
- Expo 与路由
  - `expo` ~53.0、`expo-router` ^5.1：iOS/Android/Web 均支持。
  - `app.json` 开启 `newArchEnabled: true`，iOS/Android 原生新架构 OK；与 Web 无关。

- UI 与动画
  - `react-native-reanimated` ~3.17、`react-native-gesture-handler` ~2.24、`@gorhom/bottom-sheet` ^5.1：
    - iOS/Android：支持良好。
    - Web：Bottom Sheet 对 Web 支持有限/不稳定，需备用实现或条件禁用。

- 本地存储/数据库
  - `expo-sqlite` ^15.2（使用异步 API：`openDatabaseAsync/execAsync` 等）：
    - iOS/Android：支持。
    - Web：SDK 53 起异步 API 有 Web 支持（WASM 后端）。需实际跑通验证；某些环境下可能要求 HTTPS 与额外资源加载。

- 通知与设备
  - `expo-notifications` ~0.31、`expo-device` ~7.1：
    - iOS/Android：支持本地通知与推送注册（需 EAS 项目与推送配置）。
    - Web：需要 Service Worker 与特定集成，当前代码未适配，API 直接调用可能报错或无效。

- 语音/文件
  - `expo-av`（录音）：iOS/Android 支持；Web 端官方不支持录音（Audio.Recording）。
  - `expo-file-system`：Web 兼容性基本可用，但与录音产物相关的流程在 Web 会受阻。

- 认证/网络
  - `@supabase/supabase-js` + `expo-secure-store`：iOS/Android 正常。Web 端 `SecureStore` 存储为非完全安全的实现，但可用。
  - `@react-native-community/netinfo`：三端均可用。

---

### 代码层面核对（按功能）

1) 语音录音与语音入任务
   - 位置：`features/voice/recorder.ts` 使用 `expo-av` 的 `Audio.Recording`；`features/voice/voiceFlow.ts` 调用 OpenAI Whisper。
   - iOS/Android：正常（已做权限请求与模式配置）。
   - Web：`expo-av` 不支持录音，当前实现虽传入了 `web` 选项，但并不会生效；点击录音会失败。
   - 影响：Web 端语音入口应禁用或替换为浏览器 `MediaRecorder` 自研实现。

2) 本地通知与推送
   - 位置：`features/notify/notificationService.ts`、`features/notify/reminderService.ts`。
   - iOS/Android：
     - Android 分支已设置通知渠道；iOS 需在构建时配置推送证书/Capabilities。
     - 代码调用 `getExpoPushTokenAsync(projectId)`，`projectId` 来自 `Constants` 或 env，需要在 EAS 项目中配置。
   - Web：
     - 未配置 Service Worker，也未做 `Platform.OS === 'web'` 分支处理；直接请求权限/注册 token/调度通知可能无效或报错。
   - 影响：Web 端应条件禁用推送注册与本地通知，或按 Expo 文档集成 SW。

3) 日期时间选择器
   - 位置：`components/DateTimeButton.tsx` 使用 `@react-native-community/datetimepicker`。
   - iOS/Android：OK（已做 iOS/Android 分支）。
   - Web：该库无 Web 实现。当前组件仅对 iOS/Android 做了渲染分支，Web 情况下点击后不会显示任何选择器，功能缺失。
   - 影响：需要为 Web 增加分支（如使用 `<input type="datetime-local">` 或引入 Web 兼容日期库）。

4) 底部弹窗/手势
   - 位置：`components/TaskDetailSheet.tsx`、`components/MoreActionSheet.tsx` 等依赖 `@gorhom/bottom-sheet`、`react-native-gesture-handler`、`react-native-reanimated`。
   - iOS/Android：OK。
   - Web：Bottom Sheet 在 Web 支持不完善，交互与性能存在风险；需条件禁用或替换为 Web 原生/第三方弹层。

5) 数据库（SQLite）
   - 位置：`db/sqliteDatabase.ts` 使用异步 API（`openDatabaseAsync/execAsync/getFirstAsync/runAsync`）。
   - iOS/Android：OK。
   - Web：Expo SDK 53 的异步 SQLite 在 Web 有支持，但需实际验证运行环境（HTTPS/WASM 资源）。若失败，需要回退到 IndexedDB/LocalStorage 方案或修正打包配置。

6) 其他
   - `services/openai.ts` 使用 `expo-file-system` 读取录音文件并上传 Whisper；Web 端录音文件来源缺失导致流程无法完成。
   - `services/supabase.ts` 使用 `expo-secure-store` 做会话存储：Web 端可用但安全性有限，可接受。

---

### iOS/Android 发布注意事项
- iOS：
  - `app.json` 目前仅有 `supportsTablet`，发布前需补充 `bundleIdentifier`、图标/启动图已配置。
  - 推送需在 Apple Developer 开启 Push Notification 能力，EAS 项目绑定正确的 `projectId`；`expo-notifications` 自动配置需 EAS Build。
  - 麦克风权限：Expo 会自动注入用途描述，如需自定义可在 `ios.infoPlist` 添加。

- Android：
  - 已配置通知渠道创建逻辑；发布前需配置 FCM（服务器密钥）以启用推送。
  - `edgeToEdgeEnabled: true` 已启用，UI 需注意沉浸式适配。

---

### Web 端阻塞项与改造建议
- 语音录音（阻塞）：
  - 方案 A：Web 端禁用语音入口（`VoiceButton` 根据 `Platform.OS === 'web'` 隐藏/禁用）。
  - 方案 B：使用 `MediaRecorder` 自研录音，并将生成的 `Blob` 上传至 Whisper。

- 本地通知/推送（阻塞）：
  - 方案 A：Web 端禁用提醒与推送相关逻辑（`notificationService`/`reminderService` 加入 Web 分支直接跳过）。
  - 方案 B：按 Expo 文档接入 Service Worker 与通知权限流程，改造 token 注册与调度逻辑。

- 日期时间选择（阻塞）：
  - 为 Web 增加分支：使用 `<input type="date">`/`<input type="time">`/`<input type="datetime-local">` 或引入 Web 专用选择器库，并在 `DateTimeButton` 中按平台切换。

- Bottom Sheet（高风险）：
  - 方案 A：Web 端改为普通 `Modal`/Drawer 实现。
  - 方案 B：检测 Web 能力良好时再启用，默认禁用。

- SQLite（需验证）：
  - 在本地/部署环境实际打开 Web 端，验证 `expo-sqlite` 异步 API 是否正常落盘；如失败，考虑回退至 IndexedDB（可通过 `expo-sqlite` WASM 配置或自定义存储层）。

---

### 环境变量与运行模式
- OpenAI：`EXPO_PUBLIC_OPENAI_API_KEY` 必填（否则语音-文本解析不可用）。
- Supabase：`EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY` 未配置时自动离线模式（见 `services/supabase.ts`）。
- EAS Project Id（推送）：从 `Constants` 或 `EXPO_PUBLIC_EAS_PROJECT_ID` 获取，Web 不适用；原生需配置。

---

### 快速结论
- iOS：兼容。可上线；按需完善推送与打包标识、权限文案。
- Android：兼容。可上线；按需配置 FCM 推送。
- Web：当前不兼容/体验不完整：
  - 语音录音不可用；
  - 通知与推送未适配；
  - 日期时间选择器无 Web 实现；
  - Bottom Sheet 在 Web 风险较高。

建议先在 Web 端禁用相关功能，替换日期选择与弹层，再逐步实现 Web 录音与通知，最后验证 `expo-sqlite` 在 Web 的稳定性。


