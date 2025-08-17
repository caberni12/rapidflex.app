/* ===== usuarios.js (listado con modal + mapa y lectura de hoja conexion) ===== */

// Endpoints base
const URL_GET  = 'https://script.google.com/macros/s/AKfycbzxif2AooKWtK8wRrqZ8OlQJlO6VekeIeEyZ-HFFIC9Nd4WVarzaUF6qu5dszG0AWdZ/exec';
const URL_POST = 'https://script.google.com/macros/s/AKfycbx23bjpEnJFtFmNfSvYzdOfcwwi2jZR17QFfIdY8HnC19_QD7BQo7TlYt8LP-HZM0s3/exec';
// Web App de la hoja "conexion"
const CONN_API = 'https://script.google.com/macros/s/AKfycbyuiH9JRDKt7lxklFiTg9L46_tZOA4TDgugsQGtSo-IGtQWZXnI0M-DedszX-KFmPWF/exec';

// DOM
const form  = document.getElementById("formulario");
const tabla = document.querySelector("#tabla tbody");

// Estado
let datosOriginales = {};
let primeraCarga = true;
let poller = null;

// Toast
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

// Normaliza fila base (usuarios)
function normalizar(item) {
  const lat = item.geo_lat ?? item.lat ?? item.Lat ?? "";
  const lng = item.geo_lng ?? item.lng ?? item.Lng ?? "";
  const toNum = v => v !== "" ? parseFloat(String(v).replace(',', '.')) : NaN;
  return {
    usuario: item.usuario ?? item.Usuario ?? "",
    clave:   item.clave   ?? item.Clave   ?? "",
    acceso:  item.acceso  ?? item.Acceso  ?? "",
    nombre:  item.nombre  ?? item.Nombre  ?? "",
    rol:     item.rol     ?? item.Rol     ?? "",
    fila:    item.fila,
    geo_lat: toNum(lat),
    geo_lng: toNum(lng),
    hora:    item.hora   ?? item.Hora   ?? "",
    fecha:   item.fecha  ?? item.Fecha  ?? "",
    estado:  item.estado ?? item.Estado ?? ""
  };
}

// Formato condicional
function claseAcceso(v){
  const s = (v ?? "").toString().trim().toLowerCase();
  if (["true","1","sí","si"].includes(s))  return "estado-true";
  if (["false","0","no"].includes(s))      return "estado-false";
  return "";
}

