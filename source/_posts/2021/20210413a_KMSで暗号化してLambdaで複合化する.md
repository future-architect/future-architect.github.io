---
title: "KMSで暗号化してLambdaで復号化する"
date: 2021/04/13 00:00:00
postid: "a"
tag:
  - Lambda
  - AWS
  - Terraform
  - 暗号
category:
  - Security
thumbnail: /images/2021/20210413a/thumbnail.png
author: 棚井龍之介
lede: "認証情報を Lambda の環境変数に渡す要件が発生したため認証情報を KMS で暗号化して、リポジトリには暗号化した値を登録し、Lambda 内で復号化する構成を取りました。"
---
<img src="/images/2021/20210413a/Screen_Shot_2021-03-24_at_2.18.57.png" alt="">

# はじめに

フューチャーの棚井龍之介です。

認証情報を Lambda の環境変数に渡す要件が発生し、

- Lambda は環境変数を含めて Terraform 管理配下にある
- コードは全て GitHub で履歴管理している
- 生の認証情報はリポジトリに Push すべきでない

となったため、認証情報を KMS で暗号化して、リポジトリには暗号化した値を登録し、Lambda 内で復号化する構成を取りました。

認証情報のコード管理について、Terraform 作業とローカル作業を組み合わせて対応できたため、備忘録も兼ねて手順をブログ化しました。

## KMS とは

