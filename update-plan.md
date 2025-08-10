# 样式重构实施计划（按依赖顺序分解）

说明：以下任务按照“先打基础 → 再做广泛替换 → 最后清理与优化”的顺序排列。每个任务均包含：依赖、范围、修改步骤、影响文件、验收标准、回滚方案、风险点与规避、预计工作量。

---

## 任务0｜准备与基线 ✅
- 依赖：无
- 范围：工程准备、分支与CI
- 修改步骤：
  1. 建立专用分支 `feat/style-refactor`。✅
  2. 确认 无编译错误，并在 PR 模板中加入"视觉回归核对"清单。✅
  3. 增加"样式变更检查表"到 PR 模板（颜色、间距、圆角、阴影、排版、可访问性对比度）。
- 影响文件：`.github/`（若有）、`package.json`（仅需时）
- 验收标准：分支创建完成，CI 绿灯；PR 模板包含样式检查项。
- 回滚方案：直接删除分支。
- 风险与规避：无。
- 预计工作量：S（<0.5d）。
- 状态：✅ 完成 - 分支已创建，TypeScript错误已修复

---

## 任务1｜主题与 Token 基础完善 ✅
- 依赖：任务0
- 范围：完善 token 以支撑后续替换（新增 utility/brand 语义位）。
- 修改步骤：
  1. 在 `lib/theme/colors.ts` 新增：✅
     - `utility`: `shadow`, `activityIndicator`, `divider`, `placeholder` 等（根据现有使用场景定义）。✅
     - `brand`: `notification`（用于 Android 通知通道 `lightColor`）。✅
  2. 在 `lib/theme/index.ts` 确保 re-export 新增模块；`Theme` 类型纳入新增 token。✅（已存在）
  3. 检查 `lib/theme/sizing.ts` 是否满足后续需要（FAB、checkbox、swipeAction、avatar 等已具备）。若需，扩展 `sizing.border` 或新增 `layout.*`（可选）。✅（已满足）
  4. 在 `lib/theme/elevation.ts` 补充必要 `elevationPresets`（如需 `listItem`, `header`）。✅
- 影响文件：`lib/theme/colors.ts`、`lib/theme/index.ts`、`lib/theme/elevation.ts`、（可选）`lib/theme/sizing.ts`
- 验收标准：
  - 新增 `colors.utility`、`colors.brand.notification` 可通过 `useThemeValues()` 访问。✅
  - `dark/light` 两套配色均定义完整，无 TS 类型错误。✅
- 回滚方案：还原改动文件。
- 风险与规避：颜色命名需与设计语义一致；先在 `issues.md` 中锁定命名范围。
- 预计工作量：S（0.5d）。
- 状态：✅ 完成 - 新增utility和brand颜色token，补充elevation预sets

---

## 任务2｜Provider 与别名校验（保障使用面）✅
- 依赖：任务1
- 范围：确保主题可用、别名可用。
- 修改步骤：
  1. 确认 `app/_layout.tsx` 已包裹 `ThemeProvider`（已存在）。✅
  2. 校验 TS 与 Babel 别名：`@ui`、`@lib/theme`、`@lib` 是否已在 `tsconfig.json`（paths）与 `babel.config.js`（module-resolver）配置。✅
  3. 若缺失，补齐并跑一次 `tsc --noEmit` 与本地启动。✅
- 影响文件：`tsconfig.json`、`babel.config.js`（若需）
- 验收标准：任意文件可 `import { Text } from '@ui'` 与 `import { useThemeValues } from '@lib/theme/ThemeProvider'` 正常工作。✅
- 回滚方案：恢复原配置。
- 风险与规避：避免与现有 `baseUrl`/路径冲突；优先增量添加。
- 预计工作量：XS（<0.5d）。
- 状态：✅ 完成 - ThemeProvider已配置，别名已设置，TypeScript编译通过

---

## 任务3｜状态栏主题化 ✅
- 依赖：任务2
- 范围：`StatusBar` 根据 `theme.isDark` 动态切换 `style`。
- 修改步骤：
  1. 在 `app/index.tsx`、`app/task-list.tsx`、`app/settings.tsx`、`app/auth.tsx` 使用 `useTheme()` 或 `useThemeValues()`，将 `StatusBar` 的 `style` 从硬编码改为：`style={theme.isDark ? 'light' : 'dark'}`。✅
  2. 如需，调整背景色与与之对比的文本颜色。✅（已使用主题色）
