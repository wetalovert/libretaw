#!/usr/bin/env node
// libretaw — личный мессенджер.
// Copyright (C) 2026 авторы libretaw
//
// Эта программа — свободное программное обеспечение: вы можете распространять её
// и/или изменять на условиях GNU General Public License версии 3 или более поздней
// (GPL-3.0-only), опубликованной Free Software Foundation. Полный текст — в файле LICENSE.
//
// Программа распространяется в надежде, что она будет полезной, но БЕЗ КАКИХ-ЛИБО
// ГАРАНТИЙ; даже без подразумеваемой гарантии ТОВАРНОЙ ПРИГОДНОСТИ или ПРИГОДНОСТИ
// ДЛЯ ОПРЕДЕЛЁННОЙ ЦЕЛИ.
/*
 * libretaw-server: свой сервер для мессенджера libretaw.
 * Без зависимостей, только Node.js 18+.
 *
 *   node libretaw-server.js
 *
 * Переменные окружения:
 *   PORT=8080                 порт
 *   HOST=0.0.0.0              адрес прослушивания
 *   LIBRETAW_TOKEN=секрет     общий (постоянный) пароль сервера
 *   DYNAMIC_PASSWORD=1        включить динамический (одноразовый) пароль
 *   OTP_LENGTH=8              длина одноразового пароля (6-16)
 *   OTP_TTL_MIN=0             через сколько минут менять неиспользованный пароль (0 = не менять)
 *   ADMIN_TOKEN=секрет        пароль администратора (управление паролями из приложения)
 *   MAX_FAILS=5               сколько неверных паролей до блокировки IP на 10 минут
 *   TRUST_PROXY=1             брать IP клиента из X-Forwarded-For (за обратным прокси)
 *   SERVER_NAME=Мой сервер    название, которое видят клиенты
 *   MOTD="Добро пожаловать"   приветствие
 *   DATA_DIR=./data           где хранить очереди и вложения
 *   APP_FILE=./libretaw.html  файл приложения, который отдаётся по адресу /
 *   BLOB_TOTAL_MB=1024        лимит хранилища вложений
 *   TLS_CERT=... TLS_KEY=...  пути к сертификату и ключу (включает wss://)
 */
'use strict';
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = +process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const TOKEN = process.env.LIBRETAW_TOKEN || '';
const NAME = process.env.SERVER_NAME || 'libretaw server';
const MOTD = process.env.MOTD || '';
const DYN_ENV = /^(1|true|yes|on)$/i.test(process.env.DYNAMIC_PASSWORD || '');
const OTP_LEN = Math.min(16, Math.max(6, +process.env.OTP_LENGTH || 8));
const OTP_TTL = (+process.env.OTP_TTL_MIN || 0) * 60000;
const ADMIN = process.env.ADMIN_TOKEN || '';
const TRUST_PROXY = /^(1|true|yes|on)$/i.test(process.env.TRUST_PROXY || '');
const MAX_FAILS = Math.max(3, +process.env.MAX_FAILS || 5);   // неверных паролей до блокировки IP на 10 минут
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const APP = process.env.APP_FILE || path.join(__dirname, 'libretaw.html');
const BLOBS = path.join(DATA, 'blobs');
const STATE_FILE = path.join(DATA, 'state.json');
const OTP_FILE = path.join(DATA, 'current-password.txt');
const MAX_MSG = 8 * 1024 * 1024;          // максимум одного сообщения
const QUEUE_MAX = 1000;                   // сообщений в очереди одного пользователя
const QUEUE_TTL = 7 * 864e5;              // очередь живёт 7 дней
const BLOB_TTL = 14 * 864e5;              // вложения живут 14 дней
const BLOB_MAX = 30 * 1024 * 1024;        // максимум одного вложения
const BLOB_TOTAL = (+process.env.BLOB_TOTAL_MB || 1024) * 1048576;
const RATE_PER_SEC = 40;                  // событий в секунду от одного клиента
const ID_RE = /^LTW-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const BLOB_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const started = Date.now();
const HOOKS = { http: null, admin: null };   // точки расширения (используются libretaw-host.js)

