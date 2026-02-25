---
title: "Java製のSalesforce Apexパーサーをブラウザで動かす"
date: 2026/02/25 00:00:00
postid: a
tag:
  - Java
  - Salesforce
  - WebAssembly
category:
  - Programming
thumbnail: /images/2026/20260225a/thumbnail.png
author: 二村暢之
lede: "Salesforce ApexというJava5に似た構文を持つ言語のパーサーをJavaで実装したので、それをブラウザ上で動かすという実験をしてみました。JavaからJavaScriptとWebAssemblyの両方にコンパイルして、パフォーマンスを比較できる形で検証しています。"
---
コアテクノロジーグループの二村です。

普段は膨大なドキュメントやソースコードを解析して、ファクトベースでお客様のシステム移行計画策定や、保守改善を支援するコンサルティング業務を行っています。また、そのためのマネージドサービスの開発を行っています。

先日、仕事の一貫でSalesforce Apex[^apex]というJava5に似た構文を持つ言語のパーサーをJava(jdkのみ)で実装したので、それをブラウザ上で動かすという実験をしてみました。JavaからJavaScriptとWebAssemblyの両方にコンパイルして、パフォーマンスを比較できる形で検証しています。

この記事では、その開発過程で遭遇した技術的な課題と、その解決策について詳しく解説します。特に、TeaVMを使ったJavaからWebAssemblyへのコンパイルの実装上の工夫や、ブラウザ環境でのメモリ管理、文字列のinteropなど、実際に開発してみないとわからない細かいポイントも紹介します。

## プロジェクトの概要

<img src="/images/2026/20260225a/TeaVMによるclassファイルのコンパイル.png" alt="TeaVMによるclassファイルのコンパイル" width="1200" height="655" loading="lazy">

**目標**: 自作Java製Apexパーサーをブラウザで動かし、ApexソースコードのAST[^ast]をインタラクティブに可視化すること

