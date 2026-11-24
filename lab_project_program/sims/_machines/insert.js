// IC 芯片插拔力试验机：龙门直线气缸驱动 IC 在测试插座中反复自动插拔，测力传感器实时采样
import {box, cyl, tube, group, tag, put, mat, ss, lerp} from '../_kit/kit.js';

export default {
  label: 'IC 芯片插拔力试验机',
  en: 'IC Insertion/Extraction Force Tester',
  duration: 26,
  view: {tx: 0, ty: 0.55, tz: 0, az: 32, el: 12, d: 4.2},
  viewLabel: {side: '侧视', top: '俯视', head: '近摄'},
  views: {
    side: {tx: 0, ty: 0.55, tz: 0, az: -98, el: 6, d: 3.6},
    top: {tx: 0, ty: 0.7, tz: 0, az: 14, el: 64, d: 3.0},
    head: {tx: 0, ty: 0.45, tz: -0.1, az: 0, el: -4, d: 1.5},
  },
  cues: [
    {at: 0, label: '整机待机 · 龙门插拔机构就位', view: 'hero', explode: 0, xray: 0},
    {at: 4.5, label: '近摄：IC 夹爪对准测试插座', view: 'head', explode: 0, xray: 0},
    {at: 8.5, label: '自动插拔循环 · 插拔力实时采样', view: 'hero', explode: 0, xray: 0},
    {at: 12.5, label: '透视外壳 · 气缸活塞与测力传感器可见', view: 'hero', explode: 0, xray: 1},
    {at: 16.5, label: '拆解：龙门架/插拔头/插座/控制盒分离', view: 'hero', explode: 1, xray: 0},
    {at: 21.5, label: '侧视 · 直线气缸—夹爪—插座传动链', view: 'side', explode: 1, xray: 0},
    {at: 24, label: '运行回归', view: 'hero', explode: 0, xray: 0},
  ],
  build(K) {
    const g = K.group;
    const root = g();
    const WHT = mat('#f7f9fd', 0.4, 0.06);
    const WHT2 = mat('#e8ecf4', 0.5, 0.05);
    const GRY = mat('#aab6c8', 0.5, 0.16);
    const STL = mat('#8f9cb0', 0.42, 0.3);
    const DRK = mat('#2d3a52', 0.42, 0.22);
    const RED = mat('#d6452f', 0.42, 0.08);
    const SCR = mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.9});

    // ---- 底座 ----
    put(root, tag(box(1.0, 0.1, 0.7, WHT2, 0, 0.05, 0), '底座', 'shell'));
    for (const [x, z] of [[-0.42, -0.26], [0.42, -0.26], [-0.42, 0.26], [0.42, 0.26]]) {
      put(root, tag(cyl(0.028, 0.028, 0.06, STL, x, 0.0, z), '支脚', 'inner'));
    }
    // 测试插座（方座 + 弹片座）+ 测力传感座
    put(root, tag(box(0.13, 0.05, 0.12, GRY, 0, 0.15, -0.1), '测试插座', 'inner'));
    put(root, tag(box(0.13, 0.02, 0.12, mat('#c9b36a', 0.4, 0.2), 0, 0.185, -0.1), '插座弹片', 'inner'));
    put(root, tag(box(0.18, 0.02, 0.16, WHT, 0, 0.108, -0.1), '传感器底座', 'inner'));

    // ---- 龙门架（立柱 + 顶梁 + 气缸缸体，独立拆解件） ----
    const gantry = g();
    put(gantry, tag(box(0.09, 0.85, 0.09, WHT, -0.34, 0.45, 0), '立柱', 'shell'));
    put(gantry, tag(box(0.09, 0.85, 0.09, WHT, 0.34, 0.45, 0), '立柱', 'shell'));
    put(gantry, tag(box(0.86, 0.1, 0.16, WHT, 0, 0.9, 0), '顶梁', 'shell'));
    put(gantry, tag(cyl(0.055, 0.055, 0.42, GRY, 0, 0.66, 0), '直线气缸', 'inner'));
    put(gantry, tag(cyl(0.06, 0.06, 0.08, STL, 0, 0.9, 0), '气缸端盖', 'inner'));
    put(root, gantry);

    // ---- 插拔头（活塞杆 + 传感器 + 夹爪 + IC，独立运动/拆解件） ----
    const head = g();
    put(head, tag(tube(0.014, 0.46, STL, 0, 0, 0), '活塞杆', 'inner'));
    put(head, tag(box(0.09, 0.06, 0.07, RED, 0, -0.26, 0), '测力传感器', 'inner'));
    put(head, tag(box(0.05, 0.09, 0.03, GRY, -0.03, -0.34, 0), '夹爪', 'inner'));
    put(head, tag(box(0.05, 0.09, 0.03, GRY, 0.03, -0.34, 0), '夹爪', 'inner'));
    put(head, tag(box(0.07, 0.014, 0.07, DRK, 0, -0.395, 0), 'IC 样片', 'inner'));
    put(head, tag(box(0.05, 0.004, 0.05, mat('#cbd7e8', 0.2, 0.1), 0, -0.403, 0), '芯片封装面', 'inner'));
    put(root, head);

    // ---- 控制盒（数码屏 + 指示灯 + 计数器） ----
    const ctrl = g();
    put(ctrl, tag(box(0.32, 0.46, 0.24, WHT2, 0, 0, 0), '控制盒', 'shell'));
    put(ctrl, tag(box(0.16, 0.12, 0.02, SCR, 0, 0.1, 0.13), '数码屏', 'shell'));
    put(ctrl, tag(cyl(0.012, 0.012, 0.008, mat('#35c48c'), 0, 0.0, 0.13), '指示灯', 'shell'));
    put(ctrl, tag(cyl(0.012, 0.012, 0.008, mat('#e3562a'), -0.07, 0.0, 0.13), '指示灯', 'shell'));
    put(ctrl, tag(cyl(0.012, 0.012, 0.008, mat('#e3562a'), 0.07, 0.0, 0.13), '指示灯', 'shell'));
    put(ctrl, tag(cyl(0.04, 0.04, 0.03, GRY, 0, -0.17, 0.13), '旋钮', 'shell'));
    ctrl.position.set(0.38, 0.33, 0.12);
    put(root, ctrl);

    // 周期 1.5s：下插(0~0.3) 保持测力(0.3~0.5) 拔起(0.5~0.8) 悬停(0.8~1.0)
    const headY = (cyc) => {
      if (cyc < 0.3) return lerp(0.905, 0.77, ss(0, 0.3, cyc));
      if (cyc < 0.5) return 0.77;
      if (cyc < 0.8) return lerp(0.77, 0.905, ss(0.5, 0.8, cyc));
      return 0.905;
    };

    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      const cyc = (t % 1.5) / 1.5;
      const y = headY(cyc);
      head.position.y = y + 0.42 * k;   // 拆解：插拔头组上提
      head.position.x = 1.05 * k;       // 拆解：向 +x 移出
      gantry.position.x = 0.6 * k;      // 拆解：龙门向右平移
      ctrl.position.x = 0.38 + 0.62 * k; // 拆解：控制盒继续外移
      const inserted = y < 0.8;
      const count = Math.floor(t / 1.5);
      return {
        phase: !inserted && cyc < 0.5 ? '插入 · 测接触电阻' : (inserted ? '保持测力 · 接触电阻采样' : (cyc > 0.8 ? 'IC 悬停' : '拔起 · 监测拔出力')),
        gauges: [
          {l: '插拔力', v: inserted ? '15.2 N' : '0.4 N', hl: inserted ? 1 : 0},
          {l: '插拔次数', v: count + ' 次'},
          {l: '接触电阻', v: inserted ? '28 mΩ' : '∞', hl: inserted ? 2 : 0},
        ],
        markers: k > 0.55 ? [
          {x: 0, y: 0.7, z: 0, text: '直线气缸'},
          {x: 0, y: 0.42, z: 0, text: '测力传感器'},
          {x: 0, y: 0.3, z: 0, text: '夹爪 · IC 样片'},
          {x: 0, y: 0.18, z: -0.1, text: '测试插座'},
        ] : [],
      };
    };
    return {root, update};
  },
};