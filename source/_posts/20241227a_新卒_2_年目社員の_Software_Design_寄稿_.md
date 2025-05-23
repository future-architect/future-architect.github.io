---
title: "新卒 2 年目社員の Software Design 寄稿 "
date: 2024/12/27 00:00:00
postid: a
tag:
  - SoftwareDesign
  - 寄稿
  - CDN
  - Web
  - テクニカルライティング
category:
  - Infrastructure
thumbnail: /images/20241227a/thumbnail.jpg
author: 小澤泰河
lede: " 技術評論社様（以下敬称略）の『Software Design 2024 年 8 月号』 に記事を寄稿する機会をいただけましたので、その話をご紹介します。"
---
<a href="https://gihyo.jp/magazine/SD/archive/2024/202408">
<img src="/images/20241227a/TH320_642408.jpg" alt="" width="320" height="452">
</a>

こんにちは。 Technology Innovation Group（TIG）所属の小澤です。2022 年の 10 月にフューチャーに新卒で入社しました。最近は、新規 Web アプリ構築の全体アーキテクチャ設計や開発を行っています。

技術評論社様（以下敬称略）の **『Software Design 2024 年 8 月号』** に記事を寄稿する機会をいただけましたので、その話をご紹介します。

新卒 2 年目の社員が雑誌へ寄稿というと、どのような流れで進むのか想像がつかないという方も多いと思います。 この記事でその流れをご紹介し、興味のある方には、ぜひご自身でもチャレンジするきっかけにしていただければ幸いです。

# はじめに: Software Design とは

技術評論社の『Software Design』は、IT エンジニア向けの月刊誌です。 その時々のトレンドに合わせて、入門から実践まで様々な特集が組まれます。

