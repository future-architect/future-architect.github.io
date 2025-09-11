---
title: "PDFをBigqueryにぶっこんで効率よく構造化する"
date: 2025/07/24 00:00:00
postid: a
tag:
  - Gemini
  - BigQuery
  - GoogleCloud
category:
  - DataScience
thumbnail: /images/2025/20250724a/thumbnail.png
author: 大前七奈
lede: "Google Agent Development KitやLangChainエコシステムを触る機会が増える中で、多くの企業や研究機関、政府機関が、契約書、報告書、マニュアル、論文、請求書などの重要な情報をPDF形式で保存・配布していることに改めて注目しています。これらの膨大な情報源から、LLM（大規模言語モデル)が直接情報にアクセスし、理解できるようになることは、実用的なAIソリューションを構築する上で不可欠だと考えています。"
---
<img src="/images/2025/20250724a/Gemini_Generated_Image_gwxj4tgwxj4tgwxj_(1).png" alt="" width="1200" height="1200" loading="lazy">

[AI Tips連載](/articles/20250707a/)の9日目の記事です。

こんにちは！Energy Transformation Groupの大前七奈です。

最近、[Google Agent Development Kit](https://google.github.io/adk-docs/)や[LangChain](https://python.langchain.com/docs/introduction/)エコシステムを触る機会が増える中で、多くの企業や研究機関、政府機関が、契約書、報告書、マニュアル、論文、請求書などの重要な情報をPDF形式で保存・配布していることに改めて注目しています。

これらの膨大な情報源から、LLM（大規模言語モデル)が直接情報にアクセスし、理解できるようになることは、実用的なAIソリューションを構築する上で不可欠だと考えています。

# PDFとは

PDF（Portable Document Format）は、文書をアプリケーションやOS、デバイスに依存せずに表示・印刷できるようにするためのファイル形式です。PDFは「PostScriptの描画モデルに基づき、印刷だけでなく、電子的な文書交換に最適化された静的なファイルフォーマット」として広く利用されています。

