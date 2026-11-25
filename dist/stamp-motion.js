import * as T from "three";
import { stockCurl, stockFeedZ, stockHeight } from "./ticket-pile.js?v=bench-space-1";

const clamp = T.MathUtils.clamp;
const smooth = t => T.MathUtils.smootherstep(t, 0, 1);
const point = (x, y, z) => new T.Vector3(x, y, z);

// v follows the printed texture from the leading edge back towards the roller.
export const seal = { u: .795, v: .35, feed: .95 };
const edge = seal.u * 2 - 1;
const tHit = seal.feed - seal.v;
const height = (t, edge) => stockHeight(t) + stockCurl(t, edge);
const center = point(3.13 * (seal.u - .5), height(tHit, edge), stockFeedZ(tHit, edge));
const along = point(3.13,
  (height(tHit, edge+.001) - height(tHit, edge-.001)) / .001,
  (stockFeedZ(tHit, edge+.001) - stockFeedZ(tHit, edge-.001)) / .001
).normalize();
const down = point(0, height(tHit+.001, edge)-height(tHit-.001, edge),
  stockFeedZ(tHit+.001, edge)-stockFeedZ(tHit-.001, edge)).normalize();
const normal = down.clone().cross(along).normalize();
const ticketRotation = new T.Quaternion().setFromRotationMatrix(
  new T.Matrix4().makeBasis(along, normal, along.clone().cross(normal))
);

// Stiffen the patch under the circular die, then give the paper its curl back.
export function pressedHeight(x, y, z, pressure) {
  const dx = x-center.x, dz = z-center.z;
  const weight = 1 - T.MathUtils.smoothstep(dx*dx + dz*dz, .065, .18);
  const plane = center.y - (normal.x*dx + normal.z*dz + .026) / normal.y;
  return T.MathUtils.lerp(y, plane, weight * pressure);
}

export function rigStamp(kit, machine) {
  const { group, stamp } = kit;
  const ink = machine.worldToLocal(group.localToWorld(kit.ink.clone()));
  machine.attach(stamp); // Carry, paper and tool now share the press coordinate system.
  const home = stamp.position.clone();
  const rest = stamp.quaternion.clone();
  const offset = new T.Vector3();
  const pose = new T.Vector3();
  const bank = new T.Quaternion();
  const rotation = new T.Euler();
  const inkAt = .16;
  const lift = (p, h) => p.clone().add(point(0, h, 0));
  ink.y -= .004 * stamp.scale.y;
  const touch = center.clone().addScaledVector(normal, -.004 * stamp.scale.y);
  const approach = touch.clone().addScaledVector(normal, .50);

  const dip = new T.CatmullRomCurve3([home, lift(home, .34),
    lift(ink, .31), ink]);
  // Both arcs travel across the front of the bench. Return just in front of
  // the open pad so the handle can come straight down onto its proof slip.
  const crest = (a, b, rise, forward) => {
    const mid = a.clone().lerp(b, .5);
    mid.y = Math.max(a.y, b.y) + rise;
    mid.z += forward;
    return mid;
  };
  const carry = new T.CatmullRomCurve3([ink, lift(ink, .28),
    crest(ink, touch, .54, .12), approach, touch]);
  const park = new T.CatmullRomCurve3([touch, approach,
    crest(touch, home, .48, .28), lift(home, .30), home]);
  for (const path of [dip, carry, park]) path.updateArcLengths();

  let progress = 0, from = 0, prep = .47;
  const startRotation = new T.Quaternion();
  function outbound(p) {
    return p <= inkAt ? dip.getPointAt(p / inkAt, pose)
      : carry.getPointAt((p - inkAt) / (1 - inkAt), pose);
  }
  function orient(reach, lean) {
    stamp.quaternion.slerpQuaternions(rest, ticketRotation, reach);
    bank.setFromEuler(rotation.set(.07 * lean, -.10 * lean, .14 * lean));
    stamp.quaternion.multiply(bank);
  }
  return {
    start() {
      from = progress;
      // A new selection can catch the stamp on its way home. Re-ink from
      // its actual pose, taking longer when the return distance is greater.
      offset.copy(stamp.position).sub(outbound(from));
      startRotation.copy(stamp.quaternion);
      prep = .47 + Math.max(0, from - 2 * inkAt) * .94;
      return prep + .11 + .99;
    },
    sample(time, hitTime) {
      if (time < prep) {
        const u = smooth(time / prep);
        progress = T.MathUtils.lerp(from, inkAt, u);
        stamp.position.copy(outbound(progress)).addScaledVector(offset, 1-u);
        stamp.quaternion.slerpQuaternions(startRotation, rest, u);
        stamp.quaternion.multiply(bank.setFromEuler(rotation.set(0, 0, -.10*Math.sin(Math.PI*u))));
        return 0;
      }
      if (time < prep + .11) {
        progress = inkAt;
        stamp.position.copy(ink);
        stamp.position.y -= .013 * Math.sin(Math.PI * (time-prep)/.11);
        stamp.quaternion.copy(rest);
        return 0;
      }
      if (time < hitTime) {
        const u = clamp((time-prep-.11)/.99, 0, 1);
        // The die still has a little velocity when it meets the paper.
        const reach = u*u*(2.6-1.6*u);
        progress = inkAt + (1-inkAt)*reach;
        stamp.position.copy(outbound(progress));
        orient(smooth((reach-.40)/.54), Math.sin(Math.PI*reach));
        return 0;
      }
      const since = time - hitTime;
      if (since <= .15) {
        progress = 1;
        const pressure = smooth(since/.044) * (1-smooth((since-.083)/.067));
        stamp.position.copy(touch).addScaledVector(normal, -.026 * pressure);
        stamp.quaternion.copy(ticketRotation);
        return pressure;
      }
      const u = smooth((since-.15)/1.03);
      progress = 1-u;
      park.getPointAt(u, stamp.position);
      orient(1-smooth(u/.53), -.80*Math.sin(Math.PI*u));
      return 0;
    },
    park() {
      progress = 0;
      stamp.position.copy(home);
      stamp.quaternion.copy(rest);
    }
  };
}
