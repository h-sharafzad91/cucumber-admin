'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRound } from '@/lib/api';
import { TradingPairCombobox } from '@/components/TradingPairCombobox';

type Step = 'configuration' | 'preview';

export default function CreateArenaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('configuration');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    arena_type: 'tournament' as 'tournament' | 'contest',
    trading_pair: 'BTC/USDT',
    prize_pool_seed: 5000,
    buy_in_fee: 50,
    protocol_fee_percent: 15,
    agent_limit: 50,
    winner_count: 3,
    min_tick_interval: 300,
    max_tick_interval: 3600,
    scheduled_start_time: '',
    duration: 5,
    duration_unit: 'days' as 'hours' | 'days',
  });

  const [payoutStructure, setPayoutStructure] = useState<Record<string, number>>({
    '1': 50,
    '2': 30,
    '3': 20,
  });

  function handleInputChange(field: string, value: any) {
    if (typeof value === 'number' && isNaN(value)) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleArenaTypeChange(type: 'tournament' | 'contest') {
    if (type === 'contest') {
      setFormData(prev => ({
        ...prev,
        arena_type: type,
        prize_pool_seed: 0,
        buy_in_fee: 5,
        agent_limit: 5,
        winner_count: 2,
        min_tick_interval: 300,
        max_tick_interval: 300,
        duration: 2,
        duration_unit: 'minutes' as any,
      }));
      setPayoutStructure({ '1': 70, '2': 30 });
    } else {
      setFormData(prev => ({
        ...prev,
        arena_type: type,
        prize_pool_seed: 5000,
        buy_in_fee: 50,
        agent_limit: 50,
        winner_count: 3,
        min_tick_interval: 300,
        max_tick_interval: 3600,
        duration: 5,
        duration_unit: 'days',
      }));
      setPayoutStructure({ '1': 50, '2': 30, '3': 20 });
    }
  }

  const isContest = formData.arena_type === 'contest';

  function handleWinnerCountChange(count: number) {
    if (isNaN(count) || count < 1) return;
    setFormData((prev) => ({ ...prev, winner_count: count }));

    // Regenerate payout structure with equal distribution
    const newPayout: Record<string, number> = {};
    const equalShare = Math.floor(100 / count);
    const remainder = 100 - (equalShare * count);

    for (let i = 1; i <= count; i++) {
      newPayout[i.toString()] = i === 1 ? equalShare + remainder : equalShare;
    }
    setPayoutStructure(newPayout);
  }

  function handlePayoutChange(rank: string, value: number) {
    if (isNaN(value)) return;
    setPayoutStructure((prev) => ({ ...prev, [rank]: value }));
  }

  function calculateTotalPayout() {
    return Object.values(payoutStructure).reduce((sum, val) => sum + val, 0);
  }

  function calculateMaxPool() {
    return (
      formData.prize_pool_seed +
      formData.agent_limit * formData.buy_in_fee -
      (formData.agent_limit * formData.buy_in_fee * formData.protocol_fee_percent) / 100
    );
  }

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      alert('Banner must be less than 5MB');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Banner must be PNG or JPG');
      return;
    }

    setBannerFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const totalPayout = calculateTotalPayout();
    if (!isContest && totalPayout !== 100) {
      alert(`Payout structure must total 100% (currently ${totalPayout}%)`);
      return;
    }

    if (currentStep === 'configuration') {
      setCurrentStep('preview');
      return;
    }

    setLoading(true);
    try {
      const banner_url = bannerPreview || undefined;

      let durationMinutes: number;
      switch (formData.duration_unit) {
        case 'hours':
          durationMinutes = formData.duration * 60;
          break;
        case 'days':
          durationMinutes = formData.duration * 60 * 24;
          break;
        default:
          durationMinutes = formData.duration;
      }
      let end_time: string | null = null;
      if (!isContest && formData.scheduled_start_time) {
        const startDate = new Date(formData.scheduled_start_time);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        end_time = endDate.toISOString();
      }

      await createRound({
        ...formData,
        scheduled_start_time: isContest ? null : formData.scheduled_start_time || null,
        end_time,
        settings: {
          duration_minutes: durationMinutes,
        },
        payout_structure: payoutStructure,
        banner_url,
      });
      router.push('/arenas');
    } catch (err) {
      console.error('Failed to create arena:', err);
      alert('Failed to create arena');
    } finally {
      setLoading(false);
    }
  }

  if (currentStep === 'preview') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Preview & Confirm</h1>
          <p className="text-gray-400">
            Review your arena configuration before deployment
          </p>
        </div>

        {bannerPreview && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={bannerPreview}
              alt="Arena Banner"
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">
              General Information
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Arena Name:</span>
                <span className="font-medium">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="font-medium capitalize">{formData.arena_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trading Pair:</span>
                <span className="font-medium">{formData.trading_pair}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Start Time:</span>
                <span className="font-medium">
                  {formData.scheduled_start_time
                    ? new Date(formData.scheduled_start_time).toLocaleString()
                    : 'Not scheduled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Duration:</span>
                <span className="font-medium">
                  {formData.duration} {formData.duration_unit}
                  {formData.duration_unit === 'hours' && ` (${formData.duration * 60} min)`}
                  {formData.duration_unit === 'days' && ` (${formData.duration * 24} hrs)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tick Interval Range:</span>
                <span className="font-medium">{formData.min_tick_interval}s - {formData.max_tick_interval}s</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">
              Economics
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Prize Pool Seed:</span>
                <span className="font-medium">${formData.prize_pool_seed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Entry Fee:</span>
                <span className="font-medium">${formData.buy_in_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Protocol Fee:</span>
                <span className="font-medium">{formData.protocol_fee_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Participants:</span>
                <span className="font-medium">{formData.agent_limit}</span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-2">
                <span className="text-gray-400">Max Total Pool:</span>
                <span className="font-semibold text-primary-400">
                  ${calculateMaxPool().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-4 col-span-2">
            <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">
              Payout Structure
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(payoutStructure)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([rank, percent]) => (
                  <div
                    key={rank}
                    className="bg-gray-700/50 rounded-lg p-4 text-center"
                  >
                    <div className="text-2xl font-bold mb-1">
                      {parseInt(rank) === 1 && '🥇'}
                      {parseInt(rank) === 2 && '🥈'}
                      {parseInt(rank) === 3 && '🥉'}
                      {parseInt(rank) > 3 && `#${rank}`}
                    </div>
                    <div className="text-xl font-semibold text-primary-400">
                      {percent}%
                    </div>
                    <div className="text-sm text-gray-400">
                      ${((calculateMaxPool() * percent) / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setCurrentStep('configuration')}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition"
          >
            ← Back to Edit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition"
          >
            {loading ? 'Deploying...' : 'Deploy Arena'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Create New Arena</h1>
        <p className="text-gray-400">
          Configure a new trading competition with prize pool and economic settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">
            General Settings
          </h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Arena Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., BTC Winter War"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Arena Type</label>
              <select
                value={formData.arena_type}
                onChange={(e) => handleArenaTypeChange(e.target.value as 'tournament' | 'contest')}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
              >
                <option value="tournament">Tournament (Long, Big Prize Pools)</option>
                <option value="contest">Contest (Quick 2-min Matches)</option>
              </select>
              {isContest && (
                <p className="text-xs text-primary-400 mt-1">
                  Quick match mode: 2 min duration, 2-5 players, fixed payouts
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Trading Pair</label>
              <TradingPairCombobox
                value={formData.trading_pair}
                onChange={(value) => handleInputChange('trading_pair', value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Search or select market pair for trading</p>
            </div>
          </div>

          {isContest ? (
            <div className="bg-primary-900/20 border border-primary-500/30 rounded-lg p-4">
              <h3 className="font-medium text-primary-300 mb-2">Contest Settings (Fixed)</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="ml-2 font-medium">2 minutes</span>
                </div>
                <div>
                  <span className="text-gray-400">Tick Interval:</span>
                  <span className="ml-2 font-medium">10 seconds</span>
                </div>
                <div>
                  <span className="text-gray-400">Max Players:</span>
                  <span className="ml-2 font-medium">2-5 agents</span>
                </div>
                <div>
                  <span className="text-gray-400">Payout:</span>
                  <span className="ml-2 font-medium">70% / 30%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Contests start automatically via matchmaking when enough players join the queue
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Start Schedule (UTC)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_start_time}
                  onChange={(e) => handleInputChange('scheduled_start_time', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  When the arena will start accepting trades
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Duration</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    min="1"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Unit</label>
                  <select
                    value={formData.duration_unit}
                    onChange={(e) => handleInputChange('duration_unit', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">
            {isContest ? 'Entry Fee Tier' : 'Financials & Protocol Math'}
          </h2>

          {isContest ? (
            <div>
              <label className="block text-sm text-gray-400 mb-3">Select Entry Fee</label>
              <div className="grid grid-cols-3 gap-4">
                {[1, 5, 10].map(fee => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => handleInputChange('buy_in_fee', fee)}
                    className={`p-4 rounded-lg border-2 text-center transition ${
                      formData.buy_in_fee === fee
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-3xl font-bold">${fee}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {fee === 1 ? 'Casual' : fee === 5 ? 'Standard' : 'High Stakes'}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Prize pool = Entry fees from all players (no seed, 10% protocol fee)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Starting Prize Pool (Seed)
                </label>
                <input
                  type="number"
                  value={formData.prize_pool_seed}
                  onChange={(e) => handleInputChange('prize_pool_seed', parseFloat(e.target.value))}
                  min="0"
                  step="100"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Money put up by house/sponsors</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Buy-In (Entry Fee)
                </label>
                <input
                  type="number"
                  value={formData.buy_in_fee}
                  onChange={(e) => handleInputChange('buy_in_fee', parseFloat(e.target.value))}
                  min="0"
                  step="10"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Entry fee per agent in USDT</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Protocol Fee %
                </label>
                <input
                  type="number"
                  value={formData.protocol_fee_percent}
                  onChange={(e) => handleInputChange('protocol_fee_percent', parseFloat(e.target.value))}
                  min="0"
                  max="50"
                  step="0.5"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">% of Buy-In going to Treasury</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Agent Limit
                </label>
                <input
                  type="number"
                  value={formData.agent_limit}
                  onChange={(e) => handleInputChange('agent_limit', parseInt(e.target.value))}
                  min="2"
                  max="100"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {!isContest && (
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">
              Capacity & Payouts
            </h2>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Winner Count</label>
              <input
                type="number"
                value={formData.winner_count}
                onChange={(e) => handleWinnerCountChange(parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of winning positions (generates payout fields)
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-400 mb-2">Distribution Logic</div>
              {Object.entries(payoutStructure)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([rank, percent]) => (
                  <div key={rank} className="flex items-center gap-4">
                    <div className="w-24 text-gray-400">Rank {rank}</div>
                    <input
                      type="number"
                      value={percent}
                      onChange={(e) => handlePayoutChange(rank, parseFloat(e.target.value))}
                      min="0"
                      max="100"
                      step="1"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                    />
                    <div className="w-16 text-gray-400">%</div>
                  </div>
                ))}
            </div>

            <div className="bg-gray-700/50 rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total:</span>
                <span
                  className={
                    calculateTotalPayout() === 100 ? 'text-green-500' : 'text-red-500'
                  }
                >
                  {calculateTotalPayout()}%
                </span>
              </div>
              {calculateTotalPayout() !== 100 && (
                <p className="text-xs text-red-400 mt-1">
                  ⚠️ Must equal 100%
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">
            Visuals
          </h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Arena Banner
            </label>
            <div className="space-y-3">
              {bannerPreview ? (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setBannerFile(null);
                      setBannerPreview('');
                    }}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-gray-400">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG or JPG (MAX. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleBannerUpload}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {!isContest && (
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">
              Tick Interval Settings
            </h2>
            <p className="text-sm text-gray-400">
              Define the allowed tick interval range for agents joining this arena
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Min Tick Interval (seconds)
                </label>
                <input
                  type="number"
                  value={formData.min_tick_interval}
                  onChange={(e) => handleInputChange('min_tick_interval', parseInt(e.target.value))}
                  min="300"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Fastest allowed interval (min 5 minutes)</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Max Tick Interval (seconds)
                </label>
                <input
                  type="number"
                  value={formData.max_tick_interval}
                  onChange={(e) => handleInputChange('max_tick_interval', parseInt(e.target.value))}
                  min="300"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Slowest allowed interval (min 5 minutes)</p>
              </div>
            </div>

            {formData.min_tick_interval > formData.max_tick_interval && (
              <p className="text-xs text-red-400">
                Min interval must be less than or equal to max interval
              </p>
            )}
          </div>
        )}

        <div className="bg-gray-700/30 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold">
            {isContest ? 'Contest Prize Pool' : 'Prize Pool Preview (Math Engine)'}
          </h3>
          {isContest ? (
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Entry Fee:</span>
                <span>${formData.buy_in_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Players (2-5):</span>
                <span>Variable</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Protocol Fee (10%):</span>
                <span>Deducted from pool</span>
              </div>
              <div className="flex justify-between font-semibold text-primary-400 pt-2 border-t border-gray-600">
                <span>Example (5 players):</span>
                <span>${(5 * formData.buy_in_fee * 0.9).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                1st place: 70% | 2nd place: 30%
              </div>
            </div>
          ) : (
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Seed Amount:</span>
                <span>${formData.prize_pool_seed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">
                  Buy-ins ({formData.agent_limit} max):
                </span>
                <span>
                  ${(formData.agent_limit * formData.buy_in_fee).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Protocol Fee ({formData.protocol_fee_percent}%):</span>
                <span>
                  -$
                  {(
                    (formData.agent_limit *
                      formData.buy_in_fee *
                      formData.protocol_fee_percent) /
                    100
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-primary-400 pt-2 border-t border-gray-600">
                <span>Max Total Pool:</span>
                <span>${calculateMaxPool().toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={calculateTotalPayout() !== 100 || formData.min_tick_interval > formData.max_tick_interval}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition"
          >
            Preview & Confirm →
          </button>
        </div>
      </form>
    </div>
  );
}
