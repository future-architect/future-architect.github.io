---
title: "システム屋さんがうれしいJava8対応のコーディング規約を公開します！！"
date: 2016/09/02 13:00:00
postid: ""
tag:
  - Java
  - コーディング規約
category:
  - Programming
thumbnail: /images/20160902/thumbnail_20160902.png
author: 星賢一
lede: "システム屋さんがうれしいJava8対応のコーディング規約を公開します！！"
---

## はじめに

こんにちは。星です。

弊社では、お客様の基幹システム構築をする際、Java言語を採用することが多いのですが、2015年4月末にJava7のサポート切れになったことを受けて、昨年よりJava8で開発をしています。

弊社でもそれなりの規模の案件になると、社員やパートナーの皆様を合わせて、数百人が同時に開発することも珍しくありませんので、私の所属する技術部隊でコーディング規約をはじめとして、開発をするにあたってのガイドラインの整備やEclipse等の開発環境の整備などのタスクを実施して、標準化とクオリティの担保を推進しています。

さて、Java8においては、Java7において実装見送りとなったStream APIやラムダ式といった大きな機能追加がありました。とはいえ、これらの機能を使ったとして、性能的に大丈夫なのかとか、どういったコーディングスタイルが良いのか？など、エンタープライズ領域において、どう利用していくのかを決める必要がありました。

## 世の中のJavaのコーディング規約

インターネット上で公開されているJavaのコーディング規約で、主要なものを挙げてみました。

|規約|著作者|URL|
|--------------------------------------------|----------------------|----------------------|
|Code Conventions for the Java Programming Language|Sun Microsystems|http://www.oracle.com/technetwork/java/codeconvtoc-136057.html|
|Writing Robust Java Code|Scott W. Ambler|http://www.ambysoft.com/downloads/javaCodingStandards.pdf|
|オブジェクト倶楽部版 Javaコーディング標準|オブジェクト倶楽部|http://objectclub.jp/community/codingstandard/CodingStd.pdf|
|電通国際情報際サービス版 Javaコーディング規約2004|電通国際情報サービス|http://objectclub.jp/community/codingstandard/JavaCodingStandard2004.pdf|
|JJGuideline （Java - J2EE Conventions and Guidelines）|Stephan.J & JCS Team|http://www.fedict.belgium.be/sites/default/files/downloads/Java_J2EE_conventions_and_guidelines_EN.pdf|
|Google Java Style (非公式和訳)|Google|https://kazurof.github.io/GoogleJavaStyle-ja/|
|Acroquest Technology Javaコーディング規約|Acroquest Technology|https://www.acroquest.co.jp/webworkshop/javacordingrule/Acroquest_JavaCodingStandard_6_7.pdf|

作成したのが2000年代で古いものが多く、Stream APIやラムダ式についての記載があるものは見当たらず、参考になりませんでした。

## Future Enterprise Coding Standards

<img src="/images/20160902/photo_20160902_01.png" alt="フューチャーコーディング規約のイメージキャラクター" loading="lazy">


世の中になければ自分たちで作るというのは弊社の行動理念でもあるので、社内で伝統的に受け継がれ、細かな改善をしてきたコーディング規約をベースに技術チーム有志にてJava8対応版を作りました。
(ちなみにモチーフがなぜハチなのかは、わかりますよね？)

そして、「Future Enterprise Coding Standards」と名付けて、せっかくなので、Githubに公開しました！！


* Future Enterprise Coding Standards for Java
    * https://future-architect.github.io/coding-standards/


Java8対応以外にも、性能の考慮も含めたコーディング規約になってます。
その一部をここで紹介します。

### Java8に対応

例えばStream APIですが、皆さんだったら、下記3パターンのうち、どれを標準にしますか？

#### パターン1
```java
List<Character> alphabetLower = list
    .stream()
    .filter(Character::isAlphabetic)
    .map(Character::toLowerCase)
    .collect(Collectors.toList());
 ```

#### パターン２
```java
List<Character> alphabetLower = list.stream()
                                    .filter(Character::isAlphabetic)
                                    .map(Character::toLowerCase)
                                    .collect(Collectors.toList());
 ```

#### パターン3
```java
List<Character> alphabetLower = list.stream()
    .filter(Character::isAlphabetic)
    .map(Character::toLowerCase)
    .collect(Collectors.toList());
 ```

パターン1だと1行目が気持ち悪いと感じる人がいそうですね。
パターン2は一見美しく見えるのですが、Eclipse等でフォーマッタの設定が難しかったりします。
そんなわけで、私達が設定したコーディング規約では可読性とフォーマッタとの相性も踏まえて、パターン3にしてます。


### 性能の考慮

次は性能についてです。下記2つのパターン、どちらも等価のリストを返しますが、
どちらのパターンで実装したらよいでしょうか？

#### 1. 拡張for文パターン

```java
    List<String> list = //数値文字列のList
    List<String> resultList = new ArrayList<>();
    for (String string : list) {
        if (string.endsWith("0")) {
            resultList.add(string);
        }
    }
    return resultList;
```

#### 2. StreamAPIパターン

```java
    List<String> list = //数値文字列のList
    List<String> resultList = list.stream()
        .filter(s -> s.endsWith("0"))
        .collect(Collectors.toList());
    return resultList;
 ```

Java8を使っているし、せっかくだからStream APIで実装しようと思っても、
実は性能がシビアに求められる処理だったりしませんか？

#### 計測結果

| 処理するListの件数 | 拡張for文 (ms) | StreamAPI (ms) |
|------------------:|------------------:|------------------:|
| 100万件 | 7 | 9 |
| 1,000万件 | 88 | 114 |
| 1億件 | 949 | 1,026 |
| 2億件 | 1,822 | 2,081


このように従来通りの拡張for文のほうが速かったりするので、性能も踏まえて実装をどうすべきかを判断する必要があります。こういった性能への考慮事項もコーディング規約に組み込んであります。

## コーディング規約の今後について

今後はWebアプリケーション編など実践的な内容なども盛り込んでいきたいなと思ってます。
またSQLやJavaScriptなど、他の言語についても公開していきたいと思っています。

さらに、CheckStyle定義やフォーマッタ、スニペットなども用意していきたいなとチーム内でも話をしてますが、なかなか手が回らず。。。

これからも改善したいと思っていますので、プルリクお待ちしています！！

https://github.com/future-architect/coding-standards


## 参考：イメージキャラクターについて

<img src="/images/20160902/photo_20160902_01.png" alt="フューチャーコーディング規約のイメージキャラクター" style="width:200px;" loading="lazy">

### 特徴

- 目と触覚の配色はDukeをリスペクト
- 針ではなく葉っぱが生えてる（「Javaハチ」 -> 「Java鉢」 -> 鉢植えには葉っぱが生えてる）

イメージキャラクターは、[前回記事](/articles/20160721/)のアイコンセット作者の木村さん作成です。



