import { useState } from 'react';

export default function ChatInput({ onSend, disabled = false }) {
  const [text, setText] = useState('');
  const isEmpty = text.trim().length === 0;

  const handleSend = async () => {
    if (disabled || isEmpty) return;

    const messageText = text.trim();
    setText('');
    await onSend(messageText);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <form
      className="chat-input"
      onSubmit={(event) => {
        event.preventDefault();
        handleSend();
      }}
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        aria-label="Type a message"
      />
      <button type="submit" disabled={disabled || isEmpty}>
        Send
      </button>
    </form>
  );
}
