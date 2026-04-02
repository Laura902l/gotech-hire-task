import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import RoomList from './RoomList';
import MessageItem from './MessageItem';
import Header from '../class-components/Header.class';

interface Room {
  id: number;
  name: string;
  description?: string;
}

interface Message {
  id: number;
  content: string;
  username: string;
  senderName: string;
  createdAt: string;
}

interface Props {
  token: string;
  userId: number;
  socket: Socket;
  apiUrl: string;
  onLogout: () => void;
}

export default function ChatPage({ token, userId, socket, apiUrl, onLogout }: Props) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // use provided apiUrl prop
  // const HARDCODED_API = 'http://localhost:3000';

  useEffect(() => {
    fetchRooms();
    fetchCurrentUser();

    let stopPolling = false;
    let pollHandle: any = null;

    const resolveSocket = (): any => {
      return socket || (window as any).__socket || null;
    };

    const waitForSocket = async (timeout = 3000, interval = 200) => {
      const start = Date.now();
      while (!stopPolling && Date.now() - start < timeout) {
        const s = resolveSocket();
        if (s) return s;
        await new Promise(r => (pollHandle = setTimeout(r, interval)));
      }
      return resolveSocket();
    };

    let attachedSocket: any = null;
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (err: any) => {
      console.error('socket connect_error', err);
      setSendError(err?.message || 'WebSocket connection error');
      setTimeout(() => setSendError(null), 4000);
    };

    (async () => {
      const s = await waitForSocket();
      if (!s) {
        console.log('No socket available to attach listeners');
        return;
      }
      attachedSocket = s;
      try {
        console.log('socket in ChatPage:', attachedSocket, 'connected=', attachedSocket?.connected);
      } catch (err) {}
      if (attachedSocket?.connected) setIsConnected(true);
      console.log('token before socket:', token);
      attachedSocket.on('connect', onConnect);
      attachedSocket.on('disconnect', onDisconnect);
      attachedSocket.on('connect_error', onConnectError);
      attachedSocket.on('newMessage', (message: any) => {
        if (selectedRoom && message.room_id === selectedRoom.id) {
          setMessages((prev: any[]) => [...prev, message]);
        }
      });
    })();

    return () => {
      stopPolling = true;
      if (pollHandle) clearTimeout(pollHandle);
      try {
        const s = attachedSocket || socket || (window as any).__socket;
        if (s) {
          s.off('connect', onConnect);
          s.off('disconnect', onDisconnect);
          s.off('newMessage', (message: any) => {
            if (selectedRoom && message.room_id === selectedRoom.id) {
              setMessages((prev: any[]) => [...prev, message]);
            }
          });
          s.off('connect_error', onConnectError);
        }
      } catch (err) {
        // ignore
      }
    };
  }, [socket, selectedRoom]);

  const fetchCurrentUser = async () => {
    try {
      if (!token) return;
      const parts = token.split('.');
      if (parts.length !== 3) return;
      const payload = JSON.parse(atob(parts[1]));
      if (payload && payload.username) setUsername(payload.username);
    } catch (err) {
      // fall back to not setting username
    }
  };

  const fetchRooms = async () => {
    const res = await fetch(`${apiUrl}/chat/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRooms(data);
  };

  const fetchMessages = async (roomId: number) => {
    setLoadingMessages(true);
    const res = await fetch(`${apiUrl}/chat/rooms/${roomId}/messages?page=1&limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setMessages(data);
    setLoadingMessages(false);
  };

  const handleRoomSelect = (room: Room) => {
    if (selectedRoom) {
      try {
        const s = socket || (window as any).__socket;
        s?.emit?.('leaveRoom', { roomId: selectedRoom.id });
      } catch (err) {
      }
    }

    setSelectedRoom(room);

    try {
      const s = socket || (window as any).__socket;
      if (s?.emit) s.emit('joinRoom', { roomId: room.id });
    } catch (err) {
    }

    fetchMessages(room.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      const s = socket || (window as any).__socket;
      console.log('handleSendMessage: socket=', s, 'connected=', s?.connected, 'id=', s?.id);
      if (!s) throw new Error('Socket not available');
      s.emit('sendMessage', {
        roomId: selectedRoom.id,
        content: newMessage,
      });
    } catch (err: any) {
      console.error('Failed to emit message', err);
      setSendError('Failed to send message: ' + (err?.message || 'unknown'));
      setTimeout(() => setSendError(null), 3000);
      return;
    }

    setNewMessage('');
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

  await fetch(`${apiUrl}/chat/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newRoomName, description: newRoomDesc }),
    });

    setNewRoomName('');
    setNewRoomDesc('');
    setShowCreateRoom(false);
    fetchRooms();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!isConnected) {
        setSendError('Not connected — cannot send');
        setTimeout(() => setSendError(null), 2000);
        return;
      }
      handleSendMessage();
    }
  };

  // inline styles duplicated throughout - no CSS modules or styled-components
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
  };

  const sidebarStyle: React.CSSProperties = {
    width: '250px',
    borderRight: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    backgroundColor: '#f5f5f5',
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  };

  const messagesStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
  };

  const inputAreaStyle: React.CSSProperties = {
    display: 'flex',
    padding: '10px',
    borderTop: '1px solid #ddd',
    gap: '10px',
  };

  return (
    <div style={containerStyle}>
      <div style={sidebarStyle}>
        <Header username={username} isConnected={isConnected} onLogout={onLogout} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>Rooms</h3>
          <button onClick={() => setShowCreateRoom(!showCreateRoom)} style={{ fontSize: '20px', cursor: 'pointer', border: 'none', background: 'none' }}>+</button>
        </div>

        {showCreateRoom && (
          <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <input
              placeholder="Room name"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              style={{ padding: '5px' }}
            />
            <input
              placeholder="Description (optional)"
              value={newRoomDesc}
              onChange={e => setNewRoomDesc(e.target.value)}
              style={{ padding: '5px' }}
            />
            <button onClick={handleCreateRoom} style={{ padding: '5px', cursor: 'pointer' }}>Create</button>
          </div>
        )}

        {/* Prop drilling: passing token, socket, apiUrl down just to pass further */}
        <RoomList
          rooms={rooms}
          selectedRoom={selectedRoom}
          onSelectRoom={handleRoomSelect}
          token={token}
          socket={socket}
          apiUrl={apiUrl}
        />
      </div>

      <div style={mainStyle}>
        {selectedRoom ? (
          <>
            <div style={{ padding: '10px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ margin: 0 }}>#{selectedRoom.name}</h3>
              {selectedRoom.description && <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>{selectedRoom.description}</p>}
            </div>

            <div style={messagesStyle}>
              {loadingMessages ? (
                <p>Loading messages...</p>
              ) : (
                messages.map((msg) => (
                  <React.Fragment key={msg.id}>
                    <MessageItem
                      message={msg}
                      isOwn={msg.user_id === userId}
                      token={token}
                      socket={socket}
                      apiUrl={apiUrl}
                    />
                  </React.Fragment>
                ))
              )}
            </div>

            <div style={inputAreaStyle}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                style={{ flex: 1, padding: '8px', fontSize: '16px' }}
              />
              <button
                onClick={handleSendMessage}
                style={{ padding: '8px 16px', fontSize: '16px', cursor: isConnected ? 'pointer' : 'not-allowed' }}
              >
                Send
              </button>
            </div>
            {sendError && (
              <div style={{ padding: '6px 10px', color: '#a00', fontSize: '13px' }}>
                {sendError}
              </div>
            )}
          
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <p style={{ color: '#666' }}>Select a room to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
