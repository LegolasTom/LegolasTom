# -*- coding: utf-8 -*-
"""生成 teardown 页面英文版支持：
1) 写出 dist/i18n-en.js（中英词表 + 运行时文本替换）
2) 给 28 个 html 注入 <script src="./i18n-en.js">
3) 校验：应用词表后不应残留中文（文件名除外）
"""
import glob
import json
import os
import re

DIST = r"e:\pythonProject\temp_20261102_01\_work\teardown-out\dist"
CJK = re.compile(r"[\u4e00-\u9fff]")

DEVICES = {
    "IC卡插拔试验": "IC Card Insertion Tester",
    "NFC协议兼容性测试": "NFC Protocol Compatibility",
    "万能拉伸试验": "Universal Tensile Tester",
    "冷热冲击试验": "Thermal Shock Chamber",
    "刷卡寿命试验": "Card Swipe Life Tester",
    "包装落下试验": "Package Drop Tester",
    "扫码机器人测试": "Scan Robot Test Cell",
    "扬声器声学测试": "Speaker Acoustic Test",
    "按键寿命试验": "Key Life Tester",
    "摩擦试验": "Friction / Abrasion Tester",
    "整机压力测试": "Whole-Device Press Test",
    "染色渗透分析": "Dye Penetrant Analysis",
    "温度循环试验": "Thermal Cycling Chamber",
    "湿热试验": "Humidity Chamber",
    "滚筒跌落试验": "Tumbling Drop Tester",
    "盐雾试验": "Salt Spray Chamber",
    "线缆弯折试验": "Cable Bend Tester",
    "落球冲击试验": "Ball Drop Impact Tester",
    "重复跌落试验": "Repeated Drop Tester",
    "铅笔硬度试验": "Pencil Hardness Tester",
    "雷击浪涌试验": "Surge Immunity Tester",
    "静电放电抗扰度试验": "ESD Immunity Tester",
    "高低温试验": "High–Low Temperature Chamber",
    "麦克风声学测试": "Microphone Acoustic Test",
}

NOTES = {
    "金手指对插寿命": "Gold-finger mating life",
    "已有交互页面": "Live page available",
    "哑铃试样拉伸": "Dumbbell specimen tensile test",
    "两箱吊篮式": "Two-zone basket type",
    "磁条 / 芯片双模": "Magnetic stripe / chip dual mode",
    "六面三棱一角": "Six faces, three edges, one corner",
    "多姿态扫码验证": "Multi-pose scan verification",
    "扫频与失真": "Frequency sweep & distortion",
    "四工位同步敲击": "Four-station synchronized tapping",
    "涂层耐摩擦": "Coating abrasion resistance",
    "荧光渗透 · 裂纹判读": "Fluorescent penetrant · crack interpretation",
    "单箱程序循环": "Single-chamber program cycling",
    "恒温恒湿": "Constant temperature & humidity",
    "翻滚随机跌落": "Tumbling random drop",
    "连续喷雾": "Continuous spraying",
    "摇摆式弯折": "Swing-type bending",
    "球击 · 冲击点定位": "Ball impact · impact-point locating",
    "多角度重复跌落": "Multi-angle repeated drops",
    "涂层硬度划痕": "Coating hardness scratch test",
    "组合波发生器": "Combination wave generator",
    "人体模型放电": "Human body model discharge",
    "单箱高低温": "Single-chamber high/low temperature",
    "自由场灵敏度校准": "Free-field sensitivity calibration",
    "扫码机器人测试.jpg": "",
}

