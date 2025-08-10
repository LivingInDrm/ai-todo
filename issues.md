### 样式与主题体系审查问题清单（AI Todo）

以下问题基于对代码库实际实现的全面检查，按优先级与类别归纳，并尽量提供精确到文件的示例与可执行的整改建议。勾选框用于追踪整改进度。

---

## 1. 全局一致性

- [ ] 强依赖硬编码颜色，未通过主题 token 获取（影响暗色模式与品牌切换）
  - 现象：大量 `#FFF/#fff/#000/#007AFF/#8E8E93/#FF3B30` 等直接出现。
  - 示例：
    - `app/auth.tsx` 多处（如 381 行、396–406 行、457–475 行、481–512 行）。
    - `components/TaskCell.tsx`（139–156、162、168、172–191、200–221 行）。
    - `components/BottomSheet.tsx`（107–142 行）。
    - `components/TaskTabs.tsx`（78、94–132 行）。
    - `app/settings.tsx`（183–327 行）。
    - `app/index.tsx`（32、42 行）。
  - 建议：
    - 全量替换为 `theme.colors.*` 与 `theme.elevationPresets.*`，并对照 `lib/theme/colors.ts` 完整映射。
    - 统一大小写（建议全部大写 HEX）。

- [ ] 间距、字号、圆角硬编码，未统一使用 token
  - 现象：`paddingHorizontal: 16`, `marginBottom: 24`, `borderRadius: 8`, `fontSize: 14/16/32` 等。
  - token 已提供：`lib/theme/spacing.ts`, `lib/theme/typography.ts`, `lib/theme/radius.ts`。
  - 建议：
    - 间距全面替换为 `theme.spacing.*` 或 `theme.spacingGroups.*`。
    - 字体统一使用 `theme.typography.*` 或 `theme.fontSize/* fontWeight`。
    - 圆角统一使用 `theme.radiusPresets.*` 或 `theme.radius.*`。

- [ ] 阴影与海拔样式重复手写，未使用统一 elevation 体系
  - 现象：多处 `shadowColor: '#000'`/`elevation: 2` 直接写死。
  - token 已提供：`lib/theme/elevation.ts` 的 `elevationPresets.*`。
  - 建议：统一改为 `...theme.elevationPresets.card/button/sheet/snackbar`。

- [ ] StatusBar 风格与主题未绑定
  - 现象：`StatusBar style="dark"`（如 `app/task-list.tsx`, `app/settings.tsx`）。
  - 建议：新增 `ThemedStatusBar` 组件，基于 `useTheme` 的 `actualColorScheme` 自动设定亮/暗样式。

---

## 2. 架构与组织

- [ ] 已有主题与 UI 基础组件，但页面/业务组件未系统接入
  - 现象：`components/ui/` 下的 `Button/Text/Card/Sheet/Badge/ResponsiveContainer` 已接入主题；但 `app/` 与部分 `components/` 仍使用自建 `StyleSheet` 与硬编码。
  - 影响：主题切换、统一性与可维护性被削弱。
  - 建议：
    - 为页面常用元素补齐主题化基础组件：`Input`、`Divider`、`HeaderBar`、`ListItem`、`IconButton`、`FormField`。
    - 制定“禁止直接从页面使用硬编码样式”的 lint 规则与 code review 清单。

- [ ] 颜色、间距、字体、断点虽集中管理，但响应式工具基本未使用
  - 现象：`lib/theme/responsive.ts` 定义了 `breakpoints/useResponsive*`，但在 `app/` 与大部分 `components/` 中未被采用。
  - 建议：
    - 对屏幕边距/容器最大宽度/字号倍率采用 `ResponsiveContainer` 与 `useResponsive*` 统一接入。

---

## 3. 可维护性

- [ ] 按钮与输入等基础样式在页面内重复实现
  - 现象：`app/auth.tsx` 自建 `button/primaryButton/secondaryButton`，与 `components/ui/Button.tsx` 重复。
  - 建议：
    - 用 `components/ui/Button` 替换页面内按钮。
    - 新增 `components/ui/Input` 并全量替换 `TextInput` 的边框/高度/内边距等重复样式。

- [ ] 重复的“卡片/分段控制/列表项”样式可抽象为复用组件
  - 示例：`authModeSelector`（`app/auth.tsx` 405–435 行）可沉淀为 `SegmentedControl`。
  - 建议：新增 `SegmentedControl`, `ListItem`, `SectionCard` 等复用组件，内部使用 token。

- [ ] 魔法数值（magic number）较多，缺乏语义化
  - 示例：
    - `components/TaskCell.tsx` 中 `renderRightActions` 动画位移使用固定 `192`，而按钮宽度为 `80`，与手势阈值（`0.3 * 屏宽`）语义不一致。
    - 各处 `16/24/32/48` 等应改为 `theme.spacing.*`，`8/12/16` 圆角应改为 `theme.radius.*`。
  - 建议：
    - 对动画与阈值统一以 `spacing` 或基于元素宽度/屏宽的计算，避免写死。

---

## 4. 可扩展性

