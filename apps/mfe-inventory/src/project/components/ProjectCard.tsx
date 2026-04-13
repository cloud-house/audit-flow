import React, { useState } from 'react';
import { Globe, ArrowRight, Play, Trash2, Clock, TrendingUp } from 'lucide-react';
import { emit } from '@auditflow/event-bus';
import { ProjectWithLastAudit } from '@auditflow/types';

interface Props {
  project: ProjectWithLastAudit;
  onDeleted: (id: string) => void;
}

function ScorePill({ label, score }: { label: string; score: number | null | undefined }) {
  if (score == null) return null;
  const color =
    score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                  'text-red-700 bg-red-50 border-red-200';
  return (
    <div className={`flex flex-col items-center rounded-xl border text-center px-3.5 py-2 min-w-[54px] ${color}`}>
      <span className="text-xl font-bold leading-none">{score}</span>
      <span className="text-[10px] font-medium opacity-60 leading-none mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function relativeTime(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('pl-PL');
}

export function ProjectCard({ project, onDeleted }: Props) {
  const [hovered, setHovered] = useState(false);
  const navigate = (route: string) => emit({ type: 'auditflow:navigate', payload: { route } });

  const hasScores = project.lastAudit &&
    (project.lastAudit.scoreSeo != null || project.lastAudit.scorePerf != null);

  return (
    <div
      className={`card flex flex-col p-6 transition-all duration-200 ${hovered ? 'shadow-card-hover -translate-y-0.5' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0 shadow-brand">
          <Globe size={17} className="text-white" />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          <p className="text-sm font-semibold text-slate-900 truncate leading-snug hover:text-brand-600 transition-colors">
            {project.name}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{project.url}</p>
        </div>
        <button
          onClick={() => onDeleted(project.id)}
          title="Delete project"
          className={`p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer shrink-0 ${hovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex-1 mb-5">
        {hasScores ? (
          <div className="flex items-end gap-2">
            <ScorePill label="SEO"  score={project.lastAudit?.scoreSeo} />
            <ScorePill label="Perf" score={project.lastAudit?.scorePerf} />
            {project.lastAudit?.completedAt && (
              <div className="ml-auto flex items-center gap-1">
                <Clock size={11} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-400">{relativeTime(project.lastAudit.completedAt)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-3">
            <TrendingUp size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400">No audits yet</span>
            <span className="text-xs text-slate-300 ml-auto">Run first scan →</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t border-slate-100">
        <button
          onClick={() => navigate(`/projects/${project.id}/audit`)}
          className="btn-primary flex-1 py-2 text-xs"
        >
          <Play size={12} />
          Run Audit
        </button>
        <button
          onClick={() => navigate(`/projects/${project.id}`)}
          className="btn-secondary py-2 px-3.5 text-xs"
        >
          Details
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
