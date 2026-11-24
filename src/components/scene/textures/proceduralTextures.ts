import * as THREE from 'three';

/**
 * Procedural HTML5 Canvas Texture Generators and Custom GLSL Shaders for Three.js
 * 100% browser-native & procedural — zero external image URLs or .glb files.
 */

// Caches for textures
let cachedEarthTexture: THREE.CanvasTexture | null = null;
let cachedEarthBumpMap: THREE.CanvasTexture | null = null;
let cachedEarthRoughnessMap: THREE.CanvasTexture | null = null;
let cachedCloudsTexture: THREE.CanvasTexture | null = null;

let cachedMarsTexture: THREE.CanvasTexture | null = null;
let cachedMarsBumpMap: THREE.CanvasTexture | null = null;
let cachedMarsRoughnessMap: THREE.CanvasTexture | null = null;

let cachedPadTexture: THREE.CanvasTexture | null = null;
let cachedRocketDecal: THREE.CanvasTexture | null = null;
let cachedSolarPanelTexture: THREE.CanvasTexture | null = null;
let cachedRadarTexture: THREE.CanvasTexture | null = null;

let cachedGoldMLIBump: THREE.CanvasTexture | null = null;
let cachedGoldMLIRoughness: THREE.CanvasTexture | null = null;
let cachedFuselageMap: THREE.CanvasTexture | null = null;
let cachedFuselageBump: THREE.CanvasTexture | null = null;
let cachedFuselageRoughness: THREE.CanvasTexture | null = null;

/**
 * Helper to draw global continental outlines on a 2D canvas context
 */
