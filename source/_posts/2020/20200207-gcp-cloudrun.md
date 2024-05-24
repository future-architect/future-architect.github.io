---
title: "GCP連載#3 Goでサーバーレスな管理画面アプリを作る"
date: 2020/02/07 10:54:41
postid: ""
tag:
  - Go
  - GCP
  - サーバーレス
  - CloudRun
  - go-chi
category:
  - Programming
author: 澁川喜規
lede: "Go + Vue + Cloud Runでかんたんな管理画面を作ろうと思います。ストレージ側にもサーバーレスがあります。MySQLやPostgreSQLのクラウドサービス（Cloud SQLとかRDS）は、サーバーマシンを可動させて、その上にDBMSが稼働しますので、起動している時間だけお金がかかってしまします。一方、FirestoreやDynamoDBの場合は容量と通信（と、キャパシティユニット）にしかお金がかからないモデルになっており、サーバーレスです。今回はかんたん化のためにストレージは扱いません。"
---
[GCP連載](/articles/20200202/)の3回目です。今回はCloud Runを使ったサーバーレスウェブアプリケーションの作り方について紹介します。

# サーバーレスとは

OSをインストールして、その上にアプリケーションをインストールして・・・みたいなことが必要なく、アプリケーションのコードだけを書けばよく、必要なときに必要なだけスケールするPaaSなアーキテクチャで、インフラコストが完全従量課金、という前提でこの記事では扱っていきます。

GCPで、サーバーレスに使えるコンピュート基盤のサービスはいくつかあります。

| サービス名 | 実行単位 | HTTP | スケジュール | その他イベント |
|:----------:|:-------:|:---:|:------------:|:------------:|
| Cloud Functions  | Goパッケージ | ✔ | Cloud Scheduler| ✔ |
| App Engine (std)  | Goアプリケーション | ✔ | ✔ | |
| Cloud Run | コンテナ  |  ✔ |  Cloud Scheduler | |

このうち、Cloud Funcionsと、AWSのLambdaはライバルのように言われます。実際機能的には似通っています。LambdaはHTTPのサーバーとして公開しようとすると、API Gatewayが必要なぐらいですね。

Cloud RunとFargateもライバルのように言われますが、Fargateは複数のコンテナを組み合わせたタスク単位で実行しますが、Cloud Runは単体のコンテナの実行になり、そこは少し差があります。

今回は、Go + Vue + Cloud Runでかんたんな管理画面を作ろうと思います。ストレージ側にもサーバーレスがあります。MySQLやPostgreSQLのクラウドサービス（Cloud SQLとかRDS）は、サーバーマシンを可動させて、その上にDBMSが稼働しますので、起動している時間だけお金がかかってしまします。一方、FirestoreやDynamoDBの場合は容量と通信（と、キャパシティユニット）にしかお金がかからないモデルになっており、サーバーレスです。今回はかんたん化のためにストレージは扱いません。

# Cloud FunctionsとCloud Runのどちらを使うべきか？

ストレージに書き込まれたタイミングで何かイベントを駆動したいのであればCloud Functions一択ですが、両方でサポートされているHTTPリクエストを受け取るウェブサービスやスケジュールで駆動するイベントを受ける場合にはどちらも使えます。

Cloud Functionsは基本的に、1つのリクエストごとにインスタンスが作られる（正確には1つのインスタンスは同時に1つのリクエストのみを処理する）とドキュメントには書かれています。Cloud Runは同時80接続までは一つのインスタンスで処理できます。Cloud Functionsで大量アクセスがあって起動が頻繁に行われると、DBへのコネクションが新規に大量に張られてトラブルになる可能性があります。AWSではLambda RDS Proxyが提供されはじめていて(MySQLのみ)、LambdaでもRDBを使えるようにという機能が提供され始めていますが、GCPにはまだありません。ウェブアプリケーションを作るならCloud SQLも使えるCloud Runの方が良さそうです。スケジュール駆動のイベントの場合はそんなに並列で走ることはないと思うので、どちらでも良いと思います。