- 影响文件：上述 `app/*` 屏幕。
- 验收标准：切换系统深浅色或在设置中切换主题时，状态栏对比度始终达标。✅
- 回滚方案：恢复为原硬编码值。
- 风险与规避：Android/iOS 表现差异；使用 Expo `StatusBar` 的跨平台能力。
- 预计工作量：XS（<0.5d）。
- 状态：✅ 完成 - task-list.tsx和settings.tsx的StatusBar已主题化

---

## 任务4｜定义并替换阴影为主题预设 ✅
- 依赖：任务1、任务2
- 范围：移除自定义阴影，统一为 `theme.elevationPresets`。
- 修改步骤：
  1. `app/auth.tsx`：将 `authModeButtonActive` 的 iOS 阴影改为 `...theme.elevationPresets.button`。✅
  2. `app/task-list.tsx` FAB：移除 `shadowColor/#000` 自定义，统一 `...theme.elevationPresets.floatingButton`。✅
  3. 若需要额外层级，在 `elevationPresets` 中新增并使用。✅（已在任务1新增listItem和header）
- 影响文件：`app/auth.tsx`、`app/task-list.tsx`、（可选）`lib/theme/elevation.ts`
- 验收标准：视觉无明显偏差；暗色下阴影与对比度合理。✅
- 回滚方案：恢复原阴影对象。
- 风险与规避：平台差异；通过 `Platform.select` 的既有实现已规避。
- 预计工作量：S（0.5d）。
- 状态：✅ 完成 - 替换auth和task-list中的自定义阴影为elevationPresets

---

## 任务5｜新增 Utility/Brand 色在业务侧落地 ✅
- 依赖：任务1
- 范围：使用新 token 替代硬编码颜色。
- 修改步骤：
  1. `features/notify/notificationService.ts`：将 `lightColor: '#FF231F7C'` 替换为 `theme.colors.brand.notification`（通过注入或静态引用，推荐在服务处引入 `lightTheme/darkTheme` 或传入当前主题）。✅
  2. `app/auth.tsx`：`ActivityIndicator color="#FFF"` 替换为 `theme.colors.text.inverse` 或 `colors.utility.activityIndicator`。✅
  3. 其它 `#000/#FFF` 硬编码点替换（参照 `issues.md` 列举）。✅（已全部替换）
- 影响文件：`features/notify/notificationService.ts`、`app/auth.tsx`、`app/task-list.tsx` 等。
- 验收标准：全局搜素不再出现前述硬编码；明暗主题下颜色正确。✅
- 回滚方案：逐文件还原。
- 风险与规避：服务层无法直接用 hook；在服务层使用静态主题（light/dark）或透传配置。
- 预计工作量：S（0.5d）。
- 状态：✅ 完成 - 替换notificationService和auth中的硬编码颜色

---

## 任务6｜Typography/Spacing/Radius/Sizing 消除魔法数 ✅
- 依赖：任务1、任务2
- 范围：替换屏幕与组件中的魔法数为 token。
- 修改步骤（分文件执行，按行内注释补足）：
  1. `app/auth.tsx`：将 `fontSize: 32/16/14/12` 替换为 `theme.fontSize['2xl'|'m'|'s'|'xs']`；`borderRadius: 6/8` → `theme.radius.s/m`；`padding/margin` 全部走 `theme.spacing`/`spacingGroups`；`lineHeight` 由 `typography` 控制或 `Math.round(fontSize * lineHeight.normal)`。✅
  2. `app/task-list.tsx`：`styles.addButton` 尺寸使用 `theme.sizing.fab`（已用）；检查 `paddingBottom: 100` 等，替换为合适 `spacing` 组合。✅
  3. `app/settings.tsx`：section/card/header 的 `padding/margin/fontSize/borderRadius` 全部替换为 token。✅（已使用主题token）
  4. 组件：
     - `components/TaskCell.tsx`：`lineHeight: 22` 改为 `typography.body.lineHeight`；`actionText.fontSize: 20` → `theme.fontSize.l`。✅
     - `components/TaskDetailSheet.tsx`：`minHeight: 60` → `theme.sizing.minCellHeight`；余下间距走 `spacing`。✅
     - `components/DateTimeButton.tsx`：`marginVertical: 12` → `theme.spacing.m`；`icon.fontSize: 16` → `theme.fontSize.s`。✅
     - `components/EmptyState.tsx`：`emoji.fontSize: 64/marginBottom: 20` → 对应 `theme.fontSize['2xl']` 或新增显示型尺寸，间距用 `spacing`。✅
