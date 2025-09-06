---
title: "Azure Data Boxを使ってみた"
date: 2022/11/08 00:00:00
postid: a
tag:
  - Azure
  - データ移行
  - クラウドマイグレーション
category:
  - Infrastructure
thumbnail: /images/2022/20221108a/thumbnail.JPG
author: 一ノ瀬秀都
lede: "オンプレからクラウドへのデータ移行に関して、AzureのData Boxというサービスを利用する機会があったので、詳細なワークフローや失敗談について共有します。昨今のDX推進の流れにのり、システムのクラウドシフト/リフトに取り組む方も多いかと思います。「クラウドへの移行を考えているがデータ量が膨大で移行ができない」といった悩みがあったり..."
---
# はじめに

はじめまして、テクノロジーイノベーショングループ所属、2021年4月に新卒で入社した一ノ瀬です。

[秋のブログ週間](/articles/20221031a/)の6本目となる本記事では、オンプレからクラウドへのデータ移行に関して、AzureのData Boxというサービスを利用する機会があったので、詳細なワークフローや失敗談について共有します。

昨今のDX推進の流れにのり、システムのクラウドシフト/リフトに取り組む方も多いかと思います。

「クラウドへの移行を考えているがデータ量が膨大で移行ができない」といった悩みがあったり、「クラウドへのデータ移行でData Boxサービスを利用したい！ けど、よくわからない...」という方々に本記事を参考にしていただけると幸いです。

# Data Boxを利用する背景

今回の要件は、オンプレのデータ分析基盤で収集していた100TB以上のデータをAzureに移行することでした。

当初はAzure専用線を使ったオンラインのデータ移行を検討していました。

しかし、データ容量の大きさから移行に約7ヶ月かかる点からオンラインのデータ移行は断念しました。

短期間かつNW負荷が低くてすむ移行方法はないか？ ということで、オンプレ基盤とAzure間でオフラインでデータ移行できるサービスData Boxを利用することになりました。

続いては、動作環境に触れていきます。

# 動作環境のはなし

### 物理構成はどんな感じ？

データコピー時の登場人物は以下の計3端末です。

1. Data Box
1. Data Box初期設定用PC
1. データコピー用サーバ

<img src="/images/2022/20221108a/WS000297.JPG" alt="WS000297.JPG" width="1037" height="736" loading="lazy">

Data Box初期設定用PCとデータコピー用サーバは今回の案件のために用意したので、以下に環境情報を記します。
転送先はAzure Data Boxの領域であり、また転送元はユーザにより異なるため環境情報の説明は省きます。

**データコピー用サーバ**

* Red Hat Enterprise for Linux v8.4
* メモリ16GB
* 1CPU4コア

**Data Box初期設定用PC**（※）

* Windows10
* Google Chrome(2022/8/18時点最新)

※借用PCのため詳細不明

### Data Boxの結線の詳細は？

Data Boxの結線についても紹介します。
今回の構成では、以下の組み合わせで結線しています。

|  Data Boxのポート |  接続先  |  種別  |  ポートの説明  |
| :---- | :---- | :---- | :---- |
|  MGMTポート  |  Data Box初期設定用PC  |  RJ45  |  初期設定時のみ使用<br>データコピーでは使用しない  |
|  Data#1~2ポート |  10GbE対応のL2スイッチ  |  10GBASE-SR  |  データコピーにて<br>メインで使用する  |
|  Data#3ポート |  1GbE対応のL2スイッチ  |  RJ45  |  アクセスは発生させない<br>前提条件を満たすために結線  |

