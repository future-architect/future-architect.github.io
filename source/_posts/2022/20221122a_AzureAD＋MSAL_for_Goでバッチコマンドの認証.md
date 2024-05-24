---
title: "AzureAD＋MSAL for Goでバッチコマンドの認証"
date: 2022/11/22 00:00:00
postid: a
tag:
  - Azure
  - AzureAD
  - AD
  - MSAL.js
  - Go
  - EntraID
category:
  - Programming
thumbnail: /images/20221122a/thumbnail.png
author: 澁川喜規
lede: "前回の記事ではMSAL.jsを使い、シングルページアプリケーションの認証を試してみました。業務システムで扱う認証にはいろいろな種類がありますが、だいたい以下のどれかに該当するケースが多いと思います。"
---
[前回の記事](/articles/20221118a/)ではMSAL.jsを使い、シングルページアプリケーションの認証を試してみました。

業務システムで扱う認証にはいろいろな種類がありますが、だいたい以下のどれかに該当するケースが多いと思います。

* Webサービス・モバイルアプリ: 一般ユーザーでログイン
* デスクトップで動かすバッチコマンド: 一般ユーザーでログイン
* デスクトップやサーバーで動かすバッチコマンド: 無人運用

Webサービスのうち、SPAは前回のエントリーで説明しました。Webサービスの認証は前回説明しました。今時の動的ページはSPAが主流と考えれば旧来のOpenID Connect（コールバックをウェブサーバーで受けてトークン発行はサーバーで行う）は説明不要でしょう。モバイルアプリについては使うフレームワークによっても変わるので割愛します。

本稿では、それ以外のケースとして、バッチコマンドの認証について扱います。今度はウェブ以外の認証ということで、MSAL for Goを使って認証します。上にあげたように、一般ユーザーでログインするケースと、無人運用の2つのケースを取り上げます。

# 一般ユーザーの認証

一般ユーザーは、WindowsとかOffice 365とかにログインする、いわゆる普通のユーザーです。この権限でトークンをとってAPIを実行すると、そのユーザーが操作したことになります。コマンドを動かした人の名前がログが残るということです。一般ユーザーの場合は、コマンドはまず、ユーザーに「お前誰よ」と聞く必要があります。

コマンドが自前でユーザーIDとパスワードの入力欄を出して入力させ、それを認証で使うフロー（Resource Owner Password Credentials Flow）は以前はありましたが、OAuth 2.1で無くなることが確定しています。ブラウザを表示してAzureAD認証をユーザーに行ってもらい、その結果のコードを使ってトークンを取得する方法がOAuth 2.1時代に唯一現存する方法です。そのため、通信方式としては、前回のSPAモードと同じく、Authorization Code Flowとなります。この方式はSPAと同様にパブリッククライアント用のモードなのでバッチコマンドを悪意のあるユーザーに奪取されて解析されたとしても直接それがセキュリティホールにはなりません。

まずは、AzureADの管理画面でアプリケーションを登録します（前回同様）。前回同様、テナントIDとクライアントIDはメモしておきます。

その後、認証のセクションで認証方式を追加しますが、今回はモバイルアプリケーションとデスクトップアプリケーションを選択し、カスタムのコールバックのアドレスで、ローカルホストのパスを指定します。ポートも指定する必要があります。また、``/callback``などのパスは不要です（後述）。

<img src="/images/20221122a/スクリーンショット_2022-11-10_16.45.58.png" alt="" width="1200" height="570" loading="lazy">

Go版のMSALは以下のようにしてインポートします。

```bash
$ go get github.com/AzureAD/microsoft-authentication-library-for-go
```

なお、追加でいくつかimportしないとエラーが出ます。不思議な構成。

```bash
$ go get github.com/AzureAD/microsoft-authentication-library-for-go/apps/internal/oauth/ops/accesstokens@v0.7.0
$ go get github.com/AzureAD/microsoft-authentication-library-for-go/apps/errors@v0.7.0
$ go get github.com/AzureAD/microsoft-authentication-library-for-go/apps/public@v0.7.0
```

モバイルアプリとかのパブリッククライアントは`.../apps/public`パッケージにあります。前回のエントリーでも紹介したパブリッククライアント用のパッケージです。これを使ったバイナリはリバースエンジニアリングされても、不正ログインされる材料は提供しません。

このライブラリを使ったコードは以下の通りで、JavaScript版とほぼ同じAPIで似たように書けます。

```go main.go
package main

import (
    "context"
    "log"

    "github.com/AzureAD/microsoft-authentication-library-for-go/apps/public"
)

func main() {
	pc, err := public.New("{クライアントID}", public.WithAuthority("https://login.microsoftonline.com/{テナントID}"))
	if err != nil {
		log.Fatal(err)
	}
	result, err := pc.AcquireTokenInteractive(context.Background(), []string{"User.Read"}, public.WithRedirectURI("{コールバックURL}"))
	if err != nil {
		log.Fatal(err)
	}
	log.Println(result.AccessToken)
}

```

これだけで実現できました。

## 一般ユーザー方式の蛇足な説明

Go版のコードをみると、コールバックURLをパースして、ポート番号を取り出して自分でウェブサーバーを起動し、ブラウザからのリダイレクトを受けれるようにしています。このサーバーはコールバックのパスの部分を認識してくれないため、AzureADの登録では`http://localhost:5173`のような形式にしないと「コールバックアドレスが登録と違う」というエラーになってしまいます。また、コールバックアドレスを設定しないと、ランダムなポート番号で起動します。ただ、ポート番号が一致しないと失敗となるので、何かしらのポートを登録しないといけないはずです。

