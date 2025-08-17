/* ===== usuarios.js (lee CONN_API; rol/fila desde URL_GET; 5 columnas; modal con mapa) ===== */

/* Endpoints */
const URL_GET  = 'https://script.google.com/macros/s/AKfycbzxif2AooKWtK8wRrqZ8OlQJlO6VekeIeEyZ-HFFIC9Nd4WVarzaUF6qu5dszG0AWdZ/exec';
const URL_POST = 'https://script.google.com/macros/s/AKfycbx23bjpEnJFtFmNfSvYzdOfcwwi2jZR17QFfIdY8HnC19_QD7BQo7TlYt8LP-HZM0s3/exec';
const CONN_API = 'https://script.google.com/macros/s/AKfycby8sj-J1_fJfgZ8huNVMAoWIiAgPFZ6Guy1T1crtAEdBWEuHabm7AFy6AiMoiqcMQeA/exec';

/* DOM */
const form  = document.getElementById("formulario");
let   tabla = document.querySelector("#tabla tbody");

/* Estado */
let datosOriginales = {};
let primeraCarga = true;
let poller = null;

/* ===== Alertas ===== */
function toast(msg, type = "ok", ms = 2000) {
  const el = document.createElement("div");
  el.setAttribute("role","status");
  el.textContent = msg;
  Object.assign(el.style, {position:"fixed",top:"12px",left:"50%",transform:"translateX(-50%)",
    padding:"10px 14px",background:type==="ok"?"#0ea5e9":"#ef4444",color:"#fff",borderRadius:"8px",zIndex:"9999",
    boxShadow:"0 2px 6px rgba(0,0,0,.2)"});
  document.body.appendChild(el);
  setTimeout(()=>{el.style.transition="opacity .25s";el.style.opacity="0";setTimeout(()=>el.remove(),250)},ms);
}

/* ===== Util ===== */
const kn = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function claseAcceso(v){
  const s = String(v??"").trim().toLowerCase();
  if (["true","1","sí","si","online"].includes(s)) return "estado-true";
  if (["false","0","no","offline"].includes(s))     return "estado-false";
  return "";
}
async function safeJson(res){
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { throw new Error('JSON inválido'); }
}

/* ===== Roles/filas desde URL_GET ===== */
async function cargarRolesYFilas(){
  try{
    const r = await fetch(URL_GET);
    if (!r.ok) throw new Error('GET usuarios falló');
    const arr = await safeJson(r);
    const map = new Map();
    for (const x of arr||[]){
      const usuario = String(x.usuario ?? x.Usuario ?? '').trim();
      if (!usuario) continue;
      map.set(kn(usuario), { rol: x.rol ?? x.Rol ?? '', fila: x.fila ?? '' });
    }
    return map;
  }catch{
    toast('No se pudo leer roles de Usuarios','error',3000);
    return new Map();
  }
}

/* ===== Conexiones desde CONN_API ===== */
async function cargarConexiones(){
  try{
    const r = await fetch(CONN_API + '?accion=last_all');
    if (!r.ok) throw new Error('GET conexion falló');
    const arr = await safeJson(r); // [{Usuario,Clave,Acceso,nombre,geolocalizacion,geo_lat,geo_lng,maps_iframe,hora,fecha,estado}]
    return Array.isArray(arr) ? arr : [];
  }catch{
    toast('No se pudo leer conexiones','error',3000);
    return [];
  }
}

