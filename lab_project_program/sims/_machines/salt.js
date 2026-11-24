// 盐雾试验机：透明观察罩 + 盐液槽 + 顶部喷淋，雾滴沉降模拟
import {box, cyl, tube, group, tag, put, mat, ss, sph, disc} from '../_kit/kit.js';

const rand = (n, seed) => {
  let s = seed;
  const out = [];
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647;
    out.push(s / 2147483647);
  }
  return out;
};

export default {
  label: '盐水喷雾试验机',
  en: 'Salt Spray Test Chamber',
  duration: 28,
  view: {tx: 0, ty: 0.9, tz: 0, az: 32, el: 16, d: 5.4},
  viewLabel: {side: '侧视', top: '俯视', lid: '开罩'},
  views: {
    side: {tx: 0, ty: 0.9, tz: 0, az: -105, el: 8, d: 4.8},
    top: {tx: 0, ty: 1.1, tz: 0, az: 12, el: 64, d: 4.6},
    lid: {tx: 0, ty: 0.9, tz: 0.3, az: -150, el: 12, d: 3.0},
  },
  cues: [
    {at: 0, label: '整机待机 · 盐液箱与观察罩', view: 'hero', explode: 0, xray: 0},
    {at: 4, label: '工作原理：压缩空气雾化 NaCl 溶液', view: 'side', explode: 0, xray: 0},
    {at: 8.5, label: '测试中：雾滴沉降于样机表面 · 35℃ 恒温', view: 'hero', explode: 0, xray: 0},
    {at: 14, label: '透视罩体 · 观察槽内盐液与加热棒', view: 'side', explode: 0, xray: 1},
    {at: 18.5, label: '开罩取件（掀盖模拟）', view: 'lid', explode: 0, xray: 0},
    {at: 23, label: '拆解：雾化管/加热棒/盐槽滑出', view: 'hero', explode: 1, xray: 0},
    {at: 26.5, label: '运行回归', view: 'hero', explode: 0, xray: 0},
  ],
  build(K) {
    const g = K.group;
    const root = g();
    const GRY = mat('#b9c4d4', 0.45, 0.18);
    const BODY = mat('#dce7f4', 0.5, 0.08);
    const SALT = mat('#9fd6e8', 0.15, 0.05, {transparent: true, opacity: 0.75, depthWrite: false});
    const BRINE = mat('#7ec3d8', 0.2, 0.05);
    const LID = mat('#f2f6fb', 0.42, 0.06);
    const HEAT = mat('#d6452f', 0.4, 0.05, {emissive: '#c7441f', emissiveIntensity: 0.4});
    const ACC = mat('#e8a33c', 0.4, 0.1);

    const body = g();
    // 槽体
    put(body, tag(box(1.30, 0.55, 1.10, BODY, 0, 0.42, 0), '箱体', 'shell'));
    // 透明观察罩（掀盖）
    const hood = g();
    put(hood, tag(box(1.30, 0.42, 1.08, SALT, 0, 0.86, 0), '观察罩', 'shell'));
    put(hood, tag(cyl(0.03, 0.03, 0.1, GRY, -0.62, 0.88, 0.5), '铰链', 'shell'));
    hood.position.set(0, 0.66, 0);
    put(body, hood);
    // 盐液槽液面
    put(body, tag(disc(0.58, BRINE, 0, 0.28, 0, 24, 0.0), '盐液', 'inner'));
    // 待测样机（摆在液面上方托架）
    const dut = g();
    put(dut, tag(box(0.32, 0.08, 0.4, ACC, -0.18, 0.4, 0.05), '被测样机', 'inner'));
    put(dut, tag(box(0.32, 0.03, 0.4, mat('#cbd7e8', 0.2, 0.1), -0.18, 0.45, 0.05, 0), '屏面', 'inner'));
    put(body, dut);
    // 托架
    for (const [sx, sz] of [[-0.45, -0.2], [0.12, -0.2], [-0.45, 0.3], [0.12, 0.3]]) {
      put(body, tag(box(0.05, 0.34, 0.03, GRY, sx, 0.3, sz), '托架角', 'inner'));
    }
    // 雾化喷杆（顶部横管 + 喷嘴）
    put(body, tag(tube(0.014, 1.0, mat('#8fa1b8', 0.4, 0.3), 0, 0.95, 0, 0), '雾化管', 'inner'));
    for (let i = 0; i < 3; i++) {
      put(body, tag(cyl(0.012, 0.012, 0.05, mat('#8fa1b8', 0.4, 0.3), 0, 0.9, -0.3 + i * 0.3, 0, 6), '喷嘴', 'inner'));
    }
    // 加热棒
    put(body, tag(tube(0.016, 0.7, HEAT, 0.28, 0.24, 0.32), '加热棒', 'inner'));
    // 控制面板（侧）
    put(body, tag(box(0.24, 0.4, 0.7, GRY, -0.7, 0.55, 0.1), '控制箱', 'shell'));
    put(body, tag(box(0.12, 0.14, 0.03, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.8}), -0.7, 0.66, 0.42), '屏幕', 'shell'));
    // 进气口
    put(body, tag(cyl(0.03, 0.03, 0.12, GRY, -0.68, 0.62, -0.3, 0, 12), '进气嘴', 'shell'));

    // 雾滴粒子（加载时一次性生成，update 只读）
    const PX = rand(240, 77);
    const PY = rand(240, 712);
    const PZ = rand(240, 913);
    const P_ = rand(240, 331);
    const pmat = mat('#dff4fc', 0.05, 0.0, {transparent: true, opacity: 0.7});
    const particles = g();
    for (let i = 0; i < 240; i++) {
      const s = 0.008 + P_[i] * 0.012;
      const m = sph(s, pmat, (PX[i] * 2 - 1) * 0.52, 0.6 + PY[i] * 0.3, (PZ[i] * 2 - 1) * 0.42);
      particles.add(m);
    }
    put(body, particles);

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      particles.visible = ss(t, 6, 8) * (1 - ss(t, 24, 26)) > 0.4;
      if (particles.visible) {
        const dr = t * 0.5;
        let i = 0;
        particles.children.forEach((c) => {
          c.position.y = 0.62 + ((PY[i] + dr * 0.2) % 1) * 0.28;
          i++;
        });
      }
      // 罩开合
      const lift = ss(t, 17.9, 19.2) * (1 - ss(t, 22, 23));
      hood.position.y = 0.66 + lift * 0.5;
      hood.rotation.x = (-0.05 - 0.9 * lift) * 0 + lift * -0.6;
      hood.rotation.x = lift * -0.55;
      hood.position.x = -0.3 * lift + 0.0;
      // 拆解滑出件
      const nav = body.getObjectByName('雾化管');
      nav.position.x = 1.1 * k;
      const heat = body.getObjectByName('加热棒');
      heat.position.y = 0.7 * k;
      const salt = body.getObjectByName('盐液');
      salt.position.y = 0.25 * k;
      const ctrl = body.getObjectByName('控制箱');
      ctrl.position.x = -0.7 * k;
      return {
        phase: (lift > 0.5 ? '开罩取件 · 样品表面盐雾沉降' : '盐雾测试中 · 35℃ · 5% NaCl') ,
        gauges: [
          {l: '箱内温度', v: '35.0 ℃', hl: 1},
          {l: '盐液浓度', v: '5% NaCl'},
          {l: '沉降量', v: (0.8 + Math.sin(t * 2) * 0.3).toFixed(1) + ' ml/h'},
        ],
        markers: k > 0.5 ? [
          {x: 0, y: 0.95, z: 0, text: '雾化喷杆'},
          {x: 0.28, y: 0.26, z: 0.32, text: '恒温加热棒'},
          {x: 0, y: 0.3, z: 0, text: '盐液槽'},
        ] : [],
      };
    };
    return {root: body, update};
  },
};