---
title: "Minikubeでk8s学習を進めるためのヒント"
date: 2022/01/12 00:00:00
postid: a
tags:
  - Kubernetes
  - Minikube
  - 入門
  - 環境構築
categories:
  - DevOps
thumbnail: /images/2022/20220112a/thumbnail.png
author: 鈴木崇史
lede: "チームの輪読会でKuberntes完全ガイドを読みました。 k8s本は、GKEを例にしながら、k8sのCLIツールだったりマニフェストのyamlファイルを丁寧に紹介しており、実践的に勉強するの適しています。手を動かしつつ勉強したいところですが、クラウドプロバイダーが提供するマネージドk8sはコストが高めで気分的にほいほい使えないところがあります。となるとローカル環境でk8sを用意したくなります。"
---

<img src="/images/2022/20220112a/minikube.png" alt="" width="1000" height="519">

# k8s学習環境が欲しい

こんにちはTIG鈴木です。

以前チームの輪読会で[Kuberntes完全ガイド](https://www.amazon.co.jp/Kubernetes%E5%AE%8C%E5%85%A8%E3%82%AC%E3%82%A4%E3%83%89-%E7%AC%AC2%E7%89%88-Top-Gear-%E9%9D%92%E5%B1%B1/dp/4295009792)(以下k8s本)を読みました。 k8s本は、GKEを例にしながら、k8sのCLIツールだったりマニフェストのyamlファイルを丁寧に紹介しており、実践的に勉強するの適しています。

そのため、手を動かしつつ勉強したいところですが、クラウドプロバイダーが提供するマネージドk8sはコストが高めで気分的にほいほい使えないところがあります。となるとローカル環境でk8sを用意したくなります。

k8s完全ガイドでは[minikube](https://github.com/kubernetes/minikube)だったり[kind](https://kind.sigs.k8s.io/)だったりが紹介されています

# ローカル環境もそれなりにめんどくさい

ところがminikubeだとGKEとは使い勝手が違っていて、k8s本通りに検証できない部分があり、初学者の私は混乱してしまいました。

ということで、私がひっかかったポイント（おもにServiceまわり）を踏まえて、k8s学習を進めるためのいくつかTipsを紹介します。

# minikubeとは

ローカルk8sクラスタをを簡単に構築できる定番のツールです。DockerやVirtualBoxで仮想マシンが立ち上がりその上にk8sが構築されます。

下の様にオプションなしで起動した場合、筆者環境ではDockerコンテナとして起動します。デフォルトでは1 nodeで構築されます。

```bash
$ minikube start
...
🏄  Done! kubectlisnow configuredtouse "minikube" clusterand "default" namespacebydefault

$ kubectl get nodes
NAME           STATUS   ROLES                  AGE   VERSION
minikube       Ready    control-plane,master   90m   v1.22.1

# ノードはdockerコンテナとして起動している
$ docker ps
CONTAINERID   IMAGE                                 COMMAND                  CREATEDSTATUS              PORTS
NAMES
362ee8fb5198   gcr.io/k8s-minikube/kicbase:v0.0.26   "/usr/local/bin/entr…"   2 hours ago   Up 2 hours   127.0.0.1:49177->22/tcp, 127.0.0.1:49176->2376/tcp, 127.0.0.1:49175->5000/tcp, 127.0.0.1:49174->8443/tcp, 127.0.0.1:49173->32443/tcp   minikube
```

# Serviceまわり

**NodePort**は<ノードのIP>:< Port >への通信をPodに転送する形で、アプリケーションの外部疎通性を確保するリソースです。

```sh
$ kubectl create deployment test-deployment --image=nginx

# NodePortを作成
$ kubectl expose deployment test-deployment --port=80 --type=NodePort
$ kubectl get service test-deployment
NAME              TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
test-deployment   NodePort   10.107.114.198   <none>        80:31307/TCP   4m21s
```

上記Deploymentにアクセスするには、ノードのIPアドレスを調べる必要があります。minikubeではコマンドが用意されており、`minikube ip` で調べられます。  実態はminikubeノードとして起動しているDockerコンテナのアドレスです。

```sh
$ minikube ip
192.168.49.2

$ docker exec -it minikube ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
69: eth0@if70: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default  link-netnsid 0
    inet 192.168.49.2/24 brd 192.168.49.255 scope global eth0
       valid_lft forever preferred_lft forever
```

curlをしてみれば、疎通できることがわかります。

```sh
curl 192.168.49.2:31307
```

**LoadBalancer**を使う場合は`minikube tunnel` で EXTERNAL-IPを払い出し、ホストサーバからEXTERNAL-IPへルートを確保します。

```bash
$ kubectl expose deployment test-deployment --type=LoadBalancer --port=80

$ kubectl get service test-deployment
NAME              TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
test-deployment   LoadBalancer   10.108.139.68   <pending>     80:31284/TCP   70s

$ minikube tunnel

# EXTERNAL-IPが払い出されている
$ kubectl get service test-deployment
NAME              TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        AGE
test-deployment   LoadBalancer   10.108.139.68   10.108.139.68   80:31284/TCP   2m35s
```

`curl 10.108.139.68:80` で疎通が確認できます。

# Ingress

Ingressを使う場合は、Ingressコントローラをデプロイする必要があります。
minikubeではそのためのaddonが用意されています。

```sh
$ minikube addons enable ingress
# nginx ingress controllerがデプロイされている
$ kubectl get pods -n ingress-nginx
NAME                                        READY   STATUS      RESTARTS   AGE
ingress-nginx-admission-create-2mjhv        0/1     Completed   0          5m34s
ingress-nginx-admission-patch-pj8jv         0/1     Completed   0          5m34s
ingress-nginx-controller-5d88495688-grssn   1/1     Running     0          5m35s
```

以下のマニフェストでingressを作成してみます。

```yaml ing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: test-deployment
            port:
              number: 80
```

```sh
kubectl apply -f ing.yaml
```

下のようにIngressが作成されたことがわかります。 `ADDRESS` に対してリクエストを送ればアプリケーションにアクセスできます。

```sh
$ kubectl get ingress
NAME            CLASS    HOSTS   ADDRESS        PORTS   AGE
test-ingress    <none>   *       192.168.49.2   80      13m
```

[ingress-dns](https://minikube.sigs.k8s.io/docs/handbook/addons/ingress-dns/) addonを使えば、Ingressで設定したホスト名をホストサーバから解決することが可能らしいです。ちょっと試せていないですが、参考までに。

# Horizontal Pod Autoscaler

Horizontal Pod Autoscaler(HPA)はCPUやメモリ消費に基づいてPodをスケールさせる機能です。HPAを使うためには、Podの消費するリソースをmetricsとして取得できる必要があります。minikubeではaddonとしてmetrics-serverを有効化します。

```bash
$ minikube addons enable metrics-server
    ▪ Using image k8s.gcr.io/metrics-server/metrics-server:v0.4.2
```

metrics-serverを有効化したので、`kubectl top` でpodのリソース消費を確認できます。

```sh
$ kubectl top pod test-nginx
NAME         CPU(cores)   MEMORY(bytes)
test-nginx   0m           1Mi
```

この状態であれば、[HPAのチュートリアル](https://kubernetes.io/ja/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)で、HPAが機能することを確認できます。

# Multi-Node Clusterとスケジューリング

minikubeはデフォルトで1 nodeで起動します。なのでそのままでは、Node AffinityやPod Affinityなど高度なスケジューリング機能の検証ができません。

ですが、minikubeでは`--nodes` オプションで複数ノードでクラスタを作成可能です。

```sh
$ minikube start --nodes 2
$ kubectl get node
NAME           STATUS   ROLES                  AGE     VERSION
minikube       Ready    control-plane,master   9m53s   v1.22.1
minikube-m02   Ready    <none>                 9m35s   v1.22.1
```

下のマニフェストでPod Anti Affinityを使ってみます。このDeploymentでは2つのPodが作成されますが、別々のノードに配置される設定になっています。

```yaml pod-antiaffinity.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 100%
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      affinity:
        # ⬇⬇⬇ This ensures pods will land on separate hosts
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions: [{ key: app, operator: In, values: [hello] }]
            topologyKey: "kubernetes.io/hostname"
      containers:
      - name: hello-from
        image: pbitty/hello-from:latest
        ports:
          - name: http
            containerPort: 80
      terminationGracePeriodSeconds: 1
```

Podが異なるノードに配置されていることがわかります。

```bash
$ kubectl get pods -o wide
NAME                     READY   STATUS    RESTARTS   AGE     IP           NODE           NOMINATED NODE   READINESS GATES
hello-7db79cdc77-68mvs   1/1     Running   0          4m23s   10.244.0.3   minikube       <none>           <none>
hello-7db79cdc77-gkpwm   1/1     Running   0          4m23s   10.244.1.5   minikube-m02   <none>           <none>
```

# まとめ

minikubeでk8sを学習していく際のTipsをご紹介しました。minikube以外にも[microk8s](https://microk8s.io/), [kind](https://kind.sigs.k8s.io/)などローカルk8sクラスタ構築ツールの選択肢はありますし、VMとkubeadmで構築するのも勉強になると思います。
入門者のお役に立てれば幸いです！