LABELS = {
    # 规格标签
    "插拔行程": "Insertion stroke",
    "插拔速度": "Insertion speed",
    "计数容量": "Counter capacity",
    "卡座夹持": "Card holder grip",
    "频段": "Frequency band",
    "协议": "Protocol",
    "读距": "Read range",
    "工位": "Stations",
    "最大负荷": "Max load",
    "横梁行程": "Crosshead travel",
    "力值精度": "Force accuracy",
    "最大压力": "Max pressure",
    "最大载重": "Max load capacity",
    "末端荷重": "End load",
    "气动脱钩": "Pneumatic release",
    "跌落高度": "Drop height",
    "跌落频率": "Drop frequency",
    "底板尺寸": "Base plate size",
    "扫描距离": "Scan distance",
    "扫码距离": "Scan distance",
    "重复定位": "Repeat positioning",
    "重复精度": "Repeatability",
    "节拍": "Cycle rate",
    "测试声压": "Test SPL",
    "频率范围": "Frequency range",
    "本底噪声": "Noise floor",
    "灵敏度": "Sensitivity",
    "频响": "Frequency response",
    "声源": "Sound source",
    "麦克风": "Microphone",
    "敲击力": "Tapping force",
    "敲击行程": "Tapping stroke",
    "往复行程": "Reciprocating stroke",
    "往复频率": "Reciprocating frequency",
    "摩擦头": "Friction head",
    "载荷": "Load",
    "行程": "Stroke",
    "速度": "Speed",
    "角度": "Angle",
    "弯折角度": "Bend angle",
    "弯折速度": "Bend speed",
    "滚筒直径": "Drum diameter",
    "转速": "Rotation speed",
    "适用": "Application",
    "箱内温度": "Chamber temperature",
    "温度范围": "Temperature range",
    "温度均匀度": "Temperature uniformity",
    "温度波动": "Temperature fluctuation",
    "湿度范围": "Humidity range",
    "变温速率": "Temperature change rate",
    "转换时间": "Transition time",
    "高温区": "High-temp zone",
    "低温区": "Low-temp zone",
    "内箱容积": "Inner chamber volume",
    "盐水浓度": "Salt concentration",
    "沉降量": "Settling rate",
    "渗透时间": "Penetration time",
    "显像时间": "Development time",
    "紫外波长": "UV wavelength",
    "放大倍率": "Magnification",
    "铅笔硬度": "Pencil hardness",
    "钢球质量": "Steel ball mass",
    "冲击能量": "Impact energy",
    "释放方式": "Release method",
    "开路电压": "Open-circuit voltage",
    "短路电流": "Short-circuit current",
    "波形": "Waveform",
    "放电极性": "Discharge polarity",
    "放电网络": "Discharge network",
    "耦合方式": "Coupling mode",
    "接触放电": "Contact discharge",
    "空气放电": "Air discharge",
    "刷卡压力": "Swipe force",
    "刷卡速度": "Swipe speed",
    "Z 轴行程": "Z-axis travel",
    "程序段": "Program steps",
    "控制": "Control",
    "导管内径": "Tube inner diameter",
    "关节": "Joints",
    # 规格数值
    "1 000 000 次": "1,000,000 cycles",
    "5 000 000 次": "5,000,000 cycles",
    "10 000 000 次": "10,000,000 cycles",
    "999 999 次": "999,999 cycles",
    "100 000 次": "100,000 cycles",
    "600 次 / H": "600 cycles/h",
    "30 次 / MIN": "30 cycles/min",
    "10 – 20 次 / MIN": "10–20 cycles/min",
    "2.5 S / 件": "2.5 s/pc",
    "100 段": "100 segments",
    "6 轴": "6-axis",
    "1/2″ 自由场": '1/2" free field',
    "正 / 负": "Positive / negative",
    "线 – 地": "Line–ground",
    "手机 / 小型整机": "Phone / small device",
    "伺服 + 称重": "Servo + load cell",
    # 界面
    "实拍": "Site photo",
    "NFC 协议兼容性测试": "NFC Protocol Compatibility",
    # 图鉴页
    "试验设备 3D 交互图鉴": "Test Equipment · Interactive 3D Atlas",
    "24 台试验设备 · 3D 交互图鉴": "24 Test Machines · Interactive 3D Atlas",
    "设备图片": "equipment photos",
    "现场实拍为底，逐台重建为可交互的三维试验机：一个时钟驱动机构、读数与曲线，可拆解、可剖面、可换视角。点开任意一台进入实时页面，左下工具栏可暂停、拖阶段与调速。":
        "Built on real site photos, every machine is rebuilt as an interactive 3D test rig: one clock drives the mechanism, readouts and curves stay in sync, and you can explode, section, or re-orbit the model. Open any card to enter the live page; the lower-left toolbar lets you pause, scrub stages, and change speed.",
    "24 台试验设备 · 3D 交互图鉴": "24 Test Machines · Interactive 3D Atlas",
}

