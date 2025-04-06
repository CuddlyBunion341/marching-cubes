import * as THREE from 'three';
import { TerrainRenderer } from './terrain/TerrainRenderer';

const scene = new THREE.Scene();
// Add fog to the scene for a more seamless world
scene.fog = new THREE.FogExp2(0x87CEEB, 0.01); // Sky blue color with exponential fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Setup lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Setup terrain
let terrainRenderer: TerrainRenderer | null = null;

// Replace controls type with a simple flight mode toggle
let flightModeEnabled = true;
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

// Add optimization variables
let raycastThrottleMs = 16; // About 60fps
let lastRaycastTime = 0;
let pendingRaycast = false;
let moveEvent: MouseEvent | null = null;

// Add variables for tracking camera movement
let lastCameraPosition = new THREE.Vector3();
let chunkUpdateDistance = 10; // Distance the camera needs to move before updating chunks

// Add key state tracking for flight controls
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
  space: false,
  q: false,
  e: false,
  r: false
};

// Flight control variables
let moveSpeed = 0.5;
let runSpeed = 1.5;
let rotateSpeed = 0.02;

// Mouse movement for camera rotation
let pitchObject = new THREE.Object3D();
let yawObject = new THREE.Object3D();
yawObject.add(pitchObject);

// Initialize pitch/yaw rotation values
let pitch = 0;
let yaw = 0;

// Performance settings
function updatePerformanceSettings() {
  if (!terrainRenderer) return;
  
  // Get performance mode from terrain renderer
  const mode = (terrainRenderer as any).performanceMode;
  
  if (mode === 'high') {
    raycastThrottleMs = 100; // Slower updates (10fps)
  } else if (mode === 'medium') {
    raycastThrottleMs = 33; // Medium updates (30fps)
  } else if (mode === 'low') {
    raycastThrottleMs = 16; // Fast updates (60fps)
  }
}

// Performance monitoring
let fpsHistory: number[] = [];
let lastPerformanceCheck = 0;
let performanceCheckInterval = 5000; // Check every 5 seconds
let lastFrameTime = 0;

function monitorPerformance() {
  const now = performance.now();
  
  // Calculate current FPS
  if (lastFrameTime > 0) {
    const deltaTime = now - lastFrameTime;
    const currentFPS = 1000 / deltaTime;
    
    // Only track FPS when editing is happening
    if (isMouseDown) {
      fpsHistory.push(currentFPS);
      
      // Keep history to last 60 frames
      if (fpsHistory.length > 60) {
        fpsHistory.shift();
      }
    }
    
    // Check performance periodically
    if (now - lastPerformanceCheck > performanceCheckInterval) {
      lastPerformanceCheck = now;
      
      // Only adjust if we have enough data and we're actively editing
      if (fpsHistory.length > 30 && terrainRenderer) {
        const avgFPS = fpsHistory.reduce((sum, fps) => sum + fps, 0) / fpsHistory.length;
        
        // Calculate a performance rating between 0 and 1
        // Assuming 60 FPS is optimal and 10 FPS is terrible
        const performanceRating = Math.min(1, Math.max(0, (avgFPS - 10) / 50));
        
        // Adjust settings based on performance rating
        terrainRenderer.adjustRenderDistance(performanceRating);
        
        // Show debug info
        if (debugInfoEnabled) {
          updateDebugInfo(avgFPS, performanceRating);
        }
        
        // Reset history after adjusting
        fpsHistory = [];
      }
    }
  }
  
  lastFrameTime = now;
}

// Add a debug info display
let debugInfoEnabled = false;
let debugInfoElement: HTMLElement | null = null;

function toggleDebugInfo() {
  debugInfoEnabled = !debugInfoEnabled;
  
  if (debugInfoEnabled) {
    if (!debugInfoElement) {
      debugInfoElement = document.createElement('div');
      debugInfoElement.style.position = 'absolute';
      debugInfoElement.style.top = '10px';
      debugInfoElement.style.right = '10px';
      debugInfoElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
      debugInfoElement.style.color = 'white';
      debugInfoElement.style.padding = '10px';
      debugInfoElement.style.borderRadius = '5px';
      debugInfoElement.style.fontFamily = 'monospace';
      debugInfoElement.style.fontSize = '12px';
      debugInfoElement.style.zIndex = '1000';
      
      if (renderer) {
        renderer.domElement.parentElement?.appendChild(debugInfoElement);
      }
    }
    updateDebugInfo(0, 0);
  } else if (debugInfoElement && debugInfoElement.parentElement) {
    debugInfoElement.parentElement.removeChild(debugInfoElement);
  }
}

