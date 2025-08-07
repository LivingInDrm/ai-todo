# AI-Todo 测试基础设施技术设计

---

## 1. 设计目标

1. **快速反馈**：单元 & 组件测试跑在纯 JS 环境，秒级反馈。
2. **零额外配置**：借助 `jest-expo` 预设，对 Expo/TS/装饰器自动转译。
3. **高度隔离**：统一 Mock 外部依赖（OpenAI、Supabase、WatermelonDB…）。
4. **可渐进扩展**：先覆盖逻辑与 UI，再引入 Detox 做真机端到端。

---

## 2. 技术栈与依赖选型

| 领域 | 库 | 说明 |
|------|----|------|
| **测试框架** | `jest-expo@~53` | Expo 官方预设，内含 Jest & React 渲染器 |
| **React 组件测试** | `@testing-library/react-native` / `@testing-library/jest-native` | 交互与断言 |
| **Hook 测试** | `@testing-library/react-hooks` | 测 Zustand 逻辑更简洁 |
| **断言扩展** | `jest-extended` | 丰富 matcher |
| **网络 Mock** | `msw` | 拦截 `fetch`，同时支持浏览器与 Node 环境 |
| **端到端** | `detox` + `expo-detox-hook` | 第二阶段接入 |
| **类型提示** | `@types/jest`、`@types/react`、`@types/react-native` | |
| **编译** | `@babel/core`（随 Expo） & `typescript` | |


**devDependencies 示范**
```jsonc
{
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/jest": "^29.5.11",
    "@types/react": "~19.0.10",
    "@types/react-native": "^0.72.8",
    "@testing-library/jest-native": "^5.5.0",
    "@testing-library/react-native": "^13.2.2",
    "@testing-library/react-hooks": "^8.1.2",
    "jest-expo": "~53.0.9",
    "jest-extended": "^4.0.2",
    "msw": "^2.7.0",
    "detox": "^20.26.2",
    "expo-detox-hook": "^2.1.0",
    "typescript": "~5.8.3"
  }
}
```

---

## 3. 目录结构约定

```
ai-todo/
├─ tests/
│  ├─ unit/            # 纯业务逻辑（store、utils…）
│  ├─ components/      # RN 组件测试
│  ├─ integration/     # 对外交互组合逻辑
│  └─ e2e/             # Detox 脚本（阶段二）
└─ setup/
   ├─ jest.setup.ts    # 全局 Mock、matcher 及 MSW server
   └─ mock/            # 手写原生模块 Mock
```

---

## 4. 核心配置

### 4.1 Jest `jest.config.js`
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest.setup.ts',
    'jest-extended/all'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@gorhom|@nozbe|@supabase|expo|@expo)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  // 如需纯 Node 逻辑测试，可拆分成独立 config；组件测试保持默认环境
  testTimeout: 10000
};
```

### 4.2 Jest 启动脚本
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 4.3 `setup/jest.setup.ts`
```ts
import '@testing-library/jest-native/extend-expect';
import 'jest-extended';

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// MSW
import { server } from './mock/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 5. Mock 策略

1. **网络请求** – 统一用 `msw`；在 `setup/mock/handlers.ts` 里声明 OpenAI、Supabase 等端点。
2. **原生模块** – Reanimated、Gesture-Handler、BottomSheet… 使用官方 Mock；WatermelonDB 使用 memory adapter。
3. **时间相关** – `@sinonjs/fake-timers` 或 `jest.useFakeTimers()` 保证解析逻辑稳定。

### MSW 2.x 配置示例

```ts
// setup/mock/handlers.ts
import { http, HttpResponse } from 'msw' // v2.x API 变化

export const handlers = [
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{ 
        message: { 
          function_call: {
            name: 'process_tasks',
            arguments: JSON.stringify({
              operations: [{ action: 'add_todo', payload: { title: 'Mock任务' } }]
            })
          } 
        } 
      }]
    })
  }),
  
  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({ text: 'Mock转写结果' })
  })
]

// setup/mock/server.ts  
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### WatermelonDB 测试适配器

```ts
// setup/mock/watermelondb.ts
import { Database } from '@nozbe/watermelondb'
import TestAdapter from '@nozbe/watermelondb/adapters/test'
import { mySchema } from '../../db/schema'
import { Task } from '../../db/models/Task'

export const createTestDatabase = () => {
  const adapter = new TestAdapter({
    schema: mySchema
  })
  
  return new Database({
    adapter,
    modelClasses: [Task], // 添加你的模型类
  })
}

// 在测试中使用
export const setupTestDatabase = () => {
  let database: Database
  
  beforeEach(async () => {
    database = createTestDatabase()
  })
  
  afterEach(async () => {
    await database.write(async () => {
      await database.unsafeResetDatabase()
    })
  })
  
  return () => database
}
```

---

## 6. 风险与对策

1. **原生 Mock 难度** → 首选官方/社区 Mock，实现最小可用子集。
2. **WatermelonDB 需原生驱动** → 单元测试使用 memory adapter；集成测试跑真机。
3. **OpenAI 成本** → 除 staging 外统一 stub，必要时设置配额监控。

---

## 7. 最佳实践与注意事项

### 7.1 版本管理
- **锁定测试依赖版本**：使用 `~` 前缀确保 patch 版本自动更新，避免 breaking changes
- **定期更新**：每月检查主要测试库的更新，特别是安全补丁

### 7.2 调试技巧
```json
{
  "scripts": {
    "test:debug": "jest --detectOpenHandles --forceExit",
    "test:changed": "jest --onlyChanged --watch",
    "test:related": "jest --findRelatedTests"
  }
}
```

### 7.3 常见陷阱
1. **异步测试未等待**：始终使用 `await` 或 `.resolves/.rejects` matcher
2. **定时器未清理**：在 `afterEach` 中调用 `jest.useRealTimers()`
3. **全局状态污染**：确保每个测试后重置 Zustand store 状态

---

