---
title: "VPC外からCloud SQL Auth Proxyを利用したPrivate IP Cloud SQLへの接続"
date: 2023/10/19 00:00:00
postid: a
tag:
  - CloudSQL
  - GoogleCloud
  - IAM
  - プロキシ
category:
  - Infrastructure
thumbnail: /images/2023/20231019a/thumbnail.png
author: 岸下優介
lede: "Private IPしか持たないCloud SQLへ接続する方法として、Cloud SQL Auth Proxyを利用した接続方法について紹介致します。"
---
## はじめに

本記事では、Private IPしか持たないCloud SQLへ接続する方法として、Cloud SQL Auth Proxyを利用した接続方法について紹介致します。

## Cloud SQL

[Cloud SQL](https://cloud.google.com/sql/docs/introduction?hl=ja)はMy SQL、PostgreSQL、SQL Server用のフルマネージドリレーショナルデータベースのサービスです。

Google Cloudには、AlloyDB、Spanner、Firestore、Bigtableなど様々なデータベースサービスが存在しますが、Cloud SQLもその内の1つになります。たくさんあってどれ選べばいいのかわからない！ という状況に陥った場合は、[Your Google Cloud database options, explained](https://cloud.google.com/blog/topics/developers-practitioners/your-google-cloud-database-options-explained?hl=en)からベストプラクティスを探るのが良いと思います。

### Cloud SQLへの接続方法

Cloud SQLへは`mysql`や`psql`コマンドなどで接続でき、接続方法として以下の2つの方法が用意されています。

1. プライベートIPアドレス
    - 同一VPCから接続できる内部接続
2. パブリックIPアドレス
    - インターネット経由でアクセスできる外部接続

SQLインスタンスをインターネット上に晒したくないというセキュアな条件を満たしたい場合は、1のプライベートIPアドレスのみを利用するケースが多いかと思われます。但し、上記で記載した通り同一VPC内からの接続となるため、

1. 接続元となるPC・VMをそのVPC内に構築する必要
2. もしくはそのVPC内へのアクセス経路を持つ必要

があります。
1の場合は、Cloud SQLインスタンスのプライベートIPに対して直接接続できるので一番手っ取り早い方法かと思います。

<img src="/images/2023/20231019a/image.png" alt="image.png" width="782" height="550" loading="lazy">

2の場合は、Cloud SQLが存在するVPC内へアクセス経路を持つ必要があるため、VPC PeeringやCloud VPN、Cloud Interconnectによって接続元が利用するVPCがお互いに経路を確保し、Cloud SQLのPrivate IPが広報される必要があります。
※本記事では[HA-VPN構成](https://cloud.google.com/network-connectivity/docs/vpn/concepts/topologies?hl=ja)を例に取り扱わせて頂きます。

<img src="/images/2023/20231019a/image_2.png" alt="image.png" width="1200" height="394" loading="lazy">

但し、Cloud SQLのプライベートIPアドレスが既に割り振られている場合、広報先のVPC内でそのIPアドレスが既に使われている場合は多々あります。そのような状況で広報をしてしまうと、IPアドレスが被ってしまい広報できない、もしくはネットワーク事故につながることになります。さて、この場合どうしましょう🤔

### Cloud SQL Auth Proxy

ここで出番となるのが、[Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy?hl=ja)です。公式では「Cloud SQL Auth Proxyは承認済みネットワークやSSLの構成を必要とせず、安全にインスタンスにアクセスできるCloud SQLコネクタです」とあり、Auth Proxy経由でCloud SQLインスタンスへ接続できるようになります。また、認可にIAM権限を利用することになるため、よりセキュアな接続となります。

このCloud SQL Auth Proxyを利用して、Cloud SQLインスタンスが存在するVPC内外から接続経路を構築していきます。

## Cloud SQL Auth Proxyを利用した接続

<img src="/images/2023/20231019a/image_3.png" alt="image.png" width="1200" height="397" loading="lazy">

アーキテクチャ上で変わった部分としては黄色の箇所で、Cloud SQLインスタンスが存在するVPC-AにCloud SQL Auth Proxyを立てておくためのDB Bastion VMを構築しておく必要があります。また、Cloud SQLインスタンスは複数あることを想定しております。

HA VPNの構築は公式のドキュメントにお任せします。公式がTerraformの例まで用意しているのは非常にありがたいですね。

- [HA VPN ゲートウェイを作成して VPC ネットワークに接続する](https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn2?hl=ja#create_an_additional_tunnel_on_a_single-tunnel_gateway)
- [HA VPN ゲートウェイ向けの Terraform の例](https://cloud.google.com/network-connectivity/docs/vpn/how-to/automate-vpn-setup-with-terraform?hl=ja)

HA VPN構築後、DB Bastionで利用するサブネットワークのIPアドレス範囲をVPC-B側に広報することを忘れないように気を付けましょう。

また、VPC-B側のVMの構築、VPC-A側のCloud SQLの構築についても省略させて頂きます。
以下のTerraform公式が参考になると思います。

- [Compute Engine](https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_instance.html)
- [Cloud SQL - Private IP Instance](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance#private-ip-instance)

DB Bastion VMについてですが、Startup ScriptにてCloud SQL Auth Proxyをsystemdとして起動するように設定しておくと、起動時に確実にAuth Proxyが起動され、更に状態を管理しやすくなります。

以下にそのStartup Scriptを記載します。

※[最新ver.は公式からチェック](https://cloud.google.com/sql/docs/postgres/sql-proxy?hl=ja#install)してください。

```bash cloudsql_auth_proxy_setup.sh
# Define your variables
PROJECT_ID=test_pj
declare -a INSTANCES=("test-db1" "test-db2")
declare -a REGIONS=("asia-northeast1" "asia-northeast2")
declare -a PORTS=("5432" "5433")


# Download Cloud SQL Auth Proxy from the bucket and isntall
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.6.1/cloud-sql-proxy.linux.amd64
mv cloud-sql-proxy /usr/local/bin/
chmod +x /usr/local/bin/cloud-sql-proxy

# Create systemd service for each Cloud SQL instance
for index in ${!INSTANCES[*]}
do
  instance=${INSTANCES[$index]}
  region=${REGIONS[$index]}
  port=${PORTS[$index]}

  # Create a systemd service file
  sudo bash -c "cat <<EOF > /etc/systemd/system/cloud-sql-proxy-${instance}.service
[Unit]
Description=Google Cloud SQL Auth Proxy ${instance}
After=network.target

[Service]
ExecStart=/usr/local/bin/cloud-sql-proxy --address 0.0.0.0 --private-ip ${PROJECT_ID}:${region}:${instance} --port ${port}
Restart=always
User=root
Type=simple

[Install]
WantedBy=multi-user.target
EOF"

  # Enable and start the service
  sudo systemctl enable cloud-sql-proxy-${instance}.service
  sudo systemctl start cloud-sql-proxy-${instance}.service
done
```

ここで気を付けたいのがCloud SQL Auth Proxyの実行コマンドで`--address`を指定する際に、`127.0.0.1`と指定してしまうとlocalhostからの接続しか受け付けなくなってしまいます。今回はDB Bastion外から接続を行う必要があるため、`0.0.0.0`で指定しております。

作成したStartup scriptはDB Bastion VM構築時に`startup-script`として指定しましょう。
また、ネットワークタグ：`tags`も設定しておきます

```sh compute_instance.tf
resource "google_compute_instance" "db_bastion" {
# ...

    tags = ["db-bastion"]
# ...

    metadata = {
        startup-script = "startup-scripts/cloudsql_auth_proxy_setup.sh"
    }
#...

}
```

DB上のデータ外部持ち出しを防ぐためにDB BastionのEGRESSを全て拒否しているケースもあると思います。その場合、Cloud SQL Auth Proxy用に**Cloud SQLインスタンスのプライベートIPアドレスに対してPort:3307を介したEGRESSを許可**するFirewallを設定しておく必要があります。

参考：[Cloud SQL Auth Proxyの接続経路](https://cloud.google.com/sql/docs/mysql/connect-auth-proxy?hl=ja#:~:text=%E9%80%81%E4%BF%A1%E3%83%95%E3%82%A1%E3%82%A4%E3%82%A2%E3%82%A6%E3%82%A9%E3%83%BC%E3%83%AB,%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%20%E3%83%9D%E3%83%BC%E3%83%88%E3%81%A7%E3%81%99%E3%80%82)

```sh compute_firewall.tf
resource "google_compute_firewall" "db_bastion2cloudsql" {
  name               = "db-bastion2cloudsql"
  network            = <YOUR_VPC_NAME>
  direction          = "EGRESS"
  target_tags        = ["db-bastion"]
  destination_ranges = [
    google_sql_database_instance.instance1.ip_address.0.ip_address,
    google_sql_database_instance.instance2.ip_address.0.ip_address,
  ]

  allow {
    protocol = "tcp"
    ports    = ["3307"]
  }
}
```

※`google_sql_database_instance.instance1`, `google_sql_database_instance.instance2`というリソース名でCloud SQLインスタンスを構築していることを想定しております。

また、Cloud SQL Auth Proxyのセクションでも述べましたがIAM権限を利用した認可となるため、以下の権限をDB BastionのService Accountへ設定する必要があります。

- roles/cloudsql.client

これで構築・設定は完了となります。試しにCloud SQLにPostgreSQLを設定し、VPC Bのインスタンスからpsqlコマンドで接続してみます。

```bash terminal
psql "host=<DB Bastion's IP address> port=5432 dbname=test_db sslmode=disable user=test_user password=****"
psql (12.15 (Ubuntu 12.15-0ubuntu0.20.04.1), server 13.10)
WARNING: psql major version 12, server major version 13.
         Some psql features might not work.
Type "help" for help.
postgres=>
```

無事に接続できました！

## まとめ

本記事ではプライベートIPしか持たないCloud SQLインスタンスに対して、インスタンスが存在するVPCの外からCloud SQL Auth Proxyを介して接続する方法を紹介しました。

Cloud SQL Auth Proxy自体、全くキャッチアップなく簡単に使えて非常に便利なサービスです。[Cloud SQL Auth Proxy Docker イメージを使用した SQL サーバー クライアントの接続](https://cloud.google.com/sql/docs/sqlserver/connect-docker?hl=ja)で説明されているようにDockerとして起動することも可能なので、自身の要件に合わせて構成してみて下さい。
