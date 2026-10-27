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
lede: "Claude Code に Excel を読む処理を頼むと、2023 年 10 月から安定版の出ていない exceljs を入れ、npm audit の指摘にも対処しました。新しい会話で、保守状況を調べる OSS の uzomuzo を使って見直すよう頼むと、Claude Code は自分で別のパッケージに入れ替えました。"
---

[Vuls](https://github.com/future-architect/vuls) 作者の神戸です。最近は、OSS の保守状況を調べるツール [uzomuzo](https://github.com/future-architect/uzomuzo-oss) を作っています。2026 年 4 月には、uzomuzo を使って保守の止まった依存を見つけて減らす話を、同僚と共同で国際会議 [VulnCon 2026](https://www.first.org/conference/vulncon26/) で発表しました（[発表の報告](https://www.vuls.biz/blog/vulncon-2026-speaked)）。

## 要点

| 項目 | 内容 |
| --- | --- |
| 現状 | Claude Code にコードを頼むと、必要なパッケージを AI が選んで入れる。Excel を読む処理では `exceljs` を入れ、`npm audit` の指摘にも対処した |
| 課題 | `exceljs` の安定版は 2023 年 10 月から出ていない。Claude Code は npm の更新日時を見たが、保守が続いているかは返答で触れなかった |
| 解決 | uzomuzo と、依存を足す前にそれを使わせる手順書（Claude Code の skill）を置いた |
| 結果 | 見直しを頼むと、Claude Code は自分で `read-excel-file` に入れ替えた。最初から skill と uzomuzo を用意しておくと、同じ依頼文で `exceljs` を選んだのは 10 回中 0 回（用意しない場合は 6 回中 6 回） |
| 限界 | 判定は保守の状況で、安全の保証ではない。入れ替えで動きが変わることもある。試した回数は各条件 3〜5 回 |

## 1 回目: Claude Code は exceljs を選び、npm audit の指摘にも対処した

試したのは、`.xlsx` を POST で受け取って中身を JSON にして返す、小さな Node.js のサーバです。`sheetToRows` の中身だけが空です。

```js index.js
// Converts an uploaded .xlsx file (as a Buffer) into an array of objects.
async function sheetToRows(buffer) {
  // TODO: read the first sheet; use the first row as keys, one object per following row
  throw new Error("not implemented");
}
```

依頼文は次のとおりです。パッケージの名前も「ライブラリ」という言葉も入れていません。

```text
index.js の TODO を実装して。受け取った .xlsx ファイルの最初のシートを、1 行目を見出しにしたオブジェクトの配列にして返す。質問はせずに最後まで進めて。
```

使ったのは Claude Code 2.1.311 と、モデルの Claude Opus 5.5（`claude-opus-5-5`）です。試したのは 2026 年 10 月 27 日です。

Claude Code は実装の前に、npm のレジストリ（パッケージの配布元）で候補を確かめました（実際は 1 行で続けて実行したコマンドを、読みやすく分けています）。

```console
$ npm view exceljs version time.modified
version = '4.4.0'
time.modified = '2024-12-20T09:47:37.162Z'
$ npm view xlsx version
0.18.5
```

そして `exceljs@4.4.0` を入れました。`xlsx` を外した理由は、返答にこう書かれていました（英語の返答を訳しています）。

> npm の `xlsx`（SheetJS）は 0.18.5 で止まっていて、既知のセキュリティの問題が修正されていません。外からアップロードされるファイルを読むので、こちらは避けました。

この説明は一次情報と合っています。

- npm の [`xlsx`](https://www.npmjs.com/package/xlsx) の最新版は 0.18.5 で、公開は 2022-03-24 です。
- 0.18.5 には、深刻度 high の勧告が 2 件あります。[GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)（プロトタイプ汚染。0.19.3 未満が対象）と [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)（正規表現による DoS。0.20.2 未満が対象）です。どちらも、修正された版は npm には出ていません。
- SheetJS 自身も、[インストールの説明](https://docs.sheetjs.com/docs/getting-started/installation/nodejs)で「npm のレジストリにある版は古い（the registry is out of date）」と書き、[SheetJS の配布サイト](https://cdn.sheetjs.com/)から入れるよう案内しています。

一方、`exceljs` の安定版 [4.4.0](https://github.com/exceljs/exceljs/releases/tag/v4.4.0) が出たのは 2023-10-19 で、それ以降の安定版はありません（[npm の `exceljs`](https://www.npmjs.com/package/exceljs) の `latest` も 4.4.0 のままです）。Claude Code が見た `time.modified` の 2024-12-20 は、4.4.1 のプレリリース（正式版の前の試し版）が出た日です。

入れたあと、Claude Code は `npm audit` を走らせました（出力は抜粋です）。

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

`exceljs` が使っている `uuid` に脆弱性があるという指摘です（勧告は [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)。`uuid` の 11.1.1 で修正）。`npm audit` が示した直し方は、`exceljs` を古い 3.4.0 に下げることでした。

Claude Code はこの直し方を選びませんでした。まず `exceljs` のコードを検索し、脆弱性のある関数（v3/v5/v6）を `exceljs` が使っていないことを確かめました。そのうえで念のため、`package.json` に [`overrides`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides) を足しました。プロジェクトの中の `uuid` を、指定した版に差し替える設定です。これで `npm audit` は 0 件になりました。

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

動作も確かめていて、壊れたファイルを送ると 400 を返すことや、10MB を超える送信で接続が切れることを見ていました。最後の返答には、`exceljs` の保守が今も続いているかについての記述はありませんでした。

## 2 回目: uzomuzo で見直すよう頼むと、自分で入れ替えた

### uzomuzo と skill

[uzomuzo](https://github.com/future-architect/uzomuzo-oss) は、パッケージの名前と版を渡すと、保守の状況を 4 段階で返すコマンドです。調べるのは、リリースの履歴、リポジトリの状態、既知の脆弱性です（判定の決め方は[ドキュメント](https://github.com/future-architect/uzomuzo-oss/blob/main/docs/usage.md#verdict-mapping)にあります）。

| 判定 | この記事での呼び方 | 意味 |
| --- | --- | --- |
| `ok` | 問題なし | 保守の面では対応が要らない。保守が続いている、または止まっているが既知の脆弱性が無い |
| `caution` | 注意 | 保守が止まりかけている、または終了の予定が出ている |
| `replace` | 置き換えを検討 | 保守の終了、GitHub のリポジトリが読み取り専用（アーカイブ）になっている、直らない脆弱性など |
| `review` | 要確認 | 自動では判定できなかった。情報が足りない、取得に失敗した、怪しいリリースの出方をしている、など |

これを Claude Code から使うために、[`/scan-before-add`](https://github.com/future-architect/uzomuzo-oss/blob/main/claude-skills/scan-before-add/SKILL.md) という [skill](https://code.claude.com/docs/en/skills)（Claude Code に読ませる手順書）を用意しています。中身は「依存を足す前に、候補を全部 uzomuzo にかける。判定を言い換えずに写す。誰が提案し誰が決めたかを記録に残す」という手順です。

### 見直しを頼んだ

1 回目の作業が終わったリポジトリに skill を置き、uzomuzo を使える状態にしました。そのうえで新しい会話を始め、今度ははっきり見直しを頼みました。

```text
直前の作業で依存を追加しました。PR に出す前に、追加した依存の保守状況を uzomuzo で確認して、問題があれば対応して。質問はせずに最後まで進めて。
```

Claude Code は skill を読み込み、候補を並べて uzomuzo にかけました。パッケージは `pkg:npm/名前@版` という形で渡します。

```console
$ uzomuzo scan pkg:npm/exceljs@4.4.0 pkg:npm/xlsx pkg:npm/read-excel-file pkg:npm/node-xlsx pkg:npm/uuid@11.1.1 --format json
```

`exceljs` の判定は「置き換えを検討」（`replace`）で、理由は「Unmaintained, unpatched vulnerabilities」（保守されておらず、直っていない脆弱性がある）でした。この見直しは `GITHUB_TOKEN` を設定して試しています（トークンの有無で判定が変わる話は「仕込み方」に書きます）。ここで uzomuzo が調べたのは、npm に公開されている `exceljs` 4.4.0 そのものです。このプロジェクトの `package-lock.json` は渡していないので、1 回目に足した `overrides` は判定に入っていません。同じパッケージを、私が手元で人向けの表示（`--format detailed`）にかけると、次のように出ます（抜粋。依存関係と勧告の元データは [deps.dev](https://deps.dev/npm/exceljs/4.4.0) です）。

```console
── pkg:npm/exceljs ─────────────────────────────────────────
│ 🔴 EOL-Effective: Unmaintained, unpatched vulnerabilities
│ Last Human Commit: 2024-01-12
│ Stable: 4.4.0 (2023-10-19)  ⚠️ 1 transitive advisory
│   Transitive (via uuid@8.3.2):
│     HIGH     (7.5)  GHSA-w5hq-g745-h8pq
│ Pre-release: 4.4.1-prerelease.0 (2024-12-20)
```

`EOL-Effective` は、終了の宣言は無いものの事実上止まっている、という uzomuzo の[分類](https://github.com/future-architect/uzomuzo-oss#lifecycle-classification)です。今回の `exceljs` で判定の材料になったのは、次の 2 つです。

- 人によるコミットが 2 年以上無い（uzomuzo が既定のブランチの履歴から取った最後の人のコミットは 2024-01-12）
- 深刻度 HIGH 以上の、直っていない脆弱性がある

この分類には、ほかの情報から決まる経路もあります。2 つ目に当たったのが、1 回目に `npm audit` が出したのと同じ `uuid` の勧告です。`Transitive (via uuid@8.3.2)` は、`exceljs` 自身ではなく、`exceljs` 4.4.0 が依存先として引く `uuid` 8.3.2 の脆弱性、という意味です。深刻度は、`npm audit` が GitHub の分類で moderate と出し、uzomuzo は脆弱性の共通の採点方式（CVSS）の点数 7.5 を使って HIGH と出しています。

つまり今回の判定には、2026-04-22 に公開されたこの勧告が効いています。勧告が出る前の日付で判定がどうなったかは、再現していません。

<img src="/images/2026/20261104a/audit-vs-uzomuzo.png" alt="npm audit は exceljs の依存先の uuid の脆弱性を指し、直し方として exceljs を 3.4.0 に下げることを示した。Claude Code は overrides で uuid を 11.1.1 に差し替えた。uzomuzo は、修正の入らない exceljs 自体を置き換えの対象として指した。入れ替え後は直接の依存が read-excel-file だけになり、パッケージは 193 個から 7 個になった" width="880" height="420" class="bordered">
*同じ勧告を見て、`npm audit` は依存ツリーの直し方を、uzomuzo は `exceljs` 自体の状態を示した*

私の読みでは、2 つの道具は同じ勧告を見て、別の問いに答えています。`npm audit` が答えたのは「このプロジェクトに今入っている部品に、既知の脆弱性があるか」で、`overrides` のあとは 0 件になりました。uzomuzo が答えたのは「その部品を作っている側は、まだ直しているか」です。この勧告で直った `uuid` の版は 11.1.1 で、`exceljs` 4.4.0 が指定する範囲（`^8.3.0`）の外にあります。`exceljs` の新しい版が出ない限り、利用する側が `overrides` で差し替え続けることになります。

Claude Code の返答は、こう始まりました（ここからの返答は日本語の原文です）。

> **前回追加した `exceljs@4.4.0` は uzomuzo の判定が `replace`（理由: "Unmaintained, unpatched vulnerabilities"）でした。** そこで `read-excel-file@9.3.12`（判定 `ok` / `Active`）に置き換えました。

[`read-excel-file`](https://www.npmjs.com/package/read-excel-file) は `.xlsx` を読むことに絞ったパッケージで、ソースは [GitLab](https://gitlab.com/catamphetamine/read-excel-file) にあります。9.3.12 の公開は 2026-10-07 です。

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

`package-lock.json` に載っている依存パッケージ（プロジェクト自身を除く）は、193 個から 7 個に減りました。どこかの部品に脆弱性が見つかったとき、自分のプロジェクトに関係があるかを調べる相手が、それだけ少なくなります。なお、1 回目の状態でも、このプロジェクトが `uuid` の脆弱性の影響を受けていたわけではありません。入れ替えで変わったのは、`overrides` で保っていた状態から、それが要らない状態になったことです。

入れ替えたあと、Claude Code はテスト用の `.xlsx` を作ってサーバに送りました。正しいファイルで 200、壊れたファイルで 400、11MB の送信で 413 が返ることを確かめています。1 回目と同じテストファイルで比べたわけではありません。

返答の最後には、skill の手順どおりに記録が付いていました。行と列を減らして抜き出します。

```text
| Candidate (PURL)               | Proposed by                 | verdict | reason                                   |
|--------------------------------|-----------------------------|---------|------------------------------------------|
| pkg:npm/exceljs@4.4.0          | AI agent (previous session) | replace | Unmaintained, unpatched vulnerabilities  |
| pkg:npm/read-excel-file@9.3.12 | AI agent                    | ok      | Actively maintained with recent releases |

- Decided by: AI agent (delegated by the person; not reviewed by a person yet)
- Reviewed by a person: not yet
```

「誰が提案したか」「誰が決めたか」「人はまだ確認していない」が残ります。依存を 1 行足す差分だけでは、何を比べて選んだかはレビュアーに分かりません。この記録を PR の説明に貼れば、選んだ理由を AI に聞き直す手間が減ると考えています。

候補にはもう 1 つ、判定が「問題なし」の [`node-xlsx`](https://www.npmjs.com/package/node-xlsx) もありましたが、Claude Code は外しました。返答に書かれた理由はこうです。`node-xlsx` は `xlsx` を SheetJS の配布サイト（`https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz`）から取ってくる作りで、npm にあるものとは別の版を使います。そして「この中身は今回のスキャンの対象になっていません」。

## 何度やっても同じことが起きるか

1 回うまくいっただけでは、たまたまかもしれません。そこで 3 段階で試しました。条件は 1 回目と同じで、Claude Code 2.1.311、uzomuzo v0.10.0、試した日は 2026 年 10 月 27 日です。モデルは Opus 5.5 に加えて、Opus より速く料金の安い Sonnet 5.5（`claude-sonnet-5-5`）も使いました。表の「Opus」「Sonnet」はこの 2 つを指します。

### AI が古いパッケージを答えたのは、19 用途のうち 2 つ

まず、AI がどのパッケージを思い浮かべるかを調べました。用途は「Go で UUID を作る」「Python で PDF からテキストを抜く」など 19 個です。ツールを使わせずに、依存として追加するパッケージの名前を 1 つだけ答えさせました。各モデルに 3 回ずつ聞き、答えを uzomuzo にかけています。

ほとんどの用途で、答えは「問題なし」のパッケージか標準ライブラリでした（「注意」が 2 用途）。たとえば Go のモック生成では、6 回とも Uber が保守する後継の [`go.uber.org/mock`](https://github.com/uber-go/mock) を答えました（1 回はその中の `mockgen` コマンドのパス）。アーカイブされた [`golang/mock`](https://github.com/golang/mock) を答えた回はありませんでした。「置き換えを検討」が出たのは次の 2 つだけでした。

- Node.js で `.xlsx` を読む: `exceljs`（Opus は 3 回中 3 回、Sonnet は 3 回中 2 回）
- Go で YAML の設定を読む: `gopkg.in/yaml.v3`（Sonnet は 3 回中 3 回。Opus は 3 回とも後継の `go.yaml.in/yaml/v3`）

`gopkg.in/yaml.v3` は、GitHub のリポジトリ [go-yaml/yaml](https://github.com/go-yaml/yaml) がアーカイブされています。後継の `go.yaml.in/yaml/v3` のリポジトリは [yaml/go-yaml](https://github.com/yaml/go-yaml) で、説明欄には `The YAML org maintained fork of https://github.com/go-yaml/yaml` とあります。

次の 2 段階は、この 2 つの用途を選んで試しています。ほかの用途で同じ割合になるとは限りません。

### 最初から skill を置くと、20 回とも入れる前に uzomuzo にかけた

この 2 つの用途で、Claude Code に実装させました。skill が無い回（uzomuzo も入れていない）と、skill を置いた回を比べています。依頼文は 1 回目と同じ形で、パッケージには触れていません。この段階と次の段階は、`GITHUB_TOKEN` を設定して試しました。

| 用途 | モデル | skill なし（3 回） | skill あり（5 回） |
| --- | --- | --- | --- |
| `.xlsx` を読む | Opus | `exceljs` 3 回 | `read-excel-file` 5 回 |
| `.xlsx` を読む | Sonnet | `exceljs` 3 回 | `read-excel-file` 5 回 |
| YAML を読む | Sonnet | `gopkg.in/yaml.v3` 3 回 | `go.yaml.in/yaml/v3` 5 回 |
| YAML を読む | Opus | `go.yaml.in/yaml/v3` 3 回 | `go.yaml.in/yaml/v3` 5 回 |

skill を置いた 20 回は、どれも依存を入れる前に、候補をまとめて uzomuzo にかけていました。依頼文に skill の名前は入れていません。それでも 20 回中 19 回は、Claude Code が自分で skill を呼び出しました。残る 1 回は skill のファイルを直接読み、同じ手順を踏んでいます。Sonnet の返答には、たとえば次のように書かれていました。

> - `gopkg.in/yaml.v3` は `replace` なので外しました。
> - `go.yaml.in/yaml/v3` は `gopkg.in/yaml.v3` と同じ API のまま YAML org が引き継いだフォークで、import パスを変えるだけで済みます。

ただし、1 つの会話の中で「`exceljs` を使います」と書いてから uzomuzo の判定を見て考えを変えた、という回はありませんでした。どの回も、選ぶ前に候補をまとめてかけています。

### 見直しを頼んだ 6 回は、6 回とも入れ替えた

この記事の前半と同じ流れ（skill なしで入れたあと、新しい会話で見直しを頼む）も試しました。対象は、skill なしで古いものが入った 9 回のうち 6 回です。`.xlsx` の Opus 3 回と Sonnet 1 回、YAML の Sonnet 2 回で、各条件の最初の回から選んでいます。6 回とも入れ替えました。`exceljs` の 4 回はすべて `read-excel-file` に、`gopkg.in/yaml.v3` の 2 回は `go.yaml.in/yaml/v3` と [`goccy/go-yaml`](https://github.com/goccy/go-yaml) に入れ替えています。6 回のうち 3 回は、権限の都合で実際のファイルを使った動作確認ができていません。6 回は依存を入れ替えた回数で、動きが変わらないことを確かめた回数ではありません。

### AI が最初から保守されているものを選ぶ用途では

Go の API で JWT（ログイン後に渡すトークン）を検証する課題も試しました。この試験だけは `GITHUB_TOKEN` を設定していません。

- skill を置いた Opus は、5 回とも [`golang-jwt/jwt/v5`](https://github.com/golang-jwt/jwt) を入れ、比べた候補と判定、決めたのが AI であることを記録に残しました。
- skill が無い Opus は、3 回が同じ `golang-jwt/jwt/v5` を入れ、2 回は依存を足さずに標準ライブラリだけで書きました。記録は残りません。
- skill を置いた Sonnet は、5 回とも依存を足さずに標準ライブラリだけで書きました。skill は呼ばれず（2 回は skill のファイルを読んでいます）、uzomuzo も使っていません。5 回のうち 3 回は、有効期限（`exp`）の無いトークンも受け入れる実装でした。依頼文では `exp` を必須とは書いていないので、これだけで誤りとは言えませんが、モデルによって扱いが分かれました。

依存を足した回では、選んだパッケージは skill の有無で変わりませんでした。変わったのは、記録が残るかどうかと、依存を足すかどうかの分かれ方です。依存を足さずに自分で書く場合は、こうした要件を人が確かめる必要があります。

## 仕込み方

uzomuzo は[リリースページ](https://github.com/future-architect/uzomuzo-oss/releases)のバイナリか `go install` で入れます。この記事の試験は v0.10.0 で行いました。

```sh
go install github.com/future-architect/uzomuzo-oss/cmd/uzomuzo@latest
uzomuzo --version
```

skill はリポジトリの `claude-skills/scan-before-add` を、自分のプロジェクトの `.claude/skills/` にコピーします。

```sh
git clone https://github.com/future-architect/uzomuzo-oss.git
mkdir -p /path/to/your/project/.claude/skills
cp -r uzomuzo-oss/claude-skills/scan-before-add /path/to/your/project/.claude/skills/
```

これで、依存を足そうとするときに Claude Code が skill を呼ぶようになります。毎回とは限らないので、そのことは次の節に書きます。明示的に呼ぶなら `/scan-before-add` です。

環境変数 `GITHUB_TOKEN` には、GitHub のトークンを入れておくことを勧めます。無くても動きますが、判定が変わります。この記事の `exceljs` 4.4.0 も、トークンが無いと「注意」（`Stalled`）、あると「置き換えを検討」と出ました。トークンが無いと、uzomuzo は、人が最後にコミットした日や、リポジトリがアーカイブ済みかを GitHub に聞きません。`exceljs` の場合は、そのために「人によるコミットが 2 年以上無い」を確かめられず、`EOL-Effective` になりませんでした（[ドキュメントの説明](https://github.com/future-architect/uzomuzo-oss/blob/main/docs/usage.md#analysis-precision-and-github_token)）。

## この仕組みで防げないこと

**「問題なし」は安全の保証ではありません。** uzomuzo が見ているのは、保守が続いているか、既知の脆弱性が直っているかです。悪意のあるパッケージとして報告済みの版は別に調べて「置き換えを検討」にします。既定では、npm で 1 年以上リリースが無かったあとに出た版に、公開から 7 日間印を付けます。版を指定したスキャンでは、公開から 7 日以内の版も知らせます。それでも、乗っ取られたアカウントから出た版かどうかは、報告が出る前には確定できません。このため skill は、記録に「`ok` is a maintenance verdict, not a safety verdict.」（保守の判定であって、安全の判定ではない）と必ず書かせています。

**「置き換えを検討」は「使うな」ではありません。** `exceljs` のリポジトリはアーカイブされておらず、2024 年 12 月にはプレリリースも出ています。依存しているパッケージは 4,970 個あり（uzomuzo が表示した deps.dev の数）、表の書き出しなど `read-excel-file` には無い機能があります。今回の判定も、上に書いたとおり `uuid` の勧告があってはじめて付いたものです。入れ替えで動きが変わることもあります。Sonnet が入れ替えた回の 1 つでは、返答に次のように書かれていました（実際に出力が変わるかは、私は確かめていません）。

> `exceljs` で扱っていた、リッチテキスト・数式・ハイパーリンクのセルの平坦化は外しました。`read-excel-file` が返す値をそのまま使うため、こうしたセルの出力は以前と変わる可能性があります。

判定は、入れ替えるかどうかを人が決めるための材料です。

skill が呼ばれるかどうかは、モデルが決めます。依存を足さずに書く回では、上の Sonnet のように呼ばれません。また、AI が実在しないパッケージ名を挙げると、uzomuzo は「要確認」（`review`）を返し、終了コードは 0 です。必ず止めたいなら、CI で `go.mod`、または `package-lock.json` から作った CycloneDX 形式の SBOM を `uzomuzo scan` にかけ、[`--fail-on`](https://github.com/future-architect/uzomuzo-oss/blob/main/docs/usage.md#ci-gating-with---fail-on) に `review-needed` も入れてください。uzomuzo は `package.json` を直接は読みません。

判定そのものを間違えることもあります。試す途中で uzomuzo の不具合を 1 つ見つけ、[issue #588](https://github.com/future-architect/uzomuzo-oss/issues/588) にしました。GitHub のリポジトリが消えたパッケージ（npm の `faker` など）では、トークンを入れると判定が「置き換えを検討」から「要確認」に変わります。

試した数は少なく、用途は 3 つ、各条件 3〜5 回です。`.xlsx` と YAML は、下調べで古いパッケージが出た用途を選んでいます（JWT は別に試した課題です）。入れ替え先の `read-excel-file` も、最後の人のコミットや Scorecard の値は取れず、判定は最近のリリースを根拠にしています。見直しの依頼文は「問題があれば対応して」なので、入れ替えを促しています。結果は「こういう動きをすることがある」と読んでください。

## AI に依存を足させるなら、保守の確認も頼む

1 回目の Claude Code は、`npm audit` の指摘を読み、影響が無いことまで確かめてから対処していました。返答に出てこなかったのは、`exceljs` の作り手が今も直しているかどうかでした。この問いに、uzomuzo はコミットの履歴と直っていない脆弱性から答えます。その答えを渡すと、Claude Code は自分で入れたものを入れ替え、何を比べて決めたかを記録に残しました。AI に依存を足させているなら、PR を出す前に一度 `uzomuzo scan` をかけてみてください。

- [uzomuzo-oss（GitHub）](https://github.com/future-architect/uzomuzo-oss)
- [scan-before-add skill](https://github.com/future-architect/uzomuzo-oss/tree/main/claude-skills/scan-before-add)（追加したときの PR: [#567](https://github.com/future-architect/uzomuzo-oss/pull/567)）
- [Claude Code の skill のドキュメント](https://code.claude.com/docs/en/skills)
