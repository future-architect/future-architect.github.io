---
title: "cfn-guardを使ってTerraformをポリシーチェックしようとした話"
date: 2024/03/18 00:00:00
postid: a
tag:
  - Terraform
  - Policy-as-Code
category:
  - DevOps
thumbnail: /images/2024/20240318a/thumbnail.png
author: 原木翔
lede: "cfn-guardを使用してTerraformをポリシーチェックしようとした話をします。"
---
[Terraform連載2024を](/articles/20240311a/) の6本目です。

## 導入

インフラエンジニアとして働いているTIGの原木です。

cfn-guardを使用してTerraformをポリシーチェックしようとした話をします。

## cfn-guardとは？

cfn-guardのcfnとはAWSのCloudFormation(AWSのIaCソリューションのこと)の略称です。

このツールはCloudFormationを使ってAWSのリソースをデプロイするときにその内容をチェックするポリシーチェックツールとしてよく使われています。

しかし、cfn-guardはその名前に反して、CloudFormationに限らず、JSON/YAMLファイルに対する汎用的なポリシーチェックツールとしても使用できます。

READMEの記載にも、次の通り説明があります。

> Guard offers a policy-as-code domain-specific language (DSL) to write rules and validate JSON- and YAML-formatted data such as CloudFormation Templates, K8s configurations, and Terraform JSON plans/configurations against those rules.
>
> Guardは、CloudFormationテンプレート、K8sコンフィグレーション、TerraformのJSONプラン/コンフィグレーションなどのJSONやYAMLフォーマットのデータに対して、ルールを記述し検証するためのPolicy as Codeなドメイン固有言語(DSL)を提供します。

AWS Certified Securityの勉強をしていて本ツールの名前を知り、READMEを見て、自分は興味を持ちました。

## cfn-guardでTerraformをチェックしようとしたモチベーション

Terraformのポリシーチェックとしては、過去にFuture技術ブログで紹介したtflintやterraform validator[^1]、tfsec[^2]等すでに様々なツールがあります。

その中でなぜあえて、cfn-guardをTerraform planをチェックしようとしたのか？

それはcfn-guardに読み込ませるルール表となるCFn Guard DSLとAWSマネージドサービスの力を借りてインフラをデプロイする前から後まで一貫したポリシーチェックができるのではないか。と考えたためです。

一度CFn Guard DSL(ポリシールール)を書くことで二度おいしいメリットがあると考えました。

* Terraformのコーディング中に、cfn-guardによりユニットテストを動かす感覚でポリシーチェックを随時できるようになります
* Terraformを使ってAWSインフラを構築後、意図しない形でリソースが変更されてもAWS ConfigによりトリガーされたCFn Guardルールのスキャンによってインフラのドリフトを検知できるようになります

