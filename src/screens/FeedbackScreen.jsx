import { useState } from 'react';
import { Star, ThumbsUp, Send } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { localize } from '../utils/formatters';

export default function FeedbackScreen() {
  const language = useSettingsStore((s) => s.language);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col px-4 pt-4 pb-28">
      <div className="mb-6 rounded-[32px] bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <ThumbsUp size={28} />
        </div>
        <h1 className="text-3xl font-black">
          {localize({ hi: 'आपकी राय', mr: 'तुमचा अभिप्राय', en: 'Your Feedback' }, language)}
        </h1>
        <p className="mt-2 text-sm text-amber-100">
          {localize({ hi: 'हम आपके अनुभव को बेहतर बनाना चाहते हैं', mr: 'आम्ही तुमचा अनुभव सुधारू इच्छितो', en: 'We want to improve your experience' }, language)}
        </p>
      </div>

      <div className="rounded-[28px] border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-card">
        {submitted ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <ThumbsUp size={32} />
            </div>
            <h2 className="text-xl font-black text-text-primary dark:text-white">
              {localize({ hi: 'धन्यवाद!', mr: 'धन्यवाद!', en: 'Thank You!' }, language)}
            </h2>
            <p className="mt-2 text-text-secondary dark:text-slate-400">
              {localize({ hi: 'आपकी प्रतिक्रिया हमारे लिए बहुत महत्वपूर्ण है।', mr: 'तुमचा अभिप्राय आमच्यासाठी खूप महत्त्वाचा आहे.', en: 'Your feedback is very important to us.' }, language)}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <h2 className="mb-6 text-center text-lg font-bold text-text-primary dark:text-white">
              {localize({ hi: 'आप KrishiSarth को कितनी रेटिंग देंगे?', mr: 'तुम्ही KrishiSarth ला किती रेटिंग द्याल?', en: 'How would you rate KrishiSarth?' }, language)}
            </h2>
            
            <div className="mb-8 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    size={40}
                    fill={(hoverRating || rating) >= star ? '#f5a623' : 'transparent'}
                    className={(hoverRating || rating) >= star ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={localize({ hi: 'कोई सुझाव? (वैकल्पिक)', mr: 'काही सूचना? (पर्यायी)', en: 'Any suggestions? (Optional)' }, language)}
              className="mb-6 w-full resize-none rounded-2xl border border-border bg-surface-2 p-4 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-dark-border dark:bg-slate-800 dark:text-white"
              rows={4}
            />

            <button
              type="submit"
              disabled={rating === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 font-black text-white active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Send size={18} />
              {localize({ hi: 'भेजें', mr: 'पाठवा', en: 'Send Feedback' }, language)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
