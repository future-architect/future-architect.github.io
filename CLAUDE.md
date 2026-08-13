# CLAUDE.md

フューチャー技術ブログ（https://future-architect.github.io ）のソースリポジトリ。
Hexo 7.3 製の静的サイトで、GitHub Pages にホスティングされている。

## 構成

| パス | 役割 |
| --- | --- |
| `source/_posts/<年>/` | 記事本体（Markdown）。年ごとのディレクトリに分かれる |
| `source/images/<年>/<記事ID>/` | 記事ごとの画像。`thumbnail.jpg` / `top.jpg` を置くのが慣例 |
| `source/_mermaid/` | mermaid 図のSVGキャッシュ（`make mermaid` が生成。手で編集しない） |
| `themes/future/` | 自作テーマ。`layout/*.ejs`（EJS）と `source/css/`（Stylus） |
| `scripts/` | Hexo の generator / helper 拡張（著者ページ、タグ、SNSカウント、OGPプレビューなど） |
| `scaffolds/` | `hexo new` のテンプレート |
| `_config.yml` | Hexo 本体設定（permalink、alias によるURLリダイレクト等） |
| `themes/future/_config.yml` | テーマ設定（メニュー、GA4 プロパティ、SNSリンク） |
| `_profile.yml` | 著者プロフィール（about / twitter_id / github_id） |

コードの置き場所は **URL ではなく部品の種別**で決める。
`layout/` 直下＝ページ種、`_partial/`＝共有部品、`_widget/`＝サイドバー、`scripts/`＝機能単位＋`lib/`。
URL は読者向け、コード配置は保守者向けの分類なので、鏡合わせにすると URL を変えるたびにコード移動が要る。
`/specials/` のような名前空間を切っても `layout/specials/` は作らない。
同じ系統のレイアウトが3〜4本に増えて見通しが悪くなったら、そのとき分ける（#2369）。

## 記事の書き方

ファイル名は `source/_posts/<年>/YYYYMMDD<postid>_<タイトル>.md`。
`postid` は同日複数投稿を区別する `a`, `b`, `c`…。公開URLは `/articles/YYYYMMDD<postid>/`。

フロントマターは以下の形式（キーは Hexo 標準の `tags` / `categories` と複数形）:

```yaml
---
title: "Go 1.27 リリース連載： uuid"
date: 2026/08/04 00:00:00
postid: a
tags:
  - Go
  - Go1.27
  - UUID
categories:
  - Programming
series: "Go 1.27 リリース連載"
thumbnail: /images/2026/20260804a/thumbnail.jpg
author: 武田大輝
lede: "Go 1.27 で標準ライブラリに追加されたuuidパッケージを扱います。"
---
```

- `categories` は既存の語彙から選ぶ。使用実績（記事数）: Programming 325 / Infrastructure 145 / DevOps 140 / Frontend 134 / Culture 129 / DataScience 100 / DB 69 / Mobile 57 / IaC 57 / IoT 53 / Business 48 / DataEngineering 44 / AIDD 44 / Management 41 / Security 36 / 認証認可 24 / VR 20
  - `AI` は `AIDD` に、`Design` は `UI/UX` タグに統合済み。`_config.yml` の `alias` で転送している
  - 基盤系3カテゴリの境界（#2057）: **基盤をコードで書く話は `IaC`**（Terraform / Ansible / CDK 等）、
    **基盤そのものの設計・構築は `Infrastructure`**（クラウド・ネットワーク・OS）、
    **作った後を回す仕組みは `DevOps`**（CI/CD・コンテナ・監視・保守運用）。
    どのクラウドかは場所であって主題ではないので、カテゴリではなくタグ（AWS / GoogleCloud）が担う
  - AIDD と DataScience の境界（#2293）: **生成AI・LLM を道具として使う話は `AIDD`**
    （アプリ・エージェント開発、プロンプト、活用Tips、社内展開）、
    **モデル・データそのものが主題なら `DataScience`**（モデル開発・学習・評価、NLP研究、学会・論文、データ分析）。
    LLM を「作る」話（基盤モデル構築）や LLMOps・実験管理は DataScience 側に置く
