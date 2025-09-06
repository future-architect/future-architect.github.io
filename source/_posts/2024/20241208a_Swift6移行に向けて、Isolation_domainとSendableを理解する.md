---
title: "Swift6移行に向けて、Isolation domainとSendableを理解する"
date: 2024/12/08 00:00:00
postid: a
tag:
  - iOS
  - Swift
category:
  - Mobile
thumbnail: /images/2024/20241208a/thumbnail.png
author: 橋本竜我
lede: "SwiftZoomin#20の内容から、Swift6移行に向けて理解が必要なSwift Concurrencyの重要な概念について簡単にまとめました。"
skip_career: true
---
<img src="/images/2024/20241208a/image.png" alt="" width="1200" height="416" loading="lazy">

::: note info
本記事は、[Swift Advent Calendar 2024](https://qiita.com/advent-calendar/2024/swift)の8日目です。
7日目は、[@hinakko](https://qiita.com/hinakko)さんの[Split Viewを考慮したSize Classを使用したiPad対応](https://qiita.com/hinakko/items/ac65d149e3141a8bc7da)です。
:::

HealthCare Innovation Group(HIG)[^1]の橋本です。

先日参加したSwiftZoomin#20の内容から、Swift6移行に向けて理解が必要なSwift Concurrencyの重要な概念について簡単にまとめました。

SwiftZoomin#20の動画は、次のリンク先からYoutube上で視聴可能です。
- [感覚的に理解するConcurrency: Swift 6はIsolationとSendableを用いてどのようにデータ競合を防止するか](https://youtu.be/AUcn2y2jjNs?si=_fyNjme2hDA236sl)

# Swift6移行に向けて、重要な概念3つ

以下３つの概念についてまとめいきます。

- Isolation domain
- Isolation boundary
- Sendable

## Isolation domain

`隔離=Isolation`する領域のことを`Isolation domain`と呼びます。
`Isolation domain`の重要な特性は、**一つのIsolation domainのなかでは同時に一つの処理しか実行されない**ことです。（＝一つのIsolation domainの中で並行実行されることはないことと同義）

参考

- [Isolation Domains | Migrating to Swift 6](https://www.swift.org/migration/documentation/swift-6-concurrency-migration-guide/dataracesafety/#Isolation-Domains)

### actor

`actor`というのは、一つの領域で隔離(Isolation)することでデータ競合を防いでいます。

最も馴染み深いのは、`MainActor`の`Isolation domain`であり、`actor`のインスタンスに紐づいたIsolation domainも存在します。

`MainActor`の`Isolation domain`は`Main Actor`で保護された領域を表します。
`Actor`の場合は、`Actor`のインスタンスごとに`Isolation domain`をもち、同じ`actor`でもインスタンスが異なれば、それぞれ異なる`Isolation domain`を持ちます。

```swift
actor Counter {...}

let a = Counter() // aのIsolation domain、aとbは別のIsolation domainである。
let b = Counter() // bのIsolation domain、aとbは別のIsolation domainである。

```

参考

- [Actor | Apple Developer Documentation](https://developer.apple.com/documentation/swift/actor)

## Isolation boundary

`Isolation domain`が複数存在しているときのそれぞれの`Isolation domain`の間の境界のことを`Isolation boundary`と呼びます。

アプリにおいては、それぞれの`Isolation domain`間で`Isolation boundary`を超えて情報のやり取りをしないといけない場面が多々あります。

この`Isolation boundary`を超えて値を受け渡すために、次の`Sendable`が必要になってきます。

## Sendable

**Sendable 並行にアクセスされても安全な型だけが準拠できるプロトコル**
`Sendable`の特徴は、`Sendable`に準拠した型の値だけが`Isolation boudnary`を超えられるようになります。
つまり、`Sendable`を使うことで実行時にデータ競合が起こらないことをコンパイル時にチェックできるように、型の問題とすることで実現しています。

### non-Sendable

`Sendable`に対して、`non-Sendable`な値は、`Isolation boundary`を超えることができません。


- [Sendable | Apple Developer Documentation](https://developer.apple.com/documentation/swift/sendable)
- [Sendable Types | Migrating to Swift 6](https://www.swift.org/migration/documentation/swift-6-concurrency-migration-guide/dataracesafety/#Sendable-Types)
- [Sendable Types | The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Sendable-Types)

## Sendableを体感する

<img src="/images/2024/20241208a/Sendable.png" alt="" width="1031" height="685" loading="lazy">

上記の`Box`クラスをSendableに準拠させて、並行にアクセス可能にさせてみる。

```swift
final class Box: Sendable {
    var value: Int = 0 // ここでエラー(Stored property 'value' of 'Sendable'-conforming class 'Box' is mutable)
}
```

そうすると、次のように`Sendable`に準拠すること自体がエラーであることがわかります。
`Box`型のプロパティ`Value`が可変状態のため、並行にアクセスすると危険である旨のメッセージが出てきます。

```txt
Stored property 'value' of 'Sendable'-conforming class 'Box' is mutable
```

ここで、`var`ではなく、`let`だったらどうなるか考えてみます。

```swift
final class Box: Sendable {
    let value: Int = 0
}
```

`let`にすることで、`Box`クラスのエラーは解消されます。

`value`プロパティが定数になるため、`run()`メソッド内で`box.balue = -1`で書き込みをしていた箇所がコンパイルエラーになります。

この部分を読み込むだけの`print(box.value)`とすれば、データ競合を起こさない安全なコードとすることができます。データ競合は、並行にアクセスする少なくとも１つで書き換えが起こっているときに生じるものであるため、今回のように読み込むだけであれば、データ競合の危険性はありません。

```swift
func run() {
    let box: Box = .init()

    Task {
        // box.value = -1 // Cannot assign to property: 'value' is a 'let' constant
        print(box.value)
    }

    Task {
        print(box.value)
    }
}
```

## Isolation boundaryを体感する

`Sendable`に準拠していない`non-Sendable`な`Box`クラスが`Isolation boundary`を超えるとコンパイルエラーが出る例を示します。

```swift
final class Box {
    var value: Int = 0
}


actor A {
    var box: Box?
    func setBox(_ box: Box) {
        self.box = box
    }
}


func run() async {
    let box: Box = .init()
    let a: A = .init() // actor A のインスタンスa

   await a.setBox(box) // actor A のインスタンスaにboxを渡す　⇐ boxがIsolation bounadaryを超えて、actor AのインスタンスaのIsolation domainに入る。
// ここで次のエラーメッセージが出る。
// Sending 'box' risks causing data races

    print(box.value)
}
```

`Sendable`に準拠していない`Box`クラスの`box`インスタンスが`Isolaton boudary`を超えたため、このエラーがでてきます。

このように、`Isolaton boudary`が存在していることを体験することができました。

# おわりに

SwiftZoomin#20（[感覚的に理解するConcurrency: Swift 6はIsolationとSendableを用いてどのようにデータ競合を防止するか](https://youtu.be/AUcn2y2jjNs?si=_fyNjme2hDA236sl)）動画前半の内容について私なりにまとめさせていただきました。（[@koher](https://qiita.com/koher)さん、大変わかりやすく説明いただきありがとうございました。）

Swift6への移行は、コンパイル時にデータ競合が起こる可能性のある箇所を事前につぶすことができるので、アプリの品質向上に直結するため、ビジネス的にもとても有用なものだと思っております。

本記事がSwift6移行に向けて、少しでも参考になれば幸いです。

[^1]: 医療・ヘルスケア分野での案件や新規ビジネス創出を担う、2020年に誕生した事業部です。設立エピソードは[未来報](https://note.future.co.jp/n/n8b57d4bf4604)の記事をご覧ください。
