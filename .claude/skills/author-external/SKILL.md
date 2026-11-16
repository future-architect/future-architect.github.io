---
name: author-external
description: 著者がブログの外で発信したもの（LEAD TO THE FUTURE・未来報・PR TIMES STORY・NewsPicks・type就活の記事、Tech Cast の出演回、Qiita のアドベントカレンダー）を集め、_profile.yml の external に追記する手順。「他媒体の記事をプロフィールに足して」「〇〇さんの LTTF の記事を載せて」「Tech Cast やアドカレを著者ページに載せて」「external を更新して」と頼まれたときに使う。
---

# ブログの外での発信をプロフィールに足す

`_profile.yml` の `external` は、著者ページの「ほかの媒体での発信」に全件が、`/authors/` の「すべての著者」に件数が「+N」で出る。記事末の著者紹介には出さない（#3428）。

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
- `title` は行き先のページの見出しそのまま。記号を含むので必ず `"` で囲む
- `media` はフッターの表記に揃える

  | 種類 | `media` | `url` | `title` | `date` |
  | --- | --- | --- | --- | --- |
  | 企業情報の媒体 | `LEAD TO THE FUTURE` / `未来報` / `PR TIMES STORY` / `NewsPicks` / `type就活` | 記事 | 記事の見出し | 公開日 |
  | Tech Cast | `Tech Cast` | Spotify のエピソード | エピソード名（`#12 …` の番号ごと） | 配信日 |
  | アドベントカレンダー | `アドベントカレンダー` | Qiita の記事 | 記事の見出し | カレンダーの日（`YYYY-12-DD`） |

  それ以外の媒体は媒体自身の名乗りを使う
- `date` は `YYYY-MM-DD`。並びはヘルパーが日付で決めるので、書く順は問わない
- 自動で集める仕組みは作らない。名前の表記ゆれと同姓同名は機械では判定しきれないため（出版・寄稿 #2912 と同じ判断）

## 載せるもの・載せないもの

**「その人の発信」と言えるものだけ**を載せる。

| 載せる | 載せない |
| --- | --- |
| 執筆・インタビューを受けた・対談（聞き手も含む）・寄稿 | LT 大会などのレポートで、プログラムに名前と演題が載っているだけ |
| 一人称の節を自分で書いている（司会兼執筆など） | 編集者としてのクレジット、発起人として一度言及されるだけ |
| Tech Cast のゲストとパーソナリティ | Tech Cast の編集・レビュアー・ジングル作曲だけのクレジット |
| | connpass の登壇（登壇レポートの記事がブログにあることが多く、著者ページの記事一覧と重なる） |
| | 他の人の記事の中でプロフィール付きで紹介されているだけ |
| | ブログに転載済みのアドベントカレンダー記事（ブログの記事一覧に既に出ている） |

同姓同名の疑い（記事にフューチャーグループの所属が無い）は載せない。**誰か確かめきれないものも載せない**。

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
| Tech Cast | RSS `https://anchor.fm/s/2890e980/podcast/rss`（全話） | 概要欄。#20 以降は末尾の `ゲスト：` `パーソナリティ：`、それより前は冒頭の「ゲスト◯◯さん、パーソナリティ◯◯さん」。**姓だけの回が多い**ので、本文の姓とブログの著者を突き合わせる |
| アドベントカレンダー | `source/_data/advent_calendar.yml` の各年の URL。ページの `data-js-react-on-rails-store="AppStoreWithReactOnRails"` の JSON の `items`（シリーズ2以降も同じ配列に入る。2019年だけ別 URL の `future2`） | 下記 |

- 照合はブログの著者一覧（`source/_posts/*/*.md` の `author:`）と、**姓名の空白（半角・全角）を除いて完全一致**で行う
- 姓だけの著者（`清水` など）は部分一致で拾いやすい。フルネームの別人として出ていないか確かめる
- 一致したら行き先を開いて、上の「載せるもの」に当たるかを1件ずつ読んで決める

### アドベントカレンダーの書き手

`items` の書き手も**Qiita のユーザー名**。Qiita のアカウントと実名の紐づけを嫌がる人がいるので、
**本人が記事の中で宣言しているものだけ**を載せる。

- **基本は GitHub / X のアカウントで突き合わせる。** Qiita のプロフィールに書かれた GitHub / X のアカウント
  （ユーザーページの `githubLoginName` / `twitterUrl`）が、ブログ側でもその著者のものと判別できるときだけ載せる。
  ブログ側の判別は `_profile.yml` の `github_id` / `twitter_id`、またはその著者のブログ記事に
  `github.com/<ID>` / `x.com/<ID>`（`twitter.com/<ID>`）へのリンクがあること
- 例外は、Qiita の記事の自己紹介で**姓と名が完全一致**するもの（「TIGの伊藤太斉です」）

次のものは推測なので、それだけでは載せない: 姓だけの自己紹介、ローマ字の表示名、ブログ記事から Qiita へのリンク。

ブログの記事（`future-architect.github.io`）を登録した枠は載せない。リバイバル企画（「以前Qiitaに投稿した記事」）などでブログに転載したものも、題か Qiita の URL で突き合わせて外す。
公開前の枠（`isRevealed` が false）は載せない。

増分で足すときは、各媒体の一覧を `_profile.yml` の最新の `date` より新しいものに絞ればよい。

## 確かめる

- YAML として読めるか: `node -e "require('js-yaml').load(require('fs').readFileSync('_profile.yml','utf8'))"`
- キーがブログの著者名と一致しているか（一致しないと著者ページに出ない）
- `scripts/author_profile.js` は起動時にしか読まれないので、`hexo server` を起動し直してから
  `/authors/<著者名>/` と、その著者の記事の末尾を開く
