---
title: "CloudflareでWebサイトのメンテナンスイン/アウトを実装"
date: 2024/05/31 00:00:00
postid: a
tag:
  - cloudflare
category:
  - Programming
thumbnail: /images/2024/20240531a/thumbnail.jpg
author: 小林弘樹
lede: "CloudflareをCDNやDNSに利用しているサービスにおいて、CDNレイヤでメンテナンスイン/アウトを実装する方法を書いてみます。"
---

[Cloudflare連載](/articles/20240527a/)5日目の記事です。

# はじめに

TIG DXチームの小林弘樹です。

近年、CloudflareをCDNやDNSで活用しているシステムが増えている印象があります。[宮崎さんの記事](/articles/20240529a/)でもCloudflareを採用した事例が紹介されています。

CloudflareをCDNやDNSに利用しているサービスにおいて、CDNレイヤでメンテナンスイン/アウトを実装する方法を書いてみます。

# 概要

## やりたいこと

- Cloudflare上にメンテナンスページ（htmlファイル）をデプロイする
- 運用保守拠点からのアクセスはオリジンにアクセスさせ、その他一般ユーザーからのアクセスはメンテナンスページにリダイレクトさせる
- Cloudflare APIを利用して、メンテナンスイン/アウトを自動化する

## 利用サービス

- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare Rules(Single Redirects)](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/)

# ドメイン取得・管理

今回の構成はCloudflare上でドメインを管理していることが前提となります。
Cloudflareでドメインを取得したり、取得済みのドメインをCloudflareに移管する方法については、詳しくわかりやすい情報が多く公開されているため他の記事を参照してください。

# Cloudflare R2設定

## バケット構築

まずはバケットを作ります。
2024/05現在では凝った設定はできないため、ただ箱のみとなります。

```sh
resource "cloudflare_r2_bucket" "maintenance" {
  account_id = local.account_id
  name       = "maintenance-r2"
}
```

## パブリックアクセス設定

Cloudflare R2の設定画面からパブリックアクセス設定の「ドメインに接続」をクリックし、Cloudflareで管理しているドメインを利用して任意のドメインを入力します

<img src="/images/2024/20240531a/r2_setting_1.jpg" alt="r2_setting_1.jpg" width="1176" height="841" loading="lazy">

ステータスがアクティブになったら完了です。

<img src="/images/2024/20240531a/r2_setting_2.jpg" alt="r2_setting_2.jpg" width="1200" height="291" loading="lazy">

## htmlファイルアップロード

メンテナンスページ（htmlファイル）のデプロイは自動化したいため、APIでのアップロードを行います。

