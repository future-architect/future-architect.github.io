---
title: "GoLand の WSL2 対応状況を見てみる"
date: 2024/07/12 00:00:00
postid: a
tag:
  - Go
  - goland
  - WSL
  - IDE
category:
  - Programming
thumbnail: /images/20240712a/thumbnail.png
author: 真野隼記
lede: "Go開発者向けIDEであるGoLandの、Windows WSL2サポートを試しました。"
---
<img src="/images/20240712a/top.png" alt="" width="1200" height="548" loading="lazy">

https://www.jetbrains.com/go/

## はじめに

TIG真野です。

IntelliJ IDEAで有名なJetBrains社による、Go開発者向けIDEであるGoLandの、Windows WSL2サポートを試しました。結論はWSLサポートが良い感じにバッチリ動いたということです（そのため、Windows側からWSL配下へプロジェクトのパスを引っ越しました）。

## WSLに寄せるモチベーション

`\\wsl$` 配下に `.go` などのファイルを配備したいモチベーションですが、Windows側の `C:\\` 配下のファイルに対して、WSLで処理すると、I/O速度の違いから体感できるほど各種コマンドの実行速度が低下するためです。

Goのアプリ開発においても、 `C:\\` 配下のファイルに対して、WSL上で `go build` や `go test` などのコマンドを実行すると、おそらくファイルI/Oの速度差からか明らかに実行時間が増えるため、できれば避けたい組み合わせです。

## GoLandのWSLサポート状況

