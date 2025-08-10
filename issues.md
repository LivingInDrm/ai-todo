### 样式体系审查问题清单（UI/样式）

本清单聚焦全局一致性、架构与组织、可维护性、可扩展性、性能五个维度，标注典型文件位置与改进建议。优先级：P0（立即）、P1（近期）、P2（跟进）。

---

## 1) 全局一致性

- [P0] 颜色硬编码与主题 token 混用，暗色模式不一致
  - 现象：大量 `#FFF/#fff/#000/#007AFF/#8E8E93` 等直接写入页面样式，绕过 `theme.colors.*`
  - 典型：
    - `app/auth.tsx` 多处硬编码背景、文本、边框与按钮色（如 `#FFF`, `#000`, `#666`, `#007AFF`, `#E0E0E0`, `#FF3B30` 等）
    - `app/task-list.tsx` 列表容器、草稿区、操作按钮与图标颜色大量硬编码（如 `#fff`, `#F0F8FF`, `#007AFF`, `#34C759` 等）
    - `app/index.tsx` 活动指示器与容器背景（`#007AFF`, `#FFF`）
    - `app/settings.tsx` 页头与卡片色（`#fff`, `#f5f5f5`, `#e0e0e0`, `#333`, `#999`, `#007AFF`）
    - `components/TaskCell.tsx` 动作文本色 `'#fff'`
  - 影响：暗色模式下对比度/可读性不佳；主题切换易失控
  - 建议：统一替换为 `theme.colors` 语义色（文本、背景、边框、反馈、强调），并清理所有硬编码

- [P1] 字体、间距数值直接写死，未统一映射到 token
  - 现象：`fontSize: 12/14/16/20/24/32/64`、`padding/margin: 4/6/8/12/16/20/24/32/40/100` 等广泛存在
  - 典型：`app/auth.tsx`, `app/task-list.tsx`, `components/*` 多处 `StyleSheet.create` 与内联样式
  - 建议：
    - 字体尺寸 → `theme.typography` 或 `theme.fontSize` 语义化使用（如 `variant="caption/body/heading/title"`）
    - 间距 → `theme.spacing` 与 `theme.spacingGroups`；缺口场景补充 `spacingGroups`

- [P1] 圆角、阴影/elevation 使用不统一
  - 现象：圆角常见 `8/12/28`，与 `theme.radius`/`radiusPresets` 混用；阴影有的用 `theme.elevationPresets`，有的自定义
  - 典型：`app/settings.tsx` 卡片圆角/描边、`app/task-list.tsx` 新增按钮阴影
  - 建议：统一使用 `theme.radiusPresets.*` 与 `theme.elevationPresets.*` 做语义映射

- [P2] iOS 阴影 `shadowColor: '#000'` 未与主题抽象关联
  - 典型：`lib/theme/elevation.ts` iOS 预设均固定 `#000`
  - 建议：允许通过 token 调整（如 `colors.overlay/backdrop/shadow`），或注释说明设计意图

## 2) 架构与组织

- [P0] 存在“主题体系完整但页面未接入”的断层
  - 现象：`lib/theme/*` 与 `components/ui/*` 体系完善，但页面层（`app/*`）大量绕过基础 UI 与 token
  - 影响：风格不一致、难以做全局换肤/改版
  - 建议：
    - 页层优先使用 `@ui` 基础组件（`Text/Button/Card/Sheet/ResponsiveContainer/Badge`）
    - 新建必要的 `AppBar/ListItem/FormField` 等通用组件，沉淀常用样式

- [P1] Token 覆盖面不足：缺“尺寸/组件状态”类 token
  - 现象：图标/控件尺寸（如 36、56）、徽标/把手宽高等常以魔法数字出现
  - 建议：新增 `sizing`（控件/图标/把手/圆点等尺寸）与 `opacity`（禁用/悬浮）token，补齐 `spacingGroups`

- [P1] Elevation 直接量与语义预设并存
  - 现象：既有 `theme.elevationPresets.card`，也有直接用 `theme.elevation.s`
  - 建议：页面层仅使用语义预设；基础组件内部可用原子刻度

## 3) 可维护性

- [P0] 重复样式可抽取为通用组件或共享样式
  - 例：按钮（主/次/危险态）、卡片、列表项头尾、分隔线、表单输入框
  - 建议：统一由 `@ui` 组件承载；`auth`/`settings` 当前自定义按钮应替换为 `@ui/Button`

