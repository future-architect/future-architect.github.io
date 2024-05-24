---
title: "ProxyとDockerと新人社員と時々わたし"
date: 2020/10/20 00:00:00
postid: ""
tag:
  - プロキシ
  - Docker
  - Network
  - DockerCompose
category:
  - Infrastructure
thumbnail: /images/20201020/thumbnail.png
author: 栗田真
lede: "学生から社会人になると様々な環境の変化が起きてそれに適応していくのが大変なのが世の常ではありますが、現代社会の仕事において切っては切れないPC周りの設定も変わってきます。特に会社ではあらゆる驚異から大切な情報を守るために、家庭用PCとはまた異なるセキュリティが組まれていることが往々にしてあり、ITを生業とする会社であっても設定周りで苦労することがあります。そこで、会社に入って設定される用語とその機能関係、そしてそれによって影響を受ける開発環境（特にDocker）について、簡単にまとめます。ここでのキーワードは以下のとおりです。"
---
# はじめに

こんにちは。TIG/DXチームの栗田です。

学生から社会人になると様々な環境の変化が起きてそれに適応していくのが大変なのが世の常ではありますが、現代社会の仕事において切っては切れないPC周りの設定も変わってきます。特に会社ではあらゆる驚異から大切な情報を守るために、家庭用PCとはまた異なるセキュリティが組まれていることが往々にしてあり、ITを生業とする会社であっても設定周りで苦労することがあります。

そこで、会社に入って設定される用語とその機能関係、そしてそれによって影響を受ける開発環境（特にDocker）について、簡単にまとめます。

ここでのキーワードは以下のとおりです。

- Proxy/プロキシ
- Docker

WSLとかVMwareとかは適宜読み替えてください。VPN接続しているようなマシンも、基本的に以下社内PCとします。

🚨Notification：今回の記事においては理解を促進するため平易な表現としていますが、必ずしもセキュリティの専門家による厳密な記事ではないことをご理解ください。

# 社内NWとProxy

会社の中では多くの人がPCをつかって外部インターネットにアクセスして仕事をしていますが、全員が直接外部に出ていくと社内のNW構造が社外から簡単に把握されやすくなってしまいます。
また、会社というのは特定の業務を行う集団ですので、アクセスする通信先にも偏りが出ていくことになりますが、例えば全員がある特定のWebサイトの情報を毎回すべて取得してくるのは時間的にも通信量的にも無駄です。

そのために利用するのがProxyサーバです。

Proxyサーバは社内から社外への接続を代理実行するサーバーです。社内のPCが外部インターネットへ接続しようとするとその通信内容をProxyサーバに渡し、Proxyサーバが代わりにその通信を行い、実行結果を社内のPCに返します。Proxyサーバによって社外から社内NWの様子を隠すことができますし、この通信結果をキャッシュしておくことで同じ通信が来たら外部へ通信することなくキャッシュした情報を返すことをします。

なお、Proxyサーバは製品によっては接続先や通信を制限したり、ウイルススキャンをしたりするなどできます。このProxyサーバが具体的にどこに設置されるかですが、それを説明するためにDMZとFirewallについて説明します。

## DMZ

Proxyは社内から社外への通信を代理で担うものだと述べましたが、逆にいうと社外からの攻撃を受けやすい場所となります。そのため、万が一Proxyサーバが侵されたとしても社内NWを守るために、DMZ（De Minitalized Zone, 非武装地帯）という、外部との接続を許可する専用NWを設けます。DMZには公開DNSサーバや公開Webサーバが設置されますが、DMZを設置せずに社内外の通信を行うような設定は悪手です。

## Firewall

ProxyはDMZにおいて運用すると述べましたが、社外/DMZ/社内のNWを分離するのがFirewallです。

"防火壁"を意味するFirewallですが、コンピュータセキュリティにおいて、予め設定したルールに基づき、通信の通してよいかブロックするかの処理をする機能のことです。組織においてはNWの分岐点にFirewallを配置することで、外部からの攻撃を阻止したり、組織内での不審な通信をブロックすることができます。社外/DMZ/社内の境界にFirewallを置くことで、安全に通信を行うことができるようになります。

### おまけ：専用機器としてのFirewallとOS付属のFirewall

Firewallとしては社外からの攻撃を守ることはもちろんですが、OSにも"Firewall"という機能が存在します。

これは"PCの外からの防護壁"の役目を果たすもので、身近なものとしてはWindows Firewallかなと思います。このWindows Firewall、Windowsの通知などでたまに見かけるためFirewallのことをOSの機能とだけ認識されることもありますが、より広い概念になります。

