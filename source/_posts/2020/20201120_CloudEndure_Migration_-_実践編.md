---
title: "CloudEndure Migration - 実践編"
date: 2020/11/20 00:00:00
postid: ""
tag:
  - AWS
  - CloudEndure
  - クラウドマイグレーション
category:
  - Infrastructure
thumbnail: /images/20201120/thumbnail.png
author: 八巻達紀
lede: "前回記事「[CloudEndure Migration - 導入編]」の続きです。今回は、実際にCloudEndure Migrationを使った移行を実践したいと思います。"
---
# はじめに

こんにちは。
2020年1月中途入社、TIGの八巻です。

前回記事「[CloudEndure Migration - 導入編](/articles/20201021/)」の続きです。
今回は、実際にCloudEndure Migrationを使った移行を実践したいと思います。

初期設定や用語等は、前回記事をご確認ください。

# 今回の環境構成図
CloudEndure Migrationを実施する環境は以下の通りです。
<img src="/images/20201120/CloudEndure-Diagram.png" loading="lazy">

GCPに用意したGCEのVMインスタンスを、AWSへ移行してみます。
移行元のサーバーとして、以下のVMインスタンスを用意しました。

|項目|値|
|---|---|
|名前|cloudendure-source|
|OS|CentOS Linux release 7.8.2003 (Core)|
|マシンタイプ|e2-micro（vCPU x 2、メモリ 1 GB）|
|ゾーン|asia-northeast1-a|
|アプリケーション|WordPress 5.5.3|

AWSへ移行後、Wordpressにアクセスするまでを実践します。
<img src="/images/20201120/GCE-Info(Care).jpg" loading="lazy">
<img src="/images/20201120/GCE-WordPress画面.png" loading="lazy">

# 作業の流れ
以下の流れで作業を実施します。

1. 要件の確認
2. CloudEnduereエージェントのインストール
3. データレプリケーション
4. ターゲットマシンの設定
5. ターゲットマシンの起動
    1. テストモード
        1. ターゲットマシン起動
        2. 起動後の設定修正
    2. カットオーバー
        1. ターゲットマシン起動
        2. 起動後の設定修正(テストモードと同じ内容のため、省略)
6. ターゲットマシンからエージェントのアンインストール

# 要件確認
CloudEndureを利用する要件を満たしているか確認します。

## 共通の要件確認
全OS共通で、以下の要件を満たしている必要があります。

|項目|要件|備考|
|---|---|---|
|仮想化タイプ|準仮想化タイプはサポート対象外||
|EBSのマルチアタッチ|EBSマルチアタッチ機能を使ったEC2インスタンスは、移行元のサーバーとしてサポート対象外|AWSからAWSへの移行を行う場合、確認が必要です。

### 仮想化タイプ

```bash 実行結果
[root@cloudendure-source ~]# lscpu | grep "Virtualization type"
Virtualization type:   full
```

完全仮想化のため、OKです。

### EBSのマルチアタッチ
今回は、GCEのため対象外。

## LinuxOS固有の要件確認
LinuxOSは、以下の要件を満たしている必要があります。

|項目|要件|備考|
|---|---|---|
|カーネルバージョン|2.6.18-164以前のカーネルバージョンはサポート対象外||
|Pythonバージョン|2.4以上、もしくは3.0以上|エージェントのインストールに必要です。|
|ブートローダー|GRUBのみサポート||
|ファイルシステム|root もしくは、bootがXFS5タイプのファイルシステムの場合、サポート対象外|xfsがNGなのか不明のため、今回検証してみようと思います。|

### カーネルバージョン確認
```bash 実行結果
[root@cloudendure-source ~]# uname -r
3.10.0-1127.19.1.el7.x86_64
```

2.6.18-164以降のため、OKです。

### Pythonバージョン

```bash 実行結果
[root@cloudendure-source ~]# python --version
Python 2.7.5
```

2.4以上のため、OKです。

### ブートローダーの確認
```bash 実行結果
[root@cloudendure-source ~]# ll /boot/grub2/grub.cfg
-rw-r--r--. 1 root root 5323 Oct 13 05:43 /boot/grub2/grub.cfg
```

ブートローダーはgrubのため、OKです。
### rootとbootのファイルシステム

