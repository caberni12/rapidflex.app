// === CONFIG ===
const GAS_URL = "https://script.google.com/macros/s/AKfycbwsXshOze1AzVq4Q65VVOQBv1oOngYKBvtTTTjSoqjCzN_ew0ckUrjYrVGr0ikFXxAM/exec";

// ==== Helpers: Banner moderno (#envAlert) ====
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
function _showEnvAlert(type, text, ttl = 6000){
  const el = _ensureEnvAlert();
  el.classList.remove('success','error','show');
  el.classList.add(type === 'success' ? 'success' : 'error');
  el.style.setProperty('--ttl', `${ttl}ms`);
  const icon = el.querySelector('.icon');
  const msg  = el.querySelector('.msg');
  if (icon) icon.textContent = (type === 'success' ? '✔' : '⛔');
  if (msg)  msg.textContent  = text || '';
  el.style.display = 'inline-flex';
  void el.offsetHeight;
  el.classList.add('show');
  const closeBtn = el.querySelector('.close');
  if (closeBtn){
    closeBtn.onclick = () => { el.classList.remove('show'); setTimeout(()=>{ el.style.display='none'; }, 200); };
  }
  if (ttl > 0){
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.style.display = 'none'; }, 200);
    }, ttl);
  }
}

// === SESIÓN ===
async function verificarSesion() {
  try {
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
      if (!localStorage.getItem("sessionToken")) {
        localStorage.setItem("sessionToken", "dev-token");
      }
      const cont = document.getElementById("contenido");
      if (cont) cont.style.display = "block";
      return;
    }
  } catch (e) {}

  const token = localStorage.getItem("sessionToken");
  if (!token) {
    window.location.href = "index.html";
    return;
  }
  try {
    const response = await fetch(`${GAS_URL}?checkSession=1&session=${token}`);
    const resultado = await response.json();
    if (resultado.status === "OK") {
      const cont = document.getElementById("contenido");
      if (cont) cont.style.display = "block";

      try{
        if (resultado && resultado.nombre) {
          _setUserName(resultado.nombre);
          try{ localStorage.setItem('nombreUsuario', resultado.nombre); }catch(_){}
        } else {
          _setUserNameFromStorage();
        }
      }catch(e){ _setUserNameFromStorage(); }
    } else {
      localStorage.removeItem("sessionToken");
      window.location.href = "index.html";
    }
  } catch (e) {
    console.error("Error al verificar sesión:", e);
    window.location.href = "index.html";
  }
}

function cerrarSesion(ev) {
  try { if (ev && ev.preventDefault) ev.preventDefault(); } catch(_) {}
  try {
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("nombreUsuario");
  } catch(_){}
  const slider = document.getElementById("slider");
  if (slider) { slider.classList.remove("open"); slider.style.height = "0px"; }
  _showEnvAlert('success', '🔒 Sesión cerrada correctamente', 1500);
  setTimeout(() => { window.location.href = "index.html"; }, 1300);
}

// === UI: Slider ===
function toggleSlider() {
  const slider = document.getElementById("slider");
  if (!slider) return;
  const isOpen = slider.classList.toggle("open");
  slider.style.height = isOpen
    ? (slider.scrollHeight ? (slider.scrollHeight + "px") : "280px")
    : "0px";
}
document.addEventListener("click", (e) => {
  const slider = document.getElementById("slider");
  const menuBtn = document.querySelector(".menu-btn");
  if (!slider) return;
  const clickedInsideSlider = slider.contains(e.target);
  const clickedMenuBtn = menuBtn && (menuBtn === e.target || menuBtn.contains(e.target));
  if (slider.classList.contains("open") && !clickedInsideSlider && !clickedMenuBtn) {
    slider.classList.remove("open");
    slider.style.height = "0px";
  }
});
window.addEventListener("resize", () => {
  const slider = document.getElementById("slider");
  if (slider && slider.classList.contains("open")) {
    slider.style.height = slider.scrollHeight ? (slider.scrollHeight + "px") : "280px";
  }
});

// === Chips: Usuario e IP ===
function _setUserName(name){
  try{
    const el = document.getElementById('usuarioNombre');
    if (!el) return;
    const txt = (name && String(name).trim()) ? String(name).trim() : 'Usuario';
    el.textContent = '👤 ' + txt;
  }catch(e){}
}
function _setUserNameFromStorage(){
  try{
    const keys = ['nombreUsuario','username','userName','usuario','nombre'];
    for (let i=0;i<keys.length;i++){
      const v = localStorage.getItem(keys[i]);
      if (v && String(v).trim()){ _setUserName(v); return; }
    }
    _setUserName('Usuario');
  }catch(e){ _setUserName('Usuario'); }
}

