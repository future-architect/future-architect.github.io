/**
 * 記事の frontmatter の分類（tags / categories）の決まりを見る。
 *
 * /doctor が機械判定で並べていた検査のうち、答えが決定的なものを linter へ移した
 * （#2706）。人の判断が要るもの（統合候補・1記事タグ）は /doctor に残る。
 * 検査は3つで、いずれも**記事1本だけを見て**判定できる。
 *
 * 1. **タグが1つも無い。** 記事を辿る導線がタグなので、1つも無いと一覧から到達できない
 * 2. **カテゴリと同名のタグ。** 語彙が重複していると、一覧から記事ページへ移ったときに
 *    「タグが1つ増えた」と誤認する。タグ側を外して `_config.yml` の alias で
 *    タグURLをカテゴリへ転送する運用（IaC の前例 #2291）
 * 3. **categories がちょうど1つで、`source/_data/categories.yml` に登録された語であること。**
 *    未登録は新設カテゴリの説明漏れか誤記のどちらか。カテゴリの語彙は
 *    categories.yml のキーが持っているので、1本の記事とこのファイルだけで照合できる
 *
 * 「説明はあるがカテゴリとして実在しない」（categories.yml の消し忘れ）は
 * 記事1本では判定できないため、検査そのものを廃止した（#2706）。
 *
 * frontmatter は textlint の AST に出ない（remark が Yaml ノードとして持つが、
 * 中身は文字列のまま）ので、原文の先頭の `---` ブロックを自分で読む。
 * 走査を frontmatter に限るのが要点で、本文まで見ると記事の中の
 * YAML のサンプル（`tags: [タグ1, タグ2]` を載せている記事がある）を拾う。
 *
 * どのタグを付けるべきかは機械には決められないので --fix は持たない。
 */
const fs = require("fs");
const path = require("path");

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?\r?\n)---/;

// categories.yml は「カテゴリ名: 一言説明」の1行1件。キーだけを使う
function loadCategoryNames(dataFile) {
  const text = fs.readFileSync(dataFile, "utf8");
  const names = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s/.test(line) || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon > 0) names.push(line.slice(0, colon).trim());
  }
  return names;
}

const categoryCache = new Map();

// 記事のパスからリポジトリのルートを割り出す。cwd に依存させないのは、
// worktree から textlint を回すときに cwd がリポジトリの外を向くことがあるため
function categoryNamesFor(filePath) {
  const marker = `${path.sep}source${path.sep}_posts${path.sep}`;
  const at = filePath.indexOf(marker);
  if (at < 0) return null;
  const dataFile = path.join(filePath.slice(0, at), "source", "_data", "categories.yml");
  if (!categoryCache.has(dataFile)) {
    try {
      categoryCache.set(dataFile, loadCategoryNames(dataFile));
    } catch {
      // 読めないときは照合を諦める。ルールを黙らせる方が、
      // 全記事に的外れな指摘を出すより害が小さい
      categoryCache.set(dataFile, null);
    }
  }
  return categoryCache.get(dataFile);
}

/**
 * frontmatter から配列の項目を読む。ブロック形式（`- 値` の行）と
 * フロー形式（`[a, b]`）の両方を受ける。返すのは {value, index} の配列で、
 * index は frontmatter の先頭からの文字位置（報告する位置に使う）
 */
function readList(frontMatter, key) {
  const head = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(frontMatter);
  if (!head) return null;
  const inline = head[1].trim();
  if (inline.startsWith("[")) {
    const items = [];
    const body = inline.slice(1, inline.lastIndexOf("]"));
    let cursor = head.index + head[0].indexOf("[") + 1;
    for (const raw of body.split(",")) {
      const value = unquote(raw.trim());
      if (value) items.push({ value, index: cursor });
      cursor += raw.length + 1;
    }
    return items;
  }
  const items = [];
  let cursor = head.index + head[0].length + 1;
  for (const line of frontMatter.slice(cursor).split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (!item) break;
    const value = unquote(item[1].trim());
    if (value) items.push({ value, index: cursor + line.indexOf("-") });
    cursor += line.length + 1;
  }
  return items;
}

function unquote(value) {
  return value.replace(/^["']|["']$/g, "").trim();
}

function reporter(context) {
  const { Syntax, RuleError, report, getSource } = context;
  const filePath = context.getFilePath() || "";
  // 記事の Markdown だけを見る。特設ページ（source/specials 配下の layout: page）は
  // タグもカテゴリも持たないため、拡張子だけでは絞り込めない
  if (!/\.md$/i.test(filePath) || !filePath.includes(`${path.sep}source${path.sep}_posts${path.sep}`)) {
    return {};
  }

  return {
    [Syntax.Document](node) {
      const source = getSource(node);
      const matched = FRONT_MATTER_RE.exec(source);
      if (!matched) return;
      const frontMatter = matched[1];
      const base = node.range[0] + matched[0].indexOf(frontMatter);
      const at = (index) => ({ index: base + index });

      const tags = readList(frontMatter, "tags");
      const categories = readList(frontMatter, "categories");
      const categoryNames = categoryNamesFor(filePath);

      if (!tags || tags.length === 0) {
        // `tags:` の行があればそこ、無ければ frontmatter の先頭を指す
        const head = frontMatter.indexOf("tags:");
        report(
          node,
          new RuleError(
            "タグが1つもありません（記事を辿る導線はタグなので1つ以上付けます）",
            at(head < 0 ? 0 : head)
          )
        );
      }

      if (categoryNames && tags) {
        const byLower = new Map(categoryNames.map((name) => [name.toLowerCase(), name]));
        for (const tag of tags) {
          const category = byLower.get(tag.value.toLowerCase());
          if (!category) continue;
          report(
            node,
            new RuleError(
              `タグ「${tag.value}」はカテゴリ「${category}」と同じ語です` +
                "（タグ側を外して、_config.yml の alias でタグURLをカテゴリへ転送します #2291）",
              at(tag.index)
            )
          );
        }
      }

      if (!categories || categories.length === 0) {
        report(node, new RuleError("categories がありません（1記事1カテゴリです）", at(0)));
        return;
      }
      if (categories.length > 1) {
        report(
          node,
          new RuleError(
            `categories は1つだけです（${categories.length}個あります。` +
              "カテゴリ別の集計・一覧は記事1本を1カテゴリで数えます）",
            at(categories[1].index)
          )
        );
      }
      if (categoryNames) {
        for (const category of categories) {
          if (categoryNames.includes(category.value)) continue;
          report(
            node,
            new RuleError(
              `カテゴリ「${category.value}」は source/_data/categories.yml に登録がありません` +
                "（既存の語彙から選ぶか、新設するなら一言説明を書きます #2405）",
              at(category.index)
            )
          );
        }
      }
    },
  };
}

module.exports = reporter;
