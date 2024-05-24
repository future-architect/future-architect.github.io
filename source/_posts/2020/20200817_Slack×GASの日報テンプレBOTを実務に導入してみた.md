---
title: "Slack×GASの日報テンプレBOTを実務に導入してみた"
date: 2020/08/17 00:00:00
postid: ""
tag:
  - Slack
  - JavaScript
  - BOT
  - GAS
category:
  - Infrastructure
thumbnail: /images/20200817/thumbnail.png
author: 仁木美来
lede: "こんにちは。TIGメディアユニットの仁木です。Slackに投稿するための日報をBOT化・自動化したので自由研究企画に混ぜてもらい記事にすることにしました。毎日共通で書かなければいけないタイトルなどの固定項目やスケジュールの記載を自動化することで、作成時間を短縮し、重要な部分に時間を割けるようになりました"
---

[フューチャー夏休み自由研究連載](/articles/20200726/)11本目の記事です

# はじめに

こんにちは。TIGメディアユニットの仁木です。Slackに投稿するための日報をBOT化・自動化したので自由研究企画に混ぜてもらい記事にすることにしました。毎日共通で書かなければいけないタイトルなどの固定項目やスケジュールの記載を自動化することで、作成時間を短縮し、重要な部分に時間を割けるようになりました。
<img src="/images/20200817/はじめ_アートボード_1.png" loading="lazy">


# 概要

Googleスプレットシート及びGoogleカレンダーの情報を利用して、日報として整形するスクリプトをスプレットシートのスクリプト機能を利用して書いた後、SlackのIncoming WebhookのURLにリクエストを送信します。
<img src="/images/20200817/概要_アートボード_1.png" loading="lazy">

# 準備

今回利用するサービスについて説明します。

## Slackのアプリ　「Incoming Webhook」
SlackのIncoming Webhookというアプリを利用しました。
<img src="/images/20200817/スクリーンショット_2020-08-14_12.43.50.png" loading="lazy">
どのチャンネルやダイレクトメールにBOTを利用するかを決定すると、Webhook URLが発行されるので、このURLに対してPOSTリクエストを送ります。URLが発行されるページに例が詳しく載っているので何かしらの形でPOSTリクエストを送ったことがある人なら簡単に使えると思います！

## Googleスプレットシート

スプシと略して呼んでいたら上司が「スプシって略すのか..」と関心していました。Googleアカウントがあれば誰でも無料で使える表計算シートです。今回はスクリプトエディタ機能でスプレットシートに書いた情報を利用してSlackのWebhookURLへPOSTリクエストを送ります。
<img src="/images/20200817/スクリーンショット_2020-08-14_12.59.15.png" loading="lazy">

## Google Apps Script （GAS）

Googleスプレットシートのスクリプトエディタ機能を利用して、スクリプトを書いていきます。書いたスクリプトはボタンひとつで簡単に実行でき、さらにトリガーで実行時間を指定する機能も備わっており、設定するだけで決まった時間にPOSTリクエストが実行できます。
<img src="/images/20200817/スクリーンショット_2020-08-14_13.59.09.png" loading="lazy">

# スクリプトの作成

今回は特に、固定項目追加・スケジュールの追加について解説します。細かく見ると休日判定もしていますが、シンプルにまとめているページが他にいくつかあったので、今回は省略しています。

## 固定項目の自動追加

まずは、Googleスプレットシートにタイトルなど毎日の日報で固定化されている情報をあらかじめ記載しておき、その情報を使ってテンプレを作成していきます。ここまででも、項目を打ち込むルーティーンをなくすことができ、作成時間を多少減らすことができそうです。作成したスプレットシートとコードを以下に記載します。
<img src="/images/20200817/スクリーンショット_2020-08-14_17.25.02.png" loading="lazy">
スプレットシートの情報をスクリプトで抽出します。（全体のコードは後述）

