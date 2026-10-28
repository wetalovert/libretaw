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
 * libretaw-host: серверная часть режима «Хостинг».
 *
 * Это отдельный файл от libretaw-server.js (режим «Свой сервер»). Он использует тот же
 * сервер, но для работы у хостинг-провайдера добавляет:
 *   • резервные копии (вручную из приложения, по расписанию или командой);
 *   • статус хоста (аптайм, пользователи онлайн, объём хранилища);
 *   • восстановление из копии.
 *
 * Запуск (файлы libretaw-host.js, libretaw-server.js и libretaw.html в одной папке):
 *   ADMIN_TOKEN=пароль-админа LIBRETAW_TOKEN=пароль node libretaw-host.js
 *
 * Команды:
 *   node libretaw-host.js                 запустить хост
 *   node libretaw-host.js backup          сделать копию сейчас
 *   node libretaw-host.js list            список копий
 *   node libretaw-host.js restore <имя>   восстановить копию (сначала остановите хост!)
 *   node libretaw-host.js encrypt         зашифровать старые данные (если были до шифрования)
 *   node libretaw-host.js donate show     показать поддержку донатом
 *   node libretaw-host.js donate on|off   включить / выключить поддержку донатом
 *   node libretaw-host.js donate add <тип> <метка> <реквизиты>   тип: crypto | card | bank | other
 *   node libretaw-host.js donate clear    удалить все реквизиты
 *
 * Переменные окружения: все, что у libretaw-server.js, плюс
 *   LIBRETAW_DATA_KEY парольная фраза шифрования данных (обязательна, не короче 12 символов)
 *   BACKUP_HOURS=24    автокопия каждые N часов (0 — выключить)
 *   BACKUP_KEEP=7      сколько копий хранить
 *   BACKUP_DIR=./backups
 */
'use strict';
const path = require('path'), fs = require('fs');
const core = require('./libretaw-server.js');

const BDIR = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
const KEEP = Math.max(1, +process.env.BACKUP_KEEP || 7);
const HOURS = process.env.BACKUP_HOURS !== undefined ? +process.env.BACKUP_HOURS : 24;
let lastBackup = null;

function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function dirSize(p) {
  let n = 0;
  try { for (const f of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, f.name); n += f.isDirectory() ? dirSize(q) : fs.statSync(q).size; } } catch (e) {}
  return n;
}
function listBackups() {
  try {
    return fs.readdirSync(BDIR).filter(n => /^\d{4}-/.test(n)).sort().reverse()
      .map(n => ({ id: n, size: dirSize(path.join(BDIR, n)) }));
  } catch (e) { return []; }
}
function prune() { listBackups().slice(KEEP).forEach(b => { try { fs.rmSync(path.join(BDIR, b.id), { recursive: true, force: true }); } catch (e) {} }); }
function makeBackup() {
  core.saveNow();                                    // сначала записать текущее состояние
  fs.mkdirSync(BDIR, { recursive: true });
  const id = stamp(), dst = path.join(BDIR, id);
  fs.mkdirSync(dst);
  if (fs.existsSync(core.STATE_FILE)) fs.copyFileSync(core.STATE_FILE, path.join(dst, 'state.json'));
  if (fs.existsSync(core.BLOBS)) fs.cpSync(core.BLOBS, path.join(dst, 'blobs'), { recursive: true });
  lastBackup = new Date().toISOString();
  prune();
  return { id, size: dirSize(dst) };
}
function restoreBackup(id) {
  const name = path.basename(String(id || ''));
  const src = path.join(BDIR, name);
  if (!name || !fs.existsSync(src)) throw new Error('копия не найдена: ' + id);
  if (fs.existsSync(path.join(src, 'state.json'))) fs.copyFileSync(path.join(src, 'state.json'), core.STATE_FILE);
  if (fs.existsSync(path.join(src, 'blobs'))) {
    fs.rmSync(core.BLOBS, { recursive: true, force: true });
    fs.cpSync(path.join(src, 'blobs'), core.BLOBS, { recursive: true });
  }
}

// ---- HTTP: открытый статус для проверки, что хост жив
core.HOOKS.http = (url, req, res) => {
  if (url !== '/host/health') return false;
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify({ ok: true, name: process.env.SERVER_NAME || 'libretaw host', uptime: core.uptime(), users: core.onlineCount(), storage: core.blobBytes() }));
  return true;
};

// ---- административные команды из приложения (после проверки ADMIN_TOKEN)
core.HOOKS.admin = (a, o) => {
  if (a === 'hstatus') return { host: { uptime: core.uptime(), users: core.onlineCount(), storage: core.blobBytes(), backups: listBackups().length, lastBackup, autoHours: HOURS, keep: KEEP } };
  if (a === 'backups') return { backups: listBackups() };
  if (a === 'backup') { const made = makeBackup(); return { made, backups: listBackups() }; }
  if (a === 'delbackup') {
    const id = path.basename(String(o.id || ''));
    if (!/^\d{4}-/.test(id)) return { err: 'bad id', backups: listBackups() };
    fs.rmSync(path.join(BDIR, id), { recursive: true, force: true });
    return { backups: listBackups() };
  }
  return undefined;
};

