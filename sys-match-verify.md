### 三端能力核查（iOS / Android / Web）

以下基于当前仓库的配置与代码实现进行核查，判断是否“开箱即用”支持三端，以及需要的改动与注意事项。

---

## 顶层结论

- iOS：可支持，但需要进行原生能力与权限配置，并通过 Dev Client/EAS 构建（不能使用 Expo Go 直接运行）。
- Android：可支持，但同样需要原生依赖与权限配置，并通过 Dev Client/EAS 构建（不能使用 Expo Go 直接运行）。
- Web：当前不具备直接可用的支持，存在多个阻断项，需要有条件降级或替换实现后才能上线 Web。

---

## 关键依据（来自代码与配置）

- `package.json`
  - Expo 53（`expo@~53.0.20`）、RN 0.79（`react-native@0.79.5`）、React 19。
  - 依赖关键库：`@nozbe/watermelondb`（SQLiteAdapter）、`expo-av`（录音）、`expo-notifications`（通知/推送）、`react-native-reanimated`、`react-native-gesture-handler`、`@gorhom/bottom-sheet`、`@react-native-community/datetimepicker`、`@react-native-async-storage/async-storage`、`@supabase/supabase-js` 等。

- `app.json`
  - 已配置基本 iOS/Android/Web 元数据；启用 `newArchEnabled: true`。
  - 未声明麦克风权限文案（NSMicrophoneUsageDescription）与 Android 录音/通知权限清单。

- 数据层（WatermelonDB）
  - `db/database.ts` 使用 `@nozbe/watermelondb/adapters/sqlite`（JSI、SQLiteAdapter）。该适配器在 iOS/Android 依赖原生模块；在 Web 端不适用（Web 需使用 LokiJS/Dexie 等适配器）。

- 语音录音
  - `features/voice/recorder.ts` 使用 `expo-av` 的 `Audio.Recording`。iOS/Android 支持；Web 端不支持录音（Expo 官方：Web 目前不支持 `Audio.Recording`）。

- 通知/推送
  - `features/notify/notificationService.ts` 使用 `expo-notifications` 调度本地通知并尝试注册 Expo Push Token（要求 EAS Project ID）。Web 侧未配置 Service Worker/FCM，且代码路径会跳过 Token 注册；本地通知与推送在 Web 端默认不可用。

- UI 能力
  - `@gorhom/bottom-sheet` 官方不支持 Web（依赖原生手势/动画）；`@react-native-community/datetimepicker` Web 支持有限/无原生实现。
  - 已配置 Reanimated Babel 插件（测试环境排除），满足 iOS/Android 基本运行要求。

- 认证/存储
  - `services/supabase.ts` 固定使用 `expo-secure-store` 作为存储适配器。该模块在 Web 端不可用，当前代码虽做 try/catch，但会导致 Web 端会话持久化缺失，易出现登录/状态问题。

---

## 平台结论与所需修改

### iOS（可用，但需配置）

直接运行：
- 不能用 Expo Go（因 WatermelonDB/SQLite 原生模块）；需要 `npx expo prebuild` + Dev Client 或 EAS 构建。

必要配置与校验：
- 权限与声明：
  - 麦克风：在 `app.json` 添加 `ios.infoPlist.NSMicrophoneUsageDescription`。
  - 通知：首次请求权限已在代码中；如需远程推送，配置 APNs 证书并确保 EAS Project ID 生效。
- 原生依赖：
  - WatermelonDB（SQLiteAdapter、JSI）随 prebuild 自动链接；需确保构建环境开启新架构兼容（已设置 `newArchEnabled: true`）。
- 变量与服务：
  - OpenAI：`EXPO_PUBLIC_OPENAI_API_KEY`。
  - Supabase：`EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`。
  - EAS 项目：配置 `extra.eas.projectId`（或在 EAS 构建环境注入）。

建议：
- 使用 Dev Client 进行本地调试；确保构建后 `expo-notifications` 能成功调度本地通知与（可选）远程推送。

### Android（可用，但需配置）

直接运行：
- 同 iOS，需 Dev Client/EAS 构建，不可用 Expo Go。

必要配置与校验：
- 权限与声明：
  - 录音：在 `app.json` 添加 `android.permissions` 包含 `RECORD_AUDIO`。
  - 通知：Android 13+ 需 `POST_NOTIFICATIONS`；如要精确定时可评估是否需要 `SCHEDULE_EXACT_ALARM`（一般本地计划通知可不必）。
- 原生依赖：
  - WatermelonDB（SQLiteAdapter、JSI）随 prebuild 自动链接。
- 变量与服务：
  - 同 iOS：OpenAI/Supabase/EAS Project ID。