// ---- шифрование данных на диске (обязательное) ----
// Все файлы данных (состояние, вложения, пароль администратора, копии) шифруются AES-256-GCM.
// Ключ получается из парольной фразы LIBRETAW_DATA_KEY (scrypt). Без неё сервер не запускается.
const DATA_MAGIC = Buffer.from('LTWE');
const KEY_FILE = path.join(DATA, 'keyinfo.json');
let DKEY = null;
function sealBuf(buf) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', DKEY, iv);
  const ct = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([DATA_MAGIC, iv, c.getAuthTag(), ct]);
}
function openBuf(b) {
  if (!b || b.length < 32 || !b.subarray(0, 4).equals(DATA_MAGIC)) throw new Error('plain');
  const d = crypto.createDecipheriv('aes-256-gcm', DKEY, b.subarray(4, 16));
  d.setAuthTag(b.subarray(16, 32));
  return Buffer.concat([d.update(b.subarray(32)), d.final()]);
}
function writeData(file, buf) { fs.writeFileSync(file, sealBuf(buf), { mode: 0o600 }); }
function readData(file) { return openBuf(fs.readFileSync(file)); }
function dataKeyInit() {
  const pass = process.env.LIBRETAW_DATA_KEY || '';
  if (pass.length < 12) {
    console.error('Нужна парольная фраза для шифрования данных: LIBRETAW_DATA_KEY (не короче 12 символов).');
    console.error('Без неё данные не шифруются, и сервер не запускается. Пример: LIBRETAW_DATA_KEY="длинная фраза" node libretaw-server.js');
    process.exit(1);
  }
  fs.mkdirSync(DATA, { recursive: true });
  let info = null;
  try { info = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')); } catch (e) {}
  if (!info) info = { v: 1, salt: crypto.randomBytes(16).toString('base64'), check: '' };
  DKEY = crypto.scryptSync(pass, Buffer.from(info.salt, 'base64'), 32, { N: 16384, r: 8, p: 1 });
  if (info.check) {
    try { if (openBuf(Buffer.from(info.check, 'base64')).toString() !== 'libretaw-check') throw new Error(); }
    catch (e) { console.error('Неверная LIBRETAW_DATA_KEY: данные не открываются.'); process.exit(1); }
  } else info.check = sealBuf(Buffer.from('libretaw-check')).toString('base64');
  fs.writeFileSync(KEY_FILE, JSON.stringify(info), { mode: 0o600 });
}
let state = { users: {}, gs: {}, cs: {}, queues: {}, dyn: null };
let STATE_ERR = '';
dataKeyInit();
fs.mkdirSync(BLOBS, { recursive: true });
try { state = Object.assign(state, JSON.parse(readData(STATE_FILE).toString('utf8'))); }
catch (e) {
  if (fs.existsSync(STATE_FILE)) { STATE_ERR = e.message === 'plain' ? 'Данные на диске не зашифрованы. Выполните: LIBRETAW_DATA_KEY=... node libretaw-server.js encrypt' : 'Файл состояния повреждён или открыт другим ключом: ' + e.message; }
}

// ---------- состояние ----------
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 1500); }
function saveNow() { try { writeData(STATE_FILE + '.tmp', Buffer.from(JSON.stringify(state))); fs.renameSync(STATE_FILE + '.tmp', STATE_FILE); } catch (e) { console.error('save:', e.message); } }
let blobBytes = 0;
function scanBlobs() { blobBytes = 0; try { fs.readdirSync(BLOBS).forEach(f => { if (!f.endsWith('.json')) blobBytes += fs.statSync(path.join(BLOBS, f)).size; }); } catch (e) {} }
scanBlobs();

