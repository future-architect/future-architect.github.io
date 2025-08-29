---
title: "OpenAPI Specification v3.0.3のコーディング規約を公開しました"
date: 2024/07/02 00:00:00
postid: a
tag:
  - OpenAPI
  - コーディング規約
  - 設計
  - チーム開発
category:
  - Programming
thumbnail: /images/2024/20240702a/thumbnail.png
author:  武田大輝
lede: "フューチャーの有志メンバでOpenAPI Specification（OAS） v3.0.3に対応したコーディング規約を作成しました。"
---
## はじめに

フューチャーの有志メンバーでOpenAPI Specification（OAS） v3.0.3に対応したコーディング規約を作成しました。

<a href="https://future-architect.github.io/coding-standards/documents/forOpenAPISpecification/OpenAPI_Specification_3.0.3.html">
<img src="/images/2024/20240702a/image.png" alt="" width="1200" height="719" loading="lazy">
</a>

https://future-architect.github.io/coding-standards/documents/forOpenAPISpecification/OpenAPI_Specification_3.0.3.html

[2023年7月にv2.0の規約を公開](https://future-architect.github.io/articles/20230725a/)してから約1年ぶりのアップデートとなります。
フューチャーの現場でもv3系の利用が主流となる中、有識者のナレッジを集める形で標準化を行っています。
まだ荒削りな部分は多々ありますが、早期に公開してフィードバックを得ながらブラッシュアップしていく方針のもと、公開に踏み切りました。

内容へのフィードバックは、[GitHub Issue](https://github.com/future-architect/coding-standards/issues)を起票いただくか、Xアカウント（[@future_techblog](https://twitter.com/future_techblog)）宛にメンションを入れてコメントを貰えると幸いです。

## 規約の内容

大きく「要素規約」と「設計上のポイント」の2部構成となっています。

### 要素規約

OpenAPI ドキュメントを構成する主要な要素を対象に、命名規約など基本的な部分をはじめとし、「何を」「どのように」記載するかの方針を示しています。

v2からの大きなアップデートとして、v3では、再利用可能なコンポーネント（components）セクションが導入され、スキーマ、パラメータ、リクエストボディ、レスポンス、セキュリティスキーマなどを一元的に定義できるようになりました。

これに伴い「何をコンポーネント化するのか」といった方針を示している点が大きなポイントとなります。

特にこのあたりは、ソースコードの自動生成ツール（例. [openapi-generator](https://github.com/OpenAPITools/openapi-generator)）の事情を考慮せずに語ることはできません。例えば、再利用しないようなオブジェクトでも、自動生成の都合上、ネストするオブジェクトはスキーマとして定義する必要がある、といったように、現場事情を盛り込んだものになっています。

### 設計上のポイント

規約というよりは、設計上重要となる方針を記載しています。
具体的には、下記のような設計時に悩むことの多いトピックについて取り上げています。
例えば、パラメータのバリデーションをどこまで厳密に定義すべきかという議論はよくあるのではないでしょうか。

* ファイルアップロード
* ファイルダウンロード
* CORS
* OpenTelemetry Traceparent HTTP Header
* バリデーション
* 値が存在しないという状態の表現
* ファイル分割

v2の規約よりも大きく内容の拡充が図られていますので、ぜひ参考にしてください。

## 今後について

2024年6月時点で最新バージョンであるOAS v3.1.0に対応した規約のアップデートも行なっていきたいです。エコシステムの対応状況などを鑑みて、v3.1.0の採用に踏み切れないケースもまだ多くあり、もう少し社内での利用実績が増えたらといったところでしょうか。

また、規約に対するフィードバックを確認しつつ、本規約に沿ったLinterやFormatterの開発も検討していきたいと思います。

ぜひこのあたりは社外からも、社内からも声をいただきたいところです。

引き続きどうぞよろしくお願いいたします。
