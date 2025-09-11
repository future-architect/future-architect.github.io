---
title: "会社のプロキシの裏でPodman Desktopを実行する"
date: 2022/12/27 00:00:00
postid: a
tag:
  - Docker
  - プロキシ
category:
  - DevOps
thumbnail: /images/2022/20221227a/thumbnail.png
author: 澁川喜規
lede: "ちょっとローカルでPostgreSQLの最新バージョンを試したいけどDocker Desktopの稟議が間に合わない！みたいなときのためのメモです。Docker Desktopの有償化と契約すべきライセンスについては以前書きました。その後..."
---
ちょっとローカルでPostgreSQLの最新バージョンを試したいけどDocker Desktopの稟議が間に合わない！ みたいなときのためのメモです。

Docker Desktopの有償化と契約すべきライセンスについては以前書きました。その後、値段がちょっと上がったのと、100人以上のTeamプランは許可されずにBuisinessプランが必須になり、BusinessプランではSSOが利用できるようになったのが変更点です。

* [Docker Desktop有償化！どのライセンス契約する？](/articles/20220124a/)

[Docker Desktop](https://www.docker.com/products/docker-desktop/)の代替のものがいくつかでています。[Rancher Desktop](https://rancherdesktop.io/)と、[Podman Desktop](https://podman-desktop.io/)があります。Rancher Desktopは会社のプロキシの裏で動かすのが難しく、ちょっと苦戦した上に、WSLのコンテナが再作成されるタイミングでプロキシ設定がリセットされるということを聞いて、Podman Desktopを使ってみました。PodmanはRed Hatが開発しているコンテナのエコシステムで、コンテナエンジン（以下サーバーとします）、CLIツールで構成されます。それにデスクトップのUIとPodman自身のインストーラを組み合わせたものがPodman Desktopです。

<img src="/images/2022/20221227a/image.png" alt="" width="1200" height="978" loading="lazy">

# インストール

上記のPodman Desktopのサイトからインストーラをダウンロードして実行します。0.9系までは実行ファイルがそのままダウンロードされたのですが、最新の0.10.0からはインストーラになりました。入れるのはダブルクリックだけなので難しくないでしょう。起動したら、Podmanのインストーラが初回は起動するので、インストールします。PodmanはWSL2上で動くサーバーで、dockerdとかにあたるものです。執筆時点では4.3.1が入りました。

# プロキシの設定

起動したら、左下のSettings→Proxyと進んでプロキシの設定ダイアログに設定します。認証が必要な場合は、`http://ユーザー:パスワード@ホスト:ポート`という形式で入れます。

<img src="/images/2022/20221227a/image_2.png" alt="" width="1200" height="687" loading="lazy">

これだけで済めばDocker同等なのですが、残念ながらもうひと手間必要です。

## PodmanのWSL2のイメージの設定変更

そのままだと実行すると、プロキシのホスト名が解決できないというエラーが発生してしまいます。ネームサーバーの設定を入れてあげる必要があります。まずWSL2を起動します。まずはresolv.confが上書きされないようにwsl.confを編集します。

```bash
$ wsl -d podman-machine-default

(wsl2起動)

$ sudo vi /etc/wsl.conf
```

```ini /etc/wsl.conf
[user]
default=user

[network]
generateResolvConf = false
```

その後は一度WSL2を再起動します（そうしないとresolve.confが再生してしまった）。

```
wsl --shutdown
```

次は/etc/resolv.confを編集します

```bash
$ wsl -d podman-machine-default

(wsl2起動)

$ sudo vi /etc/resolv.conf
```

```text /etc/resolv.conf
nameserver プロキシのIPアドレス
```

一度WSL2から出て再度入りなおしても編集したresolv.confが残っていることを確認しておきます。

最後にpodmanのサーバーを再起動してからプロキシ越しにイメージをとってきて実行できるか確認します。`docker`を`podman`に読み替えるだけで使えます。

```
$ podman machine stop
$ podman machine start
$ podman run --rm hello-world
!... Hello Podman World ...!

         .--"--.
       / -     - \
      / (O)   (O) \
   ~~~| -=(,Y,)=- |
    .---. /`  \   |~~
 ~/  o  o \~~~~.----. ~~
  | =(X)= |~  / (O (O) \
   ~~~~~~~  ~| =(Y_)=-  |
  ~~~~    ~~~|   U      |~~

Project:   https://github.com/containers/podman
Website:   https://podman.io
Documents: https://docs.podman.io
Twitter:   @Podman_io
```

# コンテナレジストリの設定

デフォルトのPodmanは、docker.io以外のところからダウンロードしようとしたり、いくつかのイメージ名にエイリアスが張られていたりします。さきほどのhello-world、Dockerのhello-worldと違うことに気づいた方もいるでしょう。hello-worldは`quay.io/podman/hello`を代わりにプルしてきます。

dockerのものを使うにはレジストリを変更します。

```
$ wsl -d podman-machine-default

(wsl2起動)

$ sudo vi /etc/containers/registries.conf
```

次のように変更します。これでdocker.ioのイメージだけを取得します。また、CONTAINERS_SHORT_NAME_ALIASING=onを設定しておくと、`docker.io/hello-world`ではなく、`hello-world`で動作するようになります。とはいえ、短縮名は[リスクがあるよ](https://www.redhat.com/sysadmin/container-image-short-names)とドキュメント化されていたりするので、確認の上ご利用ください。今回はあくまでもDocker Desktopを入れるまでのつなぎなので、互換性が高い方が良いな、ということでやっています。

```toml /etc/containers/registries.conf
unqualified-search-registries = ["docker.io"]
[engine]
env=["CONTAINERS_SHORT_NAME_ALIASING=on"]

short-name-mode="enforcing"
```

それではまたpodmanを再起動してから、今度はnginxを起動してみます。`http://localhost:8888/`で起動したら完了です。

```
podman machine stop
podman machine start
podman run --rm -it -p 8888:80 nginx
```

<img src="/images/2022/20221227a/image_3.png" alt="image.png" width="1200" height="548" loading="lazy">

# まとめ

Docker Desktopはいろいろな開発者にうれしい機能がたくさん追加されて、積極的に開発されていて、便利ですし、今回やったようなWSL2に入ってプロキシサーバーにつながるような設定をしなくてもアクセスできたりして便利なのですが、ちょびっと検証する目的でPodman Desktopを代わりに実行する方法を紹介しました。プロキシの裏でも動作するようになりました。

まあ、世の中のドキュメントはDockerを使うように書かれていたりするので、トラブルシュートとかを考えると頻繁使う人はDocker Desktopをきちんと入れた方が良いですね。