function updateDebugInfo(fps: number, performanceRating: number) {
  if (!debugInfoElement || !terrainRenderer) return;
  
  const chunkCount = terrainRenderer.getChunkCount();
  const workerCount = terrainRenderer.getWorkerCount();
  const queueSize = terrainRenderer.getQueueSize();
  const renderDistance = (terrainRenderer as any).options.renderDistance;
  const performanceMode = (terrainRenderer as any).performanceMode;
  
  debugInfoElement.innerHTML = `
    <div>FPS: ${fps.toFixed(1)}</div>
    <div>Performance: ${(performanceRating * 100).toFixed(0)}%</div>
    <div>Mode: ${performanceMode}</div>
    <div>Render Distance: ${renderDistance}</div>
    <div>Chunk Count: ${chunkCount}</div>
    <div>Workers: ${workerCount}</div>
    <div>Queue Size: ${queueSize}</div>
  `;
}

// Show a brief notification to the user
function showPerformanceNotification(message: string) {
  if (!renderer) return;
  
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.position = 'absolute';
  notification.style.bottom = '50px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = 'rgba(0,0,0,0.7)';
  notification.style.color = 'white';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.fontFamily = 'Arial, sans-serif';
  notification.style.fontSize = '14px';
  notification.style.zIndex = '1000';
  
  renderer.domElement.parentElement?.appendChild(notification);
  
  // Remove after a few seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.parentElement.removeChild(notification);
    }
  }, 3000);
}

function animate() {
  if (renderer) {
    renderer.render(scene, camera);
  }

  // Handle flight controls movement
  if (flightModeEnabled && camera) {
    // Apply flight movement based on key states
    const speed = keys.shift ? runSpeed : moveSpeed;
    
    // Get forward/right directions from camera matrix
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    // Apply movement
    if (keys.w) camera.position.addScaledVector(forward, speed);
    if (keys.s) camera.position.addScaledVector(forward, -speed);
    if (keys.a) camera.position.addScaledVector(right, -speed);
    if (keys.d) camera.position.addScaledVector(right, speed);
    if (keys.space) camera.position.y += speed;
    if (keys.q) camera.position.y -= speed;
    
    // Additional rotation with e and q keys
    if (keys.e) camera.rotateY(-rotateSpeed);
    if (keys.r) camera.rotateY(rotateSpeed);
  }
  
  // Update chunks when camera moves significantly
  if (terrainRenderer && camera) {
    // Check if camera has moved enough to update chunks
    if (lastCameraPosition.distanceTo(camera.position) > chunkUpdateDistance) {
      updateChunksAroundCamera();
      lastCameraPosition.copy(camera.position);
    }
  }
  
  // Monitor performance
  monitorPerformance();
  
  // Update raycast on mouse move when pressed - but throttled
  if (isMouseDown && terrainRenderer && terrainRenderer.terrainMesh && moveEvent) {
    const currentTime = performance.now();
    if (currentTime - lastRaycastTime >= raycastThrottleMs) {
      lastRaycastTime = currentTime;
      updateMousePosition(moveEvent);
      updateRaycasting();
      moveEvent = null; // Clear the event after processing
    }
  }
}

// Handle mouse events
function onMouseDown(event: MouseEvent) {
  if (!terrainRenderer || !terrainRenderer.terrainMesh) return;
  
  isMouseDown = true;
  lastRaycastPoint = null; // Reset last point when starting a new stroke
  updateMousePosition(event);
  updateRaycasting();
}

function onMouseMove(event: MouseEvent) {
  // Just store the latest move event, will be processed in animate
  moveEvent = event;
  
  // Always update the mouse position for raycasting indicator
  updateMousePosition(event);
  
  // But only schedule raycasting if mouse is down and not already pending
  if (isMouseDown && !pendingRaycast) {
    scheduleRaycast();
  }
}

