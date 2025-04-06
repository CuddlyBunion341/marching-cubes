import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TerrainRenderer } from './terrain/TerrainRenderer';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Setup lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Setup terrain
let terrainRenderer: TerrainRenderer | null = null;

let controls: OrbitControls | null = null;
camera.position.set(20, 20, 20);

let renderer: THREE.WebGLRenderer | null = null;
let guiContainer: HTMLElement | null = null;

function animate() {
  if (renderer) {
    renderer.render(scene, camera);
  }

  if (controls) {
    controls.update();
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

export function setupRenderer(container: HTMLElement) {
  if (renderer) {
    container.removeChild(renderer.domElement);
    renderer.dispose();
  }

  // Setup renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.setClearColor(0x87ceeb); // Sky blue background
  container.appendChild(renderer.domElement);

  // Setup controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Create or clear GUI container
  if (!guiContainer) {
    guiContainer = document.createElement('div');
    guiContainer.style.position = 'absolute';
    guiContainer.style.top = '0';
    guiContainer.style.right = '0';
    container.appendChild(guiContainer);
  }

  // Setup terrain
  if (terrainRenderer) {
    terrainRenderer.dispose();
  }

  terrainRenderer = new TerrainRenderer({
    resolution: 32,
    size: 50,
    material: new THREE.MeshPhongMaterial({
      color: 0x44aa88,
      shininess: 30,
      flatShading: true
    })
  });

  // Create terrain and setup GUI
  terrainRenderer.generate(scene);
  terrainRenderer.setupGUI(guiContainer);

  window.addEventListener('resize', onWindowResize);
}

