import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { useQueryStore } from '../store/queryStore';
import { formatRelativeTime } from '../utils/formatters';

// TODO: REPLACE WITH REAL API (Firebase Firestore) BEFORE PRODUCTION.
// Currently using localStorage — syncs only on same device.

const STATUS_META = {
  Open: { color: 'bg-red-500/10 text-red-400', dot: 'bg-red-400' },
  'In Progress': { color: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
  Resolved: { color: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
};

const PRIORITY_COLOR = {
  High: 'bg-red-500/10 text-red-400',
  Medium: 'bg-amber-500/10 text-amber-400',
  Low: 'bg-slate-800 text-slate-400',
};

export default function AdminQueries() {
  const navigate = useNavigate();

  const queries = useQueryStore((s) => s.queries);
  const adminReply = useQueryStore((s) => s.adminReply);
  const markResolved = useQueryStore((s) => s.markResolved);

  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? queries : queries.filter((q) => q.status === filter);
  const selectedQuery = queries.find((q) => q.id === selected);

  function sendReply() {
    if (!replyText.trim()) return;
    adminReply(selected, replyText.trim());
    setReplyText('');
  }

  const FILTERS = ['All', 'Open', 'In Progress', 'Resolved'];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-slate-800 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/admin-portal/dashboard')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Support Queries</h1>
          <p className="text-sm text-slate-400">Respond to farmer issues and questions</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
            {queries.filter((q) => q.status === 'Open').length} Open
          </span>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
            {queries.filter((q) => q.status === 'In Progress').length} In Progress
          </span>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left: Query List */}
        <div className={`flex flex-col border-r border-slate-800 ${selected ? 'hidden lg:flex w-80 shrink-0' : 'w-full lg:w-80 lg:shrink-0'}`}>
          {/* Filters */}
          <div className="flex gap-1 border-b border-slate-800 p-3">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-colors ${
                  filter === f ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-slate-600">
                <MessageSquare size={32} />
                <p className="text-sm font-semibold">No queries</p>
              </div>
            ) : filtered.map((query) => (
              <button
                key={query.id}
                type="button"
                onClick={() => setSelected(query.id)}
                className={`w-full border-b border-slate-800/50 p-4 text-left transition-colors hover:bg-slate-800/50 ${
                  selected === query.id ? 'bg-slate-800/50 border-l-2 border-l-emerald-500' : ''
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[query.priority]}`}>
                    {query.priority}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_META[query.status].color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[query.status].dot}`} />
                    {query.status}
                  </span>
                </div>
                <p className="mb-1 text-sm font-bold text-white line-clamp-1">{query.subject}</p>
                <p className="text-xs text-slate-500">
                  {query.farmerName} · {formatRelativeTime(query.createdAt, 'en')}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Detail / Reply */}
        {selected && selectedQuery ? (
          <div className="flex flex-1 flex-col min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors lg:hidden"
                >
                  <ArrowLeft size={12} /> Back to list
                </button>
                <h2 className="text-lg font-black text-white">{selectedQuery.subject}</h2>
                <p className="mt-0.5 text-sm text-slate-400">
                  {selectedQuery.farmerName} · {selectedQuery.farmerId} · {formatRelativeTime(selectedQuery.createdAt, 'en')}
                </p>
                {selectedQuery.farmerPhone && (
                  <p className="text-xs text-emerald-400">{selectedQuery.farmerPhone}</p>
                )}
              </div>
              {selectedQuery.status !== 'Resolved' && (
                <button
                  type="button"
                  onClick={() => markResolved(selected)}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
                >
                  <CheckCircle2 size={16} /> Mark Resolved
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Original message */}
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                  {selectedQuery.farmerName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{selectedQuery.farmerName}</span>
                    <span className="text-xs text-slate-500">{formatRelativeTime(selectedQuery.createdAt, 'en')}</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-slate-800 p-4 text-sm text-slate-200">
                    {selectedQuery.message}
                  </div>
                </div>
              </div>

              {/* All replies */}
              {selectedQuery.replies.map((reply, i) => (
                <div key={i} className={`flex gap-3 ${reply.isAdmin ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${reply.isAdmin ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    {reply.isAdmin ? 'A' : selectedQuery.farmerName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className={`mb-1 flex items-center gap-2 ${reply.isAdmin ? 'justify-end' : ''}`}>
                      <span className="text-xs text-slate-500">{formatRelativeTime(reply.createdAt, 'en')}</span>
                      <span className="text-sm font-bold text-white">{reply.isAdmin ? 'Admin' : selectedQuery.farmerName}</span>
                    </div>
                    <div className={`rounded-2xl p-4 text-sm ${
                      reply.isAdmin
                        ? 'rounded-tr-sm bg-emerald-900/50 border border-emerald-800/50 text-emerald-100'
                        : 'rounded-tl-sm bg-slate-800 text-slate-200'
                    }`}>
                      {reply.text}
                    </div>
                  </div>
                </div>
              ))}

              {selectedQuery.status === 'Resolved' && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-900/10 py-3">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-300">Query Resolved</span>
                </div>
              )}
            </div>

            {/* Reply Input */}
            {selectedQuery.status !== 'Resolved' && (
              <div className="border-t border-slate-800 p-4">
                <div className="flex gap-3">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder="Type a reply... (Enter to send)"
                    className="flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={!replyText.trim()}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white transition-all hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed self-end"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3 text-slate-600">
            <MessageSquare size={48} />
            <p className="font-semibold">Select a query to view details</p>
            <p className="text-sm text-slate-700">Farmer queries appear here in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}