// ---------- пароли ----------
const OTP_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let otp = '', otpT = null;
const dyn = () => (state.dyn && typeof state.dyn.enabled === 'boolean') ? state.dyn.enabled : DYN_ENV;
const fmtOtp = s => s.replace(/(.{4})(?=.)/g, '$1-');
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function safeEq(a, b) { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); }
function genOtp() { let r = ''; for (let i = 0; i < OTP_LEN; i++) r += OTP_ALPHA[crypto.randomInt(OTP_ALPHA.length)]; return r; }
function rotate(reason) {
  clearTimeout(otpT);
  if (!dyn()) { otp = ''; try { fs.unlinkSync(OTP_FILE); } catch (e) {} return; }
  otp = genOtp();
  if (OTP_TTL) { otpT = setTimeout(() => rotate('срок действия истёк'), OTP_TTL); otpT.unref(); }
  try { writeData(OTP_FILE, Buffer.from(fmtOtp(otp) + '\n')); } catch (e) {}
  console.log('Одноразовый пароль: ' + fmtOtp(otp) + (reason ? '   (' + reason + ')' : ''));
}
const otpOk = t => dyn() && otp && safeEq(norm(t), otp);
const fails = new Map();                    // ip -> [время неудачных попыток]
function banned(ip) { const a = (fails.get(ip) || []).filter(t => Date.now() - t < 600000); fails.set(ip, a); return a.length >= MAX_FAILS; }
function fail(ip) { const a = fails.get(ip) || []; a.push(Date.now()); fails.set(ip, a); }
const otpFails = [];
function otpGuess() { const now = Date.now(); otpFails.push(now); while (otpFails.length && now - otpFails[0] > 600000) otpFails.shift(); if (otpFails.length >= 10) { otpFails.length = 0; rotate('слишком много неверных попыток'); } }

// ---------- клиенты ----------
const conns = new Set();            // все соединения
const byId = new Map();             // id -> Set(conn)
function online(id) { return byId.has(id) && byId.get(id).size > 0; }

// ---------- WebSocket (RFC 6455), минимальная реализация ----------
function frame(opcode, payload) {
  const len = payload.length; let h;
  if (len < 126) { h = Buffer.alloc(2); h[1] = len; }
  else if (len < 65536) { h = Buffer.alloc(4); h[1] = 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
  h[0] = 0x80 | opcode;
  return Buffer.concat([h, payload]);
}
function wsSend(c, obj) { if (c.dead) return; try { c.socket.write(frame(1, Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)))); } catch (e) {} }
function wsClose(c, code) { if (c.dead) return; try { const b = Buffer.alloc(2); b.writeUInt16BE(code || 1000); c.socket.write(frame(8, b)); } catch (e) {} setTimeout(() => { try { c.socket.destroy(); } catch (e) {} }, 200); }

function attach(socket, ip) {
  const c = { socket, ip: ip || '', auth: false, via: '', id: '', name: '', buf: Buffer.alloc(0), frags: [], fragLen: 0, alive: true, dead: false, rate: [], up: {} };
  conns.add(c);
  socket.setNoDelay(true);
  socket.on('data', d => {
    c.buf = Buffer.concat([c.buf, d]);
    try { parse(c); } catch (e) { wsClose(c, 1002); }
  });
  const gone = () => { if (c.dead) return; c.dead = true; conns.delete(c); if (c.id && byId.has(c.id)) { byId.get(c.id).delete(c); if (!byId.get(c.id).size) byId.delete(c.id); presenceSoon(); } };
  socket.on('close', gone); socket.on('error', gone); socket.on('end', gone);
}
function parse(c) {
  for (;;) {
    const b = c.buf; if (b.length < 2) return;
    const fin = !!(b[0] & 0x80), op = b[0] & 15, masked = !!(b[1] & 0x80);
    let len = b[1] & 127, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; const big = b.readBigUInt64BE(2); if (big > BigInt(MAX_MSG)) return wsClose(c, 1009); len = Number(big); off = 10; }
    if (len > MAX_MSG) return wsClose(c, 1009);
    if (!masked) return wsClose(c, 1002);
    if (b.length < off + 4 + len) return;
    const mask = b.subarray(off, off + 4), data = Buffer.from(b.subarray(off + 4, off + 4 + len));
    for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
    c.buf = b.subarray(off + 4 + len);
    if (op === 8) return wsClose(c, 1000);
    if (op === 9) { c.socket.write(frame(10, data)); continue; }
    if (op === 10) { c.alive = true; continue; }
    if (op === 1 || op === 2 || op === 0) {
      if (op !== 0) { c.frags = []; c.fragLen = 0; c.fragOp = op; }
      c.frags.push(data); c.fragLen += data.length;
      if (c.fragLen > MAX_MSG) return wsClose(c, 1009);
      if (fin) { const msg = Buffer.concat(c.frags); c.frags = []; c.fragLen = 0; if (c.fragOp === 1) onMessage(c, msg.toString('utf8')); }
    }
  }
}

