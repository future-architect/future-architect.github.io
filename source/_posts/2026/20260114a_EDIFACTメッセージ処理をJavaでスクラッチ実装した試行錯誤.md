---
title: "EDIFACTメッセージ処理をJavaでスクラッチ実装した試行錯誤"
date: 2026/01/14 00:00:00
postid: a
tag:
  - Java
category:
  - IoT
thumbnail: /images/2026/20260114a/thumbnail.jpg
author: 辻大志郎
lede: "Web系のシステム開発やデータ連携においてデータフォーマットにJSONを利用することは一般的ですが、製造系の基幹システムとのデータ連携においてEDIFACTを利用するケースがあります。EDIFACTはあまり馴染みのない、あるいは聞きなれないデータフォーマットかと思いますが..."
---
# はじめに

製造・エネルギーグループの辻です。Web系のシステム開発やデータ連携においてデータフォーマットにJSONを利用することは一般的ですが、製造系の基幹システムとのデータ連携においてEDIFACTを利用するケースがあります。EDIFACTはあまり馴染みのない、あるいは聞きなれないデータフォーマットかと思いますが、製造業あるいは他業種においても歴史あるデータフォーマットです。またEDIFACTデータを処理するにあたってはエンタープライズ向けのETL製品やEDIミドルウェアが導入されているケースがよくあると思います。ただ、今回、EDIFACTを扱うJavaアプリケーションをスクラッチ開発するニーズがありました。

そこで本記事では、まずEDIFACTとは何か？ということを簡単に触れたのち、JavaでEDIFACTデータを処理するためのライブラリ選定や実装アプローチの概要を紹介します。

# そもそもEDIFACTとは？

EDIFACTとは、国連が定めた電子データ交換の国際標準規格です。正式名称はUN/EDIFACT（the United Nations rules for Elec­tronic Data Interchange for Administration, Commerce and Transport）[^3]と呼ばれます。テキストベースのデータ構造ですが、JSONのようにキー名を持たず、位置と順序でデータの意味が決まります。`'` 、 `+` 、 `:` などの文字を用いて文字列を区切り、メッセージ仕様に基づいて階層構造やデータの詳細がわかるデータフォーマットです。

[^3]: https://unece.org/trade/uncefact/introducing-unedifact

EDIFACTのサンプルデータを以下に記載しました。なお、実際の伝送データは改行されていませんが、可視性向上のために改行しています。

```text EDIFACTサンプルデータ
UNB+UNOA:2+SENDER_ID+RECEIVER_ID+251228:1500+1234'
UNH+ME001+ORDERS:D:96A:UN'
BGM+220+PO12345+9'
DTM+137:20251228:102'
NAD+BY+BUYER_CODE::92'
NAD+SE+SELLER_CODE::92'
LIN+1+1+PRODUCT_A:EN'
QTY+21:100:PCE'
PRI+AAA:500::NTP'
LIN+2+1+PRODUCT_B:EN'
QTY+21:50:PCE'
PRI+AAA:1200::NTP'
UNS+S'
CNT+2:2'
UNT+14+ME001'
UNZ+1+1234'
```

`UNB` や `UNH`、 `DTM` といった謎の単語（EDIFACTの用語でセグメントと呼びます）と付随する文字列が現れました。何を意味しているか一見、理解不能のように見えます。

ところが、JSONフォーマットに変換するとなんとなくイメージがわく方も多いのではないでしょうか？以下は先ほどのEDIFACTメッセージを擬似的にJSONに変換したデータです。

```json EDIFACTサンプルデータ（疑似変換）
{
  "interchangeHeader": {
    "senderId": "SENDER_ID",
    "receiverId": "RECEIVER_ID",
    "timestamp": "2025-12-28T15:00:00",
    "controlReference": "1234",
    "syntaxIdentifier": "UNOA:2"
  },
  "messageBody": {
    "messageHeader": {
      "messageType": "ORDERS",
      "version": "D:96A:UN",
      "messageReferenceNumber": "ME001"
    },
    "documentDetails": {
      "documentNameCode": "220",
      "documentNumber": "PO12345",
      "messageFunctionCode": "9",
      "documentDate": "2025-12-28"
    },
    "parties": [
      {
        "role": "BUYER",
        "id": "BUYER_CODE",
        "codeListQualifier": "92"
      },
      {
        "role": "SELLER",
        "id": "SELLER_CODE",
        "codeListQualifier": "92"
      }
    ],
    "lineItems": [
      {
        "lineNumber": 1,
        "productId": "PRODUCT_A",
        "quantity": {
          "value": 100,
          "unit": "PCE"
        },
        "price": {
          "amount": 500,
          "type": "NetPrice"
        }
      },
      {
        "lineNumber": 2,
        "productId": "PRODUCT_B",
        "quantity": {
          "value": 50,
          "unit": "PCE"
        },
        "price": {
          "amount": 1200,
          "type": "NetPrice"
        }
      }
    ],
    "summary": {
      "totalLineCount": 2
    }
  }
}
```