PDFの内部構造について、zawakinさんの[僕「PDFとは何か知りたい」](https://qiita.com/zawawahoge/items/4312649f8d56f8983ffb)のQiita記事も参考になります。

# 課題感

しかし、PDFの内部構造が「グラフィックコマンドの集合体」であるため、単純なコピー＆ペーストではテキスト情報を正確に抽出することが難しいという課題があります。

特に、スキャンされたPDF（画像PDF）の場合はOCR（光学文字認識）が必須となり、この抽出精度がRAG（Retrieval-Augmented Generation）システムの性能に直結します。

# PDF抽出フロー

このような課題を解決し、PDFから効率的かつ正確に構造化されたデータを抽出するために、以下のフローを考案しました。このフローでは、特にプロンプト設計とBigQuery MLを活用しています。

![](/images/2025/20250724a/sequence.png)

<details>
<summary>シーケンス図 (クリックでコードを表示)</summary>

```uml
graph TD
    %% 定義
    subgraph スキーマ抽出&情報抽出
        A[PDFファイル] --> B{GEMINIへ入力};
        B --> C[GEMINIによるPDF解析];
        C --> D{スキーマ情報の抽出};
        D -- 抽出されたスキーマをガイドに --> E[GEMINIによる情報抽出];
        %% スキーマをガイドとして再利用
        B -- (元のPDFも引き続き参照) --> E;
        %% GEMINIは元のPDFも再参照できる
        E --> F[抽出されたデータ項目と値];
    end

    %% 後処理/連携 (自動)
    F --> G[データベース/データ分析ツールへの連携];
```

</details>

# プロンプト設計

LangChainの公式ドキュメントでは、PDFから構造化データを抽出する際に、Pydanticの型をセットでLLMに渡すことが推奨されています。

- [Build an Extraction Chain | 🦜️🔗 LangChain](https://python.langchain.com/docs/tutorials/extraction/#the-schema)

しかし、社内文書は必ずしもすべて同じスキーマになっているわけではありません。そこで、プロンプト設計の段階で、スキーマ抽出自体もLLMに任せることにしました。これにより、様々な形式のPDFに対応できる柔軟な抽出システムを構築することが可能になります。

以下に示すプロンプトは、PDF解析からJSONデータ抽出までを自動で行うためのものです。

スキーマ抽出と、スキーマに沿った情報抽出の２つタスク分解することで、より汎用性を高めるプロント設計となります。

```json スキーマ抽出タスク.md
あなたは高度なPDF解析とJSONデータ抽出を行うAIです。以下のタスクを順番に実行してください。
**タスク1: PDFスキーマの抽出**

あなたが分析するPDFファイルをアップロードしてください。
PDFファイルを受け取った後、その内容を詳細に分析し、データ構造を正確に記述するJSONスキーマを生成してください。

スキーマ生成のガイドライン：

* PDFに記載されている主要な情報カテゴリ（例: "顧客情報", "製品詳細", "合計金額" など）を特定し、それらをJSONオブジェクトのキーとしてください。
* 各キーに対応する値の**データ型**（例: `string`, `number`, `boolean`, `array`, `object`）を明記してください。
* データが**必須**であるか（`"required": true`）、**オプション**であるか（`"required": false` または単に`required`キーを省略）を適切に指定してください。
* 繰り返し出現するデータ（例: 複数の製品項目、明細行）がある場合は、それらを**JSONの配列**として表現し、配列内の各要素のスキーマを定義してください。
* 日付や通貨など、特定のフォーマットを持つデータについては、`"format"` プロパティでそのフォーマット（例: `"date"`, `"currency"`）を示すことを検討してください。
* もしデータに特定の制約（最大長、最小値、正規表現パターンなど）がある場合は、それもスキーマに含めてください。

**スキーマの出力形式:**

```json
{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
  "title": "[PDFの内容に応じた適切なタイトル、例: InvoiceSchema]",
  "description": "[PDFの内容に関する簡潔な説明、例: スキーマは請求書の一般的な構造を記述します。]",
  "type": "object",
  "properties": {
    // 例:
    // "invoiceNumber": {
    //   "type": "string",
    //   "description": "請求書番号",
    //   "pattern": "^INV-\\d{4}-\\d{3}$",
    //   "required": true
    // },
    // "issueDate": {
    //   "type": "string",
    //   "format": "date",
    //   "description": "発行日",
    //   "required": true
    // },
    // "customerInfo": {
    //   "type": "object",
    //   "properties": {
    //     "name": { "type": "string" },
    //     "address": { "type": "string" }
    //   },
    //   "required": ["name"]
    // },
    // "lineItems": {
    //   "type": "array",
    //   "items": {
    //     "type": "object",
    //     "properties": {
    //       "description": { "type": "string" },
    //       "quantity": { "type": "number" },
    //       "unitPrice": { "type": "number" }
    //     },
    //     "required": ["description", "quantity", "unitPrice"]
    //   }
    // },
    // "totalAmount": {
    //   "type": "number",
    //   "description": "合計金額",
    //   "required": true
    // }
    // ... その他、PDFの内容に応じたプロパティを追加
  },
  "required": [
    // スキーマのトップレベルで必須となるプロパティをリスト
  ]
}

```

```json スキーマに沿った情報抽出タスク.md
**タスク2: タスク1のスキーマでPDFからデータ抽出**

**タスクの実行手順:**

1.  **スキーマの理解:** 提供されたJSONスキーマの内容を完全に理解し、どの情報項目をどのような形式で抽出する必要があるかを把握してください。
2.  **PDFからのデータ特定:** アップロードされたPDFファイルを分析し、スキーマで定義された各データ項目に対応する箇所を特定してください。
3.  **データ抽出と整形:**
    * スキーマで指定された**データ型**（文字列、数値、真偽値、配列など）に厳密に従って、PDFから値を抽出してください。
    * **配列**として定義されている項目（例: `lineItems`）については、PDF内に存在するすべての該当するエントリを抽出し、JSON配列の要素として含めてください。
    * スキーマで`"required": true`とマークされているが、PDF内に対応するデータが見つからない場合は、`null`値として出力してください。
    * スキーマで`"required": false`（または`required`プロパティが指定されていない）とマークされており、かつPDF内に対応するデータが見つからない場合は、そのキーを最終的なJSON出力から省略してください。
    * 日付や通貨など、特定のフォーマットがスキーマで指定されている場合は、そのフォーマットに合わせてデータを整形してください。

**出力形式:**

抽出されたすべてのデータは、以下の単一のJSONオブジェクトとして出力してください。このJSONオブジェクトは、提供されたJSONスキーマに完全に準拠している必要があります。

```json
{
  // ここにPDFから抽出された実際のデータを出力します。
  // 例:
  // "invoiceNumber": "INV-2025-001",
  // "issueDate": "2025-07-04",
  // "customerInfo": {
  //   "name": "株式会社ABC",
  //   "address": "東京都千代田区1-2-3"
  // },
  // "lineItems": [
  //   {
  //     "description": "商品A",
  //     "quantity": 2,
  //     "unitPrice": 1500
  //   },
  //   {
  //     "description": "サービスB",
  //     "quantity": 1,
  //     "unitPrice": 5000
  //   }
  // ],
  // "totalAmount": 8000
}
```

# 今回利用するPDFサンプル

来月開催されるGoogle Next Tokyoの登録済みセッションのPDFです。

<img src="/images/2025/20250724a/image.png" alt="image.png" width="1200" height="548" loading="lazy">

# 準備完了！さて、BigqueryMLで抽出しよう

上記のプロンプト設計とPDF抽出フローが整えば、いよいよBigQuery MLを使ってPDFからのデータ抽出を実行できます。BigQuery MLは、SQLインターフェースを通じて機械学習モデルを利用できるため、データエンジニアやアナリストが手軽にLLMを活用したデータ抽出パイプラインを構築できます。

以下のBigQuery MLのクエリは、PDFを格納したGoogle Cloud Storageのバケットからデータを読み込み、LLM（Gemini 2.0 Flash Experiment）を使って構造化データを抽出する例です。

```sql GEMINIを利用するモデル作成.sql
CREATE OR REPLACE MODEL `gemini_us.gemini-flash-connection`
REMOTE WITH CONNECTION `us.gemini-flash-connection`
OPTIONS (ENDPOINT = "gemini-2.0-flash-exp");
```

::: note info
現時点、Gemini利用可能なリージョンはUSのみです。それ以外のリージョンを選択してモデルすると、エラーが出ます。
:::

```sql Cloud StorageのPDFを外部テーブルとして作成.sql
CREATE EXTERNAL TABLE gemini_us.pdf_table
WITH CONNECTION `us.gemini-flash-connection`
OPTIONS(
  object_metadata = 'SIMPLE',
  uris = ["gs://path/to/store/pdf/*"]
  );
```

```sql ML.GENERATE_TEXTを利用してPDFをGeminiで解析.sql
SELECT ml_generate_text_llm_result
FROM ML.GENERATE_TEXT(
  MODEL `gemini_us.gemini-flash-connection`,
  TABLE `gemini_us.pdf_table`,
  STRUCT (
  '''
  あなたは高度なPDF解析とJSONデータ抽出を行うAIです。以下のタスクを順番に実行してください。
  **タスク1: PDFスキーマの抽出**

  ....省略....

  **タスク2: タスク1のスキーマでPDFからデータ抽出**
  **タスクの実行手順:**

  ....省略....


  ''' AS prompt,
  TRUE as FLATTEN_JSON_OUTPUT,
  8192 as MAX_OUTPUT_TOKENS
  )
);
```

::: note info
ML.GENERATE_TEXT関数のMAX_OUTPUT_TOKENSがデフォルトで1024です。ユースケースに応じてMAX_OUTPUT_TOKENSを明示的に定義しました。

こちらでGENERATE_TEXTのsyntaxを確認できます。
https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-generate-text#syntax_for_standard_tables
:::

# PDF抽出結果

**タスク1: PDFスキーマの抽出**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GoogleCloudNextTokyo2025AgendaSchema",
  "description": "スキーマはGoogle Cloud Next Tokyo 2025のアジェンダの構造を記述します。",
  "type": "object",
  "properties": {
    "eventTitle": {
      "type": "string",
      "description": "イベントタイトル",
      "const": "My Agenda: Google Cloud Next Tokyo 2025",
      "required": true
    },
    "registrationStatus": {
      "type": "string",
      "description": "登録ステータス",
      "const": "登録済みセッション",
      "required": true
    },
    "registrationDescription": {
      "type": "string",
      "description": "登録説明",
      "const": "登録済みのセッション一覧はこちらです。",
      "required": true
    },
    "sessionNotes": {
      "type": "array",
      "description": "セッションに関する注意事項",
      "items": {
        "type": "string"
      },
      "required": true
    },
    "sessionListTitle": {
      "type": "string",
      "description": "セッションリストのタイトル",
      "const": "すべてのセッションを見る",
      "required": true
    },
    "sessions": {
      "type": "array",
      "description": "セッションのリスト",
      "items": {
        "type": "object",
        "properties": {
          "sessionType": {
            "type": "string",
            "description": "セッションタイプ",
            "enum": [
              "基調講演",
              "ブレイクアウト",
              "ハンズオン",
              "スポンサー",
              "Dev Night"
            ],
            "required": true
          },
          "sessionTitle": {
            "type": "string",
            "description": "セッションタイトル",
            "required": true
          },
          "sessionDescription": {
            "type": "string",
            "description": "セッションの説明",
            "required": true
          },
          "sessionCategory": {
            "type": "string",
            "description": "セッションカテゴリ",
            "required": true
          },
          "sessionTime": {
            "type": "string",
            "description": "セッション時間",
            "required": true
          },
          "sessionStatus": {
            "type": "string",
            "description": "セッションステータス",
            "enum": [
              "登録済みセッションから削除"
            ],
            "required": true
          }
        },
        "required": [
          "sessionType",
          "sessionTitle",
          "sessionDescription",
          "sessionCategory",
          "sessionTime",
          "sessionStatus"
        ]
      },
      "required": true
    }
  },
  "required": [
    "eventTitle",
    "registrationStatus",
    "registrationDescription",
    "sessionNotes",
    "sessionListTitle",
    "sessions"
  ]
}
```

**タスク2: タスク1のスキーマでPDFからデータ抽出**

```json
{
  "eventTitle": "My Agenda: Google Cloud Next Tokyo 2025",
  "registrationStatus": "登録済みセッション",
  "registrationDescription": "登録済みのセッション一覧はこちらです。",
  "sessionNotes": [
    "セッションが定員に達した場合、登録受付を終了します。",
    "事前のセッション登録は、座席の確保を約束するものではありません。",
    "抽選制、または対象者優先のセッションを登録された場合は、参加の可否を後日改めてご案内します。",
    "当日の受講票は、7月下旬以降に順次お送りする予定です。"
  ],
  "sessionListTitle": "すべてのセッションを見る",
  "sessions": [
    {
      "sessionType": "基調講演",
      "sessionTitle": "Day1 基調講演",
      "sessionDescription": "D1-KEYNOTE・AIと機械学習",
      "sessionCategory": "D1-KEYNOTE・AIと機械学習",
      "sessionTime": "8/5(火)・10:00 - 11:30",
      "sessionStatus": "登録済みセッションから削除"
    },
    {
      "sessionType": "基調講演",
      "sessionTitle": "Day2 基調講演",
      "sessionDescription": "D2-KEYNOTE・AIと機械学習",
      "sessionCategory": "D2-KEYNOTE・AIと機械学習",
      "sessionTime": "8/6(水)・10:00 - 11:30",
      "sessionStatus": "登録済みセッションから削除"
    },
    {
      "sessionType": "ブレイクアウト",
      "sessionTitle": "Google Kubernetes Engine (GKE)10周年! GKEとCloud Run の最新機能紹介と...",
      "sessionDescription": "D1-APP-01・アプリケーション開発",
      "sessionCategory": "D1-APP-01・アプリケーション開発",
      "sessionTime": "8/5(火)・12:00 - 12:30",
      "sessionStatus": null
    },
    {
      "sessionType": "ブレイクアウト",
      "sessionTitle": "AI ドリブンでのECサイト顧客体験の向上施策 - Vertex Al Search for Commerce とは",
      "sessionDescription": "D1-AIML-02・AIと機械学習",
      "sessionCategory": "D1-AIML-02・AIと機械学習",
      "sessionTime": "8/5(火)・13:00 - 13:30",
      "sessionStatus": null
    },
    {
      "sessionType": "ハンズオン",
      "sessionTitle": "ローコードでAI エージェント開発! Conversational Agents と Application Integration の...",
      "sessionDescription": "D1-HO-02 AIと機械学習",
      "sessionCategory": "D1-HO-02 AIと機械学習",
      "sessionTime": "8/5(火)・14:00 - 15:30",
      "sessionStatus": "登録済みセッションから削除"
    },
    {
      "sessionType": "ブレイクアウト",
      "sessionTitle": "Vertex Al で実現: 購買データ ×約1億IDの人流データによる次世代広告ターゲティング",
      "sessionDescription": "D1-AIML-06・AIと機械学習",
      "sessionCategory": "D1-AIML-06・AIと機械学習",
      "sessionTime": "8/5(火)・16:00 - 16:30",
      "sessionStatus": "登録済みセッションから削除"
    },
    {
      "sessionType": "スポンサー",
      "sessionTitle": "マーケも CSも、データで動かす LLM × Vertex Al で進化する MOps / CSOps 実践事例",
      "sessionDescription": "D1-GL-12・データ分析",
      "sessionCategory": "D1-GL-12・データ分析",
      "sessionTime": "8/5(火)・17:00 - 17:30",
      "sessionStatus": "登録済みセッションから削除"
    },
    {
      "sessionType": "Dev Night",
      "sessionTitle": "Dev Night",
      "sessionDescription": "D1-DEVNITコミュニティ",
      "sessionCategory": "D1-DEVNITコミュニティ",
      "sessionTime": "8/5(火)・18:00 - 20:30",
      "sessionStatus": "登録済みセッションから削除"
    }
  ]
}
```

今回の出力結果から、以下の重要な点が確認できました。

1. **動的なスキーマ生成の有効性**
   - タスク1で生成されたJSONスキーマは、PDFの内容を適切に反映しており、各フィールドのデータ型、必須・オプションの指定、さらには列挙型（enum）まで詳細に定義されています。これにより、PDFの内容が多様であっても、LLMが自動的に最適なスキーマを推論できる柔軟性が示されました
2. **正確な情報抽出**
   - タスク2では、生成されたスキーマに基づいてPDFからデータが正確に抽出されています。特に、複数のセッション情報がsessions配列として正しく構造化されている点、およびセッションステータスが「登録済みセッションから削除」の場合とnullの場合が適切に処理されている点に注目できます。これは、LLMが複雑な構造を持つドキュメントから必要な情報を正確に識別し、指定されたフォーマットで出力する能力が高いことを示しています
3. **BigQuery MLとの連携の容易さ**
   - BigQuery MLのML.GENERATE_TEXT関数を利用することで、SQLインターフェースから直接LLMを呼び出し、構造化データを取得できることが確認できました。これにより、データパイプラインへの組み込みが非常に容易になり、データ分析環境内でシームレスにPDFからのデータ活用が可能になります

これらの結果は、LLMとBigQuery MLを組み合わせることで、これまで手作業や複雑なスクリプトが必要だったPDFからのデータ抽出を、効率的かつ柔軟に自動化できる可能性を強く示しています。

# まとめ

PDFからの効率的な情報抽出を実現するため、LLMとBigQuery MLを組み合わせたソリューションを紹介しました。特に、動的にPDFのスキーマをLLMに抽出させることで、様々な形式の社内文書に対応できる柔軟性の高いシステムを構築できることがご理解いただけたかと思います。

このアプローチにより、PDFに埋もれた貴重な情報をRAGシステムなどで活用できるようになり、より実用的で強力なAIソリューションの構築に繋がるでしょう。
