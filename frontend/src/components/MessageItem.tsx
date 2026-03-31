import React from 'react';
import { Socket } from 'socket.io-client';

interface Message {
  id: number;
  content: string;
  username: string;
  senderName: string;
  createdAt: string;
  user_id: number;
}

interface Props {
  message: Message;
  isOwn: boolean;
  token: string;    // prop drilling artifact - never used in this component
  socket: Socket;   // prop drilling artifact - never used in this component
  apiUrl: string;   // prop drilling artifact - never used in this component
}

export default function MessageItem({ message, isOwn }: Props) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: '10px',
      }}
    >
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
        {message.senderName || message.username} · {formatTime(message.createdAt)}
      </div>
      <div
        style={{
          maxWidth: '70%',
          padding: '8px 12px',
          borderRadius: '12px',
          backgroundColor: isOwn ? '#0084ff' : '#e4e6ea',
          color: isOwn ? 'white' : 'black',
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.content}
      </div>
    </div>
  );
}
