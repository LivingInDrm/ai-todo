# AI-TODO 开发计划

## 项目概述
基于设计文档开发一个极简的TodoList应用，支持语音输入、本地提醒和云同步。

## 技术栈
- 前端框架：Expo + React Native
- 本地存储：WatermelonDB (SQLite)
- 云服务：Supabase (Auth + Realtime + Database)
- 语音识别：OpenAI Whisper API
- LLM：OpenAI GPT-4o
- 推送：FCM/APNs

## 开发任务列表

### Phase 1: 项目初始化和基础架构 ✅
- [x] 初始化 Expo 项目 ✅
- [x] 配置 TypeScript ✅
- [x] 安装核心依赖包 ✅
- [x] 创建基础目录结构 ✅
- [x] 配置环境变量 ✅

### Phase 2: 数据层实现 ✅
- [x] 配置 WatermelonDB ✅
  - [x] 创建数据库 schema ✅
  - [x] 实现 Task 模型 ✅
  - [x] 创建数据库初始化逻辑 ✅
- [x] 实现任务状态管理 (Zustand) ✅
  - [x] 创建 taskStore ✅
  - [x] 创建 draftStore ✅

### Phase 3: UI 基础组件 ✅
- [x] 实现基础组件 ✅
  - [x] TaskCell 组件 ✅
  - [x] TaskTabs 组件 ✅
  - [x] EmptyState 组件 ✅
  - [x] BottomSheet 组件 ✅
  - [x] DateTimeButton 组件 ✅
  - [x] Snackbar 组件 ✅
  - [x] FloatingBar 组件 ✅

### Phase 4: 核心功能 - 任务管理 ✅
- [x] 实现三视图列表页面 ✅
  - [x] Focus 视图 ✅
  - [x] Backlog 视图 ✅
  - [x] Done 视图 ✅
  - [x] 视图切换逻辑 ✅
- [x] 实现任务操作 ✅
  - [x] 新建任务 ✅
  - [x] 编辑任务 ✅
  - [x] 完成/恢复任务（右滑手势） ✅
  - [x] 删除任务（左滑手势） ✅
  - [x] 延后任务 ✅
  - [x] 置顶任务 ✅

### Phase 5: 任务详情卡片 ✅
- [x] 实现 TaskDetailSheet ✅
  - [x] 标题输入 ✅
  - [x] 日期选择器集成 ✅
  - [x] 紧急标记切换 ✅
  - [x] 自动保存逻辑 ✅

### Phase 6: 语音输入功能 ✅
- [x] 实现语音录制 ✅
  - [x] VoiceButton 组件 ✅
  - [x] expo-av 录音封装 ✅
- [x] 集成 Whisper API ✅
  - [x] 音频上传逻辑 ✅
  - [x] 转写结果处理 ✅
- [x] 集成 GPT-4o ✅
  - [x] 实现 function calling ✅
  - [x] 解析任务操作 ✅
- [x] 实现草稿确认流程 ✅
  - [x] Draft 区域 UI ✅
  - [x] 批量确认逻辑 ✅
  - [x] 撤销功能 ✅

### Phase 7: Supabase 集成 ✅
- [x] 配置 Supabase ✅
  - [x] 创建项目和数据库表 ✅
  - [x] 配置 RLS 规则 ✅
  - [x] 初始化客户端 ✅
- [x] 实现认证功能 ✅
  - [x] 登录/注册页面 ✅
  - [x] JWT 管理 ✅
- [x] 实现数据同步 ✅
  - [x] 实时订阅 ✅
  - [x] 冲突解决策略 ✅
  - [x] 离线队列 ✅

### Phase 8: 本地提醒 ✅
- [x] 配置推送通知 ✅
  - [x] expo-notifications 设置 ✅
  - [x] FCM/APNs 配置 ✅
- [x] 实现提醒逻辑 ✅
  - [x] 任务到期检查 ✅
  - [x] 本地通知调度 ✅

### Phase 9: 设置页面 ✅
- [x] 实现设置界面 ✅
  - [x] 用户信息显示 ✅
  - [x] 登出功能 ✅
  - [x] 数据清理选项 ✅


## 当前进度
**当前阶段**: Phase 1 - Phase 9 全部完成 ✅

## 验证标准
每个子任务完成后的验证方式：
1. 代码能够成功编译运行
2. 功能符合设计文档要求
3. 无明显 bug 或错误
4. 代码风格一致且可维护

## 注意事项
- 严格遵循设计文档的功能范围
- 保持代码简洁，避免过度设计
- 优先实现 MVP 功能
- 确保每个功能都有适当的错误处理