# Planejamento - Demo de Phishing (ShopZen)

**Evento:** Semana da Tecnologia - IFSP Birigui (curso TSI)
**Orientador:** Prof. Rogerio Pinto
**Autorizacao:** Institucional (IFSP Birigui) + professor orientador

> **Marca ficticia.** "ShopZen" e um marketplace inventado para esta demonstracao.
> Nao representa nenhuma empresa real e nao usa marca, logo, layout ou dominio de terceiros.

## Objetivo

Demonstrar, ao vivo e de forma encenada, um fluxo de phishing.
O personagem "Julio" recebe uma mensagem falsa da "ShopZen" no WhatsApp, clica no link, cai numa tela de login falsa e concede permissoes achando que e verificacao de identidade.
A tela e espelhada no projetor para a plateia acompanhar cada passo.
No final, revela-se tudo o que foi capturado e explica-se cada sinal de alerta ignorado.

Mensagem central: "uma mensagem com urgencia + um link + um clique em 'Permitir' entregam sua conta, sua localizacao, sua camera e seu microfone."

---

## Cercas eticas e legais (ler antes de desenvolver)

- **Marca ficticia.** Nada de clonar empresa real. ShopZen e inventado, com identidade visual propria.
- **Demo encenada.** Julio e um voluntario/personagem. O link NAO e divulgado para a plateia.
- **Escopo unico.** So o Julio acessa e so ele tem dados capturados.
- **Consentimento do Julio.** Ele sabe e concorda em ter camera, microfone e localizacao capturados para a demo.
- **Retencao curta.** Credenciais, fotos, audio e localizacao sao apagados logo apos a palestra (botao de wipe no painel).
- **Spoof de SMS nao.** A mensagem vai pelo WhatsApp pessoal do Rafael (envio manual, legitimo).

---

## Decisoes travadas

- [x] Marca: ficticia ("ShopZen").
- [x] Login: design proprio (nao copia o layout de nenhum servico real). Usuario digita email + senha.
- [x] Comportamento do login: aceita QUALQUER senha (nao valida nada) e segue para a confirmacao facial.
- [x] Armazenamento: email e senha em texto puro no banco, para exibir ao proprio Julio na revelacao.
- [x] Verificacao facial: etapa onde Julio concede as permissoes (camera, localizacao, microfone).
- [x] Captura: email/senha digitados, foto da camera, localizacao precisa e arquivo de audio do microfone. So do Julio.
- [x] Canal da isca: WhatsApp, enviado manualmente do numero pessoal do Rafael para o Julio.
- [x] Apresentacao: tela espelhada no projetor ao vivo.

---

## Fluxo da experiencia

1. **Isca (WhatsApp):** Rafael manda pro Julio uma mensagem posando de ShopZen.
   Exemplo: *"[ShopZen] Identificamos um problema no seu produto anunciado. Sua conta de vendedor sera suspensa em 24h. Regularize agora: <link>"*.
   Gatilhos: urgencia, autoridade (marca), medo de perder a conta.

2. **Login falso (tela ShopZen, design proprio):** Julio digita email e senha.
   Qualquer senha e aceita.
   As credenciais sao capturadas e ele e levado para a "verificacao".

3. **"Verificacao de identidade" = coleta de permissoes:** com pretextos, a pagina pede em sequencia:
   - Camera ("tire uma selfie para confirmar que e voce") -> tira foto.
   - Localizacao ("confirme a regiao da sua conta") -> GPS preciso.
   - Microfone nem vamos justificar, so pedir junto.
   Cada permissao e um prompt que o Julio aceita, visivel no telao.

4. **Desfecho:** mensagem de "verificacao concluida" para parecer legitimo.

5. **Painel + revelacao:** no projetor, abre-se o painel com tudo capturado (credenciais em texto puro, foto, audio tocavel, mapa da localizacao, dados do dispositivo).
   Explica-se cada red flag e, ao fim, apaga-se tudo ao vivo.