- [ ] 多主题支持被硬编码样式破坏
  - 现象：页面与业务组件硬编码颜色，导致暗色模式与未来品牌主题难以扩展。
  - 建议：
    - 完成“硬编码 → token” 的 codemod（可编写脚本基于 HEX→语义色表映射自动替换，再人工复核）。

- [ ] 响应式与不同设备自适应未系统接入
  - 现象：`lib/theme/responsive.ts` 已有断点/密度/字体缩放支持，但落地面少。
  - 建议：
    - 布局外边距、内容最大宽度、字号倍率以 `ResponsiveContainer`/`useResponsive*` 统一接入，尤其是平板宽屏适配。

- [ ] 新增组件风格一致性缺少约束
  - 建议：
    - 补充样式规范文档：命名规范（颜色/间距/圆角/字体）、状态（hover/press/disabled/focus）、可访问性对比度与触控热区。
    - 引入 Storybook 或示例屏，集中回归主题一致性。

---

## 5. 性能

- [ ] 手写阴影在 Android 与 iOS 存在差异与潜在过度绘制
  - 建议：统一使用 `elevationPresets`，避免重复定义 `shadow*` 与 `elevation`。

- [ ] 局部存在可合并的内联 style
  - 现象：部分组合 style 每次 render 生成新对象。
  - 建议：不涉及动态值的样式进入 `StyleSheet.create`；主题依赖的样式通过基础组件承载，减少页面层重复计算。

- [ ] 未使用或冗余样式排查（需工具化）
  - 建议：在 CI 接入静态检查脚本，标记未引用的 StyleSheet key；并启用 ESLint 规则限制直接硬编码 HEX。

---

## 重点文件与建议替换清单

- [ ] `app/auth.tsx`
  - 颜色：全部替换为 `theme.colors.*`；按钮使用 `components/ui/Button`；新增 `components/ui/Input` 后替换输入框样式。
  - 分段控制：抽象为 `SegmentedControl` 复用组件。

- [ ] `components/TaskCell.tsx`
  - 颜色/间距/圆角：替换为 token；使用 `theme.typography` 管理字号/行高。
  - 动画位移/阈值：移除 `192` 等魔法数，改为基于按钮宽度与屏宽的统一计算。

- [ ] `components/BottomSheet.tsx`、`components/TaskTabs.tsx`、`components/FloatingBar.tsx`、`components/DateTimeButton.tsx`、`components/Snackbar.tsx`
  - 统一使用 `theme.colors.*`、`theme.spacing.*`、`theme.radius.*`、`theme.elevationPresets.*`。

- [ ] `app/settings.tsx` / `app/task-list.tsx` / `app/index.tsx`
  - 颜色替换为 token；`StatusBar` 改用 `ThemedStatusBar`。

---

## 命名与使用规范（建议落库）

- **颜色**：仅使用 `theme.colors.{bg|text|border|accent|feedback|overlay}` 的语义名，不直接使用 HEX。
- **间距**：使用 `theme.spacing` 与 `theme.spacingGroups`；页面禁止出现裸数字（除极少数计算场景）。
- **字号/字重/行高**：使用 `theme.typography.*`，特殊场景用 `theme.fontSize/* fontWeight`。
- **圆角**：优先 `theme.radiusPresets`，其次 `theme.radius`。
- **阴影**：仅用 `theme.elevationPresets`。
- **响应式**：容器用 `ResponsiveContainer`，需要自适配的尺寸使用 `useResponsive*`。

---

## 分阶段整改计划（建议）

1) 基础接入（P0）
   - [ ] 新增 `ThemedStatusBar` 并全量替换。
   - [ ] 新增 `components/ui/Input`，用在 `app/auth.tsx`、表单/搜索等。
   - [ ] 将 `app/auth.tsx` 中按钮替换为 `components/ui/Button`。

2) Token 替换（P0）
   - [ ] 以脚本将常见 HEX 批量映射至 `theme.colors.*`，覆盖 `app/` 与 `components/` 下的业务组件；逐文件人工复核。

3) 复用组件沉淀（P1）
   - [ ] 新增 `SegmentedControl`、`ListItem`、`SectionCard`、`IconButton`，替换页面内重复样式块。

4) 响应式与平板适配（P2）
   - [ ] 接入 `ResponsiveContainer` 与 `useResponsive*`，统一屏幕边距与字号倍率；平板最大内容宽度限制。

5) 规则与自动化（P2）
   - [ ] ESLint 规则：禁止直接使用 HEX/rgba/`shadow*`/`elevation`，必须走 token；新增风格校验 CI。

---

## 验收标准（Definition of Done）

- [ ] 全局无直接 HEX/rgba 字面量（除 mock/测试/第三方 API 必需参数）。
- [ ] `app/` 与业务组件中无自建按钮/输入等基础样式；统一用 `components/ui/*`。
- [ ] 暗色主题开关后，无对比度/可读性问题；截图对比通过。
- [ ] 平板与小屏在 `ResponsiveContainer` 下布局与排版稳定。
- [ ] 影子/圆角/间距/字号均来源于 token，且通过 ESLint/CI 规则校验。


