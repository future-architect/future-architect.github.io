---
title: "VS CodeによるiOSアプリ開発入門〜ビルド＆ラン〜"
date: 2025/04/25 00:00:00
postid: a
tag:
  - VSCode
  - Swift
  - iOS
  - Xcode
category:
  - Programming
thumbnail: /images/2025/20250425a/thumbnail.png
author: 清水雄一郎
lede: "SwiftにおけるiOS開発といえば、やはりXcodeを使っている方が多いと思います。ただ最近は、VS Codeに魅力的な拡張機能（特に生成AIを活用したもの）が多く、活用していきたいと思うようになりました。"
---
## はじめに

こんにちは。HealthCare Innovation Group(HIG)の清水雄一郎です。
VSCodeだと思っていたのですが、厳密（？）にはVS Codeであることに気づいた今日この頃です。

<details><summary>参考画像: MicrosoftのVS Codeダウンロードサイトでの表記</summary>

https://azure.microsoft.com/ja-jp/products/visual-studio-code
<img src="/images/2025/20250425a/image.png" alt="image.png" width="842" height="518" loading="lazy">
</details>

[春の入門祭り2025](/articles/20250413a/) 10日目の記事です。

SwiftにおけるiOS開発といえば、やはりXcodeを使っている方が多いと思います。

ただ最近は、VS Codeに魅力的な拡張機能（特に生成AIを活用したもの）が多く、活用していきたいと思うようになりました。

「Xcodeを最小限に抑えて、VS CodeでiOSアプリ開発してみたらどうなるんだろう？」という好奇心から、今回ちょっとした実験をしてみることにしました。

この記事では、VS Code（周辺ツール）だけでどこまでiOSアプリ開発するためにどのような準備が必要か、検証した記録をまとめていきます。

## 環境

- MacBook Air (M2, 2022)
- macOS 15.4.1
- Xcode 16.3

## 事前準備

VS Code上で、次の拡張機能をインストールします。

- [Swift - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=swiftlang.swift-vscode)

また、検証用にXcode上で`TechBlogSpring2025`というiOSアプリプロジェクトを作成しておきます。