// ---------- логика ----------
function userGroups(kind, id) { const out = []; for (const k in state[kind]) if (state[kind][k].includes(id)) out.push(k); return out; }
function setMembership(kind, id, list) {
  const want = new Set((Array.isArray(list) ? list : []).filter(x => typeof x === 'string' && x.length <= 64).slice(0, 500));
  for (const k of userGroups(kind, id)) if (!want.has(k)) { state[kind][k] = state[kind][k].filter(x => x !== id); if (!state[kind][k].length) delete state[kind][k]; }
  want.forEach(k => { const a = state[kind][k] || (state[kind][k] = []); if (!a.includes(id)) a.push(id); });
}
function deliver(id, fr, queue) {
  if (online(id)) { byId.get(id).forEach(c => wsSend(c, fr)); return; }
  if (!queue) return;
  const q = state.queues[id] || (state.queues[id] = []);
  q.push({ t: Date.now(), f: fr }); if (q.length > QUEUE_MAX) q.splice(0, q.length - QUEUE_MAX); save();
}
let presT = null;
function presenceSoon() { clearTimeout(presT); presT = setTimeout(() => { const users = [...byId.keys()].map(id => ({ id, n: [...byId.get(id)][0].name, pk: (state.users[id] && state.users[id].pk) || '' })); const fr = JSON.stringify({ k: 'presence', users }); conns.forEach(c => { if (c.id) wsSend(c, fr); }); }, 300); }
function welcome(c) { return { k: 'welcome', name: NAME, motd: MOTD, v: 1, users: byId.size, up: Math.floor((Date.now() - started) / 1000), queue: (state.queues[c.id] || []).length, blobs: blobBytes, adm: !!ADMIN, via: c.via || '', donate: state.donate && state.donate.on ? { items: state.donate.items || [] } : null }; }

