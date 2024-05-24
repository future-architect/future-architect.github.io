---
title: "DynamoDB Streamsは同一ハッシュキーでもソートキーが異なれば順序保証されない"
date: 2022/10/20 00:00:00
postid: a
tag:
  - AWS
  - DynamoDB
  - DynamoDBStreams
  - Lambda
  - 失敗談
category:
  - Infrastructure
thumbnail: /images/20221020a/thumbnail.png
author: 真野隼記
lede: "TIG DXユニットの真野です。タイトルに書いたままの内容の記事です。おそらくDynamoDB Streams について調べたことがある方の多くの人には自明な内容だと思います。サマリです。* DynamoDB Streamsの起動順序が保たれるのは 項目単位"
---
# はじめに

TIG DXユニットの真野です。

タイトルに書いたままの内容の記事です。おそらくDynamoDB Streams について調べたことがある方の多くの人には自明な内容だと思います。サマリです。

* DynamoDB Streamsの起動順序が保たれるのは **項目単位**
    * ハッシュキーのみのテーブルであればその単位
    * ハッシュキー＋ソートキーのテーブルであれば、 **ソートキーまで含めた単位**
    * ソートキーが異なれば、起動順序が異なる可能性がある
* よく耳にするDynamoDB Streams シャードに言い換えると、シャードが同じであれば順序制御される
    * 異なるシャード同士では当然、順序保証はされない
    * 同じハッシュキーでも、ソートキーが異なれば異なるシャードに割り当てられる可能性がある（あった）
    * DynamoDB Streamsのシャードは、DynamoDBテーブルのパーティションとは管理粒度が異なる

私がガッツリ勘違いしていて、でもトラブルシュートしてくれたのはチームの若手エースという、遺憾な結果でしたので、二度と繰り返さないという反省の意味も込め詳細を書きます。


## DynamoDB Streamsとは

DynamoDB Streamsについては1.5年前に似たような小ネタを投稿しました。DynamoDB Streams自体についてはそちらを参照ください（今見ても（当時から）すでにタイトルが..）。

* [オレのDynamoDB Streamsが再着火しないわけがない ](/articles/20210122/)



## ハマったケース

例を上げて説明します。

<img src="/images/20221020a/dynamodbstreams_構成.png" alt="dynamodbstreams_構成.png" width="1200" height="277" loading="lazy">

構成例のイメージです。何かしらスタッフの動作をセンシングするデバイスがあり、それをリアルタイムでDynamoDBに登録。そのデータをニアリアルタイムで別システムに連携する必要があるため、DynamoDB StreamsでS3に N 分間隔でタイムスタンプ付きのファイル名で出力。連携先の別システムはファイル名をもとに順次取り込む、といった連携方式です。

センシングされたデータは時系列に並んでおり、DynamoDBのキーとしては、デバイスIDがハッシュキー、読み取り時間がソートキーになるようなイメージです。

問題になった事象としては次です。

* 生成されたファイルを順次取り込んだが、あるデバイスIDに絞ると時系列で順序が狂っていた
* センシングされた最新の情報が誤って取り込まれ、実体とシステムの値が異なった

<img src="/images/20221020a/dynamodbstreams_構成-ページ2.drawio.png" alt="dynamodbstreams_構成-ページ2.drawio.png" width="1200" height="486" loading="lazy">

最初は、センシングするデバイス側から送られる順番が狂ったとか、図では省略していますが途中で経由するKinesis Data StreamsのシャードIDにデバイスIDが入っていないなど、DynamoDBに書き込まれるまでで順序が狂ったのかと思っていましたが、書き込みデータにデバイスから送信日時とサーバ受付時間、DBへの永続日時を比較すると原因がDynamoDB Streamsでの出力で狂っていることが分かりました。


## 発生メカニズム

[Amazon DynamoDB ストリームを使用して、順序付けされたデータをアプリケーション間でレプリケーションする方法 | Amazon Web Services ブログ](https://aws.amazon.com/jp/blogs/news/how-to-perform-ordered-data-replication-between-applications-by-using-amazon-dynamodb-streams/) からの図を参照します。

DynamoDB Streamsは内部的にシャードと呼ばれる単位で分割されています。シャードがどういう単位で分割されるかは利用者側の制御ができず、操作数に応じて柔軟に拡大・縮小する仕組みです。（下図だと3シャードに分かれており、その単位でLambdaが起動します。）

<img src="/images/20221020a/DDB-Stream.jpg" alt="DDB-Stream.jpg" width="880" height="459" loading="lazy">

Lambdaの起動数ですが、同時実行数を1にすれば、次のように1シャード、1Lambdaしか起動しないです。シャード内は更新順に並んでいるためその中ではLambdaで順番に処理すれば良いです。

<img src="/images/20221020a/DDB-Table1.jpg" alt="DDB-Table1.jpg" width="760" height="293" loading="lazy">

今回の間違いは、下図のように、同一Partitionにあるけれど、異なるDynamoDB Streamsシャードに割り当てられたため、ほぼ同時タイミングで複数のLambdaが起動し、同一ハッシュキーのデータ順序が狂ったことが原因で発生しました。

<img src="/images/20221020a/dynamodb順序-ページ3.drawio.png" alt="dynamodb順序-ページ3.drawio.png" width="1200" height="397" loading="lazy">

連携先システムとしてはどのファイルにどのキーが含まれているかわかりようがないので回避しようがない（ファイルをマージして取り込むにしても、まだ出力されていないファイルに順序が狂ったデータが無いと言い切れない）ため、出力側が調整すべきことです。

なお、図ではシャードごとのLambda起動順が狂った感じで書いていますが、起動順序が図とは逆であったとしても、Lambdaの実行時間によっては想定外の出力順序になりえます（どちらか片方がこの例でいくとS3の書き込みでリトライが走ったとか、Streamsの件数がたまたま片方が100件でもう片方が10件だったとか）。

これを開発した当初はデータ量もまだ少なく、シャードが細かく分割されていなかったためテストで検知されず、利用量が増えたことで顕在化したのかなとも思います。ハッシュキーが同じであればDynamoDB上は同一パーティションとなるので、そのままDynamoDB Streamsのシャードとなるのかと勘違いしていました。思い込みは良くないですね。後で切り分けするのは大変なので最初に裏取りしておくべきことでした。



## 回避方法

複数の回避手段があるかなと思います。てっとり早いのはDynamoDB Streamsではなく定時起動のジョブを作ることでしょう。

<img src="/images/20221020a/改善案.png" alt="改善案.png" width="1200" height="642" loading="lazy">

もし、取り込み側のシステムのコントロールが効く、かつ過去分に対する補正処理が複雑でなければ、前回取り込んだデバイスのセンサー読み取り時刻より古ければ弾くといった処理を入れても良いかなと思います（状況によりますが）。

ちなみに、シャードが分かれることが原因であるため、Kinesis Data Streamsのキャプチャに変えても意味はないです。

* [Kinesis Data Streams を使用して DynamoDB への変更をキャプチャする。 - Amazon DynamoDB](https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/kds.html)


## まとめ

* AWSドキュメント、ちゃんと読みましょう（自戒）
* DynamoDB Streamsの起動順序は項目単位。ソートキーが指定されているテーブルの場合は、ハッシュキー＋ソートキーの単位での保証となる
    * 時系列DBのような使い方をしているテーブルに関しては、おそらく想定通りの挙動をしない



