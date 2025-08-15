
const URL_GET = 'https://script.google.com/macros/s/AKfycbzxif2AooKWtK8wRrqZ8OlQJlO6VekeIeEyZ-HFFIC9Nd4WVarzaUF6qu5dszG0AWdZ/exec';
const URL_POST = 'https://script.google.com/macros/s/AKfycbx23bjpEnJFtFmNfSvYzdOfcwwi2jZR17QFfIdY8HnC19_QD7BQo7TlYt8LP-HZM0s3/exec';

const form = document.getElementById("formulario");
const tabla = document.querySelector("#tabla tbody");
const loader = document.getElementById("loader");

let datosOriginales = {};

function normalizar(item) {
  return {
    usuario: item.usuario ?? item.Usuario ?? "",
    clave: item.clave ?? item.Clave ?? "",
    acceso: item.acceso ?? item.Acceso ?? "",
    nombre: item.nombre ?? item.Nombre ?? "",
    rol: item.rol ?? item.Rol ?? "",
    fila: item.fila
  };
}

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
      datos.clave === datosOriginales.clave &&
      datos.acceso === datosOriginales.acceso &&
      datos.nombre === datosOriginales.nombre &&
      datos.rol === datosOriginales.rol;

    if (iguales) {
      alert("No se han realizado cambios.");
      return;
    }
  }

  fetch(URL_POST, {
    method: "POST",
    body: JSON.stringify(datos)
  })
    .then(r => r.json())
    .then(res => {
      alert(res.resultado === "ok" ? "Guardado exitosamente" : "Error");
      form.reset();
      obtenerUsuarios();
    });
});

function cancelarEdicion() {
  form.reset();
}

function obtenerUsuarios() {
  loader.style.display = "flex";
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
      loader.style.display = "none";
    })
    .catch(err => {
      alert("Error al cargar usuarios");
      loader.style.display = "none";
    });
}

function editar(item, fila) {
  form.fila.value = fila;
  form.usuario.value = item.usuario;
  form.clave.value = item.clave;
  form.acceso.value = item.acceso;
  form.nombre.value = item.nombre;
  form.rol.value = item.rol;

  datosOriginales = { ...item };
}

function eliminar(fila) {
  if (!confirm("¿Eliminar este usuario?")) return;
  fetch(URL_POST, {
    method: "POST",
    body: JSON.stringify({ accion: "eliminar", id: fila })
  })
    .then(r => r.json())
    .then(res => {
      alert(res.resultado === "ok" ? "Eliminado correctamente" : "Error");
      obtenerUsuarios();
    });
}

obtenerUsuarios();
