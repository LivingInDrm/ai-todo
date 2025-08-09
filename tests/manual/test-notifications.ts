// Manual test script for notification functionality
// Run this with: npx ts-node tests/manual/test-notifications.ts

import notificationService from '../../features/notify/notificationService';
import reminderService from '../../features/notify/reminderService';
import { TaskData } from '../../lib/types';

async function testNotifications() {
  console.log('🔔 Testing notification functionality...\n');

  // Test 1: Request permissions
  console.log('1. Testing permission request...');
  const hasPermission = await notificationService.requestPermissions();
  console.log(`   Permission granted: ${hasPermission ? '✅' : '❌'}`);

  if (!hasPermission) {
    console.log('   ⚠️  Notifications require physical device or simulator with proper setup');
    return;
  }

  // Test 2: Schedule a test notification (1 minute from now)
  console.log('\n2. Scheduling test notification (1 minute from now)...');
  const testDate = new Date();
  testDate.setMinutes(testDate.getMinutes() + 1);
  
  const notificationId = await notificationService.scheduleNotification(
    'test-task-1',
    'Test Task: Buy groceries',
    testDate,
    0 // Immediate reminder when time comes
  );
  
  console.log(`   Notification scheduled: ${notificationId ? '✅' : '❌'}`);
  if (notificationId) {
    console.log(`   Notification ID: ${notificationId}`);
    console.log(`   Will trigger at: ${testDate.toLocaleTimeString()}`);
  }

  // Test 3: Test reminder service
  console.log('\n3. Testing reminder service with mock task...');
  const mockTask: TaskData = {
    id: 'test-task-2',
    title: 'Complete project report',
    dueTs: Date.now() + 2 * 60 * 1000, // 2 minutes from now
    due_ts: Date.now() + 2 * 60 * 1000, // 2 minutes from now
    urgent: true,
    status: 0,
    pending: false,
    pinnedAt: 0,
    pinned_at: 0,
    completedTs: undefined,
    completed_ts: undefined,
    createdTs: Date.now(),
    created_ts: Date.now(),
    updatedTs: Date.now(),
    updated_ts: Date.now()
  };

  await reminderService.setReminder(mockTask);
  console.log('   Reminder set for task: ✅');
  console.log(`   Task: "${mockTask.title}"`);
  console.log(`   Due at: ${new Date(mockTask.due_ts!).toLocaleTimeString()}`);
  console.log(`   Reminder at: ${new Date(mockTask.due_ts! - 30 * 60 * 1000).toLocaleTimeString()}`);

  // Test 4: List all scheduled notifications
  console.log('\n4. Listing all scheduled notifications...');
  const scheduled = await notificationService.getScheduledNotifications();
  console.log(`   Total scheduled: ${scheduled.length}`);
  
  scheduled.forEach((notif, index) => {
    console.log(`   ${index + 1}. ${notif.content.title}: ${notif.content.body}`);
    if (notif.trigger && 'date' in notif.trigger) {
      console.log(`      Triggers at: ${new Date(notif.trigger.date).toLocaleTimeString()}`);
    }
  });

  // Test 5: Cancel test notifications after 5 seconds
  console.log('\n5. Cleaning up test notifications in 5 seconds...');
  setTimeout(async () => {
    if (notificationId) {
      await notificationService.cancelNotification(notificationId);
      console.log('   Test notification cancelled: ✅');
    }
    await reminderService.cancelReminder('test-task-2');
    console.log('   Test reminder cancelled: ✅');
    console.log('\n✨ Notification tests completed!');
  }, 5000);
}

// Run tests
testNotifications().catch(console.error);