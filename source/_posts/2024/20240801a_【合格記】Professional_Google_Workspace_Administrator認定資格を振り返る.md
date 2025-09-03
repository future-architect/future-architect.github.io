---
title: "【合格記】Professional Google Workspace Administrator認定資格を振り返る"
date: 2024/08/01 00:00:00
postid: a
tag:
  - GoogleCloud
  - 合格記
  - Professional Google Workspace Administrator
category:
  - Infrastructure
thumbnail: /images/2024/20240801a/thumbnail.png
author: 岸下優介
lede: "Google Cloud認定資格全冠を目指すべく、Professional Cloud DevOps Engineer 認定資格（PCDE）を受けてきました。無事に合格することができたので、本記事ではざっくりとした所感を書いていきたいと思います"
---

<img src="/images/2024/20240801a/images.png" alt="" width="224" height="224">

## はじめに

Google Cloud認定資格全冠を目指すべく、Professional Cloud DevOps Engineer 認定資格（PCDE）を受けてきました。無事に合格できたので、本記事ではざっくりとした所感を書いていきたいと思います。

また本試験はGoogle Cloudパートナー企業向けのバウチャーを活用して受験しました。大変感謝しております！

Google Cloud 認定資格関連の過去記事：

- [【合格記】Google Cloud Professional Cloud DevOps Engineer認定資格を振り返る](/articles/20240731a/)
- [【合格記】Professional Cloud Database Engineer認定資格を振り返る](/articles/20240730a/)
- [【合格記】Google Cloud Professional Developer認定資格を振り返る](/articles/20240117a/)
- [【合格体験記】Google Cloudの入門試験：Cloud Digital Leader](/articles/20231226a/)
- [【合格記】Google Cloud Professional Cloud Security Engineer認定資格を振り返る](/articles/20230921a/)
- [【合格記】Google Cloud Professional Data Engineer認定資格を振り返る](/articles/20211013a/)
- [【合格記】Google Cloud Professional Machine Learning Engineer認定資格を振り返る](/articles/20220930a/)
- [Google Cloud Professional Cloud Architectの再認定に合格しました](/articles/20220411a/)
- [GCP Professional Cloud Network Engineer に合格しました](/articles/20200902/)
- [GCP Associate Cloud Engineer 合格記](/articles/20210625a/)

これでFuture Tech BlogもGoogle Cloud認定資格全冠達成です！

## 試験と出題範囲

