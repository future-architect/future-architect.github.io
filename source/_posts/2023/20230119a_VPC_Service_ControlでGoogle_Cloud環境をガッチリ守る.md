---
title: "VPC Service ControlでGoogle Cloud環境をガッチリ守る"
date: 2023/01/19 00:00:00
postid: a
tag:
  - GCP
  - VPC
  - Network
category:
  - Security
thumbnail: /images/20230119a/thumbnail.png
author: 岸下優介
lede: "Google CloudのVPC Service Controlsを利用して、リソースへのアクセス制御を行う方法についてTerraformコード付きで紹介していきます。昨今では、個人情報漏洩のニュースが尽きません。少し古いデータではありますが..."
---
## はじめに

こんにちは、本記事ではGoogle CloudのVPC Service Controlsを利用して、リソースへのアクセス制御を行う方法についてTerraformコード付きで紹介していきたます。

昨今では、個人情報漏洩のニュースが尽きません。少し古いデータではありますが、2012年～2021年に漏洩・紛失した可能性のある個人情報は累計で1億1979万人分にのぼり、2022年を含めるともっと多くなりそうです。
[個人情報漏えい、10年間で日本の人口とほぼ同じ人数分が上場企業から流出・紛失【東京商工リサーチ調べ】](https://webtan.impress.co.jp/n/2022/03/22/42500#:~:text=%E6%9D%B1%E4%BA%AC%E5%95%86%E5%B7%A5%E3%83%AA%E3%82%B5%E3%83%BC%E3%83%81%E3%81%AF%E3%80%812021,%E3%82%82%E6%9C%80%E5%A4%9A%E8%A8%98%E9%8C%B2%E3%81%A0%E3%81%A8%E3%81%84%E3%81%86%E3%80%82)

セキュリティインシデントを起こさないためにも、基本的にはデータへのアクセスを拒否し、データにアクセスできる人を絞って穴あけするなど、しっかりとデータを守っておく必要があります。

そんな要求に答えるのがVPC Service Controlsになります。

## VPC Service Controlsとは

[VPC Service Controlsの概要](https://cloud.google.com/vpc-service-controls/docs/overview?hl=ja)

VPC Service Controlsを利用することによって、Google Cloudのリソースへのアクセスに境界を作ることができます。

例えば、BigQueryやCloud Storageに個人を特定することができる情報（例：身長、体重、性別、年齢）や画像が置かれている場合、VPC Service Controlsを利用することで**それらのリソースに限られた人間のみがアクセス可能**となります。

また境界の内外におけるデータ移動を制御することが可能なため、データが境界の外へ持ち出されることも防ぎます（境界を超える通信はデフォルトでブロックされます）。

<img src="/images/20230119a/a864e1b2-7cd3-c69c-bf63-fe2b21622b6d.png" alt="" width="1200" height="640" loading="lazy">


こちらの画像のように、境界（Service Perimeter）内に存在するBigQueryは認証されたVPC、VM（GCE）からのみアクセス可能となり、認証されていないリソースからは境界内へのアクセス・境界外へのアクセス共に制限されることになります。

現在、VPC Service Controlsがサポートしているリソースの一覧はこちらになります。
[VPC Service Controlでサポートされているプロダクトと制限事項](https://cloud.google.com/vpc-service-controls/docs/supported-products?hl=ja)

### Cloud IAMとは違うの？

Cloud IAMもリソースへのアクセスを制限するためのサービスで、**詳細なIDベースのアクセス制御を主**としています。IDベースなので例えばログインしているアカウント、所属するグループ、サービスアカウントなどを基にアクセス制御を行います。

VPC Service Controlsはそれに加えて、境界全体への上り（Ingress）・下り（Egress）データの制御など、**コンテキストベースの境界セキュリティが可能**となります。

コンテキストベースは、例えば「どこ（IPアドレス）」、「だれ（ユーザーアカウント・サービスアカウント、**グループは現在不可**）」、「何で（OS）」などアクセス元の背景からリソースへのアクセス可否を判断します。

どちらが良い・悪いというのは無く、併用することでより強固なセキュリティを築くことが可能となります。


## BigQueryを使って挙動を確認

### Organizationの設定が必要

VPC Service Controlを始めるにはOrganizationが必要となります。Organizationの設定にはドメインが必要となるため、Google Domainなどで取得する（年間1200円～）必要があります。もし、既にドメインをお持ちの場合はサブドメインを作って、それをOrganizationへ適用することも可能です。

Organizationの作成方法は以下を参考にするとよいです。
[GCP で組織を作成して共有 VPC 構築 - 1.ドメイン取得](https://qiita.com/suzuyui/items/947867f52897417ee31b#1-%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E5%8F%96%E5%BE%97)

### アクセスポリシーを作成する

アクセスポリシーは、以後出てくるアクセスレベルやサービス境界など、全てのAccess Context Managerリソースのコンテナ（箱）です。

Organizationに対してOrganizationレベルのアクセスポリシーを作成し、組織内のフォルダとプロジェクトに対してスコープポリシーを作成します。

```sh access_context_manager_access_policy.tf
resource "google_access_context_manager_access_policy" "access_policy" {
  parent = "organizations/1234567890123"
  title  = "Test access policy"
}
```

`parent`には自身のOrganization IDを入力する必要があり、`title`がOrganizationのアクセスポリシーの名前となります。

作成すると、Organization→セキュリティ→VPC Service Controls上にアクセスポリシーが作成されていることが確認できます。

<img src="/images/20230119a/d0b0a574-e85f-3509-49bc-263a2ec8b6f5.jpeg" alt="" width="1120" height="334" loading="lazy">

### ID制御をやってみる

ID制御を行ってみます。
通常は画像のようにBigQueryのDataset, tableを見ることができます。

<img src="/images/20230119a/da83249a-b466-c2eb-8ea7-9e5fe5e9abfc.jpeg" alt="" width="894" height="396" loading="lazy">

これに対して、以下のようなBigQueryへの内向きのみを許可したサービス境界を設定してみます。

<img src="/images/20230119a/755d759c-cde1-42d1-c0c4-e62dc1425a89.png" alt="" width="930" height="348" loading="lazy">


#### アクセスレベルを作成する

[アクセスレベル](https://cloud.google.com/access-context-manager/docs/overview#access-levels)ではリソースへのアクセスを許可する条件を定義します。
例えば、IPアドレスやID（ユーザーアカウント、サービスアカウント）を用いたアクセス条件を`AND`や`OR`を使って定義することができ、この条件に適したユーザーのみがリソースへアクセス可能となります。
Terraformでは以下のようにアクセスレベルを作成します。

```sh access_context_manager_access_level.tf
resource "google_access_context_manager_access_level" "id" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}/accessLevels/specified_id"
  title  = "Specified ID"

  basic {
    conditions {
      // アクセスを許可する条件
      // ここで気を付けたいのが、メールアドレスの前にuser:をつけること
      // ServiceAccountの場合はserviceAccount:{emailid}
      // また、グループはサポートされていない
      members = [
        "user:xxx@yyy.com"
      ]
    }
  }
}

```


#### サービス境界を作成する

VPC Service Controlsの主役です。指定したサービスのリソースに対して外部アクセスから保護するための境界を作ります。

以下のようにTerraformコードを作成し、サービス境界を作成します。

```sh access_context_manager_service_perimeters.tf
resource "google_access_context_manager_service_perimeter" "service_perimeter_qiita" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}/servicePerimeters/restrict_bigquery"
  title  = "restrict_bigquery"
  status {
    // 境界を作るサービスを列挙する
    restricted_services = [
      "bigquery.googleapis.com",
    ]
    // 境界を作るプロジェクト
    resources = [
      "projects/123456789012" // Project IDで指定する
    ]
    // アクセスレベル
    access_levels = [
      google_access_context_manager_access_level.access_level_id.name
    ]
    // 内向きポリシー
    ingress_policies {
      ingress_from {
        // IDタイプはidentitiesで指定するため、UNSPECIFIEDになる
        identity_type = "IDENTITY_TYPE_UNSPECIFIED"
        // 内向き元のID
        identities = [
          "user:xxx@yyy.com" // メールアドレスで指定する
        ]
      }
      ingress_to {
        // 境界内のプロジェクトの内、アクセスするプロジェクト
        resources = ["*"]
        // 許可する操作
        operations {
          service_name = "bigquery.googleapis.com"
          // 許可するメソッド（API）を指定する
          // 今回は全てのメソッドを指定しているため、*になっている
          method_selectors {
            method = "*"
          }
        }
      }
    }
  }
}
```

アクセスレベルの`members`、サービス境界の`ingress_from`の`identities`、どちらもID`"user:xxx@yyy.com"`を設定しています。

アクセスレベル側では`restricted_services`全体に対しての制御になります。今回はBigQueryのみしか入っておりませんが、Cloud Storageなど他のサービス入れることができ、`restricted_services`に入っているサービス全てにアクセスレベル側での`members`設定が適用されます。また、アクセスレベル側で許可されている場合はIngress/Egress両方の操作が可能となります。

サービス境界側の`identities`はTerraformコードの構成を見るとわかるように、内向き（Ingress）・外向き（Egress）で、尚且つAPI毎で適用されることになります。そのため、アクセスレベルですり抜けた場合にIngress/Egressでのポリシーが適用されます。

今回の場合だとBigQueryのみしかないので`identities`の指定は不要ですが、参考のために記載しております。

#### 認証されたアカウントで確認してみる

アクセスレベルで許可されたアカウントでBigQueryを見てみると先ほどと同じようにテーブルが表示されます。

<img src="/images/20230119a/da83249a-b466-c2eb-8ea7-9e5fe5e9abfc_2.jpeg" alt="" width="894" height="396" loading="lazy">

次に認証されていないプロジェクトからクエリを実行してみます。

<img src="/images/20230119a/7f3f9c23-2e49-3aea-acaa-2e29d774582b.jpeg" alt="" width="1200" height="223" loading="lazy">

右上に赤字で`VPC Service Controls: Request is prohibited by organization's policy. vpcServiceControlsUniqueIdentifier: -ZWUwU96cNc6_jcWbyKhbCfz9canAZcNkQjPcb4uEhOY00WbG64xVw.`と表示され、クエリが実行できなくなっています。
こちらの原因としては今回内向き（Ingress）のみしか許可していなかったため、サービス境界外へのデータ持ち出しが拒否されたことによるものです。

<img src="/images/20230119a/fbf4eb92-8842-ec33-9104-afeec96066bd.png" alt="" width="816" height="280" loading="lazy">

##### 少し寄り道：ポリシー違反のトラブルシューティング

ポリシー違反の理由を確認するために、Google CloudではVPC Service Controls のトラブルシューティングが用意されています。
[VPC Service Controls のトラブルシューティングによる問題の診断](https://cloud.google.com/vpc-service-controls/docs/troubleshooter?hl=ja)

上記のようにポリシー違反が発生した際、`vpcServiceControlsUniqueIdentifier:`以降の文字列をVPC Service Controls のトラブルシューティングに入力すると違反理由が確認できます。

<img src="/images/20230119a/b666ebc4-5fc7-cfee-b484-e523c7d96640.png" alt="" width="823" height="663" loading="lazy">

トラブルシューティングをすると、以下のように行われた動作と違反理由が表示されます。

<img src="/images/20230119a/0e0f69b8-fb59-c4a1-12b4-bb8e739f200f.png" alt="" width="949" height="463" loading="lazy">
上記のポリシー違反理由は、サービス境界外で`tables.getData`が行われたことが原因のようです。
また、このことからクエリ実行の際、コンソールの裏側ではAPI（`tables.getData`）がコールされていることもわかります。

#### 認証されていないアカウントで確認してみる

また、認証されていないアカウントで確認してみると以下のように表示されます。

<img src="/images/20230119a/898b2891-6500-d523-2d73-a9ea1c6c24e4.png" alt="" width="1200" height="287" loading="lazy">

データセットすら見えず、クエリを打とうとすると右上に赤字で`VPC Service Controls: Request is prohibited by organization's policy.`と表示されています。

<img src="/images/20230119a/263efca8-74e1-8ad3-3501-b668c6e69473.png" alt="" width="777" height="331" loading="lazy">

認証されていないアカウントで`bq`コマンドでも同様に確認してみます。

```bash
$ bq query --use_legacy_sql=false --project_id <YOUR_PROJECT_ID>  'select worker_id from `****-service-three.svc3_dataset.test_table`'

BigQuery error in query operation: VPC Service Controls: Request is prohibited by organization's policy.
vpcServiceControlsUniqueIdentifier: ***.
```

`bq`コマンドでもデータにアクセスできないことが確認できました。
以上より、サービス境界が作られていることがわかりました。

### IP制御を加えてみる

アクセスレベルにGCEのVMに付与されたIPアドレスを指定し、先ほどと同様のサービス境界を作成します。

```sh
resource "google_access_context_manager_access_level" "id_and_ip" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}/accessLevels/specified_id_and_ip"
  title  = "Specified ID and IP"

  basic {
    # combining_functionで各条件の組み合わせ条件を指定する
    # デフォルトはANDになる
    combining_function = "AND"
    conditions {
      members = [
        "user:xxx@yyy.com"
      ]
    }
    conditions {
      ip_subnetworks = [
        "xx.xx.xx.xx/32"
      ]
    }
  }
}
```

先ほどアクセス可能だったアカウントからGoogle CloudコンソールのBigQueryへアクセスして、クエリを実行してみます。
<img src="/images/20230119a/77f9a4f8-2a73-f0d1-400a-e306ffb1b765.png" alt="" width="1200" height="123" loading="lazy">

アクセスできなくなったことが確認できます。

<img src="/images/20230119a/9de770bd-ea00-9238-2464-906a4bc2561a.png" alt="" width="795" height="320" loading="lazy">


次に指定されたIPアドレスのVMに認証済みのアカウントで`gcloud auth login`してから`bq`コマンドを打ってみます。

```bash
bq query --use_legacy_sql=false --project_id <YOUR_PROJECT_ID>  'select worker_id from `****-service-three.svc3_dataset.test_table`'
+-----------+
| worker_id |
+-----------+
|         1 |
|         4 |
|         3 |
|         5 |
|         2 |
+-----------+
```

無事にクエリを実行することができました。

<img src="/images/20230119a/27b0c988-2a46-cf62-d7c1-910a171c2e00.png" alt="" width="925" height="338" loading="lazy">

このようにアクセスレベルでは個々のIPやアカウントを利用した細かい制御を行うことができます。
他にもOSの指定（有料）、スクリーンロックを要求するなどを設定することも可能です。

## 応用編

### Service Perimeterで守られた2つのBigQuery間でテーブルをJOINする

2つのプロジェクトを用意し、各プロジェクトで以下のデータセットを用意します。

```bash ProjectA
+---------------+-----------------+
| department_id | department_name |
+---------------+-----------------+
|             3 | HR              |
|             1 | Engineer        |
|             5 | Marketing       |
|             4 | BackOffice      |
|             2 | Sales           |
+---------------+-----------------+
```

```bash ProjectA
+-----------+-----------+-----+---------------+
| worker_id |   name    | age | department_id |
+-----------+-----------+-----+---------------+
|         1 | Tanaka    |  23 |             1 |
|         4 | Kobayashi |  28 |             2 |
|         3 | Yamada    |  56 |             2 |
|         5 | Suzuki    |  44 |             3 |
|         2 | Sasaki    |  34 |             5 |
+-----------+-----------+-----+---------------+
```

そして、それぞれのBigQueryを以下のように別のサービス境界で守ります。

<img src="/images/20230119a/34000be3-c373-0fe1-47b6-fdae7b41ec73.png" alt="" width="1078" height="374" loading="lazy">


ではこの時、どのようにIngree/Egressを設定すればよいのでしょうか？
正解は以下のようになります。

<img src="/images/20230119a/e43ce7a0-2d0e-6e65-a572-88d487eacd7b.png" alt="" width="928" height="489" loading="lazy">

アクセスレベルには先ほどと同様のIDとIPで指定したアクセスレベルを利用し、サービス境界のTerraformコードは以下になります。

```sh perimeter_project_a.tf
resource "google_access_context_manager_service_perimeter" "projecta_perimeter" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}/servicePerimeters/projecta"
  title  = "ProjectA"
  status {
    restricted_services = [
      "bigquery.googleapis.com",
    ]
    resources = [
      "projects/111111111111", # ProjectA
    ]
    access_levels = [
      google_access_context_manager_access_level.access_level_id_and_ip.name
    ]
    egress_policies {
      egress_from {
        identity_type = "ANY_IDENTITY"
      }
      egress_to {
        resources = [
          "projects/222222222222" # ProjectB
          ]
        operations {
          service_name = "bigquery.googleapis.com"
          method_selectors {
            method = "*"
          }
        }
      }
    }
  }
}
```

```sh perimeter_project_b.tf
resource "google_access_context_manager_service_perimeter" "projecta_perimeter" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}/servicePerimeters/projectb"
  title  = "ProjectB"
  status {
    restricted_services = [
      "bigquery.googleapis.com",
    ]
    resources = [
      "projects/222222222222", # ProjectB
    ]
    access_levels = [
      google_access_context_manager_access_level.access_level_id_and_ip.name
    ]
    egress_policies {
      egress_from {
        identity_type = "ANY_IDENTITY"
      }
      egress_to {
        resources = [
          "projects/111111111111" # ProjectA
          ]
        operations {
          service_name = "bigquery.googleapis.com"
          method_selectors {
            method = "*"
          }
        }
      }
    }
  }
}
```

```bash terminal
bq query --use_legacy_sql=false  'select name, age, department_name from `project-a.dataset.table1` as table1 join `project-b.dataset.table2` as table2 on table1.department_id=table2.department_id'
+-----------+-----+-----------------+
|   name    | age | department_name |
+-----------+-----+-----------------+
| Suzuki    |  44 | HR              |
| Tanaka    |  23 | Engineer        |
| Sasaki    |  34 | Marketing       |
| Kobayashi |  28 | Sales           |
| Yamada    |  56 | Sales           |
+-----------+-----+-----------------+
```

お互いにEGRESSを許可することでJOINが可能になります。
結合処理を行うスロットに送られる際に、ProjectA側のテーブルとProjectB側のテーブルが**外に持ち出される**ことでEGRESSの穴あけが必要になるようです。

## Shared VPCでアクセス制御する

Shared VPCのプロジェクトでVPC Service Controlsを利用したい場合は、同じ境界内にVPCホストプロジェクトも含めないと、期待する動作にならない可能性があるみたいです。
[Shared VPCにおけるVPC Service Controls](https://cloud.google.com/vpc-service-controls/docs/troubleshooting?hl=ja#shared_vpc)

そのため、以下のように`resources`へVPCホストプロジェクトも含めるようにしましょう。

```sh perimeter_shared_pj.tf
resource "google_access_context_manager_service_perimeter" "shared_pj_perimeter" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.access_policy.name}/servicePerimeters/shared_pj_perimeter"
  title  = "Shared PJ Perimeter"
  status {
    restricted_services = [
      "bigquery.googleapis.com",
    ]
    // 境界を作るプロジェクトにホストプロジェクトも含める
    resources = [
      "projects/333333333333", # shared-vpc-pj
      "projects/444444444444", # shared-vpc-host-pj
    ]
    access_levels = [
      google_access_context_manager_access_level.access_level_id.name
    ]
    ingress_policies {
      ingress_from {
        identity_type = "IDENTITY_TYPE_UNSPECIFIED"
        identities = [
          "user:xxx@yyy.com"
        ]
      }
      ingress_to {
        resources = ["*"]
        operations {
          service_name = "bigquery.googleapis.com"
          method_selectors {
            method = "*"
          }
        }
      }
    }
  }
}
```

## まとめ

今回はBigQueryに対してVPC Service Controlsの機能を試してみました。

VPC Service Controlsではデータのやり取りを内向き・外向きの細かいレベルで制御することが可能になります。

Google Cloud上のデータを守るためにも、ぜひ利用してみて下さい。
