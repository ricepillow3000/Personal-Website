/* The side of the PRESS START train as ONE true-perspective surface (WebGL2).

   Why: the 2D canvas can only draw rectangles and parallelograms, so the side used to be cut into
   5px vertical slices. But the side's height grows steadily along its length (it is a plane seen in
   perspective), so every slice left a 4-5px step on the roof line and the red stripe, worst right
   in front of the camera (John, Nov 18: "the quality degrades on top of the cart"). The GPU
   interpolates texture coordinates with perspective, so one quad gives a perfectly straight roof,
   straight stripes and the full-resolution art, in one draw call instead of hundreds.

   Its canvas is its own layer, stacked between two 2D canvases (floor, light pools and afterimage
   noses below; the nose, headlights and speed lines above), so nothing is ever copied between a
   WebGL and a 2D canvas (that copy can force a slow GPU readback every frame on some devices).
   No WebGL2: returns null and the caller keeps its old slices. */

const VS = `#version 300 es
in vec2 aPos;      // canvas pixels
in float aD;       // depth
in vec2 aSV;       // s = distance from the nose (world units), v = 0 roof .. 1 skirt
uniform vec2 uSize;
out vec2 vSV;
out float vD;
void main() {
  vec2 ndc = vec2(aPos.x / uSize.x * 2.0 - 1.0, 1.0 - aPos.y / uSize.y * 2.0);
  gl_Position = vec4(ndc * aD, 0.0, aD); // w = depth: varyings are interpolated in perspective
  vSV = aSV;
  vD = aD;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vSV;
in float vD;
uniform sampler2D uTex;
uniform float uPeriod;  // world units per repeat of the art (door to door)
uniform float uAlpha;
uniform float uMouth;   // the tunnel mouth: deeper than this the train fades into the dark
uniform float uMat;     // 1 = the heavy steel material (the car itself), 0 = flat (the afterimage echoes)
uniform float uRefl;    // 1 = its reflection in the glossy platform floor
uniform vec2 uTexel;    // one texel of the art, for the ink outlines
out vec4 outColor;
float luma(vec2 uv) { return dot(texture(uTex, uv).rgb, vec3(0.299, 0.587, 0.114)); }
void main() {
  float dark = clamp(1.0 - (vD - uMouth) / 420.0, 0.0, 1.0);
  vec4 c = texture(uTex, vec2(vSV.x / uPeriod, vSV.y)); // REPEAT wraps the car; mipmaps keep the far end calm
  if (uMat > 0.5 && c.a > 0.0) {
    /* Weight (Nov 19, John: "it looks like a cutout, make it feel heavy, like an actual subway train").
       Cel-shaded steel: hard value bands, never soft gradients. The lit windows keep their glow. */
    vec2 uv = vec2(vSV.x / uPeriod, vSV.y);
    vec3 col = c.rgb / c.a;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float glass = clamp((min(col.r, col.g) - col.b) * 5.0, 0.0, 1.0) * step(0.45, lum); // warm lit windows
    float metal = 1.0 - glass;
    float v = vSV.y;
    // deeper steel: more contrast, darker mid-tones, so it reads as a heavy painted body, not paper
    vec3 steel = pow(col, vec3(1.45)) * 0.8;
    // hard shade bands: the roof edge curves away, the lower body sinks into the shadow over the track
    float band = 1.0;
    band *= v < 0.06 ? 0.5 : 1.0;
    band *= v > 0.74 ? 0.8 : 1.0;
    band *= v > 0.86 ? 0.75 : 1.0;
    band *= v > 0.94 ? 0.7 : 1.0;
    steel *= band;
    // bold ink: the art's own panel lines, door seams and frames, thickened into heavy cel outlines
    vec2 o = uTexel * 1.6;
    float gx = luma(uv + vec2(o.x, 0.0)) - luma(uv - vec2(o.x, 0.0));
    float gy = luma(uv + vec2(0.0, o.y)) - luma(uv - vec2(0.0, o.y));
    float ink = smoothstep(0.07, 0.2, length(vec2(gx, gy)));
    steel *= 1.0 - 0.7 * ink;
    // the station's ceiling lights mirrored on the steel: fixed in the station (world depth), so the
    // car slides UNDER them, the way real metal looks when it moves. Crisp anime streaks, slanted.
    float f = fract((vD + v * 60.0) / 310.0);
    float streak = step(0.45, f) * step(f, 0.5) + 0.6 * step(0.535, f) * step(f, 0.555);
    float sheen = streak * (v > 0.06 && v < 0.88 ? 1.0 : 0.0) * (vD < 60.0 ? 0.55 : 1.0); // right at the lens a streak is huge: a glint, not a wash
    steel += sheen * vec3(0.44, 0.46, 0.5) * (1.0 - v * 0.55);
    col = mix(col, steel, metal) * (1.0 - 0.35 * ink * glass) + glass * sheen * 0.12;
    if (uRefl > 0.5) {
      // in the floor: a little cooler and fainter, strongest where the car meets the platform (hard
      // steps). It mirrors light (the lit windows become warm streaks), it doesn't dim the floor.
      col *= vec3(0.82, 0.85, 0.94);
      c.a *= v > 0.86 ? 0.36 : (v > 0.66 ? 0.22 : (v > 0.4 ? 0.11 : 0.05));
    }
    c = vec4(clamp(col, 0.0, 1.0) * c.a, c.a);
  }
  outColor = c * (uAlpha * dark); // premultiplied
}`;