/* ===== Listar (base CONN_API + rol/fila de URL_GET) ===== */
async function obtenerUsuarios(){
  // asegurar tbody
  if (!tabla){
    const t = document.getElementById('tabla');
    if (t) tabla = t.tBodies[0] || t.appendChild(document.createElement('tbody'));
    else { toast('No existe #tabla en el HTML','error',4000); return; }
  }

  const [rolesMap, conexiones] = await Promise.all([cargarRolesYFilas(), cargarConexiones()]);
  tabla.innerHTML = "";

  if (!conexiones.length){
    toast('Sin registros de conexión','error',2500);
    return;
  }

  const filas = conexiones.map(c=>{
    const ukey = kn(c.Usuario);
    const rf = rolesMap.get(ukey) || {rol:'', fila:''};
    return {
      usuario: c.Usuario || '',
      clave:   c.Clave   || '',
      acceso:  c.Acceso  || '',
      nombre:  c.nombre  || '',
      rol:     rf.rol || '',
      fila:    rf.fila || '',
      geo_txt:      c.geolocalizacion || '',
      geo_lat:      typeof c.geo_lat === 'number' ? c.geo_lat : NaN,
      geo_lng:      typeof c.geo_lng === 'number' ? c.geo_lng : NaN,
      maps_iframe:  c.maps_iframe || '',
      hora:         c.hora  || '',
      fecha:        c.fecha || '',
      estado:       c.estado|| ''
    };
  });

  for (const item of filas){
    const tr = document.createElement("tr");
    tr.className = claseAcceso(item.acceso || item.estado);
    tr.innerHTML = `
      <td>${item.usuario}</td>
      <td>${item.clave}</td>
      <td>${item.acceso}</td>
      <td>${item.nombre}</td>
      <td>${item.rol}</td>
      <td>
        <button type="button" class="btn-ed"${item.fila?'':' disabled'}>✏️</button>
        <button type="button" class="btn-el"${item.fila?'':' disabled'}>🗑️</button>
      </td>`;
    tr.querySelector(".btn-ed").addEventListener("click", ()=> item.fila && editar(item, item.fila));
    tr.querySelector(".btn-el").addEventListener("click", ()=> item.fila && eliminar(item.fila));
    tr.addEventListener("dblclick", ()=> abrirModalConexionDesdeAPI(item.usuario, item.rol));
    tabla.appendChild(tr);
  }

  if (primeraCarga){ toast("Usuarios cargados"); primeraCarga = false; }
}

/* ===== CRUD hoja Usuarios ===== */
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
    if (iguales){ toast("No se han realizado cambios"); return; }
  }
  fetch(URL_POST, {method:"POST", body: JSON.stringify(datos)})
    .then(r=>r.json())
    .then(res=>{
      res.resultado==="ok" ? toast("Guardado exitosamente") : toast("Error al guardar","error");
      form.reset(); obtenerUsuarios();
    })
    .catch(()=> toast("Error de red al guardar","error"));
});
function cancelarEdicion(){ form.reset(); }
function editar(item, fila){
  form.fila.value    = fila || "";
  form.usuario.value = item.usuario || "";
  form.clave.value   = item.clave   || "";
  form.acceso.value  = item.acceso  || "";
  form.nombre.value  = item.nombre  || "";
  form.rol.value     = item.rol     || "";
  datosOriginales = { ...item };
}
function eliminar(fila){
  if (!confirm("¿Eliminar este usuario?")) return;
  fetch(URL_POST, {method:"POST", body: JSON.stringify({accion:"eliminar", id:fila})})
    .then(r=>r.json())
    .then(res=>{ res.resultado==="ok"?toast("Eliminado correctamente"):toast("Error al eliminar","error"); obtenerUsuarios(); })
    .catch(()=> toast("Error de red al eliminar","error"));
}

