---
title: "API GatewayとLambdaで実装するプライベートなMCPサーバー"
date: 2026/03/24 00:00:00
postid: a
tag:
  - MCP
  - Lambda
  - Dify
  - APIGateway
category:
  - Infrastructure
thumbnail: /images/2026/20260324a/thumbnail.png
author: 木村太陽
lede: "Strategic AI Group/MLOpsチームでアルバイトをしている木村です。アルバイトでは最新技術の調査を担当し、社内や案件にて活用することを想定したシステム導入の検証を実施しています。AWS上のLambdaで自作したプライベートなMCPサーバーをDify上で使用する手順について記事にします。"
---
Strategic AI Group/MLOpsチームでアルバイトをしている木村です。アルバイトでは最新技術の調査を担当し、社内や案件にて活用することを想定したシステム導入の検証を実施しています。プライベートではエンジニアにありがちな(?)運動不足解消として、マラソンをしていて、47都道府県制覇を目指しています。

今回はAWS上のLambdaで自作したプライベートなMCPサーバーをDify上で使用する手順について記事にします。これから社内でもどんどん広がっていくであろうMCPを使っていてとても面白かったので、ぜひ皆さんも本記事を参考に試してみてください！

# 概要

「社内でLLMに様々なスキルを持たせたい」というのは、多くの企業が抱える要望です。本記事では、AWS Lambda上に自作のプライベートなMCP（Model Context Protocol）サーバーを構築し、それをDifyから呼び出す手順を解説します。

セキュリティを担保しつつ、誰もが簡単にAIアプリを構築できる環境の「第一歩」を目指します。

最終的には以下のようにDifyからMCPサーバーにアクセスできます。

以下のツールではこんにちはに対してHELLOを返すcalculate_helloというmcpツール、計算について、足し算、掛け算、引き算を行うcalculate_add,calculate_product,calculate_subというmcpツールが使われています。

<img src="/images/2026/20260324a/image.png" alt="image.png" width="844" height="724" loading="lazy">

これを応用してWeb検索を行ったり、Googleカレンダーに予定を自動で入れることができます。

# 本記事のキーテクノロジー

## Dify

