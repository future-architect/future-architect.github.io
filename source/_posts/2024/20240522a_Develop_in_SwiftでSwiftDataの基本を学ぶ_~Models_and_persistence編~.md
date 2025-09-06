---
title: "Develop in SwiftでSwiftDataの基本を学ぶ ~Models and persistence編~"
date: 2024/05/22 00:00:00
postid: a
tag:
  - Swift
  - SwiftUI
category:
  - Mobile
thumbnail: /images/2024/20240522a/thumbnail.png
author: 橋本竜我
lede: "公式チュートリアルDevelop in SwiftのModels and persistence、Data editing and navigation、Relationships and queriesという3つのセクションでSwiftDataを学べるとことで実際にやってみました。"
---

<img src="/images/2024/20240522a/image.png" alt="" width="1103" height="542" loading="lazy">

# はじめに

HealthCare Innovation Group(HIG)[^1]の橋本です。

新しく登場した公式チュートリアル[Develop in Swift](https://developer.apple.com/tutorials/develop-in-swift/)のModels and persistence、Data editing and navigation、Relationships and queriesという3つのセクションでSwiftDataを学べるとのことで実際にやってみました。

今回は、1つ目の **Models and persistence編** です。Models and persistenceセクションで学んだこと、Wrap-upのExtend your appの追加課題をやってみたので、これらについてまとめています。

# 本記事でわかること

- `SwiftData`の基本的な使い方
  - `SwiftData`の導入
  - `@Model`, `@Query`の使い方
  - `SwiftUI`の`View`との連携
- Wrap-upのExtend your appの追加課題の解答例を知ることができる

# 環境

- OS: macOS Sonoma 14.4.1
- Xcode: 15.3 (15E204a)
- Swift: 5.10

# 目次

- SwiftDataとは
- Save data
  - Section 1~3(UI等のSwiftDataに直接関係のない事前準備)
  - Section 4: Convert your structure to a SwiftData model
  - Section 5: Connect SwiftData and SwiftUI
  - Section 6: Use model data to fill out the UI
- Wrap-up: Models and persistence
- おわりに

# SwiftDataとは

<img src="/images/2024/20240522a/image_2.png" alt="" width="1200" height="419" loading="lazy">

[`SwiftData`](https://developer.apple.com/documentation/swiftdata)とは、データモデリングとデータの永続化のフレームワークです。
これまで主に使われていた`CoreData`の後継として期待されています。
SwiftDataの主な特徴としては、

- `SwiftUI`との連携
  - `SwiftUI`と深く統合されており、ユーザーインタフェースのためのデータバインディングが非常にスムーズ
- 宣言的データモデリング:
  - 属性、関係性、オブジェクトのバリデーションなどを宣言的に定義できること
- データ永続化:
  - オブジェクトが自動的に保存され、データ永続化が容易であること
- パフォーマンス最適化:
  - Appleのエコシステムに合わせて最適化されており、効率的なクエリ実行が可能

::: note warn
注意
SwiftDataはiOS17.0+, iPadOS17.0+で使用可能であること。
:::

# Save data

Models and persistenceセクションのSave dataを進めていきます。

## Section 1~3(UI等のSwiftDataに直接関係のない事前準備)

以下は、Section1~3まで対応後のコードです。この時点では`SwiftData`を使用していないため、誕生日を登録しても、アプリキルすると登録したデータは削除されてしまいます。

<details><summary>BirthdayApp.swift</summary>

```swift
import SwiftUI

@main
struct BirthdaysApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

</details>

<details><summary>Friend.swift</summary>

```swift
import Foundation

struct Friend {
    let name: String
    let birthday: Date
}
```

</details>

<details><summary>ContentView.swift</summary>

```swift
import SwiftUI

struct ContentView: View {
    @State private var friends: [Friend] = [
        Friend(name: "Elton", birthday: .now),
        Friend(name: "Jenny Court", birthday: Date(timeIntervalSince1970: 0))
    ]

    @State private var newName = ""
    @State private var newDate = Date.now

    var body: some View {
        NavigationStack {
            List(friends, id: \.name) { friend in
                HStack {
                    Text(friend.name)
                    Spacer()
                    Text(friend.birthday, format: .dateTime.month(.wide).day().year())
                }
            }
            .navigationTitle("Birthdays")
            .safeAreaInset(edge: .bottom) {
                VStack(alignment: .center, spacing: 20) {
                    Text("New Birthday")
                        .font(.headline)
                    DatePicker(selection: $newDate, in: Date.distantPast...Date.now, displayedComponents: .date) {
                        TextField("Name", text: $newName)
                            .textFieldStyle(.roundedBorder)
                    }
                    Button("Save") {
                        let newFriend = Friend(name: newName, birthday: newDate)
                        friends.append(newFriend)
                        newName = ""
                        newDate = .now
                    }
                    .bold()
                }
                .padding()
                .background(.bar)
            }
        }
    }
}
```

</details>

## Section４: Convert your structure to a SwiftData model

先程作成した`Friend`構造体を`SwiftData`モデルに変換します。

以下、4点を対応します。

- `SwiftData`フレームワークをインポートします
- モデルに対して、`@Model`マクロのアノテーションを付与します
- `struct`から`class`に書き換えます
- `class`は`struct`と異なり、自動でイニシャライザが生成されないため、イニシャライザを用意します

**Friend.swift**

```diff
import Foundation
+ import SwiftData

+ @Model
- struct Friend {
+ class Frined {
    let name: String
    let birthday: Date

+    init(name: String, birthday: Date) {
+    self.name = name
+    self.birthday = birthday
}
```

## Section5: Connect SwiftData and SwiftUI

`SwiftData`と`SwiftUI`の`View`を連携させます。
`SwiftUI`におけるエントリーポイントである`~App.swift`に次のコードを追加することで、`SwiftData`によって永続化させたデータの保存場所と`View`を連携させることができます。

**BirthdaysApp.swift**

```diff
import SwiftUI
+ import SwiftData

@main
struct BirthdaysApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
+                .modelContainer(for: Friend.self)
        }
    }
}
```

**ContentView.swift**

- `friends`配列を`@State`から`@Query`に変更することで、`@Query`マクロによって、モデルに変更があったときに`SwiftUIView`に自動的に変更を伝えることができます。
- `modelContext`を環境変数として宣言します。
  - `SwiftData`において、`ModelContext`によってビューとモデルコンテナ間を接続し、データの取得、挿入、削除が可能になります。

```diff
import SwiftUI
+ import SwiftData

struct ContentView: View {
+   @Query private var friends: [Friend]
-   @State private var friends: [Friend] = [
-       Friend(name: "Elton", birthday: .now),
-       Friend(name: "Jenny Court", birthday: Date(timeIntervalSince1970: 0))
-   ]
+   @Environment(\.modelContext) private var context

    @State private var newName = ""
    @State private var newDate = Date.now

    var body: some View {
        NavigationStack {
            List(friends, id: \.name) { friend in
                HStack {
                    Text(friend.name)
                    Spacer()
                    Text(friend.birthday, format: .dateTime.month(.wide).day().year())
                }
            }
            .navigationTitle("Birthdays")
            .safeAreaInset(edge: .bottom) {
                VStack(alignment: .center, spacing: 20) {
                    Text("New Birthday")
                        .font(.headline)
                    DatePicker(selection: $newDate, in: Date.distantPast...Date.now, displayedComponents: .date) {
                        TextField("Name", text: $newName)
                            .textFieldStyle(.roundedBorder)
                    }
                    Button("Save") {
                        let newFriend = Friend(name: newName, birthday: newDate)
+                       context.insert(newFriend)
-                       friends.append(newFriend)
                        newName = ""
                        newDate = .now
                    }
                    .bold()
                }
                .padding()
                .background(.bar)
            }
        }
    }
}
```

## Section6: Use model data to fill out the UI

モデルデータを使ってUIをいい感じに整えていきます。
主に以下2点を実現させます。

- 登録されているデータを日付順でソートする。
- 誕生日当日の人は、ケーキのマークがつくようにする。

**BirthDayApp.swift**
Section5から追加の修正なし。

**Friend.swift**

今日が誕生日かどうかを表すために、コンピューテッドプロパティとして、`Bool`型の`isBirthdayToday`を用意します。

```diff
import Foundation
import SwiftData

@Model
class Frined {
    let name: String
    let birthday: Date

    init(name: String, birthday: Date) {
    self.name = name
    self.birthday = birthday

+   var isBirthdayToday: Bool {
+       Calendar.current.isDateInToday(birthday)
+   }
}
```

**ContentView.swift**

- 追加された人の誕生日を降順で並ぶように、`@Query`を`@Query(sort: \Friend.birthday)`に修正します。`@Query` だけの場合は、いつも同じ並び順にはならないことに注意してください。
- `SwiftData`は各モデルインスタンスに独自のIDを提供します。`List`では、`@Model` が提供する識別子を使うため、明示的な`ID`を削除します。つまり、`List()`の引数である`KeyPath`を削除します。

```diff
import SwiftUI
import SwiftData

struct ContentView: View {
+   @Query(sort: \Friend.birthday) private var friends: [Friend]
-   @Query private var friends: [Friend]
    @Environment(\.modelContext) private var context

    @State private var newName = ""
    @State private var newDate = Date.now

    var body: some View {
        NavigationStack {
+           List(friends) { friend in
-           List(friends, id: \.name) { friend in
                HStack {
                    Text(friend.name)
                    Spacer()
                    Text(friend.birthday, format: .dateTime.month(.wide).day().year())
                }
            }
            .navigationTitle("Birthdays")
            .safeAreaInset(edge: .bottom) {
                VStack(alignment: .center, spacing: 20) {
                    Text("New Birthday")
                        .font(.headline)
                    DatePicker(selection: $newDate, in: Date.distantPast...Date.now, displayedComponents: .date) {
                        TextField("Name", text: $newName)
                            .textFieldStyle(.roundedBorder)
                    }
                    Button("Save") {
                        let newFriend = Friend(name: newName, birthday: newDate)
                        context.insert(newFriend)
                        newName = ""
                        newDate = .now
                    }
                    .bold()
                }
                .padding()
                .background(.bar)
            }
        }
    }
}
```

## Wrap-up: Models and persistence

次のページの`Extend your app`の次の２つのお題に取り組みたいと思います。

https://developer.apple.com/tutorials/develop-in-swift/models-and-persistence-conclusion

### Extend your app（ソートする基準の変更、降順or昇順）

#### Sort the birthday list by name instead of birthday.

これはとても簡単に修正できます。
`@Query(sort: \Friend.birthday)`を`@Query(sort: \Friend.name)`に変えるだけです。

```Swift
@Query(sort: \Friend.name) private var friends: [Friend]
```

これで、誕生日順ではなく、名前の降順にできました。これを昇順にする場合は、引数`order: .reverse`を与えるだけで実現できます。

```Swift
@Query(sort: \Friend.name, order: .reverse) private var friends: [Friend]
```

#### Add a notes property to Friend to plan how you’ll celebrate a friend’s birthday.

これもおまけ的な内容ですが、簡単に実装してみます。

<details><summary>Friend.swift</summary>

```diff
import Foundation
import SwiftData

@Model
class Frined {
    let name: String
    let birthday: Date
+   let notes: String

+   init(name: String, birthday: Date, notes: String) {
-   init(name: String, birthday: Date) {
    self.name = name
    self.birthday = birthday
+   self.notes = notes

    var isBirthdayToday: Bool {
        Calendar.current.isDateInToday(birthday)
    }
}
```

</details>

<details><summary>ContentView.swift</summary>

```diff
import SwiftUI
import SwiftData

struct ContentView: View {
    @Query(sort: \Friend.birthday) private var friends: [Friend]
    @Environment(\.modelContext) private var context

    @State private var newName = ""
    @State private var newDate = Date.now
+   @State private var newNotes = ""

    var body: some View {
        NavigationStack {
            List(friends) { friend in
                HStack {
                    if friend.isBirthdayToday {
                        Image(systemName: "birthday.cake")
                    }
                    VStack {
                        Text(friend.name)
                            .bold(friend.isBirthdayToday)
+                       Text(friend.notes)
+                           .font(.caption2)
                    }
                    Spacer()
                    Text(friend.birthday, format: .dateTime.month(.wide).day().year())
                }
            }
            .navigationTitle("Birthdays")
            .safeAreaInset(edge: .bottom) {
                VStack(alignment: .center, spacing: 20) {
                    Text("New Birthday")
                        .font(.headline)
                    DatePicker(selection: $newDate, in: Date.distantPast...Date.now, displayedComponents: .date) {
                        TextField("Name", text: $newName)
                            .textFieldStyle(.roundedBorder)
                    }
+                   TextField("Notes", text: $newNotes)
+                       .textFieldStyle(.roundedBorder)
                    Button("Save") {
                        let newFriend = Friend(name: newName, birthday: newDate, notes: newNotes)
                        context.insert(newFriend)
                        newName = ""
                        newDate = .now
+                       newNotes = ""
                    }
                    .bold()
                }
                .padding()
                .background(.bar)
            }
        }
    }
}
```

</details>

#### 完成したサンプルアプリ

追加した友達の誕生日のデータがアプリをキルしても、再度立ち上げると残っていることが確認できました！
`SwiftData`を使って、データを永続化させることに成功！！

<img src="/images/2024/20240522a/Simulator_Screen_Recording_-_iPhone_15_-_2024-05-15_at_20.26.56.gif" alt="" width="218" height="474" loading="lazy">

# おわりに

公式チュートリアル[Develop in Swift](https://developer.apple.com/tutorials/develop-in-swift)を使って`SwiftData`の基本的な使い方を学びました。気になった方は、実際にチュートリアルを1つずつ実際にコードを書きながら、進めることをおすすめします。

次回は、公式チュートリアル[Develop in Swift](https://developer.apple.com/tutorials/develop-in-swift/)のData editing and navigation編を公開したいと思います。

# 参考

- SwiftData | Apple Developer Document https://developer.apple.com/documentation/swiftdata
- Meet SwiftData https://developer.apple.com/videos/play/wwdc2023/10187/
- Develop in Swift https://developer.apple.com/tutorials/develop-in-swift
- Meet SwiftData - WWDC2023 https://developer.apple.com/videos/play/wwdc2023/10187/
- SwiftData入門 https://zenn.dev/yumemi_inc/articles/2a929c839b2000

[^1]: 医療・ヘルスケア分野での案件や新規ビジネス創出を担う、2020年に誕生した事業部です。設立エピソードは次の記事をご覧ください。[”新規事業の立ち上げ　フューチャーの知られざる医療・ヘルスケアへの挑戦”](https://note.future.co.jp/n/n8b57d4bf4604)
