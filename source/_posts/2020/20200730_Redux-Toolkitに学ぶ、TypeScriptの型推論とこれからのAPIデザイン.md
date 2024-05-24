---
title: Redux-Toolkitに学ぶ、TypeScriptの型推論とこれからのAPIデザイン
date: 2020/07/30 00:00:00
postid: ""
tag:
  - TypeScript
  - Redux
  - React
category:
  - Programming
thumbnail: /images/20200730/thumbnail.png
author: 澁川喜規
lede: "TypeScriptは、JavaScriptのさまざまなフリーダムな書き方を受け入れ、漸進的な型付けを行えるようにするという~~狂った~~高難易度な目的のために作成されているのですが、そろそろ、TypeScriptファーストで、利用者にとって使いやすいAPIみたいな方向性で使われることも増えるのでは、という思いを強く持ちました。「"
---

<img src="/images/20200730/top.png" loading="lazy">


TypeScriptは、JavaScriptのさまざまなフリーダムな書き方を受け入れ、漸進的な型付けを行えるようにするという~~狂った~~高難易度な目的のために作成されているのですが、そろそろ、TypeScriptファーストで、利用者にとって使いやすいAPIみたいな方向性で使われることも増えるのでは、という思いを強く持ちました。「既存のJSプロジェクトをTypeScript化して〜」みたいな紹介のされ方はもはや過去のものになったのではないかと。

