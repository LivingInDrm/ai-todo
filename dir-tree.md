# AI Todo 项目目录结构文档

> 本文档详细描述了 AI Todo 应用的目录结构和每个文件的作用

## 📊 项目架构概览

```
ai-todo/
├── app/                    # 📱 Expo Router 页面路由
├── components/             # 🧩 UI 组件库  
├── features/               # 🔧 功能模块（状态+业务逻辑）
├── db/                     # 💾 数据库层（WatermelonDB）
├── services/               # 🌐 外部API服务封装
├── lib/                    # 🛠️ 通用工具和类型定义
├── assets/                 # 🎨 应用资源文件
├── tests/                  # 🧪 测试目录
├── setup/                  # ⚙️ 测试配置和Mock
├── __mocks__/              # 🎭 模块模拟
└── 配置文件                # 📋 项目配置
```

---

## 📱 核心应用目录

### `app/` - Expo Router 页面
基于 Expo Router 的页面路由系统，采用文件系统路由。

| 文件 | 作用 |
|------|------|
| `_layout.tsx` | 🎯 **应用根布局组件**<br/>- 配置全局Provider（GestureHandlerRootView、BottomSheetModalProvider、SafeAreaProvider）<br/>- 设置Stack导航结构<br/>- 隐藏默认头部导航 |
| `index.tsx` | 🏠 **应用入口页面**<br/>- 应用启动后的默认页面<br/>- 通常重定向到主功能页面或显示欢迎界面 |
| `task-list.tsx` | 📋 **主任务列表页面**<br/>- 三视图切换（Focus/Backlog/Done）<br/>- 任务CRUD操作和手势交互<br/>- 语音输入和草稿确认流程<br/>- 集成所有核心功能的主界面 |

---

## 🧩 UI 组件库

### `components/` - 纯展示型组件
遵循单一职责原则，无副作用的纯UI组件。

#### 核心任务组件
| 文件 | 作用 |
|------|------|
| `TaskCell.tsx` | 📝 **任务单元格组件**<br/>- 显示任务标题、时间、紧急标记<br/>- 支持右滑完成/恢复、左滑更多操作<br/>- 区分普通任务和草稿任务样式<br/>- 支持不同视图的时间显示格式 |
| `TaskTabs.tsx` | 🔖 **视图切换标签组件**<br/>- Focus/Backlog/Done三视图切换<br/>- 显示各视图任务数量<br/>- 当前激活视图高亮显示 |
| `EmptyState.tsx` | 🈳 **空状态展示组件**<br/>- 根据不同视图显示相应的空状态文案<br/>- 提供友好的用户提示和插画 |

#### 交互弹窗组件
| 文件 | 作用 |
|------|------|
| `BottomSheet.tsx` | 📄 **通用底部弹窗容器**<br/>- 基于@gorhom/bottom-sheet的封装<br/>- 提供统一的弹窗交互体验<br/>- 支持手势拖拽和自动吸附 |
| `TaskDetailSheet.tsx` | ✏️ **任务详情编辑弹窗**<br/>- 新建、编辑、查看任务的统一界面<br/>- 支持标题输入、日期选择、紧急标记<br/>- 自动保存和防抖处理<br/>- 支持删除操作 |
| `MoreActionSheet.tsx` | ⚙️ **更多操作菜单**<br/>- 延后任务（今晚/明天/本周末/自定义）<br/>- 置顶操作（仅Focus视图）<br/>- 删除任务确认 |

#### 功能按钮组件
| 文件 | 作用 |
|------|------|
| `VoiceButton.tsx` | 🎤 **语音录入按钮**<br/>- 长按录音交互<br/>- 录音状态可视化反馈<br/>- 支持离线状态禁用<br/>- 录音完成后自动处理 |
| `DateTimeButton.tsx` | 📅 **日期时间选择按钮**<br/>- 显示"添加日期"或具体日期时间<br/>- 调用系统DateTimePicker<br/>- 支持清空日期操作 |

