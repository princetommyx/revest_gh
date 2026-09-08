// 3D role marks — Collector, Disposer, Recycler.
// Ported from the Revesta identity prototype (Claude Design export,
// `revesta-role-marks.html` / `roles-3d.js`). Geometry, materials and
// palette are unchanged; only the THREE import moved from an import-map
// CDN pin to the npm package used by the app.
import * as THREE from 'three';

const M = {
  paper: new THREE.MeshStandardMaterial({ name: 'paper', color: '#f3f2f2', roughness: 0.85, metalness: 0.05 }),
  ink: new THREE.MeshStandardMaterial({ name: 'ink', color: '#201e1d', roughness: 0.55, metalness: 0.15 }),
  cyan: new THREE.MeshStandardMaterial({ name: 'cyan', color: '#0088b0', roughness: 0.45, metalness: 0.2 }),
  magenta: new THREE.MeshStandardMaterial({ name: 'magenta', color: '#d6006c', roughness: 0.45, metalness: 0.2 }),
  yellow: new THREE.MeshStandardMaterial({ name: 'yellow', color: '#f2b800', roughness: 0.5, metalness: 0.15 }),
};

function mesh(name, geo, mat, pos, rot) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  return m;
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Shared plinth every mark stands on, so the three read as one set.
function plinth() {
  const g = new THREE.Group();
  g.name = 'plinth';
  g.add(mesh('plinth_disc', new THREE.CylinderGeometry(0.56, 0.58, 0.06, 64), M.paper, [0, 0.03, 0]));
  g.add(mesh('plinth_ring', new THREE.TorusGeometry(0.565, 0.008, 12, 64), M.ink, [0, 0.06, 0], [Math.PI / 2, 0, 0]));
  return g;
}

/* ---------------------------------------------------------------- collector
   A three-wheel cargo tricycle: the collector hauls other people's
   material, so the mark is the vehicle with a loaded bed. */
export function collector() {
  const root = new THREE.Group();
  root.name = 'collector_mark';
  root.add(plinth());

  const v = new THREE.Group();
  v.name = 'tricycle';
  v.position.y = 0.06;

  const wheelGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.055, 32);
  const hubGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.062, 20);
  const wheels = [
    ['wheel_front', -0.36, 0],
    ['wheel_rear_left', 0.20, 0.155],
    ['wheel_rear_right', 0.20, -0.155],
  ];
  for (const [name, x, z] of wheels) {
    v.add(mesh(name, wheelGeo, M.ink, [x, 0.105, z], [Math.PI / 2, 0, 0]));
    v.add(mesh(name + '_hub', hubGeo, M.paper, [x, 0.105, z], [Math.PI / 2, 0, 0]));
  }

  // Chassis rail + cab
  v.add(mesh('chassis', new THREE.BoxGeometry(0.72, 0.045, 0.26), M.ink, [0.02, 0.12, 0]));
  v.add(mesh('cab', new THREE.BoxGeometry(0.20, 0.24, 0.24), M.ink, [-0.27, 0.26, 0]));
  v.add(mesh('windscreen', new THREE.BoxGeometry(0.015, 0.13, 0.19), M.cyan, [-0.372, 0.31, 0]));
  v.add(mesh('handlebar', new THREE.CylinderGeometry(0.014, 0.014, 0.30, 16), M.paper, [-0.30, 0.42, 0], [Math.PI / 2, 0, 0]));
  v.add(mesh('steer_column', new THREE.CylinderGeometry(0.018, 0.018, 0.22, 16), M.paper, [-0.33, 0.34, 0], [0, 0, 0.22]));

  // Cargo bed, cyan — the working surface
  const bed = new THREE.Group();
  bed.name = 'cargo_bed';
  bed.position.set(0.18, 0.145, 0);
  bed.add(mesh('bed_floor', new THREE.BoxGeometry(0.50, 0.03, 0.34), M.cyan, [0, 0.015, 0]));
  bed.add(mesh('bed_wall_left', new THREE.BoxGeometry(0.50, 0.17, 0.022), M.cyan, [0, 0.10, 0.159]));
  bed.add(mesh('bed_wall_right', new THREE.BoxGeometry(0.50, 0.17, 0.022), M.cyan, [0, 0.10, -0.159]));
  bed.add(mesh('bed_wall_back', new THREE.BoxGeometry(0.022, 0.17, 0.34), M.cyan, [0.239, 0.10, 0]));
  bed.add(mesh('bed_wall_front', new THREE.BoxGeometry(0.022, 0.20, 0.34), M.cyan, [-0.239, 0.115, 0]));
  bed.add(mesh('bed_rim', new THREE.BoxGeometry(0.52, 0.016, 0.36), M.ink, [0, 0.19, 0]));
  v.add(bed);

  // The load: baled material, stacked
  const load = new THREE.Group();
  load.name = 'load';
  load.position.set(0.18, 0.34, 0);
  load.add(mesh('bale_a', new THREE.BoxGeometry(0.19, 0.15, 0.15), M.paper, [-0.11, 0.06, 0.07], [0, 0.12, 0]));
  load.add(mesh('bale_b', new THREE.BoxGeometry(0.17, 0.13, 0.16), M.magenta, [0.08, 0.05, -0.06], [0, -0.18, 0]));
  load.add(mesh('bale_c', new THREE.CylinderGeometry(0.075, 0.075, 0.20, 32), M.yellow, [0.10, 0.06, 0.10], [0, 0, Math.PI / 2]));
  load.add(mesh('strap', new THREE.TorusGeometry(0.125, 0.008, 10, 40), M.ink, [-0.02, 0.06, 0], [0, Math.PI / 2, 0]));
  v.add(load);

  root.add(v);
  return root;
}

