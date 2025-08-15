const GAS_URL = "https://script.google.com/macros/s/AKfycbwsXshOze1AzVq4Q65VVOQBv1oOngYKBvtTTTjSoqjCzN_ew0ckUrjYrVGr0ikFXxAM/exec";

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
      document.getElementById("contenido").style.display = "block";
    } else {
      localStorage.removeItem("sessionToken");
      window.location.href = "index.html";
    }
  } catch (e) {
    console.error("Error al verificar sesión:", e);
    window.location.href = "index.html";
  }
}



function cerrarSesion() {
  localStorage.removeItem("sessionToken");
  window.location.href = "index.html";
}

document.addEventListener("click", (e) => {
  const slider = document.getElementById("slider");
  const menuBtn = document.querySelector(".menu-btn");

  if (
    slider.classList.contains("open") &&
    !slider.contains(e.target) &&
    !menuBtn.contains(e.target)
  ) {
    slider.classList.remove("open");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  verificarSesion();

  document.querySelectorAll(".menu-link").forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const file = link.getAttribute("data-html");
      const target = document.getElementById("contenido-principal");
      try {
        const res = await fetch(file);
        if (!res.ok) throw new Error("No se pudo cargar el archivo");
        const html = await res.text();
        target.innerHTML = html;
        toggleSlider();
      } catch (error) {
        target.innerHTML = `<p style="color:red;">Error al cargar el contenido.</p>`;
        console.error(error);
      }
    });
  });
});

function toggleSlider() {
  const slider = document.getElementById("slider");
  slider.classList.toggle("open");
}

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
    docElem.requestFullscreen();
  } else if (docElem.mozRequestFullScreen) {
    docElem.mozRequestFullScreen(); // Firefox
  } else if (docElem.webkitRequestFullscreen) {
    docElem.webkitRequestFullscreen(); // Chrome, Safari, Opera
  } else if (docElem.msRequestFullscreen) {
    docElem.msRequestFullscreen(); // IE/Edge
  }
}

// Intentar activar pantalla completa al cargar
window.addEventListener('load', () => {
  // Esperar un pequeño clic del usuario para activarlo (necesario por políticas del navegador)
  document.addEventListener('click', activarPantallaCompleta, { once: true });
});






