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
out vec4 outColor;
void main() {
  float dark = clamp(1.0 - (vD - uMouth) / 420.0, 0.0, 1.0);
  vec4 c = texture(uTex, vec2(vSV.x / uPeriod, vSV.y)); // REPEAT wraps the car; mipmaps keep the far end calm
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

  return {
    canvas,
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
        canvas pixels (near roof, near skirt, far roof, far skirt). False if it couldn't. */
    quad(img, corners, { period, alpha, mouth }) {
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
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    },
  };
}
