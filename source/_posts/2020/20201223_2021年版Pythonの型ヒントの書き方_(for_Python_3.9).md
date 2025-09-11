---
title: "2021年版Pythonの型ヒントの書き方 (for Python 3.9)"
date: 2020/12/23 00:00:00
postid: ""
tag:
  - Python
  - PyCharm
  - VSCode
  - ジェネリクス
  - Mypy
category:
  - Programming
thumbnail: /images/2020/20201223/thumbnail.png
author: 澁川喜規
lede: "Pythonに型ヒントが入ってからしばらく経ちます。型ヒントの立ち位置も、なんでもできるアノテーションとして導入されましたが、型ヒント以外の用途はあまり育たず、型ヒントが中心になり、PEPや仕様もそれに合わせて変化したり、より書きやすいように機能が追加されてきました。本エントリーでは、Python 3.9時点での最新情報を元に、現在サポート中のPythonバージョン（3.6以上）との互換性の情報も織り交ぜながら、最新の型ヒントの書き方を紹介します。"
---
Pythonに型ヒントが入ってからしばらく経ちます。型ヒントの立ち位置も、なんでもできるアノテーションとして導入されましたが、型ヒント以外の用途はあまり育たず、型ヒントが中心になり、PEPや仕様もそれに合わせて変化したり、より書きやすいように機能が追加されてきました。

本エントリーでは、Python 3.9時点での最新情報を元に、現在サポート中のPythonバージョン（3.6以上）との互換性の情報も織り交ぜながら、最新の型ヒントの書き方を紹介します。

