// Sample each photograph through the same lens in screen space. The inner field
// stays rectilinear, while the magnification and colour fringe grow at the rim.
const vertex = `
  attribute vec2 corner;
  void main() { gl_Position = vec4(corner, 0., 1.); }
`;
const fragment = `
  precision highp float;
  uniform vec2 resolution, stage, cardSize, crop;
  uniform vec2 center;
  uniform float tilt;
  uniform mat3 inverseSwivel;
  uniform sampler2D art;
  uniform vec3 paper;

  vec4 sampleCard(vec2 screen, float edge, float channel) {
    float side = sign(screen.x - .5);
    screen.x -= side * edge * (.079 + channel * .006);
    screen.y = (screen.y - .5) / (1. + edge * edge * (.72 + channel * .075));
    vec2 local = (screen * stage - center) / (.5 * cardSize);
    local /= max(.5, 1. + tilt * local.x);
    vec3 plane = inverseSwivel * vec3(local * cardSize * .5, 1.);
    local = plane.xy / (plane.z * cardSize * .5);
    vec2 corner = abs(local * cardSize * .5) - cardSize * .5 + 8.;
    float distance = length(max(corner, 0.)) + min(max(corner.x, corner.y), 0.) - 8.;
    float coverage = 1. - smoothstep(-.7, .7, distance);
    vec2 uv = local * crop * .5 + .5;
    vec3 color = texture2D(art, clamp(uv, 0., 1.)).rgb;
    if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) color = vec3(.09,.11,.10);
    return vec4(color, coverage);
  }

  void main() {
    vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
    float edge = smoothstep(.62, 1.035, abs(screen.x * 2. - 1.));
    vec4 mid = sampleCard(screen, edge, 0.);
    if (edge < .001) { gl_FragColor = mid; return; }
    vec4 warm = sampleCard(screen, edge, -1.);
    vec4 cool = sampleCard(screen, edge, 1.);
    vec3 coverage = vec3(warm.a, mid.a, cool.a);
    float alpha = max(max(warm.a, mid.a), cool.a);
    if (alpha <= .001) discard;
    vec3 rgb = mix(paper, vec3(warm.r, mid.g, cool.b), coverage);
    gl_FragColor = vec4(clamp((rgb - paper * (1. - alpha)) / alpha, 0., 1.), alpha);
  }
`;

export function createWarpLens(rail, cuts, redraw) {
  const canvas = document.createElement("canvas");
  canvas.className = "warp-lens";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", {
    alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power",
  });
  if (!gl) return null;
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, "corner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(["resolution", "stage", "cardSize", "crop", "center", "tilt", "inverseSwivel", "paper"]
    .map(name => [name, gl.getUniformLocation(program, name)]));
  const paper = getComputedStyle(rail.closest(".featured-work")).backgroundColor.match(/[\d.]+/g).slice(0,3).map(v => Number(v) / 255);
  gl.uniform3fv(u.paper, paper);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  rail.prepend(canvas);

  // The browser keeps ownership of the live video. Only poster frames are
  // uploaded here, once per chosen picture source (including breakpoint changes).
  let available = true;
  canvas.addEventListener("webglcontextlost", () => {
    available = false;
    rail.classList.remove("lens-ready");
  });
  const photos = cuts.map(cut => {
    const image = cut.querySelector("img");
    const texture = gl.createTexture();
    let source = "";
    image.addEventListener("load", redraw);
    return () => {
      if (!image.complete || !image.naturalWidth) return null;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (image.currentSrc !== source) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        source = image.currentSrc;
      }
      return image.naturalWidth / image.naturalHeight;
    };
  });
  return (width, height, cards) => {
    if (!available) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.6, 2300 / width);
    const w = Math.round(width * ratio), h = Math.round(height * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.uniform2f(u.resolution, w, h);
    gl.uniform2f(u.stage, width, height);
    let ready = true;
    for (const card of cards) {
      const aspect = photos[card.index]();
      if (!aspect) { ready = false; continue; }
      const fit = card.w / card.h / aspect;
      const contain = cuts[card.index].dataset.format === "portrait";
      gl.uniform2f(u.crop, contain ? Math.max(1, fit) : Math.min(1, fit),
        contain ? Math.max(1, 1 / fit) : Math.min(1, 1 / fit));
      const x = width / 2 + card.x;
      gl.uniform2f(u.center, x, card.y);
      gl.uniform2f(u.cardSize, card.w, card.h);
      gl.uniform1f(u.tilt, card.tilt);
      // Undo the in-plane bank, then the perspective turn, before sampling the print.
      const yaw = card.yaw * Math.PI / 180, pitch = card.pitch * Math.PI / 180;
      const roll = card.roll * Math.PI / 180, cr = Math.cos(roll), sr = Math.sin(roll);
      const focal = card.w * 1.65;
      const a = 1 / Math.cos(yaw), b = -Math.tan(yaw) * Math.tan(pitch), c = 1 / Math.cos(pitch);
      const p = -Math.tan(yaw) / focal, q = Math.tan(pitch) * a / focal;
      gl.uniformMatrix3fv(u.inverseSwivel, false, [
        a * cr - b * sr, -c * sr, p * cr - q * sr,
        a * sr + b * cr, c * cr, p * sr + q * cr,
        0, 0, 1,
      ]);
      const margin = card.w * .65 + width * .09 + 2;
      const left = Math.max(0, Math.floor((x - margin) * ratio));
      const right = Math.min(w, Math.ceil((x + margin) * ratio));
      if (right > left) {
        gl.scissor(left, 0, right - left, h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
    rail.classList.toggle("lens-ready", ready);
  };
}
