/**
 * 記事の2枚目以降の `<img>` に `loading="lazy"` が無い箇所を検出する。
 *
 * 画面外の画像まで先読みされ、通信と描画が無駄になる。記事の画像は
 * `loading="lazy"` を付ける決まり（CLAUDE.md の記法例）。
 *
 * **先頭画像は対象外。** `scripts/lcp_image_priority.js` が描画後の本文から
 * 先頭画像の lazy を外して `fetchpriority="high"` を付ける（LCP候補に lazy が
 * 付いていると表示が遅れる）ため、先頭に無いのが正しい状態になる。
 * 何枚目かの数え方はこのフィルタと揃える必要があり、フィルタは Markdown 記法を
 * 展開した後の HTML を見るので、こちらも `![alt](src)` を数に入れる（記法の
 * 混在は #2644）。報告するのは生の img だけで、Markdown 記法には loading を
 * 書けないため対象にしない。
 *
 * 走査の構えは no-img-without-dimensions と同じ（Document の原文を舐め、
 * コードブロックとインラインコードの範囲だけ除外する）。属性がタイポで崩れた
 * タグは Html ノードにならず Str に落ちることがあるため、ノードを辿らない。
 *
 * 足す位置を機械的に決められる（タグの末尾）ので --fix を持つ。
 */
const IMG_RE = /<img\b((?:"[^"]*"|'[^']*'|[^<>"'])*)>/gi;
// リンクで囲んだ画像 `[![alt](src)](url)` もこの形で一致する
const MARKDOWN_IMG_RE = /!\[[^\]]*\]\([^)]+\)/g;
const LOADING_RE = /\bloading\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>]+)/i;

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
