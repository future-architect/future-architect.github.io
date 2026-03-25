---
title: "実験して入門するKubernetes：Pod起動の裏側を追っていたら、どうしてもSchedulerを止めてみたくなった件"
date: 2026/03/25 00:00:00
postid: a
tag:
  - Kubernetes
  - minikube
  - 初心者向け
category:
  - Infrastructure
thumbnail: /images/2026/20260325a/thumbnail.jpg
author: 内堀航輝
lede: "Kubernetesの基礎的な挙動を追ってみることにしました。今回は、どういう流れでPodが作られているのかを実験し、そのアウトプットとしてこの記事にまとめています。"
---

<img src="/images/2026/20260325a/top.jpg" alt="" width="1024" height="572">

# はじめに

最近、コンテナオーケストレーションの技術領域に興味をもち、Kubernetesを触り始めました。早速自宅で飼ってるMiniPC（ホームサーバ）にArgoCDやLonghornを入れてみたものの、Deployment、Pod、Serviceなど初めましての概念ばかり。気づいたら、AIの指示通りにただコマンド打つマンになっていました。

このままではまずいと思い、Kubernetesの基礎的な挙動を追うことにしました。今回は、どのような流れでPodが作られているのかを実験し、そのアウトプットとしてこの記事にまとめています。

※実験にはMinikubeを使っています。初学者が調べながらまとめたものなので、誤りがあればご指摘ください。

# Pod起動までの流れの概要

