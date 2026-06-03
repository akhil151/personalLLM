export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { eventDispatcher } = await import('./events/eventDispatcher');
    const { workerRuntime } = await import('./workers/workerRuntime');
    const { schedulerService } = await import('./scheduler/schedulerService');
    const { collaborationService } = await import('./orchestrator/collaborationService');
    const { SystemHealthAudit } = await import('./services/systemHealthAudit');

    console.log('--- STARTING AI INFRASTRUCTURE ---');
    
    // 0. Run System Health Audit
    try {
      await SystemHealthAudit.run();
    } catch (err: any) {
      console.error('SYSTEM HEALTH AUDIT FAILED:', err.message);
      // In production, you might want to exit the process
      // process.exit(1); 
    }

    // 1. Initialize Event Dispatcher
    eventDispatcher.init();

    // 2. Initialize HITL Resume Listener
    collaborationService.initListener().catch(err => console.error('HITL Listener Failed:', err));

    // 3. Start Worker Runtime (Background Jobs)
    // We don't await this as it's a continuous loop
    workerRuntime.start().catch(err => console.error('Worker Runtime Failed:', err));

    // 3. Start Scheduler & Recovery Loop
    setInterval(async () => {
      try {
        await schedulerService.processSchedules();
        
        // ACTIVATE RECOVERY SYSTEM
        const { executionRecovery } = await import('./runtime/executionRecovery');
        await executionRecovery.scanAndRecover();
        
      } catch (err) {
        console.error('Background Process Error:', err);
      }
    }, 60000); // Check every minute

    console.log('--- AI INFRASTRUCTURE INITIALIZED ---');
  }
}
