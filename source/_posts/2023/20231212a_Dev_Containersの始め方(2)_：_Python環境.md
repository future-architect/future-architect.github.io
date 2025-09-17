---
title: "Dev Containersの始め方(2) : Python環境"
date: 2023/12/12 00:00:00
postid: a
tag:
  - Dev Containers
  - Python
  - VSCode
  - Docker
  - 環境構築
category:
  - DevOps
thumbnail: /images/2023/20231212a/thumbnail.png
author: 澁川喜規
lede: "Dev ContainersのPython環境を作っていきます。"
---
[前回のエントリー](/articles/20231206a/)では、Dev Containersの動作原理を理解したのでそれにあわせたPython環境を作っていきます。

# ベースの環境

まずリポジトリのフォルダを作ります。`python-dev`とします。

```shell
mkdir python-dev
cd python-dev
git init
```

ここをVSCodeで開き、Dev Containersの設定をしていきます。左下のリモートのボタンを押して **Add Dev Container Configuration Files...**　を選択します。

基本のPython3を選びます。公式を選んでおくのが吉。オプションでPythonバージョンを選びます。Apple Silliconは-busterついているのを選べって言ってますね。半年前にスクリーンショットを撮ったときは3.11までしかありませんでしたが、今は3.12も選べます。

<img src="/images/2023/20231212a/スクリーンショット_2023-04-17_20.53.40.png" alt="スクリーンショット_2023-04-17_20.53.40.png" width="787" height="226" loading="lazy">

Pythonのイメージをインストールすると、有名どころのツールはすでにインストール済みとなっていますこの辺りは特にインストールする必要はありません。

```bash
$ ls -1 /usr/local/py-utils/bin
autopep8
bandit
bandit-baseline
bandit-config-generator
black
blackd
dmypy
flake8
mypy
mypyc
pipenv
pipenv-resolver
pipx
py.test
pycodestyle
pydocstyle
pylint
pylint-config
pyreverse
pytest
stubgen
stubtest
symilar
virtualenv
yapf
yapf-diff
```

