import '../../styles.css';
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft, Play, ExternalLink,
  CheckCircle2, Clock, XCircle, Loader2, ChevronRight,
} from 'lucide-react';
import { emit } from '@auditflow/event-bus';
import { AuditSummary } from '@auditflow/types';
import { useProjectDetail } from '../application/useProjectDetail';

function StatusBadge({ status }: { status: AuditSummary['status'] }) {
  const map: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
    COMPLETED: { label: 'Completed', className: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle2 },
    RUNNING:   { label: 'Running',   className: 'text-blue-700 bg-blue-50 border-blue-200',         Icon: Loader2 },
    PENDING:   { label: 'Pending',   className: 'text-amber-700 bg-amber-50 border-amber-200',      Icon: Clock },
    FAILED:    { label: 'Failed',    className: 'text-red-700 bg-red-50 border-red-200',            Icon: XCircle },
  };
  const { label, className, Icon } = map[status] ?? map.PENDING;
  return (
    <span className={`badge border gap-1 ${className}`}>
      <Icon size={11} className={status === 'RUNNING' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}

function ScorePill({ cat, score }: { cat: string; score: number }) {
  const style =
    score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                  'text-red-700 bg-red-50 border-red-200';
  return (
    <div className={`flex flex-col items-center px-2.5 py-1 rounded-lg border text-center min-w-[2.5rem] ${style}`}>
      <span className="text-sm font-bold leading-tight">{score}</span>
      <span className="text-[10px] opacity-70 leading-tight">{cat}</span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { project, audits, loading } = useProjectDetail(id);
  const navigate = (route: string) => emit({ type: 'auditflow:navigate', payload: { route } });

  if (loading) {
    return (
      <div className="p-8 max-w-4xl space-y-4 animate-pulse">
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="h-4 w-40 bg-slate-200 rounded" />
        <div className="card h-48 mt-6" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-sm text-slate-500">Project not found.</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-600 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} /> All projects
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mt-1.5 transition-colors"
          >
            {project.url}
            <ExternalLink size={12} />
          </a>
        </div>
        <button onClick={() => navigate(`/projects/${id}/audit`)} className="btn-primary">
          <Play size={14} /> Run Audit
        </button>
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Audit History</h2>
        {audits.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-3">
              <Play size={20} className="text-brand-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No audits yet</h3>
            <p className="text-xs text-slate-400 mb-4">Run the first audit to see results</p>
            <button onClick={() => navigate(`/projects/${id}/audit`)} className="btn-primary text-xs">
              <Play size={13} /> Start audit
            </button>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {audits.map((audit) => (
              <div
                key={audit.auditId}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                  audit.status === 'COMPLETED' ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-70'
                }`}
                onClick={() => audit.status === 'COMPLETED' && navigate(`/reports/${audit.auditId}`)}
              >
                <StatusBadge status={audit.status} />
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm text-slate-500 shrink-0">
                    {new Date(audit.createdAt).toLocaleString('pl-PL', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {audit.categories.map((cat) => (
                      <span key={cat} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {Object.entries(audit.scores).map(([cat, score]) => (
                    <ScorePill key={cat} cat={cat} score={score as number} />
                  ))}
                  {audit.status === 'COMPLETED' && <ChevronRight size={14} className="text-slate-300" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
