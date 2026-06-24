---
title: "macOSでプリインストールされるLLMサービスをコーディングエージェントから使う実験"
date: 2026/06/24 00:00:00
postid: a
tag:
  - Mac
  - LLM
  - Foundationmodel
category:
  - Infrastructure
thumbnail: /images/2026/20260624a/thumbnail.png
author: 澁川喜規
lede: "みなさん、WWDC26の情報はみられましたか？昨年発表されたDocker互換のコンテナランタイムがパワーアップし、WSLのようなLinuxコンソール体験を提供するcontainer machineとか楽しそうですよね。"
---
みなさん、WWDC26の情報はみられましたか？WWDCを新製品発表会のように思われている方には肩透かしだったようですが、技術的に今回はかなり期待できる発表がいくつもありました。昨年発表されたDocker互換のコンテナランタイムがパワーアップし、WSLのようなLinuxコンソール体験を提供するcontainer machineとか楽しそうですよね。

それとも1つ。生成AIではとうとう、より気軽に使えるように拡張されました。WWDC25でも、Foundation Models Frameworkが提供されApple IntelligenceをSwiftを通じて利用できるようになりましたが、今回追加された`fm`コマンドが入り、OllamaとかLMStudioとかインストールしなくても組み込み機能で同等のことができるようになります。リーズニング、ツール呼び出し、構造化出力に対応しているため、高度なシステムに組み込むことができそうです。

たとえば、`$ fm chat`で起動すると以下のような画面が出てきます。

<img src="/images/2026/20260624a/スクリーンショット_2026-06-13_20.51.48.png" alt="" width="635" height="267" loading="lazy">

`$ fm serve`ではOpenAI互換のAPIサーバー

<img src="/images/2026/20260624a/スクリーンショット_2026-06-13_20.54.21.png" alt="" width="596" height="191" loading="lazy">

が起動します。なお、モデルは2種類あります。

* `system`: デバイス上で動くモデル
* `ppc`: プライベートクラウドで動くモデル。利用上限がある。

[Apple製の第三世代モデル](https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models)が使われています。`system`は、AFM 3 Core Advanceですね。20Bの性能を持つが、メモリ上は1B-4B程度の容量しか食わないとされています。`ppc`はAFM 3 Cloudのモデル群ですね。サーバー側でNVIDIAのボードで動いているとなっています。プライバシーとかセキュリティはばっちり、とのこと。

どう設定するかはわかりませんが、これら以外にClaudeやGeminiのモデルを追加したり、Hugging Faceに上がっているようなモデルを使ったりもできるようです。

とはいえ、少ないメモリで動くローカルモデルというのが一番気になります。ネット使わずに生成AIで開発は果たしてできるのか？実験してみました。

# 準備(macOS 27 Golden Gate, OpenCode)

現時点ではmacOS 27 Golden Gateはリリースされていません。そのため、まずは`fm`コマンドを使えるようにするために、macOSのベータ機能を有効にします。そうするとmacOS 27 Golden Gateの開発者プレビューがインストールできるようになります。会社のパソコンでやる場合は情シスと相談してくださいね。個人マシンでやりました。

<img src="/images/2026/20260624a/スクリーンショット_2026-06-13_21.11.16.png" alt="スクリーンショット_2026-06-13_21.11.16.png" width="487" height="326" loading="lazy">

