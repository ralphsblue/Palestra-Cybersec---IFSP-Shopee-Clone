const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');

const loginRoutes = require('./src/routes/login');
const verificacaoRoutes = require('./src/routes/verificacao');
const sucessoRoutes = require('./src/routes/sucesso');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/css', express.static(path.join(__dirname, 'src', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'src', 'public', 'js')));
app.use('/img', express.static(path.join(__dirname, 'src', 'public', 'img')));

app.use((req, res, next) => {
  let sid = req.cookies?.sid;
  if (!sid) {
    sid = crypto.randomUUID();
    res.cookie('sid', sid, { httpOnly: true });
  }
  req.sessionId = sid;
  next();
});

app.use(loginRoutes);
app.use(verificacaoRoutes);
app.use(sucessoRoutes);
app.use(adminRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
