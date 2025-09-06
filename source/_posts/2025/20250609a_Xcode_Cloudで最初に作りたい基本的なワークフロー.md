---
title: "Xcode Cloudで最初に作りたい基本的なワークフロー"
date: 2025/06/09 00:00:00
postid: a
tag:
  - iOS
  - CI/CD
  - Xcode
category:
  - Mobile
thumbnail: /images/2025/20250609a/thumbnail.png
author: 橋本竜我
lede: "Apple 純正のCI/CDサービスである Xcode Cloud を初めて導入するときに、導入時にまず押さえておきたいポイントを実際に試し、まとめた記事です。"
---
<img src="/images/2025/20250609a/image.png" alt="" width="868" height="518" loading="lazy">

# はじめに

[CI/CD連載](/articles/20250603a/) 5本目です。

HIGの橋本です。

Apple 純正のCI/CDサービスである Xcode Cloud を初めて導入するときに、導入時にまず押さえておきたいポイントを実際に試し、まとめた記事です。

本記事では、次の3つについて述べます。

1. リモートリポジトリへのプッシュをトリガーにCIを実行し、ビルドとテストを行う`Pull Request Workflow`
1. Git タグのPushをトリガーとし、ビルド、テスト、TestFlight へアプリを配信する`TestFlight Release Workflow`
1. 成功・失敗を Slack へ通知する手順

# Xcode Cloud 概要

Xcode Cloud は、Xcode に組み込まれた継続的インテグレーションおよびデリバリーサービスで、Apple デベロッパーのために設計された CI/CD サービスです。署名まわりの煩雑な設定が不要になる点が最大の特徴です。これにより開発者はワークフロー最適化といった本質的な作業に集中でき、結果として開発体験が向上します。

