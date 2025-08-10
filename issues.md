# 样式系统全面审查问题清单

面向：全局一致性、架构与组织、可维护性、可扩展性、性能。

---

## 1. 全局一致性

- 文本组件未统一使用主题化 `@ui/Text`
  - 现状：多处仍直接使用 `react-native` 的 `Text`，导致颜色、字号、行高等不走主题 token。
  - 位置：
    - `app/auth.tsx`（顶部 `import { View, Text, ... } from 'react-native'`）
    - `app/task-list.tsx`
    - `app/settings.tsx`
  - 建议：统一替换为 `@ui/Text`，并用 `variant` + `color` 管理排版与语义色。

- 颜色使用不完全走 token，仍有硬编码
  - 现状：局部存在 `#FFF`、`#000` 等硬编码，或在组件内硬写 `shadowColor`。
  - 位置示例：
    - `app/auth.tsx`：`ActivityIndicator color="#FFF"`，`authModeButtonActive.shadowColor = '#000'`
    - `app/task-list.tsx`：新增按钮阴影 `shadowColor: theme.isDark ? theme.colors.text.primary : '#000'`
    - `features/notify/notificationService.ts`：Android 通道 `lightColor: '#FF231F7C'`
  - 建议：
    - 统一通过 `theme.colors.*` 或新增 `theme.colors.utility.shadow`、`theme.colors.utility.activityIndicator` 等语义色。
    - Android 通知可定义 `colors.brand.notification` 或 `colors.accent.secondary` 语义映射。

- 间距、圆角、字号存在魔法数值，未完全走 token
  - 现状：样式表内仍有大量裸数字；多数动态样式已走 `theme.spacing/*`，但基础样式未统一。
  - 位置示例：
    - `app/auth.tsx`：`fontSize: 32`、`borderRadius: 8`、`padding: 4/8/16/24/32` 等
    - `components/TaskDetailSheet.tsx`：`minHeight: 60`
    - `components/DateTimeButton.tsx`：`marginVertical: 12`
    - `components/TaskCell.tsx`：`lineHeight: 22`
  - 建议：
    - 字号用 `theme.fontSize`，行高按 `typography` 预设或用 `Math.round(size * lineHeight)` 的统一函数。
    - 间距用 `theme.spacing`/`spacingGroups`，圆角用 `theme.radius`/`radiusPresets`，尺寸用 `theme.sizing`。

- 单位与格式
  - 现状：RN 默认数值为 dp，偶有 `'100%'` 用于占比布局；颜色主要为 HEX（含 RGBA）。
  - 建议：约定统一使用 dp 数值与 HEX/RGBA，避免三位 HEX（如 `#FFF`），全部走 token 或统一 HEX 长度。

---

## 2. 架构与组织

- 主题/Tokens 组织较完善，但入口未充分推广到所有组件
  - 优点：`lib/theme` 已集中管理 `colors/spacing/typography/radius/elevation/responsive/sizing`，`ThemeProvider` 支持系统/持久化主题。
  - 问题：部分屏幕未使用 `@ui` 体系（如 `Text`/`Button`），导致风格分裂。
  - 建议：完成从屏幕到组件的 UI 层“令牌化”，优先替换纯视觉组件为 `@ui/*`。

- 响应式容器未在页面层普遍使用
  - 现状：提供了 `components/ui/ResponsiveContainer.tsx` 与 `lib/theme/responsive.ts`，但 `app/*` 页面未使用。
  - 建议：页面根容器统一包裹 `ResponsiveContainer`，设置 `padding=centered`，保证平板/大屏一致的阅读宽度与边距。

- BottomSheet 默认快照点固定像素
  - 现状：`components/BottomSheet.tsx` 默认 `snapPoints=[400,600]`、`'50%'` 等固定值。
  - 建议：引入基于 `useScreenSize()` 的响应式快照点（如小屏 60%/大屏 480dp）。

---

## 3. 可维护性

- 阴影/海拔使用不统一
  - 现状：
    - 主题已提供 `theme.elevation`/`elevationPresets`，但页面仍自定义阴影：
      - `app/auth.tsx`：`authModeButtonActive` 自定义 iOS 阴影
      - `app/task-list.tsx`：新增按钮自定义阴影属性
  - 建议：统一替换为 `theme.elevationPresets.button / floatingButton / card` 等；必要时扩展预设。

- 重复的页面 Header/Section/Card 样式
  - 现状：`app/settings.tsx`、`app/task-list.tsx` 等存在相似的 header/section/card 容器样式。
  - 建议：沉淀 `@ui/Sheet.Header`、`@ui/Card`、`@ui/SectionHeader` 等通用容器，减少样式重复。

- 空样式与占位样式过多
  - 现状：`app/task-list.tsx` 内 `styles.header`、`styles.headerPlaceholder` 等为空对象；
  - 风险：增加视觉噪音与维护成本。
  - 建议：清理未使用/空样式；对确需动态样式的部分，保留为内联并以 token 构造。

- 魔法数值清单（优先替换为 token）
  - `app/auth.tsx`: `fontSize: 32`、`borderRadius: 6/8`、`paddingHorizontal: 16`、`paddingVertical: 8/16`、`marginBottom: 8/16/24/32`
  - `components/TaskDetailSheet.tsx`: `minHeight: 60`
  - `components/DateTimeButton.tsx`: `marginVertical: 12`, `icon.fontSize: 16`
  - `components/TaskCell.tsx`: `lineHeight: 22`, `actionText.fontSize: 20`
  - 建议：用 `theme.fontSize`, `theme.spacing`, `theme.radius`, `theme.sizing` 替换；对行高统一由 `typography` 决定。

