'use strict';

const { readFileSync } = require('fs');

// image-size v2系の同期呼び出しパターン
// https://www.npmjs.com/package/image-size
const { imageSize } = require('image-size');

const currentDir = process.cwd();

hexo.extend.helper.register("image_size_attribute", (path) => {
  if (!path) {
    return '';   // pathが未定義の場合や空の場合は空文字を返す
  }

  const fullPath = currentDir + "/source/" + path;
  const buffer = readFileSync(fullPath);
  const dimensions = imageSize(buffer);

  return `width="${dimensions.width}" height="${dimensions.height}"`;
});
