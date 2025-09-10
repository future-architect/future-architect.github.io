---
title: "循環的複雑度の計算を題材にRoslyn APIを使ってみた"
date: 2022/06/14 00:00:00
postid: a
tag:
  - C#
  - 静的解析
category:
  - Programming
thumbnail: /images/2022/20220614a/thumbnail.png
author: 山田修路
lede: "循環的複雑度の計算を題材に、Roslynを用いてVB.NETに対する解析コードをC#で書いてみました。本記事では、メソッド単位の循環的複雑度の計算を、クエリメソッドを用いて構文木を走査する方法とVisualBasicSyntaxWalkerを継承したクラスを用いて構文木を走査する方法の2通りの方法を紹介します。"
---
TIG コアテクノロジーユニットの山田です。ソースやドキュメントを解析してファクト分析を行う仕事をしています。

今回は循環的複雑度の計算を題材に、Roslynを用いてVisual Basic.NETに対する解析コード[^1]をC#で書いてみました。本記事では、メソッド単位の循環的複雑度の計算を、クエリメソッドを用いて構文木を走査する方法とVisualBasicSyntaxWalkerを継承したクラスを用いて構文木を走査する方法の2通りの方法を紹介します。それぞれの方法の特徴は以下の通りです。

1. クエリメソッドを用いる方法
    * あるノードの子ノードや子孫ノード、祖先ノードをクエリメソッドにより列挙して処理する形になります
    * いわゆるXMLに対するXPathやHTMLに対するCSSセレクタのようなインタフェースです
1. VisualBasicSyntaxWalkerを継承したクラスを用いる方法
    * どの型のノードを訪問した際にどんな処理をするかというのを記述する方式となります
    * いわゆるVisitorパターンです

## Roslynとは

Roslynとは.NET Compiler Platformのコードネームで、コード解析ツール構築のためのAPIを持つコンパイラです[^2] [^3]。Roslynが提供しているAPIを用いることで簡単に静的解析を行うことが出来ます。Microsoft公式で開発されているため、安心感がありますね。

## 循環的複雑度について

循環的複雑度とはコードの品質を表す指標の1つで、循環的複雑度が高いほど複雑な構造であるといえます。[^4] [^5]

循環的複雑度は制御フローグラフのノード数nとエッジ数eから `e - n + 2` という形で計算できます。
制御フローグラフに分岐が1つもない場合、この値は1となり、分岐が増えるごとに値が増えていくため、分岐の数 + 1という形で簡単に求めることができます。

今回の記事では、`If`, `ElseIf`, `For`, `For Each`, `While`, `Case`, `Catch` の数を数えて循環的複雑度を算出[^6]することにします。
なお、`IIf` は一見三項演算子のようですが、扱いとしてはただの関数なので今回は対象としませんでした。自前で算出すると自由に計算ロジックを変えられるので、プロジェクトのルールに応じてカスタマイズできますね。

具体的には以下のようにカウントします。

```vb
Public Class A
    ' 分岐の数は合計で10個なので循環的複雑度は11となる
    Public Shared Sub Main()
        Dim i As Integer = 1
        ' ここで+1
        If i = 1 Then
            Console.WriteLine("A")
        ' ここで+1
        ElseIf i = 0 Then
            Console.WriteLine("B")
        Else
            Console.WriteLine("C")
        End If

        ' ここで+1
        While i > 0
            i -= 1
        End While

        ' ここで+1
        For index As Integer = 0 To 1
        Next index

        Dim lst As New List(Of String) From {"A", "B", "C"}
        ' ここで+1
        For Each elem As String In lst
            Console.WriteLine("{0}", elem)
        Next

        Try
            Throw New Exception()
        ' ここで+1
        Catch ex As Exception
            Console.WriteLine("Catch")
        End Try

        ' ここで+1
        Dim s As String = If(Nothing, "hoge")

        ' ここで+1
        i = If(0 = 0, 1, 2)

        ' ここは+1しない
        i = IIf(0 = 0, 1, 2)

        Select Case 2
            ' ここで+1
            Case 0
                Console.WriteLine("0")
            ' ここで+1
            Case 1
                Console.WriteLine("1")
            Case Else
                Console.WriteLine("Else")
        End Select
    End Sub

End Class
```

## 環境構築

下記ツールをインストールします

* .NET 6.0 SDK
* Visual Studio Code
  * C# 拡張機能

### プロジェクト作成

下記コマンドでプロジェクトを作成します（`-o`で指定しているのはプロジェクト名です）。
これによりカレントフォルダに `RoslynBlog.csproj` ファイルが作成されます。

```bash
dotnet new console -o RoslynBlog
```

### デバッガの設定

さて、ここまでで C# の開発環境とプロジェクトの作成が済みましたが、まだデバッガが使用出来ない状態です。続いてデバッガの設定をしていきましょう。
といっても手順は簡単で、Visual Studio Codeのデバッグパネルを開き、 `create a launch.json file` をクリックするだけです。
これにより、`launch.json`が作成され、このようにデバッグが可能となります。
<img src="/images/2022/20220614a/2022-06-01_16h51_12.png" alt="2022-06-01_16h51_12.png" width="540" height="256" loading="lazy">

