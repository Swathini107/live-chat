import React, { useEffect, useState, useCallback } from "react";
import ScrollToBottom from "react-scroll-to-bottom";

function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [typingText, setTypingText] = useState("");
  const [roomList, setRoomList] = useState([]);
  const [notification, setNotification] = useState("");

  const timeNow = () => {
    const d = new Date();
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const showNotification = useCallback((title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      if (document.hidden) {
        try { new Notification(title, { body }); } catch (_) {}
      }
    }
  }, []);

  const showBanner = useCallback((text) => {
    setNotification(text);
    setTimeout(() => setNotification(""), 3000);
  }, []);

  const sendMessage = async () => {
    const trimmed = currentMessage.trim();
    if (!trimmed) return;
    const messageData = {
      room,
      author: username,
      message: trimmed,
      time: timeNow(),
    };
    await socket.emit("send_message", messageData);
    setCurrentMessage("");
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setCurrentMessage(val);
    if (val.trim()) {
      socket.emit("typing", { room, username });
    } else {
      socket.emit("stop_typing", { room, username });
    }
  };

  useEffect(() => {
    socket.emit("request_rooms");

    const onReceive = (data) => {
      setMessageList((list) => [...list, data]);
      if (data.author !== username) {
        showNotification(`New message in ${room}`, `${data.author}: ${data.message}`);
      }
    };

    const onRoomList = (list) => setRoomList(list);
    const onUserJoined = ({ username: who }) => {
      if (who !== username) showBanner(`${who} joined the room`);
      socket.emit("request_rooms");
    };
    const onUserLeft = ({ username: who }) => {
      showBanner(`${who} left the room`);
      socket.emit("request_rooms");
    };
    const onTyping = (data) => {
      if (data.username !== username) setTypingText(`${data.username} is typing...`);
    };
    const onStopTyping = () => setTypingText("");

    socket.on("receive_message", onReceive);
    socket.on("room_list", onRoomList);
    socket.on("user_joined", onUserJoined);
    socket.on("user_left", onUserLeft);
    socket.on("display_typing", onTyping);
    socket.on("hide_typing", onStopTyping);

    return () => {
      socket.off("receive_message", onReceive);
      socket.off("room_list", onRoomList);
      socket.off("user_joined", onUserJoined);
      socket.off("user_left", onUserLeft);
      socket.off("display_typing", onTyping);
      socket.off("hide_typing", onStopTyping);
    };
  }, [room, socket, username, showNotification, showBanner]);

  const currentRoomData = roomList.find(r => r.roomId === room);

  return (
    <div className="chat-shell">
      <div className="presence-panel">
        <div className="presence-header">
          Available Rooms ({roomList.length})
        </div>
        <div className="room-list">
          {roomList.length === 0 ? (
            <div className="empty-rooms">No rooms available</div>
          ) : (
            roomList.map((r, i) => (
              <div key={i} className={`room-card ${r.roomId === room ? 'active' : ''}`}>
                <div className="room-name">
                  <span className="room-icon">🏠</span>
                  Room {r.roomId}
                </div>
                <div className="room-users">
                  <span className="user-count">{r.userCount} online</span>
                  <div className="user-names">
                    {r.users.map((u, j) => (
                      <span key={j} className="user-tag">{u}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="chat-window">
        <div className="chat-header">
          <div className="header-title">Live Chat</div>
          <div className="header-subtitle">
            Room {room} • {currentRoomData?.userCount || 1} online
          </div>
        </div>
        <div className="room-info">You are <strong>{username}</strong></div>
        {notification && (
          <div className="notification-banner">{notification}</div>
        )}
        <div className="chat-body">
          <ScrollToBottom className="message-container">
            {messageList.map((m, i) => (
              <div className={`message ${username === m.author ? 'sent' : 'received'}`} key={i}>
                <div className="message-bubble"><p>{m.message}</p></div>
                <div className="message-footer">
                  <span className="time">{m.time}</span>
                  <span className="author">{m.author}</span>
                </div>
              </div>
            ))}
          </ScrollToBottom>
          {typingText && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="typing-text">{typingText}</span>
            </div>
          )}
        </div>
        <div className="chat-footer">
          <input
            type="text"
            value={currentMessage}
            placeholder="Type a message..."
            onChange={handleInput}
            onKeyPress={(event) => {
              event.key === "Enter" && sendMessage();
            }}
          />
          <button onClick={sendMessage} className="send-btn">
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
