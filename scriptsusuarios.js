/* ===== usuarios.js (CRUD + merge desde hoja conexion; rol solo de Usuarios) ===== */

const URL_GET  = 'https://script.google.com/macros/s/AKfycbzxif2AooKWtK8wRrqZ8OlQJlO6VekeIeEyZ-HFFIC9Nd4WVarzaUF6qu5dszG0AWdZ/exec';
const URL_POST = 'https://script.google.com/macros/s/AKfycbx23bjpEnJFtFmNfSvYzdOfcwwi2jZR17QFfIdY8HnC19_QD7BQo7TlYt8LP-HZM0s3/exec';
const CONN_API = 'https://script.google.com/macros/s/AKfycbyuiH9JRDKt7lxklFiTg9L46_tZOA4TDgugsQGtSo-IGtQWZXnI0M-DedszX-KFmPWF/exec';

const form  = document.getElementById("formulario");
const tabla = document.querySelector("#tabla tbody");

let datosOriginales = {};
let primeraCarga = true;
let poller = null;

/* Toast */
function toast(msg, type = "ok", ms = 2000) {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {position:"fixed",top:"12px",left:"50%",transform:"translateX(-50%)",
    padding:"10px 14px",background:type==="ok"?"#0ea5e9":"#ef4444",color:"#fff",borderRadius:"8px",zIndex:"9999"});
  document.body.appendChild(el);
  setTimeout(()=>{el.style.transition="opacity .25s";el.style.opacity="0";setTimeout(()=>el.remove(),250)},ms);
}

/* Normaliza fila base (Usuarios) */
function normalizarUsuarios(item) {
  const num = v => v!==""&&v!=null ? parseFloat(String(v).replace(',', '.')) : NaN;
  return {
    usuario: item.usuario ?? item.Usuario ?? "",
    clave:   item.clave   ?? item.Clave   ?? "",
    acceso:  item.acceso  ?? item.Acceso  ?? "",
    nombre:  item.nombre  ?? item.Nombre  ?? "",
    rol:     item.rol     ?? item.Rol     ?? "",
    fila:    item.fila ?? "",
    geo_lat: num(item.geo_lat ?? item.lat ?? item.Lat ?? ""),
    geo_lng: num(item.geo_lng ?? item.lng ?? item.Lng ?? ""),
    hora:    item.hora   ?? "",
    fecha:   item.fecha  ?? "",
    estado:  item.estado ?? ""
  };
}

/* Formato condicional */
function claseAcceso(v){
  const s = String(v??"").trim().toLowerCase();
  if (["true","1","sí","si","online"].includes(s)) return "estado-true";
  if (["false","0","no","offline"].includes(s))     return "estado-false";
  return "";
}

/* ===== Merge desde hoja conexion ===== */
const kn = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
let connByUser = new Map();

function parseGeoPair(s){
  const m = /(-?\d+(?:[.,]\d+)?)[,\s;]+(-?\d+(?:[.,]\d+)?)/.exec(String(s||""));
  if (!m) return null;
  const lat = parseFloat(String(m[1]).replace(',', '.'));
  const lng = parseFloat(String(m[2]).replace(',', '.'));
  return (isFinite(lat)&&isFinite(lng)) ? {lat,lng} : null;
}

async function cargarConexionCache(){
  try{
    const r = await fetch(CONN_API + "?accion=last_all");
    if (!r.ok) return;
    const arr = await r.json();
    const map = new Map();
    for (const x of (Array.isArray(arr)?arr:[])){
      const u = String(x.Usuario||'').trim();
      if (!u) continue;
      const g = parseGeoPair(x.geolocalizacion);
      map.set(kn(u), {
        Usuario: u,
        Clave:   x.Clave   || "",
        Acceso:  x.Acceso  || "",
        nombre:  x.nombre  || "",
        geo_lat: g?g.lat:NaN,
        geo_lng: g?g.lng:NaN,
        hora:    x.hora    || "",
        fecha:   x.fecha   || "",
        estado:  x.estado  || ""
        // rol NO se toma de conexion
      });
    }
    connByUser = map;
  }catch{}
}

