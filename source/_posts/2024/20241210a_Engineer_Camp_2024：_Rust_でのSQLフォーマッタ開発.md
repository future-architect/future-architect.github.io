---
title: "Engineer Camp 2024: Rust でのSQLフォーマッタ開発"
date: 2024/12/10 00:00:00
postid: a
tag:
  - SQL
  - VSCode
  - フォーマッター
  - インターン
  - インターン2024
  - Rust
  - 2WaySQL
category:
  - DB
thumbnail: /images/2024/20241210a/thumbnail.gif
author: 仲泰志
lede: "Engineer Camp 2024 に参加した仲です。今回のインターンシップではRust製SQLフォーマッタの開発を行いました。この記事では、期間中に取り組んだ内容について紹介します！]"
---
# はじめに

Engineer Camp 2024 に参加した仲です。今回のインターンシップではRust製SQLフォーマッタの開発を行いました。この記事では、期間中に取り組んだ内容について紹介します！

過去の関連インターン記事はこちらです：

- [Engineer Camp2022 RustでSQLフォーマッタ作成（前編）](/articles/20220916b/)
- [Engineer Camp2022 RustでSQLフォーマッタ作成（後編）](/articles/20220916c/)

# インターン内容

フューチャーが開催している夏のインターンシップ[「Engineer Camp 2024」](https://note.com/future_event/n/nf586b6248ef9)では、社内のプロジェクトに参画し4週間にわたり開発業務を体験します。今年は全19コースの募集がありました。

私が参加したコースは [（2）Rust製SQLフォーマッタの開発](https://note.com/future_event/n/nf586b6248ef9#c1363421-2c55-4738-b345-676c2d4ea9be) です。Rust製のSQLフォーマッタである uroboroSQL-fmt やVSCode拡張等の周辺ツールに対し、不具合修正や機能追加を実施しました。

開発対象である [uroboroSQL-fmt](https://github.com/future-architect/uroborosql-fmt) は、フューチャーのSQLコーディング規約に基づいてコード整形を行うフォーマッタです。詳細は[新しいSQLフォーマッターであるuroboroSQL\-fmtをリリースしました](/articles/20231120a/)の記事をご覧ください。

- https://github.com/future-architect/uroborosql-fmt

実際に取り組んだタスクは様々ありますが、ここではそのうち2つをピックアップしてご紹介します。

## 1. VSCode拡張への機能追加

uroboroSQL-fmtにはVSCode拡張機能が存在します。

- https://marketplace.visualstudio.com/items?itemName=Future.uroborosql-fmt

インターンでは、このVSCode拡張へ以下の2つの機能を追加しました。

1. VSCode の設定を元に、フォーマッタの設定ファイル（`.uroborosqlfmtrc.json`）を出力する**export**機能
1. フォーマッタの設定ファイルで指定したフォーマットオプションを、VSCode の設定（`settings.json`）へ反映する**import**機能

### 機能デモ

それぞれの機能を紹介します。

#### 1. export 機能

コマンドパレットから export コマンドを呼び出すことで、VSCodeの設定をフォーマッタの設定ファイル `.uroborosqlfmtrc.json` に反映できます。

<img src="/images/2024/20241210a/export-demo.avif" alt="コマンドパレットでexportコマンドを実行" width="1200" height="675" loading="lazy">

#### 2. import 機能

コマンドパレットから import コマンドを呼び出すことで、フォーマッタの設定ファイル `.uroborosqlfmtrc.json` の内容をVSCodeの設定に反映できます。

<img src="/images/2024/20241210a/import-demo.avif" alt="コマンドパレットでimportコマンドを実行" width="1200" height="675" loading="lazy">

### 本機能のユースケース

#### 1. マルチリポジトリ構成での設定共有

昨今では、マルチリポジトリ構成での開発は珍しくありません。マルチリポジトリ構成においてVSCodeの設定は各リポジトリに適したものを用意しますが、SQLフォーマッタの設定は関連リポジトリ全体で共有することが望ましいでしょう。そのような場合の設定共有は、フォーマッタ用の設定ファイルを各リポジトリに配置することで対応できます。

しかし、フォーマッタ用の設定ファイルはただのjsonファイルなのでエディタで直接編集するのは手間がかかります。

そこで、今回追加したexport機能により、VSCodeの設定編集UIで作成した設定からフォーマッタ用の設定ファイルを出力し、各リポジトリに配布して共有することが可能となります。

また、VSCodeで[`uroborosql-fmt.configurationFilePath`](https://github.com/future-architect/vscode-uroborosql-fmt?tab=readme-ov-file#settings) を設定すれば、プロジェクトのルートにない設定ファイルを参照することもできます。

<img src="/images/2024/20241210a/usecase-1-share.png" alt="usecase-1-share.png" width="1200" height="618" loading="lazy">

#### 2. 既存のフォーマッタ用の設定ファイルに変更を加える場合

VSCodeの設定編集UIは、取りうる値をドロップダウンで選択できたり、設定項目のドキュメントを読みながら編集ができます。import 機能を用いることでフォーマッタ用の設定ファイルをVSCodeの設定に取り込むことができ、設定の変更が容易になります。

適切な設定が用意できたら、export 機能でフォーマッタ用の設定ファイルを更新できます。

<img src="/images/2024/20241210a/image.png" alt="image.png" width="1123" height="336" loading="lazy">

## 2. 2WaySQL との格闘

uroboroSQL-fmt の特徴の一つとして、2WaySQLに対応していることが挙げられます。2WaySQLをサポートするには通常のSQLとは異なる考慮が必要であるため、uroboroSQL-fmtでは2WaySQL用のフォーマット処理が用意されています。インターン期間中に2WaySQL関連の不具合が見つかりましたが、その一つは原理的に解決が難しいものでした。結局インターン期間でその不具合を完全に解決するには至らず、部分的に解決する方法をとりました。

このセクションではその不具合について説明するとともに、どんな解決策をとったかについて記します。

### 2WaySQL とは

2WaySQL とは、バインドパラメータや制御構文を利用して実行することができるSQLの拡張構文のようなものです。uroboroSQL-fmt は [uroboroSQL](https://future-architect.github.io/uroborosql-doc/)、[go-twowaysql](https://github.com/future-architect/go-twowaysql)、[Doma](https://doma.readthedocs.io/en/latest/) といった2WaySQLをサポートしています。

### uroboroSQL-fmt の 2WaySQL フォーマット戦略

2WaySQLは通常のSQLとして不正な構文になることがあるため、通常のSQLのパーサではハンドリングできないケースがあります。uroboroSQL-fmt はこの問題を解消するために、2WaySQLに対してはパーサで読み込む前の段階でテキストを分解し、フォーマット後にマージして再構築するという戦略をとっています。これにより、フォーマット処理のコアロジックやパーサジェネレータの文法定義は通常のSQLをターゲットにしたままで、フォーマッタ全体として2WaySQLに対応することを可能にしています。

2WaySQLのフォーマット処理についてはこれらの記事が詳しいです：

- [uroborosql-fmtにおける2WaySQLフォーマット (前編: フォーマット方法編)](/articles/20241018a/)
- [uroborosql-fmtにおける2WaySQLフォーマット (後編: 結果検証編)](/articles/20241021a/)

### 実際の不具合
インターン期間中に遭遇したフォーマッタの不具合として、2WaySQLにおいて `as` キーワードの縦揃えが崩れてしまうというものがありました。

<img src="/images/2024/20241210a/as-alignment-actual-expected.png" alt="as-alignment-actual-expected.png" width="871" height="294" loading="lazy">

### 不具合が起こる仕組み

この不具合が発生した理由について、例を使って詳しく追ってみます。

2WaySQLのフォーマットにおけるSQLの分割およびマージは2WaySQLが持つ制御構文（`/* IF ... */`や`/* ELSE */`）に基づいて行単位で実施されます。（詳細は[前述の記事](https://future-architect.github.io/articles/20241018a/)に譲ります）

```sql 分割前.sql
select
	'a' as a
/*IF true*/
,	'b' as b
/*ELSE*/
,	'ccccccccccccccc' as c
/*END*/
;
```

上のようなSQL（分割前.sql）は下に示すように、`IF` 節の中身を持つSQL（first.sql）と`ELSE`節の中身を持つSQL（second.sql）に分割されます。

```sql first.sql
select
	'a' as a
/*IF true*/
,	'b' as b
/*END*/
;
```

```sql second.sql
select
	'a' as a
/*ELSE*/
,	'ccccccccccccccc' as c
/*END*/
;
```

first.sql と second.sql のそれぞれをフォーマットすると次のようになります。`as` キーワードに注目すると、フォーマット処理によって縦揃えが行われていることを確認できます。

```sql first.sql
select
	'a'			as	a
/*IF true*/
,	'b'			as	b
/*END*/
;
```

```sql second.sql
select
	'a'					as	a
/*ELSE*/
,	'ccccccccccccccc'	as	c
/*END*/
;
```

`as` の縦揃え位置は `as` キーワードの前に現れる要素（`'a'` など）の長さによって変化しますが、分割されたそれぞれのSQLは他方のSQLの情報を持ちません。すると、マージされたSQLでは次のように、`IF`節のインデントと`ELSE`節のインデントがずれる、という現象が発生してしまいます。

```sql merged.sql
select
	'a'	as	a
/*IF true*/
,	'b'	as	b
/*ELSE*/
,	'ccccccccccccccc'	as	c
/*END*/
;
```

### 対処

2WaySQLの分割処理およびマージ処理はテキストの行単位で実施されます。そのため縦揃えのように複数行にまたがる情報の保持が必要な処理では、このような問題の発生を防ぐことができません。さらにフォーマッタのコアロジックはできる限り2WaySQLの知識を持たない方針で実装されているため、問題の解決には2WaySQLを扱う処理のアーキテクチャを大きく変える必要がありそうということがわかりました。

2WaySQLを扱うアーキテクチャを新たに検討し実装するのはそれなりに大規模な変更となることが見込まれます。そのような変更をインターン期間中で実施するのは難しいと判断したため、今回はこの問題を**部分的に**解消する修正を入れることにしました。具体的には、通常のSQLとしてパースできる2WaySQLについては分割・マージ処理を行わず、そのままSQLとしてフォーマットするようにしました。

たとえば今回の例に使用したSQLは2WaySQLの機能を使うものの、通常のSQLとしてもパースが可能です。

```sql 通常のSQLとしても文法的に正しいSQL.sql
select
	'a' as a
/*IF true*/
,	'b' as b
/*ELSE*/
,	'ccccccccccccccc' as c
/*END*/
;
```

このようなSQLを通常のSQLとしてフォーマットする今回の修正により、下図のように縦揃えのそろったフォーマットが行われるようになりました。

```sql フォーマット後.sql
select
	'a'					as	a
/*IF true*/
,	'b'					as	b
/*ELSE*/
,	'ccccccccccccccc'	as	c
/*END*/
;
```

もちろん、通常のSQLとしてのパースができない2WaySQLでは、依然として同様の問題が発生し得ます。

例えば次に示す2WaySQLは、前述したSQLに from 句と where 句を付加したものです。2WaySQLの条件分岐機能を使っている where 句に注目すると、通常のSQLとして解釈するためには where 句のセパレータ `and` または `or` が不足していることがわかります。

```sql 通常のSQLとしては不正な2WaySQL（フォーマット前）.sql
select
	'a' as a
/*IF true*/
,	'b' as b
/*ELSE*/
,	'ccccccccccccccc' as c
/*END*/
from
	some_table t
where
/*IF some_condition */
	some_column = 'value'  -- 通常のSQLとして解釈するには、この位置にセパレータ（and, or）が必要
/*ELSE*/
	some_column = 'other_value'
/*END*/
;
```

これをフォーマットすると次のようになり、`as` キーワードの縦揃えが再び崩れていることが確認できます。

```sql 通常のSQLとしては不正な2WaySQL（フォーマット後）.sql
select
	'a'	as	a
/*IF true*/
,	'b'	as	b
/*ELSE*/
,	'ccccccccccccccc'	as	c
/*END*/
from
	some_table	t
where
/*IF some_condition */
	some_column	=	'value'	-- 通常のSQLとして解釈するには、この位置にセパレータ（and, or）が必要
/*ELSE*/
	some_column	=	'other_value'
/*END*/
;
```

このような2WaySQLの扱いについては現在検討中です。今後の修正にご期待ください。

## インターンの感想

Rust と静的解析をやりたいという動機で参加したインターンでしたが、仕事の進め方や見積もり方、自分の貢献の伝え方など、至るところに思わぬ学びがたくさんありました。毎日の定例ミーティングや最終発表を通して、人に何かを説明する際の情報のまとめ方・表現のやりかたを鍛えることができたように思います。

開発者の体験を良くする仕組みは私が興味とするところなので、今回そのような具体的なツールに携われたことは非常に大きな経験になりました。すでにあるコードベースを読み解き、影響範囲を検証しながら修正を加えていく作業がとても楽しかったです。

## さいごに

インターンではRust製SQLフォーマッタの開発を行いました。関わっていただいた社員のみなさん、そして同じインターン生のみなさんにもとても感謝しています。ありがとうございました！
