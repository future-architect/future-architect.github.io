---
title: "RDS DBインスタンスのアカウント間複製をGitHub Actionsで自動化"
date: 2024/05/07 00:00:00
postid: a
tag:
  - RDS
  - AWS
  - GitHubActions
  - ShellScript
  - IAM
  - CI/CD
category:
  - DevOps
thumbnail: /images/20240507a/thumbnail.png
author: 太田寛明
lede: "本番環境のAmazon RDS DBインスタンスを別アカウントの検証環境にバックアップリストアする作業を自動化する機会があったので、その手法について紹介します"
---
# はじめに

こんにちは。Strategic AI Group所属の太田寛明です。

ある環境A（例えば本番環境）のAmazon RDS DBインスタンスを別アカウントB（例えば検証環境）にバックアップ&リストアする作業を自動化する機会があったので、その手法について紹介します。

自動化する方法は様々[^1]あると思いますが、今回はGitHub Actionsを利用しました。複数のAWS CLIコマンドを各アカウントごとに日次で定期実行します。

# バックアップリストアの実装

RDS DBインスタンスをアカウント間でバックアップリストアする方法に関しては、AWSの公式ドキュメントに記載があります。

> [Amazon RDS DB インスタンスを別の VPC またはアカウントに移行する](https://docs.aws.amazon.com/ja_jp/prescriptive-guidance/latest/patterns/migrate-an-amazon-rds-db-instance-to-another-vpc-or-account.html)
> 別の AWS アカウントに移行
> 次の図は、Amazon RDS DB インスタンスを別の AWS アカウントに移行するワークフローを示しています。
<img src="/images/20240507a/5536e69e-3965-4ca2-8a0b-2573659b5f8f.png" alt="5536e69e-3965-4ca2-8a0b-2573659b5f8f.png" width="1200" height="520" loading="lazy">

この手法を踏まえて、本番環境のDBを別アカウントの検証環境にコピーしたい場合は、次のプロセスを踏むことになります。

1. 環境AのDBのスナップショットを作成（上図の①②）
2. スナップショットを環境Bのアカウントに共有（上図の③）
3. 共有されたスナップショットから検証環境上でDBを復元（上図の④⑤）

これらのプロセスは、AWS Management Console、AWS CLI、RDS APIのいずれを用いても実現することが可能です。

今回はAWS CLIコマンド[^2]を用いた実装を自動化したので、この実装に基づいて各プロセスをもう少し詳しく紹介していきます。

## 1. 本番環境のDBのスナップショットを作成

Amazon RDSのスナップショットには自動スナップショットと手動スナップショットの2種類が存在します。

基本的に自動スナップショットをもとにDBを復元すればいいわけですが、今回は別アカウントにスナップショットを共有する必要があるため、以下に従って手動スナップショットを作成する必要があります。

> [DB スナップショットの共有](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html)
自動 DB スナップショットを共有するには、自動 DB スナップショットをコピーしてそのコピーを共有することで、手動スナップショットを作成します。

実装例は次のようになります。

ここで、初めにスナップショットを削除しているのは、同一名称のものが既に存在する場合には新しくスナップショットを作成できないからです。

過去分のスナップショットは、基本的に自動スナップショットという形で別途保持されていると思うので、手動スナップショットの名称は毎回固定で問題ないかと思います。

```sh backup_prod.sh（前半）
# スナップショット削除
aws rds delete-db-snapshot \
    --db-snapshot-identifier ${【本番】手動スナップショット識別子}

# スナップショット削除完了確認
aws rds wait db-snapshot-deleted \
    --db-snapshot-identifier ${【本番】手動スナップショット識別子}

# バックアップ対象DBの自動スナップショット識別子取得
## 以下では最新の自動スナップショットを取得しています。
【本番】自動スナップショット識別子=$(
    aws rds describe-db-snapshots \
        --db-instance-identifier ${バックアップ対象のDBインスタンス識別子} \
        --snapshot-type automated \
        --query 'reverse(sort_by(DBSnapshots, &SnapshotCreateTime)[].DBSnapshotIdentifier)[0]'　\
        | tr -d '"'
)

# スナップショット複製
## 今回は手動スナップショットをAWS KMSで暗号化しています。
## KMS キーのタイプは、カスタマーマネージドキーである必要があります。（後述）
aws rds copy-db-snapshot \
    --source-db-snapshot-identifier ${【本番】自動スナップショット識別子} \
    --target-db-snapshot-identifier ${【本番】手動スナップショット識別子} \
    --kms-key-id ${【本番】KMSキーの識別子}

# スナップショット複製完了確認
aws rds wait db-snapshot-available \
    --db-snapshot-identifier ${【本番】手動スナップショット識別子} \
    --snapshot-type manual
```

参照（公式ドキュメント）

- [DB スナップショットの削除](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_DeleteSnapshot.html)
- [DB スナップショットのコピー](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html)

## 2. スナップショットを検証環境のアカウントに共有

本番環境で作成した手動スナップショットを検証環境のアカウントでも参照できるように共有します。

実装例は次のようになります。

```sh backup_prod.sh（後半）
aws rds modify-db-snapshot-attribute \
    --db-snapshot-identifier ${【本番】手動スナップショット識別子} \
    --attribute-name restore \
    --values-to-add ${共有先（検証環境）のAWSアカウントID}
```

参照（公式ドキュメント）
- [DB スナップショットの共有](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html)

## 3. 共有されたスナップショットから検証環境上でDBを復元

いよいよDBの復元ですが、AWS KMSによる暗号化を行った際、一つ注意点があります。
以下の制限により、カスタマーマネージドキーを使用してスナップショットを暗号化する必要がありました。

> [暗号化されたスナップショットの共有](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html#share-encrypted-snapshot)
> スナップショットを共有した AWS アカウント のデフォルト KMSキーを使用して暗号化されたスナップショットを共有することはできません。
> ...
>デフォルトの KMS キーの問題を回避するには、次のタスクを実行します。
> 1. カスタマーマネージドキーを作成し、そのキーへのアクセス権を付与する
> 2. ソースアカウントからスナップショットをコピーして共有する
> 3. ターゲットアカウントに共有したスナップショットをコピーします

このため、他アカウントから共有された暗号化済みの手動スナップショットを利用してDBインスタンスを復元したい場合は、指示された回避策に従って再びスナップショットのコピーを作成し、それをもとにDBインスタンスの復元を行う必要があります。

### 共有されたスナップショットのコピー

前述した通り、まずは本番環境から共有された暗号化済みのスナップショットを検証環境上でコピーします。

実装例は次のようになります。

ここで、コマンド`copy-db-snapshot`のオプション`--source-db-snapshot-identifier`について、以下制約が存在するため、共有されたスナップショット識別子はARNとして取得しています。

> [copy-db-snapshot](https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html)
> `--source-db-snapshot-identifier` (string)
> ...
> If you are copying from a shared manual DB snapshot, this parameter must be the Amazon Resource Name (ARN) of the shared DB snapshot.

```sh restore_stg.sh（前半）
# スナップショット削除
aws rds delete-db-snapshot \
    --db-snapshot-identifier ${【検証】手動スナップショット識別子}

# スナップショット削除完了確認
aws rds wait db-snapshot-deleted \
    --db-snapshot-identifier ${【検証】手動スナップショット識別子}

# 共有されたスナップショット識別子(ARN)取得
## 以下では共有された最新のスナップショットを取得しています。
共有されたスナップショット識別子=$(
    aws rds describe-db-snapshots \
        --include-shared \
        --snapshot-type shared \
        --query 'reverse(sort_by(DBSnapshots, &SnapshotCreateTime)[].DBSnapshotArn)[0]' \
        | tr -d '"'
)

# スナップショット複製
## ここでも手動スナップショットをAWS KMSで暗号化しています。
aws rds copy-db-snapshot \
    --source-db-snapshot-identifier ${共有されたスナップショット識別子} \
    --target-db-snapshot-identifier ${【検証】手動スナップショット識別子} \
    --kms-key-id ${【検証】KMSキーの識別子}

# スナップショット複製完了確認
aws rds wait db-snapshot-available \
    --db-snapshot-identifier ${【検証】手動スナップショット識別子} \
    --snapshot-type manual
```

参照（公式ドキュメント）
- [DB スナップショットの削除](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_DeleteSnapshot.html)
- [DB スナップショットのコピー](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html)

### スナップショットからDBインスタンスを復元

続いて検証環境上でコピーしたスナップショットをもとに、DBインスタンスを復元します。

実装例は次のようになります。

```sh restore_stg.sh（後半）
# DBインスタンス削除
## 自動バックアップも削除し、最終スナップショットも作成しません。
aws rds delete-db-instance \
    --db-instance-identifier ${DBインスタンス識別子} \
    --skip-final-snapshot \
    --delete-automated-backups

# DBインスタンス削除完了確認
aws rds wait db-instance-deleted \
    --db-instance-identifier ${DBインスタンス識別子}

# DBインスタンス復元
## DBインスタンスの設定オプションは各自のDB要件に応じて設定してください。
## 以下では"パブリックアクセス禁止"のみ設定しています。
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier ${DBインスタンス識別子} \
    --db-snapshot-identifier ${【検証】手動スナップショット識別子} \
    --no-publicly-accessible

# DBインスタンス復元完了確認
aws rds wait db-instance-available \
    --db-instance-identifier ${DBインスタンス識別子}
```

参照（公式ドキュメント）
- [DB インスタンスを削除する](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html)
- [DB スナップショットからの復元](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html)

# バックアップリストアの自動化

さて、[バックアップリストアの実装](#バックアップリストアの実装)で作成したファイル達を各アカウントでそれぞれ手動実行することで、検証環境上に本番環境のDBを復元できるようになりました。

いよいよ本題のGitHub Actionsでの自動化です。
`aws-actions/configure-aws-credentials`を使用すれば、指定したIAMロールでAWS CLIコマンドを実行できるので、ここでは[バックアップリストアの実装](#バックアップリストアの実装)で作成したファイル達を実行するために必要なIAMロールの設定について説明しようと思います。

一般的に`aws-actions/configure-aws-credentials`を使用してAWS CLIコマンドを実行するために必要な設定については、[Terraform とGitHub Actions](https://future-architect.github.io/articles/20230405a/)等を参考にしてみてください。

## 必要なIAMロールの設定

[バックアップリストアの実装](#バックアップリストアの実装)で作成したファイル達が正常に実行されるためには、以下ポリシーがIAMロールに付与されており、アクセスが許可されている必要があります。
- AWS CLIコマンド実行のために必要なポリシー
- 検証環境上での本番環境のAWS KMSキーの使用に必要なポリシー

一つずつ見ていきましょう。

### AWS CLIコマンド実行のために必要なポリシー

[バックアップリストアの実装](#バックアップリストアの実装)を踏まえると、本番/検証環境で以下AWS CLIコマンド群を実行できるようにする必要があると分かります。

- スナップショットの削除と複製（本番環境と検証環境の両方）
    - `delete-db-snapshot`
    - `wait db-snapshot-deleted`
    - `describe-db-snapshots`
    - `copy-db-snapshot`
    - `wait db-snapshot-available`
- スナップショットの共有（本番環境のみ）
    - `modify-db-snapshot-attribute`
- DBインスタンスの削除復元（検証環境のみ）
    - `delete-db-instance`
    - `wait db-instance-deleted`
    - `restore-db-instance-from-db-snapshot`
    - `wait db-instance-available`

以下では、それぞれのコマンド群の実行に必要なポリシーの実装例を挙げています。
要件によっては、さらに細かくカスタマイズする必要もあると思うので参考程度に留めて役立ててもらえればと思います。
また、本番/検証環境のそれぞれのアカウントごとに、実行すべきコマンド群が異なるので注意して設定してください。

#### スナップショットの削除複製に必要なポリシーの実装例

本番環境と検証環境の両方のアカウントで必要になります。

```json スナップショットの削除複製に必要なポリシーの実装例.json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "rds:AddTagsToResource",
                "rds:DescribeDBSnapshots",
                "rds:CopyDBSnapshot",
                "rds:DeleteDBSnapshot"
            ],
            "Resource": "*"
        }
    ]
}
```

#### スナップショットの共有に必要なポリシーの設定例

本番環境のアカウントでのみ必要になります。

```json スナップショットの共有に必要なポリシーの設定例.json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "rds:ModifyDBSnapshotAttribute",
                "rds:DescribeDBSnapshotAttributes"
            ],
            "Resource": "*"
        }
    ]
}
```

#### DBインスタンスの削除復元に必要なポリシーの設定例

検証環境のアカウントでのみ必要になります。

```json DBインスタンスの削除復元に必要なポリシーの設定例.json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "*",
            "Condition": {
                "StringLike": {
                    "iam:PassedToService": "rds.amazonaws.com"
                }
            }
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "rds:AddTagsToResource",
                "rds:RestoreDBInstanceFromDBSnapshot",
                "rds:DescribeDBInstances",
                "rds:DeleteTenantDatabase",
                "rds:CreateTenantDatabase",
                "rds:DeleteDBInstance"
            ],
            "Resource": "*"
        }
    ]
}
```

### 検証環境上での本番環境のAWS KMSキーの使用に必要なポリシー

#### 本番環境での設定

スナップショットの暗号化に使用したカスタマーマネージドキーのKMSキーポリシーにて、共有先の検証環境のアカウントをキーユーザーに指定することで、検証環境上でそのKMSキーへのアクセスを許可することができるようになります。

具体的には次の2つのステートメントについて、検証環境のアカウントにKMSキーへのアクセス許可を与える必要があります。

```json
{
    "Sid": "Allow use of the key",
    "Effect": "Allow",
    "Principal": {
        "AWS": ${【検証】アカウント識別子(ARN)}
    },
    "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
    ],
    "Resource": "*"
}
```

```json
{
    "Sid": "Allow attachment of persistent resources",
    "Effect": "Allow",
    "Principal": {
        "AWS": ${【検証】アカウント識別子(ARN)}
    },
    "Action": [
        "kms:CreateGrant",
        "kms:ListGrants",
        "kms:RevokeGrant"
    ],
    "Resource": "*",
    "Condition": {
        "Bool": {
            "kms:GrantIsForAWSResource": "true"
        }
    }
}
```

参照（公式ドキュメント）
- [他のアカウントのユーザーに KMS キーの使用を許可する#他のアカウントで使用できる KMS キーを作成する](https://docs.aws.amazon.com/ja_jp/kms/latest/developerguide/key-policy-modifying-external-accounts.html#cross-account-console)

#### 検証環境での設定

上記設定により本番環境側は、このKMSキーに対するアクセス許可を検証環境に与えました。
しかし実際に検証環境上でKMSキーを使用できるようにするためには、このKMSキーを使用するロールに対して検証環境側からアクセス許可を与える必要もあります。

具体的には以下ポリシーを作成し、IAMロールに付与する必要があります。
これによってようやく、本番環境から共有されたスナップショットを検証環境上にコピーすることができるようになります。

```json 本番環境のKMSキーの使用に必要なポリシーの実装例.json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:DescribeKey",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*"
            ],
            "Resource": ${【本番】KMSキー識別子(ARN)}
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "kms:CreateGrant",
                "kms:ListGrants",
                "kms:RevokeGrant"
            ],
            "Resource": ${【本番】KMSキー識別子(ARN)},
            "Condition": {
                "Bool": {
                    "kms:GrantIsForAWSResource": "true"
                }
            }
        }
    ]
}
```

参照（公式ドキュメント）
- [他のアカウントのユーザーに KMS キーの使用を許可する](https://docs.aws.amazon.com/ja_jp/kms/latest/developerguide/key-policy-modifying-external-accounts.html)

## GitHub Actions ワークフローを作成する

必要なIAMロールを設定できたので、あとはGitHub Actionsのワークフローを作成すればバックアップリストア作業を自動化できます。

アカウントごとに適切なIAMロールを`aws-actions/configure-aws-credentials`で指定した後に、次の二つのシェルスクリプトを、対応するアカウントごとに順次実行します。
- `backup_prod.sh`：本番環境で実行
    - [1. 本番環境のDBのスナップショットを作成](#1-本番環境のdbのスナップショットを作成)
    - [2. スナップショットを検証環境のアカウントに共有](#2-スナップショットを検証環境のアカウントに共有)
- `restore_stg.sh`：検証環境で実行（ただし、`backup_prod.sh`の実行完了後）
    - [3. 共有されたスナップショットから検証環境上でDBを復元](#3-共有されたスナップショットから検証環境上でdbを復元)

実装例は以下の通りです。


```yaml 実装例.yaml
name: restore-rds-stg-from-prod

# 実行スケジュールをcron形式で記載してください。
# 以下例では毎日15:00(UTC)に実行されます。
on:
  schedule:
    - cron: '0 15 * * *'

jobs:
  backup_prod:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-region: ap-northeast-1
          role-to-assume: ${本番環境用のIAMロール}

      - name: Create and Share Snapshot
        run: sh backup_prod.sh

  restore_stg:
    needs: backup_prod
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-region: ap-northeast-1
          role-to-assume: ${検証環境用のIAMロール}

      - name: Restore RDS from Snapshot
        run: sh restore_stg.sh
```

# さいごに

今回は、RDS DBインスタンスをアカウント間でバックアップリストアする方法とGitHub Actionsを用いた自動化の方法を紹介させていただきました。もしRDS DBのバックアップ方法に悩んでいる方がいれば試してみてください。

また、今回紹介した方法は、同一リージョン内でバックアップリストアする方法です。リージョン間のコピーは少し複雑性が増すらしく、少しカスタマイズする必要があるかもしれませんので注意してください。

[^1]: 他にもAWS CodeBuildを用いたりする方法等があります。一方でAWS Lambdaは時間的制約がシビアであるため、DBのバックアップリストアには不向きです。
[^2]: RDSに関するAWS CLIコマンドの一覧は以下を参照してください。
https://docs.aws.amazon.com/cli/latest/reference/rds

