import * as THREE from 'three';
import { MarchingCubes } from './marchingCubes';
import { NoiseGenerator } from './NoiseGenerator';

export interface TerrainChunkOptions {
  resolution: number;
  size: number;
  position: THREE.Vector3;
  material: THREE.Material;
  isoLevel: number;
  seamless: boolean;
  doubleSided: boolean;
}

export class TerrainChunk {
  private mesh: THREE.Mesh | null = null;
  private scalarField: Float32Array;
  private geometry: THREE.BufferGeometry | null = null;
  private mesher: MarchingCubes;
  private options: TerrainChunkOptions;
  private isDirty: boolean = false;
  private isVisible: boolean = true;
  public chunkPosition: THREE.Vector3;
  private dirtyRegion: { min: THREE.Vector3, max: THREE.Vector3 } | null = null;
  
  constructor(options: TerrainChunkOptions, noiseGenerator: NoiseGenerator, generateMeshImmediately = true) {
    this.options = options;
    this.chunkPosition = options.position.clone();
    
    this.mesher = new MarchingCubes({
      resolution: options.resolution,
      size: options.size,
      isoLevel: options.isoLevel,
      seamless: options.seamless,
      doubleSided: options.doubleSided,
      bounds: this.calculateChunkBounds()
    });
    
    // Generate initial scalar field for this chunk
    this.scalarField = this.generateScalarField(noiseGenerator);
    
    // Generate the initial mesh if requested
    if (generateMeshImmediately) {
      this.generateMesh();
    }
  }
  
  // Calculate the world bounds of this chunk
  private calculateChunkBounds() {
    const halfSize = this.options.size / 2;
    const posX = this.chunkPosition.x * this.options.size;
    const posY = this.chunkPosition.y * this.options.size;
    const posZ = this.chunkPosition.z * this.options.size;
    
    return {
      minX: posX - halfSize,
      maxX: posX + halfSize,
      minY: posY - halfSize,
      maxY: posY + halfSize,
      minZ: posZ - halfSize,
      maxZ: posZ + halfSize
    };
  }
  
  // Get the bounds of this chunk (for worker)
  getBounds() {
    return this.calculateChunkBounds();
  }
  
  // Get the scalar field (for worker)
  getScalarField(): Float32Array {
    // Create a copy to avoid issues with transferring the original
    return new Float32Array(this.scalarField);
  }
  
  // Generate the scalar field for this chunk using the noise generator
  private generateScalarField(noiseGenerator: NoiseGenerator): Float32Array {
    const resolution = this.options.resolution;
    const bounds = this.calculateChunkBounds();
    
    // Calculate offsets for the noise generator
    const offsetX = this.chunkPosition.x * (resolution - 1);
    const offsetY = this.chunkPosition.y * (resolution - 1);
    const offsetZ = this.chunkPosition.z * (resolution - 1);
    
    // Get samples from the noise generator
    return noiseGenerator.getSamples(
      resolution, resolution, resolution,
      offsetX, offsetY, offsetZ
    );
  }
  
