---
title: "Notary v2（Notation）によるコンテナイメージ署名"
date: 2025/06/16 00:00:01
postid: b
tag:
  - CNCF
  - コンテナ
category:
  - Security
thumbnail: /images/2025/20250616b/thumbnail.png
author: 真野隼記
lede: "CNCFのIncubatingプロジェクトである、Notary v2を用いて、コンテナイメージにデジタル署名してみた記事です。"
---
<img src="/images/2025/20250616b/notary-horizontal-color-1110x298.png" alt="notary-horizontal-color-1110x298.png" width="1110" height="298" loading="lazy">

[CNCF連載](/articles/20250616a/ )の1本目です。

# はじめに

TIG真野です。[KubeCon + CloudNativeCon](https://events.linuxfoundation.org/kubecon-cloudnativecon-japan/) の日本初開催、おめでとうございます！

CNCFのIncubatingプロジェクトである、Notary v2を用いて、コンテナイメージにデジタル署名してみた記事です。

CI/CDを狙ったサプライチェーン攻撃が増えている昨今、デプロイ対象のコンテナイメージが正しい手順で作成されたか検証することの重要性はますます高まっているように感じます。業界でよく行われているコンテナイメージの署名とその検証がどのように行われているか興味が合ったため、OCI（Open Container Initiative）準拠でデファクトに近い位置づけであったNotaryを触ってみした。

# Notary v2とは

[Notary](https://notaryproject.dev/)は、コンテナイメージにデジタル署名を行い、その真正性（誰が作ったか）と完全性（改ざんされていないか）を保証し、CLI実装が [Notation](https://github.com/notaryproject/notation) です。Notaryは現在v2です。特徴として署名データをイメージと同じレジストリ内に保存することがあり、これによりポータビリティが高いと言われます。v1時代はレジストリをまたいでイメージを移動させると、署名が失われるという課題があったそうで、再設計されたためv2になったそうです。

* 参考: [Community Collaboration on Notary v2 | Docker](https://www.docker.com/blog/community-collaboration-on-notary-v2/)

2024年7月に[コンテナイメージ署名用の AWS Signer オープンソース Notation プラグイン - AWS](https://aws.amazon.com/jp/about-aws/whats-new/2024/07/aws-signer-open-sources-notation-plugin-container-image-signing/) という発表があった通り、Notary v2 のCLI実装である Notation に、AWS Signerのプラグインが公開されたため、面倒な鍵管理をAWS側に任せることもできるようになりました。利用の機運が高まります。

ちなみに、類似のイメージ署名ツールとしては、[Sigstore](https://www.sigstore.dev/)（Cosign）も有名で、勢いがあるかもしれません。こちらはGitHubなどのOIDCアカウントで署名するという、キーレスが特徴とのこと。記事を書いている途中で気がついたのですが、こちらの方が面白そうなツールですね。

# Notaryの想定される使い所

Notary（実際に用いるのはCLI実装のNotation）の使い所ですが、以下のようなフローを想定しています。

* CI上でtrivyなどのイメージスキャンを行い、合格した場合にNotationで署名する
* CDのタイミングで、Notationで署名を検証して、成功ステータスの場合のみデプロイする
  * もし、検証が失敗した場合はデプロイを失敗させ、野良イメージ（or 悪意のあるイメージ）のデプロイを防ぐ

ある開発者がローカルPCでビルドしたイメージを、ECRなどのレジストリにプッシュしてしまうことは、適切なIAM権限設定で防ぐことができます。しかし、インフラ構築用の踏み台サーバ経由などでプッシュされる可能性もゼロではありません。また、CI/CDパイプライン上で設定ミスや予期しないスクリプトが実行され、ECRにイメージがプッシュされてしまう可能性も絶対発生しないとは言い切れません。

セキュリティ対策は多層的になされることが原則であるため、リスク評価にも続き優先度付けの上で、こういった対策を講ずるべき場合もあるでしょう。

より詳しくは、[ECS × AWS Signer を使ったイメージ署名ワークフローを試してみた](https://speakerdeck.com/ozawa/ecs-x-aws-signer-woshi-tutaimesishu-ming-wakuhurowoshi-sitemita) の記事が参考になりました。

# Notationのインストール

[Install the notation CLI](https://notaryproject.dev/docs/user-guides/installation/cli/) に従い、Notationをインストールします。

x86かつ、WSL2上の環境にて構築します。 notationはGo言語で開発されていますが、`go install` ではお手軽には無理そうだったため、バイナリを直接取得する流れにします。

```sh インストール
export NOTATION_VERSION=2.0.0-alpha.1

# ダウンロード
$ curl -LO https://github.com/notaryproject/notation/releases/download/v$NOTATION_VERSION/notation_$NOTATION_VERSION\_linux_amd64.tar.gz
$ curl -LO https://github.com/notaryproject/notation/releases/download/v$NOTATION_VERSION/notation_$NOTATION_VERSION\_checksums.txt

# チェックサムでOK表示を確認
$ grep linux_amd64 notation_2.0.0-alpha.1_checksums.txt > checksums.txt
$ shasum --check checksums.txt
notation_2.0.0-alpha.1_linux_amd64.tar.gz: OK

# インストール
$ sudo tar -xvzf notation_$NOTATION_VERSION\_linux_amd64.tar.gz -C /usr/local/bin notation
$ notation version
Notation - a tool to sign and verify artifacts.

Version:     2.0.0-alpha.1
Go version:  go1.24.1
Git commit:  6c5c35a0207eebf8d4d6d2efad66b798457a6622
```

# コンテナレジストリを起動

DockerHubにプッシュしてもよいですが、単なる技術検証で用いるのは迷惑だと思ったので、ローカルPC上にレジストリを起動させます。同じく、CNCFのSandboxプロジェクトの、 [Zot](https://zotregistry.dev/v2.1.4/) という軽量OCIレジストリを利用します。

[インストール手順](https://zotregistry.dev/v2.1.4/install-guides/install-guide-linux/)を見ると、がやや面倒だったのと、揮発的な利用でしか利用しないためDockerコマンドで立ち上げます。

```sh
docker run -d -p 5000:5000 --name zot ghcr.io/project-zot/zot-linux-amd64:v2.1.4
```

通常は、HTTPSでしかプッシュできないのですが、この Zotレジストリと通信するため、Docker Desktopの設定を修正します。

Docker DesktopのGUIから、歯車マーク > Docker Engine で、以下の設定を追加。

```diff
{
+ "insecure-registries": [ "localhost:5000" ],
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false
}
```

そのまま、DockerをApply & Restartで再起動します。

もし、zotが再起動していなければ、再度立ち上げて起きます。

```sh
docker start zot
```

# テストキーと自己署名証明書を生成する

署名するためのテスト RSA キーと、検証するための自己署名 X.509 証明書を、以下で生成します。あくまで動作確認用のコマンドとのこと。プロダクションで利用時は[こちらの手順](https://aws.amazon.com/jp/blogs/containers/announcing-container-image-signing-with-aws-signer-and-amazon-eks/)を参考にして、 AWS Signer などと連携させるか、少なくても、AWS KMSなどシークレットの管理サービスを利用すべきでしょう。

```sh
$ notation cert generate-test --default "suji-toshi-mashoya"
generating RSA Key with 2048 bits
generated certificate expiring on 2025-06-14T10:57:29Z
wrote key: /home/mano/.config/notation/localkeys/suji-toshi-mashoya.key
wrote certificate: /home/mano/.config/notation/localkeys/suji-toshi-mashoya.crt
Successfully added suji-toshi-mashoya.crt to named store suji-toshi-mashoya of type ca
suji-toshi-mashoya: added to the key list
suji-toshi-mashoya: mark as default signing ke
```

`notation key ls` や `notation cert ls` で署名キーや証明書を確認できます。

# イメージに署名

適当なイメージをpullし、ローカル上のZotレジストリにpushします。

```sh
$ docker pull busybox:1.37.0
$ docker tag busybox:1.37.0 localhost:5000/suji-tootteruyo:1.0
$ docker push localhost:5000/suji-tootteruyo:1.0
The push refers to repository [localhost:5000/suji-tootteruyo]
90b9666d4aed: Pushed
1.0: digest: sha256:7c0ffe5751238c8479f952f3fbc3b719d47bccac0e9bf0a21c77a27cba9ef12d size: 610

i Info → Not all multiplatform-content is present and only the available single-platform image was pushed
          sha256:f85340bf132ae937d2c2a763b8335c9bab35d6e8293f70f606b9c6178d84f42b -> sha256:7c0ffe5751238c8479f952f3fbc3b719d47bccac0e9bf0a21c77a27cba9ef12d
```

続いて、お待ちかねのnotationコマンドです。タグだと上手く見つけることができなかったため、ダイジェスト指定することが必要でした（最近だと、タグは書き換え可能であり、ダイジェストを使う方が良いという話もあるので、深入りはしていません）

```sh
    $ notation sign --insecure-registry "localhost:5000/suji-tootteruyo@sha256:7c0ffe5751238c8479f952f3fbc3b719d47bccac0e9bf0a21c77a27cba9ef12d"
Successfully signed localhost:5000/suji-tootteruyo@sha256:7c0ffe5751238c8479f952f3fbc3b719d47bccac0e9bf0a21c77a27cba9ef12d
Pushed the signature to localhost:5000/suji-tootteruyo@sha256:ef3915777084e9f5fb59fa2b2184d60f452bd374352e2afdb1c20aac637c3304```
```

以下で紐づきを確認できます。

```sh
$ notation ls localhost:5000/suji-tootteruyo@sha256:7c0ffe5751238c8479f952f3fbc3b719d47bccac0e9bf0a21c77a27cba9ef12d
localhost:5000/suji-tootteruyo@sha256:7c0ffe5751238c8479f952f3fbc3b719d47bccac0e9bf0a21c77a27cba9ef12d
└── application/vnd.cncf.notary.signature
    └── sha256:f42031db9c3000605abfefa753db67e7928c7a907bbf5160c994d4944919958a
```

# 署名の検証

信頼ポリシーという、どの署名を信頼するか定義したJSONを作成します。

```sh
$ cat <<EOF > ./trustpolicy.json
{
    "version": "1.0",
    "trustPolicies": [
        {
            "name": "suji",
            "registryScopes": [ "localhost:5000/suji-tootteruyo" ],
            "signatureVerification": {"level" : "strict"},
            "trustStores": [ "ca:suji-toshi-mashoya" ],
            "trustedIdentities": ["*"]
        }
    ]
}
EOF
```

JSONファイルをインポートします。

```sh
$ notation policy import ./trustpolicy.json
Successfully imported OCI trust policy configuration to /home/mano/.config/notation/trustpolicy.oci.json.
```

署名を検証します。

```sh
$ notation verify --insecure-registry "localhost:5000/suji-tootteruyo@sha256:7c0ffe5751238c8479f952f3fbc3b719d47bccac0e9bf0a21c77a27cba9ef12d"
Successfully verified signature for localhost:5000/suji-tootteruyo@sha256:7c0ffe5751238c8479f952f3fbc3b719d47bccac0e9bf0a21c77a27cba9ef12d```
```

無事、成功しました。

# 署名の検証が正しく失敗するか確かめる

信頼ポリシーに登録されていない、不正な鍵で署名されたイメージがプッシュされた場合に、 `notation verify` による署名検証が失敗することを確かめます。

まず不正なキーを生成します。

```sh
$ notation cert generate-test --default "fade-out"
$ notation key ls
NAME                 KEY PATH                                                       CERTIFICATE PATH                                               ID   PLUGIN NAME
suji-toshi-mashoya   /home/mano/.config/notation/localkeys/suji-toshi-mashoya.key   /home/mano/.config/notation/localkeys/suji-toshi-mashoya.crt
* fade-out           /home/mano/.config/notation/localkeys/fade-out.key             /home/mano/.config/notation/localkeys/fade-out.crt
```

前回のキーと、今回の攻撃用のキーの2種類存在します。 `fade-out` が攻撃用のキーです。

新しく別のイメージを準備します。前回利用した1.37.0 ではなく、1.36.0を利用します。

```sh
$ docker pull busybox:1.36.0
$ docker tag busybox:1.36.0 localhost:5000/suji-tooranaiyo:1.0
$ docker push localhost:5000/suji-tooranaiyo:1.0
The push refers to repository [localhost:5000/suji-tooranaiyo]
a58ecd4f0c86: Pushed
1.0: digest: sha256:086417a48026173aaadca4ce43a1e4b385e8e62cc738ba79fc6637049674cac0 size: 528

i Info → Not all multiplatform-content is present and only the available single-platform image was pushed
          sha256:9e2bbca079387d7965c3a9cee6d0c53f4f4e63ff7637877a83c4c05f2a666112 -> sha256:086417a48026173aaadca4ce43a1e4b385e8e62cc738ba79fc6637049674cac0
```

このイメージに対して、攻撃用のキーで署名します。

```sh
$ notation sign \
  --insecure-registry \
  --key fade-out \
  "localhost:5000/suji-tooranaiyo@sha256:086417a48026173aaadca4ce43a1e4b385e8e62cc738ba79fc6637049674cac0"
Successfully signed localhost:5000/suji-tooranaiyo@sha256:086417a48026173aaadca4ce43a1e4b385e8e62cc738ba79fc6637049674cac0
Pushed the signature to localhost:5000/suji-tooranaiyo@sha256:49fc8cc2e956660bb8c6ab9cd18618609eb106ae5503855e7b2b3de5138c7ec6
```

これで、信頼できない署名付きのイメージが作成されましたので、このイメージを検証します。

```sh
$ notation verify --insecure-registry localhost:5000/suji-tooranaiyo@sha256:49fc8cc2e956660bb8c6ab9cd18618609eb106ae5503855e7b2b3de5138c7ec6
Error: signature verification failed: artifact "localhost:5000/suji-tooranaiyo@sha256:49fc8cc2e956660bb8c6ab9cd18618609eb106ae5503855e7b2b3de5138c7ec6" has no applicable oci trust policy statement. Trust policy applicability for a given artifact is determined by registryScopes. To create a trust policy, see: https://notaryproject.dev/docs/quickstart/#create-a-trust-policy
```

想定通り、「署名の検証に失敗しました：アーティファクト localhost:5000/suji-tooranaiyo@sha256:... に適用可能な信頼ポリシーのルールが存在しません。」といったエラーがでて、検証が失敗しました。

# さいごに

Notary v2 のCLI実装である、Notationを使ってコンテナイメージを署名と、検証を行いました。

署名および検証はNotationのコマンドで容易に実行でき少し拍子抜けしました。難しいポイントは鍵の管理かと思いますが、それもNotationの AWS Signerプラグインなどを上手く活用することで、マネージドサービス側に寄せられると運用も楽になるのだろうと推測しています。

Notationの使い方というか、コンテナの指定がタグではなくダイジェストでないと認識しないといったあたりで時間がかかりました。CIなどで自動化しようとすると、シェルスクリプトなどで吸収するかといった手間が必要そうです。
