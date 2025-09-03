---
title: "AB Open社と提携してRISC-V PCを開発しました"
date: 2021/12/02 00:00:00
postid: a
tag:
  - RISC-V
  - ISA
category:
  - IoT
thumbnail: /images/2021/20211202a/thumbnail.jpg
author: 真野隼記
lede: "フューチャーはAB Open社と協力し、無料のオープンソースであるRISC-Vアーキテクチャを活用した独自PCを開発しましたのでご報告します。ITコンサルティング企業のフューチャーがなぜRISC-VベースのPC開発に携わっているのか疑問をお持ちの方も多いかと思いますので、経緯にも触れます。"
---
## はじめに

この度、フューチャーはAB Open社と協力し、無料のオープンソースであるRISC-Vアーキテクチャを活用した独自PCを開発しましたのでご報告します。

ITコンサルティング企業のフューチャーがなぜRISC-VベースのPC開発に携わっているのか疑問をお持ちの方も多いかと思いますので、経緯にも触れます。

## RISC-Vとは

RISC-VはCPU命令セットアーキテクチャ（Instruction Set Architecture: ISA）の一種で、日本語では「リスクファイブ」と呼ぶこと多いです。Intelのx86/x64系やArm系と異なるのは、使用料がかからないOSSライセンスで提供されていることでしょう。近年RISC-V準拠CPUコアや開発環境などが活発に開発され広がりを見せており、今後普及が進むと予想されているアーキテクチャの1つです。

* 参考: [RISC-V - Wikipedia](https://ja.wikipedia.org/wiki/RISC-V)

## 開発した RISC-V パーソナルコンピュータについて

<img src="/images/2021/20211202a/future_rvpc_promo_1.jpg" alt="future_rvpc_promo_1.jpg" width="1200" height="802" loading="lazy">

<img src="/images/2021/20211202a/future_rvpc_promo_4.jpg" alt="future_rvpc_promo_4.jpg" width="1200" height="802" loading="lazy">

<img src="/images/2021/20211202a/future_rvpc_promo_3.jpg" alt="future_rvpc_promo_3.jpg" width="1200" height="802" loading="lazy">

開発したPCは、RISC-VのパイオニアであるSiFive社のHiFive Unmatchedを使用しています。CPUはSiFive U740 SoC、メモリは16GBという構成です。最初の写真を見てわかるように、フロントパネルを持っていることが大きな特徴で、ど真ん中に「フューチャー」のロゴが印字されていています！

* [HiFive Unmatched](https://www.sifive.com/boards/hifive-unmatched)
* SiFive U740 SoC（64bit 4コア+1コア）
* DDR4 16GB
* NVIDIA GeForceGT710
* NVMe 1TB
* GNU/Linuxベース
* Wi-Fi接続機能
* カスタム設計されたOLEDディスプレイ

フロントパネルには、Pythonアプリケーションを介しての表示が可能です。CPUとメモリの使用状況、コンポーネントの温度などを含むシステム統計が一目でわかるので、PCの状態を常に監視できます。

<img src="/images/2021/20211202a/future_rvpc_promo_5.jpg" alt="future_rvpc_promo_5.jpg" width="1200" height="802" loading="lazy">

このOLEDディスプレイのハードウェア設計とPythonを含むコードはGitHubでも公開しています。

* https://github.com/abopen/hifive-unmatched-front-panel

今回の共同開発で、RISC-Vアーキテクチャをゲームからハイエンドな組み込みシステムまで多様なユースケースへの導入の道筋を作るキッカケにできたと考えています。

## AB Open社さんとの出会い

[AB Open](https://abopen.com/)さんは英国ハリファックスを拠点とする、オープンハードウェアおよび技術コミュニティのコンサルティングを得意とする企業です。

出会いのキッカケですが、完全なRISC-V PCを世界で最初に組み立てた企業の1つとして有名だったAB Open社に、以前からRISC-Vに高い関心をもっていた当社副社長CSOの石橋さんが声をかけたことから始まり、意気投合してプロジェクトが始まりました。それぞれのモノづくりへの強い思いとこだわりを示しながら開発が進められたそうです。

AB Open社のマネージングディレクターであるAndrew Backさんは「RISC-Vアーキテクチャへの関心は日々高まっているため、このプロジェクトはRISC-Vのポテンシャルを示すのに役に立つと思います。最新テクノロジーを採用するフューチャーと一緒にできたことを光栄に思います」と話しており、良い協力関係が築けたかなと感じています。

## なぜ開発にしようと考えたか

フューチャーには、「ないものはつくる」というカルチャーがあります。ソフトウェアだけではなく、必要ならばハードウェアも開発するという踏み込んだITコンサルティングを、1989年の創業から一貫して行ってきました。

今回RISC-Vに着目したのは、数多くのアプリケーション領域において、RISC-Vアーキテクチャによりイノベーションのスピードが加速されるのではないかと考えたからです。こうした領域でも業界をリードすべく、最初のステップとして高い性能を持ったフロントパネル付きのPCを開発しました。プロダクトのコンセプト・仕様面は当社が中心となって設計しました。コロナ禍、部品の収集にはとても苦労しましたが、こうして形になり、非常に嬉しく思っています。

## さいごに

フューチャーは、AIやロボット工学などの最新技術の知識と実行能力を強みにイノベーションを促進し、クライアントに新しい価値を創造することで社会に貢献することを目指しています。引き続きABOpen社と協力しRISC-Vを活用していこうと考えており、最終ゴールは、RISC-Vの国産マイクロプロセッサを目指しています！

また、RISC-Vサミットが2021年の12/6~12/8にサンフランシスコで開催されます。盛り上げていきましょう！
https://events.linuxfoundation.org/riscv-summit/

## 参考

https://abopen.com/news/future-corporation-partners-with-ab-open-for-unique-risc-v-pc-project/