---

## O que e capturado

> **Escopo realinhado.** Rafael re-alinhou com o Julio e com o professor orientador, que autorizaram ampliar a quantidade de informacoes capturadas na demo (alem do combinado originalmente acima).

| Dado | Como | Permissao? |
|------|------|------------|
| Email + senha digitados | Formulario de login (texto puro) | Nao |
| Foto | `getUserMedia` (camera) + captura de frame | Sim (prompt) |
| Audio | `getUserMedia` (microfone) + MediaRecorder | Sim (prompt) |
| Localizacao precisa | `navigator.geolocation` | Sim (prompt) |
| IP (local) + dispositivo | Request HTTP + User-Agent, tela, etc. | Nao |
| Fingerprint do dispositivo (resolucao, fuso horario, idioma, CPU, memoria, conexao, bateria) | APIs nativas do navegador (`screen`, `navigator.*`) | Nao |

---

## Sinais de alerta para o slide final (defesa)

- Mensagem com urgencia e ameaca ("sera suspensa em 24h").
- Remetente nao oficial / numero comum, nao canal verificado da empresa.
- Tela de login pedindo senha a partir de um link de mensagem.
- Site pedindo camera, microfone e localizacao para "verificar identidade" - desproporcional.
- HTTPS/cadeado NAO garante que o site e legitimo, so que a conexao e cifrada.

Protecoes: conferir o dominio na barra, nunca logar a partir de link recebido, acessar o site oficial direto, desconfiar de urgencia, revisar permissoes concedidas.

---

## Arquitetura tecnica

### Contexto seguro (requisito do navegador)
Camera, microfone e geolocalizacao so funcionam em HTTPS ou em `localhost`/`127.0.0.1`.
Como o site roda fechado, o caminho mais simples e abrir no proprio laptop em `http://localhost:PORTA` (todas as permissoes funcionam) e espelhar o laptop no projetor.
Se for necessario usar o celular do Julio, decidir na logistica: HTTPS local autoassinado (com aviso de certificado) ou espelhar o laptop. Nao bloqueia a criacao do site.

### Stack da aplicacao
- Node + Express (um servidor simples).
- SQLite embutido (`node:sqlite`) para metadados das capturas.
- Upload de foto/audio salvos em pasta local (`uploads/`), referenciados no banco.
- Telas:
  - `/` -> login falso (design proprio ShopZen).
  - `/verificacao` -> pede camera, localizacao e microfone e envia as capturas.
  - `/sucesso` -> tela de "verificacao concluida".
  - `/admin` -> painel protegido (ve tudo + botao de wipe).
- Identidade visual propria da ShopZen (cores/logo definidos na criacao).

---

## Pendencias de decisao

Identidade visual ShopZen
  - Base: branco predominante - fundo #FFFFFF, cinza claro #F5F6F8 pros campos/divisórias, texto #1F2430.
  - Accent: verde-esmeralda #10B981 - só em botões, links e logo.
  - Logo: wordmark "ShopZen" em bold, com ícone geométrico antes (sacola estilizada ou "Z" num quadrado verde). SVG inline/CSS, sem imagem externa.

  Formato/retenção foto e áudio
  - Foto: JPEG (frame do vídeo via canvas, qualidade ~0.8). Leve, suficiente pro telão.
  - Áudio: WebM/Opus (MediaRecorder padrão do navegador), ~3-5s.
  - Guardar em uploads/ nomeado pelo ID (<id>.jpg, <id>.webm), caminho referenciado no SQLite.
  - Retenção: zero pós-palestra - botão "Apagar tudo" no /admin deleta linhas do banco e arquivos em uploads/. Mesma lógica de wipe ao vivo do site 1.
  - Foto como snapshot único (sem stream contínuo); áudio com limite fixo de segundos - pega o necessário sem virar vigilância prolongada.
- [x] so login + verificacao?
