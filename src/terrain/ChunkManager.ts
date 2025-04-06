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
  maxConcurrentWorkers?: number; // Number of workers to use
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
  
  // Worker pool for parallel mesh generation
  private workers: Worker[] = [];
  private workerPool: Worker[] = [];
  private chunkQueue: {key: string, chunkX: number, chunkY: number, chunkZ: number}[] = [];
  private inProgressChunks: Map<string, boolean> = new Map();
  
  constructor(options: ChunkManagerOptions) {
    this.options = options;
    
    // Initialize workers for parallel chunk generation
    this.initWorkers();
  }
  
  // Initialize worker pool
  private initWorkers() {
    const maxWorkers = this.options.maxConcurrentWorkers || 
      (navigator.hardwareConcurrency ? Math.max(2, navigator.hardwareConcurrency - 1) : 4);
    
    for (let i = 0; i < maxWorkers; i++) {
      try {
        // Create a new worker
        const worker = new Worker(new URL('./TerrainWorker.ts', import.meta.url), { type: 'module' });
        
        // Setup message handling
        worker.onmessage = (e) => this.handleWorkerMessage(e.data, worker);
        
        // Add to pool
        this.workers.push(worker);
        this.workerPool.push(worker);
      } catch (error) {
        console.error('Failed to create worker:', error);
      }
    }
    
    console.log(`Initialized ${this.workers.length} terrain generation workers`);
  }
  
  // Handle message from worker
  private handleWorkerMessage(data: any, worker: Worker) {
    if (data.type === 'chunkComplete') {
      const { chunkKey, positions, normals, indices } = data;
      
      // Get the chunk that was being processed
      const chunk = this.chunks.get(chunkKey);
      if (chunk) {
        // Update the mesh with the generated geometry
        chunk.updateMeshFromData(positions, normals, indices);
        
        // Add to scene if not already there
        const mesh = chunk.getMesh();
        if (mesh && !this.chunkGroup.children.includes(mesh)) {
          this.chunkGroup.add(mesh);
        }
      }
      
      // Mark chunk as no longer in progress
      this.inProgressChunks.delete(chunkKey);
      
      // Return worker to pool
      this.workerPool.push(worker);
      
      // Process next chunk in queue if any
      this.processNextChunkInQueue();
    }
  }
  
  // Process next chunk in queue
  private processNextChunkInQueue() {
    if (this.chunkQueue.length === 0 || this.workerPool.length === 0) return;
    
    // Get next chunk from queue
    const { key, chunkX, chunkY, chunkZ } = this.chunkQueue.shift()!;
    
    // Skip if this chunk no longer exists (e.g., was removed while in queue)
    if (!this.chunks.has(key)) {
      this.processNextChunkInQueue();
      return;
    }
    
    // Get a worker from pool
    const worker = this.workerPool.pop()!;
    
    // Mark chunk as in progress
    this.inProgressChunks.set(key, true);
    
    // Get the chunk to send its data to the worker
    const chunk = this.chunks.get(key)!;
    const scalarField = chunk.getScalarField();
    
    // Send data to worker for processing
    worker.postMessage({
      type: 'generateMesh',
      chunkKey: key,
      scalarField: scalarField,
      resolution: this.options.chunkResolution,
      chunkSize: this.options.chunkSize,
      isoLevel: this.options.isoLevel,
      position: {
        x: chunkX * this.options.chunkSize,
        y: chunkY * this.options.chunkSize,
        z: chunkZ * this.options.chunkSize
      },
      bounds: chunk.getBounds(),
      seamless: this.options.seamless,
      doubleSided: this.options.doubleSided
    }, [scalarField.buffer]);  // Transfer the buffer for better performance
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
    
    // Create the chunk without generating mesh immediately
    const chunk = new TerrainChunk(chunkOptions, this.options.noiseGenerator, false);
    this.chunks.set(chunkKey, chunk);
    
    // Queue mesh generation in worker
    this.chunkQueue.push({
      key: chunkKey,
      chunkX,
      chunkY,
      chunkZ
    });
    
    // Start processing if not already
    this.processNextChunkInQueue();
    
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
      
      // Remove from update queue if present
      this.pendingUpdates.delete(chunkKey);
      
      // Remove from chunk queue if present
      const queueIndex = this.chunkQueue.findIndex(item => item.key === chunkKey);
      if (queueIndex !== -1) {
        this.chunkQueue.splice(queueIndex, 1);
      }
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
        // Don't update if already being processed by a worker
        if (this.inProgressChunks.has(chunkKey)) continue;
        
        // Queue for worker processing
        const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);
        this.chunkQueue.push({
          key: chunkKey,
          chunkX,
          chunkY,
          chunkZ
        });
        
        // Start processing if not already
        this.processNextChunkInQueue();
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
  
  // Dispose of all chunks and workers
  dispose(): void {
    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.workerPool = [];
    
    // Clear chunk queue
    this.chunkQueue = [];
    
    // Dispose chunks
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
    
    // Remove all children from chunk group
    while (this.chunkGroup.children.length > 0) {
      this.chunkGroup.remove(this.chunkGroup.children[0]);
    }
  }
} 