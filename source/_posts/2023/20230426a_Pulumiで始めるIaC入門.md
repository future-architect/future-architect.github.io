---
title: "Pulumiで始めるIaC入門"
date: 2023/04/26 00:00:00
postid: a
tag:
  - IaC
  - 入門
category:
  - DevOps
thumbnail: /images/2023/20230426a/thumbnail.png
author: 渡邉光
lede: "春の入門ということで、改めてIaCのメリット・デメリットについて整理してみました。また、PulumiというIaCツールに入門してみたので、皆さんと一緒にPulumiについて理解していきたいと思います。"
---
# はじめに

Technology Inovation Group(TIG)所属の筋肉エンジニアの渡邉です。

[春の入門連載2023](/articles/20230417a/) 8日目を担当します。

普段はクラウドインフラを中心に業務を行なっていますが、インフラリソースを管理するにあたってはIaC（主にTerraform）を使用しています。春の入門ということで、改めてIaCのメリット・デメリットについて整理してみました。また、PulumiというIaCツールに入門してみたので、皆さんと一緒にPulumiについて理解していきたいと思います。

# IaC(Infrastructure as Code)とは

IaC (Infrastructure as Code)とは、ネットワーク、サーバ、データベースなどのインフラリソースをコードによって管理しプロビジョニングできることを言います。
クラウドを利用している場合、マネジメントコンソールからボタンポチポチでリソースを作成・更新・削除できます。手動で操作する場合、手順書を用意し手順書に沿ってマネジメントコンソールを操作すると思いますが、手順書を確認していてもオペミスによって意図せずリソースを更新・削除してしまう可能性やマネジメントコンソールは定期的にアップデートされるため、手順書が古くなってしまい意味を成さなくなってくる時もあると思います。

IaCを利用する場合、インフラリソースのあるべき姿をコードで定義・管理するためインフラリソースの変更前にレビューを挟むことができるので、意図せずリソースを作成・更新・削除してしまう可能性を少なくできます。

IaCで有名なツールとしては以下があります。

- Ansible（主にサーバ内のミドルウェアなどを管理する構成管理ツール）
- Terraform（各クラウドのリソースを管理する構成管理ツール）
- CloudFormation（AWSのリソースを管理する構成管理ツール）

# IaCのメリット

## 既存コードの使い回し・各環境への迅速なプロビジョニング

インフラリソースの構成をコードで管理できるため、一度コードを作成してしまえば同じインフラ構成を作成したい場合、既存のコードを使いまわして構築できます。また、terraformであればworkspaceという機能を利用することで開発環境・検証環境・本番環境と各環境を同じコードで作成できます。例えば、咄嗟に性能環境が欲しいとなった場合でも迅速に環境を用意できます。

## オペレーションミスの防止

IaCではコードに基づいてプログラムがインフラリソースの作成・更新・削除を行うため、手作業に比べるとオペレーションミスを減らせることができます。主に同じ作業を複数回行う場合であったり、各環境に対して同じ作業を行う場合などは手作業だとミスが起こりやすいので、IaCを用いる場合はミスを減らせると思います。

また、コードで管理されているためコードの実行前にレビューを挟むことができるため、品質を担保した状態を保つことができます。

## DevOpsツールとの相性がよい

コード管理されていることによって、Githubなどのリポジトリサービスでバージョン管理できます。CI/CDとも相性が良いので、CI機能を利用してインフラリソースの命名規則をチェックしたり、linterを使用して整形したりなど、たくさんのDevOpsツールを利用して開発・運用効率を上げることが可能になります。

# IaCのデメリット

## IaCツールごとの言語/ルールが異なるためキャッチアップが必要

IaCツールはTerraformやAnsibleなどがありますが、TerraformはHCL(HashiCorp Configuration Language)という独自言語でインフラリソースの状態をコード化する宣言型のツールとなり、Ansibleはplaybookと呼ばれるファイルにYAMLで構成手順を記述する手続き型ツールになります。各ツールごとのルールや記載方法などをキャッチアップする学習コストがかかります。

## コードと実態で差分が発生するリスク

IaCのコードによって管理されているインフラリソースに対して、例えば、手作業で変更を加えてしまった場合はコードとの差分が発生します。この差分によって、コードを使用してインフラリソースを更新しようとした際に、エラーが発生し、インフラが更新できなくなる可能性があったり、どちらが正しい構成なのかわからなくなってしまったりします。
簡単なインフラリソースの変更であれば、コードから変更するよりもコンソール画面から行ったほうが速い場合があるので、そういう場合にこの事象は発生しやすいと思います。

