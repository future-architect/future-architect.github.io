---
title: "Dev Containersの始め方(1) : 仕組み編"
date: 2023/12/06 00:00:00
postid: a
tag:
  - Dev Containers
  - Docker
  - VSCode
  - PyCon
  - 登壇レポート
category:
  - DevOps
thumbnail: /images/2023/20231206a/thumbnail.jpg
author: 澁川喜規
lede: "PyCon APAC 2023でDev Containersで発表してきました。"
---
<img src="/images/2023/20231206a/53296952672_95495d5f01_k.jpg" alt="53296952672_95495d5f01_k.jpg" width="1200" height="800" loading="lazy">

PyCon APAC 2023でDev Containersで発表してきました。写真はスタッフに撮っていただいた写真のアルバムから引用させていただきました。本エントリーではその発表の元ネタとして半年ぐらい前にいろいろ調べていた内容をお伝えします。

<iframe src="https://docs.google.com/presentation/d/e/2PACX-1vTwNT6bUGRiLwk2e8sgug_DQak4qUavSA5_XW32CrWKdJHyFVprWT9qosUJrtuRNItxAF94QHGVSv_i/embed?start=false&loop=false&delayms=3000" frameborder="0" width="95%" height="569" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>

個人的には、バイナリ互換とか仮想マシンってあんまり興味なくて、多くの人が努力して作り上げてきたソースコード互換のアプリでWindows/macOS/Linuxでネイティブで動く、という世界観が好きだったりするのですが、仕事柄、開発環境をまるっと配るというのも調べておきたいな、ということで、「俺はやらないぞ」という気持ちでいたDev Containersに触れてみて、仕組みとか使い方とか調べてみたのでそれのまとめです。

# 普通のDockerとも違うDev Containersの仕組み

