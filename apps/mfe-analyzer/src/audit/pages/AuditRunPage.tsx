import '../../styles.css';
import React, { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Play, AlertCircle, XCircle, CheckCircle2, RefreshCw, Zap, BarChart2 } from 'lucide-react';
import { emit } from '@auditflow/event-bus';
import { AuditCategory, CheckResultDto } from '@auditflow/types';
import { useStartAudit } from '../application/useStartAudit';
import { useAuditSocket } from '../infrastructure/audit.socket';

const CATEGORIES: { id: AuditCategory; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'SEO',         label: 'SEO',         icon: Zap,       desc: 'Title, meta, headings, links' },
  { id: 'PERFORMANCE', label: 'Performance', icon: BarChart2, desc: 'Speed, assets, render-blocking' },
];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  CRITICAL: { color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   dot: 'bg-red-500'   },
  WARNING:  { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
  INFO:     { color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200',  dot: 'bg-blue-400'  },
};

function CheckItem({ check }: { check: CheckResultDto }) {
  const cfg = SEVERITY_CONFIG[check.severity] ?? SEVERITY_CONFIG.INFO;
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0 bg-white">
      <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800">{check.message}</p>
        {check.affectedUrl && (
          <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">{check.affectedUrl}</p>
        )}
      </div>
      <span className={`badge border shrink-0 text-[10px] ${cfg.color} ${cfg.bg} ${cfg.border}`}>
        {check.severity}
      </span>
    </div>
  );
}

export default function AuditRunPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Set<AuditCategory>>(new Set(['SEO', 'PERFORMANCE']));

  const { auditId, starting, error, start, reset } = useStartAudit();
  const socket = useAuditSocket(auditId);
  const isDone = socket.status === 'COMPLETED' || socket.status === 'FAILED';

  useEffect(() => {
    if (socket.status === 'COMPLETED' && auditId) {
      setTimeout(() => {
        emit({ type: 'auditflow:navigate', payload: { route: `/reports/${auditId}` } });
      }, 1500);
    }
  }, [socket.status, auditId]);

  const toggleCategory = (cat: AuditCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    if (projectId) start(projectId, [...categories]);
  };

  const critCount = socket.liveChecks.filter((c) => c.severity === 'CRITICAL').length;
  const warnCount = socket.liveChecks.filter((c) => c.severity === 'WARNING').length;

  return (
    <div className="p-8 max-w-3xl">
      <button
        onClick={() => emit({ type: 'auditflow:navigate', payload: { route: `/projects/${projectId}` } })}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-600 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to project
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Run Audit</h1>
        <p className="text-sm text-slate-500 mt-1">Select categories and start the scan</p>
      </div>

      {!auditId && (
        <form onSubmit={handleStart}>
          <div className="card p-6 mb-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Audit categories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {CATEGORIES.map(({ id, label, icon: Icon, desc }) => {
                const active = categories.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleCategory(id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer ${
                      active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-brand-gradient' : 'bg-slate-100'
                    }`}>
                      <Icon size={15} className={active ? 'text-white' : 'text-slate-400'} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${active ? 'text-brand-700' : 'text-slate-700'}`}>{label}</p>
                      <p className={`text-xs mt-0.5 ${active ? 'text-brand-500' : 'text-slate-400'}`}>{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-4">
                <AlertCircle size={15} className="shrink-0 text-red-500" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={starting || categories.size === 0}
              className="btn-primary w-full py-3"
            >
              {starting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Starting…</>
              ) : (
                <><Play size={15} />Start Audit</>
              )}
            </button>
          </div>
        </form>
      )}

      {auditId && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                {socket.status === 'COMPLETED' ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                ) : socket.status === 'FAILED' ? (
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle size={16} className="text-red-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {socket.status === 'COMPLETED' ? 'Audit complete — redirecting…' :
                     socket.status === 'FAILED'    ? 'Audit failed' :
                     `Scanning… ${socket.percent}%`}
                  </p>
                  {socket.currentUrl && !isDone && (
                    <p className="text-xs text-slate-400 font-mono truncate max-w-xs mt-0.5">
                      {socket.currentUrl}
                    </p>
                  )}
                </div>
              </div>
              <span className={`badge border text-xs ${
                socket.status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                socket.status === 'FAILED'    ? 'text-red-700 bg-red-50 border-red-200' :
                                                'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                {socket.status}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ease-out ${
                  socket.status === 'FAILED' ? 'bg-red-400' :
                  socket.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-brand-gradient'
                }`}
                style={{ width: `${isDone ? 100 : socket.percent}%` }}
              />
            </div>

            {socket.liveChecks.length > 0 && (
              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-red-600">{critCount}</span> critical
                </span>
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-amber-600">{warnCount}</span> warnings
                </span>
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{socket.liveChecks.length}</span> total
                </span>
              </div>
            )}
          </div>

          {socket.liveChecks.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Live Issues</h2>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {socket.liveChecks.map((check, i) => <CheckItem key={i} check={check} />)}
              </div>
            </div>
          )}

          {socket.status === 'FAILED' && (
            <button onClick={reset} className="btn-secondary w-full py-2.5">
              <RefreshCw size={14} /> Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
