---
title: "Terraform連載2024 Stateを統合してみる"
date: 2024/03/14 00:00:00
postid: a
tag:
  - Terraform
  - tfstate
category:
  - DevOps
thumbnail: /images/2024/20240314a/thumbnail.png
author: 原田達也
lede: "tfstateを統合する機会があったので、その経験をもとにまとめます。"
---

[Terraform 連載2024](/articles/20240311a/)の4本目です。

## はじめに

はじめまして。Technology Inovation Group (TIG) の原田と申します。

私が所属しているチームではTerraformでAWSリソースを管理しており、tfstateを統合する機会があったので、その経験をもとに記事を書きます。

### 環境

Terraform バージョン 1.5.7

## ことの経緯

私が所属しているチームでは、サービスごとに複数のtfstateでリソースを管理していました。

ただ、プロダクトが成熟してきて、リリース頻度が非常に低い&リリースをしたとしても複数サービスが同じタイミングでリリースされることが多くなりました。

そういった理由から、成熟しきったStateを統合しようという機運が高まりました。

## 方針

ゴールは、移行元のtfstate(a.tfstate)を移行先のtfstate(b.tfstate)にマージしてb.tfstateですべてのAWSリソースを管理できる状態です。

そのための作業パターンとして大きく2つの案を考えました。

## 二つの作業パターン

### パターン（1）「import & removeコマンド」

手順:

1. 統合元のStateで `remove` コマンド
2. 統合先のStateで `import` コマンド
3. Terraform のコードを統合
4. `plan` にて差分が発生しないことを確認

お手軽ですね。Terraform直々に提供している機能ということもあって、安心感もあります。

1\. 統合元のStateで `remove` コマンド

```sh  s3の場合
# 統合元のStateにて
$ terraform state rm aws_s3_bucket.s3
```

2\. 統合先のStateで `import` コマンド

```sh  s3の場合
# 統合先のStateにて
$ terraform state import aws_s3_bucket.s3 バケット名
```

Terraformのバージョンが1.5以上の場合はimport ブロックを使用するのもよいでしょう。

https://developer.hashicorp.com/terraform/language/import

3\. Terraform のコードを統合
コピー&ペーストでいいですね。リソースが多い場合はかなり根気が要ります。

4\. `plan` にて差分が発生しないことを確認

```sh
$ terraform plan

==(略)==

No changes. Your infrastructure matches the configuration.
```

お疲れ様でした。

お気づきの方もいらっしゃるかと思いますが、管理リソースが多い場合はかなり作業コストが高いです。リソースごとに、import・removed・コードの修正が必要になります。

私のチームでは100を優に超えるAWSリソースを管理していたため、この方法は現実的ではありませんでした。

### パターン（2）「Stateを編集」

Stateを直接操作することはあまり推奨されないですが、今回はこの選択をとりました。

操作イメージとしては以下のような手順です

<img src="/images/2024/20240314a/terraform_merge.drawio.png" alt="terraform_merge.drawio.png" width="427" height="429" loading="lazy">

手順:

1. ローカルにtfstateをローカルに取得
2. 2つのStateファイルをマージ
3. マージしたtfstateファイルを統合先にpush
4. Terraform のコードを統合
5. `plan` にて差分が発生しないことを確認

パターン（1）よりステップが1つ多くなっているように見えますが、ちょっと待ってください。詳しく見ていきましょう。

1\. ローカルにtfstateをローカルに取得

```sh  作業例
# 統合元のStateにて
$ terraform state pull > a.tfstate
```

```sh  作業例
# 統合先のStateにて
$ terraform state pull > b.tfstate
```

2\. 2つのStateファイルをマージ

ここが今回の作業のキモです。頑張って手作業でStateファイルをマージしていきましょう。

...というのは危険なので、今回は[fujiwara](https://github.com/fujiwara)さんが開発された、便利なツールを利用させていただきましょう。

https://github.com/fujiwara/tfstate-merge

コマンド一撃でtfstateファイルをマージしてくれる、何ともありがたいツールです。

ある程度のバリデーション機能も実装されているので、手動でマージするより、格段に安心して作業できます。

こちらで作者であるfujiwaraさんの解説があるので、詳細に関してはそちらをぜひご覧ください。

https://sfujiwara.hatenablog.com/entry/tfstate-merge

```sh  作業例
tfstate-merge b.tfstate a.tfstate > b'.tfstate
```

3\. マージしたtfstateファイルを統合先にpush

```sh
terraform state push b'.tfstate
```

::: note warn
tfstateファイルは必ずバックアップを取っておくようにしましょう
:::

4\. Terraform のコードを統合

ここはパターン（1）と同様、根気よく作業していきましょう。
git の 差分の増減などを確認するもよいでしょう。

5\. `plan` にて差分が発生しないことを確認

```sh
$ terraform plan

==(略)==

No changes. Your infrastructure matches the configuration.
```

お疲れ様でした。

こちらのパターンの利点は作業の負担が圧倒的に少ないです。ただ、`terraform state push`というかなり危険なコマンドを使用するので実行には細心の注意を払いましょう。

## おわりに

tfstateを統合した経験について書きました。

Stateの統廃合や、moduleへの移行など、Terraformのリファクタには様々な手札がありますが、エンジニアたるもの日常的により良いコードを目指していきたいですね。これは自身への戒めでもあります。

新卒でIT業界に飛び込み、もうすぐ2年が過ぎようとしていますが、自身の経験を発信していくことは良い刺激になりました。[Terraform 連載2024](/articles/20240311a/)の一環として執筆させていただきましたが、非常に興味深いトピックが目白押しなので、ぜひ他の記事もご覧ください！
