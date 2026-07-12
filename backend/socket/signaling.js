function initSignaling(io) {
  const rooms = new Map(); // roomId -> Set of socketIds

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-room", ({ roomId, userId }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      const roomSet = rooms.get(roomId);

      socket.emit("room-users", Array.from(roomSet));

      roomSet.add(socket.id);

      socket.to(roomId).emit("user-joined", { socketId: socket.id, userId });
    });

    socket.on("signal", ({ to, from, signal }) => {
      io.to(to).emit("signal", { from, signal });
    });

    socket.on("toggle-media", ({ roomId, kind, enabled }) => {
      socket.to(roomId).emit("peer-toggle-media", { socketId: socket.id, kind, enabled });
    });

    const handleLeave = () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const roomSet = rooms.get(roomId);
      if (roomSet) {
        roomSet.delete(socket.id);
        if (roomSet.size === 0) rooms.delete(roomId);
      }
      socket.to(roomId).emit("user-left", { socketId: socket.id });
      socket.leave(roomId);
    };

    socket.on("leave-room", handleLeave);
    socket.on("disconnect", handleLeave);
  });
}

module.exports = initSignaling;