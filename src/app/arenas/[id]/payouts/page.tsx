'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getRound, getPayouts, getParticipants } from '@/lib/api';

export default function PayoutsPage() {
  const params = useParams();
  const roundId = params.id as string;

  const [round, setRound] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [roundData, payoutsData, participantsData] = await Promise.all([
          getRound(roundId),
          getPayouts(roundId).catch(() => ({ payouts: [] })),
          getParticipants(roundId).catch(() => ({ participants: [] })),
        ]);
        setRound(roundData.round);
        setPayouts(payoutsData.payouts || []);
        setParticipants(participantsData.participants || []);
      } catch (err) {
        console.error('Failed to fetch payouts:', err);
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

  // Create leaderboard sorted by PnL
  const leaderboard = [...participants].sort((a, b) => (b.total_pnl || 0) - (a.total_pnl || 0));

  // Calculate payouts if not provided by backend
  const calculatePayouts = () => {
    if (payouts.length > 0) return payouts;

    const calculatedPayouts: any[] = [];
    const totalPool = round.current_pool_size || round.prize_pool_seed || 0;
    const payoutStructure = round.payout_structure || {};

    leaderboard.forEach((participant, index) => {
      const rank = index + 1;
      const percentage = payoutStructure[rank];

      if (percentage) {
        calculatedPayouts.push({
          agent_id: participant.agent_id,
          agent_name: participant.agent_name,
          rank,
          pnl_percent: participant.total_pnl || 0,
          payout_amount: (totalPool * percentage) / 100,
          payout_percent: percentage,
        });
      }
    });

    return calculatedPayouts;
  };

  const finalPayouts = calculatePayouts();
  const totalPaidOut = finalPayouts.reduce((sum, p) => sum + (p.payout_amount || 0), 0);

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
          <h1 className="text-3xl font-bold">Payouts - {round.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`px-3 py-1 rounded text-sm ${
                round.status === 'completed'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-yellow-900 text-yellow-300'
              }`}
            >
              {round.status}
            </span>
          </div>
        </div>
      </div>

      {/* Settlement Summary */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Settlement Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Total Prize Pool</div>
            <div className="text-2xl font-bold text-primary-400">
              ${(round.current_pool_size || round.prize_pool_seed || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Total Paid Out</div>
            <div className="text-2xl font-bold text-green-400">
              ${totalPaidOut.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Winners</div>
            <div className="text-2xl font-bold">{finalPayouts.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Total Participants</div>
            <div className="text-2xl font-bold">{participants.length}</div>
          </div>
        </div>
      </div>

      {/* Winners Table */}
      {finalPayouts.length > 0 && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Winners</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr>
                  <th className="text-left px-6 py-3 text-sm text-gray-400">Rank</th>
                  <th className="text-left px-6 py-3 text-sm text-gray-400">Agent</th>
                  <th className="text-right px-6 py-3 text-sm text-gray-400">PnL %</th>
                  <th className="text-right px-6 py-3 text-sm text-gray-400">Payout %</th>
                  <th className="text-right px-6 py-3 text-sm text-gray-400">Payout Amount</th>
                </tr>
              </thead>
              <tbody>
                {finalPayouts.map((payout, index) => (
                  <tr key={payout.agent_id || index} className="border-t border-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {payout.rank <= 3 && (
                          <span className="text-2xl">
                            {payout.rank === 1 ? '🥇' : payout.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        )}
                        <span className="font-semibold">#{payout.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">
                          {payout.agent_name || `Agent ${payout.agent_id?.slice(0, 8)}`}
                        </div>
                        <div className="text-sm text-gray-400">
                          {payout.agent_id?.slice(0, 12)}...
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${
                      payout.pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {payout.pnl_percent >= 0 ? '+' : ''}{payout.pnl_percent.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {payout.payout_percent.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-lg text-primary-400">
                        ${payout.payout_amount.toFixed(2)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-750">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right font-semibold">
                    Total Distributed:
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-lg text-green-400">
                      ${totalPaidOut.toFixed(2)}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Full Leaderboard</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-gray-400">Rank</th>
                <th className="text-left px-6 py-3 text-sm text-gray-400">Agent</th>
                <th className="text-right px-6 py-3 text-sm text-gray-400">PnL %</th>
                <th className="text-right px-6 py-3 text-sm text-gray-400">Final Balance</th>
                <th className="text-right px-6 py-3 text-sm text-gray-400">Trades</th>
                <th className="text-right px-6 py-3 text-sm text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((participant, index) => {
                const isWinner = finalPayouts.some(p => p.agent_id === participant.agent_id);
                return (
                  <tr
                    key={participant.id || index}
                    className={`border-t border-gray-700 ${isWinner ? 'bg-primary-900/10' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <span className="text-2xl">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                        <span className="font-semibold">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">
                          {participant.agent_name || `Agent ${participant.agent_id?.slice(0, 8)}`}
                        </div>
                        <div className="text-sm text-gray-400">
                          {participant.agent_id?.slice(0, 12)}...
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${
                      (participant.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(participant.total_pnl || 0) >= 0 ? '+' : ''}
                      {(participant.total_pnl || 0).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      ${(participant.current_balance || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {participant.total_trades || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isWinner && (
                        <span className="px-2 py-1 bg-primary-900/30 text-primary-300 rounded text-xs font-medium">
                          Winner
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculation Breakdown */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Prize Pool Calculation</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Starting Seed:</span>
            <span className="font-medium">${round.prize_pool_seed?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Buy-In Contributions:</span>
            <span className="font-medium text-green-400">
              +${((round.current_participants || 0) * (round.buy_in_fee || 0)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Protocol Fee ({round.protocol_fee_percent || 0}%):</span>
            <span className="font-medium text-red-400">
              -${(((round.current_participants || 0) * (round.buy_in_fee || 0) * (round.protocol_fee_percent || 0)) / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between py-3 border-t border-gray-700 font-semibold text-lg">
            <span>Total Prize Pool:</span>
            <span className="text-primary-400">
              ${(round.current_pool_size || round.prize_pool_seed || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
