// permisos.js — ocultar/mostrar según permisos
const GAS_PERMISOS = "https://script.google.com/macros/s/AKfycbzCta6x3pBxBcb7M5U4pNKy3ilLv6dzTqXF0DNqs9XXe8Gn5g_Tvk5JUfu_npBVzZPG/exec";

const norm = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toUpperCase().replace(/[^A-Z0-9\-_/ ]/g,"");

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
function keyOf(el){
  const raw = el.getAttribute("data-control") || "";
  return norm(CANON[norm(raw)] || raw);
}

/* Oculta por defecto todo menos MENU y el botón */
function prelock(){
  document.querySelectorAll("[data-control]").forEach(el=>{
    const k = keyOf(el);
    if (k === "MENU" || el.matches(".menu-btn")) { mostrar(el); return; }
    ocultar(el);
  });
}

/* Si aparecen nuevos nodos con data-control, ocultar por defecto salvo MENU */
function watchNewControls(){
  const obs = new MutationObserver(muts=>{
    for (const m of muts){
      m.addedNodes.forEach(n=>{
        if (n.nodeType !== 1) return;

        if (n.matches && n.matches(".menu-btn")) { mostrar(n); return; }

        if (n.hasAttribute && n.hasAttribute("data-control")){
          const k = keyOf(n);
          if (k === "MENU") { mostrar(n); return; }
          ocultar(n);
        }

        if (n.querySelectorAll){
          n.querySelectorAll("[data-control]").forEach(el=>{
            const k = keyOf(el);
            if (k === "MENU" || el.matches(".menu-btn")) { mostrar(el); return; }
            ocultar(el);
          });
        }
      });
    }
  });
  obs.observe(document.body, { childList:true, subtree:true });
}

/* Usuario visible */
function leerUsuario(){
  const el = document.querySelector("#usuarioNombre");
  const fromData = el ? (el.getAttribute("data-usuario")||"").trim() : "";
  let txt = fromData || (el ? (el.textContent||"").trim() : "");
  if (!txt) txt = localStorage.getItem("nombreUsuario") || localStorage.getItem("usuario") || "";
  txt = txt.replace(/^👤\s*/,"").replace(/\(.*?\)/g,"").trim();
  if (!txt || /cargando|usuario/i.test(txt)) return "";
  return txt;
}

/* Carga y aplica permisos */
async function initPermisos(){
  const who = leerUsuario();
  if (!who){ desbloquearMinimo(); return; }
  try{
    const r = await fetch(`${GAS_PERMISOS}?action=getPermisos&who=${encodeURIComponent(who)}`, { cache:"no-store" });
    const raw = await r.text();
    let data = null; try{ data = JSON.parse(raw); }catch{}
    if (!data || !data.ok){ desbloquearMinimo(); return; }
    aplicarPermisos(data.permisos);
  }catch{
    desbloquearMinimo();
  }
}

/* Siempre visibles: MENU y DASHBOARD */
function desbloquearMinimo(){
  const allow = new Set(["MENU","DASHBOARD"]);
  document.querySelectorAll("[data-control]").forEach(el=>{
    if (allow.has(keyOf(el))) mostrar(el); else ocultar(el);
  });
}

/* Mostrar si true, ocultar si false; por defecto oculto salvo MENU/DASHBOARD */
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
    if (k === "MENU" || el.matches(".menu-btn")) { mostrar(el); return; }
    if (p[k]) mostrar(el); else ocultar(el);
  });
}

/* ===== helpers visuales ===== */
function ocultar(el){
  if (!el) return;
  // guardar href y quitarlo por seguridad
  if (el.hasAttribute && el.hasAttribute("href")){
    el.dataset.href = el.getAttribute("href");
    el.removeAttribute("href");
  }
  el.style.display = "none";
  el.classList.add("is-locked");
  el.setAttribute("aria-hidden","true");
}

function mostrar(el){
  if (!el) return;
  el.style.display = "";
  el.classList.remove("is-locked");
  el.removeAttribute("aria-hidden");
  if (el.dataset && el.dataset.href && !el.hasAttribute("href")) {
    el.setAttribute("href", el.dataset.href);
  }
}