// ====== LECTURA de hoja "conexion" ======
let conexionCache = new Map();
function parseGeo(s){
  const m = /(-?\d+(?:[.,]\d+)?)[,\s;]+(-?\d+(?:[.,]\d+)?)/.exec(String(s||""));
  if (!m) return null;
  const lat = parseFloat(String(m[1]).replace(',', '.'));
  const lng = parseFloat(String(m[2]).replace(',', '.'));
  return (isFinite(lat) && isFinite(lng)) ? {lat, lng} : null;
}
async function cargarConexionCache(){
  try{
    const r = await fetch(CONN_API + "?accion=last_all");
    if (!r.ok) return;
    const arr = await r.json(); // [{Usuario, geolocalizacion, hora, fecha, estado, ...}]
    const map = new Map();
    for (const x of arr){
      const u = String(x.Usuario||'').trim();
      if (!u) continue;
      const g = parseGeo(x.geolocalizacion);
      map.set(u.toLowerCase(), {
        usuario:u,
        geo_lat: g ? g.lat : NaN,
        geo_lng: g ? g.lng : NaN,
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
  return {
    ...u,
    geo_lat: isFinite(c.geo_lat) ? c.geo_lat : u.geo_lat,
    geo_lng: isFinite(c.geo_lng) ? c.geo_lng : u.geo_lng,
    hora: c.hora || u.hora,
    fecha: c.fecha || u.fecha,
    estado: c.estado || u.estado,
    acceso: u.acceso || c.acceso
  };
}

// Submit
form.addEventListener("submit", e => {
  e.preventDefault();
  const datos = {
    accion: form.fila.value ? "modificar" : "guardar",
    fila: form.fila.value,
    usuario: form.usuario.value,
    clave: form.clave.value,
    acceso: form.acceso.value,
    nombre: form.nombre.value,
    rol: form.rol.value
  };
  if (datos.accion === "modificar") {
    const iguales =
      datos.usuario === datosOriginales.usuario &&
      datos.clave   === datosOriginales.clave &&
      datos.acceso  === datosOriginales.acceso &&
      datos.nombre  === datosOriginales.nombre &&
      datos.rol     === datosOriginales.rol;
    if (iguales) { toast("No se han realizado cambios"); return; }
  }
  fetch(URL_POST, { method: "POST", body: JSON.stringify(datos) })
    .then(r => r.json())
    .then(res => {
      if (res.resultado === "ok") toast("Guardado exitosamente");
      else toast("Error al guardar", "error");
      form.reset();
      obtenerUsuarios();
    })
    .catch(() => toast("Error de red al guardar", "error"));
});
function cancelarEdicion() { form.reset(); }

// Listar + fusionar con "conexion"
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
      <td>
        <button type="button" class="btn-ed">✏️</button>
        <button type="button" class="btn-el">🗑️</button>
      </td>`;
    tr.querySelector(".btn-ed").addEventListener("click", () => editar(item, item.fila));
    tr.querySelector(".btn-el").addEventListener("click", () => eliminar(item.fila));
    tr.addEventListener("dblclick", () => abrirModalConexion(item)); // modal en doble clic
    tabla.appendChild(tr);
  });

  if (primeraCarga) { toast("Usuarios cargados"); primeraCarga = false; }
}

// Editar / Eliminar
function editar(item, fila) {
  form.fila.value = fila ?? item.fila ?? "";
  form.usuario.value = item.usuario ?? "";
  form.clave.value = item.clave ?? "";
  form.acceso.value = item.acceso ?? "";
  form.nombre.value = item.nombre ?? "";
  form.rol.value = item.rol ?? "";
  datosOriginales = { ...item };
}
function eliminar(fila) {
  if (!confirm("¿Eliminar este usuario?")) return;
  fetch(URL_POST, { method: "POST", body: JSON.stringify({ accion: "eliminar", id: fila }) })
    .then(r => r.json())
    .then(res => { res.resultado === "ok" ? toast("Eliminado correctamente") : toast("Error al eliminar", "error"); obtenerUsuarios(); })
    .catch(() => toast("Error de red al eliminar", "error"));
}

// ===== Modal con mapa =====
let modalMap = null, modalMarker = null;
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
  .connBtn:hover{background:#0b1220}`;
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
  const overlay = document.getElementById("connOverlay");
  overlay.style.display = "block";

  // Fallback: trae última conexión si faltan coords
  if (!isFinite(item.geo_lat) || !isFinite(item.geo_lng)) {
    try {
      const r = await fetch(CONN_API + "?accion=last&usuario=" + encodeURIComponent(item.usuario||""));
      if (r.ok) {
        const j = await r.json();
        const g = parseGeo(j.geolocalizacion);
        if (g) { item.geo_lat = g.lat; item.geo_lng = g.lng; }
        item.hora   = j.hora   || item.hora;
        item.fecha  = j.fecha  || item.fecha;
        item.estado = j.estado || item.estado;
      }
    } catch {}
  }

  const accesoTxt = (item.acceso ?? '').toString();
  const esOnline = ["true","1","sí","si"].includes(accesoTxt.trim().toLowerCase()) || (item.estado||"").toLowerCase()==="online";

  document.getElementById("connDot").className = "dot " + (esOnline ? "online" : "offline");
  document.getElementById("connTitulo").textContent = `Conexión de ${item.usuario || '(sin usuario)'}`;
  document.getElementById("cUsuario").textContent = item.usuario || '';
  document.getElementById("cClave").textContent   = item.clave || '';
  document.getElementById("cAcceso").textContent  = accesoTxt || '';
  document.getElementById("cNombre").textContent  = item.nombre || '';
  document.getElementById("cRol").textContent     = item.rol || '';
  const geoStr = (isFinite(item.geo_lat) && isFinite(item.geo_lng)) ? `${item.geo_lat}, ${item.geo_lng}` : '';
  document.getElementById("cGeo").textContent     = geoStr || '(sin coordenadas)';
  document.getElementById("cHora").textContent    = item.hora || '';
  document.getElementById("cFecha").textContent   = item.fecha || '';
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

    if (isFinite(item.geo_lat) && isFinite(item.geo_lng)) {
      const pos = [item.geo_lat, item.geo_lng];
      if (!modalMarker) modalMarker = L.marker(pos).addTo(modalMap);
      else modalMarker.setLatLng(pos);
      modalMarker.bindPopup(`<strong>${item.usuario||''}</strong><br>${geoStr || ''}`).openPopup();
      modalMap.setView(pos, 14);
    } else {
      modalMap.setView([-33.45, -70.66], 11);
      if (modalMarker) { modalMap.removeLayer(modalMarker); modalMarker = null; }
    }
  }, 0);
}
function cerrarModalConexion(){ const overlay = document.getElementById("connOverlay"); if (overlay) overlay.style.display = "none"; }

// Tiempo real
function iniciarTiempoReal(){ if (poller) clearInterval(poller); poller = setInterval(obtenerUsuarios, 10000); }
obtenerUsuarios(); iniciarTiempoReal();
