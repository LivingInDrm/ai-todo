## AI-Todo 设计一致性问题清单（对照 design.md）

本清单记录当前代码与 `design.md` 的偏差与潜在风险，按优先级分组。每项包含：现状、影响、涉及位置与建议修复。

### 修复状态汇总
✅ **所有问题已修复** (2025-08-08)
- 高优先级: 1/1 已修复
- 中优先级: 5/5 已修复
- 所有测试通过: 60/60 tests passed

---

### 高优先级

#### 1) ✅ [已修复] 撤销逻辑会导致数据丢失，未按"逆转事务"实现
- 现状：批量确认后将新建任务 ID 与受影响的目标任务 ID 一起记录到 `lastConfirmedIds`。触发撤销时，统一执行“删除这些任务”。对 update/complete/delete 并未恢复原状态，而是把目标任务删掉。
- 影响：用户点击“撤销”可能把已有任务删除，产生不可逆的数据丢失；与设计中“撤销在 3 s 内逆转同一事务”冲突。
- 位置：`features/draft/draftStore.ts` → `confirmSelectedDrafts` 与 `undoLastConfirmation`。
- 建议：将每次确认的“新增/更新/完成/删除”细分记录为变更日志（或快照），撤销时按类型精确回滚：
  - add → 删除新建任务；
  - update → 用快照还原 `title/dueTs/urgent`；
  - complete → 恢复为 Active，并清空 `completedTs`；
  - delete → 恢复被删除任务（考虑用软删标志替代物理删除，或提供回收站）。


### 中优先级

#### 2) ✅ [已修复] Backlog 排序包含"置顶优先"，与设计不符
- 现状：Backlog 列表排序也优先 `pinnedAt`，随后按 `createdTs ↓`。
- 影响：Backlog 中出现“置顶优先”，而设计强调“置顶仅在 Focus 生效”。
- 位置：`features/task/taskStore.ts` → `getBacklogTasks` 排序逻辑。
- 建议：移除 Backlog 的 `pinnedAt` 排序，仅保留 `createdTs ↓`；置顶逻辑仅用于 Focus。

#### 3) ✅ [已修复] 详情卡片删除与"关闭强制保存"存在竞态
- 现状：详情卡片内点击“删除”后调用 `dismiss()`，底层 `onClose` 会无条件执行 `handleSave()`，可能对已删除任务再次发起更新。
- 影响：产生冗余更新与潜在异常，影响稳定性与日志质量。
- 位置：`components/TaskDetailSheet.tsx`（删除按钮回调与 `onClose`/`handleSave`）。
- 建议：删除时设置 `isDeleting` 标志，`onClose` 判断后跳过保存；或在 `dismiss` 时提供一个不触发保存的关闭分支。

#### 4) ✅ [已修复] 右滑触发阈值使用像素而非"≈30%"比例
- 现状：`Swipeable` 使用 `leftThreshold/rightThreshold={30}`（像素）。
- 影响：不同设备宽度下触发距离不一致，与设计“≈30%”不符。
- 位置：`components/TaskCell.tsx`。
- 建议：基于行宽计算阈值（约 0.3×cell 宽度）；或使用支持百分比阈值的手势实现。

#### 5) ✅ [已修复] "仅日期默认 09:00"在当前路径不生效
- 现状：详情卡片使用 `mode="datetime"`；`DateTimeButton` 仅在 `mode="date"` 分支把 00:00 调整为 09:00。
- 影响：用户只想设定日期的场景下不会自动补 09:00，偏离设计。
- 位置：`components/TaskDetailSheet.tsx`（传入 `mode`）、`components/DateTimeButton.tsx`（默认 09:00 逻辑）。
- 建议：提供“仅日期”入口（如 MoreActionSheet 的“自定义日期”进入 `date` 模式）；或在 `datetime` 下检测用户未改动时间时也补 09:00。

#### 6) ✅ [已修复] 类型文件重复，可能引发跨平台构建问题
- 现状：存在大小写不同但内容重复的 `lib/types.ts` 与 `Lib/types.ts`。
- 影响：macOS（大小写不敏感）与 CI/Linux（大小写敏感）行为不一致，易出现类型分裂/引用混乱。
- 位置：`lib/types.ts` 与 `Lib/types.ts`。
- 建议：统一仅保留 `lib/types.ts`，删除重复文件并全局修正引用。

---


## 参考位置（便于定位）

- 撤销相关：`features/draft/draftStore.ts` → `confirmSelectedDrafts`、`undoLastConfirmation`
- OpenAI Key：`services/openai.ts`
- 排序逻辑：`features/task/taskStore.ts` → `getBacklogTasks`/`getFocusTasks`
- 详情保存/删除：`components/TaskDetailSheet.tsx`、`components/BottomSheet.tsx`
- 滑动阈值：`components/TaskCell.tsx`
- 日期按钮：`components/DateTimeButton.tsx`、`components/TaskDetailSheet.tsx`
- 类型定义：`lib/types.ts` 与 `Lib/types.ts`

---