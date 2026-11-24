// 循环/重复跌落试验机：提升—释放—跌落到刚性台面；包装落下模式变体
import {box, cyl, tube, group, tag, put, mat, ss, lerp} from '../_kit/kit.js';

export default {
  label: '重复跌落试验机',
  en: 'Repeated Drop Tester',
  duration: 26,
  view: {tx: 0, ty: 1.4, tz: 0, az: 30, el: 16, d: 6.8},
  viewLabel: {side: '侧视', lift: '提升机构', bottom: '跌落台面'},
  views: {
    side: {tx: 0, ty: 1.4, tz: 0, az: -108, el: 8, d: 6.2},
    lift: {tx: 0, ty: 1.6, tz: 0.4, az: -160, el: 6, d: 2.8},
    bottom: {tx: 0, ty: 0.5, tz: 0, az: 20, el: 34, d: 3.4},
  },
  cues: [
    {at: 0, label: '整机待机 · 立柱式跌落塔 + 刚性台面', view: 'hero', explode: 0, xray: 0},
    {at: 4, label: '样机装于载物台，气动抱爪夹持', view: 'lift', explode: 0, xray: 0},
    {at: 8.5, label: '载物台沿导轨提升至设定高度', view: 'side', explode: 0, xray: 0},
    {at: 12.5, label: '释放！样机自由跌落砸向钢板（冲击脉冲）', view: 'hero', explode: 0, xray: 0},
    {at: 17, label: '循环重复：500 次/50cm 标准跌落断面', view: 'side', explode: 0, xray: 0},
    {at: 21, label: '拆解：立柱导轨/举升气缸/台面/控制箱分离', view: 'hero', explode: 1, xray: 0},
    {at: 25, label: '运行回归', view: 'hero', explode: 0, xray: 0},
  ],
  build(K) {
    const g = K.group;
    const root = g();
    const STL = mat('#b9c4d4', 0.5, 0.2);
    const STL2 = mat('#8f9cb0', 0.42, 0.3);
    const RAIL = mat('#4a5a76', 0.4, 0.3);
    const WP = mat('#f2f5fa', 0.5, 0.06);
    const RED = mat('#d6452f', 0.42, 0.08);
    const CARD = mat('#d9a15c', 0.55, 0.02);

    // 底盘台面（厚钢板）
    const body = g();
    put(body, tag(box(1.6, 0.2, 1.2, STL, 0, 0.28, 0), '跌落台面', 'shell'));
    // 台面限位围挡（跌落后样机不离台）
    for (const [dx, dz] of [[-0.62, 0], [0.62, 0], [0, -0.48], [0, 0.48]]) {
      put(body, tag(box(0.06, 0.1, 1.04, STL2, dx, 0.34, dz, 0), '限位挡', 'inner'));
    }
    // 立柱导轨 ×2
    for (const sx of [-0.55, 0.55]) {
      put(body, tag(box(0.07, 2.5, 0.07, RAIL, sx, 1.25, -0.1), '导轨柱', 'shell'));
    }
    // 顶部横梁
    put(body, tag(box(1.3, 0.14, 0.5, WP, 0, 2.5, -0.1), '顶横梁', 'shell'));
    // 举升气缸（中间）
    put(body, tag(cyl(0.07, 0.07, 1.9, STL2, 0, 1.25, -0.22), '举升柱', 'inner'));
    // 载物台（被抓取机构）
    const car = g();
    put(car, tag(box(0.6, 0.08, 0.6, WP, 0, 0, 0), '载物台', 'inner'));
    put(car, tag(cyl(0.05, 0.05, 0.1, STL2, -0.12, 0.05, 0.0), '旋柄', 'inner'));
    put(body, car);
    // 被测样机（在载物台上）
    const dut = g();
    put(dut, tag(box(0.4, 0.1, 0.5, CARD, 0, 0.07, -0.15), '包装样机', 'inner'));
    put(dut, tag(box(0.4, 0.1, 0.5, mat('#e8ecf4', 0.5, 0.05), 0, 0.02, -0.15), '纸箱', 'inner'));
    put(body, dut);
    // 落地缓冲垫（台面上）
    put(body, tag(box(1.3, 0.05, 1.0, mat('#d8dedf', 0.8, 0.02), 0, 0.335, 0), '缓冲垫', 'inner'));
    // 控制箱
    const ctrl = g();
    put(ctrl, tag(box(0.7, 0.9, 0.6, WP, -1.15, 0.65, 0.35), '控制箱', 'shell'));
    put(ctrl, tag(box(0.22, 0.16, 0.02, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.85}), -1.15, 0.8, 0.66), '屏幕', 'shell'));
    put(body, ctrl);
    // 高度标尺
    put(body, tag(box(0.02, 2.2, 0.02, STL2, -0.85, 1.1, 0.5), '标尺', 'inner'));

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      // 周期：提升(0~0.4) → 悬停(0.4~0.5) → 跌落(0.5~0.62) → 触底(pulse) → 复位
      const cyc = (t % 6) / 6;
      let y = 0;
      if (cyc < 0.42) y = (cyc / 0.42);
      else if (cyc < 0.52) y = 1;
      else if (cyc < 0.64) y = 1 - (cyc - 0.52) / 0.12;
      else y = 0;
      const h = 1.55;
      const yM = y * h;
      car.position.y = yM;
      dut.position.y = yM + 0.08;
      const impact = ss(cyc, 0.63, 0.68);
      // 触底瞬间台面微弹
      body.children.forEach((c) => {
        if (c.userData.name === '跌落台面') c.position.y = 0.28 + impact * 0.02 * Math.sin((cyc - 0.63) * 90) * Math.max(0, 1 - (cyc - 0.63) * 12);
      });
      const cnt = Math.floor(t / 6);
      return {
        phase: y > 0.9 ? '样机已提升至 500mm · 待释放' : (y > 0 ? '提升中…' : '样机跌落实测 · 冲击脉冲采集'),
        gauges: [
          {l: '设定高度', v: '500 mm', hl: 1},
          {l: '已跌次数', v: cnt},
          {l: '冲击波形', v: y > 0 ? '—' : '半正弦 6ms'},
        ],
        markers: k > 0.5 ? [
          {x: 0, y: 2.0, z: -0.22, text: '举升气缸'},
          {x: 0, y: 0.35, z: 0, text: '刚性台面'},
          {x: -1.15, y: 0.8, z: 0.35, text: '控制箱'},
        ] : [],
      };
    };
    return {root: body, update};
  },
};