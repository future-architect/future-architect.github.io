'use strict';

/**
 * Rego（Open Policy Agent のポリシー言語）用の言語定義を highlight.js に追加する。
 *
 * highlight.js に rego の定義は無く、フェンスに rego と書いても色が付かない。
 * 代用できる既存言語も無い（Datalog 系の構文で、prolog とは別物）。
 *
 * 登録方法は gomod（register_hljs_gomod.js）と同じ。hexo-util は言語名を
 * highlight_alias.json という静的な表で検査し、そこに無い名前は plaintext に
 * 落とすため、hljs への登録とあわせて表にも名前を通す必要がある。
 * 表に足すだけなら hexo 本来の描画経路（行の span、ファイル名、行番号）を
 * そのまま使えるので、terraform のようにコードブロックごと横取りはしない。
 */

const hljs = require('highlight.js');

hljs.registerLanguage('rego', function () {
  return {
    name: 'Rego',
    aliases: ['opa'],
    case_insensitive: false,
    keywords: {
      // v1 で追加された if / contains / every を含む。some / in / with は
      // 反復と入力差し替えの構文
      keyword: 'package import as default else not some every in with if contains',
      literal: 'true false null',
    },
    contains: [
      hljs.COMMENT('#', '$'),
      hljs.QUOTE_STRING_MODE,
      {
        // バッククォートの生文字列。正規表現を書くときに使われる
        className: 'string',
        begin: '`',
        end: '`',
      },
      hljs.C_NUMBER_MODE,
      {
        // input と data はポリシーが参照する2つの入口。
        // どのポリシーにも出てきて意味が大きいので、変数色で立たせる
        className: 'variable',
        begin: /\b(?:input|data)\b/,
      },
      {
        // 組み込み関数。sprintf や json.unmarshal のように名前空間付きのものが
        // 多く数も多いため、列挙せず「呼び出しの形」で拾う。
        // 利用者が増えても定義を直さずに済む
        className: 'built_in',
        begin: /\b[a-z_][\w]*(?:\.[a-z_][\w]*)*(?=\s*\()/,
      },
      {
        // operator には今のところテーマ側の色指定が無く、地の文の色で出る
        // （gomod の => も同じ）。将来まとめて色を付けたときに揃うよう、
        // 種別だけは付けておく
        className: 'operator',
        begin: /:=|==|!=|<=|>=|[<>+\-*/%|]/,
      },
    ],
  };
});

// hexo-util の言語表に通す。require のキャッシュを共有しているため、
// ここでの書き換えが hexo-util 側の判定にもそのまま効く。
// 表の形が変わって読めなくなったら、黙って plaintext に落ちるのではなく
// ビルドを失敗させて気づけるようにする
const alias = require('hexo-util/highlight_alias.json');
if (!alias || !alias.aliases || !Array.isArray(alias.languages)) {
  throw new Error(
    'hexo-util の highlight_alias.json の形が想定と異なる。rego の登録方法を見直すこと',
  );
}
if (!alias.languages.includes('rego')) alias.languages.push('rego');
for (const name of ['rego', 'opa']) {
  alias.aliases[name] = 'rego';
}