- [P1] 大量魔法数值（magic numbers）
  - 例：
    - 底部安全区 `paddingBottom: 34`（`components/FloatingBar.tsx`）
    - 把手宽高 `36x4`（`components/ui/Sheet.tsx`）
    - 复选框 `22x22`、勾选字体 `14`（`components/TaskCell.tsx`）
    - 新建按钮 `56x56`、圆角 `28`、阴影参数（`app/task-list.tsx`）
  - 建议：
    - 使用 `useSafeAreaInsets()` 动态适配底部留白
    - 尺寸统一纳入 `sizing` token 或组件内部常量

- [P1] 颜色/状态表达缺少语义别名
  - 例：草稿区 `#F0F8FF`、状态图标用纯色常量
  - 建议：用 `colors.accent.* / feedback.* / bg.subtle` 组合表达

## 4) 可扩展性

- [P0] 暗色模式覆盖不全
  - 现象：页面硬编码浅色导致夜间模式对比不足（如 `app/index.tsx`, `app/auth.tsx`, `app/task-list.tsx`, `app/settings.tsx`）
  - 建议：全面接入 `ThemeProvider` 的 `theme.colors` 与 `@ui/Text` 颜色语义

- [P1] 响应式与无障碍字体比例未统一接入
  - 现象：已有 `useResponsive*` 与字体比例工具，但页面与部分组件未使用
  - 建议：关键布局与大字号文本接入 `useResponsiveSpacing / useResponsiveFontSize`

- [P2] 多品牌/皮肤能力预留
  - 现状：`colors.accent.primary/secondary` 已具备基础；
  - 建议：预留品牌主题切换入口与 token 扩展规范

## 5) 性能

- [P2] 样式对象在渲染期频繁拼接
  - 现象：列表项/大量节点内联样式依赖 `theme` 拼接，虽常见，但在长列表可能带来额外重渲染
  - 建议：
    - 将静态部分落入 `StyleSheet.create`，动态部分尽量减少对象创建（或用 `useMemo`/派生样式）
    - 列表项尽量保持样式稳定，避免不必要的 `props` 变化

- [P2] 未使用样式的可能性（需二次扫描）
  - 建议：CI 增加未使用样式/未引用色值扫描（lint/脚本）

---

## 重点文件与样例位置（节选）

- `app/auth.tsx`：背景/文字/边框/按钮大量硬编码；应改用 `@ui` 与 `theme`
- `app/task-list.tsx`：列表容器、草稿区、操作按钮、图标色与阴影硬编码
- `app/index.tsx`：指示器颜色、容器背景硬编码
- `app/settings.tsx`：页头、卡片、分割线、文案色硬编码
- `components/TaskCell.tsx`：动作文本色 `'#fff'` 应为 `theme.colors.text.inverse`
- `components/FloatingBar.tsx`：底部留白魔法数值，应使用安全区 inset
- `components/ui/*` 与 `lib/theme/*`：体系完整，建议作为页层唯一入口

---

## 建议的改造路线（可执行）

- [P0] 页面改造（优先保证暗色模式与一致性）
  - `app/index.tsx`, `app/auth.tsx`, `app/task-list.tsx`, `app/settings.tsx`
  - 替换：颜色/字体/间距 → `theme`；`TouchableOpacity` → `@ui/Button`；文本 → `@ui/Text`
  - 分隔线/卡片 → `@ui/Card` 与 `theme.colors.border.*`

- [P1] Token 扩展与通用组件补齐
  - 新增 `sizing`、`opacity` token；补充 `spacingGroups` 常用组合
  - 新增 `AppBar/ListItem/FormField/Divider` 等基础组件

- [P1] 安全区与响应式适配
  - `FloatingBar` 等底部组件接入 `useSafeAreaInsets()`
  - 大字号/平板场景接入 `useResponsive*`

- [P2] 工具与守护
  - 引入 ESLint 规则/脚本：禁止硬编码颜色/字体/间距；建议/自动修复为 token
  - 在 PR 检查中加入暗色截图对比或视觉基准测试

---

## 验收标准

- 暗色/浅色主题下页面与组件视觉一致，文本对比度达标
- 颜色/字体/间距/圆角/阴影全部源自 `theme` 或 `@ui`
- 页面层不再出现 `#xxxxxx`、`fontSize: number`、`padding/margin: number` 的硬编码
- 列表与弹层样式稳定，无明显抖动与重排

---

注：`lib/theme`、`components/ui` 当前设计良好，问题主要集中在页面层未全面接入主题体系与通用组件。


