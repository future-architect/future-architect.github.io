---
name: issue-workflow
description: GitHub issue 番号を渡されたときのサイト改修の進め方。issue を読む → あるべき論を実データ付きで合意 → 実装 → 生成物で検証 → PR → 動作確認サーバの URL と確認ポイントを提示 → CI 合否を確認、までを1往復で行う。「#2572 着手して」「この issue やって」と頼まれたときに使う。記事の公開は publish-qiita、タグ整理は tag-maintenance が担当。
---

# issue に着手する

サイト（テーマ・`scripts/`・CSS）の改修を issue 番号から進める手順。
**PR を出して終わりではなく、動作確認サーバの URL と確認ポイントを渡すまでが1回分。**

## 1. issue を読む

```sh
gh issue view <n>
```

- issue 本文は数行のことが多い。**書かれている値や案を鵜呑みにしない**。
  背景にある過去の議論を `gh issue view` / `gh issue list --search` で辿る。
  CLAUDE.md の該当節（カテゴリ境界・CSS の文字サイズ・特設ページの置き場所など）も見る
- 隣接する issue が同じ範囲に触っていないか確かめ、触っていれば**この PR の範囲外**と明言する
  （1 issue 1 PR。分割も統合もしない）

## 2. あるべき論を先に出す

**実装より先に、実データを数えて提案する。** issue の言葉のまま作ると、
数字を出してみて初めて「思っていたのと違う」が分かる。

- `source/_posts/**/*.md` のフロントマターを直接集計するスクリプトを scratchpad に書いて数える。
  Hexo を起動しなくてよく、数秒で済む
- 見せ方の選択肢は `AskUserQuestion` で合意する。役割と比較対象（既にサイトにある似た部品）を添える
  - **preview に罫線（`┌─┐`）を使わない。** 日本語の幅が合わず崩れる
  - 選択肢には既存部品の名前を出す（「カテゴリ個別ページと同じ `summary-panel` の対」）
- 不具合と仕様が明確なものは、この節を飛ばしてそのまま実装してよい

## 3. 実装

- 置き場所は**部品の種別**で決める（CLAUDE.md「構成」）。URL とコードの構造を鏡合わせにしない
- 同じ見た目のものは同じ部品を使う。新しいクラスを足す前に
  `summary-panel` / `section-heading` / `post-panel-grid` / `svg-icon` に無いか探す
- アイコンは `_partial/svg-icon.ejs` の辞書に1箇所で持つ。Tabler Icons v3.31 に
  合う絵柄が無ければ既存パスに1〜2本足して自作してよい。その場合は
  **候補を実寸と拡大で並べた比較ページを Artifact で出して選んでもらう**
  （見出しに入れたときの見え方は、拡大では判断できない）

## 4. 検証

| 変えたもの | 回すもの |
| --- | --- |
| CSS（`css-src/*.styl`） | `make css`（0.3秒）だけ |
| `.ejs` / `scripts/` / 記事 | `npx hexo generate`（1分半。`run_in_background` で投げて他の作業を進める） |
| `scripts/` のフィルタ | `make clean` してから `hexo generate`（`db.json` のキャッシュが効いて既存記事に反映されない） |

- **生成 HTML を機械で確かめる。** `grep` の一致だけで「反映されました」と報告して
  誤報を出したことがある。python で該当セクションを切り出して中身を出す

  ```sh
  python3 -c "h=open('public/series/index.html',encoding='utf-8').read();i=h.find('<h1');print(repr(h[i:i+600]))"
  ```

- **出した数字は独立に計算して突き合わせる。** 生成物の値と、フロントマター直接集計の値が
  一致することまで見る（2 の集計スクリプトを使い回せる）
- `scripts/*.js` を触ったら `npx prettier --check`。記事を触ったら `make fix` と素の textlint

## 5. PR

- ユーザーの確認を待たずに、実装 → 検証 → コミット → push → `gh pr create` まで通しでやる
- 本文には**やったこと・数字・判断の理由**を書く。統計を出す改修なら表で before/after を出す。
  範囲外にした隣接 issue もここで明言する
- 手直しは**同じ PR に追加コミット**。force push しない（Squash Merge なので利点が無い）
- **マージはしない。** 内容への同意はマージ依頼ではない

## 6. 動作確認サーバを起動して URL を渡す

PR を出したら、続けてサーバを起動する。ユーザーに起動を頼まない。

```sh
ss -tlnp | grep 400   # 並行セッションが 4001〜 を使っていることがある
npx hexo server -p <port>   # run_in_background で投げる
```

- 起動待ちは background に投げた until ループで行う
  （`until curl -s -o /dev/null --max-time 3 http://localhost:<port>/<path>; do sleep 5; done`）
- **配信中の HTML を curl して、変更が乗っていることを確かめてから URL を出す**
- `hexo server` は `scripts/` を起動時にしか読まない。`scripts/` を編集したら kill して起動し直す。
  落とす前に `readlink /proc/<pid>/cwd` で自分の worktree のサーバか確認する
- 提示は次の形にする。URL だけ置かない

  - **確認してほしい URL**（変更が出るページ）
  - **確認ポイント**（何がどう変わったか。数字は本文にも書く）
  - **比較用の URL**（同じ部品を使っている既存ページ。揃っているかを見てもらう）

## 7. CI は1回だけ見る。完走は待たない

```sh
gh pr view <n> --json headRefOid -q .headRefOid
gh api repos/future-architect/future-architect.github.io/commits/<sha>/check-runs \
  -q '.check_runs[] | "\(.name) \(.status) \(.conclusion)"'
```

- `gh pr checks <n>` は直前のコミットの結果を出していることがある。
  **追いコミットの後は head の sha で確かめる**
- **`in_progress` / `queued` なら、そこで見るのをやめる。** 完走を待つと1往復が終わらない。
  この環境では background に投げた待機（`sleep` やポーリングのループ）が
  短く打ち切られて空振りするため、何度投げても結果は取れない
- 待たない代わりに、**CI と同じことをローカルで回した結果を報告に書く**。PR の CI は2本とも
  手元で再現できるので、CI はゲートではなく確認でよい
  - reviewdog（textlint）: 変更した記事に `node_modules/.bin/textlint`
  - prettier: `npx prettier --check "scripts/**/*.js" "*.mjs"`（ワークフローと同じ対象）
- `mergeable` は CI の合否を含まない。**それだけで「マージできます」と言わない。**
  実行中なら「まだ実行中、ローカルでは同じチェックが通っている」と正直に書き、
  最終結果は PR 画面で見てもらう
