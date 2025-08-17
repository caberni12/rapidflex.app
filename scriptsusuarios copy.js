/* ===== usuarios.js (listado + modal mapa + lectura de hoja conexion) ===== */

/* Endpoints */
const URL_GET  = 'https://script.google.com/macros/s/AKfycbzjmX3yjeVjbAw-34lKRXJvAmEIfZZXTH6scPtuAoYht_gp-00wG47eUSaryppg_Bgo/exec';
/* CONN_API: ?accion=last_all / ?accion=last&usuario=U desde hoja "conexion" */
const CONN_API = 'https://script.google.com/macros/s/AKfycbzTe86F-F_uqs1ixii8RoW-6frsyZamQEOVBN5cW2ZzfWtOvu59VmjNhrc2ftvcZreA/exec';

/* DOM */
const tabla = document.querySelector("#tabla tbody");

/* Estado */
let primeraCarga = true;
let poller = null;

/* Toast */
function toast(msg, type = "ok", ms = 2000) {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.textContent = msg;
  Object.assign(el.style, {
    position:"fixed", top:"12px", left:"50%", transform:"translateX(-50%)",
    padding:"10px 14px", background: type==="ok" ? "#0ea5e9" : "#ef4444",
    color:"#fff", fontSize:"14px", borderRadius:"8px", zIndex:"9999",
    boxShadow:"0 2px 6px rgba(0,0,0,.2)"
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition="opacity .25s"; el.style.opacity="0";
    setTimeout(() => el.remove(), 250);
  }, ms);
}

/* Util */
const geoToString = (lat, lng) => (isFinite(lat) && isFinite(lng) ? `${lat}, ${lng}` : "");

