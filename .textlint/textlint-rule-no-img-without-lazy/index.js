/**
 * 記事の `<img>` の `loading="lazy"` の付け方を検出する。向きは2つある。
 *
 * 1. **2枚目以降に lazy が無い。** 画面外の画像まで先読みされ、通信と描画が
 *    無駄になる。記事の画像は `loading="lazy"` を付ける決まり（CLAUDE.md の記法例）
 * 2. **先頭画像に lazy が付いている。** 先頭は LCP 候補なので lazy を付けると
 *    表示が遅れる。`scripts/lcp_image_priority.js` が描画時に外すため表示は
 *    壊れないが、書いても消える指定が残ると意図が読めない (#2686 の調査で発覚)
 *
 * 何枚目かの数え方は `lcp_image_priority.js` と揃える必要がある。あちらは
 * Markdown 記法を展開した後の HTML の最初の `<img>` を見るので、こちらも
 * `![alt](src)` を数に入れる（記法の混在は #2644）。報告するのは生の img だけで、
 * Markdown 記法には loading を書けないため対象にしない。
 *
 * **1x1 の画像は 1 の対象外。** アフィリエイトの計測ピクセルがこの形で、
 * 画面に入るかどうかに関係なく取得されることが目的なので lazy を付ける意味が無い。
 * 記事側で `textlint-disable` して黙らせていたが、抑止の理由を記事本文に
 * 書き残すことになるためルール側で外す。
 * 数える順番からは外さない（`lcp_image_priority.js` は計測ピクセルであっても
 * 最初の img を対象にするので、順番の数え方はあちらに合わせる）。
 *
 * 走査の構えは no-img-without-dimensions と同じ（Document の原文を舐め、
 * コードブロックとインラインコードの範囲だけ除外する）。属性がタイポで崩れた
 * タグは Html ノードにならず Str に落ちることがあるため、ノードを辿らない。
 *
 * 足す位置・消す対象を機械的に決められるので --fix を持つ。
 */
const IMG_RE = /<img\b((?:"[^"]*"|'[^']*'|[^<>"'])*)>/gi;
// リンクで囲んだ画像 `[![alt](src)](url)` もこの形で一致する
const MARKDOWN_IMG_RE = /!\[[^\]]*\]\([^)]+\)/g;
const LOADING_RE = /\bloading\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>]+)/i;
const WIDTH_RE = /\bwidth\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>]+)/i;
const HEIGHT_RE = /\bheight\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>]+)/i;
// lcp_image_priority.js と同じ形。同じタグに lazy が2回書かれた記事があるため
// グローバルに消す
const LAZY_ATTR_RE = /\s+loading\s*=\s*(["']?)lazy\1/gi;

function attrValue(regexp, attrs) {
  const match = regexp.exec(attrs);
  return match ? match[1].replace(/^["']|["']$/g, "") : null;
}

// アフィリエイトの計測ピクセル
function isTrackingPixel(attrs) {
  return attrValue(WIDTH_RE, attrs) === "1" && attrValue(HEIGHT_RE, attrs) === "1";
}

function collectCodeRanges(node, ranges) {
  if (node.type === "CodeBlock" || node.type === "Code") {
    ranges.push(node.range);
    return;
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectCodeRanges(child, ranges));
  }
}

function isInsideCode(position, codeRanges) {
  return codeRanges.some(([start, end]) => position >= start && position < end);
}

function collect(source, regexp, base, codeRanges) {
  const found = [];
  regexp.lastIndex = 0;
  let match;
  while ((match = regexp.exec(source)) !== null) {
    if (!isInsideCode(base + match.index, codeRanges)) {
      found.push(match);
    }
  }
  return found;
}

function reporter(context) {
  const { Syntax, RuleError, report, getSource, fixer } = context;
  // 記事の Markdown 専用。EJS（textlint-plugin-ejs）は原文をそのまま渡すので、
  // 拡張子で降りないとテンプレートの JavaScript（`/<img [^>]*src=…/` の
  // 正規表現リテラル等）を画像タグとして拾う (#2652)
  if (!/\.md$/i.test(context.getFilePath() || "")) {
    return {};
  }

  return {
    [Syntax.Document](node) {
      const source = getSource(node);
      const base = node.range[0];

      const codeRanges = [];
      collectCodeRanges(node, codeRanges);

      const htmlTags = collect(source, IMG_RE, base, codeRanges);
      const images = htmlTags
        .concat(collect(source, MARKDOWN_IMG_RE, base, codeRanges))
        .sort((a, b) => a.index - b.index);

      for (const tag of htmlTags) {
        if (images.indexOf(tag) === 0) {
          // 先頭画像は逆に lazy を外す側。検出は非グローバルの LOADING_RE で行う
          // （LAZY_ATTR_RE は g 付きで test が lastIndex を動かすため判定に使わない）
          if (attrValue(LOADING_RE, tag[1]) !== "lazy") {
            continue;
          }
          report(
            node,
            new RuleError(
              '先頭画像には loading="lazy" を付けません' +
                "（LCP 候補になるため。lcp_image_priority.js が描画時に外すので、書いても消えます）",
              {
                index: tag.index,
                fix: fixer.replaceTextRange(
                  [tag.index, tag.index + tag[0].length],
                  tag[0].replace(LAZY_ATTR_RE, "")
                ),
              }
            )
          );
          continue;
        }
        if (isTrackingPixel(tag[1])) {
          continue;
        }
        const loading = LOADING_RE.exec(tag[1]);
        const value = loading ? loading[1].replace(/^["']|["']$/g, "") : null;
        if (value === "lazy") {
          continue;
        }
        const reason =
          value === null
            ? "loading 属性がありません"
            : `loading 属性の値が「${value}」です`;
        const message = `2枚目以降の img には loading="lazy" を付けます（${reason}。画面外の画像の先読みを避けるため）`;
        // 値が別のものに書き換わっている場合は書き手の意図が読めないので直さない。
        // 属性を足すだけなら値の判断が要らず、先頭画像は上で除いてある
        if (value !== null) {
          report(node, new RuleError(message, { index: tag.index }));
          continue;
        }
        // `<img … />` と書かれている記事があるので、閉じ方は元のまま保つ
        const selfClosing = /\/\s*$/.test(tag[1]);
        const attrs = tag[1].replace(/\s*\/?\s*$/, "");
        report(
          node,
          new RuleError(message, {
            index: tag.index,
            fix: fixer.replaceTextRange(
              [tag.index, tag.index + tag[0].length],
              `<img${attrs} loading="lazy"${selfClosing ? " /" : ""}>`
            ),
          })
        );
      }
    },
  };
}

// --fix を効かせるには linter / fixer の対で公開する必要がある（関数を直接
// エクスポートすると報告だけの規則として扱われ、fix が捨てられる）
module.exports = {
  linter: reporter,
  fixer: reporter,
};
