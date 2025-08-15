// URLs
const URL_CLIENTES = 'https://script.google.com/macros/s/AKfycbweYt_zCei90UcDNV13Jbvkqs92URKe-njCIJkCQtJ_VMLCULZiFsldtPMqbjHn60cusQ/exec?sheet=Clientes';
const URL_REPARTIDORES = 'https://script.google.com/macros/s/AKfycbyHMpaLc7qdPHNZdjPcxz7bwjIeFoV_wOMRGVm33oPKiSO1NWbVAta6Rsd-YGdxjlPmeg/exec?sheet=Repartidores';

let chartClientes = null;
let chartRepartidores = null;
let chartProyeccionClientes = null;

function cargarDashboard() {
  cargarDatosClientes();
  cargarDatosRepartidores();
  cargarDatosProyeccionClientes();
}

function recargarDatosClientes() {
  destruirGrafico(chartClientes);
  cargarDatosClientes();
}

function recargarDatosRepartidores() {
  destruirGrafico(chartRepartidores);
  cargarDatosRepartidores();
}

function recargarDatosProyeccionClientes() {
  destruirGrafico(chartProyeccionClientes);
  cargarDatosProyeccionClientes();
}

function destruirGrafico(chart) {
  if(chart) {
    chart.destroy();
  }
}

function formatearSoloFecha(datetimeStr) {
  if (!datetimeStr) return "";
  const d = new Date(datetimeStr);
  if (isNaN(d)) return datetimeStr;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth()+1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function cargarDatosClientes() {
  document.getElementById('loadingClientes').textContent = "Cargando datos...";
  try {
    const res = await fetch(URL_CLIENTES);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Datos inválidos");

    const conteo = { Finalizado: 0, Nuevo: 0, "En proceso": 0 };
    data.forEach(item => {
      const st = item.status || "";
      if (conteo.hasOwnProperty(st)) conteo[st]++;
    });

    const ctx = document.getElementById('estadoChartClientes').getContext('2d');
    destruirGrafico(chartClientes);
    chartClientes = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Finalizado', 'Nuevo', 'En proceso'],
        datasets: [{
          data: [conteo.Finalizado, conteo.Nuevo, conteo["En proceso"]],
          backgroundColor: ['#007bff', '#dc3545', '#ffc107'], // Azul, Rojo, Amarillo
        }]
      },
      options: {
        plugins: {
          datalabels: {
            formatter: (value, ctx) => {
              let sum = ctx.chart.data.datasets[0].data.reduce((a,b) => a + b, 0);
              let percentage = sum ? (value * 100 / sum).toFixed(1) + "%" : "0%";
              return percentage;
            },
            color: '#fff',
          }
        }
      },
      plugins: [ChartDataLabels]
    });

    // Últimos 5 mensajes
    const ultimos = data.slice(-5).reverse();
    const ultimosDiv = document.getElementById('ultimosClientes');
    ultimosDiv.innerHTML = "";
    ultimos.forEach(msg => {
      ultimosDiv.innerHTML += `<b>${formatearSoloFecha(msg["fecha y hora"])}</b> - ${msg.nombre || ""} - <i>${msg.status || ""}</i><br>`;
    });

    const total = data.length;
    document.getElementById('totalesClientes').textContent = `Total mensajes: ${total}`;
    document.getElementById('loadingClientes').textContent = "";
  } catch (e) {
    document.getElementById('loadingClientes').textContent = "Error cargando datos.";
    console.error(e);
  }
}