/* ----------------------------------------------------------------- disposer
   The household side: a wheeled bin, lid tipped open, a tied bag going in. */
export function disposer() {
  const root = new THREE.Group();
  root.name = 'disposer_mark';
  root.add(plinth());

  const bin = new THREE.Group();
  bin.name = 'bin';
  bin.position.set(0, 0.06, 0);

  bin.add(mesh('bin_body', new THREE.CylinderGeometry(0.255, 0.205, 0.50, 40), M.ink, [0, 0.36, 0]));
  bin.add(mesh('bin_lip', new THREE.TorusGeometry(0.256, 0.018, 14, 48), M.ink, [0, 0.605, 0], [Math.PI / 2, 0, 0]));
  bin.add(mesh('bin_band', new THREE.CylinderGeometry(0.243, 0.243, 0.07, 40), M.cyan, [0, 0.30, 0]));
  bin.add(mesh('bin_inner', new THREE.CylinderGeometry(0.235, 0.19, 0.46, 40, 1, true), M.paper, [0, 0.375, 0]));

  // Lid, hinged at the back and tipped open
  const lid = new THREE.Group();
  lid.name = 'lid';
  lid.position.set(0, 0.61, -0.24);
  lid.rotation.x = -1.75;
  lid.add(mesh('lid_disc', new THREE.CylinderGeometry(0.275, 0.275, 0.035, 44), M.cyan, [0, 0.012, 0.24]));
  lid.add(mesh('lid_crown', new THREE.CylinderGeometry(0.16, 0.20, 0.03, 40), M.cyan, [0, 0.038, 0.24]));
  lid.add(mesh('lid_grip', new THREE.BoxGeometry(0.16, 0.03, 0.035), M.ink, [0, 0.06, 0.36]));
  bin.add(lid);
  bin.add(mesh('hinge', new THREE.CylinderGeometry(0.022, 0.022, 0.16, 20), M.ink, [0, 0.61, -0.245], [0, 0, Math.PI / 2]));

  // Wheels + axle at the back
  const wheelGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 28);
  bin.add(mesh('wheel_left', wheelGeo, M.ink, [-0.20, 0.075, -0.10], [Math.PI / 2, 0, Math.PI / 2]));
  bin.add(mesh('wheel_right', wheelGeo, M.ink, [0.20, 0.075, -0.10], [Math.PI / 2, 0, Math.PI / 2]));
  bin.add(mesh('axle', new THREE.CylinderGeometry(0.018, 0.018, 0.40, 16), M.ink, [0, 0.075, -0.10], [0, 0, Math.PI / 2]));

  // The bag being dropped in
  const bag = new THREE.Group();
  bag.name = 'bag';
  bag.position.set(0.06, 1.02, 0.04);
  bag.rotation.set(0.1, 0, 0.34);
  const bagGeo = new THREE.SphereGeometry(0.15, 32, 24);
  bagGeo.scale(1, 0.9, 1);
  bag.add(mesh('bag_body', bagGeo, M.magenta, [0, 0, 0]));
  bag.add(mesh('bag_neck', new THREE.CylinderGeometry(0.05, 0.085, 0.10, 24), M.magenta, [0, 0.15, 0]));
  bag.add(mesh('bag_tie', new THREE.TorusGeometry(0.048, 0.014, 10, 24), M.ink, [0, 0.20, 0], [Math.PI / 2, 0, 0]));
  bag.add(mesh('bag_ear_left', new THREE.ConeGeometry(0.04, 0.11, 16), M.magenta, [-0.055, 0.26, 0], [0, 0, 0.5]));
  bag.add(mesh('bag_ear_right', new THREE.ConeGeometry(0.04, 0.11, 16), M.magenta, [0.055, 0.26, 0], [0, 0, -0.5]));
  bin.add(bag);

  root.add(bin);
  return root;
}

/* ----------------------------------------------------------------- recycler
   The loop itself: three arrow bands as three process inks, slotted into
   the plinth — the facility that closes the cycle. */
export function recycler() {
  const root = new THREE.Group();
  root.name = 'recycler_mark';
  root.add(plinth());

  const arm = new THREE.Shape();
  arm.moveTo(-0.47, -0.055);
  arm.lineTo(0.30, -0.055);
  arm.lineTo(0.30, -0.145);
  arm.lineTo(0.55, 0.0);
  arm.lineTo(0.30, 0.145);
  arm.lineTo(0.30, 0.055);
  arm.lineTo(-0.47, 0.055);
  arm.closePath();
  const armGeo = new THREE.ExtrudeGeometry(arm, {
    depth: 0.11, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 8,
  });
  armGeo.translate(0, -0.27, -0.055);

  const loop = new THREE.Group();
  loop.name = 'recycle_loop';
  loop.position.set(0, 0.50, 0);
  const inks = [['arrow_cyan', M.cyan], ['arrow_magenta', M.magenta], ['arrow_yellow', M.yellow]];
  inks.forEach(([name, mat], i) => {
    const a = mesh(name, armGeo, mat, [0, 0, 0], [0, 0, (i * 2 * Math.PI) / 3]);
    a.position.z = i * 0.001; // keep coplanar overlaps from z-fighting
    loop.add(a);
  });
  root.add(loop);

  // Slim ink foot under the flat bottom arm, so the mark meets the plinth
  root.add(mesh('foot', new THREE.ExtrudeGeometry(roundedRectShape(0.34, 0.09, 0.02), { depth: 0.13, bevelEnabled: false }), M.ink, [0, 0.06, -0.065]));

  return root;
}

export const ROLE_MARKS = { collector, disposer, recycler };
