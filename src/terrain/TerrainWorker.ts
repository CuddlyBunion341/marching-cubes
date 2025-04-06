// TerrainWorker.ts - Web Worker for terrain mesh generation

// Import marching cubes algorithm
import { MarchingCubes } from './marchingCubes';

// Handle messages from the main thread
self.onmessage = (event) => {
  const data = event.data;
  
  if (data.type === 'generateMesh') {
    try {
      // Create mesher for this specific task
      const mesher = new MarchingCubes({
        resolution: data.resolution,
        size: data.chunkSize,
        isoLevel: data.isoLevel,
        bounds: data.bounds,
        seamless: data.seamless,
        doubleSided: data.doubleSided
      });
      
      // Generate the mesh geometry
      const geometry = mesher.generateMesh(
        data.scalarField,
        data.resolution,
        data.resolution,
        data.resolution
      );
      
      // Extract geometry data for transfer back to main thread
      const positions = geometry.getAttribute('position').array;
      const normals = geometry.getAttribute('normal').array;
      const indices = geometry.getIndex()?.array || new Uint32Array();
      
      // Send the geometry data back to the main thread
      // Use transferable objects for better performance
      self.postMessage({
        type: 'chunkComplete',
        chunkKey: data.chunkKey,
        positions,
        normals,
        indices
      }, {
        transfer: [
          positions.buffer,
          normals.buffer,
          indices.buffer
        ]
      });
      
      // Dispose of the geometry to free memory
      geometry.dispose();
    } catch (error: unknown) {
      console.error('Error in worker:', error);
      self.postMessage({
        type: 'error',
        chunkKey: data.chunkKey,
        error: error instanceof Error ? error.toString() : String(error)
      });
    }
  }
}; 