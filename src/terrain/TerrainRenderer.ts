import * as THREE from 'three';
import GUI from 'lil-gui';
import { NoiseGenerator, NoiseGeneratorOptions } from './NoiseGenerator';
import { MarchingCubes, MarchingCubesOptions } from './marchingCubes';
import { ChunkManager } from './ChunkManager';

export interface TerrainRendererOptions {
  resolution: number;
  size: number;
  material: THREE.Material;
  noiseOptions: Partial<NoiseGeneratorOptions>;
  marchingCubesOptions: Partial<MarchingCubesOptions>;
  // Add chunk system options
  useChunks: boolean;
  chunkSize: number;
  chunkResolution: number;
  renderDistance: number;
}

export class TerrainRenderer {
  private noise: NoiseGenerator;
  private mesher: MarchingCubes;
  private mesh: THREE.Mesh | null = null;
  private options: TerrainRendererOptions;
  private gui: GUI | null = null;
  private debugVoxels: THREE.Group | null = null;
  private scalarField: Float32Array | null = null;
  
  // Add ChunkManager for the chunk system
  private chunkManager: ChunkManager | null = null;
  
  // Add new properties for terrain modification
  private brushSize: number = 0.5;
  private brushStrength: number = 0.5;
  private isAddingTerrain: boolean = true; // true for adding, false for removing
  
  // Add these properties for optimization
  private pendingUpdate: boolean = false;
  private modifiedSinceLastUpdate: boolean = false;
  private updateThrottleMs: number = 50; // Throttle updates to 20 fps max
  private lastUpdateTime: number = 0;
  private dirtyRegion: { min: THREE.Vector3, max: THREE.Vector3 } | null = null;
  
  // Performance settings
  private minUpdateThrottleMs: number = 16; // Fastest update rate (60fps)
  private maxUpdateThrottleMs: number = 200; // Slowest update rate (5fps)
  private performanceMode: 'high' | 'medium' | 'low' = 'medium';
  
  constructor(options: Partial<TerrainRendererOptions> = {}) {
    // Set default options
    this.options = {
      resolution: 32,
      size: 50,
      material: new THREE.MeshPhongMaterial({
        color: 0x44aa88,
        shininess: 10,
        flatShading: true,
        side: THREE.DoubleSide, // Important to avoid gaps from back-face culling
      }),
      noiseOptions: {},
      marchingCubesOptions: {},
      // Default chunk options
      useChunks: true,
      chunkSize: 25,
      chunkResolution: 16,
      renderDistance: 3,
      ...options
    };
    
    // Create noise generator and mesher
    this.noise = new NoiseGenerator(this.options.noiseOptions);
    this.mesher = new MarchingCubes({
      resolution: this.options.resolution,
      size: this.options.size,
      ...this.options.marchingCubesOptions
    });
  }
  
  // Generate and return the terrain mesh
  generate(scene: THREE.Scene): THREE.Mesh | THREE.Group {
    if (this.options.useChunks) {
      return this.generateChunked(scene);
    } else {
      return this.generateMonolithic(scene);
    }
  }
  
  // Generate monolithic (single mesh) terrain
  private generateMonolithic(scene: THREE.Scene): THREE.Mesh {
    const resolution = this.options.resolution;
    
    // Generate noise field and store it for debug visualization
    this.scalarField = this.noise.getSamples(
      resolution, resolution, resolution
    );
    
    // Generate mesh geometry
    const geometry = this.mesher.generateMesh(
      this.scalarField, resolution, resolution, resolution
    );
    
    // Create or update the mesh
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.geometry = geometry;
      scene.add(this.mesh);
    } else {
      this.mesh = new THREE.Mesh(geometry, this.options.material);
      scene.add(this.mesh);
    }
    
