---
title: "Terraformerとしてコードを書いて思うこと"
date: 2021/10/29 00:00:00
postid: a
tag:
  - Terraform
  - 設計
  - IaC
  - 可読性
category:
  - Infrastructure
thumbnail: /images/20211029a/thumbnail.png
author: 伊藤太斉
lede: "ここ最近はほぼ1からコード設計をして運用まで持っていくこともあり、「より腐りにくい、より息の長いコード」というものを考えるようになりました。Terraformだからこその「定期メンテを簡易にするためには」「より簡単に変更するためには」をひたすら突き詰めていった結果、アツい気持ちが生まれ、今回は筆を取っています。"
---

<img src="/images/20211029a/og-image-c18d275f.png" alt="" width="800" height="418">

こんにちは。TIGの[伊藤](https://twitter.com/kaedemalu)です。この記事は[秋のブログ週間2021](/articles/20211027a/)の3日目です。

## はじめに

私は普段会社でクラウドをまたいでTerraformを日々書いたり、メンバーに教えたりしています。もはや俗に言うプログラミング言語を書かずにここまで全振りしてきたくらいなので、比較的自信を持ってコードを書いて仕事をしています。

特にここ最近はほぼ1からコード設計をして運用まで持っていくこともあり、「より腐りにくい、より息の長いコード」というものを考えるようになりました。Terraformだからこその「定期メンテを簡易にするためには」「より簡単に変更するためには」をひたすら突き詰めていった結果、アツい気持ちが生まれ、今回は筆を取っています。

そんな私のアツい気持ちをしたためた今回の記事ですが、可能な限り例も添えつつ、いくつか解説できればと思います。公式にも実は載っているような内容もあったりしますが、日本語の記事としてぜひ生かしてください。

## 保守性の高いコード

私たちは、戦略立案から要件定義～開発～保守運用まで担当しますが、ある程度システムが安定してきますとグループ会社であるフューチャーインスペース、もしくは別の運用保守会社にお願いすることがあります。ということは、運用以降は私をはじめとした開発メンバーが書いたコードを知らない誰かが運用するということになります。

そのため、書いて満足、とか運用しながらリファクタリングしよう、と言うわけにはいきません。リリースの段階で完璧に運用に耐えうるコードを書かなければいけないのです。

ここで、保守性の高いコードとはなんでしょうか？私が考える、「Terraformにおける」保守性の高いコードとは

1. 最小限の変更で運用を可能にする
2. 変更に強いコード設計
3. 可読性

の3点があります。

Terraformは比較的学習コストが低く、導入と利用は簡単ですが、途中で破綻したりコードの管理が大変になりやすくなるものだと思っています。そのため、以下では、先に挙げた3つをベースとして既存のコードのアンチパターンな部分や、リファクタリングをするためのきっかけにしていただければと思います。

### 1. 最小限の変更で運用を可能にする
Terraformを運用に乗せて利用していく場合、インフラの組み替えなどしない限り、リソース内部のパラメータの変更が主たる内容だと思います。この運用を実践する上で大事だと考えているのは、「**どこを変更すれば良いか**」に尽きると思います。また、変更箇所が集中管理できればさらに運用は簡単になるかと思います。

ここで、Modulesを使ってリソースを開発することを1つの例として書いていきます。

早速Modulesのコードを以下のディレクトリ設計で示すことにします。

```sh
├── modules
│   └── web
│       ├── instance.tf
│       └── variable.tf
└── projects
    └── main.tf
```

`modules/web`配下の2ファイルについては以下であるとしましょう。

```sh modules/web/instance.tf
resource "aws_instance" "web" {
  ami           = var.ami
  instance_type = var.instance_type

  tags = {
    Name = "web-${var.project}"
  }
}
```

```sh modules/web/variable.tf
variable "ami" {
  description = "A string of AMI ID"
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "A string of Instance Type"
  type        = string
  default     = ""
}

variable "porject" {
  description = "A string of Project Name"
  type        = string
  default     = ""
}
```

modules内部ではリソースの宣言とそのリソースで利用する変数の定義します。この時、変数の型も定義できるので、長期的に運用する時にコードの変異を防ぐこともできます。
次に、`projects`配下のコードを書きます。

```sh projects/main.tf
module "ec" {
  source = "../modules/web"

  ami           = "ami-xxxxxxxxx"
  instance_type = "t3.micro"
  project       = "ecommerce"
}

module "backend" {
  source = "../modules/web"

  ami           = "ami-wwwwwwwwww"
  instance_type = "r5.large"
  project       = "backend"
}
```

`modules`配下で作ったwebモジュールをEC向けとBackendに展開しています。リソースで利用するパラメータが確定したら、modulesは原則として触らないようにせず、`projects/main.tf`をいじるだけで、リソースの更新が可能になります。この例ではEC向けには`module.ec`のブロックを、Backend向けであれば、`module.backend`のブロックを修正すればいいように明確なものになりました。
例は簡単なものにしましたが、さらに多くのリソースがある時、変更箇所が集約されていること、そして、変更しないといけないパラメータは共通化するなどして少なくすることで運用上のミスも軽減できると考えています。

#### 余談）ModulesとWorkspacesの違い
たまにModulesとWorkspacesを比較して語られることが多いですが、この2つは似て非なるものです。流派としても分かれて語られることもあります。

* 参考：[Terraformのベストなプラクティスってなんだろうか](https://future-architect.github.io/articles/20190903/)

WorkspacesはTerraformのStateを分割する方法として紹介されており、公式ドキュメントにもStateのドキュメントの1つとして紹介されています。思想としては、「単一のコードで複数のStateに分割して管理できる」があります。

一方、Modulesについては、特定のサービスのブロックとして利用され、一緒に使われるリソース群をまとめて管理することがベースになっています。最近で言うところのマイクロサービスに近い思想だと考えています。Modules内部はリソースをreferさせて密結合にする一方、他のModulesとは特定のoutpusでパラメータを渡し合い、疎結合に組むと次に述べる変更に強いコードになります（本記事では割愛します）。

### 2. 変更に強いコード設計
上記の最小限の変更で運用していても、時には破壊的な変更をしなければならない時があります。とはいえ、巻き添えを食らってしまうリソースは最小限に抑えられるコードを書く必要があります。

TerraformにはLoop処理として、countとfor_each(for)と大きく2つの機能が備わっています。これらを使い分けることで、リソースの管理も容易にし、かつ変更に強いコードも作ることが可能になります。

#### count
countは以下のように1つのコードから複数のリソースを生み出す時に大いに役に立ちます。

```sh
resource "aws_instance" "web" {
  count         = 5                 # 5台EC2インスタンスを立てるようにする
  ami           = "ami-xxxxxxxxx"
  instance_type = "t3.micro"

  tags = {
    Name = "web-${count.index + 1}" # countで取れる値をインスタンス名に埋め込む
  }
}
```

```sh
# 作成後のリソース一覧
$ terraform state list
aws_instance.web[0]
aws_instance.web[1]
aws_instance.web[2]
aws_instance.web[3]
aws_instance.web[4]
```

また、特定の環境においてリソースの作成の有無を決定したい場合にも利用できます。

```sh
locals {
  crate_zone = true
}

resource "aws_route53_zone" "this" {
  count = local.create_zone ? 1 : 0 # trueが渡されると1になる
  name  = "dev.example.com"

  tags = {
    System = "EC"
  }
}
```
```shell
$ terraform state list
aws_route53_zone.this[0]
```

このように単純なリソース作成やスイッチであればとても便利なcountですが、以下のコードではどうでしょうか？

```sh
locals {
  azs = [
    "ap-northeast-1a",
    "ap-northeast-1b",
    "ap-northeast-1c",
  ]
}

resource "aws_instance" "web" {
  count             = length(local.azs) # AZの数だけEC2インスタンスを立てるようにする
  ami               = "ami-xxxxxxxxx"
  instance_type     = "t3.micro"
  availability_zone = element(local.azs, count.index)

  tags = {
    Name = "web-${element(local.azs, count.index)}"
  }
}
```

```sh
$ terraform state list
aws_instance.web[0]
aws_instance.web[1]
aws_instance.web[2]
```

上記のコードを書いた時に、「アベイラビリティゾーンの分だけインスタンスを作成する」という意味合いはとてもよくわかるコードになっていると思います。しかし、ゾーンBを廃止にしたい場合、localsを修正してapplyしてしまうと、`aws_instance.web[1]`のリソース（ゾーンBのインスタンス）が削除されるとともに、`aws_instance.web[2]`のリソース（ゾーンCのインスタンス）が`aws_instance.web[1]`になろうとしてしまいます。もちろん、事前に`terraform state mv`などを実行してリソース名を変更しておけば避けられる話ではありますが、破壊的変更の度にこの対応は難しいでしょう。

ここで上記のような運用時におけるリスクを少しでも減らすために、for_eachを使ってリファクタリングしてみます。

```sh
locals {
  azs = [
    "ap-northeast-1a",
    "ap-northeast-1b",
    "ap-northeast-1c",
  ]
}

resource "aws_instance" "web" {
  for_each          = toset(local.azs) # AZの数だけEC2インスタンスを立てるようにする
  ami               = "ami-xxxxxxxxx"
  instance_type     = "t3.micro"
  availability_zone = each.value

  tags = {
    Name = "web-${each.value}"
  }
}
```

```shell
$ terraform state list
aws_instance.web["ap-northeast-1a"]
aws_instance.web["ap-northeast-1b"]
aws_instance.web["ap-northeast-1c"]
```

countでは配列として見なされているため、間のリソースがなければ空白を詰めるような動きになりますが、for_eachを使うと、loopさせる対象をキーとして持つため、上記のようなゾーンBのみを削除したいケースが出てきても、ゾーンCは繰り上げされず、破壊的変更も起こらずにすみます。また副次的な効果ですが、パラメータを渡す時も少しだけきれいになります。

countは理解しやすく、かつ簡単に使えるために、リソースの複製に安易に使ってしまいがちです。しかし、将来的な変更まで考えるとfor_eachを使った方が運用しやすいコードであると言えるでしょう。

### 3. 可読性
どの言語でも言えますが、自分が読んで流れの掴める状態ではなく、別の人が読んでも処理が追えるよう可読性は大事なことです。Terraformは基本的に各リソースがCLIコマンドで渡す引数に対応しているので、俗にいうプログラミング言語にあたるものよりは読みやすいコードだと思います。とはいえ、表現が冗長とか、効率的なコードではない、などもあります。

ここではTerraformのFunctionsの中から`dynamic`ブロックを使い、冗長になりそうなリソースのコード量を削減し、かつ発生しうる変更箇所を最小限に抑え、メンテナンスしやすいコードを目指しましょう。

ここで例とするのはAWSのセキュリティグループです。後述しますが、冗長にも書くことができるし、より効率的に書くことも可能なリソースです。まずはそのまま書いた時の例を見てみましょう。

```sh
resource "aws_security_group" "web" {
  name        = "allow-web"
  vpc_id      = aws_vpc.main.id

  ingress = [
    {
      description      = "HTTPS from VPC"
      from_port        = 443
      to_port          = 443
      protocol         = "tcp"
      cidr_blocks      = ["10.0.0.0/8"]
    }
  ]

  ingress = [
    {
      description      = "HTTP from VPC"
      from_port        = 80
      to_port          = 80
      protocol         = "tcp"
      cidr_blocks      = ["192.168.0.0/16"]
    }
  ]

  egress = [
    {
      from_port        = 0
      to_port          = 0
      protocol         = "-1"
      cidr_blocks      = ["0.0.0.0/0"]
    }
  ]

  tags = {
    Name = "allow-web"
  }
}
```

`ingress`の部分が2つ繰り返しており、さらにdescription別のingressを追加するとなると、さらにコードが長くなってしまいます。セキュリティグループのリソースは往々にして複雑になりがちなので、抜け漏れを防ぐためにも管理する箇所をまとめましょう。

ここで`dynamic`ブロックを利用します。例として、上のコードをリファクタリングします。

```sh
locals {
  ingress_web = [
  # [description, from_port, to_port, protocol, cidr_blocks]
    ["HTTPS from VPC", 443, 443, "tcp", "10.0.0.0/8"],
    ["HTTP from VPC", 80, 80, "tcp", "192.168.0.0/16"],
  ]
}

resource "aws_security_group" "web" {
  name        = "allow-web"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.ingress_web
    content {
      description = ingress.value[0]
      from_port   = ingress.value[1]
      to_port     = ingress.value[2]
      protocol    = ingress.value[3]
      cidr_blocks = ingress.value[4]
    }
  }

  egress = [
    {
      from_port        = 0
      to_port          = 0
      protocol         = "-1"
      cidr_blocks      = ["0.0.0.0/0"]
    }
  ]

  tags = {
    Name = "allow-web"
  }
}
```

localsに各ingressのブロックに入れる変数をまとめました。リファクタリング後はlocalsに順番に従ってルールを書くだけで、ingressの追加ができるようになりました。dynamicブロックのメリットは、記述量が減ること以外にもあり、変数を省力化することもできます。

dynamicブロックを使う前であれば。`from_port`向けの変数、`to_port`向けの変数などどうしても変数が増えてしまいますが、dynamicブロックでまとめることで、変数をまとめてテンプレート化し、変更箇所を最小限に抑えることもできます。

一方、dynamicブロックの入れ子も可能であるため、3つ以上ネストさせてdynamicを使わない、過剰に使いすぎないなども[公式](https://www.terraform.io/docs/language/expressions/dynamic-blocks.html#best-practices-for-dynamic-blocks)で言及されているので、用法・用量は塩梅をみながら使いましょう。

## 最後に
いかがだったでしょうか？ 常日頃Terraformに慣れ親しんでいて、想いの丈を書いてみました。

Terraformの機能群を理解することで、より堅牢で効率的な開発をすることができます。

SREや、同じように日々Terraformを書いている方は共感できることもあったら幸いです。

[秋のブログ週間2021](/articles/20211027a/)の3日目でした。
