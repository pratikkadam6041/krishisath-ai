function formatMessageTime(timestamp, locale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch (_) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export default function MessageBubble({
  message,
  locale = 'hi-IN',
  sourceLabel = 'Sources',
  retryLabel = 'Retry',
  onRetry,
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-[#2E7D32] text-white rounded-br-md'
            : message.error
            ? 'bg-[#FFF5F5] text-[#7A1F1F] border border-[#F4B4B4] rounded-bl-md'
            : 'bg-white text-text-primary border border-border rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>

        {!isUser && Array.isArray(message.sources) && message.sources.length > 0 && (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
              {sourceLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                >
                  {source.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {message.error && message.retryable && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => onRetry?.(message.retryKey, message.id)}
              className="rounded-full bg-[#7A1F1F] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
            >
              {retryLabel}
            </button>
          </div>
        )}

        <p
          className={`mt-2 text-[10px] font-medium ${
            isUser ? 'text-white/75' : message.error ? 'text-[#9A4A4A]' : 'text-text-secondary'
          }`}
        >
          {formatMessageTime(message.timestamp, locale)}
        </p>
      </div>
    </div>
  );
}
