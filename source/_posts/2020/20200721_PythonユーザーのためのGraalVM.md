---
title: PythonユーザーのためのGraalVM
date: 2020/07/21 00:00:00
postid: ""
tag:
  - GraalVM
  - Python
  - Java
category:
  - Programming
thumbnail: /images/20200721/thumbnail.png
author: 澁川喜規
lede: "ちょうど一年ぐらい前にGraalVMが商用利用可能な安定版に達し、Enterprise版もリリースされたというニュースがあります。 GraalVMにはPython機能もあると宣伝されているものの、詳しい説明が行われることがなく、それが何者で、どのようなステータスで、どこを目指しているのか、きちんと答えられる人は（日本どころか世界でも）ほぼいないでしょう。GraalVMそのものの説明はちょくちょく出てくるようになってきたと思いますが、そのPythonの機能についてはあまり説明されていないため、Python部分にフォーカスして紹介します。"
---
ちょうど一年ぐらい前にGraalVMが商用利用可能な安定版に達し、Enterprise版もリリースされたというニュースがあります。

* [publickey: GraalVM、ついに本番利用可能なバージョン「GraalVM 19.0」登場、JavaやJavaScriptなど多言語対応ランタイム。商用版のGraalVM Enterprise Editionもリリース](https://www.publickey1.jp/blog/19/graalvmgraalvm_190javajavascriptgraalvm_enterprise_edition.html)

GraalVMにはPython機能もあると宣伝されているものの、詳しい説明が行われることがなく、それが何者で、どのようなステータスで、どこを目指しているのか、きちんと答えられる人は（日本どころか世界でも）ほぼいないでしょう。GraalVMそのものの説明はちょくちょく出てくるようになってきたと思いますが、そのPythonの機能についてはあまり説明されていないため、Python部分にフォーカスして紹介します。

# Graal.Pythonのインストール

[GraalVMのインストール](https://www.graalvm.org/getting-started/)をまず行い、次にGraal.Pythonをインストールします。

インストールはWindows/macOS/Linux向けにバイナリが提供されているので、それを展開してパスを通すなどするだけです。この記事の執筆時点で、20.1が最新バージョンになります。

https://github.com/graalvm/graalvm-ce-builds/releases

WindowsとLinuxなら展開したフォルダ（graalvm-ce-java11-20.1.0）をJAVA_HOMEに、その下のbinフォルダをPATHに追加してあげればGraalVM完了です。

macOSはJavaに対するちょっとしたサポートがあるので、ちょっと手順が異なり、\ ``/Library/Java/JavaVirtualMachines`` フォルダに展開したフォルダをおきます。\ ``/usr/libexec/java_home -V``\ コマンドでおいたフォルダが認識されればJAVA_HOMEの設定は不要です。ただ、この中のbinフォルダへのパスは通す必要があります。

なお、binフォルダへのパスですが、もろもろ影響が大きいので、可能ならdirenvなどを使って必要なワークフォルダ内でのみパスを通すとか、必要なときに手動でパスを設定するなどした方が良いです。

インストールが終わるとguコマンドが利用できるようになります。``gu available``で追加インストール可能なコンポーネント一覧が表示されます。

```sh
% gu available
Downloading: Component catalog from www.graalvm.org
ComponentId              Version             Component name      Origin
--------------------------------------------------------------------------------
llvm-toolchain           20.1.0              LLVM.org toolchain  github.com
native-image             20.1.0              Native Image        github.com
python                   20.1.0              Graal.Python        github.com
R                        20.1.0              FastR               github.com
ruby                     20.1.0              TruffleRuby         github.com
wasm                     20.1.0              GraalWasm           github.com
```

Pythonをインストールするので、次のようにタイプします。

```sh
% gu install python
```

# GraalVMとは何者か

先ほどグローバルにパスを通すのはやめておいた方がよい、とお伝えしました。Python以外にnative-imageもインストールした状態ですが、/binフォルダの中は次のようになっています。

```sh
 % ls /Library/Java/JavaVirtualMachines/graalvm-ce-java11-20.1.0/Contents/Home/bin
graalpython	javac		jdb		jimage		jmod		jstack		lli		pack200		rmiregistry
gu		javadoc		jdeprscan	jinfo		jps		jstat		native-image	polyglot	serialver
jar		javap		jdeps		jjs		jrunscript	jstatd		node		rebuild-images	unpack200
jarsigner	jcmd		jfr		jlink		js		jvisualvm	npm		rmic
java		jconsole	jhsdb		jmap		jshell		keytool		npx		rmid
```

これをみるとわかるようにjavacやjar、javaといったコマンドがいるのがわかります。GraalVMは、ちょっとオルタナティブなJDKの顔をしているのがわかります。この後にも説明は出てきますが、Javaコンパイラとしても利用します。それ以外にはnode, npm, npxというコマンドも見えます。つまり、Node.jsの互換処理系も入っているのです。下手にパスを通すと、既存のJavaのプロジェクトやら、Node.jsのプロジェクトがおかしくなる可能性があります。なので、必要なフォルダでのみ有効にした方が良いです。

GraalVMですが、一つのVMの中で、JavaScriptやRといったさまざまな言語をサポートしています。Rでデータファイルを読み込んでPythonでデータ処理をして・・・など言語跨ぎで各言語の得意な部分を生かしたコーディングができるのを目指しているようです。

# Graal.Pythonの状況

Graal.Pythonの一次情報は[ここ](https://www.graalvm.org/docs/reference-manual/languages/python/)になります。

graalpythonを起動すると、次のようなメッセージが出ます。Python 3.8.2互換と言うことがわかります。なかなか新しいですね。公式ドキュメントとか昨年の情報をみると、19系は3.7だったようなので、順当に更新されています。なお、この起動メッセージにも入っていますが、まだearly stageで安定版ではないです。

```sh
% graalpython
Python 3.8.2 (Fri May 15 05:42:24 PDT 2020)
[GraalVM CE, Java 11.0.7] on darwin
Type "help", "copyright", "credits" or "license" for more information.
Please note: This Python implementation is in the very early stages, and can run little more than basic benchmarks at this point.
>>>
```

[README](https://github.com/graalvm/graalpython)によれば、scipyなどのパッケージ群をネイティブサポートしようというのが目下の目標らしいです。

venvを使った環境の分離も可能です。

```sh
% graalpython -m venv .venv
% source .venv/bin/activate
```

パッケージのインストールは動作確認済み？のものだけginstallモジュールを使ってインストールします。pipもvenvの中には作られるのですが、sslモジュールがインポートできないので・・・みたいな警告が出て、うまく使えませんでした。適当に思いつくパッケージをいろいろインストールしようとしたのですが、docutilsとかSphinxはダメで、pytestだけはインストールできたが、うまく動かず、みたいな感じです。既存のプロジェクトを持ってきてそのまま動かす、というのはまだ難しいです。

```sh
$ graalpython -m ginstall install numpy
```

昨年の記事ですが、mocobetaさんがJanomeのインストールにトライした記事がありますが、このときと状況は変わっていません。

* [GraalVM (graalpython) で janome を無理矢理動かしてみたメモ](https://medium.com/@mocobeta/graalvm-graalpython-%E3%81%A7-janome-%E3%82%92%E7%84%A1%E7%90%86%E7%9F%A2%E7%90%86%E5%8B%95%E3%81%8B%E3%81%97%E3%81%A6%E3%81%BF%E3%81%9F%E3%83%A1%E3%83%A2-c07020f8193f)

## polyglotサポート

``--polyglot``オプションをつけると、いろいろな言語ランタイムにアクセスできるようになります。次のサンプルはREADMEのサンプルですが、PythonからJavaScriptの正規表現のクラスを呼び出しています。これだけでは実用性はなさそうですが・・・

```py
import polyglot
re = polyglot.eval(string="RegExp()", language="js")
pattern = re.compile(".*(?:we have (?:a )?matching strings?(?:[!\\?] )?)(.*)")

if pattern.exec("This string does not match"):
    raise SystemError("that shouldn't happen")

md = pattern.exec("Look, we have matching strings! This string was matched by Graal.js")
if not md:
    raise SystemError("this should have matched")

print("Here is what we found: '%s'" % md[1])
```

## Jython

Pythonの互換実装で有名なものはいくつかありますが、Javaで実装されたものがJythonです。RPAツールのSikuliXとかでもスクリプト言語として組み込まれていたりします。Jythonは2.7互換で実装されており、3系の実装は安定版が出ていません。Graal.PythonはJavaで実装された3.x系実装で、Jythonと出自は似ています。コマンドラインオプションでJythonをエミュレーションするモードも有効にできます。

```sh
% graalpython --jvm --experimental-options --python.EmulateJython
```

[ここのサンプルの通り](https://github.com/graalvm/graalpython/blob/master/docs/user/JYTHON.md)ですが、こんな感じで、AWTを使ってウインドウを表示できます。

```sh
 % graalpython --jvm --experimental-options --python.EmulateJython
Python 3.8.2 (Sat Jun 13 16:19:51 JST 2020)
[GraalVM CE, Java 11.0.7] on darwin
Type "help", "copyright", "credits" or "license" for more information.
Please note: This Python implementation is in the very early stages, and can run little more than basic benchmarks at this point.
>>> import java.awt as awt
>>> win = awt.Frame()
>>> win.setSize(200, 200)
>>> win.setTitle("Hello from Python!")
>>> win.getSize().toString()
'java.awt.Dimension[width=200,height=200]'
>>> win.show()
```

<img src="/images/20200721/thumbnail.png" class="img-small-size" loading="lazy">

デフォルトはnativeモードでAoTコンパイルをします。CPythonと変わらない感覚で使えます。JVMモードにするとJITコンパイルになりますが、ちょっとしたコードはこちらの方が時間がかかるようになります。ただ、Jythonのコードを実行するにはJVMモードでないとダメです。

アプリへの組み込みの場合、Jythonで提供していたクラスをそのまま提供しているわけではないため、いろいろ変更を行う必要があります。[そのためのドキュメント](https://www.graalvm.org/docs/reference-manual/embed/#Function_Python)も公開されています。JythonでPythonをスクリプトとして提供していたアプリからすると、変更の手間は必要なものの、Python以外にもJavaScriptやRubyも動くようになるので、乗り換えるメリットはあります。Python 2系を止めることもできますし。

## パフォーマンス

細かい計算で繰り返し回数が多くなるものはCPythonよりも早くなるとのことです。

* [Python標準実装より速い！？Oracleが作ったGraalPythonをJython・CPythonとベンチマークしてみた！！](https://qiita.com/kotauchisunsun/items/7b7eb1e759e3e4526e62)

# ネイティブイメージ化

GraalVMといえばネイティブな実行バイナリ（ネイティブイメージ）作成なのでPythonでもチャレンジしてみました。まずはnative-imageの処理系をインストールします。

```sh
% gu install native-image
```

基本的な使い方として紹介されているのはJavaで次のような手順で作ります。

- javacでコンパイル
- (jarファイル作成)
- .classもしくは.jarファイルをnative-imageコマンドでネイティブ化

Java系以外の言語を使った事例や使い方の紹介というのが[公式ドキュメント](https://www.graalvm.org/docs/reference-manual/native-image/)を見てもほとんどないのですが、サンプルコードとして[一つだけ](https://github.com/graalvm/graalvm-demos/tree/master/native-list-dir)ありました。

- ListDir.java: Javaからネイティブイメージ作成
- ExtListDir.java: 他の言語(JavaScript)を使ったサンプル

他の言語を使ったサンプルも.javaファイルです。これは公式ドキュメントでも次のように説明されています。

> GraalVM native-image supports JVM-based languages, e.g., Java, Scala, Clojure, Kotlin. The resulting native image can, optionally, execute dynamic languages like JavaScript, Ruby, R, or Python, but it does not pre-compile their code itself.

これを動的言語目線で再構成すると次のようになります。

- Pythonなどの動的言語は「実行はできる」が、それはJVMベースの言語（Java, Scala, Clojure, Kotlin）をホストにして、そこから呼び出す形
- 動的言語のコードは事前コンパイルされない

これはつまり、動的言語の処理系はネイティブ化されるが、それによって実行されるコードはコード中の文字列のまま、ということですね。[Jythonのjpythoncコマンド](https://www.ibm.com/developerworks/jp/java/library/j-jython/index.html)のように、Pythonを.classにする機能でも入れば、Pythonを直接ネイティブ化という道も開けるんでしょうが、現状ではそれに対応していません。

ExtListDir.javaをPythonに書き換えたのが次のコードです。``Context.create()``とそのコンテキストの``eval()``に``"python"``を渡すことで、Pythonのコードが解釈されます。

```java ExtListDir.java
import org.graalvm.polyglot.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;

public class ExtListDir {
	public static void main(String[] args) throws java.io.IOException {
		final Context context = Context.create("python");
		String s = "f'{name}: {size}'";
      	String root = ".";
		if (args.length > 0) {
			root = args[0];
		}
		if(args.length > 1) {
			s = args[1];
		}
		System.out.println("Walking path: " + Paths.get(root));
		System.out.println("Python function body: " + s);

		final Value lambda = context.eval("python",
            "lambda name, size: " + s);
		try (Stream<Path> paths = Files.walk(Paths.get(root))) {
			paths.filter(Files::isRegularFile).forEach((Path p) -> {
				File f = p.toFile();
				Value v = lambda.execute(f.getName(), f.length());
				System.out.println(v);
			});
		}
	}
}
```

これからネイティブバイナリを作成してみます。

```sh
# .classファイル作成
% javac ExtListDir.java
# 動作確認で実行してみる
% java ExtListDir
% ネイティブイメージ作成
% native-image --language:python ExtListDir
```

すごく時間がかかります。MacBookAir 2020のCore i5です。13分かかってイメージサイズも240MBを超えました。インタプリタ部分をがんばってネイティブ化しているようです。

なお、pure Javaな場合の使い勝手は悪くないな、と思いました。javac&javaでいつものように動作確認ができ、その後native-imageを使ってイメージ作成しても40秒かからず、サイズもJavaのランタイムが不要な6MBのバイナリになります。普段の開発はいつものようにjavacとjavaで高速にイテレーションを回し、最後にDocker化するときはnative-imageを使いつつ小さなDockerイメージを作成という流れで開発ができます。これはJavaにとってはとても良いものですね。

# まとめ

GraalPythonを試しました。

- まだ実験リリース
- いろんな言語を組み合わせて実行するpolyglotの処理系の一つとして実装されている
- GraalVM 20系はPython 3.8ベース
- 機械学習に対応する部分を目指して開発されているが、Jythonモードがあったり、2.7で止まっているJythonの後継としても期待できる
- まだ使えない公式ライブラリも多く、既存のライブラリも気軽に使えない
- GraalVMのネイティブ化は時間もかかりバイナリもでかくなり、GraalVMの動的言語勢はメリットはない

GraalVMはPythonが使える、GraalVMはネイティブイメージが使える、の二つの文章を読むと、Pythonがネイティブになりそうな印象も持ってしまいがちですが、そうではない、ということがわかりました。とはいえ、Python2.7時代のJython並に開発が進めば、用途はいろいろ広がると思います。楽しみですね。

