---
title: "CloudBuildを使ってプライベートエンドポイントのみのGKEへデプロイ"
date: 2023/02/10 00:00:00
postid: a
tag:
  - Kubernetes
  - GKE
  - GCP
  - GoogleCloud
category:
  - Infrastructure
thumbnail: /images/20230210a/thumbnail.png
author: 渡邉光
lede: "こんにちは！筋肉エンジニアの渡邉です。最近はGCP/GKEについて勉強しています。今回はGitHubへのPushをトリガーにCloudBuildを起動し、プライベートエンドポイントのみのGKEへデプロイする基盤を作りましたので、共有したいと思います。GCPリソースはTerraformで作成しています。"
---
# 初めに
こんにちは！筋肉エンジニアの渡邉です。最近はGCP/GKEについて勉強しています。

今回はGitHubへのPushをトリガーにCloudBuildを起動し、プライベートエンドポイントのみのGKE(Google Kubernetes Engine)へデプロイする基盤を作りましたので、共有したいと思います。

GCPリソースはTerraformで作成しています。CloudBuildとGitHubの連携は一部画面による紐づけが必要になるので、手動でCloudBuildを作成した後、terraform importでコード管理するようにしました。


# デプロイフロー

<img src="/images/20230210a/Deploy_Architecture.drawio.png" alt="Deploy_Architecture.drawio.png" width="901" height="264" loading="lazy">

デプロイフローは以下の流れになります。
1. ローカルでアプリケーションコードの修正
2. ローカルで修正をCommit、GitHubへPush
3. GitHubへPushされたことをトリガーにCloudBuildが起動
4. CloudBuildでコンテナをビルド、Artifact RegistoryにコンテナイメージをPush
5. CloudBuildからGKEへコンテナイメージをデプロイ

# アプリケーションコード
Goで記述されたアプリケーションを書きました。
リクエストを投げると、Hello world!とVersionとHostnameをレスポンスします。

こちらはディレクトリ構成です。

```sh
├── src
    ├── Dockerfile
    └── cmd
        └── main.go
```

```go main.go
package main

import (
        "fmt"
        "log"
        "net/http"
        "os"
)

func main() {

        mux := http.NewServeMux()
        mux.HandleFunc("/", hello)

        port := os.Getenv("PORT")
        if port == "" {
                port = "8080"
        }

        log.Printf("Server listening on port %s", port)
        log.Fatal(http.ListenAndServe(":"+port, mux))
}

func hello(w http.ResponseWriter, r *http.Request) {
        log.Printf("Serving request: %s", r.URL.Path)
        host, _ := os.Hostname()
        fmt.Fprintf(w, "Hello, world!\n")
        fmt.Fprintf(w, "Version: 1.0.0\n")
        fmt.Fprintf(w, "Hostname: %s\n", host)
}
```

GKEにデプロイするアプリケーションはコンテナのため、Dockerfileを作成します。
Dockerfileは以下の通りです。
```Dockerfile
# goバージョン
FROM golang:1.19.1-alpine
# アップデートとgitのインストール
RUN apk add --update &&  apk add git
# appディレクトリの作成
RUN mkdir /go/src/app
# ワーキングディレクトリの設定
WORKDIR /go/src/app
# ホストのファイルをコンテナの作業ディレクトリに移動
ADD ./cmd/main.go /go/src/app/
# コンパイル＋実行
CMD ["go", "run", "main.go" ]
# 公開ポートを設定する
EXPOSE 8080
```

# GKEのアーキテクチャ

<img src="/images/20230210a/architecture.drawio.png" alt="architecture.drawio.png" width="1151" height="429" loading="lazy">

