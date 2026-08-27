'use strict';

/**
 * 索引記事の表にサムネイルの列を出すタグ (#2790)。
 *
 *   | {% thumb 20260827b %} | 8/27（木） | 澁川喜規 | [タイトル](/articles/20260827b/) |
 *
 * 表そのものは生成に寄せない。索引の表は公開済み記事の一覧ではなく**予定表**で、
 * データ行714行のうち258行がまだリンクを持たない（「調整中」「〜（仮）」）。
 * リンクの文字列も半数（682件中344件）が実タイトルと違い、連載名を落とした
 * 短縮テーマ名になっている（「go mod tidy」／「Go 1.27のgo mod tidyの更新点」）。
 * どちらも series から引ける情報ではないので、機械が埋めるのは絵だけにする。
 *
 * 本文の描画は before_generate フィルタ（hexo 本体の render_post）で走るため、
 * この時点で全記事が DB に入っている。
 */

const { thumbIcon } = require('./lib/post_list');

hexo.extend.tag.register('thumb', function (args) {
  const id = (args[0] || '').trim();
  const post = hexo.locals
    .get('posts')
    .toArray()
    .find((p) => p.path === `articles/${id}/`);
  if (!post) {
    hexo.log.warn(`thumb: 記事 ${id} が見つかりません`);
    // 列がずれると表全体が読めなくなるので、箱だけは残す
    return '<span class="post-list-icon post-list-icon-empty"></span>';
  }
  return thumbIcon(post);
});