  // Generate the mesh from the scalar field
  generateMesh(): void {
    const resolution = this.options.resolution;
    
    // Generate mesh geometry
    this.geometry = this.mesher.generateMeshOptimized(
      this.scalarField, 
      resolution, 
      resolution, 
      resolution,
      this.dirtyRegion || undefined
    );
    
    // Reset dirty flag and region
    this.isDirty = false;
    this.dirtyRegion = null;
    
    // Create or update the mesh
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      this.mesh.geometry = this.geometry;
    } else {
      this.mesh = new THREE.Mesh(this.geometry, this.options.material);
      // Set position to match world location
      const position = this.calculateChunkPosition();
      this.mesh.position.copy(position);
    }
  }
  
  // Update mesh from worker-generated data
  updateMeshFromData(positions: Float32Array, normals: Float32Array, indices: Uint32Array): void {
    // Create a new geometry
    const geometry = new THREE.BufferGeometry();
    
    // Set attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
    
    // Update bounds
    geometry.computeBoundingSphere();
    
    // If we had a previous geometry, dispose it
    if (this.geometry) {
      this.geometry.dispose();
    }
    
    // Store the new geometry
    this.geometry = geometry;
    
    // Reset dirty flag and region
    this.isDirty = false;
    this.dirtyRegion = null;
    
    // Create or update the mesh
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      this.mesh.geometry = this.geometry;
    } else {
      this.mesh = new THREE.Mesh(this.geometry, this.options.material);
      // Set position to match world location
      const position = this.calculateChunkPosition();
      this.mesh.position.copy(position);
    }
  }
  
  // Calculate the world position of this chunk
  private calculateChunkPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.chunkPosition.x * this.options.size,
      this.chunkPosition.y * this.options.size,
      this.chunkPosition.z * this.options.size
    );
  }
  
  // Get the mesh for rendering
  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }
  
  // Check if this chunk is dirty and needs updating
  needsUpdate(): boolean {
    return this.isDirty;
  }
  
  // Convert a world position to local chunk coordinates
  worldToLocalPosition(worldPos: THREE.Vector3): THREE.Vector3 {
    const bounds = this.calculateChunkBounds();
    const resolution = this.options.resolution;
    
    // Map world position to local chunk space (0 to resolution-1)
    const localX = Math.floor(((worldPos.x - bounds.minX) / (bounds.maxX - bounds.minX)) * (resolution - 1));
    const localY = Math.floor(((worldPos.y - bounds.minY) / (bounds.maxY - bounds.minY)) * (resolution - 1));
    const localZ = Math.floor(((worldPos.z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * (resolution - 1));
    
    return new THREE.Vector3(localX, localY, localZ);
  }
  
  // Check if a world position is within this chunk
  containsPosition(worldPos: THREE.Vector3): boolean {
    const bounds = this.calculateChunkBounds();
    
    return (
      worldPos.x >= bounds.minX && worldPos.x <= bounds.maxX &&
      worldPos.y >= bounds.minY && worldPos.y <= bounds.maxY &&
      worldPos.z >= bounds.minZ && worldPos.z <= bounds.maxZ
    );
  }
  
  // Modify the terrain at a specific position
  modifyTerrain(worldPos: THREE.Vector3, brushSize: number, brushStrength: number, isAdding: boolean): boolean {
    if (!this.containsPosition(worldPos)) {
      return false; // Position not in this chunk
    }
    
    const resolution = this.options.resolution;
    const bounds = this.calculateChunkBounds();
    
    // Convert world position to local chunk coordinates
    const localPos = this.worldToLocalPosition(worldPos);
    
    // Calculate brush radius in grid cells
    const cellSizeX = (bounds.maxX - bounds.minX) / (resolution - 1);
    const cellSizeY = (bounds.maxY - bounds.minY) / (resolution - 1);
    const cellSizeZ = (bounds.maxZ - bounds.minZ) / (resolution - 1);
    const minCellSize = Math.min(cellSizeX, cellSizeY, cellSizeZ);
    const brushRadiusGrid = brushSize / minCellSize;
    
    // Determine affected grid cells
    const radiusCeil = Math.ceil(brushRadiusGrid);
    const minGridX = Math.max(0, Math.floor(localPos.x) - radiusCeil);
    const maxGridX = Math.min(resolution - 1, Math.floor(localPos.x) + radiusCeil);
    const minGridY = Math.max(0, Math.floor(localPos.y) - radiusCeil);
    const maxGridY = Math.min(resolution - 1, Math.floor(localPos.y) + radiusCeil);
    const minGridZ = Math.max(0, Math.floor(localPos.z) - radiusCeil);
    const maxGridZ = Math.min(resolution - 1, Math.floor(localPos.z) + radiusCeil);
    
    // Track the dirty region
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
    
    // Modify terrain density values within the brush radius
    let modified = false;
    
    for (let z = minGridZ; z <= maxGridZ; z++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        const yzBase = y * resolution + z * resolution * resolution;
        
        for (let x = minGridX; x <= maxGridX; x++) {
          // Calculate distance from brush center to this voxel
          const dx = x - localPos.x;
          const dy = y - localPos.y;
          const dz = z - localPos.z;
          const distSquared = dx * dx + dy * dy + dz * dz;
          
          // Skip if outside brush radius
          if (distSquared > brushRadiusGridSquared) continue;
          
          // Calculate falloff based on distance from center
          const distance = distSquared < 0.0001 ? 0 : Math.sqrt(distSquared);
          const falloff = 1.0 - Math.min(1.0, distance / brushRadiusGrid);
          
          // Calculate influence with falloff
          const influence = brushStrength * falloff * falloff;
          
          // Update density value
          const index = x + yzBase;
          if (index >= 0 && index < this.scalarField.length) {
            if (isAdding) {
              // Subtract from value to add terrain
              this.scalarField[index] -= influence;
            } else {
              // Add to value to remove terrain
              this.scalarField[index] += influence;
            }
            modified = true;
          }
        }
      }
    }
    
    // Mark chunk as dirty if any modifications were made
    if (modified) {
      this.isDirty = true;
    }
    
    return modified;
  }
  
  // Check if this chunk could be affected by a brush at the given position
  couldBeAffected(worldPos: THREE.Vector3, brushSize: number): boolean {
    const bounds = this.calculateChunkBounds();
    
    // Calculate distance from chunk center to position
    const chunkCenterX = (bounds.minX + bounds.maxX) / 2;
    const chunkCenterY = (bounds.minY + bounds.maxY) / 2;
    const chunkCenterZ = (bounds.minZ + bounds.maxZ) / 2;
    
    const dx = worldPos.x - chunkCenterX;
    const dy = worldPos.y - chunkCenterY;
    const dz = worldPos.z - chunkCenterZ;
    
    // Calculate distance to chunk center
    const distSq = dx * dx + dy * dy + dz * dz;
    
    // Calculate chunk's bounding sphere radius
    const chunkRadius = Math.sqrt(
      Math.pow(bounds.maxX - bounds.minX, 2) / 4 +
      Math.pow(bounds.maxY - bounds.minY, 2) / 4 +
      Math.pow(bounds.maxZ - bounds.minZ, 2) / 4
    );
    
    // Check if brush (with its radius) could affect chunk
    return Math.sqrt(distSq) <= chunkRadius + brushSize;
  }
  
  // Set chunk visibility
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.mesh) {
      this.mesh.visible = visible;
    }
  }
  
  // Check if chunk is visible
  isChunkVisible(): boolean {
    return this.isVisible;
  }
  
  // Dispose of resources
  dispose(): void {
    if (this.mesh && this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    this.mesh = null;
    this.geometry = null;
  }
} 