認証方式でお手軽だったSPAを選ぶとよさそうですが、これは「cross-origin requestsじゃないとダメ」というエラーが出ます。また、一般のウェブを選ぶと「client_assertion' or 'client_secret」が必要というエラーが出るので、今回選んだ「モバイルアプリケーションとデスクトップアプリケーション」一択です。

また、モバイルアプリケーション云々では、独自のスキーマのコールバックURLを自動で作ってくれていました。MSAL用とあるので使えそうですが、これはin app browserなど、特定のスキーマの通信を横取りできる環境用になっています。今回は一般のブラウザを使っているのでこの方式は使えません。

# 無人運用の認証

バッチ処理などではログイン画面を出したりはできません。特定のユーザーのIDやパスワードを焼き込んで使い、退職にともなって停止して困った、みたいな話は昔から何度も聞きます。これは運用として間違っています。システムユーザー的なものを使って運用するのがベストです。しかし、前述のようにパスワードをツールが直接扱う認証は非推奨です。OAuth 2.1時代に使える方式としてはクライアントシークレットを使った認証方式になります。

まずはシークレットを生成します。「証明書とシークレット」を選択し、新しいクライアントシークレットを選択してシークレットを作ります。

<img src="/images/20221122a/スクリーンショット_2022-11-11_20.14.23.png" alt="スクリーンショット_2022-11-11_20.14.23.png" width="1200" height="497" loading="lazy">

出来上がると、「値」と「シークレットID」が表示されますが、値の方が必要なものなので、コピーしておきます。

<img src="/images/20221122a/スクリーンショット_2022-11-11_21.34.44.png" alt="スクリーンショット_2022-11-11_21.34.44.png" width="1200" height="563" loading="lazy">

これを組み込んだコードが以下の通りです。前回のエントリーや前述のパブリッククライアントのケースとは異なり、今回は`.../confidential`なパッケージを使っています。これはコンフィデンシャルクライアントで、攻撃者がバイナリにさわれない環境を想定しています。クライアントシークレットを奪取されてしまうとログインできてしまうのでこのバッチコマンドは（広く配布しない前提の）社内専用ツールだったり、バッチサーバーでのみ運用するケースでしか使ってはいけません。

```go
package main

import (
    "context"
    "log"

    "github.com/AzureAD/microsoft-authentication-library-for-go/apps/confidential"
)

func main() {
	s, err := confidential.NewCredFromSecret("{クライアントシークレット}")
	if err != nil {
		log.Fatal(err)
	}
	cc, err := confidential.New("{クライアントID}", s,
        confidential.WithAuthority("https://login.microsoftonline.com/{テナントID}"))
	if err != nil {
		log.Fatal(err)
	}
	result, err := cc.AcquireTokenByCredential(context.Background(), []string{"https://graph.microsoft.com/.default"})
	if err != nil {
		log.Fatal(err)
	}
	log.Println(result.AccessToken)
}
```

要注意ポイントはスコープの指定です。「リソースのURL」と「権限（パス形式）」を組み合わせたURL形式で指定します。SharePointだと、`https://{サイト名}.sharepoint.com/{権限}`です。権限部分は`/.default`か、[ここ](https://learn.microsoft.com/en-us/graph/permissions-reference#sites-permissions)に書いてあるような`Sites.FullControl.All`のような文字列を使います。なぜパブリッククライアントの時と違う名前なのか・・・

# 認証のキャッシュ

バッチ処理を毎秒実行するとして、毎秒認証するのは無駄が多いでしょう。トークンが有効な間は同じトークンを使いまわしたいところです。MSAL for Goでは自分でキャッシュ機構を作ることが可能です。といっても、大体はファイルへの読み書きだと思うので、次のサンプルの通りに実装すればおしまいです。

https://github.com/AzureAD/microsoft-authentication-library-for-go/blob/dev/apps/tests/devapps/sample_cache_accessor.go

パブリッククライアントの場合は次のオプションを`New`に追加します。

```go
public.WithCache(&TokenCache{"ファイル名"})
```

コンフィデンシャルクライアントの場合は次のオプションを`New`に追加します。なぜ違う名前なのか・・・

```go
confidential.WithAccessor(cache)
```

# まとめ

今回もバッチコマンドを想定してAzureADと認証するためのライブラリを使った認証を試してみました。

この手の検証は、アプリケーションのコード側だけではなく、接続先のAzureADの設定によっても接続が失敗する可能性があります。また、このあたりの設定はクリティカル度が高いため、アクセスできる人はなるべく少なくする運用がされることがほとんどです。特に受託開発で、お客さん側でAzureADの設定を管理している場合など、開発側では直接コンソールが触れずに、エスパーしながら試行錯誤しなければならない場面があります。お客さん側にも時間を取ってもらわないといけないし、自由な試行錯誤が難しかったりと、靴の裏から足の裏を掻くようなもどかしいことになります。
前回と今回のエントリーは、そのような場合にも対応できるように、AzureAD側の設定の依頼が投げやすいように、開発のストレスを下げたい、という思いで管理画面側の設定もなるべく具体的に書いています。

MSAL系のライブラリにはたくさんの実装がありますが、ウェブフロントエンドもGoも、APIはほぼ一緒でした。Javaとかみてみてもすぐにキャッチアップできそうです。簡単で安全な接続ができるため、接続先がAzureADであれば積極的にMSALシリーズを活用してみると良いと思いました。

