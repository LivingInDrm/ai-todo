# AI-TODO 测试方案

## 1. 测试概述

### 1.1 测试目标
- 验证所有功能符合设计文档要求
- 确保应用的稳定性和可靠性
- 验证用户体验流程的流畅性
- 确保数据同步的准确性和一致性
- 验证语音输入功能的准确率和响应速度

### 1.2 测试范围
基于当前开发进度（Phase 1-5 已完成），测试将覆盖：
- ✅ 已实现功能（Phase 1-5）
- 🚧 待实现功能（Phase 6-10）的测试用例预定义

### 1.3 测试策略
- **单元测试**：针对核心业务逻辑和工具函数
- **集成测试**：验证模块间交互
- **端到端测试**：验证完整用户流程
- **性能测试**：验证响应时间和资源占用
- **兼容性测试**：iOS/Android/Web平台测试

---

## 2. 测试环境

### 2.1 开发测试环境
```bash
# 运行测试
npm test

# 运行测试覆盖率报告
npm run test:coverage

# 运行端到端测试
npm run test:e2e

# 运行特定平台测试
npm run test:ios
npm run test:android
```

### 2.2 测试设备矩阵
| 平台 | 设备/版本 | 优先级 |
|------|----------|--------|
| iOS | iPhone 14 Pro (iOS 17) | P0 |
| iOS | iPhone 12 (iOS 16) | P1 |
| Android | Pixel 7 (Android 14) | P0 |
| Android | Samsung Galaxy S23 (Android 13) | P1 |
| Web | Chrome 最新版 | P2 |

### 2.3 测试数据准备
```javascript
// 测试用户账号
const testUsers = [
  { email: 'test1@example.com', password: 'Test123!@#' },
  { email: 'test2@example.com', password: 'Test456!@#' }
];

// 测试任务数据
const testTasks = [
  { title: '测试任务1', due_ts: Date.now() + 86400000 }, // 明天
  { title: '紧急任务', urgent: true, due_ts: Date.now() },
  { title: '已完成任务', status: 1, completed_ts: Date.now() }
];
```

---

## 3. 功能测试用例

### 3.1 任务管理功能测试 ✅

#### TC001: 新建任务
```javascript
describe('新建任务', () => {
  test('通过添加按钮创建任务', async () => {
    // 1. 点击右下角 + 按钮
    // 2. 输入任务标题
    // 3. 验证任务出现在列表中
    // 4. 验证任务保存到数据库
  });

  test('创建带截止时间的任务', async () => {
    // 1. 点击 + 按钮
    // 2. 输入标题
    // 3. 点击日期按钮，选择时间
    // 4. 验证任务正确分配到 Focus/Backlog
  });

  test('创建紧急任务', async () => {
    // 1. 创建任务
    // 2. 点击紧急标记
    // 3. 验证红条显示
  });

  test('空标题任务处理', async () => {
    // 1. 打开新建任务
    // 2. 不输入标题直接关闭
    // 3. 验证任务未创建
  });
});
```

#### TC002: 任务编辑
```javascript
describe('任务编辑', () => {
  test('编辑任务标题', async () => {
    // 1. 点击现有任务
    // 2. 修改标题
    // 3. 关闭卡片
    // 4. 验证标题已更新
  });

  test('修改截止时间', async () => {
    // 1. 打开任务详情
    // 2. 修改日期时间
    // 3. 验证任务重新分配视图
  });

  test('清除截止时间', async () => {
    // 1. 打开有截止时间的任务
    // 2. 点击日期旁的 × 按钮
    // 3. 验证任务移至 Backlog
  });

  test('debounce自动保存', async () => {
    // 1. 快速连续输入
    // 2. 验证 400ms 后保存
    // 3. 验证数据库只更新一次
  });
});
```

#### TC003: 任务完成与恢复
```javascript
describe('任务状态切换', () => {
  test('右滑完成任务', async () => {
    // 1. 在 Focus/Backlog 右滑任务约30%
    // 2. 验证任务移至 Done 视图
    // 3. 验证 completed_ts 更新
  });

  test('右滑恢复任务', async () => {
    // 1. 在 Done 视图右滑任务
    // 2. 验证任务恢复到原视图
    // 3. 验证 status 更新为 0
  });

  test('完成任务后紧急标记隐藏', async () => {
    // 1. 完成一个紧急任务
    // 2. 验证红条不再显示
  });
});
```

