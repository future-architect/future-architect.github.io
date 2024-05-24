---
title: "Text-to-Speechを試してみる"
date: 2021/03/12 00:00:00
postid: ""
tag:
  - GCP
  - TextToSpeech
category:
  - Infrastructure
thumbnail: /images/20210312/thumbnail.png
author: 村瀬善則
lede: "昨年に続きGCP連載企画の参加です。私個人としてはGCPはほとんど利用したことがないので、せっかくだから面白そうなことを試してみようと思い、今回はText-to-Speechについて試してみることにしました。読んで字のごとくですがテキストを自然な音声に変換するサービスで、40以上の言語と方言で220種類以上の音声から選択できます。話す速度や声の高さも変更することができます。"
---
# はじめに

こんにちは。TIGの村瀬です。

[昨年](/articles/20200218/)に続き[GCP連載](/articles/20210307/)企画の参加です。私個人としてはGCPはほとんど利用したことがないので、せっかくだから面白そうなことを試してみようと思い、今回はText-to-Speechについて試してみることにしました。

# Text-to-Speechとは

<img src="/images/20210312/Cloud_Text-to-Speech.png" loading="lazy">

> https://cloud.google.com/blog/ja/products/ai-machine-learning/cloud-text-to-speech-expands-its-number-of-voices-now-covering-33-languages-and-variants より

読んで字のごとくですがテキストを自然な音声に変換するサービスで、40以上の言語と方言で220種類以上の音声から選択できます。話す速度や声の高さも変更することができます。

本記事ではAPIを利用して音声ファイルを作成するところまでを紹介しますが、APIを利用せずどんなものか確認するのであれば[このページ](https://cloud.google.com/text-to-speech/?hl=ja#section-2)の **Text-to-Speech を試してみましょう**  のところで確認できます。あなたがロボットでなければ。

# 料金
無料枠があり、最初の400万文字/月は無料。それを越した場合でも100万文字あたり$4.00でお安いですね。
詳細は[公式ページ](https://cloud.google.com/text-to-speech/pricing?hl=ja)を参照ください。


# 準備
[クイックスタート: コマンドラインの使用のページ](https://cloud.google.com/text-to-speech/docs/quickstart-protocol?hl=ja)を参考に準備をします。

## 1.新しいプロジェクトの作成

<img src="/images/20210312/00create_prj.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">


適当にプロジェクト名を入力して作成します。

## 2.Cloud Text-to-Speech APIの有効化
[クイックスタート ページ内](https://cloud.google.com/text-to-speech/docs/quickstart-protocol?hl=ja)のAPIを有効にするボタン]をクリックして有効にします。

<img src="/images/20210312/01pre.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">


## 3.認証の設定
必要なロールはありませんということなのでロールを選択せず作成します。

<img src="/images/20210312/02pre.png" class="img-large-size" style="border:solid 1px #000000" loading="lazy">

<img src="/images/20210312/03pre.png" class="img-large-size" style="border:solid 1px #000000" loading="lazy">

<img src="/images/20210312/04pre.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

<img src="/images/20210312/05pre.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

JSONファイルがダウンロードされるので適切な場所に保存します。のちにこのJSONファイルのパスを環境変数に設定することになります。

## 4.Cloud SDK をインストールして初期化します。
[このページ](https://cloud.google.com/sdk/docs/install?hl=ja)に則りインストールします。


<img src="/images/20210312/05sdk.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

<img src="/images/20210312/06sdk.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

<img src="/images/20210312/07sdk.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

<img src="/images/20210312/08sdk.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">

環境にもよると思いますが割と時間かかります。コーヒーでも飲んで待ちましょう。

<img src="/images/20210312/09sdk.png" loading="lazy">

コマンドプロンプトが起動するのでYを入力します。

<img src="/images/20210312/13sdk.png" loading="lazy">

<img src="/images/20210312/14sdk.png" loading="lazy">

ブラウザが起動するのでアクセスを許可します。

<img src="/images/20210312/15sdk.png" style="border:solid 1px #000000" loading="lazy">

無事に完了しました。

## 5.環境変数の設定
他のブログをみるとLinux,macOSの記事が多かったので今回はあえてWindowsのPowerShellでやってみます。

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\xxx\Text-to-Speech-123456789012.json"
```

# テキストから音声へ変換

## ファイルの用意
音声に変換したい文字列や必要となる情報を記載したJSONファイルを用意します。ここではクイックスタートに習ってrequest.jsonとします。日本語の音声を確認したかったので以下の様にしました。

```json request.json
{
    "input":{
      "text":"経営とITをデザインするフューチャーアーキテクト"
    },
    "voice":{
      "languageCode":"ja-JP",
      "name":"ja-JP-Standard-C",
      "ssmlGender":"MALE"
    },
    "audioConfig":{
      "audioEncoding":"MP3"
    }
}
```

設定可能な言語、音声は[こちら](https://cloud.google.com/text-to-speech/docs/voices?hl=ja)を参照


## APIの実行
クイックスタートに載ってるコマンドを実行します。

```powershell
$cred = gcloud auth application-default print-access-token
$headers = @{ "Authorization" = "Bearer $cred" }

Invoke-WebRequest `
  -Method POST `
  -Headers $headers `
  -ContentType: "application/json; charset=utf-8" `
  -InFile request.json `
  -Uri "https://texttospeech.googleapis.com/v1/text:synthesize" | Select-Object -Expand Content
```
実行すると以下のエラーが発生しました。

<img src="/images/20210312/16err.png" loading="lazy">

[このページ](https://qiita.com/ponsuke0531/items/4629626a3e84bcd9398f)を参考にしてエラーを解消します。

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

再度実行すると無事mp3が返却...されません。
代わりにmp3を生成する基となるbase64を含むJSONが返却されます。



mp3が返却されないのはAPIの応答は全てJSONに統一されているからでしょうか？
なお、返却されたJSONの中のbase64の文字列をのちに利用するので応答をファイル出力しておくと便利です。

## base64からmp3への変換
JSONからaudioContentの値を抜き出してファイル(base64.txt)に保存します。

```base64.txt
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
```

今回はしませんが繰り返し利用するのであればスクリプト組んでおくと便利ですね。

そしてbase64をmp3に変換します。

```powershell
certutil -decode base64.txt future.mp3
```

テキストから生成した音声はこちらになります。

<br><br>


<audio controls>
  <source src="/images/20210312/future.mp3">
</audio>

# さいごに

慣れないツールを利用したせいかところどころ躓きましたが無事テキストから音声を生成することができました。
難しい設定も不要でお手軽に自然な音声が生成できるのは素晴らしいですね。音声を生成する時間も早いと感じました。Webページにデモもありどんなものか試せる点も良いですね。

高音域まで聞こえるスピーカーで聞くと若干ノイズが気になりますが、電話を通じた音声に利用したりするには十分かと思います。

公式によるユースケースは[こちら](https://cloud.google.com/text-to-speech?hl=ja#section-6)を参照

今回作成したプロジェクトを削除して終わりです。

明日は前原さんの[Cloud Build を知ってみよう](/articles/20210315/)です。
