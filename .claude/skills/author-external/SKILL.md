---
name: author-external
description: 著者が他の媒体（LEAD TO THE FUTURE・未来報・PR TIMES STORY・NewsPicks・type就活など）に執筆・登場した記事を集め、_profile.yml の external に追記する手順。「他媒体の記事をプロフィールに足して」「〇〇さんの LTTF の記事を載せて」「external を更新して」と頼まれたときに使う。
---

# 他媒体の記事をプロフィールに足す

`_profile.yml` の `external` は、著者ページの「ほかの媒体の記事」に全件が、`/authors/` の「すべての著者」に本数が「+N」で出る。記事末の著者紹介には出さない（#3428）。

## 書き方

```yaml
佐藤一馬:
  about: ...            # 無くてよい
  external:
    - title: "AIエージェントをPoCで終わらせない ―ROIを最大化するAI-BPRと組織デザイン"
      url: https://www.future.co.jp/lttf/detail/261110_ai-bpr/
      media: LEAD TO THE FUTURE
      date: 2026-11-10
```

- キーは**ブログの `author` と同じ表記**（姓名の間に空白なし）。未登録の著者ならキーごと足す
- `title` は媒体のページの見出しそのまま。記号を含むので必ず `"` で囲む
- `media` はフッターの表記に揃える: `LEAD TO THE FUTURE` / `未来報` / `PR TIMES STORY` / `NewsPicks` / `type就活`。それ以外の媒体は媒体自身の名乗りを使う
- `date` は公開日（`YYYY-MM-DD`）。並びはヘルパーが日付で決めるので、書く順は問わない
- 自動で集める仕組みは作らない。名前の表記ゆれと同姓同名は機械では判定しきれないため（出版・寄稿 #2912 と同じ判断）

## 載せるもの・載せないもの

**「その人の記事」と言えるものだけ**を載せる。

| 載せる | 載せない |
| --- | --- |
| 執筆・インタビューを受けた・対談（聞き手も含む）・寄稿 | LT 大会などのレポートで、プログラムに名前と演題が載っているだけ |
| 一人称の節を自分で書いている（司会兼執筆など） | 編集者としてのクレジット、発起人として一度言及されるだけ |
| | 他の人の記事の中でプロフィール付きで紹介されているだけ |

同姓同名の疑い（記事にフューチャーグループの所属が無い）は載せない。

## 集め方

一覧はどの媒体もクライアント側で描画されるので、HTML ではなくページが読むデータを取る。
アクセスは1秒に1回程度に抑える。取得したものは scratchpad に置き、`python3 -I` で解析する。

| 媒体 | 一覧の取り方 | 名前の照合先 |
| --- | --- | --- |
| LEAD TO THE FUTURE | `https://www.future.co.jp/lttf/data.json`（全件） | 登場人物欄 `profile_name_1`〜`6`。外部メディアへの転載・動画も含まれる |
| 未来報 | note の API `https://note.com/api/v2/creators/note_future/contents?kind=note&page=N` を `isLastPage` まで | 本文（`https://note.com/api/v3/notes/<key>`）。署名・インタビュー対象・プロフィール欄 |
| PR TIMES STORY | `https://prtimes.jp/story/ajax/company/4374/stories/latest?limit=200` | 記事末のプロフィール欄 |
| NewsPicks | ユーザーページ `https://newspicks.com/user/6522/` の `__NEXT_DATA__` | 出演者・語り手。**初期データの数件しか取れない**（続きは GraphQL で、手段は未特定） |
| type就活 | `https://typeshukatsu.jp/s/article/industry/it/c-1162-2/`（10件・ページ送りなし） | インタビュー対象 |

- 照合はブログの著者一覧（`source/_posts/*/*.md` の `author:`）と、**姓名の空白（半角・全角）を除いて完全一致**で行う
- 姓だけの著者（`清水` など）は部分一致で拾いやすい。フルネームの別人として出ていないか確かめる
- 一致したら記事を開いて、上の「載せるもの」に当たるかを1件ずつ読んで決める

増分で足すときは、各媒体の一覧を `_profile.yml` の最新の `date` より新しいものに絞ればよい。

## 確かめる

- YAML として読めるか: `node -e "require('js-yaml').load(require('fs').readFileSync('_profile.yml','utf8'))"`
- `scripts/author_profile.js` は起動時にしか読まれないので、`hexo server` を起動し直してから
  `/authors/<著者名>/` と、その著者の記事の末尾を開く
