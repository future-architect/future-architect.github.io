---
title: "自宅だと apt update ができなかった話（WSL2 + 社内VPN環境での名前解決の遅延）"
date: 2026/04/21 00:00:01
postid: b
tag:
  - WSL2
  - VPN
  - Ubuntu
  - 環境構築
  - トラブルシュート
category:
  - Infrastructure
thumbnail: /images/2026/20260421b/thumbnail.png
author: 清水雄一郎
lede: "新年度・新チーム配属のこの季節、「開発環境のセットアップで丸一日溶かした」という経験をされている方も多いのではないでしょうか。特にエンタープライズ企業の「プロキシ・VPN配下」での開発環境構築は、ドキュメント通りに進めても謎のエラーに阻まれがちです。"
---

<img src="/images/2026/20260421b/top.avif" alt="" width="1200" height="634" loading="lazy">

# 1. はじめに

こんにちは。HealthCare Innovation Group (HIG)の清水雄一郎です。
本記事は、[春の入門祭り2026](/articles/20260421a/)の1日目の記事です。

新年度・新チーム配属のこの季節、「開発環境のセットアップで丸一日溶かした」という経験をされている方も多いのではないでしょうか。特にエンタープライズ企業の「プロキシ・VPN配下」での開発環境構築は、ドキュメント通りに進めても謎のエラーに阻まれがちです。
プロキシに関しては、過去の記事[^5][^6][^7]もぜひご確認ください。

少し前（2026/01頃）に私が遭遇した事象は、WSL2環境で「自宅に帰ると`apt update`できない」というものです。
当時を振り返ると、次のような状況でした。

- オフィスに出社してネットワークに繋ぐと、`apt update` が成功する
- 自宅（無線/有線LAN&VPN接続中）だと、 `apt update` が**失敗する**
- ただし、**iPhoneのテザリング＋VPN** の場合、`apt update` が**成功する**

結論から言うと、今回のケースではDNSの順序を変えることで解決しました。
その頃のSlackスレッドやGeminiとのチャット履歴を遡りつつ、体験記兼トラブルシューティングログとして残します。

# 2. 調査編: 泥沼のトラブルシューティング

## 2.0. 前提

本記事は、次の環境下で確認したものです。
※Windows側のバージョンは、事象発生時から少し変わっているかもしれません。

<details><summary>環境情報</summary>

```text
# Windows
エディション Windows 11 Pro
バージョン 24H2
OS ビルド 26100.8037

# WSL2（Ubuntu）
PRETTY_NAME="Ubuntu 22.04.5 LTS"
NAME="Ubuntu"
VERSION_ID="22.04"
VERSION="22.04.5 LTS (Jammy Jellyfish)"
VERSION_CODENAME=jammy
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=jammy
```

</details>

## 2.1. エラーログ

まずは事象を整理するため、発生していたエラーログを確認します。

```bash
$ sudo apt update
...
エラー:5 http://archive.ubuntu.com/ubuntu jammy-updates InRelease
  サーバからの読み込みに失敗しました - read (104: 接続が相手からリセットされました) [IP: 10.x.x.x 8080]
エラー:6 http://archive.ubuntu.com/ubuntu jammy-backports InRelease
  10.x.x.x:8080 (10.x.x.x) へ接続できませんでした。接続がタイムアウトしました [IP: 10.x.x.x 8080]
エラー:3 http://security.ubuntu.com/ubuntu jammy-security InRelease
  サーバからの読み込みに失敗しました - read (104: 接続が相手からリセットされました) [IP: 10.x.x.x 8080]
...
W: いくつかのインデックスファイルのダウンロードに失敗しました。 これらは無視されるか、古いものが代わりに使われます。
```

`10.x.x.x:8080`は、社内プロキシサーバーです。
「タイムアウト」と「接続が相手からリセットされました」が混在しており、この時点では原因が全く特定できていません。

試しに同じ社内プロキシを経由している `wget` / `curl` コマンドを試しましたが、成功することを確認できました。

```bash
$ wget google.com
# → 200 OK で正常に取得できる

$ curl -I -L google.com
# → 200 OK
```

※いま振り返ると、<http://archive.ubuntu.com/ubuntu>宛に`wget` / `curl` コマンドを試した方が良かったかもしれません。

ここで一人では抱え込めないと判断し、Slackでチームメンバーに助けを求め、Geminiにも相談しながら仮説検証を始めました。
他の人に相談することは、私の環境だけの問題かどうか切り分けるという一つの検証と言えると思います。

<img src="/images/2026/20260421b/Slackでチームに相談している様子.png" alt="Slackでチームに相談している様子" width="593" height="134" loading="lazy">

## 2.2. 仮説① プロキシ設定が間違っている？

最初に疑ったのは、やはりプロキシ周りです。`apt`は`wget`/`curl`とは別経路の設定を見るため、`apt`自体のプロキシ設定を確認します。

