---
title: "Groovyスクリプトで、ファイルの最終更新日時をgit clone/pullの日時ではなく、commit日時にしてみた"
date: 2022/02/21 00:00:00
postid: a
tag:
  - Groovy
  - Perl
  - Git
category:
  - Programming
thumbnail: /images/20220221a/thumbnail.png
author: 田中雅大
lede: "こんにちは、TIG コアテクノロジーユニットの田中です。ファイルの最終更新日時を上書きするスクリプトをGroovyで書く機会があったので紹介します。* Groovy 4.0.0* JVM 1.8.0_121* Perl 5.32.1"
---

こんにちは、TIG コアテクノロジーユニットの田中です。

ファイルの最終更新日時を上書きするスクリプトをGroovyで書く機会があったので紹介します。

* Groovy 4.0.0
* JVM 1.8.0_121
* Perl 5.32.1

# 背景
git clone/pullした時に、ローカルにチェックアウトされたファイルの最終更新日時がどうなっているかご存知でしょうか。

答えは`git clone/pullした時刻`です。(pullした場合はcommitがあったファイルのみ最終更新日時が変わります)

この時困るのが、ファイルの最終更新日時を見てファイルの更新有無を判定し、更新があったファイルにのみ処理を実行する、いわゆる`差分解析`のような事を行いたいケースです。

git cloneをやり直した場合、全てのファイルの最終更新日時が変わってしまうので、結局差分解析が全てのファイルに対して走ってしまいます。pullした場合はcommitがあったファイルのみ最終更新日時が変わるので、基本的にはcloneはやり直さずpullし続ければ意図通りの差分解析を行う事は可能です。

しかし例えば、Jenkinsでスポットインスタンスを立ち上げた場合や、GitHub Actions/GitLab CIで実行した場合など、毎回git cloneが必要な場合があります。

こういった状況でも差分解析を意図通りに行うため、ファイルの最終更新日時をcloneした日時ではなく、`commitした日時`である必要があります。

実はこれを実現するためのPerlスクリプトがgit公式から配布されています。今回はJVMで動かしたかったので、同様の処理を行う`Groovyスクリプト`を作成しました。

# Perlスクリプト
まずはPerlスクリプトを用いた方法から紹介していきます。

