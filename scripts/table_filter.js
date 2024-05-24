'use strict';

// hexo-renderer-marked はで拡張できる
// https://github.com/hexojs/hexo-renderer-marked
//
// もとの markd を参考に拡張する
// https://github.com/markedjs/marked/blob/e5796ecc435a30f96939e6a7b2229c14264b4bf8/src/Renderer.js#L92
hexo.extend.filter.register('marked:renderer', function(renderer) {
  renderer.table = function(header, body) {
    return `<div class="scroll">${table(header, body)}</div>\n`;
  };
});

const table = (header, body) => {
  if (body) body = '<tbody>' + body + '</tbody>';

  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + body
    + '</table>';
}