devcontainerは[VSCodeの持つ仕組み](https://code.visualstudio.com/docs/devcontainers/containers)です。この図がよく引用されていますね。ユーザーが操作しているOS上には、ソースコードと、VSCodeのみがいます。git cloneしてきてVSCodeでそのプロジェクトを開くと、`.devcontainer`というフォルダがあり、その設定を元に、VSCodeがコンテナ内部に開発環境を作ってくれます。

<img src="/images/2023/20231206a/image.png" alt="image.png" width="968" height="402" loading="lazy">

リモートで開発というと、VDI (Virtual Desktop Infrastructure)というものもあります。Amazon Workspacesとか、Azure Virtual Desktopとか、Google Virtual Desktopsとかですね。Webサービスを開発するとして、これらの代表的なVDI環境と比較するとこんな感じかと思います。

|  | 通常 | Virtual Desktop Infrastructure | Dev Containers |
|:-:|:-:|:-:|:-:|
| エディタ/IDE | ローカル | 仮想PC内部(RDP) | ローカル |
| 検証用ブラウザ | ローカル | 仮想PC内部(RDP) | ローカル |
| サーバー  | ローカル | 仮想PC内部 | Docker内部 |
| ソースコード  | ローカル  | 仮想PC内部  | ローカル→Dockerにコピー |

VDIでもGitHub Codespacesなんかだとエディタはローカルのブラウザで動いたり、検証用ブラウザはポートフォワードでローカルのブラウザが使えたり、というのはありDev Containersとだいぶ近いのです。

ソースコードなどもローカル側が主で、そのコピーがDockerにコピーされます。実際にエディタが編集するのはコンテナ内部にコピーされたファイルだったりする（変更はローカルに同期される）のですが、基本的に通常のローカル開発と感覚はほとんど変わりません。⌘ + JとかCtrl + Jでターミナルを開くと、Docker内部に繋がっている以外は操作感覚は変わらないです。

いくつかネットで記事を見ると、いろいろコンテナを作り込んでいる記事とかも見かけるのですが、さぞ、特別なコンテナなんだろう、と[いくつかMicrosoft謹製のDev Containers用のコンテナ定義](https://github.com/microsoft/vscode-dev-containers/tree/main/containers)を辿ってみたのですが、ユーザーを作ったり、するぐらいで、一見すると特別なことをしているようには見えません。[エディタ類とかjqとかはデフォルトで入れてくれて、便利です](https://github.com/microsoft/vscode-dev-containers/blob/main/containers/debian/.devcontainer/library-scripts/common-debian.sh#L77)。

実は、Dockerの外でいろいろ作り込まれているのがこのDev Containersです。

Dockerのイメージのアーキテクチャとしては1つの親を持って、それに必要なファイルを追加していく作り方をします。Javaのイメージ、Pythonのイメージなど用途ごとにベースイメージを選んでいきますが、「JavaとPython両方持ったイメージが欲しい」と思うと急に便利なレールから外れます。

Dev Containersは1つベースを選ぶというのは変わらないのですが「Feature」を選んでトッピングしていきます。そうすると、それらのツール群をインストールするDockerfileが内部的に作られ、ビルドされて使えるようになります。

<img src="/images/2023/20231206a/devcontainer2.png" alt="devcontainer2.png" width="571" height="311" loading="lazy">

VSCodeのサーバー側の実装やら、拡張機能はvscodeという名前のボリュームの中に置かれて実行時にマウントしています。Dockerをいじくるソケットも内部にマウントされていて、中から結構やりたい放題できるようになっており、「完璧なイメージファイルを起動するだけ」ではなく、「必要に応じてイメージを改変して再ビルドもするし、Dockerをこき使う」感じの実装になっています。いつも引用される図からは隠されていますが、おとなしく見えて結構獰猛な作りです。もちろん、自分でイメージを作り切ってそれを利用することもできますが、この「イメージ作成機能をも内包しているツール」と考えるべきです。

# Dev Containers環境の作り方・始め方

既存のDockerとかコンテナの知識がなまじあると、「必要なツールがそろったDockerイメージをまず作らないと」という考えになってしまい身構えがちですが（僕がそう）、Featureをバシバシ足していけば良いのだ、と思えば気軽なものです。最初からJavaとかPythonとか入っているイメージもありますが、ベースのOSイメージ（Debian, Ubuntu, Alpine)を選んで、Featureを足していくのが良さそうです。

まずは、Dev Containerの拡張を入れてから、 **Add Dev Container Configuration Files...** メニューを選びます。これを選ぶと、次にベースイメージとFeatureを選びます。バージョン選択などのオプションもあります。

<img src="/images/2023/20231206a/スクリーンショット_2023-04-16_22.45.58.png" alt="スクリーンショット_2023-04-16_22.45.58.png" width="1089" height="516" loading="lazy">

なお、1番目立つ **New Dev Container...** はイメージを作成して即座に起動するのですが、そのイメージの設定などは残りません。VSCodeの履歴にはあるのでそこから再度立ち上げ直したりもできますし、おそらくDockerの操作でイメージとしてコンテナレジストリに送ることはできて、それを起動しつつVSCodeからアタッチ、という運用は可能だと思われますが、あとでパラメータを足したり、Featureを追加したり削除したりといったことがやりにくいので、レシピが手元に残る方を選ぶ方が良いです。

ぽちぽちやると、`.devcontainer`フォルダに設定ファイルが出力され、コンテナのビルドが裏で実行され、完了するとVSCodeに表示されます。

なお、いくつかエラーに遭遇してビルドができないことがありました。

* Javaのオプションで17を入れると選択すると「見つからない」というエラー
* FeatureでJavaを選ぶとプロキシを超えられないエラー(証明書を入れる必要がありそう)
* GraalVMを選択すると、M2のMacだと「Aarch64には非対応」というエラー

Dev Container関連のブログ記事とか見ると、アプリケーションで使うライブラリとかをイメージに焼き込む（Dockerfileにパッケージ一覧のファイルをADDして、RUNでインストール実行）している例もありますが、ライブラリは頻繁に追加されたりバージョンが更新されることを考えると、イメージの中には置かない方が良いでしょう。その度に再ビルドは重いですし、コンテナのビルドをしないとバージョン検証できないのは不便でしかないと思います。

# ２回目以降

2回目以降は、一度起動したことがあるならWelcomeページで`[Dev Container]`と書いてあるプロジェクトを選択すると、Dockerコンテナが起動し、そこからの編集が開始できます。

<img src="/images/2023/20231206a/スクリーンショット_2023-04-17_0.15.56.png" alt="スクリーンショット_2023-04-17_0.15.56.png" width="926" height="380" loading="lazy">

`.devcontainer`があるプロジェクトを開くと、「コンテナの中で開き直しますか？」とダイアログが出ますし、左下の緑のDev Containerアイコン**Reopen in Container**メニューを選んでも開けます。

<img src="/images/2023/20231206a/スクリーンショット_2023-04-17_0.18.00.png" alt="スクリーンショット_2023-04-17_0.18.00.png" width="564" height="149" loading="lazy">

# Dev Containersがやってくれること・やってくれないこと

通常のDockerはいろいろ明示的に書かなければならないのですが、Dev Containersでは少し便利におせっかいを焼いてくれます。

## OK: ワークスペースのマウント

まず、Dockerのマウントとかボリューム設定をせずとも、最初にローカルで開いた（Reopenする前の)フォルダを、ワークスペースとしてマウントしてくれます。プロジェクトのフォルダ（`.devcontainer`の親フォルダ)の名前が`awesomeproject`だったとすると、`/workspaces/awesomeproject`というフォルダがコンテナ内に作られ、ローカルフォルダと同期されます。マウント設定をぽちぽちやる必要はありません。ただし、ワークフォルダに大量に自作でないファイルが作られる`node_modules`だと、ローカルとの同期が入るとかなり速度が遅くなります。これをオプトアウトする必要があります。これについてはフロントエンドの環境構築の方でまた紹介します。

## OK: クレデンシャルのマウント

