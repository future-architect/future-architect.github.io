---
title: "Mypy と Pyright の解析手法と型情報の比較"
date: 2022/03/01 00:00:00
postid: a
tag:
  - Python
  - Mypy
  - Pyright
  - コアテク
  - 構文解析
category:
  - Programming
thumbnail: /images/20220301a/thumbnail.png
author: 空閑康太
lede: "Mypy や Pyright は Python の静的解析ツールとして有名ですが、これら二つに解析情報でどのような違いがあるのかわからなかったので、実験することにしました。Pyright は Mypy に比べて後発のプロジェクトですが、性能面で優れているなどとして徐々に注目を集めています。"
---

<img src="/images/20220301a/mypy.png" alt="" width="600" weihgt="376">

# はじめに

Mypy や Pyright は Python の静的解析ツールとして有名ですが、これら二つに解析情報でどのような違いがあるのかわからなかったので、実験することにしました。Pyright は Mypy に比べて後発のプロジェクトですが、性能面で優れているなどとして徐々に注目を集めています。

* https://github.com/python/mypy
* https://github.com/microsoft/pyright

解析以外での比較はこちらが参考になります。

* https://qiita.com/simonritchie/items/7492d1c1a3c13b2f27aa#%E4%BA%8B%E5%89%8D%E3%81%AEpyright%E3%81%AE%E8%BF%BD%E5%8A%A0

# 実験概要
Mypy、Pyright はともに `reveal_type(expr)` という機能があります。これを解析対象のコードに挿入すると、実行時点での `expr` の型情報を表示することができます。Mypy、Pyright の両者で同一コードに解析を行いその結果を比較します。以下、コード中ではコメントで `reveal_type` の結果を記録し、`reveal_type` 自体の記述は省略します。

## 実験 1: 再代入

```py Mypy
a = 10     # Revealed type is "builtins.int"
a = 'str'  # error: Incompatible types in assignment (expression has type "str", variable has type "int")
```

```py Pyright
a = 10     # Type of "a" is "Literal[10]"
a = 'str'  # Type of "a" is "Literal['str']"
```

`a` に型の違う値を再代入しています。

- Mypy は 1 行目の代入によって `a` の型を `builtins.int` に確定させるため、2 行目の代入は型の違いで失敗します。これは Python 本来の挙動とは異なりますが、暗黙の変換がないため型チェックの観点からは安全です。
- Pyright はリテラルを別の型に変換せず、リテラルのままで表現しています。また、代入によって型が変わっても、特別問題視はしないようです。

## 実験 2: オーバーライド

```py Mypy
class Parent:
    def hello(self) -> int:     # Revealed type is "def () -> builtins.int"
        return 0
    def override(self) -> int:  # Revealed type is "def () -> builtins.int"
        return 0

class Child(Parent):
    def override(self) -> str:  # error: Return type "str" of "override" incompatible with return type "int" in supertype "Parent"
        return "override"
```

```py Pyright
class Parent:
    def hello(self) -> int:     # Type of "Parent().hello" is "() -> int"
        return 0
    def override(self) -> int:  # Type of "Parent().override" is "() -> int"
        return 0

class Child(Parent):
    def override(self) -> str:  # Type of "Child().override" is "() -> str"
        return "override"
```

戻り値型の異なるメソッドをオーバーライドしています。Java などのオーバーライドはシグネチャの一致が求められますが、Python ではこのようなオーバーライドが可能です。Mypy では、`Child.override` はエラーになりますが、Pyright ではエラーになりません。

## 実験 3: 戻り値の型推論

```py Mypy
def func(a: int):  # Revealed type is "def (a: builtins.int) -> Any"
    return a       # Revealed type is "builtins.int"
```

```py Pyright
def func(a: int):  # Type of "func" is "(a: int) -> int"
    return a       # Type of "a" is "int"
```
引数の型から推論をすれば `func` は明らかに `(int) -> int` となりますが、Mypy は推論を行わないようになっており、戻り値の型が `Any` になります。

## 実験 4: 戻り値の型チェック

```py Mypy
def func(a: int) -> str:  # Revealed type is "def (a: builtins.int) -> builtins.str"
    return a              # error: Incompatible return value type (got "int", expected "str")
```

