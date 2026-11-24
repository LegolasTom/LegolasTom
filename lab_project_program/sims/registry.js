// 33 个实验项目 → 3D 机器 + 参考图 + 主题色
// crops: sims/img/ 下的海报裁剪参考图（页面右下"实拍"面板可切换查看）
const C = (files, cap) => files.map((file) => ({file, cap: cap || '海报实拍参考'}));

export default {
  // ---------- 气候环境 ----------
  c01: {machine: 'chamber', accent: '#35e0ff', crops: C(['page_00_img10.jpg', 'page_00_img04.jpg', 'page_00_img11.jpg', 'page_00_img02.jpg'])},
  c02: {machine: 'chamber', accent: '#35e0ff', crops: C(['page_00_img11.jpg', 'page_00_img10.jpg'])},
  c03: {machine: 'shock', accent: '#ff8a3c', crops: C(['page_01_img14.jpg', 'page_01_img15.jpg', 'page_02_img14.jpg'])},
  c04: {machine: 'chamber', accent: '#35e0ff', crops: C(['page_00_img02.jpg', 'page_00_img10.jpg'])},
  c05: {machine: 'salt', accent: '#7fd8c0', crops: C(['page_01_img14.jpg', 'page_01_img15.jpg', 'page_00_img04.jpg'])},
  // ---------- 机械环境 ----------
  m01: {machine: 'barrel', accent: '#e8892f', crops: C(['page_01_img14.jpg', 'page_01_img15.jpg'])},
  m02: {machine: 'drop', accent: '#4f8cff', crops: C(['page_01_img15.jpg', 'page_01_img14.jpg'])},
  m03: {machine: 'drop', accent: '#4f8cff', crops: C(['page_01_img14.jpg', 'page_01_img15.jpg'])},
  m04: {machine: 'cable', accent: '#9b7bff', crops: C(['page_02_img14.jpg', 'page_03_img15.jpg', 'page_03_img08.jpg'])},
  m05: {machine: 'ball', accent: '#ff6b6b', crops: C(['page_02_img14.jpg', 'page_03_img15.jpg'])},
  m06: {machine: 'key', accent: '#ffc75f', crops: C(['page_03_img08.jpg', 'page_02_img08.jpg'])},
  m07: {machine: 'card', accent: '#53e0a0', crops: C(['page_03_img06.jpg', 'page_02_img06.jpg'])},
  m08: {machine: 'insert', accent: '#6dd5ff', crops: C(['page_03_img06.jpg', 'page_02_img06.jpg'])},
  m09: {machine: 'pencil', accent: '#f0a35e', crops: C(['page_03_img15.jpg', 'page_03_img08.jpg'])},
  m10: {machine: 'abrasion', accent: '#c98bff', crops: C(['page_03_img14.jpg', 'page_03_img08.jpg'])},
  m11: {machine: 'vib', accent: '#ff9d4d', crops: C(['page_03_img14.jpg', 'page_03_img15.jpg'])},
  m12: {machine: 'tensile', accent: '#7cc4ff', crops: C(['page_03_img15.jpg', 'page_03_img14.jpg'])},
  // ---------- 电磁兼容 ----------
  e01: {machine: 'esd', accent: '#ffb347', crops: C(['page_02_img14.jpg', 'page_02_img15.jpg', 'page_02_img08.jpg', 'page_02_img06.jpg'])},
  e02: {machine: 'surge', accent: '#ff8f6b', crops: C(['page_07_img14.jpg', 'page_07_img10.jpg', 'page_07_img08.jpg'])},
  e03: {machine: 'eft', accent: '#ffd166', crops: C(['page_09_img14.jpg', 'page_09_img10.jpg', 'page_09_img08.jpg'])},
  e04: {machine: 'conducted', accent: '#7fd8ff', crops: C(['page_08_img10.jpg', 'page_08_img04.jpg', 'page_08_img06.jpg'])},
  // ---------- 电池 ----------
  p01: {machine: 'battery', accent: '#5be08a', crops: C(['page_04_img04.jpg', 'page_04_img06.jpg', 'page_04_img10.jpg', 'page_04_img02.jpg'])},
  p02: {machine: 'chamber', accent: '#ff7f5f', crops: C(['page_04_img06.jpg', 'page_04_img04.jpg']), facts: {mode: 'oven', tMin: 0, tMax: 250}},
  // ---------- 射频 / NFC / OTA ----------
  r01: {machine: 'nfc', accent: '#4da6ff', crops: C(['page_05_img10.jpg', 'page_05_img08.jpg', 'page_05_img06.jpg', 'page_05_img04.jpg'])},
  r02: {machine: 'ota', accent: '#6fb1ff', crops: C(['page_06_img10.jpg', 'page_06_img06.jpg', 'page_06_img08.jpg', 'page_06_img04.jpg'])},
  r03: {machine: 'nfc', accent: '#4da6ff', crops: C(['page_05_img08.jpg', 'page_05_img10.jpg'])},
  // ---------- 声学 ----------
  a01: {machine: 'acoustic', accent: '#9be05b', crops: C(['page_01_img06.jpg', 'page_01_img08.jpg'])},
  a02: {machine: 'acoustic', accent: '#9be05b', crops: C(['page_01_img08.jpg', 'page_01_img06.jpg'])},
  // ---------- 自动化 ----------
  b01: {machine: 'scanrobot', accent: '#ff8ab8', crops: C(['page_03_img14.jpg', 'page_01_img06.jpg'])},
  b02: {machine: 'lightbox', accent: '#ffe08a', crops: C(['page_01_img08.jpg', 'page_01_img06.jpg'])},
  b03: {machine: 'pressrobot', accent: '#ff9aa2', crops: C(['page_03_img14.jpg', 'page_03_img15.jpg'])},
  // ---------- 失效分析 ----------
  f01: {machine: 'microscope', accent: '#a5b8ff', crops: C(['page_01_img15.jpg', 'page_01_img14.jpg'])},
  f02: {machine: 'microscope', accent: '#a5b8ff', crops: C(['page_01_img14.jpg', 'page_01_img15.jpg'])},
};