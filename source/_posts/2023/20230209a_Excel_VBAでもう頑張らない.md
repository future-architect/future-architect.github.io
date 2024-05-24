---
title: "Excel VBAでもう頑張らない"
date: 2023/02/09 00:00:00
postid: a
tag:
  - PowerShell
  - VBA
  - Excel
category:
  - Programming
thumbnail: /images/20230209a/thumbnail.png
author: 澁川喜規
lede: "Excelは開発者もそうじゃない人も使う広く使われているツールです。Excelに詳しい人も多く、データの可視化はとりあえずExcelの表にデータを入れてしまえば、あとはグラフ化はユーザーにおまかせ、とかいろいろできます。ただ、そのかなり使われているのと裏腹に、20世紀で時代で止まっているのがVisual Basic for Applicationです。"
---
Excelは開発者もそうじゃない人も使う広く使われているツールです。Excelに詳しい人も多く、データの可視化はとりあえずExcelの表にデータを入れてしまえば、あとはグラフ化はユーザーにおまかせ、とかいろいろできます。ただ、そのかなり使われているのと裏腹に、20世紀で時代で止まっているのがVisual Basic for Applicationです。VBA。

ちょっとしたツールの実装環境としてExcelが使われていたりするのですが、Excel VBAのメンテナンスは結構大変というか、現代的なプログラミング環境と比べるとエラーメッセージも不親切だし、記述方法も冗長だし、ちょっと厳しい。また、ウェブで検索しても新しい情報が出てこず、新しいAPIを使う方法もなかなか出てこなかったりします。[CredWriteW](https://learn.microsoft.com/ja-jp/windows/win32/api/wincred/nf-wincred-credwritew)でセキュアな情報保存をVBAで頑張ろうとしたけど、自分でやってもうまくいかず、検索してもやってみた例とかも出てこなくて、全世界の人口が70億程度ではVBAの知見を積み重ねるには足りないということが分かります。

新規で大規模なものをこれから作ったりはないかもしれませんが、既存の大規模なスクリプトのメンテナンスの仕事とかは来たり、機能拡張しろ、みたいなことがあるかもしれないので、VBAを書かずに済む方法を検討しました。JavaScriptで書けるOffice ScriptはOffice 365限定なんですかね？ユーザーのPCには新しいツールなどをインストールしない、という要件にも対応できるように、PowerShellにオフロードする方法を検討しました。

PowerShellもWindows 10以上を使っていればインストールしなくても使えますし、PowerShellの方が文法が分かりやすく、情報がそろっている、開発環境があって開発も検証も楽、などメリットが多いです。

# VBAの画面を表示

久々すぎて(20年ぶり？)色々忘れてたので備忘のために手順を書き残しておきます。まずはオプションで「リボンのユーザー設定」で「開発」を表示するようにします。

<img src="/images/20230209a/image.png" alt="リボンのユーザー設定" width="936" height="405" loading="lazy">

そうするとリボンに「開発」が出てくるので、一番右のVisual Basicボタンを押すと開発環境が出てきます。

<img src="/images/20230209a/image_2.png" alt="Visual Basicの開発環境" width="615" height="191" loading="lazy">

ユーザーが実行する起点となるUIボタンなどは、開発の挿入から選べます。ボタンを置くと、置いた時のコールバックのサブルーチンを作るウインドウが出て、起動するコードが生成できます。古き良き、WYSIWYGなビジュアルプログラミングです。1995年ぐらいには輝いていましたね。

<img src="/images/20230209a/image_3.png" alt="古き良き、WYSIWYGなビジュアルプログラミング" width="257" height="274" loading="lazy">

あとは、ここにコードを書いていけばOKです。

# PowerShellのコードをVBAに埋め込み

複数行テキストとかヒアドキュメントみたいなのはなさそうなので、ソースコードを文字列の形式で書いて結合するコードを書きます。エスケープとかをソースをメンテするたびに手で治したりはしたくないので、関数生成のPythonスクリプトを書きました。

```py convert.py
import sys

print("""Function SourceCode() As String
    Dim src As String""")

with open(sys.argv[1], "r", encoding="utf-8") as src:
    for line in src.readlines():
        line = line.removesuffix("\n")
        line = line.replace('"', '""')
        print(f'    src = src + "{line}" + vbCrLf')
    print("    SourceCode = src")
    print("End Function")
```

次のようなスクリプトを変換してみます

```powershell hello.ps1
Write-Host "ハロー"
Write-Host "World"
```

VBAにそのまま張れる関数コードになりました。

```bash
> python3.exe convert.py hello.ps1
Function SourceCode() As String
    Dim src As String
    src = src + "Write-Host ""ハロー""" + vbCrLf
    src = src + "Write-Host ""World""" + vbCrLf
    SourceCode = src
End Function
```

# PowerShellの実行

PowerShellとして実行するのは、このスクリプトをTEMPファイルとして書き出して実行すれば良さそうです。いろいろ検索すると、ファイルの操作はFileSystemObject、UTF-8でファイルを書きだすにはADODB.Streamを、PowerShellの実行にはWScript.Shellを使えばよいということが分かりました。

以下のコードではそれを書いたものです。あとは、この関数の下に、さきほどの関数を張り付けておけば、PowerShellが実行できます。

```vb
Sub ボタン_Click()
    Dim FSO As Object

    Dim scriptPath As String

    Set FSO = CreateObject("Scripting.FileSystemObject")

    scriptPath = FSO.GetSpecialFolder(2) + "\" + FSO.GetTempName + ".ps1" ' TempFolder

    With CreateObject("ADODB.Stream")
        .Charset = "UTF-8"
        .Open
        .WriteText SourceCode(), 1
        .SaveToFile scriptPath, 2
        .Close
    End With

    Dim shell As Object
    Set shell = CreateObject("WScript.Shell")

    Dim result As Object
    Set result = shell.Exec("powershell -NoLogo -WindowStyle Hidden -ExecutionPolicy RemoteSigned " + scriptPath)
    Debug.Print result.Stdout.ReadAll

    FSO.DeleteFile scriptPath
End Sub
```

# VBAのメモ

あまり書きたくないとはいえ、ちょっといじらないといけないとき用のメモ

* サブルーチンと関数があり、後者は返り値がある。return文はなく、関数名と同名の変数に代入すると返り値になる
* 変数はDim 名前 As 型で宣言
* 変数に値をセットするときは、プリミティブ型はLet 変数 = 値。オブジェクトはSet 変数 = 値。
* 文字列はダブルクオート。ダブルクオートを中で使いたいときのエスケープは`""`とする。
* Debug.Printでデバッグ出力。開発環境でイミディエイトウィンドウを出せば見られる。

# まとめ

VBAからPowerShellへのオフロードが実現できました。文字列をちょっと処理するのとかもPowerShellの方が書きやすいですね。Invoke-WebRequestなどもあって、ウェブのリクエストを飛ばしたりもやりやすいですし、サーバー起動してコールバックを受けたり（要するにOpenID Connectの認証をしたり）もできますし、他サービス連携がはかどります。VBAは、Excelとの接点としては残りますが、ウェブ上の情報も減っていったりすることを考えると、なるべく書かないようにしていった方が将来のメンテナンス作業を考えると良いかなと思っています。

# 参考にしたページ

* http://officetanaka.net/excel/vba/filesystemobject/
* http://officetanaka.net/excel/vba/file/file11.htm
* https://atmarkit.itmedia.co.jp/ait/articles/0407/08/news101.html
* https://www.tipsfound.com/vba/18026
* https://future-architect.github.io/articles/20221130a/

