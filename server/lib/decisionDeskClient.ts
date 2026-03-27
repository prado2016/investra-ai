import { z } from 'zod';
import type { PortfolioReviewRequestPayload } from './decisionSnapshot.js';

const capabilitiesSchema = z.object({
  desk_version: z.string(),
  health_status: z.string(),
  supported_decision_output_schema_versions: z.array(z.string()).default([]),
  supported_portfolio_review_request_versions: z.array(z.string()).default([]),
  supported_event_types: z.array(z.string()).default([]),
  default_source: z.enum(['runtime', 'academy', 'manual_test']).default('runtime'),
});

const acceptedRunSchema = z.object({
  review_session_id: z.string(),
  accepted_at: z.string(),
  status: z.literal('accepted'),
});

const decisionEventEnvelopeSchema = z.object({
  schema_version: z.string(),
  event_id: z.string(),
  event_type: z.string(),
  created_at: z.string(),
  source: z.enum(['runtime', 'academy', 'manual_test']),
  review_session_id: z.string(),
  portfolio_id: z.string(),
  session_id: z.string().nullable().optional().default(null),
  cycle_id: z.string().nullable().optional().default(null),
  proposal_id: z.string().nullable().optional(),
  decision_id: z.string().nullable().optional(),
  execution_order_id: z.string().nullable().optional(),
  position_id: z.string().nullable().optional(),
  job_id: z.string().nullable().optional(),
  instrument: z.string().nullable().optional(),
  side: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  requested_by_user_id: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
});

const decisionOutputResponseSchema = z.object({
  items: z.array(decisionEventEnvelopeSchema),
  next_cursor: z.string().nullable().optional(),
  generated_at: z.string(),
});

export type DecisionDeskCapabilities = z.infer<typeof capabilitiesSchema>;
export type DecisionDeskAcceptedRun = z.infer<typeof acceptedRunSchema>;
export type DecisionDeskEventEnvelope = z.infer<typeof decisionEventEnvelopeSchema>;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function buildHeaders(extra: HeadersInit = {}) {
  const token = process.env.DECISION_DESK_TOKEN;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage = typeof json === 'object' && json && 'error' in json
      ? String((json as { error?: unknown }).error ?? response.statusText)
      : response.statusText;
    throw new Error(errorMessage || `Decision desk request failed with ${response.status}`);
  }
  return schema.parse(json);
}

export async function getDecisionDeskCapabilities() {
  const baseUrl = getRequiredEnv('DECISION_DESK_BASE_URL');
  const response = await fetch(new URL('/api/capabilities', baseUrl), {
    headers: buildHeaders(),
  });
  return parseJson(response, capabilitiesSchema);
}

export async function createDecisionDeskReviewSession(params: {
  idempotencyKey: string;
  snapshot: PortfolioReviewRequestPayload;
}) {
  const baseUrl = getRequiredEnv('DECISION_DESK_BASE_URL');
  const response = await fetch(new URL('/api/portfolio-review-sessions', baseUrl), {
    method: 'POST',
    headers: buildHeaders({ 'Idempotency-Key': params.idempotencyKey }),
    body: JSON.stringify(params.snapshot),
  });
  return parseJson(response, acceptedRunSchema);
}

export async function fetchDecisionOutputPage(params: {
  afterEventId?: string | null;
  since?: string | null;
}) {
  const baseUrl = getRequiredEnv('DECISION_DESK_BASE_URL');
  const url = new URL('/api/decision-output', baseUrl);
  if (params.afterEventId) {
    url.searchParams.set('after_event_id', params.afterEventId);
  } else if (params.since) {
    url.searchParams.set('since', params.since);
  }
  const response = await fetch(url, {
    headers: buildHeaders(),
  });
  return parseJson(response, decisionOutputResponseSchema);
}
