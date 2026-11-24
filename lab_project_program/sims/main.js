// 单 bundle 入口：?p=<项目id> 选择 3D 机器；?m=<机器名> 直接指定（调试用）
import {boot} from './_kit/kit.js';
import * as M from './_machines/index.js';
import REG from './registry.js';

const q = new URLSearchParams(location.search);
const p = q.get('p');
const m = q.get('m');
let reg = REG[p] || REG[m || 'c01'];
if (!reg) reg = REG.c01;
const mach = reg.machine ? M[reg.machine] : M[reg.module];

// 机器可读的项目级参数（如 p02 烤箱模式）
window.SIMFACTS = reg.facts || {};

boot({machine: mach, reg});