export function createSideRenderer() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch {
    return null;
  }
  const loc = {
    pos: gl.getAttribLocation(prog, 'aPos'), d: gl.getAttribLocation(prog, 'aD'), sv: gl.getAttribLocation(prog, 'aSV'),
    size: gl.getUniformLocation(prog, 'uSize'), tex: gl.getUniformLocation(prog, 'uTex'), period: gl.getUniformLocation(prog, 'uPeriod'),
    alpha: gl.getUniformLocation(prog, 'uAlpha'), mouth: gl.getUniformLocation(prog, 'uMouth'),
    mat: gl.getUniformLocation(prog, 'uMat'), refl: gl.getUniformLocation(prog, 'uRefl'), texel: gl.getUniformLocation(prog, 'uTexel'),
  };
  const buf = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const STRIDE = 5 * 4; // x, y, d, s, v
  gl.enableVertexAttribArray(loc.pos);
  gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(loc.d);
  gl.vertexAttribPointer(loc.d, 1, gl.FLOAT, false, STRIDE, 8);
  gl.enableVertexAttribArray(loc.sv);
  gl.vertexAttribPointer(loc.sv, 2, gl.FLOAT, false, STRIDE, 12);
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const textures = new Map(); // image/canvas -> GL texture (uploaded once)
  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });

  function texture(img) {
    if (textures.has(img)) return textures.get(img);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || w > maxTex || h > maxTex) return null;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.set(img, t);
    return t;
  }

  /** Self-test (Nov 19, John: "the train in the beginning is not working" on his device): draw one
      texel of the art into a corner and read it back. If the GPU path renders nothing, black or the
      wrong colour on this device, the caller drops it for good and keeps the 2D slices. */
  function selfTest(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const t = texture(img);
    if (!t || !w) return false;
    const W = Math.max(8, canvas.width);
    const H = Math.max(8, canvas.height);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // a 6px square in the top-left corner, every corner sampling the middle of the art
    const P = 2;
    const q = (x, y) => [x, y, 1, P * 0.5, 0.5];
    if (!this.quad(img, [q(0, 0), q(0, 6), q(6, 0), q(6, 6)], { period: P, alpha: 1, mouth: 1e6 })) return false;
    const px = new Uint8Array(4);
    gl.readPixels(2, H - 3, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // the same texel, drawn by the 2D canvas
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const g = c.getContext('2d');
    g.drawImage(img, Math.floor(w * 0.5), Math.floor(h * 0.5), 1, 1, 0, 0, 1, 1);
    const ref = g.getImageData(0, 0, 1, 1).data;
    const diff = Math.max(Math.abs(px[0] - ref[0]), Math.abs(px[1] - ref[1]), Math.abs(px[2] - ref[2]));
    return px[3] > 200 && diff < 48 && gl.getError() === gl.NO_ERROR;
  }

  return {
    canvas,
    selfTest,
    /** Upload ahead of time (idle) and draw it once, invisibly: the driver compiles the shader
        and finishes the upload on first use, which cost ~95 ms on the shot's first frame. */
    prepare(img, width, height) {
      if (lost || !img || !texture(img)) return;
      this.begin(width || canvas.width, height || canvas.height); // at the real size: a resize reallocates the buffers
      this.quad(img, [[0, 0, 1, 0, 0], [0, 1, 1, 0, 1], [1, 0, 1, 1, 0], [1, 1, 1, 1, 1]], { period: 1, alpha: 0, mouth: 1000 });
      gl.finish();
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    /** start a frame: size the layer and clear it */
    begin(width, height) {
      if (lost || gl.isContextLost()) return false;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return true;
    },
    /** Draw one side quad on top of what this frame already has. corners: four [x, y, d, s, v] in
        canvas pixels (near roof, near skirt, far roof, far skirt). mat: the steel material; refl: as
        its reflection in the floor. False if it couldn't. */
    quad(img, corners, { period, alpha, mouth, mat = 0, refl = 0 }) {
      if (lost || gl.isContextLost()) return false;
      const t = texture(img);
      if (!t) return false;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners.flat()), gl.DYNAMIC_DRAW);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied "over"
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(loc.tex, 0);
      gl.uniform2f(loc.size, canvas.width, canvas.height);
      gl.uniform1f(loc.period, period);
      gl.uniform1f(loc.alpha, alpha);
      gl.uniform1f(loc.mouth, mouth);
      gl.uniform1f(loc.mat, mat);
      gl.uniform1f(loc.refl, refl);
      gl.uniform2f(loc.texel, 1 / (img.naturalWidth || img.width), 1 / (img.naturalHeight || img.height));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    },
  };
}
