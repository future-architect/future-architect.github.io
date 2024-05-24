---
title: "Vuls開発中に出会ったGORMあれこれ"
date: 2021/06/09 00:00:00
postid: a
tag:
  - ORM
  - Go
  - Vuls
  - GORM
category:
  - Programming
thumbnail: /images/20210609a/thumbnail.png
author: MaineK00n
lede: "はじめまして、中岡と申します。現在はフューチャー発OSSのVuls開発をメインに、CSIGでアルバイトをしています。- ORMを触るときは発行されるクエリが意図したものか確認する"
---
# Vuls開発中に出会ったGORMあれこれ

はじめまして、中岡([@MaineK00n](https://twitter.com/MaineK00n))と申します。

2021年6月の現在はフューチャー発OSSの[Vuls](https://github.com/future-architect/vuls)開発をメインに、CSIG[^1]でアルバイトをしています。

[^1]: CSIG(CyberSecurityInnovationGroup)は、セキュリティ関連のコンサルティングや実装などを行っています

# TL;DR

- ORM(Object-relational mapping)を触るときは発行されるクエリが意図したものか確認する
- 推測するな、計測せよ

# GORMを触る、Vuls#1202

本題に入る前に、Vulsのスキャンについて簡単に説明します。

Vulsでは、以下のようにsqlite3などの形式で保存されたVulnerability DBからCVE情報を集めて、スキャン先の脆弱性を解析しています。

FYI: Vulsのスキャンアーキテクチャは[こちら](https://vuls.io/docs/en/architecture-fast-deep.html)に詳しく書かれています。

<img src="/images/20210609a/vuls-arch.png" alt="Vulsアーキテクチャ図" loading="lazy"

Reference: [future-architect/vuls](https://github.com/future-architect/vuls)

さて，GORMを触るきっかけは、このPR([Vuls#1202](https://github.com/future-architect/Vuls/pull/1202))です。このPRは、VulsでDebianをスキャンしたとき、CVE情報のベースをOVALからDebian Security Trackerへ変更しようというものです。実装してみると、変更前はスキャン時間の90%ileが3.37sだったのですが、変更後は11.15sまで増加してしまいました。

原因を調査すると、Vulsと連携してDebian Security Trackerの情報を取り扱うgost([knqyf263/gost](https://github.com/knqyf263/gost))にあることが分かりました。詳しくは、追加された機能([gost#47](https://github.com/knqyf263/gost/pull/47))によってDBに保存したDebianに関するCVE情報を取得する部分が増加したことでした。

パフォーマンスを改善しなければ、この機能は導入できないということになりました。そのため、EXPLAINしてINDEXを確認したりなどをして、解決策を色々探していました

その中で、2020年8月にGORM 2.0がリリースされていることを思い出しました。Release Noteによると、GORM v2はフルスクラッチされており、パフォーマンスが改善されているそうなのです。

まず、私はGORM v2をサポートして、どれくらい改善するかを検証することにしました([gost#60](https://github.com/knqyf263/gost/pull/60))。

## 期待のGORM v2、そのパフォーマンス
GORMをv1からv2にしたところ、発行されるクエリは大きく変わっていませんでした。
それでは、簡易なパフォーマンス測定をやってみることにします。

### 検証(Package: expat)
Debian busterのPackage: expatに関するunfixed/fixedなCVE情報を検索することを100回繰り返して、レスポンスにかかる時間の90%ileを取ってみました。

- unfixed cves

|         | 発行クエリ数 |  90%ile  |
|:-------:|:---------:|:--------:|
| GORM v1 |     4     | 0.006682 |
| GORM v2 |     4     | 0.010948 |

- fixed cves

|         | 発行クエリ数 |  90%ile  |
|:-------:|:---------:|:--------:|
| GORM v1 |     46    | 0.023047 |
| GORM v2 |     46    | 0.015868 |

### 検証(Package: linux)
もしかして発行されるクエリ数が少なすぎるかなと思って、Package: linuxに関するunfixed/fixedなCVE情報でも検証してみました。

すると、この場合はGORM v2にすることによるはっきりとしたパフォーマンスの向上が確認できました。

- unfixed cves

|         | 発行クエリ数 |  90%ile  |
|:-------:|:---------:|:--------:|
| GORM v1 |    298    | 0.035935 |
| GORM v2 |    307    | 0.027996 |

- fixed cves

|         | 発行クエリ数 |  90%ile  |
|:-------:|:---------:|:--------:|
| GORM v1 |    4930   |  0.43754 |
| GORM v2 |    4945   | 0.298629 |

ちなみに、GORM v2をサポートした状態でのVulsによるスキャン時間は11.5sから9.17sになりました。
まだまだ高速化が必要です😢

## さらなる高速化に向けて
発行されるクエリのうち、ボトルネックになっていたのはJOIN句が入ったこのクエリです。

```sql
SELECT
    debian_cve_id
FROM
    `debian_releases`
    join
        debian_packages
    on  debian_releases.debian_package_id = debian_packages.id
    AND debian_packages.package_name = "expat"
WHERE
    `debian_releases`.`product_name` = "buster"
AND `debian_releases`.`status` = "open";
```

JOIN句を使わずに同様の検索が出来ないかを考え、クエリをチューニングしました([gost#61](https://github.com/knqyf263/gost/pull/61))。
クエリチューニング版では、以下のように、JOIN句をやめ、シンプルに`debian_packages`から`debian_cve_id` を求め、軽いクエリを多く実行することにしました。

```diff
SELECT
    debian_cve_id
- FROM
-     `debian_releases`
-     join
-         debian_packages
-     on  debian_releases.debian_package_id = debian_packages.id
-     AND debian_packages.package_name = "expat"
- WHERE
-     `debian_releases`.`product_name` = "buster"
- AND `debian_releases`.`status` = "open";
+ FROM
+     `debian_packages`
+ WHERE
+     package_name = "expat";
```

### 検証(クエリチューニング)
先程と同様に、Debian busterにあるPackage: expat、linuxに関するunfixed/fixedなCVE情報を検索することを100回繰り返して、レスポンスにかかる時間の90%ileでクエリチューニングの効果を評価したいと思います。

- expat unfixes cves

|                        | 発行クエリ数 |  90%ile  |
|:----------------------:|:---------:|:--------:|
|         GORM v1        |     4     | 0.006682 |
|         GORM v2        |     4     | 0.010948 |
| GORM v2 + query tuning |     49    | 0.003467 |

- expat fixes cves

|                        | 発行クエリ数 |  90%ile  |
|:----------------------:|:---------:|:--------:|
|         GORM v1        |     46    | 0.023047 |
|         GORM v2        |     46    | 0.015868 |
| GORM v2 + query tuning |     49    | 0.003759 |

- linux unfixes cves

|                        | 発行クエリ数 |  90%ile  |
|:----------------------:|:---------:|:--------:|
|         GORM v1        |    298    | 0.035935 |
|         GORM v2        |    307    | 0.027996 |
| GORM v2 + query tuning |    5287   | 0.267383 |

- linux fixes cves

|                        | 発行クエリ数 |  90%ile  |
|:----------------------:|:---------:|:--------:|
|         GORM v1        |    4930   |  0.43754 |
|         GORM v2        |    4945   | 0.298629 |
| GORM v2 + query tuning |    5287   | 0.280019 |

結果としては、クエリチューニングをすることで、発行されるクエリ数は増えていますが、linux unfixed cvesの場合以外、高速化できているように見えます。

執筆時(2021/05/27)では、gostにおいて、CVE情報を検索可能なDebianのパッケージは3059件あり、それらのパッケージに対してfixed/unfixesなCVE情報を検索したとき、発行されるクエリ数はどのように分布するのかを調べてみました。
すると、ほとんどの検索の場合、0-499個のクエリしか発行しないことが分かりました。
つまり、linux unfixes cvesの場合のように、`GORM v2 + query tuning`のクエリ数だけがとても増加して、検索にかかる時間が大きくなる事象によるロスより、それ以外の場合による高速化が大きく現れやすいということです。

<img src="/images/20210609a/query_count.png" alt="クエリ発行数" loading="lazy">

これが、Vulsのスキャン時間にどれくらいの影響を与えるかを、スキャン時間の90%ileで見てみます。
スキャン先のDebianにはパッケージが218個インストールされています。
参考に、追加機能が導入されてないVuls v0.15.10も追加しました。
結果より、GORM v1, GORM v2の時点では、機能を導入に対するトレードオフとしては見合わなかったのですが、クエリチューニングをすることによって、追加機能がないものより高速にスキャンできるようになりました🎉

| baseline(Vuls v0.15.10) | GORM v1 | GORM v2 | GORM v2 + query tuning |
|:-----------------------:|:-------:|:-------:|:----------------------:|
|           3.37          |   11.5  |   9.17  |          2.49          |

# Gost、Ubuntuサポートをする
gostはUbuntuをサポートしていなかったので(TODOにはあった)、ついでと思ってUbuntuのサポートをしました([gost#62](https://github.com/knqyf263/gost/pull/62))。

これをもとにして、VulsでUbuntuをスキャンするときにgostからのCVE情報が追加される予定です([Vuls#1243](https://github.com/future-architect/Vuls/pull/1243))。

執筆時点（2021/05/27）では、gostでGORM v2をサポートするPRはまだMergeされてませんので、最初はDebianでのクエリチューニングを基にして、GORM v1で対応しました。gostの対応はサクッと終わったので、続いてVulsとの連携を実装しました。

さて、Vulsとの連携も実装できたので、Vulsのスキャン先を用意します。スキャン先として用意したUbuntu環境にインストールされているパッケージは2662個です。

この環境に対してVulsでスキャンをすると、スキャン時間が5m38sと遅い……(機能導入前であれば2sぐらい)

そこで、他のPRでGORM v2をサポートするので、Ubuntuサポート版もGORM v2に対応しました。

さて、GORM v2にしたときのVulsのスキャン速度は……？

**7s**

約48倍も速くなりました！！！一応、実際に発行されるクエリを見てみましたが、発行されるクエリに差分は、ほぼありませんでした。

約48倍も速くなった要因は、スキャン先にインストールされているパッケージ数がDebianの場合よりも多く、GORM v2にアップデートすることによるパフォーマンスの向上が顕著に現れたと考えています。

## GORM v1とGORM v2におけるPreloadの挙動
さて、GORM v1で実装していて、テストをしていると、Debianの場合はRDBとRedisでレスポンスを比較して、差分は出ないのですが、UbuntuではあるパッケージにGETリクエストを投げたときのレスポンスがRDBとRedisで異なることに気が付きました。

とりあえず、Preloadの順番を変更すると、レスポンスが正しく返ってきました。

```diff
    err := r.conn.
-           Preload("Patches.ReleasePatches", "release_name = ? AND status IN (?)", codeName, fixStatus).
	        Preload("Patches", "package_name = ?", pkgName).
+	        Preload("Patches.ReleasePatches", "release_name = ? AND status IN (?)", codeName, fixStatus).
	        Where(&models.UbuntuCVE{ID: res.UbuntuCveID}).
	        First(&cve).Error
```

そして、GORM v2にアップデートした後、GORM v1のときに変更したPreloadの順番ってGORM v2でも同様の挙動をするのかが気になりました🤔

Preloadを調整したcommitをrevertして、レスポンスをチェックすると、アレレ？ちゃんと正しいレスポンスが返ってきていました……

しかし、どうして正しいレスポンスが返ってくるようになったのでしょうか。

私、気になります！

そこで、Preload調整前のGORM v1とPreload調整後のGORM v1、Preload調整後のGORM v2、Preload調整をrevertしたGORM v2の4つが発行するクエリの一部を比較しました。

結果としては、今回の場合、GORM v1においては、Preloadの順を変更すると、`WHERE IN`に影響を及ぼすようです。GORM v2になると、Preloadの順番に左右されない挙動をしていました。

- GORM v1, Preload調整前

```sql
SELECT
    *
FROM
    "ubuntu_release_patches"
WHERE
    ("ubuntu_patch_id" IN(133652, 133653)) -- Preloadの順番がここに影響する
AND (
        release_name = 'focal'
    AND status IN('needed', 'pending')
    )
ORDER BY
    "ubuntu_release_patches"."id" ASC;
```

- GORM v1, Preload調整後

```sql
SELECT
    *
FROM
    "ubuntu_release_patches"
WHERE
    ("ubuntu_patch_id" IN(133653))
AND (
        release_name = 'focal'
    AND status IN('needed', 'pending')
    )
ORDER BY
    "ubuntu_release_patches"."id" ASC;
```

- GORM v2, Preload調整後

```sql
SELECT
    *
FROM
    `ubuntu_release_patches`
WHERE
    `ubuntu_release_patches`.`ubuntu_patch_id` = 133653
AND (
        release_name = "focal"
    AND status IN("needed", "pending")
    );
```

- GORM v2, revert Preload調整

```sql
SELECT
    *
FROM
    `ubuntu_release_patches`
WHERE
    `ubuntu_release_patches`.`ubuntu_patch_id` = 133653
AND (
        release_name = "focal"
    AND status IN("needed", "pending")
    );
```

# まとめ

自戒の念を込めて。

ORMを使うのはいいですが、ちゃんと意図したクエリ、レスポンスになっているかはちゃんと確認したほうが良いです。

そして、パフォーマンスの改善をするときは、ちゃんとボトルネックを色々な角度から測定して、トータルで改善することを確認してから実行すると良いでしょう。