---

## 4. 可扩展性

- 多主题支持基本完善，但状态栏样式未随主题切换
  - 现状：页面多处 `StatusBar style="dark"` 被硬编码。
  - 建议：根据 `theme.isDark` 动态设置 `StatusBar` 风格，避免暗色主题下对比度问题。

- 品牌/扩展主题位未预留完整语义
  - 现状：`colors.accent.primary/secondary` 已有，但未沉淀通知/系统级强调色等扩展位。
  - 建议：新增 `colors.brand.*` 或 `colors.utility.*`，映射到平台通道颜色、链接色等跨场景语义。

- 响应式与适配
  - 现状：提供了 `useResponsive*`/`useMaxContentWidth`，但页面层未应用。
  - 建议：
    - 页面根容器使用 `ResponsiveContainer` 控制阅读宽度、边距。
    - BottomSheet snapPoints 与大按钮尺寸随 `ScreenSize` 调整。

- 新增组件风格一致性
  - 建议：新增组件必须：
    - 尺寸走 `sizing`、间距走 `spacing/spacingGroups`、圆角走 `radius/radiusPresets`、阴影走 `elevationPresets`；
    - 文本仅用 `@ui/Text`；按钮仅用 `@ui/Button`；
    - 禁止硬编码颜色与字号。

---

## 5. 性能

- 内联样式的构造与重渲染
  - 现状：大量样式在渲染期基于 `theme` 内联构造（优点：主题切换即时；风险：频繁创建对象）。
  - 建议：
    - 将纯静态样式下沉到 `StyleSheet.create`；需要按主题变动的部分仍内联，但可用小型 `useMemo` 合并复杂对象。
    - 阴影等复杂样式统一走主题预设，减少重复对象合成。

- 选择器深度/复杂度
  - 现状：RN 样式为对象合成，无深层选择器问题；无明显性能红旗。

- 未使用/冗余样式
  - 现状：存在空样式与可能未使用的样式条目。
  - 建议：按文件清理，保持样式表精简。

---

## 建议的修复清单（可拆分为多 PR）

- 全局替换
  - [ ] `app/*` 屏幕将 `react-native` 的 `Text` 替换为 `@ui/Text` 并应用 `variant+color`。
  - [ ] 将 `ActivityIndicator` 颜色与 loading 反馈色改为 `theme.colors.text.inverse` 或新增 `utility.activityIndicator`。
  - [ ] 将硬编码 `#000/#FFF`、阴影等替换为 `theme.colors` 与 `theme.elevationPresets`。

- Token 化与消除魔法数
  - [ ] 统一 `fontSize/lineHeight/fontWeight`：改为 `theme.typography.*` 或 `theme.fontSize/* + theme.fontWeight/*`。
  - [ ] 统一 `padding/margin/gap`：改为 `theme.spacing` 或 `theme.spacingGroups`。
  - [ ] 统一 `borderRadius/尺寸`：改为 `theme.radius(*/presets)` 与 `theme.sizing`。

- 组件与容器沉淀
  - [ ] 创建并推广 `@ui/SectionHeader`、`@ui/Header`、`@ui/Card` 的标准用法，替换 `settings` 与 `task-list` 中重复结构。
  - [ ] `BottomSheet`：根据 `ScreenSize` 设定 `snapPoints` 的响应式策略；统一 header/footer 样式到 `@ui/Sheet`。

- 响应式适配
  - [ ] `app/*` 页面根使用 `ResponsiveContainer`（`padding=centered`）。
  - [ ] 列表底部按钮区与 FAB 在 `wide` 模式调整尺寸与边距（参考 `theme.sizing.fab` 与 `useResponsiveSpacing`）。

- 状态栏与暗色模式
  - [ ] 基于 `theme.isDark` 设置 `StatusBar` 的 `style` 与背景/前景对比度。

- 清理与一致化
  - [ ] 移除空样式条目与未使用样式。
  - [ ] 为 Android 通知 `lightColor` 定义语义 token 并在 `notificationService` 中引用。

---

## 参考文件与证据

- 主题与 Provider
  - `lib/theme/index.ts`（tokens 汇总与 `createTheme`）
  - `lib/theme/ThemeProvider.tsx`（系统/持久化主题）
  - `lib/theme/{colors,spacing,typography,elevation,responsive,sizing}.ts`

- 存在问题的典型位置
  - `app/auth.tsx`（硬编码颜色、阴影、字号/圆角/间距魔法数）
  - `app/task-list.tsx`（FAB 自定义阴影、部分空样式、`Text` 未走 `@ui`）
  - `app/settings.tsx`（页面容器与分节复用场景明显、`Text` 未走 `@ui`）
  - `components/TaskDetailSheet.tsx`（局部魔法数）
  - `components/DateTimeButton.tsx`（局部魔法数）
  - `features/notify/notificationService.ts`（通知通道颜色硬编码）

---

如需，我可以按上述清单分批提交编辑，保证每步改动可测且不破坏现有布局与交互。