```py Pyright
def func(a: int) -> str:  # Type of "func" is "(a: int) -> str"
    return a              # error: Expression of type "int" cannot be assigned to return type "str" "int" is incompatible with "str" (reportGeneralTypeIssues)
```

実験 3 の関数に戻り値の型をヒントとして与えています。すると先ほどとは違い、両者ともエラーを出すようになりました。Mypy もヒントがある場合には推論して整合性のチェックを行うようです。

## 実験 5: タイプナローイング

```py Mypy
def func(flg: bool, i: int, j: str):  # Revealed type is "def (flg: builtins.bool, i: builtins.int, j: builtins.str) -> Any"
    if flg:
        a = i  # Revealed type is "builtins.int"
    else:
        a = j  # error: Incompatible types in assignment (expression has type "str", variable has type "int")
    return a   # Revealed type is "builtins.int"
```

```py Pyright
def func(flg: bool, i: int, j: str):  # Type of "func" is "(flg: bool, i: int, j: str) -> (int | str)"
    if flg:
        a = i  # Type of "a" is "int"
    else:
        a = j  # Type of "a" is "str"
    return a   # Type of "a" is "int | str"
```

if 文の分岐によって `a` の型が変わる例です。

- Mypy は 5 行目でエラーが出ました。実験 1 と同様に 3 行目で `a` の型が `builtins.int` に確定しているためです。
- Pyright はエラーが出ません。分岐ごとに `a` の型を独立に判断し、戻り値の段階ではこれらの和を取っています。このような技術は Pyright のドキュメント内で [Type Narrowing](https://github.com/microsoft/pyright/blob/main/docs/type-concepts.md#type-narrowing) として紹介されています。

## 実験 6: タイプナローイング（到達不能な分岐がある場合）

```py Mypy
def func(flg: bool, i: int, j: str):  # Revealed type is "def (flg: builtins.bool, i: builtins.int, j: builtins.str) -> Any"
    if flg:             # Revealed type is "builtins.bool"
        a = i           # Revealed type is "builtins.int"
    elif not flg:       # Revealed type is "builtins.bool"
        a = j           # error: Incompatible types in assignment (expression has type "str", variable has type "int")
    else:               # Revealed type is "builtins.bool"
        reveal_type(a)  # Revealed type is "builtins.int"
        pass
    return a            # Revealed type is "builtins.int"
```

```py Pyright
def func(flg: bool, i: int, j: str):  # Type of "func" is "(flg: bool, i: int, j: str) -> (int | str)"
    if flg:             # Type of "flg" is "Literal[True]"
        a = i           # Type of "a" is "int"
    elif not flg:       # Type of "flg" is "Literal[False]"
        a = j           # Type of "a" is "str"
    else:               # Type of "flg" is "Never"
        reveal_type(a)  # error: "a" is possibly unbound (reportUnboundVariable)
        pass
    return a            # Type of "a" is "int | str | Unbound"
```

実験 5 の if 文に到達しない分岐 (`else`) を追加します。

- Pyright では 6 行目で `flg` の型を `Never` としています。`bool` は `True` と `False` の 2 値しかないため、上 2 つの分岐で消費し、`else` 内に到達する `flg` は存在しないことを表しています。こちらも Pyright のドキュメント内で [Type Checking Concepts](https://github.com/microsoft/pyright/blob/main/docs/internals.md#type-checking-concepts) として紹介されています。


# 結論

Mypy と Pyright では型情報の用途が違う印象を受けます。Pyright は Python の挙動を極力トレースした上で、入力補完など利便性を高める機能に必要な情報を、型ヒントや型推論を用いて特定しているように見えます。対照的に、Mypy はヒントなしでの型の異なる代入を禁止するなど、Python とは異なる型システムを導入し、その中で厳密なコーディングを求めるような設計になっていそうです。個人的には、両者に優劣があるわけではなく、ユースケースによって使い分けが存在するという言い方がしっくりきています。

# 参考リンク

https://blog.abarabakuhatsu.com/changed_python_type_checking_tool_from_mypy
