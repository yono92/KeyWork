/**
 * WebGL2 물 셰이더 렌더러.
 * 그리드를 저해상도로 다운샘플 + 블러하여 부드러운 물 표면 생성.
 */
import { SAND_COLS, SAND_ROWS, GRAIN_SCALE } from "./sandPhysics";
import type { SandGrid } from "./sandPhysics";
import { PIECES, CELL_COLORS } from "../hooks/useTetrisEngine";
import type { ActivePiece, PieceType } from "../hooks/useTetrisEngine";

// 저해상도 텍스처 크기 (부드러운 물 효과용)
const TEX_W = 60; // SAND_COLS / 2
const TEX_H = 120; // SAND_ROWS / 2
const SAMPLE_W = SAND_COLS / TEX_W; // 2
const SAMPLE_H = SAND_ROWS / TEX_H; // 2

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

uniform sampler2D u_water;
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    v += noise(p) * 0.5;
    v += noise(p * 2.0) * 0.25;
    v += noise(p * 4.0) * 0.125;
    return v;
}

void main() {
    float t = u_time;
    vec2 uv = v_uv;
    vec2 texel = vec2(1.0 / 60.0, 1.0 / 120.0);

    // 물결 왜곡 (강하게)
    float distX = sin(uv.y * 12.0 + t * 2.0) * 0.008 + sin(uv.y * 25.0 + t * 3.5) * 0.003;
    float distY = cos(uv.x * 10.0 + t * 1.5) * 0.005 + cos(uv.x * 20.0 - t * 2.5) * 0.002;
    vec2 distUv = uv + vec2(distX, distY);

    // 넓은 블러 (5x5, 큰 반경) — 부드러운 물 표면
    float br = 2.5; // blur radius in texels
    vec2 bs = texel * br;
    vec4 col = vec4(0.0);
    float tw = 0.0;
    for (float dy = -2.0; dy <= 2.0; dy += 1.0) {
        for (float dx = -2.0; dx <= 2.0; dx += 1.0) {
            float w = exp(-(dx*dx + dy*dy) / 3.0);
            col += texture(u_water, distUv + vec2(dx, dy) * bs) * w;
            tw += w;
        }
    }
    col /= tw;

    float alpha = col.a;

    if (alpha < 0.05) {
        // 빈 공간 — 깊은 바다 배경
        float n = fbm(uv * 4.0 + vec2(t * 0.1));
        float bg = 0.015 + n * 0.02;
        fragColor = vec4(bg * 0.4, bg * 0.7, bg * 1.2, 1.0);
        return;
    }

    vec3 waterColor = col.rgb / max(alpha, 0.05);

    // 깊이 기반 색상 조정
    float depth = uv.y;
    waterColor *= 0.8 + depth * 0.2;

    // 코스틱 (물속 빛 무늬)
    float caust1 = fbm(uv * 6.0 + vec2(t * 0.3, -t * 0.2));
    float caust2 = fbm(uv * 8.0 + vec2(-t * 0.25, t * 0.35));
    float caustic = (caust1 + caust2) * 0.12;
    waterColor += vec3(caustic * 0.4, caustic * 0.6, caustic);

    // 물 표면 감지 (위쪽이 빈 공간)
    float aboveAlpha = texture(u_water, uv + vec2(0.0, -texel.y * 5.0)).a;
    if (aboveAlpha < 0.1 && alpha > 0.2) {
        // 물 표면 — 반사 하이라이트
        float wave1 = sin(uv.x * 50.0 + t * 5.0) * 0.5 + 0.5;
        float wave2 = sin(uv.x * 30.0 - t * 3.0) * 0.5 + 0.5;
        float surfaceHighlight = wave1 * wave2 * 0.4;
        waterColor += vec3(surfaceHighlight * 0.6, surfaceHighlight * 0.8, surfaceHighlight);

        // 프레넬 효과 (표면 밝게)
        waterColor += vec3(0.06, 0.1, 0.15);
    }

    // 글로벌 스페큘러 (빛 반사)
    vec2 lp = vec2(0.3 + sin(t * 0.3) * 0.2, 0.1 + cos(t * 0.2) * 0.08);
    float sd = distance(uv, lp);
    float spec = smoothstep(0.25, 0.0, sd) * 0.2 * alpha;
    waterColor += vec3(spec * 0.8, spec * 0.9, spec);

    // 가장자리 부드러운 투명도 (물 경계)
    float edgeAlpha = smoothstep(0.05, 0.3, alpha);
    float waterAlpha = edgeAlpha * (0.8 + alpha * 0.2);

    // 고스트 피스 (매우 투명)
    if (alpha > 0.01 && alpha < 0.2) {
        waterColor = col.rgb / max(alpha, 0.01);
        waterAlpha = alpha * 0.5;
    }

    // 플래시 (순백)
    if (col.r / max(col.a, 0.01) > 0.95 && col.g / max(col.a, 0.01) > 0.95 && col.a > 0.8) {
        waterColor = vec3(1.0);
        waterAlpha = 0.95;
    }

    fragColor = vec4(waterColor, waterAlpha);
}`;

// ─── 색상 ───
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
    waterTex: WebGLTexture;
    hiResData: Uint8Array;  // SAND_COLS * SAND_ROWS * 4
    texData: Uint8Array;    // TEX_W * TEX_H * 4
    locs: Record<string, WebGLUniformLocation>;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(`Shader: ${log}`);
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
        throw new Error(`Link: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const waterTex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waterTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const locs: Record<string, WebGLUniformLocation> = {};
    for (const name of ["u_water", "u_time", "u_resolution"]) {
        locs[name] = gl.getUniformLocation(program, name)!;
    }
    gl.uniform1i(locs.u_water, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return {
        gl, program, waterTex,
        hiResData: new Uint8Array(SAND_COLS * SAND_ROWS * 4),
        texData: new Uint8Array(TEX_W * TEX_H * 4),
        locs,
    };
}

