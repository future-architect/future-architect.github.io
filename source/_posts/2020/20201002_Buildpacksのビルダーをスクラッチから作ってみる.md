---
title: "Buildpacksのビルダーをスクラッチから作ってみる"
date: 2020/10/02 00:00:00
postid: ""
tag:
  - CNCF
  - Buildpacks
  - Docker
  - Python
  - コンテナデプロイ
  - コンテナビルド
category:
  - Infrastructure
thumbnail: /images/20201002/thumbnail.png
author: 澁川喜規
lede: "TIGの渋川です。[CNCF連載]の第4回は、CNCFのSandboxプロジェクトのBuildpacksについて紹介します。* https://buildpacks.io"
---
<img src="/images/20201002/buildpacks-horizontal-color.png" loading="lazy">

TIGの渋川です。

[CNCF連載](/articles/20200928/)の第4回は、CNCFのSandboxプロジェクトのBuildpacksについて紹介します。

* https://buildpacks.io

# Buildpacksとは

Herokuがオリジナルで作ったビルドツールです。HerokuのオリジナルはHerokuのプラットフォーム用のビルドツールだったと思いますが（使ったことはない）、CNCF版はコンテナイメージを作成します。オリジナル版とはいろいろ違いがあり、区別をつけるためにCloud Native Buildpacks（略してCNB）と呼称されているようです。

ツールの方針としては、ビルド設定ファイルのようなものを作らなくても（実行情報のみを書いたファイル、project.tomlは書ける）ソースコードを与えるだけで、Dockerfileなどを使わずにDockerimageが作れます。

使い方は簡単で、作業フォルダで次のコマンドでDockerイメージができてしまうのです。デフォルトで利用するビルダーはあらかじめ設定できるので、そうなるともっと短くコマンドを回せます。

```bash
$ pack build [イメージ名] --builder [ビルダーイメージ名]
```

BuildpacksはGCPのGoogle App Engine、Cloud Functions、Cloud Runのビルドでも使われているようです。

* https://github.com/GoogleCloudPlatform/buildpacks

Cloud Functionsなどはランタイムの種類はオプションで設定しますが、本来はそういうことをしなくても、ソースコードを見てマッチするビルド方法を自分で探し出してイメージを作成できるポテンシャルはあります。

デフォルトで提供されているビルダーを使ってイメージを作るだけでは大した説明にならないので、いっそのこと自分のビルダーを作ってみようと思います。

## Buildpacksの構造

ユーザーがイメージ作成時に指定するのは「ビルダー」です。ビルダーにはBuildpackがいくつか含まれます。

Buildpackは、現在のワークフォルダが自分のタスクと関係あるのかを確認し(detect)、関係がある場合のみビルドを実行します。

その作業の土台になるのが「Stack」です。「Stack」は実行用のDockerイメージと、ビルド用のDockerイメージのペアです。普通に公開されているものではなく、少し手を加える必要があります。Dockerfileで作ってもいいです。GoogleはBazelを使っているようです。

<img src="/images/20201002/Screen_Shot_2020-10-02_at_9.11.57.png" loading="lazy">


ビルダーを作るにはこれらの構成要素を1つずつ作っていくことになります。

## 物理配置

なお、これは論理的な構成要素であって、実際はどれもDockerイメージです。Buildpackはファイルにしてビルダーイメージに含めることもできますが、それぞれのBuildpackをDockerイメージにしてもいけます（今回の作例は全部ファイル化しています）。最低限、Stackのイメージ2つとビルダーのイメージの3つのDockerイメージとなります。

ビルダーとStackは1:1ですが、BuildpackはどのStackに対しての適用するか、と設定ファイルに書きますが、複数のStackを指定できるので、ビルダーとBuildpackは1:Nではなく、N:Mとなり、distroless用、debian-slim用、debian用、alpine用などの複数のビルダーで共有できます。

