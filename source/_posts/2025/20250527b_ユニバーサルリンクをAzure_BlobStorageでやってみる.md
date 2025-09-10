---
title: "iOS ユニバーサルリンクをAzure BlobStorageでやってみる"
date: 2025/05/27 00:00:01
postid: b
tag:
  - .NET
  - iOS
  - FutureOne
category:
  - Mobile
thumbnail: /images/2025/20250527b/thumbnail.png
author: 高山博司
lede: ".NET MAUIでiOS向けアプリを開発中、WebアプリからiOSアプリを呼び出す必要がでてきたため、ユニバーサルリンクを実装しました。WebサーバーはAzure Blob Storageの静的サイトを利用します。"
---

::: note warn
この記事はグループ会社であるFutureOneの Qiita Organizationで公開された [記事](https://qiita.com/onigiripudding/items/9ee95b84335ea9794a0b) をクロスポストで公開しています。
:::


# はじめに

.NET MAUIでiOS向けアプリを開発中、WebアプリからiOSアプリを呼び出す必要がでてきたため、ユニバーサルリンクを実装しました。WebサーバーはAzure Blob Storageの静的サイトを利用します。

# ユニバーサルリンクとは

ユニバーサルリンク（Universal Links）は、Webサイトへのリンクをクリックしたときに、そのリンクに対応するiOSアプリがインストールされていれば直接アプリを起動し、インストールされていなければWebサイトを表示するという機能です。

- 参考: [Allowing apps and websites to link to your content](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content/)

## 仕組み

1. WebサーバーにApple App Site Association （以下: AASA）ファイルを置いておきます
2. Apple CDNが定期的にWebサーバーのAASAファイルをクロールします
3. iPhoneが、アプリインストール時にAppleCDNからAASAファイルを取得します
4. Webサイト上で特定のURLを踏むとAASAファイルを使ってアプリを立ち上げる

簡単に図示すると以下のような感じになります。

<img src="/images/2025/20250527b/mermaid-diagram-2025-05-27-102746.png" width="800" height="644">

# WebサーバーにAzure Blob Storageを利用する

上記の通り、AppleCDNがアクセスできるWebサーバを準備し、UniversalLink用のAASAファイルを配備する必要があります。

そこで、安価に静的サイトを公開できるAzure BlobStorageの静的サイト機能を使いたいと思います。

- 参考: [Azure Storage での静的 Web サイト ホスティング](https://learn.microsoft.com/ja-jp/azure/storage/blobs/storage-blob-static-website?WT.mc_id=AZ-MVP-5002499)

# Azure Storage構築

## ストレージアカウントの作成

まずはストレージアカウントを作成します。

ストレージアカウントは基本的にデフォルトで大丈夫だと思いますが、必要に応じて値を変更します。基本情報のプライマリサービスは 「Azure Blob Storage または Azure Data Lake Storage Gen 2」 とします。

<img src="/images/2025/20250527b/image.png" alt="image.png" width="1200" height="647" loading="lazy">

作ったものがこちらです。アカウントの種類が `StorageV2 (汎用 v2)`  であることを確認します（上位のものでも大丈夫です）。

<img src="/images/2025/20250527b/image_2.png" alt="image.png" width="1200" height="279" loading="lazy">

## 静的サイトを有効化

概要の下の方の機能タブから静的Webサイトを選択します。

<img src="/images/2025/20250527b/image_3.png" alt="image.png" width="1200" height="456" loading="lazy">

ここで有効化します。プライマリエンドポイントが今回のUniversalLinkのドメインになります。`myapp-universal-link-sample.z11.web.core.windows.net` のような感じになると思います。

<img src="/images/2025/20250527b/image_4.png" alt="image.png" width="1200" height="420" loading="lazy">

※ カスタムドメインを使用することも可能ですが、今回はスキップします。

静的サイトを有効化すると、`$Web` フォルダができます。

<img src="/images/2025/20250527b/image_5.png" alt="image.png" width="1200" height="454" loading="lazy">

## AASAファイルを配置

AASAファイルを準備します。

- 参考: [Supporting associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)

内容は JSON ですが、ファイルに拡張子はつけないで保存します。ファイル名は `apple-app-site-association`  です。

今回はリンクURLによる制限はつけずにどんなURLでも呼び出し可能とします。

```json apple-app-site-association
{
  "webcredentials": {
    "apps": [
      "アプリのID"
    ]
  },
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": [
          "アプリのID"
        ],
        "components": [
          {
            "/": "*"
          }
        ]
      }
    ]
  }
}
```

`$Web` コンテナを開いてアップロードします。

右下のアップロード先のフォルダは `.well-known` にします。フォルダが存在しない場合でも、自動的に作成してくれます。

<img src="/images/2025/20250527b/image_6.png" alt="image.png" width="1200" height="509" loading="lazy">

アップロードしたファイルを確認します。

階層が `$Web/.well-known/apple-app-site-association` となっていればOKです。

<img src="/images/2025/20250527b/image_7.png" alt="image.png" width="1200" height="251" loading="lazy">

最後に `ContentType` を指定します。

ファイルをクリックするとプロパティが開くので編集します。`application/json; charset=utf-8` にします。`application/json` は必須だと思います。 charset=utf-8はなくても大丈夫ですが、念の為に指定します。

<img src="/images/2025/20250527b/image_8.png" alt="image.png" width="1200" height="606" loading="lazy">

## $WebをPublic化

Apple CDNがアップロードしたAASAファイルを取得できるようにします。 コンテナを選択してアクセスレベルを変更します。 デフォルトだとプライベートになっていると思うので、コンテナしておきます。

<img src="/images/2025/20250527b/image_9.png" alt="image.png" width="1200" height="194" loading="lazy">

AASAファイルを確認します。

先程のプライマリエンドポイントに `.well-known/apple-app-site-association` つけてURLバーに入れて（例: `https://myapp-universal-link-sample/.well-known/apple-app-site-association`）、AASAファイルが見えることを確認します。

<img src="/images/2025/20250527b/image_10.png" alt="image.png" width="1200" height="415" loading="lazy">

## Apple CDNを確認

アップロード後、しばらくするとAASAファイルをApple CDNが回収してくれます。

そのキャッシュは `https://app-site-association.cdn-apple.com/a/v1/myapp-universal-link-sample.z11.web.core.windows.net` で確認できます。

<img src="/images/2025/20250527b/image_11.png" alt="image.png" width="731" height="569" loading="lazy">

以上で環境構築は完了です。

# Mauiアプリの設定

MauiプロジェクトのPlatformフォルダのIOSフォルダ直下に `Entitlements.plist` を作成します。内容は以下の通りです。

先程のプライマリエンドポイントのを記載します。「https://」は不要です。

```xml Entitlements.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
      <string>applinks:myapp-universal-link-sample.z11.web.core.windows.net</string>
    </array>
  </dict>
</plist>
```

`Entitlements.plist` を作りたくない人はcsprjで設定することもできます。

以下は、[Apple universal links](https://learn.microsoft.com/ja-jp/dotnet/maui/macios/universal-links?view=net-maui-9.0)より引用したコードです。

```xml
<ItemGroup Condition="$([MSBuild]::GetTargetPlatformIdentifier('$(TargetFramework)')) == 'ios' Or $([MSBuild]::GetTargetPlatformIdentifier('$(TargetFramework)')) == 'maccatalyst'">

    <!-- For debugging, use '?mode=developer' for debug to bypass apple's CDN cache -->
    <CustomEntitlements
        Condition="$(Configuration) == 'Debug'"
        Include="com.apple.developer.associated-domains"
        Type="StringArray"
        Value="applinks:myapp-universal-link-sample.z11.web.core.windows.net?mode=developer" />

    <!-- Non-debugging, use normal applinks:url value -->
    <CustomEntitlements
        Condition="$(Configuration) != 'Debug'"
        Include="com.apple.developer.associated-domains"
        Type="StringArray"
        Value="applinks:myapp-universal-link-sample.z11.web.core.windows.net" />

</ItemGroup>
```

※ `?mode=developer` をつけておくとApple CDNをバイパスして、直接WebサーバからAASAファイルを取得するようになります。

次に、UniversalLinkで起動されたときのハンドラーを書きます。

[Apple universal links - .NET MAUI | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/maui/macios/universal-links?view=net-maui-9.0) を参考に`MauiProgram.cs` を編集し、ユニバーサルリンク経由でアプリが起動・再開された際にURLを処理するためのライフサイクルイベントを登録します。

```cs MauiProgram.cs
using Microsoft.Maui.LifecycleEvents;
using Microsoft.Extensions.Logging;

namespace MyNamespace;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            })
            .ConfigureLifecycleEvents(lifecycle =>
            {
#if IOS || MACCATALYST
                lifecycle.AddiOS(ios =>
                {
                    // Universal link delivered to FinishedLaunching after app launch.
                    ios.FinishedLaunching((app, data) => HandleAppLink(app.UserActivity));

                    // Universal link delivered to ContinueUserActivity when the app is running or suspended.
                    ios.ContinueUserActivity((app, userActivity, handler) => HandleAppLink(userActivity));

                    // Only required if using Scenes for multi-window support.
                    if (OperatingSystem.IsIOSVersionAtLeast(13) || OperatingSystem.IsMacCatalystVersionAtLeast(13))
                    {
                        // Universal link delivered to SceneWillConnect after app launch
                        ios.SceneWillConnect((scene, sceneSession, sceneConnectionOptions)
                            => HandleAppLink(sceneConnectionOptions.UserActivities.ToArray()
                                .FirstOrDefault(a => a.ActivityType == Foundation.NSUserActivityType.BrowsingWeb)));

                        // Universal link delivered to SceneContinueUserActivity when the app is running or suspended
                        ios.SceneContinueUserActivity((scene, userActivity) => HandleAppLink(userActivity));
                    }
                });
#endif
            });

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }

#if IOS || MACCATALYST
    static bool HandleAppLink(Foundation.NSUserActivity? userActivity)
    {
        if (userActivity is not null && userActivity.ActivityType == Foundation.NSUserActivityType.BrowsingWeb && userActivity.WebPageUrl is not null)
        {
            HandleAppLink(userActivity.WebPageUrl.ToString());
            return true;
        }
        return false;
    }
#endif

    static void HandleAppLink(string url)
    {
        if (Uri.TryCreate(url, UriKind.RelativeOrAbsolute, out var uri))
            App.Current?.SendOnAppLinkRequestReceived(uri);
    }
}
```

Appクラスの `OnAppLinkRequestReceived` を呼んでくれるのでOverrideすることで受け取ったURLのハンドルができます。
クエリパラメータもらうときなどはここで処理するとよいと思います。

```cs
protected override void OnAppLinkRequestReceived(Uri uri)
{
   //uriの処理が必要であれば
}
```

Mauiアプリの修正は以上です。

# Apple DeveloperアカウントのアプリIDに、関連ドメインの使用を許可

UniversalLinkを使うにはApple上のアプリに使用を許可する必要があります。

手順は以下の通りです（参考: [Apple universal links](https://learn.microsoft.com/ja-jp/dotnet/maui/macios/universal-links?view=net-maui-9.0])）。

1. Web ブラウザで[Apple Developer アカウント](https://developer.apple.com/account/)にログインし、 「証明書、ID、およびプロファイル」ページに移動します
2. 「証明書、識別子、プロファイル」ページで、「識別子」タブを選択します
3. 「識別子」ページで、アプリに対応するアプリ ID を選択します
4. 「App ID 構成の編集」ページで、「関連ドメイン」機能を有効にし、「保存」ボタンを選択します
   <img src="/images/2025/20250527b/image_12.png" alt="image.png" width="934" height="735" loading="lazy">
5. profileに反映させます。Editから先程設定したApp IDを選択します
   Enabled CapacitiesにAssociated DomainがあればOKです
   <img src="/images/2025/20250527b/image_13.png" alt="image.png" width="941" height="473" loading="lazy">
6. 最後にVisual Studioのプロファイルを更新します

# アプリをリリースする

あとはアプリをリリースするだけです。デバッグでも大丈夫です。

今回の場合のユニバーサルリンクのURLはブロブストレージのプライマリエンドポイント（例: `https://myapp-universal-link-sample.z11.web.core.windows.net/`）になります。これをWebサイトに埋め込んでおきます。

アプリがインストールされている状態であれば、iPhoneのメモ帳でも確認ができます。リンク用のURLを打ち込んで長押しするとアプリを開くという選択肢がでてきます。

<img src="/images/2025/20250527b/image_14.png" alt="image.png" width="600" height="1300" loading="lazy">

# 最後に

Azure Blob Storageの静的サイト機能で簡単にUniversalLink用のWebサーバを立ち上げられました。

Azure環境がある場合は選択肢に入れてもいいかなと思います。
