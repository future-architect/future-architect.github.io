---
title: "Cloudflare R2 + NextCloudで作る自分専用クラウドストレージのススメ"
date: 2024/06/03 00:00:00
postid: a
tag:
  - S3
  - Cloudflare
  - NextCloud
category:
  - Infrastructure
thumbnail: /images/2024/20240603a/thumbnail.png
author: 大岩潤矢
lede: "みなさんこんにちは、TIG所属の大岩潤矢です。今回はCloudflare連載ということで、Cloudflareのサービス、Cloudflare R2と、NextCloudを利用した自分専用クラウドストレージの構築について紹介します。"
---

[Cloudflare連載](/articles/20240527a/)の4つ目です。

## はじめに

みなさんこんにちは、TIG所属の大岩潤矢( [@920OJ](https://x.com/920OJ) )です。

Cloudflareのサービス、Cloudflare R2と、NextCloudを利用した自分専用クラウドストレージの構築について紹介します。

## Cloudflare R2とは

Cloudflare R2とは、Cloudflareが提供するオブジェクトストレージサービスです。誤解を恐れず簡単に言ってしまえば、Amazon S3のCloudflare版、という表現が当てはまると思います。

https://www.cloudflare.com/ja-jp/developer-platform/r2/

### 料金体系

Cloudflare R2の大きな特徴は、データ転送量が無料であることから、**他社サービスに比べてコストを抑えて利用できること**が挙げられます。以下にCloudflare R2の料金体系を整理します。

| 種別 | 月間無料枠 | 有料(月額) |
| --- | --- | --- |
| ストレージ(データの保存) | 10GB | 1GB あたり 0.015 USD |
| クラスAの操作(状態の変更) | 100万操作　 | 100万操作 あたり 4.50 USD |
| クラスBの操作(既存状態の読取) | 1,000万操作 | 100万操作 あたり 0.36 USD |
| 転送(エグレス) | 無制限 | - |

詳細はCloudflare R2の公式ガイドもご確認ください。

https://developers.cloudflare.com/r2/pricing/

例えば保存しているデータが10GB以内である場合、ずっと無料のまま使い続ける事ができます。転送量に課金は発生しないので、どれだけ転送しても（1,000万回以上操作しない限りは)無料です。

一方ストレージの課金は「ピークストレージの平均」という概念で計算されるため、注意が必要です。これは日割りで保存しているデータ量を計算するもので、月の最終日の保存量に対する課金ではありません。

> A GB-month is calculated by averaging the peak storage per day over a billing period (30 days)

例えばある月の1日〜15日までは100GBを保存していたが、データを削除して16日〜30日は1GBまで減らした場合、以下の計算式で課金料が決定します。

> 100GB * 15/30 month + 1GB * 15/30 month = 50.5 GB-month
> (50.5GB-month - 10GB 無料枠) * 0.015 USD = 0.6075 USD

Amazon S3とも比較してみましょう。微妙に料金体系は異なりますが、先程の表に当てはめてみると以下のようになります。

| 種別 | 月間無料枠 | 有料(月額) |
| --- | --- | --- |
| ストレージ(最初の50TB) | 5GB | 1GB あたり 0.025 USD |
| PUT, COPY, POST, LIST操作 | 2,000操作　 | 100万操作 あたり 4.7 USD |
| GET, SELECT操作 | 20,000操作 | 100万操作 あたり 0.37 USD |
| 転送(最初の1TB) | 100GB | 1GBあたり0.114 USD |

先ほど計算した同様のケースをAmazon S3で計算してみると以下のようになります。約2倍ほど高いようです。

> 100GB * 15/30 month + 1GB * 15/30 month = 50.5 GB-month
> (50.5GB-month - 5GB 無料枠) * 0.025 USD = 1.1375 USD

## NextCloudとは

オープンソースで開発されているNextCloudというセルフホスト型のストレージソフトウェアを利用し、自分専用のクラウドストレージを作成します。

https://nextcloud.com/

かつてownCloudというソフトウェアからフォークされたもので、ownCloudと比べるとチャットやビデオ会議機能が追加されているようです。

NextCloudでは基本的にNextCloudがインストールされたマシンのストレージをデータの保存場所としますが、「External Storage Support」というアプリ(プラグイン)をインストールすることで、各種外部ストレージサービスを保存場所に設定できます。

対応している外部ストレージサービスは以下のとおりです。

- Amazon S3
- FTP
- NextCloud
- OpenStack Object Storage
- SFTP
- WebDAV
- ローカル

### なぜCloudflare R2とNextcloudを組み合わせると良いのか？

今回は、NextCloudからCloudflare R2へ接続することにより、容量無制限かつ低コストの自分専用オンラインクラウドストレージを実現してみようと思います。

先述の通り、NextCloudでは外部ストレージとしてAmaon S3が利用できます。さらに、Cloudflare R2はAmazon S3のAPIと互換性があるため、NextCloudのバックエンドとしてCloudflare R2が利用できるという算段です。

この構成を使うのではなく、一般的なクラウドストレージサービス(Google Drive, iCloud等)で良いのでは？ という声が聞こえてくるかもしれません。しかし、これには無視できない絶妙なコスト差が発生します。

以下は一般的なクラウドストレージサービスの料金比較です。

|        | Google Drive | OneDrive     | iCloud     | Dropbox |
| ------ | ------------ | ------------ | ---------- | ------- |
| 無料枠 | 15GB         | 5GB          | 5GB        | 2GB     |
| 50GB   | なし         | なし         | 130円/月   | なし    |
| 100GB  | 250円/月     | 203.3円/月   | なし       | なし    |
| 200GB  | 380円/月     | なし         | 400円/月   | なし    |
| 1TB    | なし         | 1,241.7円/月 | なし       | なし    |
| 2TB    | 1,300円/月   | なし         | 1,300円/月 | 1,500円 |

一般的なクラウドストレージサービスでは、「使った分だけ課金する」従量課金ではなく、あらかじめ使いたい分のストレージ代金を毎月払っていくことになります。そして、往々にして各社用意しているプランは200GBから2TBまでの間が飛んでおり、例えば201GBのファイルを保存したい場合にでも2TB分の料金を払わざるを得ません。

ここで嬉しいのがCloudflare R2です。Cloudflare R2では従量課金であり、201GB保存した場合でも201GB分の料金を払うだけで済みます。計算すると2.865 USDで、1USD = 160円換算だと458.4円です。**Google Driveでは1,300円払わなければならないところが、この方法だと458円で収まりました。**

ちなみにCloudflare R2でのストレージ課金額が1,300円を超えるのはCloudflareに合計551.67GB以上のファイルを保存した場合です。(1USD = 160円換算の場合なので、円高になればより多くのファイルを保存できます)

つまり、**保存したいファイルの総量が551.67GBに達する前まではこの方法のほうがおトク**といえるでしょう。(2024年6月現在)

また、2TBを超える場合など既存のクラウドストレージの提供するプランを超えてしまっているときなども良い選択肢になるでしょう。一方で、同様のサービスにWasabiというオブジェクトストレージサービスがあります。こちらはCloudflare R2よりも安い1TB6.99USDで運用できるので、比較検討してみるのもよいでしょう。

https://wasabi.com/pricing

## セットアップ

ここからは、実際にCloudflare R2とNextCloudを利用して自分専用のクラウドストレージを構築する方法について、ハンズオンの形で紹介します。

今回はプロジェクトの後輩にRaspberry Piを布教する目的も兼ねて、手持ちのRaspberry Pi 3 Model BにNextCloudをインストールします。大学生時代に4台まとめ買いして家に転がっていたものです。

<img src="/images/2024/20240603a/image.png" alt="image.png" width="677" height="353" loading="lazy">

事前にIPアドレスを固定し、SSH接続できるようにしてあります。この方法は本題からそれてしまうので、割愛します。

（もしセットアップにDockerが使えるのであれば、Dockerを使ったほうが何倍も楽にスタートできるのでおすすめです。今回のようにDockerを動かすにはスペック不足であったり、何らかの原因によってインストール出来ない場合にのみ、以下の方法で実施しましょう）。

### MariaDB・nginx・PHP環境のインストール

インストールを始める前に、パッケージを最新化しておきます。

```sh
sudo apt update
sudo apt upgrade
```

データベースにはMariaDBを利用します。

```sh
sudo apt install mariadb-server
```

`mysql_secure_installation` コマンドでMariaDBのセットアップを実施します。自分は以下のようにセットしました。

- Switch to unix_socket authentication → No
- Change the root password? → Yes
- Remove anonymous users? → Yes
- Disallow root login remotely? → No
- Remove test database and access to it? → Yes
- Reload privilege tables now? → Yes

```sh
$ sudo mysql_secure_installation

NOTE: RUNNING ALL PARTS OF THIS SCRIPT IS RECOMMENDED FOR ALL MariaDB
      SERVERS IN PRODUCTION USE!  PLEASE READ EACH STEP CAREFULLY!

In order to log into MariaDB to secure it, we'll need the current
password for the root user. If you've just installed MariaDB, and
haven't set the root password yet, you should just press enter here.

Enter current password for root (enter for none):
OK, successfully used password, moving on...

Setting the root password or using the unix_socket ensures that nobody
can log into the MariaDB root user without the proper authorisation.

You already have your root account protected, so you can safely answer 'n'.

Switch to unix_socket authentication [Y/n] n
 ... skipping.

You already have your root account protected, so you can safely answer 'n'.

Change the root password? [Y/n] y
New password:
Re-enter new password:
Password updated successfully!
Reloading privilege tables..
 ... Success!


By default, a MariaDB installation has an anonymous user, allowing anyone
to log into MariaDB without having to have a user account created for
them.  This is intended only for testing, and to make the installation
go a bit smoother.  You should remove them before moving into a
production environment.

Remove anonymous users? [Y/n] y
 ... Success!

Normally, root should only be allowed to connect from 'localhost'.  This
ensures that someone cannot guess at the root password from the network.

Disallow root login remotely? [Y/n] n
 ... skipping.

By default, MariaDB comes with a database named 'test' that anyone can
access.  This is also intended only for testing, and should be removed
before moving into a production environment.

Remove test database and access to it? [Y/n] y
 - Dropping test database...
 ... Success!
 - Removing privileges on test database...
 ... Success!

Reloading the privilege tables will ensure that all changes made so far
will take effect immediately.

Reload privilege tables now? [Y/n] y
 ... Success!

Cleaning up...

All done!  If you've completed all of the above steps, your MariaDB
installation should now be secure.

Thanks for using MariaDB!
```

`mysql -u root -p` でログインできるか確かめておきましょう。

```sh
$ mysql -u root -p
Enter password:
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 38
Server version: 10.11.6-MariaDB-0+deb12u1 Debian 12

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]>
```

ログインできたら、以下のSQLを実行してNextCloud用のデータベースとユーザを作成しておきましょう。

```sql
CREATE DATABASE nextcloud;
CREATE USER nextcloud IDENTIFIED BY '任意のパスワード';
GRANT ALL ON nextcloud.* TO nextcloud;
```

Webサーバはnginxをインストールします。Apacheでも良いですが、メモリがカツカツなので、個人的にはnginxをおすすめします。

```bash
sudo apt install nginx
```

インストールできたら、systemctlコマンドで自動起動を有効化しておきます。

```bash
sudo systemctl enable nginx
```

ブラウザからRaspberry piのIPアドレス宛にアクセスし、nginxのデフォルトページが表示されたらOKです。

<img src="/images/2024/20240603a/image_2.png" alt="image.png" width="913" height="574" loading="lazy">

続いてPHPをインストールします。デフォルトではPHP 8.2がインストールされるようだったので、リポジトリを追加してPHP 8.3をインストールします。以下コマンドを実行し、 `php8.3` と `php8.3-fpm` 、それから各種モジュールをインストールします。

```bash
sudo wget -qO /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg
echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/php.list
sudo apt update
sudo apt install php8.3 php8.3-fpm php-mysql php-gd php-common php-xml php-json php-intl php-pear php-imagick php-dev php-mbstring php-zip php-soap php-bz2 php-bcmath php-gmp php-apcu php-curl
```

`php8.3-fpm` も同様にsystemctlコマンドで自動起動するようにしましょう。

```bash
sudo systemctl enable php8.3-fpm
```

`/etc/nginx/sites-enabled/default` を編集し、PHPを有効化しておきます。また、NextCloudに必要なリライトルール等もここに記載します。

```sh
        location ~ \.php(?:$|/) {
                include snippets/fastcgi-php.conf;
                rewrite ^/(?!index|remote|public|cron|core\/ajax\/update|status|ocs\/v[12]|updater\/.+|ocs-provider\/.+|.+\/richdocumentscode(_arm64)?\/proxy) /index.php$request_uri;

                fastcgi_split_path_info ^(.+?\.php)(/.*)$;
                set $path_info $fastcgi_path_info;

                fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        }
```

今回は必要最低限のリライトルールを記載しましたが、本来は以下の公式ドキュメントにあるように、色々設定する必要がありそうです。本番運用する場合は設定しておきましょう。

https://docs.nextcloud.com/server/latest/admin_manual/installation/nginx.html

ついでにPHPの設定を変えておきましょう。自分の場合セットアップがタイムアウトで落ちるようでしたので、タイムアウト時間を30秒から10分に伸ばしておきます。`/etc/php/8.3/php-fpm/php.ini` を編集します。

```ini php.ini
max_execution_time = 600
```

### NextCloudのインストール

続いてNextCloudのインストールを実施します。

```bash
sudo chown -R www-data:www-data /var/www/html
cd /var/www/html
wget https://download.nextcloud.com/server/installer/setup-nextcloud.php
```

ファイルを配置したら、`http://(Raspberry PiのIPアドレス)/setup-nextcloud.php` にアクセスします。PHPが正しくセットアップされていればSetup Wizardが表示されるので、「Next」を押下します。

<img src="/images/2024/20240603a/image_3.png" alt="image.png" width="416" height="489" loading="lazy">

今回は `/var/www/html` 配下にそのままインストールするため `.` を入力して「Next」を押下。

<img src="/images/2024/20240603a/image_4.png" alt="image.png" width="436" height="468" loading="lazy">

インストールが終了したら、「Next」を押下します。

<img src="/images/2024/20240603a/image_5.png" alt="image.png" width="592" height="351" loading="lazy">

続いて、 `http://(Raspberry PiのIPアドレス)/index.php` にアクセスし、管理者情報を入力します。

データベース情報の部分は、先述したSQLを実行した場合は、データベース名・ユーザ名ともに `nextcloud` になります。

<img src="/images/2024/20240603a/image_6.png" alt="image.png" width="1200" height="652" loading="lazy">

ようやくインストール完了です。

<img src="/images/2024/20240603a/image_7.png" alt="image.png" width="1200" height="644" loading="lazy">

### Cloudflare R2バケットの作成

いよいよ本題です。Cloudflareの管理画面にアクセスし、R2バケットを作成します。

管理画面へログインし、左のメニューよりR2へ進み、「Create bucket」ボタンを押下します。

<img src="/images/2024/20240603a/image_8.png" alt="image.png" width="1082" height="583" loading="lazy">

任意の名前を入力し「Create bucket」を押下します。

<img src="/images/2024/20240603a/image_9.png" alt="image.png" width="897" height="662" loading="lazy">

続いてAPIトークンを発行します。R2メニューの右上「Manage R2 API Tokens」に進みます（ユーザプロフィールから発行できるユーザトークンとはまた別なので注意）

<img src="/images/2024/20240603a/image_10.png" alt="image.png" width="1200" height="380" loading="lazy">

「Create API Token」を押下します。

<img src="/images/2024/20240603a/image_11.png" alt="image.png" width="1192" height="328" loading="lazy">

今回は閲覧だけでなく編集も行うため、最上位権限である「Admin Read & Write」を選択し、新規作成します。

<img src="/images/2024/20240603a/image_12.png" alt="image.png" width="1200" height="628" loading="lazy">

最後にキーが払い出されます。以下の値をコピーしておきましょう。

- Token
- Access Key ID
- Secret Access Key
- Endpoint

<img src="/images/2024/20240603a/image_13.png" alt="image.png" width="1200" height="728" loading="lazy">

### 接続設定

再度NextCloud側に戻り、接続設定を行います。

先述の通り、デフォルトでは外部ストレージ機能は有効化されていません。S3(Cloudflare R2)へ接続するため、Appsから有効化する必要があります。

右上のユーザアイコン→アプリ→注目のアプリへ進み、「External storage support」を有効化します。

<img src="/images/2024/20240603a/image_14.png" alt="image.png" width="1179" height="415" loading="lazy">

その後設定画面に進み、「外部ストレージ」メニューからR2の設定を追加します。先ほど控えたR2のアクセスキー等を以下のように入力します。

<img src="/images/2024/20240603a/image_15.png" alt="image.png" width="1200" height="563" loading="lazy">

最後にチェックマークをクリックし、左側に緑マークが点灯すれば設定完了です！

## 使ってみる

ホーム画面に戻ってみると、先ほど設定した「R2」フォルダが増えています。

<img src="/images/2024/20240603a/image_16.png" alt="image.png" width="1134" height="504" loading="lazy">

実際にファイルをアップロードしてみましょう。ファイルをドラッグ&ドロップすると……

<img src="/images/2024/20240603a/image_17.png" alt="image.png" width="1057" height="486" loading="lazy">

無事アップロードできました！

Cloudflare R2側にも反映されているようです。

<img src="/images/2024/20240603a/image_18.png" alt="image.png" width="1200" height="537" loading="lazy">

## おわりに

NextCloudのバックエンドとしてCloudflare R2を用いることにより、ある条件下ではおトクに自分専用のクラウドストレージを構築できました。ぜひ自宅に使っていないラズパイやミニPCが転がっている方、既存クラウドストレージサービスの見直しをしている方は、ぜひ構築してみてください！

以上、Cloudflare R2 + NextCloudで作る自分専用クラウドストレージのススメでした。
