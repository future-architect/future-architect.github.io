/**
 * 「（外部サイト）」を付けなくてよいリンクテキストの語彙 (#2346)。
 *
 * このルールの判定は Markdown（この textlint ルール）と EJS（scripts/doctor.js の
 * doctor_external_links）の2箇所にある。対象言語が違うので走査は分けているが、
 * **許容する語彙は同じ**なので、片方だけ増えて食い違わないようここで1つ持つ (#2652)。
 */
module.exports = [
  '外部サイト', // 明示済み
  // ブランド・メディア名を名乗っているもの
  "connpass",
  "Youtube",
  "YouTube",
  "Qiita",
  "Feedly",
  "公式note",
  "LEAD TO THE FUTURE",
  // X のフォローボタン。ブランドはアイコンが名乗る (#2036)
  "フォロー",
];