#### TC004: 任务删除
```javascript
describe('任务删除', () => {
  test('左滑删除任务', async () => {
    // 1. 左滑任务
    // 2. 点击删除选项
    // 3. 验证任务从列表消失
    // 4. 验证数据库删除记录
  });

  test('批量删除30天前完成任务', async () => {
    // 1. 创建超过30天的完成任务
    // 2. 重启应用
    // 3. 验证自动清理
  });
});
```

#### TC005: 任务延后
```javascript
describe('任务延后', () => {
  test('延后到今晚', async () => {
    // 1. 左滑任务
    // 2. 选择"今晚"
    // 3. 验证 due_ts 更新为当天 20:00
  });

  test('延后到明天', async () => {
    // 验证更新为明天 09:00
  });

  test('延后到本周末', async () => {
    // 验证更新为周六 09:00
  });

  test('自定义延后时间', async () => {
    // 1. 选择自定义
    // 2. 选择特定日期时间
    // 3. 验证正确更新
  });
});
```

#### TC006: 任务置顶
```javascript
describe('任务置顶', () => {
  test('Focus视图置顶', async () => {
    // 1. 在 Focus 左滑任务
    // 2. 选择置顶
    // 3. 验证任务移至列表顶部
  });

  test('其他视图无置顶选项', async () => {
    // 验证 Backlog/Done 不显示置顶
  });
});
```

### 3.2 三视图系统测试 ✅

#### TC007: 视图切换与筛选
```javascript
describe('三视图系统', () => {
  test('Focus视图筛选逻辑', async () => {
    // 验证显示：
    // - 逾期任务
    // - 今日任务
    // - 未来7天内任务
    // 验证排序：due_ts 升序
  });

  test('Backlog视图筛选逻辑', async () => {
    // 验证显示：
    // - 无截止时间任务
    // - 8天后的任务
    // 验证排序：created_ts 降序
  });

  test('Done视图筛选逻辑', async () => {
    // 验证显示：
    // - 30天内完成的任务
    // 验证排序：completed_ts 降序
  });

  test('Tab切换动画', async () => {
    // 验证切换流畅性
  });

  test('空状态显示', async () => {
    const emptyTexts = {
      focus: '今天没有待办，好好休息！',
      backlog: '暂无计划任务，来点灵感吧～',
      done: '近 30 天无已完成任务'
    };
    // 验证各视图空状态文案
  });
});
```

### 3.3 手势操作测试 ✅

#### TC008: 滑动手势
```javascript
describe('手势操作', () => {
  test('右滑30%触发完成', async () => {
    // 验证滑动距离阈值
  });

  test('左滑显示更多操作', async () => {
    // 验证操作菜单显示
  });

  test('手势冲突处理', async () => {
    // 验证与列表滚动不冲突
  });

  test('手势动画流畅性', async () => {
    // 验证动画帧率 >= 60fps
  });
});
```

### 3.4 语音输入测试 🚧 (Phase 6)

#### TC009: 语音录制
```javascript
describe('语音录制', () => {
  test('长按录音', async () => {
    // 1. 长按语音按钮
    // 2. 验证录音开始
    // 3. 松开结束录音
    // 4. 验证音频上传
  });

  test('60秒录音限制', async () => {
    // 验证超时自动停止
  });

  test('录音权限处理', async () => {
    // 验证权限请求流程
  });
});
```

#### TC010: 语音解析
```javascript
describe('语音解析', () => {
  test('单任务解析', async () => {
    // 输入："明天下午3点开会"
    // 验证生成正确任务
  });

  test('批量任务解析', async () => {
    // 输入："买牛奶，明天交报告，下周五体检"
    // 验证生成3个任务
  });

  test('任务操作解析', async () => {
    // 输入："完成写周报的任务"
    // 验证识别为完成操作
  });

  test('解析失败处理', async () => {
    // 验证错误提示
  });
});
```