git公式で配布されているPerlスクリプトは[こちら](https://git.wiki.kernel.org/index.php/ExampleScripts#Setting_the_timestamps_of_the_files_to_the_commit_timestamp_of_the_commit_which_last_touched_them)にあります。

このスクリプトの探索および内容理解のため以下記事を参考にしました。

* [ファイルのタイムスタンプをコミット日時に合わせる - Qiita](https://qiita.com/mAster_rAdio/items/246fcab7984e50d7d66f)
* [[GIT] 「ファイルのタイムスタンプをコミット日時に合わせる」を爆速にした - ブログズミ](https://srz-zumix.blogspot.com/2020/06/git.html)

Perlスクリプトの全量は以下です。

処理の方針としては比較的単純です。

1. gitの`コミットログ`から各ファイルのコミット情報を取得
1. コミットの新しい順に、対応するローカルファイルの最終更新時間をコミット時間で上書き
1. コミットログで同一ファイルが出てきたら、最新のコミット時間を優先

ローカルのgit定義フォルダルートでスクリプトを実行すると、各ファイルの最終更新時間がコミット時間に変更されます。

```bash 実行
$ perl git-set-file-times.pl
```

```perl git-set-file-times.pl
#!/usr/bin/perl -w
use strict;

# gitレポジトリのファイル一覧格納用
my %ls = ();
# コミット時間格納用
my $commit_time;

if ($ENV{GIT_DIR}) {
    # GIT_DIR環境変数を定義しておくとgit定義ディレクトリに遷移
	chdir($ENV{GIT_DIR}) or die $!;
}

# 区切り文字としてASCII NULを指定
$/ = "\0";
# gitレポジトリのファイル一覧を取得
open FH, 'git ls-files -z|' or die $!;
while (<FH>) {
    # 文字列末尾の改行文字を削除
	chomp;
    # ファイルパスをマップ($ls)に格納
	$ls{$_} = $_;
}
close FH;

# 区切り文字として改行(\n)を指定
$/ = "\n";
# gitのコミットログを取得
open FH, "git log -m -r --name-only --no-color --pretty=raw -z @ARGV |" or die $!;
while (<FH>) {
	chomp;
    # 「comitter」キーワード行に記載されているcommit日時を抽出
	if (/^committer .*? (\d+) (?:[\-\+]\d+)$/) {
		$commit_time = $1;
    # 「commit」キーワード直前にcommit対象ファイル一覧が記載されている
    # sedでcommit以降を除去しcommit対象ファイル一覧を抜き出す
	} elsif (s/\0\0commit [a-f0-9]{40}( \(from [a-f0-9]{40}\))?$// or s/\0$//) {
        # コミットの新しい順に処理
        # １度更新したファイルはファイル一覧(@ls)から削除する事で最新のコミット時間のみ反映
		my @files = delete @ls{split(/\0/, $_)};
		@files = grep { defined $_ } @files;
		next unless @files;
        # ローカルファイルの最終更新時間を変更する
		utime $commit_time, $commit_time, @files;
	}
	last unless %ls;
}
close FH;
```

イメージしやすさのため、各gitコマンドで取得されるデータ例を記載しておきます。

* `git ls-files -z`
  * `-z`をつけているため、ファイルはASCII NULで区切られています。
  * `<0x00>`の箇所にASCII NULが入っています。
  * ターミナルやコマンドプロンプトでgit ls-files -z してもNULは見えないのですが、Groovyで`'git ls-files -z'.execute().text`の実行結果をファイルに出力後、[Windows版Sublime Text](https://www.sublimetext.com/3)で確認しました。
エディタやビューアによってはNUL文字表示をサポートしていないものがあるようです。

<img src="/images/20220221a/image.png" alt="NUL文字表示" width="941" height="162" loading="lazy">

* `git log -m -r --name-only --no-color --pretty=raw -z`
  * `--name-only`で更新ファイルの情報を表示します。
  * `-z`で1コミットログがASCII NULで区切られます。
  * git logのオプション詳細は[こちら](https://git-scm.com/docs/git-log)。
  * `<0x00>`の箇所にASCII NULが入っています。
  * この出力の見方は、`git ls-files`の出力の見方と同様です。

<img src="/images/20220221a/image_2.png" alt="git log出力" width="1124" height="785" loading="lazy">


# Groovyスクリプト
さて本題のGroovyスクリプトです。

処理の流れは基本的にPerlスクリプトの時と同じです。

スクリプトの全量は以下です。ローカルのgit定義フォルダルートでスクリプトを実行すると、各ファイルの最終更新時間がコミット時間に変更されます。

```bash 実行
$ groovy git-set-file-times.groovy
```

```groovy git-set-file-times.groovy
// gitレポジトリのファイル一覧を取得
files = 'git ls-files -z'.execute().text.split("\0").collect()
// gitコミットログを取得
logs = 'git log -m -r --name-only --no-color --pretty=raw -z'
       .execute().text.split("\n").collect()
// 更新日時抜き出し用
pattern_update_time = /^committer .*? (\d+) (?:[\-\+]\d+)$/
// 更新ファイル抜き出し用
pattern_update_files = /^(.+?)commit [a-f0-9]{40}(?:| \(from [a-f0-9]{40}\))$/
def update_time
for (log in logs) {
	(log =~ pattern_update_time).each{
		update_time = it[1]
	}
	(log =~ pattern_update_files).each{
		update_files = it[1]
		// 複数ファイルの場合はASCII Null(\0)で区切られているので分割
		for(update_file in update_files.split("\0").collect()){
			// コミットの新しい順に更新時間を書き換えていく
			// 一度処理を行ったファイルはファイル一覧から削除する
			if(files.remove(update_file)){
				f = new File(update_file)
				// ローカルファイルの最終更新日時を変更する
				// 1000倍することで13桁に合わせる(000msを追加している)
				f.setLastModified((update_time as long) * 1000)
			}
		}
	}
}
```

以下ポイントを絞ってソースの解説をしていきます。
基本的にはJavaと同じ感覚で書く事が出来ます。

```groovy
files = 'git ls-files -z'.execute().text.split("\0").collect()
```

* `'command'.execute()`でコマンドを実行
  * `execute(null, new File(base_dir))`のように書くことで、指定したディレクトリ配下で実行できる (Jenkins等で実行する場合に有用)
* `text`で実行結果の文字列を取得
* `split("\0")`で文字列をASCII NULで分割
* `collect()`で分割した文字列をList化

```groovy
// 更新日時抜き出し用
pattern_update_time = /^committer .*? (\d+) ([\-\+]\d+)$/
...
(log =~ pattern_update_time).each{
        update_time = it[1]
    }
```
* `文字列 =~ /正規表現/`で、正規表現にマッチした文字列を探索出来る
* `it`で正規表現文字列に一致した文字列を取得
* `it[1]`のように指定することでグループ化した文字列を取得

```groovy
if(files.remove(update_file)){
  f = new File(update_file)
  // ローカルファイルの最終更新日時を変更する
  // 1000倍することで13桁に合わせる(000msを追加している)
  f.setLastModified((update_time as long) * 1000)
}
```

* `files.remove(update_file)`で配列filesから`update_file`要素を削除。削除出来た場合はtrueを返す。
* `f = new File(update_file)`で、`update_file`で指定したローカルファイルを取得
* `f.setLastModified((update_time as long) * 1000)`で、ファイルの最終更新時間を上書き。コミットログで取得したUnix時間は10桁なので、13桁に合わせるため1000倍している。

Groovyのキャッチアップは以下のサイトを参考にしました。

* [Apache Groovyチュートリアル](https://koji-k.github.io/groovy-tutorial/index.html)
* [Groovyってどんな言語？JavaプログラマのためのGroovy入門 - CodeZine](https://codezine.jp/article/detail/3757)
* [[Groovy]正規表現メモ - Qiita](https://qiita.com/saba1024/items/61aeaf36061df35f8bee)

# 処理時間の比較
それぞれのスクリプトを、23,898ファイルを持つgitプロジェクトで実行して処理時間を測定しました。対象プロジェクトの開発期間は6年程で、コミットログもそれなりに育っているという状況です。(4334コミット)

git clone/pullの時間は含んでおらず、純粋なスクリプト実行時間のみを測定しています。Perlスクリプトのほうが速いという結果にはなりましたが、`Groovyスクリプトでも2.4万ファイルに対して約5秒`と十分な性能である事が確認できました。

スクリプト | 処理時間(3回平均)
--- | ---
Groovy | 5.0 秒
Perl | 2.2 秒

処理時間はコマンドプロンプト使用、以下コマンド実行で測定しました。

* [cmdで簡単な処理時間計測 - Qiita](https://qiita.com/kazufusa/items/40caaf192e7f719bc1bd)

```bash Perl
powershell -C (Measure-Command {perl git-set-file-times.pl}).TotalSeconds
```
```bash Groovy
powershell -C (Measure-Command {groovy git-set-file-times.groovy}).TotalSeconds
```

# Groovyスクリプト改良版

git logのオプションでフォーマットを指定すると、変更に強く、かつスッキリとしたソースになります。

`--pretty="--pretty=format:"update_time:%ct"`と`--name-only`を指定することで、必要最小限の情報、コミット時間と更新ファイルのみを出力させる事が出来ます。`--pretty`の詳細は[こちらのwiki](https://git-scm.com/docs/pretty-formats)を参考にして下さい。

```groovy git-set-file-times.groovy
// レポジトリのファイル一覧を取得する
files = 'git ls-files -z'.execute().text.split("\0").collect()
// コミットログを取得する
logs = 'git log -m -r --name-only --no-color --pretty=format:"update_time:%ct" -z'
		.execute().text.split("update_time:").collect()
// 情報抜き出し用の正規表現
pattern = /^(?<updateTime>\d+)\n(?<updateFiles>.+)$/
for (log in logs) {
	def matcher = log =~ pattern
	if(matcher.matches()) {
		update_time = matcher.group("updateTime")
		update_files = matcher.group("updateFiles")
		// 複数ファイルの場合はASCII Null(\0)で区切られているので分割
		for(update_file in update_files.split("\0").collect()){
			// コミットの新しい順に更新時間を書き換えていく
			// 一度処理を行ったファイルはファイル一覧から削除する
			if(files.remove(update_file)){
				f = new File(update_file);
				// ローカルのファイルの最終更新日時を変更する
				// 1000倍することで13桁に合わせる(000msを追加している)
				f.setLastModified((update_time as long) * 1000)
			}
		}
	}
}
```

この場合のgit log出力例は以下のようになります。

* `git log -m -r --name-only --no-color --pretty=format:"update_time:%ct" -z`

<img src="/images/20220221a/image_3.png" alt="git log出力例" width="1200" height="205" loading="lazy">

# まとめ
GroovyスクリプトはJavaと同じ感覚で書けるので、普段Javaを使っている方はほとんどキャッチアップコストをかけずに習得出来ると思います。

シェルやPerlスクリプトが少し使い難いなと思っている方にはオススメです。

コアテクノロジーユニットでは、現在チームメンバーを募集しています。

私たちと一緒にテクノロジーで設計、開発、テストの高品質・高生産性を実現する仕組みづくりをしませんか？
