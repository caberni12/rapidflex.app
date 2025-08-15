const GAS_URL = "https://script.google.com/macros/s/AKfycbwsXshOze1AzVq4Q65VVOQBv1oOngYKBvtTTTjSoqjCzN_ew0ckUrjYrVGr0ikFXxAM/exec";

function mostrarLoader() {
  document.getElementById("loader").style.display = "flex";
}

function ocultarLoader() {
  document.getElementById("loader").style.display = "none";
}

// FUNCIÓN DE LOGIN
function validar() {
  const usuario = document.getElementById("usuario").value.trim();
  const clave = document.getElementById("clave").value.trim();
  const mensaje = document.getElementById("mensaje");

  mensaje.textContent = "";
  mostrarLoader();

  fetch(GAS_URL, {
    method: "POST",
    body: new URLSearchParams({ usuario, clave })
  })
    .then(res => res.json())
    .then(data => {
      ocultarLoader();
      if (data.status === "OK") {
        localStorage.setItem("sessionToken", data.token);
        mensaje.textContent = "Acceso concedido...";
        setTimeout(() => {
          window.location.href = "main.html";
        }, 1000);
      } else if (data.status === "DENEGADO") {
        mensaje.textContent = "No tienes permisos para acceder.";
      } else {
        mensaje.textContent = data.mensaje || "Error en la autenticación.";
      }
    })
    .catch(() => {
      ocultarLoader();
      mensaje.textContent = "Error de conexión.";
    });
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


