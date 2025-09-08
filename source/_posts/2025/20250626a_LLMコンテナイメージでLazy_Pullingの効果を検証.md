---
title: "LLMコンテナイメージでLazy Pullingの効果を検証"
date: 2025/06/26 00:00:00
postid: a
tag:
  - LLM
  - コンテナ
  - Docker
  - KubeCon
  - CNCF
category:
  - DevOps
thumbnail: /images/2025/20250626a/thumbnail.png
author: 鈴木崇史
lede: "ECSなどでコンテナの起動を高速化することを目標に、イメージを遅延して読み込むLazy-pullingな技術に目を向け、LLMコンテナに対し効果があるのかどうかを検証していきます。"
---
# はじめに

最近仕事でLLMサーバーを構築することになりました。

雰囲気をお伝えすると、HuggingFaceの `transformers` をFastAPIのようなフレームワークでラップしたものです。

```python
from fastapi import FastAPI, Request
from transformers import pipeline

app = FastAPI()

generator = pipeline("text-generation", model="Qwen/Qwen2-0.5B-Instruct")

@app.post("/generate")
async def generate(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "")
    result = generator(prompt, max_new_tokens=50)
    return {"output": result[0]["generated_text"]}
```

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "生命、宇宙、そして万物についての究極の疑問の答え"}'