#### TC011: 草稿确认流程
```javascript
describe('草稿确认', () => {
  test('草稿区显示', async () => {
    // 验证草稿区UI
    // 验证折叠/展开功能
  });

  test('批量确认', async () => {
    // 1. 勾选多个草稿
    // 2. 点击确认
    // 3. 验证任务创建
  });

  test('单条右滑确认', async () => {
    // 验证右滑直接确认
  });

  test('撤销功能', async () => {
    // 1. 确认草稿
    // 2. 3秒内点击撤销
    // 3. 验证回滚
  });
});
```

### 3.5 数据同步测试 🚧 (Phase 7)

#### TC012: Supabase同步
```javascript
describe('云同步', () => {
  test('实时同步', async () => {
    // 1. 设备A创建任务
    // 2. 验证设备B实时更新
  });

  test('冲突解决', async () => {
    // 1. 离线修改同一任务
    // 2. 验证最后写入覆盖策略
  });

  test('离线队列', async () => {
    // 1. 离线创建任务
    // 2. 恢复网络
    // 3. 验证自动同步
  });

  test('同步失败重试', async () => {
    // 验证指数退避重试
  });
});
```

### 3.6 本地提醒测试 🚧 (Phase 8)

#### TC013: 推送通知
```javascript
describe('本地提醒', () => {
  test('提前30分钟提醒', async () => {
    // 验证通知时间准确
  });

  test('仅日期默认9点提醒', async () => {
    // 验证默认时间处理
  });

  test('通知权限处理', async () => {
    // 验证权限请求
  });

  test('通知点击跳转', async () => {
    // 验证打开对应任务
  });
});
```

---

## 4. 性能测试

### 4.1 响应时间测试
| 操作 | 期望响应时间 | 测试方法 |
|------|------------|----------|
| 任务创建 | < 100ms | Performance.now() |
| 视图切换 | < 200ms | 动画完成回调 |
| 任务列表滚动 | 60fps | FPS监控 |
| 语音转写 | < 3s | API响应时间 |
| 数据同步 | < 1s | WebSocket延迟 |

### 4.2 内存使用测试
```javascript
describe('内存管理', () => {
  test('大量任务列表渲染', async () => {
    // 创建1000个任务
    // 验证内存使用 < 100MB
  });

  test('内存泄漏检测', async () => {
    // 重复创建/删除任务
    // 验证内存稳定
  });
});
```

### 4.3 电池消耗测试
- 待机功耗测试
- 语音录制功耗测试
- 后台同步功耗测试

---

## 5. 兼容性测试

### 5.1 平台兼容性
```javascript
describe('平台兼容性', () => {
  test('iOS特定功能', async () => {
    // DateTimePicker iOS样式
    // APNs推送
  });

  test('Android特定功能', async () => {
    // Material Design组件
    // FCM推送
  });

  test('Web平台降级', async () => {
    // 语音功能降级
    // 推送功能降级
  });
});
```

### 5.2 屏幕适配测试
- iPhone notch适配
- Android异形屏适配
- 平板横屏适配
- 字体缩放适配

---

## 6. 安全测试

### 6.1 数据安全
```javascript
describe('数据安全', () => {
  test('敏感数据加密', async () => {
    // 验证token加密存储
    // 验证API key不暴露
  });

  test('SQL注入防护', async () => {
    // 输入特殊字符测试
  });

  test('XSS防护', async () => {
    // 输入脚本标签测试
  });
});
```

### 6.2 认证授权
- JWT过期处理
- 权限验证
- 会话管理

---

## 7. 用户体验测试

### 7.1 可用性测试
- 新用户引导流程
- 错误提示友好性
- 加载状态反馈
- 操作可撤销性

### 7.2 无障碍测试
- VoiceOver/TalkBack支持
- 键盘导航
- 对比度测试
- 字体大小调节

---

## 8. 回归测试

### 8.1 核心功能回归
每个版本发布前必须通过的测试：
1. 创建任务
2. 编辑任务
3. 完成任务
4. 删除任务
5. 视图切换
6. 数据同步

### 8.2 自动化回归测试
```bash
# 运行回归测试套件
npm run test:regression
```

