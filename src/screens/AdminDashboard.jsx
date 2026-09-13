import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  QrCode,
  Server,
  Settings,
  Shield,
  TrendingUp,
  Users,
  X,
  Zap,
  Sliders,
  XCircle,
} from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { useQueryStore } from '../store/queryStore';
import { useZoneStore } from '../store/zoneStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useUserStore } from '../store/userStore';
import { useFarmerStore } from '../store/farmerStore';
import { readSoilReportReviewQueue, updateSoilReportReview } from '../utils/soilReportGuard';

const nowTimestamp = () => Date.now();

/* ─── Stat Card ─── */
function StatCard({ title, value, subtitle, icon, trend, color = 'emerald' }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    sky: 'text-sky-400 bg-sky-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
  };
  return (
    <div className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700 hover:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${colors[color]}`}>{icon}</div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-sm font-bold ${trend.startsWith('+') || trend === 'Live' || trend === 'Real' ? 'text-emerald-400' : 'text-slate-400'}`}>{trend}</span>
        <span className="text-sm text-slate-500">{subtitle}</span>
      </div>
    </div>
  );
}

/* ─── NavItem ─── */
function SideNavItem({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
        active
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ─── Section: Overview ─── */
function QuickCard({ label, icon, href, bg }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className={`flex items-center justify-between rounded-2xl bg-gradient-to-br ${bg} p-5 text-white transition-all hover:scale-[1.02] hover:shadow-lg`}
    >
      <div>
        <p className="text-sm font-semibold text-white/80">Quick Access</p>
        <p className="mt-0.5 font-black">{label}</p>
      </div>
      <div className="flex items-center gap-1">
        {icon}
        <ChevronRight size={16} />
      </div>
    </button>
  );
}

function reportValue(reportData, key) {
  if (key === 'ec') return reportData?.electricalConductivity ?? reportData?.ec ?? null;
  return reportData?.[key] ?? null;
}

function formatReviewTime(ts) {
  if (!ts) return 'just now';
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)} hr ago`;
}

function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function joinFarmerRecords(users = {}, directoryFarmers = []) {
  const records = new Map();

  Object.values(users || {}).forEach((user) => {
    const phone = normalizePhone(user.phone);
    records.set(phone || user.id, {
      id: user.id,
      phone: user.phone || phone,
      name: user.firstName || 'Farmer',
      status: user.status || 'PENDING',
      tier: user.tier || 'Basic',
      joinedAt: user.registeredAt || 0,
      source: 'App account',
    });
  });

  (directoryFarmers || []).forEach((farmer) => {
    const phone = normalizePhone(farmer.phone);
    const key = phone || farmer.id;
    const existing = records.get(key) || {};
    records.set(key, {
      ...existing,
      id: existing.id || farmer.id,
      phone: existing.phone || farmer.phone || phone,
      name: farmer.name || existing.name || 'Farmer',
      status: existing.status || farmer.status || 'Active',
      tier: existing.tier || farmer.plan || 'Basic',
      joinedAt: existing.joinedAt || farmer.registeredAt || 0,
      source: existing.source ? `${existing.source} + directory` : 'Farmer directory',
    });
  });

  return Array.from(records.values()).filter((farmer) => farmer.phone || farmer.id);
}

function SoilReportApprovalQueue() {
  const [reviews, setReviews] = useState(() => readSoilReportReviewQueue());
  const zones = useZoneStore((state) => state.zones);
  const saveSoilReport = useZoneStore((state) => state.saveSoilReport);
  const pendingReviews = reviews.filter((review) => review.status === 'pending_review');

  useEffect(() => {
    const refresh = () => setReviews(readSoilReportReviewQueue());
    window.addEventListener('storage', refresh);
    window.addEventListener('soil-report-review-queue-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('soil-report-review-queue-changed', refresh);
    };
  }, []);

  const approveReview = (review) => {
    const zone = zones?.[review.zoneId];
    if (!zone) {
      setReviews(updateSoilReportReview(review.id, {
        status: 'blocked',
        adminNote: 'Zone no longer exists, so approval could not be applied.',
      }));
      return;
    }

    saveSoilReport(review.zoneId, {
      source: 'soil_report_scan',
      scanReportId: review.reportId,
      cropType: zone.cropType,
      cropStage: zone.cropStage || 'Vegetative',
      farmerName: review.farmerName || null,
      verificationStatus: 'admin_approved',
      verificationConfidence: 'admin',
      appliedBy: 'Admin',
      appliedAt: nowTimestamp(),
      nitrogen: reportValue(review.reportData, 'nitrogen'),
      phosphorus: reportValue(review.reportData, 'phosphorus'),
      potassium: reportValue(review.reportData, 'potassium'),
      ph: reportValue(review.reportData, 'ph'),
      ec: reportValue(review.reportData, 'ec'),
      organicCarbon: reportValue(review.reportData, 'organicCarbon'),
      fertility: review.reportData?.fertility || '',
      ratings: review.reportData?.ratings || {},
      requirements: review.reportData?.requirements || {},
      recommendation: review.reportData?.recommendation || '',
    });

    setReviews(updateSoilReportReview(review.id, {
      status: 'approved',
      approvedAt: nowTimestamp(),
      approvedBy: 'Admin',
    }));
  };

  const rejectReview = (review) => {
    setReviews(updateSoilReportReview(review.id, {
      status: 'rejected',
      rejectedAt: Date.now(),
      rejectedBy: 'Admin',
    }));
  };

  return (
    <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck size={20} className="text-emerald-400" />
            <h2 className="text-xl font-black text-white">Agronomist Approval Queue</h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">High-impact soil report changes wait here before changing zone data.</p>
        </div>
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
          {pendingReviews.length} Pending
        </span>
      </div>

      {pendingReviews.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm font-semibold text-slate-400">
          No soil report approvals are waiting right now.
        </div>
      ) : (
        <div className="space-y-3">
          {pendingReviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">
                    {review.farmerName || 'Unknown farmer'} {'->'} {review.zoneName || review.zoneId}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatReviewTime(review.createdAt)} / Report {review.reportId}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveReview(review)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500"
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectReview(review)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-500"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>

              {Array.isArray(review.reasons) && review.reasons.length ? (
                <p className="mt-3 text-xs font-semibold leading-relaxed text-amber-200">{review.reasons.join(' ')}</p>
              ) : null}

              {Array.isArray(review.highImpactChanges || review.changes) ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(review.highImpactChanges || review.changes).slice(0, 6).map((change) => (
                    <div key={change.key} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
                      <p className="font-bold text-slate-300">{change.label}</p>
                      <p className="mt-0.5 font-black text-white">
                        {change.current ?? '--'} {'->'} {change.next} {change.unit}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewSection() {
  const users = useUserStore(s => s.users);
  const syncUsers = useUserStore(s => s.syncWithServer);
  const directoryFarmers = useFarmerStore(s => s.farmers);
  const syncFarmers = useFarmerStore(s => s.syncWithServer);
  const realFarmers = joinFarmerRecords(users, directoryFarmers);
  const activeFarmersCount = realFarmers.filter((farmer) => farmer.status !== 'SUSPENDED').length;
  const purchasedUsersCount = realFarmers.length;
  const pendingApprovalsCount = realFarmers.filter((farmer) => farmer.status === 'PENDING').length;
  const queries = useQueryStore(s => s.queries);
  const syncQueries = useQueryStore(s => s.syncWithServer);
  const fieldEvents = useActivityLogStore(s => s.events);
  const syncActivityEvents = useActivityLogStore(s => s.syncWithServer);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const syncAll = () => {
      syncUsers?.();
      syncFarmers?.();
      syncQueries?.();
      syncActivityEvents?.();
    };
    syncAll();
    const intervalId = window.setInterval(syncAll, 3_000);
    return () => window.clearInterval(intervalId);
  }, [syncUsers, syncFarmers, syncQueries, syncActivityEvents]);

  useEffect(() => {
    const updateClock = () => setCurrentTime(nowTimestamp());
    updateClock();
    const intervalId = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Real registration, command, and sensor events are persisted by the app.
  const activityFeed = [
    ...fieldEvents.map((event) => ({
      label: event.title,
      farmer: event.farmerName || event.farmerPhone || 'Farmer',
      ts: event.createdAt,
      detail: event.detail,
      dotColor: event.type === 'registration' ? '#34d399' : event.type === 'sensor-reading' ? '#38bdf8' : '#fbbf24',
    })),
    ...queries.slice(0, 5).map(q => ({
      label: `Query: ${q.subject}`,
      farmer: q.farmerId,
      ts: q.createdAt,
      dotColor: q.status === 'Open' ? '#f87171' : q.status === 'In Progress' ? '#fbbf24' : '#34d399',
    })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5);

  function relTime(ts) {
    const diff = Math.floor(((currentTime || ts) - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} hr ago`;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Platform Overview</h1>
        <p className="mt-1 text-slate-400">Real-time metrics and system health</p>
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Purchased Users" value={purchasedUsersCount.toLocaleString()} subtitle="real accounts in admin" trend="Real" icon={<Users size={22} />} color="emerald" />
        <StatCard title="Active Farmers" value={activeFarmersCount.toLocaleString()} subtitle="not suspended" trend="Live" icon={<CheckCircle2 size={22} />} color="sky" />
        <StatCard title="Pending Approvals" value={pendingApprovalsCount.toLocaleString()} subtitle="need admin review" trend="Live" icon={<AlertCircle size={22} />} color="amber" />
        <StatCard title="Field Events" value={(fieldEvents || []).length.toLocaleString()} subtitle="sensor and command history" trend="Live" icon={<Zap size={22} />} color="emerald" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 lg:col-span-2">
          <h2 className="mb-5 text-xl font-black text-white">Recent Activity</h2>
          <div className="space-y-3">
            {activityFeed.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet — actions will appear here.</p>
            ) : activityFeed.map((ev, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl bg-slate-800/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ev.dotColor }} />
                  <div>
                    <p className="text-sm font-bold text-white">{ev.label}</p>
                    <p className="text-xs text-slate-500">{ev.farmer}{ev.detail ? ` · ${ev.detail}` : ''}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{relTime(ev.ts)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Farmer access */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-5 text-xl font-black text-white">Farmer Access</h2>
          {realFarmers.length === 0 ? (
            <p className="text-sm text-slate-500">No real farmers registered yet.</p>
          ) : (
            <div className="space-y-3">
              {realFarmers.slice(0, 5).map((farmer) => {
                const phone = normalizePhone(farmer.phone);
                const eventsCount = (fieldEvents || []).filter((event) => normalizePhone(event.farmerPhone) === phone).length;
                return (
                  <button
                    key={farmer.id || farmer.phone}
                    type="button"
                    onClick={() => navigate('/admin-portal/farmers')}
                    className="w-full rounded-2xl bg-slate-800/50 p-4 text-left transition-colors hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{farmer.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{farmer.phone || farmer.id}</p>
                      </div>
                      <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-300">
                        {eventsCount} events
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/admin-portal/farmers')}
            className="mt-5 w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300 hover:bg-emerald-500/15"
          >
            Open Farmer Directory
          </button>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickCard label="Farmer Directory" icon={<Users size={18} />} href="/admin-portal/farmers" bg="from-emerald-600 to-teal-700" />
        <QuickCard label="QR Scanner"       icon={<QrCode size={18} />} href="/admin-portal/scanner" bg="from-violet-600 to-purple-700" />
        <QuickCard label="Service Queries"  icon={<MessageSquare size={18} />} href="/admin-portal/queries" bg="from-amber-600 to-orange-700" />
        <QuickCard label="Analytics"        icon={<BarChart3 size={18} />} href="#analytics" bg="from-sky-600 to-blue-700" />
      </div>

      <SoilReportApprovalQueue />
    </div>
  );
}

/* ─── Section: Analytics ─── */
function AnalyticsSection() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const revenue = [65, 72, 80, 95, 110, 120];
  const maxR = Math.max(...revenue);
  const openQueriesCount = useQueryStore(s => s.getOpenCount());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Analytics & ROI</h1>
        <p className="mt-1 text-slate-400">Platform financial and operational metrics</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-6 text-xl font-black text-white">Monthly Revenue (₹ Lakh)</h2>
          <div className="flex h-48 items-end gap-3">
            {months.map((m, i) => (
              <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-400">{revenue[i]}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all"
                  style={{ height: `${(revenue[i] / maxR) * 100}%` }}
                />
                <span className="text-xs text-slate-500">{m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-6 text-xl font-black text-white">Subscription Breakdown</h2>
          <div className="space-y-4">
            {[
              { label: 'Pro Plan (₹2,499/yr)', count: 7200, pct: 58, color: 'emerald' },
              { label: 'Basic Plan (₹999/yr)', count: 4100, pct: 33, color: 'sky' },
              { label: 'Trial (Free)', count: 1150, pct: 9, color: 'slate' },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium text-slate-300">{s.label}</span>
                  <span className={`font-bold text-${s.color}-400`}>{s.count.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full bg-${s.color}-500`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <StatCard title="Total Investment" value="₹4.2Cr" subtitle="hardware + software" trend="+18%" icon={<HardDrive size={22} />} color="sky" />
        <StatCard title="Avg Yield Boost" value="34%" subtitle="per enrolled farmer" trend="+6%" icon={<TrendingUp size={22} />} color="emerald" />
        <StatCard title="Open Queries" value={openQueriesCount} subtitle="pending resolution" trend="" icon={<AlertCircle size={22} />} color="amber" />
      </div>
    </div>
  );
}

/* ─── MAIN DASHBOARD ─── */
const NAV = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { key: 'farmers', label: 'Farmers', icon: <Users size={18} /> },
  { key: 'queries', label: 'Queries', icon: <MessageSquare size={18} /> },
  { key: 'scanner', label: 'QR Scanner', icon: <QrCode size={18} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Store hooks for reactivity
  const globalAlert = useAdminStore(s => s.globalAlert);
  const setGlobalAlert = useAdminStore(s => s.setGlobalAlert);
  const clearGlobalAlert = useAdminStore(s => s.clearGlobalAlert);
  const maintenanceMode = useAdminStore(s => s.maintenanceMode);
  const setMaintenanceMode = useAdminStore(s => s.setMaintenanceMode);
  const features = useAdminStore(s => s.features || { scannerEnabled: true, twinEnabled: true, mandiEnabled: true });
  const toggleFeature = useAdminStore(s => s.toggleFeature);

  const navTo = (key) => {
    setIsSidebarOpen(false);
    if (key === 'farmers') { navigate('/admin-portal/farmers'); return; }
    if (key === 'queries') { navigate('/admin-portal/queries'); return; }
    if (key === 'scanner') { navigate('/admin-portal/scanner'); return; }
    setActiveTab(key);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* ─── Sidebar (Drawer on mobile) ─── */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-800 bg-slate-900 transition-transform duration-300 ease-in-out lg:static lg:flex lg:w-64 lg:translate-x-0 lg:flex-col lg:bg-slate-900/60 ${
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <Shield className="text-emerald-500" size={26} />
            <span className="text-lg font-black">KrishiSarth <span className="text-emerald-500">Admin</span></span>
          </div>
          <button 
            type="button" 
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV.map((item) => (
            <SideNavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.key}
              onClick={() => navTo(item.key)}
            />
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} /> Exit Portal
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ─── Main Area ─── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-5 py-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-slate-700 p-2 text-white active:bg-slate-800"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="text-emerald-500" size={22} />
              <span className="font-black text-white">Admin</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
          </button>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {activeTab === 'overview' && <OverviewSection />}
          {activeTab === 'analytics' && <AnalyticsSection />}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-white">Admin Settings & Control Panel</h1>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* ─── Global Alert Section ─── */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="mb-2 text-xl font-black text-white flex items-center gap-2">
                      <Zap className="text-amber-400" size={22} /> 
                      Global Farmer Alert
                    </h2>
                    <p className="mb-6 text-sm text-slate-400">
                      Broadcast an urgent banner alert that will be pinned to the top of all farmer home screens.
                    </p>

                    {globalAlert ? (
                      <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                        <p className="text-sm font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                          Active Broadcast:
                        </p>
                        <p className="text-white font-medium">"{globalAlert.message}"</p>
                        <button
                          type="button"
                          onClick={() => clearGlobalAlert()}
                          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors"
                        >
                          Stop Broadcasting
                        </button>
                      </div>
                    ) : (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.target);
                          const msg = fd.get('message');
                          const type = fd.get('type');
                          if (msg) {
                            setGlobalAlert(msg, type);
                            e.target.reset();
                          }
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-wider">Alert Message</label>
                          <input 
                            name="message"
                            type="text" 
                            required
                            placeholder="e.g. Heavy rain expected in North Zones tomorrow..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-wider">Severity & Color</label>
                          <select name="type" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors">
                            <option value="info">Information (Blue)</option>
                            <option value="warning">Warning (Amber)</option>
                            <option value="critical">Critical (Red)</option>
                          </select>
                        </div>
                        <button type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors">
                          <Zap size={16} /> Send Broadcast
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* ─── System Maintenance Mode Section ─── */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="mb-2 text-xl font-black text-white flex items-center gap-2">
                      <Server className="text-amber-500 animate-pulse" size={22} />
                      System Maintenance Mode
                    </h2>
                    <p className="mb-6 text-sm text-slate-400">
                      Puts the farmer app into maintenance mode. Farmers will be blocked by a helpful splash screen while you make system changes. (Admin portal stays accessible).
                    </p>

                    <div className={`rounded-2xl border p-5 ${
                      maintenanceMode 
                        ? 'border-amber-500/20 bg-amber-500/10' 
                        : 'border-slate-800 bg-slate-800/40'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">Maintenance Screen Block</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {maintenanceMode ? 'Farmers are currently blocked.' : 'App is online and running normally.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMaintenanceMode(!maintenanceMode)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            maintenanceMode ? 'bg-amber-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 text-xs text-slate-500 italic">
                    Note: Toggling is synchronized automatically in real-time.
                  </div>
                </div>
              </div>

              {/* ─── Feature Flags Toggle Grid ─── */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="mb-2 text-xl font-black text-white flex items-center gap-2">
                  <Sliders className="text-emerald-400" size={22} />
                  Feature Control Panel (Feature Flags)
                </h2>
                <p className="mb-6 text-sm text-slate-400">
                  Instantly enable or disable optional features within the farmer app layout. Disabled features will be hidden from their bottom tab bar and home screen dashboard.
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      key: 'twinEnabled',
                      title: '3D Digital Twin simulation',
                      desc: 'Simulate zone parameters and soil analytics in 3D.',
                    },
                    {
                      key: 'scannerEnabled',
                      title: 'AI Crop disease scanner',
                      desc: 'Scan crops with phone camera to identify health issues.',
                    },
                    {
                      key: 'mandiEnabled',
                      title: 'Live Mandi prices feed',
                      desc: 'Track local government crop rates and daily price alerts.',
                    },
                  ].map((flag) => {
                    const active = features[flag.key] !== false;
                    return (
                      <div key={flag.key} className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                              active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {active ? 'Enabled' : 'Disabled'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleFeature(flag.key)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                active ? 'bg-emerald-600' : 'bg-slate-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                          <h3 className="font-bold text-white text-sm mt-2">{flag.title}</h3>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{flag.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
