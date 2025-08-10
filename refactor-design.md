## 重构计划（@components → 主题化与 @ui 组件接入）

### 目标
- **统一设计系统与主题化**：移除硬编码颜色/尺寸/圆角/阴影，全面使用 `@lib/theme` 与 `@ui/*`。
- **复用通用容器与交互模式**：沉淀 Sheet、Card、Button、Text 等基础能力，减少重复样式与逻辑。
- **稳定渐进**：分阶段替换，保持交互与功能不变，降低回归风险。

### 总体策略（分阶段）
- **阶段一｜基础设施接入**
  - 在应用根包裹 `ThemeProvider`，保证可用 `useThemeValues()`。
  - 配置 alias：`@ui`、`@lib/theme`、`@lib`（tsconfig.paths + babel）
  - 制定“令牌替换基线”：先替换颜色、间距、圆角、阴影等硬编码。

- **阶段二｜组件替换与适配**
  - 先替换纯视觉组件：`Text`、`Button`、`Badge`、`Card`、`Sheet` 容器。
  - 再替换复合组件：`BottomSheet` 套壳、`MoreActionSheet`、`TaskDetailSheet`。

- **阶段三｜行为与体验一致性**
  - 统一动画、按压反馈、阴影层级。
  - 适配暗色模式与可访问性（对比度、字体缩放）。

- **阶段四｜清理与文档**
  - 清理重复样式/工具函数与遗留硬编码。
  - 为 `@ui` 编写示例与用法指南。

### 全局改造要点
- **颜色**：用 `theme.colors.*` 替代 `#fff`、`#000`、`#007AFF`、`#8E8E93` 等硬编码。
- **间距**：用 `theme.spacing` 与 `theme.spacingGroups`。
- **圆角**：用 `theme.radius` 与 `theme.radiusPresets`。
- **阴影/层级**：用 `theme.elevation` 与 `theme.elevationPresets`。
- **文本**：统一使用 `@ui/Text`（`variant` + `color`）。
- **响应式**：屏幕容器用 `@ui/ResponsiveContainer`。

### 组件级重构清单

#### BottomSheet.tsx
- 问题：硬编码样式、颜色；自绘 header；与其他 Sheet 重复。
- 方案：
  - 保留 `@gorhom/bottom-sheet` 作为交互容器；视觉改用 `@ui/Sheet`：`Sheet.Header`、`Sheet.Content`、`Sheet.Footer`。
  - 背景、指示条、圆角、阴影、分割线全部来自 theme。
  - 将 `snapPoints`、`keyboardBehavior` 作为可配置 props，默认值与现状一致。

#### MoreActionSheet.tsx
- 问题：标题、分割线、选项行样式硬编码且重复。
- 方案：
  - 结构改为：`<BottomSheet><Sheet.Header title="选择操作"/><Sheet.Content>...</Sheet.Content></BottomSheet>`。
  - 选项行用 `@ui/Text`；危险项（删除）使用 `color="danger"`，分割线使用 theme border。
  - 可抽 `ActionRow`（图标/emoji + 文案 + onPress）供复用。

#### TaskDetailSheet.tsx
- 问题：输入、日期、紧急按钮样式硬编码；表单布局重复；删除按钮无统一风格。
- 方案：
  - 使用 `Sheet.Header/Content/Footer` 组织内容。
  - `DateTimeButton` 用 `@ui/Button` + 原生 `DateTimePicker` 组合表现，文案/图标与主题对齐。
  - “紧急”使用 `@ui/Button` 或 `Badge` 风格（颜色来自 `feedback.danger`）。
  - 删除按钮使用 `@ui/Button variant="danger"` 放入 `Sheet.Footer`。
  - 保留自动保存、删除逻辑，仅主题化样式。

#### TaskCell.tsx
- 问题：容器/文本/时间/紧急标示硬编码；完成态颜色处理分散。
- 方案：
  - 外层容器使用 theme 背景与 padding；如性能允许可用 `@ui/Card`。
  - 文本统一 `@ui/Text`：标题 `variant="body"`，完成态 `color="muted"` 并保留删除线。
  - 紧急竖条用 `feedback.danger`；打勾颜色用 `feedback.success`，边框 `border.default`。
  - Swipe 操作按钮背景/文本风格使用 theme；可抽复用组件。

