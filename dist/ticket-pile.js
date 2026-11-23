// All coordinates are local to the press and its floor. Reserving the landing
// surface at release keeps consecutive sheets in print order, even in a burst.
import * as T from "three";

const width = 3.13;
const depth = 1.55;
const cols = 12,
  rows = 8;
const stride = cols + 1,
  vertices = stride * (rows + 1);
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const mix = T.MathUtils.lerp;
const between = T.MathUtils.randFloat;
const gridSize = 128,
  pitch = 0.05,
  xMin = -3.2,
  zMin = 0;
const floorY = 0.006;
const thickness = 0.0032;
const maxSheetsPerStock = 16;
const baseSheets = 4;
const maxAirborne = 4;

// Both the attached sheet and the released one follow the same path out of the nip.
export function stockFeedZ(t, edge) {
  return 1.285 + 1.58 * t + 0.025 * edge * t * t;
}

export function stockHeight(t) {
  return (
    1.079 - 0.65 * ease((t - 0.02) / 0.86) + 0.11 * ease((t - 0.74) / 0.26)
  );
}
export function stockCurl(t, edge) {
  return (0.051 * edge * edge + 0.06 * edge) * t * t;
}

function makeBatch(group, material) {
  // Settled tickets share a draw call per ink plate. Only a new arrival uploads
  // vertices. Keep the first four edges of each stock and recycle the buried
  // layers after sixteen impressions of that stock.
  let capacity = 0,
    count = 0,
    oldest = baseSheets;
  const mesh = new T.Mesh(new T.BufferGeometry(), material);
  mesh.name = "Settled tickets";
  mesh.userData.ticketFaces = [];
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  group.add(mesh);
  const pattern = new T.PlaneGeometry(1, 1, cols, rows);
  function grow() {
    capacity = capacity ? capacity * 2 : 4;
    const geometry = new T.BufferGeometry();
    const old = mesh.geometry;
    for (const [name, size] of [
      ["position", 3],
      ["normal", 3],
      ["uv", 2],
    ]) {
      const data = new Float32Array(capacity * vertices * size);
      if (old.hasAttribute(name)) data.set(old.getAttribute(name).array);
      const attr = new T.BufferAttribute(data, size);
      attr.setUsage(T.DynamicDrawUsage);
      geometry.setAttribute(name, attr);
    }
    const indices = new Uint16Array(capacity * pattern.index.count);
    for (let n = 0; n < capacity; n++) {
      for (let i = 0; i < pattern.index.count; i++)
        indices[n * pattern.index.count + i] =
          pattern.index.array[i] + n * vertices;
    }
    geometry.setIndex(new T.BufferAttribute(indices, 1));
    mesh.geometry = geometry;
    old.dispose();
  }
  return (sheet, order) => {
    if (count === capacity && capacity < maxSheetsPerStock) grow();
    let slot;
    if (count < capacity) {
      slot = count++;
    } else {
      slot = oldest;
      oldest = oldest + 1 === capacity ? baseSheets : oldest + 1;
    }
    for (const name of ["position", "normal", "uv"]) {
      const attr = mesh.geometry.getAttribute(name),
        src = sheet.getAttribute(name).array;
      const offset = slot * vertices * attr.itemSize;
      attr.array.set(src, offset);
      attr.addUpdateRange(offset, src.length);
      attr.needsUpdate = true;
    }
    mesh.userData.ticketFaces[slot] = {
      mesh,
      first: slot * vertices,
      cols,
      rows,
      order,
    };
    mesh.geometry.boundingSphere = null;
    mesh.geometry.setDrawRange(0, count * pattern.index.count);
  };
}

// Bake soft contact into one tabletop shadow as sheets arrive. Flat paper sits
// closer to the table than the directional shadow map's depth bias can resolve.
function floorShadow(group) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  const stamp = document.createElement("canvas");
  stamp.width = 192;
  stamp.height = 90;
  const ink = stamp.getContext("2d");
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const quad = new T.Mesh(
    new T.PlaneGeometry(5.6, 3.5),
    new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  quad.rotation.x = -Math.PI / 2;
  quad.position.set(-0.12, 0.001, 3.68);
  group.add(quad);
  return ({ x, z, angle, plate }) => {
    ink.clearRect(0, 0, stamp.width, stamp.height);
    ink.drawImage(plate.material.map.image, 0, 0, stamp.width, stamp.height);
    ink.globalCompositeOperation = "source-in";
    ink.fillStyle = "#302719";
    ink.fillRect(0, 0, stamp.width, stamp.height);
    ink.globalCompositeOperation = "source-over";
    ctx.save();
    const scale = canvas.width / 5.6;
    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      canvas.width / 2 - quad.position.x * scale,
      canvas.height / 2 - quad.position.z * scale,
    );
    ctx.translate(x + 0.015, z + 0.014);
    ctx.rotate(-angle);
    ctx.globalAlpha = 0.22;
    ctx.shadowColor = "#443728";
    ctx.shadowBlur = 2.8;
    ctx.drawImage(stamp, -width / 2, -depth / 2, width, depth);
    ctx.restore();
    texture.needsUpdate = true;
  };
}

