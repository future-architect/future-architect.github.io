---
title: "【SwiftUI】Swift Charts についてまとめてみた"
date: 2023/07/20 00:00:00
postid: a
tag:
  - Swift
  - SwiftUI
  - iOS
category:
  - Mobile
thumbnail: /images/2023/20230720a/thumbnail.png
author: 橋本竜我
lede: "iOS16からApple標準で利用できるようになったSwift Chartsというグラフ等を作成できるフレームワークを取り上げたいと思います。"
---

# はじめに

はじめまして！ 2022年5月キャリア入社、HealthCare Innovation Group(HIG)[^1]の橋本です。技術ブログ初投稿です。

iOS16からApple標準で利用できるようになったSwift Chartsというグラフ等を作成できるフレームワークを取り上げます。

取り上げた理由としては、２点あります。

1. 現在のプロジェクトで活用する機会がありそうなため、事前にキャッチアップしておきたいと考えたため
2. データ分析の分野にも興味があり、後ほど投稿しよう思っているSwiftで機械学習をしたときの結果をきれいに可視化してみたいと思っているから

早速本題に入っていきます。内容は次のような構成です。

# 内容

- Swift Chartsとは
  - Swift Chartsの基本的な使い方
  - グラフを描く要素を定義するデータ構造を設計する
- 6つのMarkとその使い方
  - AreaMask
  - LineMark
  - PointMark
  - RectangleMark
  - RuleMark
  - BarMark
- iPhoneのScreen Timeの表示をSwift Chartsで作ってみる

## Swift Chartsとは

Swift Chartsとは、WWDC2022で発表されたカスタマイズされたグラフを作成できるSwiftUIフレームワークです。

https://developer.apple.com/documentation/charts

イメージとしては、以下のように様々なグラフを描くことができます。
<img src="/images/2023/20230720a/image.png" alt="" width="1200" height="424" loading="lazy">

