---
title: "MailSlurperを使って6桁のコードの送信コードのテストをする"
date: 2023/01/20 00:00:00
postid: a
tag:
  - MailSlurper
  - Go
  - メール
  - テスト
category:
  - 認証認可
thumbnail: /images/2023/20230120a/thumbnail.png
author: 澁川喜規
lede: "以前、認証ミドルウェアのhankoの紹介の中で、hankoがテストで使っているMailSlurperというメールサーバーが面白いという紹介をしました。テストにおいては、モックは使うものの、モックを差し込むレイヤーはソースコードレベルではなくて、インフラレベルで仕掛ける方がいいよ、というのはほぼコンセンサスとなっていると思います。"
---
以前、認証ミドルウェアのhankoの紹介の中で、hankoがテストで使っているMailSlurperというメールサーバーが面白いという紹介をしました。

https://future-architect.github.io/articles/20220902a/

テストにおいては、モックは使うものの、モックを差し込むレイヤーはソースコードレベルではなくて、インフラレベルで仕掛ける方がいいよ、というのはほぼコンセンサスとなっていると思います。

* RDBを使うには、DockerでさっとPostgreSQLを差し込む
* フロントエンドからのHTTPの外部サービスを使うには、[Mock Service Worker](https://mswjs.io/)とか[Cypressのintercept](https://docs.cypress.io/api/commands/intercept)を使う

もちろん、フレームワークでH2とかSQLiteとかのローカルで簡単に使えるDBMSをサポートしているならそれを使うのも手ですが、ともかく、コードレベルのモックオブジェクトを実装するのはなし、という感じですね。

というのも、やり方を間違えると、モックに対するテストコードになって、コード量のわりに品質があがらないとか、結局実システムの挙動の変化に気づけずに不具合が防止できないとか、モックをコードで作るのはあまりよくないという論調ですね。なるべく上流でモックすれば、そのような問題は減ります。将来的にはモックの挙動が正しいかの検証とかそういうあたりの進化もあるかな、と思いつつ、楽に成果が出るならそちらを今は選択すべきと思います。

メールを送信するシステムにおいても、MailSlurperを使えば良さそうなので試してみました。最近よく見かける、6桁の数字のコードを追加の認証を行うシステムのテストです。

# MailSlurper

[MailSlurper](https://www.mailslurper.com/)は、MITライセンスのオープンソースのメールサーバー兼クライアントです。SMTPでメールを受けることができて、ブラウザでそのメールを確認できます。また、REST APIも提供されており、受信したメールをAPIで取り出せます。Go製で軽く、Dockerで気軽に起動できます。

メールボックスは1つで、来たメールはすべて一か所に集まります。ドキュメントを見ると、クライアント証明書をアクセス時に必要という設定ができ、本番環境でも使うことを想定してそうですが、エンドユーザー向けに使うにもメールボックスが1つしかないと不便ですし、受信後のイベント起動とかがないので、バックエンド処理のトリガーにするにも少し心もとなく、今のところはテスト用途がベストかな、と思っています。

GitHubを見てもここしばらくはあまり更新されていないのですが、SMTPは機能的には枯れているので問題ないでしょう。

# 6桁の数値の生成とセキュリティ

みなさん、[Real World HTTP](https://www.oreilly.co.jp/books/9784873119038/)はすでにご覧になられていると思いますので、お手元の本の「14.8.5　タイムベースワンタイムパスワードアルゴリズム（TOTP）」を見れば詳しいことが書かれているので、詳細については語りませんが、秘密鍵として用意したシークレットをもとに、日時情報を加えて6桁の数値を生成します。Goなら `github.com/pquerna/otp/totp` パッケージを利用するのが簡単です。

6桁の数値の計算はRFCで決められたアルゴリズムに基づいて行います。高いセキュリティが求められるようなサービスであれば、事前に秘密鍵をGoogle Authenticatorなどのアプリに登録しておき、TOTPのアルゴリズムに従って出力した数値をサーバーに送り、サーバー側でも同じ計算をすることで照合します。秘密鍵そのものは最初の登録時以外はネットワークを流れることがないため、通信経路が安全でなくても比較的安全です。仮に通信が傍受されても、そのコードは30秒（たいていのサービスの場合）しか有効でないからです。

一方で、あまりプロ向けのサービス出ない場合は、同じTOTPのアルゴリズムであっても、別の使い方をします。登録されているメールアドレスやSMS、音声通話で6桁のコードをユーザーに伝え、それをユーザーがサーバー画面で入力して戻すことで照合します。通信経路の傍受に対する強度は同じですが、仮にSIMスワップ攻撃を受けたり、メールサーバーのアカウントがクラックされてアクセスされてしまうと突破できてしまうので、手元のハードウェアに触られなければ安心の前述の方法よりはやや安全性は落ちます（もちろん、秘密鍵をそのデバイスにしか入れていないという前提で）。

後者のような機能を実装するサービスは増えているので、それをMailSlurperを使ってテストしてみます。

# シークレットの作成

シークレットの生成は `github.com/pquerna/otp` で簡単にできます。シークレット生成はユーザー登録時に行い、サーバー側でユーザーごとに保存します。後半のコードは、すでに登録済みのユーザーに対して行う前提なので、あらかじめ作っておいてテストコードに利用します。登録プロセスを実装する場合はこちらのコードを参考にしてください。

```go
package main

import (
	"fmt"
    "log"

	"github.com/pquerna/otp/totp"
)

func main() {
    key, err := totp.Generate(totp.GenerateOpts{})
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("key: %s\n", key.Secret())
}
```

# テストサーバーの起動

テストのためのMailSlurperを起動しておきます。docker composeを利用します。ウェブの管理画面、API、SMTPポートの3つを開けておきます。なお、公式のDockerイメージはなく、野良イメージが多いのですが、[marcopas/docker-mailslurper](https://hub.docker.com/r/marcopas/docker-mailslurper) が一番ドキュメントが充実しています。

```yaml docker-compose.yaml
services:
  mailslurper:
    image: marcopas/docker-mailslurper:latest
    ports:
      - '8080:8080' # web UI
      - '8085:8085' # API
      - '2500:2500' # smtp
```

あとは起動するだけです。 http://localhost:8080 にアクセスして管理画面にアクセスできることを確認しましょう。

```bash
docker compose up
```

<img src="/images/2023/20230120a/スクリーンショット_2023-01-16_1.41.30.png" alt="スクリーンショット_2023-01-16_1.41.30.png" width="1200" height="684" loading="lazy">

# テストコード作成

これから作るコードは、6桁の認証コードつきのメールを送信するものです。その6桁の数値が正しいものかどうかの検証を来ないます。

MailSlurperは[REST APIを提供しています](https://github.com/mailslurper/mailslurper/wiki/Email-Endpoints
)。送信されたメール一覧を取得してきます。取得にあたっては、送信もとアドレスや送信先のアドレスでフィルタリングもできます。

まずはテストヘルパーとして、メールサーバーからメールをとってくるコードを作成してみます。6桁の数値を取り出します。送信先アドレスでフィルタリングを行うようにします。同時にテストを並行で走らせたとしても、送信先のユーザー（アドレス）を分けておけばテストが干渉することがなくなります。今回はGoで実装しています。

```go
package authcode

import (
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"testing"
)

// json2goで作成した、MailSlurperのメールアドレス一覧のレスポンス
type MailSlurperResponse struct {
	MailItems    []MailItem `json:"mailItems"`
	TotalPages   int        `json:"totalPages"`
	TotalRecords int        `json:"totalRecords"`
}

type MailItem struct {
	ID          string   `json:"id"`
	DateSent    string   `json:"dateSent"`
	FromAddress string   `json:"fromAddress"`
	ToAddresses []string `json:"toAddresses"`
	Subject     string   `json:"subject"`
	Body        string   `json:"body"`
}

// toアドレスでフィルタリングしてのメールの取り出し
func ReceiveMail(t *testing.T, host, to string) []MailItem {
	t.Helper()
	u, err := url.Parse(host)
	if err != nil {
		panic(err)
	}
	u.Path = "/mail"
	q := url.Values{}
	q.Set("to", to)
	u.RawQuery = q.Encode()

	res, err := http.Get(u.String())
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	d := json.NewDecoder(res.Body)
	r := MailSlurperResponse{}
	err = d.Decode(&r)
	if err != nil {
		panic(err)
	}
	return r.MailItems
}

// 6桁のコードを取り出す（裏でメールサーバーから情報取得）
func ReceivePassCode(t *testing.T, host, to string) string {
	t.Helper()
	mails := ReceiveMail(t, host, to)

	p := regexp.MustCompile(`\d{6}`)

	for _, m := range mails {
		return p.FindString(m.Body)
	}
	return ""
}
```

完成したテストコードは以下の通りです。短く書けますね。

```go
package authcode

import (
	"os"
	"testing"
)

func TestValidate(t *testing.T) {
	secret := "LB6BHGYD63JCWM4BBPHCSRBXGZYKGDI3" // 事前に作成しておいたシークレット
    // これから作成する、パスコード送信処理
	err := SendPassCode("localhost:2500", "test user", "test@example.com", secret)
	if err != nil {
		t.Errorf("error should be nil: %v", err)
		return
	}

	code := ReceivePassCode(t, "http://localhost:8085", "test@example.com")
    // これから実装するバリデーション
	if !Validate(code, secret) {
		t.Error("validation failed")
	}
}
```

APIエンドポイントの``/mail``に``to``クエリーをつけて帰ってくるJSONをいじるだけなので、他の言語でもすぐに実装できると思います。

# コード生成とメール送信

登録済みのユーザー（サーバーは、名前、メールアドレスおよび、シークレットを知っている）に対して、コードを生成して送信します。なお、レガシーなもろもろの塊であるメールで日本語を正しく送信するにあたっては、以下のQiita記事を参考にしました。

* [go で utf8メールを送信](https://qiita.com/yamasaki-masahide/items/a9f8b43eeeaddbfb6b44)

上記のテストが通るように実装したのが以下のテストです。

```go
package authcode

import (
	"bytes"
	"encoding/base64"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	"github.com/pquerna/otp/totp"
)

// 上記のエントリーから、add76crlf, utf8Split, encodeSubjectをコピーしておくこと

// メールの作成
func GenerateMessage(toUserName, toAddress, secret string) ([]byte, error) {
	from := mail.Address{"Myサービス", "noreply@my-service.com"}
	to := mail.Address{toUserName, toAddress}

	var msg bytes.Buffer
	msg.WriteString("From: " + from.String() + "\r\n")
	msg.WriteString("To: " + to.String() + "\r\n")
	msg.WriteString(encodeSubject("Myサービスの認証コード"))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
	msg.WriteString("Content-Transfer-Encoding: base64\r\n")

	code, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		return nil, err
	}

	var body bytes.Buffer
	body.WriteString("認証コードはこちらです\n\n" + code + "\n\nMyサービス")
	msg.WriteString("\r\n")
	msg.WriteString(add76crlf(base64.StdEncoding.EncodeToString(body.Bytes())))

	return msg.Bytes(), nil
}

// メール送信
func SendPassCode(host, toUserName, toAddress, secret string) error {
	msg, err := GenerateMessage(toUserName, toAddress, secret)
	if err != nil {
		return err
	}
	err = smtp.SendMail(
		host,
		nil,
		"noreply@my-service.com",
		[]string{toAddress},
		msg,
	)
	return err
}

// クライアントに送信されたパスコードのバリデーションを行う
func Validate(passcode, secret string) bool {
	return totp.Validate(passcode, secret)
}
```

先ほどのテストに対して実行すると、正しくテストをパスします。簡単にメール送信を伴うコードのテストができました。

# テストの後始末

テストを行い続けると、メールボックスにメールが溜まり続けます。リソースを消費する量は大したことがないとはいえ、増え続けるのは精神衛生上良くないです。幸い、MailSlurperはメールボックスのリセットもAPIで提供してくれていますので、それを使ってみます。

まずは先ほどのテストヘルパーのファイルに以下のメールボックスリセットの送信を行うヘルパー関数を追加します。

```go
func ResetMailSlumper(host string) {
	u, err := url.Parse(host)
	if err != nil {
		panic(err)
	}
	u.Path = "/mail"

	req, _ := http.NewRequest("DELETE", u.String(), strings.NewReader(`{"pruneCode": "all"}`))
	req.Header.Set("Content-Type", "application/json")
	http.DefaultClient.Do(req)
}
```

テストの実行前にリセットを呼ぶようにします。後始末だと、実行後の方が自然に思えるかもしれませんが、テストのリソースのリセットを後にしてしまうと、問題発生時に結果を追いかけるのが大変になるため、僕は全体の実行前にクリアするようにしています。

```go
func TestMain(m *testing.M) {
	ResetMailSlumper("http://localhost:8085")
	code := m.Run()
	os.Exit(code)
}

```

# まとめ

これで実SMTPサーバーを使ったコードを書いて、それをMailSlurperを使ってテストする方法を学びました。REST APIのおかげで、ヘルパーさえ用意してしまえば、テストを書くのは簡単です。

これだけ使いやすいとなると、非同期通信系は全部SMTPに寄せたくなってくる気もします。まあ本番環境の安定稼働を考えると実際にやることはないですが、MailSlurperは送信結果を見るのもできて、開発体験はかなり良いです。
