---
title: "Mac歴10年のWindows入門"
date: 2025/05/21 00:00:00
postid: a
tag:
  - Windows
  - 環境構築
  - Mac
  - キーバインド
  - VSCode
category:
  - DevOps
thumbnail: /images/2025/20250521a/thumbnail.png
author: 長谷川寛人
lede: "Windowsを徹底的にMacBookに近づけ、快適な作業環境を構築することにしました。そのプロセスを詳しく紹介します。"
---
[春の入門祭り2025](/articles/20250413a/)の20本目の記事です。

<img src="/images/2025/20250521a/mac_windows.png" alt="" width="1200" height="800" loading="lazy">

# はじめに

こんにちは。TIG（Technology Innovation Group）の長谷川です。2025年11月にWeb系企業からの転職でキャリア入社し、現在は主にフロントエンド開発を担当しています。

新しいプロジェクトで支給されたのはPCはWindows。大学入学以降、約10年間MacBookを使い続けてきた私にとっては、高校生以来となるWindowsとの再会です。

私物のマシンはMacBookのUS配列である一方で、支給PCはWindowsのJIS配列。

この差がなかなかにつらく、正直、チャットすら満足にできない状態でした（入社して一番苦戦したポイントかもしれません…w）。

そこで、**Windowsを徹底的にMacBookに近づけ、快適な作業環境を構築する**ことにしました。そのプロセスを詳しく紹介します。

「Mac派だけど諸事情でWindowsに触れることになった」方はもちろん **「元々Windowsユーザだけど便利な設定を知りたい」という方にも役立つ内容**となっていますので、ぜひ最後までご覧ください。

# 前提

MacユーザーがWindows環境で快適に作業するためのアプローチは、以下の3つに大別できます。

- A. Windowsに慣れる
- B. 双方で統一的に使える環境を整える
- C. WindowsをMacに寄せる

今回は **Cの「WindowsをMacに寄せる」方針** で進めています。

なお、使用するOSはWindows 11です。

# 目指す使用感

