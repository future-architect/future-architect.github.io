---
title: "Firebaseで取得したログをBigQueryに連携してユーザー操作をトラッキングする"
date: 2021/03/16 00:00:00
postid: ""
tag:
  - GoogleCloud
  - Firebase
  - BigQuery
  - Android
category:
  - Mobile
thumbnail: /images/2021/20210316/thumbnail.png
author: 松井宇宙
lede: "[CP連載2021も折り返しの6本目です！陽光麗らかなある春の日、ITコンサルタントのあなたの元に、ユーザーからの問い合わせが入りました。「すみません、モバイルアプリの調子が悪いので確認してもらえませんか。」"
---

# はじめに

[GCP連載2021](/articles/20210307/)も折り返しの6本目です！

陽光麗らかなある春の日、ITコンサルタントのあなたの元に、ユーザーからの問い合わせが入りました。

「すみません、モバイルアプリの調子が悪いので確認してもらえませんか」
「承知しました。起きている問題と、何時頃どのような操作をされたか教えていただけますか」
「問題は~~で、いつもと同じ操作をしていたのですが...」
「なるほど...」

こんな時、特定ユーザーのアプリ操作をトラッキングできれば...と思うかもしれません。

今回は、そんな悩みをFirebaseとBigQueryの合わせ技で解決していきます。

# Firebaseとは

**mBaaS (mobile Backend as a Service)** を提供するGCPサービスのひとつです。
より一般的なBaaSのモバイルアプリ向けのイメージで、開発者はログ送信やDBアクセスなどのインフラ設定を気にする必要なく、アプリのコアな機能の開発に専念できます。

一口にFirebaseと言っても様々な機能の集合体で構成されており、NoSQL DBを提供するCloud Firestore、クライアントアプリへのメッセージ送信機能であるFirebase Cloud Messagingなどプロダクトの数は18に及んでいます(2021.03.12現在)。
本ブログでもFirebaseのサービスの1つであるCrashlyticsを紹介していました。

* [Serverless連載4: Firebase CrashlyticsでAndroidアプリのエラーログをさくっと収集する](/articles/20200330/)

各機能はFirebase Consoleを介してGUIで閲覧、操作することが可能です。
今回はその中の`Google Analytics for Firebase`を用いてAndroidアプリの操作ログを取得していきます。

# Google Analytics for Firebaseとは

<img src="/images/2021/20210316/image.png" loading="lazy">