// IP pública + local
async function _fetchPublicIP(){
  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ifconfig.co/json',
    'https://icanhazip.com'
  ];
  for (const base of endpoints){
    try{
      const url = base + (base.includes('?') ? '&' : '?') + 'v=' + Date.now();
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      let ip = null;
      if (ct.includes('application/json')){
        const data = await res.json();
        ip = data?.ip || data?.address || data?.query || null;
      } else {
        ip = (await res.text()).trim();
      }
      if (ip && (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || /^[a-f0-9:]+$/i.test(ip))) return ip;
    }catch(_){}
  }
  return null;
}
function _getPrivateLocalIPs(timeoutMs = 1500){
  return new Promise((resolve) => {
    try{
      const ips = new Set();
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('x');
      pc.onicecandidate = (e) => {
        if (!e || !e.candidate) return;
        const cand = e.candidate.candidate || '';
        const matches = cand.match(/(?:\d{1,3}\.){3}\d{1,3}|[a-f0-9:]+/gi);
        if (matches) matches.forEach(ip => ips.add(ip));
      };
      pc.createOffer().then(of => pc.setLocalDescription(of));
      setTimeout(() => {
        try{ pc.close(); }catch(_){}
        const priv = [...ips].filter(ip => /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip));
        resolve(priv);
      }, timeoutMs);
    }catch(_){ resolve([]); }
  });
}
async function _setUserIP(){
  const el = document.getElementById('userIP');
  if(!el) return;
  const host = (location && location.hostname) ? location.hostname : 'desconocido';
  el.textContent = '📶 Host: ' + host;
  el.title = 'Hostname local (fallback)';
  const publicIP = await _fetchPublicIP();
  if (publicIP){
    el.textContent = '📶 IP pública: ' + publicIP;
    el.title = 'IP pública (saliente)';
  }
  try{
    const locals = await _getPrivateLocalIPs();
    const privateIP = locals[0];
    if (privateIP){
      el.textContent += `  •  IP local: ${privateIP}`;
      el.title += ' | IP local privada';
    }
  }catch(_){}
}

// === IFRAME AUTO-RESIZE ===
function _measureDocHeight(doc) {
  try {
    const b = doc.body, e = doc.documentElement;
    return Math.max(b.scrollHeight, e.scrollHeight, b.offsetHeight, e.offsetHeight, b.clientHeight, e.clientHeight);
  } catch { return 0; }
}
function _autoSizeIframe(frame) {
  if (!frame) return;
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return;
    try {
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
    } catch {}
    const resize = () => {
      const h = _measureDocHeight(doc);
      const cur = parseInt(frame.style.height||"0",10);
      if (h && Math.abs(cur - h) > 2) frame.style.height = h + "px";
    };
    resize();
    if (frame._observer) { try { frame._observer.disconnect(); } catch {} }
    const observer = new MutationObserver(() => {
      if (frame._raf) cancelAnimationFrame(frame._raf);
      frame._raf = requestAnimationFrame(resize);
    });
    observer.observe(doc.documentElement, {subtree:true, childList:true, attributes:true, characterData:true});
    frame._observer = observer;
    doc.addEventListener("load", () => {
      if (frame._raf) cancelAnimationFrame(frame._raf);
      frame._raf = requestAnimationFrame(resize);
    }, true);
    frame._forceResize = resize;
    setTimeout(resize, 120);
    setTimeout(resize, 400);
  } catch (err) {
    console.warn("Auto-resize iframe falló:", err);
  }
}
window.addEventListener("resize", () => {
  const f = document.getElementById("routeFrame");
  if (f && typeof f._forceResize === "function") f._forceResize();
});

// === Crear contenedor de iframe si no existe ===
function ensureRouteFrame(){
  let routeView = document.getElementById('routeView');
  let frame = document.getElementById('routeFrame');
  if (!routeView){
    routeView = document.createElement('div');
    routeView.id = 'routeView';
    routeView.style.display = 'none';
    routeView.style.width = '100%';
    frame = document.createElement('iframe');
    frame.id = 'routeFrame';
    frame.title = 'Vista';
    frame.style.width = '100%';
    frame.style.border = '0';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer';
    routeView.appendChild(frame);
    document.body.appendChild(routeView);
  } else if (!frame){
    frame = document.createElement('iframe');
    frame.id = 'routeFrame';
    frame.title = 'Vista';
    frame.style.width = '100%';
    frame.style.border = '0';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer';
    routeView.appendChild(frame);
  }
  return { routeView, frame };
}