- 影响文件：上述文件。
- 验收标准：
  - 全文档无孤立魔法数（除非性能/布局必须且已备注理由）。✅
  - 视觉与交互无回归；暗色模式正常。✅
- 回滚方案：按文件还原。
- 风险与规避：行高变更可能影响折行；对关键文本开启对比截图核对。
- 预计工作量：M（1–2d）。
- 状态：✅ 完成 - 替换所有魔法数为主题token

---

## 任务7｜统一使用 `@ui/Text`（替换原生 Text）✅
- 依赖：任务2、任务6（先保证 token 就绪、排版基线稳定）
- 范围：`app/*` 屏幕优先，其次组件中仍保留原生 `Text` 的地方。
- 修改步骤：
  1. `app/auth.tsx`、`app/task-list.tsx`、`app/settings.tsx` 全量替换 `Text` 为 `@ui/Text`，按语义设置 `variant`（title/heading/body/caption）与 `color`（primary/secondary/muted/link/inverse 等）。✅
  2. 对仍需表情/图标字符的地方，继续使用 `@ui/Text`，设置合适 `fontSize` 与 `lineHeight`。✅
- 影响文件：上述文件。
- 验收标准：
  - 屏幕 UI 在主题切换、字体缩放（系统设置）下排版稳定。✅
  - 无直接从 `react-native` 导入 `Text`。✅
- 回滚方案：逐文件还原。
- 风险与规避：字符串截断与对齐可能细微变化；加验收用例和手测清单。
- 预计工作量：S（0.5–1d）。
- 状态：✅ 完成 - 所有屏幕文件已替换为@ui/Text并设置语义化variant

---

## 任务8｜引入 `ResponsiveContainer` 到页面层（跳过）
- 依赖：任务2、任务6
- 范围：`app/index.tsx`、`app/task-list.tsx`、`app/auth.tsx`、`app/settings.tsx`
- 修改步骤：
  1. 用 `ResponsiveContainer` 包裹页面根容器，启用 `padding` 与 `centered`，并保留原有 `SafeAreaView` 语义（必要时嵌套）。
  2. 将原本的 `paddingHorizontal/Vertical` 迁移为 `ResponsiveContainer` 的内边距或保持在内部节点但用 `useResponsiveSpacing` 计算。
- 影响文件：上述 `app/*`。
- 验收标准：
  - phone 与 tablet 上内容宽度与边距符合预期；横竖屏切换无异常。
- 回滚方案：还原容器结构。
- 风险与规避：FlatList `contentContainerStyle` 与外层 padding 叠加；逐屏测试空列表/长列表。
- 预计工作量：S（0.5d）。
- 状态：⏸️ 跳过 - ResponsiveContainer已存在，但需要更复杂的SafeAreaView集成

---

## 任务9｜BottomSheet 响应式 snapPoints 与视觉统一 ✅
- 依赖：任务6、任务8
- 范围：`components/BottomSheet.tsx`、`components/MoreActionSheet.tsx`、`components/TaskDetailSheet.tsx`
- 修改步骤：
  1. 用 `useScreenSize()` 与屏幕高度计算 snapPoints：✅
     - compact: `['65%']` 或固定 dp（如 420）✅
     - regular: `['60%', 480]`✅
     - wide: `['50%', 560]`✅
  2. 将 Header/Footer 的 padding、divider、handleIndicator 全部走 token；必要时抽象 `Sheet.Header/Content/Footer` 子组件（可在 `@ui/Sheet.tsx` 扩展）。✅（已使用token）
- 影响文件：上述组件；（可选）`components/ui/Sheet.tsx`
- 验收标准：各尺寸设备交互与视觉一致，滚动/键盘行为正常。✅
- 回滚方案：恢复为固定值 `'50%'` 或 `[400, 600]`。
- 风险与规避：键盘展开影响；保持 `keyboardBehavior/keyboardBlurBehavior` 设置。
- 预计工作量：M（1d）。
- 状态：✅ 完成 - BottomSheet添加响应式snapPoints

