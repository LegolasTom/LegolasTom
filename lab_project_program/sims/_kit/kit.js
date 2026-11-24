// kit.js — 实验室设备 3D 拆解仿真共享引擎（teardown 风格轻量实现）
// 每台"机器"只需定义：几何构建 + update(t, s)（真实数字来源），其余（轨道、拆解、
// 透视、外壳、自动导览、仪表盘、参考图）都由本引擎统一驱动。
import * as THREE from 'three';

export {THREE};
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sstep = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const ss = (a, b, t) => sstep((t - a) / (b - a));
export const easeInOut = (x) => {
  const u = clamp(x, 0, 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};
export const prog = (t, t0, t1) => easeInOut((t - t0) / (t1 - t0));
const D2R = Math.PI / 180;
export const rad = (d) => d * D2R;
export const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export const W = 1600;
export const H = 900;

// 共享固定色板
export const COL = {
  bg: '#eef1f6',
  ground: '#e4e9f1',
  panel: '#f8f9fc',
  ink: '#2a3247',
  sub: '#7b8499',
  line: '#d7dcea',
};

// ---------------------------------------------------------------------------
// 舞台：渲染器/场景/灯光/地面/相机
// ---------------------------------------------------------------------------
export function createStage(canvas, accent) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  scene.fog = new THREE.Fog(COL.bg, 26, 60);

  const camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 120);

  // 柔和环境光（低多边形房间 → PMREM）
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#ffffff');
    const box = (w, h, pos, k) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide}),
      );
      m.position.copy(pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(18, 18, new THREE.Vector3(0, 20, 6), 2.2);
    box(4, 20, new THREE.Vector3(-20, 6, 8), 2.8);
    box(4, 20, new THREE.Vector3(20, 6, -6), 2.0);
    box(26, 2, new THREE.Vector3(0, 2, 22), 1.4);
    const g = new THREE.Mesh(new THREE.CircleGeometry(50, 32), new THREE.MeshBasicMaterial({color: '#f4f6fa', side: THREE.DoubleSide}));
    g.rotation.x = -Math.PI / 2;
    g.position.y = -3;
    env.add(g);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
    scene.environmentIntensity = 0.9;
    pm.dispose();
  }
  const sun = new THREE.DirectionalLight('#fff5ea', 2.4);
  sun.castShadow = true;
  const EXT = 9;
  Object.assign(sun.shadow.camera, {left: -EXT, right: EXT, top: EXT, bottom: -EXT, near: 0.5, far: 40});
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 12;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.004;
  sun.position.set(-6, 12, 6);
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#ffffff', '#dfe6f2', 0.7));

  // 地面（受影），NDC 淡出到背景
  const gm = new THREE.MeshStandardMaterial({color: '#f2f4f9', roughness: 0.95, metalness: 0});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), gm);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001;
  ground.receiveShadow = true;
  scene.add(ground);

  const size = {w: W, h: H};
  const resize = (w, h, pr) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  // 一个可选的拍摄用底盘（让机器"站立"视觉更稳）
  const pad = (r = 2.2, col = '#c9d2e2') => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({color: col, roughness: 0.6, metalness: 0.08, transparent: true, opacity: 0.55}));
    p.rotation.x = -Math.PI / 2;
    p.position.y = 0.001;
    p.receiveShadow = true;
    scene.add(p);
    return p;
  };

  const setQuality = (q) => {
    if (q.shadow !== undefined) {
      sun.castShadow = q.shadow;
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    if (q.pr !== undefined) renderer.setPixelRatio(q.pr);
  };

  return {renderer, scene, camera, sun, ground, pad, resize, size, setQuality};
}

// 相机轨道目标计算
export function camPos(c) {
  const el0 = rad(c.el || 0);
  const az0 = rad(c.az || 0);
  const d = c.d || 8;
  return new THREE.Vector3(
    c.tx + d * Math.cos(el0) * Math.sin(az0),
    c.ty + d * Math.sin(el0),
    c.tz + d * Math.cos(el0) * Math.cos(az0),
  );
}
export function applyCam(camera, c, off) {
  const az = rad(c.az) + (off ? off.oz : 0);
  const el = clamp(rad(c.el) + (off ? off.oe : 0), -1.25, 1.35);
  const d = (c.d || 8) * (off ? off.k : 1);
  const p = new THREE.Vector3(
    c.tx + d * Math.cos(el) * Math.sin(az),
    c.ty + d * Math.sin(el),
    c.tz + d * Math.cos(el) * Math.cos(az),
  );
  camera.position.copy(p);
  camera.lookAt(c.tx, c.ty, c.tz);
}