// === Router (hash-based) ===
function hideAllViews() {
  const dash = document.getElementById('contenido-principal');
  const routeView = document.getElementById('routeView');
  if (dash) dash.style.display = 'none';
  if (routeView) routeView.style.display = 'none';
}
function showDashboard() {
  hideAllViews();
  const dash = document.getElementById("contenido-principal");
  if (dash) dash.style.display = "block";
  if (typeof cargarDashboard === "function") {
    try { cargarDashboard(); } catch (e) {}
  }
}
function loadFrame(url) {
  if (/main\.html$/i.test(url)) { showDashboard(); return; }
  hideAllViews();
  const { routeView, frame } = ensureRouteFrame();
  routeView.style.display = "block";
  if (frame) {
    if (frame._observer) { try { frame._observer.disconnect(); } catch {} }
    frame.style.height = "1px";
    const finalUrl = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    frame.onload = () => { _autoSizeIframe(frame); };
    frame.src = finalUrl;
  }
}
const ROUTES = {
  "dashboard":   () => showDashboard(),
  "sistema":     () => loadFrame("sistema.html"),
  "sistema2":    () => loadFrame("sistema2.html"),
  "usuarios":    () => loadFrame("usuarios.html"),
  // NUEVO: abrir usuarios2.html dentro del iframe
  "georeferencia": () => loadFrame("usuarios2.html"),
function onRouteChange() {
  const hash = (location.hash || "#/georeferencia").replace(/^#\/?/, "");
  (ROUTES[hash] || ROUTES["georeferencia"])();
  const slider = document.getElementById("slider");
  if (slider && slider.classList.contains("open")) {
    slider.classList.remove("open");
    slider.style.height = "0px";
  }
}

// === Seguridad básica ===
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
  const key = (e.key || "").toLowerCase();
  if (e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["i", "j", "c", "k"].includes(key)) ||
      (e.ctrlKey && ["u", "s", "p", "f", "c"].includes(key)) ||
      (e.metaKey && ["s", "p", "u", "f"].includes(key))) {
    e.preventDefault();
  }
});

// === Info de entorno ===
function _envInfo(){
  try{
    if (location.protocol === "file:") return { mode: "file" };
    const h = (location.hostname || "").toLowerCase();
    const isPrivate = (
      h === "localhost" || h === "127.0.0.1" ||
      /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
      !h.includes(".")
    );
    return { mode: isPrivate ? "private" : "public" };
  }catch{ return { mode: "unknown" }; }
}

// === Requisito de servidor ===
function _enforceServerRequirement(){
  try{
    if (location.protocol === "file:") {
      _showEnvAlert('error', '⛔ Operación bloqueada: usa Live Server o un servidor público.', 0);
      try { cerrarSesion(); } catch {}
      return false;
    }
  }catch(e){ console.warn("Enforce server requirement error:", e); }
  return true;
}

// === FCSH: alerta verde ===
function _maybeShowFCSHBanner(){
  try{
    const info = _envInfo();
    if (info.mode === "file") return;
    _showEnvAlert('success', '✔ El servidor informa que la conexión a la red fue exitosa', 6000);
  }catch(e){ console.warn("FCSH banner error:", e); }
}

// === Arranque ===
window.addEventListener("DOMContentLoaded", () => {
  if(!_enforceServerRequirement()) return;
  _maybeShowFCSHBanner();

  const _sl = document.getElementById("slider");
  if (_sl) _sl.style.height = "0px";

  const rv = document.getElementById('routeView');
  if (rv) rv.style.display = 'none';

  verificarSesion();
  if (!location.hash) location.hash = "#/georeferencia"; // abre usuarios2.html por defecto
  onRouteChange();
});
window.addEventListener("hashchange", onRouteChange);

// Atajo Alt+B
document.addEventListener("keydown", (e) => {
  if (e.altKey && (e.key || "").toLowerCase() === "b") {
    _showEnvAlert('success', '🔔 Alerta de prueba', 3000);
  }
});

// Chips al cargar
document.addEventListener("DOMContentLoaded", _setUserIP);
document.addEventListener("DOMContentLoaded", _setUserNameFromStorage);
