const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 添加别名配置
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

// 添加 .db 文件支持（用于预置数据库）
config.resolver.assetExts.push('db');

module.exports = config;