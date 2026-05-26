---
title: "Terraform × Policy as Code:管理策を実装し、追跡可能なガードレールへ"
date: 2026/05/26 00:00:00
postid: a
tag:
  - Terraform
  - Policy-as-Code
category:
  - Infrastructure
thumbnail: /images/2026/20260526a/thumbnail.jpg
author: 棚井龍之介
lede: " 「PaC は管理策を実装するのである。通常、PaC が実装する管理は、組織が作成または採用した標準に由来する。これらの統制は、追跡可能で監査可能でなければならない。」"
---

<img src="/images/2026/20260526a/top.jpg" alt="" width="800" height="446">

> 「PaC は管理策を実装するのである。通常、PaC が実装する管理は、組織が作成または採用した標準に由来する。これらの統制は、追跡可能で監査可能でなければならない。」
>
> 出典: Policy as Code (O'Reilly Media)

# 1. はじめに

こんにちは、棚井龍之介です。本記事は [Terraform 連載 2026](/articles/20260518a/) の5本目です。

Terraform のコードを Claude Code をはじめとした生成 AI に書かせる場面が、現場でも増えているのではないかと想像しています。私自身は Terraform からしばらく離れていますが、「VPC と RDS と CloudTrail を組んでほしい」と自然言語で頼めば、`.tf` ファイル一式が数秒で出てくる、というのは想像に難くありません。公式ドキュメントを開く時間より、AI に質問して出力を読む時間のほうが長い、というエンジニアも珍しくないでしょう。

そこで気になるのは、どうやってレビューするのか、という点です。

人間のレビュアーは完璧ではありませんし、そもそもインフラ規模の拡大に対してレビュアー数は増えてくれません。`Action = "*"` の IAM ポリシー、`publicly_accessible = true` の RDS、`encrypted = false` の EBS といった、人間が忘れがちなパターンや見落としがちな書き間違いを、AI は平然と書き上げてしまいます。

以前に執筆した記事([Claude Code 経由で AWS にアクセスする際の IAM ガードレール](https://future-architect.github.io/articles/20260525a/))では、AI エージェント自体が AWS にアクセスする時の「IAM ガードレール」について書きました。今回はその近接領域で、AI が Terraform コードを書いた後に、そのコード自体をどうチェックするのかを考えてみました。人間がレビューに入る前に機械的に弾く、シフトレフトされたガードレールをどう作るかという話です。なお本記事における「シフトレフト」は、コードレビュー前の段階に機械的チェックを前倒しで仕掛けることを指します。

そのために、Policy as Code(以下 PaC)ツールである trivy、checkov、conftest の 3 つを、同じサンプルコードに当てて、それぞれの役割分担を見ていきます。

# 2. 「管理策の実装」とは、ルールをコードで強制する仕組み

まず、PaC というものの位置づけを確認していきます。

冒頭に引用した O'Reilly の「Policy as Code」では、PaC を「管理策の実装」と表現しています。組織が採用した標準(CIS Benchmark、AWS Foundational Security Best Practices、ISMS の管理策、社内ルール、など)があり、その標準を機械的に強制するのが PaC の役目だ、ということです。そしてその結果は「追跡可能・監査可能でなければならない」と続きます。

つまり、PaC ツールに求められているのは次の 4 つの機能と言えます。

| 構成要素 | 内容 |
|---|---|
| 定義 | ポリシーを Git 等で version control されたコードとして書ける |
| 強制 | CI/CD で自動評価し、違反時にビルドを止められる |
| テスト | ポリシー自体に対するユニットテストが書ける |
| 監査 | 検出結果を SARIF 等の標準フォーマットで残せる |

これら 4 つの観点で各ツールを見ていくと、それぞれの性格の違いが浮かび上がってきます。後の章で、今回検証したツールである trivy、checkov、conftest がどの観点に強くて、どの観点に弱いのかを実際に確認していきます。

# 3. 違反入りの .tf ファイルで検証環境を用意する

今回の検証用に、意図的にセキュリティ違反を含めた `.tf` ファイル一式と、conftest 用の自作 Rego ポリシーを用意しました。

```sh
.
├── insecure/                       # 検証対象の Terraform コード
│   ├── provider.tf                 # apply 不可の mock 認証情報
│   ├── s3.tf                       # CIS 2.1.1, 2.1.3, 2.1.5, 3.6
│   ├── iam.tf                      # CIS 1.15, 1.16, 1.22
│   ├── network.tf                  # CIS 3.9, 5.2, 5.3
│   ├── logging.tf                  # CIS 3.1, 3.2, 3.7
│   ├── ebs.tf                      # CIS 2.2.1
│   ├── rds.tf                      # FSBP RDS.2, 3, 8, 11
│   └── kms.tf                      # CIS 3.8
└── policies/                       # conftest 用 自作 Rego ポリシー
    ├── s3.rego                     # CIS 2.1.5
    ├── iam.rego                    # CIS 1.16, 1.22 関連
    ├── network.rego                # CIS 5.2, 5.3
    └── rds.rego                    # FSBP RDS.2, 3, 8, 11
```

## insecure/(検証対象の Terraform コード)

<details>
<summary>insecure/provider.tf</summary>

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region                      = "ap-northeast-1"
  access_key                  = "mock_access_key"
  secret_key                  = "mock_secret_key"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
}
```

</details>

<details>
<summary>insecure/s3.tf</summary>

```hcl
# VIOLATION: S3 bucket without public access block
# CIS AWS Foundations: 2.1.5 (S3 Block Public Access)
resource "aws_s3_bucket" "public_data" {
  bucket = "insecure-public-data-bucket-example"
}

# VIOLATION: S3 bucket with public-read ACL
# CIS AWS Foundations: 2.1.5
resource "aws_s3_bucket_acl" "public_data_acl" {
  bucket = aws_s3_bucket.public_data.id
  acl    = "public-read"
}

# VIOLATION: S3 bucket without server-side encryption
# CIS AWS Foundations: 2.1.1 (Ensure S3 buckets encrypted at rest)
resource "aws_s3_bucket" "unencrypted" {
  bucket = "insecure-unencrypted-bucket-example"
}

# VIOLATION: S3 bucket without versioning and access logging
# CIS AWS Foundations: 2.1.3 (versioning), 3.6 (S3 access logging)
resource "aws_s3_bucket" "no_versioning_logging" {
  bucket = "insecure-no-versioning-bucket-example"
}
```

</details>

<details>
<summary>insecure/iam.tf</summary>

```hcl
# VIOLATION: IAM policy with wildcard action and resource (full admin)
# CIS AWS Foundations: 1.16 (Ensure IAM policies that allow full "*:*" privileges are not attached)
resource "aws_iam_policy" "admin_wildcard" {
  name = "insecure-admin-wildcard-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      }
    ]
  })
}

