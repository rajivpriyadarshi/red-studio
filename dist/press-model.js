// Geometry for the studio's tabletop ticket press. Front is +Z, the shafts run along X.
import * as T from "three";
import {
  mergeGeometries,
  toCreasedNormals,
} from "./vendor/BufferGeometryUtils.js";

export function inkTexture(width, height, print) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  print(canvas.getContext("2d"), width, height);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function metal(color, metalness, roughness) {
  return new T.MeshStandardMaterial({ color, metalness, roughness });
}

// Bevel a cast side profile, then extrude it across the width of the press.
function casting(profile, width, bevel) {
  const shape = new T.Shape();
  // Round the cast corners in profile independently of the edge bevel.
  const corners = profile.map(([x, y], i) => {
    const prev = profile[(i + profile.length - 1) % profile.length],
      next = profile[(i + 1) % profile.length];
    const reach = Math.min(
      0.115,
      Math.hypot(x - prev[0], y - prev[1]) * 0.23,
      Math.hypot(x - next[0], y - next[1]) * 0.23,
    );
    const towards = ([a, b]) => {
      const k = reach / Math.hypot(a - x, b - y);
      return [x + (a - x) * k, y + (b - y) * k];
    };
    return { start: towards(prev), end: towards(next), x, y };
  });
  shape.moveTo(...corners[0].start);
  for (const corner of corners) {
    shape.lineTo(...corner.start);
    shape.quadraticCurveTo(corner.x, corner.y, ...corner.end);
  }
  shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -(width - 2 * bevel) / 2);
  geometry.rotateY(-Math.PI / 2);
  const cast = toCreasedNormals(geometry, 0.91);
  // Each flat face gets a clean planar layout, including the long extrusion.
  // ExtrudeGeometry's default side UVs stretch the patina across the bevel.
  cast.computeBoundingBox();
  const { min, max } = cast.boundingBox;
  const pos = cast.attributes.position,
    normals = cast.attributes.normal,
    uv = cast.attributes.uv;
  for (let i = 0; i < pos.count; i += 3) {
    // Choose the projection once per triangle so a worn edge cannot smear.
    const nx = Math.abs(normals.getX(i)),
      ny = Math.abs(normals.getY(i)),
      nz = Math.abs(normals.getZ(i));
    for (let j = i; j < i + 3; j++) {
      const x = (pos.getX(j) - min.x) / (max.x - min.x),
        y = (pos.getY(j) - min.y) / (max.y - min.y),
        z = (pos.getZ(j) - min.z) / (max.z - min.z);
      if (nx > ny && nx > nz) uv.setXY(j, z, y);
      else if (ny > nz) uv.setXY(j, x, 1 - z);
      else uv.setXY(j, x, y);
    }
  }
  return cast;
}

