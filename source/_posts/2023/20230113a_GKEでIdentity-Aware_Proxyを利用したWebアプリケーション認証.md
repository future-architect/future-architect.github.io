---
title: "GKEでIdentity-Aware Proxyを利用したWebアプリケーション認証"
date: 2023/01/13 00:00:00
postid: a
tag:
  - GoogleCloud
  - GKE
category:
  - 認証認可
thumbnail: /images/2023/20230113a/thumbnail.png
author: 渡邉光
lede: "GKE を利用したWebアプリケーションのGoogleアカウント認証について記事を書きます。公式ドキュメントを引用します。IAP を使用すると、HTTPS によってアクセスされるアプリケーションの一元的な承認レイヤを確立できるため、ネットワーク レベルのファイアウォールに頼らずに、アプリケーション レベルのアクセス制御モデルを使用できます。"
---
# 初めに

明けましておめでとうございます！ Future筋肉エンジニアの渡邉です。年も明けたことなので切り替えて減量に入りました。三月末までを目安に体を絞ろうと思っています。

私は現在Google Cloudを利用しているプロジェクトに所属しており、Google Cloudのスキルアップにいそしんでいます。今回はGKE (Google Kubernetes Engine)でCloud IAP (Identity-Aware Proxy)を利用したWebアプリケーションのGoogleアカウント認証について記事を書こうと思います。

# Identity-Aware Proxyとは

