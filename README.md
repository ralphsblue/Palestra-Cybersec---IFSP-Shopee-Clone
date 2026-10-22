# ShopZen - Demo de Phishing

Demonstracao educacional ao vivo de um fluxo de phishing, feita para a Semana da Tecnologia do IFSP Birigui (curso TSI).

> **Marca ficticia.** "ShopZen" e um marketplace inventado para esta demonstracao. Nao representa nenhuma empresa real.
>
> **Uso restrito.** Essa aplicacao foi feita para capturar dados de um unico voluntario consciente e consentido, durante uma apresentacao controlada. Nao divulgue o link publicamente. Veja `PLANEJAMENTO.md` para o contexto etico e legal completo.

## O que esse projeto faz

1. Serve uma tela de login falsa da "ShopZen" (`/`) que aceita qualquer senha.
2. Leva o usuario para uma tela de "verificacao de identidade" (`/verificacao`) que pede, em sequencia, permissao de camera, localizacao e microfone.
3. Mostra uma tela de "sucesso" (`/sucesso`).
4. Guarda tudo (email, senha em texto puro, foto, audio, localizacao, IP, user-agent) num painel admin (`/admin`) protegido por senha, com botao para apagar tudo.

## Requisitos

- Node.js 20 ou superior (testado com Node v24). O projeto usa `node:sqlite`, modulo nativo do Node, sem dependencia de banco externo.
- Navegador baseado em Chromium (Chrome/Edge) para os prompts de camera, microfone e geolocalizacao.

## Como rodar

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Criar o arquivo de variaveis de ambiente a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   Edite `.env` e troque `ADMIN_PASSWORD` por uma senha sua. Esse e o unico segredo do projeto - protege o painel `/admin`.

3. Iniciar o servidor:

   ```bash
   node --env-file=.env server.js
   ```

   Ou, se preferir, exporte a variavel manualmente e use `npm start`:

   ```bash
   # bash/zsh
   export ADMIN_PASSWORD=sua_senha
   npm start

   # PowerShell
   $env:ADMIN_PASSWORD = "sua_senha"
   npm start
   ```

4. O terminal deve mostrar:

   ```
   Servidor rodando em http://localhost:3000
   ```

   (Pode aparecer um aviso `ExperimentalWarning: SQLite is an experimental feature` - e esperado, pode ignorar.)

## Como demonstrar

1. Abra `http://localhost:3000` no navegador do seu laptop (nao no celular do voluntario - camera, microfone e geolocalizacao so funcionam em `localhost` ou HTTPS).
2. Espelhe a tela do laptop no projetor.
3. Peça para o voluntario digitar um usuario (telefone/nome/email) e qualquer senha na tela de login.
4. Acompanhe os 3 prompts de permissao na tela de verificacao (camera, localizacao, microfone) sendo aceitos.
5. Apos a tela de "sucesso", abra uma nova aba em `http://localhost:3000/admin`.
6. Quando o navegador pedir autenticacao, use usuario `admin` e a senha definida em `ADMIN_PASSWORD`.
7. Mostre ao vivo tudo o que foi capturado: credenciais em texto puro, foto, audio (com player), mapa com a localizacao.
8. Ao final, clique em **"Apagar tudo"** (tem confirmacao antes de apagar) para remover tudo do banco e da pasta `uploads/` na frente da plateia.

## Estrutura do projeto

```
server.js                    Entrypoint Express
src/
  db.js                      Setup e queries do SQLite (node:sqlite)
  middleware/adminAuth.js    HTTP Basic Auth do painel admin
  routes/
    login.js                 GET / e POST /login
    verificacao.js           GET /verificacao, GET /verificacao/camera e POST de captura (foto/audio/geo/dispositivo)
    sucesso.js                GET /sucesso
    admin.js                  GET /admin, GET /admin/arquivo/:id/:tipo, POST /admin/wipe
  public/
    css/shopzen.css            Identidade visual da tela de login, painel de verificacao e tela de camera
    css/style.css              Identidade visual das telas de sucesso e admin
    js/shopzen.js               Client JS da tela de login (toggle de senha, submit, banner de cookies)
    js/sensors.js                Client JS do painel: geolocation, MediaRecorder, fingerprint do dispositivo
    js/camera.js                 Client JS da tela de captura manual da selfie (getUserMedia)
  views/
    login.html
    verificacao.html
    camera.html
    sucesso.html
uploads/                     Fotos (.jpg) e audios (.webm) capturados, ignorado no git
database.sqlite               Criado automaticamente na primeira execucao, ignorado no git
```

## Rotas disponiveis

| Rota | Metodo | Descricao |
|------|--------|-----------|
| `/` | GET | Tela de login falsa |
| `/login` | POST | Recebe `{ usuario, senha }`, salva e redireciona |
| `/verificacao` | GET | Tela de pedido de permissoes |
| `/verificacao/camera` | GET | Tela de captura manual da selfie |
| `/verificacao/foto` | POST | Recebe `{ imagemBase64 }` |
| `/verificacao/audio` | POST | Recebe audio via `multipart/form-data` (campo `audio`) |
| `/verificacao/geo` | POST | Recebe `{ lat, lon, accuracy }` |
| `/verificacao/dispositivo` | POST | Recebe fingerprint do dispositivo (tela, fuso, idioma, CPU, memoria, conexao, bateria) - sem prompt de permissao |
| `/sucesso` | GET | Tela final |
| `/admin` | GET | Painel com todas as capturas (requer auth) |
| `/admin/arquivo/:sessionId/:tipo` | GET | Serve foto ou audio de uma sessao (requer auth, `tipo` e `foto` ou `audio`) |
| `/admin/wipe` | POST | Apaga todas as capturas do banco e da pasta `uploads/` (requer auth) |

## Retencao de dados

Nada e apagado automaticamente. Use o botao **"Apagar tudo"** no `/admin` (ou `POST /admin/wipe`) logo apos a apresentacao para remover todas as credenciais, fotos, audios e localizacoes capturadas, conforme definido em `PLANEJAMENTO.md`.
