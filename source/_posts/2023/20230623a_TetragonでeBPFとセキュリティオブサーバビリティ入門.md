---
title: "TetragonでeBPFとセキュリティオブサーバビリティ入門"
date: 2023/06/23 00:00:00
postid: a
tag:
  - kubernetes
  - CNCF
  - オブサーバビリティ
  - Linux
category:
  - Security
thumbnail: /images/2023/20230623a/thumbnail.png
author: 鈴木崇史
lede: "数年前にクラウドネイティブ注目技術として挙げられたeBPFにかねてよりキャッチアップしたいなと思っていたので、この連載のタイミングでeBPFとその関連プロダクトに入門してみることにしました。CNCFプロジェクト傘下のeBPFを活用したプロダクトとしてはCiliumに触ってみます。"
---
[CNCF連載](/articles/20230619a/) の4本目です。

## はじめに

数年前に[クラウドネイティブ注目技術として挙げられた](https://twitter.com/CloudNativeFdn/status/1329863326428499971?s=20)eBPFにかねてよりキャッチアップしたいなと思っていたので、この連載のタイミングでeBPFとその関連プロダクトに入門してみることにしました。

CNCFプロジェクト傘下のeBPFを活用したプロダクトとしては[Cilium](https://cilium.io/), [Falco](https://falco.org/)などが挙げられます。CiliumはKubernetesなどのクラウドネイティブな環境でネットワーク、オブサーバビリティの機能を提供するOSSなのですが、今回はそのいわばサブプロジェクト的な位置づけのセキュリティツールである、[Tetragon](https://github.com/cilium/tetragon)に触ってみます。

Cilium, Tetragonの開発をメイン行っているIsovalent社は、書籍やハンズオンラボなどで自社の製品・eBPFについての学習リソースを多く提供しています。

https://isovalent.com/resource-library/books

eBPFを学ぶ書籍はいくつかあると思うのですが、今回ブログを書くにあたってはIsovalentが提供しているeBook、[Learning eBPF](https://isovalent.com/learning-ebpf/)にざっと目を通しました。

## eBPF入門

eBPFとはLinuxカーネル内部で高速安全にプログラムを実行する技術です。これにより、ネットワーキング、セキュリティ、アプリケーションのカーネルレベルでの振る舞いを、カーネルをビルドしなおしたりOSの再起動をしたりせずに動的に観測・制御できます。

eBPFそのものの実態は、カーネルのイベントをトリガーとして動作するプログラムとその実行環境です。基本的にC言語で記述してeBPFのバイトコードにコンパイルされ、eBPFのVMで動きます。eBPFバイトコードはカーネルにロードされる前に検証器にチェックされるようになっており、そのおかげでカーネルをクラッシュさせたり脆弱性のもとになるバグを埋め込まず安全に実行できるようです。

eBPFを使ったツールを開発する場合、eBPFプログラムそのものと、それをカーネルのイベントソースにアタッチしてeBPFとデータをやり取りするユーザスペースのコードを書く必要があります。

実際にeBPFのサンプルプログラムを動かしてみましょう。サンプルプログラムには[BCC](https://github.com/iovisor/bcc) (BPF Compiler Collection）という、Python/LuaでeBPFを扱うことのできるツールを使います。インストール方法は[こちら](https://github.com/iovisor/bcc/blob/master/INSTALL.md)が参考になります。

次はHello Worldプログラムです。

```python
#!/usr/bin/python3  
from bcc import BPF

program = r"""  
int hello(void *ctx) {
    bpf_trace_printk("Hello World!");
    return 0;
}
"""

b = BPF(text=program)
syscall = b.get_syscall_fnname("execve")
b.attach_kprobe(event=syscall, fn_name="hello")

b.trace_print()
```

- eBPFプログラムはヒアドキュメントで書かれた部分です。C言語の文法で書かれています。
- `BPF(text=program)` でeBPFプログラムを渡してBPFオブジェクトを作っていますが、このタイミングでeBPFプログラムがコンパイルされます。
- `get_syscall_fname("execve")`で execveシステムコール（実行可能ファイルが実行される時に呼ばれるシステムコール）に対応するカーネル関数を検索します。
- `b.attach_kprobe(event=syscall, fn_name="hello")` でebpfプログラムを検索したカーネル関数にアタッチします。ここではkprobeという実行中のカーネルに動的に処理を差し込むための仕組みでイベントにアタッチしています。

このPythonスクリプトを実行し、別ターミナルで `ls` コマンドを実行すると、`ls`が実行される時にexecve()が呼ばれ、それにアタッチされたeBPFプログラムが次のようなトレースを出力します。

```python
b'           <...>-2140994 [000] d...1 556700.676560: bpf_trace_printk: Hello World!'
```

“Hello World” だけでなく、どのようなプロセスがトレースされているのかを表示できるようにしてみましょう。eBPFプログラムの中からプロセス名を取得するために、`bpf_get_current_comm()`というヘルパー関数を使ってみます。

```python
#!/usr/bin/python3  
from bcc import BPF

program = """
#include <linux/sched.h>

int hello(void *ctx) {

    char comm[TASK_COMM_LEN];
    bpf_get_current_comm(&comm, sizeof(comm)); 

    bpf_trace_printk("%s\\n", comm);
    return 0;
}
"""

b = BPF(text=program)
syscall = b.get_syscall_fnname("execve")
b.attach_kprobe(event=syscall, fn_name="hello")

b.trace_print()
```

このPythonスクリプトを実行した状態で別ターミナルで `ls` を実行すると、`bash` から `ls` が起動したのだということがわかります。

```python
b'           <...>-2196911 [000] d...1 567624.022345: bpf_trace_printk: bash'
b'           <...>-2196912 [002] d...1 567624.380166: bpf_trace_printk: bash'
```

今までトレースを出力するために `bpf_trace_printk` という関数を使ってきましたが、これは主にデバッグ目的で使うようなもので、PythonのユーザスペースのプログラムとeBPFプログラムの間で情報をやり取りするには、eBPF mapというデータ構造を使います。
eBPF mapとして利用できるデータ構造はいくつかありますが、今回はring bufferを使ってみます。

```python
#!/usr/bin/python3  
from bcc import BPF

program = r"""
BPF_PERF_OUTPUT(output); 
 
struct data_t {     
   int pid;
   int uid;
   char command[16];
};
 
int hello(void *ctx) {
   struct data_t data = {}; 
 
   data.pid = bpf_get_current_pid_tgid() >> 32;
   data.uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
   
   bpf_get_current_comm(&data.command, sizeof(data.command));
 
   output.perf_submit(ctx, &data, sizeof(data)); 
 
   return 0;
}
"""

b = BPF(text=program) 
syscall = b.get_syscall_fnname("execve")
b.attach_kprobe(event=syscall, fn_name="hello")
 
def print_event(cpu, data, size):  
   data = b["output"].event(data)
   print(f"{data.pid} {data.uid} {data.command.decode()}")
 
b["output"].open_perf_buffer(print_event) 
while True:   
   b.perf_buffer_poll()
```

- `BPF_PERF_OUTPUT`の部分がリングバッファーを作成するマクロです。 `output` という名前で定義されています。
- `bpf_get_current_pid_tgid()`  `bpf_get_current_uid_gid()`  でイベントをトリガーしたプロセスのプロセスID・UIDを取得し、`data_t`にセットします。`output.perf_submit`でmapにデータを送ります。
- `print_event()` は バッファにデータが届いたときに呼び出されるコールバック関数です。バッファには `b["output"]` のようにアクセスできます。
- `b["output"].open_perf_buffer`でコールバック関数を登録しています。
- `b.perf_buffer_poll()` でバッファにポーリングしています。

このPythonスクリプトを実行し、別ターミナルでコマンドを実行してみます。

```python
2461142 1000 bash
2461144 1000 bash
2461152 1000 bash
```

トレースされている情報は先ほどと同じですが、Python側のコードで出力を整えられるので見やすくなっていますね。

BPF mapは複数のeBPFプログラム間のデータのやり取りも可能です。

BCC + Pythonは初心者にとっつきやすいですが、実際にはeBPFのコードを実行時に毎回コンパイルするオーバーヘッドがあるだとか、コンパイルするホストと実行するホストが異なるとその差分に影響されてポータビリティが低いといった理由で、現在ではプロダクトの開発に使われていないみたいです。その代わりCO-RE (Compile Once- Run Everywhere)という仕組みをサポートするライブラリを使って実装されているようです。

ここまでくると次から紹介するTetragonの振る舞いやその設定方法がなんとなく理解できるようになります。

## Tetragon

[Tetragon](https://github.com/cilium/tetragon)はもともとCilium Enterpriseの機能として提供されていたセキュリティ可観測性ツールで、2022年にOSSとして発表されました。主にKubernetesでの利用が想定されています。

主な機能としては、定義したポリシーに従ってKuberntesクラスター上のコンテナ内で実行されるプロセスのシステムコールやネットワーク関連のイベントをフィルタリングし、ログとして出力するというものです。ポリシーに応じて動的にeBPFプログラムをアタッチし、カーネル空間内で直接フィルタリングしています。

<img src="/images/2023/20230623a/tetragon-2023-06-21-2234.png" alt="tetragon-2023-06-21-2234.png" width="1065" height="637" loading="lazy">

### プロセス実行の監視

まずはデモを動かしてどういうことができるのか確かめましょう。kindでクラスターを作り、helmでTetragonをインストールします。

```bash
kind create cluster 

helm repo add cilium https://helm.cilium.io
helm repo update
helm install tetragon cilium/tetragon -n kube-system
kubectl rollout status -n kube-system ds/tetragon -w

# tetragonがDaemonSetとしてインストールされます。
kubectl get ds -n kube-system tetragon
```

次にセキュリティイベントの観測対象となる実験用のPodを作成しておきます。

```bash
kubectl run test --image=busybox -- sleep 3600
```

Tetragonではデフォルトでプロセスの実行に対して検知ログを出すようになっています。例えばコンテナでデバッグ用途以外でシェルが起動しているのはいかにも怪しいですが、そのようなイベントを観測できるということです。

Tetragonのログをtailしながら、別のターミナルから先ほど作ったPodで `/bin/sh` を動かしてみましょう

```bash
kubectl logs -f -n kube-system -l app.kubernetes.io/name=tetragon -c export-stdout

# 別のターミナルから
kubectl exec -it test -- /bin/sh
```

Tetragonから以下のようなログが出力されたと思います。長いので途中を省略していますが、”binary” を見ると確かに `/bin/sh` が実行されていると分かります。そしてPodのMetadataとしてPod名やNamespaceコンテナイメージも出力できています。

```json
{
  "process_exec": {
    "process": {
      "exec_id": "a2luZC1jb250cm9sLXBsYW5lOjY3NTM5MDg3NTQ3MTA4MToyNTI5NTM3",
      "pid": 2529537,
      "uid": 0,
      "cwd": "/",
      "binary": "/bin/sh",
...
      "pod": {
        "namespace": "default",
        "name": "test",
        "container": {
          "id": "containerd://a78169cb68982bba2925460d3b3c6cbe09788168f67e102acf228037b341b20f",
          "name": "test",
          "image": {
      ...
          "pid": 13
        },
        "pod_labels": {
          "run": "test"
        }
      },
      "docker": "a78169cb68982bba2925460d3b3c6cb",
      "parent_exec_id": "a2luZC1jb250cm9sLXBsYW5lOjY3NTM5MDgxNzEwOTM3MDoyNTI5NTI4"
    },
    "parent": {
      "exec_id": "a2luZC1jb250cm9sLXBsYW5lOjY3NTM5MDgxNzEwOTM3MDoyNTI5NTI4",
      "pid": 2529528,
      "uid": 0,
...
```

ところで、`bpftool` というBPFユーティリティツールを使うと、カーネルにロードされたeBPFプログラムをリストできます。Tetragonをインストールしたノード上でリストしてみると、Tetragonをインストールした直後（ロードされた時刻も表示されるのでそこでわかります）にいくつかeBPFプログラムがロードされているようです。

```python
bpftool prog list

...
20668: kprobe  name event_exit  tag 6ae01771cf3bfcee  gpl
        loaded_at 2023-06-04T19:11:54+0900  uid 0
        xlated 760B  jited 428B  memlock 4096B  map_ids 54302,54308,54306,54303
        btf_id 108378
20670: kprobe  name event_wake_up_n  tag 71207899142b2062  gpl
        loaded_at 2023-06-04T19:11:54+0900  uid 0
        xlated 4648B  jited 2467B  memlock 8192B  map_ids 54302,54314,54303,54301,54306
        btf_id 108387
20671: tracepoint  name event_execve  tag be83f62b7aed485e  gpl
        loaded_at 2023-06-04T19:11:54+0900  uid 0
        xlated 123200B  jited 75857B  memlock 126976B  map_ids 54327,54302,54322,54306,54320,54305,54323,54324,54303,54301,54304
        btf_id 108396
20672: tracepoint  name execve_send  tag 9db3dc5bc0c71d85  gpl
        loaded_at 2023-06-04T19:11:54+0900  uid 0
        xlated 1040B  jited 626B  memlock 4096B  map_ids 54327,54302,54324,54303,54306
        btf_id 108397
...
```

そのうちの1つ、`20671: tracepoint  name event_execve  tag be83f62b7aed485e  gpl` は、その名前から察するに `execve` システムコールをトレースしているようです。先ほどのサンプルコードと似ていますね。これらのeBPFプログラムたちがプロセスの起動やexitを監視しているみたいです。

eBPFのソースコードはおそらく[このあたり](https://github.com/cilium/tetragon/blob/eb69bdc84405547733ccabfc69b355ae20d0eaa3/bpf/process/bpf_execve_event.c#L156)でしょう。先ほどのサンプルコードと違う部分として、kprobeではなく静的なイベントソースであるTracepointという仕組みにアタッチされていたり、複数のeBPFプログラムが組み合わさっていたりします。

ちなみにTetragonの長いjsonログをパースして必要に応じてフィルタリングして、見やすく表示してくれる `tetra` というCLIツールがあります。

```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=tetragon -c export-stdout -f | tetra getevents --namespace default  -o compact

🚀 process default/test /bin/sh
💥 exit    default/test /bin/sh  0
```

### ファイルアクセスの監視

別のユースケースとして、コンテナ内のファイルアクセスをトレースしてみましょう。コンテナ内のファイルを書き換えることによって例えばWebコンテンツの改竄をすることが可能になるので、そういったイベントは検知するべきです。

Tetragonでは、TracingPolicyというCRDを作成することでトレースしたいカーネル関数を動的に指定できます。ファイルアクセスをトレースしたい場合、その時に呼ばれるカーネル関数やシステムコールをトレースするTracingPolicyを作るということになります。

ここでは `/etc/` ディレクトリ内のファイルを読み書きしている様子をトレースしてみましょう。Tetragonの[examplesとして提供されているmanifest](https://github.com/cilium/tetragon/blob/main/examples/tracingpolicy/sys_write_follow_fd_prefix.yaml)を使います。

```yaml sys_write_follow_fd_prefix.yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: "sys-read-follow-prefix"
spec:
  kprobes:
  - call: "fd_install"
    syscall: false
    return: false
    args:
    - index: 0
      type: int
    - index: 1
      type: "file"
    selectors:
    - matchPIDs:
      - operator: NotIn
        followForks: true
        isNamespacePID: true
        values:
        - 1
      matchArgs:
      - index: 1
        operator: "Prefix"
        values:
        - "/etc/"
      matchActions:
      - action: FollowFD
        argFd: 0
        argName: 1
  - call: "sys_close"
    syscall: true
    args:
    - index: 0
      type: "int"
    selectors:
    - matchActions:
      - action: UnfollowFD
        argFd: 0
        argName: 0
  - call: "sys_read"
    syscall: true
    args:
    - index: 0
      type: "fd"
    - index: 1
      type: "char_buf"
      returnCopy: true
    - index: 2
      type: "size_t"
  - call: "sys_write"
    syscall: true
    args:
    - index: 0
      type: "fd"
    - index: 1
      type: "char_buf"
      sizeArgIndex: 3
    - index: 2
      type: "size_t"
```

```bash
kubectl apply -f sys_write_follow_fd_prefix.yaml
```

試しに実験用のPod内で `/etc/passwd` を編集してみましょう。

```bash
kubectl exec -it busybox -- /bin/sh
/ # vi /etc/passwd
```

Tetragonのログを見るとファイルの `open` `read` `close` をトレースできています。

```bash
🚀 process default/busybox /bin/vi /etc/passwd
📬 open    default/busybox /bin/vi /etc/passwd
📚 read    default/busybox /bin/vi /etc/passwd 340 bytes
📪 close   default/busybox /bin/vi
💥 exit    default/busybox /bin/vi /etc/passwd 0
```

`/etc/` ディレクトリ以外のファイルへの書き込みはトレースされません。なぜなら、eBPFプログラムがトレーシング対象のカーネル関数の引数として渡されるファイル名を取得し、フィルタリングしているからです。

Tracing Policyの内容の詳しく見て行きましょう。一部を取り出してみました。

```yaml
spec:   
  kprobes:
  - call: "fd_install"
    syscall: false
    return: false
    args:
    - index: 0
      type: int
    - index: 1
      type: "file"
    selectors:
    - matchPIDs:
      - operator: NotIn
        followForks: true
        isNamespacePID: true
        values:
        - 1
      matchArgs:
      - index: 1
        operator: "Prefix"
        values:
        - "/etc/"
      matchActions:
      - action: FollowFD
        argFd: 0
        argName: 1

```

kprobeというのは先ほども出てきましたが、カーネルの関数に動的に処理を差し込むための仕組みなのでした。`spec.krpobes` より下の階層はつぎのような意味です

- `call`にはトレース対象のカーネル関数を定義します。今回は`fd_install`が対象です。この関数はファイルテーブルに新しいファイル記述子を割り当てる関数、、、早い話がファイルオープン時に必ず呼ばれる関数です。この関数にkprobeを使ってeBPFプログラムをアタッチする、ということです。fd_install` の引数の0番目はint型、1番目はfileという構造体であり、これらの引数をトレースに含めます。
- `selectors`以下はフィルタリング条件と、フィルターにマッチしたときの挙動を定義しています。
  - `matchPID`
    - PID Namespace内でpid=1ではないプロセスに対してトレースする（つまりコンテナで動かす本来のプロセスはpid 1なのでトレース対象外で、 `kubectl exec` などで実行したプロセスがトレース対象となります）
  - matchArgs
    - indexの1番目=fileのprefixが `etc` の場合にトレースする。
  - `matchActions.action: FollowFD`
    - カーネル関数に渡されたファイル記述子とファイル名をBPF mapに保存する。

他の`spec.kprobe`以下の部分も同じように、どの関数にeBPFをアタッチするかを定義しています。

`FllowFD`によってBPF mapに保存されたファイル記述子は、他の関数にアタッチされたeBPFからルックアップされます。今回のTracingPolicyだと`sys_read()`にアタッチされたeBPFが、関数の引数として渡されるファイル記述子がBPF mapに保存されているものかどうかを参照し、そうであればトレースする、という挙動をとります。

今までトレーシング機能を紹介してきましたが、フィルタリング条件に合致するイベントを検出した際に、プロセスに直接SIGKILLを送出する、といったことも可能です。

## 終わりに

eBPFとeBPF製品Tetragonに入門にしてみました。Tetragonの親プロジェクトのCiliumでは、eBPFでネットワークを効率化しています。主要クラウドプロバイダーのKubernetesサービスでは、Ciliumが使用できるようになっており、例えばGoogle CloudのGKEでは[Dataplane V2](https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2?hl=ja)というモードで提供されています。暇があればCilium, eBPF+ネットワークも勉強したいなと思います。

TetragonやBCCの公式ドキュメントのほか、以下のブログを参考にしました。

https://blog.yuuk.io/entry/2021/ebpf-tracing

https://gihyo.jp/admin/serial/01/ubuntu-recipe/0688
