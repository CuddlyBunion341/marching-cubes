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

// Add raycasting variables
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isMouseDown = false;
let isShiftDown = false;
let editMode = "add"; // "add" or "remove"
let lastRaycastPoint: THREE.Vector3 | null = null;
let raycastIndicator: THREE.Mesh | null = null;

function animate() {
  if (renderer) {
    renderer.render(scene, camera);
  }

  if (controls) {
    controls.update();
  }
  
  // Update raycast on mouse move when pressed
  if (isMouseDown && terrainRenderer && terrainRenderer.terrainMesh) {
    updateRaycasting();
  }
}

// Handle mouse events
function onMouseDown(event: MouseEvent) {
  if (!controls || !terrainRenderer || !terrainRenderer.terrainMesh) return;
  
  isMouseDown = true;
  updateMousePosition(event);
  updateRaycasting();
}

function onMouseMove(event: MouseEvent) {
  updateMousePosition(event);
}

function onMouseUp() {
  isMouseDown = false;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Shift") {
    isShiftDown = true;
    editMode = "remove";
  }
}

function onKeyUp(event: KeyboardEvent) {
  if (event.key === "Shift") {
    isShiftDown = false;
    editMode = "add";
  }
}

function updateMousePosition(event: MouseEvent) {
  // Calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  if (!renderer) return;
  
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateRaycasting() {
  if (!terrainRenderer || !terrainRenderer.terrainMesh || !renderer || !camera) return;
  
  // Update the raycaster with the current mouse position and camera
  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersections with the terrain
  const intersects = raycaster.intersectObject(terrainRenderer.terrainMesh);
  
  if (intersects.length > 0) {
    // Get the point of intersection
    const point = intersects[0].point;
    
    // Don't modify terrain if controls are being used (rotating/panning)
    if (controls && !controls.enableRotate) return;
    
    // Don't modify terrain repeatedly at the same position
    if (lastRaycastPoint && point.distanceTo(lastRaycastPoint) < 0.1) return;
    
    // Store last position
    lastRaycastPoint = point.clone();

    // Modify terrain
    terrainRenderer.modifyTerrain(point, editMode === "add");
    
    // Update indicator position
    updateRaycastIndicator(point);
  }
}

function updateRaycastIndicator(position: THREE.Vector3) {
  if (!terrainRenderer) return;
  
  // Create indicator if it doesn't exist
  if (!raycastIndicator) {
    const geometry = new THREE.SphereGeometry(terrainRenderer.getBrushSize(), 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    raycastIndicator = new THREE.Mesh(geometry, material);
    scene.add(raycastIndicator);
  }
  
  // Update indicator position and size
  raycastIndicator.position.copy(position);
  
  // Make sure size is up to date
  const currentSize = terrainRenderer.getBrushSize();
  if (raycastIndicator.geometry instanceof THREE.SphereGeometry &&
      raycastIndicator.geometry.parameters.radius !== currentSize) {
    raycastIndicator.geometry.dispose();
    raycastIndicator.geometry = new THREE.SphereGeometry(currentSize, 16, 16);
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
      flatShading: true,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0,
    }),
    marchingCubesOptions: {
      seamless: true,
      doubleSided: true,
      isoLevel: 0.0,
    }
  });

  // Create terrain and setup GUI
  terrainRenderer.generate(scene);
  terrainRenderer.setupGUI(guiContainer, scene);

  // Add event listeners for interaction
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  
  // Create help text
  const helpContainer = document.createElement('div');
  helpContainer.style.position = 'absolute';
  helpContainer.style.bottom = '10px';
  helpContainer.style.left = '10px';
  helpContainer.style.color = 'white';
  helpContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  helpContainer.style.padding = '10px';
  helpContainer.style.borderRadius = '5px';
  helpContainer.style.fontFamily = 'Arial, sans-serif';
  helpContainer.innerHTML = 'Click: Add Terrain<br>Shift+Click: Remove Terrain';
  container.appendChild(helpContainer);
}

