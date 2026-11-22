import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

// A pressed foil rosette. All nine dies use the same radial mesh, so both
// the stamped outline and the folded face can change between packages.
export function mountFoil(holder, preference, initial) {
  const canvas = holder.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  const room = new RoomEnvironment(),
    pmrem = new THREE.PMREMGenerator(renderer),
    env = pmrem.fromScene(room, 0.035);
  room.dispose();
  pmrem.dispose();
  const scene = new THREE.Scene();
  scene.environment = env.texture;
  const camera = new THREE.OrthographicCamera(-1.4, 1.4, 1.4, -1.4, 0.1, 15);
  camera.position.z = 6;
  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const segments = 192,
    rings = 15,
    geometry = new THREE.BufferGeometry(),
    indices = [];
  const count = (segments + 1) * (rings + 1);
  const points = new THREE.Float32BufferAttribute(
    new Float32Array(count * 3),
    3,
  );
  const colors = new THREE.Float32BufferAttribute(
    new Float32Array(count * 3),
    3,
  );
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i,
        b = a + segments + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  geometry.setIndex(indices);
  geometry.setAttribute("position", points);
  geometry.setAttribute("color", colors);
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.88,
    roughness: 0.21,
    clearcoat: 0.7,
    clearcoatRoughness: 0.21,
    side: THREE.DoubleSide,
    iridescence: 1,
    iridescenceIOR: 1.48,
    iridescenceThicknessRange: [160, 470],
  });
  sculpture.add(new THREE.Mesh(geometry, mat));
  const counts = [12, 8, 7, 16, 5, 9, 6, 11, 14];
  function die(id) {
    const out = new Float32Array(count * 3);
    const lobes = counts[id];
    for (let j = 0; j <= rings; j++)
      for (let i = 0; i <= segments; i++) {
        const t = j / rings,
          a = (2 * Math.PI * i) / segments,
          offset = (j * (segments + 1) + i) * 3;
        const spiral = (id % 3 === 1 ? 0.48 : -0.23) * (1 - t);
        const tooth = 0.5 + 0.5 * Math.cos(lobes * (a + spiral));
        const crease = Math.pow(tooth, 0.75);
        const aperture = 0.125 + 0.024 * Math.cos(lobes * a);
        const edge = 0.86 + (0.18 + (id % 3) * 0.033) * Math.pow(tooth, 0.72);
        const r = aperture + (edge - aperture) * t;
        const relief =
          0.19 * Math.sin(Math.PI * t) +
          (0.18 * t + 0.045) * crease +
          0.05 * Math.cos(4 * Math.PI * t) * (1 - t);
        out[offset] = r * Math.cos(a);
        out[offset + 1] = r * Math.sin(a);
        out[offset + 2] = relief;
      }
    return out;
  }
  const dies = counts.map((_, i) => die(i));
  points.array.set(dies[initial]);
  points.needsUpdate = true;
  const color = new THREE.Color();
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i <= segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      color.setHSL(
        (0.56 +
          0.19 * Math.sin(angle * 2 + j * 0.18) +
          0.1 * Math.sin(3 * angle) +
          1) %
          1,
        0.4,
        0.72 + 0.09 * Math.cos(angle * 4),
      );
      colors.setXYZ(j * (segments + 1) + i, color.r, color.g, color.b);
    }
  geometry.computeVertexNormals();
  const makeLight = (color, power, x, y, z) => {
    const l = new THREE.DirectionalLight(color, power);
    l.position.set(x, y, z);
    scene.add(l);
  };
  makeLight(0xffb3c9, 2.9, -2, 2, 3);
  makeLight(0xa8f1ff, 2.3, 2, -2, 2);
  let from = points.array.slice(),
    to = dies[initial],
    mix = 1,
    shown = false,
    frame = 0,
    last = 0,
    time = 0,
    valid = true;
  const aim = { x: 0, y: 0 },
    tilt = { x: 0, y: 0 };
  function schedule() {
    if (valid && shown && !frame && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (!valid || !shown || document.hidden) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!preference.matches) {
      time += dt;
      tilt.x += (aim.x - tilt.x) * (1 - Math.exp(-dt * 7));
      tilt.y += (aim.y - tilt.y) * (1 - Math.exp(-dt * 7));
    }
    if (mix < 1) {
      mix = preference.matches ? 1 : Math.min(1, mix + dt * 2);
      const p = 1 - (1 - mix) ** 3;
      for (let i = 0; i < from.length; i++)
        points.array[i] = from[i] + (to[i] - from[i]) * p;
      points.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    sculpture.rotation.set(
      0.32 + tilt.y * 0.35 + 0.09 * Math.sin(time * 0.42),
      -0.36 + tilt.x * 0.42 + 0.13 * Math.cos(time * 0.38),
      -0.27 + time * 0.13,
    );
    renderer.render(scene, camera);
    holder.classList.add("rendered");
    if (!preference.matches) schedule();
  }
  function resize() {
    const { width, height } = holder.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.setSize(width, height, false);
    const hw = Math.max(1.18, (1.13 * width) / height);
    camera.left = -hw;
    camera.right = hw;
    camera.top = (hw * height) / width;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    schedule();
  }
  new ResizeObserver(resize).observe(holder);
  new IntersectionObserver(([entry]) => {
    shown = entry.isIntersecting;
    last = 0;
    if (shown) schedule();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(holder);
  const bed = holder.closest(".ticket-bed");
  bed.addEventListener("pointermove", (event) => {
    if (preference.matches || event.pointerType === "touch") return;
    const r = bed.getBoundingClientRect();
    aim.x = (event.clientX - r.left) / r.width - 0.5;
    aim.y = (event.clientY - r.top) / r.height - 0.5;
  });
  bed.addEventListener("pointerleave", () => {
    aim.x = aim.y = 0;
  });
  document.addEventListener("visibilitychange", () => {
    last = 0;
    schedule();
  });
  preference.addEventListener("change", () => {
    if (preference.matches) {
      time = 0;
      tilt.x = tilt.y = 0;
    }
    schedule();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    valid = false;
    holder.classList.remove("rendered");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    valid = true;
    resize();
  });
  resize();
  return (index) => {
    from.set(points.array);
    to = dies[index];
    mix = 0;
    schedule();
  };
}
