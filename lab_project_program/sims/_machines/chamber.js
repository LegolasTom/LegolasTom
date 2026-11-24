// 恒温恒湿试验箱 —— 高低温c01 / 湿热c02 / 温度循环c04 / 高温烤箱p02(oven皮肤)
import {box, cyl, tube, group, tag, put, mat, ss} from '../_kit/kit.js';

export default {
  label: '可程式恒温恒湿试验箱',
  en: 'Temp & Humi Programmable Chamber',
  duration: 30,
  view: {tx: 0, ty: 1.05, tz: 0, az: 28, el: 12, d: 6.2},
  viewLabel: {side: '侧视', top: '顶视', door: '门视', inner: '箱内'},
  views: {
    side: {tx: 0, ty: 1.05, tz: 0, az: -100, el: 6, d: 5.6},
    top: {tx: 0, ty: 0.8, tz: 0, az: 12, el: 62, d: 5.2},
    door: {tx: 0, ty: 1.05, tz: 0, az: -175, el: 4, d: 3.6},
    inner: {tx: 0, ty: 1.05, tz: 0.35, az: 0, el: 0, d: 2.6},
  },
  cues: [
    {at: 0, label: '整机待机 · 温控系统准备', view: 'hero', explode: 0, xray: 0},
    {at: 4.5, label: '箱门观察窗就位', view: 'door', explode: 0, xray: 0},
    {at: 9.5, label: '开门 · 温度循环运行（高低温交变）', view: 'door', explode: 0, xray: 0},
    {at: 13.5, label: '透视外壳 · 保温内舱与样品托可见', view: 'hero', explode: 0, xray: 1},
    {at: 18.5, label: '拆解分析：外壳滑开，露出蒸发器/压缩机/加湿桶', view: 'hero', explode: 1, xray: 0},
    {at: 24.5, label: '原理视角 · 左侧视观察内部构造', view: 'side', explode: 1, xray: 0},
    {at: 28, label: '运行回归', view: 'hero', explode: 0, xray: 0},
  ],
  build(K) {
    const g = K.group;
    const root = g();
    const WHT = mat('#f7f9fd', 0.4, 0.06);
    const WHT2 = mat('#e8ecf4', 0.5, 0.05);
    const GRY = mat('#aab6c8', 0.5, 0.15);
    const DRK = mat('#2d3a52', 0.42, 0.22);
    const BLU = mat('#2e6ec4', 0.5, 0.1);
    const GLASS = mat('#cde6ff', 0.08, 0.02, {transparent: true, opacity: 0.32, depthWrite: false});
    const INSUL = mat('#7fb0a6', 0.62, 0.03);
    const U = mat('#dce3ef', 0.4, 0.05);

    // ---- 机架底盘 ----
    const chassis = g();
    put(chassis, tag(box(1.3, 0.1, 1.7, WHT2, 0, 0.06, 0), '底座', 'inner'));
    for (const [x, z] of [[-0.5, -0.6], [0.5, -0.6], [-0.5, 0.6], [0.5, 0.6]]) {
      put(chassis, tag(cyl(0.035, 0.035, 0.14, GRY, x, 0.0, z), '轮', 'inner'));
    }
    put(chassis, tag(box(1.3, 1.86, 1.7, WHT, 0, 1.06, 0), '外舱体', 'shell'));
    // 顶盖
    const hood = g();
    hood.userData.forExplode = [0, 1, 0];
    put(hood, tag(box(1.34, 0.16, 1.74, WHT2, 0, 1.0, 0), '顶盖', 'shell'));
    put(chassis, hood);
    // 保温内舱
    put(chassis, tag(box(1.0, 1.42, 1.3, INSUL, 0, 1.12, 0), '保温内舱', 'inner'));
    // 样品托盘 ×2（带 4 托柱）
    for (let i = 0; i < 2; i++) {
      for (const [sx, sz] of [[-0.44, -0.28], [0.44, -0.28], [-0.44, 0.28], [0.44, 0.28]]) {
        put(chassis, tag(cyl(0.012, 0.012, 0.5, GRY, sx, 0.25 + i * 0.55, sz), '托柱', 'inner'));
      }
      put(chassis, tag(box(0.96, 0.03, 0.72, GRY, 0, 0.52 + i * 0.55, 0.06), '样品托盘', 'inner'));
    }
    // 被测 POS 样机
    put(chassis, tag(box(0.22, 0.05, 0.26, DRK, -0.2, 0.58, 0.24), '被测样机', 'inner'));
    put(chassis, tag(box(0.22, 0.02, 0.26, mat('#cbd7e8', 0.2, 0.1), -0.2, 0.615, 0.24), '屏面', 'inner'));
    // 蒸发器组 + 风轮
    put(chassis, tag(box(0.3, 1.0, 0.24, GRY, 0.34, 1.0, -0.36), '蒸发器组', 'inner'));
    put(chassis, tag(cyl(0.16, 0.16, 0.09, mat('#8f9cb0', 0.35, 0.3), 0.34, 1.18, -0.36), '风轮', 'inner'));
    // 压缩机单元
    put(chassis, tag(box(0.55, 0.34, 0.5, DRK, 0.05, 0.36, -0.5), '压缩机', 'inner'));
    put(chassis, tag(cyl(0.11, 0.11, 0.32, mat('#6b7689', 0.4, 0.35), 0.36, 0.42, -0.5), '冷媒罐', 'inner'));
    put(chassis, tag(tube(0.024, 0.6, BLU, 0.2, 0.62, -0.62), '冷媒管1', 'inner'));
    put(chassis, tag(tube(0.024, 0.5, BLU, 0.5, 0.62, -0.42), '冷媒管2', 'inner'));
    // 加湿蒸汽桶
    put(chassis, tag(cyl(0.12, 0.12, 0.5, mat('#9aa6ba', 0.35, 0.25), -0.32, 0.68, -0.52), '加湿桶', 'inner'));

    // ---- 前门（铰链枢纽，拆解时沿 +z 滑出） ----
    const doorG = g();
    doorG.position.set(-0.62, 1.06, 0.86);
    const door = g();
    put(door, tag(box(1.24, 1.7, 0.07, WHT, 0.62, 0, 0), '门板', 'shell'));
    put(door, tag(box(0.62, 0.62, 0.025, GLASS, 0.58, 0.05, 0.045), '观察窗', 'shell'));
    put(door, tag(box(0.5, 0.14, 0.03, GRY, 0.62, 0.64, 0.045), '门把', 'shell'));
    put(doorG, door);
    put(chassis, doorG);

    // ---- 控制面板：触摸屏 + 指示灯 ----
    const ctrl = g();
    ctrl.userData.forExplode = [1, 0, 0];
    put(ctrl, tag(box(0.28, 0.6, 0.1, WHT2, 0.46, 1.62, 0.86), '控制面板', 'shell'));
    put(ctrl, tag(box(0.16, 0.16, 0.02, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.9}), 0.46, 1.7, 0.92), '触摸屏', 'shell'));
    for (let i = 0; i < 3; i++) {
      put(ctrl, tag(cyl(0.012, 0.012, 0.008, i % 2 ? mat('#35c48c') : mat('#e3562a'), 0.45, 1.52 - i * 0.07, 0.915), '指示灯', 'shell'));
    }
    put(chassis, ctrl);
    // 后背风机罩
    put(chassis, tag(box(0.72, 0.4, 0.12, GRY, 0, 1.62, -0.86), '风机罩', 'shell'));

    const FACTS = window.SIMFACTS || {};
    const isOven = FACTS.mode === 'oven';
    const tMax = FACTS.tMax ?? 150;
    const tMin = FACTS.tMin ?? -40;
    const hH = FACTS.hH ?? 98;
    const mLab = FACTS.modeLabel || (isOven ? 'RT+5~250℃' : '-40~150℃');

    const doorOpen = (t) => {
      const o1 = ss(t, 8.9, 10) * (1 - ss(t, 12.6, 13.4));
      const o2 = ss(t, 18.9, 19.9) * (1 - ss(t, 23.6, 24.4));
      return Math.max(o1, o2);
    };

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      doorG.position.set(-0.62, 1.06, 0.86 + 2.15 * k);
      doorG.rotation.y = -ss(t, 9.2, 10.4) * (1 - ss(t, 12.8, 13.6)) * 0.92;
      hood.position.y = 0.66 * k;
      ctrl.position.x = 1.15 * k;
      const cyc = (t % 30) / 30;
      const T = tMin + (tMax - tMin) * (0.5 + 0.5 * Math.sin(t * 0.55));
      const RH = Math.round(Math.max(20, hH - (100 - hH) * (0.5 + 0.5 * Math.sin(t * 0.4 + 2))) );
      const phases = ['低温保持', '升温交变', '恒温段', '降温交变', '高湿段', '干燥恢复'];
      return {
        phase: phases[Math.floor(cyc * 6) % 6] + (isOven ? ' · 高温烤箱' : ''),
        gauges: [
          {l: isOven ? '炉内温度' : '仓内温度', v: Math.round(T) + ' ℃', hl: 1},
          {l: isOven ? '排烟风门' : '湿度', v: isOven ? '已开启' : RH + ' %RH'},
          {l: '设定范围', v: mLab},
        ],
        markers: k > 0.55 ? [
          {x: 0.34, y: 1.18, z: -0.36, text: '蒸发器·风轮'},
          {x: 0.1, y: 0.42, z: -0.5, text: '压缩机'},
          {x: 0, y: 1.35, z: 0.06, text: '保温内舱'},
          {x: -0.32, y: 0.72, z: -0.52, text: '加湿桶'},
        ] : [],
      };
    };
    return {root: chassis, explodeMap: [], update, customParts: {doorG, hood, ctrl}};
  },
};