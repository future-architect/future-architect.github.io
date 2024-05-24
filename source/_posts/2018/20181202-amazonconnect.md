---
title: "AmazonConnect BootCampセッションでハンズオン受けてきた話"
date: 2018/12/02 14:21:59
postid: ""
tag:
  - AWS
  - ハンズオン
  - コールセンター
category:
  - Infrastructure
author: 市川諒
lede: "AmazonConnect BootCampセッションでハンズオン受けた知識を活かし、実際にコールセンターを作ってみました"
---

本記事は [フューチャー Advent Calendar 2018 2日目](https://qiita.com/advent-calendar/2018/future)の記事です。


# まえがき
近々東京リージョンに提供されることがアナウンスされたAmazonConnectのBootCampセッション@目黒に2018年10月に参加しました。

コールセンターソリューションはGoogleもContact Center AIの開始をアナウンスするなど、混戦が予想されるホットトピックだと思います。

AmazonConnectは海外・日本での導入事例も増えてきていますが、ブログはまだ数が少ないと思いますので、実際に手を動かした作った仕組みと合わせて共有します。

## AmazonConnect Session#day1 2018.11.06
### セールスと技術担当者からのAmazonConnectの説明

米AWSから営業のご担当とソリューションアーキテクトの方がいらっしゃって、両名からの講義という形でした。
完全に全編英語となりびっくりしましたが、日本AWSの方の通訳があるため安心です。

AWSの広告っぽくなってしまうので、サラッと記載します。

## Sales
### AmazonConnectについて
 - AmazonConnectのサービス自体は1.5年前から開始され、東京リージョンでのサービスインも決定している
 - 今となっては大規模な導入事例もあり、安定した実績がある。（海外では銀行やISP、アパレルなど様々）
 - もともとはAmazonのEC事業を支えるコールセンター業務向けのソリューション

### AmazonConnectのウリ
 - S3に録音データを保存したり、LambdaやSageMaker、Lexなどと連携させることで高度なコールセンターソリューションを提供できる
 - CRM（顧客管理システム）との連携も容易で、熟達していなくても1, 2時間で連携作業が完了できる
 - セールスポイントは利用料は使った分だけ。スケーラビリティにも優れているので、自分でスケールを意識しなくていい
    - オペレータが5人から5,000人に増えようと、クリスマス商戦があろうと、自動でスケールする
 - IVRやCTIみたいな大規模設備は不要で、インターネット回線だけあれば使える
 - おおよその顧客で25%程度の運用費節約ができている

## Solution Architect
### リージョン展開について
 - 東京リージョンのConnectは今現在インプリを行っている状態
 - 近いところではシドニーリージョン。日本の電話番号もここで取得可能

### AWSマネージドサービスとの連携
様々なサービスと連携可能で、特に下記のサービスとの連携事例が多いそうです。

| サービス                  | 概要                                                         |
| ------------------------- | ------------------------------------------------------------ |
| Lambda                    | 関数を実行して、DBやEC2などと連携させる。    この子のおかげで柔軟なソリューションを構築可能。 |
| Lex                       | 対話型インターフェースサービス。    IVRで一番イヤなのは耳に電話当てたり、キーバッド触ったりが頻発するところ。    あと、問い合わせ番号はえてして長いことが多いです。    Lexを使えば、しゃべった言葉を理解して、Lambdaの引数として渡す、とかできます。    ※日本語未対応・・・ |
| Polly                     | テキスト読み上げサービス。    自然な感じのイントネーションで文章を読み上げてくれる。    日本語対応済み。（Takumi（男性）とMizuki（女性））    SSMLにも対応しており、やろうと思えばかなり自然にできる。（初音ミク感） |
| S3                        | 言わずとしれたストレージサービス。    録音データの保存などに使われます。 |
| Kinesis Firehose, Streams | ストリーミングデータをリアルタイムに収集、処理するサービス。    ゼロ管理で若干タイムラグが発生してもいいならFirehose、    より高速な処理を求めるならStreamsをおすすめするとのこと。 |
| Redshift                  | DWHのサービス。Kinesisなどで取得したログをクエリできるように    保存するために利用します。 |
| Athena                    | Redshiftの友達ですが、よりライトなクエリ基盤。               |
| Glue                      | ETL（データ準備）サービス。RedshiftやAthenaに必要な情報だけ貯めるために使います。 |
| Quicksite                 | 情報可視化基盤。ライトにやるならKinesisで取得してGlueで必要情報だけ抜いて    Athenaでクエリ環境を整えてQuicksiteで見る。 |

例えば、以下のようなデモでAWSマネージドサービスとの連携が説明されました。

 - Kibanaで表示する[デモ](https://aws.amazon.com/jp/blogs/big-data/analyzing-amazon-connect-records-with-amazon-athena-aws-glue-and-amazon-quicksight/)をやってた。※URLではQuicksite
 - Amazon connectのコンソールでもリアルタイム/オンデマンドのデータを表示できる。（とはいえ可視化できるデータは少なめ）


### 3rd-Party システムとの連携
引用ですが、下記のスライドで説明がありました。
<img src="/images/20181202/photo_20181202_01.png" loading="lazy">


### CCP（ソフトフォン）の拡張
デフォルトのソフトフォンだと、必要なCRMの情報が出力できないなど、昨今の日本のコールセンター向けとしては利用に耐えられないと思われますが、拡張が可能になっています。

#### Streams API
 - Githubにてオープンソースで提供
 - CCP（ソフトフォン）を操作するAPI群
 - CCPの機能拡張や表示項目の追加などができる
 - iFrame with hidden divとか使うとCCPは非表示のまま、拡張された機能のみ利用可能
 - connect integration whitelisting: URLフィルタを使って、CCPにアクセスできるURLをフィルタリング可能
 - こんな[サイト](https://www.connectdemo.com) もある。（AWSの中の人作のデモ環境だそうです）

長くなりましたが、１日目はこのような流れで終了しました。
２日目は実際にハンズオンをしながらAmazonConnectでコールセンタソリューションを構築します。

## AmazonConnect Session#day2 2018.11.07

### Connectインスタンスの作成
<img src="/images/20181202/photo_20181202_02.png" style="border:solid 1px #000000" loading="lazy">


- 通常2つのインスタンスを作ることが多い（本番・検証）
- 既存のAWS Directory Serviceにリンクしたり、SAML2.0認証も可能
- 自動で2つのS3Bucketが作成される。（通話履歴、出力されたレポート用と問い合わせフローログ）
    - 設定カスタマイズをする場合は、録音データの暗号化キー（KMS）の選択や録音データの保存先Bucketの変更が可能
- 5Stepsでインスタンスに関わる全ての設定が完了する
- CloudFormationでの構築も可能
- 後ほど、AmazonConnect > インスタンスエイリアスから設定変更可能

### インスタンスの設定
<img src="/images/20181202/photo_20181202_03.png" style="border:solid 1px #000000" loading="lazy">


- テレフォニー：発信・着信をAmazonConnectで処理するか否かを設定
- データストレージ：S3/KMSの設定が可能。クレジット情報などを扱う場合は暗号化必須です
- データストリーミング：Kinesisに対するアクセス許可設定を有効にできる
- アプリケーション統合：CRMやWFM（ワークフォースマネジメント）システムと統合する設定が可能
- 問い合わせフロー：問い合わせフローの暗号化、Amazon Lexとの統合、問い合わせフローログの設定が可能

この画面に「管理者としてログイン」ボタンがありますが、セキュリティ的に通常利用はしないそう。（パスワード忘れのときのみ）AWSのルートアカウントのような扱いですね。
また、CloudFrontを経由しているらしく、若干不具合（ロードが遅いなど）が起きました（研修中に403 Error結構出てました...）

### 1. 電話番号の取得
ここからはAmazonConnectの管理画面にログインして操作をします。
<img src="/images/20181202/photo_20181202_04.png" loading="lazy">


- Direct Call（通常回線）とFree Dial（フリーダイヤル）が選択可能
    - 気になったのが、通常回線の050はいいとして、フリーダイヤルの0800は馴染みが無いですね
- 電話番号の管理から電話番号の取得/削除及び番号ごとのIVRフローの変更を行うことができる
- 日本の電話番号が取れない事象も起こり、そこのリソース枯渇もスコープに入れ、事前に確保しておくと無難です

### 2. 電話応対時間の設定
<img src="/images/20181202/photo_20181202_05.png" loading="lazy">


- オペレーション時間（Hours of operation）から実際に電話が通じる時間を決められる
    - TimezoneをAsia/Tokyoにすること！
    - 作成された段階ではキューがアタッチされていない状況になる。時間の適用を行う際はキューにアタッチをすること

### 3. キューの作成
<img src="/images/20181202/photo_20181202_06.png" loading="lazy">

- 先程作成したオペレーション時間（Hours of operation）との紐付けを行う
- Outbound caller ID nameで通知される際の表示文字を決められる
- Outbound caller ID numberで通知される電話番号を決められる
- Outbound whisper flowでキューごとに最初の音声を変えられる
- Maximum contacts in queueでキューに何人待たせられるかを決められる。ここは最大99になっているが、AWSへの緩和申請で上限を変えられる
- Quick connectsで他のキューに飛ばしたり、転送したりが可能

### 4. プロンプトの作成
<img src="/images/20181202/photo_20181202_07.png" loading="lazy">


- Create new promptにて相手に聞かせる音声の録音やファイルのアップロード（.wav）が可能
- 問い合わせフロー内でPollyに喋らせることも可能なので、フロー作成の際はそちらで手軽に代用も可能です
- 自然な人間の声や音楽が必要な際はここから登録して利用が必要です

### 5. 問い合わせフローの作成
<img src="/images/20181202/photo_20181202_08.png" style="border:solid 1px #000000" loading="lazy">

- サンプルのフローが20近くあり、それらを修正しても良いかも
- 基本はブロックをつないでいけばIVRが簡単に構築できます
    - Lambdaやその他連携ツールへの理解があれば、現場のCS担当でも高度な改善ができるかも
- Contact Flows
    - IVRで使用されるフローをグラフィカルに作成可能
    - 8つのFlowを定義可能
        - customer queue flow: キューに入ったときのフロー（ユースケース：品質改善のため録音しています、みたいな案内や録音処理、ロギング開始とか）
        - customer hold flow: 保留時にカスタマーが体験するフロー
        - customer whisper flow: エージェントが受信してから、実際に通話を初める直前にカスタマーが体験するフロー
        - outbound whisper flow: コールバックをエージェントが処理して、コールバック先が電話を取った時コールバックを受けた相手が体験するフロー（ユースケース：顧客情報を渡したり、引き継ぎ情報を渡したりできる）
        - agent hold flow: 保留時にエージェントが体験するフロー
        - agent whisper flow: エージェントが受信してから、実際に通話を初める直前にエージェントが体験するフロー（ユースケース：顧客情報を電話番号からDBに取得に行ってそれを表示するとか）
        - transfer to agent flow: あるエージェントが、別のエージェントにクイックコネクトで転送するときにあるエージェントが体験するフロー
        - transfer to queue flow: あるエージェントが、別のキューにクイックコネクトで転送するときにあるエージェントが体験するフロー
    - これらのフローを使って、フロー全体が大きくなりすぎないよう、フローをつないで利用するのがベストプラクティスとのこと

### Contact flow designer
<img src="/images/20181202/photo_20181202_09.png" loading="lazy">


- GUIのドラッグ・アンド・ドロップでフローを構築可能
- 複雑になりがちなので、拡大縮小機能あり
- 上述しましたが、ベストプラクティスとしては小さいフローを構築し、それらを結合するのが良い
- 以下のSetやInteractはFlowの種類によって若干使えるものが違う。（例えばhold系のFlowではLoopで音楽を流すみたいな機能が使える）

#### Interact
- ユーザ入力などのインタラクティブな処理を行う
- ユーザ入力の取得、保存、保留、プロンプトの再生が可能
- すべてのコネクタを接続する必要があり、AWSで用意されているのは
    - Error: Errorになったのをみたことは無いらしい
    - Default: 設定した番号以外をユーザが押した場合
    - Timeout: ユーザが何もしなかったとき

#### Set
- working queueを使ってLambdaと連携し、Dynamoと連携することで大量のキューを捌くなどのユースケースがある
- set contact attributesを使うことでキューの状態や3rd-PartyのAPIから取得したデータを使って顧客の氏名を取得・利用したり、LambdaでDBにアクセスしてその返り値を利用したりできる
- Routing ProfileでQueueに対するPriorityを変更できたが、IVRの選択や属性、時間を利用してContact flow designerにおいて呼単位でPriorityを変えることが可能。（キューでの滞留時間の長いものを優先的にする、など）
- Call back numberを利用することで、キューの滞留が解消されたらシステムから電話するようなシステムフローを構築することも可能。ユーザは一旦電話を切ることができるし、その間は課金が発生しない
- WebページにAPIを使ってCall backやCall meの機能を使うことが可能。もちろんAttributeも利用可能。

#### Branch
- ユーザ属性やキューの滞留などを基にフローを分けるなんてことも可能

#### Integrate
- Lambdaを使って様々な外部サービスと接続できる
- 通常Lambdaはcoldからの起動になるので、Timeoutはデフォルトの3秒から最大の8秒に修正しましょう（特に最初のLambdaの起動）
    - CloudWatchで30分間隔くらいでPingすれば常にWarmにしておける。

#### Terminate / Transfer
- Transfer flowを使うことで他のフローに転送することができ、フローを小さく保つことが可能
- Transfer Queueを使うことで後でかけ直す機能が作成できる。
- Transfer to phone numberを使うことで固定電話や携帯電話に転送することができる。もちろん、IP電話でもOK

#### エラー処理
- 適切なフローに投げるか接続を切るか、の処理を行い、通話の最初に戻る、みたいなことはLoopを起こすのでやめましょう。

#### 6. ルーティングプロファイルの作成
<img src="/images/20181202/photo_20181202_10.png" loading="lazy">


- Routing profilesはキューのグループになる -> 呼をどのようにエージェントに振り分けるかのグループ
- キューごとにプライオリティを決めることが可能
    - 優先度（Priority）は小さい方が優先される
    - 遅延（Delay）はキューに転送開始するまでの最低待ち時間
- キューの割当により、いわゆるスキルベース（エージェントのスキルによって割当を変える）のルーティングも可能

#### 7. ユーザー管理
- ユーザーマネジメントからユーザの追加/削除が可能
    - 追加する場合は手動入力 or CSVに入力してアップロードすることも可能。
    - またはAPIから登録することも可能
    - Security Profilesからは4つのロールが選択可能（自分で自作することも可能）

| ロール             | 説明                                                         |
| ----------------- | ------------------------------------------------------------ |
| Agent                    | 管理者用。全リソースへのアクセスと操作ができる。             |
| CallCenterManager | エージェント用。Contact Control Panel (CCP)へのアクセスのみ可能。 |
| Admin             | コンタクトセンター管理者用。ユーザーとアクセス権限、メトリクスおよび品質、ルーティングへのアクセスが可能。 |
| QualityAnalyst    | スーパーバイザー、コンタクトセンター管理者用。メトリクスおよび品質へのアクセスのみ可能。 |


#### 3rd-partyへのストリーム
レイテンシは当然気になりますよね？
顧客 -> Stream -> Speech to Textサービスのような形で日本語で話した内容を解釈してマネージドサービスと連携できるいい方法がないか知りたかったのですが、現時点（2018/11/07）では無いようです。
ただ、今後、以下は予定されているとのことです。

- Kinesis video streamを利用可能になる予定
- LEXの日本語対応はまだ先（ロードマップにはある）

## 実際に作ってみた

ECサイトで注文情報の変更・キャンセルを行う自動応答システムをイメージして、コールフローを作成しました。
前提として、注文番号とかお問い合わせ番号は長すぎるので、ダイアルプッシュでなく音声認識で受付ができるようにしました。

### フロー
1. 電話をかけるとDynamoDBから最近の注文情報を電話番号を基に取得して、「最近〇〇をご購入いただきましたが、これに関するご質問ですか？」と音声を流します
2. ここはIVRで分岐としました
    3. AIボットで注文情報の変更　→　「Change shipping date.」「Day after tomorrow」とか言うとDynamoDBにLambda経由で更新
    4. キャンセル　→　DynamoDBにLambda経由でキャンセルフラグを更新
    5. オペレータに電話転送
6. 上記1と2の場合はSMSもLambda経由で送るようにしました

#### 全体図
<img src="/images/20181202/photo_20181202_11.png" style="border:solid 1px #000000" loading="lazy">



### 手順
前提として、電話番号の取得などの基本的な設定は完了しているものとして進めます。

#### 先ずはDynamoDBにデモ用のデータを入れます。
 - JustinさんがNorth Faceのジャケットを買った的なデータです。

```sh デモデータ投入
$ aws dynamodb put-item --table-name CustomerTable --item '{
    "orderId": {"S": "100"},
    "orderedItem": {"S": "The North Face Summit L3 Ventrix 2.0 Hoodie"},
    "shippingDate": {"S": "2018-11-12"},
    "customerName": {"S": "Justin"},
    "CallerID": {"S": "+819012345678"},
    "isCancel": {"S": "False"}
}'
```

#### Lambdaを作成します。今回は下記の３つを作成しました。
エラーチェックとか不要な変数とか目を瞑ってください・・・。
キャンセルTrueでも配送日変更できるなどツッコミどころ満載です。

    1. 注文情報の読み込み（直近の注文履歴参照用）
    2. キャンセル書き込み用
    3. 配送情報変更用

##### 注文情報の読み込み（直近の注文履歴参照用）

```javascript OrderTableRead
var AWS = require("aws-sdk");
var docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  var CallerID = event.Details.Parameters.CallerID;
  var paramsQuery = {
    TableName: 'CustomerTable',
    KeyConditionExpression: "CallerID = :varNumber",
    ExpressionAttributeValues: { ":varNumber": CallerID }
  };

  docClient.query(paramsQuery, function(err, data) {
    if (err) {
      console.log(err);
      callback(null, buildResponse(false));
    }
    else {
      console.log("DynamoDB Query Results:" + JSON.stringify(data));

      if (data.Items.length === 0) {
        console.log("Customer not Found in CustomerTable");
        var recordFound = "False";
        callback(null, buildResponse(true, recordFound));
      }
      else {
        var recordFound = "True"
        var customerName = data.Items[0].customerName;
        var orderId = data.Items[0].orderId;
        var orderedItem = data.Items[0].orderedItem;
        var shippingDate = data.Items[0].shippingDate;
        var isCancel = data.Items[0].isCancel;
        callback(null, buildResponse(true, recordFound, customerName, orderId, orderedItem, shippingDate, isCancel));
      }
    }
  });
};

function buildResponse(isSuccess, recordFound, customerName, orderId, orderedItem, shippingDate, isCancel) {
  if (isSuccess) {
        return {
        recordFound: recordFound,
        customerName: customerName,
        orderId: orderId,
        orderedItem: orderedItem,
        shippingDate: shippingDate,
        isCancel: isCancel,
        lambdaResult: "Success"
        };
  }
  else {
    console.log("Lambda returned error to Connect");
    return { lambdaResult: "Error" };
  }
}

```
##### キャンセル書き込み用

```javascript CancelOrder
var AWS = require("aws-sdk");
var docClient = new AWS.DynamoDB.DocumentClient();
var sns = new AWS.SNS();

exports.handler = (event, context, callback) => {
  // 発信電話番号の取得
  var CallerID = event.Details.ContactData.CustomerEndpoint.Address;
  // 商品名, ID
  var orderedItem = event.Details.Parameters.orderedItem;
  var orderId = event.Details.Parameters.orderId;

  var params = {
    TableName: "CustomerTable",
    Key:{
        "CallerID": CallerID
    },
    UpdateExpression: "set isCancel = :c",
    ExpressionAttributeValues: {
        ":c": "True"
    },
    ReturnValues: "UPDATED_NEW"
  };

  docClient.update(params, function(err, data) {
    if (err) {
      console.log(err);
      callback(null, buildResponse(false));
    }
    else {
      console.log("DynamoDB record updated:" + params);
        var SMSparams = {
                    Message: 'We changed state to cancel.\nItem Name: ' + orderedItem + '\nOrder ID: ' + orderId,
                    MessageStructure: 'string',
                    PhoneNumber: CallerID
                    };
            sns.publish(SMSparams, function(err, data) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else     console.log(data);           // successful response
                    callback(null, buildResponse(true));
                    });
            }
  });
};

function buildResponse(isSuccess) {
  if (isSuccess) {
    return {
      lambdaResult: "Success"
    };
  }
  else {
    console.log("Lambda returned error to Connect");
    return { lambdaResult: "Error" };
  }
}

```
##### 配送日変更用

```javascript ChangeOrderDate
var AWS = require("aws-sdk");
var docClient = new AWS.DynamoDB.DocumentClient();
var sns = new AWS.SNS();

exports.handler = (event, context, callback) => {
  // 発信電話番号の取得
  var CallerID = event.Details.ContactData.CustomerEndpoint.Address;
  // 商品名, ID
  var orderedItem = event.Details.Parameters.orderedItem;
  var orderId = event.Details.Parameters.orderId;
  // 発送日
  var shippingDate = event.Details.Parameters.shippingDate;

  var params = {
    TableName: "CustomerTable",
    Key:{
        "CallerID": CallerID
    },
    UpdateExpression: "set shippingDate = :s",
    ExpressionAttributeValues: {
        ":s": shippingDate
    },
    ReturnValues: "UPDATED_NEW"
  };

  docClient.update(params, function(err, data) {
    if (err) {
      console.log(err);
      callback(null, buildResponse(false));
    }
    else {
      console.log("DynamoDB record updated:" + params);
        var SMSparams = {
                    Message: 'We changed shipping date to ' + shippingDate + '\nItem Name: ' + orderedItem + '\nOrder ID: ' + orderId,
                    MessageStructure: 'string',
                    PhoneNumber: CallerID
                    };
            sns.publish(SMSparams, function(err, data) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else     console.log(data);           // successful response
                    callback(null, buildResponse(true));
                    });
            }
  });
};

function buildResponse(isSuccess) {
  if (isSuccess) {
    return {
      lambdaResult: "Success"
    };
  }
  else {
    console.log("Lambda returned error to Connect");
    return { lambdaResult: "Error" };
  }
}
```

#### AmazonConnectからLambdaを呼び出すためのパーミッションの設定をします。（現状GUIからは設定不可）

- 併せてLambdaからDynamoDB/SNSへのFullAccessも許可しておきます（デモなのでセキュリティはご愛嬌で・・・）
- 本来はアクセスすべきリソースだけ指定してください
    - 読み込みだけのLambdaならDynamoDBへのReadOnlyなど

```bash AmazonConnectからLambdaを呼び出すためのパーミッションの設定
aws lambda add-permission --function-name function:<Lambda Function名> \
 --statement-id 1 --principal connect.amazonaws.com  \
 --action lambda:InvokeFunction --source-account <AWSアカウントID> \
 --source-arn <AmazonConnect ARN>
```
> ※ ARNはAWSコンソール > AmazonConnect > インスタンスエイリアス名　から確認できます。
<img src="/images/20181202/photo_20181202_12.png" style="border:solid 1px #000000" loading="lazy">


#### Lexとの連携を作成します。
先ずはLexチャットボットを用意しましょう。
右端の`Test ChatBot`からチャットボットのテストができます。

今回は下記しか設定してません。
 - Sample utterances：ここでの言葉に反応してLexがSlotを呼びます。
 - Slots："Sure, when?"とLexが聞いて来るので、その後の言葉をAMAZON.DATE型として認識します。

<img src="/images/20181202/photo_20181202_13.png" style="border:solid 1px #000000" loading="lazy">


##### Amazon LexとConnectを接続します。
下図の通り、Lexボットを作成したリージョンとボット名を選択して追加します。

<img src="/images/20181202/photo_20181202_14.png" style="border:solid 1px #000000" loading="lazy">


#### 最後にフローを作成します。
<img src="/images/20181202/photo_20181202_15.png" style="border:solid 1px #000000" loading="lazy">


かいつまんで説明すると、吹き出し部分が重要なところで、データの受け渡しで若干躓くところです。
個別に見ていきましょう。

##### 電話番号の取得
電話をかけてきた相手の電話番号はシステムの値で取得可能です。
宛先キーは使いやすい名称を設定すれば良いと思います。（今回はCallerIDでいきます）
<img src="/images/20181202/photo_20181202_16.png"  class="img-middle-size" style="border:solid 1px #000000" loading="lazy">


##### Lambdaの呼び出し
先程取得したCallerID（発信者電話番号）を引数としてセットします。
呼び出すLambdaのARNは関数画面から取得してきましょう。
<img src="/images/20181202/photo_20181202_17.png"  class="img-middle-size"  style="border:solid 1px #000000" loading="lazy">


##### 値のチェック
Lambda関数の戻り値をチェックできます。
ここでは発信者電話番号をキーとした注文情報レコードの有無を確認することを想定しています。
<img src="/images/20181202/photo_20181202_18.png" class="img-middle-size"  style="border:solid 1px #000000" loading="lazy">


##### ダイヤルプッシュを取得（IVR）
IVRの機能を枠ひとつでできてしまいます！
ここは特につまずくことなく設定可能かなと思います。
<img src="/images/20181202/photo_20181202_19.png"  style="border:solid 1px #000000" loading="lazy">


##### キャンセル関数
複数の引数を持つLambda関数にもちゃんとデータを渡すことができます。
<img src="/images/20181202/photo_20181202_20.png" style="border:solid 1px #000000" loading="lazy">


##### Lexで顧客の入力を取得
前項の「ダイヤルプッシュを取得（IVR）」と同様のことをLexを用いて実装可能です。
ボットを選択するだけなので、とても簡単に追加できます。
<img src="/images/20181202/photo_20181202_21.png" style="border:solid 1px #000000" loading="lazy">


##### 配送日変更関数の呼び出し
以前までと違うのが、Lexで取得してきた値を引数としたい点です。
素晴らしいことにこれもGUIで簡単に取れてしまいます。
（Lexの部分だけ抜き取っています。）
<img src="/images/20181202/photo_20181202_22.png" class="img-middle-size" style="border:solid 1px #000000" loading="lazy">


##### 完成！
これでフローの完成です！長丁場お疲れ様でした！
右上の保存・・・を押しても反映されないので、保存の右の▼をクリック→保存して発行を実行してください。

あとはしばらくして電話をかければ動作を確認できます！
多少クセはありますがとっても簡単ですね。

## まとめ

とっても長くなってしまいましたが、２日間非常に濃い内容のセッションでした。
やはりLambdaとの連携がとても強力で、基幹のシステムと連携して様々な活用が想像できますね！
AmazonConnectならではの強みを活かしてEC2インスタンスの再起動や、運用監視向けのシステムを作られている方もいて、非常に夢が広がるツールだと思いました。

この実習での作品が発想勝ちだったのか、AmazonConnectサンプルコールセンター対決で優勝をいただきましてechospotをもらえました！（ありがとうございます！）
<img src="/images/20181202/photo_20181202_23.jpeg" loading="lazy">

## 参考資料

 - [Amazon Connect Contact Center Blog Channel](https://aws.amazon.com/blogs/contact-center/)
 - [Salesforce Connector information](https://aws.amazon.com/jp/blogs/contact-center/building-an-automated-ai-experience-with-amazon-connect-and-salesforce-service-cloud/)
 - [Using Kibana to visualize contact center data](https://aws.amazon.com/blogs/contact-center/use-amazon-connect-data-in-real-time-with-elasticsearch-and-kibana/?nc1=b_rp)
 - [Using Athena and Quicksight to analyze Amazon Connect Data](https://aws.amazon.com/blogs/big-data/analyzing-amazon-connect-records-with-amazon-athena-aws-glue-and-amazon-quicksight/)
 - [Keeping your Lambda functions warm](https://read.acloud.guru/how-to-keep-your-lambda-functions-warm-9d7e1aa6e2f0)
 - [Building an automated holiday table](https://blogs.perficient.com/2017/12/20/building-an-amazon-connect-holiday-calendar-in-4-easy-steps/)
