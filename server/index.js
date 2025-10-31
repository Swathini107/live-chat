const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store rooms and users with usernames
const rooms = {};

// Helper to broadcast room list to everyone
const broadcastRoomList = () => {
  const roomList = Object.keys(rooms).map(roomId => ({
    roomId,
    userCount: rooms[roomId].length,
    users: rooms[roomId].map(u => u.username)
  }));
  io.emit("room_list", roomList);
};

io.on("connection", (socket) => {
  socket.on("request_rooms", () => {
    broadcastRoomList();
  });

  socket.on("join_room", ({ room, username }) => {
    socket.join(room);

    // Remove from existing rooms first
    for (const r in rooms) {
      rooms[r] = rooms[r].filter(u => u.socketId !== socket.id);
      if (rooms[r].length === 0) delete rooms[r];
    }

    if (!rooms[room]) rooms[room] = [];
    rooms[room].push({ socketId: socket.id, username });

    socket.username = username;
    socket.currentRoom = room;
    broadcastRoomList();

    io.to(room).emit("user_joined", { username, room });
  });

  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", data);
  });

  socket.on("typing", (data) => {
    socket.to(data.room).emit("display_typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.room).emit("hide_typing", data);
  });

  socket.on("disconnect", () => {
    const username = socket.username;
    const room = socket.currentRoom;
    if (room && rooms[room]) {
      rooms[room] = rooms[room].filter(u => u.socketId !== socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
      } else {
        io.to(room).emit("user_left", { username, room });
      }
    }
    broadcastRoomList();
  });
});

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING on port ${PORT}`);
});
