// 按键寿命试验机：多工位下压探杆模拟指尖按压，计数按压次数
import {box, cyl, tube, group, tag, put, mat, ss} from '../_kit/kit.js';

export default {
  label: '按键寿命试验机',
  en: 'Key Pressing Life Tester',
  duration: 24,
  view: {tx: 0, ty: 0.9, tz: 0, az: 32, el: 16, d: 5.4},
  viewLabel: {side: '侧视', top: '俯视', head: '压杆近摄'},
  views: {
    side: {tx: 0, ty: 0.9, tz: 0, az: -104, el: 6, d: 4.8},
    top: {tx: 0, ty: 1.3, tz: 0, az: 12, el: 62, d: 4.6},
    head: {tx: 0, ty: 0.95, tz: 0.4, az: -165, el: 8, d: 2.2},
  },
  cues: [
    {at: 0, label: '整机待机 · 龙门压架 + 多工位压杆', view: 'hero', explode: 0, xray: 0},
    {at: 4, label: '键盘样机装于压架下方', view: 'top', explode: 0, xray: 0},
    {at: 8.5, label: '压杆往复下压 · 按压行程与力度可编程', view: 'side', explode: 0, xray: 0},
    {at: 13, label: '近摄：橡胶/金属压头接触键帽', view: 'head', explode: 0, xray: 0},
    {at: 17.5, label: '拆解：压架横梁/压杆组/样机台分离', view: 'hero', explode: 1, xray: 0},
    {at: 22, label: '运行回归', view: 'hero', explode: 0, xray: 0},
  ],
  build(K) {
    const g = K.group;
    const root = g();
    const BODY = mat('#f2f5fa', 0.5, 0.06);
    const STL = mat('#b9c4d4', 0.5, 0.2);
    const STL2 = mat('#8f9cb0', 0.42, 0.3);
    const RAIL = mat('#4a5a76', 0.4, 0.3);
    const RED = mat('#d6452f', 0.42, 0.08);
    const KEY = mat('#cbd7e8', 0.3, 0.05);

    const body = g();
    put(body, tag(box(1.6, 0.14, 1.0, BODY, 0, 0.18, 0), '台面', 'shell'));
    for (const [x, z] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) {
      put(body, tag(cyl(0.035, 0.035, 0.2, STL2, x, 0.09, z), '腿', 'inner'));
    }
    // 龙门架立柱 ×2 + 顶梁
    for (const sx of [-0.72, 0.72]) {
      put(body, tag(box(0.08, 1.0, 0.08, STL, sx, 0.9, 0), '立柱', 'inner'));
    }
    put(body, tag(box(1.6, 0.16, 0.2, STL, 0, 1.36, 0), '顶横梁', 'shell'));
    // 压杆组（横杆 + 5 根压杆）
    const press = g();
    put(press, tag(box(1.1, 0.08, 0.1, STL2, 0, 0, 0), '压臂', 'shell'));
    for (let i = 0; i < 5; i++) {
      const px = -0.44 + i * 0.22;
      put(press, tag(box(0.03, 0.42, 0.03, RED, px, -0.25, 0), '压杆' + i, 'inner'));
      put(press, tag(cyl(0.028, 0.028, 0.05, mat('#333d52', 0.3, 0.1), px, -0.47, 0), '压头' + i, 'inner'));
    }
    put(body, press);
    // 键盘样机
    const kb = g();
    put(kb, tag(box(0.9, 0.05, 0.3, KEY, 0, 0.26, 0.02), '键盘', 'inner'));
    // 键帽
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        put(kb, tag(box(0.07, 0.05, 0.06, mat('#f6f8fc', 0.35, 0.05), -0.35 + i * 0.1, 0.3, 0.03 + j * 0.09), '键帽', 'inner'));
      }
    }
    put(body, kb);
    // 控制盒
    const ctrl = g();
    put(ctrl, tag(box(0.55, 0.6, 0.36, BODY, -0.95, 0.45, 0.3), '控制盒', 'shell'));
    put(ctrl, tag(box(0.18, 0.12, 0.02, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.85}), -0.95, 0.56, 0.49), '屏幕', 'shell'));
    put(body, ctrl);

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      // 往复下压：周期 1s
      const cyc = (t % 1) / 1;
      press.position.y = 0.06 + (Math.sin(cyc * 2 * Math.PI) + 1) * 0.18 + 1.2 * k;
      // 拆解
      kb.position.x = 1.3 * k;
      ctrl.position.x = 0.9 * k;
      const n = Math.floor(t / 0.5);
      return {
        phase: `压杆以 2Hz 下压 · 键行程 0.8mm · 已完成 ${n} 次`,
        gauges: [
          {l: '按压频率', v: '2 Hz', hl: 1},
          {l: '按压次数', v: n},
          {l: '按压力', v: '克力 300g'},
        ],
        markers: k > 0.5 ? [
          {x: 0, y: 0.9, z: 0, text: '龙门压架'},
          {x: 0, y: 0.5, z: 0, text: '压杆压头'},
          {x: 0, y: 0.3, z: 0.02, text: '键盘样机'},
        ] : [],
      };
    };
    return {root: body, update};
  },
};