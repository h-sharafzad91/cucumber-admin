'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getRound, getParticipants, getTrades, getLeaderboard, getAllReasoning, getMarketPrice } from '@/lib/api';

interface Participant {
  id: string;
  agent_id: string;
  agent_name?: string;
  initial_balance: number;
  current_balance: number;
  total_pnl: number;
  realized_pnl?: number;
  unrealized_pnl?: number;
  total_trades: number;
  effective_tick_interval?: number;
}

interface Trade {
  id: string;
  agent_id: string;
  agent_name?: string;
  action: string;
  asset: string;
  size_usd: number;
  quantity?: number;
  execution_price: number;
  pnl?: number;
  status: string;
  created_at: string;
}

interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  total_pnl: number;
  current_balance?: number;
  total_trades?: number;
  effective_tick_interval?: number;
  rank: number;
}

interface Reasoning {
  agent_id: string;
  agent_name?: string;
  reasoning: string;
  action: string;
  asset?: string;
  size_usd?: number;
  timestamp?: string;
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimeRemaining(endTime: string | null): string {
  if (!endTime) return '--';
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatTickInterval(seconds: number): string {
  if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
  return `${seconds}s`;
}

// Agent Card Component
function AgentCard({ participant, currentPrice, isCompleted }: { participant: Participant; currentPrice: number; isCompleted: boolean }) {
  const pnlPercent = participant.initial_balance > 0
    ? ((participant.total_pnl / participant.initial_balance) * 100)
    : 0;

  // When arena is completed, unrealized becomes realized
  const finalRealizedPnl = isCompleted
    ? participant.total_pnl
    : (participant.realized_pnl || 0);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold truncate">{participant.agent_name || participant.agent_id.slice(0, 8)}</h3>
        {participant.effective_tick_interval && (
          <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
            {formatTickInterval(participant.effective_tick_interval)}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Final Balance</span>
          <span className="font-medium">{formatUSD(participant.current_balance)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">{isCompleted ? 'Final PnL' : 'Total PnL'}</span>
          <span className={`font-semibold ${participant.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {participant.total_pnl >= 0 ? '+' : ''}{formatUSD(participant.total_pnl)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
          </span>
        </div>
        {isCompleted ? (
          <div className="flex justify-between">
            <span className="text-gray-400">Realized (Final)</span>
            <span className={finalRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatUSD(finalRealizedPnl)}
            </span>
          </div>
        ) : (
          <>
            {participant.realized_pnl !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Realized</span>
                <span className={participant.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatUSD(participant.realized_pnl)}
                </span>
              </div>
            )}
            {participant.unrealized_pnl !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Unrealized</span>
                <span className={participant.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatUSD(participant.unrealized_pnl)}
                </span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Trades</span>
          <span>{participant.total_trades}</span>
        </div>
      </div>
    </div>
  );
}

// Live Leaderboard Component
function LiveLeaderboard({ leaderboard, participants, isCompleted }: { leaderboard: LeaderboardEntry[]; participants: Participant[]; isCompleted: boolean }) {
  // When completed, use participants data (final state). When live, use leaderboard API data
  const displayData = useMemo(() => {
    // For completed arenas, always use participants data as source of truth
    if (isCompleted || leaderboard.length === 0) {
      return participants
        .map((p) => ({
          agent_id: p.agent_id,
          agent_name: p.agent_name || p.agent_id.slice(0, 8),
          total_pnl: p.total_pnl,
          current_balance: p.current_balance,
          total_trades: p.total_trades,
          effective_tick_interval: p.effective_tick_interval,
          rank: 0,
        }))
        .sort((a, b) => b.total_pnl - a.total_pnl)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
    // For live arenas, use leaderboard API data
    return leaderboard;
  }, [leaderboard, participants, isCompleted]);

  return (
    <div className="bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold">{isCompleted ? 'Final Leaderboard' : 'Live Leaderboard'}</h3>
      </div>
      <div className="max-h-[350px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-750 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-xs text-gray-400">Rank</th>
              <th className="text-left px-3 py-2 text-xs text-gray-400">Agent</th>
              <th className="text-right px-3 py-2 text-xs text-gray-400">P&L</th>
              <th className="text-right px-3 py-2 text-xs text-gray-400">Balance</th>
              <th className="text-right px-3 py-2 text-xs text-gray-400">Trades</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((entry, index) => (
              <tr key={entry.agent_id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {index === 0 && <span>🥇</span>}
                    {index === 1 && <span>🥈</span>}
                    {index === 2 && <span>🥉</span>}
                    <span className="text-sm">#{entry.rank || index + 1}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-sm truncate max-w-[120px]">{entry.agent_name}</td>
                <td className={`px-3 py-2 text-right text-sm font-medium ${entry.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.total_pnl >= 0 ? '+' : ''}{formatUSD(entry.total_pnl)}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-300">
                  {entry.current_balance ? formatUSD(entry.current_balance) : '--'}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-400">
                  {entry.total_trades || 0}
                </td>
              </tr>
            ))}
            {displayData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400 text-sm">
                  No participants yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Live Trade Feed Component
function LiveTradeFeed({ trades, selectedAgentId }: { trades: Trade[]; selectedAgentId: string | null }) {
  const filteredTrades = useMemo(() => {
    let filtered = trades.filter(t => t.action !== 'HOLD');
    if (selectedAgentId) {
      filtered = filtered.filter(t => t.agent_id === selectedAgentId);
    }
    // Sort by most recent first
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [trades, selectedAgentId]);

  return (
    <div className="bg-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold">All Trades ({filteredTrades.length})</h3>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-750 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-xs text-gray-400">Time</th>
              <th className="text-left px-3 py-2 text-xs text-gray-400">Agent</th>
              <th className="text-left px-3 py-2 text-xs text-gray-400">Action</th>
              <th className="text-right px-3 py-2 text-xs text-gray-400">Size</th>
              <th className="text-right px-3 py-2 text-xs text-gray-400">Price</th>
              <th className="text-right px-3 py-2 text-xs text-gray-400">PnL</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map((trade) => (
              <tr key={trade.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-3 py-2 text-xs text-gray-400">
                  {new Date(trade.created_at).toLocaleTimeString()}
                </td>
                <td className="px-3 py-2 text-gray-300 truncate max-w-[100px]">
                  {trade.agent_name || trade.agent_id.slice(0, 8)}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    trade.action.includes('BUY') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                  }`}>
                    {trade.action.replace('_MARKET', '')}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div>{formatUSD(trade.size_usd)}</div>
                  {trade.quantity && (
                    <div className="text-xs text-gray-500">{trade.quantity.toFixed(4)} {trade.asset}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-300">
                  {formatUSD(trade.execution_price)}
                </td>
                <td className={`px-3 py-2 text-right font-medium ${
                  trade.pnl !== undefined && trade.pnl !== null
                    ? trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    : 'text-gray-500'
                }`}>
                  {trade.pnl !== undefined && trade.pnl !== null
                    ? `${trade.pnl >= 0 ? '+' : ''}${formatUSD(trade.pnl)}`
                    : '--'}
                </td>
              </tr>
            ))}
            {filteredTrades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">No trades yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Live Reasoning Feed Component
function LiveReasoningFeed({ reasonings, selectedAgentId }: { reasonings: Reasoning[]; selectedAgentId: string | null }) {
  const filteredReasonings = useMemo(() => {
    let filtered = reasonings;
    if (selectedAgentId) {
      filtered = filtered.filter(r => r.agent_id === selectedAgentId);
    }
    // Sort by most recent first
    return filtered.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [reasonings, selectedAgentId]);

  return (
    <div className="bg-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold">AI Reasoning ({filteredReasonings.length})</h3>
      </div>
      <div className="max-h-[600px] overflow-y-auto p-4 space-y-3">
        {filteredReasonings.map((r, index) => (
          <div key={index} className="bg-gray-750 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary-400 text-sm">{r.agent_name || r.agent_id.slice(0, 8)}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  r.action?.includes('BUY') ? 'bg-green-900/50 text-green-300' :
                  r.action?.includes('SELL') ? 'bg-red-900/50 text-red-300' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {r.action}
                </span>
                {r.size_usd && <span className="text-xs text-gray-400">{formatUSD(r.size_usd)}</span>}
              </div>
              {r.timestamp && (
                <span className="text-xs text-gray-500">{new Date(r.timestamp).toLocaleTimeString()}</span>
              )}
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{r.reasoning}</p>
          </div>
        ))}
        {filteredReasonings.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No reasoning data yet</div>
        )}
      </div>
    </div>
  );
}

export default function AdminArenaDetailsPage() {
  const params = useParams();
  const roundId = params.id as string;

  const [round, setRound] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [reasonings, setReasonings] = useState<Reasoning[]>([]);
  const [marketPrice, setMarketPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeLeft, setTimeLeft] = useState('--');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const effectiveEndTime = useMemo(() => {
    if (round?.end_time) return round.end_time;
    if (round?.start_time && round?.settings?.duration_minutes) {
      const startTime = new Date(round.start_time);
      const endTime = new Date(startTime.getTime() + round.settings.duration_minutes * 60 * 1000);
      return endTime.toISOString();
    }
    return null;
  }, [round?.end_time, round?.start_time, round?.settings?.duration_minutes]);

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => setTimeLeft(formatTimeRemaining(effectiveEndTime));
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [effectiveEndTime]);

  async function fetchAllData() {
    try {
      // Fetch round first to get trading pair
      const roundData = await getRound(roundId);
      setRound(roundData.round);
      const tradingPair = roundData.round?.trading_pair || 'BTC/USDT';

      // Now fetch remaining data in parallel with correct trading pair
      const [participantsData, tradesData, leaderboardData, priceData] = await Promise.all([
        getParticipants(roundId).catch(() => ({ participants: [] })),
        getTrades(roundId).catch(() => ({ trades: [] })),
        getLeaderboard(roundId).catch(() => ({ leaderboard: [] })),
        getMarketPrice(tradingPair).catch(() => ({ price: 0 })),
      ]);

      setParticipants(participantsData.participants || []);
      setTrades(tradesData.trades || []);
      setLeaderboard(leaderboardData.leaderboard || []);
      setMarketPrice(priceData.price || 0);

      const agentIds = (participantsData.participants || []).map((p: any) => p.agent_id);
      if (agentIds.length > 0) {
        const reasoningData = await getAllReasoning(roundId, agentIds).catch(() => ({ reasoning: [] }));
        setReasonings(reasoningData.reasoning || []);
      }
    } catch (err) {
      console.error('Failed to fetch arena details:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (roundId) fetchAllData();
  }, [roundId]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }

  // Auto-refresh every 10 seconds for live arenas
  useEffect(() => {
    if (round?.status !== 'active') return;
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [roundId, round?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading arena...</div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-gray-400 mb-4">Arena not found</div>
        <Link href="/arenas" className="text-primary-400 hover:text-primary-300">Back to Arenas</Link>
      </div>
    );
  }

  const isContest = round.arena_type === 'contest';
  const prizePool = round.prize_pool_seed || 0;
  const buyIn = round.buy_in_fee || 0;
  const totalPool = prizePool + (participants.length * buyIn * 0.85);
  const allTrades = trades.filter(t => t.action !== 'HOLD');
  const totalPnL = participants.reduce((sum, p) => sum + (p.total_pnl || 0), 0);

  const filteredParticipants = selectedAgentId
    ? participants.filter(p => p.agent_id === selectedAgentId)
    : participants;

  return (
    <div className="space-y-6">
      {/* Back Link and Refresh */}
      <div className="flex items-center justify-between">
        <Link href="/arenas" className="text-primary-400 hover:text-primary-300 text-sm inline-block">
          &larr; Back to Arenas
        </Link>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded text-sm transition"
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Header */}
      <div className={`rounded-lg p-4 ${isContest ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-primary-900/20 border border-primary-500/30'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{round.name || "Arena"}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                isContest
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
              }`}>
                {isContest ? 'CONTEST' : 'TOURNAMENT'}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                round.status === 'active' ? 'bg-green-900 text-green-300' :
                round.status === 'completed' ? 'bg-gray-700 text-gray-300' :
                'bg-yellow-900 text-yellow-300'
              }`}>
                {round.status}
              </span>
              {round.status === 'active' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {isContest
                ? 'Quick 2-min match • 2-5 players • Winner takes 70%'
                : `${round.trading_pair || 'BTC/USDT'} • Entry: ${formatUSD(buyIn)}`
              }
            </p>
          </div>
          {marketPrice > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-400">{round.trading_pair || 'BTC/USDT'}</div>
              <div className="text-2xl font-bold text-primary-400">{formatUSD(marketPrice)}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-xs text-gray-400">Prize Pool</div>
            <div className="text-lg font-bold text-green-400">{formatUSD(totalPool)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Participants</div>
            <div className="text-lg font-bold">{participants.length}{!isContest && `/${round.agent_limit || '∞'}`}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Time Left</div>
            <div className="text-lg font-bold">{timeLeft}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">{isContest ? 'Duration' : 'Tick Range'}</div>
            <div className="text-lg font-bold">
              {isContest ? '2 min' : `${round.min_tick_interval || 10}s - ${round.max_tick_interval || 120}s`}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <span className="text-gray-400 text-sm">All Agents in Arena</span>
          <p className="text-lg font-semibold">{participants.length}</p>
          {participants.length > 0 && (
            <div className="mt-2 space-y-1 max-h-[100px] overflow-y-auto">
              {participants.map((p) => (
                <div key={p.agent_id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 truncate max-w-[120px]">{p.agent_name || p.agent_id.slice(0, 8)}</span>
                  <span className="text-purple-400 font-medium">
                    {p.effective_tick_interval ? `${p.effective_tick_interval}s` : '--'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <span className="text-gray-400 text-sm">Total Trades</span>
          <p className="text-lg font-semibold">{allTrades.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <span className="text-gray-400 text-sm">Total PnL (All Agents)</span>
          <p className={`text-lg font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatUSD(totalPnL)}
          </p>
        </div>
      </div>

      {/* Agent Filter Tabs */}
      {participants.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedAgentId(null)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                selectedAgentId === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Agents
            </button>
            {participants.map((p) => {
              const pnlPercent = p.initial_balance > 0 ? ((p.total_pnl / p.initial_balance) * 100) : 0;
              return (
                <button
                  key={p.agent_id}
                  onClick={() => setSelectedAgentId(p.agent_id)}
                  className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                    selectedAgentId === p.agent_id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {p.agent_name || p.agent_id.slice(0, 8)}
                  <span className={`ml-2 text-sm ${p.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatUSD(p.total_pnl)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Agent Cards */}
        <div className="col-span-3 space-y-4">
          <h2 className="font-semibold text-gray-300">
            {selectedAgentId ? 'Selected Agent' : 'All Agents'}
          </h2>
          {filteredParticipants.map((p) => (
            <AgentCard key={p.agent_id} participant={p} currentPrice={marketPrice} isCompleted={round?.status === 'completed'} />
          ))}
          {participants.length === 0 && (
            <p className="text-gray-500 text-sm">No agents in this arena yet</p>
          )}
        </div>

        {/* Middle Column - Reasoning Feed */}
        <div className="col-span-5">
          <LiveReasoningFeed reasonings={reasonings} selectedAgentId={selectedAgentId} />
        </div>

        {/* Right Column - Leaderboard & Trades */}
        <div className="col-span-4 space-y-6">
          <LiveLeaderboard leaderboard={leaderboard} participants={participants} isCompleted={round?.status === 'completed'} />
          <LiveTradeFeed trades={trades} selectedAgentId={selectedAgentId} />
        </div>
      </div>

      {/* Admin Actions */}
      {round.status === 'completed' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
          <Link
            href={`/arenas/${roundId}/payouts`}
            className="inline-block px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition"
          >
            View Payouts
          </Link>
        </div>
      )}
    </div>
  );
}
