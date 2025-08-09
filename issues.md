
### ✅ 1. 依赖版本严重不匹配，可能导致运行/构建失败 [FIXED]
  - 位置: `package.json`
  - 现状: `expo@~53.0.20` 配套的 React/React Native 版本与当前声明不一致：`react@19.0.0`、`react-native@0.79.5`、`react-native-reanimated@^4.0.1` 等。Expo SDK 有严格的“支持矩阵”，这些版本很可能不被 SDK 53 支持。
  - 影响: Metro 启动失败、编译错误、原生库（如 Reanimated、Gesture Handler）运行时崩溃等。
  - 建议修复:
    - 使用 Expo 提供的依赖对齐命令安装官方支持版本：
      - 开发本地环境执行: `npx expo install react react-dom react-native react-native-web react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens`
      - 之后再执行 `npx expo install` 同步其余 Expo 相关依赖。
    - 将 `@types/react-native` 与实际 RN 版本对齐（当前为 `^0.72.8` 明显偏旧）。
    - 若确需 RN 0.79/React 19，请整体升级到对应支持该矩阵的 Expo SDK（同时检查 Reanimated 等原生库的兼容版本）。


### ✅ 3.  Android 上使用不支持的 DateTimePicker 模式 [FIXED]
  - 位置: `components/DateTimeButton.tsx`
  - 现状: 默认 `mode="datetime"`，并在 Android 分支直接传入同样的 `mode`。`@react-native-community/datetimepicker` 在 Android 不支持 `datetime` 复合模式。
  - 影响: Android 上选择器可能报错或行为异常。
  - 建议修复:
    - Android 采用两步选择（先 date 再 time），或改为仅 `date` 并提供单独时间选择控件；iOS 可保留 `datetime`。
    - 用平台分支判断 `Platform.OS`，为 Android 改传 `date`/`time`。

### ✅ 4. Expo Router 入口与 `App.tsx`/`index.ts` 并存，易引起混淆 [FIXED]
  - 位置: `app.json`（`main: "expo-router/entry"`）、`App.tsx`、`index.ts`
  - 现状: 使用了 Expo Router 的入口，同时还保留了传统 `registerRootComponent(App)` 的入口文件；`App.tsx` 内容也与实际路由栈无关。
  - 影响: 团队新人容易困惑；某些平台/脚手架脚本可能误用旧入口。
  - 建议修复:
    - 若完全采用 Expo Router：删除不再使用的 `App.tsx` 与 `index.ts`，或在 README 中明确其无效；确保唯一入口为 `expo-router/entry`。

### ✅ 5. 推送 token 的 projectId 获取方式不稳健 [FIXED]
  - 位置: `features/notify/notificationService.ts`
  - 现状: `Notifications.getExpoPushTokenAsync({ projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID })`。该 env 未在 `app.json`/`app.config` 明确注入，运行时可能为空。
  - 影响: 无法在真机正确获取 Expo Push Token。
  - 建议修复:
    - 使用 `expo-constants` 获取 `Constants.easConfig?.projectId`（新版 Expo 推荐方式），或在 `app.json -> extra` 中配置并从 `Constants.expoConfig?.extra` 读取；保底做非空校验与降级处理。

### ✅ 6. 通知 handler 返回字段与类型兼容性问题 [FIXED]
  - 位置: `features/notify/notificationService.ts`
  - 现状: `setNotificationHandler` 返回对象包含 `shouldShowBanner`、`shouldShowList`。部分 Expo/类型版本并不识别这些字段。
  - 影响: TypeScript 报错或运行时字段被忽略。
  - 建议修复:
    - 仅返回官方标准字段：`shouldShowAlert`、`shouldPlaySound`、`shouldSetBadge`。平台差异可在后续逻辑处理。

### ✅ 7. 语音录音配置使用硬编码数值常量 [FIXED]
  - 位置: `features/voice/recorder.ts`
  - 现状: 使用数值常量（如 `outputFormat: 2`, `audioEncoder: 3` 等）。
  - 影响: 可读性差，易随 SDK 变更失效。
  - 建议修复:
    - 使用 Expo AV 提供的命名常量（例如 `Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4` 等），避免魔法数字。



### ✅ 8. 数据库ID不安全赋值 [FIXED]
**文件**: `features/task/taskStore.ts:84-86`
**问题**: `(task as any)._raw.id = data.id` 绕过了WatermelonDB的安全机制
**建议**: 使用WatermelonDB提供的官方API进行ID管理

### ✅ 9. 用户输入未验证 [FIXED]
**文件**: `services/openai.ts:38-44`
**问题**: 直接使用用户提供的音频URI创建FormData，未做验证
**建议**: 添加文件类型、大小和路径验证


### ✅ 10. 不安全的类型转换 [FIXED]
**文件**: `components/BottomSheet.tsx:69`
**问题**: `(ref as any)?.current?.dismiss()` 绕过TypeScript类型检查
**建议**: 使用正确的类型定义


### ✅ 11. 缺少错误恢复机制 [FIXED]
**文件**: `features/voice/recorder.ts`
**问题**: 音频录制错误后状态未正确重置
**建议**: 实现完整的错误恢复流程