EDIFACTの文字列を、上記のように階層構造に変換できる理由は、メッセージタイプ（業務プロセスごとに定義されたデータ構造の仕様）により構造が定義されているためです。上記で紹介した例は、UN/EDIFACTの `ORDERS` （発注）というメッセージタイプに基づくサンプルメッセージです。

https://service.unece.org/trade/untdid/d96a/trmd/orders_t.htm

その他にも `DESADV`（出荷通知）、`INVOIC`（請求）など、様々な業務プロセスに対応するメッセージタイプが定義されています。それぞれのメッセージタイプごとに、どのセグメントを、どの順序で、何回繰り返すかというデータ構造が定義されています。

ただ、実務上はUN/EDIFACTの国際標準をベースにしつつも、業界ごとに独自の規約（サブセット）を定義して運用することが一般的です。たとえば自動車業界では JAMA（日本自動車工業会） [^1] が[EDIFACT導入ガイドライン](https://www.jama.or.jp/operation/it/biz_sys/download.html)を制定しています。さらに、業界内でも個社ごとに仕様がカスタマイズされているケースは少なくありません。

[^1]: https://www.jama.or.jp/

# JavaのEDIFACTライブラリ選定

EDIFACTの概要を紹介しました。次は、EDIFACTメッセージをJavaアプリケーションで処理するにあたって、ベースとなるライブラリ選定プロセスを紹介します。Javaライブラリをざっくりと調査&簡易検証した結果、候補として以下の2つに絞られました（ただ調査&簡易検証範囲は限定的です。他にもこのライブラリが便利だよ、という知見をお持ちの方、こっそりと教えて下さい）。

|案|ライブラリ名|リポジトリ|特徴|
|-|-|-|-|
|案1|Smooks|https://github.com/smooks/smooks|・高機能なデータ変換フレームワーク<br>・EDIFACTメッセージの仕様を定義したXMLファイルを用意することで、メッセージのパースとBeanへデータマッピングが可能|
|案2|Staedi|https://github.com/xlate/staedi|・ストリームベースの軽量EDIパーサ<br>・処理フローをアプリケーションコードで制御する必要あり<br>・Beanへのマッピング機能はない|

結論としては、案2のStaediを採用しました。当初、案1のSmooksを主として検討していましたが、EDIFACTメッセージの定義ファイルを用意することが困難であると判明しました。UN/EDIFACTの標準規格の定義ファイル自体はSmooksの標準機能として提供されており、当初はよさそうに見えていました[^2]。

[^2]: https://github.com/smooks/smooks-edi-cartridge/tree/b60b715cfc84cfffdecb1cfbbf7065af08107ecd/edifact-schemas/src/main/resources

しかし、実務上は個社別にカスタマイズされているEDIFACTの定義ファイルを用意する必要がありました。いくつか試行錯誤しましたが、この個社別にカスタマイズされている定義ファイルを作成することが困難であるとわかりました。これがノックアウトファクターとなり、代替案であるStaediを採用することにしました。

# 実装アプローチ

Staediは、EDIFACTデータの読み書きに特化したストリームベースのパーサライブラリです。メッセージ構造の解釈や処理フローはアプリケーションコードに委ねられています。実装方針は大きく2通り考えられました。

1. [StaediのREADME](https://github.com/xlate/staedi?tab=readme-ov-file#reading-edi)にあるような、イベント駆動（ステートマシン）的なアプローチ
2. 全データをメモリ上のツリー構造として扱う、構文解析的なアプローチ

今回は2の方針を採用しました。実務で採用されている複雑なEDIFACT仕様にそって処理することを考えたとき、主に以下の理由から2のアプローチのほうがコードの保守性が高いと判断したためです。

* コードの構造からメッセージ仕様を直接的に読み取れる
* 入力データの並び順とシステムが必要とする出力データの順序が異なる場合でも、ツリー構造であれば柔軟にデータを取り出せる
* 構文木としてデバッグできるため、構造定義とデータ抽出定義のどちらに問題があるかを特定しやすい

2のアプローチではEDIFACTのセグメントを一度JSONノードのリストとして展開し、そのリストをカーソルを使って走査しながら、階層構造を構築します。EDIFACTのメッセージは `'` や `+` や `:` などの文字により区切られていますが、このような字句解析はStaediにまかせます。字句解析結果のJSONノードをアプリケーションコードで構造解析し、ビジネスロジックで必要なデータを抽出します（なお、本記事ではデータの抽出部分は割愛します）。

*Java処理フロー概要*
<img src="/images/2026/20260114a/Java処理フロー概要.jpg" alt="Java処理フロー概要.jpg" width="1200" height="371" loading="lazy">

## StaediとJacksonを用いたセグメントのリスト化

まず、Staediの `EDIStreamReader` とJacksonの `ObjectMapper` を組み合わせて、EDIFACTメッセージを `List<JsonNode>` に変換します。EDIFACTの各セグメントを扱いやすいJSONオブジェクトのリストにします。

```java
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /***
     * EDIFACTデータを読み込み、セグメントのリストを取得する.
     *
     * @param edifactStr EDIFACT形式の文字列データ
     * @throws IOException 入出力例外
     * @return セグメントのリスト
     */
    public static List<JsonNode> readSegments(String edifactStr) throws IOException {
        var factory = EDIInputFactory.newFactory();

        // 実データは標準仕様と細部の違いがあるため
        factory.setProperty(EDIInputFactory.EDI_VALIDATE_CONTROL_STRUCTURE, false);
        var stream = new ByteArrayInputStream(edifactStr.getBytes(StandardCharsets.UTF_8));

        JsonNode rootNode;
        try (var ediReader = factory.createEDIStreamReader(stream);
             var jsonParser = factory.createJsonParser(ediReader, JsonParser.class)) {
            // StaediのReaderをJacksonのParserとして扱う
            rootNode = MAPPER.readValue(jsonParser, JsonNode.class);
        }

        // 各セグメントをJsonノードのリストとして取得
        List<JsonNode> segmentList = new ArrayList<>();
        for (JsonNode node : rootNode.path("data")) {
            segmentList.add(node);
        }

        return segmentList;
    }
```

## カーソルの用意

次に現在どのセグメントを参照していているか？を管理するカーソルクラスを用意します。パース処理中に、次のセグメントが `UNH` メッセージであれば `UNH` メッセージ処理をする、といった先読みをできるようにしています。

```java
/**
 * EDIFACTデータのカーソル操作クラス.
 */
public class EdifactCursor {
    private final List<JsonNode> nodes;
    private int position = 0;

    /**
     * コンストラクタ.
     *
     * @param nodes EDIFACTセグメントのリスト
     */
    public EdifactCursor(List<JsonNode> nodes) {
        this.nodes = nodes;
    }

    /**
     * 現在位置のセグメント名を確認.
     *
     * @return セグメント名
     */
    public String peek() {
        if (position >= nodes.size()) return null;
        return nodes.get(position).path("name").asText();
    }

    /**
     * 指定したタグであれば取得して位置を進める.
     *
     * @param expectedTag 期待するセグメント名
     * @return JsonNode
     */
    public JsonNode match(String expectedTag) {
        if (expectedTag.equals(peek())) {
            return nodes.get(position++);
        }
        return null;
    }
}
```

## パース処理

カーソルを用いて、メッセージをパースする処理を実装します。複数回登場しうるセグメント（`NAD`、`LIN` など）は先読みしながらループを回して処理します。コードの構造から、セグメントの流れ（`UNH` の次に `BGM` が登場するなど）や登場回数（1回なのか複数回）が、わかることが嬉しいポイントです。

```java
/**
 * ツリー構造のノードとなるグループクラス
 */
public class EdifactGroup {
    private final String name;
    private final List<JsonNode> segments = new ArrayList<>();
    private final List<EdifactGroup> children = new ArrayList<>();

    /**
     * コンストラクタ.
     *
     * @param name グループ名
     */
    public EdifactGroup(String name) {
        this.name = name;
    }

    /**
     * ルートのパース処理.
     *
     * @param cursor EDIFACTカーソル
     */
    public static EdifactGroup parseInterchange(EdifactCursor cursor) {
        EdifactGroup interchange = new EdifactGroup("Interchange")
                .addSegment(cursor.match("UNB"));
        while ("UNH".equals(cursor.peek())) {
            interchange.addChild(parseMessage(cursor));
        }
        return interchange.addSegment(cursor.match("UNZ"));
    }

    /**
     * Message単位のパース.
     *
     * @param cursor EDIFACTカーソル
     */
    private static EdifactGroup parseMessage(EdifactCursor cursor) {
        EdifactGroup message = new EdifactGroup("Message")
                .addSegment(cursor.match("UNH"))
                .addSegment(cursor.match("BGM"))
                .addSegment(cursor.match("DTM"));

        while ("NAD".equals(cursor.peek())) {
            message.addSegment(cursor.match("NAD"));
        }

        return message.addChild(parseDetailSection(cursor))
                .addSegment(cursor.match("UNS"))
                .addSegment(cursor.match("CNT"))
                .addSegment(cursor.match("UNT"));
    }

    /**
     * 明細行単体のパース.
     *
     * @param cursor EDIFACTカーソル
     * @return 明細行グループ
     */
    private static EdifactGroup parseLineItem(EdifactCursor cursor) {
        return new EdifactGroup("LineItem")
                .addSegment(cursor.match("LIN"))
                .addSegment(cursor.match("QTY"))
                .addSegment(cursor.match("PRI"));
    }

    /**
     * 明細セクションのパース.
     *
     * @param cursor EDIFACTカーソル
     * @return 明細セクショングループ
     */
    private static EdifactGroup parseDetailSection(EdifactCursor cursor) {
        EdifactGroup detail = new EdifactGroup("Detail");
        while ("LIN".equals(cursor.peek())) {
            detail.addChild(parseLineItem(cursor));
        }
        return detail;
    }

    /**
     * セグメント追加.
     *
     * @param seg 追加するセグメント
     * @return 追加したセグメント
     */
    public EdifactGroup addSegment(JsonNode seg) {
        if (seg != null) {
            this.segments.add(seg);
        }
        return this;
    }

    /**
     * 子グループ追加.
     *
     * @param group 追加する子グループ
     * @return 追加した子グループ
     */
    public EdifactGroup addChild(EdifactGroup group) {
        if (group != null && !group.isEmpty()) {
            this.children.add(group);
        }
        return this;
    }

    private boolean isEmpty() {
        return segments.isEmpty() && children.isEmpty();
    }
}
```

実行クラスや `toString()` などの実装は省略しますが、これらを組み合わせると、以下のようにEDIFACTメッセージを構造化して扱えます。

```txt 構造解析結果
[Interchange]
  UNB : UNOA:2 + SENDER_ID + RECEIVER_ID + 251228:1500 + 1234
  [Message]
    UNH : ME001 + ORDERS:D:96A:UN
    BGM : 220 + PO12345 + 9
    DTM : 137:20251228:102
    NAD : BY + BUYER_CODE::92
    NAD : SE + SELLER_CODE::92
    UNS : S
    CNT : 2:2
    [Detail]
      [LineItem]
        LIN : 1 + 1 + PRODUCT_A:EN
        QTY : 21:100:PCE
        PRI : AAA:500::NTP
      [LineItem]
        LIN : 2 + 1 + PRODUCT_B:EN
        QTY : 21:50:PCE
        PRI : AAA:1200::NTP
    UNT : 14 + ME001
  UNZ : 1 + 1234
```

# まとめ

JavaによるEDIFACT処理のスクラッチ開発について、ライブラリ選定から実装までの一連の流れを紹介しました。ストリームパーサであるStaediで字句解析、アプリケーション側で構文解析するアプローチを採用することで、EDIFACTの複雑なネスト構造を直感的なコードで表現できるようになりました。少々ニッチな領域ではありますが、モダンな開発環境でレガシーな仕様と向き合う際の参考になれば幸いです。