Dev Containersの設定を開発環境としてチームに配るケースやリポジトリにアップロードすることを考えると、クレデンシャルなどの情報が入るのは望ましくないことがわかります。幸い、Dev Containersはいくつかの開発者の個人設定をマウントして起動時に持ってきてくれます。イメージの内部には書き込まれないので、イメージを配布しても安全になります。ソースコードの管理はGitHubやらGitLabを使うのがだいたいエンタープライズ開発でも一般的になっているので（少なくとも僕が関わっている案件は全部）、ここが自動的に行われるとチームでの開発がスムーズです。

* Gitユーザーのメールアドレス: .gitconfig
* Dockerのクレデンシャル: .docker/setting.json

SSHの鍵は直接インポートはしませんが、[SSH通信はホスト環境のssh-agent経由で通信しようとする](https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials)ので、ホスト側のエージェントに`ssh-add`で鍵を登録するだけで大丈夫です。コンテナの中に鍵を持ち込むことは不要です。

## NG: プロキシ設定

ホストのプロキシ設定は取り込んでくれないので、もし会社にプロキシがある方は以下の設定を`.devcontainer/devcontainer.json`に入れておきましょう。ホストOSの環境変数として``HTTPS_PROXY``が定義されている想定です。認証情報をつけても大丈夫です。

```json .devcontainer/devcontainer.json
}
  "remoteEnv": {
    "HTTPS_PROXY": "${localEnv:HTTPS_PROXY}",
    "https_proxy": "${localEnv:HTTPS_PROXY}"
  }
}
```

## OK: VSCode設定

`.devcontainer/devcontainer.json`にVSCodeに入れたい設定を書けます。インストールしたい拡張と、使いたい設定ですね。

```json .devcontainer/devcontainer.json
{
	"customizations": {
		"vscode": {
			"extensions": [
				"oderwat.indent-rainbow",
				"streetsidesoftware.code-spell-checker",
			],
			"settings": {
				"python.formatting.provider": "autopep8"
			}
		}
	}
}
```

いつも使っている通常の`.vscode/extensions.json`と`.vscode/settings.json`ですが、拡張機能の推奨の方は読まれません。設定は使われ、`devcontainer.json`よりも優先されます。Dev Containersを使うと、設定がUser/Remote/Workspaceの3階層になりますが、`devcontainer.json`はRemoteに設定され、`.vscode/settings.json`はWorkspaceに反映されます。

## OK: 作業ユーザー

`vscode`ユーザーも作ってくれます。Dockerコンテナでは自分以外はいない環境ではあるのですが、デフォルトではrootユーザーになってしまいます。よく使うベースイメージでは`vscode`というrootではないユーザーがデフォルトでいます。どのユーザーで起動するかは`devcontainer.json`でも上書き設定できます。

## OK: ポート設定

`devcontainer.json`には、フォワードするポート設定の設定があります。テストサーバーを起動したときにポートを開くと、ホストのブラウザでテストできたりするのですが、実はこのポートは設定不要です。新しいサーバーが起動すると、VSCode側で「フォワードする？」って聞いてくれます。便利ですね。

## OK or NG: GUI

あとは試してはないのですが、Waylandのソケットも自動のフォワードしてくれるらしいので、GUIアプリケーションを起動することも可能なようです。WindowsであればWLSgでWaylandを表示してくれる機能がデフォルトで入っているため、設定いらずで表示できるかもしれません。macOSの場合はXサーバーを入れる必要があります。

* [G2's Forest: WSLg を使って Docker 上で GUI アプリを動かす（GPUサポート付き）](https://blog.mohyo.net/2022/02/11591/)
* [Futureテックブログ: Playwrightの環境構築（VSCode Dev Container編）](https://future-architect.github.io/articles/20230823a/)

# まとめ

Dev Containersの仕組みをいろいろと調べて学びました。単にDockerコンテナの中で開発するよ、というだけでなく、その外でVSCodeがいろいろと気を利かせてくれて、認証情報をホスト側と共有したり、開発サーバーが起動したらホストのブラウザからアクセスできるようにポートを開いたりしてくれることがわかりました。

Dockerのコンテナは、UNIX的な思想を体現したもので、1アプリだけが動くミニOS環境を再現したもので、外と独立した環境が作れるのは良いのですが、プリミティブすぎる感じがありました。カスタマイズポイントもコンテナによって違い、どの環境変数を設定するか、ファイルを`/docker-entrypoint-initdb.d`にマウントするとかとか、設定ポイントやインタフェースが「契約」として定義されていません。TypeDockerが欲しいな、と常々思っていました。

一方で、Dev Containersは、カスタムポイントがウィザード化されたFeature機能でトッピングしたり、クレデンシャルをイメージに焼き込まない形で取り入れる機構が用意されていたり、自動でポートを開いたり、少し文明が進んだ感じがあります。

なお、本エントリーを書くにあたって、 [@lambda_sakura](https://twitter.com/lambda_sakura) さん、 [@ryushi](https://twitter.com/ryushi) さん、 [@tk0miya](https://twitter.com/tk0miya) さんにアドバイスをいろいろ教えてもらいました。ありがとうございます。

[次回](/articles/20231212a/)はPythonの環境を作っていきます。
