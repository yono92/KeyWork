/**
 * WebGL2 물 셰이더 렌더러.
 * 그리드를 RGBA 텍스처로 올려 색상 보간 + 물 효과 적용.
 */
import { SAND_COLS, SAND_ROWS, GRAIN_SCALE } from "./sandPhysics";
import type { SandGrid } from "./sandPhysics";
import { PIECES, CELL_COLORS } from "../hooks/useTetrisEngine";
import type { ActivePiece, PieceType } from "../hooks/useTetrisEngine";

const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_grid;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_gridSize;

// 노이즈 함수
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 물결 왜곡
vec2 waterDistort(vec2 uv, float t) {
    float s = 0.006;
    float dx = sin(uv.y * 15.0 + t * 2.5) * s + sin(uv.y * 7.0 - t * 1.8) * s * 0.5;
    float dy = cos(uv.x * 12.0 + t * 2.0) * s * 0.6 + cos(uv.x * 20.0 - t * 3.0) * s * 0.3;
    return uv + vec2(dx, dy);
}

void main() {
    float t = u_time;
    vec2 uv = v_uv;
    vec2 texel = 1.0 / u_gridSize;

    // 물결 왜곡
    vec2 distUv = waterDistort(uv, t);

    // 현재 픽셀 색상 (LINEAR 보간으로 이미 부드러움)
    vec4 center = texture(u_grid, distUv);

    // 추가 블러 (3x3 가우시안)
    vec4 blurred = center * 0.25;
    blurred += texture(u_grid, distUv + vec2(-texel.x, 0.0)) * 0.125;
    blurred += texture(u_grid, distUv + vec2(texel.x, 0.0)) * 0.125;
    blurred += texture(u_grid, distUv + vec2(0.0, -texel.y)) * 0.125;
    blurred += texture(u_grid, distUv + vec2(0.0, texel.y)) * 0.125;
    blurred += texture(u_grid, distUv + vec2(-texel.x, -texel.y)) * 0.0625;
    blurred += texture(u_grid, distUv + vec2(texel.x, -texel.y)) * 0.0625;
    blurred += texture(u_grid, distUv + vec2(-texel.x, texel.y)) * 0.0625;
    blurred += texture(u_grid, distUv + vec2(texel.x, texel.y)) * 0.0625;

    float alpha = blurred.a;

    if (alpha < 0.01) {
        // 빈 공간 — 어두운 물속 배경 + 코스틱
        float n = noise(uv * 6.0 + vec2(t * 0.3, t * 0.2));
        float caust = noise(uv * 10.0 + vec2(sin(t * 0.5) * 2.0, cos(t * 0.4) * 2.0));
        float bg = 0.02 + n * 0.015 + caust * 0.01;
        fragColor = vec4(bg * 0.5, bg * 0.8, bg * 1.5, 1.0);
        return;
    }

    vec3 color = blurred.rgb / max(alpha, 0.01);

    // 물 깊이 기반 밝기
    float depth = uv.y;
    color *= 0.85 + depth * 0.15;

    // 코스틱 (물 내부 빛 패턴)
    float caust = noise(uv * 8.0 + vec2(t * 0.6, -t * 0.4)) * 0.15;
    color += vec3(caust * 0.5, caust * 0.7, caust);

    // 물 표면 감지 (위쪽이 빈 공간이면 표면)
    float above = texture(u_grid, uv + vec2(0.0, -texel.y * 3.0)).a;
    if (above < 0.1 && alpha > 0.3) {
        // 표면 하이라이트 — 물 반사
        float wave = sin(uv.x * 40.0 + t * 4.0) * 0.5 + 0.5;
        float highlight = wave * 0.35;
        color += vec3(highlight * 0.8, highlight * 0.9, highlight);
        // 프레넬 (표면 가장자리 밝게)
        color += vec3(0.08, 0.12, 0.18);
    }

    // 스페큘러 하이라이트 (이동하는 빛)
    vec2 lightPos = vec2(0.35 + sin(t * 0.4) * 0.25, 0.15 + cos(t * 0.3) * 0.1);
    float specDist = distance(uv, lightPos);
    float spec = smoothstep(0.2, 0.0, specDist) * 0.25 * alpha;
    color += vec3(spec);

    // 물 투명도
    float waterAlpha = 0.75 + alpha * 0.25;

    // 고스트 피스 처리 (alpha < 0.5인 영역)
    if (center.a > 0.01 && center.a < 0.3) {
        color = center.rgb / max(center.a, 0.01);
        waterAlpha = 0.12;
    }

    // 플래시 (흰색)
    if (center.r > 0.95 && center.g > 0.95 && center.b > 0.95 && center.a > 0.9) {
        color = vec3(1.0);
        waterAlpha = 0.95;
    }

    fragColor = vec4(color, waterAlpha);
}`;

// ─── 색상 캐시 ───
const PIECE_RGB: Record<string, [number, number, number]> = {};
function getPieceRGB(type: PieceType): [number, number, number] {
    if (!PIECE_RGB[type]) {
        const c = CELL_COLORS[type];
        PIECE_RGB[type] = [
            parseInt(c.face.slice(1, 3), 16),
            parseInt(c.face.slice(3, 5), 16),
            parseInt(c.face.slice(5, 7), 16),
        ];
    }
    return PIECE_RGB[type];
}

export interface WaterGL {
    gl: WebGL2RenderingContext;
    program: WebGLProgram;
    gridTex: WebGLTexture;
    gridData: Uint8Array; // RGBA
    locs: {
        u_grid: WebGLUniformLocation;
        u_time: WebGLUniformLocation;
        u_resolution: WebGLUniformLocation;
        u_gridSize: WebGLUniformLocation;
    };
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(`Shader compile: ${log}`);
    }
    return s;
}

export function initWaterGL(canvas: HTMLCanvasElement): WaterGL | null {
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return null;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program link: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    // 풀스크린 쿼드
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // RGBA 텍스처 (색상 보간 가능)
    const gridTex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gridTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const gridData = new Uint8Array(SAND_COLS * SAND_ROWS * 4);

    const locs = {
        u_grid: gl.getUniformLocation(program, "u_grid")!,
        u_time: gl.getUniformLocation(program, "u_time")!,
        u_resolution: gl.getUniformLocation(program, "u_resolution")!,
        u_gridSize: gl.getUniformLocation(program, "u_gridSize")!,
    };
    gl.uniform1i(locs.u_grid, 0);
    gl.uniform2f(locs.u_gridSize, SAND_COLS, SAND_ROWS);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return { gl, program, gridTex, gridData, locs };
}

function writeCell(data: Uint8Array, idx: number, r: number, g: number, b: number, a: number) {
    const off = idx * 4;
    data[off] = r;
    data[off + 1] = g;
    data[off + 2] = b;
    data[off + 3] = a;
}

export function updateAndRender(
    wgl: WaterGL,
    grid: SandGrid,
    activePiece: ActivePiece | null,
    ghostY: number,
    flashGrid: Uint8Array | null,
    running: boolean,
    gameOver: boolean,
    settling: boolean,
    time: number,
    canvasW: number,
    canvasH: number,
) {
    const { gl, gridTex, gridData, locs } = wgl;

    // 그리드 → RGBA 인코딩
    gridData.fill(0);

    for (let y = 0; y < SAND_ROWS; y++) {
        const row = grid[y];
        const rowOff = y * SAND_COLS;
        for (let x = 0; x < SAND_COLS; x++) {
            const g = row[x];
            if (g === null) continue;
            const [r, gr, b] = getPieceRGB(g);
            writeCell(gridData, rowOff + x, r, gr, b, 255);
        }
    }

    // 플래시 오버레이
    if (flashGrid) {
        for (let i = 0; i < SAND_COLS * SAND_ROWS; i++) {
            if (flashGrid[i]) writeCell(gridData, i, 255, 255, 255, 240);
        }
    }

    // 활성 피스
    if (activePiece && running && !gameOver) {
        const [pr, pg, pb] = getPieceRGB(activePiece.type);
        for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
            const cx = activePiece.x + dx;
            const cy = activePiece.y + dy;
            for (let gy = 0; gy < GRAIN_SCALE; gy++) {
                for (let gx = 0; gx < GRAIN_SCALE; gx++) {
                    const sy = cy * GRAIN_SCALE + gy;
                    const sx = cx * GRAIN_SCALE + gx;
                    if (sy >= 0 && sy < SAND_ROWS && sx >= 0 && sx < SAND_COLS) {
                        writeCell(gridData, sy * SAND_COLS + sx, pr, pg, pb, 255);
                    }
                }
            }
        }
        // 고스트
        if (!settling) {
            for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
                const cx = activePiece.x + dx;
                const cy = ghostY + dy;
                for (let gy = 0; gy < GRAIN_SCALE; gy++) {
                    for (let gx = 0; gx < GRAIN_SCALE; gx++) {
                        const sy = cy * GRAIN_SCALE + gy;
                        const sx = cx * GRAIN_SCALE + gx;
                        if (sy >= 0 && sy < SAND_ROWS && sx >= 0 && sx < SAND_COLS) {
                            const idx = sy * SAND_COLS + sx;
                            if (gridData[idx * 4 + 3] === 0) {
                                writeCell(gridData, idx, pr, pg, pb, 40);
                            }
                        }
                    }
                }
            }
        }
    }

    // 텍스처 업로드
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gridTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SAND_COLS, SAND_ROWS, 0, gl.RGBA, gl.UNSIGNED_BYTE, gridData);

    gl.uniform1f(locs.u_time, time / 1000);
    gl.uniform2f(locs.u_resolution, canvasW, canvasH);

    gl.viewport(0, 0, canvasW, canvasH);
    gl.clearColor(0.01, 0.02, 0.04, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
