---
title: "Good First Issue から OSS へコントリビュートしてみた"
date: 2021/02/05 00:00:00
postid: ""
tag:
  - OSS
  - OSSコントリビュート
  - go-swagger
category:
  - Programming
thumbnail: /images/20210205/thumbnail.png
author: 多賀聡一朗
lede: "TIG DXチームの多賀です。[Good First Issue] にコントリビュートしてみたので、経験談について記載してみます。[Good First Issue]で定義されており、初めてのコントリビュートに向いている Issue につけられるラベルです。"
---
## 概要

TIG DXチームの多賀です。[Good First Issue](https://goodfirstissue.dev/) から、OSS ([go-swagger](https://github.com/go-swagger/go-swagger)) にコントリビュートしてみたので、経験談について記載してみます。

## Good First Issue とは

[Good First Issue](https://goodfirstissue.dev/) は、GitHub の `good first issue` ラベルの付いた Issue を一覧で参照できるサイトです。 `good first issue` ラベルとは、[GitHub のデフォルト](https://docs.github.com/en/github/managing-your-work-on-github/managing-labels#about-default-labels)で定義されており、初めてのコントリビュートに向いている Issue につけられるラベルです。

サイトは、コードレビューツールを開発されている [deepsource](https://deepsource.io/?ref=gfi) 社によって、運営されています。対象のGitHub リポジトリは、[deepsourcelabs/good-first-issue](https://github.com/deepsourcelabs/good-first-issue#adding-a-new-project) にて、[コントリビュートしやすくするための条件](https://github.com/deepsourcelabs/good-first-issue#adding-a-new-project)をクリアしたものだけが管理されています。
(PRを送ることで、リポジトリを追加することも歓迎されていそうです。)

<img src="/images/20210205/image.png" loading="lazy">


## OSS コントリビュート

今回のコントリビュートの経緯としては、[フューチャーOSS推進タスクフォース](/articles/20201107/)  の活動があります。活動の一環として、OSS コントリビュートを増やしていければと考えています。筆者も少しお手伝いする中で、まずは自分がやってみようと思ったことがきっかけです。

以下は、筆者のコントリビュートまでの流れを、失敗も含めて経験談としてそのまま記載しています。少々冗長になってますが、流れがイメージできると良いかなと思ったので、そのままにしています。

### Issue をみつけるまで
筆者は、OSS コントリビュートを普段から息をするようにしているタイプではないので、どうやったら簡単にできるのか調べながら実施しました。コントリビュートの方法は色々あると思いますが、筆者は GitHub の Issue を探す方法を取りました。そこからさらに調べてみた結果、初心者向けラベルがついた Issue を選べばよいのかなというところまでたどり着きましたが、実際に対象 Issue を決めかねていました。そんな中、以下の流れで  Issue を決めることができました。

1. [Good First Issue](https://goodfirstissue.dev/) で [go-swagger](https://github.com/go-swagger/go-swagger) を発見
    * GitHub の Issue からのラベル絞り込みを試していましたが、対象も多くイマイチ決めきれていないところで、[Good First Issue](https://goodfirstissue.dev/)  を見つけました。`good first issue` を言語別に検索できるということで、 得意な `Go` 言語で絞り込んでみました。その結果、たまたま PJ 等でよく利用していた [go-swaggeer](https://github.com/go-swagger/go-swagger) が上位に出てきました。ライブラリの利用時にコードもある程度読んで、なんとなく理解していたので、これならわかるかもと思い Issue をいくつか見てみました。
2. 解決したいIssue を発見
    * いくつか Issue を参照した中で、ひとつの Issue ([Can't configure content type in generated client · Issue #1924 · go-swagger/go-swagger](https://github.com/go-swagger/go-swagger/issues/1924) )が目に止まりました。 Issue の詳細を読んでいく中で、「そういえば以前使った際に、生成された Client コードが使いづらかったな」ということを思い出し、 **この機能欲しいな** と思っていました。また、Issue をよく見ると `good first issue` がついているだけあって、作者から直しの方針がコードベースで記載されていて、後はこのコードを入れ込むだけでした。これなら、自分でもできると思い対応してみることにしました。


### Issue を見つけて PR を送るまで

対象 Issue を決めたので、修正範囲を特定するために、まずはリポジトリを clone してみました。ソースコードを眺めて print デバッグしながら修正箇所を特定していきました。詳細は本筋とずれるので割愛しますが、今回は以下2点の修正でした。

- Client テンプレートファイルの修正
- swagger コマンドに含まれるテンプレートファイルの更新
	- go-swagger では [kevinburke/go-bindata](https://github.com/kevinburke/go-bindata) を利用して、build 時にテンプレートファイルを含めるようになっていました (余談: Go 1.16 から変わるかもですね。)

修正して動作確認がとれたので、 master ブランチに commit しました。このままだと PR が送れないと気づいたので自分の GitHub アカウントに Fork して、remote を追加して git push しました。
PR を送ろうかと考えていたとき、 go-swagger のコントリビュート方針があるのではと気づいたので、リポジトリを探してみると、`.github` ディレクトリ以下に、 [CONTRIBUTING.md](https://github.com/gmidorii/go-swagger/blob/master/.github/CONTRIBUTING.md) がありました。[CONTRIBUTING.md](https://github.com/gmidorii/go-swagger/blob/master/.github/CONTRIBUTING.md) にリンクされる形で、 [Guidelines to maintainers](https://github.com/gmidorii/go-swagger/blob/master/docs/guidelines/README.md) を見つけました。

ガイドを読んでいると、[Guidelines to maintainers](https://github.com/gmidorii/go-swagger/blob/master/docs/guidelines/README.md) に、PR の Rule があり、 `Draft PR` を上げてレビュー前に CI チェックしても良いとあったので、テスト修正対象の特定をしたく、ひとまず `Draft PR` を作ってみました。すると、テスト以外の CI が失敗していました。 失敗した CI とガイドを再度見返すと 「[sign off](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt--s)」を commit へ入れてくれと記載があることに気づきました。CI のエラーメッセージを参考にしつつ commit を amend して直してみたところ、おそらく rebase で HEAD から戻すコミット数をミスしており、commit の状態が壊れてしまいました (ここは未だに細かくわかっていないです)。

commit の状態を復元するのに時間を使うか、修正箇所が少ないので最初からやり直すか悩んだ末、最初からやり直すことにしました。[Draft PR](https://github.com/go-swagger/go-swagger/pull/2500) を Closeし、Fork した master ブランチを汚していたので一度削除して再 Fork しました。今度は master からブランチを切り、修正を sign off 付きで commit して、再度 `Draft PR` を上げました。 説明は `fixs #${issue 番号}` を入れてほしいと合ったので、Draft なこともあり、一旦その文言のみをいれて [PR](https://github.com/go-swagger/go-swagger/pull/2507) を発行しました。

<img src="/images/20210205/Pasted_image_20210203191633.png" loading="lazy">


あとで、説明を追加すればよいかと思い、1日程度置いていると、レビュワーの方から `Approve` されてました。レビュワーの方から「どうして Draft なのか ?」と聞かれていたので、「CIを見たかったから」と返しつつ `Approve` 出ているので良いだろうと思い、そのまま `Open` にしました。
また 1日後にみると、マージされていて、無事コントリビュートに成功しました。


## 振り返り

実際にコントリビュートしてみて、いくつか気づきがありました。

### Issue 選定

コントリビュート初心者が選ぶ Issue として、個人的にですが以下2点が重要だと感じました。

- 「利用したことがあるライブラリ/ツール」であること
- Issue を見たときに「この機能欲しい/直したい」と思えること

最初にコントリビュートするにあたって、「初めての壁」はどうしてもあります。壁突破の一つのやり方として、うまくモチベーション作る方法があるかなと思います。
この2点をクリアすることで、いい感じのモチベーションが生まれたなと思いました。

実際の手順に落とし込むと、以下の形が良さそうです。

1. [Good First Issue](https://goodfirstissue.dev/) 等のサイトを利用して、初心者でもできる Issue のみを参照
2. 書きたい or 得意な言語を選定
3. 利用したことがある ライブラリ/ツール がないか検索
4. Issue をいくつか眺めてみて、欲しい/直したいと最も思えるものを選択


### 改善点

3点ほど失敗していたので、どうしたら良かったのかについても考えてみました。

1. CONTRIBUTING.md を最初に読む
    ガイドの読み込み不足で、いくつかミスをしました。[Good First Issue](https://goodfirstissue.dev/) のリポジトリは CONTRIBUTING.md が必ずあるようなので、まず読んで見るべきでした。
2. master ブランチに直修正しない
    Fork 先へ push するので問題ないかと思い master にしてましたが、Fork 元の master の状態がなくなり修正が効かなくなるので、ブランチは何かしら切ったほうが良さそうでした。その際、ブランチの切り方にルールがないかガイドを確認するべきですね。
3. Draft PR でも参照されるので説明を書く
    レビュワーにもよりそうですが、Draft でも見られることがあるので、多少なりとも説明は書いておいたほうがより通りやすくなりそうです。
    今回は Issue 側に細かく書いてあったので、なくてもなんとかなったのかなと思いました。


## 所感

OSS コントリビュートしてみた経験談について記載してみました。

開発初心者みたいな恥ずかしい失敗もしてしまいましたが、結果マージまでされてよかったです。1回経験すると、2回目以降のハードルが下がったなと実感もしているので、またコントリビュートしていきたいと思いますし、輪を広げていけると良いなと思います。