# Pulumiとは

[Pulumi](https://www.pulumi.com/)とは、OSSのIaCツールの1つであり、Terraformは独自のHCL言語でコードを記述しなければなりませんが、Pulumiの場合、アプリケーション開発者がよく使用する言語(Go/Java/Python/Typescript/C#/Yaml)などでコードを記述できるため、普段アプリケーションコード書いているエンジニアでも学習コストが低く、使い慣れた言語でインフラリソースをループ処理で作成したりできます。AWS/GCP/Azureなど各クラウドプロバイダーやKubernetesやServerlessにも幅広く対応しています。また、[TerraformやCloudFormationからPulumiに変換する](https://www.pulumi.com/tf2pulumi/)ことも可能なため、Pulumiに移行することも可能です。

Pulumiは無料で利用できますが、複数人での利用や、企業単位、ミッションクリティカルなシステムを扱う方向けに有償プランもあり、追加機能や充実したサポートを利用できます。

詳しくは[公式ドキュメント](https://www.pulumi.com/pricing/)を参照ください。

<img src="/images/2023/20230426a/image.png" alt="" width="1200" height="779" loading="lazy">

Pulumiは以下の構成をとります。詳しくは[公式ドキュメント](https://www.pulumi.com/docs/intro/concepts/)を参照ください。
<img src="/images/2023/20230426a/image_2.png" alt="" width="617" height="440" loading="lazy">

- Project：Programや他ファイルを含むディレクトリ
- Program：インフラリソースのあるべき姿を定義したもの
- Resource：インフラリソースを構成するオブジェクト。オブジェクトのプロパティ（設定値）に関しては、Inputs/OutPutsによりの別のオブジェクトで利用することが可能
- Stack：Programをデプロイした後のインスタンス。同一のProgramから開発環境/検証環境など、用途に応じて複数の環境用にインスタンスを作成が可能

とにかく、触ってみないと理解できないので、さっそくさわってみたいとおもいます

# Pulumiを使用してGoogle Cloudのリソースを作ってみる

[公式チュートリアル](https://www.pulumi.com/docs/get-started/gcp/)に沿って進めていきたいと思います。

## Pulumiのインストール

Pulumiを利用するため、ローカルのWSL2にPulumiをインストールします。

```bash
$ curl -fsSL https://get.pulumi.com | sh
$ pulumi version
v3.64.0
```

## 言語ランタイムのインストール

Pulumiでは、Goを利用しようと思うのでGoをインストールします。
こちらは[公式ドキュメント](https://go.dev/dl/)を参照ください

```sh
$ go version
go version go1.20.2 linux/amd64
```

## GCP初期設定

ローカルにGoogle Cloud SDKはインストールされている前提で進めます。
PulumiはGoogle Cloud リソースとやり取りするためにデフォルトのアプリケーション資格情報を必要とするため、`gcloud auth application-default login`コマンドを実行して資格情報を取得します。

```bash
$ gcloud auth application-default login
Go to the following link in your browser:

    https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=xxxxxxxxx&redirect_uri=xxxxxxxxxxxxx

Enter authorization code:
```

表示されたURLをブラウザに入力すると、「Googleログイン画面」に遷移します。

<img src="/images/2023/20230426a/image_3.png" alt="" width="449" height="503" loading="lazy">

「許可」をクリックします。
<img src="/images/2023/20230426a/image_4.png" alt="" width="453" height="833" loading="lazy">

表示された認証コードをコピーします。
<img src="/images/2023/20230426a/image_5.png" alt="" width="360" height="558" loading="lazy">

コピーした認証情報を入力し、「Enter」を押します。

```bash
Enter authorization code: xxxxxxxxxxxx

Credentials saved to file: [/home/xxxxxxxxx/.config/gcloud/application_default_credentials.json]

These credentials will be used by any library that requests Application Default Credentials (ADC).
```

環境変数を介して GCPのデフォルトプロジェクトを設定します。

```bash
export GOOGLE_PROJECT=xxxxxxxx
```

## Pulumiプロジェクトの作成

Pulumiを利用するためPulumiプロジェクトを作成します。

```bash
$ mkdir pulumi && cd pulumi

$ pulumi new gcp-go
Manage your Pulumi stacks by logging in.
Run `pulumi login --help` for alternative login options.
Enter your access token from https://app.pulumi.com/account/tokens
    or hit <ENTER> to log in using your browser                   :
```

アクセストークンの入力を求められました。
`https://app.pulumi.com/account/tokens`にアクセスしてPulumi Cloudの初期設定を行います。

上記のURLへアクセスするとPulumiのSign In画面へ遷移します。
まだ、アカウントを作成していないので`Create an accout`をクリックします。
<img src="/images/2023/20230426a/image_6.png" alt="" width="1200" height="888" loading="lazy">

アカウントを作成するため、今回はE-Mailを利用してアカウントを作成しようと思います。

- Username
- Email
- Password

を入力し`Create Account`をクリックします。

<img src="/images/2023/20230426a/image_7.png" alt="" width="1200" height="895" loading="lazy">

`Personal access tokens`の作成を求められるので、`Create Token`をクリックします。
<img src="/images/2023/20230426a/image_8.png" alt="" width="1191" height="382" loading="lazy">

`description`に任意の値を入力します。
<img src="/images/2023/20230426a/image_9.png" alt="" width="241" height="252" loading="lazy">

アクセストークンが生成されるので、メモしておきます。
<img src="/images/2023/20230426a/image_10.png" alt="" width="1200" height="481" loading="lazy">

先ほどのCLI画面に戻り、生成したアクセストークンを入力します。
するとWelcome to Pulumi!と表示されます。

```bash
$ pulumi new gcp-go
Manage your Pulumi stacks by logging in.
Run `pulumi login --help` for alternative login options.
Enter your access token from https://app.pulumi.com/account/tokens
    or hit <ENTER> to log in using your browser                   : xxxxxxxxxx


  Welcome to Pulumi!

  Pulumi helps you create, deploy, and manage infrastructure on any cloud using
  your favorite language. You can get started today with Pulumi at:

      https://www.pulumi.com/docs/get-started/

  Tip: Resources you create with Pulumi are given unique names (a randomly
  generated suffix) by default. To learn more about auto-naming or customizing resource
  names see https://www.pulumi.com/docs/intro/concepts/resources/#autonaming.


This command will walk you through creating a new Pulumi project.

Enter a value or leave blank to accept the (default), and press <ENTER>.
Press ^C at any time to quit.
```

Pulumiのプロジェクト名とプロジェクトの説明を求められるので、任意の値を入力していきます。

```bash
project name: (pulum) gcp-test
project description: (A minimal Google Cloud Go Pulumi program) gcp-test
Created project 'gcp-test'
```

次に、スタック名を尋ねられます。`dev`と入力します。

```bash
Please enter your desired stack name.
To create a stack in an organization, use the format <org-name>/<stack-name> (e.g. `acmecorp/dev`).
stack name: (dev) dev
Created stack 'dev'
```

最後に、Google Cloud プロジェクトの場合、Google Cloud プロジェクトを選択するよう求められます。Google Cloud プロジェクト ID を入力します。

```bash
gcp:project: The Google Cloud project to deploy into: xxxxxxxx
Saved config
```

上記の設定が完了すると、作業ディレクトリに以下のファイルが生成されます。

```bash
$ tree
.
├── Pulumi.dev.yaml # 初期化したスタックの構成値が記載されています。
├── Pulumi.yaml # Pulumiプロジェクトの情報が記載されています。
├── go.mod
├── go.sum
└── main.go # スタッリソースを定義する Pulumi のプログラムです。
```

main.goの見ていきましょう。
このPulumiのプログラムは

- USリージョンにGCSバケットを作成
- GCSバケット名をExportする

内容になっています。

```go main.go
package main

import (
	"github.com/pulumi/pulumi-gcp/sdk/v6/go/gcp/storage"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a GCP resource (Storage Bucket)
		bucket, err := storage.NewBucket(ctx, "my-bucket", &storage.BucketArgs{
			Location: pulumi.String("US"),
		})
		if err != nil {
			return err
		}

		// Export the DNS name of the bucket
		ctx.Export("bucketName", bucket.Url)
		return nil
	})
}
```

## リソースの作成

上記の内容でPulumiを実行してGoogle Cloudのリソースを作成します。

```bash
pulumi up
```

上記のコマンドを実行すると、Goのプログラムを評価し、実行するリソースの更新を決定します。変更の概要を示すプレビューが表示されます。

```bash
Previewing update (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxx/gcp-test/dev/previews/xxxxxxxxxxxxxx

Downloading plugin: 47.96 MiB / 47.96 MiB [=========================] 100.00% 2s
                                                                                [resource plugin gcp-6.52.0] installing
     Type                   Name          Plan
 +   pulumi:pulumi:Stack    gcp-test-dev  create
 +   └─ gcp:storage:Bucket  my-bucket     create


Outputs:
    bucketName: output<string>

Resources:
    + 2 to create

Do you want to perform this update?  [Use arrows to move, type to filter]
  yes
> no
  details
```

`details`を選択すると、変更内容の詳細な差分が表示されます。

```bash
Do you want to perform this update? details
+ pulumi:pulumi:Stack: (create)
    [urn=urn:pulumi:dev::gcp-test::pulumi:pulumi:Stack::gcp-test-dev]
    + gcp:storage/bucket:Bucket: (create)
        [urn=urn:pulumi:dev::gcp-test::gcp:storage/bucket:Bucket::my-bucket]
        forceDestroy: false
        location    : "US"
        name        : "my-bucket-f077c87"
        storageClass: "STANDARD"
    --outputs:--
    bucketName: output<string>
```

`yes`を選択するとGoogle Cloud に新しいストレージ バケットが作成されます。

```bash
Do you want to perform this update? yes
Updating (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxx/gcp-test/dev/updates/1

     Type                   Name          Status
 +   pulumi:pulumi:Stack    gcp-test-dev  created (3s)
 +   └─ gcp:storage:Bucket  my-bucket     created (1s)


Outputs:
    bucketName: "gs://my-bucket-0cae339"

Resources:
    + 2 created

Duration: 5s
```

Google Cloudのコンソール画面からCloud Storageを確認すると、バケットが作成されていることが確認できました。
<img src="/images/2023/20230426a/image_11.png" alt="" width="1200" height="631" loading="lazy">

スタックのアウトプットを確認したい場合は、以下のコマンドを実行すると確認できます。

```bash
$ pulumi stack output bucketName
gs://my-bucket-0cae339
```

また、自身のPulumi Cloudのアカウントを確認しに行くと以下のように、Web上でもリソースの状態を確認できます。

<img src="/images/2023/20230426a/image_12.png" alt="" width="1200" height="670" loading="lazy">

# リソースの変更

GCSバケットを作成できたので、バケットにオブジェクトを追加してみます。
作業ディレクトリに`index.html`を追加します。

```html
<html>
    <body>
        <h1>Hello, Pulumi!</h1>
    </body>
</html>
```

main.goにオブジェクトを追加するコード`コメントアウト部分：Add index.html Object`を追加します。

```go main.go
package main

import (
	"github.com/pulumi/pulumi-gcp/sdk/v6/go/gcp/storage"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a GCP resource (Storage Bucket)
		bucket, err := storage.NewBucket(ctx, "my-bucket", &storage.BucketArgs{
			Location: pulumi.String("US"),
		})
		if err != nil {
			return err
		}

		// Add index.html Object
		bucketObject, err := storage.NewBucketObject(ctx, "index.html", &storage.BucketObjectArgs{
			Bucket: bucket.Name,
			Source: pulumi.NewFileAsset("index.html"),
		})
		if err != nil {
			return err
		}

		// Export the DNS name of the bucket
		ctx.Export("bucketName", bucket.Url)
		ctx.Export("ObjectName", bucketObject.Name)
		return nil
	})
}
```

main.goの修正が完了したので、変更分をデプロイしていきましょう。
再度`pulumi up`を実行します。

```bash
$ pulumi up
Previewing update (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxx/gcp-test/dev/previews/xxxxxxxxxxxxxxxx

     Type                         Name          Plan
     pulumi:pulumi:Stack          gcp-test-dev
 +   └─ gcp:storage:BucketObject  index.html    create


Outputs:
  + ObjectName: "index.html-6b14a12"

Resources:
    + 1 to create
    2 unchanged

Do you want to perform this update?  [Use arrows to move, type to filter]
> yes
  no
  details
```

`yes`を入力します。

```bash
Do you want to perform this update? yes
Updating (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxx/gcp-test/dev/updates/2

     Type                         Name          Status
     pulumi:pulumi:Stack          gcp-test-dev
 +   └─ gcp:storage:BucketObject  index.html    created (0.74s)


Outputs:
  + ObjectName: "index.html-5c30f0c"
    bucketName: "gs://my-bucket-0cae339"

Resources:
    + 1 created
    2 unchanged

Duration: 3s
```

更新作業が完了したので、`gsutilコマンド`でオブジェクトのアップロードを確認します。

```bash
$ gsutil ls $(pulumi stack output bucketName)
gs://my-bucket-0cae339/index.html-5c30f0c
```

オブジェクトがアップロードできていることが確認できました。

`index.html` がバケットにあるので、main.goを変更して、バケットが `index.html` を静的 Web サイトとして機能するように設定します。

変更内容は以下になります。

- websiteバケットにプロパティを設定します。
- Google Cloud Storage の推奨事項に合わせて、バケットに対する均一なバケットレベルのアクセスをtrueに設定します。
- バケットのコンテンツをインターネット経由でアクセスできるようにします。
- オブジェクトのコンテンツタイプ`text/html`に変更して、HTMLとして提供されるようにします。
- バケットのエンドポイントURLをエクスポートします。

`コメントアウト：//Settings for publishing content to the Internet`が修正部分になります。

```go main.go
package main

import (
	"github.com/pulumi/pulumi-gcp/sdk/v6/go/gcp/storage"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a GCP resource (Storage Bucket)
		bucket, err := storage.NewBucket(ctx, "my-bucket", &storage.BucketArgs{
			Location: pulumi.String("US"),
			// Settings for publishing content to the Internet
			Website: storage.BucketWebsiteArgs{
				MainPageSuffix: pulumi.String("index.html"),
			},
			UniformBucketLevelAccess: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		// Add index.html Object
		bucketObject, err := storage.NewBucketObject(ctx, "index.html", &storage.BucketObjectArgs{
			Bucket: bucket.Name,
			ContentType: pulumi.String("text/html"), // Settings for publishing content to the Internet
			Source: pulumi.NewFileAsset("index.html"),
		})
		if err != nil {
			return err
		}

		// Settings for publishing content to the Internet
		_, err = storage.NewBucketIAMBinding(ctx, "my-bucket-IAMBinding", &storage.BucketIAMBindingArgs{
			Bucket: bucket.Name,
			Role:   pulumi.String("roles/storage.objectViewer"),
			Members: pulumi.StringArray{
				pulumi.String("allUsers"),
			},
		})
		if err != nil {
			return err
		}

		// Export the DNS name of the bucket
		ctx.Export("bucketName", bucket.Url)
		ctx.Export("ObjectName", bucketObject.Name)

		// Settings for publishing content to the Internet
		bucketEndpoint := pulumi.Sprintf("http://storage.googleapis.com/%s/%s", bucket.Name, bucketObject.Name)
		ctx.Export("bucketEndpoint", bucketEndpoint)

		return nil
	})
}
```

main.goの設定が完了しましたので、`pulumi up`を実行し`yes`を選択しデプロイします。

```bash
$ pulumi up
Previewing update (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxx/gcp-test/dev/previews/xxxxxxxxxxxxxx

     Type                             Name                  Plan        Info
     pulumi:pulumi:Stack              gcp-test-dev
 ~   ├─ gcp:storage:Bucket            my-bucket             update      [diff: +website~uniformBucketLevelAccess]
 +   ├─ gcp:storage:BucketIAMBinding  my-bucket-IAMBinding  create
 +-  └─ gcp:storage:BucketObject      index.html            replace     [diff: ~contentType]


Outputs:
  ~ ObjectName    : "index.html-5c30f0c" => "index.html-0bac7da"
  + bucketEndpoint: "http://storage.googleapis.com/my-bucket-0cae339/index.html-0bac7da"

Resources:
    + 1 to create
    ~ 1 to update
    +-1 to replace
    3 changes. 1 unchanged

Do you want to perform this update?  [Use arrows to move, type to filter]
> yes
  no
  details
```

デプロイが完了しましたので、`curlコマンド`を実行し、バケットエンドポイントへアクセスします。

```bash
$ curl $(pulumi stack output bucketEndpoint)
<html>
    <body>
        <h1>Hello, Pulumi!</h1>
    </body>
</html>
```

オブジェクトを取得できました。
Chromeでアクセスするとブラウザ上でindex.htmlの内容が表示されることも確認できました。

<img src="/images/2023/20230426a/image_13.png" alt="" width="296" height="57" loading="lazy">

## リソースの削除

それでは作成したリソースたちを削除していきます。
リソースの一括削除もできることもIaCのいいところですね（本番環境では注意です）。

`pulumi destroy`を実行します。
リソースを本当に削除するかどうかを確認するプロンプトが表示されます。問題なければ`yes`を選択し、リソースが削除されるまで待機します。

```bash
$ pulumi destroy
Previewing destroy (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxxx/gcp-test/dev/previews/xxxxxxxxxxx

     Type                             Name                  Plan
 -   pulumi:pulumi:Stack              gcp-test-dev          delete
 -   ├─ gcp:storage:BucketIAMBinding  my-bucket-IAMBinding  delete
 -   ├─ gcp:storage:BucketObject      index.html            delete
 -   └─ gcp:storage:Bucket            my-bucket             delete


Outputs:
  - ObjectName    : "index.html-debb576"
  - bucketEndpoint: "http://storage.googleapis.com/my-bucket-0cae339/index.html-debb576"
  - bucketName    : "gs://my-bucket-0cae339"

Resources:
    - 4 to delete

Do you want to perform this destroy?  [Use arrows to move, type to filter]
> yes
  no
  details
```

なぜか、バケットが削除されなくてエラーになりました。

pulumi上からオブジェクトは削除されていましたが、Google Cloudのコンソール画面を見るとオブジェクトが削除されていませんでした。。。

```bash
Do you want to perform this destroy? yes
Destroying (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxx/gcp-test/dev/updates/5

     Type                             Name                  Status                  Info
     pulumi:pulumi:Stack              gcp-test-dev          **failed**              1 error
 -   ├─ gcp:storage:BucketIAMBinding  my-bucket-IAMBinding  deleted (6s)
 -   ├─ gcp:storage:BucketObject      index.html            deleted (0.90s)
 -   └─ gcp:storage:Bucket            my-bucket             **deleting failed**     1 error


Diagnostics:
  pulumi:pulumi:Stack (gcp-test-dev):
    error: update failed

  gcp:storage:Bucket (my-bucket):
    error: deleting urn:pulumi:dev::gcp-test::gcp:storage/bucket:Bucket::my-bucket: 1 error occurred:
        * Error trying to delete bucket my-bucket-0cae339 containing objects without `force_destroy` set to true

Resources:
    - 2 deleted

Duration: 8s
```

Google Cloudのコンソール画面から手動でオブジェクトを削除し、再度`pulumi destroy`を実行します。

```bash
$ pulumi destroy
Previewing destroy (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxxx/gcp-test/dev/previews/xxxxxxxxxxxxxxxx

     Type                   Name          Plan
 -   pulumi:pulumi:Stack    gcp-test-dev  delete
 -   └─ gcp:storage:Bucket  my-bucket     delete


Outputs:
  - ObjectName    : "index.html-debb576"
  - bucketEndpoint: "http://storage.googleapis.com/my-bucket-0cae339/index.html-debb576"
  - bucketName    : "gs://my-bucket-0cae339"

Resources:
    - 2 to delete

Do you want to perform this destroy? yes
Destroying (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxxxxxx/gcp-test/dev/updates/9

     Type                   Name          Status
 -   pulumi:pulumi:Stack    gcp-test-dev  deleted
 -   └─ gcp:storage:Bucket  my-bucket     deleted (1s)


Outputs:
  - ObjectName    : "index.html-debb576"
  - bucketEndpoint: "http://storage.googleapis.com/my-bucket-0cae339/index.html-debb576"
  - bucketName    : "gs://my-bucket-0cae339"

Resources:
    - 2 deleted

Duration: 3s

The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained.
If you want to remove the stack completely, run `pulumi stack rm dev`.
```

無事削除されました。

<img src="/images/2023/20230426a/image_14.png" alt="" width="1200" height="624" loading="lazy">

スタック自体を削除するには、`pulumi stack rm`を実行します。このコマンドによりすべての更新履歴とともに、Pulumi Cloud からスタックが完全に削除されます。

```bash
$ pulumi stack rm
This will permanently remove the 'dev' stack!
Please confirm that this is what you'd like to do by typing `dev`: dev
Stack 'dev' has been removed!
```

Pulumi Cloudを確認すると、dev stackが削除されていることが確認できました。
<img src="/images/2023/20230426a/image_15.png" alt="" width="1200" height="474" loading="lazy">

# [外伝] Pulumi AI

ちょうど一週間ほど前に、自然言語からIaC（インフラ構成コード）を自動生成する「Pulumi AI」を含む、AIを活用した新サービス群「Pulumi Insights」が発表されました。
タイムリーな内容なので、本記事でも試してみたいと思います

https://www.publickey1.jp/blog/23/pulumipulumi_aiawsazurecloudflarekubernetesdatadog130infra-as-code.html

https://www.pulumi.com/ai/

## 早速使ってみた。

Pulumi AIの入力に以下の情報を渡してみました。日本語にも対応しています。

```text
Create GCP Resource.
・VPC and The CIDR of the subnet is 192.168.0.0/24 and the region uses us-central1.
・Create a firewall that allows ssh with iap using the iap-ssh tag.
・Build a GCE using ubuntu 20.04 using the FIrewall you just created.
・Export of InstanceName
```

上記の入力を与えたときには下記のようにPulumi AIが入力内容をもとにPulumiのGoのコードを生成していきます（す、すごい）。。。

<img src="/images/2023/20230426a/ezgif.com-video-to-gif_(4).gif" alt="ezgif.com-video-to-gif_(4).gif" width="600" height="338" loading="lazy">

以下が、Pulumi AIによって生成されたコードになります。
きちんと作成するリソースごとにコメントアウトも入れてくれて助かります。

```go Pulumi AIによって自動生成されたコード
package main

import (
    "github.com/pulumi/pulumi-gcp/sdk/v5/go/gcp/compute"
    "github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
    pulumi.Run(func(ctx *pulumi.Context) error {
        // Create a GCP VPC network
        vpc, err := compute.NewNetwork(ctx, "my-vpc", nil)
        if err != nil {
            return err
        }

        // Create a GCP subnet in the us-central1 region
        subnet, err := compute.NewSubnetwork(ctx, "my-subnet", &compute.SubnetworkArgs{
            Network: vpc.ID(),
            Region:  pulumi.String("us-central1"),
            IpCidrRange: pulumi.String("192.168.0.0/24"),
        })
        if err != nil {
            return err
        }

        // Create firewall rule
        firewall, err := compute.NewFirewall(ctx, "allow-ssh-with-iap", &compute.FirewallArgs{
            Network: vpc.ID(),
            Allows: pulumi.StringArray{
                pulumi.String("tcp:22"),
            },
            SourceRanges: pulumi.StringArray{
                pulumi.String("35.235.240.0/20"),
            },
            TargetTags: pulumi.StringArray{
                pulumi.String("iap-ssh"),
            },
        })
        if err != nil {
            return err
        }

        // Create GCE instance
        instance, err := compute.NewInstance(ctx, "my-instance", &compute.InstanceArgs{
            MachineType: pulumi.String("e2-small"),
            BootDisk: &compute.InstanceBootDiskArgs{
                InitializeParams: &compute.InstanceBootDiskInitializeParamsArgs{
                    ImageFamily: pulumi.String("ubuntu-2004-lts"),
                    ImageProject: pulumi.String("ubuntu-os-cloud"),
                },
            },
            NetworkInterfaces: compute.InstanceNetworkInterfaceArray{
                &compute.InstanceNetworkInterfaceArgs{
                    Subnetwork: subnet.ID(),
                },
            },
            Tags: pulumi.StringArray{
                pulumi.String("iap-ssh"),
            },
        })
        if err != nil {
            return err
        }

        // Export InstanceName
        ctx.Export("InstanceName", instance.Name)

        return nil
    })
}
```

とりあえず、脳死コピーをして`pulumi up`を実行すると下記のようにエラーになりました。

```bash
$ pulumi up
Previewing update (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxxxx/gcp-test/dev/previews/xxxxxxxxxx

     Type                 Name          Plan     Info
     pulumi:pulumi:Stack  gcp-test-dev           1 error; 5 messages


Diagnostics:
  pulumi:pulumi:Stack (gcp-test-dev):
    # gcp-test
    ./main.go:27:9: firewall declared and not used
    ./main.go:29:21: cannot use pulumi.StringArray{…} (value of type pulumi.StringArray) as compute.FirewallAllowArrayInput value in struct literal: pulumi.StringArray does not implement compute.FirewallAllowArrayInput (missing method ToFirewallAllowArrayOutput)
    ./main.go:48:21: unknown field ImageFamily in struct literal of type compute.InstanceBootDiskInitializeParamsArgs
    ./main.go:49:21: unknown field ImageProject in struct literal of type compute.InstanceBootDiskInitializeParamsArgs

    error: error in compiling Go: unable to run `go build`: exit status 1
```

GCE/Firewallのgoの記載方法が誤っていそうなので[GCEについての公式ドキュメント](https://www.pulumi.com/registry/packages/gcp/api-docs/compute/instance/)と[Firewallについての公式ドキュメント](https://www.pulumi.com/registry/packages/gcp/api-docs/compute/firewall/)を確認し、エラーを修正します。

また、GCEを構築するゾーン指定が漏れていたので、48行目に追加します。

```go 修正後
package main

import (
    "github.com/pulumi/pulumi-gcp/sdk/v5/go/gcp/compute"
    "github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
    pulumi.Run(func(ctx *pulumi.Context) error {
        // Create a GCP VPC network
        vpc, err := compute.NewNetwork(ctx, "my-vpc", nil)
        if err != nil {
            return err
        }

        // Create a GCP subnet in the us-central1 region
        subnet, err := compute.NewSubnetwork(ctx, "my-subnet", &compute.SubnetworkArgs{
            Network: vpc.ID(),
            Region:  pulumi.String("us-central1"),
            IpCidrRange: pulumi.String("192.168.0.0/24"),
        })
        if err != nil {
            return err
        }

        // Create firewall rule
        _, err = compute.NewFirewall(ctx, "allow-ssh-with-iap", &compute.FirewallArgs{
            Network: vpc.ID(),
			Allows: compute.FirewallAllowArray{
				&compute.FirewallAllowArgs{
					Protocol: pulumi.String("tcp"),
				},
			},
            SourceRanges: pulumi.StringArray{
                pulumi.String("35.235.240.0/20"),
            },
            TargetTags: pulumi.StringArray{
                pulumi.String("iap-ssh"),
            },
        })
        if err != nil {
            return err
        }

        // Create GCE instance
        instance, err := compute.NewInstance(ctx, "my-instance", &compute.InstanceArgs{
            MachineType: pulumi.String("e2-small"),
			Zone:        pulumi.String("us-central1-a"),
            BootDisk: &compute.InstanceBootDiskArgs{
                InitializeParams: &compute.InstanceBootDiskInitializeParamsArgs{
                    Image: pulumi.String("ubuntu-2004-lts"),
                },
            },
            NetworkInterfaces: compute.InstanceNetworkInterfaceArray{
                &compute.InstanceNetworkInterfaceArgs{
                    Subnetwork: subnet.ID(),
                },
            },
            Tags: pulumi.StringArray{
                pulumi.String("iap-ssh"),
            },
        })
        if err != nil {
            return err
        }

        // Export InstanceName
        ctx.Export("InstanceName", instance.Name)

        return nil
    })
}
```

修正後、再度`pulumi up`コマンドを実行し、yesをクリックします。

```bash
$ pulumi up
Previewing update (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxxxxxxx/gcp-test/dev/previews/xxxxxxxxxxxxx

     Type                       Name                Plan
 +   pulumi:pulumi:Stack        gcp-test-dev        create
 +   ├─ gcp:compute:Network     my-vpc              create
 +   ├─ gcp:compute:Subnetwork  my-subnet           create
 +   ├─ gcp:compute:Firewall    allow-ssh-with-iap  create
 +   └─ gcp:compute:Instance    my-instance         create


Outputs:
    InstanceName: "my-instance-1e6164c"

Resources:
    + 5 to create

Do you want to perform this update?  [Use arrows to move, type to filter]
> yes
  no
  details
```

下記のように、成功しました。

```bash
Do you want to perform this update? yes
Updating (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/xxxxxxxxxxxxx/gcp-test/dev/updates/12

     Type                       Name                Status
 +   pulumi:pulumi:Stack        gcp-test-dev        created (76s)
 +   ├─ gcp:compute:Network     my-vpc              created (43s)
 +   ├─ gcp:compute:Subnetwork  my-subnet           created (14s)
 +   ├─ gcp:compute:Firewall    allow-ssh-with-iap  created (12s)
 +   └─ gcp:compute:Instance    my-instance         created (17s)


Outputs:
    InstanceName: "my-instance-a5cb493"

Resources:
    + 5 created

Duration: 1m19s
```

Google Cloudのマネジメントコンソールから「VMインスタンス」に作成されたVMインスタンスの「SSHボタン」をクリックします。

ブラウザがたちが上がり、しばらくすると無事にIAP経由でSSHできることを確認できました。

<img src="/images/2023/20230426a/image.jpg" alt="image.jpg" width="1200" height="841" loading="lazy">

# 最後に

今回は、PulumiでのIaC入門について記載しました。

IaCはインフラリソースをコードで管理できるため、インフラリソースの迅速なデプロイや、品質の担保、オペミスの削減など様々なメリットがありますが、運用上のつらみもあるので利用するにはコードを管理するディレクトリ設計や、コーディング規約などを設けて利用していきましょう。

Pulumiにも入門してみましたが、いかがだったでしょうか。普段Terraformを利用している筆者からすると、アプリケーションコード(Go)を使用してインフラリソースが構築できるのは新鮮でした。普段アプリケーションコードを書いているアプリエンジニアからするとだいぶインフラリソースを構築するハードルが下がったのではと思います。

また、外伝としてPulumi AIにも触れてみましたが、入力する内容が良くなかったのか一発で`Pulumi up`を成功させることができなかったです。しかし、コンソールで対話型で構築したいインフラリソースを入力することでコードが自動生成されたるのは画期的だと思いました。まだまだ精度の問題はあるかと思いますが、いつかコードを自身で0から書かなくなる日もすぐそこなのだろうなと危機感を持ちました。

春の入門祭り2023、次回は小澤泰河さんの[CDN 入門とエッジでのアプリケーション実行](/articles/20230427a/)です。
