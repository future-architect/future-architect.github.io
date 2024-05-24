---
title: "WindowsのVPN切り替えコマンドで学ぶ各シェルのエイリアス設定方法"
date: 2022/11/15 00:00:00
postid: a
tag:
  - Windows
  - VPN
category:
  - Infrastructure
thumbnail: /images/20221115a/thumbnail.png
author: ダワージャルガルオチラル
lede: "WindowsでのVPN切り替えコマンド及び各シェルにエイリアスを貼る方法を紹介します。エイリアスを貼れば、好きなコマンドで好きなスクリプトを実行できるようになります。"
---
## はじめに

どうも、気付いたら社会人3年目に突入したオチラルです。

2022年8月に当時僕のいたPJの後輩である[山下さん](/authors/%E5%B1%B1%E4%B8%8B%E9%87%8F%E4%B9%8B/)が、MacでのVPN切り替えコマンドの[紹介記事](/articles/20220818a/)を書きました。

今回は山下さんの元記事をリスペクトしながら、**WindowsでのVPN切り替えコマンド**及び**各シェルにエイリアスを貼る方法**も紹介します。エイリアスを貼れば、好きなコマンドで好きなスクリプトを実行できるようになります。

ちなみに、山下さんは画面共有した際にすごい早さで僕の知らないコマンドを打ち込み、僕が効率悪くやっていた作業を効率よくこなす、デキすぎる後輩です。


## 元記事の紹介

* 参考リンク：[MacのVPNをコマンドでスムーズに切り替えよう](/articles/20220818a/)

