---
title: "AWS CLIで用いるMFAをちょっとだけ便利に扱えるツールを公開しました"
date: 2021/04/26 00:00:00
postid: a
tag:
  - AWS
  - IAM
  - OSS
  - Go
category:
  - Programming
thumbnail: /images/20210426a/thumbnail.jpg
author: 辻大志郎
lede: "AWSのIAMユーザのセキュリティ上、IAMユーザにMFAを導入するケースがあります。MFAを有効にしているIAMユーザでGUI経由でログインする場合は、ログイン時に認証情報が求められて、MFAデバイスが出力するトークンを入力することでログインできます。一方AWS CLIを用いてリソースにアクセス場合はコマンド発行時に認証情報は求められません。代わりに以下のような記事にかかれているような..."
---

<img src="/images/20210426a/access-3579221_640.jpg" alt="" title="mohamed HassanによるPixabayからの画像" class="img-middle-size">

こんにちは、辻です。

AWSのIAMユーザのセキュリティ上、IAMユーザにMFA(他要素認証)を導入するケースがあります。MFAを有効にしているIAMユーザでGUI経由でログインする場合は、ログイン時に認証情報が求められて、MFAデバイスが出力するトークンを入力することでログインできます。一方AWS CLIを用いてリソースにアクセス場合はコマンド発行時に認証情報は求められません。代わりに以下のような記事にかかれているような、一時的な認証情報を発行することがよく行われます。

- [MFA トークンを使用して、AWS CLI 経由で AWS リソースへのアクセスを認証する方法を教えてください。](https://aws.amazon.com/jp/premiumsupport/knowledge-center/authenticate-mfa-cli/)

`get-session-token` コマンドを発行することで一時的な認証情報を発行する、ということです。

```bash
$ aws sts get-session-token --serial-number arn-of-the-mfa-device --token-code code-from-token --profile my-login-profile
```

コマンドが成功すると、以下のようなJSONがレスポンスとして返ってきます。

```json
{
    "Credentials": {
        "SecretAccessKey": "secret-access-key",
        "SessionToken": "temporary-session-token",
        "Expiration": "expiration-date-time",
        "AccessKeyId": "access-key-id"
    }
}
```

返ってきたレスポンス `SecretAccessKey`, `SessionToken` を `~/.aws/credentials` に記述したり、あるいは環境変数を更新する必要があります。

上記のJSONの値を `~/.aws/credentials` に記述することでリソースにアクセスできるようになったものの、`get-session-token` コマンドを発行した認証情報は最大で129600秒(=36時間)です。一時的な認証情報という意味では妥当ですが、AWS CLIは頻繁に利用するため、ほぼ毎日 `get-session-token` コマンドで出力したJSONの値を `~/.aws/credentials` に貼り付ける作業が発生するようになりました。これはちょっと面倒です。

そこで [future-architect/awsmfa](https://github.com/future-architect/awsmfa) というAWS CLIでMFAを扱うときにちょっとだけ便利にMFAを扱うコマンドラインツールを作りました。

## `future-architect/awsmfa`

[<img src="https://github.com/future-architect/awsmfa" alt="future-architect/awsmfa - GitHub](https://gh-card.dev/repos/future-architect/awsmfa.svg)" loading="lazy">

### 何ができるのか

* AWSの `config` ファイルや `credential` ファイルにMFA用の名前付きプロファイルを生成
* MFAに使用する値を、コマンド実行時に自動で更新

### 使い方

`sts get-session-token` と同じ要領で `awsmfa` コマンドを実行するだけです。

```bash
$ awsmfa --serial-number arn:aws:iam::123456789012:mfa/my-login-role --profile my-login-profile code-from-token
```

MFAの認証情報を扱うプロファイル名はデフォルトで `mfa` としています。(別のプロファイル名で保存したい場合はオプションに `--mfa-profile-name` を指定します。)上記の `awsfma ...` コマンドを実行すると以下のように `mfa` のプロファイル名が追加されます。2回目以降は `~/.aws/credentials` の `mfa` プロファイル名の値を更新するようになっています。

- `~/.aws/config`

```ini
[default]
region = us-east-1
output = json

[profile mfa] <- このプロファイル名が追加されます
```

- `~/.aws/credentials`

```ini
[default]
aws_access_key_id     = ABCDEFGHIJKLMNOPQRST
aws_secret_access_key = ChEXAMPLEraRNW5iy8XgDyR4QNRT44kKRPmKEGQT

[mfa] <- このプロファイル名が追加されます。2回目以降は自動でこのプロファイルの中身を更新します
aws_access_key_id     = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY
aws_session_token     = AQoEXAMPLEH4aoAH0gNCAPyJxz4BlCFFxWNE1OPTgk5TthT+FvwqnKwRcOIfrRh3c/LTo6UDdyJwOOvEVPvLXCrrrUtdnniCEXAMPLE/IvU1dYUg2RVAJBanLiHb4IgRmpRV3zrkuWJOgQs8IZZaIv2BXIa2R4OlgkBN9bkUDNCJiBeb/AXlzBBko7b15fjrBs2+cTQtpZ3CYWFXG8C5zqx37wnOE49mRl/+OtkIKGO7fAE
```

### インストール

Linuxの場合はシェルスクリプト一発でローカル環境にインストールできます。このコマンドラインツールはGoで書かれており、マルチプラットフォーム向けにシングルバイナリを簡単に提供できます。インストールが簡単に行えるのはとても良いですね。

```
$ curl -sfL https://raw.githubusercontent.com/future-architect/awsmfa/master/install.sh | sudo sh -s -- -b /usr/local/bin
```

Windowsの場合は [Releases](https://github.com/future-architect/awsmfa/releases) から最新のバイナリを取得して、パスが通っているディレクトリにバイナリを配備してください。

### まとめ

AWS CLIで用いるMFAの運用をちょっとだけ楽にするツールを作りました。

やろうと思えばシェル芸でもできそうですし、`99designs/aws-vault` や `broamski/aws-mfa` などのよりリッチなOSSもあります。今回は自分たちのユースケースのために作ったツールを公開しました。

さっそくプルリクエストもいただきました。社外の方からも使っていただき嬉しく思います。

https://github.com/future-architect/awsmfa/pull/9

