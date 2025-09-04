---
title: "AirPods Proで頭の角度を検出し、リアルタイムにキャラクターを動かす"
date: 2024/06/05 00:00:00
postid: a
tag:
  - Swift
  - SwiftUI
  - Apple
  - AirPodsPro
  - iOS
category:
  - Mobile
thumbnail: /images/2024/20240605a/thumbnail.png
author: 橋本竜我
lede: "AirPods Proの空間オーディオ機能にあるヘッドトラッキングを用いることで、頭の角度の取得をしてみました"
---
<img src="/images/2024/20240605a/image.png" alt="" width="1200" height="390" loading="lazy">

# はじめに

HealthCare Innovation Group(HIG)[^1]の橋本です。

先週末注文していたAirPods Pro第2世代が今日手元に届きました!

<img src="/images/2024/20240605a/4f1c2557-bc97-063a-4e10-7f75b16d2449.jpeg" alt="" width="1200" height="923" loading="lazy">

約4年間使っていたAirPods Pro第1世代の調子が悪くなってしまったため、買い換えました。

せっかく新しいAirPods Proが届いたので、なにかできることないかな〜と思いながら、AirPods Proの機能一覧を見ていました。

私はその中の1つ、空間オーディオ機能でヘッドトラッキングしていることに目をつけ、頭の角度の取得をしてみました。

# 環境

- OS: macOS Sonoma 14.5
- Xcode: 15.4 (15F31d)
- Swift: 5.10
- AirPods Pro(第2世代)