以下、[公式ドキュメント](https://cloud.google.com/iap/docs/concepts-overview?hl=ja)引用
> IAP を使用すると、HTTPS によってアクセスされるアプリケーションの一元的な承認レイヤを確立できるため、ネットワーク レベルのファイアウォールに頼らずに、アプリケーション レベルのアクセス制御モデルを使用できます。

簡単に言うとGoogleアカウントとCloud IAMの仕組みを用いてWebアプリケーションの認証をできます。

## 認証・承認フロー

<img src="/images/2023/20230113a/authenticate-flow.drawio.png" alt="authenticate-flow.drawio.png" width="487" height="564" loading="lazy">

[公式ドキュメント](https://cloud.google.com/iap/docs/concepts-overview?hl=ja)はこちら

- Google Cloudリソースへのリクエスト(Cloud Load Balancing)します。
- IAPが有効になっている場合は、IAP認証サーバへ情報を送信します（プロジェクト番号、リクエストURL、リクエストヘッダー、Cookie内のIAP認証情報など）
- IAP認証サーバがブラウザの認証情報をチェックします。
- 認証情報が存在しない場合は、OAuth2.0のGoogleアカウントログインフローにリダイレクトし、認証確認を実施する。認証トークンは今後のアクセスのためブラウザのCookieに保存されます。
- 認証情報が有効な場合、認証サーバは認証情報からユーザのID（メールアドレスとユーザID）を取得します。
- 認証サーバはこのIDからユーザのIAMロールをチェックし、ユーザがリソースにアクセスできる権限(**IAP で保護されたウェブアプリ ユーザー**)を持っているかをチェックします
- 権限を持っていれば、アクセスOKになり、なければNGになります。

# 全体アーキテクチャ図

以下が全体アーキテクチャ図になります。
GKE/NetworkなどのGoogle Cloudのリソース構築に関しては慣れ親しんでいるTerraformを利用して作成しました。OAuth同意画面に関しては外部公開する場合は、APIから作成することはできない ([公式ドキュメント記載](https://cloud.google.com/iap/docs/programmatic-oauth-clients?hl=ja]))ので、コンソール画面から設定しました。

<img src="/images/2023/20230113a/architecture.drawio.png" alt="architecture.drawio.png" width="1151" height="429" loading="lazy">

## Bastion初期設定

Public Subnetに作成したGCEインスタンスからGKEのコントロールプレーンに対してkubectlコマンドを実行したいので、
kubectlコマンドや、google-cloud-sdk-gke-gcloud-auth-pluginなどをインストールします。
以下、Bashスクリプトです。

```sh
#!/bin/bash

########################################################
# Author: watanabe
# Initial Date: 2022/12/28
# History: Create
########################################################

# Variable Definition
project_name="xxxxxxxxxx"
gke_cluster_name="xxxxxxxxx"
region="asia-northeast1"

# Install Kubectl
curl -LO "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl
kubectl version

# Install google-cloud-sdk-gke-gcloud-auth-plugin
sudo apt-get install apt-transport-https ca-certificates gnupg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt-get update && sudo apt-get install google-cloud-cli
sudo apt-get install google-cloud-sdk-gke-gcloud-auth-plugin
gke-gcloud-auth-plugin --version
export USE_GKE_GCLOUD_AUTH_PLUGIN=True
source ~/.bashrc

# Get Credentials
gcloud container clusters get-credentials "${gke_cluster_name}" --region "${region}" --project "${project_name}"
kubectl config get-contexts
kubectl get node
```

## manifestファイル

また、manifestファイルは以下を用意してkubectlコマンドを実行しk8sリソースをGKEに対して作成しました。

ここまでの設定で事前準備は完了です。

### Deployment

nginxのPodを用意するため、Deploymentのmanifestを作成しました。

```yaml deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 3
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.22
        ports:
        - containerPort: 80
```

### Service

IngressにはNodePortが必要になるので、Serviceのmanifestを作成しました。

```yaml service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
```

### ManagedCertificate

クライアントとIngressで構築するHTTP(S)ロードバランサ間をHTTPSでアクセスするようにしたいので、Googleマネージド証明書のmanifestを作成しました。
domainsには、terraformで用意したHTTP(S)ロードバランサに設定したい外部IPアドレスにフリーなワイルドカードDNSサービスの[nip.io](https://nip.io/)を利用したものを設定します。

```yaml managed-certificate.yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: nginx
spec:
  domains:
    - 34.xxx.xxx.xxx.nip.io
```

### Ingress

インターネット上にnginxを公開するためにIngressを構築するmanifestを作成しました。

```yaml ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
  annotations:
    # 外部ロードバランサの作成
    kubernetes.io/ingress.class: "gce"
    # クライアントとHTTP(S)ロードバランサ間のすべての通信をHTTPSに強制
    kubernetes.io/ingress.allow-http: "false"
    # 事前に用意していた静的外部IPアドレスを設定する
    kubernetes.io/ingress.global-static-ip-name: "loadbalancer-external-ip-address"
    # Googleマネージド証明書をIngressに適用する
    networking.gke.io/managed-certificates: "nginx"
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 80
```

# Cloud IAPなしでのアクセス確認

まず、Cloud IAPなしでのアクセス確認を行います。
Load Balancerに設定したドメインに対してアクセスを行うと、特に認証画面を経由することもなくアクセスできます。
<img src="/images/2023/20230113a/1-IAPなしでのアクセス確認.png" alt="1-IAPなしでのアクセス確認.png" width="956" height="525" loading="lazy">

# Cloud IAPの設定を追加

上記の状態ではだれでもアクセスすることが可能なため、セキュアな状態ではありません。
ここでCloud IAPの設定を追加してみましょう。

## OAuth同意画面の作成

OAuth同意画面はUser Typeを「外部」で作成します。
<img src="/images/2023/20230113a/2-OAuth同意画面①.png" alt="2-OAuth同意画面①.png" width="1200" height="848" loading="lazy">

アプリ情報として、必須項目の以下を設定して「保存して次へ」をクリックします。
ほかの情報は任意のため設定しませんでした。

- アプリ名：GKE Application
- ユーザサポートメール：自身のメールアドレス
- デベロッパーの連絡先情報：自身のメールアドレス

<img src="/images/2023/20230113a/2-OAuth同意画面②.png" alt="2-OAuth同意画面②.png" width="1200" height="838" loading="lazy">

<img src="/images/2023/20230113a/2-OAuth同意画面③.png" alt="2-OAuth同意画面③.png" width="1200" height="843" loading="lazy">

スコープとテストユーザは任意情報のため設定しませんでした。
以下が設定完了したOAuth同意画面になります。

<img src="/images/2023/20230113a/2-OAuth同意画面④.png" alt="2-OAuth同意画面④.png" width="1200" height="844" loading="lazy">

## OAuth認証情報の作成

APIとサービスタブの「認証情報」をクリックします。
認証情報の作成プルダウンリストからOAuthクライアントIDをクリックします。

<img src="/images/2023/20230113a/3-OAuth認証情報①.png" alt="3-OAuth認証情報①.png" width="1200" height="843" loading="lazy">

- アプリケーションの種類：ウェブアプリケーション
- OAuthクライアントIDの名前：GKE Application
を入力し、作成ボタンをクリックします。

<img src="/images/2023/20230113a/3-OAuth認証情報②.png" alt="3-OAuth認証情報②.png" width="1200" height="851" loading="lazy">

作成ボタンをクリックするとOAuthクライアントIDとクライアントシークレットが生成されるので、JSONをダウンロードします。

<img src="/images/2023/20230113a/3-OAuth認証情報③.png" alt="3-OAuth認証情報③.png" width="512" height="448" loading="lazy">

作成したOAuthクライアントを再度クリックし、承認済みリダイレクトURIをダウンロードしたOAuthクライアントID(CLIENT_ID)に修正して保存します。

```
https://iap.googleapis.com/v1/oauth/clientIds/CLIENT_ID:handleRedirect
```

<img src="/images/2023/20230113a/3-OAuth認証情報④.png" alt="3-OAuth認証情報④.png" width="1200" height="795" loading="lazy">

## IAPアクセス権の設定

Google Cloud ConsoleのIdentity-Aware Proxyにアクセスします。
アクセス権を付与するリソースの横にあるチェックボックスをオンにします。

<img src="/images/2023/20230113a/4-CloudIAPアクセス権設定①.png" alt="4-CloudIAPアクセス権設定①.png" width="1200" height="845" loading="lazy">

IAPの有効化で「構成要件」を参照し、問題なければ「有効にする」をクリックします。
<img src="/images/2023/20230113a/4-CloudIAPアクセス権設定②.png" alt="4-CloudIAPアクセス権設定②.png" width="564" height="355" loading="lazy">

チェックボックスが「オン」になりました
右側のパネルから、「プリンシパルの追加」をクリックします。
<img src="/images/2023/20230113a/4-CloudIAPアクセス権設定③.png" alt="4-CloudIAPアクセス権設定③.png" width="1200" height="849" loading="lazy">

IAPアクセスを許可したいGoogleアカウント（メールアドレス）または、Googleグループなどを指定して、IAMロール（IAP-secured Web App User）を付与してください。

<img src="/images/2023/20230113a/4-CloudIAPアクセス権設定④.png" alt="4-CloudIAPアクセス権設定④.png" width="736" height="727" loading="lazy">

ここまででOAuthの設定は完了です。

## Kubernetes Secretの作成

GKEでCloud IAPを適用するためには、Kubernetes Secretを作成してBackendConfigに適用する必要があります。
先ほど作成してダウンロードしたOAuth認証情報のClient IDとClient Secretを指定してKubernetes Secretを作成します。

```bash
kubectl create secret generic oauth-secret --from-literal=client_id=xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com \
    --from-literal=client_secret=xxxxxxxxxxxxxxxxxxxxxxxxx
```

Kubernetes Secretが作成されていることを確認します。

```bash
xxxxxxxxxxxxx@tky-bastion:~$ kubectl describe secret oauth-secret
Name:         oauth-secret
Namespace:    default
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
client_secret:  35 bytes
client_id:      73 bytes
```

## BackendConfigの作成

Kubernetes Secretで作成したSecretをBackendConfigに設定することでCloud IAPを適用できます。
以下のmanifestファイルを用意します。

```yaml backendconfig.yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: iap-conifg
  namespace: default
spec:
  iap:
    enabled: true
    oauthclientCredentials:
      secretName: oauth-secret
```

kubectlコマンドでBackendConfigを作成します。

```bash
kubectl apply -f backendconfig.yaml
```

BackendConfigが作成されていることを確認します。

```bash
xxxxxxxxxxxxx@tky-bastion:~/manifest$ kubectl get backendconfig
NAME         AGE
iap-conifg   3m42s
```

サービスポートを BackendConfig に関連付けて、IAP の有効化をトリガーする必要があります。既存のService リソースにアノテーションを追加し、サービスのすべてのポートをデフォルトで BackendConfig にします。

```yaml service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
# 追記
  annotations:
    beta.cloud.google.com/backend-config: '{"default": "config-default"}'
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
```

```bash
kubectl apply -f service.yaml
```

以上で、Cloud IAPの設定は完了です。

# Cloud IAPありでのアクセス確認

Cloud IAPの設定が完了したので、画面にアクセスしてCloud IAPが適用されているかを確認します。

## Cloud IAP認証対象外アカウントでのアクセス確認

Load Balancerに設定したドメインに対してアクセスを行うと、Cloud IAPによるGoogleアカウントログイン画面にリダイレクトされます。

<img src="/images/2023/20230113a/5-IAPアクセスなし①.png" alt="5-IAPアクセスなし①.png" width="469" height="557" loading="lazy">

本GoogleアカウントはCloud IAPのアクセスできる権限(**IAP で保護されたウェブアプリ ユーザー**)を持っていないため、画面にアクセスすることはできません。
<img src="/images/2023/20230113a/5-IAPアクセスなし②.png" alt="5-IAPアクセスなし②.png" width="426" height="455" loading="lazy">

## Cloud IAP認証対象アカウントでのアクセス確認

Load Balancerに設定したドメインに対してアクセスを行うと、Cloud IAPによるGoogleアカウントログイン画面にリダイレクトされます。

<img src="/images/2023/20230113a/6-IAPアクセスあり①.png" alt="6-IAPアクセスあり①.png" width="529" height="565" loading="lazy">

本GoogleアカウントはCloud IAPのアクセスできる権限(**IAP で保護されたウェブアプリ ユーザー**)を持っているため、画面にアクセスできました。
<img src="/images/2023/20230113a/6-IAPアクセスあり②.png" alt="6-IAPアクセスあり②.png" width="908" height="299" loading="lazy">

# 最後に

今回はGKE (Google Kubernetes Engine)でCloud IAP (Identity-Aware Proxy)を利用したGoogleアカウント認証について記事を書きました。
Google Cloudを利用していて、特定のGoogleアカウントにのみアクセスを許可したいケースはあるかと思いますので、その時にでも参考にしていただければ幸いです。
