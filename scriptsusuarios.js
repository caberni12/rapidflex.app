// === Endpoints ===
const URL_GET = 'https://script.google.com/macros/s/AKfycbzxif2AooKWtK8wRrqZ8OlQJlO6VekeIeEyZ-HFFIC9Nd4WVarzaUF6qu5dszG0AWdZ/exec';
const URL_POST = 'https://script.google.com/macros/s/AKfycbx23bjpEnJFtFmNfSvYzdOfcwwi2jZR17QFfIdY8HnC19_QD7BQo7TlYt8LP-HZM0s3/exec';

// === DOM ===
const form  = document.getElementById("formulario");
const tabla = document.querySelector("#tabla tbody");

// === Estado ===
let datosOriginales = {};
let primeraCarga = true;
let poller = null;

// === UI: alerta flotante autodescartable ===
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

// === Normaliza fila ===
function normalizar(item) {
  return {
    usuario: item.usuario ?? item.Usuario ?? "",
    clave:   item.clave   ?? item.Clave   ?? "",
    acceso:  item.acceso  ?? item.Acceso  ?? "",
    nombre:  item.nombre  ?? item.Nombre  ?? "",
    rol:     item.rol     ?? item.Rol     ?? "",
    fila:    item.fila,
    geo_lat: parseFloat(item.geo_lat ?? item.lat ?? item.Lat ?? ""),
    geo_lng: parseFloat(item.geo_lng ?? item.lng ?? item.Lng ?? "")
  };
}

// === Acceso -> clase para formato condicional ===
function claseAcceso(v){
  const s = (v ?? "").toString().trim().toLowerCase();
  if (["true","1","sí","si"].includes(s))  return "estado-true";
  if (["false","0","no"].includes(s))      return "estado-false";
  return "";
}

// === Submit ===
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

// === Cancelar ===
function cancelarEdicion() { form.reset(); }

// ====== Leaflet / Mapa ======
let LLoaded = false, mapa, capaOSM, markers = new Map();

