import React, { useState } from 'react';

/* ─── Shared primitives ───────────────────────────────────── */

const SearchInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      placeholder="Search columns…"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
);

const DialogShell: React.FC<{
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, onClose, footer, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center space-x-2">
          {icon}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100" aria-label="Close">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Body */}
      <div className="flex flex-col min-h-0 flex-1">{children}</div>
      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl">
        {footer}
      </div>
    </div>
  </div>
);

const GearIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

/* ─── Table Settings Dialog ───────────────────────────────── */

export interface TableSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: string[];
  lockedColumns: string[];
  onLockedColumnsChange: (locked: string[]) => void;
}

export const TableSettingsDialog: React.FC<TableSettingsDialogProps> = ({
  isOpen, onClose, columns, lockedColumns, onLockedColumnsChange,
}) => {
  const [search, setSearch] = useState('');
  if (!isOpen) return null;

  const toggleLock = (column: string) => {
    if (lockedColumns.includes(column)) {
      onLockedColumnsChange(lockedColumns.filter(c => c !== column));
    } else {
      onLockedColumnsChange(columns.filter(c => lockedColumns.includes(c) || c === column));
    }
  };

  const query = search.toLowerCase();
  const filtered = columns.filter(c => c.toLowerCase().includes(query));
  const pinned = filtered.filter(c => lockedColumns.includes(c));
  const unpinned = filtered.filter(c => !lockedColumns.includes(c));

  return (
    <DialogShell
      title="Table Settings"
      icon={<GearIcon />}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={() => onLockedColumnsChange([])}
            disabled={lockedColumns.length === 0}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Clear all pins
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Done
          </button>
        </>
      }
    >
      <div className="flex flex-col min-h-0 px-6 py-4 space-y-4">
        <p className="text-sm text-gray-500">Pin columns to keep them visible while scrolling horizontally.</p>
        <SearchInput value={search} onChange={setSearch} />
        <div className="overflow-y-auto flex-1 min-h-0 -mx-2">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No columns match your search.</p>
          )}
          {pinned.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-2 mb-1">Pinned ({pinned.length})</p>
              {pinned.map(col => <ColumnPinRow key={col} column={col} pinned onToggle={() => toggleLock(col)} />)}
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1 mt-3">Columns</p>
              )}
              {unpinned.map(col => <ColumnPinRow key={col} column={col} pinned={false} onToggle={() => toggleLock(col)} />)}
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  );
};

const ColumnPinRow: React.FC<{ column: string; pinned: boolean; onToggle: () => void }> = ({ column, pinned, onToggle }) => (
  <div className={`flex items-center justify-between px-3 py-2 mx-2 rounded-lg mb-0.5 ${pinned ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
    <div className="flex items-center space-x-2 min-w-0">
      <svg className={`w-4 h-4 flex-shrink-0 ${pinned ? 'text-blue-500' : 'text-gray-300'}`} fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      <span className={`text-sm truncate ${pinned ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>{column}</span>
    </div>
    <button
      onClick={onToggle}
      className={`ml-3 flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${pinned ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      {pinned ? 'Unpin' : 'Pin'}
    </button>
  </div>
);

/* ─── Radar Settings Dialog ───────────────────────────────── */

export interface RadarSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  numericColumns: string[];
  radarColumns: string[];
  onRadarColumnsChange: (columns: string[]) => void;
  radarWeights: Record<string, number>;
  onRadarWeightsChange: (weights: Record<string, number>) => void;
}

export const RadarSettingsDialog: React.FC<RadarSettingsDialogProps> = ({
  isOpen, onClose, numericColumns, radarColumns, onRadarColumnsChange, radarWeights, onRadarWeightsChange,
}) => {
  const [search, setSearch] = useState('');
  if (!isOpen) return null;

  const defaultColumns = numericColumns.slice(0, 6);
  const isDefault =
    radarColumns.length === defaultColumns.length &&
    radarColumns.every((c, i) => c === defaultColumns[i]) &&
    Object.keys(radarWeights).length === 0;

  const toggleColumn = (column: string) => {
    if (radarColumns.includes(column)) {
      onRadarColumnsChange(radarColumns.filter(c => c !== column));
    } else {
      onRadarColumnsChange(numericColumns.filter(c => radarColumns.includes(c) || c === column));
    }
  };

  const setWeight = (column: string, weight: number) => {
    const next = { ...radarWeights, [column]: weight };
    if (weight === 1) delete next[column];
    onRadarWeightsChange(next);
  };

  const handleReset = () => {
    onRadarColumnsChange(defaultColumns);
    onRadarWeightsChange({});
  };

  const query = search.toLowerCase();
  const filtered = numericColumns.filter(c => c.toLowerCase().includes(query));

  return (
    <DialogShell
      title="Radar Chart Settings"
      icon={<GearIcon />}
      onClose={onClose}
      footer={
        <>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onRadarColumnsChange(numericColumns)}
              disabled={radarColumns.length === numericColumns.length}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Select all
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={() => onRadarColumnsChange([])}
              disabled={radarColumns.length === 0}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              disabled={isDefault}
              className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Done
            </button>
          </div>
        </>
      }
    >
      <div className="flex flex-col min-h-0 px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Choose columns and their relative weights for the radar chart.</p>
          {radarColumns.length > 0 && (
            <span className="ml-3 flex-shrink-0 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {radarColumns.length} selected
            </span>
          )}
        </div>
        <SearchInput value={search} onChange={setSearch} />
        <div className="overflow-y-auto flex-1 min-h-0 -mx-2">
          {filtered.length === 0 && numericColumns.length > 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No columns match your search.</p>
          )}
          {numericColumns.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No numeric columns in the current dataset.</p>
          )}
          {filtered.map(column => {
            const checked = radarColumns.includes(column);
            const weight = radarWeights[column] ?? 1;
            return (
              <div
                key={column}
                className={`flex items-center px-3 py-2 mx-2 rounded-lg mb-0.5 transition-colors ${checked ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
              >
                <label className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleColumn(column)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className={`text-sm truncate ${checked ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>{column}</span>
                </label>
                {checked && (
                  <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                    <input
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.5}
                      value={weight}
                      onChange={e => setWeight(column, parseFloat(e.target.value))}
                      className="w-20 accent-blue-600"
                      aria-label={`Weight for ${column}`}
                    />
                    <span className={`text-xs font-medium w-8 text-right tabular-nums ${weight !== 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {weight.toFixed(1)}×
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DialogShell>
  );
};

// Keep a default export so any stray import doesn't hard-break
export default TableSettingsDialog;
