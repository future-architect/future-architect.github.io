---
title: "2026年2月版: Dev Containersでプチはまり(Node.js 24とPostgreSQL 18とプロキシ)"
date: 2026/02/13 00:00:00
postid: a
tag:
  - Dev Containers
  - Node.js
  - PostgreSQL
  - プロキシ
category:
  - Programming
thumbnail: /images/2026/20260213a/thumbnail.png
author: 澁川喜規
lede: "Dev Containers便利ですよね？使っていますか？便利なのですが、久々に新しい環境を作ろうとしてちょっとはまったので解決のメモを書いておきます。"
---
Dev Containers便利ですよね？使っていますか？便利なのですが、久々に新しい環境を作ろうとしてちょっとはまったので解決のメモを書いておきます。書いておけばそのうち生成AIが拾って簡単に解決できるようになると思うので。

# Node.jsのイメージがおかしい

Node.js + PostgreSQLのベース設定をもとに環境を作ると、いきなり起動時に失敗します。Node.js 22であれば問題ないのですが、現在アクティブなサポートバージョンの24だとエラーになります。コンテナイメージのタグの命名規則が変わったようです。

ついでにdebianも最新のtrixieに変えましょう。

```diff Dockerfile
- FROM mcr.microsoft.com/devcontainers/javascript-node:1-24-bookworm
+ FROM mcr.microsoft.com/devcontainers/javascript-node:dev-24-trixie
```

# 同一のWSLで複数のPostgreSQLを使うDev Containersを利用するとエラー

これ、わかりにくかったのですが、DBに依存しているアプリケーション開発環境の方が起動できない（参加したいネットワーク service.dbがない）という感じのエラーなのですが、よくよく見てみると、DBがエラーで再起動を続けています。

以前はPostgreSQL 17を使っていたのですが、今回18にしてみたら(docker-compose.ymlのタグを書き換えた)らエラーが発生しました。どうも17と18はデータの配置のルールが変わり、なおかつデータの置き場（ボリュームのマウントポイント）も`/var/lib/postgresql/data`から、`/var/lib/postgresql`に変わったようです。

```diff docker-compose.yml
- version: 3.8
  service:
  :
    db:
-     image: postgres:17
+     image: postgres:18
      restart: unless-stopped
      volumes:
-      - postgres-data:/var/lib/postgresql/data
+      - postgres-data:/var/lib/postgresql
      environment:
        POSTGRES_PASSWORD: postgres
        POSTGRES_USER: postgres
        POSTGRES_DB: postgres
```

# サービス名も重複しない名前にしておく

アプリ名がぶつかるのもよくないということを聞きましたので、そうなるとサービス名とかも変えておく方が良いですね

```diff
  services:
-   app:
+   myproj-app:
      build:
        context: .
        dockerfile: Dockerfile
-     network_mode: service:db
+     network_mode: service:myproj-db

-   db:
+   myproj-db:
      image: postgres:18
      restart: unless-stopped
```

# プロキシ

プロキシ突破はコツがわからないと苦労しがちです。一般的なDockerのプロキシ設定であれば、以下の当ブログの記事で書かれたGUIの設定の内容で十分でしょう。

