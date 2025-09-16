---
title: "Auth0でADをユーザDBにし、SalesforceとのSSOを確認する"
date: 2021/03/02 00:00:00
postid: ""
tag:
  - Auth0
  - SSO
  - AD
  - Auth0Rules
category:
  - 認証認可
thumbnail: /images/2021/20210302/thumbnail.png
author: 山田勇一
lede: "エンタープライズの領域ではAD認証が多く利用されており、また同時にCRMとしてSalesforceが導入されているケースが多くあります。この場合、社内システムにおける「統合認証」の要件として、これらを繋げてログインする必要が出てきます。これらの要求に対応するため、以下2点を確認し、Active Directory（以降AD）を中心とした統合認証を試してみます。"
---

エンタープライズの領域ではAD認証が多く利用されており、また同時にCRMとしてSalesforceが導入されているケースが多くあります。
この場合、社内システムにおける「統合認証」の要件として、これらを繋げてログインする必要が出てきます。

これらの要求に対応するため、以下2点を確認し、Active Directory（以降AD）を中心とした統合認証を試してみます。

1. Auth0のApplicationsでAD認証ができることを確認
2. SalesforceのSSO機能を利用し、Auth0経由でAD認証かつSSOができることを確認

# Auth0とは？

<img src="/images/2021/20210222/top.png" class="img-middle-size" loading="lazy">

[Auth0導入編](/articles/20200122/)をぜひ参照ください。他にも[Auth0関連](/tags/Auth0/)の記事があります。

# Auth0に「Active Directory / LDAP」Connectorを追加

### 設定追加

`メニュー　-> Connections -> Enterprise -> Active Directory / LDAP -> CREATE CONNECTION`
メニューからConnectorを追加し、今回は2つのオプションを有効にしています

* Use Windows Integrated Auth (Kerberos)
Auth0はWindows統合認証（Kerberos認証）に対応しており、WindowsでAD認証でログインしており、かつ `IP Ranges` のIPでログインすると認証をスキップできます。
* Sync user profile attributes at each login
こちらはシンプルに認証時に最新のプロファイルをADから取得できる設定となっています。

<img src="/images/2021/20210302/スクリーンショット_2021-02-24_10.03.37.png"  style="border:solid 1px #000000" loading="lazy">

# ADサーバーの設定

### Connector設定確認

追加済みのConnectorより、「Setup」タブを確認し `Ticket Url` を控えておきます。
**この`Ticket Url`がADサーバーの設定に必要となります。**

<img src="/images/2021/20210302/スクリーンショット_2021-02-24_10.06.35.png"  style="border:solid 1px #000000" loading="lazy">

### ADサーバーにAD LDAP Connectorをインストール

