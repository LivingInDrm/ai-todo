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
  ],
});