function part(group, geometry, material, x, y, z) {
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function box(group, material, x, y, z, width, height, depth) {
  return part(
    group,
    new T.BoxGeometry(width, height, depth),
    material,
    x,
    y,
    z,
  );
}

function shaft(group, mat, x, y, z, radius, length, count = 32) {
  const geo = new T.CylinderGeometry(radius, radius, length, count);
  geo.rotateZ(Math.PI / 2);
  return part(group, geo, mat, x, y, z);
}

function ring(group, mat, x, y, z, radius, tube) {
  const geo = new T.TorusGeometry(radius, tube, 6, radius < 0.2 ? 28 : 56);
  geo.rotateY(Math.PI / 2);
  return part(group, geo, mat, x, y, z);
}

// Consolidate the fixed parts once. Moving assemblies keep their own origins.
function batch(group) {
  const plates = new Map();
  for (const mesh of [...group.children]) {
    if (!mesh.isMesh) continue;
    mesh.updateMatrix();
    const source = mesh.geometry;
    const geometry = source.index ? source.toNonIndexed() : source;
    geometry.applyMatrix4(mesh.matrix);
    if (!plates.has(mesh.material)) plates.set(mesh.material, []);
    plates.get(mesh.material).push(geometry);
    group.remove(mesh);
    if (source !== geometry) source.dispose();
  }
  for (const [material, parts] of plates) {
    part(group, mergeGeometries(parts), material, 0, 0, 0);
    parts.forEach((geo) => geo.dispose());
  }
}

function sign(group, width, height, x, y, z, angle, draw) {
  const tex = inkTexture(1024, Math.round((1024 * height) / width), draw);
  const material = new T.MeshStandardMaterial({
    map: tex,
    roughness: 0.45,
    metalness: 0.12,
  });
  const plate = part(
    group,
    new T.PlaneGeometry(width, height),
    material,
    x,
    y,
    z,
  );
  plate.rotation.x = angle;
  return tex;
}

export function makePress(invalidate) {
  const loader = new T.TextureLoader();
  function finish(file, rx, ry, colorSpace = T.NoColorSpace) {
    const url = new URL("./assets/ticket-window/" + file, import.meta.url);
    const map = loader.load(url.href, invalidate);
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.repeat.set(rx, ry);
    map.colorSpace = colorSpace;
    map.anisotropy = 4;
    return map;
  }
  const peel = finish("enamel-relief.webp", 3.2, 1.8);
  const brush = finish("tool-marks.webp", 2.4, 1.2);
  const pulp = finish("paper-tooth.webp", 2.6, 1.2);
  const lacquer = finish("press-lacquer.webp", 1, 1, T.SRGBColorSpace);
  lacquer.wrapS = lacquer.wrapT = T.ClampToEdgeWrapping;
  const grain = (map, scale) => ({
    bumpMap: map,
    roughnessMap: map,
    bumpScale: scale,
  });
  const model = new T.Group();
  const body = new T.Group();
  model.add(body);
  const enamel = new T.MeshPhysicalMaterial({
    color: 0xffffff,
    map: lacquer,
    ...grain(peel, 0.008),
    roughness: 0.49,
    metalness: 0.4,
    clearcoat: 0.71,
    clearcoatRoughness: 0.23,
  });
  const lower = metal(0x72251c, 0.37, 0.34);
  const graphite = metal(0x232923, 0.28, 0.42);
  const rubber = metal(0x20201c, 0.03, 0.78);
  const nickel = metal(0xc5bca5, 0.88, 0.28);
  const bronze = metal(0xa08049, 0.73, 0.33);
  const ecru = metal(0xe6d7b4, 0.02, 0.83);
  const burgundy = metal(0x681d16, 0.39, 0.28);

  Object.assign(lower, grain(peel, 0.014), {
    map: lacquer,
    color: new T.Color(0xbbc1b0),
    roughness: 0.62,
  });
  Object.assign(nickel, grain(brush, 0.007), { roughness: 0.6 });
  Object.assign(bronze, grain(brush, 0.01), { roughness: 0.74 });
  Object.assign(graphite, grain(peel, 0.019), { roughness: 0.76 });
  Object.assign(rubber, grain(peel, 0.023), { roughness: 1 });
  Object.assign(ecru, grain(pulp, 0.012));
  const paperFinish = grain(pulp, 0.012);

  function sideScrew(group, x, y, z, side, angle) {
    shaft(group, graphite, x, y, z, 0.068, 0.023, 24);
    shaft(group, nickel, x + side * 0.014, y, z, 0.05, 0.024, 24);
    const slot = box(
      group,
      graphite,
      x + side * 0.027,
      y,
      z,
      0.004,
      0.014,
      0.07,
    );
    slot.rotation.x = angle;
  }

  for (const x of [-1.61, 1.61]) {
    for (const z of [-0.82, 0.96]) {
      const foot = part(
        body,
        new T.CylinderGeometry(0.195, 0.223, 0.21, 28),
        rubber,
        x,
        0.105,
        z,
      );
      foot.receiveShadow = false;
    }
  }
  const base = [
    [-1.14, 0.25],
    [1.12, 0.25],
    [1.31, 0.39],
    [1.31, 0.76],
    [1.16, 0.98],
    [-1.12, 0.98],
    [-1.23, 0.88],
    [-1.23, 0.4],
  ];
  part(body, casting(base, 4.0, 0.09), lower, 0, 0, 0);
  part(
    body,
    casting(
      [
        [-1.17, 0.26],
        [1.12, 0.26],
        [1.23, 0.35],
        [-1.19, 0.35],
      ],
      4.01,
      0.032,
    ),
    graphite,
    0,
    0,
    0,
  );
  // The black cavity and its drive roller sit in the gap between the castings.
  box(body, graphite, 0, 1.07, -0.17, 3.84, 0.36, 2.04);
  for (const x of [-1.87, 1.87])
    box(body, enamel, x, 1.09, 0.97, 0.27, 0.34, 0.42);
  const cover = [
    [-1.14, 1.2],
    [1.21, 1.2],
    [1.24, 1.38],
    [0.91, 1.7],
    [0.6, 1.84],
    [-0.97, 1.84],
    [-1.2, 1.64],
  ];
  part(body, casting(cover, 4.05, 0.105), enamel, 0, 0, 0);
  box(body, nickel, 0, 1.173, 1.307, 3.52, 0.034, 0.08);
  // Individual shearing teeth are visible across the mouth, with light on the
  // bevel and a dark relief behind them.
  const teeth = new T.Shape();
  teeth.moveTo(-1.63, 0);
  for (let i = 0; i < 54; i++) {
    const x = -1.63 + (i * 3.26) / 54;
    teeth.lineTo(x + 0.027, -0.042);
    teeth.lineTo(x + 3.26 / 54, 0);
  }
  teeth.lineTo(1.63, 0.025);
  teeth.lineTo(-1.63, 0.025);
  teeth.closePath();
  part(
    body,
    new T.ExtrudeGeometry(teeth, { depth: 0.016, bevelEnabled: false }),
    nickel,
    0,
    1.156,
    1.332,
  );
  // A folded metal receiving tray with two raised edge guides.
  const pan = [
    [0.83, 0.35],
    [2.1, 0.29],
    [2.34, 0.335],
    [2.36, 0.39],
    [2.1, 0.35],
    [0.84, 0.42],
  ];
  part(body, casting(pan, 3.59, 0.022), graphite, 0, 0, 0);
  for (const x of [-1.75, 1.75])
    part(
      body,
      casting(
        [
          [0.89, 0.39],
          [2.12, 0.34],
          [2.35, 0.37],
          [2.22, 0.45],
          [0.89, 0.49],
        ],
        0.067,
        0.017,
      ),
      nickel,
      x,
      0,
      0,
    );

  for (const x of [-1.5, -0.78, 0.78, 1.5]) {
    const rail = box(body, nickel, x, 0.393, 1.61, 0.026, 0.012, 0.94);
    rail.rotation.x = 0.05;
  }

  // The cover face slopes back 45 degrees. Its maker's plate and counter sit flush.
  const faceAngle = -Math.PI / 4;
  const nameplate = box(body, bronze, -0.66, 1.6, 1.172, 2.03, 0.315, 0.042);
  nameplate.rotation.x = faceAngle;
  sign(body, 1.99, 0.285, -0.66, 1.618, 1.19, faceAngle, (c, w, h) => {
    c.fillStyle = "#f0e4c4";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#182d25";
    c.font = "bold 103px Arial";
    c.fillText("red.", 39, h * 0.79);
    c.lineWidth = 2;
    c.strokeStyle = "#a28d63";
    c.strokeRect(8, 8, w - 16, h - 16);
    c.fillRect(295, 20, 3, h - 40);
    c.font = "bold 44px monospace";
    c.fillText("THE RED STUDIO", 330, h * 0.5);
    c.font = "32px monospace";
    c.fillText("TRONDHEIM  /  NORGE", 330, h * 0.81);
  });
  for (const x of [-1.61, 0.29]) {
    for (const side of [-1, 1]) {
      const y = 1.625 + side * 0.071,
        z = 1.198 - side * 0.071;
      const stud = part(
        body,
        new T.CylinderGeometry(0.022, 0.023, 0.009, 16),
        bronze,
        x,
        y,
        z,
      );
      stud.rotation.x = Math.PI / 4;
      const slot = box(
        body,
        graphite,
        x,
        y + 0.005,
        z + 0.005,
        0.028,
        0.004,
        0.007,
      );
      slot.rotation.x = faceAngle;
    }
  }
  const counterFrame = box(body, graphite, 1.18, 1.6, 1.172, 0.85, 0.3, 0.044);
  counterFrame.rotation.x = faceAngle;
  const indicatorMap = sign(
    body,
    0.78,
    0.25,
    1.18,
    1.618,
    1.19,
    faceAngle,
    () => {},
  );
  function indicator(number) {
    const c = indicatorMap.image.getContext("2d"),
      w = c.canvas.width,
      h = c.canvas.height;
    c.fillStyle = "#1d2520";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#ded3ad";
    c.font = "bold 110px monospace";
    c.fillText("Nº", 44, h * 0.6);
    c.font = "bold 270px monospace";
    c.fillStyle = "#fff2d2";
    c.fillText(number, 393, h * 0.82);
    c.fillStyle = "#171d1980";
    c.fillRect(374, h * 0.49, w - 400, 4);
    indicatorMap.needsUpdate = true;
  }
  // Raised rear cheeks support an exposed roll and the paper guide.
  const cheek = [
    [-0.94, 1.8],
    [0.05, 1.8],
    [-0.03, 2.13],
    [-0.38, 2.87],
    [-0.5, 2.94],
    [-0.7, 2.92],
    [-0.87, 2.69],
  ];
  for (const side of [-1, 1]) {
    const x = side * 1.64;
    part(body, casting(cheek, 0.145, 0.052), enamel, x, 0, 0);
    shaft(body, nickel, x + side * 0.09, 2.65, -0.58, 0.199, 0.08);
    shaft(body, graphite, x + side * 0.14, 2.65, -0.58, 0.125, 0.04);
    shaft(body, bronze, x + side * 0.17, 2.65, -0.58, 0.073, 0.041, 12);
  }
  shaft(body, nickel, 0, 2.65, -0.58, 0.085, 3.67);
  const spool = new T.Group();
  spool.position.set(0, 2.65, -0.58);
  body.add(spool);
  const rollTexture = inkTexture(1024, 512, (c, w, h) => {
    c.fillStyle = "#ecdfbd";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#cdbd9e";
    c.lineWidth = 1;
    for (let i = 0; i < 31; i++) {
      const x = (i * 151) % w;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 4, h);
      c.stroke();
    }
    c.fillStyle = "#a14c3b";
    for (const x of [45, 550]) {
      c.fillRect(x, 21, 22, 8);
      c.fillRect(x, h - 29, 22, 8);
    }
    c.strokeStyle = "#837661";
    c.setLineDash([7, 7]);
    for (const x of [128, 640]) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
  });
  const stockMat = new T.MeshStandardMaterial({
    map: rollTexture,
    ...paperFinish,
    roughness: 0.95,
  });
  const roll = new T.CylinderGeometry(0.62, 0.62, 2.8, 80, 1, true);
  roll.rotateZ(-Math.PI / 2);
  part(spool, roll, stockMat, 0, 0, 0);
  shaft(spool, ecru, 0, 0, 0, 0.617, 2.798, 72);
  const woundEdge = inkTexture(384, 384, (ctx, w, h) => {
    ctx.fillStyle = "#dac7a1";
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    const end = Math.PI * 2 * 51;
    ctx.lineWidth = 0.85;
    ctx.strokeStyle = "#9b866760";
    ctx.beginPath();
    for (let t = 0; t < end; t += 0.13) {
      const r =
        24 +
        ((w * 0.5 - 24) * t) / end +
        0.72 * Math.sin(t * 2 + 0.5) +
        0.35 * Math.sin(t * 5);
      const x = r * Math.cos(t),
        y = r * Math.sin(t);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
  const edgeMat = new T.MeshStandardMaterial({
    map: woundEdge,
    roughness: 0.93,
    ...paperFinish,
  });
  for (const side of [-1, 1]) {
    const end = new T.CircleGeometry(0.616, 80);
    end.rotateY((side * Math.PI) / 2);
    part(spool, end, edgeMat, side * 1.405, 0, 0);
    shaft(spool, bronze, side * 1.447, 0, 0, 0.21, 0.1);
  }
  // Spoked steel flanges keep the stock centred on the reel.
  for (const side of [-1, 1]) {
    const x = side * 1.45;
    ring(spool, burgundy, x, 0, 0, 0.627, 0.031);
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const spoke = box(
        spool,
        burgundy,
        x,
        0.365 * Math.cos(angle),
        0.365 * Math.sin(angle),
        0.039,
        0.52,
        0.072,
      );
      spoke.rotation.x = angle;
    }
  }
  const guideZ = 0.345;
  shaft(body, nickel, 0, 1.979, guideZ, 0.072, 3.14);
  // A continuous strip bridges the roll's front tangent and the intake roller.
  const stripGeom = new T.PlaneGeometry(2.77, 1, 1, 20);
  const points = stripGeom.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const t = 0.5 - points.getY(i);
    points.setY(i, 2.694 - 0.724 * t);
    points.setZ(i, 0.038 + 0.3 * t - 0.055 * Math.sin(Math.PI * t));
  }
  stripGeom.computeVertexNormals();
  const leader = inkTexture(512, 256, (c, w, h) => {
    c.fillStyle = "#dfcdab";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#93846b";
    for (const x of [9, w - 11])
      for (let y = 7; y < h; y += 22) c.fillRect(x, y, 3, 5);
    // Faint stock borders and registration targets on the unprinted web.
    c.strokeStyle = "#b6a385";
    for (const x of [24, w - 25]) {
      c.lineWidth = 1;
      c.strokeRect(x, 0, 2, h);
      c.beginPath();
      c.arc(x + (x < 100 ? 10 : -10), 72, 5, 0, Math.PI * 2);
      c.stroke();
    }
    c.strokeStyle = "#b5a38a";
    c.setLineDash([5, 5]);
    c.beginPath();
    c.moveTo(0, 188);
    c.lineTo(w, 188);
    c.stroke();
  });
  leader.wrapT = T.RepeatWrapping;
  const stripMat = new T.MeshStandardMaterial({
    map: leader,
    ...paperFinish,
    roughness: 0.94,
    side: T.DoubleSide,
  });
  part(body, stripGeom, stripMat, 0, 0, 0);

  const drive = new T.Group();
  drive.position.set(0, 1.075, 1.18);
  body.add(drive);
  shaft(drive, rubber, 0, 0, 0, 0.092, 3.43);
  for (const x of [-1.48, -1.22, 1.22, 1.48])
    shaft(drive, nickel, x, 0, 0, 0.094, 0.047);
  // A scalloped handwheel and calibrated end cap share the drive shaft.
  const wheel = new T.Group();
  wheel.position.set(2.075, 0.88, 0.34);
  body.add(wheel);
  shaft(wheel, nickel, 0.01, 0, 0, 0.215, 0.2);
  shaft(wheel, graphite, 0.19, 0, 0, 0.35, 0.19, 64);
  for (let i = 0; i < 28; i++) {
    const a = (i * Math.PI) / 14;
    shaft(
      wheel,
      rubber,
      0.19,
      Math.sin(a) * 0.342,
      Math.cos(a) * 0.342,
      0.019,
      0.15,
      8,
    );
  }
  shaft(wheel, bronze, 0.301, 0, 0, 0.242, 0.034);
  shaft(wheel, graphite, 0.324, 0, 0, 0.177, 0.019);
  ring(wheel, nickel, 0.324, 0, 0, 0.223, 0.006);
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12;
    const tick = box(
      wheel,
      graphite,
      0.322,
      0.202 * Math.cos(angle),
      0.202 * Math.sin(angle),
      0.006,
      i % 3 === 0 ? 0.038 : 0.019,
      0.009,
    );
    tick.rotation.x = angle;
  }
  box(wheel, ecru, 0.339, 0.089, 0, 0.011, 0.1, 0.023);

  const lever = new T.Group();
  lever.position.copy(wheel.position);
  body.add(lever);
  const armShape = [
    [0.0, -0.04],
    [-0.08, 0.025],
    [-0.32, 1.04],
    [-0.26, 1.17],
    [-0.15, 1.18],
    [0.09, 0.055],
  ];
  part(lever, casting(armShape, 0.09, 0.034), nickel, 0.42, 0, 0);
  shaft(lever, bronze, 0.44, 1.123, -0.22, 0.11, 0.18);
  const grip = part(
    lever,
    new T.LatheGeometry(
      [
        new T.Vector2(0.03, 0),
        new T.Vector2(0.09, 0.02),
        new T.Vector2(0.105, 0.08),
        new T.Vector2(0.116, 0.23),
        new T.Vector2(0.12, 0.31),
        new T.Vector2(0.095, 0.35),
        new T.Vector2(0.03, 0.36),
      ],
      40,
    ),
    graphite,
    0.48,
    1.123,
    -0.22,
  );
  grip.rotation.z = -Math.PI / 2;
  for (const offset of [0.09, 0.124, 0.158, 0.192, 0.226, 0.26, 0.294]) {
    const radius = 0.105 + (0.014 * (offset - 0.09)) / 0.205;
    ring(lever, rubber, 0.48 + offset, 1.123, -0.22, radius, 0.006);
  }
  lever.rotation.x = 0.13;
  // Motor ventilation and captive screws give the casting a finished reverse as well.
  for (const x of [-2.025, 2.025]) {
    for (let i = 0; i < 9; i++)
      box(body, graphite, x, 0.7, -0.9 + i * 0.092, 0.03, 0.22, 0.03);
    for (const z of [-0.91, 0.96])
      sideScrew(body, x, 1.43, z, Math.sign(x), z < 0 ? 0.64 : -0.38);
    for (const z of [-0.99, 0.96])
      sideScrew(body, x * 0.991, 0.53, z, Math.sign(x), -0.81);
  }
  // Spring-steel toggles bridge the cover joint. The bails stand proud
  // of the painted side plates and catch a narrow highlight at three quarters.
  for (const side of [-1, 1]) {
    const x = side * 2.04,
      z = 0.79;
    box(body, graphite, x, 1.13, z, 0.03, 0.41, 0.2);
    box(body, bronze, x + side * 0.026, 1.09, z, 0.03, 0.26, 0.115);
    shaft(body, nickel, x + side * 0.047, 1.22, z, 0.049, 0.065, 24);
    for (const dz of [-0.067, 0.067]) {
      box(body, nickel, x + side * 0.068, 1.23, z + dz, 0.025, 0.22, 0.025);
    }
    box(body, nickel, x + side * 0.068, 1.34, z, 0.027, 0.026, 0.16);
    sideScrew(body, x + side * 0.022, 0.99, z, side, 0.5);
  }
  for (const x of [-1.39, 1.39]) {
    box(body, graphite, x, 1.57, -1.23, 0.45, 0.18, 0.045);
    shaft(body, nickel, x, 1.59, -1.27, 0.054, 0.52, 32);
    shaft(body, bronze, x, 1.59, -1.27, 0.06, 0.19, 32);
  }
  for (let i = 0; i < 16; i++)
    box(body, graphite, -1.18 + 0.158 * i, 0.68, -1.322, 0.054, 0.24, 0.012);
  batch(spool);
  batch(drive);
  batch(wheel);
  batch(lever);
  batch(body);
  return { model, spool, drive, wheel, lever, leader, indicator, paperFinish };
}
