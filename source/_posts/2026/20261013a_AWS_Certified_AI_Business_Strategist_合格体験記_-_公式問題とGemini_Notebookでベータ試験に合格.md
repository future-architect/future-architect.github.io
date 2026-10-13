---
title: "AWS Certified AI Business Strategist 合格体験記 - 公式問題とGemini Notebookでベータ試験に合格"
date: 2026/10/13 00:00:00
postid: a
tags:
  - AWS
  - 合格記
  - 生成AI
categories:
  - Cloud
thumbnail: /images/2026/20261013a/thumbnail.png
author: 棚井龍之介
lede: "AWS Certified AI Business Strategist（AIB-C01）のベータ試験に日本語で合格しました。試験の概要と、公式練習問題とGemini Notebookを使った約4時間の準備、受験した感想を紹介します。"
---
<img src="/images/2026/20261013a/aws-certified-ai-business-strategist.png" alt="" width="600" height="600">

FutureVulsチームの棚井です。2026年10月3日（土）に、AWS Certified AI Business Strategist（AIB-C01）のベータ試験を日本語で受験し、合格しました。

私は2026年8月31日にAWS認定の全冠を達成しました。その経緯は、[前回の記事](/articles/20260909a/)にまとめています。ところが、その翌日の9月1日に、[AWS Certified AI Business Strategistが発表](https://aws.amazon.com/jp/blogs/news/introducing-aws-certified-ai-business-strategist-built-for-the-people-who-scale-ai/)されました。9月29日から日本語でもベータ試験を受けられるようになったので、早速受験しました。

この記事では、試験の概要と、約4時間で行った準備、受験した感想を紹介します。

## 試験の概要

AWS Certified AI Business Strategistは、AIへの投資の評価、ビジネスケースの構築、ガバナンスの設計、組織全体への導入拡大といった判断を扱う認定です。カテゴリーは「Business」で、事業部門のリーダーやコンサルタント、プロダクトマネージャーなどが対象に挙げられています。

ベータ試験の概要は、次のとおりです（2026年10月4日時点）。

| 項目 | 内容 |
| --- | --- |
| 試験コード | AIB-C01 |
| ベータ試験の受験可能期間 | 2026年9月29日から。終了日は公式情報で確認できず |
| 対応言語 | 英語・日本語 |
| 試験時間 | 170分 |
| 問題数 | 85問 |
| 出題形式 | 択一選択問題・複数選択問題 |

提供開始日は[AWSの発表](https://aws.amazon.com/jp/blogs/news/introducing-aws-certified-ai-business-strategist-built-for-the-people-who-scale-ai/)、試験時間や問題数は[公式ページのベータ試験の概要](https://aws.amazon.com/jp/certification/certified-ai-business-strategist/)に基づいています。これから受験する方は、受験時点の条件を確認してください。

## 勉強に使った教材と時間

勉強時間は前日に約3時間、当日に約1時間で、合計約4時間でした。全冠取得までに学んだ知識を前提に、今回の対策に追加で使った時間です。

利用したのは、AWS Skill Builderの練習問題と、AWSの公式資料です。

### Skill Builderの公式練習問題20問

[Official Practice Question Set: AWS Certified AI Business Strategist（AIB-C01・日本語）](https://skillbuilder.aws/learn/NN5MQE4G3M/official-practice-question-set-aws-certified-ai-business-strategist-aibc01--/B3F7Q7CP37)の20問を解きました。

生成AIを使った事業推進の経験がある方でも、この20問は解いておくことをおすすめします。知識を確認し、問題で提示される状況や求められる判断に慣れておくためです。

### 公式資料とGemini Notebook

次の4つの資料をPDFで取得し、[Gemini Notebook（旧NotebookLM）](https://workspaceupdates.googleblog.com/2026/07/notebooklm-now-gemini-notebook.html)に読み込ませました。

| 資料 | 主に扱う内容 |
| --- | --- |
| [AWS Certified AI Business Strategist 試験ガイド](https://docs.aws.amazon.com/ja_jp/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html) | 出題範囲と求められる知識・スキル |
| [AWS CAF-AI](https://docs.aws.amazon.com/ja_jp/whitepapers/latest/aws-caf-for-ai/aws-caf-for-ai.html) | AI導入を進めるための組織の能力や戦略 |
| [Responsible AI Lens](https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/responsible-ai-lens/responsible-ai-lens.html) | AIの便益とリスクを踏まえた設計・運用の考え方 |
| [生成AIを採用するための成熟度モデル](https://docs.aws.amazon.com/ja_jp/prescriptive-guidance/latest/strategy-gen-ai-maturity-model/introduction.html) | 組織の成熟度に応じて生成AIの導入を進める考え方 |

まず、Studioの「マインドマップ」と「レポート」で要約を読み、「フラッシュカード」で知識を確認しました。

<img src="/images/2026/20261013a/studio.png" alt="" width="1200" height="447" loading="lazy">

こうして概要をつかんでから、元の公式サイトを読み始めました。最初から公式資料を読み進めるよりも、この順序で学ぶ方が知識が定着しやすいと感じています。

## 受験した感想

実際に受験してみると、これまでのAWS認定とは問われる知識に違いを感じました。一方で、問題を解く感覚には覚えのある部分もありました。

### ① ビジネスでの活用を考え続ける試験

私が受験した範囲では、Amazon BedrockやAmazon SageMakerの個別の知識はほとんど必要ありませんでした。「機械学習」「深層学習」「生成AI」といった基礎的な概念の理解が中心です。

そのうえで、「ビジネスとして生成AIをどのように活用していくか」という視点が繰り返し問われる印象でした。生成AIを使った事業を推進した経験があれば、普段の仕事で行っている判断と重なる部分が多いと思います。

AWS全冠ホルダーでなくても、こうした事業推進の経験がある方なら、まとまった試験勉強をしなくても合格を狙えそうだと感じました。

### ② 85問の現代文を解き続ける感覚

ベータ試験は85問あります。文章に書かれた条件や目的を読み取り、選択肢を比較して妥当な判断を選ぶ問題が続きます。ひたすら現代文の問題を解き続けているような感覚になりました。

この感覚は、[AWS Certified Advanced Networking - Specialtyを受験したとき](/articles/20260708a/)にも近いと感じました。問題数も多く、最後まで文章を読み続ける集中力が必要でした。

### ③ すぐに仕事に役立つと感じた理由

これまでに取得したAWS認定の中で、今回の試験がもっともすぐに仕事に役立つかもしれないと感じています。

生成AIをビジネスで活用する仕事は、しばらく続くと思います。その中で必要になるROI（投資収益率）の考え方や導入の進め方、他の部署や業務への横展開のノウハウは、そうすぐに陳腐化するものではないと思います。今回学んだ内容を、日々の仕事での判断に生かせると感じました。

## 認定バッジとアーリーアドプターバッジ

今回は通常の認定バッジに加え、アーリーアドプターバッジも取得できました。

<img src="/images/2026/20261013a/aws-certified-ai-business-strategist-early-adopter.png" alt="" width="600" height="600" loading="lazy">

[公式の案内](https://aws.amazon.com/jp/certification/certified-ai-business-strategist/)では、2027年2月15日までにこの認定を取得すると、アーリーアドプターバッジも授与されるとされています。早い時期に受験すると、バッジが2つもらえるのもちょっとした楽しみです。

## おわりに

生成AIを使った事業推進に携わっている方なら、これまでの経験や判断の仕方を整理する機会として、受けてみてもよいと思います。
