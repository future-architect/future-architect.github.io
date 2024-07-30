---
title: "AWS SDK for Go でエンドポイントの向き先を httptest.NewServer() にしてテスト"
date: 2024/07/09 00:00:00
postid: a
tag:
  - AWS
  - モック
  - テスト
  - LocalStack
category:
  - Programming
thumbnail: /images/20240709a/thumbnail.png
author: 真野隼記
lede: "AWS SDK for Go を使ったコードをクラウドサービスに依存無しでローカルにてテストするとき、次のような手法が考えられます。"
---
## はじめに

TIG真野です。

AWS SDK for Go を使ったコードをクラウドサービスに依存無しでローカルにてテストするとき、次のような手法が考えられます。

1. 外部アクセス部分をインターフェースにしてテスト時はモックコードに差し替え
    - よく見る手法だが、テスト目的のみでインターフェースを作る手間がある
1. SDKのmiddlewareを使用
    - 詳細は[AWS SDK for Go V2でinterfaceのモック"無し"でテスト - 365歩のテック](https://go-to-k.hatenablog.com/entry/aws-sdk-go-v2-middleware-test)を参考ください
    - インターフェースの作成を抑えられるメリットがある
1. LocalStackなどのモックサービスを利用
    - 別プロセス（いわゆる、テストサイズはMedium）になるため。実行時間は1,2より増える。実環境に近い環境でテストできるため品質を上げやすい利点がある
1. httptest.NewServer() でモックする

フューチャーで実績が多いのはLocalStackですが、例えばECS (Elastic Container Service)は2024年7月時点でProイメージでしか利用できません。

<img src="/images/20240709a/image.png" alt="image.png" width="1200" height="468" loading="lazy">

https://docs.localstack.cloud/references/coverage/coverage_ecs/

知らない方のために補足ですが、LocalStackには以下2種類のイメージが存在します。

- LocalStack Community イメージ
- LocalStack Pro イメージ

Proイメージを利用するためには認証トークンが必要で、そのためには[有料プランの契約](https://www.localstack.cloud/pricing)が必要です。その価値があるサービスであることは間違いないですが（ローカルでAWSのミニクラウドが動かせるって本当に凄い！）、基本的にはCommunityイメージに含まれるS3やSQS程度しか利用せず、少しだけ含まれないサービスを利用したいといった、悩ましいケースもあると思います。

先程の例であげたS3やSQSに加え、ECSにアクセスしたい場合は、Communityイメージの利用を継続しつつ、最初に上げた1または2で対応することが多いと思いますが、この記事では4つ目の手法を説明します。

## httptest.NewServer() でモックする

例としてテスト対象であるユースケースやコントローラ層のコードから次のような、`ecs RunTask` を含むRunTask()関数が呼んでいるとします。

```go
type ECSClient struct {
	ecs *ecs.Client
}

func (c ECSClient) RunTask(ctx context.Context, taskDefName string) error {
	resp, err := c.ecs.DescribeTaskDefinition(ctx, &ecs.DescribeTaskDefinitionInput{
		TaskDefinition: &taskDefName,
	})
	if err != nil {
		return fmt.Errorf("ecs describe task definition: %w", err)
	}

	_, err = c.ecs.RunTask(ctx, &ecs.RunTaskInput{
		TaskDefinition:       resp.TaskDefinition.TaskDefinitionArn,
		LaunchType:           types.LaunchTypeEc2,
		Cluster:              aws.String("my-cluster"),
	})
	if err != nil {
		return fmt.Errorf("ecs run task: %w", err)
    }
	return nil
}
```

テストコードは、 `http.NewServer()` を利用した次のようなコードを利用します。コードの説明は後述します。

```go
import (
    // ... 省略 ...
	"embed"
)

//go:embed testdata/*
var testdata embed.FS

func TestBatchTaskCallHandle(t *testing.T) {
	tests := []struct {
		name                            string
		inputDescribeTaskDefinitionFile string
		inputRunTaskFile                string
		wantBody                        string
		wantStatus                      int
	}{
		{
			name:                            "起動に成功",
			inputDescribeTaskDefinitionFile: "testdata/input_describe_task_definition_1.json",
			inputRunTaskFile:                "testdata/input_run_task_1.json",
			wantBody:                        "testdata/want_1.json",
			wantStatus:                      200,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ecsMockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				amzTarget := r.Header.Get("X-Amz-Target")
				var respPath string
				switch amzTarget {
				case "AmazonEC2ContainerServiceV20141113.DescribeTaskDefinition":
					respPath = tt.inputDescribeTaskDefinitionFile
				case "AmazonEC2ContainerServiceV20141113.RunTask":
					respPath = tt.inputRunTaskFile
				}
				open, err := testdata.Open(respPath)
				if err != nil {
					t.Fatal(err)
				}
				if _, err = io.Copy(w, open); err != nil {
					t.Fatal(err)
				}
			}))
			t.Cleanup(ecsMockServer.Close)

			awscfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion("ap-northeast-1"),
				config.WithEndpointResolverWithOptions(aws.EndpointResolverWithOptionsFunc(
					func(_, _ string, _ ...any) (aws.Endpoint, error) {
						return aws.Endpoint{URL: ecsMockServer.URL}, nil
					}),
				),
			)
			if err != nil {
				t.Fatal(err)
			}
			ecsClient := ecs.NewFromConfig(awscfg)

			// ... 省略 ...
		}
	}
}
```

まず目に付くのは、`httptest.NewServer()` 内部のSwitch文でしょう。テスト対象のコードはECSの `DescribeTaskDefintion` と `RunTask` が呼ばれるため、振り分けのために`X-Amz-Target` ヘッダで分岐をしています。（あまり知られていない気がしますが）AWSのエンドポイントはURLではなく、この独自ヘッダでRPC先を振り分ける仕様となっているためです。

`AmazonEC2ContainerServiceV20141113.DescribeTaskDefinition` や `AmazonEC2ContainerServiceV20141113.RunTask` の値はどうやって調べるんだという話ですが、デバック実行やパケットキャプチャの必要はなく、公式ドキュメントに記載しているので調べるだけです。

APIリファレンスのSample Requestにサンプルのリクエストが記載されているため、その値を設定します。

<img src="/images/20240709a/image_2.png" alt="image.png" width="1200" height="497" loading="lazy">

- https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_RunTask.html#API_RunTask_Examples
- https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeTaskDefinition.html#API_DescribeTaskDefinition_Examples

振り分けられた先には、モックしたい応答結果として外部ファイルを指定します。このファイルの中身ですが、同様にAPIリファレンスの「Sample Response」を参考にします。

<img src="/images/20240709a/image_3.png" alt="image.png" width="1200" height="700" loading="lazy">

アプリケーションで利用しない項目はそのままで大丈夫です（もちろん、テスト上はなるべく本番に近しい値に書き換えた方が好ましいでしょう）。

最後は以下のブロックです。

```go
	awscfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion("ap-northeast-1"),
		config.WithEndpointResolverWithOptions(aws.EndpointResolverWithOptionsFunc(
			func(_, _ string, _ ...any) (aws.Endpoint, error) {
				return aws.Endpoint{URL: ecsMockServer.URL}, nil
			}),
		),
	)
```

SDKの向き先をhttp.TestServer()で起動したgoroutineに変更する必要があります。AWS SDK for Go V2では次のように `config.WithEndpointResolverWithOptions()` で指定し、先ほど起動した `ecsMockServer` の `URL`フィールドを指定します。

この作成した `awscfg` を検証対象のコードに設定すると、 `http.TestServer()` で実装したAWSのモック応答を返してくれるようになります。

## メリット

一覧でまとめました。1と比較するとインターフェースを追加すると言ったアプリコードの変更が不要。2との違いはMiddlewareの使い方に依存しなくても済む。3との違いは、LocalStack Communityイメージが対応していないサービスでも凌ぐことができる、といったことがあるかと思います。

| No | Name                                      | テストサイズ | インターフェース | エンドポイント | Memo                                                                                           |
|----|-------------------------------------------|--------------|----------------| --------------| ------------------------------------------------------------------|
| 1  | SDKのインターフェース部分をモック化       | Small        | 必要 | - | SDK自体の利用間違いは検知できない。アプリコードの変更が必要                                                   |
| 2  | SDKが提供するMiddlewareを利用してモック化 | Small        | - | - | Middlewareの利用方法を学ぶ必要                                                                 |
| 3  | LocalStackを利用                          | Medium       | - | 向き先を変更 | 品質は上げやすいが、テスト実行速度は遅くなる。対象によっては有料プラン加入が必要 |
| 4  | httptest.NewServer()を利用してモック化    | Medim        | - |  向き先を変更 | クライアント側のコードに手を入れなくても良いが、サーバ側のレスポンスは決め打ちで作る必要がある |

## まとめ

AWS SDK for Go を用いたアプリコードで、特にLocalStack Community版のイメージに含まれていないサービスを利用する時に、`httptest.NewServer()` でgoroutineを起動させて、固定値をモックして応答する実装例をまとめました。

"X-Amz-Target" ヘッダの値でエンドポイントを切り替える方法、APIリファレンスからモックのJSONを返す手順などをまとめました。

この記事を読んで、自動テストのためだけにインターフェースを切ることになり、必要性は理解できるけど少しモヤモヤするなぁという方に別の選択肢を提示できたら嬉しく思います。
