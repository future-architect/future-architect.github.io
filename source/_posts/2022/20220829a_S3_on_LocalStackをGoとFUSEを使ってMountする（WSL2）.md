---
title: "S3 on LocalStackをGoとFUSEを使ってMountする（WSL2）"
date: 2022/08/29 00:00:00
postid: a
tag:
  - S3
  - LocalStack
  - Go
category:
  - Programming
thumbnail: /images/2022/20220829a/thumbnail.png
author: 真野隼記
lede: "夏休み自由研究連載の5本目です。go-fuse でLocalStackでローカル環境にエミュレートされるS3バケットをマウントするツールを開発しました。"
---
# はじめに

TIG DXユニットの真野です。[夏休み自由研究連載](/articles/20220822a/)の5本目です。

ずっと気になっていた、[go-fuse](https://github.com/hanwen/go-fuse)を用いて、[LocalStack](https://github.com/localstack/localstack) でローカル環境にエミュレートされるS3バケットをマウントするツールを開発しました。普段はWebのAPIサーバを中心に開発しているので、FUSEとはいえファイルシステムの知識が無く、トライ＆エラーの連続ですごく楽しい自由研究（工作）でした。

モチベーションは以下です。

* 業務でよくS3にアクセスするコードを書き、ローカル開発ではLocalStack上のS3を用いてテストしている
* LocalStack上のS3に事前データを置いたり、事後データの検証にいちいちアクセスコードを書くのが面倒
  * 実装ミスで予期しない階層にファイルを出力してしまったりするときに、容易に視認できるようにしたい
  * aws cliコマンドを叩けば良いけど、コマンドを覚えられないし手間がある
* FUSEを用いてマウントできたら、初心者フレンドリーである
  * WindowsでもWSL2であればFUSEが利用できる
  * 標準のエクスプローラー（explorer.exe）で、WSL2上のUbuntu-20.04上のディレクトリも見れるのでより便利
  * VS Codeなどでのエディタでも確認できツールを統一できるし、ターミナルの手慣れたコマンドを利用できる（diffなど）

ポイントは、LocakStack自体がローカル（やCIでの）テスト環境ですので、これをマウントするツールもテスト支援ツールとして動かしたいということがあります。AWSなどクラウド上で稼働するランタイムのアプリケーションが直接マウントしたディレクトリを経由してS3に書き込むことは想定していません。

※動作検証したのがWSL2だけで、Macだと新し目のOSだと動かないようです（古いMacしか手持ちになく、すいません）。

## LocalStackとは

[2022年7月13日にGA 1.0になったと発表された](https://localstack.cloud/blog/2022-07-13-announcing-localstack-v1-general-availability/)、AWSの主要なサービスのAPIをローカル端末上でエミュレートするという、開発に便利なツールです。

2016年頃は、API Gateway、Lambda、DynamoDBなど8つのサービスをサポートしていましたが、今や80を超えるサービスが利用できるとのことです。わたしも現在業務で使っており、開発上ほぼすべてのユースケースを網羅できていて助かっています。どれくらいのカバレッジか気になる人は[AWS Service Feature Coverage](https://docs.localstack.cloud/aws/feature-coverage/) ページもあります。

* https://localstack.cloud/
* https://github.com/localstack/localstack

## FUSEとは

FUSEとはFilesystem in Userspaceの略で、ユーザーランドで手軽に動作するファイルシステムを作成するための仕組みです。FUSEではカーネルがファイルなどの操作のシステムコールを、ユーザーランド側で動作しているプロセスに転送する仕組みで、決められたインタフェースを実装すると、手軽にファイルシステムを実装できます。同僚の澁川さん著作な[Goならわかるシステムプログラミング 第2版](https://www.lambdanote.com/products/go-2) の10章にも触れられています。

下図は[Wikipedia](https://ja.wikipedia.org/wiki/Filesystem_in_Userspace)より引用した動作イメージです。左上の `ls -l` をされると、カーネルにシステム要求が飛び、それをFUSEの仕組みを経由してユーザーランドのアプリケーションが応答するような流れです。

<img src="/images/2022/20220829a/800px-FUSE_structure.svg.png" alt="800px-FUSE_structure.svg.png" width="800" height="606" loading="lazy">

今回は右上のユーザーランド側のプロセスで、AWS SDK for Goを用いてS3 on LocalStackをバックエンドにadaptorするようなコードを書きました。

ファイル操作がカーネル→ユーザーランドと切り替わるということは、コンテキストスイッチが発生することで、性能は一般的に良くなさそうですよね。今回の用途では実際の永続化先がS3であり、I/O待ちが支配的だと思うので、裏側がS3だと分かっていればそこまでレイテンシは気にはなりませんでした（重い処理をすると当然遅いですが）。

## go-fuse とは

[go-fuse](https://github.com/hanwen/go-fuse)はFUSEのGoバインディングです。この自由研究では安直ですがStar数が多かったのでこれを採用しました。他の選択肢としては[winfsp/cgofuse](https://github.com/winfsp/cgofuse) が良さそうな感じがします。

go-fuseのAPIはバージョンが1系と2系がありますが、今回うっかり1系で実装してしまったのは反省です。

## デモ

作ったものを紹介します。すでにLocalStack上のS3が起動していれば不要ですが、なければ次のコマンドを実行して立ち上げます。

```sh LocalStackの起動
git clone https://github.com/ma91n/localstackmount.git
cd localstackmount
docker compose up -d
```

次にlocalstackmountを起動します。Windowsの人はWSL2で実行してください。

```sh マウントの実行
go install github.com/ma91n/localstackmount@latest
localstackmount
```

そうすると、 `~/mount/localstack` 配下にLocalStackの全S3バケットがマウントされます。

awscliでファイルを予め登録したファイル(hello.txt)を確認→マウント上でそのファイルに1行追記→awscliで追記されていることを確認するデモをしてみました。

デモは以下のことをしています。

1. 左のウィンドウで `localstackmount` を起動
1. 真ん中のウィンドウで、 awscliの `s3 api list-buckets` でバケットの一覧、`s3 ls --recursive` と `s3 cp` コマンドでファイルをダウンロードし表示
1. 右のウィンドウで、LocalStackをマウントしたディレクトリにアクセスし、先程ダウンロードしたファイルを編集・保存
1. 真ん中のウィンドウに戻って、マウント経由で編集したファイルをaws cli経由で再度ダウンロードし、編集結果が反映されていることを確認

<img src="/images/2022/20220829a/demo1.gif" alt="" width="1200" height="502" loading="lazy">

もちろん、エクスプローラからも確認できます。

<img src="/images/2022/20220829a/demo2.gif" alt="" width="1200" height="565" loading="lazy">

GIF動画では実演してないですが、もちろんVS Codeで好きに編集・保存をしても、LocalStack上のS3に反映されます。そこそこ便利かと思います。

## 実装

コードはここに上げています。

* https://github.com/ma91n/localstackmount

詳細はリポジトリを見ていただくとして、大きな実装の流れとしてはまず以下のAPIを実装することです（多いです）。

```go
type FileSystem interface {
	// 中略

	// Attributes.  This function is the main entry point, through
	// which FUSE discovers which files and directories exist.
	GetAttr(name string, context *fuse.Context) (*fuse.Attr, fuse.Status)

	// These should update the file's ctime too.
	Chmod(name string, mode uint32, context *fuse.Context) (code fuse.Status)
	Chown(name string, uid uint32, gid uint32, context *fuse.Context) (code fuse.Status)
	Utimens(name string, Atime *time.Time, Mtime *time.Time, context *fuse.Context) (code fuse.Status)

	Truncate(name string, size uint64, context *fuse.Context) (code fuse.Status)

	Access(name string, mode uint32, context *fuse.Context) (code fuse.Status)

	// Tree structure
	Link(oldName string, newName string, context *fuse.Context) (code fuse.Status)
	Mkdir(name string, mode uint32, context *fuse.Context) fuse.Status
	Mknod(name string, mode uint32, dev uint32, context *fuse.Context) fuse.Status
	Rename(oldName string, newName string, context *fuse.Context) (code fuse.Status)
	Rmdir(name string, context *fuse.Context) (code fuse.Status)
	Unlink(name string, context *fuse.Context) (code fuse.Status)

	// Extended attributes.
	GetXAttr(name string, attribute string, context *fuse.Context) (data []byte, code fuse.Status)
	ListXAttr(name string, context *fuse.Context) (attributes []string, code fuse.Status)
	RemoveXAttr(name string, attr string, context *fuse.Context) fuse.Status
	SetXAttr(name string, attr string, data []byte, flags int, context *fuse.Context) fuse.Status

	// Called after mount.
	OnMount(nodeFs *PathNodeFs)
	OnUnmount()

	// File handling.  If opening for writing, the file's mtime
	// should be updated too.
	Open(name string, flags uint32, context *fuse.Context) (file nodefs.File, code fuse.Status)
	Create(name string, flags uint32, mode uint32, context *fuse.Context) (file nodefs.File, code fuse.Status)

	// Directory handling
	OpenDir(name string, context *fuse.Context) (stream []fuse.DirEntry, code fuse.Status)

	// Symlinks.
	Symlink(value string, linkName string, context *fuse.Context) (code fuse.Status)
	Readlink(name string, context *fuse.Context) (string, fuse.Status)

	StatFs(name string) *fuse.StatfsOut
}
```

多すぎて大変！ って思われた方も大丈夫です。

すべてを実装しなくても、`pathfs.NewDefaultFileSystem()` と言う一律 `fuse.ENOSYS(Function not implemented)` を返すデフォルト実装があるためこれを組み込んで、必要なものだけ順次、動作を確認しながら実装できます。

```go 組み込みの例
type FileSystem struct {
	pathfs.FileSystem

	sess *S3Session

	callTime *time.Time
}

func (f *FileSystem) GetAttr(name string, ctx *fuse.Context) (*fuse.Attr, fuse.Status) {
  // 必要な関数だけ選抜して実装する
}
```

あと、`Open` など `nodefs.File` を返すのですが、こういったインタフェースです。実際にファイルへの追記・編集で使われます（例えばファイルを編集して保存するとWrite、Flush、Releaseが呼ばれます）。

```go
type File interface {
	// 中略

	Read(dest []byte, off int64) (fuse.ReadResult, fuse.Status)
	Write(data []byte, off int64) (written uint32, code fuse.Status)

	// File locking
	GetLk(owner uint64, lk *fuse.FileLock, flags uint32, out *fuse.FileLock) (code fuse.Status)
	SetLk(owner uint64, lk *fuse.FileLock, flags uint32) (code fuse.Status)
	SetLkw(owner uint64, lk *fuse.FileLock, flags uint32) (code fuse.Status)

	// Flush is called for close() call on a file descriptor.
	Flush() fuse.Status

	// This is called to before the file handle is forgotten.
	Release()
	Fsync(flags int) (code fuse.Status)

	// The methods below may be called on closed files, due to concurrency.  In that case, you should return EBADF.
	Truncate(size uint64) fuse.Status
	GetAttr(out *fuse.Attr) fuse.Status
	Chown(uid uint32, gid uint32) fuse.Status
	Chmod(perms uint32) fuse.Status
	Utimens(atime *time.Time, mtime *time.Time) fuse.Status
	Allocate(off uint64, size uint64, mode uint32) (code fuse.Status)
}
```

今回開発した ma91n/localstack では、ChmodやChown、Symlinkなどは非対応にしました。かつ、`Extended attributes` と書かれている `GetXAttr`、`ListXAttr`、`RemoveXAttr`、`SetXAttr` も未実装です（実装していれば適時呼ばれますが、なければノーマルな `GetAttr` などにフォールバックされる仕組みなようです）。

どれがどれに紐づくか、最初はピンとこなかったのでざっくりと紹介します。

* GetAttr
  * ファイルディレクトリの属性（ファイル、ディレクトリ、リンクなどの種別や、権限、サイズ、オーナー、作成日時）などを返します
  * すべての操作で呼ばれます。 `cd` や `ls` や `cat` などマウントしたファイル・ディレクトリ操作で頻発に呼ばれます
  * かなり高速に動くこと必要です
  * 初戦はテスト用のLocalStack。ファイル数は大したことがないので毎回通信で存在チェックすれば良いと思っていましたが、キャッシュを入れないとかなりもっさりでした
* Access
  * `cd` など、ディレクトリに移動可能かの確認で呼ばれます
* Mkdir, Rename, Rmdir
  * 読んだままですが、  `mkdir`, `mv(rename)`, `rm -r` で呼ばれます
* Unlink
  * `rm` で呼ばれます。削除です
* Open
  * head, cat, tail, lessなどファイルを開くと呼ばれます
* Create
  * touchや echo hello > hello.txt などで呼ばれます
* OpenDir
  * `cd`や`ls`などでディレクトアクセスするときに呼ばれます

概ね上記の関数を実装すればファイルエクスプローラを用いてのメインどころの操作はどうにかなりました。

ファイルエディタ系は `Read`、`Write`、`Flush`、 `Release`、`GetAttr` あたりを実装すれば、S3を用いた単体テストで用いるようなS3の操作は動くようになりました。

## 実装メモ

今までファイルシステム周りが何もわからなかったので、実装を通して感じたことを記録に残します。

* S3でディレクトリの表現について仕様が公式ドキュメントに書かれている（仕様が合ったのか）
  * `/` で終わるとフォルダとして判定される
    * https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-folders.html
* 想像以上に `GetAttr` が利用される
  * 例えば、 mnt-point/bucket/aaa/bbb/ccc/log.txt というファイルを操作すると、 `bucket`, `bucket/aaa`, `bucket/aaa/bbb`, `bucket/aaa/bbb/ccc`, `bucket/aaa/bbb/ccc/log.txt` といった親のパス全てに対して `GetAttr` が呼ばれます
  * S3バックエンドだと、実際には `aaa/bbb/ccc/log.txt` というオブジェクトがあるだけで、実際にフォルダとして `aaa`や`bbb`があるわけではないことがあるので、上記の大部分は無駄です
  * 最終的にはキャッシュレスは諦め、[go-cache](https://github.com/patrickmn/go-cache)を導入しました
* キャッシュの扱い。難しい・うまくハマると速度向上が体感できて楽しい
  * キャッシュの扱いですが、例えばファイルを書き込んだ後には破棄しないと、エディタによってはアプリで持っている情報と不整合が生じて警告を出してくることがあります。別にFUSEを用いた実装に閉じた話でもないですが、適切なハンドリングが必要でした
<img src="/images/2022/20220829a/FbGZVhJUIAA3Im7.jpg" alt="FbGZVhJUIAA3Im7.jpg" width="1143" height="699" loading="lazy">
  * オブジェクトストレージと、ファイルシステムとのギャップも感じました
    * 例えば、 `/bucket/dir1/aaa.txt` を削除すると、`GetAttr` のキャッシュとしては `/bucket/dir1/aaa.txt`、`/bucket/dir1`、`/bucket` の3つを無効化しないと不整合になる場合があります
      * ※実際に `dir1/` のオブジェクトが存在するとは限らないため、`aaa.txt` が消えたら `bucket` だけが残る方が自然なケースがある
* フォルダのリネームが面倒くさい
  * S3だとキーの途中をリネームすることになりますが、複数オブジェクトが存在すると面倒です
  * prefixをもとにlistObjectし、対象となった全オブジェクトに対してgetObject、キーを書き換えてputObjectし、もとのキーをdeleteObjectする必要があり重い処理です
  * S3マウントツールで有名な[kahing/goofys](https://github.com/kahing/goofys) も、1000個までと制約をかけているようです
* ctrl+c で停止できない理由は、ターミナルで開いていたから
  * `signal.Notify(ch, os.Interrupt, syscall.SIGTERM)` といったコードで、チャネル経由でシグナルを拾ってアンマウントする処理を実装していたんですが、`Device or resource busy
` で失敗することがありました
  * 調べてもよくわからなかったのですが、マウントしているディレクトリじょうにターミナルで移動していると、何かしらのファイルディスクリプタを握ってしまうのか、アンマウントに失敗するようです
    * 面倒くさいですが、再起動するときは `cd ~` していました（どうにかならないものか）
* エクスプローラー（explore.exe）で開くためにはオプションが必要
  * `allow_other` というオプションが必要でした
* Macで動かない？
  * Macでは標準でFUSEが入っていないので、[osxfuse](https://osxfuse.github.io/)をインストールしてもらう必要がある
  * go-fuseはosxfuseの3系は動くようですが、4系は動かない模様（自環境が無く未検証）
  * osxfuseの3系が入るOSバージョンであれば、動作しました
* 開発環境
  * Windowsで開発する場合、goosをlinuxにしないとビルドが通らないのでご注意を

## 実装して学べたこと

総じて、普段あまり意識しないレイヤーがどう動作するかを感じることができ、やってみて良かったと思っています。

* `cd`、`ls` などのコマンドが、どのようなファイルシステム操作をしているか再認識したり、挙動について覚え直すキッカケなった
  * mvするときに、既存のファイルが存在したら上書きする or しない
* ファイルシステムとしての実装の考え方が少しわかった
  * どの操作で、どのようなAPIが呼び出されるかの脳内マッピング（これくらいのAPI数で逆に成り立つのか、まぁ成り立つよねという心の天秤）
  * どこにキャッシュを用いると効果的かの勘所
  * 高速化の工夫と、マウントを経由しない別経路での更新（例えばAWS CLIで直接更新など）とのバランス（キャッシュの有効期限のパラメータ調整）
* 例えばVS Codeがどのような情報をファイルシステムに問い合わせているか、FUSE側のAPI呼び出しのログを見てイメージが湧いた
  * VS Codeで `my-bucket/aaa/bbb/hello.txt` にあるマウントしたファイルを開くと、以下のファイルを探していた
    * `my-bucket/aaa/bbb/git.exe`
    * `my-bucket/aaa/.git`
    * `my-bucket/aaa/HEAD`
    * `my-bucket/.git`
* FUSE、思ったよりWSL2でシャキシャキ動く
  * Windowsならではのハマりがもっと壮絶にあると思ったんですが、環境周りのハマりはほぼ無しで余裕でした
    * 逆にMacは新しいバージョンの手持ちが無く動作検証ができず

## 今後について

どこまでがんばるかということはあるのですが、いくつか試したいことがあります。

* go-fuseの2系のAPIに書き換える
  * winfsp/cgofuse に載せ替える（Macなどのサポート的にこっちの方が良い気も..？）
* `Extended attributes` 系のAPI対応
  * おそらく性能などに有利
* 各操作の goroutine 化
  * 現状の実装だと、全て同期的に書いているのでマルチコアを全く行かせていません
  * 一般的にはgoroutineを活用したほうが良さそうです
* ファイル自体のキャシュ
  * 現状ではS3に対するファイル属性の取得のための、listObjectを中心にキャッシュしています
  * S3のgetObjectは、`IfModifiedSince` と呼ばれる機能があり、指定した時間より更新がなければ `304 (not modified)` を返す機能があります
  * これを用いた、マウント外のディレクトリにファイルをキャッシュしておき、更新がなればそのファイルを用いれば有効なケースもあるかなと目論んでいます

## まとめ

* WSL2（Macは一部OS）に対応した LocalStack上のS3をマウントするツールを、go-fuse を用いて実装してみたよ
* ファイルシステムといっても、FUSEと各言語ごとのバインド（例: go-fuse）を用いれば気軽に実装できるよ
* 普段あまり意識しない人にもオススメだよ
* S3とファイルシステムのギャップは色々あるけど、工夫のしどころが多くて楽しいよ

最後まで読んでいただきありがとうございました。
