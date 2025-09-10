---
title: "AWS Application Composerを使ってみた！"
date: 2023/05/09 00:00:00
postid: a
tag:
  - AWS
  - ノーコード
  - サーバーレス
category:
  - Infrastructure
thumbnail: /images/2023/20230509a/thumbnail.png
author: 佐藤更星
lede: "2023/03/07から一般提供が開始された新サービス「AWS Application Composer」を使ってみて、どんな人向けか、強み・弱みは何かというところを見ていきます。"
---
## あいさつ

こんにちは。金融グループ所属の佐藤です。
[春の入門祭り](/articles/20230417a/)の13日目の記事となります。

2023/03/07から一般提供が開始された新サービス「AWS Application Composer」を使ってみて、どんな人向けか、強み・弱みは何かというところを見ていきます。

## AWS Application Composerとは？

以下、公式の概要文です（引用元: [Application Composer | ホーム](https://console.aws.amazon.com/composer/home)）

> AWS Application Composer は、サーバーレスアプリケーションのアーキテクチャ設定、構築の合理化と高速化を支援します。
シンプルなドラッグ&ドロップのワークフローを使用して、アプリケーションのデプロイに必要な構成が自動的に生成されます。
Infrastructure as Code は、AWS CloudFormation と AWS サーバーレスアプリケーションモデルをベースにしています。

ざっくりまとめると、

- AWSサービスを用いた **アーキテクチャの構築を支援** するよ
- **ドラッグ&ドロップ** を使って直感的に操作ができるよ
- 裏側ではCFnとSAMを使ってるから **テンプレートを共有** できるよ

と書いていて、特に2つ目のドラッグ&ドロップができるよ！ というのがキャッチコピーとなっています。

具体的には以下の画像のように、あるサービスから別のサービスを呼びます、というのをより視覚的に、直感的に表現できます。

<img src="/images/2023/20230509a/スクリーンショット_2023-05-07_23.07.19.png" alt="" width="1200" height="453" loading="lazy">

※ドラッグ&ドロップでサービスを配置して、サービス同士を線で繋いでいくイメージ

## サービスの特徴

### コストについて

以下、公式のQ＆Aです。(引用元：[FAQ](https://aws.amazon.com/jp/application-composer/faq))
> Q: AWS Application Composer にはどの程度のコストがかかりますか?
AWS Application Composer は追加料金なしで使用できます。
手動で作成した場合と同じ方法で、AWS Application Composer を使用して作成された AWS リソース (S3 バケットや Lambda 関数など) の料金をお支払いいただきます。
実際に使用した分の料金のみをお支払いいただきます。
最低料金や前払いの義務は発生しません。

ということで、Application Composerを使ったからと言って**追加の料金は掛からない**とのことでした。

### 対応しているサービス

現時点でGUI上で確認できるサービスは以下です。

<img src="/images/2023/20230509a/スクリーンショット_2023-05-07_23.37.44.png" alt="" width="1200" height="651" loading="lazy">

※API gateway / Cognito UserPool / Cognito UserPoolClient / DynamoDB Table / EventBridge Event rule / EventBridge Schedule / Kinesis Stream / Lambda Function / Lambda Layer / S3 Bucket / SNS Topic / SQS Queue / Step Functions State machine

ということで基本的なサービスは揃っているため、**シンプルな構成では困らなさそう**という印象でした。
一方、ここにないサービスを使いたい場合はこれだけで完結させることは出来ないため、Application Composerを使うか検討している人は要チェックです。

#### 使えるリージョン

現在利用できるリージョンは以下。

- 米国東部 (オハイオ)
- 米国東部 (バージニア北部)
- 米国西部 (オレゴン)
- アジアパシフィック (シンガポール)
- アジアパシフィック (シドニー)
- アジアパシフィック (東京)
- 欧州 (フランクフルト)
- 欧州 (アイルランド)
- 欧州 (ストックホルム)

ということで、東京リージョンやコストの安い米国各地域のリージョンが入っているので、リソースの配置場所に**特殊な要件がない場合は特に困らなさそう**と思いました。

## どんな人向け？

ここまでをまとめると、

- 直感的に操作できる
- 追加コストはなし
- 主要サービスは使える
- 主要地域で使える

という特徴がApplication Composerにはあると分かったため、個人的に

- シンプルな構成のサービスを爆速で作りたい人
- AWSインフラの構築練習をしてみたい人

あたりにオススメなのかなと思いました。
良くも悪くも想定された構成であれば**非常に楽に**インフラ構築ができるため、前者ではスピード感、後者では手軽さに繋がると思い抜擢してみました。

## 実際に使ってみた

...と、長々特徴について語ってしまいましたが、ここから実際に触ってみて使い勝手や感想を述べてみようかと思います。

#### やりたい構成

以下のようなSPAを使ったwebアプリを想定して作ってみようと思います。
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.02.00.png" alt="スクリーンショット_2023-05-09_1.02.00.png" width="520" height="431" loading="lazy">

#### やってみた

1. まずはAWSコンソールの検索窓で`Application Composer`と検索
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.48.43.png" alt="スクリーンショット_2023-05-09_1.48.43.png" width="1200" height="611" loading="lazy">

1. Application Composerのホーム画面が開けました
<img src="/images/2023/20230509a/スクリーンショット_2023-05-08_0.33.05.png" alt="スクリーンショット_2023-05-08_0.33.05.png" width="1200" height="615" loading="lazy">

1. `プロジェクトの作成`を押下して、もろもろの設定をして空のプロジェクトを`Create`してみます
<img src="/images/2023/20230509a/スクリーンショット_2023-05-08_0.32.47.png" alt="スクリーンショット_2023-05-08_0.32.47.png" width="1200" height="615" loading="lazy">

1. 編集画面っぽいのが開けました
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.03.16.png" alt="スクリーンショット_2023-05-09_1.03.16.png" width="1200" height="611" loading="lazy">

1. `やりたい構成`を見つつ、左のメニューからリソースを雑にドラッグ&ドロップしましょう
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.18.55.png" alt="スクリーンショット_2023-05-09_1.18.55.png" width="1200" height="611" loading="lazy">

1. 論理IDを設定してよりそれっぽくします
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.26.39.png" alt="スクリーンショット_2023-05-09_1.26.39.png" width="1200" height="611" loading="lazy">

1. APIgatewayの中身が寂しかったのでAuthorizer(認可)とエンドポイントの設定を追加します
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.31.59.png" alt="スクリーンショット_2023-05-09_1.31.59.png" width="1200" height="611" loading="lazy">

1. 再度`やりたい構成`を見て、アクセスを許可したいリソース同士を線で繋ぎます
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.34.49.png" alt="スクリーンショット_2023-05-09_1.34.49.png" width="1200" height="611" loading="lazy">

1. 見た目が汚いので`Arrange`ボタンを押して整形します
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.36.28.png" alt="スクリーンショット_2023-05-09_1.36.28.png" width="1200" height="611" loading="lazy">

1. あっという間にこれで完成です。最後にTemplateを押して出来上がったテンプレートを見てみましょう
<img src="/images/2023/20230509a/スクリーンショット_2023-05-09_1.38.04.png" alt="スクリーンショット_2023-05-09_1.38.04.png" width="1200" height="611" loading="lazy">

※全文は長いので折りたたみで添付しておきます（見たい人向け）。クリックしてください。

<details><summary>作成したテンプレート</summary><div>

```yaml
Transform: AWS::Serverless-2016-10-31
Resources:
  uploadFugaFile:
    Type: AWS::Serverless::Function
    Properties:
      Description: !Sub
        - Stack ${AWS::StackName} Function ${ResourceName}
        - ResourceName: uploadFugaFile
      CodeUri: src/Function2
      Handler: index.handler
      Runtime: nodejs18.x
      MemorySize: 3008
      Timeout: 30
      Tracing: Active
      Events:
        awesomeApiPOSTapifugasupload:
          Type: Api
          Properties:
            Path: /api/fugas/upload
            Method: POST
            RestApiId: !Ref awesomeApi
      Environment:
        Variables:
          BUCKET_NAME: !Ref fugaFileBucket
          BUCKET_ARN: !GetAtt fugaFileBucket.Arn
          TABLE_NAME: !Ref hogeTable
          TABLE_ARN: !GetAtt hogeTable.Arn
      Policies:
        - Statement:
            - Effect: Allow
              Action:
                - s3:GetObject
                - s3:GetObjectAcl
                - s3:GetObjectLegalHold
                - s3:GetObjectRetention
                - s3:GetObjectTorrent
                - s3:GetObjectVersion
                - s3:GetObjectVersionAcl
                - s3:GetObjectVersionForReplication
                - s3:GetObjectVersionTorrent
                - s3:ListBucket
                - s3:ListBucketMultipartUploads
                - s3:ListBucketVersions
                - s3:ListMultipartUploadParts
                - s3:AbortMultipartUpload
                - s3:DeleteObject
                - s3:DeleteObjectVersion
                - s3:PutObject
                - s3:PutObjectLegalHold
                - s3:PutObjectRetention
                - s3:RestoreObject
              Resource:
                - !Sub arn:${AWS::Partition}:s3:::${fugaFileBucket}
                - !Sub arn:${AWS::Partition}:s3:::${fugaFileBucket}/*
        - DynamoDBCrudPolicy:
            TableName: !Ref hogeTable
  uploadFugaFileLogGroup:
    Type: AWS::Logs::LogGroup
    DeletionPolicy: Retain
    Properties:
      LogGroupName: !Sub /aws/lambda/${uploadFugaFile}
  getTemplate:
    Type: AWS::Serverless::Function
    Properties:
      Description: !Sub
        - Stack ${AWS::StackName} Function ${ResourceName}
        - ResourceName: getTemplate
      CodeUri: src/Function3
      Handler: index.handler
      Runtime: nodejs18.x
      MemorySize: 3008
      Timeout: 30
      Tracing: Active
      Events:
        awesomeApiGET:
          Type: Api
          Properties:
            Path: /*
            Method: GET
            RestApiId: !Ref awesomeApi
      Environment:
        Variables:
          BUCKET_NAME: !Ref templateBucket
          BUCKET_ARN: !GetAtt templateBucket.Arn
      Policies:
        - Statement:
            - Effect: Allow
              Action:
                - s3:GetObject
                - s3:GetObjectAcl
                - s3:GetObjectLegalHold
                - s3:GetObjectRetention
                - s3:GetObjectTorrent
                - s3:GetObjectVersion
                - s3:GetObjectVersionAcl
                - s3:GetObjectVersionForReplication
                - s3:GetObjectVersionTorrent
                - s3:ListBucket
                - s3:ListBucketMultipartUploads
                - s3:ListBucketVersions
                - s3:ListMultipartUploadParts
                - s3:AbortMultipartUpload
                - s3:DeleteObject
                - s3:DeleteObjectVersion
                - s3:PutObject
                - s3:PutObjectLegalHold
                - s3:PutObjectRetention
                - s3:RestoreObject
              Resource:
                - !Sub arn:${AWS::Partition}:s3:::${templateBucket}
                - !Sub arn:${AWS::Partition}:s3:::${templateBucket}/*
  getTemplateLogGroup:
    Type: AWS::Logs::LogGroup
    DeletionPolicy: Retain
    Properties:
      LogGroupName: !Sub /aws/lambda/${getTemplate}
  hogeTable:
    Type: AWS::DynamoDB::Table
    Properties:
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      BillingMode: PAY_PER_REQUEST
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
  insertHoge:
    Type: AWS::Serverless::Function
    Properties:
      Description: !Sub
        - Stack ${AWS::StackName} Function ${ResourceName}
        - ResourceName: insertHoge
      CodeUri: src/Function
      Handler: index.handler
      Runtime: nodejs18.x
      MemorySize: 3008
      Timeout: 30
      Tracing: Active
      Events:
        awesomeApiPOSTapihogesinsert:
          Type: Api
          Properties:
            Path: /api/hoges/insert
            Method: POST
            RestApiId: !Ref awesomeApi
      Environment:
        Variables:
          TABLE_NAME: !Ref hogeTable
          TABLE_ARN: !GetAtt hogeTable.Arn
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref hogeTable
  insertHogeLogGroup:
    Type: AWS::Logs::LogGroup
    DeletionPolicy: Retain
    Properties:
      LogGroupName: !Sub /aws/lambda/${insertHoge}
  fugaFileBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${AWS::StackName}-fugafileb-${AWS::AccountId}
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms
              KMSMasterKeyID: alias/aws/s3
      PublicAccessBlockConfiguration:
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
  fugaFileBucketBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref fugaFileBucket
      PolicyDocument:
        Id: RequireEncryptionInTransit
        Version: '2012-10-17'
        Statement:
          - Principal: '*'
            Action: '*'
            Effect: Deny
            Resource:
              - !GetAtt fugaFileBucket.Arn
              - !Sub ${fugaFileBucket.Arn}/*
            Condition:
              Bool:
                aws:SecureTransport: 'false'
  templateBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${AWS::StackName}-templateb-${AWS::AccountId}
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms
              KMSMasterKeyID: alias/aws/s3
      PublicAccessBlockConfiguration:
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
  templateBucketBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref templateBucket
      PolicyDocument:
        Id: RequireEncryptionInTransit
        Version: '2012-10-17'
        Statement:
          - Principal: '*'
            Action: '*'
            Effect: Deny
            Resource:
              - !GetAtt templateBucket.Arn
              - !Sub ${templateBucket.Arn}/*
            Condition:
              Bool:
                aws:SecureTransport: 'false'
  awesomeApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub
        - ${ResourceName} From Stack ${AWS::StackName}
        - ResourceName: awesomeApi
      StageName: Prod
      DefinitionBody:
        openapi: '3.0'
        info: {}
        paths:
          /api/hoges/insert:
            post:
              x-amazon-apigateway-integration:
                httpMethod: POST
                type: aws_proxy
                uri: !Sub arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${insertHoge.Arn}/invocations
              responses: {}
          /api/fugas/upload:
            post:
              x-amazon-apigateway-integration:
                httpMethod: POST
                type: aws_proxy
                uri: !Sub arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${uploadFugaFile.Arn}/invocations
              responses: {}
          /*:
            get:
              x-amazon-apigateway-integration:
                httpMethod: POST
                type: aws_proxy
                uri: !Sub arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${getTemplate.Arn}/invocations
              responses: {}
      EndpointConfiguration: REGIONAL
      TracingEnabled: true
      Auth:
        Authorizers:
          awesomeAuthorizer:
            UserPoolArn: !GetAtt awesomeUserPool.Arn
  awesomeUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      AdminCreateUserConfig:
        AllowAdminCreateUserOnly: false
      AliasAttributes:
        - email
        - preferred_username
      UserPoolName: !Sub ${AWS::StackName}-awesomeUserPool
```

</div></details>

#### やってみた感想

とにかくお手軽なことに驚きました。上述の **やってみた** はスクリーンショットを撮る時間を除けば5分も掛からなかったため、タイポに苦しみながら手書きするのと比べると雲泥の差を感じました。また、環境構築が不要＋GUIだけで完結できるため、今後思い立った時にサクッと作れちゃうなと引き出しを増やすことが出来ました。

一方で、上述の構成に例えばCloudFrontを追加したいと思った時にApplication Composerだけではできないため、やはり"型にハマれば強い"系のサービスではあるなと思いました。

## おわりに

最後まで読んでいただきありがとうございました。

今後も新しめの情報に目を光らせ、興味が沸いたらまた記事にしようと思います。

では、Futureの春の入門祭りはまだまだ続きますということで、次回担当の 高世駿 さんの [正規表現入門](/articles/20230510a/) です。
