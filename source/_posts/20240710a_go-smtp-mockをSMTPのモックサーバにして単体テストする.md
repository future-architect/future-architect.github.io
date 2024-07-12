---
title: "go-smtp-mockをSMTPのモックサーバにして単体テストする"
date: 2024/07/10 00:00:00
postid: a
tag:
  - テスト
  - SMTP
  - メール
  - go-smtp-mock
  - Go
  - モック
category:
  - Programming
thumbnail: /images/20240710a/thumbnail.png
author: 真野隼記
lede: "バックエンドのアプリケーションの上で、メール送信するコードがある場合の単体テストをどう実現するか悩みました。"
---
## はじめに

TIG真野です。

バックエンドのアプリケーションの上で、メール送信するコードがある場合の単体テストをどう実現するか悩みました。

メールには、タイトル・本文・From・TO・CC・BCCなど複数の設定値がありますし、SMTPサーバの接続情報もあります。これらを表現する構造体のモデルだけに絞った検証に留めることは、気が進みませんでした。時代はインフラレベルでダミーサーバを動かしモックする方向で動いています。SMTPでメール送信し、その送信結果をテストコード上で取得＆検証する一連の流れを行って動作を確かめたいと思いました。

方法として、澁川さんの[MailSlurperを使って6桁のコードの送信コードのテストをする](https://future-architect.github.io/articles/20230120a/)で紹介されたMailSlurperを使うか迷いましたが、以下の点で牛刀だなと感じました。

- メール送信するのはごく一部の機能（私の場合は1機能。今後増える見込みは現時点で見えなかった）
- MailSlurperの管理画面アクセス機能などは不要
- Testcontainersで呼び出すとはいえ、テストで依存するコンテナが増えることに抵抗感

`httptest.NewServer()` は既存のテストコードでの利用頻度が高かったため、同じメンタルモデルで対応できると嬉しいということで、Goで実装されたSMTPサーバの実装を利用する方向にしました。

## go-smtp-mock

<img src="/images/20240710a/848bc1dd-fc35-4d78-8bd9-0ac3430270d8.png" alt="848bc1dd-fc35-4d78-8bd9-0ac3430270d8.png" width="1200" height="600" loading="lazy">

※（ロゴがPlaywrightに見えますね）

GoでSMTPのモックサーバの中でおそらく最も有名な[mocktools/go-smtp-mock](https://github.com/mocktools/go-smtp-mock)を利用して、SMTPサーバのモックとします。

テストコードのイメージとしては次のようになります。

```go
package example

import (
	// ... 省略 ...
	smtpmock "github.com/mocktools/go-smtp-mock/v2"
)

func TestExampleMailSendHandler(t *testing.T) {
	// ... 省略（DBセットアップ、DBコネクション初期化など） ...

	// SMTPのモックサーバの初期化
	testSMTPServer := smtpmock.New(smtpmock.ConfigurationAttr{})

	// テスト終了後にSMTPサーバ停止
	t.Cleanup(func() {
		if err := testSMTPServer.Stop(); err != nil {
			t.Log(err)
		}
	})

    // SMTPサーバ起動
	if err := testSMTPServer.Start(); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name      string
		inputFile string
		wantMail  string
	}{
		{
			name:       "メール送信が1件あり、xxx業務の依頼を行う",
			inputFile:  "... 省略 ...",
			wantMail:   "testdata/want_mail_01.html",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// ... 省略（DBへ事前データ登録など） ...

			h := NewExampleMailSendHandler(db, MailConfig{
				Host: "localhost",
				Port: testSMTPServer.PortNumber(),
			})

			if err := h.SendMail(context.Background()); err != nil {
				t.Errorf("SendMail() error = %v", err)
			}

			// ... 省略（DBに対するデータ検証など） ...

			msgs := testSMTPServer.MessagesAndPurge()
			if len(msgs) == 0 {
				t.Fatalf("no messages received")
			} else if len(msgs) > 1 {
				t.Errorf("multiple mail messages received: %v", msgs)
			}

			want := testonly.MustReadFile(tt.wantMail)
			if diff := cmp.Diff(string(want), msgs[0].MsgRequest()); diff != "" {
				t.Errorf("SendMail() mailMsgRequestHeader mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
```

サーバの起動は以下のコードの部分です。`smtpmock.ConfigurationAttr` は未指定ですが、[configuring](https://github.com/mocktools/go-smtp-mock?tab=readme-ov-file#configuring)を見れば様々な設定が可能です。利用するポート番号が未指定であれば、動的に空きポートを選択してくれるそうです（テストの安定性的には未指定がベターでしょう）。

```go SMTPサーバの起動
	// SMTPのモックサーバの初期化
	testSMTPServer := smtpmock.New(smtpmock.ConfigurationAttr{})

	// テスト終了後にSMTPサーバ停止
	t.Cleanup(func() {
		if err := testSMTPServer.Stop(); err != nil {
			t.Log(err)
		}
	})

    // SMTPサーバ起動
	if err := testSMTPServer.Start(); err != nil {
		t.Fatal(err)
	}
```

続いて、起動したgo-smtp-mockサーバのエンドポイントは `testSMTPServer.PortNumber()` の部分で取得できます。テスト対象のController（ああるいは、Usecase, Serviceなどの制御層）に渡します。今回の例では、HandlerがMailConfigという構造体を受け取るとします。

```go SMTPサーバのエンドポイント
			h := NewExampleMailSendHandler(db, MailConfig{
				Host: "localhost",
				Port: testSMTPServer.PortNumber(),
			})
```

検証対象の機能を呼び出した後は、以下の部分でメールを受信します。受信とPurge（削除）を同時に行うため、複数のテストを連続して動かしても問題なしです。

```go メール受信
			msgs := testSMTPServer.MessagesAndPurge()
```

検証は想定結果のファイルを次のような形式で用意し確認しました。メール本文だけ切り出して検証するか迷いましたが、From, To, Cc, Bcc, Subject, 本文が全て同じファイルにあったほうが検証しやすかったので、go-smtp-mockのメッセージ形式を採用しています。

```html testdata/want_mail_01.html
From:future-sandbox@example.com
To:foo.bar@example.com
Cc:hoge.fuga@example.com
Bcc:piyo.piyo@example.com
Subject:Xxxの業務依頼です(2024年7月10日)

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<meta http-equiv="Content-Type" content="text/html;" />
<meta http-equiv="content-language" content="ja">
<html>
<head>
    <title>Xxxの業務依頼です(2024年7月10日)</title>
    <style>...省略... </style>
</head>
<body>
... 省略（本文） ...
</body>
</html>

```

## 使用時の注意点

便利なgo-smtp-mockですが、ドキュメントの[features](https://github.com/mocktools/go-smtp-mock?tab=readme-ov-file#features)に次のように書かれています。

> No authentication support
> 認証のサポートがない

そのため、認証付きのメール送信を行う場合はそのままだと使えません。例えば、次のようにユーザ名・パスワードが必要とします

```go アプリ側のメール送信のコード
import (
	// ... 省略 ...
	"net/smtp"
)

func (h ExampleMailSendHandler)SendMain(ctx context.Context, targetID string) error {
	// ... 省略 ...

    // ユーザ名、パスワード認証
    auth := smtp.PlainAuth("", h.SMTPUsername, h.SMTPPassword, h.SMTPHost)

	// net/smtpパッケージを用いてメール送信    
	if err := smtp.SendMail(h.SMTPEndpoint(), auth, fromAddrs, toAddrs, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send mail: %w", err) // ★go-smtp-mockは認証に非対応なので失敗する
	}
 
 	// ... 省略 ...
    return nil
}
```

そのため、テスト実行時はメール認証を無しにするような分岐が何かしら必要です。

例えば次のようなヘルパー関数を追加します（本当は `ENABLE_NO_SMTP_AUTH=true` のような環境変数で切り替えたほうが良い気もします）。

```go
func (h ExampleMailSendHandler) SMTPAuth() smtp.Auth {
	if c.Username != "" && c.Password != "" {
		// デプロイメント環境で利用する場合は、ユーザ名・パスワード認証を用いる
		return smtp.PlainAuth("", c.Username, c.Password, c.Host)
	}
	// 🚨go-mock-smtpが認証をサポートしていない🚨
    // 🚨そこでUsername, Passwordが空の場合はnilを返し、認証無しでメールを送信させる🚨
	return nil
}
```

これを先程のメール送信部分から読み込ませます。これによりgo-smtp-mockにメール送信ができました。

```diff
func (h ExampleMailSendHandler)SendMain(ctx context.Context, targetID string) error {
	// ... 省略 ...

    // ユーザ名、パスワード認証
-    auth := smtp.PlainAuth("", h.SMTPUsername, h.SMTPPassword, h.SMTPHost)
+    auth := h.SMTPAuth() // テスト時はnilを返す（認証なしとする）

	// net/smtpパッケージを用いてメール送信    
	if err := smtp.SendMail(h.SMTPEndpoint(), auth, fromAddrs, toAddrs, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send mail: %w", err)
	}
 
 	// ... 省略 ...
    return nil
}
```

## 使ってみて感想

認証部分は多少のハックが必要という少しだけ点は残念かもしれませんが、`net/smtp` パッケージ経由でメール送信して成功しているという状態を作れるので非常に安心できました。

go-smpt-mockはPure Go実装ですし、立ち上げも早く待ち時間を感じません。テストを何度も繰り返し実行するに当たりストレスはあまり感じませんでした。ライトなメール送信機能のテストを書く別の機会があれば、また利用すると思います。

READMEにあるサンプルコードのように、以下のオプションを入れるとgo-smtp-mockの動作が細かくログ出力されるため、疎通もさほど困りませんでした。初めて利用される方はこのオプションを有効にすることをお勧めします。

```go
  server := smtpmock.New(smtpmock.ConfigurationAttr{
    LogToStdout:       true,
    LogServerActivity: true,
  })
```

## まとめ

go-smtp-mockでSMTPのモックサーバと動かせ、単体テストに利用しました。

認証機能など不足している部分もあるが、その他ハマりどころは少なく利用できました。

それではハッピーなメールライフを！