# VIOLATION: IAM role assumable by any AWS account
# CIS AWS Foundations: related to 1.22 (cross-account trust restrictions)
resource "aws_iam_role" "open_assume_role" {
  name = "insecure-open-assume-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# VIOLATION: IAM user with directly attached policy (should use group)
# CIS AWS Foundations: 1.15 (Ensure IAM Users Receive Permissions Only Through Groups)
resource "aws_iam_user" "direct_attach_user" {
  name = "insecure-direct-attach-user"
}

resource "aws_iam_user_policy_attachment" "direct_attach" {
  user       = aws_iam_user.direct_attach_user.name
  policy_arn = aws_iam_policy.admin_wildcard.arn
}
```

</details>

<details>
<summary>insecure/network.tf</summary>

```hcl
# VPC without flow logs
# CIS AWS Foundations: 3.9 (Ensure VPC flow logging is enabled in all VPCs)
resource "aws_vpc" "insecure_vpc" {
  cidr_block = "10.0.0.0/16"
  # VIOLATION: no associated aws_flow_log resource
}

# VIOLATION: Security group allows SSH from 0.0.0.0/0
# CIS AWS Foundations: 5.2 (Ensure no SG allows ingress from 0.0.0.0/0 to port 22)
resource "aws_security_group" "ssh_open" {
  name        = "insecure-ssh-open"
  description = "Allow SSH from anywhere"
  vpc_id      = aws_vpc.insecure_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# VIOLATION: Security group allows RDP from 0.0.0.0/0
# CIS AWS Foundations: 5.3 (Ensure no SG allows ingress from 0.0.0.0/0 to port 3389)
resource "aws_security_group" "rdp_open" {
  name        = "insecure-rdp-open"
  description = "Allow RDP from anywhere"
  vpc_id      = aws_vpc.insecure_vpc.id

  ingress {
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# VIOLATION: Security group allows all traffic from 0.0.0.0/0
resource "aws_security_group" "all_open" {
  name        = "insecure-all-open"
  description = "Allow all traffic"
  vpc_id      = aws_vpc.insecure_vpc.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

</details>

<details>
<summary>insecure/logging.tf</summary>

```hcl
resource "aws_s3_bucket" "trail_bucket" {
  bucket = "insecure-trail-bucket-example"
}

# VIOLATION: CloudTrail with logging disabled
# CIS AWS Foundations: 3.1 (Ensure CloudTrail is enabled in all regions)
resource "aws_cloudtrail" "disabled" {
  name           = "insecure-disabled-trail"
  s3_bucket_name = aws_s3_bucket.trail_bucket.id

  enable_logging                = false
  is_multi_region_trail         = false
  enable_log_file_validation    = false
  include_global_service_events = false
}

# VIOLATION: CloudTrail without KMS encryption and log file validation
# CIS AWS Foundations: 3.2 (log file validation), 3.7 (KMS encryption)
resource "aws_cloudtrail" "no_encryption" {
  name           = "insecure-no-encryption-trail"
  s3_bucket_name = aws_s3_bucket.trail_bucket.id

  enable_logging             = true
  enable_log_file_validation = false
  # kms_key_id intentionally not set
}
```

</details>

<details>
<summary>insecure/ebs.tf</summary>

```hcl
# VIOLATION: EBS volume without encryption
# CIS AWS Foundations: 2.2.1 (Ensure EBS volume encryption is enabled)
resource "aws_ebs_volume" "unencrypted" {
  availability_zone = "ap-northeast-1a"
  size              = 10
  encrypted         = false
}

# VIOLATION: EBS snapshot from unencrypted volume
resource "aws_ebs_snapshot" "unencrypted_snapshot" {
  volume_id = aws_ebs_volume.unencrypted.id
}
```

</details>

<details>
<summary>insecure/rds.tf</summary>

```hcl
resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.insecure_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-1a"
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.insecure_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-northeast-1b"
}

resource "aws_db_subnet_group" "insecure" {
  name       = "insecure-rds-subnet-group"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

# VIOLATION: RDS publicly accessible, unencrypted, no backup, hardcoded password
resource "aws_db_instance" "insecure_db" {
  identifier           = "insecure-public-db"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  username             = "admin"
  password             = "InsecurePassword123!"
  db_subnet_group_name = aws_db_subnet_group.insecure.name

  publicly_accessible     = true
  storage_encrypted       = false
  backup_retention_period = 0
  deletion_protection     = false
  skip_final_snapshot     = true
}
```

</details>

<details>
<summary>insecure/kms.tf</summary>

```hcl
# VIOLATION: KMS key without rotation enabled
# CIS AWS Foundations: 3.8 (Ensure rotation for customer-created CMKs is enabled)
resource "aws_kms_key" "no_rotation" {
  description             = "insecure-no-rotation-key"
  deletion_window_in_days = 7
  enable_key_rotation     = false
}
```

</details>

## policies/(conftest 用 Rego ポリシー)

<details>
<summary>policies/s3.rego</summary>

```rego
package main

import rego.v1

# CIS 2.1.5: S3 buckets should not allow public read access via ACL
# 注意: Conftest の hcl2 パーサはリソースを配列でラップするため、
# input.resource.aws_s3_bucket_acl[name] は配列となる。要素は [_] で取り出す。
deny contains msg if {
    resource := input.resource.aws_s3_bucket_acl[name][_]
    resource.acl == "public-read"
    msg := sprintf("S3 bucket ACL '%s' grants public-read access (CIS 2.1.5)", [name])
}

deny contains msg if {
    resource := input.resource.aws_s3_bucket_acl[name][_]
    resource.acl == "public-read-write"
    msg := sprintf("S3 bucket ACL '%s' grants public-read-write access (CIS 2.1.5)", [name])
}
```

</details>

<details>
<summary>policies/iam.rego</summary>

```rego
package main

import rego.v1

# ⚠️ Source mode の制約:
# Terraform HCL の jsonencode() は Conftest の hcl2 パーサで評価されず、
# "${jsonencode({...})}" という文字列としてそのまま保存される。
# よって json.unmarshal() で構造化パースは不可。
# 構造化検出が必要な場合は Plan mode(terraform plan -json)を使うこと。
#
# 以下のルールは Source mode 向けの「文字列マッチによる暫定検出」で、
# 空白やコメントに敏感な脆い実装である点に留意。

# CIS 1.16: IAM policies should not allow full "*:*" privileges
deny contains msg if {
    resource := input.resource.aws_iam_policy[name][_]
    contains(resource.policy, "Action")
    contains(resource.policy, "\"*\"")
    contains(resource.policy, "Resource")
    # Action と Resource の両方が "*" になっているパターンをラフに検出
    regex.match(`Action\s*=\s*"\*"`, resource.policy)
    regex.match(`Resource\s*=\s*"\*"`, resource.policy)
    msg := sprintf("IAM policy '%s' allows full administrative privileges (CIS 1.16) [Source mode: regex match]", [name])
}

# IAM role should not allow assume role from any AWS principal
deny contains msg if {
    resource := input.resource.aws_iam_role[name][_]
    # Principal.AWS = "*" のパターンをラフに検出
    regex.match(`AWS\s*=\s*"\*"`, resource.assume_role_policy)
    msg := sprintf("IAM role '%s' can be assumed by any AWS principal [Source mode: regex match]", [name])
}
```

</details>

<details>
<summary>policies/network.rego</summary>

```rego
package main

import rego.v1

# ヘルパー: ingress ルールが指定ポートを 0.0.0.0/0 に公開しているか判定する。
# 同名ルールの複数定義は OR 結合になる。

# ケース 1: 通常のポート範囲指定
port_exposed_to_world(ingress, port) if {
    ingress.cidr_blocks[_] == "0.0.0.0/0"
    ingress.from_port <= port
    ingress.to_port >= port
}

# ケース 2: protocol="-1" は AWS 慣習で「全プロトコル・全ポート」を意味する。
# from_port=0, to_port=0 の特殊値とセットで使われる。
port_exposed_to_world(ingress, _port) if {
    ingress.cidr_blocks[_] == "0.0.0.0/0"
    ingress.protocol == "-1"
}

# CIS 5.2: No security group should allow ingress from 0.0.0.0/0 to port 22
# ISMS A.8.20: ネットワークセキュリティ
deny contains msg if {
    sg := input.resource.aws_security_group[name][_]
    ingress := sg.ingress[_]
    port_exposed_to_world(ingress, 22)
    msg := sprintf("Security group '%s' allows SSH from 0.0.0.0/0 (CIS 5.2, ISMS A.8.20)", [name])
}

# CIS 5.3: No security group should allow ingress from 0.0.0.0/0 to port 3389
# ISMS A.8.20: ネットワークセキュリティ
deny contains msg if {
    sg := input.resource.aws_security_group[name][_]
    ingress := sg.ingress[_]
    port_exposed_to_world(ingress, 3389)
    msg := sprintf("Security group '%s' allows RDP from 0.0.0.0/0 (CIS 5.3, ISMS A.8.20)", [name])
}
```

</details>

<details>
<summary>policies/rds.rego</summary>

```rego
package main

import rego.v1

# AWS FSBP [RDS.2]: RDS instances should not be publicly accessible
# ISMS A.8.22: ネットワークセキュリティ — 公開ネットワークと内部ネットワークの分離
deny contains msg if {
    db := input.resource.aws_db_instance[name][_]
    db.publicly_accessible == true
    msg := sprintf("RDS instance '%s' is publicly accessible (FSBP RDS.2, ISMS A.8.22)", [name])
}

# AWS FSBP [RDS.3]: RDS storage should be encrypted at rest
# ISMS A.8.24: 暗号化の利用
deny contains msg if {
    db := input.resource.aws_db_instance[name][_]
    db.storage_encrypted == false
    msg := sprintf("RDS instance '%s' has unencrypted storage (FSBP RDS.3, ISMS A.8.24)", [name])
}

# AWS FSBP [RDS.11]: RDS should have automatic backups enabled
# ISMS A.8.13: 情報のバックアップ
deny contains msg if {
    db := input.resource.aws_db_instance[name][_]
    db.backup_retention_period == 0
    msg := sprintf("RDS instance '%s' has no backup retention (FSBP RDS.11, ISMS A.8.13)", [name])
}

# AWS FSBP [RDS.8]: RDS instances should have deletion protection enabled
# ISMS A.8.14: 情報処理施設の冗長性 — 主要システムの偶発的損失を防ぐ
deny contains msg if {
    db := input.resource.aws_db_instance[name][_]
    db.deletion_protection == false
    msg := sprintf("RDS instance '%s' has deletion protection disabled (FSBP RDS.8, ISMS A.8.14)", [name])
}

# ISMS A.5.17: 認証情報 — 認証情報のハードコーディング禁止
# 注意: HCL の interpolation (${var.foo}) で始まらない文字列リテラルを「ハードコード」とみなす。
# 完全な静的解析ではないため、Base64 化された値などはすり抜ける可能性あり。
deny contains msg if {
    db := input.resource.aws_db_instance[name][_]
    db.password
    not startswith(db.password, "${")
    msg := sprintf("RDS instance '%s' has hardcoded password literal (ISMS A.5.17)", [name])
}
```

</details>

`provider.tf` には実在しない mock 認証情報を直接書いているので、`terraform apply` を試みても AWS API の認証で必ず失敗します。間違って実環境に流れ込む事故を防ぐための仕掛けです。

`insecure/` 配下の `.tf` ファイルには、CIS Benchmark および AWS Foundational Security Best Practices(FSBP)に紐付く違反を合計 23 件、意図して仕込んでいます。S3 バケットを暗号化なしで作る、IAM ポリシーで `Action: "*"` を許可する、SSH (22) を `0.0.0.0/0` に開放する、といった「やってはいけない代表例」を網羅しました。

`policies/` 配下の 4 ファイルは conftest の自作ポリシーで、第 6 章で詳しく取り上げます。

# 4. 3 つの PaC 実現ツールの違い

trivy、checkov、conftest を、まず基本情報で並べてみます。

| 観点 | trivy | checkov | conftest |
|---|---|---|---|
| 提供元 | Aqua Security | Bridgecrew / Prisma Cloud | OPA(CNCF) |
| 組み込みルール | 数百〜数千 | 1,000+ | 0(全部自作) |
| デフォルト出力 | 違反のみ | passed / failed をリソース単位で列挙 | failed メッセージのみ列挙(サマリに passed 件数) |
| メンテナンスの責任 | コミュニティ | コミュニティ | 自社 |

第 2 章で挙げた PaC の 4 観点(定義 / 強制 / テスト / 監査)で並べると、仕様の違いがさらにはっきりします。

| 観点 | trivy | checkov | conftest |
|---|---|---|---|
| 定義 | 組み込みルール中心。カスタムは Rego で追記可 | 組み込みルール中心。カスタムは Python / YAML で追記可 | すべて自作(Rego) |
| 強制 | CLI 終了コードで CI からビルドを止められる | CLI 終了コードで CI からビルドを止められる | CLI 終了コードで CI からビルドを止められる |
| テスト | 組み込みのユニットテスト機構はなし | 組み込みのユニットテスト機構はなし | `conftest verify` で Rego のユニットテストが書ける |
| 監査 | SARIF 出力可。メッセージはルール ID 中心 | SARIF 出力可。passed も結果に含まれる | メッセージを自由記述でき、管理策番号を埋め込める |

trivy はバイナリ一つで動く軽量さが特徴で、組み込みルールで網羅的に検出してくれます。checkov は Python ベースで起動は重めですが、リソース間の関係性を見たグラフチェックなど、検出の深さで光ります。

conftest は他の 2 つとは設計が大きく異なります。利用者がルールを記述しない限り、何も検出されません。空のディレクトリを指定して動かしてもエラーは出ませんが、違反も出てきません。これが conftest の仕様で、組み込みルールを持たない代わりに、組織固有のチェックをそのまま実装できる柔軟さがあります。

conftest が内部で使っている OPA(Open Policy Agent)は CNCF の Graduated プロジェクトで、Kubernetes Admission Controller など IaC 以外でも広く使われています。以前であれば Rego という独自言語を覚える必要があり、学習コストの高さが採用の壁でした。現在は生成 AI を活用して Rego を記述できるため、その負担は大きく軽減されています。

# 5. 同一サンプルへの、3 ツールの検出結果

以降では、これらの違いが実際の検出結果としてどう現れるかを見ていきます。

ここからは実際の検出結果です。検証に使ったツールのバージョンは以下の通りです。

| ツール | バージョン |
|---|---|
| trivy | 0.70.0 |
| checkov | 3.2.520 |
| conftest | 0.68.2(OPA 1.15.2 同梱) |

それぞれを実行したコマンドは、以下のようなシンプルなものです。

```bash
# trivy
trivy config insecure/

# checkov
checkov -d insecure/ --skip-download --soft-fail

# conftest
conftest test --parser hcl2 --policy policies/ insecure/*.tf
```

同じ `insecure/` を 3 ツールに渡したときの検出件数を、ファイル別に並べたのが以下の表です。

注意点として、「意図した違反」の 23 件は、筆者が過去の経験から「これを違反として扱う」と判断して仕込んだ数です。ツール側の検出件数とは粒度が異なり、1 つのリソースに複数の違反が含まれていれば複数ルールが発火しますし、ツールによっては 1 つの違反に対して関連する複数のチェックが同時に反応します。そのため、検出件数を単純に比較して「多い方が優秀」と読むのではなく、ファイル別の傾向、つまりどのリソース種別でどんな差が出たかに注目してください。

| ファイル | 意図した違反 | trivy | checkov | conftest |
|---|---|---|---|---|
| s3.tf | 4 | 25 | 0 | 1 |
| iam.tf | 3 | 1 | 11 | 2 |
| network.tf | 4 | 7 | 9 | 4 |
| logging.tf | 3 | 17 | 9 | 0 |
| ebs.tf | 2 | 2 | 2 | 0 |
| rds.tf | 6 | 6 | 9 | 5 |
| kms.tf | 1 | 1 | 1 | 0 |
| 合計 | 23 | 59 | 41 | 12 |

注目していただきたいのは、`s3.tf` と `iam.tf` の数値です。

`s3.tf` に対して trivy は 25 件の違反を出した一方で、checkov は 0 件でした。これは checkov の検出ロジックの特性で、AWS provider v4 以降で `aws_s3_bucket` から分離された子リソース(`aws_s3_bucket_versioning` など)に対するグラフチェックが、本検証のデフォルト設定では動作しませんでした。同じ環境構成のまま checkov だけに依存すると、暗号化やパブリック公開といった項目が結果に現れない可能性があります。

`iam.tf` では、trivy が 1 件、checkov が 11 件と検出件数に大きな差が出ました。今回のサンプルでは IAM ポリシーを `jsonencode()` で組み立てており、その内部の `Action: "*"` や `Principal: { AWS: "*" }` は、trivy 側の出力には現れませんでした。CIS 1.16 や 1.22 に該当する内容が今回の結果には含まれなかった形です(`jsonencode()` の中身の扱いは書き方やバージョンに依存するため、本検証ではこのケースで差が出た、というのが実態です)。

違反の構成や Terraform の書き方が変われば検出結果も変わり得ますが、今回のサンプルでは単独で完結する選択肢は存在しませんでした。

conftest の 12 件という数字は、今回自作した 11 個の `deny` ルールが対象リソースに対して合計 12 回発火した、という意味です。SSH 用と RDP 用のルールが、全ポート開放(`protocol = "-1"`)の Security Group に対して両方発火しているため、ルール数を 1 つ上回っています。組み込みルールがゼロのため、書いた分だけが検出に現れるのが conftest の性質です。

なお、合計件数の差(59 / 41 / 12)はツールの優劣を示すものではなく、上述のとおり 1 違反に対する発火数の違いと、conftest においては「書いたルールしか発火しない」設計の違いを反映したものです。

# 6. 自作 Rego で「うちはこれを守る」を書き出す

前章で触れた通り、conftest は書いた分しか検出しないツールです。そのため 12 件という数字は、trivy や checkov の検出数とそのまま並べて多寡を比較するものではなく、自分たちで「これを守る」と書いたチェックの結果として現れた数字です。自分たちで決めたルールを、自分たちの言葉で書き出した分だけが結果に返ってくる、というのが conftest の使い方になります。

例えば RDS 用に書いた `policies/rds.rego` の一部を示します。

```sh
package main

import rego.v1

# AWS FSBP [RDS.2]: RDS instances should not be publicly accessible
# ISMS A.8.22: ネットワークセキュリティ — 公開ネットワークと内部ネットワークの分離
deny contains msg if {
    db := input.resource.aws_db_instance[name][_]
    db.publicly_accessible == true
    msg := sprintf("RDS instance '%s' is publicly accessible (FSBP RDS.2, ISMS A.8.22)", [name])
}
```

注目すべきは、`msg` の中に「FSBP RDS.2」や「ISMS A.8.22」のような管理策番号を、書き手の判断で自由に埋め込める点です。これにより、検出結果を読んだ監査人やコンプライアンス担当者は、別途マッピング表を引かなくても「この違反はどの管理策に紐付くか」を即座に把握できます。

実際に conftest を実行すると、メッセージはこのように出てきます。

```sh
FAIL - insecure/rds.tf - main - RDS instance 'insecure_db'
       is publicly accessible (FSBP RDS.2, ISMS A.8.22)
```

trivy や checkov だとルール ID(`AVD-AWS-0080` や `CKV_AWS_17`)がメッセージに乗りますが、それが何の標準のどの管理策に対応するかは、別の文書で確認する必要があります。一方の conftest なら、メッセージ自体が説明文として完結できます。

これは「追跡可能性・監査可能性」という冒頭引用の要件に対する、ひとつの解答になっていると思っています。

なお、IAM のように `jsonencode()` で組み立てられたポリシーは、Source mode の conftest からは構造化された JSON として読み取れません。今回は正規表現マッチで暫定対応しました。正確性を求めるのであれば、`terraform plan -json` の Plan mode を使う必要があります。実用上は、組み込みルールを持つ checkov に IAM を任せて、conftest は自分たちで書きたいチェックを引き受けるという分担が現実的だと感じています。

# 7. 「広く × 個別」のペアを運用に組み込む

今回の検証から見えてきた運用上の提案として、trivy / checkov と conftest を別の役割で組み合わせるパターンを置いておきます。

trivy と checkov は「広く拾う」役割です。組み込みルールで違反を網羅的に検出し、シフトレフトの CI ゲートとして使う前提です。両者とも SARIF(OASIS が標準化した業界標準フォーマット)で結果を出せるので、GitHub Code Scanning に投げ込めば Pull Request の該当行に違反の注釈が付きます。これにより、人間レビュアーに引き継ぐ前の機械的な事前チェックとして利用できます。ただし、完璧にチェックできるツールは存在せず、対象とする `.tf` の内容によって、適切な組み合わせは変わってきます。

これに対し conftest は、自分たちで「これだけは絶対に通さない」と判断したチェック項目を、Rego として明示的に記述するためのツールです。第 6 章で示したように、`msg` に管理策番号を埋め込めるので、検出結果がそのまま監査証跡として残せます。trivy / checkov が「広く拾う」のに対し、conftest は「狭く、明示的に、誰にでも分かる言葉で守る」担当です。

`.rego` ファイル自体が Git で管理されていれば、「いつ、誰が、どんなチェックを追加したか」もすべて履歴として残ります。チェックそのものが履歴管理される形になり、冒頭で引用した「追跡可能・監査可能」という要件にも自然と応えられます。

「広く拾う」trivy / checkov と「狭く明示する」conftest という二段構えが、今回の検証から見えた運用上の落としどころです。組み込みルールのツールと自作ルールのツールを併用するパターン自体は PaC を扱う場面でしばしば語られる構成で、今回の検証でも実感としてそこに着地しました。

# 8. まとめ

本記事では、AI が書いた Terraform コードに対するシフトレフト型のガードレールとして、trivy、checkov、conftest の 3 ツールを同じサンプルに当てて検証しました。

検証の結果、今回のサンプルでは、ツールごとに得意な領域とそうでない領域が分かれました。違反の構成や Terraform の書き方が変われば結果も変わり得るため、適切な組み合わせは状況ごとに見極める必要があります。

運用上の提案として、組み込みルールで広く拾う trivy / checkov と、自分たちで「これを守る」と決めたルールを明示する conftest を組み合わせる二段構えを示しました。conftest の `msg` に管理策番号を直接埋め込めば、検出結果は追跡可能な監査証跡としても残せます。

本記事で示したシフトレフト型のガードレールが、Terraform 運用の中で参考になれば幸いです。

# 参照

- [AWS MCP Server がGAに - Claude Codeから検証: IAMガードレール設計](https://future-architect.github.io/articles/20260525a/)
- [Policy as Code (O'Reilly)](https://learning.oreilly.com/library/view/kodotositenoporisi/9798341627093/ch01.html)
- [trivy (aquasecurity/trivy)](https://github.com/aquasecurity/trivy)
- [checkov (bridgecrewio/checkov)](https://github.com/bridgecrewio/checkov)
- [conftest (open-policy-agent/conftest)](https://github.com/open-policy-agent/conftest)