export function createTicketPile(group, paperMaterial) {
  const surface = new Float32Array(gridSize * gridSize).fill(floorY);
  const topSheet = new Uint32Array(gridSize * gridSize);
  const addContact = floorShadow(group);
  const plates = new Map(),
    airborne = [];
  let count = 0;
  function sample(x, z) {
    const gx = (x - xMin) / pitch,
      gz = (z - zMin) / pitch;
    const a = Math.floor(gx),
      b = Math.floor(gz),
      u = gx - a,
      v = gz - b;
    if (a < 0 || b < 0 || a + 1 >= gridSize || b + 1 >= gridSize) return floorY;
    const i = b * gridSize + a;
    return mix(
      mix(surface[i], surface[i + 1], u),
      mix(surface[i + gridSize], surface[i + gridSize + 1], u),
      v,
    );
  }
  function landing() {
    const x = between(-0.39, 0.15),
      angle = between(-0.26, 0.26);
    const c = Math.cos(angle),
      n = Math.sin(angle);
    const spanZ = (Math.abs(n) * width + Math.abs(c) * depth) / 2;
    // Leave room for a skewed back corner to clear the lip of the tray.
    const z = Math.max(2.57 + spanZ, between(3.45, 3.79));
    const corner = Math.random() < 0.5 ? -1 : 1,
      curl = between(0.012, 0.047);
    const target = new Float32Array(vertices * 3);
    // Buried stock compresses so an extended session keeps the stack on the desk.
    const layer = thickness / (1 + count / 64) ** 2;
    for (let r = 0; r <= rows; r++)
      for (let k = 0; k <= cols; k++) {
        const u = k / cols,
          v = r / rows,
          dx = width * (u - 0.5),
          dz = depth * (v - 0.5);
        const xx = x + c * dx + n * dz,
          zz = z - n * dx + c * dz;
        const edge = corner === 1 ? u : 1 - u;
        const natural =
          floorY + curl * edge ** 5 * v ** 4 + 0.007 * (1 - v) ** 5;
        // Stiff stock bridges the shoulder of the sheet beneath it.
        const support = Math.max(
          sample(xx, zz),
          sample(xx - 0.09, zz) - 0.004,
          sample(xx + 0.09, zz) - 0.004,
        );
        const i = (r * stride + k) * 3;
        target[i] = xx;
        target[i + 1] = Math.max(natural, support + layer);
        target[i + 2] = zz;
      }
    // Rasterise only this sheet's footprint. The next ticket can touch both the
    // pile and the bare table if its corner projects past the stack.
    const spanX = (Math.abs(c) * width + Math.abs(n) * depth) / 2;

    for (
      let b = Math.ceil((z - spanZ - zMin) / pitch);
      b <= Math.floor((z + spanZ - zMin) / pitch);
      b++
    ) {
      for (
        let a = Math.ceil((x - spanX - xMin) / pitch);
        a <= Math.floor((x + spanX - xMin) / pitch);
        a++
      ) {
        const dx = xMin + a * pitch - x,
          dz = zMin + b * pitch - z;
        const u = (c * dx - n * dz) / width + 0.5,
          v = (n * dx + c * dz) / depth + 0.5;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        const col = Math.min(cols - 1, Math.floor(u * cols)),
          row = Math.min(rows - 1, Math.floor(v * rows));
        const i = (row * stride + col) * 3 + 1,
          s = u * cols - col,
          t = v * rows - row;
        // Use the same triangle diagonal as PlaneGeometry.
        const h =
          s + t <= 1
            ? target[i] +
              (target[i + 3] - target[i]) * s +
              (target[i + stride * 3] - target[i]) * t
            : target[i + stride * 3 + 3] +
              (target[i + stride * 3] - target[i + stride * 3 + 3]) * (1 - s) +
              (target[i + 3] - target[i + stride * 3 + 3]) * (1 - t);
        topSheet[b * gridSize + a] = count + 1;
        surface[b * gridSize + a] = Math.max(surface[b * gridSize + a], h);
      }
    }
    return { target, corner, x, z, angle, order: count + 1 };
  }

  function finish(sheet) {
    const geo = sheet.mesh.geometry;
    geo.attributes.position.array.set(sheet.target);
    geo.attributes.uv.array.set(sheet.fullUV);
    geo.computeVertexNormals();
    sheet.plate.append(geo, sheet.order);
    addContact(sheet);
    group.remove(sheet.mesh);
    geo.dispose();
  }

  function pose(sheet, now) {
    const time = Math.max(0, (now - sheet.start) / 1000);
    // If the operator changes the setting mid-feed, finish the outgoing strip
    // through the nip before releasing its tail.
    const length = sheet.finishFeed
      ? mix(sheet.length, 1, ease(time / sheet.finishFeed))
      : 1;
    const t = Math.max(0, time - sheet.finishFeed) / sheet.duration;
    if (t >= 1) return true;
    const pos = sheet.mesh.geometry.attributes.position,
      uv = sheet.mesh.geometry.attributes.uv;
    // Fast roller feed, then friction on the table takes out the last of the slide.
    const travel = 1 - (1 - t) ** 2.15;
    const turn = ease((t - 0.14) / 0.83);
    for (let r = 0; r <= rows; r++) {
      const s = r / rows,
        p = s * length;
      const feedY = stockHeight(Math.min(1, p + travel * 1.46));
      for (let k = 0; k <= cols; k++) {
        const i = r * stride + k,
          h = i * 3,
          u = k / cols,
          edge = 2 * u - 1,
          startX = width * (u - 0.5);
        const startZ = stockFeedZ(p, edge);
        const x = mix(startX, sheet.target[h], turn);
        const z = mix(startZ, sheet.target[h + 2], travel);
        const overhang = ease((z - 2.32) / 0.24);
        const contact = 0.71 - 0.36 * s + 0.055 * sheet.corner * edge;
        const fall = clamp((t - contact + 0.29) / 0.29) * overhang;
        const floor = sheet.target[h + 1];
        const ripple =
          0.058 * Math.sin(6.1 * t + 2.8 * s + edge) * Math.sin(Math.PI * fall);
        let y = mix(feedY + stockCurl(p, edge), floor, fall ** 1.7) + ripple;
        if (t > contact && overhang > 0.995) {
          const since = t - contact;
          y =
            floor +
            0.037 *
              Math.sin(Math.PI * clamp(since / 0.15)) *
              (1 - clamp(since / 0.15)) *
              (0.5 + 0.5 * s);
        }
        pos.setXYZ(i, x, Math.max(floor, y), z);
        uv.setXY(i, u, (1 - s) * length);
      }
    }
    sheet.mesh.geometry.boundingSphere = null;
    pos.needsUpdate = uv.needsUpdate = true;
    sheet.mesh.geometry.computeVertexNormals();
    return false;
  }
  function release(texture, length, now, animate) {
    if (!texture) return;
    let plate = plates.get(texture);
    if (!plate) {
      const material = paperMaterial.clone();
      material.map = texture;
      plate = { material, append: makeBatch(group, material) };
      plates.set(texture, plate);
    }
    const geo = new T.PlaneGeometry(1, 1, cols, rows);
    const mesh = new T.Mesh(geo, plate.material);
    mesh.name = "Falling ticket";
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const sheet = {
      ...landing(),
      plate,
      mesh,
      length,
      start: now,
      fullUV: geo.attributes.uv.array.slice(),
      finishFeed: (1 - length) * 0.23,
      duration: 1.13,
    };
    count++;
    if (!animate) {
      finish(sheet);
      return;
    }
    if (airborne.length >= maxAirborne) finish(airborne.shift());
    group.add(mesh);
    airborne.push(sheet);
    pose(sheet, now);
  }
  function update(now) {
    for (let i = 0; i < airborne.length;) {
      const sheet = airborne[i];
      if (!pose(sheet, now)) {
        i++;
        continue;
      }
      finish(sheet);
      airborne.splice(i, 1);
    }
    return airborne.length > 0;
  }
  function settle() {
    for (const sheet of airborne) finish(sheet);
    airborne.length = 0;
  }
  function exposure(x, z, order) {
    const col = Math.round((x - xMin) / pitch),
      row = Math.round((z - zMin) / pitch);
    const i = row * gridSize + col;
    if (topSheet[i] > order) return 0;
    // Ease the bend towards the line where another sheet weighs it down.
    let open = 1;
    for (const offset of [-2, 2, -2 * gridSize, 2 * gridSize]) {
      if (topSheet[i + offset] <= order) open++;
    }
    return (open / 5) ** 2;
  }
  function faceAt(hit) {
    return hit.object.userData.ticketFaces?.[
      Math.floor(hit.faceIndex / (cols * rows * 2))
    ];
  }
  return {
    exposure,
    faceAt,
    release,
    update,
    settle,
    get inFlight() { return airborne.length > 0; },
    get count() {
      return count;
    },
  };
}