---

## 9. 测试工具与框架

### 9.1 单元测试
- **框架**: Jest
- **覆盖率目标**: 80%

```javascript
// 示例：taskStore测试
import { taskStore } from '@/features/task/taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    taskStore.reset();
  });

  test('addTask', async () => {
    const task = await taskStore.addTask('Test Task');
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe(0);
  });
});
```

### 9.2 组件测试
- **框架**: React Native Testing Library

```javascript
import { render, fireEvent } from '@testing-library/react-native';
import TaskCell from '@/components/TaskCell';

test('TaskCell renders correctly', () => {
  const { getByText } = render(
    <TaskCell task={{ title: 'Test', status: 0 }} />
  );
  expect(getByText('Test')).toBeTruthy();
});
```

### 9.3 端到端测试
- **框架**: Detox / Maestro

```javascript
describe('E2E: Task Creation', () => {
  it('should create a new task', async () => {
    await element(by.id('add-button')).tap();
    await element(by.id('task-input')).typeText('New Task');
    await element(by.id('save-button')).tap();
    await expect(element(by.text('New Task'))).toBeVisible();
  });
});
```

---

## 10. 测试报告模板

### 10.1 测试执行报告
```markdown
## 测试执行报告 - [日期]

### 测试概况
- 测试版本: v1.0.0
- 测试环境: iOS/Android/Web
- 测试周期: 2024-01-01 至 2024-01-05

### 测试结果
- 总用例数: 150
- 通过: 145
- 失败: 3
- 阻塞: 2
- 通过率: 96.7%

### 缺陷统计
- P0 (崩溃): 0
- P1 (功能): 2
- P2 (体验): 3
- P3 (建议): 5

### 风险评估
[风险项列表]

### 建议
[是否可以发布的建议]
```

---

## 11. 测试进度跟踪

| 阶段 | 测试类型 | 计划用例数 | 已完成 | 通过率 | 状态 |
|------|---------|-----------|--------|--------|------|
| Phase 1-5 | 功能测试 | 50 | 50 | 98% | ✅ |
| Phase 1-5 | 性能测试 | 10 | 8 | 80% | 🚧 |
| Phase 6 | 语音功能 | 20 | 0 | - | ⏳ |
| Phase 7 | 同步测试 | 15 | 0 | - | ⏳ |
| Phase 8 | 提醒测试 | 10 | 0 | - | ⏳ |
| Phase 9 | 设置测试 | 8 | 0 | - | ⏳ |
| Phase 10 | 优化测试 | 25 | 0 | - | ⏳ |

---

## 12. 持续集成配置

### 12.1 CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

### 12.2 测试自动化策略
1. **提交时**: 运行单元测试
2. **PR时**: 运行单元测试 + 集成测试
3. **发布前**: 完整测试套件
4. **每日**: 回归测试

---

## 13. 测试最佳实践

### 13.1 测试原则
- ✅ 每个功能必须有对应测试
- ✅ 测试应该独立可重复
- ✅ 优先测试核心业务逻辑
- ✅ 保持测试代码简洁可维护

### 13.2 测试数据管理
- 使用工厂模式创建测试数据
- 测试后清理数据
- 避免测试间数据依赖

### 13.3 测试维护
- 定期更新测试用例
- 删除过时的测试
- 保持测试文档同步

---

## 14. 附录

### 14.1 测试环境搭建
```bash
# 安装测试依赖
npm install --save-dev jest @testing-library/react-native detox

# 配置测试数据库
cp .env.example .env.test

# 初始化测试环境
npm run test:setup
```

### 14.2 常见问题处理
1. **WatermelonDB JSI错误**: 模拟器设置 `jsi: false`
2. **手势测试失败**: 确保 GestureHandlerRootView 包裹
3. **异步测试超时**: 增加 jest.setTimeout

### 14.3 测试联系人
- 测试负责人: [姓名]
- 技术支持: [邮箱]
- Bug追踪: [JIRA/GitHub Issues链接]

---

**文档版本**: v1.0.0  
**最后更新**: 2025-08-07  
**下次评审**: 2025-09-01