# 42という答えを期待していたのですが、軽量モデルだからか無理でした
{"output": "生命、宇宙、そして万物についての究極の疑問の答えを探求します。あなたは「あなたの世界」をどのように描いていますか？何がその世界に存在するのか、そしてそれがどのような形で存在しているのか？そし"}
```

これらをECSでホストするべく Python のベースイメージでコンテナ化したのですが、LLM関連のパッケージをインストールしたコンテナイメージは非常に大きくなります。

例えば、 `huggingface/transformers-pytorch-gpu` は約10GBです。

```sh
# nerdctl  images
REPOSITORY                              TAG       IMAGE ID        CREATED           PLATFORM       SIZE       BLOB SIZE
huggingface/transformers-pytorch-gpu    latest    f0a0db1c2168    23 minutes ago    linux/amd64    18.66GB    9.746GB
```

中身を調べてみるとcudaやpytorchなどが重量級です。

```sh
4.8G    /usr/local/cuda-12.6
2.7G    /usr/local/lib/python3.10/dist-packages/nvidia
1.6G    /usr/local/lib/python3.10/dist-packages/torch
```

さらに私の場合、モデルの重みをイメージに同梱していたためサイズが肥大化していました。コンテナイメージサイズの削減を頑張るべきかもしれません。例えば思い付きですが、モデルの重みはイメージに含めずにボリュームとして切り出してマウントするなどが考えられます。

しかし、今回はECSなどでコンテナの起動を高速化することを目標に、イメージを遅延して読み込むLazy-pullingな技術に目を向け、LLMコンテナに対し効果があるのかどうかを検証します。

[CNCF連載](/articles/20250626a/) ということで取り上げるのはGraduatedなプロダクトである[containerd](https://containerd.io/)です。

# containerdとSnapshotter

`docker run`したときの処理の流れをざっくりおさらいすると、

1. イメージを取得して展開
2. ファイルシステムをホストと分離
3. いろいろ名前空間を分離しつつプロセスを起動する

...です。この上半分くらいを担当するのがcontainerdに代表されるCRIランタイムというものです。DockerやKubernetesの影にいます。

containerdの機能はpluggableです。例えば 下半分くらいを担当するOCIランライムはOCIランタイム仕様に則っていれば切替可能です。

今回着目するイメージの展開やファイルシステムを管理するコンポーネントは[Snapshotter](https://github.com/containerd/containerd/blob/main/docs/snapshotters/README.md)と呼ばれ、これも差し替え可能になっています。

デフォルトはoverlayfsですが、lazy pull対応のsnapshotter([Remote Snapshotter](https://github.com/containerd/containerd/blob/main/docs/remote-snapshotter.md)といいます）に差し替えることでその機能を利用する形です。

Snapshotterはデーモンとして起動させunix domain socketごしにcontainerdと通信します。

# Lazy Pullingとは

通常のコンテナ起動では、イメージ全体をダウンロードしてから展開・プロセス起動という流れですが、コンテナ起動時に全てのファイルが必要なわけじゃないよね、という観察があります。

この手のツールのREADMEでよく参照されている[Harter et al.](https://www.usenix.org/node/194431)によると、コンテナ起動時間の76％がイメージダウンロードに費やされている一方、実際にコンテナが開始するのに必要なデータは平均で6.4％だそうです。

なので、Remote Snapshotterは初回起動時は必要なファイルだけをpullしてプロセスを開始してしまいます。レジストリはFUSEを介してマウントしておき都度取得する、という仕組みです。

ところでコンテナイメージのレイヤーのフォーマットであるtar.gzにおいては、全てのファイルを展開せずに特定のファイルのみにアクセスし取得する、ということができません。イメージのレイヤー内のすべてのファイルがtarにアーカイブgzipで圧縮されており団子状態なためです（Seekableではないという言い方をします)。

ということでRemote Snapshotterを使うにはコンテナイメージをSeekableなイメージに変換する必要があったり、どのファイルがどのレイヤーのどのオフセットに含まれているのかのインデックスをメタデータとして持たせたりする必要があります。

<img src="/images/2025/20250626a/overview01.png" alt="overview01.png" width="1200" height="677" loading="lazy">

*[Containerd Stargz Snapshotter Plugin Overview](https://github.com/containerd/stargz-snapshotter/blob/main/docs/overview.md)*

今回検証するのは以下の2つです。

[stargz-snapshotter](https://github.com/containerd/stargz-snapshotter)

- eStargzというイメージフォーマットでlazily-pullableを実現します

[soci-snapshotter](https://github.com/awslabs/soci-snapshotter)

- AWSが提供していてECS・Fargateで使えます
- AWSのブログは[こちら](https://aws.amazon.com/jp/blogs/news/under-the-hood-lazy-loading-container-images-with-seekable-oci-and-aws-fargate/)

# 実験してみた

LLMで文を生成するスクリプトをコンテナ化し、レジストリにpushしておき、以下の3パターンのsnapshotterで`docker run`の時間を計測しました。

- overlayfs: 通常のsnapshotter
- stargz-snapshotter
- soci-snapshotter

## 検証環境構築

今回の検証環境はこんな感じです。

`docker run`するホスト

- EC2
- m5.large
- Ubuntu
- 東京リージョン

コンテナレジストリ

- ECR
- 東京リージョン

今回LLMを実行しますが、GPUは使わないことにしました。

containerdとそのクライアントのnerdctl(docker CLIのようなもの)などをインストールします。このあたりはcontainerdのgetting startedの手順通りです。
https://github.com/containerd/containerd/blob/main/docs/getting-started.md

snapshotter設定をstargz-snapshotterを例にざっくり記載すると、まずsnapshotterをインストールしてデーモンとして起動します。

```bash
tar -C /usr/local/bin -xvf stargz-snapshotter-${version}-linux-${arch}.tar.gz containerd-stargz-grpc ctr-remote
wget -O /etc/systemd/system/stargz-snapshotter.service https://raw.githubusercontent.com/containerd/stargz-snapshotter/main/script/config/etc/systemd/system/stargz-snapshotter.service
systemctl enable --now stargz-snapshotter
```

conatinerdのconfigを設定してデーモンを再起動します。

```toml /etc/containerd/config.toml
version = 2

# Enable stargz snapshotter for CRI
[plugins."io.containerd.grpc.v1.cri".containerd]
  snapshotter = "stargz"
  disable_snapshot_annotations = false

# Plug stargz snapshotter into containerd
[proxy_plugins]
  [proxy_plugins.stargz]
    type = "snapshot"
    address = "/run/containerd-stargz-grpc/containerd-stargz-grpc.sock"
```

```bash
systemctl restart containerd
```

soci-snapshotterも大体同様です。

## 実験用のコード

LLMのモデルをロードし、文を生成させるだけのスクリプトを用意します。

```py
from transformers import pipeline

pipe = pipeline(task="text-generation", model="Qwen/Qwen2-0.5B-Instruct")
out = pipe("生命、宇宙、そして万物についての究極の疑問の答え", max_new_tokens=20)[0]['generated_text']
print(out)
```

コンテナのエントリポイント用のスクリプトを用意します。イメージをpullする速度とPython実行の速度を分けて計測したい意図でshellscriptでラップすることにしました。

```bash
#!/bin/bash
set -e

echo "=== [START] $(date --iso-8601=seconds) ==="
START=$(date +%s)

time python run.py

