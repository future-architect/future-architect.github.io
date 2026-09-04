'use strict';

const { readFileSync } = require('fs');

// image-size v2系の同期呼び出しパターン
// https://www.npmjs.com/package/image-size
const { imageSize } = require('image-size');

const currentDir = process.cwd();

const measure = (path) => {
  const buffer = readFileSync(currentDir + '/source/' + path);
  const { width, height } = imageSize(buffer);
  return { width, height };
};

hexo.extend.helper.register('image_size_attribute', (path) => {
  if (!path) {
    return ''; // pathが未定義の場合や空の場合は空文字を返す
  }

  const dimensions = measure(path);

  return `width="${dimensions.width}" height="${dimensions.height}"`;
});

// 属性の断片ではなく数値で受け取る呼び出し元用（panel-card の thumb など）
hexo.extend.helper.register('image_size', (path) => (path ? measure(path) : null));
