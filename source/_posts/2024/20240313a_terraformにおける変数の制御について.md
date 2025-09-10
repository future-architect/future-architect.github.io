---
title: "Terraform連載2024 Terraformにおける変数の制御について"
date: 2024/03/13 00:00:00
postid: a
tag:
  - Terraform
category:
  - DevOps
thumbnail: /images/2024/20240313a/thumbnail.png
author: 森大作
lede: "Terraformにおける変数を、構築するインフラの要件に合わせてどのように制御していくかについてお話していきたいと思います。Terraformにおける変数制御は、構築するインフラの要件を明確化させる上で重要になってきます。そこで今回はどんな変数制御があるか、ユースケースを踏まえて見ていきたいと思います。"
---

<img src="/images/2024/20240313a/terraform_top.png" alt="" width="900" height="628">

[Terraform 連載2024](/articles/20240311a/)の3本目です。

# はじめに

はじめまして。フューチャーキャリア入社1年半の森と申します。

Terraformにおける変数を、構築するインフラの要件に合わせてどのように制御していくかについてまとめます。

Terraformにおける変数制御は、構築するインフラの要件を明確化させる上で重要です。そのため、どのような変数制御があるか、ユースケースを踏まえ見ていきます。

## Terraformの変数制御

Terraformには型による制約の他に、下記3種類の変数の制御方法があります。

- validation : 変数の**静的な事前チェック**を実施する
- precondition(v1.2以降) : 変数の**動的な事前チェック**を実施する
- postcondition(v1.2以降) : 変数の**動的な事後チェック**を実施する

静的・動的の可不可や、事前・事後のチェックなどの違いがありますが、図にするとこのような感じです。

|| 動的チェック | 事前チェック |事後チェック|
|---| ---- | ----- |----|
|validation| 不可 | 可 |不可|
|precondition| 可 | 可 |不可|
|postcondition| 可 | 不可|可|

具体的に1つずつ確認していきましょう。

## validationについて

`validation`は3つの変数制御の中でも最もシンプルで簡単な制御の方法です

例えば、AWSのEC2でEBSを暗号化したい場合、以下のように`validation`ブロックを暗号化の有無に関する変数に追加します。

このブロックの`condition`の内容で真偽を判定し、偽の場合`error_message`で指定のエラーメッセージを出力できます。

```tf
resource "aws_instance" "example" {
  ami           = "ami-020283e959651b381"
  instance_type = "t2.micro"
  subnet_id     = "subnet-xxxxxxx"

  ebs_block_device {
    device_name = "/dev/sdh"
    encrypted   = var.ebs_encryption
  }
}

variable "ebs_encryption" {
  type = bool
  validation {
    condition     = var.ebs_encryption == true
    error_message = "EBS Should Be Encrypted"
  }
  description = "A Boolean of EBS Encryption in the EC2 Instances"
}
```

`ebs_encryption`に`false`を指定した場合、`terraform plan`時に`validation`ブロックで指定した下記のエラーメッセージが出されます。

```sh
╷
│ Error: Invalid value for variable
│
│   on variables.tf line 1:
│    1: variable "ebs_encryption" {
│     ├────────────────
│     │ var.ebs_encryption is false
│
│ EBS Should Be Encrypted
│
│ This was checked by the validation rule at variables.tf:3,3-13.
```

このように`condition`に条件式を書いておくことで、誤ってEBSの暗号化を無効にする事のないように事前にチェックをしてくれるのが`validation`の特徴です。

### validationのユースケース

構築したいインフラに対して、あらかじめ変数の条件をハードコードすることで制約を課したい場合に`validation`ブロックが使えます。

## preconditionについて

上述の`validation`で課すことのできる制約は静的な条件に限りました。つまり、全て条件式にハードコードして制御する必要があり、動的にAWSから情報を取得して条件を絞ることは不可能でした。

これを解決したのがTerraform v1.2から追加された`precondition`です。例えば、EC2のインスタンスタイプを無料利用枠のみに制限したい場合、`aws_ec2_instance_type`データソースから最新の無料利用枠の情報をAWSから取得し、インスタンス構築の際の条件に課すことが可能です。

`lifecycle`ブロック内に`precondition`ブロックを作成し、`condition`の条件で真偽を判定し、偽の場合に`error_message`に記載されているメッセージを出力できます。

