import { Router } from "express";
import axios from "axios";
import { quranService } from "../services/quranService";

const router = Router();

const base = process.env.EQURAN_API_URL || "https://equran.id/api/v2";

router.get("/surah", async (_req, res) => {
  try {
    const response = await axios.get(`${base}/surat`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch surah list" });
  }
});

router.get("/surah/:id", async (req, res) => {
  try {
    const response = await axios.get(`${base}/surat/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch surah detail" });
  }
});

router.get("/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q) {
    return res.status(400).json({ error: "q required" });
  }

  try {
    const results = await quranService.searchVerses(q);
    
    res.json({
      query: q,
      results: results,
      count: results.length
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to search Quran" });
  }
});

export default router;