function onMessage(c, str) {
  let o; try { o = JSON.parse(str); } catch (e) { return; }
  if (!o || typeof o !== 'object') return;
  if (o.k === 'hello') return hello(c, o);
  if (!c.id) return;
  const now = Date.now(); c.rate = c.rate.filter(t => now - t < 1000); if (c.rate.length >= RATE_PER_SEC) return; c.rate.push(now);
  if (o.k === 'ev') return route(c, o);
  if (o.k === 'put') return putBlob(c, o);
  if (o.k === 'mreq') return getBlob(c, o.id);
  if (o.k === 'info') return wsSend(c, welcome(c));
  if (o.k === 'gmem') return gmem(c, o);
  if (o.k === 'admin') return admin(c, o);
  if (o.k === 'ping') return wsSend(c, { k: 'pong' });
}
function hello(c, o) {
  if (c.auth) {                                   // повторное приветствие: только обновляем состав групп и каналов
    if (o.id === c.id) { c.name = String(o.n || c.name).slice(0, 40); setMembership('gs', c.id, o.gs); setMembership('cs', c.id, o.cs); save(); }
    return;
  }
  if (banned(c.ip)) { wsSend(c, { k: 'err', m: 'ban' }); return wsClose(c, 4005); }
  if (!ID_RE.test(String(o.id)) || typeof o.sec !== 'string' || o.sec.length < 16) { wsSend(c, { k: 'err', m: 'hello' }); return wsClose(c, 4002); }
  const h = crypto.createHash('sha256').update(o.sec).digest('hex'), u = state.users[o.id];
  if (u && u.h !== h) { wsSend(c, { k: 'err', m: 'id' }); return wsClose(c, 4003); }
  let via = '';
  if (TOKEN || dyn()) {
    if (u && u.otp) via = 'enrolled';                                   // устройство уже добавлено одноразовым паролем
    else if (TOKEN && safeEq(o.token || '', TOKEN)) via = 'token';      // обычный пароль работает всегда
    else if (otpOk(o.token)) via = 'otp';                               // одноразовый пароль
    else { fail(c.ip); if (dyn()) otpGuess(); wsSend(c, { k: 'err', m: 'auth', o: dyn() }); return wsClose(c, 4001); }
  }
  const nm = String(o.n || '').slice(0, 40);
  if (via === 'otp') { if (u) u.otp = true; else state.users[o.id] = { h, t: Date.now(), otp: true }; }
  else if (!u) state.users[o.id] = { h, t: Date.now() };
  state.users[o.id].n = nm;
  if (typeof o.pk === 'string' && o.pk.length === 88) state.users[o.id].pk = o.pk;   // public key for end-to-end encryption
  c.auth = true; c.via = via; c.id = o.id; c.name = nm;
  if (!byId.has(c.id)) byId.set(c.id, new Set());
  byId.get(c.id).add(c);
  setMembership('gs', c.id, o.gs); setMembership('cs', c.id, o.cs); save();
  wsSend(c, welcome(c));
  const q = state.queues[c.id] || []; delete state.queues[c.id]; const now = Date.now(); q.forEach(e => { if (now - e.t < QUEUE_TTL) wsSend(c, e.f); });
  save(); presenceSoon();
  if (via === 'otp') rotate('использован: ' + (nm || c.id));          // пароль сгорел, выдаём следующий
}
function admin(c, o) {
  if (!ADMIN) return wsSend(c, { k: 'admin', ok: false, e: 'disabled' });
  if (banned(c.ip)) { wsSend(c, { k: 'err', m: 'ban' }); return wsClose(c, 4005); }
  if (!safeEq(o.t || '', ADMIN)) { fail(c.ip); return wsSend(c, { k: 'admin', ok: false, e: 'denied' }); }
  if (HOOKS.admin) { const r = HOOKS.admin(String(o.a || ''), o, c); if (r !== undefined) return wsSend(c, Object.assign({ k: 'admin', ok: true, hk: 1 }, r)); }
  if (o.a === 'rotate') { if (dyn()) rotate('вручную'); }
  else if (o.a === 'dyn') { state.dyn = { enabled: !!o.v }; save(); rotate(o.v ? 'динамический пароль включён' : 'динамический пароль выключен'); if (!o.v) console.log('Динамический пароль выключен.'); }
  else if (o.a === 'revoke') {
    const id = String(o.id || '');
    if (state.users[id]) {
      delete state.users[id]; delete state.queues[id]; setMembership('gs', id, []); setMembership('cs', id, []); save();
      const set = byId.get(id); if (set) [...set].forEach(x => { wsSend(x, { k: 'err', m: 'revoked' }); wsClose(x, 4004); });
    }
  }
  wsSend(c, { k: 'admin', ok: true, dyn: dyn(), otp: dyn() ? fmtOtp(otp) : '', ttl: OTP_TTL / 60000, users: Object.keys(state.users).map(id => ({ id, n: state.users[id].n || '', otp: !!state.users[id].otp, online: online(id), t: state.users[id].t })) });
}
function gmem(c, o) {
  const gid = String(o.gid || ''); const ids = state.gs[gid] || [];
  if (!ids.includes(c.id)) return wsSend(c, { k: 'err', m: 'not-member' });      // only members see the list
  wsSend(c, { k: 'gmem', gid, members: ids.map(id => ({ id, pk: (state.users[id] && state.users[id].pk) || '' })) });
}
function route(c, o) {
  const d = o.d; if (!d || typeof d !== 'object' || d.kick || d.login) return;
  if (d.from && d.from !== c.id) return;               // подделка отправителя
  const fr = JSON.stringify({ k: 'ev', d, mid: String(o.mid || ''), ttl: 6, src: c.id });
  if (d.to) return deliver(String(d.to), fr, true);
  if (d.rxe || d.pve || d.dele || d.lve || d.pcfg || d.pcm || d.pcmdel) {
    const r = d.route; if (!r) return;
    if (r.k === 'peer') return deliver(String(r.to), fr, true);
    if (r.k === 'gr') return (state.gs[r.id] || []).forEach(id => id !== c.id && deliver(id, fr, true));
    if (r.k === 'ch') return (state.cs[r.id] || []).forEach(id => id !== c.id && deliver(id, fr, true));
  } else if (d.gpost) return (state.gs[d.gpost] || []).forEach(id => id !== c.id && deliver(id, fr, true));
  else if (d.chpost) return (state.cs[d.chpost] || []).forEach(id => id !== c.id && deliver(id, fr, true));
  byId.forEach((set, id) => { if (id !== c.id) set.forEach(x => wsSend(x, fr)); });   // общая комната, запросы наборов и т.п.
}
function putBlob(c, o) {
  const id = String(o.id); if (!BLOB_RE.test(id) || typeof o.d !== 'string' || !(o.n > 0) || o.n > 2000 || !(o.i >= 0) || o.i >= o.n) return;
  const f = path.join(BLOBS, id); if (fs.existsSync(f)) return;
  const u = c.up[id] || (c.up[id] = { n: o.n, parts: [], got: 0, size: 0, t: String(o.t || '').slice(0, 100) });
  if (u.parts[o.i] === undefined) { const buf = Buffer.from(o.d, 'base64'); u.parts[o.i] = buf; u.got++; u.size += buf.length; }
  if (u.size > BLOB_MAX) { delete c.up[id]; return; }
  if (u.got < u.n) return;
  delete c.up[id];
  if (blobBytes + u.size > BLOB_TOTAL) return wsSend(c, { k: 'err', m: 'quota' });
  try { writeData(f, Buffer.concat(u.parts)); writeData(f + '.json', Buffer.from(JSON.stringify({ t: u.t }))); blobBytes += u.size; } catch (e) {}
}
function getBlob(c, id) {
  id = String(id); if (!BLOB_RE.test(id)) return;
  const f = path.join(BLOBS, id); let buf, t = '';
  try { buf = readData(f); } catch (e) { return; }
  try { t = JSON.parse(readData(f + '.json').toString('utf8')).t || ''; } catch (e) {}
  const CH = 24000, n = Math.max(1, Math.ceil(buf.length / CH));
  for (let i = 0; i < n; i++) wsSend(c, { k: 'mch', id, i, n, t, d: buf.subarray(i * CH, (i + 1) * CH).toString('base64') });
}

