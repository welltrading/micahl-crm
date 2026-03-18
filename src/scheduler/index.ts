import Bree from 'bree';
import path from 'path';

const bree = new Bree({
  root: path.join(__dirname, 'jobs'),
  jobs: [
    // Phase 4 will add: { name: 'send-messages', interval: '1m' }
  ],
});

bree.start().then(() => {
  console.log('Bree scheduler started — no jobs configured yet (Phase 4)');
});
