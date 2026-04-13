import React, { useState } from 'react';
import { AuditCategory, CheckResultDto, CheckSeverity } from '@auditflow/types';
import { Filter, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  checks: CheckResultDto[];
}

const SEVERITY_ORDER: CheckSeverity[] = ['CRITICAL', 'WARNING', 'INFO'];

const SEVERITY_CONFIG: Record<CheckSeverity, { chip: string; row: string; dot: string; label: string }> = {
  CRITICAL: {
    chip: 'bg-red-50 text-red-700 border-red-200',
    row:  'border-red-100 bg-red-50/60',
    dot:  'bg-red-500',
    label: 'Critical',
  },
  WARNING: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    row:  'border-amber-100 bg-amber-50/60',
    dot:  'bg-amber-400',
    label: 'Warning',
  },
  INFO: {
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    row:  'border-blue-100 bg-blue-50/40',
    dot:  'bg-blue-400',
    label: 'Info',
  },
};

function CheckRow({ check }: { check: CheckResultDto }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[check.severity];

  return (
    <div className={`rounded-xl border ${cfg.row} transition-all duration-150`}>
      <button
        onClick={() => check.details ? setOpen((v) => !v) : undefined}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left ${check.details ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-snug">{check.message}</p>
          {check.affectedUrl && (
            <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{check.affectedUrl}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400">{check.category}</span>
          {check.details && (
            open ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />
          )}
        </div>
      </button>
      {open && check.details && (
        <div className="px-4 pb-3">
          <pre className="text-xs bg-white/70 border border-slate-200 p-3 rounded-lg overflow-x-auto text-slate-600">
            {JSON.stringify(check.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ChecksList({ checks }: Props) {
  const [filterSeverity, setFilterSeverity] = useState<CheckSeverity | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<AuditCategory | 'ALL'>('ALL');

  const categories = [...new Set(checks.map((c) => c.category))] as AuditCategory[];

  const counts = SEVERITY_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: checks.filter((c) => c.severity === s).length }),
    {} as Record<CheckSeverity, number>,
  );

  const filtered = [...checks]
    .filter((c) =>
      (filterSeverity === 'ALL' || c.severity === filterSeverity) &&
      (filterCategory === 'ALL' || c.category === filterCategory),
    )
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
          <Filter size={12} /> Filter:
        </div>

        <button
          onClick={() => setFilterSeverity('ALL')}
          className={`badge border text-xs cursor-pointer transition-all ${
            filterSeverity === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          All ({checks.length})
        </button>

        {SEVERITY_ORDER.map((s) => {
          if (!counts[s]) return null;
          const cfg = SEVERITY_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterSeverity((v) => (v === s ? 'ALL' : s))}
              className={`badge border text-xs cursor-pointer transition-all gap-1.5 ${
                filterSeverity === s ? cfg.chip : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label} ({counts[s]})
            </button>
          );
        })}

        {categories.length > 1 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as AuditCategory | 'ALL')}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-600 focus:outline-none focus:border-brand-400 ml-auto"
          >
            <option value="ALL">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-slate-400">No issues match the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((check, i) => <CheckRow key={i} check={check} />)}
        </div>
      )}
    </div>
  );
}
