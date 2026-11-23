import * as T from "three";
import { addPart, batchFixedParts, inkTexture } from "./press-model.js?v=bench-hover-1";
import { roundedShape } from "./bench-sketchbook.js?v=bench-hover-1";

function turned(profile) {
  return new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r, y)), 36);
}

function tinPlate(width, depth, thickness, radius) {
  const geometry = new T.ExtrudeGeometry(roundedShape(width, depth, radius), {
    depth: thickness, bevelEnabled: true, bevelSegments: 2,
    bevelSize: .012, bevelThickness: .012, curveSegments: 5,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function mapleGrain() {
  return inkTexture(192, 192, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const angle = 2 * Math.PI * x / w;
        const drift = Math.sin(angle * 2 + y / 95) + .25 * Math.sin(angle * 7 - y / 67);
        const growth = .5 + .5 * Math.sin(17 * angle + 2.2 * drift);
        const fibre = Math.sin(61 * angle + drift) * 2;
        const value = 12 * growth ** 3 + fibre;
        const i = 4 * (y * w + x);
        pixels.data[i] = 152 - value;
        pixels.data[i + 1] = 94 - .8 * value;
        pixels.data[i + 2] = 54 - .55 * value;
        pixels.data[i + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  });
}

function makeStamp(metal, rubber) {
  const stamp = new T.Group();
  const maple = new T.MeshStandardMaterial({ map: mapleGrain(), roughness: .37, metalness: .02 });
  const grip = turned([
    [0,.073],[.281,.073],[.308,.085],[.322,.11],[.322,.178],[.312,.20],
    [.235,.22],[.184,.252],[.135,.283],[.108,.331],[.097,.43],
    [.113,.52],[.157,.58],[.205,.64],[.219,.70],[.208,.75],
    [.176,.786],[.11,.81],[0,.816],
  ]);
  addPart(stamp, grip, maple, 0, 0, 0);
  addPart(stamp, turned([[0,.004],[.294,.004],[.305,.012],[.306,.066],[.298,.077],[0,.077]]), rubber, 0, 0, 0);
  addPart(stamp, turned([[.108,.309],[.122,.310],[.124,.323],[.113,.335],[.106,.335]]), metal, 0, 0, 0);
  return stamp;
}

function inkCushion() {
  const map = inkTexture(192, 116, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    let seed = 95;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const fibres = 12 * (seed / 4294967296 - .5) + ((x + y) % 3 - 1) * 3;
        const radius = Math.hypot((x - .53 * w) / h, (y - .49 * h) / h);
        const wear = 18 * Math.exp(-((radius - .41) ** 2) / .0008);
        const i = 4 * (y * w + x);
        pixels.data[i] = 89 + fibres + wear;
        pixels.data[i + 1] = 44 + fibres + .53 * wear;
        pixels.data[i + 2] = 49 + fibres + .44 * wear;
        pixels.data[i + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  });
  const geometry = tinPlate(.956, .573, .019, .052);
  const { position, uv } = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, .5 + position.getX(i) / .98, .5 - position.getZ(i) / .6);
  }
  return new T.Mesh(geometry, new T.MeshStandardMaterial({ map, roughness: .98 }));
}

function makeInkPad(metal, enamel, rubber) {
  const pad = new T.Group();
  addPart(pad, tinPlate(1.08,.69,.081,.086), enamel, 0, .019, 0);
  addPart(pad, tinPlate(1.082,.69,.015,.085), metal, 0, .093, 0);
  addPart(pad, tinPlate(1.009,.622,.016,.064), rubber, 0, .106, 0);
  const felt = inkCushion();
  felt.position.y = .123;
  pad.add(felt);

  // The hinge axis runs along the far lip. The open lid shows its rolled rim
  // and shallow pressed recess, with the enamel underside facing the desk.
  const hinge = new T.CylinderGeometry(.028,.028,.95,12);
  hinge.rotateZ(Math.PI / 2);
  addPart(pad, hinge, metal, 0, .119, -.355);
  const lid = new T.Group();
  lid.name = "Ink pad lid";
  const length = .685;
  addPart(lid, tinPlate(1.08,length,.034,.085), enamel, 0, -.036, -length / 2);
  addPart(lid, tinPlate(1.064,length-.012,.007,.079), metal, 0, .003, -length / 2);
  addPart(lid, tinPlate(.962,length-.10,.006,.056), metal, 0, .011, -length / 2);
  lid.position.set(0,.122,-.354);
  for (const z of [-.23, -.46]) {
    addPart(lid, tinPlate(.69,.02,.009,.009), metal, 0, .028, z);
  }
  lid.rotation.x = .37;
  batchFixedParts(lid);
  batchFixedParts(pad);
  pad.add(lid);
  return { pad, lid };
}

const studioMark = new Path2D("M0 0h24q14 0 14 14 0 8-8 11l10 15H26L16 26h-3v14H0zm13 10v7h10q4 0 4-3.5T23 10z");

export function printStudioSeal(ctx, x, y, radiusX, radiusY, turn, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radiusX / 41, radiusY / 41);
  ctx.rotate(turn);
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = ctx.fillStyle = "#92332f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 41, 0, Math.PI * 2);
  ctx.stroke();
  ctx.translate(-20, -20);
  ctx.fill(studioMark, "evenodd");
  ctx.restore();
}

