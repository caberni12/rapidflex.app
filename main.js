// === CONFIG ===
const GAS_URL = "https://script.google.com/macros/s/AKfycbwsXshOze1AzVq4Q65VVOQBv1oOngYKBvtTTTjSoqjCzN_ew0ckUrjYrVGr0ikFXxAM/exec";

// === SESIÓN ===
async function verificarSesion() {
  try {
    // MODO DEV: Live Server
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
    } else {
      localStorage.removeItem("sessionToken");
      window.location.href = "index.html";
    }
  } catch (e) {
    console.error("Error al verificar sesión:", e);
    window.location.href = "index.html";
  }
}

function cerrarSesion() {
  localStorage.removeItem("sessionToken");
  window.location.href = "index.html";
}

// === UI: Slider ===
function toggleSlider() {
  const slider = document.getElementById("slider");
  if (!slider) return;
  const isOpen = slider.classList.toggle("open");
  // Control robusto por altura inline
  if (isOpen) {
    slider.style.height = slider.scrollHeight ? (slider.scrollHeight + "px") : "280px";
  } else {
    slider.style.height = "0px";
  }
}

// Cierre por click fuera
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

// Recalcular altura si cambia el tamaño
window.addEventListener("resize", () => {
  const slider = document.getElementById("slider");
  if (slider && slider.classList.contains("open")) {
    slider.style.height = slider.scrollHeight ? (slider.scrollHeight + "px") : "280px";
  }
});


// === IFRAME AUTO-RESIZE (single scroll) ===
function _measureDocHeight(doc) {
  try {
    const b = doc.body, e = doc.documentElement;
    return Math.max(
      b.scrollHeight, e.scrollHeight,
      b.offsetHeight, e.offsetHeight,
      b.clientHeight, e.clientHeight
    );
  } catch { return 0; }
}

function _autoSizeIframe(frame) {
  if (!frame) return;
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return;

    // Desactiva scroll interno del documento embebido
    try {
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
    } catch {}

    const resize = () => {
      const h = _measureDocHeight(doc);
      if (h && Math.abs((parseInt(frame.style.height||"0",10)) - h) > 2) {
        frame.style.height = h + "px";
      }
    };

    // Primera medición
    resize();

    // Observer para cambios en el DOM embebido
    if (frame._observer) { try { frame._observer.disconnect(); } catch {} }
    const observer = new MutationObserver(() => {
      if (frame._raf) cancelAnimationFrame(frame._raf);
      frame._raf = requestAnimationFrame(resize);
    });
    observer.observe(doc.documentElement, {subtree:true, childList:true, attributes:true, characterData:true});
    frame._observer = observer;

    // Recalcular en cargas de recursos (imágenes, fuentes)
    doc.addEventListener("load", () => {
      if (frame._raf) cancelAnimationFrame(frame._raf);
      frame._raf = requestAnimationFrame(resize);
    }, true);

    // Exponer función para resize global
    frame._forceResize = resize;
    setTimeout(resize, 120);
    setTimeout(resize, 400);
  } catch (err) {
    console.warn("Auto-resize iframe falló:", err);
  }
}

// Recalcular en resize de ventana
window.addEventListener("resize", () => {
  const f = document.getElementById("routeFrame");
  if (f && typeof f._forceResize === "function") f._forceResize();
});

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
    try { cargarDashboard(); } catch (e) { /* noop */ }
  }
}

function loadFrame(url) {
  // Evitar cargar main dentro del iframe
  if (/main\.html$/i.test(url)) { showDashboard(); return; }
  hideAllViews();
  const routeView = document.getElementById("routeView");
  const frame = document.getElementById("routeFrame");
  if (routeView) routeView.style.display = "block";
  if (frame) {
    if (frame._observer) { try { frame._observer.disconnect(); } catch {} }
    frame.style.height = "1px";
    const finalUrl = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    frame.onload = () => { _autoSizeIframe(frame); };
    frame.src = finalUrl;
  }
}

const ROUTES = {
  "dashboard": () => showDashboard(),
  "sistema":   () => loadFrame("sistema.html"),
  "sistema2":  () => loadFrame("sistema2.html"),
  "usuarios":  () => loadFrame("usuarios.html"),
};

