'use strict';

/**
 * バージョンタグの同義展開 (#2292)。
 * 「Go1.27」を持つ記事は「Go」も書いたのと同義に扱い、語幹のタグを
 * データ層で実タグとして注入する。タグページ・件数・関連記事・OGP の
 * すべてが「両方書いた」のと同じになる。執筆者は Go1.27 だけ書けばよい。
 *
 * 対象はバージョン・年の版違いだけ。TypeScript 記事に JavaScript を足す
 * ような「別物への接続」はここでは決してやらない（それは tag_ontology.yml の
 * broader が担い、関連記事の弱い接続にだけ効く）。
 *
 * 語幹の導出は3層:
 * 1. 名前規則: 「既存タグ名 + 末尾数字」に分解できるタグ（Go1.27 → Go）。
 *    数字はドット付き（1.27）か2桁以上（17 / 2024）に限る。1桁を許すと
 *    Web3 のような「数字込みで別概念の名前」と区別できない。1桁の本物の
 *    バージョン（Python3 等）は拾えないが、語幹を直接書けば済む無害な見逃し
 * 2. versionOf: 表記が語幹と一致しないもの（Vue3 → Vue.js）を tag_ontology.yml に明示
 * 3. notVersion: 名前規則に誤爆する名前が現れたときの除外指定
 */

const VERSIONED = /^(.+?)(\d+(?:\.\d+)+|\d{2,})$/;

hexo.extend.filter.register('before_generate', async function() {
  const data = this.locals.get('data') || {};
  const ontology = data.tag_ontology || {};

  const tagNames = new Set(this.model('Tag').map(t => t.name));

  const stemOf = name => {
    const node = ontology[name];
    if (node && node.notVersion) return null;
    if (node && node.versionOf) return node.versionOf;
    const m = VERSIONED.exec(name);
    if (!m) return null;
    // 語幹が既存タグとして実在するときだけ版違いとみなす（Auth0 の「Auth」は対象外）
    return tagNames.has(m[1]) ? m[1] : null;
  };

  for (const post of this.model('Post').toArray()) {
    const names = post.tags.map(t => t.name);
    const add = new Set();
    for (const n of names) {
      const stem = stemOf(n);
      if (stem && stem !== n && !names.includes(stem)) add.add(stem);
    }
    if (add.size) await post.setTags(names.concat([...add]));
  }
});
