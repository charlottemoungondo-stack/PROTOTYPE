/* Corpus — moteur 3D du coach : avatar articulé, poses par images clés,
   ancrage au sol, cinématique inverse des membres, accessoires. */
(function () {
  'use strict';
  const D = Math.PI / 180;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _m = new THREE.Matrix4();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (u) => u * u * (3 - 2 * u);

  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

  /* ---------- Matériaux ---------- */
  function skinMat(hex) {
    return new THREE.MeshPhysicalMaterial({
      color: hex, roughness: 0.5, metalness: 0,
      sheen: 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffd2bf),
      clearcoat: 0.08, clearcoatRoughness: 0.55,
    });
  }
  function fabricMat(hex, rough = 0.8) {
    const c = new THREE.Color(hex);
    return new THREE.MeshPhysicalMaterial({
      color: c, roughness: rough, metalness: 0,
      sheen: 0.9, sheenRoughness: 0.45, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.35),
    });
  }
  const std = (hex, rough = 0.5, metal = 0) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });

  /* ---------- Géométrie ---------- */
  const SPH = new THREE.SphereGeometry(1, 36, 24);
  function ellipsoid(mat, sx, sy, sz, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(SPH, mat);
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  // Profil de révolution : paires [y, rayon], lissées par spline.
  function latheY(pairs, mat, sx = 1, sz = 1, segs = 40) {
    const pts = pairs.slice().sort((a, b) => a[0] - b[0]).map(([y, r]) => new THREE.Vector2(r, y));
    const curve = new THREE.SplineCurve(pts);
    const out = curve.getPoints(48);
    out.unshift(new THREE.Vector2(0.0001, out[0].y));
    out.push(new THREE.Vector2(0.0001, out[out.length - 1].y));
    const g = new THREE.LatheGeometry(out, segs, Math.PI, Math.PI * 2);
    const m = new THREE.Mesh(g, mat);
    m.scale.set(sx, 1, sz); m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  // Membre : profil [t (0 = articulation, 1 = extrémité), rayon] le long de -Y.
  const limb = (len, prof, mat, rs = 1, sx = 1, sz = 1) => latheY(prof.map(([t, r]) => [-t * len, r * rs]), mat, sx, sz, 32);

  // Tête sculptée : sphère déformée (arcades, orbites, nez, pommettes, mâchoire, menton).
  function headGeometry(f) {
    const g = new THREE.SphereGeometry(1, 72, 54);
    const p = g.attributes.position, v = V();
    const C = (x, y, z) => V(x, y, z).normalize();
    const gs = (c, s) => Math.exp(-v.distanceToSquared(c) / (s * s));
    const eyeL = C(0.33, 0.13, 0.93), eyeR = C(-0.33, 0.13, 0.93);
    const browL = C(0.33, 0.29, 0.9), browR = C(-0.33, 0.29, 0.9);
    const chL = C(0.58, -0.06, 0.8), chR = C(-0.58, -0.06, 0.8);
    const chin = C(0, -0.74, 0.67), lips = C(0, -0.44, 0.9), philt = C(0, -0.3, 0.95);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      let r = 1;
      const front = Math.max(0, v.z);
      const nose = Math.exp(-(v.x * v.x) / 0.006) * Math.exp(-((v.y + 0.04) ** 2) / 0.022) * front ** 6;
      const bridge = Math.exp(-(v.x * v.x) / 0.01) * Math.exp(-((v.y - 0.12) ** 2) / 0.02) * front ** 6;
      r += (f ? 0.15 : 0.18) * nose + 0.05 * bridge;
      r -= 0.07 * (gs(eyeL, 0.16) + gs(eyeR, 0.16));
      r += (f ? 0.02 : 0.04) * (gs(browL, 0.17) + gs(browR, 0.17));
      r += 0.045 * (gs(chL, 0.24) + gs(chR, 0.24));
      r += (f ? 0.035 : 0.06) * gs(chin, 0.24) + 0.025 * gs(lips, 0.13) - 0.012 * gs(philt, 0.06);
      let sx = 1, sz = 1;
      if (v.y < 0.05) {
        const k = 0.05 - v.y;
        sx = 1 - (f ? 0.24 : 0.16) * k * k;
        if (v.z < 0.2) sz = 1 - 0.22 * k * (0.2 - v.z);
      }
      if (v.y > 0.3 && v.z < 0) sz *= 1 + 0.06 * (v.y - 0.3);
      p.setXYZ(i, v.x * r * sx * (f ? 0.08 : 0.082), v.y * r * (f ? 0.107 : 0.11), v.z * r * sz * 0.098);
    }
    g.computeVertexNormals();
    return g;
  }

  // Fusionne les pièces marquées en maillages « skinnés » (un par matière) qui se déforment avec le squelette.
  function skinBody(b) {
    const bones = [];
    b.root.traverse((o) => { if (o.isBone) bones.push(o); });
    const idx = new Map(bones.map((bn, i) => [bn, i]));
    b.root.position.set(0, 0, 0); b.root.rotation.set(0, 0, 0);
    b.root.updateMatrixWorld(true);
    const parts = [];
    b.root.traverse((o) => { if (o.isMesh && o.userData.sk) parts.push(o); });
    const byMat = new Map();
    for (const mesh of parts) {
      const bone = mesh.parent, spec = mesh.userData.sk;
      mesh.updateMatrix();
      const g = mesh.geometry.index ? mesh.geometry.clone() : mesh.geometry.clone();
      g.deleteAttribute('uv');
      const pos = g.attributes.position, n = pos.count;
      let ymax = -Infinity, ymin = Infinity;
      for (let i = 0; i < n; i++) { const y = pos.getY(i); if (y > ymax) ymax = y; if (y < ymin) ymin = y; }
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      const up = spec.up ? b[spec.up] : null, dn = spec.down ? b[spec.down] : null;
      const bu = spec.bu || 0.22, bd = spec.bd || 0.22;
      for (let i = 0; i < n; i++) {
        const t = (ymax - pos.getY(i)) / (ymax - ymin || 1);
        const wu = up && t < bu ? 0.5 * (1 - t / bu) : 0;
        const wd = dn && t > 1 - bd ? 0.5 * (t - (1 - bd)) / bd : 0;
        si[i * 4] = idx.get(bone); sw[i * 4] = 1 - wu - wd;
        si[i * 4 + 1] = up ? idx.get(up) : 0; sw[i * 4 + 1] = wu;
        si[i * 4 + 2] = dn ? idx.get(dn) : 0; sw[i * 4 + 2] = wd;
      }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      if (spec.sculpt) {
        g.applyMatrix4(mesh.matrix);
        const p2 = g.attributes.position;
        for (let i = 0; i < p2.count; i++) {
          const x = p2.getX(i), y = p2.getY(i), z = p2.getZ(i);
          const d = spec.sculpt(x, y, z);
          if (d) p2.setXYZ(i, x + d[0], y + d[1], z + d[2]);
        }
        g.computeVertexNormals();
        g.applyMatrix4(bone.matrixWorld);
      } else g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(bone.matrixWorld, mesh.matrix));
      bone.remove(mesh);
      if (!byMat.has(mesh.material)) byMat.set(mesh.material, []);
      byMat.get(mesh.material).push(g);
    }
    const skeleton = new THREE.Skeleton(bones);
    const out = [];
    for (const [mat, geos] of byMat) {
      const geo = mergeGeos(geos);
      const sm = new THREE.SkinnedMesh(geo, mat);
      sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false;
      sm.bind(skeleton, new THREE.Matrix4());
      out.push(sm);
    }
    return out;
  }
  function mergeGeos(geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4);
    const I = new Uint32Array(ni);
    let ov = 0, oi = 0;
    for (const g of geos) {
      const c = g.attributes.position.count;
      P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3);
      SI.set(g.attributes.skinIndex.array, ov * 4); SW.set(g.attributes.skinWeight.array, ov * 4);
      if (g.index) { const a = g.index.array; for (let k = 0; k < a.length; k++) I[oi + k] = a[k] + ov; oi += a.length; }
      else { for (let k = 0; k < c; k++) I[oi + k] = ov + k; oi += c; }
      ov += c;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    geo.setIndex(new THREE.BufferAttribute(I, 1));
    return geo;
  }

  /* ---------- Avatar ---------- */
  const SYM = ['cl', 'cp', 'sh', 'tw', 'el', 'sup', 'wr', 'hip', 'kn', 'an'];
  const NEUTRAL = {
    rp: 0, rr: 0, ry: 0, sp: 0, spS: 0, spT: 0, nk: 0, nkS: 0, nkT: 0,
    cl: 0, cp: 0, sh: [0, 7, 0], tw: 0, el: 10, sup: 0, wr: 0,
    hip: [0, 3, 4], kn: 2, an: 0, jy: 0,
  };

  function buildAvatar(cfg) {
    const f = cfg.sex === 'f';
    const S = f ? 1 : 1.065;
    // Dimensions imposées par un modèle externe (en mètres), sinon proportions intégrées.
    const Dm = cfg.dims || null;
    const tk = Dm ? Dm.tk : 1;
    const hairC = new THREE.Color(cfg.hair);
    const M = {
      skin: skinMat(cfg.skin),
      top: fabricMat(cfg.top),
      bottom: fabricMat(cfg.bottom, 0.7),
      shoe: fabricMat(cfg.shoe || '#f1f0ec', 0.65),
      sole: std('#e6e3dc', 0.85),
      hair: new THREE.MeshPhysicalMaterial({ color: hairC, roughness: 0.48, sheen: 1, sheenRoughness: 0.35, sheenColor: hairC.clone().lerp(new THREE.Color(0xffffff), 0.3) }),
      eyeW: std('#f2efe9', 0.3),
      iris: new THREE.MeshPhysicalMaterial({ color: cfg.eyes || '#3a2618', roughness: 0.15, clearcoat: 1 }),
      lip: skinMat(new THREE.Color(cfg.skin).lerp(new THREE.Color(f ? '#b4505a' : '#9a5a52'), f ? 0.38 : 0.22)),
      sock: fabricMat('#f4f3ef'),
    };
    const b = {}, markers = {};
    const grp = (parent, x, y, z) => { const o = new THREE.Bone(); o.position.set(x * S, y * S, z * S); parent.add(o); return o; };
    const add = (parent, mesh) => { mesh.position.multiplyScalar(S); mesh.scale.multiplyScalar(S); parent.add(mesh); return mesh; };
    const mark = (name, parent, x, y, z, r) => { const o = new THREE.Object3D(); o.position.set(x * S, y * S, z * S); o.userData.r = r * S; parent.add(o); markers[name] = o; };

    // sk(mesh, haut, bas) : la pièce sera fusionnée dans un corps continu, avec un fondu de poids vers l'os du haut et du bas.
    const sk = (mesh, up, down, bu, bd, sculpt) => { mesh.userData.sk = { up, down, bu, bd, sculpt }; return mesh; };
    const bump = (x, y, z, cx, cy, cz, sg, a) => { const d2 = ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) / (sg * sg); return a * Math.exp(-d2); };
    b.root = new THREE.Bone();
    b.spine = grp(b.root, 0, 0.09 * tk, 0);
    b.chest = grp(b.spine, 0, 0.15 * tk, 0);
    b.neck = grp(b.chest, 0, 0.225 * tk, 0);
    b.head = grp(b.neck, 0, 0.072 * tk, 0);

    // Tronc
    sk(add(b.root, latheY([[-0.135, 0.03], [-0.12, 0.1], [-0.085, 0.152], [-0.02, f ? 0.168 : 0.158], [0.04, f ? 0.155 : 0.15], [0.1, f ? 0.128 : 0.138], [0.14, f ? 0.118 : 0.134]], M.bottom, 1, 0.72)), 'spine', null, 0.3, 0, (x, y, z) => {
      if (z > -0.01) return null;
      const a = f ? 0.05 : 0.032;
      const k = bump(x, y, z, 0.06 * S, -0.055 * S, -0.1 * S, 0.075 * S, a * S) + bump(x, y, z, -0.06 * S, -0.055 * S, -0.1 * S, 0.075 * S, a * S);
      return [0, -k * 0.25, -k];
    });
    sk(add(b.spine, latheY(f
      ? [[-0.06, 0.12], [0, 0.116], [0.06, 0.112], [0.12, 0.118], [0.17, 0.126]]
      : [[-0.06, 0.135], [0, 0.134], [0.06, 0.133], [0.12, 0.14], [0.17, 0.148]], f ? M.skin : M.top, 1, 0.72)), 'chest', 'root', 0.3, 0.3);
    sk(add(b.chest, latheY(f
      ? [[-0.06, 0.122], [0, 0.128], [0.07, 0.138], [0.14, 0.145], [0.19, 0.138], [0.228, 0.1], [0.255, 0.062], [0.27, 0.03]]
      : [[-0.06, 0.142], [0, 0.152], [0.07, 0.166], [0.14, 0.178], [0.19, 0.172], [0.228, 0.122], [0.255, 0.075], [0.27, 0.035]], M.top, 1, f ? 0.64 : 0.62)), null, 'spine', 0, 0.25, (x, y, z) => {
      if (z < 0) return null;
      const k = f
        ? bump(x, y, z, 0.055 * S, 0.095 * S, 0.1 * S, 0.05 * S, 0.042 * S) + bump(x, y, z, -0.055 * S, 0.095 * S, 0.1 * S, 0.05 * S, 0.042 * S)
        : bump(x, y, z, 0.065 * S, 0.13 * S, 0.11 * S, 0.07 * S, 0.018 * S) + bump(x, y, z, -0.065 * S, 0.13 * S, 0.11 * S, 0.07 * S, 0.018 * S);
      return [0, -k * 0.2, k];
    });
    if (!f) add(b.chest, ellipsoid(M.top, 0.1, 0.035, 0.06, 0, 0.215, -0.02)); // trapèzes
    // Cou et tête
    sk(add(b.neck, latheY([[-0.06, f ? 0.07 : 0.085], [0.0, f ? 0.055 : 0.067], [0.05, f ? 0.05 : 0.062], [0.1, f ? 0.048 : 0.058]], M.skin, 1, 0.92)), 'head', 'chest', 0.25, 0.35);
    const headMesh = new THREE.Mesh(headGeometry(f), M.skin);
    headMesh.position.set(0, 0.098, -0.004); headMesh.castShadow = true; add(b.head, headMesh);
    add(b.head, ellipsoid(M.skin, 0.011, 0.026, 0.017, 0.081, 0.092, -0.008));
    add(b.head, ellipsoid(M.skin, 0.011, 0.026, 0.017, -0.081, 0.092, -0.008));
    const lidG = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42);
    for (const x of [0.03, -0.03]) {
      add(b.head, ellipsoid(M.eyeW, 0.0124, 0.0118, 0.0118, x, 0.108, 0.0765));
      add(b.head, ellipsoid(M.iris, 0.0068, 0.0068, 0.0028, x, 0.108, 0.0876));
      const lid = new THREE.Mesh(lidG, M.skin); lid.scale.set(0.0124, 0.0124, 0.0124); lid.position.set(x, 0.109, 0.0772); lid.rotation.x = 0.55; add(b.head, lid);
      const brow = add(b.head, ellipsoid(M.hair, 0.0165, f ? 0.0026 : 0.0036, 0.006, x * 1.08, 0.127, 0.0905)); brow.rotation.z = x > 0 ? 0.05 : -0.05;
    }
    add(b.head, ellipsoid(M.lip, 0.0205, 0.0045, 0.0068, 0, 0.0585, 0.0915));
    add(b.head, ellipsoid(M.lip, 0.0185, f ? 0.0058 : 0.005, 0.0074, 0, 0.0505, 0.0895));
    // Cheveux : volume décalé vers l'arrière et le haut pour dégager le visage
    if (f) {
      add(b.head, ellipsoid(M.hair, 0.0855, 0.112, 0.103, 0, 0.121, -0.02));
      add(b.head, ellipsoid(M.hair, 0.07, 0.06, 0.06, 0, 0.165, -0.05));
    } else {
      add(b.head, ellipsoid(M.hair, 0.0855, 0.098, 0.1, 0, 0.128, -0.014));
    }

    // Membres
    const UA = Dm ? Dm.UA / S : (f ? 0.275 : 0.29), FA = Dm ? Dm.FA / S : (f ? 0.24 : 0.255), TH = Dm ? Dm.TH / S : 0.41, SH = Dm ? Dm.SH / S : 0.4;
    const SHX = Dm ? Dm.shX / S - 0.02 : (f ? 0.145 : 0.172), HIPX = Dm ? Dm.hipX / S : (f ? 0.088 : 0.092), HIPY = Dm ? Dm.hipY / S : -0.075;
    const ANK = Dm ? Dm.ankleH / S : 0.078, TOE = Dm ? Dm.toe / S : 0.16;
    for (const s of ['L', 'R']) {
      const m = s === 'L' ? 1 : -1;
      b['cl' + s] = grp(b.chest, 0.02 * m, 0.19 * tk, 0);
      b['sh' + s] = grp(b['cl' + s], SHX * m, 0, 0);
      b['sht' + s] = grp(b['sh' + s], 0, 0, 0);
      b['el' + s] = grp(b['sht' + s], 0, -UA, 0);
      b['wr' + s] = grp(b['el' + s], 0, -FA, 0);
      b['hip' + s] = grp(b.root, HIPX * m, HIPY, 0);
      b['hipt' + s] = grp(b['hip' + s], 0, 0, 0);
      b['kn' + s] = grp(b['hipt' + s], 0, -TH, 0);
      b['an' + s] = grp(b['kn' + s], 0, -SH, 0);

      // bras : épaule, biceps et avant-bras d'un seul tenant, mains avec doigts
      const ar = f ? 1.16 : 1.38;
      sk(add(b['sht' + s], limb(UA, [[-0.16, 0.012], [-0.11, 0.04], [-0.03, 0.053], [0.08, 0.05], [0.3, 0.045], [0.55, 0.041], [0.82, 0.034], [1, 0.031]], f ? M.skin : M.skin, ar, 1, 1.02)), 'cl' + s, 'el' + s, 0.3, 0.2);
      if (!f) sk(add(b['sht' + s], limb(UA * 0.45, [[-0.46, 0.012], [-0.36, 0.05], [-0.18, 0.07], [0.3, 0.072], [0.7, 0.069], [1, 0.067]], M.top)), 'cl' + s, null, 0.35, 0);
      sk(add(b['el' + s], limb(FA, [[-0.06, 0.03], [0.05, 0.034], [0.22, 0.037], [0.55, 0.03], [0.88, 0.022], [1, 0.021]], M.skin, f ? 1.12 : 1.3, 1.06, 0.92)), 'sht' + s, 'wr' + s, 0.22, 0.2);
      add(b['wr' + s], ellipsoid(M.skin, 0.017, 0.042, 0.036, 0, -0.045, 0.002));
      for (let k = 0; k < 4; k++) {
        const z = 0.024 - k * 0.016, L = [0.072, 0.08, 0.076, 0.062][k];
        const fg = add(b['wr' + s], limb(L, [[0, 0.0085], [0.5, 0.0078], [0.9, 0.0068], [1, 0.004]], M.skin));
        fg.position.set(-0.002 * m * S, -0.078 * S, z * S); fg.rotation.x = -0.05 * (k - 1.5); fg.rotation.z = 0.12 * m;
      }
      const th = add(b['wr' + s], limb(0.058, [[0, 0.011], [0.6, 0.009], [1, 0.005]], M.skin));
      th.position.set(-0.008 * m * S, -0.03 * S, 0.03 * S); th.rotation.x = 0.75; th.rotation.z = 0.25 * m;

      // jambes : hanche, genou et cheville fondus dans la peau
      sk(add(b['hipt' + s], limb(TH, [[-0.08, 0.06], [0, 0.088], [0.12, 0.091], [0.45, 0.078], [0.8, 0.056], [0.95, 0.05], [1.03, 0.047]], f ? M.bottom : M.skin, f ? 1.03 : 1.02)), 'root', 'kn' + s, 0.25, 0.18);
      if (!f) sk(add(b['hipt' + s], limb(TH * 0.52, [[-0.12, 0.07], [0, 0.096], [0.5, 0.09], [1, 0.08]], M.bottom, 1.03)), 'root', null, 0.3, 0);
      sk(add(b['kn' + s], limb(SH, [[-0.04, 0.047], [0.04, 0.05], [0.16, 0.052], [0.36, 0.05], [0.7, 0.036], [0.92, 0.03], [1.02, 0.03]], f ? M.bottom : M.skin)), 'hipt' + s, 'an' + s, 0.2, 0.15, (x, y, z) => {
        const k = z < 0 ? bump(x, y, z, 0, -0.13 * S, -0.05 * S, 0.075 * S, 0.02 * S) : bump(x, y, z, 0, 0.0, 0.05 * S, 0.035 * S, 0.008 * S);
        return z < 0 ? [0, 0, -k] : [0, 0, k];
      });
      if (!f) add(b['kn' + s], limb(0.07, [[0, 0.036], [1, 0.034]], M.sock)).position.y = -0.33 * S;
      add(b['an' + s], ellipsoid(M.shoe, 0.047, 0.044, 0.125, 0, -0.033, 0.046));
      add(b['an' + s], ellipsoid(M.sole, 0.051, 0.016, 0.132, 0, -0.064, 0.047));
      add(b['an' + s], ellipsoid(M.shoe, 0.04, 0.05, 0.05, 0, -0.01, -0.02));

      mark('heel' + s, b['an' + s], 0, -ANK, -0.055, 0);
      mark('toe' + s, b['an' + s], 0, -ANK, TOE, 0);
      mark('knee' + s, b['kn' + s], 0, 0, 0, 0.05);
      mark('hand' + s, b['wr' + s], 0, -0.07, 0, 0.022);
      mark('elbow' + s, b['el' + s], 0, 0, 0, 0.036);
      mark('shoulder' + s, b['sh' + s], 0, 0, 0, 0.055);
      mark('glutes' + s, b.root, 0.065 * m, -0.05, -0.05, 0.085);
      mark('seat' + s, b.root, 0.07 * m, -0.11, -0.01, 0.025);
      mark('upperBack' + s, b.chest, 0.06 * m, 0.13, -0.03, 0.075);
      mark('grip' + s, b['wr' + s], 0, -0.08, 0, 0);
    }
    mark('belly', b.spine, 0, 0.04, 0.02, 0.115);
    mark('pubis', b.root, 0, -0.07, 0.06, 0.06);
    mark('hipSideL', b.root, 0.15, -0.04, -0.01, 0.03);
    mark('hipSideR', b.root, -0.15, -0.04, -0.01, 0.03);
    mark('chestF', b.chest, 0, 0.1, 0.05, 0.088);
    mark('headM', b.head, 0, 0.095, 0, 0.105);

    b.root.traverse((o) => { if (o.isMesh) o.userData.body = true; });
    const skinned = skinBody(b);
    const rig = { b, markers, S, f, M, skinned, lens: { UA, FA, TH, SH } };
    // Queue de cheval (simulée)
    if (f) {
      const tail = new THREE.Group();
      const mesh = limb(0.22, [[0, 0.022], [0.15, 0.03], [0.6, 0.024], [1, 0.006]], M.hair);
      tail.add(mesh);
      add(tail, ellipsoid(M.hair, 0.024, 0.016, 0.024));
      rig.tail = { group: tail, anchor: V(0, 0.15 * S, -0.088 * S), len: 0.21, p: null, prev: null };
    }
    return rig;
  }

  /* ---------- Poses ---------- */
  function expand(P) {
    for (const k of SYM) {
      if (P[k + 'L'] === undefined) P[k + 'L'] = P[k];
      if (P[k + 'R'] === undefined) P[k + 'R'] = P[k];
    }
    return P;
  }
  function compile(ex) {
    if (ex._keys) return ex;
    ex._keys = ex.keys.map((k) => {
      const P = expand(Object.assign({}, NEUTRAL, ex.base || {}, k));
      return { t: k.t, P };
    }).sort((a, b) => a.t - b.t);
    return ex;
  }
  function lerpPose(a, b, u, out) {
    for (const k in a) {
      const va = a[k], vb = b[k] === undefined ? va : b[k];
      if (Array.isArray(va)) out[k] = va.map((x, i) => x + (vb[i] - x) * u);
      else if (typeof va === 'number') out[k] = va + (vb - va) * u;
    }
    return out;
  }
  function sample(ex, t) {
    const ks = ex._keys;
    t = ((t % 1) + 1) % 1;
    let i = ks.length - 1;
    for (let j = 0; j < ks.length; j++) if (ks[j].t > t) { i = j - 1; break; }
    if (i < 0) i = ks.length - 1;
    const a = ks[i], b = ks[(i + 1) % ks.length];
    const ta = a.t, tb = i + 1 < ks.length ? b.t : 1 + ks[0].t;
    let tt = t < ta ? t + 1 : t;
    const u = tb - ta < 1e-6 ? 0 : smooth(clamp((tt - ta) / (tb - ta), 0, 1));
    return lerpPose(a.P, b.P, u, {});
  }

  function applyPose(rig, P) {
    const b = rig.b;
    b.root.rotation.set(P.rp * D, P.ry * D, -P.rr * D, 'YXZ');
    b.spine.rotation.set(P.sp * 0.5 * D, P.spT * 0.5 * D, -P.spS * 0.5 * D);
    b.chest.rotation.set(P.sp * 0.5 * D, P.spT * 0.5 * D, -P.spS * 0.5 * D);
    b.neck.rotation.set(P.nk * 0.5 * D, P.nkT * 0.5 * D, -P.nkS * 0.5 * D);
    b.head.rotation.set(P.nk * 0.5 * D, P.nkT * 0.5 * D, -P.nkS * 0.5 * D);
    for (const s of ['L', 'R']) {
      const m = s === 'L' ? 1 : -1;
      b['cl' + s].rotation.set(0, -P['cp' + s] * D * m, P['cl' + s] * D * m);
      const sh = P['sh' + s];
      b['sh' + s].rotation.set(-sh[0] * D, -sh[2] * D * m, sh[1] * D * m, 'YZX');
      b['sht' + s].rotation.set(0, P['tw' + s] * D * m, 0);
      b['el' + s].rotation.set(-P['el' + s] * D, P['sup' + s] * D * m, 0);
      b['wr' + s].rotation.set(0, 0, P['wr' + s] * D * m);
      const h = P['hip' + s];
      b['hip' + s].rotation.set(-h[0] * D, h[2] * D * m, h[1] * D * m, 'YZX');
      b['hipt' + s].rotation.set(0, 0, 0);
      b['kn' + s].rotation.set(P['kn' + s] * D, 0, 0);
      b['an' + s].rotation.set(P['an' + s] * D, 0, 0);
    }
  }

  function setWorldBasis(obj, x, y, z) {
    _m.makeBasis(x, y, z);
    _q.setFromRotationMatrix(_m);
    obj.parent.getWorldQuaternion(_pq);
    obj.quaternion.copy(_pq.invert().multiply(_q));
    obj.updateMatrixWorld(true);
  }

  function footFlat(rig, s, an) {
    const ank = rig.b['an' + s];
    ank.getWorldQuaternion(_q);
    const zf = V(0, 0, 1).applyQuaternion(_q); zf.y = 0;
    if (zf.length() < 0.25) return;
    zf.normalize();
    const a = an * D;
    const z = zf.clone().multiplyScalar(Math.cos(a)).addScaledVector(UP, -Math.sin(a));
    const y = UP.clone().multiplyScalar(Math.cos(a)).addScaledVector(zf, Math.sin(a));
    const x = V().crossVectors(y, z).normalize();
    setWorldBasis(ank, x, y, z);
  }

  const LIMBS = {
    armL: ['shL', 'shtL', 'elL', 'wrL'], armR: ['shR', 'shtR', 'elR', 'wrR'],
    legL: ['hipL', 'hiptL', 'knL', 'anL'], legR: ['hipR', 'hiptR', 'knR', 'anR'],
  };
  function ik(rig, limbName, T, poleRoot) {
    const [a, at, bk, c] = LIMBS[limbName].map((n) => rig.b[n]);
    const isLeg = limbName.startsWith('leg');
    const side = limbName.endsWith('L') ? 1 : -1;
    at.quaternion.identity();
    rig.b.root.updateMatrixWorld(true);
    const A = a.getWorldPosition(V());
    const L1 = bk.position.length(), L2 = c.position.length();
    const d = V().subVectors(T, A);
    let dist = d.length();
    const dir = d.clone().normalize();
    dist = clamp(dist, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-4);
    const pr = poleRoot || (isLeg ? [0, 0, 1] : [0, -0.2, -1]);
    rig.b.root.getWorldQuaternion(_q);
    const pole = V(pr[0] * side, pr[1], pr[2]).applyQuaternion(_q);
    let p = pole.sub(dir.clone().multiplyScalar(pole.dot(dir)));
    if (p.lengthSq() < 1e-6) p = V(0, 0, 1).cross(dir);
    p.normalize();
    const ca = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, L1 * L1 - ca * ca));
    const E = A.clone().addScaledVector(dir, ca).addScaledVector(p, h);
    const Tend = A.clone().addScaledVector(dir, dist);
    const y1 = A.clone().sub(E).normalize();
    const z1 = (isLeg ? p.clone() : p.clone().negate());
    z1.sub(y1.clone().multiplyScalar(z1.dot(y1))).normalize();
    const x1 = V().crossVectors(y1, z1).normalize();
    setWorldBasis(a, x1, y1, z1);
    const y2 = E.clone().sub(Tend).normalize();
    const z2 = V().crossVectors(x1, y2).normalize();
    const x2 = V().crossVectors(y2, z2).normalize();
    setWorldBasis(bk, x2, y2, z2);
  }

  const DEFAULT_CONTACTS = ['heelL', 'heelR', 'toeL', 'toeR', 'kneeL', 'kneeR', 'handL', 'handR', 'elbowL', 'elbowR',
    'shoulderL', 'shoulderR', 'glutesL', 'glutesR', 'hipSideL', 'hipSideR', 'pubis', 'seatL', 'seatR', 'upperBackL', 'upperBackR', 'belly', 'chestF', 'headM'];

  function meanOf(rig, names, out) {
    out.set(0, 0, 0);
    for (const n of names) out.add(rig.markers[n].getWorldPosition(V()));
    return out.multiplyScalar(1 / names.length);
  }

  // Résout la posture complète à la phase t.
  function solve(rig, ex, t, plants) {
    const P = sample(ex, t);
    applyPose(rig, P);
    const r = rig.b.root;
    r.position.set(0, 0, 0);
    r.updateMatrixWorld(true);
    const flat = ex.flat !== false;
    const fl = flat && ex.flatL !== false, fr = flat && ex.flatR !== false;
    if (fl) footFlat(rig, 'L', P.anL);
    if (fr) footFlat(rig, 'R', P.anR);
    const an = ex.anchor;
    if (an && an.mode === 'xyz') {
      const m = meanOf(rig, an.m, V());
      const at = an.at || [0, 0, 0];
      r.position.set(at[0] - m.x, at[1] - m.y, at[2] - m.z);
    } else {
      let min = Infinity;
      for (const n of ex.contacts || DEFAULT_CONTACTS) {
        const mk = rig.markers[n];
        const y = mk.getWorldPosition(V()).y - mk.userData.r;
        if (y < min) min = y;
      }
      r.position.y = (ex.groundY || 0) - min;
      if (an && !an._skip) {
        const m = meanOf(rig, an.m, V());
        const at = an._at || an.at || [0, 0, 0];
        let x = at[0] - m.x, z = at[2] - m.z;
        if (an.m2 && an._at2) {
          const m2 = meanOf(rig, an.m2, V());
          const w = clamp(P.aw || 0, 0, 1);
          x += (an._at2[0] - m2.x - x) * w; z += (an._at2[2] - m2.z - z) * w;
        }
        r.position.x = x; r.position.z = z;
      }
    }
    r.updateMatrixWorld(true);
    if (plants && ex.plant) {
      for (const limbName in ex.plant) {
        const tg = plants[limbName];
        if (tg) ik(rig, limbName, tg, ex.poles && ex.poles[limbName.slice(0, 3)]);
      }
      if (fl) footFlat(rig, 'L', P.anL);
      if (fr) footFlat(rig, 'R', P.anR);
    }
    if (plants && ex.reach) {
      for (const limbName in ex.reach) {
        const sp = ex.reach[limbName];
        const tg = rig.markers[sp.m].getWorldPosition(V());
        if (sp.off) tg.add(V(sp.off[0], sp.off[1], sp.off[2]));
        ik(rig, limbName, tg, sp.pole);
      }
    }
    if (P.jy) { r.position.y += P.jy; r.updateMatrixWorld(true); }
    return P;
  }

  // Ancrages automatiques : position naturelle des repères à la phase de référence.
  function computeAnchors(rig, ex) {
    const an = ex.anchor;
    if (!an || an.mode === 'xyz' || !an.auto) return;
    an._at = null; an._at2 = null; an._skip = true;
    solve(rig, ex, an.t || 0, null);
    const m = meanOf(rig, an.m, V());
    an._at = [m.x, 0, m.z]; an._skip = false;
    if (an.m2) {
      solve(rig, ex, an.t2 || 0, null);
      const m2 = meanOf(rig, an.m2, V());
      an._at2 = [m2.x, 0, m2.z];
    }
  }

  function computePlants(rig, ex) {
    computeAnchors(rig, ex);
    if (!ex.plant) return null;
    solve(rig, ex, ex.plantAt || 0, null);
    const out = {};
    for (const limbName in ex.plant) {
      const spec = ex.plant[limbName] || {};
      const end = rig.b[LIMBS[limbName][3]].getWorldPosition(V());
      if (spec.y !== undefined) end.y = spec.y;
      if (spec.dz) end.z += spec.dz;
      if (spec.dx) end.x += spec.dx;
      out[limbName] = end;
    }
    return out;
  }

  /* ---------- Accessoires ---------- */
  const PM = {};
  function propMats() {
    if (PM.iron) return PM;
    PM.iron = std('#2a2d33', 0.42, 0.75);
    PM.chrome = std('#c9ccd1', 0.22, 1);
    PM.rubber = std('#1b1c1f', 0.85);
    PM.pad = new THREE.MeshPhysicalMaterial({ color: '#23262c', roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });
    PM.frame = std('#3b3f47', 0.35, 0.6);
    PM.wood = std('#b88a5a', 0.6);
    PM.mat = std('#4b6cdf', 0.92);
    PM.wall = std('#d9d6cf', 0.95);
    PM.kb = std('#26282c', 0.4, 0.55);
    PM.cable = std('#111214', 0.6, 0.3);
    return PM;
  }
  const box = (mat, w, h, d, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
  const cyl = (mat, r, h, x = 0, y = 0, z = 0, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
  function roundedSlab(mat, w, h, d) {
    const r = Math.min(0.03, h / 2, w / 2);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -d / 2); shape.lineTo(w / 2 - r, -d / 2); shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    shape.lineTo(w / 2, d / 2 - r); shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); shape.lineTo(-w / 2 + r, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); shape.lineTo(-w / 2, -d / 2 + r); shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: Math.min(0.012, h / 3), bevelSize: 0.01, bevelSegments: 3 });
    g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function dumbbell(scale = 1) {
    const P = propMats(), g = new THREE.Group();
    g.add(cyl(P.chrome, 0.014, 0.15));
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.048 * scale, 0.048 * scale, 0.055, 6), P.rubber);
      plate.position.y = s * 0.1; plate.castShadow = true; g.add(plate);
    }
    return g;
  }
  function kettlebell() {
    const P = propMats(), g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.095, 28, 20), P.kb); ball.position.y = -0.13; ball.scale.y = 0.92; ball.castShadow = true; g.add(ball);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.013, 12, 28, Math.PI * 1.25), P.kb);
    handle.rotation.z = -Math.PI * 0.125; handle.position.y = -0.035; handle.castShadow = true; g.add(handle);
    return g;
  }
  function barbell(len = 1.9, plates = true) {
    const P = propMats(), g = new THREE.Group();
    g.add(cyl(P.chrome, 0.0135, len));
    if (plates) for (const s of [-1, 1]) {
      g.add(cyl(P.rubber, 0.22, 0.05, 0, s * (len / 2 - 0.2), 0, 40));
      g.add(cyl(P.rubber, 0.17, 0.035, 0, s * (len / 2 - 0.25), 0, 40));
      g.add(cyl(P.chrome, 0.026, 0.3, 0, s * (len / 2 - 0.15)));
    }
    return g;
  }
  function chair() {
    const P = propMats(), g = new THREE.Group();
    g.add(box(P.wood, 0.44, 0.035, 0.42, 0, 0.445, 0));
    for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) g.add(box(P.frame, 0.03, 0.43, 0.03, x, 0.215, z));
    g.add(box(P.wood, 0.44, 0.3, 0.025, 0, 0.73, -0.2));
    for (const x of [-0.19, 0.19]) g.add(box(P.frame, 0.03, 0.32, 0.03, x, 0.6, -0.2));
    return g; // assise face +Z, dossier à -Z
  }
  function bench(h = 0.44, len = 1.2, rack = false) {
    const P = propMats(), g = new THREE.Group();
    const pad = roundedSlab(P.pad, 0.3, 0.07, len); pad.position.y = h - 0.035; g.add(pad);
    g.add(box(P.frame, 0.06, 0.05, len - 0.1, 0, h - 0.1, 0));
    for (const z of [-len / 2 + 0.12, len / 2 - 0.12]) {
      g.add(box(P.frame, 0.06, h - 0.1, 0.06, 0, (h - 0.1) / 2, z));
      g.add(box(P.frame, 0.42, 0.04, 0.07, 0, 0.02, z));
    }
    if (rack) for (const x of [-0.55, 0.55]) {
      g.add(box(P.frame, 0.06, 1.15, 0.06, x, 0.575, len / 2 - 0.12));
      g.add(box(P.frame, 0.06, 0.06, 0.14, x, 1.0, len / 2 - 0.08));
    }
    return g; // le long de Z
  }
  function mat() {
    const P = propMats();
    const m = roundedSlab(P.mat, 0.64, 0.012, 1.85); m.position.y = 0.006; m.castShadow = false; return m; // le long de Z
  }
  function cableTo(group, from) {
    const P = propMats();
    const c = cyl(P.cable, 0.0045, 1, 0, 0, 0, 8);
    group.add(c);
    return (to) => {
      const d = V().subVectors(to, from);
      const L = d.length();
      c.scale.set(1, L, 1);
      c.position.copy(from).addScaledVector(d, 0.5);
      c.quaternion.setFromUnitVectors(UP, d.normalize());
    };
  }

  function axisFrom(a, b) { const d = V().subVectors(b, a); d.y = 0; return d.lengthSq() < 1e-6 ? V(0, 0, 1) : d.normalize(); }
  function placeAlong(obj, center, axis) { obj.position.set(center.x, 0, center.z); obj.rotation.y = Math.atan2(axis.x, axis.z); }

  // Construit les accessoires d'un exercice à partir de la pose de référence.
  function buildProps(rig, ex, group) {
    const P = propMats();
    const dyn = [];
    if (!ex.props) return dyn;
    solve(rig, ex, ex.propAt || 0, ex._plants);
    const mk = (n) => rig.markers[n].getWorldPosition(V());
    const mid = (a, b) => mk(a).add(mk(b)).multiplyScalar(0.5);
    const root = rig.b.root.getWorldPosition(V());
    const fwd = V(0, 0, 1).applyQuaternion(rig.b.root.getWorldQuaternion(new THREE.Quaternion())); fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, 1); fwd.normalize();
    for (const raw of ex.props) {
      const p = typeof raw === 'string' ? { type: raw } : raw;
      switch (p.type) {
        case 'mat': {
          const head = mk('headM'), feet = mid('heelL', 'heelR');
          let axis = axisFrom(feet, head);
          const flat = V().subVectors(head, feet); flat.y = 0;
          const c = flat.length() > 0.6 ? head.clone().add(feet).multiplyScalar(0.5) : feet.clone();
          if (flat.length() <= 0.6) axis = V(0, 0, 1);
          const m = mat(); placeAlong(m, c, axis); group.add(m); break;
        }
        case 'dumbbells': {
          for (const s of ['L', 'R']) {
            const d = dumbbell(p.scale || 1);
            d.rotation.x = Math.PI / 2; d.position.set(0, -0.08 * rig.S, 0);
            rig.b['wr' + s].add(d); dyn.push({ dispose: () => rig.b['wr' + s].remove(d) });
          }
          break;
        }
        case 'dumbbell2h': {
          const d = dumbbell(1.3); group.add(d);
          dyn.push({ update: () => { const m = mid('gripL', 'gripR'); const sh = mid('shoulderL', 'shoulderR'); const dirv = V().subVectors(m, sh).normalize(); d.position.copy(m).addScaledVector(dirv, 0.05); d.quaternion.setFromUnitVectors(UP, dirv); } });
          break;
        }
        case 'barbell': case 'shortbar': {
          const bar = p.type === 'barbell' ? barbell(p.len || 1.9, true) : barbell(p.len || 1.15, false);
          group.add(bar);
          let cable = null;
          if (p.cable) cable = cableTo(group, V(...p.cable));
          dyn.push({ update: () => { const a = mk('gripR'), b2 = mk('gripL'); const m = a.clone().add(b2).multiplyScalar(0.5); bar.position.copy(m); bar.quaternion.setFromUnitVectors(UP, V().subVectors(b2, a).normalize()); if (cable) cable(m); } });
          break;
        }
        case 'kettlebell': {
          const k = kettlebell(); group.add(k);
          dyn.push({ update: () => { const m = mid('gripL', 'gripR'); const sh = mid('shoulderL', 'shoulderR'); const dirv = V().subVectors(m, sh).normalize(); k.position.copy(m); k.quaternion.setFromUnitVectors(V(0, -1, 0), dirv); } });
          break;
        }
        case 'handle': {
          const hd = cyl(P.chrome, 0.016, 0.2); group.add(hd);
          const cable = cableTo(group, V(...p.cable));
          dyn.push({ update: () => { const m = mid('gripL', 'gripR'); hd.position.copy(m); hd.quaternion.setFromUnitVectors(UP, V().subVectors(mk('gripL'), mk('gripR')).normalize()); cable(m); } });
          group.add(box(P.frame, 0.12, 1.6, 0.12, p.cable[0], 0.8, p.cable[2] + 0.08));
          group.add(cyl(P.iron, 0.05, 0.03, p.cable[0], p.cable[1], p.cable[2]));
          break;
        }
        case 'bench': {
          const h = p.h || ex.groundY || 0.44;
          const bn = bench(h, p.len || 1.2, p.rack);
          if (p.cross) { const c = mid(...(p.atm || ['seatL', 'seatR'])).addScaledVector(fwd, p.shift || 0); placeAlong(bn, c, V(1, 0, 0)); }
          else {
            const a = p.from ? mid(...p.from) : mid('glutesL', 'glutesR');
            const b2 = p.to ? mid(...p.to) : mid('upperBackL', 'upperBackR');
            const axis = axisFrom(a, b2);
            const c = a.clone().add(b2).multiplyScalar(0.5).addScaledVector(axis, p.shift || 0);
            placeAlong(bn, c, axis);
          }
          group.add(bn); break;
        }
        case 'chair': {
          const ch = chair();
          if (p.at === 'grips') {
            const g = mid('gripL', 'gripR');
            const c = g.clone().addScaledVector(fwd, p.off !== undefined ? p.off : -0.2);
            placeAlong(ch, c, p.flip ? fwd.clone().negate() : fwd);
          } else if (p.at === 'toeR') {
            const t = mk('toeR'); const c = t.clone().addScaledVector(fwd, -0.08);
            placeAlong(ch, c, fwd);
          } else {
            const s = mid('seatL', 'seatR'); const c = s.clone().addScaledVector(fwd, -0.02);
            placeAlong(ch, c, fwd);
          }
          group.add(ch); break;
        }
        case 'wall': {
          const w = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), P.wall); w.receiveShadow = true;
          if (p.at === 'hands') {
            const g = mid('handL', 'handR'); w.position.set(0, 1.5, g.z + 0.035); w.rotation.y = Math.PI;
          } else {
            const z = Math.min(mk('upperBackL').z, mk('glutesL').z) - 0.08; w.position.set(0, 1.5, z);
          }
          group.add(w); break;
        }
        case 'pullbar': {
          const at = V(...(ex.anchor.at)); const y = at.y + 0.0;
          const bar = cyl(P.chrome, 0.016, 1.4); bar.rotation.z = Math.PI / 2; bar.position.set(at.x, y, at.z); group.add(bar);
          for (const x of [-0.7, 0.7]) group.add(box(P.frame, 0.07, y + 0.15, 0.07, at.x + x, (y + 0.15) / 2, at.z));
          break;
        }
        case 'pulldown': {
          const s = mid('seatL', 'seatR');
          const seat = roundedSlab(P.pad, 0.42, 0.07, 0.4); seat.position.set(s.x, (ex.groundY || 0.5) - 0.035, s.z); group.add(seat);
          group.add(box(P.frame, 0.08, (ex.groundY || 0.5) - 0.07, 0.08, s.x, ((ex.groundY || 0.5) - 0.07) / 2, s.z));
          const kp = roundedSlab(P.pad, 0.42, 0.08, 0.12); kp.position.set(s.x, (ex.groundY || 0.5) + 0.2, s.z + 0.36); group.add(kp);
          group.add(box(P.frame, 0.12, 2.5, 0.12, s.x, 1.25, s.z + 0.62));
          group.add(box(P.frame, 0.12, 0.08, 0.7, s.x, 2.46, s.z + 0.3));
          group.add(cyl(P.iron, 0.05, 0.04, s.x, 2.4, s.z + 0.02));
          break;
        }
        case 'rowseat': {
          const s = mid('seatL', 'seatR');
          const seat = roundedSlab(P.pad, 0.36, 0.07, 1.1); seat.position.set(s.x, (ex.groundY || 0.4) - 0.035, s.z + 0.15); group.add(seat);
          group.add(box(P.frame, 0.08, (ex.groundY || 0.4) - 0.07, 0.9, s.x, ((ex.groundY || 0.4) - 0.07) / 2, s.z + 0.15));
          const ft = mid('heelL', 'heelR');
          const plate = box(P.frame, 0.5, 0.32, 0.04, ft.x, 0.2, ft.z + 0.2); plate.rotation.x = -0.35; group.add(plate);
          break;
        }
        case 'legext': {
          const s = mid('seatL', 'seatR');
          const seat = roundedSlab(P.pad, 0.42, 0.08, 0.45); seat.position.set(s.x, (ex.groundY || 0.55) - 0.04, s.z + 0.08); group.add(seat);
          const back = roundedSlab(P.pad, 0.42, 0.08, 0.6); back.rotation.x = Math.PI / 2 - 0.2; back.position.set(s.x, (ex.groundY || 0.55) + 0.3, s.z - 0.2); group.add(back);
          group.add(box(P.frame, 0.08, (ex.groundY || 0.55) - 0.08, 0.08, s.x, ((ex.groundY || 0.55) - 0.08) / 2, s.z));
          const pad = cyl(P.pad, 0.045, 0.34); pad.rotation.z = Math.PI / 2; pad.position.set(-rig.b.hipL.position.x, -0.36 * rig.S, p.behind ? -0.07 : 0.07);
          rig.b.knL.add(pad); dyn.push({ dispose: () => rig.b.knL.remove(pad) });
          const arm = box(P.frame, 0.04, 0.42, 0.04, -rig.b.hipL.position.x - 0.2, -0.2 * rig.S, 0);
          rig.b.knL.add(arm); dyn.push({ dispose: () => rig.b.knL.remove(arm) });
          break;
        }
      }
    }
    return dyn;
  }

  /* ---------- Scène ---------- */
  const E = {
    ex: null, rig: null, plants: null, phase: 0, speed: 1, mode: 'loop', onCount: null,
    blend: 1, snap: null, view: 'auto', userOrbit: false,
  };
  let renderer, scene, camera, controls, propGroup, avatarHolder, floorMat, hemi, clock;
  let camOffset = V(0, 0.2, 4), camOffsetGoal = null;

  function cssVar(n, fb) { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || fb; }

  E.init = function (container) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
    camera.position.set(1.8, 1.3, 3.8);

    if (THREE.RoomEnvironment) {
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    }
    hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.6); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff4e8, 2.4);
    key.position.set(2.2, 4.2, 2.8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 3, bottom: -2.2, near: 0.5, far: 12 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 1.3); rim.position.set(-3, 2.5, -3); scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(-2, 1.2, 3); scene.add(fill);

    floorMat = new THREE.MeshStandardMaterial({ color: 0xdedfe2, roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    propGroup = new THREE.Group(); scene.add(propGroup);
    avatarHolder = new THREE.Group(); scene.add(avatarHolder);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 1.4; controls.maxDistance = 9; controls.maxPolarAngle = Math.PI * 0.54;
    controls.enablePan = false; controls.target.set(0, 0.9, 0);
    controls.addEventListener('start', () => { E.userOrbit = true; camOffsetGoal = null; });

    E.applyTheme();
    const ro = new ResizeObserver(() => resize(container)); ro.observe(container); resize(container);
    clock = new THREE.Clock();
    renderer.setAnimationLoop(tick);
  };

  E.applyTheme = function () {
    if (!scene) return;
    const bg = new THREE.Color(cssVar('--stage', '#dfe1e4'));
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 7, 16);
    floorMat.color.copy(bg).offsetHSL(0, 0, -0.02);
    const dark = bg.getHSL({}).l < 0.3;
    hemi.intensity = dark ? 0.45 : 0.6;
    renderer.toneMappingExposure = dark ? 0.95 : 1.0;
  };

  function resize(container) {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  E.setAvatar = function (cfg) {
    if (E.rig) {
      avatarHolder.remove(E.rig.b.root);
      for (const sm of E.rig.skinned) avatarHolder.remove(sm);
      if (E.rig.tail) scene.remove(E.rig.tail.group);
    }
    if (E.custom && !cfg.dims) cfg = Object.assign({}, cfg, { dims: E.custom.dims });
    E.lastCfg = Object.assign({}, cfg, { dims: null });
    E.rig = buildAvatar(cfg);
    avatarHolder.add(E.rig.b.root);
    for (const sm of E.rig.skinned) avatarHolder.add(sm);
    if (E.rig.tail) scene.add(E.rig.tail.group);
    if (E.custom) hideRig(true);
    if (E.ex) E.setExercise(E.ex, { keepPhase: true, noBlend: true });
  };

  function snapshot() {
    if (!E.rig) return null;
    const s = { pos: E.rig.b.root.position.clone(), q: {} };
    for (const k in E.rig.b) s.q[k] = E.rig.b[k].quaternion.clone();
    return s;
  }

  let dynProps = [];
  E.setExercise = function (ex, opt = {}) {
    compile(ex);
    if (!opt.noBlend && E.rig && E.ex) { E.snap = snapshot(); E.blend = 0; }
    for (const d of dynProps) d.dispose && d.dispose();
    dynProps = [];
    while (propGroup.children.length) propGroup.remove(propGroup.children[0]);
    E.ex = ex;
    if (!opt.keepPhase) E.phase = 0;
    if (!E.rig) return;
    E.plants = computePlants(E.rig, ex);
    ex._plants = E.plants;
    dynProps = buildProps(E.rig, ex, propGroup);
    if (!opt.keepView) { E.userOrbit = false; E.setView(E.view); }
  };

  const VIEWS = { face: 0, tq: 32, side: 90, back: 180 };
  E.setView = function (name) {
    E.view = name || 'auto';
    const ex = E.ex;
    const c = (ex && ex.cam) || {};
    let az = name && name !== 'auto' ? VIEWS[name] : (c.az !== undefined ? c.az : 32);
    const el = (c.el !== undefined ? c.el : 9) * D;
    const k0 = ex ? ex._keys[0].P : {};
    const horizontal = Math.abs(k0.rp || 0) > 45 || Math.abs(k0.rr || 0) > 45;
    const narrow = Math.max(1, (horizontal ? 1.35 : 0.75) / (camera.aspect || 1));
    const dist = (c.d || 4.3) * Math.pow(narrow, 0.75);
    az *= D;
    camOffsetGoal = V(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    E.userOrbit = false;
  };

  function bodyCenter() {
    const mk = (n) => E.rig.markers[n].getWorldPosition(V());
    const c = mk('headM').add(mk('heelL')).add(mk('heelR')).add(E.rig.b.root.getWorldPosition(V()).multiplyScalar(2)).multiplyScalar(1 / 5);
    const ex = E.ex;
    if (ex && ex.cam && ex.cam.ty !== undefined) c.y = ex.cam.ty;
    else c.y = clamp(c.y + 0.05, 0.25, 1.05);
    if (camera.aspect < 1) c.y += 0.22 * (1 - camera.aspect) + 0.12;
    return c;
  }

  function updateTail(dt) {
    const t = E.rig.tail; if (!t) return;
    const head = E.rig.b.head;
    const A = head.localToWorld(t.anchor.clone());
    const restDir = V(0, -0.55, -0.83).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion())).normalize();
    if (!t.p) { t.p = A.clone().addScaledVector(restDir, t.len); t.prev = t.p.clone(); }
    const h = Math.min(dt, 1 / 30);
    const vel = V().subVectors(t.p, t.prev).multiplyScalar(0.9);
    t.prev.copy(t.p);
    t.p.add(vel).add(V(0, -9.8 * h * h * 0.6, 0));
    const want = A.clone().addScaledVector(restDir, t.len);
    t.p.lerp(want, 0.08);
    const d = V().subVectors(t.p, A); const L = d.length() || 1; t.p.copy(A).addScaledVector(d, t.len / L);
    if (t.p.y < 0.01) t.p.y = 0.01;
    t.group.position.copy(A);
    t.group.quaternion.setFromUnitVectors(V(0, -1, 0), V().subVectors(t.p, A).normalize());
  }

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (E.rig && E.ex) {
      const ex = E.ex;
      const cycle = (ex.cycle || 3) / E.speed;
      const prev = E.phase;
      if (E.mode === 'loop' || E.mode === 'work') E.phase += dt / cycle;
      else if (E.mode === 'settle') {
        const target = Math.ceil(E.phase - 1e-6);
        E.phase = Math.min(target, E.phase + dt / cycle);
      }
      if (E.mode === 'work' && E.onCount) {
        const pts = ex.count || [0.92];
        for (const cp of pts) {
          const a = Math.floor(prev - cp), b = Math.floor(E.phase - cp);
          if (b > a) E.onCount(cp);
        }
      }
      solve(E.rig, ex, E.phase, E.plants);
      // respiration
      const br = Math.sin(performance.now() / 1000 * 1.6) * 0.012;
      E.rig.b.chest.rotation.x += br * 0.5;
      E.rig.b.chest.updateMatrixWorld(true);
      if (E.blend < 1 && E.snap) {
        E.blend = Math.min(1, E.blend + dt / 0.7);
        const w = smooth(E.blend);
        for (const k in E.rig.b) if (E.snap.q[k]) { const cur = E.rig.b[k].quaternion.clone(); E.rig.b[k].quaternion.copy(E.snap.q[k]).slerp(cur, w); }
        const curP = E.rig.b.root.position.clone();
        E.rig.b.root.position.lerpVectors(E.snap.pos, curP, w);
        E.rig.b.root.updateMatrixWorld(true);
      }
      for (const d of dynProps) d.update && d.update();
      updateTail(dt);
      if (E.custom) retarget();
      // caméra qui suit le corps
      const c = bodyCenter();
      const delta = V().subVectors(c, controls.target).multiplyScalar(1 - Math.exp(-dt * 3));
      controls.target.add(delta);
      if (camOffsetGoal) {
        const cur = V().subVectors(camera.position, controls.target);
        cur.lerp(camOffsetGoal, 1 - Math.exp(-dt * 3.2));
        camera.position.copy(controls.target).add(cur);
        if (cur.distanceTo(camOffsetGoal) < 0.01) camOffsetGoal = null;
      } else camera.position.add(delta);
    }
    controls.update();
    renderer.render(scene, camera);
  }

  E.setMode = (m) => { E.mode = m; };
  E.setSpeed = (s) => { E.speed = s; };
  E.debugSolve = (ex, t) => { compile(ex); E.setExercise(ex, { noBlend: true }); E.phase = t; E.mode = 'still'; };
  E.renderNow = () => renderer.render(scene, camera);
  E._dbg = () => ({ cam: camera.position.toArray().map(v=>+v.toFixed(2)), tgt: controls.target.toArray().map(v=>+v.toFixed(2)), goal: camOffsetGoal && camOffsetGoal.toArray().map(v=>+v.toFixed(2)), user: E.userOrbit, view: E.view, aspect: camera.aspect });
  /* ---------- Avatar externe (modèle humain réaliste .glb) ---------- */
  // Les os du modèle sont reconnus par leur nom (Mixamo, Unity/VRM, Unreal/MakeHuman, Character Creator),
  // alignés sur la pose de repos du coach, puis pilotés à chaque image par le squelette procédural.
  const norm = (n) => n.toLowerCase().replace(/^mixamorig\d*[:_]?/, '').replace(/^cc_base_/, '').replace(/^(armature|rig|bip0?1|def)[_ .:-]/, '').replace(/[\s_.:\-]/g, '');
  function sideNames(base, alts) {
    const out = { L: [], R: [] };
    for (const a of [base].concat(alts)) {
      out.L.push('left' + a, a + 'l', 'l' + a); out.R.push('right' + a, a + 'r', 'r' + a);
    }
    return out;
  }
  const BONE_NAMES = {
    hips: ['hips', 'hip', 'pelvis'],
    spine: ['spine', 'spine01', 'spine0', 'waist'],
    spine1: ['spine1', 'spine02', 'chest', 'spine01x'],
    spine2: ['spine2', 'spine03', 'upperchest', 'chest1'],
    neck: ['neck', 'neck01', 'necktwist01'],
    head: ['head'],
  };
  const SIDE_BONES = {
    shoulder: sideNames('shoulder', ['clavicle']), arm: sideNames('arm', ['upperarm']), forearm: sideNames('forearm', ['lowerarm']),
    hand: sideNames('hand', []), upleg: sideNames('upleg', ['thigh', 'upperleg']), leg: sideNames('leg', ['calf', 'lowerleg', 'shin']), foot: sideNames('foot', []),
    toe: sideNames('toebase', ['toe', 'toes', 'ball']),
  };
  function findBones(root) {
    const all = {};
    root.traverse((o) => { if (o.isBone || o.type === 'Bone' || /hips|pelvis|spine|arm|leg|thigh|calf|foot|hand|head|neck/i.test(o.name)) { const k = norm(o.name); if (!(k in all)) all[k] = o; } });
    const pick = (cands) => { for (const c of cands) if (all[c]) return all[c]; return null; };
    const B = {};
    for (const k in BONE_NAMES) B[k] = pick(BONE_NAMES[k]);
    for (const k in SIDE_BONES) { B[k + 'L'] = pick(SIDE_BONES[k].L); B[k + 'R'] = pick(SIDE_BONES[k].R); }
    if (!B.spine1 && B.spine2) { B.spine1 = B.spine2; B.spine2 = null; }
    return B;
  }
  const wpos = (o) => o.getWorldPosition(V());
  function setWorldQuat(o, q) {
    o.parent.getWorldQuaternion(_pq);
    o.quaternion.copy(_pq.invert().multiply(q));
    o.updateMatrixWorld(true);
  }
  function alignSeg(bone, child, dir) {
    if (!bone || !child) return;
    const d = wpos(child).sub(wpos(bone)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(d, dir);
    setWorldQuat(bone, q.multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
  }
  // Prépare un modèle : renvoie les dimensions mesurées et l'état d'alignement.
  E.prepareModel = function (scene) {
    const B = findBones(scene);
    const need = ['hips', 'spine', 'head', 'armL', 'armR', 'forearmL', 'forearmR', 'handL', 'handR', 'uplegL', 'uplegR', 'legL', 'legR', 'footL', 'footR'];
    const missing = need.filter((k) => !B[k]);
    if (missing.length) throw new Error('Squelette non reconnu (os manquants : ' + missing.join(', ') + ').');
    scene.updateMatrixWorld(true);
    // Pieds au sol
    const box = new THREE.Box3().setFromObject(scene);
    scene.position.y -= box.min.y; scene.updateMatrixWorld(true);
    // Orientation : le modèle doit regarder vers +Z (gauche du personnage vers +X)
    if (wpos(B.armL).x < wpos(B.armR).x) { scene.rotation.y += Math.PI; scene.updateMatrixWorld(true); }
    const DOWN = V(0, -1, 0), UPV = V(0, 1, 0);
    const chain = [[B.hips, B.spine], [B.spine, B.spine1 || B.neck], [B.spine1, B.spine2 || B.neck], [B.spine2, B.neck], [B.neck, B.head]];
    for (const [a, c] of chain) if (a && c) alignSeg(a, c, UPV);
    for (const s of ['L', 'R']) {
      alignSeg(B['arm' + s], B['forearm' + s], DOWN);
      alignSeg(B['forearm' + s], B['hand' + s], DOWN);
      const hc = B['hand' + s].children.find((c) => /middle|hand.*1|finger/i.test(c.name)) || B['hand' + s].children[0];
      if (hc) alignSeg(B['hand' + s], hc, DOWN);
      alignSeg(B['upleg' + s], B['leg' + s], DOWN);
      alignSeg(B['leg' + s], B['foot' + s], DOWN);
    }
    scene.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(scene);
    const hips = wpos(B.hips);
    const d = (a, b2) => wpos(a).distanceTo(wpos(b2));
    const footL = wpos(B.footL);
    const dims = {
      UA: d(B.armL, B.forearmL), FA: d(B.forearmL, B.handL), TH: d(B.uplegL, B.legL), SH: d(B.legL, B.footL),
      shX: Math.abs(wpos(B.armL).x - hips.x), hipX: Math.abs(wpos(B.uplegL).x - hips.x), hipY: wpos(B.uplegL).y - hips.y,
      ankleH: Math.max(0.03, footL.y - Math.min(0, box2.min.y)), toe: B.toeL ? Math.max(0.08, wpos(B.toeL).z - footL.z + 0.05) : 0.16,
      tk: Math.max(0.6, (wpos(B.armL).y - hips.y) / 0.43),
    };
    const rest = {};
    for (const k in B) if (B[k]) rest[k] = B[k].getWorldQuaternion(new THREE.Quaternion());
    return { scene, B, rest, dims, hipsRest: hips.clone() };
  };
  const MAP = [['hips', 'root'], ['spine', 'spine'], ['spine1', ['spine', 'chest']], ['spine2', 'chest'], ['neck', 'neck'], ['head', 'head'],
    ['shoulderL', 'clL'], ['armL', 'shtL'], ['forearmL', 'elL'], ['handL', 'wrL'], ['uplegL', 'hiptL'], ['legL', 'knL'], ['footL', 'anL'],
    ['shoulderR', 'clR'], ['armR', 'shtR'], ['forearmR', 'elR'], ['handR', 'wrR'], ['uplegR', 'hiptR'], ['legR', 'knR'], ['footR', 'anR']];
  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
  function retarget() {
    const C = E.custom, rig = E.rig;
    rig.b.root.updateMatrixWorld(true);
    // position du bassin
    const rp = rig.b.root.getWorldPosition(V());
    const rq = rig.b.root.getWorldQuaternion(new THREE.Quaternion());
    const off = V().subVectors(C.hipsRest, C.rigRootRest).applyQuaternion(rq);
    const hp = rp.add(off);
    const hips = C.B.hips;
    hips.parent.updateMatrixWorld(true);
    hips.position.copy(hips.parent.worldToLocal(hp));
    for (const [tk, src] of MAP) {
      const bone = C.B[tk]; if (!bone || !C.rest[tk]) continue;
      if (Array.isArray(src)) { rig.b[src[0]].getWorldQuaternion(_qa); rig.b[src[1]].getWorldQuaternion(_qb); _qa.slerp(_qb, 0.5); }
      else rig.b[src].getWorldQuaternion(_qa);
      setWorldQuat(bone, _qa.multiply(C.rest[tk]));
    }
  }
  E.useModel = function (prepared) {
    E.clearModel(true);
    E.custom = prepared;
    avatarHolder.add(prepared.scene);
    prepared.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    prepared.rigRootRest = V(0, -prepared.dims.hipY + prepared.dims.TH + prepared.dims.SH + prepared.dims.ankleH, 0);
    E.setAvatar(Object.assign({}, E.lastCfg, { dims: prepared.dims }));
  };
  E.clearModel = function (keep) {
    if (!E.custom) return;
    avatarHolder.remove(E.custom.scene);
    E.custom = null;
    if (!keep) { E.setAvatar(Object.assign({}, E.lastCfg, { dims: null })); }
  };
  function hideRig(hide) {
    if (!E.rig) return;
    E.rig.b.root.traverse((o) => { if (o.isMesh && o.userData.body) o.visible = !hide; });
    for (const sm of E.rig.skinned) sm.visible = !hide;
    if (E.rig.tail) E.rig.tail.group.visible = !hide;
  }

  // Version miroir d'un exercice (côté gauche ↔ droit).
  const NEG = ['rr', 'ry', 'spS', 'spT', 'nkS', 'nkT'];
  const swapName = (n) => (typeof n === 'string' ? n.replace(/(L|R)$/, (c) => (c === 'L' ? 'R' : 'L')) : n);
  function mirrorPose(P) {
    if (!P) return P;
    const o = {};
    for (const k in P) {
      let nk = k, v = P[k];
      const base = k.slice(0, -1), last = k.slice(-1);
      if ((last === 'L' || last === 'R') && SYM.includes(base)) nk = base + (last === 'L' ? 'R' : 'L');
      if (NEG.includes(k)) v = -v;
      o[nk] = v;
    }
    return o;
  }
  const swapKeys = (obj) => { if (!obj) return obj; const o = {}; for (const k in obj) o[swapName(k)] = obj[k]; return o; };
  E.mirror = function (ex) {
    if (ex._mirror) return ex._mirror;
    const m = Object.assign({}, ex);
    delete m._keys; delete m._plants;
    m.id = ex.id + '~'; m.mirrored = !ex.mirrored;
    m.base = mirrorPose(ex.base);
    m.keys = ex.keys.map((k) => Object.assign(mirrorPose(k), { t: k.t }));
    m.plant = swapKeys(ex.plant);
    if (ex.reach) { m.reach = {}; for (const k in ex.reach) m.reach[swapName(k)] = Object.assign({}, ex.reach[k], { m: swapName(ex.reach[k].m) }); }
    if (ex.anchor) m.anchor = Object.assign({}, ex.anchor, { m: ex.anchor.m.map(swapName), m2: ex.anchor.m2 && ex.anchor.m2.map(swapName), _at: null, _at2: null });
    if (ex.contacts) m.contacts = ex.contacts.map(swapName);
    if (ex.props) m.props = ex.props.map((p) => (typeof p === 'string' ? p : Object.assign({}, p, { at: swapName(p.at) })));
    m.flatL = ex.flatR; m.flatR = ex.flatL;
    if (ex.cam && ex.cam.az !== undefined && ex.cam.az % 180 !== 0) m.cam = Object.assign({}, ex.cam, { az: -ex.cam.az });
    m._mirror = ex; ex._mirror = m;
    return m;
  };
  window.Corpus3D = E;
})();
