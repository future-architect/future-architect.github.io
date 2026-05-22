---
title: "Terraform経験者が初めてAWS CDKを利用して感じたギャップ"
date: 2026/05/22 00:00:00
postid: a
tag:
  - Terraform
  - AWS CDK
  - 技術選定
  - IaC
category:
  - Infrastructure
thumbnail: /images/2026/20260522a/thumbnail.png
author: 八木雅斗
lede: "入社以来、IaCツールは一貫してTerraformを利用してきましたが、最近の業務ではAWS CDKを利用しています。AWS CDKを実際に触ってみて、これまでTerraformの考え方に慣れ親しんでいたこともあり、いくつかギャップを感じる場面がありました。"
---

[Terraform連載2026](/articles/20260518a/) の4本目です。

TIG（Technology Innovation Group）の八木雅斗です。

2023年の新卒入社以来、IaCツールは一貫してTerraformを利用してきましたが、最近の業務ではAWS CDKを利用しています。

AWS CDKを実際に触ってみて、これまでTerraformの考え方に慣れ親しんでいたこともあり、いくつかギャップを感じる場面がありました。
本記事では、現場のリアルな経験をもとに、システム構築において「Terraformユーザー視点で感じたAWS CDKの思想の違い」や「設計時に考慮が必要だったポイント」について解説していきたいと思います。

::: note info
利用時のシチュエーションは以下になります。

- チーム体制はインフラとアプリでチームが分かれている
- AWS CDKに直接変更を加えることのあるメンバーは3~4人
- 1環境あたりのCloudFormationテンプレートの総リソース数は7000～10000程（複数のCloudFormationスタックに分割して管理）のシステムの新規構築で利用
:::

::: note info
本内容は2025年11月～2026年2月頃のツールの機能に基づいています。

- バージョン情報
  - AWS CDK：2.1101.0
:::

## リソースのターゲット指定（部分適用）に関する仕様の違い

CloudFormationでは、特定のリソース（例えば1つのLambda関数の設定など）だけを更新したい場合でも、AWS CDKはスタック全体を対象にデプロイを行うため、リソース単位での部分適用という概念が異なります。

