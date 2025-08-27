import React, { useEffect, useMemo, useRef, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";

function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [typingText, setTypingText] = useState("");
  const [usersOnline, setUsersOnline] = useState([]);
  const [statusBanner, setStatusBanner] = useState("");

  const timeNow = () => {
    const d = new Date();
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const canNotify = useMemo(
    () => "Notification" in window && Notification.permission === "granted",
    []
  );

  const showNotification = (title, body) => {
    if (!canNotify) return;
    if (document.hidden) {
      try {
        new Notification(title, { body });
      } catch (_) {}
    }
  };

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
    socket.emit("stop_typing", { room, username });
  };

  // typing indicator
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
    const onReceive = (data) => {
      setMessageList((list) => [...list, data]);
      if (data.author !== username) {
        showNotification(`New message in room ${room}`, `${data.author}: ${data.message}`);
      }
    };

    const onRoomUsers = (list) => setUsersOnline(list);
    const onTyping = (data) => {
      if (data.username !== username) setTypingText(`${data.username} is typing...`);
    };

    const onStopTyping = () => setTypingText("");
    const onUserStatus = ({ username: who, status }) => {
      setStatusBanner(`${who} is ${status}`);
      setTimeout(() => setStatusBanner(""), 2000);
    };

    socket.on("receive_message", onReceive);
    socket.on("room_users", onRoomUsers);
    socket.on("display_typing", onTyping);
    socket.on("hide_typing", onStopTyping);
    socket.on("user_status", onUserStatus);

    socket.emit("who_is_here", { room });

    return () => {
      socket.off("receive_message", onReceive);
      socket.off("room_users", onRoomUsers);
      socket.off("display_typing", onTyping);
      socket.off("hide_typing", onStopTyping);
      socket.off("user_status", onUserStatus);
    };
  }, [room, socket, username, canNotify]);

  return (
    <div className="chat-shell">
      {/* Presence panel */}
      <aside className="presence-panel">
        <div className="presence-header">Online ({usersOnline.length})</div>
        <div className="user-list">
          {usersOnline.map((u) => (
            <div className="user-pill" key={u}>
              <span className="dot" /> {u}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Window */}
      <div className="chat-window">
        <div className="chat-header">Live Chat</div>
        <div className="room-info">
          Room <strong>{room}</strong> • You are <strong>{username}</strong>
        </div>

        {/* Messages */}
        <ScrollToBottom className="chat-body">
          {messageList.map((m, idx) => (
            <div
              key={idx}
              className="message"
              id={username === m.author ? "you" : "other"}
            >
              <div>
                <div className="message-content">
                  <p>{m.message}</p>
                </div>
                <div className="message-meta">
                  <p id="time">{m.time}</p>
                  <p id="author">{m.author}</p>
                </div>
              </div>
            </div>
          ))}
        </ScrollToBottom>

        {/* typing + status */}
        {typingText ? <div className="banner">{typingText}</div> : null}
        {statusBanner ? <div className="banner">{statusBanner}</div> : null}

        {/* Footer */}
        <div className="chat-footer">
          <input
            type="text"
            value={currentMessage}
            placeholder="Type a message..."
            onChange={handleInput}
            onKeyPress={(event) => {
              if (event.key === "Enter") sendMessage();
            }}
          />
          <button onClick={sendMessage}>&#9658;</button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