[ruff](https://docs.astral.sh/ruff/)など、ここにないツールはあとから入れる必要があります。ただし、Dev Containers以外の環境、たとえばWindowsやmacOSネイティブ環境でも検証したりテストしたいのであれば、必要なツールをインストールするようにpyproject.tomlに書いておいて、別途インストールするようにした方が良いでしょう。バージョンを合わせたりもしやすいですし。

# パッケージの管理方法を考える

Pythonで開発するときの開発環境作りをどうするか、というのは定期的に話題に上がるネタです。Python歴20年の経験からすると、最低限分離はするものの、必要以上の複雑な機構を持ち込まないのがコツだと考えています。特に経験が浅い人ほど、依存が複雑に絡まったツールを使うとトラブルシュートできません。情報が多く、なるべく公式に寄せる方がベストです。過去に2回ほどそういう記事を書きましたが、今でも変わりません。

* [pyenvが必要かどうかフローチャート(2016年)](https://qiita.com/shibukawa/items/0daab479a2fd2cb8a0e7)
* [サーバーアプリ開発環境(Python／FastAPI)(2021年)](https://future-architect.github.io/articles/20210611a/)

オプションがいくつか考えられます。が、ここではpoetryを使わずに、`pip isntall`がベストだと考えています。理由は長くなるので後述しますが、これを使うための追加のインストールは不要で、何らかの設定を入れずにVSCodeからも情報が取得できて良いことが多く、　Dev Containersを使わないローカル開発(.venv利用)とも操作が一致するからです。

## `pip install`以外の方法を選ばない理由(読み飛ばしOK)

標準のpipと、poetryで考えてみます。環境分離が2重にならずに、VSCodeからも設定いらずで参照できて、ワークフォルダを汚さなくて、普段のローカルと互換性のある都合の良い方法はありません。もちろん、VSCode参照をきちんと設定するとか、ワークフォルダのオプトアウトをきちんとするとか、ローカル開発ときちんと別のやり方を使い分けられるのであればどれもOKです。ですが、なるべく手間は減らしたいものです。

| 方式 | 環境分離 | VSCode参照 | インストール先 | ローカル互換 |
|:-|:-|:-|:-|:-|
| venv + pip  | 2重 | OK | $WORK/.venv | OK |
| venv + poetry (デフォルト)  | 2重 | NG | $HOME/.local/share/pypoetry | OK |
| venv + poetry (in-project true)  | 2重 | OK | $WORK/.venv | OK |
| pip + `--user` | 1重 | OK | $HOME/.local/lib | NG |
| pip | 1重 | OK | /usr/local/lib (権限がない場合`--user`にフォールバック) | NG(ローカルが.venvならOK） |
| poetry (virtualenvs.create = false) | 1重 | OK | /usr/local/lib  | NG |

* venvを利用するとDev Containersですでに環境分離がされているのに、2重に分離することになってしまいます。
* VSCode参照NGというのはVSCodeの設定を修正しないとインストールしたパッケージが見えないということを意味しています。
* インストール先は/usr/local/libだとsudoが必要です。また、ワーク以下へのインストールだとホスト側のファイルシステムとのボリューム同期をしないような設定を`devcontainer.json`に入れないと、余計なファイルアクセスが発生します。
* ローカル互換NGというのはローカルで実行するとプロジェクト間で共有する場所に入れてしまうので、通常はやるべきではない操作であることを意味しています。

実は`pip install`はインストール先に書き込み権限がなければ、`--user`をつけたのと同じ動作にフォールバックします。そうすると、venvでpip利用の場合と同じコマンドが使えますし、追加の設定も不要でVSCodeからも読めるので、一番これがベストであると考えられます。もっとも、毎回「Defaulting to user installation because normal site-packages is not writeable」とお小言を言われますが、デメリットはそれぐらいです。

Poetryが--user相当のオプションを用意してくれれば良かったのですがね。と思ったら[ちょうどこのユースケースについて議論されていま](https://github.com/python-poetry/poetry/issues/1214#issuecomment-1397088866)すね。みんな考えることは同じ。人類皆兄弟。

## pyproject.tomlを手書きする

初期のファイル作成と、パッケージの追加、パッケージ追加時のrequirements.txtの更新ぐらいの薄いツールがあれば便利だな、とも思うのですが、残念ながら今のところは見つけられませんでした。Python系のツールでも議論には上がっていますが、すぐに解決というわけにはいかなそうです。

* https://discuss.python.org/t/manually-adding-dependencies-to-pyproject-toml/18345
* https://github.com/pypa/hatch/discussions/437

そのため、手作業で作ってみることにします。

[Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml)といった拡張機能を入れると、JSON Schemaを使ってTOMLのバリデーションができます。これで多少は楽にpyproject.tomlが作成できます。インストールしてpyproject.tomlファイルを開いたら、右下のところからスキーマ選択を起動し、pyproject.jsonというのを選択します。これでOK。

<img src="/images/2023/20231212a/スクリーンショット_2023-11-21_20.56.27.png" alt="スクリーンショット_2023-11-21_20.56.27.png" width="932" height="323" loading="lazy">

大体、最小限だと内容的にはこんな感じかと思います。[PEP-0621の定義](https://peps.python.org/pep-0621/)やら[もっと大きなサンプル](https://github.com/python-jsonschema/jsonschema/blob/main/pyproject.toml)などもみつつ充実させていけば良いでしょう。

```toml pyproject.toml
[project]

name = "sample"
version = "1.0"
description = "hand written pyproject.toml sample"
authors = [
    {name="Yoshiki Shibukawa"},
    {email="yoshiki@shibu.jp"}
]
license = {file="LICENSE"}
readme = "README.md"

# pip install .
# でインストールする利用パッケージ
dependencies = [
    "django >= 4.2.7, < 5"
]

[project.optional-dependencies]

# pip install .[dev]
# でインストールする開発ツール類
dev = [
    "ruff >= 0.1.6, < 1"
]
```

devcontainer.jsonに以下のように書いておくと、起動のたびにパッケージを最新化してくれます。"postCreateCommand"を勧める記事なども見かけましたが、それだとイメージの再ビルドが必要になるので、こっちの方がよいかと思います。

```json .devcontainer/devcontainer.json
{
	"postStartCommand": "pip3 install --user .[dev]"
}
```

アプリ開発で必要なライブラリを追加するときは、pyproject.tomlのproject/dependenciesのリストに追加した後に、インストールしてlockファイル相当のrequirements.txtを作ります。このファイルはコンテナ作成やデプロイに使えます。このままだとdevセクションのものも入ってしまうのですが・・・このあたりもPythonツールチェーンが良くなって欲しいところの1つ。

```bash
pip3 install --user .
pip3 freeze --user > requirements.txt
```

プロジェクトの雛形ができたら開発ツール類を整備します。必要な拡張、あとは設定などはdevcontainer.jsonに書いておくと環境を作った瞬間にチーム内で同じ設定を共有できます。

```json .devcontainer/devcontainer.json
{
	"customizations": {
		"vscode": {
			"extensions": [
				"ms-python.python",
				"tamasfe.even-better-toml",
				"oderwat.indent-rainbow",
				"charliermarsh.ruff"
			],
			"settings": {
				"[python]": {
					"analysis.typeCheckingMode": "strict",
					"editor.formatOnSave": true,
					"editor.defaultFormatter": "charliermarsh.ruff",
					"editor.codeActionsOnSave": {
						"source.fixAll": true,
						"source.organizeImports": true
					}
				}
			}
		}
	}
}
```

## あえて別のプロジェクト管理ツールを使う

これまでの方法は全部手作りすることで、Docker/Dev Containersによる環境分離のみでなるべくシンプルにする方法でした。

一方で、Poetryや、最近話題のryeなどを使えば、pyproject.tomlが作成されますし、実際にインストールされたバージョンをrequirements.txtのような形式で出力してくれます。前に触れたように、Dockerの環境分離とvenvの環境分離が2重でかかってしまって無駄かな、とは思いますが、SimpleよりもEasyを優先したいケースもあるでしょうし、作り込まれたEasyはそれほど悪くはない、と思っています。

ryeを使う場合はdevcontainer.jsonのpostCreateCommandに次のコマンドを入れておきます。これでコンテナビルド時にryeがインストールされます。

```json .devcontainer/devcontainer.json
"postCreateCommand": "curl -sSf https://rye-up.com/get | 
   RYE_INSTALL_OPTION=\"--yes\" bash && echo 'source \"$HOME/.rye/env\"' >>
   ~/.bashrc"
```

別のプロジェクトツールはvenv環境を裏で自動で作りますが、このフォルダをどこに作るかは問題となります。ryeはワークフォルダ内に.vnevフォルダを作ります。これは作業場所ごとに独立しておくべきで、ホストとワークスペースで同期する必要がないフォルダです。ホストがmacやWindowsでゲストがLinuxのときに、Linuxバイナリをホスト側に戻す必要はないですからね。次のように、.venvを同期対象から外す設定を追加します。

```json .devcontainer/devcontainer.json
{
  "mounts": ["target=${containerWorkspaceFolder}/.venv,type=volume" ]
}
```

ここではryeを使いましたが、poetryなどでも同じように使えるでしょう。

# まとめ

他の人に開発環境を気軽に配れますし、その開発環境も自体も簡単にリビルドして更新できるのがDev Containersです。Pythonを例に使い方を紹介しました。

歴史が長いPythonの場合、環境分離の方法がいくつかあり、どれを選ぶかのトレードオフがあります。本エントリーでは、Dev Containersを唯一の環境分離手段として使い、モジュールは``pip install --user``でインストールする方法と、環境分離が二重がけになってしまい複雑になってしまうが、便利なryeの設定方法を紹介しました。

pyproject.tomlを手作りするあたりはこれからツールの進歩があればだいぶマシになるかと思いますが``setup.py``を手書きしていたのと比べて別に悪化はしてないし許容範囲かな、と思っています。まあ他の言語と比べていまいち、というのはわかりますが。
