---
title: "declare使ってBashで配列と連想配列"
date: 2021/04/01 00:00:00
postid: ""
tag:
  - ShellScript
category:
  - Infrastructure
thumbnail: /images/20210401/thumbnail.png
author: 市川諒
lede: "過去Shell Scriptでゴリゴリスクリプトを書いたりしていましたが（環境が許せば）Pythonで書くことが個人的に増えてきました。いざShell Scriptに戻ってきたときに配列と連想配列について調べ直すコトがままあったので、ここに記したいと思います。"
---

<img src="/images/20210401/アイキャッチ.webp" alt="" title="Marcel LangthimによるPixabayからの画像">

## はじめに

こんにちは、TIGの市川です。[シェルスクリプト連載](/articles/20210321/)の4日目です。

過去Shell Scriptでゴリゴリスクリプトを書いたりしていましたが（環境が許せば）Pythonで書くことが個人的に増えてきました。いざShell Scriptに戻ってきたときに配列と連想配列について調べ直すコトがままあったので、ここに記したいと思います。

## declareとは
昨今Declarative programmingやらDeclarative APIやら、IT界隈でも形容詞で登場する単語ですが、Linuxのコマンドでdeclareというと変数を宣言する為のコマンドになります。

Shell Scriptではご存じの通り特に変数を宣言せずとも利用可能ですが、このコマンドとともに宣言すると色々な恩恵を受けることができます。

```bash
# オプションなしだと普通の変数と同じように使える
A="variable"
declare B="variable"
echo non_declarative: ${A}
echo declarative: ${B}

# [出力]
non_declarative: variable
declarative: variable
```

### declareのオプション

| オプション | 説明 |
| ---- | ------------------------------------------------------------ |
| -a   | 変数を配列として定義する                                     |
| -A   | 変数を連想配列として定義する                                 |
| -i   | 変数を数値用に定義する（文字列などは代入不可になる）         |
| -l   | 変数から取得される値を常に小文字にする                       |
| -u   | 変数から取得される値を常に大文字にする                       |
| -n   | 変数を名前参照として定義する（シンボリックリンクのようなもの） |
| -r   | 変数を定数として定義する（readonlyな変数となり、定義時に値を格納する） |
| -x   | 変数を環境変数として定義する（定義したタイミングでexportされる） |

語り出してしまうとボリュームがそこそこになってしまうので、オプションの中の配列と連想配列について以降触れていきたいと思います。

## Shell Scriptで配列

「declareで」といいながら実は配列はdeclareで宣言せずとも使えたりします。
ですが、せっかくなので宣言して使います。

- コード

```bash
# データをSplitして配列を作る
data="a b c 1 2 3"

# declareする（初期値は後からでも格納可能）
declare -a list_declarative=(${data// / })

echo "================== Output =================="
echo "# すべての値の出力"
echo ${list_declarative[@]}
echo ${list_declarative[*]}

echo "# 要素指定して出力"
echo ${list_declarative[0]}

echo "# 要素を削除"
unset list_declarative[0]
echo ${list_declarative[@]}

echo "# 要素を追加（prepend, append）"
list_declarative=("a" "${list_declarative[@]}")
list_declarative=("${list_declarative[@]}" "4")
echo ${list_declarative[@]}

echo "# 要素を上書き"
list_declarative[2]="hoge"
echo ${list_declarative[@]}

echo "# 要素数を確認"
echo ${#list_declarative[@]}

echo "# 値が存在するINDEXの一覧を確認"
echo ${!list_declarative[@]}

echo "# 添字の@と*の違い（ダブルクオートで囲ったときの動作が異なる）"
echo "# 添字が@の場合は各要素が個別に出力される"
for v in "${list_declarative[@]}"
do
    echo "$v"
done

echo "添字が*の場合は各要素がIFSの最初の1文字で結合されて出力される"
IFS=,
for v in "${list_declarative[*]}"
do
    echo "$v"
done
```

- 出力

```
================== Output ==================
# すべての値の出力
a b c 1 2 3
a b c 1 2 3
# 要素指定して出力
a
# 要素を削除
b c 1 2 3
# 要素を追加（prepend, append）
a b c 1 2 3 4
# 要素を上書き
a b hoge 1 2 3 4
# 要素数を確認
7
# 値が存在するINDEXの一覧を確認
0 1 2 3 4 5 6
# 添字の@と*の違い（ダブルクオートで囲ったときの動作が異なる）
# 添字が@の場合は各要素が個別に出力される
a
b
hoge
1
2
3
4
添字が*の場合は各要素がIFSの最初の1文字で結合されて出力される
a,b,hoge,1,2,3,4
```

## Shell Scriptで連想配列
連想配列を使う場合はdeclareが必須となっています。また、Bashであればversion4以降で利用可能です。

Pythonでいう辞書などと同様に、格納した順番は担保されません。