function drawGlobalContinents(
  ctx: CanvasRenderingContext2D,
  _w: number,
  _h: number,
  toX: (lon: number) => number,
  toY: (lat: number) => number
) {
  // A. AFRICA
  ctx.beginPath();
  ctx.moveTo(toX(-5), toY(36));
  ctx.lineTo(toX(11), toY(37));
  ctx.lineTo(toX(32), toY(31));
  ctx.lineTo(toX(34), toY(27));
  ctx.lineTo(toX(37), toY(22));
  ctx.lineTo(toX(43), toY(12));
  ctx.lineTo(toX(51), toY(10));
  ctx.lineTo(toX(41), toY(-4));
  ctx.lineTo(toX(35), toY(-18));
  ctx.lineTo(toX(28), toY(-33));
  ctx.lineTo(toX(18), toY(-34));
  ctx.lineTo(toX(12), toY(-16));
  ctx.lineTo(toX(9), toY(4));
  ctx.lineTo(toX(2), toY(6));
  ctx.lineTo(toX(-14), toY(11));
  ctx.lineTo(toX(-17), toY(15));
  ctx.lineTo(toX(-13), toY(28));
  ctx.closePath();
  ctx.fill();

  // B. ARABIAN PENINSULA
  ctx.beginPath();
  ctx.moveTo(toX(35), toY(28));
  ctx.lineTo(toX(43), toY(13));
  ctx.lineTo(toX(52), toY(14));
  ctx.lineTo(toX(59), toY(22));
  ctx.lineTo(toX(56), toY(26));
  ctx.lineTo(toX(48), toY(30));
  ctx.closePath();
  ctx.fill();

  // C. EUROPE & EURASIA
  ctx.beginPath();
  ctx.moveTo(toX(-9), toY(37));
  ctx.lineTo(toX(-9), toY(43));
  ctx.lineTo(toX(0), toY(43));
  ctx.lineTo(toX(5), toY(50));
  ctx.lineTo(toX(15), toY(55));
  ctx.lineTo(toX(28), toY(60));
  ctx.lineTo(toX(40), toY(65));
  ctx.lineTo(toX(80), toY(72));
  ctx.lineTo(toX(130), toY(70));
  ctx.lineTo(toX(145), toY(55));
  ctx.lineTo(toX(130), toY(42));
  ctx.lineTo(toX(120), toY(35));
  ctx.lineTo(toX(105), toY(32));
  ctx.lineTo(toX(85), toY(36));
  ctx.lineTo(toX(60), toY(42));
  ctx.lineTo(toX(40), toY(44));
  ctx.lineTo(toX(26), toY(40));
  ctx.lineTo(toX(16), toY(41));
  ctx.lineTo(toX(12), toY(44));
  ctx.lineTo(toX(3), toY(43));
  ctx.closePath();
  ctx.fill();

  // D. NORTH AMERICA
  ctx.beginPath();
  ctx.moveTo(toX(-168), toY(65));
  ctx.lineTo(toX(-160), toY(56));
  ctx.lineTo(toX(-140), toY(59));
  ctx.lineTo(toX(-130), toY(54));
  ctx.lineTo(toX(-124), toY(47));
  ctx.lineTo(toX(-122), toY(37));
  ctx.lineTo(toX(-117), toY(32));
  ctx.lineTo(toX(-110), toY(23));
  ctx.lineTo(toX(-105), toY(20));
  ctx.lineTo(toX(-96), toY(16));
  ctx.lineTo(toX(-89), toY(21));
  ctx.lineTo(toX(-91), toY(18));
  ctx.lineTo(toX(-97), toY(26));
  ctx.lineTo(toX(-89), toY(29));
  ctx.lineTo(toX(-81), toY(25));
  ctx.lineTo(toX(-80), toY(30));
  ctx.lineTo(toX(-75), toY(35));
  ctx.lineTo(toX(-74), toY(40));
  ctx.lineTo(toX(-70), toY(43));
  ctx.lineTo(toX(-64), toY(45));
  ctx.lineTo(toX(-55), toY(50));
  ctx.lineTo(toX(-60), toY(57));
  ctx.lineTo(toX(-75), toY(62));
  ctx.lineTo(toX(-85), toY(64));
  ctx.lineTo(toX(-95), toY(72));
  ctx.lineTo(toX(-130), toY(70));
  ctx.lineTo(toX(-156), toY(71));
  ctx.closePath();
  ctx.fill();

  // E. SOUTH AMERICA
  ctx.beginPath();
  ctx.moveTo(toX(-77), toY(8));
  ctx.lineTo(toX(-72), toY(12));
  ctx.lineTo(toX(-62), toY(10));
  ctx.lineTo(toX(-51), toY(0));
  ctx.lineTo(toX(-44), toY(-2.5));
  ctx.lineTo(toX(-35), toY(-5));
  ctx.lineTo(toX(-38), toY(-13));
  ctx.lineTo(toX(-41), toY(-21));
  ctx.lineTo(toX(-46), toY(-24));
  ctx.lineTo(toX(-52), toY(-32));
  ctx.lineTo(toX(-56), toY(-35));
  ctx.lineTo(toX(-62), toY(-39));
  ctx.lineTo(toX(-65), toY(-47));
  ctx.lineTo(toX(-68), toY(-54));
  ctx.lineTo(toX(-67), toY(-56));
  ctx.lineTo(toX(-74), toY(-52));
  ctx.lineTo(toX(-73), toY(-40));
  ctx.lineTo(toX(-71), toY(-33));
  ctx.lineTo(toX(-70), toY(-23));
  ctx.lineTo(toX(-77), toY(-12));
  ctx.lineTo(toX(-81), toY(-5));
  ctx.lineTo(toX(-80), toY(0));
  ctx.lineTo(toX(-78), toY(5));
  ctx.closePath();
  ctx.fill();

  // F. AUSTRALIA
  ctx.beginPath();
  ctx.moveTo(toX(142), toY(-10.5));
  ctx.lineTo(toX(145), toY(-17));
  ctx.lineTo(toX(150), toY(-23));
  ctx.lineTo(toX(153), toY(-28));
  ctx.lineTo(toX(151), toY(-34));
  ctx.lineTo(toX(147), toY(-38));
  ctx.lineTo(toX(141), toY(-38));
  ctx.lineTo(toX(138), toY(-35));
  ctx.lineTo(toX(133), toY(-32));
  ctx.lineTo(toX(124), toY(-33));
  ctx.lineTo(toX(115), toY(-34));
  ctx.lineTo(toX(115), toY(-32));
  ctx.lineTo(toX(114), toY(-26));
  ctx.lineTo(toX(114), toY(-22));
  ctx.lineTo(toX(119), toY(-20));
  ctx.lineTo(toX(122), toY(-17));
  ctx.lineTo(toX(128), toY(-14));
  ctx.lineTo(toX(131), toY(-12));
  ctx.lineTo(toX(136), toY(-12));
  ctx.lineTo(toX(136), toY(-16));
  ctx.lineTo(toX(141), toY(-17));
  ctx.closePath();
  ctx.fill();

  // G. SOUTHEAST ASIA
  ctx.beginPath();
  ctx.moveTo(toX(92), toY(22));
  ctx.lineTo(toX(94), toY(16));
  ctx.lineTo(toX(98), toY(10));
  ctx.lineTo(toX(103), toY(1.5));
  ctx.lineTo(toX(104), toY(6));
  ctx.lineTo(toX(101), toY(13));
  ctx.lineTo(toX(105), toY(10));
  ctx.lineTo(toX(109), toY(14));
  ctx.lineTo(toX(108), toY(21));
  ctx.lineTo(toX(115), toY(22));
  ctx.lineTo(toX(121), toY(31));
  ctx.lineTo(toX(105), toY(28));
  ctx.closePath();
  ctx.fill();

  // H. HIGH-PRECISION INDIAN SUBCONTINENT
  ctx.beginPath();
  ctx.moveTo(toX(68.5), toY(24.0));
  ctx.lineTo(toX(70.0), toY(22.8));
  ctx.lineTo(toX(69.2), toY(21.5));
  ctx.lineTo(toX(71.0), toY(20.7));
  ctx.lineTo(toX(72.2), toY(21.7));
  ctx.lineTo(toX(72.8), toY(19.0));
  ctx.lineTo(toX(73.8), toY(15.5));
  ctx.lineTo(toX(74.8), toY(13.0));
  ctx.lineTo(toX(76.2), toY(9.9));
  ctx.lineTo(toX(77.5), toY(8.1));
  ctx.lineTo(toX(78.2), toY(9.2));
  ctx.lineTo(toX(79.8), toY(10.3));
  ctx.lineTo(toX(80.2), toY(13.0));
  ctx.lineTo(toX(80.23), toY(13.72)); // SRIHARIKOTA
  ctx.lineTo(toX(80.6), toY(15.8));
  ctx.lineTo(toX(82.2), toY(16.9));
  ctx.lineTo(toX(83.3), toY(17.7));
  ctx.lineTo(toX(85.3), toY(19.8));
  ctx.lineTo(toX(87.0), toY(21.5));
  ctx.lineTo(toX(88.5), toY(22.0));
  ctx.lineTo(toX(91.0), toY(22.5));
  ctx.lineTo(toX(92.5), toY(25.0));
  ctx.lineTo(toX(95.0), toY(28.0));
  ctx.lineTo(toX(88.5), toY(27.8));
  ctx.lineTo(toX(84.0), toY(28.5));
  ctx.lineTo(toX(79.0), toY(31.0));
  ctx.lineTo(toX(74.5), toY(34.5));
  ctx.lineTo(toX(71.5), toY(31.0));
  ctx.lineTo(toX(70.0), toY(26.5));
  ctx.closePath();
  ctx.fill();

  // I. SRI LANKA
  ctx.beginPath();
  ctx.moveTo(toX(80.2), toY(9.8));
  ctx.lineTo(toX(79.8), toY(9.3));
  ctx.lineTo(toX(79.7), toY(8.8));
  ctx.lineTo(toX(79.8), toY(7.0));
  ctx.lineTo(toX(80.2), toY(6.0));
  ctx.lineTo(toX(80.6), toY(5.9));
  ctx.lineTo(toX(81.2), toY(6.2));
  ctx.lineTo(toX(81.8), toY(7.0));
  ctx.lineTo(toX(81.6), toY(8.0));
  ctx.lineTo(toX(81.2), toY(8.8));
  ctx.closePath();
  ctx.fill();
}

