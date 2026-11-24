import * as THREE from 'three';

/**
 * Procedural HTML5 Canvas Texture Generators and Custom GLSL Shaders for Three.js
 * 100% browser-native & procedural — zero external image URLs or .glb files.
 */

// Caches for textures
let cachedEarthMap: THREE.Texture | null = null;
let cachedEarthSpecularMap: THREE.Texture | null = null;
let cachedEarthNormalMap: THREE.Texture | null = null;
let cachedCloudsMap: THREE.Texture | null = null;

let cachedMarsMap: THREE.Texture | null = null;
let cachedSunMap: THREE.Texture | null = null;

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
 * High-Resolution Planetary PBR Texture Sets loaded from local /textures/...
 */
export function getProceduralEarthPBRTextures() {
  if (cachedEarthMap && cachedEarthSpecularMap && cachedEarthNormalMap && cachedCloudsMap) {
    return {
      map: cachedEarthMap,
      specularMap: cachedEarthSpecularMap,
      roughnessMap: cachedEarthSpecularMap,
      normalMap: cachedEarthNormalMap,
      bumpMap: cachedEarthNormalMap,
      cloudsMap: cachedCloudsMap,
    };
  }

  const loader = new THREE.TextureLoader();

  const map = loader.load('/textures/earth_day.jpg');
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  cachedEarthMap = map;

  const spec = loader.load('/textures/earth_specular.jpg');
  spec.wrapS = THREE.RepeatWrapping;
  spec.wrapT = THREE.ClampToEdgeWrapping;
  cachedEarthSpecularMap = spec;

  const norm = loader.load('/textures/earth_normal.jpg');
  norm.wrapS = THREE.RepeatWrapping;
  norm.wrapT = THREE.ClampToEdgeWrapping;
  cachedEarthNormalMap = norm;

  const clouds = loader.load('/textures/earth_clouds.png');
  clouds.wrapS = THREE.RepeatWrapping;
  clouds.wrapT = THREE.ClampToEdgeWrapping;
  cachedCloudsMap = clouds;

  return {
    map,
    specularMap: spec,
    roughnessMap: spec,
    normalMap: norm,
    bumpMap: norm,
    cloudsMap: clouds,
  };
}

export function getProceduralEarthTexture(): THREE.Texture {
  return getProceduralEarthPBRTextures().map;
}

export function getProceduralCloudsTexture(): THREE.Texture {
  return getProceduralEarthPBRTextures().cloudsMap;
}

/**
 * High-Resolution Mars PBR Texture Set
 */
export function getProceduralMarsPBRTextures() {
  if (cachedMarsMap) {
    return {
      map: cachedMarsMap,
      bumpMap: cachedMarsMap,
      roughnessMap: cachedMarsMap,
    };
  }

  const loader = new THREE.TextureLoader();
  const map = loader.load('/textures/mars.jpg');
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  cachedMarsMap = map;

  return {
    map,
    bumpMap: map,
    roughnessMap: map,
  };
}

export function getProceduralMarsTexture(): THREE.Texture {
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

export function getProceduralSunTexture(): THREE.Texture {
  if (cachedSunMap) return cachedSunMap;
  const loader = new THREE.TextureLoader();
  const tex = loader.load('/textures/sun.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  cachedSunMap = tex;
  return tex;
}

/**
 * Custom GLSL Shader for Animated Solar Plasma with FBM Noise & Limb Darkening
 * Blends high-resolution photographic solar photosphere (/textures/sun.jpg) with procedural 3D plasma convection.
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
    uniform sampler2D uSunTexture;
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

      vec4 texColor = texture2D(uSunTexture, vUv);

      float rim = dot(vNormal, vec3(0.0, 0.0, 1.0));
      rim = max(0.0, rim);
      float limb = pow(rim, 0.6);

      vec3 colCore = vec3(1.0, 0.98, 0.82);
      vec3 colMid  = vec3(0.98, 0.62, 0.04);
      vec3 colRim  = vec3(0.85, 0.12, 0.05);

      vec3 dynamicCol = mix(colMid, colCore, plasma * 0.6 + 0.3);
      dynamicCol = mix(colRim, dynamicCol, limb);

      vec3 finalCol = mix(texColor.rgb, dynamicCol, 0.55);
      finalCol = mix(colRim, finalCol, limb);

      if (plasma < -0.45) {
        finalCol *= 0.4;
      }

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunTexture: { value: getProceduralSunTexture() },
    },
    vertexShader,
    fragmentShader,
  });
}

/**
 * Procedural GLSL Smooth Additive Sun Corona Glow Shader
 * Smooth Fresnel falloff fading strictly to alpha = 0.0 before the mesh silhouette.
 * Eliminates all concentric hard brown/tan circle rims.
 */
export function createSunCoronaShaderMaterial(
  innerColor = '#fef08a',
  outerColor = '#ea580c'
): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vEyeVec;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vEyeVec = normalize(-mvPosition.xyz);
      vUv = uv;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColorInner;
    uniform vec3 uColorOuter;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vEyeVec;
    varying vec2 vUv;

    void main() {
      float cosTheta = max(0.0, dot(vNormal, vEyeVec));
      float rim = 1.0 - cosTheta;
      float alpha = pow(rim, 3.2);
      float ripple = 0.92 + 0.08 * sin(uTime * 1.8 + vUv.x * 24.0);
      alpha *= ripple;
      vec3 color = mix(uColorInner, uColorOuter, pow(rim, 1.4));
      gl_FragColor = vec4(color * alpha, alpha * 0.72);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColorInner: { value: new THREE.Color(innerColor) },
      uColorOuter: { value: new THREE.Color(outerColor) },
      uTime: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
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
