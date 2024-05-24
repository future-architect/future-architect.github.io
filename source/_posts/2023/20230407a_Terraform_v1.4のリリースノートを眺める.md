---
title: "Terraform v1.4のリリースノートを眺める"
date: 2023/04/07 00:00:00
postid: a
tag:
  - Terraform
  - Terraform1.4
category:
  - Infrastructure
thumbnail: /images/20230407a/thumbnail.png
author: 伊藤太斉
lede: "Terraformのv1.0が出て約2年弱、ついにv1.4までやってきました。Terraformのv1.4のリリースノートの、ENHANCEMENTのうち、私個人が特に気になった機能を見つつ、ユースケースが考えられるものについて探れればと思います。"
---

<img src="/images/20230407a/top.png" alt="" width="700" height="239">

こんにちは。TIGの伊藤です。

本記事は[Terraform連載2023](/articles/20230327a/)の9リソース目です。

Terraformのv1.0が出て約2年弱、ついにv1.4までやってきました。v0.xの時代に比べて、バージョンアップ時の検討内容も比較的少なくなっており、日々継続的に運用する身としては非常に嬉しい限りです。また、機能追加も日々されて、使いやすくなってきてもいます。

とはいえ、リリースノートを見るたび、「ユースケースがわからない」から斜め読みになって自分の対象外としてしまった、など本来的には使えるものまで見逃していることも私自身は少なくないので、今回はTerraformのv1.4のリリースノートの、`ENHANCEMENT`のうち、私個人が特に気になった機能を見つつ、ユースケースが考えられるものについて探れればと思います。

なお、本連載でもいくつかテーマとしている記事がありますので、その内容については割愛します。

## null_resourceに変わるビルトインリソースができた
`null_resource`は、実行するホストマシンでシェルコマンドを実行したり、するために取り入れられているリソースですが、これがもう少し汎用性が高まる形で`terraform_data`というビルトインリソースができました。

ビルトインということもあって、本来の機能からは逸れますが、`terraform init`コマンドをそれぞれ利用する前提で実行した時にinitにかかる時間や、実際の`terraform init`の中で行われている内容に違いが現れています。

```bash
# null_resourceを扱う時
$ terraform init

Initializing the backend...

Initializing provider plugins...
- Finding latest version of hashicorp/null...
- Installing hashicorp/null v3.2.1...
- Installed hashicorp/null v3.2.1 (signed by HashiCorp)

Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.

Terraform has been successfully initialized!

...

# terraform_dataを扱う時
$ terraform init

Initializing the backend...

Initializing provider plugins...
- terraform.io/builtin/terraform is built in to Terraform

Terraform has been successfully initialized!

...
```

こんな形で、`terraform_data`を利用するときはProviderを取りにいっていないことがわかります。

さて、本題に戻り、`null_resource`と重複する部分が多い機能として`terraform_data`が出たのか、機能の違いについて考えます。
まず、リソースとして利用できるパラメータです。各々何があるかみていきましょう。

**`null_resource`**

| パラメータ名 | 型 | 説明 |
| --- | --- | --- |
| triggers | map | Mapで渡している文字列に変更が入ると、リソース内部に記述されているprovisionersを再実行する |

**`terraform_data`**

| パラメータ名 | 型 | 説明 |
| --- | --- | --- |
| input | any |inputパラメータとして渡された値を保存し、outputとして利用する時にapply後に再利用できる |
| triggers_replace | list | 定義された値に変更があったらリソースを再作成する |

`null_resource`でいう`triggers`が`terraform_data`では`list`になりました。どちらも、渡されたパラメータに対して変更が入った場合はトリガーとしてリソースが再作成になる、という点ではないので、ここはmapで扱った方が取り回しやすいのか、　listが良いのか分かれてくるように感じました。
例えば、`terraform_data`でLambdaに利用するPythonスクリプトのライブラリを都度更新する形を考えてみます。
以下の方に、`main.py`に変更が入った場合には自動的に`terraform_data`が再作成され、`pip install`コマンドが再実行されるようになります。

