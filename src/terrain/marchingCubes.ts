import * as THREE from 'three';

// Lookup tables for the marching cubes algorithm
// Edges: Indexed by edge number, maps to the two vertices that form the edge
const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
];

// Vertex positions: Indexed by vertex number, maps to the coordinates of the vertex in the unit cube
const VERTICES = [
  [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1],
  [0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]
];

// Triangle table: Maps edge indices for all possible configurations
import { TRIANGLE_TABLE } from './TriangleTable';

export interface MarchingCubesOptions {
  resolution: number;
  size: number;
  isoLevel: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  seamless: boolean; // Option to enable seamless meshing
  debugVoxels: boolean; // Option to show debug voxels
  doubleSided: boolean; // Option to create double-sided triangles
}

export class MarchingCubes {
  private options: MarchingCubesOptions;
  private vertexCache: Map<string, number>; // Cache for vertex reuse
  private debugMesh: THREE.Mesh | null = null;

  constructor(options: Partial<MarchingCubesOptions> = {}) {
    this.options = {
      resolution: 32,
      size: 50,
      isoLevel: 0.0,
      bounds: {
        minX: -1, maxX: 1,
        minY: -1, maxY: 1,
        minZ: -1, maxZ: 1
      },
      seamless: true, // Enable by default
      debugVoxels: false, // Disabled by default
      doubleSided: true, // Enable by default to fix gaps
      ...options
    };
    this.vertexCache = new Map();
  }

  // Generate a mesh from a 3D scalar field
  generateMesh(scalarField: Float32Array, sizeX: number, sizeY: number, sizeZ: number): THREE.BufferGeometry {
    // Reset vertex cache for a new mesh generation
    this.vertexCache.clear();
    
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    // Process the entire grid volume - ensuring we go one cell beyond the edges to close any holes
    // This is crucial for creating a solid, watertight mesh
    const padSize = 1; // Add extra cells for boundary processing
    
    for (let z = -padSize; z < sizeZ + padSize - 1; z++) {
      for (let y = -padSize; y < sizeY + padSize - 1; y++) {
        for (let x = -padSize; x < sizeX + padSize - 1; x++) {
          this.polygonizeCube(
            x, y, z,
            scalarField,
            sizeX, sizeY, sizeZ,
            positions, normals, indices
          );
        }
      }
    }

    // Create buffer geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    // This is important for proper lighting and ensures no normals are missing
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    return geometry;
  }