## クラスタ構成
- **クラスタバージョン**：1.23.13-gke.900（リリースチャンネルをSTABLEで構築した時のデフォルトバージョン）
- **リージョンクラスタ**：本番環境で利用することを考慮して可用性を高くしたいため
- **VPCネイティブクラスタ**：GKE バージョン 1.21.0-gke.1500 以降のすべてのクラスタはVPCネイティブクラスタがデフォルトのネットワークモードのため
- **Standardクラスタ**：インフラチームがGKEクラスタを管理することを想定
- **限定公開クラスタ**：Control Planeへのアクセスがプライベートエンドポイントのみの「パブリックエンドポイントアクセスが無効」で構成しています。ノードには内部IPアドレスしか付与されず、Control Planeへのアクセスは内部ネットワークからのみしかアクセスできません。
※この構成は制限が厳しいのでセキュリティ要件的に問題なければ、「パブリック エンドポイント アクセスが有効、承認済みネットワークが有効」で構築してもよいです。

## Manifest
GoのアプリケーションコンテナをGKE上にPodとして建てたいので、deploymentを作成します。containers.imageにはArtifact Registryに保存されているイメージ名を指定します。containerPortにはDockerfileのEXPOSEで指定した8080を指定します。

```yaml deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-go-deployment
spec:
  selector:
    matchLabels:
      app: hello-go
  replicas: 3
  template:
    metadata:
      labels:
        app: hello-go
    spec:
      containers:
      - name: hello-go
        image: asia-northeast1-docker.pkg.dev/xxxxxxxxxx/docker-repository/hello-go:latest
        ports:
        - containerPort: 8080
```

deploymentを作成するだけでは、podに対して外部からアクセスすることができないのでServiceとIngressを作成します。
Ingressを使用するためには、ServiceのtypeをNodePortにしなければならないのでNodePortで構築します。ports.portに80を指定し、ports.targetPortにdeploymentのports.containerPortで指定した8080を指定します。

80番ポートでServiceにアクセスされ、8080番ポートのdeploymentの各Podにルーティングされる仕組みです。

```yaml service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-go-service
spec:
  type: NodePort
  selector:
    app: hello-go
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
```

Ingressのmanifestファイルのannotationsには以下を記します。

- kubernetes.io/ingress.class: "gce"：外部ロードバランサの作成します
- kubernetes.io/ingress.allow-http: "false"：クライアントとHTTP(S)ロードバランサ間のすべての通信をHTTPSに強制します
- kubernetes.io/ingress.global-static-ip-name： "loadbalancer-external-ip-address"：事前にterraformで構築していた静的外部IPアドレスを外部ロードバランサに設定します
- networking.gke.io/managed-certificates: "hello-go"：クライアントとからのHTTPS通信を実現するためGoogleマネージド証明書をIngressに適用します（後述のmanaged-certificate.yamlで作成）

Ingressのbackendには、先ほど作成したServiceを指定し、port.numberはserviceのポート80番を指定して紐づけます。

```yaml ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-go-ingress
  annotations:
    # 外部ロードバランサの作成
    kubernetes.io/ingress.class: "gce"
    # クライアントとHTTP(S)ロードバランサ間のすべての通信をHTTPSに強制
    kubernetes.io/ingress.allow-http: "false"
    # 事前に用意していた静的外部IPアドレスを設定する
    kubernetes.io/ingress.global-static-ip-name: "loadbalancer-external-ip-address"
    # Googleマネージド証明書をIngressに適用する
    networking.gke.io/managed-certificates: "hello-go"
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hello-go-service
            port:
              number: 80
```
Ingressに適用させるGoogleマネージド証明書を作成します。
ドメインはterraformで作成済みの静的外部IPアドレスにフリーなワイルドカードDNSのnip.ioを設定しました。

```yaml managed-certificate.yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: hello-go
spec:
  domains:
    - 34.xxx.xxx.xxx.nip.io
```

manifestファイルの適用自体は踏み台サーバから実行しています。

ここまで構築するとドメインに対してアクセスすると以下のキャプチャのように

- Hello, world!
- Version:1.0.0
- Hostname: hello-go-deployment-c58cf7b66-fwgbb

がブラウザ上に返却されます。

