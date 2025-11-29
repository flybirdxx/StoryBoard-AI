import { ArtStyleOption, AspectRatio } from './types';

export const ART_STYLE_OPTIONS: ArtStyleOption[] = [
  { id: '电影写实', label: '电影写实', desc: '好莱坞大片质感，真实光影', fallbackGradient: 'from-slate-900 to-slate-700' },
  { id: '美式漫画', label: '美式漫画', desc: '粗犷线条，超级英雄风格', fallbackGradient: 'from-red-900 to-blue-900' },
  { id: '日本动漫', label: '日本动漫', desc: '精致赛璐珞，日系二次元', fallbackGradient: 'from-pink-900 to-indigo-900' },
  { id: '水彩画', label: '水彩画', desc: '柔和晕染，清新艺术感', fallbackGradient: 'from-emerald-900 to-teal-900' },
  { id: '赛博朋克', label: '赛博朋克', desc: '霓虹夜景，高科技低生活', fallbackGradient: 'from-fuchsia-900 to-purple-900' },
  { id: '蒸汽朋克', label: '蒸汽朋克', desc: '维多利亚机械复古美学', fallbackGradient: 'from-amber-900 to-orange-900' },
  { id: '黑暗奇幻', label: '黑暗奇幻', desc: '阴郁哥特，史诗感氛围', fallbackGradient: 'from-gray-900 to-black' },
  { id: '皮克斯3D风格', label: '皮克斯3D', desc: '可爱圆润，CGI动画质感', fallbackGradient: 'from-blue-600 to-cyan-500' },
  { id: '极简线条', label: '极简线条', desc: '黑白线稿，高雅且抽象', fallbackGradient: 'from-gray-200 to-white' },
  { id: '复古像素', label: '复古像素', desc: '8-bit 电子游戏怀旧风格', fallbackGradient: 'from-indigo-600 to-purple-600' },
  { id: '印象派油画', label: '印象派油画', desc: '浓墨重彩，梵高式笔触', fallbackGradient: 'from-yellow-700 to-blue-800' },
  { id: 'custom', label: '自定义风格', desc: '手动输入艺术风格提示词', fallbackGradient: 'from-slate-800 to-zinc-900' },
];

export const ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];
