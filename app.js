gsap.registerPlugin(ScrollTrigger);

// 1. Lenis Smooth Scroll Configuration
const lenis = new Lenis({
  duration: 1.3,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 2.0,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// 2. Scene Graph and Renderer Setup
const container = document.getElementById('webgl-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0b0c);
scene.fog = new THREE.FogExp2(0x0a0b0c, 0.032);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.6, 7.8);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// 3. Studio Lighting Rig
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(6, 12, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 35;
keyLight.shadow.bias = -0.0001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x88b0ff, 1.4);
fillLight.position.set(-8, 3, -6);
scene.add(fillLight);

const underglowLight = new THREE.DirectionalLight(0xffecd0, 0.6);
underglowLight.position.set(0, -4, 4);
scene.add(underglowLight);

// 4. Procedural Mountain Incline Geometry
function createProceduralTerrain() {
  const width = 70;
  const height = 70;
  const segments = 48;
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const slope = (z * -0.24) + (x * 0.07);
    const proceduralNoise = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.75 +
                            Math.sin(x * 0.7 + z * 0.4) * 0.35;
    pos.setY(i, slope + proceduralNoise);
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x1c1f24,
    roughness: 0.88,
    metalness: 0.12,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.position.set(0, -1.2, -4);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  return terrainMesh;
}

const terrain = createProceduralTerrain();

// 5. Vehicle Hierarchy & Geometry Construction
const carGroup = new THREE.Group();
scene.add(carGroup);

function buildProceduralChassisProxy() {
  const glossBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f4f7,
    metalness: 0.9,
    roughness: 0.16,
    envMapIntensity: 1.4,
  });

  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f0f11,
    roughness: 0.6,
    metalness: 0.3,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x050608,
    transmission: 0.8,
    opacity: 1,
    transparent: true,
    roughness: 0.05,
    ior: 1.52,
  });

  // Main Monocoque / Body Box
  const bodyGeom = new THREE.BoxGeometry(1.85, 1.15, 3.9);
  const bodyMesh = new THREE.Mesh(bodyGeom, glossBodyMaterial);
  bodyMesh.position.y = 0.9;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  carGroup.add(bodyMesh);

  // Cabin Structure
  const cabinGeom = new THREE.BoxGeometry(1.65, 0.9, 2.3);
  const cabinMesh = new THREE.Mesh(cabinGeom, glossBodyMaterial);
  cabinMesh.position.set(0, 1.8, -0.3);
  cabinMesh.castShadow = true;
  carGroup.add(cabinMesh);

  // Greenhouse Glass
  const glassGeom = new THREE.BoxGeometry(1.67, 0.75, 2.1);
  const glassMesh = new THREE.Mesh(glassGeom, glassMaterial);
  glassMesh.position.set(0, 1.8, -0.3);
  carGroup.add(glassMesh);

  // Wheel Assemblies
  const wheelGeom = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 32);
  wheelGeom.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x151618,
    roughness: 0.95,
  });

  const wheelPositions = [
    [-1.0, 0.44, 1.25],
    [1.0, 0.44, 1.25],
    [-1.0, 0.44, -1.25],
    [1.0, 0.44, -1.25]
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    wheel.receiveShadow = true;
    carGroup.add(wheel);
  });
}

buildProceduralChassisProxy();

// Initial spatial configuration representing uphill grade stance
carGroup.position.set(0.35, 0.15, 0);
carGroup.rotation.set(-0.16, 0.58, 0.09);

// 6. GSAP Timeline Choreography
const masterTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: '#smooth-scroll-content',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.25,
  },
});

masterTimeline
  // Sequence 1: Frame Suspension Details
  .to(camera.position, {
    x: -2.8,
    y: 1.1,
    z: 5.0,
    ease: 'power1.inOut',
  }, 0)
  .to(carGroup.rotation, {
    x: -0.22,
    y: 0.9,
    z: 0.15,
    ease: 'power1.inOut',
  }, 0)
  .to(carGroup.position, {
    x: 0.9,
    y: 0.35,
    z: 0.4,
    ease: 'power1.inOut',
  }, 0)

  // Reveal Feature Callouts
  .to('#card-suspension-front', {
    opacity: 1,
    y: 0,
    duration: 0.3,
    ease: 'power2.out',
  }, 0.22)
  .to('#card-suspension-rear', {
    opacity: 1,
    y: 0,
    duration: 0.3,
    ease: 'power2.out',
  }, 0.32)

  // Sequence 2: Transition to Topographical Gradient Section
  .to('#card-suspension-front', { opacity: 0, y: -25, duration: 0.2 }, 0.58)
  .to('#card-suspension-rear', { opacity: 0, y: -25, duration: 0.2 }, 0.58)
  .to(camera.position, {
    x: 3.4,
    y: 2.4,
    z: 5.6,
    ease: 'power2.inOut',
  }, 0.62)
  .to(carGroup.rotation, {
    x: -0.34,
    y: -0.5,
    z: -0.06,
    ease: 'power2.inOut',
  }, 0.62)
  .to(carGroup.position, {
    x: -0.7,
    y: 0.65,
    z: -0.3,
    ease: 'power2.inOut',
  }, 0.62)

  // Sequence 3: Wide Specifications Alignment
  .to(camera.position, {
    x: 0,
    y: 2.6,
    z: 8.8,
    ease: 'power1.inOut',
  }, 1.0)
  .to(carGroup.rotation, {
    x: -0.04,
    y: 0.0,
    z: 0.0,
    ease: 'power1.inOut',
  }, 1.0)
  .to(carGroup.position, {
    x: 0,
    y: 0.0,
    z: 0.0,
    ease: 'power1.inOut',
  }, 1.0);

// 7. Mouse Micro-Interaction Mechanics
let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;

window.addEventListener('mousemove', (event) => {
  targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
  targetMouseY = (event.clientY / window.innerHeight - 0.5) * 2;
});

// 8. Dynamic Render Loop
function animate() {
  requestAnimationFrame(animate);

  mouseX += (targetMouseX - mouseX) * 0.05;
  mouseY += (targetMouseY - mouseY) * 0.05;

  camera.position.x += mouseX * 0.02;
  camera.position.y += -mouseY * 0.02;

  renderer.render(scene, camera);
}

animate();

// 9. Resize Lifecycle Management
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  ScrollTrigger.refresh();
});
