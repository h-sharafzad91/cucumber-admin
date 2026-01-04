'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRound, getParticipants } from '@/lib/api';

export default function ArenaDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.id as string;

  const [round, setRound] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [roundData, participantsData] = await Promise.all([
          getRound(roundId),
          getParticipants(roundId).catch(() => ({ participants: [] })),
        ]);
        setRound(roundData.round);
        setParticipants(participantsData.participants || []);
      } catch (err) {
        console.error('Failed to fetch arena details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (roundId) {
      fetchData();
    }
  }, [roundId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-gray-400 mb-4">Arena not found</div>
        <Link href="/arenas" className="text-primary-400 hover:text-primary-300">
          Back to Arenas
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const calculateDuration = () => {
    if (!round.start_time || !round.end_time) return '-';
    const start = new Date(round.start_time).getTime();
    const end = new Date(round.end_time).getTime();
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/arenas"
            className="text-primary-400 hover:text-primary-300 text-sm mb-2 inline-block"
          >
            ← Back to Arenas
          </Link>
          <h1 className="text-3xl font-bold">{round.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`px-3 py-1 rounded text-sm ${
                round.status === 'active'
                  ? 'bg-green-900 text-green-300'
                  : round.status === 'completed'
                  ? 'bg-gray-700 text-gray-300'
                  : round.status === 'settling'
                  ? 'bg-blue-900 text-blue-300'
                  : 'bg-yellow-900 text-yellow-300'
              }`}
            >
              {round.status}
            </span>
            <span className="text-gray-400 capitalize">{round.arena_type || 'tournament'}</span>
          </div>
        </div>
      </div>

      {/* Arena Banner */}
      {round.banner_url && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <img
            src={round.banner_url}
            alt={round.name}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* General Information */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">General Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Arena Name</div>
            <div className="font-medium">{round.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Arena Type</div>
            <div className="font-medium capitalize">{round.arena_type || 'tournament'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Trading Pair</div>
            <div className="font-medium">{round.trading_pair || 'ETH/USDC'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Tick Interval Range</div>
            <div className="font-medium">
              {round.min_tick_interval || 10}s - {round.max_tick_interval || 120}s
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Timeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Scheduled Start</div>
            <div className="font-medium">{formatDate(round.scheduled_start_time)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Actual Start</div>
            <div className="font-medium">{formatDate(round.start_time)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">End Time</div>
            <div className="font-medium">{formatDate(round.end_time)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Duration</div>
            <div className="font-medium">{calculateDuration()}</div>
          </div>
        </div>
      </div>

      {/* Financials */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Financials & Economics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Starting Prize Pool (Seed)</div>
            <div className="font-medium text-primary-400">
              ${round.prize_pool_seed?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Buy-In Fee</div>
            <div className="font-medium">${round.buy_in_fee?.toFixed(2) || '0.00'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Protocol Fee</div>
            <div className="font-medium">{round.protocol_fee_percent || 0}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Prize Pool</div>
            <div className="font-medium text-green-400">
              ${round.current_pool_size?.toFixed(2) || round.prize_pool_seed?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      </div>

      {/* Capacity & Participation */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Capacity & Participation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Agent Limit</div>
            <div className="font-medium">{round.max_participants || '∞'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Participants</div>
            <div className="font-medium">
              {round.current_participants || 0} /{' '}
              {round.max_participants || '∞'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Winner Count</div>
            <div className="font-medium">{round.winner_count || Object.keys(round.payout_structure || {}).length}</div>
          </div>
        </div>
      </div>

      {/* Payout Structure */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Payout Structure</h2>
        <div className="space-y-3">
          {round.payout_structure && Object.entries(round.payout_structure)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([rank, percentage]: [string, any]) => (
              <div key={rank} className="flex items-center justify-between py-2 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  {Number(rank) <= 3 && (
                    <span className="text-2xl">
                      {Number(rank) === 1 ? '🥇' : Number(rank) === 2 ? '🥈' : '🥉'}
                    </span>
                  )}
                  <span className="font-medium">
                    Rank {rank}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{percentage}%</div>
                  <div className="text-sm text-gray-400">
                    ${((round.current_pool_size || round.prize_pool_seed || 0) * percentage / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Participants List */}
      {participants.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Participants ({participants.length})</h2>
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={participant.id || index}
                className="flex items-center justify-between p-3 bg-gray-750 rounded-lg"
              >
                <div>
                  <div className="font-medium">{participant.agent_name || `Agent ${participant.agent_id?.slice(0, 8)}`}</div>
                  <div className="text-sm text-gray-400">
                    Agent ID: {participant.agent_id?.slice(0, 8)}...
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {participant.current_balance !== undefined
                      ? `$${participant.current_balance.toFixed(2)}`
                      : '-'}
                  </div>
                  <div
                    className={`text-sm ${
                      (participant.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {participant.total_pnl !== undefined
                      ? `${participant.total_pnl >= 0 ? '+' : ''}${participant.total_pnl.toFixed(2)}%`
                      : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
