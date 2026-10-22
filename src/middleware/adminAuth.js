function adminAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Autenticacao necessaria.');
  }

  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const sepIndex = decoded.indexOf(':');
  const usuario = decoded.slice(0, sepIndex);
  const senha = decoded.slice(sepIndex + 1);

  const senhaEsperada = process.env.ADMIN_PASSWORD || '';

  if (usuario === 'admin' && senhaEsperada && senha === senhaEsperada) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(401).send('Credenciais invalidas.');
}

module.exports = adminAuth;