// ---------------------------------------------------------------------------
// 几何/材质小工具
// ---------------------------------------------------------------------------
export const mat = (color, rough = 0.5, metal = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    envMapIntensity: 0.55,
    ...extra,
  });
export function mesh(geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  if (x !== undefined) m.position.set(x, y, z);
  return m;
}
export const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
export const cyl = (rt, rb, h, m, x, y, z, seg = 32) => {
  const c = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
  c.castShadow = true;
  c.receiveShadow = true;
  return c;
};
export const tube = (r, h, m, x, y, z) => cyl(r, r, h, m, x, y, z);
export const disc = (r, m, x, y, z, seg = 40) => mesh(new THREE.CylinderGeometry(r, r, 0.05, seg), m, x, y, z);
export const sph = (r, m, x, y, z) => mesh(new THREE.SphereGeometry(r, 28, 20), m, x, y, z);
export const cone = (r, h, m, x, y, z) => mesh(new THREE.ConeGeometry(r, h, 28), m, x, y, z);
export const group = () => new THREE.Group();
export function lathe(profile, m, x, y, z, seg = 48) {
  const g = mesh(new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg), m, x, y, z);
  g.castShadow = true;
  g.receiveShadow = true;
  return g;
}
// 将若干 mesh 加入容器并返回容器
export const put = (parent, ...objs) => {
  for (const o of objs) parent.add(o);
  return parent;
};
// 打标签（命中 userData.name, 供拆解/xray/图例用）
export function tag(o, name, kind = 'body') {
  o.userData.name = name;
  o.userData.kind = kind;
  return o;
}
// 拆解部件注册表
export const PARTS = [];

// ---------------------------------------------------------------------------
// 控制台：标题/状态/图例/仪表/按钮/参考图
// ---------------------------------------------------------------------------
export function createConsole(root, spec, accent) {
  const el = document.createElement('div');
  el.id = 'con';
  el.innerHTML = `
    <div class="tbar">
      <div class="tt"><b id="tT">${spec.label}</b><span id="tE">${spec.en || ''}</span></div>
      <div class="tright"><span class="chip" id="tProj"></span><span class="chip" id="tPhase">READY</span></div>
    </div>
    <div class="ref" id="refBox"><div class="refhead">海报实拍参考 <i id="refIdx">1/1</i></div><img id="refImg" alt=""/><div class="reffoot" id="refCap"></div></div>
    <div class="modes" id="modes"></div>
    <div class="views" id="views"></div>
    <div class="gauges" id="gauges"></div>
    <div class="legend" id="legend"></div>
    <div class="phasebar"><i id="phaseFill"></i></div>
  `;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const refs = spec.crops || [];
  let refI = 0;
  const refImg = $('refImg');
  const setRef = (i) => {
    if (!refs.length) {
      $('refBox').style.display = 'none';
      return;
    }
    refI = ((i % refs.length) + refs.length) % refs.length;
    const c = refs[refI];
    refImg.src = 'img/' + c.file;
    $('refCap').textContent = c.cap || '';
    $('refIdx').textContent = refI + 1 + '/' + refs.length;
  };
  refImg.addEventListener('click', () => setRef(refI + 1));
  setRef(0);

  // 模式与视角按钮
  const btn = (parent, text, cls, cb) => {
    const b = document.createElement('button');
    b.className = 'bt ' + (cls || '');
    b.textContent = text;
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      cb(b);
    });
    parent.appendChild(b);
    return b;
  };
  const modBtns = {};
  // 拆解 / 透视 / 外壳 开关按钮单独给引用
  const modeBtn = (text, cb) => btn($('modes'), text, '', cb);
  const viewsBtns = [];

  const label = $('tT');
  const esub = $('tE');
  const phase = $('tPhase');
  const proj = $('tProj');
  const gaugesEl = $('gauges');
  const legendEl = $('legend');

  return {
    el,
    refs,
    setRef,
    modeBtn,
    btn,
    viewsBtns,
    modBtns,
    label,
    esub,
    phase,
    proj,
    gauges: gaugesEl,
    legend: legendEl,
    phaseFill: $('phaseFill'),
  };
}