* [ProxyとDockerと新人社員と時々わたし](https://future-architect.github.io/articles/20201020/)

しかし、特にDockerをDev Containersで使う場合は、通常のイメージ作成で使う

* イメージ取得
* ビルド時

に加えて、

* 通常ユーザーの実行時(npm installやgo get)
* sudoの実行時(apt-get)

と4パターンの通信を扱う必要があり、それぞれ別に設定が必要だったりするためにさらにややこしいです。以前、[当ブログで紹介した記事](https://future-architect.github.io/articles/20231206a/#NG-%E3%83%97%E3%83%AD%E3%82%AD%E3%82%B7%E8%A8%AD%E5%AE%9A)ではあっさり紹介しましたが、今回、まっさらな環境からDev Containersを作るスクリプトを書いてみて、いろいろ試行錯誤したのでその知見も紹介します。

Dev Containersは、.devcontainer/devcontainer.jsonが設定の大本です。ここで開発環境のDockerfile、もしくは既成のイメージを選択します。PostgreSQLなどのDBも併用する場合はcompose.yamlを間に挟むこともあります。プロキシを通過する場合はさまざまなこれらの設定ファイルに記述していく必要があります。その相関関係を記したのが以下の図です。

<img src="/images/2026/20260213a/image.png" alt="image.png" width="484" height="488" loading="lazy">

以下の3つのレイヤーの設定について紹介していきます。

* ホスト環境(イメージ取得、ビルド時のapt-getなどの通信)
* devcontainer.json(実行環境の通信)
* Dockerfile(sudoの通信)

## ホスト環境(イメージ取得、ビルド時のapt-getなどの通信)

まず、Dockerが動くホスト環境でDockerのプロキシ設定および、環境変数を指定します。条件によって組み合わせが複雑なので要注意です。

| 環境 | イメージ取得 | ビルド内通信 | 環境変数 |
|:-|:-:|:-:|:-:|
| Windows版Dockerデスクトップ | (1) | (1) | (5) |
| Linux単独 | (2) | (4) | (6) |
| WSL2+Linux版Docker  | (3) | (4) | (5) |

個々の設定が終わったあとの確認方法としては、これらを設定すれば、ホスト環境の中でdocker pullやcurlコマンドで外につなぎにいけるはずなので、Dev Containersの起動前に試してみましょう。また、Dockerfileの中の外部通信(apt-getなど)もいけるはず。

### (1): Dockerデスクトップのプロキシ設定

Dockerデスクトップの場合はGUIで設定ができます。これを設定することで、イメージ取得やビルド内の通信の両方でプロキシが取った状態で通信ができます。

### (2): Linuxのイメージ取得用の設定

Dockerコマンド自体はデーモンへのリクエストだけを行い、実際のビルドやイメージ取得はデーモンが行います。そのデーモンに対しては専用の設定ファイルがあります。

```toml /etc/systemd/system/docker.service.d/http-proxy.conf
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080/"
Environment="HTTPS_PROXY=http://proxy.example.com:8080/"
Environment="NO_PROXY=localhost,127.0.0.1,docker-registry.somecorporation.com"
```

修正したらデーモンを再起動します。

```shell
sudo system docker restart
```

### (3): WSL2+Linuxのイメージ取得の設定

WSL2の中でLinux版のDockerを使っている場合、現行のWSL2であればは自動でWindowsのプロキシを設定する機能(autoProxy)があります。Windows側設定が適切であればイメージ取得は通るようになります。裏のネットワークインタフェース側で解決してくれるようです。デフォルトでtrueになっていますが、明示的に書きたい場合は次のように設定します。

```toml $HOME/.wslconfig
[wsl2]
dnsTunneling=true
autoProxy=true
```

### (4): LinuxのDockerの設定

ビルド時にプロキシ情報の環境変数を渡す方法には、--build-argでコマンドで渡す方法と設定ファイルで渡す方法があります。VSCodeのDev Containersのビルドの中の触れない場所で呼ばれてオプションが追加できないため、ファイルで渡す方法しかないでしょう。

```json $HOME/.docker/config.json
{
 "proxies": {
   "default": {
     "httpProxy": "http://proxy.example.com:8080",
     "httpsProxy": "http://proxy.example.com:8080",
     "noProxy": "*.test.com,localhost,127.0.0.1"
   }
 }
}
```

Dockerfile内で直接書いてしまう方法もありますが、ポータビリティも下がりますし、認証情報が入る可能性があるため、お勧めしません。

### (5): 環境変数の設定(WSL2の場合)

デスクトップ版はWSL2を使います。また、WSL2+Linux版の組み合わせでもWSL2になります。Dev Containerに渡すにはWSL2の中のLinuxの環境変数にプロキシ設定がある状態にしておく必要があります。

設定方法としては、2つあり、まずはWindowsの環境変数にhttp_proxy, https_proxy, no_proxyなどを設定するとともに、次の環境変数も一緒に設定する方法です。

`WSLENV="http_proxy/u:https_proxy/u:no_proxy/u"`

これらで指定した環境変数がWSL2の中にも取り込まれます。それ以外としては次のLinux単独の環境変数設定方法も使えます。

### (6): 環境変数の設定(Linuxの場合)

WSL2ではないLinuxの場合は、いつも通り、ユーザーの.profileとか.bashrcといったところに環境変数でプロキシ設定を書きます。

```shell .bashrc
export http_proxy="http://proxy.example.com:8080"
export https_proxy="http://proxy.example.com:8080"
export no_proxy="localhost,127.0.0.1,host.docker.internal"
```

## devcontainer.json(実行環境の通信)

devcontainer.jsonの中でホスト側の環境変数を実行時に展開してくれる機能があるのでこれを利用します。`docker run -e 環境変数=値`で渡すのと同じですが、元の変数も参照として書けるため、設定ファイルをプロジェクトで共有する場合にもハードコード不要で安全です。

```json
{
	"remoteEnv": {
		"HTTPS_PROXY": "${localEnv:https_proxy}",
		"https_proxy": "${localEnv:https_proxy}",
		"HTTP_PROXY": "${localEnv:http_proxy}",
		"http_proxy": "${localEnv:http_proxy}",
        "NO_PROXY": "${localEnv:no_proxy}",
        "no_proxy": "${localEnv:no_proxy}"
	}
  }
```

これで、`https_proxy`環境変数などを参照するnpmやgo getなどは正しく動きます。

なお、証明書のエラーが出る場合は証明書の検証をやめるオプションを定義して回避もできますが、可能であれば証明書を入れる方がましです。Dockerfileに以下の行を追加しましょう。

```Dockerfile Dockerfile
COPY my-company-ca.crt /usr/local/share/ca-certificates/my-company-ca.crt
```

## Dockerfile(sudoの通信)

これまでのところでほぼ問題ありませんが、開発環境の中でapt-getで追加のツールなどを入れようとするとエラーになります。devcontainer.jsonは、作業ユーザーの環境変数には設定してくれますが、sudo apt-getとすると、一時的に環境変数が設定されていない別ユーザーに代わってしまい、設定が見えなくなってしまうからです。

sudoしても必要な環境変数を引き継ぐような設定をDockerfileに足してあげることで、自由にapt-getできるようになります。

```Dockerfile Dockerfile
RUN echo 'Defaults env_keep += "http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy NO_PROXY"' >> /etc/sudoers
```

## macOSの場合

macOSの場合はWSL2のレイヤーを意識する必要性がないのでシンプルです。Linux VMは確かにありますが、Windowsと違ってパフォーマンスのためにWSL2の中のファイルシステムに環境を作ってWSL2の中からVSCodeを起動するということがないからです。

Docker Desktop版を使うなら、そちらのプロキシ設定とmacOSの一般の環境変数にhttp_proxyなどを設定すればおしまいです。Linux VMの中にわざわざ作るのであれば同じように設定は必要になると思いますが。

# まとめ

Dev Containersは便利ですが、若さにあふれているというか、安定性よりも新しいものを、という気概を感じます。そこそこ小さい苦労があったので、メモ代わりに書いてみました。もし、ほかにもこんな問題もあったぞとかがあれば、Xなどでお知らせいただければと思います。