最近は 2018 年 - 2023 年の各号のデータを 1 冊の価格で購入できる『[Software Design 総集編](https://gihyo.jp/book/2024/978-4-297-14471-5)』も発売されました。 私自身も活用しており、まだ新卒からの経験年数が浅い身にとって、ここ数年の技術トレンドの変遷が一望できて面白いです。

# フューチャーの社員と執筆活動

さて、フューチャーの社員の一部は、通常の業務とは別に執筆を行っていることがよくあります。 たとえば、

- 『[Real World HTTP](https://www.oreilly.co.jp/books/9784814400669/)』（オライリー・ジャパン）
- 『[実用 Go 言語](https://www.oreilly.co.jp/books/9784873119694/)』（オライリー・ジャパン）
- 『[ソフトウェア設計のトレードオフと誤り](https://www.oreilly.co.jp//books/9784814400317/)』（オライリー・ジャパン）
- 『[［入門］Web フロントエンド E2E テスト](https://gihyo.jp/book/2024/978-4-297-14220-9)』 （技術評論社）

などの書籍（初版発行日順）は、いずれもフューチャー社員が執筆や翻訳に関わっています。 

そして、書籍だけでなく雑誌『Software Design』に寄稿する例も多数あります。今年 2024 年は 8 月、9 月、10 月の 3 か月連続でフューチャー社員が寄稿しました。私が担当したのは 8 月号です。

9 月号と 10 月号については、ぜひ担当社員のブログ記事をご覧ください。

- [Software Design 2024年9月号 Goのエラーハンドリングと向き合う ベストな設計戦略を徹底解剖を寄稿しました](https://future-architect.github.io/articles/20240827a/)
- [Software Design 2024年10月号 受託開発における設計ドキュメントの課題と解決案 作成・管理のヒントを探るへの寄稿](https://future-architect.github.io/articles/20240925a/)

書籍や雑誌の執筆・寄稿に至る経緯は様々と聞いていますが、最近はこの技術ブログが端緒となるケースが多いように思います。 出版社の方がブログ記事を見てくださり、それを拡充・発展させる形で企画を進めるという流れです。

# Software Design 8月号寄稿の経緯

## 勉強会から技術ブログへ
私は 8 月号の 1 記事を担当させていただくことができましたが、そこに至った経緯もこの技術ブログに投稿した 2023 年の記事に始まります。

私は通常のプロジェクト業務とは別に、社内の「CCoE（Cloud Center of Excellence）」組織、すなわちクラウド活用を推進する組織の活動に参加しています。 当時その中での 1 つの取り組みとして、幅広いクラウド技術の学びを共有する勉強会が行われていました。 その勉強会で、私は近年注目を浴びている **CDN エッジでのコード実行に関する入門的なまとめ**を発表しました。

それ以前は、現代の Web アプリケーション開発で CDN がよく利用されることは把握していましたが、CDN のしくみや CDN エッジでコード実行する意義や特殊性、具体的な方法などはあまり分かっていませんでした。 そこを勉強し、自分の言葉で整理することで、できる範囲を増やしアーキテクチャ設計スキルを強化することが、この発表の目的の 1 つです。

この発表はマークダウン形式の資料にまとめていたので、そのまま技術ブログ記事にする提案をもらいます。そうして実際に投稿したのが「[CDN 入門とエッジでのアプリケーション実行](https://future-architect.github.io/articles/20230427a/)」です。

## Software Design の特集へ

少し時間が経って 2024 年の前半、Software Design の編集者の方から、「技術ブログ記事を見たので、8 月号の特集を担当するのはどうか」という旨の大変貴重なご提案をいただきました。 8 月号のメイン特集は 2 本立てでその 1 つが全 3 章の「CDN エッジ」です。その第 1 章の入門記事を担当するご提案でした。ほかの章は別の担当の方が執筆します。

元の技術ブログ記事は、CDN の入門に始まり、 Web アプリと CDN の関係を復習し、Cloudflare Workers を例にエッジでのコード実行を実際に試して終わりという構成でしたが、8 月号特集ではハンズオンや実践例は後の章で行うということもあり、構成・目次を変更して内容を再整理することになります。

## 記事の再構成

Software Design の読者は、完全初心者という人は多くないので、元の記事の初歩的な内容は最小限に絞り、各 CDN サービスの紹介や違い、具体的なユースケースを拡充しました。 編集者の方と何度かやり取りをして、より効果的な順序・内容となるようにブラッシュアップします。 最終的な構成は次のようになりました。 

第1章 CDNエッジとWebアプリの関係性
- **速習 Web アプリ** ... 特集の論点を理解するために必要な Web アプリの前提知識をリクエストのマッピングに注目して整理します。
- **Web アプリの実現形式** ... サーバーサイドレンダリング（SSR）、クライアントサイドレンダリング（CSR）を解説し、Web アプリの動的な振る舞いと静的な振る舞いを整理します。
- **CDN と Web アプリ** ... SSR と CSR の合わせ技など、近年の Web フロンエンド事情を紹介し、各方式と CDN の関連性を見ます。
- **CDN のしくみ** ... CDN の基本的な構成要素を整理します。
- **ユーザーの近くのエッジロケーションに誘導するしくみ** ... CDN を実現する方式の一例として順を追って解説します。
- **CDN サービスの例** ... CDN を提供するサービスの特徴を簡潔に紹介します。
- **CDN エッジでのコード実行** ... エッジサーバーでコード実行ができるサービスの紹介と特徴、具体的なユースケースを解説します。
- **CDN の使い道** ... 従来の用途から近年のエッジランタイムまで、CDN の役割を振り返り、どのような場面で CDN 関連の技術を活用できるか考えます。

興味を持った箇所があれば、ぜひお読みいただければ嬉しいです。

# 執筆のポイント

**ここからは半分自分用の戒め**なのですが、今後初めて書籍や雑誌記事を執筆するという方のためにも、個人的に感じた執筆のポイントを（良かった点と改善点を踏まえて）紹介します。

## 大枠から決める・量を稼いで後で減らす

今回は元のブログ記事があったので、完全にゼロからのスタートではありません。 とはいえ、ブログ記事と雑誌特集では必要な内容も異なり、多くを新たに生み出す必要があります。

**何もない、あるいは混沌とした状態から「最初の形」を生み出すことは、かなりの負荷がかかるものです**。 この負荷は、高難度な新しいソフトウェアの基盤部分を自分自身がリードして作らなければならないときの負荷に似ています。 気にすべき点や盛り込みたい点がたくさん思いつき、それを全部回収したものを作ろうとすると途方もない考慮が必要になってしまうものです。

そこで大事になるのは、**大枠（目次）をまず雑に決めて、その後はとにかく量を稼ぐこと**、**いったん進捗率 100%（ただし精度 30%）という状態にすばやく到達すること**だと感じます。

誤解のないように言っておくと、**出版物の価値は量ではなく質で決まります**。 しかし、**あくまで執筆時のテクニックとしては**、まず量を稼ぐようにしなければ質を向上させるだけの進捗を生めない側面があります。

いったんの形を作ることで、量を稼ぐ自己ノルマから解消され、質を上げるための余裕が生まれます。
雑に進めることは不安を感じるのですが、後で精度を上げたり変更したりするのは、意外と簡単にできるので大丈夫です。
また、編集者の方とのやりとりで軌道修正が生じる可能性は十分あり得るので、大枠だけでも早めに合わせておくのが大切だと感じます。

とはいえ、これは理想であって、最初のステップに負荷がかかることには変わりはないので、現実的には行き詰ってしまいがちです。私自身も今後うまくできるとは正直断言できません。  
しかし、少なくとも意識として、まず量を稼ぐべきだと自分に言い聞かせることで、既存箇所の改善に目が行ってしまうといった問題を、ある程度は抑制することができるでしょう。

## 実務での利用経験が少ない場合も、個人で手を動かして試す

入門や解説系の文章を書くとき、どうしても実務での利用経験がなかったり、少なかったりするものを扱う必要が出てきます。 私のように新卒からの年数が浅い人などは特にそうだと思います。

これは仕方のないことなのですが、他方で、試したことのないものを聞きかじりで紹介することもできません。 当たり前の主張になってしまいますが、**文章を書く「前」に、個人開発でよいので手を動かして試し、実践を作っておく**ことが大切です。 文章を書いた「後」のチェックだけだと微妙なのは、自分の経験に基づいた「自分の言葉」で文章を書くことができなくなるからです。自分の言葉で書かないと、どこかの説明のつぎはぎや、意味理解をしない AI の説明のようになってしまいます。

## 引用・参考元はメモしておく

基本的に自分の経験を通した自分の言葉で書くことは上で述べたことですが、他方で元の文章がある場合は、著作権法上の引用要件を満たすように、元の文章を改変せず明確に引用する必要があります。 引用の必要はない場合でも、参考元の情報を示すことが重要な場面は多いでしょう。

そうした**引用・参考元は、後から辿るのが大変になるので、法的なリスクを避ける意味でも、調査時にしっかりメモしておく**ことが大切です。

## 文章を書く行為に慣れておく

これは今回よかった点ですが、**文章を書く行為に日々の業務で慣れておく**ことはとても役に立ちました。 例えば、開発中のソフトウェアのドキュメントや説明資料を、ある程度まともな体裁で書いておくことです。 近年のモダンな OSS やサービスのドキュメントは、読み手を意識したわかりやすい書籍のような文体が増えていると感じます。 そのあたりを参考にして、**業務のドキュメントをマークダウンや Web などの文章形式で書くことは良いトレーニング**になりそうです。

## 普段から各トピックの考えをまとめておく、論じ慣れておく

先ほど「何もない、あるいは混沌とした状態から、最初の形を生み出すことは、かなりの負荷がかかる」と書きました。 しかし今後目指していきたいのは、**そもそも「何もない、あるいは混沌とした状態」をスタート地点にするのではなく、「ある程度考えがまとまった状態」を普段から用意しておく**、ということです。

たとえば、私はこれまで Web アプリのしくみを何度も説明する機会があり、かなり「論じ慣れ」ていました。そのため今回の記事執筆でも、慣れた箇所はほぼ負荷なく文章を書くことができました。 他方で、今回調査や実践から始めることとなった CDN エッジに関わる箇所は、負荷が高かったように思います。

このように、普段から考えが整理され、論じ慣れているトピックは、執筆負荷が低くなります。 出版物を執筆するのだから当然といえば当然なのですが、いざ書くときに困らないよう、理解と考えを表明するアウトプットを定期的に出しておくことは重要だと感じます。

ベテランの執筆陣は、このあたりのベースの力がやはり強いのだと思います。 私自身も（最近全然できていない）技術ブログへの投稿などを増やして鍛えていきたいところです。

# おわりに

この記事では、「新卒 2 年目社員の Software Design 寄稿」について、その経緯と振り返りを行いました。

将来の自分が次の本や雑誌に挑戦するとき、この記事を見直した上で、良いものを作れればと思います。
また、技術書や雑誌の執筆に興味がある方にとって、イメージがより鮮明になり、挑戦する気持ちを後押しできれば幸いです。