公式: [AWS Key Management Service (KMS)](https://aws.amazon.com/jp/kms/)

AWS の提供する、データの暗号化・復号化サービスです。共通鍵暗号の仕組みを使い、データベースの接続キーや認証情報の暗号化・復号化機能を提供します。他サービスと組み合わせることにより、KMS でアクセスキーで暗号化して、EC2 から RDS への接続時にのみ復号化する、といった柔軟な対応も可能です。

KMS の仕組み自体は、Classmethod さんの書かれた「[10分でわかる！Key Management Serviceの仕組み](https://dev.classmethod.jp/articles/10minutes-kms/)」が詳しいのです。

## Terraform とは

公式: [Terraform](https://www.terraform.io/)

HashiCorp 社により開発されている、OSS のクラウド管理ツールです。AWS や GCP などのクラウドサービスに対して、リソースの作成・削除や、各種パラメータの調整機能をコードベースで提供します。オペレーターになどよる GUI 操作や AWS CLI コマンド操作を排除し、インフラリソース管理を Terraform に一本集中することで、煩雑なリソース管理作業を簡略化できます。

Future の技術ブログでは、[Terraform 関連の投稿](/tags/Terraform/)がありますので、こちらも合わせてご覧ください。

Terraform やってみたいという方は、以下の記事がオススメです。

- [はじめてのTerraform 0.12 ～環境構築～](/articles/20190816/)
- [春の入門祭り🌸 #18 Terraform 101](/articles/20200624/)

# 本記事の流れ

KMS の暗号化・復号化操作を、以下の流れで説明します。

- Terraform で KMS マスタキーの生成
- AWS CLI で暗号化・復号化
- Lambda で KMS 操作

また、本記事では一部 Terraform による操作を前提としていますが、基本的な Terraform 操作の説明は省略しています。

# Terraform で KMS マスタキーの生成

Terraform で KMS リソースを作成します。

KMS マスタキーの定義だけでなく、エイリアスも同時に定義します。

マスタキーの値は `1234abcd-12ab-34cd-56ef-1234567890ab` のような値であり非常に判別しづらいため、別名（エイリアス）として `alias/demo-alias` のように任意の識別名を付与します。

マスタキーの値と Alias の関係は **マスタキー : Alias = 1 : n** なので、1つのマスタキーには複数の Alias が設定可能です。逆に、1つの Alias を複数のマスタキーに紐づけることはできません。

公式: [エイリアスの使用](https://docs.aws.amazon.com/ja_jp/kms/latest/developerguide/kms-alias.html)

```tf kms
resource "aws_kms_key" "demo" {
  description             = "for demo"
  key_usage               = "ENCRYPT_DECRYPT"
  enable_key_rotation     = true
  deletion_window_in_days = 7
}

resource "aws_kms_alias" "demo" {
  name          = "alias/demo-alias"
  target_key_id = aws_kms_key.demo.id
}
```

Terraform 定義パラメータ

- [aws_kms_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key)
- [aws_kms_alias](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_alias)

リソース定義を追加後、`$ terraform plan/apply` により KMS マスタキーと Alias を作成します。

# AWS CLI で暗号化・復号化

作成した Alias を用いて、テキスト情報の暗号化・復号化作業を実施してみます。

暗号化作業で `AliasArn` の値を使うため、環境変数 **$KEYID** に登録します。

```bash
# KEYID に登録
$ export KEYID=$(aws kms list-aliases \
--query 'Aliases[?AliasName==`alias/demo-alias`]' | jq -r '.[].AliasArn')

# 確認
$ echo $KEYID
arn:aws:kms:ap-northeast-1:{aws-account}:alias/demo-alias
```

## 暗号化

ローカルに `PlaintextFile` の名前でファイルを生成して、認証情報の平文を保存します。

```bash
$ vim PlaintextFile

$ cat PlaintextFile
Hello, World!
```

続いて、AWS CLI コマンドにより `PlaintextFileの中身（=平文）` を暗号化します。

コマンド実行後、KMS により暗号化された認証情報が `CiphertextBlob` として取得できます。CiphertextBlob の実態は、認証情報を暗号化して Base64 エンコードした値です。

```bash
$ aws kms encrypt \
  --key-id $KEYID \
  --plaintext fileb://PlaintextFile
{
    "KeyId": "arn:aws:kms:ap-northeast-1:{aws-account}:key/{key-id}",
    "CiphertextBlob": "{暗号文}"
}
```

以上で「平文を暗号化して、暗号文を取得するまで」が完了です。

## 復号化

暗号文 `CiphertextBlob` の値を復号化してみましょう。

先ほどの操作で生成した暗号文 `CiphertextBlob` を、`CiphertextFile` に保存します。

```bash
$ aws kms encrypt \
  --key-id $KEYID \
  --plaintext fileb://PlaintextFile \
  --query CiphertextBlob \
  --output text | base64 --decode > CiphertextFile
```

復号化コマンドを実行すると、最初に暗号化した平文が取得できます。
暗号文自体に KEYID の情報が格納されているので、復号化のコマンドには `--key-id $KEYID` の指定が不要です。

```bash
$ aws kms decrypt \
  --ciphertext-blob fileb://CiphertextFile \
  --query Plaintext \
  --output text | base64 --decode
Hello, World!
```

以上で「暗号文の復号化」が完了しました。

# Lambda で KMS 操作

KMS で生成した暗号文を、Lambda の中で復号化します。

先ほどの暗号化作業で作成した `CiphertextBlob` の値を、Lambda 内で復号化します。

KMS の復号化には `kms:Decrypt` のポリシーが必須なので、demo 用の Lambda に以下のインラインポリシーを追加します。

```json KMS復号化用のインラインポリシー
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowDecryptKmsKey",
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt"
            ],
            "Resource": [
                "arn:aws:kms:ap-northeast-1:{aws-account}:key/{key-id}"
            ]
        }
    ]
}
```

Terraformでのlambdaのリソース構築設定に`kms_key_arn`を追記することで、lambdaはデフォルトのAWS KMSキーではなく作成したKMSのキーを利用するようになります。

```tf lambda
resource "aws_lambda_function" "kms_lambda" {
  filename      = "lambda_initial_script.zip"
  function_name = "kms-lambda"
  role          = aws_iam_role.lambdarole.arn
  handler       = "lambda"
  runtime       = "go1.x"
  memory_size   = 1024
  timeout       = 900
  kms_key_arn   = aws_kms_key.demo.arn
}
```

手動で設定を行う場合は環境変数の設定から暗号化設定を有効化します。
<img src="/images/2021/20210413a/lambda.png" alt="環境変数の編集画面" loading="lazy">

## Lambda で復号化

以下のコードを Lambda にデプロイして、復号化結果を取得してみます。
`encryptedKey` には、`CiphertextBlob` の値を直接代入しています。

```go kms-demo-lambda
package main

import (
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/kms"
)

// CiphertextBlob
var encryptedKey = "(CiphertextBlobの値)"

var svc = kms.New(session.Must(session.NewSession()))

func main() {
	lambda.Start(HandleRequest)
}

func HandleRequest() (string, error) {
	decryptedKey, err := decryptKey(encryptedKey)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("Decrypted text is: %s", decryptedKey), nil
}

func decryptKey(key string) (string, error) {
	v, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return "", err
	}

	in := kms.DecryptInput{
		CiphertextBlob: v,
	}
	out, err := svc.Decrypt(&in)
	if err != nil {
		return "", err
	}

	return strings.Replace(string(out.Plaintext), "\n", "", -1), nil
}

```

コマンドで動作確認
invoke を実行して、関数のレスポンスを取得

```bash
$ aws lambda invoke \
  --function-name kms-demo-lambda outfile.txt
{
    "StatusCode": 200,
    "ExecutedVersion": "$LATEST"
}

$ cat outfile.txt
"Decrypted text is: Hello, World!"
```

暗号化されていた `CiphertextBlob` の値が、正しく復号化されたことを確認できました。

# まとめ

本記事では、KMS のマスタキー生成を Terraform で行い、暗号化は AWS CLI で手動実施するというハイブリッド方式をご紹介しました。

`CiphertextBlob` の値は KMS で暗号化済みのため、Terraform やアプリケーションコードに直接追記しても問題ありません（Lambdaで利用するならば、ハードコードではなく環境変数に追記すべきですが）。GitHub 管理するコード上には暗号文のまま登録して、呼び出し先で復号化する機能配置ならば、生の認証情報がリポジトリに残らないようにできます。

以上、長文にお付き合いいただき、ありがとうございました。

## 参照記事

- [KMSで認証情報を暗号化しLambda実行時に復号化する](https://dev.classmethod.jp/articles/decrypt-sensitive-data-with-kms-on-lambda-invocation/)