/* Fecha */
function parseDateFlex(v){
  if (v==null || v==='') return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // Excel serial days
    if (v > 25569 && v < 60000) return new Date(Math.round((v - 25569) * 86400 * 1000));
    // epoch
    if (v > 1e12) return new Date(v);
    if (v > 1e9)  return new Date(v * 1000);
  }
  const s = String(v).trim();
  const iso = new Date(s);
  if (!isNaN(iso)) return iso;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m){
    const dd = +m[1], MM = (+m[2])-1, yyyy = +(m[3].length===2 ? ('20'+m[3]) : m[3]);
    const hh = m[4]?+m[4]:0, mi = m[5]?+m[5]:0, ss = m[6]?+m[6]:0;
    return new Date(yyyy, MM, dd, hh, mi, ss);
  }
  return null;
}
function formatFecha(v){
  const d = parseDateFlex(v);
  if (!d) return String(v||'');
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

/* Normaliza fila base (usuarios) */
function normalizar(item) {
  const lat = item.geo_lat ?? item.lat ?? item.Lat ?? "";
  const lng = item.geo_lng ?? item.lng ?? item.Lng ?? "";
  const latNum = lat !== "" ? parseFloat(String(lat).replace(',', '.')) : NaN;
  const lngNum = lng !== "" ? parseFloat(String(lng).replace(',', '.')) : NaN;

  return {
    usuario: item.usuario ?? item.Usuario ?? "",
    clave:   item.clave   ?? item.Clave   ?? "",
    acceso:  item.acceso  ?? item.Acceso  ?? "",
    nombre:  item.nombre  ?? item.Nombre  ?? "",
    rol:     item.rol     ?? item.Rol     ?? "",
    fila:    item.fila,
    geo_lat: latNum,
    geo_lng: lngNum,
    geolocalizacion: item.geolocalizacion ?? geoToString(latNum, lngNum),
    hora:    item.hora   ?? item.Hora   ?? "",
    fecha:   item.fecha  ?? item.Fecha  ?? "",
    estado:  item.estado ?? item.Estado ?? ""
  };
}

/* Formato condicional */
function claseAcceso(v){
  const s = (v ?? "").toString().trim().toLowerCase();
  if (["true","1","sí","si"].includes(s))  return "estado-true";
  if (["false","0","no"].includes(s))      return "estado-false";
  return "";
}

/* ====== LECTURA de hoja "conexion" vía CONN_API ====== */
let conexionCache = new Map();

function parseGeo(s){
  const m = /(-?\d+(?:[.,]\d+)?)[^\d-]+(-?\d+(?:[.,]\d+)?)/.exec(String(s||""));
  if (!m) return null;
  return { lat: +String(m[1]).replace(',','.'), lng: +String(m[2]).replace(',','.') };
}

async function cargarConexionCache(){
  try{
    const r = await fetch(CONN_API + "?accion=last_all");
    if (!r.ok) return;
    const arr = await r.json();
    if (!Array.isArray(arr)) return;
    const map = new Map();
    for (const x of arr){
      const u = String(x.Usuario||'').trim();
      if (!u) continue;
      const g = parseGeo(x.geolocalizacion);
      map.set(u.toLowerCase(), {
        usuario: u,
        geo_lat: g ? g.lat : NaN,
        geo_lng: g ? g.lng : NaN,
        geolocalizacion: g ? `${g.lat}, ${g.lng}` : (x.geolocalizacion || ''),
        hora: x.hora||'',
        fecha: x.fecha||'',
        estado: (x.estado||''),
        acceso: x.Acceso ?? x.acceso ?? '',
        nombre: x.nombre ?? '',
        rol:    x.rol ?? x.Rol ?? ''
      });
    }
    conexionCache = map;
  }catch{}
}

function mergeConexion(u){
  const key = String(u.usuario||'').trim().toLowerCase();
  const c = conexionCache.get(key);
  if (!c) return u;

  const lat = isFinite(c.geo_lat) ? c.geo_lat : u.geo_lat;
  const lng = isFinite(c.geo_lng) ? c.geo_lng : u.geo_lng;

  return {
    ...u,
    geo_lat: lat,
    geo_lng: lng,
    geolocalizacion: c.geolocalizacion || u.geolocalizacion || geoToString(lat, lng),
    hora: c.hora || u.hora,
    fecha: c.fecha || u.fecha,
    estado: c.estado || u.estado,
    acceso: u.acceso || c.acceso,
    nombre: u.nombre || c.nombre,
    rol: u.rol || c.rol
  };
}

/* Listar + fusionar con "conexion" */
async function obtenerUsuarios() {
  const [usuarios] = await Promise.all([
    fetch(URL_GET).then(r=>r.json()).catch(()=>[]),
    cargarConexionCache()
  ]);
  tabla.innerHTML = "";
  const norm = usuarios.map(normalizar).map(mergeConexion);

  norm.forEach(item => {
    const tr = document.createElement("tr");
    tr.className = claseAcceso(item.acceso);
    tr.innerHTML = `
      <td>${item.usuario}</td>
      <td>${item.clave}</td>
      <td>${item.acceso}</td>
      <td>${item.nombre}</td>
      <td>${item.rol}</td>
      <td>${item.geolocalizacion || ''}</td>
      <td>${item.hora || ''}</td>
      <td>${formatFecha(item.fecha) || ''}</td>
      <td>${item.estado || ''}</td>`;
    tr.addEventListener("dblclick", () => abrirModalConexion(item));
    tabla.appendChild(tr);
  });

  if (primeraCarga) { toast("Usuarios cargados"); primeraCarga = false; }
}

/* ===== Modal con mapa (Leaflet + pin SVG) ===== */
let modalMap = null, modalMarker = null, locationIcon = null;

function inyectarEstilosModal(){
  if (document.getElementById("connModalCSS")) return;
  const css = `
  #connOverlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;z-index:9998}
  #connModal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
    width:min(960px,92vw);background:#0b0f14;color:#e5e7eb;border:1px solid #162133;
    border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.45);z-index:9999}
  .connHead{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #162133}
  .connTitle{display:flex;gap:10px;align-items:center}
  .dot{width:10px;height:10px;border-radius:50%}
  .dot.online{background:#16a34a;box-shadow:0 0 0 0 rgba(22,163,74,.5);animation:pulse 1.6s infinite}
  .dot.offline{background:#dc2626}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.5)}70%{box-shadow:0 0 0 10px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
  .connBody{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}
  .connGrid{display:grid;grid-template-columns:140px 1fr;gap:8px;border:1px solid #162133;border-radius:10px;padding:10px}
  .connGrid div{display:contents}
  .connGrid label{opacity:.7}
  #connMap{height:360px;border:1px solid #162133;border-radius:10px}
  .connFoot{display:flex;justify-content:flex-end;padding:10px 12px;border-top:1px solid #162133}
  .connBtn{background:#111827;border:1px solid #1f2937;color:#e5e7eb;border-radius:8px;padding:8px 12px;cursor:pointer}
  .connBtn:hover{background:#0b1220}
  .loc-pin{line-height:0; filter: drop-shadow(0 1px 2px rgba(0,0,0,.5));}`;
  const s = document.createElement("style"); s.id = "connModalCSS"; s.textContent = css; document.head.appendChild(s);
}

function ensureModalConexion(){
  if (document.getElementById("connOverlay")) return;
  inyectarEstilosModal();
  const overlay = document.createElement("div");
  overlay.id = "connOverlay";
  overlay.innerHTML = `
    <div id="connModal" role="dialog" aria-modal="true">
      <div class="connHead">
        <div class="connTitle">
          <span id="connDot" class="dot offline"></span>
          <strong id="connTitulo">Conexión</strong>
        </div>
        <button class="connBtn" id="connClose" aria-label="Cerrar">Cerrar</button>
      </div>
      <div class="connBody">
        <div class="connGrid">
          <div><label>Usuario</label><span id="cUsuario"></span></div>
          <div><label>Clave</label><span id="cClave"></span></div>
          <div><label>Acceso</label><span id="cAcceso"></span></div>
          <div><label>Nombre</label><span id="cNombre"></span></div>
          <div><label>Rol</label><span id="cRol"></span></div>
          <div><label>Geolocalización</label><span id="cGeo"></span></div>
          <div><label>Hora</label><span id="cHora"></span></div>
          <div><label>Fecha</label><span id="cFecha"></span></div>
          <div><label>Estado</label><span id="cEstado"></span></div>
        </div>
        <div id="connMap"></div>
      </div>
      <div class="connFoot">
        <button class="connBtn" id="connCenter">Centrar mapa</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target.id === "connOverlay") cerrarModalConexion(); });
  document.getElementById("connClose").onclick = cerrarModalConexion;
  document.getElementById("connCenter").onclick = () => { if (modalMap && modalMarker) modalMap.setView(modalMarker.getLatLng(), 14); };
}

function cargarLeaflet(){
  if (window.L) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link'); link.rel='stylesheet';
    link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
    const s = document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = resolve; document.head.appendChild(s);
  });
}

async function abrirModalConexion(item){
  ensureModalConexion();
  document.getElementById("connOverlay").style.display = "block";

  const accesoTxt = (item.acceso ?? '').toString();
  const esOnline = ["true","1","sí","si"].includes(accesoTxt.trim().toLowerCase()) || (item.estado||"").toLowerCase()==="online";

  document.getElementById("connDot").className = "dot " + (esOnline ? "online" : "offline");
  document.getElementById("connTitulo").textContent = `Conexión de ${item.usuario || '(sin usuario)'}`;
  document.getElementById("cUsuario").textContent = item.usuario || '';
  document.getElementById("cClave").textContent   = item.clave || '';
  document.getElementById("cAcceso").textContent  = accesoTxt || '';
  document.getElementById("cNombre").textContent  = item.nombre || '';
  document.getElementById("cRol").textContent     = item.rol || '';
  const geoStr = item.geolocalizacion || geoToString(item.geo_lat, item.geo_lng);
  document.getElementById("cGeo").textContent     = geoStr || '(sin coordenadas)';
  document.getElementById("cHora").textContent    = item.hora || '';
  document.getElementById("cFecha").textContent   = formatFecha(item.fecha) || '';
  document.getElementById("cEstado").textContent  = (item.estado || (esOnline ? 'online' : 'offline'));

  await cargarLeaflet();
  setTimeout(() => {
    if (!modalMap) {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });
      modalMap = L.map('connMap', { zoomControl:true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap'
      }).addTo(modalMap);
    }
    setTimeout(()=> modalMap.invalidateSize(), 60);

    const pos = (() => {
      if (isFinite(item.geo_lat) && isFinite(item.geo_lng)) return [item.geo_lat, item.geo_lng];
      const p = parseGeo(geoStr);
      return p ? [p.lat, p.lng] : null;
    })();

    if (!locationIcon) {
      const svg = `
      <svg width="34" height="34" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2C8.686 2 6 4.686 6 8c0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6z"
              fill="#e11d48" stroke="#ffffff" stroke-width="1.2"/>
        <circle cx="12" cy="8.5" r="2.5" fill="#ffffff"/>
      </svg>`;
      locationIcon = L.divIcon({
        className: 'loc-pin',
        html: svg,
        iconSize: [34,34],
        iconAnchor: [17,32],
        popupAnchor: [0,-28]
      });
    }

    if (pos) {
      if (!modalMarker) modalMarker = L.marker(pos, { icon: locationIcon }).addTo(modalMap);
      else { modalMarker.setLatLng(pos); modalMarker.setIcon(locationIcon); }
      modalMarker.bindPopup(`<strong>${item.usuario||''}</strong><br>${geoStr || ''}`).openPopup();
      modalMap.setView(pos, 14);
    } else {
      modalMap.setView([-33.45, -70.66], 11);
      if (modalMarker) { modalMap.removeLayer(modalMarker); modalMarker = null; }
    }
  }, 0);
}

function cerrarModalConexion(){
  const overlay = document.getElementById("connOverlay");
  if (overlay) overlay.style.display = "none";
}

/* Tiempo real */
function iniciarTiempoReal(){ if (poller) clearInterval(poller); poller = setInterval(obtenerUsuarios, 10000); }
obtenerUsuarios(); iniciarTiempoReal();

// === BUSCADOR (usuarios.js) ===
(function(){
  const input = document.getElementById('buscador') || document.getElementById('buscar');
  const cuerpo = (typeof tabla !== 'undefined' && tabla) ? tabla : document.querySelector('#tabla tbody');
  if (!cuerpo) return;

  const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let q = '';

  function aplicarFiltro(){
    const filas = cuerpo.querySelectorAll('tr');
    filas.forEach(tr => {
      if (tr.querySelector('th')) { tr.style.display = ''; return; }
      tr.style.display = norm(tr.textContent).includes(q) ? '' : 'none';
    });
  }

  if (input){
    input.addEventListener('input', () => { q = norm(input.value); aplicarFiltro(); });
  }

  // Reaplica al actualizar la tabla (obtenerUsuarios cada 10s)
  const mo = new MutationObserver(aplicarFiltro);
  mo.observe(cuerpo, { childList: true });

  // Compatibilidad con onkeyup="filtrarTabla()"
  window.filtrarTabla = function(){
    if (input){
      q = norm(input.value);
      aplicarFiltro();
    }
  };
})();
