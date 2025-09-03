---
title: "CI/CD初心者のためのJenkins入門"
date: 2024/04/19 00:00:00
postid: a
tag:
  - 入門
  - Jenkins
  - CI/CD
category:
  - DevOps
thumbnail: /images/2024/20240419a/thumbnail.png
author: 中邨英里佳
lede: "業務の中で初めてJenkinsに触れたので、以下の内容についてまとめたいと思います。"
---

[春の入門連載2024](/articles/20240408a/)の10日目です。

# はじめに

こんにちは。今回初めてブログを書きます、流通サービスグループの中邨です。

最近、業務で初めてJenkinsに触れたので、以下についてまとめます。**「そもそもJenkinsとは？」「CI/CDって何？」** という人に読んでいただけたら嬉しいです。

- Jenkinsで何ができるのか／何が嬉しいのか
- Jenkinsを初めて触ってみた感想
- WSL2上のDockerでJenkinsを動かして簡単なジョブを作ってみる

# Jenkinsとは何か？

## Jenkinsで何ができるのか

JenkinsはCI/CDツールの1つで、アプリケーションのビルド、テスト、デプロイといったタスク実行を自動化できます。

CI/CDは continuous integration and continuous delivery/continuous deployment の略で、日本語では「継続的インテグレーション／継続的デリバリー（継続的デプロイ）」と訳されます。

## 何が嬉しいのか

あるコードに変更を加えると、別の部分と矛盾が生じてビルドできなくなるなどの影響を及ぼしてしまうことがあります。

ビルドやテストを自動化することで、コード変更をリポジトリに適用するごとにバグがないか検証し、アプリケーションを常に正常に動く状態に保つことができます（継続的インテグレーション）。

また、ワンクリックでアプリケーションをデプロイできたり（継続的デリバリー）、開発者が変更をプッシュするたびに実稼働環境に自動でデプロイできたりすると（継続的デプロイ）、デプロイを迅速かつ頻繁に行って品質を高めることができるようになります。

# Jenkinsを初めて触ってみた感想

私の主観になりますが、CI/CD初心者が初めてJenkinsを使ってみた感想です。

## 心理的ハードルが高い

CI/CDツールをほぼ触ったことがない状態で、既に沢山のジョブが動いているプロジェクト環境のJenkinsで試しにジョブを作ろうとしたとき、個人的には少しハードルが高く感じました。

例えば、自PC上の壊してもいい環境でJenkinsを動かしたことがあれば、ハードルが下がってより身近に感じられるのではないでしょうか。

この記事の後半では、Jenkinsを身近に感じるため、実際にWSL2上のDockerでJenkinsを動かして簡単なジョブを作成してみます。

## デバッグがつらい

アプリケーションのコードを書くのとは違い、Jenkinsの動作確認にはデバッグツールがありません。もっといいやり方があるのではないか・・・？ と思いながらも、次のサイクルを繰り返してジョブを作成しました。

1. ジョブの設定を変更
2. ジョブを実行
3. 想定した結果になっているか確かめる
4. 想定と違ったらコンソールログを読み、エラーの原因を突き止める
5. ジョブの設定を変更
6. ・・・（以下1からループ）

また今回は踏み込めなかったのですが、Jenkinsfileと呼ばれるファイルにGroovyでジョブを定義することで、ジョブをコード化することもできるようです。コード化されていればバージョン管理や移植も容易になって良いなと思いました（Infrastructure as a Codeですね）

## その他のCI/CDツールとの違い

Jenkinsはその前身を含めると約20年ほど前に誕生した歴史の長いツールですが、他にも様々なCI/CDツールがあり、ツールによってどこが違うのか気になってきました。

ざっくり調べると、専用のサーバを立てて実行する必要があるJenkinsに対して、GitHubリポジトリがあればGitHub上で利用できるGitHub Actionsや、AWS上でCI/CDを完結できるCodeBuildやCodeDeployなどがあり、導入コストや管理のしやすさを比較して選定することが多いようです。

# WSL2上のDockerでJenkinsを動かして簡単なジョブを作ってみる

以下で行うのは実際のビルドやテストよりずいぶん単純な内容ですが、入門記事なので「Jenkinsでこんなことができる」というイメージの一助になればいいなと思っています。

## WSL2とDockerの環境構築

本記事の主題ではないため、解説は別の記事に譲ります。
以下の手順は、環境があることを前提としています。

## Dockerイメージの取得とコンテナ起動

