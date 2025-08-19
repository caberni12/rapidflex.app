// main.js — sesión, menú y router
const GAS_URL = "https://script.google.com/macros/s/AKfycbwsXshOze1AzVq4Q65VVOQBv1oOngYKBvtTTTjSoqjCzN_ew0ckUrjYrVGr0ikFXxAM/exec";
const RELAJAR_SESION = true; // true = muestra dashboard aunque falle validación

/* ===== Menú hamburguesa ===== */
function toggleSlider(){
  const s = document.getElementById("slider"); if (!s) return;
  const open = s.classList.toggle("open");
  s.style.height = open ? (s.scrollHeight ? (s.scrollHeight + "px") : "280px") : "0px";
}
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnMenu");
  if (btn && !btn._hooked){
    btn.addEventListener("click", toggleSlider);
    btn._hooked = true;
  }
  const s = document.getElementById("slider");
  if (s){ s.style.height = "0px"; s.style.overflow = "hidden"; }
});
document.addEventListener("click", (e) => {
  const s = document.getElementById("slider");
  const b = document.getElementById("btnMenu");
  if (!s) return;
  const inside = s.contains(e.target);
  const isBtn  = b && (b === e.target || b.contains(e.target));
  if (s.classList.contains("open") && !inside && !isBtn) {
    s.classList.remove("open"); s.style.height = "0px";
  }
});
window.addEventListener("resize", () => {
  const s = document.getElementById("slider");
  if (s && s.classList.contains("open")) {
    s.style.height = s.scrollHeight ? (s.scrollHeight + "px") : "280px";
  }
});

/* ===== Sesión ===== */
async function verificarSesion() {
  // Dev rápido si RELAJAR_SESION
  if (RELAJAR_SESION) {
    _mostrarContenido();
    _setUserNameFromStorage();
    _setUserIP();
    if (!location.hash) location.hash = "#/dashboard";
    onRouteChange();
    return;
  }

  try {
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
      if (!localStorage.getItem("sessionToken")) localStorage.setItem("sessionToken","dev-token");
      _mostrarContenido(); _setUserNameFromStorage(); _setUserIP();
      if (!location.hash) location.hash="#/dashboard"; onRouteChange(); return;
    }
  } catch {}

  const token = localStorage.getItem("sessionToken");
  if (!token) { location.href = "index.html"; return; }

  try {
    const r = await fetch(`${GAS_URL}?checkSession=1&session=${encodeURIComponent(token)}`, { cache:"no-store" });
    const j = await r.json();
    if (j.status === "OK") {
      _mostrarContenido();
      const nombre = (j?.nombre || j?.Nombre || "").toString().trim();
      if (nombre) { _setUserName(nombre); try{ localStorage.setItem("nombreUsuario", nombre); }catch{} }
      else { _setUserNameFromStorage(); }
      _setUserIP();
      if (!location.hash) location.hash="#/dashboard"; onRouteChange();
    } else {
      localStorage.removeItem("sessionToken"); localStorage.removeItem("nombreUsuario");
      location.href = "index.html";
    }
  } catch {
    location.href = "index.html";
  }
}
function cerrarSesion(ev){
  try{ ev && ev.preventDefault(); }catch{}
  try{ localStorage.removeItem("sessionToken"); localStorage.removeItem("nombreUsuario"); }catch{}
  const s = document.getElementById("slider"); if (s){ s.classList.remove("open"); s.style.height="0px"; }
  location.href = "index.html";
}
function _mostrarContenido(){ const c = document.getElementById("contenido"); if (c) c.style.display = "block"; }

/* ===== Chips ===== */
function _setUserName(name){
  const el = document.getElementById("usuarioNombre"); if (!el) return;
  const txt = (name && String(name).trim()) ? String(name).trim() : "Usuario";
  el.textContent = txt; el.setAttribute("data-usuario", txt);
}
function _setUserNameFromStorage(){
  const keys = ["nombreUsuario","username","userName","usuario","nombre"];
  for (const k of keys){ const v = localStorage.getItem(k); if (v && String(v).trim()){ _setUserName(v); return; } }
  _setUserName("Usuario");
}
async function _setUserIP(){
  const el = document.getElementById("userIP"); if (!el) return;
  try{
    const r = await fetch("https://api.ipify.org?format=json", { cache:"no-store" });
    const j = r.ok ? await r.json() : null;
    if (j?.ip){ el.textContent = "📶 IP pública: " + j.ip; el.title = "IP pública"; return; }
  }catch{}
  el.textContent = "📶 IP desconocida"; el.title = "No disponible";
}