また、WWDC2023のセッション([Explore pie charts and interactivity in Swift Charts](https://developer.apple.com/videos/play/wwdc2023/10037/))で7つ目となる`SectorMark`が発表されました。`SectorMark`を使うことで簡単にPie Chartを作ることがiOS17から可能になるとのことです。

<img src="/images/2023/20230720a/image_2.png" alt="" width="1200" height="472" loading="lazy">

https://developer.apple.com/videos/play/wwdc2023/10037/

https://developer.apple.com/documentation/charts/sectormark

### Swift Chartsの基本的な使い方

簡単な棒グラフを作っていきます。
完成イメージは、縦軸が値段、横軸にフルーツが並ぶ棒グラフです。
使用する要素は以下のとおりです。

| フルーツ | 値段|
| ---- | ---- |
| りんご |  100円 |
| オレンジ |  50円 |
| バナナ |  200円 |

早速作っていきます。
まず、Swift Chartsを利用するために、`Charts`をインポートします。

```swift
import Charts
```

これによって、Swift Chartsが使えるようになりました。

次にグラフを描画する場所を定義します。

グラフを記述する場所として、View配下に`Chart {}`を次のように記載します。

```swift
struct ContentView: View {
    var body: some View {
        Chart {
            // ここに後述するMarkを記載します。
        }
    }
}
```

次に、今回は棒グラフを作成するので、棒グラフを描くことができる`BarMark`を使っていきます。

さきほどのコードに`BarMark`を追加します。

```swift
        Chart {
            BarMark(
                x: .value("fruit", "りんご"),
                y: .value("Price", 100)
            )
        }
```

<img src="/images/2023/20230720a/5fd9a545-cb98-f283-f114-5216698e0097.png" alt="" width="564" height="432" loading="lazy">

BarMark内の`x: .value("Fruit", "Apple")`でx軸のラベル自体を`Fruit`と定義し、表示されている1つのバー要素が`Apple`であることを示しています。`y: .value("Price", 100)`も同様に、y軸のラベル自体を`Price`と定義し、表示されている1つのバー要素が`100`であることを示しています。

”りんご” のバーを追加できましたので、オレンジ、バナナを追加します。

追加する方法は、とても簡単でオレンジ用、バナナ用のBarMarkをそれぞれ追加するだけです。

```swift
        Chart {
            BarMark(
                x: .value("fruit", "りんご"),
                y: .value("Price", 100)
            )
            BarMark(
                x: .value("fruit", "オレンジ"),
                y: .value("Price", 50)
            )
            BarMark(
                x: .value("fruit", "バナナ"),
                y: .value("Price", 200)
            )
        }
```

<img src="/images/2023/20230720a/4616977c-472b-b182-8dea-58c0b452892c.png" alt="" width="558" height="430" loading="lazy">

これで完成イメージ通りのグラフが完成しました。しかし、この方法ですとBarMarkを要素が1つ追加するごとに増えていくので、数が多くなると大変見づらくなってしまいます。

そこで、グラフの要素を構造体で定義することで`View`内を簡潔に記載できます。

#### グラフを描く要素を定義するデータ構造を設計する

グラフで利用するデータ構造の一般的な設計について説明します。

Chartsでは、ForEachのようにループ文を使うことができるため、構造体を`Identifiable`プロトコルに準拠させ、一意の`id`をプロパティとして定義しておきます。

```swift
struct Data: Identifiable {
    var id = UUID()   // 一意のidを持たせる
    let fruitName: String
    let price: Double
}
```

これを用いて、先程紹介した棒グラフを実装すると次のようになります。

```swift
// 棒グラフの各要素を定義する
let item:[Item] = [
    Item(price: 100, fruitName: "apple"),
    Item(price: 50, fruitName: "orange"),
    Item(price: 200, fruitName: "Banana")
]

struct ContentView: View {
    var body: some View {
        Chart(item) { element in
            BarMark(
                x: .value("Fruit", element.fruitName),
                y: .value("Price", element.price)
            )
        }
```

`Charts`を`ForEach`のように利用できるため、これまでSwiftUIを触ったことがある人にはとても使いやすいと思いました。

## 6つのMarkとその使い方

6つのグラフを描画するMarkの使い方について、紹介します。
表に6つのMark名と主に使われるグラフとそのイメージ画像を一覧化しています。

|  名前 |  説明　 |　イメージ　|
| ---- | ---- | ---- |
| AreaMark | 面グラフ|　　<img src="/images/2023/20230720a/image_3.png" alt="image.png" width="312" height="214" loading="lazy">　　|
| LineMark  | 折れ線グラフ|　<img src="/images/2023/20230720a/image_4.png" alt="image.png" width="311" height="211" loading="lazy">　　|
| PointMark | 散布図|　<img src="/images/2023/20230720a/image_5.png" alt="image.png" width="319" height="212" loading="lazy">　　|
| RectangleMark | ヒートマップ|　<img src="/images/2023/20230720a/image_6.png" alt="image.png" width="308" height="213" loading="lazy">　　|
| RuleMark | 水平線、垂直線|　<img src="/images/2023/20230720a/image_7.png" alt="image.png" width="320" height="218" loading="lazy">　　|
| BarMark | 棒グラフ|　<img src="/images/2023/20230720a/image_8.png" alt="image.png" width="314" height="213" loading="lazy">　　|

BarMarkの使い方は、すでに紹介しましたので、残りの5つのMarkのサンプルコードを次に記載します。

（ここでは基本的にデータ構造などのコードは省き、`Chart{}`内のコードのみを載せています）。

### Area Markのサンプルコード

```swift
Chart(cheeseburgerCost) {
    AreaMark(
        x: .value("Date", $0.date),
        y: .value("Price", $0.price)
    )
}
```

### LineMarkのサンプルコード

```swift
Chart(data) {
    LineMark(
        x: .value("Month", $0.date),
        y: .value("Hours of Sunshine", $0.hoursOfSunshine)
    )
}
```

### PointMarkのサンプルコード

```swift
Chart(data) {
    PointMark(
        x: .value("Wing Length", $0.wingLength),
        y: .value("Wing Width", $0.wingWidth)
    )
}
```

### RectangleMarkのサンプルコード

このサンプルコードでは、`width`と`height`でバーエリア内の比率を1.0にすることでヒートマップを作成しています。作成されるヒートマップは、上記で記載している表中のイメージのものです。

```swift
struct MatrixEntry: Identifiable {
    var positive: String
    var negative: String
    var num: Double
    let id = UUID()
}


private var data: [MatrixEntry] = [
    MatrixEntry(positive: "+", negative: "+", num: 125),
    MatrixEntry(positive: "+", negative: "-", num: 10),
    MatrixEntry(positive: "-", negative: "-", num: 80),
    MatrixEntry(positive: "-", negative: "+", num: 1)
]

struct RectangleMaskView: View {
    var body: some View {
        Chart(data) {
            RectangleMark(
                x: .value("Positive", $0.positive),
                y: .value("Negative", $0.negative)
                width: .ratio(1),
                height: .ratio(1)
            )
            .foregroundStyle(by: .value("Number", $0.num))
        }
        // 凡例を非表示に設定
        .chartLegend(.hidden)

        // Y軸のラベル位置を設定
        .chartYAxis {
            AxisMarks(preset: .aligned, position: .leading)
        }
        .frame(width: 300, height: 200)
        .padding()
    }
}

```

### RuleMarkのサンプルコード

```swift
private var data: [Pollen] = [
    Pollen(startMonth: 1, numMonths: 9, source: "Trees"),
    Pollen(startMonth: 12, numMonths: 1, source: "Trees"),
    Pollen(startMonth: 3, numMonths: 8, source: "Grass"),
    Pollen(startMonth: 4, numMonths: 8, source: "Weeds")
]

struct RuleMaskView: View {
    var body: some View {
        Chart(data) {
            RuleMark(
                xStart: .value("Start Date", $0.startDate),
                xEnd: .value("End Date", $0.endDate),
                y: .value("Pollen Source", $0.source)
            )
        }
        .frame(width: 300, height: 200)
        .padding()
    }
}
```

### SectorMarkのサンプルコード(iOS17以降)

WWDC2023で発表された`SectorMark`のサンプルコードです。`BarMark`等で使っていた`x:`を`angle`に変えるだけで、簡単にPie chartsに変換できます。

また、`innnerRadius:`、`angularInset`でPie chartsをカスタマイズできます。`innnerRadius:`を使用することで、パイチャートの内部を指定の比率だけくり抜き、ドーナッツチャートにすることもできます。

```swift
var body: some View {
    Chart(data, id: \.name) { name, sales in
        SectorMark(
            angle: .value("Value", sales),
            innerRadius: .ratio(0.618),  // Pie charts中心から指定の比率だけくり抜ける
            angularInset: 1 // Pie chartsの各要素の間に1 pointの隙間を与える
        )
        .cornerRadius(4)
        .foregroundStyle(by: .value("Product category", name))
    }
}
```

再掲となりますが、以下のWWDC2023のセッション動画を見ていただけると、`SectorMark`について理解が進むと思います。

https://developer.apple.com/videos/play/wwdc2023/10037/

# スクリーンタイムのグラフを模倣して作ってみた

最後に、学習してきた知識を活用して、iPhoneアプリなどに標準で搭載されているスクリーンタイムのグラフを模倣してみました。

### 環境

- macOS: Ventura 13.4.1
- Xcode: Version 14.3.1 (14E300c)

```swift
struct BarItem: Identifiable {
    let dayOfWeek: String
    let hour: Double
    let category: String
    let id = UUID()
}

private let data: [BarItem] = [
    BarItem(dayOfWeek: "日", hour: 1.5, category: "エンターテイメント"),
    // 省略
]

struct ScreenTimeWidgetView: View {
    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("スクリーンタイム")) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("1日の平均")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                        Text("3 時間 45 分")
                            .font(.title)

                        // グラフを描画
                        Chart {
                            ForEach(data) {
                                BarMark(
                                    x: .value("Category", $0.dayOfWeek),
                                    y: .value("Profit", $0.hour)
                                )
                                .foregroundStyle($0.color)
                                .foregroundStyle(by: .value("Product Category", $0.category))
                                // 棒グラフの角を丸くする
                                .cornerRadius(3)

                                // 一週間の平均利用時間(h)
                                RuleMark(y: .value("平均", 3.45))
                                    .foregroundStyle(.green)

                                // 線のスタイルを指定。ここでは点線にしている。
                                    .lineStyle(StrokeStyle(lineWidth: 1.5, lineCap: .butt, lineJoin: .miter, dash: [5,5,5,5], dashPhase: 0))
                            }
                        }
                        .chartForegroundStyleScale([
                            "エンターテイメント": .blue, "仕事の効率化とファイナンス": .cyan, "SNS": .orange
                        ])
                    }
                    .frame(width: 300, height: 250)
                }
            }
        }
    }
}
```

<img src="/images/2023/20230720a/c82576c7-af28-9a39-950c-a5b1206ef480.png" alt="" width="872" height="828" loading="lazy">

本物にかなり似たグラフを実装できたと思います。

より本物のスクリーンタイムに合わせるには、以下をうまく実装に反映させる必要があります。

- `RuleMark`の点線の横に、平均という文字を入れること
- 縦軸の目盛りを調節すること
- 縦軸の目盛りに単位を追加すること
- 日、月、などの曜日をそれぞれの要素内で左に寄せること

これらの課題は、時間を見つけて改善していきたいと思います。

# さいごに

今回は、iOS16から利用できるようになったSwift Chartsについて理解を深めました。

今後もSwift周りで学習した内容を投稿していきたいと思いますので、その際もお読みいただけると嬉しいです。

# 参考リンク

https://developer.apple.com/documentation/charts/areamark

https://developer.apple.com/documentation/charts/linemark

https://developer.apple.com/documentation/charts/pointmark

https://developer.apple.com/documentation/charts/rectanglemark

https://developer.apple.com/documentation/charts/rulemark

https://developer.apple.com/documentation/charts/barmark

[^1]: 医療・ヘルスケア分野での案件や新規ビジネス創出を担う、2020年に誕生した事業部です。設立エピソードは[未来報](https://note.future.co.jp/n/n8b57d4bf4604)の記事をご覧ください。
