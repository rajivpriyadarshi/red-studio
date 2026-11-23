import * as T from "three";
import { makePress, inkTexture } from "./press-model.js?v=resource-1";
import {
  createTicketPile,
  stockHeight,
  stockCurl,
} from "./ticket-pile.js?v=resource-1";
import { createPaperBreeze } from "./paper-breeze.js?v=resource-1";
import { makeBenchBook } from "./bench-sketchbook.js?v=storyboards-1";
import { mountPressZoom } from "./press-zoom.js";

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

function bendPaper(mesh, length, tremor = 0) {
  const geometry = mesh.geometry,
    pos = geometry.attributes.position,
    uv = geometry.attributes.uv;
  const across = geometry.parameters.widthSegments,
    down = geometry.parameters.heightSegments;
  mesh.visible = length > 0.003;
  for (let row = 0; row <= down; row++) {
    const s = row / down,
      t = s * length;
    const z = 1.285 + 1.35 * t;
    // The first centimetre leaves the nip horizontally. The leading edge
    // then droops and develops a shallow reverse curl against the tray.
    const y = stockHeight(t);
    for (let col = 0; col <= across; col++) {
      const u = col / across,
        edge = (u - 0.5) * 2,
        i = row * (across + 1) + col;
      const lift =
        stockCurl(t, edge) + tremor * 0.065 * Math.sin(t * 5.8) * t * t;
      pos.setXYZ(i, (u - 0.5) * 3.13, y + lift, z + 0.025 * edge * t * t);
      uv.setXY(i, u, (1 - s) * length);
    }
  }
  geometry.boundingSphere = null;
  geometry.computeVertexNormals();
  pos.needsUpdate = uv.needsUpdate = true;
}