実態はGoogleのサービス`Google Analytics` (GA)をFirebaseで利用できるようにしたものです。
[公式ドキュメント](https://firebase.google.com/docs/analytics/get-started?hl=ja&platform=android)では以下のように紹介されています。

> Google アナリティクスは、ウェブ、iOS アプリ、Android アプリがどのように使用されているかを把握するのに役立ちます。
この SDK は主に次の 2 種類の情報を記録します。

* イベント: ユーザーの操作、システム イベント、エラーなど、アプリで起こっていること。
* ユーザー プロパティ: 言語や地域など、ユーザー層を示す属性。自由に定義できます。

任意の情報をカスタム設定して取得できますが、**一部の値は特にコードの記述なく[自動的に収集されます。](https://support.google.com/firebase/answer/9234069)**
位置情報やアプリを使用しているデバイス情報などサクッと取れるのは非常に便利です。

取得した情報はログとしてFirebase Console上で閲覧できます。
その際、ユーザー操作のトラッキングの観点で以下の課題が生じます。

* 取得したログが**サマリーされて**表示されてしまう。
* 時系列のトラッキング機能も過去**1時間分ほどしかない、かつ抜粋された状態**で表示される。

これらが課題となるのは、今回がメジャーな利用方法からややずれる使い方のためかもしれません。
王道のマーケティング利用する場合はおそらくFirebase Consoleで抜群の使いやすさを発揮してくれるのだと思います。
サマリー前の全てのログはFirebaseが持っているため、今回はそのデータをBigQueryへ連携させて、**抜け漏れなくログを追いかける**ことを目指します。

BigQueryの他にも、Crashlytics, FCM, Firebase Remote ConfigなどとGAを連携させることができます。
ちなみに、BigQueryへのデータ連携は昨年のGCP連載でも話題になっていましたね。

* [GCP連載#4 Cloud Life Sciencesを見てみた](/articles/20200210/)
* [GCP連載#7 GCPのData Transfer Serviceを使って簡単にS3からBigQueryにデータ転送をしてみる](/articles/20200214/)

# 試してみる

以下の手順を踏んで実際に手を動かしながら、Androidアプリにおけるユーザー操作のトラッキングを実現していきます。

1. Firebaseでログを取得する
2. BigQueryへログを連携する
3. BigQueryでクエリを実行する

※そもそもの、アプリへのFirebaseの追加は[公式ドキュメント](https://firebase.google.com/docs/android/setup?hl=en)を参照いただければと思います。

## 1. Firebaseでログを取得する

Androidアプリのソースに必要なコードを追記していきます。
まず、`Activity` ごとの下準備は以下の2点です。

* `FirebaseAnalytics`のオブジェクトを宣言
* `onCreate`メソッド内で初期化

```java test_activity.java
//...(省略)...

import com.google.firebase.analytics.FirebaseAnalytics;  // 1. まずFirebaseAnalyticsクラスをimport

//...(省略)...

private FirebaseAnalytics mFirebaseAnalytics;   // 1. FirebaseAnalyticsのオブジェクトを宣言

//...(省略)...

@Override
    public void onCreate(Bundle savedInstanceState) {
        //...(省略)...

        mFirebaseAnalytics = FirebaseAnalytics.getInstance(this);  // 2. onCreateメソッド内で初期化
    }
```

ここまでで、Firebaseが自動的に収集するログはすでに取得できるようになっています。
続いて、以下の記述を入れることで、ソースコード上の任意の位置でのログを取得できるようになります。

```java test_activity.java
// ログを取得したい任意の箇所で
Bundle bundle = new Bundle();
bundle.putString(param1, value1);
bundle.putString(param2, value2);
mFirebaseAnalytics.logEvent(event_name, bundle);
```

`bundle` で送りたいログの型を作り、Firebaseの`logEvent`メソッドでログを送信しています。
Firebaseで扱うログはオブジェクト形式をしており、上記ログを送信すると以下のようなイメージのJSONが送られます。

```json 送信されるログのイメージ
{
  "event_name": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

※実際にはデフォルトのパラメータも含まれるため、paramの数はもっと多いです。またevent_nameと並列で、timestampなど諸々の値もデフォルトで送信されます。

paramやevent_nameは任意に指定することもできますし、Firebaseが用意している定数クラスを用いることもできます。

* [Paramの一覧](https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics.Param?hl=ja)
* [Eventの一覧](https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics.Event?hl=ja)

また、bundleに対しても `putXxx`のメソッドを利用することで、String型以外にも様々な型のvalueを指定可能です。
非常に自由度高くログの送信ができるとわかりましたが、**使用できるeventの数や値の長さには[上限がある](https://support.google.com/firebase/answer/9237506?hl=en)**ため、注意が必要です。

ここまでで、アプリのログはFirebase Console上で閲覧できるようになっています。
サマリー情報で十分な場合はこれで十分強さを発揮するでしょう。。
今回のようにFirebaseログの生データにアクセスしたい場合はさらにBigQueryとの連携を進めます。

以下は、Firebase Consoleの一例です。使用状況をグラフ化して確認できたり(上)、event_nameごとの発生回数がサマリ表示されていたりします(下)。
<img src="/images/2021/20210316/image_2.png" loading="lazy">
<img src="/images/2021/20210316/image_3.png" loading="lazy">

## 2. BigQueryへログを連携する

[こちらのドキュメント](https://support.google.com/firebase/answer/6318765?hl=en)を参照しつつ、設定します。
全てFirebase Consoleからの操作で可能です。

Firebase Consoleの設定画面から、`Integrations`タブを選択します。
そこで表示される、各種連携可能なカードから、`BigQuery`を選択します。
※参考画像ではすでに連携済みのため「Manage」となっていますが、初回設定の場合は「Link」と表示されます。
<img src="/images/2021/20210316/image_4.png" loading="lazy">

Linkが開始されると、「どのサービスのデータをBigQueryに連携するか」を選択できるようになります。
今回は`Google Analytics`にチェックを入れます。
他にも、CrashlyticsやCloud Messagingなどのデータも連携できるようです。
<img src="/images/2021/20210316/image_5.png" loading="lazy">

ここまでの設定で、BigQueryへFirebaseのデータが連携されます。
GCP Consoleから確認してみると、プロジェクトフォルダの配下に、`analytics_XXXX`というフォルダ名でFirebaseからのデータが連携されています。(XXXXはGAのProperty ID です)
当日のデータは`events_intraday_YYYYMMDD`というテーブル名称で格納されています。翌日になると `events_YYYYMMDD`の名称に変化します。
<img src="/images/2021/20210316/image_6.png" loading="lazy">

「プレビュー」タブを参照すると、1つの`event_name`に紐付く`params`のkey/valueペアの形でデータが格納されていることが確認できます。
ただしこのままではFirebaseデフォルトのログと入り混じって見にくい、かつ複数のユーザーのログが混じっている、のでクエリを作成して可読性を上げます。

## 3. BigQueryでクエリを実行する

可読性を向上させてトラッキングを実現するため、クエリを作成します。

純粋なRDBではないBigQueryでは、ネストされたparamsをそのままWHERE句に指定できません。

そこで、`UNNEST`でネスト構造を解除してWHERE句でフィルタリングしたのちに`ARRAY`で再びネスト構造に戻す、という手順を踏んでいます。この処理は全てSELECT句の中で実施しています。
今回は、ネストされた`event_params.key`と`event_params.value`、`user_properties`に対して、不要なパラメータを除外しています。

また、WHERE句にトラッキングしたいユーザーIDを設定して、特定ユーザーの操作のみ出力させます。
`event_name: user_engagement` はFirebaseデフォルトのevent_nameで、今回は不要のため除外しています。

以下に作成したクエリを記載しています。
※洗練されたクエリではないですが、ユーザー操作のトラッキングが目的のため、ご容赦いただきたいです。

```sql 実行するクエリ
WITH tracking_operation AS (
      SELECT
            event_timestamp,
            FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', TIMESTAMP_SECONDS(cast(floor(event_timestamp/1000000) as int64)), 'Asia/Tokyo') as event_date,
            event_name,
            ARRAY(
                  SELECT
                        ep.key as key
                  FROM
                        UNNEST(event_params) as ep
                  WHERE
                        ep.key not in ('ga_session_id', 'ga_session_number', 'timestamp', 'firebase_event_origin', 'session_engaged','engaged_session_event', 'firebase_screen_id', 'firebase_previous_id', 'entrances', 'engaged_session_event', 'engagement_time_msec')
            ) as event_params_key,
            ARRAY(
                  SELECT
                        ep.value.string_value as value
                  FROM
                        UNNEST(event_params) as ep
                  WHERE
                        ep.key not in ('ga_session_id', 'ga_session_number', 'timestamp', 'firebase_event_origin', 'session_engaged','engaged_session_event', 'firebase_screen_id', 'firebase_previous_id', 'entrances', 'engaged_session_event', 'engagement_time_msec') and ep.value.string_value is not null
            ) as event_params_value,
            (
                  SELECT
                        up.value.string_value as user_id
                  FROM
                        UNNEST(user_properties) as up
                  WHERE up.key = 'user_id'
            ) as user_id,
            device.mobile_os_hardware_model as mobile_os_hardware_model,
            device.operating_system as operating_system,
            device.operating_system_version as operating_system_version,
            geo.country as country,
            geo.region as region,
            geo.city as city,
            app_info.version as app_version
      FROM
            `analytics_XXXX.events_202004*`
)
SELECT
      *
FROM
      tracking_operation
WHERE
      event_name != 'user_engagement' and user_id = 'トラッキングしたいユーザーIDを入力'
ORDER BY
      event_timestamp

```

このクエリを実行すると、特定のuser_idをもつユーザーの2020年4月の操作ログを時系列で確認できます．

その結果が以下の写真です。不要なeventやparamsを除外したので、可読性もだいぶ向上しました。WHERE句にevent_timestampの条件を加えることで、さらに細かく時刻で絞り込むことも可能です。

ちなみに、`screen_view`は自動的に取得されるevent_nameで、その他は1.の手順でカスタムで設定しています。

この`screen_view`は自動で遷移前後の画面名を取得してくれるので、非常に便利です。

端末の戻るボタンが押されて遷移した場合も検知してくれます。
<img src="/images/2021/20210316/image_7.png" loading="lazy">

# おわりに

FirebaseとBigQueryの合わせ技で、モバイルアプリのユーザー操作のトラッキングを実現しました。
これで障害やユーザー問い合わせにも安心して対応できます。
もちろん、トラッキング対象を別のパラメータ(例えば特定の商品データなど)に変えて応用もできるかと思います。

最終的に[DataStudio](https://datastudio.google.com/overview)など連携させればGUIで綺麗に表示させることができそうです。
複数のサービスを組み合わせれば痒いところにも手が届く、それがGCPの魅力のひとつかもしれません。

明日はTechBlogの編集もされている伊藤さんの[Google Cloud BuildpacksとCloud Runで簡単コンテナアプリ開発](/articles/20210317/)です。
