---
title: "npm audit は 0 件、でも安定版は 3 年出ていない ―― Claude Code が入れた exceljs を、Claude Code 自身に外させた"
date: 2026/11/04 00:00:00
postid: a
tags:
  - Claude
  - AIエージェント
  - uzomuzo
  - npm
  - OSS
categories:
  - AIDD
thumbnail: /images/2026/20261104a/thumbnail.png
author: 神戸康多
lede: "Claude Code に Excel を読む処理を頼むと exceljs を入れ、npm audit の指摘まで手当てしました。ただ、exceljs の安定版は 2023 年 10 月から出ていません。保守状況を調べる OSS の uzomuzo で確かめさせると、Claude Code は自分で別のライブラリに入れ替えました。頼み方は変えず、skill を 1 つ置いただけです。"
---

[Vuls](https://github.com/future-architect/vuls) 作者の神戸です。最近は、OSS の保守状況を調べるツール [uzomuzo](https://github.com/future-architect/uzomuzo-oss) を作っています。2026 年 4 月には、uzomuzo を使って保守の止まった依存を見つけて減らす話を、CVE や脆弱性管理の関係者が集まる国際会議 [VulnCon 2026](https://www.first.org/conference/vulncon26/) で発表しました（[発表の報告](https://www.vuls.biz/blog/vulncon-2026-speaked)）。

## 要点

| 項目 | 内容 |
| --- | --- |
| 現状 | AI エージェント（ここでは Claude Code）にコードを頼むと、必要なライブラリを AI が自分で選んで入れる。Excel を読む処理を頼むと `exceljs` を入れ、`npm audit` で見つかった脆弱性も自分で手当てした |
| 課題 | `exceljs` の安定版は 2023 年 10 月から出ていない。AI は「脆弱性があるか」は調べたが、「作っている人が今も直しているか」は調べなかった。PR にも、何を比べて選んだかが残らない |
| 解決 | 保守状況を調べる uzomuzo と、それを依存の追加前に使わせる手順書（Claude Code の skill）を置いた。頼み方は変えていない |
| 結果 | 見直しを頼むと、AI は自分で `read-excel-file` に入れ替え、入っているパッケージは 193 個から 7 個になった。最初から skill を置くと、同じ課題で `exceljs` を選んだ回は 10 回中 0 回（skill なしでは 6 回中 6 回）。比べた候補と、決めたのが AI であることが記録に残る |
| 限界 | 判定は保守状況であって安全の保証ではない。入れ替えで機能が減ることもある。skill は呼ばれないこともある |

以下、実際のやり取りを順に見せたあと、何度試しても同じことが起きるかを確かめた結果と、この仕組みでは防げないことを書きます。

## 1 回目: Claude Code は exceljs を選んだ

試したのは、`.xlsx` を POST で受け取って中身を JSON にして返す、小さな Node.js のサーバです。`sheetToRows` の中身だけが空です。

```js index.js
// Converts an uploaded .xlsx file (as a Buffer) into an array of objects.
async function sheetToRows(buffer) {
  // TODO: read the first sheet; use the first row as keys, one object per following row
  throw new Error("not implemented");
}
```

頼んだ文は次のとおりです。ライブラリの名前も「ライブラリ」という言葉も入れていません。

```text
index.js の TODO を実装して。受け取った .xlsx ファイルの最初のシートを、1 行目を見出しにしたオブジェクトの配列にして返す。質問はせずに最後まで進めて。
```

モデルは Claude Opus 5.5（`claude-opus-5-5`）です。Claude Code は実装の前に npm のレジストリ（パッケージの配布元）を確かめ、`exceljs@4.4.0` を入れました。返答には、選んだ理由がこう書かれていました（英語の返答を訳しています）。

> npm の `xlsx`（SheetJS）は 0.18.5 で止まっていて、既知のセキュリティの問題が修正されていません。外からアップロードされるファイルを読むので、こちらは避けました。

この説明は一次情報と合っています。

- npm の [`xlsx`](https://www.npmjs.com/package/xlsx) の最新版は 0.18.5 で、公開は 2022-03-24 です。
- 0.18.5 には、深刻度 high の勧告が 2 件あります。[GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)（プロトタイプ汚染。0.19.3 未満が対象）と [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)（正規表現による DoS。0.20.2 未満が対象）です。どちらも、修正された版は npm には出ていません。
- SheetJS 自身も、[インストールの説明](https://docs.sheetjs.com/docs/getting-started/installation/nodejs)で「npm のレジストリにある版は古い（the registry is out of date）」と書き、[SheetJS の配布サイト](https://cdn.sheetjs.com/)から入れるよう案内しています。

`xlsx` は、更新が止まっていることを理由に外しています。ところが `exceljs` も、安定版 [4.4.0](https://github.com/exceljs/exceljs/releases/tag/v4.4.0) が出たのは 2023-10-19 で、それ以降の安定版はありません（[npm の `exceljs`](https://www.npmjs.com/package/exceljs) の `latest` も 4.4.0 のままです）。

入れたあと、Claude Code は `npm audit` を走らせました。

```console
$ npm audit
uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix --force`
Will install exceljs@3.4.0, which is a breaking change
node_modules/uuid
  exceljs  >=3.5.0
  Depends on vulnerable versions of uuid
```

`exceljs` が中で使っている `uuid` に脆弱性があり、`npm audit` で直そうとすると `exceljs` を古い 3.4.0 に下げることになる、という内容です（勧告の本文は [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)。`uuid` の 11.1.1 で修正）。Claude Code は `exceljs` のコードを検索して、脆弱性のある関数（v3/v5/v6）を `exceljs` が使っていないことを確かめました。そのうえで念のため、`package.json` に [`overrides`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides)（`exceljs` が中で使う `uuid` だけを別の版に差し替える指定）を足し、`npm audit` を 0 件にしました。

```json package.json
{
  "dependencies": {
    "exceljs": "4.4.0"
  },
  "overrides": {
    "uuid": "^11.1.1"
  }
}
```

ここまでの作業は丁寧です。動作確認もしていて、壊れたファイルを送ると 400 を返すことや、大きすぎる送信を止めることまで確かめていました。それでも、`exceljs` を作っている人が今も直しているか、という点は返答のどこにも出てきません。

## 2 回目: uzomuzo で確かめさせると、自分で入れ替えた

[uzomuzo](https://github.com/future-architect/uzomuzo-oss) は、パッケージの名前と版を渡すと、リリースの履歴、リポジトリの状態、既知の脆弱性をまとめて調べ、保守の状況を 4 段階で返すコマンドです（判定の決め方は[ドキュメント](https://github.com/future-architect/uzomuzo-oss/blob/main/docs/usage.md#verdict-mapping)にあります）。

| 判定 | この記事での呼び方 | 意味 |
| --- | --- | --- |
| `ok` | 問題なし | 保守が続いている。または、保守は止まっているが既知の脆弱性が無い |
| `caution` | 注意 | 保守が止まりかけている、または終了の予定が出ている |
| `replace` | 置き換えを検討 | 保守の終了、GitHub でのアーカイブ、直らない脆弱性など |
| `review` | 要確認 | 情報が足りず判定できなかった |

これを Claude Code から使うために、[`/scan-before-add`](https://github.com/future-architect/uzomuzo-oss/blob/main/claude-skills/scan-before-add/SKILL.md) という [skill](https://code.claude.com/docs/en/skills)（Claude Code に読ませる手順書）を用意しています。中身は「依存を足す前に、候補を全部 uzomuzo にかける。判定を言い換えずに写す。誰が提案し誰が決めたかを記録に残す」という手順です。

1 回目の作業が終わったリポジトリに skill を置き、新しい会話で次のように頼みました。

```text
直前の作業で依存を追加しました。PR に出す前に、追加した依存の保守状況を uzomuzo で確認して、問題があれば対応して。質問はせずに最後まで進めて。
```

Claude Code は skill を読み込み、候補を並べて uzomuzo にかけました。パッケージは `pkg:npm/名前@版` という形で渡します。

```console
$ uzomuzo scan pkg:npm/exceljs@4.4.0 pkg:npm/xlsx pkg:npm/read-excel-file pkg:npm/node-xlsx pkg:npm/uuid@11.1.1 --format json
```

`exceljs` の判定は「置き換えを検討」（`replace`）で、理由は「Unmaintained, unpatched vulnerabilities」（保守されておらず、直っていない脆弱性がある）でした。同じパッケージを、私が手元で人向けの表示（`--format detailed`）にかけると、次のように出ます（抜粋。依存関係と勧告の元データは [deps.dev](https://deps.dev/npm/exceljs/4.4.0) です）。

```console
── pkg:npm/exceljs ─────────────────────────────────────────
│ 🔴 EOL-Effective: Unmaintained, unpatched vulnerabilities
│ Stable: 4.4.0 (2023-10-19)  ⚠️ 1 transitive advisory
│   Transitive (via uuid@8.3.2):
│     HIGH     (7.5)  GHSA-w5hq-g745-h8pq
│ Pre-release: 4.4.1-prerelease.0 (2024-12-20)
```

`EOL-Effective` は「終了は宣言されていないが、事実上止まっている」という uzomuzo の[分類](https://github.com/future-architect/uzomuzo-oss#lifecycle-classification)です。`Transitive (via uuid@8.3.2)` は、`exceljs` 自身ではなく、`exceljs` が中で使っている `uuid` の脆弱性という意味です。1 回目に `npm audit` が出したものと同じ勧告です（`npm audit` は GitHub の深刻度で moderate、uzomuzo は CVSS の点数 7.5 で HIGH と表示しています）。

同じ情報を見ていても、問いが違います。`npm audit` が言っているのは「`uuid` を新しくしなさい」です。uzomuzo が言っているのは「`exceljs` の最新の安定版は、この `uuid` を抱えたまま止まっている」です。この勧告が出たのは 2026 年 4 月 22 日で、`exceljs` には、それに対応した安定版がありません。`overrides` で手当てできるのは自分のプロジェクトの中だけです。`exceljs` が新しい版を出さない限り、中の部品に次の脆弱性が見つかるたびに、同じ手当てを自分で続けることになります。

<img src="/images/2026/20261104a/audit-vs-uzomuzo.png" alt="npm audit は exceljs の中の uuid を指し、uzomuzo は更新の止まった exceljs 自体を指した。入れ替え後は read-excel-file だけになり、パッケージは 193 個から 7 個になった" width="800" height="400" class="bordered">
*同じ脆弱性の情報を見て、`npm audit` は中の `uuid` を、uzomuzo は `exceljs` 自体を指した*

Claude Code の返答は、こう始まりました。

> **前回追加した `exceljs@4.4.0` は uzomuzo の判定が `replace`（理由: "Unmaintained, unpatched vulnerabilities"）でした。** そこで `read-excel-file@9.3.12`（判定 `ok` / `Active`）に置き換えました。

[`read-excel-file`](https://www.npmjs.com/package/read-excel-file) は `.xlsx` を読むことに絞ったパッケージで、ソースは [GitLab](https://gitlab.com/catamphetamine/read-excel-file) にあります。

`package.json` はこうなりました。`exceljs` のために足した `overrides` も、要らなくなったので消しています。

```diff package.json
   "dependencies": {
-    "exceljs": "4.4.0"
-  },
-  "overrides": {
-    "uuid": "^11.1.1"
+    "read-excel-file": "9.3.12"
   }
```

`package-lock.json` に載っているパッケージは、193 個から 7 個になりました。どこかの部品に脆弱性が見つかったとき、自分のプロジェクトに関係があるかを調べる相手が、それだけ減ったということです。入れ替えたあと、Claude Code はテスト用の `.xlsx` をサーバに送り、1 回目と同じ動きになることを確かめていました。

返答の最後には、skill の手順どおりに記録が付いていました。一部を抜き出します。

```text
| Candidate (PURL)               | Proposed by                 | verdict | reason                                   |
|--------------------------------|-----------------------------|---------|------------------------------------------|
| pkg:npm/exceljs@4.4.0          | AI agent (previous session) | replace | Unmaintained, unpatched vulnerabilities  |
| pkg:npm/read-excel-file@9.3.12 | AI agent                    | ok      | Actively maintained with recent releases |

- Decided by: AI agent (delegated by the person; not reviewed by a person yet)
- Reviewed by a person: not yet
```

「誰が提案したか」「誰が決めたか」「人はまだ確認していない」が残ります。PR の説明にこれを貼れば、レビュアーは「なぜこのライブラリなのか」を AI に聞き直さずに済みます。

候補にはもう 1 つ、判定が「問題なし」の `node-xlsx` もありましたが、Claude Code は外しました。調べると、[`node-xlsx`](https://www.npmjs.com/package/node-xlsx) は npm の外（SheetJS の配布サイトの `https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz`）から `xlsx` を取ってくる作りで、その中身は uzomuzo に渡した一覧に入っていなかったからです。判定が届いていない部分を、自分で見つけて外しています。

## 何度やっても同じことが起きるか

1 回うまくいっただけでは、たまたまかもしれません。そこで 3 段階で試しました。試したのは 2026 年 10 月 27 日で、Claude Code 2.1.311、Claude Opus 5.5 と Sonnet 5.5、uzomuzo v0.10.0 を使っています。表の「Opus」「Sonnet」はこの 2 つのモデルです。

### どの用途で試すかを決める

まず、AI がどのライブラリを思い浮かべるかを調べました。19 の用途（「Go で UUID を作る」「Python で PDF からテキストを抜く」など）について、ツールを使わせずに「依存として何を入れるか、名前だけ答えて」と Opus 5.5 と Sonnet 5.5（`claude-sonnet-5-5`。Opus より小さく速いモデル）に 3 回ずつ聞き、答えを uzomuzo にかけました。

ほとんどの用途では、AI は「置き換えを検討」にならないものを答えました（「注意」が 2 用途、残りは「問題なし」か標準ライブラリ）。たとえば Go のモック生成では、アーカイブされた [`golang/mock`](https://github.com/golang/mock) ではなく、後継の [`go.uber.org/mock`](https://github.com/uber-go/mock) を答えています。「置き換えを検討」が出たのは次の 2 つだけでした。

- Node.js で `.xlsx` を読む: `exceljs`（Opus は 3 回中 3 回、Sonnet は 3 回中 2 回）
- Go で YAML の設定を読む: `gopkg.in/yaml.v3`（Sonnet は 3 回中 3 回。Opus は 3 回とも後継の `go.yaml.in/yaml/v3`）

`gopkg.in/yaml.v3` は、GitHub のリポジトリ [go-yaml/yaml](https://github.com/go-yaml/yaml) がアーカイブ（読み取り専用にして更新を止めた状態）されています。後継の `go.yaml.in/yaml/v3` のリポジトリは [yaml/go-yaml](https://github.com/yaml/go-yaml) で、説明欄には `The YAML org maintained fork of https://github.com/go-yaml/yaml` とあります。

### 最初から skill を置いて実装させる

この 2 つの用途で、Claude Code に実装させました。skill が無い回（uzomuzo も入れていない）と、skill を置いた回を比べています。頼み方は 1 回目と同じ形で、ライブラリには触れていません。

| 用途 | モデル | skill なし（3 回） | skill あり（5 回） |
| --- | --- | --- | --- |
| `.xlsx` を読む | Opus | `exceljs` 3 回 | `read-excel-file` 5 回 |
| `.xlsx` を読む | Sonnet | `exceljs` 3 回 | `read-excel-file` 5 回 |
| YAML を読む | Sonnet | `gopkg.in/yaml.v3` 3 回 | `go.yaml.in/yaml/v3` 5 回 |
| YAML を読む | Opus | `go.yaml.in/yaml/v3` 3 回 | `go.yaml.in/yaml/v3` 5 回 |

skill を置いた 20 回は、どれも依存を入れる前に候補をまとめて uzomuzo にかけていました。頼む文には skill の名前を入れていませんが、20 回中 19 回は Claude Code が自分で skill を呼び出しました（残る 1 回は skill のファイルを直接読んで、同じ手順を踏みました）。Sonnet の返答には、たとえば次のように書かれていました。

> - `gopkg.in/yaml.v3` は `replace` なので外しました。
> - `go.yaml.in/yaml/v3` は `gopkg.in/yaml.v3` と同じ API のまま YAML org が引き継いだフォークで、import パスを変えるだけで済みます。

### あとから見直させる

上の記事の流れ（1 回目は skill なしで入れ、2 回目に見直させる）は、skill なしで古いものが入った回から 6 つを選んで試しました。6 回とも入れ替えました。`exceljs` の 4 回はすべて `read-excel-file` に、`gopkg.in/yaml.v3` の 2 回は `go.yaml.in/yaml/v3` と [`goccy/go-yaml`](https://github.com/goccy/go-yaml) に入れ替えています。

逆に、AI が最初から保守されているものを選ぶ用途では、skill を置いても選ぶものは変わりません。Go の API で JWT（ログイン後に渡すトークン）を検証する課題では、skill を置いた Opus は 5 回とも [`golang-jwt/jwt/v5`](https://github.com/golang-jwt/jwt) を選びました。skill が無い Opus も、依存を足した 3 回は同じものでした（残る 2 回は依存を足さずに標準ライブラリだけで書きました）。変わったのは、比べた候補と判定、決めたのが AI であることが記録に残るかどうかだけです。

## 仕込み方

uzomuzo は[リリースページ](https://github.com/future-architect/uzomuzo-oss/releases)のバイナリか `go install` で入れます。

```sh
go install github.com/future-architect/uzomuzo-oss/cmd/uzomuzo@latest
```

skill はリポジトリの `claude-skills/scan-before-add` を、自分のプロジェクトの `.claude/skills/` にコピーします。

```sh
git clone https://github.com/future-architect/uzomuzo-oss.git
cp -r uzomuzo-oss/claude-skills/scan-before-add /path/to/your/project/.claude/skills/
```

これで、Claude Code が依存を足そうとするときに skill を呼ぶことが期待できます。明示的に呼ぶなら `/scan-before-add` です。

環境変数 `GITHUB_TOKEN` には GitHub のトークンを入れておくことを勧めます。無くても動きますが、判定が変わることがあります（[ドキュメントの説明](https://github.com/future-architect/uzomuzo-oss/blob/main/docs/usage.md#analysis-precision-and-github_token)）。たとえば `gopkg.in/yaml.v3` は、トークンが無いと「注意」、あると「置き換えを検討」（アーカイブ済み）と出ます。トークンが無いと uzomuzo は、リポジトリがアーカイブ済みかどうかを GitHub に聞かず、[OpenSSF Scorecard](https://github.com/ossf/scorecard)（OSS の健全性を採点する公開データ）に「アーカイブ済み」と書かれている場合だけアーカイブに気づけます。`gopkg.in/yaml.v3` は、それでは分かりませんでした。

## この仕組みで防げないこと

**「問題なし」は安全の保証ではありません。** uzomuzo が見ているのは、保守が続いているか、既知の脆弱性が直っているかです。すでに報告された悪意のある版は別に調べて「置き換えを検討」にしますが、乗っ取られたアカウントから出たばかりで、まだ誰も報告していない版は見分けられません。skill が記録に「`ok` is a maintenance verdict, not a safety verdict.」（保守の判定であって、安全の判定ではない）と必ず書かせているのはこのためです。

**「置き換えを検討」は「使うな」ではありません。** `exceljs` は今も広く使われていて、表の書き出しなど、`read-excel-file` には無い機能を持っています。Sonnet が入れ替えた回の 1 つでは、返答に次のように書かれていました（実際に出力が変わるかは、私は確かめていません）。

> `exceljs` で扱っていた、リッチテキスト・数式・ハイパーリンクのセルの平坦化は外しました。`read-excel-file` が返す値をそのまま使うため、こうしたセルの出力は以前と変わる可能性があります。

入れ替えで動きが変わることがある、ということです。判定は、入れ替えるかどうかを人が決めるための材料です。

**skill は呼ばれないことがあります。** skill を呼ぶかどうかは、モデルが決めます。今回は依存を足した回では毎回 skill の手順を踏みましたが、依存を足さずに標準ライブラリで書く回では呼ばれません（足していないので、それは正しい動きです）。必ず確かめたいなら、`go.mod` や `package.json` の変更を CI で `uzomuzo scan` にかける方が確実です。

**存在しない名前は止まりません。** AI が実在しないパッケージ名を挙げると、uzomuzo は「要確認」（`review`）を返し、終了コードは 0 です。[`--fail-on review-needed`](https://github.com/future-architect/uzomuzo-oss/blob/main/docs/usage.md#ci-gating-with---fail-on) を付けていなければ、CI に入れても失敗にならずにそのまま通ります。skill には「要確認のときは、まずレジストリに実在するかを確かめる」と書いてありますが、uzomuzo 自体が止めるわけではありません。

**uzomuzo の判定も間違えます。** 今回試す途中で、GitHub のリポジトリが消えたパッケージ（npm の `faker` など）で、トークンを入れると「置き換えを検討」が「要確認」に変わる不具合を見つけ、[issue #588](https://github.com/future-architect/uzomuzo-oss/issues/588) にしました。

**試した数は少ないです。** 用途は 3 つ、各条件 3〜5 回です。見直しの頼み方は「問題があれば対応して」なので、入れ替えを促しています。結果は「こういう動きをすることがある」と読んでください。

## おわりに

1 回目の Claude Code は、脆弱性の指摘を読み、影響が無いことまで確かめてから手当てしていました。足りなかったのは「この部品を作っている人は、今も直しているか」という問いだけです。その問いを uzomuzo に任せると、Claude Code は判定を読み、自分で入れたものを入れ替えました。

- [uzomuzo-oss（GitHub）](https://github.com/future-architect/uzomuzo-oss)
- [scan-before-add skill](https://github.com/future-architect/uzomuzo-oss/tree/main/claude-skills/scan-before-add)（追加したときの PR: [#567](https://github.com/future-architect/uzomuzo-oss/pull/567)）
- [Claude Code の skill のドキュメント](https://code.claude.com/docs/en/skills)