#### TaskTabs.tsx
- 问题：标签容器/激活态/徽标硬编码；文本风格不统一。
- 方案：
  - 容器背景 `bg.subtle`，激活态 `bg.surface` + `elevation.s`。
  - 文本用 `@ui/Text`，选中态使用 `text.primary`，未选 `text.secondary`。
  - 角标用 `@ui/Badge`：选中 `variant="primary"`，未选 `variant="muted"`。

#### DateTimeButton.tsx
- 问题：按钮与清除样式硬编码；与表单耦合。
- 方案：
  - 展示按钮用 `@ui/Button`，清除用 `variant="ghost"`；文案/图标采用 `@ui/Text`。
  - iOS/Android 分支与默认 09:00 逻辑保持，样式主题化。

#### FloatingBar.tsx
- 问题：背景、分割线、阴影硬编码。
- 方案：
  - 背景 `bg.surface`，分割线 `border.default`，阴影 `elevationPresets.snackbar`。
  - 左右按钮替换为 `@ui/Button`（`secondary`/`primary`），禁用态使用 theme 文本和背景。
  - 中部信息使用 `@ui/Text color="secondary"`。

#### Snackbar.tsx
- 问题：背景、动作色硬编码。
- 方案：
  - 背景改为 `bg.elevated` 或单独定义 Snackbar 容器色；动作文本 `color="link"`。
  - 阴影使用 `elevationPresets.snackbar`。

#### EmptyState.tsx
- 问题：标题/副标题样式硬编码。
- 方案：
  - 标题 `Text variant="heading"`，副标题 `variant="caption" color="secondary"`。
  - 容器间距用 `spacing`，必要时使用 `ResponsiveContainer`。

#### VoiceButton.tsx
- 问题：主色、录音态颜色、阴影硬编码。
- 方案：
- 背景使用 `accent.primary` 与 `feedback.danger`；禁用态用 `border.subtle` 与 `text.muted`。
- 阴影统一 `elevationPresets.floatingButton`；提示点颜色 `feedback.danger`。

### 可复用抽象建议
- **ActionRow**：图标/emoji + 文案 + onPress（用于 `MoreActionSheet` 等列表）。
- **ListDivider**：统一分割线（宽度/颜色/间距）。
- **IconTextButton**：按钮内包含小图标或 emoji 的快捷组件。
- （可选）**Input**：与 `Text` 风格统一的输入框，聚焦态边框 `border.focus`。

### 风格与可访问性
- **暗色模式**：全部颜色用 token 自动切换；避免直接 `#fff/#000`。
- **字体与可读性**：使用 `typography` 与 `useResponsiveFontSize`，尊重系统字体缩放（上限/下限处理）。
- **触达面积与反馈**：按钮最小触达 44×44，统一 `activeOpacity` 与按压反馈。

### 推进顺序与核验
- 优先替换（低风险）：`TaskTabs`、`EmptyState`、`Snackbar`、`FloatingBar`。
- 次级替换：`MoreActionSheet`、`TaskDetailSheet`（落地 `Sheet` 体系）。
- 最后替换：`TaskCell`（手势与性能敏感）。
- 每步后执行测试与预览，核对交互与视觉；对照 `coverage` 页面确认行为不变。

### 基础设施与配置
- 在根部包裹 `ThemeProvider`（若未完成）。
- 确认 tsconfig/babel 路径别名：
  - `@ui/*` → `components/ui/*`
  - `@lib/*` → `lib/*`
  - `@lib/theme/*` → `lib/theme/*`

### 输出物
- 代码编辑：逐个组件完成主题化与 `@ui` 接入。
- 文档：在 `components/ui/` 添加示例与 Do/Don’t。
- 清理：删除不再使用的硬编码与重复样式段。

### 结论
该计划在不改变交互逻辑的前提下，最大化复用已建设的 `@lib/theme` 与 `@ui`，统一视觉与行为，并为后续组件扩展提供稳定基线。建议自 `TaskTabs` 与 `Snackbar` 开始落地，随后推进到 `MoreActionSheet` 与 `TaskDetailSheet`，最后处理 `TaskCell`。


