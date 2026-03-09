import { EventEmitter } from 'events';

export interface SyncTask {
  userId: string;
  portfolioId: string;
  status: 'connecting' | 'syncing' | 'done' | 'error';
  total: number;
  processed: number;
  created: number;
  failed: number;
  errors: string[];
  primaryImportedPortfolioId?: string;
  startedAt: number;
  completedAt?: number;
}

const store = new Map<string, SyncTask>();
export const syncEmitter = new EventEmitter();

export const syncStore = {
  get: (userId: string): SyncTask | undefined => store.get(userId),

  start: (userId: string, portfolioId: string): SyncTask => {
    const task: SyncTask = {
      userId,
      portfolioId,
      status: 'connecting',
      total: 0,
      processed: 0,
      created: 0,
      failed: 0,
      errors: [],
      startedAt: Date.now(),
    };
    store.set(userId, task);
    syncEmitter.emit(`sync:${userId}`, task);
    return task;
  },

  update: (userId: string, data: Partial<SyncTask>): SyncTask | undefined => {
    const task = store.get(userId);
    if (!task) return undefined;
    Object.assign(task, data);
    syncEmitter.emit(`sync:${userId}`, task);
    return task;
  },

  isActive: (userId: string): boolean => {
    const task = store.get(userId);
    return !!task && (task.status === 'connecting' || task.status === 'syncing');
  },
};
