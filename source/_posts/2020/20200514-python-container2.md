---
title: "仕事でPythonコンテナをデプロイする人向けのDockerfile (2): distroless編"
date: 2020/05/14 08:51:53
postid: ""
tag:
  - Python
  - Docker
  - コンテナビルド
category:
  - Infrastructure
thumbnail: /images/20200514/thumbnail.png
author: 澁川喜規
lede: "Goではそこそこ実績も増えつつある気がするdistroless。シェルが入っていないくて、ログインされることもなく安全というGoogle製のDockerイメージです。Python3はまだexperimentalですが、実は小さいと言われるalpine版よりも、イメージサイズが半分ぐらいだったりもします。distrolessでは3.7しかないので、3.7のイメージ同士の比較です。"
---

<img src="/images/20200514/top.png" alt="" width="1260" height="675" loading="lazy">


[前回のエントリー](/articles/20200513/)では、Debianベースの堅実な仕事向けのDockerイメージ作成方法について紹介しました。

Goではそこそこ実績も増えつつある気がするdistroless。シェルが入っていないくて、ログインされることもなく安全というGoogle製のDockerイメージです。Python3はまだexperimentalですが、実は小さいと言われるalpine版よりも、イメージサイズが半分ぐらいだったりもします。distrolessでは3.7しかないので、3.7のイメージ同士の比較です。

| イメージ | サイズ |
|-|-|
| python:3.7-alpine  | 96MB  |
| python:3.7-slim-buster  | 179MB  |
| python:3.7-buster  |  919MB |
| gcr.io/distroless/python3-debian10  | 52MB  |

なお、distrolessのイメージは2種類（3通りの名前）がありますが、Python 3.5はバグ修正はせず、セキュリティ修正のみでサポート期限が2020/9/13というステータスなので、本エントリーでは3.7の方のみを扱います。

* gcr.io/distroless/python3: Python 3.5.3
* gcr.io/distroless/python3-debian9: Python 3.5.3(上のイメージと同一)
* gcr.io/distroless/python3-debian10: Python 3.7.3

一応サンプル等もありますが、どれも1ファイルで構成されたサンプルスクリプトばかりです。前回のsite-packagesにコピーする方法を軽く試したところうまく動かず、シェルもpipもensurepipもないため、ビルドイメージにすることもできません。いろいろ調べた結果、使い方がわかったので、そのやり方を紹介します。

https://github.com/GoogleContainerTools/distroless/tree/master/examples/python3

# ベースイメージの組み合わせ

多少のイメージサイズによるコスト削減幅よりも、社員がビルドで苦労しない、残業代が減らせる、という方が仕事上は圧倒的にバリューとして大切なことが多いので、Debian版を最初に紹介しましたし、そこの価値は変わりません。しかし、セキュリティ上もうれしいというのであれば使わない手はありませんが、残念ながらすべてのケースに使えるわけではなさそうです。ベースイメージの組み合わせ別の使える例を紹介します。

| ビルドベースイメージ | 実行ベースイメージ | Pure Python | C拡張(wheelあり) | C拡張(wheelなし) |
|:-:|:-:|:-:|:-:|:-:|
| full版Debian | slim版Debian  | ○  | ○ | ○ |
| slim版Debian  | slim版Debian  | ○ | ○ | |
| slim版Debian  | distroless  | ○  | ○ | |
| (参考)Alpine  | Alpine  | ○  | ※1 | ※2 |

※1 manylinux1が動作せず、ソースビルドになる。apkでgcc等のインストールが必要
※2 apkでgcc等のインストールが必要

Pythonの場合、多くのパッケージがバイナリwheelを提供してくれています。そのため、Cコンパイラのインストールや設定が大変なWindowsであっても、昔からPythonユーザーはネイティブコードを使ったライブラリの恩恵に授かりやすく、環境構築も短時間で完了していました。「ライブラリのビルドが難しい」みたいな話は僕はPythonではほとんど聞いたことがありません。そのため、distrolessを使うチャンスはもしかしたら結構多いかもしれません。しかし、前回紹介したuwsgiはコンパイルが必要なので難しいです。

