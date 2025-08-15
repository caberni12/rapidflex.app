
const URL_GET = 'https://script.google.com/macros/s/AKfycbwyr2gGjYp_Ua_AQ5JpZIySSmF-4_O7Llb6xzftFEJrmMnie1KhGkjB00zrrmAk6Mppuw/exec';
const URL_POST = 'https://script.google.com/macros/s/AKfycbxePmGgZEAqeCtihkksLig7EAWMj2XB6qJu4O6nB4OJdqrEIUwu2S2glf9nWdqMnS6diQ/exec';

const form = document.getElementById("formulario");
const tabla = document.querySelector("#tabla tbody");

let datosOriginales = {};

form.addEventListener("submit", e => {
  e.preventDefault();
  const datos = {
    accion: form.fila.value ? "modificar" : "guardar",
    fila: form.fila.value,
    nombre: form.nombre.value,
    email: form.email.value,
    telefono: form.telefono.value,
    mensaje: form.mensaje.value,
    status: form.status.value,
  };

  if (datos.accion === "modificar") {
    const iguales =
      datos.nombre === datosOriginales.nombre &&
      datos.email === datosOriginales.email &&
      datos.telefono === datosOriginales.telefono &&
      datos.mensaje === datosOriginales.mensaje &&
      datos.status === datosOriginales.status;

    if (iguales) {
      alert("No se han realizado cambios.");
      return;
    }
  }

  fetch(URL_POST, {
    method: "POST",
    body: JSON.stringify(datos),
  })
    .then(r => r.json())
    .then(res => {
      alert(res.resultado === "ok" ? "Registro guardado" : "Error al guardar");
      form.reset();
      obtenerDatos();
    })
    .catch(err => {
      console.error("Error al guardar:", err);
      alert("Error al guardar.");
    });
});

function cancelarEdicion() {
  form.reset();
}

function obtenerDatos() {
  const loader = document.getElementById('loader');
if (loader) loader.style.display = 'block';
  loader.style.display = 'block';

  fetch(URL_GET)
    .then(r => r.json())
    .then(data => {
      data.sort((a, b) => new Date(b["fecha y hora"]) - new Date(a["fecha y hora"]));
      tabla.innerHTML = "";
      data.forEach((item) => {

      const fila = item.fila;
      const statusRaw = (item.status || "").trim().toLowerCase();
      const status =
        statusRaw === "nuevo" ? "Nuevo" :
        statusRaw === "en proceso" ? "En proceso" :
        statusRaw === "finalizado" ? "Finalizado" : item.status;

      const tr = document.createElement("tr");

      const celdaFecha = document.createElement("td");
      celdaFecha.textContent = formatearFechaHora(item["fecha y hora"]) || "";
      tr.appendChild(celdaFecha);

      const celdaNombre = document.createElement("td");
      celdaNombre.textContent = item.nombre || "";
      tr.appendChild(celdaNombre);

      const celdaEmail = document.createElement("td");
      celdaEmail.textContent = item.email || "";
      tr.appendChild(celdaEmail);

      const celdaTelefono = document.createElement("td");
      celdaTelefono.textContent = item.telefono || "";
      tr.appendChild(celdaTelefono);

      const celdaMensaje = document.createElement("td");
      celdaMensaje.textContent = item.mensaje || "";
      tr.appendChild(celdaMensaje);

      const celdaStatus = document.createElement("td");
      celdaStatus.classList.add("status-celda");
      celdaStatus.setAttribute("data-status", status);
      celdaStatus.textContent = status;
      tr.appendChild(celdaStatus);

      const celdaBotones = document.createElement("td");
      celdaBotones.innerHTML = `
        <button onclick='editar(${JSON.stringify(item)}, ${fila})'>✏️</button>
        <button onclick='eliminar(${fila})'>🗑️</button>
      `;
      tr.appendChild(celdaBotones);

      tabla.appendChild(tr);
    
  });
    })
    .catch(err => {
      console.error("Error al obtener datos:", err);
      alert("Error al cargar los datos.");
    })
    .finally(() => {
      if (loader) loader.style.display = 'none';
console.log('✅ Loader cerrado');
    });
}

function editar(item, fila) {
  form.fila.value = fila;
  form.nombre.value = item.nombre;
  form.email.value = item.email;
  form.telefono.value = item.telefono;
  form.mensaje.value = item.mensaje;
  form.status.value = item.status;

  datosOriginales = { ...item };
}

function eliminar(fila) {
  if (!confirm("¿Eliminar este registro?")) return;
  fetch(URL_POST, {
    method: "POST",
    body: JSON.stringify({ accion: "eliminar", id: fila }),
  })
    .then(r => r.json())
    .then(res => {
      if (res.resultado === "ok") {
        alert("Registro eliminado");
        obtenerDatos();
      } else {
        alert("Error al eliminar: " + res.mensaje);
      }
    })
    .catch(err => {
      console.error("Error al eliminar:", err);
      alert("Error al eliminar.");
    });
}

function formatearFechaHora(isoString) {
  if (!isoString) return "";
  const fechaObj = new Date(isoString);
  if (isNaN(fechaObj)) return isoString;

  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const año = fechaObj.getFullYear();
  const horas = String(fechaObj.getHours()).padStart(2, '0');
  const minutos = String(fechaObj.getMinutes()).padStart(2, '0');
  const segundos = String(fechaObj.getSeconds()).padStart(2, '0');

  return `${dia}/${mes}/${año} ${horas}:${minutos}:${segundos}`;
}

