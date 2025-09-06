---
title: "Auth0全ユーザー数取得コマンドをPowerShellのInvokeコマンドで行う"
date: 2022/11/30 00:00:00
postid: a
tag:
  - Auth0
  - curl
  - Windows
  - PowerShell
category:
  - 認証認可
thumbnail: /images/2022/20221130a/thumbnail.png
author: ダワージャルガルオチラル
lede: "Auth0全ユーザー数取得コマンドをPowerShellのInvokeコマンドで行います。"
---

# はじめに

Auth0のドキュメントに記載されているAPI操作は、curlコマンドで記載されています。

一方で、PowerShell標準の `Invoke-webRequest`や`Invoke-RestMethod` を用いて操作するといった日本語情報が少ないと思ったため、GETとPOSTリクエストの方法をまとめました。

ついでに、Auth0にいる全ユーザー数を取得する方法も共有します。

## Windowsのcurl事情

CLIから通信を行える便利コマンド `curl` は元々UNIX系のコマンドで、もともとWindowsにはインストールされていませんでした。

[こちらの記事](https://ascii.jp/elem/000/004/021/4021036/)によると、2018年のWindows 10 Ver.1803からCurl.exeがWindowsにデフォルトで使えるようになったそうです。そこからは、コマンドプロンプトなら、`curl`、PowerShellの場合`curl.exe`と打てばcurlが使えます。

ここで大事なことですが、2018年までcurlが使えなかった時代の名残なのか、 **PowerShellの場合、`curl` と打つとWindows用の`curl`であった`Invoke-WebRequest`が実行されてしまいます**（curl.exeだとcurlが動くが、curlにはinvokeコマンドのエイリアスが貼ってある）。普段Windows環境を触らない人にとって、高度な罠ですね。

```sh:powershellでcurlと入力した場合の挙動例
PS C:\Users\xxxx> curl

コマンド パイプライン位置 1 のコマンドレット Invoke-WebRequest
次のパラメーターに値を指定してください:
Uri:
```

そのため、筆者のようにPowerShellでは 一般にイメージする `curl` がないものだと認識し、`Invoke-webRequest` や `Invoke-RestMethod` を使う必要があると勘違いする人も少なくないと思います。今回の記事は一連のAuth0のドキュメントにあったcurlコマンドをInvoke-RestMethodに置換して実行する流れを、一晩かけて勢いでまとめた記事です。

すべてを書き終えた後、先輩社員に`curl.exe`すればcurl出来るよと言われ悲しくなりましたが、2023年10月、2027年1月までサポートを受けているWindows Server 2012、2016にはcurlがないと思われるので、そういった環境を扱う方には有用だと思います。ちなみに、Windows Server 2019には `curl.exe` がありましたので、素直にそちらで操作すると良いでしょう。

注意ですが、この記事に記載しているcurlコマンドをコマンドプロンプト上で動かす場合は、`\`のエスケープと、改行を消す必要があります（記事上では読みやすさのために改行を入れています）。

## 結論から話すと

以下のコマンドで動きます。

1. token取得（postリクエスト）

  ```PowerShell
  $client_id =  "xxx"
  $client_secret =  "xxx"
  $api =  "https://xxx/api/v2/"

  $body = @{
      client_id = "$client_id"
      client_secret = "$client_secret"
      audience = "$api"
      grant_type = "client_credentials"
  }
  Invoke-RestMethod -Method Post -Uri "https://xxx/oauth/token" -ContentType 'application/json' -Body ($body|ConvertTo-Json) -OutFile output.txt
  cat output.txt
  ```

2. output.txtからtokenをコピーして2のコマンドを打つ
3. 全ユーザー数取得コマンド(getリクエスト)

  ```PowerShell
  $token = "copyAndPasteHere"
  Invoke-RestMethod -Method Get -Uri "https://xxx/api/v2/users?per_page=0&include_totals=true" -Headers @{Authorization="Bearer $token"}
  ```

4. output.txt が不要になれば削除します

  ```PowerShell
  rm .\output.txt
  ```

## 操作の流れ

Auth0にいる総ユーザー数を取得を `Invoke-RestMethod` で記載する方法を共有します。

基本的には以下の2つのコマンドを`Invoke-RestMethod` で代替します。

1. APIを利用するtokenを取得する（POSTリクエスト）
2. 総ユーザー数取得APIを打つ（GETリクエスト）

### 1. APIを利用するtokenを取得する（POSTリクエスト）

ユーザー数取得に使う **Auth0 User Management API** を利用するためのtokenをまずは取得します。

User Management APIの利用権限のあるAPIのtoken取得コマンドが、**API設定のTestタブに**以下の画像のように書いてあるので参照します。tokenを取得する`cURLコマンド`と、すごく親切にバックエンドでよく用いる言語での取得方法まで記載しているので参考になります。

<img src="/images/2022/20221130a/0.png" alt="" width="1200" height="706" loading="lazy">

```bash:curlの実行例
curl --request POST \
  --url https://$domain/oauth/token \
  --header 'content-type: application/json' \
  --data '{"client_id":"alphanumericWithCapita1Letter","client_secret":"alphanumericWithCapita1LetterChottoNaga1","audience":"https://$domain/api/v2/","grant_type":"client_credentials"}'
```

#### 観察

まず元のCURLが何やってるか見ます。

* **POST**リクエスト
* content typeが**application/json**形式
* dataに**json文字列でclient認証情報を渡している**

**data**とありますが **HTTPリクエストではbody** とも呼びます。ここまでで、 **`Invoke-RestMethod`でやることは「JSONをPOSTするリクエストを作れば良い**」ということが分かります。

#### 公式ドキュメント見る

2022年11月時点ではpowershell-7.3が最新のようで、公式ドキュメントは[これ](https://learn.microsoft.com/ja-jp/powershell/module/microsoft.powershell.utility/invoke-restmethod?view=powershell-7.3)です。

```powershell
Invoke-RestMethod
      [-Method <WebRequestMethod>]
      [-FollowRelLink]
      [-MaximumFollowRelLink <Int32>]
      [-ResponseHeadersVariable <String>]
      [-StatusCodeVariable <String>]
      [-UseBasicParsing]
      [-Uri] <Uri>
      [-HttpVersion <Version>]
...
```

中々難しそうですが、コレを見ると、 **`Invoke-RestMethod`で各オプションを付ければ良い** ことが推測できます。

**CURLで指定したオプションは以下のようにマッピング出来そう**ですね。

* --requestは-Method
  * `-Method Post`
* --urlは-Uri
  * `-Uri https://$domain/oauth/token`
* --headerはHeadersとContentTypeが両方ありますね、ContentTypeだけ指定するので-ContentTypeのみ使います（Headersにcontent-typeと入れたらエラーになってました）
  * `-ContentType application/json`
* --dataは-body
  * 後述しますがいい感じに書かないとNGでした

これで、**bodyに当たる部分以外は良い感じにマッピング出来ました。**

続いてはbodyの記載方法を見ます。

<img src="/images/2022/20221130a/image.png" alt="" width="700" height="1083" loading="lazy">

ぱっと見は理解することが難しいですよね。オブジェクトで渡せば良いのかな？ とわかります。

[公式にPOSTの例が](https://learn.microsoft.com/ja-jp/powershell/module/microsoft.powershell.utility/invoke-restmethod?view=powershell-7.3#2-post)あるので参考にできます。

```powershell
$Cred = Get-Credential
$Url = "https://server.contoso.com:8089/services/search/jobs/export"
$Body = @{
    search = "search index=_internal | reverse | table index,host,source,sourcetype,_raw"
    output_mode = "csv"
    earliest_time = "-2d@d"
    latest_time = "-1d@d"
}
Invoke-RestMethod -Method 'Post' -Uri $url -Credential $Cred -Body $body -OutFile output.csv
```

どうやらシェル内でオブジェクトを作れば良さそうだとわかります。この例を参考に以下のように動かすと **エラーになります**。

```powershell エラーになった実行結果
$body = @{
    client_id = "alphanumericWithCapita1Letter"
	client_secret = "alphanumericWithCapita1LetterChottoNaga1"
	audience = "https://$domain/api/v2/"
	grant_type = "client_credentials"
}
Invoke-RestMethod -Method Post -Uri "https://$domain/oauth/token" -ContentType 'application/json' -Body $body
```

```powershell 実行結果
Invoke-RestMethod : invalid json
```

理由ですが、bodyにjson渡す渡す詐欺（コンテンツタイプでJSON渡すと宣言してるがJSONを渡していない状態）をしてるようです。よしなにやってくれると少し期待しましたが、ダメなようです。
（※もし、何かしらの手法があれば教えてください）

#### 対応方法

`auth0 invoke rest method post body json powershell` といったキーワードで探すと、[こちらの記事](https://www.thecodebuzz.com/invoke-restmethod-get-post-example-with-parameters/)に記載している通り、 `ConvertTo-Json`**[コマンド](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json?view=powershell-7.3)を用いbodyのオブジェクトをJSONに変換**すれば良いということがわかります（`-Body $body` ➔　`-Body ($body|ConvertTo-Json)`）。

※公式ドキュメントの関連記事の箇所にも `ConvertTo-Json` の記載がありますが、本文にも記載があると助かる人もいるかなと思い、公式ドキュメントにフィードバックは出しておきました。これが採用されると嬉しいなと思います。

結果として、以下のコマンドで動きます。

```powershell 成功例
$body = @{
    client_id = "alphanumericWithCapita1Letter"
	client_secret = "alphanumericWithCapita1LetterChottoNaga1"
	audience = "https://$domain/api/v2/"
	grant_type = "client_credentials"
}
Invoke-RestMethod -Method Post -Uri "https://$domain/oauth/token" -ContentType 'application/json' -Body ($body|ConvertTo-Json)
```

しかし、少し斜め上な結果になります。

<img src="/images/2022/20221130a/1.png" alt="1.png" width="1200" height="181" loading="lazy">

#### 出力結果最後まで出ない問題

PowerShellの仕様か、Invoke-RestMethodの仕様なのか、**出力が最後まで出てくれずトークンが分からない問題** が発生しました。

解決策として、公式の例を真似て**ファイルに出力して表示**することにします（愚直に`output.txt`に出して`cat output.txt`します）。シェルに詳しい人だったら良い感じにCLIの出力出来たかもしれないですが、詳しい方は教えてください。

そのため、以下のコマンドを付けます。

```PowerShell
... -OutFile output.txt
cat output.txt
```

### 総ユーザー数取得APIを打つ

最初に、Auth0全ユーザー数の取得コマンドを探すため、公式で用意されている[Auth0 User Management APIのドキュメント](https://auth0.com/docs/api/management/v2#!/Users/get_users)を見ます。

そうすると、`Users`　➔　`List or Search Users`の箇所のパラメータを眺めてると **小さく取得できる旨が書いて** あります。APIの概要にはページング番号を指定しながらのユーザー取得しかできないかのように書いてあるが、よくよくパラメータを見ると取得できることがわかります。

**API概要**:1ページに取得されるユーザー数を指定してユーザーリストを取得できるんやでと記載されています。

```txt
Retrieve details of users. It is possible to:

- Specify a search criteria for users
- Sort the users to be returned
- Select the fields to be returned
- Specify the number of users to retrieve per page and the page index
```

**パラメータ**:include_totalsをオンにすると**APIのレスポンスにトータルを含められる**と書いています。

```
include_totals
Return results inside an object that contains the total result count (true) or as a direct array of results (false, default).
```

しかし、この説明文だと、表示するページの合計なのか、全体なのか曖昧ですよね。

<img src="/images/2022/20221130a/image_2.png" alt="image.png" width="612" height="200" loading="lazy">

また、概要にある通りユーザーのリストが取得できてしまうが、合計人数だけ知りたいので**ユーザー情報をなくすオプションを探します**。※全パラメータは任意

|  パラメータ  |  説明  |
| ---- | ---- |
|  page  |  返却するページ番号（0インデックス）  |
|  per_page  |  1ページに含むユーザー数、空の場合全件返却  |
|  include_totals  |  レスポンスに合計人数を入れる  |
|  sort  |  ソート項目・順を決める  |
|  connection  |  コネクションフィルター（よく分からず）  |
|  fields  |  表示/非表示する項目を決める。空の場合全項目返却  |
|  include_fields  |  fieldsで指定した項目を表示させるか非表示にするか決める  |
|  q|  検索クエリ、形式はLucene query string syntaxらしい  |
|  search_engine|  サーチエンジンを決める、詳細はなかったため謎  |

`per_page`に着目すると`include_totals`だけ指定して`per_page`を**空にした場合全ユーザー情報が取得できてしまう**ようです。そしてユーザー取得フラグのようなものはなく、 **`per_page`をいじるしかなさそう** なので、一旦これを0にしてAPIを実行することにします。

token取得時と同様に、まず成功するcurlコマンドを共有します。401認証失敗エラーにならないようにtokenをつけます。

```sh
curl --request GET \
  --url "https://$domain/api/v2/users?per_page=0&include_totals=true" \
  --header 'authorization: Bearer $token'
```

### 観察・マッピング

クエリパラメータはGETなのでシンプルですね。token渡したGETリクエストするだけです。[公式ドキュメントのリンクはこちら](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-restmethod?view=powershell-7.3)です。

* GETリクエストをしている
  * `--request GET`が`--Method Get`になる
* URLにPOSTと違いクエリパラメータがある
  * `--url`が`-Uri`になる
  * `-Uri https://$domain/api/v2/users?per_page=0&include_totals=true`
  * URLにパラメータを入れることをクエリパラメータと言う
* token認証情報を渡している
  * `--header`が`-Headers`になる
  * `-Headers @{Authorization="Bearer $token"}`
  * cURLと違い`Invoke-RestMethod`特有のオブジェクト形式で書かないといけないので@{xxx}の形式となる
  * Authenticationオプションなどでも指定可能だったかもしれない（未検証）

以上からInvokeコマンドに書き換えます。

```PowerShell 実行例
Invoke-RestMethod -Method Get -Uri "https://$domain/api/v2/users?per_page=0&include_totals=true" -Headers @{Authorization="Bearer $token"}
```

```PowerShell 実行結果
start  : 0
limit  : 0
length : 0
users  : {}
total  : xxx
```

無事totalの数字が取得できました！

## 最後に

curlコマンドの代替として、PowerShell標準の `Invoke-webRequest`だったり`Invoke-RestMethod` を用いてAuth0のAPIを操作する例をまとめました。

IT初心者がIT課題をどう解決していけば良いのか何となく分かるような文章を書けたら良いなと最近考えているため、ハマった部分や調査の流れもなるべく残すように記載しました。ググっても情報が見つかりにくかったことを記事にして誰かを助ける備忘録にもなってたら良いなと思います。

この記事が良いなと思ったら感想下さると励みになります。Twitterなどでコメントいただけると幸いです。
