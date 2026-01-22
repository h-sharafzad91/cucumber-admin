'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRounds, getAgents } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRounds: 0,
    activeRounds: 0,
    completedRounds: 0,
    totalAgents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [roundsRes, agentsRes] = await Promise.all([getRounds(), getAgents()]);
        const rounds = roundsRes.rounds;
        const agents = agentsRes.agents;

        setStats({
          totalRounds: rounds.length,
          activeRounds: rounds.filter((r: any) => r.status === 'active').length,
          completedRounds: rounds.filter((r: any) => r.status === 'completed').length,
          totalAgents: agents.length,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage arenas, agents, and monitor performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Rounds</div>
          <div className="text-3xl font-bold">{stats.totalRounds}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-primary-500">
          <div className="text-gray-400 text-sm mb-1">Active Rounds</div>
          <div className="text-3xl font-bold text-primary-500">{stats.activeRounds}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Completed</div>
          <div className="text-3xl font-bold">{stats.completedRounds}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Agents</div>
          <div className="text-3xl font-bold">{stats.totalAgents}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/arenas/create"
          className="bg-primary-600 hover:bg-primary-700 rounded-lg p-8 transition group"
        >
          <h3 className="text-xl font-semibold mb-2 group-hover:text-white">
            Create New Arena
          </h3>
          <p className="text-primary-100">
            Launch a new trading competition with custom prize pool and settings
          </p>
        </Link>

        <Link
          href="/arenas"
          className="bg-gray-800 hover:bg-gray-750 rounded-lg p-8 transition border border-gray-700 group"
        >
          <h3 className="text-xl font-semibold mb-2 group-hover:text-white">
            Manage Arenas
          </h3>
          <p className="text-gray-400">
            View, start, stop, and settle existing arenas
          </p>
        </Link>

        <Link
          href="/agents"
          className="bg-gray-800 hover:bg-gray-750 rounded-lg p-8 transition border border-gray-700 group"
        >
          <h3 className="text-xl font-semibold mb-2 group-hover:text-white">
            Manage Agents
          </h3>
          <p className="text-gray-400">
            View and manage registered agents
          </p>
        </Link>

        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h3 className="text-xl font-semibold mb-2">System Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">API</span>
              <span className="text-green-500">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Scheduler</span>
              <span className="text-green-500">Running</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">WebSocket</span>
              <span className="text-green-500">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