本エントリーの執筆には、Pythonの型の有識者の[@moriyoshi](https://twitter.com/moriyoshit)、[@aodag](https://twitter.com/aodag)、[@tk0miya](https://twitter.com/tk0miya) にアドバイスをもらいました。ありがとうございます。

# 環境構築

## Visual Studio Code

Visual Studio Codeの場合は、事前にどのインタプリタを利用するかを設定しておきます。その環境にインストールします。venvを使うにはvenvPathを設定します。

```json .vscode/settings.json
{
    "python.venvPath": "${workspaceFolder}/.venv"
}
```

mypyを有効にします。デフォルトの動作だと、型付けをしていない関数内部のチェックがされないので、``--check-untyped-defs``をつけたり、より厳しい``--strict``をつけたりすると良いでしょう。

```jsonc .vscode/settings.json
{
    "python.linting.mypyEnabled": true,
    "python.linting.enabled": true,
    "python.linting.mypyArgs": [
        "--ignore-missing-imports",
        "--follow-imports=silent",
        "--show-column-numbers",
        "--check-untyped-defs" // 追加
    ]
}
```

必要な追加パッケージのインストールが実行されますが、3.9特有の機能はまだPyPIにリリースされている安定版の0.790では対応していません。masterブランチにはいくつかの機能が実装済みなので、0.800リリースまでは最新の開発版をインストールしましょう。

```bash
git clone https://github.com/python/mypy.git
cd mypy
git submodule --update init
python setup.py install
```

## PyCharm

PyCharmはPythonインタプリタ(IntelliJ IDEA Ultimateを使っている場合はSDK設定で追加)の設定をすればmypyのインストールは不要です。

<img src="/images/2020/20201223/スクリーンショット_2020-12-20_10.30.58.png" alt="IntelliJ IDEA Ultimateを使っている場合はSDK設定で追加の様子" loading="lazy">

# 変数の型の型付け

変数名の後ろにコロンと型を付与することで型をつけられます。

```py 変数の型付け
i_love_python: bool = True

# 代入を後回しにしてもよい
i_love_python: bool
i_love_python = True
```

以前はPythonのコメントの中に記入していましたが、Python 3.5はすでにEOLなので、PyPIで配布されるライブラリ開発者ももう上記の書き方に統一しても問題ないでしょう。

```py 古い書き方
# Python 3.5以前の書き方
i_love_python = True # type: bool
```

# 関数やメソッドの型付け

関数やメソッドは引数リストと返り値の情報を付与できます。返り値がない場合は``-> None``（あるいは``typing.NoReturn``）をつけます。

```py 関数の型付け
def greeting(name: str) -> str:
    return f'Hello Guido, my name is {name}'

greeting(10) # エラー

# 返り値がない場合は-> Noneをつける
def show_python_version() -> None:
    print(sys.version)
```

mypyは``--check-untyped-defs``オプションが付与されていない場合、``-> None``が付いてない関数は型付けされていないとみなしてエラーチェックしません。返り値がない関数でも忘れずにつけるようにしましょう。PyCharmであれば警告は表示されます。

```py
# mypyは返り値宣言されてない関数の中のエラーはチェックしない
def main():
    greeting(10) # エラーにならない
```

# ユーザー定義クラスの型つけ

クラスは乱暴にいってしまえば、変数と関数を固めたものであるので、これまで説明してきた要素でほぼ説明できます。

```py クラスの型付け
class UnidentifiedMysteriousAnimal:
    """
    未確認生物クラス
    """

    name: str = "unknown" # デフォルト値
    country: str
    year: int

    def __init__(self, name: str, country: str, year: int) -> None:
        self.name = name
        self.country = country
        self.year = int

killerRabbit = UnidentifiedMysteriousAnimal("殺人ウサギ", "Great Britain", 1975)
```

なお、クラス変数を設定するには、 ``typing.ClassVar``を利用します。

```py
from typing import ClassVar

# classの中にこれを追加
    joke: ClassVar[bool] = true
```

# あらゆる型を受け付ける``Any``

型のある言語にはたいてい「あらゆる型のインスタンスを保持できるany型」があります。Pythonにも``typing.Any``があります。もちろん、なるべく静的に型を決めていき、``Any``が登場しないに越したことはないのですが、外部からやってくる情報をハンドリングするときなど、どうしても必要な``ことがあります。

```py
from typing import Any

user_input: Any
```

# 型よりも厳しく、特定の文字列や数値のリテラルのみを許可する

型ヒントというと、変数に代入できるオブジェクトの型を限定することが想像されますが、「文字列」ではなくて、「特定の文字列」「数値」ではなく、「特定の数値」など、特定のリテラルのみを保持できる制約を与えることができます。これにより、他の言語のenumのようなことが実現できます。

これはPython 3.8以降のみ対応していますが、PyPIの[typing-extensions](https://pypi.org/project/typing-extensions/)パッケージを利用すれば以前のバージョンでも利用できます。

```py リテラル
# Python 3.6, 3.7はpip install typing-extensionsが必要
try:
    from typing import Literal
except ImportError:
    from typing_extensions import Literal

train_type: Literal['各駅停車', '準急', '急行']

# この文字列は許可されているのでOK
train_type = '準急'

# この文字列は許可されていないのでエラー
train_type = '超特急'
```

# ジェネリクス

リストや集合の型付けを行うには、次のように``型名[要素の型]``、辞書は``dict[キーの型, 値の型]``など、ブラケットで型変数の設定を行います。mypyは現在リリースされている0.790ではこの書き方はできないので、0.800の開発版が必要です。

```py Python3.7以降の書き方
# Python 3.9以降のみであればこの行は不要
from __future__ import annotations

my_favorite_pokemons: list[str] = ["フォッコ", "ルカリオ"]
```

Python 3.8以前はこのような書き方はできず、typingパッケージのものを利用していました。Python 3.9ではこの書き方はdeprecatedになります。Python 3.7とPython 3.8は```from __future__ import annotations```を先頭に記述すれば使えるようになります。2021年12月がEOLのPython 3.6は``__future__``を使った回避はできないため、Python 3.6をサポートするのであれば（広く公開するライブラリの場合など）、こちらの書き方が必要です。

```py Python3.6もサポートする場合の書き方
from typing import List

my_favorite_pokemons: List[str] = ["フォッコ", "ルカリオ"]
```

https://www.python.org/dev/peps/pep-0585/#implementation

新と旧で使うべきジェネリック型定義がどこにあるかは上記のPEPにまとまっています。大雑把にいえば、以前は``typing``パッケージがそのすべてを担っていましたが、Python 3.9以降は次のように各パッケージに分散されています。

* 実際にオブジェクトとして使う型そのものであれば、その型定義をそのまま利用
  * リスト、タプル、辞書などの``__builtins__``の要素であれば、``list``、``tuple``、``dict``など
  * ``collections``パッケージの各クラスであれば、``collections.deque``など
* iterable、callableなどのPythonのプロトコル関係は``collections.abc``以下
* コンテキスト関係は``contextlib``、正規表現は``re``

例えば、コールバック用にcallableオブジェクトを関数引数に渡したり、インスタンス変数に保存したいとします。この場合は関数を受け取れる宣言は次のように``collections.abc.Callable``を使って書きます。型パラメータの最初は引数の型のリスト、後者は返り値です。

```py callableな引数の設定
import collections
from collections.abc import Callable

def wait_callback(cb: Callable[[str], None]) -> None:
```

古い環境は``typing.Callable``を代わりに使います。

```py 古い書き方
from typing import Callable

def wait_callback(cb: Callable[[str], None]) -> None:
```

## コレクションの種類の使い分け

``collections.abc``には多数の型があります。今までのコーディングで、これらを細かく区別して利用することは基本的になかったと思いますが、型付けを行うにあたっては、なるべく制約（メソッド）の少ないコレクションを選択する方がポータビリティが上がります。次の図は``collections.abc``および組み込み型のシーケンスの継承関係（実装上の継承ではなく、メソッドの包含で定義した）の図です。左に行くほど、少ないメソッドを持っており、右側に行くほど、メソッドが多くなります。関数の中で使用しているメソッドを見て、なるべくこの図の左側にある型を選んで使うと良いでしょう。

<img src="/images/2020/20201223/collections.png" alt="collections.abcおよび組み込み型のシーケンスの継承関係" loading="lazy">

例えば、関数の中で引数のシーケンスに対して、``for``でループを回すだけの使い方をするならば``collections.abc.Iterable``を、さらに``in``で存在確認をする必要があれば、``Collection``を使うと、さまざまなシーケンスのインスタンスを受けて利用できるようになります。ランダムアクセスが必要であれば``Sequence``を使います。値の変更が必要であれば``Mutable``がついた型を利用します。

例えば、引数の型を安易に``list``を指定してしまうと、``set``や``dict``を渡せなくなります。特に慣れているからといって安易に具象型（リスト、タプル、辞書、集合）を設定しない方が良いです。といっても、これらの具象型を使う方が理解はしやすいと思うので、まずはこの具象型を当てはめてみて、使う演算子やメソッドが少なくても済むことをを確認したら、少しずつ左側の型に寄せていくと良いかもしれません。

## タプルと他のシーケンスの違い

タプルは長さ情報まで固定ですので、要素数分、型を指定します。``tuple[int, str, float]``など、型を混ぜて指定もできます。一方、リストなどのシーケンスは要素内の全要素が同じ制約になります。1要素だけ設定すればシーケンスの長さによらず、利用できます。

```py
# Python 3.9の例

# 要素数があっているのでOK
t1: tuple[str, str, str] = ("空飛ぶ", "モンティ", "パイソン")

# こちらはあっていないのでNG
t2: tuple[str] = ("Monty", "Python's", "Flying", "Circus")

# リストは全要素が同じ型。1つだけ型定義すれば長さは自由
l: list[str] = ["Monty", "Python", "and", "the", "Holy", "Grail"]
```

タプルで同じ型の要素を任意長持つインスタンスに適合する型を書くには、ellipsis演算子（``...``)を使います。

```py
t: tuple[str, ...] = ("Monty", "Python's", "Flying", "Circus")
```

# 合併型（Union Type) / オプショナル

引数の型は常に1種類だけ、とは限りません。条件によって文字列や数字の両方を受け入れる関数を作りたいこともあります。

Python 3.10では文字列でも数字でもいい、という条件は次のように``|``を使って書きます。この記法も、mypy 0.790では対応せず、mypyのmasterブランチ版のインストールが必要です。

```py 合併型
def normalize_year(year: int | str) -> int:
```

Python 3.7から3.9であれば、``from __future__ import annotations``を記述すればこの記法が使えるようになります。

Python 3.6もサポートしたい場合は、旧式の``typing.Union``を利用して書きます。

```py 古い書き方
from typing import Union

def normalize_year(year: Union[int, str]) -> int:
```

合併型は同じ型のまま受け入れてくれる関数にそのまま渡す以外は、型を分解しなければ利用できません。``isinstance()``などで型のチェックを行うと、その条件を見て、ブロック内の型を絞ってくれます。

```py ロジック内で型を分離
def normalize_year(year: int | str) -> int:
    if isinstance(year, int):
        # ここではyearは数値
        return year
    else:
        # ここではyearは文字列
        if year.startswith("昭和"):
            return int(year[2:]) + 1925
        elif year.startswith("平成"):
            return int(year[2:]) + 1988
        elif year.startswith("令和"):
            return int(year[2:]) + 2018
    raise ValueError('unsupported style')

print(normalize_year('昭和55'))
```

合併型の1つの形として他の言語でいうnullable（未初期化がありえる）のような概念を表現するために、``typing.Optional``が提供されています。これは``None``との合併型と等価です。

```py Optionalの定義
from typing import Optional

age: Optional[int]
age = 18    # 数値を入れることもできる
age = None  # 年齢未回答も選択可能

# こうも書ける
age: int | None
```

# キャスト

合併型や``Any``など、型が一意に決まらない変数のうち、状況から、特定の型である確信がある場合、キャストを使って特定の型であると処理系に伝える方法が提供されています。本来なら、ifの条件分岐などを行う方法の方が実際の変数の値を見ての判断になりますが、緊急的な脱出ハッチとして利用可能です。

```py キャスト
from typing import cast

r = httpx.get('https://api.example.com')
if r.status_code == 200:
    # Anyからdict[str, str]に変換
    res = cast(dict[str, str], r.json())
```

# 関数のオーバーロード

複数の関数で、入力の型、および返り値の型が異なる関数を作りたいとします。その時に使うのがオーバーロードです。次の例は、画面表示のときの文字数を計算する関数です。入力の型のバリエーションが増える場合は合併型で対応できますし、返り値も合併型で書くことで、雑に対応は可能ですが、入力値の型によって返り値が決定される（例えば、``bool``の時は``bool``しか返らない）ことを表現するためにはオーバーロードを使う必要があります。

* ``@overload``を付与したスタブ定義を並べて書く。これはmypyなどの型チェック用の情報提供のためだけのもので、Pythonで実際には実行されるときは上書きされて消えるだけなので、実装はellipse演算子(``...``)や``pass``でよい
* 最後に``@overload``がつかない実際の実装を書く。これは入出力はオーバーロードしたすべてを受け入れる必要があるので``Any``を使うか、型を付けないで実装（mypyオプションに``--strict``をつけるとこれはエラーになるが）のどちらかで実装

次の関数は、JSON化にあたっての前処理を行う関数です。例えば、JavaScriptは``2**53``を超える数値は浮動小数点数になってしまうので、規格上は制約はないが実装的にintは入れられないものが多いので``float``変換するようにしています。

```py 関数のオーバーロード
# JSONに出力するのに安全な形式に変換

@overload
def json_safe(i: str) -> str:
    ...

@overload
def json_safe(i: bytes) -> str:
    ...

@overload
def json_safe(i: bool) -> bool:
    ...

@overload
def json_safe(i: int) -> Union[int, float]:
    ...

@overload
def json_safe(i: float) -> float:
    ...

def json_safe(i: Any) -> Any:
    if isinstance(i, (str, bool, float)):
        return i
    elif isinstance(i, int):
        if i >= 2 ** 53:
            return float(i)
        return i
    else:
        raise ValueError(f'length only support str and int, but {type(i)}')
```

# まとめ

ここ数年、バージョンアップのたびに大きく改善されてきた型ヒント。今回の3.9でも大きな変化がありました。一部、``from __future__``を使わないと3.10未満では使えない機能もありました。3.10でもさらに進展予定です。

ここでは紹介していない、細かい機能もいくつかあります。より詳細な情報は[typingパッケージ](https://docs.python.org/ja/3/library/typing.html)や、関連PEPを見ると書かれています。

また、[mypyのサイト](https://mypy.readthedocs.io/en/stable/)にあるcheatsheetも参考になると思います。