```sh
resource "terraform_data" "pip_install" {
  triggers_replace = [filesha256("lambda_functions/sample/main.py")]

  provisioner "local-exec" {
    command = "pip install -r lambda_functions/sampple/requirements.txt -t lambda_functions/sampple/site-packages"
  }
}
```

## `terraform workspace select`コマンドにオプションが追加
`terraform workspace select`に新しいオプションとして`-or-create`というオプションが使えるようになりました。実際にhelpを実行しても見えるようになりました。

```bash
$ terraform workspace select --help
Usage: terraform [global options] workspace select NAME

  Select a different Terraform workspace.

Options:

    -or-create=false    Create the Terraform workspace if it doesn't exist.
```

helpを読んでみると、`terraform workspace select`コマンドで指定したworkspaceがない時にこのオプションを渡すことで作成してくれるようです。
例えば、以下のように、`dev`、`stg`というworkspaceがあったとします。

```bash
$ terraform workspace list
  default
  dev
* stg
```
ここに、さらに`prd`というworkspaceを選択して、本番環境を作成するとしましょう。現在であれば、`terraform workspace select`コマンドはないworkspaceを指定するので、エラーになってしまいます。しかし、`-or-create`オプションがあることで、ない場合でもエラーにならずに、新しいworkspaceが作成されるようになります。

```bash
# オプションがない時
$ terraform workspace select prd

Workspace "prd" doesn't exist.

You can create this workspace with the "new" subcommand
or include the "-or-create" flag with the "select" subcommand.
```
```bash
# オプションがある時
terraform workspace select -or-create prd
Created and switched to workspace "prd"!

You're now on a new, empty workspace. Workspaces isolate their state,
so if you run "terraform plan" Terraform will not see any existing state
for this configuration.
```
```bash
# workspaceがあるか確認
terraform workspace list
  default
  dev
* prd
  stg
```

このアップデートのユースケースを考えてみると、上記の例のように、実際に人が実行するパターンではなく、CIでテストする場合に有効かなと思います。

実際のIssue([#31633](https://github.com/hashicorp/terraform/pull/31633))には以下のような一文がありました。

> We currently get this behavior using the following script: `terraform workspace select test || terraform workspace new test`; however, this does not work well when attempting to use the official terraform docker image as it does not handle shell scripts by design.

既存で存在するTerraformコンテナにおいては `terraform workspace select test || terraform workspace new test`が実行できない問題があること、また、CIでworkspaceを新規作成する時に上記コマンドを実行することに不都合が生じる、というケースの解決を目的としているようです。

## `terraform show`のメッセージ
`teraform show`コマンドは、そのStateで管理されているリソースを全て展開して表示してくれるコマンドですが、そのStateで管理しているリソースがない場合もあり得ます。この時に、「なぜ何も表示されないのか」をメッセージとして表示してくれるようになりました。
従来では、Stateがそもそもないときはコメントが返ってくるものの、Stateはある状態で中身がないときは何もでませんでした。

```bash
# Stateがない時
$ terraform show
No state.

# Stateはある時
$ terraform show

# 何も出力されない
```
後者のStateはあって、リソースがないケースについて、メッセージが出るようになりました。
　
```bash
$ terraform show
The state file is empty. No resources are represented.
```

上記は、一度`terraform apply`コマンドでリソースを作った後に、`terraform destroy`コマンドでリソースを全て削除した後に実行しました。そのため、表示される文章としても「表示するリソースがない」というものになります。

## まとめ
今回は、Terraform v1.4のリリース内容の一部をかいつまんで紹介しました。今回はすごく大きな変更、影響があるものは少ないものの、細かい要求に対してフィットしたような印象でした。今回紹介した機能追加も、「あると嬉しい」だったと感じているので、今後もより使いやすくなればと思います。

その他のリリース内容
- [Terraform 1.4 Update:Private Service Connectを利用したbackend/gcsへのアクセス](/articles/20230327b/)
- [Terraformでの機密情報の取り扱い on Google Cloud](/articles/20230331a/)