**技術スタック**:
- **[TeaVM 0.13.0](https://teavm.org/)**: JavaバイトコードをJavaScript/WebAssemblyにコンパイルするツール
  - 2026年2月頭時点で最新の[0.13.0](https://teavm.org/docs/release-notes/0.13.0.html)を使用
  - Mavenのpom.xmlには、以下の依存関係（dependency）を記述しました
    - org.teavm:teavm-core：TeaVMのコアライブラリ
    - org.teavm:teavm-classlib：Javaの標準APIをTeaVMで動作するように実装したクラスライブラリ
    - org.teavm:teavm-jso：JavaコードからJavaScriptのオブジェクトや関数を操作するためのアノテーションやユーティリティクラスを提供
    - org.teavm:teavm-jso-apis：TeaVMのJSO（JavaScript Object）ライブラリで使用されるAPIの定義を含むライブラリ
    - org.teavm:teavm-maven-plugin：MavenビルドプロセスにTeaVMのコンパイルステップを組み込むためのプラグイン
- **Java 17**
  - Salesforce Apexパーサー自体はJava8互換で実装していますが、TeaVMの最新機能を活用するためにJava17でビルドしています
- **Maven 3.3.9**: ビルドツール
- **Jetty 9.4**: 開発用Webサーバー
- **Vanilla JS**: フロントエンド（フレームワークなし）

**成果物**:

2バージョンのカーソル位置連動ハイライト機能付きAST Viewer
- JavaScript版
- WebAssembly版

ユーザーがApexソースコードでカーソル位置を動かすと対応するASTノードをハイライトする機能を実装したのでその様子を動画で紹介します。

**JavaScript版デモ**
<img src="/images/2026/20260225a/js_demo.avif" alt="Apex Parser Playground JS Demo" width="1200" height="690" loading="lazy">

**WebAssembly版デモ**
<img src="/images/2026/20260225a/wasm_demo.avif" alt="Apex Parser Playground WASM Demo" width="1200" height="690" loading="lazy">

## なぜTeaVMを選んだのか

Javaコードをブラウザで動かす選択肢はいくつかあります。

以下の表で主要な選択肢を比較しました：

※バイナリサイズはコードに依存するためあくまで目安です。実際のサイズはプロジェクトによって大きく異なります。

| 項目 | TeaVM (JS) | TeaVM (WASM) | CheerpJ | GraalVM Wasm | GWT/J2CL |
|------|-----------|-------------|---------|--------------|----------|
| **アプローチ** | .classバイトコード→JS AOT | .classバイトコード→Wasm AOT | JVMエミュレーション（ブラウザ内JVM） | Java→Wasm AOT | Java→JS source-to-source(トランスパイル) |
| **Javaバージョン** | Java 8+ | Java 8+ | Java 8/11 | Java 17+ | Java 8-11 |
| **既存jar対応** | ◎（一部リフレクション制限） | ◎（一部リフレクション制限） | ◎（完全互換だが遅い） | △（GraalVM Native Image制約） | △（未対応API多数） |
| **バイナリサイズ** | 1-2MB（最適化後） | 2-4MB（ランタイム含む） | 5-10MB（JVM含む） | 3-10MB | 1-3MB |
| **parse性能** | 速い | より速い | 遅いはず（JVMエミュレーション） | 速いはず | 速い？ |
| **String/JS相互運用** | ◎（`@JSBody`で直接） | △（手動UTF-16変換） | △（JNI風API） | △（Wasm Interface Types待ち） | ◎（Java↔JS透過的） |
| **DOM/ブラウザAPI** | ◎（`teavm-jso`） | ○（限定的） | ○（JNI風） | △（外部JS必要） | ◎（JSNI/JsInterop） |
| **成熟度/コミュニティ** | ○（中規模、活発） | △（発展途上） | △（商用中心） | △（実験的） | ○（大規模だが停滞気味） |
| **パーサー向き** | ◎ | ◎ | △ | ○ | ○ |


TeaVMを選んだ理由は以下の通りです：

- **WebAssemblyのサポート**
  - [ver0.9.0](https://teavm.org/docs/release-notes/0.9.0.html)でWASMターゲットが安定化
  - [ver0.13.0](https://teavm.org/docs/release-notes/0.13.0.html)でJava25までのclassファイルをサポートしており、`Thread.start`や`Thread.sleep`などのThread系メソッドもサポート
  - `java.lang`, `java.util(OptionalやStreamを含む)`, `java.io` などの主要なクラスはエミュレーションされる※`java.nio.file` や `java.net(Socketなど)`、`java.awt/swing` など、ブラウザ環境にそぐわないAPIは利用不可
  - リフレクションはメタプログラムによる静的解析でサポートされますが、動的なクラスローディングやリフレクションは制限される
  - 利用する自作parserは別プロジェクトとなっており今回の作成したplaygroundプロジェクトからはdependencyとして利用します。TeaVMはバイナリを解析してJavaScript/WebAssemblyに変換するため、既存のjarをそのまま利用できる点も大きなメリット
- **[Mavenとの統合](https://teavm.org/docs/intro/preview-builds.html)**
  - 既存のビルドフローに簡単に組み込める
  - Mavenは単に好みですがGradleもサポート
- **サイズ効率**
  - 最適化オプションが充実
- **アクティブな開発**
  - 2026年現在でも活発
- **自作パーサー向き**
  - 文字列操作ロジック中心
  - jdkのみで特殊なクラスを利用をしていない

**CheerpJ** は完全なJVM互換性があるようですが、ブラウザ内JVMエミュレーションによるオーバーヘッドが大きく、パーサーのような処理では遅くなります。既存jarを無理やりブラウザで動かすには便利ですが、パフォーマンスが重要な場合は注意が必要です。

**GraalVM Wasm** は高性能。ただし、Native Imageを作成してからWebAssemblyに変換するという2段階プロセスが必要。別途検証してみたいなと思っています。

**GWT/J2CL** はJavaScript変換が成熟していますが、Java8ベースで新機能対応が遅く、J2CLはgoogle社の内部ツールでドキュメント不足です。

## アーキテクチャ設計：デュアルターゲット戦略

当初はWebAssembly版のみを考えていましたが、ブラウザ互換性とパフォーマンスの両立を考え、**JavaScriptとWebAssemblyの両方**を同時に生成する戦略に変更しました。

### ビルドフロー

* JsMain/WasmMainはそれぞれJavaScript版とWebAssembly版のエントリーポイントとなる(ソースコード文字列を引数とする)mainクラスです。

```
mvn clean package
  ↓
[Maven Compiler Plugin]
  ↓ Java → .class
[TeaVM Plugin: compile-js]
  ↓ JsMain.java → classes.js
  （519 classes、4170 methods）

[TeaVM Plugin: compile-wasm]
  ↓ WasmMain.java → classes.wasm
  （561 classes、4515 methods）
  ↓
[WAR Packaging]
  → 配備可能なアプリケーション
```

### エントリーポイントの分離

最初の躓きポイントがここでした。
**JavaScriptとWebAssemblyで別々のMainクラスを使う** 必要があったのです。

**なぜ分離の必要があったのか？**

TeaVMではJavaScriptとWebAssemblyでそれぞれ公開用のエントリーポイントをアノテーションベースで実装する必要があります。

TeaVMでは、以下のようにコンパイルターゲットによって異なるアノテーションを使用します：

- **JavaScript**: `@JSBody`を使ってJavaScriptコードを直接埋め込み
- **WebAssembly**: `@Export`でWASM関数としてエクスポート

これらのアノテーションは同じクラス内で併用できないため、別々のMainクラスを用意することになりました。
当初は1つのMainクラスで`@JSBody`と`@Export`を併用しようとしましたが、コンパイル時に競合が発生しました。TeaVMのJavaScriptターゲットとWebAssemblyターゲットでは、interop[^interop]の仕組みが根本的に異なるためです。

```java
// JavaScript用エントリーポイント
public class JsMain {
    // TeaVMではJNIのnative構文を流用し、@JSBodyでJavaScript実装を埋め込む（JavaScriptブリッジ用）
    @JSBody(params = { "fn" }, script =
        "window.apexParser = { parseApex: function(source) { " +
        "return fn.parse(source); } }; " +
        "if (window.onParserReady) window.onParserReady();")
    private static native void registerParser(ParseFunction fn);

    public static void main(String[] args) {
        registerParser((source) -> parseApex(source));
    }

    private static String parseApex(String source) {
        try {
            SourceInfo sourceInfo = new SourceInfo(source);
            ApexLexer lexer = new ApexLexer(sourceInfo);
            ApexParser parser = new ApexParser(lexer);
            CompilationUnitNode ast = parser.parseCompilationUnit();

            ASTToJsonVisitor visitor = new ASTToJsonVisitor();
            ast.accept(visitor);
            return visitor.toJsonString();
        } catch (Exception e) {
            return "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
        }
    }
}

// WebAssembly用エントリーポイント
public class WasmMain {
    public static void main(String[] args) {
        // ダミー呼び出しでDead Code Elimination回避
        try {
            parseApex("public class Test {}");
        } catch (Exception e) {
            // 無視
        }
    }

    /**
     * WebAssemblyでエクスポートする関数。
     * @Export(name = "parseApex") により、parseApexという名前でJSから呼び出せる関数としてエクスポートされる。
     */
    @Export(name = "parseApex")
    public static String parseApex(String apexSource) {
        try {
            SourceInfo sourceInfo = new SourceInfo(apexSource);
            ApexLexer lexer = new ApexLexer(sourceInfo);
            ApexParser parser = new ApexParser(lexer);
            CompilationUnitNode ast = parser.parseCompilationUnit();

            ASTToJsonVisitor visitor = new ASTToJsonVisitor();
            ast.accept(visitor);
            String result = visitor.toJsonString();

            System.gc();  // メモリリーク対策
            return result;
        } catch (Exception e) {
            return "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
        }
    }
}
```

## はまりポイント その1：Dead Code Elimination

テストビルドが通り、Webサーバーを起動し、いざブラウザで動かしてみると...

```
Error: parseApex function not found in WASM exports
```

デバッグ用のログを仕込んで調べると、`ApexLexer`や`ApexParser`といった肝心のクラスが**存在しない**ことが判明しました。

### 原因：強力すぎるデッドコード除去（Dead Code Elimination）

TeaVMは使われていないコードを検出して積極的に除去します。WasmMainのmain()メソッドが空だったため、`parseApex()`メソッドは「呼ばれることがない」と判断され、依存する全クラスが除外されていたのです。

```java
// ❌ これだとparserクラスが除外される
public static void main(String[] args) {
    // 空っぽ
}

// ✅ ダミー呼び出しでクラス参照を保持
public static void main(String[] args) {
    try {
        parseApex("public class Test {}");
    } catch (Exception e) {
        // 無視
    }
}
```

このダミー呼び出しにより、コンパイラに「このメソッドは使われる」と認識させて解決しました。

## はまりポイント その2：メモリリーク

Dead Code Elimination問題を解決し、パースが動き始めたのも束の間、次の問題が待っていました。

連続でパースを実行すると、30回目くらいで突然エラーが発生します：

```txt
RuntimeError: memory access out of bounds
```

### 原因：WebAssemblyのリニアメモリ制限

WebAssemblyは「リニアメモリ」という固定サイズのメモリ領域を使います。TeaVMのデフォルトヒープサイズは**16MB**と小さめ。

ASTノードやトークンを大量に生成するパース処理を繰り返すと、GCが実行されずメモリが枯渇していたようです。

### 解決策：2つのアプローチ

**1. ヒープサイズの拡大**

pom.xmlでWASMのヒープサイズを明示的に指定しました：

```xml
<execution>
    <id>compile-wasm</id>
    <configuration>
        <minHeapSize>32</minHeapSize>  <!-- 32MB -->
        <maxHeapSize>128</maxHeapSize> <!-- 128MB -->
    </configuration>
</execution>
```

**2. 明示的なGC呼び出し**

パース処理の最後に`System.gc()`を追加：

```java
@Export(name = "parseApex")
public static String parseApex(String apexSource) {
    try {
        // パース処理
        String result = visitor.toJsonString();

        // 明示的にGCを要求
        System.gc();

        return result;
    } catch (Exception e) {
        return "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
    }
}
```

通常のJavaでは`System.gc()`は「お願い」でしかありませんが、TeaVMのWASM環境では比較的確実に動作します。

この2つの対策により、**100回以上の連続パースでも安定動作**するようになりました。

## はまりポイント その3：文字列のinterop

WebAssemblyは文字列を直接扱えません。JavaScriptとWASM間で文字列を受け渡すには、**手動でUTF-16変換**が必要です。

### JavaScript側の変換関数

```javascript
function jsStringToJava(str) {
    if (!teavm) return 0;

    // TeaVMのヒープに文字列用領域を確保
    let javaString = teavm.allocateString(str.length);
    if (javaString === 0) {
        return 0;
    }

    let dataArrayPtr = teavm.stringData(javaString);
    let dataAddress = teavm.objectArrayData(dataArrayPtr);
    let dataView = new Uint16Array(teavm.memory.buffer, dataAddress, str.length);

    // UTF-16配列として書き込み
    for (let i = 0; i < str.length; ++i) {
        dataView[i] = str.charCodeAt(i);
    }

    return javaString;
}

function javaStringToJs(javaString) {
    if (!teavm || javaString === 0) return "";

    let dataArrayPtr = teavm.stringData(javaString);
    let length = teavm.arrayLength(dataArrayPtr);
    let dataAddress = teavm.objectArrayData(dataArrayPtr);
    let dataView = new Uint16Array(teavm.memory.buffer, dataAddress, length);

    let result = "";
    for (let i = 0; i < length; ++i) {
        result += String.fromCharCode(dataView[i]);
    }

    return result;
}
```

これはgithub copilotが書いてくれたとはいえ、正直**面倒**です。JavaScript版では`@JSBody`で直接文字列を受け渡せるため、このような変換は不要です。なお`@JSBody`よりもっとシンプルに使える [@JSExport](https://teavm.org/docs/runtime/js-modules.html) というアノテーションもあります。

パフォーマンスとのトレードオフですね。

## AST可視化：JSON形式への移行

初期バージョンでは、パーサープロジェクト側のテストで利用していたので下記のようなテキストベースのAST出力を直接JavaScriptに返していました。

```txt
CompilationUnit [1:1-10:2]
  ClassDeclaration: HelloWorld [1:1-10:2]
    MethodDeclaration: void sayHello [2:5-4:6]
      ...
```

しかし、これをJavaScript側でパースして位置情報を抽出するのは困難だった(当たり前)ため **JSON形式**に移行することにしました。

### ASTToJsonVisitor実装

ダブルディスパッチのVisitorパターンで全ASTノードを走査し、JSON文字列を構築します：

```java
// これはイメージです。実際には全ノードタイプに対応するvisitメソッドが必要になります。
public class ASTToJsonVisitor implements ASTVisitor {
    private StringBuilder json = new StringBuilder();

    @Override
    public void visit(CompilationUnitNode node) {
        json.append("{");
        appendProperty("type", "CompilationUnitNode");  // js側でdispatch用のtypeプロパティ
        appendLocation(node.getLocation());

        if (!node.getClassDeclarations().isEmpty()) {
            json.append(",\"classDeclarations\":[");
            boolean first = true;
            for (ClassDeclarationNode cls : node.getClassDeclarations()) {
                if (!first) json.append(",");
                cls.accept(this);
                first = false;
            }
            json.append("]");
        }

        json.append("}");
    }

    private void appendLocation(Location loc) {
        json.append(",\"location\":{");
        json.append("\"startLine\":").append(loc.getStartLine());
        json.append(",\"endLine\":").append(loc.getEndLine());
        json.append(",\"startColumn\":").append(loc.getStartColumn());
        json.append(",\"endColumn\":").append(loc.getEndColumn());
        json.append(",\"startPosition\":").append(loc.getStartPosition());
        json.append(",\"endPosition\":").append(loc.getEndPosition());
        json.append("}");
    }
}
```

**なぜJSONライブラリを使わないのか？**

実は、TeaVMでは一般的なJSONライブラリ（[Jackson](https://github.com/FasterXML/jackson)、[Gson](https://github.com/google/gson)等）がリフレクションが問題になりそのまま動かないことがあります。

単にJSON文字列が作れればいいだけなので、 `StringBuilder`で手動構築するので十分で、コンパイル後のコードサイズも小さく抑えられます。

ここもgithub copilotが書いてくれるので手間はあまりかかりませんでした。

## パフォーマンス比較：JavaScriptとWebAssembly

両方のビルドが動くようになったので、ベンチマークを取りました。

### Apexソース（900行弱のクラス）

WebAssembly版はJavaScript版の約2倍速い結果が出ました。
とはいえ、JavaScript版も実用上は十分な速度であり、体感としては誤差の範囲内と言えます。
どちらもJITコンパイルされるため、初回は遅いですが、2回目以降は安定して速くなります。

| 指標 | JavaScript | WebAssembly | 比率 |
|------|-----------|-------------|------|
| Parse Time（平均） | 100ms | 50ms | **約2.0x** |
| Parse Time（最速） | 79ms | 35ms | **約2.0x** |
| Classes Compiled | 519 | 561 | +42 |
| Methods Compiled | 4170 | 4515 | +345 |
| File Size | 781KB※ | 2.2MB | **約3.0x** |
| Initial Load | 速い | やや遅い | WASM instantiation分遅い |

※ **TeaVM 0.10.2** では812KBでした。 **TeaVM 0.13.0** までに最適化がより進んだ可能性があります。

### 考察

**WebAssemblyの利点**:
- 実行速度が**2倍高速**
- 大規模解析で真価を発揮する可能性
- 連続処理でも安定

**WebAssemblyの欠点**:
- ファイルサイズが3倍
- 初回読み込みがやや遅い
- 文字列変換のオーバーヘッド
- ブラウザサポートがChrome 88+, Firefox 89+, Edge 88+に限定

**JavaScript版の利点**:
- ファイルサイズが小さい
- ブラウザ互換性が高い
- 文字列操作が容易
- それでも十分な速度

**結論**: 小規模パースならJavaScript版で十分。大規模な解析や連続処理、リアルタイム性が求められる場面ではWebAssembly版が有利。

## ビルドオプションの詳細解説

[TeaVMのMavenプラグインには多くの設定オプション](https://teavm.org/docs/tooling/maven.html)があります。pom.xmlに入れた設定を説明します。

### JavaScript版の設定

```xml
<execution>
    <id>compile-js</id>
    <goals>
        <goal>compile</goal>
    </goals>
    <phase>process-classes</phase>
    <configuration>
        <!-- エントリーポイント -->
        <mainClass>jp.co.future.tools.apex.playground.JsMain</mainClass>

        <!-- 出力先（開発用にsrc/main/webappへ直接出力） -->
        <targetDirectory>${project.basedir}/src/main/webapp</targetDirectory>

        <!-- ターゲット種別 -->
        <targetType>JAVASCRIPT</targetType>
        <targetFileName>classes.js</targetFileName>

        <!-- 最適化レベル：SIMPLE, ADVANCED, FULL -->
        <!-- FULL = Dead Code Elimination + インライン化 + 定数畳み込み -->
        <optimizationLevel>FULL</optimizationLevel>

        <!-- 変数名短縮化（サイズ削減） -->
        <minifying>true</minifying>

        <!-- デバッグ情報を含めない（本番用） -->
        <debugInformationGenerated>false</debugInformationGenerated>

        <!-- エラーがあっても処理継続 -->
        <stopOnErrors>false</stopOnErrors>

        <!-- ファイナライザの厳格チェックを無効化 -->
        <strictFinalization>false</strictFinalization>
    </configuration>
</execution>
```

**主要オプション解説**:

- **optimizationLevel**:
  - `SIMPLE`: 基本的な最適化のみ（開発用）
  - `ADVANCED`: インライン化や定数畳み込み
  - `FULL`: Dead Code Eliminationを含む完全最適化（本番用）
    - 今回の実験だと`SIMPLE/minifyなし` に比べて、サイズが1/3になりました

- **minifying**: 変数名を短縮（例：`parseApexSourceCode` → `a`）。可読性は下がるがサイズが30-40%削減される

- **debugInformationGenerated**: ソースマップとスタックトレース情報を生成。開発時は`true`、本番は`false`

### WebAssembly版の設定

```xml
<execution>
    <id>compile-wasm</id>
    <goals>
        <goal>compile</goal>
    </goals>
    <phase>process-classes</phase>
    <configuration>
        <!-- エントリーポイント -->
        <mainClass>jp.co.future.tools.apex.playground.WasmMain</mainClass>

        <!-- ターゲット種別 -->
        <targetType>WEBASSEMBLY</targetType>

        <!-- 出力先（src/main/webappへ出力） -->
        <targetDirectory>${project.basedir}/src/main/webapp</targetDirectory>
        <!-- 出力ファイル名 -->
        <targetFileName>classes.wasm</targetFileName>

        <!-- 最適化レベル -->
        <optimizationLevel>FULL</optimizationLevel>

        <!-- *** メモリ設定（重要） *** -->
        <!-- 初期ヒープサイズ（MB） -->
        <minHeapSize>32</minHeapSize>
        <!-- 最大ヒープサイズ（MB） -->
        <maxHeapSize>128</maxHeapSize>

        <debugInformationGenerated>false</debugInformationGenerated>
        <stopOnErrors>false</stopOnErrors>
        <strictFinalization>false</strictFinalization>
    </configuration>
</execution>
```

**WASM固有オプション解説**:

- **minHeapSize/maxHeapSize**: WebAssemblyのリニアメモリサイズ。デフォルト16MBは小さすぎるため、パーサー用途では32-128MBを推奨

- **heapDump**: （オプション）メモリリーク調査用。`true`にするとヒープダンプを出力

- **wasmVersion**: （オプション）WebAssemblyのバージョン。デフォルトは`V_0x1`（MVP）
  - 指定したのですがエラーになりました
  - TeaVMでは指定ができないようです

### 開発時のTips

**開発中は最適化を弱める**:

```xml
<optimizationLevel>SIMPLE</optimizationLevel>
<minifying>false</minifying>
<debugInformationGenerated>true</debugInformationGenerated>
```

これにより：
- ビルド時間が短縮（FULL: 45秒 → SIMPLE: 20秒）
- エラーメッセージが読みやすい
- ブラウザDevToolsでのデバッグが容易

**本番環境では完全最適化**:

```xml
<optimizationLevel>FULL</optimizationLevel>
<minifying>true</minifying>
<debugInformationGenerated>false</debugInformationGenerated>
```

サイズが30-50%削減され、起動時間も改善します。

## 学んだこと

### 1. WebAssemblyは万能ではない

WebAssemblyは確かに高速ですが、ファイルサイズやブラウザ互換性のトレードオフがあります。Salesforce Apexのようなパースでは「2倍速い」という結果でしたが、JavaScript版でも十分実用的です。
WebAssemblyの場合はfetchでモジュールを読み込む必要があるためWebサーバが必要ですが、JavaScript版ならローカルで直接開いても動きます。用途に応じて使い分けるのが良さそうです。

### 2. Dead Code Eliminationは両刃の剣

最適化は重要ですが、意図しないクラス除去が起きると原因特定が困難です。main()での明示的な参照は、一種の「アンカー」として機能します。

### 3. メモリ管理はWASMの課題

WebAssemblyのリニアメモリは有限です。特にGC言語（Java, Kotlin等）をコンパイルする場合、ヒープサイズの調整と明示的なGC呼び出しが重要になります。

### 4. 文字列変換のオーバーヘッド

WebAssemblyのinteropで文字列を扱うのは思ったより面倒です。TeaVMは比較的良好なAPIを提供していますが、それでも手動変換が必要です。将来的には[WebAssembly Interface Types](https://component-model.bytecodealliance.org/design/component-model-concepts.html?highlight=Interface%20Type#webassembly-interface-types-wit)※で改善される予定です。

※WebAssembly Interface Typesとは、WebAssemblyモジュールがJavaScriptや他の言語とより自然にデータをやり取りできるようにするための提案です。これが実装されれば、文字列や複雑なデータ構造の変換が大幅に簡素化されるでしょう。

### 5. JSON形式の威力

言うまでもありませんが、JavaScriptとのやりとりで構造化データをやり取りする場合、JSON形式は強力です。手動で文字列を構築するのは面倒ですが、JSON形式になってしまえばJavaScript側で自由にトラバースできます。

### 6. TeaVMのスタブ機能

TeaVMの`teavm-classlib`には、ブラウザ環境では実際に動作しないAPIのスタブが含まれています。例えば、TeaVM/WebAssemblyの制約により `java.nio.file`パッケージのようなファイルI/O操作をサポートしていませんが、クラス参照やメソッドシグネチャは問題なくコンパイルできます。

自作パーサーの`SourceInfo`クラスでは`java.nio.file.Path`を使用していましたが、TeaVMの`teavm-classlib`に基本的なスタブ（`TPath`、`TPaths`など）が含まれているため、特別な対応なしにコンパイルできました。

もし`teavm-classlib`にないクラスを参照する必要がある場合は、以下のようなスタブを作成できます：

```java
// stubs/org/teavm/classlib/com/example/MyClass.java
package org.teavm.classlib.com.example;

public class MyClass {
    // ブラウザでは実際に呼ばれないメソッドのスタブ実装
    public static String someMethod(String arg) {
        throw new UnsupportedOperationException("Not supported in browser");
    }
}
```

このスタブを`org.teavm.classlib`パッケージ配下に配置することで、TeaVMのクラスローダーが優先的に読み込み、コンパイルエラーを回避できます。実際にそのメソッドが実行されなければ、例外は発生しません。

## 今後の展望

GraalVM Wasmも試してみたいと思っています。GraalVMはJavaをネイティブコードにコンパイルする機能があり、そこからさらにWebAssemblyに変換することができます。性能面では非常に期待できる一方で、ビルドフローが複雑になる可能性があります。

## まとめ

JavaからWebAssemblyへのコンパイルは、思ったより実用的でした。TeaVMは強力なツールですが、いくつかの気をつける点があることを学びました。どれも回避策は存在するので、適切に対処すれば安定したブラウザアプリケーションを構築できます。

- **Dead Code Elimination**: main()でクラス参照を保持
- **メモリ管理**: ヒープサイズ調整とGC呼び出し
- **文字列変換**: 手動でUTF-16変換
- **デュアルターゲット**: JavaScriptとWASMで別々のMainクラス
- **スタブの利用に関する注意**: TeaVMではブラウザ環境で動作しないAPI（例: `java.nio.file`）に対してスタブを提供しており、これを適切に扱う必要があります。

今回やったような実験もAIエージェントによりだいぶ楽になりました。コードの自動生成やリファクタリングに大活躍でした。

## 最後に

コアテクノロジーグループの私のチームでは下記のような記事を書いています。

* [Pure Rustで生まれ変わったPostgreSQL公式構文準拠SQLフォーマッター「uroborosql-fmt」をリリース🎉 | フューチャー技術ブログ](https://future-architect.github.io/articles/20250929a/)
  * Pure Rustでpostgresqlの構文準拠のcst-parserを実装しています
* [ANTLRを業務で活用した話 | フューチャー技術ブログ](https://future-architect.github.io/articles/20200903/)
  * ANTLRのようなパーサージェネレーターを利用することもあります
* [Pyright を LSP サーバとした自作 LSP クライアント（実装編） | フューチャー技術ブログ](https://future-architect.github.io/articles/20220303a/)
  * PyrightというPythonの型チェッカーを言語解析エンジンとして利用した事例

コアテクノロジーグループでは、現在チームメンバーを募集しています。言語処理やコンパイラー技術が好きな方、グラフ理論、グラフ可視化、アルゴリズム好きな方、ソフトウェア工学の知識を使って仕事をしたい方を歓迎します。

興味がある方はお気軽に技術ブログTwitterや会社採用HPへ、連絡をお待ちしております。

https://www.future.co.jp/recruit/

## 注釈

[^apex]: ApexとはSalesforceのプラットフォーム専用言語です。Java5に似た構文を持ちながら、SOQL/SOSLといった独自のオブジェクトクエリ機能を持つ言語です。[公式サイト：Apex とは? | Apex 開発者ガイド | Salesforce Developers](https://developer.salesforce.com/docs/atlas.ja-jp.apexcode.meta/apexcode/apex_intro_what_is_apex.htm)
[^interop]: interopとは、JavaコードとJavaScript/WASMコードが相互に呼び出し合うための仕組みです。
[^ast]: AST（Abstract Syntax Tree）とは、ソースコードの構文構造を表す木構造のデータです。パーサーはソースコードをASTに変換し、バイナリ生成やコード解析などの後続処理で利用されます。