function onRouteChange() {
  const hash = (location.hash || "#/dashboard").replace(/^#\/?/, "");
  (ROUTES[hash] || ROUTES["dashboard"])();
  // cerrar slider si estaba abierto
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


// === Entorno FCSH: mostrar aviso si NO es servidor público ===
function _isPrivateHost(hostname){
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  // Orígenes locales/privados
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  // Live Server host sin punto (ej: 127.0.0.1:5500 o hostname sin TLD)
  if (!h.includes(".")) return true;
  return false;
}

function _maybeShowFCSHBanner(){
  try{
    const info = _envInfo();
    const el = document.getElementById("envBannerFCSH");
    const closeBtn = document.getElementById("envBannerClose");
    if (!el) return;

    const setText = (txt, ok=false) => {
      const span = el.querySelector("span");
      if (span) span.textContent = txt;
      el.classList.toggle("is-ok", !!ok);
    };

    // file:// => advertencia y cierre (ya hecho por _enforceServerRequirement)
    if (info.mode === "file"){
      setText("⚠ El servidor debe estar conectado a una red pública (o al menos Live Server) para poder operar con normalidad.", false);
      el.style.display = "inline-flex";
      if (closeBtn){
        closeBtn.onclick = () => { el.style.display = "none"; };
      }
      return;
    }

    // private/public => mostrar SIEMPRE por 6s
    setText("✔ El servidor informa que la conexion a la red fue exitosa", true);
    el.style.display = "inline-flex";
    if (closeBtn){
      closeBtn.onclick = () => { el.style.display = "none"; };
    }
    setTimeout(() => { el.style.display = "none"; }, 6000);
  }catch(e){ console.warn("FCSH banner error:", e); }
}


// === Requisito de servidor: cerrar sesión si se abre localmente (file://) ===
function _enforceServerRequirement(){
  try{
    // Si se abre como archivo local, cerrar sesión y bloquear
    if (location.protocol === "file:") {
      // Mostrar banner si existe
      const el = document.getElementById("envBannerFCSH");
      if (el){
        el.style.display = "inline-flex";
        el.querySelector("span").textContent = "⚠ El servidor debe estar conectado a una red pública (o al menos Live Server) para poder operar con normalidad.";
      }
      // Cerrar sesión y volver al inicio
      try { cerrarSesion(); } catch {}
      return false;
    }
  }catch(e){ console.warn("Enforce server requirement error:", e); }
  return true;
}


// === Info de entorno (file / private / public) ===
function _envInfo(){
  try{
    if (location.protocol === "file:") return { mode: "file" };
    const h = (location.hostname || "").toLowerCase();
    const isPrivate = (
      h === "localhost" ||
      h === "127.0.0.1" ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
      !h.includes(".") // host sin TLD (p.ej., live server)
    );
    return { mode: isPrivate ? "private" : "public" };
  }catch{ return { mode: "unknown" }; }
}

// === Arranque ===
window.addEventListener("DOMContentLoaded", () => {
  if(!_enforceServerRequirement()) return;
  _maybeShowFCSHBanner();
  _maybeShowFCSHBanner();
  // Slider cerrado al inicio
  const _sl = document.getElementById("slider");
  if (_sl) _sl.style.height = "0px";
  // Ocultar vista de iframe hasta enrutado
  const rv = document.getElementById('routeView');
  if (rv) rv.style.display = 'none';

  verificarSesion();
  if (!location.hash) location.hash = "#/dashboard";
  onRouteChange();
});
window.addEventListener("hashchange", onRouteChange);


// Atajo Alt+B para mostrar el banner
document.addEventListener("keydown", (e) => {
  if (e.altKey && (e.key || "").toLowerCase() === "b") {
    const el = document.getElementById("envBannerFCSH");
    if (el){ el.style.display = "inline-flex"; }
  }
});

// Si la URL contiene #/show-banner, mostrarlo
if (String(location.hash).includes("show-banner")) {
  window.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("envBannerFCSH");
    if (el){ el.style.display = "inline-flex"; }
  });
}