```js
// スプレットシートを取得
let sheet = SpreadsheetApp.getActiveSheet();
let message = "日報 \n";
// ２行目から順番に行ごとのデータを取得し、messageに追加していく
for(let i = 2; i<= sheet.getLastRow(); i++) {
  let subtitle = sheet.getRange(i, 1).getValue();
  let defmessage = sheet.getRange(i, 2).getValue();
  let option = sheet.getRange(i, 3).getValue();
  // １列目の項目名をmessageに追加
  message += "■"+subtitle+"\n";
  // 2列目にデフォルト値が設定されている場合、messageにデフォルト値を追加
  if(defmessage!==""){
    let msgs = defmessage.split("\n");
    let cnt = 0;
    for(const msg of msgs) {
      if(cnt===0) message += INDENT+msg+"\n";
      else message += SECOND_INDENT+msg+"\n";
      cnt++;
    }
  }
  // 3列目に関数名が設定されている場合、関数を実行
  if(option!=="") {
    if(option===OPTION_GET_TODAY_CAL) message += addTodayCal();
    else message += addTomorrowCal();
  }
}
```

## スケジュールの自動追加
さらに作成時間を減らしたいので、今日明日のスケジュールをカレンダーから抽出して固定項目の中を埋めていきます。以下の関数を利用してスケジュールを取得します。予定のステータスを確認して、自分が主宰の予定及び、参加・未定と回答した予定のみを取得しています。（全体のコードは後述）

```js
// 必要なカレンダーID
// 日本の祝日カレンダーID
const JAP_HOLIDAY_CAL_ID = 'ja.japanese#holiday@group.v.calendar.google.com';
// 自分のカレンダーID
const MY_CAL_ID = 'piyopiyoPPP@example.com';

// 作成した関数
/**
 * 今日の予定(参加・主催・未定のみ表示)
 *
 * @return {string} 予定の文字列
 */
function addTodayCal() {
  let todayCal = CalendarApp.getCalendarById(MY_CAL_ID);
  let today = new Date();
  const events = todayCal.getEventsForDay(today);
  let message = "";
  for(const event of events) {
    // 自分が参加する予定のみを取得する
    if(event.getMyStatus()==="YES" ||event.getMyStatus()==="OWNER" || event.getMyStatus()==="MAYBE") {
      message += INDENT+event.getTitle()+"\n";
    }
  }
  return message;
}

/**
 * 明日の予定(参加・主催・未定のみ表示)
 *
 * @return {string} 予定の文字列
 */
function addTomorrowCal() {
  let tomorrowCal = CalendarApp.getCalendarById(MY_CAL_ID);
  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  const events = tomorrowCal.getEventsForDay(tomorrow);
  let message = "";
  for(const event of events) {
    // 自分が参加する予定のみを取得する
    if(event.getMyStatus()==="YES" ||event.getMyStatus()==="OWNER" || event.getMyStatus()==="MAYBE") {
      message += INDENT+event.getTitle()+"\n";
    }
  }
  return message;
}
```

# BOT化
<img src="/images/20200817/スクリーンショット_2020-08-14_17.42.42.png" loading="lazy">

# コード
全体のコードです。スプレットシートを作った後、ツールからスクリプトエディタを開いてコードをコピーし、【STEP 1】,【STEP 2】を設定すると動くようにしています。気になった方はぜひ動かしてみてください！
<details>
<summary>コードを見る</summary><div>

