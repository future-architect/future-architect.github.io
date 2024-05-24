---
title: "「Go on DockerスタイルでのバックエンドAPI構築」というテーマでGo Conference’20 in Autumn SENDAIに登壇しました"
date: 2020/10/10 00:00:00
postid: ""
tag:
  - Go
  - GoConference
  - Docker
  - 登壇レポート
  - カンファレンス
category:
  - Programming
thumbnail: /images/20201010/thumbnail.png
author: 伊藤真彦
lede: "TIGの伊藤真彦です先日[Go Conference’20 in Autumn SENDAI]に登壇させていただきました、リモート登壇の為残念ながら現地には行きませんでした。発表資料はこちらです。"
---
TIGの伊藤真彦です

先日[Go Conference’20 in Autumn SENDAI](https://sendai.gocon.jp/)に登壇させていただきました、リモート登壇の為残念ながら現地には行きませんでした。

<img src="/images/20201010/image.png" loading="lazy">

発表資料はこちらです。

<iframe src="https://docs.google.com/presentation/d/e/2PACX-1vR3m62c-Q6szPVIml4qpn-t79ZW-NNw90LuhseLrRgYEBKyCo4JkCNALodajt9kJPEtX4Tk8XP2R5RI/embed?start=false&loop=false&delayms=10000" frameborder="0" width="100%" height="569px" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>

[Youtubeのアーカイブ](https://www.youtube.com/watch?v=rHontd51R3A)としても確認いただけます

## 補足

発表で紹介したコードを詳しく確認できるようにまとめます。

### goqueryについて
<img src="/images/20201010/image_2.png" loading="lazy">

goqueryはjqueryを意識した命名から想像できる通り、Find等のメソッドチェーンを繋いで直感的にスクレイピングを行う事ができます。

ページURLを与えて読み取るだけでなく、別途htmlや文字列からスクレイピングを行う事も可能です。

```go main.go
func scrapeYahoo(url string) string {
  items := []Item{}
  doc, err := goquery.NewDocument(url)
  if err != nil {
    return("")
  }
  selection := doc.Find("ul.Products__items").Find("li.Product")
  selection.Each(func(index int, s *goquery.Selection) {
    url := s.Find("div.Product__image").Find("a").AttrOr("href", "")
    name := s.Find("h3.Product__title").Text()
    price := s.Find("span.Product__priceValue").First().Text()
    image := s.Find("div.Product__image").Find("img").AttrOr("src", "")
    item := Item{ Url: url, Name: name, Price: price, Image: image }
    items = append(items, item)
  })
  json, _ := json.Marshal(items)
  return string(json)
}
```

### agoutiについて
<img src="/images/20201010/image_3.png" loading="lazy">

agoutiはスクレイピングを行うための補助として用いましたが、--headlessオプションを使わなければ普段お使いのウェブブラウザが自動で動く様を実際に目で確認できます。

ブラウザでのルーチンワークの自動化など夢が広がりますね。

```go main.go
func scrapeReverb(url string) string {
  items := []Item{}
  driver := agouti.ChromeDriver(
    agouti.ChromeOptions("args", []string{
        "--headless",
        "--window-size=30,120",
        "--disable-gpu",                        // ref: https://developers.google.com/web/updates/2017/04/headless-chrome#cli
        "no-sandbox",                           // ref: https://github.com/theintern/intern/issues/878
        "disable-dev-shm-usage",                // ref: https://qiita.com/yoshi10321/items/8b7e6ed2c2c15c3344c6
    }),
  )

  driver.Start()
  defer driver.Stop()
  page, _ := driver.NewPage(agouti.Browser("chrome"))
  page.Navigate(url)
  // 描画の完了を待機
  time.Sleep(7 * time.Second)
  content, _ := page.HTML()
  reader := strings.NewReader(content)
  doc, _ := goquery.NewDocumentFromReader(reader)
  selection := doc.Find("ul.tiles.tiles--four-wide-max").Find("li.tiles__tile")
  selection.Each(func(index int, s *goquery.Selection) {
    url := s.Find("a").AttrOr("href", "")
    name := s.Find("h4.grid-card__title, h3.csp-square-card__title").Text()
    price := s.Find("span.price-display, div.csp-square-card__details__price").Text()
    image := s.Find("img").AttrOr("src", "")
    item := Item{ Url: url, Name: name, Price: price, Image: image }
    if name != "" {
      items = append(items, item)
    }
  })
  json, _ := json.Marshal(items)
  return string(json)
}
```

### Dockerファイルについて
一人で作ったのと趣味なので動けばよしの精神があり、スライドでも書いた通り更に攻める余地があると認識しています。
マルチステージビルドの活用などのノウハウ共有が好意的な感想を頂けたので一安心です。

```Dockerfile
FROM golang:1.12-alpine as builder
WORKDIR ./
RUN apk add --no-cache git
ENV GOBIN=/go/bin
ENV GO111MODULE=on
ENV GOPATH=
COPY ./go.mod ./go.sum ./main.go ./
RUN go mod download
RUN env GOOS=linux GOARCH=amd64 GIN_MODE=release go build -o /go-api

FROM node:12.7.0-alpine
WORKDIR /myapp
COPY --from=builder /go-api .
# install chromedriver
RUN apk add --update \
    wget \
    udev \
    ttf-freefont \
    chromium \
    chromium-chromedriver \
```

## 最後に

株式会社Fusic清家史郎様、株式会社Gunosy平田智子様にもフューチャー技術ブログの存在について触れて頂けました。

我らが渋川さん及び社員一同大喜びでした、ありがとうございます。

<img src="/images/20201010/image_4.png" class="img-middle-size" loading="lazy">