```tf
data "aws_ec2_instance_type" "example" {
  instance_type = "c5.xlarge"
}

resource "aws_instance" "example" {
  ami           = "ami-0f7b55661ecbbe44c"
  instance_type = data.aws_ec2_instance_type.example.instance_type
  subnet_id     = "subnet-xxxxxxxxxx"
  lifecycle {
    precondition {
      condition     = data.aws_ec2_instance_type.example.free_tier_eligible
      error_message = "This instance type is not free in AWS"
    }
  }
}
```

上記のようにインスタンスタイプを`c5.xlarge`(無料利用枠でないインスタンスタイプ)でplanを流してみるとどうなるでしょうか？

```sh
╷
│ Error: Resource precondition failed
│
│   on main.tf line 18, in resource "aws_instance" "example":
│   18:       condition     = data.aws_ec2_instance_type.example.free_tier_eligible
│     ├────────────────
│     │ data.aws_ec2_instance_type.example.free_tier_eligible is false
│
│ This instance type is not free in AWS
```

指定のエラーメッセージとともに無事？ planが通らなくなりました。(当然、applyもできません。)

このように`validation`と違って動的な変数の制御を可能にするのが`precondition`の特徴です。

### preconditionのユースケース

`validation`でハードコーディングするのが難しい場合に使うのが良いでしょう。

最新のAWSからの情報が常に反映されるため、より安定的なチェックが実施できます。

## postconditionについて

`varidation`や`precondition`はapply前に変数をチェックする**事前チェック**でした。一方で`postcondition`は、**applyの後にエラーを追跡**する事後チェックが可能です。

例としてオートスケーリンググループを作成する際、AZが２つ以上あるかどうかをチェックしたい場合を考えます。書き方は`precondition`と同様で、`postcondition`ブロックの`condition`でAZの数が1よりも大きくない場合に指定のエラーメッセージを出力するようにします。

```tf
resource "aws_launch_configuration" "example" {
  image_id      = "ami-020283e959651b381"
  instance_type = "t2.micro"
}

resource "aws_autoscaling_group" "example" {
  name                 = "ASG"
  launch_configuration = aws_launch_configuration.example.name
  vpc_zone_identifier  = ["subnet-xxxxxxx"]
  min_size             = 1
  max_size             = 1

  lifecycle {
    postcondition {
      condition     = length(self.availability_zones) > 1
      error_message = "You need to choose more than 1 AZ to ensure high availability"
    }
  }
}
```

planをしてみましょう。この時点でAZは`known after apply`とあるので、エラーは捕捉されずにplan自体は通ります。

```sh
Terraform will perform the following actions:

  # aws_autoscaling_group.example will be created
  + resource "aws_autoscaling_group" "example" {
      + arn                              = (known after apply)
      + availability_zones               = (known after apply)
      + default_cooldown                 = (known after apply)
      + desired_capacity                 = (known after apply)
      + force_delete                     = false
      + force_delete_warm_pool           = false
      + health_check_grace_period        = 300
      + health_check_type                = (known after apply)
      + id                               = (known after apply)
      + ignore_failed_scaling_activities = false
      + launch_configuration             = (known after apply)
      + load_balancers                   = (known after apply)
      + max_size                         = 1
      + metrics_granularity              = "1Minute"
      + min_size                         = 1
      + name                             = "ASG"
      + name_prefix                      = (known after apply)
      + predicted_capacity               = (known after apply)
      + protect_from_scale_in            = false
      + service_linked_role_arn          = (known after apply)
      + target_group_arns                = (known after apply)
      + vpc_zone_identifier              = [
          + "subnet-xxxxxxx",
        ]
      + wait_for_capacity_timeout        = "10m"
      + warm_pool_size                   = (known after apply)
    }

  # aws_launch_configuration.example will be created
  + resource "aws_launch_configuration" "example" {
      + arn                         = (known after apply)
      + associate_public_ip_address = (known after apply)
      + ebs_optimized               = (known after apply)
      + enable_monitoring           = true
      + id                          = (known after apply)
      + image_id                    = "ami-020283e959651b381"
      + instance_type               = "t2.micro"
      + key_name                    = (known after apply)
      + name                        = (known after apply)
      + name_prefix                 = (known after apply)
    }

Plan: 2 to add, 0 to change, 0 to destroy.
```

この状態でapplyすると完了後に下記のエラーが出ます。

```sh
╷
│ Error: Resource postcondition failed
│
│   on main.tf line 38, in resource "aws_autoscaling_group" "example":
│   38:       condition     = length(self.availability_zones) > 1
│     ├────────────────
│     │ self.availability_zones is set of string with 1 element
│
│ You need to choose more than 1 AZ to ensure high availability
```

エラーは出力されていますが、`precondition`と異なり、planはちゃんと通ってリソースまで作成されているのが分かります。

