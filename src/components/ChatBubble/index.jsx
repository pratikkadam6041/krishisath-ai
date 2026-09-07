import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Leaf } from 'lucide-react';

export default function ChatBubble({ message }) {
  const { t } = useTranslation();
  const { role, content, timestamp } = message;
  const isFarmer = role === 'user';

  const displayContent = content === 'WELCOME' ? t('chat.welcome') : content;
  const timeStr = timestamp ? format(new Date(timestamp), 'HH:mm') : '';

  if (isFarmer) {
    return (
      <div className="flex justify-end mb-2 animate-fade-in-up">
        <div className="chat-bubble-farmer px-4 py-2.5 max-w-[80%]">
          <p className="text-body text-text-primary">{displayContent}</p>
          <p className="text-xs text-text-secondary text-right mt-1">{timeStr}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-2 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-1">
        <Leaf size={14} className="text-white" />
      </div>
      <div className="chat-bubble-ai px-4 py-2.5 max-w-[80%]">
        <p className="text-body text-text-primary">{displayContent}</p>
        <p className="text-xs text-text-secondary mt-1">{timeStr}</p>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-2">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <Leaf size={14} className="text-white" />
      </div>
      <div className="chat-bubble-ai px-4 py-3 flex gap-1 items-center">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}
