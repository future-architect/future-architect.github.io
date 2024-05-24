---
title: "Engineer Camp2021: Python の AST モジュールを使ってクラス構造を可視化する"
date: 2021/10/19 00:00:00
postid: a
tag:
  - Python
  - 静的解析
  - 構文解析
  - コアテク
  - インターン
  - インターン2021
category:
  - Programming
thumbnail: /images/20211019a/thumbnail.PNG
author: 空閑康太
lede: "こんにちは、Future のインターン Engineer Camp に参加した空閑です。今回のインターンではソースコード静的解析システムの開発に取り組みました。そこで本記事では、開発内容の一部である、Python の AST モジュールを使ったクラス構造の可視化について紹介します。Python の環境構築については以下を参考にしました。[サーバーアプリ開発環境"
---
# はじめに
こんにちは、Future のインターン Engineer Camp に参加した空閑です。[Python連載](/articles/20210927b/)の9本目です。

今回のインターンではソースコード静的解析システムの開発に取り組みました。そこで本記事では、開発内容の一部である、Python の AST モジュールを使ったクラス構造の可視化について紹介します。

Python の環境構築については以下を参考にしました。

* [サーバーアプリ開発環境(Python／FastAPI) - Future Tech Blog](/articles/20210611a/)

また、本記事で出てくる AST については下記を参照ください。言語やパーサは違いますが基本的な考え方は同じです。

* [ANTLRを業務で活用した話 - Future Tech Blog](/articles/20200903/)