- [Dify公式サイト](https://dify.ai/jp)

Difyは、LLMアプリを直感的に開発できるオープンソースのLLMアプリ開発プラットフォームです。RAG（検索拡張生成）やエージェント機能を手軽に実装できるのが特徴です。

本記事では社内ネットワークのEC2でDifyを動かすことでプライベートな構築を実現しています。

## MCP

Anthropicが公開したMCPは(参考：[Model Context Protocol（MCP）とは](https://zenn.dev/cloud_ace/articles/model-context-protocol))、LLMと外部データ（DB、API、ローカルファイル等）を接続するためのオープンプロトコルです。これまではツールごとに専用の繋ぎ込みが必要でしたが、MCPという「共通規格」を通すことで、一つのMCPサーバーを作るだけで様々なAIクライアントからデータを利用可能になります。似ているものでRAGがありますがRAGは「知識の検索・参照」に特化しているのに対し、MCPは「機能（ツール）の呼び出し・実行」に特化しています。

<img src="/images/2026/20260324a/image_2.png" alt="image.png" width="709" height="330" loading="lazy">

## API Gateway+Lambdaによるプライベートな環境

社内DBや秘匿性の高い情報が流出するリスクを排除するため、社内ネットワーク内での運用が求められるケースがあります。

今回は上記を実現するべく、API Gatewayのアクセスを社内ネットワークからに制限し、すべてのリソースを社内に置いておくことでプライベートな環境を実現することを目指しました。
※前提として、社内ネットワークとAWS環境がVPN接続されていることとします。

## 通信方式

MCPには、ローカルMCP（stdio）とリモートMCP（Streamable HTTP）の2種類があります。ローカルMCPの場合、同じ環境を相手のPCにも構築する必要があり、共有に手間がかかってしまうので、リモートMCPを採用しました。

また、リモートMCPをサーバレスで実行するために通信方式は以下の設定にしています。(参考：[MCPの通信方式](https://qiita.com/nogataka/items/7fbeb58339703ec98a86))

- stateless_http: stateless_http=True に設定し、本来Statefulな通信を前提とするMCPプロトコルをステートレスなHTTP通信に変換することでLambdaのような1回切りのリクエストに対応させます
- Streamable_http：Lambdaでの1回限りの重い処理を、タイムアウトで切断される前に小出しで届けて完結させる

# 構成図

本構成では、セキュリティを最優先し、API Gatewayを「プライベート」モードでデプロイします。これにより、社内ネットワークからのみAIツールを呼び出すことが可能になります。

<img src="/images/2026/20260324a/image_3.png" alt="image.png" width="696" height="364" loading="lazy">

## Lambda採用理由

 EC2でMCPサーバをホストした場合、常時EC2を起動しておく必要があり、利用していない期間も不要な料金が発生します。そこでサーバレスなLambdaでホストすることで、MCPサーバーが呼ばれた時だけ料金が発生するので、コストを抑えられます。

## 本構成のデメリット

大量のログ解析や複雑なデータ集計など、完了までに時間がかかるタスクを依頼すると、AIに結果が返る前にAPI Gatewayのタイムアウト制限より、接続が切れてエラーになる可能性があります。

また、VPCエンドポイントは月10ドルほどの固定費がかかるというデメリットも挙げられます。

# 構築手順

1. まずは開発環境（EC2）にAWS SAM CLIやPython 3.11をインストールし、必要なIAMロールを付与します
2. コードを作成してAWSにデプロイ

ファイル構成は以下の通りです。

```sh
.
├── mcp_server
│   ├── __init__.py
│   └── __main__.py
├── requirements.txt
├── run.sh
└── template.yaml
```

mcp_server/`__init__.py` は空ファイルで大丈夫です。

```bash
touch mcp_server/'__init__.py'
```

```py mcp_server/__main__.py
import uvicorn
from fastmcp import FastMCP

# FastMCPの初期化
# stateless_http=True にすることで、Lambdaのような1回切りのリクエストに対応させます
mcp = FastMCP("MyRemoteMCP", stateless_http=True)

# ツール定義：型ヒントとドキュメント文字列がそのままMCPの定義になります
@mcp.tool()
def calculate_add(a: float, b: float) -> str:
    """2つの数値を足し合わせます"""
    result = a + b
    return f"計算結果: {a} + {b} = {result}"

# @mcp.tool()でいくつでもツールを追加可能

# FastMCPが内部で生成したFastAPIアプリを抽出
app = mcp.http_app()

if __name__ == "__main__":
    # Lambda Web Adapterが待機する8080ポートで起動
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

```sh run.sh
#!/bin/bash
exec python -m mcp_server
```

run.shに実行権限を付与。

```bash
chmod +x run.sh
```

```text requirements.txt
fastmcp==2.14.5
fastapi==0.128.1
uvicorn==0.40.0
```

3. AWSリソースの構築

以下のSam templateを実行すれば本記事のAWSリソースが構築できます。
[]内は各々の環境に合わせて変更してください。

```yaml
Transform:
  - AWS::Serverless-2016-10-31
  - AWS::LanguageExtensions

Parameters:
  VpcId: { Type: String, Default: vpc-[VPCID] }
  SubnetId1: { Type: String, Default: subnet-[サブネットID] }
  SubnetId2: { Type: String, Default: subnet-[サブネットID] }

Resources:
  # --- セキュリティグループ ---
  InternalServiceSG:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Allow internal traffic for MCP Server
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: [CiderIp]

  # --- VPCエンドポイント (API Gateway用) ---
  MyVpce:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      ServiceName: !Sub "com.amazonaws.${AWS::Region}.execute-api"
      VpcEndpointType: Interface
      VpcId: !Ref VpcId
      SubnetIds: [ !Ref SubnetId1, !Ref SubnetId2 ]
      SecurityGroupIds: [ !Ref InternalServiceSG ]
      PrivateDnsEnabled: true

  # --- API Gateway (Private) ---
  MyApi:
    Type: AWS::Serverless::Api
    DependsOn: MyVpce
    Properties:
      Name: mcp-api
      StageName: prod
      EndpointConfiguration:
        Type: PRIVATE
        VPCEndpointIds:
          - !Ref MyVpce
      Auth:
        ResourcePolicy:
          CustomStatements:
            - Effect: Allow
              Principal: "*"
              Action: "execute-api:Invoke"
              Resource: "execute-api:/*/*/*"
            - Effect: Deny
              Principal: "*"
              Action: "execute-api:Invoke"
              Resource: "execute-api:/*/*/*"
              Condition:
                StringNotEquals:
                  "aws:SourceVpce": !Ref MyVpce
      DefinitionBody:
        openapi: "3.0.1"
        paths:
          /{proxy+}:
            x-amazon-apigateway-any-method:
              x-amazon-apigateway-integration:
                httpMethod: POST
                type: aws_proxy
                uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${Function.Arn}/invocations"
              responses: {}

  # --- Lambda関数(VPC内) ---
  Function:
    Type: AWS::Serverless::Function
    Properties:
      Architectures: [arm64]
      Runtime: python3.11
      Timeout: 30
      CodeUri: .
      Handler: run.sh
      Layers:
        - !Sub arn:aws:lambda:${AWS::Region}:753240598075:layer:LambdaAdapterLayerArm64:18
      VpcConfig:
        SecurityGroupIds: [ !Ref InternalServiceSG ]
        SubnetIds: [ !Ref SubnetId1, !Ref SubnetId2 ]
      Environment:
        Variables:
          AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
          PORT: 8080
      Events:
        ProxyApiRoot:
          Type: Api
          Properties:
            RestApiId: !Ref MyApi
            Path: /{proxy+}
            Method: ANY

  # --- API GatewayからLambdaを呼ぶ許可 ---
  LambdaInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref Function
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${MyApi}/*"

Outputs:
  FunctionArn:
    Description: "Lambda Function ARN"
    Value: !GetAtt Function.Arn
  VpceId:
    Description: "VPC Endpoint ID"
    Value: !Ref MyVpce
  ApiUrl:
    Description: "API Gateway URL"
    Value: !Sub "https://${MyApi}.execute-api.${AWS::Region}.amazonaws.com/prod/"

```

本構成で重要な部分をピックアップして解説します。

API Gateway:

- エンドポイントタイプ：プライベート
- VPCエンドポイントID：[エンドポイントID(vpce-xxxx)]
- リソースポリシー：特定のVPCエンドポイント経由のアクセスのみ許可
- 統合タイプ：Lambda関数
- Lambdaプロキシ統合：ON
- Lambda関数：SAMで作った関数の名前(mcp-server-stack-Function-xxx)
- デプロイの際のステージ名：prod

Lambda:

- LambdaをVPCのプライベートサブネットを指定することで、インターネットからは直接見えない状態に設定

VPCエンドポイント:

- VPCEndpoint(Interface型)の採用によりAPI Gatewayをインターネットに公開せず、VPC内部のプライベートIPだけで叩けるようにします。

## Difyからの接続

Difyのツール＞MCPからツールを追加します。

- サーバー名：https://[自分のVPCEのDNS名(上から2つ目)]/prod/mcp
- ヘッダー名：HOST
- ヘッダーの値：[自分のAPIのID].execute-api.ap-northeast-1.amazonaws.com

<img src="/images/2026/20260324a/image_5.png" alt="image.png" width="546" height="876" loading="lazy">

# 利用結果

Difyのツール設定から外部MCPツールを登録し、実際に計算を依頼した結果です。

<img src="/images/2026/20260324a/image_6.png" alt="image.png" width="844" height="724" loading="lazy">

VPCエンドポイント経由の閉域網通信でありながら、Difyのエージェント機能によってmcpツールが呼び出されていることが確認できました。

# まとめ

- したことまとめ
  - AWS Lambda + API Gateway (Private) によるセキュアでサーバレスなMCPサーバーの構築
  - Dify との連携による実用的なAIエージェント環境の構築
- 次やりたいこと
  - 今回は数値計算のシンプルなツールでしたが、次はGoogleカレンダーAPIとの連携によるスケジュール調整の自動化に挑戦し、最終的には秘書のようなAIを作りたいと考えています