  // Polygonize a single cube
  private polygonizeCube(
    x: number, y: number, z: number,
    scalarField: Float32Array,
    sizeX: number, sizeY: number, sizeZ: number,
    positions: number[], normals: number[], indices: number[]
  ): void {
    const { isoLevel, seamless, doubleSided } = this.options;
    const { minX, minY, minZ } = this.options.bounds;
    const { maxX, maxY, maxZ } = this.options.bounds;

    // Get scalar values at the eight corners of the cube with extra padding for boundary conditions
    const cubeValues: number[] = [];
    const padSize = 2; // Extra padding for sampling beyond the cube
    
    for (let i = 0; i < 8; i++) {
      const [vx, vy, vz] = VERTICES[i];
      const cx = x + vx;
      const cy = y + vy;
      const cz = z + vz;
      
      const index = this.getScalarFieldIndex(cx, cy, cz, sizeX, sizeY, sizeZ);
      if (index !== -1) {
        cubeValues.push(scalarField[index]);
      } else {
        // For values outside the grid, ensure continuity by sampling nearby points
        let value = 1.0; // Default to empty space (outside)
        
        // If we're on a boundary, use a different default based on neighboring values
        // This helps create a solid terrain with no gaps
        if (cx < 0 || cx >= sizeX || cy < 0 || cy >= sizeY || cz < 0 || cz >= sizeZ) {
          value = -1.0; // Default to solid for boundary points
          
          // Sample nearby points with padding and use distance-weighted values
          let totalValue = 0;
          let totalWeight = 0;
          
          for (let dz = -padSize; dz <= padSize; dz++) {
            for (let dy = -padSize; dy <= padSize; dy++) {
              for (let dx = -padSize; dx <= padSize; dx++) {
                const sx = cx + dx;
                const sy = cy + dy;
                const sz = cz + dz;
                
                const sampleIndex = this.getScalarFieldIndex(sx, sy, sz, sizeX, sizeY, sizeZ);
                if (sampleIndex !== -1) {
                  // Use inverse distance weighting
                  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                  if (dist < 0.0001) {
                    // If we found an exact match, just use it directly
                    value = scalarField[sampleIndex];
                    totalWeight = 1;
                    break;
                  }
                  
                  const weight = 1 / (1 + dist);
                  totalValue += scalarField[sampleIndex] * weight;
                  totalWeight += weight;
                }
              }
            }
          }
          
          if (totalWeight > 0) {
            value = totalValue / totalWeight;
          }
        }
        
        cubeValues.push(value);
      }
    }

    // Determine the index into the edge table
    let cubeIndex = 0;
    for (let i = 0; i < 8; i++) {
      if (cubeValues[i] < isoLevel) {
        cubeIndex |= 1 << i;
      }
    }

    // If the cube is entirely inside or outside the surface, no triangles
    if (TRIANGLE_TABLE[cubeIndex][0] === -1) return;
    
    // Calculate the vertices where the surface intersects the cube
    const edgeVertices: THREE.Vector3[] = [];
    const edgeNormals: THREE.Vector3[] = [];
    
    // For each edge of the cube
    for (let e = 0; e < 12; e++) {
      // If this edge is crossed by the surface
      if ((TRIANGLE_TABLE[cubeIndex][0] !== -1) && this.edgeCrossed(cubeIndex, e)) {
        const [v1, v2] = EDGES[e];
        const p1 = VERTICES[v1];
        const p2 = VERTICES[v2];
        
        // Linearly interpolate to find where surface crosses edge
        // Ensure we don't divide by zero
        const val1 = cubeValues[v1];
        const val2 = cubeValues[v2];
        let t = 0.5; // Default to midpoint if the values are the same

        if (Math.abs(val1 - val2) > 0.00001) {
          t = (isoLevel - val1) / (val2 - val1);
          
          // Clamp t to avoid vertices being placed outside the edge
          t = Math.max(0.001, Math.min(0.999, t));
        }
        
        // Calculate actual vertex position
        const vx = x + p1[0] + t * (p2[0] - p1[0]);
        const vy = y + p1[1] + t * (p2[1] - p1[1]);
        const vz = z + p1[2] + t * (p2[2] - p1[2]);
        
        // Map position from grid space to world space
        const wx = minX + (vx / (sizeX - 1)) * (maxX - minX);
        const wy = minY + (vy / (sizeY - 1)) * (maxY - minY);
        const wz = minZ + (vz / (sizeZ - 1)) * (maxZ - minZ);
        
        // Calculate normal at this point using a more robust central difference method
        const nx = this.calculateNormal(vx, vy, vz, scalarField, sizeX, sizeY, sizeZ, 0);
        const ny = this.calculateNormal(vx, vy, vz, scalarField, sizeX, sizeY, sizeZ, 1);
        const nz = this.calculateNormal(vx, vy, vz, scalarField, sizeX, sizeY, sizeZ, 2);
        
        // Ensure we have a valid normal (non-zero length)
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const normalizedNx = len > 0.00001 ? nx / len : 0;
        const normalizedNy = len > 0.00001 ? ny / len : 1; // Default to up if normal is zero
        const normalizedNz = len > 0.00001 ? nz / len : 0;
        
        const vertex = new THREE.Vector3(wx, wy, wz);
        const normal = new THREE.Vector3(normalizedNx, normalizedNy, normalizedNz);
        
        edgeVertices[e] = vertex;
        edgeNormals[e] = normal;
      }
    }
    
    // Create the triangles
    for (let i = 0; TRIANGLE_TABLE[cubeIndex][i] !== -1; i += 3) {
      // Create a triangle from these three edges
      const triangleIndices: number[] = [];
      
      for (let j = 0; j < 3; j++) {
        const edge = TRIANGLE_TABLE[cubeIndex][i + j];
        const vertex = edgeVertices[edge];
        const normal = edgeNormals[edge];
        
        if (vertex && normal) {
          // If seamless is enabled, we try to reuse vertices
          if (seamless) {
            // Use a string key based on position for vertex cache
            // We round to a small precision to ensure vertices that are very close get merged
            const precision = 1000; // Adjust based on desired precision
            const vx = Math.round(vertex.x * precision) / precision;
            const vy = Math.round(vertex.y * precision) / precision;
            const vz = Math.round(vertex.z * precision) / precision;
            const key = `${vx},${vy},${vz}`;
            
            // If we already have this vertex, just reference it
            if (this.vertexCache.has(key)) {
              triangleIndices.push(this.vertexCache.get(key)!);
            } else {
              // Otherwise add the new vertex and cache it
              const index = positions.length / 3;
              positions.push(vertex.x, vertex.y, vertex.z);
              normals.push(normal.x, normal.y, normal.z);
              triangleIndices.push(index);
              this.vertexCache.set(key, index);
            }
          } else {
            // Non-seamless mode: just add vertices directly
            const index = positions.length / 3;
            positions.push(vertex.x, vertex.y, vertex.z);
            normals.push(normal.x, normal.y, normal.z);
            triangleIndices.push(index);
          }
        }
      }
      
      // Add the triangle if we have three valid indices
      if (triangleIndices.length === 3) {
        // Add the triangle
        indices.push(triangleIndices[0], triangleIndices[1], triangleIndices[2]);
        
        // If double-sided, add the reverse triangle
        if (doubleSided) {
          indices.push(triangleIndices[2], triangleIndices[1], triangleIndices[0]);
        }
      }
    }
  }

