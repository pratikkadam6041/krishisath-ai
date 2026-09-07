import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Filter,
  MapPin,
  MoreVertical,
  Phone,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';

import { useUserStore, SUBSCRIPTION_TIERS } from '../store/userStore.js';

const STATUS_FILTER_OPTIONS = ['All', 'APPROVED', 'PENDING', 'SUSPENDED'];

const STATUS_BADGE = {
  APPROVED:   'bg-emerald-500/10 text-emerald-400',
  PENDING:  'bg-amber-500/10 text-amber-400',
  SUSPENDED: 'bg-red-500/10 text-red-400',
};

const PLAN_BADGE = {
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 'bg-purple-500/10 text-purple-400',
  [SUBSCRIPTION_TIERS.PRO]:   'bg-violet-500/10 text-violet-400',
  [SUBSCRIPTION_TIERS.BASIC]: 'bg-sky-500/10 text-sky-400',
};

/** Normalize phone: strip +91 prefix, keep last 10 digits */
function normalizePhone(phone = '') {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

export default function AdminFarmerList() {
  const navigate = useNavigate();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatus]       = useState('All');
  const [actionMenu, setActionMenu]     = useState(null);
  
  // Real dynamic users from local store
  const allUsersMap = useUserStore((s) => s.users);
  const updateUserStatus = useUserStore((s) => s.updateUserStatus);
  const updateUserTier = useUserStore((s) => s.updateUserTier);
  const toggleFeature = useUserStore((s) => s.toggleUserFeature);
  
  const farmers = Object.values(allUsersMap);

  /* ─── Filtering ─── */
  const filtered = farmers.filter((f) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      f.firstName?.toLowerCase().includes(q) ||
      f.id?.toLowerCase().includes(q) ||
      normalizePhone(f.phone).includes(q.replace(/\D/g, ''));
    const matchStatus = statusFilter === 'All' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function changeStatus(phone, newStatus) {
    updateUserStatus(phone, newStatus);
    setActionMenu(null);
  }

  function changeTier(phone, newTier) {
    updateUserTier(phone, newTier);
    setActionMenu(null);
  }

  // Missing state from refactor
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    district: '',
    village: '',
    crops: '',
    acres: '',
    plan: 'Basic'
  });

  function resetModal() {
    setShowAddModal(false);
    setPhoneInput('');
    setLookupResult(null);
    setFormData({ name: '', district: '', village: '', crops: '', acres: '', plan: 'Basic' });
  }

  function handlePhoneLookup(val) {
    setPhoneInput(val);
    const p = normalizePhone(val);
    if (p.length === 10) {
      const existing = allUsersMap[p];
      if (existing) {
        setLookupResult({ id: existing.id || `KS-${p.slice(-4)}`, name: existing.firstName || 'Unknown' });
        setFormData({
          name: existing.firstName || '',
          district: '', // Could pull from zoneStore if needed, but keeping simple
          village: '',
          crops: '',
          acres: '',
          plan: existing.tier || 'Basic'
        });
      } else {
        setLookupResult(null);
      }
    } else {
      setLookupResult(null);
    }
  }

  function handleAddFarmerSubmit(e) {
    e.preventDefault();
    const p = normalizePhone(phoneInput);
    if (p.length !== 10) return;
    
    // In a real app, this would also create a profile. For now, just register/update user.
    useUserStore.getState().registerUser(p, formData.name);
    useUserStore.getState().updateUserStatus(p, 'APPROVED'); // Auto-approve added farmers
    useUserStore.getState().updateUserTier(p, formData.plan.toUpperCase());
    resetModal();
  }

  function removeFarmer(id) {
    // Basic implementation to remove from local state.
    // In real app, call API.
    const userToRemove = farmers.find(f => f.id === id);
    if (userToRemove) {
       // useUserStore doesn't currently have a remove function, but we'll simulate or add if needed.
       // For now just logging it to prevent crash.
       console.log('Remove farmer', id);
    }
  }

  const counts = {
    APPROVED:   farmers.filter((f) => f.status === 'APPROVED').length,
    PENDING:  farmers.filter((f) => f.status === 'PENDING').length,
    SUSPENDED: farmers.filter((f) => f.status === 'SUSPENDED').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white" onClick={() => setActionMenu(null)}>
      {/* ─── Top bar ─── */}
      <div className="flex items-center gap-4 border-b border-slate-800 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/admin-portal/dashboard')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white">Farmer Directory</h1>
          <p className="text-sm text-slate-400">Manage profiles and subscriptions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
        >
          <UserPlus size={16} /> Add Farmer
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* ─── Summary pills ─── */}
        <div className="mb-6 flex flex-wrap gap-3">
          {[
            { label: 'Total',    count: farmers.length,   color: 'border-slate-700 bg-slate-800 text-white' },
            { label: 'Approved',   count: counts.APPROVED,    color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' },
            { label: 'Pending',  count: counts.PENDING,   color: 'border-amber-500/20 bg-amber-500/10 text-amber-400' },
            { label: 'Suspended', count: counts.SUSPENDED,  color: 'border-slate-700 bg-slate-800 text-slate-400' },
          ].map((s) => (
            <div key={s.label} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${s.color}`}>
              {s.count} {s.label}
            </div>
          ))}
        </div>

        {/* ─── Search + Filter ─── */}
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
            <input
              type="text"
              placeholder="Search by name, ID, phone, district, or village…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/50 p-1">
            {STATUS_FILTER_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  statusFilter === s ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {search || statusFilter !== 'All' ? (
          <p className="mb-3 text-sm text-slate-500">
            Showing {filtered.length} of {farmers.length} farmers
          </p>
        ) : null}

        {/* ─── Table ─── */}
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Farmer</th>
                  <th className="px-6 py-4">Location & Farm</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <UserCheck size={36} className="mx-auto mb-3 text-slate-700" />
                      <p className="text-sm font-semibold text-slate-500">No farmers yet</p>
                      <p className="mt-1 text-xs text-slate-600">
                        Farmers appear here automatically when they register on the app.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((farmer) => (
                    <tr key={farmer.id} className="transition-colors hover:bg-slate-800/30">
                      {/* Farmer */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-black text-white">
                            {(farmer.firstName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white">{farmer.firstName}</p>
                            <p className="font-mono text-[11px] text-slate-500">{farmer.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin size={13} className="shrink-0 text-slate-500" />
                          <span>Maharashtra</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Registered via App
                        </p>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Phone size={11} className="text-slate-600" />
                          {farmer.phone || '—'}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${PLAN_BADGE[farmer.tier] || 'bg-slate-800 text-slate-400'}`}>
                          {farmer.tier}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[farmer.status] || STATUS_BADGE.SUSPENDED}`}>
                          {farmer.status === 'APPROVED' && <ShieldCheck size={11} />}
                          {farmer.status}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-6 py-4 text-xs text-slate-500">{farmer.joined}</td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === farmer.phone ? null : farmer.phone); }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {actionMenu === farmer.phone && (
                            <div
                              className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {farmer.status !== 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() => changeStatus(farmer.phone, 'APPROVED')}
                                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-slate-700 transition-colors"
                                >
                                  <CheckCircle2 size={15} /> Approve
                                </button>
                              )}
                              {farmer.status !== 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => changeStatus(farmer.phone, 'PENDING')}
                                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-amber-400 hover:bg-slate-700 transition-colors"
                                >
                                  <Filter size={15} /> Set Pending
                                </button>
                              )}
                              {farmer.status !== 'SUSPENDED' && (
                                <button
                                  type="button"
                                  onClick={() => changeStatus(farmer.phone, 'SUSPENDED')}
                                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-700 transition-colors"
                                >
                                  <X size={15} /> Suspend
                                </button>
                              )}
                              {/* Divider */}
                              <div className="border-t border-slate-700 my-1" />
                              <button
                                type="button"
                                onClick={() => changeTier(farmer.phone, SUBSCRIPTION_TIERS.PRO)}
                                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-violet-400 hover:bg-violet-500/10 transition-colors"
                              >
                                Set Pro Tier
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-700">
          Farmers auto-register here when they complete onboarding in the app.
        </p>
      </div>

      {/* ─── Confirm Delete Modal ─── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-red-900/40 bg-slate-900 shadow-2xl p-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 mx-auto">
              <Trash2 size={26} className="text-red-400" />
            </div>
            <h2 className="text-center text-xl font-black text-white mb-2">Remove Farmer?</h2>
            <p className="text-center text-sm text-slate-400 mb-6">
              <span className="font-bold text-white">{confirmDelete.name}</span> ({confirmDelete.id}) will be removed from the directory. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-2xl border border-slate-700 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { removeFarmer(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500 transition-colors"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Farmer Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="my-auto w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <h2 className="text-xl font-black text-white">Add Farmer</h2>
              <button onClick={resetModal} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddFarmerSubmit} className="p-5 space-y-4">
              {/* Phone first — triggers auto-fill */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-300">
                  Phone Number <span className="text-slate-500 font-normal">(auto-fills registered data)</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={phoneInput}
                    onChange={(e) => handlePhoneLookup(e.target.value)}
                    required
                    placeholder="+91 or 10-digit number"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 pl-9 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Lookup result banner */}
                {lookupResult && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-300">
                      Found registered farmer: <span className="font-bold">{lookupResult.name}</span> ({lookupResult.id}) — fields auto-filled.
                    </p>
                  </div>
                )}
                {phoneInput && normalizePhone(phoneInput).length >= 10 && !lookupResult && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    No account found for this number — fill details manually.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-300">Full Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">District</label>
                  <input
                    value={formData.district}
                    onChange={(e) => setFormData(d => ({ ...d, district: e.target.value }))}
                    required placeholder="Pune"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">Village</label>
                  <input
                    value={formData.village}
                    onChange={(e) => setFormData(d => ({ ...d, village: e.target.value }))}
                    required placeholder="Baramati"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-300">Crops (comma separated)</label>
                <input
                  value={formData.crops}
                  onChange={(e) => setFormData(d => ({ ...d, crops: e.target.value }))}
                  required placeholder="Wheat, Onion"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">Acres</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.acres}
                    onChange={(e) => setFormData(d => ({ ...d, acres: e.target.value }))}
                    required placeholder="5.5"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData(d => ({ ...d, plan: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Pro">Pro Plan</option>
                  </select>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
                >
                  {lookupResult ? 'Update Farmer' : 'Save Farmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
