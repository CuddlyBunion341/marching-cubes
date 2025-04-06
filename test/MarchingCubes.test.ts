import { describe, it, expect } from 'bun:test';
import { MarchingCubes } from '../src/terrain/marchingCubes';
import * as THREE from 'three';

describe('MarchingCubes', () => {
  it('should create an instance with default options', () => {
    const mesher = new MarchingCubes();
    const options = mesher.getOptions();
    
    expect(options.resolution).toBe(32);
    expect(options.size).toBe(50);
    expect(options.isoLevel).toBe(0.0);
    expect(options.bounds.minX).toBe(-1);
    expect(options.bounds.maxX).toBe(1);
    expect(options.bounds.minY).toBe(-1);
    expect(options.bounds.maxY).toBe(1);
    expect(options.bounds.minZ).toBe(-1);
    expect(options.bounds.maxZ).toBe(1);
  });
  
  it('should create an instance with custom options', () => {
    const customOptions = {
      resolution: 64,
      size: 100,
      isoLevel: 0.5,
      bounds: {
        minX: -5, maxX: 5,
        minY: -5, maxY: 5,
        minZ: -5, maxZ: 5
      }
    };
    
    const mesher = new MarchingCubes(customOptions);
    const options = mesher.getOptions();
    
    expect(options.resolution).toBe(64);
    expect(options.size).toBe(100);
    expect(options.isoLevel).toBe(0.5);
    expect(options.bounds.minX).toBe(-5);
    expect(options.bounds.maxX).toBe(5);
    expect(options.bounds.minY).toBe(-5);
    expect(options.bounds.maxY).toBe(5);
    expect(options.bounds.minZ).toBe(-5);
    expect(options.bounds.maxZ).toBe(5);
  });
  
  it('should update options correctly', () => {
    const mesher = new MarchingCubes();
    
    mesher.updateOptions({ 
      resolution: 48, 
      isoLevel: 0.25,
      bounds: { 
        minX: -2, maxX: 2,
        minY: -1, maxY: 1,
        minZ: -1, maxZ: 1
      }
    });
    
    const options = mesher.getOptions();
    
    expect(options.resolution).toBe(48);
    expect(options.isoLevel).toBe(0.25);
    expect(options.bounds.minX).toBe(-2);
    expect(options.bounds.maxX).toBe(2);
    // Other bounds should remain unchanged
    expect(options.bounds.minY).toBe(-1);
    expect(options.bounds.maxY).toBe(1);
    expect(options.bounds.minZ).toBe(-1);
    expect(options.bounds.maxZ).toBe(1);
  });
  
  it('should generate mesh from scalar field', () => {
    const mesher = new MarchingCubes();
    const sizeX = 4;
    const sizeY = 4;
    const sizeZ = 4;
    
    // Create a simple scalar field for testing
    // A sphere centered at (2,2,2) with radius 1.5
    const scalarField = new Float32Array(sizeX * sizeY * sizeZ);
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const dx = x - 2;
          const dy = y - 2;
          const dz = z - 2;
          const distSq = dx*dx + dy*dy + dz*dz;
          const index = x + y * sizeX + z * sizeX * sizeY;
          
          // Distance from center (2,2,2), negative inside sphere
          scalarField[index] = Math.sqrt(distSq) - 1.5;
        }
      }
    }
    
    const geometry = mesher.generateMesh(scalarField, sizeX, sizeY, sizeZ);
    
    // Check if the geometry is valid
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    
    // Check if vertices were generated
    const positionAttribute = geometry.getAttribute('position');
    expect(positionAttribute).toBeTruthy();
    expect(positionAttribute.count).toBeGreaterThan(0);
    
    // Check if normals were generated
    const normalAttribute = geometry.getAttribute('normal');
    expect(normalAttribute).toBeTruthy();
    expect(normalAttribute.count).toBeGreaterThan(0);
    
    // Check if indices were generated
    const indices = geometry.getIndex();
    expect(indices).toBeTruthy();
    expect(indices!.count).toBeGreaterThan(0);
  });
}); 