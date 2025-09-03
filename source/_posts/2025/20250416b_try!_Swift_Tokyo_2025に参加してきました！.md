---
title: "try! Swift Tokyo 2025に参加してきました！"
date: 2025/04/16 00:00:01
postid: b
tag:
  - Swift
  - try!Swift
  - iOS
  - Xcode
  - 参加レポート
category:
  - Mobile
thumbnail: /images/2025/20250416b/thumbnail.jpeg
author: 橋本竜我
lede: "初めてtry! Swift Tokyo 2025に参加してきました！参加報告として、興味深かったセッションや参加して感じたことなどを共有します。"
---

<img src="/images/2025/20250416b/9addbdc8-d932-4dfc-ab35-fb5a7cf56fd0.jpeg" alt="" width="1080" height="1210" loading="lazy">

# はじめに

HealthCare Innovation Group(HIG)[^1]の橋本です。

初めてtry! Swift Tokyo 2025に参加してきました！

参加報告として、興味深かったセッションや参加して感じたことなどを共有します。

# try! Swift Tokyoとは

<img src="/images/2025/20250416b/image.png" alt="" width="1200" height="326" loading="lazy">

[公式HP](https://tryswift.jp/) の記載の通り、Swiftに関する国際カンファレンスです。今年は、2025年4月9日~11日の3日間で開催されました。

> **イベントについて**
Swiftを使った開発のコツや最新の事例を求めて世界中から開発者が集います。
日頃のSwiftの知識やスキルを披露し、協力しあうことを目的に、2025年4月9日 - 11日の３日間開催します！

開催場所: 立川ステージガーデン

<img src="/images/2025/20250416b/f8129b9e-b619-4d24-a198-4b7166a5e696.jpeg" alt="" width="1200" height="900" loading="lazy">

会場は、昭和記念公園が隣にあったり、自然と調和した商業施設も隣接していたり、とてもリラックスできるような場所でした。（立川ステージガーデンの椅子がとても座りやすく、セッションの視聴に集中することができました。）

## try! Swift Tokyo 2025のアプリ

try! Swift Tokyo 2025を楽しむための公式アプリがありました。

アプリ自体は、フルSwiftUI x TCAというモダンな構成で実装されているとのことなので、GitHubレポジトリから中身も見てみたいなと思います。

- AppStore: https://apps.apple.com/jp/app/try-tokyo-2025/id6479317240
- GitHub: https://github.com/tryswift/try-swift-tokyo

機能としては、スケジュールや会場までのルート、AI通訳などがありました。中でもAI翻訳がとても便利で、英語のセッションもリアルタイムで翻訳してくれていたので、とても助かりました。[Flitto](https://ja.flitto.com/portal/ja)さんありがとうございました。

- AI通訳機能画面

<img src="/images/2025/20250416b/06e5ab60-6582-4ab4-957d-cfe1e5f62750.png" alt="" width="600" height="1299" loading="lazy">

visionOS対応もしており、Apple Vision Proユーザーの方は、会場に表示されている壇上のスライドの上に、AI翻訳のウィンドウを表示させて見れてとても便利でしたという声もありました。（自分も体験してみたい。。。）

- [日本語でのSwiftプログラミングのスピーカーFlipByBlink DevさんのXへ投稿より](https://x.com/FlipByBlink/status/1909836805278683436)

<img src="/images/2025/20250416b/image_2.png" alt="image.png" width="600" height="483" loading="lazy">

# 良かった・役に立った・もっと理解したいと思ったセッション

私が視聴して良かった・役に立った・もっと理解したいと思ったセッションをいくつか紹介します。

::: note info
try! Swift Tokyo 2025の全セッションはtry!Swift TokyoのHPの[タイムテーブル](https://tryswift.jp/#timetable)からご確認ください。
:::

## iOS17,16,15での新機能(セッション動画は[こちら](https://youtu.be/qY09lmDo7GU?si=AMweGOy0GHKfX0Sz))

タイトルの通り、iOS17,16,15それぞれで新しい利用できるようになったAPIを紹介する発表でした。
WWDCのセッション動画で利用できると知っても、使えるようになるまでにタイムラグがあったりするのでこのタイミングでiOS17,16,15のAPIをいくつかキャッチアップできたのはとても良かったです。具体的には以下のAPIの紹介がありました。

**紹介のあったiOS 15.0+で使えるAPI:**

- `formatted()`
  - [formatteddate:time:)](https://developer.apple.com/documentation/foundation/date/formatted(date:time:))
  - [formatted(_:)](https://developer.apple.com/documentation/foundation/measurement/formatted(_:)) → 表示したい桁数を指定できる。こちらは使いどころがありそう
- `privacySensitive(_:)`
  - [privacySensitive(_:)](https://developer.apple.com/documentation/swiftui/view/privacysensitive(_:)) → 適用したViewを非表示にできる
- `.toggleStyle()`
  - [togglestyle(_:)](https://developer.apple.com/documentation/swiftui/view/togglestyle(_:)) → `.toggleStyle(.button)`などを使うことで組み込みのボタンの振る舞いが得られる

**紹介のあったiOS 16.0+で使えるAPI:**

- `UIHostingConfiguration`
  - [UIHostingConfiguration](https://developer.apple.com/documentation/SwiftUI/UIHostingConfiguration) → これにより、SwiftUIを簡単にUIKitに入れ込むことができる
- `TextField(_:,text:,axis: .vertical)`
  - [init(_:text:axis:)](https://developer.apple.com/documentation/swiftui/textfield/init(_:text:axis:)) → `TextField(_:,text:,axis: .vertical)`を使うことで、文字数が長くなったときに、テキストを途中で折り返し、テキストを全量表示できる
- `Color.gradient`
  - [gradient](https://developer.apple.com/documentation/swiftui/color/gradient) → デザイナーからの指定がないようなプロトタイプ作成のようなとりあえずグラデーションをかけたいときに便利

**紹介のあったiOS 17.0+で使えるAPI:**

- `ContentUnavailableView.search`
  - [ContentUnavailableView](https://developer.apple.com/documentation/swiftui/contentunavailableview) → .searchという静的プロパティで、検索結果がないときにViewを簡単に実装できる（ローカライズ対応や検索した文字をViewに簡単に組み込める）
- `SubscriptionStoreView`
  - [SubscriptionStoreView](https://developer.apple.com/documentation/storekit/subscriptionstoreview) → 簡単にサブスクリプション用のViewを構築できる
- `.scrolltargetbehavior`
  - [scrolltargetbehavior(_:)](https://developer.apple.com/documentation/swiftui/view/scrolltargetbehavior(_:)) → ページングなどにスクロールするときの振る舞いを指定できる（`.paged`や`.viewAligned`などがある）
- `.containerrelativeframe()`
  - [containerrelativeframe(_:alignment:)](https://developer.apple.com/documentation/swiftui/view/containerrelativeframe(_:alignment:)) → このモディファイアで全体のサイズを計算したうえで、各子Viewのサイズを決定できるため、`GeometryReader`を使用せず済ませることができる（参考記事: [【SwiftUI】ScrollView内でframeを指定せず、画面にあったサイズに調整する](https://qiita.com/SNQ-2001/items/266c7cec2ca8576254e1)）
- `.visualEffect()`
  - [visualEffect(_:)](https://developer.apple.com/documentation/swiftui/view/visualeffect(_:)) → `GeometryReader`を使用せずに、視覚効果を与えることができる
- `.contentTransition(.numericText())`
  - [contenttransition(_:)](https://developer.apple.com/documentation/swiftui/view/contenttransition(_:))
  - [numericText(countsDown:)](https://developer.apple.com/documentation/SwiftUI/ContentTransition/numericText(countsDown:)) → 数字のカウントダウン、アップのアニメーションをリッチなものにできる

## 日本語でのSwiftプログラミング(セッション動画は[こちら](https://youtu.be/uVgxJpSvp-I?si=2V68kkoMoIE1Y91D))

Xcode,Swiftにおいて、日本語の識別子は基本的にサポートしている。パフォーマンス面でも問題ないとのこと。
テスト関数名は、日本語にしてもいいかな何て思ったりもしました。

[Swift Testing](https://developer.apple.com/documentation/testing/)では、XCTestのテスト関数で必須であったプレフィックス`test`が不要になるので、次のようなイメージで書くのも良いかもと思いました。

```diff
- @Test func foodTruckExists() {
+ @Test func フードトラックが存在する() {
  // Test logic goes here.
}
```

## ⚡️ Swift × Android: Skipが切り拓くクロスプラットフォーム開発の未来(セッション動画は[こちら](https://youtu.be/FtO6ocYGnwc?si=38sl1SH-RcBBmkRM))

SwiftとXcodeを使って、iOSとAndroidのアプリを作成できるツール[Skip](https://skip.tools/)の実用性と今後クロスプラットフォーム対応の主流となるかについて、スピーカーが実際にアプリを作成したときの経験が紹介されていました。

- 基本的にはSkipによって変換、生成されたコードでAndroidアプリのUIは期待通りになる。
- 2つのモードのうち、Native Modeを使うことをおすすめするとのこと。主な理由としては、もう一方のモードTranspile ModeではSwiftからKotlinに変換ができないAPIをがいくつかあるため。
- 既存で開発しているiOSアプリにSkipをそのまま適用は難しいとのこと。理由としては、iOSアプリで使用しているライブラリの一部がAndroidでサポートされていない。しかし、UIに関してはSwiftUIもそのままAndroidアプリに変換できるようにコンパイルできるようになってきている。
- スピーカーは、Skipがクロスプラットフォームのメインストリームに数年でなるのではとのこと。

[skiptools/skip-ui](https://github.com/skiptools/skip-ui)のSupported SwiftUIをみても多くのものがFull Supportになっているのも確認できました。これを見ても、純粋？なiOSエンジニアがクロスプラットフォーム対応するときには、Skipも有力候補に入ってきそうだなと感じました。
私自身は、Kotlinを書いたことがないので、SwiftのコードをそのままAndroid対応することができるSkipはとても魅力的に映るために、時間をみつけてSkipを触ってみたいと思いました。

参考資料:

- [Skip](https://skip.tools/)
- https://github.com/skiptools
- https://github.com/skiptools/skip-ui

## Foreign FunctionとMemory APIとSwift/Java相互運用性(セッション動画は[こちら](https://youtu.be/vgtzhTOhEbs?si=ZUJVcoSCiv71FFNj))

SwiftとJavaを相互に利用する方法について紹介がありました。
開発段階であるライブラリ[swiftlang/swift-java](https://github.com/swiftlang/swift-java)をAppleのエンジニアでContributorである[Konrad](https://github.com/ktoso)さんがお話されていました。

[swiftlang/swift-java](https://github.com/swiftlang/swift-java)では、SwiftとJavaを相互運用するために次の２つのアプローチがあります。

- `JavaKit`
 - JavaのAPIを直接呼ぶことが可能にするSwiftライブラリ
- `jextract-swift`
 - `jextract`と類似したSwiftからJavaを効率的に呼び出すために使用するJavaソースを抽出するツール

内容は私には理解が難しい部分が多々あったが、弊社ではJavaを使う案件が多いので、該当レポジトリの内容とセッションを見直したいと思いました。セッションの中で、UIをSwiftUIで残りの内部ロジック等をJavaに寄せることができるようなお話もあり、とても興味深いものでした。

## SwiftUI を最適化するためのレンダーループの理解(セッション動画は[こちら](https://youtu.be/x-HWEwlkJME?si=97NxB0tNemiebits))

SwiftUIを最適化するために、理解が必要なSwiftUIのレンダリングの仕組みや具体的な例を用いて表示遅延が起こる原因や解決策についての紹介がありました。

SwiftUIViewがどのようにレンダリングされているかという質問に対しては、レンダーループを理解することが近道です。

### レンダーループ(Render loop)

レンダーループ(Render loop)とは、アプリのUIがどのように更新され、画面に表示するかを管理する継続的なサイクルを指します。

**レンダーループのサイクル:**

1. Event Phase
   - 何かしらのイベント/状態変化を検知する
2. View Update Phase
   - Event Phaseでの変更を元に、新しいView階層を構築する
   - そのとき、以前のView階層と比較を行い、UIを更新するために必要な最小限の変更セットを作成する（この機能は、UIKitにはなく、SwiftUI独自のものであり、これによりViewの描画が最適化されている）
3. Render phase
   - SwiftUIが新しいView階層をGPUで処理可能な形式に変換する（これには、色、形、画像などの視覚に関するプロパティが含まれる）
4. Display Buffer
   - Render PhaseでDisplay Bufferが作成される
5. Display
   - Diplay Bufferのピクセルデータをユーザー用の最終的な視覚情報に変換する

### サンプルプロジェクトによる例示

サンプルコード: https://github.com/pradnya-nikam/trySwiftTokyoPrad2025

サンプルコードの雲をたくさん描画するViewでは、動く雲の数が多くなるにつれて動きもっさりしてきます。描画時のCPUの状況を見ると、徐々にCPUの使用率が上昇していくことが紹介されていました。これはRender Phaseですべての雲の位置を計算、雲の形を描画し、視覚効果を適用しているためです。このため、Render Phaseに割り当てられているフレーム内で処理がしきれなくなってしまい、ラグが発生してしまいます。

そこで、`.drawingGroup()`を適用して、ラグを解消します。

```diff_swift
  CloudView()
      .drawingGroup() // これを加えるだけ
```

[drawinggroup(opaque:colormode:)](https://developer.apple.com/documentation/swiftui/view/drawinggroup(opaque:colormode:))

このメソッドを使うことで、画面上には見えないオフスクリーン上でMetal APIを使用して、一つのイメージにまとめて描画することでパフォーマンスを改善させています。
実際に、CPUの使用率も、適用前の112%から33%ほどまで下がっていました。

**Cherry Blossoms! App:**

反対に、桜が散っていくアニメーションがあるViewでは、`.drawingGroup()`を適用することで逆に、動きが遅くなり、不安定になってしまいました。この理由はこのアプリの花びらは削除と作成を繰り返すため、このメソッドで解決するようなシチュエーションではないとのことです。

このように、`drawingGroup()`を使わない方よい例は以下の4つです。

1. Views with Dynaminc Content → Viewのコンテンツが頻繁に変更されるもの
1. Text Views → テキストを表示するときのレンダリングは複数なレイアウトとグリフ管理があるため
1. Views with interactions → 予期しない変更が生じる可能性がある
1. Special Visual effect like some blending modes maynot work properly

本セッション内容は、SwiftUIを普段使っている私にはとても勉強になりました。レンダーループについては、サンプルコードを手元で動かしつつ、Instruments等を使ってパフォーマンスに関して色々実際に検証してみたいと思いました。

参考資料:

- https://developer.apple.com/videos/play/tech-talks/10855/
- https://developer.apple.com/videos/play/wwdc2018/219/
- https://developer.apple.com/videos/play/wwdc2020/10077/
- https://developer.apple.com/videos/play/tech-talks/10857/?time=1091
- (My own talk that talks about Rendering on UIKit) https://www.youtube.com/watch?v=gbAjrPqFLUY

# さいごに

今回は一般参加で、try! Swift Tokyo2025に参加しました!

次回は別の形(スタッフやスピーカーなど)で参加してtry! Swiftのコミュニティの発展に貢献したいと感じました。

英語話者が多いイベントということで、久しぶりに英語を聞いたり、話したりしましたが学生時代より聞き取れなかったり、言葉が出ないということがあったので英会話をまた始めたいなと思うきっかけになりました。

セッションでは、技術的な知識だけではなく、取り組む姿勢や心持ちみたいなことも話されている方でいて、様々な面で良い刺激を受けることができました。来年の開催も楽しみにしています！

<img src="/images/2025/20250416b/a03209ce-1e32-4b7d-b736-001fb3ec3a2a.jpeg" alt="" width="1200" height="634" loading="lazy">

[^1]: 医療・ヘルスケア分野での案件や新規ビジネス創出を担う、2020年に誕生した事業部です。設立エピソードは[未来報](https://note.future.co.jp/n/n8b57d4bf4604)の記事をご覧ください。
