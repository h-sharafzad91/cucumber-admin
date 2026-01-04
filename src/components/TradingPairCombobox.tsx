'use client';

import { useState, useRef, useEffect } from 'react';

interface TradingPairComboboxProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const TRADING_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'BTC/USDC',
  'ETH/USDC',
  'SOL/USDC',
  'AVAX/USDT',
  'MATIC/USDT',
  'LINK/USDT',
  'UNI/USDT',
  'AAVE/USDT',
  'DOT/USDT',
  'ATOM/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'DOGE/USDT',
  'SHIB/USDT',
];

export function TradingPairCombobox({ value, onChange, required = false }: TradingPairComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredPairs = search
    ? TRADING_PAIRS.filter((pair) =>
        pair.toLowerCase().includes(search.toLowerCase())
      )
    : TRADING_PAIRS;

  useEffect(() => {
    if (isOpen && filteredPairs.length > 0) {
      setHighlightedIndex(0);
    }
  }, [isOpen, filteredPairs.length]);

  const handleSelect = (pair: string) => {
    onChange(pair);
    setSearch('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredPairs.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredPairs.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredPairs[highlightedIndex]) {
          handleSelect(filteredPairs[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value || 'Search or select trading pair...'}
          required={required}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredPairs.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              No trading pairs found
            </div>
          ) : (
            <div className="py-1">
              {filteredPairs.map((pair, index) => (
                <button
                  key={pair}
                  type="button"
                  onClick={() => handleSelect(pair)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-600 transition ${
                    index === highlightedIndex ? 'bg-gray-600' : ''
                  } ${value === pair ? 'text-primary-400 font-medium' : 'text-gray-200'}`}
                >
                  {pair}
                  {value === pair && (
                    <span className="float-right">
                      <svg
                        className="w-5 h-5 text-primary-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!isOpen && value && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {TRADING_PAIRS.includes(value) ? '✓' : 'Custom'}
        </div>
      )}
    </div>
  );
}