[Docker Hub](https://hub.docker.com/r/jenkins/jenkins)からJenkinsのDockerイメージを取得します。

Dockerリポジトリから任意のバージョンのイメージを指定してpullします。
※2024年4月19日時点の最新は `2.440.3-lts-jdk17` なのでこちらを使用します。

```sh
docker pull jenkins/jenkins:2.440.3-lts-jdk17
```

とりあえず起動できれば良いので、ポート番号だけ指定してコンテナを起動します。設定を保存したい場合はボリュームを指定してください。

※その他のオプションは[公式ドキュメントのDocker用説明](https://www.jenkins.io/doc/book/installing/docker/)にサンプルがあります。

```sh
docker run -p 8080:8080 jenkins/jenkins:2.440.3-lts-jdk17
```

[公式ドキュメントのセットアップウィザード](https://www.jenkins.io/doc/book/installing/docker/#setup-wizard)の手順に沿ってセットアップします。

※プラグインは推奨を選択、admin以外の管理者ユーザーとJenkins URLはとりあえず作成せずスキップで大丈夫です。

## コンソールにHello

シェルスクリプトを実行してコンソールに出力してみます。

1. 新規ジョブ作成をクリックします。
  <img src="/images/2024/20240419a/image.png" alt="" width="1200" height="591" loading="lazy">
2. 適当なジョブ名を入力し、「フリースタイル・プロジェクトのビルド」を選択して「OK」
  <img src="/images/2024/20240419a/image_2.png" alt="" width="1200" height="609" loading="lazy">
3. 適当な説明を入力して下にスクロールします。
  <img src="/images/2024/20240419a/image_3.png" alt="" width="1200" height="612" loading="lazy">
4. 「Build Steps」＞「ビルド手順の追加」から「シェルの実行」を選択します。
  <img src="/images/2024/20240419a/image_4.png" alt="" width="1200" height="608" loading="lazy">
5. シェルスクリプトに以下を記述して保存します。

   ```sh
   #!/bin/bash
   echo "Hello"
   ```

  <img src="/images/2024/20240419a/image_5.png" alt="" width="1200" height="615" loading="lazy">
6. ビルド実行をクリックします。
  <img src="/images/2024/20240419a/image_6.png" alt="" width="1200" height="585" loading="lazy">
7. 左下にビルド履歴が表示されているので、コンソール出力を見てみます。
  <img src="/images/2024/20240419a/image_7.png" alt="" width="1101" height="672" loading="lazy">
8. 「Hello」と出力されていて、シェルスクリプトが実行されていることがわかります。
  <img src="/images/2024/20240419a/image_8.png" alt="" width="1200" height="520" loading="lazy">

## ジョブをつなげて実行する

test-job-A、test-job-B を作成し、A、Bの順番に実行してみます。

1. 最初の例と同様に、フリースタイル・プロジェクトで空のジョブ test-job-A、test-job-B を作成します。
2. 「test-job-A」の「Build Steps」＞「ビルド後の処理の追加」から「他のプロジェクトのビルド」を選択します。
  <img src="/images/2024/20240419a/image_9.png" alt="" width="1200" height="524" loading="lazy">
3. 対象プロジェクトに「test-job-B」を入力して保存します。
  <img src="/images/2024/20240419a/image_10.png" alt="" width="1200" height="527" loading="lazy">
4. 「test-job-A」を実行すると、下流プロジェクトの「test-job-B」も実行されていることがわかります。
  <img src="/images/2024/20240419a/image_11.png" alt="" width="1200" height="387" loading="lazy">

## Gitリポジトリをチェックアウトする

1. GitHubにとりあえず空のpublicリポジトリを作成します。
  <img src="/images/2024/20240419a/image_12.png" alt="" width="1200" height="598" loading="lazy">
2. 「test-job-git」ジョブの「ソースコード管理」で「Git」を選択し、リポジトリURLとブランチ名を入力します。
  ※チェックアウトするだけなので認証情報は特に入力していません。
  <img src="/images/2024/20240419a/image_13.png" alt="" width="1081" height="838" loading="lazy">
3. ジョブを実行してコンソール出力を見ると、（ビルドするものは何もありませんが）正常終了しています。
  <img src="/images/2024/20240419a/image_14.png" alt="" width="1102" height="675" loading="lazy">
4. ワークスペースの中を見ると、リポジトリの内容（READMEファイル）が取得されています。
  <img src="/images/2024/20240419a/image_15.png" alt="" width="1200" height="513" loading="lazy">

# さいごに

CI/CDはシステム開発を縁の下で支える存在ですが、ITの入り口からはなかなか見えにくい・機会がないと触りにくい部分なのではないか、と常々思っていました。

この記事を通して、JenkinsやCI/CDを少し身近に感じていただけたら嬉しいです。

（参考）

- https://www.jenkins.io/doc/
- https://ja.wikipedia.org/wiki/Jenkins
- https://ja.wikipedia.org/wiki/継続的デリバリー
