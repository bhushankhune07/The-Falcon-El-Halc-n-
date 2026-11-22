import * as THREE from 'three';

/**
 * Procedural HTML5 Canvas Texture Generators for Three.js
 * 100% procedural—zero external image URLs or .glb files to avoid CORS and offline failures.
 */

let cachedEarthTexture: THREE.CanvasTexture | null = null;
let cachedPadTexture: THREE.CanvasTexture | null = null;
let cachedRocketDecal: THREE.CanvasTexture | null = null;
let cachedSolarPanelTexture: THREE.CanvasTexture | null = null;
let cachedRadarTexture: THREE.CanvasTexture | null = null;

/**
 * Procedural Earth Texture with high-fidelity Indian subcontinent, continental bathymetry & Sriharikota beacon
 */
export function getProceduralEarthTexture(): THREE.CanvasTexture {
  if (cachedEarthTexture) return cachedEarthTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Realistic Bathymetry Ocean Base (rich NASA Blue Marble ocean blues #1258a8 to #1d74c9)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0a3266');    // Arctic sub-polar deep
  oceanGrad.addColorStop(0.18, '#104685'); // Sub-polar ocean
  oceanGrad.addColorStop(0.5, '#1258a8');  // Tropical deep ocean
  oceanGrad.addColorStop(0.82, '#104685'); // Southern ocean
  oceanGrad.addColorStop(1, '#0a3266');    // Antarctic deep
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Helper to map (lon, lat) to canvas pixels
  // Lon: -180 to +180 -> 0 to width
  // Lat: +90 to -90 -> 0 to height
  const toX = (lon: number) => ((lon + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // 2. Continental Shelf Shallow Marine Shading (Cyan-Blue #1d74c9)
  ctx.fillStyle = '#1d74c9';
  // Indian Ocean & Bay of Bengal shelf
  ctx.beginPath();
  ctx.ellipse(toX(82), toY(15), toX(12) - toX(0), toY(0) - toY(15), 0, 0, Math.PI * 2);
  ctx.ellipse(toX(73), toY(16), toX(9) - toX(0), toY(0) - toY(12), 0, 0, Math.PI * 2);
  // Red Sea & Persian Gulf shallow base
  ctx.ellipse(toX(45), toY(22), toX(9) - toX(0), toY(0) - toY(10), 0.5, 0, Math.PI * 2);
  // SE Asia shelf
  ctx.ellipse(toX(105), toY(10), toX(14) - toX(0), toY(0) - toY(14), 0, 0, Math.PI * 2);
  // Mediterranean shallow base
  ctx.ellipse(toX(20), toY(35), toX(16) - toX(0), toY(0) - toY(6), 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Global Landmasses (Sharp, Recognizable Continental Outlines)
  ctx.fillStyle = '#2d5e34'; // Vibrant continental land vegetation tone

  // A. AFRICA
  ctx.beginPath();
  ctx.moveTo(toX(-5), toY(36));   // Gibraltar / Morocco
  ctx.lineTo(toX(11), toY(37));   // Tunisia / Carthage
  ctx.lineTo(toX(32), toY(31));   // Egypt / Nile Delta
  ctx.lineTo(toX(34), toY(27));   // Sinai
  ctx.lineTo(toX(37), toY(22));   // Sudan Red Sea coast
  ctx.lineTo(toX(43), toY(12));   // Bab-el-Mandeb
  ctx.lineTo(toX(51), toY(10));   // Horn of Africa (Somalia)
  ctx.lineTo(toX(41), toY(-4));   // Kenya / Mombasa
  ctx.lineTo(toX(35), toY(-18));  // Mozambique
  ctx.lineTo(toX(28), toY(-33));  // South Africa (East)
  ctx.lineTo(toX(18), toY(-34));  // Cape of Good Hope
  ctx.lineTo(toX(12), toY(-16));  // Namibia / Angola
  ctx.lineTo(toX(9), toY(4));     // Gulf of Guinea / Cameroon
  ctx.lineTo(toX(2), toY(6));     // Nigeria / Ghana
  ctx.lineTo(toX(-14), toY(11));  // Guinea
  ctx.lineTo(toX(-17), toY(15));  // Dakar / Senegal
  ctx.lineTo(toX(-13), toY(28));  // Mauritania / Western Sahara
  ctx.closePath();
  ctx.fill();

  // B. ARABIAN PENINSULA
  ctx.fillStyle = '#3f3a28'; // Arid desert tone
  ctx.beginPath();
  ctx.moveTo(toX(35), toY(28));  // Aqaba
  ctx.lineTo(toX(43), toY(13));  // Bab-el-Mandeb
  ctx.lineTo(toX(52), toY(14));  // Yemen / Aden
  ctx.lineTo(toX(59), toY(22));  // Oman / Ras al Hadd
  ctx.lineTo(toX(56), toY(26));  // Strait of Hormuz
  ctx.lineTo(toX(48), toY(30));  // Persian Gulf / Kuwait
  ctx.closePath();
  ctx.fill();

  // C. EUROPE & EURASIA
  ctx.fillStyle = '#273e28';
  ctx.beginPath();
  // Iberia
  ctx.moveTo(toX(-9), toY(37));
  ctx.lineTo(toX(-9), toY(43));
  ctx.lineTo(toX(0), toY(43));
  // France / Central Europe
  ctx.lineTo(toX(5), toY(50));
  ctx.lineTo(toX(15), toY(55));
  ctx.lineTo(toX(28), toY(60));  // Baltic / Scandinavia
  ctx.lineTo(toX(40), toY(65));  // Northern Russia
  ctx.lineTo(toX(80), toY(72));  // Siberia
  ctx.lineTo(toX(130), toY(70));
  ctx.lineTo(toX(145), toY(55)); // Kamchatka
  ctx.lineTo(toX(130), toY(42)); // Vladivostok
  ctx.lineTo(toX(120), toY(35)); // Northern China
  ctx.lineTo(toX(105), toY(32)); // Central China
  ctx.lineTo(toX(85), toY(36));  // Central Asia
  ctx.lineTo(toX(60), toY(42));  // Caspian Sea north
  ctx.lineTo(toX(40), toY(44));  // Black Sea north
  ctx.lineTo(toX(26), toY(40));  // Greece / Balkans
  ctx.lineTo(toX(16), toY(41));  // Italy
  ctx.lineTo(toX(12), toY(44));
  ctx.lineTo(toX(3), toY(43));
  ctx.closePath();
  ctx.fill();

  // D. AMERICAS & AUSTRALIA
  ctx.beginPath();
  // North America
  ctx.ellipse(toX(-100), toY(45), toX(28) - toX(0), toY(0) - toY(18), -0.15, 0, Math.PI * 2);
  // South America
  ctx.ellipse(toX(-60), toY(-18), toX(18) - toX(0), toY(0) - toY(26), 0.2, 0, Math.PI * 2);
  // Australia
  ctx.ellipse(toX(134), toY(-25), toX(16) - toX(0), toY(0) - toY(12), 0, 0, Math.PI * 2);
  ctx.fill();

  // E. SOUTHEAST ASIA & EAST ASIA
  ctx.fillStyle = '#224424';
  ctx.beginPath();
  ctx.moveTo(toX(92), toY(22));   // Bangladesh / Myanmar border
  ctx.lineTo(toX(94), toY(16));   // Irrawaddy Delta
  ctx.lineTo(toX(98), toY(10));   // Andaman coast / Phuket
  ctx.lineTo(toX(103), toY(1.5)); // Singapore
  ctx.lineTo(toX(104), toY(6));   // East coast Malaysia
  ctx.lineTo(toX(101), toY(13));  // Gulf of Thailand / Bangkok
  ctx.lineTo(toX(105), toY(10));  // Mekong Delta / Vietnam
  ctx.lineTo(toX(109), toY(14));  // Da Nang
  ctx.lineTo(toX(108), toY(21));  // Gulf of Tonkin
  ctx.lineTo(toX(115), toY(22));  // Hong Kong / Guangdong
  ctx.lineTo(toX(121), toY(31));  // Shanghai
  ctx.lineTo(toX(105), toY(28));  // Interior
  ctx.closePath();
  ctx.fill();

  // Major Indonesian Archipelago Islands
  // Sumatra
  ctx.beginPath();
  ctx.ellipse(toX(101), toY(0), toX(4) - toX(0), toY(0) - toY(1.6), -0.7, 0, Math.PI * 2);
  ctx.fill();
  // Java
  ctx.beginPath();
  ctx.ellipse(toX(110), toY(-7.5), toX(4.5) - toX(0), toY(0) - toY(1.2), 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Borneo
  ctx.beginPath();
  ctx.ellipse(toX(114), toY(1), toX(3.5) - toX(0), toY(0) - toY(3.5), 0, 0, Math.PI * 2);
  ctx.fill();

  // F. HIGH-FIDELITY INDIAN SUBCONTINENT
  // Detailed peninsular triangle, Gujarat / Kathiawar, Mumbai, Kerala, Coromandel, Krishna-Godavari arc, Odisha, Sunderbans
  ctx.fillStyle = '#345e32'; // Lush Indian peninsula base
  ctx.beginPath();
  ctx.moveTo(toX(68.5), toY(24.0)); // Kutch / Sir Creek
  ctx.lineTo(toX(70.0), toY(22.8)); // Saurashtra / Kathiawar north
  ctx.lineTo(toX(69.2), toY(21.5)); // Dwarka
  ctx.lineTo(toX(71.0), toY(20.7)); // Diu / Gir south point
  ctx.lineTo(toX(72.2), toY(21.7)); // Gulf of Khambhat / Surat
  ctx.lineTo(toX(72.8), toY(19.0)); // Mumbai / Konkan coast
  ctx.lineTo(toX(73.8), toY(15.5)); // Goa
  ctx.lineTo(toX(74.8), toY(13.0)); // Mangaluru / Karnataka coast
  ctx.lineTo(toX(76.2), toY(9.9));  // Kochi / Kerala coast
  ctx.lineTo(toX(77.5), toY(8.1));  // Kanyakumari (Cape Comorin tip)
  ctx.lineTo(toX(78.2), toY(9.2));  // Gulf of Mannar
  ctx.lineTo(toX(79.8), toY(10.3)); // Point Calimere / Palk Strait
  ctx.lineTo(toX(80.2), toY(13.0)); // Chennai
  ctx.lineTo(toX(80.23), toY(13.72)); // SRIHARIKOTA ISLAND (SHAR)
  ctx.lineTo(toX(80.6), toY(15.8)); // Ongole
  ctx.lineTo(toX(82.2), toY(16.9)); // Krishna-Godavari Delta Arc
  ctx.lineTo(toX(83.3), toY(17.7)); // Visakhapatnam
  ctx.lineTo(toX(85.3), toY(19.8)); // Odisha coast / Puri
  ctx.lineTo(toX(87.0), toY(21.5)); // Balasore
  ctx.lineTo(toX(88.5), toY(22.0)); // Sunderbans delta west
  ctx.lineTo(toX(91.0), toY(22.5)); // Sunderbans delta east
  ctx.lineTo(toX(92.5), toY(25.0)); // Meghalaya / Assam
  ctx.lineTo(toX(95.0), toY(28.0)); // Arunachal Pradesh
  ctx.lineTo(toX(88.5), toY(27.8)); // Sikkim / Bhutan
  ctx.lineTo(toX(84.0), toY(28.5)); // Nepal border
  ctx.lineTo(toX(79.0), toY(31.0)); // Uttarakhand / Himalayas
  ctx.lineTo(toX(74.5), toY(34.5)); // Kashmir
  ctx.lineTo(toX(71.5), toY(31.0)); // Punjab
  ctx.lineTo(toX(70.0), toY(26.5)); // Thar desert / Rajasthan
  ctx.closePath();
  ctx.fill();

  // Deccan Plateau Interior Shading
  ctx.fillStyle = '#4a442a'; // Semi-arid Deccan plateau
  ctx.beginPath();
  ctx.ellipse(toX(76.5), toY(16.5), toX(4) - toX(0), toY(0) - toY(4.5), 0, 0, Math.PI * 2);
  ctx.fill();

  // Thar Desert Shading
  ctx.fillStyle = '#5c5235';
  ctx.beginPath();
  ctx.ellipse(toX(72.0), toY(27.0), toX(3) - toX(0), toY(0) - toY(2.5), -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Sri Lanka (Distinct Teardrop shape at 7.8°N, 80.8°E)
  ctx.fillStyle = '#2c582e';
  ctx.beginPath();
  ctx.ellipse(toX(80.7), toY(7.8), toX(1.3) - toX(0), toY(0) - toY(2.1), 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Snow-capped Himalayan Ridge (#f8fafc)
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(toX(73.5), toY(35.0));
  ctx.quadraticCurveTo(toX(82.0), toY(29.8), toX(95.0), toY(28.0));
  ctx.stroke();

  // Additional Tibetan snow glaciated peaks
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(toX(76.0), toY(36.0));
  ctx.lineTo(toX(88.0), toY(32.0));
  ctx.stroke();

  // 4. Subtle Latitude & Longitude Graticule Lines (every 30° lat/lon)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 1;

  // Parallels (-60, -30, 0, 30, 60)
  for (const lat of [-60, -30, 0, 30, 60]) {
    ctx.beginPath();
    ctx.moveTo(0, toY(lat));
    ctx.lineTo(width, toY(lat));
    ctx.stroke();
  }

  // Meridians (-150 to +150 step 30)
  for (let lon = -150; lon <= 150; lon += 30) {
    ctx.beginPath();
    ctx.moveTo(toX(lon), 0);
    ctx.lineTo(toX(lon), height);
    ctx.stroke();
  }

  // Highlighted Equator (0° Latitude)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(width, toY(0));
  ctx.stroke();

  // Highlighted 80.23° E Meridian (Sriharikota Launch Corridor)
  const sharX = toX(80.23);
  const sharY = toY(13.72);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(sharX, 0);
  ctx.lineTo(sharX, height);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // 5. High-Resolution SDSC Sriharikota Launch Site Marker (13.72° N, 80.23° E)
  // Outer glowing pulse rings
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sharX, sharY, 20, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(sharX, sharY, 11, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sharX, sharY, 5, 0, Math.PI * 2);
  ctx.stroke();

  // Central incandescent launchpad beacon
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(sharX, sharY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(sharX, sharY, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Beacon Annotation
  ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('SDSC SHAR (13.7°N, 80.2°E)', sharX + 14, sharY + 4);

  // 6. Realistic Procedural Wispy Atmosphere & Cloud Swirls
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let i = 0; i < 50; i++) {
    const cx = (i * 43) % width;
    const cy = toY(-35 + ((i * 17) % 70));
    const rx = 30 + ((i * 11) % 65);
    const ry = 7 + ((i * 5) % 15);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Intertropical Convergence Zone (ITCZ) equatorial cloud filament
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let lon = -160; lon <= 160; lon += 40) {
    ctx.beginPath();
    ctx.ellipse(toX(lon), toY(4), 85, 12, 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Golden City Night-Lights (India Megacities & Major Global Hubs)
  const cityLights = [
    // Indian Subcontinent & Vicinity
    { lon: 77.2, lat: 28.6, name: 'Delhi NCR', r: 4.5 },
    { lon: 72.87, lat: 19.07, name: 'Mumbai', r: 4.0 },
    { lon: 77.59, lat: 12.97, name: 'Bengaluru', r: 3.8 },
    { lon: 80.27, lat: 13.08, name: 'Chennai', r: 3.5 },
    { lon: 78.48, lat: 17.38, name: 'Hyderabad', r: 3.5 },
    { lon: 88.36, lat: 22.57, name: 'Kolkata', r: 3.5 },
    { lon: 72.57, lat: 23.02, name: 'Ahmedabad', r: 2.8 },
    { lon: 73.85, lat: 18.52, name: 'Pune', r: 2.5 },
    { lon: 79.98, lat: 7.95, name: 'Colombo', r: 2.2 },
    // Global Nodes
    { lon: 55.27, lat: 25.2, name: 'Dubai', r: 3.2 },
    { lon: 103.82, lat: 1.35, name: 'Singapore', r: 2.8 },
    { lon: 139.69, lat: 35.69, name: 'Tokyo', r: 5.0 },
    { lon: -0.12, lat: 51.5, name: 'London', r: 4.2 },
    { lon: 2.35, lat: 48.85, name: 'Paris', r: 3.8 },
    { lon: 31.23, lat: 30.04, name: 'Cairo', r: 3.0 },
    { lon: -74.0, lat: 40.71, name: 'New York', r: 4.6 },
    { lon: 151.2, lat: -33.86, name: 'Sydney', r: 3.2 },
  ];

  for (const city of cityLights) {
    const cx = toX(city.lon);
    const cy = toY(city.lat);
    const grad = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, city.r * 2.2);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.7)');
    grad.addColorStop(0.7, 'rgba(217, 119, 6, 0.3)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, city.r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, city.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  cachedEarthTexture = texture;
  return texture;
}

/**
 * Procedural Sriharikota Launch Pad FLP Texture
 */
export function getProceduralPadTexture(): THREE.CanvasTexture {
  if (cachedPadTexture) return cachedPadTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Weathered concrete base
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(0, 0, size, size);

  // Concrete grid expansion joints
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  for (let x = 0; x <= size; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Flame exhaust blast mark in center
  const flameGrad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, 120);
  flameGrad.addColorStop(0, '#111827');
  flameGrad.addColorStop(0.4, '#1f2937');
  flameGrad.addColorStop(0.8, '#374151');
  flameGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 120, 0, Math.PI * 2);
  ctx.fill();

  // Yellow & Black hazard boundary stripes
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#eab308';
  ctx.strokeRect(20, 20, size - 40, size - 40);

  ctx.strokeStyle = '#1e293b';
  ctx.setLineDash([14, 14]);
  ctx.strokeRect(20, 20, size - 40, size - 40);
  ctx.setLineDash([]);

  // Launch pad launch mount circle
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 50, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  cachedPadTexture = texture;
  return texture;
}

/**
 * Procedural ISRO Rocket Markings & Tricolour Decal
 */
export function getProceduralRocketDecal(): THREE.CanvasTexture {
  if (cachedRocketDecal) return cachedRocketDecal;

  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Pure white base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Indian Tricolour Band
  const stripeH = 28;
  const stripeY = 160;

  // Saffron
  ctx.fillStyle = '#ff9933';
  ctx.fillRect(0, stripeY, width, stripeH);

  // White
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, stripeY + stripeH, width, stripeH);

  // Ashoka Chakra Navy Dot in center
  ctx.fillStyle = '#000088';
  ctx.beginPath();
  ctx.arc(width / 2, stripeY + stripeH + stripeH / 2, 8, 0, Math.PI * 2);
  ctx.fill();

  // Green
  ctx.fillStyle = '#138808';
  ctx.fillRect(0, stripeY + stripeH * 2, width, stripeH);

  // Bold ISRO lettering
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ISRO', width / 2, 290);

  // "INDIA" in bold
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#ea580c';
  ctx.fillText('INDIA', width / 2, 345);

  const texture = new THREE.CanvasTexture(canvas);
  cachedRocketDecal = texture;
  return texture;
}

/**
 * Procedural Crystalline Solar Array Texture
 */
export function getProceduralSolarPanelTexture(): THREE.CanvasTexture {
  if (cachedSolarPanelTexture) return cachedSolarPanelTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep space solar blue
  ctx.fillStyle = '#0a1d47';
  ctx.fillRect(0, 0, size, size);

  // Silicon cells grid
  const cellSize = 32;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;

  for (let x = 0; x < size; x += cellSize) {
    for (let y = 0; y < size; y += cellSize) {
      // Cell interior gradient
      const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
      grad.addColorStop(0, '#0f2b6b');
      grad.addColorStop(1, '#081738');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      // Gold busbars
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(x + cellSize / 2, y);
      ctx.lineTo(x + cellSize / 2, y + cellSize);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  cachedSolarPanelTexture = texture;
  return texture;
}

/**
 * Procedural C-band SAR Radar Phased Array Antenna Texture
 */
export function getProceduralRadarTexture(): THREE.CanvasTexture {
  if (cachedRadarTexture) return cachedRadarTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Gold polyimide thermal blanket base
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(0, 0, size, size);

  // Microstrip patch array elements (C-band 5.4 GHz)
  ctx.fillStyle = '#eab308';
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 1;

  const patchSize = 16;
  const gap = 8;
  for (let x = gap; x < size - gap; x += patchSize + gap) {
    for (let y = gap; y < size - gap; y += patchSize + gap) {
      ctx.fillRect(x, y, patchSize, patchSize);
      ctx.strokeRect(x, y, patchSize, patchSize);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  cachedRadarTexture = texture;
  return texture;
}

let cachedMarsTexture: THREE.CanvasTexture | null = null;
let cachedSunTexture: THREE.CanvasTexture | null = null;
let cachedCloudsTexture: THREE.CanvasTexture | null = null;

/**
 * Procedural Mars Texture with Valles Marineris, Syrtis Major, and CO2 Polar Caps
 */
export function getProceduralMarsTexture(): THREE.CanvasTexture {
  if (cachedMarsTexture) return cachedMarsTexture;
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base Martian rust red & iron-oxide desert
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#78350f');
  grad.addColorStop(0.3, '#9a3412');
  grad.addColorStop(0.5, '#c2410c');
  grad.addColorStop(0.7, '#9a3412');
  grad.addColorStop(1, '#78350f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const toX = (lon: number) => ((lon + 180) / 360) * w;
  const toY = (lat: number) => ((90 - lat) / 180) * h;

  // Dark Basaltic Albedo Markings (Syrtis Major Planum)
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(toX(70), toY(10), toX(20) - toX(0), toY(0) - toY(14), -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Acidalia Planitia & Utopia Planitia
  ctx.beginPath();
  ctx.ellipse(toX(-35), toY(48), toX(28) - toX(0), toY(0) - toY(12), 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Valles Marineris Canyon System (4,000 km grand canyon gash)
  ctx.strokeStyle = '#291002';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(toX(-95), toY(-12));
  ctx.bezierCurveTo(toX(-75), toY(-14), toX(-55), toY(-10), toX(-30), toY(-16));
  ctx.stroke();

  // Olympus Mons Caldera
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.arc(toX(-133), toY(18), 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(toX(-133), toY(18), 5, 0, Math.PI * 2);
  ctx.fill();

  // Impact craters
  for (let c = 0; c < 35; c++) {
    const cx = (c * 37) % w;
    const cy = toY(-50 + ((c * 23) % 90));
    ctx.strokeStyle = '#572506';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 3 + (c % 8), 0, Math.PI * 2);
    ctx.stroke();
  }

  // North & South Carbon-Dioxide / Water Polar Ice Caps
  ctx.fillStyle = '#f8fafc';
  // North Pole Ice Cap
  ctx.beginPath();
  ctx.ellipse(w / 2, toY(86), w * 0.45, toY(0) - toY(8), 0, 0, Math.PI * 2);
  ctx.fill();
  // South Pole Ice Cap
  ctx.beginPath();
  ctx.ellipse(w / 2, toY(-86), w * 0.4, toY(0) - toY(7), 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cachedMarsTexture = texture;
  return texture;
}

/**
 * Procedural Sun Texture with turbulent solar granules, chromosphere and sunspots
 */
export function getProceduralSunTexture(): THREE.CanvasTexture {
  if (cachedSunTexture) return cachedSunTexture;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Radiant Solar Photosphere base
  const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#fef9c3');  // Incandescent white-yellow core
  grad.addColorStop(0.4, '#fde047'); // Bright yellow chromosphere
  grad.addColorStop(0.75, '#f59e0b');// Deep orange plasma
  grad.addColorStop(0.92, '#ea580c');// Turbulent magnetic rim
  grad.addColorStop(1, '#b91c1c');   // Limb darkening
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Solar Granulation Noise (convection cells)
  for (let g = 0; g < 400; g++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(254, 240, 138, 0.4)' : 'rgba(217, 119, 6, 0.25)';
    ctx.beginPath();
    ctx.arc(gx, gy, 2 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Active Sunspot Regions (Penumbra & Umbra)
  const spots = [
    { x: size * 0.38, y: size * 0.42, r: 10 },
    { x: size * 0.42, y: size * 0.44, r: 6 },
    { x: size * 0.65, y: size * 0.55, r: 8 },
  ];
  for (const s of spots) {
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  cachedSunTexture = texture;
  return texture;
}

/**
 * Procedural Cloud Texture for Earth atmosphere shell
 */
export function getProceduralCloudsTexture(): THREE.CanvasTexture {
  if (cachedCloudsTexture) return cachedCloudsTexture;
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';

  for (let c = 0; c < 70; c++) {
    const cx = (c * 67) % w;
    const cy = (c * 31) % h;
    const rx = 25 + (c % 15) * 4;
    const ry = 8 + (c % 9) * 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, (c * 0.3) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cachedCloudsTexture = texture;
  return texture;
}