これで無事にデバッグできるようになりました。
<img src="/images/2022/20220614a/2022-06-02_13h23_24.png" alt="2022-06-02_13h23_24.png" width="679" height="223" loading="lazy">

## 開発

### パッケージ追加

まず今回使用するパッケージを追加します。

```bash
dotnet add package Microsoft.Build.Locator --version 1.4.1
dotnet add package Microsoft.CodeAnalysis --version 4.2.0
dotnet add package Microsoft.CodeAnalysis.VisualBasic --version 4.2.0
dotnet add package Microsoft.CodeAnalysis.VisualBasic.Workspaces --version 4.2.0
dotnet add package Microsoft.CodeAnalysis.Workspaces.Common --version 4.2.0
dotnet add package Microsoft.CodeAnalysis.Workspaces.MSBuild --version 4.2.0
```

`RoslynBlog.csproj` ファイルをエディタで開くことで、依存パッケージが追加されていることが確認できます。言語とビルドツールが統合されており便利ですね。

### 計算対象のプロジェクトの読み込み

`MSBuildWorkspace`を用いてプロジェクトを読み込み、各ドキュメントの各メソッドごとの循環的複雑度を計算して返します。

```csharp
static async Task Main()
{
    MSBuildLocator.RegisterDefaults();

    using var workspace = MSBuildWorkspace.Create();

    var projectPath = @"../TestProjVB/TestProjVB.vbproj";
    var project = await workspace.OpenProjectAsync(projectPath);

    foreach (var document in project.Documents)
    {
        var syntaxTree = await document.GetSyntaxTreeAsync();
        if (syntaxTree == null)
        {
            continue;
        }

        // クエリメソッドを用いて循環的複雑度を計算した結果を出力
        var cyclomaticComplexityByQueryMethod = CalcCyclomaticComplexityByQueryMethod(syntaxTree);
        foreach (var (methodName, cyclomaticComplexity) in cyclomaticComplexityByQueryMethod)
        {
            Console.WriteLine("CalcCyclomaticComplexityByQueryMethod({0})={1}", methodName, cyclomaticComplexity);
        }

        // SyntaxWalkerを用いて循環的複雑度を計算した結果を出力
        var cyclomaticComplexityBySyntaxWalker = CalcCyclomaticComplexityBySyntaxWalker(syntaxTree);
        foreach (var (methodName, cyclomaticComplexity) in cyclomaticComplexityBySyntaxWalker)
        {
            Console.WriteLine("CalcCyclomaticComplexityBySyntaxWalker({0})={1}", methodName, cyclomaticComplexity);
        }
    }
}
```

### クエリメソッドによる循環的複雑度の計算

