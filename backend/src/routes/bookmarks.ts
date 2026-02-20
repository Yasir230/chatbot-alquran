import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/database";
import { mockDb } from "../db/mockDatabase";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// Schema validation
const bookmarkSchema = z.object({
  surah: z.number().min(1).max(114),
  ayat: z.number().min(1),
  note: z.string().optional()
});

// GET /api/bookmarks - Get all bookmarks for user
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      // Return empty array for mock mode
      return res.json({ bookmarks: [] });
    }
    
    const result = await pool.query(
      `SELECT id, surah, ayat, note, created_at 
       FROM bookmarks 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({ bookmarks: result.rows });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

// POST /api/bookmarks - Add a new bookmark
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validation = bookmarkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid input", details: validation.error.issues });
    }
    
    const { surah, ayat, note } = validation.data;
    const userId = req.user!.id;
    
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      // Mock mode - return success without saving
      return res.json({ 
        bookmark: { 
          id: `mock-bookmark-${Date.now()}`, 
          user_id: userId, 
          surah, 
          ayat, 
          note, 
          created_at: new Date() 
        } 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO bookmarks (user_id, surah, ayat, note) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, surah, ayat, note, created_at`,
      [userId, surah, ayat, note || null]
    );
    
    res.status(201).json({ bookmark: result.rows[0] });
  } catch (error) {
    console.error("Add bookmark error:", error);
    res.status(500).json({ error: "Failed to add bookmark" });
  }
});

// DELETE /api/bookmarks/:id - Delete a bookmark
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const bookmarkId = req.params.id;
    
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      return res.json({ message: "Bookmark deleted successfully" });
    }
    
    // Verify ownership
    const ownershipCheck = await pool.query(
      "SELECT id FROM bookmarks WHERE id = $1 AND user_id = $2",
      [bookmarkId, userId]
    );
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }
    
    await pool.query("DELETE FROM bookmarks WHERE id = $1", [bookmarkId]);
    
    res.json({ message: "Bookmark deleted successfully" });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    res.status(500).json({ error: "Failed to delete bookmark" });
  }
});

export default router;
