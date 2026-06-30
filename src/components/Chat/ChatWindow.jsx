import { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';

export default function ChatWindow({ roomId, user }) {
  const { messages, loading, send } = useChat(roomId, user);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <section className="chat-window animate-fade-up">
      <ChatStyles />

      <div className="chat-panel">
        <div className="chat-header">
          <div>
            <p className="section-label">Room chat</p>
            <h2>Match talk</h2>
          </div>
          <span className="chat-status">Live</span>
        </div>

        <div className="chat-list" aria-live="polite">
          {loading && (
            <div className="chat-loading">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty__icon">FT</div>
              <div className="chat-empty__title">No messages yet</div>
              <div className="chat-empty__subtitle">Start the room chat before kickoff.</div>
            </div>
          )}

          {!loading && messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwnMessage={message.senderId === user?.uid}
            />
          ))}
          <div ref={endRef} />
        </div>

        <ChatInput onSend={send} disabled={!user} />
      </div>
    </section>
  );
}

function ChatStyles() {
  return (
    <style>{`
      .chat-window {
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
      }

      .chat-panel {
        min-height: min(620px, calc(100vh - 320px));
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 22px;
        background:
          radial-gradient(circle at 20% 0%, rgba(255, 90, 0, 0.13), transparent 28%),
          linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
          rgba(20, 20, 24, 0.94);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.36);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 18px 14px;
        border-bottom: 0.5px solid var(--border-default);
      }

      .chat-header .section-label {
        margin: 0 0 3px;
      }

      .chat-header h2 {
        font-size: 20px;
        line-height: 1.1;
        color: var(--text-primary);
      }

      .chat-status {
        display: inline-flex;
        align-items: center;
        height: 28px;
        padding: 0 10px;
        border-radius: var(--radius-pill);
        background: rgba(34, 197, 94, 0.11);
        border: 0.5px solid rgba(34, 197, 94, 0.28);
        color: var(--color-success);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }

      .chat-list {
        flex: 1;
        min-height: 360px;
        max-height: 58vh;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .chat-message {
        display: flex;
        align-items: flex-end;
        gap: 9px;
        max-width: 86%;
      }

      .chat-message--own {
        align-self: flex-end;
        justify-content: flex-end;
      }

      .chat-avatar {
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        overflow: hidden;
        border-radius: 50%;
        background: var(--color-orange-subtle);
        border: 0.5px solid var(--border-accent);
        color: var(--text-accent);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
      }

      .chat-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .chat-bubble-wrap {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .chat-message--own .chat-bubble-wrap {
        align-items: flex-end;
      }

      .chat-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 2px;
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 700;
      }

      .chat-meta time {
        font-weight: 600;
        opacity: 0.85;
      }

      .chat-bubble {
        width: fit-content;
        max-width: 100%;
        padding: 10px 12px;
        border-radius: 16px 16px 16px 5px;
        background: rgba(255, 255, 255, 0.06);
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        line-height: 1.45;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
      }

      .chat-message--own .chat-bubble {
        border-radius: 16px 16px 5px 16px;
        border-color: rgba(255, 149, 0, 0.28);
        background: linear-gradient(135deg, #ff9500, #ff5a00);
        color: #fff;
        box-shadow: 0 8px 24px rgba(255, 90, 0, 0.22);
      }

      .chat-input {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border-top: 0.5px solid var(--border-default);
        background: rgba(0, 0, 0, 0.18);
      }

      .chat-input input {
        flex: 1;
        min-width: 0;
        height: 44px;
        padding: 0 14px;
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.055);
        color: var(--text-primary);
        font: inherit;
        outline: none;
      }

      .chat-input input::placeholder {
        color: var(--text-muted);
      }

      .chat-input input:focus {
        border-color: var(--border-accent);
        box-shadow: 0 0 0 3px rgba(255, 90, 0, 0.09);
      }

      .chat-input button {
        height: 44px;
        padding: 0 16px;
        border: none;
        border-radius: 14px;
        background: var(--color-orange);
        color: white;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 8px 22px rgba(255, 90, 0, 0.24);
      }

      .chat-input button:disabled,
      .chat-input input:disabled {
        cursor: not-allowed;
        opacity: 0.45;
        box-shadow: none;
      }

      .chat-empty {
        min-height: 330px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 9px;
        text-align: center;
      }

      .chat-empty__icon {
        width: 46px;
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        background: var(--color-orange-subtle);
        border: 0.5px solid var(--border-accent);
        color: var(--text-accent);
        font-weight: 900;
      }

      .chat-empty__title {
        font-size: 18px;
        font-weight: 800;
        color: var(--text-primary);
      }

      .chat-empty__subtitle {
        max-width: 230px;
        color: var(--text-muted);
        font-size: 13px;
      }

      .chat-loading {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-top: 10px;
      }

      .chat-loading .skeleton {
        height: 46px;
        width: 76%;
        border-radius: 16px;
      }

      .chat-loading .skeleton:nth-child(2) {
        width: 58%;
        align-self: flex-end;
      }

      @media (max-width: 560px) {
        .chat-panel {
          min-height: calc(100vh - 300px);
          border-radius: 18px;
        }

        .chat-list {
          max-height: none;
          min-height: 330px;
          padding: 14px 12px;
        }

        .chat-message {
          max-width: 94%;
        }

        .chat-header {
          padding: 16px 14px 12px;
        }

        .chat-input {
          padding: 10px;
        }

        .chat-input button {
          padding: 0 13px;
        }
      }
    `}</style>
  );
}
