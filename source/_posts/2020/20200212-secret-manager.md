---
title: "GCP連載#5【もう鍵なくさない】GCPのSecret ManagerとBerglasで幸せになる"
date: 2020/02/12 09:14:36
postid: ""
tag:
  - GCP
  - Python
  - Go
  - 暗号
category:
  - Infrastructure
author: 市川諒
lede: "突然ですが、普段生活するうえでカギ🔑をなくした、忘れたことはないでしょうか。私はあります。なくしたことはないけど、うっかり置き忘れちゃうんですよね。

それがことインフラ構築の場面ではどうでしょうか。最近はとにかく多くのカギを管理しなくてはなりません。API Keyとか気づいたら何が何だか分からなくなり、苦渋の決断の末、再度払い出すことも多いのでは無いでしょうか。検証ならまぁ...ギリギリですが、本番ではやっちゃダメ絶対です。

ということで、そんな管理人の皆さんに朗報です。 遂にGCPにシークレット管理機能がやってきました！ CLIツールのBerglasとGUIで管理するSecret Managerを簡単にご紹介したいと思います。"
---

## 前書き

こんにちは、TIG所属インフラエンジニアの市川です。[GCP連載](/articles/20200202/)の5本目です。

突然ですが、普段生活するうえでカギ🔑をなくした、忘れたことはないでしょうか。私はあります。なくしたことはないけど、うっかり置き忘れちゃうんですよね。

それがことインフラ構築の場面ではどうでしょうか。最近はとにかく多くのカギを管理しなくてはなりません。API Keyとか気づいたら何が何だか分からなくなり、苦渋の決断の末、再度払い出すことも多いのでは無いでしょうか。検証ならまぁ...ギリギリですが、本番ではやっちゃダメ絶対です。

ということで、そんな管理人の皆さんに朗報です。 **遂にGCPにシークレット管理機能がやってきました！** CLIツールのBerglasとGUIで管理するSecret Managerを簡単にご紹介したいと思います。


## Berglasを使ってみる
サクっと利用するならCloud Shellだよね！ということで、以下Cloud Shellで作業をしています。

