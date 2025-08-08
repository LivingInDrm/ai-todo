以下测试用例覆盖了 MVP 所有功能模块与关键边界场景，命名采用 `模块-序号-用例名` 格式，便于后续脚本映射。每条用例均包含**前置条件 / 操作步骤 / 预期结果**三要素。

---

## 一、任务生命周期（Task CRUD）

### 任务创建

* **TC-Task-01-正常创建** ✅ `tests/integration/task-crud.test.ts`

  * **前置条件**：应用已登录并位于任一视图
  * **步骤**

    1. 点击右下 “＋”
    2. 在标题输入框输入“写日报”
    3. 关闭 Bottom Sheet
  * **预期结果**

    * “写日报”立即出现在当前视图顶端
    * 本地 SQLite 存在对应记录，字段 `pending=0`
    * 操作耗时 ≤ 100 ms

* **TC-Task-02-空标题放弃** ✅ `tests/integration/task-crud.test.ts`

  * **前置条件**：同上
  * **步骤**

    1. 点击右下 “＋”
    2. 不输入任何内容，直接关闭 Bottom Sheet
  * **预期结果**

    * 列表无新增项
    * 数据库不产生空记录

### 查看与编辑

* **TC-Task-03-标题编辑即时保存** ✅ `tests/integration/task-crud.test.ts`

  * **前置条件**：已有任务“写日报”
  * **步骤**

    1. 点选“写日报”
    2. 在 Bottom Sheet 将标题改为“写日报（市场部）”
    3. 上滑关闭
  * **预期结果**

    * 列表实时显示新标题
    * `updated_ts` 更新；Supabase Realtime 推送到其他设备

### 完成 / 恢复

* **TC-Task-04-右滑完成** ✅ `tests/integration/task-crud.test.ts`

  * **步骤**：右滑“写日报（市场部）”到约 30 % 后松手
  * **预期结果**

    * `status` 由 0 变 1，任务移动至 Done 视图
    * 标题置灰并加删除线，本地通知取消

* **TC-Task-05-右滑恢复** ✅ `tests/integration/task-crud.test.ts`

  * **步骤**：在 Done 视图右滑同一任务
  * **预期结果**

    * `status` 由 1 变 0，任务回到对应视图
    * 删除线消失，若 `due_ts` 仍有效则恢复提醒

### 延后 / 置顶 / 删除

* **TC-Task-06-快捷延后到明天** ✅ `tests/integration/task-crud.test.ts`

  * **步骤**

    1. 左滑任务 → 点击“⋯” → 选择“明天”
  * **预期结果**

    * `due_ts` 更新为次日 09:00
    * 任务在 Focus/Backlog 中重新排序

* **TC-Task-07-自定义日期晚于 8 天** ✅ `tests/integration/task-crud.test.ts`

  * **步骤**

    1. 左滑 → “⋯” → 自定义日期设为当前日期+10 天
  * **预期结果**

    * 任务移入 Backlog
    * 列表按 `created_ts ↓` 重新排序

* **TC-Task-08-Focus 置顶** ✅ `tests/integration/task-crud.test.ts`

  * **前置条件**：当前视图为 Focus
  * **步骤**：左滑 → “⋯” → 置顶
  * **预期结果**：任务置于 Focus 首行；再次置顶无位置变化

* **TC-Task-09-删除并撤销** ✅ `tests/integration/task-crud.test.ts`

  * **步骤**

    1. 左滑 → “⋯” → 删除
    2. 观察 Snackbar，点击“撤销” 按钮（3 s 内）
  * **预期结果**

    * 任务先被移除，再因撤销回到原位置
    * 数据库事务完整回滚，`deleted` 不可见

---

## 二、三视图与排序

* **TC-View-01-Focus 排序** ✅ `tests/integration/views-sorting.test.ts`

  * **步骤**：确保 Focus 含多条带日期的任务，拉列表刷新
  * **预期结果**：任务按 `due_ts ↑` 从近到远排列

* **TC-View-02-Backlog 过滤** ✅ `tests/integration/views-sorting.test.ts`

  * **步骤**：新建无日期任务“读书”
  * **预期结果**：任务自动进入 Backlog；列表按 `created_ts ↓` 排序

* **TC-View-03-Done 30 天清理** ✅ `tests/integration/views-sorting.test.ts`

  * **步骤**：将系统日期模拟前进 31 天，重启 App
  * **预期结果**：`completed_ts > 30 天` 的记录被清理

---

## 三、语音输入流程

### 正常路径

* **TC-Voice-01-单句多任务** ✅ `tests/integration/voice-input.test.ts`

  * **前置条件**：网络正常，语音按钮可用
  * **步骤**

    1. 长按 🎤 说“明天九点写周报，下午三点开会”
    2. 松手等待解析
  * **预期结果**

    * Draft 区域出现 2 条草稿，默认勾选
    * 草稿行动作图标均为 ➕ 蓝色