<img src="/images/20201020/firewall_overview.png" loading="lazy">

## Proxyサーバの位置

Proxy・DMZ・Firewallの位置関係を図示すると、次のようになります。

<img src="/images/20201020/Proxy_DMZ_Firewall.png" loading="lazy">

## 社内PCのProxy設定

社外への通信はすべてProxyサーバが行うことになりますが、そのため社内のPCはProxyサーバの情報を知らないと一切外部へ通信することができなくなります。そのために社内PCに対して行うのが「Proxyサーバの設定」です。単に「Proxy設定」などと呼ぶこともあります。

社内PCに対して「社外に対して通信するときはこのURL（あるいはIP）へ接続しろ」と教えることによって、我々は社外との通信を実現しています。

# Proxyの設定について

Proxy設定ですが、これは本来であれば通信するアプリやソフトごとに設定する必要があります。

そのため、例えば `Git` や `pip` などを利用する際には個別にterminal上でProxy設定をして上げる必要があります。しかし、世の中にある多くのソフトは「システムのProxy設定を利用する」ような選択が存在し、OSに対してProxy設定をすると各ソフトが自動でその設定を読み込んでくれます。

Windows10やmacOSであればProxyサーバの設定をする項目があり、これがOSのProxy設定となります。このあたりの最低限のProxy設定について、通常は社内情報システム部門がPCをキッティングするときに設定するため、ブラウザでインターネット接続するくらいであれば社員は何も設定する必要はありません。開発をするなどする場合は、各自適切にProxyの設定をすることになります。

## 補足

Proxy設定は扱うプログラムによって違い、アプリのウィンドウの特定の枠に入力したりterminalの環境変数として設定したりします。

そして環境変数で設定する場合もよく使われるのは `http_proxy` などですが、アプリによって環境変数名が少しずつ違い、大文字だったり小文字だったり途中で.（ドット）で分割されていたりしますので、使うプログラムによってよく確認する必要があります。

## Proxy設定の落とし穴

こうして意気揚々と皆さんは社内PCにProxy設定をしましたが、ここに落とし穴があります。

ProxyはNW接続を伴うソフトウェアに対して有効になるため、例えば社内イントラや自分自身（localhostや127.0.0.1）であっても有効になります。社外への通信ではない場合はむしろProxyを通すべきではないので、除外設定を行います。

前述した「システムのProxy設定」には一緒に除外設定をできるため、やはり社内情報システム部門がキッティングしてくれており、普通にWebブラウザでアクセスする分には意識する必要がありません。

しかし、自分でProxy設定するプログラムを使う場合は、やはり自分で除外設定を行います。よく使うのは環境変数 `no_proxy`を利用するケースですが、こちらも使うプログラムによって大文字だったり小文字だったりしますので、やはり使うプログラムに合わせて適切に設定する必要があります。

# Docker

`git`や`pip`など外部との通信をするプログラムについては軒並みProxy設定をすれば事足りるのですが、意外と落とし穴なのがDockerです。
Dockerは社外と通信する場合と社内（というか自端末）で完結する場合の２つがあります。

## 社外と通信するケース：Docker imageのPull

Dockerはイメージをインターネット上からPullしてきますので、Docker自体にProxy設定をする必要があります。
これがないと、Dockerイメージを用意できずそもそもDockerをstartできません。

<img src="/images/20201020/Docker_pull.png" loading="lazy">


## 社内で通信するケース：自端末内で通信するケース

DockerイメージをpullしてDockerをstartできたら、外部インターネットや他のマシンとの通信を必要しない限り、原則自端末内で完結します。そのため、Docker内でProxyを設定する必要はないですし、ローカル環境とDocker環境で通信するときなどはむしろ `no_proxy` 設定をして上げる必要があります。

たまに新人さんで見かけるのが「とにもかくにもProxy設定だ！」ということでPJで使っている `docker-compose.yml` 内に独自にProxy設定した挙げ句localstackのリソース間で通信できません、などという悲しい事故がありますが、これも自端末内での通信なので、Proxy設定は必要ありません。

<img src="/images/20201020/local_no_proxy.png" loading="lazy">


## Docker上から社外と通信するケース：Docker上でDocker pullやpip install

Docker上であっても社外と通信する場合は、Proxy設定は必要です。

# 実際にProxyを設定する

先にも述べたように、Proxyは使用するプログラムによって適宜設定が必要ですが、使う環境変数は比較的似通っています。ここではGoやPythonあるいはGitなど用途向けにterminal上で設定する場合と、Docker用に設定する場合の二つを説明します。

## ブラウザ（Chrome）の場合

