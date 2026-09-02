gsap.registerPlugin(ScrollTrigger);

// 1. Lenis Smooth Scroll Engine
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

// 2. Scene Graph, Camera & WebGL Renderer
const container = document.getElementById('webgl-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0b0c);
scene.fog = new THREE.FogExp2(0x0a0b0c, 0.03);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.8, 8.5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// 3. Studio Lighting Rig
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
keyLight.position.set(6, 12, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.bias = -0.0001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x88b0ff, 1.5);
fillLight.position.set(-8, 4, -6);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
rimLight.position.set(0, 6, -8);
scene.add(rimLight);

// 4. Procedural Terrain Mesh
function createProceduralTerrain() {
  const width = 80;
  const height = 80;
  const segments = 50;
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const slope = (z * -0.22) + (x * 0.06);
    const noise = Math.sin(x * 0.25) * Math.cos(z * 0.25) * 0.8 +
                  Math.sin(x * 0.6 + z * 0.4) * 0.3;
    pos.setY(i, slope + noise);
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x141619,
    roughness: 0.92,
    metalness: 0.08,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.position.set(0, -1.4, -4);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  return terrainMesh;
}

createProceduralTerrain();

// 5. Load Real Car Model ('car.glb')
const carGroup = new THREE.Group();
scene.add(carGroup);

const gltfLoader = new THREE.GLTFLoader();

gltfLoader.load(
  'car.glb',
  (gltf) => {
    const carModel = gltf.scene;

    // Enable dynamic shadow reception and casting on all model meshes
    carModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.envMapIntensity = 1.4;
        }
      }
    });

    // Auto-center and normalize size so any car model fits well
    const box = new THREE.Box3().setFromObject(carModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    carModel.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 4.2 / maxDim;
    carModel.scale.setScalar(scaleFactor);

    carGroup.add(carModel);

    // Initial stance parked on the slope
    carGroup.position.set(0.3, 0.1, 0);
    carGroup.rotation.set(-0.16, 0.58, 0.09);

    // Hide the loading spinner screen
    const loaderScreen = document.getElementById('loader-screen');
    if (loaderScreen) {
      loaderScreen.classList.add('hidden');
    }

    // Initialize Scroll Animations
    setupScrollAnimations();
  },
  undefined,
  (error) => {
    console.error('Error loading car.glb. Please check that car.glb exists in the root folder.', error);
    const loaderScreen = document.getElementById('loader-screen');
    if (loaderScreen) {
      loaderScreen.classList.add('hidden');
    }
    setupScrollAnimations();
  }
);

// 6. GSAP Scroll Choreography
function setupScrollAnimations() {
  const masterTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '#smooth-scroll-content',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.4,
    },
  });

  masterTimeline
    // --- Step 1: Suspension Focus ---
    .to(camera.position, { x: -3.0, y: 1.2, z: 5.2, ease: 'power1.inOut' }, 0)
    .to(carGroup.rotation, { x: -0.22, y: 0.95, z: 0.14, ease: 'power1.inOut' }, 0)
    .to(carGroup.position, { x: 0.9, y: 0.35, z: 0.4, ease: 'power1.inOut' }, 0)

    .to('#card-suspension-front', { opacity: 1, y: 0, duration: 0.2 }, 0.18)
    .to('#card-suspension-rear', { opacity: 1, y: 0, duration: 0.2 }, 0.22)

    .to('#card-suspension-front', { opacity: 0, y: -25, duration: 0.15 }, 0.36)
    .to('#card-suspension-rear', { opacity: 0, y: -25, duration: 0.15 }, 0.36)

    // --- Step 2: Cockpit / Interior Focus ---
    .to(camera.position, { x: 1.2, y: 1.5, z: 3.4, ease: 'power2.inOut' }, 0.42)
    .to(carGroup.rotation, { x: 0.0, y: 1.6, z: 0.0, ease: 'power2.inOut' }, 0.42)
    .to(carGroup.position, { x: -0.8, y: 0.2, z: 0.6, ease: 'power2.inOut' }, 0.42)

    .to('#card-cockpit', { opacity: 1, y: 0, duration: 0.2 }, 0.48)
    .to('#card-cockpit', { opacity: 0, y: -25, duration: 0.15 }, 0.62)

    // --- Step 3: Topographical Incline Ascent ---
    .to(camera.position, { x: 3.6, y: 2.2, z: 5.8, ease: 'power2.inOut' }, 0.68)
    .to(carGroup.rotation, { x: -0.32, y: -0.55, z: -0.05, ease: 'power2.inOut' }, 0.68)
    .to(carGroup.position, { x: -0.6, y: 0.6, z: -0.2, ease: 'power2.inOut' }, 0.68)

    // --- Step 4: Wide Specs Grid Alignment ---
    .to(camera.position, { x: 0, y: 2.4, z: 8.8, ease: 'power1.inOut' }, 1.0)
    .to(carGroup.rotation, { x: -0.04, y: 0.0, z: 0.0, ease: 'power1.inOut' }, 1.0)
    .to(carGroup.position, { x: 0, y: 0.0, z: 0.0, ease: 'power1.inOut' }, 1.0);
}

// 7. Mouse & Touch Parallax
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

  camera.position.x += mouseX * 0.015;
  camera.position.y += -mouseY * 0.015;

  renderer.render(scene, camera);
}

animate();

// 9. Resize Handling
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  ScrollTrigger.refresh();
});
