---
title: "「リーダブルコード」を読んでTerraformの可読性について考える"
date: 2023/02/28 00:00:00
postid: a
tag:
  - Terraform
  - 書評
  - 読書
  - 可読性
  - リーダブルコード
category:
  - Infrastructure
thumbnail: /images/20230228a/thumbnail.jpg
author: 伊藤太斉
lede: "今回取り上げる書籍は、多くのエンジニアが通過するであろう、リーダブルコード についてです。Terraformと絡めて書いていければと思います。私は、俗にいうプログラミング言語に対しては明るくない方なので、自分が理解できうるTerraformにおいて考えたらどうなるか、について地震の頭の整理、理解のためにも本記事を書いてみました。"
---

<img src="/images/20230228a/top.jpg" alt="" width="400" height="565">

こんにちは。TIGの伊藤太斉です。

この記事は、[読書感想連載](/articles/20230217a/)の6日目です。

今回取り上げる書籍は、多くのエンジニアが通過するであろう、「[リーダブルコード](https://www.oreilly.co.jp/books/9784873115658/)」についてです。

最近、「[もし「リーダブルコード」を弁護士が読んだら？](https://tech.mntsq.co.jp/entry/2022/12/27/144435)」という記事をたまたま見かけて読んでみました。記事としては契約書にも同じことが言える、と自分が知らない世界でも使える部分はあるのだと読んでいました。そして、ふと考えてみると、「うちにも本があったじゃないか。しかも積読している。」と思い出し、今回積読解消の機会としてこの連載に参加しました。

リーダブルコードを書評や感想については既に多くの方が書いている内容があるので、今回はTerraformと絡めて書いていければと思います。私は、俗にいうプログラミング言語に対しては明るくない方なので、自分が理解できうるTerraformにおいて考えたらどうなるか、について地震の頭の整理、理解のためにも本記事を書いてみました。

## Terraformにおける「リーダブル」

Terraformは[HCL](https://github.com/hashicorp/hcl2)(HashiCorp **Configuration** Language, 現在はHCL2)に則って書かれている言語です。名前にConfigurationと含まれているくらい、「クラウドリソースをソースコードとして定義する」ことに長けた記法、ツールであるため、書籍に含まれている内容でなぞらえることが出来ない、難しいものもいくつかあります。

そのため、今回リーダブルコードの概要を元にTerraformについて考えるのではなく、私が一通り読んでみて、「これはTerraformにも言えることだろう」や「意識したほうがよりわかりやすくなるだろう」と思ったことを絞って紹介できればと思います。

## 章立て、概要

章立てについては[こちらのリンク](https://www.oreilly.co.jp/books/9784873115658/#:~:text=%E7%9B%AE%E6%AC%A1-,%E7%9B%AE%E6%AC%A1,-%E8%A8%B3%E8%80%85%E3%81%BE%E3%81%88%E3%81%8C%E3%81%8D%0A%E3%81%AF%E3%81%98%E3%82%81)より参照ください。

中身は多くの技術書のように、前の章に紐づいて順番に読み進める形ではなく、各章が独立しているため、「これは自分では意識できている」「すでに取り組めている」などの内容は読み飛ばすこともできます。また、終わりになるにつれてより改善するとして難しくなる内容になっていくので、チェックシート的に手前の章から確認していくのも良いと思いました。今回、私自身も「Terraformに生かせるところ」という目で読んだため、流し読みになっている部分も精読した部分もどちらもあります。

チームで購入して、ある章をテーマに議論したり、大事にしたいことを会話できるきっかけにできそうと思いました。

## 7章　制御フローを読みやすくする

ここで取り上げられている内容は、条件式やループなど、ソースコードを簡単にすることも複雑にすることもできることについて言及されています。
Terraformにおいては、if文やgotoなどは存在はしません。ですが、countやfor文、dynamic構文など繰り返し処理など通常のTerraformのリソース定義に追加できるfunctionsが存在します。これらについて考えていきます。

### count

countは、以下の例①のようにリソースを単純に複製する使い方はもちろん、例②のような使い方をすることで、リソースの作成要否を担うこともできます。

```sh
# 例①
resource "null_resource" "count" {
  count = 3
  provisioner "local-exec" {
    command = "echo \"これは${count.index}番目のリソースです。\""
  }
}

# 例②
resource "null_resource" "bool_count" {
  count = local.create_resource ? 1 : 0
  provisioner "local-exec" {
    command = "echo \"このリソースは${local.create_resource}なので、作成されます。\""
  }
}

locals {
  create_resource = true
}
```

書籍の中では三項演算子についても触れている節があり、Terraformでも同様に気をつけようと考えました。
例②では`create_resource`という変数にbool値を渡し、リソースを作るかどうかを決めています。ここではtrueを渡しているため、作成され、「このリソースはtrueなので、作成されます。」というテキストが出力されます。また、この書き方であれば変数も直接的で一通りソースを読むことで「いつ」必要な変数を渡すかがある程度明確になります。
一方、次のケースを見てみましょう。

```sh
resource "null_resource" "bool_count" {
  count = local.unnessesary_resource ? 0 : 1
  provisioner "local-exec" {
    command = "echo \"このリソースは${local.create_resource}の時に作成されます。\""
  }
}
```

変数を`unnessesary_resource`に変更しました。先ほどの例では変数は「必要ならtrueを」渡すため、肯定的な命名に対してtrueを渡すことであまり違和感がありません。しかし、この例では「不要であるならばtrueを」渡さないといけないため、否定に対して肯定をする、ような気持ち悪さを感じます。すごく。
このように、一回頭で考える時間を要する変数の作りになっていると、それだけで気持ち悪いものと感じました。変数や、その取り回しについては「直接的に、最終的にどうなるかわかりやすく」を考えるべきですね。ことわざの「名は体を表す」というのは言い得て妙だなと思いました。
ここで触れた、変数名、特にBoolについては「3.6　ブール値の名前」や「9章　変数と読みやすさ」で触れているので、こちらも合わせて読んでみてください。

### Dynamic構文
Terraformの`count`や`for_each`はリソースそのものを繰り返し、複数リソースを作成する際に利用します。一方、Dynamic構文についてはリソース内で同様の設定をするときに利用する構文です。以下の例ではdynamicを使ってセキュリティグループを作成します。

```sh
locals {
  ingress_web = {
    https = {
      description = "HTTPS from VPC"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = "10.0.0.0/8"
    }
    http = {
      description = "HTTP from VPC"
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = "192.168.0.0/16"
    }
  }
}

resource "aws_security_group" "web" {
  name        = "allow-web"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = { for i in local.ingress_web : i.protocol => i }
    content {
      description = ingress.value.description
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
  ...
}
```

例では、dynamicを単発で利用し、セキュリティグループのインバウンドを許可する設定をしています。（例は[Terraformerとしてコードを書いて思うこと](/articles/20211029a/)の例を一部改変したものです)この例であれば、dynamic内部のネストが深くならないため、当てはめていくパラメータも容易に想像がつきやすいものだと感じます。

一方、公式でも記載されているdynamicブロックを[複数ネストさせるケース](https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks#multi-level-nested-block-structures)をみてみます。(以下、公式より引用)

```sh
  dynamic "origin_group" {
    for_each = var.load_balancer_origin_groups
    content {
      name = origin_group.key

      dynamic "origin" {
        for_each = origin_group.value.origins
        content {
          hostname = origin.value.hostname
        }
      }
    }
  }
```

こちらはdynamicを2つ利用し、ネストが通常より深くなっています。

この場合は、ソースを見た時の理解がやや遅くなり、具体的に代入するパラメータの形式もわかりにくくなっています。「変数にはなるべく同じことを書かない」などのポリシーがある場合ではやむを得ないところがあるとは思います。この場合は変数の記載がいくらか重複させたとしてもネストを浅くすることでソースの可読性や流れが掴みやすくなると思います。
公式ドキュメントでも

> Overuse of dynamic blocks can make configuration hard to read and maintain,

と記載があるので、dynamicブロックの利用は用法・用量を守って使っていきましょう。
本の中では対象としている章以外にも、「8.5　例：複雑なロジックと格闘する」と合わせて読むと、理解や納得感が増すと感じました。

## まとめ

今回はリーダブルコードを読んでTerraformをどう見るか、応用するか、について考えてみました。元々Terraform自体が、

- このリソースについて記述する
- リソースに渡すパラメータは決まっている

など、自由度という意味ではある程度限られてきますが、とはいえ、繰り返し構文にあたる`for_each`や`count`をはじめとしたTerraformの「機能」として割り振られているものについてはリーダブルコードを読んだことで考えることがあるように感じました。
リーダブルコード自体は普段意識していることでも、気がついたら忘れてしまうような大事なことが多く書かれていると感じました。私は物理本で買いましたが、近くに手に取れるところに置き、時々見返しても良いなと思いました。
また、冒頭でも触れた弁護士の方が読んでも納得する部分があるということはつまるところ「言語」全般に対しても言えるのではと改めて感じたところでもありますので、リーダブルなソースだけではなく、リーダブルな日本語も書けるように日々積み重ねていければと思います。

明日の読書連載は川口さんの[マイクロサービスパターン MicroServicePatterns 実践的システムデザインのためのコード解説](/articles/20230301a/)です。