/* ===== MODAL de Conexión (usa CONN_API) ===== */
(function(){
  let modalInyectado = false;

  function inyectarEstilosModal(){
    if (modalInyectado) return;
    const css = `
    #connOverlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;z-index:9998}
    #connModal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
      width:min(960px,92vw);background:#0b0f14;color:#e5e7eb;border:1px solid #162133;border-radius:14px;z-index:9999}
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
    #connGMap{height:360px;border:1px solid #162133;border-radius:10px;overflow:hidden}
    #connGMap iframe{width:100%;height:100%;border:0}
    .connBtn{background:#111827;border:1px solid #1f2937;color:#e5e7eb;border-radius:8px;padding:8px 12px;cursor:pointer}`;
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    modalInyectado = true;
  }

  function ensureModal(){
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
          <button class="connBtn" id="connClose">Cerrar</button>
        </div>
        <div class="connBody">
          <div class="connGrid">
            <div><label>Usuario</label><span id="cUsuario"></span></div>
            <div><label>Clave</label><span id="cClave"></span></div>
            <div><label>Acceso</label><span id="cAcceso"></span></div>
            <div><label>Nombre</label><span id="cNombre"></span></div>
            <div><label>Rol</label><span id="cRol"></span></div>
            <div><label>geolocalizacion</label><span id="cGeolocalizacion"></span></div>
            <div><label>Hora</label><span id="cHora"></span></div>
            <div><label>Fecha</label><span id="cFecha"></span></div>
            <div><label>Estado</label><span id="cEstado"></span></div>
          </div>
          <div id="connGMap"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", e => { if (e.target.id === "connOverlay") overlay.style.display = "none"; });
    document.getElementById("connClose").onclick = () => overlay.style.display = "none";
  }

  function mapSrc(lat, lng, geoTxt, embed){
    if (embed && String(embed).startsWith('http')) return embed;
    if (isFinite(lat) && isFinite(lng)) return `https://www.google.com/maps?q=${lat},${lng}&hl=es&z=14&output=embed`;
    const q = encodeURIComponent(geoTxt||'Chile');
    return `https://www.google.com/maps?q=${q}&hl=es&z=11&output=embed`;
  }

  window.abrirModalConexionDesdeAPI = async function(usuario, rolDesdeUsuarios=""){
    try{
      if (!CONN_API){ toast("Falta CONN_API","error",3000); return; }
      ensureModal();
      const overlay = document.getElementById("connOverlay");
      overlay.style.display = "block";

      const r = await fetch(CONN_API + "?accion=last&usuario=" + encodeURIComponent(usuario||""));
      if (!r.ok){ toast("No se pudo leer conexión","error",3000); return; }
      const d = await safeJson(r); // {Usuario,Clave,Acceso,nombre,rol,geolocalizacion,geo_lat,geo_lng,maps_iframe,hora,fecha,estado}

      const u = d.Usuario || usuario || '';
      const acceso = d.Acceso || '';
      const estado = (d.estado||'').toString().toLowerCase();
      const online = ["true","1","sí","si","online"].includes(String(acceso).trim().toLowerCase()) || estado==="online";

      document.getElementById("connTitulo").textContent = `Conexión de ${u}`;
      document.getElementById("connDot").className = "dot " + (online ? "online" : "offline");

      document.getElementById("cUsuario").textContent = u;
      document.getElementById("cClave").textContent   = d.Clave || '';
      document.getElementById("cAcceso").textContent  = acceso;
      document.getElementById("cNombre").textContent  = d.nombre || '';
      document.getElementById("cRol").textContent     = rolDesdeUsuarios || d.rol || '';
      document.getElementById("cGeolocalizacion").textContent = d.geolocalizacion || '(sin coordenadas)';
      document.getElementById("cHora").textContent    = d.hora || '';
      document.getElementById("cFecha").textContent   = d.fecha || '';
      document.getElementById("cEstado").textContent  = d.estado || '';

      const src = mapSrc(d.geo_lat, d.geo_lng, d.geolocalizacion, d.maps_iframe);
      document.getElementById('connGMap').innerHTML =
        `<iframe src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    }catch{
      toast("Error cargando modal","error",3000);
    }
  };
})();

/* ===== Tiempo real ===== */
function iniciarTiempoReal(){ if (poller) clearInterval(poller); poller = setInterval(obtenerUsuarios, 10000); }
obtenerUsuarios(); iniciarTiempoReal();
