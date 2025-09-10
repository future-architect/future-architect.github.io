---
title: "IBM Quantum Challenge Fall 2021参加レポート"
date: 2021/11/15 00:00:01
postid: b
tag:
  - ハッカソン
  - コンテスト
category:
  - Programming
thumbnail: /images/2021/20211115b/thumbnail.png
author: 宮永崇史
lede: "こんにちは。TIG/DXユニット所属の宮永です。本記事は2021年10月27日~11月5日に開催された[IBM Quantum Challenge Fall 2021]の参加レポートです。イベントで出題された問題は[GitHubリポジトリ]に格納されているため、参考にしてください。"
mathjax: true
---
<img src="/images/2021/20211115b/ibm-quantum-challenge-fall-2021-advanced.png" alt="ibm-quantum-challenge-fall-2021-advanced.png" width="600" height="600">

# はじめに

こんにちは。TIG/DXユニット所属の宮永です。

本記事は2021年10月27日~11月5日に開催された[IBM Quantum Challenge Fall 2021](https://ibm.co/challenge-fall-21%E3%80%80)の参加レポートです。

イベントで出題された問題は[GitHubリポジトリ](https://github.com/qiskit-community/ibm-quantum-challenge-fall-2021)に格納されているため、参考にしてください。

# 執筆の動機

本記事の執筆の動機は多くの人にこの素晴らしいイベントを知ってもらい、参加していただきたいと思ったためです。

私自身は当イベントへの参加は前回と今回、2回の参加経験しかないですが、[IBM Quantum Challenge Fall 2021](https://ibm.co/challenge-fall-21%E3%80%80)は前回大会に比べ、より広い層の方が取り組みやすい内容となっており、量子計算入門者でも十分に楽しめる内容となっていました。

フューチャーに多数在籍している競プロer出身の方々にも興味を持っていただけるのではないかと思い、執筆しました。
よろしくお願いいたします。

# 大会の概要

大会の概要はこちらに記載されています。

* [量子プログラミング・コンテスト開催 \| THINK Blog Japan](https://www.ibm.com/blogs/think/jp-ja/fall2021-quantum-challenge-japan/)

IBM Quantum ChallengeはIBM社が開発を進めている量子計算パッケージ[Qiskit](https://qiskit.org/)を使用し、与えられた課題を解いてくハッカソン形式の大会です。全世界同時開催されており、[IBM Quantum Challenge Fall 2021](https://ibm.co/challenge-fall-21%E3%80%80)では約1300名が10日間、頭を悩ませ、問題に挑戦しました。

[IBM Quantum Challenge Fall 2021](https://ibm.co/challenge-fall-21%E3%80%80)では「金融」「化学」「機械学習」「最適化」に関する全4問の課題が出題されました。全4問の課題はチュートリアル形式になっており、参加者は与えられたヒントや参考文献をもとに問題を解いていきます。中には論文片手に解き進める問題もあり、入門者から上級者まで楽しめるようになっています。

大会終了後は参加者の解答状況によってサムネイルのようなバッチが進呈されます。こういったイベントも参加者のモチベーションになり、とても良いですね。

さらに、全4問を解き終えると最終問題として超難問が用意されています。この最終問題についてはスコアが用意されており、より良いスコアをたたき出したトップ10名は[イベントのリポジトリ](https://github.com/qiskit-community/ibm-quantum-challenge-fall-2021)に掲載されます。

# 問題の内容と所感

参考までにどのような問題が出題されたのか一例を抜粋します。

以下、公式から抜粋した「最適化」の問題です。

>2つの市場$M_{1}$ , $M_{2}$ を考えます。時間枠は最大$n$個あり、電池は各時間枠（通常は1日）において、どちらか一方の市場で動作します。毎日が独立しているとみなされ、1日のうちの最適化は別の問題とみなします。毎朝、電池は同じレベルの電力でスタートするため、充電の問題は考慮しません。 $n$個の時間枠で2つの市場が利用可能と予測するため、各時間枠$t$（日）と各市場において、以下が既知であると仮定します：
>日々の収益 $\lambda_{1}^{t}$ , $\lambda_{2}^{t}$
電池の日々の劣化、または健康コスト（サイクル数）$c_{1}^{t}$, $c_{2}^{t}$
私たちは、最適なスケジュールを見つけたい、つまり$C_{max}$サイクル以下のコストで寿命時間と収益を最適化したいです。ここで、
> $$d = max_{t}\\{ {c_{1}^{t}, c_{2}^{t}} \\}$$
> を導入します。
>決定変数$z_{t}, \forall t \in [1, n]$を導入し、すべての取りうるベクトル、つまりスケジュール
> $$z = [z_{1}, ..., z_{n}]$$
> に関して、$M_{1}$が選択された場合は$z_{t} = 0$、$M_{2}$が選択された場合は$z_{t} = 1$とします。先ほど定式化された問題は、次のように表すことができます。
> $$\underset{z \in \\{0,1\\}^{n}}{max} \displaystyle\sum_{t=1}^{n}(1-z_{t})\lambda_{1}^{t}+z_{t}\lambda_{2}^{t}$$
> $$s.t. \sum_{t=1}^{n}[(1-z_{t})c_{1}^{t}+z_{t}c_{2}^{t}]\leq C_{max}$$
>
>この問題は、よく知られている組み合わせ最適化の問題の1つとは思えませんが、心配する必要はありません。順番にヒントを解きながら、量子計算でこの問題を解いていきます。
*[ibm\-quantum\-challenge\-fall\-2021/challenge\-4\-ja\.ipynb at main · qiskit\-community/ibm\-quantum\-challenge\-fall\-2021](https://github.com/qiskit-community/ibm-quantum-challenge-fall-2021/blob/main/content/challenge-4/challenge-4-ja.ipynb)*

一見するとどこから手をつければよいかわからないと思います。私も問題を見たときは面食らいましたが、問題各所で丁寧に誘導がされているため指示に従ってゆけば自然と解くことのできる構成になっています。

上記は「最適化」の例ですが、「化学」分野に関しても**有機EL分子のエネルギーバンドギャップの計算**とややアカデミックな内容が出題テーマとなっていました。課題を解くという点に関しては高校卒業程度の化学知識を備えていれば問題なく解くことができるようになっています。

全体として、量子計算や出題テーマの専門性よりもQiskitライブラリや参考文献を紐解く力が試されていると感じました。

# 参加するにあたって

問題は主催側が用意しているJupyter Notebook環境で取り組めるため、参加に必要なものはネットワークに接続されたPC1台です。

注意事項としては当イベントでは[Qiskit](https://qiskit.org/)という量子計算パッケージを用いる必要があるため、Pythonの知識が必須です。[公式Document](https://qiskit.org/)は一部日本語化されているため、参加への敷居は低いと思います。また、公式からは[テキストブック](https://qiskit.org/textbook/ja/preface.html)も提供されています。

テキストブックだけではなく動画コンテンツも充実しています。動画コンテンツも日本語化されており、学習環境に悩むことはないと思います。

<iframe width="560" height="315" src="https://www.youtube.com/embed/P5cGeDKOIP0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

IBM社から提供されている資料以外にも量子計算について学べるリソースはたくさんあります。

Microsoft社が提供している[Quantum Katas](https://github.com/microsoft/QuantumKatas)はその1つです。こちらも線形代数の基礎から基本的な量子アルゴリズムまでJupyter Notebook環境で学習を進めることができます。

また、日本語化されたドキュメントではQunaSys社が提供している[Quantum Native Dojo](https://dojo.qulacs.org/ja/latest/)や、東京大学が提供している講義資料[量子コンピューティング・ワークブック](https://utokyo-icepp.github.io/qc-workbook/welcome.html)などたくさんのリソースがあります。

より専門的な内容、もっと深い量子コンピューティングの基礎研究などが気になる方は、[量子技術教育プログラム公式サイト](https://www.sqei.c.u-tokyo.ac.jp/qed/)で提供されている基礎ノートをご覧になるとよいかもしれません。

# 参加してみて

10日間は長いようで短かったです。

イベント期間中は[Slack](qiskit.slack.com)でのコミュニケーションが頻繁に行われており、質問やお互いを褒めあう文化が溢れていて気持ちの良いものでした。

<img src="/images/2021/20211115b/quantum_challenge_slack.png" alt="quantum_challenge_slack.png" width="1200" height="211" loading="lazy">

私自身の実績としては全4問の課題を解き終え、サムネイルのAdvancedバッジを取得できました。

<img src="/images/2021/20211115b/image.png" alt="image.png" width="1068" height="312" loading="lazy">

最終問題は自分には難しく、まだまだ勉強が足らないなと痛感しました。次回大会では本当の意味でCompleteを成し遂げたいです。

# おわりに

少し前まではSFの世界であった量子コンピューターが自分のPC1つで学べるというのは非常に刺激的な体験です。

より多くの人にイベントの楽しさや量子計算への期待感が伝われば幸いです。機会があればまた参加レポートなどを執筆したいと思います。

最後まで読んでいただきありがとうございました。
