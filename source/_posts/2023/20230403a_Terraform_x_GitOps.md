---
title: "Terraform x GitOps についての調査"
date: 2023/04/03 00:00:00
postid: a
tag:
  - Terraform
  - GitOps
  - GitHubActions
  - CI/CD
category:
  - DevOps
thumbnail: /images/2023/20230403a/thumbnail.png
author: 川口翔大
lede: "Terraform x GitOps ということで、いつかちゃんと調べておきたいなと思いながらなかなかできていなかったことについて調査していこうかなーと思います。そもそも Terraform x GitOps とはなんぞやということからですが。"
---
# はじめに

こんにちは！ TIG コアテクの川口です。

こちらは、 [Terraform 連載](/articles/20230327a/) の6日目の記事になります！
今回は **Terraform x GitOps** について調査しました。

## Terraform x GitOps?

そもそも **Terraform x GitOps** とはなんぞやということからですが。
まず **GitOps** という概念は、 [Weaveworks 社によってはじめに提唱されたもの](https://www.weave.works/technologies/gitops/) です。

主に Kubernetes リソースを管理する文脈で登場した概念で、4つの主要な原則として以下のように定義しています。

> **#1. Declarative: The entire system has to be described declaratively**
~ システム全体を宣言的に記述する。~
> **#2. Versioned and immutable: The canonical desired system state is versioned in Git**
~ 望ましいシステムの基準の状態は、Git でバージョン管理されてイミュータブルとする。 ~
> **#3. Pulled automatically: Approved changes are automatically applied to the system**
~ 承認された変更はシステムに自動的に適用される。 ~
> **#4. Continuously reconciled: Software agents to ensure correctness and alert on divergence**
~ 正確性を確保して、相違点を警告するソフトウェアエージェント。 ~

今回は、Terraform 連載ということで Terraform を運用するうえでこのような考え方を取り入れる方法について述べていきます。

## 利用するサービス

それでは早速 GitOps を実現するうえで利用するサービスについて考えていきます。

## 一般的な CI/CD サービス

一般的なとは？ というお話ですが…。「後述の2つのものとは違うよ」といった意味合いで用いています。
具体的なものでいうと以下のようなものを指しています。

- **GitHub Actions**
- **Jenkins** （[4日目の渡邉さんの記事](https://future-architect.github.io/articles/20230330a/)でも詳細に紹介されていましたね！）
- **GitLab CI/CD**
- **CircleCI**
- **Travis CI**
- **Google Cloud Build**
- **AWS CodePipeline**
- **Azure DevOps Pipelines**
- ...

今回の記事でどれを取り上げるか悩みましたが、広く利用されている **GitHub Actions** を取り上げようと思います。

### GitHub Actions?

**GitHub Actions** とは、GitHub上で自動化されたワークフローを作成・実行できる機能です。GitHub を開発時に利用している場合には、扱いやすさの観点で採用されやすいサービスだと個人的には思っています。

また、[変更されたファイルをもとにイベントを発火する](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#using-filters-to-target-specific-paths-for-pull-request-or-push-events) 機能はなかなかユニークだなーとなった記憶があります（最近だと、他サービスも拡張機能等で実現できるようにしていそうですが）。

GitHub Actions でいうところのいわゆる拡張機能は、**Actions** と呼ばれるもので様々な開発者が提供してくれています。どのようなものがあるかを調べるには、[こちら](https://github.com/marketplace?type=actions) の **Actions MarcketPlace** が参考になると思います。その他詳細に関しては、 [ドキュメント](https://docs.github.com/en/actions) を参照してください。

### GitOps に特化した CD サービス

次に GitOps に特化した CD サービスということで以下のようなサービスを対象とします。

以下は、Kubernetes リソースを管理する際によく名前にあがるものかなと思いますが、Terraform の各種リソースに関しても管理ができるように対応されているようです。

- **[PipeCD（Terraform x GitOps）](https://pipecd.dev/docs/user-guide/managing-application/defining-app-configuration/terraform/)**
- **[FluxCD（Terraform x GitOps）](https://fluxcd.io/blog/2022/09/how-to-gitops-your-terraform/)**
- ...

今回の記事では Terraform x GitOps をやるうえで、その周辺の開発が最も進んでいそうな **PipeCD** を取り上げてみようと思います！

## PipeCD?

**PipeCD** とは、GitOps を実現するための CD ツールの1つです。Kubernetes x GitOps の文脈で見かけることが多いかなと思っています。他 GitOps CD ツールとの差異としては、Kubernetes リソースの他に、各種クラウドサービス（Cloud Run, Amazon ECS, AWS Lambda）を利用できることと [しているよう](https://pipecd.dev/docs-dev/faq/)  です。

また、下記のように GitOps という用語が説明にあるサービスなだけあって上記の GitOps の原則を守るための機能は一通り有しているようです。

> A GitOps style continuous delivery platform that provides
consistent deployment and operations experience for any applications

詳細は、 [ドキュメント](https://pipecd.dev/) を参照してください。

## Terraform 管理に特化したサービス

最後は Terraform 管理に特化したサービスということで以下のようなサービスを対象とします。

- **[Terraform Cloud](https://developer.hashicorp.com/terraform/cloud-docs)**
- **[Atlantis](https://www.runatlantis.io/)**
- ...

今回の記事ではこちらの2つのサービス **Terraform Cloud** と **Atlantis** を取り上げてみようと思います！

## Terraform Cloud?

**Terraform Cloud** とは、Terraform をクラウド上で管理するためのツールです。
plan, apply 等の各種作業をクラウド上でできるようになります。

それだと GitOps は？ といったことになりそうですが、様々な [VCS Integration](https://developer.hashicorp.com/terraform/cloud-docs/vcs) を提供しているため、こちらを使えば実現できます。
ただし、ユーザー数や利用する機能によっては [有料になる](https://www.hashicorp.com/products/terraform/pricing) ためそこには注意が必要そうです。

ドキュメントは、 [こちら](https://developer.hashicorp.com/terraform/cloud-docs) になります。

## Atlantis?

最後に取り上げるのは **Atlantis** です。[こちら](https://www.runatlantis.io/guide/#enable-collaboration-with-everyone) でわかりやすく概念等について述べられていました。

イメージとしては Git の PR 上で ChatOps 的に [plan, apply 等](https://www.runatlantis.io/docs/using-atlantis.html) の実行を行えるツールといったものになりそうですかね！
個人的には、plan には成功したけれど apply で失敗する…。といったこともまあまあ起こりうるのかなーと思っているので、main に merge されたら apply するというよりかは、PR 上で apply まで担保できるようにするといった運用が取れるのはなかなか良さそうなのカナーと思いました。

さらに [独自のロックの機構](https://www.runatlantis.io/docs/locking.html) も持っているようで、この機能によりチーム単位で修正を行う際でも安全に plan や apply を行えそうです。
このロックは、もちろんリポジトリ単位ではなくディレクトリ単位や Terraform Workspace 単位でロックがかかるようになっているようです（そもそもどのようなディレクトリ構成の Terraform を扱えるかは [こちら](https://www.runatlantis.io/docs/requirements.html#repository-structure) に記載があります）。。
GitHub Actions 等でもいわゆる ChatOps 的な運用を実現することは可能ではあるのですが、なかなかここまで厳密なロックの機構を実現するのは難しそうなのかなと思います。

その他詳細は、[ドキュメント](https://www.runatlantis.io/docs/) を参照してください。

# GitOps やっていき！

それでは早速上述のサービスについて触れていきます。

今回は Git ホスティングサービスとしては、 **GitHub** を対象とします。
また Terraform の管理対象としては **Google Cloud の各種リソース** とします。

改めてですが GitOps の原則に忠実に則るということであれば、**「コンソール等からシステムの状態・構成を変更するような作業は一切禁止とする」** ことにも注意です。上述の #1, #2 の原則に反するからですね！

# GitHub Actions を使った GitOps

## Install

[**Self Hosted Runners**](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners)（ランナーを自分でホスティングする） を使わずに、 [**GitHub Hosted Runners**](https://docs.github.com/ja/actions/using-github-hosted-runners/about-github-hosted-runners)（ランナーを GitHub にホスティングしてもらう）を使うということであれば、特にインストール作業は必要にはなりません。

これらの違いに関しては、 [こちら](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners#differences-between-github-hosted-and-self-hosted-runners) にわかりやすくまとめられていました。他サービスの類似概念とほぼ同様かなと思いますが、主にメンテナンスコスト・カスタマイズ性・プライシングの面で差異があるようです。

## Setup

上述の通りに GitHub Actions では様々な Actions が公開されており、 Terraform を管理するためのものもありました。
基本的に今回の用途であれば、以下の2つの Actions を使用してワークフローを組むとよさそうです。

- [setup terraform](https://github.com/hashicorp/setup-terraform): Terraform をよしなに扱えるようにする Action。
- [google auth](https://github.com/google-github-actions/auth): Google Cloud の認証を行う Action（Wokload Identity による認証とサービスアカウントのキーを使った認証のどちらにも対応している様子）。

GitHub Actions では、[こちら](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow) のように様々なトリガーが設定できます。また、先ほどのパスの概念も用いれば柔軟に運用はできそうですね！

原則 #4 に従うとなるとなかなか難しそうですが、厳密に相違点が出た場合に検知したいということであれば、 [schedule workflow](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule) を使ってチェックする感じですかね（そこまで厳密にやらなければならないケースがあるかは悩ましいところですが）。

また、排他制御に関しても、[concurrency](https://docs.github.com/en/actions/using-jobs/using-concurrency) という概念がある程度利用できそうです。

# PipeCD を使った GitOps

## Install

PipeCD を扱うためには、 **Control Plane** と **Piped** を [インストールする必要があります](https://pipecd.dev/docs-dev/installation)。そもそも Control Plane とは？ Piped とは？ といったところは [PipeCD の Concepts](https://pipecd.dev/docs-dev/concepts/) に記載されています。

イメージとしては、Control Plane が集中管理用のコンポーネント（Web コンソール等を含む）でおおよそ組織単位で1つできるもの。Piped が GitOps を行いたい各種対象と疎通をするためのステートレスエージェントでおおよそ開発環境単位で1つできるものといったものになるのかなと思います（諸々運用によっては変わりそうではありそうな気配はありますが、本筋から逸れるのでそこまでは言及しません！）

以下は上記リンクに記載がありました概念図になります。

<img src="/images/2023/20230403a/image.png" alt="" width="1200" height="761" loading="lazy">

Control Plane をインストールするには状態を永続化する必要があるため、Kubernetes Cluster の他に **[Data Store（Firestore, MySQL etc...）](https://pipecd.dev/docs-dev/user-guide/managing-controlplane/architecture-overview/#data-store), [File Store（GCS, S3, Minio etc...）](https://pipecd.dev/docs-dev/user-guide/managing-controlplane/architecture-overview/#file-store)** が [必要のようです](https://pipecd.dev/docs-dev/installation/install-controlplane/)。他にも Web コンソールに円滑にアクセスしようとなった場合には、いくつかのネットワークの設定（静的IP アドレスの付与や DNS の設定 etc...）もする必要がありそうですね！

Piped のインストールは Piped 自体がステートレスなエージェントということで、そこまで複雑ではなさそうです。Kubernetes Cluster に helm でインストールする他にも、 [いくつか方法がある](https://pipecd.dev/docs-dev/installation/install-piped) ようです。

## Setup

上記の手順が完了したら、PipeCD を実際に試せる状態になっているはずです。ただ実際に、Terraform リソースを扱おうとなった場合には、さらに以下の手順を実行することになります。

### Terraform Application の作成

はじめにやることは Terraform Application の作成です。そもそも Application とは？ といったところも、 [Concepts](https://pipecd.dev/docs-dev/concepts/#application) に記載がありました。

https://pipecd.dev/docs-dev/user-guide/managing-application/adding-an-application

こちらを作成することにより、PipeCD と Git リポジトリの対応するディレクトリとのマッピングを行っているのですね。

またそのディレクトリ内に、 `app.pipecd.yaml` というファイルを配置することにより、[詳細な CD の手順を組んでいく](https://pipecd.dev/docs/user-guide/managing-application/defining-app-configuration/terraform/) ようです。

Terraform を設定する際の example もいくつか [公開されていました](https://github.com/pipe-cd/examples/tree/master/terraform)。また GitOps を謳っているサービスなだけあって、[Application のドリフト検出](https://pipecd.dev/docs-dev/user-guide/managing-application/configuration-drift-detection/) が提供されているのはよいですね！

### Secret Management の設定

次にやることは、 [Secret Management の設定](https://pipecd.dev/docs-dev/user-guide/managing-application/secret-management/) です。Secret Management とは、各種秘匿情報を Git 上で管理できるようにするための機能です。

上記の Terraform Application の例を参照すると、 [credentials ディレクトリ](https://github.com/pipe-cd/examples/tree/master/terraform/simple/.credentials) があり、そこでコマンド実行用の Service Account のキー配置を行っているようですね。ただセキュリティの観点からそのままキーを Git の管理下に置くことはできないため、この Secret Management の機能を利用して適切に暗号化の処理を行なっているようです。

### その他

その他の設定として必須ではないにせよ、やると便利そうなこととしては以下がありそうでした。

- **Slack 通知の設定:** https://pipecd.dev/docs-dev/user-guide/managing-piped/configuring-notifications
  - いくつかのイベントを Slack 通知してくれる機能です。
- **GitHub 上での Plan Preview の設定:** https://pipecd.dev/docs-dev/user-guide/plan-preview
  - PR 上で、Plan の Preview を行ってくれる機能です（GitHub Actions にも、公式の [Actions](https://github.com/pipe-cd/actions-plan-preview) が公開されているようでした）。

# Terraform Cloud を使った GitOps

## Install

すべてクラウド上で管理できるようになっているため、特別何かをインストールする必要はありません（ただし GitHub と連携する際に、GitHub Actions を使用することになるため、先述の Self Hosted Runner を使う場合にはその設定が必要になります）。

## Setup

GitHub と連携する際の各種セットアップに関しては、 [こちら](https://developer.hashicorp.com/terraform/tutorials/automation/github-actions) にチュートリアルとして記載がありました。
このセットアップ手順により構築できる運用フローは以下のようなものになりそうで、わかりやすいですね！

<img src="/images/2023/20230403a/image_2.png" alt="" width="1006" height="265" loading="lazy">

PR 上でのプレビューもあり、運用のイメージもしやすいです。

<img src="/images/2023/20230403a/assets.gif" alt="" width="800" height="599" loading="lazy">

もちろん履歴は、Terraform Cloud 上から（この場合だと GitHub Actions 上からも）。わかりやすく確認できるようになっています。

その他 Terraform Cloud のユニークな機能について、下記にあげておきます。

### Policy Enforcemnt

[**Policy Enforcement**](https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement) は、あらかじめ設定したポリシーを実行時に適用してセキュリティルールやベストプラクティスに準拠できているかを検証する機能です。
※ 現在 Cloud Team & Governance 以上のプランでのみ使える機能です。

以下の2つの policy-as-code フレームワークを用いることができます。

- **[Sentinel](https://docs.hashicorp.com/sentinel/concepts/language)**
- **[OPA](https://www.openpolicyagent.org/docs/latest/policy-language/)**

### Cost Estimation

[**Cost Estimation**](https://developer.hashicorp.com/terraform/cloud-docs/cost-estimation) は、コストの見積もりを行い、可視化する機能です。
※ 現在 Cloud Team & Governance 以上のプランでのみ使える機能です。

なかなか魅力的な機能ではありそうですが、**サポートされるリソースに関しては、[制限があるよう](https://developer.hashicorp.com/terraform/cloud-docs/cost-estimation#supported-resources) なのでそちらは注意が必要そうです。**

### Drift Detection

[**Drift Detection**](https://www.hashicorp.com/campaign/drift-detection-for-terraform-cloud) は、差分検知を行い、差分があれば可視化、必要に応じて通知を飛ばせる機能です（GitOps の原則 #4 を実現するための機能とも言えますね！）。
※ 現在 Cloud Business 以上のプランでのみ使える機能です。

# Atlantis を使った GitOps

## Install, Setup

Atlantis のインストールや各種セットアップは、[こちら](https://www.runatlantis.io/docs/installation-guide.html) にわかりやすくまとめられていました。

Atlantis も PipeCD と同じように自身で Atlantis の各種コンポーネントを [デプロイする必要](https://www.runatlantis.io/docs/deployment.html) があります。デプロイの方法には様々なやり方があるようですが、すでに Kubernetes Cluster を飼っている場合には、Helm で一気にインストールできそうなのでそこまで負担もなさそうかなと思いました。

基本的なセットアップを行ったのちの運用イメージとしては、ホーム画面にプレビューがありました。

<img src="/images/2023/20230403a/image_3.png" alt="image.png" width="1200" height="2412" loading="lazy">

# おわりに

今回は、**Terraform x GitOps** を実現するにあたっていくつかの手法について調査をしてみました。

いくつかのサービスの所感としては以下のようになります。

- **GitHub Actions:**
  - 他のサービスと比べて、取り入れやすい（すでに取り入れられているケースも多そう）。
  - 任意のスクリプトが実行できて、かつ様々なトリガーを設定できるのでカスタマイズ性は豊富。
  - ただし、詳細なワークフローは自身で記載する必要があるので GitHub Actions そのものや、利用する Actions、各種 Terraform コマンドについての詳細な理解が必要になる。
- **PipeCD:**
  - やや取り入れやすさは他と比べると見劣りしそう。ただし、すでに Kubernetes Cluster がある場合や、Kubernetes リソースを管理するサービスを探している場合には十分候補に上がりそう。
  - GitOps を忠実に再現できるところはメリット。
- **Terraform Cloud:**
  - 特別にインストール等の手順が必要なわけではないので取り入れやすくはあるが、ユーザー数や利用する機能によって有料になる点が注意（マシン代等はかかるので、他のものが厳密に無料でできるということでもないですが）。
  - 基本的な機能の他、Policy Enforcement や、Cost Estimation、Drift Detection 等のユニークな機能を有している。
- **Atlantis**
  - 様々なデプロイの方法があるとはいったもののデプロイの手間は一定かかってしまいそう。
  - ChatOps による運用ができる点や、独自のロック機能は個人的には魅力。

次は棚井さんの記事になりますー！ お楽しみに〜！！
