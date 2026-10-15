---
title: "E2Eテストを爆速にする: オンメモリPostgreSQLのpgmem"
date: 2026/10/15 00:00:00
postid: a
tags:
  - PostgreSQL
  - E2Eテスト
  - WebAssembly
categories:
  - Programming
thumbnail: /images/2026/20261015a/thumbnail.png
author: 澁川喜規
lede: "完全にオンメモリで動き、テストケースごとにフォークしてスケールするPostgreSQL「pgmem」を作りました。テストダブルの分類からアーキテクチャ、テスト用API、パフォーマンスまでを紹介します。"
---
古来よりDBにモックを使うとか使わないとか話題になるのは、DBというものをプログラムからコントロールするのに制約が多かったからではないかと思います。で、オンメモリのDBのH2を使うなり、SQLiteを使うなどしようとしても、今度は使うDBMSとの差が出てしまってテストとしての品質が上がらないと。

トランザクションを使って戻す、みたいな方法もありますが、トランザクション自体をネストはできないし、セーブポイントを使うのも色々大変です。どうしてもDBを使うとテストが遅くなる、というイメージがつきまといます。

じゃあ完全にオンメモリで動いてテストケース分スケールさせるPostgreSQLを作ってみたら良さそうでは？と作ってみました。

* [pgmem](https://shibukawa.github.io/pgmem/)

## テストダブル

テストダブルという言葉を聞き慣れない人もいるとおもいます。テストしたい対象がいろいろ気軽な実行が難しい部品に依存している場合にそれを置き換えるものの相性です。おおまかに「モック」と呼ばれることも多いのですが、マーチン・ファウラーの提唱する細かい分類があります。[Androidのテストダブルの説明](https://developer.android.com/training/testing/fundamentals/test-doubles?hl=ja)を@ymotongpooさんに教えてもらいましたが、よくまとまっていますね。

この記事の注釈にもありますが、テストダブルのフレームワークによって用語や機能が変わることが多いです。本物っぽく振る舞うが検証はしないものでも「モック」を名乗ってたり。

* フェイク
  * クラスの「機能する」実装を持つテストダブルであるものの、本番環境には適さないテスト用のもの
  * 本物っぽく振る舞う既製品。検証はしない
* モック
  * プログラムされたとおりに動作し、インタラクションに関する期待値を持つテストダブル
  * 本物っぽく振る舞うようにコーディングをする。検証もする
* スタブ
  * プログラムどおりに動作させるが、そのインタラクションについては期待しないテストダブル
  * 本物っぽく振る舞うようにコーディングをする。検証はしない
* ダミー
  * 渡されるが使用されないテストダブル（パラメータとして指定する必要がある場合など）
  * 穴埋め
* スパイ
  * 実際のオブジェクトをラップし、モックと同様に追加情報を追跡する
  * 本物とのやりとり記録をもとに検証する
* シャドウ
  * アプリケーションコードに触れずに外部から依存のプログラムを差し替える
  * 設定部分の自動化。検証はしない

このブログでもたまに話題に上がるのが「モックよりもフェイク」というあたりですね。モックはそのテストのための手作りされた部品で、高速には実行できるものの、モックそのものが間違っていた場合のセーフティネットがない、本家側が後から動作変更しても気づけないあたり、大きな問題があります。「テストしたつもり」になりがち。通常では起きえない異常ケースの再現(BeOSの[今パソコンが火事で燃えているか返すAPI](https://www.haiku-os.org/legacy-docs/bebook/TheKernelKit_SystemInfo.html#:~:text=undefined.-,is_computer_on_fire(),-double)とか)などモックでしかやりづらいケースはありますが、フェイクが使えるならそちらの方が確実です。

今回作ったのはPostgreSQLのデータベースをまるごとテスト用に改造してライブラリ化するということでフェイクです。プラスアルファで、本体コードに手を加えずに接続先をテスト用のデータベースに変えるシャドウ機能もテスト用APIとして提供しています。

なお、シャドウは今回初めて知りましたが、Python製のAWSエミュレータのmotoが提供していて、前から良いなと思っていました。

```python 参考にしたmotoが提供するS3のシャドウ機能
import boto3
from moto import mock_aws
from mymodule import MyModel

## このデコレータをつけるとAWS SDKのbotoがローカルエミュレータに向くようになる
@mock_aws
def test_my_model_save():
    # 以下のロジックはAWS_ENDPOINTなどを変更したりせずに
    # テスト環境向けに動く
    conn = boto3.resource("s3", region_name="us-east-1")
    conn.create_bucket(Bucket="mybucket")
    model_instance = MyModel("steve", "is awesome")
    model_instance.save()
    body = conn.Object("mybucket", "steve").get()["Body"].read().decode("utf-8")
    assert body == "is awesome"
```

## アーキテクチャ

PGLiteというWASMでビルドされているPostgreSQLがあります。基本的にはその延長です。WASMのランタイムはGoなどでも使えますが、そのままだとネイティブと比べるとパフォーマンスが出ないので、[wasm2go](https://github.com/goccy/wasm2go)を使ってGoに変換してビルドしています。また、crypto系アルゴリズムなどGoネイティブロジックが使えるものはなるべく寄せるようにしてパフォーマンスとサイズを最適化するようにしています。

* ワイヤプロトコルはネイティブのPostgreSQLと同じなので、マイグレーションツールとかいろいろ既存のものが流用可能
* Pure GoなのでGoユーザーにはビルドが簡単
  * Java, Python, Node.jsのパッケージも公開中。Goで作ったバイナリのサーバーを起動してstdioで指令して使う方式
* オンメモリのみ対応でとにかく起動が高速だし、クエリーなども遅くない
* 初期化が終わったストレージを丸ごとフォークして使うのに対応
  * スキーマ投入と初期データを入れた後に、そこからフォークして書き込みのテストを並列で走らせたりが自由にできる
* PGLiteはシングルユーザーモードしか対応していないが、通常のマルチユーザーモードにも対応させているので複数のセッションからデッドロックのテストもできる
* https://www.pgextensions.org などを参考に、[よく利用される拡張機能](https://shibukawa.github.io/pgmem/ja/extensions/#同梱している拡張)は組み込み済み

## テスト用API

DBを起動すると、localhostでポートを開いてPostgreSQLのエンドポイントが作られるのでどんなフレームワークなどでも接続さえすれば動きます。ただ、テストのための準備とかそのためのバックドアを作るとかは本来やりたくないことですので、一部フレームワーク限定になるかもしれませんが、ショートカットのテスト用APIも作っています。これがテストシャドウ。

DBを使ったテストは大きく3種類に分かれるかなと思います。

* ユニットテスト: DB読み書きのクラスやモジュールのテスト
* APIテスト: HTTPのWebAPIを使う
* フロントエンドのE2Eテスト: Playwrightを使う

それぞれのケースごとのテストが短く書けるようなAPIを入れています。

```go Goのユニットテスト
func TestCreateUser(t *testing.T) {
	fx.ShadowPG(t) // テスト専用フォーク準備
	repo, err := NewUserRepository()
	if err != nil { t.Fatal(err) }
	t.Cleanup(func() { repo.Close() })

	if err := repo.Create(t.Context(), "ada@example.com"); err != nil { t.Fatal(err) }
	if got, err := repo.Count(t.Context()); err != nil || got != 1 {
		t.Fatalf("count = %d, %v", got, err)
	}
}
```

```python PythonのAPIテスト
@pytest.fixture
def client():
    with TestClient(create_app()) as client:
        yield client

@shadow_pg(live=True)
def test_create_order(client):
    response = client.post("/orders", data={"sku": "A"})
    assert response.status_code == 201
```

```java MicronautのPlaywrightのE2Eテスト
@UsePlaywright
@ShadowPg(schema = "db/schema.sql")
class OrdersE2ETest {
    @Inject EmbeddedServer app;

    @Test void createsAnOrder(Page page) {
        page.navigate(app.getURI().resolve("/orders").toString());
        page.getByText("New order").click();
        assertThat(page.getByText("Order created")).isVisible();
    }

    @Test void startsFromPreparedDataAgain(Page page) {
        page.navigate(app.getURI().resolve("/orders").toString());
        assertThat(page.getByText("No orders")).isVisible();
    }
}
```

といっても、接続先の変更はやはりちょっとは手を加える必要があります。別プロセスで起動する場合は起動オプションなどでDB接続先が変更できるようにする必要があったりします。Go以外はDBドライバ周りに介入して接続先を動的に変えるのはできますが、Goは環境変数で接続先を渡す必要があります。[overlay](https://zenn.dev/nobonobo/articles/28f0b01050defd)使えばドライバに介入できるかもしれません・・・eBPFとか使っちゃうのも手ですが、強い権限が必要に・・・

## パフォーマンス

以下のグラフを見ていただいたら一目瞭然ですが、8コアマシンで8コア綺麗に使い切って並列で高速に動いていることがわかります。知り合いが試してくれたところ、60秒かかっていたテストが5秒になったとか。TestContainersもreadのみのテストは並列で走らせたりもしていますが、フォークによるスケールは使いやすくてパフォーマンスもすごいでます。

ただ、このプログラム自体、互換性を重視してPostgreSQLのコードをそのまま使うという方針なのでストレージをオンメモリにする以外のチューニングはやっていません。最速を狙うなら方言を吸収しつつSQLiteに投げる方が早いと思います。最終的にCPUがボトルネックになるはずでvCPU 2個とかそういう環境で実行するとそこまで高速化はしないと思います。社内で他の人が試した所、vCPU 4個で6秒が4秒にはなったぐらいだったと(起動時間抜いて？)。その代わりストアドプロシージャも含めて全部動いたと聞きました。

<img class="bordered" src="/images/2026/20261015a/benchmark.png" alt="" width="1109" height="906">

ちなみに、よくテストで使われる人気のTestcontainersですが、ストレージをメモリ上におくtmpfsモードがあるのにあまり知られていない気がします。Testcontainersを使われている方は、ぐぐってこれをオンにするだけで2倍早くなります。

ただ、シャドウAPIを使うと、並列性の制御を完全に行えるわけではない（動いているウェブサーバーの接続先をテストケースごとに置き換えるとかは難しいし、テストケースごとにウェブサーバー起動するのはオーバーヘッドが大きい）ので、ワーカーを分けてワーカー単位の並列にはなります。もちろん、1つのテストケースの高速化の恩恵はあるかと思います。

## 実装

思いつきでClaude Codeに依頼したらさくっと動くところまでやってくれました。ただ、バイナリサイズをなるべく小さくしたり、性能を上げたり、gitの差分が出にくいように[wasm2goにパッチをあててみたり](https://github.com/shibukawa/wasm2go-fork/tree/pgmem)、拡張機能を追加したり、マルチユーザーモードの実現などいろいろ試行錯誤はしました。だいたいできることはやりきったかな、と思います。API周りはClaudeの週間の枠を使い切ったのでCodexにお願いしたりしていますが。

wasm2goはもともとはアドレスがむき出しの巨大なgoファイルいくつかを出力するスタイルとなっているのですが、それだとGitの差分がすごく出てしまうので元ファイル名を復元してファイル分割したりとか色々やったり、SIMD対応を入れたりしています。ただ、Go本体にSSE世代の命令を多用し、AVX世代の命令を使おうとすると命令セット切り替えでパフォーマンスが出ないという[不具合](https://github.com/golang/go/issues/80835)があり、良い感じの実際動作確認できていないのでいつPRを出そうかなと考え中。あと、Go 1.27のAPIが安定しているsimdパッケージは対応している命令が少なく、simd/simdarchは性能が良いもののAPIが安定しない。

## バージョンルール

単純なセマンティックバージョニングには従わない方針にしようと思っています。末尾がこのOSS自身のバージョンですが、依存しているPostgreSQLのバージョンごとに並列させる必要があるので以下のルールにしています。

* 1.18.x: 18系のバージョン
* 1.19.x: 19系のバージョン

.xの部分箱のパッケージにとっての唯一のバージョンなので、場合によっては後方互換性がなくなるかもしれないし、新機能が増えるかもしれません。まああまりないとは思いますが。

なお、まだ19はbeta4なので、0.19.xにしています。19が出たら1.19にあげようかと。

## まとめ

AIのおかげで、何かをやる片手間でどんどんアイディアが検証できて楽しいですね。作りたいものがたくさんあるけど、手をだす時間がないな、という人には今はボーナスタイムですね。

モックを使わずとも、うまくE2Eテストに埋め込んでE2Eテストも並列でやらせたりとか、より柔軟なシステム開発ができそうです。

## おまけ

オンメモリ版のPostgreSQLができたぜ、といって知人にお披露目したところ、MonotaroのmasahitoさんがMariaDB版を作ってくれました

* [mariamem](https://github.com/masahitojp/mariamem)

OpenSearchとValkeyも作成中です。コアはできたけど、使いやすいテストAPIとかはまだです。AI時代もコア部分は一瞬でできても、ベンチマークを取って改善したり、使いやすいAPIを作ったり、インストールしやすいように整備したりすると、だいたいその10倍以上は手間がかかりますね。
