import '../../styles.css';
import React, { FormEvent, useRef, useState } from 'react';
import { Plus, Search, Globe, X, AlertCircle, FolderOpen } from 'lucide-react';
import { ProjectWithLastAudit } from '@auditflow/types';
import { ProjectCard } from '../components/ProjectCard';
import { useProjectList } from '../application/useProjectList';

interface NewProjectForm { name: string; url: string }

function NewProjectModal({
  onClose,
  onCreate,
  saving,
  error,
}: {
  onClose: () => void;
  onCreate: (data: NewProjectForm) => Promise<void>;
  saving: boolean;
  error: string;
}) {
  const [form, setForm] = useState<NewProjectForm>({ name: '', url: '' });
  const nameRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => { nameRef.current?.focus(); }, []);
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onCreate(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative z-10 bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">New Project</h2>
            <p className="text-xs text-slate-400 mt-0.5">Add a site to monitor and audit</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Project name <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
              placeholder="My Website"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              URL <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                required
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="input pl-9"
                placeholder="https://example.com"
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
              <AlertCircle size={14} className="shrink-0 text-red-500" />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</>
              ) : (
                <><Plus size={14} />Create project</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectListPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const { projects, loading, error, deleteProject, createProject } = useProjectList(search);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    await deleteProject(id);
  };

  const handleCreate = async (data: { name: string; url: string }) => {
    setSaving(true);
    setModalError('');
    try {
      await createProject(data);
      setShowModal(false);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showModal && (
        <NewProjectModal
          onClose={() => { setShowModal(false); setModalError(''); }}
          onCreate={handleCreate}
          saving={saving}
          error={modalError}
        />
      )}

      <div className="px-10 py-10 pb-16 max-w-screen-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {loading ? '—' : `${projects.length} site${projects.length !== 1 ? 's' : ''} monitored`}
          </p>
        </div>

        <div className="card flex items-center justify-between gap-3 px-4 py-3 mb-8">
          <div className="relative" style={{ width: '340px' }}>
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="input pl-9"
            />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={15} />
            New Project
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={15} className="shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="flex gap-3 mb-5">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-xl w-2/5 mb-5" />
                <div className="h-9 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
              <FolderOpen size={24} className="text-brand-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1.5">No projects yet</h3>
            <p className="text-sm text-slate-400 mb-6">Add your first site to start tracking SEO and performance</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={15} /> New Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {projects.map((p: ProjectWithLastAudit) => (
              <ProjectCard key={p.id} project={p} onDeleted={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