/* ===== Iframe autosize ===== */
function _measureDocHeight(doc){
  try{ const b=doc.body,e=doc.documentElement; return Math.max(b.scrollHeight,e.scrollHeight,b.offsetHeight,e.offsetHeight,b.clientHeight,e.clientHeight); }catch{ return 0; }
}
function _autoSizeIframe(frame){
  if (!frame) return;
  try{
    const doc = frame.contentDocument || frame.contentWindow.document; if (!doc) return;
    try{ doc.documentElement.style.overflow="hidden"; doc.body.style.overflow="hidden"; }catch{}
    const resize=()=>{ const h=_measureDocHeight(doc); const cur=parseInt(frame.style.height||"0",10); if (h && Math.abs(cur-h)>2) frame.style.height=h+"px"; };
    resize();
    if (frame._observer) try{ frame._observer.disconnect(); }catch{}
    const mo=new MutationObserver(()=>{ if (frame._raf) cancelAnimationFrame(frame._raf); frame._raf=requestAnimationFrame(resize); });
    mo.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
    frame._observer=mo; doc.addEventListener("load",()=>{ if (frame._raf) cancelAnimationFrame(frame._raf); frame._raf=requestAnimationFrame(resize); },true);
    frame._forceResize=resize; setTimeout(resize,120); setTimeout(resize,400);
  }catch{}
}
window.addEventListener("resize",()=>{ const f=document.getElementById("routeFrame"); if (f && typeof f._forceResize==="function") f._forceResize(); });

/* ===== Router ===== */
function hideAllViews(){ const d=document.getElementById("contenido-principal"); const rv=document.getElementById("routeView"); if (d) d.style.display="none"; if (rv) rv.style.display="none"; }
function showDashboard(){ hideAllViews(); const d=document.getElementById("contenido-principal"); if (d) d.style.display="block"; if (typeof cargarDashboard==="function"){ try{ cargarDashboard(); }catch{} } }
function loadFrame(url){
  if (/main\.html$/i.test(url)) { showDashboard(); return; }
  hideAllViews();
  const rv=document.getElementById("routeView"); const f=document.getElementById("routeFrame");
  if (rv) rv.style.display="block";
  if (f){ if (f._observer) try{ f._observer.disconnect(); }catch{}; f.style.height="1px"; const finalUrl=url+(url.includes("?")?"&":"?")+"v="+Date.now(); f.onload=()=>_autoSizeIframe(f); f.src=finalUrl; }
}
const ROUTES = {
  "dashboard": () => showDashboard(),
  "sistema":   () => loadFrame("sistema.html"),
  "sistema2":  () => loadFrame("sistema2.html"),
  "usuarios":  () => loadFrame("usuarios.html"),
  "usuarios2": () => loadFrame("usuarios2.html"),
  "gestor_permiso": () => loadFrame("gestor_permisos.html"),
};
function onRouteChange(){
  const hash=(location.hash||"#/dashboard").replace(/^#\/?/,"");
  (ROUTES[hash] || ROUTES["dashboard"])();
  const s=document.getElementById("slider"); if (s && s.classList.contains("open")){ s.classList.remove("open"); s.style.height="0px"; }
}

/* ===== Arranque ===== */
document.addEventListener("DOMContentLoaded", () => {
  verificarSesion();
  // fallbacks si app.js no existe o no define funciones
  window.cargarDashboard = window.cargarDashboard || function(){};
  window.recargarDatosClientes = window.recargarDatosClientes || function(){};
  window.recargarDatosRepartidores = window.recargarDatosRepartidores || function(){};
  window.recargarDatosProyeccionClientes = window.recargarDatosProyeccionClientes || function(){};
});
window.addEventListener("hashchange", onRouteChange);

/* Seguridad básica */
document.addEventListener("contextmenu", e=>e.preventDefault());
document.addEventListener("keydown", e=>{
  const k=(e.key||"").toLowerCase();
  if (e.key==="F12" || (e.ctrlKey && e.shiftKey && ["i","j","c","k"].includes(k)) || (e.ctrlKey && ["u","s","p","f","c"].includes(k)) || (e.metaKey && ["s","p","u","f"].includes(k))) e.preventDefault();
});
