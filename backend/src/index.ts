import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import authRouter from "./routes/auth";
import chatRouter from "./routes/chat";
import quranRouter from "./routes/quran";
import bookmarkRouter from "./routes/bookmarks";
import { rateLimiter } from "./middleware/rateLimiter";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  }
});

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json());
app.use(rateLimiter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter(io));
app.use("/api/quran", quranRouter);
app.use("/api/bookmarks", bookmarkRouter);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === "production" 
    ? "Internal Server Error" 
    : err.message || "Internal Server Error";
  
  res.status(err.status || 500).json({ 
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("../frontend/dist"));
  
  app.get(/.*/, (_req, res) => {
    res.sendFile("index.html", { root: "../frontend/dist" });
  });
}

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
});