ブラウザであれば、起動した段階でユーザー名とパスワードが聞かれます。ユーザー名とパスワードを入力すれば、Proxyサーバを経由して社外へ接続できます。

<img src="/images/20201020/proxy_chrome_comment.png" loading="lazy">

Chromeの場合はOSに設定されたプロキシ情報を自動で参照します。

Windows10の場合、「Windowsの設定」>「ネットワークとインターネット」>「プロキシ」を表示すると、手動プロキシの設定があります。Chromeはここに書いてあるProxyサーバの設定を使います。
ちなみに手動でProxyサーバの設定を変更した場合は、必ず下部の「保存」ボタンを押して変更を反映させてください。

<img src="/images/20201020/proxy_windows10_comment.png" loading="lazy">

ブラウザによってはOSで設定しているのと別のProxyサーバを使うこともできて、例えばFirefox Browser（少なくとも81.0.1）では、OS以外のProxyサーバを使う設定が行なえます。テストなどの都合によってブラウザでProxyサーバを使いたくない場合は、利用を検討ください。

大事なことなので繰り返しますが、ここで紹介した「Chromeの場合はOSのProxy設定」「Firefoxの場合はOSのProxy設定以外に別途Proxy設定可能」は、あくまでこれらのソフトに対しての設定です。

仮にChrome上でProxyサーバのユーザー名とパスワードを入力したとしても、それはChromeに対しての設定のみです。確かに他のソフトでも「OSのProxy設定を使う」ようにデフォルトで設定されていることがありますが、基本的には使用するソフトに応じて都度Proxy設定とユーザー名およびパスワードの入力を行う必要があります。

## コマンドプロンプト/terminal上での基本設定

開発するにあたってよく使われるのはWindowsであればコマンドプロンプト、WSLやMacであればterminalです。

なおWindowsの場合Powershellもよく使われますが、設定方法としてはコマンドプロンプトと同じなので読み替えてください。また、上記以外のterminalエミュレータソフトを使う場合、コマンドプロンプトに似たソフトか、terminalに似たソフトを使うかによって、適宜読み替えてください。

以降、Windowsの例とMac（含むWSL）の例として紹介します。

コマンドプロンプトあるいはterminal上でProxyを設定する場合、指定の環境変数に格納します。よく使われるのは以下の4種類です。

```bash
# 各環境変数に<ProxyサーバURL>:<port番号>を入れます
# ここではすべて同じ設定をする前提に、http_proxyの値を他の変数に代入する形にしています

# Windowsの場合
## Windows/コマンドプロンプトで環境変数を設定する際はsetコマンドを使います
## ただしこれだとコマンドプロンプトを終了すると環境変数が消えてしまう&コマンドプロンプト画面ごとに設定が必要になります
## コマンドプロンプト上で永続的に環境変数を有効にする場合は、 `set`ではなく`setx`コマンドを使います
## 以降ではsetコマンドの例で記載しますが、場合に応じてsetxを使い分けてください
## ちなみに、setxを使う場合、あいだの「=」が不要になります
## 新人さんは最初迷うかもしれませんが、setを使っている限りにおいてはコマンドプロンプトを起動しなおせば何度でも試せます
## 理解できたところでsetxで永続的な設定にしましょう
##
## なお、コマンドプロンプトの場合、一度設定した変数は%で挟むことで再利用できます。
set http_proxy=http://proxy.example.com:8000
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%
## setxを使う場合
# setx http_proxy http://proxy.example.com:8000
# setx https_proxy %http_proxy%
# setx HTTP_PROXY %http_proxy%
# setx HTTPS_PROXY %http_proxy%


# Macの場合
## Mac/terminalで環境変数を設定する際はexportコマンドを使います
## やはりexportコマンドでの設定もそのterminalを終了すると消えてしまう&terminalごとに設定が必要となります
## すべてのterminalで同じ設定を有効にするには、.bashrcや.bash_profile（ex. bashを使っている場合。zshであれば.zshrcなど）に記載します
##
## なお、terminalの場合、一度設定した変数は$を変数の前につけることで再利用できます
export http_proxy=http://proxy.example.com:8000
export https_proxy=$http_proxy
export HTTP_PROXY=$http_proxy
export HTTPS_PROXY=$http_proxy
```

### 補足：Windowsでsetxを使う場合について

Windowsで `setx` コマンドを使うと環境変数として永続的に有効になると説明しましたが、これはOSの環境変数として記録されるからです。

Windows10の場合、「コントロールパネル（カテゴリ表示）」>「システムとセキュリティ」>「システム」>「システムの詳細設定」>「詳細設定」タブの「環境変数」とすると、 `setx` コマンドで設定した環境変数が確認できます。

