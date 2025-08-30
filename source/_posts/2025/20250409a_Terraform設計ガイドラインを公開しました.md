---
title: "Terraform設計ガイドラインを公開しました"
date: 2025/04/09 00:00:00
postid: a
tag:
  - Terraform
  - ガイドライン
category:
  - DevOps
thumbnail: /images/2025/20250409a/thumbnail.png
author: 伊藤太斉
lede: "年始から、社員の有志でTerraform設計ガイドラインを編集し、先日公開したので公開までの経緯などについて触れていきます。"
---
<img src="/images/2025/20250409a/スクリーンショット_2025-04-08_23.57.15.png" alt="" width="1200" height="650" loading="lazy">

こんにちは。TIGの伊藤です。

[Terraform連載2025](/articles/20250331a/)の6日目の記事です。

2025年始から、社員の有志で[Terraform設計ガイドライン](https://future-architect.github.io/arch-guidelines/documents/forTerraform/terraform_guidelines.html)を編集し、先日公開したので公開までの経緯などについて触れていきます。

## 公開までの経緯

[Future Enterprise Arch Guidelines](https://future-architect.github.io/arch-guidelines/)として、これまでにも[WebAPI設計ガイドライン](https://future-architect.github.io/arch-guidelines/documents/forWebAPI/)、[Slack利用ガイドライン](https://future-architect.github.io/arch-guidelines/documents/forSlack/)などを公開してきましたが、これらは社内に知見が溜まってきていることをきっかけに、ガイドラインとして整理して公開しています。

Terraformについても、社内の複数プロジェクトで利用されており、それぞれで工夫したこと、ケアしたポイントなどが知見として出てきていることから、社員がリファレンスとすることも含めて編集、公開することになりました。

### チームにおけるガイドラインを設けることの難しさ

各プロジェクト、チームでは一定のコーディング規約やガイドラインを定めて開発することがしばしばあるかと思います。

それらは過去に経験した資産を流用するケースであったり、はたまた一から作りあげることもあるでしょう。

ただ、その時に発生するのが、プロジェクト、チーム間での差分です。プロジェクトAでは推奨されていた書き方だが、プロジェクトBでは別の書き方を推奨していた、または特に明記がされていないなど粒度がまちまちになり、開発者としては迷い、判断基準が曖昧になってしまいます。

そんなプロジェクト間での差分をより少なくするためでもあり、Terraformの書き方、設計で迷った時に見るドキュメントとしてTerraform設計ガイドラインが出来上がりました。

### 実際の参考例

ここではいくつか参考にできそうな例を記載しますが、基本的にはTerraformを少しわかる人から、リーダーの方まで見ていただけるような幅広い内容となっています。

#### ①基本的な文法

例えば、Terraformでは[コメント](https://future-architect.github.io/arch-guidelines/documents/forTerraform/terraform_guidelines.html#%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88)の記載方法が行頭に`#`を書くパターン、行頭に`//`を書くパターン、コメントアウトしたい部分を`/* */`で囲むパターンと３種類あります。
本ガイドラインでは、理由としてはVSCodeでコメントアウトする場合に利用されるものであったり、公式としても推奨されていることから、`#`を推奨としています。

#### [②環境を分離する方法](https://future-architect.github.io/arch-guidelines/documents/forTerraform/terraform_guidelines.html#%E7%92%B0%E5%A2%83%E5%88%86%E9%9B%A2)

Terraformでは本番、検証といった環境の分離を行う方法がいくつかありますが、実際にどのレベルで分離することが最適なのかをガイドライン作成の際に検討を重ねてまとめています。
本ガイドラインでは、ディレクトリで分離する方法を推奨案としています。

#### [③開発フロー](https://future-architect.github.io/arch-guidelines/documents/forTerraform/terraform_guidelines.html#%E9%96%8B%E7%99%BA%E3%83%95%E3%83%AD%E3%83%BC)

当社ですでに公開している[Gitブランチフロー規約](https://future-architect.github.io/arch-guidelines/documents/forGitBranch/git_branch_standards.html)とも関わってくる話ですが、Terraformにおけるブランチ管理に始まり、開発時に整えておきたい開発者側のガバナンスを記載しています。
例えば、実際の開発に使うツール、リンターなどが挙げられます。

## まとめ

Terraform設計ガイドラインの公開を報告しました。

TerraformはIaCの中でもマルチクラウドで利用できる点、さらなる機能拡充がされてきており、より使いやすいツールになってきていると考えています。ただ、それによって迷うポイントも増えてきているかと思いますので、そんなときはぜひ本記事で紹介したガイドラインをぜひご一読ください。