  // Create a debug visualization of the voxel grid
  createDebugVoxels(scalarField: Float32Array, sizeX: number, sizeY: number, sizeZ: number): THREE.Group {
    const { isoLevel } = this.options;
    const { minX, minY, minZ } = this.options.bounds;
    const { maxX, maxY, maxZ } = this.options.bounds;
    const group = new THREE.Group();
    
    // Size of a single voxel
    const voxelWidth = (maxX - minX) / (sizeX - 1);
    const voxelHeight = (maxY - minY) / (sizeY - 1);
    const voxelDepth = (maxZ - minZ) / (sizeZ - 1);
    
    // Scale down the voxels slightly to see gaps better
    const voxelScale = 0.5;
    
    // Create a box geometry for the voxels
    const boxGeometry = new THREE.BoxGeometry(
      voxelWidth * voxelScale, 
      voxelHeight * voxelScale, 
      voxelDepth * voxelScale
    );
    
    // Materials for different voxel states
    const solidMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    
    const emptyMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0000ff, 
      transparent: true,
      opacity: 0.1,
      wireframe: true
    });
    
    const surfaceMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00, 
      transparent: false,
      wireframe: true
    });
    
    // For each voxel in the grid
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = x + y * sizeX + z * sizeX * sizeY;
          const value = scalarField[index];
          
          // Determine if this voxel is on the isosurface
          const isOnSurface = this.isVoxelOnSurface(x, y, z, scalarField, sizeX, sizeY, sizeZ, isoLevel);
          
          // Skip voxels that aren't on the surface if showing all would be too slow
          if (!isOnSurface && sizeX > 32) continue;
          
          // Determine material based on voxel state
          let material;
          if (isOnSurface) {
            material = surfaceMaterial;
          } else if (value < isoLevel) {
            material = solidMaterial;
          } else {
            material = emptyMaterial;
          }
          
          // Create a mesh for this voxel
          const voxel = new THREE.Mesh(boxGeometry, material);
          
          // Position the voxel in world space
          const wx = minX + (x / (sizeX - 1)) * (maxX - minX);
          const wy = minY + (y / (sizeY - 1)) * (maxY - minY);
          const wz = minZ + (z / (sizeZ - 1)) * (maxZ - minZ);
          
          voxel.position.set(wx, wy, wz);
          
          // Add to the group
          group.add(voxel);
        }
      }
    }
    
    return group;
  }
  
  // Check if a voxel is on the isosurface (has corners both above and below the isoLevel)
  private isVoxelOnSurface(
    x: number, y: number, z: number,
    scalarField: Float32Array,
    sizeX: number, sizeY: number, sizeZ: number, 
    isoLevel: number
  ): boolean {
    let hasAbove = false;
    let hasBelow = false;
    
    // Check all 8 corners of the voxel
    for (let i = 0; i < 8; i++) {
      const [vx, vy, vz] = VERTICES[i];
      const cx = x + vx;
      const cy = y + vy;
      const cz = z + vz;
      
      // Skip if out of bounds
      if (cx < 0 || cy < 0 || cz < 0 || cx >= sizeX || cy >= sizeY || cz >= sizeZ) continue;
      
      const index = cx + cy * sizeX + cz * sizeX * sizeY;
      const value = scalarField[index];
      
      if (value < isoLevel) {
        hasBelow = true;
      } else {
        hasAbove = true;
      }
      
      // Early exit if we found both
      if (hasAbove && hasBelow) return true;
    }
    
    return hasAbove && hasBelow;
  }

  // Helper to get scalar field index with bounds checking
  private getScalarFieldIndex(
    x: number, y: number, z: number,
    sizeX: number, sizeY: number, sizeZ: number
  ): number {
    // If outside bounds, return -1
    if (x < 0 || y < 0 || z < 0 || x >= sizeX || y >= sizeY || z >= sizeZ) {
      return -1;
    }
    
    return Math.floor(x) + Math.floor(y) * sizeX + Math.floor(z) * sizeX * sizeY;
  }

  // Check if an edge is crossed by the surface
  private edgeCrossed(cubeIndex: number, edge: number): boolean {
    for (let i = 0; TRIANGLE_TABLE[cubeIndex][i] !== -1; i++) {
      if (TRIANGLE_TABLE[cubeIndex][i] === edge) {
        return true;
      }
    }
    return false;
  }

  // Calculate the gradient (normal) at a given point using a multi-sample approach
  private calculateNormal(
    x: number, y: number, z: number,
    scalarField: Float32Array,
    sizeX: number, sizeY: number, sizeZ: number,
    component: number
  ): number {
    // Use a variable step size based on grid resolution for better quality
    const step = Math.max(1, Math.min(sizeX, sizeY, sizeZ) * 0.05);
    let v1: number, v2: number;
    
    if (component === 0) { // X
      const x1 = Math.max(0, x - step);
      const x2 = Math.min(sizeX - 1, x + step);
      
      v1 = this.sampleScalarFieldSmooth(x1, y, z, scalarField, sizeX, sizeY, sizeZ);
      v2 = this.sampleScalarFieldSmooth(x2, y, z, scalarField, sizeX, sizeY, sizeZ);
      
      // Avoid division by zero for gradient calculation
      if (Math.abs(x2 - x1) < 0.00001) return 0;
      return (v2 - v1) / (x2 - x1);
    }
    else if (component === 1) { // Y
      const y1 = Math.max(0, y - step);
      const y2 = Math.min(sizeY - 1, y + step);
      
      v1 = this.sampleScalarFieldSmooth(x, y1, z, scalarField, sizeX, sizeY, sizeZ);
      v2 = this.sampleScalarFieldSmooth(x, y2, z, scalarField, sizeX, sizeY, sizeZ);
      
      if (Math.abs(y2 - y1) < 0.00001) return 0;
      return (v2 - v1) / (y2 - y1);
    }
    else { // Z
      const z1 = Math.max(0, z - step);
      const z2 = Math.min(sizeZ - 1, z + step);
      
      v1 = this.sampleScalarFieldSmooth(x, y, z1, scalarField, sizeX, sizeY, sizeZ);
      v2 = this.sampleScalarFieldSmooth(x, y, z2, scalarField, sizeX, sizeY, sizeZ);
      
      if (Math.abs(z2 - z1) < 0.00001) return 0;
      return (v2 - v1) / (z2 - z1);
    }
  }

  // Sample the scalar field with smooth interpolation
  private sampleScalarFieldSmooth(
    x: number, y: number, z: number,
    scalarField: Float32Array,
    sizeX: number, sizeY: number, sizeZ: number
  ): number {
    // Trilinear interpolation for smooth sampling
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const x1 = Math.min(x0 + 1, sizeX - 1);
    const y1 = Math.min(y0 + 1, sizeY - 1);
    const z1 = Math.min(z0 + 1, sizeZ - 1);
    
    const xd = x - x0;
    const yd = y - y0;
    const zd = z - z0;
    
    // Get the 8 corner values
    const v000 = this.sampleScalarField(x0, y0, z0, scalarField, sizeX, sizeY, sizeZ);
    const v100 = this.sampleScalarField(x1, y0, z0, scalarField, sizeX, sizeY, sizeZ);
    const v010 = this.sampleScalarField(x0, y1, z0, scalarField, sizeX, sizeY, sizeZ);
    const v110 = this.sampleScalarField(x1, y1, z0, scalarField, sizeX, sizeY, sizeZ);
    const v001 = this.sampleScalarField(x0, y0, z1, scalarField, sizeX, sizeY, sizeZ);
    const v101 = this.sampleScalarField(x1, y0, z1, scalarField, sizeX, sizeY, sizeZ);
    const v011 = this.sampleScalarField(x0, y1, z1, scalarField, sizeX, sizeY, sizeZ);
    const v111 = this.sampleScalarField(x1, y1, z1, scalarField, sizeX, sizeY, sizeZ);
    
    // Interpolate along x
    const v00 = v000 * (1 - xd) + v100 * xd;
    const v01 = v001 * (1 - xd) + v101 * xd;
    const v10 = v010 * (1 - xd) + v110 * xd;
    const v11 = v011 * (1 - xd) + v111 * xd;
    
    // Interpolate along y
    const v0 = v00 * (1 - yd) + v10 * yd;
    const v1 = v01 * (1 - yd) + v11 * yd;
    
    // Interpolate along z
    return v0 * (1 - zd) + v1 * zd;
  }

  // Sample the scalar field with boundary checking
  private sampleScalarField(
    x: number, y: number, z: number,
    scalarField: Float32Array,
    sizeX: number, sizeY: number, sizeZ: number
  ): number {
    x = Math.max(0, Math.min(sizeX - 1, x));
    y = Math.max(0, Math.min(sizeY - 1, y));
    z = Math.max(0, Math.min(sizeZ - 1, z));
    
    const index = Math.floor(x) + Math.floor(y) * sizeX + Math.floor(z) * sizeX * sizeY;
    return scalarField[index];
  }

  // Update options
  updateOptions(options: Partial<MarchingCubesOptions>) {
    this.options = { ...this.options, ...options };
  }

  // Get current options
  getOptions(): MarchingCubesOptions {
    return { ...this.options };
  }
} 