---
title: "技術書は「読む」から「呼び出す」へ：ACM経由のO'Reilly Online Learning契約とMCP連携の実践"
date: 2026/05/13 00:00:00
postid: a
tag:
  - O'Reilly
  - ClaudeCode
  - MCP
category:
  - Culture
thumbnail: /images/2026/20260513a/thumbnail.png
author: 棚井龍之介
lede: "2026年4月16日、アリゾナ州スコッツデールで開催された VulnCon 2026 に登壇しました。現地で CVE Program、FIRST、NVD、各種SCAツールのコアメンバーと直接議論できた経験を経て、自分の学習投資の量と質を、もう一段階引き上げる必要があると考えるようになりました。
"
---
<img src="/images/2026/20260513a/top.png" alt="" width="1200" height="670" loading="lazy">

# はじめに

こんにちは。FutureVulsの棚井です。

2026年4月16日、アリゾナ州スコッツデールで開催された **VulnCon 2026** に登壇しました。タイトルは `The CVE Blind Spot: Defeating "Hidden EOLs" with Code Diet` で、CVEの限界、Hidden EOL、Code Diet、[uzomuzo-oss](https://github.com/future-architect/uzomuzo-oss) をテーマに発表しました。登壇の詳細は [FutureVuls Blogの登壇報告記事](https://www.vuls.biz/blog/vulncon-2026-speaked) をご覧ください。

現地で CVE Program、FIRST、NVD、各種SCAツールのコアメンバーと直接議論できた経験を経て、自分の学習投資の量と質を、もう一段階引き上げる必要があると考えるようになりました。

帰国後すぐに、本腰を入れて技術書サブスクの導入を検討し始めました。色々比較した結果、いわゆる「オライリーサブスク」 ── 正確には **ACM (Association for Computing Machinery) Professional Membership + Skills Bundle Add-On 経由での O'Reilly Online Learning 契約** に行き着きました。

直契約だと年 ¥77,000〜91,000 かかる O'Reilly Online Learning が、ACM経由なら **年¥24,980（月¥2,082換算）** で済みます。直契約比で約 **¥58,000の節約（実に 70%オフ）** です。

オライリー本を年に数冊買うだけで元が取れる金額のため、自己投資の選択肢として、これは見逃せないと判断しました。

本記事では、私が2026年4月に実際に加入・運用してみた経験をベースに、以下の内容を網羅します。

- ACM経由ルートの価格構造
- 加入手順の完走ガイド
- 加入後の設定とアクセス範囲
- Claude Code から O'Reilly MCP Server を使う

想定読者は、**自己投資としての技術書サブスクを検討している社内外のエンジニア** です。所要時間としては、加入手続き自体は **約1時間** で完了します（私の実測）。

> 本記事は私個人の調査と利用体験に基づくものであり、フューチャー株式会社の公式見解や契約方針を示すものではありません。本記事で扱う ACM 経由の利用は、ACM 個人会員に紐づく Skills Bundle Add-On を通じたものです。O'Reilly Online Learning の法人プラン（Enterprise）とは別契約ですので、業務目的での導入を検討される場合は、別途 O'Reilly 法人向けの規約・契約条件をご確認ください。なお、ACM Skills Bundle 経由のO'Reilly Online Learningは個人プランのため、**チームでの共有や複数人での利用は規約違反となります**。利用にあたっては各社の利用規約をご自身でご確認のうえ、自己責任にてご契約ください。

# ACM経由ルートの全体像と価格構造

## なぜ「ACM経由」が安いのか

ACM (Association for Computing Machinery) は1947年設立、計算機科学分野で世界最大規模の国際学会です。論文誌『Communications of the ACM』の発行元と言えば、ピンと来る方も多いかもしれません。

そのACMの会員特典のひとつに **Skills Bundle Add-On** というオプションがあり、これを追加すると **O'Reilly Online Learning が会員特典として利用できる** ようになります。ACM が学会員向けの教育プログラムとして O'Reilly Online Learning を組み込んでいる構造のため、結果として ACM 経由のセット契約のほうが、O'Reilly を直接契約するより年額の支払いが低くなります。

## 4プラン比較

私が検討した主要4プランの実費比較がこちらです。

| プラン | USD/年 | JPY換算 | 月単価 |
|---|---|---|---|
| O'Reilly 直契約（個人月額の年換算） | $588 | 約¥91,000 | 約¥7,600 |
| O'Reilly 直契約（年額一括15%オフ） | $499 | 約¥77,000 | 約¥6,400 |
| **ACM Pro + Skills Bundle（初年度25%オフ）** | **$150** | **¥24,980（実測）** | **¥2,082** |
| ACM Pro + Skills Bundle（2年目以降） | $174 | 約¥27,000 | 約¥2,250 |

**ACM Pro + Skills Bundle の初年度が最安** です。O'Reilly直契約の年額プランと比較すると、差額は **-$349 (-¥58,000)、約70%オフ** になります。

上記の料金は私が2026年4月時点で確認した内容です。料金体系・キャンペーン条件は予告なく変更される可能性があるため、申込前には必ず以下の公式情報をご確認ください。

- O'Reilly Online Learning 個人プラン料金: <https://www.oreilly.com/online-learning/pricing.html>
- ACM Skills Bundle Add-On 概要: <https://learning.acm.org/skills-bundle>
- ACM Skills Bundle に関するFAQ（O'Reilly関連）: <https://learning.acm.org/faq/oreilly-faqs>
- ACM Membership Benefits: <https://www.acm.org/membership/membership-benefits>

## 25%オフキャンペーンの入り口URL

ACM Professional Membershipの 25%オフキャンペーンは、初年度限定のキャンペーンです。

「acm membership promotion」などで検索して辿り着けます。重要な点としてACM公式トップページから普通に進むとこのキャンペーンURLには遷移しません。

<img src="/images/2026/20260513a/2c8ac129-bde9-4611-9690-74a7ef935020.png" alt="" width="1200" height="389" loading="lazy">

## ¥24,980の内訳（為替実測値）

| 項目 | USD | 備考 |
|---|---|---|
| ACM Professional Membership（25%オフ） | $75 | 通常$99 |
| ACM Skills Bundle Add-On | $75 | O'Reilly Online Learning 利用権 |
| **小計** | **$150** | |
| 適用為替レート | 1 USD = ¥166.53 | 決済時のレート（2026年4月実測。海外決済手数料を含む実効レートのため、同時期の市場レートよりやや高め） |
| **JPY実費** | **¥24,980** | 月単価 ¥2,082 |

## 2年目以降の判断材料

冒頭の比較表の通り、2年目以降は 25%オフが適用されないため、$174（約¥27,000、月¥2,250換算）に上昇します。それでも直契約年額の約3分の1で済むため経済合理性は維持されますが、私は自動更新を OFF にして満了日に自然失効する設定を選びました。

# 加入手順を完走する

加入手順は、大きく分けて以下の5フェーズで進みます。私はブログ向けのスクリーンショット撮影を挟みながら進めて約45分でしたが、撮影なしの実作業だけならもっと短く済むはずです。

1. 加入フォーム入力（基本情報まで） — 25%オフURLからプラン選択、基本情報入力まで
2. 決済 — Payment画面で内訳確認 → 決済確定
3. ACM Web Account 作成 — ログイン用アカウントとパスワード設定
4. アクティベーション — 確認メール経由でアカウント有効化
5. O'Reilly Online Learning への初ログイン — SSOで O'Reilly ダッシュボードに到達

各フェーズに注意点が点在するため、それらに沿って整理します。

## Phase 1: 加入フォーム入力（基本情報まで）

### Step 1. 25%オフキャンペーンURLにアクセス

前節で示した25%オフURLからフォームを開きます。ACM公式トップページから普通に進むとこのページには到達しませんので、URLは必ず控えておいてください。

```
https://services.acm.org/public/qj/keep_inventing/qjprofm_control.cfm?promo=DA5MAA
```

### Step 2. プラン選択と Skills Bundle Add-On のチェック

Quick Join フォーム上で `ACM Professional Membership – $75`（25%オフ適用済み価格）と、`ACM Skills Bundle Add-On – $75` の両方を選択します。**Skills Bundle のチェックを外したまま進むと、O'Reilly Online Learning へのアクセス権が付かない** ので注意してください。合計が **$150** になっていることを確認してから次に進みます。

### Step 3. 基本情報入力

入力項目は以下のとおりです。

- First Name / Last Name
- Email（領収書・アクティベーションメールの送信先）
- Country/Region: `Japan`

## Phase 2: 決済

### Step 4. Payment Information 画面で内訳を確認

決済画面では、プランごとの単価と合計金額が表で表示されます。Skills Bundle 込みで小計 $150 になっていることを確認します。

ここで重要なのが **Automatic Renewal Program のチェックボックス** です。**チェックを外したまま** 進めると、翌年の自動更新が無効になります。私は来年あらためて契約継続を判断したいため、ここでチェックを外したまま進めました。

<img src="/images/2026/20260513a/c3321321-a4dd-44ab-894f-4fd676f7ac8f.png" alt="" width="1200" height="630" loading="lazy">

### Step 5. 決済確定と Membership Number / Order Number の取得

決済が完了すると `THANK YOU FOR SHAPING THE FUTURE OF COMPUTING!` という画面に到達し、以下が同時に発行されます。

- **Membership Number**（会員番号）
- **Order Number**（注文番号、領収書照会用）

<img src="/images/2026/20260513a/eb0f3b6c-6320-461a-9f45-fdd461ed18e4.png" alt="" width="1200" height="416" loading="lazy">

決済確定から数分後には、`acmhelp@acm.org` から領収書メール（件名 `ACM Online Purchase`）が届きます。

## Phase 3: ACM Web Account 作成

ここまでで「ACM会員」としての登録は完了していますが、**ログイン用の Web Account はまだ未作成** です。引き続き、Web Account の作成に進みます。

### Step 6. Create your own Web Account リンクから作成画面へ

決済完了後の画面から `Create your own Web Account` リンクをクリックします。`accounts.acm.org` の別画面に遷移します。

### Step 7. メールアドレス入力

加入時に登録したEmailアドレスと **完全一致** させる必要があります。`is on file, but has no associated ACM Account` という表示が出れば正常です（=「会員登録はされているが、ログイン用アカウントはまだ無い」状態）。

<img src="/images/2026/20260513a/b48eddd4-47a9-429c-a403-7856c13a926a.png" alt="" width="1200" height="872" loading="lazy">

### Step 8. パスワードと Security Question の設定

ACM Web Account のパスワードには以下の制限があります。一般的なWebサービスのパスワード仕様を前提にすると、後からログインできなくなる注意点が複数あります。

- 使える文字: **英字、数字、`-`、`_`、`.` のみ**
- **`!@#$%&*` などの記号は使えない**
- スペース不可
- **最大26文字、超過分はサイレント切り捨て**

最後のサイレント切り捨てが特に注意です。事前に手元で生成した30文字以上の強パスワードを貼り付けると、見た目には登録できているように見えても、末尾が無言で切られた状態で保存されてしまいます。後でログインしようとすると、自分が控えていたパスワードと一致せずに通らない、という事態になります。

なお、同じ画面で Security Question / Security Answer の登録も求められます。Security Answer は大文字小文字を区別するため、回答文字列も後から正確に再現できる形で控えておく必要があります。

<img src="/images/2026/20260513a/d6ac9a78-f4de-4846-bada-b716300fa838.png" alt="" width="1072" height="1624" loading="lazy">

### Step 9. Username の自動生成

パスワード設定が完了すると、Username が自動生成されます。

このUsernameは、ACM転送メール（`<username>@acm.org`）の宛先にもなる識別子です。

<img src="/images/2026/20260513a/a35614d4-f922-46c3-b3aa-84492401edcb.png" alt="" width="1200" height="755" loading="lazy">

## Phase 4: アクティベーション

### Step 10. 確認メールのアクティベーションリンクをクリック

ACMからアクティベーション確認メールが届きます（件名 `Confirm Your ACM Account` 等）。⚠️ このステップを飛ばすと、せっかく作った Web Account でログインできないので必ず実行してください。

### Step 11. アクティベーション完了画面の確認

リンクをクリックすると、`Your ACM Account, with username <username>, is now ready for you to use.` という画面に到達します。これで「ACM会員」かつ「Web Account 保有者」の状態が揃い、ACM側の作業は完了です。

## Phase 5: O'Reilly Online Learning への初ログイン

### Step 12. O'Reilly SSO 専用URLにアクセス

ACM経由のO'Reilly Online Learning には、**ACM会員専用のSSO URL** からアクセスします。

```
https://go.oreilly.com/acm
```

このURLにアクセスすると、ACM SSO ログイン画面に自動リダイレクトされます。

### Step 13. ACM Username / Password でログイン

Username（または `<username>@acm.org`）と、Step 8 で設定したパスワードでログインします。ACM側で認証が成功すると、O'Reilly に戻されます。初回ログイン時に O'Reilly 側のアカウントが自動的にプロビジョニングされます。

### Step 14. O'Reilly Learning ダッシュボード到達

`Welcome! Let's get started.` の画面に到達すれば、O'Reilly Online Learning のダッシュボードが使える状態になります。

<img src="/images/2026/20260513a/07-oreilly-login.png" alt="07-oreilly-login.png" width="1200" height="930" loading="lazy">

ここまでで **6万冊以上の技術書・動画ライブラリへのアクセス可能** になりました。

また、`<username>@acm.org` での SSO ログインにより、スマホアプリからも O'Reilly 本が読み放題になります。

<img src="/images/2026/20260513a/79b22982-d5f8-4492-bed6-71e3ea50c672.png" alt="" width="1200" height="1243" loading="lazy">

# 加入後の設定

加入手続きが完了したら、O'Reilly側とACM側で **3つの初期設定** を済ませておくと、その後の運用が楽になります。あわせて、ACM経由で **使えないコンテンツの範囲** も把握しておきます。

## 言語設定で日本語コンテンツも検索結果に出すようにする

O'Reilly Online Learning の検索は、デフォルトでは英語コンテンツを優先します。日本語の邦訳書籍も検索結果に出したい場合は、`Settings → Language Preferences` で、`English` 単独から `English + Japanese` の併用に変更します。

これだけで、O'Reilly Japan 関連の邦訳書籍（『ソフトウェアサプライチェーンセキュリティ』邦訳版や『侵入技術入門 ―bashで学ぶ攻撃者の技法』など）も検索結果に登場するようになります。日本語キーワードでの検索もここで効くようになります。

<img src="/images/2026/20260513a/d5a8af10-dc37-44ee-afec-9c45a8abb8cf.png" alt="" width="1200" height="426" loading="lazy">

## Email Preferences で不要な通知を切る

ACM経由のSkills Bundleでは、O'Reilly Live events / Live courses / Certification prep などアクセス権の付かないコンテンツが一部存在します。これらに関する通知が届くと不要なノイズになるため、Email Preferences でオフにしておきます。

## 自動更新を OFF にして解約忘れを防ぐ

ACM Professional Membership は、初年度のみ 25%オフが適用され $150（¥24,980 / 月¥2,082換算）で済みますが、2年目以降は $174（約¥27,000、月¥2,250換算）に上昇します。Automatic Renewal Program が ON のままだと、翌年もこの価格で自動課金され続けるため、「使わなくなっていたのに気づかず継続課金されていた」という事態を避けたい場合は OFF にしておくのが安全です。

私の場合は、来年あらためて契約継続の要否を判断するため、自動更新を OFF にして満了日にそのまま自然失効する設定にしました。

更新ON/OFFの現在状態は、以下の画面フローで確認・変更できます。

```
ACM ログイン
  └ myACM
      └ Go to myACM
          └ myACM Member Portal
              └ my Wallet → "Check your current settings"
                  └ ACM Wallet Information
```

`ACM Wallet Information` 画面で、Auto-Renew のチェックボックスを外しておけば、満了日にそのまま自然失効する形になります。

## ACM経由で利用できない範囲

ACM Skills Bundle 経由で O'Reilly Online Learning を使う場合、O'Reilly 直契約と比べていくつかのコンテンツが除外されています。事前に把握しておかないと「あれが見られない」と気付くタイミングが遅れるので、ここで一度整理しておきます。

公式FAQ準拠で、ACM経由では「アクセスできないもの」は以下のとおりです。

- Live events / Live courses: リアルタイム配信のオンラインイベント・コース
- Certification prep materials and exams: 各種認定資格の対策コンテンツと模試
- Superstream recordings: 過去に開催された Superstream イベントのアーカイブ
- Interactive labs / sandboxes: ハンズオン用の対話型ラボ環境

逆にいえば、それ以外の6万冊以上の電子書籍・動画・カンファレンス録画・プレイリスト・AI Mode（Answers）・MCP連携は通常通り利用できます。

公式の最新範囲は以下で確認できます。

- ACM Skills Bundle FAQ: <https://learning.acm.org/faq/oreilly-faqs>

# Claude Code から O'Reilly MCP Server を使う

加入後に便利なのが、O'Reilly 公式の MCP Server を Claude Code に接続する設定です。コーディング中の自然な流れで関連書籍を引き寄せられるようになり、技術書サブスクが「読み放題」から「呼び出し放題」に近い感触になります。

ただし2026年4月時点では機能が限定的で、Web版 AI Mode（Answers）と同等の自然言語Q&Aは未実装です。タイトルで掲げた「呼び出す」体験のうち、現状到達できているのはキーワード検索とメタデータ取得までで、自然言語Q&Aの本格的な「呼び出し」はもう一段階先の話です。現状の使いどころと、機能拡充への期待を分けて整理します。

## O'Reilly MCP Server の概要

MCP (Model Context Protocol) は、LLMクライアントから外部サービスのツールやデータに統一プロトコルで接続するための仕様です。O'Reilly は2025年11月19日に公式 MCP Server を発表しました。当初は法人顧客（Enterprise）向けの限定提供でしたが、2026年4月にACM Skills Bundle加入者にも提供範囲が拡大され、ACM個人会員からも利用できるようになりました。Claude Code / Claude Desktop / Cursor / VS Code など主要な MCP対応クライアントから接続できます。

接続情報・参考リンクは以下のとおりです。

- エンドポイント: `https://api.oreilly.com/api/content-discovery/v1/mcp/`
- 認証: Bearer Token（O'Reilly Web UI から発行）
- 公式ドキュメント: [O'Reilly MCP Server](https://learning.oreilly.com/apidocs/mcp/content/zzzz)
- O'Reilly公式プレスリリース（2025年11月19日）: https://www.oreilly.com/pub/pr/3476
- ACM公式アナウンス「O'Reilly MCP Server Now Part of ACM Skills Bundle」: <https://www.acm.org/articles/bulletins/2026/april/oreilly-mcp-server>

## Claude Code への登録手順

### Step 1. MCP Token の発行

O'Reilly Online Learning にログインした状態で、`Settings → MCP Tokens` 画面を開きます。`Generate token` ボタンから新しいトークンを発行できます。トークン名は用途別に管理しやすいよう `claude-code-local` のような分かりやすい文字列にしておくのがおすすめです。

<img src="/images/2026/20260513a/bc80d882-65cc-45fd-add4-c6a577260106.png" alt="" width="1200" height="388" loading="lazy">

発行されたトークン文字列は、その場でしか表示されないため、必ずその場で控えて安全に保管してください。

### Step 2. Claude Code への登録コマンド

ターミナルから以下のコマンドを実行します。

```bash
claude mcp add --scope user --transport http oreilly \
  https://api.oreilly.com/api/content-discovery/v1/mcp/ \
  --header "Authorization: Bearer {TOKEN}"
```

`{TOKEN}` の部分は Step 1 で発行したトークン文字列に置き換えます。

このコマンドは **user スコープ** で登録されるため、`~/.claude.json` に書き込まれ、全プロジェクトの Claude Code から利用可能になります。プロジェクトごとに個別登録する必要はありません。

### Step 3. 接続確認

登録できたら、以下のコマンドで接続状態を確認します。

```bash
$ claude mcp list
oreilly: https://api.oreilly.com/api/content-discovery/v1/mcp/ (HTTP) - ✓ Connected
```

`✓ Connected` が表示されれば接続成功です。

## 提供ツール `search-oreilly-content` の仕様

接続が完了すると、Claude Code から以下のツールが呼び出せるようになります。

- ツール名: `mcp__oreilly__search-oreilly-content`
- 機能: 蔵書検索（書籍・動画・記事・コース等）

このツールは8つのパラメータで検索条件を絞り込めます。

| パラメータ | 型 | 主な用途 |
|---|---|---|
| `query` | string | 検索キーワード（最大2,500文字、boolean構文や質問形式は不可） |
| `n_items` | integer | 取得件数（デフォルト 5） |
| `languages` | array | ISO 639-1（`en`, `ja`, `de`, `fr`, `es` 等） |
| `content_types` | array | `books`, `videos`, `articles`, `courses`, `interactive` など |
| `publisher_filter` | array | 出版社フィルタ |
| `author_filter` | array | 著者フィルタ |
| `order_by` | string | `relevance`, `date_published`, `popularity`, `rating` など |
| `sort_order` | string | `asc` / `desc` |
| `date_range` | object | **自然言語の日付指定にも対応**（`last 3 months` など） |

特に `date_range` の自然言語パースは便利で、「直近12ヶ月で出た本だけ」のような時間軸の絞り込みをコマンドで意識せずに指定できます。

なお、現時点で接続後に提供されるのはこの1ツールのみで、resources / prompts といった他の MCP ケイパビリティは未対応です。

## 実装中の活用シーン

実際の使いどころは、**Claude Code でコーディングしている流れで、関連書籍・記事をその場に呼び寄せる** ことです。

たとえば業務で「サプライチェーン攻撃」の最新書籍・記事をキャッチアップしたいとき、ターミナルで `claude` コマンドを実行して Claude Code を起動し、以下のように依頼します。

> O'Reilly MCP で `software supply chain attack` を、直近12ヶ月の書籍・記事に絞って5件取得してください。

これだけで、Claude Code が `search-oreilly-content` を呼び出し、`date_range` を直近12ヶ月、`content_types` を `books, articles`、`order_by` を `date_published` に設定した検索を実行してくれます。

<img src="/images/2026/20260513a/10-mcp-search-result.png" alt="10-mcp-search-result.png" width="1200" height="684" loading="lazy">

4月のVulnCon 2026 登壇後の継続学習でも、テーマの周辺領域を押さえ直す入口として実用的でした。`Sigstore`、`SBOM`、`OpenSSF Scorecard` のようにキーワードを切り替えて何度か投げるだけで、必要なリーディングリストの素案が短時間で揃います。

ただし、O'Reilly Web版の AI Mode（Answers）にある自然言語Q&A機能は MCP 経由ではまだ `Coming soon` 表示で利用できません。`How can I detect repo jacking attacks targeting GitHub Actions?` のような踏み込んだ質問は Web 側に投げるのが現実解で、**「キーワード検索とフィルタは MCP で、深掘りは Web版 AI Mode で」** という使い分けになります。2025年11月の発表からまだ半年ほど、ACM個人会員への拡大からは数週間しか経っていないので、`Ask Question` の MCP 対応を含めた機能拡充に期待しているところです。

# おわりに

ACM経由で O'Reilly Online Learning を契約する手順、加入後の運用、そして Claude Code MCP Server との連携までをひととおり整理しました。

海外カンファレンスで受けた刺激から動き出した学習投資ですが、最終的に月¥2,082で6万冊以上の技術書・動画にアクセスできる構成に落ち着きました。直契約との差額は約¥58,000（70%オフ）にもなります。書籍を年に数冊買うか買わないかで埋まる金額です。

本記事ではあえて深く踏み込まなかった Web版 AI Mode の `Ask Question` 機能（自然言語Q&AのRAG）は、実際に使ってみると精度の手応えが大きく、調べ物のスタート地点として十分に頼れる印象でした。Claude Code MCP Server 経由で同じ機能が使えるようになれば、コーディング中のリサーチワークフローはもう一段階変わるはずなので、機能拡充は引き続きウォッチしていく予定です。

学習リソースの選択肢が広がった分、**何をどう読むか** の戦略がより重要になります。読み方やエンジニア視点での書籍ピックアップは、機会を改めてどこかで書ければと思います。

同じように学習投資としての技術書サブスクを検討している方の判断材料として、本記事の実体験が少しでも役立てば嬉しいです。

# 注意事項

本記事に記載している価格・為替レート・登録画面・規約等の情報は、**2026年4月時点で著者が確認した内容** に基づきます。ACM および O'Reilly Media の料金体系・特典内容・UI は予告なく変更される可能性があるため、実際の申込時には以下の公式サイトで最新情報をご確認ください。

- ACM: <https://www.acm.org>
- O'Reilly Online Learning: <https://www.oreilly.com>

