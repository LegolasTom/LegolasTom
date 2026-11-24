// 六角滚筒跌落试验机：滚筒匀速翻转，样机反复自由跌落；带计数器
import {box, cyl, tube, group, tag, put, mat, ss, disc, sph} from '../_kit/kit.js';

export default {
  label: '滚筒跌落试验机（六角）',
  en: 'Rotating Barrel Drop Tester',
  duration: 26,
  view: {tx: 0, ty: 0.9, tz: 0, az: 34, el: 14, d: 5.6},
  viewLabel: {side: '侧视', top: '俯视', drum: '滚筒近摄'},
  views: {
    side: {tx: 0, ty: 0.9, tz: 0, az: -106, el: 6, d: 5.0},
    top: {tx: 0, ty: 1.2, tz: 0, az: 12, el: 62, d: 5.0},
    drum: {tx: 0, ty: 0.95, tz: 0.1, az: -158, el: 4, d: 2.4},
  },
  cues: [
    {at: 0, label: '整机待机 · 六角滚筒 + 电机机架', view: 'hero', explode: 0, xray: 0},
    {at: 4, label: '装入样机 · 密封装载口', view: 'drum', explode: 0, xray: 0},
    {at: 8, label: '测试中：滚筒 5~20 转/分翻转，样机重力跌落撞击筒壁', view: 'side', explode: 0, xray: 0},
    {at: 13, label: '近摄观察样机翻滚轨迹', view: 'drum', explode: 0, xray: 0},
    {at: 17.5, label: '透视筒壁 · 内部肋板与样机碎片', view: 'drum', explode: 0, xray: 1},
    {at: 21.5, label: '拆解：筒体两半滑开 / 机架分离 / 电机可见', view: 'hero', explode: 1, xray: 0},
    {at: 25, label: '运行回归', view: 'hero', explode: 0, xray: 0},
  ],
  build(K) {
    const g = K.group;
    const root = g();
    const FRAME = mat('#2d3a52', 0.4, 0.25);
    const DRY = mat('#f2f4f9', 0.45, 0.08);
    const DRU = mat('#e8892f', 0.4, 0.12);
    const ACC = mat('#e8a33c', 0.4, 0.1);
    const MT = mat('#8f9cb0', 0.42, 0.3);
    const WP = mat('#dfe4ee', 0.4, 0.05);

    // 机架
    const body = g();
    put(body, tag(box(2.3, 0.14, 0.9, WP, 0, 0.34, 0), '台面', 'shell'));
    for (const [x, z] of [[-1.0, -0.3], [1.0, -0.3], [-1.0, 0.3], [1.0, 0.3]]) {
      put(body, tag(cyl(0.045, 0.045, 0.34, FRAME, x, 0.17, z), '腿', 'inner'));
    }
    // 立架（左右 A 柱）
    for (const sx of [-1.06, 1.06]) {
      put(body, tag(box(0.09, 1.15, 0.09, FRAME, sx, 0.96, 0), '立柱', 'shell'));
    }
    // 电机（右侧）
    put(body, tag(cyl(0.22, 0.22, 0.3, MT, 1.06, 0.78, 0.9), '驱动电机', 'inner'));
    put(body, tag(cyl(0.05, 0.05, 0.18, MT, 1.06, 0.78, 1.06), '减速箱', 'inner'));
    // 控制盒
    const ctrl = g();
    put(ctrl, tag(box(0.5, 0.5, 0.3, WP, -0.95, 0.7, 0.55), '控制盒', 'shell'));
    put(ctrl, tag(box(0.18, 0.12, 0.02, mat('#0e2b57', 0.1, 0.1, {emissive: '#1d4fa8', emissiveIntensity: 0.8}), -0.95, 0.78, 0.72), '数码管', 'shell'));
    put(ctrl, tag(cyl(0.02, 0.02, 0.02, mat('#35c48c'), -1.02, 0.6, 0.68), '状态灯', 'shell'));
    put(body, ctrl);

    // 滚筒（六角筒体：横截面在 YZ 平面、轴沿 X；筒心在组原点，组整体抬高到 y=0.4）
    const drum = g();
    drum.position.set(0, 0.4, 0);
    const RAD = 0.78;                          // 六角外接圆半径
    const RF = RAD * Math.cos(Math.PI / 6);    // 六角内切圆半径（侧板中心距）
    for (let i = 0; i < 6; i++) {
      const th = i * Math.PI / 3;
      const pane = box(1.28, RAD, 0.02, DRU);
      pane.position.set(0, Math.sin(th) * RF, Math.cos(th) * RF);
      pane.rotation.x = -th; // 薄边朝筒心，法向沿径向
      put(drum, tag(pane, '筒板' + i, 'shell'));
    }
    // 内部样机（随翻转在筒内翻滚）
    put(drum, tag(box(0.24, 0.16, 0.26, ACC, 0, 0, 0), '被测样机', 'inner'));
    // 端盖门（一侧带装载口）
    const door2 = g();
    put(door2, tag(disc(0.7, WP, 0, 0, 0.66), '端盖', 'shell'));
    put(door2, tag(cyl(0.16, 0.16, 0.06, FRAME, 0, 0, 0.74), '装载口', 'shell'));
    put(door2, tag(box(0.06, 0.14, 0.06, mat('#e8892f'), 0.26, -0.1, 0.67), '锁扣', 'shell'));
    put(drum, door2);
    // 远端固定端盖
    put(drum, tag(disc(0.7, WP, 0, 0, -0.66), '端盖平盘', 'shell'));
    // 转轴（贯通筒心，由减速箱驱动）
    put(body, tag(cyl(0.03, 0.03, 2.3, MT, 0, 0.4, 0, 0, 24), '转轴', 'inner'));
    put(body, drum);

    // 计数器
    let cnt = 0;
    const update = (t) => {
      const e = window.SIM_EXPLODE || 0;
      const k = Math.min(1, Math.max(0, e));
      const spin = (t % 26) / 26;
      drum.rotation.x = spin * Math.PI * 5;
      // 内部样机在筒内翻滚（绕筒心公转 + 自转）
      cnt = Math.floor(t / 0.8);
      // 拆解：筒体右移、端盖滑出、控制盒滑出（绝对位置，防漂移）
      drum.position.x = 1.7 * k;
      door2.position.x = 0.4 * k;
      ctrl.position.x = 0.6 * k;
      ctrl.position.y = 0.5 * k;
      return {
        phase: `滚筒翻转中 · 样机跌撞 ${cnt} 次`,
        gauges: [
          {l: '转速', v: '10 转/min', hl: 1},
          {l: '跌撞次数', v: cnt},
          {l: '样品状态', v: '外观/结构检查'},
        ],
        markers: k > 0.5 ? [
          {x: 1.06, y: 0.78, z: 0.9, text: '驱动电机'},
          {x: 0.3, y: 0.3, z: 0.2, text: '六角筒体'},
          {x: -0.95, y: 0.7, z: 0.55, text: '控制盒'},
        ] : [],
      };
    };
    return {root: body, update};
  },
};