---
title: "Gopher が Rust に入門して感じた Go との違いについて"
date: 2026/05/11 00:00:00
postid: a
tag:
  - Rust
  - Bob
  - SeaORM
  - 入門
  - Go
category:
  - Programming
thumbnail: /images/2026/20260511a/thumbnail.jpg
author: 市川裕也
lede: "業務では主に Go を書いているのですが、「Rust は面白い」という話は方々から聞いており、自分もどこかで学んでおきたい、という気持ちがありました。そこで、せっかくの入門祭りということで、これを機に Rust に入門してみることにしました。"
---

<img src="/images/2026/20260511a/top.jpg" alt="" width="900" height="502">

[春の入門祭り2026](/articles/20260421a/)の8日目の記事です。

## はじめに

こんにちは、CSIG (Cyber Security Innovation Group) の市川です。普段は FutureVuls の開発を主に担当しており、最近はパフォーマンスの課題に重点的に取り組んでいます。

業務では主に Go を書いているのですが、「Rust は面白い」という話は方々から聞いており、自分もどこかで学んでおきたい、という気持ちがありました。

そこで、せっかくの入門祭りということで、これを機に Rust に入門してみることにしました。Rust を学習して簡単な Web アプリケーションを作成してみたので、その感想を共有しようと思います。

## ブログの内容

本記事では、以下の内容についてお話しします。

- どのように学習を進めたか
- Rust の言語仕様で「優れている」と感じた点
- Go を書く時に感じる課題を Rust がどう解決してくれそうか
- Go と Rust で簡単な Web アプリケーションを作ってみた感想

::: note warn

全体的に、 Rust についての知識が不十分故に、不正確な記述となっている可能性があります。あらかじめご了承ください。
間違った記述に気づいた方は、ご指摘いただけますと大変幸いです。

:::

## どのように学習を進めたか

『The Rust Programming Language 日本語版』を読みつつ、読むだけでは分からない部分については写経することで学習を進めました。
https://doc.rust-jp.rs/book-ja/title-page.html

Go との違いを理解したい気持ちが強かったので、Go に存在しない「所有権」「enum」「Result 型」「ライフタイム」あたりを重点的に読みました。

以下の内容はほぼ触れていないため、時間がある時に読みたいなと思います。

- スマートポインタ
- 並行処理
- マクロ
- etc...

読むだけでは理解が追い付かなかった部分については、以下の動画も参照しました。
『The Rust Programming Language 日本語版』を丸々解説してくださっている素晴らしい動画でした。
https://www.youtube.com/watch?v=tw2WCjBTgRM

## Rust の優れていると感じた点

ここからは、 Rust に触れてみた感想をつらつらと記載していきます。

### 所有権・参照が、メモリ安全性を担保してくれている

Rust のメモリ安全性を担保するための核となっている仕様として、「所有権」「参照」というものがあります。
これらの概念を理解したい方は、『The Rust Programming Language 日本語版』などを読んでいただければと思います。
自分の理解を非常にざっくり以下に記載しておきます。

- 所有権
  - Rust の各値には、所有者が存在する
  - 値を代入したり、関数に値を渡したりすると、所有権が移動 (ムーブ) する
  - いかなる時も、所有者はひとりである
  - 所有権が移動すると、元の変数は使用できなくなる
  - 所有者がスコープから外れると、その値は破棄 (drop) される
  - **使用できなくなった変数を使用しようとすると、コンパイルエラーになる**

```rs
let x = String::from("hello");
let y = x;

println!("x: {}", x); // x の所有権が y にムーブしているので、これはコンパイルエラーになる
```

- 参照
  - 値をいちいちムーブさせるのが面倒くさい時は、参照を使う
  - 参照には、不変参照と可変参照が存在する。不変参照は `s: &String`、可変参照は `s: &mut String` みたいな書き方をする
  - ある瞬間において、ひとつの可変参照、または任意個の不変参照のどちらかしか作成できない
  - 可変参照が有効な間は、元の値にもアクセスできなくなる (読み取りも書き込みも不可)
  - **可変参照が作成されている間に不変参照を作成したり、元の値にアクセスしようとすると、コンパイルエラーになる**

Rust が素晴らしいなと感じたのは、所有権や参照のルールを破ろうとした場合に、 **コンパイルエラーになる** ということです。
Go の永遠の課題である、「想定外の値の変更」や「nil アクセスエラー」を、コンパイルの時点で防いでくれるのには、感動を覚えました。