/**
 * 2048x1024 High-Resolution Earth PBR Texture Set
 */
export function getProceduralEarthPBRTextures() {
  if (cachedEarthTexture && cachedEarthBumpMap && cachedEarthRoughnessMap && cachedCloudsTexture) {
    return {
      map: cachedEarthTexture,
      bumpMap: cachedEarthBumpMap,
      roughnessMap: cachedEarthRoughnessMap,
      cloudsMap: cachedCloudsTexture,
    };
  }

  const w = 2048;
  const h = 1024;
  const toX = (lon: number) => ((lon + 180) / 360) * w;
  const toY = (lat: number) => ((90 - lat) / 180) * h;

  // 1. Color Map
  const cCanvas = document.createElement('canvas');
  cCanvas.width = w;
  cCanvas.height = h;
  const cCtx = cCanvas.getContext('2d')!;

  const oceanGrad = cCtx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#062044');
  oceanGrad.addColorStop(0.2, '#0c356a');
  oceanGrad.addColorStop(0.5, '#1258a8');
  oceanGrad.addColorStop(0.8, '#0c356a');
  oceanGrad.addColorStop(1, '#062044');
  cCtx.fillStyle = oceanGrad;
  cCtx.fillRect(0, 0, w, h);

  // Continental Shelf Cyan Shading
  cCtx.fillStyle = '#1d74c9';
  cCtx.beginPath();
  cCtx.ellipse(toX(82), toY(15), toX(14) - toX(0), toY(0) - toY(16), 0, 0, Math.PI * 2);
  cCtx.ellipse(toX(73), toY(16), toX(10) - toX(0), toY(0) - toY(14), 0, 0, Math.PI * 2);
  cCtx.ellipse(toX(105), toY(10), toX(16) - toX(0), toY(0) - toY(16), 0, 0, Math.PI * 2);
  cCtx.ellipse(toX(-80), toY(26), toX(12) - toX(0), toY(0) - toY(10), 0, 0, Math.PI * 2);
  cCtx.fill();

  // Continents Land Fill (Vegetation Green)
  cCtx.fillStyle = '#2d5e34';
  drawGlobalContinents(cCtx, w, h, toX, toY);

  // Arid biomes: Sahara, Thar, Arabia, Australian Outback
  cCtx.fillStyle = '#655737';
  cCtx.beginPath();
  cCtx.ellipse(toX(22), toY(23), toX(18) - toX(0), toY(0) - toY(7), 0, 0, Math.PI * 2);
  cCtx.ellipse(toX(48), toY(22), toX(10) - toX(0), toY(0) - toY(7), 0, 0, Math.PI * 2);
  cCtx.ellipse(toX(72), toY(27), toX(4) - toX(0), toY(0) - toY(3), -0.2, 0, Math.PI * 2);
  cCtx.ellipse(toX(133), toY(-25), toX(12) - toX(0), toY(0) - toY(7), 0, 0, Math.PI * 2);
  cCtx.fill();

  // Snow-capped mountains & Polar Ice
  cCtx.fillStyle = '#f8fafc';
  cCtx.fillRect(0, 0, w, toY(78));
  cCtx.fillRect(0, toY(-74), w, h - toY(-74));

  // Himalayan snow range
  cCtx.strokeStyle = '#ffffff';
  cCtx.lineWidth = 6;
  cCtx.beginPath();
  cCtx.moveTo(toX(73.5), toY(35.0));
  cCtx.quadraticCurveTo(toX(82.0), toY(29.8), toX(95.0), toY(28.0));
  cCtx.stroke();

  // Sriharikota Pin & Launch Corridor
  const sharX = toX(80.23);
  const sharY = toY(13.72);
  cCtx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  cCtx.lineWidth = 1.5;
  cCtx.setLineDash([6, 4]);
  cCtx.beginPath();
  cCtx.moveTo(sharX, 0);
  cCtx.lineTo(sharX, h);
  cCtx.stroke();
  cCtx.setLineDash([]);

  cCtx.strokeStyle = '#ef4444';
  cCtx.lineWidth = 2;
  cCtx.beginPath();
  cCtx.arc(sharX, sharY, 8, 0, Math.PI * 2);
  cCtx.stroke();
  cCtx.fillStyle = '#f59e0b';
  cCtx.beginPath();
  cCtx.arc(sharX, sharY, 3, 0, Math.PI * 2);
  cCtx.fill();

  // Golden City Lights (Night-Side Atmosphere Enrichment)
  const cityLights = [
    { lon: 77.2, lat: 28.6, r: 4.0 },   // Delhi
    { lon: 72.87, lat: 19.07, r: 4.5 }, // Mumbai
    { lon: 77.59, lat: 12.97, r: 3.5 }, // Bengaluru
    { lon: 80.27, lat: 13.08, r: 3.5 }, // Chennai
    { lon: 88.36, lat: 22.57, r: 3.5 }, // Kolkata
    { lon: 139.69, lat: 35.69, r: 5.0 },// Tokyo
    { lon: -74.0, lat: 40.71, r: 4.5 }, // New York
    { lon: -0.12, lat: 51.5, r: 4.0 },  // London
  ];
  for (const c of cityLights) {
    const cx = toX(c.lon);
    const cy = toY(c.lat);
    const grad = cCtx.createRadialGradient(cx, cy, 0.5, cx, cy, c.r * 2);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
    grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.6)');
    grad.addColorStop(1, 'transparent');
    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.arc(cx, cy, c.r * 2, 0, Math.PI * 2);
    cCtx.fill();
  }

  const cTex = new THREE.CanvasTexture(cCanvas);
  cTex.wrapS = THREE.RepeatWrapping;
  cTex.wrapT = THREE.ClampToEdgeWrapping;
  cachedEarthTexture = cTex;

  // 2. Bump Map (Topography)
  const bCanvas = document.createElement('canvas');
  bCanvas.width = w;
  bCanvas.height = h;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#101010';
  bCtx.fillRect(0, 0, w, h);

  bCtx.fillStyle = '#555555';
  drawGlobalContinents(bCtx, w, h, toX, toY);

  bCtx.strokeStyle = '#ffffff';
  bCtx.lineWidth = 8;
  bCtx.beginPath();
  // Himalayas
  bCtx.moveTo(toX(73.5), toY(35.0));
  bCtx.quadraticCurveTo(toX(82.0), toY(29.8), toX(95.0), toY(28.0));
  // Andes
  bCtx.moveTo(toX(-70), toY(-50));
  bCtx.lineTo(toX(-75), toY(5));
  // Rockies
  bCtx.moveTo(toX(-115), toY(32));
  bCtx.lineTo(toX(-128), toY(55));
  bCtx.stroke();

  const bTex = new THREE.CanvasTexture(bCanvas);
  bTex.wrapS = THREE.RepeatWrapping;
  bTex.wrapT = THREE.ClampToEdgeWrapping;
  cachedEarthBumpMap = bTex;

  // 3. Roughness Map (Water smooth specular, land rough matte)
  const rCanvas = document.createElement('canvas');
  rCanvas.width = w;
  rCanvas.height = h;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#242424'; // Ocean = glossy specular glints
  rCtx.fillRect(0, 0, w, h);

  rCtx.fillStyle = '#d4d4d4'; // Land = matte
  drawGlobalContinents(rCtx, w, h, toX, toY);

  rCtx.fillStyle = '#555555'; // Ice caps = semi-gloss
  rCtx.fillRect(0, 0, w, toY(78));
  rCtx.fillRect(0, toY(-74), w, h - toY(-74));

  const rTex = new THREE.CanvasTexture(rCanvas);
  rTex.wrapS = THREE.RepeatWrapping;
  rTex.wrapT = THREE.ClampToEdgeWrapping;
  cachedEarthRoughnessMap = rTex;

  // 4. Clouds Texture
  const clCanvas = document.createElement('canvas');
  clCanvas.width = w;
  clCanvas.height = h;
  const clCtx = clCanvas.getContext('2d')!;
  clCtx.clearRect(0, 0, w, h);
  clCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';

  for (let c = 0; c < 120; c++) {
    const cx = (c * 79) % w;
    const cy = toY(-60 + ((c * 37) % 120));
    const rx = 35 + ((c * 19) % 85);
    const ry = 9 + ((c * 7) % 18);
    clCtx.beginPath();
    clCtx.ellipse(cx, cy, rx, ry, ((c * 0.25) % Math.PI), 0, Math.PI * 2);
    clCtx.fill();
  }

  clCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let lon = -170; lon <= 170; lon += 30) {
    clCtx.beginPath();
    clCtx.ellipse(toX(lon), toY(4), 95, 14, 0.04, 0, Math.PI * 2);
    clCtx.fill();
  }

  const clTex = new THREE.CanvasTexture(clCanvas);
  clTex.wrapS = THREE.RepeatWrapping;
  clTex.wrapT = THREE.ClampToEdgeWrapping;
  cachedCloudsTexture = clTex;

  return {
    map: cTex,
    bumpMap: bTex,
    roughnessMap: rTex,
    cloudsMap: clTex,
  };
}

