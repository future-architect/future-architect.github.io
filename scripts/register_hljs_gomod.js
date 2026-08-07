'use strict';

/**
 * go.mod / go.work 用の言語定義を highlight.js に追加する。
 *
 * highlight.js に go.mod の定義は無く、記事では proto / hcl / text で
 * 代用していた。しかしいずれも誤った色を付けていた。たとえば proto では
 * バージョン v1.19.0 が「19.0」という数値として拾われ、意味の無い単位が
 * 強調される。go では go キーワードだけ当たり、バージョンが .19 と .0 に
 * 分割される。何も色を付けないより悪い状態だった。
 *
 * hexo-util は同じ highlight.js インスタンスを解決するので registerLanguage が
 * 効くが、それだけでは足りない。hexo-util は言語名を highlight_alias.json という
 * 静的な表で検査しており、そこに無い名前は問答無用で plaintext に落とす。
 *
 *   if (!lang || !alias.aliases[lang]) lang = 'plaintext';
 *
 * 判定に使うのは表の有無だけで、hljs に渡るのはフェンスに書いた名前そのもの。
 * そのため hljs への登録とあわせて、この表にも名前を通しておく必要がある。
 * terraform（register_hljs_terraform.js）がコードブロックごと横取りしているのも
 * 同じ制約が理由だが、表に足すだけなら hexo 本来の描画経路
 * （行の span、ファイル名、行番号）をそのまま使えるので、そちらを採る。
 */

const hljs = require('highlight.js');

hljs.registerLanguage('gomod', function() {
  return {
    name: 'Go Module',
    aliases: ['go.mod', 'gowork', 'go.work'],
    case_insensitive: false,
    keywords: {
      keyword: 'module go require replace exclude retract toolchain tool godebug use'
    },
    contains: [
      hljs.COMMENT('//', '$'),
      {
        // v1.19.0 / v2.0.0-rc.1 / v0.0.0-20240101120000-abcdef123456 / v1.0.0+incompatible
        className: 'type',
        begin: /\bv\d+\.\d+\.\d+(?:-[\w.]+(?:-[0-9a-f]+)?)?(?:\+incompatible)?\b/
      },
      {
        // モジュールパス。ホスト名を含む形（github.com/foo/bar）だけを拾い、
        // 単なる単語を巻き込まないようにする
        className: 'string',
        begin: /\b[\w.-]+\.[a-z]{2,}(?:\/[\w.~-]+)+/
      },
      {
        // toolchain go1.27.0 のようなツールチェイン名。
        // 先に拾わないと、後続の数値ルールが「27.0」だけを掴んでしまう
        className: 'number',
        begin: /\bgo\d+\.\d+(?:\.\d+)?(?:rc\d+|beta\d+)?\b/
      },
      {
        // replace の矢印
        className: 'operator',
        begin: /=>/
      },
      {
        // go 1.27 や toolchain の数値
        className: 'number',
        begin: /\b\d+\.\d+(?:\.\d+)?\b/
      }
    ]
  };
});

// hexo-util の言語表に通す。require のキャッシュを共有しているため、
// ここでの書き換えが hexo-util 側の判定にもそのまま効く。
// 表の形が変わって読めなくなったら、黙って plaintext に落ちるのではなく
// ビルドを失敗させて気づけるようにする
const alias = require('hexo-util/highlight_alias.json');
if (!alias || !alias.aliases || !Array.isArray(alias.languages)) {
  throw new Error('hexo-util の highlight_alias.json の形が想定と異なる。gomod の登録方法を見直すこと');
}
if (!alias.languages.includes('gomod')) alias.languages.push('gomod');
for (const name of ['gomod', 'go.mod', 'gowork', 'go.work']) {
  alias.aliases[name] = 'gomod';
}
