---
title: "AWS SDK for Goのリトライアルゴリズムを差し替える方法"
date: 2021/02/18 00:00:00
postid: ""
tag:
  - Go
  - リトライ
  - AWS
  - アルゴリズム
category:
  - Programming
thumbnail: /images/20210218/thumbnail.png
author: 辻大志郎
lede: "本記事では[AWS SDK for Go]を使ってAWSのAPIをコールする場合のリトライアルゴリズムを差し替える方法を紹介します。"
---
# はじめに

本記事では[AWS SDK for Go](https://github.com/aws/aws-sdk-go)を使ってAWSのAPIをコールする場合のリトライアルゴリズムを差し替える方法を紹介します。

# `AWS SDK for Go` のリトライ

<img src="/images/20210218/awsgo.png" class="img-middle-size" loading="lazy">

`AWS SDK for Go` のバージョンは [`v1.37.6`](https://github.com/aws/aws-sdk-go/releases/tag/v1.37.6) です。

まず `AWS SDK for Go` を使ってAPIをコールする場合は、デフォルトでリトライするようになっています [^1]。そのため `AWS SDK for Go` を使うアプリケーション側でリトライを実装する必要はありません。`AWS SDK for Go` 上の実装は [`client.DefaultRetryer`](https://github.com/aws/aws-sdk-go/blob/v1.37.6/aws/client/default_retryer.go#L12-L36) がリトライを実施します。リトライ時の待ち時間である `time.Duration` を計算するアルゴリズムは `RetryRules` メソッドとして実装されています。

 [^1]: https://docs.aws.amazon.com/ja_jp/general/latest/gr/api-retries.html

待ち時間を計算するアルゴリズムはExponential Backoff And Jitter [^2]です。

 [^2]: https://aws.amazon.com/jp/blogs/architecture/exponential-backoff-and-jitter/

- リトライの再試行の待ち時間を計算する `RetryRules` メソッド

```go
// RetryRules returns the delay duration before retrying this request again
func (d DefaultRetryer) RetryRules(r *request.Request) time.Duration {


	// if number of max retries is zero, no retries will be performed.
	if d.NumMaxRetries == 0 {
		return 0
	}


	// Sets default value for retryer members
	d.setRetryerDefaults()


	// minDelay is the minimum retryer delay
	minDelay := d.MinRetryDelay


	var initialDelay time.Duration


	isThrottle := r.IsErrorThrottle()
	if isThrottle {
		if delay, ok := getRetryAfterDelay(r); ok {
			initialDelay = delay
		}
		minDelay = d.MinThrottleDelay
	}


	retryCount := r.RetryCount


	// maxDelay the maximum retryer delay
	maxDelay := d.MaxRetryDelay


	if isThrottle {
		maxDelay = d.MaxThrottleDelay
	}


	var delay time.Duration


	// Logic to cap the retry count based on the minDelay provided
	actualRetryCount := int(math.Log2(float64(minDelay))) + 1
	if actualRetryCount < 63-retryCount {
		delay = time.Duration(1<<uint64(retryCount)) * getJitterDelay(minDelay)
		if delay > maxDelay {
			delay = getJitterDelay(maxDelay / 2)
		}
	} else {
		delay = getJitterDelay(maxDelay / 2)
	}
	return delay + initialDelay
}
```

https://github.com/aws/aws-sdk-go/blob/d8a5a9febe5602f134648c18e9f83546284cda35/aws/client/default_retryer.go#L77-L123

### デフォルトの設定

デフォルトのリトライの設定は以下のようになっています。

|  No   | 項目               | 説明                                     | デフォルト値(単位) |
| :---: | ------------------ | ---------------------------------------- | ------------------ |
|   1   | `NumMaxRetries`    | 最大リトライ回数                         | 3 (回)             |
|   2   | `MinRetryDelay`    | リトライ時の最小の待ち時間               | 30 (ミリ秒)        |
|   3   | `MinThrottleDelay` | リトライスロットリング [^3]時の最小の待ち時間 | 300 (ミリ秒)       |
|   4   | `MaxRetryDelay`    | リトライ時の最大の待ち時間               | 300 (秒)           |
|   5   | `MaxThrottleDelay` | リトライスロットリング時の最大の待ち時間 | 300 (秒)           |

 [^3]: リトライスロットリングが何かという説明は[Introducing Retry Throttling](https://aws.amazon.com/jp/blogs/developer/introducing-retry-throttling/)や[スロットリングとの付き合い方](/articles/20200121/)を参照

# `RetryRules` を差し替える

基本的にはSDKが提供するデフォルトのリトライを実施することで問題ないでしょう。差し替えたくなるケースの一つは、リトライ回数を増やしてリトライエラーを発生させたくないケースです。(ただし、リトライ回数を増やすことでリトライエラーを速やかに解消できる場合に限ります。)リトライ回数が増えると待ち時間が大きくなり、デフォルトの設定の場合最大で300秒です。特定のケースではなるべく早くリトライを試行したい場合があるでしょう。このような場合にリトライアルゴリズムを差し替える方法が役に立ちます。


## 差し替える方法

`Config` の `Retryer` フィールドに値をセットすることで差し替えることができます。

```go
type Config struct {
	// ...
	// Retryer guides how HTTP requests should be retried in case of
	// recoverable failures.
	//
	// When nil or the value does not implement the request.Retryer interface,
	// the client.DefaultRetryer will be used.
	//
	// When both Retryer and MaxRetries are non-nil, the former is used and
	// the latter ignored.
	//
	// To set the Retryer field in a type-safe manner and with chaining, use
	// the request.WithRetryer helper function:
	//
	//   cfg := request.WithRetryer(aws.NewConfig(), myRetryer)
	//
	Retryer RequestRetryer
	// ...
}
```

https://github.com/aws/aws-sdk-go/blob/d8a5a9febe5602f134648c18e9f83546284cda35/aws/config.go#L94-L108

`Retryer` は `request.Retryer` を満たす型です。`Retryer` の実装上は `RequestRetryer` 型で `interface{}` 型へのDefined typeになっていますが、`request.Retryer` を満たしていない場合は `DefaultRetryer` が使われます。

`client.DefaultRetryer` 構造体を埋め込んで `RetryRules` メソッドを実装する方法がおすすめです。構造体の埋め込みを利用して、委譲したいメソッドだけを実装する手法はGoではよく使われます。リトライするかどうかの判断基準 (`ShouldRetry`) はデフォルトの実装のままで、リトライの待ち時間の計算アルゴリズムのみを差し替えることができます。以下の実装は [`jpillora/backoff`](https://github.com/jpillora/backoff) のシンプルな上限付きExponential Backoff And Jitterを使った実装です。

- retryer.go

```go retryer.go
package sample

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go/aws/client"
	"github.com/aws/aws-sdk-go/aws/request"
	"github.com/jpillora/backoff"
)

type customRetryer struct {
	*backoff.Backoff
	client.DefaultRetryer
}

func NewCustomRetryer(cfg *backoff.Backoff, numRetries int) *customRetryer {
	r := &customRetryer{Backoff: cfg}
	r.NumMaxRetries = numRetries
	return r
}

func (cr customRetryer) RetryRules(req *request.Request) time.Duration {
	return cr.Backoff.Duration()
}

var _ request.Retryer = &customRetryer{}
```

- main.go

```go main.go
package main

import (
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/endpoints"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/lambda"
	"github.com/d-tsuji/go-sandbox/customretry/sample"
	"github.com/jpillora/backoff"
)

var (
	lmd         *lambda.Lambda
	maxRetryNum = 10 // リトライ上限回数は環境変数などから取得
)

func init() {
	lmd = lambda.New(session.Must(session.NewSession(&aws.Config{
		Region:     aws.String(endpoints.ApNortheast1RegionID),
		MaxRetries: aws.Int(maxRetryNum),
		Retryer: sample.NewCustomRetryer(&backoff.Backoff{
			Min:    10 * time.Millisecond,
			Max:    300 * time.Millisecond,
			Factor: 2,
			Jitter: true,
		}, maxRetryNum),
	})))
}
```

上記のようにリトライアルゴリズムを差し替えることができます。もちろん `client.DefaultRetryer` を使って、リトライの設定(`client.DefaultRetryer` の `MaxRetryDelay` など)を変えることによってリトライの待ち時間の計算に影響を及ぼすこともできます。`AWS SDK for Go` が提供するデフォルトのリトライアルゴリズム・設定ではパフォーマンス上の問題があるケースなど、リトライのアルゴリズムや設定を差し替えたい場合に本記事が参考になれば幸いです。


* [スロットリングとの付き合い方 | フューチャー技術ブログ](/articles/20200121/)