/* Reglas de fusión:
   - De conexion: Usuario, Clave, Acceso, nombre, geolocalizacion, hora, fecha, estado
   - De Usuarios: rol (se respeta SIEMPRE)
*/
function mergeDesdeConexion(uRow){
  const c = connByUser.get(kn(uRow.usuario));
  if (!c) return uRow;
  return {
    ...uRow,
    usuario: c.Usuario || uRow.usuario,
    clave:   c.Clave   || uRow.clave,
    acceso:  c.Acceso  || uRow.acceso,
    nombre:  c.nombre  || uRow.nombre,
    geo_lat: isFinite(c.geo_lat) ? c.geo_lat : uRow.geo_lat,
    geo_lng: isFinite(c.geo_lng) ? c.geo_lng : uRow.geo_lng,
    hora:    c.hora    || uRow.hora,
    fecha:   c.fecha   || uRow.fecha,
    estado:  c.estado  || uRow.estado
    // rol queda tal cual de uRow
  };
}

/* Submit CRUD */
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
  fetch(URL_POST, { method:"POST", body: JSON.stringify(datos) })
    .then(r=>r.json())
    .then(res=>{ res.resultado==="ok"?toast("Guardado exitosamente"):toast("Error al guardar","error"); form.reset(); obtenerUsuarios(); })
    .catch(()=>toast("Error de red al guardar","error"));
});
function cancelarEdicion(){ form.reset(); }

/* Listar + merge */
async function obtenerUsuarios(){
  const [usuarios] = await Promise.all([
    fetch(URL_GET).then(r=>r.json()).catch(()=>[]),
    cargarConexionCache()
  ]);

  const norm = (usuarios||[]).map(normalizarUsuarios).map(mergeDesdeConexion);

  tabla.innerHTML = "";
  norm.forEach(item=>{
    const tr = document.createElement("tr");
    tr.className = claseAcceso(item.acceso || item.estado);
    tr.innerHTML = `
      <td>${item.usuario}</td>
      <td>${item.clave}</td>
      <td>${item.acceso}</td>
      <td>${item.nombre}</td>
      <td>${item.rol}</td>
      <td>${isFinite(item.geo_lat)&&isFinite(item.geo_lng)?`${item.geo_lat}, ${item.geo_lng}`:''}</td>
      <td>${item.hora||''}</td>
      <td>${item.fecha||''}</td>
      <td>${item.estado||''}</td>
      <td>
        <button type="button" class="btn-ed">✏️</button>
        <button type="button" class="btn-el">🗑️</button>
      </td>`;
    tr.querySelector(".btn-ed").addEventListener("click", () => editar(item, item.fila));
    tr.querySelector(".btn-el").addEventListener("click", () => eliminar(item.fila));
    tr.addEventListener("dblclick", ()=>abrirModalConexion(item));
    tabla.appendChild(tr);
  });

  if (primeraCarga){ toast("Usuarios cargados"); primeraCarga=false; }
}

/* Editar / Eliminar */
function editar(item, fila){
  form.fila.value = fila ?? item.fila ?? "";
  form.usuario.value = item.usuario ?? "";
  form.clave.value = item.clave ?? "";
  form.acceso.value = item.acceso ?? "";
  form.nombre.value = item.nombre ?? "";
  form.rol.value = item.rol ?? ""; // rol se edita aquí
  datosOriginales = {...item};
}
function eliminar(fila){
  if (!confirm("¿Eliminar este usuario?")) return;
  fetch(URL_POST,{method:"POST",body:JSON.stringify({accion:"eliminar",id:fila})})
    .then(r=>r.json())
    .then(res=>{ res.resultado==="ok"?toast("Eliminado correctamente"):toast("Error al eliminar","error"); obtenerUsuarios(); })
    .catch(()=>toast("Error de red al eliminar","error"));
}

