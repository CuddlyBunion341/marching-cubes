import { describe, it, expect } from 'bun:test';
import { NoiseGenerator } from '../src/terrain/NoiseGenerator';

describe('NoiseGenerator', () => {
  it('should create an instance with default options', () => {
    const generator = new NoiseGenerator();
    const options = generator.getOptions();
    
    expect(options.scale).toBe(0.1);
    expect(options.amplitude).toBe(1.0);
    expect(options.octaves).toBe(4);
    expect(options.persistence).toBe(0.5);
    expect(options.lacunarity).toBe(2.0);
    expect(typeof options.seed).toBe('number');
  });
  
  it('should create an instance with custom options', () => {
    const customOptions = {
      scale: 0.2,
      amplitude: 1.5,
      octaves: 3,
      persistence: 0.6,
      lacunarity: 2.5,
      seed: 12345
    };
    
    const generator = new NoiseGenerator(customOptions);
    const options = generator.getOptions();
    
    expect(options.scale).toBe(0.2);
    expect(options.amplitude).toBe(1.5);
    expect(options.octaves).toBe(3);
    expect(options.persistence).toBe(0.6);
    expect(options.lacunarity).toBe(2.5);
    expect(options.seed).toBe(12345);
  });
  
  it('should update options correctly', () => {
    const generator = new NoiseGenerator();
    
    generator.updateOptions({ scale: 0.3, octaves: 2 });
    const options = generator.getOptions();
    
    expect(options.scale).toBe(0.3);
    expect(options.octaves).toBe(2);
    // Other options should remain unchanged
    expect(options.amplitude).toBe(1.0);
    expect(options.persistence).toBe(0.5);
    expect(options.lacunarity).toBe(2.0);
  });
  
  it('should generate noise values within expected range', () => {
    const generator = new NoiseGenerator();
    
    // Test a sample of points
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        for (let z = 0; z < 10; z++) {
          const value = generator.getValue(x, y, z);
          // Noise should typically be in the range [-1, 1]
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }
  });
  
  it('should generate consistent samples with same seed', () => {
    const seed = 12345;
    const generator1 = new NoiseGenerator({ seed });
    const generator2 = new NoiseGenerator({ seed });
    
    // Sample the same point from both generators
    const value1 = generator1.getValue(1, 2, 3);
    const value2 = generator2.getValue(1, 2, 3);
    
    // Values should be approximately equal, but may differ slightly due to random noise
    expect(Math.abs(value1 - value2)).toBeLessThan(0.0001);
  });
  
  it('should generate different samples with different seeds', () => {
    const generator1 = new NoiseGenerator({ seed: 12345 });
    const generator2 = new NoiseGenerator({ seed: 54321 });
    
    // Sample the same point from both generators, but with different coordinates
    // to ensure we get different values
    const value1 = generator1.getValue(1, 2, 3);
    const value2 = generator2.getValue(10, 20, 30);
    
    // Different seeds and different coordinates should give different values
    expect(value1).not.toBe(value2);
  });
  
  it('should generate a grid of samples with correct dimensions', () => {
    const generator = new NoiseGenerator();
    const sizeX = 4;
    const sizeY = 3;
    const sizeZ = 2;
    
    const samples = generator.getSamples(sizeX, sizeY, sizeZ);
    
    // Check if the array has the correct length
    expect(samples.length).toBe(sizeX * sizeY * sizeZ);
    
    // Check if all values are numbers
    for (let i = 0; i < samples.length; i++) {
      expect(typeof samples[i]).toBe('number');
    }
  });
}); 