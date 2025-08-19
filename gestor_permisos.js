// URLs de tus dos Web Apps
const READ_URL  = "https://script.google.com/macros/s/AKfycbxR_-RzUw42wadeaLnAxf_lib_TRREIAw1yK0n-h0w9eMyxJ7nku38AnL_oMGC9BJl5/exec";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzLWpb7mBjScAsutmsmX783sWZb4dTK95n-6JgJ4E_Ei-qVVXte2xWdsdh_coWMb6Wc/exec";

let encabezados = [];
let cacheDatos = [];
let usuarioEliminar = "";
let filtro = "";

const $ = s => document.querySelector(s);
const show = (id,v=true)=> (document.getElementById(id).style.display = v?'flex':'none');
const setStatus = m => { const s=$('#status'); if(s) s.textContent=m||''; };
const norm = s => String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

async function cargarPermisos(){
  setStatus('Cargando…');
  try{
    const res = await fetch(READ_URL, { cache:'no-store' });
    const datos = await res.json();
    cacheDatos = Array.isArray(datos) ? datos : [];
    encabezados = cacheDatos.length ? Object.keys(cacheDatos[0]) : ['usuarios'];
    pintarTabla();
    setStatus('');
  }catch(e){ console.error(e); setStatus('Error al cargar'); }
}

function filtrar(){
  if (!filtro) return cacheDatos;
  const q = norm(filtro);
  return cacheDatos.filter(row => encabezados.some(h => norm(row[h]).includes(q)));
}

function pintarTabla(){
  const thead = $('#theadPermisos');
  const tbody = $('#tbodyPermisos');
  if (!thead || !tbody) return;

  thead.innerHTML = '<tr>' + encabezados.map(h=>`<th>${h}</th>`).join('') + '<th>Acciones</th></tr>';

  const data = filtrar();
  if (!data.length){
    tbody.innerHTML = `<tr><td colspan="${encabezados.length+1}" style="text-align:center;padding:16px">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(fila=>{
    const tds = encabezados.map(h=>{
      if (h==='usuarios') return `<td>${fila[h]}</td>`;
      const val = (fila[h]===true) || (String(fila[h]).toUpperCase()==='TRUE');
      return `<td>${val ? '✅' : '❌'}</td>`;
    }).join('');
    const u = String(fila['usuarios']).replace(/"/g,'&quot;');
    return `<tr>${tds}<td>
      <button onclick="abrirModalEditar('${u}')">Editar</button>
      <button class="btn-sec" onclick="abrirModalEliminar('${u}')">Eliminar</button>
    </td></tr>`;
  }).join('');
}

function abrirModalEditar(usuario){
  const fila = cacheDatos.find(x => String(x.usuarios)===String(usuario));
  $('#usuarioEditar').value = usuario || '';

  const cont = $('#checkboxesPermisos');
  const cols = encabezados.filter(h=>h!=='usuarios');
  cont.innerHTML = cols.map(col=>{
    const v = fila ? ((fila[col]===true) || (String(fila[col]).toUpperCase()==='TRUE')) : false;
    return `<label><input type="checkbox" name="${col}" ${v?'checked':''}> ${col}</label>`;
  }).join('');

  $('#modalTitle').textContent = fila ? 'Editar permisos' : 'Nuevo usuario';
  show('modalEditar', true);
}
window.abrirModalEditar = abrirModalEditar;

function abrirModalEliminar(usuario){
  usuarioEliminar = usuario;
  $('#textoEliminar').textContent = 'Eliminar al usuario: ' + usuario;
  show('modalEliminar', true);
}
window.abrirModalEliminar = abrirModalEliminar;

async function guardarCambios(e){
  e.preventDefault();
  const usuario = $('#usuarioEditar').value.trim();
  if (!usuario){ alert('Ingrese el usuario'); return; }

  const checks = Array.from(document.querySelectorAll('#formEditar input[type=checkbox]'));
  const permisos = Object.fromEntries(checks.map(ch=>[ch.name, ch.checked]));

  setStatus('Guardando…');
  const body = new URLSearchParams({ accion:'editar', usuario, permisos: JSON.stringify(permisos) });
  const r = await fetch(WRITE_URL, {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8' },
    body
  });
  let ok = true;
  try{ const j = await r.json(); ok = !!j.ok; }catch(_){}
  if (!ok) alert('No se pudo guardar');
  show('modalEditar', false);
  await cargarPermisos();
}

async function confirmarEliminar(){
  if (!usuarioEliminar) return;
  setStatus('Eliminando…');
  const body = new URLSearchParams({ accion:'eliminar', usuario:usuarioEliminar });
  const r = await fetch(WRITE_URL, {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8' },
    body
  });
  let ok = true;
  try{ const j = await r.json(); ok = !!j.ok; }catch(_){}
  if (!ok) alert('No se pudo eliminar');
  show('modalEliminar', false);
  await cargarPermisos();
}

window.addEventListener('DOMContentLoaded', ()=>{
  const busc = document.getElementById('buscar');
  if (busc) busc.addEventListener('input', e=>{ filtro = e.target.value||''; pintarTabla(); });

  document.getElementById('btnNuevo')?.addEventListener('click', ()=>abrirModalEditar(''));
  document.getElementById('closeEdit')?.addEventListener('click', ()=>show('modalEditar', false));
  document.getElementById('btnCancelEdit')?.addEventListener('click', ()=>show('modalEditar', false));
  document.getElementById('formEditar')?.addEventListener('submit', guardarCambios);

  document.getElementById('closeDel')?.addEventListener('click', ()=>show('modalEliminar', false));
  document.getElementById('btnCancelDel')?.addEventListener('click', ()=>show('modalEliminar', false));
  document.getElementById('btnConfirmDel')?.addEventListener('click', confirmarEliminar);

  cargarPermisos();
});
