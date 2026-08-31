'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('hexo-front-matter');

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
 */

// タグはレンダリングの途中で走るので、cold build（db.json 無し＝本番のデプロイは
// 毎回これ）では、その時点でまだ DB に入っていない記事を引けない。読み込み順に
// 左右されないよう、DB ではなくソースのフロントマターから引く (#3121)。
// scripts/ はホットリロードされないので、対応表もプロセスの生存中は作り直さない。
let index = null;

function postIndex() {
  if (index) return index;
  index = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      // 記事IDはファイル名の先頭。permalink の :year:month:day:postid と同じ形で、
      // postid を持たない古い記事は日付だけになる
      const id = /^(\d{8}[a-z]*)[-_]/.exec(entry.name);
      if (!id || !entry.name.endsWith('.md')) continue;
      const data = parse(fs.readFileSync(full, 'utf8'));
      index.set(id[1], {
        path: `articles/${id[1]}/`,
        thumbnail: data.thumbnail || '',
      });
    }
  };
  walk(path.join(hexo.source_dir, '_posts'));
  return index;
}

hexo.extend.tag.register('thumb', function (args) {
  const id = (args[0] || '').trim();
  if (!id) return '';
  const post = postIndex().get(id);
  if (!post) {
    hexo.log.warn(`thumb: 記事 ${id} が見つかりません`);
    return '';
  }
  // 絵の markup は行の部品と共有する (#3097)。タグプラグインには this.partial が
  // 無いので、テーマのビューを直接引いて描く
  const view = hexo.theme.getView('_partial/post-list-icon.ejs');
  return view.renderSync({ post }).trim();
});
