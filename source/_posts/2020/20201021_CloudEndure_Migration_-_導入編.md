---
title: "CloudEndure Migration - 導入編"
date: 2020/10/21 00:00:00
postid: ""
tag:
  - AWS
  - CloudEndure
  - クラウドマイグレーション
category:
  - Infrastructure
thumbnail: /images/20201021/thumbnail.png
author: 八巻達紀
lede: "こんにちは。2020年1月中途入社、TIGの八巻です。現在、クラウドリフトのプロジェクトにて、オンプレミス環境のサーバーをクラウドへ移行するため、AWSの移行サービスであるCloudEndureについて調査しました。"
---
# はじめに

こんにちは。2020年1月中途入社、TIGの八巻です。

現在、クラウドリフトのプロジェクトにて、オンプレミス環境のサーバーをクラウドへ移行するため、AWSの移行サービスであるCloudEndureについて調査しました。参考文献が少なく苦労したため、こちらに書き残します。


**11/20 実践編が公開されました**

* [CloudEndure Migration - 実践編](http://localhost:4000/articles/20201120/)

大きく分けて以下の流れで進めます。

1. CloudEndure Migrationの説明とセットアップ（本記事の内容）
2. CloudEndure Migrationを利用した移行の実施（次回の記事に記載）

# CloudEndure Migrationとは

CloudEndure Migrationは、2019年6月からAWSで利用が可能になった無料のサービスです。移行元サーバーにエージェントをインストールすることで、物理・仮想マシン問わず移行が可能となります。

オンプレミス環境からクラウドへの移行はもちろんのこと、クラウド間の移行も可能です。CloudEndure Migrationの特徴は「ライブマイグレーション」です。エージェントがバックグラウンドでデータをクラウドへ複製するため、稼働中のサーバーに影響を与えることなく、サーバー移行が可能です。

CloudEndure Migrationの仕様と利用開始まで、以下の順番で説明します。

1. ざっくりとした移行までの流れ
2. CloudEndure Migrationの全体像
3. 通信要件
4. サポートOS
5. CloudEndure利用開始までの流れ
	1. CloudEndureアカウント登録
	2. プロジェクト作成
	3. セットアップ

#  ざっくりとした移行までの流れ

移行のイメージをつかむため、ざっくりと説明すると、以下の流れとなります。

1. CloudEndureのアカウント登録、各種設定
2. 移行元のサーバーにCloudEndureエージェントをインストール
3. エージェントがレプリケーションサーバーに、データのコピーをバックグラウンドで送信
4. レプリケーションサーバーが受け取ったデータをEBSに書き込む
5. EBSを基に、ターゲットマシンを起動

本記事では、「1. CloudEndureのアカウント登録や各種設定」までを記載します。

# CloudEndure Migrationの全体像

全体像を掴むには、以下の図が参考になります。
<img src="/images/20201021/00_00_NETWORK_DIAGRAM.png" loading="lazy">
画像引用元： [Network Diagram](https://docs.cloudendure.com/#Preparing_Your_Environments/Network_Diagram/Network_Diagram.htm#Network_Diagram%3FTocPath%3DNavigation%7CPreparing%2520Your%2520Environments%7C_____2)

主要なアクターは以下の通りです。

### Corporate Data Center / Any Cloud
移行元のサーバーが存在する環境を指します。

### CloudEndure Agent
移行元サーバーにインストールして利用します。
後述するレプリケーションサーバーに対して、移行元サーバーのデータをバックグラウンドで送信する役割を担います。

### AWS Cloud
移行先のAWS環境を指します。

### Staging Area Replication Servers
移行元のサーバーにインストールしたエージェントから継続的にデータを受け取り、EBSへ受け取ったデータを複製する、軽量のEC2インスタンスを指します。
(以降、レプリケーションサーバーと呼ぶ。)

### Staging Area VPC Subnet
レプリケーションサーバーが起動されるサブネットです。
こちらのサブネットは、移行元のサーバーと通信が可能である必要があります。

### Launched Target EC2 instance
レプリケーションサーバーから複製されたEBSを基に起動される、EC2インスタンスを指します。
このEC2インスタンスが、移行完了時のサーバーです。
(以降、ターゲットマシンと呼ぶ。)

### Target VPC Subnet
ターゲットマシンが起動されるサブネットです。

### CloudEndure User Console (CloudEndure Service Manager)
移行元サーバーの登録や管理、レプリケーション(複製)状態の監視、ターゲットマシンの起動などを行う管理コンソールです。

CloudEndure Migrationの操作は、基本的にこのコンソールを使用します。AWS Management ConsoleのCloudEndure版のようなものです。

※「CloudEndure Service Manager」とは
[CloudEndureDocumentation](https://docs.cloudendure.com/CloudEndure%20Documentation.htm)の「Glossary(用語集)」にある説明では、「The CloudEndure server」のみですが、
CloudEndureのメインサービスを提供しているサーバーだと推測できます。
「CloudEndure User Console」は、このサーバから提供されています。
<img src="/images/20201021/Glossary-CloudEndureServiceManager.png" loading="lazy">

# ネットワーク要件
CloudEndure Migrationを利用するための、ネットワーク要件は以下の通りです。

* 参考:[Network Requirements](https://docs.cloudendure.com/CloudEndure%20Documentation.htm#Preparing_Your_Environments/Network_Requirements/Network_Requirements.htm#Network_Requirements_..90%3FTocPath%3DNavigation%7CPreparing%2520Your%2520Environments%7CNetwork%2520Requirements%2520%7C_____0)

## TCPポート443での通信

#### 移行元のサーバーとCloudEndure Service Manager間の通信
移行元サーバへエージェントをインストールする際に使用するAPIや、エージェントの監視に使用されます。

#### レプリケーションサーバーとCloudEndure Service Manager間の通信
レプリケーションサーバーのログや、API実行時に使用されます。

#### 注意事項
CloudEndure Service ManagerのIPアドレスは、以下2つが公開されています。
移行元環境のファイアウォール等で制御している場合は、通信を許可する必要があります。

 - 52.72.172.158 (main service of console.cloudendure.com)
 - 52.53.92.136

また、CloudEndure Service Managerへの通信は、「console.cloudendure.com」を名前解決して行われます。移行元サーバーと、レプリケーションサーバーが名前解決が可能な環境にあることを確認してください。

## TCPポート1500での通信
#### 移行元のサーバーとレプリケーションサーバー間の通信
移行元サーバーのデータ転送に使用されます。

#  サポートOS
OS、バージョンごとに、必要な要件および制約が異なります。

以下の要件については、OSのバージョンに関係なく要件を満たしておく必要があります。

### Windows
- 利用可能なWindowsUpdateは、全てインストールしておくこと推奨
- 移行後のサーバーが正常に起動するには、移行元のサーバーに少なくとも2GBの空き容量が必要
- GPTパーティションを持つWindowsのディスクはサポートしていない

### Linux
- エージェントのインストールには、Python2.4以降、または、Python3.0以降が必要
- GRUBブートローダーを使用するマシンのみサポート
- 2.6.18-164より前のカーネルバージョンは、AWSおよびCloudEndureではサポートしていない
- XFS5ルートまたはブートファイルシステムを備えたLinuxマシンはサポートしていない

その他にも、OSやバージョンごとに詳細な注意事項があります。

**以下のページも必ずご確認ください。**

* 参考: [Supported Operating Systems](https://docs.cloudendure.com/Content/Getting_Started_with_CloudEndure/Supported_Operating_Systems/Supported_Operating_Systems.htm)


# CloudEndure利用開始までの流れ
CloudEndureのアカウント登録から移行開始までのセットアップを行います。

## 1.Cloudendureアカウント登録
CloudEndureの利用にはアカウントの登録が必要です。以下のリンクから登録が可能です。
[Create a CloudEndure Migration Account to Get Free Licenses](https://console.cloudendure.com/#/register/register)

ライセンスを取得するメールアドレスとパスワードを入力して、「Continue」ボタンをクリックしてください。
<img src="/images/20201021/01_01_CloudEndureRegister.jpg" loading="lazy">

以下のようなメールが届くので、「 confirm your account request 」にあるリンクにアクセスして登録は完了です。
<img src="/images/20201021/01_02_仮登録メール.jpg" loading="lazy">

以下URLにアクセスして、登録したメールアドレスとパスワードを使ってコンソールにログインします。
https://console.cloudendure.com/#/signIn
<img src="/images/20201021/01_04_Login.jpg" loading="lazy">

以下のような画面に遷移すれば、ログイン完了です。
<img src="/images/20201021/01_05_Login完了.png" loading="lazy">

## 2. プロジェクト作成

CloudEndurteは、プロジェクトという単位で管理が可能です。登録直後は、「Default Project」のみ存在します。

この「Default Project」だけで管理することも可能ですが、移行先のAWSアカウントが複数存在する場合や、複数のベンダーで移行を行う場合には、プロジェクトの分割が有効です。なお、1つのCloudEndureアカウントで管理可能なプロジェクトの最大数は100です。

プロジェクトの作成は、サイドメニュー上部の「＋」マークから作成が可能です。今回は「CloudEndure-Test」というプロジェクトを作成します。
<img src="/images/20201021/01_06_プロジェクト作成.png" loading="lazy">
「CREATE PROJECT」ボタンをクリックして、プロジェクトの作成は完了です。

## 3. セットアップ
プロジェクトの作成後、セットアップを行います。(Default Project利用する場合も同じ)
CloudEndureの利用には、以下の項目の設定が必要です。

- AWS CREDENTIALS
- REPLICATION SETTINGS

### AWS CREDENTIALS
CloudEndureが使用する、AWSの資格情報(IAM User)を設定します。

ここで設定する資格情報は、ターゲットマシン(移行後のEC2)の起動や、CloudEndureがセキュリティグループなどを作成する際に使用されます。

以下のページに、必要なポリシーの情報が記載されています。

* 参考: https://docs.cloudendure.com/Content/IAMPolicy.json

上記のjsonファイルを参考に、IAM Policy、IAM Userを作成します。
※IAM Userのインラインポリシーでは、2048文字の制限があるため、IAM Policyの作成をオススメします。

上記のポリシーには含まれていませんが、事前に作成しておいたIAM Roleをアタッチして、ターゲットマシンを起動したい場合、「iam:PassRole」の権限が必要となります。必要に応じて、権限を付与してください。

IAM Userの作成手順は、以下のURLを参照ください。

* 参考: [Generating the Required AWS Credentials](https://docs.cloudendure.com/#Generating_and_Using_Your_Credentials/Working_with_AWS_Credentials/Generating_the_Required_AWS_Credentials/Generating_the_Required_AWS_Credentials.htm?Highlight=PassRole)

作成したIAM UserのAccess key IDとSecret access keyを設定して「SAVE」をクリックします。
<img src="/images/20201021/01_07_Credentials.jpg" loading="lazy">

### REPLICATION SETTINGS
ここでは、移行元環境と移行先環境の選択と、レプリケーションサーバーの設定を行います。

#### Migration Source
移行元の環境を選択します。選択できる項目は大きく分けて以下の2種類です。

- Other Infrastructure
- AWSのリージョン

<img src="/images/20201021/MigrationSource.png" loading="lazy">

##### Other Infrastructureを選択した場合
AWSやオンプレミス環境、その他クラウド環境にあるサーバー単位の複製が可能です。

##### AWSのリージョンを選択した場合
選択されたAWS環境で定義されたVPCの設定が移行先のAWS環境へ複製されるようです。(本記事の対象外)

* 参考: [Defining Your Source infrastructure](https://docs.cloudendure.com/#Defining_Your_Replication_Settings/Defining_Replication_Settings_for_AWS/Defining_Replication_Settings_for_AWS.htm#Defining_Your_Source_infrastructure%3FTocPath%3DNavigation%7CDefining%2520Your%2520Replication%2520Settings%7CDefining%2520Replication%2520Settings%2520for%2520AWS%7CDefining%2520Your%2520Source%2520infrastructure%7C_____0)

移行元がAWSであり、サーバーのみ移行したい場合は、「Other Infrastructure」を選択してください。

#### Migration Target

移行先AWSのリージョンを選択します。
<img src="/images/20201021/MigrationTarget.png" loading="lazy">

#### Replication Servers
プロジェクト全体のレプリケーションサーバーの設定を行います。

※移行元のサーバー毎に設定も可能です。
　CloudEndureエージェントをインストールしてからとなる為、次回の記事で記載します。

設定する内容は、以下の通りです。

##### Choose the Replication Server instance type
レプリケーションサーバーのインスタンスタイプを設定します。Defaultを選択した場合は「t3.small」で起動されます。
<img src="/images/20201021/Replication_Server_Type.png" loading="lazy">

##### Choose the Converter instance type

コンバーターサーバーのインスタンスタイプを選択します。
<img src="/images/20201021/Converter_Type.png" loading="lazy">

コンバーターサーバーとは、ターゲットマシンを起動する際に、ディスクを変換する役割を持つサーバーで、ターゲットマシン起動時に一時的に起動されます。
ディスクの変換後、すぐにTerminateされます。

##### Choose if each source machine should have a dedicated Replication Server
移行元のサーバーごとに、専用のレプリケーションサーバーを起動する設定です。

レプリケーションサーバーは、1台で複数台の移行元サーバーからのデータを受け取ることが可能です。※移行元サーバーから送信されるデータ量に合わせてサーバーの台数は増減します。

チェックボックスをオンにした場合、移行元のサーバー台数ごとにレプリケーションサーバーが起動することになるため、コスト超過など注意が必要です。

##### Choose the default disk type to be used by the Replication Servers (SSD disks are faster; HDD disks cost less
レプリケーションサーバーのディスクタイプを選設定します。
移行元サーバーにマウントされているディスクのサイズによって、ディスクタイプが自動で選択されます。
<img src="/images/20201021/StagingDiskType.png" loading="lazy">
「Use fast SSD data disks」を選択した場合
500 GiB 未満のディスクには マグネティックボリューム(standard)が選択され、500 GiB を超えるディスクには 汎用SSDボリューム(gp2)が選択されます。

「Use slower, lower cost standard disks」を選択した場合
500 GiB 未満のディスクには、マグネティックボリューム(standard)が選択され、500 GiB を超えるディスクには スループット最適化ボリューム(st1)が選択されます。

##### Choose the subnet where the Replication Servers will be launched
レプリケーションサーバーの起動先サブネットを設定します。

通信要件を満たすサブネットを事前に作成しておいてください。
※サブネットの作成ができていない場合は、Defaultを選択し、サブネット作成後に変更してください。

##### Choose the Security Groups to apply to the Replication Servers
レプリケーションサーバーに設定するセキュリティグループを設定します。任意のセキュリティグループを選択可能ですが、特に制約がなければ、「Default CloudEndure Security Group」で良いです。

##### Choose how data is sent from the CloudEndure Agent to the Replication Servers ※この項目はオプションです。
CloudEndureエージェントからレプリケーションサーバーへのデータ送信方法を設定します。「Use VPN or DirectConnect (using a private IP)」チェックボックスをオンにした場合、PrivateIPアドレスを使用した通信となります。VPNやDirectConnect経由で通信を行う場合はチェックボックスをオンにしてください。
<img src="/images/20201021/Use_VPN_or_DirectConnect_(using_a_private_IP).png" loading="lazy">
また、PublicIPの無効化の設定が選択可能になります。要件に応じて設定してください。

##### Define whether to route communication from the Replication Server via a proxy ※この項目はオプションです。
レプリケーションサーバーのプロキシを設定します。この設定はレプリケーションサーバーとCloudEndure Service Manager間の通信に適用されます。

##### Enable volume encryption ※この項目はオプションです。
レプリケーションサーバーで使用するEBSの暗号化を設定します。

##### Staging Area Tags ※この項目はオプションです。
CloudEndureによって作成されたリソースに付与するタグを設定します。

##### Network Bandwidth Throttling ※この項目はオプションです。
移行元のサーバーからレプリケーションサーバーへデータを送信する際に使用する、ネットワークの帯域幅制限を設定します。

デフォルトでは、「Disabled」のチェックボックスがオンとなっています。チェックボックスを外すことで、TCPポート1500のトラフィックで使用する帯域幅を設定可能となります。
<img src="/images/20201021/Network_Bandwidth_Throttling.png" loading="lazy">
データ転送速度はMbpsで指定可能です。実施する環境に合わせて設定してください。

今回は、以下の図のように設定しました。
※後から変更も可能です。
<img src="/images/20201021/ReplicationSettings完了.png" loading="lazy">


「SAVE REPLICATION SETTINGS」のボタンをクリックして、セットアップは完了です。

# まとめ
CloudEndureのセットアップは以上となります。
次回、CloudEndure Migrationを利用した移行を試していきます。

# 参考リンク
[CloudEndureDocumentation](https://docs.cloudendure.com/CloudEndure%20Documentation.htm)

