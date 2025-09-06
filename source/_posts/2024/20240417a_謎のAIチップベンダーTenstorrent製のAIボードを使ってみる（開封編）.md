---
title: "謎のAIチップベンダーTenstorrent製のAIボードを使ってみる（開封編）"
date: 2024/04/17 00:00:00
postid: a
tag:
  - AI
  - RISC-V
category:
  - DataScience
thumbnail: /images/2024/20240417a/thumbnail.jpg
author: 山本力世
lede: "先日リリースされたTenstorrent製のAI推論アクセラレーションボード[Grayskull e150]を早速入手しましたので、そちらの開封をしたいと思います。カナダのトロントに本社がある、知る人ぞ知る、[ジム・ケラー]/AIチップベンダーです。日本法人も昨年に設立されています。"
---
SAIGの山本です。

先日リリースされたTenstorrent製のAI推論アクセラレーションボード[Grayskull e150](https://tenstorrent.com/cards/#grayskull-e150)を早速入手しましたので、開封します。

# [Tenstorrent](https://tenstorrent.com/)とは

カナダのトロントに本社がある、知る人ぞ知る、[ジム・ケラー](https://ja.wikipedia.org/wiki/%E3%82%B8%E3%83%A0%E3%83%BB%E3%82%B1%E3%83%A9%E3%83%BC)率いる[RISC-V](https://ja.wikipedia.org/wiki/RISC-V)/AIチップベンダーです。日本法人も昨年に設立されています。

# Grayskullとは

Tenstorrent社が開発した、AI推論アクセラレーションチップです。

簡単に説明するとCPUの一種であるRISC-Vがメチャメチャ沢山内蔵されているチップで、AI推論などが効率的に行えるアーキテクチャーになっています。詳しくは、[Tenstorrent社の動画](https://www.youtube.com/watch?v=lPX1H3jW8ZQ&t=17m45s)などをご覧ください。また、機会がありましたら、別途、アーキテクチャなどについて説明したいと思います。

# 開封

手前がブロアー（冷却ファン）の、奥がボード本体が入っている箱になります。
<img src="/images/2024/20240417a/IMG_3148.jpg" alt="" width="1200" height="900" loading="lazy">

ブロアーは、ボードと接合部分のパーツは３Dプリンタで出力したものを使ってます。
<img src="/images/2024/20240417a/IMG_3150.jpg" alt="" width="1200" height="900" loading="lazy">

ボードの表側。
<img src="/images/2024/20240417a/IMG_3151.jpg" alt="" width="1200" height="537" loading="lazy">

ボードの裏側。
<img src="/images/2024/20240417a/IMG_3153.jpg" alt="" width="1200" height="587" loading="lazy">

ボードを覆っている囲いを取り除くと大きなヒートシンクが見える。
<img src="/images/2024/20240417a/Image_20240412_190127_987.jpeg" alt="" width="1200" height="540" loading="lazy">

ヒートシンクを取り外すとAIチップやRAMが確認できる。
<img src="/images/2024/20240417a/Image_20240412_190127_922.jpeg" alt="jpeg" width="1200" height="502" loading="lazy">

その他、同梱されていたシールなど。黒い紙片はセットアップのオンラインマニュアルのURLのみ書かれていました。
<img src="/images/2024/20240417a/IMG_3152.jpg" alt="" width="1200" height="862" loading="lazy">

# セットアップ

[Tenstorrent社のサイトにあるセットアップ手順](https://docs.tenstorrent.com/tenstorrent/add-in-boards-and-cooling-kits/grayskull-tm-e75-e150)を元に設定を行います。

今回は、手元にあった下記環境で試してみました。

- CPU: Intel Core i7-7700K 4.20GHz
- RAM: 64GB
- PCIe: Gen3.0 x16
- OS: Linux(Ubuntu 22.04.4 LTS)

PCIeのみ、最低動作環境よりも低いですが、一旦、こちらの環境で試してみます。

# TT-SMI

NVIDIA向けにはnvidia-smiというコマンドがありますが、Tenstorrent向けにはtt-smiというコマンドがシステム管理インタフェースとして用意されています。
このコマンドで、Tenstorrentのハードウェアやソフトウェアの状態やバージョンなどを確認できます。今回は最低限の動作確認までということで、このツールによる確認までにしたいと思います。
具体的には、次のような画面になります。

TT-SMI: デバイス情報画面
<img src="/images/2024/20240417a/SCR-20240412-pthf.png" alt="" width="1200" height="522" loading="lazy">

TT-SMI: デバイス計測画面
<img src="/images/2024/20240417a/SCR-20240412-pucp.png" alt="" width="1200" height="529" loading="lazy">

TT-SMI: ファームウェア画面
<img src="/images/2024/20240417a/SCR-20240412-pulb.png" alt="" width="1200" height="531" loading="lazy">

# 終わりに

開封編ということで、パッケージ内容の確認とセットアップ、システム管理ツールによるハードウェアとソフトウェアの状態の確認を行いました。

~~次回以降では、サンプルプログラムの紹介やアーキテクチャーの解説などを行っていきたいと思います。~~

**2025年5月20日追記:**

紹介したボードがEOLしたため、新モデルで検証できないか検討しています。
