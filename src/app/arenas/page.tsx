'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getRounds,
  getParticipants,
  startRound,
  stopRound,
  deleteRound,
  settleRound,
  getPoolInfo,
} from '@/lib/api';

export default function ArenasPage() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);

  async function fetchRounds() {
    try {
      const { rounds: data } = await getRounds();
      setRounds(data);
    } catch (err) {
      console.error('Failed to fetch rounds:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRounds();
  }, []);

  async function handleAction(
    action: string,
    roundId: string,
    actionFn: (id: string) => Promise<any>
  ) {
    setActionLoading(`${action}-${roundId}`);
    try {
      await actionFn(roundId);
      await fetchRounds();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
      alert(`Failed to ${action} round`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleShowPoolInfo(round: any) {
    setSelectedRound(round);
    try {
      const { pool } = await getPoolInfo(round.id);
      setPoolInfo(pool);
    } catch (err) {
      console.error('Failed to fetch pool info:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Arena Management</h1>
          <p className="text-gray-400">Start, stop, and settle trading arenas</p>
        </div>
        <Link
          href="/arenas/create"
          className="bg-primary-600 hover:bg-primary-700 px-6 py-3 rounded-lg font-medium transition"
        >
          Create Arena
        </Link>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-750">
            <tr>
              <th className="text-left px-4 py-3 text-sm text-gray-400">Name</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">Type</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">Status</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">Prize Pool</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">Buy-In</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">Participants</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">Details</th>
              <th className="text-right px-4 py-3 text-sm text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => (
              <tr key={round.id} className="border-t border-gray-700">
                <td className="px-4 py-3">{round.name}</td>
                <td className="px-4 py-3 capitalize">{round.arena_type || 'tournament'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
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
                </td>
                <td className="px-4 py-3">
                  {round.current_pool_size ? (
                    <button
                      onClick={() => handleShowPoolInfo(round)}
                      className="text-primary-400 hover:text-primary-300"
                    >
                      ${round.current_pool_size.toFixed(2)}
                    </button>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {round.buy_in_fee ? `$${round.buy_in_fee.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3">
                  {round.current_participants || 0} / {round.max_participants || '∞'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/arenas/${round.id}`}
                    className="text-primary-400 hover:text-primary-300 text-sm"
                  >
                    View Details
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {round.status === 'pending' && (
                      <button
                        onClick={() => handleAction('start', round.id, startRound)}
                        disabled={actionLoading === `start-${round.id}`}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-3 py-1 rounded text-sm"
                      >
                        {actionLoading === `start-${round.id}` ? '...' : 'Start'}
                      </button>
                    )}
                    {round.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAction('stop', round.id, stopRound)}
                          disabled={actionLoading === `stop-${round.id}`}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 px-3 py-1 rounded text-sm"
                        >
                          {actionLoading === `stop-${round.id}` ? '...' : 'Stop'}
                        </button>
                        <button
                          onClick={() => handleAction('settle', round.id, settleRound)}
                          disabled={actionLoading === `settle-${round.id}`}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-3 py-1 rounded text-sm"
                        >
                          {actionLoading === `settle-${round.id}` ? '...' : 'Settle'}
                        </button>
                      </>
                    )}
                    {round.status === 'completed' && (
                      <Link
                        href={`/arenas/${round.id}/payouts`}
                        className="text-primary-400 hover:text-primary-300 text-sm"
                      >
                        Payouts
                      </Link>
                    )}
                    <button
                      onClick={() => handleAction('delete', round.id, deleteRound)}
                      disabled={actionLoading === `delete-${round.id}`}
                      className="text-red-400 hover:text-red-300 text-sm ml-2"
                    >
                      {actionLoading === `delete-${round.id}` ? '...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rounds.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No arenas yet.{' '}
                  <Link href="/arenas/create" className="text-primary-400 hover:text-primary-300">
                    Create one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRound && poolInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setSelectedRound(null);
            setPoolInfo(null);
          }}
        >
          <div
            className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">Prize Pool Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Seed Amount:</span>
                <span>${poolInfo.seedAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Buy-In Contribution:</span>
                <span className="text-green-400">
                  +${poolInfo.buyInContribution?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Protocol Revenue:</span>
                <span className="text-red-400">
                  -${poolInfo.protocolRevenue?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-3 border-t border-gray-700">
                <span>Total Prize Pool:</span>
                <span className="text-primary-400">
                  ${poolInfo.totalPrizePool?.toFixed(2)}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedRound(null);
                setPoolInfo(null);
              }}
              className="mt-6 w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
