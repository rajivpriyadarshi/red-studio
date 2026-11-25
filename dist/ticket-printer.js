import * as T from "three";
import { makePress, inkTexture } from "./press-model.js?v=bench-hover-1";
import {
  createTicketPile,
  stockHeight,
  stockFeedZ,
  stockCurl,
} from "./ticket-pile.js?v=bench-space-1";
import { createPaperBreeze } from "./paper-breeze.js?v=bench-hover-1";
import { createBenchHover } from "./bench-hover.js";
import { makeBenchBook } from "./bench-sketchbook.js?v=standing-book-1";
import { makeStampSet, printStudioSeal } from "./bench-stamp.js?v=bird-1";
import { pressedHeight, rigStamp, seal } from "./stamp-motion.js?v=bench-space-1";
import { makeBenchGround } from "./bench-ground.js?v=standing-book-1";
import { mountPressZoom } from "./press-zoom.js?v=bench-grid-1";

const asset = (name) =>
  new URL("./assets/ticket-window/" + name, import.meta.url).href;
const clamp = T.MathUtils.clamp;
const smooth = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

// A single printable face is mapped over a subdivided strip. Its lower edge is
// the leading edge: more of the original image emerges as the rollers advance.
function paperMesh(finish) {
  const geometry = new T.PlaneGeometry(1, 1, 8, 44);
  geometry.attributes.position.setUsage(T.DynamicDrawUsage);
  geometry.attributes.uv.setUsage(T.DynamicDrawUsage);
  const material = new T.MeshStandardMaterial({
    ...finish,
    roughness: 0.94,
    metalness: 0,
    side: T.DoubleSide,
    alphaTest: 0.48,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function bendPaper(mesh, length, tremor = 0, pressure = 0) {
  const geometry = mesh.geometry,
    pos = geometry.attributes.position,
    uv = geometry.attributes.uv;
  const across = geometry.parameters.widthSegments,
    down = geometry.parameters.heightSegments;
  mesh.visible = length > 0.003;
  for (let row = 0; row <= down; row++) {
    const s = row / down,
      t = s * length;
    // The first centimetre leaves the nip horizontally. The leading edge
    // then droops and develops a shallow reverse curl against the tray.
    const y = stockHeight(t);
    for (let col = 0; col <= across; col++) {
      const u = col / across,
        edge = (u - 0.5) * 2,
        i = row * (across + 1) + col;
      const lift =
        stockCurl(t, edge) + tremor * 0.065 * Math.sin(t * 5.8) * t * t;
      const x = (u - 0.5) * 3.13, z = stockFeedZ(t, edge);
      pos.setXYZ(i, x, pressure ? pressedHeight(x, y + lift, z, pressure) : y + lift, z);
      uv.setXY(i, u, (1 - s) * length);
    }
  }
  geometry.boundingSphere = null;
  geometry.computeVertexNormals();
  pos.needsUpdate = uv.needsUpdate = true;
}

function ticketPlates(invalidate, studioMark) {
  const stock = new Map(), images = new Map(), dirtyPlates = new Set();
  function image(file, plate) {
    let entry = images.get(file);
    if (!entry) {
      const im = new Image(), waiting = new Set();
      entry = { im, waiting };
      images.set(file, entry);
      im.onload = () => {
        for (const dependent of waiting) dirtyPlates.add(dependent);
        waiting.clear();
        invalidate();
      };
      im.onerror = () => waiting.clear();
      im.src = asset(file);
    }
    if (!entry.im.complete) entry.waiting.add(plate);
    return entry.im.complete && entry.im.naturalWidth ? entry.im : null;
  }
  function paintSeal(plate) {
    const { texture, stamped } = plate;
    const ctx = stamped.image.getContext("2d");
    const { width, height } = texture.image;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(texture.image, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    printStudioSeal(ctx, studioMark, width * seal.u, height * (1-seal.v), 99, 69, -.10, .91);
    ctx.globalCompositeOperation = "source-over";
    stamped.userData.cutout = texture.userData.cutout;
    stamped.needsUpdate = true;
  }
  function paint(plate) {
    const { data, texture } = plate;
    const c = texture.image.getContext("2d"),
      w = c.canvas.width,
      h = c.canvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = data.color;
    c.fillRect(0, 0, w, h);
    const lace = image("engine-turn.webp", plate);
    if (lace) c.drawImage(lace, 555, 0, 310, h);
    const art = image(data.art + ".webp?v=bird-1", plate);
    if (art) {
      // The identity proofs sit above the die so the two impressions read separately.
      if (data.art === "logo" || data.art === "identity") c.drawImage(art, 595, 52, 178, 178);
      else c.drawImage(art, 615, 85, 215, 215);
    }
    const fibre = image("grain.png", plate);
    if (fibre) {
      c.save();
      c.globalAlpha = 0.6;
      c.fillStyle = c.createPattern(fibre, "repeat");
      c.fillRect(0, 0, w, h);
      c.restore();
    }
    c.fillStyle = c.strokeStyle = "#2d2921";
    c.lineWidth = 2;
    c.strokeRect(23, 21, 829, h - 42);
    c.font = "bold 21px monospace";
    c.fillText("THE RED STUDIO", 40, 54);
    c.font = "bold 17px monospace";
    c.fillText("TRONDHEIM", 699, 52);
    c.font = "bold 68px Space, Arial, sans-serif";
    const titleSize = Math.min(68, Math.floor(68 * 570 / c.measureText(data.name).width));
    c.font = `bold ${titleSize}px Space, Arial, sans-serif`;
    c.fillText(data.name, 38, 155);
    // The fee is near the leading edge, so it is legible before the feed ends.
    const currencyStart = data.fee.lastIndexOf(" ");
    const amount = data.priced ? data.fee.slice(0, currencyStart) : data.fee;
    c.font = data.priced ? "900 126px Archivo, Arial, sans-serif" : "bold 96px Space, Arial, sans-serif";
    const maxWidth = data.priced ? 445 : 565;
    c.fillText(amount, 35, 303, maxWidth);
    if (data.priced) {
      const width = Math.min(maxWidth, c.measureText(amount).width);
      c.font = "bold 66px Space, Arial, sans-serif";
      c.fillText(data.fee.slice(currencyStart + 1), 51 + width, 301);
    }
    c.fillRect(39, h - 72, 793, 2);
    c.font = "24px monospace";
    c.fillText(data.note, 40, h - 33, 590);
    if (data.priced) c.fillText("EXCL. VAT", 685, h - 33, 150);
    c.setLineDash([8, 7]);
    c.beginPath();
    c.moveTo(879, 0);
    c.lineTo(879, h);
    c.stroke();
    c.setLineDash([]);
    c.textAlign = "center";
    c.font = "bold 24px monospace";
    c.fillText("TRD", 951, 70);
    c.font = "bold 78px Archivo, Arial";
    c.fillText(data.no, 951, 220);
    c.textAlign = "start";
    for (let x = 907; x < 993;) {
      const n = 2 + (x % 5);
      c.fillRect(x, h - 96, n, 50);
      x += n + 3;
    }
    const die = image(data.key === "motion" ? "wave-die.png" : "stock-die.png", plate);
    if (die) {
      if (!texture.userData.cutout) {
        const mask = document.createElement("canvas");
        mask.width = 128;
        mask.height = 50;
        const ctx = mask.getContext("2d");
        ctx.drawImage(die, 0, 0, 128, 50);
        texture.userData.cutout = ctx.getImageData(0, 0, 128, 50);
      }
      c.globalCompositeOperation = "destination-in";
      c.drawImage(die, 0, 0, w, h);
      c.globalCompositeOperation = "source-over";
    }
    texture.needsUpdate = true;
    if (plate.stamped) paintSeal(plate);
  }
  document.fonts.ready.then(() => {
    for (const plate of stock.values()) dirtyPlates.add(plate);
    invalidate();
  });
  return {
    get(data, sealed) {
      if (!stock.has(data.key)) {
        const texture = inkTexture(1024, 400, () => {});
        const plate = { data, texture };
        stock.set(data.key, plate);
        paint(plate);
      }
      const plate = stock.get(data.key);
      if (!sealed) return plate.texture;
      if (!plate.stamped) {
        plate.stamped = inkTexture(1024, 400, () => {});
        paintSeal(plate);
      }
      return plate.stamped;
    },
    refresh(current) {
      if (!dirtyPlates.size) return false;
      const selected = stock.get(current.key);
      const next = dirtyPlates.has(selected) ? selected : dirtyPlates.values().next().value;
      dirtyPlates.delete(next);
      paint(next);
      return true;
    }
  };
}

// Through a punched corner the pointer reaches the next exposed ticket.
function hasInkAt(hit, material) {
  const mask = material.map?.userData.cutout;
  if (!mask || !hit.uv) return true;
  const x = clamp(Math.floor(hit.uv.x * mask.width), 0, mask.width - 1);
  const y = clamp(Math.floor((1 - hit.uv.y) * mask.height), 0, mask.height - 1);
  return mask.data[4 * (x + y * mask.width) + 3] >= 122;
}

// Pre-filtered reflections from the three studio strip lights. The PNG stores
// linear radiance divided by eight, encoded in sRGB, in Three's cube-UV layout.
export async function loadBenchLight() {
  const light = await new T.TextureLoader().loadAsync(asset("studio-light.png"));
  light.mapping = T.CubeUVReflectionMapping;
  light.colorSpace = T.SRGBColorSpace;
  light.flipY = false;
  light.generateMipmaps = false;
  light.minFilter = T.LinearFilter;
  return light;
}

export async function mountPrinter(host, preference, reprint, light, nextSlice, onStampHit) {
  let visible = false, lost = false, frame = 0, dirty = true;
  const canvas = host.querySelector(".press-viewport");
  const studioMark = new Path2D(host.querySelector(".paper-seal path").getAttribute("d"));
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  const compact = matchMedia("(pointer: coarse)").matches || navigator.deviceMemory <= 4;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(23, 1, .1, 70);
  scene.environment = light;
  scene.environmentIntensity = 0.88 * 8;
  scene.add(new T.HemisphereLight(0xfff6e7, 0x93a196, 0.51));
  const key = new T.DirectionalLight(0xfff1dd, 1.94);
  key.position.set(-4.5, 6.4, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(compact ? 512 : 1024);
  Object.assign(key.shadow.camera, {
    left: -6.6,
    right: 6.6,
    top: 6.6,
    bottom: -6.6,
    near: 0.1,
    far: 19,
  });
  key.shadow.normalBias = 0.014;
  key.shadow.bias = -0.00015;
  scene.add(key);
  const rim = new T.DirectionalLight(0xcfdded, 0.53);
  rim.position.set(4, 3, -3);
  scene.add(rim);
  await nextSlice();
  const machine = makePress(wake);
  await nextSlice();
  const bench = new T.Group();
  scene.add(bench);
  machine.model.position.set(-1.96, 0, -1.04);
  machine.model.rotation.y = -.235;
  machine.model.scale.setScalar(.965);
  const book = makeBenchBook(wake);
  book.group.position.set(1.82, 0, -.78);
  book.group.scale.setScalar(1.04);
  book.group.rotation.y = -.43;
  bench.add(machine.model, book.group);
  machine.model.traverse(part => {
    if (part.isMesh) part.geometry.computeBoundingBox();
  });
  const paper = paperMesh(machine.paperFinish);
  machine.model.add(paper);
  const pile = createTicketPile(machine.model, paper.material);
  const breeze = createPaperBreeze(pile.exposure);
  const freshFace = {
    mesh: paper,
    first: 0,
    cols: paper.geometry.parameters.widthSegments,
    rows: paper.geometry.parameters.heightSegments,
    inRoller: true,
  };
  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();
  let pointerOver = false,
    pickAgain = false;
  bench.add(makeBenchGround());
  const contact = new T.Mesh(
    new T.PlaneGeometry(6.3, 4.4),
    new T.MeshBasicMaterial({
      map: inkTexture(160, 100, (c, w, h) => {
        c.scale(w, h);
        const g = c.createRadialGradient(0.5, 0.5, 0.04, 0.5, 0.5, 0.5);
        g.addColorStop(0, "rgba(30,34,29,.62)");
        g.addColorStop(0.48, "rgba(30,34,29,.36)");
        g.addColorStop(1, "rgba(30,34,29,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, 1, 1);
      }),
      transparent: true,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, 0.003, 0.06);
  machine.model.add(contact);
  const bookContact = contact.clone();
  bookContact.scale.set(.49,.62,1);
  bookContact.position.set(.03,.001,-.45);
  book.group.add(bookContact);
  await nextSlice();
  const kit = makeStampSet(contact, studioMark);
  bench.add(kit.group);
  const stamp = rigStamp(kit, machine.model);
  const props = createBenchHover(machine, book, kit);
  function pageFace(mesh, options) {
    const { widthSegments: cols, heightSegments: rows } = mesh.geometry.parameters;
    return { mesh, first: 0, cols, rows, ...options };
  }
  const notebook = pageFace(book.sheet, {
    inRoller: true, lift: .23,
    freedom: (_x, z) => T.MathUtils.smoothstep(z, -1.22, -.80),
  });
  const proof = pageFace(kit.slip, {
    // The stamp holds down the left half of its proof; the right end is loose.
    freedom: x => T.MathUtils.smoothstep(x, .08, .62),
  });
  let hitTime = 0, sealed = false, audibleStrike = false;

  let last = 0,
    start = null,
    stockPosition = 0, stockFrom = 0, stockStop = 0,
    startedDrive = 0;
  let yaw = T.MathUtils.degToRad(-9),
    desiredYaw = yaw,
    lift = T.MathUtils.degToRad(18.5),
    desiredLift = lift,
    drag = null;
  let issued = 1,
    current = null,
    firstView = true;
  const plates = ticketPlates(wake, studioMark);
  let aspect = 1, bufferWidth = 0, bufferHeight = 0, pixelRatio = 0;
  let slowSince = 0, resolutionScale = 1, cameraDirty = true;
  let shadowChanged = true;
  let warmed = false, warmup = null;
  const look = new T.Vector3();
  const cameraDistance = 15;
  const viewSize = new T.Vector2();
  function clearPointer() {
    pointerOver = false;
    breeze.aim(null);
    props.aim(null);
    wake();
  }
  const zoom = mountPressZoom(
    canvas,
    viewSize,
    () => {
      drag = null;
      clearPointer();
    },
    () => {
      pickAgain = true;
      cameraDirty = true;
      wake();
    },
  );
  function frameCamera() {
    // The lens and pivot are independent of the pile, orbit and print cycle.
    const height = Math.max(5.4, 9.75 / aspect);
    viewSize.set(height * aspect, height);
    camera.zoom = zoom.scale;
    camera.aspect = aspect;
    camera.fov = T.MathUtils.radToDeg(2 * Math.atan(height / (2 * cameraDistance)));
    camera.updateProjectionMatrix();
    look.set(
      -1.11 + zoom.x,
      1.18 + zoom.y * Math.cos(lift),
      .26 - zoom.y * Math.sin(lift),
    );
    camera.position.set(
      look.x,
      look.y + cameraDistance * Math.sin(lift),
      look.z + cameraDistance * Math.cos(lift),
    );
    camera.lookAt(look);
    bench.rotation.y = yaw;
  }
  function resize() {
    pickAgain = true;
    if (lost || !visible) return;
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const ratio = resolutionScale * Math.min(devicePixelRatio || 1, 1.4,
      Math.sqrt((compact ? 420000 : 800000) / (width * height)));
    if (width !== bufferWidth || height !== bufferHeight || ratio !== pixelRatio) {
      aspect = width / height;
      bufferWidth = width;
      bufferHeight = height;
      pixelRatio = ratio;
      renderer.setDrawingBufferSize(width, height, ratio);
      cameraDirty = true;
    }
    wake();
  }
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  function schedule() {
    if (!frame && visible && !lost && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function wake() {
    dirty = true;
    schedule();
  }
  function endPrint() {
    pickAgain = true;
    start = null;
    stockPosition = stockStop;
    machine.setStockPosition(stockPosition);
    host.dataset.rollPanel = stockStop % 4;
    issued = 1;
    bendPaper(paper, 1);
    stamp.park();
    sealed = true;
    audibleStrike = false;
    if (current) paper.material.map = plates.get(current, true);
    machine.lever.rotation.x = 0.13;
  }
  async function warmMaterials() {
    await renderer.compileAsync(scene, camera);
    const textures = new Set([scene.environment]);
    scene.traverse(part => {
      if (!part.isMesh) return;
      const materials = Array.isArray(part.material) ? part.material : [part.material];
      for (const mat of materials) {
        for (const key of ["map", "alphaMap", "roughnessMap", "metalnessMap", "bumpMap", "normalMap"]) {
          if (mat[key]) textures.add(mat[key]);
        }
      }
    });
    let count = 0, since = performance.now();
    for (const texture of textures) {
      if (!texture?.image?.width) continue;
      if (count >= 3 || performance.now() - since >= 4) {
        await nextSlice();
        since = performance.now();
        count = 0;
      }
      renderer.initTexture(texture);
      count++;
    }
  }
  function draw(now) {
    frame = 0;
    if (!visible || lost || document.hidden || !current) return;
    if (!warmed) {
      if (!warmup) {
        frameCamera();
        // Keep the illustrated proof on screen while parallel shader compilation finishes.
        warmup = warmMaterials().catch(() => {}).then(() => {
          warmed = true;
          if (visible && firstView && !preference.matches) startFeed(performance.now(), audibleStrike);
          firstView = false;
          wake();
        });
      }
      return;
    }
    const gap = last ? now - last : 0;
    if (gap >= 25 && gap < 170 && resolutionScale > .75) {
      if (!slowSince) slowSince = now;
      if (now - slowSince >= 750) {
        resolutionScale = Math.max(.75, resolutionScale - .125);
        slowSince = 0;
        resize();
      }
    } else slowSince = 0;
    const refreshedPlate = plates.refresh(current);
    const wasPrinting = start !== null;
    const dt = Math.min((now - (last || now)) / 1000, 0.06);
    last = now;
    const movingBench = yaw !== desiredYaw;
    const movingCamera = movingBench || lift !== desiredLift;
    if (preference.matches) {
      yaw = desiredYaw;
      lift = desiredLift;
    } else {
      const follow = 1 - Math.exp(-dt * (drag ? 29 : 12));
      yaw += (desiredYaw - yaw) * follow;
      lift += (desiredLift - lift) * follow;
      if (Math.abs(yaw - desiredYaw) < 0.0003) yaw = desiredYaw;
      if (Math.abs(lift - desiredLift) < 0.0003) lift = desiredLift;
    }
    if (start !== null) {
      const t = (now - start) / 1000;
      const impact = t >= hitTime && !sealed;
      // Even on a missed frame, show the instant of contact before lifting.
      const playhead = impact ? Math.min(t, hitTime + .044) : t;
      const pressure = stamp.sample(playhead, hitTime);
      const run = .76 * smooth((playhead - .06) / .63)
        + (seal.feed - .76) * smooth((playhead - .72) / .68)
        + (1 - seal.feed) * smooth((playhead - hitTime - .17) / .26);
      const braking = Math.max(0, playhead - .53);
      const rebound = Math.sin(braking * 17) * Math.exp(-braking * 7);
      if (issued !== 1 || run < 1) bendPaper(paper, run, rebound, pressure);
      issued = run;
      if (impact) {
        sealed = true;
        paper.material.map = plates.get(current, true);
        if (audibleStrike) onStampHit();
      }
      stockPosition = T.MathUtils.lerp(stockFrom, stockStop, run);
      machine.setStockPosition(stockPosition);
      machine.drive.rotation.x = startedDrive + run * 9.6;
      machine.wheel.rotation.x = machine.drive.rotation.x * 0.29;
      const press = smooth(t / 0.24) * (1 - smooth((t - 0.68) / 0.34));
      machine.lever.rotation.x = 0.13 + 0.65 * press;
      if (playhead >= hitTime + 1.18) endPrint();
    }
    const wasSketching = book.animating;
    const sketching = wasSketching && book.update(now, preference.matches);
    if (wasSketching && !sketching) pickAgain = true;
    const hadFalling = pile.inFlight;
    const falling = hadFalling && pile.update(now);
    if (movingCamera || cameraDirty) {
      frameCamera();
      cameraDirty = false;
    }
    const turning =
      Math.abs(desiredYaw - yaw) > 0.0003 ||
      Math.abs(desiredLift - lift) > 0.0003;
    if (pointerOver && !preference.matches) {
      if (start !== null || falling) pickAgain = true;
      else if (pickAgain || turning) {
        camera.updateMatrixWorld();
        bench.updateWorldMatrix(true, true);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObject(bench, true);
        const hit = hits.find(
          (hit) => {
            const material = Array.isArray(hit.object.material)
              ? hit.object.material[hit.face.materialIndex] : hit.object.material;
            return hit.object.visible && material.depthWrite && hasInkAt(hit, material);
          },
        );
        let sheet = hit && (hit.object === paper ? freshFace : pile.faceAt(hit));
        if (hit?.object === kit.slip) sheet = proof;
        if (hit?.object === book.sheet && !sketching) sheet = notebook;
        breeze.aim(sheet, hit?.uv);
        props.aim(sheet ? null : hit?.object, now, sketching);
        pickAgain = false;
      }
    }
    if (preference.matches) {
      breeze.reset();
      props.reset();
    }
    const hadBreeze = breeze.active;
    const hadPropMotion = props.active;
    const reacting = hadPropMotion && props.advance(now);
    const flutter = !preference.matches && hadBreeze && breeze.advance(now, dt);
    const animated = start !== null || falling || turning || flutter || reacting || sketching;
    if (wasPrinting || hadFalling || movingBench || hadBreeze || hadPropMotion || wasSketching) shadowChanged = true;
    if (dirty || refreshedPlate || wasPrinting || hadFalling || turning || hadBreeze || wasSketching || shadowChanged || movingCamera) {
      // Keep the shadow in step with its caster. Lens-only changes can reuse it.
      if (shadowChanged) {
        renderer.shadowMap.needsUpdate = true;
        shadowChanged = false;
      }
      renderer.render(scene, camera);
      if (!host.classList.contains("model-ready")) {
        host.classList.add("model-ready");
        canvas.tabIndex = 0;
      }
      dirty = false;
    }
    if (animated || refreshedPlate) schedule();
    else { last = slowSince = 0; }
  }
  function startFeed(now, sound = false) {
    sealed = false;
    audibleStrike = sound;
    hitTime = stamp.start();
    paper.material.map = plates.get(current, false);
    // The opening feed brings the waterfront into view. User prints carry
    // on from the current position, including a selection made mid-feed.
    stockFrom = sound ? stockPosition : stockStop - 1;
    startedDrive = machine.drive.rotation.x;
    start = now;
    issued = 0;
    bendPaper(paper, 0);
  }
  function select(data, issue) {
    breeze.reset();
    props.reset();
    pickAgain = true;
    shadowChanged = true;
    const now = performance.now();
    const animate =
      issue && !preference.matches && visible && !document.hidden && !lost;
    if (issue && current) {
      pile.release(paper.material.map, issued, now, animate);
      stockStop = Math.floor(stockPosition + .000001) + 1;
    }
    const changed = current?.key !== data.key;
    current = data;
    if (animate) startFeed(now, true);
    else if (
      changed ||
      preference.matches ||
      start === null ||
      issue
    )
      endPrint();
    if (preference.matches) pile.settle();

    book.select(data, animate);
    machine.indicator(data.no);
    wake();
  }
  function setVisible(on) {
    visible = on;
    if (!on) {
      shadowChanged = true;
      resetGestures();
      cancelAnimationFrame(frame);
      frame = 0;
      if (start !== null) endPrint();
      pile.settle();
      book.settle();
    } else {
      last = slowSince = 0;
      if (warmed && firstView && current && !lost) {
        firstView = false;
        if (!preference.matches) {
          startFeed(performance.now());
        }
      }
      resize();
      wake();
    }
  }
  function resetGestures() {
    pointerOver = false;
    drag = null;
    zoom.cancel();
    breeze.reset();
    props.reset();
  }
  function trackPointer(event) {
    if (
      preference.matches ||
      event.pointerType === "touch" ||
      event.buttons ||
      zoom.active
    )
      return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      (2 * (event.clientX - rect.left)) / rect.width - 1,
      1 - (2 * (event.clientY - rect.top)) / rect.height,
    );
    pointerOver = pickAgain = true;
    schedule();
  }
  canvas.addEventListener("pointerenter", trackPointer);
  canvas.addEventListener("pointerleave", clearPointer);
  canvas.addEventListener("pointerdown", (event) => {
    clearPointer();
    if (!event.isPrimary || event.button !== 0 || zoom.active) return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw: desiredYaw,
      lift: desiredLift,
      moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag) {
      trackPointer(event);
      return;
    }
    if (drag.id !== event.pointerId || zoom.active) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    desiredYaw = drag.yaw + (dx / host.clientWidth) * 4.8;
    desiredLift = clamp(drag.lift + (dy / host.clientHeight) * 0.72, 0.2, 1.13);
    wake();
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const tap = !drag.moved && !zoom.active;
    drag = null;
    if (tap) reprint();
  });
  function cancelDrag(event) {
    if (drag?.id === event.pointerId) drag = null;
  }
  canvas.addEventListener("pointercancel", cancelDrag);
  canvas.addEventListener("lostpointercapture", cancelDrag);
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") desiredYaw -= 0.24;
    else if (event.key === "ArrowRight") desiredYaw += 0.24;
    else if (event.key === "Enter" || event.key === " ") reprint();
    else return;
    event.preventDefault();
    wake();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      last = slowSince = 0;
      shadowChanged = true;
      resetGestures();
      cancelAnimationFrame(frame);
      frame = 0;
      if (start !== null) endPrint();
      pile.settle();
      book.settle();
    } else wake();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    resetGestures();
    endPrint();
    book.settle();
    pile.settle();
    cancelAnimationFrame(frame);
    frame = 0;
    host.classList.remove("model-ready");
    canvas.tabIndex = -1;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    shadowChanged = true;
    if (scene.environment) scene.environment.needsUpdate = true;
    resize();
    wake();
  });
  return { select, setVisible };
}