* **TC-Voice-02-批量确认** ✅ `tests/integration/voice-input.test.ts`

  * **步骤**

    1. 点击底部浮条“确认”
  * **预期结果**

    * 草稿转正式任务；浮条与 Draft 区域淡出
    * Snackbar 显示“已添加 2 项”并可撤销

### 边界与异常

* **TC-Voice-03-草稿超出 10 条** ✅ `tests/integration/voice-input.test.ts`

  * **步骤**：连续语音输入 12 条待办
  * **预期结果**

    * 仅前 10 条进入 Draft；Toast 提示“仅保存前 10 条”

* **TC-Voice-04-解析失败** ✅ `tests/integration/voice-input.test.ts`

  * **步骤**：说“呜啦啦啦” 等无效语句
  * **预期结果**：Toast 提示“暂未识别任务”，Draft 不出现

* **TC-Voice-05-离线模式** ✅ `tests/integration/voice-input.test.ts`

  * **前置条件**：断网
  * **步骤**：尝试长按 🎤
  * **预期结果**：语音按钮置灰并提示“离线模式暂不支持语音”

---

## 四、本地提醒与通知

* **TC-Notify-01-30 分钟前推送** ❌ (功能未实现)

  * **步骤**

    1. 新建任务，`due_ts = now()+40 min`
    2. 等待 10 min
  * **预期结果**：系统收到本地通知；点击通知进入任务详情

* **TC-Notify-02-完成后取消提醒** ❌ (功能未实现)

  * **步骤**：在提醒触发前右滑完成该任务
  * **预期结果**：原定通知不再弹出

---

## 五、云同步 & 离线队列

* **TC-Sync-01-实时下拉覆盖** ❌ (功能未实现)

  * **步骤**

    1. 设备 A 修改任务标题为“写日报 v2”
    2. 设备 B 下拉同步
  * **预期结果**：设备 B 列表立即显示“写日报 v2”

* **TC-Sync-02-离线写入后自动 flush** ❌ (功能未实现)

  * **前置条件**：关闭网络
  * **步骤**

    1. 新建任务“离线任务”
    2. 恢复网络
  * **预期结果**：任务写入 Supabase；离线队列清空，无冲突

---

## 六、设置模块

* **TC-Settings-01-注册与登录** ❌ (功能未实现)

  * **步骤**：首次打开应用 → 通过邮箱注册 → 验证邮件 → 登录
  * **预期结果**：成功进入主界面，Supabase `auth.uid()` 与本地 SecureStore 均写入

* **TC-Settings-02-语言切换** ❌ (功能未实现)

  * **步骤**：设置页切换至 English
  * **预期结果**：所有静态文案变为英文，任务数据不受影响

---

## 七、底部弹层行为

* **TC-Sheet-01-debounce 保存** ✅ `tests/integration/sheet-undo.test.ts`
  * **步骤**

    1. 在 Bottom Sheet 连续快速修改标题 3 次
    2. 400 ms 内关闭
  * **预期结果**：仅最后一次修改写入数据库

* **TC-Sheet-02-关闭手势 flush** ✅ `tests/integration/sheet-undo.test.ts`

  * **步骤**：下滑关闭时观察
  * **预期结果**：未保存字段被强制写入；列表刷新一致

---

## 八、撤销机制

* **TC-Undo-01-批量操作撤销** ✅ `tests/integration/sheet-undo.test.ts`

  * **步骤**

    1. 勾选 Draft 5 条 → 确认
    2. 立即点击 Snackbar “撤销”
  * **预期结果**：5 条正式任务回滚为草稿并保持选中状态

---

## 九、性能与动效

* **TC-Perf-01-列表滚动 60 fps** ✅ `tests/performance/performance.test.ts`

  * **步骤**：Focus > 200 条任务，快速滑动
  * **预期结果**：帧率 ≥ 55 fps，无明显掉帧

* **TC-Anim-01-Draft 淡入** ✅ `tests/performance/performance.test.ts`

  * **步骤**：触发 Draft 出现
  * **预期结果**：`opacity` 与 `translateY` 动效在 200 ms 内完成，无闪烁

---

## 十、安全 & 权限

* **TC-Security-01-最小权限校验** ❌ (功能未实现)

  * **步骤**：使用用户 A 登录，监听 WebSocket 数据包
  * **预期结果**：仅收到 `user_id = A` 的行级事件

* **TC-Security-02-OpenAI Key 不泄露** ❌ (功能未实现)

  * **步骤**：逆向抓包客户端 API 调用
  * **预期结果**：请求使用后端签名 Token，未暴露实际 OpenAI Key

---
