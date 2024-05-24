---
title: "Raspberry Piをかき集めてKubernetesを体感する"
date: 2022/09/08 00:00:00
postid: a
tag:
  - Kubernetes
  - RaspberryPi
category:
  - Infrastructure
thumbnail: /images/20220908a/thumbnail.png
author: 岸下優介
lede: "業務でGKE（Google Kubernetes Engine）を利用することがあるのですが、Kubernetesの挙動や仕組みなど如何せん理解が難しいです。そこで今回は、自分の手でイチからKubernetesを構築することで勉強しようと思ったのが本記事のモチベーションです。ちょうど自宅にRaspberry Piが3台あったのでRaspberry Piでクラスタを構築していこうと思います。基本的には以下の記事を参考に設定を行っていき、自分の理解を深めるために解説を挟みながら書いていこうと思います。"
---

[夏の自由研究ブログ連載2022](/articles/20220822a/) の10本目です。

# はじめに

TIG 岸下です。業務でGKE（Google Kubernetes Engine）を利用することがあるのですが、Kubernetesの挙動や仕組みなど如何せん理解が難しいです。

そこで今回は、自分の手でイチからKubernetesを構築することで勉強しようと思ったのが本記事のモチベーションです。

ちょうど自宅にRaspberry Piが3台あったのでRaspberry Piでクラスタを構築していこうと思います。基本的には以下の記事を参考に設定を行っていき、自分の理解を深めるために解説を挟みながら書いていこうと思います。

