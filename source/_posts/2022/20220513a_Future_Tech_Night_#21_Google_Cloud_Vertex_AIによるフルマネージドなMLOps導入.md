---
title: "Future Tech Night #21 Google Cloud Vertex AIによるフルマネージドなMLOps導入"
date: 2022/05/13 00:00:00
postid: a
tag:
  - MLOps
  - VertexAI
  - GCP
  - TechNight
  - 登壇レポート
category:
  - DataScience
thumbnail: /images/20220513a/thumbnail.png
author: 真鍋優
lede: "「Future Tech Night #21 Google Cloud: データエンジニア＋MLOps」に登壇させていただきましたので、その内容について触れていきたいと思います。"
---
# はじめに
こんにちは、SAIG所属の真鍋です。

この度は「Future Tech Night #21 Google Cloud: データエンジニア＋MLOps」に登壇させていただきましたので、その内容について触れていきたいと思います。

本イベントはTIGの村田さんの「JSON関数と共に歩む、BigQueryを使った超汎化型データ活用基盤」パートと、私の「Vertex AIによるフルマネージドなMLOps導入」の2本立てで行われました。前者については、別記事が既に投稿されておりますので、そちらもご覧いただければ幸いです。

# 発表資料

* [Vertex AIによるフルマネージドなMLOps導入](https://speakerdeck.com/komodoran/vertex-ainiyoruhurumanezidonamlopsdao-ru)
* [Future Tech Night #21 Google Cloud: データエンジニア＋MLOps](https://www.youtube.com/watch?v=o0oZnX1Ai-k)

## MLOpsとは
機械学習プロジェクトが広く一般に普及してきた昨今、多くのカンファレンスや企業活動の中でMLOpsが注目を集めています。
MLOpsとは、下記のライフサイクルを潤滑に回すための概念であり、Machine Learning + DevOps + Operateを合わせたものです。

<img src="/images/20220513a/image.png" alt="MLOps" width="800" height="450" loading="lazy">

本発表では、コーディングと学習のフェーズに焦点を当てています。
如何にデータサイエンティストのためのコーディング環境や、ハイスペックな学習環境を用意するかといった環境面の問題や、実装されたアルゴリズムをどのようにサービスとして素早くデプロイするのか等が課題となってきます。

## Vertex AIとは
Vertex AIとはGoogle Cloud Platformにおける必要なMLツールがすべて揃った一元的なAIプラットフォームであり、GAされたのが2021年5月と比較的新しいサービスです。

<img src="/images/20220513a/image_2.png" alt="Vertex AI" width="800" height="450" loading="lazy">


* Vertex AI WorkBench
フルマネージド型のコンピューティング環境で、JupyterLabの環境を数クリックで構築することができます。
本サービスの大きな利点としては、複数のデータサイエンティストが利用する環境をパッケージやマシンスペックについて統一できることと、必要な性能に合わせてマシンスペックを変更できる点です。

また、Pythonだけでなくパッケージが導入済みのイメージや、自身で作成したイメージを用いて構築することも可能です。

<img src="/images/20220513a/image_3.png" alt="Vertex AI WorkBench" width="800" height="450" loading="lazy">

* Vertex AI Pipeline
WorkBenchで構築した学習アルゴリズムや推論のコードは、サービス化・システム導入の際に利用する環境に合わせて準備する必要があります。
その際注意しているのことは、下記の3点があります。
　1. 処理に合わせた性能の環境を用意すること
　2. 実行する環境に依存してしまうことでエラーが起こらないようにすること
　3. 利用したデータやパラメータ、コードのバージョンを後から見直せるようにすること
これらの管理をVertex AI Pipelineを用いることで容易に行うことができます。

<img src="/images/20220513a/image_4.png" alt="Vertex AI Pipeline概要" width="800" height="450" loading="lazy">

Pipelineは複数のコンポーネントから構成されており、デフォルトで用意されたAutoMLといった処理や、各自で作成するDockerイメージによる独自の処理を登録することができます。

<img src="/images/20220513a/image_5.png" alt="Pipeline" width="800" height="450" loading="lazy">

実行されたPipelineは、自動的に利用したデータや設定値、開始日時や実行時間といった各種パラメータを記録することができ、後から結果を遡ることを容易にします。

<img src="/images/20220513a/image_6.png" alt="メタデータ管理" width="800" height="450" loading="lazy">

## Q&A

* VertexAIは、TerraformのようなlaCで構築は可能でしょうか？
  → 2022/5現在、Terraformで全てのサービスを用意することは難しいのが現状です。WorkBenchはAI Platformのコードを流用することができますが、パイプライン等は別途用意することが必要です。
* データサイエンティストが共通で使う社内ライブラリがあったときにWorkbenchの環境で社内ライブラリが使えるように環境構築できますか？
  → 各自が作成したDockerイメージをArtifact RegistryにPushしておくことで、WorkBench構築時に選択することが可能です。
* vertex AIを利用する際、ローカルマシンの環境をうまく組み合わせてコストを抑えられたり出来ますか？
  → Vertex AI Pipelineに関してですが、ローカルモード等といったシステムは現時点では存在しない認識です。
* 実験管理に関して、mlflow等で自分で作るよりVertex AI Pipelineに任せたほうが楽なんでしょうか。
  → 私の個人的な印象ですが、mlflowの実験管理機能の方が柔軟性に富んでおり、必要な情報をトラッキングが容易です。今後、Vertex AIとmlflowの連携についても探っていきたいと考えています。

## おわりに
フルマネージドなサービスを用いることで、オンプレでは難しい柔軟かつ迅速な環境構築が可能であると考えています。

特に必要なマシンスペックに大きな差が生じる機械学習プロジェクトでは、フルマネージドサービスの需要が高まっていくことでしょう。

Vertex AIは現在も発展を続けているサービスであり、引き続きウォッチしていきたいと思います。

