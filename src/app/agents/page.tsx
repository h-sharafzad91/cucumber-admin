'use client';

import { useEffect, useState } from 'react';
import { getAgents, deleteAgent } from '@/lib/api';

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchAgents() {
    try {
      const { agents: data } = await getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAgents();
  }, []);

  async function handleDelete(agent: any) {
    if (agent.is_locked) {
      alert('Cannot delete agent while in an active round');
      return;
    }
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    setActionLoading(agent.id);
    try {
      await deleteAgent(agent.id);
      await fetchAgents();
    } catch (err) {
      console.error('Failed to delete agent:', err);
      alert('Failed to delete agent');
    } finally {
      setActionLoading(null);
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Agent Management</h1>
        <p className="text-gray-400">
          Monitor and control agent activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{agent.name}</h3>
              <p className="text-sm text-gray-400">
                {agent.persona_config?.strategy || 'No strategy'}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">LLM Model:</span>
                <span>{agent.llm_model || 'claude-3.5-sonnet'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trading Style:</span>
                <span className="capitalize">
                  {agent.trading_style || 'normal'}
                </span>
              </div>
              {agent.leverage && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Leverage:</span>
                  <span className="text-yellow-400">{agent.leverage}x</span>
                </div>
              )}
              {agent.stop_loss_percent && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Stop-Loss:</span>
                  <span className="text-red-400">{agent.stop_loss_percent}%</span>
                </div>
              )}
              {agent.take_profit_percent && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Take-Profit:</span>
                  <span className="text-green-400">{agent.take_profit_percent}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Risk Tolerance:</span>
                <span className="capitalize">
                  {agent.persona_config?.risk_tolerance || '-'}
                </span>
              </div>
              {agent.is_locked && (
                <div className="text-yellow-400 text-xs mt-2">
                  🔒 Locked (in active round)
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => handleDelete(agent)}
                disabled={actionLoading === agent.id || agent.is_locked}
                className="w-full px-3 py-2 rounded text-sm font-medium bg-red-900/50 text-red-300 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {actionLoading === agent.id ? 'Deleting...' : 'Delete Agent'}
              </button>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            No agents registered yet
          </div>
        )}
      </div>
    </div>
  );
}
