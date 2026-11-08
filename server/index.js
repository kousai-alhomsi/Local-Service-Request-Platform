import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const here = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(process.env.WASLA_DB_PATH || resolve(here, 'data', 'wasla.sqlite'));
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'provider', 'admin')),
    about TEXT NOT NULL DEFAULT '',
    skills_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    duration TEXT NOT NULL,
    mode TEXT NOT NULL,
    availability TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    public_id TEXT NOT NULL UNIQUE,
    offer_id TEXT REFERENCES offers(id) ON DELETE SET NULL,
    student_id TEXT NOT NULL REFERENCES users(id),
    provider_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    note TEXT NOT NULL,
    desired_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'progress', 'completed', 'rejected')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS request_events (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id),
    from_status TEXT,
    to_status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_offers_provider ON offers(provider_id);
  CREATE INDEX IF NOT EXISTS idx_requests_student ON requests(student_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_requests_provider ON requests(provider_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
`);

const categories = {
  'الطباعة': { tone: 'purple', icon: 'printer' },
  'صيانة الأجهزة': { tone: 'mint', icon: 'laptop' },
  'دروس خصوصية': { tone: 'amber', icon: 'book' },
  'تصميم ومهارات': { tone: 'blue', icon: 'pen' },
};
const allowedCategories = new Set(Object.keys(categories));
const allowedModes = new Set(['في الحرم', 'عن بُعد', 'عن بُعد أو في الحرم']);
const allowedAvailability = new Set(['متاحة هذا الأسبوع', 'يستقبل طلبات']);
const sessionDays = 7;
const sessionMaxAge = sessionDays * 24 * 60 * 60;
const maxBodyBytes = 64 * 1024;
const authAttempts = new Map();
const seedPassword = 'WaslaDemo2026!';

function now() { return new Date().toISOString(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function initials(name = '') { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('') || 'وص'; }
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function userById(id) { return db.prepare('SELECT * FROM users WHERE id = ?').get(id); }
function safeUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, about: row.about, skills: JSON.parse(row.skills_json || '[]'), initials: initials(row.name) };
}
function offerView(row) {
  const style = categories[row.category] || { tone: 'purple', icon: 'sparkle' };
  return {
    id: row.id, providerId: row.provider_id, title: row.title, category: row.category,
    provider: row.provider_name, initials: initials(row.provider_name), description: row.description,
    duration: row.duration, mode: row.mode, availability: row.availability,
    tone: style.tone, icon: style.icon, createdAt: row.created_at,
  };
}
function requestView(row) {
  const style = categories[row.category] || { tone: 'purple', icon: 'sparkle' };
  const dateSource = row.desired_date || row.created_at;
  const date = new Date(`${dateSource.slice(0, 10)}T12:00:00`);
  return {
    id: row.public_id, internalId: row.id, offerId: row.offer_id,
    studentId: row.student_id, providerId: row.provider_id,
    title: row.title, category: row.category, provider: row.provider_name, student: row.student_name,
    note: row.note, desiredDate: row.desired_date, status: row.status,
    date: new Intl.DateTimeFormat('ar-AE', { day: 'numeric', month: 'short' }).format(date),
    createdAt: row.created_at, updatedAt: row.updated_at, tone: style.tone, icon: style.icon,
  };
}
const joinedOffers = `SELECT o.*, u.name AS provider_name FROM offers o JOIN users u ON u.id = o.provider_id`;
const joinedRequests = `SELECT r.*, s.name AS student_name, p.name AS provider_name FROM requests r JOIN users s ON s.id = r.student_id JOIN users p ON p.id = r.provider_id`;

async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const key = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(key).toString('hex')}`;
}
async function passwordMatches(password, saved) {
  const [salt, expectedHex] = saved.split(':');
  if (!salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function seedDatabase() {
  if (!db.prepare('SELECT id FROM users LIMIT 1').get()) {
    const demoUsers = [
      { email: 'student@wasla.local', name: 'أحمد', role: 'student', about: 'أبحث عن خدمات عملية تساعدني في إنجاز متطلبات الدراسة، وأشارك مهاراتي في التصميم والتنسيق.', skills: ['تصميم العروض', 'تنسيق التقارير', 'العروض التقديمية'] },
      { email: 'print@wasla.local', name: 'مريم السويدي', role: 'provider', about: 'أساعد الطلاب على تنسيق التقارير وإعدادها للطباعة.', skills: ['تنسيق التقارير', 'الطباعة'] },
      { email: 'repair@wasla.local', name: 'خالد يوسف', role: 'provider', about: 'تشخيص أعطال الأجهزة والبرامج.', skills: ['صيانة الأجهزة', 'الدعم التقني'] },
      { email: 'tutor@wasla.local', name: 'سارة أحمد', role: 'provider', about: 'شرح المفاهيم وحل التمارين بأسلوب يناسب المقرر.', skills: ['الرياضيات', 'التدريس'] },
      { email: 'design@wasla.local', name: 'عمر سعيد', role: 'provider', about: 'ترتيب الأفكار وتصميم عروض جامعية سهلة القراءة.', skills: ['تصميم العروض', 'التصميم'] },
    ];
    const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role, about, skills_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const seeded = new Map();
    for (const account of demoUsers) {
      const id = randomUUID();
      insertUser.run(id, account.name, account.email, await hashPassword(seedPassword), account.role, account.about, JSON.stringify(account.skills), now());
      seeded.set(account.email, id);
    }
    const seedOffers = [
      ['print@wasla.local', 'تنسيق وطباعة التقارير الجامعية', 'الطباعة', 'تنسيق أكاديمي مرتب وطباعة للمشاريع والتقارير، مع مراجعة شكل الملف قبل التسليم.', 'خلال 24 ساعة', 'في الحرم', 'متاحة هذا الأسبوع'],
      ['repair@wasla.local', 'فحص وصيانة الأجهزة الشخصية', 'صيانة الأجهزة', 'تشخيص أعطال الأجهزة والبرامج، مع توضيح الخطوات قبل بدء أي إصلاح.', 'حسب الحالة', 'في الحرم', 'يستقبل طلبات'],
      ['tutor@wasla.local', 'جلسات تقوية في الرياضيات', 'دروس خصوصية', 'شرح للمفاهيم وحل تمارين تدريبية بأسلوب يناسب مستوى المقرر.', 'جلسة 60 دقيقة', 'عن بُعد أو في الحرم', 'متاحة هذا الأسبوع'],
      ['design@wasla.local', 'تصميم عروض تقديمية واضحة', 'تصميم ومهارات', 'ترتيب الأفكار وتصميم شرائح سهلة القراءة للمشاريع والعروض الجامعية.', 'خلال يومين', 'عن بُعد', 'يستقبل طلبات'],
    ];
    const offerIds = new Map();
    const insertOffer = db.prepare('INSERT INTO offers (id, provider_id, title, category, description, duration, mode, availability, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const [email, title, category, description, duration, mode, availability] of seedOffers) {
      const id = randomUUID(); offerIds.set(category, id);
      insertOffer.run(id, seeded.get(email), title, category, description, duration, mode, availability, now(), now());
    }
    const requests = [
      ['الطباعة', 'تنسيق تقرير مقرر إدارة الأعمال', 'أحتاج إلى تنسيق التقرير وتجهيزه للطباعة قبل موعد التسليم.', 'pending', '2026-11-05'],
      ['صيانة الأجهزة', 'إصلاح مشكلة في الحاسوب المحمول', 'الجهاز لا يتصل بالشبكة بشكل مستقر.', 'progress', '2026-11-04'],
      ['دروس خصوصية', 'جلسة مراجعة لمقرر الإحصاء', 'مراجعة أساسيات الاحتمالات قبل الاختبار.', 'completed', '2026-10-28'],
    ];
    const insertRequest = db.prepare('INSERT INTO requests (id, public_id, offer_id, student_id, provider_id, title, category, note, desired_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertEvent = db.prepare('INSERT INTO request_events (id, request_id, actor_id, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    let sequence = 1042;
    for (const [category, title, note, status, desiredDate] of requests) {
      const offer = db.prepare('SELECT provider_id FROM offers WHERE id = ?').get(offerIds.get(category));
      const id = randomUUID(); const publicId = `WR-${sequence}`; sequence -= 6;
      insertRequest.run(id, publicId, offerIds.get(category), seeded.get('student@wasla.local'), offer.provider_id, title, category, note, desiredDate, status, now(), now());
      insertEvent.run(randomUUID(), id, seeded.get('student@wasla.local'), null, 'pending', now());
      if (['accepted', 'progress', 'completed'].includes(status)) insertEvent.run(randomUUID(), id, offer.provider_id, 'pending', 'accepted', now());
      if (['progress', 'completed'].includes(status)) insertEvent.run(randomUUID(), id, offer.provider_id, 'accepted', 'progress', now());
      if (status === 'completed') insertEvent.run(randomUUID(), id, offer.provider_id, 'progress', 'completed', now());
    }
  }

  const adminEmail = process.env.WASLA_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.WASLA_ADMIN_PASSWORD;
  if (adminEmail && adminPassword && adminPassword.length >= 12 && !db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)) {
    db.prepare('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), 'مسؤول المنصة', adminEmail, await hashPassword(adminPassword), 'admin', now());
  }
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `wasla_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAge}${secure}`);
}
function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `wasla_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}
function cookieValue(req, name) {
  const cookies = (req.headers.cookie || '').split(';');
  for (const item of cookies) {
    const separator = item.indexOf('=');
    if (separator > -1 && item.slice(0, separator).trim() === name) return decodeURIComponent(item.slice(separator + 1).trim());
  }
  return '';
}
function currentUser(req) {
  const token = cookieValue(req, 'wasla_session');
  if (!token) return null;
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha256(token), now());
  return row || null;
}
function requireUser(req, roles = null) {
  const user = currentUser(req);
  if (!user) fail(401, 'سجّل الدخول للمتابعة.');
  if (roles && !roles.includes(user.role)) fail(403, 'ليس لديك صلاحية لهذا الإجراء.');
  return user;
}
function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) fail(413, 'حجم البيانات أكبر من المسموح.');
    chunks.push(chunk);
  }
  if (!size) return {};
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { fail(400, 'تعذر قراءة البيانات المرسلة.'); }
  if (!body || Array.isArray(body) || typeof body !== 'object') fail(400, 'أرسل البيانات بصيغة صحيحة.');
  return body;
}
function textField(body, name, label, min, max, optional = false) {
  const value = typeof body[name] === 'string' ? body[name].trim() : '';
  if (optional && !value) return '';
  if (value.length < min || value.length > max) fail(400, `${label}: أدخل من ${min} إلى ${max} حرفًا.`);
  return value;
}
function validateOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  const configured = process.env.WASLA_ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean);
  const allowed = configured || [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:3001', 'http://127.0.0.1:3001',
  ];
  if (!allowed.includes(origin)) fail(403, 'تعذر التحقق من مصدر الطلب.');
}
function checkRateLimit(req, kind, max = 12) {
  const key = `${kind}:${req.socket.remoteAddress || 'local'}`;
  const timestamp = Date.now();
  const entry = authAttempts.get(key) || { count: 0, expires: timestamp + 15 * 60 * 1000 };
  if (entry.expires <= timestamp) { entry.count = 0; entry.expires = timestamp + 15 * 60 * 1000; }
  entry.count += 1; authAttempts.set(key, entry);
  if (entry.count > max) fail(429, 'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.');
}
function createSession(res, userId) {
  const token = randomBytes(32).toString('base64url');
  const created = now();
  const expires = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(created);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(sha256(token), userId, expires, created);
  setSessionCookie(res, token);
}
function bootstrap(user) {
  const offers = db.prepare(`${joinedOffers} WHERE o.active = 1 ORDER BY o.created_at DESC, o.title`).all().map(offerView);
  let requests = [];
  if (user.role === 'student') requests = db.prepare(`${joinedRequests} WHERE r.student_id = ? ORDER BY r.created_at DESC`).all(user.id).map(requestView);
  if (user.role === 'provider') requests = db.prepare(`${joinedRequests} WHERE r.provider_id = ? ORDER BY r.created_at DESC`).all(user.id).map(requestView);
  if (user.role === 'admin') requests = db.prepare(`${joinedRequests} ORDER BY r.created_at DESC LIMIT 100`).all().map(requestView);
  return { role: user.role, profile: safeUser(user), offers, requests };
}
function staticFile(res, filePath) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
  const stat = statSync(filePath);
  res.writeHead(200, { 'Content-Type': types[extname(filePath).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' });
  res.end(readFileSync(filePath));
}
function serveFrontend(req, res, pathname) {
  const dist = resolve(here, '..', 'dist');
  if (!existsSync(resolve(dist, 'index.html'))) return false;
  const candidate = resolve(dist, `.${decodeURIComponent(pathname)}`);
  if (candidate.startsWith(`${dist}${sep}`) && existsSync(candidate) && statSync(candidate).isFile()) {
    staticFile(res, candidate); return true;
  }
  if (req.method === 'GET' || req.method === 'HEAD') { staticFile(res, resolve(dist, 'index.html')); return true; }
  return false;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  if (pathname.startsWith('/api/') || pathname === '/api') {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) validateOrigin(req);
    if (req.method === 'OPTIONS') { res.writeHead(204, { Allow: 'GET, POST, PATCH, OPTIONS' }); res.end(); return; }

    if (req.method === 'GET' && pathname === '/api/health') { sendJson(res, 200, { status: 'ok' }); return; }
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      checkRateLimit(req, 'register', 6);
      const body = await readJson(req);
      const name = textField(body, 'name', 'الاسم', 2, 40);
      const email = textField(body, 'email', 'البريد الإلكتروني', 6, 254).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < 10 || password.length > 128) fail(400, 'كلمة المرور: أدخل من 10 إلى 128 حرفًا.');
      const role = body.role;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'أدخل بريدًا إلكترونيًا صالحًا.');
      if (!['student', 'provider'].includes(role)) fail(400, 'اختر نوع الحساب.');
      if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) fail(409, 'هذا البريد مسجّل بالفعل.');
      const id = randomUUID();
      db.prepare('INSERT INTO users (id, name, email, password_hash, role, about, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, name, email, await hashPassword(password), role, role === 'provider' ? 'أعرّف طلاب الجامعة بخدماتي ومهاراتي.' : 'طالب في مجتمع الجامعة.', now());
      const user = userById(id); createSession(res, id);
      sendJson(res, 201, { user: safeUser(user), workspace: bootstrap(user) }); return;
    }
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      checkRateLimit(req, 'login');
      const body = await readJson(req);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || !(await passwordMatches(password, user.password_hash))) fail(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      createSession(res, user.id);
      sendJson(res, 200, { user: safeUser(user), workspace: bootstrap(user) }); return;
    }
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const token = cookieValue(req, 'wasla_session');
      if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
      clearSessionCookie(res); sendJson(res, 200, { ok: true }); return;
    }
    if (req.method === 'GET' && pathname === '/api/bootstrap') {
      const user = requireUser(req); sendJson(res, 200, bootstrap(user)); return;
    }
    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const user = requireUser(req); sendJson(res, 200, { user: safeUser(user) }); return;
    }
    if (req.method === 'POST' && pathname === '/api/offers') {
      const user = requireUser(req, ['provider']); const body = await readJson(req);
      const offer = validateOffer(body);
      const id = randomUUID(); const created = now();
      db.prepare('INSERT INTO offers (id, provider_id, title, category, description, duration, mode, availability, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, user.id, offer.title, offer.category, offer.description, offer.duration, offer.mode, offer.availability, created, created);
      sendJson(res, 201, { offer: offerView(db.prepare(`${joinedOffers} WHERE o.id = ?`).get(id)) }); return;
    }
    const offerMatch = pathname.match(/^\/api\/offers\/([\w-]+)$/);
    if (req.method === 'PATCH' && offerMatch) {
      const user = requireUser(req, ['provider']); const existing = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerMatch[1]);
      if (!existing) fail(404, 'لم نعثر على الخدمة المطلوبة.');
      if (existing.provider_id !== user.id) fail(403, 'لا يمكنك تعديل خدمة حساب آخر.');
      const offer = validateOffer(await readJson(req));
      db.prepare('UPDATE offers SET title = ?, category = ?, description = ?, duration = ?, mode = ?, availability = ?, updated_at = ? WHERE id = ?')
        .run(offer.title, offer.category, offer.description, offer.duration, offer.mode, offer.availability, now(), existing.id);
      sendJson(res, 200, { offer: offerView(db.prepare(`${joinedOffers} WHERE o.id = ?`).get(existing.id)) }); return;
    }
    fail(404, 'المسار غير موجود.');
  }

  if (serveFrontend(req, res, pathname)) return;
  sendJson(res, 404, { error: 'المسار غير موجود.' });
}

function validateOffer(body) {
  const title = textField(body, 'title', 'اسم الخدمة', 5, 80);
  const category = typeof body.category === 'string' ? body.category : '';
  const description = textField(body, 'description', 'وصف الخدمة', 15, 420);
  const duration = textField(body, 'duration', 'المدة المتوقعة', 3, 50);
  const mode = typeof body.mode === 'string' ? body.mode : '';
  const availability = typeof body.availability === 'string' ? body.availability : '';
  if (!allowedCategories.has(category)) fail(400, 'اختر تصنيفًا صحيحًا للخدمة.');
  if (!allowedModes.has(mode)) fail(400, 'اختر طريقة تقديم صحيحة.');
  if (!allowedAvailability.has(availability)) fail(400, 'اختر حالة التوفر.');
  return { title, category, description, duration, mode, availability };
}

await seedDatabase();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const server = createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  handle(req, res).catch((error) => {
    if (res.headersSent) { res.destroy(); return; }
    sendJson(res, error.status || 500, { error: error.status ? error.message : 'حدث خطأ غير متوقع. حاول لاحقًا.' });
    if (!error.status) console.error(error);
  });
});
server.listen(port, host, () => {
  console.log(`وصلة API يعمل على http://${host}:${port}`);
  if (process.env.NODE_ENV !== 'production') console.log(`حسابات العرض: student@wasla.local / ${seedPassword} — print@wasla.local / ${seedPassword} — repair@wasla.local / ${seedPassword}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
