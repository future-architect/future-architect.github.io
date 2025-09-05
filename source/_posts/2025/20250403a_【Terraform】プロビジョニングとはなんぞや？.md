---
title: "【Terraform】プロビジョニングとはなんぞや？"
date: 2025/04/03 00:00:00
postid: a
tag:
  - Terraform
  - 初心者向け
  - AWS
  - Ansible
  - 用語解説
category:
  - DevOps
thumbnail: /images/2025/20250403a/thumbnail.png
author:  森友雅
lede: "業務でTerrafomでAWSのリソースを作成する作業を担当することになり、作業に取り掛かる前にTerraformとは何かを調べていました。公式を確認したところ..."
---

<img src="/images/2025/20250403a/16169_color.png" alt="" width="748" height="550">

[Terraform連載2025](/articles/20250331a/)の3日目です。

# 背景

業務で[Terrafom](https://www.terraform.io/)でAWSのリソースを作成する作業を担当することになり、作業に取り掛かる前にTerraformとは何であるか調べていました。

公式を確認したところ...

> Use infrastructure as code to automate the provisioning of your infrastructure including servers, databases, firewall policies, and almost any other resource.
> （Geminiによる和訳）インフラストラクチャをコード化して、サーバー、データベース、ファイアウォールポリシーなど、ほぼすべてのリソースのプロビジョニングを自動化しましょう。

引用：[Terraform by HashiCorp](https://www.terraform.io/#:~:text=Common%20use%20cases%20for%20Terraform)

...とあり、どうやらTerraformを使えば「**IaC（infrastructure as code）を使用してインフラのプロビジョニングを自動化できる**」ようです。私はこのとき「ん？プロビジョニングとはなんぞや？」となり、インフラの何かを自動化できるんだな程度しか理解していませんでした。そんな状態でTerraform関連のインフラのことをいろいろと調べていたのですが、いたるサイトで当然のように「プロビジョニング」が使われていたので「これは知っておかないとまずいな...」と感じました。

以上の背景から、本記事では「プロビジョニング」という用語を理解し、使えるようになるまで深ぼっていこうと思います。

# 結論

- プロビジョニング ＝ 供給すること
- プロビジョニングは広義の意味であるため、狭義の意味の「○○プロビジョニング」が数多く存在
- プロビジョニング ≠ 構成管理

# プロビジョニングの語源

プロビジョニング（provisioning）とは動詞のプロビジョン（provision）「供給する」の動名詞で、「供給すること」という意味です。
(参考：[provision - ウィクショナリー日本語版](https://ja.wiktionary.org/wiki/provision))

IT領域におけるプロビジョニングとは、ハードウェアやネットワーク、仮想マシンやその他リソースなどのITインフラを「供給すること」を指します。ここで注意してほしいのはプロビジョニングという用語はTerraformやAWSなどのクラウド領域に閉じた話ではなく、幅広いインフラ領域で使用されているということです。

>プロビジョニングとは、必要に応じてネットワークやコンピュータの設備などのリソースを提供できるよう予測し、準備しておくことです。供給や設備等の意味を表すプロビジョン（provision）という単語がもととなって派生した言葉です。

引用：[プロビジョニングとは | クラウド・データセンター用語集／IDCフロンティア](https://www.idcf.jp/words/provisioning.html)

>プロビジョニング（provisioning）は、「供給、準備、提供」といった意味を持つ「provision」に由来する言葉。IT分野では、ユーザーの需要を予測し、ネットワークの設備やシステムリソースなどを準備しておくこと。もともとは、通信事業者が回線設備などを準備し、ユーザーにネットワークを提供できるようにすることを指していた。

引用：[IT用語集「プロビジョニング」 | スマートワーク総研](https://swri.jp/glossary/%E3%83%97%E3%83%AD%E3%83%93%E3%82%B8%E3%83%A7%E3%83%8B%E3%83%B3%E3%82%B0)

>Provisioning is the process of creating and setting up IT infrastructure, and includes the steps required to manage user and system access to various resources. Provisioning is an early stage in the deployment of servers, applications, network components, storage, edge devices, and more.
> （Geminiによる和訳）Provisioning（プロビジョニング）は、ITインフラストラクチャの作成と設定のプロセスであり、様々なリソースへのユーザーおよびシステムアクセスを管理するために必要なステップを含みます。プロビジョニングは、サーバー、アプリケーション、ネットワークコンポーネント、ストレージ、エッジデバイスなどの展開における初期段階です。

引用：[What is provisioning?](https://www.redhat.com/en/topics/automation/what-is-provisioning)

>In IT and computing, provisioning refers to the process of setting up [IT infrastructure](https://www.ibm.com/think/topics/infrastructure), which includes hardware, networks, [virtual machines](https://www.ibm.com/think/topics/virtual-machines) and other resources, and making resources and data available to systems and users.
> （Geminiによる和訳）ITおよびコンピューティングにおいて、プロビジョニングとは、ハードウェア、ネットワーク、仮想マシン、その他のリソースを含むITインフラストラクチャを設定し、システムやユーザーがリソースやデータを利用できるようにするプロセスのことを指します。

引用：[What is Provisioning? | IBM](https://www.ibm.com/think/topics/provisioning)

# プロビジョニングの種類

前節でも説明したように、IT領域における「プロビジョニング」とは「**ITインフラを供給すること**」であり、広義の意味を持っています。そのため、プロビジョニングにはいくつかの種類が存在します。以下に主要なプロビジョニングの種類を紹介します。

以下の主要なプロビジョニングの種類の説明は「[What is provisioning?](https://www.redhat.com/en/topics/automation/what-is-provisioning)」と「[What is Provisioning? | IBM](https://www.ibm.com/think/topics/provisioning)」を参考にしています。

## サーバプロビジョニング（server provisioning）

物理サーバや仮想サーバ（[ハイパーバイザ](https://ja.wikipedia.org/wiki/%E3%83%8F%E3%82%A4%E3%83%91%E3%83%BC%E3%83%90%E3%82%A4%E3%82%B6)などを使って実現）をセットアップし、オペレーティングシステム（OS）やアプリケーションなどのソフトウェアをインストール・設定し、必要なネットワークやストレージコンポーネントに接続する一連のプロセスを指します。これにより、サーバをビジネス要件に適した状態にします。

## ネットワークプロビジョニング（network provisioning）

[ルータ](https://ja.wikipedia.org/wiki/%E3%83%AB%E3%83%BC%E3%82%BF%E3%83%BC)や[スイッチ](https://ja.wikipedia.org/wiki/%E3%82%B9%E3%82%A4%E3%83%83%E3%83%81%E3%83%B3%E3%82%B0%E3%83%8F%E3%83%96)、[ファイアウォール](https://ja.wikipedia.org/wiki/%E3%83%95%E3%82%A1%E3%82%A4%E3%82%A2%E3%82%A6%E3%82%A9%E3%83%BC%E3%83%AB)などのネットワークコンポーネントを設定し、IPアドレスを割り当て、ネットワークへのアクセスを管理するプロセスを指します。また、ネットワークの運用状態を確認し、適切なセキュリティ対策を実施することもこのプロセスに含まれます。

## ユーザプロビジョニング(user provisioning)

アイデンティティアクセス管理（IAM:identity and access management）の一種で、ユーザアカウントの作成、変更、削除、およびアクセス権の管理を行うプロセスです。このプロセスの例として[ロールベースアクセス制御（RBAC:role-based access control）](https://ja.wikipedia.org/wiki/%E3%83%AD%E3%83%BC%E3%83%AB%E3%83%99%E3%83%BC%E3%82%B9%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E5%88%B6%E5%BE%A1)があります。

## クラウドプロビジョニング(cloud provisioning)

クラウド環境を支えるインフラを構築するプロセスです。このプロセスには、ネットワーク、ストレージ、仮想化などの基盤をセットアップし、クラウド内で利用するリソース、サービス、アプリケーションを構成する作業が含まれます。

プロビジョニングの種類は他にもまだまだあります。

- [アプリケーションプロビジョニング(application provisioning)](https://www.ibm.com/think/topics/provisioning)
- [デバイスプロビジョニング(device provisioning)](https://www.insight.com/en_US/content-and-resources/glossary/d/device-provisioning.html)
- [シン・プロビジョニング(thin provisioning)](https://www.ibm.com/docs/ja/ds8900/9.3.2?topic=features-thin-provisioning)

以上のように、プロビジョニングは様々な用途で定義されています。すべての○○プロビジョニングが狭義の意味で定義されているわけではなく、広義の意味で定義されているものもあります。例えばクラウドプロビジョニングは広義寄りで、この中にサーバプロビジョニングやユーザプロビジョニング、ネットワークプロビジョニングなど、数多くのプロビジョニングが含まれています。

# プロビジョニング ≠ 構成管理 (configuration management)であるということ

>Provisioning is not the same thing as configuration management, but they are both steps in the deployment process. Once a system has been provisioned, the next step is to configure the system and maintain it consistently over time.
> （Geminiによる和訳）プロビジョニングは構成管理と同じものではありませんが、両方とも展開プロセスにおけるステップです。システムがプロビジョニングされたら、次のステップはシステムを構成し、時間の経過とともに一貫性を維持することです。

引用：[What is provisioning?](https://www.redhat.com/en/topics/automation/what-is-provisioning)

「プロビジョニングと構成管理はどちらもデプロイのプロセスではあるが、同じものではない」と説明されています。前述の引用内容にもあるように新しくシステムを導入すのが「プロビジョニング」で、プロビジョニングしたシステムをメンテするのが「構成管理」にあたりそうです。

余談:

Terraformは「プロビジョニングツール」、[Ansible](https://www.redhat.com/en/ansible-collaborative)は「構成管理ツール」と認識していたのですが、Terraformでパラメータを調整することは可能ですし、Ansibleでシステムを新規追加することも可能なので、TerraformとAnsibleともに「プロビジョニングツール」であり「構成管理ツール」でもあると感じました。（TerraformとAnsibleの違いの説明は「[Ansible vs. Terraform: What's the difference?](https://mediacenter.ibm.com/media/Ansible+vs.+Terraform%3A+Whats+the+difference/1_uhhi903l)」がわかりやすかったです。Terraformでは宣言型で記述し、状態を管理するためのライフサイクルを持っているようです。対してAnsibleでは宣言型と手続き型のハイブリッド(本質的には手続き型)で記述し、ライフサイクルを持たないようです。）

# 最後に

「プロビジョニング」について理解が深まったかなと思ってます。

私は業務で[AWS ECS](https://aws.amazon.com/jp/ecs/)を利用しているのですが、サービスを実行するときに「今タスクをプロビジョニングしてますー」と言ったり、サービスを停止するときに「今デプロビジョニング中ですー」と自信をもって言えるようになったのが本記事を作成して一番良かったなと感じている点です。（笑）
