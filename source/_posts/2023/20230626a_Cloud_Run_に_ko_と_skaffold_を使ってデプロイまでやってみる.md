---
title: "Cloud Run に ko と skaffold を使ってデプロイまでやってみる"
date: 2023/06/26 00:00:00
postid: a
tag:
  - GoogleCloud
  - CloudRun
  - Knative
  - skaffold
  - CNCF
category:
  - DevOps
thumbnail: /images/2023/20230626a/thumbnail.png
author: 川口翔大
lede: "CNCF の Knative を基盤として利用している Cloud Run と CNCF の各種ビルドツール ko, skaffold、Cloud Deploy を用いたうえで、アプリケーションのビルドからデプロイまでを行います。"
---
# はじめに

こんにちは！
TIG コアテクチームの川口です。本記事は、[CNCF連載](/articles/20230619a/) の5回目の記事になります。

本記事では、CNCF の Knative を基盤として利用している Cloud Run と CNCF の各種ビルドツール ko, skaffold、Cloud Deploy を用いたうえで、アプリケーションのビルドからデプロイまでを行います。

## 扱う技術要素

今回は、合計5つの技術要素を扱います。

全体感を掴むため、それぞれの技術とそれらの関連について図示します。

<img src="/images/2023/20230626a/image.png" alt="image.png" width="1166" height="788" loading="lazy">

### Cloud Run （Knative）