#### 反馈提示组件
| 文件 | 作用 |
|------|------|
| `FloatingBar.tsx` | 📌 **草稿操作浮动条**<br/>- 显示选中草稿数量<br/>- 全选/取消全选操作<br/>- 确认按钮（选中项数≥1时高亮）<br/>- 跟随列表滚动淡入淡出 |
| `Snackbar.tsx` | 💬 **操作结果提示条**<br/>- 显示操作成功/失败消息<br/>- 支持撤销操作（3秒内）<br/>- 自动消失和手动关闭 |

---

## 🔧 功能模块目录

### `features/` - 功能模块
按业务功能组织的状态管理和业务逻辑，每个模块高内聚低耦合。

#### `task/` - 任务管理核心
| 文件 | 作用 |
|------|------|
| `taskStore.ts` | 🗃️ **任务状态管理（Zustand）**<br/>- 任务CRUD操作（创建、读取、更新、删除）<br/>- 三视图过滤逻辑（getFocusTasks/getBacklogTasks/getDoneTasks）<br/>- 任务状态切换（完成/恢复）<br/>- 任务操作（延后、置顶）<br/>- 与WatermelonDB数据同步 |

#### `draft/` - 草稿任务流程
| 文件 | 作用 |
|------|------|
| `draftStore.ts` | 📝 **草稿状态管理**<br/>- 管理语音解析后的待确认任务（pending=true）<br/>- 草稿选择状态管理<br/>- 批量确认操作<br/>- 单条草稿快速确认<br/>- 撤销机制支持 |

#### `voice/` - 语音输入模块
| 文件 | 作用 |
|------|------|
| `recorder.ts` | 🎙️ **录音功能封装**<br/>- expo-av录音API封装<br/>- 音频格式处理和压缩<br/>- 录音权限管理<br/>- 录音状态监控 |
| `voiceFlow.ts` | 🔄 **语音处理完整流程**<br/>- 录音 → Whisper转写 → GPT解析 → 草稿生成<br/>- 错误处理和重试机制<br/>- 网络状态检查<br/>- 解析结果验证 |

---

## 💾 数据层目录

### `db/` - WatermelonDB 数据库
基于SQLite的本地数据库，支持离线优先和实时同步。

| 文件 | 作用 |
|------|------|
| `database.ts` | 💾 **数据库实例初始化**<br/>- WatermelonDB适配器配置<br/>- 数据库连接和模式管理<br/>- 集合注册和导出 |
| `schema.ts` | 📊 **数据库表结构定义**<br/>- tasks表字段定义<br/>- 索引配置优化查询性能<br/>- 数据库版本管理 |
| `models/Task.ts` | 📋 **Task数据模型**<br/>- 字段装饰器定义（@field、@date、@readonly）<br/>- 计算属性（isCompleted、isOverdue等）<br/>- 业务逻辑方法封装 |

---

## 🌐 服务层目录

### `services/` - 外部API封装
封装第三方服务API，提供统一的调用接口。

| 文件 | 作用 |
|------|------|
| `openai.ts` | 🤖 **OpenAI API封装**<br/>- Whisper语音转写API调用<br/>- GPT-4o文本解析和函数调用<br/>- 错误处理和重试机制<br/>- API密钥管理 |

---

## 🛠️ 工具与类型目录

### `lib/` - 通用工具库
项目通用的工具函数、类型定义和常量。

| 文件 | 作用 |
|------|------|
| `types.ts` | 📜 **全局TypeScript类型定义**<br/>- TaskData、TaskStatus、TaskView等核心类型<br/>- API请求/响应类型<br/>- 组件Props类型<br/>- 状态管理接口定义 |

---

## 🎨 资源文件目录

### `assets/` - 应用资源
应用所需的图标、图片等静态资源。

| 文件 | 作用 |
|------|------|
| `icon.png` | 🎯 **应用主图标**<br/>- 应用在设备上显示的主要图标<br/>- 用于App Store/Google Play展示 |
| `adaptive-icon.png` | 📱 **Android自适应图标**<br/>- Android 8.0+系统的自适应图标<br/>- 支持不同形状的图标遮罩 |
| `splash-icon.png` | 💫 **启动屏图标**<br/>- 应用启动时显示的图标<br/>- 配合启动屏背景使用 |
| `favicon.png` | 🌐 **Web版图标**<br/>- Web版本的浏览器标签页图标<br/>- PWA应用图标 |

