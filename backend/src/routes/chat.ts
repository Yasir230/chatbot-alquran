import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/database";
import { mockDb } from "../db/mockDatabase";
import { createAIResponse } from "../services/aiService";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { Server as SocketIOServer } from "socket.io";
import { tafsirModeService } from "../services/tafsirModeService";
import { hafalanModeService } from "../services/hafalanModeService";

export default function chatRouter(io: SocketIOServer) {
  const router = Router();

  // Schema validasi
  const chatSchema = z.object({
    message: z.string().min(1).max(1000),
    conversationId: z.string().uuid().optional()
  });

  // POST /api/chat - Kirim pesan
  router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const validation = chatSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.issues });
      }

      const { message, conversationId } = validation.data;
      const userId = req.user!.id;

      let convId = conversationId;
      let conversationTitle = "";

      // Jika tidak ada conversationId, buat conversation baru
      if (!convId) {
        conversationTitle = message.split(' ').slice(0, 5).join(' ') + (message.split(' ').length > 5 ? '...' : '');
        
        if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
          // Mock mode
          const conversation = await mockDb.createConversation(userId, conversationTitle);
          convId = conversation.id;
        } else {
          // Real database mode
          const conv = await pool.query(
            "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, title",
            [userId, conversationTitle]
          );
          convId = conv.rows[0].id;
        }
      }

      // Simpan user message
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        await mockDb.createMessage(convId!, "user", message);
      } else {
        await pool.query(
          "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
          [convId, "user", message]
        );
      }

      // Ambil history conversation (10 pesan terakhir)
      let conversationHistory: { role: string; content: string }[] = [];
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        const messages = await mockDb.getMessages(convId!);
        conversationHistory = messages.reverse().map(msg => ({ role: msg.sender, content: msg.message }));
      } else {
        const historyResult = await pool.query(
          "SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10",
          [convId]
        );
        conversationHistory = historyResult.rows.reverse();
      }

      // Cek mode-mode khusus terlebih dahulu
      let aiResult;
      let isSpecialMode = false;

      // Mode Tafsir
      if (tafsirModeService.isTafsirQuestion(message)) {
        const verseRef = tafsirModeService.extractVerseReference(message);
        if (verseRef) {
          try {
            const tafsirAnswer = await tafsirModeService.answerTafsirQuestion(
              verseRef.surahNumber, 
              verseRef.ayatNumber, 
              message
            );
            aiResult = {
              answer: tafsirAnswer,
              sources: [{
                type: 'tafsir',
                surah: verseRef.surahNumber,
                ayat: verseRef.ayatNumber
              }]
            };
            isSpecialMode = true;
          } catch (error) {
            console.warn("Tafsir mode failed, falling back to regular AI:", error);
          }
        }
      }

      // Mode Hafalan
      if (!isSpecialMode && hafalanModeService.isMemorizationMessage(message)) {
        // Cek apakah ini attempt hafalan (user input ayat)
        if (hafalanModeService.isMemorizationAttempt(message)) {
          // Ini attempt hafalan, tapi kita butuh session info - untuk sekarang fallback ke AI biasa
          console.log("Memorization attempt detected, but session management needed");
        } else {
          // Ini permintaan untuk mulai/memulai hafalan
          const hafalanResponse = `Saya bisa membantu Anda berlatih hafalan! Untuk memulai:\n\n` +
            `1. Ketik "mulai hafalan surah X ayat Y" untuk memulai dari ayat tertentu\n` +
            `2. Atau berikan input awal ayat yang ingin Anda lanjutkan\n` +
            `3. Saya akan mengevaluasi hafalan Anda dan memberikan feedback\n\n` +
            `Mode hafalan tersedia: maju (forward), mundur (backward), atau acak (random)`;
          
          aiResult = {
            answer: hafalanResponse,
            sources: [{ type: 'hafalan', mode: 'instruction' }]
          };
          isSpecialMode = true;
        }
      }

      // Jika bukan mode khusus, gunakan AI service biasa
      if (!isSpecialMode) {
        aiResult = await createAIResponse(message, conversationHistory, convId);
      }

      // Validasi aiResult harus ada
      if (!aiResult) {
        throw new Error("Failed to generate AI response");
      }

      // Simpan AI response
      let aiMessageId: string;
      let aiMessageCreatedAt: Date;
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        const message = await mockDb.createMessage(convId!, "assistant", aiResult.answer);
        aiMessageId = message.id;
        aiMessageCreatedAt = message.created_at;
      } else {
        const aiMessageResult = await pool.query(
          "INSERT INTO messages (conversation_id, role, content, sources) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
          [convId, "assistant", aiResult.answer, JSON.stringify(aiResult.sources)]
        );
        aiMessageId = aiMessageResult.rows[0].id;
        aiMessageCreatedAt = aiMessageResult.rows[0].created_at;
      }

      // Emit ke Socket.IO room
      io.to(`conversation:${convId}`).emit('new_message', {
        id: aiMessageId,
        role: "assistant",
        content: aiResult.answer,
        sources: aiResult.sources,
        created_at: aiMessageCreatedAt
      });

      res.json({
        conversationId: convId,
        message: {
          id: aiMessageId,
          role: "assistant",
          content: aiResult.answer,
          sources: aiResult.sources,
          created_at: aiMessageCreatedAt
        }
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // GET /api/chat/conversations - Ambil semua conversations user
  router.get("/conversations", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Mock mode
        const conversations = await mockDb.getConversations(userId);
        const result = conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          created_at: conv.created_at,
          last_message: conv.updated_at
        }));
        return res.json({ conversations: result });
      }
      
      // Real database mode
      const result = await pool.query(`
        SELECT c.id, c.title, c.created_at, 
               (SELECT content FROM messages 
                WHERE conversation_id = c.id 
                ORDER BY created_at DESC 
                LIMIT 1) as last_message
        FROM conversations c
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
      `, [userId]);

      res.json(result.rows);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // GET /api/chat/conversations/:id/messages - Ambil messages dalam conversation
  router.get("/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = req.params.id as string;

      // Validasi bahwa conversation milik user
      let isValidConversation = false;
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        const conversation = await mockDb.getConversationById(conversationId);
        isValidConversation = conversation !== null && conversation.user_id === userId;
      } else {
        const ownershipCheck = await pool.query(
          "SELECT id FROM conversations WHERE id = $1 AND user_id = $2",
          [conversationId, userId]
        );
        isValidConversation = ownershipCheck.rows.length > 0;
      }

      if (!isValidConversation) {
        return res.status(403).json({ error: "Access denied" });
      }

      let result;
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        const messages = await mockDb.getMessages(conversationId);
        result = messages.map(msg => ({
          id: msg.id,
          role: msg.sender,
          content: msg.message,
          sources: null,
          created_at: msg.created_at
        }));
      } else {
        const dbResult = await pool.query(
          "SELECT id, role, content, sources, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
          [conversationId]
        );
        result = dbResult.rows;
      }

      res.json({ messages: result });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // === MODE TAFSIR ENDPOINTS ===
  
  // POST /api/chat/tafsir/start - Mulai diskusi tafsir untuk ayat tertentu
  router.post("/tafsir/start", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { surahNumber, ayatNumber } = req.body;
      
      if (!surahNumber || !ayatNumber) {
        return res.status(400).json({ error: "surahNumber and ayatNumber are required" });
      }

      const tafsirDiscussion = await tafsirModeService.startTafsirDiscussion(surahNumber, ayatNumber);
      res.json(tafsirDiscussion);
    } catch (error) {
      console.error("Start tafsir discussion error:", error);
      res.status(500).json({ error: "Failed to start tafsir discussion" });
    }
  });

  // POST /api/chat/tafsir/question - Tanya tentang tafsir ayat
  router.post("/tafsir/question", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { surahNumber, ayatNumber, question } = req.body;
      
      if (!surahNumber || !ayatNumber || !question) {
        return res.status(400).json({ error: "surahNumber, ayatNumber, and question are required" });
      }

      const answer = await tafsirModeService.answerTafsirQuestion(surahNumber, ayatNumber, question);
      res.json({ answer });
    } catch (error) {
      console.error("Answer tafsir question error:", error);
      res.status(500).json({ error: "Failed to answer tafsir question" });
    }
  });

  // === MODE HAFALAN ENDPOINTS ===
  
  // POST /api/chat/hafalan/start - Mulai session hafalan
  router.post("/hafalan/start", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { startSurah = 1, startAyat = 1, mode = 'forward', difficulty = 'medium' } = req.body;
      const userId = req.user!.id;

      const session = await hafalanModeService.startMemorizationSession(
        userId, startSurah, startAyat, mode, difficulty
      );
      
      res.json(session);
    } catch (error) {
      console.error("Start memorization session error:", error);
      res.status(500).json({ error: "Failed to start memorization session" });
    }
  });

  // GET /api/chat/hafalan/next/:sessionId - Dapatkan ayat berikutnya
  router.get("/hafalan/next/:sessionId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sessionId = req.params.sessionId as string;
      
      const nextVerse = await hafalanModeService.getNextVerse(sessionId);
      res.json(nextVerse);
    } catch (error) {
      console.error("Get next verse error:", error);
      res.status(500).json({ error: "Failed to get next verse" });
    }
  });

  // POST /api/chat/hafalan/evaluate - Evaluasi hafalan user
  router.post("/hafalan/evaluate", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { sessionId, userInput, surahNumber, ayatNumber } = req.body;
      
      if (!sessionId || !userInput || !surahNumber || !ayatNumber) {
        return res.status(400).json({ error: "sessionId, userInput, surahNumber, and ayatNumber are required" });
      }

      const evaluation = await hafalanModeService.evaluateMemorization(
        sessionId, userInput, surahNumber, ayatNumber
      );
      
      res.json(evaluation);
    } catch (error) {
      console.error("Evaluate memorization error:", error);
      res.status(500).json({ error: "Failed to evaluate memorization" });
    }
  });

  // GET /api/chat/hafalan/stats/:sessionId - Dapatkan statistik session
  router.get("/hafalan/stats/:sessionId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sessionId = req.params.sessionId as string;
      
      const stats = await hafalanModeService.getSessionStats(sessionId);
      res.json(stats);
    } catch (error) {
      console.error("Get session stats error:", error);
      res.status(500).json({ error: "Failed to get session stats" });
    }
  });

  // POST /api/chat/hafalan/end - Akhiri session hafalan
  router.post("/hafalan/end", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      await hafalanModeService.endSession(sessionId);
      res.json({ message: "Session ended successfully" });
    } catch (error) {
      console.error("End memorization session error:", error);
      res.status(500).json({ error: "Failed to end memorization session" });
    }
  });

  // DELETE /api/chat/conversations/:id - Hapus conversation
  router.delete("/conversations/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = req.params.id as string;

      // Validasi bahwa conversation milik user
      let isValidConversation = false;
      
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        const conversation = await mockDb.getConversationById(conversationId);
        isValidConversation = conversation !== null && conversation.user_id === userId;
      } else {
        const ownershipCheck = await pool.query(
          "SELECT id FROM conversations WHERE id = $1 AND user_id = $2",
          [conversationId, userId]
        );
        isValidConversation = ownershipCheck.rows.length > 0;
      }

      if (!isValidConversation) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
        // Mock mode - delete messages first, then conversation
        await mockDb.deleteMessages(conversationId);
        await mockDb.deleteConversation(conversationId);
      } else {
        // Hapus conversation (messages akan terhapus otomatis karena ON DELETE CASCADE)
        await pool.query("DELETE FROM conversations WHERE id = $1", [conversationId]);
      }

      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  return router;
}