const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export async function getRounds() {
  return fetchAPI<{ rounds: any[] }>('/v1/rounds');
}

export async function getRound(id: string) {
  return fetchAPI<{ round: any }>(`/v1/rounds/${id}`);
}

export async function createRound(data: {
  name?: string;
  arena_type?: 'tournament' | 'contest';
  trading_pair?: string;
  prize_pool_seed?: number;
  buy_in_fee?: number;
  protocol_fee_percent?: number;
  payout_structure?: Record<string, number>;
  agent_limit?: number;
  winner_count?: number;
  min_tick_interval?: number;
  max_tick_interval?: number;
  scheduled_start_time?: string | null;
  end_time?: string | null;
  duration?: number;
  duration_unit?: 'hours' | 'days';
  banner_url?: string;
  settings?: {
    duration_minutes?: number;
  };
}) {
  return fetchAPI<{ round: any }>('/v1/rounds', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function startRound(id: string) {
  return fetchAPI<{ round: any }>(`/v1/rounds/${id}/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function stopRound(id: string) {
  return fetchAPI<{ round: any }>(`/v1/rounds/${id}/stop`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function deleteRound(id: string) {
  const response = await fetch(`${API_URL}/v1/rounds/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Failed to delete round: ${response.status}`);
  }
}

export async function settleRound(id: string) {
  return fetchAPI<{ settlement: any }>(`/v1/rounds/${id}/settle`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getPoolInfo(id: string) {
  return fetchAPI<{ pool: any }>(`/v1/rounds/${id}/pool-info`);
}

export async function getPayouts(id: string) {
  return fetchAPI<{ payouts: any[] }>(`/v1/rounds/${id}/payouts`);
}

export async function getParticipants(roundId: string) {
  return fetchAPI<{ participants: any[] }>(`/v1/rounds/${roundId}/participants`);
}

export async function getAgents() {
  return fetchAPI<{ agents: any[] }>('/v1/agents');
}

export async function deleteAgent(id: string) {
  const response = await fetch(`${API_URL}/v1/agents/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to delete agent: ${response.status}`);
  }
}

export async function getTrades(roundId: string) {
  return fetchAPI<{ trades: any[] }>(`/v1/arena/${roundId}/trades`);
}

export async function getLeaderboard(roundId: string) {
  return fetchAPI<{ leaderboard: any[] }>(`/v1/leaderboard/${roundId}`);
}

export async function getAgentReasoning(agentId: string, roundId: string, limit: number = 20) {
  return fetchAPI<{ reasoning: any[] }>(`/v1/agents/${agentId}/reasoning/${roundId}?limit=${limit}`);
}

export async function getAllReasoning(roundId: string, agentIds: string[]) {
  const results = await Promise.all(
    agentIds.map((agentId) => getAgentReasoning(agentId, roundId, 50).catch(() => ({ reasoning: [] })))
  );

  const allReasoning = results
    .flatMap((r, i) =>
      (r.reasoning || []).map((item: any) => ({ ...item, agent_id: agentIds[i] }))
    )
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  return { reasoning: allReasoning };
}

export async function getMarketPrice(tradingPair?: string) {
  const params = tradingPair ? `?trading_pair=${encodeURIComponent(tradingPair)}` : '';
  return fetchAPI<{ price: number; source: string; trading_pair: string }>(`/v1/market/price${params}`);
}
