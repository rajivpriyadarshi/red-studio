// Deform just the touched sheet in its existing mesh, including its shadow.
// The roller holds the back of a fresh ticket; the pile holds buried corners.
import * as T from "three";

export function createPaperBreeze(exposure) {
  const active = new Map();
  let hovered = null, lastGust = 0;
  function aim(sheet, uv) {
    hovered = sheet;
    if (!sheet) return;
    lastGust = performance.now();
    let state = active.get(sheet);
    if (!state) {
      const geometry = sheet.mesh.geometry;
      const patch = new T.PlaneGeometry(1, 1, sheet.cols, sheet.rows);
      const offset = sheet.first * 3;
      const end = offset + patch.attributes.position.array.length;
      // A batch may grow while a different ticket is lifting. Remember the
      // vertex offset and fetch the current buffer on every write.
      const rest = geometry.attributes.position.array.slice(offset, end);
      const normals = geometry.attributes.normal.array.slice(offset, end);
      const freedom = new Float32Array(rest.length / 3);
      for (let i = 0; i < freedom.length; i++) {
        freedom[i] = sheet.freedom ? sheet.freedom(rest[3 * i], rest[3 * i + 2]) : sheet.inRoller
          ? 1
          : exposure(rest[3 * i], rest[3 * i + 2], sheet.order);
      }
      state = {
        patch,
        rest,
        normals,
        freedom,
        amount: 0,
        u: uv.x,
        v: 1 - uv.y,
        x: uv.x,
        y: 1 - uv.y,
      };
      active.set(sheet, state);
    }
    state.x = uv.x;
    state.y = 1 - uv.y;
  }
  function write(sheet, positions, normals) {
    const geometry = sheet.mesh.geometry,
      offset = sheet.first * 3;
    for (const [name, values] of [
      ["position", positions],
      ["normal", normals],
    ]) {
      const attr = geometry.attributes[name];
      attr.array.set(values, offset);
      attr.addUpdateRange(offset, values.length);
      attr.needsUpdate = true;
    }
    geometry.boundingSphere = null;
  }
  function restore(sheet, state) {
    write(sheet, state.rest, state.normals);
    state.patch.dispose();
    active.delete(sheet);
  }
  function reset() {
    hovered = null;
    for (const [sheet, state] of active) restore(sheet, state);
  }
  function advance(now, dt) {
    if (now - lastGust > 900) hovered = null;
    for (const [sheet, state] of active) {
      const over = sheet === hovered;
      state.amount = T.MathUtils.damp(
        state.amount,
        over ? 1 : 0,
        over ? 7.8 : 8.4,
        dt,
      );
      if (!over && state.amount < 0.001) {
        restore(sheet, state);
        continue;
      }
      state.u = T.MathUtils.damp(state.u, state.x, 12, dt);
      state.v = T.MathUtils.damp(state.v, state.y, 12, dt);
      const pos = state.patch.attributes.position;
      const clock = now * 0.001;
      for (let i = 0; i < pos.count; i++) {
        const u = (i % (sheet.cols + 1)) / sheet.cols,
          v = Math.floor(i / (sheet.cols + 1)) / sheet.rows;
        const du = u - state.u,
          dv = v - state.v;
        // Broad pressure under the pointer, with most of the bend at a free
        // edge. Two travelling waves keep the corner from bobbing as a unit.
        const pressure = Math.exp(-4.7 * du * du - 2.6 * dv * dv);
        const edge = Math.max(Math.abs(2 * u - 1), Math.abs(2 * v - 1));
        const free = sheet.inRoller ? v * v : 0.14 + 0.86 * edge * edge;
        const wave =
          1 +
          0.23 * Math.sin(4.3 * clock - 3.9 * u - 2.4 * v) +
          0.12 * Math.sin(6.4 * clock + 2 * u - 4 * v);
        const lift =
          (sheet.lift ?? 0.135) * state.amount * free * pressure * wave * state.freedom[i];
        const k = i * 3;
        pos.setXYZ(
          i,
          state.rest[k] - (u - 0.5) * 0.11 * lift,
          state.rest[k + 1] + lift,
          state.rest[k + 2] - (sheet.inRoller ? v : v - 0.5) * 0.14 * lift,
        );
      }
      state.patch.computeVertexNormals();
      write(sheet, pos.array, state.patch.attributes.normal.array);
    }
    return active.size > 0;
  }
  return { aim, advance, reset, get active() { return active.size > 0; } };
}