- `author` は `_profile.yml` に未登録なら追記する。**1記事1名**（配列にしない）。
  共著は著者ごとの集計・一覧・チャートで扱いが分かれ、規則が追えなくなる
- `date` は同日に複数投稿するとき、`postid` の順に時刻をずらす（`a` は `00:00:00`、`b` は `00:00:01`）。
  完全に同じ日時だと一覧の並びが同着になり、ビルドごとに順序が入れ替わる（#2055）
- `lede` は一覧・OGP に出る概要文
- 画像は `<img src="/images/2026/20260804a/xxx.jpg" alt="" width="1024" height="559" loading="lazy">` のように実寸の width/height を明記する
- 連載記事は冒頭で `[連載名](/articles/20260728a/) の N 本目です。` と相対リンクで親記事を参照する
- `series` は連載への所属。値がそのまま連載名として表示され、記事末に前 / 次 と索引へのリンクが出る（`scripts/series.js`）
  - **3本そろってから連載にする。** 2本では前後リンクが片方しか出ず、連載として扱う意味が薄い
  - 連載名をタグで表さない。`series` に書く。タグで表していたものは `alias` で先頭記事へ転送する（#2374）
  - 値はグループ化のキーと表示名を兼ねる。表示は「連載：<値>」なので **末尾に「連載」「企画」は付けない**（`Go1.27リリース`、`CI/CD`）
  - 年ごとに続く企画は年を付けて区別する。括弧は使わない（`春の入門祭り2025`、`秋のブログ週間2023`）。索引記事のタイトルと同じ表記になる
  - バージョン番号はタグの表記に合わせる（`Go1.27リリース`。`Go 1.27` ではない）
  - 索引記事は `series` に加えて `インデックス` タグを付ける。連載を束ねる年間企画（「2026年 フューチャー技術ブログリレー企画」など）には `series` を付けない
  - 並び順は日付昇順。「N本目」は表示しない。本文が名乗る番号と日付順の位置は70連載中37件でズレており、機械が本文と違うことを言う方が害が大きい

新規記事を追加したら、画像ディレクトリ `source/images/<年>/<記事ID>/` も併せて作る。

## コマンド

```sh
make s      # ローカルサーバ（http://localhost:4000）
make g      # 静的ファイル生成（public/）
make clean  # キャッシュ・生成物の削除
make fix    # textlint --fix（source/_posts 配下）
make fmt    # markdownlint-cli2 --fix ＋ prettier（scripts/*.js と *.mjs のみ。記事MDは対象外 #2307）
make lint   # npx lint-staged（git add 済みの記事のみ textlint）
make mermaid # mermaid 図のSVGキャッシュ更新（Docker必須、記事の図を追加・編集したら実行してコミット）
```

記事を書き換えたら `make fix` か、対象ファイルだけの
`node_modules/.bin/textlint --fix <path>` を通してから push する。

## Lint ルール

- `.textlintrc`: `preset-ja-technical-writing` + `spellcheck-tech-word`。一文200文字まで、漢字連続10文字まで。感嘆符・疑問符と弱い表現は許容
  - 誤検知は `.textlintrc` の `filters.allowlist.allow` に単語を追加して黙らせる
  - `spellcheck-tech-word` は「インターフェース→インタフェース」「% → ％」など表記統一を強制する
- `.markdownlint-cli2.jsonc`: 行長・生URL・インラインHTMLなどは無効化済み
- PR には reviewdog が textlint を回し、変更行にレビューコメントを付ける（`.github/workflows/reviewdog.yml`）

## ブランチ / デプロイ

- 作業は `feature` ブランチで行い、`main` へ PR を出してマージする
- `main` への push で `.github/workflows/deploy.yml` が hexo generate → GitHub Pages へデプロイ

## 手で編集しないファイル

以下は GitHub Actions（`update-cache.yml`、毎日 9:00 JST）が生成・コミットする:

- `sns_count_cache.json` / `ga_cache.json` / `ga4_pv.json` — SNSシェア数・GA の PV キャッシュ
- `temp.json` — `snssharecount` の出力用一時ファイル
- `db.json`（112MB、gitignore 済み）— Hexo のビルドキャッシュ

