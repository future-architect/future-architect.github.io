---
title: "JavaのDockerイメージ何選ぶ？"
date: 2021/12/20 00:00:00
postid: a
tag:
  - Docker
  - Java
  - コンテナビルド
category:
  - Programming
thumbnail: /images/20211220a/thumbnail.png
author: 澁川喜規
featured: false
lede: "Javaアドベントカレンダーにエントリーした記事になります。Javaのイメージを作る上で、どのDockerイメージをベースに選べばいいのか、というのを軽く調べ始めたら、選択肢がたくさんでてきたので、ちょっと突っ込んで調べてみました。"
---

<img src="/images/20211220a/top.png" alt="" width="1000" height="514">

[Javaアドベントカレンダー](https://qiita.com/advent-calendar/2021/java)にエントリーした記事になります。

Javaのイメージを作る上で、どのDockerイメージをベースに選べばいいのか、というのを軽く調べ始めたら、選択肢がたくさんでてきたので、ちょっと突っ込んで調べてみました。

以前、[仕事でPythonコンテナをデプロイする人向けのDockerfile (1): オールマイティ編](/articles/20200513/)で書いたOS名とかは今回は紹介しませんので、busterとかalpineとかwindowsservercoreってなによ？というお話はそちらの記事を参照してください。一点アップデートがあるのは、Debian 11がリリースされて、イメージとしてbullseyeというのが追加された点ですね。あとはfocal=Ubuntu 20.04LTSというのを覚えてもらえれば。

# JDK周りのニュース

Oracle JDKが無償配布をやめて、無償利用としてはOpenJDKを、という案内を出したのち、Java 17のときにまた無償配布を再開した、というのが大きなニュースですね。

https://www.publickey1.jp/blog/21/oracle_jdkjava_17.html

その間、いくつかのOpenJDKのディストリビューションが発表されました。AmazonとMicrosoftですね。

OpenJDK回りのトピックといえば、[AdoptOpenJDKがEclipseに移管](https://www.infoq.com/jp/news/2020/06/adoptopenjdk-eclipse-adoptium/)となったというのがあります。AdoptOpenJDKはDocker公式イメージがありましたが、現在ではdeprecatedになっています。

OpenJDKでパッチも上流のプロジェクトで管理されているのでいまのところ大きな違いはなさそうです。独自にサポート期間を延ばしたりという違いがあったりします。


# DockerのJDKディストリビューション

今、きちんとメンテナンスされていそうな公式イメージ系は次の5つかと思います

* https://hub.docker.com/_/eclipse-temurin
* https://hub.docker.com/_/openjdk
* https://hub.docker.com/_/maven
* https://hub.docker.com/_/amazoncorretto
* https://hub.docker.com/_/ibmjava

あとはGCR側にある注目すべきものとしてはdistrolessのJavaもあります。

* gcr.io/distroless/java11-debian11
* gcr.io/distroless/java17-debian11

Docker officialではなくて、verfied publisherのJDKだと、本家OracleやMicrosoftのもありました。

* https://hub.docker.com/_/oracle-jdk
* https://hub.docker.com/_/microsoft-java-jdk

GraalVMはGitHubのコンテナレジストリにありました。

* https://github.com/graalvm/container/pkgs/container/graalvm-ce/versions

## Eclipse Temurin

Adoptiumがプロジェクト名で、Temurinがソフトウェア名ですかね？ RedHat, IBM, Microsoftが母体となって作ったAdoptOpenJDKがEclipseに移管されたものがこれです。もともとはEclipse OpenJ9という別バージョンのJVMがあったりと細かくバリエーションがあったのは、少し整理されて減っているように思います。

Javaのバージョンとしては8, 11, 16, 17を提供しており、8と11のみJREも提供されています。

OS名をつけないデフォルトがWindowsServerCoreでサイズが圧縮されて6GBという富豪な感じです。ベースのOSはWindows系が充実していてNanoServerとかもあります。LinuxはUbuntuとAlpineでDebianはなし。

## OpenJDK

Dockerコミュニティがメンテナンスしているイメージです。`https://hub.docker.com/_/java`というURLでアクセスしてもここにリダイレクトされます。12以降はOracleがビルドしたOpenJDKをバンドルと説明には書かれています。

Javaのバージョンとしては8から19(途中9とかLTSでないのはいくつか欠番)と一番充実しています。JREは8と11にのみ提供されています。

ベースのOSはDebian系で、OracleLinux7/8、WindowsServerCore、Alpineもあります。

## Maven

個人がメンテナーなオフィシャルイメージです。Mavenが主ですが、バンドルするJDKがOpenJDK/Amazon Corretto、　Eclipse　Temurin、IBM Javaと多様です。

ベースのOSはDebian系で、Alpineもあります。

## Amazon Corretto

Amazonが独自にサポート期間を延長してサポートしていることで話題になったのがAmazon Correttoです。

JavaのバージョンはLTSの8, 11, 17です。8だけJREも提供されています。

OSはベースはAmazon Linuxで、Alpineも提供されています。

## IBM Java

昔からJavaでは名を馳せていたIBMです。OpenJ9はIBMの成果ですが、ここではなくてAdoptOpenJDK側での提供となっています（そちらはDeprecatedですが)。

Javaのバージョンは8, 9, 11で、なぜか9が入っています。それぞれJDKとJREを提供しているほか、Small Footprint JRE（SFJ）というさらにコンパクトなJREが提供されているのが特徴です。

ベースのOSとしてはUbuntuとAlpineです。

## Distroless

シェルがなくて中に入れないのでセキュアというのでお馴染みのDistrolessです。

提供バージョンは8と11のみで、JREのみです。対応OSはDebian11のみというシンプル構成です。

なお、:debugタグをつけるとBusyBoxによるシェルのログインできるようになりますが、JDKもインストールされるようになります。他のDistrolessだとBusyBoxの容量の違いしかないのに、なぜか容量が2倍違うという。

## OracleJDK

ページを見るとタグ情報がなく、名前と連絡先を入れるContact Formに入力しないと詳しく知れない謎イメージです。説明を見ると、JDK 11の有料時代のものっぽいのですが、17になった後の更新は行われていない？詳しく見ていないです。

## Microsoft OpenJDK

Azul Zulu for Azureという、早口言葉？というのが正式名称のMicrosoftのOpenJDKビルドです。イメージ自体はA独自のコンテナレジストリに登録されています。"Microsoft Azure, Azure Functions (anywhere), Azure Stack, or Microsoft SQL Server"で使う前提とのことです。

Javaバージョンが広く、7から17までサポートしており、それぞれでJDK, JRE, Headless JRE, Maven, Tomcat付きなど幅広いです。17のJREは他では見当たらないので貴重ですね。

OSもWindowsServerCore、NanoServerは当然のこと、Linuxサポートが手厚く、Ubuntu 18.04, 20.04, Debian 8/9/10, CentOS、Alpineもサポートしています。DebianはSlimがいないのが残念。

## GraalVM

PolyglotなJVMかつネイティブ化をサポートしたGraalVMです。

こちらは8, 11, 17のバージョンが提供されております。また、ネイティブ化のためのツールであるnative imageのパッケージ（イメージ）も提供されています。

OSとしてはOracle Linux7/8です。

# どのイメージを使うか？

結構書き出してみたら特徴が色々だったので、ニーズが明確であれば選びやすいんじゃないか、と思いました。

今回、CPUアーキテクチャは紹介しませんでしたが、特殊なアーキテクチャやOSを使いたい、ということであればそれで絞られるでしょう。例えば、AWSで動かすからAmazon Linuxがいい、とかがあれば、Corretto一択になります。そんな感じで絞れると思います。

それ以外だと、今時はマルチステージビルドが当たり前の選択になると思います。Javaの場合はJDKがビルドイメージで、実行イメージはJREになると思うので、そのペアが提供されているかどうかでかなり絞れます。というか、Javaのバージョンまで結構限定されちゃいますね。DistrolessとMicrosoft以外は8, 11のLTS以外は基本的にJREはないので・・・それ以外でマルチステージビルドをしたいのであればMicrosoftのJDK一択ですね。

Distrolessを使いたい場合も最終イメージは一意に決まります。ビルドイメージはOpenJDKですね。MicrosoftはDebian 11がないので。

GraalVMの場合はネイティブイメージになるのでその後はランタイムなしのイメージでも動くのかどうか、ちょっと実験したいところです。あるいはdebian-slim系とかDistrolessで行けるかどうか。

それ以外の場合はなんでも良さそうですが、[PythonではAlpineを使うとパフォーマンスが大幅に落ちる](/articles/20200513/#Python%E3%81%AE%E3%83%99%E3%83%BC%E3%82%B9%E3%82%A4%E3%83%A1%E3%83%BC%E3%82%B8%E9%81%B8%E3%81%B3)ということを紹介したのですが、[Alpineでメモリ回りが遅いのはJavaも同様](https://medium.com/rocket-travel/alpine-vs-debian-images-for-java-jvm-builds-b8f8e1cc58a8)とのことなので、Alpineは外しても良いと思います。

個人的には2021年末現在だとこんな感じかな、と思っています。OSバージョンを指定しないとうっかりメジャーバージョンアップは影響が大きいので、bullseyeは省略しない方向で。OpenJDKのbullseyeな11/17あたりのJDKでビルドして、デプロイもシェルが必要ならOpenJDKのbullseye-slimのJRE、シェルがなければDistrolessあたりの組み合わせが無難でいいんじゃないかな、と思いました。面白みはないですが。17のJREというと、提供はMicrosoftしかないのですが、Azure用みたいに書いてあるので、その前提で。

| 構成 | ビルド用イメージ | 実行用イメージ |
|:-|:-|:-|
| 11 | oopenjdk:11-jdk-slim-bullseye  | openjdk:11-jre-slim-bullseye  |
| 11 distroless | openjdk:11-jdk-slim-bullseye | gcr.io/distroless/java11-debian11 |
| 17 (Azure用) | mcr.microsoft.com/java/jdk:17-zulu-debian10 |  mcr.microsoft.com/java/jre-headless:17-zulu-debian10 |
| 17 distroless | oopenjdk:17-jdk-slim-bullseye  | gcr.io/distroless/java17-debian11 |


# 参考

* [仕事でPythonコンテナをデプロイする人向けのDockerfile (1): オールマイティ編](/articles/20200513/)