普段のMacBook使用スタイルは非常にシンプルで、**「内蔵のキーボードとトラックパッドのみを使う」派**です。[BetterTouchTool（以下BTT）](https://folivora.ai/)でジェスチャーを割り当て、さまざまな操作を実現しています。

MacBookの使い方から離れないために、Windowsをカスタマイズをしていく上でのポリシーを以下とします。

- マウスは使用しない
- キーボードは持ち運ばない

最初は外付けキーボード自体を使わないつもりでしたが、現在はリモートワークの際には分割キーボードを利用しています。

# トラックパッド

最初に取り組むのは、トラックパッドのつらさへの対処です。

トラックパッドにおける課題はクリックの重さ。これはWindowsでもデバイスによると思いますが、支給PCのデバイスはクリック時に必要な力が少し大きく若干ストレスでした。

自宅にMagic Trackpadがあったため、Windowsでも利用できるか調査したところ、問題なく使えそう。導入方法については以下の記事を参考にさせていただきました。とくに複雑な設定は不要で簡単に利用できます。

cf. [Windows 11 で Apple Magic Trackpad を快適に使う方法](https://mlabo.org/10656/)

これでまずはトラックパッドがMacに近づきました🎉

# Windowsの設定をMac風に

Magic Trackpadの導入により、カーソルの操作性が向上しました。

キーボードを改善する前に、各種設定を調整してMacに近い使用感を目指します。

以下に主な設定を記載しています。

- **Bluetoothとデバイス > タッチパッド**
  - カーソル速度: `10`
    - カーソルは速さが正義💨
  - タップ
    - タッチパッドの感度: `低い感度`
    - 1本の指でタップしてシングルクリックする: `ON`
    - 2本の指でタップして右クリックする: `ON`
    - 2回タップしてドラッグすると複数選択: `OFF`（誤動作することが多かったので）
    - 右クリックするにはタッチパッドの右下を押します: `OFF`
  - スクロールとズーム
    - 2本の指をドラッグしてスクロールする: `ON`
    - スクロール方向: `ダウンモーションで上にスクロール`
    - ピンチ操作によるズーム: `ON`
  - ジェスチャ
    - 3本指ジェスチャ
      - タップ: `マウスの中央ボタン`（リンクを開くときに新規タブで開いたり便利です）
      - 上方向にスワイブ: `デスクトップの表示`
      - 下方向にスワイブ: `カスタムショートカット（Ctrl + W）`（タブを閉じる）
      - 左方向にスワイブ: `カスタムショートカット（Ctrl + Page Up）`（前のタブに移動）
      - 右方向にスワイブ: `カスタムショートカット（Ctrl + Page Down）`（次のタブに移動）
    - 4本指ジェスチャ
      - タップ: `通知センター`
      - 上方向にスワイブ: `タスクビュー`
      - 下方向にスワイブ: `カスタムショートカット（Ctrl + Shift + T）`（閉じたタブを復元）
      - 左方向にスワイブ: `デスクトップを切り替える`
      - 右方向にスワイブ: `デスクトップを切り替える`
    - MacではBTTを使って色々とジェスチャーを登録しています
    - BTTほど柔軟ではありませんが、Windows公式の機能でそれなりに柔軟に対応できるのは嬉しい
- **システム＞クリップボード**
  - `クリップボードの履歴` をONに
  - MacだとBTTでクリップボード管理しています
- **システム > マルチタスク**
  - ウィンドウのスナップ: `ON`
    - ウィンドウをスナップしたときに、次にスナップする対象を提案する: `OFF`
    - ウィンドウの最大化ボタンにカーソルを合わせたときにスナップレイアウトを表示する: `ON`
    - ウィンドウを画面の上部にドラッグしたときにスナップレイアウトを表示する: `OFF`
    - タスクビューのタスクバーアプリ上にマウスカーソルを移動したとき、そしてAlt+Tabを押したときに、スナップしたウィンドウを表示する: `ON`
    - ウィンドウをドラッグしたときに、画面の端までドラッグしなくてもウィンドウをスナップできるようにする: `ON`
  - スナップまたはAlt+Tabを押したときにアプリのタブを表示する: `（最新の3つのタブ）`
  - デスクトップ
    - タスクバーに開いているすべてのウィンドウを表示: `すべてのデスクトップで`
    - Alt+Tabを押したときに、開いているすべてのウィンドウを表示: `使用中のデスクトップでのみ`
    - 💡Windowsの仮想デスクトップ使いづらいと感じていましたが、この設定をすることでMacと似た感じで使えるようになりました
  - タイトルバーウィンドウのシェイク: `OFF`
- **アカウント > サインインオプション > 追加の設定**
  - 再起動可能なアプリを自動的に保存し、再度サインインした時に再起動する: `ON`（再起動前に開いていたアプリを再起動してくれる）
    - Macほどすべてが復元されるわけではなさそう
- **個人用設定 > タスクバー**
  - 検索: `検索ボックス`
  - ウィジェット: `OFF`
- **個人用設定 > テーマ >デスクトップ アイコンの設定**
  - ゴミ箱をデスクトップから非表示に
  - 何もないデスクトップは至高
- **[Google IME](https://www.google.co.jp/ime/)**
  - ことえりのショートカットを選択
    - ことえりのライブ変換のような機能はなさそうでした・・・
  - 後述するAutoHotKeyを使わない場合の英数/かなの切り替えはGoogle日本語入力の機能で対応できそう
    - cf. [Google日本語入力で無変換キーでIMEをオン/オフする - 日記とか、工作記録とか](https://windvoice.hatenablog.jp/entry/2021/08/13/110812)

# キーボードの調整

US配列（Mac）とJIS配列（Windows）の差によるキーボードの課題は以下の3つ。

- 記号等の配置の違い
- 修飾キーの意味や使い方、配置の違い
- ショートカットキーの組み合わせの違い

最初はJIS配列のWindowsキーボードに慣れようとしたものの、Macの操作感からのギャップが大きく断念しました。
また、仮に慣れたとしても、今度はMacが使いづらくなってしまう。

そこでMac風の操作に近づける方向でキーボードを調整することとしました。

（Macの場合は大抵 `command + ⚪︎` ですが、Windowsは操作によって`Windows` `Alt` `Ctrl` を使い分ける印象がありますね。思想の違いがありそう。）

## Change Key の活用

キーボード配列はそれぞれ以下のようになっています。

- MacBookのUS配列
  - `fn`・`control`・`option`・`command`・`スペースバー`・`command`・`option`
- WindowsのJIS配列
  - `ctrl`・`fn`・`win`・`alt`・`無変換`・`スペースバー`・`変換`・`カタカナ`・`Copilot`

このように並びが全然違っており、左手側を見ると、似た機能を持つことが多い`command(Mac)`と`ctrl(Windows)`の位置が反対にあります。とくに使うことが多いコピペの配置が全く違うのでこれはかなり困りました。

そこで今回は[Change Key](https://forest.watch.impress.co.jp/library/software/changekey/)というソフトで配列を以下のように変更します。

- 無変換 → `Ctrl左`
- 変換 → `Ctrl右`
- カタカナ・ひらがな → `Alt右`

これでMacと似た感覚でコピペできるようになりました🎉

📝参考記事：

- [Mac 慣れした私に Windows が支給されたので、まず設定したこと | フューチャー技術ブログ](https://future-architect.github.io/articles/20230216a/#caps-lock-H-F-B-P-N-A-E)
- [【Change Key】キーボードの割り当てを変更するソフトの使い方 | ナポリタン寿司のPC日記](https://www.naporitansushi.com/changekey/)

## ULE4JIS でUS配列風に

JIS配列を完全にUS配列で上書きするとたまに不都合があるため、[ULE4JIS](https://github.com/dezz/ULE4JIS/tree/master) を導入し、必要に応じてON/OFFを切り替える方式を採用しました。スタートアップに登録して運用しています。

なお、Google Docsのショートカットに一部不具合がある等、少しバグがある(?)点には注意が必要です。
（箇条書きのショートカットは本来`Ctrl + Shift + 8` だが `Ctrl + Shift + 9` になってしまう）

今だとこちらを利用させてもらってもいいかも。

- [USkey2JP - Musashino Software](https://ms-soft.jp/tools/uskey2jp/)

📝参考記事：

- [ノートパソコンはJIS配列で外付けキーボードをUS配列に（Windows）](https://mastdesign.me/20240107-jiskeyboard-uskeyboard/)
- [Windows11のスタートアップを設定する方法 - mouse LABO](https://www.mouse-jp.co.jp/mouselabo/entry/2024/01/24/100037)

## AutoHotKey による魔改造

Change KeyとULE4JISのおかげで普通にタイピングできるようにはなりました。

しかし、Macで染み付いたショートカットはWindowsで利用できません。

そこで、[AutoHotKey](https://www.autohotkey.com/)を使ってMacの操作感を再現しました。

具体例：

- ctrl(無変換/変換)単押しによるIME切替（左単押しで`英数`、右単押しで`かな`）
- Mac風のウィンドウ操作やショートカット
- 各種アプリ（Chrome・Excel・Slack）でのカスタム対応

コメント付きのコードを以下に添付するのでご参照ください。

`main.ahk` をスタートアップに登録しておくと快適です。

### main.ahk

```lisp
#Requires AutoHotkey v2.0

#Include ./lib/IMEv2.ahk
#Include ./utils.ahk
#Include ./applications.ahk
#Include ./configs.ahk

#SingleInstance Force

; main.ahk を再起動
^!.:: {
    MsgBox("Rerun main.ahk")
    Reload()
}

;=============================================
; キーボードの Remap
;---------------------------------------------
; Alt 単押しでカーソルのフォーカスが外れるのを防ぐ
~LAlt:: Send "{Blind}{vk07}"
~RAlt:: Send "{Blind}{vk07}"

; Copilot ボタンを無効化
#+F23:: Send "{Blind}{vk07}"

; Win + Alt + Ctrl + BackSpace で Delete
#!^BackSpace::Delete
;=============================================
; macOS 風キーバインド
; cf. <https://jimon.info/macos-like-windows#単語単位カーソル移動を再現>
; --------------------------------------------
; cmd+矢印 の挙動を再現
^Left::Home ; Mac の「cmd + ←」風
^Right::End ; Mac の「cmd + →」風
^Up::^Home ; Mac の「cmd + ↑」風
^Down::^End ; Mac の「cmd + ↓」風

; Option+左右 の挙動を再現
!Left:: SendInput "^{Left}" ; Mac の「option + ←」風
!Right:: SendInput "^{Right}" ; Mac の「option + →」風
+!Left:: SendInput "^+{Left}" ; Mac の「option + shift + ←」風
+!Right:: SendInput "^+{Right}" ; Mac の「option + shift + →」風

; Mac の control + j,k,l,; が Windows では win + j,k,l,; になるので、macと同じ位置で使えるようにする
#j::^j
#k::^k
; win + l は画面ロック機能で上書きできない
; #l::^l
#;:: Send "{F10}"

; Mac の cmd + tab 的に使えるように変更
; cmd + shift ではうまくいかなかったので caps lock で代用
LCtrl & Tab::AltTab
LCtrl & sc03A::ShiftAltTab ; sc03A=caps lock

; 削除系
!Backspace:: Send "{LCtrl Down}{Backspace}{LCtrl Up}" ; 単語削除
^Backspace:: Send "{LShift Down}{Home Down}{Backspace}{Home Up}{LShift Up}" ; 行頭まで削除
;=============================================
; IME や Ule4Jis など文字入力関連の設定
;---------------------------------------------
~LCtrl:: Send "{Blind}{vk07}"
~RCtrl:: Send "{Blind}{vk07}"

; 左 Ctrl 単押しで IME を OFF
~LCtrl Up:: {
    if (A_Priorkey != "LControl") {
        return
    }
    IME_SET(0)
}

; 右 Ctrl 単押しで IME を ON
~RCtrl Up:: {
    if (A_Priorkey != "RControl") {
        return
    }
    IME_SET(1)
}

; caps lock の２連打で Ule4Jis の有効/無効を切り替える
~sc03A:: {
    ; REF: <https://ahkscript.github.io/ja/docs/v2/FAQ.htm#DoublePress>
    if (ThisHotkey != A_PriorHotkey || A_TimeSincePriorHotkey > 200) {
        return
    }

    if (Utils.isActiveWindow(Configs.windowTitles.ule4Jis)) {
        WinClose(Configs.windowTitles.ule4Jis)
        MsgBox ("ULE4JIS を終了しました")
        return
    }
    Run(Configs.paths.ule4Jis)
}
; ============================================
; window 操作関連
; FancyZones の設定も必要
; Mac では BetterTouchTool で行っている設定
; --------------------------------------------
; ウィンドウを最大化
^!,:: WinMaximize("A")
; ウィンドウを最大化してから、次のディスプレイに移動
^!m:: {
    WinMaximize("A")

    Send("{LWin Down}")
    Send("+{Right}")
    Send("{LWin Up}")
}

; ウィンドウを FancyZones 上の左に移動
^!j:: {
    Send("{LWin Down}")
    Send("{Left}")
    Send("{LWin Up}")
}
; ウィンドウを FancyZones 上の右に移動
^!k:: {
    Send("{LWin Down}")
    Send("{Right}")
    Send("{LWin Up}")
}
; ============================================
; アプリの終了や最小化関連の操作
; --------------------------------------------
; Mac では cmd + Q でアプリの終了
^q:: WinClose("A")

; Mac では cmd + h で非表示、 cmd + m で最小化
; Windows では 非表示出来ないので最小化のみ
; 最小化したウィンドウを復元するために配列に格納しておく
minimizedWindows := []
^h::
^m:: {
    activeWindow := WinActive("A")
    WinMinimize(activeWindow)
    minimizedWindows.Push(activeWindow)
}
^+h::
^+m:: {
    if minimizedWindows.Length <= 0 {
        MsgBox "最小化されたウィンドウがありません。"
        return
    }
    lastMinimizedWindow := minimizedWindows.Pop()

    ; もしウィンドウが最小化状態であれば復元
    if WinGetMinMax(lastMinimizedWindow) == -1 {
        WinRestore(lastMinimizedWindow)
    }
}
```

### applications.ahk

```lisp
#Requires AutoHotkey v2.0

#Include utils.ahk
; ============================================
; Chrome 専用
; --------------------------------------------
#HotIf WinActive("ahk_exe chrome.exe")

; alt + ctrl + i で開発者ツール
^!i::+^i

#HotIf
; ============================================
; Excel 専用
; --------------------------------------------
#HotIf WinActive("ahk_exe EXCEL.EXE")

; Shift + Enter でセルを編集する
+Enter::F2

; Ctrl + Enter で改行する
^Enter::!Enter

; Ctrl + Shift + z でやり直す
^+z::^y

; alt の２連打でコンテキストメニューを表示する
~LAlt:: {
    ; REF: https://ahkscript.github.io/ja/docs/v2/FAQ.htm#DoublePress
    if (A_ThisHotkey != A_PriorHotkey || A_TimeSincePriorHotkey > 200) {
        return
    }

    Send "{Shift Down}{F10}{Shift Up}"
}

#HotIf
; ============================================
; Slack 専用
; --------------------------------------------
#HotIf WinActive("ahk_exe slack.EXE")

; ctrl + [ で go back
^sc01A::!Left
; ctrl + ] で go forward
^sc02b::!Right

#HotIf
; ============================================
; VSCode 専用
; --------------------------------------------
#HotIf WinActive("ahk_exe Code.exe")

; ctrl + [ で go back
^sc01A::!Left
; ctrl + ] で go forward
^sc02b::!Right

#HotIf
```

### utils.ahk

```lisp
#Requires AutoHotkey v2.0

#SingleInstance Force

class Utils {
    static isActiveWindow(windowTitle) {
        DetectHiddenWindows(true)
        window := WinExist(windowTitle)
        if (window > 0) {
            return true
        }
        return false
    }
}
```

### configs.ahk

```lisp
#Requires AutoHotkey v2.0

class Configs {
    static windowTitles := {
        ule4Jis: "ahk_exe Ule4Jis.exe",
    }
    static paths := {
        ule4Jis: "C:\\Path\\To\\Ule4Jis.exe", ; ← 実際のパスをここに記入してください
    }
}
```

### lib/IMEv2.ahk

https://github.com/k-ayaki/IMEv2.ahk/blob/master/IMEv2.ahk を利用させていただきました。

# 各種ツール

その他導入した便利なツールを紹介します。

- **[QL-Win/QuickLook: Bring macOS “Quick Look” feature to Windows](https://github.com/QL-Win/QuickLook)**
  - MacのQuickLook的なもの
  - 毎回ファイルを開かなくて良くなる（動作は少し遅いかも）
- **[Power Toys](https://learn.microsoft.com/ja-jp/windows/powertoys/)**
  - Microsoftが出しているユーティリティセット
  - Power Toys Run
    - Macでいうspotlight検索
      - MacではRaycastを利用しています
      - Windowsにもいつか来るかも → [Raycast for Windows](https://www.raycast.com/windows)
    - EveryThingのプラグインも導入
      - [lin-ycv/EverythingPowerToys: Everything search plugin for PowerToys Run](https://github.com/lin-ycv/EverythingPowerToys)
    - Windowsで他に使えそうなランチャーアプリ
      - [Ueli - A Cross-Platform Keystroke Launcher](https://ueli.app/)
        - おしゃれで良さそう
  - FancyZones(Power Toys)の設定
    - 左1/3と右2/3でゾーンを作成して使用
    - MacではRaycastでの「`First Third` と `Last Two Thirds`」や「BTTのスナップエリア」を利用
  - 他にもColor Pickerなど色々あるので必要なものを有効化して利用
  - 参考たサイト
    - [PowerToys のインストール | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/powertoys/install)
    - [情シスがPowerToys全機能をさわってみたよ](https://zenn.dev/katayama/articles/b8bc8b2d27b637)
- **[Clibor | クリップボード履歴ソフト「Clibor」の公式サイト](https://chigusa-web.com/clibor/)**
  - クリップボードアプリ
    - MacではBTTのクリップボードを利用
  - CliborだけでなくWindows公式のクリップボードの履歴も併用
    - Cliborではリッチテキストや画像の履歴を保持できないため
      - 「設定 > システム > クリップボード」でクリップボードの履歴をONにすると使えます
    - Power ToysにAdvanced Pasteというのもあるのでそちらを利用する手も
  - 設定内容
    - 画面表示制御
      - 画面表示時に1行目にフォーカスを移すを `ON` に
    - ホットキー
      - メイン画面の呼び出し: `Win + Ctrl + Alt + J`
        - AutoHotKeyが動いているとうまく設定できない場合があるので、その場合一時停止させる（設定後はAutoHotKeyを戻しても動作する）
      - MacではBetterTouchToolのクリップボードツールを `Ctrl + Option + command + J` で開く
        - 最初は`command + Shift + V` にしていたが、Google Docsのショートカットなどと被るため、絶対に使わないキーに
    - Cliborもスタートアップへ登録すると快適
- **[CubeICE](https://www.cube-soft.jp/cubeice/)**
  - Macであればダブルクリックでよしなにやってくれるが、Windowsは右クリックから展開しないといけない？
  - 設定を以下のようにすることでMacと同じ操作感に
    - 保存場所: `元のファイルと同じフォルダ`
    - 解凍後に保存先フォルダを開く: `OFF`
  - zipのデフォルトアプリをCubeICEに設定する
- **VS Code**
  - Scroll Sensitivityを`3`にする（Editor, Workbenchの両方）
    - デフォルトだとトラックパッドでのスクロールが遅いため

# おわりに

今回紹介した設定やツールを駆使することで、WindowsをMacのように扱えるようになりました。

Windowsを使い始めて半年が経ちますが、業務終了後や休日にMacで違和感なく作業ができています。

**最初はWindows自体と戦っていましたが、今ではWindowsで戦えるようになりました🔥**
快適な環境になりとてもハッピーです。

みなさんも良いWindowsライフを！🍎

# おまけ：Macに導入したWindows的ツール

最後に、逆にMacに導入した便利ツールもご紹介。

- [AltTab](https://alt-tab-macos.netlify.app/)

普段Macでは、エディタやターミナルを各リポジトリごとに仮想デスクトップに割り当てています。これは使いやすく便利なのですが、`command + tab`でのアプリ切り替え時に「同じアプリだけど別のウィンドウ」に遷移してしまうことが多く、手間に感じていました。

AltTabを導入することで、一つ前のウィンドウを確実に開いたり、同じアプリ内でもウィンドウを選択できるようになり、かなり快適になりました🎉