function scheduleRaycast() {
  if (pendingRaycast) return;
  
  const currentTime = performance.now();
  const elapsed = currentTime - lastRaycastTime;
  
  if (elapsed >= raycastThrottleMs) {
    // Do it immediately
    updateRaycasting();
    lastRaycastTime = currentTime;
  } else {
    // Schedule it
    pendingRaycast = true;
    setTimeout(() => {
      pendingRaycast = false;
      if (isMouseDown && moveEvent) {
        updateMousePosition(moveEvent);
        updateRaycasting();
        lastRaycastTime = performance.now();
      }
    }, raycastThrottleMs - elapsed);
  }
}

function onMouseUp() {
  isMouseDown = false;
}

function onKeyDown(event: KeyboardEvent) {
  // Update key states for flight controls
  switch(event.key.toLowerCase()) {
    case 'w': keys.w = true; break;
    case 'a': keys.a = true; break;
    case 's': keys.s = true; break;
    case 'd': keys.d = true; break;
    case 'shift': keys.shift = true; break;
    case ' ': keys.space = true; break;
    case 'q': keys.q = true; break;
    case 'e': keys.e = true; break;
    case 'r': keys.r = true; break;
  }
  
  if (event.key === "Shift") {
    isShiftDown = true;
    editMode = "remove";
  }
  
  // Toggle debug info with F3 key
  if (event.key === "F3") {
    toggleDebugInfo();
  }
  
  // Additional key controls for chunk system
  if (terrainRenderer) {
    // Get access to the chunk manager
    const chunkManager = (terrainRenderer as any).chunkManager;
    
    switch (event.key) {
      case '+': // Increase render distance
        if (chunkManager) {
          const currentDistance = (terrainRenderer as any).options.renderDistance;
          const newDistance = Math.min(10, currentDistance + 1);
          (terrainRenderer as any).options.renderDistance = newDistance;
          chunkManager.setRenderDistance(newDistance);
          showNotification(`Render distance: ${newDistance}`);
        }
        break;
        
      case '-': // Decrease render distance
        if (chunkManager) {
          const currentDistance = (terrainRenderer as any).options.renderDistance;
          const newDistance = Math.max(1, currentDistance - 1);
          (terrainRenderer as any).options.renderDistance = newDistance;
          chunkManager.setRenderDistance(newDistance);
          showNotification(`Render distance: ${newDistance}`);
        }
        break;
        
      case 'p': // Toggle performance mode
        const currentMode = (terrainRenderer as any).performanceMode;
        let newMode;
        if (currentMode === 'high') newMode = 'medium';
        else if (currentMode === 'medium') newMode = 'low';
        else newMode = 'high';
        
        (terrainRenderer as any).setPerformanceMode(newMode);
        updatePerformanceSettings();
        showNotification(`Performance mode: ${newMode}`);
        break;
        
      case 'c': // Toggle chunk mode
        (terrainRenderer as any).options.useChunks = !(terrainRenderer as any).options.useChunks;
        terrainRenderer.regenerate(scene);
        showNotification(`Chunk mode: ${(terrainRenderer as any).options.useChunks ? 'ON' : 'OFF'}`);
        break;
    }
  }
}

