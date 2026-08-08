'use strict';

/**
 * post.tags の並びをビルドごとに変わらないようにする。
 *
 * hexo の Post モデルは tags を次のように解決している（models/post.js）。
 *
 *   const ids = PostTag.find({post_id: this._id}, {lean: true}).map(i => i.tag_id);
 *   return Tag.find({_id: {$in: ids}});
 *
 * $in は ids の順を保持せず、Tag ストアに積まれた順で返す。その順は
 * どの記事を先に読んだか、つまりファイル走査の順に依存するため、
 * 同じ入力からビルドしても実行ごとに変わる。
 *
 * 実測では設定を一切変えずに2回ビルドすると2896ページ中214ページの
 * HTML が変わっていた。差分はすべてタグの並びで、
 *
 * - 記事のタグ一覧（_partial/post/tag.ejs）
 * - keywords（scripts/count_post.js の join_pagetag）
 * - article:tag（hexo 組み込みの open_graph。呼び出し側から順序を渡せない）
 *
 * の3つに出る。呼び出し側をそれぞれ直すのではなく、根元の getter を
 * 名前順に固定して全部まとめて決まるようにする。
 *
 * 名前順を選ぶのは、決定的でありさえすれば良い場所だから。
 * フロントマターの記述順は $in の時点で既に失われていて復元できない。
 * 表示順を持つ箇所（記事数の降順など）は、この並びを入力として
 * 自前で並べ替えるので影響を受けない。
 */

// virtual を持つのはモデルではなくスキーマ。同名で get を上書きする
hexo.model('Post').schema.virtual('tags').get(function() {
  const Tag = hexo.model('Tag');
  const PostTag = hexo.model('PostTag');
  const ids = PostTag.find({post_id: this._id}, {lean: true}).map(item => item.tag_id);
  return Tag.find({_id: {$in: ids}}).sort('name');
});