/* Modal + mapa */
let modalMap=null, modalMarker=null;
function ensureModal(){
  if (document.getElementById("connOverlay")) return;
  const css = `
  #connOverlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;z-index:9998}
  #connModal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
    width:min(960px,92vw);background:#0b0f14;color:#e5e7eb;border:1px solid #162133;border-radius:14px;z-index:9999}
  .connHead{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #162133}
  .connBody{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}
  .connGrid{display:grid;grid-template-columns:130px 1fr;gap:8px;border:1px solid #162133;border-radius:10px;padding:10px}
  .connGrid div{display:contents}
  .connGrid label{opacity:.7}
  #connMap{height:360px;border:1px solid #162133;border-radius:10px}`;
  const s = document.createElement("style"); s.textContent = css; s.id="connModalCSS"; document.head.appendChild(s);

  const overlay = document.createElement("div");
  overlay.id="connOverlay";
  overlay.innerHTML = `
    <div id="connModal" role="dialog" aria-modal="true">
      <div class="connHead">
        <strong id="connTitulo">Conexión</strong>
        <button id="connClose">Cerrar</button>
      </div>
      <div class="connBody">
        <div class="connGrid">
          <div><label>Usuario</label><span id="cUsuario"></span></div>
          <div><label>Clave</label><span id="cClave"></span></div>
          <div><label>Acceso</label><span id="cAcceso"></span></div>
          <div><label>Nombre</label><span id="cNombre"></span></div>
          <div><label>Rol</label><span id="cRol"></span></div>
          <div><label>geolocalizacion</label><span id="cGeo"></span></div>
          <div><label>Hora</label><span id="cHora"></span></div>
          <div><label>Fecha</label><span id="cFecha"></span></div>
          <div><label>Estado</label><span id="cEstado"></span></div>
        </div>
        <div id="connMap"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e=>{ if (e.target.id==="connOverlay") overlay.style.display="none"; });
  document.getElementById("connClose").onclick = ()=> overlay.style.display="none";
}

function cargarLeaflet(){
  if (window.L) return Promise.resolve();
  return new Promise((resolve)=>{
    const link=document.createElement('link'); link.rel='stylesheet';
    link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
    const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload=resolve; document.head.appendChild(s);
  });
}

async function abrirModalConexion(item){
  ensureModal();
  const overlay = document.getElementById("connOverlay");
  overlay.style.display = "block";

  // Fallback: si faltan coords, consulta la última conexión puntual
  if (!isFinite(item.geo_lat) || !isFinite(item.geo_lng)) {
    try{
      const r = await fetch(CONN_API + "?accion=last&usuario=" + encodeURIComponent(item.usuario||""));
      if (r.ok){
        const j = await r.json();
        const g = parseGeoPair(j.geolocalizacion);
        if (g){ item.geo_lat=g.lat; item.geo_lng=g.lng; }
        item.hora = j.hora || item.hora;
        item.fecha= j.fecha|| item.fecha;
        item.estado=j.estado||item.estado;
        item.clave = j.Clave || item.clave;
        item.acceso= j.Acceso|| item.acceso;
        item.nombre= j.nombre|| item.nombre;
      }
    }catch{}
  }

  document.getElementById("connTitulo").textContent = `Conexión de ${item.usuario||''}`;
  document.getElementById("cUsuario").textContent = item.usuario||'';
  document.getElementById("cClave").textContent   = item.clave||'';
  document.getElementById("cAcceso").textContent  = item.acceso||'';
  document.getElementById("cNombre").textContent  = item.nombre||'';
  document.getElementById("cRol").textContent     = item.rol||''; // rol desde Usuarios
  const geoStr = (isFinite(item.geo_lat)&&isFinite(item.geo_lng))?`${item.geo_lat}, ${item.geo_lng}`:'(sin coordenadas)';
  document.getElementById("cGeo").textContent     = geoStr;
  document.getElementById("cHora").textContent    = item.hora||'';
  document.getElementById("cFecha").textContent   = item.fecha||'';
  document.getElementById("cEstado").textContent  = item.estado||'';

  await cargarLeaflet();
  setTimeout(()=>{
    if (!modalMap){
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });
      modalMap = L.map('connMap',{zoomControl:true});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(modalMap);
    }
    setTimeout(()=>modalMap.invalidateSize(),60);

    if (isFinite(item.geo_lat)&&isFinite(item.geo_lng)){
      const pos=[item.geo_lat,item.geo_lng];
      if (!modalMarker) modalMarker=L.marker(pos).addTo(modalMap);
      else modalMarker.setLatLng(pos);
      modalMarker.bindPopup(`<strong>${item.usuario||''}</strong><br>${geoStr}`).openPopup();
      modalMap.setView(pos,14);
    } else {
      modalMap.setView([-33.45,-70.66],11);
      if (modalMarker){ modalMap.removeLayer(modalMarker); modalMarker=null; }
    }
  },0);
}

/* Tiempo real */
function iniciarTiempoReal(){ if (poller) clearInterval(poller); poller = setInterval(obtenerUsuarios, 10000); }
obtenerUsuarios(); iniciarTiempoReal();
