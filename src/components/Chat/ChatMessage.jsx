const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const formatTime = (createdAt) => {
  const rawDate = createdAt?.toDate?.() || createdAt;
  const date = rawDate ? new Date(rawDate) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Sending...';
  }

  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function ChatMessage({ message, isOwnMessage }) {
  return (
    <div className={`chat-message ${isOwnMessage ? 'chat-message--own' : ''}`}>
      {!isOwnMessage && (
        <div className="chat-avatar" aria-hidden="true">
          {message.senderPhoto ? (
            <img src={message.senderPhoto} alt="" />
          ) : (
            <span>{getInitials(message.senderName)}</span>
          )}
        </div>
      )}

      <div className="chat-bubble-wrap">
        <div className="chat-meta">
          <span>{isOwnMessage ? 'You' : message.senderName || 'Player'}</span>
          <time>{formatTime(message.createdAt)}</time>
        </div>
        <div className="chat-bubble">{message.text}</div>
      </div>
    </div>
  );
}
