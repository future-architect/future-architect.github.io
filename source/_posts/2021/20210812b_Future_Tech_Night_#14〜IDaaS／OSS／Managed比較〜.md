---
title: "Future Tech Night #14〜IDaaS/OSS/Managed比較〜"
date: 2021/08/12 00:00:01
postid: b
tag:
  - IDaaS
  - TechNight
  - 登壇レポート
  - Auth0
  - Keycloak
category:
  - 認証認可
thumbnail: /images/20210812b/thumbnail.jpg
author: 山田勇一
lede: "2021年7月21日にFuture Tech Night #14～認証認可（IDaaS）勉強会～で発表させてもらいました。元々は、Rails Devise+cancancan、Cognito User Pools（5年前）、Auth0の開発経験があり、改めてOSSも加えて学んでみたかったのが、テーマを決めた背景になります。"
---

<img src="/images/20210812b/key-2114046_1280.jpg" alt="" title="Arek SochaによるPixabayからの画像" width="640" height="408" loading="lazy">


# はじめに

Technology Innovation Group所属の山田です。2021年7月21日に [Future Tech Night #14～認証認可（IDaaS）勉強会～](https://future.connpass.com/event/218520/)で発表させてもらいました。

元々は、Rails Devise+cancancan、Cognito User Pools（5年前）、Auth0の開発経験があり、改めてOSSも加えて学んでみたかったのが、テーマを決めた背景になります。

なお、一緒に発表をした市川さんが、Auth0でWebAuthnを試されており、認証において非常に重要な機能になりますので、合わせてご覧ください。私はとても勉強になりました。

* [Future Tech Night #14「生体認証・デバイス認証を活用するパスワードレスな認証規格「WebAuthn」を体験！」](/articles/20210811b/)

# 資料

発表資料はこちらです。

<script async class="speakerdeck-embed" data-id="a6797af79a054b808d099e7f53f1d430" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

# 概要

### ハンズオン
全てのプロダクトをまっさらな状態からハンズオンし、要した時間と、利用できるまでの工程をまとめてみました。
アプリケーションはVueで統一しています。

ソースコードはコピペで動くを事を目指し、参考URLも掲載しています。

*  Auth0
Auth0の初期設定、vueを利用したハンズオン
*  keycloak
keycloakの初期設定、vueを利用したハンズオン
*  Cognito
Cognitoの初期設定、Amplify＋Vueを利用したハンズオン、hosted UI＋Vueを利用したハンズオン

### 比較

* プラン
HPに掲載されている内容で、プランと価格を比較
* 機能
各プロダクトのダッシュボード画面、トップレベルメニューまでの機能比較

# 当日頂いたQA

時間の関係で頂いたQAに返答できなかったため、改めてこの場で返答させて頂きます。

**Q.** Firebase Auth はフューチャーさんの方で事例や検証などされたりしていますでしょうか？（Auth0 が最も事例がある感じでしょうか）もし Firebase Authの事例などがあれば、どういう基準で選んでいるのか回答頂けると助かります。
**A.** 私の周囲では、Keycloak、Auth0の採用が多いです。
理由の1つとして、SSOの実現が必須になるケースが多く、central authentication serviceの仕組みが欲しくなってしまう為ですFirebase Auth（は知識が不足しており、定かではありませんが）やAmplify(+cognito)は単一アプリで利用するには良い印象ですが、IDPとして使う為には、追加の実装が必要になるため、採用するケースが少ないように思います。

---

**Q.** Auth0を導入される際に比較されたIDaaS, 比較ポイントがもしあれば教えていただけないでしょうか。例えばOktaなどは比較されましたでしょうか？
**A.** 残念ながら、Oktaとの比較結果は持ち合わせておらず、申し訳ありません。
比較ポイントとして特殊なものは無く、機能、非機能、価格、開発の自由度で純粋に比較しています。機能であれば、SSOやAD/GSuiteなどとの統合、移行性、GDPRへの対応...etc
非機能であれば、認証スループット、可用性、データの所在...etc 等かと思います。

---

**Q.** IDaaSの選択肢として、Azure AD B2Cがどうか、私見で良いので聞きたいです。
**A.** 勉強不足で申し訳ありません。Azure AD B2Cは初見でしたので機能を見てみました。
Customize性（Rules/Hooks）、SDKの充実度などはAuth0が有利に見えますが、基本的な機能は揃っており、価格メリットがあれば十分選択肢になりうると思えました。

---

**Q.** Futureでの各サービスやOSSの採用事例とその際の選定基準などあればお聞きしたいです
**A.** プロジェクトによって、優先すべき内容が異なるため、決まった選定基準はありません。
基本的にはプロジェクト単位に定められた機能、非機能の要件で選定軸を作り、第3者レビューも通した上で採用プロダクトを決めています。

# 最後に

次の機会があれば、追加で他のプロダクトも比較してみたいです。

ありがとうございました。