async function cargarDatosRepartidores() {
  document.getElementById('loadingRepartidores').textContent = "Cargando datos...";
  try {
    const res = await fetch(URL_REPARTIDORES);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Datos inválidos");

    const conteo = { Finalizado: 0, Nuevo: 0, "En proceso": 0 };
    data.forEach(item => {
      const st = item.status || "";
      if (conteo.hasOwnProperty(st)) conteo[st]++;
    });

    const ctx = document.getElementById('estadoChartRepartidores').getContext('2d');
    destruirGrafico(chartRepartidores);
    chartRepartidores = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Finalizado', 'Nuevo', 'En proceso'],
        datasets: [{
          data: [conteo.Finalizado, conteo.Nuevo, conteo["En proceso"]],
          backgroundColor: ['#007bff', '#dc3545', '#ffc107'], // Azul, Rojo, Amarillo
        }]
      },
      options: {
        plugins: {
          datalabels: {
            formatter: (value, ctx) => {
              let sum = ctx.chart.data.datasets[0].data.reduce((a,b) => a + b, 0);
              let percentage = sum ? (value * 100 / sum).toFixed(1) + "%" : "0%";
              return percentage;
            },
            color: '#fff',
          }
        }
      },
      plugins: [ChartDataLabels]
    });

    // Últimos 5 mensajes
    const ultimos = data.slice(-5).reverse();
    const ultimosDiv = document.getElementById('ultimosRepartidores');
    ultimosDiv.innerHTML = "";
    ultimos.forEach(msg => {
      ultimosDiv.innerHTML += `<b>${formatearSoloFecha(msg["fecha y hora"])}</b> - ${msg.nombre || ""} - <i>${msg.status || ""}</i><br>`;
    });

    const total = data.length;
    document.getElementById('totalesRepartidores').textContent = `Total mensajes: ${total}`;
    document.getElementById('loadingRepartidores').textContent = "";
  } catch (e) {
    document.getElementById('loadingRepartidores').textContent = "Error cargando datos.";
    console.error(e);
  }
}

async function cargarDatosProyeccionClientes() {
  document.getElementById('loadingProyeccionClientes').textContent = "Cargando datos...";
  try {
    const res = await fetch(URL_CLIENTES);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Datos inválidos");

    const conteoPorFecha = {};
    data.forEach(item => {
      const fecha = formatearSoloFecha(item["fecha y hora"]);
      if (fecha) {
        conteoPorFecha[fecha] = (conteoPorFecha[fecha] || 0) + 1;
      }
    });

    let fechas = Object.keys(conteoPorFecha).sort((a,b) => {
      const da = new Date(a.split('/').reverse().join('-'));
      const db = new Date(b.split('/').reverse().join('-'));
      return da - db;
    });
    fechas = fechas.slice(-7);
    const datos = fechas.map(f => conteoPorFecha[f] || 0);

    // Proyección lineal para 3 días siguientes
    let pendiente = 0;
    if (fechas.length > 1) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      fechas.forEach((f,i) => {
        const y = conteoPorFecha[f] || 0;
        sumX += i;
        sumY += y;
        sumXY += i*y;
        sumXX += i*i;
      });
      const n = fechas.length;
      pendiente = (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX);
    }

    const proyeccionFechas = [];
    const proyeccionDatos = [];
    for (let i=1; i<=3; i++) {
      proyeccionFechas.push(`Proy. +${i}d`);
      const y = (datos[datos.length-1] || 0) + pendiente*i;
      proyeccionDatos.push(y > 0 ? Math.round(y) : 0);
    }

    const ctx = document.getElementById('proyeccionChartClientes').getContext('2d');
    destruirGrafico(chartProyeccionClientes);
    chartProyeccionClientes = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [...fechas, ...proyeccionFechas],
        datasets: [{
          label: 'Mensajes Históricos',
          data: datos,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0,123,255,0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
        }, {
          label: 'Proyección',
          data: [...Array(datos.length).fill(null), ...proyeccionDatos],
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220,53,69,0.2)',
          fill: false,
          borderDash: [5,5],
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, precision:0 }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });

    document.getElementById('loadingProyeccionClientes').textContent = "";
  } catch (e) {
    document.getElementById('loadingProyeccionClientes').textContent = "Error cargando datos.";
    console.error(e);
  }
}