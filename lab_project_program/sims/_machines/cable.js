// 线缆弯折试验机：摆动臂夹持线缆往复弯折，计数弯折次数
import {box, cyl, tube, group, tag, put, mat, ss} from '../_kit/kit.js';

export default {
  label: '线材弯折试验机',
  en: 'Cable Flexing Tester',
  duration: 24,
  view: {tx: 0, ty: 0.85, tz: 0, az: 34, el: 15, d: 5.2},
  viewLabel: {side: '侧视', top: '俯视', head: '弯折机构'},
  views: {
    side: {tx: 0, ty: 0.85, tz: 0, az: -102, el: 6, d: 4.6},
    top: {tx: 0, ty: 1.2, tz: 0, az: 12, el: 62, d: 4.8},
    head: {tx: 0, ty: 0.9, tz: 0.3, az: -165, el: 8, d: 2.4},
  },
  cues: [
    {at: 0, label: '整机待机 · 弯折头 + 砝码端', view: 'hero', explode: 0, xray: 0},
    {at: 4, label: '线缆一端夹于弯折夹具，另一端挂砝码张紧', view: 'head', explode: 0, xray: 0},
    {at: 8.5, label: '弯折头 ±90° 往复摆动 · 测试蛇弯半径处内芯', view: 'side', explode: 0, xray: 0},
    {at: 13, label: '近摄：弯折端口弯曲半径与摇摆角', view: 'head', explode: 0, xray: 0},
    {at: 17.5, label: '拆解：摆动臂/夹具/砝码盘分离', view: 'hero', explode: 1, xray: 0},
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
    const CBL = mat('#e8a33c', 0.55, 0.02);

    const body = g();
    // 底座台面
    put(body, tag(box(1.9, 0.12, 0.9, BODY, 0, 0.16, 0), '台面', 'shell'));
    for (const [x, z] of [[-0.85, -0.32], [0.85, -0.32], [-0.85, 0.32], [0.85, 0.32]]) {
      put(body, tag(cyl(0.03, 0.03, 0.17, STL2, x, 0.08, z), '腿', 'inner'));
    }
    // 弯折机构立柱
    put(body, tag(box(0.24, 0.5, 0.24, STL, 0, 0.5, 0.0), '弯折立柱', 'shell'));
    // 弯折头（摆动臂）
    const head = g();
    const pivot = g();
    put(pivot, tag(cyl(0.05, 0.05, 0.3, RAIL, 0, 0.88, 0, 0, 20), '枢轴', 'inner'));
    put(pivot, tag(box(0.06, 0.5, 0.34, RED, 0, 0.62, 0), '摆臂', 'shell'));
    put(pivot, tag(box(0.34, 0.1, 0.08, STL2, 0, 0.4, 0.0), '线夹', 'shell'));
    put(head, pivot);
    put(body, head);
    // 夹具端（固定线缆尾）
    put(body, tag(box(0.26, 0.18, 0.12, STL2, 0.62, 0.42, 0.0), '尾夹', 'inner'));
    // 线缆（从摆臂线夹到尾夹）
    const wire = g();
    put(wire, tag(box(0.8, 0.012, 0.012, CBL, 0.32, 0.35, 0.0, 0), '线缆段', 'inner'));
    put(body, wire);
    // 砝码加载端（右端滑轮 + 砝码盘）
    put(body, tag(cyl(0.1, 0.1, 0.05, STL2, 0.9, 0.55, 0.0, 0, 24), '导向轮', 'inner'));
    put(body, tag(cyl(0.08, 0.08, 0.04, RED, 0.9, 0.42, 0.0, 0, 24), '夹持轮', 'inner'));
    const wgt = g();
    for (let i = 0; i < 3; i++) {
      put(wgt, tag(cyl(0.14, 0.12, 0.06, STL2, 0.9, 0.18 - i * 0.07, 0.22), '砝码' + i, 'inner'));
    }
    put(body, wgt);
    // 控制盒
    const ctrl = g();
    put(ctrl, tag(box(0.5, 0.5, 0.28, BODY, -0.8, 0.5, 0.4), '控制盒', 'shell'));
    put(ctrl, tag(box(0.16, 0.12, 0.02, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.85}), -0.8, 0.6, 0.55), '屏幕', 'shell'));
    put(body, ctrl);

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      // 摆动：±85°，周期 2.2s
      const sw = Math.sin(((t % 2.2) / 2.2) * Math.PI * 2);
      pivot.rotation.z = sw * 1.35;
      wire.rotation.z = -pivot.rotation.z * 0.55;
      wire.position.x = 0.3;
      const n = Math.floor(t / 1.1);
      // 拆解滑出
      head.position.x = 1.4 * k;
      ctrl.position.x = -0.7 * k;
      wgt.position.y = 0.5 * k;
      return {
        phase: `弯折头 ±90° 摆动中 · 完成 ${n} 次弯折`,
        gauges: [
          {l: '弯折角', v: '±90°', hl: 1},
          {l: '弯折次数', v: n},
          {l: '张紧砝码', v: '500 g'},
        ],
        markers: k > 0.5 ? [
          {x: 0, y: 0.85, z: 0, text: '弯折摆臂'},
          {x: 0.9, y: 0.5, z: 0, text: '砝码张紧端'},
          {x: 0.62, y: 0.45, z: 0, text: '线缆样件'},
        ] : [],
      };
    };
    return {root: body, update};
  },
};