### Berglasとは？
[Githubページ](https://github.com/GoogleCloudPlatform/berglas)でこのツールについて確認します。

> Berglasは、Google Cloudでシークレットを保存および取得するためのコマンドラインツールおよびライブラリです。シークレットはCloud KMSで暗号化され、Cloud Storageに保存されます。 Secret Managerには相互運用可能なレイヤーもあります。
> * CLIとして：Berglasは、Google Cloudでのデータの暗号化、復号化、保存のプロセスを自動化します。
> * ライブラリとして：BerglasはさまざまなGoogle Cloudランタイムへのシークレットの組み込みを自動化します
>
> Berglasは、公式にサポートされているGoogle製品ではありません。

なるほど。GCPのリポジトリで開発されてるのに公式製品ではないのね。CLIとしてもライブラリとしても利用可能というところがイケてますね。

### Berglasのインストール（正確にはバイナリをダウンロード）

```shell
$ wget https://storage.googleapis.com/berglas/master/linux_amd64/berglas
$ chmod +x berglas
```

Dockerコンテナもあるようなので、好みに応じて使い分けください。


### 環境変数の準備と依存してるAPIの有効化

サクッと設定しましょう。

```bash
# 環境変数の設定
$ export PROJECT_ID=my-secret-project
$ export BUCKET_ID=my-secrets-bucket-123

# APIの有効化
$ gcloud services enable --project ${PROJECT_ID} \
  cloudkms.googleapis.com \
  storage-api.googleapis.com \
  storage-component.googleapis.com
```

### Berglas環境のBootstrap

次コマンドを実行すると、シークレットを保存するための新しいCloud Storageバケットと、データを暗号化するためのCloud KMSキーが自動的に作成されます。

```shell
$ berglas bootstrap --project $PROJECT_ID --bucket $BUCKET_ID
```

成功すると下記のような出力が確認できます！最近のCLIツールってこれでもかってくらい優しくできていますよね。

```
Successfully created berglas environment:

  Bucket: my-secrets-bucket-123
  KMS key: projects/my-secret-project/locations/global/keyRings/berglas/cryptoKeys/berglas-key

To create a secret:

  berglas create my-secrets-bucket-123/my-secret abcd1234 \
    --key projects/my-secret-project/locations/global/keyRings/berglas/cryptoKeys/berglas-key

To grant access to that secret:

  berglas grant my-secrets-bucket-123/my-secret \
    --member user:jane.doe@mycompany.com

For more help and examples, please run "berglas -h".
```

### シークレットの作成

サンプルケースとして、[httpbin](http://httpbin.org/)のBasic認証APIへリクエストを投げ `200 OK` するのCloud Functionsを作ります。

[httpbin](http://httpbin.org/)のBasic認証は次のようなレスポンスを返すモックサーバです。

```bash
# 認証情報なしだと401を返す
$ curl -i -G "https://httpbin.org/basic-auth/basic-user-name/basic-user-pass"
HTTP/2 401
date: Tue, 11 Feb 2020 10:43:43 GMT
content-length: 0
server: gunicorn/19.9.0
www-authenticate: Basic realm="Fake Realm"
access-control-allow-origin: *
access-control-allow-credentials: true

# 認証情報を付けて送るとちゃんと200を返す
$ curl -i -G -u basic-user-name "https://httpbin.org/basic-auth/basic-user-name/basic-user-pass"
Enter host password for user 'basic-user-name':
HTTP/2 200
date: Tue, 11 Feb 2020 10:45:16 GMT
content-type: application/json
content-length: 58
server: gunicorn/19.9.0
access-control-allow-origin: *
access-control-allow-credentials: true

{
  "authenticated": true,
  "user": "basic-user-name"
}
```

ということで、ユーザ名・パスワードを認証情報としてシークレットにしていきましょう！

```shell
$ berglas create ${BUCKET_ID}/api-user basic-user-name \
  --key projects/${PROJECT_ID}/locations/global/keyRings/berglas/cryptoKeys/berglas-key

$ berglas create ${BUCKET_ID}/api-pass basic-user-pass \
  --key projects/${PROJECT_ID}/locations/global/keyRings/berglas/cryptoKeys/berglas-key
```

### 手順

* Cloud Functionへ渡すサービスアカウントを作成

```shell
$ gcloud iam service-accounts create berglas-service-account \
  --project ${PROJECT_ID} \
  --display-name "berglas Cloud Functions Example"

$ export SA_EMAIL=berglas-service-account@${PROJECT_ID}.iam.gserviceaccount.com
```

#### Berglasから先ほど作ったサービスアカウントへシークレットへのアクセス権限を渡す

```shell
$ berglas grant ${BUCKET_ID}/api-user --member serviceAccount:${SA_EMAIL}
$ berglas grant ${BUCKET_ID}/api-pass --member serviceAccount:${SA_EMAIL}
```

#### Goのプログラム

golangでBASIC認証をする場合は[`SetBasicAuth`](https://golang.org/pkg/net/http/#Request.SetBasicAuth)を使います。

```go
package fn

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"log"
	"time"

	_ "github.com/GoogleCloudPlatform/berglas/pkg/auto"
)

func readBody(res *http.Response) string {
    data, err := ioutil.ReadAll(res.Body)
    if err != nil {
        log.Fatal(err)
    }
    /* dataはbyte型なので、string型に */
    return string(data)
}

func F(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "--- ENV VAR FROM BERGLAS ---\n")
	fmt.Fprintf(w, "API_USER: %s\n", os.Getenv("API_USER"))
	fmt.Fprintf(w, "API_PASS: %s\n", os.Getenv("API_PASS"))

    client := &http.Client{Timeout: time.Duration(3) * time.Second}

    req, _ := http.NewRequest("GET", "https://httpbin.org/basic-auth/basic-user-name/basic-user-pass", nil)
    req.SetBasicAuth(os.Getenv("API_USER"), os.Getenv("API_PASS"))
    res, err := client.Do(req)
    if err != nil {
        log.Fatal(err)
    }
    defer res.Body.Close()

	fmt.Fprintf(w, "--- HTTPBIN RESPONSE ---\n")
	fmt.Fprintf(w, readBody(res))
}
```


#### デプロイ

```shell
$ gcloud functions deploy berglas-example-go \
  --project ${PROJECT_ID} \
  --region us-central1 \
  --runtime go113 \
  --memory 1G \
  --max-instances 10 \
  --service-account ${SA_EMAIL} \
  --set-env-vars "API_USER=berglas://${BUCKET_ID}/api-user,API_PASS=berglas://${BUCKET_ID}/api-pass" \
  --entry-point F \
  --trigger-http \
  --allow-unauthenticated
```

#### テスト実行

ちゃんとBerglasで作成したシークレットが取得できましたね！
割と道のりが長いですが、GCPのサービスから簡単にアクセスできるのは気持ちが良いですね。
<img src="/images/20200212/photo_20200212_01.png" class="img-small-size" loading="lazy">


## Secret Managerを利用
折り返しです。もうしばしお付き合いください。

### Secret Manageとは？

> インフラストラクチャとアプリケーションレベルのシークレットを暗号化、保存、管理、監査します。
> https://cloud.google.com/solutions/secrets-management/

簡潔ですね。CloudKMSはGCPの管理するカギで暗号化、復号などをサポートしたサービスですが、もう一枚レイヤが上なサービスのようです。BerglasのGUI版ぐらいの気持ちでいると良いとお思います。

### Secret Manager画面
GUI画面へは`セキュリティ -> シークレット マネージャー`でアクセスできます。

作成画面はかなり簡潔で好感度が高いです。この手のサービスはやたらと入力項目が多くて初見殺しなイメージ（勝手）があったので。

<img src="/images/20200212/photo_20200212_02.png" class="img-small-size" style="border:solid 1px #000000" loading="lazy">

ラベルで整理ができるのも片づけが苦手な私にぴったりです。（今回はつけていないですが。。。）

有効化、無効化、破棄も非常に容易にできます。新しいバージョンを選択することで、シークレットの中身の更新と過去のシークレットを一括無効にできます。

<img src="/images/20200212/photo_20200212_03.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

<img src="/images/20200212/photo_20200212_04.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

### Berglasで登録したシークレットをSecret Managerに移す

何やらBerglasと連携もできるようなので、ちょこっと触ってみます。

- BerglasからSecret Managerのキーにアクセス

```shell
$ berglas access sm://${PROJECT_ID}/the-first-secret
sugoi-secret
```

- migrate

[Google Cloud Blog](https://cloud.google.com/blog/ja/products/identity-security/introducing-google-clouds-secret-manager)に「1回限りの」って書いてあるのが不穏ｗ

```shell
$ berglas migrate ${BUCKET_ID} --project ${PROJECT_ID}
Migrating api-user to projects/my-secret-project/secrets/api-user... done!
Migrating api-pass to projects/my-secret-project/secrets/api-pass... done!
```

二回目の実行

```shell
$ berglas migrate ${BUCKET_ID} --project ${PROJECT_ID}
Migrating api-user to projects/my-secret-project/secrets/api-user... done!
Migrating api-pass to projects/my-secret-project/secrets/api-pass... done!
```

通りました。

- 画面

イケてますね！当然ですが、最終更新日はUPLOADした時間になります。

<img src="/images/20200212/photo_20200212_05.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

### Cloud FunctionからSecret Managerを使う

流れとしては、非常に簡単です。

1. シークレットアクセサ役割をCloud Functionのサービスアカウントに割り当て
2. 利用

#### サービスアカウントへ役割を割り当て

```bash
gcloud beta secrets add-iam-policy-binding the-first-secret \
    --role roles/secretmanager.secretAccessor \
    --member serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com
```

#### サンプルプログラム

シークレットを吐き出すのみというシンプルなコードです。BerglasのクライアントライブラリはgooglecloudがメンテしているのがGoだけでしたが、今回はPythonライブラリがあったのでPythonで書きます。

```python main.py
import os
from google.cloud import secretmanager

def print_secret(request):
    client = secretmanager.SecretManagerServiceClient()
    secret_name = 'the-first-secret'
    project_id = os.getenv('GCP_PROJECT')
    resource_name = 'projects/{}/secrets/{}/versions/latest'.format(project_id, secret_name)
    res = client.access_secret_version(resource_name)
    secret_string = res.payload.data.decode('utf-8')
    return secret_string
```
ライブラリ`google-cloud-secret-manager`が必要なので、`requirements.txt`も作成しましょう。

```requirements.txt
google-cloud-secret-manager==0.1.1
```

#### デプロイ

```shell
$ gcloud functions deploy print_secret \
  --runtime python37 \
  --trigger-http \
  --allow-unauthenticated
```

<img src="/images/20200212/photo_20200212_06.png" loading="lazy">

...ニッコリ😄


## まとめ

使い方にちょいとクセというか、お作法があるので、習うより慣れろシリーズだと思います。
これでもう、カギの管理に困ることはなくなって、幸せな世界が待っていることでしょう。
ご興味のある方は、ぜひ触ってみてはいかがでしょうか。

[GCP連載](/articles/20200202/)の5本目でした。次は齋場さんの[Terraform Validatorを使って、GCPのセキュリティポリシーの自動チェックを行う](/articles/20200213/)です。
