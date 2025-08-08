import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'due_ts', type: 'number', isOptional: true },
        { name: 'urgent', type: 'boolean', isOptional: false },
        { name: 'status', type: 'number', isOptional: false }, // 0: active, 1: completed
        { name: 'pending', type: 'boolean', isOptional: false }, // 0: normal, 1: draft
        { name: 'completed_ts', type: 'number', isOptional: true },
        { name: 'created_ts', type: 'number', isOptional: false },
        { name: 'updated_ts', type: 'number', isOptional: false },
        { name: 'pinned_at', type: 'number', isOptional: true }, // Timestamp when pinned
      ],
    }),
  ],
});