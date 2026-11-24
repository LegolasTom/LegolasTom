// 落球冲击试验机：钢球从设定高度自由落体冲击样机表面
import {box, cyl, tube, group, tag, put, mat, ss, sph} from '../_kit/kit.js';

export default {
  label: '落球冲击试验机',
  en: 'Steel Ball Impact Tester',
  duration: 24,
  view: {tx: 0, ty: 1.3, tz: 0, az: 30, el: 16, d: 6.4},
  viewLabel: {side: '侧视', top: '俯视', ball: '落球近摄'},
  views: {
    side: {tx: 0, ty: 1.3, tz: 0, az: -106, el: 6, d: 5.6},
    top: {tx: 0, ty: 1.4, tz: 0, az: 12, el: 62, d: 5.2},
    ball: {tx: 0, ty: 1.5, tz: 0.3, az: -165, el: 8, d: 2.2},
  },
  cues: [
    {at: 0, label: '整机待机 · 升降导轨 + 电磁释放头', view: 'hero', explode: 0, xray: 0},
    {at: 4, label: '样机固定于下方 V 架', view: 'side', explode: 0, xray: 0},
    {at: 8.5, label: '钢球沿导轨提升至释放高度', view: 'hero', explode: 0, xray: 0},
    {at: 12, label: '电磁释放！钢球自由落体击打样机', view: 'ball', explode: 0, xray: 0},
    {at: 16, label: '冲击点凹陷与开裂检查（0.5J/1J 档位）', view: 'side', explode: 0, xray: 0},
    {at: 20, label: '拆解：立柱导轨/释放头/钢球/样机V架分离', view: 'hero', explode: 1, xray: 0},
    {at: 23, label: '运行回归', view: 'hero', explode: 0, xray: 0},
  ],
  build(K) {
    const g = K.group;
    const root = g();
    const STL = mat('#b9c4d4', 0.5, 0.2);
    const STL2 = mat('#8f9cb0', 0.42, 0.3);
    const RAIL = mat('#4a5a76', 0.4, 0.3);
    const WP = mat('#f2f5fa', 0.5, 0.06);
    const RED = mat('#d6452f', 0.42, 0.08);
    const BALL = mat('#cfd6e2', 0.12, 0.95);
    const BODY = mat('#dce3ee', 0.5, 0.1);

    const body = g();
    // 底座
    put(body, tag(box(1.5, 0.16, 0.9, BODY, 0, 0.2, 0), '底座', 'shell'));
    for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) {
      put(body, tag(cyl(0.035, 0.035, 0.2, STL2, x, 0.1, z), '腿', 'inner'));
    }
    // 立柱导轨（双轨）
    for (const sx of [-0.18, 0.18]) {
      put(body, tag(box(0.05, 2.3, 0.05, RAIL, sx, 1.15, -0.06), '导轨', 'shell'));
    }
    // 顶部横梁 + 卷扬电机
    put(body, tag(box(0.5, 0.14, 0.4, WP, 0, 2.32, -0.06), '顶梁', 'shell'));
    put(body, tag(cyl(0.09, 0.09, 0.2, STL2, 0, 2.32, -0.3), '电机', 'inner'));
    // 电磁释放头（沿导轨滑动）
    const rel = g();
    put(rel, tag(box(0.2, 0.22, 0.2, RED, 0, 0, 0), '释放头', 'shell'));
    put(rel, tag(cyl(0.05, 0.05, 0.04, mat('#ffd9d0'), 0, -0.1, 0), '电磁吸盘', 'inner'));
    put(body, rel);
    // 钢球（挂在释放头下）
    const ballG = g();
    put(ballG, tag(sph(0.075, BALL, 0, 0, 0), '钢球', 'inner'));
    put(body, ballG);
    // 样机 V 架
    const vu = g();
    put(vu, tag(box(0.4, 0.4, 0.5, WP, 0, 0.5, 0.18), '夹具底座', 'shell'));
    put(vu, tag(box(0.24, 0.07, 0.42, STL2, 0, 0.68, 0.18, 0), 'V块', 'inner'));
    put(vu, tag(box(0.3, 0.06, 0.34, BODY, 0, 0.74, 0.18, 0), '样机', 'inner'));
    put(vu, tag(box(0.3, 0.03, 0.34, mat('#cbd7e8', 0.2, 0.1), 0, 0.785, 0.18, 0), '样机屏面', 'inner'));
    put(body, vu);
    // 控制盒
    const ctrl = g();
    put(ctrl, tag(box(0.5, 0.6, 0.34, WP, -0.72, 0.4, 0.28), '控制盒', 'shell'));
    put(ctrl, tag(box(0.16, 0.12, 0.02, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.85}), -0.72, 0.52, 0.46), '屏幕', 'shell'));
    put(body, ctrl);

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      // 周期：提升(0~0.4) 悬停(0.4~0.5) 释放自由落体(0.5~0.75) 
      const cyc = (t % 5) / 5;
      let yBall = 0;
      if (cyc < 0.4) yBall = cyc / 0.4;
      else if (cyc < 0.5) yBall = 1;
      else if (cyc < 0.72) {
        yBall = 1 - (cyc - 0.5) / 0.22; // 自由落体快下落
      } else yBall = 0.06;
      const YMAX = 1.62;
      rel.position.y = yBall * YMAX;
      ballG.position.y = yBall * YMAX - 0.16;
      const impact = ss(cyc, 0.7, 0.74);
      // 拆解
      rel.position.x = 1.2 * k;
      vu.position.x = -1.1 * k;
      ctrl.position.x = 0.8 * k;
      const n = Math.floor(t / 5);
      return {
        phase: impact > 0 ? '撞击！冲击点检查' : (yBall > 0.95 ? '钢球已就位 · 待释放' : '提升/落体运动'),
        gauges: [
          {l: '落高', v: '1.2 m · 能量 0.9 J', hl: 1},
          {l: '钢球质量', v: '156 g'},
          {l: '已击次数', v: n},
        ],
        markers: k > 0.5 ? [
          {x: 0, y: 1.5, z: -0.06, text: '电磁释放头'},
          {x: 0, y: 1.3, z: 0.1, text: '钢球 156g'},
          {x: 0, y: 0.75, z: 0.18, text: '样机固定架'},
        ] : [],
      };
    };
    return {root: body, update};
  },
};