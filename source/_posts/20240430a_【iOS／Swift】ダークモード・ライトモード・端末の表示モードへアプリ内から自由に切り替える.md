---
title: "【iOS/Swift】ダークモード・ライトモード・端末の表示モードへアプリ内から自由に切り替える"
date: 2024/04/30 00:00:00
postid: a
tag:
  - iOS
  - Swift
  - SwiftUI
category:
  - Infrastructure
thumbnail: /images/20240430a/thumbnail.jpeg
author: 橋本竜我
lede: みなさん、お使いのiPhoneではダークモードorライトモードどちらに設定していますか。それとも、Automaticに設定していますか。
---
[春の入門連載](/articles/20240408a/)の14本目です。

# はじめに
HealthCare Innovation Group(HIG)[^1]所属の橋本です。

みなさん、お使いのiPhoneではダークモードorライトモードどちらに設定していますか。

それとも、Automaticに設定していますか。

<img src="/images/20240430a/46491578-7e42-ab93-f1eb-793c2d70c499.jpeg" alt="" width="863" height="721" loading="lazy">

私は、単純に黒っぽい画面にテンションが上がるタイプなので常時ダークモードで使っています。

目に優しいのはダークモードではなく、ライトモードみたいな記事も拝見したことがあり、一度ダークモードからライトモードに変更したこともありますが、結局ダークモードに落ち着いています。

そんなiPhoneにおけるダークモード・ライトモードの切り替えをアプリ内から行う方法の例を紹介したいと思います。

# 環境

- OS：macOS Sonoma 14.4.1
- Xcode：15.3 (15E204a)
- Swift：5.10

# ゴールイメージ

今回作成する表示モードをピッカーで選択できる設定画面です。

<img src="/images/20240430a/Simulator_Screen_Recording_-_iPhone_15_Pro_-_2024-04-12_at_23.16.27.gif" alt="Simulator_Screen_Recording_-_iPhone_15_Pro_-_2024-04-12_at_23.16.27.gif" width="240" height="520" loading="lazy">

# 実装方法
まず、切り替えたい３つの表示モードを列挙型で定義しておきます。

```swift
enum DisplayMode: String {
    case light
    case dark
    case system
}
```

続いて、アプリ全体に対して、表示モードを適用させたいと思います。

このときに、[.preferredColorScheme](https://developer.apple.com/documentation/swiftui/view/preferredcolorscheme(_:))と三項演算子を用いて条件分岐を行います。
`displayMode`が`.system`のときに、nilを返すことでシステムのデフォルトの設定を反映できるようにしています。また、`displayMode`が`.system`ではないときは、`diplayMode`が'.dark'であるときは、[ColorScheme](https://developer.apple.com/documentation/swiftui/colorscheme)の`.dark`が適用され、そうでないときは`.light`が適用されます。

```swift
.preferredColorScheme(displayMode == .system ? nil : (displayMode == .dark ? .dark : .light))
```
これをエントリーポイントである`〜App.swift`ファイルに次のように記載します。

```swift
import SwiftUI

@main
struct displayModeApp: App {
    @AppStorage("displayMode") var displayMode: DisplayMode = .system

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(
                    displayMode == .system ? nil : (displayMode == .dark ? .dark : .light)
                )
        }
    }
}
```

最後に、`Picker`を用いて、表示モードを変更させるViewを作成します。

`Picker`の`selection:`パラメータには`$displayMode`がバインドさせています。これは、選択された値が直接`displayMode`プロパティに保存されることを意味します。
それぞれの`tag()`メソッドに`DisplayMode`の対応する値が設定されています。これにより、ユーザーがピッカーで選択した表示モードが、`DisplayMode`型の`displayMode`に適切に保存することが可能になります。


```swift
struct ContentView: View {
    @AppStorage("displayMode") var displayMode: DisplayMode = .system

    var body: some View {
        NavigationStack {
            List {
                Section("App Settings") {
                    Picker("Theme Color", selection: $displayMode) {
                        Text("Light")
                            .tag(DisplayMode.light)
                        Text("Dark")
                            .tag(DisplayMode.dark)
                        Text("System")
                            .tag(DisplayMode.system)
                    }
                    .pickerStyle(.automatic)
                }
            }
            .navigationTitle("Settings")
        }
    }
}
```

Done！

これでアプリ内から強制的に、ダークモード、ライトモードに変更させることができるようになりました。

触れていませんでしたが、@AppStoregeで端末内部に`DisplayMode`を記憶させているので、アプリキル後に立ち上げた際には、以前の設定値が保存されるようにもなっています。


# おわりに
ダークモード・ライトモード・端末の設定のモードにアプリ内から切り替える方法を扱いました。

このようにダークモード、ライトモードを変えること自体は簡単ですが、それぞれの色を各画面に対応させるほうが大変ですね。色の管理にはAsset Catalogを使うことでダークモード、ライトモードの色を設定しておく方法がありますが、このあたりについても、うまいやり方があればご紹介したいと思います。


# 参考

- https://developer.apple.com/documentation/uikit/uisplitviewcontroller/1623194-displaymode
- https://developer.apple.com/documentation/swiftui/view/preferredcolorscheme(_:)
- https://developer.apple.com/documentation/swiftui/colorscheme

[^1]: 医療・ヘルスケア分野での案件や新規ビジネス創出を担う、2020年に誕生した事業部です。設立エピソードは[未来報](https://note.future.co.jp/n/n8b57d4bf4604)の記事をご覧ください。

