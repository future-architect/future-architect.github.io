---
title: Terraformで楽をしたい
date: 2020/08/05 00:00:00
postid: ""
tag:
  - Terraform
  - GoogleCloud
  - Ansible
  - IaC
category:
  - DevOps
thumbnail: /images/2020/20200805/thumbnail.JPG
author: 伊藤太斉
lede: "TIG/DX所属のインフラエンジニア兼カメラマンの[伊藤太斉]です。今回のアイキャッチは私が昨年撮ったひまわり畑にしました。Infrastructure as Codeでキャッチアップやインフラのリリースができることに越したことはありません。この記事では、Terraformの数多くの機能を使って他のIaCツールと可能な限り代用したり、Terraformの世界でリソース作成を完結させるために使い方を改めて突き詰めた内容になります"
---

<img src="/images/2020/20200805/ひまわり.jpg" alt="">

本記事は[夏休み自由研究記事](/tags/%E5%A4%8F%E4%BC%91%E3%81%BF%E8%87%AA%E7%94%B1%E7%A0%94%E7%A9%B6/)の第3弾です。

こんにちは。TIG/DX所属のインフラエンジニア兼カメラマンの[伊藤太斉](https://twitter.com/kaedemalu)です。今回のアイキャッチは私が昨年撮ったひまわり畑にしました。

## ツールをまとめたい

Infrastructure as Code(IaC)という考え方に属するツールはたくさんあります。例えばサーバーのミドルウェアを設定するためにAnsible、インスタンスのゴールデンイメージを作っておくならPacker、コンテナオーケストレーションならKubernetesと言った感じで、どんどん追えないくらいに増えています。我々エンジニアとしては、新しいツールを使うことが楽しくてしょうがない人も多いかと思います。かくいう私もその一人です。しかし、新しくインフラを始める人にとってもツールの多い時代ですし、少ない学習コスト(人によっては負担)でキャッチアップやインフラのリリースができることに越したことはありません。

この記事では、Terraformの数多くの機能を使って他のIaCツールと可能な限り代用したり、Terraformの世界でリソース作成を完結させるために使い方を改めて突き詰めた内容になります。私の記事なので、使うクラウドは例にもれずGCPを利用します。

## PackerじゃなくてTerraform

Packerは、Linuxなど各種OSなどに必要なパッケージをインストールしたあと、インスタンス自体は削除され、ゴールデンイメージを残します。このイメージをベースとして、設定済みのインスタンスを展開できます。ミドルウェアの設定という意味ではAnsibleと似ていますが、Ansibleは設定したインスタンスはそのまま生きています。

### `remote-exec`を利用する

TerraformにはProvisionerというものがありますが、`remote-exec`はそのうちの1つです。`remote`なので、実行場所は構築しているインスタンスになります。ディレクトリ構成は以下を考えます。

```sh
hoge-project
 |- compute_instance.tf
 |- sshkey
     |- id_rsa
     |- id_rsa.pub
```

インスタンスをコードしている`compute_instance.tf`、あとは埋める鍵を置いています。`compute_instance.tf`の中身は以下になります。

```tf compute_instance.tf
resource "google_compute_instance" "instance" {
  name         = "sample-instance"
  machine_type = "n1-standard-1"
  zone         = "asia-northeast1-a"
  tags         = []

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-9"
    }
  }

  network_interface {
    network = "default"
  }

  provisioner "remote-exec" {
    connection = {
      type        = "ssh"
      user        = "provisoner"
      private_key = file("./sshkey/id_rsa.pub")
    }

    inline = [
      "sudo apt-get install nginx",
    ]
  }
}
```

ここではインスタンスを立てて、nginxを入れるところまでをゴールとするコードにしました。通常であれば、Terraformでインスタンスを立てて、その後、gcloudコマンドなりで作成したインスタンスにsshしてミドルウェアをインストールするはずですが、それを`remote-exec`で置き換えています。

### メリット・デメリット

- メリット
  - PackerでbuildしてからイメージをTerraformで再度指定しなくても良い
  - Terraformのコマンド、世界で完結する
- デメリット
  - ゴールデンイメージを利用するインスタンスが多い場合はコードが汚くなる

Packerを代用しようとする場合は、踏み台や、特定のサーバー種に向けてであれば効果的かと思いますが、利用するインスタンスが多くなった場合にはわずかながらコードが読みにくくなる可能性もあるので、そのときはPackerの導入を考えないといけないのかもしれません。

## Ansibleコマンドを実行したくない

インフラの管理方法として、Terraform + Ansibleは王道すぎるくらい王道なやり方だと思っていますし、コード管理している方はだいたいその2つをメインとして利用しているのではないでしょうか？ なので、手順としては

- Terraformでリソースを作成
- Ansibleでミドルウェアの設定を行う

で行うと思います。なので、各々コマンドを実行しますが、個人的には2回コマンドを実行したくない、できれば1発で出来上がって欲しいという気持ちがずっとありました。その気持ち、ここで昇華させます。

### `local-exec`を利用する

先ほどはProvisionerで`remote-exec`を利用しましたが、今回は`local-exec`を使います。実行場所が`local`、つまりTerraformの実行端末上で行うコマンドです。Ansibleは実行するときは各インスタンス上ではなく、ローカルや踏み台サーバーから実行するかと思いますので、`local-exec`を今回は使います（構築したサーバー上でlocalhostでAnsibleは実行できますがお掃除も大変ですね…）。。
今回はケースとして、以下をディレクトリ構成で考えます。

```sh
hoge-project
 |- compute_instance.tf
 |- ansible
     |- ansible.cfg
     |- inventory
     |- nginx.yaml
     |- sshkey
         |- id_rsa
         |- id_rsa.pub
     |- roles
         |- nginx
             |- tasks
                 |- main.yaml
```

このディレクトリ構成もおそらくTerraform + Ansibleの組み合わせの時にはオーソドックスではないでしょうか？ ここで、`compute_instance.tf`は

```tf compute_instance.tf
resource "google_compute_instance" "instance" {
  name         = "sample-instance"
  machine_type = "n1-standard-1"
  zone         = "asia-northeast1-a"
  tags         = []

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-9"
    }
  }

  network_interface {
    network = "default"
  }

  metadata = {
    ssh-keys = "ansible:${file("./ansible/sshkey/id_rsa.pub")}"
  }

  service_account {
    scopes = ["cloud-platform"]
  }

  provisioner "local-exec" {
    working_dir = "./ansible/"
    command     = "ansible-playbook -i inventory nginx.yaml"
  }
}
```

と書きました。`metadata`でインスタンスに埋め込む公開鍵を設定しています。そして最終段にある

```tf
  provisioner "local-exec" {
    working_dir = "./ansible/"
    command     = "ansible-playbook -i inventory nginx.yaml"
  }
```

が今回のミソの部分です。ローカルで動かすディレクトリの指定と、そのディレクトリで実行するコマンドを書いています。コマンド自体は人が実行するものと基本的に同じにすればあとはAnsibleの世界なので、taskが終わるのを待ちましょう。

### メリット・デメリット

今回、Ansibleの実行をTerraformにもたせましたが、こちらもメリット、デメリットどちらもあるかと思います。

- メリット
  - コマンド実行回数が減る（手順が減る）
  - Ansibleが異常終了した場合は`taint`フラグが付くので、コードに書かれていることはしっかり実行される
- デメリット
  - Ansibleの世界とTerraformの世界の境界がなくなるのでそれぞれの責任を分けにくくなる

メリットは実行回数が減ることはもちろんですが、`taint`フラグをつけてくれることが嬉しいところではないでしょうか？`taint`フラグは、「Terraformのリソースとしては作成が済んでいるが、リソースが指定通りにできなかった」時につくので、Ansibleの世界で失敗してもTerraformの失敗になります。
一方デメリット自体は、私自身は大きくないと思いますが、それぞれにもたせる役割、責任をはっきり分けておきたい場合にはデメリットかなと思います（見た目の問題ではありますが）。

## まとめ

本記事では出来るだけTerraformでまかなってみましたが、とはいえ私自身AnsibleやPackerなどももちろん使います。また、使い方もチームそれぞれなのでこのやり方が100％フィットするとことはないと思っています。ただ、Terraformの世界を広げることで、管理コストや実装コストが下がることがわかりました。IaCの背景は手順書を極力減らしたり、インフラにもCI/CDを取り入れる余地をもたせることだと思うので、こういった取り組みは必要かなと思います。ここでいう、「楽をしたい」はどちらかというと人為的なミスを減らす、というところに落ち着きます。

これからさらに夏休み記事は出てきますので、今後の記事もぜひ読んでください！
