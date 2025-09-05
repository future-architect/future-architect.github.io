---
title: "Apple Vision Pro で Enterprise API を使う方法"
date: 2024/09/06 00:00:00
postid: a
tag:
  - Apple
  - VisionPro
category:
  - VR
thumbnail: /images/2024/20240906a/thumbnail.png
author: 山本力世
lede: "WWDC2024: visionOS向けエンタープライズAPIのご紹介 よりvisionOS 2.0からはEnterprise APIという、企業向けのAPIを利用することができます。ただし、利用するにはAppleへ申請し、承認されると送られてくるライセンスファイルをプロジェクト内に含めてビルドする必要がありますので、利用までの一連の手続きをまとめておきたいと思います。"
---
<img src="/images/2024/20240906a/スクリーンショット_2024-09-05_16.04.34.png" alt="" width="604" height="345" loading="lazy">

▼WWDC2024: visionOS向けエンタープライズAPIのご紹介 より

---

visionOS 2.0からはEnterprise APIという、企業向けのAPIを利用することができます。

ただし、利用するにはAppleへ申請し、承認されると送られてくるライセンスファイルをプロジェクト内に含めてビルドする必要がありますので、利用までの一連の手続きをまとめます。

## Enterprise API

Enterprise APIには次のようなものが用意されています。

### センサーへの拡張アクセス

- Main Camera Access
  - 前方のメインカメラからの入力データの取得
- Passthrough in Screen Capture
  - Vision Proを装着している人が見ている、現実世界とデジタルコンテンツが合わさっている表示へのアクセス
- Spatial Barcode and QR code Scanning
  - 空間にあるバーコードとQRコードのスキャン

### visionOSを最大限駆使するためのプラットフォーム制御

- Apple Neural Engine access
  - 機械学習タスク用のApple ニューラルエンジンへのアクセス
- Object Tracking Parameter Adjustment
  -　既知オブジェクトの検出と設定可能なパラメータを使ったトラッキングの最適化
- Increased Performance Headroom
  - 熱使用量の増加とバッテリー寿命の低下のトレードオフを伴った、高い計算能力が必要な場合のCPUとGPUのパワーを追加

これらの具体的な紹介については、次のWWDC2024のビデオが参考になります。（字幕はデフォルトだと英語なので日本語に切り替えてから再生してください）

- [visionOS向けエンタープライズAPIのご紹介](https://developer.apple.com/jp/videos/play/wwdc2024/10139/)

次にこれらのEnterprise APIを利用するための手順を紹介します。

## Appleへの申請

[Building spatial experiences for business apps with enterprise APIs for visionOS](https://developer.apple.com/documentation/visionOS/building-spatial-experiences-for-business-apps-with-enterprise-apis)ページ内に「Development Only request」と書かれている部分にリンクが張ってあるのでそちらをクリックしその先のページで申請をします。申請時は使用したい機能などを記入していきます。

注意する点としては、Apple Developer Program もしくは Apple Developer Enterprise Programのそれぞれアカウントホルダーでないと申請手続きが行えません。申請後はAppleからアカウントホルダーへ承認メールが来るまで待ちます。

参考情報となりますが、先日申請した際は10日程経った後、ライセンスファイルが添付されたメールが届きました。

## ライセンスファイルのプロジェクトへの追加

上記メールに添付されていたライセンスファイルは、プロジェクトに含める必要があるので、プロジェクトフォルダ内へコピーします。プロジェクト内であればネストしたフォルダ配下でも大丈夫なようです。なお、このファイルは有効期限が設定されています。

参考情報となりますが、今回の申請では、始めに届いたファイルは有効期限が１ヶ月弱で、有効期限が切れる少し前に更新された新しいライセンスファイルがAppleから届きました。

## エンタイトルメントファイルの作成

プロジェクト設定の「+Capability」をクリックし、使用したい機能を追加します。

TeamがPersonal TeamやNoneに設定されていると候補に出てこないので注意してください。

具体的な手順は[Adding capabilities to your app](https://developer.apple.com/documentation/xcode/adding-capabilities-to-your-app)などを参照しましょう。

## プログラムの作成

AppleからEnterprise APIを使った例が示されていますのでそれを参考に作成してみましょう。
[Locating and decoding barcodes in 3D space](https://developer.apple.com/documentation/visionos/locating-and-decoding-barcodes-in-3d-space)

上記例はImmersiveView.swiftについてしか示されていないので、あらかじめvisionOSアプリの新規プロジェクトを作成し、その中のImmersiveView.swiftの内容を上記ページに記載されている内容に置き換えます。その後、上記に書いてきているEnterprise API を使う手順を全て行い、ビルドし実行すると実機にて動作を確認（コード状に黄緑色の四角い面が重なったアニメーションが表示され、コンソールにデコードされた値が表示されます）することができます。

ちなみに検出できるコードのサイズはQRコードの場合だと2,3cm以上ないとダメなようです。

## トラブルシューティング

必要な権限が含まれているライセンスファイルがプロジェクトに含まれていない、もしくはライセンスファイルの有効期限が切れている場合は、

```sh
App not authorized.
```

とコンソールに出て、プログラム内で呼び出しているEnterprise APIが実行できません。

## まとめ

Vision ProでEnterprise API を使う方法についてまとめました。

今後も引き続き、Vision Pro関係の記事を投稿していく予定です。