// ---------- HTTP ----------
const handler = (req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (HOOKS.http && HOOKS.http(url, req, res)) return;
  const hdr = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' };
  if (url === '/health') { res.writeHead(200, Object.assign({ 'Content-Type': 'text/plain' }, hdr)); return res.end('ok'); }
  if (url === '/' || url === '/index.html' || url === '/libretaw.html') {
    fs.readFile(APP, (e, b) => {
      if (e) { res.writeHead(200, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, hdr)); return res.end('libretaw server работает. Положите libretaw.html рядом с сервером, чтобы открывать приложение по этому адресу.'); }
      res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, hdr)); res.end(b);
    });
    return;
  }
  res.writeHead(404, hdr); res.end('not found');
};
const useTls = process.env.TLS_CERT && process.env.TLS_KEY;
const server = useTls ? https.createServer({ cert: fs.readFileSync(process.env.TLS_CERT), key: fs.readFileSync(process.env.TLS_KEY) }, handler) : http.createServer(handler);
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade || '').toLowerCase() !== 'websocket' || (req.url || '').split('?')[0] !== '/ws') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  let ip = req.socket.remoteAddress || '';
  if (TRUST_PROXY && req.headers['x-forwarded-for']) ip = String(req.headers['x-forwarded-for']).split(',')[0].trim();
  attach(socket, ip);
});

