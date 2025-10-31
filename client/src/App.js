import './App.css';
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import Chat from './Chat';

const socket = io.connect("http://localhost:3001"); // Use your deployed backend if needed

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const joinRoom = () => {
    if (username.trim() && room.trim()) {
      socket.emit("join_room", { room, username });
      setShowChat(true);
    }
  };

  return (
    <div className="App">
      {!showChat ? (
        <div className="joinChatContainer">
          <h3>Join A Chat</h3>
          <input
            type="text"
            placeholder="Your Name..."
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID"
            onChange={(event) => setRoom(event.target.value)}
            onKeyPress={(event) => {
              if (event.key === "Enter") joinRoom();
            }}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <Chat socket={socket} username={username} room={room} />
      )}
    </div>
  );
}

export default App;