export function getProceduralEarthTexture(): THREE.CanvasTexture {
  return getProceduralEarthPBRTextures().map;
}

export function getProceduralCloudsTexture(): THREE.CanvasTexture {
  return getProceduralEarthPBRTextures().cloudsMap;
}

/**
 * 2048x1024 High-Resolution Mars PBR Texture Set
 */
export function getProceduralMarsPBRTextures() {
  if (cachedMarsTexture && cachedMarsBumpMap && cachedMarsRoughnessMap) {
    return {
      map: cachedMarsTexture,
      bumpMap: cachedMarsBumpMap,
      roughnessMap: cachedMarsRoughnessMap,
    };
  }

  const w = 2048;
  const h = 1024;
  const toX = (lon: number) => ((lon + 180) / 360) * w;
  const toY = (lat: number) => ((90 - lat) / 180) * h;

  // 1. Color Map
  const cCanvas = document.createElement('canvas');
  cCanvas.width = w;
  cCanvas.height = h;
  const cCtx = cCanvas.getContext('2d')!;

  const grad = cCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#662808');
  grad.addColorStop(0.25, '#8c2e0b');
  grad.addColorStop(0.5, '#b93809');
  grad.addColorStop(0.75, '#8c2e0b');
  grad.addColorStop(1, '#662808');
  cCtx.fillStyle = grad;
  cCtx.fillRect(0, 0, w, h);

  // Dark Basaltic Albedo (Syrtis Major & Acidalia)
  cCtx.fillStyle = '#3f1807';
  cCtx.beginPath();
  cCtx.ellipse(toX(70), toY(10), toX(30) - toX(0), toY(0) - toY(20), -0.25, 0, Math.PI * 2);
  cCtx.ellipse(toX(-35), toY(48), toX(42) - toX(0), toY(0) - toY(18), 0.12, 0, Math.PI * 2);
  cCtx.fill();

  // Valles Marineris Canyon
  cCtx.strokeStyle = '#220b02';
  cCtx.lineWidth = 10;
  cCtx.lineCap = 'round';
  cCtx.beginPath();
  cCtx.moveTo(toX(-95), toY(-12));
  cCtx.bezierCurveTo(toX(-75), toY(-14), toX(-55), toY(-10), toX(-30), toY(-16));
  cCtx.stroke();

  // Olympus Mons & Tharsis Volcanoes
  cCtx.fillStyle = '#a1420b';
  cCtx.beginPath();
  cCtx.arc(toX(-133), toY(18), 24, 0, Math.PI * 2);
  cCtx.fill();
  cCtx.fillStyle = '#3a1304';
  cCtx.beginPath();
  cCtx.arc(toX(-133), toY(18), 8, 0, Math.PI * 2);
  cCtx.fill();

  // White CO2 Polar Ice Caps
  cCtx.fillStyle = '#f8fafc';
  cCtx.beginPath();
  cCtx.ellipse(w / 2, toY(86), w * 0.45, toY(0) - toY(10), 0, 0, Math.PI * 2);
  cCtx.fill();
  cCtx.beginPath();
  cCtx.ellipse(w / 2, toY(-86), w * 0.4, toY(0) - toY(9), 0, 0, Math.PI * 2);
  cCtx.fill();

  const cTex = new THREE.CanvasTexture(cCanvas);
  cTex.wrapS = THREE.RepeatWrapping;
  cTex.wrapT = THREE.ClampToEdgeWrapping;
  cachedMarsTexture = cTex;

  // 2. Bump Map
  const bCanvas = document.createElement('canvas');
  bCanvas.width = w;
  bCanvas.height = h;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#666666';
  bCtx.fillRect(0, 0, w, h);

  bCtx.strokeStyle = '#000000';
  bCtx.lineWidth = 14;
  bCtx.beginPath();
  bCtx.moveTo(toX(-95), toY(-12));
  bCtx.bezierCurveTo(toX(-75), toY(-14), toX(-55), toY(-10), toX(-30), toY(-16));
  bCtx.stroke();

  bCtx.fillStyle = '#ffffff';
  bCtx.beginPath();
  bCtx.arc(toX(-133), toY(18), 24, 0, Math.PI * 2);
  bCtx.fill();

  for (let i = 0; i < 60; i++) {
    const cx = (i * 59) % w;
    const cy = toY(-55 + ((i * 31) % 110));
    bCtx.strokeStyle = '#ffffff';
    bCtx.lineWidth = 2.5;
    bCtx.beginPath();
    bCtx.arc(cx, cy, 4 + (i % 12), 0, Math.PI * 2);
    bCtx.stroke();
    bCtx.fillStyle = '#222222';
    bCtx.beginPath();
    bCtx.arc(cx, cy, 3 + (i % 10), 0, Math.PI * 2);
    bCtx.fill();
  }

  const bTex = new THREE.CanvasTexture(bCanvas);
  bTex.wrapS = THREE.RepeatWrapping;
  bTex.wrapT = THREE.ClampToEdgeWrapping;
  cachedMarsBumpMap = bTex;

  // 3. Roughness Map
  const rCanvas = document.createElement('canvas');
  rCanvas.width = w;
  rCanvas.height = h;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#bbbbbb';
  rCtx.fillRect(0, 0, w, h);
  rCtx.fillStyle = '#444444';
  rCtx.beginPath();
  rCtx.ellipse(toX(70), toY(10), toX(30) - toX(0), toY(0) - toY(20), -0.25, 0, Math.PI * 2);
  rCtx.fill();

  const rTex = new THREE.CanvasTexture(rCanvas);
  rTex.wrapS = THREE.RepeatWrapping;
  rTex.wrapT = THREE.ClampToEdgeWrapping;
  cachedMarsRoughnessMap = rTex;

  return { map: cTex, bumpMap: bTex, roughnessMap: rTex };
}

