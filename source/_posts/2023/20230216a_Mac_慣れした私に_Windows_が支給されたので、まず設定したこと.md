---
title: "Mac 慣れした私に Windows が支給されたので、まず設定したこと"
date: 2023/02/16 00:00:00
postid: a
tag:
  - Windows
  - キーバインド
  - Mac
  - ショートカット
  - 環境構築
  - AutoHotKey
category:
  - DevOps
thumbnail: /images/2023/20230216a/thumbnail.png
author: 棚井龍之介
lede: "これまでは Mac ユーザでしたが、Windows が支給されその利用を開始しました。Windows の環境整備として実施した内容を備忘録としての意味も込めてブログ化しました"
---
<img src="/images/2023/20230216a/top.png" alt="top.png" width="1200" height="676" loading="lazy">

# 目次

- はじめに
  - このブログを書いたきっかけ
- キーボードの購入・設定
  - 作業用キーボードの購入
  - キーボードの設定
    - 無変換/変換
    - zh, zj, zk, zl
    - caps lock + [H,F,B,P,N,A,E]
- ランチャーアプリの設定
- その他の設定
- おわりに

# はじめに

こんにちは。

フューチャーアーキテクト株式会社、HR/新卒採用チームの棚井です。

略歴として、フューチャーに新卒入社、Technology Innovation Group で IT コンサルタントを 3 年、Global Design Group で新規事業開発を 1 年と担当し、現在は Human Resources（つまり HR）でバックオフィスの新卒採用業務を担当しております。

これまでは Mac ユーザでしたが、Windows が支給されその利用を開始しました。Windows の環境整備として実施した内容を備忘録としての意味も込めてブログ化しました。概要は以下です。