- コード

```bash
# declareする（初期値は後からでも格納可能）
declare -A dict_declarative=([item_name]="Orange" [price]=100)

echo "================== Output =================="
echo "# すべての値の出力"
echo "${dict_declarative[@]}"
echo "${dict_declarative[*]}"

echo "# 要素指定して出力"
echo "key = ${dict_declarative[item_name]}"
echo "val = ${dict_declarative[price]}"

echo "# 要素を削除"
unset dict_declarative[item_name]
echo ${dict_declarative[@]}

echo "# 要素を追加（新規）"
dict_declarative[item_name]=Apple
echo ${dict_declarative[@]}

echo "# 要素を追加（上書き）"
dict_declarative[price]=120
echo ${dict_declarative[@]}

echo "# 要素数を確認"
echo ${#dict_declarative[@]}

echo "# キーの一覧を確認"
echo ${!dict_declarative[@]}
```

- 出力

```
================== Output ==================
# すべての値の出力
Orange 100
Orange,100
# 要素指定して出力
key = Orange
val = 100
# 要素を削除
100
# 要素を追加
Apple 100
# 要素を上書き
Apple 120
# 要素数を確認
2
# キーの一覧を確認
item_name price
```

## bashの辞書で多次元配列
さて、ここで少々（個人的に）致命的な問題があるのですが、bashの配列・連想配列は1次元しか扱えないという点です。
他言語だとしれっと使えてしまうので、「えっ、なんで！？」となりがちですが、多次元配列「的な」ものを作ることでそれっぽい処理は可能です。

> 例えばPythonだとさらっと配列に辞書を含めるとかやりがち

- コード

```python
# Pythonでの配列内に連想配列がある場合の例
from pprint import pprint

names = ['Alice', 'Bob', 'Mike']
positions = ["Engineer", "Manager", "Developper"]

people = [ {"name": name, "position": position} for name, position in zip(names, positions) ]

pprint(people)
```

- 出力

```bash
[
   {'name': 'Alice', 'position': 'Engineer'},
   {'name': 'Bob', 'position': 'Manager'},
   {'name': 'Mike', 'position': 'Developper'}
]
```

bashの場合、多次元配列や配列内に連想配列を含められないため、KeyにIndexを持たせてしまうというハックがあります。

試しにCSVを読み込んで連想配列としつつ、一部ロジックを組み込んだ例を挙げます。従業員の今年度評定を基に翌年度の新給与を決めるロジック（的な）ものを処理します。


- テスト用CSV（氏名, 年齢, 役職, 今年度評定）

```csv
Angela,29,Engineer,1800,A
Ivory,35,Manager,3000,A
Raeann,31,SeniorEngineer,2000,AA
Violante,21,Assistant,1600,AAA
```

- コード

```bash
FILEPATH="test.csv"

declare -A USER_DICT

i=0
while IFS=, read name age position salary evaluation; do
    # keyにIndexを付与することで擬似的に多次元の配列に入れたような扱いとする
    USER_DICT[${i},name]=${name}
    USER_DICT[${i},age]=${age}
    USER_DICT[${i},position]=${position}
    # 評定に応じて給与を1.x倍する
    # bashは少数の四則演算に対応していないためawkを使って演算する
    case "${evaluation}" in
        "A")
            USER_DICT[${i},salary]=$(echo ${salary} | awk '{printf "%4.0f", $1*1.0}');;
        "AA")
            USER_DICT[${i},salary]=$(echo ${salary} | awk '{printf "%4.0f", $1*1.1}');;
        "AAA")
            USER_DICT[${i},salary]=$(echo ${salary} | awk '{printf "%4.0f", $1*1.3}');;
    esac
    let i++
done < ${FILEPATH}

idx=$((${i}-1))

for i in $(seq 0 ${idx}); do
    echo ${USER_DICT[${i},name]} ${USER_DICT[${i},salary]}
done
```

- 出力

```
Angela 1800
Ivory 3000
Raeann 2200
Violante 2080
```

連想配列使うまでもないのですが、読み込んだ値からその後様々な処理をすることを考えると、連想配列は非常に扱いやすいため、覚えておいて損はないと思っています。
もし、Key, Value形式で値を持ちたい、使い回したいのであればオススメの実装です。

## まとめ

ということで今更ながらではありますが、bashの配列と連想配列についておさらいをしました。

個人的には文字列操作でなんとかなる領域を超えたら可読性や拡張性からPythonやGoなどを使うべし、と考えています。
ただし、現状もPython2.x系がデフォルトのOSがあったり、Goとか新規言語をインストールできない！などの制約があったり、bashでどうしても書かねばならないときにそっと頭の片隅においていただけると幸いです。

[シェルスクリプト連載](/articles/20210321/)の4日目でした。明日は澁川さんの[シェルスクリプトでもGUI](/articles/20210402/)です！