<img src="/images/20230210a/2-Application-Access①.png" alt="2-Application-Access①.png" width="344" height="119" loading="lazy">


# CloudBuildの作成

現状の状態だと

1. アプリケーションコードの変更を行う（ローカル）。
2. GitHubへ変更をPushする（ローカル）。
3. docker buildコマンドの実行を行いイメージを作成する（ローカル）
4. docker pushコマンドを実行し、Artifact RegistoryへイメージをPushする（ローカル）
5. 踏み台サーバにログインして`kubectl apply -f deployment.yaml` コマンドを実行してデプロイ

となるため、デプロイまでに非常に手間がかかります。
GitHubへのPushをトリガーに上記の手順の3~5を自動化したいため、CloudBuildを利用します。

## CloudBuildトリガーの作成

### GitHubとの連携
CloudBuildとGitHub（プライベートリポジトリ）を連携するためには画面での認証手続きが生じるため、一旦Terraformでは作成せず手動で設定を行いました。
手動で設定が完了した後、terraform importコマンドを利用してコード管理するようにします。

Google Cloudコンソール画面から「Cloud Build」をクリック→「トリガー」をクリック→「トリガーを作成」をクリックします。

<img src="/images/20230210a/1-CloudBuild①.png" alt="1-CloudBuild①.png" width="975" height="882" loading="lazy">
トリガーの作成画面で

- 名前：sample-build
- リージョン：asia-northeast1
- イベント：ブランチにpushする

を入力し、ソース：「新しいリポジトリに接続」をクリックします。

<img src="/images/20230210a/1-CloudBuild②.png" alt="1-CloudBuild②.png" width="979" height="884" loading="lazy">

リポジトリに接続画面で
- ソースを選択：GitHub (Cloud Build GitHubアプリ)
を選択し、「続行」をクリックする。

<img src="/images/20230210a/1-CloudBuild③.png" alt="1-CloudBuild③.png" width="579" height="938" loading="lazy">

Sign in to GitHub to continue to Google Cloud Buildの画面で

- Username or email address：自身のGitHubアカウントのユーザ名
- Password：自身のGitHubアカウントのパスワード

を入力し、「Sign in」をクリックします。

<img src="/images/20230210a/1-CloudBuild④.png" alt="1-CloudBuild④.png" width="322" height="581" loading="lazy">

Google Cloud Build by Google Cloud Build would like permission toの画面の「Authorize Google Cloud Build」をクリックします。

<img src="/images/20230210a/1-CloudBuild⑤.png" alt="1-CloudBuild⑤.png" width="1000" height="718" loading="lazy">

リポジトリを選択画面の「GOOGLE CLOUD BUILDのインストール」をクリックします。

<img src="/images/20230210a/1-CloudBuild⑥.png" alt="1-CloudBuild⑥.png" width="572" height="903" loading="lazy">

Install Google Cloud Buildの画面から
- Only Select repositories：Cloud Buildと連携したいリポジトリ
を入力し、「Install」をクリックします。

<img src="/images/20230210a/1-CloudBuild⑦.png" alt="1-CloudBuild⑦.png" width="569" height="807" loading="lazy">

- GitHubアカウント：自身のGitHubアカウント
- リポジトリ：Cloud Buildと連携したいリポジトリ
を入力し、チェックボックスにチェックを入れて「接続」をクリックします。

<img src="/images/20230210a/1-CloudBuild⑧.png" alt="1-CloudBuild⑧.png" width="575" height="901" loading="lazy">


ここまでの設定で、Cloud Buildと自身のGitHubリポジトリを連携させることができます。

<img src="/images/20230210a/1-CloudBuild⑨.png" alt="1-CloudBuild⑨.png" width="975" height="882" loading="lazy">

### terraform importの実行

作成したトリガーの「実行」の隣をクリックし、リソースパスをコピーをクリックします。（terraform importで利用します。）
<img src="/images/20230210a/1-CloudBuild⑩.png" alt="1-CloudBuild⑩.png" width="1011" height="883" loading="lazy">

