import '../../styles.css';
import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Download, AlertCircle, XCircle, Info, CheckCircle2, FileText } from 'lucide-react';
import { emit } from '@auditflow/event-bus';
import { ScoreGauge } from '../components/ScoreGauge';
import { ChecksList } from '../components/ChecksList';
import { useReport } from '../application/useReport';

export default function ReportPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const { audit, report, checks, loading, error, downloading, downloadPdf } = useReport(auditId);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl space-y-4 animate-pulse">
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="flex gap-4 mt-6">
          {[1, 2].map((i) => <div key={i} className="w-36 h-36 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="card h-64 mt-4" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl max-w-lg">
          <AlertCircle size={15} className="shrink-0 text-red-500" />
          {error || 'Report not found.'}
        </div>
      </div>
    );
  }

  const critCount = checks.filter((c) => c.severity === 'CRITICAL').length;
  const warnCount = checks.filter((c) => c.severity === 'WARNING').length;
  const infoCount = checks.filter((c) => c.severity === 'INFO').length;

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => emit({ type: 'auditflow:navigate', payload: { route: `/projects/${audit.projectId}` } })}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-600 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to project
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Report</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">#{auditId?.slice(0, 8)}</p>
          {audit.completedAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(audit.completedAt).toLocaleString('pl-PL')}
            </p>
          )}
        </div>
        {report?.pdfAvailable && (
          <button onClick={downloadPdf} disabled={downloading} className="btn-primary">
            {downloading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Downloading…</>
            ) : (
              <><Download size={15} />Download PDF</>
            )}
          </button>
        )}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-5">Scores</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          {Object.entries(audit.scores).map(([cat, score]) => (
            <ScoreGauge key={cat} label={cat} score={score as number} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <XCircle size={16} className="text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-700 leading-none">{critCount}</p>
              <p className="text-xs text-red-500 mt-0.5">Critical</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-700 leading-none">{warnCount}</p>
              <p className="text-xs text-amber-500 mt-0.5">Warnings</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Info size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-700 leading-none">{infoCount}</p>
              <p className="text-xs text-blue-500 mt-0.5">Info</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <FileText size={16} className="text-slate-400" />
          <h2 className="text-base font-semibold text-slate-800">Issues</h2>
          <span className="badge bg-slate-100 text-slate-600 border-slate-200 border text-xs ml-auto">
            {checks.length} total
          </span>
        </div>
        {checks.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
              <CheckCircle2 size={22} className="text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No issues found</p>
            <p className="text-xs text-slate-400 mt-1">Your site passed all checks</p>
          </div>
        ) : (
          <ChecksList checks={checks} />
        )}
      </div>
    </div>
  );
}