export function getProceduralMarsTexture(): THREE.CanvasTexture {
  return getProceduralMarsPBRTextures().map;
}

/**
 * Procedural Crinkled Gold Kapton MLI Thermal Blanket Textures
 */
export function getProceduralGoldMLITextures() {
  if (cachedGoldMLIBump && cachedGoldMLIRoughness) {
    return { bumpMap: cachedGoldMLIBump, roughnessMap: cachedGoldMLIRoughness };
  }

  const size = 512;
  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 12 + Math.random() * 30;
    const angle = Math.random() * Math.PI * 2;
    bCtx.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#111111';
    bCtx.lineWidth = 1 + Math.random() * 2;
    bCtx.beginPath();
    bCtx.moveTo(x, y);
    bCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    bCtx.stroke();
  }

  const bTex = new THREE.CanvasTexture(bCanvas);
  bTex.wrapS = THREE.RepeatWrapping;
  bTex.wrapT = THREE.RepeatWrapping;
  bTex.repeat.set(4, 4);
  cachedGoldMLIBump = bTex;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#454545';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 200; i++) {
    rCtx.fillStyle = Math.random() > 0.5 ? '#606060' : '#303030';
    rCtx.fillRect(Math.random() * size, Math.random() * size, 8, 8);
  }

  const rTex = new THREE.CanvasTexture(rCanvas);
  rTex.wrapS = THREE.RepeatWrapping;
  rTex.wrapT = THREE.RepeatWrapping;
  rTex.repeat.set(4, 4);
  cachedGoldMLIRoughness = rTex;

  return { bumpMap: bTex, roughnessMap: rTex };
}

