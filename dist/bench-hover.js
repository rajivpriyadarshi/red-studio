import * as T from "three";

// Keep pointer motion in the tool's own axes. The printing and sketching
// routines still own its parent, including during an interrupted gesture.
function movingParts(assembly) {
  const pivot = new T.Group();
  pivot.add(...assembly.children.slice());
  assembly.add(pivot);
  return pivot;
}

export function createBenchHover(machine, book, kit) {
  const pencil = movingParts(book.tool);
  const stamp = movingParts(kit.stamp);
  const lever = movingParts(machine.lever);
  const wheel = movingParts(machine.wheel);
  const openAngle = kit.lid.rotation.x;
  const reactions = new Map([
    [book.tool, { duration: 830, pose(amount) {
      // Roll across a couple of flats on the hexagonal barrel.
      pencil.rotation.x = -1.36 * amount;
      pencil.position.z = -.061 * amount;
      pencil.rotation.y = .032 * amount;
    } }],
    [kit.stamp, { duration: 710, pose(amount) {
      stamp.rotation.z = .16 * amount;
      // Lift the centre just enough to keep the rubber rim on the desk.
      stamp.position.y = .305 * Math.abs(Math.sin(stamp.rotation.z));
    } }],
    [kit.pad, { duration: 640, pose(amount) {
      kit.lid.rotation.x = openAngle + .24 * amount;
    } }],
    [machine.body, { duration: 680, pose(amount) {
      lever.rotation.x = .12 * amount;
      wheel.rotation.x = .18 * amount;
    } }],
  ]);
  const playing = new Map();
  let last = null;
  function aim(object, now, sketching) {
    let root = object;
    while (root && !reactions.has(root)) root = root.parent;
    if (sketching && root === book.tool) root = null;
    if (root && root !== last && !playing.has(root)) playing.set(root, now);
    last = root;
  }
  function advance(now) {
    for (const [root, start] of playing) {
      const reaction = reactions.get(root);
      const t = Math.min(1, (now - start) / reaction.duration);
      // A push, one small recoil, then exact rest even if the pointer stays.
      reaction.pose(2 * Math.sin(2 * Math.PI * t) * (1 - t) ** 2);
      if (t === 1) playing.delete(root);
    }
    return playing.size > 0;
  }
  function reset() {
    for (const root of playing.keys()) reactions.get(root).pose(0);
    playing.clear();
    last = null;
  }
  return { aim, advance, reset, get active() { return playing.size > 0; } };
}
