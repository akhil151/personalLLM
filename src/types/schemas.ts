import { z } from 'zod';

export const TaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimated_effort: z.number().optional().nullable()
});

export const MilestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required'),
  description: z.string().optional().default(''),
  order_index: z.number().int().optional().default(0),
  target_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimated_effort: z.number().optional().nullable(),
  tasks: z.array(TaskSchema).optional().default([])
});

export const GoalPlanSchema = z.object({
  milestones: z.array(MilestoneSchema).min(1, 'At least one milestone is required'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimated_completion_date: z.string().optional().nullable()
});

export const ExecutiveBriefSchema = z.object({
  goal_summary: z.string().min(1, 'Goal summary is required'),
  progress_percentage: z.number().int().min(0).max(100).default(0),
  active_projects_count: z.number().int().min(0).default(0),
  completed_milestones_summary: z.string().min(1, 'Milestone summary is required'),
  blocked_items: z.array(z.string()).default([]),
  highest_priority: z.string().min(1, 'Highest priority task is required'),
  priority_reason: z.string().min(1, 'Priority reason is required'),
  next_recommended_action: z.string().min(1, 'Next action is required')
});

export const CosContextSchema = z.object({
  activeGoal: z.any().optional().default(null),
  activeProject: z.any().optional().default(null),
  currentMilestone: z.any().optional().default(null),
  nextAction: z.any().optional().default({
    nextAction: 'Continue with current plan',
    reason: 'No specific prioritization available',
    impact: 'Medium',
    urgency: 'Medium',
    score: 0
  }),
  activeBlockers: z.array(z.any()).optional().default([]),
  executiveBrief: z.any().optional().default({
    goal_summary: 'User is working on their current goal.',
    progress_percentage: 0,
    active_projects_count: 0,
    completed_milestones_summary: 'No milestones completed yet.',
    blocked_items: [],
    highest_priority: 'Make progress on current task',
    priority_reason: 'Staying focused on immediate goals.',
    next_recommended_action: 'Continue with current work.'
  })
});

export type Task = z.infer<typeof TaskSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type GoalPlan = z.infer<typeof GoalPlanSchema>;
export type ExecutiveBrief = z.infer<typeof ExecutiveBriefSchema>;
export type CosContext = z.infer<typeof CosContextSchema>;