上記setxコマンドを使わずとも、ここから手動で設定をしてもOKです。

<img src="/images/20201020/env_comment.png" loading="lazy">

ここを見るとわかりますが、 `http_proxy`と`https_proxy`しかありません。

実はWindowsの場合、環境変数は大文字と小文字を区別しないという特徴があります。Windowsの環境変数でのみ使うと考えれば上述したコマンドプロンプト上での設定も重複していますが、WSLやMacを使ったときに設定を忘れると結局苦しむので、使い慣れるまでは大文字小文字の両方登録するものと覚えても差し支えないでしょう。

### 他のプログラムの例

他にも様々な指定方法があります。

ちなみにGitHubのようにHTTPS通信を必要とする場合、SSLの検証が必要となりますが、Proxyサーバなどの設定によってはこれができないことがあります。
これを回避するため、SSLの検証を無効化します。

```bash
# 簡単のため、先に定義したhttp_proxyを再利用しています

# Gitの場合
## Windows/Mac共通
git config --global http.proxy $http_proxy
git config --global https.proxy $http_proxy
git config --global http.sslVerify false # gitに使われるSSLの検証を無効化

# FTPの場合
## Windowsの場合
set FTP_PROXY=%http_proxy%
set ftp_proxy=%http_proxy%
## Macの場合
export FTP_PROXY=$http_proxy
export ftp_proxy=$http_proxy

# nodeの場合
## Windows/Mac共通
npm -g config set strict-ssl false # npmに使われるSSLの検証を無効化
## Windowsの場合
set NODE_TLS_REJECT_UNAUTHORIZED=0 # Node.js上で動くアプリ自体の環境変数としてSSLの検証をパスさせる
## Macの場合
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

コマンドごとに個別に設定ファイルを書いたり、
実行時に指定することもできます

```bash
# gemで実行時にProxyを設定する場合
gem install rails -r -p $http_proxy
```

### Proxyにユーザーパスワードがある場合

Proxyがユーザーとパスワードによる認証が必要な場合、環境変数の中にユーザーとパスワードを入れます。
以降は、こちらの例で説明します。

```bash
# 環境変数にユーザーとパスワードを入れます
## Windowsの場合
set http_proxy=http://<ユーザー名>:<パスワード>@proxy.example.com:8000
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%

## Macの場合
export http_proxy=http://<ユーザー名>:<パスワード>@proxy.example.com:8000
export https_proxy=$http_proxy
export HTTP_PROXY=$http_proxy
export HTTPS_PROXY=$http_proxy
```

### ユーザー名あるいはパスワードに特殊記号があるとき

ユーザー名や、特にパスワードに特殊記号が入っている場合、このままでは動きません。このケースでは、パーセントエンコーディング（URLエンコーディング）を行います。

```bash
# 例）ユーザー名/パスワードが kurita/p@sswordのとき
# @のURLエンコーディングは%40なので、次のようになります
## Windowsの場合
set http_proxy=http://kurita:p%40ssword@proxy.example.com:8000
# 以下略

## Macの場合
export http_proxy=http://kurita:p%40ssword@proxy.example.com:8000
# 以下略

# %40ではなく@を入れてしまうと、どこまでがパスワードかわかりません
# 悪い例）
# http_proxy=http://kurita:p@ssword@proxy.example.com:8000
```

### ローカル通信でのProxy除外

自分自身、例えば `localhost` に対して `curl` をしたいときなどはproxyを使わないように設定します。
そのときは次のように設定します。

```bash
## Windowsの場合
set no_proxy=localhost
set NO_PROXY=%no_proxy%