function cargarLeaflet() {
  if (LLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => { LLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}

function crearUIgps() {
  if (document.getElementById('gpsOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'gpsOverlay';
  overlay.innerHTML = `
    <div id="gpsPanel">
      <div class="gpsBar">
        <strong>Mapa de conexiones</strong>
        <span>
          <button id="gpsFit">Centrar</button>
          <button id="gpsClose" aria-label="Cerrar">×</button>
        </span>
      </div>
      <div id="gpsMap"></div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#gpsClose').onclick = () => overlay.style.display = 'none';
  overlay.addEventListener('click', e => { if (e.target.id === 'gpsOverlay') overlay.style.display = 'none'; });
  overlay.querySelector('#gpsFit').onclick = ajustarABounds;
}

async function iniciarMapa() {
  await cargarLeaflet();
  if (mapa) return mapa;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  });
  mapa = L.map('gpsMap', { zoomControl: true }).setView([-33.45, -70.66], 11);
  capaOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(mapa);
  return mapa;
}

function popupDe(it){
  return `
    <div style="min-width:160px">
      <div><strong>${it.usuario || '(sin usuario)'}</strong></div>
      <div>${it.nombre || ''}</div>
      <div>Rol: ${it.rol || '-'}</div>
      <div>Acceso: ${it.acceso || '-'}</div>
      <div>Lat: ${isFinite(it.geo_lat)?it.geo_lat:'-'} Lng: ${isFinite(it.geo_lng)?it.geo_lng:'-'}</div>
    </div>`;
}

function ajustarABounds(){
  if (!mapa) return;
  const pts = [];
  markers.forEach(m => { if (m.getLatLng) pts.push(m.getLatLng()); });
  if (pts.length) {
    const b = L.latLngBounds(pts);
    mapa.fitBounds(b.pad(0.2));
  }
}

function keyFor(it){ return (it.fila ?? it.usuario ?? '').toString(); }

function actualizarMapa(items) {
  items.forEach(it => {
    const lat = Number(it.geo_lat), lng = Number(it.geo_lng);
    if (!isFinite(lat) || !isFinite(lng)) return;
    const key = keyFor(it);
    if (markers.has(key)) {
      const m = markers.get(key);
      if (m.getLatLng) m.setLatLng([lat, lng]).setPopupContent(popupDe(it));
      else m.__pending__ = [lat, lng], m.__data__ = it;
    } else {
      markers.set(key, { __pending__: [lat, lng], __data__: it }); // se crea al abrir
      if (mapa) {
        const m = L.marker([lat, lng]).addTo(mapa).bindPopup(popupDe(it));
        markers.set(key, m);
      }
    }
  });

  // crear pendientes si el mapa ya está abierto
  if (mapa) {
    for (const [k, v] of markers) {
      if (v.__pending__) {
        const m = L.marker(v.__pending__).addTo(mapa).bindPopup(popupDe(v.__data__));
        markers.set(k, m);
      }
    }
  }
}

async function verEnMapa(item){
  const lat = Number(item.geo_lat), lng = Number(item.geo_lng);
  if (!isFinite(lat) || !isFinite(lng)) { toast("Sin coordenadas", "error"); return; }
  crearUIgps();
  const overlay = document.getElementById('gpsOverlay');
  overlay.style.display = 'block';
  await iniciarMapa();
  setTimeout(() => mapa.invalidateSize(), 50);

  const key = keyFor(item);
  let mark = markers.get(key);
  if (!mark || !mark.getLatLng) {
    mark = L.marker([lat, lng]).addTo(mapa).bindPopup(popupDe(item));
    markers.set(key, mark);
  } else {
    mark.setLatLng([lat, lng]).setPopupContent(popupDe(item));
  }
  mapa.setView([lat, lng], 14);
  mark.openPopup();
}

// ====== Listar + eventos ======
function obtenerUsuarios() {
  fetch(URL_GET)
    .then(r => r.json())
    .then(data => {
      tabla.innerHTML = "";
      const norm = data.map(normalizar);

      norm.forEach(item => {
        const tr = document.createElement("tr");
        tr.className = claseAcceso(item.acceso);
        if (isFinite(item.geo_lat) && isFinite(item.geo_lng)) tr.classList.add('tiene-geo');
        tr.innerHTML = `
          <td>${item.usuario}</td>
          <td>${item.clave}</td>
          <td>${item.acceso}</td>
          <td>${item.nombre}</td>
          <td>${item.rol}</td>
          <td>
            <button onclick='editar(${JSON.stringify(item)}, ${item.fila})'>✏️</button>
            <button onclick='eliminar(${item.fila})'>🗑️</button>
          </td>`;
        tr.addEventListener('dblclick', () => verEnMapa(item)); // doble clic abre modal
        tabla.appendChild(tr);
      });

      if (primeraCarga) { toast("Usuarios cargados"); primeraCarga = false; }
      actualizarMapa(norm);
    })
    .catch(() => toast("Error al cargar usuarios", "error"));
}

// === Editar ===
function editar(item, fila) {
  form.fila.value = fila ?? item.fila ?? "";
  form.usuario.value = item.usuario ?? "";
  form.clave.value = item.clave ?? "";
  form.acceso.value = item.acceso ?? "";
  form.nombre.value = item.nombre ?? "";
  form.rol.value = item.rol ?? "";
  datosOriginales = { ...item };
}

// === Eliminar ===
function eliminar(fila) {
  if (!confirm("¿Eliminar este usuario?")) return;
  fetch(URL_POST, {
    method: "POST",
    body: JSON.stringify({ accion: "eliminar", id: fila })
  })
    .then(r => r.json())
    .then(res => {
      if (res.resultado === "ok") toast("Eliminado correctamente");
      else toast("Error al eliminar", "error");
      obtenerUsuarios();
    })
    .catch(() => toast("Error de red al eliminar", "error"));
}

// === Tiempo real ===
function iniciarTiempoReal(){
  if (poller) clearInterval(poller);
  poller = setInterval(obtenerUsuarios, 10000); // 10s
}

// === Inicio ===
obtenerUsuarios();
iniciarTiempoReal();

/* === LOG de conexion: URL del Web App nuevo === */
const LOG_URL = "https://script.google.com/macros/s/AKfycbzPqO60R3SswkiAOhH9sEnGePFg4pUVHOA_OesEfYyY8NusgaRirmHaOa5ZFEWMxS--/exec";

/* Geo rápida con fallback por IP */
async function getGeo(){
  const viaIP = async ()=>{ try{
    const r = await fetch('https://ipapi.co/json/'); if(!r.ok) return null;
    const j = await r.json(); return {lat:j.latitude, lng:j.longitude};
  }catch{return null;} };
  if ('geolocation' in navigator){
    try{
      const p = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:5000,maximumAge:15000}));
      return {lat:p.coords.latitude, lng:p.coords.longitude};
    }catch{}
  }
  return await viaIP();
}
function fechaHoraCL(){
  const tz='America/Santiago', now=new Date();
  return {
    fecha: new Intl.DateTimeFormat('es-CL',{timeZone:tz}).format(now),
    hora:  new Intl.DateTimeFormat('es-CL',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now)
  };
}
function logConexion(payload){
  try{
    const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
    if (!(navigator.sendBeacon && navigator.sendBeacon(LOG_URL, blob))){
      fetch(LOG_URL,{method:'POST',body:JSON.stringify(payload)});
    }
  }catch{}
}

/* === tras validar OK en tu flujo actual, envía el registro === */
async function _enviarConexionLogin(usuario, clave, data){
  const geo = await getGeo();
  const {fecha, hora} = fechaHoraCL();
  logConexion({
    accion: 'login_event',
    Usuario: usuario,
    Clave: clave,
    Acceso: String(data?.acceso ?? 'true'),
    nombre: String(data?.nombre ?? usuario),
    rol: String(data?.rol ?? ''),
    geolocalizacion: geo ? `${geo.lat},${geo.lng}` : '',
    hora, fecha,
    estado: 'online'
  });
}

/* === opcional: marcar OFFLINE al salir === */
async function _enviarConexionLogout(usuario, data){
  const geo = await getGeo();
  const {fecha, hora} = fechaHoraCL();
  logConexion({
    accion: 'login_event',
    Usuario: usuario || '',
    Clave: '',
    Acceso: String(data?.acceso ?? ''),
    nombre: String(data?.nombre ?? usuario || ''),
    rol: String(data?.rol ?? ''),
    geolocalizacion: geo ? `${geo.lat},${geo.lng}` : '',
    hora, fecha,
    estado: 'offline'
  });
}

// Botón cerrar sesión si existe
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  const u = localStorage.getItem("nombreUsuario") || localStorage.getItem("usuario") || "";
  await _enviarConexionLogout(u, {});
  localStorage.removeItem("sessionToken");
  localStorage.removeItem("usuario");
  localStorage.removeItem("nombreUsuario");
  location.href = "index.html";
});

// Al cerrar pestaña
window.addEventListener("beforeunload", () => {
  const u = localStorage.getItem("nombreUsuario") || localStorage.getItem("usuario") || "";
  const {fecha, hora} = fechaHoraCL();
  const payload = { accion:'login_event', Usuario:u, Clave:'', Acceso:'', nombre:u, rol:'', geolocalizacion:'', hora, fecha, estado:'offline' };
  const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
  navigator.sendBeacon(LOG_URL, blob);
});
