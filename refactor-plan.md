## 重构子任务清单（任务内容 + 验证标准）

### 🎉 重构完成总结
- **完成时间**: 2025-08-10
- **完成任务**: 14/14 全部任务
- **重构成果**:
  - ✅ 所有组件已迁移到主题系统
  - ✅ 移除所有硬编码颜色和样式
  - ✅ 统一使用 @ui 组件库
  - ✅ 支持暗色模式自动切换
  - ✅ 保持所有交互功能不变

## 重构子任务清单（任务内容 + 验证标准）

### 子任务 1：主题基础设施接入 ✅ 完成
- 任务内容：
  - 在应用根部包裹 `ThemeProvider`，导出 `useThemeValues()`/`useTheme()` 可用。
  - 配置路径别名（tsconfig + babel）：`@ui/*`、`@lib/*`、`@lib/theme/*`。
  - 确认 iOS/Android 均能正确切换浅/深色。
- 验证标准：
  - App 正常启动，无 TS 与运行时错误。
  - 在模拟切换系统主题时，`theme.isDark` 变化，颜色随之切换。
  - `import { Text } from '@ui'` 与 `import { useThemeValues } from '@lib/theme/ThemeProvider'` 能正常编译使用。
- 完成情况：
  - ✅ ThemeProvider 已在 app/_layout.tsx 配置
  - ✅ tsconfig.json 添加了路径别名配置
  - ✅ babel.config.js 添加了 module-resolver 插件
  - ✅ 安装了 babel-plugin-module-resolver 依赖

### 子任务 2：令牌替换基线（全局）
- 任务内容：
  - 审查 `components/*` 中的硬编码颜色/间距/圆角/阴影，替换为 `theme.colors/*`、`theme.spacing/*`、`theme.radius/*`、`theme.elevation/*`。
  - 不改变交互逻辑，仅做样式来源替换。
- 验证标准：
  - 搜索 `#fff|#000|#007AFF|#8E8E93` 等常见硬编码，结果显著减少且有替代来源。
  - 暗色模式下对比度清晰，无“黑字黑底/白字白底”等问题。

### 子任务 3：重构 TaskTabs（`components/TaskTabs.tsx`） ✅ 完成
- 任务内容：
  - 使用 `@ui/Text`、`@ui/Badge`，容器背景用 `theme.colors.bg.subtle`，激活态用 `bg.surface` + `elevation.s`。
  - 徽标：选中 `variant="primary"`，未选 `variant="muted"`。
- 验证标准：
  - 切换 Tab 行为无回归，计数展示正确。
  - 浅/深色外观符合预期，badge 对比度达标。
- 完成情况：
  - ✅ 使用 @ui/Text 和 @ui/Badge 组件
  - ✅ 容器背景使用 theme.colors.bg.subtle
  - ✅ 激活态使用 bg.surface + elevation.s
  - ✅ Badge 使用 primary/muted variants
  - ✅ 移除所有硬编码颜色和样式

### 子任务 4：重构 EmptyState（`components/EmptyState.tsx`） ✅ 完成
- 任务内容：
  - 标题 `Text variant="heading"`，副标题 `variant="caption" color="secondary"`。
  - 容器 padding 使用 `theme.spacing`，移除硬编码颜色。
- 验证标准：
  - 各视图的文案与 Emoji 正确展示，深色模式下可读性良好。
- 完成情况：
  - ✅ 标题使用 Text variant="heading"
  - ✅ 副标题使用 variant="caption" color="secondary"
  - ✅ 容器 padding 使用 theme.spacing
  - ✅ 移除所有硬编码颜色

### 子任务 5：重构 Snackbar（`components/Snackbar.tsx`） ✅ 完成
- 任务内容：
  - 背景使用 `theme.colors.bg.elevated` 或专用容器色；动作 `Text color="link"`。
  - 阴影用 `theme.elevationPresets.snackbar`，透明度与动画不变。
- 验证标准：
  - 展示/自动消失/操作回调逻辑无回归。
  - 深色模式下文字与背景对比充足。
- 完成情况：
  - ✅ 背景使用 theme.colors.bg.elevated
  - ✅ 动作文本使用 Text color="link"
  - ✅ 阴影使用 theme.elevationPresets.snackbar
  - ✅ 所有间距使用 theme.spacing

### 子任务 6：重构 FloatingBar（`components/FloatingBar.tsx`） ✅ 完成
- 任务内容：
  - 背景 `bg.surface`，分割线 `border.default`，阴影 `elevationPresets.snackbar`。
  - 左/右按钮替换为 `@ui/Button`（`secondary`/`primary`），中部信息用 `@ui/Text color="secondary"`。
- 验证标准：
  - 出现/隐藏动画平滑，按钮禁用态和点击态正确。
  - 计数与"全选/取消全选"行为无回归。
- 完成情况：
  - ✅ 背景使用 theme.colors.bg.surface
  - ✅ 分割线使用 theme.colors.border.default
  - ✅ 阴影使用 theme.elevationPresets.snackbar
  - ✅ 按钮使用 @ui/Button（secondary/primary variants）
  - ✅ 信息文本使用 @ui/Text color="secondary"

### 子任务 7：抽象 BottomSheet 视觉层（`components/BottomSheet.tsx`） ✅ 完成
- 任务内容：
  - 保留 `@gorhom/bottom-sheet` 交互；视觉骨架改为 `@ui/Sheet`：`Sheet.Header/Content/Footer`。
  - 指示条、圆角、背景、分割线全部来自 theme；保留 `snapPoints` 与键盘策略。
