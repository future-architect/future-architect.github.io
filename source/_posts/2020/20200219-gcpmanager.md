---
title: "GCP連載#10 Terraform ではなくCloud Deployment Manager を使ってみよう"
date: 2020/02/19 10:05:30
postid: ""
tag:
  - GoogleCloud
  - IaC
category:
  - DevOps
author: 前原応光
lede: "普段は、Terraform を使っているのですが、ふとCloud Deployment Manager を使ったことないことに気づきました。そこで、Cloud Deployment Manager について紹介したいと思います。"
---
## はじめに

[GCP 連載](/articles/20200202/)もいよいよ最終日です！

普段は、Terraform を使っているのですが、ふとCloud Deployment Manager を使ったことないことに気づきました。そこで、Cloud Deployment Manager について紹介したいと思います。

## Cloud Deployment Manager とは

[Cloud Deployment Manager](https://cloud.google.com/deployment-manager) とは、GCP のリソースをYAML で宣言的に記述し、デプロイできるサービスです。要は、AWS のCloudFormation などにあたるサービスです。

ちなみにですが、Cloud Deployment Manager は、テンプレートをPython やJinja2 を使って、パラメータ化することもできます。ざっくりですが、以下にCloud Deployment Manager と似たサービスをクラウド毎に記載します。

|                  | GCP                        | AWS                | AWS                          | Alibaba Cloud                  |
|------------------|----------------------------|--------------------|------------------------------|--------------------------------|
| Management tools | Cloud Deployment Manager   | AWS CloudFormation | Cloud Development Kit (CDK)  | Resource Orchestration Service |
| Format           | JSON, YAML, Python, Jinja2 | JSON, YAML         | TypeScript, Python, Java, C# | JSON                           |

## 事前準備

事前に以下は実施済みであることを前提とします。

* プロジェクト作成
* [gcloud](https://cloud.google.com/sdk/docs/quickstarts?hl=ja) コマンドが使える状態

まず、Deployment Manager のAPI を有効化し、次にgcloud コマンドでログインし、プロジェクトを指定します。
[MY_PROJECT]にあらかじめ作成したプロジェクトのID を指定します。

```bash
gcloud auth login
gcloud config set project [MY_PROJECT]
```

## Cloud Deployment Manager 事始め

まずは、GCE を作成して慣れてみたいと思います。

### 定義ファイルの作成

YAML でリソースを定義します。

```yaml vm.yaml
resources:
- type: compute.v1.instance
  name: test-vm
  properties:
    zone: asia-northeast1-a
    machineType: https://www.googleapis.com/compute/v1/projects/[MY_PROJECT]/zones/asia-northeast1-a/machineTypes/f1-micro
    disks:
    - deviceName: boot
      type: PERSISTENT
      boot: true
      autoDelete: true
      initializeParams:
        sourceImage: https://www.googleapis.com/compute/v1/projects/debian-cloud/global/images/family/debian-9
    networkInterfaces:
    - network: https://www.googleapis.com/compute/v1/projects/[MY_PROJECT]/global/networks/default
      accessConfigs:
      - name: External NAT
        type: ONE_TO_ONE_NAT
```

定義ファイルの設定内容を以下に記載します。

* name: インスタンス名を指定
* zone: 作成するゾーンを指定
* machineType: インスタンスタイプを指定

また、[MY_PROJECT]は、作成したプロジェクトのID を指定します。

### リソースのデプロイ

リソースのデプロイは、`gcloud`をコマンドを使用してデプロイします。

まずは、プレビューで作成したいと思います。プレビューを指定すると作成や更新前にどのような変化をもたらすかを確認できます。要は、dry-run 的な用途で使えるオプションです。

#### コマンドの構成について

コマンドの構成について以下に記載します。
詳細は、[こちら](https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments)を参考にしてください。

```bash
gcloud deployment-manager deployments COMMAND DEPLOYMENT_NAME --config [FILE_PATH] --preview
```

* COMMAND: create, delete, update などを指定
* DEPLOYMENT_NAME: デプロイの名前を指定（任意の名前）
* FILE_PATH: 先ほど作成したリソース定義ファイルのパスを指定
* --preview: dry-run 的に実行したい時に指定

それでは実際に[create](https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/create)コマンドを実行したいと思います。

```bash
$ gcloud deployment-manager deployments create test --config vm.yaml --preview
The fingerprint of the deployment is xxx
Waiting for create [xxx]...done.
Create operation xxx completed successfully.
NAME     TYPE                 STATE       ERRORS  INTENT
test-vm  compute.v1.instance  IN_PREVIEW  []      CREATE_OR_ACQUIRE
```

実行結果のステータスが、`IN_PREVIEW`であることからプレビュー状態であることがわかります。
プレビュー実行後にブラウザで確認すると以下のように構成などを確認できます。

<img src="/images/2020/20200219/photo_20200219_01.png" loading="lazy">

ブラウザ上からデプロイすることも可能ですが、`gcloud`コマンドから実行したいと思います。
[update](https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/update)を指定し、`DEPLOYMENT_NAME`を指定します（ここではtest）

```bash
$ gcloud deployment-manager deployments update test
The fingerprint of the deployment is xxx==
Waiting for update [xxx]...done.
Update operation xxx completed successfully.
NAME     TYPE                 STATE      ERRORS  INTENT
test-vm  compute.v1.instance  COMPLETED  []
```

実行結果から先ほどまでは`IN_PREVIEW`だったが、`COMPLETED`に変わっていることがわかります。

また、以下のブラウザからもプレビューからデプロイに変わっていることがわかります。

実際に、GCE コンソールに遷移すると作成されていることが確認できます。

<img src="/images/2020/20200219/photo_20200219_02.png" loading="lazy">

その他のコマンドを紹介したいと思います。
[list](https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/list)コマンドでデプロイの一覧を表示できます。

```bash
$ gcloud deployment-manager deployments list
NAME  LAST_OPERATION_TYPE  STATUS  DESCRIPTION  MANIFEST  ERRORS
test  preview              DONE                           []
```

[describe](https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/describe)コマンドでデプロイの詳細情報を確認できます。

```bash
$ gcloud deployment-manager deployments describe test
---
fingerprint: xxx==
id: 'xxx'
insertTime: 'xxx'
manifest: manifest-xxx
name: test
operation:
  endTime: 'xxx'
  name: xxx
  operationType: update
  progress: 100
  startTime: 'xxx'
  status: DONE
  user: xxx
NAME     TYPE                 STATE      INT
test-vm  compute.v1.instance  COMPLETED
```

もし、デプロイを削除したい場合は、[delete](https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/delete)コマンドを使用します。
`Do you want to continue (y/N)?`は、`y`と入力します。

```bash
$ gcloud deployment-manager deployments delete test
The following deployments will be deleted:
- test

Do you want to continue (y/N)?  y

Waiting for delete [xxx]...done.
Delete operation xxx completed successfully.
```

これでGCE の作成から削除までの一連の操作を行いました。

## 複数のVM インスタンスを作成

先ほど作成した定義ファイルを複製するかたちで作成します。
ファイル名は、`vms.yaml`とします。

```yaml vms.yaml
resources:
- type: compute.v1.instance
  name: test-vm-01
  properties:
    zone: asia-northeast1-a
    machineType: https://www.googleapis.com/compute/v1/projects/[MY_PROJECT]/zones/asia-northeast1-a/machineTypes/f1-micro
    disks:
    - deviceName: boot
      type: PERSISTENT
      boot: true
      autoDelete: true
      initializeParams:
        sourceImage: https://www.googleapis.com/compute/v1/projects/debian-cloud/global/images/family/debian-9
    networkInterfaces:
    - network: https://www.googleapis.com/compute/v1/projects/[MY_PROJECT]/global/networks/default
      accessConfigs:
      - name: External NAT
        type: ONE_TO_ONE_NAT
- type: compute.v1.instance
  name: test-vm-02
  properties:
    zone: asia-northeast1-a
    machineType: https://www.googleapis.com/compute/v1/projects/[MY_PROJECT]/zones/asia-northeast1-a/machineTypes/f1-micro
    disks:
    - deviceName: boot
      type: PERSISTENT
      boot: true
      autoDelete: true
      initializeParams:
        sourceImage: https://www.googleapis.com/compute/v1/projects/debian-cloud/global/images/family/debian-9
    networkInterfaces:
    - network: https://www.googleapis.com/compute/v1/projects/[MY_PROJECT]/global/networks/default
      accessConfigs:
      - name: External NAT
        type: ONE_TO_ONE_NAT
```

`name`を01と02に分けるかたちでVM を2台分の定義を記述し、デプロイします。

```bash
$ gcloud deployment-manager deployments create test-vms --config vms.yaml
The fingerprint of the deployment is xxx==
Waiting for create [xxx]...done.
Create operation xxx completed successfully.
NAME        TYPE                 STATE      ERRORS  INTENT
test-vm-01  compute.v1.instance  COMPLETED  []
test-vm-02  compute.v1.instance  COMPLETED  []
```

デプロイ後、ブラウザでも2台作成されていることがわかります。

<img src="/images/2020/20200219/photo_20200219_03.png" loading="lazy">

このようにYAML で定義ファイルを書いて作成できることがわかりました。
しかし、このような書き方では冗長さを感じてしまいますね。
次は、再利用性を高めるためのテンプレートを紹介します。

## テンプレートを利用する

テンプレートを利用するとリソースを定義したファイルを独立させて再利用性を高めることができます。テンプレートを作成するには、<font color="DeepSkyBlue">Python</font>や<font color="DeepSkyBlue">Jinja2</font>を使用できます。Pythonを使用する場合は、Python 3.x で作成する必要があります（公式ドキュメントの日本語サイトだとPython 2.7 と記載がありますが、英語サイトだとPython 3.x と記載があるので注意）

### テンプレートの作成

今回もGCE 2台作成し、合わせてファイアウォールの設定なども行いたいと思います。
以下のファイルを準備します。

```bash
.
├── firewall_template.py
├── gce_template.py
├── network_template.py
├── vm_template.py
└── vms.yaml
```

### 環境変数とプロパティについて

テンプレートのプロパティは、任意の変数を表します。
例えば以下のように変数を指定できます。

```python
context.properties['zone'],
```

また、デプロイメント固有の環境変数を指定することもできます。
環境変数の呼び出し方は、以下の構文を使用することでプロジェクトID を取得します。
詳細な環境変数については、[こちら](https://cloud.google.com/deployment-manager/docs/configuration/templates/use-environment-variables?hl=ja)を参考にしてください。

```python
ontext.env['project']
```

VM インスタンスを定義します。

```python vm_template.py
COMPUTE_URL_BASE = 'https://www.googleapis.com/compute/v1/'

def GenerateConfig(context):
  resources = [{
      'name': context.env['name'],
      'type': 'compute.v1.instance',
      'properties': {
          'zone': context.properties['zone'],
          'machineType': ''.join([COMPUTE_URL_BASE, 'projects/',
                                  context.env['project'], '/zones/',
                                  context.properties['zone'], '/machineTypes/',
                                  context.properties['machineType']]),
          'disks': [{
              'deviceName': 'boot',
              'type': 'PERSISTENT',
              'boot': True,
              'autoDelete': True,
              'initializeParams': {
                  'sourceImage': ''.join([COMPUTE_URL_BASE, 'projects/',
                                          'debian-cloud/global/',
                                          'images/family/debian-9'])
              }
          }],
          'networkInterfaces': [{
              'network': '$(ref.' + context.properties['network']
                         + '.selfLink)',
              'accessConfigs': [{
                  'name': 'External NAT',
                  'type': 'ONE_TO_ONE_NAT'
              }]
          }]
      }
  }]
  return {'resources': resources}
```

ネットワークを定義します。

```python:network_template.py
def GenerateConfig(context):
  resources = [{
      'name': context.env['name'],
      'type': 'compute.v1.network',
      'properties': {
          'routingConfig': {
              'routingMode': 'REGIONAL'
          },
          'autoCreateSubnetworks': True
      }
  }]
  return {'resources': resources}
```

ファイアウォールを定義します。

```python:firewall_template.py
def GenerateConfig(context):
  resources = [{
      'name': context.env['name'],
      'type': 'compute.v1.firewall',
      'properties': {
          'network': '$(ref.' + context.properties['network'] + '.selfLink)',
          'sourceRanges': ['0.0.0.0/0'],
          'allowed': [{
              'IPProtocol': 'TCP',
              'ports': [80]
          }]
      }
  }]
  return {'resources': resources}
```

ここで上記のテンプレートに指定する変数の定義を作成します。

```python gce_template.py
NETWORK_NAME = 'test-network'

def GenerateConfig(unused_context):
  resources = [{
      'name': 'test-vm-01',
      'type': 'vm_template.py',
      'properties': {
          'machineType': 'f1-micro',
          'zone': 'asia-northeast1-a',
          'network': NETWORK_NAME
      }
  }, {
      'name': 'test-vm-02',
      'type': 'vm_template.py',
      'properties': {
          'machineType': 'g1-small',
          'zone': 'asia-northeast1-a',
          'network': NETWORK_NAME
      }
  }, {
      'name': NETWORK_NAME,
      'type': 'network_template.py'
  }, {
      'name': NETWORK_NAME + '-firewall',
      'type': 'firewall_template.py',
      'properties': {
          'network': NETWORK_NAME
      }
  }]
  return {'resources': resources}
```

最後にテンプレートをインポートするための定義ファイルを作成します。

```yaml:vms.yaml
imports:
- path: vm_template.py
- path: network_template.py
- path: firewall_template.py
- path: gce_template.py

resources:
- name: gce-setup
  type: gce_template.py
```

### デプロイ

実行方法は、今まで変わらず`gcloud` コマンドから実行します。

```bash
$ gcloud deployment-manager deployments create test-templates --config vms.yaml
The fingerprint of the deployment is xxx==
Waiting for update [xxxx]...done.
Update operation xxx completed successfully.
NAME                   TYPE                 STATE      ERRORS  INTENT
test-network           compute.v1.network   COMPLETED  []
test-network-firewall  compute.v1.firewall  COMPLETED  []
test-vm-01             compute.v1.instance  COMPLETED  []
test-vm-02             compute.v1.instance  COMPLETED  []
```

ブラウザ上でもデプロイされていることが確認できます。

<img src="/images/2020/20200219/photo_20200219_04.png" loading="lazy">

## エラーメモ

gcloud コマンドからデプロイした際に何かしらのエラーが発生したとします。コード修正後に以下のように再度<font color="LightCoral">"create"</font>を実行すると<font color="LightCoral">"already exists and cannot be created"</font>というエラーが発生します。

原因は、失敗したとしても中途半端にデプロイは作られてしまうため、既にあるといったエラーが発生します。

```bash
$ gcloud deployment-manager deployments create test-templates --config vms.yaml
ERROR: (gcloud.deployment-manager.deployments.create) ResponseError: code=409, message='projects/xxx/global/deployments/test-templates' already exists and cannot be created.
```

それでは、どのように解消するかというと以下のように<font color="LightCoral">"update"</font>を使用します。

```bash
gcloud deployment-manager deployments update test-templates --config vms.yaml
```

この中途半端に作成されるのは解消されて欲しいですね。。

## 感想

GCP リソースをPython で操れることで、自由度の高いテンプレートを作成できる点は面白いと思いました。
また、Terraform は、tfstate というファイルをGCS やS3 に保存する必要があるので、アクセス権限や同時実行などを気にする必要がありますが、CloudFormation 同様に状態管理は、GCP 側でよしなにやってもらえるのもメリットだと感じました。

ただ、Google 自体は[Terraformer](https://github.com/GoogleCloudPlatform/terraformer)などのツールを作成していることから割とTerraform 推しなのでは？ と感じるところもあります（個人的見解）

そのため、個人的には、GCP だけでなくAWS や、最近ではAlibaba Cloud などのクラウドを利用する機会が多いので、Terraform 一択になってしまうのが本音です。とはいえ、今回のように触れたことのないサービスを使ってみるのも新たな知見として楽しめるので、今後もいろいろ触れていきたいと思います。

この記事に類似するオススメする記事です。よければ合わせてチェックください。

* [Terraformのベストなプラクティスってなんだろうか](/articles/20190903/)
* [Let's Try GCP #1 ～Cloud Run Buttonを使った楽々コンテナデプロイをやってみた～](/articles/20190909/)

## 参考

[Google Cloud Deployment Manager documentation](https://cloud.google.com/deployment-manager/docs?hl=en)
[gcloud deployment-manager](https://cloud.google.com/sdk/gcloud/reference/deployment-manager)
[deploymentmanager-samples](https://github.com/GoogleCloudPlatform/deploymentmanager-samples)
[環境変数](https://cloud.google.com/deployment-manager/docs/configuration/templates/use-environment-variables?hl=ja)
[サポートしているリソースタイプ](https://cloud.google.com/deployment-manager/docs/configuration/supported-resource-types?hl=en)