```bash
cat /etc/apt/apt.conf
Acquire::http::Proxy  "http://username:password@proxy.example.com:8080";
Acquire::https::Proxy "http://username:password@proxy.example.com:8080";
```

設定済みでした。環境変数も`apt`と同じ設定値が入っています。

```bash
env | grep -i proxy
...
http_proxy=http://username:password@proxy.example.com:8080
https_proxy=http://username:password@proxy.example.com:8080
...
```

`apt`のプロキシ設定は、問題なさそうです。
またこの時、環境変数を引き継ぐため、`sudo -E apt update`を実行してみましたが、最初と同様のエラーになりました。

## 2.3. 仮説②～⑤ プロキシ設定以外はどう？

プロキシ設定以外に考えられる原因をGeminiやメンバーに聞いて片っ端から試しました。結論から言うと、いずれも空振りでした。

### 仮説② 社内プロキシの証明書が未インストール？

証明書周りはプロキシの次にトラブルが多い印象なので、試しに手動で入れ替えて確認します。
→ 変化なし

```bash
# 非推奨。次のコードブロックの手順を推奨。
sudo rm /etc/ssl/certs/ca-certificates.crt
sudo cp path/to/ca.crt /etc/ssl/certs/ca-certificates.crt
sudo apt update  # 変化なし
```

原因特定のために`/etc/ssl/certs/`配下の証明書を直接操作しましたが、本来は`update-ca-certificates`を使う方が正しいです。
推奨される方法は、次の通りです。

```bash
sudo cp path/to/ca.crt /usr/local/share/ca-certificates/corp-proxy.crt
sudo update-ca-certificates
sudo apt update
```

### 仮説③ WSLのHyper-Vファイアウォールが遮断している？

「デフォルトでオンになっているHyper-V FirewallをOFFにすると`apt`が通ることがある」という情報を教えてもらい、「WSL Settings」のGUIから無効化してみました。
→ 変化なし

<img src="/images/2026/20260421b/WSL_Settings_で_Hyper-V_Firewall_を無効化した画面.png" alt="WSL_Settings_で_Hyper-V_Firewall_を無効化した画面" width="1200" height="645" loading="lazy">

### 仮説④ MTUの設定が経路と合っていない？

Geminiにエラーログを渡して相談すると、MTU（Maximum Transmission Unit）[^1]の影響を疑うよう提案を受けました。VPN環境下では実効MTUが小さくなり、デフォルト1500バイトのままだと通信に失敗するケースがあるとのこと。
→ こちらも変化なし

```bash
sudo ip link set dev eth0 mtu 1300
sudo apt update  # 変化なし
```

後から振り返ると、MTU調整は「大きいパケットだけ落ちる」症状に有効な対策で、数十KBのリクエストで失敗する今回の症状とは整合しません。生成AIの提案を鵜呑みにして試した回り道でした。

### 仮説⑤ `archive.ubuntu.com`が遠いから？

リポジトリを日本のミラーサーバーに変更してみます。
→ ログは割愛しますが、タイムアウトエラーになってしまいます。

```bash
sudo sed -i.bak -E 's!http://(archive|security)\.ubuntu\.com!http://jp.archive.ubuntu.com!g' /etc/apt/sources.list
sudo apt update  # タイムアウトエラー
```

## 2.4. 仮説⑥ 接続するネットワークの問題？

出社する日が多く、自宅でのみ発生する問題の解消を後回しにしていたのですが、オフィスにいる時に時間ができたので再度向き合ってみることにしました。
VPN接続時に発生するため、オフィスにいながらBYODであるiPhoneのテザリングに切り替えて、VPN接続してみます。
なんと、`apt update`が**正常終了する**ことに気が付きます。整理すると次の状況です。

- オフィス無線LAN → OK
- 自宅（無線/有線）LAN＋VPN → NG
- iPhoneテザリング＋VPN → OK 🤔

ひとまず成功したことに喜びつつ、ずっとテザリングで業務するわけにはいきません。
VPNがすべてダメというわけではないと分かったので、他の手立てを考えてみました。

# 3. 原因編: 名前解決を疑う

`wget`は通って`apt`は通らない、かつ、同じVPNを使っていても回線（自宅LAN/テザリング）によって成否が変わることが分かりました。
つまり原因は「どの回線でも共通に使われる設定」ではなく、**「回線ごとに切り替わる何か」** にあると考えました。

回線ごとに切り替わるものの一つに、ホストであるWindowsが参照するDNSがあります。
WSL2は、デフォルトでWindows側のDNSを継承するため、回線が変わればWSLが使うDNSも変わります。

ここから、**名前解決（DNS）の速度**を疑うことにしました。
※名前解決とは、ドメイン名（例: `archive.ubuntu.com`）をIPアドレスに変換する処理のことです。

