import Bree from 'bree';
import path from 'path';
import { resetStuckSendingMessages } from '../lib/airtable/scheduler-services';

async function main(): Promise<void> {
  // Recovery: reset messages stuck in 'בשליחה' from a previous crashed process
  await resetStuckSendingMessages();
  console.log('Boot recovery: stuck sending messages reset');

  const bree = new Bree({
    root: path.join(__dirname, 'jobs'),
    jobs: [
      { name: 'send-messages', interval: '1m' },
    ],
  });

  await bree.start();
  console.log('Bree scheduler started — send-messages job active (every 1 minute)');
}

main().catch(console.error);
