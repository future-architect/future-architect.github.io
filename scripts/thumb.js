'use strict';

/**
 * 索引記事の表にサムネイルを出すタグ (#2790)。日付のセルに入れ、日付の上に積む。
 *
 *   | {% thumb 20260827b %} 8/27（木） | 澁川喜規 | [タイトル](/articles/20260827b/) |
 *   | 8/28（金）                       | 井上拓   | まだ公開していない記事のテーマ    |
 *
 * 絵が無ければ何も出さない。予定表なので未公開の行の方が多い時期があり、
 * 空き枠を並べると来ない絵を待っているように見える。セルには日付が残るので、
 * 何も無くても書き忘れには見えない。
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

hexo.extend.tag.register('thumb', function (args) {
  const id = (args[0] || '').trim();
  if (!id) return '';
  const post = hexo.locals
    .get('posts')
    .toArray()
    .find((p) => p.path === `articles/${id}/`);
  if (!post) {
    hexo.log.warn(`thumb: 記事 ${id} が見つかりません`);
    return '';
  }
  // 絵の markup は行の部品と共有する (#3097)。タグプラグインには this.partial が
  // 無いので、テーマのビューを直接引いて描く
  const view = hexo.theme.getView('_partial/post-list-icon.ejs');
  return view.renderSync({ post }).trim();
});
