---
title: "GoogleWorkspace SDKのAPIリクエスト間隔は気を付けましょう"
date: 2022/06/09 00:00:00
postid: a
tag:
  - GoogleWorkspace
  - GCP
  - スロットリング
  - 失敗談
category:
  - Programming
thumbnail: /images/20220609a/thumbnail.png
author: 岸下優介
lede: "Google Workspace Admin SDKのDirectory APIを使った開発を行いました。本記事では、APIを利用した際に500エラーを頻発させてしまった件について執筆していこうと思います。"
---

<img src="/images/20220609a/googleworkspace.png" alt="" width="708" height="402">

## はじめに

TIG DXユニットの岸下です。2022年2月にキャリア入社して、早4ヶ月経ちました。時が流れるのは早いですね。

参加しているプロジェクトで、Google Workspace Admin SDKのDirectory APIを使った開発を行いました。

本記事では、[失敗談をテーマにした連載](/articles/20220601a/)として、APIを利用した際に500エラーを頻発させてしまった件について執筆していこうと思います。

結構あるあるな失敗なので、これから開発に入っていく新入社員・初学者の方にはぜひ読んで頂きたい内容となっております。

## Google Workspace Admin SDKとDirectory APIについて

Google WorkspaceはGoogleが提供する組織向けオンラインアプリケーションセットです。

