---
title: "初めてのQuickSight"
date: 2025/05/13 00:00:00
postid: a
tag:
  - AWS
  - 入門
  - BI
  - 可視化
category:
  - DataScience
thumbnail: /images/2025/20250513a/thumbnail.png
author: 板垣翼
lede: "Amazon QuickSightの入門記事です。最近、業務で触れる機会があったので、これから入門される方々の取っ掛かりとなるような内容になるようまとめます。"
---
<img src="/images/2025/20250513a/thumnail.png" alt="thumnail.png" width="1200" height="500" loading="lazy">

# はじめに

初めまして、製造エネルギー事業部の板垣です。先日アコギを購入し学生時代ぶりにギター再燃中です。

[春の入門祭り2025](/articles/20250413a/)の15本目の記事ですが、技術ブログの投稿自体が初めてなためやや緊張しています。温かく見守っていただけますと幸いです。

Amazon QuickSightの入門記事です。最近、業務で触れる機会があったので、これから入門される方々の取っ掛かりとなるような内容になるようまとめます。

# QuickSightとは

QuickSightは、AWSが提供しているBI（Business Intelligence）サービスです。

BIで表示するデータの接続先には、AWS内の各種サービス（S3やRDSなど）に加え、企業のデータベースや外部サービス（Google BigQuery、Snowflakeなど）幅広く選択できます[^1]。目的に応じて、AWS内外のデータを収集／整形し、様々な情報を可視化できます。

QuickSightには様々なユーザを追加できます。AWSのルートユーザやIAMユーザだけでなく（企業の開発者やベンダーなど想定）や、例えばメール招待によって外部ユーザ（企業の経営者や顧客などを想定）を追加ことができます。各ユーザには個別のロールを付与できます。利用費はロール毎に異なり、2025年5月時点のロール別の料金は以下のようになっていました[^2]。

| ロール                   | 1ユーザあたりの料金［USD/月］ |
| :---------------------- | :----------------------------- |
| 作成者（Author）         | 24                              |
| 作成者プロ（Author Pro） | 50                              |
| 閲覧者（Reader）         | 3                               |
| 閲覧者プロ（Reader Pro） | 20                              |

