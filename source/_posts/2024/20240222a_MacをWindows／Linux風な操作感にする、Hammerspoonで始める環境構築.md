---
title: "MacをWindows/Linux風な操作感にする、Hammerspoonで始める環境構築"
date: 2024/02/22 00:00:00
postid: a
tag:
  - キーバインド
  - Mac
  - ショートカット
  - 環境構築
category:
  - DevOps
thumbnail: /images/2024/20240222a/thumbnail.jpg
author: 山本竜玄
lede: "私用PCはLinux、会社PCはプロジェクトによってWindowsとMacのどちらかを使っている生活をしており、かつ自宅のモニターやキーボードは外付けで1つのものを使用しています。その日々を過ごす中で、キーバインディングが異なるPCで混乱することがあり、ツール・操作感をできるだけ統一したいという願望がありました。"
---
# はじめに

こんにちは。最近自宅チェアをバランスボールにして体幹を鍛えている、HealthCare Innovation Group(HIG)所属の山本です。

私用PCはLinux、会社PCはプロジェクトによってWindowsとMacのどちらかを使っている生活をしており、かつ自宅のモニターやキーボードは外付けで1つのものを使用しています。

その日々を過ごす中で、キーバインディングが異なるPCで混乱することがあり、ツール・操作感をできるだけ統一したいという願望がありました。