/**
 * Procedural Rocket Fuselage PBR Textures (Panels, Seams, Stringers)
 */
export function getProceduralFuselagePBRTextures() {
  if (cachedFuselageMap && cachedFuselageBump && cachedFuselageRoughness) {
    return {
      map: cachedFuselageMap,
      bumpMap: cachedFuselageBump,
      roughnessMap: cachedFuselageRoughness,
    };
  }

  const size = 512;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d')!;
  cCtx.fillStyle = '#f8fafc';
  cCtx.fillRect(0, 0, size, size);

  cCtx.strokeStyle = '#e2e8f0';
  cCtx.lineWidth = 1.5;
  for (let y = 64; y < size; y += 64) {
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.lineTo(size, y);
    cCtx.stroke();
  }
  for (let x = 128; x < size; x += 128) {
    cCtx.beginPath();
    cCtx.moveTo(x, 0);
    cCtx.lineTo(x, size);
    cCtx.stroke();
  }

  const cTex = new THREE.CanvasTexture(cCanvas);
  cTex.wrapS = THREE.RepeatWrapping;
  cTex.wrapT = THREE.RepeatWrapping;
  cachedFuselageMap = cTex;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  bCtx.strokeStyle = '#333333';
  bCtx.lineWidth = 2;
  for (let y = 64; y < size; y += 64) {
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(size, y);
    bCtx.stroke();
  }
  for (let x = 128; x < size; x += 128) {
    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.lineTo(x, size);
    bCtx.stroke();
  }

  const bTex = new THREE.CanvasTexture(bCanvas);
  bTex.wrapS = THREE.RepeatWrapping;
  bTex.wrapT = THREE.RepeatWrapping;
  cachedFuselageBump = bTex;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#707070';
  rCtx.fillRect(0, 0, size, size);

  const rTex = new THREE.CanvasTexture(rCanvas);
  rTex.wrapS = THREE.RepeatWrapping;
  rTex.wrapT = THREE.RepeatWrapping;
  cachedFuselageRoughness = rTex;

  return { map: cTex, bumpMap: bTex, roughnessMap: rTex };
}

