/**
 * Procedural terrain texture generator for Tetris blocks.
 * Creates pixel-art style terrain patterns using canvas,
 * resembling geological cross-sections (water, forest, desert, mountain, lava, etc.)
 */

export type TerrainType = "water" | "forest" | "sand" | "mountain" | "lava" | "ocean" | "clay";

interface TerrainPalette {
  colors: string[];
  // Weight distribution for each color (should sum to ~1)
  weights: number[];
}

const TERRAIN_PALETTES: Record<TerrainType, TerrainPalette> = {
  water: {
    colors: ["#1a6dd4", "#2288ee", "#3399ff", "#1155aa", "#0e4488"],
    weights: [0.3, 0.25, 0.15, 0.2, 0.1],
  },
  forest: {
    colors: ["#1a7a2e", "#2d9940", "#0f5522", "#3ab54e", "#145c1e"],
    weights: [0.3, 0.25, 0.15, 0.2, 0.1],
  },
  sand: {
    colors: ["#c4a030", "#d4b840", "#aa8820", "#e0cc50", "#887018"],
    weights: [0.3, 0.25, 0.15, 0.2, 0.1],
  },
  mountain: {
    colors: ["#8844bb", "#6633aa", "#9955cc", "#553399", "#aa66dd"],
    weights: [0.3, 0.25, 0.15, 0.2, 0.1],
  },
  lava: {
    colors: ["#cc2222", "#aa1818", "#dd3838", "#881010", "#ee4444"],
    weights: [0.3, 0.25, 0.15, 0.2, 0.1],
  },
  ocean: {
    colors: ["#1144aa", "#0d3388", "#1955cc", "#0a2266", "#2266dd"],
    weights: [0.3, 0.25, 0.15, 0.2, 0.1],
  },
  clay: {
    colors: ["#cc6622", "#aa5518", "#dd7733", "#884410", "#ee8844"],
    weights: [0.3, 0.25, 0.15, 0.2, 0.1],
  },
};

// Simple seeded PRNG for deterministic patterns
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate a 2D noise-like value using value noise
function valueNoise(x: number, y: number, seed: number, scale: number): number {
  const sx = Math.floor(x / scale);
  const sy = Math.floor(y / scale);
  const fx = (x / scale) - sx;
  const fy = (y / scale) - sy;

  // Get corner values
  const rng00 = mulberry32(sx * 73856093 + sy * 19349663 + seed);
  const rng10 = mulberry32((sx + 1) * 73856093 + sy * 19349663 + seed);
  const rng01 = mulberry32(sx * 73856093 + (sy + 1) * 19349663 + seed);
  const rng11 = mulberry32((sx + 1) * 73856093 + (sy + 1) * 19349663 + seed);

  const v00 = rng00();
  const v10 = rng10();
  const v01 = rng01();
  const v11 = rng11();

  // Smooth interpolation
  const tx = fx * fx * (3 - 2 * fx);
  const ty = fy * fy * (3 - 2 * fy);

  const v0 = v00 + (v10 - v00) * tx;
  const v1 = v01 + (v11 - v01) * tx;
  return v0 + (v1 - v0) * ty;
}

// Pick color from palette based on noise value
function pickColor(palette: TerrainPalette, noiseVal: number): string {
  let acc = 0;
  for (let i = 0; i < palette.colors.length; i++) {
    acc += palette.weights[i];
    if (noiseVal <= acc) return palette.colors[i];
  }
  return palette.colors[palette.colors.length - 1];
}

// Cache for generated texture data URLs
const textureCache = new Map<string, string>();

/**
 * Generate a terrain texture as a data URL.
 * Uses board-level coordinates for seamless tiling across cells.
 */
export function generateTerrainTexture(
  terrain: TerrainType,
  cellX: number,
  cellY: number,
  cellSize: number,
  seed: number = 42,
): string {
  const cacheKey = `${terrain}-${cellX}-${cellY}-${cellSize}-${seed}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  // Limit cache size
  if (textureCache.size > 500) {
    const firstKey = textureCache.keys().next().value;
    if (firstKey) textureCache.delete(firstKey);
  }

  const canvas = document.createElement("canvas");
  canvas.width = cellSize;
  canvas.height = cellSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const palette = TERRAIN_PALETTES[terrain];
  const pixelScale = Math.max(2, Math.floor(cellSize / 8)); // pixel art granularity

  // Board-level pixel coordinates for seamless effect
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  for (let py = 0; py < cellSize; py += pixelScale) {
    for (let px = 0; px < cellSize; px += pixelScale) {
      const worldX = baseX + px;
      const worldY = baseY + py;

      // Multi-octave noise for organic terrain look
      const n1 = valueNoise(worldX, worldY, seed, pixelScale * 6);
      const n2 = valueNoise(worldX, worldY, seed + 100, pixelScale * 3) * 0.5;
      const n3 = valueNoise(worldX, worldY, seed + 200, pixelScale * 1.5) * 0.25;
      const combined = (n1 + n2 + n3) / 1.75;

      ctx.fillStyle = pickColor(palette, combined);
      ctx.fillRect(px, py, pixelScale, pixelScale);
    }
  }

  const dataUrl = canvas.toDataURL("image/png");
  textureCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Clear the texture cache (call on game reset or cell size change).
 */
export function clearTerrainCache(): void {
  textureCache.clear();
}

/** Map PieceType to terrain type */
export const PIECE_TERRAIN_MAP: Record<string, TerrainType> = {
  I: "water",
  O: "sand",
  T: "mountain",
  S: "forest",
  Z: "lava",
  J: "ocean",
  L: "clay",
};

/** Terrain-aware block border colors for beveled 3D effect */
export const TERRAIN_BORDERS: Record<TerrainType, { hi: string; lo: string }> = {
  water:    { hi: "#4499ee", lo: "#0a3366" },
  forest:   { hi: "#44bb55", lo: "#0a3312" },
  sand:     { hi: "#ddcc55", lo: "#665510" },
  mountain: { hi: "#aa66dd", lo: "#331166" },
  lava:     { hi: "#ee5555", lo: "#550808" },
  ocean:    { hi: "#3366cc", lo: "#061a44" },
  clay:     { hi: "#ee8844", lo: "#552200" },
};
