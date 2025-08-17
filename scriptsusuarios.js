// === Endpoints ===
const URL_GET = 'https://script.google.com/macros/s/AKfycbzxif2AooKWtK8wRrqZ8OlQJlO6VekeIeEyZ-HFFIC9Nd4WVarzaUF6qu5dszG0AWdZ/exec';
const URL_POST = 'https://script.google.com/macros/s/AKfycbx23bjpEnJFtFmNfSvYzdOfcwwi2jZR17QFfIdY8HnC19_QD7BQo7TlYt8LP-HZM0s3/exec';

// === DOM ===
const form  = document.getElementById("formulario");
const tabla = document.querySelector("#tabla tbody");

// === Estado ===
let datosOriginales = {};

// === UI: alerta flotante autodescartable ===
function toast(msg, type = "ok", ms = 2500) {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.top = "12px";
  el.style.left = "50%";
  el.style.transform = "translateX(-50%)";
  el.style.padding = "10px 14px";
  el.style.background = type === "ok" ? "#0ea5e9" : "#ef4444"; // azul / rojo
  el.style.color = "#fff";
  el.style.fontSize = "14px";
  el.style.borderRadius = "8px";
  el.style.zIndex = "9999";
  el.style.boxShadow = "0 2px 6px rgba(0,0,0,.2)";
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s";
    el.style.opacity = "0";
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
    fila: item.fila
  };
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

// === Listar ===
function obtenerUsuarios() {
  fetch(URL_GET)
    .then(r => r.json())
    .then(data => {
      tabla.innerHTML = "";
      data.forEach(raw => {
        const item = normalizar(raw);
        const tr = document.createElement("tr");
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
        tabla.appendChild(tr);
      });
      toast("Usuarios cargados");
    })
    .catch(() => toast("Error al cargar usuarios", "error"));
}

// === Editar ===
function editar(item, fila) {
  form.fila.value = fila;
  form.usuario.value = item.usuario;
  form.clave.value = item.clave;
  form.acceso.value = item.acceso;
  form.nombre.value = item.nombre;
  form.rol.value = item.rol;
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

// === Inicio ===
obtenerUsuarios();
