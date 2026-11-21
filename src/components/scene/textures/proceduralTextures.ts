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
 * Procedural Earth Texture with high-fidelity Indian subcontinent & Sriharikota beacon
 */
export function getProceduralEarthTexture(): THREE.CanvasTexture {
  if (cachedEarthTexture) return cachedEarthTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Ocean Base with Depth Variations
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#040d1a'); // Arctic deep blue
  oceanGrad.addColorStop(0.3, '#0b2347');
  oceanGrad.addColorStop(0.5, '#0e2e5c'); // Tropical ocean
  oceanGrad.addColorStop(0.7, '#0b2347');
  oceanGrad.addColorStop(1, '#040d1a'); // Antarctic deep blue
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Helper to map (lon, lat) to canvas pixels
  // Lon: -180 to +180 -> 0 to width
  // Lat: +90 to -90 -> 0 to height
  const toX = (lon: number) => ((lon + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // 2. Global Continents (Rough Realistic Shapes)
  ctx.fillStyle = '#26422b'; // Land vegetation tone

  // Eurasia & Africa broad landmass
  ctx.beginPath();
  // Africa
  ctx.ellipse(toX(20), toY(5), toX(15) - toX(0), toY(0) - toY(30), 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Europe & Northern Asia
  ctx.beginPath();
  ctx.ellipse(toX(60), toY(55), toX(50) - toX(0), toY(0) - toY(18), 0, 0, Math.PI * 2);
  ctx.fill();

  // Americas
  ctx.beginPath();
  ctx.ellipse(toX(-100), toY(45), toX(25) - toX(0), toY(0) - toY(20), -0.2, 0, Math.PI * 2);
  ctx.ellipse(toX(-60), toY(-15), toX(18) - toX(0), toY(0) - toY(25), 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Australia
  ctx.beginPath();
  ctx.ellipse(toX(135), toY(-25), toX(15) - toX(0), toY(0) - toY(12), 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Indian Subcontinent (High Detail)
  // Distinctive peninsular triangle, Bay of Bengal, Arabian Sea
  ctx.fillStyle = '#3a6639';
  ctx.beginPath();
  ctx.moveTo(toX(68), toY(24));  // Gujarat / Rann of Kutch
  ctx.lineTo(toX(72), toY(21));  // Kathiawar
  ctx.lineTo(toX(73), toY(19));  // Mumbai coast
  ctx.lineTo(toX(75), toY(14));  // Goa / Karnataka coast
  ctx.lineTo(toX(77), toY(8.1)); // Kanyakumari (Cape Comorin)
  ctx.lineTo(toX(80), toY(13));  // Tamil Nadu coast (near Chennai)
  ctx.lineTo(toX(80.2), toY(13.7)); // Sriharikota
  ctx.lineTo(toX(82.5), toY(17)); // Andhra Pradesh coast
  ctx.lineTo(toX(87), toY(21.5)); // Odisha / Bengal coast
  ctx.lineTo(toX(89), toY(22));  // Sunderbans / Ganges delta
  ctx.lineTo(toX(92), toY(26));  // Northeast / Assam
  ctx.lineTo(toX(88), toY(28));  // Sikkim
  ctx.lineTo(toX(82), toY(30));  // Nepal border
  ctx.lineTo(toX(75), toY(35));  // Kashmir / Himalayas
  ctx.lineTo(toX(71), toY(30));  // Punjab
  ctx.lineTo(toX(70), toY(25));  // Rajasthan
  ctx.closePath();
  ctx.fill();

  // Deccan plateau shading
  ctx.fillStyle = '#4f4a30';
  ctx.beginPath();
  ctx.ellipse(toX(77), toY(17), toX(4) - toX(0), toY(0) - toY(5), 0, 0, Math.PI * 2);
  ctx.fill();

  // Sri Lanka
  ctx.fillStyle = '#2f5a31';
  ctx.beginPath();
  ctx.ellipse(toX(80.8), toY(7.8), toX(1.4) - toX(0), toY(0) - toY(2.2), 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Himalayan snow arc
  ctx.strokeStyle = '#e6f0ff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(toX(74), toY(35));
  ctx.quadraticCurveTo(toX(82), toY(30), toX(93), toY(28));
  ctx.stroke();

  // 4. SDSC Sriharikota Launch Site Beacon (13.72° N, 80.23° E)
  const sharX = toX(80.23);
  const sharY = toY(13.72);

  // Concentric beacon rings
  ctx.strokeStyle = 'rgba(255, 170, 0, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sharX, sharY, 14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 210, 80, 0.7)';
  ctx.beginPath();
  ctx.arc(sharX, sharY, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ff3300';
  ctx.beginPath();
  ctx.arc(sharX, sharY, 3, 0, Math.PI * 2);
  ctx.fill();

  // 5. Procedural Swirling Clouds Layer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let i = 0; i < 45; i++) {
    const cx = (i * 47) % width;
    const cy = toY(-40 + ((i * 19) % 80));
    const rx = 35 + ((i * 13) % 70);
    const ry = 8 + ((i * 7) % 18);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Subtle Latitude & Longitude Reference Lines
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.08)';
  ctx.lineWidth = 1;
  // Equator
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // 80° E meridian (Sriharikota downrange corridor)
  ctx.strokeStyle = 'rgba(255, 180, 50, 0.15)';
  ctx.beginPath();
  ctx.moveTo(toX(80.23), 0);
  ctx.lineTo(toX(80.23), height);
  ctx.stroke();

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
