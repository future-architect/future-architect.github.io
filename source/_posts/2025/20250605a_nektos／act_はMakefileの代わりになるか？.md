---
title: "nektos/act はMakefileの代わりになるか？"
date: 2025/06/05 00:00:00
postid: a
tag:
  - Makefile
  - タスクランナー
  - GitHubActions
category:
  - DevOps
thumbnail: /images/2025/20250605a/thumbnail.jpg
author: 真野隼記
lede: "GitHub Actionsをローカル環境で実行できる nektos/act をMakefileやTaskfileなどのタスクランナーの代わりとして使えるのか、試してみた記事です"
---

<img src="/images/2025/20250605a/unnamed.jpg" alt="unnamed.jpg" width="1024" height="1024" loading="lazy">

※画像はGemini Pro 2.5で作成しました。

[CI/CD連載](/articles/20250603a/) 3本目です。

# はじめに

TIG 真野です。

GitHub Actionsをローカル環境で実行できる[nektos/act](https://github.com/nektos/act)をMakefileやTaskfileなどのタスクランナーの代わりとして使えるのか、試してみた記事です。

# nektos/act とは

act は GitHub Actionsのワークフローをローカル上で実行できる、Go言語で実装されたツールです。Dockerを利用してGitHub Actionsの実行環境をエミュレートしてくれ、GitHubのリポジトリにプッシュすることなくワークフローのテストやデバッグを行うことができます。actの名前の由来は、actionsからもらっているんだろうなと思っています。

act のREADMEには以下のようにactを使うべき理由が書かれています。

> Run your GitHub Actions locally! Why would you want to do this? Two reasons:
> - Fast Feedback - Rather than having to commit/push every time you want to test out the changes you are making to your .github/workflows/ files (or for any changes to embedded GitHub actions), you can use act to run the actions locally. The environment variables and filesystem are all configured to match what GitHub provides.
> - Local Task Runner - I love make. However, I also hate repeating myself. With act, you can use the GitHub Actions defined in your .github/workflows/ to replace your Makefile!
>
> **日本語訳**:
> GitHub Actions をローカルで実行しましょう！これを行うべき理由は2つあります：
> - フィードバックを早くする - .github/workflows/ ファイルに加えている変更（または埋め込まれた GitHub Actions への変更）をテストしたいと思うたびにコミット/プッシュをする代わりに、act を使えばアクションをローカルで実行できます。環境変数やファイルシステムは、GitHub が提供するものと一致するようにすべて設定されます
> - タスクランナーとして動かす - 私は make が大好きです。しかし、同じことを繰り返すのも嫌いです。act を使えば、.github/workflows/ で定義された GitHub Actions をあなたの Makefile の代わりに利用できるのです！

2つ目の理由として書かれていた、タスクランナーとして使うという点が意外でした。MakefileかTaskfileあたりで十分良い気もしますが、GitHub Actionsとローカル実行でも利用するコマンド定義を共有できれば確かに便利そうです。

この点で評価している記事が、自分の観測範囲で見つけることができなかったため、CI/CD連載の1ネタとして試します。

# actの使われどころ

[Gitea](https://about.gitea.com/) という、GitHubのセルフホスト可能なGo言語製のプロダクトがあります。類似のツールにGogsも存在しますが、Giteaは元々Gogsからフォークされたものです。理由は[公式の発表ブログ](https://blog.gitea.com/welcome-to-gitea/)があります。

そのGiteaのGitea Actionsは、act （のソフトフォークで、ライブラリ呼び出しなどをできなくしている）で動いているとのことです。Giteaからさらに派生した Forgejoでも Forgejo Runnerで利用されています。

複数のプロダクトからCI/CDランナーとして採用されていることから、完成度も高まっているのではないでしょうか。なお、2025年6月時点ではバージョン `v0.2.78` でした。そもそもがGitHub Actionsの互換を謳っているため、安定性は高いと言えるのではないでしょうか。

# アーキテクチャ

act のアーキテクチャは少し特殊です。Makefileの代わりにと説明があったので、最初はステップの中で `uses: actions/checkout@v4` のような別途コンテナ起動が必要な場合のみ、Docker呼び出しし、その他はホスト上で直接コマンドを実行するのかと思っていました。

実際は、GitHub Actionsと同じくRunner(ランナー)のコンテナイメージをローカルに取得し、そのランナー上でジョブを処理します。ステップの中でDocker呼び出しが必要な場合のみ、ランナーとは別にコンテナイメージを起動させます。データのやり取りはボリューム共有機能を経由して行われます。Docker呼び出しが不要な場合は、ランナーで直接実行します（そのために必要な、Node.jsなどの最低限のセットアップはされています）。

<img src="/images/2025/20250605a/act_arch.drawio.png" alt="actコマンドでコンテナが起動する様子" width="854" height="578" loading="lazy">

上記の構造のため、ちょっとしたスクリプト実行も、上図でいうジョブコンテナの呼び出しが必要です。

# 事前準備

act を利用する上でDockerのインストールは前提条件です。もし、未構築の場合はMac・Windowsの場合はDocker Desktop（Linuxの場合はDocker Engine）をインストールします。

- [Docker Desktop: The #1 Containerization Tool for Developers | Docker](https://www.docker.com/products/docker-desktop/)

# actのインストール

公式ドキュメントにインストールについて独立したページがあり、様々なパッケージマネージャーに対応しています。

- [Installation - act - User Guide | Manual | Docs | Documentation](https://nektosact.com/installation/index.html)

私はGo環境が構築済みだったため、 `go install` で対応します。

```sh
$ go install github.com/nektos/act@v0.2.78
$ act --version
act version 0.2.78
```

helpを見ると、オプションが豊富なことも分かります。

```sh
$ act --help
Run GitHub actions locally by specifying the event name (e.g. `push`) or an action name directly.

Usage:
  act [event name to run] [flags]

If no event name passed, will default to "on: push"
If actions handles only one event it will be used as default instead of "on: push"

Flags:
      --action-cache-path string                          Defines the path where the actions get cached and host workspaces created. (default "/home/mano/.cache/act")
      --action-offline-mode                               If action contents exists, it will not be fetch and pull again. If turn on this, will turn off force pull
  -a, --actor string                                      user that triggered the event (default "nektos/act")
      --artifact-server-addr string                       Defines the address to which the artifact server binds. (default "172.29.0.214")
      --artifact-server-path string                       Defines the path where the artifact server stores uploads and retrieves downloads from. If not specified the artifact server will not start.
      --artifact-server-port string                       Defines the port where the artifact server listens. (default "34567")
  -b, --bind                                              bind working directory to container, rather than copy
      --bug-report                                        Display system information for bug report
      --cache-server-addr string                          Defines the address to which the cache server binds. (default "172.29.0.214")
      --cache-server-external-url string                  Defines the external URL for if the cache server is behind a proxy. e.g.: https://act-cache-server.example.com. Be careful that there is no trailing slash.
      --cache-server-path string                          Defines the path where the cache server stores caches. (default "/home/mano/.cache/actcache")
      --cache-server-port uint16                          Defines the port where the artifact server listens. 0 means a randomly available port.
      --concurrent-jobs int                               Maximum number of concurrent jobs to run. Default is the number of CPUs available.
      --container-architecture string                     Architecture which should be used to run containers, e.g.: linux/amd64. If not specified, will use host default architecture. Requires Docker server API Version 1.41+. Ignored on earlier Docker server platforms.
      --container-cap-add stringArray                     kernel capabilities to add to the workflow containers (e.g. --container-cap-add SYS_PTRACE)
      --container-cap-drop stringArray                    kernel capabilities to remove from the workflow containers (e.g. --container-cap-drop SYS_PTRACE)
      --container-daemon-socket string                    URI to Docker Engine socket (e.g.: unix://~/.docker/run/docker.sock or - to disable bind mounting the socket)
      --container-options string                          Custom docker container options for the job container without an options property in the job definition
      --defaultbranch string                              the name of the main branch
      --detect-event                                      Use first event type from workflow as event that triggered the workflow
  -C, --directory string                                  working directory (default ".")
  -n, --dryrun                                            disable container creation, validates only workflow correctness
      --env stringArray                                   env to make available to actions with optional value (e.g. --env myenv=foo or --env myenv)
      --env-file string                                   environment file to read and use as env in the containers (default ".env")
  -e, --eventpath string                                  path to event JSON file
      --github-instance string                            GitHub instance to use. Only use this when using GitHub Enterprise Server. (default "github.com")
  -g, --graph                                             draw workflows
  -h, --help                                              help for act
      --input stringArray                                 action input to make available to actions (e.g. --input myinput=foo)
      --input-file string                                 input file to read and use as action input (default ".input")
      --insecure-secrets                                  NOT RECOMMENDED! Doesn't hide secrets while printing logs.
  -j, --job string                                        run a specific job ID
      --json                                              Output logs in json format
  -l, --list                                              list workflows
      --list-options                                      Print a json structure of compatible options
      --local-repository stringArray                      Replaces the specified repository and ref with a local folder (e.g. https://github.com/test/test@v0=/home/act/test or test/test@v0=/home/act/test, the latter matches any hosts or protocols)
      --log-prefix-job-id                                 Output the job id within non-json logs instead of the entire name
      --man-page                                          Print a generated manual page to stdout
      --matrix stringArray                                specify which matrix configuration to include (e.g. --matrix java:13
      --network string                                    Sets a docker network name. Defaults to host. (default "host")
      --no-cache-server                                   Disable cache server
      --no-recurse                                        Flag to disable running workflows from subdirectories of specified path in '--workflows'/'-W' flag
      --no-skip-checkout                                  Use actions/checkout instead of copying local files into container
  -P, --platform stringArray                              custom image to use per platform (e.g. -P ubuntu-18.04=nektos/act-environments-ubuntu:18.04)
      --privileged                                        use privileged mode
  -p, --pull                                              pull docker image(s) even if already present (default true)
  -q, --quiet                                             disable logging of output from steps
      --rebuild                                           rebuild local action docker image(s) even if already present (default true)
      --remote-name string                                git remote name that will be used to retrieve url of git repo (default "origin")
      --replace-ghe-action-token-with-github-com string   If you are using replace-ghe-action-with-github-com  and you want to use private actions on GitHub, you have to set personal access token
      --replace-ghe-action-with-github-com stringArray    If you are using GitHub Enterprise Server and allow specified actions from GitHub (github.com), you can set actions on this. (e.g. --replace-ghe-action-with-github-com =github/super-linter)
  -r, --reuse                                             don't remove container(s) on successfully completed workflow(s) to maintain state between runs
      --rm                                                automatically remove container(s)/volume(s) after a workflow(s) failure
  -s, --secret stringArray                                secret to make available to actions with optional value (e.g. -s mysecret=foo or -s mysecret)
      --secret-file string                                file with list of secrets to read from (e.g. --secret-file .secrets) (default ".secrets")
      --use-gitignore                                     Controls whether paths specified in .gitignore should be copied into container (default true)
      --use-new-action-cache                              Enable using the new Action Cache for storing Actions locally
      --userns string                                     user namespace to use
      --var stringArray                                   variable to make available to actions with optional value (e.g. --var myvar=foo or --var myvar)
      --var-file string                                   file with list of vars to read from (e.g. --var-file .vars) (default ".vars")
  -v, --verbose                                           verbose output
      --version                                           version for act
  -w, --watch                                             watch the contents of the local repo and run when files change
  -W, --workflows string                                  path to workflow file(s) (default "./.github/workflows/")
```

# サンプルスクリプト

プロジェクトルートに移動し、GitHub Actionsのワークフローファイルを配置する .github/workflows ディレクトリを作成します。

```sh
mkdir -p .github/workflows
cd .github/workflows
```

今回は、ローカルタスクランナーとしての act を試すため、CI用のワークフローとは別に、ローカル実行専用のワークフローファイル local-tasks.yaml （名前は任意）を作成してみましょう。作成後は `git commit` をしておくと良いです。act側でgitのリビジョン情報などを取得しようとするため、未コミットの場合はWARNログなどでコンソールが埋まってしまうためです。

```yaml .github/workflows/local-tasks.yaml

name: Local Development Tasks

on: [workflow_dispatch] # 手動実行できるようにするため

jobs:
  greet: # hello act するジョブ
    runs-on: ubuntu-latest
    steps:
      - name: Say Hello
        run: echo "🐈️こんにちﾆｬﾝ"
```

`act -j greet` で実行します。

初回はMicro/Medium/Largeのうち、どのランナーで動かすか？ と聞かれますが、`Medium` で良いでしょう。

```sh 実行結果
$ time act -j greet
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock'
[Local Development Tasks/greet] ⭐ Run Set up job
[Local Development Tasks/greet] 🚀  Start image=catthehacker/ubuntu:act-latest
[Local Development Tasks/greet]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=true
[Local Development Tasks/greet] using DockerAuthConfig authentication for docker pull
[Local Development Tasks/greet]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/greet]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/greet]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[Local Development Tasks/greet]   ✅  Success - Set up job
[Local Development Tasks/greet] ⭐ Run Main Say Hello
[Local Development Tasks/greet]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/0] user= workdir=
| 🐈️こんにちﾆｬﾝ
[Local Development Tasks/greet]   ✅  Success - Main Say Hello [115.57099ms]
[Local Development Tasks/greet] ⭐ Run Complete job
[Local Development Tasks/greet] Cleaning up container for job greet
[Local Development Tasks/greet]   ✅  Success - Complete job
[Local Development Tasks/greet] 🏁  Job succeeded

real    0m3.386s
user    0m0.071s
sys     0m0.046s
```

`echo` だけで3秒...。タスクランナーとしてこの時点で利用する可能性が厳しいのでは？ とすでに感じますが、続けます。

続いて、リポジトリ上で `ls -la` をします。ローカル実行とは言え、実体はDockerコンテナ上で動作するため `actions/checkout@v4` をする必要があります。先程の `local-tasks.yaml` の最後に以下を追加します。

```diff .github/workflows/local-tasks.yaml
+  list-files: # ファイル一覧を表示するジョブ
+    runs-on: ubuntu-latest
+    steps:
+      - name: Checkout code # コードをチェックアウトしないとプロジェクトファイルにアクセスできない
+        uses: actions/checkout@v4
+      - name: List current directory
+        run: ls -la
```

`act -j list-files` で実行します。

```sh
$ time act -j list-files
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock'
[Local Development Tasks/list-files] ⭐ Run Set up job
[Local Development Tasks/list-files] 🚀  Start image=catthehacker/ubuntu:act-latest
[Local Development Tasks/list-files]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=true
[Local Development Tasks/list-files] using DockerAuthConfig authentication for docker pull
[Local Development Tasks/list-files]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/list-files]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/list-files]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[Local Development Tasks/list-files]   ✅  Success - Set up job
[Local Development Tasks/list-files] ⭐ Run Main Checkout code
[Local Development Tasks/list-files]   🐳  docker cp src=/home/mano/actsample/. dst=/home/mano/actsample
[Local Development Tasks/list-files]   ✅  Success - Main Checkout code [50.644993ms]
[Local Development Tasks/list-files] ⭐ Run Main List current directory
[Local Development Tasks/list-files]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/1] user= workdir=
| total 16
| drwxr-xr-x 4 root root 4096 Jun  7 00:33 .
| drwxr-xr-x 3 root root 4096 Jun  7 00:33 ..
| drwxr-xr-x 7 root root 4096 Jun  7 00:33 .git
| drwxr-xr-x 3 root root 4096 Jun  7 00:33 .github
[Local Development Tasks/list-files]   ✅  Success - Main List current directory [125.864705ms]
[Local Development Tasks/list-files] ⭐ Run Complete job
[Local Development Tasks/list-files] Cleaning up container for job list-files
[Local Development Tasks/list-files]   ✅  Success - Complete job
[Local Development Tasks/list-files] 🏁  Job succeeded

real    0m3.875s
user    0m0.099s
sys     0m0.055s
```

カレントディレクトリのファイル一覧が表示されました。微妙に実行時間は長くなりました。

ローカルでの実行にあたり、GitHubのシークレット (secrets.GITHUB_TOKEN など) が必要なワークフローの場合、act では --secret MY_SECRET=value や .secrets ファイルを使用してこれらを提供できます。タスクランナーとして使う場合、必ずしもシークレットが多用されるわけではありませんが、覚えておくと良いでしょう。

# 他のランナーで動かすとどうなるのか

[Runners - act - User Guide](https://nektosact.com/usage/runners.html) でmicro, largeで利用しているイメージが記載されています。`-P` オプションで指定できるようです。

おそらく、最軽量のmicroで動かします。

```sh microでの実行結果
$ time act -P ubuntu-latest=node:16-buster-slim -j greet
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock'
[Local Development Tasks/greet] ⭐ Run Set up job
[Local Development Tasks/greet] 🚀  Start image=node:16-buster-slim
[Local Development Tasks/greet]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
[Local Development Tasks/greet] using DockerAuthConfig authentication for docker pull
[Local Development Tasks/greet]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/greet]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/greet]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[Local Development Tasks/greet]   ✅  Success - Set up job
[Local Development Tasks/greet] ⭐ Run Main Say Hello
[Local Development Tasks/greet]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/0] user= workdir=
| 🐈️こんにちﾆｬﾝ
[Local Development Tasks/greet]   ✅  Success - Main Say Hello [101.2046ms]
[Local Development Tasks/greet] ⭐ Run Complete job
[Local Development Tasks/greet] Cleaning up container for job greet
[Local Development Tasks/greet]   ✅  Success - Complete job
[Local Development Tasks/greet] 🏁  Job succeeded

real    0m2.719s
user    0m0.033s
sys     0m0.053s
```

少しだけ早くなりましたが、劇的に高速化とはならないようです。

続いて、large を動かしたかったのですが、イメージが上手く取得できなかったので試していません。ご存じの方がいましたら、Xなどで教えて下さい。

# オフライン実行

act には[オフラインモード](https://nektosact.com/usage/index.html#action-offline-mode)が存在します。ローカルにジョブコンテナやアクションのイメージがキャッシュされていれば、オフラインでも動作可能。原理的に高速化もされます。

```sh オフライン化greetの実行結果
$ time act --action-offline-mode -j greet
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock'
[Local Development Tasks/greet] ⭐ Run Set up job
[Local Development Tasks/greet] 🚀  Start image=catthehacker/ubuntu:act-latest
[Local Development Tasks/greet]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=false
[Local Development Tasks/greet]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/greet]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/greet]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[Local Development Tasks/greet]   ✅  Success - Set up job
[Local Development Tasks/greet] ⭐ Run Main Say Hello
[Local Development Tasks/greet]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/0] user= workdir=
| 🐈️こんにちﾆｬﾝ
[Local Development Tasks/greet]   ✅  Success - Main Say Hello [119.563033ms]
[Local Development Tasks/greet] ⭐ Run Complete job
[Local Development Tasks/greet] Cleaning up container for job greet
[Local Development Tasks/greet]   ✅  Success - Complete job
[Local Development Tasks/greet] 🏁  Job succeeded

real    0m1.073s
user    0m0.074s
sys     0m0.013s
```

2-3倍、性能が改善しました。体感上もこれなら待てます。続いて、checkout@v4 を含んだlist-filesを動かします。

```sh オフライン化list-filesの実行結果
e$ time act --action-offline-mode -j list-files
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock'
[Local Development Tasks/list-files] ⭐ Run Set up job
[Local Development Tasks/list-files] 🚀  Start image=catthehacker/ubuntu:act-latest
[Local Development Tasks/list-files]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=false
[Local Development Tasks/list-files]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/list-files]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/list-files]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[Local Development Tasks/list-files]   ✅  Success - Set up job
[Local Development Tasks/list-files] ⭐ Run Main Checkout code
[Local Development Tasks/list-files]   🐳  docker cp src=/home/mano/actsample/. dst=/home/mano/actsample
[Local Development Tasks/list-files]   ✅  Success - Main Checkout code [34.498731ms]
[Local Development Tasks/list-files] ⭐ Run Main List current directory
[Local Development Tasks/list-files]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/1] user= workdir=
| total 16
| drwxr-xr-x 4 root root 4096 Jun  7 01:29 .
| drwxr-xr-x 3 root root 4096 Jun  7 01:29 ..
| drwxr-xr-x 7 root root 4096 Jun  7 01:29 .git
| drwxr-xr-x 3 root root 4096 Jun  7 01:29 .github
[Local Development Tasks/list-files]   ✅  Success - Main List current directory [122.866479ms]
[Local Development Tasks/list-files] ⭐ Run Complete job
[Local Development Tasks/list-files] Cleaning up container for job list-files
[Local Development Tasks/list-files]   ✅  Success - Complete job
[Local Development Tasks/list-files] 🏁  Job succeeded

real    0m1.164s
user    0m0.059s
sys     0m0.044s
```

こちらも2-3倍高速化しています。これならまだなんとかなるかもしれません。

# それなりに歴史を重ねたリポジトリで動かしてみる

試したリポジトリサイズは以下です。`size-pack` がリモートサーバーにpushされた時のサイズとのことで、1.3GiB程度です。

```sh リポジトリサイズ計測
$ git gc
$ git count-objects -vH
count: 0
size: 0 bytes
in-pack: 188260
packs: 1
size-pack: 1.13 GiB
prune-packable: 0
garbage: 0
size-garbage: 0 bytes
```

これで試してみます。 先程の `act --action-offline-mode -j list-files` を試してみます。

```sh
$ time act --action-offline-mode -j list-files
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock'
[Local Development Tasks/list-files] ⭐ Run Set up job
[Local Development Tasks/list-files] 🚀  Start image=catthehacker/ubuntu:act-latest
[Local Development Tasks/list-files]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=false
[Local Development Tasks/list-files]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/list-files]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/list-files]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[Local Development Tasks/list-files]   ✅  Success - Set up job
[Local Development Tasks/list-files] ⭐ Run Main Checkout code
[Local Development Tasks/list-files]   🐳  docker cp src=/home/mano/myRepo/. dst=/home/mano/myRepo
[Local Development Tasks/list-files]   ✅  Success - Main Checkout code [5.007896049s]
[Local Development Tasks/list-files] ⭐ Run Main List current directory
[Local Development Tasks/list-files]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/1] user= workdir=
| total 236
（中略）
| drwxr-xr-x 18 root root   4096 Jun  9 01:04 tool
[Local Development Tasks/list-files]   ✅  Success - Main List current directory [126.408501ms]
[Local Development Tasks/list-files] ⭐ Run Complete job
[Local Development Tasks/list-files] Cleaning up container for job list-files
[Local Development Tasks/list-files]   ✅  Success - Complete job
[Local Development Tasks/list-files] 🏁  Job succeeded

real    0m6.452s
user    0m0.530s
sys     0m2.852s
```

チェックアウトだけで5秒程度が追加となり、全体で6.5秒程度。リポジトリサイズが増えると厳しい感じがしますね。

# プロキシ、カスタム証明書の読み込みが難しい？

例えば、Goの環境を構築したい場合、以下のように `actions/setup-go` などを呼び出します。しかし、ローカル環境によってはエラーになります。

```diff local-tasks.yaml
+  lint:
+    name: Lint Go Files
+    runs-on: ubuntu-latest
+    steps:
+      - name: Checkout code
+        uses: actions/checkout@v4
+      - name: Set up Go
+        uses: actions/setup-go@v5
+        with:
+          go-version: '1.22'
+      - name: Run vet
+        run: go vet ./...
```

エラーの例です。 `failed to verify certificate: x509: certificate signed by unknown authority` とカスタム証明書を利用している環境において、あるあるなエラーが出ています。

```sh
[Local Development Tasks/Format Go Files] Unable to clone https://github.com/actions/setup-go refs/heads/v5: Get "https://github.com/actions/setup-go/info/refs?service=git-upload-pack": tls: failed to verify certificate: x509: certificate signed by unknown authority
```

カスタムイメージをビルドしたり、ルート証明書を読み込ませたり、SSL VERIFYを無効化などいろいろ試しましたが、残念ながら私の実力では未解決でした。もちろんこの課題が発生すること自体が組織のネットワークポリシー次第であり万人がハマるわけではありません。しかし、ランナーのコンテナが起動する分、環境セットアップが難しくなることは間違いなく、構造上、難易度が高くなるなという印象です。

ちなみに、 `setup-go@v5` を利用せず、個別に定義を書けば成功できました（もはや、GitHub Actionsのお作法からは外れていますが）。

```diff local-tasks.yaml
  lint:
    name: Lint Go Files
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: /workdir

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Set up Go
-        uses: actions/setup-go@v5
-        with:
-          go-version: '1.22'
+        run: |
+          curl -sSL -k -o go.tar.gz https://go.dev/dl/go1.22.4.linux-amd64.tar.gz
+          sudo tar -C /usr/local -xzf go.tar.gz
+          echo "/usr/local/go/bin" | sudo tee -a $GITHUB_PATH
      - name: Run vet
        run: cd backend && go vet ./...
```

なお、上記は curl の部分で `-k` をつけて簡易的に実装しています。プロダクションで用いる場合はカスタム証明書を読み込ませた方がよいでしょう。

actでリンター（`go vet`） を実行して成功した結果です。

```sh 実行結果
$ time act -j lint
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock'
[Local Development Tasks/Lint Go Files] ⭐ Run Set up job
[Local Development Tasks/Lint Go Files] 🚀  Start image=catthehacker/ubuntu:act-latest
[Local Development Tasks/Lint Go Files]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=true
[Local Development Tasks/Lint Go Files] using DockerAuthConfig authentication for docker pull
[Local Development Tasks/Lint Go Files]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/Lint Go Files]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/Lint Go Files]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[Local Development Tasks/Lint Go Files]   ✅  Success - Set up job
[Local Development Tasks/Lint Go Files] ⭐ Run Main Checkout code
[Local Development Tasks/Lint Go Files]   🐳  docker cp src=/home/mano/MyRepo/. dst=/home/mano/MyRepo
[Local Development Tasks/Lint Go Files]   ✅  Success - Main Checkout code [14.494783288s]
[Local Development Tasks/Lint Go Files] ⭐ Run Main Install Go
[Local Development Tasks/Lint Go Files]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/1] user= workdir=
| /usr/local/go/bin
[Local Development Tasks/Lint Go Files]   ✅  Success - Main Install Go [16.761998127s]
[Local Development Tasks/Lint Go Files]   ⚙  ::add-path:: /usr/local/go/bin
[Local Development Tasks/Lint Go Files] ⭐ Run Main Run vet
[Local Development Tasks/Lint Go Files]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/2] user= workdir=
| go: downloading github.com/aws/aws-lambda-go v1.41.0
| go: downloading github.com/rs/zerolog v1.29.0
| go: downloading github.com/go-playground/validator/v10 v10.16.0
（中略）
[Local Development Tasks/Lint Go Files]   ✅  Success - Main Run vet [59.368599077s]
[Local Development Tasks/Lint Go Files] ⭐ Run Complete job
[Local Development Tasks/Lint Go Files] Cleaning up container for job Lint Go Files
[Local Development Tasks/Lint Go Files]   ✅  Success - Complete job
[Local Development Tasks/Lint Go Files] 🏁  Job succeeded

real    1m40.689s
user    0m0.769s
sys     0m3.229s
```

厳しいのは、実行時間が1分40秒かかったというところでしょう。これは `go vet` を実行するためにコンパイルが必要なので、 `go mod download` 相当の処理が動くためです。`go mod` 側のキャッシュをボリュームマウントすれば高速化できると思いますが、逆に言うとそういったチューニングが必要だということです。

ちなみにもし、`go vet` が失敗（違反コードが存在）した場合は exit 1 でジョブが以下のように失敗します。

```sh 失敗例
| # github.com/.../...
| app/my_model.go:30:2: struct field myfields has json tag but is not exported
[Local Development Tasks/Lint Go Files]   ❌  Failure - Main Run go vet [1m2.783279728s]
[Local Development Tasks/Lint Go Files] exitcode '1': failure
[Local Development Tasks/Lint Go Files] ⭐ Run Complete job
[Local Development Tasks/Lint Go Files]   ✅  Success - Complete job
[Local Development Tasks/Lint Go Files] 🏁  Job failed
Error: Job 'Lint Go Files' failed
```

成功/失敗の表示は、タスクランナーとして、特段大きな違和感は無いと思います。

# フォーマットする場合

フォーマットやコード生成などの場合は、ホスト側のコードに反映させる必要があります。この場合、checkout 経由ですと、フォーマット結果を反映できず困ってしまいます。そのため、ボリュームマウントで対応します。ボリュームマウントするので、 checkout のステップは無くすことができます。

`defaults.run.working-directory` に適当なマウント先のフォルダを定義します。

```diff local-tasks.yaml
+  fmt:
+    name: Format Go Files
+    runs-on: ubuntu-latest
+    defaults:
+      run:
+        working-directory: /workdir # マウント先を適当に定義
+    steps:
+      - name: Install Go
+        run: |
+          curl -sSL -k -o go.tar.gz https://go.dev/dl/go1.22.4.linux-amd64.tar.gz
+          sudo tar -C /usr/local -xzf go.tar.gz
+          echo "/usr/local/go/bin" | sudo tee -a $GITHUB_PATH
+     - name: Run gofmt
+        run: gofmt -l -w .
```

実行時は `--container-options` でボリュームマウント定義を渡します。このオプションはドキュメントで探せなかったのですが、 https://github.com/nektos/act/issues/1548 のIssueから見つけました。

act コマンドを実行します。 `--container-options "-v $(pwd):/workdir"` の `/workdir` の値は、さきほどの `local-tasks.yaml` で指定した値と一致させます。

```sh 実行結果
$ time act -j fmt --container-options "-v $(pwd):/workdir"
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock'
[Local Development Tasks/Format Go Files] ⭐ Run Set up job
[Local Development Tasks/Format Go Files] 🚀  Start image=catthehacker/ubuntu:act-latest
[Local Development Tasks/Format Go Files]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=true
[Local Development Tasks/Format Go Files] using DockerAuthConfig authentication for docker pull
[Local Development Tasks/Format Go Files]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/Format Go Files]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[Local Development Tasks/Format Go Files]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[Local Development Tasks/Format Go Files]   ✅  Success - Set up job
[Local Development Tasks/Format Go Files] ⭐ Run Main Install Go
[Local Development Tasks/Format Go Files]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/0] user= workdir=/workdir
| /usr/local/go/bin
[Local Development Tasks/Format Go Files]   ✅  Success - Main Install Go [17.32964836s]
[Local Development Tasks/Format Go Files]   ⚙  ::add-path:: /usr/local/go/bin
[Local Development Tasks/Format Go Files] ⭐ Run Main Run gofmt
[Local Development Tasks/Format Go Files]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/1] user= workdir=/workdir
| backend/my_model.go
[Local Development Tasks/Format Go Files]   ✅  Success - Main Run gofmt [711.356576ms]
[Local Development Tasks/Format Go Files] ⭐ Run Complete job
[Local Development Tasks/Format Go Files] Cleaning up container for job Format Go Files
[Local Development Tasks/Format Go Files]   ✅  Success - Complete job
[Local Development Tasks/Format Go Files] 🏁  Job succeeded

real    0m20.747s
user    0m0.069s
sys     0m0.111s
```

checkout が無くなった分、高速化したのと、単純に `gofmt` を呼ぶだけ（コンパイルなどは不要）であるため、20秒で終わりました。`--pull=false` や `--action-offline-mode` をつければ、数秒早くできる可能性があります。ちなみに、ホスト上で直接 `gofmt` を呼び出す場合は1～2秒で終わります。

ボリュームマウントですが、ローカルでの実行速度を最優先に考えるのであれば、`actions/checkout@v4` を呼び出さなくて済むため必須かもしれないと思いました。もちろん、代償として GitHub Actions とのコード共有・再利用性は下がります。

# Makefileとの棲み分けは？

リンターやフォーマッタなど、具体的なコマンドはMakefile（Taskfile）に記載し、ローカル開発時にはそれらのタスクコマンドを単純呼び出しできるようにしておく方がデバッグもやりやすいかなと思います。CI/CD定義からはそれらのコマンドを呼び出すだけ、という構成にすると、定義が重複せず保守性を保てるでしょう。

このような棲み分けの概念を壊せないかと、CI/CD定義を直接ローカルで動かせる act を、タスクランナーとして使ってみようという試みでしたが、現時点ではプロキシ・カスタム証明書の問題が解決したとしても、実行時間のオーバーヘッドが大きく微妙です。そもそも、定義の共有自体が私の技術力では微妙な結果に終わってしまいました。そのため、この記事の結論としては、よくローカル開発で実行するコマンドは、 act 経由ではなく引き続きMakefileやTaskfileを利用する方が無難でしょう。

ボリュームマウントの定義などは煩雑なので、何ならMakefileにactの呼び出しコマンドを書いてしまいたいくらいです。

# まとめ

act をタスクランナーとして試しました。

現時点で得た課題感は以下です。

- actでは全てのタスクが、コンテナ上で動くため、起動のオーバーヘッドが1～3数秒かかる
- 1GiB超えのリポジトリの場合は、チェックアウトのみでさらに5秒程度かかる
- 依存ライブラリの解決など毎回実行するには重い処理は、キャッシュが有効だが、そうするとホストとのボリュームマウントなど面倒なチューニングが必要となり、管理コストが上がる
- フォーマットやコード生成など、ホスト側のファイルを書き換えたい場合は `actions/checkout@v4` を行わず、直接リポジトリごとボリュームマウントする必要があり、管理コストが上がる
- プロキシ・カスタム証明書などを前提とする組織ネットワークでは、 `actions/setup-go` などのコマンドがうまく動作しない可能性。そのため、プロキシ問題をトラブルシュート＆解決できる人材・時間が必要

上記、チューニングや環境構築に成功したとしても、GitHub Actions側の `workflows` 定義の共有は難しく、結局、別のファイルとして管理することになりそうということでした。

act 側のナレッジをチームで積んでいけば、性能その他の課題は潰せそうですが、タスクランナーとして利用するのは、それなりの意思決定が必要になりそうな印象です。GitHub Actionsにある程度習熟した人であればもう少し別の見方になるかもしれません。積極的に導入しているよーという方やチームがいらっしゃいましたら、Xなどで教えてください。