今回はMacを使用する際に、キーバインディングや操作感を私用PCに寄せるため「[Hammerspoon](https://www.hammerspoon.org/)」を使用した、個人的な環境構築集を書きます。

## Hammerspoonとは？

https://www.hammerspoon.org/

macOSの操作をLua言語で行うことができるツールです。
アプリケーション、ウィンドウ、マウス ポインター、クリップボードなどできることは多岐に及びます。

キーバインド操作ツールとしては「Karabiner-Elements」や画面分割では「Shiftit」など、類似の操作ができるアプリはいくつかあります。

これらのツールのようにGUIで設定できない代わりに、スクリプトをゴリゴリ書くことでかなり自由度の高い操作をできることが特徴です。

今回はキーバインディングの操作や、ウィンドウの操作に主に使用させていただきました。

## 操作環境

- Mac OS: Ventura 13.5
- キーボード：英字キーボード(Keychron K2)をUSB接続
- ディスプレイ：3枚のディスプレイを外付け、本体PCは閉じて使用(Anker 564 USB-C ドッキングステーション+DisplayLink Manager)
- 開発ツール：WezTerm + Neovim

今回の操作環境としては、上記のようなものです。

英字キーボードを外付けしている&複数の外部ディスプレイを接続している、ということが記事の背景となります。

## やりたいこと

Macを初めて使うユーザーのお悩みとして、以下のようなものがあるのではないでしょうか？

- Commandキーって一体なんのキー...？
- Ctrl+C/Ctrl+Vでコピー&ペーストができない...
- Ctrl↔Cmdの入れ替えを標準オプションから設定してみたはいいけど、求めてないキー操作まで入れ替わってしまう...
- Windowsキー(の位置にあるCommandキー)＋矢印キーでウィンドウの半分表示や移動ができない
- Windowsユーザーに共有されたフォルダパスで開けない...

これらのうちの多くは、Macのキーバインディングやツールに慣れたり活用することで解決する、もしくはより効率的な操作できると思います。

思い...ますが、私はなるべくお手軽に単一のツールで解決し、かつ使用感はLinuxやWindowsに寄せたいです。

その頑固な意思が背景にありましたが、Hammerspoonであれば、Luaで設定ファイルを記載することで自在に管理できました。

## やったこと

今回紹介することはシンプルな3つの設定です。

**1.キーバインディングの変更:**

- Ctrl+C/Ctrl+Vでコピーペーストができるように（エディタ系のアプリを除いて）
- Win+矢印キーでウィンドウの移動・半分化・最大化ができる（例: Win+左矢印でウィンドウを左半分に移動）

※上記キーの名称はキーボードの刻印見たまま。

<img src="/images/2024/20240222a/IMG_20240219_174617.jpg" alt="IMG_20240219_174617.jpg" width="1200" height="675" loading="lazy">

**2.ウィンドウ操作の変更:**

- Windowsライクなウィンドウ操作（半分表示、最大化、ディスプレイ間移動）

**3.パスの相互変換:**

- WindowsパスとMacパスの相互変換をメニューバーに常駐させることで簡単に実行

<img src="/images/2024/20240222a/image_(12).png" alt="image_(12).png" width="284" height="146" loading="lazy">

特に、Windowsユーザーから共有されるパスの相互変換機能は、メニューバーにアイコンを常駐させることで、操作によりクリップボード上のパスを変換する方法としました。これにより、`\\ホスト名\フォルダ名` (Windows) と `smb://ホスト名/フォルダ名`(Mac) の間での変換を簡単に行うことができます。

## キーボード設定

すべての変更をHammerspoonで管理しています！ と言いたいところですが、試行錯誤の結果、自然な操作感とするためModifier Keysについては以下のようにスワップしています。

<img src="/images/2024/20240222a/image.png" alt="image.png" width="672" height="403" loading="lazy">

上記設定とHammerspoon側の設定を合わせることで、キー操作を定義する形です。

## Hammerspoon設定編

さて、ここからが本題です。実際にHammerspoonの設定例を紹介していきます。

Hammerspoonの設定ファイルは`~/.hammerspoon/init.lua`に配置され、Lua言語で記載します。

また、メニューバー上からも`Open Config`にて開くことができる親切仕様です。

設定ファイルの記載内容としては、ドキュメントがかなり整備されており下記を参照することで一通り記載されています。
https://www.hammerspoon.org/docs/index.html

上記のドキュメントの中でも、今回紹介するものは、以下の4つです。

- キーバインディング操作
- ウィンドウ操作
- メニューバーへのアイテム作成
- クリップボード操作

以降のセクションでは実際の実装例として紹介していきます。

※1つのファイルに記載すると煩雑であったため、`init.lua`から各設定のLuaファイルを読み込むように分割して構成しています

## 1. Hammerspoon設定(キーバインディング編)

https://www.hammerspoon.org/docs/hs.eventtap.html

キーバインディングについては、`hs.eventtap`の章に記載されている各関数使用することで、入力キーの入れ替えなどの操作ができます。

今回はCtrl/Cmdキーの入れ替えをいい感じにしたかったので、以下のように実装しています。

標準設定でModifier Keysを一部入れ替えていることを前提に、スクリプトで一部操作を上書きするイメージですね。

```lua modules/key_bindings.lua
local key_bindings = {}
-- local logger = hs.logger.new("key_bindings.lua", "debug")

local console_apps = {
  ["Terminal"] = false,
  ["iTerm2"] = true,
  ["WezTerm"] = true,
}

local special_combos = {
  c = false,
  v = false,
  space = true,
}

-- コンソールアプリ以外でCtrl,Cmdキーの入れ替えを行う
local function swapCmdCtrl(event)
  local flags = event:getFlags()
  local key_code = event:getKeyCode()
  local key_char = hs.keycodes.map[key_code]

  local front_app = hs.application.frontmostApplication()

  if console_apps[front_app:name()] and flags["cmd"] then
    if special_combos[key_char] then
      return false
    end

    local modifier_keys = {"ctrl"}

    if flags["shift"] then
      modifier_keys[#modifier_keys + 1] = "shift"
    end
    if flags["alt"] then
      modifier_keys[#modifier_keys + 1] = "alt"
    end
    hs.eventtap.event.newKeyEvent(modifier_keys, key_char, true):post()
    hs.eventtap.event.newKeyEvent(modifier_keys, key_char, false):post()
    return true
  end

  return false
end

function key_bindings.start()
  key_bindings.eventtap = hs.eventtap.new({hs.eventtap.event.types.keyDown}, swapCmdCtrl)
  key_bindings.eventtap:start()
end


function key_bindings.stop()
  if key_bindings.eventtap then
    key_bindings.eventtap:stop()
    key_bindings.eventtap = nil
  end
end

return key_bindings
```

```lua init.lua
-- keyBindigsを有効化する
key_bindings.start()

hs.reload = function()
  key_bindings.stop()
  hs.reload()
end
```

ちょっぴり複雑な背景としては、ターミナル系アプリおよびエディタの操作時にはいくつか例外としたいものがあったためです。

他のOSから持ってきた設定ファイルをそのまま使いたかったことや、`Ctrl + C`で処理を中止(SIGINTシグナルを送信)できるようにしておきたかったことがあります。

素朴なキー入れ替えだとCtrl + Spaceでの文字入力変換や、他OSで定義したVimのショートカットをそのまま使うことができませんでした。

上記の設定にすることで、他OSで設定した設定ファイルをそのまま持ち込めています。

## 2. Hammerspoon設定(ウィンドウ操作編)

ウィンドウ操作としては、Windowsのキーバインディングに寄せたいと思ってました。

画面の半分に移動したり、
<img src="/images/2024/20240222a/image_2.png" alt="" width="841" height="247" loading="lazy">

最大化したり、
<img src="/images/2024/20240222a/image_3.png" alt="" width="839" height="242" loading="lazy">

ディスプレイ間を移動したり、
<img src="/images/2024/20240222a/image_4.png" alt="" width="830" height="243" loading="lazy">

などの操作ですね。Windowsではこれらはデフォルトのショートカットキーとなっていますが、Macでも再現をしたいといったことがモチベーションです。

https://www.hammerspoon.org/docs/hs.window.html#moveToUnit

Hammerspoonでは、`hs.window`に記載されている各関数でウィンドウの操作が可能になっています。

今回は、以下のように実装しました。

```lua modules/window_manager.lua
local window_management = {}

-- アクティブウィンドウを画面の左半分に移動する関数
function window_management.moveWindowLeft()
  local win = hs.window.focusedWindow()
  if win then
    win:moveToUnit(hs.layout.left50)
  end
end

-- アクティブウィンドウを画面の右半分に移動する関数
function window_management.moveWindowRight()
  local win = hs.window.focusedWindow()
  if win then
    win:moveToUnit(hs.layout.right50)
  end
end

-- アクティブウィンドウを画面の最大化する
function window_management.maximizeWindow()
  local win = hs.window.focusedWindow()
  if win then
    win:maximize()
  end
end

-- アクティブウィンドウを画面の最小化する
function window_management.minimizeWindow()
  local win = hs.window.focusedWindow()
  if win then
    local app = win:application()
    app:hide()
  end
end

-- アクティブウィンドウを次のスクリーンに移動
function window_management.moveWindowNextScreen()
  local win = hs.window.focusedWindow()
  if win then
    local nextScreen = win:screen():next()
    win:moveToScreen(nextScreen, true, true)
  end
end

-- アクティブウィンドウを前のスクリーンに移動
function window_management.moveWindowPrevScreen()
  local win = hs.window.focusedWindow()
  if win then
    local prevScreen = win:screen():previous()
    win:moveToScreen(prevScreen, true, true)
  end
end

return window_management
```

```lua init.lua
hs.hotkey.bind({"option"}, "Left", window_management.moveWindowLeft)
hs.hotkey.bind({"option"}, "Right", window_management.moveWindowRight)
hs.hotkey.bind({"option"}, "Up", window_management.maximizeWindow)
hs.hotkey.bind({"optionn"}, "Down", window_management.minimizeWindow)
hs.hotkey.bind({"option", "shift"}, "Left", window_management.moveWindowNextScreen)
hs.hotkey.bind({"option", "shift"}, "Right", window_management.moveWindowPrevScreen)
```

上記の設定により、Windowsライクなウィンドウの移動・サイズ変更操作ができています。

## 3. Hammerspoon設定(パス相互変換編)

最後に、パス変換の紹介です。

WindowsとMacのパス表記の間には、小さくそして大きな差異があることには度々苦しめられると思います。

区切り文字が違ったり、ファイルサーバーのパスが異なったりですね。
(`\\ホスト名\フォルダ名` <-> `smb://ホスト名/フォルダ名`のようなもの)

この変換については濁点の扱いであったりUTF-8の扱いなど闇が深い部分も多いので詳細は触れず、一部簡単にした例を紹介します。

パス変換の実施方法はいろいろあると思いますが、今回はメニューバーに変換を常駐させておき、操作によりクリップボード上のパスを変換する方法としました。

<img src="/images/2024/20240222a/image_(12)_2.png" alt="" width="284" height="146" loading="lazy">

https://www.hammerspoon.org/docs/hs.menubar.html

Hammerspoonでは、`hs.menubar`に記載された各関数を使用することで、Mac上のメニューバーにドロップダウンメニューを表示できます。

https://www.hammerspoon.org/docs/hs.pasteboard.html

また、クリップボード操作については`hs.pasteboard`に記載された各関数を使用することで実施できます。

今回は、メニュー上に表示した変換メニューを押下することで、クリップボードからテキストを取得して変換し、クリップボードに返すような挙動としました。

実装例としては、以下のようになります。

```lua modules/path_converter.lua
-- MacのファイルパスをWindows形式に変換する
function convertWindowsPathToMac(windowsPath)
    local macPath = windowsPath:gsub("\\", "/"):gsub("C:", "~/")
    return macPath
end
-- MacのSMBパスをWindowsのUNC形式に変換する
function convertMacPathToWindows(macPath)
    local windowsPath = macPath:gsub("~/", "C:"):gsub("/", "\\")
    return windowsPath
end
-- WindowsのファイルパスをMac形式に変換する
function convertUncWindowsPathToMac(windowsPath)
    local macPath = windowsPath:gsub("\\\\","smb://"):gsub("\\", "/")
    return macPath
end
-- WindowsのUNC形式パスをMacのSMBパスに変換する
function convertUncMacPathToWindows(macPath)
    local windowsPath = macPath:gsub("smb://", "\\\\"):gsub("/", "\\")
    return windowsPath
end

local menuBarItem = hs.menubar.new()

menuBarItem:setTitle("WinMac PathConverter")

menuBarItem:setMenu({
    {title = "Convert Clipboard to Mac Path", fn = function()
        local clipboardContents = hs.pasteboard.getContents()
        local convertedPath = convertWindowsPathToMac(clipboardContents)
        hs.pasteboard.setContents(convertedPath)
        hs.alert.show("Converted to Mac Path: " .. convertedPath)
    end
    },
    {title = "Convert Clipboard to Windows Path", fn = function()
        local clipboardContents = hs.pasteboard.getContents()
        local convertedPath = convertMacPathToWindows(clipboardContents)
        hs.pasteboard.setContents(convertedPath)
        hs.alert.show("Converted to Windows Path: " .. convertedPath)
    end
    },
    {title = "Convert Clipboard to Mac Path(UNC)", fn = function()
        local clipboardContents = hs.pasteboard.getContents()
        local convertedPath = convertUncWindowsPathToMac(clipboardContents)
        hs.pasteboard.setContents(convertedPath)
        hs.alert.show("Converted to Mac Path: " .. convertedPath)
    end
    },
    {title = "Convert Clipboard to Windows Path(UNC)", fn = function()
        local clipboardContents = hs.pasteboard.getContents()
        local convertedPath = convertUncMacPathToWindows(clipboardContents)
        hs.pasteboard.setContents(convertedPath)
        hs.alert.show("Converted to Windows Path: " .. convertedPath)
    end
    },
    {title="Quit", fn= function() hs.hints.showTitleThresh =0 end},
})
```

```lua init.lua
local path_converter = require "modules.path_converter"
```

上記の設定により、メニューバーからパス変換をし、変換内容についてはダイアログ表示できました。

実行時のイメージは以下のようなものです。

クリップボードにパスをコピーした上で、Macのメニューバー上に作成したプルダウンから、作成した関数をトリガーすることで画像のようなアラートを表示する＆クリップボードに変換後パスを保存できます。

<img src="/images/2024/20240222a/image_5.png" alt="image.png" width="720" height="355" loading="lazy">

Luaスクリプトをより煮詰めることで、さらにいろんなパスケースや文字列変換にも対応させることが可能です。

## まとめ

本記事では、Hammerspoonを導入して実現したMacのキーバインディング・ウィンドウ操作・クリップボードの文字列としてのパス変換の3つを紹介しました。

こういったHammerspoonの設定を通して、Macの操作にいまだに不慣れな私でも、個人的にはWindows/Linuxライクな操作ができるようになっています。

正直、今回記事で実施した操作は他のアプリの組み合わせでも実行できるとは思いますが、こういった設定はして暫く経つとどのツールを組み合わせているのか、どこに設定ファイルがあるのか、また記載内容が読めなくなっているのが私の常です。

そういった意味で、HammerspoonではLuaファイル一本で設定できるので振り返りやすく、また自由度も高いという意味で個人的には良かったです。
(NeovimのLuaファイル設定と同じ感覚でできました)

Macを使う、けど操作に慣れない...！ スクリプトでゴリゴリいじりたい...！ といった方におすすめしたいとおもいます。

## 参考文献

- https://www.hammerspoon.org/docs/index.html
