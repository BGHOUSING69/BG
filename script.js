const MAPBOX_TOKEN = 'pk.eyJ1IjoiYm91ZGFhZ29wIiwiYSI6ImNtY3JzY3kyYzByMWsydnE3NGV2ZWN5eWcifQ.WEx6rGJXK7st_u3J9MfTbw';
// Local sample data for offline testing; replace with Google Sheets URL for live data
const CSV_URL = 'properties.csv';

mapboxgl.accessToken = MAPBOX_TOKEN;
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [-73.56, 45.51],
  zoom: 11
});

map.on('style.load', () => {
  map.addLayer({
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': '#aaa',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 0.6
    }
  });
});

let markers = [];

function getColor(capRate) {
  const rate = parseFloat(capRate);
  if (rate >= 8) return 'green';
  if (rate >= 6) return 'orange';
  return 'red';
}

function clearMarkers() {
  markers.forEach(m => m.remove());
  markers = [];
}

function parseSparkline(str) {
  return str.replace(/[{}]/g, '').split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
}

function addMarker(row) {
  const el = document.createElement('div');
  el.className = 'marker';
  el.style.background = getColor(row.CapRate);
  el.style.width = '15px';
  el.style.height = '15px';
  el.style.borderRadius = '50%';
  el.style.border = '2px solid #fff';

  const marker = new mapboxgl.Marker(el)
    .setLngLat([parseFloat(row.Longitude), parseFloat(row.Latitude)])
    .addTo(map);

  marker.getElement().addEventListener('mouseenter', () => el.style.transform = 'scale(1.3)');
  marker.getElement().addEventListener('mouseleave', () => el.style.transform = '');

  marker.getElement().addEventListener('click', () => {
    map.flyTo({ center: [parseFloat(row.Longitude), parseFloat(row.Latitude)], zoom: 13 });
    openPanel(row);
  });

  markers.push(marker);
}

function openPanel(row) {
  const panel = document.getElementById('side-panel');
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>${row.Name}</h2>
    <p><strong>Cap Rate:</strong> ${row.CapRate}%</p>
    <p><strong>Type:</strong> ${row.Type}</p>
    <p><strong>BONUS Revenues I:</strong> $${row['BONUS Revenues I']}</p>
    <p><strong>Net Income:</strong> $${row.NetIncome}</p>
    <div class="sparkline"><canvas id="spark"></canvas></div>
    <a href="#" id="faith-link">Faith-Optimized Strategy ➔</a>
  `;
  panel.classList.add('open');
  drawSparkline(parseSparkline(row.SparklineData));
}

function drawSparkline(data) {
  const ctx = document.getElementById('spark').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i + 1),
      datasets: [{
        data,
        borderColor: '#0074D9',
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function loadData() {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    complete: results => {
      clearMarkers();
      results.data.forEach(row => {
        if (row.Latitude && row.Longitude) {
          addMarker(row);
        }
      });
    }
  });
}

function generateReport() {
  const content = document.getElementById('content');
  const name = content.querySelector('h2')?.textContent || '';
  window.location.href = `mailto:founders@boudaagop.ca?subject=Bespoke%20Report%20Request%20-%20${encodeURIComponent(name)}`;
}

function setLanguage(lang) {
  currentLanguage = lang;
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
}

const translations = {
  en: {
    faith_title: 'Faith-Optimized Strategy',
    faith_text: 'Structured under multi-faith aligned principles (Islamic, Christian, Jewish), non-reliant on unsecured debt, avoiding refinancing until closure. Combines new amortization rules with Murabaha / Musharaka, aligned with ESG & PropTech for maximum community & investor benefit.',
    bespoke: 'Bespoke Report ($)'
  },
  fr: {
    faith_title: 'Stratégie Optimisée par la Foi',
    faith_text: 'Structuré selon des principes multiconfessionnels (islamique, chrétien, juif), sans dette non garantie et évitant le refinancement. Combine les nouvelles règles d\'amortissement avec Murabaha / Musharaka, aligné ESG et PropTech pour maximiser communauté et investisseurs.',
    bespoke: 'Rapport sur mesure ($)'
  }
};

let currentLanguage = 'en';

function toggleTheme() {
  const body = document.body;
  if (body.classList.contains('dark-mode')) {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
  } else {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
  }
}

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

document.getElementById('side-panel').addEventListener('click', e => {
  if (e.target.id === 'faith-link') {
    alert(translations[currentLanguage].faith_text);
  }
});

map.on('load', loadData);
setInterval(loadData, 60000);