```bash 実行結果
[root@cloudendure-source ~]# df -T
Filesystem     Type     1K-blocks    Used Available Use% Mounted on
devtmpfs       devtmpfs    498744       0    498744   0% /dev
tmpfs          tmpfs       506876       0    506876   0% /dev/shm
tmpfs          tmpfs       506876    6900    499976   2% /run
tmpfs          tmpfs       506876       0    506876   0% /sys/fs/cgroup
/dev/sda2      xfs       20754432 3063128  17691304  15% /
/dev/sda1      vfat        204580   11440    193140   6% /boot/efi
tmpfs          tmpfs       101376       0    101376   0% /run/user/997
tmpfs          tmpfs       101376       0    101376   0% /run/user/1000
```
`/dev/sda2      xfs       20754432 3063128  17691304  15% /`
Typeにxfsとありますが、NGとなるか検証したいと思います。

## CentOS固有の要件・注意点確認

最後に、CentOS固有の要件を確認します。
<img src="/images/20201120/CentOS-Note.png" loading="lazy">

引用元： [Supported Operating Systems](https://docs.cloudendure.com/Content/Getting_Started_with_CloudEndure/Supported_Operating_Systems/Supported_Operating_Systems.htm)

Note３とNote４、Note７を見ろとあるので、確認します。

>Note 3: Nitro instances (for example, the C5 and M5 family types) will work with RHEL 7.0+ and CentOS 7.0+ in AWS in a Linux environment and with Windows Server 2008 R2, Windows Server 2012 R2, Windows Server 2016, and Windows Server 2019 in a Windows environment. Certain newer AWS regions only support Nitro instances and therefore only support the previously mentioned operating systems.

Nitroインスタンスが利用できるOSの種類について記載されています。
今回はCentOS7のため、Nitroインスタンスの利用がサポートされています。

>Note 4: Kernel versions 2.6.32-71 is not supported in RHEL 6.0 and CentOS 6.0 in AWS.

RHEL6.0/CentOS6.0のカーネルバージョンが「「2.6.32-71」の場合、サポート対象外です。
今回はCentOS7のため、無関係です。

> Note 7: A pre-requirement for installing the CloudEndure Agent on RHEL8 and CentOS 8 is first running the following:
sudo yum install elfutils-libelf-devel

RHEL8.0/CentOS8.0の場合、`sudo yum install elfutils-libelf-devel`の実行が必要とあります。
今回はCentOS7のため、無関係です。

事前確認は以上です。
rootのファイルシステムがxfsなのが気になりますが、移行できるか検証してみたいと思います。

# CloudEndureエージェントインストール
実際にCloudEndure Migrationを利用した移行を開始します。

## エージェントのインストール手順
マシンの登録がない初期は、CloudEndureコンソールの「Machines」に記載があります。
また、画面上部にある「MACHINE ACTIONS...」の「Add Machines」からも確認が可能です。
※インストール用のTokenは、アカウント固有の情報のため伏せています。
<img src="/images/20201120/AgentInstall方法.jpg" loading="lazy">

### エージェントのインストーラーを取得
以下のコマンドを実行して、CloudEndureエージェントのインストーラーを取得します。
※wgetは事前にインストールしておいてください。
`wget -O ./installer_linux.py https://console.cloudendure.com/installer_linux.py `

```bash 実行結果例
[root@cloudendure-source ~]# wget -O ./installer_linux.py https://console.cloudendure.com/installer_linux.py
--2020-11-05 14:20:04--  https://console.cloudendure.com/installer_linux.py
Resolving console.cloudendure.com (console.cloudendure.com)... 52.72.172.158
Connecting to console.cloudendure.com (console.cloudendure.com)|52.72.172.158|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 7659 (7.5K) [application/octet-stream]
Saving to: ‘./installer_linux.py’
100%[=========================================================================>] 7,659       --.-K/s   in 0s
2020-11-05 14:20:05 (1.17 GB/s) - ‘./installer_linux.py’ saved [7659/7659]
```
実行時のログにもありますが、「console.cloudendure.com」を名前解決して、
IPアドレス「52.72.172.158」に接続しています。
これは、CloudEndure Service ManagerのIPアドレスです。

インストーラーが取得できない場合は、[導入編](/articles/20201021/)にも記載していますが、
ネットワーク要件を満たしているか確認してください。

### エージェントのインストーラーを実行
以下のコマンドを実行して、インストーラーを実行します。
※${インストール用Token}は、書き換えてください。
`sudo python ./installer_linux.py -t ${インストール用のToken} --no-prompt`

```bash 実行結果例
[root@cloudendure-source ~]# sudo python ./installer_linux.py -t XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX --no-prompt
The installation of the CloudEndure Agent has started.
Running the Agent Installer for a 64 bit system...
Connecting to CloudEndure Console... Finished.
Identifying disks for replication.
Disk to replicate identified: /dev/sda of size 20.0 GiB
All disks for replication were successfully identified.
Downloading CloudEndure Agent... Finished.
Installing CloudEndure Agent... Finished.
Adding the Source machine to CloudEndure Console... Finished.
Instance ID: XXXXXXXXXXXXXXXXXXX.
Installation finished successfully.
```

デフォルトでは、エージェントのインストールが完了すると同時にデータのレプリケーションが開始されます。

複数台の移行元サーバーに対して、エージェントを同時にインストールする場合、
同時にレプリケーションが実行されるとネットワーク環境によっては、占有してしまう要因になります。

インストール完了直後にレプリケーションを開始させたくない場合は、
インストーラー実行時に`--no-replication `のオプションをつけることで防ぐことができます。

`--no-replication `を使ってインストールが完了すると、CloudEnduereコンソールの「Machines」にマシンの登録のみ行われます。
レプリケーションを開始するには、「Machines」> 「MACHINE ACTIONS」メニューから、「Start/resume Data Replication」をクリックすることで実施可能です。
<img src="/images/20201120/DataReplicationStart.png" loading="lazy">

# データのレプリケーション

エージェントのインストール完了後、CloudEndureコンソールの「Machines」に登録され、レプリケーションが開始します。
<img src="/images/20201120/Insrall直後.png" loading="lazy">
また、AWSコンソールでは、レプリケーションサーバの起動が確認できます。※今回はt3.smallで起動
<img src="/images/20201120/ReplicationServerStart.png" loading="lazy">

登録されたマシンをクリックするとレプリケーションの状況が表示されます。
進捗状況は、パーセンテージと容量で表示されます。
<img src="/images/20201120/Replication-8%.png" loading="lazy">

補足ですが、登録されたマシン毎に、レプリケーションサーバーのスペックを変更することも可能です。
変更については「REPLICATION SETTINGS」から可能です。
今回は、レプリケーションサーバーのインスタンスタイプを「t3.medium」に変更してみます。
<img src="/images/20201120/ReplicationSettings-Machines.png" loading="lazy">

インスタンスタイプを変更して設定を保存すると、
指定したインスタンスタイプのレプリケーションサーバが起動されます。
<img src="/images/20201120/AddReplicationServer.png" loading="lazy">

変更後のレプリケーションサーバーの起動後、
変更前のインスタンスがレプリケーションで使用されていない場合、インスタンスは終了されます。

レプリケーションが完了すると以下のような画面が表示されます。
<img src="/images/20201120/Replication-Finish.png" loading="lazy">

ちなみに、インスタンスタイプがt3.small、EBSのボリュームタイプがStandardのレプリケーションサーバだと、レプリケーション完了まで約20分かかりました。また、インスタンスタイプがt3.medium、EBSのボリュームタイプがStandardのレプリケーションサーバだと、約17分でレプリケーションが完了しました。

レプリケーションの速さについては、以下のページに記載があります。
>The replication speed depends on 4 key factors:
>
>The uplink speed from that server to the Replication Server and bandwidth available.
>The overall disk storage.
>The changes in the disk while it is replicating.
>I/O speed of the storage itself.

参考ページ：[Understanding Replication Speed](https://docs.cloudendure.com/#FAQ/Other_Troubleshooting_Topics/Understanding_Replication_Speed.htm?Highlight=Replication)

レプリケーションの速さについては、
移行元サーバーからレプリケーションサーバーへの通信速度とその間の帯域幅や
ストレージのI/O速度等が影響するようです。

# ターゲットマシンの設定
データのレプリケーションが完了したら、ターゲットマシンの設定を行います。
登録されたマシンのページにある「BLUE PRINT」から設定を行います。
<img src="/images/20201120/Machine-BLUE_PRINT.png" loading="lazy">
AWSに移行後のEC2は、ここで設定した内容で起動されます。

EC2インスタンスを起動する際の設定項目と類似しているため、
設定する項目や値については、そこまで悩むことはないと思います。

|設定項目|内容|備考|
|:--|:--|:--|
|MachineType|EC２のインスタンスタイプを選択します。||
|LaunchType|オンデマンド、専有ホスト、専有インスタンスなど、起動するテナント属性を選択します。||
|Subnet|既存のサブネット、もしくは新しく作成するかを選択します。||
|SecurityGroups|セキュリティグループを設定します。新規に作成することも可能です。|新規作成の場合、ポート80、443、22、および3389が許可されます。本番として起動する場合は、事前に作成したものを設定してください。|
|PrivateIP|プライベートIPアドレスを設定します。デフォルトでは、新規にプライベートIPが作成されます。|起動するサブネット内の範囲であれば、特定のプライベートIPアドレスを明示的に設定することも可能です。|
|Elastic IP|Elastic IPアドレスを使用するか選択します。|Create Newを選択することで、新規にElasticIPアドレスを作成することが可能です|
|PublicIP(ephemeral)|パブリックIPを使用するかどうかを選択します。|サブネット構成に従ってパブリックIPを使用するオプションもあります。これは、ElasticIPの設定がnoneの場合にのみ適用されます。|
|PlacementGroup|プレイスメントグループを設定します。|この項目はオプションです。|
|IAMRole|IAMRoleを設定します。||
|Use Existing Instance ID|既に作成済みのEC2インスタンスを選択します。|この項目はオプションです。ほとんどのユースケースで使用しない項目です。|
|Initial Target Instance State|ターゲットマシンを起動した状態にするか、停止した状態にするか設定します。||
|Tags|ターゲットマシンのタグを設定します。|この項目はオプションです。|
|Disks|ディスクタイプを選択します。Standard、SSD、またはProvisioned SSDを選択できます。||

参考ページ：[Configuring the Target Machine Blueprint](https://docs.cloudendure.com/#Configuring_and_Running_Migration/Configuring_the_Target_Machine_Blueprint/Configuring_the_Target_Machine_Blueprint.htm#Configuring_a_Machine's_Blueprint_..61%3FTocPath%3DNavigation%7CConfiguring%2520and%2520Running%2520Migration%7CConfiguring%2520the%2520Target%2520Machine%2520Blueprint%7CConfiguring%2520a%2520Machine's%2520Blueprint%7C_____0)

今回は、以下のように設定しました。

|設定項目|設定値|備考|
|:--|:--|:--|
|MachineType|t3.micro||
|LaunchType|On demand||
|Subnet|事前に作成したパブリックサブネット||
|SecurityGroups|Create New||
|PrivateIP|Create New||
|Elastic IP|None||
|PublicIP(ephemeral)|Yes||
|PlacementGroup|設定なし||
|IAMRole|設定なし||
|Use Existing Instance ID|設定なし||
|Initial Target Instance State|Started|起動した状態にします。|
|Tags|Key:Name,Value:TargetMachine|この項目はオプションです。|
|Disks|SSD|SSDの場合、gp2です、|

# ターゲットマシン起動
ターゲットマシンの起動は、テストモードとカットオーバーの2種類あります。

## テストモード
テストモードでは、AWS環境で適切に起動できるかの検証が可能です。
少なくとも、本番切り替えの1週間前には、実施することが推奨されています。
テストモードで起動後、SSHやRDPでログインし、正しく起動できているか検証します。


### ターゲットマシン起動
実際にテストモードでターゲットマシンを起動してみます。

「LAUNCH TARGET MACHINE」から、「Test Mode」をクリックする。
<img src="/images/20201120/CloudEndureコンソール-Launch(TestMode).png" loading="lazy">
「CONTINUE」をクリックすると、ターゲットマシンが起動されます。
<img src="/images/20201120/LaunchTarget(TestMode)確認.png" loading="lazy">

CloudEndureコンソールの「JobProgress」を確認すると、開始していることがわかります。
<img src="/images/20201120/JobProgress_Start.png" loading="lazy">

CloudEndureの裏の動きについては、AWSコンソールを観察してみます。

まず、コンバーターサーバーが起動されます。
<img src="/images/20201120/ConverterServer起動.png" loading="lazy">

コンバーターサーバーは、ディスクの変換処理を担っています。
変換処理が終わるとすぐに終了されます。
<img src="/images/20201120/ConverterServer終了.png" loading="lazy">

コンバーターサーバーの終了後、ターゲットマシンが起動されます
<img src="/images/20201120/TargetMachine(TestMode)起動.png" loading="lazy">

ターゲットマシンは、起動直後に停止されます。
よく見ると、1GBのストレージがアタッチされています。
<img src="/images/20201120/TargetMachine(TestMode)停止1GB.png" loading="lazy">


停止されると、1GBのストレージがデタッチされ、インスタンスの情報からは見れなくなります。
<img src="/images/20201120/TargetMachine(TestMode)停止デタッチ.png" loading="lazy">

最後にレプリケーション済みのボリュームがアタッチされた状態でインスタンスが起動されて完了です。
<img src="/images/20201120/TargetMachine(TestMode)起動成功.png" loading="lazy">

CloudEndureコンソールの「JobProgress」を確認すると、終了していることがわかります。
<img src="/images/20201120/JobProgress_Finish.png" loading="lazy">

テストモードで起動したターゲットマシンに、SSHログインしてみます。
<img src="/images/20201120/TargetMachine(TestMode)成功GIP.png" loading="lazy">

```bash 実行結果
$ ssh -i key-pair.pem yamaki@18.179.11.231
〜〜〜〜〜中略〜〜〜〜〜
Last login: Wed Nov  4 11:30:13 2020 from xx-xx-xx-xx.xx.xx.xx.xx.jp
[yamaki@ip-192-168-2-77 ~]$ sudo su -
最終ログイン: 2020/11/04 (水) 11:31:05 JST日時 pts/0
[root@ip-192-168-2-77 ~]# curl inet-ip.info
18.179.11.231
[root@ip-192-168-2-77 ~]# ifconfig
ens5: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 9001
        inet 192.168.2.77  netmask 255.255.255.192  broadcast 192.168.2.127
        inet6 fe80::43f:37ff:feb1:c202  prefixlen 64  scopeid 0x20<link>
        ether 06:3f:37:b1:c2:02  txqueuelen 1000  (Ethernet)
        RX packets 24939  bytes 7232780 (6.8 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 20605  bytes 3369355 (3.2 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```
SSHログインできました。
rootのファイルシステムが「xfs」でも、問題ないようです。

### 起動後の設定修正
SSHでログインできたので、WordPress接続に向けた設定修正を行います。

ログインした状態を見た感じ、ホスト名が変更されてますが、
今回はWordPressにアクセスするまでを目的としている為、修正しません。
必要に応じて修正してください。

続けて、WordPressの設定をEC2のグローバルIPアドレスに更新して、アクセスしてみます。

まず、WordPressのサイトURLをEC2のグローバルIPアドレスに変更します。

```bash 実行結果
[root@ip-192-168-2-77 ~]# mysql -u wordpress -p
Enter password:
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 20
Server version: 5.5.65-MariaDB MariaDB Server
Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.
Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.
MariaDB [(none)]> use wordpress
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A
Database changed
MariaDB [wordpress]> select * from wp_options where option_name = 'siteurl';
+-----------+-------------+--------------------------------+----------+
| option_id | option_name | option_value                   | autoload |
+-----------+-------------+--------------------------------+----------+
|         1 | siteurl     | http://35.221.65.176/wordpress | yes      |
+-----------+-------------+--------------------------------+----------+
1 row in set (0.00 sec)
MariaDB [wordpress]> update wp_options set option_value = 'http://18.179.11.231/wordpress' where option_name = 'siteurl';
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0
MariaDB [wordpress]> select * from wp_options where option_name = 'siteurl';
+-----------+-------------+--------------------------------+----------+
| option_id | option_name | option_value                   | autoload |
+-----------+-------------+--------------------------------+----------+
|         1 | siteurl     | http://18.179.11.231/wordpress | yes      |
+-----------+-------------+--------------------------------+----------+
1 row in set (0.00 sec)
```

Apacheを再起動して、WordPressにアクセス/ログインしてみます。
<img src="/images/20201120/EC2-WordPress画面.png" loading="lazy">

アクセスできました。

テストモードで起動後、実際にサーバーに入って設定の修正が可能です。
本番切り替え前に、設定変更が必要な箇所の整理等に利用できます。

## カットオーバー
テストが完了したら、カットオーバーを実施します。
カットオーバーすると、テストモードで起動したインスタンスは終了されます。

### ターゲットマシン起動
テストモードのインスタンスを起動したまま、
カットオーバーを実施してみます。

カットオーバーの方法も、テストモードと同じです。

「LAUNCH TARGET MACHINE」から、「Cutover」をクリックする。
<img src="/images/20201120/Launch_Target(CutOver)start.png" loading="lazy">

「CONTINUE」をクリックすると、ターゲットマシンが起動されます。
<img src="/images/20201120/Launch_Target(CutOver)確認.png" loading="lazy">

CloudEndureコンソールの「JobProgress」を確認すると、CutOverが開始されていることがわかります。
<img src="/images/20201120/JobProgress_Start(CutOver).png" loading="lazy">

AWSのコンソールを確認すると、テストモードで起動したEC2インスタンスが終了後されていることがわかります。
<img src="/images/20201120/TestMode_Machine終了.png" loading="lazy">
（後続の動作は、テストモードと同一であるため、省略します。）

カットオーバーが完了しました。
<img src="/images/20201120/Launch_Target(CutOver)成功.png" loading="lazy">

### 起動後の設定修正
テストモードと同じく、SSHでログインして、
WordPressの設定を変更したあと、アクセスしてみます。
(作業内容はテストモードと同一であるため、省略します。)
<img src="/images/20201120/EC2_WordPress(CutOver).png" loading="lazy">
アクセスできました。

# ターゲットマシンからエージェントのアンインストール
カットオーバー完了後は、CloudEndureエージェントは不要となります。
ターゲットマシンからアンインストールを行います。

## エージェントの停止
以下のコマンドをrootで実行して、エージェントを停止します。
`/var/lib/cloudendure/stopAgent.sh`


```bash 実行結果
$ /var/lib/cloudendure/stopAgent.sh
Killing agent: 1569
17818
17819
Killed Agent
Killing tailer: 1566
1668
1670
1672
Killed Tailer
Killing update_onprem_volumes: 1567
1636
1638
1639
Killed update_onprem_volumes
Killing run_linux_migration_scripts_periodically: 1568
1635
1637
1640
Killed run_linux_migration_scripts_periodically
Killing tail: 1691
Killed tail
```

## インストール時の設定削除
以下のコマンドをrootで実行することで、起動設定などを削除できます。
`/var/lib/cloudendure/install_agent --remove`


```bash 実行結果
$ /var/lib/cloudendure/install_agent --remove
--- installing new driver
running: 'which update-rc.d'
which: no update-rc.d in (/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/root/bin)
retcode: 256
running: 'which chkconfig'
/sbin/chkconfig
retcode: 0
running: 'chkconfig --del ce-agent'
retcode: 0
running: 'chkconfig --del ce-convert'
retcode: 0
running: 'which systemctl'
/bin/systemctl
retcode: 0
running: 'systemctl disable ce-agent.service'
ce-agent.service is not a native service, redirecting to /sbin/chkconfig.
Executing /sbin/chkconfig ce-agent off
retcode: 0
running: 'systemctl disable ce-convert.service'
ce-convert.service is not a native service, redirecting to /sbin/chkconfig.
Executing /sbin/chkconfig ce-convert off
retcode: 0
running: 'visudo -c -f /etc/tmpVciTv8'
/etc/tmpVciTv8: parsed OK
/etc/sudoers.d/google_sudoers: parsed OK
retcode: 0
```
あとは、インストーラーやCloudEndureのログファイルなど、適宜削除してください。

# まとめ
2回に分けて、CloudEndureについて、記述しました。
移行元のサーバーを起動したまま、サーバーをまるごと移行できるのが
CloudEndure Migrationの強みです。

CloudEndure自体の利用は無料のため、試してみてはいかがでしょうか。

# 参考リンク

* [CloudEndureDocumentation](https://docs.cloudendure.com/CloudEndure%20Documentation.htm)
* [[クラウド移行] CloudEndureを使ったEC2への移行を計画する前に考慮しておきたいポイント](https://dev.classmethod.jp/articles/planning-migration-cloudendure/)

