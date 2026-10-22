const express = require('express');
const path = require('node:path');

const router = express.Router();

router.get('/sucesso', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'sucesso.html'));
});

module.exports = router;