参考：[RaspberryPi 4 にUbuntu20.04 をインストールして、Kubernetes を構築してコンテナを動かす](https://qiita.com/yasthon/items/c29d0b9ce34d66eab3ec)


# 今回Kubernetes構築するにあたって用意したもの

- Raspberry Pi3 Model B（メモリ1GB）
- Raspberry Pi4 Model B（メモリ4GB）
- Raspberry Pi4 Model B（メモリ8GB）
- SDカード（64GB）x 3
- 5ポートスイッチングハブ（BUFFALO LSW6-GT-5EPL/NBK）
- LANケーブル x 4（CATはバラバラ）
- キーボード
- マウス

各種Raspberry Piの電源はコンセントから取っています。

# ラズパイの設定

- 3台共通のものと、3台それぞれで設定する内容があるので注意して下さい。

## OS

- OS: Ubuntu 20.04LTS（3台共通）

[Raspberry Pi Imager](https://www.raspberrypi.com/software/)を使うと簡単にSDカードへOSを焼くことが出来ます。
SDカード3枚全てにUbuntu 20.04LTSを焼きます。

## Kubernetesのバージョン

- v1.25.0

## 初期設定（3台共通）

ラズパイにOSをインストールしたSDカードを差し込み、パッケージを最新版にしておきます。

```bash terminal
sudo apt update
sudo apt upgrade -y
```

## ネットワーク周り

### 物理的な構成図

<img src="/images/20220908a/Screenshot_from_2022-09-04_20-54-30.png" alt="Screenshot_from_2022-09-04_20-54-30.png" width="1200" height="732" loading="lazy">

<img src="/images/20220908a/image.png" alt="image.png" width="939" height="730" loading="lazy">

**※Desktop PCはラズパイ達とSSHするために繋いでいます。Kubernetesの構成には必要ありません。**

|  ラズパイ  |  役割  |   IPアドレス  |
| ---- | ---- | ---- |
|  ラズパイ4B（8GB）   |  マスター  |  192.168.1.101 |
|  ラズパイ4B（4GB）  |  ワーカー①  |  192.168.1.102  |
|  ラズパイ3B  |  ワーカー②  |  192.168.1.103  |

で構成しております。

### ネットワークの設定（ラズパイ3台それぞれで）

上記のIPアドレスを各ラズパイに割り振って固定化します。
以下のファイルを作成します。

```bash terminal
sudo vi /etc/netplan/99-network.yaml
```

```yaml 99-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      dhcp6: false
      addresses:
        - 192.168.1.101/24 # ラズパイ毎でIPを変更してください。（末尾がそれぞれ101, 102, 103になります。）
      gateway4: 192.168.1.1 # 自宅のルーターからゲートウェイを調べて下さい。ここを間違えるとラズパイはネットに繋がらなくなります…
      nameservers:
        addresses:
          - 192.168.1.1
```

作成したら、適用します。

```bash terminal
sudo netplan apply
ifconfig
# eth0の部分が所望のIPアドレスに変わっていることを確認。
# ifconfigが無ければ
# sudo apt install ifconfig
# でインストール
```

### SSHの設定（デスクトップPC）

IPアドレスの固定化が完了したので、ここからはSSHで操作を行うようにします。

**※SSHは利用しなくても設定することができますが、3台分のラズパイのディスプレイを切り替える作業のストレスが無くなります。**

#### VSCodeのRemote SSHを用意

デスクトップPCにてVSCodeをインストールして、「拡張機能」から[Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)をインストールしてください。

<img src="/images/20220908a/Screenshot_from_2022-09-03_15-19-08.png" alt="Screenshot_from_2022-09-03_15-19-08.png" width="1200" height="233" loading="lazy">

#### SSH構成ファイルを用意

VSCodeウィンドウ左下の「＞＜」をクリックして、「SSH構成ファイルを開く」から`config`を開いて以下のように設定して保存します。

```config config
Host rpi4_8
    HostName 192.168.1.101
    User ubuntu

Host rpi4_4
    HostName 192.168.1.102
    User ubuntu

Host rpi3
    HostName 192.168.1.103
    User ubuntu
```

- Host名も好きに変更して頂いて構いません。
- IPアドレスは自宅の環境に合わせて適宜変更して下さい。
- User名を変更している場合も適宜変更して下さい。

#### 各ラズパイに接続する

VSCodeウィンドウ左下の「＞＜」をクリックして、「ホストに接続する」からホスト名を選んで接続します。
初回は接続キーの登録が行われるため、キーが表示されたら「続行」を押し、あとはログイン用のパスワードを入力すると接続できます。
複数台同時に接続できるので、3画面分用意しておけばデスクトップPC側からラズパイの操作が可能となります。

### ホスト名の変更（ラズパイ3台それぞれ）

ここからはまたラズパイの操作となります。
以下のホスト名を割り振っていきましょう。

|  ラズパイ  |  役割  |   ホスト名  |
| ---- | ---- | ---- |
|  ラズパイ4B（8GB）   |  マスター  |  mas01.example.com |
|  ラズパイ4B（4GB）  |  ワーカー①  |  work01.example.com  |
|  ラズパイ3B  |  ワーカー②  |  work02.example.com  |

```sh terminal
sudo hostnamectl set-hostname mas.example.com # 各々のラズパイでhostnameは変える
hostname # 変更の確認作業
```

### /etc/hostsの設定（ラズパイ3台共通）


ホスト名とIPアドレスを対応させるために、`etc/hosts`に以下の内容を追記します。

```sh terminal
sudo vi /etc/hosts
```

```conf hosts
# ...

192.168.1.101 mas01 mas01.example.com
192.168.1.102 work01 work01.example.com
192.168.1.103 work02 work02.example.com

# ...
```

これによって、ネットワークの名前解決ができるようになります。

#### 余談

以下はKubernetesの設定とは関係のない話なので余談ですが、ターミナル上で

```sh terminal
ssh work01.example.com
```

と打てば、`192.168.1.102`に接続することができます。
これはDNS（Domain Name Service）でも同じことが行われています。
DNSについては、ぜひTIG西田さんの[NW入門](https://future-architect.github.io/articles/20200604/)を読んでみてください。ハンズオン形式でわかりやすいと思います。

### IPv6の停止（ラズパイ3台共通）

IPv6は今回利用しないので停止します。
`sysctl.conf`をvimで開きます。

```sh terminal
sudo vi /etc/sysctl.conf
```

下記設定を最後の方へ追記します。
設定を1にすることで停止となります。

```conf sysctl.conf
#...

net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.eth0.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
```

#### 余談

また余談ですが、最近はKubernetesでIPv4/IPv6デュアルスタックが利用できるそうです。
参考：[IPv4/IPv6デュアルスタック](https://kubernetes.io/ja/docs/concepts/services-networking/dual-stack/)

>IPv4/IPv6デュアルスタックを利用するとIPv4とIPv6のアドレスの両方をPod及びServiceに指定できるようになります。

なるほど、わからんという感じです。
IPv6自体はIPv4アドレスの枯渇問題を解決するためのプロトコルで、他にもIPv4に対する不満の多くを一挙に解消しようとしています（[マスタリングTCP/IP入門編](https://www.ohmsha.co.jp/book/9784274224478/) P.171）。
デュアルスタック機能によって、お互いは仕様の異なるプロトコルスタックですが共存させる仕組みで、やはりどちらのプロトコルも使えるのが美味しいポイントとなるのでしょうか。利用する機会があればまた調べて見ようと思います。

### timezone, keymapの変更（ラズパイ3台共通）

タイムゾーンを日本に、keymapを日本語にします。

```sh terminal
# タイムゾーンの変更
sudo timedatectl set-timezone Asia/Tokyo

# keymapの変更
sudo localectl set-keymap jp106
```

## Kubernetes周り

ここからKubernetes周りの設定を行っていきます。
基本はkubeadmの設定に沿っていきます。

参考：[kubeadmのインストール](https://kubernetes.io/ja/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)

### iptablesがnftablesバックエンドを使用しないようにする（ラズパイ3台共通）

> nftablesバックエンドは現在のkubeadmパッケージと互換性がありません。(ファイアウォールルールが重複し、kube-proxyを破壊するためです。)

だそうです。

```sh terminal
# レガシーバイナリをインストール
sudo apt-get install -y iptables arptables ebtables

# レガシーバージョンに切り替える
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy
sudo update-alternatives --set arptables /usr/sbin/arptables-legacy
sudo update-alternatives --set ebtables /usr/sbin/ebtables-legacy
```

参考：[kubernetes: iptablesがnftablesバックエンドを使用しないようにする](https://kubernetes.io/ja/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#iptables%E3%81%8Cnftables%E3%83%90%E3%83%83%E3%82%AF%E3%82%A8%E3%83%B3%E3%83%89%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%97%E3%81%AA%E3%81%84%E3%82%88%E3%81%86%E3%81%AB%E3%81%99%E3%82%8B)

### Dockerのインストール（ラズパイ3台共通）

参考：[Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

ターミナルにて以下のコマンドでインストールします。

```sh terminal
sudo apt-get -y install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=arm64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get -y install docker-ce docker-ce-cli containerd.io
# apt-mark holdで、バージョンを固定します。
sudo apt-mark hold docker-ce docker-ce-cli containerd.io
```

dockerをroot権限無しで実行するためにdockerグループへユーザーを割り当てます。

```sh terminal
sudo adduser ubuntu docker
cat /etc/group | grep docker
# 自分のユーザー名が追加されていることを確認
```

グループ割当を適用するために、一度ログオフ or 再起動をしましょう。
Dockerのバージョンを確認します。

```sh terminal
docker version
# Dockerのバージョンが表示されればOK
# グループ割当が適用されていないと、Warningが出る。
```

dockerの動作確認に`hello-world`コンテナを使います。

```sh
docker run hello-world
# Hello from Docker!と表示されればOK
```

### kubeadm、kubelet、kubectlのインストール（ラズパイ3台共通）

参考：[kubeadm、kubelet、kubectlのインストール](https://kubernetes.io/ja/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#kubeadm-kubelet-kubectl%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB)

以下のコマンドでインストールします。

```sh
sudo apt-get update && sudo apt-get install -y apt-transport-https curl
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
cat <<EOF | sudo tee /etc/apt/sources.list.d/kubernetes.list
deb https://apt.kubernetes.io/ kubernetes-xenial main
EOF
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

そもそもこのkubeadm、kubelet、kubectlは何に使われるのでしょうか？

#### kubeadm

参考：[Kubeadm](https://kubernetes.io/docs/reference/setup-tools/kubeadm/)

- Kubeadmは`kube init`や`kubeadm join`といったコマンドを提供するために作られたツールである。
- 最低限実行可能なKubernetesクラスタを立ち上げるために必要なアクションを実行する。
- Kubeadmの設計上、クラスタの立ち上げのみにフォーカスを当てており、マシンへのプロビジョニングまでは考えていない。
    - 同様に、Kubernetesダッシュボードのような種々の便利なアドオンをインストールしたり、モニタリング、クラウド固有のアドオンもスコープ外である。
- 理想的には全てのデプロイのベースとしてkubeadmを使うことで、適合するクラスタの作成が容易になる。

クラスタの立ち上げまではkubeadmが面倒見てくれて、残りのツールとか設定は各々よしなにやりましょうという感じでしょうか。

#### kubelet

参考：[kubelet](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)

kubeletを理解する前に、クラスターの全体像をまず理解する必要がありそうです。

<img src="/images/20220908a/9e8e89cf-751b-32cf-e060-c445acc0784c.png" alt="" width="1200" height="561" loading="lazy">

画像引用先： [Kubernetesのコンポーネント](https://kubernetes.io/ja/docs/concepts/overview/components/)

グレーの箇所はクラスターになり、先程紹介したKubeadmによって提供されます。

- Control Plane（マスターノード）に対してNode（ワーカーノード）がぶら下がる。
    - 今回で言えば、マスターノードであるラズパイ`master01`にワーカーノードである`worker01`、`worker02`がぶら下がる。
- マスターノードはワーカーノードとPodを管理する。
- ワーカーノードはアプリケーションのコンポーネントであるPodをホストする
- Podは1つ以上のコンテナのグループを持ち、Kubernetesにデプロイできる最小単位になる
    - 種々のアプリケーションはPodの中のコンテナ上で動作

で、kubeletですが図を見ると各ワーカーノードの中にkubeletが存在し、ワーカーノードの中で使われることがわかります。どこで使われるかがわかったところでkubeletの機能についてまとめていきます。

- kubeletは、各ノード上で実行される主要な”ノードエージェント”
    - ”エージェント”なので各ノードの中での仲介者で、Podの起動・管理を行う
- kubeletは、PodSpecの観点から動作する
    - PodSpecはPodに関する様々な情報（例えばコンテナの名前やimage）を載せたYAML or JSONファイル
    - PodSpec通りにコンテナが実行・動作されているかを確認することでPodを管理する

kubeletは各Pod内の管理・仲介者と考えておくとよさそうです。

#### kubectl

参考：[kubectlの概要](https://kubernetes.io/ja/docs/reference/kubectl/overview/)

kubectlはKubernetesクラスターを制御するためのコマンドラインインターフェース（CLI）です。ターミナルからKubernetesクラスターを制御するのに使われます。

### cgroupでmemoryの有効化（ラズパイ3台共通）

Kubernetesを利用する際に、cgroupのmemoryを有効化する必要があります。
はて、cgroupとは何なんでしょうか。

#### Kubernetes内でのcgroup

参考：[Linuxカーネルのコンテナ機能［2］ ─cgroupとは？（その1）](https://gihyo.jp/admin/serial/01/linux_containers/0003)
参考：[Kubernetes で cgroup がどう利用されているか](https://valinux.hatenablog.com/entry/20210114)

cgroupはControle Groupの略で、プロセスをグループ化して、そのグループ内に存在するプロセスに対して共通の管理を行うために使われます。例としては、ホストOSが持つCPUやメモリなどのリソースに対して、グループごとに制限をかけることができます。

kubeletの説明の中でPodSpecの話が出てきました。PodSpecのファイルではPod内のコンテナに関する情報を書くわけですが、この中でCPUやメモリの量も制限する（`resources`の`limits`）ことが可能です。正にここでcgroupが使われていて、ラズパイの計算リソースに対して、例えば計算リソースをそこまで必要としないPodに対しては制限をすることで、ラズパイのリソースを無駄に食い潰さないようにすることができます。

#### 有効化の設定

さて、cgroupのメモリーを有効化していきます。
以下のコマンドで確認すると、初期では無効化（末尾が0）されています。

```sh terminal
cat /proc/cgroups | grep memory
# 下記が表示される
memory  0       105     0
```

`boot/firmware/cmdline.txt`を開き、`cgroup_enable=cpuset cgroup_memory=1 cgroup_enable=memory`を追記します。

```sh terminal
sudo vi /boot/firmware/cmdline.txt
```

```txt /boot/firmware/cmdline.txt
elevator=deadline net.ifnames=0 console=serial0,115200 dwc_otg.lpm_enable=0 console=tty1 root=LABEL=writable rootfstype=ext4 rootwait fixrtc quiet splash cgroup_enable=cpuset cgroup_memory=1 cgroup_enable=memory
```

**※改行はありません。既に書かれている文の末尾にスペースを空けて追記する形となります。**

変更を適用するために再起動します。

```sh terminal
sudo reboot
# SSH接続が切れるので、ログインし直す
```

memoryが有効化されていることを確認します。

```sh terminal
cat /proc/cgroups | grep memory
# 下記が表示される
memory  7       107     1
```

# Kubernetesクラスターの作成

参考：[kubeadmを使用したクラスターの作成](https://kubernetes.io/ja/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)

## コントロールプレーンノードの初期化（マスターノードのラズパイのみ）

先程も出てきましたが、コントロールプレーンノード＝マスターノードです。
マスターノードにて操作を行っていきます。

```sh
sudo kubeadm init --apiserver-advertise-address=192.168.1.101 --pod-network-cidr=10.244.0.0/16
```

- `apiserver-advertise-address`
    - このオプションを利用して明示的にAPIサーバーのadvertise addressを設定します。
    - 明示的に指定しない場合はデフォルトゲートウェイに関連付けられたネットワークインターフェースを使用して設定されます。
- `pod-network-cidr`
    - Flannelを使用する場合、こちらを指定する必要があります。
    - Flannelはノード間をつなぐネットワークに仮想的なトンネルを構成することで、クラスター内のPod同士の通信を実現しています。
    - `/16`と広めに設定します（[GitHub - flannel-io/flannel](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md)）。

初期化後、`kubeadm join 192.168.1.101:6443 --token ...`という出力が出たら、どこかのテキストエディタにコピーしておきます。
このコマンドはワーカーノードを追加する際に利用します。

### もしinit時に`container runtime is not running`というエラーが出た場合

参考：[Kubeadm unknown service runtime.v1alpha2.RuntimeService #4581](https://github.com/containerd/containerd/issues/4581)

上記ページにエラーについて載っており、内容を読むと以下のように書いております。

> In the config.toml file installed by package containerd.io there is the line disabled_plugins = ["cri"] that am guessing creating the issue.

パッケージ`containerd.io`から`config.toml`をインストールした際に今回のエラーを引き起こす行があるようです（確証ではないみたい？）。
解決方法はマスターノードにて以下のコマンドを実行し、configファイルを削除します。
そして、`containerd`を再実行します。

```sh
# configファイルを削除
sudo rm /etc/containerd/config.toml
# containerdを再実行
systemctl restart containerd
```

## 環境変数と入力補完の設定（マスターノードのラズパイのみ）

kubectlをroot以外のユーザーでも実行できるようにするために、以下の設定を行っていきます。

```sh
# ホームディレクトリに.kubeディレクトリを作成
mkdir -p ~/.kube
# Kubernetesのadmin.confを.kubeディレクトリのconfigファイルへコピー
sudo cp -i /etc/kubernetes/admin.conf ~/.kube/config
# configファイルの所有者がrootになっているのでk8suserへ変更
sudo chown $(id -u):$(id -g) ~/.kube/config
# .bashrcへ環境変数の追加
echo 'KUBECONFIG=$HOME/.kube/config' >> ~/.bashrc
# コマンドの入力補完を設定
echo "source <(kubectl completion bash)" >> $HOME/.bashrc
# 変更を適用
source ~/.bashrc
```

## Flannelの設定（マスターノードのラズパイのみ）

先程もちょろっと説明しましたが、Flannelはノードを跨いでコンテナ同士が通信できるようにするPodネットワークアドオンになります。
コンテナにはIPアドレスが付与されるのですが、Internal IPなのでそのままだとノードを跨いでコンテナ間で通信することができません。これを解決するために、Flannelによってノード間をつなぐネットワークに仮想的なトンネル（オーバーレイネットワーク）を構成することで、Kubernetesクラスター内のPod同士の通信（Podネットワーク）を実現しています。


参考：[Kubernetes完全ガイド 3.3.3 Flannel](https://book.impress.co.jp/books/1119101148)

```sh
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
```

flannelが動作しているか確認します。

```sh
kubectl get pods -n kube-flannel
# 以下が出力される
NAME                    READY   STATUS    RESTARTS   AGE
kube-flannel-ds-qcspv   1/1     Running   0          23m
```

## ロードバランサーのインストール（マスターノードのラズパイのみ）

[こちら](https://qiita.com/yasthon/items/c29d0b9ce34d66eab3ec)を参考にして作っているので、同様にMetalLBをインストールします。
[MetalLB, bare metal load-balancer for Kubernetes ](https://metallb.universe.tf/installation/)を参考にインストールします。

```sh terminal
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.5/config/manifests/metallb-native.yaml
# ...

kubectl create secret generic -n metallb-system memberlist --from-literal=secretkey="$(openssl rand -base64 128)"
```

起動の確認を行います。

```sh terminal
kubectl get pod -n metallb-system
# 以下が表示される
NAME                          READY   STATUS    RESTARTS   AGE
controller-8689779bc5-txnbg   0/1     Pending   0          70s
speaker-vcg4j                 1/1     Running   0          70s
```

## ワーカーノードをクラスタにジョイン

先程、テキストエディタにコピーしておいたコマンドを実行します。
**※`sudo`忘れに注意**

```sh terminal
sudo kubeadm join 192.168.1.101:6443 --token y2grpy.nbvcyr1em9o5aigj　--discovery-token-ca-cert-hash sha256:3e9ef8910b95e0a366041c1e156b7cbd6802df4c857cd53ad59bbba631749983
```

ちゃんとワーカーノードがジョインされたか確認してみましょう。

```sh terminal（マスターノード）
kubectl get nodes
# 以下が表示される
NAME       STATUS     ROLES           AGE    VERSION
master01   Ready   control-plane      6d     v1.25.0
work01     Ready      <none>          122m   v1.25.0
work02     Ready      <none>          121m   v1.25.0
```

`ROLES`がデフォルトになっているので変更します。

```sh terminal（マスターノード）
# work01
kubectl label node work01 node-role.kubernetes.io/worker=worker
# work02
kubectl label node work02 node-role.kubernetes.io/worker=worker
# 確認
kubectl get nodes
# 以下が表示される
NAME       STATUS     ROLES           AGE    VERSION
master01   Ready   control-plane      6d     v1.25.0
work01     Ready      worker          122m   v1.25.0
work02     Ready      worker          121m   v1.25.0
```

これでクラスタの完成です。遂に我が家にKubernetesがやって来ました。

### もしコピペを忘れた場合

以下のコマンドで発行したトークンを確認することが出来ます。

```sh terminal（マスターノード）
kubeadm token list
# 以下が表示される
TOKEN                     TTL         EXPIRES                USAGES                   DESCRIPTION                                                EXTRA GROUPS
y2grpy.nbvcyr1em9o5aigj   22h         2022-09-04T08:03:11Z   authentication,signing   <none>                                                     system:bootstrappers:kubeadm:default-node-token
```

有効期限が切れてしまった場合は以下のコマンドで再発行します。

```sh terminal（マスターノード）
sudo kubeadm token create
```

CA証明書のhashも必要なので、以下のコマンドで出力させます。

```sh terminal（マスターノード）
openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //'
```

# Kubernetesでコンテナを動かす

## yamlファイルの作成とapply

[Dockerが動作しているホストのHostnameを表示するNginxコンテナ](https://qiita.com/yasthon/items/6a4627f249bb7fa52eb9)をお借りして、Metal-LBででロードバランシングします。

yamlは[こちら](https://qiita.com/yasthon/items/c29d0b9ce34d66eab3ec#kubernetes-%E3%81%A7-%E3%82%B3%E3%83%B3%E3%83%86%E3%83%8A%E3%82%92%E5%8B%95%E3%81%8B%E3%81%99)を参考にさせて頂いております。
MetalLB v0.13以降はConfigMapでの設定が廃止され、Custom Resource Definitions（CRD）での設定が推奨になったようで、MetalLBの部分だけv0.13に適合するように書き換えます。

```yaml display-hostname.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nginx-prod
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: pool-ips
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.210-192.168.1.215 # 外部IPレンジ（この中から適当に外部IPが選ばれる）
  autoAssign: true
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: pool-ips
  namespace: metallb-system
spec:
  ipAddressPools:
  - pool-ips
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service-lb # Service(LoadBalancer) の名前
  namespace: nginx-prod
  annotations:
    metallb.universe.tf/address-pool: pool-ips # MetallbのIPプール名
spec:
  type: LoadBalancer
  ports:
    - name: nginx-service-lb
      protocol: TCP
      port: 8080 # ServiceのIPでlistenするポート
      nodePort: 30080 # nodeのIPでlistenするポート（30000-32767）
      targetPort: 80 # 転送先(コンテナ)でlistenしているPort番号のポート
  selector: # service のselctorは、matchLabels 扱いになる
    app: nginx-pod # 転送先の Pod のラベル
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment # Deployment の名前(ReplicaSetの名前もこれになる)
  namespace: nginx-prod
spec:
  selector:
    matchLabels: # ラベルがマッチしたPodを対象とするReplicaSetの作成
      app: nginx-pod
  replicas: 2
  template: # Pod のテンプレート
    metadata:
      name: nginx-pod # Pod の名前
      namespace: nginx-prod
      labels: # Pod のラベル
        app: nginx-pod
    spec:
      containers: # コンテナの設定
        - name: nginx-container # コンテナの名前
          image: yasthon/nginx-display-hostname # イメージの名前
          env:
            - name: nginx-container
          ports:
            - containerPort: 80 # コンテナのポート
          volumeMounts:
            - name: file-hostname
              mountPath: /usr/share/nginx/html/hostname
      volumes:
        - name: file-hostname
          hostPath:
            path: /etc/hostname
```

参考：
- [MetalLB v0.13以降はConfigmapでの設定ができない](https://thr3a.hatenablog.com/entry/20220718/1658127951)
- [Heads up: breaking changes in 0.13.x #1473](https://github.com/metallb/metallb/issues/1473)

以下のコマンドでリソースを作成します。

```sh terminal
# リソースの作成
kubectl apply -f display-hostname.yaml
```

## 動作確認

色々確認していきましょう。

```sh terminal
# ポッドの確認
kubectl get pods -n nginx-prod
# 以下が表示される
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5bd979fdf9-dftnr   1/1     Running   0          92s
nginx-deployment-5bd979fdf9-m9b58   1/1     Running   0          92s

# デプロイメントの確認
kubectl get deployment -n nginx-prod
#
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   2/2     2            2           23m

# ReplicaSetの確認
kubectl get replicaset -n nginx-prod
#
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5bd979fdf9   2         2         2       23m
```

ちゃんと2つ立ち上がってます🙌

サービスを見ることでロードバランサーの外部IPを取得し、アクセスしてみましょう。

```sh terminal
kubectl get svc -n nginx-prod
# 以下が表示される
NAME               TYPE           CLUSTER-IP     EXTERNAL-IP     PORT(S)          AGE
nginx-service-lb   LoadBalancer   10.101.40.46   192.168.1.210   8080:30080/TCP   3m26s
# 外部IPへアクセスしてみる
# ポート番号の入力を忘れないように注意する。
curl 192.168.1.210:8080/index.sh
# work02が表示される。
<html><head>
<title>work02</title>
<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
</head><body>
HOSTNAME : work02
</body></html>
# もう一度アクセスしてみる
curl 192.168.1.210:8080/index.sh
# 今度はwork01が表示される
<html><head>
<title>work01</title>
<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
</head><body>
HOSTNAME : work01
</body></html>
```

アクセスするたびに接続先が変わっていることから、ロードバランシングされていることが見受けられます。
同じネットワーク内につながっているPCであれば、ブラウザから上記アドレスへアクセスすることも可能です。

## 可用性を体感する

[こちら](https://qiita.com/yasthon/items/c29d0b9ce34d66eab3ec#kubernetes-%E3%81%A7-%E3%82%B3%E3%83%B3%E3%83%86%E3%83%8A%E3%82%92%E5%8B%95%E3%81%8B%E3%81%99)の記事同様、ワーカーを物理的に落としても外部IPへアクセスできることを確認します。
ワーカーノード①に接続されたLANケーブルを抜いてアクセスしてみます。

```sh terminal
curl 192.168.1.210:8080/index.sh
# ワーカーノード②に繋がる
<html><head>
<title>work02</title>
<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
</head><body>
HOSTNAME : work02
</body></html>
```

次に、ワーカーノード①を繋ぎ直し、ワーカーノード②に接続されたLANケーブルを抜いてアクセスしてみます。
（ワーカーノード①を繋いでから接続できるようになるまで少し時間がかかります。）

```sh terminal
curl 192.168.1.210:8080/index.sh
# ワーカーノード①に繋がる
<html><head>
<title>work01</title>
<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
</head><body>
HOSTNAME : work01
</body></html>
```

このように、どちらかのワーカーが落ちても外部IPアドレスにアクセスすることができ、可用性を体感することができました。
ロードバランサー自体はアクセス先を2つのワーカーに振り分けることで負荷を分散させる役割を持っていますが、このようにアクセス可能なワーカーのみに振り分けることも可能です。

最後に2つのワーカーノードの接続を外してみます。

```sh terminal
curl 192.168.1.210:8080/index.sh
# 繋がらない
curl: (7) Failed to connect to 192.168.1.210 port 8080: No route to host
```

当然ですが、アクセスできないことが確認できます。

## 再起動してみる

クラスターを止めずに全ノード再起動して、再度確認してみます。

```sh terminal
# nodeの状態を確認する
kubectl get node -A
# STATUSがReadyなことが確認できる
NAME                STATUS   ROLES           AGE    VERSION
mas01.example.com   Ready    control-plane   107m   v1.25.0
work01              Ready    worker          101m   v1.25.0
work02              Ready    worker          101m   v1.25.0
# コンテナの情報を見てみる
kubectl get all -n nginx-prod
# コンテナが動いていることが確認できる
NAME                                    READY   STATUS    RESTARTS      AGE
pod/nginx-deployment-5bd979fdf9-h89bh   1/1     Running   1 (13m ago)   38m
pod/nginx-deployment-5bd979fdf9-xnltc   1/1     Running   1 (13m ago)   38m

NAME                       TYPE           CLUSTER-IP     EXTERNAL-IP     PORT(S)          AGE
service/nginx-service-lb   LoadBalancer   10.101.40.46   192.168.1.210   8080:30080/TCP   84m

NAME                               READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-deployment   2/2     2            2           84m

NAME                                          DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-deployment-5bd979fdf9   2         2         2       84m
# 外部IPにアクセスしてみる
curl 192.168.1.210:8080/index.sh
# アクセス可能
<html><head>
<title>work01</title>
<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
</head><body>
HOSTNAME : work01
</body></html>
```

このように、ラズパイ自体を再起動してもまたクラスタが立ち上がっていることが確認できます。

# まとめ

ラズパイを使ってKubernetesのクラスタを作成し、ロードバランシング・可用性を体感することができました。クラウド上でゴニョゴニョ行われていることに対して、物理的な構成から作ってみることで解像度が上がった気がします。また、Kubernetes周りで使われている技術（cgroup, kubeadm, kubelet, flannel, ...）について調べながら進めることで、Kubernetesに対して理解が進みました。
今回、コンテナの構成に関しては自分で作らなかったので、次はWebアプリでも作ってデプロイしてみたいと思います。

