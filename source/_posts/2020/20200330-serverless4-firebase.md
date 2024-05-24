---
title: "Serverless連載4: Firebase CrashlyticsでAndroidアプリのエラーログをさくっと収集する"
date: 2020/03/30 09:45:42
postid: ""
tag:
  - サーバーレス
  - GCP
  - Firebase
  - Android
  - モバイルアプリ
category:
  - Programming
thumbnail: /images/20200330/thumbnail.png
author: 佐藤尚至
lede: "こんにちは、Android Developerの佐藤です。モバイルアプリ品質強化の強い味方となってくれるFirebase Crashlyticsを紹介したいと思います！Firebaseとは、AndroidやiOSなどのモバイルアプリのバックエンド機能を提供してくれるサービスです。提供されているサービスは..."
---

# はじめに
こんにちは、Android Developerの佐藤です。

[サーバーレス連載](/articles/20200322/)の4回目を担当します！
モバイルアプリ品質強化の強い味方となってくれるFirebase Crashlyticsを紹介したいと思います！


# そもそもFirebaseとは

Firebaseとは、AndroidやiOSなどのモバイルアプリのバックエンド機能を提供してくれるサービスです。
[提供されているサービス](https://firebase.google.com/products?hl=ja)は、利用状況の解析、クラッシュの検知、認証、通知、ホスティングなど多種多様です。
これらのサービスを利用する上で、サーバーの管理が不要なのはもちろん、導入する上で追加のコーディングはほぼ必要ありません。
`Firebase SDK`をアプリのソースコードに組み込むだけで、Firebaseの機能を利用することができます。

※ Firebaseはモバイルアプリだけでなく、Webアプリにも対応しています。サービスごとに、対応しているプラットフォームが異なる点に注意が必要です。

# Firebase Crashlyticsとは

どんなに気をつけていても、予期せずアプリがクラッシュしてしまうことはあります。
クラッシュしないようなコーディングに努めることも重要ですが、クラッシュがあったという事実をいち早く検知し、その原因を突き止めることも同じくらい重要です。

Firebase Crashlyticsはクラッシュの検知とその原因の究明に役立つサービスです。
Firebase Crashlyticsを導入することで、以下の情報を簡単に知ることができます。

- いつクラッシュしたのか
- ソースコードのどこでクラッシュしたのか
- クラッシュによって影響を受けているユーザーはどれくらいいるのか
- どのバージョンでクラッシュしたのか
- どの機種でクラッシュしたのか

以下では、実際にFirebase Crashlyticsを使って、どのようにクラッシュ情報にアクセスできるようになるのかを見ていきます。

# Firebase Crashlyticsを使ってみる
簡単なサンプルアプリを用いて、

- どのようにしたらクラッシュ情報をFirebaseに送ることができるのか
- Firebaseコンソールでどのようなクラッシュレポートを見ることができるのか

を見ていきましょう。

## サンプルアプリを用意する

Android Studioで`Empty Activity`テンプレートをベースにした新規プロジェクトを作成します。
ボタンを画像のように2つ追加します。


<img src="/images/20200330/1.png" class="img-small-size" loading="lazy">


それぞれのボタンに`OnClickListener`を実装します。実装例は後述しますが、それぞれのボタンをクリックしたときの振る舞いを簡単に説明すると、以下のようになります。

- `FATAL`ボタンをクリックすると`RuntimeException`が発生し、アプリが強制終了します。
- `NON FATAL`ボタンをクリックすると`RuntimeException`が発生しますが、try-catchのエラーハンドリングを実装しているため、アプリが強制終了しません。

意図的に例外が発生する状況を再現しています。

## Firebaseをセットアップする
Firebase公式ページを見ながらFirebaseのセットアップを行います。
https://firebase.google.com/docs/android/setup
(Firebase公式ページには日本語に訳されているページもありますが、英語ページのアップデートに追随していない箇所がいくつかあります。日本語ページを参照する場合は、英語ページも併せてご覧になることをおすすめします。)

Firebaseコンソール画面も親切にナビゲートしてくれるので安心です。

<img src="/images/20200330/2.png" loading="lazy">



## Firebase Crashlyticsをセットアップする
[Firebaseのセットアップ](https://firebase.google.com/docs/android/setup)が完了していれば、`build.gradle`にコードを数カ所追加するだけでCrashlyticsの最小限の設定は完了です。アプリが異常終了したとき、自動的にFirebaseにクラッシュレポートが送信されます。

- Projectの`build.gradle`

```gradle
buildscript {
    repositories {
        google()
        jcenter()
        maven {
            url 'https://maven.fabric.io/public' // 追加
        }
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:3.6.1'
        classpath 'com.google.gms:google-services:4.3.3'
        classpath 'io.fabric.tools:gradle:1.31.2' // 追加
    }
}
```

- Moduleの`build.gradle`

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'
apply plugin: 'io.fabric' // 追加

dependencies {
    // ...
    implementation 'com.google.firebase:firebase-analytics:17.2.3'
    implementation 'com.crashlytics.sdk.android:crashlytics:2.10.1' // 追加
}
```

※ 2020/3/30現在2つのCrashlytics SDKが存在します。"Fabric系譜のCrashlytics SDK"と"Firebase向けに新調されたSDK"です。後者は、2020/3/30現在beta版となっています。今回はGAになっている前者のSDKを使用しています。



## アプリをクラッシュさせてみる
`MainActivity`の実装例はこちらです。`FATAL`ボタン、`NON FATAL`ボタンに`OnClickListener`をセットしています。

```java アプリクラッシュするMainActivity実装例
public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // どのユーザーの端末でクラッシュが発生したのかを知りたい場合、
        // CrashlyticsにUserIDを教えてあげる必要がある。
        Crashlytics.setUserIdentifier("user0001");

        // FATALボタンをクリックしたときの処理
        findViewById(R.id.fatal_button).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // "FATAL"ボタンをクリックするとアプリが強制終了する。
                throw new RuntimeException("Fatal");
            }
        });

        // NON FATALボタンをクリックしたときの処理
        findViewById(R.id.non_fatal_button).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // "NON FATAL"ボタンをクリックするとRuntimeExceptionが発生するが、
                // 例外をcatchしているので、アプリが強制終了することはない。
                try {
                    throw new RuntimeException("Non Fatal");
                } catch (Exception e) {
                    // logException()メソッド送信されたログは「非致命的(non-fatal)」なログとしてレポートされる。
                    Crashlytics.logException(e);
                }
            }
        });
    }
}
```

`Firebase SDK`は、開発者が意図しない強制終了(クラッシュ)が発生したときに、自動でスタックトレースをFirebaseに送信してくれます。上のコードでいうと`FATAL`ボタンをクリックしたときにアプリが強制終了してしまいますが、裏でSDKがクラッシュレポートをFirebaseに送信してくれます。

クラッシュが起きないようにエラーハンドリングはしているけれど、開発者目線で「この例外の発生は検知したい」というような場合がよくあります。そういった場合は、`Crashlytics.logException()`メソッドを利用します。発生した例外を「非致命的(Non-fatal)」な例外としてFirebaseに通知することができます。

## Firebaseコンソールでクラッシュレポートを確認する

### Overview
サイドナビの`品質`から`Crashlytics`を選択するとCrashlyticsの画面が開きます。
こちらの画面からクラッシュ状況の概要がわかります。
`FATAL`ボタンをクリックしたときのレポートは「MainActivity.java - line 23」として通知されています。
`NON FATAL`ボタンをクリックしたときのレポートは「MainActivity.java - line 30」として通知されています。
「評価」項目をみると「クラッシュレポート」なのか「非致命的な例外のレポート」なのかがひと目でわかりますね。


<img src="/images/20200330/3.png" loading="lazy">


### クラッシュレポート
`Fatal`ボタンをクリックすることによって発生したクラッシュレポート(MainActivity.java - line 23)を見てみましょう。

<img src="/images/20200330/4.png" loading="lazy">


以下がひと目でわかりますね。

- いつクラッシュしたのか
- ソースコードのどこでクラッシュしたのか
- クラッシュによって影響を受けているユーザーはどれくらいいるのか
- どのバージョンでクラッシュしたのか
- どの機種でクラッシュしたのか


また「スタックトレース」タブからクラッシュしたときのスタックトレースを見ることができます。
なぜクラッシュしたのかが詳細にわかります。

<img src="/images/20200330/5.png" loading="lazy">


### ユーザーIDでの検索
「ユーザーIDでの検索」も行うことができます。
ユーザーから不具合の問い合わせがあった際に、ソースコードのどの箇所で異常があったがゆえにそのユーザーの端末で不具合が発生したのかを素早く知ることができます。
<img src="/images/20200330/6.png" loading="lazy">

以下のようにSDKにユーザーIDを教えてあげることで、ユーザーIDでの検索が可能になります。

```java ユーザID検索
Crashlytics.setUserIdentifier("user0001");
```


# 最後に

Firebase Crashlyticsは本当にさくっと導入することができます。
ユーザーの端末に埋もれてしまいがちなクラッシュ情報に簡単にアクセスできるのが嬉しいポイントですね。
[クラッシュレポートはカスタマイズ](https://firebase.google.com/docs/crashlytics/customize-crash-reports?platform=android)もできるのですが、`build.gradle`にSDKを追加するだけのシンプルな実装だけでも大変役に立ちます。

ぜひお試しください！

[サーバレス連載](/articles/20200322/)の4本目でした。次は村田さんの[CloudEventsのGo版SDKをいじってみる](/articles/20200331/)です。
