---
title: "Google Drive API v3をサービスアカウトとGoから利用"
date: 2021/10/22 00:00:00
postid: a
tag:
  - GoogleWorkspace
  - Go
  - GoogleCloud
category:
  - Programming
thumbnail: /images/2021/20211022a/thumbnail.png
author: 真野隼記
lede: "Google DriveにアップロードされたExcelファイルを利用したちょっとしたジョブを実装する機会があり、処理を動かしたいのがAWSなど別のプラットフォームであったため、サービスアカウントを用いてGoogle Drive APIにアクセスするGoプログラムを作りました。"
---
## はじめに

TIG真野です。

Google DriveにアップロードされたExcelファイルを利用したちょっとしたジョブを実装する機会があり、処理を動かしたいのがAWSなど別のプラットフォームであったため、サービスアカウントを用いてGoogle Drive APIにアクセスするGoプログラムを作りました。

いくつかの人が書いている通り、Google Drive APIもv2, v3で情報が入り乱れていて本家のドキュメントを探したて見ながら試行錯誤したりちょっと悩みました。また、サービスアカウント利用する実装例が少なかったので手順をまとめていきます。

## 認証方式

Google Drive APIを用いたコード実装を始める前に、事前にアカウントなどの権限周りの準備を実施します。

Google Drive APIを使うための[認証方式](https://cloud.google.com/docs/authentication?hl=ja#getting_credentials_for_server-centric_flow)には大きく4つの方法があります。

1. **APIキー**: 一般公開データに匿名でアクセスする
1. **OAuth2**: エンドユーザーに代わって限定公開データにアクセスする
1. **環境提供のサービス アカウント**: Google Cloud 環境内でサービス アカウントに代わって限定公開データにアクセスする
1. **サービスアカウント**: Google Cloud 環境外でサービス アカウントに代わって非公開データにアクセスする

今回はGCP以外の環境で動かしたいので、4のサービスアカウントを利用します。

## サービスアカウントの払い出し

サービスアカウントはGCPのProjectに紐づきます。もし利用できるProjectが存在しなければ[リソース管理ページ](https://console.cloud.google.com/cloud-resource-manager)から作成します。詳しくは[プロジェクトの作成と管理 - Google Cloud](https://cloud.google.com/resource-manager/docs/creating-managing-projects)を確認下さい。

続いて、Projectの[Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com) から、Google Drive APIを有効にします。有効にしないとこのProjectから払い出したサービスアカウントの認証情報では、Google Drive APIを利用できないです。

<img src="/images/2021/20211022a/Google_Drive_APIの有効化.png" alt="Google_Drive_APIの有効化.png" width="1200" height="640" loading="lazy">

続いて、[APIとサービスにある、Google Drive APIの認証情報](https://console.cloud.google.com/apis/api/drive.googleapis.com/credentials)タブから、「認証情報を作成」をクリックして、サービスアカウントの作成を行います。今回は適当に、google-drive-exampleという名前にしました。

<img src="/images/2021/20211022a/認証情報を作成.png" alt="認証情報を作成.png" width="1200" height="470" loading="lazy">

数十秒待つと、サービスアカウントの作成されます。その後は、サービスアカウントの「キー」から、キーを作成します。タイプはJSONで良いと思います。

<img src="/images/2021/20211022a/image.png" alt="image.png" width="1200" height="628" loading="lazy">

ダウンロードしたJSONファイルは大事に保存します。AWS上で使う場合は、AWS Systems Manager Parameter StoreにSecureString属性をつけて保存し利用すると良いでしょう。

## サービスアカウントのDriveへのアクセス権限を追加

先程作成したサービスアカウントの `google-drive-example@xxxx-xxxx-123456.iam.gserviceaccount.com` に、アクセスしたいGoogle Drive先の権限を付与します。

アクセスさせたいフォルダなどを右クリックして、「共有」から先程のアカウントIDを指定します。

<img src="/images/2021/20211022a/権限付与.png" alt="権限付与.png" width="1200" height="388" loading="lazy">

これでgoogle-drive-exampleのIDから、Google Drive APIを用いて指定のフォルダにアクセスできるようになりました。

## 実装（List）

GoからGoogle Drive API v3を利用します。

```sh パッケージ取得
go get -u google.golang.org/api/drive/v3
```

まず指定されたフォルダ配下にあるファイルの一覧表示します。

```go
package main

import (
	"context"
	"log"

	"google.golang.org/api/drive/v3"
)

func main() {
	ctx := context.Background()

	srv, err := drive.NewService(ctx)
	if err != nil {
		log.Fatalf("Unable to retrieve Drive client: %v", err)
	}

	r, err := srv.Files.List().PageSize(1000).
		Fields("files(id, name)").
		Context(ctx).Do()
	if err != nil {
		log.Fatalf("Unable to retrieve files: %v", err)
	}

	for _, f := range r.Files {
		println(f.Name, f.Id)
	}

}
```

実行する前に先程取得したJSONキーファイルを環境変数で指定する必要があります。

```sh
export GOOGLE_APPLICATION_CREDENTIALS=./project-name-123456789abc.json
```

環境変数に `GOOGLE_APPLICATION_CREDENTIALS` が設定されていれば、SDK側が自動で認証してくれます。詳しくは[サービス アカウントとして認証する - Google Cloud](https://cloud.google.com/docs/authentication/production) を参照下さい。

実行すると、先程権限を付与したフォルダ配下のファイル一覧が取得できると思います。

## 実装（ダウンロード）

続いて、フォルダにExcelファイルがアップロードされているとして、それらをダウンロードします。

```go
// package, import 部分は省略

func main() {
	ctx := context.Background()

	srv, err := drive.NewService(ctx)
	if err != nil {
		log.Fatalf("Unable to retrieve Drive client: %v", err)
	}

	r, err := srv.Files.List().PageSize(1000).
		Fields("files(id, name, mimeType)"). // mimeTypeを追加する
		Context(ctx).Do()
	if err != nil {
		log.Fatalf("Unable to retrieve files: %v", err)
	}

	for _, f := range r.Files {
		if f.MimeType == "application/vnd.google-apps.folder" {
			// フォルダの場合はスキップ
			continue
		}

		if err := download(ctx, srv, f.Name, f.Id); err != nil {
			log.Fatalf("Unable to download: %v", err)
		}
	}

}

func download(ctx context.Context, srv *drive.Service, name, id string) error {
	create, err := os.Create(name)
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer create.Close()

	resp, err := srv.Files.Get(id).Context(ctx).Download()
	if err != nil {
		return fmt.Errorf("get drive file: %w", err)
	}
	defer resp.Body.Close()

	if _, err := io.Copy(create, resp.Body); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	return nil
}
```

さきほどのList表示するコードと大部分は同じですが、mimeTypeを追加で設定しているのはご注意下さい。Fieldsに指定できる項目は[Google Drive APIの開発者ページのfiles](https://developers.google.com/drive/api/v3/reference/files)に記載がありました。

今回はmimeTypeでフォルダに対してはダウンロード処理をしないようにスキップ処理を入れています。

ダウンロードですが、今回はExportではなくGetを利用しています。スプレッドシートの場合はExportを呼び出しxlsx形式にする必要があるかもしれませんが、単純にバイナリをそのまま落とすのであればGetです。

こちらを実行すると、権限付与したフォルダ配下のファイルを全て取得できると思います。

## 共有ドライブ（Shared drive）へのアクセス

**2022.10.16追記**

共有ドライブへのアクセスは[Implement shared drive support](https://developers.google.com/drive/api/guides/enable-shareddrives)に記載されているとおり `supportsAllDrives=true` の追加のオプションが必要です。これを指定しないと、権限はあるはずなのに `404: File not found` が出ると思います。

次のようにSuppourtsAllDrives()で設定します。

```go:List()の場合
	r, err := srv.Files.List().SupportsAllDrives(true).PageSize(1000).
```

```go:ダウンロードの場合
	resp, err := srv.Files.Get(id).SupportsAllDrives(true).Context(ctx).Download()
```

業務利用だと出力先を共有ドライブにすることはよくある運用だと思っており、そしてこのオプションはけっこう抜けがちで、本番疎通時にハマることも多いようなのでご注意ください。

## 指定したフォルダ配下のみのファイルをダウンロードしたい

[Google Drive APIの Files: list](https://developers.google.com/drive/api/v3/reference/files/list)を確認すると`q`オプションで検索対象の絞り込みが可能です。いくつか[検索例](https://developers.google.com/drive/api/v3/search-files)がドキュメントに記載されています。

`'1234567' in parents` といった例が記載されていますが、1234567には指定したいフォルダのIDを設定します。IDはブラウザで開いた時にURLで設定されている値です。複数を指定したい場合は `or` 条件で追加も可能です。

```go
	r, err := srv.Files.List().PageSize(1000).
		Fields("files(id, name, mimeType, parents)").
		Q(fmt.Sprintf("'%s' in parents or '%s' in parents", "1234567", "890abcd")). // 特定のフォルダ配下
		Context(ctx).Do()
	if err != nil {
		log.Fatalf("Unable to retrieve files: %v", err)
	}
```

どういった検索条件を指定できるかは、文法としてまとまっているので迷ったら確認すると早いです。

* https://developers.google.com/drive/api/v3/ref-search-terms

## フォルダ指定かつ再帰的にファイルを探索したい

さきほどの `q` の指定で再帰的にファイルを指定するのは難しいです。

例えば、以下のようにネストした構造を保つ場合に、targetFolderのファイルIDを指定しても取得できるのは folder1, folder2までです。

```
targetFolder
  └ folder1
  |   └ file1.xlsx
  |   └ file2.xlsx
  └ folder2
      └ file3.xlsx
```

この場合は自前で再帰的にList APIをコールする処理を実装する必要があります。少し面倒ですね。少し面倒ですが、最初の実装にあるとおり、OR条件で親フォルダを決め打ちで指定するのが簡単で良いかもしれません。

（parents は複数要素が設定されると思うので、ネストした親フォルダも設定できた場合は、`q` に `'FILE-ID' in parents` の指定で実現できそうです。設定方法がよく分からず今回は上記の結論となりました）

## ページング

List APIのドキュメントを確認すると、pageSizeはデフォルトが100で、最大が1000までです。これを超過する場合は、pageTokenを指定してページング処理を行う（複数回APIをコールする）必要があります。

* https://developers.google.com/drive/api/v3/reference/files/list

簡単な実装例です。

```go
// package, import 部分は省略

func main() {
	ctx := context.Background()

	srv, err := drive.NewService(ctx)
	if err != nil {
		log.Fatalf("Unable to retrieve Drive client: %v", err)
	}

	var paging string

	for {
		r, err := srv.Files.List().PageSize(1000).
			Fields("nextPageToken, files(id, name, parents)"). // nextPageTokenをFiledsに追加
			PageToken(paging).
			Context(ctx).Do()
		if err != nil {
			log.Fatalf("Unable to retrieve files: %v", err)
		}

		for _, f := range r.Files {
			fmt.Printf("%s %s %+v\n", f.Name, f.Id, f.Parents)
		}

		paging = r.NextPageToken
		if len(paging) == 0 { // 次のページング先が無ければ終了
			break
		}
	}

}
```

ファイル数が1000を超過する可能性がある場合は、忘れないようにしたいですね。

## まとめ

サービスアカウントを用いて、Google Drive API v3をGo SDKを用いて操作する例をいくつかまとめました。Google Drive上のファイルにアクセスできると、システムやアプリに機能として組み込まなくても、ちょっとした業務を効率化できると思います。うまく役立てていけると良いなと考えています。