Cloudflare R2のAPIは、制約は多いですが[AWS S3 APIと互換性](https://developers.cloudflare.com/r2/api/s3/api/)があるため、AWS CLIやAWS SDKなどと同様に実行できます。

今回はAWS CLIで実行します。

まずは、APIトークンを発行する必要があります。

Cloudflare R2の概要画面から「R2 APIトークンの管理」をクリックし、「APIトークンを作成する」をクリックします。

<img src="/images/2024/20240531a/r2_setting_3.jpg" alt="r2_setting_3.jpg" width="1165" height="367" loading="lazy">

<img src="/images/2024/20240531a/r2_setting_4.jpg" alt="r2_setting_4.jpg" width="1168" height="235" loading="lazy">

オブジェクトの書き込み権限を付与して作成します。
また、バケットはメンテナンスページ用のバケットに特定しておきましょう。
<img src="/images/2024/20240531a/r2_setting_5.jpg" alt="r2_setting_5.jpg" width="1150" height="838" loading="lazy">

作成完了すると以下の情報が表示されるため控えておきます。

- アクセスキーID
- シークレットアクセスキー
- エンドポイント

<img src="/images/2024/20240531a/r2_setting_6.jpg" alt="r2_setting_6.jpg" width="1114" height="841" loading="lazy">

aws configureでアクセスキーとシークレットアクセスキーを設定し、以下のコマンドを実行します。

`$HTML_PATH`はアップロードしたいhtmlファイルのパス、`$R2_BUCKET_NAME`はバケット名、`$R2_ENDPOINT`はエンドポイントに適宜修正してください。

```sh
aws s3 cp $HTML_PATH s3://$R2_BUCKET_NAME --endpoint-url https://$R2_ENDPOINT --region apac
```

# リダイレクトルール設定

## 許可IPリスト作成

まずメンテンナンス中でもアクセスを許可したい運用保守拠点のIPアドレスリストを作成します。

下記のリストはTerraformからでも作れますが、著者が検証した限りでは何も変更を加えていないのにも関わらずapplyをする度にリソースが作り直されるという現象が起き、正しく設定されているのかがわかりづらく運用上困るため手動構築としています。

アカウント管理のリスト管理画面から、「リストを作成する」をクリックして作成します。

<img src="/images/2024/20240531a/rule_setting_1.jpg" alt="rule_setting_1.jpg" width="1149" height="430" loading="lazy">

<img src="/images/2024/20240531a/rule_setting_2.jpg" alt="rule_setting_2.jpg" width="696" height="663" loading="lazy">

リスト作成後、許可したいIPアドレスを追加したら完了です。

<img src="/images/2024/20240531a/rule_setting_3.jpg" alt="rule_setting_3.jpg" width="1159" height="627" loading="lazy">

## リダイレクトルール作成

作成したIPリスト以外のIPリストからのアクセスはメンテナンスページにリダイレクトするように設定します。

`locals`で設定しているところは適宜修正してください。注意事項としては、ルールは`ruleset`という単位で作成され、リダイレクトルール全体で1つの`ruleset`である必要があります。

つまり、既に他のリダイレクトルールが存在していると作成できなかったり、後から別のリダイレクトルールを追加しようとすると`ruleset`ごと更新になったりする点に注意が必要です。

```sh
resource "cloudflare_ruleset" "single_redirects" {
  kind    = "zone"
  zone_id = local.zone_id
  name    = "Redirect Rules"
  phase   = "http_request_dynamic_redirect"

  rules {
    action = "redirect"
    action_parameters {
      from_value {
        status_code = 302
        target_url {
          value = local.maintenance_page_url
        }
      }
    }
    expression  = "(not ip.src in $allow_ips_maintenance and http.request.full_uri ne \"${local.maintenance_page_url}\")"
    description = "Redirect from outside the maintenance location"
    enabled     = false
  }
}

```

## なぜリダイレクトルールか

Cloudflareでこのようなリダイレクトを行いたいときには、他に以下の手段があります。

- [Cloudflare Rules(Page Rules)](https://developers.cloudflare.com/rules/page-rules/)

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

このうちPage Rulesは最近非推奨となり、廃止されることが予定されています。

Workersはより細かく柔軟に設定が可能ですが、今回のような単純なリダイレクト制御の場合はそこまでは不要であるため、よりシンプルなリダイレクトルールを採用しています。

# 自動化設定

自動化についてはGitHub Actionsなどを想定してはしていますが、特定のサービスに依存はしないためコマンドのみ記載します。

## APIトークン作成

まずはAPIで色々と実行するためにAPIトークンを作成します。

プロフィールのAPIトークン画面から「トークンを作成する」をクリックします。

<img src="/images/2024/20240531a/auto_setting_1.jpg" alt="auto_setting_1.jpg" width="1200" height="271" loading="lazy">

権限は動的リダイレクトの編集権限とキャッシュパージの実行権限が必要です。

また後述するルールセットIDの調査のためにルールセットの読み取り権限も付けておきます。

その他は極力必要最小権限となるように設定しましょう。

<img src="/images/2024/20240531a/auto_setting_2.jpg" alt="auto_setting_2.jpg" width="820" height="840" loading="lazy">

作成が完了したらトークンの値を控えておきます。

<img src="/images/2024/20240531a/auto_setting_3.jpg" alt="auto_setting_3.jpg" width="946" height="439" loading="lazy">

## メンテナンスイン

以下のコマンドでメンテナンスインを実現できます。

```sh
# R2バケットにメンテナンスページをアップロード
aws s3 cp $HTML_PATH s3://$R2_BUCKET_NAME --endpoint-url https://$R2_ENDPOINT --region apac

# リダイレクトルールを有効化
curl -X PATCH https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/$RULESET_ID/rules/$RULE_ID \
    -H "Authorization:Bearer $API_TOKEN" \
    -H "Content-Type:application/json" \
    -d '{"description":"Redirect from outside the maintenance location","action":"redirect","action_parameters":{"from_value":{"status_code":302,"target_url":{"value": "$MAINTENANCE_PAGE_URL"}}},"expression":"(not ip.src in $allow_ips_maintenance and http.request.full_uri ne \"$MAINTENANCE_PAGE_URL\")","enabled":true}'

# キャッシュパージ
curl -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache \
    -H "Authorization:Bearer $API_TOKEN" \
    -H "Content-Type:application/json" \
    -d '{"purge_everything":true}'
```

## メンテナンスアウト

以下のコマンドでメンテナンスアウトを実現できます。

```sh
# リダイレクトルールを無効化
curl -X PATCH https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/$RULESET_ID/rules/$RULE_ID \
    -H "Authorization:Bearer $API_TOKEN" \
    -H "Content-Type:application/json" \
    -d '{"description":"Redirect from outside the maintenance location","action":"redirect","action_parameters":{"from_value":{"status_code":302,"target_url":{"value": "$MAINTENANCE_PAGE_URL"}}},"expression":"(not ip.src in $allow_ips_maintenance and http.request.full_uri ne \"$MAINTENANCE_PAGE_URL\")","enabled":false}'

# R2バケットのメンテナンスページ削除 ※デプロイ中は常時アクセス可能となっているため削除しておきます
aws s3 rm s3://$R2_BUCKET_NAME/$HTML_PATH --endpoint-url https://$R2_ENDPOINT --region apac

# キャッシュパージ
curl -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache \
    -H "Authorization:Bearer $API_TOKEN" \
    -H "Content-Type:application/json" \
    -d '{"purge_everything":true}'
```

## 【補足】ルールセットID（&ルールID）の確認方法

著者が調べた限りでは、画面上で簡単にルールセットIDを確認する方法がありませんでしたので、Cloudflare APIを利用して確認しています。

ルールIDについては、作成したルール詳細を画面で表示するとURL末尾に入っていますが、一応同様に記載します。

```sh
# ルールセットIDの確認
curl -X GET https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type:application/json"

# ルールIDの確認
curl -X GET https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/$RULESET_ID \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type:application/json"
```

# 最後に

Cloudflare R2とリダイレクトルールを利用してメンテナンスイン/アウトを実装できました。

少しでもCloudflareを利用している方の参考になれば幸いです。