コンパイルが必要なパッケージをビルドしても、libpython3.7m.soが見つからない、みたいなエラーになってしまい、一筋縄ではいかなそうなのですよね（数日トライしたがいかなかった）。もし解決策を見つけた方はおしらせください。

# 敵を知り己を知れば百戦殆うからず

「前回のsite-packagesにコピーする方法を軽く試したところうまく動かなかった」と紹介しましたが、設定がもろもろ違うのですよね。このあたりを知っておかないと、いざdistrolessでトラブルが発生したときに解決に時間がかかると思うので（実際かかった）、どんな感じか調査結果をまとめておきます。

## シェルがない

まずシェルがないので、通常のDockerはENTRYPOINTがシェルで、CMDに実行されるコマンドを書く、というのが通例ですが、distrolessはCMDがpython3です。CMDにはPythonの処理系で処理できるコードを渡さなければなりません。イメージのlatest（デフォルト）ではなく、debugタグ（イメージ名の末尾に``:debug``をつける）と、busyboxのシェルが有効になりますが、あくまでもデバッグ用途ですね。

## PythonのパスなどがDebian版と違う

通常、`sys.path`には`/usr/local/lib/python3.7/site-packages`といったパスがあり、pipでグローバルにインストールしたパッケージはそこに入ります。しかし、そもそもそのようなパスがなく、`sys.path`にも格納されていません。まず、Pythonの位置からして`/usr/local/lib`ではなく、`/usr/lib`でした。

```py sys.path
['/app', '/usr/lib/python37.zip', '/usr/lib/python3.7', '/usr/lib/python3.7/lib-dynload']
```

Pythonのパッケージの置き場をsiteパッケージで確認したところ、site-packagesはDebianのシステムPython風のdist-packagesで、ユーザーは別のところですね。

```python
>>> import site
>>> print(site.getsitepackages())
['/usr/local/lib/python3.7/dist-packages', '/usr/lib/python3/dist-packages', '/usr/lib/python3.7/dist-packages']
>>> print(site.getusersitepackages())
'/root/.local/lib/python3.7/site-packages'
```

ちなみに、python:3.7-busterだとこんな感じ。distrolessで動いているのはシステムPythonで、ユーザーランドで動かす用のPythonではなさそう。

```python
>>> import site
>>> site.getsitepackages()
['/usr/local/lib/python3.7/site-packages']
```

## aptコマンドもない

シェルがないため、何か追加のパッケージを入れようとしても、Dockerの枠組みの中ではいろいろやるのが困難です。もともとdistrolessはDockerで作られたのではなく、Bazelで作られているイメージですし、aptでライブラリやツールを入れるなど、凝ったことをする必要がある場合はBazelでイメージをビルドする必要があります。

https://github.com/GoogleContainerTools/distroless/blob/master/examples/python3/BUILD

本エントリーでは、みんなが慣れているDockerの範囲内で説明するのでひとまずご安心ください。

ここまでわかったので、駒を進めます。

# Pure Pythonなアプリを動かす

前回のDjangoウェブアプリを題材にして進めます。uwsgiはうまくいかなかったので、Pure Pythonでこちらも人気の高いgunicornを使います。requirements.txtは次のようになります。

```txt requirements.txt
django
gunicorn
```

`pip install -r requirements.txt`で依存ライブラリと一緒にインストールした後に、requirements.lockを作ります。前回と同じですね。

```shell
$ pip freeze > requirements.lock
```

Dockerfileは次のようになりました。どうせCコンパイルが必要なC拡張は利用できないため、ベースイメージをslim版にしていますが、それ以外のビルドステージは変化ありません。

