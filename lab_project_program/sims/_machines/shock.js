// 冷热冲击试验机（三区式）：上高温 / 下低温 / 中测试区，吊篮升降换区
import {box, cyl, tube, group, tag, put, mat, ss, lerp} from '../_kit/kit.js';

export default {
  label: '冷热冲击试验机（三区式）',
  en: 'Thermal Shock Chamber (3-zone)',
  duration: 32,
  view: {tx: 0, ty: 1.15, tz: 0, az: 30, el: 14, d: 6.8},
  viewLabel: {door: '门视', top: '俯视', basket: '测试吊篮', side: '侧视'},
  views: {
    door: {tx: 0, ty: 1.15, tz: 0, az: -170, el: 6, d: 3.6},
    top: {tx: 0, ty: 1.6, tz: 0, az: 12, el: 66, d: 5.4},
    basket: {tx: 0, ty: 1.15, tz: 0.6, az: -12, el: 4, d: 2.6},
    side: {tx: 0, ty: 1.15, tz: 0, az: -110, el: 8, d: 5.6},
  },
  cues: [
    {at: 0, label: '整机待机 · 上高温/下低温/中测试三区', view: 'hero', explode: 0, xray: 0},
    {at: 4, label: '门视：观察三区层叠布局', view: 'door', explode: 0, xray: 0},
    {at: 8, label: '测试吊篮升至高温区（150℃ 交替火替换区）', view: 'basket', explode: 0, xray: 0},
    {at: 13, label: '吊篮降至低温区（-40℃）· 冷热冲击循环', view: 'basket', explode: 0, xray: 0},
    {at: 17.5, label: '透视：三区气流隔板与加热/制冷机组', view: 'side', explode: 0, xray: 1},
    {at: 22.5, label: '拆解：外壳分层滑开，露出上加热组/下制冷组/吊篮机构', view: 'hero', explode: 1, xray: 0},
    {at: 29, label: '运行回归', view: 'hero', explode: 0, xray: 0},
  ],
  build(K) {
    const g = K.group;
    const root = g();
    const W = mat('#f7f9fd', 0.42, 0.06);
    const W2 = mat('#e8ecf4', 0.5, 0.05);
    const GRY = mat('#aab6c8', 0.48, 0.16);
    const DRK = mat('#2d3a52', 0.42, 0.22);
    const HOT = mat('#e0562f', 0.36, 0.05, {emissive: '#c7441f', emissiveIntensity: 0.4});
    const COLD = mat('#3f7cc2', 0.4, 0.08, {emissive: '#1d4fa8', emissiveIntensity: 0.35});
    const INK = mat('#dce3ef', 0.5, 0.05);
    const GLASS = mat('#cde6ff', 0.08, 0.02, {transparent: true, opacity: 0.3, depthWrite: false});

    const body = g();
    // 底座
    put(body, tag(box(1.5, 0.12, 1.5, W2, 0, 0.06, 0), '底座', 'inner'));
    for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
      put(body, tag(cyl(0.04, 0.04, 0.15, GRY, x, 0.0, z), '支脚', 'inner'));
    }
    // 外壳（三层两段）
    put(body, tag(box(1.5, 1.9, 1.4, W, 0, 1.08, 0), '外舱', 'shell'));
    // 上高温区（内里）
    put(body, tag(box(1.18, 0.6, 1.05, HOT, 0, 1.78, 0), '高温区', 'inner'));
    // 下低温区
    put(body, tag(box(1.18, 0.6, 1.05, COLD, 0, 0.36, 0), '低温区', 'inner'));
    // 中测试区（吊篮行动区）
    put(body, tag(box(1.05, 1.05, 0.95, INK, 0, 1.08, 0), '中区隔板', 'inner'));
    // 加热机组（顶部）
    put(body, tag(box(0.44, 0.3, 0.4, DRK, 0, 2.3, -0.45), '加热管组', 'inner'));
    // 制冷机组（底部）
    put(body, tag(box(0.7, 0.5, 0.55, DRK, 0.3, 0.28, -0.42), '制冷压缩机', 'inner'));
    put(body, tag(cyl(0.13, 0.13, 0.38, mat('#6b7689', 0.4, 0.35), -0.28, 0.4, -0.44), '冷媒罐', 'inner'));
    // 上取风口、下排风口
    put(body, tag(box(0.5, 0.14, 0.1, GRY, 0, 2.24, -0.67), '风机罩', 'shell'));
    // 控制屏
    put(body, tag(box(0.26, 0.5, 0.12, W2, 0.5, 2.06, 0.68), '控制面板', 'shell'));
    put(body, tag(box(0.16, 0.16, 0.02, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.9}), 0.5, 2.12, 0.75), '触摸屏', 'shell'));

    // 测试吊篮（升降换区）
    const basket = g();
    put(basket, tag(box(0.86, 0.5, 0.7, DRK, 0, 0, 0), '吊篮外框', 'inner'));
    put(basket, tag(box(0.5, 0.18, 0.6, GRY, 0, 0.14, 0.03), '样品层板', 'inner'));
    put(basket, tag(box(0.62, 0.13, 0.4, mat('#e8a33c', 0.4, 0.1), 0, -0.22, 0.03), '测试样机', 'inner'));
    put(body, basket);
    // 吊篮导轨（两条竖杆）
    for (const sx of [-0.52, 0.52]) {
      put(body, tag(tube(0.016, 1.9, GRY, sx, 1.08, -0.52), '导轨', 'inner'));
    }
    // 前门（观察窗 + 门把手，可开门）
    const doorG = g();
    doorG.position.set(0, 1.1, 0.71);
    const door = g();
    put(door, tag(box(1.44, 1.8, 0.07, W, 0, 0, 0), '门板', 'shell'));
    put(door, tag(box(1.05, 1.45, 0.03, GLASS, 0, 0, 0.045), '大观察窗', 'shell'));
    put(door, tag(box(0.5, 0.12, 0.03, GRY, 0.28, 0.72, 0.045), '门把', 'shell'));
    put(doorG, door);
    put(body, doorG);
    // 顶部盖（拆解件）
    const lid = g();
    put(lid, tag(box(1.54, 0.14, 1.44, W2, 0, 2.1, 0), '顶盖', 'shell'));
    put(body, lid);
    // 右侧板
    const rside = g();
    put(rside, tag(box(0.1, 1.9, 1.4, W, 0.77, 1.08, 0), '右侧板', 'shell'));
    put(body, rside);

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      // 吊篮高度：默认中区, 8~13s 上, 13~18s 下
      const tH = ss(t, 7.8, 9) * (1 - ss(t, 12.8, 13.8));
      const tL = ss(t, 13.2, 14.4) * (1 - ss(t, 18, 19));
      const yB = 1.08 - 0.56 * tH + 0.56 * tL;
      basket.position.y = yB - (0.56) * 0; // 已有相对位置
      // 开个小角度门（分解时门滑出）
      doorG.position.z = 0.71 + 0.5 * k;
      lid.position.y = 0.5 * k;
      rside.position.x = 0.55 * k;
      // 温度读数（上热下冷固定 + 吊篮区受冲击交变）
      const cyc = (t % 32) / 32;
      const zone = yB > 1.45 ? '高温区' : (yB < 0.75 ? '低温区' : '测试区(过渡)');
      return {
        phase: `吊篮${tH > 0.5 ? '提至高温区' : tL > 0.5 ? '降入低温区' : '位于测试区'} · 冷热冲击交变`,
        gauges: [
          {l: '测试区温度', v: (yB > 1.3 ? 150 : yB < 0.8 ? -40 : Math.round(lerp(-40, 150, (t % 8) / 8))) + ' ℃', hl: 1},
          {l: '高温区', v: '150 ℃'},
          {l: '低温区', v: '-40 ℃'},
        ],
        markers: k > 0.5 ? [
          {x: 0, y: 1.35, z: -0.45, text: '加热管组'},
          {x: 0.3, y: 0.5, z: -0.42, text: '制冷压缩机'},
          {x: 0, y: 2.2, z: -0.2, text: '风道隔板'},
        ] : [],
      };
    };
    return {root: body, update};
  },
};