ビルダーの設定ファイル内でのStackやBuildpackの指定時や、ビルド時のビルダーの指定はローカルのDockerにインストール済みのイメージでも良いですし、Docker HubやGCR、ECRなどのコンテナレジストリでもいけます。チーム内で共有するときはチームで共有するレジストリに入れてあげてもいいし、チームメンバーが各ローカルでビルドしても良いです。Dockerfileを配るか、アップロードしたイメージを使ってもらうか、というのと同じです。今回はすべてローカルでビルドして使っているのでコンテナレジストリにはpushしていません。

## 実行イメージの構造

Buildpacksを使って作った実行イメージですが、

* ``/workspace``というフォルダにアプリケーションのファイル一式（packコマンドを実行したときのカレントフォルダの内容）が格納される。
* ``/layers/(Buildpack名)/``なフォルダにレイヤーが保存される。各Buildpackは自由にレイヤーを増やすことができる

複数のBuildpackが検知して実行すると、複数のレイヤーが保存されると思われます。また、1つのBuildpackの中に複数の成果物（実行ファイル==タイプ）を含めることが可能ですが、実行できるコマンドは1つだけです。

これは、例えばフロントエンドをビルドしたファイルを入れて、PythonとかGoでAPIサーバーを起動して配信する、みたいなことが簡単にできますし、複数のバッチのプログラムが含まれるイメージを1つ作ってデプロイし、ECS Run Taskのオプションで起動するバッチを切り替える、みたいなことが簡単にできそうです。

# まずは空のビルダーを作る

それではまずは空のビルダーを作ってみましょう。

## 準備：Stackを決めてフォルダを作成

まずは実行とビルドのイメージを決定します。PythonのDebian系のイメージを使ってビルドをしてdistrolessを作成したいとします。

* 実行: ``gcr.io/distroless/python3``
* ビルド: ``python:3.7-slim-buster``

設定ファイルにこの情報を書き込むのはビルダー作成時の前ですが、これを決めておかないとBuildpackも作成できないので、これを決めるのが最初になるでしょう。もう一つ、stackのIDを決めます。Javaのパッケージ名のような感じで、ユニーク性が担保できればなんでも良いのですが、ここでは次のようにしようと思います。

* ID: ``io.github.future-architect.samples.debian`` (なんでも良い)

作業フォルダも作っておきます。正解は分からないですが、とりあえず次のようになる予定です。

```text
+ buildpacks
|  + (buildpackごとのフォルダ)
|  |  + bin
|  |  |  + build
|  |  |  + detect
|  |  + buildpack.toml
|  + empty-package.toml
+ images/
|  + Dockerfile.build
|  + Dockerfile.run
+ builder.toml
```

## 空のBuildpack

順番的にはまずはBuildpackです。既存のBuilderに対してオリジナルのBuildpackを適用することもできそうですが(stackを既存のものを指定して、pack build時に--buildpackで個別に読み込み)、理解のためにゼロから作ります。

buildpackの構成要素は4つ。bin/buildスクリプトと、bin/detectスクリプト、そしてtoml形式の設定ファイル（ファイル名は任意だが、ここではbuildpack.tomlとする）と、パッケージ化のためのtomlファイル（これもファイル名は任意だが、empty-package.tomlとする）。

detectとbuildはそれぞれ、bashスクリプトで作りました。実行イメージがDebianなんで、Pythonで書いても良いかもしれません。

```bash buildpacks/empty/bin/detect
#!/usr/bin/env bash

set -e

echo "---> Detecting Empty Buildpack"
```

```bash buildpacks/empty/bin/build
#!/usr/bin/env bash

set -e

echo "---> Building Empty Buildpack"
echo "---> Done"
```

設定ファイルは次の通り。

```toml buildpacks/empty/buildpack.toml
# Buildpack API version
api = "0.2"

[buildpack]
id = "buildpacks/empty"
version = "0.0.1"
name = "Empty Buildpack"
homepage = "https://github.com/future-architect/"

[[stacks]]
id = "io.github.future-architect.samples.debian"
```