obtenerDatos();


function generarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(12);
  doc.text("Reporte de Clientes - RapidFlex", 14, 15);

  let y = 30;
  doc.setFontSize(10);

  const cols = {
    fecha: 10,
    nombre: 60,
    email: 120,
    telefono: 180,
    status: 240
  };

  doc.setFont("helvetica", "bold");
  doc.text("Fecha", cols.fecha, y);
  doc.text("Nombre", cols.nombre, y);
  doc.text("Email", cols.email, y);
  doc.text("Teléfono", cols.telefono, y);
  doc.text("Status", cols.status, y);
  y += 10;

  doc.setFont("helvetica", "normal");

  // Obtener filas y ordenarlas por fecha descendente:
  const filas = Array.from(document.querySelectorAll("#tabla tbody tr"));

  filas.sort((a, b) => {
    const fechaA = new Date(a.querySelector("td").innerText.trim());
    const fechaB = new Date(b.querySelector("td").innerText.trim());
    return fechaB - fechaA; // Descendente
  });

  filas.forEach(row => {
    if (row.style.display === "none") return;

    const celdas = row.querySelectorAll("td");
    if (celdas.length >= 6) {
      const fechaRaw = celdas[0].innerText.trim();
      const fechaObj = new Date(fechaRaw);
      const fechaFormateada = isNaN(fechaObj)
        ? fechaRaw
        : `${String(fechaObj.getDate()).padStart(2, '0')}/${String(fechaObj.getMonth() + 1).padStart(2, '0')}/${fechaObj.getFullYear()}`;

      const datos = [
        fechaFormateada,
        celdas[1].innerText.trim(),
        celdas[2].innerText.trim(),
        celdas[3].innerText.trim(),
        celdas[5].innerText.trim()
      ];

      const maxWidths = {
        fecha: 45,
        nombre: 55,
        email: 55,
        telefono: 50,
        status: 45
      };

      const alturas = datos.map((dato, i) => {
        const key = Object.keys(cols)[i];
        const maxWidth = maxWidths[key] || 50;
        const lines = doc.splitTextToSize(dato, maxWidth);
        return lines.length * 7;
      });
      const maxHeight = Math.max(...alturas);

      datos.forEach((dato, i) => {
        const key = Object.keys(cols)[i];
        const x = cols[key];
        const maxWidth = maxWidths[key] || 50;
        const lines = doc.splitTextToSize(dato, maxWidth);
        doc.text(lines, x, y);
      });

      doc.setDrawColor(200);
      doc.line(10, y + maxHeight + 2, 280, y + maxHeight + 2);

      y += maxHeight + 8;

      if (y > 190) {
        doc.addPage();
        y = 20;
      }
    }
  });

  doc.save("reporte-repartidor.pdf");
}

function exportarExcel() {
  const wb = XLSX.utils.book_new();
  const ws_data = [["Fecha", "Nombre", "Email", "Teléfono", "Mensaje", "Status"]];

  const filas = Array.from(document.querySelectorAll("#tabla tbody tr"));

  // Ordenar filas por fecha descendente
  filas.sort((a, b) => {
    const fechaA = new Date(a.querySelector("td").innerText.trim());
    const fechaB = new Date(b.querySelector("td").innerText.trim());
    return fechaB - fechaA; // Más reciente primero
  });

  filas.forEach(row => {
    if (row.style.display === "none") return;

    const celdas = row.querySelectorAll("td");
    if (celdas.length >= 6) {
      const fechaRaw = celdas[0].innerText.trim();
      const fechaObj = new Date(fechaRaw);
      const fechaFormateada = isNaN(fechaObj)
        ? fechaRaw
        : `${String(fechaObj.getDate()).padStart(2, '0')}/${String(fechaObj.getMonth() + 1).padStart(2, '0')}/${fechaObj.getFullYear()}`;

      ws_data.push([
        fechaFormateada,
        celdas[1].innerText.trim(),
        celdas[2].innerText.trim(),
        celdas[3].innerText.trim(),
        celdas[4].innerText.trim(),
        celdas[5].innerText.trim()
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "Repartidor");
  XLSX.writeFile(wb, "reporte-repartidor.xlsx");
}



document.getElementById("buscar").addEventListener("input", function () {
  const filtro = this.value.toLowerCase();
  const filas = document.querySelectorAll("#tabla tbody tr");

  filas.forEach((fila) => {
    const celdas = fila.querySelectorAll("td");
    const textoFila = Array.from(celdas).map(td => td.textContent.toLowerCase()).join(" ");
    fila.style.display = textoFila.includes(filtro) ? "" : "none";
  });
});


function filtrarTabla() {
  const input = document.getElementById("buscador");
  const filtro = input.value.toLowerCase();
  const tabla = document.getElementById("tabla");
  const filas = tabla.getElementsByTagName("tr");

  for (let i = 1; i < filas.length; i++) {
    const celdas = filas[i].getElementsByTagName("td");
    let coincide = false;

    for (let j = 0; j < celdas.length; j++) {
      const textoCelda = celdas[j].textContent.toLowerCase();
      if (textoCelda.includes(filtro)) {
        coincide = true;
        break;
      }
    }

    filas[i].style.display = coincide ? "" : "none";
  }
}
