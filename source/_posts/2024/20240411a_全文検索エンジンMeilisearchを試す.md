---
title: "全文検索エンジンMeilisearchを試す"
date: 2024/04/11 00:00:00
postid: a
tag:
  - 全文検索
  - スクレイピング
category:
  - Infrastructure
thumbnail: /images/2024/20240411a/thumbnail.png
author: 岸本卓也
lede: "ある静的サイトジェネレーターで生成された膨大なドキュメントの検索において、全文検索機能はあるものの以下の課題を感じることがありました。"
---
<img src="/images/2024/20240411a/meilisearch-logo-light.png" alt="" width="495" height="74" loading="lazy">

# はじめに

こんにちは、TIGの岸本卓也です。 [春の入門連載2024](/articles/20240408a/) の3番目です。

ある静的サイトジェネレーターで生成された膨大なドキュメントの検索において、全文検索機能はあるものの以下の課題を感じることがありました。

* 探したいものがヒットしないことがある
* どこがヒットしているのか謎なものが検索結果に含まれることがある
* クライアントサイドで動くため、ページ読み込み時に数十MBと大きいことも多いインデックスファイルをダウンロードするため、ページの読み込み完了が遅い原因になっている

検索にヒットしない場合は、欲しい情報がありそうなページをリンクから辿って個別に探すしかないのです。しかしこれは手間です。

このような課題を解決すべく新たな全文検索エンジンを探す中でMeilisearchという製品を見つけました。Meilisearchは日本語の検索においても良さそうでかつ手軽に試せたので、試した内容を紹介します。

# Meilisearchとは

