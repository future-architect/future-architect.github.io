---
title: "PostgreSQLの全文検索機能を試してみる"
date: 2025/08/29 00:00:00
postid: a
tag:
  - PostgreSQL
  - 全文検索
  - Go
category:
  - DB
thumbnail: /images/2025/20250829a/thumbnail.png
author: 澁川喜規
lede: "全文検索機能がPrismaにも標準で用意されているということを知りました。PostgreSQLで全文検索はというと、PGroongaとか、pg_bigmを使うとかがトップ出てくるし、そもそも検索をしたくなったらElasticsearch使う、みたいに思っていました。標準で全文検索もできるなら運用コストもだいぶ下げられそうです。"
---

<img src="/images/2025/20250829a/top.png" alt="" width="600" height="600">

[夏の自由研究2025](/articles/20250825a/)ブログ連載の4日目です。

技術コンサルをしているお客さんとPrismaのドキュメントの読書会をしていて、全文検索機能が[Prismaにも](https://www.prisma.io/dataguide/managing-databases/intro-to-full-text-search)、[PostgreSQLにも](https://www.postgresql.org/docs/current/textsearch.html)標準で用意されているということを知りました。PostgreSQLで全文検索はというと、PGroongaとか、pg_bigmを使うとかがトップ出てくるし、そもそも検索をしたくなったらElasticSearch使う、みたいに思っていました。

標準で全文検索もできるなら運用コストもだいぶ下げられそうです。かつて、Python製ドキュメントツールの、ブラウザで動く全文検索エンジンの日本語対応をやってみたり、FM-indexという[高速文字列解析の世界](https://www.iwanami.co.jp/book/b257894.html)という書籍で紹介されていたアルゴリズムを使ったブラウザで動く検索エンジンを作ったり、[転置インデックスをS3に置く検索エンジン](/articles/20200327/)を作ってみたり~~貧乏~~低コスト検索エンジンの第一人者(自称)としては試してみたいところです。

ものは試しでやってみました。

# PostgreSQLの全文検索機能

PostgreSQLの全文検索では、`LIKE`とか`ILIKE`で検索するみたいに、 `@@`で転置インデックスを検索する演算子が提供されており、それを呼び出します。検索するフィールドは`to_tsvector()`、検索ワードは`to_tsquery()`関数に渡して前処理をするところがポイントですかね。

```sql
SELECT title
FROM pgweb
WHERE to_tsvector(title || ' ' || body) @@ to_tsquery('create & table')
ORDER BY last_mod_date DESC
LIMIT 10;
```

テーブルの中にもtsvectorを作ってあげます。

```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    author TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_text TEXT NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(processed_text, ''))
    ) STORED
);
```

なお、全文検索エンジンあるあるテーマが日本語対応で、大抵は英語のようにスペース区切りの単語で分割し、転置インデックスという、単語→ドキュメントのインデックスを作り、それを元に検索をするという仕組みです。その過程で、英語やドイツ語などの言語ごとに正規化（ステミング）、冠詞などのノイズになる単語(stop word)をフィルタリングなど、自然言語ごとの前処理を行います。そのあたりの設定は[ここ](https://www.postgresql.org/docs/current/textsearch-dictionaries.html)に書かれています。

標準でサポートしている言語は17.5で以下のような感じです。

```sh
/usr/local/share/postgresql/tsearch_data # ls *.stop
danish.stop      finnish.stop     hungarian.stop   norwegian.stop   spanish.stop
dutch.stop       french.stop      italian.stop     portuguese.stop  swedish.stop
english.stop     german.stop      nepali.stop      russian.stop     turkish.stop
```

デフォルトでは日本語のようなスペース区切りではない言語は対応できません。当然日本語の文法ルールもなく、stop wordの辞書もありません。この機能も、昔は日本語対応のtextsearch_jaというモジュールがあったようですが、今はメンテナンスされていないようです。仮にされていたとしても、DB運用はクラウドにお任せ時代なので最初から導入されている方が運用は楽でしょう。

なんとかして使ってみる方法として、事前に、DBの外でスペース区切りにしてからテーブルに入れてみるという前処理をする方法を試してみます。

# GoでPostgreSQLの全文検索で日本語検索してみる

Goでは分かち書きのライブラリとして定評のある[github.com/ikawaha/kagome/v2](https://pkg.go.dev/github.com/ikawaha/kagome/v2)を使います。

kagomeではこんな感じではこんな感じに

```sh
$ kagome
シグナルを送信した
シグナル        名詞,一般,*,*,*,*,シグナル,シグナル,シグナル
を      助詞,格助詞,一般,*,*,*,を,ヲ,ヲ
送信    名詞,サ変接続,*,*,*,*,送信,ソウシン,ソーシン
し      動詞,自立,*,*,サ変・スル,連用形,する,シ,シ
た      助動詞,*,*,*,特殊・タ,基本形,た,タ,タ
```

助詞とか助動詞はひかっかりまくるので削除し、動詞などは原形にすることで、「送信する」「送信した」などの表記揺れでもひっかかるようになります。分かち書きでは品詞もわかるのでこれを使って、助詞、助動詞、副詞などを除外すれば良いでしょう。簡単ですね。

# 実装

ソースコードは[github.com/shibukawa/pgtfs](https://github.com/shibukawa/pgtfs)です。生成AIでサッと作りました。ライセンスはUnlicenseです。full text searchだとftsのはずですが、スペルを間違ったのでtfsになってます。CLIツールとなっています。実証実験のコードなので、インデックスのメンテナンスとか考えずに、一発投入のみ。

```sh
# PostgreSQLの起動
$ docker compose up

# DBを初期化して./articles以下のテキストファイルをDBに投入
$ ./pgtfs init

# 検索
$ ./pgtfs search "検索用語"
```

サンプルドキュメントも生成AIが用意してくれました。

```md golang.md
# Goプログラミング言語

Goは、Googleが開発したプログラミング言語です。

## 特徴
- シンプルな文法
- 高速なコンパイル
- 優れた並行処理機能
- ガベージコレクション

## 活用分野
Goは以下の分野で広く使用されています：
- Webサービス開発
- クラウドインフラストラクチャ
- コマンドラインツール
- マイクロサービス

ゴルーチンとチャネルを使った並行プログラミングが魅力的です。
```

内部では次のように区切られてスペース区切りにされて保存されます。

```text
#|Go|プログラミング|言語|Go|Google|開発|し|プログラミング|言語|
##|特徴|-|シンプル|文法|-|高速|コンパイル|-|優れ|並行|処理|機能|
-|ガベージコレクション|##|活用|分野|Go|以下|分野|広く|使用|さ|れ|い|
-|Web|サービス|開発|-|クラウドインフラストラクチャ|-|コマンドラインツール|
-|マイクロ|サービス|ゴルーチン|チャネル|使っ|並行|プログラミング|魅力|的
```

「Web開発」で検索します。この単語は文中にはありません。「Webサービス開発」ならあります。うまく分かち書きされると単語がヒットしてくれるはず!!!

```shell
$ ./pgtfs search "Web開発"
Searching for: "Web開発"
Found 1 articles:

=== Result 1 (Rank: 0.0989) ===
Title: golang
File: articles/golang.md
```

きた！

# より使いやすい検索にするには

分かち書きとstop wordは最低限です。実際にElastichsearchで使われるKuromojiではそれ以外に漢数字を算用数字にしたりさまざまなフィルタを提供しています。

* [ZOZO TECH BLOG: Elasticsearchで日本語検索を扱うためのマッピング定義](https://techblog.zozo.com/entry/elasticsearch-mapping-config-for-japanese-search#kuromojiプラグイン機能)

これにより、表記揺れでもヒットしやすいようになります。PostgreSQLの検索機能も類義語辞書が持てるようになっているため、日本語でも頑張って集めることでさらに精度を上げる余地があります。最終的にはベクトル検索を実装して類似文書検索ですかね。いつかはやってみたい。

# まとめ

かんたんな前処理でPostgreSQLの標準の検索機能が使えました。これでコストを増やさずに全文検索機能が簡単に組み込めるでしょう。bigmなんかは正規の単語の区切りではないところでもひっかかってしまったりというのがあり、やはりきちんと分かち書きをした検索エンジンが使いたいですよね？どのような言語でもたいてい分かち書きのライブラリはあると思うので言語問わず利用できると思います。

[PostgreSQLにはPub/Sub機能もある](/articles/20240628a/)ので、DBさえあれば他のマネージドサービスは要らない、という時代がそのうち来るんじゃないかと思っているところです。