function ticketPlates(invalidate) {
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
  function paint(plate) {
    const { data, texture } = plate;
    const c = texture.image.getContext("2d"),
      w = c.canvas.width,
      h = c.canvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = data.color;
    c.fillRect(0, 0, w, h);
    const lace = image("engine-turn.webp", plate);
    if (lace) c.drawImage(lace, 322, 0, 554, h);
    const art = image(data.art + ".webp", plate);
    if (art) c.drawImage(art, 492, 54, 288, 288);
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
    c.font = "900 83px Archivo, Arial, sans-serif";
    c.fillText(data.name, 37, 182, 460);
    c.font = "bold 56px Space, Arial, sans-serif";
    c.fillText(data.fee, 40, 259, 450);
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
  }
  document.fonts.ready.then(() => {
    for (const plate of stock.values()) dirtyPlates.add(plate);
    invalidate();
  });
  return {
    get(data) {
      if (!stock.has(data.key)) {
        const texture = inkTexture(1024, 400, () => {});
        const plate = { data, texture };
        stock.set(data.key, plate);
        paint(plate);
      }
      return stock.get(data.key).texture;
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
function hasInkAt(hit) {
  const mask = hit.object.material.map?.userData.cutout;
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

export async function mountPrinter(host, preference, reprint, light, nextSlice) {
  let visible = false, lost = false, frame = 0, dirty = true;
  const canvas = host.querySelector(".press-viewport");
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
    camera = new T.OrthographicCamera();
  scene.environment = light;
  scene.environmentIntensity = 1.05 * 8;
  scene.add(new T.HemisphereLight(0xfff2dd, 0x9b9f95, 0.6));
  const key = new T.DirectionalLight(0xffecd4, 1.56);
  key.position.set(-2.7, 8.5, 3.5);
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
  const rim = new T.DirectionalLight(0xc3ddff, 0.72);
  rim.position.set(4, 3, -3);
  scene.add(rim);
  await nextSlice();
  const machine = makePress(wake);
  await nextSlice();
  const bench = new T.Group();
  scene.add(bench);
  machine.model.position.set(-1.94, 0, -.63);
  machine.model.rotation.y = -.34;
  machine.model.scale.setScalar(.865);
  const book = makeBenchBook(wake);
  book.group.position.set(1.83, 0, .38);
  book.group.scale.setScalar(1.10);
  book.group.rotation.y = -.16;
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
  // Fine stipple in the matte linoleum, with a little long-range variation.
  const deskGrain = inkTexture(256, 256, (c,w,h) => {
    const pixels = c.createImageData(w,h);
    let seed = 1621;
    for (let i=0; i<pixels.data.length; i+=4) {
      seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
      const x = i/4 % w, y = Math.floor(i/4/w);
      const fleck = 226 + (seed / 4294967296) * 22
        + 3*Math.sin(x*2*Math.PI/w)*Math.cos(y*4*Math.PI/h);
      pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = fleck;
      pixels.data[i+3] = 255;
    }
    c.putImageData(pixels,0,0);
  });
  deskGrain.wrapS=deskGrain.wrapT=T.RepeatWrapping;
  deskGrain.repeat.set(84,84);
  const floor = new T.Mesh(
    new T.PlaneGeometry(120, 120),
    new T.MeshStandardMaterial({
      color: 0x9caa98, roughness: .94, metalness: 0,
      map: deskGrain, bumpMap: deskGrain, bumpScale: .006,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;
  floor.receiveShadow = true;
  scene.add(floor);
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
  bookContact.scale.set(.49,.78,1);
  bookContact.position.set(.03,.001,.035);
  book.group.add(bookContact);

  let last = 0,
    start = null,
    startedSpool = 0,
    startedDrive = 0;
  let yaw = 0,
    desiredYaw = yaw,
    lift = T.MathUtils.degToRad(26),
    desiredLift = lift,
    drag = null;
  let issued = 1,
    current = null,
    firstView = true;
  const plates = ticketPlates(wake);
  let aspect = 1, bufferWidth = 0, bufferHeight = 0, pixelRatio = 0;
  let slowSince = 0, resolutionScale = 1, cameraDirty = true;
  let shadowChanged = true;
  let warmed = false, warmup = null;
  const look = new T.Vector3();
  function clearPointer() {
    pointerOver = false;
    breeze.aim(null);
    wake();
  }
  const zoom = mountPressZoom(
    canvas,
    camera,
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
    const height = Math.max(4.85, 8.95 / aspect);
    camera.zoom = zoom.scale;
    camera.left = (-height * aspect) / 2;
    camera.right = -camera.left;
    camera.top = height / 2;
    camera.bottom = -camera.top;
    camera.near = 0.1;
    camera.far = 70;
    camera.updateProjectionMatrix();
    look.set(
      .02 + zoom.x,
      1.27 + zoom.y * Math.cos(lift),
      .36 - zoom.y * Math.sin(lift),
    );
    camera.position.set(
      look.x,
      look.y + 12 * Math.sin(lift),
      look.z + 12 * Math.cos(lift),
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
    issued = 1;
    bendPaper(paper, 1);
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
          if (visible && firstView && !preference.matches) startFeed(performance.now());
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
      const run =
        0.77 * smooth((t - 0.07) / 0.57) + 0.23 * smooth((t - 0.68) / 0.33);
      issued = run;
      bendPaper(paper, run, Math.sin(t * 22) * (1 - smooth((t - 0.84) / 0.31)));
      machine.spool.rotation.x = startedSpool + run * 2.2;
      machine.drive.rotation.x = startedDrive + run * 9.6;
      machine.wheel.rotation.x = machine.drive.rotation.x * 0.29;
      machine.leader.offset.y = -machine.spool.rotation.x * 0.48;
      const press = smooth(t / 0.24) * (1 - smooth((t - 0.68) / 0.34));
      machine.lever.rotation.x = 0.13 + 0.65 * press;
      if (t >= 1.15) endPrint();
    }
    const wasSketching = book.animating;
    const sketching = wasSketching && book.update(now, preference.matches);
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
        machine.model.updateWorldMatrix(true, true);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObject(bench, true);
        const hit = hits.find(
          (hit) => hit.object.visible && hit.object.material.depthWrite && hasInkAt(hit),
        );
        const sheet =
          hit && (hit.object === paper ? freshFace : pile.faceAt(hit));
        breeze.aim(sheet, hit?.uv);
        pickAgain = false;
      }
    }
    if (preference.matches) breeze.reset();
    const hadBreeze = breeze.active;
    const flutter = !preference.matches && hadBreeze && breeze.advance(now, dt);
    const animated = start !== null || falling || turning || flutter || sketching;
    if (wasPrinting || hadFalling || movingBench || hadBreeze || wasSketching) shadowChanged = true;
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
  function startFeed(now) {
    startedSpool = machine.spool.rotation.x;
    startedDrive = machine.drive.rotation.x;
    start = now;
    issued = 0;
    bendPaper(paper, 0);
  }
  function select(data, issue) {
    breeze.reset();
    pickAgain = true;
    shadowChanged = true;
    const now = performance.now();
    const animate =
      issue && !preference.matches && visible && !document.hidden && !lost;
    if (issue && current) {
      pile.release(paper.material.map, issued, now, animate);
    }
    if (animate) startFeed(now);
    else if (
      current?.key !== data.key ||
      preference.matches ||
      start === null ||
      issue
    )
      endPrint();
    if (preference.matches) pile.settle();
    current = data;
    paper.material.map = plates.get(data);
    paper.material.needsUpdate = true;
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
    else if (!zoom.key(event)) return;
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