// ---------- обслуживание ----------
setInterval(() => { conns.forEach(c => { if (!c.alive) { try { c.socket.destroy(); } catch (e) {} return; } c.alive = false; try { c.socket.write(frame(9, Buffer.alloc(0))); } catch (e) {} }); }, 30000).unref();
setInterval(() => {
  const now = Date.now();
  for (const id in state.queues) { state.queues[id] = state.queues[id].filter(e => now - e.t < QUEUE_TTL); if (!state.queues[id].length) delete state.queues[id]; }
  try { fs.readdirSync(BLOBS).forEach(f => { if (f.endsWith('.json')) return; const p = path.join(BLOBS, f), st = fs.statSync(p); if (now - st.mtimeMs > BLOB_TTL) { fs.unlinkSync(p); try { fs.unlinkSync(p + '.json'); } catch (e) {} } }); } catch (e) {}
  scanBlobs(); save();
}, 3600e3).unref();
function bye() { saveNow(); process.exit(0); }
process.on('SIGINT', bye); process.on('SIGTERM', bye);

function start() {
if (STATE_ERR) { console.error(STATE_ERR); process.exit(1); }
server.listen(PORT, HOST, () => {
  console.log('libretaw server: ' + (useTls ? 'https/wss' : 'http/ws') + '://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT + '  (WebSocket: /ws)');
  console.log(TOKEN ? 'Постоянный пароль включён.' : (dyn() ? 'Постоянный пароль не задан.' : 'ВНИМАНИЕ: пароль не задан (LIBRETAW_TOKEN), подключиться может любой, кто знает адрес.'));
  console.log(dyn() ? 'Динамический пароль: ВКЛЮЧЁН (каждый пароль действует один раз).' : 'Динамический пароль: выключен (DYNAMIC_PASSWORD=1 включает).');
  console.log(ADMIN ? 'Администрирование из приложения: включено.' : 'Администрирование из приложения выключено (задайте ADMIN_TOKEN).');
  rotate('первый пароль');
  console.log('Данные: ' + DATA);
});
}
// migrate: encrypts data files that were written before encryption existed
function migrateAll() {
  let n = 0;
  const once = f => { try { const b = fs.readFileSync(f); try { openBuf(b); return; } catch (e) { writeData(f, b); n++; } } catch (e) {} };
  once(STATE_FILE);
  try { fs.readdirSync(BLOBS).forEach(x => once(path.join(BLOBS, x))); } catch (e) {}
  once(OTP_FILE);
  return n;
}
if (require.main === module) {
  if (process.argv[2] === 'encrypt') { const n = migrateAll(); console.log('Зашифровано файлов: ' + n + '. Данные защищены парольной фразой LIBRETAW_DATA_KEY.'); process.exit(0); }
  if (process.argv[2] === 'check') { console.log('Шифрование данных: включено (AES-256-GCM).'); process.exit(0); }
  start();
}
module.exports = { server, HOOKS, start, saveNow, migrateAll, DATA, BLOBS, STATE_FILE, stateObj: () => state, writeData, readData, onlineCount: () => byId.size, blobBytes: () => blobBytes, uptime: () => Math.floor((Date.now() - started) / 1000) };

