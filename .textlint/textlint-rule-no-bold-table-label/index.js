/**
 * 表のヘッダー行と1列目が丸ごと太字（`**…**`）になっている箇所を検出する（#3260）。
 *
 * ヘッダーは `th` が既に `font-weight: 700` を持っていて、中の `strong` は
 * bootstrap-subset.css の `b,strong{font-weight:bolder}` で 900 になる。
 * Hiragino / Yu Gothic に該当ウェイトが無いのでブラウザの合成太字になり、
 * `th` に 700 を選んだときと同じ理由（輪郭が濁る）で逆効果になる。
 *
 * 1列目は全行が太字だと差が付かず、行ラベルの列であることは列の位置が示している。
 *
 * 報告するのは **その行・その列の全セルが丸ごと太字**のときだけ。行と列で
 * 同じ規則にしてある。一部のセルだけ太字なのは「そこの強調」で意味を持っているため
 * （合計行の `| **合計** | **6** |`、平均列の `| … | **平均** |` とその値）。
 * 2列目以降が全部太字の列は見ない。あちらは「値の列の強調」で役が違う
 * （`| ケイデンス | **150 spm** | 大幅に不足 |`）。
 *
 * 「丸ごと」は Strong ノード1つだけを子に持つセルのこと。`**A**の話` のように
 * 地の文が混ざるセルは子が2つになるので外れる。`**` を落とすだけで直るので
 * --fix を持つ。
 */

// セルの中身が Strong ノード1つだけなら、その Strong を返す
const wholeBold = (cell) => {
  const children = (cell && cell.children) || [];
  return children.length === 1 && children[0].type === "Strong" ? children[0] : null;
};

// 全セルが丸ごと太字なら、その Strong の配列。1つでも外れるなら null。
// 空のセルも「外れる」に数える。1列目の空セルは直前の群の続きを表していて
// （`| **心拍** | avg_heart_rate | … |` の下に `| | min_heart_rate | … |` が続く形）、
// そこで太いのは群の切れ目の印。空セルを無視すると、この形が装飾に見えてしまう
const allWholeBold = (cells) => {
  const strongs = cells.map(wholeBold);
  return strongs.length > 0 && strongs.every(Boolean) ? strongs : null;
};

function reporter(context) {
  const { Syntax, RuleError, report, getSource, fixer } = context;

  // `**…**` の囲みだけを外す。`__…__` でも囲みは2文字なので同じ扱いでよい
  const unwrap = (strongs, message) => {
    for (const strong of strongs) {
      const src = getSource(strong);
      report(
        strong,
        new RuleError(message, {
          index: 0,
          fix: fixer.replaceTextRange([0, src.length], src.slice(2, -2)),
        })
      );
    }
  };

  return {
    [Syntax.Table](node) {
      const rows = (node.children || []).filter((c) => c.type === "TableRow");
      if (rows.length === 0) return;
      const [header, ...body] = rows;

      const headerStrongs = allWholeBold(header.children || []);
      if (headerStrongs) {
        unwrap(
          headerStrongs,
          "表のヘッダー行は太字にしません（見出しのセルは既に太字で、" +
            "`**` を足すとブラウザが太さを合成する形になって輪郭がぼやけます）"
        );
      }

      const firstColStrongs = allWholeBold(body.map((row) => (row.children || [])[0]));
      if (firstColStrongs) {
        unwrap(
          firstColStrongs,
          "表の1列目を全部太字にしません（全部が太字だと差が付かず、" +
            "行の名前であることは列の位置が示しています。強調したい1行だけを囲みます）"
        );
      }
    },
  };
}

// --fix を効かせるには linter / fixer の対で公開する（関数を直接エクスポート
// すると報告だけの規則として扱われ、fix が捨てられる）
module.exports = {
  linter: reporter,
  fixer: reporter,
};
