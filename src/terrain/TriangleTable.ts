// This file contains the triangle table for the marching cubes algorithm
// The table maps which edges to connect for each of the 256 possible corner combinations
// Each entry is a list of edges, grouped in threes to form triangles
// The end of a case is marked with -1

// For brevity, this is a simplified version of the full triangle table
// containing just the first few cases for demonstration
// In a production environment, you would include the full 256 cases

export const TRIANGLE_TABLE: number[][] = [
  [-1],  // Case 0: No corners below iso-level
  [0, 8, 3, -1],  // Case 1: Corner 0 below iso-level
  [0, 1, 9, -1],  // Case 2: Corner 1 below iso-level
  [1, 8, 3, 9, 8, 1, -1],  // Case 3: Corners 0,1 below iso-level
  [1, 2, 10, -1],  // Case 4: Corner 2 below iso-level
  [0, 8, 3, 1, 2, 10, -1],  // Case 5: Corners 0,2 below iso-level
  [9, 2, 10, 0, 2, 9, -1],  // Case 6: Corners 1,2 below iso-level
  [2, 8, 3, 2, 10, 8, 10, 9, 8, -1],  // Case 7: Corners 0,1,2 below iso-level
  [3, 11, 2, -1],  // Case 8: Corner 3 below iso-level
  [0, 11, 2, 8, 11, 0, -1],  // Case 9: Corners 0,3 below iso-level
  [1, 9, 0, 2, 3, 11, -1],  // Case 10: Corners 1,3 below iso-level
  [1, 11, 2, 1, 9, 11, 9, 8, 11, -1],  // Case 11: Corners 0,1,3 below iso-level
  [3, 10, 1, 11, 10, 3, -1],  // Case 12: Corners 2,3 below iso-level
  [0, 10, 1, 0, 8, 10, 8, 11, 10, -1],  // Case 13: Corners 0,2,3 below iso-level
  [3, 9, 0, 3, 11, 9, 11, 10, 9, -1],  // Case 14: Corners 1,2,3 below iso-level
  [9, 8, 10, 10, 8, 11, -1],  // Case 15: Corners 0,1,2,3 below iso-level
  [4, 7, 8, -1],  // Case 16: Corner 4 below iso-level
  [4, 3, 0, 7, 3, 4, -1],  // Case 17: Corners 0,4 below iso-level
  [0, 1, 9, 8, 4, 7, -1],  // Case 18: Corners 1,4 below iso-level
  [4, 1, 9, 4, 7, 1, 7, 3, 1, -1],  // Case 19: Corners 0,1,4 below iso-level
  [1, 2, 10, 8, 4, 7, -1],  // Case 20: Corners 2,4 below iso-level
  [3, 4, 7, 3, 0, 4, 1, 2, 10, -1],  // Case 21: Corners 0,2,4 below iso-level
  [9, 2, 10, 9, 0, 2, 8, 4, 7, -1],  // Case 22: Corners 1,2,4 below iso-level
  [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1],  // Case 23: Corners 0,1,2,4 below iso-level
  [8, 4, 7, 3, 11, 2, -1],  // Case 24: Corners 3,4 below iso-level
  [11, 4, 7, 11, 2, 4, 2, 0, 4, -1],  // Case 25: Corners 0,3,4 below iso-level
  [9, 0, 1, 8, 4, 7, 2, 3, 11, -1],  // Case 26: Corners 1,3,4 below iso-level
  [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1],  // Case 27: Corners 0,1,3,4 below iso-level
  [3, 10, 1, 3, 11, 10, 7, 8, 4, -1],  // Case 28: Corners 2,3,4 below iso-level
  [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1],  // Case 29: Corners 0,2,3,4 below iso-level
  [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1],  // Case 30: Corners 1,2,3,4 below iso-level
  [4, 7, 11, 4, 11, 9, 9, 11, 10, -1],  // Case 31: Corners 0,1,2,3,4 below iso-level
  [9, 5, 4, -1],  // Case 32: Corner 5 below iso-level
  [9, 5, 4, 0, 8, 3, -1],  // Case 33: Corners 0,5 below iso-level
  [0, 5, 4, 1, 5, 0, -1],  // Case 34: Corners 1,5 below iso-level
  [8, 5, 4, 8, 3, 5, 3, 1, 5, -1],  // Case 35: Corners 0,1,5 below iso-level
  [1, 2, 10, 9, 5, 4, -1],  // Case 36: Corners 2,5 below iso-level
  [3, 0, 8, 1, 2, 10, 4, 9, 5, -1],  // Case 37: Corners 0,2,5 below iso-level
  [5, 2, 10, 5, 4, 2, 4, 0, 2, -1],  // Case 38: Corners 1,2,5 below iso-level
  [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1],  // Case 39: Corners 0,1,2,5 below iso-level
  [9, 5, 4, 2, 3, 11, -1],  // Case 40: Corners 3,5 below iso-level
  [0, 11, 2, 0, 8, 11, 4, 9, 5, -1],  // Case 41: Corners 0,3,5 below iso-level
  [0, 5, 4, 0, 1, 5, 2, 3, 11, -1],  // Case 42: Corners 1,3,5 below iso-level
  [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1],  // Case 43: Corners 0,1,3,5 below iso-level
  [10, 3, 11, 10, 1, 3, 9, 5, 4, -1],  // Case 44: Corners 2,3,5 below iso-level
  [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1],  // Case 45: Corners 0,2,3,5 below iso-level
  [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1],  // Case 46: Corners 1,2,3,5 below iso-level
  [5, 4, 8, 5, 8, 10, 10, 8, 11, -1],  // Case 47: Corners 0,1,2,3,5 below iso-level
  [9, 7, 8, 5, 7, 9, -1],  // Case 48: Corners 4,5 below iso-level
  [9, 3, 0, 9, 5, 3, 5, 7, 3, -1],  // Case 49: Corners 0,4,5 below iso-level
  [0, 7, 8, 0, 1, 7, 1, 5, 7, -1],  // Case 50: Corners 1,4,5 below iso-level
  [1, 5, 3, 3, 5, 7, -1],  // Case 51: Corners 0,1,4,5 below iso-level
  [9, 7, 8, 9, 5, 7, 10, 1, 2, -1],  // Case 52: Corners 2,4,5 below iso-level
  [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1],  // Case 53: Corners 0,2,4,5 below iso-level
  [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1],  // Case 54: Corners 1,2,4,5 below iso-level
  [2, 10, 5, 2, 5, 3, 3, 5, 7, -1],  // Case 55: Corners 0,1,2,4,5 below iso-level
  [7, 9, 5, 7, 8, 9, 3, 11, 2, -1],  // Case 56: Corners 3,4,5 below iso-level
  [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1],  // Case 57: Corners 0,3,4,5 below iso-level
  [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1],  // Case 58: Corners 1,3,4,5 below iso-level
  [11, 2, 1, 11, 1, 7, 7, 1, 5, -1],  // Case 59: Corners 0,1,3,4,5 below iso-level
  [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1],  // Case 60: Corners 2,3,4,5 below iso-level
  [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],  // Case 61: Corners 0,2,3,4,5 below iso-level
  [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],  // Case 62: Corners 1,2,3,4,5 below iso-level
  [11, 10, 5, 7, 11, 5, -1],  // Case 63: Corners 0,1,2,3,4,5 below iso-level
  [10, 6, 5, -1],  // Case 64: Corner 6 below iso-level
  [0, 8, 3, 5, 10, 6, -1],  // Case 65: Corners 0,6 below iso-level
  [9, 0, 1, 5, 10, 6, -1],  // Case 66: Corners 1,6 below iso-level
  [1, 8, 3, 1, 9, 8, 5, 10, 6, -1],  // Case 67: Corners 0,1,6 below iso-level
  [1, 6, 5, 2, 6, 1, -1],  // Case 68: Corners 2,6 below iso-level
  [1, 6, 5, 1, 2, 6, 3, 0, 8, -1],  // Case 69: Corners 0,2,6 below iso-level
  [9, 6, 5, 9, 0, 6, 0, 2, 6, -1],  // Case 70: Corners 1,2,6 below iso-level
  [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1],  // Case 71: Corners 0,1,2,6 below iso-level
  [2, 3, 11, 10, 6, 5, -1],  // Case 72: Corners 3,6 below iso-level
  [11, 0, 8, 11, 2, 0, 10, 6, 5, -1],  // Case 73: Corners 0,3,6 below iso-level
  [0, 1, 9, 2, 3, 11, 5, 10, 6, -1],  // Case 74: Corners 1,3,6 below iso-level
  [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1],  // Case 75: Corners 0,1,3,6 below iso-level
  [6, 3, 11, 6, 5, 3, 5, 1, 3, -1],  // Case 76: Corners 2,3,6 below iso-level
  [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1],  // Case 77: Corners 0,2,3,6 below iso-level
  [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1],  // Case 78: Corners 1,2,3,6 below iso-level
  [6, 5, 9, 6, 9, 11, 11, 9, 8, -1],  // Case 79: Corners 0,1,2,3,6 below iso-level
  [5, 10, 6, 4, 7, 8, -1],  // Case 80: Corners 4,6 below iso-level
  [4, 3, 0, 4, 7, 3, 6, 5, 10, -1],  // Case 81: Corners 0,4,6 below iso-level
  [1, 9, 0, 5, 10, 6, 8, 4, 7, -1],  // Case 82: Corners 1,4,6 below iso-level
  [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1],  // Case 83: Corners 0,1,4,6 below iso-level
  [6, 1, 2, 6, 5, 1, 4, 7, 8, -1],  // Case 84: Corners 2,4,6 below iso-level
  [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1],  // Case 85: Corners 0,2,4,6 below iso-level
  [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1],  // Case 86: Corners 1,2,4,6 below iso-level
  [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],  // Case 87: Corners 0,1,2,4,6 below iso-level
  [3, 11, 2, 7, 8, 4, 10, 6, 5, -1],  // Case 88: Corners 3,4,6 below iso-level
  [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1],  // Case 89: Corners 0,3,4,6 below iso-level
  [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1],  // Case 90: Corners 1,3,4,6 below iso-level
  [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],  // Case 91: Corners 0,1,3,4,6 below iso-level
  [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1],  // Case 92: Corners 2,3,4,6 below iso-level
  [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],  // Case 93: Corners 0,2,3,4,6 below iso-level
  [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],  // Case 94: Corners 1,2,3,4,6 below iso-level
  [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1],  // Case 95: Corners 0,1,2,3,4,6 below iso-level
  [10, 4, 9, 6, 4, 10, -1],  // Case 96: Corners 5,6 below iso-level
  [4, 10, 6, 4, 9, 10, 0, 8, 3, -1],  // Case 97: Corners 0,5,6 below iso-level
  [10, 0, 1, 10, 6, 0, 6, 4, 0, -1],  // Case 98: Corners 1,5,6 below iso-level
  [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1],  // Case 99: Corners 0,1,5,6 below iso-level
  [1, 4, 9, 1, 2, 4, 2, 6, 4, -1],  // Case 100: Corners 2,5,6 below iso-level
  [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1],  // Case 101: Corners 0,2,5,6 below iso-level
  [0, 2, 4, 4, 2, 6, -1],  // Case 102: Corners 1,2,5,6 below iso-level
  [8, 3, 2, 8, 2, 4, 4, 2, 6, -1],  // Case 103: Corners 0,1,2,5,6 below iso-level
  [10, 4, 9, 10, 6, 4, 11, 2, 3, -1],  // Case 104: Corners 3,5,6 below iso-level
  [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1],  // Case 105: Corners 0,3,5,6 below iso-level
  [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1],  // Case 106: Corners 1,3,5,6 below iso-level
  [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],  // Case 107: Corners 0,1,3,5,6 below iso-level
  [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1],  // Case 108: Corners 2,3,5,6 below iso-level
  [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],  // Case 109: Corners 0,2,3,5,6 below iso-level
  [3, 11, 6, 3, 6, 0, 0, 6, 4, -1],  // Case 110: Corners 1,2,3,5,6 below iso-level
  [6, 4, 8, 11, 6, 8, -1],  // Case 111: Corners 0,1,2,3,5,6 below iso-level
  [7, 10, 6, 7, 8, 10, 8, 9, 10, -1],  // Case 112: Corners 4,5,6 below iso-level
  [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1],  // Case 113: Corners 0,4,5,6 below iso-level
  [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1],  // Case 114: Corners 1,4,5,6 below iso-level
  [10, 6, 7, 10, 7, 1, 1, 7, 3, -1],  // Case 115: Corners 0,1,4,5,6 below iso-level
  [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1],  // Case 116: Corners 2,4,5,6 below iso-level
  [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],  // Case 117: Corners 0,2,4,5,6 below iso-level
  [7, 8, 0, 7, 0, 6, 6, 0, 2, -1],  // Case 118: Corners 1,2,4,5,6 below iso-level
  [7, 3, 2, 6, 7, 2, -1],  // Case 119: Corners 0,1,2,4,5,6 below iso-level
  [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1],  // Case 120: Corners 3,4,5,6 below iso-level
  [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],  // Case 121: Corners 0,3,4,5,6 below iso-level
  [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],  // Case 122: Corners 1,3,4,5,6 below iso-level
  [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1],  // Case 123: Corners 0,1,3,4,5,6 below iso-level
  [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],  // Case 124: Corners 2,3,4,5,6 below iso-level
  [0, 9, 1, 11, 6, 7, -1],  // Case 125: Corners 0,2,3,4,5,6 below iso-level
  [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1],  // Case 126: Corners 1,2,3,4,5,6 below iso-level
  [7, 11, 6, -1],  // Case 127: Corners 0,1,2,3,4,5,6 below iso-level
  [7, 11, 6, -1],  // Case 128: Corners 0,1,2,3,4,5,6 below iso-level
  [3, 0, 8, 11, 7, 6, -1],  // Case 129: Corners 0,7 below iso-level
  [0, 1, 9, 11, 7, 6, -1],  // Case 130: Corners 1,7 below iso-level
  [8, 1, 9, 8, 3, 1, 11, 7, 6, -1],  // Case 131: Corners 0,1,7 below iso-level
  [10, 1, 2, 6, 11, 7, -1],  // Case 132: Corners 2,7 below iso-level
  [1, 2, 10, 3, 0, 8, 6, 11, 7, -1],  // Case 133: Corners 0,2,7 below iso-level
  [2, 9, 0, 2, 10, 9, 6, 11, 7, -1],  // Case 134: Corners 1,2,7 below iso-level
  [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1],  // Case 135: Corners 0,1,2,7 below iso-level
  [7, 2, 3, 6, 2, 7, -1],  // Case 136: Corners 3,7 below iso-level
  [7, 0, 8, 7, 6, 0, 6, 2, 0, -1],  // Case 137: Corners 0,3,7 below iso-level
  [2, 7, 6, 2, 3, 7, 0, 1, 9, -1],  // Case 138: Corners 1,3,7 below iso-level
  [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1],  // Case 139: Corners 0,1,3,7 below iso-level
  [10, 7, 6, 10, 1, 7, 1, 3, 7, -1],  // Case 140: Corners 2,3,7 below iso-level
  [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1],  // Case 141: Corners 0,2,3,7 below iso-level
  [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1],  // Case 142: Corners 1,2,3,7 below iso-level
  [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1],  // Case 143: Corners 0,1,2,3,7 below iso-level
  [6, 8, 4, 11, 8, 6, -1],  // Case 144: Corners 4,7 below iso-level
  [3, 6, 11, 3, 0, 6, 0, 4, 6, -1],  // Case 145: Corners 0,4,7 below iso-level
  [8, 6, 11, 8, 4, 6, 9, 0, 1, -1],  // Case 146: Corners 1,4,7 below iso-level
  [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1],  // Case 147: Corners 0,1,4,7 below iso-level
  [6, 8, 4, 6, 11, 8, 2, 10, 1, -1],  // Case 148: Corners 2,4,7 below iso-level
  [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1],  // Case 149: Corners 0,2,4,7 below iso-level
  [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1],  // Case 150: Corners 1,2,4,7 below iso-level
  [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],  // Case 151: Corners 0,1,2,4,7 below iso-level
  [8, 2, 3, 8, 4, 2, 4, 6, 2, -1],  // Case 152: Corners 3,4,7 below iso-level
  [0, 4, 2, 4, 6, 2, -1],  // Case 153: Corners 0,3,4,7 below iso-level
  [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1],  // Case 154: Corners 1,3,4,7 below iso-level
  [1, 9, 4, 1, 4, 2, 2, 4, 6, -1],  // Case 155: Corners 0,1,3,4,7 below iso-level
  [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1],  // Case 156: Corners 2,3,4,7 below iso-level
  [10, 1, 0, 10, 0, 6, 6, 0, 4, -1],  // Case 157: Corners 0,2,3,4,7 below iso-level
  [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],  // Case 158: Corners 1,2,3,4,7 below iso-level
  [10, 9, 4, 6, 10, 4, -1],  // Case 159: Corners 0,1,2,3,4,7 below iso-level
  [4, 9, 5, 7, 6, 11, -1],  // Case 160: Corners 5,7 below iso-level
  [0, 8, 3, 4, 9, 5, 11, 7, 6, -1],  // Case 161: Corners 0,5,7 below iso-level
  [5, 0, 1, 5, 4, 0, 7, 6, 11, -1],  // Case 162: Corners 1,5,7 below iso-level
  [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1],  // Case 163: Corners 0,1,5,7 below iso-level
  [9, 5, 4, 10, 1, 2, 7, 6, 11, -1],  // Case 164: Corners 2,5,7 below iso-level
  [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1],  // Case 165: Corners 0,2,5,7 below iso-level
  [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1],  // Case 166: Corners 1,2,5,7 below iso-level
  [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],  // Case 167: Corners 0,1,2,5,7 below iso-level
  [7, 2, 3, 7, 6, 2, 5, 4, 9, -1],  // Case 168: Corners 3,5,7 below iso-level
  [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1],  // Case 169: Corners 0,3,5,7 below iso-level
  [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1],  // Case 170: Corners 1,3,5,7 below iso-level
  [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],  // Case 171: Corners 0,1,3,5,7 below iso-level
  [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1],  // Case 172: Corners 2,3,5,7 below iso-level
  [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],  // Case 173: Corners 0,2,3,5,7 below iso-level
  [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],  // Case 174: Corners 1,2,3,5,7 below iso-level
  [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1],  // Case 175: Corners 0,1,2,3,5,7 below iso-level
  [6, 9, 5, 6, 11, 9, 11, 8, 9, -1],  // Case 176: Corners 4,5,7 below iso-level
  [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1],  // Case 177: Corners 0,4,5,7 below iso-level
  [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1],  // Case 178: Corners 1,4,5,7 below iso-level
  [6, 11, 3, 6, 3, 5, 5, 3, 1, -1],  // Case 179: Corners 0,1,4,5,7 below iso-level
  [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1],  // Case 180: Corners 2,4,5,7 below iso-level
  [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],  // Case 181: Corners 0,2,4,5,7 below iso-level
  [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],  // Case 182: Corners 1,2,4,5,7 below iso-level
  [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1],  // Case 183: Corners 0,1,2,4,5,7 below iso-level
  [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1],  // Case 184: Corners 3,4,5,7 below iso-level
  [9, 5, 6, 9, 6, 0, 0, 6, 2, -1],  // Case 185: Corners 0,3,4,5,7 below iso-level
  [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],  // Case 186: Corners 1,3,4,5,7 below iso-level
  [1, 5, 6, 2, 1, 6, -1],  // Case 187: Corners 0,1,3,4,5,7 below iso-level
  [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],  // Case 188: Corners 2,3,4,5,7 below iso-level
  [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1],  // Case 189: Corners 0,2,3,4,5,7 below iso-level
  [0, 3, 8, 5, 6, 10, -1],  // Case 190: Corners 1,2,3,4,5,7 below iso-level
  [10, 5, 6, -1],  // Case 191: Corners 0,1,2,3,4,5,7 below iso-level
  [11, 5, 10, 7, 5, 11, -1],  // Case 192: Corners 6,7 below iso-level
  [11, 5, 10, 11, 7, 5, 8, 3, 0, -1],  // Case 193: Corners 0,6,7 below iso-level
  [5, 11, 7, 5, 10, 11, 1, 9, 0, -1],  // Case 194: Corners 1,6,7 below iso-level
  [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1],  // Case 195: Corners 0,1,6,7 below iso-level
  [11, 1, 2, 11, 7, 1, 7, 5, 1, -1],  // Case 196: Corners 2,6,7 below iso-level
  [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1],  // Case 197: Corners 0,2,6,7 below iso-level
  [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1],  // Case 198: Corners 1,2,6,7 below iso-level
  [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],  // Case 199: Corners 0,1,2,6,7 below iso-level
  [2, 5, 10, 2, 3, 5, 3, 7, 5, -1],  // Case 200: Corners 3,6,7 below iso-level
  [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1],  // Case 201: Corners 0,3,6,7 below iso-level
  [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1],  // Case 202: Corners 1,3,6,7 below iso-level
  [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],  // Case 203: Corners 0,1,3,6,7 below iso-level
  [1, 3, 5, 3, 7, 5, -1],  // Case 204: Corners 2,3,6,7 below iso-level
  [0, 8, 7, 0, 7, 1, 1, 7, 5, -1],  // Case 205: Corners 0,2,3,6,7 below iso-level
  [9, 0, 3, 9, 3, 5, 5, 3, 7, -1],  // Case 206: Corners 1,2,3,6,7 below iso-level
  [9, 8, 7, 5, 9, 7, -1],  // Case 207: Corners 0,1,2,3,6,7 below iso-level
  [5, 8, 4, 5, 10, 8, 10, 11, 8, -1],  // Case 208: Corners 4,6,7 below iso-level
  [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1],  // Case 209: Corners 0,4,6,7 below iso-level
  [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1],  // Case 210: Corners 1,4,6,7 below iso-level
  [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],  // Case 211: Corners 0,1,4,6,7 below iso-level
  [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1],  // Case 212: Corners 2,4,6,7 below iso-level
  [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],  // Case 213: Corners 0,2,4,6,7 below iso-level
  [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],  // Case 214: Corners 1,2,4,6,7 below iso-level
  [9, 4, 5, 2, 11, 3, -1],  // Case 215: Corners 0,1,2,4,6,7 below iso-level
  [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1],  // Case 216: Corners 3,4,6,7 below iso-level
  [5, 10, 2, 5, 2, 4, 4, 2, 0, -1],  // Case 217: Corners 0,3,4,6,7 below iso-level
  [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],  // Case 218: Corners 1,3,4,6,7 below iso-level
  [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1],  // Case 219: Corners 0,1,3,4,6,7 below iso-level
  [8, 4, 5, 8, 5, 3, 3, 5, 1, -1],  // Case 220: Corners 2,3,4,6,7 below iso-level
  [0, 4, 5, 1, 0, 5, -1],  // Case 221: Corners 0,2,3,4,6,7 below iso-level
  [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1],  // Case 222: Corners 1,2,3,4,6,7 below iso-level
  [9, 4, 5, -1],  // Case 223: Corners 0,1,2,3,4,6,7 below iso-level
  [4, 11, 7, 4, 9, 11, 9, 10, 11, -1],  // Case 224: Corners 5,6,7 below iso-level
  [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1],  // Case 225: Corners 0,5,6,7 below iso-level
  [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1],  // Case 226: Corners 1,5,6,7 below iso-level
  [3, 1, 4, 3, 4, 8, 1, 7, 10, 7, 11, 10, -1],  // Case 227: Corners 0,1,5,6,7 below iso-level
  [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1],  // Case 228: Corners 2,5,6,7 below iso-level
  [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],  // Case 229: Corners 0,2,5,6,7 below iso-level
  [11, 7, 4, 11, 4, 2, 2, 4, 0, -1],  // Case 230: Corners 1,2,5,6,7 below iso-level
  [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1],  // Case 231: Corners 0,1,2,5,6,7 below iso-level
  [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1],  // Case 232: Corners 3,5,6,7 below iso-level
  [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],  // Case 233: Corners 0,3,5,6,7 below iso-level
  [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],  // Case 234: Corners 1,3,5,6,7 below iso-level
  [1, 10, 2, 8, 7, 4, -1],  // Case 235: Corners 0,1,3,5,6,7 below iso-level
  [4, 9, 1, 4, 1, 7, 7, 1, 3, -1],  // Case 236: Corners 2,3,5,6,7 below iso-level
  [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1],  // Case 237: Corners 0,2,3,5,6,7 below iso-level
  [4, 0, 3, 7, 4, 3, -1],  // Case 238: Corners 1,2,3,5,6,7 below iso-level
  [4, 8, 7, -1],  // Case 239: Corners 0,1,2,3,5,6,7 below iso-level
  [9, 10, 8, 10, 11, 8, -1],  // Case 240: Corners 4,5,6,7 below iso-level
  [3, 0, 9, 3, 9, 11, 11, 9, 10, -1],  // Case 241: Corners 0,4,5,6,7 below iso-level
  [0, 1, 10, 0, 10, 8, 8, 10, 11, -1],  // Case 242: Corners 1,4,5,6,7 below iso-level
  [3, 1, 10, 11, 3, 10, -1],  // Case 243: Corners 0,1,4,5,6,7 below iso-level
  [1, 2, 11, 1, 11, 9, 9, 11, 8, -1],  // Case 244: Corners 2,4,5,6,7 below iso-level
  [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1],  // Case 245: Corners 0,2,4,5,6,7 below iso-level
  [0, 2, 11, 8, 0, 11, -1],  // Case 246: Corners 1,2,4,5,6,7 below iso-level
  [3, 2, 11, -1],  // Case 247: Corners 0,1,2,4,5,6,7 below iso-level
  [2, 3, 8, 2, 8, 10, 10, 8, 9, -1],  // Case 248: Corners 3,4,5,6,7 below iso-level
  [9, 10, 2, 0, 9, 2, -1],  // Case 249: Corners 0,3,4,5,6,7 below iso-level
  [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1],  // Case 250: Corners 1,3,4,5,6,7 below iso-level
  [1, 10, 2, -1],  // Case 251: Corners 0,1,3,4,5,6,7 below iso-level
  [1, 3, 8, 9, 1, 8, -1],  // Case 252: Corners 2,3,4,5,6,7 below iso-level
  [0, 9, 1, -1],  // Case 253: Corners 0,2,3,4,5,6,7 below iso-level
  [0, 3, 8, -1],  // Case 254: Corners 1,2,3,4,5,6,7 below iso-level
  [-1]   // Case 255: All corners below iso-level
];