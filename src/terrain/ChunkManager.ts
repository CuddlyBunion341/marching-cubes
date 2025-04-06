import * as THREE from 'three';
import { TerrainChunk, TerrainChunkOptions } from './TerrainChunk';
import { NoiseGenerator } from './NoiseGenerator';

export interface ChunkManagerOptions {
  chunkSize: number;
  chunkResolution: number;
  renderDistance: number;
  material: THREE.Material;
  noiseGenerator: NoiseGenerator;
  isoLevel: number;
  seamless: boolean;
  doubleSided: boolean;
}

export class ChunkManager {
  private chunks: Map<string, TerrainChunk> = new Map();
  private chunkGroup: THREE.Group = new THREE.Group();
  private options: ChunkManagerOptions;
  private pendingUpdates: Set<string> = new Set();
  private updateThrottleMs: number = 50;
  private lastUpdateTime: number = 0;
  private isUpdating: boolean = false;
  private currentCenter: THREE.Vector3 = new THREE.Vector3();
  
  constructor(options: ChunkManagerOptions) {
    this.options = options;
  }
  
  // Get the 3D scene object containing all chunks
  getChunkGroup(): THREE.Group {
    return this.chunkGroup;
  }
  
  // Generate key for a chunk based on its position
  private getChunkKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }
  
  // Generate chunks in a radius around the center position
  generateChunksAroundPosition(centerPos: THREE.Vector3): void {
    this.currentCenter.copy(centerPos);
    
    // Convert world position to chunk coordinates
    const centerChunkX = Math.floor(centerPos.x / this.options.chunkSize);
    const centerChunkY = Math.floor(centerPos.y / this.options.chunkSize);
    const centerChunkZ = Math.floor(centerPos.z / this.options.chunkSize);
    
    // Set of chunk keys that should be active
    const activeChunkKeys: Set<string> = new Set();
    
    // Generate chunks within render distance
    const renderDistance = this.options.renderDistance;
    for (let x = -renderDistance; x <= renderDistance; x++) {
      for (let y = -renderDistance; y <= renderDistance; y++) {
        for (let z = -renderDistance; z <= renderDistance; z++) {
          // Calculate distance from center in chunk coordinates
          const distance = Math.sqrt(x*x + y*y + z*z);
          
          // Skip if outside render distance
          if (distance > renderDistance) continue;
          
          const chunkX = centerChunkX + x;
          const chunkY = centerChunkY + y;
          const chunkZ = centerChunkZ + z;
          
          const chunkKey = this.getChunkKey(chunkX, chunkY, chunkZ);
          activeChunkKeys.add(chunkKey);
          
          // Create the chunk if it doesn't exist
          if (!this.chunks.has(chunkKey)) {
            this.createChunk(chunkX, chunkY, chunkZ);
          }
        }
      }
    }
    
    // Remove chunks that are too far away
    for (const [key, chunk] of this.chunks.entries()) {
      if (!activeChunkKeys.has(key)) {
        this.removeChunk(key);
      }
    }
  }
  
  // Create a new chunk at the specified position
  private createChunk(chunkX: number, chunkY: number, chunkZ: number): TerrainChunk {
    const chunkKey = this.getChunkKey(chunkX, chunkY, chunkZ);
    
    // Create chunk options
    const chunkOptions: TerrainChunkOptions = {
      resolution: this.options.chunkResolution,
      size: this.options.chunkSize,
      position: new THREE.Vector3(chunkX, chunkY, chunkZ),
      material: this.options.material,
      isoLevel: this.options.isoLevel,
      seamless: this.options.seamless,
      doubleSided: this.options.doubleSided
    };
    
    // Create the chunk
    const chunk = new TerrainChunk(chunkOptions, this.options.noiseGenerator);
    this.chunks.set(chunkKey, chunk);
    
    // Add to scene if mesh exists
    const mesh = chunk.getMesh();
    if (mesh) {
      this.chunkGroup.add(mesh);
    }
    
    return chunk;
  }
  
  // Remove a chunk by key
  private removeChunk(chunkKey: string): void {
    const chunk = this.chunks.get(chunkKey);
    if (chunk) {
      const mesh = chunk.getMesh();
      if (mesh) {
        this.chunkGroup.remove(mesh);
      }
      chunk.dispose();
      this.chunks.delete(chunkKey);
    }
  }
  
  // Modify terrain at a given position
  modifyTerrain(position: THREE.Vector3, brushSize: number, brushStrength: number, isAdding: boolean): void {
    // Find all chunks that could be affected by the brush
    const affectedChunks: TerrainChunk[] = [];
    
    for (const chunk of this.chunks.values()) {
      if (chunk.couldBeAffected(position, brushSize)) {
        affectedChunks.push(chunk);
      }
    }
    
    // Modify each affected chunk
    for (const chunk of affectedChunks) {
      if (chunk.modifyTerrain(position, brushSize, brushStrength, isAdding)) {
        // If chunk was modified, add it to the update queue
        const chunkKey = this.getChunkKey(
          chunk.chunkPosition.x,
          chunk.chunkPosition.y,
          chunk.chunkPosition.z
        );
        this.pendingUpdates.add(chunkKey);
      }
    }
    
    // Schedule update of modified chunks
    this.scheduleChunkUpdates();
  }
  
  // Schedule update of chunks
  private scheduleChunkUpdates(): void {
    if (this.isUpdating || this.pendingUpdates.size === 0) return;
    
    const currentTime = performance.now();
    const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
    
    if (timeSinceLastUpdate >= this.updateThrottleMs) {
      // Update immediately
      this.updateChunks();
    } else {
      // Schedule update
      this.isUpdating = true;
      setTimeout(() => {
        this.isUpdating = false;
        this.updateChunks();
      }, this.updateThrottleMs - timeSinceLastUpdate);
    }
  }
  
  // Update all chunks that need updating
  private updateChunks(): void {
    if (this.pendingUpdates.size === 0) return;
    
    // Mark the update time
    this.lastUpdateTime = performance.now();
    
    // Update each chunk in the update queue
    for (const chunkKey of this.pendingUpdates) {
      const chunk = this.chunks.get(chunkKey);
      if (chunk && chunk.needsUpdate()) {
        chunk.generateMesh();
      }
    }
    
    // Clear the update queue
    this.pendingUpdates.clear();
  }
  
  // Set render distance
  setRenderDistance(distance: number): void {
    this.options.renderDistance = Math.max(1, distance);
    // Regenerate chunks with new render distance
    this.generateChunksAroundPosition(this.currentCenter);
  }
  
  // Dispose of all chunks
  dispose(): void {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
    while (this.chunkGroup.children.length > 0) {
      this.chunkGroup.remove(this.chunkGroup.children[0]);
    }
  }
} 