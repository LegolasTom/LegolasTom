// 刷卡寿命试验机：滑座带动真实磁卡样卡往复插拔/刷过读卡器
import {box, cyl, tube, group, tag, put, mat, ss} from '../_kit/kit.js';

export default {
  label: '刷卡寿命试验机',
  en: 'Magnetic Card Swiping Tester',
  duration: 24,
  view: {tx: 0, ty: 0.9, tz: 0, az: 32, el: 15, d: 5.2},
  viewLabel: {side: '侧视', top: '俯视', head: '刷卡位近摄'},
  views: {
    side: {tx: 0, ty: 0.9, tz: 0, az: -104, el: 6, d: 4.6},
    top: {tx: 0, ty: 1.25, tz: 0, az: 12, el: 62, d: 4.6},
    head: {tx: 0, ty: 0.95, tz: 0.1, az: -165, el: 8, d: 2.0},
  },
  cues: [
    {at: 0, label: '整机待机 · 直线滑轨 + 读卡导向槽', view: 'hero', explode: 0, xray: 0},
    {at: 4, label: '磁卡样卡装入滑座压卡板', view: 'head', explode: 0, xray: 0},
    {at: 8.5, label: '滑座沿导轨往复刷过读卡磁头', view: 'side', explode: 0, xray: 0},
    {at: 13, label: '当前位置：卡片通过卡槽·磁道磨损监测', view: 'head', explode: 0, xray: 0},
    {at: 17.5, label: '拆解：滑座/导轨/读卡座/控制盒分离', view: 'hero', explode: 1, xray: 0},
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
    const CARD = mat('#e8ecf4', 0.4, 0.05, {});
    const MAG = mat('#202b40', 0.35, 0.1);

    const body = g();
    put(body, tag(box(1.9, 0.14, 1.0, BODY, 0, 0.18, 0), '台面', 'shell'));
    for (const [x, z] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]]) {
      put(body, tag(cyl(0.035, 0.035, 0.2, STL2, x, 0.09, z), '腿', 'inner'));
    }
    // 直线导轨（沿 X）
    put(body, tag(box(1.5, 0.05, 0.12, RAIL, 0, 0.26, 0), '导轨', 'shell'));
    // 读卡导向座（中间）
    const read = g();
    put(read, tag(box(0.5, 0.28, 0.4, STL, 0, 0.34, 0), '读卡座', 'shell'));
    put(read, tag(box(0.44, 0.12, 0.5, MAG, 0, 0.34, 0), '读卡器本体', 'inner'));
    put(read, tag(box(0.02, 0.05, 0.3, mat('#ffd9d0'), 0.24, 0.42, 0), '磁头缝隙', 'inner'));
    put(body, read);
    // 滑座 + 卡
    const carriage = g();
    put(carriage, tag(box(0.34, 0.1, 0.24, STL2, 0, 0.16, 0.3), '滑座', 'shell'));
    put(carriage, tag(box(0.86, 0.02, 0.55, CARD, 0, 0.12, 0.3), '磁卡', 'inner'));
    put(carriage, tag(box(0.86, 0.006, 0.04, MAG, 0, 0.135, 0.3), '磁条', 'inner'));
    put(carriage, tag(box(0.9, 0.05, 0.02, mat('#8892a8'), 0, 0.18, 0.06), '压卡板', 'shell'));
    put(body, carriage);
    // 控制盒
    const ctrl = g();
    put(ctrl, tag(box(0.55, 0.62, 0.36, BODY, -0.95, 0.45, 0.34), '控制盒', 'shell'));
    put(ctrl, tag(box(0.18, 0.12, 0.02, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.85}), -0.95, 0.56, 0.53), '屏幕', 'shell'));
    put(body, ctrl);
    // 红外计数探头
    put(body, tag(cyl(0.015, 0.015, 0.1, mat('#35c48c'), 0.62, 0.4, 0.34, 0, 0), {kind: 'inner'}));

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      // 往复 1.4s 周期，行程 ±0.62
      const cyc = (t % 1.4) / 1.4;
      const X = Math.sin(cyc * 2 * Math.PI) * 0.62;
      carriage.position.x = X;
      carriage.rotation.y = Math.sin(cyc * Math.PI * 2) * 0.03;
      // 拆解
      carriage.position.y = k * 0.55;
      carriage.position.z = 0.3 + k * 0.9;
      read.position.x = -1.2 * k;
      ctrl.position.x = 0.9 * k;
      const n = Math.floor(t / 0.7);
      return {
        phase: `滑座往复刷卡 · 磁道 1/2/3 磨损累计 ${n} 次`,
        gauges: [
          {l: '刷速', v: '100 次/分', hl: 1},
          {l: '刷卡次数', v: n},
          {l: '磁道状态', v: 'T1/T2 正常'},
        ],
        markers: k > 0.5 ? [
          {x: 0, y: 0.4, z: 0, text: '读卡磁头'},
          {x: 0, y: 0.2, z: 0.3, text: '磁卡样卡'},
          {x: 0, y: 0.3, z: 0.05, text: '直线导轨'},
        ] : [],
      };
    };
    return {root: body, update};
  },
};