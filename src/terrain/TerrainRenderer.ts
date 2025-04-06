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
  
  constructor(options: Partial<TerrainRendererOptions> = {}) {
    // Set default options
    this.options = {
      resolution: 32,
      size: 50,
      material: new THREE.MeshPhongMaterial({
        color: 0x44aa88,
        shininess: 10,
        flatShading: true
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
    
    // Generate noise field
    const scalarField = this.noise.getSamples(
      resolution, resolution, resolution
    );
    
    // Generate mesh geometry
    const geometry = this.mesher.generateMesh(
      scalarField, resolution, resolution, resolution
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
  
  // Create a GUI for adjusting parameters
  setupGUI(container: HTMLElement): GUI {
    if (this.gui) {
      this.gui.destroy();
    }
    
    this.gui = new GUI({ container });
    
    // Noise parameters folder
    const noiseFolder = this.gui.addFolder('Noise');
    const noiseOptions = this.noise.getOptions();
    
    noiseFolder.add(noiseOptions, 'scale', 0.01, 0.5).onChange((value: number) => {
      this.noise.updateOptions({ scale: value });
    });
    
    noiseFolder.add(noiseOptions, 'amplitude', 0.1, 2).onChange((value: number) => {
      this.noise.updateOptions({ amplitude: value });
    });
    
    noiseFolder.add(noiseOptions, 'octaves', 1, 8, 1).onChange((value: number) => {
      this.noise.updateOptions({ octaves: value });
    });
    
    noiseFolder.add(noiseOptions, 'persistence', 0.1, 0.9).onChange((value: number) => {
      this.noise.updateOptions({ persistence: value });
    });
    
    noiseFolder.add(noiseOptions, 'lacunarity', 1, 3).onChange((value: number) => {
      this.noise.updateOptions({ lacunarity: value });
    });
    
    const randomizeButton = { randomize: () => {
      const newSeed = Math.random();
      this.noise.updateOptions({ seed: newSeed });
      noiseFolder.controllers.find((c: any) => c.property === 'seed')?.setValue(newSeed);
    }};
    
    noiseFolder.add(randomizeButton, 'randomize');
    noiseFolder.add(noiseOptions, 'seed').listen();
    
    // Marching cubes parameters folder
    const meshFolder = this.gui.addFolder('Marching Cubes');
    const meshOptions = this.mesher.getOptions();
    
    meshFolder.add(meshOptions, 'isoLevel', -1, 1).onChange((value: number) => {
      this.mesher.updateOptions({ isoLevel: value });
    });
    
    meshFolder.add(meshOptions, 'resolution', 16, 64, 4).onChange((value: number) => {
      this.mesher.updateOptions({ resolution: value });
      this.options.resolution = value;
    });
    
    // Regenerate button
    const regenerateButton = { regenerate: () => this.regenerate() };
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
    
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }
} 