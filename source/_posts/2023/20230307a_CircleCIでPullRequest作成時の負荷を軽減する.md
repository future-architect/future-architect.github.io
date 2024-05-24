---
title: "CircleCIでPullRequest作成時の負荷を軽減する"
date: 2023/03/07 00:00:00
postid: a
tag:
  - CircleCI
  - GitHub
  - リリース
category:
  - DevOps
thumbnail: /images/20230307a/thumbnail.png
author: 宮永崇史
lede: "CircleCIでGitHubのPR作成時の負荷を軽減するために、PR作成者の自動アサインおよびラベルの付与を自動化した話をご紹介します。"
---
<img src="/images/20230307a/theme.png" alt="" width="1200" height="673" loading="lazy">



# はじめに
こんにちは。
フューチャーアーキテクト株式会社、TIG/EXユニット所属の宮永です。

>※TIG(Technology Innovation Group)はテクノロジーカットでお客様の課題解決を行う部門です。
中でもEX(Energy Transformation)ユニットは2022年に新設されたエネルギー業界特化型のコンサルティング集団で、「エネルギー×テクノロジー」をコンセプトにエネルギーサプライチェーン全体での需給の最適化やレジリエンス強化を図り、地域の活性化やビジネスモデルを変革することで透明性の高いフェアなマーケット形成を目指します。

本記事ではCircleCIでGitHubのPR作成時の負荷を軽減するために、PR作成者の自動アサインおよびラベルの付与を自動化した話をご紹介します。

# 経緯

CircleCIでGitHubのPullRequest作成時の負荷を軽減したいと思った経緯について説明します。

私が所属するチームのブランチモデルは簡易的なgit-flowモデルに則っており、`main`、`develop`、`feature`の3つのブランチで運用しています。

デフォルトブランチを`develop`として、改修する時は`develop`ブランチから`feature`ブランチを切ります。改修が完了したら`feature`→`develop`ブランチにマージして、リリースするタイミングで`develop`→`main`ブランチにマージします。

