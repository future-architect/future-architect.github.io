---
title: "Step Functions を利用して感じた Airflow との比較"
date: 2022/01/11 00:00:00
postid: a
tag:
  - AWS
  - 技術選定
  - StepFunctions
  - Airflow
category:
  - Programming
thumbnail: /images/20220111a/thumbnail.png
author: 多賀聡一朗
lede: "TIG 所属の多賀です。AWS 上でのワークフロー構築のため、Step Functions を直近で導入しました。 "
---
# Step Functions を利用して感じた Airflow との比較

## 概要

TIG 所属の多賀です。

AWS 上でのワークフロー構築のため、Step Functions を直近で導入しました。

筆者は Airflow (MWAA) の経験が長く、いくつかブログも書いています。 ([過去ブログ一覧](/tags/Airflow/))。今回、両サービスを利用してみた上での比較を整理したく記事化しました。

前提として、どちらも素晴らしいサービスで、ユースケースに合わせて選定していくことが大事かと思います。

## サービス概要

各サービスについて、概要を整理しました。

※ Airflow は AWS 上でマネージドサービスとして提供されている Amazon Managed Workflows for Apache Airflow (以下 MWAA) をベースに記載します。

|  | [MWAA](https://docs.aws.amazon.com/mwaa/latest/userguide/what-is-mwaa.html) | [Step Functions](https://aws.amazon.com/jp/step-functions/?step-functions.sort-by=item.additionalFields.postDateTime&step-functions.sort-order=desc)|
| :-- | :-- | :-- |
|   | <img src="/images/20220111a/image.png" alt="MWAAフロー" width="1200" height="764" loading="lazy"> | <img src="/images/20220111a/stepfunction.png" alt="stepfunctionフロー" width="922" height="908" loading="lazy">  <br> [新機能 – AWS Step Functions ワークフロースタジオ – ステートマシンを構築するためのローコードのビジュアルツール - Amazon Web Services ブログ](https://aws.amazon.com/jp/blogs/news/new-aws-step-functions-workflow-studio-a-low-code-visual-tool-for-building-state-machines/) 参照|
| サービス概要 | OSS である [Airflow](https://airflow.apache.org/) をマネージドサービスとして提供| AWS 独自実装のビジュアルワークフローサービス |
| 一言で | ワークフローにソースコードベース管理の概念を取入れアプリケーション化したサービス (※ Airflow について) | 各種 AWS サービスをパイプラインとして実行するサービス  |
| 特徴 | ・Pure Python ベースでワークフローを実装可能 <br> ・独自のブラウザベース UI を提供 <br> ・DAG(有向非巡回グラフ)ベースのワークフロー定義 |・Amazon States Language(JSON/YAML) ベースでワークフロー(=State Macine)を実装 <br> ・AWSコンソール上でドラッグ&ドロップでワークフローを作成可能 ([Workflow Studio](https://docs.aws.amazon.com/step-functions/latest/dg/workflow-studio.html)) <br> ・200を超える AWS サービスのサポート([参考](https://aws.amazon.com/jp/about-aws/whats-new/2021/09/aws-step-functions-200-aws-sdk-integration/) )|
| コスト |[料金 - Amazon Managed Workflows for Apache Airflow (MWAA)](https://aws.amazon.com/jp/managed-workflows-for-apache-airflow/pricing/) <br><br> ・時間単位のインスタンス使用量課金 <br> ・ストレージ使用量課金 <br> |[料金 - AWS Step Functions AWS](https://aws.amazon.com/jp/step-functions/pricing/) <br><br>・実行毎課金(状態遷移毎)|

## サービス比較

各サービス別に、Good/Challenge に分けて記載しています。

### Good

#### MWAA

* Pythonで実現できることは基本すべて実装可能で、実装の制約が少ない
* UI が充実しており、実行履歴、ログ、実行時間等の様々な情報を参照することが可能
* UI 上でワークフローの任意の位置からリトライ可能
* 各種クラウドSDK/OSS API を呼び出しを簡易化するための provider がサードパーティ提供されている
	* [Providers packages reference — apache-airflow-providers Documentation](https://airflow.apache.org/docs/apache-airflow-providers/packages-ref.html#)
	* provider を pip でインストール後、各 provider に実装されている operator 関数を呼び出すことで実現可能

#### Step Functions

* AWS サービスの呼び出しをローコード(パラメータ指定程度)で実現可能
* Workflow Studio を利用した AWS コンソール上でのワークフロー組み上げが可能
    * Amazon States Language を直接書くことなく定義することができる
* パラメータ指定(JSON形式)でワークフロー実行可能
* AWS サービスの呼び出しごとにログが出力されており、各 SDK の呼び出し結果を確認可能

### Challenge

#### MWAA

* ソースコードベースであることから実装コストはある程度見込む必要あり
	* 初期構築等で、デフォルトで用意されていなければ、単純なクラウド SDK 呼び出しをするだけの処理を Python で都度実装が必要になる
* UI 上からパラメータ指定での実行がしづらい
	* 厳密には実行可能な方法があるが、UI 上でサポートされていない or ジョブの実行画面外に存在しており、運用しづらくなっている
	* (2022/01/07時点で [MWAA 未サポート](https://docs.aws.amazon.com/mwaa/latest/userguide/airflow-versions.html#airflow-versions-latest)) Aiflow version 2.1.0 以上でパラメータ指定(`Trigger Dag w/ config`)でワークフローを実行可能となっている
	* デフォルトで[実行時間等](https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html#variables)はワークフローへ渡されるため、時間ベースでの実行の場合は特段困らない
* 運用コスト面では、EC2等と同様に起動時間課金であり、基本は立ち上げたままで運用されることから、Step Functions よりコストは高くなる
* ソースコードを実装するため単体テストを実装したいが、外部 API 呼び出し等が多くなる場合はモック化含めてコストは高くなる
* VPC の構築が必須
    * MWAA 向けのネットワーク要件が存在するため、VPC 構築時に合わせて確認しておく必要がある
    * [Amazon MWAA でのネットワーキングについて - Amazon Managed Workflows for Apache Airflow](https://docs.aws.amazon.com/ja_jp/mwaa/latest/userguide/networking-about.html)
* マネージドサービスのため直接意識することは少ないが、Airflow の構成について学習するコストはかかる

#### Step Functions

* ワークフロー途中からの実行が未サポート
	* 初期構築等で失敗しながら動かしていく際に、毎回最初からになって効率が悪かった
	* 運用上は、リトライ単位 = 1 State Macine の原則で構築すれば問題なし
* Workflow Studio で作成した定義を IaC 管理化に置きたい場合は、環境情報(本番、開発..)等の一部修正が必須
	* 「Workflow Studio で基本作成→JSONをダウンロード→IaC 管理下へ配置」の作成フロー
* [組み込み関数](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/amazon-states-language-intrinsic-functions.html)でできることがあまりないため、入力を少し加工をしたい等で Lambda の実装が必要
* API の実行結果が非同期で成功する場合(インスタンス作成等)に、成功を待ち受けるためのループ処理を都度実装する必要がある
    * [Job ステータスのポーリング (Lambda、AWS Batch) - AWS Step Functions](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/sample-project-job-poller.html)
* 各 State の入出力を扱うための、Input/Output/ResultPath,ResultSelector等の学習コストは低くはない
	* 同一のパラメータをワークフロー全体で引き回したいケースで実装に考慮が必要
		* OutputPath を指定して、Input がすべて上書きされる問題に直面した
	* 最終的に、ResultSelector で残したいレスポンス情報を選定して、ResultPath で追加する形式を取ることが多かった
	* 参考: [Step Functions の入出力処理 - AWS Step Functions](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/concepts-input-output-filtering.html)


## 選定方針

各ケースごとに細かい要件等があるかと思いますが、大まかな方針としては以下の通りと考えています。

* MWAA (Airflow)
	* ワークフローの複雑度(※ 実行するタスクの量が指標) が高い
	* 実行する 処理時間の長いタスクが複数連続している (リトライ観点)
	* 単純な AWS SDK や API Call で処理が完結しない (※ 設計としてワークフローにロジックをもたせる可否は要検討)
	* 初期構築にコストをかけることができる
* Step Functions
	* 複雑度が低くAWS の各種 SDK を呼び出すのみの単純なワークフロー
	* ワークフローの実行頻度が低い
	* 手動でのパラメータ指定必須

## 所感

Step Functions を本格的に利用したのは初めてだったので、同じワークフロー系サービスとして経験のあった Airflow との比較をしてみました。

実際に AWS 上でワークフローを構築しようとする際は、まずはこの2つのサービス比較から入ることが今後は多くなってくるのではと思いますので、参考になりましたら幸いです。

Airflow は 2.0 がリリースされて以降も、月1程度で継続的にリリースがされていてますので、引き続きウォッチしていていきたいと考えてます。

## 参考

* [Apache Airflow Documentation — Airflow Documentation](https://airflow.apache.org/docs/apache-airflow/stable/index.html)
* [Amazon Managed Workflows for Apache Airflow (MWAA) とは - Amazon Managed Workflows for Apache Airflow](https://docs.aws.amazon.com/ja_jp/mwaa/latest/userguide/what-is-mwaa.html)
* [AWS Step Functions とは - AWS Step Functions](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/welcome.html)

