---
title: "ServiceNow+Terraform(+Go) によるインフラ構築自動化"
date: 2020/04/16 21:30:49
postid: ""
tag:
  - Terraform
  - Go
  - ワークフロー
category:
  - DevOps
thumbnail: /images/2020/20200416/thumbnail.png
author: 西田好孝
lede: "さて、皆さん、ServiceNow(以降：SNOW)というSaaSはご存知でしょうか？Salesforceと非常によく似ておりますが、米国発の SaaS, aPaaS サービスです。米国では割とポピュラーなサービスとして位置づけられていますが、日本ではまだまだです。が、伸び率は今年度は4割近くと、利用ユーザがすごい勢いで伸びています。そんな中、お客様内でSNOWを利用していて、それと関連する領域をFutureが担当するケースも増えてくるかと思いますので、今回は本ブログでSNOWについて少しだけ紹介したいと思います。SNOW とは？の説明は、言葉だけだと概念過ぎてわかりづらいので、現状、私が直面している課題の解決案ベースで解説していきたいと思います。"
---

# はじめに

こんにちは、TIGのDXユニットの西田です。前職ではServiceNowというaPaaS上でのアプリケーション開発をしておりました。現在は、GCPインフラの設計・構築をTerraform, Ansibleを利用して開発しております。GCP, ServiceNow ともに資格を持っています。

さて、皆さん、ServiceNow(以降：SNOW)というSaaSはご存知でしょうか？ Salesforceと非常によく似ておりますが、米国発の SaaS, aPaaS サービスです。米国では割とポピュラーなサービスとして位置づけられていますが、日本ではまだまだです。が、伸び率は今年度は4割近くと、利用ユーザがすごい勢いで伸びています。そんな中、お客様内でSNOWを利用していて、それと関連する領域をFutureが担当するケースも増えてくるかと思いますので、今回は本ブログでSNOWについて少しだけ紹介したいと思います。SNOW とは？ の説明は、言葉だけだと概念過ぎてわかりづらいので、現状、**私が直面している課題の解決案ベースで解説**していきたいと思います。

# 課題設定

- 課題（1）
  - 昨今、会社内でのITシステムの開発体制って、以下の様なケースが多くないですか？
    - 事業部門がアプリケーション開発ベンダーを直接雇っている。情シス部門は関知していない。
    - 情シス部門（インフラ部門）はインフラのみ（主にサーバ）を提供する。
    - セキュリティ部門（or 品質保証部）が別で存在し、それらの監査・チェックを担当している。
  - インフラの準備は、組織が分かれているため、**組織間の仕事の受け渡しが主に打合せ & Excel & メール**で発生している。
  - 現状、これらの組織間調整がとてもレガシーで非効率である事はみんな課題意識はあるが、解決方法がよくわからない。
- 課題（2）
  - **インフラ構築の依頼作業は単純作業が多く、6割方はコピー&ペーストして名前を変える**程度。
  - 設計が必要なインフラ構築だけにリソースを割きたい。

# ソリューションの概要

上記のすべての問題を解決出来るわけではないですが、SNOW と Terraform を使った自動化の仕組みを例に取って、PoCレベルで組んでみます。各製品/ツールの役割分担は以下です。

- SNOW：人の動き（リクエスト、承認フロー）を自動化する
- Terraform：インフラの構築を自動化する
- Go：インタフェース役

<img src="/images/2020/20200416/photo_20200416_01.png" loading="lazy">

### 作るコンポーネント（上の図の番号と紐づいています）

1. SNOW の Service Catalog を利用し、準備するインフラをメニュー化する（簡単な＆頻繁なリクエストのみ）
2. Terraform の各種実行と、承認を順番に実施するワークフローを実行するFlowDesignerを作る。
3. Infra構築を担う Terraform は、GCP Project 単位にディレクトリを切り、inventory 書き換えだけで terraform plan, terraform apply が出来るファイル構成にする（地味にこれが一番頭を使いました…）
4. FlowDesigner からの API に応対し、Terraform の inventory を作り、コマンドの実行結果を返す API-SV を Go で作る。

4に関しては、**SNOW の API リファレンスのサンプルコードは基本 Python** なので、そっちの方がベターです。本記事では、単にGoを書きたかったので、Goを採用しています。
また、最初に申し上げておきますが、分量の関係で全ての実装方法を画像やコードで丁寧に記載する事が難しいです。もちろん核となる箇所は極力丁寧に記載していきます。

