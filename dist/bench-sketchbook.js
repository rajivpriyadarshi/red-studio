import * as T from "three";
import { mergeGeometries } from "./vendor/BufferGeometryUtils.js";
import { inkTexture } from "./press-model.js?v=bench-hover-1";

const width = 2.38,
  height = 2.82,
  margin = 0.088;
// The back cover sits directly on the counter. The wire just clears its surface.
const radius = 0.136,
  hingeY = 0.15,
  coverThickness = 0.027;
const coverBase = 0.011;
const block = hingeY - 0.003 - coverThickness - coverBase;
const hingeZ = -height / 2 + margin - radius;
const holes = 12,
  pitch = (width - 0.34) / (holes - 1);
const holeX = (n) => (n - (holes - 1) / 2) * pitch;

export function roundedShape(w, h, r) {
  const s = new T.Shape(),
    x = w / 2,
    y = h / 2;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r);
  s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y);
  s.quadraticCurveTo(-x, y, -x, y - r);
  s.lineTo(-x, -y + r);
  s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

function card(w, h, thickness, material, r) {
  const geometry = new T.ExtrudeGeometry(roundedShape(w, h, r), {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 4,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function wire() {
  class Helix extends T.Curve {
    getPoint(t, out = new T.Vector3()) {
      const cycle = -0.34 + (holes - 0.32) * t,
        a = 2 * Math.PI * cycle;
      return out.set(
        holeX(0) + pitch * cycle,
        hingeY + radius * Math.sin(a),
        hingeZ + radius * Math.cos(a),
      );
    }
  }
  const geometry = new T.TubeGeometry(new Helix(), holes * 22, 0.018, 6, false);
  const mesh = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({
      color: 0x6a665c,
      metalness: 0.86,
      roughness: 0.31,
    }),
  );
  mesh.castShadow = true;
  return mesh;
}

function pencil() {
  const group = new T.Group();
  // The pencil moves as one object. Only the metal sleeve needs its own finish.
  const barrel = [], ferrule = [];
  function section(r1, r2, length, x, colour, sides = 6) {
    const geo = new T.CylinderGeometry(r2, r1, length, sides);
    geo.rotateZ(-Math.PI / 2);
    geo.translate(x, 0, 0);
    if (colour === null) { ferrule.push(geo); return; }
    const tint = new T.Color(colour);
    const colours = new Float32Array(3 * geo.attributes.position.count);
    for (let i = 0; i < colours.length; i += 3) tint.toArray(colours, i);
    geo.setAttribute('color', new T.BufferAttribute(colours, 3));
    barrel.push(geo);
  }
  section(.043, .043, 2.15, 0, 0x8e3127);
  section(.015, .043, .215, -1.1825, 0xd7a873);
  section(0, .015, .08, -1.33, 0x343531, 8);
  section(.046, .046, .14, 1.145, null, 20);
  section(.042, .04, .085, 1.2575, 0xa96658, 16);
  for (const x of [1.09, 1.11, 1.18, 1.2]) section(.047, .047, .01, x, null, 20);
  for (const [parts, finish] of [
    [barrel, { vertexColors: true, roughness: .57 }],
    [ferrule, { color: 0xb49d74, metalness: .68, roughness: .4 }],
  ]) {
    const mesh = new T.Mesh(mergeGeometries(parts), new T.MeshStandardMaterial({ ...finish, flatShading: true }));
    mesh.castShadow = true;
    group.add(mesh);
    parts.forEach(geo => geo.dispose());
  }
  group.rotation.y = -1.47;
  group.position.set(width / 2 + 0.27, 0.047, -0.05);
  return group;
}

function punchMask() {
  const mask = inkTexture(512, 608, (c, w, h) => {
    c.fillStyle = "white";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "black";
    for (let i = 0; i < holes; i++) {
      c.beginPath();
      c.ellipse(
        w * (0.5 + holeX(i) / width),
        (h * margin) / height,
        (0.032 * w) / width,
        (0.04 * h) / height,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  });
  mask.colorSpace = T.NoColorSpace;
  return mask;
}

function addPad(group) {
  const cloth = new T.MeshStandardMaterial({
    color: 0x643931,
    roughness: 0.93,
  });
  const edgeInk = inkTexture(256, 128, (c, w, h) => {
    c.fillStyle = "#d2c6ad";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < h; i += 3) {
      c.fillStyle = i % 9 === 0 ? "#b7ab93" : "#e4dac7";
      c.fillRect(0, i, w, 1);
    }
  });
  const ends = new T.MeshStandardMaterial({ map: edgeInk, roughness: 0.96 });
  const stock = new T.MeshStandardMaterial({
    color: 0xd9ccaf,
    roughness: 0.97,
  });
  const frame = new T.Group();
  frame.rotation.x = -Math.PI / 2;
  frame.position.y = coverBase;
  group.add(frame);
  const board = card(
    width + 0.065,
    height + 0.065,
    coverThickness,
    cloth,
    0.045,
  );
  frame.add(board);
  const shape = roundedShape(width, height, 0.038);
  for (let i = 0; i < holes; i++) {
    const hole = new T.Path();
    hole.absellipse(
      holeX(i),
      height / 2 - margin,
      0.032,
      0.04,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
  }
  const geo = new T.ExtrudeGeometry(shape, {
    depth: block,
    bevelEnabled: false,
    curveSegments: 5,
  });
  // ExtrudeGeometry's side UV uses object-space coordinates. Lay the
  // page-edge striations through its thickness, including the punch holes.
  const uv = geo.attributes.uv,
    pos = geo.attributes.position;
  for (const g of geo.groups)
    if (g.materialIndex === 1) {
      for (let i = g.start; i < g.start + g.count; i++)
        uv.setXY(i, (pos.getX(i) + pos.getY(i)) * 0.35, pos.getZ(i) / block);
    }
  const pack = new T.Mesh(geo, [stock, ends]);
  pack.position.z = coverThickness;
  pack.castShadow = pack.receiveShadow = true;
  frame.add(pack);
}

// Coordinates use the sketch artist’s page: (0, 0) is the upper left.
// A third coordinate denotes a lifted stroke, such as moving to a new panel.
function trace(points) {
  let length = 0;
  const segments = points.slice(1).map(([x, y, lift], i) => {
    const [sx, sy] = points[i];
    const dx = x - sx, dy = y - sy;
    const size = Math.hypot(dx * width / height, dy);
    const start = length;
    length += size;
    return { sx, sy, dx, dy, start, size, lift };
  });
  return (t) => {
    const distance = t * length;
    const s = segments.find(s => distance <= s.start + s.size) ?? segments.at(-1);
    const f = T.MathUtils.clamp((distance - s.start) / s.size, 0, 1);
    return {
      x: width * ((s.sx + f * s.dx) / 100 - .5),
      z: height * ((s.sy + f * s.dy) / 100 - .5),
      lift: s.lift ? .11 * Math.sin(Math.PI * f) : 0,
    };
  };
}

function sketchMaterial() {
  const material = new T.MeshStandardMaterial({
    color: 0xfffcf5, roughness: .96, alphaMap: punchMask(), alphaTest: .48,
  });
  const uniforms = {
    timingMap: { value: null },
    studyOrigin: { value: new T.Vector2() },
    graphite: { value: 1 },
    rubbed: { value: 0 },
  };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform sampler2D timingMap;
      uniform vec2 studyOrigin;
      uniform float graphite;
      uniform float rubbed;
    `).replace('#include <map_fragment>', `
      #include <map_fragment>
      #ifdef USE_MAP
        if (graphite < 1.0 || rubbed > 0.0) {
          vec2 pageUV = clamp(vAlphaMapUv, vec2(.005), vec2(.995));
          vec2 order = texture2D(timingMap, studyOrigin + pageUV / vec2(4., 2.)).rg;
          float drawn = smoothstep(order.r - .017, order.r + .017, graphite);
          float erased = smoothstep(order.g - .017, order.g + .017, rubbed);
          // Reuse the unmarked paper above the binding for the rubbed surface.
          vec2 grainUV = vec2(.03 + pageUV.x * .94, .96 + .022 * sin(pageUV.y * 27.));
          vec3 clean = diffuse * texture2D(map, studyOrigin + grainUV / vec2(4., 2.)).rgb;
          diffuseColor.rgb = mix(clean, diffuseColor.rgb, drawn * (1. - erased));
        }
      #endif
    `);
  };
  return { material, uniforms };
}

const durations = { pickup: 380, erase: 650, turn: 460, draw: 2300, park: 420 };
const leadEnd = -1.37, eraserEnd = 1.30;
const ease = t => t * t * (3 - 2 * t);

export function makeBenchBook(wake) {
  const group = new T.Group();
  addPad(group);
  const tool = pencil();
  tool.name = 'Sketch pencil';
  const { material, uniforms } = sketchMaterial();
  const pageGeometry = new T.PlaneGeometry(width, height, 16, 18);
  pageGeometry.rotateX(-Math.PI / 2);
  const sheet = new T.Mesh(pageGeometry, material);
  sheet.name = 'Sketch page';
  sheet.position.y = hingeY;
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  group.add(wire(), sheet, tool);

  const asset = name => new URL('./assets/ticket-window/' + name, import.meta.url).href;
  const loader = new T.TextureLoader();
  let study = 0, target = 0, key, paths;
  function showStudy(index) {
    study = index;
    const origin = uniforms.studyOrigin.value;
    origin.set((index % 4) / 4, (1 - Math.floor(index / 4)) / 2);
    // The page uses one atlas throughout, including when two packages share art.
    material.map?.offset.set(origin.x + .004 / 4, origin.y + .004 / 2);
  }
  loader.load(asset('pad-studies.webp?v=storyboards-1'), atlas => {
    atlas.colorSpace = T.SRGBColorSpace;
    atlas.anisotropy = 8;
    atlas.repeat.set(.992 / 4, .992 / 2);
    material.map = atlas;
    material.needsUpdate = true;
    showStudy(study);
    wake();
  });
  Promise.all([
    fetch(asset('pencil-paths.json?v=storyboards-1')).then(r => r.json()),
    loader.loadAsync(asset('pencil-timing.png?v=storyboards-1')),
  ]).then(([design, timing]) => {
    timing.generateMipmaps = false;
    timing.minFilter = T.LinearFilter;
    uniforms.timingMap.value = timing;
    paths = { erase: trace(design.erase), draw: design.studies.map(trace) };
  }).catch(() => { /* The full study can still be selected without motion. */ });

  const capture = () => ({
    x: tool.position.x, y: tool.position.y, z: tool.position.z,
    pitch: tool.rotation.z, yaw: tool.rotation.y,
  });
  const home = capture();
  let phase = null, start = 0, from = home;
  function pose(p) {
    tool.position.set(p.x, p.y, p.z);
    tool.rotation.set(0, p.yaw, p.pitch, 'YXZ');
  }
  // Anchor the actual graphite tip or the opposite rubber end to the paper.
  function contact(erase, t) {
    const point = erase ? paths.erase(t) : paths.draw[study](t);
    const pressure = Math.sin(t * (erase ? 19 : 29));
    const pitch = erase ? -.97 + .037 * pressure : .87 + .055 * pressure;
    const yaw = (erase ? -1.99 : 1.15) + .067 * Math.sin(t * 13);
    const end = erase ? eraserEnd : leadEnd;
    const reach = end * Math.cos(pitch);
    return {
      x: point.x - reach * Math.cos(yaw),
      y: hingeY + (erase ? .023 : .002) + point.lift - end * Math.sin(pitch),
      z: point.z + reach * Math.sin(yaw), yaw, pitch,
    };
  }
  function carry(to, t, rise) {
    const u = ease(t);
    const mix = (a, b) => T.MathUtils.lerp(a, b, u);
    pose({
      x: mix(from.x, to.x), y: mix(from.y, to.y) + rise * Math.sin(Math.PI * u),
      z: mix(from.z, to.z), pitch: mix(from.pitch, to.pitch), yaw: mix(from.yaw, to.yaw),
    });
  }
  function begin(next, now) {
    from = capture();
    start = now;
    phase = next;
  }
  function settle() {
    showStudy(target);
    uniforms.graphite.value = 1;
    uniforms.rubbed.value = 0;
    pose(home);
    phase = null;
  }
  function select(data, animate) {
    target = data.study;
    const changed = key !== data.key;
    key = data.key;
    if (!animate || !paths || !material.map) { settle(); return; }
    if (!changed || phase === 'erase' || phase === 'pickup') return;
    if (phase === 'turn' || (phase === 'draw' && uniforms.graphite.value === 0)) {
      showStudy(target);
      begin('turn', performance.now());
    } else {
      // A partially drawn sketch keeps exactly its current marks as it is erased.
      begin('pickup', performance.now());
    }
  }
  function paint(t) {
    if (phase === 'pickup') carry(contact(true, 0), t, .35);
    else if (phase === 'erase') {
      uniforms.rubbed.value = t;
      pose(contact(true, t));
    } else if (phase === 'turn') carry(contact(false, 0), t, .36);
    else if (phase === 'draw') {
      uniforms.graphite.value = t;
      pose(contact(false, t));
    } else carry(home, t, .28);
  }
  function update(now, reduced) {
    if (reduced) { settle(); return false; }
    while (phase) {
      const end = start + durations[phase];
      paint(T.MathUtils.clamp((now - start) / durations[phase], 0, 1));
      if (now < end) break;
      if (phase === 'pickup') begin('erase', end);
      else if (phase === 'erase') {
        showStudy(target);
        uniforms.graphite.value = uniforms.rubbed.value = 0;
        begin('turn', end);
      } else if (phase === 'turn') begin('draw', end);
      else if (phase === 'draw') begin('park', end);
      else settle();
    }
    return phase !== null;
  }
  return { group, sheet, tool, select, update, settle, get animating() { return phase !== null; } };
}
