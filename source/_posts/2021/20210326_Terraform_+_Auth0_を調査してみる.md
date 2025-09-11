---
title: "Terraform + Auth0 を調査してみる"
date: 2021/03/26 00:00:00
postid: ""
tag:
  - Auth0
  - Terraform
  - tfstate
category:
  - 認証認可
thumbnail: /images/2021/20210326/thumbnail.png
author: 小林澪司
lede: "アルバイトの小林です。案件で認証プラットフォームである[Auth0]を利用しています。Auth0がHashiCorpとのパートナーシップを結び、TerraformでAuth0リソースの管理が可能となりました。"
---
TIG DXユニット [^1] アルバイトの小林です。

案件で認証プラットフォームである[Auth0](https://auth0.com/jp/)を利用しています。

Auth0がHashiCorpとのパートナーシップを結び、TerraformでAuth0リソースの管理が可能となりました。

https://auth0.com/blog/partners-with-hashicorp-terraform/

今回はTerraformで既存のAuth0リソースを移行するという観点で調査を行いました。

## Auth0とは

<img src="/images/2021/20210326/image.png" loading="lazy">

Auth0の概要については[Auth0導入編](/articles/20200122/)をご参照ください。他にも技術ブログには[Auth0関連の記事](/tags/Auth0/)が沢山あります。

## Terraformとは

<img src="/images/2021/20210326/image_2.png" loading="lazy">

TerraformとはHashiCorpによって開発されたオープンソースのクラウド管理ツールです。

クラウド環境のインフラの構成をコードに落とし込むことで、Git管理が可能になり、さらに状態を定義することが可能になるため、状態との差分からクラウド環境のリソース変更部分の表示が可能になるため、設定ミスのリスクを低減が見込めます。

技術ブログでは[Terrafom関連の記事](/tags/Terraform/)が沢山あるためそちらも合わせてご参照ください。

また、Terraform以外でAuth0のクラウドリソースをコードに落とし込むツールには`auth0-deploy-cli`が上げられます。

## Auth0 Deploy CLI

https://github.com/auth0/auth0-deploy-cli

Auth0が出しているツールで、テナント構成をyamlに落とし込んだり、yamlに書かれたテナント構成を反映するなど、CI/CDを可能にします。

Auth0 Deploy CLIについては、TIG市川さんの[Auth0の設定をバージョン管理し、Auth0 Deploy CLIを利用してデプロイ環境を整える](/articles/20200702/)をご参照ください。

Auth0 Deploy CLIには、`dry-run`がサポートされておらず [^8]、**実際に実行してみるまでテナント構成がどうなるのか分からない**、さらに**意図していない変更を検出出来ない**といった課題があります。

## Auth0 Deploy CLI vs Terraform

Auth0環境の構成をAuth0 Deploy CLIで行う場合とTerraformで行う場合について、それぞれの強みと弱みについて調査しました。

#### Auth0 Deploy CLIの強み

- テナントの構成をまるっとエクスポートすることが出来ます。
  - rules,hooksもディレクトリに区切ってファイルを作成してくれるなど、親切です。
- mappingが公式サポートされています。
  - [auth0-deploy-cli/README.md:AUTH0_KEYWORD_REPLACE_MAPPINGS· auth0/auth0-deploy-cli](https://github.com/auth0/auth0-deploy-cli/blob/master/examples/yaml/README.md#environment-variables-and-auth0_keyword_replace_mappings)
  - そのため単一のyamlファイルを複数の環境に転用させて、検証環境と本番環境の設定の同一化が比較的容易に実現出来ます。

#### Auth0 Deploy CLIの弱み

- Auth0専用のツールなのでこのツールの操作方法を独自で覚える必要があります。
- `dry-run`機能が無いため**意図していない設定変更が生じうる**可能性があります [^9]。

#### Terraformの強み

- 独自ツール無しでTerraformだけで済むため、いままでAWSなどでTerraformを使っている場合、学習コストほぼ0で利用出来ます。
- Terraformには`plan`と呼ばれる現在の状態と変更後の状態の差分を表示させる、`dry-run`に該当する機能があります。
- Terraform workspaceを利用することで同一のリソースブロックを複数環境で利用することが可能になります。これにより検証環境と本番環境の設定の同一化が比較的容易に実現出来ます。

#### Terraformの弱み

- 一括で全リソースをインポートする手段が無いためテナント設定が膨大の場合、Terraformで管理出来る状態に持っていくまでが大変です。
  - terraformのimportをAuth0プロパイダで利用する際、IDの特定方法が複雑([**後述**](#既存のauth0リソースをterraformに移行する際の流れ))です。

今回、私の所属しているプロジェクトでは、**他のクラウドリソースをTerraformで管理している**こと、
Auth0の構成が複雑になっていることから、`plan`が非常に強力であり、**作業ミスのリスクを大幅に減少出来る見込み**のため、Terraformを採用することにしました。

## Terraformで管理すると

Terraformで管理出来る様になると以下の点で便利になります。

- 環境毎の設定差異の検出が簡単に出来る。
- Auth0のリソース更新時にdry-runが可能になり、意図していないリソースの変更や、リソースの更新忘れのリスクを軽減できる。
- 環境全体がコードに落ちるためGitなどのバージョン管理ツールで管理が出来る様になる。

この記事では以下の2点について扱います。

- terraform importを利用して既存のAuth0リソースをTerraformに移行できるか
- 複数環境で設定を統一化出来るか

## 前提

- terraformのバージョンはv0.14.6を利用します。
- プロパイダは[alexkappa/auth0](https://github.com/alexkappa/terraform-provider-auth0)を利用します。
  - バージョンはv0.17.1です。
- 事前にAuth0のテナントのダッシュボードから、Management APIが利用可能なM2Mのアプリケーションを作成しておき、ClientIDとClientSecretを取得しておく必要があります。

### 準備手順

作業ディレクトリにmain.tfを作成して以下の様に記載します。

```tf main.tf
terraform {
  required_providers {
    auth0 = {
      source  = "alexkappa/auth0"
      version = "0.17.1"
    }
  }
}


provider "auth0" {
  domain        = "Auth0テナントのドメイン"
  client_id     = "事前に作成したM2MアプリケーションのClientID"
  client_secret = "事前に作成したM2MアプリケーションのClientSecret"
}
```

その後、`terraform init`をします。

以上で準備完了です。

## terraform importを利用して既存のAuth0リソースをTerraformに移行できるか

### TL;DR

1つだけtfstateを弄る必要があるが、**可能**です。

### 既存のAuth0リソースをTerraformに移行する際の流れ

まずは移行手順の全体像について記載します。

- 空のリソース定義を作成する。
- terraform import で既存のリソースをstateに取り込む
- `terraform state show`でstateに取り込んだ既存リソースのパラメータを確認し、先程作成した空のリソース定義に追加していく。
- `terraform plan`して差分が無くなればそのリソースの移行完了

この手順を**Auth0で管理出来る全リソースについて実行します**。

Terraformで管理出来るリソースの一覧(リソースタイプ)は↓で定義されています。

[Docs overview | alexkappa/auth0 | Terraform Registry](https://registry.terraform.io/providers/alexkappa/auth0/latest/docs)

かなりの作業量になるため何らかのツールがあるだろうと探してみたのですが、見つけられませんでした。 [^2]

加えてこの手順でAuth0のリソースをインポートするに当たって、ある事象でハマってしまいました。

### ハマったポイント: IDが無いリソースタイプがいくつかある。

Terraformで定義されているimportコマンドの書式はこのようになっています。

```
terraform import [options] ADDRESS ID
```

<details><summary>ADDRESSとは▼</summary><div>

`ADDRESS` はリソースアドレスの事であり、`<given type>.<local name>` の形式で表します。

例えば、

```sh
resource "auth0_custom_domain" "main_domain" {
}
```

の様なリソースブロックにおいて、

`ADDRESS`は`auth0_custom_domain.main_domain`です。

</div></details>

<br>

`ID`はそのリソースをインポートするための識別子です。例えば、Auth0 Custom Dmainのドメイン設定は`cd_<random string>`の形で割り振られています。

この`ID`ですが、**リソースタイプによっては存在しません**。例えば、テナント設定である、[auth0_tenant](https://registry.terraform.io/providers/alexkappa/auth0/latest/docs/resources/tenant)にはIDが存在しません。この場合、どうすれば設定のインポートが出来るのか、悩んでいました。

結論としては、**IDを適当に自分で決めればインポート出来ました**。

### なぜ適当なIDで通るのか

`ID`は識別子です。Auth0 のテナント設定に着目すると、**IDが無くとも設定が判別できます**。

IDが振られているリソースタイプである、`auth0_role`のプロパイダのソースコード [^3]とTerraform公式のimportの説明 [^7]を読むと、CLIから受け取ったIDが`d.ID()`に入っている事が分かります。

同様にIDが不明なリソースタイプである、`auth_tenant`のプロパイダのソースコード [^4]を読むと、`auth0_role`では使われていた、`d.ID()`が使われていない事が分かります。そのため、こちらで適当なIDを入れても問題無いことが分かります。

### リソースタイプとIDの対応表

執筆当時プロパイダのドキュメントに、**どのパラメータを使えばimportが出来るかの情報がほとんど載っていません**。issueにはちらちら書かれていますが、テナント設定のimport方法について書いている人は見つけられませんでした。

そのためリソースタイプとID対応関係について表にまとめてみたので参考にお使い下さい。執筆当時で、この中の全リソースタイプについてimportが出来ている事を確認しています。 [^5]

また、`ID`の確認が必要なリソースタイプについては、IDが確認しやすい様にManagement APIのAPI Explorerの該当APIのURLを載せています。

IDの欄に`"id"`と書かれていた場合は**APIを叩いた時のJSONレスポンスのキーが"id"の値**を指します。
**自由**と書かれていた場合は先述の理由により、自由に設定出来ます。

| Resource Type           | ID                                                                                                                                                                                                  | URL                                                                                                                                                                     | 備考                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| auth0\_client           | "client\_id"                                                                                                                                                                                       | [https://auth0.com/docs/api/management/v2#!/Clients/get\_clients](https://auth0.com/docs/api/management/v2#!/Clients/get_clients)                                       |                                                                  |
| auth0\_client\_grant    | "id"                                                                                                                                                                                                | [https://auth0.com/docs/api/management/v2#!/Client\_Grants/get\_client\_grants](https://auth0.com/docs/api/management/v2#!/Client_Grants/get_client_grants)             |                                                                  |
| auth0\_connection       | "id"                                                                                                                                                                                                | [https://auth0.com/docs/api/management/v2#!/Connections/get\_connections](https://auth0.com/docs/api/management/v2#!/Connections/get_connections)                       |                                                                  |
| auth0\_custom\_domain   | "custom\_domain\_id"                                                                                                                                                                                | [https://auth0.com/docs/api/management/v2#!/Custom\_Domains/get\_custom\_domains](https://auth0.com/docs/api/management/v2#!/Custom_Domains/get_custom_domains)         | tfstateの修正が必要 [^6]                                                           |
| auth0\_email            | 自由                                                                                                                                                                                                  |                                                                                                                                                                         |                                                                  |
| auth0\_email\_template  | \[verify\_email,<br>verify\_email\_by\_code,<br>reset\_email,<br>welcome\_email,<br>blocked\_account,<br>stolen\_credentials,<br>enrollment\_email,<br>mfa\_oob\_code,<br>user\_invitation\] のどれか一つ |                                                                                                                                                                         | IDによって、インポートされる項目が異なる、<br>例えば\`verify\_email\`ならば認証メールがインポートされる。 |
| auth0\_hook             | "id"                                                                                                                                                                                                | [https://auth0.com/docs/api/management/v2#!/Hooks/get\_hooks](https://auth0.com/docs/api/management/v2#!/Hooks/get_hooks)                                               |                                                                  |
| auth0\_prompt           | 自由                                                                                                                                                                                                  |                                                                                                                                                                         |                                                                  |
| auth0\_resource\_server | "id"                                                                                                                                                                                                | [https://auth0.com/docs/api/management/v2#!/Resource\_Servers/get\_resource\_servers](https://auth0.com/docs/api/management/v2#!/Resource_Servers/get_resource_servers) |                                                                  |
| auth0\_role             | "id"                                                                                                                                                                                                | [https://auth0.com/docs/api/management/v2#!/Roles/get\_roles](https://auth0.com/docs/api/management/v2#!/Roles/get_roles)                                               |                                                                  |
| auth0\_rule             | "id"                                                                                                                                                                                                | [https://auth0.com/docs/api/management/v2#!/Rules/get\_rules](https://auth0.com/docs/api/management/v2#!/Rules/get_rules)                                               |                                                                  |
| auth0\_rule\_config     | "key"                                                                                                                                                                                               | [https://auth0.com/docs/api/management/v2#!/Rules\_Configs/get\_rules\_configs](https://auth0.com/docs/api/management/v2#!/Rules_Configs/get_rules_configs)             |                                                                  |
| auth0\_tenant           | 自由                                                                                                                                                                                                  |                                                                                                                                                                         |                                                                  |
| auth0\_user             | "user\_id"                                                                                                                                                                                          | [https://auth0.com/docs/api/management/v2#!/Users/get\_users](https://auth0.com/docs/api/management/v2#!/Users/get_users)                                               |

## 複数環境で設定を統一化出来るか

複数テナントが推奨されているAuth0において、テナントの設定を統一化したいケースがあると思います。
その際は`terraform workspace`と呼ばれる機能を用いて1つのリソースブロックを複数の環境で共有することが可能になります。

dev環境とtest環境があったとして、この2つの環境で同一の設定にさせたい場合について考えます。

先程のmain.tfと同階層にvariables.tfを置きます。

```sh variables.tf
locals {
  environments = {
    dev = {
      auth0_domain        = "dev-example.auth0.com",
      auth0_client_id     = "dev環境のM2MアプリケーションのClientID",
      auth0_client_secret = "dev環境のM2MアプリケーションのClientSecret"
    }
    test = {
      auth0_domain        = "test-example.auth0.com",
      auth0_client_id     = "test環境のM2MアプリケーションのClientID",
      auth0_client_secret = "test環境のM2MアプリケーションのClientSecret"
    }
  }
}
```

main.tfのプロパイダ設定を以下の様に変えます。

```tf main.tf
provider "auth0" {
  domain        = local.environments[terraform.workspace]["auth0_domain"]
  client_id     = local.environments[terraform.workspace]["auth0_client_id"]
  client_secret = local.environments[terraform.workspace]["auth0_client_secret"]
}
```

Terraformのworkspaceを追加しましょう。main.tfで以下のコマンドを実行します。

```sh
terraform workspace new dev
terraform workspace new test
```

以下の様に表示されます(現在いるworkspaceに*が付きます。)

```sh
$ terraform workspace list
  default
  dev
* test
```

今自分が入っているworkspaceは`terraform workspace list`で確認します。

移動したい場合は`terraform workspace [移動先のworkspace名]`です。

dev環境を正としたい場合は先程のリソースのimport手順をworkspaceがdevの状態で進めます。その後、workspaceをtestに変更してからリソースブロックを変更せずに`terraform import`を全リソースに対して行います。

最後に、`terraform plan`でdev環境とtest環境の設定の差分が表示されます。

### 一部だけ設定を変えたい

test環境の時だけ空のルールである`empty-rule.js`、その他の環境の時は`some-rule.js`を動かしたいケースについて考えてみます。

HCLの組み込み関数`file`と三項演算子により実現出来ます。

```sh
resource "auth0_rule" "some_rule" {
  name   = "some_rule"
  script = terraform.workspace == "test" ? file("./empty-rule.js") : file("./some-rule.js")
}
```

Terraformの組み込み関数`replace`を使えば、同一のファイルを参照しつつ振る舞いを返る事が可能になります。

テナント環境毎に挙動が変わるRuleをTerraformで管理してみます。

初めに以下の様なスクリプトを保存し、

```js set-env.js
 function setEnv(user, context, callback) {
    const idTokenClaims = context.idToken || {};
    idTokenClaims["http://example.com/env"] = "###AUTH0_TENANT###";

    context.idToken = idTokenClaims;

    return callback(null, user, context);
}
```

以下の様にリソース定義を行います。

```sh
resource "auth0_rule" "set_env" {
  name   = "set_env"
  script = replace(file("./set-env.js"),"###AUTH0_TENANT###",terraform.workspace)
}
```

このように書く事でdev環境では

```js set-env.js
 function setEnv(user, context, callback) {
    const idTokenClaims = context.idToken || {};
    idTokenClaims["http://example.com/env"] = "dev";

    context.idToken = idTokenClaims;

    return callback(null, user, context);
}
```

として、test環境では

```js set-env.js
 function setEnv(user, context, callback) {
    const idTokenClaims = context.idToken || {};
    idTokenClaims["http://example.com/env"] = "test";

    context.idToken = idTokenClaims;

    return callback(null, user, context);
}
```

として環境毎に振る舞いを変える事が出来ました。

## まとめ

今回はTerraform + Auth0の環境構築について、既存のAuth0環境の移行を観点として調査を行いました。

調査結果をまとめると、

- importの手順に一癖あるが、一応全リソースを移行出来る。
- workspaceを用いて複数のテナントで環境を同一にしつつ、一部だけ環境毎に振る舞いを変えることが出来る。

ことが分かりました。

既存のAuth0環境をTerraformに移行したい場合の考慮材料にして頂ければ幸いです。

ここまで読んで頂きありがとうございました。

## 終わりに

私事で恐縮ですが、2019年の2月からアルバイトとして働いてきたFutureを今日で退職します。

この2年を通してFutureで沢山の技術を学び、自身のスキルを大幅に向上させることが出来ました。

2年間本当にお世話になりました。ありがとうございました！

<img src="/images/2021/20210326/kobayashi.jpg" loading="lazy">

 [^1]: TIG: Technology Innovation Groupの略で、フューチャーの中でも特にIT技術に特化した部隊です。DXユニット: TIGの中にありデジタルトランスフォーメーションに関わる仕事を推進していくチームです。
 [^2]: 執筆中に[terraformer](https://github.com/GoogleCloudPlatform/terraformer)と呼ばれる既存のインフラリソースをリソース定義(.tf)や状態(.tfstate)に落とし込むCLIツールは見つけたのですが、執筆当時はまだ対応リストに記載されていません。
 [^3]: https://github.com/alexkappa/terraform-provider-auth0/blob/master/auth0/resource_auth0_role.go#L86
 [^4]: https://github.com/alexkappa/terraform-provider-auth0/blob/master/auth0/resource_auth0_tenant.go#L256
 [^5]: あくまで全リソースタイプについて確認しているため、リソースタイプのauth0_email_templateのIDは`verify_email`と`reset_email`のみ確認済みです。
 [^6]: このリソースタイプはどうリソースブロックを編集しても`terraform plan`で差分を無くす事が出来ません。`verification_method`がManagement APIの仕様上importされないため、tfstate側がnullと設定されてしまうからです。スキーマ定義を見ると、`Required`と`ForceNew`が付いているためこのままではリソースの再生成が走ってしまいます。そのため、`.tfstate`,`.tf`の両方について`verification_method = "txt"`に強制的に変更することで`terraform plan`で差分を表示させない様に設定出来ます。この問題はプロパイダのリポジトリのissueでも言及されていました。 [Importing auth0_custom_domain resource forces recreation · Issue #294 · alexkappa/terraform-provider-auth0](https://github.com/alexkappa/terraform-provider-auth0/issues/294)

 [^7]: [Resources - Import - Terraform by HashiCorp](https://www.terraform.io/docs/extend/resources/import.html#importer-state-function)
 [^8]: [Support Test Mode · Issue #70 · auth0/auth0-deploy-cli](https://github.com/auth0/auth0-deploy-cli/issues/70)issue自体は記載されています。
 [^9]: 一応Auth0 Deploy CLIでは、意図していないリソースの破壊を防ぐために`AUTH0_ALLOW_DELETE`フラグが設定可能です。https://github.com/auth0/auth0-deploy-cli/blob/master/examples/yaml/README.md#config
