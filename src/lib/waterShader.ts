/**
 * WebGL2 물 셰이더 렌더러.
 * 모래 그리드를 GPU 텍스처로 올려 fragment shader에서 물 효과 적용.
 */
import { SAND_COLS, SAND_ROWS, GRAIN_SCALE } from "./sandPhysics";
import type { SandGrid, PieceType } from "./sandPhysics";
import { PIECES, CELL_COLORS } from "../hooks/useTetrisEngine";
import type { ActivePiece } from "../hooks/useTetrisEngine";

// ─── 셰이더 소스 ───

const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y; // 상하 반전
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_grid;        // 그리드 텍스처 (R = type 0-8)
uniform float u_time;
uniform vec2 u_resolution;       // canvas 픽셀 크기
uniform vec2 u_gridSize;         // SAND_COLS, SAND_ROWS
uniform vec3 u_colors[8];       // type 1-7 색상 + type 8 (flash=white)
uniform float u_grainScale;     // GRAIN_SCALE

// 물결 왜곡
vec2 waterDistort(vec2 uv, float t) {
    float strength = 0.003;
    float freq = 12.0;
    float dx = sin(uv.y * freq + t * 2.0) * strength;
    float dy = cos(uv.x * freq * 1.3 + t * 1.7) * strength * 0.7;
    return uv + vec2(dx, dy);
}

// 코스틱 패턴
float caustics(vec2 uv, float t) {
    vec2 p = uv * 8.0;
    float c = 0.0;
    c += sin(p.x * 3.1 + t * 1.2) * sin(p.y * 2.7 + t * 0.9);
    c += sin(p.x * 1.7 - t * 0.8) * sin(p.y * 3.3 + t * 1.1);
    return c * 0.5 + 0.5;
}

// 스페큘러 하이라이트
float specular(vec2 uv, float t) {
    vec2 lightPos = vec2(0.3 + sin(t * 0.5) * 0.2, 0.2 + cos(t * 0.3) * 0.1);
    float d = distance(uv, lightPos);
    return smoothstep(0.15, 0.0, d) * 0.4;
}

