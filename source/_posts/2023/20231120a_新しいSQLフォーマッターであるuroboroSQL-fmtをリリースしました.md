---
title: "新しいSQLフォーマッターであるuroboroSQL-fmtをリリースしました"
date: 2023/11/20 00:00:00
postid: a
tag:
  - フォーマッター
  - uroboroSQL
  - wasm
  - SQL
  - Rust
category:
  - DB
thumbnail: /images/20231120a/thumbnail.png
author: 山田修路
lede: "新しいSQLフォーマッターであるuroboroSQL-fmtをリリースしました"
---
<img src="/images/20231120a/top.png" alt="" width="630" height="229">

コアテクノロジーグループの山田です。

先日、新しいSQLフォーマッターである[uroboroSQL-fmt](https://github.com/future-architect/uroborosql-fmt)をリリースしました 🎉
このツールは弊社が公開している[PostgreSQL向けのSQLコーディング規約](https://future-architect.github.io/coding-standards/documents/forSQL/SQL%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84%EF%BC%88PostgreSQL%EF%BC%89.html)に基づき、SQL文をフォーマットするツールです。  

### 弊社でのSQLフォーマッター開発の取り組み

元々弊社では[uroboroSQL Formatter](/articles/20170228/)（以下uroboroSQL Formatterを旧版、uroboroSQL-fmtを新版と呼ぶ）というSQLフォーマッターを公開していました。旧版は

- 字句解析して得られたトークンを基にフォーマットするという設計になっていたため、SELECT句のエイリアス補完といった文法を考慮する必要のある機能の追加が困難
- Pythonで書かれておりVSCodeの拡張機能として動作させるのが難しい

という課題を抱えており、それを解消するため新たなSQLフォーマッターを開発していました。

#### ANTLR+TypeScriptによるSQLフォーマッターの開発
[Engineer Camp2020](/articles/20200606/)でANTLRとTypeScriptによるSQLフォーマッターを開発しました。インターンシップ中にSQLがフォーマットできるようになり、この方向性で旧版が抱えていた課題は解決できそうに思えましたが、SQLの構文解析が著しく遅いという問題点がありました。弊社太田が[ANTLRのJavaScript runtimeの不具合を発見](https://github.com/antlr/antlr4/issues/2902)し、かなり高速化されたものの実用的な速さにはならなかったこともありANTLRを用いたSQLフォーマッターの開発はストップしました。

インターンシップで行ったことについては以下の記事をご覧ください。
- [Engineer Camp2020でSQLフォーマッタを開発しました](/articles/20200919/)

#### RustによるSQLフォーマッターの開発
旧版の課題を解決しつつ十分な速さでフォーマット可能なSQLフォーマッターを開発するため、[Engineer Camp2022](https://future-architect.github.io/articles/20220606b/)でRustによるSQLフォーマッターの開発を開始しました。インターンシップ終了時点で簡単なSQLのフォーマットが可能になり、その後もアルバイトとしてSQLフォーマッター開発に参画していただき、旧版のフォーマッターでは実現できなかったSELECT句のエイリアス補完等の機能、[vscode拡張化](https://marketplace.visualstudio.com/items?itemName=Future.uroborosql-fmt)、[wasm化](https://future-architect.github.io/uroborosql-fmt/)を実現しリリースに至りました。

インターンシップで行ったことや開発の過程で調査したことは以下の記事をご覧ください。
- [Engineer Camp2022 RustでSQLフォーマッタ作成（前編）](/articles/20220916b/)
- [Engineer Camp2022 RustでSQLフォーマッタ作成（後編）](/articles/20220916c/)
- [Language Server Protocolを用いたVSCode拡張機能開発 (前編)](/articles/20221124a/)
- [Language Server Protocolを用いたVSCode拡張機能開発 (後編)](/articles/20221125a/)
- [Rust製SQLフォーマッタをnapi-rsを利用してVSCode拡張機能化](/articles/20221228a/)
- [C/C++を呼び出しているRustのWASM化](/articles/20230605a/)

### 旧版と新版の比較

#### 処理時間比較

新しく開発したSQLフォーマッターでは処理時間が大幅に向上しています！
巨大なSQLファイルと小さなSQLファイルをフォーマットしたときの処理時間を比較しました。
内容によってフォーマットにかかる時間は変わって変わるため、あくまで一例ですが概ね5-500倍ほど性能改善しています。

||旧版|新版|
|-|-|-|
|3985行のINSERT-SELECT文|1m53.651s|0m0.194s|
|[6行のSELECT文](https://github.com/future-architect/uroborosql-fmt/blob/main/crates/uroborosql-fmt/testfiles/dst/select/asterisk.sql)|0m0.357s|0m0.054s|

#### 機能比較

字句解析ベースから構文解析ベースになったことで、下記のような構文を意識した補完やauto fixができるようになっています。

##### カラムのAS補完
###### フォーマット前
```sql
SELECT
	COLUMN1	COL1
FROM
	TBL
```

###### フォーマット後
```sql
SELECT
	COLUMN1	AS	COL1
FROM
	TBL
```

##### カラムエイリアス補完

###### フォーマット前
```sql
SELECT
	COL1
FROM
	TAB1
```

###### フォーマット後
```sql
SELECT
	COL1	AS	COL1
FROM
	TAB1
```

##### 長い関数呼出の折返し

###### フォーマット前

```sql
select
	longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglong(
		short_func(
			param1
		,	param2
		)
	,	param2
	) as func_col 
,   t.col1
from
    tbl t
where
longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglong(param1,param2) = case when t.col2 = 1 then 'pattern1' else 'default' end
```

###### フォーマット後

[max_char_per_line](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/max_char_per_line.md)の設定は関数呼出の長さの上限を表し、デフォルトが50になっています。

この例ではlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglongは50文字超のため変数ごとに折返され、short_funcは引数入れても50文字以内のためワンライン化されています。

where句にあってもいい感じに折り返され、横スクロールが発生しにくいようになっています。

longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglongは50文字超のため変数ごとに折返され、short_funcは引数入れても50文字以内のためワンライン化されています。

where句にあってもいい感じに折り返され、横スクロールが発生しにくいようになっています。

```sql
select
	longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglong(
		short_func(param1, param2)
	,	param2
	)		as	func_col
,	t.col1	as	col1
from
	tbl	t
where
	longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglong(
		param1
	,	param2
	)	=
		case
			when
				t.col2	=	1
			then
				'pattern1'
			else
				'default'
		end
```

##### 新旧の機能比較

その他新旧の機能比較は下記です。

[テーブルのAS除去](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/remove_table_as_keyword.md)や[::によるキャストをCASTに変換](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/convert_double_colon_cast.md)などPostgreSQL限定構文は等価の標準SQLに変換する機能を入れています。

||旧版|新版|
|-|-|-|
|対応SQL|全て|PostgreSQL|
|[タブサイズの設定](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/tab_size.md)|o|o|
|[予約語](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/keyword_case.md)、[識別子](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/identifier_case.md)の変換|大文字化、小文字化|大文字化、小文字化、変換なし|
|[エイリアス補完](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/complement_alias.md)|-|o|
|[outer補完](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/complement_outer_keyword.md)|-|o|
|[カラムのAS補完](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/complement_column_as_keyword.md)|-|o|
|[テーブルのAS除去](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/remove_table_as_keyword.md)|-|o|
|[バインドパラメータの余計な空白除去](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/trim_bind_param.md)|-|o|
|[冗長な空白除去](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/remove_redundant_nest.md)|-|o|
|[1行の最大長指定](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/max_char_per_line.md)|-|o|
|[SQL ID補完](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/complement_sql_id.md)|||
|[::によるキャストをCASTに変換](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/convert_double_colon_cast.md)|-|o|
|[<>を!=に変換](https://github.com/future-architect/uroborosql-fmt/blob/main/docs/options/unify_not_equal.md)|-|o|
|ディレクトリ内のファイルを一括フォーマット|o|-|
|予約語をファイルで指定|o|-|
|vscode拡張|-|o|
|wasm|-|o|
|eclipse plugin|o|-|
|IntelliJ plugin|o|-|
|SublimeText3 plugin|o|-|
|exe版|o|-|
|2way-sql|[uroborosql](https://future-architect.github.io/uroborosql-doc/)、[doma](https://doma.readthedocs.io/en/latest/)|[uroborosql](https://future-architect.github.io/uroborosql-doc/)、[go-twowaysql](https://future-architect.github.io/articles/20210803a/)、[doma](https://doma.readthedocs.io/en/latest/)|
|選択範囲フォーマット|-|o  vscode拡張版のみ|

- PostgreSQL以外のSQLには対応していないため、PostgreSQL以外のSQLのフォーマットには旧版の使用をお勧めしています。
- eclipse pluginとexe版は現在は用意できていないのですが、将来的には作成する予定です！

### 使い方

#### 方法1：wasm版を試してみる

wasm版は[こちらのデモ](https://future-architect.github.io/uroborosql-fmt/)でお試しできます。
使い方についてはデモページ内の説明をご参照ください。

##### wasm版の実行イメージ

<img src="/images/20231120a/wasm版フォーマットデモ.gif" alt="wasm版フォーマットデモ.gif" width="1200" height="618" loading="lazy">


#### 方法2：vscode拡張として使用する

1. まず、他の拡張機能と同様に[uroborosql\-fmt \- Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Future.uroborosql-fmt)をvscodeにインストールしてください。
1. settings.jsonに以下の設定を入れてください
    ```json
    {
      "[sql]": {
        "editor.defaultFormatter": "Future.uroborosql-fmt"
      }
    }
    ```
1. SQLファイルを開き、コマンドパレットから`Format Document`か、`format sql`を実行してください
  `format sql`では選択範囲のフォーマットをサポートしています

##### フォーマットの設定方法
フォーマットの各種設定を記載したファイルのパスを指定することができます。
指定されなかった場合にはデフォルトのパスにある `./.uroborosqlfmtrc.json` を読み込みます。
設定ファイルが存在しなかった場合、デフォルト値でフォーマットされます。
※ 現状は設定ファイルのパスしかできませんが、個々の設定の変更もvscodeの設定画面から出来るようにする予定です。

設定ファイルは以下のような内容です。
個々の設定については[uroborosql\-fmt \- Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Future.uroborosql-fmt)をご参照ください。

```json
{
  "debug": false,
  "tab_size": 4,
  "complement_alias": true,
  "trim_bind_param": false,
  "keyword_case": "preserve",
  "identifier_case": "preserve",
  "max_char_per_line": 50,
  "complement_outer_keyword": true,
  "complement_column_as_keyword": true,
  "remove_table_as_keyword": true,
  "remove_redundant_nest": true,
  "complement_sql_id": true,
  "convert_double_colon_cast": false,
  "unify_not_equal": true
}
```

##### vscode拡張版の実行イメージ

<img src="/images/20231120a/vscode版フォーマットデモ.gif" alt="vscode版フォーマットデモ.gif" width="817" height="585" loading="lazy">

#### 方法3：cliで使用する

1. Rustの環境を構築
1. `cargo install --git https://github.com/future-architect/uroborosql-fmt` で `uroborosql-fmt-cli` をインストール
1. `uroborosql-fmt-cli input.sql` で `input.sql` をフォーマットした結果が標準出力に出力されます。`uroborosql-fmt-cli input.sql result.sql` のように第2引数を渡すと、第2引数で指定したファイルにフォーマット結果が格納されます

### チーム開発で使用する場合

1. `.vscode/settings.json` を作成し、以下のように`uroborosql-fmt.configurationFilePath`の設定を記載してください
    ```json
    {
        "uroborosql-fmt.configurationFilePath": "./.uroborosqlfmtrc.json"
    }
    ```
1. チームで使用したいフォーマットの設定を`.uroborosqlfmtrc.json`に記載し、リポジトリ直下に配置してください

### 最後に

まだまだ枯れておらずフォーマットできないことも多いです。元のSQLを壊していないか検証するロジックは入っていますが、意図しない変更が入っていないか確認お願いします。不具合や要望等ございましたらお気軽にissueやPRいただければと思います。

※ ライセンスはBSLですが競合会社含め開発環境での利用は自由ですので、お気軽に使用ください