```js
/**
 * 日報をSlackに送信する
 * 時計マークから、トリガーをセットして使用する
*/

//【STEP 1】 自分のWEBHOOKを設定
const SLACK_WEBHOOK = 'https://piyopiyo';
// 日本の祝日カレンダーID
const JAP_HOLIDAY_CAL_ID = 'ja.japanese#holiday@group.v.calendar.google.com';
//【STEP 2】 自分のカレンダーIDに変更
const MY_CAL_ID = 'piyopiyoPPP@example.com';

const OPTION_GET_TODAY_CAL = 'get_today_cal';
const OPTION_GET_TOMORROW_CAL = 'get_tomorrow_cal';

const INDENT = '    ・';
const SECOND_INDENT = '      ';

/**
 * 日報テンプレをSlackに送信
 */
function createNippo() {
  let today = new Date();
  if(isHoliday(today)) return;

  let url = SLACK_WEBHOOK;
  // スプレットシートを取得
  let sheet = SpreadsheetApp.getActiveSheet();
  let message = "日報 \n";
  // ２行目から順番に行ごとのデータを取得し、messageに追加していく
  for(let i = 2; i<= sheet.getLastRow(); i++) {
    let subtitle = sheet.getRange(i, 1).getValue();
    let defmessage = sheet.getRange(i, 2).getValue();
    let option = sheet.getRange(i, 3).getValue();
    // １列目の項目名をmessageに追加
    message += "■"+subtitle+"\n";
    // 2列目にデフォルト値が設定されている場合、messageにデフォルト値を追加
    if(defmessage!==""){
      let msgs = defmessage.split("\n");
      let cnt = 0;
      for(const msg of msgs) {
        if(cnt===0) message += INDENT+msg+"\n";
        else message += SECOND_INDENT+msg+"\n";
        cnt++;
      }
    }
    // 3列目に関数名が設定されている場合、関数を実行
    if(option!=="") {
      if(option===OPTION_GET_TODAY_CAL) message += addTodayCal();
      else message += addTomorrowCal();
    }
  }

  //logを出したい時に利用
  Logger.log(message);
  let options = createOptions(today, message);
  UrlFetchApp.fetch(url,options);
}

/**
 * 土日祝日判定
 *
 * @param {date} 日付オブジェクト
 * @return {bool} 休日かどうか
 */
function isHoliday(date) {
  // 土日
  if(date.getDay()===0 || date.getDay()===6) return true;

  // 祝日
  let holidayCal = CalendarApp.getCalendarById(JAP_HOLIDAY_CAL_ID);
  return (holidayCal.getEventsForDay(date).length>0);
}

/**
 * Slackへ送るペイロード作成
 *
 * @param {date} 日付オブジェクト
 * @param {string} Slackに送る本文
 * @return {bool} 休日かどうか
 */
function createOptions(date, message) {
  const date_format = 'yyyy/MM/dd'
  let fdate = Utilities.formatDate(date, 'Asia/Tokyo', date_format);
  let json_data ={"username":"日報"+fdate,
    "text": message,
    "icon_emoji": ":slack:"}

  let payload = JSON.stringify(json_data);
  let options = {
    "method": "post",
    "contentType": "application/json",
    "payload" : payload
  };
  return options;
}

/**
 * 今日の予定(参加・主催・未定のみ表示)
 *
 * @return {string} 予定の文字列
 */
function addTodayCal() {
  let todayCal = CalendarApp.getCalendarById(MY_CAL_ID);
  let today = new Date();
  const events = todayCal.getEventsForDay(today);
  let message = "";
  for(const event of events) {
    // 自分が参加する予定のみを取得する
    if(event.getMyStatus()==="YES" ||event.getMyStatus()==="OWNER" || event.getMyStatus()==="MAYBE") {
      message += INDENT+event.getTitle()+"\n";
    }
  }
  return message;
}

/**
 * 明日の予定(参加・主催・未定のみ表示)
 *
 * @return {string} 予定の文字列
 */
function addTomorrowCal() {
  let tomorrowCal = CalendarApp.getCalendarById(MY_CAL_ID);
  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  const events = tomorrowCal.getEventsForDay(tomorrow);
  let message = "";
  for(const event of events) {
    // 自分が参加する予定のみを取得する
    if(event.getMyStatus()==="YES" ||event.getMyStatus()==="OWNER" || event.getMyStatus()==="MAYBE") {
      message += INDENT+event.getTitle()+"\n";
    }
  }
  return message;
}
```
</div></details>

# まとめ

Slack×GASを利用した日報テンプレートBOTを作成しました。日々のタスクの自動化・整理の参考になれば嬉しいです。

余談ですが、Slackは投稿するときにアイコンがスタンプから選べるのが可愛いです。Google ChatのBOTを作った時は、アイコン画像のurlを作るのに苦労したので気軽に可愛いアイコンが付けられるのはそれだけでテンションが上がりました！