// ---- поддержка донатом (необязательная) ----
const DTYPES = { crypto: 'Криптокошелёк', card: 'Банковская карта', bank: 'Банковский счёт', other: 'Другое' };
function donateState() { const st = core.stateObj(); if (!st.donate) st.donate = { on: false, items: [] }; return st.donate; }
function donateSave() { core.saveNow(); }
function donateSet(op, o) {
  const d = donateState();
  if (op === 'on') d.on = true;
  else if (op === 'off') d.on = false;
  else if (op === 'clear') d.items = [];
  else if (op === 'add') {
    const kind = DTYPES[o.kind] ? o.kind : 'other';
    const label = String(o.label || DTYPES[kind]).slice(0, 60), value = String(o.value || '').trim().slice(0, 400);
    if (!value) throw new Error('реквизиты не указаны');
    d.items.push({ kind, label, value });
    if (d.items.length > 20) d.items.shift();
  }
  else if (op === 'del') { const i = +o.i; if (i >= 0 && i < d.items.length) d.items.splice(i, 1); }
  donateSave();
  return d;
}
core.HOOKS.admin = ((prev) => (a, o) => {
  if (a === 'donate') { try { return { donate: donateSet(String(o.op || ''), o) }; } catch (e) { return { err: e.message, donate: donateState() }; } }
  return prev(a, o);
})(core.HOOKS.admin);

function cli(argv) {
  if (argv[2] === 'encrypt') { const n = core.migrateAll(); console.log('Зашифровано файлов: ' + n + '.'); return true; }
  if (argv[2] === 'donate') {
    const sub = argv[3] || 'show';
    if (sub === 'show') { const d = donateState(); console.log('Поддержка донатом: ' + (d.on ? 'включена' : 'выключена')); d.items.forEach((x, i) => console.log(i + '. [' + (DTYPES[x.kind] || x.kind) + '] ' + x.label + ': ' + x.value)); return true; }
    if (sub === 'on' || sub === 'off' || sub === 'clear') { donateSet(sub, {}); console.log('Готово: поддержка донатом ' + (sub === 'on' ? 'включена' : sub === 'off' ? 'выключена' : 'очищена') + '.'); return true; }
    if (sub === 'add') {
      const kind = argv[4] || 'other', label = argv[5] || DTYPES[kind] || 'Реквизиты', value = argv.slice(6).join(' ');
      if (!value) { console.log('Укажите реквизиты: node libretaw-host.js donate add <тип> <метка> <реквизиты>'); process.exitCode = 1; return true; }
      donateSet('add', { kind, label, value }); console.log('Реквизиты добавлены. Включите поддержку: node libretaw-host.js donate on'); return true;
    }
    console.log('Команды: donate show | on | off | add <тип> <метка> <реквизиты> | clear'); return true;
  }
  const cmd = argv[2];
  if (cmd === 'backup') { const r = makeBackup(); console.log('Копия создана: ' + r.id + ' (' + r.size + ' байт)'); return true; }
  if (cmd === 'list') { listBackups().forEach(b => console.log(b.id + '  ' + b.size + ' байт')); return true; }
  if (cmd === 'restore') {
    if (!argv[3]) { console.log('Укажите имя копии: node libretaw-host.js restore <имя>'); process.exitCode = 1; return true; }
    try { restoreBackup(argv[3]); console.log('Восстановлено из ' + argv[3] + '. Теперь запустите хост заново.'); }
    catch (e) { console.log('Ошибка: ' + e.message); process.exitCode = 1; }
    return true;
  }
  return false;
}

if (require.main === module) {
  if (!cli(process.argv)) {
    if (!process.env.ADMIN_TOKEN) console.warn('ВНИМАНИЕ: ADMIN_TOKEN не задан: управление хостом из приложения выключено.');
    if (!process.env.LIBRETAW_TOKEN && !/^(1|true|yes|on)$/i.test(process.env.DYNAMIC_PASSWORD || '')) console.warn('ВНИМАНИЕ: хост открыт без пароля. Задайте LIBRETAW_TOKEN или DYNAMIC_PASSWORD=1.');
    if (HOURS > 0) setInterval(() => { try { makeBackup(); } catch (e) { console.error('автокопия не удалась: ' + e.message); } }, HOURS * 3600e3).unref();
    console.log('Режим «Хостинг»: копии в ' + BDIR + (HOURS > 0 ? ', каждые ' + HOURS + ' ч, хранить ' + KEEP : ', автокопии выключены'));
    core.start();
  }
}
module.exports = { makeBackup, restoreBackup, listBackups };