DICT = {}
DICT.update(DEVICES)
DICT.update(NOTES)
DICT.update(LABELS)
DICT.pop("扫码机器人测试.jpg", None)

# i18n 运行时
JS = """/* Teardown 页面英文版：按词表把中文文本节点替换为英文（由数字人主页面语言切换驱动） */
(function () {
  var DICT = __DICT__;
  var KEYS = Object.keys(DICT).sort(function (a, b) { return b.length - a.length; });
  var CJK = /[\\u3400-\\u9fff]/;
  var ATTRS = ['title', 'alt', 'placeholder', 'aria-label'];

  function tr(s) {
    if (!s || !CJK.test(s)) return s;
    var out = s;
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (out.indexOf(k) !== -1) out = out.split(k).join(DICT[k]);
    }
    return out;
  }

  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var v = node.nodeValue;
      if (v && CJK.test(v)) {
        var nv = tr(v);
        if (nv !== v) node.nodeValue = nv;
      }
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    for (var a = 0; a < ATTRS.length; a++) {
      var av = node.getAttribute && node.getAttribute(ATTRS[a]);
      if (av && CJK.test(av)) node.setAttribute(ATTRS[a], tr(av));
    }
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  function start() {
    document.title = tr(document.title);
    walk(document.body);
    try {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var m = list[i];
          if (m.type === 'characterData') walk(m.target);
          else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) { /* ignore */ }
  }

  var qs = new URLSearchParams(location.search);
  var lang = qs.get('lang') || localStorage.getItem('lian_lang') || 'zh';
  if (String(lang).toLowerCase().indexOf('en') === 0) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
"""

js_path = os.path.join(DIST, "i18n-en.js")
with open(js_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(JS.replace("__DICT__", json.dumps(DICT, ensure_ascii=False, indent=1)))
print("wrote", js_path, os.path.getsize(js_path), "bytes | entries:", len(DICT))

TAG = '<script src="./i18n-en.js"></script>'
files = sorted(glob.glob(os.path.join(DIST, "*.html")))
injected = 0
for f in files:
    s = open(f, encoding="utf-8", errors="ignore").read()
    if 'i18n-en.js' in s:
        continue
    if "</body>" in s:
        s = s.replace("</body>", TAG + "\n</body>", 1)
    else:
        s = s + "\n" + TAG + "\n"
    open(f, "w", encoding="utf-8", newline="\n").write(s)
    injected += 1
print("injected into", injected, "of", len(files), "files")

# 覆盖率校验
def apply_dict(text):
    out = text
    for k in sorted(DICT, key=len, reverse=True):
        out = out.replace(k, DICT[k])
    return out

miss = {}
for f in files:
    raw = open(f, encoding="utf-8", errors="ignore").read()
    txt = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), raw)
    tr_txt = apply_dict(txt)
    for m in re.finditer(r"[^\"'`<>]{0,40}[\u4e00-\u9fff][^\"'`<>]{0,50}", tr_txt):
        seg = m.group(0).strip()
        if seg.endswith((".jpg", ".png", ".jpeg")):
            continue
        miss.setdefault(seg, set()).add(os.path.basename(f))

print("\nuntranslated fragments:", len(miss))
for seg in sorted(miss, key=lambda x: -len(miss[x]))[:60]:
    print("  %d | %s" % (len(miss[seg]), seg))
