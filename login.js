/* ===== Endpoint de VALIDACIÓN ===== */
const GAS_URL = "https://script.google.com/macros/s/AKfycbwsXshOze1AzVq4Q65VVOQBv1oOngYKBvtTTTjSoqjCzN_ew0ckUrjYrVGr0ikFXxAM/exec";

/* ===== Endpoint de REGISTRO (conexion) ===== */
const LOG_URL = "https://script.google.com/macros/s/AKfycbyIRFouSj1OIwIcIHIy1cPlVzgJKzwAScE-J_qm5uFPxtwIfkSzDTnbgIn6YkEuSFo/exec";

/* ===== Loader ===== */
function mostrarLoader(){ const l = document.getElementById("loader"); if (l) l.style.display = "flex"; }
function ocultarLoader(){ const l = document.getElementById("loader"); if (l) l.style.display = "none"; }

/* ===== Alertas ===== */
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
  void el.offsetHeight;
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

/* ===== Utilidades auto: geo + fecha/hora CL + envío ===== */
async function getGeo(){
  const viaIP = async ()=>{ try{
    const r = await fetch('https://ipapi.co/json/'); if(!r.ok) return null;
    const j = await r.json(); return {lat:j.latitude, lng:j.longitude};
  }catch{ return null; } };
  if ('geolocation' in navigator){
    try{
      const p = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(
        res, rej, { enableHighAccuracy:true, timeout:5000, maximumAge:15000 }
      ));
      return { lat:p.coords.latitude, lng:p.coords.longitude };
    }catch{}
  }
  return await viaIP();
}
function fechaHoraCL(){
  const tz='America/Santiago', now=new Date();
  return {
    fecha: new Intl.DateTimeFormat('es-CL',{ timeZone:tz }).format(now),
    hora:  new Intl.DateTimeFormat('es-CL',{ timeZone:tz, hour:'2-digit', minute:'2-digit', second:'2-digit' }).format(now)
  };
}
function logConexion(payload){
  try{
    const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
    if (!(navigator.sendBeacon && navigator.sendBeacon(LOG_URL, blob))){
      fetch(LOG_URL,{method:'POST',body:JSON.stringify(payload)}).catch(()=>{});
    }
  }catch{}
}
/* Envía ONLINE con tus 5 datos + 4 automáticos */
async function enviarConexionOnline(Usuario, Clave, Acceso, nombre, rol){
  const geo = await getGeo();
  const {fecha, hora} = fechaHoraCL();
  logConexion({
    accion: 'login_event',
    Usuario, Clave, Acceso, nombre, rol,                 // 5 datos tuyos
    geolocalizacion: geo ? `${geo.lat},${geo.lng}` : '', // auto
    hora,                                                // auto
    fecha,                                               // auto
    estado: 'online'                                     // auto
  });
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
  .then(async (data) => {
    ocultarLoader();
    if (data.status === "OK") {
      try {
        localStorage.setItem("sessionToken", data.token);
        localStorage.setItem("nombreUsuario", data?.nombre?.trim() || usuario);
      } catch {}

      // Envía a "conexion": 5 datos que tienes + 4 automáticos
      const Acceso = String(data?.acceso ?? 'true');
      const nombre = String(data?.nombre ?? usuario);
      const rol    = String(data?.rol ?? '');
      await enviarConexionOnline(usuario, clave, Acceso, nombre, rol);

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

/* ===== Seguridad ===== */
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
document.addEventListener("keydown", (e) => { if (e.key === "Enter") validar(); });
