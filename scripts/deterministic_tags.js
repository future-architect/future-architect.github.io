'use strict';

/**
 * post.tags の並びをビルドごとに変わらないよう名前順に固定する。
 *
 * hexo の getter は Tag.find({_id: {$in: ids}}) で解決するが、$in は ids の
 * 順を保持せず Tag ストアに積まれた順（＝ファイルを読んだ順）で返す。
 * これを消すとタグ一覧・keywords・article:tag の並びが実行ごとに変わる。
 * article:tag は組み込みの open_graph が出しており、呼び出し側から順序を
 * 渡せないため、根元のここで断つしかない。詳細は #2055。
 */

hexo.model('Post').schema.virtual('tags').get(function() {
  const Tag = hexo.model('Tag');
  const PostTag = hexo.model('PostTag');
  const ids = PostTag.find({post_id: this._id}, {lean: true}).map(item => item.tag_id);
  return Tag.find({_id: {$in: ids}}).sort('name');
});