```Dockerfile Dockerfile
# ここはビルド用のコンテナ
FROM python:3.7-slim-buster as builder

WORKDIR /opt/app

COPY requirements.lock /opt/app
RUN pip3 install -r requirements.lock

# ここからは実行用のコンテナ
FROM gcr.io/distroless/python3-debian10 as runner

COPY --from=builder /usr/local/lib/python3.7/site-packages /root/.local/lib/python3.7/site-packages
COPY --from=builder /usr/local/bin/gunicorn /opt/app/mysite/gunicorn

COPY mysite /opt/app/mysite

WORKDIR /opt/app/mysite

EXPOSE 8000
CMD ["gunicorn", "--workers=5", "--threads=2", "--capture-output", "--bind=0.0.0.0:8000", "mysite.wsgi"]
```

実行のポイントとしては、モジュールのコピー先を`/root/.local/lib/python3.7/site-packages`にしている点です。gunicornのスクリプトもPythonプログラムとして実行するのでパスが通っている必要がないため、アプリのワークフォルダにコピーしています。gunicornの設定は大量にあるのですが、とりあえずワーカー数（コア数n * 2 + 1が良いらしい)を増やしたり、スレッドを増やしています。また、コンソールをDockerのログ出力に出すようにしています。

これでPure Pythonのパッケージも動きました。

## manylinux1なwheelは動作するか？

せっかくなのでこちらも試してみましたこれの有無でできることがかなり変わってきますので。画像処理パッケージのPillowを使ってみます。requirements.txtに一行追加して、reuirements.lockを更新します。

```:requirements.txt
django
gunicorn
Pillow
```

Djangoのサンプルの最初まで実装したものだったので、`mysite/polls/views.py`にイベントハンドラがいると思うので、そこに画像を返すハンドラを足します。

```py mysite/polls/views.py
from django.shortcuts import HttpResponse
from PIL import Image, ImageDraw

def future(request):
    image = Image.new("RGB", (500, 300), "white")
    draw = ImageDraw.Draw(image)

    draw.line((150, 170, 450, 50), fill=(214, 0, 75), width=10)
    draw.line((50, 220, 350, 120), fill=(214, 0, 75), width=10)

    response = HttpResponse(content_type="image/png")
    image.save(response, "PNG")
    return response

def index(request):
    return HttpResponse("Hello World")
```

ハンドラを呼べるようにurls.pyにも追加します。

```py mysite/polls/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('future', views.future, name='future logo'),
]
```

再びDockerイメージをビルドして実行してみます。

```sh
$ docker build -t pytest .
$ docker run -it --rm -p "8000:8000" pytest
```

うまくいきました。manylinux1であれば、distrolessでも動作することが確認できました。機械学習系もそこそこいけるんじゃないでしょうか？

<img src="/images/20200514/1.png" alt="フューチャーのロゴ画像を表示したブラウザ" widht="1684" height="1202" loading="lazy" class="img-middle-size">


# まとめ

ちょっと癖があるけど、muslのような性能の劣化もなく、ビルド時間もDebian系と変わらず（一応Debian10なので）、Alpineよりも小さく、シェルがなくてセキュアなdistroless/python3を使う方法を紹介しました。

なお、このエントリーの調査過程でdistroless/python3にはmanなどの使われない（シェルもないので）ドキュメントファイルが1.6MBほど入っていることがわかり、それを[報告](https://github.com/GoogleContainerTools/distroless/issues/508)しつつ、PRを用意していたのですが、ビルドエラーが発生→[Debianの配信サーバーのバグ？](https://github.com/GoogleContainerTools/distroless/issues/509)と大事になってきています。本当はサイズをさらに小さくしました、とかっこよく報告できればよかったんですけどね。

前回の記事である [仕事でPythonコンテナをデプロイする人向けのDockerfile (1): オールマイティ編](/articles/20200513/) を未読の方は合わせて確認ください。
