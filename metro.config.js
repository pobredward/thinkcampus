/**
 * Metro 설정 — Expo 기본값 + web/(Next.js) 폴더 제외
 *
 * web/ 에는 별도의 node_modules(react, react-dom 등)와 .next 빌드 산출물이 있어서
 * Metro 가 함께 감시·해석하면 느려지고 모듈 중복 문제가 생길 수 있다.
 */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const webDir = new RegExp(`^${escape(path.resolve(__dirname, 'web'))}[\\\\/].*$`);

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  webDir,
];

module.exports = config;
