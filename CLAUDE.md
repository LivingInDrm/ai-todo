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

## Type Checking

```bash
# TypeScript type checking
npx tsc --noEmit          # Check types without generating files
```

## Architecture & Data Flow

### Core State Management Pattern

The app uses a unidirectional data flow with SQLite as the source of truth:

1. **SQLite Database** → Persistent local storage (`db/sqliteDatabase.ts`)
2. **Task Repository** → Data access layer (`db/repositories/taskRepository.ts`)
3. **Zustand Stores** → State management layer
   - `taskStore`: Manages active tasks, handles CRUD operations
   - `draftStore`: Manages voice input drafts (pending=true tasks)
4. **React Components** → UI layer consumes store state via hooks
5. **Supabase Realtime** → Cloud sync with conflict resolution (last-write-wins)

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

### Voice Input Flow

```
1. Long press VoiceButton → expo-av records audio
2. Audio chunks → OpenAI Whisper API (streaming)
3. Transcribed text → GPT-4o with function calling
4. Parse operations[] → Create draft tasks (pending=true)
5. Show draft UI → User confirms/rejects
6. Confirmed drafts → Update pending=false
```

## Key Implementation Details

### Database Schema

Single `tasks` table with fields optimized for minimal storage and fast queries. All timestamps are stored as milliseconds since epoch for consistent timezone handling. See `db/models/Task.ts` for the Task model implementation.

### Store Pattern (`features/*/store.ts`)

Each store follows this pattern:
- Async actions that interact with TaskRepository
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