- Mac で身についた入力癖により、Windows 作業が難化
- Windows のキーボード設定を Mac に寄せることで対応しました
  - 新しいキーボードを購入しました
    - [MX KEYS mini KX700GR（グラファイト）](https://www.logicool.co.jp/ja-jp/products/keyboards/mx-keys-mini.920-010516.html)
  - キーバインドを設定しました
    - Microsoft IME
    - [Change Key](https://forest.watch.impress.co.jp/library/software/changekey/)
    - [AutoHotkey](https://www.autohotkey.com/)
  - ランチャーを設定しました
    - [ueli](https://ueli.app/#/)
    - [Everything](https://forest.watch.impress.co.jp/library/software/everything/)

このブログの内容は、Windows ユーザにとっては基本的な内容だと思います。
ターゲット読者は「普段は JIS 配列の Mac を利用しているが、緊急で Windows を使う状況になった」方々を想定しています。

## このブログを書いたきっかけ

学生時代からずっと Mac を利用しており、フューチャーへの新卒入社後も、新人研修期間を除いては Mac で開発作業、資料作成、MTG/会議をこなしてきました。PCで作業をするといったらそれは「Mac で作業をする」ことが前提であり、数年の蓄積により無意識レベルでショートカット & 各種操作を会得済みの Mac だからこそ、あらゆる方面の日常業務にて生産性を発揮できたとも考えています。

しかしここにきて、業務上の理由により「Mac を継続利用できない（≒ Mac を会社に返却して、Windows に交換する）」イベントが発生し、対応を迫られる状況となりました。もちろん、業務外のPCとしては Mac（MacBook Pro, Apple M1 Pro, 32GB）を利用しているため、「普段用は Mac、仕事では Windows のハイブリット方式」スタイルで生きてくことになりました。

Windows が支給された後、**Windows + (色々なボタン)** によるショートカット

- ファイル名を指定して実行（Windows + r）
- 仮想デスクトップ操作
  - 追加（Windows + ctrl + d）
  - 移動（Windows + ctrl + ← or →）
  - 削除（Windows + ctrl + f4）
- 画面ロック（Windows + l）
- エクスプローラーの起動（Windows + e）
- スクリーンショット（Windows + shift + s）
- etc.

などを[Microsoft のサイト](https://support.microsoft.com/ja-jp/windows/windows-%E3%81%AE%E3%82%AD%E3%83%BC%E3%83%9C%E3%83%BC%E3%83%89-%E3%82%B7%E3%83%A7%E3%83%BC%E3%83%88%E3%82%AB%E3%83%83%E3%83%88-dcc61a57-8ff0-cffe-9796-cb9706c75eec#WindowsVersion=Windows_11)を参照して実際に動かしながら覚えていきました。

基本的なショートカットを覚えたら、あとは業務で使いながら「Windows に慣れるのを待とう」として仕事に取り組んでいましたが、無理でした。キーボード配置影響によるミスタイプが連発してまともにテキスト入力ができないのと、Mac で無意識レベルに会得していたショートカットを Windows 側で打ち込んでしまう癖（特に、`caps lock/英数` ボタンで「英数 ⇄ かな」が切り替わるところ）が治りませんでした。一時的に矯正しても、業務外ではバリバリ Mac ユーザとして生きているので、そこで矯正が外れて、仕事に戻ってくると再矯正することの繰り返しで「入力したい文字が意図した通りに入力できないストレス」でまともに仕事ができない状況です。

かといって、業務用のPCを Windows → Mac に切り戻すこともできないので、対応としては「支給された Windows を、普段の Mac っぽく動かせるようになる」ことを考えました。ネットで「Windows と Mac のハイブリット対応」を検索すると、大まかには （1）Windows に寄せる （2）Mac に寄せる （3） 両方の中間を取るの 3 パターンに分けられ、私の場合は「（2）Mac に寄せる」を選択したということです。

# キーボードの購入・設定

Mac → Windows への移行時に最も頻発したのが「タイプミス」と「Mac 専用のショートカットを Windows に打ち込むこと」です。Mac がデフォルトで提供するキーボード・ショートカットに自分を最適化しているため、それを矯正せずとも Windows で作業ができるようになるべく、キーボードの購入とキーバインドの設定を入れました。

## 作業用キーボードの購入

普段の Mac では、PC 標準搭載のキーボードか「Magic Keyboard - 日本語（JIS）」を利用しています。US 配列の方が好みという人もいますが、私はそこにこだわりはなく JIS 配列を使い続けています。

<img src="/images/2023/20230216a/MK2A3J.jpeg" alt="MK2A3J.jpeg" width="1144" height="1144" loading="lazy">

（画像引用元: [Magic Keyboard - 日本語（JIS）](https://www.apple.com/jp/shop/product/MK2A3J/A/magic-keyboard-%E6%97%A5%E6%9C%AC%E8%AA%9Ejis)）

このキーボードは Windows でも利用できますが、私の環境下ではスペースキーの左右にある「英数」と「かな」が検知されず、テキスト入力時にこのボタンを多用する身としては致命的でした。色々探したところ、ガジェット系 Youtuber やブログが絶賛しており見た目的にも Magic Keyboard に近い、logicool の「[MX KEYS mini KX700GR（グラファイト）](https://www.logicool.co.jp/ja-jp/products/keyboards/mx-keys-mini.920-010516.html)」を購入しました。

<img src="/images/2023/20230216a/71e2SZ0PfyL._AC_SL1500_.jpg" alt="71e2SZ0PfyL._AC_SL1500_.jpg" width="1200" height="539" loading="lazy">

（画像引用元: [ロジクール MX KEYS mini KX700GR](https://www.amazon.co.jp/dp/B09HQCW3P8/)）

どちらのキーボードもパンタグラフで、Magic Keyboard はパチパチと叩いている感覚、MX KEYS mini はちゃんと指で押している打鍵感、のような違いがあります。本体重量の違いもあり、重量感・安定感のある MX KEYS mini は購入して割と気に入りました。

## キーボードの設定

リアルで使うキーボードが用意できたので、これまで利用していた Mac での動作を目標としての Windows キーボード設定を進めていきます。基本的には OS が標準提供する機能を利用して、それだと難しい部分でツールを利用していきます。本ブログでは、私が多様する以下のキー/コマンド入力をベースにキーバインドの設定方法を見ていきます。

| #   | Mac での操作                  | Windows での対応操作            | 動作内容                                                                                                                                                                          | 利用機能                  |
| --- | ----------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | 英数/かな                     | 無変換/変換                     | 日本語入力と英字入力の切り替え                                                                                                                                                    | Microsoft IME             |
| 2   | zh,zj,zk,zl                   | zh,zj,zk,zl                     | zh:←<br> zj:↓<br> zk:↑<br> zl:→                                                                                                                                                   | AutoHotkey                |
| 3   | control +<br> [H,F,B,P,N,A,E] | caps lock +<br> [H,F,B,P,N,A,E] | H:Backspace<br> F:カーソルの移動（右）<br> B:カーソルの移動（左）<br> P:カーソルの移動（上）<br> N:カーソルの移動（下）<br> A:カーソルの移動（行頭）<br> E:カーソルの移動（行末） | Change Key<br> AutoHotkey |

- Microsoft IME（Windows OS 標準提供）
- [Change Key](https://forest.watch.impress.co.jp/library/software/changekey/)
- [AutoHotkey](https://www.autohotkey.com/)

## 無変換/変換

| #   | Mac での操作 | Windows での対応操作 | 動作内容                       | 利用機能      |
| --- | ------------ | -------------------- | ------------------------------ | ------------- |
| 1   | 英数/かな    | 無変換/変換          | 日本語入力と英字入力の切り替え | Microsoft IME |

Mac と同じ入力方法での英数/かな変換のため、キーボード的にちょうど同じ場所にある「無変換」と「変換」を利用します。この機能についてはニーズがあったのか、Windows OS が標準提供する Microsoft IME の設定を変えるだけで設定できます（以下、Windows 10 Pro の環境を前提とします）。

まずは検索バーに「IME」入力し、候補の中から「日本語 IME 設定（システム設定）」を開きます。

<img src="/images/2023/20230216a/ime_1.png" alt="ime_1.png" width="974" height="786" loading="lazy">

続いて、「キーとタッチのカスタマイズ」を選択。

<img src="/images/2023/20230216a/ime_2.png" alt="ime_2.png" width="593" height="583" loading="lazy">

キーの割り当てにある各キーに好みの機能を割り当てるをオンにして、

- 無変換キー → IME-オフ
- 変換キー → IME-オン

に設定します。

<img src="/images/2023/20230216a/ime_3.png" alt="ime_3.png" width="491" height="865" loading="lazy">

この設定により、Windows の無変換/変換が、Mac での英数/かな変換と同じ機能を果たすようになります。

## zh,zj,zk,zl

| #   | Mac での操作 | Windows での対応操作 | 動作内容                        | 利用機能   |
| --- | ------------ | -------------------- | ------------------------------- | ---------- |
| 2   | zh,zj,zk,zl  | zh,zj,zk,zl          | zh:←<br> zj:↓<br> zk:↑<br> zl:→ | AutoHotkey |

矢印文字の入力として、Mac では「zh,zj,zk,zl」という便利なショートカットがあります。例えば「→」という文字を入力したいとき、通常ならば

- ローマ字で「migi」と入力
- 変換で「右」が最初にヒット
- 2,3 回変換して「→」になる

と 3 ステップぐらいのプロセスがかかりますが、Mac の全角状態で「zl」を入力すると、即時「→」に変換されて非常に便利です。この入力方法に慣れてしまうと、むしろ「→」が一発で出力されない環境ではストレスフルになるので、Windows にもこれを適用します。このキーバインドの設定のために、[AutoHotkey](https://www.autohotkey.com/) を利用します。

<img src="/images/2023/20230216a/auk_1.png" alt="auk_1.png" width="1200" height="637" loading="lazy">

ダンロードするバージョンとして「v1.1」と「v2.0」の 2 つ候補があります。GitHub のリポジトリを確認したところ、メジャーアップデートとなる v2.0 は [2022 年 12 月 20 日にリリース](https://github.com/AutoHotkey/AutoHotkey/releases)されています。文法改善に伴い後方互換性を捨てたことで v1 系で動作していたスクリプトは一部修正が必要になるようです。ネットの情報としては v1 系のサンプルが多い（最近のリリースというのもあり、v2 系の日本語情報はほとんど見つからない）のですが、それほど複雑な文法を入れる見込みはない点と、AutoHotkey のトップページのメッセージには

> AutoHotkey has been released and will be considered the default/main version. We are in a transition period: the website and forums will be updated accordingly. Please see the [announcement](https://www.autohotkey.com/boards/viewtopic.php?f=24&t=112989) for more information.

とある上に、[ドキュメント](https://www.autohotkey.com/docs/v2/) が [tidbit チュートリアル](https://www.autohotkey.com/docs/v2/Tutorial.htm) を含めて充実しているので、**v2.0** をダウンロードして利用していきます。

ダウンロードが一通り完了すると、画面右クリックで `AutoHotkey Script` が選択肢に追加され、AutoHotkey 用のスクリプトが GUI から作れるようになります。

<img src="/images/2023/20230216a/auk_2.png" alt="auk_2.png" width="689" height="440" loading="lazy">

`New Script` にてファイル情報の入力・選択が求められるので、今回は

- ファイル名は　 tech_blog.ahk（拡張子は `.ahk` にする）
- 保存場所はデスクトップ
- `Minimal for v2` を選択

の設定でファイルを作成しました。

<img src="/images/2023/20230216a/auk_3.png" alt="auk_3.png" width="413" height="281" loading="lazy">

（作成後のアイコン）

<img src="/images/2023/20230216a/auk_4.png" alt="auk_4.png" width="123" height="113" loading="lazy">

ファイルを開くと、デフォルトで 1 行目（#Requires AutoHotkey.0）だけが記入されたファイルの生成を確認できます。
VSCode では AutoHotkey 専用の拡張機能 [AutoHotkey Plus Plus](https://marketplace.visualstudio.com/items?itemName=mark-wiemer.vscode-autohotkey-plus-plus) があり、code highlighting や code formatting によるサポートが便利です。

<img src="/images/2023/20230216a/auk_5.png" alt="auk_5.png" width="410" height="89" loading="lazy">

`.ahk` ファイルの編集環境は準備できたので、キーバインドの設定を登録します。
以下のキーバインドを設定したいので、そのまま .ahk ファイルに追記していきます。

| 入力コマンド | アウトプット |
| ------------ | ------------ |
| zh           | ←            |
| zj           | ↓            |
| zk           | ↑            |
| zl           | →            |

```ahk
;上下左右矢印の入力

:*:zh::←
:*:zj::↓
:*:zk::↑
:*:zl::→
```

キーバインドの設定は

```
::<入力する文字列>::<出力する文字列>
```

の文法により定義していきます。
先頭文字 `::` と `:*:` の違いは、[チュートリアルのサンプル](https://www.autohotkey.com/docs/v2/Tutorial.htm#s24) に

> ::btw::by the way ; Replaces "btw" with "by the way" as soon as you press an [default ending character](https://www.autohotkey.com/docs/v2/Hotstrings.htm#EndChars).
> :\*:btw::by the way ; Replaces "btw" with "by the way" without needing an ending character.

と記載があるように、<入力する文字列>の入力後に終了文字を押してから変換して欲しいか、それとも即時変換して欲しいかの違いを表現しています。今回は「`zl` が入力されたら即時 `→` に変換してほしい」ので、`:*:` で定義しています。

作成した `.ahk` ファイルはダブルクリックにより適応可能です。ファイルのショートカットを作成して `windows + r` → `shell:startup` に配置すれば、Windows 立ち上げ時に AutoHotkey の設定を自動適応できます。

## caps lock + [H,F,B,P,N,A,E]

| #   | Mac での操作                  | Windows での対応操作            | 動作内容                                                                                                                                                                          | 利用機能                  |
| --- | ----------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 3   | control +<br> [H,F,B,P,N,A,E] | caps lock +<br> [H,F,B,P,N,A,E] | H:Backspace<br> F:カーソルの移動（右）<br> B:カーソルの移動（左）<br> P:カーソルの移動（上）<br> N:カーソルの移動（下）<br> A:カーソルの移動（行頭）<br> E:カーソルの移動（行末） | Change Key<br> AutoHotkey |

Backspace とカーソル移動のキーバインドを登録していきます。

AutoHotkey の定義により「caps lock を別のボタンに置き換える」ことは可能なのですが、OS レベルでの caps lock ボタン操作「down（押し込み）/ up（放し）」と AutoHotkey でのボタン押下検知タイミングの差分により、「caps lock が押されっぱなしになり、置き換え先のボタンが長押し状態になってしまう」問題が多数報告されています。これを回避するために、今回は [Change Key](https://forest.watch.impress.co.jp/library/software/changekey/) を利用して caps lock に F13 を割り当て、F13 にキーバインドを設定する方法を使います。

まずは、caps lock を F13 に変更する設定から。
Change Key のダウンロードが完了したら「管理者として実行(A)」により起動します。

<img src="/images/2023/20230216a/ck_0.png" alt="ck_0.png" width="665" height="173" loading="lazy">

変更対象のキーである `CapsLock 英数` を選択します。

<img src="/images/2023/20230216a/ck_1.png" alt="ck_1.png" width="877" height="295" loading="lazy">

続いて、変更先の F13 を指定したいのですが、デフォルトでは F12 以降の F13 から F24 までは表示されていません。この場合は、右上の `Scan code` を利用して、対応するスキャンコードを直接入力していきます。

<img src="/images/2023/20230216a/ck_2.png" alt="ck_2.png" width="879" height="297" loading="lazy">

F13 から F24 と スキャンコードの対応表

| Key | Scan code |
| --- | --------- |
| F13 | 0×0064    |
| F14 | 0×0065    |
| F15 | 0×0066    |
| F16 | 0×0067    |
| F17 | 0×0068    |
| F18 | 0×0069    |
| F19 | 0×006A    |
| F20 | 0×006B    |
| F21 | 0×006C    |
| F22 | 0×006D    |
| F23 | 0×006E    |
| F24 | 0×0076    |

F13 の `0x` に続く `0064` のスキャンコードを登録します。

<img src="/images/2023/20230216a/ck_3.png" alt="ck_3.png" width="435" height="259" loading="lazy">

登録が完了すると、作業前は `CapsLock 英数` だった場所が、`Scan code` に変わっていることが分かります。

<img src="/images/2023/20230216a/ck_4.png" alt="ck_4.png" width="880" height="295" loading="lazy">

この状態で「登録(R)」→「現在の設定内容で登録します(R)」を選択すると、PC が再起動してキーの入れ替えが完了します。再起動後、[こちらのサイト](https://anysweb.co.jp/advancedkeycheck/) などで入力チェックを行うと、caps lock が F13 と認識されているか確認できます。切り替えがうまくいかない場合、一度 Change Key での「リセット(C)」を利用した上で、caps lock から F13 に 1 ステップで切り替えるのではなく、caps lock → home → F13 のように、別のボタンへの変更を 1 度挟むとうまくいくケースもあるようです。

F13 への配置換えが完了したら .ahk ファイルに追記していきます。

| 入力コマンド  | アウトプット           |
| ------------- | ---------------------- |
| caps lock + H | Backspace              |
| caps lock + F | カーソルの移動（右）   |
| caps lock + B | カーソルの移動（左）   |
| caps lock + P | カーソルの移動（上）   |
| caps lock + N | カーソルの移動（下）   |
| caps lock + A | カーソルの移動（行頭） |
| caps lock + E | カーソルの移動（行末） |

caps lock は F13 に変更済みなので、F13 にキーバインドを設定します。

```
;文字の削除
F13 & H::Send "{Blind}{Backspace}"

;カーソルの移動(上下左右)
F13 & F::Send "{Blind}{Right}"
F13 & B::Send "{Blind}{Left}"
F13 & P::Send "{Blind}{Up}"
F13 & N::Send "{Blind}{Down}"

;カーソルの移動(行頭・行末)
F13 & A::Send "{Blind}{Home}"
F13 & E::Send "{Blind}{End}"
```

Send の文法詳細や各 Keys の解説は [こちらのドキュメント](https://www.autohotkey.com/docs/v2/lib/Send.htm) に記載があります。

```
Send Keys
<入力コマンド>::Send "<操作内容>"
```

<入力コマンド>を複数キーにする場合、& で繋いで表現します。また、`{Blind}` を入れることで、他キーとの同時打鍵が可能となります。例えば、`F13 & B::Send "{Left}"` は「F13+B」でカーソルをひとつ左に動かすコマンドですが、`{Blind}` を追加すれば「Shift+F13+B」により「範囲選択しながらの左へのカーソル移動」が可能となります。カーソル移動は別コマンドと組み合わせても効果が増えるので、今回のキーバインドには全て `{Blind}` を入れています。

### Mac の JIS 配列でのカーソル操作

**control + [H,F,B,P,N,A,E]** → **caps lock + [H,F,B,P,N,A,E]**
そもそもの、これは何が嬉しいの？ という疑問を持たれた方向けの解説です。

JIS 配列 Mac の場合、control ボタンが A ボタンの左（US 配列であれば caps lock があるところ）に配置されています。私はこの配置を前提として Mac の [書類に関するショートカット](https://support.apple.com/ja-jp/HT201236#text) を利用しています。つまり、テキスト作業・コーディング作業での「Backspace とカーソル移動」は全て「左手小指で control を押しながら」ショートカットを実行しており、これによりホームポジションのままの操作を実現していました。Windows 環境でもこれを再現するために、「control ボタン + X を caps lock ボタン + X に置き換える」設定を入れています。

# ランチャーの設定

PC操作の基本である「テキスト入力」が私の使い慣れた Mac 風に近づいてきたので、次は「ランチャー」です。Mac では [Alfred](https://www.alfredapp.com/) を使っているので、これに近い操作性のある [ueli](https://ueli.app/) と ueli 内から呼び出す [Everything](https://forest.watch.impress.co.jp/library/software/everything/) を設定していきます。

ueli の [Windows 版をダウンロード](https://ueli.app/#/download)して、設定作業を進めます。

<img src="/images/2023/20230216a/ueli_1.png" alt="ueli_1.png" width="1200" height="695" loading="lazy">

設定が完了すると、`alt + space` によりランチャーの起動が確認できます。

この起動感、Alfred と同じで快適です。ueli の検索範囲はディレクトリ単位で指定可能なので、使いたいアプリケーションやファイルがヒットしない場合は、設定項目を追加すると検索範囲が拡張できます。

<img src="/images/2023/20230216a/ueli_2.png" alt="ueli_2.png" width="765" height="90" loading="lazy">

ファイル検索としては ueli から `es?<検索ワード>` による Everything の呼び出しが可能なので、その設定作業も進めていきます。

こちらの [ダウンロードサイト](https://www.voidtools.com/downloads/) から、`Everything本体` と `Download Everything Command-line Interface` の 2 つをダウンロードします。Everything 本体は [窓の杜](https://forest.watch.impress.co.jp/library/software/everything/) からもダウンロード可能です。Command-line Interface 側はダウンロード後の解凍 & `es.exe` の配置が完了したら、ueli コンソールの "es.exe" のパスに登録します。

<img src="/images/2023/20230216a/ueli_3.png" alt="ueli_3.png" width="1200" height="907" loading="lazy">

アプリケーションの起動は ueli 単体、ファイル検索は ueli+Everything の使い方が便利です。ueli の起動コマンドはデフォルトで `alt + space` ですが、このコマンドの組み合わせも任意の形に変更可能なため、この点も含めてポイントの高いランチャーアプリだと思います。私は後述の「右 alt キーを右 Ctrl キーに変更」していることもあり、ueli の起動は `ctrl + space` をホットキーに登録しています。

<img src="/images/2023/20230216a/ueli_4.png" alt="ueli_4.png" width="1200" height="491" loading="lazy">

# その他の設定

ここまでに「キーボードの設定」と「ランチャーの設定」まで進めてきて、Windows のデフォルト状態から Mac の操作性に少しづつ近づけています。
操作デバイスとして新しく購入した [logicool のキーボード](https://www.logicool.co.jp/ja-jp/products/keyboards/mx-keys-mini.920-010516.html) を利用しながら検知した「Mac 慣れ起因による誤作動」を正常化していきます。

- 左上の「1」を狙って「半角/全角漢字」を押してしまうケースがある。気持ち少し右を狙って再度「1」を押すと全角で入力されて変換処理が入る
  - → 半角/全角漢字を 1 に変更
- 左下にしか Ctrl が無いのが不便。右下にも欲しい（Mac JIS 配列の右下 command キーに対応する「右下 Ctrl」が欲しい）
- 右下にある「alt キー」と「カタカナ/ひらがなキー」を使った試しがない
  - → alt 右とカタカナ/ひらがなを Ctrl 右に変更
- 英数入力の切り替えのため「無変換」を狙うが「alt 左」を押してしまい、カーソルのフォーカスが外れることがある
- Mac の左下 command キーに対応する「左下 Ctrl」が欲しい
  - → alt 左を Ctrl 左に変更（これにより、alt キーが喪失）
- タスクマネージャーの起動用に「alt, shift, delete」は必ず残しておく必要があることが判明
  - → ヘルプ起動機能の F1 に alt 左を配置

このように Change Key を利用して「自分の入力癖に Windows を矯正する」ことを繰り返します。Change Key の設定はコンソールの「参照(F)」→「スキャンコードを含む変更されたキーを一覧表示します(R)」から確認可能なので見てみると、色々な設定が反映されていることが分かります。

<img src="/images/2023/20230216a/other_2.png" alt="other_2.png" width="548" height="427" loading="lazy">

変更した場所は赤枠で囲まれて表示されるようです。
このキー配置が、現時点の私にとっては最適のようです。

<img src="/images/2023/20230216a/other_3.png" alt="other_3.png" width="881" height="298" loading="lazy">

ここまで設定して、Mac でのテキスト操作コマンドや「使い慣れた指の操作」をそのまま Windows でも実現でき、Mac にて無意識レベルで習得したコマンドを Windows 下においてもストレスなく正しく利用できるようになってきました。まだ Windows を使い始めて 2 週間も経っていないので、このコマンド設定を利用しつつ何かしらの不便があれば「Mac でどうやって操作してたっけ？」→「Windows で再現しよう」を繰り返しながら、Windwos を使いやすい形にセルフアップデートし続ける予定です。

# おわりに

JIS 配列の Mac でショートカットを会得した私が、Windows の操作性を Mac に近づけるという内容のブログでした。

最初に「Mac から Windows に切り替える」と決まった時には、もうこの会社では仕事はできないなと目の前が真っ暗になりました。しかし、Windows の外部ツールを利用したカスタマイズ性の高さに助けられて、なんとか「Windows のキーボード操作を Mac っぽくする」ことに成功して今に至ります。Windows 歴が短いため知らなかったのですが、こういった各種加工が割と簡単にできるというのが、今回の学びでした。「使い慣れた環境から、あえてズレてみる」というのも、技術キャッチアップには刺激になるのかもしれません。ただし、その支給された Windows を Mac の UI/UX に寄せようとしている時点で、ズレによるストレスを受け入れるのではなく「（自分なりの方法で）回避している」とも言えますが。いずれは Mac に戻す予定ですが、もしまた何かしらの偶然の連鎖により「Windows を使わざるを得ない状況」になった場合に備えて、支給直後に設定した内容を備忘録的に残すことにしました。

Windows の機能で便利だなと思ったのは `windows + shift + s` でのスクショ内容がクリップボードに貼り付けられて、そのまま任意の場所に貼り付け可能なところです。ただし、Mac の場合でも `command + shift + 4` でスクショするときに `controlを押しっぱなし` にすることでクリップボードに記録されることを知って、ああそうかとなりました。開発環境としては Mac に優位性がある理解でいますが、Windows 歴が短すぎてまだそれを実感できていません。「Mac ユーザから見た Windows 環境における開発作業の難しさ」については、ネタが溜まったらまたブログ化しようと思います。

以上、長文にお付き合いいただき、ありがとうございました。
みなさま、良い Mac ユーザライフを！
