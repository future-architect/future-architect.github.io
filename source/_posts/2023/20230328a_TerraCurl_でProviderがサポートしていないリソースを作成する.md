---
title: "TerraCurl でProviderがサポートしていないリソースをTerraCurlで作成する"
date: 2023/03/28 00:00:00
postid: a
tag:
  - Terraform
  - curl
category:
  - DevOps
thumbnail: /images/2023/20230328a/thumbnail.png
author: 真野隼記
lede: "TerraCurlというツールが面白そうだったので触ってみました。TerraCurlは以下の2023.2.22 のHashiCorpさんのブログで紹介されています。* [Writing Terraform for unsupported resources - HashiCorp Blog]"
---
<img src="/images/2023/20230328a/top.png" alt="" width="600" height="356" loading="lazy">

# はじめに

Terraformがv1.4のリリースおめでとうございます。[Terraform連載2023](/articles/20230327a/) の2リソース目の記事です。

v1.4リリースとは関係ないですが、[TerraCurl](https://registry.terraform.io/providers/devops-rob/terracurl/latest/docs)というツールが面白そうだったので触ってみました。TerraCurlは以下の2023.2.22 のHashiCorpさんのブログで紹介されています。

* [Writing Terraform for unsupported resources - HashiCorp Blog](https://www.hashicorp.com/blog/writing-terraform-for-unsupported-resources)

リポジトリは[devops-rob/terraform-provider-terracurl](https://github.com/devops-rob/terraform-provider-terracurl)です。

## TerraCurlの使いどころ

AWS、Google Cloud、Azureなど、日進月歩で新しいサービス、新機能が追加されています。例えば以下は [ITmediaさんのページ](https://www.itmedia.co.jp/enterprise/articles/2103/08/news067.html) から引用した、AWSの機能追加の推移ですがその勢いは加速しています。

<img src="/images/2023/20230328a/kz_wk220322_02_MASK.jpg" alt="kz_wk220322_02_MASK.jpg" width="590" height="333" loading="lazy">

クラウドベンダー、SaaSサービス側の機能追加に合わせて、Terraform Provider側の開発が進むので、新しい機能を利用しようとしても、まだ対応していない、といった場面がまれに発生します。Provider側へPull Requestを出しOSSコントリビュートして推進に関与するというのがあるべきアプローチの1つだと思いますが、業務スケジュール上、できるだけ急ぎで対応したいということが多いでしょう。

こういった場面で役立つのが今回紹介するTerraCurlです。

## local-exec

従来、Providerが対応していないとか、そもそもProviderが存在しないリソースを管理したい時、頼りにしていたのは [local-exec](https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec#example-usage) Provisioner でした。Provisionerというのは、Terraform側が用意した脱出ハッチのような仕組みで、任意のスクリプトをTerraformコマンド経由で呼び出せる機能です[^1]。[ドキュメント](https://developer.hashicorp.com/terraform/language/resources/provisioners/syntax#provisioners-are-a-last-resort)にも a Last Resort（最終手段）と書いてある奥の手です。

[^1]: 他にも `file` や `remote-exec` のProvisionerがあります。過去にはChef、Habitat、Puppet、Salt Masterless のProvisionerがあったようですが、 Terraform v0.15.0で削除されたようです。

通常は `terraform apply`で呼ばれるスクリプトを定義できますが、 `when=destory` と合わせると `terraform destroy` に対応させることもできます。さらにがんばるなら `null_resource`の`triggers` で実行スクリプトなどのハッシュ値を管理しておくことで、実行スクリプトに更新をトリガーにすることもできます（もちろん、実行スクリプトは冪等に作る必要があります）。書き出してみると複雑に見えますが、大部分は `local-exec` で初期作成時に呼び出すスクリプトを作れば事足りることが多いため、こだわらず簡易的にリソースをTerraform管理下に置くときは、よく使われると思います。

```tf local-execイメージ
resource "null_resource" "my_custom_resource" {
  # ...

  triggers = {
    my_custom_resource_id = "${sha256(file("my_custom_resource.sh"))}"
  }

  provisioner "local-exec" {
    command = "./my_custom_resource.sh create"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "./my_custom_resource.sh destroy"
  }
}
```

私の観測上、よく見るやり方としては、`local-exec` で一時的にしのぎ（AWSであれば`awscli`をラップしたシェルスクリプトを用意して）、Providerが新機能の追加されたタイミングで `local-exec` から Providerが提供する機能に置き換えていくというものです。GUIや個別のスクリプトを用意する方法と違い、 `terraform apply` で書く環境にリリースできるため、CI/CD定義もシンプルに、オペミスも減らせるということでした。

今回紹介するTerraCurlも、上記で説明した脱出ハッチ的な `local-exec`の使い方と似たようなユースケースになります。ネイティブのProviderではサポートされていないけど、サービス側のAPIではサポートされている場合に利用します。Provider側ですでにリソース作成が提供されていればTerraCurlを使う必要はありません。

## TerraCurlでAPI呼び出し

[TerraCurlドキュメントのExcample](https://registry.terraform.io/providers/devops-rob/terracurl/latest/docs/resources/request) を元に、Qiita APIを用いてダミーの記事を作成しています。Qiita記事をTerraform管理する対象したいユースケースは皆無だと思います。TerraCurlを使うという1点のみが理由です。

利用しているトークンは[アクセストークンの発行](https://qiita.com/settings/tokens/new)ページから取得します。`write_qiita` のスコープも必要です。

取得したQiitaトークンは環境変数にセットして参照できるようにしておきます。

```sh
export TF_VAR_qiita_token=xxxxxxxxxxxxxxx
```

```tf main.tf
terraform {
  required_providers {
    terracurl = {
      source  = "devops-rob/terracurl"
      version = "1.1.0"
    }
  }
}

provider "terracurl" {}

variable "qiita_token" {
  type      = string
  sensitive = true
}

resource "terracurl_request" "qiita_article" {
  name = "qiita-article"

  url          = "https://qiita.com/api/v2/items"
  method       = "POST"
  request_body = <<EOF
{"title":"TerraCurl投稿テスト2023.3.27", "body":"# Example\nTerraCurlやってみた", "private":true, "tags":[{"name":"TerraCurl"}]}
EOF

  headers = {
    Authorization = "Bearer ${var.qiita_token}"
    Content-Type  = "application/json"
  }
  response_codes = [
    201
  ]
}

output "qiita_article_response" {
  value = basename(jsondecode(terracurl_request.qiita_article.response).url)
}
```

実行すると最後に output の内容が表示されます。

```sh
$ terraform apply
2023-03-27T10:59:30.450+0900 [INFO]  Terraform version: 1.3.3
2023-03-27T10:59:30.522+0900 [INFO]  Go runtime version: go1.19.1
2023-03-27T10:59:30.527+0900 [INFO]  CLI args: []string{"terraform", "apply"}
(中略)

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # terracurl_request.qiita_article will be created
  + resource "terracurl_request" "qiita_article" {
      + destroy_retry_interval = 10
      + headers                = {
          + "Authorization" = (sensitive)
          + "Content-Type"  = "application/json"
        }
      + id                     = (known after apply)
      + method                 = "POST"
      + name                   = "qiita-article"
      + request_body           = jsonencode(
            {
              + body    = <<-EOT
                    # Example
                    TerraCurlやってみた
                EOT
              + private = true
              + tags    = [
                  + {
                      + name = "TerraCurl"
                    },
                ]
              + title   = "TerraCurl投稿テスト2023.3.27"
            }
        )
      + request_url_string     = (known after apply)
      + response               = (known after apply)
      + response_codes         = [
          + "201",
        ]
      + retry_interval         = 10
      + status_code            = (known after apply)
      + url                    = "https://qiita.com/api/v2/items"
    }

Plan: 1 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + qiita_article_response = (known after apply)

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

qiita_article_response = "6410f22e585d0907005e"
```

限定公開で記事を作成したのでブラウザで確認します。URLのIDが出力された値と一致していることがわかります。

<img src="/images/2023/20230328a/response.png" alt="" width="1200" height="924" loading="lazy">

※URLまでキャプチャに載せていますが、テスト投稿した記事は削除済みです

## Destoryする時どうするの？

Qiita APIの記事投稿に関して、IDは公開後に分かります（APIで指定すれば固定できるかも知れませんが）。そのため、以下のような `output` で取得した値を、`destory_url` に指定できると良いのですが、これは `terraform apply` に決定する値ですので、循環参照となり指定できません。このあたりはどうするか一工夫が必要そうです。

```tf
resource "terracurl_request" "qiita_article" {
  # 中略

  destroy_url    = "https://qiita.com/api/v2/items/${output.qiita_article_response.value}" // ★これが使えたら良いが..
  destroy_method = "DELETE"
  destroy_headers = {
      Authorization = "Bearer ${var.qiita_token}"
  }
```

## TerraCurl所感

ドキュメントを見ると、相互TLS認証やリトライなど作り込みが良さそうな部分が見られ、フィットするのであれば非常に有用そうでした。

一方で、ことAWSに関しては、 `awscli` が対応していない部分を探すのが難しく、`awscli` がサポートしているなら若干の移植性は下がるものの、 `local-exec` 経由で`awscli` を利用するほうが保守性が高まりそうだなと思いました。一方で、プラットフォーム側が意図的にサポートしない機能（ブログではVault Providerはあえて、クラスタのunsealコマンドをサポートしていないとある）の場合は、有用だなと思いました。

また、前章のDestoryにも書きましたが作成時のレスポンスに含まれる値を保持したいときの取り扱いは面倒そうと思います。Createだけの限定された条件とか、Destory時のURLやパラメータが apply する前に分かるのであれば便利そうだという印象です。

もし、上記に一致するような条件で、従来 `local-exec` で実行していたけど、内部的には `curl` コマンドだけだった場合には、 `tf` ファイルで完結するので素晴らしいツールだと思います。スクリプトを別途用意しなくてよいのは開発、保守的にも嬉しいと思います。

## まとめ

TerraCurlを使ってみました。ツールの命名が素晴らしくcurlで済ませられるようなリソースに関してはシンデレラフィットしそうなProviderです。

作成時のレスポンスの値を、Destory時などに使いまわしたい場合などは少し取り回しが難しそうなので、取り扱いに注意して導入したいと思います。