[インストール手順](https://auth0.com/docs/extensions/ad-ldap-connector/install-configure-ad-ldap-connector)を参考に、ウィザードに従ってインストールしてください。
インストール時に前述の手順で控えた`Ticket Url`が必要になります。

### AD LDAP Connectorの設定を変更

Auht0らしく、AD LDAP Connectorの設定をスクリプトで変更できる部分があります。
ProfileMapper（ADのユーザプロファイルとAuth0のユーザプロファイルのマッピング）のタブが、スクリプトで記載できる設定になっており、今回は詰められる情報を最大まで詰めてみました。
ここで設定したプロファイルがログイン時にAuth0に送信される情報となります。

<img src="/images/2021/20210302/スクリーンショット_2020-09-11_17.49.51.png"  style="border:solid 1px #000000" loading="lazy">

### ADとAuth0が接続できていることを確認

Auth0側の`Connections`の表示が、`Offline`から`Online`に変化します。

<img src="/images/2021/20210302/スクリーンショット_2020-09-11_9.36.28.png"  style="border:solid 1px #000000" loading="lazy">

# Applicationsでログイン確認

### Applicationsの設定変更

### Applicationsで`Connections`を有効化

Applicationsの設定で`Connections`タブを開き、設定済みのADを有効化します。

<img src="/images/2021/20210302/スクリーンショット_2021-02-22_18.59.51.png"  style="border:solid 1px #000000" loading="lazy">

### ログインを確認

サンプルアプリケーションを利用し、ログイン後のプロファイルを確認します。
ここで、ADで設定済みのプロファイルが見えれば連携成功です。

<img src="/images/2021/20210302/スクリーンショット_2020-09-11_15.33.11.png"  style="border:solid 1px #000000" loading="lazy">

### プロファイルが取れるか確認

Auth0のRulesでプロファイルの取得を入れ込み、結果を見ます。

<img src="/images/2021/20210302/スクリーンショット_2020-09-11_17.59.05.png"  style="border:solid 1px #000000" loading="lazy">

ADサーバーのAD LDAP Connectorで指定した情報が取れていることがわかります。
なお、ここまで確認できればAuth0上でユーザ情報を自由に扱えそうだと判断できます。
例えば、ログイン時にADからユーザ情報を透過的に移行するなどの対応も考えられます。

<img src="/images/2021/20210302/スクリーンショット_2020-09-11_15.38.32.png" loading="lazy">

<img src="/images/2021/20210302/スクリーンショット_2020-09-11_15.38.48.png" loading="lazy">

# Salesforceの外部認証にAuth0を設定

### Salesforceのアカウント準備

SSOの前提として、Auth0のドメイン設定を行う必要があります。

### Salesforce側にADとSSOさせたいユーザを作成

**SalesforceのSSOでは、Salesforce側に事前にSSOしたユーザの登録が必要です。**
また、SSOさせる場合にSalesforceのユーザとADのユーザで、SSOに利用する属性情報を一致させる必要があります。
とはいえ、Auth0のログイン画面を使う場合、ADとSalesforceで一致させる属性はEmailが最善です。
今回はこの青枠ユーザをSSOで利用します。

<img src="/images/2021/20210302/スクリーンショット_2021-02-22_19.33.57.png"  style="border:solid 1px #000000" loading="lazy">

### Saleforceのドメイン設定

[SSOにはドメイン設定が必要になるため、設定しておきます。](https://help.salesforce.com/articleView?id=sf.domain_name_overview.htm&type=5)
ここでAuth0に移ります。

### auth0にSalesforce用のSSO設定を追加

`SSO Integrations`から`CREATE SSO INTEGRATION`を選択し、SalesforceのSSO設定を追加します
Salesforce側のドメインが必要になるので、[Auth0の設定ページ](https://auth0.com/docs/protocols/saml-configuration-options/configure-salesforce-as-saml-identity-provider)を確認しつつSalesforceから情報を取得してください。

<img src="/images/2021/20210302/スクリーンショット_2021-02-22_18.59.24.png"  style="border:solid 1px #000000" loading="lazy">

Salesforceのドメインに`https://`をつけたものが`Entity ID`になります。

<img src="/images/2021/20210302/スクリーンショット_2021-02-22_18.59.45.png"  style="border:solid 1px #000000" loading="lazy">

追加設定として、認証先をADに変更します。

<img src="/images/2021/20210302/スクリーンショット_2021-02-22_18.59.51_2.png"  style="border:solid 1px #000000" loading="lazy">

ここで、Salesforceに移ります。

### SaleforceのSSO設定追加

メニューの`ID->シングルサインオン設定`を選択し、`新規`から接続設定を作ります。

<img src="/images/2021/20210302/スクリーンショット_2021-02-22_19.09.12.png" loading="lazy">

Auth0のSalesforce設定ページにチュートリアルページあるので、手順に従い必須項目を埋めます。
`IDはattribute要素にあります`を選択し、`email`を入力することを忘れないでください。
設定した`email`が、ADとSalesforceでSSOさせるユーザの一致属性となります。

<img src="/images/2021/20210302/スクリーンショット_2021-02-22_19.44.06.png"  style="border:solid 1px #000000" loading="lazy">

### SSOの確認

これでようやく設定完了です。
追加したSSOのログインボタンが現れますので、自ドメインの認証画面からSSOユーザでログインしてください。

<img src="/images/2021/20210302/スクリーンショット_2020-09-14_12.52.42.png" loading="lazy">

ログインできれば成功です。
お疲れ様でした。

* [Auth0で認証成功後に任意のWebページを表示させたい | フューチャー技術ブログ](/articles/20210222/)
* [Auth0 EmailまたはSMSを使ったパスワードレス認証を設定する | フューチャー技術ブログ](/articles/20200123/)
