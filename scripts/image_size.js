'use strict';

// https://www.npmjs.com/package/image-size
const sizeOf = require('image-size');

const currentDir = process.cwd();

hexo.extend.helper.register("image_size_attribute", (path) => {
  const dimensions = sizeOf(currentDir + "/source/" + path)
  return `width=${dimensions.width} height=${dimensions.height}`;
});