公式サイトの [トップページ](https://www.meilisearch.com/) やドキュメントの [概説ページ](https://www.meilisearch.com/docs/learn/what_is_meilisearch/overview) によると、検索の応答が早く、すぐに使い始められる、というのが大きな特徴のようです。機能はRESTful APIで提供され、Blogやドキュメントサイトの検索のほか、ECサイトにおける検索への組み込みといったユースケースがあるそうです。

[多くの特徴が挙げられています](https://www.meilisearch.com/docs/learn/what_is_meilisearch/overview#features) が、中でも以下のように日本語のサポートが明示されているのは安心感があります。

> Comprehensive language support: Optimized support for Chinese, Japanese, Hebrew, and languages using the Latin alphabet
> 包括的な言語サポート: 中国語、日本語、ヘブライ語、およびラテン文字を使用する言語の最適化されたサポート(by Google翻訳)

日本で活動されている [@mosuka (Minoru OSUKA) さんをはじめとしたOSSコミッターの皆さま](https://qiita.com/mosuka/items/fbda479b25a7ccd7c350) により日本語処理が改善されているようです。

# 試用環境

当記事は以下の環境で実施しました。

* EC2インスタンス: t3.small
* Meilisearchバージョン: v1.7.1 (prototype-japanese-10)

# セットアップ

公式ドキュメントの [Installationページ](https://www.meilisearch.com/docs/learn/getting_started/installation) ではインストール方法が複数提示されています。ここでは、日本語向けの公式ビルドバイナリが簡単に使えるDockerイメージの方法で構築します。

日本語向けのビルドバイナリを含むDockerイメージはDocker Hubの [こちら](https://hub.docker.com/r/getmeili/meilisearch/tags?page=1&name=japanese) で配布されています。Meilisearchのバージョンとイメージタグの対応関係は [こちらのPull request](https://github.com/meilisearch/meilisearch/pull/3882) に記載されています。

今回は、現時点の最新版であるv1.7.1に対応したDockerイメージを使ってみます。公式の手順通り、pullして

```sh
docker pull getmeili/meilisearch:prototype-japanese-10
```

`development` モードでコンテナを起動します。

```sh
docker run -it --rm \
    -p 7700:7700 \
    -e MEILI_ENV='development' \
    -e MEILI_MASTER_KEY='aSampleMasterKey' \
    -v $(pwd)/meili_data:/meili_data \
    getmeili/meilisearch:prototype-japanese-10
```

上記で指定しているオプションの内、Meilisearch特有のものは次の目的で指定しています。

* `-e MEILI_ENV='development'`: `development` モードにします。Meilisearchにはインデックスの確認などのために [search preview](https://www.meilisearch.com/docs/learn/getting_started/search_preview) という簡易的なGUIフロントエンドが備わっています。以降の手順でもインデックスの確認にsearch previewを使いますが、 [セキュリティ上の理由で](https://www.meilisearch.com/docs/learn/getting_started/search_preview#:~:text=For%20security%20reasons%2C%20the%20search%20preview%20is%20only%20available%20in%20development%20mode.) `development` モードでしか使えません。
* `-e MEILI_MASTER_KEY='aSampleMasterKey'`: [Master key](https://www.meilisearch.com/docs/learn/configuration/instance_options#master-key) を指定します。master keyを指定しない場合でも `development` モードでは自動的にキーが生成されて起動できますが、キーを固定するために指定します。master keyは [16バイト以上の長さが必要](https://www.meilisearch.com/docs/learn/configuration/instance_options#master-key:~:text=Expected%20value%3A%20a%20UTF%2D8%20string%20of%20at%20least%2016%20bytes) です。
* `-v $(pwd)/meili_data:/meili_data`: [Dockerコンテナのワーキングディレクトリに作られるデータ](https://www.meilisearch.com/docs/learn/cookbooks/docker#managing-data) を永続化するために指定します。

これでMeilisearchが起動しsearch previewも使えるようになっているため、ブラウザで `http://<Dockerのホスト>:7700` にアクセスしてsearch previewを表示してみます。APIキーの入力を求められるので、コンテナ起動時に指定した `aSampleMasterKey` を入力して [Go] します。

<img src="/images/2024/20240411a/Meilisearch-search-preview-enter-api-key.png" alt="Meilisearch-search-preview-enter-api-key.png" width="766" height="480" loading="lazy">

まだインデックスを作成していないので何も検索できませんが、これでMeilisearchを使う準備は整いました。

# インデックス作成

試しに当ブログサイトのインデックスを作成してみます。

基本的にはAPIを叩いて [インデックス](https://www.meilisearch.com/docs/learn/core_concepts/indexes) に [ドキュメント](https://www.meilisearch.com/docs/learn/core_concepts/documents) を登録します (cf. [ドキュメントを登録するAPIのリファレンス](https://www.meilisearch.com/docs/reference/api/documents#add-or-replace-documents)) が、webサイトのスクレイピングツールである [docs-scraper](https://github.com/meilisearch/docs-scraper) が公式に提供されているのでこれを使ってみます。このツールはwebサイトをクローリングしてインデックスを作成してくれるので、設定さえ用意すれば汎用的に使えそうです。なお、docs-scraperのREADMEには

> 🚨 IMPORTANT NOTICE: Reduced Maintenance & Support 🚨

とあるのでメンテナンスは限定的なようですが、ひとまず使えました。

## docs-scraperによるスクレイピング

設定ファイルのリファレンスは [READMEのこちら](https://github.com/meilisearch/docs-scraper?tab=readme-ov-file#-more-configurations) に記載があり、設定の具体例は [README記載の例](https://github.com/meilisearch/docs-scraper?tab=readme-ov-file#set-your-config-file) や [公式ドキュメント向けの設定ファイル](https://github.com/meilisearch/documentation/blob/main/docs-scraper.config.json) が参考になります。また、
meilisearch/docs-scraperは [algolia/docsearch-scraper](https://github.com/algolia/docsearch-scraper) のフォークなので、[AlgoliaのConfig Filesページ](https://docsearch.algolia.com/docs/legacy/config-file/) の説明もある程度参考になります。

**以降の手順の具体例はそのまま実行はしないようお願いします。** webサイトのクローリングに伴うアクセスは攻撃とみなされる可能性があります (cf. [岡崎市立中央図書館事件](https://ja.wikipedia.org/wiki/岡崎市立中央図書館事件))。

当ブログサイトをスクレイピングするのに次のように設定してみました。設定のキモは後述しますが、docs-scraperの大まか動作としては `start_urls` を起点にこのドメインの範囲内で `<a>` タグを辿ってクローリングします。

<p><details>
<summary><code>docs-scraper.config.json</code></summary>

```json docs-scraper.config.json
{
  "index_uid": "future-tech-blog",
  "start_urls": [
    "https://future-architect.github.io/"
  ],
  "sitemap_urls": [
    "https://future-architect.github.io/post-sitemap.xml"
  ],
  "stop_urls": [
    "https://future-architect.github.io/categories/",
    "https://future-architect.github.io/tags/",
    "https://future-architect.github.io/authors/"
  ],
  "selectors": {
    "lvl0": {
      "selector": ".article-category",
      "global": true
    },
    "lvl1": {
      "selector": ".article-title",
      "global": true
    },
    "lvl2": "main h1",
    "lvl3": "main h2",
    "lvl4": "main h3",
    "lvl5": "main h4",
    "lvl6": "main h5",
    "text": "main p, main li, main tr, main pre"
  },
  "strip_chars": " .,;:#",
  "scrap_start_urls": true,
  "custom_settings": {
    "rankingRules": [
      "words",
      "typo",
      "attribute",
      "exactness",
      "proximity",
      "page_rank:desc",
      "level:desc",
      "position:asc"
    ],
    "searchableAttributes": [
      "hierarchy_lvl1",
      "hierarchy_lvl2",
      "hierarchy_lvl3",
      "hierarchy_lvl4",
      "hierarchy_lvl5",
      "hierarchy_lvl6",
      "content",
      "hierarchy_lvl0"
    ]
  },
  "only_content_level": true
}
```

</details></p>

docs-scraperも公式からDockerイメージが提供されているので、上記の設定を使ってスクレイピングするには [READMEの手順通り](https://github.com/meilisearch/docs-scraper?tab=readme-ov-file#with-docker-) 以下で実行できます。

```sh
docker run -t --rm \
    -e MEILISEARCH_HOST_URL=http://<Dockerのホスト>:7700 \
    -e MEILISEARCH_API_KEY='aSampleMasterKey' \
    -v "$(pwd)/docs-scraper.config.json":/docs-scraper/docs-scraper.config.json \
    getmeili/docs-scraper:latest pipenv run ./docs_scraper docs-scraper.config.json
```

なお、プロキシが必要な場合は適宜 `-e HTTP_PROXY=http://example.jp` といった形で環境変数を追加する必要があります。

スクレイピングが完了したらsearch previewで確認してみます。Meilisearchセットアップ時に表示したsearch preview画面をリロードすると、スクレイピングで作成したインデックスを選択して検索できるようになりました。

<img src="/images/2024/20240411a/Meilisearch-search-preview-search-demo.gif" alt="Meilisearch-search-preview-search-demo.gif" width="960" height="480" loading="lazy">

docs-scraperによってこのインデックスには97,668個のドキュメントが作られました (フューチャー技術ブログの記事数は現在1,062件です)。search previewでは文字入力の度に検索が走るのですが、今回の環境では各検索は数ミリ秒～数十ミリ秒で応答されるようで、lightning fastという謳い文句に偽りのない軽快さを体感できました。

スクレイピング設定の変更やwebサイトの更新に追従するためなど、インデックスを更新したい場合、上記のdocs-scraper実行を再度行えばよいです。docs-scraperは最初にインデックスを削除&新規作成してからドキュメントを登録していきます。ただ、このようにインデックスを更新するとエンドユーザーに影響があります。インデックスが存在しないタイミングがあったりスクレイピング途中のインデックスが使われてしまうためです。これが問題になる場合、swap indexes APIを使って対策できるようです。Swap indexesは [アトミックに処理される](https://www.meilisearch.com/docs/reference/api/indexes#:~:text=Swapping%20indexes%20is%20an%20atomic%20transaction) そうです。

cf. [Swapping indexes](https://www.meilisearch.com/docs/learn/core_concepts/indexes#swapping-indexes)
cf. [Zero downtime index deployment](https://blog.meilisearch.com/zero-downtime-index-deployment/)

docs-scraperによって作成される [ドキュメント](https://www.meilisearch.com/docs/learn/core_concepts/documents) の詳細を確認するため、APIでドキュメントを参照してみます (cf. [単一ドキュメントを取得するAPIのリファレンス](https://www.meilisearch.com/docs/reference/api/documents#get-one-document))。docs-scraperによって作成されるインデックスではprimary keyとして `objectID` が設定されています (cf. [単一インデックスの情報を取得するAPIのリファレンス](https://www.meilisearch.com/docs/reference/api/indexes#get-one-index))。

```sh
$ curl -s \
  -X GET "http://127.0.0.1:7700/indexes/future-tech-blog" \
  -H "Authorization: Bearer aSampleMasterKey" | jq
{
  "uid": "future-tech-blog",
  "createdAt": "2024-04-10T11:07:14.284264598Z",
  "updatedAt": "2024-04-10T11:13:42.28654364Z",
  "primaryKey": "objectID"
}

$ curl -s \
  -X GET "http://127.0.0.1:7700/indexes/future-tech-blog/documents/daf5dff8c3dcdce27e0d55e32c8f6d76d99a0eb1" \
  -H "Authorization: Bearer aSampleMasterKey" | jq
{
  "hierarchy_lvl1": "Bashのシェル展開",
  "hierarchy_lvl2": "プロセス置換 (Process Substitution)",
  "hierarchy_lvl3": null,
  "hierarchy_lvl4": null,
  "hierarchy_lvl5": null,
  "hierarchy_lvl6": null,
  "content": "プロセス置換はプロセスへの入出力をファイルで参照できるようにします。",
  "hierarchy_lvl0": "Infrastructureカテゴリ",
  "anchor": "プロセス置換-Process-Substitution",
  "type": "content",
  "tags": [],
  "url": "https://future-architect.github.io/articles/20210406/#プロセス置換-Process-Substitution",
  "url_without_variables": "https://future-architect.github.io/articles/20210406/#プロセス置換-Process-Substitution",
  "url_without_anchor": "https://future-architect.github.io/articles/20210406/",
  "no_variables": "True",
  "objectID": "daf5dff8c3dcdce27e0d55e32c8f6d76d99a0eb1",
  "page_rank": 0,
  "level": 0,
  "position": 81,
  "hierarchy_radio_lvl0": null,
  "hierarchy_radio_lvl1": null,
  "hierarchy_radio_lvl2": null,
  "hierarchy_radio_lvl3": null,
  "hierarchy_radio_lvl4": null,
  "hierarchy_radio_lvl5": null,
  "hierarchy_radio_lvl6": null
}
```

上記ドキュメントのすべての属性 (attribute) はdocs-scraperが独自に定義した属性 (=Meilisearchのシステム的な属性はない) です。 Meilisearchで予約された属性が存在する場合、その名前は [アンダースコア `_` 始まりになっています](https://www.meilisearch.com/docs/learn/core_concepts/documents#:~:text=displayed%20or%20searchable.-,Reserved%20attributes,-Some%20features%20require)。

webページ本文の情報は `hierarchy_lvl0` ～ `hierarchy_lvl6` 及び `content` 属性に入ります。これらの属性の利用イメージは [こちら](https://github.com/meilisearch/docs-scraper?tab=readme-ov-file#the-levels-) です。これらの属性値で検索するため、値がうまく入るように設定するのがキモです。これらの属性と設定は以下の通り対応します。

```
hierarchy_lvl0 ← selectors.lvl0
hierarchy_lvl1 ← selectors.lvl1
hierarchy_lvl2 ← selectors.lvl2
hierarchy_lvl3 ← selectors.lvl3
hierarchy_lvl4 ← selectors.lvl4
hierarchy_lvl5 ← selectors.lvl5
hierarchy_lvl6 ← selectors.lvl6
content ← selectors.text
```

`selectors` の設定ではどのHTMLタグの内容を取得するかをCSSセレクターで指定します。マークアップ方法はwebサイトごとに異なるので、各webサイトに合ったセレクターに調整する必要があります。CSSセレクターでは取得できない場合、XPathでも指定できます。例えば、以下は `class` 属性に `active` と `sidebar-link` が含まれるタグをXPathで指定する例です。

```json
{
  "selectors": {
    "lvl0": {
        "selector": ".//*[(@class and contains(concat(' ', normalize-space(@class), ' '), ' sidebar-link ')) and (@class and contains(concat(' ', normalize-space(@class), ' '), ' active '))]",
        "type": "xpath",
        "global": true
    }
  }
}
```

# さいごに

当記事ではMeilisearchのセットアップと実際のwebサイトのクローリング例を紹介しました。Meilisearchを動かすのも検索の応答速度も謳い文句通りに早くて好印象でした。インデックスを作成するのも、とりあえず動かすだけなら `selectors` を大まかに設定してみれば良いのでHTML, CSSの知識があれば難易度は低いと思います。

今回は試すに至りませんでしたが、より良い検索結果を得るにはインデックスの作り方や [フィルター](https://www.meilisearch.com/docs/learn/what_is_meilisearch/overview#features:~:text=Filtering%20and%20faceted%20search%3A%20Enhance%20user%20search%20experience%20with%20custom%20filters%20and%20build%20a%20faceted%20search%20interface%20in%20a%20few%20lines%20of%20code) など使える種々の機能があるようなので、折を見て試していこうと考えています。

# 参考リンク

* [Meilisearch Documentation](https://www.meilisearch.com/docs)