次にコーディングエージェントをインストールします。今回は[OpenCode](https://opencode.ai)を入れました。インストールの方法はいろいろあるので、公式サイトを参照してください。brewで入れるとXCodeも27 Betaを入れる必要があります。

ローカルを参照させるために、`~/.config/opencode/opencode.json`を作成し、モデル設定を行います。これで`/models`にAppleのモデルが出てくるようになります。

```json ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "apple": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Apple Intelligence",
      "options": {
        "baseURL": "http://localhost:1976/v1",
        "apiKey": "dummy"
      },
      "models": {
        "system": {
          "name": "Apple Local"
        },
        "pcc": {
          "name": "Apple PCC"
        }
      }
    }
  }
}
```

これで実行すれば完璧！？と思ったらエラーが・・・

# リクエストを正規化する

Foundation Modelはモデル呼び出しなどに対応すると書かれていたのですが、実行してみるとエラーレスポンスがログに出ました。小さいリクエストを作ってちょっとしたツール呼び出しを
送信するとエラーが返ってきました。

```json
{"error":{"type":"invalid_request_error","code":"400","message":"Invalid tool definition: The data couldn’t be read because it is missing."}}
```

どうも、リクエスト時のJSONの形式のチェックが厳格に行われるようで、試行錯誤の結果`required`属性が欠けているとエラーになるようです。そのまま実行するのはできなそうなので、JSONリクエストを変換するプロキシサーバーを途中に挟むことにします。まあ、まだベータなので、きっとリリース版までには不要になるでしょう。

<img src="/images/2026/20260624a/スクリーンショット_2026-06-13_21.44.40.png" alt="スクリーンショット_2026-06-13_21.44.40.png" width="607" height="248" loading="lazy">

OpenCodeが返す複雑なリクエストではエラーになりました。これには11個のツール定義が含まれます。1個ずつばらし、OpenAIの[OpenAPI定義](https://raw.githubusercontent.com/openai/openai-openapi/refs/heads/master/openapi.yaml)(紛らわしい)と見比べてリクエストが通るまで修正して仕様化して、という感じのプランをCodexに渡して検証させたところ、以下のような修正が必要ということがわかりました。

* オブジェクトスキーマに properties があるのに required がない場合、すべてのプロパティ名を required に自動追加する。
* オブジェクトスキーマに required があるものの、一部のプロパティが含まれていない場合、すべてのプロパティ名を追加して required を補完する。
* fm serve が受け付けないため、"type": ["string", "null"] のような nullable union は自動生成しない。
* fm serve でクラッシュや拒否が確認されている数値バリデーション用キーワードを削除する：
  * minimum
  * maximum
  * exclusiveMinimum
  * exclusiveMaximum
* オブジェクトスキーマに properties があるのに additionalProperties が指定されていない場合、additionalProperties: false を自動追加する。
* クライアントが明示的に指定した additionalProperties の値はそのまま保持する。
* properties や items の下にあるネストされたオブジェクトスキーマについても同様の正規化処理を行う。
* 配列スキーマで items.type == "object" の場合、上流のアイテムスキーマを type: "string" に書き換え、モデルに「JSONオブジェクトを文字列として出力すること」を説明する description を付与する。
* ストリーミングではないレスポンスの場合、レスポンスをクライアントへ返す前に、
  * 自動生成された null のツール呼び出し引数を削除し、
  * JSON文字列に変換されていた「オブジェクト配列型」の引数を元のオブジェクト配列に復元する。

で、これを実装したのが[fmproxy](https://github.com/shibukawa/fmproxy)です。

こういうの、Appleに報告したいけどどこから報告すればいいんですかね？

# 動作確認

OpenCodeの設定をそのままに実行するために、fmを別ポートで動かし、プロキシを本来のポートで動かします。

```sh
# ターミナル1
$ fm serve --port 1977

# ターミナル2
$ ./fmproxy --upstream http://localhost:1977

# ターミナル3
$ opencode
```

で、実行した結果が以下のものです。バッチリ動きました。まあ動かすので満足したので複雑な実装をさせてみたり・・・はしていませんが。

<img src="/images/2026/20260624a/スクリーンショット_2026-06-13_21.50.32.png" alt="スクリーンショット_2026-06-13_21.50.32.png" width="1200" height="765" loading="lazy">

ただ、いくつか落とし穴がありました。

* `fm serve`はUnixドメインソケットにも対応するので、当初はfmproxyからfmコマンドを起動し、親子ではUnixドメインソケットで通信させるところまで実装していました。ですが、そうするとなぜかpccモデルが使えなかったので、別プロセス起動とした
* systemモデル（完全ローカル）だとコンテキストウインドウが小さすぎるのかエラーとなってしまった。

# まとめ

というころで、動くには動きましたが、完全ローカル（な方のモデル）で実装までいけるか？というのはできませんでした。まあ、コーディングはAIのやるタスクの中でも大量のパラメータを持つ複雑なフラグシップモデルで実施するようなものなので、動いたとしても性能はそこそこでしょう。

とはいえ、ツール呼び出し、構造化出力対応なので、他のシステムから気軽に呼び出せるのは強いです。特別なサブスクも不要でセキュリティは保証されています。ローカルの方なら外部通信も発生しません。OpenAI互換サーバーも（やや気難しいですが）あるので実装もしやすいです。ちょっとした分類タスクとかヒューリスティックな判定処理とか、ちょっとした処理の自動化には十分でしょう。なにより、これがOSインストールからいきなり使える、というのは良いですね。

AppleはAIでは周回遅れ、みたいに言われがちですが、個人的には結構ツボなアップデートでした。将来の発展も楽しみです。
