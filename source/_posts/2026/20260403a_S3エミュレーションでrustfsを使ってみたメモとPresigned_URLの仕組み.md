---
title: "S3エミュレーションでrustfsを使ってみたメモとPresigned URLの仕組み"
date: 2026/04/03 00:00:00
postid: a
tag:
  - S3
  - rustfs
  - Docker
  - Go
category:
  - Infrastructure
thumbnail: /images/2026/20260403a/thumbnail.png
author: 澁川喜規
lede: "ちょっとしたオブジェクトストレージ前提のシステムのローカルテストでApache2ライセンスのrustfsを使ってみました。おおむね簡単だったのですが、認証設定をしたり、presigned URLの発行だけちょっと手間がかかってしまったのでその対応とその過程で学んだことのメモです。"
---

ちょっとしたオブジェクトストレージ前提のシステムのローカルテストでApache 2ライセンスのrustfsを使ってみました。おおむね簡単だったのですが、認証設定をしたり、presigned URLの発行だけちょっと手間がかかってしまったのでその対応とその過程で学んだことのメモです。

このあたり、minioがDockerイメージの配布をやめてメンテナンスモードになったり、LocalStackがユーザー登録必須になってCIで使いにくくなったりでにわかに話題になっていたところですね。

* [さくらんぼの技術備忘録: 手軽に使えるS3互換ストレージを求めて](https://light-of-moe.ddo.jp/~sakura/diary/?p=1931)
* [minioがdockerイメージを配布しなくなったので新しいS3互換ストレージを探す](https://zenn.dev/appleworld/articles/e1bac60a3bd333)

ちょっとしたウェブアプリのバックエンドのストレージとしてオブジェクトストレージが欲しくなったのですが、これまではminioをたまに使ったりしていたものの、別のものを検討するにあたり、docker composeで一緒に起動するという使い方で使いやすいものということで、いろいろ比べてrustfsを選んでみました。

# compose.yamlでの利用方法

rustfsの公式イメージをそのまま使うだけです。一瞬で起動します。

* デフォルトで9000ポートでAPIのエンドポイントを、9001で管理画面(RUSTFS_CONSOLE_ENABLEが必要)を公開します
* 複数ボリュームのレプリケーションとか色々複雑な機能もありますが、テスト用で可用性はいらなかったので1ボリュームにしています
* 起動時にはバケットができて欲しいところなので、amazon/aws-cliイメージを使って起動時にバケットを作るようにします

```yaml compose.yaml
services:
  rustfs:
    image: rustfs/rustfs:latest
    environment:
      RUSTFS_CONSOLE_ENABLE: "true"
      RUSTFS_ACCESS_KEY: rustfsadmin
      RUSTFS_SECRET_KEY: rustfsadmin
      RUSTFS_VOLUMES: /data/rustfs0
    volumes:
      - rustfs-data:/data
      - rustfs-logs:/logs
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "sh", "-c", "curl -sS http://localhost:9000/ >/dev/null"]
      interval: 1s
      timeout: 5s
      retries: 20

  rustfs-init:
    image: amazon/aws-cli:2.31.15
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        set -eu
        until aws --endpoint-url http://rustfs:9000 s3api list-buckets >/dev/null 2>&1; do
          sleep 2
        done
        for bucket in data-bucket log-bucket; do
          aws --endpoint-url http://rustfs:9000 s3api create-bucket --bucket "$$bucket" || true
        done
    environment:
      AWS_ACCESS_KEY_ID: rustfsadmin
      AWS_SECRET_ACCESS_KEY: rustfsadmin
      AWS_REGION: us-east-1
    depends_on:
      rustfs:
        condition: service_healthy

volumes:
  rustfs-data:
  rustfs-logs:
```

使い方を調べると、`RUSTFS_ADDRESS`などの環境変数でアドレスを定義しているものなどもありますが、なくてもデフォルトで9000番（UIは9001番）ポートで開いたので省略しました。

管理画面は動作も軽快だしなかなか良いですね。今まで触ったことのあるウェブを使ったファイル管理画面の中では一番スピードが速くて体験が良いですね。

<img src="/images/2026/20260403a/screenshot_console.png" alt="" width="1200" height="816" loading="lazy">

# Presigned URL

これでAWS SDKを使ったデータの読み書きは問題ありませんでしたが、Presigned URLの発行で問題が発生しました。rustfsの問題というかDockerを使っているから起きた問題ですが、rustfsでは、Presigned URLで発行されるURLはリクエスト時のホスト情報をもとに作られます。Dockerの中からは`http://rustfs:9000`というドメインでアクセスしますが、外からは`http://localhost:9000`なので、発行されたURLのままではアクセスできないということが起きました。

これは発行時にクライアントを新規で作って、ホストを`http://localhost:9000`に設定してそれで発行し直す必要がありました。

```go goのサンプル
    // この環境変数があったらそのホストでURLを発行
	endpoint := os.Getenv("RUNTASK_RUSTFS_OBJECT_PUBLIC_ENDPOINT")
	if endpoint != "" {
		tempOptions := s.options
		tempOptions.Endpoint = endpoint
		tempClient, err := newS3Client(context.Background(), tempOptions)
		if err == nil {
			presigner := s3.NewPresignClient(tempClient)
			presigned, err := presigner.PresignGetObject(context.Background(), &s3.GetObjectInput{
				Bucket: aws.String(s.bucket),
				Key:    aws.String(key),
			}, func(opts *s3.PresignOptions) {
				opts.Expires = expiry
			})
			if err == nil {
				return presigned.URL, nil
			}
			// fallthrough to try using the existing client
		}
	}
    // 設定がない場合は普通に発行
	presigner := s3.NewPresignClient(s.client)
	presigned, err := presigner.PresignGetObject(context.Background(), &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiry
	})
	if err != nil {
		return "", err
	}
	return presigned.URL, nil
```

`Endpoint`を上書きしてしまったら逆にバックエンドのサーバーからrustfsに繋がらないからダメなのでは？と思い込んでましたが、このPresigned URLの発行は[S3 APIを実際に叩いているわけではなく、SDKの中で発行している](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/reference_sigv.html)らしい。

使う技術はその名の通り「署名」です。TLSは機密の秘匿化(外から読めない)、完全性保証(改竄検知)、認証(証明書によるサーバーの身元確認)などを行いますが、Presigned URLの場合はこのうちの完全性の保証をベースに、いつ誰が許可したのかの情報が後からわかるようにしています。

サービスにアクセスするのに使うURLに「誰が」というのを明らかにするキーIDと期限が付与されて、シークレットアクセスキーを使って署名されます。署名されているので期限や誰が、といった情報の改ざんは許しません。

<img src="/images/2026/20260403a/screenshot_presigned_url.png" alt="スクリーンショット 2026-03-31 18.26.14.png" width="1200" height="523" loading="lazy">

クライアントはそのURLを使ってS3からファイルをダウンロードしたり、ファイルをアップロードします。S3(ここではrustfs)はその署名をみて、改竄されていないことの確認とともに、誰が署名したのかを確認します。ブラウザ自身はクレデンシャルを持っていなくても、その署名をもとにして認可制御が行われ、読み書きが成功するという流れです。

`Endpoint`を書き換えたクライアントを一時的に作るという方針でも、実際にそのクライアントでS3にリクエストを投げることはなくてURLの発行にしか使わないので問題なく利用できるんですね。てっきり、一時的に利用可能なトークン的なURLとして発行されてサーバー側に情報を持っているのかと思いましたが、そんなことはないんですね。勉強になりました。

# まとめ

S3以外もいろいろ必要となる場合は他のAWSエミュレータ（[moto](https://github.com/getmoto/moto)とか[floci](https://github.com/hectorvent/floci)とか)の方が良いかもしれませんが、今回はS3だけが欲しかったのでrustfsを選んでみて使ってみたメモでした。

今まではminioを考えずに使っていましたが、今回別のものを検討してrustfsを使ってみました。seaweedfsとかも良さそうでしたが、filterとかたくさんコンテナが必要そうだったので1つで済むrustfsにしました。コンテナのメモリ消費90MBぐらいですね。動きも軽快なので今後も使ってみようと思いました。