## Macの場合
export no_proxy=localhost
export NO_PROXY=$no_proxy
```

ちなみにCIDRやワイルドカード記法は使えないようなので、他のマシンを追加したい場合は一つずつ追加してください。大事なことは `どのドメインはProxyを経由しなくてはならないかをよく考えること` です。

## DockerにおけるProxy設定

Docker for WindowsやDocker for Macでは、ターミナルにProxy設定があります。コンテナイメージをpullするときに必要になります。

<img src="/images/20201020/image_(6).png" loading="lazy">

### Docker for Macにおける注意点

先程 `@などの特殊記号がある場合はURLエンコードしてProxyに含める` と述べましたが、[Docker for MacではURLエンコードが効きません（少なくともv19.03.13時点）](https://github.com/docker/for-win/issues/369#issuecomment-392390823)。

Docker for MacをProxy環境下で利用したい場合は、URLエンコードが不要なユーザー名とパスワードを使うか、一時的にProxyの外に出るか、あるいは次に示すようにdocker imageをファイルでやり取りするなどして対応する必要があります。

### Docker saveとload

dockerはイメージをファイルに出力して共有することができます。今回はsave/loadを紹介します。適当なdockerイメージをpullしたのち、それをファイルに出力して、再度取り込んでみます。

```bash
# ここはDocker for Mac用の特殊対応を想定してMac環境に対するコマンド例を記載していますが、
# Windows環境でも同じはずなので、適宜読み替えてください
# 今回はlocalstack/localstack:0.11.5をサンプルとして、最初にdocker pullします
docker pull localstack/localstack:0.11.5
# > 0.11.5: Pulling from localstack/localstack
# > bdcbb82ec212: Pull complete
# > Digest: sha256:2740b5509173e0efbd509bdd949217f42c97e1ab1f5b354430fdf659c2b9a152
# > Status: Downloaded newer image for localstack/localstack:0.11.5
# > docker.io/localstack/localstack:0.11.5
docker images
# > REPOSITORY              TAG                 IMAGE ID            CREATED             SIZE
# > localstack/localstack   0.11.5              e0eb37bb47b8        5 weeks ago         682MB

# saveを使ってdocker imageをファイル出力します
# イメージをそのままtarファイルにしますが、localstack/localstack:0.11.5の場合、720MBほどあります
docker save localstack/localstack:0.11.5 -o localstack.0.11.5.tar
ls
# > localstack.0.11.5.tar

# このあとにファイルからdocker imageを取り込みますが、そのために一度imageを削除します
docker rmi e0eb37bb47b8
# > Untagged: localstack/localstack:0.11.5
# > Deleted: sha256:e0eb37bb47b8526e2cbd860e643e8b47656d529c0168b8f43fff0eb5f7a577b6
# > Deleted: sha256:18944735543f1604652717378abb7dd986534d7de46017fb87d928db521313cf
docker images
# > REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE

# loadを使ってimageを取り込みます
docker load -i localstack.0.11.5.tar
# > 18944735543f: Loading layer [==================================================>]  722.3MB/722.3MB
# > Loaded image: localstack/localstack:0.11.5
# > docker images
# > REPOSITORY              TAG                 IMAGE ID            CREATED             SIZE
# > localstack/localstack   0.11.5              e0eb37bb47b8        5 weeks ago         682MB
```

ファイルのサイズこそ大きいですが、確かにdocker imageをファイルを介してやり取りできます。たとえばProxy環境下でdocker pullできない人がいたとしても、開発時に使われる各種イメージは早々変わらないと考えると、このようにイメージをファイル共有するのも一つの手段となりえるかなと考えます。
なお、ここではdocker imageを対象とする場合としてsave/loadを使いましたが、containerを対象とする場合はexport/importを使います。export/importに関する説明については割愛しますが、必要に応じてお使いください。

## Dockerコンテナビルドする時

やはりProxy設定が必要で、このとき下記のようにbuild時のパラメータとして渡します。

```bash
## Windows/Mac共通
docker-compose build \
  --build-arg HTTP_PROXY=http://<user>:<pass>@proxy.example.com:8000 \
  --build-arg HTTPS_PROXY=http://<user>:<pass>@proxy.example.com:8000 \
  --build-arg http_proxy=http://<user>:<pass>@proxy.example.com:8000 \
  --build-arg https_proxy=http://<user>:<pass>@proxy.example.com:8000
```

注意として、 `docker.yml` の `ENV` や `docker-compose.yaml` の `environment:` ブロックに記載することは推奨されません。

これはビルド時に利用したProxy設定がイメージに焼き込まれてしまい、コンテナ実行時にプロキシ設定が引き継がれてしまうからです。例えば会社固有のProxy設定や、ましてや認証情報が入ったイメージなどは配布してはいけません。

## おまけ：Dockerコンテナ間で通信したい場合

例えばlocalstackで複数サービスを同時に立ち上げたとします。

このとき、ホストマシン➛localstackへの通信は `localhost:ポート番号` で良いのですが、localstack➛localstackでの通信ではこれではいけません。localstack上の `localhost:ポート番号` は、あくまで `localstack上のポート番号` であるからです。

一例ですが、 `docker network create examplenw` のようにnetworkを作って、 `docker run`時に同じnetworkに所属させます。そのNWに所属するコンテナは、例えば `http://[コンテナ名]:[port番号]` で接続できるようになります。

# 最後に

慣れないと苦労するProxyではありますが、会社の情報を守るために大切なものであることに変わりはありません。用法用量を守ってうまく設定しながら素敵な開発ライフを送っていただければと思います。


