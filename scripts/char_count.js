'use strict';

/**
 * 記事本文の文字数を数えるヘルパー。
 *
 * 読了時間は出さない。読む速度は個人差が大きく、分数で示すと
 * かえって誠実さを欠くため、客観的な文字数だけを示す。
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
  // mermaid 図は pre.mermaid で出るが、上の pre で拾えなかった場合の保険
  /<script\b[\s\S]*?<\/script>/gi,
  /<style\b[\s\S]*?<\/style>/gi
];

const ENTITIES = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&#39;': "'", '&apos;': "'"
};

function countChars(html) {
  if (!html) return 0;

  let text = html;
  for (const re of BLOCKS) {
    text = text.replace(re, '');
  }

  // 残った要素を落とす。ブロック要素は前後が繋がらないよう空白に置き換える
  text = text.replace(/<[^>]*>/g, ' ');

  text = text.replace(/&(?:nbsp|amp|lt|gt|quot|#39|apos);/g, m => ENTITIES[m]);
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

hexo.extend.helper.register('char_count', label);