void main() {
    vec2 uv = v_uv;

    // 물결 왜곡 적용
    vec2 distorted = waterDistort(uv, u_time);

    // 그리드 좌표 → 텍스처 샘플
    float typeVal = texture(u_grid, distorted).r * 255.0;
    int typeInt = int(typeVal + 0.5);

    if (typeInt == 0) {
        // 빈칸 — 어두운 배경 + 미세한 코스틱
        float c = caustics(uv, u_time) * 0.03;
        fragColor = vec4(0.01 + c, 0.03 + c, 0.06 + c * 1.5, 1.0);
        return;
    }

    // 색상 가져오기
    vec3 baseColor;
    if (typeInt == 9) {
        // 고스트 피스
        baseColor = vec3(0.3, 0.5, 0.7);
        fragColor = vec4(baseColor, 0.15);
        return;
    }
    if (typeInt >= 1 && typeInt <= 8) {
        baseColor = u_colors[typeInt - 1];
    } else {
        baseColor = vec3(1.0);
    }

    // 인접 알갱이 색상 보간 (부드러운 물 느낌)
    vec2 texel = 1.0 / u_gridSize;
    float tL = texture(u_grid, distorted + vec2(-texel.x, 0.0)).r * 255.0;
    float tR = texture(u_grid, distorted + vec2(texel.x, 0.0)).r * 255.0;
    float tU = texture(u_grid, distorted + vec2(0.0, -texel.y)).r * 255.0;
    float tD = texture(u_grid, distorted + vec2(0.0, texel.y)).r * 255.0;

    // 가장자리 감지 (빈칸과 인접하면 표면)
    bool isSurface = (int(tL + 0.5) == 0 || int(tR + 0.5) == 0 ||
                      int(tU + 0.5) == 0 || int(tD + 0.5) == 0);

    // 물 효과
    float depth = uv.y; // 위=0, 아래=1
    float alpha = 0.7 + depth * 0.3; // 위쪽 투명, 아래쪽 불투명

    // 코스틱 (물 내부)
    float caust = caustics(uv, u_time);
    vec3 color = baseColor * (0.85 + caust * 0.2);

    // 표면 하이라이트 (빈칸과 접하는 부분)
    if (isSurface) {
        float highlight = 0.15 + sin(uv.x * 30.0 + u_time * 3.0) * 0.08;
        color += vec3(highlight);
        alpha = max(alpha - 0.1, 0.5);
    }

    // 스페큘러
    float spec = specular(uv, u_time);
    color += vec3(spec);

    // 플래시 (type 8)
    if (typeInt == 8) {
        color = vec3(1.0);
        alpha = 0.9;
    }

    fragColor = vec4(color, alpha);
}`;

// ─── WebGL 상태 ───

export interface WaterGL {
    gl: WebGL2RenderingContext;
    program: WebGLProgram;
    gridTex: WebGLTexture;
    gridData: Uint8Array;
    locs: {
        u_grid: WebGLUniformLocation;
        u_time: WebGLUniformLocation;
        u_resolution: WebGLUniformLocation;
        u_gridSize: WebGLUniformLocation;
        u_colors: WebGLUniformLocation;
        u_grainScale: WebGLUniformLocation;
    };
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(`Shader compile error: ${log}`);
    }
    return s;
}

export function initWaterGL(canvas: HTMLCanvasElement): WaterGL | null {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) return null;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    // 풀스크린 쿼드
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // 그리드 텍스처
    const gridTex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gridTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const gridData = new Uint8Array(SAND_COLS * SAND_ROWS);

    // Uniforms
    const locs = {
        u_grid: gl.getUniformLocation(program, "u_grid")!,
        u_time: gl.getUniformLocation(program, "u_time")!,
        u_resolution: gl.getUniformLocation(program, "u_resolution")!,
        u_gridSize: gl.getUniformLocation(program, "u_gridSize")!,
        u_colors: gl.getUniformLocation(program, "u_colors")!,
        u_grainScale: gl.getUniformLocation(program, "u_grainScale")!,
    };

    gl.uniform1i(locs.u_grid, 0);
    gl.uniform2f(locs.u_gridSize, SAND_COLS, SAND_ROWS);
    gl.uniform1f(locs.u_grainScale, GRAIN_SCALE);

    // 색상 업로드 (7 piece colors + 1 flash white)
    const PIECE_ORDER: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
    const colorArr = new Float32Array(24); // 8 * 3
    PIECE_ORDER.forEach((p, i) => {
        const c = CELL_COLORS[p];
        const r = parseInt(c.face.slice(1, 3), 16) / 255;
        const g = parseInt(c.face.slice(3, 5), 16) / 255;
        const b = parseInt(c.face.slice(5, 7), 16) / 255;
        colorArr[i * 3] = r;
        colorArr[i * 3 + 1] = g;
        colorArr[i * 3 + 2] = b;
    });
    // flash = white
    colorArr[21] = 1; colorArr[22] = 1; colorArr[23] = 1;
    gl.uniform3fv(locs.u_colors, colorArr);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return { gl, program, gridTex, gridData, locs };
}

const PIECE_MAP: Record<string, number> = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };

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

    // 그리드 → Uint8Array 인코딩
    for (let y = 0; y < SAND_ROWS; y++) {
        const row = grid[y];
        const offset = y * SAND_COLS;
        for (let x = 0; x < SAND_COLS; x++) {
            const g = row[x];
            gridData[offset + x] = g ? PIECE_MAP[g] : 0;
        }
    }

    // 플래시 그리드 오버레이
    if (flashGrid) {
        for (let i = 0; i < gridData.length; i++) {
            if (flashGrid[i]) gridData[i] = 8; // flash type
        }
    }

    // 활성 피스 오버레이
    if (activePiece && running && !gameOver) {
        const typeNum = PIECE_MAP[activePiece.type];
        for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
            const cx = activePiece.x + dx;
            const cy = activePiece.y + dy;
            // 셀 영역을 그리드에 씀
            for (let gy = 0; gy < GRAIN_SCALE; gy++) {
                for (let gx = 0; gx < GRAIN_SCALE; gx++) {
                    const sy = cy * GRAIN_SCALE + gy;
                    const sx = cx * GRAIN_SCALE + gx;
                    if (sy >= 0 && sy < SAND_ROWS && sx >= 0 && sx < SAND_COLS) {
                        gridData[sy * SAND_COLS + sx] = typeNum;
                    }
                }
            }
        }
        // 고스트 피스
        if (!settling) {
            for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
                const cx = activePiece.x + dx;
                const cy = ghostY + dy;
                for (let gy = 0; gy < GRAIN_SCALE; gy++) {
                    for (let gx = 0; gx < GRAIN_SCALE; gx++) {
                        const sy = cy * GRAIN_SCALE + gy;
                        const sx = cx * GRAIN_SCALE + gx;
                        if (sy >= 0 && sy < SAND_ROWS && sx >= 0 && sx < SAND_COLS && gridData[sy * SAND_COLS + sx] === 0) {
                            gridData[sy * SAND_COLS + sx] = 9; // ghost
                        }
                    }
                }
            }
        }
    }

    // 텍스처 업로드
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gridTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, SAND_COLS, SAND_ROWS, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, gridData);

    // Uniforms
    gl.uniform1f(locs.u_time, time / 1000);
    gl.uniform2f(locs.u_resolution, canvasW, canvasH);

    // Viewport + draw
    gl.viewport(0, 0, canvasW, canvasH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