※ 空間オーディオ機能搭載端末
AirPods(第３世代)、AirPods Pro(全世代)、AirPods Max
(参考URL: [AirPodsユーザガイド 空間オーディオとヘッドトラッキングを操作する](https://support.apple.com/ja-jp/guide/airpods/dev00eb7e0a3/web))

# 今回作ったもの

AirPodsProで取得した頭の角度でリアルタイムにキャラクター動かせるミニアプリ。

<img src="/images/2024/20240605a/headTracking_2_(1).gif" alt="" width="154" height="334" loading="lazy">

キャラクターが動いている部分は、次のように、私がAirPods Proをつけた状態で頭を傾けたり、回転したりしています。かなりよい感度で表示できているなと感じます。

<img src="/images/2024/20240605a/画面収録_2024-05-30_23.08.00.gif" alt="" width="310" height="178" loading="lazy">

このミニアプリで使用したフレームワークや各種APIを紹介していきたいと思います。

## CoreMotionフレームワークとは

[CoreMotion](https://developer.apple.com/documentation/coremotion)とは、各種Appleが提供するハードウェア（iOS, iPadOS, watchOS, visionOS device）のモーションデータを取得できるフレームワークです。

CoreMotionフレームワークのひとつのクラスとして、`CMHeadphoneMotionManager`があります。

## [CMHeadphoneMotionManager](https://developer.apple.com/documentation/coremotion/cmheadphonemotionmanager)

このクラスを使うことで名前の通り、ヘッドフォンのモーション情報をアプリに提供することが可能になります。

使用するためには、`Info.plist`で`NSMotionUsageDescription`キーを追加し、モーションデータを使用する具体的な理由を記載する必要があります。

::: note warn
注意
`NSMotionUsageDescription`キーが存在しない場合、対応するデバイスのモーションデータを更新しようとするとアプリがクラッシュしてしまいます。
:::

今回使用する`CMHeadphoneMotionManager`が持つ主なメソッドについて、説明します。

### [isDeviceMotionAvailable](https://developer.apple.com/documentation/coremotion/cmmotionmanager/1616094-isdevicemotionavailable)

接続している端末でCoreMotionが使えるか否かをBool値で返すメソッド。

### [startDeviceMotionUpdates(to:withHandler)](https://developer.apple.com/documentation/coremotion/cmmotionmanager/1616048-startdevicemotionupdates)

モーションデータの更新を開始し、データの更新を指定のキューに送信するメソッド。

### [stopDeviceMotionUpdate()](https://developer.apple.com/documentation/coremotion/cmmotionmanager/1616115-stopdevicemotionupdates)

モーションデータの更新を停止するメソッド。

# 実際にアプリを作ってみる

## 事前準備

CoreMotionフレームワークが使えるように、Info.plistに`NSMotionUsageDescription`キーを追加、説明を記載します。

Info.plist

<img src="/images/2024/20240605a/image_2.png" alt="image.png" width="1200" height="253" loading="lazy">

project.pbxproj

```sh
INFOPLIST_KEY_NSMotionUsageDescription = "To sync the movements of the character’s head on the screen with your head movements for an enhanced interactive experience.";
```

これで、次のようにモーションデータを取得する前に、許可を求められるポップアップが表示されます。

<img src="/images/2024/20240605a/d972ec41-263c-c9de-0ebf-3dfce17b2334.jpeg" alt="" width="400" height="866" loading="lazy">

## HeadTrackingを管理するクラスを用意する

HeadTrackingを監視するために、HeadTrackingManagerクラスを定義します。このクラスを使うことで、モーションデータを取得し、リアルタイムでSwiftUIビューに反映させることができます。

次に、コード全体を共有します。

```swift
import CoreMotion
import Foundation

class HeadTrackingManager: ObservableObject {
    private var motionManager: CMHeadphoneMotionManager
    @Published var pitch: Double = 0.0
    @Published var roll: Double = 0.0
    @Published var yaw: Double = 0.0

    init() {
        motionManager = CMHeadphoneMotionManager()
    }
    // モーションデータのトラッキングを開始する
    func startTracking() {
        // 接続している端末でCoreMotionが使えるか否かを確認する
        guard motionManager.isDeviceMotionAvailable else {
            print("Headphone motion data is not available.")
            return
        }

        // モーションデータの更新を開始し、メインキューに送信する。
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] (motion, error) in
            guard let self = self, let motion = motion, error == nil else {
                print("Error: \(String(describing: error))")
                return
            }

            // 正常にモーションデータ取得後、頭の角度を取得する
            Task {
                await self.updateMotionData(motion)
            }
        }
    }

    // モーションデータの更新を停止する
    func stopTracking() {
        motionManager.stopDeviceMotionUpdates()
    }

    // モーションデータから頭の角度（ピッチ、ロール、ヨー）を取得する
    private func updateMotionData(_ motion: CMDeviceMotion) async {
        await MainActor.run {
            self.pitch = motion.attitude.pitch
            self.roll = motion.attitude.roll
            self.yaw = motion.attitude.yaw
        }
    }
}
```

## 全体概要

このクラスは`ObservableObject`プロトコルに準拠させ、SwiftUIビューと連携して動作させるようにしています。

## 各プロパティの説明

- `motionManager: CMHeadphoneMotionManager`
    MHeadphoneMotionManager のインスタンスで、ヘッドモーションデータの取得を管理する。
- `@Published var pitch: Double`
    頭のピッチ（上下の回転角度）を表す。
- `@Published var roll: Double`
    頭のロール（左右の傾き角度）を表す。
- `@Published var yaw: Double`
    頭のヨー（水平面内の回転角度）を表す。
    これらのプロパティは、　`@Published`が付与されているので、変更があったときにはビューを自動的に更新する。

次に、各メソッドを説明します。

## startTracking()

モーションデータの取得を開始するメソッド。

```swift
func startTracking() {
        // 接続している端末でCoreMotionが使えるか否かを確認する
        guard motionManager.isDeviceMotionAvailable else {
            print("Headphone motion data is not available.")
            return
        }

        // モーションデータの更新を開始し、メインキューに送信する。
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] (motion, error) in
            guard let self = self, let motion = motion, error == nil else {
                print("Error: \(String(describing: error))")
                return
            }

            // 正常にモーションデータ取得後、頭の角度を取得する
            Task {
                await self.updateMotionData(motion)
            }
        }
    }
```

モーションデータを提供できるかどうかを`isDeviceMotionAvailable`で確認します。その後、モーションデータの更新を開始し、データが取得されるたびに`Task`クロージャ内で、`updateMotionData(_:)`メソッドを呼び出します。

## stopTracking()

モーションデータの取得を停止するメソッド。`stopDeviceMotionUpdates()` メソッドを呼び、モーションデータの取得を停止します。

```swift
func stopTracking() {
    motionManager.stopDeviceMotionUpdates()
}
```

### updateMotionData(_ motion: CMDeviceMotion) async

モーションデータの取得、更新を行うメソッド。

```swift
private func updateMotionData(_ motion: CMDeviceMotion) async {
        await MainActor.run {
            self.pitch = motion.attitude.pitch
            self.roll = motion.attitude.roll
            self.yaw = motion.attitude.yaw
        }
    }
```

UI更新を安全に行うために、`MainActor.run`内でUIの更新を行うことでUIスレッドの競合が発生しないようにしています。

取得した姿勢データ`attitude`を使用して、`pitch`、`roll`、`yaw`の更新を行います。

## Viewに反映させる

最後に、取得したデータを元にキャラクターを３次元空間でぐりぐり動かせるようにします。

`Image()`をロール、ピッチ、ヨーで３次元回転させるように、`.rotation3DEffect()`を使用します。

ヨーに関しては、内側のカメラで自分を撮影するときと同様に、キャラクターが動くようにY軸周りの回転角を負の値に設定しています。

```swift
Image("monster")
    .resizable()
    .aspectRatio(contentMode: .fit)
    .frame(width: 250, height: 250)
    .rotation3DEffect(Angle(radians: headTrackingManager.roll), axis: (x: 0, y: 0, z: 1))
    .rotation3DEffect(Angle(radians: headTrackingManager.pitch), axis: (x: 1, y: 0, z: 0))
    .rotation3DEffect(Angle(radians: -(headTrackingManager.yaw)), axis: (x: 0, y: 1, z: 0))
```

ボタンを押下するごとにHeadTrackingの計測状態と停止状態が入れ替わるようにします。

```swift
Button {
    if isTracking {
        headTrackingManager.stopTracking()
    } else {
        headTrackingManager.startTracking()
    }
    isTracking.toggle()
} label: {
    Text(isTracking ? "Stop Tracking" : "Start Tracking")
        .padding()
        .background(isTracking ? Color.red : Color.green)
        .foregroundColor(.white)
        .cornerRadius(8)
}
```

このボタンを押下することで、HeadTrackingが開始します。

全体のコードは次に記載しているので、手元で試してみてください。

## コード全体

<details><summary>HeadTrackingApp.swift</summary>

```swift
import SwiftUI

@main
struct HeadTrackingApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

</details>

<details><summary>HeadTrackingManager.swift</summary>

```swift
import CoreMotion
import Foundation

class HeadTrackingManager: ObservableObject {
    private var motionManager: CMHeadphoneMotionManager
    @Published var pitch: Double = 0.0
    @Published var roll: Double = 0.0
    @Published var yaw: Double = 0.0

    init() {
        motionManager = CMHeadphoneMotionManager()
    }

    func startTracking() {
        guard motionManager.isDeviceMotionAvailable else {
            print("Headphone motion data is not available.")
            return
        }

        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] (motion, error) in
            guard let self = self, let motion = motion, error == nil else {
                print("Error: \(String(describing: error))")
                return
            }

            Task {
                await self.updateMotionData(motion)
            }
        }
    }

    func stopTracking() {
        motionManager.stopDeviceMotionUpdates()
    }

    private func updateMotionData(_ motion: CMDeviceMotion) async {
        await MainActor.run {
            self.pitch = motion.attitude.pitch
            self.roll = motion.attitude.roll
            self.yaw = motion.attitude.yaw
        }
    }
}
```

</details>

<details><summary>ContentView.swift</summary>

```swift
import SwiftUI

struct ContentView: View {
    @StateObject private var headTrackingManager = HeadTrackingManager()
    @State private var isTracking = false

    var body: some View {
        VStack(alignment: .center) {
            Text("Your head position")
                .font(.largeTitle)

            Image("monster")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 250, height: 250)
                .rotation3DEffect(Angle(radians: headTrackingManager.roll), axis: (x: 0, y: 0, z: 1))
                .rotation3DEffect(Angle(radians: headTrackingManager.pitch), axis: (x: 1, y: 0, z: 0))
                .rotation3DEffect(Angle(radians: -(headTrackingManager.yaw)), axis: (x: 0, y: 1, z: 0))

            HStack {
                VStack() {
                    Text("Head Tracking Data")
                        .font(.title)
                    Text("Pitch: \(headTrackingManager.pitch)")
                    Text("Roll: \(headTrackingManager.roll)")
                    Text("Yaw: \(headTrackingManager.yaw)")
                }
            }
        }
        HStack {
            Button {
                if isTracking {
                    headTrackingManager.stopTracking()
                } else {
                    headTrackingManager.startTracking()
                }
                isTracking.toggle()
            } label: {
                Text(isTracking ? "Stop Tracking" : "Start Tracking")
                    .padding()
                    .background(isTracking ? Color.red : Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
    }
}
```

</details>

# さいごに

`CMHeadphoneMotionManager`を使うことでとても簡単にHeadTrackingを行うことができました！

今後は、今回取得した頭の角度データを時系列データとして扱い、`HealthKit`フレームワークの`HKHealthStore`に保存したりして健康促進に活用できないか等、色々検討したいと思います。

# 参考

- AirPods Pro（第2世代）
https://www.apple.com/jp/airpods-pro/
- 空間オーディオとヘッドトラッキングを操作する
https://support.apple.com/ja-jp/guide/airpods/dev00eb7e0a3/web
- AirPods Proの加速度センサーの値を取得する【iOS14】
https://qiita.com/tukutuku_tukuyo/items/ea949ee2dbb499d6e7ca
- Core Motion | Apple Developer Documentation
https://developer.apple.com/documentation/coremotion
- CMHeadphoneMotionManager | Apple Developer Documentation
https://developer.apple.com/documentation/coremotion/cmheadphonemotionmanager
- isDeviceMotionAvailable | Apple Developer Documentation
https://developer.apple.com/documentation/coremotion/cmmotionmanager/1616094-isdevicemotionavailable
- stopDeviceMotionUpdates() | Apple Developer Documentation
https://developer.apple.com/documentation/coremotion/cmmotionmanager/1616115-stopdevicemotionupdates
- startDeviceMotionUpdates(to:withHandler) | Apple Developer Documentation
https://developer.apple.com/documentation/coremotion/cmmotionmanager/1616048-startdevicemotionupdates
- かわいいフリー素材集『いらすとや』
https://www.irasutoya.com/

[^1]: 医療・ヘルスケア分野での案件や新規ビジネス創出を担う、2020年に誕生した事業部です。設立エピソードは次の記事をご覧ください。[”新規事業の立ち上げ　フューチャーの知られざる医療・ヘルスケアへの挑戦”](https://note.future.co.jp/n/n8b57d4bf4604)
