import * as THREE from 'three';
import GUI from 'lil-gui';
import { NoiseGenerator, NoiseGeneratorOptions } from './NoiseGenerator';
import { MarchingCubes, MarchingCubesOptions } from './marchingCubes';

export interface TerrainRendererOptions {
  resolution: number;
  size: number;
  material: THREE.Material;
  noiseOptions: Partial<NoiseGeneratorOptions>;
  marchingCubesOptions: Partial<MarchingCubesOptions>;
}

export class TerrainRenderer {
  private noise: NoiseGenerator;
  private mesher: MarchingCubes;
  private mesh: THREE.Mesh | null = null;
  private options: TerrainRendererOptions;
  private gui: GUI | null = null;
  private debugVoxels: THREE.Group | null = null;
  private scalarField: Float32Array | null = null;
  
  // Add new properties for terrain modification
  private brushSize: number = 0.5;
  private brushStrength: number = 0.5;
  private isAddingTerrain: boolean = true; // true for adding, false for removing
  
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
  generate(scene: THREE.Scene): THREE.Mesh {
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
  
  // Toggle debug visualization of voxels
  toggleDebugVoxels(scene: THREE.Scene, show: boolean): void {
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
  
  // Create a GUI for adjusting parameters
  setupGUI(container: HTMLElement, scene: THREE.Scene): GUI {
    if (this.gui) {
      this.gui.destroy();
    }
    
    this.gui = new GUI({ container });
    
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
      isAddingTerrain: this.isAddingTerrain
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
  regenerate(scene?: THREE.Scene): THREE.Mesh | null {
    if (scene || (this.mesh && this.mesh.parent)) {
      return this.generate(scene || (this.mesh?.parent as THREE.Scene));
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
  
  // Add a method to modify the terrain at a world position with a sphere brush
  modifyTerrain(worldPos: THREE.Vector3, isAdding: boolean = true): void {
    if (!this.scalarField) return;
    
    const resolution = this.options.resolution;
    const { minX, maxX, minY, maxY, minZ, maxZ } = this.mesher.getOptions().bounds;
    
    // Convert world position to grid space
    const gridX = Math.floor(((worldPos.x - minX) / (maxX - minX)) * (resolution - 1));
    const gridY = Math.floor(((worldPos.y - minY) / (maxY - minY)) * (resolution - 1));
    const gridZ = Math.floor(((worldPos.z - minZ) / (maxZ - minZ)) * (resolution - 1));
    
    // Calculate grid cell size
    const cellSizeX = (maxX - minX) / (resolution - 1);
    const cellSizeY = (maxY - minY) / (resolution - 1);
    const cellSizeZ = (maxZ - minZ) / (resolution - 1);
    
    // Calculate brush radius in grid cells
    const brushRadiusGrid = this.brushSize / Math.min(cellSizeX, cellSizeY, cellSizeZ);
    
    // Determine affected grid cells
    const radiusCeil = Math.ceil(brushRadiusGrid);
    const minGridX = Math.max(0, gridX - radiusCeil);
    const maxGridX = Math.min(resolution - 1, gridX + radiusCeil);
    const minGridY = Math.max(0, gridY - radiusCeil);
    const maxGridY = Math.min(resolution - 1, gridY + radiusCeil);
    const minGridZ = Math.max(0, gridZ - radiusCeil);
    const maxGridZ = Math.min(resolution - 1, gridZ + radiusCeil);
    
    // Modify terrain density values within the brush radius
    for (let z = minGridZ; z <= maxGridZ; z++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        for (let x = minGridX; x <= maxGridX; x++) {
          // Calculate distance from brush center to this voxel
          const dx = x - gridX;
          const dy = y - gridY;
          const dz = z - gridZ;
          const distSquared = dx * dx + dy * dy + dz * dz;
          
          // If within brush sphere radius
          if (distSquared <= brushRadiusGrid * brushRadiusGrid) {
            // Calculate falloff based on distance from center (smooth transition at edges)
            const distance = Math.sqrt(distSquared);
            const falloff = 1.0 - Math.min(1.0, distance / brushRadiusGrid);
            
            // Calculate influence with falloff
            const influence = this.brushStrength * falloff * falloff; // Squared falloff for smoother brush
            
            // Update density value
            const index = x + y * resolution + z * resolution * resolution;
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
    }
    
    // Regenerate mesh with modified scalar field
    this.updateMesh();
  }
  
  // Update the mesh based on the current scalar field
  updateMesh(): void {
    if (!this.scalarField || !this.mesh) return;
    
    const resolution = this.options.resolution;
    const geometry = this.mesher.generateMesh(
      this.scalarField, resolution, resolution, resolution
    );
    
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

  // Add getter for the mesh
  get terrainMesh(): THREE.Mesh | null {
    return this.mesh;
  }
} 