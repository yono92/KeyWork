/**
 * WebGL2 물 셰이더 — density field + threshold + normal-based lighting.
 * 2D 물 게임에서 사용하는 표준 기법:
 * 1. 그리드 → density/color 텍스처 (블러)
 * 2. density threshold로 물/빈칸 경계 생성
 * 3. density gradient → 노멀 벡터 → 라이팅/반사
 */
import { SAND_COLS, SAND_ROWS, GRAIN_SCALE } from "./sandPhysics";
import type { SandGrid } from "./sandPhysics";
import { PIECES, CELL_COLORS } from "../hooks/useTetrisEngine";
import type { ActivePiece, PieceType } from "../hooks/useTetrisEngine";

// 텍스처 크기 (원본의 1/2)
const TEX_W = SAND_COLS / 2;
const TEX_H = SAND_ROWS / 2;

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
uniform vec2 u_texSize;

// ─── 유틸 ───
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

// ─── density 샘플 (alpha 채널) ───
float getDensity(vec2 uv) {
    return texture(u_water, uv).a;
}

// ─── 노멀 계산 (density gradient) ───
vec3 getNormal(vec2 uv, vec2 texel) {
    float s = 2.0; // 샘플 간격 배수
    float l = getDensity(uv - vec2(texel.x * s, 0.0));
    float r = getDensity(uv + vec2(texel.x * s, 0.0));
    float u = getDensity(uv - vec2(0.0, texel.y * s));
    float d = getDensity(uv + vec2(0.0, texel.y * s));
    vec3 n = normalize(vec3(l - r, u - d, 0.3));
    return n;
}