業務上、複数のVPNを利用する必要があるとき、GUIツールでマウスをポチポチ打ち込む場合VPNの切り替えに10秒ぐらい必要になります。しかし、ここでCLIツールでコマンドを打ち込んで切り替えができる場合、[2秒ほどまで削減](/articles/20220818a/#VPN%E5%88%87%E3%82%8A%E6%9B%BF%E3%81%88%E3%82%B3%E3%83%9E%E3%83%B3%E3%83%89%E5%B0%8E%E5%85%A5%E3%81%AE%E5%8A%B9%E6%9E%9C)⚡されかなりのストレス軽減になります。

時間削減もそうですが、GUIツールでマウスを所定の位置に動かして作業するということは思っている以上に脳のリソースを使う作業であり、山下さんの記事を参考にWindowsでのVPN切り替えツールを導入した結果、僕もかなり仕事が捗るようになりました！

## 今回やりたいこと

元記事と同様に筆者は2つのVPN接続ツールを使用しています。

- Cisco社のCisco AnyConnect
- Windows標準のVPN機能

以上の2つのVPN接続ツールのGUIでの接続/切断環境は用意していますが、今回はCLI上のコマンドでVPN接続/切断できるようにします。

目標はコマンド1つ打つことでVPNを切り替えることです。もし、別のOS、VPNツールを使っている場合、そのツールに対応したコマンドを用意しましょう。

今回はWindowsでのVPN切り替えコマンドの紹介とシェルスクリプトへのエイリアス作成方法も共有します。エイリアスとはコマンドに別名を付けることを指しており、一連のコマンド（シェルスクリプト）を一発で実行できるようになります。

適切にエイリアス設定が出来た場合CLIにて、 `backToTheFutureVpn`と打ち込むだけでVPNが切り替わります。
既存のコマンド名とダブっていなければ、好きな文字列を指定できます。なのでCLIに打ち込むコマンドは`bttf2`でも`delorean`でも`ToInfinityAndBeyond`でも`StriveForGreatness`でも`hogevpn`や`fvpn`などでも良くなります。

## 結果だけ先に教えて欲しい人へ

煩わしいから、結果だけ頂戴という方のために、早速VPN切り替えコマンドとエイリアス記載箇所を共有します。

Windowsだと色んなシェルを使いますが、`GitBash`、`PowerShell`、`コマンドプロンプト`すべてのシェルのコマンドとエイリアス設定方法を共有します。（PJ異動したり勤続年数が増えると色んなシェルに詳しくなっていくものですね。）

各コマンドの`{}`、`${}`の箇所は**該当するVPN名、ユーザー名、パスワード、設定したいエイリアス名などに置き換えて**下さい。または、環境変数に設定して下さい。

### 事前準備

#### CiscoのCLIツールのパスを通す

CiscoのCLIツールはWindowsの場合

`/c/Program Files (x86)/Cisco/Cisco AnyConnect Secure Mobility Client`

にvpncli.exeファイルとして存在してると思います。そのため、

```sh　vpncli
#GitBash
"C:\Program Files (x86)\Cisco\Cisco AnyConnect Secure Mobility Client\vpncli"
#PowerShell
cmd /c "C:\Program Files (x86)\Cisco\Cisco AnyConnect Secure Mobility Client\vpncli"
#Command Prompt
"C:\Program Files (x86)\Cisco\Cisco AnyConnect Secure Mobility Client\vpncli"
```

とコマンドを打てばCLIツールを起動できますが、パスを通せば`vpncli`と打つだけで起動できるようになります。

本記事ではパスを通した前提で進めますが、パスの通し方が分からない方でも一旦`vpncli`を上記のコマンドに置き換えても動くはずです。本記事ではパスとパスの通し方に付いては割愛します。

#### vpncli用の入力ファイルを作成する

どのシェルでもCiscoのCLIツールの仕様により**CLIへの入力を書いた**テキストファイルをどこかに格納しないといけません。

今回は元記事と同様の箇所に保存します。

GUIでやってもいいですが、かっこよくCLIで作成します。
※Gitbashでしか動かないです。他のシェルでは`vi`を`notepad`に置き換えたり`code .`でvscodeを開いたりして適切に保存して下さい。

```sh テキストファイル作成
mkdir ~/.vpn
vi ~/.vpn/CISCO_VPN.cre
```

上記のコマンドでディレクトリとファイルが作成ができます。vi editorが開かられるので`i`ボタンを押し以下の内容を入力します。

```sh
{CISCO_VPN_USER_NAME}
{CISCO_VPN_PASSWORD}
y
```

完了したら`escape`　➔ `:wq` ➔ `enter`キーの順番で押せばファイル保存ができます。

### 各シェルでVPNを切り替えるコマンド

エイリアス設定時に各コマンドをシェルスクリプトファイルとして保存していないといけません。

本記事では、`~/ShellScripts`に`ciscoVPN`、`winVPN`という名前で以下のスクリプトを保存した前提でエイリアス設定を次項でします。

実際にスクリプトファイルを作成する前に、各コマンドが動いていることを確認すると良いです。

■Cisco Anyconnect切断　➔　Windows標準接続

```sh ciscoVPN
# Gitbash、PowerShell、Command Promptすべて同様
vpncli disconnect
rasdial ${WIN_VPN_NAME} ${WIN_VPN_USER_NAME} ${WIN_VPN_PASSWORD}
```

■Windows標準切断　➔　Cisco Anyconnect接続

```sh winVPN
# Gitbashの場合
# スラッシュにエスケープが必要
rasdial ${WIN_VPN_NAME} //disconnect
vpncli -s < ~/.vpn/CISCO_VPN.cre connect ${CISCO_VPN_NAME}
```

```sh winVPN
# PowerShellの場合
rasdial ${WIN_VPN_NAME} /disconnect
# リダイレクト機能が未実装のためコマンドプロンプトを使う
cmd /c 'vpncli -s < %HOMEPATH%\.vpn\CISCO_VPN.cre connect ${CISCO_VPN_NAME}'
```

```sh winVPN
# Command Promptの場合
rasdial ${WIN_VPN_NAME} /disconnect
vpncli -s < %HOMEPATH%\.vpn\CISCO_VPN.cre connect ${CISCO_VPN_NAME}
```

Gitbashでエイリアスの設定まで成功するとこういったログが表示されます。
`hogevpn`が「Cisco Anyconnect切断　➔　Windows標準接続」で`backToTheFutureVpn`がその逆です。（普段はもっと短いエイリアス設定してます。）

<img src="/images/20221115a/無題3.png" alt="無題3.png" width="990" height="1893" loading="lazy">


### エイリアス設定

前項で作成したスクリプトファイルを実行するエイリアスを**各シェル起動時に読み込まれる設定ファイル（スクリプト）に追記**します。


#### GitBash
Gitbashは`/.bash_profile`と`/.bashrc`がシェル起動時に読み込まれるので、好みで好きな方にエイリアスを貼ります。こういった設定は`~/.bashrc`に書くのが一般的な気がします。

もしファイルが存在しない場合は作成して下さい。

```sh .bashrc
alias {CISCO_ALIAS_NAME}='source ~/ShellScripts/cicoVPN.sh'
alias {WIN_ALIAS_NAME}='source ~/ShellScripts/winVPN.sh'
```

#### PowerShell
PowerShellは[この記事](https://qiita.com/smicle/items/0ca4e6ae14ea92000d18)を参考に設定しました。[公式はここ](https://learn.microsoft.com/ja-jp/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-7.2)です。PowerShellではシェル起動時に読み込まれる設定ファイルをプロファイルと言うようです。

プロファイル作成前に[元記事](https://qiita.com/smicle/items/0ca4e6ae14ea92000d18#powershellscript%E3%82%92%E5%AE%9F%E8%A1%8C%E3%81%99%E3%82%8B%E6%A8%A9%E9%99%90%E3%82%92%E4%BB%98%E4%B8%8E)で言われているようにプロファイルでスクリプトを実行するための権限を付与します。

管理者権限で以下のコマンドを打ちます。

```ps1
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned
```

そして、設定されるユーザーの範囲によって異なる箇所にプロファイルを置くようです。

僕は個人ユーザーで設定されるように、`$HOME\Document\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`を作成しました。

プロファイルには以下の2行を書き込みます。

```ps1 Microsoft.PowerShell_profile.ps1
Set-Alias {WIN_ALIAS_NAME} "$HOME\ShellScripts\winVPN.ps1"
Set-Alias {CISCO_ALIAS_NAME} "$HOME\ShellScripts\ciscoVPN.ps1"
```

#### Command Prompt
コマンドプロンプトは残念ながら他のシェルと違い分かりやすく読み込まれる設定ファイルはないようです。以下の**2つの方法から選ぶことになります。**

今回はこちらの[StackOverFlowの質問](https://superuser.com/questions/144347/is-there-windows-equivalent-to-the-bashrc-file-in-linux)を参考に調べました。

先に書き込むエイリアスを共有します。スクリプトはどこに置いても良いですが、今回は`ShellScripts/cmdProfile.bat`を作成します。

```ps1 cmdProfile.bat
doskey {WIN_ALIAS_NAME} = "%HOMEPATH%\ShellScripts\winVPN.bat"
doskey {CISCO_ALIAS_NAME} = "%HOMEPATH%\ShellScripts\ciscoVPN.bat"
```

##### **1. レジストリのautorunの設定に読み込むスクリプトを指定する。**

レジストリとはWindowsのシステム、ハードウェアなどの設定がされているファイルです。[公式](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry)では変更を加えることは推奨していません。コマンドプロンプトのcmd.exeのレジストリにAutorunという設定があり、Autorunに設定されたコマンドはコマンドプロンプト起動時に読み込むようになっているそうです。

[公式](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/cmd)には読み込まれるレジストリだけ書いてありAutorunが読み込まれるという記載はありませんでしたが、[何人か](https://renenyffenegger.ch/notes/Windows/dirs/Windows/System32/cmd_exe/index)の方の[解説記事](https://hail2u.net/blog/software/cmd-autorun.html)によるとそうなるようです。苦しいソースで心苦しいですが。。多分Autorunの値が読み込まれる認識で合ってると思います。レジストリ何も分からない。。

そのため、公式から用意している方法であるレジストリを編集するのが正しい姿な気がしますが、ほとんどの会社の業務用PCはセキュリティの都合上レジストリを編集することは禁止しているかと思いますので、今回は次の方法で設定します。

こちらの方法を取る場合は[こちらの記事](https://hail2u.net/blog/software/cmd-autorun.html)などを参考に設定して下さい。

##### **2. cmd.exeのショートカットを作成し、起動オプションでスクリプトを実行してから開くようにする**

こちらの[公式の記載](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/cmd)や、[非公式](https://ss64.com/nt/cmd.html)の有志のまとめてくれたコマンドプロンプトの仕様によると、コマンドプロンプトはいくつかのオプションを付けて起動できます。

今回使うのは `/q` `/k`オプションで、`/q`はログ出力をさせないオプションで、`/k`はコマンドプロンプト起動前に指定されたコマンドを実行するというオプションになります。

コマンドプロンプトは、`C:\Windows\System32\cmd.exe`を開けば開くようになっていると思いますので、まずこちらの**ショートカットを作成します。** そして、**ショートカットのプロパティ　→　ショートカット　→　リンク先を以下のように書き換えます。**

`%windir%\system32\cmd.exe /q /k "%HOMEPATH%\ShellScripts\cmdProfile.bat"`

<img src="/images/20221115a/無題.png" alt="" width="648" height="987" loading="lazy">

これで無事、設定ファイルを読み込みながらを起動するコマンドプロンプトのショートカットができました。ここで作成したショートカット以外を経由しないでコマンドプロンプトを開いた場合作成したプロファイルが読み込まれないので注意して下さい。適宜、タスクバーなどに追加して利用して下さい。

Windows Terminalを使っている方は、 **設定　→　全般　→　コマンドライン** の箇所に同様のオプションで設定ファイルを読み込むようにすればいいです。（筆者はこっちを使ってます。）

<img src="/images/20221115a/無題2.png" alt="" width="1200" height="658" loading="lazy">

## まとめ

上記の設定を行いシェルを再度開けば、無事設定したエイリアス名を打ち込めばVPNが切り替わるようになります。

ちなみに、bashrcはlinuxやmacのターミナルでも読み込まれるので、実はMacとLinuxはGitbashの箇所を参考に設定すればエイリアス設定ができます。今回の記事の応用として、以下のようによく使うディレクトリの移動スクリプトを作ってエイリアス設定すれば煩わしいディレクトリ移動を一瞬でできるようになります。

```sh
cd {移動したいディレクトリパス}
```

短いコマンドでディレクトリを自由に移動する様を周りに見せつければ何も知らない人から尊敬の念をきっと貰えると思います。

また、こういった設定ファイルは永続的に通さなくても良さげな環境変数やパスを通すことが多いです。筆者は学生の頃bashrcが何かについて1ミリも理解せず脳死で世の中の記事のコマンドをコピペしていった結果、bashrcがとても汚くなったことがあります。エラーが出ても何を行っているか理解してなかったので**シェル怖い**と思った過去もありますが、今はだいぶ分かるようになりました。

そのため、過去の自分が読んだときに勉強になるように、今回の記事ではできる限り丁寧に各項で何を行っているか説明しました。過去の僕のような「シェル怖い」な方の助けになったら幸いです。

### おまけ：各コマンドの解説/振り返り

今回の一連のコマンドを見て疑問に思ったかもしれない箇所の解説/振り返りをしたり気ままに語ります。

コマンドを打つときこんな感じで調べてるんだなと勉強になれば幸いです。

#### **シェルの違い**

各シェルの差分として大きかったのは以下の4つかと思います。

##### **パスの指定方法**
こちらは、ホームディレクトリの記載方法が各シェルで違いましたね。`%HOMEPATH%`、`$HOME`、`~`だったかと思います。`%`や`$`は環境変数を読み込んでいるだけで、後は各シェルがホームディレクトリの変数をどう設定しているかの違いです。地味に`gitbash`以外は知らなかったのでググりました。

ちなみに、普通にホームディレクトリを打っても良いです。記事を書く都合上誰でもコピペして使えるように調べましたが、当初僕のスクリプトには`C:\Users\{USER_NAME}`と書いてありました。

また、大きな違いとして、**パスの区切りがスラッシュ`/`とバックスラッシュ`\`で違った**と思います。Windows系はバックスラッシュで、その他UNIX系はスラッシュが一般的です。歴史的な経緯があるそうですが、正直超絶初心者キラーです。何度パスが間違ってますと怒られたことか。。僕は未だにどっちがどっちか覚えておらず、いつも`pwd`などを打ってコピペして確認したりしてます。

##### **シェルスクリプトの拡張子**
ちゃんと解説してないですし、そもそも調べてないですが、各シェルで実行するシェルスクリプトの拡張子が`.ps1`、`.bat`、`.sh`になっていたかと思います。これは各シェルでのシェルスクリプト実行時の拡張子で、正しい拡張子ではない場合上手く動かなかったのでしょうがなく対応する拡張子に変えました。（総当たりで全パターンを見た訳じゃないので互換性のある拡張子とシェルがあったかもしれないですが。。誰かどんなシェルでも動く神シェルスクリプト拡張子を教えて下さい。）

##### **エイリアス設定コマンド**
各シェルで完全に違いましたね。`各シェル名　＋　エイリアス`でググってやりました。特段エラーに遭遇したりはしなかったです。
やってることは、

```ps1
{エイリアスを貼るコマンド} {付けたいコマンド名} {実行するコマンド（シェルスクリプトファイルを実行する）}
```

ですね。

ちなみに、シェルスクリプトを実行するコマンドは、Windowsのシェルはパスを指定するだけで実行してくれるし、Gitbashの場合`source`コマンドと後にパスを書くと実行することを利用してます。

##### **設定ファイル**
軽い気持ちで、「せや全シェルで動くようにしよう」と思い立ったのがこの長い記事の始まりです。元々VPN切り替えはGitbashで設定しようとして上手くいかなかった（WindowsVPN切断時のエスケープに気付かなった）のでPowerShellで設定していましたが、新PJでコマンドプロンプトを使うようになったのでどうせならと思い調べました。各シェルの設定方法が違いすぎてとても勉強になりましたね。

大学生のときはbashrcが何をやっているか知らずに5,6年ぐらいいじってましたが、「シェル起動時に読み込んでいる」、「bash系のシェルしか読み込んでない」という事実にようやく気付き感動したのが最近のことです。シェルで何気なく打っているコマンドの「`.exe`ファイルがPCに格納されている」、「OSが勝手に設定している環境変数がある」という事実に気付いたのも最近で、もっと昔にシェルの仕組みの勉強しとけば今まで脳死で実行してたコマンドを理解出来て成長できたろうなと思う今日この頃です。
皆さんも世の記事で当たり前のように書かれているオプションの意味を調べる癖を身に着けましょう。

余談ですが、bashrcを設定ファイルだったりプロファイルと呼ぶことも勉強になりました。実は設定ファイルとググるより`bashrc command prompt（コマンドプロンプト）`とか`bashrc PowerShell`と検索した方が記事が見つかりやすかったです。なのでこういったシェル起動時に読み込まれるファイルはbashrcと呼ぶのが世界共通認識のようです（違う

#### **VPN切り替えの振り返り**

##### **VPN切り替え**
基本的にVPN切断　➔　VPN接続してるだけです。
山下さんの元記事を参考に調べました。感謝。

##### **Windows標準VPN接続・切断**
`rasdial`コマンドですね。dialと名前も付いてますし、オプションに電話帳とか書いてあったので多分古くからあるコマンドです。誰か歴史教えて下さい。

いくつかの記事を読んだり、コマンド自体のヘルプを見て書きました。今回はスクリプトにユーザー名とパスワードを書いてしまいましたが、外部ファイルに書き込んで読み込むという方法もあると思います。

ちなみに、`rasdial`のヘルプは以下のようになってます。

```ps1
C:\Users\{user_name}>rasdial /h
使用法:
        rasdial エントリ名 [ユーザー名 [パスワード|*]] [/DOMAIN:ドメイン]
                [/PHONE:電話番号] [/CALLBACK:コールバック番号]
                [/PHONEBOOK:電話帳ファイル] [/PREFIXSUFFIX]

        rasdial [エントリ名] /DISCONNECT

        rasdial

        'https://go.microsoft.com/fwlink/?LinkId=521839' にある
        プライバシーに関する声明を参照してください
```

接続は見てわかる通りVPN名、ユーザーネームとパスワード入れるだけですね。切断もだいぶ単純です。

`gitbash`の切断だけスラッシュにエスケープが必要ということに気付かずだいぶ詰まりましたね。エスケープしないと下のエラーになります。

```ps1
$ rasdial {VPN_NAME} /disconnect
{VPN_NAME} に接続中...
ユーザー名とパスワードを確認中...

リモート アクセス エラー 691 - 指定したユーザー名またはパスワードが認識されないか、選択した認証プロトコルがリモート アクセス サーバーで許可されていないため、リモート接続が拒否されました。

このエラーの詳細については:
        'hh netcfg.chm' と入力してください。
        ヘルプでトラブルシューティングのエラー メッセージをクリックし、691 を参照してください。
```

ググっても原因が分からず諦めていたのですが、今回の記事作成時に再度見てたら単純に`/disconnect`がコマンドではなく、ユーザー名判定されてるということにようやく気付きました。試しに`rasdial {VPN_NAME} //disconnect`で上手く動いたときは感動しました。

rasdialはwindowsのコマンドだしwindows系のシェルでしか上手く動かないんだなと結論付けた数ヶ月前の自分は愚かだったなと思います。bashとwindowsのシェルのスラッシュのエスケープについて調べてないので、あるあるなのかどうかすら知らないので、誰か面白い話あったら教えて下さい。

##### Cisco AnyConnect VPN接続・切断

vpncliですね。山下さんの元記事があったのでそんな苦労はしてないです。山下さんの記事のリダイレクトとオプションが不思議だったのでそこらへんを調べたりしました。

`vpncli`のヘルプは下になります。

```ps1
$ vpncli /h
Cisco AnyConnect Secure Mobility Client (version 4.9.06037) .

Copyright (c) 2004 - 2021 Cisco Systems, Inc.  All Rights Reserved.
    Usage: vpncli.exe [options] | [cmd] [host]

       options:
            -h         Print this usage statement.
            -v         Print version.
            -s         Read commands from response file to work non-interactively.
                       Example: vpncli.exe -s < response.txt

       commands: [connect|disconnect|hosts|state|stats]
```

vpncliは使ってみると分かりますが、vpncliのコマンドラインが開かれてしまいます。

```ps1
$ vpncli
Cisco AnyConnect Secure Mobility Client (version 4.9.06037) .

Copyright (c) 2004 - 2021 Cisco Systems, Inc.  All Rights Reserved.


  >> state: Disconnected
  >> state: Disconnected
  >> notice: Ready to connect.
  >> registered with local VPN subsystem.
VPN> -h

[ VPN Connection commands ]
    connect             disconnect        hosts         stats
    state               block             cancel

[ Misc commands ]
    help                version           exit

  For help with a specific command, try: help <command>

VPN>
```

この後、disconnectするなり、connectを押して指示に従いVPN名とユーザーネーム、パスワードを入れたりすることになります。ちなみに、connectとだけ打つとVPN名一覧を見れたりします。

今回使っている`-s`コマンドはヘルプに書いてある通り、vpncliのコマンドラインに渡す入力をファイルから貰うという意味になります。

そして、`rasdial`と違いユーザーネームとパスワードをオプションで指定出来ず、1つずつ入力しないといけない都合上、`-s`コマンドを使わなければコマンド一発で接続することが出来ませんでした。ちなみに、`connect {CISCO_VPN_NAME}`を`.cre`に書き込んでも上手く動いたりします。

また、面白いのがPowerShellの仕様で、リダイレクト機能である`<`を打つと以下のエラーが出ます。

```ps1
PS C:\Users\{user_name}> vpncli -s < %HOMEPATH%\.vpn\CISCO_VPN.cre connect {CISCO_VPN_NAME}
発生場所 行:1 文字:11
+ vpncli -s < %HOMEPATH%\.vpn\CISCO_VPN.cre connect {CISCO_VPN_NAME}
+           ~
演算子 '<' は、今後の使用のために予約されています。
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : RedirectionNotSupported
```

どうやら、`<`を利用すること自体禁止されているようで、今後使えるようになるらしいです。知らないですけど、こんなシェル黎明期みたいな文言を見れるとは思いもしませんでした。

そのため、コマンドプロンプトは`cmd`で実行できるので、`/c`のコマンド実行後に閉じるオプションを付けてコマンドプロンプトで実行させてます。

### 最後に

こんな長い記事を最後まで読んで頂きありがとうございます。