建议：
- 首次安装后手动校验通知权限请求流程和语音录音流程；确保 NetInfo、GestureHandler、Reanimated 版本与 RN 0.79 兼容（当前版本匹配）。

### Web（当前不可直接用，存在阻断）

阻断项：
- 数据库：`SQLiteAdapter` 不支持 Web。需改为条件化适配（Web 使用 LokiJS/Dexie 适配器），或为 Web 改用纯内存/IndexedDB 实现。
- 录音：`expo-av` 录音 API 在 Web 不支持。需改为基于 `MediaRecorder` 的 Web 分支，或在 Web 禁用语音功能。
- UI：`@gorhom/bottom-sheet` 官方不支持 Web；需在 Web 使用替代组件或降级为普通 Modal。
- 日期选择：`@react-native-community/datetimepicker` 在 Web 支持有限；需替换为跨端组件（如支持 Web 的日期库）或自行封装 Web 分支（HTML5 datetime-local）。
- 通知：未配置 Web Push（Service Worker/FCM）。当前实现会跳过 Token 注册，`scheduleNotificationAsync` 在 Web 不可用或行为不一致。
- 身份存储：`expo-secure-store` 在 Web 不可用，需改为 Web 使用 `localStorage`/`AsyncStorage` 或让 Supabase 默认的浏览器存储接管。

最小改造路径（建议）：
- 数据层：为 Web 引入 WatermelonDB 的 `LokiJSAdapter` 并做平台分支；或为 Web 端切换到轻量 IndexedDB 层，仅保持列表/详情/状态同步最小闭环。
- 语音：为 Web 单独实现基于 `MediaRecorder` 的录音上传；或在 Web 隐藏语音入口。
- UI：对 `BottomSheet`/`DateTimePicker` 做平台判断，Web 降级为 Modal 与浏览器原生日期输入。
- 通知：Web 阶段先禁用提醒/推送；如必须支持，需新增 SW、FCM 配置与对应集成代码。
- 认证存储：为 Supabase 存储适配做平台分支（原生用 `SecureStore`，Web 用浏览器存储）。

---

## 运行形态与限制

- Expo Go：不适用（WatermelonDB/SQLite 原生模块）。
- 开发期：推荐 Dev Client（prebuild 后安装到模拟器/真机）。
- 构建：使用 EAS（需要配置 EAS Project、推送与签名）。

---

## 建议的改动清单（按优先级）

1) 原生权限与声明（阻止上架/运行问题）
- iOS：添加 `NSMicrophoneUsageDescription`。
- Android：添加 `RECORD_AUDIO`、`POST_NOTIFICATIONS`。

2) 环境与项目配置（阻止部分功能）
- 配置 `extra.eas.projectId` 或在 EAS 环境提供 Project ID。
- 注入 `EXPO_PUBLIC_OPENAI_API_KEY`、`EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`。

3) Web 适配（当前完全不可用）
- 数据库适配器平台分支：Web 切换到 LokiJS/Dexie。
- 录音平台分支：Web 使用 `MediaRecorder` 或禁用。
- UI 组件平台分支：`BottomSheet`、`DateTimePicker` 在 Web 降级替代。
- 通知：短期禁用，长期引入 Web Push（SW/FCM）。
- Supabase 存储：Web 改用浏览器存储（或不覆写 storage）。

4) 构建链路
- 使用 `npx expo prebuild` 并安装 Dev Client，验证原生模块（WatermelonDB、Reanimated、GestureHandler、Notifications、AV）工作正常。

---

## 兼容性速览

| 能力             | iOS | Android | Web |
|------------------|-----|---------|-----|
| 基本运行         | ✅  | ✅      | ❌  |
| 本地数据库       | ✅（SQLiteAdapter 原生） | ✅（SQLiteAdapter 原生） | ❌（需换 LokiJS/Dexie） |
| 语音录音         | ✅  | ✅      | ❌（expo-av 录音不支持） |
| 通知/推送        | ✅（需权限、EAS 配置） | ✅（需权限、EAS 配置） | ❌（未集成 Web Push） |
| BottomSheet UI   | ✅  | ✅      | ⚠️（需替代/降级） |
| 日期时间选择     | ✅  | ✅      | ⚠️（需替代/降级） |
| Supabase 会话持久 | ✅（SecureStore） | ✅（SecureStore） | ⚠️（需浏览器存储） |

注：⚠️ 表示需要改造/降级后可用。

---

## 结论

- 当前代码库在 iOS/Android 端具备落地基础，但必须通过 Dev Client/EAS 构建并补齐权限、环境与 EAS 项目配置。
- Web 端存在多处“平台不支持/未适配”，需要做数据库、录音、UI 组件、通知与存储层的条件化适配或替换，才能达到“可用”状态。


