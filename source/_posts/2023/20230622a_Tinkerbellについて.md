---
title: "Tinkerbellについて"
date: 2023/06/22 00:00:00
postid: a
tag:
  - CNCF
  - Tinkerbell
  - オンプレミス
  - Linux
category:
  - Infrastructure
thumbnail: /images/20230622a/thumbnail.png
author: 原木翔
lede: "CNCFのホスト対象にCloudサービスに関係するプロジェクトは多いですが、全てではありません。オンプレミス環境に関するプロダクトも数多く存在します。今回はそんなオンプレミス環境向けのCNCF sandboxプロジェクトの1つ、Tinkerbellを紹介します。"
---

[CNCF連載](/articles/20230619a/)の3本目の記事です。

## CNCF x オンプレ環境

こんにちは、TIGの原木です。

CNCFのホスト対象にCloudサービスに関係するプロジェクトは多いですが、全てではありません。オンプレミス環境(サーバーやネットワーク機器を自社で保有し、運用するシステム環境)に関するプロダクトも数多く存在します。

今回はそんなオンプレミス環境向けのCNCF sandboxプロジェクトの1つ、[Tinkerbell](https://www.cncf.io/projects/tinkerbell/)を紹介します。

## Tinkerbellとは?

Tinkerbellは、Equnix Metalのチームにより開発されている、オープンソースのベアメタルプロビジョニングエンジンです。[^1][^2][^9] 平たく言うと、サーバーのOSインストールを助けてくれるソフトウェアです。

開発元であるEquinix社はデータセンターやIX(インターネットエクスチェンジ)の運営で著名な企業ですが、Equnix Metalというレンタルサーバー事業も行っています。

Equnix Metalの特徴として、長期契約が一般的なレンタルサーバー事業と異なりサーバーの貸出は1時間から行うことができます。また、画面操作でだいたい数分で調達できます。この手軽さから、かつてはBare-Metal-as-a-Service(BMaaS)とウェブサイトで自称していました。

その裏側を支えているソフトウェアをOSS化したものが、Tinkerbellです。

## なぜTinkerbellはCNCFのsandboxプロジェクトなのか？

TinkerbellはサーバーのOSインストールを手助けしてくれるツールだと冒頭で述べました。  

技術的に一言で言うなら、ネットワークブートのソフトウェアです。iPXE Boot(アイピクシー ブート)で`initramfs`コマンドを送信してLinuxKit OSをターゲットマシンのメモリから起動し、その上でサーバーの各種プロビジョニングを行っています。

AWSを普段扱ってる人には正直馴染みがなさそうな...そんなツールがなぜ"クラウドネイティブ"[^3]だと評価され、sandboxプロジェクトに登録されているのでしょうか？

その理由について大きく2つ挙げてみました。

1. 明示的なプロビジョニング設定及び自動化
2. Kubernetes構築という応用

それぞれの要素について掘り下げながら、Tinkerbellについて解説します。

### 明示的なプロビジョニング設定及び自動化～Tinkerbellの仕組み～

<img src="/images/20230622a/構成図.png" alt="" width="743" height="477" loading="lazy">

出典: [Tinkerbell Docs - Architecture](https://docs.tinkerbell.org/architecture/)

Tinkerbellを知るためにドキュメントからアーキテクチャ図を引用しました。

Tinkerbellを使ってターゲットとなるサーバーに対してプロビジョニングを行うには、まず左上にあるように3つの基本的なリソース `hardware`、`template`、`workflow`を用意する必要があります。

[実際に使用したリソース](https://gist.github.com/hodagi/9e372a603034d771d6c035c897f8ab52)の一部を引用、解説します。

* `hardware` はハードウェアやネットワークデバイスに関する詳細情報を登録します

```yaml
apiVersion: "tinkerbell.org/v1alpha1"
kind: Hardware
metadata:
  name: nuc-demo
  namespace: tink-system
spec:
  disks:
    # ターゲットサーバーのストレージの種類に合わせてデバイスファイルのパスを変更します
    - device: /dev/nvme0n1
  metadata:
    (略)
  interfaces:
    - dhcp: # Tinkerbell Stack内のDHCPが応答する設定です
        arch: x86_64
        hostname: nuc-demo
        ip:
　　　　　 # ターゲットサーバーに払い出したいIPアドレスを設定します
          address: 192.168.1.8
          gateway: 192.168.1.1
          netmask: 255.255.255.0
        lease_time: 86400
        # このMACアドレスを識別して、TinkerbellのDHCPサーバーは応答します
        mac: 1c:69:7a:11:22:33
        name_servers:
          - 1.1.1.1
          - 8.8.8.8
        uefi: true
      netboot:
        allowPXE: true
        allowWorkflow: true
```

* `template` はワークフローのタスクの内容を記載します

```yaml
apiVersion: "tinkerbell.org/v1alpha1"
kind: Template
metadata:
  name: ubuntu-focal-nvme
  namespace: tink-system
spec:
  data: |
    version: "0.1"
    name: ubuntu-focal-nvme
    global_timeout: 9800
    tasks:
      - name: "os-installation"
        worker: "{{.device_1}}"
        volumes:
          - /dev:/dev
          - /dev/console:/dev/console
          - /lib/firmware:/lib/firmware:ro
        actions:
　　　　　 # image2diskで、TinkerbellStackからDLしたqemu-img(qcow2)をストレージに焼きこみます
          # 昔のテンプレートファイルだとここの処理はべたにストレージをワイプして書き込んでました
          - name: "stream-ubuntu-image"
            image: quay.io/tinkerbell-actions/image2disk:v1.0.0
            (以下略)
          # 以下、プロビジョニングのタスクとコンテナイメージのタスクが並びます
          - name: "grow-partition"
            image: quay.io/tinkerbell-actions/cexec:v1.0.0
          - name: "install-openssl"
            image: quay.io/tinkerbell-actions/cexec:v1.0.0
          - name: "create-user"
            image: quay.io/tinkerbell-actions/cexec:v1.0.0
          - name: "enable-ssh"
            image: quay.io/tinkerbell-actions/cexec:v1.0.0
          - name: "disable-apparmor"
            image: quay.io/tinkerbell-actions/cexec:v1.0.0
          - name: "write-netplan"
            image: quay.io/tinkerbell-actions/writefile:v1.0.0
```

* `workflow` はtemplateファイルとhardwareファイルを紐づけて実際に実行する役割を果たします

```yaml
apiVersion: "tinkerbell.org/v1alpha1"
kind: Workflow
metadata:
  name: demo-wf
  namespace: tink-system
spec:
  templateRef: ubuntu-focal-nvme
  hardwareRef: hp-demo
  hardwareMap:
    device_1: 1c:69:7a:11:22:33
```

これら3つのファイルのうち、最も着目してほしいのが `template.yaml` です。

yaml形式で、プロビジョニングで実行したいタスクがコンテナイメージとセットで並んでいますが、この形式について、CI/CDのビルドパイプラインをメンテナンスしたことがある方なら見覚えがあるのではないでしょうか？

現代の継続的インテグレーション（CI）ツール、例えばGithub ActionsやGoogle Cloud Build Runは、ビルドタスクを全てコンテナ化することで作業の流れを管理します。これらのツールは、yaml形式の設定ファイルを使ってビルドパイプラインを定義します。このビルドパイプラインはソースコードをダウンロードし、ビルドし、成果物管理サービスにデプロイする一連のタスクを含みます。

この設定ファイルをCIツールにアップロードすることで、ビルドタスク（今ではコンテナ）を柔軟に管理・操作できるようになりました。これは、コードの修正や新しい機能の追加に伴ってビルドの要件が変わる場合でも、ツールの設定を更新することで簡単に対応できることを意味します。

**Tinkerbellのワークフローも、これとまったく同じことを実行します。**

具体的には、iPXE Bootにより、まず[Hook](https://github.com/tinkerbell/hook)と呼ばれる[LinuxKit](https://github.com/linuxkit/linuxkit)[^4]をベースにしたプロビジョニング用のOSが`initramfs` によりメモリ上で起動します。

<img src="/images/20230622a/このタイミングがちょうど良さそう.jpg" alt="このタイミングがちょうど良さそう.jpg" width="827" height="299" loading="lazy">

※Hookが起動した様子。当初、このクジラを見てPXE Bootがうまくいったと喜んでいたら、実はストレージパスの設定ミスでフリーズしてたのはいい思い出

このHookは、起動すると `tink-worker` というワークフローエンジンを自動的に立ち上げます。`tink-worker` ワークフローエンジンは Tinkerbell Stackと呼ばれる本体側の `tink-server` からワークフローをダウンロードします。 

`tink-worker` はワークフローに基づいてターゲットサーバー内でコンテナイメージを起動し、必要なタスクを実行していきます。最後にリブートすると、プロビジョニングは完了します。

<img src="/images/20230622a/U32s0wH3KSJCmPM1686998196_1686998464_(1).png" alt="U32s0wH3KSJCmPM1686998196_1686998464_(1).png" width="574" height="401" loading="lazy">

※tink-worker内で `podman` の `hello-world` コンテナを起動した様子。 ~~ダグトリオ~~ アザラシがお迎えしてくれました。

Tinkerbellを動かしたときに、ターゲットマシンで何が起きているのか、簡単に説明しました。

`template`、`hardware`、 `workflow` による明示的な設定ファイルをTinkerbell Stackにデプロイするとサクッとプロビジョニングが終わっている様は、体感してみると素晴らしいものです。また `template`を入れ替えることでプロビジョニングの手順を簡単に入れ替えることができます。

この手軽さはまさにクラウドネイティブっぽいと言えるのではないでしょうか。

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

自分は、このiPXE Boot->Hook(LinuxKit)起動->本体OS起動の二段階の仕組みを見て、BIOSの古き良き多段ブートを連想しました。かつてはハードウェアの制約によるものでしたが、現代では多環境への適応性やプロビジョニング方法を簡単に組み替えられる柔軟性という要件のために採用されたというわけです。
ここで、必要なスペックについて気になる方もいらっしゃるかもしれませんが、第七世代という結構古いIntel NUCでも問題なく動きました。軽く調べた限りでは[ラズパイでk8sクラスタを構築するためにTinkerbellを利用していた事例](https://github.com/ContainerSolutions/tinkerbell-rpi4-workflow)もあったので、一般のご家庭のPCでも特に問題はなさそうです。
</div>

### Kubernetes構築という応用

Tinkerbellはベアメタルサーバー向けのプロビジョニングツールとして開発されましたが、その発展形としてKubernetesとの連携が進んでいます。

具体的には[Cluster API Provider Tinkerbell](https://github.com/tinkerbell/cluster-api-provider-tinkerbell)というプロジェクトが進行しつつあります。

このプロジェクトの説明の前にCluster APIについて触れましょう。ClusterAPIは1つの管理用Kubernetesから別の環境にあるKubernetesクラスターの作成、更新、削除を自動的に行えるようにする目的で、開発されました。

イメージに起こすと次のような感じです。Kubernetesの特色を生かしながら、環境構築&管理を容易にしようというわけです。

<img src="/images/20230622a/cluster-apiのイメージ.png" alt="cluster-apiのイメージ.png" width="1146" height="655" loading="lazy">

本題に戻ると、このプロジェクトのベアメタルサーバー向けに開発が進められているのが、Cluster API Provider Tinkerbell というわけです。すなわち、Tinkerbellでベアメタルサーバーのプロビジョニングを行いつつ、(今回はあまり触れませんでしたが)Tinkerbellの中にあるHegelと呼ばれるメタ・サーバーからcloud-initを配布することでその上でKubernetesも構築してしまおうという試みです。

Kubernetesの構築はKubeadmやKubesprayにより容易になったとはいえ、その構築作業が宣言的かと言われるとVMのような抽象レイヤーを挟まない限り、素のベアメタルサーバーでは微妙なところがありました。その問題を解決しようとしているのがCluster API Provider Tinkerbellというわけです。

最後に、このプロジェクトの採用事例を説明します。

Appleの開発者が[講演](https://youtu.be/MtocKi97hsc)を行っており、Tinkerbell+Kubernetes+GitOpsにより、gitリポジトリにコミットするだけでk8s clusterのプロビジョニングが完了する様子について実演しています。

また、このproviderを使用しているかは不明ですが、AWSの[EKS Anywhere on Bare Metal](https://anywhere.eks.amazonaws.com/docs/getting-started/baremetal/overview/)でもこのTinkerbellを使用していると記載があります。

## Tinkerbellを実際に動かしてみた

最後に、Tinkerbellを実際に動かしてみたくなった方への案内です。Tinkerbellのメンテナーである@jacobweinstockさんがHPのPCにTinkerbellを使ってUbuntuを動かす[デモ手順](https://gist.github.com/jacobweinstock/e13cea2edbb83833d8fc7e3226af2a3c)を公開しています。それをフォークして[日本語でも手順をまとめてみました](https://gist.github.com/hodagi/9e372a603034d771d6c035c897f8ab52)。設定情報など初見で戸惑うところがあると思うので、一助になれば幸いです。

## まとめ

以上、Tinkerbellに関する紹介でした。[^8]

ベアメタルサーバーに対して1からキッティングする機会って今どき中々ないと思うので、家庭に眠ってた古いPCがあればぜひ試してみてください。

[^1]: Tinkerbell is an open-source, bare metal provisioning engine, built by the team at Equinix Metal. 参照: https://docs.tinkerbell.org/ 

[^2]: 元々はPacketというニューヨークのスタートアップ企業であるベアメタルクラウド・プロバイダーが開発していましたが、Equnixが2020年に買収し、OSSとして公開しました。参照: https://techcrunch.com/2020/01/14/equinix-is-acquiring-bare-metal-cloud-provider-packet/

[^9]: Tinkerbellという名前は、PXE Boot→ピクシー→妖精から来ています。

[^3]: CNCFの団体名(Cloud Native Computing Foundation)でもあるクラウドネイティブってそもそも何でしょうか。改めて[本家の定義](https://github.com/cncf/toc/blob/main/DEFINITION.md#%E6%97%A5%E6%9C%AC%E8%AA%9E%E7%89%88)をベースに、ChatGPT先生にわかりやすくまとめてもらいました。<br/>1. **環境適応力**: パブリッククラウド、プライベートクラウド、ハイブリッドクラウドなどの近代的でダイナミックな環境に対応する能力<br/>2. **スケーラビリティ**: スケーラブルなアプリケーションを構築および実行するための能力を組織に提供できること<br/>3. **技術スタック**: 代表的なアプローチとして、コンテナ、サービスメッシュ、マイクロサービス、イミュータブルインフラストラクチャ、および宣言型APIのような要素技術が使われていること<br/>4. **疎結合システム**: これらの手法により、回復性、管理力、および可観測性のある疎結合システムが実現する<br/>5 **自動化と頻繁な変更**: 堅牢な自動化と組み合わせることで、エンジニアはインパクトのある変更を最小限の労力で頻繁に行うことが可能になる​こと

[^4]: LinuxKitはmoby社(Docker)が開発したコンテナランタイム用のLinuxディストリビューションです。開発コンセプトでもある、コンテナランタイム専用のイミュータブル&軽量Linuxディストリビューションっていう意味では旧Container Linux/現CoreOSと非常に良く似ていますね。

[^8]: まとめきれなかった所感をこちらに。<br/>**構築の簡単な点、難しい点**: TinkerbellはPXE Bootを行うため、Bootsと呼ばれるコンポーネントがDHCPサーバーの役割を担っているのですが、MACアドレスでフィルタリングしております。接続できなくなったらその時さ、と思いつつ、家庭用LAN上でそのまま実証していたんですが、一時的に同一ネットワーク内にDHCPサーバーが二台あるような状態でも特に問題ありませんでした。VLANが必要な状況下だとベアメタルサーバーのキッティングは正直混乱するのでケアが不要で良かったです。<br/>一方でTinkerbell Stack自体の構築はわりと難航しました。当初はベアメタルサーバー(Ubuntu)上に構築したk3sの上でTinkerbell Stackを動かすつもりでしたが、 `kubectl get svc -n tink-system` でいつまでも払い出されないIPアドレスに色々諦めて、Tinkerbellの中の人が実践していたk3dを使って構築しました。TinkerbellのデフォルトのCNIとしてkube-vipを利用しているのですが、その特色について理解を深めたらまた素のk3sへのTinkerbell構築に再チャレンジしたいところです。<br/>また、デフォルトのライティングツールはqcow2形式のイメージファイルを使用します。Ubuntuのように最初からqcow2形式でわかりやすく公開されているディストリビューションもありますが、そうではない場合、qemu-imgツールによる変換作業というひと手間が必要そうです。qcow2は恥ずかしながら初めて扱う形式だったので若干戸惑いました。<br/>**templateとcloud-init/Ignitionの棲み分け**: Tinkerbellのテンプレートファイルは自由度が高く、GitHub ActionsのSelfHostedRunnerを動かすこともできたりします。ですが、プロビジョニングツールとしては既にcloud-init(CoreOSだとIgnition)というツールが普及しております。TinkerbellでもHegelと呼ばれるメタデータサーバーというツールを通じて、tink-workerで起動中にファイルを取得、動かす機能が予め備わっています。[参考: Cluster API Provider Tinkerbellの該当処理。](https://github.com/tinkerbell/cluster-api-provider-tinkerbell/blob/e5dcf1b2ba7038bf1d3afe9b4b6e33e5507c6cbf/internal/templates/templates.go#L102)実運用の際は、Tinkerbellでいろいろできるけどcloud-initに寄せるんだろうなって思いました。