[Xcode Cloud - Apple Developer](https://developer.apple.com/jp/xcode-cloud/)

主に次のような機能、特徴を持っています。

- 自動ワークフロー
  - 開発プロセスに合わせてワークフローをカスタマイズすることが可能できます
トリガー、アクション（ビルド、テストなど）、通知などを設定できます
- 並列テスト
  - 複数プラットフォーム・複数デバイスでのテストを並列実行できます
- Xcode への組み込み
  - Xcode から実行状況やクラッシュレポートをまとめて確認できます
- App Store Connect への組み込み
  - App Store Connect でも同じ情報を閲覧でき、Workflow の編集も行えます
- Apple Developer Program メンバーシップ加入者は、毎月25時間分のコンピューティング時間を無料で利用できます

::: note warn
注意

Xcode Cloud の毎月25時間分無料枠は、2025年6月時点の情報になります。今後変更される可能性があります。最新情報は Apple 公式ページをご確認ください。
:::

# Pull Request Workflow

リモートリポジトリへのプッシュをトリガーにCIを実行し、ビルドとテストを行う`Pull Request Workflow`を作成します。

- [Getting started with Xcode Cloud: Pull Request (PR) Workflow](https://medium.com/kinandcartacreated/getting-started-with-xcode-cloud-pull-request-pr-workflow-ce02bb83f9e5#b73f)

## ワークフローの設定

ワークフローで設定できる各種項目は次のとおりです。

| 大分類 | 設定できる主な項目 |
|:--|:--|
| **General**  |  ワークフローの名前、説明、編集権限、プライマリリポジトリ |
| **Environment**  |  Xcode バージョン、 macOS バージョン、クリーンビルド、環境変数 |
| **Start Conditions**  | ブランチの変更、PRの変更、タグの変更、手動開始  |
| **Actions**  | 分析、アーカイブ、ビルド、テスト  |
| **Post-Actions**  |  TestFlight 外部テスト、TestFlight 内部テスト、公証（macOS のみ）、通知 |

以下では、Xcode での設定例を示します。

### General

ワークフローの名前や説明を記載し、リポジトリ、プロジェクトを設定します。

<img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.26.21.png" alt="スクリーンショット_2025-06-09_12.26.21.png" width="1200" height="793" loading="lazy">

### Environment

Xcode Version, macOS Version を最新に設定します（自身のプロジェクトに合わせて対象バージョンを修正してください）。

<img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.26.35.png" alt="スクリーンショット_2025-06-09_12.26.35.png" width="1200" height="790" loading="lazy">

### Start Conditions (Pull Request Changes)

feature ブランチで変更をコミットし、リモートブランチに Push したことをトリガーに CI が動作するように設定します。

- Sourceブランチを`feature/`で始まるブランチに設定
- Targetブランチを`develop`ブランチに設定

<img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.26.47.png" alt="スクリーンショット_2025-06-09_12.26.47.png" width="1200" height="791" loading="lazy">

### Actions

トリガーを検知したときに、実行する内容をここで決めます。本ワークフローではビルドとテストを追加します。

1. Build - iOS
  <img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.27.05.png" alt="スクリーンショット_2025-06-09_12.27.05.png" width="1200" height="793" loading="lazy">
2. Test - iOS
  <img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.27.14.png" alt="スクリーンショット_2025-06-09_12.27.14.png" width="1200" height="793" loading="lazy">

### Post-Actions

Actions の実行完了後の処理を定義します。ここでは、指定の Slack チャンネルへ成功・失敗の通知が届くように設定します。

<img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.27.48.png" alt="スクリーンショット_2025-06-09_12.27.48.png" width="1200" height="790" loading="lazy">

## 動作イメージ

feature ブランチで改修し、develop ブランチへのPRを作成したときの CI 動作イメージを示します。

まず、 feature ブランチで変更をコミットし、リモートブランチに Push します。

```sh
git checkout -b feature/7-modify-title
git add .
git commit -m "fix: modify navigation title"
git push origin feature/7-modify-title
```

GitHub 上で PR を作成します。

トリガーである`feature/`で始まるブランチから`develop`へのPRが作成されたことを検知し、XcodeとGitHub上でCIが動作していることが確認できます。

Xcode

<img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.37.03.png" alt="スクリーンショット_2025-06-09_12.37.03.png" width="1200" height="725" loading="lazy">

GitHub

<img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.36.39.png" alt="スクリーンショット_2025-06-09_12.36.39.png" width="1200" height="378" loading="lazy">

Build と Test が成功すると、Xcode で次のように結果概要が確認できます。

<img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.48.51.png" alt="スクリーンショット_2025-06-09_12.48.51.png" width="1200" height="725" loading="lazy">

GitHub の PR 上で次のように、Pull Request Workflow が成功していることも確認できます。

<img src="/images/2025/20250609a/image_2.png" alt="image.png" width="1200" height="478" loading="lazy">

また、成功通知が Slack に届いていることも確認できます。

<img src="/images/2025/20250609a/スクリーンショット_2025-06-09_12.50.53.png" alt="スクリーンショット_2025-06-09_12.50.53.png" width="1200" height="359" loading="lazy">

# TestFlight Release Workflow

シンプルなGitタグのPushをトリガーとする、ビルド、テスト、アーカイブ、TestFlightリリースする `TestFlight Release Workflow`を作成します。

## ワークフローの設定

ワークフローを次のように設定します。ここでは、Xcode 上から設定する例を示します。
重要な点としては、TestFlight リリースするために、Actions に Archive を必ず追加します。

### General

ワークフローの名前を`TestFlight Release Workflow`とします。

<img src="/images/2025/20250609a/image_3.png" alt="image.png" width="1200" height="792" loading="lazy">

### Environment

Xcode Version, macOS Version を最新に設定します（自身のプロジェクトに合わせて対象バージョンを修正してください）。

<img src="/images/2025/20250609a/image_4.png" alt="image.png" width="1200" height="792" loading="lazy">

### Start Conditions (Tag Changes)

Git タグの Push をトリガーとするため、Tag Changes を選択します。
ここでは、TagはAny Tag としています（Tag の命名ルールがある場合は、Custom Tags から指定できます）。

<img src="/images/2025/20250609a/image_5.png" alt="image.png" width="1200" height="788" loading="lazy">

### Actions

TestFlight リリースを行う本ワークフローではビルドとテストに加えて、アーカイブも追加します。
1. Build - iOS
  <img src="/images/2025/20250609a/image_6.png" alt="image.png" width="1200" height="789" loading="lazy">
2. Test - iOS
  <img src="/images/2025/20250609a/image_7.png" alt="image.png" width="1200" height="792" loading="lazy">
3. Archive - iOS
  <img src="/images/2025/20250609a/image_8.png" alt="image.png" width="1200" height="787" loading="lazy">

### Post-Actions

Slack への通知するNotify、内部テスター向けTest Flight リリースする TestFlight Internal Testing を追加します。

1. Notify - Successes and Failures
  <img src="/images/2025/20250609a/image_9.png" alt="image.png" width="1200" height="789" loading="lazy">
2. TestFlight Internal Testing - iOS
  内部テスターグループを選択します。（事前に、App Store Connect上で内部テスターの登録が必要です。）
  <img src="/images/2025/20250609a/image_10.png" alt="image.png" width="1200" height="789" loading="lazy">

### 動作イメージ

`release`ブランチにチェックアウトし、タグを作成して`Push`します。

```sh
git checkout release
git tag v1.0.0
git push origin v1.0.0
```

トリガーを検知し、CI が動作します。

Xcode

<img src="/images/2025/20250609a/image_11.png" alt="image.png" width="1200" height="725" loading="lazy">

App Store Connect

<img src="/images/2025/20250609a/image_12.png" alt="image.png" width="1200" height="751" loading="lazy">

ワークフローが無事成功しました。Xcode, App Store Connect ではそれぞれ次のように成功していることを確認できます。

Xcode

<img src="/images/2025/20250609a/image_13.png" alt="image.png" width="1200" height="725" loading="lazy">

App Store Connect

<img src="/images/2025/20250609a/image_14.png" alt="image.png" width="1200" height="783" loading="lazy">

App Store Connect の TestFlight タブに新しいビルドが作成され、ステータス「テスト中」となり、内部テスターに配信されていることが確認できます。

<img src="/images/2025/20250609a/image_15.png" alt="image.png" width="1200" height="459" loading="lazy">

また、Slack へ本ワークフローが成功したことを伝える通知が届きます。

<img src="/images/2025/20250609a/image_16.png" alt="image.png" width="1104" height="306" loading="lazy">

これで TestFlight リリースしたいブランチにタグを Push するだけで、簡単に TestFlight リリースができるようになりました。

#### Tips

検証中、Archive は正常に完了しても TestFlight への配信が一向に進まない事象に遭遇しましたが、以下の記事で紹介されている手順で解消できました。

- [Xcode CloudでArchiveは成功するのにTestFlightへの配信が進まないとき](https://zenn.dev/miharun/articles/dd537b43b97a6d)

原因：
> アプリの新しいバージョンを提出するたびに、App Store Connectはコンプライアンスレビューを案内する質問をします。アプリInformation Property Listファイルに必要な情報を提供することで、これらの質問を回避し、提出プロセスを合理化できます。

解決策：
> アプリが暗号化を使用していない場合は、`Info.plist`ファイルに`ITSAppUsesNonExemptEncryption`キーを追加し、値を`NO`に設定します。

## 成功・失敗をSlackへ通知する設定手順

次の Apple 公式ドキュメントを参考に、成功・失敗を Slack へ通知するように設定してみます。

- [Connecting Xcode Cloud to Slack | Apple Developer Documentation](https://developer.apple.com/documentation/xcode/connecting-xcode-cloud-to-slack)

まず、Slack への通知したい WorkFlow の編集画面を開き、Post-Actions に Notify を追加します。

<img src="/images/2025/20250609a/image_17.png" alt="image.png" width="965" height="634" loading="lazy">

画面キャプチャ中の Slack の下の「＋」ボタンを押します。

<img src="/images/2025/20250609a/image_18.png" alt="image.png" width="960" height="630" loading="lazy">

Slackのワークスペースと接続するか問われるダイアログが表示されるので、「Connect...」を押します。

<img src="/images/2025/20250609a/image_19.png" alt="image.png" width="1200" height="623" loading="lazy">

ブラウザが立ち上がり、Xcode Cloud に Slack の任意のワークスペースにアクセスする権限を付与してよいか確認されます。
問題なければ、「許可」をクリックします。

<img src="/images/2025/20250609a/image_20.png" alt="image.png" width="962" height="633" loading="lazy">

Xcode に戻り、アクセス権限を付与したワークスペースのチャンネルが表示されます。
通知を送信したいチャンネルを選択し、「OK」を押します。

<img src="/images/2025/20250609a/image_21.png" alt="image.png" width="1200" height="789" loading="lazy">

「Save」をクリックして変更を保存します。
これで CI/CD の実行結果が Slack へ通知されるようになります。

**成功したときの通知例**

<img src="/images/2025/20250609a/image_22.png" alt="image.png" width="592" height="173" loading="lazy">

とても簡単に設定ができました。
この通知から、App Store Connect の Xcode Cloud のページを直接開いたり、該当の PR を開いたり出来るのもとても便利です。

# 最後に

Xcode Cloud でまず作りたい基本的な CI ワークフローとして、2種類のワークフローを作成してみました。

今回作成した Pull Request Workflow と TestFlight Release Workflow や、当社の有志メンバーで作成した[Gitブランチフロー規約](https://future-architect.github.io/arch-guidelines/documents/forGitBranch/git_branch_standards.html)などを参考に、皆さんのプロジェクトで最適な CI/CD ワークフローを考えてみるのはいかがでしょうか。

Xcode Cloud でできることはまだたくさんあるので、知見がたまり次第また記事にしたいと思います。

# 参考

- [Xcode Cloud - Apple Developer](https://developer.apple.com/jp/xcode-cloud/)
- [Configuring your first Xcode Cloud workflow | Apple Developer Documentation](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow)
- [Getting started with Xcode Cloud: Pull Request (PR) Workflow](https://medium.com/kinandcartacreated/getting-started-with-xcode-cloud-pull-request-pr-workflow-ce02bb83f9e5#b73f)
- [Connecting Xcode Cloud to Slack | Apple Developer Documentation](https://developer.apple.com/documentation/xcode/connecting-xcode-cloud-to-slack)
- [Xcode CloudでArchiveは成功するのにTestFlightへの配信が進まないとき](https://zenn.dev/miharun/articles/dd537b43b97a6d)
