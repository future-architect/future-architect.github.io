// テンプレートの共通部品（_partial / _widget）に「見本」か「見本を出さない理由」の
// どちらかが必ずあることを検査する (#3205)。
//
// 以前は /doctor/ に全部品の台帳として並べ、未分類を警告として出していた。
// **あそこは「対応した方がよさそうなもの」を出す場所**で、全部品を並べる一覧は
// そこから人が判断することが無い。答えの決まっている検査は linter に置く
// （#2706 で /doctor/ の機械判定を textlint へ移したのと同じ線引き）。
//
// 呼び出し元が0の部品も止める。消し忘れか、呼ぶのを忘れたかのどちらか。
import { buildIndex } from './scripts/lib/ui_partials.js';

const index = buildIndex({ layoutDir: 'themes/future/layout', scriptDir: 'scripts' });

let failed = false;

if (index.unclassified.length) {
  failed = true;
  console.error(
    `見本も「見本を出さない理由」も無い部品が ${index.unclassified.length}件あります: ` +
      index.unclassified.map((r) => r.name).join('、'),
  );
  console.error(
    '  ギャラリー（themes/future/layout/gallery.ejs）で呼ぶか、' +
      'scripts/lib/ui_partials.js の NOT_SHOWN に理由を書いてください',
  );
} else {
  console.log('すべての部品に見本か理由があります');
}

if (index.orphan.length) {
  failed = true;
  console.error(
    `呼び出し元が無い部品が ${index.orphan.length}件あります: ` +
      index.orphan.map((r) => r.name).join('、'),
  );
} else {
  console.log('呼び出し元が無い部品はありません');
}

console.log(
  `部品 ${index.rows.length}件（見本あり ${index.shown.length} / 理由あり ${index.hidden.length}）`,
);

if (failed) process.exit(1);