function onKeyUp(event: KeyboardEvent) {
  // Update key states for flight controls
  switch(event.key.toLowerCase()) {
    case 'w': keys.w = false; break;
    case 'a': keys.a = false; break;
    case 's': keys.s = false; break;
    case 'd': keys.d = false; break;
    case 'shift': keys.shift = false; break;
    case ' ': keys.space = false; break;
    case 'q': keys.q = false; break;
    case 'e': keys.e = false; break;
    case 'r': keys.r = false; break;
  }
  
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
  let intersects;
  
  // Chunked terrain will be a Group, monolithic will be a Mesh
  if (terrainRenderer.terrainMesh instanceof THREE.Group) {
    // Raycast against all children in the group (chunks)
    const chunks = terrainRenderer.terrainMesh.children;
    intersects = [];
    
    for (const chunk of chunks) {
      // Only raycast against visible chunks for performance
      if (chunk.visible) {
        const chunkIntersects = raycaster.intersectObject(chunk);
        if (chunkIntersects.length > 0) {
          intersects.push(...chunkIntersects);
        }
      }
    }
    
    // Sort intersections by distance
    if (intersects.length > 1) {
      intersects.sort((a, b) => a.distance - b.distance);
    }
  } else {
    // Monolithic terrain - just raycast against the single mesh
    intersects = raycaster.intersectObject(terrainRenderer.terrainMesh);
  }
  
  if (intersects && intersects.length > 0) {
    // Get the point of intersection
    const point = intersects[0].point;
    
    // Remove orbit control check since we're not using orbit controls
    // Don't modify terrain repeatedly at the same position
    // Use a distance threshold based on brush size for better performance
    const minMoveDistance = terrainRenderer.getBrushSize() * 0.2;
    if (lastRaycastPoint && point.distanceTo(lastRaycastPoint) < minMoveDistance) return;
    
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

// Update chunks around the camera position
function updateChunksAroundCamera() {
  if (!terrainRenderer) return;
  
  // Access the chunk manager through the terrain renderer
  const chunkManager = (terrainRenderer as any).chunkManager;
  if (chunkManager) {
    // Generate chunks around camera position
    chunkManager.generateChunksAroundPosition(camera.position);
  }
}

// Show a simple notification
function showNotification(message: string) {
  if (!renderer) return;
  
  // Remove any existing notification
  const existingNotification = document.getElementById('terrain-notification');
  if (existingNotification && existingNotification.parentElement) {
    existingNotification.parentElement.removeChild(existingNotification);
  }
  
  // Create new notification
  const notification = document.createElement('div');
  notification.id = 'terrain-notification';
  notification.textContent = message;
  notification.style.position = 'absolute';
  notification.style.bottom = '100px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = 'rgba(0,0,0,0.7)';
  notification.style.color = 'white';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.fontFamily = 'Arial, sans-serif';
  notification.style.fontSize = '14px';
  notification.style.zIndex = '1001';
  
  renderer.domElement.parentElement?.appendChild(notification);
  
  // Remove after a few seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.parentElement.removeChild(notification);
    }
  }, 2000);
}

export function setupRenderer(container: HTMLElement) {
  if (renderer) {
    container.removeChild(renderer.domElement);
    renderer.dispose();
  }

  // Create WebGL renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  // Set background color to match fog color for seamless transition
  renderer.setClearColor(0x87CEEB, 1);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  // Set up flight controls instead of orbit controls
  flightModeEnabled = true;
  
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
    },
    // Add chunk options
    useChunks: true,
    chunkSize: 20,
    chunkResolution: 24,
    renderDistance: 4
  });

  // Setup custom flight controls
  // Hide the cursor in flight mode for better FPS experience
  renderer.domElement.style.cursor = 'crosshair';
  
  // Lock pointer for FPS controls
  renderer.domElement.addEventListener('click', () => {
    if (renderer && renderer.domElement) {
      renderer.domElement.requestPointerLock();
    }
  });
  
  // Mouse movement for camera rotation
  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === renderer?.domElement && camera) {
      // Update yaw and pitch based on mouse movement
      yaw -= event.movementX * 0.002;
      pitch -= event.movementY * 0.002;
      
      // Clamp pitch to prevent camera flipping
      pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
      
      // Apply quaternion rotation to camera
      const qx = new THREE.Quaternion();
      qx.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
      
      const qy = new THREE.Quaternion();
      qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      
      const quaternion = new THREE.Quaternion();
      quaternion.multiplyQuaternions(qy, qx);
      
      camera.quaternion.copy(quaternion);
    }
  });

  // Initialize camera position tracking
  lastCameraPosition.copy(camera.position);
  
  // Create terrain and setup GUI
  if (terrainRenderer) {
    terrainRenderer.generate(scene);
    if (guiContainer) {
      terrainRenderer.setupGUI(guiContainer, scene);
    }
  }
  
  // Set initial performance settings
  updatePerformanceSettings();

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
  helpContainer.innerHTML = 'WASD: Move<br>' +
                           'Space: Up<br>' +
                           'Q: Down<br>' +
                           'E/R: Rotate<br>' +
                           'Shift: Run<br>' +
                           'Click: Add Terrain<br>' +
                           'Shift+Click: Remove Terrain<br>' +
                           '+/-: Increase/Decrease Render Distance<br>' +
                           'P: Cycle Performance Mode<br>' +
                           'C: Toggle Chunk Mode';
  container.appendChild(helpContainer);
}

