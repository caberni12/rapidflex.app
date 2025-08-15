const GAS_URL = "https://script.google.com/macros/s/AKfycbwsXshOze1AzVq4Q65VVOQBv1oOngYKBvtTTTjSoqjCzN_ew0ckUrjYrVGr0ikFXxAM/exec";

/* ===== Loader ===== */
function mostrarLoader(){ const l = document.getElementById("loader"); if (l) l.style.display = "flex"; }
function ocultarLoader(){ const l = document.getElementById("loader"); if (l) l.style.display = "none"; }

/* ===== Alertas modernas ===== */
function _ensureEnvAlert(){
  let el = document.getElementById('envAlert');
  if (!el){
    el = document.createElement('div');
    el.id = 'envAlert';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.innerHTML = `
      <span class="icon">✔</span>
      <span class="msg">Conexión exitosa.</span>
      <button class="close" type="button" aria-label="Cerrar">Cerrar</button>
    `;
    document.body.appendChild(el);
  }
  return el;
}
function _showEnvAlert(type, text, ttl = 2000){
  const el = _ensureEnvAlert();
  el.classList.remove('success','error','show');
  el.classList.add(type === 'success' ? 'success' : 'error');
  el.style.setProperty('--ttl', `${ttl}ms`);
  el.querySelector('.icon').textContent = (type === 'success' ? '✔' : '⛔');
  el.querySelector('.msg').textContent = text || '';
  el.style.display = 'inline-flex';
  void el.offsetHeight;        // reinicia animación
  el.classList.add('show');
  const closeBtn = el.querySelector('.close');
  if (closeBtn){
    closeBtn.onclick = () => { el.classList.remove('show'); setTimeout(()=>{ el.style.display='none'; }, 180); };
  }
  if (ttl > 0){
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.style.display = 'none'; }, 180);
    }, ttl);
  }
}

/* ===== Login ===== */
function validar(){
  const usuarioEl = document.getElementById("usuario");
  const claveEl   = document.getElementById("clave");

  const usuario = (usuarioEl?.value || "").trim();
  const clave   = (claveEl?.value || "").trim();

  if (!usuario || !clave){
    _showEnvAlert('error', '⛔ Debe ingresar usuario y clave.', 3000);
    return;
  }

  mostrarLoader();

  fetch(GAS_URL, {
    method: "POST",
    body: new URLSearchParams({ usuario, clave })
  })
  .then(res => res.json())
  .then(data => {
    ocultarLoader();
    if (data.status === "OK") {
      // Guarda token y nombre para pintar en main
      try {
        localStorage.setItem("sessionToken", data.token);
        localStorage.setItem("nombreUsuario", usuario); // usa el ingresado si backend no devuelve nombre
        if (data.nombre && String(data.nombre).trim()){
          localStorage.setItem("nombreUsuario", String(data.nombre).trim());
        }
      } catch {}

      _showEnvAlert('success', '✔ Acceso concedido…', 1200);
      setTimeout(() => { window.location.href = "main.html"; }, 1100);
    }
    else if (data.status === "DENEGADO") {
      _showEnvAlert('error', '⛔ No tienes permisos para acceder.', 4000);
    }
    else {
      _showEnvAlert('error', (data.mensaje || '⛔ Error en la autenticación.'), 4000);
    }
  })
  .catch(() => {
    ocultarLoader();
    _showEnvAlert('error', '⛔ Error de conexión.', 4000);
  });
}

/* ===== Seguridad (unificada, sin duplicados) ===== */
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
  const key = (e.key || "").toLowerCase();
  if (e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["i","j","c","k"].includes(key)) ||
      (e.ctrlKey && ["u","s","p","f","c"].includes(key)) ||
      (e.metaKey && ["s","p","u","f"].includes(key))) {
    e.preventDefault();
  }
});

/* (opcional) Enter para enviar */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") validar();
});
