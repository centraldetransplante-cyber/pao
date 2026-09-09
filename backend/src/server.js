const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { OAuth2Client } = require("google-auth-library");

const db = require("./db");
const { signToken, requireAuth } = require("./auth");

const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente mais tarde." },
});

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post("/auth/register", authLimiter, async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Nome invalido" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "E-mail invalido" });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Senha precisa ter ao menos 8 caracteres" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: "Ja existe uma conta com esse e-mail" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name.trim(), normalizedEmail, passwordHash);

  const user = { id: info.lastInsertRowid, name: name.trim(), email: normalizedEmail };
  res.status(201).json({ token: signToken(user), user });
});

app.post("/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ error: "Credenciais invalidas" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
  if (!row || !row.password_hash) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const user = { id: row.id, name: row.name, email: row.email };
  res.json({ token: signToken(user), user });
});

app.get("/config", (req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID });
});

app.post("/auth/google", authLimiter, async (req, res) => {
  const { idToken } = req.body || {};
  if (!googleClient) {
    return res.status(501).json({ error: "Login com Google nao configurado neste servidor" });
  }
  if (!idToken || typeof idToken !== "string") {
    return res.status(400).json({ error: "idToken ausente" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (e) {
    return res.status(401).json({ error: "idToken do Google invalido" });
  }

  const googleSub = payload && payload.sub;
  const email = payload && payload.email && payload.email.toLowerCase();
  if (!googleSub || !email) {
    return res.status(401).json({ error: "idToken do Google sem sub/email" });
  }
  const name = (payload.name || email.split("@")[0]).trim();

  let row = db.prepare("SELECT * FROM users WHERE google_sub = ?").get(googleSub);
  if (!row) {
    const byEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (byEmail) {
      db.prepare("UPDATE users SET google_sub = ? WHERE id = ?").run(googleSub, byEmail.id);
      row = { ...byEmail, google_sub: googleSub };
    } else {
      const info = db
        .prepare("INSERT INTO users (name, email, google_sub) VALUES (?, ?, ?)")
        .run(name, email, googleSub);
      row = { id: info.lastInsertRowid, name, email, google_sub: googleSub };
    }
  }

  const user = { id: row.id, name: row.name, email: row.email };
  res.json({ token: signToken(user), user });
});

app.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.user.sub, name: req.user.name, email: req.user.email });
});

app.get("/notes", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT day, text, updated_at FROM notes WHERE user_id = ?")
    .all(req.user.sub);
  res.json(rows);
});

app.put("/notes/:day", requireAuth, (req, res) => {
  const day = Number(req.params.day);
  const { text } = req.body || {};
  if (!Number.isInteger(day) || day < 1 || day > 365) {
    return res.status(400).json({ error: "Dia invalido" });
  }
  if (typeof text !== "string" || text.length > 10000) {
    return res.status(400).json({ error: "Texto invalido" });
  }

  db.prepare(
    `INSERT INTO notes (user_id, day, text, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, day) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`
  ).run(req.user.sub, day, text);

  const row = db
    .prepare("SELECT day, text, updated_at FROM notes WHERE user_id = ? AND day = ?")
    .get(req.user.sub, day);
  res.json(row);
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
});

app.listen(PORT, () => {
  console.log(`Devocional backend rodando na porta ${PORT}`);
});
