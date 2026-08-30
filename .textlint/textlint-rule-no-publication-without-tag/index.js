/**
 * frontmatter に books / magazines を書いた記事は「出版」タグを持つ (#3101)。
 *
 * /specials/publications/ の一覧は books / magazines から作り、同じページの
 * 「関連タグ」は「出版」タグを指す。片方だけ書くと一覧には載るのにタグページには
 * 出ない記事ができる。答えが決まっている検査なので /doctor ではなく linter に置く (#2706)。
 *
 * frontmatter は textlint の AST に中身が出ないので、原文の先頭の `---` ブロックを
 * 自分で読む（no-invalid-post-taxonomy と同じ）。どのタグを付けるかは決まっているが、
 * 位置（tags の並びのどこか）は書き手に任せるので --fix は持たない。
 */
const path = require("path");

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?\r?\n)---/;
const REQUIRED_TAG = "出版";

function unquote(value) {
  return value.replace(/^["']|["']$/g, "").trim();
}

// tags の値を読む。ブロック形式（`- 値`）とフロー形式（`[a, b]`）の両方を受ける
function readTags(frontMatter) {
  const head = /^tags:[ \t]*(.*)$/m.exec(frontMatter);
  if (!head) return null;
  const inline = head[1].trim();
  if (inline.startsWith("[")) {
    return inline
      .slice(1, inline.lastIndexOf("]"))
      .split(",")
      .map((raw) => unquote(raw))
      .filter(Boolean);
  }
  const items = [];
  for (const line of frontMatter.slice(head.index + head[0].length + 1).split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (!item) break;
    const value = unquote(item[1]);
    if (value) items.push(value);
  }
  return items;
}

function reporter(context) {
  const { Syntax, RuleError, report, getSource } = context;
  const filePath = context.getFilePath() || "";
  if (!/\.md$/i.test(filePath) || !filePath.includes(`${path.sep}source${path.sep}_posts${path.sep}`)) {
    return {};
  }
  return {
    [Syntax.Document](node) {
      const source = getSource(node);
      const matched = FRONT_MATTER_RE.exec(source);
      if (!matched) return;
      const frontMatter = matched[1];
      const publication = /^(books|magazines):/m.exec(frontMatter);
      if (!publication) return;
      const tags = readTags(frontMatter) || [];
      if (tags.includes(REQUIRED_TAG)) return;
      const tagsAt = frontMatter.indexOf("tags:");
      const base = node.range[0] + matched[0].indexOf(frontMatter);
      report(
        node,
        new RuleError(
          `${publication[1]} を書いた記事には「${REQUIRED_TAG}」タグを付けます` +
            "（/specials/publications/ の一覧と関連タグの行き先をそろえるため #3101）",
          { index: base + (tagsAt < 0 ? publication.index : tagsAt) }
        )
      );
    },
  };
}

module.exports = reporter;