---

## 🧪 测试基础设施

### `tests/` - 测试目录
按测试类型组织的测试文件，确保代码质量和功能正确性。

| 目录 | 作用 |
|------|------|
| `unit/` | 🧪 **单元测试**<br/>- 纯函数和工具类测试<br/>- 状态管理逻辑测试<br/>- 业务逻辑验证 |
| `components/` | 🎭 **组件测试**<br/>- UI组件渲染测试<br/>- 用户交互模拟<br/>- Props传递验证 |
| `integration/` | 🔗 **集成测试**<br/>- 功能模块协作测试<br/>- 数据库操作验证<br/>- API调用测试 |
| `e2e/` | 🎯 **端到端测试**<br/>- 完整用户流程测试<br/>- 真实设备/模拟器测试<br/>- 性能和稳定性验证 |

### `setup/` - 测试配置
测试环境的配置和Mock设置。

| 文件 | 作用 |
|------|------|
| `jest.setup.ts` | ⚡ **Jest全局配置**<br/>- 测试环境初始化<br/>- 全局Mock配置<br/>- 测试工具函数注册 |
| `mock/handlers.ts` | 🎭 **MSW API模拟处理器**<br/>- OpenAI API模拟响应<br/>- Supabase API模拟<br/>- 网络请求拦截和模拟 |
| `mock/server.ts` | 🖥️ **Mock服务器配置**<br/>- MSW服务器启动配置<br/>- 请求/响应日志记录<br/>- 错误场景模拟 |
| `mock/watermelondb.ts` | 💾 **数据库模拟器**<br/>- 内存数据库适配器<br/>- 测试数据生成工具<br/>- 数据库操作模拟 |

### `__mocks__/` - 模块模拟
React Native原生模块的Mock实现。

| 目录 | 作用 |
|------|------|
| `react-native-worklets/` | ⚙️ **Worklets模块模拟**<br/>- react-native-reanimated依赖模拟<br/>- 避免测试环境中的原生模块错误 |

---

## 📋 配置文件

### 项目核心配置
| 文件 | 作用 |
|------|------|
| `package.json` | 📦 **项目依赖和脚本配置**<br/>- 项目元信息（名称、版本、作者）<br/>- 依赖包管理（dependencies、devDependencies）<br/>- 脚本命令定义（start、test、build等） |
| `tsconfig.json` | 🔧 **TypeScript编译配置**<br/>- 编译选项和目标版本<br/>- 路径映射和模块解析<br/>- 类型检查严格性设置 |
| `app.json` | 📱 **Expo应用配置**<br/>- 应用元数据（名称、版本、图标）<br/>- 平台特定配置<br/>- 权限和功能声明 |

### 构建和测试配置
| 文件 | 作用 |
|------|------|
| `jest.config.js` | 🧪 **Jest测试框架配置**<br/>- 测试环境配置（jest-expo preset）<br/>- 文件匹配模式<br/>- 覆盖率报告设置<br/>- Mock文件路径配置 |
| `babel.config.js` | 🔄 **Babel代码转换配置**<br/>- JavaScript/TypeScript转换规则<br/>- 插件配置（reanimated等）<br/>- 环境特定配置 |

---

## 📚 文档文件

### 开发文档
| 文件 | 作用 |
|------|------|
| `CLAUDE.md` | 📖 **开发指南文档**<br/>- 项目架构和技术栈说明<br/>- 开发命令和最佳实践<br/>- 测试指南和调试技巧<br/>- AI助手使用指导 |
| `design.md` | 🎨 **产品设计规格文档**<br/>- 产品功能需求和范围<br/>- 用户界面设计规范<br/>- 用户体验流程设计<br/>- 技术架构设计 |
| `plan.md` | 📋 **开发计划和里程碑**<br/>- 项目开发阶段规划<br/>- 功能实现优先级<br/>- 时间节点和交付物<br/>- 风险评估和应对策略 |

---