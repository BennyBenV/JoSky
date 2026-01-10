
const { Server } = require("socket.io");
const httpServer = require("http").createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["https://ton-projet-vercel.app", "http://localhost:5173"], 
    methods: ["GET", "POST"]
  }
});
