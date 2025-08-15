const GAS_URL = "https://script.google.com/macros/s/AKfycbwsXshOze1AzVq4Q65VVOQBv1oOngYKBvtTTTjSoqjCzN_ew0ckUrjYrVGr0ikFXxAM/exec";

// Tiempo máximo de inactividad en milisegundos (30 segundos)
const TIEMPO_MAX_INACTIVIDAD = 60 * 1000;

let temporizadorInactividad;

async function verificarSesion() {
  const token = localStorage.getItem("sessionToken");
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  try {
    const response = await fetch(`${GAS_URL}?checkSession=1&session=${token}`);
    const resultado = await response.json();

    if (resultado.status === "OK") {
      const contenido = document.getElementById('contenido');
      if (contenido) contenido.style.display = 'block';

      const divUsuario = document.getElementById("usuarioNombre");
      if (divUsuario && resultado.nombre) {
        divUsuario.textContent = "👤 " + resultado.nombre;
      }

      iniciarDeteccionInactividad(); // Inicia el temporizador al entrar

    } else {
      cerrarSesion();
    }
  } catch (error) {
    console.error("Error al verificar sesión:", error);
    cerrarSesion();
  }
}

function cerrarSesion() {
  localStorage.removeItem("sessionToken");
  window.location.href = "index.html";
}

function iniciarDeteccionInactividad() {
  document.addEventListener("mousemove", reiniciarTemporizador);
  document.addEventListener("keydown", reiniciarTemporizador);
  document.addEventListener("click", reiniciarTemporizador);
  document.addEventListener("touchstart", reiniciarTemporizador);

  reiniciarTemporizador(); // Empieza el contador
}

function reiniciarTemporizador() {
  clearTimeout(temporizadorInactividad);
  temporizadorInactividad = setTimeout(() => {
    alert("Sesión finalizada por inactividad");
    cerrarSesion();
  }, TIEMPO_MAX_INACTIVIDAD);
}

document.addEventListener("DOMContentLoaded", verificarSesion);

// Bloquear clic derecho
document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});

// Bloquear teclas de función y combinaciones como F12, Ctrl+Shift+I, Ctrl+U, etc.
document.addEventListener("keydown", function (e) {
  // F12
  if (e.key === "F12") {
    e.preventDefault();
  }

  // Ctrl + Shift + I / J / C
  if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) {
    e.preventDefault();
  }

  // Ctrl + U (ver código fuente)
  if (e.ctrlKey && e.key === "u") {
    e.preventDefault();
  }

  // Ctrl + S (guardar)
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
  }

  // Ctrl + P (imprimir)
  if (e.ctrlKey && e.key === "p") {
    e.preventDefault();
  }
});

// Bloquear clic derecho
document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});

// Bloquear combinaciones peligrosas
document.addEventListener("keydown", function (e) {
  const key = e.key.toLowerCase();

  // F12 o Ctrl+Shift+I / J / C
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && ["i", "j", "c", "k"].includes(key))
  ) {
    e.preventDefault();
  }

  // Ctrl + combinaciones comunes
  if (
    (e.ctrlKey && ["u", "s", "p", "f", "c"].includes(key)) || // u: ver fuente, s: guardar, p: imprimir, f: buscar, c: copiar
    (e.metaKey && ["s", "p", "u", "f"].includes(key)) // para usuarios Mac
  ) {
    e.preventDefault();
  }
});

function activarPantallaCompleta() {
  const docElem = document.documentElement;

  if (docElem.requestFullscreen) {
    docElem
  } else if (docElem.mozRequestFullScreen) {
    docElem // Firefox
  } else if (docElem.webkitRequestFullscreen) {
    docElem // Chrome, Safari, Opera
  } else if (docElem.msRequestFullscreen) {
    docElem // IE/Edge
  }
}

// Intentar activar pantalla completa al cargar
window.addEventListener('load', () => {
  // Esperar un pequeño clic del usuario para activarlo (necesario por políticas del navegador)
  document.addEventListener('click', activarPantallaCompleta, { once: true });
});