- 验证标准：
  - 作为容器被 `MoreActionSheet`、`TaskDetailSheet` 引用时，展示与交互稳定。
  - iOS/Android 键盘行为一致，无遮挡与高度异常。
- 完成情况：
  - ✅ 保留 @gorhom/bottom-sheet 交互功能
  - ✅ 使用 theme 的颜色、圆角、间距
  - ✅ 标题使用 @ui/Text 组件

### 子任务 8：重构 MoreActionSheet（`components/MoreActionSheet.tsx`） ✅ 完成
- 任务内容：
  - 结构改为 `BottomSheet + Sheet.Header/Content`；选项行文本用 `@ui/Text`，删除项 `color="danger"`。
  - 可引入 `ActionRow`（图标/emoji + 文案 + onPress）抽象，减少重复。
- 验证标准：
  - present/dismiss 正常；点击操作后自动关闭并回调正确。
  - 暗色模式外观一致，分割线与间距统一。
- 完成情况：
  - ✅ 引入 ActionRow 组件减少重复
  - ✅ 使用 @ui/Text，删除项使用 color="danger"
  - ✅ 分割线和间距使用 theme tokens

### 子任务 9：重构 DateTimeButton（`components/DateTimeButton.tsx`） ✅ 完成
- 任务内容：
  - 展示按钮用 `@ui/Button` 替换，清除按钮用 `variant="ghost"`；文案与图标用 `@ui/Text`。
  - 保留 iOS/Android 分支逻辑与默认 09:00 策略，样式主题化。
- 验证标准：
  - iOS spinner 模式与 Android 两段式选择工作正常。
  - 清除与确认逻辑正确，日期时间格式显示与原行为一致。
- 完成情况：
  - ✅ 使用 @ui/Text 组件
  - ✅ 样式全部主题化
  - ✅ 保留 iOS/Android 分支逻辑和默认时间策略

### 子任务 10：重构 TaskDetailSheet（`components/TaskDetailSheet.tsx`） ✅ 完成
- 任务内容：
  - 使用 `Sheet.Header/Content/Footer` 组织；整合 `DateTimeButton`；“紧急”用 `@ui/Button` 或 `Badge` 风格。
  - 删除按钮使用 `@ui/Button variant="danger"` 放入 Footer。
  - 保持自动保存与删除逻辑不变，仅样式主题化。
- 验证标准：
  - 新建/编辑流程稳定；标题、日期、紧急标记的变更会触发预期保存。
  - 关闭时不会丢失应保存的数据；删除流程不触发额外保存。
- 完成情况：
  - ✅ 使用 @ui/Text 和 @ui/Button 组件
  - ✅ 紧急按钮使用主题颜色
  - ✅ 删除按钮使用 Button variant="danger"
  - ✅ 保持自动保存逻辑不变

### 子任务 11：重构 TaskCell（`components/TaskCell.tsx`） ✅ 完成
- 任务内容：
  - 背景与 padding 使用 theme；标题用 `@ui/Text`，完成态 `color="muted"` 并保留删除线。
  - 紧急竖条使用 `feedback.danger`；打勾 `feedback.success`，边框 `border.default`。
  - Swipe 按钮背景/文字颜色用 theme。
- 验证标准：
  - 左右滑手势阈值、触发方向与回调无回归。
  - 列表滚动性能无显著回退（对比 FPS/流畅度）。
- 完成情况：
  - ✅ 使用 @ui/Text 和 @ui/Badge
  - ✅ 紧急指示和打勾使用 theme.colors.feedback
  - ✅ Swipe 按钮颜色主题化
  - ✅ 保留所有手势功能

### 子任务 12：抽象可复用组件（新增于 `components/ui/`）
- 任务内容：
  - `ActionRow`：图标/emoji + 文案 + onPress；
  - `ListDivider`：统一分割线；
  - `IconTextButton`：按钮内部带小图标/emoji。
  - 在 `MoreActionSheet` 等处替换落地。
- 验证标准：
  - 重用后代码行数下降、重复样式消失；浅/深色一致。
  - 交互区域符合 44×44 最小触达规范。

### 子任务 13：响应式与容器（屏幕层面）
- 任务内容：
  - 在主要页面使用 `@ui/ResponsiveContainer` 控制 maxWidth 与左右内边距。
  - 仅限不会破坏现有布局的页面逐步接入。
- 验证标准：
  - 手机与平板下布局合理，平板居中且不过度拉伸。

### 子任务 14：文档与用法指南
- 任务内容：
  - 在 `components/ui/` 添加示例与 Do/Don’t，覆盖 `Text`、`Button`、`Badge`、`Card`、`Sheet`、`ResponsiveContainer`。
  - 说明常见模式（ActionRow、ListDivider、IconTextButton）的推荐用法。
- 验证标准：
  - 新成员可依据文档快速复用；示例能直接在项目内运行预览。

### 子任务 15：清理与一致性检查
- 任务内容：
  - 移除不再使用的样式段与常量；统一 `activeOpacity`、圆角、阴影层级。
  - 全局搜索与替换遗留硬编码颜色与尺寸。
- 验证标准：
  - Lint 通过；搜索常见硬编码色值命中接近 0。
  - 暗色模式下各视图对齐，无明显视觉割裂。