- [Creating an Xcode project for an app | Apple Developer Documentation](https://developer.apple.com/documentation/xcode/creating-an-xcode-project-for-an-app)

## ゴール

iOSアプリがビルド＆実行できるようになること。
※テストやコード補完などは、本記事では扱いません。

### ビルド

まずはビルドです。Xcode上では、`⌘ + B` に相当するものです。

VS Codeにはそういったショートカットキーはないため、CLIから実行していきます。

Xcodeがインストールされている場合は、`xcodebuild`コマンドが利用できると思いますので、そちらを利用して実行します。

今回サンプルで用意したプロジェクトを用いてiOSシミュレータ用にアプリをビルドする場合、次のようなコマンドになるかと思います。

```sh
xcodebuild -workspace TechBlogSpring2025.xcodeproj/project.xcworkspace \
           -scheme TechBlogSpring2025 \
           -sdk iphonesimulator \
           -configuration Debug \
           build

~~ 省略 ~~

** BUILD SUCCEEDED **

```

無事ビルド成功しましたが、毎回このコマンドを打つのは手間です。解消するために、VS Codeには外部ツールを実行する方法としてタスクを登録できる[^1]ため、そちらを用意します。

```json tasks.json
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "shell",
            "label": "Xcode Build - Debug",
            "detail": "xcodebuild debug",
            "command": "xcodebuild",
            "args": [
                "-workspace",
                "TechBlogSpring2025.xcodeproj/project.xcworkspace",
                "-scheme",
                "TechBlogSpring2025",
                "-sdk",
                "iphonesimulator",
                "-configuration",
                "Debug",
                "build"
            ],
            "group": "build"
        }
    ]
}
```

タスクを登録しておくと、`⌘ + ⇧ + B` で簡単にビルドを実行できるようになります🎉

<img src="/images/2025/20250425a/スクリーンショット_2025-04-25_7.03.56.png" alt="" width="1200" height="194" loading="lazy">

### 実行

次は実行です。これが結構手間でした。

Xcode上では、`⌘ + R` に相当するものです。実行するスキーマと端末（今回はシミュレータ）を選択して`⌘ + R`を押せばアプリがビルドされ、シミュレータ上でアプリが起動します。

<img src="/images/2025/20250425a/スクリーンショット_2025-04-25_7.30.55.png" alt="" width="1200" height="750" loading="lazy">

見慣れた光景ではあるのですが、Xcodeなしで同じことをやろうとするといくつかのステップが必要です。

> アプリがビルドされ、シミュレータ上でアプリが起動します。

これを分解すると、次のようなステップになります。

1. アプリをビルドする
1. 実行したい機種のシミュレータを起動する
1. 起動したシミュレータにアプリをインストールする
1. シミュレータでアプリを起動する

それぞれ順にCLI上で実行する場合は、次のようになります。

```sh アプリをビルドして、シミュレータ上で起動する
xcodebuild -workspace TechBlogSpring2025.xcodeproj/project.xcworkspace \
           -scheme TechBlogSpring2025 \
           -sdk iphonesimulator \
           -configuration Debug \
           -derivedDataPath .build/ \ # シミュレーターにアプリをインストールする際に必要なので、出力先を任意の場所に指定する
           build
xcrun simctl boot "iPhone 16 Pro" # 実行したい機種のシミュレータを起動する
xcrun simctl install booted build/Debug-iphonesimulator/TechBlogSpring2025.app # 起動したシミュレータにアプリをインストールする
xcrun simctl launch booted "com.example.TechBlogSpring2025" # シミュレータでアプリを起動する
```

これで晴れてビルドしたアプリをシミュレータ上で確認できます！

ただし、ビルドの時と同様にこれらを毎回実行するのは手間なのでVS Codeのタスクに登録してしまいましょう。

今回は4ステップあったので、4つのタスクを実行する必要があるのか？と思いました。

しかし、VS Codeのタスクには`dependsOn`プロパティを利用することで、登録した複数のタスクを1つにまとめて実行できるみたいです👏

以下はtasks.jsonの例です。

<details><summary>変更後のtasks.json</summary>

```json tasks.json
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "shell",
            "label": "Xcode Build - Debug",
            "detail": "xcodebuild debug",
            "command": "xcodebuild",
            "args": [
                "-workspace",
                "TechBlogSpring2025.xcodeproj/project.xcworkspace",
                "-scheme",
                "TechBlogSpring2025",
                "-sdk",
                "iphonesimulator",
                "-configuration",
                "Debug",
                "-derivedDataPath",
                ".build/",
                "build"
            ],
            "group": "build"
        },
        {
            "type": "shell",
            "label": "Boot Simulator",
            "command": "xcrun",
            "args": [
                "simctl",
                "boot",
                "iPhone 16 Pro"
            ],
            "group": "test"
        },
        {
            "type": "shell",
            "label": "Run App on Simulator",
            "command": "xcrun",
            "args": [
                "simctl",
                "install",
                "booted",
                ".build/Build/Products/Debug-iphonesimulator/TechBlogSpring2025.app"
            ],
            "group": "test",
            "dependsOn": "Xcode Build - Debug"
        },
        {
            "type": "shell",
            "label": "Launch App on Simulator",
            "command": "xcrun",
            "args": [
                "simctl",
                "launch",
                "booted",
                "yu1Ro5.TechBlogSpring2025"
            ],
            "group": "test",
            "dependsOn": "Run App on Simulator"
        },
        {
            "type": "shell",
            "label": "Build and Run Sequence",
            "dependsOn": [
                "Xcode Build - Debug",
                "Boot Simulator",
                "Run App on Simulator",
                "Launch App on Simulator"
            ],
            "dependsOrder": "sequence",
            "group": "test"
        }
    ]
}
```

</details>

::: note warn
シミュレータを起動後に、再度起動するタスクを実行すると既に起動しているためエラーとなり、2回目以降はシミュレータの起動をスキップするタスクを別途構成する必要がありそうです。
:::

## 試してみて

今回チャレンジできなかった部分も含めて、XcodeとVS Code(w/ 拡張機能)で開発する場合、次のように使い分けようかと考えています。当初はXcode離れしたいモチベーションがありましたが、PreviewやInstrumentsなど、代替が見つけられなかった機能もあるため、適宜使い分けることができるといいなと思います。

- Xcodeを使う時
  - Preview[^2] 機能を使って、UIを作り込む
  - アプリのアップロードなど、アプリ署名に関わる操作をする時
  - Instruments[^3] 機能を使って、アプリのパフォーマンスを測定する時
  - アプリの開発用証明書やプロビジョニングプロファイルの管理や設定時
  -> Xcodeのプロジェクトファイルは、人間が目で見てわかるものではないため
- VS Codeを使う時
  - 業務ロジックやテストなどのUI以外の実装時
  -> 生成AI活用した拡張機能使いやすいだけでも、使う価値あると思いました
  - MarkdownやJSON、YAMLなど、Swiftファイル以外を編集する時

## まとめ

Xcodeの利用を最小限に抑えて、VS CodeでiOSアプリ開発してみようという話でした。

本記事で挑戦した範囲では、Xcodeを使わずにVS Codeを開発業務に利用するというレベルまでは到達していません。しかし、アプリをビルド＆実行するまでの内部的な仕組みの理解度が高まるいいきっかけになりました。

一方、執筆にあたり試行錯誤する中で、SweetPad[^4]という今回準備した諸々をいい感じにセットアップしてくれるVS Code拡張機能に出会いました。この記事で詳しく紹介するまで辿り着けなかったですが、興味ある方はぜひ調べてみてください。

最後まで読んでいただき、ありがとうございました。

[^1]: https://code.visualstudio.com/docs/debugtest/tasks
[^2]: https://developer.apple.com/documentation/xcode/previewing-your-apps-interface-in-xcode
[^3]: https://help.apple.com/instruments/developer/mac/current/
[^4]: https://sweetpad.hyzyla.dev/