[Google Workspace Admin SDK](https://developers.google.com/admin-sdk)はGoogle Workspaceに存在する情報を取得するための管理者向けSDKになっています。
また、[Directory API](https://developers.google.com/admin-sdk/directory)はGoogle Workspaceで利用しているドメインのユーザーや繋がっているデバイス、サードパーティアプリケーションを管理したり、取得したりすることができます。

## 何をしていたのか

今回、Google Workspace上でグループ化された情報（グループの人数、グループのメールアドレス、グループメンバーのメールアドレスなど）を取得する必要がありました。

<div class="note info" style="background: #e5f8e2; padding: 16px;">
  <span class="fa fa-fw fa-check-circle"></span><p>Google Workspaceのグループ化について</p>
  <p>Google Workspaceではアカウントのグルーピングが可能です。
これには<a href="https://cloud.google.com/?hl=ja">Google Cloud Platform（GCP）</a>上で、グループに対してIAMロールを付与することができるという恩恵があり、グループに所属しているメンバー全員に対してGCPリソースの権限管理ができます。（例えば、グループAにはGoogle Cloud Storageの管理者権限、グループBにはGoogle Cloud Storageの閲覧権限のみなど）</p>
</div>



## 何が起きたのか

### 開発環境

- WSL2
- Go1.18

### リクエスト間隔を考慮しなかったがために、500エラーを乱発

以下、サンプルコードになります。

```golang main.go
package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"

	"golang.org/x/oauth2/google"
	admin "google.golang.org/api/admin/directory/v1"
	"google.golang.org/api/option"
)

type Group struct {
	groupEmail       string
	groupName        string
	numberOfMembers  int64
}

type GroupMember struct {
	groupEmail  string
	memberEmail string
}

var googleWorkspaceScopesForGroupAndMember = []string{
	admin.AdminDirectoryGroupMemberReadonlyScope,
	admin.AdminDirectoryGroupReadonlyScope,
}

// グループのメールアドレス（本来はもっと多い）
// グループのメールアドレスもDirectory APIで取得できるが今回は省略
var groups = []Group{
	{
		groupEmail:       "hoge-developer@test.com",
		groupName:        "hoge developer team",
		numberOfMembers: 5,
	},
	{
		groupEmail:       "fuga-owner@test.com",
		groupName:        "fuga owner team",
		numberOfMembers: 10,
	},
}

func GetGroupMember() ([]GroupMember, error) {
	var groupMemberList []GroupMember
	// 取得を行うためのAdmin Serviceを取得
	srv, err := getService()
	if err != nil {
		return nil, fmt.Errorf("get admin service: %w", err)
	}
	for _, g := range groups {
		if g.numberOfMembers != 0 {
			// この中でDirectory APIを叩いている
			members, err := createGroupMemberList(srv, g.groupEmail)
			if err != nil {
				return nil, fmt.Errorf("create group member list: %w", err)
			}
			groupMemberList = append(groupMemberList, members...)
		}
	}

	return groupMemberList, nil
}

func createGroupMemberList(srv *admin.Service, email string) ([]GroupMember, error) {
	// APIを叩く
	rm, err := srv.Members.List(email).Do()
	if err != nil {
		return nil, fmt.Errorf("get member list: %w", err)
	}
	var memberList []GroupMember
	// リスト作成処理
	for _, m := range rm.Members {
		memberList = append(memberList, GroupMember{groupEmail: email, memberEmail: m.Email})
	}

	return memberList, nil
}

func getService() (*admin.Service, error) {
	serviceAccountJSON, err := ioutil.ReadFile("key/service-account-key.json")
	if err != nil {
		return nil, fmt.Errorf("read service account key: %w", err)
	}
	config, err := google.JWTConfigFromJSON(serviceAccountJSON, googleWorkspaceScopesForGroupAndMember...)
	if err != nil {
		return nil, fmt.Errorf("authorize service account key: %w", err)
	}
	config.Subject = "<管理者のメールアドレス>"
	config.Scopes = googleWorkspaceScopesForGroupAndMember
	ctx := context.Background()
	srv, err := admin.NewService(ctx, option.WithHTTPClient(config.Client(ctx)))
	if err != nil {
		return nil, fmt.Errorf("get new service: %w", err)
	}
	return srv, nil
}

func main() {
	groupMembers, err := GetGroupMember()
	if err != nil {
		fmt.Println(err)
        os.Exit(1)
	}

	for _, member := range groupMembers {
		// 何か処理する
		fmt.Println(member)
	}
}

```

タイトルの通りなのですが、上記実装では`createGroupMemberList(srv, g.groupEmail)`にて、リクエスト間隔について全く考慮しておらず、**間髪入れずにAPIへリクエストを送ったことによって500エラーを発生させてしまいました。**

それもそのはずで、[APIの仕様書](https://developers.google.com/admin-sdk/directory/v1/limits)を見ると1分あたりの呼び出し制限数が記載されています。

> Indicates that the user rate limit has been exceeded. The default value set in the Google Developers Console is 3,000 queries per 100 seconds per IP address.



### 解決策①：リクエスト間隔に余裕を持たせる

高速でリクエストを投げつけるとDoSアタックと勘違いされてブロックされる場合もあるのでちゃんと間隔をおいてリクエストを投げましょう。

以下のように、`Sleep`を入れてリクエスト間隔に余裕を持たせるのが一番簡単だと思います。

```golang main.go (GetGroupMemberでリクエスト時間を調節)
func GetGroupMember() ([]GroupMember, error) {
	var groupMemberList []GroupMember
	// 取得を行うためのAdmin Serviceを取得
	srv, err := getService()
	if err != nil {
		return nil, fmt.Errorf("get admin service: %w", err)
	}
	for _, g := range groups {
		if g.numberOfMembers != 0 {
			// Serviceとグループのメールアドレスを渡すことで、メンバー情報を取得
			// この中でAPIを叩いている
			members, err := createGroupMemberList(srv, g.groupEmail)
			if err != nil {
				return nil, fmt.Errorf("create group member list: %w", err)
			}
			groupMemberList = append(groupMemberList, members...)
            // Sleepを設定
			time.Sleep(time.Millisecond * 250)
		}
	}

	return groupMemberList, nil
}
```

### あれ？またリクエストがコケたぞ

リクエスト間隔を調整したにも関わらず、たまーに500エラーが返ってきます。

[StackOverflow](https://stackoverflow.com/questions/26188334/why-do-i-get-503-service-unavailable-errors-using-the-google-cloud-datastore-api)にも同じ現象が起きている人が居て、リクエスト間隔に余裕を持たせていたとしてもGoogle側の何かしらのトラブルによって500エラーでコケるようです。
> "You did everything right, but Google is having some trouble handling your request."
> （コードは正しく書けているけど、Google側でリクエストを処理しようとした際に何かしらのエラーが起きているみたいよ）

### 解決策②：指数バックオフを導入する

こういったケースはどのAPIでもあり得るので、 **[指数バックオフ](https://cloud.google.com/memorystore/docs/redis/exponential-backoff?hl=ja)** を導入しましょう。
「指数バックオフ？？数学＋横文字やめて！」となるかもしれませんが、簡単にまとめると「APIへリクエストしたにも関わらず失敗した際に、時間を少しおいてリクエストをもう一度送る」処理になります。

<div class="note info" style="background: #e5f8e2; padding: 16px;">
  <span class="fa fa-fw fa-check-circle"></span><p>指数バックオフに関しては本ブログ過去記事でも紹介しております。</p>
  <p><a href="/articles/20200121/">スロットリングとの付き合い方</a></p>
</div>



先ほどのリクエスト時間に余裕を持たせたうえで以下の変更を施します。

```golang main.go（createGroupMemberList内のAPI利用時に指数バックオフを導入）
func createGroupMemberList(srv *admin.Service, email string) ([]GroupMember, error) {
	maxRetries := 10
	var memberList []GroupMember

	for i := 0; i <= maxRetries; i++ {
		// APIを叩く
		rm, err := srv.Members.List(email).Do()
		if err != nil {
			var gerr *googleapi.Error
			if ok := errors.As(err, &gerr); ok {
                // エラーコードが500系列であれば、リトライ
				if gerr.Code >= 500 {
                    // 繰り返しの数を用いて待ち時間を生成
					waitTime := int(math.Pow(2, float64(i+1)) * float64(100))
					fmt.Println(waitTime)
                    // 待つ
					time.Sleep(time.Millisecond * time.Duration(waitTime))
				} else {
					return nil, fmt.Errorf("get member list: %w", err)
				}
			}
		} else {
			// リスト作成処理
			for _, m := range rm.Members {
				memberList = append(memberList, GroupMember{groupEmail: email, memberEmail: m.Email})
			}
			return memberList, nil
		}
	}
	return nil, fmt.Errorf("reaching max retries in createGroupMemberList")
}
```

リトライ数などはべた書きですが、関数として指数バックオフを定義して複数のAPIで共通で利用できるようにしておくと良さそうですね。

こうすることで、たまーにコケるエラーに対して頑健なリクエストをすることが可能になります。
（というか、[APIの仕様書](https://developers.google.com/admin-sdk/directory/v1/limits)にも指数バックオフ導入しといてねって書いてありますね…）

<div class="note info" style="background: #e5f8e2; padding: 16px;">
  <span class="fa fa-fw fa-check-circle"></span><p>GoogleAPIのエラーコード処理についても本ブログ過去記事で紹介しております。）</p>
  <p>こちらを参考にすれば、AWS向けにも導入可能になります。</p>
  <p><a href="/articles/20200523/">Go Tips連載6: Error wrappingされた各クラウドSDKの独自型エラーを扱う</a></p>
</div>



## まとめ

サードパーティのAPIを使う処理を書く場合は、

- リクエスト間隔は気をつけましょう（APIの仕様書をちゃんと読みましょう）。
- 指数バックオフを導入しておきましょう。