/**
 * Procedural Launch Pad FLP Texture
 */
export function getProceduralPadTexture(): THREE.CanvasTexture {
  if (cachedPadTexture) return cachedPadTexture;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4b5563';
  ctx.fillRect(0, 0, size, size);

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

  const flameGrad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, 120);
  flameGrad.addColorStop(0, '#111827');
  flameGrad.addColorStop(0.4, '#1f2937');
  flameGrad.addColorStop(0.8, '#374151');
  flameGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 14;
  ctx.strokeStyle = '#eab308';
  ctx.strokeRect(20, 20, size - 40, size - 40);

  ctx.strokeStyle = '#1e293b';
  ctx.setLineDash([14, 14]);
  ctx.strokeRect(20, 20, size - 40, size - 40);
  ctx.setLineDash([]);

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

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const stripeH = 28;
  const stripeY = 160;

  // Saffron
  ctx.fillStyle = '#ff9933';
  ctx.fillRect(0, stripeY, width, stripeH);

  // White
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, stripeY + stripeH, width, stripeH);

  // Ashoka Chakra Navy Dot
  ctx.fillStyle = '#000088';
  ctx.beginPath();
  ctx.arc(width / 2, stripeY + stripeH + stripeH / 2, 8, 0, Math.PI * 2);
  ctx.fill();

  // Green
  ctx.fillStyle = '#138808';
  ctx.fillRect(0, stripeY + stripeH * 2, width, stripeH);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ISRO', width / 2, 290);

  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#ea580c';
  ctx.fillText('INDIA', width / 2, 345);

  const texture = new THREE.CanvasTexture(canvas);
  cachedRocketDecal = texture;
  return texture;
}

