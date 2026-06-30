import { useCallback, useEffect, useState } from 'react';
import { sendMessage, subscribeToMessages } from '../services/chatService';

export function useChat(roomId, user) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const unsubscribe = subscribeToMessages(roomId, (nextMessages) => {
      setMessages(nextMessages);
      setLoading(false);
    });

    return unsubscribe;
  }, [roomId]);

  const send = useCallback(
    async (text) => {
      await sendMessage(roomId, user, text);
    },
    [roomId, user]
  );

  return {
    messages,
    loading,
    send,
  };
}