END=$(date +%s)
echo "=== [END] $(date --iso-8601=seconds) ==="
echo "Duration: $((END - START)) seconds"
```

以上をコンテナ化します。ここでLLMのモデルをあらかじめpullしてイメージに同梱しておきます。アンチパターンな気もしますが...。
```dockerfile
FROM python:3.11-slim

RUN apt update && apt install -y git && \
    pip install --no-cache-dir torch transformers

# キャッシュとしてモデルを事前にpullして含める
RUN python -c "from transformers import pipeline; \
    pipeline(task='text-generation', model='Qwen/Qwen2-0.5B-Instruct')"

WORKDIR /app
COPY run.py .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
```

ちなみにイメージサイズは5GBくらいでした。

```sh
nerdctl  images
REPOSITORY                                           TAG               IMAGE ID        CREATED        PLATFORM       SIZE       BLOB SIZE
foobar.dkr.ecr.ap-northeast-1.amazonaws.com/foobar    overlayfs    728928885b94    9 hours ago    linux/amd64    7.929GB    4.755GB
```

それぞれのsnapshotterに対応させるためイメージフォーマットの変換や、インデックスの作成します。

```bash
# stargz フォーマットに変換
nerdctl image convert --estargz --oci foobar.dkr.ecr.ap-northeast-1.amazonaws.com/foobar  :latest foobar.dkr.ecr.ap-northeast-1.amazonaws.com/foobar:estargz
nerdctl push foobar.dkr.ecr.ap-northeast-1.amazonaws.com/foobar:estargz
```

## 計測項目

以下を計測します。

1. イメージpull + containerd初期化時間（`time nerdctl run`）
2. コンテナ内でLLMが起動して実行終了するまでの時間（entrypoint.shで計測）

各snapshotterでの実行コマンドは以下の通りです。

```sh
# overlayfs（通常）
time nerdctl --snapshotter=overlayfs run --rm \
  foobar.dkr.ecr.ap-northeast-1.amazonaws.com/foobar:overlayfs

# stargz
time nerdctl --snapshotter=stargz run --rm \
  foobar.dkr.ecr.ap-northeast-1.amazonaws.com/foobar:stargz

# soci
time nerdctl --snapshotter=soci run --rm \
  foobar.dkr.ecr.ap-northeast-1.amazonaws.com/foobar:soci
```

# 結果

結果はこんな感じでした。

| snapshotter | pull時間 | LLM実行時間 | 合計時間 |
| ----------- | -------- | ----------- | -------- |
| overlayfs   | 101.8s   | 9.6s        | 111.4s   |
| stargz-snapshotter      | 1.4s     | 195.1s      | 196.5s   |
| soci-snapshotter        | 0.5s     | 73.5s       | 74.0s    |

sociは速くなってますが、stargzはむしろ遅くなってますね！

結局イメージサイズに対し支配的なcudaやpytorch系のライブラリへのアクセスが必要なので、総実行時間としてはガンっと速くなったりはせずむしろ遅くなるケースもあるということなんでしょうか。チューニングの余地はありそうです。

検証は若干いい加減なので追試が待たれます。

ちなみに `echo hello` みたいなコマンドを実行させるケースだと stargz、sociは一瞬で終了しました。試してないですがWebサーバーの起動などだと、遅延読み込みの嬉しさが感じられるのかもしれません。

```sh
# stargz
time nerdctl --snapshotter=stargz run --rm \
  foobar.dkr.ecr.ap-northeast-1.amazonaws.com/foobar:stargz echo hello
```

# おわりに

LLMサーバーをホストするにあたって、コンテナ起動を高速化するLazy-pulling技術について検証しました。sociはAWSで導入しやすいし効果もありそうなのでいいなと思いました。

本ブログのネタの構成には以下のKubeCon + CloudNativeCon Japan 2025セッションを参考にしました（現地参加しておらず見ていないのですが）。

- [KubeCon + CloudNativeCon Japan 2025: Zero-Extraction Cold Starts: How FUSE-St...](https://kccncjpn2025.sched.com/event/1x70f/zero-extraction-cold-starts-how-fuse-streaming-slashed-comfyui-cold-starts-by-10x-fog-dong-bentoml?iframe=no&w=100%&sidebar=yes&bg=no)

KubeConセッションと同じ内容のブログ記事も公開されています。

- [25x Faster Cold Starts for LLMs on Kubernetes](https://www.bentoml.com/blog/25x-faster-cold-starts-for-llms-on-kubernetes)