terraform実行環境にて、terraform importを実行し、手動で作成したCloud Buildトリガーをコード管理できるように設定します。

```bash
xxxxxxxx@xxxxxxxx:~/cloud-provider/gcp/gke$ terraform import google_cloudbuild_trigger.trigger projects/xxxxxxxxx/locations/asia-northeast1/triggers/f51e2b94-2be8-4ec6-a983-72ded1f69bb7
google_cloudbuild_trigger.trigger: Importing from ID "projects/xxxxxxxxx/locations/asia-northeast1/triggers/f51e2b94-2be8-4ec6-a983-72ded1f69bb7"...
google_cloudbuild_trigger.trigger: Import prepared!
  Prepared google_cloudbuild_trigger for import
google_cloudbuild_trigger.trigger: Refreshing state... [id=projects/xxxxxxxxx/locations/asia-northeast1/triggers/f51e2b94-2be8-4ec6-a983-72ded1f69bb7]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

terraform import後
- サービスアカウントの設定
- ビルド実行時に必要なビルド構成ファイルのパスを設定
- ビルド構成ファイルに必要な環境変数

を指定してterraform applyをして適用します。


# CloudBuildからGKE Control Planeへの接続

今回、Control Planeへのアクセスにプライベートエンドポイントのみの「パブリックエンドポイントアクセスが無効」でGKEを構成しているため、CloudBuildからGKE Control Planeへの接続も内部ネットワーク経由でプライベートエンドポイントに対して行わなければいけません。
（GKEをパブリック エンドポイント アクセスが有効、承認済みネットワークが有効で構成している場合は、CloudBuildからGKE Control Planeへのアクセスもパブリックエンドポイントに対して行う必要がありますが、CloudBuildの外部IPはユーザで指定できずビルド環境ごとに変わってしまい、承認済みネットワークが定義できないので、少しトリッキーなやり方をしないとアクセスができないです。）
CloudBuildからGKE Control Planeのプライベートエンドポイント接続を内部ネットワークを経由するようにしたいので、CloudBuildをPrivate Poolを利用するように作成します。
Cloud Build プライベート プールを使用した限定公開 Google Kubernetes Engine クラスタへのアクセスはGoogle Cloudの[アーキテクチャセンター](https://cloud.google.com/architecture/accessing-private-gke-clusters-with-cloud-build-private-pools)にも記載されているので、詳しくはこちらの記事をご覧ください。


## ネットワークアーキテクチャ
CloudBuildからGKEへデプロイするためのネットワークアーキテクチャの完成図になります。
<img src="/images/20230210a/New_architecture.drawio.png" alt="New_architecture.drawio.png" width="1200" height="355" loading="lazy">

それぞれ詳細を見ていきましょう。

### CloudBuild Private Poolとsample-build-vpc間

<img src="/images/20230210a/between_sample_vpc_private_pool.drawio.png" alt="between_sample_vpc_private_pool.drawio.png" width="1200" height="355" loading="lazy">

Private Poolは、サービスプロデューサーネットワークと呼ばれる Google 所有の Virtual Private Cloud ネットワークでホストされます。サービスプロデューサーネットワークだけでは、GKE Control Planeへアクセスするルートがないので、Private Poolとプライベート接続する用のVPC(sample-build-vpc)を別途作成します。

Private Poolとプライベート接続する用のVPCには、**名前付きIP範囲**を指定することができるので、**192.168.3.0/24**を設定します。private poolが、このIPアドレス範囲からGKEのControl Planeにトラフィックを送信できるので、こちらのIP範囲をGKEの承認済みネットワークに定義します。

名前付きIP範囲には以下のIP範囲は避けるように[公式ドキュメント](https://cloud.google.com/build/docs/private-pools/set-up-private-pool-to-use-in-vpc-network?hl=ja#understanding_the_network_configuration_options)に記載されているので、注意しましょう。

> ※**Cloud Build は、Docker ブリッジ ネットワークの IP 範囲 192.168.10.0/24 を予約します。プロジェクト内のリソースに IP 範囲を割り当てる際、Cloud Build ビルダーがこれらのリソースにアクセスする場合は、192.168.10.0/24 以外の範囲を選択することをおすすめします。**

<img src="/images/20230210a/4-network-architecuture③.png" alt="4-network-architecuture③.png" width="1200" height="844" loading="lazy">

この時サービスのプライベート接続でカスタムルートのエクスポートは「有効」に設定してください。
この設定により、のちにPrivate PoolにGKE Control PlaneのCIDR(192.168.64.0/28)が広報されます。
<img src="/images/20230210a/4-network-architecuture④.png" alt="4-network-architecuture④.png" width="1200" height="847" loading="lazy">


### GKE Control Planeとmy-stg-environment-vpc間
<img src="/images/20230210a/between_gke_control_plane_my_stg_environment.drawio.png" alt="between_gke_control_plane_my_stg_environment.drawio.png" width="1200" height="355" loading="lazy">

GKE Control Planeとmy-stg-environment-vpcを接続しているVPC Peeringのカスタムルートのエクスポートを有効化します。
これにより、のちにHA VPN Gatewayを通じて広報されてきたPrivate PoolのCIDR(192.168.3.0/24)をGKE Control Plane側に広報することができます。
<img src="/images/20230210a/4-network-architecuture①.png" alt="4-network-architecuture①.png" width="1200" height="849" loading="lazy">



### HA VPNの作成
<img src="/images/20230210a/between_sample_build_vpc_my_stg_environment.drawio.png" alt="between_sample_build_vpc_my_stg_environment.drawio.png" width="1200" height="355" loading="lazy">

CloudBuildのprivate poolのCIDR(192.168.3.0/24)をmy-stg-environment-vpcに、GKE Control PlaneのCIDR(192.168.64.0/28)をsample-build-vpcにそれぞれ広報したいので、my-stg-environment-vpcとsample-build-vpcをHA VPNで接続します。

VPC PeeringでそれぞれのVPCを接続することもできますが、VPC Peeringは推移的ピアリングをサポートしていないため、CloudBuildのprivate poolのCIDR(192.168.3.0/24)とGKE Control PlaneのCIDR(192.168.64.0/28)をそれぞれのVPCへ広報することができません。

まず、HA VPN Gatewayを作成します。
my-stg-environment-vpcに「ha-vpn-my-stg-environment-tky-gw」、sample-build-vpcに「ha-vpn-sample-build-vpc-tky-gw」を作成します。

<img src="/images/20230210a/4-network-architecuture⑦.png" alt="4-network-architecuture⑦.png" width="1200" height="504" loading="lazy">

次に、それぞれのHA VPN Gatewayに対応するVPN Tunnelを作成します。

ha-vpn-my-stg-environment-tky-gwに

- 「ha-vpn-my-stg-environment-tky-tunnel-0」
- 「ha-vpn-my-stg-environment-tky-tunnel-1」

を

ha-vpn-sample-build-vpc-tky-gwに

- 「ha-vpn-sample-build-vpc-tky-tunnel-0」
- 「ha-vpn-sample-build-vpc-tky-tunnel-1」
を作成します。

<img src="/images/20230210a/4-network-architecuture⑧.png" alt="4-network-architecuture⑧.png" width="1200" height="511" loading="lazy">

次に、それぞれのHA VPN Tunnelに対応するCloud Routerを作成します。

- ha-vpn-my-stg-environment-tky-rt

sample-build-vpcにGKE Control PlaneのCIDR(192.168.64.0/28)を広報したいので、アドバタイズされたIP範囲に192.168.64.0/28を設定します。

- ha-vpn-sample-build-vpc-tky-rt

my-stg-environmentにCloudBuild Private PoolのCIDR(192.168.3.0/24)を広報したいので、アドバタイズされたIP範囲に192.168.3.0/24を設定します。

<img src="/images/20230210a/4-network-architecuture⑨.png" alt="4-network-architecuture⑨.png" width="1200" height="840" loading="lazy">

<img src="/images/20230210a/4-network-architecuture⑩.png" alt="4-network-architecuture⑩.png" width="1200" height="847" loading="lazy">



ここまでの設定で、CloudBuildからGKEへデプロイするためのネットワークアーキテクチャの完成になります。


# デプロイの実施
上記でCloudBuildから内部ネットワークを経由してGKE Contorl Planeへ通信できるルートができたので、実際にデプロイを実施してみましょう。

## CloudBuild.yaml
CloudBuildでビルドを実行するためには、ビルド構成ファイルを作成する必要があります。
ビルド構成ファイルには、各ビルドSTEPごとに実行したい処理を記述します。
ビルド構成ファイルに記載しているプロパティの内容は以下の通りです。
| キー | 内容 |
|:-:|:-:|
| name  | タスクを実行するコンテナイメージを指すように指定します  |
| id  | ビルドステップの識別子を指定します  |
| args  | nameに指定したイメージ実行時に渡す引数を記述します  |
| dir  | ビルド実行時の作業ディレクトリを指定します。  |
| env  | ビルド実行時に使用される環境変数を指定します。  |

以下のビルド構成ファイルの内容に従ってビルドが実行されていきます。

```yaml CloudBuild.yaml
steps:
#######################################################################
# イメージをビルド
# （$SHORT_SHAはGitコミットのタグの値、ビルドしたDockerイメージに同じタグ付け）
#######################################################################
  - name: 'gcr.io/cloud-builders/docker'
    id: 'Build Image'
    args: ['build', '-t', 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/docker-repository/hello-go:$SHORT_SHA', "."]
    dir: 'gcp/gke/src'

#######################################################################
# ビルドイメージをArtifact Registry にPush
#######################################################################
  - name: 'gcr.io/cloud-builders/docker'
    id: 'Push to GCR'
    args: ['push', 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/docker-repository/hello-go:$SHORT_SHA']
    dir: 'gcp/gke/src'

#######################################################################
# ビルドしたイメージタグを利用するように、manifestを書き換える
#######################################################################
  - name: 'ubuntu'
    id: 'Tag Override'
    args:
      - bash
      - -c
      - 'sed -i.bk s/latest/$SHORT_SHA/g deployment.yaml'
    dir: 'gcp/gke/manifest'

#######################################################################
# デプロイ
#######################################################################
  - name: "gcr.io/cloud-builders/kubectl"
    id: 'kubectl apply'
    args:
      - apply
      - --filename=deployment.yaml
    env:
    - 'CLOUDSDK_COMPUTE_REGION=${_REGION}'
    - 'CLOUDSDK_CONTAINER_CLUSTER=${_CLUSTER_NAME}'
    dir: 'gcp/gke/manifest'
#######################################################################
# オプション
# ビルド実行ログはCloud Loggingへ
# ビルド実行環境はprivate poolを指定
#######################################################################
options:
  logging: CLOUD_LOGGING_ONLY
  workerPool:
    'projects/$PROJECT_ID/locations/${_REGION}/workerPools/private-build-pool'
```
こちらのcloudbuild.yamlをGitHub上のルートディレクトリ内に保存します。

```sh
├── api_service.tf
├── artifact_registry.tf
├── cloudbuild.tf
├── cloudbuild.yaml # ★追加
├── compute_address.tf
├── compute_container.tf
├── compute_engine.tf
├── compute_firewall.tf
├── compute_global_address.tf
├── compute_network.tf
├── compute_router_nat.tf
├── ha_vpn.tf
├── locals.tf
├── project.tf
├── project_iam_member.tf
├── provider.tf
├── service_account.tf
├── versions.tf
├── manifest
│   ├── deployment.yaml
│   ├── ingress.yaml
│   ├── managed-certificate.yaml
│   └── service.yaml
├── src
    ├── Dockerfile
    └── cmd
        └── main.go
```

## アプリケーションコードの修正
Version: 1.0.0　→　Version: 2.0.0へ修正してmainブランチにPushします。

```bash
xxxxxx@xxxxxx:~/cloud-provider/gcp/gke$ git diff src/cmd/main.go
diff --git a/gcp/gke/src/cmd/main.go b/gcp/gke/src/cmd/main.go
index db8369b..8d603f5 100644
--- a/gcp/gke/src/cmd/main.go
+++ b/gcp/gke/src/cmd/main.go
@@ -25,6 +25,6 @@ func hello(w http.ResponseWriter, r *http.Request) {
         log.Printf("Serving request: %s", r.URL.Path)
         host, _ := os.Hostname()
         fmt.Fprintf(w, "Hello, world!\n")
-        fmt.Fprintf(w, "Version: 1.0.0\n")
+        fmt.Fprintf(w, "Version: 2.0.0\n")
         fmt.Fprintf(w, "Hostname: %s\n", host)
 }
\ No newline at end of file
xxxxxx@xxxxxx:~/cloud-provider/gcp/gke$ git add src/cmd/main.go
xxxxxx@xxxxxx:~/cloud-provider/gcp/gke$ git diff src/cmd/main.go
xxxxxx@xxxxxx:~/cloud-provider/gcp/gke$ git commit -m "modify Version"
[main 0f0a907] modify Version
 1 file changed, 1 insertion(+), 1 deletion(-)
xxxxxx@xxxxxx:~/cloud-provider/gcp/gke$ git push origin main
Enumerating objects: 20, done.
Counting objects: 100% (20/20), done.
Delta compression using up to 20 threads
Compressing objects: 100% (10/10), done.
Writing objects: 100% (14/14), 1.05 KiB | 1.05 MiB/s, done.
Total 14 (delta 4), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (4/4), completed with 2 local objects.
To https://GitHub.com/xxxxxxxx/xxxxxxxx.git
   cef9c7d..0f0a907  main -> main
```

## CloudBuildのビルド画面
GitHubにPushされたことをトリガーにCloudBuildのビルドが実行されます。（過去にビルドに苦戦したビルド履歴が残っていますね。。。（笑））

<img src="/images/20230210a/3-Deploy①.png" alt="3-Deploy①.png" width="1200" height="847" loading="lazy">

最新のビルド履歴（9ee5d0a6）をクリックすると、詳細が確認できます。cloudbuild.yamlに記述したビルドステップごとにビルドが進行していきます。各ビルドステップごとのログも「ビルドログ」から確認することができます。

正常終了するとすべてのステップでグリーンになります。

<img src="/images/20230210a/3-Deploy②.png" alt="3-Deploy②.png" width="1200" height="854" loading="lazy">

CloudBuildのビルドが正常終了したので、再度ドメインに対してアクセスをします。

すると、変更を加えたVersion：2.0.0の状態でレスポンスが返却され、デプロイが正常に完了したことを確認できました。

<img src="/images/20230210a/3-Deploy③.png" alt="3-Deploy③.png" width="352" height="93" loading="lazy">

## Podのライフサイクル
最後のビルドステップでGKEへのデプロイが行われます。

踏み台サーバから`kubectl get pods -w`を実行することでGKE上のPodの状態を確認することができます。

ビルドしたイメージをPullしてデプロイされることで、もともと存在していたPodが次々と終了し、新しいPodが作成されていることがわかります。

```sh
xxxxxx@xxxxxx@tky-bastion:~$ kubectl get pod -w
NAME                                   READY   STATUS    RESTARTS   AGE
hello-go-deployment-78b555bdf6-rv8sh   1/1     Running   0          2m40s
hello-go-deployment-78b555bdf6-z5rk8   1/1     Running   0          2m22s
hello-go-deployment-78b555bdf6-zpczj   1/1     Running   0          2m58s
hello-go-deployment-b788f4444-vcq82    0/1     Pending   0          0s
hello-go-deployment-b788f4444-vcq82    0/1     Pending   0          0s
hello-go-deployment-b788f4444-vcq82    0/1     Pending   0          0s
hello-go-deployment-b788f4444-vcq82    0/1     ContainerCreating   0          0s
hello-go-deployment-b788f4444-vcq82    1/1     Running             0          3s
hello-go-deployment-b788f4444-vcq82    1/1     Running             0          10s
hello-go-deployment-b788f4444-vcq82    1/1     Running             0          10s
hello-go-deployment-78b555bdf6-rv8sh   1/1     Terminating         0          7m11s
hello-go-deployment-b788f4444-cz7ng    0/1     Pending             0          0s
hello-go-deployment-b788f4444-cz7ng    0/1     Pending             0          0s
hello-go-deployment-b788f4444-cz7ng    0/1     Pending             0          0s
hello-go-deployment-b788f4444-cz7ng    0/1     ContainerCreating   0          0s
hello-go-deployment-b788f4444-cz7ng    0/1     ContainerCreating   0          0s
hello-go-deployment-78b555bdf6-rv8sh   0/1     Terminating         0          7m11s
hello-go-deployment-78b555bdf6-rv8sh   0/1     Terminating         0          7m11s
hello-go-deployment-78b555bdf6-rv8sh   0/1     Terminating         0          7m11s
hello-go-deployment-b788f4444-cz7ng    1/1     Running             0          3s
hello-go-deployment-b788f4444-cz7ng    1/1     Running             0          10s
hello-go-deployment-b788f4444-cz7ng    1/1     Running             0          10s
hello-go-deployment-78b555bdf6-zpczj   1/1     Terminating         0          7m39s
hello-go-deployment-b788f4444-hw5cw    0/1     Pending             0          0s
hello-go-deployment-b788f4444-hw5cw    0/1     Pending             0          0s
hello-go-deployment-b788f4444-hw5cw    0/1     Pending             0          0s
hello-go-deployment-b788f4444-hw5cw    0/1     ContainerCreating   0          0s
hello-go-deployment-78b555bdf6-zpczj   0/1     Terminating         0          7m39s
hello-go-deployment-78b555bdf6-zpczj   0/1     Terminating         0          7m39s
hello-go-deployment-78b555bdf6-zpczj   0/1     Terminating         0          7m39s
hello-go-deployment-b788f4444-hw5cw    1/1     Running             0          3s
hello-go-deployment-b788f4444-hw5cw    1/1     Running             0          9s
hello-go-deployment-b788f4444-hw5cw    1/1     Running             0          9s
hello-go-deployment-78b555bdf6-z5rk8   1/1     Terminating         0          7m12s
hello-go-deployment-78b555bdf6-z5rk8   0/1     Terminating         0          7m13s
hello-go-deployment-78b555bdf6-z5rk8   0/1     Terminating         0          7m13s
hello-go-deployment-78b555bdf6-z5rk8   0/1     Terminating         0          7m13s
```


# 最後に

今回はCloudBuildを利用したGKEへの継続デプロイ基盤について記載しました。GKEは限定公開クラスタでControl Planeへのアクセスがプライベートエンドポイントのみの「パブリックエンドポイントアクセスが無効」構築しているため、Cloud BuildからGKEのControl Planeへのアクセスを成功させるためのネットワーク構成が複雑になってしまいましたが、限定公開クラスタで「パブリック エンドポイント アクセスが有効、承認済みネットワークが無効」で構築すればCloudBuildでPrivate PoolやHA VPNで作成することもなくパブリックエンドポイント経由でControl Planeへアクセスができます。セキュリティ要件次第でデプロイフローやアーキテクチャなどは変更してください。

まだまだGKEの知らない機能がたくさんあるので、引き続きインプットとアウトプットをしていきたいと思います。