以下は結線のイメージです。
<img src="/images/2022/20221108a/image.png" alt="" width="820" height="449" loading="lazy">
出典：[Azure Data Boxの配線方法](https://learn.microsoft.com/ja-jp/azure/databox/data-box-cable-options#transfer-via-data-port-with-static-ips-using-a-switch)

今回MGMTポート + Data#1~3ポート全てで結線をしている理由は、サービス利用の前提として調達・結線が求められているためです。

[Docs:DataBoxのクイックスタート](https://learn.microsoft.com/ja-jp/azure/databox/data-box-quickstart-portal)の前提条件の1つに以下の記述があります。
>Data Box をホスト コンピューターに接続するために以下のケーブルを用意していること。
>・10 GbE SFP+ Twinax 銅線ケーブル 2 本 (DATA 1、DATA 2 ネットワーク インターフェイスで使用)
>・RJ-45 CAT 6 ネットワーク ケーブル 1 本 (MGMT ネットワーク インターフェイスで使用)
>・RJ-45 CAT 6A OR ネットワーク ケーブル 1 本、RJ-45 CAT 6 ネットワーク ケーブル 1 本 (それぞれ 10 Gbps または 1 Gbps として構成されている DATA 3 ネットワーク インターフェイスで使用)

また、Microsoftサポートから以下コメントを頂いています。
>Docsにて「必要」と記載のある部材に関しては原則調達をお願いしております。
>仮に上記が欠けている場合、有事の際にサービス提供者側としての責任を負うことが出来ないという判断になる懸念がございます。

以上から、Microsoft社はケーブルを4本全て用意し、Data Boxのすべてのポートを接続させた状態で使用することを前提にしているようです。

最低限の構成（例：Data#1とMGMTのみ）でも動作はするかと思いますが、今回は万全を期すために、MGMT + Data#1~3ポート全てで結線をしています。

また結線に使用したケーブルやアダプターについても説明します。

SFP+アダプターにはCiscoの「SFP-10G-SR」という機種を使用しました。
SFP+アダプターについては、問い合わせを起票してMiceosoftサポートが推奨する機種を参考に選びました。
以下サポートからの回答です。
>[Mellanox ConnectX-3 Firmware Release Notes](https://network.nvidia.com/pdf/firmware/ConnectX3-FW-2_42_5000-release_notes.pdf)の「1.2.1 Validated and Supported 1GbE/10GbE Cables (p.8~11)」に記載されているケーブルと同等のケーブルであれば問題なく動作すると考えられます。

RJ45は一般的なLANケーブルで問題ないですが、SFP+のアダプターは小さくても高額ですので、「アダプター準備したけど使えないじゃん」という事態を避けるためにも慎重に準備することをおすすめします。

# Data Boxの主なワークフロー

では、実際の利用の流れを説明していこうと思います。

Data Boxを使ったデータ移行の大まかな流れは以下です。

<img src="/images/2022/20221108a/WS000294.JPG" alt="WS000294.JPG" width="1200" height="176" loading="lazy">

1. 発注
1. 受け取り
1. デバイス初期設定
1. 結線とマウント
1. データコピー
1. 返送
1. Azureへインポート

※今回の案件では筐体の写真を撮影できませんでした。手順の中で写真なしで筐体の説明をしていますが、ご了承ください。

# 発注

<img src="/images/2022/20221108a/ワークフロー_(1).JPG" alt="ワークフロー_(1).JPG" width="1200" height="179" loading="lazy">

### 注文の作成

まずはAzure Portalにログインし、ダッシュボードからData Boxを発注していきます。

Azure Portalのホーム画面で[Azure Data Box]を選択し、画面左上の[作成]を押下します。

<img src="/images/2022/20221108a/DataBox発注1.jpg" alt="DataBox発注1.jpg" width="1200" height="399" loading="lazy">

次の画面では対象のサブスクリプション、リソースグループ、ソースの国、宛先のAzureリージョンを選択し、[適用]を押下します。

<img src="/images/2022/20221108a/DataBox発注2.jpg" alt="DataBox発注2.jpg" width="1200" height="442" loading="lazy">

<img src="/images/2022/20221108a/DataBox発注3.jpg" alt="DataBox発注3.jpg" width="1200" height="605" loading="lazy">

サービスを選択すると、注文に関する記入する画面に移ります。

[基本]では注文名を指定します。

ここで設定する注文名は、Azure Portalに残るものですので、複数台発注する場合は特に一意な名称にしておくとよいでしょう。

<img src="/images/2022/20221108a/DataBox発注4.jpg" alt="DataBox発注4.jpg" width="1200" height="300" loading="lazy">

注文名を指定したら[データ格納先]に移動します。データの格納先と宛先のAzureリージョン、データをインポート/エクスポートしたいストレージアカウントを選択します。

<img src="/images/2022/20221108a/DataBox発注5.jpg" alt="DataBox発注5.jpg" width="1200" height="531" loading="lazy">

Data Boxサービスは一部のストレージアカウントのタイプをサポートしていないため、発注に先立って確認しておくと良いでしょう。

* [Docs:インポートでサポートされているストレージアカウント](https://learn.microsoft.com/ja-jp/azure/databox/data-box-system-requirements#supported-storage-accounts-for-imports)
* [Docs:エクスポートでサポートされているストレージアカウント](https://learn.microsoft.com/ja-jp/azure/databox/data-box-system-requirements#supported-storage-accounts-for-exports)

今回はGeneral-purpose(汎用) v2 Standardを使用しています。

次は[セキュリティ]です。

デバイスのロック解除兼Web UIのログインに使用するパスワードの種類を設定します。Microsoftマネージドキーかカスタマーマネージドキーを選択できます。

今回は全項目でMicrosoftマネージドキーを選択していますが、カスタマーマネージドキーを選択すると、より長く複雑なパスワードを設定できるようです。パスワードセキュリティをより強固にしたい場合は選択するとよいでしょう。

<img src="/images/2022/20221108a/DataBox発注6.jpg" alt="DataBox発注6.jpg" width="1200" height="547" loading="lazy">

[連絡先の詳細]では出荷方法と通知を受け取るメールアドレス、（Microsoftの管理による出荷を選択した場合は）配達先住所の設定をします。

今回は自己管理の出荷を選択しています。メールはメーリングリストも使用可能です。

<img src="/images/2022/20221108a/住所の追加.jpg" alt="住所の追加.jpg" width="1200" height="567" loading="lazy">

[タグ]では対象の注文にタグを設定できます。請求情報等の管理のために便利な機能のようですが、今回は空欄としています。

<img src="/images/2022/20221108a/DataBox発注9.jpg" alt="DataBox発注9.jpg" width="1200" height="324" loading="lazy">

必要なすべての項目を記入し終えたら[確認と注文]に移動し発注します。

# 受け取り

<img src="/images/2022/20221108a/ワークフロー_(2).JPG" alt="ワークフロー_(2).JPG" width="1200" height="178" loading="lazy">

### 受取日の調整

次はData Box受取日の調整をします。
今回は自己管理の出荷を選択したため、受け取り・引き渡しの両方で自己管理の出荷を前提に説明していきます。

まずはadbops@microsoft.com宛てに必要な情報をメールで送付します。件名を `Request Azure Data Box Pickup for Order: \<ordername>` に設定し、本文には以下フォーマットを記入したものを記入します。今回は日本語で記入しました。

Company name (会社名):
Contact name (受取担当者名):
Contact tel. no. (受取担当者電話番号):
Date of pickup (受取日):
Date of birth (担当者生年月日):
Nationality (担当者国籍):
Time of pickup (受取時刻):
Car number plate (自動車登録番号):

また、希望受取日は、複数決めておくとその後の調整がスムーズです。私が利用した際は、Microsoftから日程変更の依頼が来ました

受取日が決定すると、Azure Portalで認証コードが発行され、azure-noreply@microsoft.comから受取準備が完了した旨のメール（以下、参照）が送付されます。

<img src="/images/2022/20221108a/受け取り準備完了メール.JPG" alt="受け取り準備完了メール.JPG" width="511" height="529" loading="lazy">

受取当日は以下3点を用意し、指定された住所でData Boxを受け取ります。

1. 認証コード
1. 受取準備完了メールのコピー
1. 受取担当者の写真つき身分証明書の

認証コードについては、Microsoft側担当者に口頭で伝える必要があるため、メモ等を用意しておくと良いでしょう。

事前に知らなかったのですが、Databoxの受け取り・引き渡しの際、いくつかの書類（NDA等）にサインをする必要があります。NDAは個人とMicrosoft者の間で締結するもので、データセンターの情報などの漏洩防止に関係しているようです。

無事受け取れたら、いよいよData Boxの初期設定に移ります。

# デバイスの初期設定

<img src="/images/2022/20221108a/ワークフロー_(3).JPG" alt="ワークフロー_(3).JPG" width="1200" height="179" loading="lazy">

### 開梱

Microsoft社から引き取った段ボールを開梱し筐体を取り出したら、次はData Boxの起動と初期設定作業に移ります。
[Docs:機能と仕様](https://learn.microsoft.com/ja-jp/azure/databox/data-box-overview#features-and-specifications)にありますが、Data Boxの重さは23Kg、サイズは309.0 mm x 430.4 mm x 502.0 mmです。

大人一人でギリギリ設置可能な大きさ・重さですが、複数名で行うとより安全でしょう

### Data Boxの起動

まず、ディスプレイとは反対側に位置する扉を開け、電源ケーブルを取り出します。
電源ケーブルをデバイスと電源に接続し、ディスプレイの下にある電源ボタンを押し、Data Boxを起動します。

### Web UIへアクセス

次にData BoxのWeb UIに Data Box初期設定用PCからアクセスしていきます。

まず Data Box初期設定用PCにIPアドレスを割り当てていきます。Data Box初期設定用PCのイーサネットアダプタのIPアドレスを192.168.100.5/24に設定し、Data BoxのMGMTポートと Data Box初期設定用PCをLANケーブルを結線します。

結線したら、 Data Box初期設定用PCでブラウザを開き、https:/192.168.10.10にアクセスし、ログイン画面が表示されれば疎通成功です。

次にAzurePortalに記載されているデバイスロックのパスワードを入力してWeb UIにログインします。

※イーサネットに割り当てるIPアドレスや、Web UIのURLは[Docs:デバイスに接続する](https://learn.microsoft.com/ja-jp/azure/databox/data-box-deploy-set-up)を参考にしています。

おまけではありますが、ここでデバイスの実効容量の確認も済ませると良いです。

ログイン後に表示されるダッシュボード中央の[Connect and copy]にて、その時点の空き容量（Free Space）と使用済み容量（Used Space）が表示されます。
※キャプチャはデータコピー最中のものです

<img src="/images/2022/20221108a/【1号機】ダッシュボード.jpg" alt="【1号機】ダッシュボード.jpg" width="1200" height="583" loading="lazy">

一通りコピーした後に「思ったよりファイル置けなかった」「もっとコピーしておけばよかった」という事態を避けるため、事前に実効容量を確認し、コピー計画の最終確認ができると良いです。

今回の実効容量は、2台とも80TBにほど近い値でした。100GB程度の個体差はありましたが、ほとんど気にならない差でした。[Docs:実効容量](https://learn.microsoft.com/ja-jp/azure/databox/data-box-overview#features-and-specifications)では80TBとされていますが、ほぼ正確な値と思って良さそうです。

次にData Box側の初期設定を行います。

今回の手順では、Data#1~3ポートへのIPアドレス割り当てとNFSの接続許可設定を実行していきます。

### Data BoxへのIP割り当て

まず、IPアドレス割り当てからです。

[Set network interfaces]ページからネットワーク設定画面に遷移し、Data＃1〜3ポートにIPアドレスを割り当てます。

今回は3つのポートすべてにIPを割り当てていきます。

※この際MGMTポートのIPアドレスは変更できないため注意です。

<img src="/images/2022/20221108a/【1号機】NWインターフェース設定.jpg" alt="【1号機】NWインターフェース設定.jpg" width="1200" height="587" loading="lazy">

今回は静的にIPアドレスを割り当てるので、IP setteingsをStaticに設定し、ほかの項目（IP address, Subnet, Gateway）を埋めました。

任意のポートでIPアドレスを入力したら、画面左下の[Apply settings]を押下します。

ダッシュボードに戻り、設定したIPが各ポートで反映されていれば設定完了です。

### データコピーの接続許可設定

次にデータコピーに必要な接続情報を取得・設定します。

ダッシュボードから[Connect and copy]ページを選択した後、対象のストレージアカウントで転送に使用するプロトコルを選択します。今回はCIFSを利用するため、[SMB]を押下します。

押下すると、添付のようなポップアップが表示されます。

ここでCIFS接続に必要なユーザネーム、パスワードを取得できます。

<img src="/images/2022/20221108a/【1号機】接続とコピー_SMB.jpg" alt="【1号機】接続とコピー_SMB.jpg" width="1200" height="585" loading="lazy">

CIFSに限らず、「NFSもしくはREST APIで転送したい！」と考えている方も、[Connect and copy]ページにて同様に接続情報を取得・設定できます。

NFSの場合は接続許可したいIPアドレスをテキストボックスに記入し、Validata IP addressを押下します。

IPが追加されれば、エクスポート設定が完了します。

<img src="/images/2022/20221108a/【1号機】接続とコピー_NFS.jpg" alt="【1号機】接続とコピー_NFS.jpg" width="1200" height="582" loading="lazy">

REST APIの場合は、BLOBエンドポイントのURL、また認証情報であるAPI Keyや Connection Stringが取得できます。

<img src="/images/2022/20221108a/【1号機】接続とコピー_RESTAPI.jpg" alt="【1号機】接続とコピー_RESTAPI.jpg" width="1200" height="582" loading="lazy">

# 結線とマウント

<img src="/images/2022/20221108a/ワークフロー_(4).JPG" alt="ワークフロー_(4).JPG" width="1200" height="179" loading="lazy">

### Data BoxとNWスイッチの結線

Data BoxへのIP割り当てとデータコピーの接続設定が済んだので、
ついにData BoxとNWスイッチを結線させ、ネットワークに接続していきます（やったー）

接続するポートとスイッチの対応や、ケーブルの規格については物理環境のはなしの中の[Data Boxの結線の詳細は？](https://qiita.com/sichinoseeeee/private/415694f8f6e781a75b62#data-box%E3%81%AE%E7%B5%90%E7%B7%9A%E3%81%AE%E8%A9%B3%E7%B4%B0%E3%81%AF)を参照ください。

### Data Boxのネットワーク接続確認

Data Boxをネットワークに接続させたら、 Data Box初期設定用PCでData Boxにアクセスします。
Data Box初期設定用PCのブラウザーからhttps:/{Data＃1〜3ポートに割り当てたIP}にアクセスし、Web UIのログイン画面が表示されれば疎通成功です。

デバイスがネットワークに接続したことが確認できたら、以上でデバイス側での事前作業は完了です（やったー）

次にデータコピー用サーバでの作業です。

この手順ではData Boxのファイルシステムマウントとファイルコピーの動作確認を行います。

### Data Boxのマウント

まずデータコピー用サーバにログインし、`/etc/fstab` にData BoxをNFSマウントするための定義を記入していきます。

```sh
$ vim /etc/fstab

=====以下定義を追加=====
# Data Box
\\<DeviceIPAddress#1>\<storageaccountname_BlockBlob>   /mnt/databox1 cifs rw,username=<username>,password=<password>,uid=<uid>,gid=<gid>,dir_mode=0777,file_mode=0777  0 0
\\<DeviceIPAddress#2>\<storageaccountname_BlockBlob>  /mnt/databox2 cifs rw,username=<username>,password=<password>,uid=<uid>,gid=<gid>,dir_mode=0777,file_mode=0777 0 0
=======================
```

`/etc/fstab` ファイルへの書き込みが完了したら、ついにData Boxをマウントしていきます。
対象ファイルシステムが正しくマウントされたかも同時に確認していきます。

```sh
$ mount /mnt/databox1
$ mount /mnt/databox2

$ df -h
ファイルシステム                                        サイズ  使用  残り 使用% マウント位置
\\<DeviceIPAddress#1>\<storageaccountname_BlockBlob>          79T  135G   79T    1% /mnt/databox1
\\<DeviceIPAddress#2>\<storageaccountname_BlockBlob>          79T   96G   79T    1% /mnt/databox2
```

### マウントポイント配下にディレクトリ作成

次にマウントポイント配下にディレクトリを作成していきます。Data Boxのファイルシステムにデフォルトで備わっているディレクトリは`\<storageaccountname_BlockBlob>` の1つのみでData Boxを発注したストレージアカウント名がそのままディレクトリ名になっています。

>常にコピーしようとするファイル用のフォルダーを共有下に作成してから、ファイルをそのフォルダーにコピーします。
>\~~~中略~~~
>ストレージ アカウント内の root フォルダーに直接ファイルをコピーすることはできません。

[Docs:Data Boxに接続する](https://learn.microsoft.com/ja-jp/azure/databox/data-box-deploy-copy-data-via-nfs#connect-to-data-box)で推奨されているように、デフォルトのディレクトリの1階層下に新たなディレクトリ（以下、コンテナー用ディレクトリ）を作成し、そこにデータをコピーする必要があります

>ブロック BLOB およびページ BLOB の共有の下に作成したフォルダーは、データが BLOB としてアップロードされるコンテナーになります。

また、`\<storageaccountname_BlockBlob>` の直下に作成したディレクトリは、Azureへインポート後にコンテナーとして反映されます。
今回はデフォルトのコンテナー配下にファイル及びディレクトリを配置する想定だったため、以下手順でディレクトリを作成していきます。

※Data Boxを2台同時に使用するため、管理上の都合でコンテナ用ディレクトリ配下に更に1階層ディレクトリを作成していますが、特に必要ではありません。
ユーザー/オーナーは

```sh
$ mkdir -m 755 /mnt/databox1/<containername>
$ mkdir -m 755 /mnt/databox2/<containername>

$ mkdir -m 755 /mnt/databox1/<containername>/databox1
$ mkdir -m 755 /mnt/databox2/<containername>/databox2
$ find /mnt/databox* -ls
3458764513820542746      1 drwxrwxr-x   2  <user>     <owner>          64  8月 18 15:45 /mnt/databox1
3458764513820542749      1 drwxr-xr-x   2  <user>     <owner>          64  8月 18 15:45 /mnt/databox1/<containername>
3458764513820542750      1 drwxr-xr-x   2  <user>     <owner>          64  8月 18 15:45 /mnt/databox1/<containername>/databox1
3458764513820542746      1 drwxrwxr-x   2  <user>     <owner>          64  8月 18 15:46 /mnt/databox2
3458764513820542749      1 drwxr-xr-x   2  <user>     <owner>          64  8月 18 15:46 /mnt/databox2/<containername>
3458764513820542750      1 drwxr-xr-x   2  <user>     <owner>          64  8月 18 15:46 /mnt/databox2/<containername>/databox2
```

今回のように既存のコンテナーにデータをインポートする要件がある場合は、`\\<DeviceIPAddress#1>\<storageaccountname_BlockBlob>` 配下に同様の名前のディレクトリを作成する必要があります。ここでディレクトリ名に誤字があると、Azureへのインポート時にまったく新しい別のコンテナーが生成されてしまうので注意が必要です。

以上でディレクトリ作成が完了したので、次はディレクトリの動作確認をしていきます。

### ディレクトリの動作確認

本手順では、作成したディレクトリ配下でディレクトリとファイルの作成（ディレクトリへの書き込み）ができるかを確認します。

```sh
touch /mnt/databox1/<containername>/databox1/test.txt
ls -l /mnt/databox1/<containername>/databox1
rm /mnt/databox1/<containername>/databox1/test.txt
ls -l /mnt/databox1/<containername>/databox1

touch /mnt/databox2/<containername>/databox2/test.txt
ls -l /mnt/databox2/<containername>/databox2
rm /mnt/databox2/<containername>/databox2/test.txt
ls -l /mnt/databox2/<containername>/databox2
```

以上のコマンドが正常に実行されれば、データコピー作業の準備は以上です。
ついに、データコピー作業へと移ります。

# データコピー

<img src="/images/2022/20221108a/ワークフロー_(5).JPG" alt="ワークフロー_(5).JPG" width="1200" height="178" loading="lazy">

### コピーコマンド実行

今回の案件では```cp -prf```コマンドでデータコピーを実施しました。

```sh
cp -prf /<転送元ファイルパス> /mnt/databox1/<containername>/databox1/<転送先パス>
cp -prf /<転送元ファイルパス> /mnt/databox2/<containername>/databox2/<転送先パス>
```

### コピーのパフォーマンス

ファイルサイズやファイル数に左右されますが、今回の転送速度は100\~170MB/秒でした。

有効容量の80TBいっぱいにコピーしたい場合、24時間休まずシリアル実行すると、8日前後で完了する計算です。

今回はシリアル実行でしたが、コピー完了までに1台あたり8\~9日かかりました。
[Docs:Data Boxの制限](https://learn.microsoft.com/ja-jp/azure/databox/data-box-limits#data-box-limits)には10セッションまで同時接続できるとあるので

>Data Box では、NFS 共有上で最大 10 のクライアント接続が同時にサポートされます。

パラレルでコピーすることによって、さらに転送速度の向上を狙えるようです。

# 発送

<img src="/images/2022/20221108a/ワークフロー_(6).JPG" alt="ワークフロー_(6).JPG" width="1200" height="179" loading="lazy">

### デバイスの発送準備処理（チェックサム計算）

データコピーが完了したら、デバイスの発送準備処理を実行していきます。
ダッシュボードで[Prepare to ship]ページを選択し、[Start preparation]を押下します。

<img src="/images/2022/20221108a/【1号機】発送準備.jpg" alt="【1号機】発送準備.jpg" width="1200" height="574" loading="lazy">

発送準備処理では、キャプチャにある通り、デバイスのロックや転送済みデータの整合性確認、ファイル一覧の作成などが実行されます。

処理完了後には以下のように全項目にチェックがつき、Completedの文字が表示されます。
<img src="/images/2022/20221108a/発送準備完了_1号機.JPG" alt="発送準備完了_1号機.JPG" width="1200" height="540" loading="lazy">

余談にはなりますが、発送準備処理のリードタイムについても説明しようと思います。
[Docs:Azure Data Box の発送準備](https://docs.microsoft.com/ja-jp/azure/databox/data-box-deploy-prepare-to-ship)では最遅で数日間かかるとあるので、ここで少し驚く方もいるかと思います。

>チェックサムの計算は、データのサイズによっては数時間から数日間かかる場合があります。

本当に数日間かかるとすると、発送準備処理だけのためにData Boxサービス料を払うことになり、あまり嬉しくはありません。
しかし、いざ発送準備処理を実行してみると、2台平均の所要時間は10分ほどで、見込みよりも大幅に短い時間で完了できました。

今回はData Box1台あたり実効容量の9割近く（70/80TB）を使用していたため、最悪のパフォーマンスが考えられる環境でしたが、十数分で完了しました。

発送準備処理のリードタイムは、扱うデータ構造やファイル数、ファイルあたりのサイズなど環境要因に左右されるため参考程度ではありますが、今回の実績ベースでは概ね十数分～数時間程度と考えて良さそうです。
ドキュメントにあるリードタイムの目安を鵜呑みにする必要はそれほどなく、より余裕を持ったコピー計画を立ても問題ないと感じています。

### Data Boxシャットダウンと抜線

クローズ処理が完了したら、いよいよ発送に向けて準備をします。
Web UIにアクセスしデバイスをシャットダウンしていきます。[Shut down or restart]ページから[Shut down]を押下します。

<img src="/images/2022/20221108a/【1号機】シャットダウンと再起動.jpg" alt="【1号機】シャットダウンと再起動.jpg" width="1200" height="576" loading="lazy">

シャットダウンすると、当たり前ですがファイル共有は使えなくなります。
必要に応じて周知しましょう。

押下後に数分あけ、ブラウザの新しいタブを開き再度Web UIにアクセスをします。
この時アクセスがタイムアウトすれば、Data Box側のNICがアクティブでない（＝デバイスの電源が落ちた）と判断できます。

次にNWスイッチに接続しているケーブルを抜線し、Data Boxをアンラック・梱包します。

### 梱包

データボックスを元々の段ボールに梱包し、発送の準備をします。
[Docs:機能と仕様](https://learn.microsoft.com/ja-jp/azure/databox/data-box-overview#features-and-specifications)にある通り、Microsoft社からは（1）Data Box本体と（2）電源ケーブルの2点をレンタルしているので、
以上が間違いなく梱包されていることを確認し、段ボールの封をします。

### 引き渡し

発送（Azureデータセンターへの引き渡し）の目処がたった時点で、受け取り時と同様にadbops@microsoft.com宛に引き渡し日時の調整メールを送付します。
引き渡しでは以下フォーマットでメールを送付します。

Company name (会社名):
Contact name (引き渡し担当者名):
Contact tel. no. (引き渡し担当者電話番号):
Date of dropoff (引き渡し日):
Date of birth (担当者生年月日):
Nationality (担当者国籍):
Time of dropoff (引き渡し時刻):
Car number plate (自動車登録番号):

引き渡し日時が確定しData Boxの発送準備処理が終わるとAzure Portalで認証コードが発行されます。
また、azure-noreply@microsoft.comから受取準備が完了した旨のメール（以下、参照）が送付されます。
<img src="/images/2022/20221108a/引き渡し準備完了メール.JPG" alt="引き渡し準備完了メール.JPG" width="512" height="561" loading="lazy">

あとは引き渡し当日に以下3点を準備してData BoxをAzureデータセンターに引き渡します。

1. 認証コード
1. 引き渡し準備完了メールのコピー
1. 引き渡し担当者の写真つき身分証明書

# Azureへのインポート

<img src="/images/2022/20221108a/ワークフロー_(7).JPG" alt="ワークフロー_(7).JPG" width="1200" height="180" loading="lazy">

### インポートを待つ

引き渡し後は特にすることはなく、Azureへのインポートを待ちます。

今回のインポート（デバイス引き渡し完了→BLOBへのインポートまで）のリードタイムは、2台ともに約24時間で、予想よりも短納期で対応していただけた印象です。金曜日にData BoxがAzureデータセンターに到着し、土曜日にインポートが完了したのですが、営業日は考慮せずに対応してもらえるようでした。

Data Boxのワークフローについては以上になります。最後に、全体を通してつまずいたポイントを紹介します。

## つまずいたポイント

### Azureにインポートしたらファイル権限はなくなるのに、一生懸命権限を保持しようとした

Azureにデータをインポートしてしまえばファイルの権限はなくなってしまうのですが、転送時に権限の保持をしようとしたために、余計な苦労をしました。

当初はNFSでData Boxのファイルシステムをマウントを予定していました。
先述のようにデータコピーでは```cp -prf```コマンドを実行したのですが、NFSマウントの環境下ではコピーコマンド実行時に権限の保持ができませんでした。

```sh
$ cp -prf /tmp/databox_dev/test.txt /mnt/databox1/<containername>/databox1
cp: '/mnt/databox1/<containername>/databox1/test.txt' の所有者の保護に失敗しました: 許可がありません
```

コピーは成功しており目先の問題はないのですが、エラーメッセージが出るのは気になります。

Data BoxはWindows系OSで動いていると推測し、NFSでのマウントはユーザー名のマッピングにおいて相性が悪いと仮定しました。そこでNFSからCIFSでのマウントに切り替えところ、権限を保持したままコピーできるようになったのですが、Azureの世界ではファイルの権限は引き継がれません。

振り返るとファイルの権限を保持するオプションも、それを保持するための苦労も必要なかったと今は思います。

ファイルの権限を保持することに意味はなく、不具合を引き起こす場合もあるので、コピー時には余計なオプションを付け足すのは避けたほうがよいでしょう。

# まとめ

以上、秋のブログ週間の一貫で、Data Boxを使ってみてわかった詳細なワークフロー・手順やつまずいたポイントを紹介してきました。

AzureのData Boxが日本で提供され始めたのは2019年ごろなので、比較的若いサービスです。

第三者のレポートが非常に少なく、検討段階では情報収集に苦労しました。

本記事がData Box利用を検討される方の参考になれば幸いです。

データ移行にかけられる期間と回線費用を考えると、数十TB規模のデータを1-2週間で移行できるのは非常に有効な手段だと思います。
