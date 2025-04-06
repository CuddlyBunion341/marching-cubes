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
}

export class MarchingCubes {
  private options: MarchingCubesOptions;

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
      ...options
    };
  }

  // Generate a mesh from a 3D scalar field
  generateMesh(scalarField: Float32Array, sizeX: number, sizeY: number, sizeZ: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    // For each cell in our grid
    for (let z = 0; z < sizeZ - 1; z++) {
      for (let y = 0; y < sizeY - 1; y++) {
        for (let x = 0; x < sizeX - 1; x++) {
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
    const { isoLevel } = this.options;
    const { minX, minY, minZ } = this.options.bounds;
    const { maxX, maxY, maxZ } = this.options.bounds;
    const size = this.options.size;

    // Get scalar values at the eight corners of the cube
    const cubeValues: number[] = [];
    for (let i = 0; i < 8; i++) {
      const [vx, vy, vz] = VERTICES[i];
      const cx = x + vx;
      const cy = y + vy;
      const cz = z + vz;
      
      if (cx < 0 || cy < 0 || cz < 0 || cx >= sizeX || cy >= sizeY || cz >= sizeZ) {
        cubeValues.push(0);
      } else {
        const index = cx + cy * sizeX + cz * sizeX * sizeY;
        cubeValues.push(scalarField[index]);
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
    const edgeVertices: number[][] = [];
    const edgeNormals: number[][] = [];
    
    // For each edge of the cube
    for (let e = 0; e < 12; e++) {
      // If this edge is crossed by the surface
      if ((TRIANGLE_TABLE[cubeIndex][0] !== -1) && this.edgeCrossed(cubeIndex, e)) {
        const [v1, v2] = EDGES[e];
        const p1 = VERTICES[v1];
        const p2 = VERTICES[v2];
        
        // Linearly interpolate to find where surface crosses edge
        const t = (isoLevel - cubeValues[v1]) / (cubeValues[v2] - cubeValues[v1]);
        
        // Calculate actual vertex position
        const vx = x + p1[0] + t * (p2[0] - p1[0]);
        const vy = y + p1[1] + t * (p2[1] - p1[1]);
        const vz = z + p1[2] + t * (p2[2] - p1[2]);
        
        // Map position from grid space to world space
        const wx = minX + (vx / (sizeX - 1)) * (maxX - minX);
        const wy = minY + (vy / (sizeY - 1)) * (maxY - minY);
        const wz = minZ + (vz / (sizeZ - 1)) * (maxZ - minZ);
        
        // Calculate normal at this point
        const nx = this.calculateNormal(vx, vy, vz, scalarField, sizeX, sizeY, sizeZ, 0);
        const ny = this.calculateNormal(vx, vy, vz, scalarField, sizeX, sizeY, sizeZ, 1);
        const nz = this.calculateNormal(vx, vy, vz, scalarField, sizeX, sizeY, sizeZ, 2);
        
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const normalizedNx = len > 0 ? nx / len : 0;
        const normalizedNy = len > 0 ? ny / len : 0;
        const normalizedNz = len > 0 ? nz / len : 0;
        
        edgeVertices[e] = [wx, wy, wz];
        edgeNormals[e] = [normalizedNx, normalizedNy, normalizedNz];
      }
    }
    
    // Create the triangles
    for (let i = 0; TRIANGLE_TABLE[cubeIndex][i] !== -1; i += 3) {
      const vertexIndex = positions.length / 3;
      
      // Add vertices and normals for each triangle edge
      for (let j = 0; j < 3; j++) {
        const edge = TRIANGLE_TABLE[cubeIndex][i + j];
        const vertex = edgeVertices[edge];
        const normal = edgeNormals[edge];
        
        if (vertex && normal) {
          positions.push(...vertex);
          normals.push(...normal);
          indices.push(vertexIndex + j);
        }
      }
    }
  }

  // Check if an edge is crossed by the surface
  private edgeCrossed(cubeIndex: number, edge: number): boolean {
    let edgeMask = 1 << edge;
    for (let i = 0; TRIANGLE_TABLE[cubeIndex][i] !== -1; i++) {
      if (TRIANGLE_TABLE[cubeIndex][i] === edge) {
        return true;
      }
    }
    return false;
  }

  // Calculate the gradient (normal) at a given point
  private calculateNormal(
    x: number, y: number, z: number,
    scalarField: Float32Array,
    sizeX: number, sizeY: number, sizeZ: number,
    component: number
  ): number {
    const step = 1;
    let v1: number, v2: number;
    
    if (component === 0) { // X
      const x1 = Math.max(0, Math.floor(x - step));
      const x2 = Math.min(sizeX - 1, Math.floor(x + step));
      
      v1 = this.sampleScalarField(x1, Math.floor(y), Math.floor(z), scalarField, sizeX, sizeY, sizeZ);
      v2 = this.sampleScalarField(x2, Math.floor(y), Math.floor(z), scalarField, sizeX, sizeY, sizeZ);
    }
    else if (component === 1) { // Y
      const y1 = Math.max(0, Math.floor(y - step));
      const y2 = Math.min(sizeY - 1, Math.floor(y + step));
      
      v1 = this.sampleScalarField(Math.floor(x), y1, Math.floor(z), scalarField, sizeX, sizeY, sizeZ);
      v2 = this.sampleScalarField(Math.floor(x), y2, Math.floor(z), scalarField, sizeX, sizeY, sizeZ);
    }
    else { // Z
      const z1 = Math.max(0, Math.floor(z - step));
      const z2 = Math.min(sizeZ - 1, Math.floor(z + step));
      
      v1 = this.sampleScalarField(Math.floor(x), Math.floor(y), z1, scalarField, sizeX, sizeY, sizeZ);
      v2 = this.sampleScalarField(Math.floor(x), Math.floor(y), z2, scalarField, sizeX, sizeY, sizeZ);
    }
    
    // Return the gradient
    return v1 - v2;
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