これが`postcondition`の事後チェックというもので、apply後へのリソースの変数に対するチェックを実施することが可能になっています。

### postconditionのユースケース

`validation`や`precondition`などの事前チェックのみで補足しきれない条件を課すのが良いでしょう。

上記のような例だと、apply時にリソースが作成されてしまうので、事前チェックのようにリソース作成前に制限を課すような強い制約ができないことには注意が必要です。

## おまけ

インスタンスタイプの選定で`precondition`を使いましたが、`precondition`→`postcondition`と単純に置き換えてみたらどうなるでしょうか？

```tf
data "aws_ec2_instance_type" "example" {
  instance_type = "c5.xlarge"
}

resource "aws_instance" "example" {
  ami           = "ami-0f7b55661ecbbe44c"
  instance_type = data.aws_ec2_instance_type.example.instance_type
  subnet_id     = "subnet-xxxxxxx"
  lifecycle {
    postcondition {
      condition     = data.aws_ec2_instance_type.example.free_tier_eligible
      error_message = "This instance type is not free in AWS"
    }
  }
}
```

上記は[preconditionについて](#preconditionについて)におけるコードで`precondition`が`postcondition`に置き換わっているだけです。

planで下記エラーが出てきます。

```sh
Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform planned the following actions, but then encountered a problem:

  # aws_instance.example will be created
  + resource "aws_instance" "example" {
      + ami                                  = "ami-0f7b55661ecbbe44c"
      + arn                                  = (known after apply)
      + associate_public_ip_address          = (known after apply)
      + availability_zone                    = (known after apply)
      + cpu_core_count                       = (known after apply)
      + cpu_threads_per_core                 = (known after apply)
      + disable_api_stop                     = (known after apply)
      + disable_api_termination              = (known after apply)
      + ebs_optimized                        = (known after apply)
      + get_password_data                    = false
      + host_id                              = (known after apply)
      + host_resource_group_arn              = (known after apply)
      + iam_instance_profile                 = (known after apply)
      + id                                   = (known after apply)
      + instance_initiated_shutdown_behavior = (known after apply)
      + instance_lifecycle                   = (known after apply)
      + instance_state                       = (known after apply)
      + instance_type                        = "c5.xlarge"
      + ipv6_address_count                   = (known after apply)
      + ipv6_addresses                       = (known after apply)
      + key_name                             = (known after apply)
      + monitoring                           = (known after apply)
      + outpost_arn                          = (known after apply)
      + password_data                        = (known after apply)
      + placement_group                      = (known after apply)
      + placement_partition_number           = (known after apply)
      + primary_network_interface_id         = (known after apply)
      + private_dns                          = (known after apply)
      + private_ip                           = (known after apply)
      + public_dns                           = (known after apply)
      + public_ip                            = (known after apply)
      + secondary_private_ips                = (known after apply)
      + security_groups                      = (known after apply)
      + source_dest_check                    = true
      + spot_instance_request_id             = (known after apply)
      + subnet_id                            = "subnet-xxxxxxx"
      + tags_all                             = (known after apply)
      + tenancy                              = (known after apply)
      + user_data                            = (known after apply)
      + user_data_base64                     = (known after apply)
      + user_data_replace_on_change          = false
      + vpc_security_group_ids               = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.
╷
│ Error: Resource postcondition failed
│
│   on main.tf line 11, in resource "aws_instance" "example":
│   11:       condition     = data.aws_ec2_instance_type.example.free_tier_eligible
│     ├────────────────
│     │ data.aws_ec2_instance_type.example.free_tier_eligible is false
│
│ This instance type is not free in AWS
```

エラーメッセージは`precondition`とほぼ変わらないのですが、`postcondition`では plan によるリソース出力が成功します（`precondition`ではplanが失敗してリソース出力がされませんでした）。

これは`postcondition`が事後チェックであることを反映している例で、データソースやリソースが取得された後で値が評価されていることを如実に表しています。

こうなると `postcondition`で全部チェックしてしまっても良い気もしますが、事後チェックであるかを明示するため、`precondition`で制御できる箇所は`precondition`で制御するようにしましょう。

## さいごに

多くの変数に対して制限を課すのはなかなか大変で工数を取る上、可読性にも影響します。

修正の際にupdate in placeなどで気軽にアップデート出来ない変数(EBS暗号化の有無など)に対する制約から優先的に実施するのが個人的には良いと思います。

## 参考リンク

- [詳解Terraform](https://www.oreilly.co.jp/books/9784814400522/)
