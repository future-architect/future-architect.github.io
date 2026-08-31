'use strict';

// 記事末尾の「We're hiring」に出すパネル
// スクロール量を抑えるため2枠だけ表示する。1枠目は採用ページ固定で、
// 2枠目はオウンドメディア2種から記事ごとに1つを選ぶ。
// ガイドライン類は採用コマーシャルではないのでここには出さず、
// /specials/guidelines/ のポータルが入口を担う (#2295)

const recruitPanel = {
  url: 'https://www.future.co.jp/recruit/recruit/rec-career/',
  title: 'フューチャー採用情報',
  // 「採用ページ」はブログ内のページとも読めるため外部であることを名乗る (#2346)。
  // 名乗り方は矢印と sr-only で、描画側（_partial/article.ejs）が付ける (#2729)。
  // 「未来報（フューチャー公式note）」は note を名乗っているので付けない
  label: 'フューチャー採用ページ',
  external: true,
  // 採用サイトの OGP そのもの（写真のビジュアルが無く、これ以外の絵が取れない）。
  // 白地なので hover の面の上では白い穴に見える。#2458 の枠で縁取る (#3113)
  image: '/career_official.jpg',
  width: 1200,
  height: 630,
  bordered: true,
  lede: '私たちは、多様なバックグラウンドを持つ人材が集まってこそ、より強い組織になると考えています。',
};

const contentPanels = [
  {
    url: 'https://note.future.co.jp/',
    title: '未来報',
    label: '未来報（フューチャー公式note）',
    image: '/miraiho.jpg',
    width: 400,
    height: 145,
    lede: 'フューチャーの公式note。社員やカルチャー、イベントなど、会社の「いま」を発信しています。',
  },
  {
    url: 'https://www.future.co.jp/lttf/',
    title: 'LEAD TO THE FUTURE',
    label: 'LEAD TO THE FUTURE',
    // 自社のオウンドメディア名で、サービス名として広く知られているわけではない。
    // 読者には別サイトへ出ると読めないので印を付ける (#2729)
    external: true,
    image: '/lttf.jpg',
    width: 1200,
    height: 600,
    lede: 'フューチャーのオウンドメディア。AI・テクノロジーや業界のインサイト、プロジェクトの裏側を発信しています。',
  },
];

// 記事のパスから決まるハッシュ値（FNV-1a 32bit）
// 乱数ライブラリを使うとバージョン差で結果が変わりうるため、自前で計算する
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

hexo.extend.helper.register('hiring_panels', function (post) {
  // 同じ記事なら常に同じパネルになるよう、パスだけを入力にする
  return [recruitPanel, contentPanels[hash(post.path) % contentPanels.length]];
});
