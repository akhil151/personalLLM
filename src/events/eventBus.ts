import { createClient } from '@/lib/supabase-server';

export type EventType = 
  | 'TASK_CREATED' 
  | 'PLAN_GENERATED' 
  | 'TOOL_EXECUTED' 
  | 'MEMORY_UPDATED' 
  | 'WORKFLOW_COMPLETED' 
  | 'JOB_FAILED';

export interface WorkflowEvent {
  runId: string;
  type: EventType;
  payload: any;
  timestamp: string;
}

/**
 * EventBus is the backbone of our Event-Driven Architecture (EDA).
 * 
 * WHY EDA?
 * 1. Decoupling: The Planner doesn't need to know who executes the plan.
 * 2. Scalability: We can add new listeners (e.g., logging, notification) without changing core logic.
 * 3. Auditability: Every significant state change is logged as an immutable event.
 */
class EventBus {
  private subscribers: Map<EventType, ((event: WorkflowEvent) => Promise<void>)[]> = new Map();

  /**
   * Publishes an event to the system and persists it to the database.
   */
  async publish(runId: string, type: EventType, payload: any) {
    const event: WorkflowEvent = {
      runId,
      type,
      payload,
      timestamp: new Date().toISOString()
    };

    console.log(`[EVENT] ${type}:`, payload);

    // 1. Persist to DB for durability
    const supabase = await createClient();
    await supabase
      .from('workflow_events')
      .insert([{
        workflow_run_id: runId,
        event_type: type,
        payload: payload
      }]);

    // 2. Notify internal subscribers (Async)
    const handlers = this.subscribers.get(type) || [];
    handlers.forEach(handler => handler(event).catch(err => console.error(`Handler error for ${type}:`, err)));
  }

  /**
   * Subscribes a handler to a specific event type.
   */
  subscribe(type: EventType, handler: (event: WorkflowEvent) => Promise<void>) {
    const handlers = this.subscribers.get(type) || [];
    handlers.push(handler);
    this.subscribers.set(type, handlers);
  }
}

export const eventBus = new EventBus();