[CloudFormation Guard で Policy as Code！ 実際どうよ？ / Policy as Code with CloudFormation Guard](https://speakerdeck.com/ohmura/policy-as-code-with-cloudformation-guard?slide=7)のスライドをお借りすると次のようなイメージです。

<img src="/images/2024/20240318a/image.png" alt="image.png" width="1200" height="682" loading="lazy">

このような **青写真** を描きました。

このブログでは、cfn-guardを検証し...そして、思ってたのと違った!!という話をしたいと思います。

## なにはともあれ実践してみよう

一番基礎的な使い方として、S3ファイルをデプロイするterraformのファイルをチェックする方法について書きたいと思います。

前提として、cfn-guardはHCLファイル(要は.tfファイル)を直接チェックできず、JSON/YAMLファイルを読み込ませないといけないので、 `terraform plan` の実行結果からJSONファイルを作成する必要があります。

下記のようにS3バケットを作成するHCLファイルがあったとしましょう。

```tf
# provider等は省略します
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_public_access_block" "my_bucket" {
  bucket = aws_s3_bucket.my_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

このファイルがまだ未作成の場合、次のようにコマンドを実行することで
作成後に想定されるリソース構成をJSONファイルで出力できます。

```shell
terraform plan -out tfplan.bin
terraform show --json tfplan.bin > tfplan.json
```

`tfplan.json` のファイル構造を分解して中身を見てみましょう。
※そのままだと見づらいのでJSONファイルをサブセットであるYAMLファイルに変換して表示します。
※YAMLファイルでも素のJSONファイルでもcfn-guardは動かすことができます。

```yaml
format_version: "1.2"
terraform_version: 1.6.1
planned_values:
  // terraformがplanしたリソースの最終的な構成情報
  root_module:
    resources:
      - address: aws_s3_bucket.my_bucket
        mode: managed
        type: aws_s3_bucket
        name: my_bucket
        provider_name: registry.terraform.io/hashicorp/aws
        schema_version: 0
        values:
          bucket: my-bucket1
          force_destroy: false
          tags: null
          tags_all:
            env: dev
          timeouts: null
        sensitive_values:
          cors_rule: []
          grant: []
          lifecycle_rule: []
          logging: []
          object_lock_configuration: []
          replication_configuration: []
          server_side_encryption_configuration: []
          tags_all: {}
          versioning: []
          website: []
      - address: aws_s3_bucket_public_access_block.my_bucket
        mode: managed
        type: aws_s3_bucket_public_access_block
        name: my_bucket
        provider_name: registry.terraform.io/hashicorp/aws
        schema_version: 0
        values:
          block_public_acls: true
          block_public_policy: true
          ignore_public_acls: true
          restrict_public_buckets: true
        sensitive_values: {}
resource_changes:
  // 既存リソースに対する変更内容
  // 省略
configuration:
  // 元の状態に適用される構成のこと
  // 省略
relevant_attributes:
  // 変更されたリソースの関連属性
  // 省略
timestamp: "2024-03-17T05:58:17Z"
errored: false
```

上記リソースをチェックするためのリソースポリシーを書いてみます。

よくあるリソースポリシーとして

* S3のバケット名が特定の命名規則にしたがっていること
* リソースに特定の環境を示すタグが入っていること

をチェックしたいと思います。

```sh
let aws_s3_bucket_resources = planned_values.root_module.resources[type == "aws_s3_bucket"]

rule aws_s3_bucket_rule when %aws_s3_bucket_resources !empty {
  # バケット名は "test-" で始まる必要があります
  %aws_s3_bucket_resources.values.bucket == /^test-.*/

  # "env" タグが必ず含まれること
  let required_tags = %aws_s3_bucket_resources.values.tags_all[
      Key == 'env' ]
  %required_tags[*] {
      Value IN ['dev', 'stg', 'prod', 'demo']
      <<Tag must have a permitted value>>
  }
}
```

このルールに従っているか実際に `cfn-guard` を動かし、チェックしてみましょう。

```shell
$ cfn-guard validate -r s3_template_example.guard -d infrastructure/tfplan1.json -o yaml
tfplan1.json Status = FAIL
FAILED rules
s3_template_example.guard/aws_s3_bucket_rule                    FAIL
---
name: tfplan1.json
metadata: {}
status: FAIL
not_compliant:
# 出力内容はわかりやすくするために途中端折ってます
- Rule:
    name: aws_s3_bucket_rule
    checks:
    - Clause:
        Binary:
          context: ' %aws_s3_bucket_resources[*].values.bucket EQUALS  "/^test-.*/"'
          messages:
            custom_message: ''
            error_message: Check was not compliant as property value [Path=/planned_values/root_module/resources/0/values/bucket[L:0,C:286] Value="my-bucket"] not equal to value [Path=[L:0,C:0] Value="/^test-.*/"].
          check:
            Resolved:
              from:
                path: /planned_values/root_module/resources/0/values/bucket
                value: my-bucket
              to:
                path: ''
                value: /^test-.*/
              comparison:
              - Eq
              - false
```

エラーになりました。contextを確認すると、 `context: ' %aws_s3_bucket_resources[*].values.bucket EQUALS  "/^test-.*/"'` とあるようにバケットの命名規則がルールに従っていないことがわかります。

そこでバケット名を修正し、再度 `cfn-guard` にかけてみます。

```shell
# 修正したs3.tf及びyamlファイルは割愛
$ cfn-guard validate -r s3_template_example.guard -d infrastructure/tfplan2.json -o yaml
name: tfplan2.json
metadata: {}
status: PASS
not_compliant: []
not_applicable: []
compliant:
- aws_s3_bucket_rule
- public_access_block_resources_rule
```

今度は通りました。

序の口ではありますが、cfn-guardを使ったチェック方法について、雰囲気は掴めたのではないかと思います。しかし、ここから先、cfn-guardを深掘りするうちにギャップが広がっていくことに気づきました。

## ここが思ってたのと違ってたよという話

当初の自分の妄想では、cfn-guardとは、AWSのリソースAPIにアクセスしていい感じにチェックするツールなのかなとふわっと思ってました。ですが、実践例にあるように実態はどうでしょうか？

カンの良い方はすぐに気づかれたかもしれません。

CloudFormationを例に先ほどと同じことをしてみましょう。

```yaml
AWSTemplateFormatVersion: 2010-09-09
Resources:
  MyS3Bucket4646DF6F:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: CdkAppStack/MyS3Bucket/Resource
```

というファイルに対してS3のバケット名の命名規則をチェックします。

```sh
let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]

