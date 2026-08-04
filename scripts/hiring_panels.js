'use strict';

// 記事末尾の「We're hiring」に出すパネル
// スクロール量を抑えるため2枠だけ表示する。1枠目は採用ページ固定で、
// 2枠目はコンテンツ3種から記事ごとに1つを選ぶ。

const recruitPanel = {
  url: 'https://www.future.co.jp/recruit/recruit/rec-career/',
  title: 'フューチャー採用情報',
  label: 'フューチャー採用ページ',
  image: '/career_official.jpg',
  lede: '私たちは、多様なバックグラウンドを持つ人材が集まってこそ、より強い組織になると考えています。',
};

const contentPanels = [
  {
    url: 'https://future-architect.github.io/typescript-guide/',
    title: '仕事ですぐに使えるTypeScript',
    label: '仕事ですぐに使えるTypeScript',
    image: '/typescript_guidelines.png',
    lede: 'ウェブフロントエンドの開発を学ぶときに、JavaScriptを経由せずに、最初からTypeScriptで学んでいくコンテンツです。',
  },
  {
    url: 'https://future-architect.github.io/arch-guidelines/',
    title: 'Future Architecture Guidelines',
    label: 'アーキテクチャガイドライン',
    image: '/archtecture_guidelines.png',
    lede: 'フューチャー株式会社の有志が作成する良いアーキテクチャを実現するための設計ガイドラインです。',
  },
  {
    url: 'https://future-architect.github.io/coding-standards/',
    title: 'Future Enterprise Coding Standard',
    label: 'コーディング規約',
    image: '/coding_standards.png',
    lede: 'フューチャー株式会社が作成するエンタープライズ領域に特化したコーディング規約',
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

hexo.extend.helper.register('hiring_panels', function(post) {
  // 同じ記事なら常に同じパネルになるよう、パスだけを入力にする
  return [recruitPanel, contentPanels[hash(post.path) % contentPanels.length]];
});