[こちら](https://docs.microsoft.com/ja-jp/dotnet/csharp/roslyn-sdk/get-started/syntax-analysis#query-methods)で紹介されているクエリメソッドを用いて循環的複雑度を計算します。
循環的複雑度の加算対象となるノードは以下のように判定できます。

```csharp
public static bool IsDecisionNode(SyntaxNode node)
{
    // Case Else は除外
    if (node.IsKind(SyntaxKind.CaseElseStatement))
    {
        return false;
    }

    return
        node is IfStatementSyntax ||
        node is ElseIfStatementSyntax ||
        node is WhileStatementSyntax ||
        node is ForStatementSyntax ||
        node is ForEachStatementSyntax ||
        node is CatchStatementSyntax ||
        node is CaseStatementSyntax ||
        node is TernaryConditionalExpressionSyntax ||
        node is BinaryConditionalExpressionSyntax;
}
```

上記メソッドを用いて、メソッド毎の循環的複雑度は下記のように計算できます。

```csharp
static Dictionary<string, int> CalcCyclomaticComplexityByQueryMethod(SyntaxTree syntaxTree)
{
    var cyclomaticComplexityDict = new Dictionary<string, int>();

    foreach (var methodBlockSyntax in syntaxTree.GetRoot().DescendantNodes().OfType<MethodBlockSyntax>())
    {
        var methodStatementSyntax = methodBlockSyntax.ChildNodes().OfType<MethodStatementSyntax>().First();
        var methodName = methodStatementSyntax.Identifier.Text;
        var methodCyclomaticComplexity = methodBlockSyntax.DescendantNodes().Where(node => CyclomaticComplexity.IsDecisionNode(node)).Count() + 1;

        cyclomaticComplexityDict[methodName] = methodCyclomaticComplexity;
    }

    return cyclomaticComplexityDict;
}
```

### SyntaxWalkerによる循環的複雑度の計算

構文木を走査しながら循環的複雑度を計算するSyntaxWalkerクラスを作成します。

```csharp
internal class CyclomaticComplexitySyntaxWalker : VisualBasicSyntaxWalker
{
    public Dictionary<string, int> CyclomaticComplexityDict { get; } = new Dictionary<string, int>();

    private string _currentMethodName = "";

    public override void VisitMethodStatement(MethodStatementSyntax node)
    {
        _currentMethodName = node.Identifier.Text;
        CyclomaticComplexityDict[_currentMethodName] = 1;
        base.VisitMethodStatement(node);
    }

    public override void VisitIfStatement(IfStatementSyntax node)
    {
        CyclomaticComplexityDict[_currentMethodName] += 1;
        base.VisitIfStatement(node);
    }

    public override void VisitElseIfStatement(ElseIfStatementSyntax node)
    {
        CyclomaticComplexityDict[_currentMethodName] += 1;
        base.VisitElseIfStatement(node);
    }

    public override void VisitWhileStatement(WhileStatementSyntax node)
    {
        CyclomaticComplexityDict[_currentMethodName] += 1;
        base.VisitWhileStatement(node);
    }

    public override void VisitForStatement(ForStatementSyntax node)
    {
        CyclomaticComplexityDict[_currentMethodName] += 1;
        base.VisitForStatement(node);
    }

    public override void VisitForEachStatement(ForEachStatementSyntax node)
    {
        CyclomaticComplexityDict[_currentMethodName] += 1;
        base.VisitForEachStatement(node);
    }

    public override void VisitCatchStatement(CatchStatementSyntax node)
    {
        CyclomaticComplexityDict[_currentMethodName] += 1;
        base.VisitCatchStatement(node);
    }

    public override void VisitCaseStatement(CaseStatementSyntax node)
    {
        // Case Else は除外
        if (!node.IsKind(SyntaxKind.CaseElseStatement))
        {
            CyclomaticComplexityDict[_currentMethodName] += 1;
        }

        base.VisitCaseStatement(node);
    }

    public override void VisitTernaryConditionalExpression(TernaryConditionalExpressionSyntax node)
    {
        CyclomaticComplexityDict[_currentMethodName] += 1;
        base.VisitTernaryConditionalExpression(node);
    }

    public override void VisitBinaryConditionalExpression(BinaryConditionalExpressionSyntax node)
    {
        CyclomaticComplexityDict[_currentMethodName] += 1;
        base.VisitBinaryConditionalExpression(node);
    }
}
```

作成した `CyclomaticComplexitySyntaxWalker`クラス用いて、下記のように循環的複雑度が計算できます。

```csharp
static Dictionary<string, int> CalcCyclomaticComplexityBySyntaxWalker(SyntaxTree syntaxTree)
{
    var walker = new CyclomaticComplexitySyntaxWalker();

    walker.Visit(syntaxTree.GetRoot());

    return walker.CyclomaticComplexityDict;
}
```

## まとめ

今回はRoslynのSyntax APIを使い、Visual Basic.NETのプロジェクトを解析し循環的複雑度の計算をしてみました。
Roslynを使うことで（Solutionや）Projectを簡単に読み込み、解析できることがわかりました。
C#の循環的複雑度もノードの型が違うだけで、ほぼ同じ形で作ることができます。

今回の記事とは関係ないですが、C#だと [Scripting API](https://github.com/dotnet/roslyn/blob/main/docs/wiki/Scripting-API-Samples.md) により、C#のコードをevalすることが可能なのですが、[VB.NETのScripting APIは開発中止になった](https://github.com/dotnet/roslyn/issues/6897#issuecomment-462433349)ようなので今後使える見込みはなさそうです。

[^1]: [vblang/spec at main · dotnet/vblang · GitHub](https://github.com/dotnet/vblang/tree/main/spec) でantlrのgrammarが配布されているのですが、これを使ってparseすることはできないようでした。

[^2]: [GitHub - dotnet/roslyn: The Roslyn .NET compiler provides C# and Visual Basic languages with rich code analysis APIs.](https://github.com/dotnet/roslyn)

[^3]: [10分間で人に説明できるまで分かるCompiler as a Service“Roslyn” - Build Insider](https://www.buildinsider.net/enterprise/sansanreport/0503)

[^4]: [バグの出にくいコードを書く~サイクロマティック複雑度について~ | ｗ２ソリューション株式会社 TECH Media](https://www.w2solution.co.jp/tech/2021/11/26/eg_ns_rs_cyclomaticcomplexity/)

[^5]: [コード メトリック - サイクロマティック複雑度 - Visual Studio (Windows) | Microsoft Docs](https://docs.microsoft.com/ja-jp/visualstudio/code-quality/code-metrics-cyclomatic-complexity?view=vs-2022#the-magic-number)

[^6]: .NETの静的解析ツールであるNDependの場合はcontinue, gotoなどもカウントするようですが、今回は計算対象外としています。[Understanding Cyclomatic Complexity -- NDepend](https://blog.ndepend.com/understanding-cyclomatic-complexity/#:~:text=Along%20with%20the%20if%20keyword%2C%20you%20can%20acquire%20additional%20complexity%20by%20use%20of%20looping%20constructs%20(while%2C%20for%2C%20foreach)%2C%20switch%20blocks%20(case/default)%2C%20jumps%20(continue%2C%20goto)%2C%20exceptions%20(catch)%2C%20and%20compound%20conditional%20enablers%20(%26%26%2C%20%7C%7C%2C%20ternary%20operator).)