`apt update`は、内部で複数のリポジトリに問い合わせているため、1問い合わせあたりの名前解決が遅いとそれが積み重なり、接続タイムアウトに抵触しやすいのではないかと考えました（最初に試した`wget` / `curl` は単発リクエストなので、1回の遅延くらいは待てる、という仮説）。

実際に、名前解決の時間を計測してみます。`getent hosts`は、指定したホストの情報を取得するコマンドです。

```bash
time getent hosts proxy.example.com
10.x.x.x    proxy.example.com

real    0m15.225s
user    0m0.001s
sys     0m0.004s
```

それが**たった1件の社内ホスト情報取得に15秒**かかっていました。

ちなみに、その時の`/etc/resolv.conf`の中身はこうでした。

```bash
cat /etc/resolv.conf
nameserver 172.x.x.x    # Windowsホスト側の仮想ルーター
nameserver 10.x.x.x     # 開発環境構築時に追記したもの
search example.com      # 開発環境構築時に追記したもの
```

`172.x.x.x`は、WSL2がデフォルトで参照するWindowsホスト側の仮想ルーターです。
Windows側の設定を引き継いで名前解決してくれる便利な仕組みですが、私の環境かつVPN接続状態ではボトルネックになっていると考えました。

# 4. 解決編: `/etc/resolv.conf`への記載順序を変える

原因が掴めれば対処は単純です。WSLのデフォルト仮想DNS（172.x.x.x）より先に、社内DNSに直接問い合わせるよう、`/etc/resolv.conf`の`nameserver`順序を並び替えます。

Linuxのリゾルバは、`/etc/resolv.conf`の`nameserver`を**上から順に**試すようです。[^2][^3]先頭から応答が返ればそこで終了、タイムアウトすれば次へフォールバックする仕組みです。1問い合わせあたりデフォルト5秒 × 複数回リトライすることで[^4]、先頭が遅いと十数秒単位で待たされていたと推測します。
つまり、社内DNSを先頭に置くだけで、ほぼ全ての問い合わせが1行目で即解決するようになるはずです。

```bash
sudo vim /etc/resolv.conf
```

```conf
# /etc/resolv.conf
nameserver 10.x.x.x   # 一番上に変更
nameserver 172.x.x.x
search example.com
```

効果を計測します。

```bash
time getent hosts proxy.example.com
10.x.x.x    proxy.example.com

real    0m0.033s
user    0m0.003s
sys     0m0.007s
```

**15.225秒 → 0.033秒。**約**460倍**の改善です。
この状態で`apt update`を叩くと、自宅（無線/有線）LAN＋VPN環境で、一発で成功することを確認できました🎉

ここで忘れてはいけないのですが、`/etc/resolv.conf`は、WSLを再起動するとデフォルトで自動再生成され、上の変更が上書きされて消えてしまいます。
「せっかく直したのに翌朝また詰まった」を防ぐため、`/etc/wsl.conf`で自動生成を無効化しておきます。

```bash
sudo vim /etc/wsl.conf
```

```conf
# /etc/wsl.conf
[network]
generateResolvConf = false
```

# 5. おわりに

今回の泥沼を振り返ると、最も反省すべき点は、**「十分な評価をしないまま、ありがちな原因を手当たり次第試し続けた時間」** の長さでした。

生成AIにエラーログを投げると、どんなに長くても中身を読んで自分が思いつかない次の一手を考えてくれます。
特に、環境構築周りは色々な層に原因が潜んでいるため、これまで自分よりも生成AIの方が得意な分野だと思っていました。
もちろん多くの場合その通りだと思いますが、今回のケースのようにうまくいかない時もあります。
改めて、開発環境構築において「何ができて何ができなかったか」を整理することはもちろん、**「何が『どこまで』できているか」を「計測する」** ことが重要だと実感しました。

これから開発環境を構築する皆さんは、詰まった際に生成AIに「何をやるといいか」と同時に、「何を計測すると原因が測れるか」を聞いてみると解決の近道になるかもしれません。
そしてぜひ、詰まった経緯と解決策を記事にしてネットに公開してください！
今度は、生成AIが学習して解決がもっと早まるかもしれません……！

# 参考

[^1]: <https://wa3.i-3-i.info/word13207.html>
[^2]: <https://linuxjm.sourceforge.io/html/LDP_man-pages/man5/resolv.conf.5.html>
[^3]: <https://kazmax.zpp.jp/cmd/r/resolv.conf.5.html>
[^4]: <https://manpages.ubuntu.com/manpages/noble/ja/man5/resolv.conf.5.html>
[^5]: [TCP Proxyを作って面倒なProxy設定を一掃する ～Rust製moproxyとnftablesによる透過プロキシ設定～](https://future-architect.github.io/articles/20250904a/)
[^6]: [ローカルプロキシで認証プロキシの煩わしさを解消！](https://future-architect.github.io/articles/20240227a/)
[^7]: [ProxyとDockerと新人社員と時々わたし](https://future-architect.github.io/articles/20201020/)