また、Enterprise版では[グループ](https://docs.aws.amazon.com/ja_jp/quicksight/latest/user/creating-quicksight-groups.html)や[名前空間](https://docs.aws.amazon.com/ja_jp/quicksight/latest/user/namespaces.html)といった権限管理周りの仕組みが用意されているため、多様なユースケースに対応できます。

[^1]: QuickSightでサポートされているデータ接続先（データソース）は[こちら](https://docs.aws.amazon.com/ja_jp/quicksight/latest/user/supported-data-sources.html)から確認できます。
[^2]: 詳しい料金体系は[こちら](https://aws.amazon.com/jp/quicksight/pricing/)から確認できます。

# さっそく触ってみる

データを「収集／整形／可視化」する部分のみに注目すると、QuickSightは以下のような要素で構成されています。

各要素の正確な説明は[ドキュメント](https://docs.aws.amazon.com/ja_jp/quicksight/)に記載されていますが、ここではざっくりなイメージで説明しています。

また、図中の「テンプレート」については後ほど説明します。

1. **データソース**：QuickSightと外部データとの窓口。外部データにアクセスするための設定などを定義して利用します
2. **データセット**：可視化の目的に応じて加工されたデータ集合。データ集合どうしを組み合わせて利用が可能です
3. **分析**：データセットを元に様々なビジュアル（グラフや指標など）を作成しまとめたものです
4. **ダッシュボード**：名前の通りですが、分析で可視化した内容を参照だけできるようにしたものです
5. **SPICE**：可視化を効率的に実現するためのQuickSight専用の機構。データセットで定義されたデータを保持したり（外部データへの直接問い合わせなどが無くなる）、分析やダッシュボードの内部で走る計算を効率的に実現しているようです。SPICEは「Super-fast, Parallel, In-memory Calculation Engine」の略です

<img src="/images/2025/20250513a/QuickSightの構成イメージ.png" alt="QuickSightの構成イメージ" width="1162" height="894" loading="lazy">

ここではQuickSightの画面上での利用イメージを説明するため「データソース／データセットの準備からダッシュボードの公開まで」の一連の流れを順に説明します。

なお、作業するには作成者または管理者相当のロール権限が必要になりますのでご注意ください。ちなみに今回は、管理者ロールで実施しています。

## 0. アカウントの作成とユーザの登録

ダッシュボード作成の前に、QuickSightアカウントとユーザの登録が必要です（既に完了していればこちらの手順はスキップ可能です）。

AWSアカウントがない場合はAWSアカウントを作成した上で、以下のようにAWSのコンソール画面から検索することでQuickSightのアカウント作成画面へ遷移できます。

<img src="/images/2025/20250513a/検索結果.png" alt="検索結果" width="981" height="379" loading="lazy">

アカウント作成画面に進むと以下のような画面になる想定です（2025年5月時点）。

<img src="/images/2025/20250513a/アカウント作成1.png" alt="アカウント作成1" width="1200" height="606" loading="lazy">

そのまま「QuickSightにサインアップ」へ進むと、アカウント作成に必要な情報を求めらるので入力して進めましょう。

Lambdaのような他のAWSリソースと異なり、QuickSightアカウントはAWSアカウントに1つしか作ることができません。アカウントを複数の方が利用する場合などは、アカウント名などの設定内容については予め相談しておくと良いと思います（もちろん後から変更可能な設定もあります）。

<img src="/images/2025/20250513a/アカウント作成2.png" alt="アカウント作成2" width="1200" height="574" loading="lazy">

入力を終え、無事作成が完了するとQuickSightの画面に遷移できます。

<img src="/images/2025/20250513a/アカウント作成3.png" alt="アカウント作成3" width="1200" height="548" loading="lazy">

アカウント作成後は、同じAWSアカウント内のルートユーザやIAMユーザであればそのままコンソール画面からログインできます（初回ログイン時だけ確認のためのダイアログ画面は表示されます）。

また前述の通り外部のユーザも管理者からの招待を受けることでログイン可能です。いずれも初回のログイン以降、ユーザロールに応じて前述したような料金が発生しますのでユーザの管理は気を付ける必要があります。

## 1. データソース／データセットを準備する

自身のユーザでQuickSightにログインした後、以下の画面に遷移するので画面左側のデータセット項目を選択した後、右上にある「新しいデータセット」を押します。

<img src="/images/2025/20250513a/サインイン後の画面.png" alt="サインイン後の画面" width="1200" height="739" loading="lazy">

データソース（新規または既存）を選択する画面に遷移するので、目的のデータソースを選択し、必要があれば設定（データベースなら接続先の設定など）を行います。

ここでは単純な「ファイルのアップロード」による方法で新規データセットを作成します。取り込むデータは、2014年4月から2025年3月までの東京の日別の平均気温で、[気象庁のページ](https://www.data.jma.go.jp/risk/obsdl/index.php)からダウンロードし、整形したものです。

データソースの各種設定が最後まで進むと以下のようなダイアログが出るため「データの編集/プレビュー」に進みます。

<img src="/images/2025/20250513a/データソースの選択.png" alt="データソースの選択" width="1200" height="976" loading="lazy">

進むと以下のような画面に遷移します。ここで、この後の作業のために画像の「計算フィールドを追加」からデータの取込元に存在しない項目（日付）を用意します。

計算フィールドは、既存のデータ項目と演算子、専用の関数などを利用することでデータセットに新しいデータ項目を追加できる仕組みです。

<img src="/images/2025/20250513a/データセットの準備1.png" alt="データセットの準備1" width="1200" height="788" loading="lazy">

計算フィールドの編集画面で、項目名と以下の計算式を入力し画像右上の「保存」で追加します。

計算式の詳しい説明は[QuickSightのユーザガイド](https://docs.aws.amazon.com/ja_jp/quicksight/latest/user/working-with-calculated-fields.html)などが参考になりますが、表計算アプリ（ExcelやGoogleスプレッドシートなど）を利用されたことのある方であれば、セルに入力する計算式のようなイメージに近いかと思います。

```txt
parseDate(concat(toString({年}), "/", toString({月}), "/", toString({日})), "yyyy/MM/dd")
```

<img src="/images/2025/20250513a/データセットの準備2.png" alt="データセットの準備2" width="1200" height="894" loading="lazy">

完了すると以下の画面に戻るので画像右上の「保存して公開」を押します。

<img src="/images/2025/20250513a/データセットの準備3.png" alt="データセットの準備3" width="1200" height="838" loading="lazy">

最初のデータセット一覧画面に戻り、新しくデータセットが作成されていればデータセットの準備は完了です。

<img src="/images/2025/20250513a/データセットの準備4.png" alt="データセットの準備4" width="1200" height="736" loading="lazy">

## 2. 分析を作成する

用意したデータセットを元に分析を作成します。

先ほどのデータセット一覧画面に新しく作成されたデータセットの右端から「分析の作成」に進みます。

<img src="/images/2025/20250513a/分析の作成1.png" alt="分析の作成1" width="1200" height="757" loading="lazy">

分析は以下のような画面で作成することになります。画像左側に見えているのが先ほど準備したデータセットです（見てわかる通り計算フィールドはここからでも追加可能です）。今回は特に実施していませんが、複数のデータセットを分析に追加も可能です。

<img src="/images/2025/20250513a/分析の作成2.png" alt="分析の作成2" width="1200" height="723" loading="lazy">

試しに、先ほど準備した計算フィールド（日付）と平均気温を使ってグラフを作成してみます。

ビジュアル（折れ線グラフや円グラフなど、表示したいグラフの種類）を選択し、データセットから表示する項目を選択することで簡単にグラフを描画できます。

<img src="/images/2025/20250513a/分析の作成3.png" alt="分析の作成3" width="1200" height="716" loading="lazy">

適宜見た目を整え、準備したデータセットを元に、目的に応じた内容を分析に用意していきます。

今回は最終的に以下のようになりました。気温の表示期間をユーザが自由に調整できるよう「コントロール（画像上側に見える入力パラメータのような欄）」という機能を利用していますが、他にも様々な機能があるので実際に触ってみると面白いかと思います。

<img src="/images/2025/20250513a/分析の作成4.png" alt="分析の作成4" width="1200" height="982" loading="lazy">

## 3. ダッシュボードを公開する

ダッシュボードの公開は簡単です。先ほど作成した分析の画面から右上にある「公開」ボタンからダッシュボードを公開できます。

<img src="/images/2025/20250513a/ダッシュボードの公開1.png" alt="ダッシュボードの公開1" width="1200" height="771" loading="lazy">

以下の一覧画面でも作成されたことが確認できます。

<img src="/images/2025/20250513a/ダッシュボードの公開2.png" alt="ダッシュボードの公開2" width="1200" height="606" loading="lazy">

分析なども同じですが、作成したダッシュボードは、QuickSightの他ユーザやグループなどへ共有できます。

# もう少し踏み込んでみる

他のAWSサービスと同様に[QuickSightではいくつかのAPI](https://docs.aws.amazon.com/ja_jp/quicksight/latest/APIReference/API_Operations.html)が提供されており、付随してCLI（Command Line Interface）や各種SDKも整備されています。

これらを利用することで他サービスとの連携や、QuickSightの各種リソースのコード管理などができます。既にTerraformやCloudFormationなどに代表されるIaC（Infrastructure as Code）ツールも充実してきているようです[^3]。

[^3]: TerraformやCloudFormationで扱える内容は[こちら](https://github.com/hashicorp/terraform-provider-aws/tree/main/internal/service/quicksight)や[こちら](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/AWS_QuickSight.html)などで確認できます。特にTerraformでは、寄稿した2025年5月時点でほとんどのリソースに対応していそうです。

APIを利用することで、より高度なユースケースを実現できるようになります。ここでは、APIのみで利用可能なQuickSightの仕組み（テンプレート）を題材に、CLIの利用例をご紹介します。使用したAWS CLIのバージョンは以下の通りです。

```sh
$ aws --version
aws-cli/2.17.33 Python/3.11.9 Linux/5.15.153.1-microsoft-standard-WSL2 exe/x86_64.ubuntu.22
```

## 例：テンプレートで同じ見た目のダッシュボードを作成する

QuickSightには[テンプレート](https://docs.aws.amazon.com/ja_jp/quicksight/latest/developerguide/template-operations.html)という仕組みがあり、これを利用することで既存の分析やダッシュボードの雛形を同一のQuickSightアカウント内や別のQuickSightアカウントに共有できます（公式ではカプセル化／抽象化するなどと表現されていました）。

共有されたテンプレートとそのスキーマを満たすデータセットを元に、既存のものと同じ（表示しているデータの中身だけ異なる）分析やダッシュボードを作成できます。例えば、開発環境に用意した分析やダッシュボードを本番環境に同じ見た目のものを作成したい、といった場面で利用できると思います。

AWS CLIを利用して[先ほど](#さっそく触ってみる)を作成した東京の平均気温をテンプレートとして、別地点（北海道宗谷岬）で同じ見た目のダッシュボードを作成してみます[^4]。

[^4]: QuickSightのCLIのドキュメントは[こちら](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/quicksight/index.html#cli-aws-quicksight)から確認できます。

テンプレートを作成するために、先ほど作成したデータセットと分析のARNをCLIを使って取得しておきます。

```bash
# データセットのARNを取得する例
$ aws quicksight list-data-sets \
  --aws-account-id ${AWS_ACCOUNT_ID} \
  --query 'DataSetSummaries[?Name==`tokyo_kion_2014-2024`].Arn' \
  --output text \
  --profile ${AWS_PROFILE}

arn:aws:quicksight:ap-northeast-1:${AWS_ACCOUNT_ID}:dataset/${DATA_SET_ID}

# 分析のARNを取得する例
$ aws quicksight list-analyses \
  --aws-account-id ${AWS_ACCOUNT_ID} \
  --query 'AnalysisSummaryList[?Name==`tokyo_kion_2014-2024 analysis`].Arn' \
  --output text \
  --profile ${AWS_PROFILE}

arn:aws:quicksight:ap-northeast-1:${AWS_ACCOUNT_ID}:analysis/${ANALYSIS_ID}
```

取得したARNを元に以下の形式のファイルを用意します。

```json template_source_entity.json
{
  "SourceAnalysis": {
    "Arn": "{先ほど取得した分析のARN}",
    "DataSetReferences": [
      {
        "DataSetPlaceholder": "kion-data-set",
        "DataSetArn": "{先ほど取得したデータセットのARN}"
      }
    ]
  }
}
```

作成したファイルを元にテンプレートを作成できます。

以下のコマンドでは指定していませんが、`--permission`オプションを利用することで、指定先（本番環境など）へテンプレートの参照権限を付与できます。

作成されたテンプレートは、`describe-template`のAPIなどから確認できます。

```bash
$ aws quicksight create-template \
  --aws-account-id ${AWS_ACCOUNT_ID} \
  --template-id kion-template \
  --name 'Kion Template' \
  --source-entity file://${PWD}/template_source_entity.json \
  --profile ${AWS_PROFILE}
```

続いて、テンプレートを元に別地点（北海道宗谷岬）のデータを同じように表示するダッシュボードを作成します。

作成のため以下の形式のファイルを用意します。説明は省略していますが、あらかじめ別地点のデータセットを用意しておく必要があります。

```json dashboard_source_entity.json
{
  "SourceTemplate": {
    "DataSetReferences": [
      {
        "DataSetPlaceholder": "kion-data-set",
        "DataSetArn": "{別地点（北海道宗谷岬）の平均気温のデータセットのARN}"
      }
    ],
    "Arn": "{先ほど作成したテンプレートのARN}"
  }
}
```

また、作成されたダッシュボードをQuickSightの画面上で閲覧するために既存のダッシュボード（東京の平均気温）から同じ権限情報を取得しておきます。

以下で指定している`ダッシュボードのID`は、`describe-dashboard`のAPIなどから確認できます。

```bash
$ aws quicksight describe-dashboard-permissions \
  --aws-account-id ${AWS_ACCOUNT_ID} \
  --dashboard-id ${ダッシュボードのID} \
  --query 'Permissions' \
  --profile ${AWS_PROFILE} > permissions.json
```

作成したテンプレートと用意した情報を元に、別地点のダッシュボードは以下のように作成します。

```bash
$ aws quicksight create-dashboard \
  --aws-account-id ${AWS_ACCOUNT_ID} \
  --dashboard-id soyamisaki-kion-dashboard \
  --name '宗谷岬の平均気温' \
  --permissions file://${PWD}/permissions.json \
  --source-entity file://${PWD}/dashboard_source_entity.json \
  --profile ${AWS_PROFILE}
```

QuickSightの画面を見ると作成したダッシュボードが追加されていることがわかります（グラフのタイトルに「東京」となっていますが元のダッシュボードをそのままテンプレートに利用したためです。わかりづらいですが表示しているデータは別地点の情報になっています）。

<img src="/images/2025/20250513a/別地点のダッシュボードを作成1.png" alt="別地点のダッシュボードを作成1" width="1200" height="634" loading="lazy">

作成されたダッシュボードは[一番初めに作った](#さっそく触ってみる)見た目と同じであることがわかります。

<img src="/images/2025/20250513a/別地点のダッシュボードを作成2.png" alt="別地点のダッシュボードを作成2" width="1200" height="838" loading="lazy">

# まとめ

QuickSightを入門しようと検討されている方向けの内容をまとめました。後半はやや難しくなりましたが、これからQuickSightを使いこなす上でも必要な内容かと思っています。

ここまで読んでくださりありがとうございました。

初めての寄稿でうまく書けたか不安ではありますが良い経験となりました。これからも機会があれば挑戦していきたいなと思っています。

# 参考資料

* [ワークショップ :: Amazon QuickSight ハンズオン](https://awsj-assets-qs.s3.ap-northeast-1.amazonaws.com/workshop/public/jp/03-workshop.html)
* [QuickSightで作成した分析を、テンプレート機能を使って別アカウントへ配布してみる](https://dev.classmethod.jp/articles/quicksight-analysis-template/)