/**
 * Procedural Solar Panel Texture
 */
export function getProceduralSolarPanelTexture(): THREE.CanvasTexture {
  if (cachedSolarPanelTexture) return cachedSolarPanelTexture;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#030d22';
  ctx.fillRect(0, 0, size, size);

  const cellSize = 32;
  for (let x = 0; x < size; x += cellSize) {
    for (let y = 0; y < size; y += cellSize) {
      const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
      grad.addColorStop(0, '#0a235c');
      grad.addColorStop(1, '#051336');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      // Silver busbars
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
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
 * Procedural C-band SAR Radar Phased Array Texture
 */
export function getProceduralRadarTexture(): THREE.CanvasTexture {
  if (cachedRadarTexture) return cachedRadarTexture;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1;

  const patchSize = 18;
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

export function getProceduralSunTexture(): THREE.CanvasTexture {
  return createSunTextureCanvas();
}

function createSunTextureCanvas(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.5, '#f59e0b');
  grad.addColorStop(0.85, '#ea580c');
  grad.addColorStop(1, '#991b1b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let g = 0; g < 300; g++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(254, 240, 138, 0.4)' : 'rgba(217, 119, 6, 0.3)';
    ctx.beginPath();
    ctx.arc(gx, gy, 2 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Custom GLSL Shader for Animated Solar Plasma with FBM Noise & Limb Darkening
 */
export function createSunShaderMaterial(): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec3 p = normalize(vPosition) * 3.5;
      float t = uTime * 0.15;
      
      float n1 = snoise(p + vec3(t * 0.4, t * 0.2, t * 0.3));
      float n2 = snoise(p * 2.2 - vec3(t * 0.6, t * 0.4, 0.0));
      float n3 = snoise(p * 4.5 + vec3(0.0, t * 0.8, t * 0.5));
      float plasma = n1 * 0.55 + n2 * 0.3 + n3 * 0.15;

      float rim = dot(vNormal, vec3(0.0, 0.0, 1.0));
      rim = max(0.0, rim);
      float limb = pow(rim, 0.6);

      vec3 colCore = vec3(1.0, 0.98, 0.82);
      vec3 colMid  = vec3(0.98, 0.62, 0.04);
      vec3 colRim  = vec3(0.85, 0.12, 0.05);

      vec3 finalCol = mix(colMid, colCore, plasma * 0.6 + 0.3);
      finalCol = mix(colRim, finalCol, limb);

      if (plasma < -0.45) {
        finalCol *= 0.35;
      }

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  });
}

/**
 * Custom GLSL Fresnel Atmosphere Rayleigh Scatter Shader
 */
export function createAtmosphereShaderMaterial(
  color = '#38bdf8',
  coefficient = 0.65,
  power = 3.0
): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vEyeVec;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vEyeVec = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uCoefficient;
    uniform float uPower;
    varying vec3 vNormal;
    varying vec3 vEyeVec;

    void main() {
      float dotVal = max(0.0, dot(vEyeVec, vNormal));
      float intensity = pow(1.0 - dotVal, uPower) * uCoefficient;
      gl_FragColor = vec4(uColor, intensity);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uCoefficient: { value: coefficient },
      uPower: { value: power },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/**
 * Custom GLSL Rocket Exhaust Flame Shader (Turbulent noise + Mach diamonds)
 */
export function createRocketPlumeShaderMaterial(
  coreColor = '#fed7aa',
  flameColor = '#ea580c',
  outerColor = '#38bdf8'
): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uCoreColor;
    uniform vec3 uFlameColor;
    uniform vec3 uOuterColor;
    uniform float uMachStrength;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      float y = vUv.y;
      float t = uTime * 22.0;
      float noise = sin(y * 35.0 - t) * 0.25 + cos(vUv.x * 20.0 + t * 0.5) * 0.15;
      
      float mach = sin(y * 32.0) * 0.5 + 0.5;
      mach = pow(mach, 4.0) * uMachStrength * (1.0 - y);

      vec3 col = mix(uCoreColor, uFlameColor, y);
      col = mix(col, uOuterColor, pow(y, 1.8));
      col += vec3(mach * 0.8);

      float alpha = (1.0 - y) * (0.8 + noise * 0.3);
      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(col, alpha);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCoreColor: { value: new THREE.Color(coreColor) },
      uFlameColor: { value: new THREE.Color(flameColor) },
      uOuterColor: { value: new THREE.Color(outerColor) },
      uMachStrength: { value: 0.8 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}
