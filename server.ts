import { createApp } from './server/app';
import { config } from './server/config';
import { startCleanupJob } from './server/services/cleanup';

import { recoverInterruptedTasks } from './server/services/recoveryService';
import { startVideoWorker } from './server/services/videoWorker';
import { startEventBusWorker } from './server/services/eventBusWorker';

async function start() {
  try {
    const app = await createApp();
    
    // Start background jobs
    startCleanupJob();
    recoverInterruptedTasks();
    startVideoWorker();
    startEventBusWorker();

    app.listen(config.port, "0.0.0.0", () => {
      console.log(`[Server] Running at http://localhost:${config.port}`);
      console.log(`[Mode] ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('[Fatal] Failed to start server:', error);
    process.exit(1);
  }
}

start();
