# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered minimalist TodoList mobile application built with Expo and React Native. Features voice input with LLM parsing, local reminders, and cloud synchronization. Based on detailed specifications in `design.md` and development roadmap in `plan.md`.

## Development Commands

```bash
# Start development server
npm start

# Platform-specific development
npm run ios       # iOS simulator
npm run android   # Android emulator  
npm run web       # Web browser

# Install dependencies
npm install

# Clear cache and restart
npx expo start -c

# Build for production
npx eas build --platform ios
npx eas build --platform android
```

## Architecture & Data Flow

### Core State Management Pattern

The app uses a unidirectional data flow with WatermelonDB as the source of truth:

1. **WatermelonDB (SQLite)** → Persistent local storage with offline-first capability
2. **Zustand Stores** → State management layer that syncs with WatermelonDB
   - `taskStore`: Manages active tasks, handles CRUD operations
   - `draftStore`: Manages voice input drafts (pending=true tasks)
3. **React Components** → UI layer consumes store state via hooks
4. **Supabase Realtime** → Cloud sync with conflict resolution (last-write-wins)

### Task Lifecycle & States

```
Voice Input → Draft (pending=true) → Confirmation → Active Task → Complete/Archive
                                          ↓
                                    Manual Input
```

- **Task Status**: `0` (active) | `1` (completed)
- **Task Pending**: `false` (confirmed) | `true` (draft awaiting confirmation)
- **View Assignment**: Automatic based on `due_ts` and `status`

### Three-View System Logic

Views are computed dynamically from the task collection:

- **Focus View** (`getFocusTasks()`): 
  - Filter: `status=0 AND (overdue OR due_ts <= now+7days)`
  - Sort: `due_ts ASC` (earliest first)
  
- **Backlog View** (`getBacklogTasks()`):
  - Filter: `status=0 AND (no due_ts OR due_ts > now+7days)`  
  - Sort: `created_ts DESC` (newest first)
  
- **Done View** (`getDoneTasks()`):
  - Filter: `status=1 AND completed_ts >= now-30days`
  - Sort: `completed_ts DESC` (most recent first)

### Gesture System Implementation

Implemented via `react-native-gesture-handler` Swipeable component:

- **Right Swipe (~30%)**: Triggers `toggleTaskStatus()` → Updates status field
- **Left Swipe**: Opens `MoreActionSheet` → Postpone/Pin/Delete options

### Voice Input Flow (Phase 6 - Completed)

```
1. Long press VoiceButton → expo-av records audio
2. Audio chunks → OpenAI Whisper API (streaming)
3. Transcribed text → GPT-4o with function calling
4. Parse operations[] → Create draft tasks (pending=true)
5. Show draft UI → User confirms/rejects
6. Confirmed drafts → Update pending=false
```

## Key Implementation Details

### Database Schema (`db/schema.ts`)

Single `tasks` table with fields optimized for minimal storage and fast queries. All timestamps are stored as milliseconds since epoch for consistent timezone handling.

### Store Pattern (`features/*/store.ts`)

Each store follows this pattern:
- Async actions that interact with WatermelonDB
- Computed getters that filter/sort in-memory task array
- Error handling with user-facing error state
- Optimistic updates followed by database sync

### Component Hierarchy

```
app/_layout.tsx (GestureHandlerRootView + BottomSheetProvider)
  └── app/task-list.tsx (Main screen)
      ├── TaskTabs (View switcher)
      ├── FlatList
      │   ├── Draft Section (conditional)
      │   └── TaskCell (swipeable rows)
      ├── VoiceButton + AddButton (FABs)
      ├── TaskDetailSheet (modal)
      ├── MoreActionSheet (modal)
      └── Snackbar + FloatingBar (overlays)
```

### Bottom Sheet Integration

All editing happens in `TaskDetailSheet` using `@gorhom/bottom-sheet`. The sheet handles both create and update operations, with automatic save on dismiss via `debounce`.

## Environment Variables

Required in `.env` (see `.env.example`):
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key  
- `EXPO_PUBLIC_OPENAI_API_KEY`: OpenAI API key for Whisper/GPT-4o

## Current Development Status

**Completed Phases (1-6)**: ✅
- Project setup with Expo + TypeScript
- WatermelonDB integration
- All UI components
- Core task management (CRUD, views, gestures)
- Task detail sheet with date picker
- Voice input with Whisper + GPT-4o

**Remaining Phases (7-10)**:
- Phase 7: Supabase auth & realtime sync
- Phase 8: Local notifications
- Phase 9: Settings screen
- Phase 10: Testing & optimization

## Common Issues & Solutions

1. **WatermelonDB JSI Error**: Ensure you're running on a real device or use `jsi: false` in adapter config for simulators
2. **Gesture Handler Not Working**: Must wrap app with `GestureHandlerRootView`
3. **Bottom Sheet Behind Content**: Check z-index and portal configuration
4. **Expo Version Conflicts**: Run `npx expo install --fix` to align package versions

## Testing Commands

```bash
# Run tests (ALWAYS use NODE_ENV=test prefix)
NODE_ENV=test npm test                    # Run all tests
NODE_ENV=test npm run test:watch         # Watch mode
NODE_ENV=test npm run test:coverage      # Coverage report

# Run specific tests
NODE_ENV=test npm test tests/unit/       # Run all unit tests
NODE_ENV=test npm test path/to/test.ts   # Single test file
NODE_ENV=test npm test -- --testNamePattern="should create task"  # By test name

# Debug tests
NODE_ENV=test npm run test:debug         # Debug mode with open handles detection
NODE_ENV=test npm run test:changed       # Test only changed files
NODE_ENV=test npm run test:related path/to/file.ts  # Find related tests
```

## Testing Infrastructure

### Test Environment Setup
- **Always run tests with `NODE_ENV=test`** to bypass native dependencies
- Jest configuration in `jest.config.js` uses `jest-expo` preset
- Babel automatically skips reanimated plugin in test environment
- Test timeout: 10 seconds per test

### Mock Locations
- **API Mocks**: `setup/mock/handlers.ts` - MSW handlers for OpenAI, Supabase
- **Database Mock**: `setup/mock/watermelondb.ts` - Simplified in-memory adapter
- **Native Mocks**: `setup/jest.setup.ts` - All React Native module mocks
- **Global Utils**: Available via `global.createMockTask()`

### Writing Tests
- Place unit tests in `tests/unit/`
- Place component tests in `tests/components/`
- Place integration tests in `tests/integration/`
- Import test utilities: `import { createTestDatabase } from '../../setup/mock/watermelondb'`
- Use MSW for API testing: `import { server, errorHandlers } from '../../setup/mock/handlers'`

### Current Test Status
- **Pass Rate**: 94.4% (51/54 tests passing)
- **Known Issues**: 
  - notifications.test.ts: Missing `getPermissionsAsync` mock
  - cloud-sync.test.ts: Offline queue flush returning 0