void main() {
    float t = u_time;
    vec2 uv = v_uv;
    vec2 texel = 1.0 / u_texSize;

    // ─── 1. density + color 샘플 (블러) ───
    vec4 col = vec4(0.0);
    float totalW = 0.0;
    for (float dy = -2.0; dy <= 2.0; dy += 1.0) {
        for (float dx = -2.0; dx <= 2.0; dx += 1.0) {
            float w = exp(-(dx*dx + dy*dy) / 2.5);
            col += texture(u_water, uv + vec2(dx, dy) * texel * 1.5) * w;
            totalW += w;
        }
    }
    col /= totalW;

    float density = col.a;

    // ─── 2. 배경 (빈 공간) ───
    if (density < 0.08) {
        // 깊은 바다 배경
        float n1 = noise(uv * 5.0 + vec2(t * 0.15, t * 0.1));
        float n2 = noise(uv * 8.0 + vec2(-t * 0.1, t * 0.15));
        float bg = 0.01 + (n1 + n2) * 0.008;
        fragColor = vec4(bg * 0.3, bg * 0.6, bg * 1.2, 1.0);
        return;
    }

    // ─── 3. 물 표면 threshold ───
    float waterMask = smoothstep(0.08, 0.25, density);

    // ─── 4. 노멀 기반 라이팅 ───
    vec3 normal = getNormal(uv, texel);

    // 물결 노멀 추가 (시간 기반 파동)
    float waveNx = sin(uv.x * 40.0 + t * 3.0) * 0.15 + sin(uv.y * 25.0 + t * 2.0) * 0.08;
    float waveNy = cos(uv.y * 35.0 + t * 2.5) * 0.12 + cos(uv.x * 20.0 - t * 1.5) * 0.06;
    normal = normalize(normal + vec3(waveNx, waveNy, 0.0) * 0.3);

    // 광원 방향
    vec3 lightDir = normalize(vec3(0.3, -0.5, 1.0));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);

    // 디퓨즈
    float diff = max(dot(normal, lightDir), 0.0) * 0.4 + 0.6;

    // 스페큘러 (광택)
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.6;

    // 프레넬 (가장자리 밝게 — 물의 특성)
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.4;

    // ─── 5. 물 색상 ───
    vec3 baseColor = col.rgb / max(density, 0.1);

    // 깊이에 따른 색조
    baseColor *= diff;
    baseColor += vec3(spec * 0.7, spec * 0.85, spec); // 스페큘러 (약간 파란)
    baseColor += vec3(fresnel * 0.3, fresnel * 0.5, fresnel * 0.7); // 프레넬

    // 코스틱 (물속 빛 패턴)
    float c1 = noise(uv * 10.0 + vec2(t * 0.4, -t * 0.3));
    float c2 = noise(uv * 7.0 + vec2(-t * 0.3, t * 0.25));
    float caustic = (c1 * c2) * 0.15 * waterMask;
    baseColor += vec3(caustic * 0.5, caustic * 0.7, caustic);

    // ─── 6. 물 표면 하이라이트 (경계 부분) ───
    float edgeDensity = smoothstep(0.08, 0.15, density) - smoothstep(0.15, 0.35, density);
    if (edgeDensity > 0.01) {
        // 표면 반짝임
        float shimmer = noise(vec2(uv.x * 60.0 + t * 4.0, uv.y * 3.0)) * 0.5 + 0.5;
        baseColor += vec3(0.15, 0.2, 0.3) * shimmer * edgeDensity;
    }

    // ─── 7. 최종 출력 ───
    float alpha = waterMask * 0.92;

    // 고스트 피스 (투명)
    if (density > 0.01 && density < 0.15 && col.a < 50.0 / 255.0) {
        alpha = 0.1;
    }

    // 플래시 (흰색)
    vec3 avgCol = col.rgb / max(col.a, 0.01);
    if (avgCol.r > 0.9 && avgCol.g > 0.9 && avgCol.b > 0.9 && col.a > 0.7) {
        baseColor = vec3(1.0, 1.0, 1.0);
        alpha = 0.95;
    }

    fragColor = vec4(baseColor, alpha);
}`;

// ─── 색상 캐시 ───
const PIECE_RGB: Record<string, [number, number, number]> = {};
function getRGB(type: PieceType): [number, number, number] {
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
    tex: WebGLTexture;
    hiRes: Uint8Array;
    texBuf: Uint8Array;
    locs: Record<string, WebGLUniformLocation>;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "");
    return s;
}

export function initWaterGL(canvas: HTMLCanvasElement): WaterGL | null {
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false });
    if (!gl) return null;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "");
    gl.useProgram(prog);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const locs: Record<string, WebGLUniformLocation> = {};
    for (const n of ["u_water", "u_time", "u_texSize"]) locs[n] = gl.getUniformLocation(prog, n)!;
    gl.uniform1i(locs.u_water, 0);
    gl.uniform2f(locs.u_texSize, TEX_W, TEX_H);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return { gl, program: prog, tex, hiRes: new Uint8Array(SAND_COLS * SAND_ROWS * 4), texBuf: new Uint8Array(TEX_W * TEX_H * 4), locs };
}

function px(d: Uint8Array, i: number, r: number, g: number, b: number, a: number) {
    const o = i * 4; d[o] = r; d[o+1] = g; d[o+2] = b; d[o+3] = a;
}

function downsample(src: Uint8Array, dst: Uint8Array) {
    const sw = 2, sh = 2;
    for (let ty = 0; ty < TEX_H; ty++) {
        for (let tx = 0; tx < TEX_W; tx++) {
            let r=0,g=0,b=0,a=0;
            for (let dy=0; dy<sh; dy++) for (let dx=0; dx<sw; dx++) {
                const o = ((ty*sh+dy)*SAND_COLS + tx*sw+dx) * 4;
                r+=src[o]; g+=src[o+1]; b+=src[o+2]; a+=src[o+3];
            }
            const n=sw*sh, o=(ty*TEX_W+tx)*4;
            dst[o]=r/n; dst[o+1]=g/n; dst[o+2]=b/n; dst[o+3]=a/n;
        }
    }
}

export function updateAndRender(
    wgl: WaterGL, grid: SandGrid, piece: ActivePiece | null, ghostY: number,
    flash: Uint8Array | null, running: boolean, gameOver: boolean, settling: boolean,
    time: number, cw: number, ch: number,
) {
    const { gl, tex, hiRes, texBuf, locs } = wgl;
    hiRes.fill(0);

    // 그리드 → RGBA
    for (let y = 0; y < SAND_ROWS; y++) {
        const row = grid[y]; const off = y * SAND_COLS;
        for (let x = 0; x < SAND_COLS; x++) {
            const g = row[x]; if (!g) continue;
            const [r,gr,b] = getRGB(g);
            px(hiRes, off+x, r, gr, b, 255);
        }
    }
    if (flash) for (let i=0; i<SAND_COLS*SAND_ROWS; i++) if (flash[i]) px(hiRes,i,255,255,255,240);
    if (piece && running && !gameOver) {
        const [pr,pg,pb] = getRGB(piece.type);
        for (const [dx,dy] of PIECES[piece.type][piece.rotation]) {
            for (let gy=0; gy<GRAIN_SCALE; gy++) for (let gx=0; gx<GRAIN_SCALE; gx++) {
                const sy=(piece.y+dy)*GRAIN_SCALE+gy, sx=(piece.x+dx)*GRAIN_SCALE+gx;
                if (sy>=0&&sy<SAND_ROWS&&sx>=0&&sx<SAND_COLS) px(hiRes,sy*SAND_COLS+sx,pr,pg,pb,255);
            }
        }
        if (!settling) for (const [dx,dy] of PIECES[piece.type][piece.rotation]) {
            for (let gy=0; gy<GRAIN_SCALE; gy++) for (let gx=0; gx<GRAIN_SCALE; gx++) {
                const sy=(ghostY+dy)*GRAIN_SCALE+gy, sx=(piece.x+dx)*GRAIN_SCALE+gx;
                if (sy>=0&&sy<SAND_ROWS&&sx>=0&&sx<SAND_COLS&&hiRes[(sy*SAND_COLS+sx)*4+3]===0)
                    px(hiRes,sy*SAND_COLS+sx,pr,pg,pb,40);
            }
        }
    }

    downsample(hiRes, texBuf);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEX_W, TEX_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, texBuf);
    gl.uniform1f(locs.u_time, time/1000);
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0.008, 0.015, 0.035, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