[Releases : The GoLand Blog](https://blog.jetbrains.com/go/category/releases/)を見る限り、GoLandは年に3回ほど新バージョンを出すスケジュールを組んでいるようです。WSLへのサポートは2021年頃に行われており、もしかするとこの記事の検証内容は2年以上前から試すことができたかも知れません。もちろんドキュメントにも[WSLサポート](https://www.jetbrains.com/help/go/how-to-use-wsl-development-environment-in-product.html#enable-debugging)について詳しく書かれています。

- [2021-3](https://www.jetbrains.com/go/whatsnew/2021-3/#page__content-wsl-support)
  - `\\wsl$` 配下にプロジェクトを作れるようになった
- [2020-2](https://www.jetbrains.com/go/whatsnew/2020-2/#:~:text=Version%20Control-,WSL%202%20support%20for%20Git%20on%20Windows,-GoLand%202020.2%20will)
  - `\\wsl$` 配下でもGit連携ができるようになった

時間差でWSLチャレンジした理由ですが、どのバージョンかは記憶にないのですが、過去トライした時に以下の点が上手く行かなかったからです。

- 認証付きプロキシ設定の読み込みが成功しなかった（≒この時点でノックアウト）
  - [ローカルプロキシで認証プロキシの煩わしさを解消！](https://future-architect.github.io/articles/20240227a/)にあるmitmproxyで暫定回避はできた
- Excelなどシステムで拡張子に紐づいたアプリを開けなかった（いちいち、エクスプローラ経由で開いていた）
  - このあたりの使い勝手が面倒になり撤退した

その当時から半年~1年程度は経過したタイミングで、[2024.1](https://www.jetbrains.com/go/whatsnew/) にて再トライしたところ、かなり良い感じだったので、WSL側にプロジェクトを作る方向に舵を切りました。

## 試した事項

以下の条件で動かしています。

- `GoLand 2024.1.3`
- WSL側（`\\wsl$` 配下）にプロジェクトを作成
- `Ubuntu-22.04`を WSL2で実行

| No | カテゴリ                         | 結果 | メモ                                                                                                                               |
|----|----------------------------------|------|------------------------------------------------------------------------------------------------------------------------------------|
| 1  | GOPATH認識                       | ✅️    | 成功                                                                                                                               |
| 2  | IDE経由でGo SDKインストール      | ✅️    | 成功                                                                                                                               |
| 3  | 認証付きプロキシ                 | ✅️    | 成功                                                                                                                               |
| 4  | テスト実行                       | ✅️    | 成功                                                                                                                               |
| 5  | デバッグ実行（ステップ実行）     | ✅️    | 成功                                                                                                                               |
| 6  | デバッグ実行（ブレークポイント） | ✅️    | 成功                                                                                                                               |
| 7  | Excelを開く                      | ✅️    | 関連アプリケーションで開くでOK。デフォルト起動方法の変更は未調査だが、Windows側に作成したプロジェクトでも同様なので、WSL関係なし   |
| 8  | GitHubで開く                     | ✅️    | サードパーティ、標準パッケージのファイルに対しては開けなくなっていたが、Windows側に作成したプロジェクトでも同じなので、WSL関係ない |
| 8  | PlantUMLプレビュー               | ✅️    | apt installなどのセットアップ無しで利用可能                                                                                      |

### GOPATH設定

[公式のLinux環境でのGoインストール手順](https://go.dev/doc/install)で設定したパス `\\wsl.localhost\Ubuntu-22.04\usr\local\go` が認識できるか試しました。

これは設定からそのパスを指定すればOKです。

Go > GOROOT の設定にて、ローカルのディレクトリ追加で、`C:` と `\\wsl.localhost\Ubuntu22.04` が選択できます。

<img src="/images/20240712a/img_2.png" alt="" width="645" height="316" loading="lazy">

Goのインストールフォルダを指定すれば認識してくれます。

<img src="/images/20240712a/image.png" alt="Go 1.22.0を選択" width="1200" height="385" loading="lazy">

GOPATH設定については何も違和感なく利用できます。

### IDE経由のGoインストール

同じ設定画面で、プラスボタン > ダウンロードを選択してIDE経由でGo環境をインストールできます。

<img src="/images/20240712a/image_2.png" alt="" width="722" height="272" loading="lazy">

デフォルトインストール先は `\\wsl.localhost\Ubuntu-22.04\home\YOURNAME\sdk` でした。`go1.23.rc1` を選択してインストールしました。IDEのターミナルにも反映されてるので便利。

```sh
$ go version
go version go1.23rc1 linux/amd64
```

Go SDKのIDE経由のダウンロードも、ストレス無く快適に設定できます。

### 認証付きプロキシ

過去のバージョン（の一部？）で、認証付きプロキシの設定が使われず依存パッケージの更新がエラーになるケースがありました。プロキシ利用は読み込むものの、ID・パスワード認証がダメな挙動でした。↓が残っていたキャプチャです。

<img src="/images/20240712a/image_3.png" alt="" width="1200" height="273" loading="lazy">

`GoLand 2024.1.3` では完全に解決していました。使う上で支障はなくこの点でストレスはゼロです（↓のキャプチャだとフォント色が赤でエラーのようですが、無事 `go get` が成功しています。

<img src="/images/20240712a/image_4.png" alt="" width="1200" height="252" loading="lazy">

### テスト実行

<img src="/images/20240712a/image_5.png" alt="" width="1106" height="436" loading="lazy">

<img src="/images/20240712a/image_6.png" alt="" width="469" height="121" loading="lazy">

エディタ上からもテスト実行でき、結果もスムーズに確認でき問題なしです。これは過去のどのバージョンでも上手く動かなかったところを見たことがないので、安定している機能な気がします。

### デバッグ実行

デバッグ実行ですが、ステップ実行はできるもののブレークポイントが動かない？ といった課題に遭遇したことがあります。[Debugger does not work on a project opened via //wsl$/...](https://youtrack.jetbrains.com/issue/GO-12517/Debugger-does-not-work-on-a-project-opened-via-wsl-...)課題がYouTrackにも上がっていました。

`GoLand 2024.1.3` では問題ゼロで動作します。

<img src="/images/20240712a/image_7.png" alt="" width="1200" height="708" loading="lazy">

以下のわたしが期待していることが全て実行できます。

- サードパーティのパッケージにステップイン/アウト
- 標準パッケージにステップイン/アウト
- 式の評価

課題が解決してよかったです。

### Excelを開く

テストデータにExcelファイルを格納していて、GoLand上からMS Officeを起動して参照/編集を行いたいというユースケースが私にはあります。

左クリック > 開く > 関連アプリケーションで開くからExcelを起動することはできます。

<img src="/images/20240712a/image_8.png" alt="" width="1006" height="969" loading="lazy">

ダブルクリックすると、GoLand組み込みのExcelビューアが起動するようです。ファイル拡張子に関連アプリケーションを紐づけて開けそうですが、設定方法が分からず放置しています。過去のあるバージョンは、この関連アプリケーションで開くことすらできず、起動に失敗していた記憶があるので、順調に不具合がなくなっているなと感じました。

### GitHubで開く

開く > GitHubで開くで、現在エディタで開いているリソースの、GitHub上のページをブラウザで開くことができます。プライベートリポジトリでも可です。実装について質問を受けた際のリプライに便利なので上手く動いて良かったです。

<img src="/images/20240712a/image_9.png" alt="" width="837" height="337" loading="lazy">

※昔のバージョンでは、サードパーティ製や標準パッケージのファイルに対しても、GitHubで開くができたと思いますが、そちらはできなくなった（？）ようです。WSL、Windows側のプロジェクト両方で表示が消えていました。

### PlantUMLプレビュー

GoLandのMarkdownプレビューでPlantUMLを有効にするためには、言語 & フレームワーク > Markdownの設定で、PlantUMLのチェックを有効にします。

<img src="/images/20240712a/img_3.png" alt="" width="1200" height="571" loading="lazy">

以下のようにPlantUMLのシーケンス図が表示されました。`sudo apt install -y graphviz openjdk-21-jre-headless` など個別のインストール無しでレンダリングに成功したので、ちょっと驚きました（優しいですね）。

<img src="/images/20240712a/img_4.png" alt="" width="1200" height="536" loading="lazy">

## つかってみての感想

WSL上なので各種Linuxコマンドを不自由なく使え、かつビルドやテストなどの実行速度も向上しました。体感では倍近く早くなった気がします。とても快適になりました。

開発でよく利用しそうな機能を中心にトライしましたが、[2020年にWSL2が正式リリース](https://forest.watch.impress.co.jp/docs/shseri/win10may2020/1250493.html)してから4年以上経過し、エコシステムも枯れてきたこともあるのか、GoLandでもストレスなく洗練した体験で利用できました。少しトライするのに遅すぎた気がしますが、胸を張ってWSL2をもっと利用しようと言えるようになりました。

## さいごに

過去にWSL2を試した際は、課題が多く厳しいな～という印象でしたが、いつの間にか一切の不満を抱かせない完成度にGoLandが育っていてとても驚きました。

少なくても `2024.1` のバージョンでは WSL2であっても何1つ不自由なく使えた、という結論でした。