### enum があり、排他的な処理を書きやすい

Rust の enum は、各値がデータを持つこともできる「代数的データ型」として実装されています。
これにより、 `match` 式で網羅性のチェックが効くため、 「特定の値に対する排他的な処理」 を安全に書けるようになっています。
また、 値の有無を表す `Option` 型やエラーを表現する `Result` 型もこの enum の仕組みの上に成り立っており、 null 処理やエラー処理を型システム上で安全に書くための基盤となっています。 (Go との比較の節でもこの話をします)

enum が、メモリ安全の担保や nil の排除において大きな役割を果たしているのが、面白いなと感じました。

### nil が存在しない

Rust には、なんと nil が用意されていません。 今まで nil が存在しない言語に出会ったことがなかったため、非常に驚きました。
(生ポインタを unsafe ブロック内でデリファレンスすることで nil 相当の挙動を扱うことはできるそうですが、未学習のため本記事ではスキップします)
では、どのように「値が存在しないことを表すか」というと、 `Option` という enum を用います。

```rs
enum Option<T> {
    None,
    Some(T),
}
```

このように nil 相当のものをそもそも扱わせない仕様になっているのは、メモリ安全性を高める上で非常に有効であり、かなり好感を持ちました。
Go の nil 問題との具体的な比較は、 後の節「`Option` 型 + nil が存在しないこと: nil アクセスをコンパイラが防いでくれる」で扱います。

## Go を書く時に感じる課題をどう解決してくれそうか

「Rust のこの仕様により、Go を書いていてよく感じる課題が解決されるのでは？」と感じる点がいくつかあったため、
この節では、「Go の課題に対するアプローチ」という観点で Rust の良いと思った点を書いていきます。

### 不変参照: 「値が変更されないこと」を明示できる

Go を書く際、大きな構造体が毎回コピーされるのを防ぐため、構造体のポインタを関数の引数に渡したいケースはよくあるかと思います。

```go
type Hoge struct {
    fuga int
}

func ProcessHoge(hoge *Hoge) {
    // Hoge に対してなんらかの操作をする
    hoge.fuga = 10000
}

func main() {
    hoge := Hoge{fuga: 1}
    ProcessHoge(&hoge) // hoge に対して、 ProcessHoge の中でどんな操作が行われるか分からない
}
```

このようなケースの大きな問題として、「 `ProcessHoge` の先で `Hoge` が変更されるかが分からない」といったものが挙げられます。

Rust では、参照が可変か不変かを記述することができるため、以下の `not_change_hoge` のように、「この関数では `hoge` を変更しません」という仕様を明示できます。

引数を見ただけで、その引数が変更される可能性があるかどうか分かるというのは、可読性や保守性の観点で非常にありがたいです。

この仕様は、「 `ProcessHoge` の先で `Hoge` が変更されるかが分からない」といった課題を解決してくれるものだと感じました。

```rs
struct Hoge {
    fuga: i32,
}

fn process_hoge(hoge: &mut Hoge) {
    hoge.fuga = 10000;
}

fn not_change_hoge(hoge: &Hoge) {
    // 不変参照を受け取っているので、 hoge を変更できない
}

fn main() {
    let mut hoge = Hoge { fuga: 1 };
    process_hoge(&mut hoge);
    not_change_hoge(&hoge);
}
```

### enum: 排他的な処理をコンパイラが担保してくれる

Go には enum が存在しません。

そのため、 enum 的な「特定の複数個の値」に対して、排他的な処理を行えているかが、言語仕様としては担保されないという課題があります。

