// permisos.js — control por hoja "Permisos"
const GAS_PERMISOS = "https://script.google.com/macros/s/AKfycbzCta6x3pBxBcb7M5U4pNKy3ilLv6dzTqXF0DNqs9XXe8Gn5g_Tvk5JUfu_npBVzZPG/exec";

const norm = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9\-_/ ]/g,"");
const CANON = {
  "GEOLOCALIZACION":"GEO-REFERENCIA","GEO REFERENCIA":"GEO-REFERENCIA",
  "GEOREFERENCIA":"GEO-REFERENCIA","GEOREFERENCIAS":"GEO-REFERENCIA",
  "GEO-REFERENCIA":"GEO-REFERENCIA"
};

document.addEventListener("DOMContentLoaded", () => {
  prelock();
  initPermisos();
  watchNewControls();
});
window.refrescarPermisos = initPermisos;

/* ===== núcleo ===== */
function keyOf(el){ const raw = el.getAttribute("data-control") || ""; return norm(CANON[norm(raw)] || raw); }

function prelock(){
  document.querySelectorAll("[data-control]").forEach(el=>{
    const k = keyOf(el);
    if (k === "MENU" || el.matches(".menu-btn")) { desbloquear(el); return; }
    bloquear(el);
  });
}

function watchNewControls(){
  const obs = new MutationObserver(muts=>{
    for (const m of muts){
      m.addedNodes.forEach(n=>{
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches(".menu-btn")) { desbloquear(n); return; }
        if (n.hasAttribute && n.hasAttribute("data-control")){
          const k = keyOf(n);
          if (k === "MENU") { desbloquear(n); return; }
          bloquear(n);
        }
        if (n.querySelectorAll){
          n.querySelectorAll("[data-control]").forEach(el=>{
            const k = keyOf(el);
            if (k === "MENU" || el.matches(".menu-btn")) { desbloquear(el); return; }
            bloquear(el);
          });
        }
      });
    }
  });
  obs.observe(document.body, { childList:true, subtree:true });
}

function leerUsuario(){
  const el = document.querySelector("#usuarioNombre");
  const fromData = el ? (el.getAttribute("data-usuario")||"").trim() : "";
  let txt = fromData || (el ? (el.textContent||"").trim() : "");
  if (!txt) txt = localStorage.getItem("nombreUsuario") || localStorage.getItem("usuario") || "";
  txt = txt.replace(/^👤\s*/,"").replace(/\(.*?\)/g,"").trim();
  if (!txt || /cargando|usuario/i.test(txt)) return "";
  return txt;
}

async function initPermisos(){
  const who = leerUsuario();
  if (!who){ desbloquearMinimo(); return; }
  try{
    const r = await fetch(`${GAS_PERMISOS}?action=getPermisos&who=${encodeURIComponent(who)}`, { cache:"no-store" });
    const raw = await r.text();
    let data = null; try{ data = JSON.parse(raw); }catch{}
    if (!data || !data.ok){ desbloquearMinimo(); return; }
    aplicarPermisos(data.permisos);
  }catch{ desbloquearMinimo(); }
}

function desbloquearMinimo(){
  const allow = new Set(["MENU","DASHBOARD"]);
  document.querySelectorAll("[data-control]").forEach(el=>{
    if (allow.has(keyOf(el))) desbloquear(el);
  });
}

function aplicarPermisos(permisos){
  const p = {};
  Object.keys(permisos||{}).forEach(k=>{
    const canon = CANON[norm(k)] || k;
    p[norm(canon)] = !!permisos[k];
  });
  p["MENU"] = true;
  if (p["DASHBOARD"] === undefined) p["DASHBOARD"] = true;

  document.querySelectorAll("[data-control]").forEach(el=>{
    const k = keyOf(el);
    if (k === "MENU" || el.matches(".menu-btn")) { desbloquear(el); return; }
    if (p[k]) desbloquear(el); else bloquear(el);
  });
}

/* ===== helpers ===== */
function bloquear(el){
  if (!el) return;
  el.classList.add("is-locked");
  el.setAttribute("aria-disabled","true");
  el.setAttribute("tabindex","-1");
  if (el.hasAttribute("href")){
    el.dataset.href = el.getAttribute("href");
    el.removeAttribute("href");
  }
  el.style.pointerEvents = "none";
  if (!el.title) el.title = "Sin permiso";
}
function desbloquear(el){
  if (!el) return;
  el.classList.remove("is-locked");
  el.removeAttribute("aria-disabled");
  el.removeAttribute("tabindex");
  if (el.dataset && el.dataset.href && !el.hasAttribute("href")) el.setAttribute("href", el.dataset.href);
  el.style.pointerEvents = "";
  if (el.title === "Sin permiso") el.removeAttribute("title");
}