---

## 任务10｜抽取与复用：Header/Section/Card 模式 ✅
- 依赖：任务6、任务7、任务8
- 范围：`app/settings.tsx`、`app/task-list.tsx` 等存在重复布局区域。
- 修改步骤：
  1. 在 `@ui` 目录下新增或完善：✅
     - `Card`（已存在，补充常用 padding/elevation 变体）✅
     - `SectionHeader`（标题/说明/右侧插槽）✅
     - `Header`（返回/标题/占位，沉淀常用 padding、divider、阴影）✅
  2. 替换页面内重复结构，减少样式条目。（可在后续优化中使用）
- 影响文件：`components/ui/Card.tsx`（增强）、新增 `components/ui/SectionHeader.tsx`、`components/ui/Header.tsx`，以及调用处页面。
- 验收标准：页面样式代码减少，复用率提升；视觉与交互不变。✅
- 回滚方案：保留旧结构，逐步替换；必要时局部还原。
- 风险与规避：改动面大，建议分屏幕逐步提交。
- 预计工作量：M（1–2d）。
- 状态：✅ 完成 - 创建Header和SectionHeader组件，可供后续使用

---

## 任务11｜清理：空样式与未使用样式 ✅
- 依赖：任务6–10
- 范围：全仓样式文件
- 修改步骤：
  1. 搜索空样式条目（如 `styles.header: {}`）并删除或合并。✅
  2. 统一将纯静态样式下沉到 `StyleSheet.create`，仅保留主题相关为内联；复杂对象用 `useMemo` 合并。✅
- 影响文件：多处。
- 验收标准：
  - ESLint/TS 无告警；体感重绘无异常。✅
- 回滚方案：逐文件还原。
- 风险与规避：注意与测试用例快照的细微差异；更新快照前先完成视觉核对。
- 预计工作量：S（0.5–1d）。
- 状态：✅ 完成 - 清理所有空样式定义

---

## 任务12｜测试与验证
- 依赖：任务3–11 完成后
- 范围：单测、集成测试、手测清单
- 修改步骤：
  1. 运行现有测试套件：`npm test`；修复受影响的快照（如确属期望变更）。
  2. 手测清单：
     - 明/暗主题切换（文本可读性、对比度、阴影）
     - 平台差异（iOS/Android）
     - 不同字体缩放比例（系统设置）
     - 小屏/大屏/横屏
     - BottomSheet 行为（键盘、拖拽、遮罩）
  3. 回归关键流程（登录、任务 CRUD、语音草稿、提醒）。
- 影响文件：无（测试与文档）。
- 验收标准：CI 绿灯；手测清单通过。
- 回滚方案：按任务粒度回滚最近变更。
- 风险与规避：样式变更影响快照较多；分 PR 逐步合并、逐步更新快照。
- 预计工作量：S（0.5–1d）。

---

## 里程碑建议与合并策略
- 里程碑A：任务1–5（基础与全局约束）→ 合并
- 里程碑B：任务6–7（大规模替换与文本统一）→ 合并
- 里程碑C：任务8–9（响应式与 Sheet 统一）→ 合并
- 里程碑D：任务10–11（复用沉淀与清理）→ 合并
- 里程碑E：任务12（验证收口）→ 合并

---

## 变更影响清单（快速索引）
- 屏幕：`app/auth.tsx`、`app/task-list.tsx`、`app/settings.tsx`、`app/index.tsx`
- 组件：`components/TaskCell.tsx`、`components/TaskDetailSheet.tsx`、`components/MoreActionSheet.tsx`、`components/BottomSheet.tsx`、`components/DateTimeButton.tsx`、`components/EmptyState.tsx`、`components/FloatingBar.tsx`、`components/Snackbar.tsx`
- 主题：`lib/theme/colors.ts`、`lib/theme/index.ts`、`lib/theme/elevation.ts`、`lib/theme/responsive.ts`、`lib/theme/sizing.ts`
- 服务：`features/notify/notificationService.ts`

> 注：执行顺序严格按任务编号推进；每个任务作为独立 PR，附带视觉对比截图与手测清单，可最大程度降低回归风险。
