/**
 * `<img>` の width / height の比が、画像ファイルの実寸の比とズレている箇所を検出する。
 *
 * 寸法を書く目的は、読み込み前にブラウザが縦横比を確定してレイアウトシフト（CLS）を
 * 防ぐこと。比が実寸と違うと**間違った高さで場所が確保され、画像が現れた瞬間に
 * レイアウトが動く**。寸法を書いているのに CLS が出るので、未設定より気づきにくい（#2643）。
 *
 * **比だけを見る。** 大きさは見ない。`.blog-item img` が `max-width:100%` / `height:auto`
 * を持つため、実寸より小さい値を書いて縮めて見せるのは正しい書き方で（#2605）、
 * 比さえ保たれていればレイアウトは動かない。
 *
 * 閾値は**相対1%**。実測すると、比を保った縮小の丸め誤差（1787x553 を幅1200に縮めると
 * 高さは 371.4 → 372）は 0.2% 以下に収まり、書き間違い（片方だけ違う値）は 1% 以上に出る。
 * 全5,971箇所で 0.373% と 1.0% の間に一件も無く、ここで切ると誤検知が0になる。
 *
 * このルールだけは**画像ファイルを読む**。文字列だけを見る他のルールと性質が違うが、
 * 実測しないと比が正しいか判定できない。寸法はヘッダにあるので**先頭64KBだけ読む**
 * （全6,000枚で 0.09秒・267MB。全体を読むと1秒・1,037MB になる）。
 * 読む量を絞っても結果は変わらないことを全6,000枚で確認している（食い違い0件）が、
 * 大きな EXIF が挟まった JPEG などは先頭だけでは足りないので、失敗したら全体を読む。
 *
 * 測れないものは黙って飛ばす: 外部URLの画像、存在しないファイル、image-size が
 * 対応しない形式。存在しないファイルの検出は別の話なのでここでは扱わない。
 */
const { readFileSync, openSync, readSync, closeSync } = require("fs");
const path = require("path");
const { imageSize } = require("image-size");

const HEAD_BYTES = 65536;

// 引用符の中の > （alt="inputs -> outputs" など）でタグを切らないよう、
// 引用符で囲まれた値は飛ばして > を探す（no-img-without-dimensions と同じ）
const IMG_RE = /<img\b((?:"[^"]*"|'[^']*'|[^<>"'])*)>/gi;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>]+))?/g;
const DEFAULT_TOLERANCE = 0.01;

const sizeCache = new Map();

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

// `source/_posts/<年>/<記事>.md` から `source/` を割り出す。textlint を
// どこから起動しても解決できるよう、cwd ではなく対象ファイルの位置から辿る
function sourceRoot(filePath) {
  const matched = filePath && filePath.match(/^(.*[/\\]source)[/\\]_posts[/\\]/);
  return matched ? matched[1] : path.join(process.cwd(), "source");
}

function readHead(file) {
  const fd = openSync(file, "r");
  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const read = readSync(fd, buffer, 0, HEAD_BYTES, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

function measure(root, src) {
  if (!src.startsWith("/")) {
    return null; // 外部URL・相対パスは測れない
  }
  let relative = src.split("?")[0];
  try {
    relative = decodeURI(relative); // `Replication-8%.png` のように % が生で入るものがある
  } catch {
    /* デコードできないものはそのまま扱う */
  }
  const file = path.join(root, relative.replace(/^\//, ""));
  if (sizeCache.has(file)) {
    return sizeCache.get(file);
  }
  let size = null;
  for (const read of [readHead, readFileSync]) {
    try {
      const dimensions = imageSize(read(file));
      if (dimensions && dimensions.width && dimensions.height) {
        size = { width: dimensions.width, height: dimensions.height };
        break;
      }
    } catch {
      /* 読めない・対応していない形式は対象外。先頭だけで足りなければ全体を読む */
    }
  }
  sizeCache.set(file, size);
  return size;
}

module.exports = function (context, options = {}) {
  const { Syntax, RuleError, report, getSource, getFilePath } = context;
  const tolerance = typeof options.tolerance === "number" ? options.tolerance : DEFAULT_TOLERANCE;

  return {
    [Syntax.Document](node) {
      const source = getSource(node);
      const base = node.range[0];
      const root = sourceRoot(getFilePath());

      const codeRanges = [];
      collectCodeRanges(node, codeRanges);

      IMG_RE.lastIndex = 0;
      let tagMatch;
      while ((tagMatch = IMG_RE.exec(source)) !== null) {
        if (isInsideCode(base + tagMatch.index, codeRanges)) {
          continue;
        }

        const attrs = new Map();
        ATTR_RE.lastIndex = 0;
        let attrMatch;
        while ((attrMatch = ATTR_RE.exec(tagMatch[1])) !== null) {
          const name = attrMatch[1].toLowerCase();
          const value = attrMatch[2] ? attrMatch[2].replace(/^["']|["']$/g, "") : "";
          // 同名の属性が重複しているときは HTML と同じく先勝ち
          if (!attrs.has(name)) {
            attrs.set(name, value);
          }
        }

        const width = attrs.get("width");
        const height = attrs.get("height");
        // 寸法が無い・整数でないものは no-img-without-dimensions の担当
        if (!/^\d+$/.test(width || "") || !/^\d+$/.test(height || "")) {
          continue;
        }

        const real = measure(root, attrs.get("src") || "");
        if (!real) {
          continue;
        }

        const written = Number(width) / Number(height);
        const actual = real.width / real.height;
        if (Math.abs(written - actual) / actual < tolerance) {
          continue;
        }

        // 書かれた幅を保ったまま比を合わせる高さ。実寸に戻すと表示が変わりうるので、
        // 幅を維持する側を示す
        const suggested = Math.round((Number(width) * real.height) / real.width);
        report(
          node,
          new RuleError(
            `img の width / height の比が実寸とズレています（属性 ${width}x${height} に対し実寸 ${real.width}x${real.height}）。` +
              `幅を変えないなら height="${suggested}" です`,
            { index: tagMatch.index }
          )
        );
      }
    },
  };
};
