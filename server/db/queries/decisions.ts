import { and, desc, eq } from 'drizzle-orm';
import { db } from '../client.js';
import { decisionEvents, decisionInsights, decisionRuns } from '../schema.js';

type DecisionRunInsert = typeof decisionRuns.$inferInsert;
type DecisionRunStatus = typeof decisionRuns.$inferSelect.status;

type DecisionRunUpdate = Partial<Pick<typeof decisionRuns.$inferInsert,
  | 'externalSessionId'
  | 'status'
  | 'acceptedAt'
  | 'lastSyncedAt'
  | 'syncCursorEventId'
  | 'syncCursorCreatedAt'
  | 'completedAt'
  | 'errorMessage'
>>;

type DecisionEventInsert = typeof decisionEvents.$inferInsert;
type DecisionInsightInsert = typeof decisionInsights.$inferInsert;

export const decisionQueries = {
  createRun: (data: DecisionRunInsert) =>
    db.insert(decisionRuns).values(data).returning().get(),

  updateRun: (id: string, data: DecisionRunUpdate) =>
    db.update(decisionRuns).set(data).where(eq(decisionRuns.id, id)).returning().get(),

  getRun: (id: string) =>
    db.select().from(decisionRuns).where(eq(decisionRuns.id, id)).get(),

  getRunByUser: (userId: string, id: string) =>
    db.select().from(decisionRuns).where(and(eq(decisionRuns.userId, userId), eq(decisionRuns.id, id))).get(),

  findRunByIdempotencyKey: (userId: string, requestIdempotencyKey: string) =>
    db.select()
      .from(decisionRuns)
      .where(and(
        eq(decisionRuns.userId, userId),
        eq(decisionRuns.requestIdempotencyKey, requestIdempotencyKey),
      ))
      .get(),

  listRunsByPortfolio: (userId: string, portfolioId: string) =>
    db.select()
      .from(decisionRuns)
      .where(and(eq(decisionRuns.userId, userId), eq(decisionRuns.portfolioId, portfolioId)))
      .orderBy(desc(decisionRuns.requestedAt)),

  listEvents: (decisionRunId: string) =>
    db.select()
      .from(decisionEvents)
      .where(eq(decisionEvents.decisionRunId, decisionRunId))
      .orderBy(desc(decisionEvents.createdAt), desc(decisionEvents.ingestedAt)),

  insertEvent: (data: DecisionEventInsert) =>
    db.insert(decisionEvents)
      .values(data)
      .onConflictDoNothing({ target: decisionEvents.eventId })
      .returning()
      .get(),

  replaceInsights: async (decisionRunId: string, items: DecisionInsightInsert[]) => {
    await db.delete(decisionInsights).where(eq(decisionInsights.decisionRunId, decisionRunId));
    if (items.length === 0) return [];
    return db.insert(decisionInsights).values(items).returning().all();
  },

  listInsights: (decisionRunId: string) =>
    db.select()
      .from(decisionInsights)
      .where(eq(decisionInsights.decisionRunId, decisionRunId))
      .orderBy(desc(decisionInsights.createdAt)),

  markRunFailed: (id: string, errorMessage: string, status: Extract<DecisionRunStatus, 'failed' | 'partial_error'> = 'failed') =>
    db.update(decisionRuns)
      .set({ status, errorMessage, lastSyncedAt: new Date() })
      .where(eq(decisionRuns.id, id))
      .returning()
      .get(),
};