Podが起動するまでの流れを紹介します。複数のKubernetesコンポーネントが登場しますが、この記事のメインテーマではないため、用語は簡単な説明に留めます。詳細が気になる方は、既存の解説記事や[公式ドキュメント](https://kubernetes.io/ja/docs/concepts/overview/components/)をご参照ください。

```txt
kubectl run
  ↓
API Server → etcd（Podデータ保存、ノード未割り当て）
  ↓
Scheduler（最適なノードを割り当て）
  ↓
kubelet（コンテナイメージのPull・起動）
  ↓
podが起動
```

- **etcd**：Kubernetesの全状態を保存するデータベース
- **API Server**：全コンポーネントからのリクエスト受付と、状態変更の通知する窓口
- **Scheduler**：Podをどのノードで動かすかを決定するスケジューラ
- **kubelet**：各ノード上で実際にコンテナを起動・管理する実行エンジン

> 補足：`kubectl run`はPodを直接作成します。Deployment経由の場合は、Controller ManagerがDeploymentデータ → ReplicaSetデータ → Podデータ と各種データを作成するステップが加わります。この記事では、簡略化のため`kubectl run`による直接的な作成を追いかけます。

# 実験1：イベントログでPod作成の流れを確認する

最初の実験として、実際に`kubectl run`を実行し、出力されるイベントログを確認してみます。

```sh
% kubectl run log-test --image=nginx
pod/log-test created
% kubectl get events -w
LAST SEEN   TYPE     REASON      OBJECT         MESSAGE
23m         Normal   Scheduled   pod/log-test   Successfully assigned default/log-test to minikube
22m         Normal   Pulling     pod/log-test   Pulling image "nginx"
22m         Normal   Pulled      pod/log-test   Successfully pulled image "nginx" in 1.481s (1.481s including waiting). Image size: 180545980 bytes.
22m         Normal   Created     pod/log-test   Container created
22m         Normal   Started     pod/log-test   Container started
```

REASON列とMESSAGE列を見ると、まずScheduledでPodがノード（ここではminikube）に割り当てられ、その後にコンテナの立ち上げ処理が始まっていることがわかります。

さらに`kubectl get events -o yaml` とオプションを追加すると、各イベントがどのコンポーネントから出力されたのかを詳しく確認できます。

<details>
<summary> kubectl get events -o yaml の出力</summary>

```yaml
% kubectl get events -o yaml
apiVersion: v1
items:
- action: Binding
  apiVersion: v1
  eventTime: "2026-03-17T08:45:27.742811Z"
  firstTimestamp: null
  involvedObject:
    apiVersion: v1
    kind: Pod
    name: log-test
    namespace: default
    resourceVersion: "62245"
    uid: c79a534d-9c74-45bf-acf4-5a9985c39c14
  kind: Event
  lastTimestamp: null
  message: Successfully assigned default/log-test to minikube
  metadata:
    creationTimestamp: "2026-03-17T08:45:27Z"
    name: log-test.189d9485200842b1
    namespace: default
    resourceVersion: "62247"
    uid: 822856bb-0e26-4942-8d78-ac1eff975cb0
  reason: Scheduled
  reportingComponent: default-scheduler
  reportingInstance: default-scheduler-minikube
  source: {}
  type: Normal
- apiVersion: v1
  count: 1
  eventTime: null
  firstTimestamp: "2026-03-17T08:45:28Z"
  involvedObject:
    apiVersion: v1
    fieldPath: spec.containers{log-test}
    kind: Pod
    name: log-test
    namespace: default
    resourceVersion: "62246"
    uid: c79a534d-9c74-45bf-acf4-5a9985c39c14
  kind: Event
  lastTimestamp: "2026-03-17T08:45:28Z"
  message: Pulling image "nginx"
  metadata:
    creationTimestamp: "2026-03-17T08:45:28Z"
    name: log-test.189d94853f8ec93d
    namespace: default
    resourceVersion: "62249"
    uid: 212f6090-34de-46dd-82eb-d721ace1b32a
  reason: Pulling
  reportingComponent: kubelet
  reportingInstance: minikube
  source:
    component: kubelet
    host: minikube
  type: Normal
- apiVersion: v1
  count: 1
  eventTime: null
  firstTimestamp: "2026-03-17T08:45:30Z"
  involvedObject:
    apiVersion: v1
    fieldPath: spec.containers{log-test}
    kind: Pod
    name: log-test
    namespace: default
    resourceVersion: "62246"
    uid: c79a534d-9c74-45bf-acf4-5a9985c39c14
  kind: Event
  lastTimestamp: "2026-03-17T08:45:30Z"
  message: 'Successfully pulled image "nginx" in 2.135s (2.135s including waiting).
    Image size: 180542930 bytes.'
  metadata:
    creationTimestamp: "2026-03-17T08:45:30Z"
    name: log-test.189d9485beda4a95
    namespace: default
    resourceVersion: "62252"
    uid: 3eb2fd61-7b0b-4f62-b7c3-e5a4be893399
  reason: Pulled
  reportingComponent: kubelet
  reportingInstance: minikube
  source:
    component: kubelet
    host: minikube
  type: Normal
- apiVersion: v1
  count: 1
  eventTime: null
  firstTimestamp: "2026-03-17T08:45:30Z"
  involvedObject:
    apiVersion: v1
    fieldPath: spec.containers{log-test}
    kind: Pod
    name: log-test
    namespace: default
    resourceVersion: "62246"
    uid: c79a534d-9c74-45bf-acf4-5a9985c39c14
  kind: Event
  lastTimestamp: "2026-03-17T08:45:30Z"
  message: Container created
  metadata:
    creationTimestamp: "2026-03-17T08:45:30Z"
    name: log-test.189d9485c0e87bde
    namespace: default
    resourceVersion: "62253"
    uid: df68a670-7684-4573-beff-b92e5a6bbdec
  reason: Created
  reportingComponent: kubelet
  reportingInstance: minikube
  source:
    component: kubelet
    host: minikube
  type: Normal
- apiVersion: v1
  count: 1
  eventTime: null
  firstTimestamp: "2026-03-17T08:45:30Z"
  involvedObject:
    apiVersion: v1
    fieldPath: spec.containers{log-test}
    kind: Pod
    name: log-test
    namespace: default
    resourceVersion: "62246"
    uid: c79a534d-9c74-45bf-acf4-5a9985c39c14
  kind: Event
  lastTimestamp: "2026-03-17T08:45:30Z"
  message: Container started
  metadata:
    creationTimestamp: "2026-03-17T08:45:30Z"
    name: log-test.189d9485c5d61a22
    namespace: default
    resourceVersion: "62254"
    uid: edf2dbb3-11e1-49e6-bb91-6dbca2d51edb
  reason: Started
  reportingComponent: kubelet
  reportingInstance: minikube
  source:
    component: kubelet
    host: minikube
  type: Normal
kind: List
metadata:
  resourceVersion: ""
```

</details>

出力されたイベントログの `reportingComponent` フィールドを確認すると、各イベントの出力元は以下です。

- **Scheduled** → `reportingComponent: default-scheduler`
- **Pulling / Pulled / Created / Started** → `reportingComponent: kubelet`

概要で確認した通り、まずSchedulerがノードを割り当てた後、そのノードのkubeletがコンテナの起動処理を行っていることが、実際のログからも確認できました。

# Static PodとMirror Pod

ここまででpodが起動するまでの流れはわかったのですが、ここで1つ疑問が湧きました。

先ほど確認した通り、Podが起動するにはSchedulerによるノード割り当てが必要です。しかし、そのScheduler自身もPodとして動いています。となると、Schedulerを起動するためのSchedulerが必要で、そのSchedulerを起動するためにさらにSchedulerが必要で、、、と無限ループに陥ってしまいます。最初のSchedulerは一体どのように起動されているのでしょうか？

結論から言うと、 SchedulerはAPI Serverや別のSchedulerを経由せず、kubeletがマニフェストファイルから直接起動していました。

実際のSchedulerのマニフェストファイルを確認すると、以下のようになっています。kindが `Deployment` ではなく `Pod` となっており、Podデータそのものが定義されていることがわかります。

```yaml
% minikube ssh
$ sudo cat /etc/kubernetes/manifests/kube-scheduler.yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    component: kube-scheduler
    tier: control-plane
  name: kube-scheduler
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-scheduler
    ...
```

このように、特定のディレクトリにマニフェストを配置し、API Serverを経由せずにkubeletが直接起動・管理するPodを**Static Pod**と呼びます。Kubernetesの起動時には、コントロールプレーンのkubeletがこの仕組みを利用して、API Serverやetcd、Schedulerなどの主要なコンポーネントをStatic Podとして起動しています。

ただ、このStatic PodはAPI Serverを経由しないため、etcd上に実体がありません。そのままでは、`kubectl get pods`で確認できず、クラスタ全体の状態を一元管理する上で不便です。そこでkubeletは、**Mirror Pod**と呼ばれる読み取り専用のPodを作成します。`kubectl get pods -n kube-system`で見える`kube-scheduler-minikube`は、実はこのMirror Podでした。

# 実験2：Schedulerを止めてみる

ここまでの話が本当なら、以下が成り立つはずです。

- Mirror Podを削除しても、Schedulerは止まらない（本体はマニフェストファイルだから）
- マニフェストファイルを削除（移動）すると、Schedulerが止まる
- Schedulerが止まると、新しいPodはノードに割り当てられずPendingのままになる

というわけで、さっそく試してみましょう。

## 1. Mirror Podを削除する

`kubectl delete pod`で`kube-scheduler-minikube`を削除してみます。しかし、何度削除しても、即座に復活し、`kubectl get pods`の結果に出てきます。

```sh
% kubectl delete pod kube-scheduler-minikube -n kube-system
pod "kube-scheduler-minikube" deleted from kube-system namespace
% kubectl get pods -n kube-system
NAME                               READY   STATUS    RESTARTS   AGE
...
kube-scheduler-minikube            1/1     Running   0          5s
...
```

## 2. マニフェストファイルを移動する

次に`minikube ssh`でMinikubeのノード内入り、マニフェストファイルを他の場所に動かしてみます（削除すると戻すのが面倒なので`mv`にしました）。

すると、あれだけ何度削除しても復活していた`kube-scheduler-minikube`が、`kubectl get pods`から消えました。

```sh
% minikube ssh
$ sudo mv /etc/kubernetes/manifests/kube-scheduler.yaml /tmp/
$ exit
% kubectl get pods -n kube-system
NAME                               READY   STATUS    RESTARTS   AGE
coredns-7d764666f9-bbkvl           1/1     Running   0          11h
etcd-minikube                      1/1     Running   0          11h
kube-apiserver-minikube            1/1     Running   0          11h
kube-controller-manager-minikube   1/1     Running   0          11h
kube-proxy-fj8zg                   1/1     Running   0          11h
storage-provisioner                1/1     Running   0          11h
```

## 3. Schedulerなしで新しいPodを作成する

このSchedulerがいない状態で、新しいPodを作成してみます。Podデータ自体は作成できましたが、STATUSが`Pending`のまま動かず、NODEも`<none>`のままです（必要な情報を出力するため`custom-columns`オプションをつけています）。

```sh
% kubectl run new-pod --image=nginx
pod/new-pod created
% kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName
NAME                         STATUS    NODE
hello-node-64fc5894d-57r8s   Running   minikube
hello-node-64fc5894d-7cqrw   Running   minikube
hello-node-64fc5894d-jl4pb   Running   minikube
new-pod                      Pending   <none>
```

どれだけ待っても`Running`になることはありませんでした。

Schedulerがいないと、Podデータは作成されても、ノードが割り当てられないため、冒頭で確認したフローのSchedulerのステップで処理が止まってしまうことが実際の挙動でも確認できました。

# おわりに

解説動画や記事を見ても、Kubernetesの各概念やその関係性がピンとこず、「デプロイするとPodが作れてその中にコンテナがいるらしい」くらいの認識でした。そんな状態だったので、当然`kubectl`コマンドの意味がわかるはずもなく、結果としてAIの指示通りにコマンド打つマンと化していました。

しかし今回、小さな実験を通して手を動かしてみたことで、裏側で各コンポーネントがどのように連携して動いているのかを具体的に追うことができ、一気に理解が深まりました。特にSchedulerは、こうして実験してみなければ存在すら知らなかった概念だったため、非常に学びになりました。

今回の実験で、何度も消されたりファイルを移動させられたりと散々な目に遭わせてしまったSchedulerには、この場を借りて感謝と謝罪を述べて締めくくりたいと思います。