日本語のCloud Runを紹介しているサイトではまだベータ扱いの操作になっているものも多いのですが（本家のGCPの日本語ドキュメントもまだ更新されていない）[Cloud Runは昨年の11月にGAになり](https://cloud.google.com/run/docs/release-notes)、ベータが取れました。SLAも99.95%になっています。

・・・というのは性能指標だけを見た場合の比較ですが、Cloud RunにはVPCに繋げられないという問題があります。今年のうちには使えるようになるらしいです。このエントリーは今後に超期待ということでの先行検証ぐらいに見ておいていただければと思います。Cloud FunctionsをVPCに接続する方法はこのブログの[Let's Try GCP #2 ～Cloud FunctionをVPC connectorと一緒に使ってみる～](/articles/20190927/)で紹介しています。

# Cloud Runで管理画面のウェブサービスを作る

Cloud Runでウェブサービスを作るのは通常のコンテナで動くウェブサービスです。せっかくなのでウェブのUI付きの管理画面を作ってみます。完成品はこちらにあります。

* https://github.com/shibukawa/serverless-sample

管理画面は通常、何か非定常的なイベントが発生したときとか、必要なときにのみ使われるサービスです。そのためにインスタンスを立ち上げっぱなしにしておくのは費用的にもうれしくないですし、限りある地球の資源の浪費です。管理画面はサーバーレスでアプリケーションを作るには最適です。

## ライブラリの選定

今回は次のようなライブラリを選択しました。

* Goでnet/http + [chi router](https://github.com/go-chi/chi)
* Vue.js + TypeScript
    * ビルドした静的ファイルもコンテナの中に入れる
* UI部品は[Material Design WebComponents](https://mwc-demos.glitch.me/demos/)

chiは高速だけども、イベントハンドラ周りは標準のnet/httpと同じものが使えるので、多くのGoユーザーにとって敷居が低いライブラリです。Vueは説明不要ですよね。管理画面といってもそれなりに綺麗な部品を使って画面を作りたいものです。Material Design WebComponentsは[2019年はWebComponents元年(2回目)！WebComponentsをReact/Angular/Vueと一緒に使う](https://qiita.com/shibukawa/items/5a36147ec103d35c1b5e)で紹介したツールキットの1つです。Ionicはすでに使って見たので、今回はこっちを選択。

## プロジェクトのフォルダを作る

Vueのプロジェクトと、Goのプロジェクトを同じフォルダに入れてしまいましょう。Vueの設定はお好みで色々設定しますが、Babel、TS、CSS Preprocessor(dart-sass)、Formatter(Prettier)、Unittest(Jest)を有効にしました(E2EのCypressを有効にするとDockerのビルド時間がめちゃ伸びるので注意)。

```bash
$ cd ~/go/src/github.com/shibukawa
$ npx @vue/cli create serverless-sample
:
⚓  Running completion hooks...

📄  Generating README.md...

🎉  Successfully created project serverless-sample.
👉  Get started with the following commands:
   $ cd serverless-sample
   $ npm run serve

$ cd serverless-sample
$ go mod init
go: creating new go.mod: module github.com/shibukawa/serverless-sample
```

密結合な2つのリポジトリだと、1つのPRをマージするためにはもう片方のPRのマージを待たないいけない、とか運用で苦労することが増えるので、最近はフロントとサーバーはなるべくまとめたい派です。そんでもって、各言語のよく知られている開発の流れに従った方が、キャッチアップも引き継ぎも楽ですよね。あと、変に依存があると、ビルド時に秘密鍵をコンテナの中に・・・とかいろいろ厄介事が増えてDockerが複雑になるのもなるべく避けたい。

## フロントの開発

開発時はJavaScriptの開発サーバーを立てて、Goのサーバーを後ろで動かすのが楽です。近年のフロントはビルドの時間も長いのですが、開発サーバーはコンパイル結果をキャッシュしてライブリロードとかしてくれますので。開発サーバーにはプロキシ機能があるのでこれを有効にします。サーバーを別々に建てると、開発時だけCORSを気にしなきゃいけないとか面倒なことになりますが、同じオリジンならそういうことも気にしなくていいので、フロント、サーバーの同時開発のプラクティスとしては、今のところこれがマイベスト。

```js vue.config.js
module.exports = {
  devServer: {
    proxy: {
      "/api": {
        target: "http://localhost:8888"
      }
    }
  }
};
```

後は通常のTypeScriptでのVueの開発ですが、今回は[2019年はWebComponents元年(2回目)！WebComponentsをReact/Angular/Vueと一緒に使う](https://qiita.com/shibukawa/items/5a36147ec103d35c1b5e)で紹介したUI部品を使います。WebComponentsのタグは``ignoreElements``に登録しておきます。

```ts src/main.ts
Vue.config.ignoredElements = [
  "mwc-drawer",
  "mwc-top-app-bar",
  "mwc-button",
  "mwc-icon-button",
  "mwc-dialog",
  "mwc-textfield"
];
```

Routerでページ切り替えはしたいと思うので（大したページはないけど）切り替えられるようにしました。自分のページにジャンプするときにはドロワーが閉じたりしない方がいいので、クリックイベントで遷移先を確認するようにしています。リンククリック時に``<mwc-drawer>``を閉じたいのですが、デフォルトの動作だとそうならないので、Routerの遷移イベントを拾ってドロワーを閉じるようしています。

```html src/App.vue
<template>
  <mwc-drawer hasHeader type="modal" :open="openDrawer">
    <span slot="title">Drawer Title</span>
    <span slot="subtitle">subtitle</span>
    <div class="drawer-content">
      <p>Drawer content</p>
      <p><a @click="selectPage('/')">Home</a></p>
      <p><a @click="selectPage('/prime')">Prime</a></p>
      <p><a @click="selectPage('/about')">About</a></p>
    </div>
    <router-view />
  </mwc-drawer>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import "@material/mwc-icon-button";
import "@material/mwc-drawer";

@Component
export default class AppComponent extends Vue {
  openDrawer: boolean = false;

  mounted() {
    this.$router.afterEach(() => {
      this.openDrawer = false;
    });
  }

  selectPage(path: string) {
    if (path !== this.$router.currentRoute.path) {
      this.$router.push(path);
    }
    return false;
  }
}
</script>
```

中の画面も1つ作ってみます。数字を入れて、素数かどうかをサーバー判定してダイアログに表示する、という画面です。ページ内部のヘッダーでドロワーを開けるようにする関係で、親のコンポーネントにアクセスしているところはちょっと設計がアレかな、と思いつつ、このためだけにVuexを入れるのもこの規模だと割に合わないのでご勘弁を。

```html src/views/Prime.vue
<template>
  <div slot="appContent">
    <mwc-top-app-bar>
      <mwc-icon-button
        slot="navigationIcon"
        icon="menu"
        @click="toggleDrawer"
      ></mwc-icon-button>
      <div slot="title">Prime</div>
    </mwc-top-app-bar>
    <div class="main-content">
      <div>
        <mwc-textfield
          :value="num"
          @change="onchange($event.target.value)"
          label="Input Number"
        />
      </div>
      <div>
        <mwc-button @click="check()">Is it Prime Number?</mwc-button>
      </div>
    </div>
    <mwc-dialog :open="dialogOpen" @closing="closingDialog">
      <div>{{ this.result }}</div>
      <mwc-button slot="primaryAction" dialogAction="discard">
        OK
      </mwc-button>
    </mwc-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

import "@material/mwc-top-app-bar";
import "@material/mwc-icon-button";
import "@material/mwc-button";
import "@material/mwc-dialog";
import "@material/mwc-textfield";
import AppComponent from '../App.vue';

@Component
export default class AboutPage extends Vue {
  result: string = "";
  num: string = "0";
  dialogOpen: boolean = false;

  onchange(value: string) {
    this.num = value;
  }

  closingDialog() {
    this.dialogOpen = false;
  }

  async check() {
    console.log("後で書く")
  }

  toggleDrawer(e: Event) {
    const parent = this.$parent as AppComponent;
    parent.openDrawer = !parent.openDrawer;
  }
}
</script>
```

サーバーアクセスしない部分はこれで動作可能になりました。

<img src="/images/20200207/photo_20200207_01.png" loading="lazy">

<img src="/images/20200207/photo_20200207_02.png" loading="lazy">


## Goのサーバーを作る

Goのサーバーはnet/httpですが、今回はフロントとの通信はJSON-RPCにしました。標準ライブラリのJSON-RPCはいろいろ制約が強いので、github.com/semrush/zenrpcを使いました。それらをchiのrouterに登録してサーバー起動しておしまい。注意点としては、PORT環境変数を見て、ポートを切り替えられるようにすることです。ついでにHOST環境変数も見てますが、これはChromebookの制約故なので他の人はいらないかもです。

```go main.go
package main

import (
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/semrush/zenrpc"
)

//go:generate go run github.com/semrush/zenrpc/zenrpc

// APIService is a JSON RPC server interface
type APIService struct {
	zenrpc.Service
}

// CheckPrimeNumber returns input value is prime number or not
func (as APIService) CheckPrimeNumber(a int) bool {
	return big.NewInt(int64(a)).ProbablyPrime(0)
}

func main() {
	r := chi.NewRouter()
	rpc := zenrpc.NewServer(zenrpc.Options{
		TargetURL: "/api",
		ExposeSMD: true,
	})
	rpc.Register("", &APIService{})
	r.Handle("/api", rpc)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	host := os.Getenv("HOST")
	fmt.Printf("Open Server at %s:%s\n", host, port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf("%s:%s", host, port), r))
}
```

JSON-RPCサーバーのスタブ生成でgo generateが必要です。go generateで起動したいプログラムがGo製の場合、go run形式で書くと、そのツールのインストールを事前にしておかなくても良い（し、go modがキャッシュしてくれる）というのは、gophers slackのosakaチャンネルでIwatsuruさんに教えていただいたテクニックです。ありがとうございます。便利です。

ポートを8080じゃなくしているのは、手元の開発環境のcode-serverが使っていたので回避しただけです。Vueのプロキシー設定と合わせれば問題ないです。

```sh
$ go generate
$ go build
$ HOST=127.0.0.1 PORT=8888 ./serverless-sample
Open Server at 127.0.0.1:8888
```

このJSON-RPCサーバーの素敵なところはService Mapping DescriptionというJSONが出力できるところです。今回は時間がなかったのでやらなかったのですが、これを元にTypeScriptのクライアントコードの自動生成とかできると、gRPCみたいなスキーマを書かずに、Goのメソッド定義の型情報がクライアントでも利用できるようになって素敵なんじゃないかと期待しています。

```json localhost:8080/api?smd
{
  "transport":"POST",
  "envelope":"JSON-RPC-2.0",
  "contentType":"application/json",
  "SMDVersion":"2.0",
  "target":"/api",
  "services": {
    "CheckPrimeNumber": {
      "description":"CheckPrimeNumber returns input value is prime number or not",
      "parameters":[{"name": "a","type": "integer"}],
      "returns":{"type": "boolean"}
    }
  }
}
```

## サーバーとフロントをつなぐ

先程のイベントハンドラにつなぎます。fetchでJSON-RPCを直接呼んでいます。

```ts src/views/Prime.vue
  async check() {
    const res = await fetch("/api", {
      method: "post",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "CheckPrimeNumber",
        params: [parseInt(this.num)],
        id: 1
      }),
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      }
    });
    const dialog = this.$refs.dialog as Dialog;
    if (res.ok) {
      try {
        const result = await res.json() as any;
        if (result.result) {
          this.result = `${this.num} is prime number`;
        } else {
          this.result = `${this.num} is not prime number`;
        }
      } catch (e) {
        this.result = "parse error";
      }
    } else {
      this.result = "server access error";
    }
    this.dialogOpen = true;
  }
```

ここまでで、開発環境で一通り動作確認ができます。

<img src="/images/20200207/photo_20200207_03.png" loading="lazy">

## フロントエンドのアセットをGoサーバーにバンドル

本番環境に向けて、1コンテナの1プロセスで動作するようにしていきます。AWSのFargateであれば、複数コンテナをまとめて1つのタスクとできるので、静的HTMLの配信にはフロントに立てたNginxを使うという方法もできますが、Cloud Runの場合は1つのコンテナにまとめる必要があります。

静的ファイルをサーバー側でバンドルして配信する方法はいろいろありますが、自作の[brbundle](https://godoc.org/go.pyspa.org/brbundle)というのにします。Single Page Applicationの場合、[Angularのページで紹介されている](https://angular.io/guide/deployment)ように、静的ファイルを配信するときに見つからなかったらindex.htmlにフォールバックする、ということが必要です。この自作のライブラリはSSP用にnet/httpやらchiのアダプタを持っていて、このフォールバックもできるようにしています。

```go
package main

// これを追加
import (
	"go.pyspa.org/brbundle"
	"go.pyspa.org/brbundle/brchi"
)

// ↓この行を追加
//go:generate go run go.pyspa.org/brbundle/cmd/brbundle embedded -f dist

func main() {
	// この行を追加
	r.NotFound(brchi.Mount(brbundle.WebOption{
		SPAFallback: "index.html",
	}))
}

```

後はVueをビルドして出来上がったdistフォルダをGoの実行ファイルにバンドルしてあげるだけです。go generateでバンドルができるようにしたので次のコマンドでVueのフロント付きのシングルプロセスのGoサーバーができあがります。

```go
$ npm run build
$ go generate
$ HOST=127.0.0.1 PORT=8888 ./serverless-sample
Open Server at 127.0.0.1:8888
```

今度は開発サーバー経由ではなく、Goに直接アクセスして動作確認します。なお、バンドルしたとしても、開発サーバー経由でのアクセスも可能なので、開発のイテレーションを回すのに邪魔しません。

# Cloud Runにデプロイする

Cloud RunにデプロイするにはDockerコンテナを作ります。

## Dockerコンテナを作る

いよいよDockerにしていきます。みなさん、まさかAlpineとか使っていないですよね？今どきのセキュリティを気にするエンジニアの常識はシェルがなくてログインができないdistrolessをベースイメージにするって、マックで隣の女子高生が言っていました。

distrolessはDebian系なので、ビルド用のオフィシャルイメージとも合わせやすいです。

```Dockerfile Dockerfile
FROM node:12-buster-slim as nodebuilder
WORKDIR /home/node
COPY package.json package-lock.json ./
RUN npm ci
COPY babel.config.js .browserslistrc .eslintrc.js jest.config.js tsconfig.json vue.config.js ./
COPY public/ ./public
COPY src/ ./src
RUN npm run build

FROM golang:1.13-buster as gobuilder
WORKDIR /go/src/app
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
COPY --from=nodebuilder /home/node/dist/ ./dist
RUN go generate
RUN go build -ldflags="-w -s" -o /go/bin/app

FROM gcr.io/distroless/base
COPY --from=gobuilder /go/bin/app /
CMD ["/app"]
```

コンテナになったら、この状態でも動作確認できます。

```sh
$ DOCKER_BUILDKIT=1 docker build -t "serverless-app" .
$ docker run -p 8080:8080 --rm "serverless-app"
```

## Cloud Runで動かす

ここまで来たらあとはgcloudコマンドでデプロイするだけです。
GCP_PROJECTは自分で作成したプロジェクトを入れてください。IMAGE_NAMEはなんでも大丈夫です。日本から近いのでGCRはasia.gcr.ioにしています。

```sh
$ gcloud builds submit --tag asia.gcr.io/${GCP_PROJECT}/${IMAGE_NAME}
$ gcloud run deploy --image asia.gcr.io/${GCP_PROJECT}/${IMAGE_NAME}
```

最後のコマンドを起動すると、マネージドで動かすかAnthosで動かすか、どのリージョンで動かすか、名前を何にするかを聞いてきます。それに回答したらURLが表示されるので、それにアクセスすると動作が確認できます。初回は認証なしでアクセスできるかどうか、というのも聞かれました。

かんたんにユーザーに使ってもらう方法としては、[Let's Try GCP #1 ～Cloud Run Buttonを使った楽々コンテナデプロイをやってみた～](/articles/20190909/)で紹介するCloud Run Buttonもあります。

# 感想

Cloud Functionsと比べると、動作するアプリケーションが普通のGoのウェブサーバーなので開発はとてもしやすいです。フロントエンドを含めた動作検証も、JS側の開発支援の機能の恩恵を最大限受けられます。ローカルでかんたんに動作確認できます。また、その後本番用プロセスのローカル確認、Dockerコンテナの動作確認、クラウド上での動作確認と、確認できるポイントが多いのが助かりますね。

試してみてちょっと残念だったポイントは、brbundleはその名の通り、ブラウザがBrotli圧縮に対応していたら、Brotli形式で返す機能があるのですが、それを使うと正しい結果が返りませんでした。brbundleを拡張して、gzipで試してみたいです。

あと、[Known Issue](https://cloud.google.com/run/docs/issues)にもWebSocketやgRPCのストリーミングには非対応と書かれているのですが、実験したところ、Chunked Encodingにも非対応でした。そのため、Server Sent Eventを使うのもできません。Cloud FunctionsもGoogle App Engineもこれらはできないので、GCPのサーバーレスでサーバー側から通知というのはポーリング以外にはなさそうです。

とはいえ、きちんとした画面付きの管理画面がかんたんに稼働できます。常時稼働しない管理画面の稼働にはうってつけです。1コンテナという制約がありますが、そのおかげでFargateのような設定ファイルを作成する必要もありません。

今回は使いませんでしたが、アプリケーションの実装がローカルで単体で動くサーバーを作れば良い、ということで、以前本ブログで紹介した[Go Cloud](/tags/GoCDK/)を使えば、他のクラウドサービスでも動作するようなマルチクラウドな管理画面もかんたんに作れそうです。


[GCP連載](/articles/20200202/)の3回目でした。次は伊藤さんの[Cloud Life Sciencesを見てみた](/articles/20200210/)です。

