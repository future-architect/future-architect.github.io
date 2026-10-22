'use strict';

/**
 * 記事本文の文字数と、読み終えるまでの目安を出すヘルパー。
 *
 * 目安は表示せず title で添える。読む速度は個人差が大きく、
 * メタ行に分数を並べると客観的な数字に見えてしまうため。
 *
 * 「読む労力の目安」として意味のある数字にするため、以下を除外する。
 *
 * - コードブロック … 一字一句読むものではなく、本文の文章量とは性質が違う
 * - <details> の中身 … 既定で閉じており、初期状態の「読む量」に含めるのは不自然
 *
 * インラインコード（<code> 単体）は本文の流れの一部なので含める。
 */

// hexo の highlight は figure.highlight を出す。pre は Markdown 由来の
// コードブロックや、ハイライトされなかったコードを拾うために併記する
const BLOCKS = [
  /<figure\b[^>]*\bclass="[^"]*\bhighlight\b[^"]*"[\s\S]*?<\/figure>/gi,
  /<details\b[\s\S]*?<\/details>/gi,
  /<pre\b[\s\S]*?<\/pre>/gi,
  // ビルド時SVG化した mermaid 図（#1955）。foreignObject 内のラベルを数えない
  /<svg\b[\s\S]*?<\/svg>/gi,
  /<script\b[\s\S]*?<\/script>/gi,
  /<style\b[\s\S]*?<\/style>/gi,
];

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

function countChars(html) {
  if (!html) return 0;

  let text = html;
  for (const re of BLOCKS) {
    text = text.replace(re, '');
  }

  // 残った要素を落とす。ブロック要素は前後が繋がらないよう空白に置き換える
  text = text.replace(/<[^>]*>/g, ' ');

  text = text.replace(/&(?:nbsp|amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m]);
  // 上で拾えなかった数値参照・名前付き参照はまとめて1文字とみなす
  text = text.replace(/&#?\w+;/g, '*');

  // 日本語の本文は空白をほとんど含まないため、空白は数えない。
  // 含めると英語主体の記事だけ水増しされて比較できなくなる
  return text.replace(/\s+/g, '').length;
}

// 端数まで出しても読者の判断は変わらないので、100文字単位に丸める。
// 1000未満は丸めが効きすぎるので50文字単位にする
function round(n) {
  if (n < 100) return n;
  const unit = n < 1000 ? 50 : 100;
  return Math.round(n / unit) * unit;
}

function label(post) {
  const n = round(countChars(post.content));
  if (n === 0) return '';
  return `約 ${n.toLocaleString('en-US')} 文字`;
}

// 日本語の黙読は 400〜600字/分と言われる。技術文なので帯の中ほどを取る
const CHARS_PER_MIN = 500;
// コードは記号とインデントで文字数が膨らむので、行で数える
const SEC_PER_CODE_LINE = 2;
// 端末の画面・出力・シェルのコマンド列は流し読みされる
const SEC_PER_SKIM_LINE = 0.5;
const SKIM_LANGS = new Set(['console', 'sh', 'bash', 'text', 'plaintext', 'txt', 'log']);
const SEC_PER_IMAGE = 3;

const FIGURE = /<figure\b[^>]*\bclass="([^"]*\bhighlight\b[^"]*)"[\s\S]*?<\/figure>/gi;
const PRE = /<pre\b[\s\S]*?<\/pre>/gi;

function extraSeconds(html) {
  let sec = 0;
  // details の中は開かずに読み終える人が多いので数えない
  const body = html.replace(/<details\b[\s\S]*?<\/details>/gi, '');
  // 1x1 は計測ピクセルで、読む対象ではない
  const images = (body.match(/<img\b[^>]*>/gi) || []).filter((tag) => !/\bwidth="1"/.test(tag));
  sec += images.length * SEC_PER_IMAGE;
  const rest = body.replace(FIGURE, (block, cls) => {
    const lang = cls.split(/\s+/).find((c) => c && c !== 'highlight');
    const lines = (block.match(/<span class="line">/g) || []).length;
    sec += lines * (SKIM_LANGS.has(lang) ? SEC_PER_SKIM_LINE : SEC_PER_CODE_LINE);
    return '';
  });
  for (const block of rest.match(PRE) || []) {
    sec += block.split('\n').length * SEC_PER_CODE_LINE;
  }
  return sec;
}

function readingTime(post) {
  const html = post.content;
  if (!html) return '';
  const min = countChars(html) / CHARS_PER_MIN + extraSeconds(html) / 60;
  const text = min < 1 ? '1分未満' : `約 ${Math.round(min)} 分`;
  return `読み終えるまでの目安は${text}です`;
}

hexo.extend.helper.register('char_count', label);
hexo.extend.helper.register('reading_time', readingTime);