弊社で出している[Terraformガイドライン](https://future-architect.github.io/arch-guidelines/documents/forTerraform/terraform_guidelines.html#target%E3%81%AE%E4%BD%BF%E3%81%84%E6%89%80)でも記載がある通り、検証/本番環境ではターゲット指定でリソースをデプロイすることは避けるべきです。しかし、複数人が開発環境などで試行錯誤を行いながら構築を行っている場合、他のメンバーの作業に影響を与えないようにするため、一部のリソースだけに変更を加えたいことがあります。

Terraformであれば、手元での検証時にターゲット指定でリソースに変更を加えるといったアプローチが取りやすいです。一方で、AWS CDKを利用しており、かつ同じスタックで管理されているリソースに変更を加えたい場合、メンバー間で同じブランチを利用するなど、チーム内でのコンフリクトを避ける運用上の工夫が必要になります。

```bash
# AWS CDKでは、複数のリソースをまとめたスタック単位までの粒度でデプロイを行う
cdk deploy Sample
# Terraformでは、リソース単位でデプロイを絞ることが可能
terraform apply -target=aws_s3_bucket.sample
```

## 言語の自由度が高いゆえの可読性・設計の考慮点

インフラのリソース定義としては、コードを見るだけでどんなリソースが生成されるのかがわかりやすい「宣言的」なアプローチに慣れていると、CDKの柔軟性に少し戸惑うことがありました。

AWS CDKのメリットの1つとして、慣れ親しんだプログラミング言語を使用できることが挙げられます。しかし、プログラミング言語のフル機能（ループ、条件分岐、継承など）が使える強力さゆえに、それらを多用しすぎると「最終的にどんなインフラリソースがデプロイされるのか」がコードから直感的に読み取りにくくなるケースがあります。

この可読性の低下は、パラメータ値の確認コストやコードレビュー負荷の増加に繋がる可能性があるため注意が必要です。
AWS CDKを利用する際は、特有の抽象化概念だけでなく、CloudFormationの挙動や制約を理解しつつ、オブジェクト指向のインフラコードをどう設計し保守するかのルール決めが重要になります。

Terraformが利用するHCL（HashiCorp Configuration Language）は設定言語としての制約があるため、冗長ではあるものの、誰が書いても同じような見通しの良い「宣言的」なコードになりやすいという特徴があります。どちらが良いというよりも、チームのスキルセットや運用方針に合わせた設計ガイドラインを設けることが大切だと感じました。

## ライフサイクル分離（ignore_changes）の代替アプローチ

デプロイサイクルの異なるインフラ（VPCやECSクラスタ、ECSサービス本体など）とアプリケーション（ECSタスク定義の更新とコンテナイメージのデプロイ）は、ライフサイクルを分離して管理したいケースがよくあります。

AWS CDKはCloudFormationをベースとしているため、リソースを完全に切り離して管理する場合には少し工夫がいります。

例えば、GitHub Actionsなどによって新しいタスク定義（v2、v3...）がデプロイされている稼働中の環境に対し、インフラの設定変更のために cdk deploy を実行すると、AWS CDKはコード上で定義されていた「古いタスク定義（v1）」でECSサービスを上書きしてしまう動作になります。

これを回避してライフサイクルを分離するためには、インフラ側でダミーのタスク定義を用意したり、AWS SDKを呼び出して現在の最新タスク定義をSSMパラメータストアから動的に取得するなど、実装上の工夫が求められます。

```ts
// AWS CDKでアプリ（タスク定義やコンテナイメージ）とインフラのデプロイを分離する場合のコード例
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class EcsServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, 'MyCluster', { /* 省略 */ });
    // GitHub Actions等が最新のタスク定義ARNを書き込むSSMパラメータ名
    const parameterName = '/app/my-service/latest-task-definition-arn';
    // cdk synth実行時にAWS環境へ直接アクセスし、現在の値を取得
    // パラメータが存在しない(初回デプロイ)時はエラーにならず、'dummy-value-...'という文字列を返す
    const latestTaskDefArn = ssm.StringParameter.valueFromLookup(this, parameterName);

    let taskDefinition: ecs.ITaskDefinition;
    // CDKが返した文字列に'dummy'が含まれているかで、初回デプロイか判定
    if (latestTaskDefArn.includes('dummy')) {
      // 【初回デプロイ時】 ダミーのタスク定義を作成
      const dummyTaskDef = new ecs.FargateTaskDefinition(this, 'DummyTaskDef', {
        memoryLimitMiB: 512,
        cpu: 256,
      });
      // サービスを起動させるためだけの適当な軽量コンテナ（nginxなど）を定義
      dummyTaskDef.addContainer('DummyContainer', {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:latest'),
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'dummy' }),
      });

      taskDefinition = dummyTaskDef;
      // ※この後、アプリ側のCI/CDパイプラインを実行して正規のイメージをデプロイし、
      // SSMパラメータ（parameterName）を作成・更新する
    } else {
      // 【2回目以降】 GitHub Actions等が更新した最新のタスク定義ARNを取得
      taskDefinition = ecs.TaskDefinition.fromTaskDefinitionArn(
        this,
        'ImportedTaskDef',
        latestTaskDefArn
      );
    }

    // ～～省略～～

    // 分岐して決まったタスク定義を使ってECSサービスを構築
    new ecs.FargateService(this, 'MyService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
    });
  }
}
```

▼少し古いですが、より詳しく知りたい方は以下の動画が参考になると思います。

https://youtu.be/fvZGIcf6xKU?t=1205

Terraformの場合は、特定のプロパティに対する外部からの変更をIaCの管理対象外とする機能が備わっています。下記のように `lifecycle { ignore_changes = [task_definition] }` と追記するだけで、タスク定義の変更をインフラ側から無視し、CI/CDパイプラインから安全にデプロイし続けるといった切り分けが容易に行えます。

```tf
# Terraformでタスク定義の変更を無視する例
resource "aws_ecs_service" "app" {
  name            = "my-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  # ~省略~
  lifecycle {
    ignore_changes = [ # インフラコード側はタスク定義の変更を完全に無視する
      task_definition,
    ]
  }
}
```

## 差分検知（ドリフト検出）に関する仕様の違い

### `cdk diff`における手動変更の扱い

`cdk diff`では、デプロイ時にAWS環境上の「前回デプロイ時のスタックの状態」と手元で合成した「新しいCloudFormationテンプレート」を比較して差分を検知・表示します。そのため、マネジメントコンソールなどで直接リソースを手動変更してしまった場合（いわゆるドリフト）、`cdk diff` を実行してもその手動変更との差分は検知されません。

Terraformの場合、`terraform plan`を実行するたびに現在のAWS上の実リソース状態を読み取り（いわゆるRefresh）、コードとの差分を表示してくれます。

### ドリフト検知機能とそのカバレッジ

AWS CDKが内部で利用しているCloudFormationには、「前回デプロイ時のスタックの状態」と「AWS上の実リソース」の差分を検知する「ドリフト検出」という機能があり、CDK CLIからは[`cdk drift`](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/ref-cli-cmd-drift.html)で実行できます。

https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html

また、2025年11月からCloudFormationではテンプレートと実リソースの状態を⽐較し、ドリフト検知されたリソースをテンプレートの状態に修復できるようになっています（※CDK CLIからも`cdk deploy --revert-drift`で実行できるようです。[PR#1127](https://github.com/aws/aws-cdk-cli/pull/1127)）

<img src="/images/2026/20260522a/image.png" alt="image.png" width="800" height="451" loading="lazy">

[AWS Infrastructure as Code の新機能 2025 総まとめ 〜SA 4人による怒涛のデモ祭り〜](https://speakerdeck.com/konokenj/aws-iac-update-feb-2026?slide=32)より引用

https://aws.amazon.com/jp/about-aws/whats-new/2025/11/configuration-drift-enhanced-cloudformation-sets/

ただし、CloudFormationの「ドリフトの検知」ではサポートされていないリソースが存在し、サポート外のリソースについては、マネジメントコンソールから手動で設定変更されたり削除されたりしても、検知することができません。

▼ドリフト検知可能なリソースは以下を参照（※記載のないAWSリソースはドリフト検知不可）

https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/resource-import-supported-resources.html

インフラの状態を厳密にIaC側と同期・監視したい場合、これらの検知対象リソースの制限についても事前に考慮しておく必要があります。

### テンプレートに未定義のプロパティにおけるドリフト検知の仕様

AWS CDK（CloudFormation）のドリフト検出機能は、基本的に「テンプレート内に明示的に記述されているプロパティ」を追跡の対象とする仕様になっています。
そのため、コード上で指定せずにAWS側のデフォルト値に任せているプロパティについては、後からマネジメントコンソール等で手動変更された場合にドリフトとして検知されないケースがあります。

https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html#what-is-drift

Terraformの場合、AWSプロバイダーがAWS APIからリソースの「すべてのパラメータの状態」を取得してtfstateファイルに保持するため、明示的に記述しておらずデフォルト値が利用されていても、差分があれば検知されます。

もしAWS CDKを利用していて、厳密な構成管理やドリフト検知を行いたい場合は、「意図せず変更されるとシステムに影響が出る重要なプロパティについては、デフォルト値であってもあえてCDKのコード上で明示的に定義しておく」といったアプローチを取り、この仕様の違いを上手くカバーする必要があります。

IaC管理している場合、基本的にはリソースの手動変更は避けるべきです。しかし、試行錯誤を伴う構築時や緊急時にデプロイコストの観点から、一時的に手動変更することがあります。

手動変更後に設定を戻し忘れた際など、厳密な状態管理（コードと実リソースの完全同期）を求めるプロジェクトにおいては、Stateファイルによる管理モデルを持つTerraformの方が構成の乖離に気付きやすいと感じました。

## デプロイ時間の違いと開発体験

AWS CDKにおける差分表示（`cdk diff`）やデプロイ（`cdk deploy`）では、コードのコンパイル処理、CloudFormationテンプレートの合成、そしてAWS上でのスタック作成・更新というステップを踏むアーキテクチャになっています。

また、スタックを個別指定して実行した場合でも、基本的にはスタックの上位概念である[Appレベル](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/apps.html)配下の全リソースを含んだテンプレート合成プロセスが走るため、リソースやスタックが増加してくると、コマンド実行から結果が返ってくるまでの待機時間が長くなります。

AWS CDKの大きなメリットとして、TypeScriptなどで型の恩恵を受けられることが挙げられます。しかし、実際に大規模なリソース構築を行っていくと、コーディング中の型補完のメリット以上に、裏側で動くCloudFormationのデプロイ待機時間の方が開発体験に影響を与えるシーンがありました。

Terraformの `terraform apply` では、CloudFormationを介さずAWSのAPIを直接並列で呼び出す仕組みになっています。ステータスのポーリングやパラメータの検証もAPIベースで行われるため、リソースの作成や更新のスピードが比較的速い傾向にあります。
Terraformにはプログラミング言語のような型補完はありませんが、IDEプラグイン（Language Server）を活用すればHCLの構文チェックやリソース名補完は一定機能するため、「変更差分の確認からデプロイ完了までのサイクル」を短く回したい場合には、APIベースのTerraformの方がテンポ良く開発を進められると感じました。

## 実行時バリデーションのタイミングの違い

### セッション確認と初期化プロセス

CDKでデプロイコマンド（`cdk deploy`）を実行すると、まずローカルでコードの合成処理が走り、その後にAWS環境へのアクセスが行われます。そのため、SSOのセッションが切れていた場合、ローカルでの合成処理が終わったタイミングで初めて認証エラーとして弾かれてしまうことがあります。

`terraform plan` や `terraform apply` の場合、コマンドを実行した直後にプロバイダーの認証情報を確認し、管理対象の全リソースの最新状態をAWS API経由で取得（Refresh）しに行きます。そのため、認証切れや権限不足といったエラーがコマンド実行の初期段階で即座に検知されるという違いがあります。

### デプロイするスタックの存在確認

同様に、`cdk diff` や `cdk deploy` でスタック名をタイポしてしまった場合、`No stacks match the name(s) xxx` というエラーにたどり着くまでに合成処理の時間を待つケースがあり、再試行までのサイクルに少し時間を要することがありました。

## L2コンストラクトの抽象度と現実の要件のギャップ

CDKの[L2コンストラクト](https://docs.aws.amazon.com/ja_jp/prescriptive-guidance/latest/aws-cdk-layers/layer-2.html)は「少ない記述量でAWSが用意したベストプラクティスの枠組みで構成を作ってくれる」という触れ込みであり、CDKのメリットの1つでもあります。しかし、実際の開発現場の要件を満たそうとすると、この抽象化の高さゆえに恩恵を受けづらくなる場面がありました。

その例として、[ec2.Vpc](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html#initializer)があります。これをデフォルトのまま作成すると、各アベイラビリティゾーンに時間課金が発生するNAT Gatewayが自動的に作成されます。
CDKでL2コンストラクトを使うなら、その中身（デフォルトで何が作られるか）を理解しておかないと意図しないリソースが出来上がるため、結局どのようなものが作成されるか裏側の仕様を確認する必要性が生じます。

https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/best-practices.html#best-practices-constructs

また、実際の開発現場の要件では「社内の共通KMSカスタマーマネージドキーで必ず暗号化する」「デフォルトで自動付与される広すぎるIAM権限を削る」といった厳密なセキュリティポリシーに従う必要があります。

このような細かい要件を適用しようとすると、デフォルト値の変更や「エスケープハッチ（addPropertyOverrideなど）」と呼ばれる機能を使って生成されるCloudFormationのJSONを直接上書きしたり、あるいは抽象化を諦めて「L1コンストラクト」を使用することになります。結果として、コード量が増加し、最終的に作成されるリソースやパラメータが直感的に分かりにくくなってしまうという課題がありました。

Terraformの場合、「APIと1対1で対応するすべてのプロパティを明示的に宣言する」アプローチをとっています。設定すべきセキュリティ要件のパラメータが増えたとしても、HCLのフラットで宣言的な構文のまま記述を積み上げる形になるため、要件が複雑化しても可読性を維持しやすいという特徴があると感じました。

## Terraform経験者がAWS CDKを始める時のオススメ参考書

Terraformに慣れ親しんでいると、どうしてもその運用フローや思考回路のままAWS CDKを触ってしまいがちです。

そのため、Terraform経験者でこれからCDKを利用される際には、「[［詳解］AWS Infrastructure as Code――使って比べるTerraform＆AWS CDK](https://gihyo.jp/dp/ebook/2025/978-4-297-14725-9)」 第8章「Terraform & AWS CDK 注意すべき相違点」が、非常に\参考になると思います。

<a href="https://gihyo.jp/dp/ebook/2025/978-4-297-14725-9">
<img src="/images/2026/20260522a/cdk.png" alt="" width="500" height="631" loading="lazy">
</a>

Terraformにおける「当たり前」や「ベストプラクティス」が、AWS CDKの世界ではそのまま適用できない、あるいは異なるアプローチが必要になるケースを体系的に知ることができます。

## おわりに

本記事では、Terraform経験者がシステムの構築でAWS CDKを利用してみた結果、両者のアーキテクチャや思想の違いから生じるギャップや、実際の開発要件を適用する際の考慮点についてまとめました。

今回はTerraformと比較した際の注意点や運用上の工夫を中心に紹介しましたが、AWS CDKは「アプリケーションエンジニアが使い慣れた言語でインフラを定義できる」「ベストプラクティスが組み込まれたコンストラクトでスピーディーに立ち上げられる」といった、Terraformにはないメリットを持っています。

特に、AWSの知識が浅いものの、ひとまずベストプラクティスに沿って動くものを構築したい場合などでは大いに活用できるのではないかと思います。

本記事が、Terraform経験者がはじめてAWS CDKを利用する時のお役に立てれば幸いです🙏

