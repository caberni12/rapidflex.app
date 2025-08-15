README - SPA routing en main.html

Fecha: 2025-08-14 20:18:15.330461

Cambios principales:
- Se añadió un contenedor de ruteo con iframe en main.html: <div id="routeView"><iframe id="routeFrame">...</iframe></div>
- Se actualizaron los botones (si existe .slider-buttons) para navegar con hash:
  #/dashboard, #/sistema, #/sistema2
- Se reemplazó main.js por una versión con ruteo hash que alterna entre el dashboard y el iframe.
- Se creó una copia de seguridad del main.js original como main.backup.js

Cómo probar (Live Server):
1) Abrir la carpeta en VS Code
2) Open with Live Server sobre index.html o main.html
3) Usar los botones "Registro Clientes" (#/sistema) y "Registro Repartidor" (#/sistema2)

Notas:
- En localhost/127.0.0.1 el script habilita un 'modo dev' que crea un sessionToken ficticio para agilizar pruebas.
- Si deseas volver al dashboard, usa #/dashboard o el botón correspondiente.
- Si no tenías <div class="slider-buttons">, agrega manualmente enlaces con #/sistema y #/sistema2.


2025-08-14 20:27:16.373262 - v3
- routeView oculto por defecto para evitar "main" duplicado.
- Router asegura que solo haya UNA vista visible (dashboard o iframe).
- Protección para no cargar main.html dentro del iframe.
- Inyección de CSS en iframe para forzar top/header a 100vw y autoajuste.
