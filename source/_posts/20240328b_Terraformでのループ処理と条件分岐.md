---
title: "Terraformでのループ処理と条件分岐"
date: 2024/03/28 00:00:01
postid: b
tag:
  - Terraform
  - 初心者向け
category:
  - Programming
thumbnail: /images/20240328b/thumbnail.png
author: 小林弘樹
lede: "Terraformでは似たリソースを複数構築する際に、ループ処理や条件分岐を利用することで、コードの冗長化を防ぎ、可読性や保守性を上げることができます。初心者目線で「Terraformのコードをスマートに書きたい！」というモチベーションのもと本記事を書いてみました。"
---

<img src="/images/20240328b/top.png" alt="" width="800" height="527">

## はじめに

はじめまして！TIG DXチームの小林と申します。

Terraformでは似たリソースを複数構築する際に、ループ処理や条件分岐を利用することで、コードの冗長化を防ぎ、可読性や保守性を上げることができます。

私自身まだTerraform歴半年ですが、初心者目線で「Terraformのコードをスマートに書きたい！」というモチベーションのもと本記事を書きました。

## サマリ

### ループ処理

| 方法    | 分類 | 主な用途（個人的なイメージ） |
| --------- | -- | ------- |
| [count](https://developer.hashicorp.com/terraform/language/meta-arguments/count) | メタ引数 | ・開発や検証用などで簡単なリソースを複数個作りたい場合 <br> ・将来的に数が増減しないようなリソースを作る場合 |
| [for_each](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each) | メタ引数 | ・ループ処理で複数リソースを作りたい場合は基本こちら |
| [for](https://developer.hashicorp.com/terraform/language/expressions/for) | 式 | ・フィルタリング機能を利用して条件によってリソース構築を制御したい場合 <br> ・既存の設定値や構築済リソースから任意のリストやマップを取得したい場合 <br> ・その他使ったら幸せになれる場合 |
| [dynamic block](https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks) | 式 | ・resource block内で同一のブロックを複数定義する場合 <br> ・可読性や保守性が落ちないことが明確な場合 |

### 条件分岐

| 方法      | 分類 | 主な用途（個人的なイメージ） |
| --------- | -- | --------- |
| [三項演算子](https://developer.hashicorp.com/terraform/language/expressions/conditionals) | 式 | ・条件分岐を行いたい場合は基本こちら |
| [for_each](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each) と [for](https://developer.hashicorp.com/terraform/language/expressions/for) を併用 | - | ・forループ内の要素の特定条件でリソースを作り分ける場合 |

## 構築するリソース（ベース）

本記事で構築するリソースはこちらです。

AWS上に10.10.0.0/16 のVPC1つと、10.10.0.0/24 ～ 10.10.3.0/24 でサブネットを計4つ（public2つ、private2個想定）を各パターンで作成していきます。

まずはベースとして、シンプルにresource blockを羅列したものを記載しています。
（以降、サブネット部分の処理がメインのため、VPC部分の記述は省略します。）

```sh
resource "aws_vpc" "test-vpc" {
  cidr_block        = "10.10.0.0/16"
}

resource "aws_subnet" "public-1" {
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, 0)
}

resource "aws_subnet" "public-2" {
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, 1)
}

resource "aws_subnet" "private-1" {
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, 2)
}

resource "aws_subnet" "private-2" {
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, 3)
}
```

参考：[cidrsubnet](https://developer.hashicorp.com/terraform/language/functions/cidrsubnet)



## ループ処理(count)

`count`を利用すると、このように書くことができます。

`count = x`とカウント回数を定義し、`count.index` で0からx回カウントアップする引数を指定できます。

```sh
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, count.index)
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, count.index + 2)
}
```

publicとprivateの区別が無ければ、`count = 4`としてresource blockを1つで全サブネットを構築可能ですが、可読性や保守性が落ちるため分けています。

さて、ここでpublicのサブネットを1つ増やしたくなった場合はどうすれば良いでしょうか。

簡単な話ではありますが、以下のように`count`の値を3に修正することで、増やすことができます。

```sh
resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, count.index)
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, count.index + 3)
}
```

しれっと修正しましたが、privateの方の `count.index + 2`も`count.index + 3`としています。

これを忘れると、以下のようなCIDRブロックのコンフリクトエラーが起きます。

> Error: creating EC2 Subnet: InvalidSubnet.Conflict: The CIDR '10.10.2.0/24' conflicts with another subnet 

countの使いづらいところは主にここだと思っています。数を増減させたいときに`count.index`の値の変動がどこまで影響するか、大規模や複雑なリソースでは把握が難しく、保守性が低下します。

また、`index`とあるように、`count`を利用して構築したリソースは配列として管理されます。

tfstateを覗いてみると、`index_key`というキーの値が0や1などの数値で存在します。

```json
 {
  "mode": "managed",
  "type": "aws_subnet",
  "name": "public",
  "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
  "instances": [
    {
      "index_key": 0,
（後略）
```

これは、`index`の途中（↑のpublicサブネットで言うと`count.index`が1のサブネット）が削除された場合に、その後のリソースが全て作り直しになることを意味します。

ここも`count`の不便なところで、将来的に数が増減するようなリソースを構築する際は向いていません。

## ループ処理(for_each)

`count`の不便なところを解決したのが`for_each`だと思います。

`for_each`を使うと以下のように書くことができます。

[set](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#set)や[map](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#map)を定義して、その要素の数だけリソースを構築することができます。

setやmapの値は`each.key`（setの値やmapのkey）や`each.value`（setの値やmapのvalue）を使って各変数に定義できます。（＝setを使う場合は`each.key`と`each.value`は同じになります。）

mapが多重構造になっている場合は、以下のように`each.value.xxx`と書くことで変数に定義できます。

```sh
resource "aws_subnet" "subnet" {
  for_each = tomap({
    public-1a = {
      az     = "ap-northeast-1a"
      netnum = 0
    },
    public-1c = {
      az     = "ap-northeast-1c"
      netnum = 1
    },
    private-1a = {
      az     = "ap-northeast-1a"
      netnum = 2
    },
    private-1c = {
      az     = "ap-northeast-1c"
      netnum = 3
    },
  })
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = each.value.az
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, each.value.netnum)
}
```

可読性も比較的保たれたまま、resource blockを1つで書くことができました！

もちろん、publicとprivateでresource blockを分けても良いです。`count`と違い、リソースを増減させたい場合はmapに要素を追加するだけで良く、かつkeyで管理されているので既存のリソースに影響が及びません。

また`for_each`は複数の属性をループで回せて便利なので、`az`もループに含めてマルチAZ構成も実現しています。

## ループ処理(for)

後述する`dynamic block`も同様ですが、`count`や`for_each`と違って`for`は「式」です。誤解を恐れず簡単に言うと、そもそもリソースを複数作るためのものではないということです。

具体的には、`for`は[list](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#list), [set](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#set), [tuple](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#tuple), [map](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#map), [object](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#object)を入力として、[tuple](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#tuple)もしくは[object](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#object)を出力するものです。そのため使い方は多様ですが、個人的に嬉しい使い方を2つ記載します。

### 使い方① 特定条件でフィルタリングしてリソースを構築する

構築するリソースが増えてくると、tfファイルの数やコードの行数が多くなって管理が大変でしょう。

そんな時は`local values`に各設定値を一元的に記載しておくと管理しやすくなるかもしれません。

以下の例は無理やり`for`を使いに行ってるので良い例ではありませんが、`local values`に条件となる値を設定しておき、resource blockではその条件によって構築や設定をするかを振り分ける、ということが可能です。

```sh
locals {
  subnet = {
    public-1a = {
      public = true
      az     = "ap-northeast-1a"
      netnum = 0
    },
    public-1c = {
      public = true
      az     = "ap-northeast-1c"
      netnum = 1
    },
    private-1a = {
      public = false
      az     = "ap-northeast-1a"
      netnum = 3
    },
    private-1c = {
      public = false
      az     = "ap-northeast-1c"
      netnum = 4
    },
  }
}

resource "aws_subnet" "public" {
  for_each          = { for key, value in local.subnet : key => value if value.public == true }
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = each.value.az
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, each.value.netnum)
}

resource "aws_subnet" "private" {
  for_each          = { for key, value in local.subnet : key => value if value.public == false }
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = each.value.az
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, each.value.netnum)
}
```

参考：[Local Values](https://developer.hashicorp.com/terraform/language/values/locals)

### 使い方② あるリソースの特定の設定値一覧を取得する

例えばprivateサブネットからのみアクセス可能としたいリソース（EC2など）を構築し、そのセキュリティグループを構築するような場合を考えます。

サブネットは将来的に増減する可能性があり、それらのCIDRブロックを反映させて適切なインバウンドルールを設定する必要があります。

以下の`local.allow_cidr_block`のように記載することで、publicサブネットとprivateサブネットのCIDRブロック一覧が簡単に取得できます。

```sh
locals {
  subnet = {
    public = {
      public-1a = {
        az     = "ap-northeast-1a"
        netnum = 0
      },
      public-1c = {
        az     = "ap-northeast-1c"
        netnum = 1
      },
    },
    private = {
      private-1a = {
        az     = "ap-northeast-1a"
        netnum = 2
      },
      private-1c = {
        az     = "ap-northeast-1c"
        netnum = 3
      },
    },
  }
  allow_cidr_block = {
    public = [
      for k, v in local.subnet.public :
      aws_subnet.public[k].cidr_block
    ]
    private = [
      for k, v in local.subnet.private :
      aws_subnet.private[k].cidr_block
    ]
  }
}

resource "aws_subnet" "public" {
  for_each          = local.subnet.public
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = each.value.az
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, each.value.netnum)
}

resource "aws_subnet" "private" {
  for_each          = local.subnet.private
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = each.value.az
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, each.value.netnum)
}

resource "aws_security_group" "private_resource" {
  vpc_id = aws_vpc.test-vpc.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = local.allow_cidr_block.private
  }
}
```

## ループ処理(dynamic block)

`count`や`for_each`がresource blockを複数作成するときに利用したのに対し、`dynamic block`はresource block内のブロックを複製するときに利用できます。

例えば、`for`の使い方②で述べたようなセキュリティグループを構築する場合で、publicとprivate両方のサブネットからアクセス可能なセキュリティグループを作りたいとします。

この場合は、`ingress`のブロックを複製すると簡単に構築できるため、以下のように`dynamic block`が利用して書くことができます。

```sh
locals {
  subnet = {
    public = {
      public-1a = {
        az     = "ap-northeast-1a"
        netnum = 0
      },
      public-1c = {
        az     = "ap-northeast-1c"
        netnum = 1
      },
    },
    private = {
      private-1a = {
        az     = "ap-northeast-1a"
        netnum = 2
      },
      private-1c = {
        az     = "ap-northeast-1c"
        netnum = 3
      },
    },
  }
  allow_cidr_block = {
    public = [
      for k, v in local.subnet.public :
      aws_subnet.public[k].cidr_block
    ]
    private = [
      for k, v in local.subnet.private :
      aws_subnet.private[k].cidr_block
    ]
  }
}

resource "aws_subnet" "public" {
  for_each          = local.subnet.public
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = each.value.az
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, each.value.netnum)
}

resource "aws_subnet" "private" {
  for_each          = local.subnet.private
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = each.value.az
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, each.value.netnum)
}

resource "aws_security_group" "public_resource" {
  vpc_id = aws_vpc.test-vpc.id
  dynamic "ingress" {
    for_each = local.allow_cidr_block
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ingress.value
    }
  }
}
```

ただし、`dynamic block`は冒頭の説明でも述べた通り「resource block内のブロック」を複製するもので、単純なkey : value の形で定義する変数では利用できなかったりと、使い方が限定的です。（本記事では主にサブネットを複製してきましたが、サブネットの複製にdynamic blockは使えません。）

もう少しだけ`dynamic block`の使い道を考えます。

実践ではセキュリティグループは1個ということは基本ありえず、様々なリソース用に色々なセキュリティグループを構築することになるでしょう。

また、それぞれのセキュリティグループにはルールはいくつか存在し、CIDRブロックでなくセキュリティグループがソースになったり、ポートやプロトコルが異なっていたりもするでしょう。そうなると、以下のように全ての設定値を`local values`にmapとしてまとめておくのが良いでしょう。（長くなるのでサブネット部分の記述も省略しました。）

```sh
locals {
  subnet = {
    public = {
      public-1a = {
        az     = "ap-northeast-1a"
        netnum = 0
      },
      public-1c = {
        az     = "ap-northeast-1c"
        netnum = 1
      },
    },
    private = {
      private-1a = {
        az     = "ap-northeast-1a"
        netnum = 2
      },
      private-1c = {
        az     = "ap-northeast-1c"
        netnum = 3
      },
    },
  }
  allow_cidr_block = {
    public = [
      for k, v in local.subnet.public :
      aws_subnet.public[k].cidr_block
    ]
    private = [
      for k, v in local.subnet.private :
      aws_subnet.private[k].cidr_block
    ]
  }
  security_group = {
    ec2_a = {
      ingress_1 = {
        from_port       = 22
        to_port         = 22
        protocol        = "tcp"
        cidr_blocks     = local.allow_cidr_block.private
        security_groups = null
      },
      ingress_2 = {
        from_port       = 80
        to_port         = 80
        protocol        = "tcp"
        cidr_blocks     = null
        security_groups = [aws_security_group.alb.id]
      }
    }
    ec2_b = {
      ingress_1 = {
        from_port       = 22
        to_port         = 22
        protocol        = "tcp"
        cidr_blocks     = local.allow_cidr_block.private
        security_groups = null
      }
    }
  }
}

resource "aws_security_group" "ec2_a" {
  vpc_id = aws_vpc.test-vpc.id
  dynamic "ingress" {
    for_each = local.security_group.ec2_a
    content {
      from_port       = ingress.value.from_port
      to_port         = ingress.value.to_port
      protocol        = ingress.value.protocol
      cidr_blocks     = ingress.value.cidr_blocks != null ? ingress.value.cidr_blocks : null
      security_groups = ingress.value.security_groups != null ? ingress.value.security_groups : null
    }
  }
}

resource "aws_security_group" "ec2_b" {
  vpc_id = aws_vpc.test-vpc.id
  dynamic "ingress" {
    for_each = local.security_group.ec2_b
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks     = ingress.value.cidr_blocks != null ? ingress.value.cidr_blocks : null
      security_groups = ingress.value.security_groups != null ? ingress.value.security_groups : null
    }
  }
}
```

...なんとか書けました。

ご覧の通り`cidr_blocks`と`security_groups`はどちらかのみ設定するため、それを実現させるために後述する`三項演算子`を用いたり、`local values`にもわざわざnullとして定義しています。

さて、ループ処理の目的である`コードの冗長化を防ぎ、可読性や保守性を上げる`ことはできたでしょうか。`dynamic block`を使わずにシンプルに`ingress`のブロックを羅列しても行数はむしろ減りますし、ループや条件分岐がなくなる分、可読性や保守性も上がりそうです。

ちなみに[公式のベストプラクティス](https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks#best-practices-for-dynamic-blocks)でも`dynamic block`の使い過ぎは推奨されておらず、モジュールの再利用を目的としてシンプルな構成にしたいような場合に、利用することを推奨しています。

このため、`dynamic block`は可読性や保守性を考えて慎重に利用するのが良いと思われます。


## 条件分岐(三項演算子)

Terraformでは条件分岐を行いたい場合は基本1通りで、この三項演算子を利用します。

構文は以下の通りで、`condition`に記載した条件がtrueなら`true_val`が、falseなら`false_val`が採用されます。
> condition ? true_val : false_val

参考：[Conditional Expressions](https://developer.hashicorp.com/terraform/language/expressions/conditionals#syntax)

簡単な例では、環境ごとにリソースの数を変えるような場合があります。

例えば本番環境は冗長化したいのでマルチAZで構築するが、開発/検証環境はシングルAZで良い場合などに、環境名ごとにcountの値を変えるような操作が可能です。
以下のように書くことで、環境名（`local.env`）の値を変えるだけで本番環境と開発/検証環境で、リソース数の切り替えができます。

```sh
locals {
  env = "prod"
  az = [
    "ap-northeast-1a",
    "ap-northeast-1c",
    "ap-northeast-1d"
  ]
}

resource "aws_subnet" "public" {
  count             = local.env == "prod" ? 2 : 1
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = local.az[count.index]
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, count.index)
}

resource "aws_subnet" "private" {
  count             = local.env == "prod" ? 2 : 1
  vpc_id            = aws_vpc.test-vpc.id
  availability_zone = local.az[count.index]
  cidr_block        = cidrsubnet(aws_vpc.test-vpc.cidr_block, 8, count.index + 2)
}
```

## 条件分岐(for_each と for を併用)

こちらは、`for`の部分で記載したものの再掲となります。

Terraformに一般的なプログラミング言語でいうif文はありませんが、`for`文の中のifによってループ処理の中で条件分岐を行うことができます。

使い方は[for（使い方① 特定条件でフィルタリングしてリソースを構築する）](#%E4%BD%BF%E3%81%84%E6%96%B9%E2%91%A0-%E7%89%B9%E5%AE%9A%E6%9D%A1%E4%BB%B6%E3%81%A7%E3%83%95%E3%82%A3%E3%83%AB%E3%82%BF%E3%83%AA%E3%83%B3%E3%82%B0%E3%81%97%E3%81%A6%E3%83%AA%E3%82%BD%E3%83%BC%E3%82%B9%E3%82%92%E6%A7%8B%E7%AF%89%E3%81%99%E3%82%8B)をご参照ください。

# 最後に
Terraformにおけるループ処理と条件分岐をまとめました。

自分も例外ではなく、初心者はまずTerraformの構文に慣れるところが難しいかと思います。

本記事が同じようなTerraform初心者の一助となれば幸いです。