[**Cloud Run**](https://cloud.google.com/run) は、Google Cloud におけるコンテナベースのサーバーレスコンピューティングサービスとしてよく知られているものかと思います。こちらは、基盤として [**Knative**](https://www.cncf.io/projects/knative/) を採用しています。

この Knative は 2022年の3月に CNCF の Incupating プロジェクトとして承認されており、Kubernetes 上でサーバーレスアプリケーションを構築するためのオープンソースプロジェクトとなっています。詳細に関しては、 [ドキュメント](https://knative.dev/docs/concepts/#knative-serving) を参照ください。

今回は、この Cloud Run に Go 製アプリケーションをデプロイしていこうと思います。

### ko

[ko](https://www.cncf.io/projects/ko/) は、Go のコンテナイメージを Dockerfile 無しに簡単にビルドできるツールです。また、2022年の12月に CNCF の Sandbox プロジェクトとして承認されています。

「Dockerfile 無しに」という言葉だと、2018年10月に Incubating プロジェクトとして承認された [Buildpacks](https://www.cncf.io/projects/buildpacks/) が想起されますが、 [こちらの記事](https://cloud.google.com/blog/ja/products/containers-kubernetes/ship-your-go-applications-faster-cloud-run-ko) でそちらとの比較が行われています。Buildpacks では、Go 以外にも Java・Node・Python 等といった言語がビルドができるという差異がありますが、今回は Go を扱うということもあり ko を利用したいと思います。

### Skaffold

[Skaffold](https://skaffold.dev/docs/) は、コンテナベース（特に Kubernetes アプリケーション）の継続的な開発を容易にするコマンドラインツールです。ビルド・デプロイ・テストといった CI 上で扱うような各種機能がいくつか実装されていたり、本記事では扱いませんがローカル開発の際にも、[開発時に便利となるローカルでのアプリケーション実行](https://skaffold.dev/docs/workflows/dev/) も行えます。

**また後述のデプロイ時に利用する Cloud Deploy では、Skaffold を扱うことが必須となっています。**

先述のサービスとの連携といった点では以下のとおりよさそうな感じです。

- Cloud Run とは、 [yaml で宣言的に記述する](https://cloud.google.com/run/docs/reference/yaml/v1) 機能を用いることで連携できます。
  - ref: https://skaffold.dev/docs/deployers/cloudrun/
- ビルド時には先述の ko とも連携を行えます。
  - ref: https://skaffold.dev/docs/builders/builder-types/ko/
- （Cloud Run を扱う上では、生 yaml でなくても必要に応じて、[helm](https://helm.sh/) や、[kustomize](https://kustomize.io/) 等も扱えます！）
  - ref: https://skaffold.dev/docs/renderers/helm/
  - ref: https://skaffold.dev/docs/renderers/kustomize/

その他の詳細に関しては、[ドキュメント](https://skaffold.dev/docs/) を参照ください。

### Artifact Registry

[Artifact Registry](https://cloud.google.com/artifact-registry/docs/overview) は、Google Cloud におけるマネージドのアーティファクト管理サービスです。

Docker コンテナイメージのほか、Java・Node・Python といった各種言語のパッケージも保存・配信できます。

今回は、先述の ko・Skaffold を用い、この Artifact Registry にて Docker コンテナイメージを管理してもらうことにします。

### Cloud Deploy

[Cloud Deploy](https://cloud.google.com/deploy/docs/overview) は、Google Cloud 上で CD を行うためのサービスです。

先述の通り Cloud Deploy では Skaffold を扱うことは必須としており、 [ドキュメント](https://cloud.google.com/deploy/docs/using-skaffold) でも、Skaffold を併用する方法について言及しています。現状は、GKE・Cloud Run・Anthos にてデプロイを行えるようで、また最近 preview ではありますが、 [カナリアデプロイ](https://cloud.google.com/deploy/docs/deployment-strategies/canary) も行えるようになっています。

Cloud Deploy を用いたデプロイの流れとしては、ざっくりと以下のようなものになっています（太字部分は、Cloud Deploy 内で扱っている用語です）。

1. 事前に **デリバリーパイプライン** （デプロイ先となる **ターゲット** や、デプロイの手順についてまとめたもの）。を yaml を記載して作成する
2. アプリケーションを Artifact Registry 等に保存する
3. いくつか（1つでも可）。の保存したアプリケーションを **リリース** という単位にまとめる
4. **リリース** を **ターゲット** にロールアウトする
5. 問題が発生したら、任意の **リリース** にロールバックする
6. 問題が発生しなかったら、次の **ターゲット** に **プロモーション** をする

この辺の用語は、なかなかとっかかりしづらいところがありますが [こちら](https://cloud.google.com/deploy/docs/terminology) にまとまって説明がされているので、困ったら参照するとよさそうです。

## 手順

それでは次の手順でさっそく始めていきます。

1. Go アプリケーションの作成。
2. コンテナイメージのプッシュ。
3. Cloud Deploy でデプロイ。

# Go アプリケーションの作成

Hello World を返すような API を v1・v2 として作成していきます。

この記事での成果物は、 https://github.com/kawaguchisan-sk/cloud-run-sample にて公開しています。本記事で行う各種コマンドも、Makefile 上に記載しているので参考ください。

## Prerequisite

```bash
# Go
$ go version
go version go1.20.5 darwin/arm64
```

## ソースコード

以下のように 8080 ポートをリッスンして、"/" にアクセスされたら、"Hello World v1!" を返すものとします。

今回カナリアデプロイを後程ためすので、2つの version のアプリとして `app/v1`・`app/v2` の2つ分作っておきましょう。

```go  main.go
package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", HelloServer)
	http.ListenAndServe(":8080", nil)
}

func HelloServer(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello World v1!（or v2）")
}
```

# コンテナイメージのプッシュ

それでは先の手順で作成した Go アプリケーションを ko と Skaffold を用いてコンテナイメージにして Artifact Registry にプッシュします。

## Prerequisite

```bash
# （ko）
※ Skaffold の機能を用いるため、特別 ko をインストールする必要はありません。

# Skaffold
$ skaffold version
v2.3.1

# gcloud
$ gcloud version
Google Cloud SDK 430.0.0
```

またあらかじめ Artifact Registry を作成する必要があります。今回は、gcloud コマンドでさくっと作ってしまいましょう。

```bash
$ gcloud artifacts repositories create hello-world \
    --location=asia-northeast1 \
    --repository-format=docker
```

## Skaffold を用いたコンテナイメージのプッシュ

まずは以下のようにして、`skaffold_v1.yaml`・`skaffold_v2.yaml` を作成します。
（本記事では触れませんが、[Profiles 機能](https://skaffold.dev/docs/environment/profiles/) を使うとより dry に書くこともできます）。

```yaml  skaffold_v1 (or v2).yaml
apiVersion: skaffold/v3alpha1
kind: Config
# ビルド時の設定
build:
  # イメージビルド時のタギングポリシー
  # ref: https://skaffold.dev/docs/taggers/
  tagPolicy:
    customTemplate:
      template: "v1（or v2）"
  # ko を使う上での成果物の設定
  # ref: https://skaffold.dev/docs/builders/builder-types/ko/
  artifacts:
    - image: app
      context: ../app/v1（or v2）
      ko:
        fromImage: gcr.io/distroless/base:debug-nonroot
```

`build` にて各種 build の設定を行なっています。

`build.tagPolicy` では、イメージビルド時のタギングポリシーの設定を行なっており、`build.artifacts` では、イメージをどのようにして作成するかの設定を行なっています。

今回は、ko を扱うのでそちらの設定に則っています（各種詳細は、コメントのリンクを参照してください）。

こちらのファイルが用意できたら、以下のコマンドを実行すると Artifact Registry にイメージのプッシュが行えるはずです。

```bash
$ skaffold build \
    --filename "skaffold_v1.yaml" \
    --default-repo "Artifact Registry の場所 ex）asia-northeast1-docker.pkg.dev/PROJECT_NAME/hello-world"
```

プッシュされた内容を見ると、タグやディレクトリ構成が先ほど設定した内容に沿っていることがわかると思います。

<img src="/images/2023/20230626a/Screenshot_2023-05-03_at_19.59.11.png" alt="" width="1200" height="179" loading="lazy">

# Cloud Deploy でデプロイ

コンテナイメージのプッシュまで、ko と Skaffold を用いて行うことができました。最後に、Cloud Deploy を使って Cloud Run にデプロイを行いましょう。

## Skaffold に Cloud Run の設定を追記

はじめに先ほど作成した `skaffold_v1.yaml`・`skaffold_v2.yaml` に以下のように Cloud Run の設定を追記します。

```yaml  skaffold_v1 (or v2).yaml
apiVersion: skaffold/v3alpha1
kind: Config
build:
  tagPolicy:
    customTemplate:
      template: "v1"
  artifacts:
    - image: app
      context: ../app/v1
      ko:
        fromImage: gcr.io/distroless/base:debug-nonroot
# マニフェストの設定
# ref: https://skaffold.dev/docs/renderers/rawyaml/
manifests:
  rawYaml:
    - service.yaml
# デプロイの設定
# ref: https://skaffold.dev/docs/deployers/cloudrun/
deploy:
  cloudrun:
    projectid: PROJECT_ID
    region: asia-northeast1
```

先ほど作成したものに対して、 `manifests` と `deploy` が追加されています。それぞれ、Cloud Run で使用するマニフェストの設定とデプロイ先の設定が行われています。

ただまだ、Cloud Run のマニフェストは作成していませんでしたね。最小限の構成になりますが、以下のような `service.yaml` を作成しましょう。`spec.template.spec.containers.image` は、`skaffold_v1.yaml` で指定した `build.artifacts.image` の内容と一致する必要があります。

```yaml  service.yaml
# ref: https://cloud.google.com/run/docs/reference/yaml/v1
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-world
spec:
  template:
    spec:
      containers:
        - image: app # skaffold が適切な値に変えてくれます
```

ここまで作成できたらまた改めてビルドを行いましょう。
今度は、成果物をローカルにアウトプットもしておきます（後ほど Cloud Deploy にてこの成果物を用いてデプロイを行います）。

```bash
$ skaffold build \
    --filename "skaffold_v1.yaml" \
    --default-repo "Artifact Registry の場所 ex）asia-northeast1-docker.pkg.dev/PROJECT_ID/hello-world"
    --file-output "build_v1.json"
```

以下のような成果物ができているはずです。

```json  build_v1.json
{
  "builds": [
    {
      "imageName": "app",
      "tag": "asia-northeast1-docker.pkg.dev/PROJECT_ID/hello-world/app:v1@sha256:XXX"
    }
  ]
}
```

## デリバリーパイプラインの作成

まずは、以下のような `deploy.yaml` を作成します。

```yaml  deploy.yaml
# https://cloud.google.com/deploy/docs/config-files
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: hello-world
serialPipeline:
  stages:
    - targetId: hello-world
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: hello-world
run:
  location: projects/PROJECT_ID/locations/asia-northeast1
```

こちらに出てくる DeliveryPipeline や、Target といった用語は先ほど説明したものと同じです。

`kind: DeliveryPipeline` は、名前の通りデリバリーを行ううえでのパイプラインの設定を行うもので、`kind: Target` は、デプロイ先の設定を行うものになります。

上記の設定は、最小限のものになるので必要に応じて [こちら](https://cloud.google.com/deploy/docs/config-files) を参考にしてパイプラインの設定を追加するとよさそうです（カナリアデプロイをできるようにする設定はこの後行います）。

ファイルを作成できたら、以下のコマンドを実行して Cloud Deploy に反映します。

```bash
$ gcloud deploy apply \
  --file=deploy.yaml \
  --project=PROJECT_ID \
  --region=asia-northeast1
```

コンソールからも反映されていることが確認できると思います。

<img src="/images/2023/20230626a/image_2.png" alt="image.png" width="1200" height="642" loading="lazy">

## Cloud Deploy によるデプロイ

ここまでで、 `build_v1.json` という成果物をローカルにアウトプットできていて、またデリバリーパイプラインの設定も行えているはずです。

次にこれらを用いて Cloud Deploy 上でリリースを作成してロールアウトを行います。

以下のような [gcloud deploy releases コマンド](https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create) を実行すればよいです。

**※ ここでは、v1 用のリリースだけ作成します。後ほど v2 用のリリースを作成します。**

```bash
$ gcloud deploy releases create v1 \
  --delivery-pipeline "hello-world" \
  --region "asia-northeast1" \
  --build-artifacts "build_v1.json" \
  --skaffold-file "skaffold_v1.yaml" \
  --source .
```

上記のコマンドが成功すれば、Cloud Run 上でもサービスが展開されていることが確認できるはずです。

<img src="/images/2023/20230626a/image_3.png" alt="image.png" width="1200" height="153" loading="lazy">

## Cloud Deploy によるカナリアデプロイ

ここまでくれば、一通りの機能に触れることができました。

最後に、先日追加された [Cloud Deploy によるカナリアデプロイ](https://cloud.google.com/deploy/docs/deployment-strategies/canary) について触れて締めくくります。

先ほど作成した `deploy.yaml` を以下のように修正しましょう。

```yaml  deploy.yaml
# https://cloud.google.com/deploy/docs/config-files
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: hello-world
serialPipeline:
  stages:
    - targetId: hello-world
      profiles: []
      strategy:
        canary:
          runtimeConfig:
            cloudRun:
              automaticTrafficControl: true
          canaryDeployment:
            percentages: [ 10 ]
            verify: false
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: hello-world
run:
  location: projects/PROJECT_ID/locations/asia-northeast1
```

`serialPipeline.stages` にいくつかの項目が追記されていることがわかると思います。

特にこのカナリアデプロイを行ううえで重要な項目が `serialPipeline.stages.strategy.canary.canaryDeployment.percentages` です。

こちらでどのようにトラフィックを流していくのかを明示しています。今回の設定では、「10％ 新しい ver. に流す」という設定にしています（複数値設定できるので、より段階的なロールアウトも可能です）。

それでは再度修正したものを Cloud Deploy に反映しましょう。

```bash
$ gcloud deploy apply \
  --file=deploy.yaml \
  --project=PROJECT_ID \
  --region=asia-northeast1
```

コンソールからも変更が反映されていることを確認できるはずです。

<img src="/images/2023/20230626a/image_4.png" alt="" width="1200" height="643" loading="lazy">

次に v2 アプリケーションをデプロイしてみましょう。
先ほどと同じ（v1 が v2 になっているだけ）コマンドで以下のとおりです。

```bash
$ gcloud deploy releases create v2 \
  --delivery-pipeline "hello-world" \
  --region "asia-northeast1" \
  --build-artifacts "build_v2.json" \
  --skaffold-file "skaffold_v2.yaml" \
  --source .
```

デプロイが完了すると、カナリアデプロイしてくれていそうな雰囲気がコンソールから見てとれます。

<img src="/images/2023/20230626a/image_5.png" alt="" width="1200" height="274" loading="lazy">

この時点で、Cloud Run にて生成される URL に何度かアクセスしてみるとレスポンスがたまに v2 用のものに変わっていることが確認できるはずです。

ここで、「ロールアウトを進める」ボタンを押下するとデプロイが進み完了します。

<img src="/images/2023/20230626a/image_6.png" alt="" width="1200" height="272" loading="lazy">

# おわりに

本記事では、Cloud Run や CNCF の各種ビルドツール、Cloud Deploy を用いてビルドからカナリアデプロイまでやってみました。

まだまだこれらのツールは必要最小限の部分しか取り扱えていなかったですが、さまざまなチュートリアルも豊富にあるのでぜひ遊んでみてください！

明日は、岸下さんが ArgoCD について記載予定です！