例として、 [bob](https://github.com/stephenafamo/bob) という Go の ORM が、データベースの enum 型のカラムを Go のコードとして表すために生成する、以下のような型を考えます。

```go
// Enum values for TodoStatus
const (
    TodoStatusPending    TodoStatus = "pending"
    TodoStatusInProgress TodoStatus = "in_progress"
    TodoStatusDone       TodoStatus = "done"
)

type TodoStatus string
```

この TodoStatus のように「特定の複数個の値」に対しては、 **排他的に** 処理を書きたい場面がよくあります。
しかし Go の場合、 `switch` の case 文で網羅できていない値があってもコンパイラがエラーを出してくれません。そのため、排他性を担保するには目視で確認したり、テストで担保したりする必要があります。
また、 enum 値を後から追加した場合の対応漏れも、同様にコンパイラでは検知できません。

```go
func NextLabel(s TodoStatus) string {
    switch s {
    case TodoStatusPending:
        return "未着手"
    case TodoStatusInProgress:
        return "進行中"
    // TodoStatusDone を書き忘れてもコンパイルは通る
    }
    return ""
}
```

Rust であれば、処理していない enum がある場合 (= 排他的な処理ができていない場合) はコンパイルエラーになってくれます。
また、後から enum を追加してその enum の処理を忘れていた場合であっても、コンパイラがエラーを吐いてくれるため、処理の書き忘れも防ぐことができます。

```rs
enum TodoStatus {
    Pending,
    InProgress,
    Done,
}

fn next_label(s: TodoStatus) -> &'static str {
    match s {
        TodoStatus::Pending => "未着手",
        TodoStatus::InProgress => "進行中",
        // TodoStatus::Done を書き忘れると `non-exhaustive patterns` でコンパイルエラー
    }
}
```

### Option 型 + nil が存在しないこと: nil アクセスをコンパイラが防いでくれる

Go で「値が存在するか不明」を表現するイディオムの一つに、ポインタを返し nil で「無し」を示す書き方があります。

```go
type Hoge struct {
    fieldA int
}

func ReturnHogeOrNil() *Hoge {
    return nil
}

func main() {
    // nil チェックを挟む
    hoge := ReturnHogeOrNil()
    if hoge == nil {
        fmt.Printf("hoge is nil")
        return
    }
    // nil でないことを確認しないと、 hoge に対する操作を行えない
    fmt.Printf("fieldA:%d", hoge.fieldA)
}
```

この nil チェックが正しく行われているかは、コンパイル時にはチェックできず、ランタイム時の panic の大きな要因となります。
「nil チェック問題」は gopher を悩ませる大きな悩みのひとつでしょう。

一方、同じことを Rust で書くと、以下のように `Option<Hoge>` を返す形になります。

```rs
struct Hoge {
    field_a: i32,
}

fn return_hoge_or_none() -> Option<Hoge> {
    None
}

fn main() {
    let hoge = return_hoge_or_none();
    // hoge は Option<Hoge> 型なので、いきなり hoge.field_a と書くとコンパイルエラーになる
    // println!("field_a: {}", hoge.field_a);

    // None / Some を場合分けしないと、中身に触れられない
    match hoge {
        Some(hoge) => println!("field_a: {}", hoge.field_a),
        None       => println!("hoge is none"),
    }
}
```

`return_hoge_or_none` の戻り値は `Hoge` ではなく `Option<Hoge>` なので、 そのまま `hoge.field_a` のようにアクセスしようとするとコンパイラがエラーを出してくれます。
`match` (もしくは `if let`) で `None` と `Some` を書き分けないと中身に触れられない作りになっているため、 「nil チェック忘れ」 という Go でよく起こりがちな状況が、 言語仕様の段階で防がれています。

## 簡単な Web アプリケーションを作ってみた感想

普段 Web アプリケーション開発に携わっている身としては、やはり Rust で Web アプリケーションを作る際の体験がよいのかは気になるところです。

こちらを確認するために、 Go と Rust で同じような挙動をする簡単な Web アプリケーションを作り、比較してみました。
以下に作成したコードを公開しています。
https://github.com/yy-at-here/compare-go-rust

> ※ Go と Rust 自体の比較というよりは、 選定したライブラリ/クレート の比較になってしまっているかもしれません。ご了承ください。

### Web フレームワーク (axum) について

Web フレームワークとして axum クレートを使用してみました。
ルーティング処理の書き方は思ったより難しくなく、ハンドラや extractor の設計のおかげで、所有権やライフタイムをほぼ意識せずに書くことができました。

DDD 的なディレクトリ構造への分割も、割と素直に表現できました。

### ORM について

ORM の使い心地に関しては、Go（というか bob）に軍配が上がると感じました。以下、その点について述べます。

以下の 2 つの ORM を比較してみました。
どちらも、 DB からモデルを生成できる ORM です。

- Go : [bob](https://github.com/stephenafamo/bob)
- Rust : [SeaORM](https://github.com/seaql/sea-orm)

以下のようなモデルで、 特定の group にひもづく users と todos をすべて取得するような処理を考えます。

```
[Group]  ──|──<  [User] ──|──< [Todo]
```

bob では、 eager load を連鎖的かつ直感的に書くことができます。
また、関連テーブルとのリレーションも生成されるモデルに含まれるため、わざわざ構造体を別途用意しなくとも Group モデルから Users や Todos を辿れる形になっています。

```go
func (q *groupQuery) FindByID(ctx context.Context, id int64) (*dbmodels.Group, error) {
    dbGroup, err := dbmodels.Groups.Query(
        dbmodels.SelectWhere.Groups.ID.EQ(id),
        dbmodels.SelectThenLoad.Group.Users(
            dbmodels.SelectThenLoad.User.Todos(),
        ),
    ).One(ctx, q.exec)

    return dbGroup, nil
}
```

また、以下のように簡単に関連テーブルにアクセスすることができます。 (ただし、その代償として nil check の面倒くささは課題としてあります)

```go
func main() {
    group, _ := q.FindByID(ctx, 1)
    if group == nil || group.R == nil {
        return
    }
    for _, user := range group.R.Users {
        if user.R == nil {
            continue
        }
        for _, todo := range user.R.Todos {
            // todo に関する処理
        }
    }
}
```

SeaORM から生成されるモデルでは、 group.R.Users のように group のフィールドに users が紐づいてくれません。
また、連鎖的な eager load も書けません。
group に紐づいた形で users も todos も持つためには、以下のように `Option<(groups::Model, Vec<(users::Model, Vec<todos::Model>)>)>` という長い型で持つ必要が出てきます。

```rs
async fn find_by_group_id(&self, group_id: i32) -> Result<
    Option<(groups::Model, Vec<(users::Model, Vec<todos::Model>)>)>,
    crate::errors::AppError,
> {
    // まず group を取得
    let Some(group) = groups::Entity::find_by_id(group_id as i64).one(&self.db).await? else {
        return Ok(None);
    };

    // 次に、 group に紐づく users と todos を取得
    let users = group.find_related(users::Entity).all(&self.db).await?;
    let todos_per_user: Vec<Vec<todos::Model>> = users.load_many(todos::Entity, &self.db).await?;

    // users と todos をひとつのタプル列にまとめる
    let users_with_todos: Vec<(users::Model, Vec<todos::Model>)> =
        users.into_iter().zip(todos_per_user).collect();

    Ok(Some((group, users_with_todos)))
}

// 呼び出し側では、 Option と長いタプル型をネストで分解する必要がある
if let Some((group, users_with_todos)) = repo.find_by_group_id(1).await? {
    // group: groups::Model
    // users_with_todos: Vec<(users::Model, Vec<todos::Model>)>
    for (user, todos) in users_with_todos {
        // user に紐づく todos に対する処理
    }
}
```

上記の例はテーブルが 3 つだからまだそこまで複雑なコードにはなっていませんが、より複雑なリレーションを扱いたい場合は、コードの記述量や自前で定義する struct が多くなり、かなり大変なのではないか、という印象を受けました。
また、 `group.R.Users[i].R.Todos` と連鎖的にたどることができないのも、個人的にはつらく感じました。

ORM ごとの設計思想の違いも関わってくるところだとは思うので、どちらが良い/悪いという話ではないかなと思いますが、個人的には bob の方が使いやすいなと感じました。
連鎖的な eager load や `group.R.Users[i].R.Todos` のような辿り方を Rust で実装するのがどれくらい難しいのか、色々調べてみたのですがよく分からなかったため、知見ある方いたら教えていただけますと大変嬉しいです。

## おわりに

Rust を書くと、「今この値は生きているのか」「この値は今誰が所有しているのか」「この値は不変にすべきか可変でよいか」といったことを嫌でも意識せざるを得ず、結果としてメモリの安全性を担保するためのマインドセットが醸成されるような感触を受けました。
Rust は確かに難しく、Rust 特有の概念 (所有権、ライフタイム、スマートポインタ など...) を理解する必要があります。ただ、この難しさの壁については、 AI に色々質問できるようになったことで、ある程度緩和されているな、と学習しながら感じていました。
Go で感じていた課題が Rust によって色々と解決されており、より堅牢性や速度が求められる場面では、 Rust を選択するのもありと感じました。

一方、大規模な Web アプリケーションに向いているのかは判断しきれませんでした。大規模になってくるとビルドが非常に遅い、みたいな話もあり、ローカルでのテストや CI の実行時間が長くなってしまうのは地味に懸念ポイントのひとつかな、とも思います。
このあたり知見がある方がもしいらっしゃいましたら、コメントなどで教えていただけると嬉しいです。

ともあれ、 Rust は「所有権」や「ライフタイム」などの独自の概念によって、堅牢性・メモリ安全性と速度を両立させている、非常に面白い言語でした。
また機会を見つけて触ってみようと思います。