// ---------------------------------------------------------------------------
// 引擎主入口：装配机器 → 驱动循环
// ---------------------------------------------------------------------------
export async function boot(spec, opts = {}) {
  // spec.machine: 机器模块; spec.reg: registry 条目(含 accent/crops/book)
  const root = document.getElementById('app');
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  root.appendChild(canvas);

  const st = createStage(canvas, spec.reg.accent);
  const K = {...kmat, mat, ss, sstep, prog, lerp, clamp, easeInOut, THREE, rad, group, tag, put, box, cyl, tube, disc, sph, cone, lathe};
  const mach = await spec.machine.build(K, st);
  st.scene.add(mach.root);
  if (mach.boot) mach.boot();

  const views = mach.views || {};
  if (!views.hero) views.hero = mach.view;
  const vname = Object.keys(views);
  const cues = mach.cues || [];
  const DUR = mach.duration || 26;
  const ACCENT = spec.reg.accent;

  const con = createConsole(root, {...spec, label: spec.reg.title || mach.label, en: spec.reg.en || mach.en, crops: spec.reg.crops || []}, ACCENT);
  // 视角按钮
  for (const [k, v] of Object.entries(views)) {
    con.viewsBtns.push(con.btn(con.el.querySelector('#views'), (k === 'hero' ? '主视角' : (mach.viewLabel?.[k] || k)).toUpperCase(), 'vbtn', (b) => {
      takeOver();
      viewSel = k;
      viewAt = cT;
      Object.assign(off, {oz: 0, oe: 0, k: 1});
      flash(b);
    }));
  }
  // 模式按钮
  const mbtns = {};
  for (const m of ['explode', 'xray', 'shell']) {
    mbtns[m] = con.modeBtn({explode: '拆解', xray: '透视', shell: '外壳'}[m], (b) => {
      takeOver();
      mode[m].on = mode[m].on ? 0 : 1;
      mode[m].at = cT;
      flash(b);
    });
  }
  const playBtn = con.modeBtn('循环 □', (b) => {
    takeOver();
    paused = !paused;
    flash(b);
  });
  const tourChip = document.createElement('div');
  tourChip.className = 'tourchip';
  tourChip.innerHTML = '<i></i>自动导览 · 点击接管';
  con.el.appendChild(tourChip);

  // 轨道
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  let cT = 0; // 循环时间 (0..DUR)
  let T = 0; // 墙钟
  let paused = false;
  let viewSel = 'hero';
  let viewAt = 0;
  let tour = true;
  let lastInput = -999;
  const mode = Object.fromEntries(Object.keys(mbtns).map((k) => [
    k,
    {on: 0, at: cT},
  ]));
  mode.play = {on: 0, at: cT};
  if (Object.prototype.hasOwnProperty.call(opts, 'shell')) mode.shell.on = opts.shell;
  const off = {oz: 0, oe: 0, k: 1};
  const cam = {};
  const cv = views['hero'];
  cam.az = cv.az;
  cam.el = cv.el;
  cam.d = cv.d;
  cam.tx = cv.tx;
  cam.ty = cv.ty;
  cam.tz = cv.tz;

  // 自动导览 → 用户接管
  const takeOver = () => {
    lastInput = T;
    if (!tour) return;
    tour = false;
    // 保留当前 cue 的目标值
    const v = cueViewAt(cT);
    viewSel = v.view;
    viewAt = cT;
  };
  const startTour = () => {
    tour = true;
    lastInput = T;
    Object.assign(off, {oz: 0, oe: 0, k: 1});
  };
  const flash = (b) => {
    b.classList.add('pulse');
    setTimeout(() => b.classList.remove('pulse'), 260);
  };
  const syncModes = (ct) => {
    const tgt = cueModesAt(ct);
    for (const k of Object.keys(mode)) {
      if (k === 'play') continue;
      if (mode[k].on) continue;
      ensureAt(mode[k], tgt[k], cT);
    }
  };
  const ensureAt = (m, on, t) => {
    if (m.on !== on) {
      m.on = on;
      m.at = t;
    }
  };
  // cue 内插
  const interp = (a, b, k, keys) => {
    const o = {};
    for (const kk of keys) o[kk] = a[kk] + (b[kk] - a[kk]) * k;
    return o;
  };
  const cueStateAt = (ct) => {
    if (!cues.length) return {view: 'hero', explode: 0, xray: 0, shell: 1, label: '', v: views['hero']};
    let i = 0;
    while (i + 1 < cues.length && cues[i + 1].at <= ct) i++;
    const a = cues[i];
    const b = cues[i + 1] || {at: DUR, ...a, view: a.view};
    const k = prog(ct, a.at, b.at);
    const vA = views[a.view] || views['hero'];
    const vB = views[b.view] || vA;
    return {
      view: k < 0.5 ? a.view : b.view,
      explode: lerp(a.explode ?? 0, b.explode ?? 0, k),
      xray: lerp(a.xray ?? 0, b.xray ?? 0, k),
      shell: lerp(a.shell ?? 1, b.shell ?? 1, k),
      label: a.label || '',
      v: interp(vA, vB, k, ['tx', 'ty', 'tz', 'az', 'el', 'd']),
    };
  };
  const cueViewAt = (ct) => cueStateAt(ct);
  const cueModesAt = (ct) => cueStateAt(ct);

  // QoL
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  const k1 = (x) => Math.min(1, Math.max(0, x));
  const easedAt = (m) => {
    const x = k1((cT - m.at) / 0.7);
    return m.on ? easeInOut(x) : 1 - easeInOut(x);
  };

  // 交互
  let drag = null;
  const scaleFit = (noStage) => {
    const h = innerHeight;
    const s = Math.min(innerWidth / W, h / H);
    root.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(h - H * s) / 2}px) scale(${s})`;
    if (!noStage) st.resize(W, H, clamp((devicePixelRatio || 1) * s, 0.7, 1.6));
  };
  const setTier = () => {
    // 简单性能档位：持续慢则降档（关阴影/降dpr）
    const fps = 0.6 / Math.max(1e-6, frameMs) - 6;
    if (tierGuard > 0 && fps < 36 && tier === 0) {
      tier = 1;
      st.setQuality({shadow: false});
    } else if (tier === 1 && fps < 26) {
      st.setQuality({pr: 0.66});
      tier = 2;
    }
    tierGuard = 0;
  };
  let tier = 0;
  let tierGuard = 0;
  let frameMs = 16.7;
  scaleFit();
  addEventListener('resize', () => scaleFit());
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    const vmap = {1: 'hero'};
    vname.slice(1).forEach((n, i) => (vmap[String(i + 2)] = n));
    if (vmap[k]) con.viewsBtns[Math.max(0, vname.indexOf(vmap[k]))].click();
    else if (k === ' ') playBtn.click();
    else if (k === 'x') mbtns.xray.click();
    else if (k === 'e') mbtns.explode.click();
    else if (k === 'f') mbtns.shell.click();
    else if (k === 't') tour ? takeOver() : startTour();
    else return;
    e.preventDefault();
  });
  canvas.addEventListener('pointerdown', (e) => {
    takeOver();
    drag = {x: e.clientX, y: e.clientY};
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.oz += ((e.clientX - drag.x) / scaleNow()) * 0.28;
    off.oe = clamp(off.oe + ((e.clientY - drag.y) / scaleNow()) * 0.18, -0.7, 1.2);
    drag = {x: e.clientX, y: e.clientY};
    lastInput = T;
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('drag');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    takeOver();
    off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.25, 3);
  }, {passive: false});
  canvas.addEventListener('dblclick', () => {
    startTour();
    lastInput = T;
  });
  tourChip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (tour) takeOver();
    else startTour();
    lastInput = T;
  });
  const scaleNow = () => {
    const r = root.getBoundingClientRect();
    return Math.max(0.2, r.width / W);
  };

  // 项目数据（iframe ?p=）
  let proj = null;
  const pQuery = new URLSearchParams(location.search).get('p');
  if (pQuery) {
    try {
      const r = await fetch('/api/v1/projects/' + encodeURIComponent(pQuery));
      const d = await r.json();
      if (d.status === 'ok') proj = d.project;
    } catch (e) {
      /* 单独打开无服务时忽略 */
    }
  }
  if (proj) {
    con.label.textContent = proj.id.toUpperCase() + ' · ' + proj.name;
    con.esub.textContent = proj.name_en;
    con.proj.textContent = proj.category_name;
    con.proj.style.display = '';
  } else {
    con.label.textContent = (spec.reg.title || spec.label) + (pQuery ? ' · ' + pQuery.toUpperCase() : '');
    con.proj.style.display = '';
  }

  // 主循环
  const projV = new THREE.Vector3();
  const markers = [];
  const annPool = [];
  const markerWrap = document.createElement('div');
  markerWrap.id = 'markers';
  con.el.appendChild(markerWrap);

  const spotlightParts = (root, ents) => {
    // 把 transform 基准记录下来（拆解用）
  };
  const partBases = new Map();
  const collectParts = (o, name, kind) => {
    if (o.userData.name) {
      partBases.set(o.userData.name, o.position.clone());
      o.userData.kind = o.userData.kind || 'body';
    }
    for (const c of o.children) collectParts(c);
  };
  collectParts(mach.root);
  const explodeList = (mach.explodeMap || []).map((e) => e);
  const xrays = [];

  const renderFrame = () => {
    // 时间
    const dt = Math.min(0.1, Math.max(0.001, (performance.now() - lastNow) / 1000));
    lastNow = performance.now();
    T += dt;
    if (!paused) cT = ((cT + dt * 0.9) % DUR + DUR) % DUR;
    if (tour === false && !paused && T - lastInput > 26) startTour();
    tierGuard++;
    if (tierGuard > 4) setTier();

    // 状态目标
    const cs = cueStateAt(cT);
    let exT = cs.explode;
    let xrT = cs.xray;
    let shT = cs.shell;
    if (mode.explode.on) exT = 1;
    if (mode.xray.on) xrT = 1;
    if (mode.shell.on) shT = 0;
    // 相机
    let target = {...cs.v};
    if (!tour) {
      const v0 = views[viewSel] || views['hero'];
      const k = sstep(Math.min(1, (cT - viewAt) / 1.1));
      target = {
        tx: cam.tx + (v0.tx - cam.tx) * k,
        ty: cam.ty + (v0.ty - cam.ty) * k,
        tz: cam.tz + (v0.tz - cam.tz) * k,
        az: cam.az + wrap(v0.az - cam.az) * k,
        el: cam.el + (v0.el - cam.el) * k,
        d: cam.d + (v0.d - cam.d) * k,
      };
    }
    const ck = tour ? 1 - Math.exp(-dt / 0.34) : 1 - Math.exp(-dt / 0.16);
    cam.az += wrap(target.az - cam.az) * ck;
    cam.el += (target.el - cam.el) * ck;
    cam.d += (target.d - cam.d) * ck;
    cam.tx += (target.tx - cam.tx) * ck;
    cam.ty += (target.ty - cam.ty) * ck;
    cam.tz += (target.tz - cam.tz) * ck;

    const sts = {explode: exT, xray: xrT, shell: shT, t: cT, paused, tour};
    window.SIM_EXPLODE = exT;
    window.SIM_XRAY = xrT;
    window.SIM_SHELL = shT;
    const info = mach.update(cT, sts) || {};
    // 拆解
    for (const ent of explodeList) {
      const o = findPart(mach.root, ent.name);
      if (!o) continue;
      const base = partBases.get(ent.name);
      if (!base) continue;
      o.position.copy(base).addScaledVector(ent.dir, ent.dist * sstep(exT * (ent.delay ?? 1)));
    }
    // 透视: 外壳部件透明
    rendererOpacity(mach.root, xrT, shT);
    // 标记点
    if (info.markers) updateMarkers(info.markers, st.camera, markerWrap);
    else markerWrap.innerHTML = '';
    // 仪表
    if (info.gauges) renderGauges(con, info.gauges);
    con.phase.textContent = info.phase || cs.label || 'RUN';
    con.phaseFill.style.width = `${((cT / DUR) * 100).toFixed(1)}%`;
    applyCam(st.camera, cam);
    st.renderer.render(st.scene, st.camera);

    // 性能
    if (tier === 2) requestAnimationFrame(renderFrame);
  };
  // 定时重绘（tier2 用）
  let tAcc = 0;
  let accN = 0;
  const lastNow = performance.now();
  let tick = 0;
  const rafLoop = (now) => {
    const ms = now - lastRaf;
    lastRaf = now;
    if (tier < 2) {
      tAcc += ms;
      accN++;
      if (tAcc >= 600) {
        frameMs = tAcc / accN;
        tAcc = 0;
        accN = 0;
        tierGuard++;
        setTier();
      }
    }
    renderFrame();
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(rafLoop);
  };
  let lastRaf = performance.now();
  requestAnimationFrame(rafLoop);

  window.SIM = {tour: () => (tour ? 'auto' : 'manual'), getT: () => cT};
  return {canvas, st, con};
}

const kmat = {};

function findPart(root, name) {
  if (root.userData.name === name) return root;
  for (const c of root.children) {
    const r = findPart(c, name);
    if (r) return r;
  }
  return null;
}

// xray: 外壳部件半透明; shell: 隐藏外壳部件; 内核/运动件保持实心
function rendererOpacity(root, xray, shell) {
  const traverse = (o) => {
    if (o.userData.name) {
      const kind = o.userData.kind || 'body';
      let target = 1;
      let mode = 0; // 0 normal, 1 invisible, 2 trans
      if (kind === 'shell') {
        if (shell > 0.5) target = xray > 0.5 ? 0.12 : 1;
        else mode = 1;
      } else if (kind === 'inner' && xray > 0.5) {
        target = 0.9;
      }
      if (mode === 1) {
        o.visible = false;
      } else {
        o.visible = true;
        if (kind === 'shell') setOpacity(o, xray > 0.5 ? 0.1 + 0.06 * Math.sin(xray * 9) : 1, kind === 'shell');
      }
    }
    for (const c of o.children) traverse(c);
  };
  traverse(root);
}
function setOpacity(o, op, force) {
  o.traverse((c) => {
    if (c.isMesh) {
      if (Array.isArray(c.material)) {
        for (const m of c.material) {
          if (m.transparent !== !!force && m.opacity >= 0.999) return;
        }
      }
      const mm = c.material;
      mm.transparent = op < 0.999 || force;
      mm.opacity = op;
      mm.depthWrite = op > 0.5;
    }
  });
}

function renderGauges(con, gauges) {
  if (con._gl === gauges) return;
  con._gl = gauges;
  con.gauges.innerHTML = gauges
    .map((g) => {
      const v = g.hl === 2 ? '<b class="big">' + g.v + '</b>' : g.hl ? '<b>' + g.v + '</b>' : g.v;
      return '<span class="g"><i>' + g.l + '</i>' + v + '</span>';
    })
    .join('');
}

function updateMarkers(markers, camera, wrap) {
  wrap.innerHTML = '';
  const v = new THREE.Vector3();
  markers.forEach((m) => {
    v.set(m.x, m.y, m.z).project(camera);
    if (v.z > 1 || v.z < -1) return;
    const d = document.createElement('div');
    d.className = 'mark';
    d.textContent = m.text;
    d.style.left = (v.x * 0.5 + 0.5) * W + 'px';
    d.style.top = (-v.y * 0.5 + 0.5) * H + 'px';
    if (m.dy) d.style.transform = 'translate(-50%, -130%)';
    wrap.appendChild(d);
  });
}

// DOM 层 CSS（全部套在一个 1600×900 的舞台内，可整体缩放）
const CSS = `
html,body{margin:0;padding:0;background:#eef1f6;overflow:hidden;font-family:'Inter','PingFang SC','Microsoft YaHei',system-ui,sans-serif}
#app{position:absolute;inset:auto;left:0;top:0;width:1600px;height:900px;transform-origin:0 0}
#gl{position:absolute;inset:0;width:1600px;height:900px;display:block;touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
#con{position:absolute;inset:0;pointer-events:none}
#con button.pulse{animation:bp .28s ease}
@keyframes bp{50%{box-shadow:0 0 0 6px rgba(255,255,255,.9)}}
.tbar{position:absolute;left:24px;top:20px;right:24px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none}
.tt b{display:block;font-size:30px;font-weight:800;color:#24304a;letter-spacing:.5px;max-width:640px;line-height:1.15}
.tt span{font-size:13px;color:#7b8499;letter-spacing:.4px;display:block;margin-top:2px;text-transform:uppercase}
.tright{display:flex;gap:8px}
.chip{font-size:12px;font-weight:700;letter-spacing:1.5px;color:#3b4560;background:rgba(255,255,255,.72);border:1px solid #d7dcea;border-radius:5px;padding:7px 12px;backdrop-filter:blur(2px)}
.chipb{color:#fff;border-color:transparent}
.tourchip{position:absolute;left:50%;top:118px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:24px;padding:0 13px;border:1px solid #cdd5e6;border-radius:5px;background:rgba(255,255,255,.92);color:#3b4560;font:700 11px 'JetBrains Mono',monospace;letter-spacing:1.4px;white-space:nowrap;cursor:pointer;pointer-events:auto}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#e3562a}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
.ref{position:absolute;right:24px;top:64px;width:238px;border:1px solid #d7dcea;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.9);pointer-events:auto;cursor:pointer;box-shadow:0 8px 26px rgba(60,80,140,.14)}
.refhead{font-size:11px;font-weight:700;letter-spacing:1px;color:#5a6681;padding:8px 12px 6px;border-bottom:1px solid #e6eaf2;display:flex;justify-content:space-between}
.refhead i{color:#3f7bff;font-style:normal}
.ref img{display:block;width:100%;height:148px;object-fit:cover;object-position:center 60%}
.reffoot{font-size:10px;color:#9aa4ba;padding:5px 12px 8px;line-height:1.4}
.modes{position:absolute;left:24px;bottom:128px;display:flex;gap:10px}
.views{position:absolute;left:24px;bottom:88px;display:flex;gap:8px;flex-wrap:wrap;max-width:940px}
button.bt{pointer-events:auto;border:0;border-radius:8px;padding:11px 18px;font:700 14px 'Inter',sans-serif;letter-spacing:.5px;color:#33405c;background:#eef1f8;border:1px solid #d2d9e8;cursor:pointer;transition:.15s}
button.bt:hover{background:#e4e9f4}
button.vbtn{font-size:11.5px;letter-spacing:1.2px;padding:7px 12px;border-radius:6px}
.gauges{position:absolute;left:24px;top:118px;display:flex;flex-direction:column;gap:6px}
.gauges .g{background:rgba(255,255,255,.86);border:1px solid #d7dcea;border-left:3px solid #3f7bff;border-radius:6px;padding:6px 12px;font:700 20px 'JetBrains Mono',Consolas,monospace;color:#24304a;width:fit-content;display:flex;gap:8px;align-items:baseline}
.gauges .g i{font:600 11px 'Inter',sans-serif;color:#7b8499;letter-spacing:.4px;font-style:normal}
.gauges .g b{color:#e3562a;font-weight:800}
.gauges .g b.big{font-size:26px}
.legend{position:absolute;right:24px;bottom:120px;display:flex;flex-direction:column;align-items:flex-end;gap:5px;max-width:280px}
.legend .l{font-size:11.5px;color:#44506d;background:rgba(255,255,255,.8);border:1px solid #dfe4ef;border-radius:999px;padding:4px 11px;letter-spacing:.4px}
.phasebar{position:absolute;left:0;right:0;bottom:0;height:6px;background:rgba(0,0,0,.08)}
.phasebar i{display:block;height:100%;background:linear-gradient(90deg,#3f7bff,#35e0ff);width:0}
#markers{position:absolute;inset:0;pointer-events:none}
.mark{position:absolute;transform:translate(-50%,-50%);font:700 12px 'Inter',sans-serif;letter-spacing:.5px;color:#fff;background:rgba(35,48,78,.82);border:1px solid rgba(255,255,255,.25);border-radius:4px;padding:3px 9px;white-space:nowrap}
.turn{position:fixed;left:0;right:0;bottom:16px;text-align:center;font:600 12px 'JetBrains Mono',monospace;letter-spacing:1px;color:#8892a8;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
`;