function proofSlip() {
  const proof = inkTexture(384, 208, (ctx, w, h) => {
    ctx.fillStyle = "#d5c8b0";
    ctx.fillRect(0, 0, w, h);
    // Ink builds up unevenly on a second impression from the same stamp.
    printStudioSeal(ctx, 247, 91, 73.8, 73.8, -.13, .84);
    printStudioSeal(ctx, 374, 178, 73.8, 73.8, .14, .34);
    let seed = 719;
    const pixels = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const fleck = seed / 4294967296;
      if (fleck > .91 && pixels.data[i] < 200) {
        pixels.data[i] = 208;
        pixels.data[i + 1] = 191;
        pixels.data[i + 2] = 166;
      } else {
        const grain = Math.round(5 * (fleck - .5));
        for (let c = i; c < i + 3; c++) pixels.data[c] += grain;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  });
  const page = new T.PlaneGeometry(1.48,.80,10,3);
  page.rotateX(-Math.PI / 2);
  const pos = page.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const right = (pos.getX(i) + .74) / 1.48;
    const front = (pos.getZ(i) + .4) / .8;
    pos.setY(i, .003 + .039 * right ** 5 * front ** 2);
  }
  page.computeVertexNormals();
  const mesh = new T.Mesh(page, new T.MeshStandardMaterial({ map: proof, side: T.DoubleSide, roughness: .96 }));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function makeStampSet(contactShadow) {
  const group = new T.Group();
  group.name = "Stamp and ink pad";
  const metal = new T.MeshStandardMaterial({ color: 0xb0a790, metalness: .72, roughness: .44 });
  const enamel = new T.MeshStandardMaterial({ color: 0x3a4942, metalness: .36, roughness: .47 });
  const rubber = new T.MeshStandardMaterial({ color: 0x322c28, roughness: .83 });
  const { pad, lid } = makeInkPad(metal, enamel, rubber);
  pad.position.set(-.68, 0, -.12);
  pad.rotation.y = -.26;
  const slip = proofSlip();
  slip.name = "Stamp proof";
  slip.position.set(.52, 0, .11);
  slip.rotation.y = .23;
  const stamp = makeStamp(metal, rubber);
  stamp.position.set(.20, .003, .16);
  group.add(pad, slip);

  const contact = contactShadow.clone();
  contact.scale.set(.44, .33, 1);
  contact.position.set(0, .001, -.045);
  group.add(contact);
  batchFixedParts(stamp);
  stamp.name = "Hand stamp";
  group.add(stamp);
  group.position.set(.95, 0, 1.65);
  const ink = pad.position.clone();
  ink.y = .153; // Top of the felt, including its bevel.
  return { group, stamp, pad, lid, slip, ink };
}