パッケージのURLというのは、URLでもフォルダでも良いです。いまはローカルフォルダで作業しているので相対パスを書きます。

```toml buildpacks/empty-package.toml
[buildpack]
uri = "empty/"
```

buildpackのパッケージ、.cnbファイルを作成します。ここではファイルに書き出していますが、DockerイメージにしてBuilderから利用させることもできるようです。

```bash
$ pushd buildpacks
$ pack package-buildpack empty.cnb --config ./empty-package.toml --format file
$ popd
```

## イメージの作成

Buildpackのstackは既存のDockerhubのイメージそのままではダメで、Stackの印をつける必要があります。[ここ
](https://buildpacks.io/docs/concepts/components/stack/)に書かれているように、実行用イメージはラベルでstackのIDを、ビルド用のイメージは環境変数でstackのIDとユーザーとグループのIDを指定します。rootユーザーではエラーになるのでユーザーを作る必要があります。

```Dockerfile images/Dockerfile.run
FROM gcr.io/distroless/python3-debian10

LABEL io.buildpacks.stack.id="io.github.future-architect.samples.debian"
```

```Dockerfile images/Dockerfile.build
FROM python:3.7-slim-buster

LABEL io.buildpacks.stack.id="io.github.future-architect.samples.debian"

RUN addgroup --gid 1000 builder
RUN useradd -ms /bin/bash -u 1000 -g 1000 builder

USER builder

WORKDIR /home/builder

ENV CNB_STACK_ID="io.github.future-architect.samples.debian"
ENV CNB_USER_ID="1000"
ENV CNB_GROUP_ID="1000"
```

```bash
$ pushd images
$ docker build -t distroless:python -f ./Dockerfile.run .
$ docker build -t distroless:python-builder -f ./Dockerfile.build .
$ popd
```

## ビルダーの作成

ようやくここまできました。といっても何もしないビルダーですが。builderはdockerイメージとして作成されて、dockerのイメージリストに格納されます。一度ビルダーを作成すれば、どのフォルダからも自由に利用できます。

```toml builder.toml
# Buildpacks to include in builder
[[buildpacks]]
uri = "buildpacks/empty.cnb"

# Order used for detection
[[order]]
  [[order.group]]
  id = "buildpacks/empty"
  version = "0.0.1"

# Stack that will be used by the builder
[stack]
id = "io.github.future-architect.samples.debian"
run-image = "distroless:python"
build-image = "distroless:python-builder"
```

```bash
$ pack create-builder python:distroless --config ./builder.toml
Downloading from https://github.com/buildpacks/lifecycle/releases/download/v0.9.1/lifecycle-v0.9.1+linux.x86-64.tgz
5.2 MB/5.2 MB
Successfully created builder image python:distroless
Tip: Run pack build <image-name> --builder python:distroless to use this builder
```

設定した名前のイメージができていることを確認します。日付はなぜか40年前。

```bash
$ docker images
REPOSITORY             TAG                 IMAGE ID            CREATED             SIZE
python                 distroless          b0ed12f6c423        40 years ago        125MB
```

## 試しに実行してみる

```bash
% pack build empty-sample --builder python:distroless
0.9.1: Pulling from buildpacksio/lifecycle
Digest: sha256:53bf0e18a734e0c4071aa39b950ed8841f82936e53fb2a0df56c6aa07f9c5023
Status: Image is up to date for buildpacksio/lifecycle:0.9.1
===> DETECTING
[detector] buildpacks/empty  0.0.1
===> ANALYZING
[analyzer] Previous image with name "index.docker.io/library/empty-sample:latest" not found
===> RESTORING
===> BUILDING
[builder] ---> Building Empty Buildpack
[builder] ---> Done
===> EXPORTING
[exporter] Adding 1/1 app layer(s)
[exporter] Adding layer 'launcher'
[exporter] Adding layer 'config'
[exporter] Adding label 'io.buildpacks.lifecycle.metadata'
[exporter] Adding label 'io.buildpacks.build.metadata'
[exporter] Adding label 'io.buildpacks.project.metadata'
[exporter] Warning: default process type 'web' not present in list []
[exporter] *** Images (dfe5b21636ef):
[exporter]       index.docker.io/library/empty-sample:latest
Successfully built image empty-sample
```

dockerコマンドでビルド結果をみてみましょう。日付はいつも40年前です。中は空なのでほぼgcr.io/distroless/python3-debian10と同じはずですが、2.4MBほど大きくなっています。

```bash
$ docker images
REPOSITORY             TAG                 IMAGE ID            CREATED             SIZE
empty-sample           latest              dfe5b21636ef        40 years ago        54.6MB
```

# 実用的なPythonのウェブアプリ用のbuildpackを作成する

一通り骨格はできたので、次に中身を作っていきます。

buildpackに最初からついているpaketo-buildpacksですが、かなり細かくビルドのステップをbuildpackに分割しています。これから作るのは習作なので、とりあえず1つのbuildpackで全部やるようにします。

https://github.com/paketo-buildpacks/go/blob/main/buildpack.toml

知っておくべき情報は、detect/buildに渡される引数です。それぞれ、パスです。レイヤーはbuildにしかありません。

* レイヤー: Dockerと似ている。ファイルのセット
* プラットフォーム: 環境変数などのプラットフォーム
* ビルド計画: detectとbuild間の情報伝達手段

レイヤーが大切で、フォルダを作成してそこに結果を書き込みます。

レイヤーはフォルダで、buildpackごとに作られます。このPythonのものだとビルド用のbuster-slimなPythonのイメージの中でビルドされますが、それの中の``/layers/buildpacks_python``というフォルダがbuildスクリプトの最初の引数で渡ってきます。これがそのbuildpackが使うレイヤーの親です。この中にフォルダーを自由に作り、レイヤーとします。

Dockerは行志向のプログラムになっていて、その行のコンテキスト（ファイル）と、Dockerのコマンドが等しければキャッシュします。Buildpackは自分でキャッシュのチェックのロジックを組む必要があります。詳細は調べきれなかったので今回はキャッシュはしていません。

## Buildpack作成のイテレーション

最初に空のビルダーを作りましたが、これは実は大切なことです。emptyというbuildpackでなくても、最初から作りたいbuildpackを作ってやっても良いのですが、ベースとなるビルダーが構築済みだと、アプリケーションのビルド時にbuildpackを独自にうわがいて使うことができます。いちいちビルダーをビルドし直さなくてもすばやくアプリケーションコードとビルダーの両方の調整が行えます。やたらとレイヤー化だので、ステップをわけているせいで、何度もビルドを回すのが面倒なツールが世の中増えていますが、この開発を高速に回せる使い勝手はとても良いです。ビルドツールはたいてい面倒なことが多いので・・・

```bash
% pack build webapp --builder python:distroless --buildpack ../buildpack/python
```

## Python検知コード

まずは検知コード。いつものrequirements.txtがあればPythonプロジェクトとみなします。検知した結果をビルドレイヤーに渡す場合は最後の引数にファイルを書き出すことによって実現できます。このサンプルはシンプルなまにしておきます。

```bash buildpacks/python/bin/detect
#!/usr/bin/env bash

set -e

echo "---> Detecting Python Buildpack"

if [ ! -f requirements.txt ]; then
  exit 1
fi

echo "---> Python Buildpack"
```

## Pythonビルドコード

ビルドの方はやや複雑です。


今回はvenvで環境を作って、それをレイヤーとしました。

```bash buildpacks/python/bin/build
#!/usr/bin/env bash

set -e

echo "---> Building by Python Buildpack"

# 入力引数
env_dir=$2/env
layers_dir=$1
plan_path=$3

mkdir -p $layers_dir

venv_layer="$layers_dir/venv"

# venvレイヤー作成
pushd $layers_dir
python -m venv venv
source venv/bin/activate
popd

# インストールして出力先に指定
pip install -r requirements.txt --disable-pip-version-check
echo "launch = true" > "$venv_layer.toml"

# 実行コマンド登録
cat >> "${layers_dir}/launch.toml" <<EOL
[[processes]]
type = "web"
command = "python"
args = ["main.py", "${venv_layer}"]
direct = true
EOL
echo "---> Done"
```

* まず、venvのレイヤー（自分のレイヤーのフォルダの下に作る）を作り、pip installしています
* フォルダ名.tomlというファイルを作ってlaunch = trueにすると、成果物のフォルダに含まれるようになります。pip installしたファイルをイメージに入れるために作成しています。
* ここでは``main.py``というファイルがあるものとして、それを実行するようにしています。実行ファイルの場所とレイヤーの場所は別のフォルダなので、引数でレイヤーのvenvのフォルダを教えるようにしました。

buildpackごとにlaunch.tomlファイルを作ると、実行時のエントリーポイントとなります。typeをwebにするとデフォルトで実行されるコマンドになります。なお、distrolessは[シェルも何も入っていないストイックなイメージ](/articles/20200514/)でしたね。その場合はdirect=trueにするとシェルを経由しなくなるのでdistrolessでもエラーにならなくなります。

ここではコマンドを決め打ちにしていますが、たとえばカレントフォルダにENTRYPOINTというテキストファイルを置いて、それの中を実行コマンドにする、みたいなことも自由にできます。

## アプリケーションコードの作成

それでは作ったビルダーを使ってStarletteアプリをビルドしてみます。作業フォルダを作り、まず検知に必要なrequirements.txtを作成します。作業フォルダはビルダーのフォルダとまったく別のフォルダで大丈夫です。

```text requirements.txt
click==7.1.2
h11==0.10.0
starlette==0.13.8
uvicorn==0.12.1
```

次にアプリケーションコードです。

distrolessは[ライブラリの読み込み元が厳しく制約されているイメージ](/articles/20200514/)でしたね。

Buildpacksは決まったフォルダにしかファイルを保存できません。レイヤーというフォルダを用意するのはできても、実行イメージのどこに置くかは介入できず、Buildpackが自分のルールで配置します。/rootのsite-packagesにどうしてもおきたい！というのは実現不可能です。

その後に検証したところ、siteパッケージの``site.addsitedir()``メソッドでフォルダを登録してあげれば、任意の場所からライブラリが読み込めることがわかりました。また、venvで作ったライブラリのフォルダも、別にvenvの環境に入る（activateする）ことなく、単にこの``addsitedir()``で利用できることがわかりましたので、これを使います。

最終的にできたのがこの実行ファイルです。

```py main.py
import os
import sys
import site

sp = os.path.join(sys.argv[1], "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages")
site.addsitedir(sp)

import uvicorn

from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route


async def homepage(request):
    return PlainTextResponse("Homepage")

async def about(request):
    return PlainTextResponse("About")


routes = [
    Route("/", endpoint=homepage),
    Route("/about", endpoint=about),
]

app = Starlette(routes=routes)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info")
```

実用的には、uvicornworker.pyというファイル名だったら、これらの``site.addsitedir()``を呼び出す、みたいな環境差異吸収のところまでBuildpackを作り込んだ方がBuildpackの思想的には良い気がしました。

## アプリケーションをビルドしてみる

emptyなBuildpackはもういらないので削除してしまっても良いでしょう。あとはこれでpackingして、再度ビルダーを構築します。

```toml builder.toml
# Buildpacks to include in builder
[[buildpacks]]
uri = "buildpacks/python.cnb"

# Order used for detection
[[order]]
  [[order.group]]
  id = "buildpacks/python"
  version = "0.0.1"

# Stack that will be used by the builder
[stack]
id = "io.github.future-architect.samples.debian"
run-image = "distroless:python"
build-image = "distroless:python-builder"
```

ビルダーの再作成が完了したらイメージを作成してみましょう。

```bash
$ pack build webapp --builder python:distroless
0.9.1: Pulling from buildpacksio/lifecycle
Digest: sha256:53bf0e18a734e0c4071aa39b950ed8841f82936e53fb2a0df56c6aa07f9c5023
Status: Image is up to date for buildpacksio/lifecycle:0.9.1
===> DETECTING
[detector] buildpacks/python 0.0.1
===> ANALYZING
[analyzer] Restoring metadata for "buildpacks/python:venv" from app image
===> RESTORING
===> BUILDING
[builder] creating venv: /layers/buildpacks_python/venv
[builder] /layers/buildpacks_python /workspace
[builder] /workspace
[builder] running pip install
[builder] Collecting click==7.1.2
[builder]   Downloading click-7.1.2-py2.py3-none-any.whl (82 kB)
[builder] Collecting h11==0.10.0
[builder]   Downloading h11-0.10.0-py2.py3-none-any.whl (53 kB)
[builder] Collecting starlette==0.13.8
[builder]   Downloading starlette-0.13.8-py3-none-any.whl (60 kB)
[builder] Collecting uvicorn==0.12.1
[builder]   Downloading uvicorn-0.12.1-py3-none-any.whl (44 kB)
[builder] Collecting typing-extensions; python_version < "3.8"
[builder]   Downloading typing_extensions-3.7.4.3-py3-none-any.whl (22 kB)
[builder] Installing collected packages: click, h11, starlette, typing-extensions, uvicorn
[builder] Successfully installed click-7.1.2 h11-0.10.0 starlette-0.13.8 typing-extensions-3.7.4.3 uvicorn-0.12.1
[builder] ---> Python Buildpack Done
===> EXPORTING
[exporter] Adding layer 'buildpacks/python:venv'
[exporter] Reusing 1/1 app layer(s)
[exporter] Reusing layer 'launcher'
[exporter] Adding layer 'config'
[exporter] Reusing layer 'process-types'
[exporter] Adding label 'io.buildpacks.lifecycle.metadata'
[exporter] Adding label 'io.buildpacks.build.metadata'
[exporter] Adding label 'io.buildpacks.project.metadata'
[exporter] Setting default process type 'web'
[exporter] *** Images (6cd718011277):
[exporter]       index.docker.io/library/webapp:latest
Successfully built image webapp
```

きちんと実行もできました。めでたしめでたし。

```bash
$ docker run --rm -it -p "8000:8000" webapp
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

# まとめ

デフォルトのdistroless向けのPythonのビルダーないじゃん、からはじまってBuildpackのビルダーを一通り作ってみました。

ドキュメントだと、既存のbuilderにbuildpackを足す、みたいな説明になっていました。builderはbuildpackの集合体、と見せつつ、buildpackをパッケージ化するにはビルダーが必要で、じゃあ新しい出力先Dockerイメージを指定したい場合、相互参照じゃん、と思いましたが、必要なのはIDだけだったので、ここで書いた通りの順番に取り組めばまったく新しいイメージファイルを使ったイメージが作りやすくなったかな、と思います。

ちなみに、これを書いた後に気づいたのですが、公式のチュートリアル、Pythonのbuildpackの作成だったんですね。

https://buildpacks.io/docs/reference/spec/buildpack-api/

まあ、スタックのイメージの作成とかも含めて、まるっとビルダーを作る説明は公式を読んでも情報がたりず、ソースコードを解析しながら試したりもしました。現時点で世界で一番詳しいガイドになっているんじゃないかと思います。

今回はシェルスクリプトを使いましたが、公式のbuildpackはGoで書かれたものもあります。後から、せっかくならPythonあたりで書いてもよかったな、と思いました。いろいろ大掛かりで複雑に見えますが、引数で渡されたフォルダの中に成果物を置いて、設定ファイルを書き出すだけなので、ビルド用イメージで使える言語であれば問題なく利用できるはず。

アドバンスな使い方というと、キャッシュ周り、または公式のbuildpackのように、複数のbuildpackが連携してアーティファクトを作る、みたいな多段構成あたりですね。そのうち書くかもしれません。