# Python の AST モジュール
Python では AST（抽象構文木）を扱うモジュールが[標準ライブラリ](https://docs.python.org/ja/3/library/ast.html)として提供されています。まずは試しに、適当なソースコードの AST を取得してみます。

```py target.py
class Button:
    def __init__(self):
        self.pushed = False

    def push(self):
        self.pushed = not self.pushed
```

```py
import ast
with open("target.py", "r", encoding="utf-8") as f:
    source = f.read()
    tree = ast.parse(source=source)
    print(ast.dump(tree, indent=4))
```

<details>
  <summary>出力結果（長いので折り畳み）</summary>
  <div>

  ```
Module(
    body=[
        ClassDef(
            name='Button',
            bases=[],
            keywords=[],
            body=[
                FunctionDef(
                    name='__init__',
                    args=arguments(
                        posonlyargs=[],
                        args=[
                            arg(arg='self')],
                        kwonlyargs=[],
                        kw_defaults=[],
                        defaults=[]),
                    body=[
                        Assign(
                            targets=[
                                Attribute(
                                    value=Name(id='self', ctx=Load()),
                                    attr='pushed',
                                    ctx=Store())],
                            value=Constant(value=False))],
                    decorator_list=[]),
                FunctionDef(
                    name='push',
                    args=arguments(
                        posonlyargs=[],
                        args=[
                            arg(arg='self')],
                        kwonlyargs=[],
                        kw_defaults=[],
                        defaults=[]),
                    body=[
                        Assign(
                            targets=[
                                Attribute(
                                    value=Name(id='self', ctx=Load()),
                                    attr='pushed',
                                    ctx=Store())],
                            value=UnaryOp(
                                op=Not(),
                                operand=Attribute(
                                    value=Name(id='self', ctx=Load()),
                                    attr='pushed',
                                    ctx=Load())))],
                    decorator_list=[])],
            decorator_list=[])],
    type_ignores=[])
```

  </div>
</details>



`ast.parse` にソースコードを渡すことで AST が得られます。実際には、ツリーの根を表すAST ノードを取得することになります。`ast.dump` は引数に AST ノードを取り、そのノードを根とするツリーを、フォーマットした文字列として返します。

では次に、AST をたどって特定のノードに反応するコードを書いてみます。`ast.NodeVisitor` は AST をトラバースするための基底クラスで、このクラスを継承して独自の処理を追加します。これは Visitor パターンとなっているため、クラスごとに `visit_{class_name}` のメソッドを用意していきます。例えば、ソースコード内で定義されている関数名を列挙するためには、関数定義を表すノード `ast.FunctionDef` に反応する `visit_FunctionDef` メソッドを作成し、その中で関数名を表す `ast.FunctionDef.name` を参照します。

```py
class MyNodeVisitor(ast.NodeVisitor):
    def visit_FunctionDef(self, node: ast.FunctionDef):
        print(node.name)
        self.generic_visit(node)

with open("target.py", "r", encoding="utf-8") as f:
    source = f.read()
    tree = ast.parse(source=source)
    MyNodeVisitor().visit(tree)
```

```py
__init__
push
```

`visit_{class_name}` を定義することで、`ast.{class_name}` のノードを訪れたときのみ実行されるメソッドが作成できます。また、以下の引用のように `self.generic_visit()` を省略してしまうと、そのノードの子ノードは訪れることができないので注意してください。
> 注意して欲しいのは、専用のビジター・メソッドを具えたノードの子ノードは、このビジターが generic_visit() を呼び出すかそれ自身で子ノードを訪れない限り訪れられないということです。
https://docs.python.org/ja/3/library/ast.html#ast.NodeVisitor.generic_visit

# ツール概要
今回の目標は、パッケージ・モジュール・クラスをノードとする図のようなツリーの作成です。パッケージとモジュールはディレクトリ構造にしたがってつなぎ、モジュールの下にはその中で定義されているクラスをつなぎます。作成にあたり、モジュール違いの同名クラスなどが出現することに注意します。

<img src="/images/20211019a/graph_sample.PNG" alt="graph_sample.PNG" width="1036" height="661" loading="lazy">


AST はディレクトリ構造までは表現しないため、今回は以下の手順で解析を行います。

1. Node 定義
2. ディレクトリ構造解析
3. クラス定義解析
4. Graphviz で可視化

## 1. Node 定義
解析する前に準備として `Node` クラスを定義しておきます。これを可視化するツリーのノードと一対一で対応させます。そして `Node` を継承した `NodePackage`, `NodeModule`, `NodeClass` を定義し、可視化に必要な情報を保持しておきます。今回はノードの識別に最小限必要なパスおよびクラス名を保持しました。これらはグラフのラベル等に使用します。

```py node.py
from __future__ import annotations
import ast
import os
from typing import Optional


class Node:
    def __init__(
        self,
        path: Optional[str] = None,
        parent: Optional[Node] = None,
        obj_name: Optional[str] = None,
    ):
        self.children: list[Node] = []
        self.parent: Optional[Node] = parent
        self.path: Optional[str] = path
        # Graphviz で可視化する際のラベル
        self.obj_name: Optional[str] = obj_name
        # obj_name をルートノードから順にドットで連結したもの
        if parent is None:
            self.obj_name_full: Optional[str] = obj_name
        else:
            self.obj_name_full = (
                f"{parent.obj_name_full}.{obj_name}"
                if parent.obj_name_full is not None
                else obj_name
            )


class NodeRoot(Node):
    def __init__(self):
        super().__init__()


class NodePackage(Node):
    """パッケージ情報を表現するノード"""

    def __init__(
        self,
        path: str,
        parent: NodeRoot | NodePackage,
    ):
        # obj_name はディレクトリ名
        super().__init__(path, parent, obj_name=os.path.basename(path))


class NodeModule(Node):
    """モジュール情報を表現するノード"""

    def __init__(self, path: str, parent: NodePackage):
        # obj_name はファイル名から拡張子を取り除いたもの
        super().__init__(
            path, parent, obj_name=os.path.splitext(os.path.basename(path))[0]
        )


class NodeClass(Node):
    """クラス情報を表現するノード"""

    def __init__(self, parent: NodeModule | NodeClass, node: ast.ClassDef):
        # obj_name はクラス名
        super().__init__(path=parent.path, parent=parent, obj_name=node.name)

```

## 2. ディレクトリ構造解析
探索対象のパス以下を再帰的に解析し、パッケージおよびモジュールのみのツリーを作成します。この時点では図のようなツリーが構築されています。

<img src="/images/20211019a/graph_sample_pre.PNG" alt="graph_sample_pre.PNG" width="665" height="421" loading="lazy">


```py tree.py
def create_module_tree(search_path: str, root: Optional[NodeRoot] = None) -> NodeRoot:
    """パスを再帰的にたどり、パッケージ・モジュールのみのツリーを作成

    Args:
        search_path (str): 対象ファイル・ディレクトリのパス
        root (NodeRoot, optional): ツリーのルート. Defaults to None.

    Returns:
        NodeRoot: ツリーのルート
    """

    def dfs(search_path: str, parent_node: Node):
        # 正規表現で検索
        for path in glob.iglob(search_path):
            # 絶対パス
            abspath = os.path.abspath(path)
            # パッケージ
            if os.path.isdir(path):
                assert isinstance(parent_node, NodeRoot) or isinstance(
                    parent_node, NodePackage
                )
                node_package = NodePackage(abspath, parent_node)
                parent_node.children.append(node_package)
                for file in os.listdir(path):
                    dfs(f"{path}/{file}", node_package)
            # モジュール
            elif os.path.splitext(path)[1] == ".py":
                assert isinstance(parent_node, NodePackage)
                node_module = NodeModule(abspath, parent_node)
                parent_node.children.append(node_module)

    if root is None:
        root = NodeRoot()
    dfs(search_path, root)
    return root
```

## 3. クラス定義解析
各モジュールについて、クラス定義を解析していきます。`NodeModule` が指定するパスを読み込み、`visit_ClassDef` を実装した `ClassDefNodeVisitor` で処理します。また、`ClassDefNodeVisitor` には親ノードへのポインタを追加の情報として持たせています。`generic_visit` の前後で親ノードを入れ替えることで、クラス内クラスなども表現することができます。

```py tree.py
def create_definition_tree(root: NodeModule) -> None:
    """モジュール内のクラス定義のツリーを作成

    Args:
        root (NodeModule): モジュールノード

    Returns:
        NodeRoot: ツリーのルート
    """

    assert root.path is not None, "to pass type check"
    with open(root.path, "r", encoding="utf-8-sig") as f:
        try:
            source = f.read()
            tree = ast.parse(source=source)
            ClassDefNodeVisitor(root).visit(tree)
        except Exception as e:
            print(e, file=sys.stderr)


class ClassDefNodeVisitor(ast.NodeVisitor):
    def __init__(
        self,
        parent: NodeModule | NodeClass,
    ) -> None:
        super().__init__()

        self.parent = parent

    # クラス定義ノード到達時の処理
    def visit_ClassDef(self, node: ast.ClassDef):
        c_node = NodeClass(self.parent, node)
        self.parent.children.append(c_node)
        pre_parent = self.parent
        self.parent = c_node
        self.generic_visit(node)
        self.parent = pre_parent
```

## 4. Graphviz で可視化
詳細な実装はここにはあげませんが、実際に作成したツリーをトラバースしながら辺を張っていきます。同じラベルのノードはひとまとめにされてしまうので、異なるノードは異なる ID を持つように注意します。今回の実装では `obj_name_full` を ID として使うことができます。また、ノードの種類ごとに色を付けるのも良いでしょう。

# 解析結果
標準ライブラリの可視化結果を載せます。全体を載せるには大きすぎる（PDF で約 2 MB）ため、拡大しています。青がパッケージ、オレンジがモジュール、緑がクラスに対応しています。

<img src="/images/20211019a/graph_2.PNG" alt="graph_2.PNG" width="1200" height="187" loading="lazy">

図では `http` パッケージの下に、`server` モジュールがあり、その下にいくつかのクラスがあることが確認できます。実際、該当ディレクトリを見に行くと下図のようになっており、可視化できていることがわかります。
<img src="/images/20211019a/image.png" alt="image.png" width="1200" height="643" loading="lazy">

# さいごに
今回は AST モジュールを使ってクラス構造を可視化しました。紹介した実装は静的解析の基礎となる部分であり、機能追加によって、メソッドノードの追加や型情報、コールグラフなど、より高度な情報を可視化できます。興味を持った方はぜひ、この記事から静的解析を始めていただければと思います。

# インターンの感想
今回のインターンでは、プロジェクトの一員として開発に取り組みました。したがって、ミーティングやドキュメントなど、普段の個人開発ではほとんど発生しない、コミュニケーションの部分が特に重要に感じました。コミュニケーションによって文脈を共有することで、後に発生する意思決定や軌道修正などがしやすくなっていた気がします。その点では、毎日のミーティングや Slack での議論など、ご協力いただいた受け入れ先のプロジェクトの方々に感謝しています。

また、今回は静的解析ツールの開発に取り組みましたが、それでも linter や formatter など既存の静的解析ツールはかなり有用でした。デバッグにはもちろん、型ヒントやフォーマットを通してツール側からも文脈の共有が行えるため、コミュニケーションと併せてその重要性を感じました。今回のインターンは約一か月でしたが、より長期間で大規模なプロジェクトであれば、静的解析ツールはもはや必須といっても過言ではないと思います。

