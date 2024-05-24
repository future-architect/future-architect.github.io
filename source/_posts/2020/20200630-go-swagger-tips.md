---
title: "go-swaggerを用いたWebアプリケーション開発Tips19選"
date: 2020/06/30 10:06:15
postid: ""
tag:
  - OpenAPI
  - Swagger
  - Go
  - Lambda
  - go-swagger
category:
  - Programming
thumbnail: /images/20200630/thumbnail.png
author: 真野隼記
lede: "業務でヘビーユーズしているgo-swaggerについての開発Tipsをまとめました。"

---
# はじめに

TIG DXユニット [^1]の真野です。echo → 生net/http → gorilla/mux → go-swagger, gqlgenの経歴でGoのHTTP APIを実装してきました。本記事では最近業務でヘビーユーズしているgo-swaggerについての開発Tipsをまとめました。

 [^1]: TIG(Technology Innovation Group)というフューチャーグループのIT技術を良い感じに推進する部署と、その中にあるDXユニットという、デジタルトランスフォーメーションに関わる仕事を主に推進していくチームのことです。


# 背景

フューチャーではGoを採用する案件が増えて来ており、その際に[go-swagger](https://github.com/go-swagger/go-swagger) というツールを利用することが多いです。 [^2] 理由はWebAPIのスキーマを駆動に開発することに慣れているという開発文化（DBレイヤのERDやデータフローを駆動に開発することは今も多い）や、リリース後の保守や将来のマイグレーションを考慮しなるべく特定のDSLに依存したくないというポリシーを強く持つこと、開発前にある程度固く機能数を洗い出して工数見積もりや開発スケジュールに活かしたいといった大人な事情など、色々相性が良いからだと思います。

 [^2]: もちろん、echo派や生net/http派やその他の勢力もいます


# Swaggerとは

https://swagger.io/

> Swaggerは、OpenAPI仕様（以下OAS）と言われる、REST APIを定義するための標準仕様にもとづいて構築された一連のオープンソースツールです。REST APIの設計、構築、文書化、および使用に役立つ機能を提供します。

YAML(JSON）でWebAPIの定義を記載することで、ドキュメンテーション・Client/Serverのコード生成・モックサービスの生成など多くのメリットを享受できます。またエコシステムも多数作られ、あるDSLに則ることでコードからSwaggerファイルを生成するなど、リバース系の生成手段も出てきています。

# Swaggerを記述する流れ

Swagger(OpenAPI)のYAML定義は生で書くと大変なので、武田さんの[本当に使ってよかったOpenAPI (Swagger) ツール](/articles/20191008/) 記事で紹介されたツールを利用してYAMLファイルを作成し、それをインプットにサーバサイドのコードを自動生成しています。中にはそれらの文明を捨て生身のYAML職人になった猛者もいます。続いて後述するgo-swaggerでサーバサイドやクライアントサイドのコードを生成・実装・テストし、その中で足りない点を設計にフィードバック（つまりYAMLを修正）し、さらにコードを再生成するといったサイクルを取ることが一般的だと思います。

実際に生成したSwaggerに対する規約は、亀井さんの[スキーマファースト開発のためのOpenAPI（Swagger）設計規約](/articles/20200409/)の記事を見ると、どういうところに注意すべきか分かって良いと思います。


# go-swaggerはWebアプリケーションフレームワーク

[go-swagger](https://github.com/go-swagger/go-swagger)とは、Swaggerファイルを入力にGoのコードを生成することができるツールです。生成されるコードは、go-openapi で管理されているモジュールが利用されています。go-swaggerそのものの技術選定については、多賀さんの[WAFとして go-swagger を選択してみた](/articles/20190814/) 記事にも記載があります。

go-swaggerがWAF(Webアプリケーションフレームワーク）というのは直感では理解しにくいですが、go-swaggerで生成したサーバサイドのコードは、実質的にechoやginのように多くの機能を持ちます。 例えば、**URLのルーティング**、**入力Validation**、**クエリパラメータ**、フォーム、リクエストヘッダ、リクエストボディなどの **入力modelへのバインディング**、**HTTPレスポンスコード別のmodelの作成**や、**Middlewareの設定専用の関数**など多くをサポートしていますし、**固有のビジネスロジックを書くルール**もgo-swaggerの生成したコードによって決められています。


# フロントエンド側の生成は？

TypeScriptのフロントエンド側の生成は[openapi-generator](https://openapi-generator.tech/docs/generators/)を当社では採用することが多いです。あくまでサーバサイドの生成にgo-swaggerを用いています。go-swaggerもクライアントコードは生成でき、こちらはあるWebAPIロジック中で、別のWebAPIを呼び出す時に利用したりもします。（下図のイメージ）

<img src="/images/20200630/photo_20200630_01.png" loading="lazy">

The Gopher character is based on the Go mascot designed by [Renée French](http://reneefrench.blogspot.com/).


# Tips

そんなgo-swaggerを用いてWebAPIサーバを開発し、いくつかのシステムをリリースしてきました。そこで得たTipsを紹介していきます。比較的サーバサイドの話が多いですが、一部クライアントサイドの話しもあります。（前述したあるWebAPIサーバから、別のOpenAPIで定義されているWebAPIを呼び出すことも合ったので）

## 1. インストールバージョンをチームで固定しよう

[インストール手順](https://goswagger.io/install.html)は様々ですが、コードを自動生成する関係上、バージョンは必ず揃えた方が良いです。もしチーム内に複数バージョンが混在してしまうと、自動生成するたびに不要なコード差分が発生して履歴が汚れてしまいます。

もし、コードからビルドするのであれば、下記のように`@v0.23.0` のように固定することがオススメです。

```bash インストール手順
go get -u github.com/go-swagger/go-swagger/cmd/swagger@v0.23.0
```

特に理由がなければ最新のバージョンを利用するのが良いと思います。2020/05/19時点では[リリースノート](https://github.com/go-swagger/go-swagger/releases)を見る限り数ヶ月ごとにリリースされているように活発に開発が続いているので、適時バージョンも上げていきたいですね。



## 2. swagger genrate server コマンドの推奨オプション

オプションは[公式ドキュメント](https://goswagger.io/generate/server.html)に記載されています。次のオプションは設定したほうが良いかなと思います。

* `--strict-additional-properties` リクエストボディなどで指定外のフィールドを指定した場合にエラーになる
* `-a`, `--api-package` パッケージがoperationsではなく任意のパッケージ名になる。短くしたい時にオススメ
* `-A`, `--name`  Swagger定義の `info.title` に大文字が入るとアンスコ繋がりにされちゃうの回避できる
* `--exclude-main` main.goのファイルを生成するのを除外してくれる
* `-t`,`--target` 出力先のパッケージを指定。3にもあるが、`gen` にすることが経験上多い

まとめると、例えばルート管理（RouteManagement）のAPIであれば、以下のようなコマンドにすることが多いです。

```bash 生成コマンド例
swagger generate server -a routemanagement -A routemanagement \
  --exclude-main --strict-additional-properties -t gen f ./swagger/swagger.yaml
```

立ち上がり初期は、`-a`や`-A`の値を変えながらしっくり来るのを探すことがオススメです。


## 3. パッケージ構造

先ほど、出力先ディレクトリを `gen` に指定しましたが、[公式ドキュメントにもgenで生成する例](ttps://goswagger.io/tutorial/custom-server.html)が書いてありました。最初は `generated` にしようか迷いましたが、短いですし `gen` に合わせることをおすすめします。

genの意味が何か？というのは新規参画者が全員抱く疑問だと思うので、READMEの上の方にディレクトリ構成を書くようにしています。

```sh
.
├── docs                  # 設計ドキュメント
├── swagger               # Swagger管理
|    └── swagger.yml      # WebAPI定義
├── server                # WebAPI本体のコード
|    ├── cmd              # 実行ファイルのエンドポイント
|    ├── gen              # go-swaggerで自動生成コードの出力先(⚠️configure_xx.go以外は編集しない⚠️)
|    └── testdata         # ユニットテストデータ
|
└── migrationtool         # データ移行ツール
     └── ...
```

例がモノリポで作っているイメージなので、適時書き換えて参考にしていただければです。


## 4. 起動時オプションの `--host`には注意

go-swaggerで生成した[サーバ起動時オプション](https://goswagger.io/tutorial/todo-list.html)がいくつか存在します。その中で必須なのは、`--host`と `--port` だと思います。`--host` を指定した場合はデフォルト`localhost`、つまり `127.0.0.1`になります。そうすると、ローカル開発では良いですが、他のサーバからアクセスできなくなります。ネットワークインターフェースを個別に指定したいケースは別ですが、基本的には `--host 0.0.0.0` を指定すると良いでしょう。

また、ポート番号は未指定だと毎回ランダムな数値を選択します。固定したほうが何かと都合が良いと思うのでアプリごとに利用するポートを決定しましょう。

```bash
./exmample-server --host 0.0.0.0 --port 3000
```

`--host`は`$HOST`、`--port`は`$PORT`という環境変数でも利用できるので、コンテナ化するときなどはこちらを利用するのも良いと思います。特に[GCPのCloudRunは$PORTで待ち受けるのが必須](https://cloud.google.com/run/docs/reference/container-contract)なので、この場合はGCP側にポート設定は任せましょう。


## 5. OpenAPIのバージョンを見間違えないように注意

go-swaggerが対応しているのは `OAS2` であるので注意です。最新は `OAS3` ですが、その記法は利用できないことがあります。特にググった時に出てくる公式ドキュメントが `OAS2`であることをよく確認しましょう

大事なポイントなのでちゃんとテストします。次の画像↓はOAS2かOAS3のどちらでしょうか？

<img src="/images/20200630/photo_20200630_02.png" loading="lazy">

..はい、`OAS2` と書かれているのでOKです。このドキュメントはgo-swaggerで利用できます。

では、次の画像↓はどちらでしょうか？

<img src="/images/20200630/photo_20200630_03.png" loading="lazy">

..はい、`OAS3` と書かれていますね。というわけで、このドキュメントはgo-swaggerでは利用できない可能性が高いので、参考にするのはほどほどにしましょう。


個人的には `OAS2` の仕様については下記が最もまとまっていて簡潔なのでオススメです。ググるのではなくまずこの仕様書を見ましょう。

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md


## 6. go-swaggerで対応しているOpenAPIの規約とは

5で説明したとおり、OpenAPIの3系と2系（Swagger）でGoogle検索しにくいのが実情だと思います。さらにその中でgo-swaggerがその記法に対応しているかどうか迷う場面が出てくると思います。

対応状況については下記に記載があります。

https://github.com/go-swagger/go-swagger/blob/master/docs/use/spec/params.md

主要どころは網羅できているとお気づきになると思います。実際、経験上はほとんどが問題なく利用できてきました。もし、上手く動かない場合は、設定ミスや仕様の勘違い、あるいはコードの再生成をし忘れているといった可能性が高いです。



## 7. Swaggerのモデルの必須属性を外すとGoのコードがポインタじゃなくなり便利だが落とし穴がある

Goの辛いところかも知れませんが、nullかどうかを判定するためにGoではしばしばstringやint64のフィールドが、必須設定されるとポインタ型になります。これを `swag.String()/swag.StringValue()` や `swag.Int64()/swag.Int64Value()` で変換するのが厄介なので、特にレスポンスに関してはチェックもしないし必須属性を外そうかという判断になりがちだと思います。

この時に厄介なのが、必須属性**ではない** フィールドには、JSONの `omitempty` タグが付与されることです。これによって、int64やboolの型がついているフィールドが、`0`値や`false` の場合にレスポンスのJSONフィールドから除外されてしまいます。意味は分かるけど意図はそういうことじゃないんだよなーって思う人も多いのでは無いでしょうか？これを回避するためには、 go-swaggerの拡張記法である、 `x-omitempty: false` を設定する必要があります。

..なんというか、色々歪みが大きい気がするので、必ずレスポンスに含まれる項目であれば素直に必須だという宣言に、Swagger上はしておく方が良いかも知れません。このあたりはチーム全体の判断になると思います。


## 8. 数値始まりのフィールド名にNrというプレフィックスが付与される

数値始まりのフィールド `0x9101` といったフィールドを、go-swaggerで生成すると、 `Nr0x9101` と言った具合に`Nr`といったプレフィックスが付与されます。ドキュメントには見当たりませんでしたが、コードでは[この辺](https://github.com/go-swagger/go-swagger/blob/b6f0abd35e2a0d1415e1b4776e35e33808d2ce62/generator/template_repo.go#L551
) に実装されていました。おそらく数値を表すNumberのドイツ語読み？でしょうか。これはGoのフィールド名が数字始まりを許可しないため、仕方ない挙動だとは思いますが、`Nr`は辞めたいと思われる方も多いのではないでしょうか？

これを回避すると前には、`x-go-name` という拡張記法を用います。コレを用いると、 `x-go-name: d0x9101` といった形でカスタムな名称にできます。まぁAPIの定義と、内部で用いるフィールド名が異なると脳内変換が大変なので、この場合は状況が許すのであればAPI定義側も `d0x9101` などと変更したほうが良い判断に思われます。

`x-go-name` ですが、おそらくは、`company_cd`や`user_id`といったsnake_caseでAPIを定義した場合、go-swaggerのデフォルトの挙動は `companyCd`、`userId`といった具合に、Goの慣習と合わないことへの対応に使うことが本来は多いと思います。このあたりに用いるのであれば本来の意図したオプションだと思います。


## 9. go-swaggerの拡張記法

7,8と関連しますが、`x-omitempty`や`x-go-name`以外にも、go-swagger独自の拡張パラメータが存在します。

どういったパラメータが利用できるかは、コードを見ると分かりやすいです。
https://github.com/go-swagger/go-swagger/blob/master/generator/types.go#L45

この中でも、比較的よく使いそうなのは `x-go-type`や`x-order`でしょうか？ `x-go-type` は自分でtype aliasした型を指定することが出来ます。 `x-order`は、go-swaggerはデフォルトの挙動では、Swaggerに記載した順番にStructのフィールドを生成してくれません。それが視認性など場合によっては困ると言った場合に、順序を指定することも出来ます。あまり乱用すると、扱いにくいSwaggerファイルになりかねないので、トレードオフを考えながら指定していくと良いかなと思います。



## 10. DateTimeを活用しよう

`type=string`を指定した時に、`format`には、`date`, `date-time` などが[指定できます](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#data-types)。

```yml:設定例
event_time:
  type: string
  format: date-time
```

こうすると、go-swaggerでは `github.com/go-openapi/strfmt` の `strfmt.DateTiime` 型でStructが生成されます。

```go date-time指定時の生成例
type ExampleParams struct {

	// HTTP Request Object
	HTTPRequest *http.Request `json:"-"`

	/*
	  Required: true
	  In: query
	*/
	EventTime strfmt.DateTime
}
```

`date-time`を指定すると、`full-date - RFC3339`の形式での入力をパースすることが出来ます。コードでは[この辺](https://github.com/go-openapi/strfmt/blob/master/time.go#L78)です。中身を見ると、複数のフォーマットに対応してくれおり、どれかに一致すればOKという仕様です。このあたりの受け入れる日付フォーマットを一々取り決めるのは厄介ですが、標準ライブラリレベルで規定してくれるているため、楽ができます。

```go full-dateを指定したときにパースする
const (
	// RFC3339Millis represents a ISO8601 format to millis instead of to nanos
	RFC3339Millis = "2006-01-02T15:04:05.000Z07:00"
	// RFC3339Micro represents a ISO8601 format to micro instead of to nano
	RFC3339Micro = "2006-01-02T15:04:05.000000Z07:00"
	// ISO8601LocalTime represents a ISO8601 format to ISO8601 in local time (no timezone)
	ISO8601LocalTime = "2006-01-02T15:04:05"
	// ISO8601TimeWithReducedPrecision represents a ISO8601 format with reduced precision (dropped secs)
	ISO8601TimeWithReducedPrecision = "2006-01-02T15:04Z"
	// ISO8601TimeWithReducedPrecision represents a ISO8601 format with reduced precision and no timezone (dropped seconds + no timezone)
	ISO8601TimeWithReducedPrecisionLocaltime = "2006-01-02T15:04"
)

var (
	dateTimeFormats = []string{RFC3339Micro, RFC3339Millis, time.RFC3339, time.RFC3339Nano,
		ISO8601LocalTime, ISO8601TimeWithReducedPrecision, ISO8601TimeWithReducedPrecisionLocaltime
	}
)
```

また、レスポンスのモデル側のフィールドに`date-time`を指定したときは、デフォルトでは上記 `RFC3339Millis` のフォーマットが利用されます。もし、これを変更したい場合は、strfmtパッケージのMarshalFormatフィールドを書き換えればOKです（グローバルに書き換わります）。


```go レスポンスの日付フォーマットを変更したい場合（ミリ秒を外したい!といった場合）
strfmt.MarshalFormat = time.RFC3339
```

`strfmt.DateTime` ですが、初見だと色々と扱いにくいと思います。なぜなら`swag.DateTime`とか`swag.DateTimeValue`とかが無いからです。理由は[もともとOpenAPI側のライブラリだからです](https://github.com/go-swagger/go-swagger/issues/734)。

変換の仕方をざっとまとめます。

```go
import (
	"time"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/strfmt/conv"
)

// *strfmt.DateTime → strfmt.DateTime
dateTimePointer := conv.DateTimeValue(p.Body.DateTime)

// strfmt.DateTime → *strfmt.DateTime
dateTime := conv.DateTime(p.Body.DateTimePointer)

// strfmt.DateTime → time.Time
timeTime := time.Time(dateTime)

// time.Time → strfmt.DateTime
dateTime := strfmt.DateTime(timeNow())

// string → strfmt.DateTime
dateTime := strfmt.ParseDateTime("2020-05-20T15:04:05Z07:00")
```

time.Timeへの変換さえ慣れれば、自前で日付パースを行うコードを減らせ見通しが良くなると思います。ぜひ、日付周りのデータを受け付ける場合は活用下さい。


## 11. アクセスログ

Go系のWAF全般に言えることかも知れませんが、go-swaggerも標準ではアクセスログなどが一切出力されず、自前でMiddlewareを仕込む必要があります。

設定する場所は、 `restapi/configure_{project name}.go` にある、2つの関数のどちらかに設定します。

```go
func setupMiddlewares(handler http.Handler) http.Handler {
	return handler
}

func setupGlobalMiddleware(handler http.Handler) http.Handler {
	return handler
}
```

`setupMiddlewares` はプログラム上で指定したルートに対するMiddlewareで、`setupGlobalMiddleware`は`/swagger.json`のエントリーポイントにも着火するミドルウェアです。

アクセスログの実装方法は色々ですが、私は以下のようなAccessLogの関数を実装することが多いです。

```go アクセスログ実装
package mymiddleware

import (
	"github.com/labstack/gommon/log"
	"net/http"
	"time"
)

type captureResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func NewCaptureResponseWriter(w http.ResponseWriter) *captureResponseWriter {
	return &captureResponseWriter{w, http.StatusOK}
}

func (lrw *captureResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func AccessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		start := time.Now()

		if r.URL.Path != "/health" && r.URL.Path != "/health/" {
			// ヘルスチェックは毎秒出力されログを汚すので出力させない
			log.Infof("[ACCESS] START %v %v\n", r.Method, r.URL)
		}

		lrw := NewCaptureResponseWriter(w)
		next.ServeHTTP(lrw, r)

		if r.URL.Path != "/v1/health" && r.URL.Path != "/v1/health/" {
			elapsed := time.Since(start)

			code := lrw.statusCode
			if code >= 500 {
				log.Errorf("[ACCESS] END %v %v %v %v\n", r.Method, code, r.URL, elapsed)
			} else if code >= 400 {
				log.Warnf("[ACCESS] END %v %v %v %v\n", r.Method, code, r.URL, elapsed)
			} else {
				log.Infof("[ACCESS] END %v %v %v %v\n", r.Method, code, r.URL, elapsed)
			}
		}
	})
}
```

これを、先ほどの`setupGlobalMiddleware`関数に設定します。

```go ミドルウェアの設定
func setupGlobalMiddleware(handler http.Handler) http.Handler {
	return mymiddleware.AccessLog(handler)
}
```

これで、go-swaggerへのリクエストに対してロギングを行うことができました。開発や利用状況の調査などに役立て下さい。


## 12. panicしたときの防御

これも11に関連した話ですが、go-swaggerのロジックでpanicが発生するとレスポンスを何も返さないため不便です（どこかのレイヤーでGateway Timeoutなどが発生します）。この場合は、panicをキャプチャするmiddlewareを設定し、500エラーを返すなどをしたほうが良いでしょう。

公式ドキュメントにも[実装例](https://github.com/go-swagger/go-swagger/blob/master/docs/use/middleware.md#add-logging-and-panic-handling)が記載されています。[dre1080/recover](https://github.com/dre1080/recover)を利用しても良いと思いますし、私はもう少し自由度を高めたかったので[こちらの実装](https://medium.com/@masnun/panic-recovery-middleware-for-go-http-handlers-51147c941f9)を参考にして、カスタムミドルウェアをつくることもあります。

```go panic救済用のミドルウェア実装例
package mymiddleware

import (
	"encoding/json"
	"fmt"
	"github.com/labstack/gommon/log"
	"net/http"
)

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Errorf("panic catch: %v", err)

				resp, _ := json.Marshal(map[string]string{
					"error": fmt.Sprintf("Internal Server Error: %v", err),
					"code":  "000500", // 予期せぬエラー
				})

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_, _ = w.Write(resp)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
```

これを11のアクセスログと合わせて設定します。

```go ミドルウェアの設定
func setupGlobalMiddleware(handler http.Handler) http.Handler {
	return mymiddleware.Recovery(mymiddleware.AccessLog(handler))
}
```

これで、panicが発生しても仕様通りに何かしらレスポンスすることができました。



## 13. Middleware

現実には、10, 11以外にも多くのMiddlewareを実装する必要が出てくると思います。多いのは、CORS、GZIPでしょう。BodyLimitやRateLimitなどは、LANを飛び出してWebAPIを実装すると必要性が出てくると思います。どういったMiddlewareが必要になってくるかは、[echoのMiddlewareページ](https://echo.labstack.com/middleware)を見て、どういった観点がありそうか確認してみるのも良いかも知れません。

**CORS**に関しては、[公式のFAQ](https://github.com/go-swagger/go-swagger/blob/master/docs/faq/faq_documenting.md#how-to-use-swagger-ui-cors) があります。

```go FAQに載っている実装例
import "github.com/rs/cors"

func setupGlobalMiddleware(handler http.Handler) http.Handler {
    handleCORS := cors.Default().Handler
    return handleCORS(handler)
}
```

大体が、`cors.Default()` の設定で大丈夫だと思いますが、`Access-Control-Allow-Headers` のリクエストヘッダに対してはデフォルトで許可していないので、要件によっては追加でオプションを追加します。

```go リクエストヘッダも全OKにする例（個別に指定するのがベストだとは思います）
	myCORS := cors.New(cors.Options{
		AllowedHeaders: []string{"*"},
	})
```

**GZIP**は[こちらのライブラリ](https://github.com/nytimes/gziphandler/blob/master/README.md)を利用すると良いかと思います。こちらは最後の設定例でまとめて説明します。

**BodyLimit**はこちらの[StackOverflowの記事](https://stackoverflow.com/questions/52879193/how-to-determine-if-ive-reached-the-size-limit-via-gos-http.maxbytesreader)を参考に実装しました。やりたいことは、指定されたサイズ以上のリクエストボディを許可せず、サーバ側に負荷をかけないようにしたいことです。

```go BodyLimitの実装例（2MB制限）
const MaxBodyByteSize = 2 * 1024 * 1024 // 2MB

func BodyLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, MaxBodyByteSize)
		next.ServeHTTP(w, r)
	})
}
```

**RateLimit**は[さきほどの公式ドキュメント](https://github.com/go-swagger/go-swagger/blob/master/docs/use/middleware.md#add-logging-and-panic-handling) にも記載があります。WAFなどを導入していれば不要かもしれないですが、負荷試験時にベンチマークツールの誤作動でDynamoDBなど回数課金なサービスで費用がかさんだ悪夢から、防御的に設定することにしています。

```go RateLimitの設定例（秒間10回まで）
func setupMiddlewares(handler http.Handler) http.Handler {
  limiter := tollbooth.NewLimiter(10, time.Second)
  limiter.IPLookups = []string{"RemoteAddr", "X-Forwarded-For", "X-Real-IP"}
  return tollbooth.LimitFuncHandler(handler)
}
```

これらを合わせると以下のようになります。

```go 各種Middlewareの実装例
func setupGlobalMiddleware(handler http.Handler) http.Handler {
	// CORS
	myCORS := cors.New(cors.Options{
		AllowedHeaders: []string{"*"},
	})

	// RateLimit
	limiter := tollbooth.NewLimiter(10, time.Second)
	limiter.IPLookups = []string{"RemoteAddr", "X-Forwarded-For", "X-Real-IP"}

	return mymiddleware.Recovery(myCORS.Handler(mymiddleware.AccessLog(
		gziphandler.GzipHandler(tollbooth.LimitFuncHandler(
		mymiddleware.BodyLimit(handler))))))
}
```

デコレートの階層が深すぎてよくわからなくなってきましたが、浅い方から順番に動くので、アクセスログはCORSの前に出したいとかがあれば順序を動かしてみてください。



## 14. エラーハンドリング

go-swaggerの入力Validationでエラーが発生したときは、デフォルトでは `422 Unprocessable Entity` が発生します。422のままで良いよという方はこのままでも良いですが、`400 Bad Request`で統一したい場合もあるでしょう。理由は、悪さをしようとするユーザーのリクエストがあるという性悪説にたって、不正パラメーターの詳細なエラー情報は悪いクライアントに不要な情報を与えるものとなりかねないので、雑に400を返すといった考えもあると思うからです。

単純にエラー時のステータスコードを変えたいだけなら、[ここに書いてあるように](https://github.com/go-swagger/go-swagger/issues/1820)簡単に実施できます。

```go
import "github.com/go-openapi/errors"

func configureAPI(api *myapp.MyApplicationAPI) http.Handler {
	errors.DefaultHTTPCode = http.StatusBadRequest
}
```

これで入力されたパラメータがSwaggerで定義したスキーマと異なる場合は、`400 Bad Request` を返すことができました。

一方で、エラー時のレスポンスボディは `{"code":400, "mesasge": "xxx"}` といった形式になります。[実装はこのあたり](https://github.com/go-openapi/errors/blob/master/api.go#L84)になります。もし、レスポンスボディのレイアウトを変更したいときは、自分でカスタムのerrorHandlerを設定することもできます。


```go go-swaggerでのハンドリングのカスタマイズ
func configureAPI(api *myapp.MyApplicationAPI) http.Handler {
	errors.DefaultHTTPCode = http.StatusBadRequest
	api.ServeError = myerrors.MyServeError // 拡張部分
}
```

myerrors.MyServeErrorの実装ですが、デフォルトである `github.com/go-openapi/errors`の `errors.ServeError`の実装を参考にしながら、一部を改修するといった形になります。[このIssue](https://github.com/go-swagger/go-swagger/issues/1041#issuecomment-301393502)で話題になっています。例えば、`code`というフィールドを削除したいよって場合は、`errors.ServeError`の`errorAsJSON`関数を書き換えて対応します。

```go codeフィールドを削除した実装例
func errorAsJSON(err Error) []byte {
	b, _ := json.Marshal(struct {
		Message string `json:"message"`
	}{err.Error()})
	return b
}
```

上記で、色々go-swaggerのフレームワーク側が対応してしてくれているエラーハンドリングも自由自在になりました。あまりカスタマイズすると、本家バージョンアップの追随が大変なので、なるべくgo-swagger標準の形式に則ってWebAPI設計することがおすすめですが、いざという時の逃げ道として認識してもらえると幸いです。




## 15. Defaultステータスコードの勧め


`OAS2` のSwagger定義に、[Defaultレスポンス](https://swagger.io/docs/specification/2-0/describing-responses/#Default)という設定が出来ます。

下記のように、200以外は全て同じErrorモデルを利用するというのであれば定義の簡略として便利だと思います。

```yaml
    responses:
        200:
          description: Success
          schema:
            $ref: '#/definitions/User'
        # Definition of all error statuses
        default:
          description: Unexpected error
          schema:
            $ref: '#/definitions/Error'
```

これが特に効果を発揮するのは、**クライアントコードを生成した時**です。理由は、サーバサイドが行儀よくWebAPI定義通りのレスポンスコードを返してくれればよいのですが、実装によって予期せぬレスポンスコードを帰す場合（例えば先ほどの422の話）には、クライアントコードはそれを上手く扱えません。他にも自動生成部分ではなく開発者が個別実装する部分で、間違った自動生成コードを利用した場合にも発生します。

例えば、もしdefalutが存在しない場合は、下記のようにクライアント側でエラーをログ出力しても、`{resp:0xc0005325a0}` のようなポインタ情報しか出力されないです。

```go
params := user.NewGetUserParamsWithContext(ctx).WithUserID(userID)

if _, err := api.user.GetUserContract(params); err != nil {
	log.Errorf("getUserContract: %s", err.Error()) //=>  getUserContract: {resp:0xc0005325a0}
}
```

これは、ステータスコード別にバインドするStructを自動生成する関係上、想定外のステータスコードの場合に動かしようが無いからだともいます。[このあたりのIsseuにも似たような議論](https://github.com/go-swagger/go-swagger/issues/1470)がありました。これを避けるためには、横断的にエラー時のModelを共通化しておき、全てのエンドポイントごとにDefaultステータスコードを設定しておくことがオススメです。


## 16. NewXxxの関数を利用する

15でもちょっと実装が出ましたが、go-swaggerで生成したクライアントコードを利用して、サーバにリクエストする場合について注意があります。リクエストパラメータの生成には、 `NewXxx`を利用してStructを作らないと、timeout=0になって、`context deadline exceeded` エラーとなり上手く動作しません。[このあたりのIssue](https://github.com/go-swagger/go-swagger/issues/919#)でも話題にしています。

NewXxxの関数を用いるときは、`WithContext`付きの方を利用すると便利です。さらにチェーンスタイルでパラメータも設定できます。必須属性については `swag.String` などで *string 型への変換が必要です。

```go
params := user.NewPostUserParamsWithContext(ctx).
	WithHTTPClient(hc).
	WithUserID(userID).
	WithBody(&models.PostUser{
		Name:          swag.String("未来太郎"),
		MemberType:    swag.String("一般会員"),
})
```


## 17. クライアントコードでホスト名やBASE_PATHを書き換えたい

Swaggerに記載するホスト名と開発中のホスト名は異なるため、書き換えが必要です。また、URLの基底となるパスですが、 `/v1` などを設定することが一般的だと思います。一方で、ロードバランサやAPIゲートウェイの仕様のため、本番環境では別の基底パスを追加したいときがあると思います。そうすると、ローカルで利用したいURLと差異がでるため、差異を吸収する設定が必要です。

`gen/{project name}_client.go` にあるクライアントの `HTTPClientWithConfig` を書き換えます。

```go ホスト名やBASE_PATHの書き換え
import (
	"github.com/future-architect/{project name}/gen/client"
)

api = client.NewHTTPClientWithConfig(nil, &client.TransportConfig{
	Host:     os.Getenv("API_HOST"),
	BasePath: os.Getenv("BASE_PATH"),
})

if _, err := api.user.GetUserContract(user.NewGetUserParamsWithContext(ctx).WithUserID(userID)); err != nil {
	log.Errorf("getUserContract: %s", err.Error()) //=>  getUserContract: {resp:0xc0005325a0}
}
```

もし、Swaggerの設定そのままのホスト名やBASE_PATHを利用するのであれば、Defaultクライアントを利用もできます。

```go デフォルト設定のままの場合
if _, err := client.Default.user.GetUserContract(user.NewGetUserParamsWithContext(ctx).WithUserID(userID)); err != nil {
	log.Errorf("getUserContract: %s", err.Error()) //=>  getUserContract: {resp:0xc0005325a0}
}
```

この辺りの作り込みは上手く環境変数など外部プロパティで切り替えられるようにしておきたいですね。


## 18. 単体テストの話

go-swaggerのサーバサイドの単体テストは、Goの関数呼び出しと同様に実現できます。レスポンスに関しては ` httptest.NewRecorder()` を利用するとヘッダ・ボディなど全て取得できます。

```go
import (
	"net/http/httptest"
	"strconv"
	"testing"
	"github.com/Cside/jsondiff"
	"github.com/<your repo>/<project name>/server/gen/models"
)

func TestGetUser(t *testing.T) {
	params := installation.NewAttachParams()
	params.HTTPRequest = httptest.NewRequest("GET", "http://example.com", nil)
	params.UserID= "0001"

	// 🔎🔎Test Func🔎🔎
	resp := GetUser(params)

	w := httptest.NewRecorder()
	resp.WriteResponse(w, runtime.JSONProducer())

	want := struct {
		status  int
		body    string
	} {
		status: 200,
		body: `{"id":"0001", "name":"未来太郎"}`,
	}

	if strconv.Itoa(w.Result().StatusCode) != want.status {
		t.Errorf("status want %v got %v", want.status, w.Result().StatusCode)
	}

	if diff := jsondiff.Diff(want.body, w.Body.Bytes()); diff != "" {
		t.Errorf("case %v body diff:\n%s", c.name, diff)
	}
}
```

レスポンスボディのチェックは、jsondiffというパッケージを利用していますが、他にも色々な方法があると思いますので、要件に合わせて書き換えて下さい。他のGoのテストの考え方と特に変わらないのは嬉しいですね。



## 19. Lambdaで動かしたい


go-swaggerのサーバですが、[実はAWS Lambdaでも動かせます](https://github.com/go-swagger/go-swagger/issues/962#issuecomment-478382896)。`httpadapter` というパッケージを利用することで、API Gatewayの`events.APIGatewayProxyRequest` といったイベントを、go-swaggerのリクエストである `*http.Request` に変換してくれます。コードは下記のようなイメージです。

```go API-Gateway+Lambdaで動かす場合
package main

import (
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/go-openapi/loads"
	"github.com/<your repo>/<project name>/server/gen/restapi"
	"github.com/<your repo>/<project name>/server/gen/restapi/<your app>"
)

var httpAdapter *httpadapter.HandlerAdapter

func init() {
	swaggerSpec, err := loads.Embedded(restapi.SwaggerJSON, restapi.FlatSwaggerJSON)
	if err != nil {
		log.Fatalln(err)
	}

	api := myApp.NewMyApplicationAPI(swaggerSpec)
	server := restapi.NewServer(api)
	server.ConfigureAPI()

	// see https://github.com/go-swagger/go-swagger/issues/962#issuecomment-478382896
	httpAdapter = httpadapter.New(server.GetHandler())
}

// Handler handles API requests
func Handler(req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return httpAdapter.Proxy(req)
}

func main() {
	lambda.Start(Handler)
}
```

起動速度がちょっと気になる..という方もいらっしゃるかと思いますが、とあるシステムの本番環境で、ほぼほぼ上記のコードを動かしていますが、気持ち10-20msくらいかかっているかも？といったレベルです。init関数で初期化した部分を、毎回のリクエストのたびに使いまわしているからだと思います。そこまでレイテンシを求められないシステムであれば、go-swaggerもドンドンLambdaに載せちゃって良いのでは？と私は考えています。

他のServlerless相当でgo-swaggerで動かしたい場合も、このコードを参考にサーバレス関数のイベントを、`*http.Request` に変換すれば動かすことができそうです。夢が広がりますね！


# まとめ

最初は3,4つのTipsをまとめて終わりにしようかと思いましたが、書いていると非常に長くなってしまいました。go-swaggerは良いプロダクトだと思うのですが、定義情報からコードを自動生成する関係上、どこまで何ができるのかイメージがつきにくかったり、そもそもOpenAPI（Swagger）の知識も必要のため敷居が高かったりと、最初はハマる箇所が多いからかも知れません。（さらにはサーバサイドとクライアントサイドの2種類のコードも生成できるためネタが増える..）

上手く使えば、WebAPI定義と実装が完全に一致する（定義からコードを生成しているため）で強力なツールだと思いますしオススメです。すでに使っている方にも今回のTipsを活用していただければ幸いです。
