---
title: "Embedded Swiftを用いた組み込み開発入門"
date: 2025/04/16 00:00:00
postid: a
tag:
  - Swift
  - RaspberryPi
  - 電子工作
category:
  - IoT
thumbnail: /images/2025/20250416a/thumbnail.png
author: 橋本竜我
lede: "Embedded Swiftを用いてRaspberry Pi Pico WをLチカさせてみました！"
---

こんにちは！HealthCare Innovation Group(HIG)[^1]所属の橋本です。

本記事は、[春の入門祭り2025](/articles/20250413a/)の3本目です。

# はじめに

昨年のWWDC2024のセッション[Embedded Swiftでサイズを縮小](https://developer.apple.com/jp/videos/play/wwdc2024/10197/)でSwiftで組み込み開発ができることを知り、今回実際にEmbedded Swiftを用いてRaspberry Pi Pico WをLチカさせてみました！

実際に、サンプルプロジェクトを動作させるまでに組み込み開発初心者視点で詰まった箇所や知らなかったことなども一緒に紹介したいと思います。

::: note warn
注意: Embedded Swiftはまだ試験的な段階のため、この記事の情報は古くなっている可能性があります。
:::

## Embedded Swiftとは

Embedded Swiftとは、メモリやストレージに制約のある環境でも使えるように、Swiftの柔軟性を保ちつつ、動的機能を制限してサイズを小さくしたSwiftのサブセット言語です。

**Embedded Swiftの強み:**

Swiftの強みである型安全・所有権管理・自動メモリ管理といった利点を組み込み開発にも適用できることが最大のメリットです。これはCやC++での組み込み開発におけるメモリリークやバッファオーバーフローといった不具合が発生しやすいことや安全性の確保が難しいという課題を解消することにもつながります。

**Embedded Swiftの制約:**

組み込み開発の現場では、メモリやストレージが極めて限られており、従来のSwiftランタイム（約5MB）では到底収まりません。たとえば、ArduinoやSTM32などのボードでは、使用可能なRAMがたった数十〜数百KBというケースも珍しくありません。Embedded Swiftは、このような制約環境でも動作可能な、軽量なSwiftの実行モデルを提供します。

Embededed Swiftでは、以下のSwiftが提供する動的機能を制限することでコードサイズを小さくすることを実現しています。

- 動的リフレクション（reflection）
  - [Mirror型](https://developer.apple.com/documentation/swift/mirror)
  - as?を用いたダウンキャスト
- 存在型（existentials）
  - any型
- ABIの安定性とライブラリの進化への対応
- 別コンパイルされたジェネリクス
- 動的コード読み込み（プラグインなど）

次の図は、Swiftランタイムと標準ライブラリのサイズ縮小に関する既存の取り組みとEmbedded Swiftがどのようにアプローチしているかを示しています。（[swiftlang/swift-evolution/visions/embedded-swift.md](https://github.com/swiftlang/swift-evolution/blob/main/visions/embedded-swift.md)より引用）

<img src="/images/2025/20250416a/image.png" alt="" width="1200" height="651" loading="lazy">

より詳細なEmbedded Swiftの制約は以下を参照してください。

[swift/docs/EmbeddedSwift/EmbeddedSwiftStatus.md](https://github.com/swiftlang/swift/blob/main/docs/EmbeddedSwift/EmbeddedSwiftStatus.md)

# Embedded Swiftを用いてRaspberry Pi Pico WをLチカさせる

レポジトリ[apple/swift-embedded-examples](https://github.com/apple/swift-embedded-examples)にいくつかのサンプルプロジェクトがあるなかで、今後色々電子工作で楽しめそう、かつ情報も豊富そうなRaspberry Pi Pico Wに関するプロジェクトを実際に試して見ることにしました。

以下のサンプルプロジェクトを使って、Embedded Swiftを用いてRaspberry Pi Pico WをLチカさせたいと思います。

- [apple/swift-embedded-examples/pico-w-blink-sdk](https://github.com/apple/swift-embedded-examples/tree/main/pico-w-blink-sdk)

このプロジェクトは、公式が提供しているPico-sdkを用いることで、基本的な機能等はSDKに持たせ、どのように動作させるかなどはEmbedded Swiftで実装していくようなものです。

::: note info
推奨: Embedded Swiftを試す前に、[Raspberry Pi公式のチュートリアル](https://datasheets.raspberrypi.com/pico/getting-started-with-pico.pdf)を参考にRaspberry Pi Pico WでLチカさせることをおすすめします。Embedded Swiftのドキュメンテーションでも、推奨されています。
:::

### 実行環境

- macOS: 15.4（24E248）
- Swift: Apple Swift version 6.2-dev (LLVM 3f3fde0d5f85709, Swift 0c5fd6a3017961d)
- MacBookPro 13-inch M1(2020)
- Raspberry Pi Pico W

### 事前準備

次のドキュメントに沿って事前準備行います。
- [apple/swift-embedded-examples](https://github.com/apple/swift-embedded-examples/tree/main?tab=readme-ov-file#building-the-examples)

その後、今回使用するRaspberry Pi Pico Wに対するサンプルプロジェクトの`README.md`に沿ってビルドランまで行います。

- [apple/swift-embedded-examples/pico-w-blink-sdk](https://github.com/apple/swift-embedded-examples/tree/main/pico-w-blink-sdk)

## 最新のdevelopment snapshotのToolchainをインストール

次のサイトから、最新のdevelopment snapshotのToolchainをインストールします。
https://www.swift.org/install/macos/#development-snapshots

<img src="/images/2025/20250416a/スクリーンショット_2025-04-08_9.48.27.png" alt="" width="1200" height="580" loading="lazy">

Toolchainがインストールされたことを確認します。`swift-DEVELOPMENT-SNAPSHOT-2025-04-03-a.xctoolchain`が追加した Toolchainです。タイミングによっては、より新しいものになっていると思います。

```sh
$ ls /Library/Developer/Toolchains/

swift-DEVELOPMENT-SNAPSHOT-2025-04-03-a.xctoolchain	swift-latest.xctoolchain
```

追加したToolchainが使用できるように、パスを通します。

```sh
$ vi ~/.zshrc
export PATH="/Library/Developer/Toolchains/swift-DEVELOPMENT-SNAPSHOT-2025-04-03-a.xctoolchain/usr/bin:$PATH"
export TOOLCHAINS="/Library/Developer/Toolchains/swift-DEVELOPMENT-SNAPSHOT-2025-04-03-a.xctoolchain/usr/bin"
```

`Swift`のバージョンが次のように変わっていることを確認します。

```sh
$ swift -version

Apple Swift version 6.2-dev (LLVM 3f3fde0d5f85709, Swift 0c5fd6a3017961d)
Target: arm64-apple-macosx15.0
Build config: +assertions
```

## Raspberry Pi Pico SDK（pico-sdk）の準備

続いて、pico-sdkの準備をします。

- [pico-sdk](https://github.com/raspberrypi/pico-sdk)をクローン

    ```sh
    git clone https://github.com/raspberrypi/pico-sdk.git
    cd pico-sdk
    git submodule update --init
    ```

- [pico-examples](https://github.com/raspberrypi/pico-examples)をクローン

    ```sh
    git clone https://github.com/raspberrypi/pico-examples.git
    ```

- CMake、ninja、The Arm Embedded Toolchainのインストール
HomeBrewを使ってそれぞれインストールします。

    ```sh
    brew install cmake
    brew install armmbed/formulae/arm-none-eabi-gcc　←ここ注意
    brew install ninja
    ```

::: note warn
注意: Homebrewのcore tapではなく、ARMmbedが管理するtapの`arm-none-eabi-gcc`をインストールしてください。
:::

## 環境変数の設定

次のように設定します。

```sh ~/.zshrc
export PATH="/Library/Developer/Toolchains/swift-DEVELOPMENT-SNAPSHOT-2025-04-03-a.xctoolchain/usr/bin:$PATH"
export TOOLCHAINS="/Library/Developer/Toolchains/swift-DEVELOPMENT-SNAPSHOT-2025-04-03-a.xctoolchain/usr/bin"
export PICO_BOARD=pico_w
export PICO_SDK_PATH={任意のディレクトリ}/pico-sdk
export PICO_TOOLCHAIN_PATH=/opt/homebrew/opt/arm-none-eabi-gcc/lib/
```

# ビルドラン

準備が完了したので、サンプルプロジェクト([apple/swift-embedded-examples/pico-w-blink-sdk](https://github.com/apple/swift-embedded-examples/tree/main/pico-w-blink-sdk))をビルドランしたいと思います。

CMakeを実行します。

```sh
cd pico-w-blink-sdk
cmake -B build -G Ninja . -DCMAKE_EXPORT_COMPILE_COMMANDS=On
```

完了すると、次のようなメッセージが出力されます。

```sh
-- Configuring done (0.3s)
-- Generating done (0.1s)
-- Build files have been written to: {任意のディレクトリ}/build
```

次に、ビルドします。

```sh
cmake --build build
```

無事ビルドが成功すれば、次のようなメッセージが末尾に表示されます。

```sh
[X/X] Linking CXX executable swift-blinky.elf
```

`build`フォルダ配下に`swift-blinky.uf2`ファイルができます。
このファイルをデバイスにコピーします。

そうすると、LEDが点滅します。

<img src="/images/2025/20250416a/blink_led_(1).gif" alt="" width="856" height="536" loading="lazy">

LEDを点滅させる処理は、`Main.swift`に次のように書かれています。

```swift Main.swift
@main
struct Main {
  static func main() {
    let led = UInt32(CYW43_WL_GPIO_LED_PIN)
    if cyw43_arch_init() != 0 {
      print("Wi-Fi init failed")
      return
    }
    let dot = {
      cyw43_arch_gpio_put(led, true)
      sleep_ms(250)
      cyw43_arch_gpio_put(led, false)
      sleep_ms(250)
    }
    let dash = {
      cyw43_arch_gpio_put(led, true)
      sleep_ms(500)
      cyw43_arch_gpio_put(led, false)
      sleep_ms(250)
    }
    while true {
      dot()
      dot()
      dot()

      dash()
      dash()
      dash()

      dot()
      dot()
      dot()
    }
  }
}
```

# ビルド時詰まった箇所とその解決策

`cmake --build build`を実行したときに、以下のエラーに遭遇したので、その原因と解決策について記載します。

```sh
arm-none-eabi-gcc: fatal error: cannot read spec file 'nosys.specs': No such file or directory
error: failed to emit precompiled header '.../BridgingHeader.pch' for bridging header '.../BridgingHeader.h'
error: 'inttypes.h' file not found
```

## 1. arm-none-eabi-gcc の nosys.specs が見つからない

`arm-none-eabi-gcc: fatal error: cannot read spec file 'nosys.specs': No such file or directory`というエラーは、はじめに、次のコマンドでHomeBrew版arm-none-eabi-gccをインストールしてしまったが良くありませんでした。

```sh
brew install arm-none-eabi-gcc
```

もう一度、[apple/swift-embedded-examples/pico-w-blink-sdk](https://github.com/apple/swift-embedded-examples/tree/main/pico-w-blink-sdk)を確認してみると`The Arm Embedded Toolchain.`とリンク付きで書いてありました。

<img src="/images/2025/20250416a/スクリーンショット_2025-04-12_14.40.39.png" alt="" width="1200" height="361" loading="lazy">

正しくは、以下のコマンドでARMmbed版のarm-none-eabi-gccをインストールします。

```sh
brew tap armmbed/formulae
brew install armmbed/formulae/arm-none-eabi-gcc
```

これでARM Toolchainのリンカを使ってバイナリファイルが無事生成できるはずです。

## 2. C言語の標準ヘッダが見つからない

次のエラーは、`sysroot`を認識しないことが一つの要因だと考えました。

```sh
error: failed to emit precompiled header '.../BridgingHeader.pch' for bridging header '.../BridgingHeader.h'
error: 'inttypes.h' file not found
```

そこで、Swiftコンパイラに`sysroot`を明示的に指定することで解決を行いました。

`CMakeLists.txt`に以下を追加します。

```sh
-Xcc --sysroot=/opt/homebrew/Cellar/arm-none-eabi-gcc/14.2.0/arm-none-eabi
```

具体的には、次のようになります。

<details><summary>CMakeLists.txt</summary>

```diff
cmake_minimum_required(VERSION 3.13)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)

project(swift-blinky)
pico_sdk_init()

if(APPLE)
execute_process(COMMAND xcrun -f swiftc OUTPUT_VARIABLE SWIFTC OUTPUT_STRIP_TRAILING_WHITESPACE)
else()
execute_process(COMMAND which swiftc OUTPUT_VARIABLE SWIFTC OUTPUT_STRIP_TRAILING_WHITESPACE)
endif()

add_executable(swift-blinky)
target_link_libraries(swift-blinky
    pico_stdlib hardware_uart hardware_gpio pico_lwip_arch pico_cyw43_arch_none
)

# Gather compile definitions from all dependencies
set_property(GLOBAL PROPERTY visited_targets "")
set_property(GLOBAL PROPERTY compilerdefs_list "")

function(gather_compile_definitions_recursive target)
    # Get the current value of visited_targets
    get_property(visited_targets GLOBAL PROPERTY visited_targets)

    # make sure we don't visit the same target twice
    # and that we don't visit the special generator expressions
    if (${target} MATCHES "\\$<" OR ${target} MATCHES "::@" OR ${target} IN_LIST visited_targets)
        return()
    endif()

    # Append the target to visited_targets
    list(APPEND visited_targets ${target})
    set_property(GLOBAL PROPERTY visited_targets "${visited_targets}")

    # Get the current value of compilerdefs_list
    get_property(compilerdefs_list GLOBAL PROPERTY compilerdefs_list)

    get_target_property(target_definitions ${target} INTERFACE_COMPILE_DEFINITIONS)
    if (target_definitions)
        # Append the target definitions to compilerdefs_list
        list(APPEND compilerdefs_list ${target_definitions})
        set_property(GLOBAL PROPERTY compilerdefs_list "${compilerdefs_list}")
    endif()

    get_target_property(target_linked_libs ${target} INTERFACE_LINK_LIBRARIES)
    if (target_linked_libs)
        foreach(linked_target ${target_linked_libs})
            # Recursively gather compile definitions from dependencies
            gather_compile_definitions_recursive(${linked_target})
        endforeach()
    endif()
endfunction()

gather_compile_definitions_recursive(swift-blinky)
get_property(COMPILE_DEFINITIONS GLOBAL PROPERTY compilerdefs_list)

# Parse compiler definitions into a format that swiftc can understand
list(REMOVE_DUPLICATES COMPILE_DEFINITIONS)
list(PREPEND COMPILE_DEFINITIONS "") # adds a semicolon at the beginning
string(REPLACE "$<TARGET_PROPERTY:PICO_TARGET_BINARY_TYPE>" "$<TARGET_PROPERTY:swift-blinky,PICO_TARGET_BINARY_TYPE>" COMPILE_DEFINITIONS "${COMPILE_DEFINITIONS}")
string(REPLACE ";" ";-Xcc;-D" COMPILE_DEFINITIONS "${COMPILE_DEFINITIONS}")

add_custom_command(
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/_swiftcode.o
    COMMAND
        ${SWIFTC}
        -target armv6m-none-none-eabi -Xcc -mfloat-abi=soft -Xcc -fshort-enums
        ${COMPILE_DEFINITIONS}
        -Xcc -DCYW43_LWIP
        -Xcc -DPICO_CYW43_ARCH_THREADSAFE_BACKGROUND
+        -Xcc --sysroot=//opt/homebrew/Cellar/arm-none-eabi-gcc/10.3-2021.10/gcc/bin/../arm-none-eabi
        -Xcc -I$ENV{PICO_SDK_PATH}/lib/lwip/src/include
        -Xcc -I${CMAKE_CURRENT_LIST_DIR}/include
        -Xfrontend -function-sections -enable-experimental-feature Embedded -wmo -parse-as-library
        $$\( echo '$<TARGET_PROPERTY:swift-blinky,INCLUDE_DIRECTORIES>' | tr '\;' '\\n' | sed -e 's/\\\(.*\\\)/-Xcc -I\\1/g' \)
        $$\( echo '${CMAKE_C_IMPLICIT_INCLUDE_DIRECTORIES}'             | tr ' '  '\\n' | sed -e 's/\\\(.*\\\)/-Xcc -I\\1/g' \)
        -import-bridging-header ${CMAKE_CURRENT_LIST_DIR}/BridgingHeader.h
        ${CMAKE_CURRENT_LIST_DIR}/Main.swift
        -c -o ${CMAKE_CURRENT_BINARY_DIR}/_swiftcode.o
    DEPENDS
        ${CMAKE_CURRENT_LIST_DIR}/BridgingHeader.h
        ${CMAKE_CURRENT_LIST_DIR}/Main.swift
)
add_custom_target(swift-blinky-swiftcode DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/_swiftcode.o)

target_link_libraries(swift-blinky
    ${CMAKE_CURRENT_BINARY_DIR}/_swiftcode.o
)
add_dependencies(swift-blinky swift-blinky-swiftcode)
pico_add_extra_outputs(swift-blinky)
```

</details>

# おわりに

Embedded Swiftを用いてLaspberry Pi Pico WをLチカさせることができました。

Laspberry Pi Pico Wを買うときに、電子工作のスターターキットで購入していたので、Embedded Swiftを使って様々な電子工作にもチャレンジしてみたいと思います。

# 参考

- [Embedded Swiftでサイズを縮小-WWDC24-ビデオ-Apple Developer](https://developer.apple.com/jp/videos/play/wwdc2024/10197/)
- https://github.com/swiftlang/swift-evolution/blob/main/visions/embedded-swift.md
- https://github.com/apple/swift-embedded-examples/
- https://github.com/apple/swift-embedded-examples/tree/main/pico-w-blink-sdk
- [GCCのsysrootオプションについて調べてみた](https://qiita.com/maskedw/items/e73df32007934e75d9e3)
- [Raspberry Pi PicoとEmbedded Swiftを試してみる - ANDPAD Tech Blog](https://tech.andpad.co.jp/entry/2024/12/26/100000)
- [iOSDC Japan 2024: Raspberry Pi Pico を Swift で操作する / yochidros](https://youtu.be/leqYl1JWw4Q?si=tcvF6EY63e3Ms55C)

[^1]: 医療・ヘルスケア分野での案件や新規ビジネス創出を担う、2020年に誕生した事業部です。設立エピソードは[未来報](https://note.future.co.jp/n/n8b57d4bf4604)の記事をご覧ください。