最近まで、リリースするときには`develop`→`main`へのPullRequestを手動作成する運用を行っていましたが機械的な作業なので[git-pr-release](https://github.com/x-motemen/git-pr-release)を使って自動化しました。

[git-pr-release](https://github.com/x-motemen/git-pr-release)の導入は[こちらのSongmu](https://songmu.jp/riji/entry/2019-07-28-circleci-git-pr-release.html)さんの記事が非常に参考になりました。

>余談にはなりますが、弊チームは[Songmu/flextime](https://github.com/Songmu/flextime)のヘビーユーザーであり、非常にお世話になっております。時刻操作系のGoのテストをする時はflextimeが欠かせません!

[git-pr-release](https://github.com/x-motemen/git-pr-release)の導入に合わせてGitHubの標準機能である[リリースノート自動生成](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)も導入しました。

以下のymlファイルをリポジトリの`.github`配下に格納するだけでリリースノートを自動生成することができます。

```yaml release.yml
# .github/release.yml

changelog:
  exclude:
    labels:
      - ignore-for-release
    authors:
      - octocat
  categories:
    - title: Breaking Changes 🛠
      labels:
        - Semver-Major
        - breaking-change
    - title: Exciting New Features 🎉
      labels:
        - Semver-Minor
        - enhancement
    - title: Other Changes
      labels:
        - "*"
```

release.ymlについて少し説明します。`-title`と`-label`タグが必須項目であり、`-title`にはリリースノートのセクションを、`-label`にはそのセクションに記載するPullRequestのラベルを記載します。

例えば、前回リリース時から今回のリリースまでに`main`にとりこまれた`enhancement`ラベルをもつPullRequestはすべてExciteing New Featuresのセクションに記載されるようになります。

release.ymlを作成したらリリース時にGenerate release noteを押下するだけでリリースノートが自動生成されます。

<img src="/images/20230307a/image.png" alt="image.png" width="1200" height="934" loading="lazy">


>GitHub標準機能を用いずにtagのPUSHをトリガーにCircleCIで自動化する場合は[当技術ブログの過去記事](https://future-architect.github.io/articles/20210708a/)が参考になると思います。

今回、「CircleCIでPullRequest作成時の負荷を軽減したい」と思った経緯ですが、このリリースノートの自動生成が背景にあります。

既に記載したように自動生成したChangeLogはPullRequestのラベルに依存しているため、きちんと運用をまわすには、メンバー全員にラベルの付与を徹底させる必要があります。

この「きちんとラベルを付与する」というのは簡単な作業に思えますが案外忘れてしまいがちです。せっかくリリースノートの自動生成まで行ったのですから、ラベルの付与も自動化してしまいたいと思い、CircleCIベースでラベルの付与を自動化しました。

# ラベルの振り分け方
さて、ラベルの振り分け方ですがいくつか方法が考えられます。例えば特定のディレクトリの変更に依存してラベルを付与する方法です。

これを実現するには[actions/labeler](https://github.com/actions/labeler)を利用するのが最も導入コストが低いと思います。

他にはブランチ名に依存してラベルを振り分ける方法なども考えられます。今回私が採用したのはブランチ名に依存してラベルの振り分けを行う方法です。

ブランチ名ベースでラベルを振り分ける方法を採用したのは、弊チームのリポジトリが複数サービスが含まれたモノリポ構成であることが大きな理由です。

一部機能は同じ階層のファイルを共有していたりするため、果たして改修部分がservice Aの改修なのか、service Bの改修なのかはコードを見ないと判断できません。ブランチ名ベースでラベルの振り分けを行えば正確にラベルを付与することができます。

そこで、「[actions/labeler](https://github.com/actions/labeler)にそんな機能搭載されていないかな?」と思い、確認しましたが2020年に[Issue#54](https://github.com/actions/labeler/issues/54)が起票されてから2023年現在もOpenのままで、簡単に導入とはいかないようです。

加えて、諸事情がありGitHub ActionsではなくCircleCI上に導入したかったので、[actions/labeler](https://github.com/actions/labeler)の導入は見送りました。

# GitHub CLIの利用
どうやら、自前でGitHubAPIを操作する必要が出てきそうでしたので、まずはGitHub CLIでラベルの付与操作などがサポートされていないかを調査したところ、それらしい機能がサポートされていることがわかりました。

[GitHub CLI gh pr edit](https://cli.github.com/manual/gh_pr_edit)

GitHub CLIをインストールして、以下コマンドを実行することでPullRequestを操作することができます。

```shell
gh pr edit [<number> | <url> | <branch>] [flags]
```

`[<number> | <url> | <branch>]`を空のまま実行した場合、現在チェックアウトしているブランチに対して実行されます。

`flags`には以下オプションがサポートされています。

```sh
--add-assignee <login>
Add assigned users by their login. Use "@me" to assign yourself.
--add-label <name>
Add labels by name
--add-project <name>
Add the pull request to projects by name
--add-reviewer <login>
Add reviewers by their login.
-B, --base <branch>
Change the base branch for this pull request
-b, --body <string>
Set the new body.
-F, --body-file <file>
Read body text from file (use "-" to read from standard input)
-m, --milestone <name>
Edit the milestone the pull request belongs to by name
--remove-assignee <login>
Remove assigned users by their login. Use "@me" to unassign yourself.
--remove-label <name>
Remove labels by name
--remove-project <name>
Remove the pull request from projects by name
--remove-reviewer <login>
Remove reviewers by their login.
-t, --title <string>
Set the new title.
```

今回利用するのは`--add-label`です。

# CircleCIの設定

GitHub CLIでなんとかなりそうなことが判明しましたので、あとはCircleCIでの実行環境です。

利用者の多そうなツールなのでOrbsで環境が提供されていないかなと思い探してみたところ、最適な環境を見つけました。[circleci/github-cli](https://circleci.com/developer/ja/orbs/orb/circleci/github-cli)

あとは、このOrbsを利用してGitHub CLIコマンドを実行するだけです。

以下、設定ファイルです。

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

Orbsとは
OrbsはCircleCI 2.1で追加された機能で、CircleCIの設定を再利用可能なパッケージとして提供したものです。
Slack連携などは利用している方も多いのではないでしょうか。[Slack連携のOrbs](https://circleci.com/docs/ja/slack-orb-tutorial/)

</div>

```yaml config.yml
# .cicleci/config.yml

version: 2.1

orbs:
  gh: circleci/github-cli@2.2.0

executors:
  base:
    docker:
      - image: "cimg/base:stable"

jobs:
  add-label:
    executor: base
    working_directory: ~/repo
    steps:
      - gh/setup:
          version: 2.23.0
      - checkout
      - run:
          name: Add-Label
          command: |
            bash add_label.sh
workflows:
  version: 2
  add-label:
    jobs:
      - add-label
```

`-gh/setup`でGitHub CLIの初期設定を行います。この際のCicleCIの環境変数に`GITHUB_TOKEN`の設定が必要です。

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

GITHUB_TOKENの権限
GITHUB＿TOKENの権限はPullRequestに対して操作を行うためrepoの権限が必要です。[GITHUB_TOKENのアクセス許可](https://docs.github.com/ja/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)

</div>

GitHub CLIのセットアップ完了後ブランチにチェックアウトします。
その後GitHub CLIのコマンドを記載したShellスクリプトを実行しています。

以下、実行対象のShellスクリプトです。

```sh add_label.sh
#!/bin/bash
set -euxo pipefail
prinfo=$(gh pr view --json author,headRefName --jq .author.login,.headRefName)
assignees=$(gh pr view --json assignees --jq .assignees[].login)
labels=$(gh pr view --json labels --jq .labels[].name)

# 取得した情報を配列に変換して変数に格納
mapfile -t infoarray <<< "$prinfo"
author="${infoarray[0]}"
branch="${infoarray[1]}"

# PR作成者を自動アサイン
if [[ $assignees == "" ]]; then
    echo "assigne" "$author"
    gh pr edit --add-assignee "$author"
fi

set "${labels}"
attachlabels=("bug" "docs" "refactoring" "enhancement" "fix")
# ブランチ名にそってラベル付与
for name in "${attachlabels[@]}"
do
if [[ $branch == *$name* ]]; then
    if printf '%s\n' "${labels[@]}" | grep -qx "$name"; then
        echo "$name" "label is already attached"
    else
        echo "attach" "$name" "label"
        gh pr edit --add-label "$name"
    fi
fi
done

exit 0
```

GitHub CLIを利用することで複雑なスクリプトを書かずにすみました。

ラベルの自動付与のついでにAssigneesにPullRequest作成者の付与も自動化しています。

ブランチ名やPullRequest作成者の情報は[gh pr view](https://cli.github.com/manual/gh_pr_view)コマンドで取得します。とても便利なことに`--jq`オプションでフィルタリングできます。

```sh
-c, --comments
View pull request comments
-q, --jq <expression>
Filter JSON output using a jq expression
--json <fields>
Output JSON with the specified fields
-t, --template <string>
Format JSON output using a Go template; see "gh help formatting"
-w, --web
Open a pull request in the browser
```

試しに、`gh pr view --json author`を実行してみると、以下のレスポンスを取得できます。

```json
❯❯❯ gh pr view --json author
{
  "author": {
    "id": "XXXXXXXXXX",
    "is_bot": false,
    "login": "XXXXX",
    "name": "XXXXX"
  }
}
```

これを`jq`をつかってフィルタリングして`author`変数に代入するには以下のようにします。

```sh
author=$(gh pr view --json author --jq .author.login)
```

`--json`オプションはカンマ区切りで複数指定ができますので以下のようにして一回のリクエストにまとめることができます。

```sh
prinfo=$(gh pr view --json author,headRefName --jq .author.login,.headRefName)
```

あとは事前に設定してあるラベル名にブランチ名が合致しているかを確認して文字列一致していればPullRequestにラベルを付与していきます。

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

Shellスクリプト初心者のため、[こちらの記事](https://qiita.com/Hayao0819/items/0e04b39b0804a0d16020)を参考にさせていただきました。

</div>

```sh
set "${labels}"
attachlabels=("bug" "docs" "refactoring" "enhancement" "fix")
# ブランチ名にそってラベル付与
for name in "${attachlabels[@]}"
do
if [[ $branch == *$name* ]]; then
    if printf '%s\n' "${labels[@]}" | grep -qx "$name"; then
        echo "$name" "label is already attached"
    else
        echo "attach" "$name" "label"
        gh pr edit --add-label "$name"
    fi
fi
done
```
# 動作確認

<div class="note info" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-check-circle"></span>

CircleCIのOnly build pull requests
今回CircleCIの発火はPullRequestが作成されている状態を想定しています。そのためリリースフローに支障がない場合は[こちら](https://circleci.com/docs/oss/#only-build-pull-requests)に記載のOnly build pull requestの設定をONにすることをおすすめします

</div>

▼成功すると以下のようにPR作成時にブランチ名にしたがってラベルの付与とPR作成者の自動アサインができます

<img src="/images/20230307a/image_2.png" alt="image.png" width="1200" height="569" loading="lazy">


<div class="note warn" style="background: #e5f8e2; padding:16px; margin:24px 12px; border-radius:8px;">
  <span class="fa fa-fw fa-exclamation-circle"></span>

GitHubアカウントのユーザー名
add_label.shでは、author.nameがスペースで区切られていないことを想定しています。
アカウント名にスペースが含まれる場合は、author.nameを別にリクエストして変数に格納するなどしてください。

</div>

# 少しハマったところ
[circleci/github-cli](https://circleci.com/developer/orbs/orb/circleci/github-cli)の`- gh/setup`は何も指定しないとGitHub CLIのデフォルトバージョンは2.3.0です。
記事執筆時の2023年2月18日にローカルにインストールされていたGitHub CLIは2.23.0でした。

```shell
❯❯❯ gh --version
gh version 2.23.0 (2023-02-08)
https://github.com/cli/cli/releases/tag/v2.23.0
```

どうやらバージョン2.3.0では`gh pr view --json author`のレスポンスに`name`という属性はなかったようで、ローカルのバージョンとの差分に気づかずにPullRequest作成者の情報の取得ができずに悩んでいました。(スクリプトではnameではなく、loginで取得しています)
バージョン情報を事前に確認しておくことは大事ですね。
`- gh/setup`には`version`を指定することができるので、最新のバージョンを確認しつつ指定してください。

```yaml
- gh/setup:
    version: 2.23.0
```

# おわりに
今回、諸事情がありGitHubActionsではなくCircleCIで実装しましたが、GitHubActionsであればGitHub CLIはプリインストールされているので本記事よりも簡単に導入できます。

* [ワークフローで GitHub CLI を使用する](https://docs.github.com/ja/actions/using-workflows/using-github-cli-in-workflows)

まだ自動化の運用を初めて日が浅く、今後運用を続けていく中で改善点などでてくるかと思いますが、現状では満足しています。

開発体験の向上は生産性の向上に直結すると思っていますので、今後も機械的な作業は積極的に自動化していきたいです。