すでに[State of JavaScript 2019](https://2019.stateofjs.com/javascript-flavors/typescript/)では2/3のユーザーがすでにTypeScriptを利用したことがある（使っている）と答え、残りの1/3も学びたい、と答えている状況です。この勢いだと、2年後には80%を超えそうです。僕自身も、TypeScriptファーストな世界がくることを想像して[説明に使える教科書](https://github.com/future-architect/typescript-guide/)を書き始めたわけですが、思ったよりもその世界が来るのは早そうです。

このエントリーでは、TypeScriptユーザーのTypeScriptユーザーによるTypeScriptユーザーのためのAPI設計について考えをまとめてみたいと思います。想定読者は、フレームワークを作るような人ですので、既存のライブラリを組み合わせてアプリケーションを作る人は想定外です。

ちなみに、相互運用の話などはオライリージャパンから出版されている[プログラミングTypeScript](https://www.oreilly.co.jp/books/9784873119045/)の11章などで詳しく説明されているので、そちらをみると良いと思います。JSから移行については話はしません。

# 3行まとめ

* TypeScriptの型推論は制約があって、他の関数型言語で提供されているものよりは弱い
* うまく推論を活用して、コード補完とか型チェックが利きやすいAPIを作ろう
* JavaScript時代とはAPIの形が変わるかもよ/変えて行こう

# 前回のおさらい

TechBlogで以前、Redux Toolkitの紹介を書きました。今回のエントリーはその続きです。

* [TypeScriptでReactをやるときは、小さいアプリでもReduxを最初から使ってもいいかもねというお話](/articles/20200501/)

> 最近、僕が意識しているのはリーダブルなコードです。これはオライリーの本のReadableではなくて、コードが人を導いてくれる（Leadable）という意味です。一方で、ReduxとTypeScriptで感じていたのは、処理系を通すためにコードを書かされているという感覚ですね。オーダブル(Orderable)と呼んでいるけど、もっといい名前があったら教えてください。Redux Toolkitはだいぶ余計なことに頭を使わなくて済むので、とても良いです。
> (略)
> Redux toolkitと生のReduxを使って見て思うのは、ライブラリの設計の難易度が3倍ぐらいになったなぁ、という感じですね。TypeScriptで型推論が入ったのはあるのですが、その型推論が効きやすい、ライブラリユーザーが実装しなきゃいけない型情報を減らすための設計というのが、この後の主戦場になりそうだなぁ、ということです。今まではデータを加工する、というロジックだけを設計すれば良かったのですが、データの伝搬だけじゃなくて、型情報の伝搬というのも考慮しなければならないと。ある意味、C++プログラマーのテンプレート経験が生きるのかも、なぁ、という。まだあまり言語化できないのですが。Haskellな人とか得意だったりするんですかね？

# 型の伝搬

使いやすいAPIというのは、その今入力しようとしている箇所の情報が十分に得られるということです。それは型です。しかし、型を全部覚えていて間違いなく宣言しなければならないとすると、入力の補助にはなりませんし、タイプ数も増えます。わざわざ入力しなくてもきちんと情報が得られるようになるのが型推論です。型推論はその場の環境から型を決定していきます。

前回のエントリーの最後に書いたのが型の伝搬です。型推論(type inference)ではあるのですが、TypeScriptの場合はより強力な型推論を持つ言語と比べると、推論する方向が限定されているのであえて伝搬と呼びましたが、型推論です。

方向が決まっていて機能が弱いのは欠点でもありますが、長所でもあります。処理系の挙動はわかりやすく、エラーメッセージもシンプルですし、コンパイルも早いです。

## 代入

一番基本的な推論は、代入ですね。

```ts
const greeting = "hello world";
```

丁寧に書くなら次のように型情報を入れることになりますが、右辺から明らかなので、左側の代入部分では型を省略できますね。

```ts
const i: string = "hello world";
```

逆方向には推論はできません。当たり前に思えるかもしれませんがそうではありません。逆方向に推論ができるとしたら、左辺から右辺の関数の返り値の型を推定して、そこから、引数``i``の型も決まって「testの呼び出し時の引数の型が違う」となりますが、TypeScriptの場合は一方通行なので、右辺の型が全部解決してから左辺を処理するため、「数字は文字列の変数に代入できない」というエラーになります。

```ts
let s: string;
const i: number = 10;

function test<T>(i: T): T {
    return i;
}

// Type 'number' is not assignable to type 'string'.
s = test(i);
```

型変数を持つクラスを型を指定しないでインスタンス作成した場合は、``unknown``が指定されたものとしてインスタンスが作成されます。最初の``append()``の引数をみて、T=numberと推論してくれることはTypeScriptではありません。そのため、次の文字列の``append()``も成功してしまいます。エラーになってくれません。

```ts
class List<T> {
    private list = new Array<T>();
    append(i: T) {
        this.list.push(i);
    }
}

const l = new List();
l.append(10);
l.append("string");
```

``unknown``のまま動いちゃうと、TypeScriptからJavaScriptの世界に逆戻りをしますが、まあそれでも動いてくれるのはTypeScriptらしいところではあります。[Goのジェネリクスだとエラーになる](https://go2goplay.golang.org/)のでインスタンス作成時に明示的な型変数指定が必要になります。

## 関数、メソッドの引数

引数から、それが属する関数の型変数への伝搬は可能です。というよりも、関数の型変数に推論で型を自動設定する方法は引数経由が唯一の方法です。

単なる``T``でなくても、``T[]``のような配列でも、``(input: T) => void``みたいな引数であっても、きちんと解決してくれます。

```ts
function f<T>(a: T) {
    console.log(a);
}
```

引数同士の伝搬も見逃せない要素です。Redux-Toolkitの``createSlice()``をシンプルに書くと次のようになります。

```ts
function createSlice<S>(state: S, reducers: {[key: string]: (s: S) => S}) {
}
```

これの良い点は、最初の引数のinitialStateから型情報が伝搬し、2つ目のオブジェクトの型の定義が完成する点にあります。このreducersの関数をユーザーが作成する場合は、sはState型と分かっているのでコード補完が聞きますし、returnの方が間違えば即座に赤線が引かれます。

```ts
type State = {
    name: string,
}

const initialState: State = {
    name: "shibukawa"
};

createSlice(initialState, {
    greeting: (s) => {
        console.log(`hello ${s.name}`);
        return s;
    }
})
```

## 関数の返り値

関数の返り値の推論が賢いのはTypeScriptのうれしいところです。引数と違って返り値は内部のロジックで決まるので省略可能ですが、ESLintの推奨設定で``explicit-function-return-type``がデフォルトでONになっており、明示的に書かないといけません。僕はこの設定はオフにしてしまいますし、仮に宣言を省略しても.d.tsには型情報としては現れるし、コード補完は聞くし、型宣言をソースコードをgrepして目で見れない以外のデメリットはないです。

```ts
function a() {
    if (Math.random() > 0.5) {
        return 10 as number;
    } else {
        return "test" as string;
    }
}
```

これは次のように推論されます。なお、as number、as stringを外すと、 `10 | "test"`になります。

```ts .d.ts
declare function a(): string | number;
```

オブジェクトを返す場合は挙動がちょっと違います。Reduxのaction creatorでよく見るような次ような関数ですね。

```ts
const ADD_TODO = "ADD_TODO"

function addTodo(text: string) {
  return {
    type: ADD_TODO,
    text
  }
}
```

これはこうなります。

```ts .d.ts
declare function addTodo(text: string): {
    type: string;
    text: string;
};
```

レスポンスを文字列型ではなくて、特定の文字列``ADD_TODO``固定としたい場合は、``as const``をつけます。↑の例のconstの変数を参照したままas constをつけるとエラーが出ますので、文字列リテラルにしています。

```ts
function addTodo(text: string) {
  return {
    type: "ADD_TODO" as const,
    text
  }
}
```

```ts .d.ts
declare function addTodo(text: string): {
    type: "ADD_TODO";
    text: string;
};
```

関数の返り値から、型ユーティリティの``ReturnType``を使うと、型を取り出すことが可能です。↑の``as const``はこの型を使う場合に大切になります。Reduxのreducerのactionの型指定で、すべてのAction Creatorの返り値の型の合併型を作るときに、"ADD_TODO"の部分が残っていると嬉しいからです。

```ts
type AddTodoAction = ReturnType<typeof addTodo>;
type DoneTodoAction = ReturnType<typeof doneTodo>;
type Actions = AddTodoAction | DoneTodoAction;

const initialState = {
  todos: [] as Todo[]
};

function todoApp({todos} = initialState, action: Actions) {
  switch (action.type) {
    case "ADD_TODO": // ここで各アクションの関数がreturnしてない文字列を書くとエラーが検知される
    default:
      return {todos}
  }
}
```

最初の例はADD_TODOをconst変数にしていました。変数の有無であればTypeScriptでなくてもJSでもエラーチェックが利くためにReduxで「アクションの識別子はconst変数にする」がベストプラクティスになったと思いますが、そもそもTypeScriptでは文字列のままでもチェックが利くので、変数宣言が省略できるようになりました。

このオブジェクトを返す場合の型定義は、ほとんどがnullableでない場合はこのように関数に直接書いてもいいですが、nullableだったり型指定のある配列だったりする場合は型アノテーションをたくさんつけなければならず、タイプ数が多くなってきてしまいますし、見通しも悪くなります。また複数箇所で利用する場合などは外部に型定義を書く方が良いですね。

なお、TypeScriptでは返り値を受け取る変数の型から、返り値の方を推論して決めることはできません。これはまあ返り値を受ける=代入なので、代入の右辺への推論が効かない以上、当然ですね。

## クラスとメンバー

クラス側に型変数を定義すると、メンバーでも使えます。まあ当然ですね。メンバー変数と、メンバーメソッドの引数や返り値で利用可能です。

```ts
class List<T> {
    private list = new Array<T>();
    append(i: T) {
        this.list.push(i);
    }
}
```

逆に、メンバーで定義された型変数は他のメソッドやクラス側で使えません。

```ts
class List<T> {
    private list = new Array<T>();
    append<U>(i: T, e: U) {
        this.list.push(i);
        console.log(e);
    }
}
```

ただし、コンストラクタを除きます。コンストラクタの引数を元に、型変数を決定することはできます。この特性は大切で、クラスの型変数に型を伝搬させるには、クラスの型変数にはコンストラクタを使う方法以外はありません。そうでなければ明示的に型を渡して初期化（``new List<number>()``しなければなりません。

```ts
class List<T> {
    private list = new Array<T>();
    constructor(a: T) {
        this.list.push(a);
    }
}
```

解決できないのが``Promise``の引数のような``(asyncTask: (resolve: (i: T)=>void) => void``といった、コンストラクタの引数が関数で、その関数の入力値で型を決めるようなケースです。このようなケースでは型が決定できず、``Promiseの型変数``は``unknown``のままです。この場合だけは``new Promise<number>``と明示的に書いてあげる必要があります。

```ts
function promiseTest() {
    return new Promise(resolve => {
        resolve(10);
    });
}
```


## 例外

ここがTypeScriptの型推論の秘孔かな、と思います。まず、Javaのthrows宣言がない（何が飛んでくるか事前にわからない）、``Promise``で``reject``に渡される例外の型定義がないからです。受け取り側に型として伝わる物が何もありません。

そもそも、TypeScriptは例外を扱うのが元のJavaScriptの特性もあって苦手です。

* [JavaScript/TypeScriptの例外ハンドリング戦略を考える](https://qiita.com/shibukawa/items/ffe7264ecff78f55b296)

型の補完も効いて、タイプ数も少なくて済み、関数やメソッドの外で別の要素を定義しなくても良い方法は、Goスタイルで返り値の一部として返す方法なんじゃないかと思っています。

```ts
function calcAge(birthDay: Date) {
    let age = -1;
    let error = "";
    const today = new Date();
    const tNum = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const bNum = birthDay.getFullYear() * 10000 + (birthDay.getMonth() + 1 ) * 100 + birthDay.getDate();
    if (bNum > tNum) {
        error = "birthday is future"
    } else {
        age = Math.floor((tNum - bNum) / 10000);
        if (age > 120) {
            error = "too old";
        }
    }
    return {
        age,
        error,
    }
}
```

これであれば補完も利くし、``if (res.error)``みたいに条件分岐も簡単です。

オライリーのTypeScript本では、正常系のレスポンスと、Errorの合併型を返し、受け取り側でinstanceofを使って条件わけをしていました。オブジェクトのほうが利用コード側のタイプ数は少ないので個人的には好きかな、と思いました。思いっきりGo風に寄せるためにタプルを使うこともできますが、それよりはオブジェクトの方がもろもろ良い気がします（受け手が分割代入で変数名を自分でつけなければならない、エラーを返す時にundefinedを入れる必要があるetc）。

# 型推論の途中での型演算

推論中に型の演算を行いたい、例えば、入力されたオブジェクトと同一のキーを持つが、シグネチャが全く別の関数を持つオブジェクトを定義して、それを返り値に使いたいとします。ちょうど、Redux ``createSlice`` が、``reducers``で渡されたreducerが格納されたオブジェクトを引数にとって、同じキーのアクションが入ったオブジェクトを作って、返り値の``actions``に入れて返しています。

型推論の流れとしては、引数→返り値のよくある推論なのですが、同じ型``T``を使うのではなくて、ちょっとした演算が必要です。この場合は、引数→関数の型変数→返り値と、関数の型変数をワンクッション置けば良いようです。

ジェネリックな型定義を、型を引数に持つ関数と見立てて作成します。まずはReducersと、Actionsを作ります。模擬コードなのでアクションの引数はなし、とします。

Reducersは関数の引数で渡されるオブジェクトで、Actionsは返り値で使うオブジェクトです。引数側はシンプルです。ステートの型を引数にとったら、それを引数にとって、返り値として返す関数を持つオブジェクトです。Actionsの方は、引数のR(reducer)を引数ニトリ、それと同じ属性を持つオブジェクトで、オブジェクトの値の型は、オブジェクトを返す関数です。``{[P in keyof R]: 値の型}``で、同じキーを持つ値の型違いのオブジェクトを作り出しています。

```ts
type Reducers<S> =  {[key: string]: (s: S) => S};

type Actions<R> = {[P in keyof R]: () => {}};
```

次にcreateStateを定義します。Sはオブジェクトです。先ほど定義したActionsとReducersを使って関数定義を組み立ててみます。

```ts
function createState<S extends {}>(state: S, reducers: Reducers<S>): { actions: Actions<Reducers<S>> } {
    const actions = {} as {[key: string]: () => {}}
    for (const key of Object.keys(reducers)) {
        actions[key] = () => { return {} };
    }
    return {
        actions: actions as Actions<Reducers<S>>
    }
}
```

これで完成でしょうか？実は違います。``Reducers``は「任意のキーを持つオブジェクト」です。reducersと、actionsで、それぞれ``Reducers``を使っていますが、それぞれが「任意のキーを持つオブジェクト」であり、この2つが同じキーを持つという保証はこの型定義では行われていません。そのため、actionsのどのキーをアクセスしてみても、エラーは検出されません。

2つの``Reducers<S>``を1つにします。ここで、関数の型パラメータに1つ型変数を追加します。``extends``は型における「=」みたいなものです。関数の型変数を一時的な型置き場に使っています。それを入力側と、返り値と同じ型パラメータを渡すことで、「この2つが同じオブジェクト」であることが表現できます。

```ts
function createState<S extends {}, ReducersType extends Reducers<S>>(state: S, reducers: ReducersType): { actions: Actions<ReducersType> } {
    const actions = {} as {[key: string]: () => {}}
    for (const key of Object.keys(reducers)) {
        actions[key] = () => { return {} };
    }
    return {
        actions: actions as Actions<ReducersType>
    }
}
```

これで、期待通りの、「同じキーを持つ別の型」をレスポンスの型に設定できました。

# これからのAPI設計

Redux-ToolkitのAPI設計を見ると、コードを書くタイミングで、そのコードの環境（型推論用語です）がコーディングの手伝いをしてくれるようなAPIデザインになっています。

* コード補完がぱちっと決まる
* 推論が決まる(型変数を明示的に設定しなくてもいい)
* エラーが即座に分かる
* 余計な型定義や定数定義などをしなくても済む、必要であっても、使う場所と定義位置がとても近い。

一言で言えば、「記憶力をあまり必要としない」でコーディングができます。おそらく、同じアウトプットを産み出すための脳の酸素使用量が少ない、みたいな感じで「わかりやすいコード」は定量的に計測は可能な気がします。まあ試したことはないですが。

コード補完がばちっと決まって推論が決まるのは、anyやunknownになりにくい設計ですね。いろいろな型推論を紹介してきましたが、大きな流れとしては大きく2つですね。推論の起点となるのは、関数の引数とクラスコンストラクタの引数の2箇所です。基本的にはこの流れにうまく乗る、ということになります。

* 引数→関数の型変数、返り値
* コンストラクタの引数→クラスの型変数→メンバーメソッドの引数や返り値

ReduxやRedux Toolkitを使うにあたって、ユーザーはStateは定義する必要があります。まあこれはReduxを使うユーザーの関心ごとそのものなので、これは良いでしょう。これを一度設計したらこれを最大限に活用できる、というのが目指す世界です。シンプルな入出力だけのライブラリであれば引数から推論をきちんとしましょう、で完結ですが、Redux-Toolkitとかのように、ユーザーが指定したデータ型を入力か出力に使うreducerのような（別の例だと、オブジェクト指向用語でいうところのテンプレートメソッドのホットスポット、あるいはGUIのイベントのハンドラ）コードを実装しなければならない場面が、そこそこ複雑なケースです。

Redux-Toolkitはオブジェクトを受け取る関数という形態でした。

```ts
type State = {
    name: string,
}

const initialState: State = {
    name: "shibukawa"
};

createSlice(initialState, {
    greeting: (s) => {
        console.log(`hello ${s.name}`);
        return s;
    }
})
```

人によっては「クラスを使ってイベントハンドラも定義したい」と思う方もいると思いますが、よくよく考えると、Redux-Toolkitスタイル以外は難しいことがわかります。

「関数の入ったオブジェクト」というのは、クラスがなかった時代にみんながオレオレクラス作っていたときによく見かけた悪い慣習ですが、TypeScript的には扱いやすいのです。関数のシグネチャを同一にそろえることが簡単です。型ユーティリティを使えば、オブジェクトのキー一覧が取得できます。ユーザーが定義したreducerのリストを使って、型補完を利用しながらactionsを作り出すこともできました。

クラスも一応、キーの一覧の取得までは可能です。ただ、取得はできても、ユーザーが任意の名前で定義する新しいメソッドに対して、特定のシグネチャを要求して、それ以外が作成されたら編集中にエラーを出す、というのはできないんじゃないですかね。

```ts
class A {
    methodA(a :State) {
    }
    methodB(a :State) {
    }
}

type keys = keyof A; // "methodA" | "methodB"
```

デスクトップGUI時代によく用いられていたテンプレートメソッドのように、固定の名前だけを許す場合にはクラスでも可能です。ReactやVue.jsのクラス方式のコンポーネントのライフサイクルメソッドはそれですね。しかし、各メソッドのシグニチャを強制することまではできません。reducersのように、任意のキーで定義を増やせるようなものは「関数を値に持つオブジェクト」にせざるをえないかな、と思います。

なお、JavaScriptユーザーを完全に無視するなら、別の方法もあります。AngularがDIを実現するのにつかっている（と思う）のが、tsconfigの``emitDecoratorMetadata``というオプションです。このオプションの裏では[reflect-metadata](https://www.npmjs.com/package/reflect-metadata)というパッケージが使われていて、型情報を動的に取得してさまざまなことを実現します。ただし、このメタデータを使った動的なロジックはエディタの補完やコーディング時のチェックはしてくれないので、型情報と推論を使った方がユーザービリティは高い気がします。

# まとめ

TypeScriptの型というと、エラーチェック、ミスの削減、みたいな論調で語られることが99%ですが、使う人にとって使いやすいAPIというのを新しく作り出せるのではないか、ということで思考実験してみました。

JavaScript時代は型がなかったので、次のような設計もよく作られていました。あとはjQueryとかですね。その手の設計はJavaScript時代にはよかったかもしれませんが、TypeScript時代にはまた別の設計が必要と思っています。もちろん、↓のような型定義もできて、文字列の名前によってイベントハンドラの引数のEventの型が変わったり、返り値の型が変わったり（``createElement``のように）とか、その手の厳しい要件にも適合するようにTypeScriptでは機能を持っていたりもしますが（オライリーのプログラミングTypeScriptのP65あたり）、それはあくまでも過去と現在をつなげるためのものであって、未来に使う文法ではないと思うのですよね。

```js
obj.on("イベント名", イベントハンドラ)
```

Vue.js 3も、今までのオブジェクトをダイレクトでコンポーネンントとしていた方向から、defineComponent関数の引数のオブジェクトで定義となりました。ベータ版のvue-cliだと、もともとTSとの相性が悪くなかったクラスの方がデフォルトになっており（選択肢がクラスベースのフォーマットを使うか(Y/n)となっており、エンター連打だとこちらではなく、クラスの方になる)、こちらがどれだけ普及するかは分からないですが、これもTypeScriptによりそった設計変更なんじゃないですかね。

```ts
defineComponent({
   // ここなら補完やチェックがきく！
});
```

JavaScript===TypeScriptが吐き出す物、フロントエンド開発者はTypeScriptしか書かないという時代にあわせたAPIデザインについて、一緒に考えていきましょう。

