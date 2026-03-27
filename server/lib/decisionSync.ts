import { decisionQueries } from '../db/queries/decisions.js';
import { fetchDecisionOutputPage, type DecisionDeskEventEnvelope } from './decisionDeskClient.js';

const DEFAULT_DECISION_SOURCE = (process.env.DECISION_DESK_DEFAULT_SOURCE ?? 'runtime') as 'runtime' | 'academy' | 'manual_test';

type StoredDecisionRun = NonNullable<ReturnType<typeof decisionQueries.getRun>>;
type NormalizedDecisionEvent = DecisionDeskEventEnvelope & {
  session_id: string | null;
  cycle_id: string | null;
};

function normalizeDecisionEvent(event: DecisionDeskEventEnvelope): NormalizedDecisionEvent {
  return {
    ...event,
    session_id: event.session_id ?? null,
    cycle_id: event.cycle_id ?? null,
  };
}

function eventMatchesRun(event: NormalizedDecisionEvent, run: StoredDecisionRun) {
  return event.review_session_id === run.externalSessionId && event.portfolio_id === run.portfolioId;
}

function shouldIncludeSource(event: NormalizedDecisionEvent) {
  return event.source === DEFAULT_DECISION_SOURCE;
}

type InsightType = 'portfolio_warning' | 'position_suggestion' | 'portfolio_recommendation';

function deriveInsightsFromEvents(params: {
  decisionRunId: string;
  portfolioId: string;
  events: NormalizedDecisionEvent[];
}) {
  return params.events.flatMap((event) => {
    const payload = event.payload;
    const headline = typeof payload.headline === 'string' ? payload.headline : null;
    const summary = typeof payload.summary === 'string' ? payload.summary : null;
    const insightType = payload.insight_type;

    if (!headline || !summary) return [];
    if (![
      'portfolio_warning',
      'position_suggestion',
      'portfolio_recommendation',
    ].includes(String(insightType))) {
      return [];
    }

    return [{
      decisionRunId: params.decisionRunId,
      portfolioId: params.portfolioId,
      accountId: typeof payload.account_id === 'string' ? payload.account_id : null,
      assetId: typeof payload.asset_id === 'string' ? payload.asset_id : null,
      symbol: typeof payload.symbol === 'string' ? payload.symbol : null,
      insightType: insightType as InsightType,
      headline,
      summary,
      confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
      recommendedAction: typeof payload.recommended_action === 'string' ? payload.recommended_action : null,
      status: 'active' as const,
      sourceEventId: event.event_id,
    }];
  });
}

export async function syncDecisionRun(runId: string) {
  const run = decisionQueries.getRun(runId);
  if (!run) throw new Error('Decision run not found');
  if (!run.externalSessionId) throw new Error('Decision run has no external session id');

  const page = await fetchDecisionOutputPage({
    afterEventId: run.syncCursorEventId ?? undefined,
    since: run.syncCursorEventId ? undefined : (run.syncCursorCreatedAt ?? run.requestedAt.toISOString()),
  });

  const normalizedEvents: NormalizedDecisionEvent[] = page.items
    .map((event) => normalizeDecisionEvent(event as DecisionDeskEventEnvelope));

  const matchingEvents = normalizedEvents
    .filter((event) => eventMatchesRun(event, run))
    .filter(shouldIncludeSource)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.event_id.localeCompare(b.event_id));

  const insertedEvents = [];
  for (const event of matchingEvents) {
    const inserted = await decisionQueries.insertEvent({
      decisionRunId: run.id,
      eventId: event.event_id,
      schemaVersion: event.schema_version,
      source: event.source,
      reviewSessionId: event.review_session_id,
      portfolioId: event.portfolio_id,
      eventType: event.event_type,
      createdAt: event.created_at,
      sessionId: event.session_id ?? null,
      cycleId: event.cycle_id ?? null,
      proposalId: event.proposal_id ?? null,
      decisionId: event.decision_id ?? null,
      executionOrderId: event.execution_order_id ?? null,
      positionId: event.position_id ?? null,
      jobId: event.job_id ?? null,
      instrument: event.instrument ?? null,
      side: event.side ?? null,
      action: event.action ?? null,
      provider: event.provider ?? null,
      model: event.model ?? null,
      requestedByUserId: event.requested_by_user_id ?? null,
      payloadJson: JSON.stringify(event.payload),
    });
    if (inserted) insertedEvents.push(event);
  }

  const latestEvent = matchingEvents.at(-1);
  const nextStatus = insertedEvents.length > 0 ? 'syncing' : run.status;
  await decisionQueries.updateRun(run.id, {
    status: nextStatus,
    lastSyncedAt: new Date(),
    syncCursorEventId: latestEvent?.event_id ?? run.syncCursorEventId,
    syncCursorCreatedAt: latestEvent?.created_at ?? run.syncCursorCreatedAt,
    errorMessage: null,
  });

  await decisionQueries.replaceInsights(run.id, deriveInsightsFromEvents({
    decisionRunId: run.id,
    portfolioId: run.portfolioId,
    events: matchingEvents,
  }));

  return {
    fetched: page.items.length,
    matched: matchingEvents.length,
    inserted: insertedEvents.length,
  };
}
