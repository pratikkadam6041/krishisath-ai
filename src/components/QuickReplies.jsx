export default function QuickReplies({ replies, onSelect }) {
  if (!replies?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          onClick={() => onSelect?.(reply)}
          className="chip-bounce rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-left text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
