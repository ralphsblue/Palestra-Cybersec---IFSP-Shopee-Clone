const video = document.getElementById('video');
const foto = document.getElementById('foto');
const canvas = document.getElementById('canvas');
const scanner = document.getElementById('scanner');
const erroEl = document.getElementById('camera-erro');
const controlesCapturar = document.getElementById('controles-capturar');
const btnCapturar = document.getElementById('btn-capturar');
const btnCancelar = document.getElementById('btn-cancelar');
const modalSucesso = document.getElementById('modal-sucesso');
const btnContinuar = document.getElementById('modal-continuar');

let streamAtual = null;

async function iniciarCamera() {
  erroEl.textContent = '';
  try {
    streamAtual = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    video.srcObject = streamAtual;
    video.style.display = 'block';
    foto.style.display = 'none';
    controlesCapturar.style.display = 'flex';
  } catch {
    erroEl.textContent = 'Nao foi possivel acessar a camera. Verifique a permissao e tente novamente.';
  }
}

function pararCamera() {
  if (streamAtual) {
    streamAtual.getTracks().forEach((track) => track.stop());
    streamAtual = null;
  }
}

function rodarScanner() {
  return new Promise((resolve) => {
    scanner.classList.add('ativo');
    scanner.addEventListener(
      'animationend',
      () => {
        scanner.classList.remove('ativo');
        resolve();
      },
      { once: true }
    );
  });
}

btnCapturar.addEventListener('click', async () => {
  if (!video.videoWidth) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const imagemCapturada = canvas.toDataURL('image/jpeg', 0.8);

  pararCamera();
  video.style.display = 'none';
  foto.src = imagemCapturada;
  foto.style.display = 'block';
  controlesCapturar.style.display = 'none';

  await rodarScanner();

  try {
    const res = await fetch('/verificacao/foto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagemBase64: imagemCapturada }),
    });
    const data = await res.json();

    if (data.ok) {
      try {
        sessionStorage.setItem('shopzen_cap_camera', '1');
        sessionStorage.setItem('shopzen_cap_foto', imagemCapturada);
      } catch {
        // sessionStorage indisponivel, segue sem restaurar miniatura depois
      }
      modalSucesso.style.display = 'flex';
    } else {
      erroEl.textContent = 'Falha ao enviar a foto. Tente novamente.';
      iniciarCamera();
    }
  } catch {
    erroEl.textContent = 'Falha ao enviar a foto. Tente novamente.';
    iniciarCamera();
  }
});

btnContinuar.addEventListener('click', () => {
  window.location.href = '/verificacao';
});

btnCancelar.addEventListener('click', () => {
  pararCamera();
  window.location.href = '/verificacao';
});

window.addEventListener('pagehide', pararCamera);

iniciarCamera();
