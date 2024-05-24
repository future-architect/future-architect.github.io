---
title: "【Google Chat API】Incoming Webhook を Go で触ってみる"
date: 2021/09/13 00:00:00
postid: a
tag:
  - Go
  - BOT
  - GoogleWorkspace
  - GoogleChat
category:
  - Programming
thumbnail: /images/20210913a/thumbnail.png
author: 山本雄樹
lede: "こんにちは、Engineer Campにてインターン中の山本です。ブログへの投稿は２本目になります。Google Chat APIに関しての記事となります。業務でGoogle Chat上で通知システムを作成する必要があったのですが、実装するにあたりいくつかのハードルがありました。"
---
# はじめに

こんにちは、[Engineer Camp](https://note.com/future_event/n/n76e7e7d4beef)インターン中の山本です。

ブログへの投稿は２本目になります。１本目は[GoLandについての記事](/articles/20210902b/)を投稿いたしました。

今回はGoogle Chat APIに関しての記事です。

## 背景
業務でGoogle Chat上で通知システムを作成する必要があったのですが、実装するにあたりいくつかのハードルがありました。

- 公式の実装例にGoがないため、すぐに使えない
- GSuiteアカウントがないと試せないからか、参考になる記事が少ない

以上を踏まえて、この記事では以下の事柄について説明していきます。

- Webhookを使用しGoでメッセージを送信する方法
- 投稿を一つのスレッドにまとめる方法
- カード型メッセージの送信方法

<img src="/images/20210913a/スクリーンショット_2021-09-07_17.18.14.png" alt="カード型メッセージ投稿例" width="476" height="598" loading="lazy">

# Google Chat API とは

具体的な説明の前に、[Google Chat API](https://developers.google.com/chat) について軽く説明いたします。

Google Chat API とは、Google Chat で Bot を通じて機能の実装、拡張を支援する API です。

Google Hangoutsとの関連は以下のようになっています。（[Wikipediaより引用](https://ja.wikipedia.org/wiki/Google_%E3%83%8F%E3%83%B3%E3%82%B0%E3%82%A2%E3%82%A6%E3%83%88)）
>2020年4月、ビデオ会議機能を「Google Meet」、チャット機能を「Google Chat」としてそれぞれ分離。残されたテキストメッセージ機能については、2020年後半を目処にGoogle Chatに統合し、ハングアウトは廃止される予定である。

ユースケースとしては、

- データのリソースなどから検索した情報を返す
- ユーザが特定のタスクを実行するのを助ける
- イベントの更新、変更、繰り返しなどの通知を送る

などがあります。

今回はその中から、非同期メッセージの送信機能を持つIncoming Webhookを使用し、Goでメッセージを送信するアプリケーションの実装を行います。


# 1. Google ChatでWebhookの設定をする
それでは始めていきます。

コードを書く前に、Google ChatにてWebhookの設定をする必要があります。

手順は以下のとおりです。

Google Chatを開いて、チャットルームを作成します。スレッド返信を使用する場合はチェックを入れます。
<img src="/images/20210913a/screenshot_setup1.png" alt="チャットルーム作成" width="1200" height="672" loading="lazy" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px;">

左上をクリックして「Webhookを管理」を選びます。

<img src="/images/20210913a/screenshot_setup2.png" alt="Webhook管理画面" width="400" height="648" loading="lazy" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px;">

Webhookの名前とアバターURLを入力し、保存を押します。

<img src="/images/20210913a/screenshot_setup3.png" alt="Webhookの名前とアバターURL入力画面" width="1200" height="659" loading="lazy" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px;">

以上でWebhookの設定は終わりです。この時払い出されるURLは後で使用します。

<img src="/images/20210913a/screenshot_setup4.png" alt="設定完了画面" width="1200" height="469" loading="lazy" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px;">


# 2. Goでメッセージを送る
Webhookの設定は完了したので、次にGoアプリケーションの実装について説明します。
以下はWebhookで簡単なメッセージを送信するGoのプログラムです。

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const webhook = "<任意のWebhookURL>"

func main() {
	payload, err := json.Marshal(struct {
		Text string `json:"text"`
	}{
		Text: "hello from a go script!",
	})
	if err != nil {
		fmt.Println(err)
		return
	}

	resp, err := http.Post(webhook, "application/json; charset=UTF-8", bytes.NewReader(payload))
	if err != nil {
		fmt.Println(err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("HTTP: %v\n", resp.StatusCode)
	}
}
```

プログラムを実行すると、Google Chatにメッセージが送信されます。

<img src="/images/20210913a/screenshot_simple_message.png" alt="screenshot_simple_message" width="1066" height="224" loading="lazy">


# （付録１）投稿を一つのスレッドにまとめる
投稿に対して返信をしない場合など、スレッドをいちいち作成する必要がないケースについては、同一スレッドにメッセージを投稿した方が見た目がスッキリする場合もあります。

Webhook URLにスレッドに関するクエリパラメータを追加することで投稿するスレッドを一つに指定することができます。（[参照](https://developers.google.com/chat/how-tos/bots-develop#thread_key)）

```go
const webhook = "<任意のWebhookURL>&threadKey=<適当な文字列>"
```

以下のように、同じスレッドにメッセージが投稿されるようになります。
<img src="/images/20210913a/screenshot_thread.png" alt="screenshot_thread" width="1056" height="222" loading="lazy">



# （付録２）Card型メッセージ
シンプルなメッセージでは表現しきれない場合の手段としてカード型のメッセージが用意されています。
以下は[公式ドキュメント](https://developers.google.com/chat/reference/message-formats/cards)で紹介されていた表現をほとんど網羅したカード型のメッセージを送信するプログラムです。

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)
const webhook = "<任意のWebhookURL>"

type Cards struct {
	Cards []Card `json:"cards,omitempty"`
}

type Card struct {
	Header   *Header   `json:"header,omitempty"`
	Sections []Section `json:"sections,omitempty"`
}

type Header struct {
	Title      string `json:"title,omitempty"`
	Subtitle   string `json:"subtitle,omitempty"`
	ImageURL   string `json:"imageUrl,omitempty"`
	ImageStyle string `json:"imageStyle,omitempty"`
}

type Section struct {
	Header  string   `json:"header,omitempty"`
	Widgets []Widget `json:"widgets,omitempty"`
}

type Widget struct {
	TextParagraph *TextParagraph `json:"textParagraph,omitempty"`
	KeyValue      *KeyValue      `json:"keyValue,omitempty"`
	Image         *Image         `json:"image,omitempty"`
	Buttons       []Button       `json:"buttons,omitempty"`
}

type TextParagraph struct {
	Text string `json:"text,omitempty"`
}

type KeyValue struct {
	TopLabel         string   `json:"topLabel,omitempty"`
	Content          string   `json:"content,omitempty"`
	Icon             string   `json:"icon,omitempty"`
	ContentMultiLine string   `json:"contentMultiline,omitempty"`
	BottomLabel      string   `json:"bottomLabel,omitempty"`
	OnClick          *OnClick `json:"onClick,omitempty"`
	Button           *Button  `json:"button,omitempty"`
}

type Image struct {
	ImageURL string   `json:"imageUrl,omitempty"`
	OnClick  *OnClick `json:"onClick,omitempty"`
}

type Button struct {
	TextButton  *TextButton  `json:"textButton,omitempty"`
	ImageButton *ImageButton `json:"imageButton,omitempty"`
}

type TextButton struct {
	Text    string   `json:"text,omitempty"`
	OnClick *OnClick `json:"onClick,omitempty"`
}

type ImageButton struct {
	IconURL string   `json:"iconUrl,omitempty"`
	Icon    string   `json:"icon,omitempty"`
	OnClick *OnClick `json:"onClick,omitempty"`
}

type OnClick struct {
	OpenLink *OpenLink `json:"openLink,omitempty"`
}

type OpenLink struct {
	URL string `json:"url,omitempty"`
}

func main() {
	msg := Cards{[]Card{{
		Header: &Header{
			Title:      "Pizza Bot Customer Support",
			Subtitle:   "pizzabot@example.com",
			ImageURL:   "https://goo.gl/aeDtrS",
			ImageStyle: "IMAGE",
		},
		Sections: []Section{
			{
				Widgets: []Widget{
					{
						TextParagraph: &TextParagraph{
							Text: "<b>Roses</b> are <font color=\"#ff0000\">red</font>,<br>" +
								"<i>Violets</i> are <font color=\"#0000ff\">blue</font>",
						},
					},
					{
						KeyValue: &KeyValue{
							TopLabel:         "Order No.",
							Content:          "12345",
							Icon:             "TRAIN",
							ContentMultiLine: "false",
							BottomLabel:      "Delayed",
							OnClick:          &OnClick{OpenLink: &OpenLink{URL: "https://example.com"}},
							Button: &Button{
								TextButton: &TextButton{
									Text:    "VISIT WEBSITE",
									OnClick: &OnClick{OpenLink: &OpenLink{URL: "https://example.com"}},
								},
							},
						},
					},
					{
						Image: &Image{
							ImageURL: "https://picsum.photos/400/200",
							OnClick:  &OnClick{OpenLink: &OpenLink{URL: "https://example.com"}},
						},
					},
				},
			},
			{
				Widgets: []Widget{
					{
						Buttons: []Button{
							{
								ImageButton: &ImageButton{
									IconURL: "https://abs.twimg.com/responsive-web/client-web/icon-ios.b1fc7275.png",
									OnClick: &OnClick{OpenLink: &OpenLink{URL: "https://example.com"}},
								},
							},
							{
								ImageButton: &ImageButton{
									Icon:    "EMAIL",
									OnClick: &OnClick{OpenLink: &OpenLink{URL: "https://example.com"}},
								},
							},
							{
								TextButton: &TextButton{
									Text:    "VISIT WEBSITE",
									OnClick: &OnClick{OpenLink: &OpenLink{URL: "https://example.com"}},
								},
							},
						},
					},
				},
			},
		},
	}}}

	// 以下はシンプルメッセージと同様
	payload, err := json.Marshal(msg)
	if err != nil {
		fmt.Println(err)
		return
	}
	resp, err := http.Post(webhook, "application/json; charset=UTF-8", bytes.NewReader(payload))
	if err != nil {
		fmt.Println(err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("HTTP: %v\n", resp.StatusCode)
	}
}
```

長々とコードが書かれていますが、シンプルなメッセージで紹介したプログラムと行っていることは変わらず、json.MarshalしたときにGoogle Chatが求めている形になるようにGoの構造体に値を詰めて渡しています。

それぞれの要素の関係をわかりやすく図にすると以下のようになります。（厳密には異なります）

Cardの中には一つ以上のSectionが、Sectionの中には一つ以上のWidgetが必要になります。Widgetの中にはTextParagraphやKeyValue、Buttonの配列などの中から一つの要素が入ります。
<img src="/images/20210913a/screenshot_card_message.png" alt="screenshot_card_message" width="1200" height="654" loading="lazy">

出力結果がこちらです。
<img src="/images/20210913a/screenshot_card_message_2.png" alt="screenshot_card_message" width="425" height="455" loading="lazy" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px;">

# 実際に使ってみた感想

今回はIncoming Webhookを使用して一方的な通知メッセージを送信する、といった用途に使用しました。

慣れれば、Webhookの設定 → コード書いてメッセージを投げるまでがスピーディにできるため、簡単な機能を載せたボットを使いたい場合などにはお勧めできると思います。

# 参考
* https://developers.google.com/chat
* https://mikan.github.io/2018/03/15/writing-hangouts-chat-incoming-webhook-with-go/

