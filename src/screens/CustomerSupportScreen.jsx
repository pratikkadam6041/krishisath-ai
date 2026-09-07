import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Headset,
  MessageSquare,
  PhoneCall,
  Send,
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useZoneStore } from '../store/zoneStore';
import { useQueryStore } from '../store/queryStore';
import { localize, formatRelativeTime } from '../utils/formatters';

// TODO: REPLACE WITH REAL API (Firebase/REST) BEFORE PRODUCTION
// Currently syncs via localStorage — works only on the same device.

const PRIORITY_OPTIONS = [
  { value: 'Low', label: { hi: 'सामान्य', mr: 'सामान्य', en: 'Normal' } },
  { value: 'Medium', label: { hi: 'मध्यम', mr: 'मध्यम', en: 'Medium' } },
  { value: 'High', label: { hi: 'जरूरी', mr: 'तातडीचे', en: 'Urgent' } },
];

export default function CustomerSupportScreen() {
  const navigate = useNavigate();
  const language = useSettingsStore((s) => s.language);
  const firstName = useAuthStore((s) => s.firstName);
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const district = useZoneStore((s) => s.district);
  const selectedCrops = useZoneStore((s) => s.selectedCrops);

  const submitQuery = useQueryStore((s) => s.submitQuery);
  const getFarmerQueries = useQueryStore((s) => s.getFarmerQueries);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Build farmerId consistent with Settings
  const farmerId = (() => {
    const namePart = (firstName || 'KISAN').replace(/\s+/g, '').slice(0, 3).toUpperCase();
    const distPart = (district || 'FARM').replace(/\s+/g, '').slice(0, 3).toUpperCase();
    const crop = selectedCrops?.[0] || 'CR';
    return `KS-${distPart}-${namePart}-${crop.slice(0, 2).toUpperCase()}000`;
  })();

  const myQueries = getFarmerQueries(farmerId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500)); // simulate async
    submitQuery({
      farmerId,
      farmerName: firstName || 'Farmer',
      farmerPhone: phoneNumber || '',
      subject: subject.trim(),
      message: message.trim(),
      priority,
    });
    setSubmitted(true);
    setSubmitting(false);
    setSubject('');
    setMessage('');
    setPriority('Medium');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="flex flex-col px-4 pt-4 pb-28 space-y-4">
      {/* Header */}
      <div className="rounded-[32px] bg-gradient-to-br from-emerald-600 to-emerald-900 p-6 text-white shadow-lg">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <Headset size={28} />
        </div>
        <h1 className="text-3xl font-black">
          {localize({ hi: 'ग्राहक सहायता', mr: 'ग्राहक समर्थन', en: 'Customer Support' }, language)}
        </h1>
        <p className="mt-2 text-sm text-emerald-100">
          {localize({ hi: 'हम आपकी मदद के लिए यहाँ हैं', mr: 'आम्ही तुमच्या मदतीसाठी येथे आहोत', en: 'We are here to help you' }, language)}
        </p>
      </div>

      {/* Contact Options */}
      <div className="rounded-[28px] border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-text-primary">
          {localize({ hi: 'संपर्क के तरीके', mr: 'संपर्क पर्याय', en: 'Contact Options' }, language)}
        </h2>
        <button
          onClick={() => window.open('tel:18001234567')}
          className="mb-3 flex w-full items-center justify-between rounded-2xl bg-surface-2 p-4 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <PhoneCall size={18} />
            </div>
            <div className="text-left">
              <p className="font-bold text-text-primary">
                {localize({ hi: 'टोल-फ्री कॉल', mr: 'टोल-फ्री कॉल', en: 'Toll-free Call' }, language)}
              </p>
              <p className="text-xs text-text-secondary">1800-123-4567</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
        <button
          onClick={() => window.open('https://wa.me/919876543210', '_blank', 'noopener')}
          className="flex w-full items-center justify-between rounded-2xl bg-surface-2 p-4 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <MessageSquare size={18} />
            </div>
            <div className="text-left">
              <p className="font-bold text-text-primary">WhatsApp</p>
              <p className="text-xs text-text-secondary">+91 9876543210</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      </div>

      {/* Submit Query */}
      <div className="rounded-[28px] border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-text-primary">
          {localize({ hi: 'अपनी समस्या लिखें', mr: 'तुमची समस्या लिहा', en: 'Write to us' }, language)}
        </h2>

        {submitted ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-50 py-8 text-emerald-700">
            <CheckCircle2 size={40} className="mb-3" />
            <p className="font-bold">
              {localize({ hi: 'संदेश भेजा गया! Admin को सूचित किया गया।', mr: 'संदेश पाठवला! Admin ला सूचित केले.', en: 'Message sent! Admin has been notified.' }, language)}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={localize({ hi: 'विषय / समस्या का शीर्षक', mr: 'विषय / समस्येचे शीर्षक', en: 'Subject / Issue title' }, language)}
              className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={localize({ hi: 'कृपया अपनी समस्या का विवरण दें...', mr: 'कृपया तुमच्या समस्येचे तपशील द्या...', en: 'Please describe your issue in detail...' }, language)}
              className="w-full resize-none rounded-2xl border border-border bg-surface-2 p-4 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              rows={4}
              required
            />
            {/* Priority selector */}
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 rounded-2xl py-2 text-xs font-black transition ${
                    priority === p.value
                      ? p.value === 'High'
                        ? 'bg-red-600 text-white'
                        : p.value === 'Medium'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-600 text-white'
                      : 'bg-[#f5f8f4] text-text-secondary'
                  }`}
                >
                  {localize(p.label, language)}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 font-black text-white active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send size={16} />
              )}
              {localize({ hi: 'सबमिट करें', mr: 'सबमिट करा', en: 'Submit Query' }, language)}
            </button>
          </form>
        )}
      </div>

      {/* My query history */}
      {myQueries.length > 0 && (
        <div className="rounded-[28px] border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-text-primary">
            {localize({ hi: 'मेरी समस्याएं', mr: 'माझ्या समस्या', en: 'My Queries' }, language)}
          </h2>
          <div className="space-y-3">
            {myQueries.slice(0, 5).map((q) => (
              <div key={q.id} className="rounded-2xl bg-[#f7faf5] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-text-primary line-clamp-1">{q.subject}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    q.status === 'Open' ? 'bg-red-100 text-red-700' :
                    q.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {q.status}
                  </span>
                </div>
                {q.replies.filter(r => r.isAdmin).length > 0 && (
                  <div className="mt-2 rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs font-bold text-emerald-700">Admin Reply:</p>
                    <p className="mt-1 text-xs text-emerald-900">
                      {q.replies.filter(r => r.isAdmin).slice(-1)[0].text}
                    </p>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1 text-xs text-text-secondary">
                  <Clock size={10} />
                  {formatRelativeTime(q.createdAt, language)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
