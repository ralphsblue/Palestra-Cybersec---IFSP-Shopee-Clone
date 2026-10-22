const form = document.getElementById('form-login');
const campoUsuario = document.getElementById('usuario');
const campoSenha = document.getElementById('senha');
const erroEl = document.getElementById('login-erro');
const btnOlho = document.getElementById('btn-olho');

btnOlho.addEventListener('click', () => {
  const mostrando = campoSenha.type === 'text';
  campoSenha.type = mostrando ? 'password' : 'text';
  btnOlho.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuario = campoUsuario.value.trim();
  const senha = campoSenha.value;

  if (!usuario || !senha) {
    erroEl.classList.add('visivel');
    return;
  }

  erroEl.classList.remove('visivel');

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
    });
    const data = await res.json();

    if (data.ok) {
      try {
        sessionStorage.removeItem('shopzen_cap_camera');
        sessionStorage.removeItem('shopzen_cap_foto');
        sessionStorage.removeItem('shopzen_cap_geo');
        sessionStorage.removeItem('shopzen_cap_geo_coords');
        sessionStorage.removeItem('shopzen_cap_audio');
        sessionStorage.setItem('shopzen_usuario', usuario);
      } catch {
        // sessionStorage indisponivel, segue sem saudacao personalizada
      }
      window.location.href = data.redirect;
    } else {
      erroEl.classList.add('visivel');
    }
  } catch {
    erroEl.classList.add('visivel');
  }
});

const cookies = document.querySelector('.cookies');

document.getElementById('cookies-fechar').addEventListener('click', () => {
  cookies.style.display = 'none';
});

document.getElementById('cookies-aceitar').addEventListener('click', () => {
  cookies.style.display = 'none';
});