### 本記事で取り上げるインフラ構築のシチュエーション

**アプリチームからのインスタンス構築依頼を受けてGCEを用意** というシチュエーションを例にします。以下が前提です。

- GCE のマシンタイプやリージョン・ゾーンなどは基本パターンが存在するものとする。
  - n1-standard-1, asia-northeast1-a, centos-7 など
- プロジェクトはすでに存在している。
- よって、プロジェクト名・インスタンス名、くらいしかユーザに指定させるパラメータがない。

実装方法にそこまで興味がない方は、[動作確認](/articles/20200416/#%E5%8B%95%E4%BD%9C%E7%A2%BA%E8%AA%8D) だけご覧になれば OK です。
っていうかむしろ、先に [動作確認](/articles/20200416/#%E5%8B%95%E4%BD%9C%E7%A2%BA%E8%AA%8D) を見た方がゴールが明確化して読みやすくなるのでおススメです。

# 1. インフラ構築のリクエストをメニュー化する @ SNOW

本来ならこの**メニュー化する対象の作業は何か？ を決める**のが非常に大変ですよね。今回は GCE のリクエストを例にします。

## SNOW の環境準備

[developerサイト](https://developer.servicenow.com/) でインスタンスを準備。最新版のOrlando(出たばかり！ )を使ってます。
払いだされたインスタンスに admin でログインしてください。
少しだけ宣伝交じりですが、この developer インスタンスはアカウントを作れば誰でも発行できます。6時間触らないと sleep、10日触らないと消えます（でもリストア可）。本来はライセンス費用を払わなければならないあらゆる機能が全て無料で使えるので、とてもおススメです！

## Service Catalog を作成する

### Category の作成

`Maintain Categories`をクリックし、Newを押下する。
<img src="/images/2020/20200416/1.png"  class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

### item の作成

`Maintain Items` をクリックし、Newを押下する。
前述の通り、プロジェクトとインスタンス名をvariablesに設定します。この例では、Projectはカスタムテーブルを作って参照形式にしました。
<img src="/images/2020/20200416/2.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/3.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/4.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

ちなみに、色んなパトロールの方から『Application scopeは別で切るべきだ』と絶対に言われますが、本来なら私もそうします。今はそこは本質じゃないからGlobalのまま行きます。

# 2. Terraform Server にリクエストを送り、各種承認を回すFlowDesigner @ SNOW

Flow Designer の前に、Terraform の実行結果を格納するテーブルを作っておきましょう。作ったのはこんな感じです。
<img src="/images/2020/20200416/4.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/5.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

それではいよいよ Flow Designer です。`Flow Designer` → `Designer` をクリック。右上のNew で新しい Flow を作ります。
以下の様にフローを組みます。スペースの関係で、細かいパラメータまでは取っていませんが、大枠の処理をコメントで書き込みました。
<img src="/images/2020/20200416/photo_20200416_02.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

Terraform Server に送るためのアクションの定義は以下です。大した事やっていません。
<img src="/images/2020/20200416/7.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/8.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/9.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

最後に作った Flow Designer を GCE インスタンスのメニューに紐づけます。
<img src="/images/2020/20200416/10.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

これで SNOW の準備は終わりです。大した事はなかったです。

# 3. Terraform のディレクトリとファイル構成 @ Terraform Server

さて、地味に一番苦労した Terraform の構成です。何が難しかったかというと...

- 自動的に構築対象のインスタンス（インベントリ）が増えるのに対して、GCE の tf ファイル自体を Go が作るのは簡単だが、それだと可読性が著しく下がり、同じプロジェクトに対して個別対応が入った際に、運用者にかなりの負担を強いる
- よって、tfファイルの定義はメニューに対して1つだけ用意し、インベントリ分だけループしてインスタンスを作るファイル構成にしたい。
- 一方で、構築メニューは互いに依存させたくないので、GCE, GCS 毎にインベントリファイルを持たせたい。
- しかし、tfvars は 1 ファイルしか許容されていないので、temporary として各メニュー毎に tfvars を作り、それをファイル結合する方法を選択した。

...言葉だけじゃわからないですよね。。ディレクトリ構成は以下です。

```bash tree
/terraform
├── project-a
│   ├── compute_instance.tf         # ← GCEのインスタンス定義。
│   ├── storage_bucket.tf
│   ├── terraform.tfvars            # ← 自動生成されるterraform の変数ファイル
│   ├── tfplan.sh                   # ← plan実行用。bashの色を付けるための特殊文字を消すsedがパイプされている
│   ├── tfapply.sh                  # ← 同上
│   ├── variables.tf                # ← メニュー化しているリストを定義。メニューが変わらない限りstatic
│   ├── vars                        # ← Go が使う、インベントリファイル組み立ての作業用dir
│   │   ├── compute_instance.tfvars # ← GCE のインベントリリスト
│   │   ├── filejoin.sh             # ← cat ./*.tfvars > ../terraform.tfvars と書かれているだけ
│   │   ├── project.tfvars          # ← GCP Project の変数定義ファイル
│   │   └── storage_bucket.tfvars   # ← GCS のインベントリリスト
│   └── version.tf
└── project-b
    ├── 同上
```

コアな部分をまずは説明しますね。

```tf compute_instance.tf
resource "google_compute_instance" "GCE_instances" {
  count        = length(var.gce_instances_list)
  name         = var.gce_instances_list[count.index]
  machine_type = "n1-standard-1"
  zone         = "asia-northeast1-a"
  tags         = ["app01"]
  project      = var.project.id

  boot_disk {
    auto_delete = false
    source      = google_compute_disk.GCE_disk[count.index].self_link
  }

  network_interface {
    network       = "default"
  }

  metadata = {
    enable-oslogin = "true"
  }
}

resource "google_compute_disk" "GCE_disk" {
  count   = length(var.gce_instances_list)
  name    = "${var.gce_instances_list[count.index]}-disk"
  project = var.project.id
  zone    = "asia-northeast1-a"
  type    = "pd-standard"
  size    = 30
  image   = "centos-cloud/centos-7"

  lifecycle {
    ignore_changes = [labels]
  }
}
```

```tf variables.tf
variable "project_suffix" {}
variable "project" {}
variable "gce_instances_list" {}
variable "gcs_buckets_list" {}
```

```tf terraform.tfvars
gce_instances_list = [
  "test-instance-11"
]
project_suffix = "project-a"
project = {
  name = "project-a"
  id   = "project-a"
}
gcs_buckets_list = [
  "test-bucket01"
]
```

まず、**GCE の定義はこのメニュー化された 1 つの tf ファイルだけ**です。それを変数のリスト分だけ loop で回してリソースを作っています。[前原さんの記事](/articles/20190819/)を参考にしています。

ただ今回は、この **loopの要素を Go が自動で生成しなければならない** ということなんです。
そして、**GCE と GCS は別メニューだから、お互いに干渉したくない** ということなんです。
Go で書き切る手段もあったんですが、**実装をリーズナブルにするためにファイルを分けて bash で結合する方法を選択**しました。それが vars ディレクトリ配下のお話です。

```tf vars/compute_instance.tfvars
gce_instances_list = [
  "test-instance-11"
]
```

```tf vars/storage_bucket.tfvars
gcs_buckets_list = [
  "test-bucket01"
]
```

```tf vars/project.tfvars
project_suffix = "project-a"
project = {
  name = "project-a"
  id   = "project-a"
}
```

```sh vars/filejoin.sh
cat *.tfvars > ../terraform.tfvars
```

よって、Go は GCE, GCS のメニュー毎に対応する vars/ 配下の tfvars ファイルにだけ要素を追加し、filejoin.sh を叩けば Terraform 系のファイルは揃うという事になります。Go でファイル操作は頑張らない（笑）

# 4. FlowDesigner からのリクエストを応じて Terraform を実行し、結果を返す @ Terraform Server

さて、SNOW と Terraform の間をつなぐ API-SV の Go です。
処理を整理すると、以下です。

1. SNOW(FlowDesigner)からの Rest API の受け口を作る。
2. SNOW から受け取るパラメータは、Project名とインスタンス名だけである（SNOW の CMDB を本格利用すればそうでもないですが、構成管理は Terraform でコード化されているから、SNOW ではやらない。フロントエンドに徹する）。
3. Terraform の Project ディレクトリの GCE, GCS に対応する tfvars ファイルに受け取ったリソース名を書き込む。
4. vars/filejoin.sh を実行する。
5. terraform plan を実行し、結果を返す。

始めに言い訳しておきますが、初めて Go を書いた関係で、あまりソースコードには自信がありません。
本質的に必要な部分だけを書いているので、エラー処理・認証・暗号化の処理も実装していないので、検証用途と割り切って見てください。

```go api-sv.go
package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httputil"
	"os"
	"os/exec"
	"strings"
)

const TF_PATH = "/terraform"
const TF_VARDIR = "vars"
const TF_GCE_TFVARS = "compute_instance.tfvars"
const TF_GCS_TFVARS = "storage_bucket.tfvars"

type GCEInstanceRequest struct {
	Action      string `json:"action"`
	GCEInstance struct {
		GCPProjectName  string `json:"GCP_project_name"`
		GCPInstanceName string `json:"GCE_instance_name"`
	} `json:"GCE_instance"`
}

func main() {
	http.HandleFunc("/gce_instance", handleGCEInstance)
	// http.HandleFunc("/gcs_bucket", handleGCSBucket) // スペースの関係で一旦作りません…m(_ _)m
	http.ListenAndServe(":8080", nil)
}

// /gce_instance に POST された時に実行される関数
func handleGCEInstance(w http.ResponseWriter, r *http.Request) {

	// request body のパースと値の取得
	b, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer r.Body.Close()

	var req GCEInstanceRequest
	if err = json.Unmarshal(b, &req); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	// Debug用
	fmt.Printf("Request: %+v", req)

	// plan の時だけ、gce 用の terraform の tfvars に追加する
	if req.Action == "plan" {
		addGCETfvars(req.GCEInstance.GCPProjectName, req.GCEInstance.GCPInstanceName)
	}

	strtemp := execTF(req.GCEInstance.GCPProjectName, req.Action)
	fmt.Fprintf(w, strtemp)
}

// terraform の gce instance の tfvars にリクエストされた instance を追加する
func addGCETfvars(project, gce_instance string) {

	tfvarpath := TF_PATH + "/" + project + "/" + TF_VARDIR
	tfvarsFile := TF_PATH + "/" + project + "/" + TF_VARDIR + "/" + TF_GCE_TFVARS

	raw, err := ioutil.ReadFile(tfvarsFile)
	if err != nil {
		// エラー処理
	}
	fmt.Println(tfvarsFile + " read success")

	// 最初の"["までの文字列を捨て、arrayに変換
	filetext = filetext[strings.Index(string(raw), "["):]
	var strarr []string
	if err := json.Unmarshal([]byte(filetext), &strarr); err != nil {
		// エラー処理
	}

	// すでにインスタンスが登録されている場合のエラー処理は省略する
	// 新しいインスタンスを登録する。
	strarr = append(strarr, gce_instance)

	// output to file
	file, err := os.Create(tfvarsFile)
	if err != nil {
		// エラー処理
	}
	defer file.Close()

	// gce の tfvars を出力する。
	output := "gce_instances_list = [\n"
	for ii := 0; ii < len(strarr)-1; ii++ {
		output = output + "  \"" + strarr[ii] + "\",\n"
	}
	output = output + "  \"" + strarr[len(strarr)-1] + "\"\n]\n"
	file.Write(([]byte)(output))

	// 各varsファイルを連結して、terraform.tfvarsにまとめる。
	cmd := exec.Command("sh", "filejoin.sh")
	cmd.Dir = tfvarpath
	out, err := cmd.Output()
	fmt.Println(string(out))
}

// terraform plan を実行して、stdout を戻り値で返す関数
func execTF(project, action string) string {
	tfpath := TF_PATH + "/" + project

	var shellscript string
	if action == "plan" {
		shellscript = "tfplan.sh"
	} else if action == "apply" {
		shellscript = "tfapply.sh"
	}

	cmd := exec.Command("sh", shellscript)
	cmd.Dir = tfpath
	out, _ := cmd.Output()
	return string(out)
}
```

```sh tfplan.sh
terraform plan -no-color
```

```sh tfapply.sh
terraform apply -auto-approve -no-color
```

`-no-color` オプションで terraformコマンドの出力する特殊文字を無効化して、単純な文字列にしています。

また、わざわざshを作り、それをGoで実行する様にしたのは、複数の引数指定でos/execがうまく動作しなかったからです。[こちらの記事](https://qiita.com/tng527/items/c44b943da93041a8355b)の最後を参考にしました。

# 動作確認

### ユーザの操作

Service Catalog のダッシュボードに、GCP infra の ウィジェット を追加すると、以下の様になります。
<img src="/images/2020/20200416/u1.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/u2.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

画面ではGCSも追加しています。手順はGCEの時と全く同じです。
<img src="/images/2020/20200416/u3.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/u4.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

Shoppingっぽくなっているのは、あんまり気にしないでください。SaaSで細部を気にし始めると工数が跳ね上がります（※初期構築だけ考えるとそうでもないですが、保守や機能拡張を考えると雪だるま式に増えます）。

これだけでユーザのリクエストは完了です。本当にパラメータを2つ入れるだけ。

### リクエストの状態を確認

リクエストされたアイテムを見ると、自分の上司で止まっているのが確認できます。
<img src="/images/2020/20200416/u5.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/u6.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

FlowDesingnerは非常に強力な機能で、すべての実行ログを記録していますので、それで状態を確認してみます。すると、確かに1つ目のapprovalで止まっていますね。
<img src="/images/2020/20200416/u7.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

Terraform の実行ログを見てみましょう。この結果からすると、良さそうですね。
<img src="/images/2020/20200416/u8.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/u9.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

### 承認を回す

それじゃあ、上司のアカウントでログインして、承認しましょう。
<img src="/images/2020/20200416/u10.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/u11.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

1つ進みましたね。画像はつけてないですが、この画面からTerraformの実行plan結果のレコードには遷移出来るので、上司も確認できます。
そんな感じで、みんなに承認してもらいましょう。

<img src="/images/2020/20200416/u12.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

なぜか名前に既視感がありますねぇ…不思議…

### apply の結果を見てみる

これで承認が回ったので GCE がデプロイ（アプリ-Tにデリバリー）されているはずです。早速関連リストからTerraformの実行ログを見てみましょう。
<img src="/images/2020/20200416/u13.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/u14.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">
<img src="/images/2020/20200416/u15.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

来ましたね！ 同時実行とか、変更・削除はどうするのかとか色々ありますが、とりあえずPoCとしては完成！

# 結局 ServiceNow とは何か？

ServiceNow社的には、以下をメッセージとして強く主張しています。

- 昨今、消費者に対して提供されている顧客体験は非常に良くなっている(UX, CX)。
- 一方で、企業内の社内システムを含む従業員体験は全く乖離している。自動化は限定的で仕事は手渡し・対面ベース。
- それを同じレベルまで簡単に持っていくのが ServiceNow である。

本記事で取り上げた Service Catalog なんかはまさに当てはまりますよね。事業部門が使う備品の調達と同じ様なノリで GCP のクラウドリソースを注文できる仕組み。それがシステム化されており、承認行為と構築行為がシームレスに行われる。

通常この手の調達をしようと思ったら、インフラとしての申請＆承認行為と、セキュリティとしての申請＆承認行為、そして調達行為は分断されていて、それぞれの部門に対して申請だったり打ち合わせだったりで調整しないといけないですよね。

一方で、私が捉えているイメージは以下です。

**業務目線**

- 複数担当者（特に別組織）間で行われる仕事の受け渡しを、簡単にワークフロー化してシステムに落とせる仕組み。
  - 厳密には ITOM, CMDB などそれに合致しない Plugin もあるが、ITSM, HR, ServiceCatalog など多くはこれ

**技術目線**

- DBのレコード変更をトリガに様々な処理を間に挟む処理を簡単に作れるプラットフォーム。最初のレコード変更がフロントエンドや API などで行われると、そこから他のテーブルへの CRUD や他の API を叩いて結果を導出するなどの仕組みを簡単に作れる。

# 最後に

今回、私にとって最も実装が簡単だったのはSNOWでした。逆に一番大変だったのがGoでの実装です。ただ、こういう製品と製品の間に落ちる部分の処理って、どうしてもカスタム実装が必要になるんですよね。なので、実際のサービス連携を考えた際も同じ様な比率になるんじゃないかと考えています。

まだまだGithubやJenkinsなど課題は多々ありますが、まずは本質的なインフラ構築の自動化を中心に置いて実装してみました。今回利用した製品/サービスは別に他のなんでも代替は可能だと思ってますので、考え方の1つとして捕えてもらえれば幸いです。
