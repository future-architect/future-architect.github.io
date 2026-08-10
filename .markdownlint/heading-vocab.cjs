'use strict';

// 節の見出しの表記を寄せる。
// prh では書けない。prh に渡るのは `## ` を除いたテキストなので、
// 見出しと地の文を区別できず「参考資料を以下に載せます」まで書き換わる
// プロトタイプを持たせない。持たせると `### toString` のような見出しが
// Object.prototype のメンバーに当たって誤検出する
const VOCAB = Object.assign(Object.create(null), {
  // 出典 (#2239)
  '参考リンク': '参考',
  '参考資料': '参考',
  '参考記事': '参考',
  '参照記事': '参考',
  '参照サイト': '参考',
  '参考情報': '参考',
  '参考サイト': '参考',
  '参考書籍': '参考文献',
  'Appendix：参考文献の紹介': '参考文献',
  // 冒頭と締め。漢字を開く (#2175)
  '初めに': 'はじめに',
  '始めに': 'はじめに',
  '終わりに': 'おわりに',
  '最後に': 'さいごに'
});

module.exports = {
  names: ['heading-vocab'],
  description: '見出しの表記を統一する',
  tags: ['headings'],
  parser: 'markdownit',
  function: (params, onError) => {
    for (const token of params.parsers.markdownit.tokens) {
      if (token.type !== 'inline' || !token.map) continue;
      // 完全一致のみ。部分一致にすると `## 参考：SQLのフォーマット例` のような
      // 本文の補足や、`### 8. 参考資料` の章番号体系まで巻き込む
      const expected = VOCAB[token.content];
      if (!expected) continue;
      const line = params.lines[token.map[0]];
      if (!/^#{1,6}\s/.test(line)) continue;
      onError({
        lineNumber: token.map[0] + 1,
        detail: `「${token.content}」は「${expected}」に統一します`,
        context: line,
        fixInfo: {
          editColumn: 1,
          deleteCount: line.length,
          insertText: line.replace(token.content, expected)
        }
      });
    }
  }
};
