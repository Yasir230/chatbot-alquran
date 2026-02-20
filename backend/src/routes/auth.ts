import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/database";
import { mockDb } from "../db/mockDatabase";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6)
});

const updateProfileSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional()
});

// POST /api/auth/register - Register new user
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.username) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const { email, username, password } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Mock mode - bypass database
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      const existingUser = await mockDb.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }
      
      const user = await mockDb.createUser(email, passwordHash, username);
      return res.json({ user: { id: user.id, email: user.email, username: user.name, created_at: user.created_at } });
    }
    
    // Real database mode
    const result = await pool.query(
      "insert into users (email, username, password_hash) values ($1,$2,$3) returning id,email,username,created_at",
      [email, username, passwordHash]
    );
    res.json({ user: result.rows[0] });
  } catch (err: any) {
    console.error("Registration error:", err);
    res.status(400).json({ error: err.detail || "Registration failed" });
  }
});

// POST /api/auth/login - Login user
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const { email, password } = parsed.data;

  try {
    // Mock mode - bypass database
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      const user = await mockDb.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: "JWT secret not configured" });
      }

      const token = jwt.sign({ sub: user.id, email: user.email, username: user.name }, secret, { expiresIn: "7d" });
      return res.json({ token, user: { id: user.id, email: user.email, username: user.name } });
    }
    
    // Real database mode
    const result = await pool.query("select id,email,username,password_hash from users where email=$1", [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }

    const token = jwt.sign({ sub: user.id, email: user.email, username: user.username }, secret, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me - Get current user profile
router.get("/me", async (req, res) => {
  const auth = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  if (!auth || !secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const [, token] = auth.split(" ");
  try {
    const payload = jwt.verify(token, secret) as { sub: string; email?: string; username?: string };
    
    // Mock mode - bypass database
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      const mockUser = await mockDb.findUserByEmail('test@example.com');
      if (mockUser) {
        return res.json({ user: { id: mockUser.id, email: mockUser.email, username: mockUser.name, created_at: mockUser.created_at } });
      }
    }
    
    // Real database mode
    const result = await pool.query("select id,email,username,created_at from users where id=$1", [payload.sub]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

// PUT /api/auth/profile - Update user profile
router.put("/profile", async (req, res) => {
  const auth = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  if (!auth || !secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const [, token] = auth.split(" ");
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  
  try {
    const payload = jwt.verify(token, secret) as { sub: string };
    const { username, email } = parsed.data;
    
    // Mock mode
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true') {
      return res.json({ message: "Profile updated (mock mode)" });
    }
    
    // Real database mode
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (username) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    values.push(payload.sub);
    
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id,email,username,created_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ user: result.rows[0], message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /api/auth/logout - Logout user
router.post("/logout", async (_req, res) => {
  // JWT is stateless, so logout is handled client-side
  // But we can track it for future enhancements if needed
  res.json({ message: "Logged out successfully" });
});

export default router;