[公式の出題範囲](https://cloud.google.com/learn/certification/google-workspace-administrator?hl=ja)と、実際に自分が受けた際の所感は以下になります。

### オブジェクトの管理

- 組織の統合
  - [Domain Shared Contacts API](https://developers.google.com/admin-sdk/domain-shared-contacts/overview?hl=ja)を利用した外部連絡先の取得・更新
  - [Google Cloud Directory Sync](https://support.google.com/a/answer/106368?hl=ja)を利用した組織のLDAPと同期させたライセンスの更新
  - 組織単位（OU）を利用した複数組織の共存
- ポリシーの設定
  - [コンプライアンスルール](https://support.google.com/a/answer/1346934?hl=ja)に基づくメールコンテンツのフィルタリング
- データ保護
  - [組織の外部共有を管理](https://support.google.com/a/answer/60781)し、不意な情報漏洩を防ぐ
  - 信頼済みドメインを設定することで、ホワイトリスト式の共有許可設定を行う

### サービスの構成

- セキュリティの向上
  - [Gmailにおけるセキュリティサンドボックス](https://support.google.com/a/answer/7676854?hl=ja)を利用した有害な添付ファイルの検出
  - スパムメールの隔離
- サービス利用の制限
  - 会社所有のデバイスを事前に登録しておき、そのデバイスのみでの使用を許可
- [共有ドライブ](https://support.google.com/a/answer/7662202?hl=ja)におけるロールの理解
  - コントリビューター
  - コンテンツマネージャー
  - 編集者
- データ地域の設定
  - [データの保存する地域を設定](https://support.google.com/a/answer/14310028?hl=ja&visit_id=638571458221023820-1919767428&rd=1)することで、各地域の法律を遵守する

### トラブルシューティング

- 誤操作時の対応
  - 誤って削除したアカウントの復元
- 想定しない挙動への対応
  - メールの受信許可設定や隔離設定の確認
- パスワードの同期
  - Active DirectoryとGoogle Workspace間での同期がなされていることを確認

### データのアクセスと認証

- データの共有・コピー
  - ビジター共有機能を利用した外部アカウントへのファイル共有
  - 個人用アプリへのデータコピーを制限
- Single Sign On（SSO）の導入
  - 一度のログインで複数の関連するシステムへアクセス可能とする
- アカウントの保護
  - 2段階認証の設定
  - [Context-Aware Access](https://support.google.com/a/answer/9275380?hl=ja)を設定し、意図しない地域やデバイスからの不正ログインを防ぐ
  - セキュリティ監査ログを利用した通常と異なるサインインパターンを検出する

### ビジネス イニシアチブのサポート

- [Google Vault](https://support.google.com/vault/answer/2462365)の利用
  - 監査や法的調査に向けた案件の作成とデータのエクスポート
  - セキュリティ調査対象の社員にバレないように情報の保護と調査を行う
- [Googleグループ](https://support.google.com/groups/answer/2464926?hl=ja)の利用
  - 一部のユーザーのみに対するポリシーの例外設定
  - メール通知の共同受信箱やグループとして返信する機能の設定
- [カスタムロール](https://support.google.com/a/answer/2406043?hl=ja&ref_topic=9832445&sjid=8210008712949249448-AP)の活用
  - 既存の権限では操作できる範囲が広すぎる・狭すぎる場合に許可範囲を絞ったロールを作成可能
- 各Editionの理解
  - 4つの[Google Workspace Edition](https://support.google.com/a/answer/6043385?hl=ja&co=DASHER._Family%3DBusiness)が存在
    - Business
    - Education
    - Enterprise
    - Essentials
  - 組織の大きさによって使い分ける必要がある

### 全体的な所感

Google Cloudを利用するエンジニアにとって、Google Workspaceの一員としてGmailやGoogle Calender、Google Driveなどは頻繁に利用されているかもしれませんが、Workspace自身で設定されている内容自体は馴染みの薄いものだと思います。

実際に自分も類似のサービスであるCloud Identityを触ったことがあったため若干の知見はありましたが、70％くらいは初見でした。

ただ、ファイルの共有方法やGmailの設定などGoogle Workspaceを利用したことがある方であれば、一度は見たことがある内容も多いので、そこらへんの記憶を頼りに解いていけるのではないでしょうか。

もし手を動かして勉強したい場合は、Google Cloud内でCloud Identityを利用することでざっくりと触ってみることができます[^1]。

## 勉強方法

どの試験もそうですが、4～5択から正解を選ぶ選択式試験なので模擬試験などで場数をこなすことが大事だと思います。

- Google Cloud公式提供の[模擬試験](https://docs.google.com/forms/d/e/1FAIpQLSfjO0tdoBiwvmmy-fcJVtKVwEavDoupVsUSJSw1cDqT2Zoj7Q/viewform?hl=ja)を受験する
- Udemyなどのオンライン学習サービスで模擬試験を購入し勉強する
  - https://www.udemy.com/course/2024google-cloud-professional-workspace-administrator

正解の選択肢を暗記するというよりは、間違った問題に対してドキュメントを読みことが大切です。なぜその選択肢が正解なのかを理解することで他の問題にも応用できるようになっていきます。

## まとめ

本記事ではPGWAを受けた際の所感を記載させて頂きました。正直のところ、資格全冠を目指さなかったら受けていなかった試験だと思うので、Google Workspaceについて勉強になりました。特にGoogle VaultやSecurity Sandboxというサービスは存在すら知っておらず、今回の試験で学びになりました。また、Google Workspace向けのドキュメントはGoogle Cloudと比べてめちゃくちゃあっさりとした内容で面食らいました😂

これにてGoogle Cloud認定資格全冠達成です。やったー！

[^1]:但し、ドメインを購入して自身のGoogle Cloudに組織を追加する必要があるため完全無料ではありません。