function writePixel(data: Uint8Array, idx: number, r: number, g: number, b: number, a: number) {
    const off = idx * 4;
    data[off] = r; data[off + 1] = g; data[off + 2] = b; data[off + 3] = a;
}

/** 고해상도 → 저해상도 다운샘플 (평균) */
function downsample(src: Uint8Array, dst: Uint8Array) {
    for (let ty = 0; ty < TEX_H; ty++) {
        for (let tx = 0; tx < TEX_W; tx++) {
            let r = 0, g = 0, b = 0, a = 0;
            const sy = ty * SAMPLE_H;
            const sx = tx * SAMPLE_W;
            for (let dy = 0; dy < SAMPLE_H; dy++) {
                for (let dx = 0; dx < SAMPLE_W; dx++) {
                    const off = ((sy + dy) * SAND_COLS + (sx + dx)) * 4;
                    r += src[off]; g += src[off + 1]; b += src[off + 2]; a += src[off + 3];
                }
            }
            const n = SAMPLE_W * SAMPLE_H;
            const doff = (ty * TEX_W + tx) * 4;
            dst[doff] = r / n; dst[doff + 1] = g / n; dst[doff + 2] = b / n; dst[doff + 3] = a / n;
        }
    }
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
    const { gl, waterTex, hiResData, texData, locs } = wgl;

    // 고해상도 RGBA 인코딩
    hiResData.fill(0);
    for (let y = 0; y < SAND_ROWS; y++) {
        const row = grid[y];
        const rowOff = y * SAND_COLS;
        for (let x = 0; x < SAND_COLS; x++) {
            const g = row[x];
            if (g === null) continue;
            const [r, gr, b] = getPieceRGB(g);
            writePixel(hiResData, rowOff + x, r, gr, b, 255);
        }
    }

    if (flashGrid) {
        for (let i = 0; i < SAND_COLS * SAND_ROWS; i++) {
            if (flashGrid[i]) writePixel(hiResData, i, 255, 255, 255, 240);
        }
    }

    if (activePiece && running && !gameOver) {
        const [pr, pg, pb] = getPieceRGB(activePiece.type);
        for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
            for (let gy = 0; gy < GRAIN_SCALE; gy++) {
                for (let gx = 0; gx < GRAIN_SCALE; gx++) {
                    const sy = (activePiece.y + dy) * GRAIN_SCALE + gy;
                    const sx = (activePiece.x + dx) * GRAIN_SCALE + gx;
                    if (sy >= 0 && sy < SAND_ROWS && sx >= 0 && sx < SAND_COLS) {
                        writePixel(hiResData, sy * SAND_COLS + sx, pr, pg, pb, 255);
                    }
                }
            }
        }
        if (!settling) {
            for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
                for (let gy = 0; gy < GRAIN_SCALE; gy++) {
                    for (let gx = 0; gx < GRAIN_SCALE; gx++) {
                        const sy = (ghostY + dy) * GRAIN_SCALE + gy;
                        const sx = (activePiece.x + dx) * GRAIN_SCALE + gx;
                        if (sy >= 0 && sy < SAND_ROWS && sx >= 0 && sx < SAND_COLS) {
                            const idx = sy * SAND_COLS + sx;
                            if (hiResData[idx * 4 + 3] === 0) {
                                writePixel(hiResData, idx, pr, pg, pb, 40);
                            }
                        }
                    }
                }
            }
        }
    }

    // 저해상도 다운샘플
    downsample(hiResData, texData);

    // 텍스처 업로드
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waterTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEX_W, TEX_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, texData);

    gl.uniform1f(locs.u_time, time / 1000);
    gl.uniform2f(locs.u_resolution, canvasW, canvasH);

    gl.viewport(0, 0, canvasW, canvasH);
    gl.clearColor(0.01, 0.02, 0.04, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
