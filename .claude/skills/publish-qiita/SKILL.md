---
name: publish-qiita
description: Qiita の下書き URL と著者名を入力に、hexiita 変換 → フロントマター整備 → カテゴリ・タグ見直し → textlint / markdownlint 対応 → mermaid SVG 生成 → 検証 → PR 作成まで行う記事公開手順。「この Qiita 記事を公開して」と頼まれたときに使う。
---

# Qiita 記事の公開

入力: Qiita 記事 URL（限定共有 `/private/` 可）と著者名（ブログでの表記。Qiita ID ではない）。
連載に属する場合は連載名も聞く。

## 1. 変換（hexiita）

- `source/_posts/<年>/` で同日の既存記事を確認し、postid（a, b, c…）を決める
- リポジトリルートで実行する。カレントの `source/` 配下に記事 MD と画像
  （`source/images/<年>/<記事ID>/`、thumbnail 含む）が出力される

  ```sh
  hexiita <qiita url> YYYYMMDD
  ```

- 連載記事は `-series "連載名"`、索引記事はさらに `-index`。
  フラグは URL より**前**に置く（Go の flag は最初の非フラグ引数で解釈を止める）
- **v0.7.0 以降**を使う。それ以前はフロントマターのキーが `tag:` / `category:`（単数）で
  出て、Hexo が読まずタグもカテゴリも無い記事になる（ビルドは通るので気づきにくい）。
  出力の先頭を見て複数形かどうかを確かめ、古ければ入れ直す

  ```sh
  go install github.com/ma91n/hexiita@v0.7.0
  ```

  版を明示するのは、`@latest` だとタグを push した直後にプロキシが追いつかず
  古い版が入ることがあるため。必要な最低版を書いておけば、入れ直す人も迷わない

## 2. フロントマター整備

- `author:` は Qiita ID のまま出力されるので、指定された著者名に書き換える
- `lede:` の先頭に `![...]` 画像記法の残骸が混入することがあるので除去する
- 同日複数投稿なら `date:` の時刻を postid 順にずらす（a=00:00:00、b=00:00:01。#2055）
- 著者が `_profile.yml` 未登録なら追記する。about は記事冒頭の自己紹介から作り、
  twitter_id / github_id は確実に分かる場合だけ書く（推測で埋めない）

## 3. 画像

- ファイル名が NFD（濁点が分解された形）で出ることがある。`node normalize.mjs` で
  NFC 化する。見た目が同じでも文字列としては一致しないので、置換や grep が
  当たらず気づきにくい
- `alt` にファイル名が入るので空にする（本文で説明済みの装飾画像として扱う）
- 冒頭画像は `top.png` のように意味のある名前へ改める。Qiita 側の名前は
  誤字のことがある（実例: `sumbnail.png`）
- 白地の画像（スライド・白背景のスクリーンショット）は本文と地続きに見えて
  どこまでが画像か分からない。`<img class="bordered" ...>` を付けて縁取る
  （CSS は `theme-styles.styl` の `.article-entry img.bordered`）。
  枠を内蔵した画像や写真では二重線になるので一律には付けない。
  対象は四隅の画素が白かどうかで機械的に判定できる

## 4. カテゴリ・タグ見直し

- カテゴリは CLAUDE.md の既存語彙から。境界ルール（IaC / Infrastructure / DevOps、
  AIDD / DataScience）に照らして確認する
- 同じ催しの連作（登壇レポート等）が既にあれば、カテゴリとタグはそれに揃える。
  読者から見て同じ系統の記事が別のカテゴリに散るのを防ぐ
- タグは具体タグだけ付ける（抽象への接続はオントロジーが肩代わり）。
  `source/_data/tag_ontology.yml` に未登録のタグが増えたら **tag-maintenance スキル**の
  増分追記手順で broader を判断して追記し、`check.mjs` を ERROR ゼロで通す

## 5. lint

```sh
node_modules/.bin/textlint --fix <path>            # 自動修正
node_modules/.bin/textlint <path>                  # 残エラー確認。ゼロになるまで
node_modules/.bin/markdownlint-cli2 --fix "<path>" # 見出し表記ゆれ（heading-vocab）等
```

- `--fix` の exit 0 は lint クリーンを意味しない。max-ten（読点4つ以上）と
  no-doubled-joshi（同一助詞の重複）は残り、放置すると reviewdog が PR の全行に
  コメントする。意味を変えない語順調整で手修正する
  - max-ten は読点1つの削除か文の分割が安全
  - 罠: 読点区切りの列挙は助詞重複が許容されるが、読点を `・` に替えると
    no-doubled-joshi が新たに発火する
- 誤検知（固有名詞等）は `.textlintrc` の `filters.allowlist.allow` に追加して黙らせる。
  発表タイトルのように書き換えられない語に含まれる助詞重複もこれで通す
- markdownlint の MD025（複数の h1）は Qiita 由来の記事で必ず出る。Qiita は `#` で
  節を切るため。記事の見出しは `##` 始まりへ1段下げる（既存記事もそう）

## 6. mermaid 図（記事にある場合のみ）

```sh
make mermaid   # Docker 必須
```

`source/_mermaid/*.svg` が生成されるので、記事とあわせてコミットする。

## 7. 検証

- `hexo generate` を通す（worktree の初回はキャッシュが無くフルビルドで数分かかる）
- 生成 HTML（`public/articles/<記事ID>/index.html`）で確認する:
  - mermaid 図がインライン SVG になっているか（`<svg id="mermaid-`）
  - author・タグ・thumbnail
  - プロフィールを追記した場合は著者ページ `public/authors/<著者名>/`
- ユーザーの目視確認用にローカルサーバを起動して URL を伝える。
  4001〜4004 は並行セッションが使っていることがあるので、`ss -tlnp` で
  空きポートを確認してから `hexo server -p <port>` する

## 8. PR

- コミット対象: 記事 MD / 画像ディレクトリ / `source/_mermaid/*.svg` /
  （変更していれば）`_profile.yml` / `.textlintrc` / `tag_ontology.yml`
- worktree では `gh pr create` に `--head <branch> --base main` を明示する
  （省略すると push 済みでも "must first push the current branch" で失敗する）。
  PR 本文は `--body-file` で渡す
- マージ確認を待ち、レビュー指摘は同じ PR に追いコミットで対応する（force push しない）
