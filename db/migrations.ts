import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      // Version 1 -> 2: Add pinned_at field
      toVersion: 2,
      steps: [
        addColumns({
          table: 'tasks',
          columns: [
            { name: 'pinned_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      // Version 2 -> 3: Add remote_id field for Supabase sync
      toVersion: 3,
      steps: [
        addColumns({
          table: 'tasks',
          columns: [
            { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
      ],
    },
  ],
});