`normalize.mjs` は日本語ファイル名・本文の Unicode NFC 正規化を行うスクリプトで、
週次ワークフロー（`normalize.yml`）から実行され PR を作る。手動実行は `node normalize.mjs`。

## CSS / 文字サイズの方針

CSS は `themes/future/css-src/` にあり、`scripts/combine_css.js` が
bootstrap-subset → metronic → theme-styles.styl の順で `/css/site.css` に連結する。
**この順序は後勝ちの前提なので変えると表示が壊れる。**

文字サイズは過去に「どこで最終値が決まるか追えない」ことが原因の不具合を
2回出している（#1927 / #1928）。以下を守る。

- **1つの要素のサイズは1箇所でしか決めない。** 幅によって変える場合は
  メディアクエリを重ねず `clamp(下限, 可変, 上限)` で1行にまとめる。
  記述順に依存しなくなり、幅の変化に対しても連続する
- **`clamp` の中で演算するときは `unquote()` で囲む。**
  Stylus は `1rem + 0.4vw` の単位を同一視して `1.4rem` に計算してしまい、
  「可変にしたつもりが固定」になる。**描画結果を見ないと気づけない**ため、
  この罠は #1983 と #2008 で2回踏んでいる

  ```styl
  // NG: clamp(17px, 1.4rem, 20px) に潰れて常に 20px になる
  font-size: clamp(17px, 1rem + 0.4vw, 20px)
  // OK
  font-size: unquote('clamp(17px, 1rem + 0.4vw, 20px)')
  ```

- **ブラウザ既定のサイズに頼らない。** 指定が無いと UA スタイルシートの値が
  効き、CSS を読んでも実効サイズが分からない。`h1.list-page` がこの状態だった（#2004）
- 実効サイズの基準:

  | 対象 | 値 | 指定箇所 |
  | --- | --- | --- |
  | `body` | 13px | `theme-styles.styl` |
  | 本文（`p` / `li` / `summary`） | `1.2em` = 15.6px | 〃 |
  | 記事タイトル | `clamp(24px, 1.325rem + 0.9vw, 32px)` | 〃（1箇所のみ） |
  | クラス無しの `h2`（関連記事・We're hiring 等） | `1.85em` = 24.05px | 〃 |
  | サイドバーの `h2` | `1.4em` = 18.2px | 〃 |
  | 本文見出し h1〜h5 | `2.0 / 1.85 / 1.7 / 1.55 / 1.4em` = 26 / 24.05 / 22.1 / 20.15 / 18.2px | 〃 |
  | 一覧ページの見出し `.list-page` | 記事タイトルと同じ（`.article-title` と同一ルール） | 〃 |
  | 一覧ページの統計（数値 / ラベル） | `clamp(17px, 1rem + 0.4vw, 20px)` / 12px | 〃 |
  | 脚注（`#footnotelist li`） | `1em` = 13px | 〃 |
  | 記事概要文 `.lede`（一覧 / We're hiring カード） | `1.2em` = 15.6px / 継承 = 13px | 〃 |
  | コードブロック | 13px（`line-height` は `font-size × 1.6` で追従） | `highlight.styl` の変数 |

- コードブロックのサイズは本文との相対バランスを見て 15px → 14px → 13px と
  調整した経緯がある（#1927 / #1929）。安易に変えない
- 色を変えるときは WCAG AA（コントラスト比 4.5）を満たすか計算してから入れる

## その他

- URL の付け替え（タグ→カテゴリの統合、タグの名寄せ）は `_config.yml` の `alias` に記述する
- **特設・固定ページはルート直下に置かず `/specials/` 配下に切る**（#2344）。
  GitHub Pages のプロジェクトサイトが `future-architect.github.io/<リポジトリ名>/` に生えるため、
  ルート直下のパスは将来のリポジトリ名と衝突しうる（/arch-guidelines/ 等は既に別リポジトリが占有）。
  `tags/` `categories/` 等の既存コア機能パスは既得として維持する
- 画像圧縮は pngquant / jpegoptim（`jpegoptimall.bat`）を月次で回す運用。詳細は README.md