rule BucketEncryption when %buckets !empty {
  %buckets.Properties {
    BucketName == /^test-.*/
  }
}
```

別物やんけ。

その通りです。なぜなら、CloudFormationとTerraform planではファイルの構造が全然異なりますので。

cfn-guardの実態は、CFn Guard DSLに基づきJSONやYAMLなどの構造型データを検査する、ある意味シンプルな構文解析ツールです。

したがって、ポリシーファイルについてCloudFormation向けはCloudFormation向け、Terraform plan向けはTerraform plan向けに書く必要があります。そして後者のTerraform plan向けのポリシーファイルは、当然AWS Config上で動きません。

ここに当初の構想はからくも崩れたのでした。

ECSのTask Definitionのようにインラインで文字列化したJSONファイルをいい感じにパースする方法が見つからなかった、tagチェックでtagsとtags_allを別々にチェックする必要があった、そもそも構文エラー時説明してるようで何も説明してくれないエラーログ等、細かいことを言い出すときりがない不満があり、最終的に自分はおとなしくtflintに戻りました。

## 最後に

Terraformユーザーには、cfn-guardの扱いは少々難しいところがあるという話でした。

ポリシールール等の設定について最近はChatGPT先生に下書きをお願いすることが多いのですが、彼女に自由に書かせたら、明らかにAWS CloudFormationテンプレート向けのguardファイルをTerraformと言い張ったのは悲しかったです。

WHY?と聞いたら次の通り開き直った回答が返ってきました。
<img src="/images/2024/20240318a/image_2.png" alt="" width="1200" height="1142" loading="lazy">

しかし、AWS CDKを使ってCloufFormationのテンプレートファイルを生成し、AWSリソースのデプロイを行っているユーザーにとって強力なポリシーチェックツールなのは間違いありません。

[CFn Guard Rules Registry](https://github.com/aws-cloudformation/aws-guard-rules-registry)には、ルールの実装例が多数掲載されております。
Amazon Web Services' Well-Architected Framework Reliability Pillar等、インフラエンジニアが非機能要件を考える時のベストプラクティスを実装したポリシーファイル等もあり、痒い所に手が届く例となっています。

以上、参考になれば幸いです。

[^1]: 現在は `gcloud beta terraform vet` として提供中
[^2]: 現在は `trivyの1機能` として提供中
