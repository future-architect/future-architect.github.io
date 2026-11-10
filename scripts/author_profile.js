'use strict';

const loadYamlFile = (filename) => {
  const fs = require('fs');
  const yaml = require('js-yaml');
  const yamlText = fs.readFileSync(filename, 'utf8');
  return yaml.load(yamlText);
};

const profile = loadYamlFile('./_profile.yml');

// 著者プロフィールの生データ。JSON-LD (#2462)・記事末の著者紹介・著者ページが読む。
// HTML を組み立てて返さないのは、アイコンの絵柄を _partial/svg-icon.ejs の辞書
// 1箇所に持たせるため。JS の中でリンクを作ると絵柄が二重になり、
// textlint の外部リンク検査からも見えなくなる (#2774)
hexo.extend.helper.register('get_profile_data', (authorName) => profile[authorName] || null);

// 他の媒体の記事 (#3428)。新しい順。日付は YAML が Date に読むので文字列に戻す
hexo.extend.helper.register('author_external', (authorName, limit) => {
  const items = ((profile[authorName] || {}).external || [])
    .map((e) => ({
      ...e,
      date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date || ''),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return limit ? items.slice(0, limit) : items;
});