    return this.mesh;
  }
  
  // Generate chunked terrain
  private generateChunked(scene: THREE.Scene): THREE.Group {
    // Clean up any existing chunk manager
    if (this.chunkManager) {
      scene.remove(this.chunkManager.getChunkGroup());
      this.chunkManager.dispose();
      this.chunkManager = null;
    }
    
    // Create a new chunk manager
    this.chunkManager = new ChunkManager({
      chunkSize: this.options.chunkSize,
      chunkResolution: this.options.chunkResolution,
      renderDistance: this.options.renderDistance,
      material: this.options.material,
      noiseGenerator: this.noise,
      isoLevel: this.mesher.getOptions().isoLevel,
      seamless: this.mesher.getOptions().seamless || true,
      doubleSided: this.mesher.getOptions().doubleSided || true
    });
    
    // Generate chunks around the origin
    this.chunkManager.generateChunksAroundPosition(new THREE.Vector3(0, 0, 0));
    
    // Add the chunk group to the scene
    const chunkGroup = this.chunkManager.getChunkGroup();
    scene.add(chunkGroup);
    
    return chunkGroup;
  }
  
  // Toggle debug visualization of voxels
  toggleDebugVoxels(scene: THREE.Scene, show: boolean): void {
    // Only supported in monolithic mode
    if (this.options.useChunks) {
      console.warn("Debug voxels not supported in chunked mode");
      return;
    }
    
    // Remove existing debug voxels if any
    if (this.debugVoxels) {
      scene.remove(this.debugVoxels);
      this.debugVoxels = null;
    }
    
    // Create and add debug voxels if requested
    if (show && this.scalarField) {
      const resolution = this.options.resolution;
      this.debugVoxels = this.mesher.createDebugVoxels(
        this.scalarField, resolution, resolution, resolution
      );
      scene.add(this.debugVoxels);
    }
  }
  
  // Modify modifyTerrain to use chunk system if enabled
  modifyTerrain(worldPos: THREE.Vector3, isAdding: boolean = true): void {
    if (this.options.useChunks && this.chunkManager) {
      // Modify terrain using the chunk system
      const effectiveBrushSize = this.getOptimalBrushSize();
      this.chunkManager.modifyTerrain(worldPos, effectiveBrushSize, this.brushStrength, isAdding);
    } else if (this.scalarField) {
      // Use the original monolithic terrain modification
      this.modifyMonolithicTerrain(worldPos, isAdding);
    }
  }
  
  // Original monolithic terrain modification method
  private modifyMonolithicTerrain(worldPos: THREE.Vector3, isAdding: boolean = true): void {
    if (!this.scalarField) return;
    
    const resolution = this.options.resolution;
    const { minX, maxX, minY, maxY, minZ, maxZ } = this.mesher.getOptions().bounds;
    
    // Get adaptive brush size based on resolution
    const effectiveBrushSize = this.getOptimalBrushSize();
    
    // Convert world position to grid space
    const gridX = Math.floor(((worldPos.x - minX) / (maxX - minX)) * (resolution - 1));
    const gridY = Math.floor(((worldPos.y - minY) / (maxY - minY)) * (resolution - 1));
    const gridZ = Math.floor(((worldPos.z - minZ) / (maxZ - minZ)) * (resolution - 1));
    
    // Calculate grid cell size - caching the calculation result
    const cellSizeX = (maxX - minX) / (resolution - 1);
    const cellSizeY = (maxY - minY) / (resolution - 1);
    const cellSizeZ = (maxZ - minZ) / (resolution - 1);
    
    // Calculate brush radius in grid cells, using the effective brush size
    const brushRadiusGrid = effectiveBrushSize / Math.min(cellSizeX, cellSizeY, cellSizeZ);
    
    // Determine affected grid cells
    const radiusCeil = Math.ceil(brushRadiusGrid);
    const minGridX = Math.max(0, gridX - radiusCeil);
    const maxGridX = Math.min(resolution - 1, gridX + radiusCeil);
    const minGridY = Math.max(0, gridY - radiusCeil);
    const maxGridY = Math.min(resolution - 1, gridY + radiusCeil);
    const minGridZ = Math.max(0, gridZ - radiusCeil);
    const maxGridZ = Math.min(resolution - 1, gridZ + radiusCeil);
    
    // Track the dirty region for potential partial updates
    if (!this.dirtyRegion) {
      this.dirtyRegion = {
        min: new THREE.Vector3(minGridX, minGridY, minGridZ),
        max: new THREE.Vector3(maxGridX, maxGridY, maxGridZ)
      };
    } else {
      this.dirtyRegion.min.x = Math.min(this.dirtyRegion.min.x, minGridX);
      this.dirtyRegion.min.y = Math.min(this.dirtyRegion.min.y, minGridY);
      this.dirtyRegion.min.z = Math.min(this.dirtyRegion.min.z, minGridZ);
      this.dirtyRegion.max.x = Math.max(this.dirtyRegion.max.x, maxGridX);
      this.dirtyRegion.max.y = Math.max(this.dirtyRegion.max.y, maxGridY);
      this.dirtyRegion.max.z = Math.max(this.dirtyRegion.max.z, maxGridZ);
    }
    
    // Cache squared radius for faster distance checks
    const brushRadiusGridSquared = brushRadiusGrid * brushRadiusGrid;
    
    // Optimization: Calculate the influence values outside the loops
    const maxInfluence = this.brushStrength;
    
    // Modify terrain density values within the brush radius
    for (let z = minGridZ; z <= maxGridZ; z++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        // Pre-calculate the index base for this y and z
        const yzBase = y * resolution + z * resolution * resolution;
        
        for (let x = minGridX; x <= maxGridX; x++) {
          // Calculate distance from brush center to this voxel
          const dx = x - gridX;
          const dy = y - gridY;
          const dz = z - gridZ;
          const distSquared = dx * dx + dy * dy + dz * dz;
          
          // Fast rejection test - if outside brush radius, skip
          if (distSquared > brushRadiusGridSquared) continue;
          
          // Calculate falloff based on distance from center (smooth transition at edges)
          // Optimization: Use approximation for sqrt when possible
          const distance = distSquared < 0.0001 ? 0 : Math.sqrt(distSquared);
          const falloff = 1.0 - Math.min(1.0, distance / brushRadiusGrid);
          
          // Calculate influence with falloff
          const influence = maxInfluence * falloff * falloff; // Squared falloff for smoother brush
          
          // Update density value
          const index = x + yzBase;
          if (index >= 0 && index < this.scalarField.length) {
            if (isAdding) {
              // Subtract from value to add terrain (counter-intuitive but correct for marching cubes)
              this.scalarField[index] -= influence;
            } else {
              // Add to value to remove terrain
              this.scalarField[index] += influence;
            }
          }
        }
      }
    }
    
    // Mark that we have modifications needing an update
    this.modifiedSinceLastUpdate = true;
    
    // Throttle updates to avoid performance issues
    this.scheduleUpdate();
  }
  
  // Schedule a throttled update (for monolithic mode)
  private scheduleUpdate(): void {
    if (this.pendingUpdate) return; // Already scheduled
    
    const currentTime = performance.now();
    const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
    
    if (timeSinceLastUpdate >= this.updateThrottleMs) {
      // Update immediately
      this.updateMesh();
    } else {
      // Schedule update
      this.pendingUpdate = true;
      setTimeout(() => {
        this.pendingUpdate = false;
        if (this.modifiedSinceLastUpdate) {
          this.updateMesh();
        }
      }, this.updateThrottleMs - timeSinceLastUpdate);
    }
  }
  
  // Update the mesh based on the current scalar field (for monolithic mode)
  updateMesh(): void {
    if (!this.scalarField || !this.mesh || !this.modifiedSinceLastUpdate) return;
    
    // Mark last update time
    this.lastUpdateTime = performance.now();
    this.modifiedSinceLastUpdate = false;
    
    const resolution = this.options.resolution;
    
    // Generate new geometry using the optimized method with dirty region
    const geometry = this.mesher.generateMeshOptimized(
      this.scalarField, 
      resolution, 
      resolution, 
      resolution,
      this.dirtyRegion || undefined
    );
    
    // Clear dirty region after update
    this.dirtyRegion = null;
    
    // Update mesh geometry
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    this.mesh.geometry = geometry;
    
    // If debug voxels are visible, update them too
    if (this.debugVoxels && this.debugVoxels.parent) {
      const scene = this.debugVoxels.parent as THREE.Scene;
      this.toggleDebugVoxels(scene, false);
      this.toggleDebugVoxels(scene, true);
    }
  }
  
  // Create a GUI for adjusting parameters
  setupGUI(container: HTMLElement, scene: THREE.Scene): GUI {
    if (this.gui) {
      this.gui.destroy();
    }
    
    this.gui = new GUI({ container });
    
    // Add chunk system controls
    const chunkFolder = this.gui.addFolder('Chunks');
    
    // Create object for GUI controls
    const chunkParams = {
      useChunks: this.options.useChunks,
      chunkSize: this.options.chunkSize,
      chunkResolution: this.options.chunkResolution,
      renderDistance: this.options.renderDistance,
      regenerate: () => this.regenerate(scene)
    };
    
    // Add controls
    chunkFolder.add(chunkParams, 'useChunks').name('Use Chunks').onChange((value: boolean) => {
      this.options.useChunks = value;
    });
    
    chunkFolder.add(chunkParams, 'chunkSize', 10, 100, 5).name('Chunk Size').onChange((value: number) => {
      this.options.chunkSize = value;
    });
    
    chunkFolder.add(chunkParams, 'chunkResolution', 8, 32, 4).name('Chunk Resolution').onChange((value: number) => {
      this.options.chunkResolution = value;
    });
    
    chunkFolder.add(chunkParams, 'renderDistance', 1, 10, 1).name('Render Distance').onChange((value: number) => {
      this.options.renderDistance = value;
      if (this.chunkManager) {
        this.chunkManager.setRenderDistance(value);
      }
    });
    
    // Noise parameters folder
    const noiseFolder = this.gui.addFolder('Noise');
    const noiseOptions = this.noise.getOptions();
    
    // Ensure all properties exist before adding them to GUI
    if (noiseOptions.scale !== undefined) {
      noiseFolder.add(noiseOptions, 'scale', 0.01, 0.5).onChange((value: number) => {
        this.noise.updateOptions({ scale: value });
      });
    }
    
    if (noiseOptions.amplitude !== undefined) {
      noiseFolder.add(noiseOptions, 'amplitude', 0.1, 2).onChange((value: number) => {
        this.noise.updateOptions({ amplitude: value });
      });
    }
    
    if (noiseOptions.octaves !== undefined) {
      noiseFolder.add(noiseOptions, 'octaves', 1, 8, 1).onChange((value: number) => {
        this.noise.updateOptions({ octaves: value });
      });
    }
    
    if (noiseOptions.persistence !== undefined) {
      noiseFolder.add(noiseOptions, 'persistence', 0.1, 0.9).onChange((value: number) => {
        this.noise.updateOptions({ persistence: value });
      });
    }
    
    if (noiseOptions.lacunarity !== undefined) {
      noiseFolder.add(noiseOptions, 'lacunarity', 1, 3).onChange((value: number) => {
        this.noise.updateOptions({ lacunarity: value });
      });
    }
    
    // Add surfaceLevel only if it exists
    if (noiseOptions.surfaceLevel !== undefined) {
      noiseFolder.add(noiseOptions, 'surfaceLevel', -1, 1).onChange((value: number) => {
        this.noise.updateOptions({ surfaceLevel: value });
      });
    } else {
      // Initialize it if it doesn't exist
      this.noise.updateOptions({ surfaceLevel: 0.0 });
      noiseOptions.surfaceLevel = 0.0;
      noiseFolder.add(noiseOptions, 'surfaceLevel', -1, 1).onChange((value: number) => {
        this.noise.updateOptions({ surfaceLevel: value });
      });
    }
    
    const randomizeButton = { randomize: () => {
      const newSeed = Math.random();
      this.noise.updateOptions({ seed: newSeed });
      const seedController = noiseFolder.controllers.find((c: any) => c.property === 'seed');
      if (seedController) seedController.setValue(newSeed);
    }};
    
    noiseFolder.add(randomizeButton, 'randomize');
    
    if (noiseOptions.seed !== undefined) {
      noiseFolder.add(noiseOptions, 'seed').listen();
    }
    
    // Marching cubes parameters folder
    const meshFolder = this.gui.addFolder('Marching Cubes');
    const meshOptions = this.mesher.getOptions();
    
    if (meshOptions.isoLevel !== undefined) {
      meshFolder.add(meshOptions, 'isoLevel', -1, 1).onChange((value: number) => {
        this.mesher.updateOptions({ isoLevel: value });
      });
    }
    
    if (meshOptions.resolution !== undefined) {
      meshFolder.add(meshOptions, 'resolution', 16, 64, 4).onChange((value: number) => {
        this.mesher.updateOptions({ resolution: value });
        this.options.resolution = value;
      });
    }
    
    // Add seamless option
    if (meshOptions.seamless !== undefined) {
      meshFolder.add(meshOptions, 'seamless').onChange((value: boolean) => {
        this.mesher.updateOptions({ seamless: value });
      });
    }
    
    // Add double-sided option
    if (meshOptions.doubleSided !== undefined) {
      meshFolder.add(meshOptions, 'doubleSided').onChange((value: boolean) => {
        this.mesher.updateOptions({ doubleSided: value });
      });
    }
    
    // Add terrain editing controls
    const editingFolder = this.gui.addFolder('Terrain Editing');
    
    // Create a separate object for the GUI controls
    const editingParams = {
      brushSize: this.brushSize,
      brushStrength: this.brushStrength,
      isAddingTerrain: this.isAddingTerrain,
      performanceMode: this.performanceMode
    };
    
    // Brush size control
    editingFolder.add(editingParams, 'brushSize', 0.5, 10.0).name('Brush Size').onChange((value: number) => {
      this.setBrushSize(value);
    });
    
    // Brush strength control
    editingFolder.add(editingParams, 'brushStrength', 0.05, 1.0).name('Brush Strength').onChange((value: number) => {
      this.setBrushStrength(value);
    });
    
    // Brush mode control
    editingFolder.add(editingParams, 'isAddingTerrain').name('Add Terrain (vs Remove)').onChange((value: boolean) => {
      this.setBrushMode(value);
    });
    
    // Performance mode control
    editingFolder.add(editingParams, 'performanceMode', ['high', 'medium', 'low'])
      .name('Performance Mode')
      .onChange((value: 'high' | 'medium' | 'low') => {
        this.setPerformanceMode(value);
      });
    
    // Add tooltip explaining performance modes
    const perfController = editingFolder.controllers.find(c => c.property === 'performanceMode');
    if (perfController && perfController.domElement) {
      const tooltip = document.createElement('div');
      tooltip.style.display = 'none';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = 'rgba(0,0,0,0.8)';
      tooltip.style.color = 'white';
      tooltip.style.padding = '5px';
      tooltip.style.borderRadius = '3px';
      tooltip.style.zIndex = '1000';
      tooltip.style.width = '200px';
      tooltip.style.fontSize = '12px';
      tooltip.innerHTML = 'high: Better quality, slower updates<br>' +
                          'medium: Balanced performance<br>' +
                          'low: Faster updates, may affect quality';
      document.body.appendChild(tooltip);
      
      perfController.domElement.addEventListener('mouseenter', () => {
        const rect = perfController.domElement.getBoundingClientRect();
        tooltip.style.left = rect.right + 'px';
        tooltip.style.top = rect.top + 'px';
        tooltip.style.display = 'block';
      });
      
      perfController.domElement.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    }
    
    // Debug visualization folder
    const debugFolder = this.gui.addFolder('Debug');
    
    // Add debug voxels toggle
    const debugOptions = {
      showVoxels: false
    };
    
    debugFolder.add(debugOptions, 'showVoxels').onChange((value: boolean) => {
      this.toggleDebugVoxels(scene, value);
    });
    
    // Regenerate button
    const regenerateButton = { regenerate: () => this.regenerate(scene) };
    this.gui.add(regenerateButton, 'regenerate');
    
    return this.gui;
  }
  
  // Force regeneration of the terrain
  regenerate(scene?: THREE.Scene): THREE.Mesh | THREE.Group | null {
    if (scene) {
      return this.generate(scene);
    } else if (this.mesh && this.mesh.parent) {
      return this.generate(this.mesh.parent as THREE.Scene);
    } else if (this.chunkManager && this.chunkManager.getChunkGroup().parent) {
      return this.generate(this.chunkManager.getChunkGroup().parent as THREE.Scene);
    }
    return null;
  }
  
  // Clean up resources
  dispose() {
    if (this.mesh) {
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      } else if (Array.isArray(this.mesh.material)) {
        for (const material of this.mesh.material) {
          material.dispose();
        }
      }
      this.mesh = null;
    }
    
    if (this.chunkManager) {
      const chunkGroup = this.chunkManager.getChunkGroup();
      if (chunkGroup.parent) {
        chunkGroup.parent.remove(chunkGroup);
      }
      this.chunkManager.dispose();
      this.chunkManager = null;
    }
    
    if (this.debugVoxels && this.debugVoxels.parent) {
      this.debugVoxels.parent.remove(this.debugVoxels);
      this.debugVoxels.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.debugVoxels = null;
    }
    
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }
  
  // Get brush size
  getBrushSize(): number {
    return this.brushSize;
  }
  
  // Set brush size
  setBrushSize(size: number): void {
    this.brushSize = Math.max(0.5, size);
  }
  
  // Get brush strength
  getBrushStrength(): number {
    return this.brushStrength;
  }
  
  // Set brush strength
  setBrushStrength(strength: number): void {
    this.brushStrength = Math.max(0.05, Math.min(1.0, strength));
  }
  
  // Set brush mode (add or remove)
  setBrushMode(isAdding: boolean): void {
    this.isAddingTerrain = isAdding;
  }
  
  // Get brush mode
  getBrushMode(): boolean {
    return this.isAddingTerrain;
  }
  
  // Get optimal brush size based on resolution
  getOptimalBrushSize(): number {
    // Scale brush size based on chunk resolution when in chunk mode
    const resolution = this.options.useChunks ? this.options.chunkResolution : this.options.resolution;
    
    if (resolution <= 16) {
      return this.brushSize;
    } else if (resolution <= 32) {
      return this.brushSize * 0.75;
    } else if (resolution <= 48) {
      return this.brushSize * 0.5;
    } else {
      return this.brushSize * 0.25;
    }
  }
  
  // Set performance mode and adjust settings accordingly
  setPerformanceMode(mode: 'high' | 'medium' | 'low'): void {
    if (this.performanceMode === mode) return;
    
    this.performanceMode = mode;
    
    // Adjust update throttle based on performance mode
    switch (mode) {
      case 'high':
        this.updateThrottleMs = this.minUpdateThrottleMs;
        break;
      case 'medium':
        this.updateThrottleMs = (this.minUpdateThrottleMs + this.maxUpdateThrottleMs) / 2;
        break;
      case 'low':
        this.updateThrottleMs = this.maxUpdateThrottleMs;
        break;
    }
    
    // If using chunked terrain, also adjust chunk settings
    if (this.options.useChunks && this.chunkManager) {
      // Adjust settings based on mode
      switch (mode) {
        case 'high':
          // High quality - default chunk resolution
          break;
        case 'medium':
          // Medium quality - might reduce render distance
          if (this.options.renderDistance > 3) {
            this.options.renderDistance = 3;
            this.chunkManager.setRenderDistance(3);
          }
          break;
        case 'low':
          // Low quality - reduce render distance
          if (this.options.renderDistance > 2) {
            this.options.renderDistance = 2;
            this.chunkManager.setRenderDistance(2);
          }
          break;
      }
    }
  }

  // Add getter for the mesh (returns chunk group if in chunked mode)
  get terrainMesh(): THREE.Mesh | THREE.Group | null {
    if (this.options.useChunks && this.chunkManager) {
      return this.chunkManager.getChunkGroup();
    }
    return this.mesh;
  }
  
  // NEW METHOD: Adjust render distance based on performance
  adjustRenderDistance(performanceRating: number): void {
    if (!this.options.useChunks || !this.chunkManager) return;
    
    // performanceRating should be between 0 (awful) and 1 (excellent)
    let optimalRenderDistance: number;
    
    if (performanceRating < 0.3) {
      // Poor performance - reduce render distance
      optimalRenderDistance = 2;
      this.setPerformanceMode('low');
    } else if (performanceRating < 0.6) {
      // Medium performance
      optimalRenderDistance = 3;
      this.setPerformanceMode('medium');
    } else {
      // Good performance
      optimalRenderDistance = Math.min(5, this.options.renderDistance);
      this.setPerformanceMode('high');
    }
    
    // Only update if different from current setting
    if (optimalRenderDistance !== this.options.renderDistance) {
      this.options.renderDistance = optimalRenderDistance;
      this.chunkManager.setRenderDistance(optimalRenderDistance);
      console.log(`Adjusted render distance to ${optimalRenderDistance} based on performance`);
    }
  }
  
  // NEW METHOD: Get current chunk count - useful for debugging
  getChunkCount(): number {
    if (this.chunkManager) {
      return (this.chunkManager as any).chunks.size;
    }
    return 0;
  }
  
  // NEW METHOD: Get worker count - useful for debugging
  getWorkerCount(): number {
    if (this.chunkManager) {
      return (this.chunkManager as any).workers.length;
    }
    return 0;
  }
  
  // NEW METHOD: Get chunks in queue - useful for debugging
  getQueueSize(): number {
    if (this.chunkManager) {
      return (this.chunkManager as any).chunkQueue.length;
    }
    return 0;
  }
} 