---
title: "Auth0アカウントでShopifyにSSOする"
date: 2021/11/10 00:00:00
postid: a
tag:
  - Auth0
  - SSO
  - Auth0Rules
category:
  - 認証認可
thumbnail: /images/2021/20211110a/thumbnail.png
author: 武田拓己
lede: "私が参画した案件で、Auth0に登録されているエンドユーザ向けのアカウントを用いてShopifyにSSOする検証を行ったので、今回はその方法をご紹介します。"
---
<img src="/images/2021/20211110a/サムネイル.png" alt="サムネイル.png" width="462" height="288" loading="lazy">

# はじめに

はじめまして。2021年4月新卒入社、TIGの武田です。入社して早半年、最近開発の面白さに気付かされ、巷の[エンジニアあるある](https://www.salarymanz.com/entry/se-aruaru)にも3割くらい共感できるようになりました。

私が参画した案件で、Auth0に登録されているエンドユーザ向けのアカウントを用いてShopifyにSSOする検証を行ったので、今回はその方法をご紹介します。

## SSOとは？

**一度のユーザ認証**を行うと、以後そのユーザ認証に紐づけられているサービスを、追加の認証なしで利用できる機能です。
これにより、**ユーザはパスワードの記憶や管理の負担が減り、システム管理者はセキュリティ上の弱点を削減できます。

## Auth0とは？

[Auth0導入編](/articles/20200122/)をご参照ください。他にも[Auth0関連の記事](/tags/Auth0/)があります。

## Shopifyとは？

本格的なネットショップが開設できるECプラットフォームで、世界NO. 1のシェアを誇っています。詳しくは[公式サイト](https://www.shopify.jp/online/ecommerce-solutions)をご覧ください。

# 前提条件

実環境でSSO機能を利用するためには、ShopifyPlusのサブスクリプションが必要となります。また、Shopifyには無料の開発者向けの環境が用意されており、様々な機能をテストできます。今回は、開発者用ストアを使ってSSOを実装していきます。

Auth0のアカウントも必要になります。こちらも無料のものが提供されているので、今回はそちらを使います。

# サンプル実装

マルチパスを利用して、Auth0アカウントでShopifyにSSOできるよう実装していきます。

**目次**

[1. Shopifyアカウントでマルチパスを有効にする](https://future-architect.github.io/articles/20211110a/#Shopify%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88%E3%81%A7%E3%83%9E%E3%83%AB%E3%83%81%E3%83%91%E3%82%B9%E3%82%92%E6%9C%89%E5%8A%B9%E3%81%AB%E3%81%99%E3%82%8B)

[2. Auth0アプリケーションを作成し、URIを設定する](https://future-architect.github.io/articles/20211110a/#Auth0%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%82%92%E4%BD%9C%E6%88%90%E3%81%97%E3%80%81URI%E3%82%92%E8%A8%AD%E5%AE%9A%E3%81%99%E3%82%8B)

[3. Auth0ルールを追加して、マルチパストークンを作成する](https://future-architect.github.io/articles/20211110a/#Auth0%E3%83%AB%E3%83%BC%E3%83%AB%E3%82%92%E8%BF%BD%E5%8A%A0%E3%81%97%E3%81%A6%E3%80%81%E3%83%9E%E3%83%AB%E3%83%81%E3%83%91%E3%82%B9%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3%E3%82%92%E4%BD%9C%E6%88%90%E3%81%99%E3%82%8B)

[4. ShopifyテーマにAuth0リンクを設定する](https://future-architect.github.io/articles/20211110a/#Shopify%E3%83%86%E3%83%BC%E3%83%9E%E3%81%ABAuth0%E3%83%AA%E3%83%B3%E3%82%AF%E3%82%92%E8%A8%AD%E5%AE%9A%E3%81%99%E3%82%8B)

## Shopifyアカウントでマルチパスを有効にする

Shopifyストアにログインし、 `設定`に移動して `チェックアウト`ウィンドウをクリックします。顧客アカウントを、任意または必須に設定することで、ストアでマルチパスを有効にできます。

<img src="/images/2021/20211110a/技術ブログ①.png" alt="技術ブログ①.png" width="908" height="512" loading="lazy">

このシークレットキーはマルチパスリクエストが正当であることを確認するための暗号を作成するために使用されます。シークレットキーを再発行したい場合、マルチパスを無効にしてから再度有効にすることで、新たなシークレットキーが生成され、以前のものは無効化されます（上記画像のシークレットキーは既に無効化済みです）。

## Auth0アプリケーションを作成し、URIを設定する

Auth0ダッシュボード内で`Applications`に移動し、`Create Application`をクリックして適当な名前を付け（「Shopify Store」など）、`Regular Web Applications`を選択し、`CREATE`します。
<img src="/images/2021/20211110a/技術ブログ②.png" alt="技術ブログ②.png" width="782" height="689" loading="lazy">

`Settings`に移動します。

Application URIsを以下のように設定します。
{shopify-domain}は自身のストアのドメインに置き換える必要があります（例：sample-store.myshopify.com）

- **Application Login URI**：https://{shopify-domain}/account/login
- **Allowed Callback URLs**：https://{shopify-domain}/account
- **Allowed Logout URLs**：https://{shopify-domain}/account/logout
<img src="/images/2021/20211110a/技術ブログ④.png" alt="技術ブログ④.png" width="976" height="755" loading="lazy">

`Advanced Settings`セクションを展開し、Application Metadataに次の2つのKeyとValueのペアを追加します。

- **Key**：shopify_domain ; **Value**：{shopify-domain}
- **Key**：shopify_multipass_secret ; **Value**：{multipass-secret}
<img src="/images/2021/20211110a/技術ブログ③.png" alt="技術ブログ③.png" width="969" height="648" loading="lazy">

## Auth0ルールを追加して、マルチパストークンを作成する

Auth0ダッシュボードの`Auth Pipeline`の`Rules`に移動して、`Create`を選択、templateは`Empty rule`を選択します。
わかりやすい名前（「ShopifyMultipass」など）を付け、次のコードを貼り付けます。

```javascript
function (user, context, callback) {
  if (context.clientMetadata && context.clientMetadata.shopify_domain && context.clientMetadata.shopify_multipass_secret)
  {
    const RULE_NAME = 'shopify-multipasstoken';
    const CLIENTNAME = context.clientName;
    console.log(`${RULE_NAME} started by ${CLIENTNAME}`);

    const now = (new Date()).toISOString();
    let shopifyToken = {
      email: user.email,
      created_at: now,
      identifier: user.user_id,
      remote_ip: context.request.ip
    };
    if (context.request && context.request.query && context.request.query.return_to){
      shopifyToken.return_to = context.request.query.return_to;
    }

    const hash = crypto.createHash("sha256").update(context.clientMetadata.shopify_multipass_secret).digest();
    const encryptionKey = hash.slice(0, 16);
    const signingKey = hash.slice(16, 32);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey, iv);
    const cipherText = Buffer.concat([iv, cipher.update(JSON.stringify(shopifyToken), 'utf8'), cipher.final()]);

    const signed = crypto.createHmac("SHA256", signingKey).update(cipherText).digest();

    const token = Buffer.concat([cipherText, signed]).toString('base64');
    const urlToken = token.replace(/\+/g, '-').replace(/\//g, '_');

   context.redirect = {
     url: `https://${context.clientMetadata.shopify_domain}/account/login/multipass/${urlToken}`
   };
  }
  return callback(null, user, context);
}
```

- **2行目**：Auth0アプリケーションがshopify_domainとshopify_multipass_seceretのメタデータを保持しているときのみこのルールが実行されるようにします。
- **4〜6行目**：ルールが実行されていることを確認するためのロギングです。
- **8-14行目**：Shopifyには最低でもemailとcreated_atのデータが必要です。追加情報として、identifier（複数のAuth0アカウントが同じemailアドレスを持っている場合）、remote_ip（最初にログインリクエストを送信したコンピューターでのみこのマルチパスリクエストを使用できるようにする場合）を入れることができます。
- **15〜17行目**：return_toクエリ文字列に値がある場合は、これをShopifyトークンに追加します。
- **19〜30行目**：ここで実際に暗号化を行っています。GitHubの[リポジトリ](https://github.com/beaucoo/multipassify/blob/master/multipassify.js)を参照。
- **32〜34行目**：これにより、認証されたユーザの宛先が設定されます。
このルールが実行されると、ユーザはShopifyストアにリダイレクトされます。このルールの後にAuth0ルールがある場合、それらは完全にスキップされてしまうため、お気をつけください。

<img src="/images/2021/20211110a/技術ブログ⑤.png" alt="技術ブログ⑤.png" width="1059" height="856" loading="lazy">

## ShopifyテーマにAuth0リンクを設定する

Shopifyテーマを編集してログイン/ログアウトするためのリンクを追加していきます。
Shopifyストアの現在のテーマの`コードを編集`をクリックします。
<img src="/images/2021/20211110a/技術ブログ⑥.png" alt="技術ブログ⑥.png" width="975" height="361" loading="lazy">

まずは、ログインページを編集してログインリンクを追加します。`Templates`フォルダ内の`customers/login.liquid`ファイルを開き、リンクを追加するのに適した場所を見つけます。今回は、`アカウント作成`リンクの下に以下のリンクを配置します。

```html
<a href="{{ settings.auth0_login_url }}">Log in with Auth0</a>
```

<img src="/images/2021/20211110a/技術ブログ⑦.png" alt="技術ブログ⑦.png" width="878" height="753" loading="lazy">

次に、アカウントページを編集してログアウトリンクをAuth0のログアウトリンクに置き換えます。`Templates`フォルダ内の`customers/account.liquid`ファイルを開き、ログアウトリンクを以下のリンクに置き換えます。テーマ内の他の場所にもログアウトリンクがある場合は、それも同様に置き換える必要があります。

```html
<a href="{{ settings.auth0_logout_url }}">log_out</a>
```

<img src="/images/2021/20211110a/技術ブログ⑧.png" alt="技術ブログ⑧.png" width="943" height="328" loading="lazy">

続いて、ユーザがログインURLとログアウトURLを貼り付けることができるようにテーマ設定を追加します。`Config`フォルダ内の`settings_schema.json`ファイルを開き、以下のスニペットを配列の最後に貼り付けます。

ここでは、「Auth0 Config」という新しい設定セクションを作成し、ログインURLとログアウトURLを入力できるようにしています。idプロパティは、上記のリンクで使用したプロパティの名前と一致させる必要があります。

```json
{
  "name": "Auth0 Config",
  "settings": [
    {
      "type": "text",
      "id": "auth0_login_url",
      "label": "Auth0 Login Url",
      "info": "The full Auth0 URL to redirect the customer to for login."
    },
    {
      "type": "text",
      "id": "auth0_logout_url",
      "label": "Auth0 Logout Url",
      "info": "The full Auth0 URL to redirect the customer to for logout."
    }
  ]
}
```

<img src="/images/2021/20211110a/技術ブログ⑨.png" alt="技術ブログ⑨.png" width="937" height="331" loading="lazy">

続いて、URLを作成していきます。
まずは、以下のようにログインURLを作成します。

上記で作成したAuth0アプリケーションのClient IDを取得します。

<img src="/images/2021/20211110a/技術ブログ⑩.png" alt="技術ブログ⑩.png" width="764" height="95" loading="lazy">

- `auth0-instance`：Auth0ドメイン（例：sample.jp.auth0.com）
- `clientid`：Auth0アプリケーションからの値。
- `shopify-domain`：自身のストアのドメイン。
- `return-to-path`：任意で返したいパスを設定可能（例：ログイン後にアカウントページに遷移させたい場合は、`account`と設定）。

`https://{auth0-instance}/authorize?response_type=code&client_id={clientid}&return_to=https://{shopify-domain}/{return-to-path}&scope=SCOPE&state=STATE`

同様にログアウトURLも作成します。

- `auth0-instance`：Auth0ドメイン（例：sample.jp.auth0.com）
- `clientid`：Auth0アプリケーションからの値。
- `shopify-domain`：自身のストアのドメイン。

`https://{auth0-instance}.auth0.com/v2/logout?response_type=code&client_id={clientid}&returnTo=https://{shopify-domain}/account/logout`

テーマページに戻り、`カスタマイズ`をクリックして、画面左下に出てくる`テーマ設定`をクリック、`Auth0 Config`セクションを展開して、作成したURLを貼り付けます。

<img src="/images/2021/20211110a/技術ブログ⑪.png" alt="技術ブログ⑪.png" width="1166" height="763" loading="lazy">

以上で実装完了です！

# 実際の画面遷移

ログインページにて、`Log in with Auth0`をクリックする。
<img src="/images/2021/20211110a/技術ブログ⑫.png" alt="技術ブログ⑫.png" width="1200" height="707" loading="lazy">

上記で作ったShopify StoreというAuth0アプリケーションの認証画面が出てくるので、認証情報を入力してログインする。
<img src="/images/2021/20211110a/技術ブログ⑬.png" alt="技術ブログ⑬.png" width="842" height="479" loading="lazy">

ログインに成功！
<img src="/images/2021/20211110a/技術ブログ⑭.png" alt="技術ブログ⑭.png" width="1200" height="643" loading="lazy">

# さいごに

最近ではSSOを利用できるサービスがかなり増えてきたなという印象ですが、実際使ってみると本当に便利ですよね。他のアプリケーションでもこのような方法でSSOを導入できると思いますので、導入を検討する際にはこちらの記事を参考にしていただけますと幸いです。

最後まで読んでいただきありがとうございました！

# 参考リンク

- [Authenticate Shopify Customers with Auth0 – Rovani in C#](https://rovani.net/Shopify-Auth0-Multipass/)
- [Authenticate Shopify Customers with Auth0 - Shopify - Pavilion](https://thepavilion.io/t/authenticate-shopify-customers-with-auth0/4040)
- [Multipass | shopify.dev](https://shopify.dev/api/multipass)
- [multipassify/multipassify.js at master · beaucoo/multipassify](https://github.com/beaucoo/multipassify/blob/master/multipassify.js)
- [Auth0 Rule to Generate a Multipass token and redirect the user back to the Shopify store](https://gist.github.com/drovani/8199b1e0ffa1976c00af6781fcb98fbf)
- [Shopify PlusでSSO（シングルサインオン） - Qiita](https://qiita.com/djjimba/items/4946c73742728003e5f5)
- [Single Sign-On (SSO) For Shopify Using Auth0 as Identity Provider](https://plugins.miniorange.com/single-sign-on-sso-for-shopify-using-auth0-as-identity-provider)
