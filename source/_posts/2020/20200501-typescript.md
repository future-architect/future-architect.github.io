---
title: "TypeScriptでReactをやるときは、小さいアプリでもReduxを最初から使ってもいいかもねというお話"
date: 2020/05/01 10:19:34
postid: ""
tag:
  - React
  - Redux
  - フロントエンド
  - TypeScript
category:
  - Programming
thumbnail: /images/20200501/thumbnail.png
author: 澁川喜規
lede: "プロダクションコードでたくさんRedux周りにもreducerなどを実装しなくてはいけなくなったときの次のステップとして、Redux Toolkitの紹介をします。"
---

前日の丸野さんが[Reduxを分かりやすく解説してみた](/articles/20200429/)というReduxの基本的な紹介を行いました。Reduxはコンパクトなライブラリながらよく考えられた仕組みです。Jetpack ComposeやらFlutterやら、ReactインスパイアなGUIフレームワークも増えているので、JavaScript（TypeScriptではなく） + Reduxをやってみるのは、ウェブに限らず、今後のユーザーインタフェース関連のコードを触るための理解力向上には良いと思います。

本エントリーは、プロダクションコードでたくさんRedux周りにもreducerなどを実装しなくてはいけなくなったときの次のステップとして、Redux Toolkitの紹介をします。

たいてい、Reduxは導入コストが大きく、コードを複雑にしてしまうため「ある程度大きくなってから」「小さいうちは入れる必要ない」みたいに言われます。僕もそう思っていて、丸野さんが参加されているプロジェクトの最初では、最初は素のReactで、1-2ヶ月してみんなが慣れてきたらReduxを入れるという2段階で導入したりもしました。

なぜ難しいかと言われているかというと、Fluxアーキテクチャのサイクルが1周できるまでの準備時間がかかるので、どうしても最初に実装し始めてReactと繋がって動くまでは「これでいいのか？」と疑問に思いながら進まなければならないから、というのがあるのかなと思っています。なおかつ、TypeScriptで型チェックが効くようにRedux周りを実装しようとすると、その作業がさらに倍になるという・・・

しかし、最近触ってみたところ、公式の出している[Redux Toolkit](https://redux-toolkit.js.org/)というヘルパーライブラリがTypeScriptとの相性がよくて、「コーディングを前に進めてくれる感」が強く、手間も小さいので、もう最初からいれてしまってもいいかなぁという気持ちにすごくなっています。

かるーく触った状態なので、本格的なアプリを作ってまた何か考えることがあったら更新するかもしれません。

三行まとめ

1. Redux ToolkitはファイルがバラバラになりがちだったReduxのコードを短くコンパクトにまとめてくれるしTypeScriptとの相性が良い
2. 導入の手間暇が少ないので、後から追加するコストを考えると最初からいれてもいいレベル
3. とはいえ、既存のRedux Thunkとかと混ぜるのは大変なので、既存のコードにちょっとずつ導入は難しいかも


# Redux Toolkit

Reduxは、いくつもの部品を実装する必要がありました。まずはReducer。入力と出力にstate、中に巨大なswitch文と値を書き換えるロジックを持ちます。Reducerに食わせるためにAction Creatorというのが必要でした。さらに非同期な処理をするにはRedux Thunkとかが必要で、さらにcombineReducerで複数のReducerを一つにまとめ・・・みたいな。Redux周りでもフォルダ構造を事前に定義して、拡張性を考えて何個もファイルをフォルダに分散しておいたり・・・みたいな感じですよね？

また、TypeScriptのシェアが伸びる時期のもので型情報は一応つけられるものの、型情報をつけるための型、みたいな動くものを作るのとはちょっと違う手間暇がかかっていました。特にFluxは処理の流れが循環するというアーキテクチャなので、reducerを定義するにはアクションのキーを定義したいし、引数のactionは他のすべてのアクションの和集合として型定義したい、で非同期アクションを定義するにはstateも扱うからreducer周りの型定義を利用したい、あれ？参照が循環するぞ、またこの定義は別ファイルに書かないと、みたいなTypeScriptで使うための苦労がやたらと多い。

Redux Toolkitでは`createSlice()`という関数が提供されており、これを使うと、初期値とaction creatorとreducerが一発で作られます。巨大なswitch文を書く必要がなく、小さい処理単位で関数を定義すると、裏でswitch文相当を作ってくれます。Win32 APIとMFCみたいな感じです。

# Redux + TypeScriptの何が辛かったのか

ここのサンプルコード書いたんですが自分でも読むの疲れるわぁ、という分量になったので、[blockdiag](http://blockdiag.com/ja/blockdiag/demo.html)で作った図だけにしました。コードはこのエントリーの末尾にまとめています。興味のある人だけどうぞ。本当は消したいぐらいなのだけど、まぁエビデンスというやつです。

フロントエンド開発ではTypeScriptが流行っていますが、これとReduxの相性、必ずしもよくないなぁと思っていました。TypeScriptの型システムはだいぶ発展したので、Reactは相当書きやすくなっています。JavaScriptとあまり変わらない記述量できちんと推論がきいてエラーを報告してくれて、コーディングはかなり楽です。一方、ReduxのFluxという考え方が循環を持っているため、型システムで記述しようとすると結構しんどかったです。

## JavaScriptだけでReduxアプリを作った場合

Reduxを使ったアプリケーションの心臓部のReducerとstoreです。巨大なswitch文があり、その中でアクションに処理に応じてステートを更新します。大きくなると、combineReducerでこのreducerをまとめることができます。ページごととかにreducerを分割して作ることができます。

これ以外に、たいていActionを作るためのAction Creatorと呼ばれる関数をよく作ります。アクションには、アクションを識別するアクションタイプの定数があります。

依存関係を図示するとこんな感じでしょう。

<img src="/images/20200501/1.png" loading="lazy">


これは処理の呼び出しの依存ですが、やっかいなのはaction creatorを実装するときのデータはreducerに流れる（reduxがやってくれる）ので、実装するときの脳みそとしてはこちらの依存も解決する必要がありますが、あくまでもコードの依存だけ取り上げています。

非同期の処理のためにRedux Thunkを使う場合は依存が追加で発生します。

<img src="/images/20200501/2.png" loading="lazy">

## TypeScriptを使おうとした場合

TypeScriptだとactionやstateの型定義を行い、コードの中で矛盾がないか確認したいですよね？いくつか型定義を追加する必要がでてきます。入りきらないので折り返しました。blockdiagのfolded初めて使って見ました。

<img src="/images/20200501/3.png" loading="lazy">

JavaScriptは呼び出しで必要な依存しかなかったものの、Reduxが隠蔽してくれていたデータのやり取りも型情報の依存という形で間接的に繋がってしまうのですよね（action型定義）。

Redux thunkで非同期を扱うとこんな感じに。

<img src="/images/20200501/4.png" loading="lazy">

ここまでくれば、型が揃うので、reducerの中でも型チェックがききますし、action cratorの中の属性名の間違いもわかりますが・・・得られるメリットに対してコストがかかりすぎているなぁ、と思っていました。

関数で純粋だぜっていっても、型システムの都合上、依存関係が循環しそうになると、ファイル分割とかに頭を使う必要が出てきます。TypeScriptのファイルの行数もすごく増えてしまう。Redux以下を1ファイルに全部まとめちゃえば解決するといえばするのですが、そもそも大規模アプリに導入するのが前提のRedux。1000行とか2000行のファイルのメンテなんてしたくないですよね？しかも、１つのアクションを修正するのに、ファイルの上の方やら下の方やら同時に直す必要がある。

## Redux Toolkit + TypeScriptの場合

Redux Toolkitは、この分散したものを集めます。APIがいろいろあるのですが、[createSlice](https://redux-toolkit.js.org/usage/usage-with-typescript#createslice)という便利なやつがあります。

sliceというのは、状態とそれを変更するアクションをまとめたものです。どこかで見たことがあるやつですね？そうです。オブジェクト指向です。状態とメソッドの塊をつくってくれるのです。しかも、State以外、型定義らしい型定義もありません。きちんと推論でぜんぶまるっとやってくれるのです。

<img src="/images/20200501/5.png" loading="lazy">

action種別の文字列定数、actionの型定義みたいな、本質的じゃない中間生成物を一切作らなくてもいいので、まとめてもトータルの行数はかなり短くなります。actionの引数のPayloadの型定義なんかも、createSliceの呼び出しの中でインラインで書いちゃうことができます。

storeを作る側も[configureStore](https://redux-toolkit.js.org/usage/usage-with-typescript#using-configurestore-with-typescript)という関数がありますが、これを使うと、combineReducerも不要です。

オブジェクト指向的といっても書く処理のreducerは副作用を外に持つ実装になっています。Erlang的なオブジェクト指向(プロセス間通信のモデルではなくて、mapsとかdictとかのAPIの方)です。スのReduxが辛くて、オブジェクト指向的なRedux Toolkitが使いやすいといっても、別にどちらが優れているとか優れていないとかはないので。型情報の伝搬という、推論ができるようになったからこそ登場するコードの設計の新しい概念がでてきて、それを元に組み上げられたのでRedux Toolkitは使いやすい、と理解しています。

# Redux Toolkitでsliceを作る

さて、これまでコードを出さずに概念図だけで説明してきましたが、コードはこんな感じです。slice関連は1ファイルにまとめてしまいます。

```ts
import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit';

// stateの型定義
export type State = {
  count: number;
};

// 初期状態。インラインで書いても良いですが・・・・
const initialState: State = {
  count: 0
};

// createSliceでreducerとactionを同時に定義
const slice = createSlice({
    name: 'counter',
    initialState,
    reducers: {
        incrementCounter: (state, action: PayloadAction<number>) => ({
          ...state,
          count: state.count + action.payload,
        }),
        decrementCounter: (state, action: PayloadAction<number>) => ({
          ...state,
          count: state.count - action.payload,
        }),
    },
})

// action creatorもこんな風に取り出して公開できて、dispatchでReactから利用できる
export const { incrementCounter, decrementCounter } = slice.actions;

// storeを作るヘルパー複数のreducerをまとめる機能もあり
export const store = configureStore({
  reducer: slice.reducer,
});
```

configureStoreのreducerにオブジェクトを渡すと、複数のreducerを結合できます。combineReducer相当も内蔵。1ファイルに全部まとめることができます。

```ts
export const store = configureStore({
  counter: countSlice.reducer,
  primeNumber: primeNumberSlice.reducer,
});
```

1つしか状態が発生しないのであれば、slice定義とconfigureStoreは1つにまとめてしまい、複数sliceが登場するのであれば、sliceごとにファイルを作り、configureStoreを呼ぶルートとなるスクリプトファイルを1つ作る、ぐらいのファイル分割でうまくいきそうです。Redux以外に他の場所でも使いたい型定義とか、slice間で共有したい型定義があればStateの中から取り出して単独のtypes.tsみたいなファイルにまとめるぐらいかな。

## Reduxを使う側も型を生かす

Redux Tooolkitの機能ではないのではなく、react-redux側の機能ですが、Reduxを使う側も型が活かせます。このインプットにはRedux Toolkitを使って作ったStoreから、Stateの型を取り出すことで簡単にセットアップが可能です。これでカスタム版の``useSelector``を作ります。

```ts
import { useSelector as rawUseSelector, TypedUseSelectorHook } from 'react-redux';

：

// 複数のreducerをまとめた場合に、最終的なStateの型を取り出す
export type RootState = ReturnType<typeof store.getState>;

// 型情報付きのuseSelectorをここで宣言
export const useSelector: TypedUseSelectorHook<RootState> = rawUseSelector
```

Reactコード側では、react-reduxの``useSelector()``を直接使うのではなく、このストア定義の中で作ったuseSelectorを使うと型チェックがuseSelectorのコールバックの中でも効くようになります。

```ts
import { useSelector } from './store.ts'
import { useDispatch } from 'react-redux';

export function CounterViewer() {
    const { count } = useSelector((state) => {
        return {
            count: state.count,  // ここでコード補完がきちんと効く
        };
    });
    const dispatch = useDispatch();
}
```

hooksスタイルのAPIを使うだけで、connectを使った場合と比べてコードはかなり少なくなります。Reduxのためにだけに書かなきゃいけないコードが激減（mapStateToPropsみたいな）しますが、それにプラスして、このstore定義の中で作ったuseSelectorを使えばstateの情報をビューでアクセスするときにきちんと補完も効くので少ない手間でコードの開発効率があがります。

# 非同期処理の書き方

Redux-thunkとかRedux-sagaとかありますが、この分野もRedux Toolkitにお任せしておけば大丈夫です。

Redux Thunkはasyncな関数の中で、サーバーアクセスなどをして、その結果を受け取ったら、通常のactionをdispatchを通じて実行する、というモデルでした。大抵アプリケーションから呼ばれる処理は非同期前提なのでthunkなアクションがアプリケーションとの接点になりますが、その結果を書き出すためにreducer/action creatorの両方に追加しないといけなかったので、記述量は少し多めでした。

ちなみに、Redux Sagaは辛かったのでもう記憶から抹消されました。

Redux Toolkitのasync thunkの場合は、sliceの外で[createAsyncThunk](https://redux-toolkit.js.org/usage/usage-with-typescript#createasyncthunk)で非同期なロジックを書きます。sliceとの結合は2種類あります。

1つ目は、async thunkの2つめの引数にはdispatchとかgetStateといったメソッドがあるので、これを使って以前のRedux Thunkのように、別のReducerを呼ぶ方法です。これでも、以前よりもシンプルになりやすいというか、async thunkから呼ばれるactionはexportしないで、ファイル内部のプライベートなactionとして記述できるため、コード全体の複雑さは以前よりも少なくなります。

2つ目は、asyncのレスポンスを直接扱う追加のアクションを定義する方法です。こちらの方を紹介します。まずは非同期処理を扱うロジックを書きます。ここはreturnTypeの推論が聞かなかった＆2箇所で利用しているため、外でtypeで定義して使っています。

```ts
type fetchLastCounterReturnType = {
    count: number;
};

export const fetchLastCounter = createAsyncThunk<fetchLastCounterReturnType>(
    'lastcount/fetch',
    async (arg, thunk): Promise<fetchLastCounterReturnType> => {
        const res = await fetch('/api/lastcount', {
            credentials: 'same-origin',
        });
        if (res.ok) {
            return (await res.json()) as fetchLastCounterReturnType;
        }
        throw new Error('fetch count error');
    }
);
```

reducersとは別に、extraReducersという項目があって、そこで追加していきます。builderの最初に渡すアクションのキーは、createAsyncThunkが作ってくれる3種類あります。pendingが実行開始して、結果が帰ってくるまでの間、fulfilledが正常終了、rejectedがエラー時です。

```ts
const slice = createSlice({
    name: 'counter',
    initialState,
    reducers: {...},
    extraReducers: (builder) => {
        builder.addCase(fetchLastCounter.fulfilled, (state, action) => {
            return {
                ...state,
                count: action.payload.count,
            };
        });
    },
});
```

非同期なコードはReduxからも独立したコードとして書けるので（上記の2つめの関数の中にはRedux関係の呼び出しが発生していない）、こちらの方が他の環境に持っていくとか、テストするのはしやすいかなと思います。

JS側のサンプルだと、extraReducersに次のように追加するコードがありますが、これだとコード補完がされないので、TypeScriptの場合はちょっとかっこ悪くてもbuilder経由で登録する必要があります。

```js
extraReducers: {
  [fetchLastCounter.fulfilled]: (state, action) => {
     return {
       ...state,
       count: action.payload.count,
     };
  });
}
```

# 既存のコードと混ぜるのは要注意

slice単位で入れ替えとかもできるかしれませんが、既存のRedux Thunkを使って作った非同期なアクションをそのまま再利用しようとしたんですが、うまく型定義に混ぜる方法がわかっていません（dispatchに渡す型あたり）。型アサーションとかでコンパイラを黙らせればいけるんでしょうけど。

型推論パワーを役立てようと思ったら、少しずつ入れ替えではなくて、ごそっと入れ替えが必要な気がしています。このあたりはちょびっと試してやめてしまったので、他に挑戦した人がいたらアドバイスください。

# まとめ

TypeScriptのパワーを損なうことなく、短い行数でReduxが実現でき、記憶力もあまり使わなくていい、ディスプレイも小さくて済むという、今まで求めてきたものがようやく手に入りました。

2年半ほど前に大規模ウェブアプリを作ったときはJavaScript + React + Reduxでした。その後はAngularだったり、小さいものをvueやらReactでflux使わずに実装したりして、久々に再びReactをすることになったので、TypeScriptとの相性よくなったかなぁ、とググって見たら本家のRedux Toolkitが引っかかりました。本家のドキュメントも、十分に情報がありますが、createSliceとconfigureStoreのあたりから読んで、次にthunk周りを読んだ程度ですが、十分にパフォーマンスが発揮できました。

ReactもHooksが出てきて、Reduxもそれを使うように更新された一方、[unstated](https://github.com/jamiebuilds/unstated)のような新しいライブラリもでてきています。これもGitHubスター数も多いんですが、チームで使うには規約とかがある程度決まっている方が導入はしやすい（unstatedはどうもいろいろ自分で決める必要がありそう）です。Reduxに対する不満もだいぶなくなったので、まだまだReduxを使っていこうと思いました。

最近、僕が意識しているのはリーダブルなコードです。これはオライリーの本のReadableではなくて、コードが人を導いてくれる（Leadable）という意味です。一方で、ReduxとTypeScriptで感じていたのは、処理系を通すためにコードを書かされているという感覚ですね。オーダブル(Orderable)と呼んでいるけど、もっといい名前があったら教えてください。Redux Toolkitはだいぶ余計なことに頭を使わなくて済むので、とても良いです。

今年度40歳になるアラフォーのおっさんの衰える記憶力では、1つの処理を書くのに、4つも5つもあるファイルをつぎつぎに切り替えて書かなければならなかったのは苦痛でした。職場とか客先とか自宅とか色々なところで仕事する上で、いつも最高のモニタがあるわけではありませんので全部のファイルを開いておくこともできませんでした。型定義ファイル分割パズルも大変でした。でも、これでまだまだ現役続行できそうです。MacBookPro 16じゃなくてAirでも十分に開発できるかな。出費が半額ですみますね。保育園が閉鎖されてしまって、子供の面倒を見ながらフロントエンドのコードを書かないといけないパパ、ママにも強い味方です。

Redux toolkitと生のReduxを使って見て思うのは、ライブラリの設計の難易度が3倍ぐらいになったなぁ、という感じですね。TypeScriptで型推論が入ったのはあるのですが、その型推論が効きやすい、ライブラリユーザーが実装しなきゃいけない型情報を減らすための設計というのが、この後の主戦場になりそうだなぁ、ということです。今まではデータを加工する、というロジックだけを設計すれば良かったのですが、データの伝搬だけじゃなくて、型情報の伝搬というのも考慮しなければならないと。ある意味、C++プログラマーのテンプレート経験が生きるのかも、なぁ、という。まだあまり言語化できないのですが。Haskellな人とか得意だったりするんですかね？

# おまけ

Redux Toolkitを使わない依存関係のサンプルコードを書いていたんですが、かえってわかりにくいので末尾にまとめました。

以下のコードは、JavaScript版のReduxを使ったアプリケーションの心臓部のReducerとstoreです。巨大なswitch文があり、その中でアクションに処理に応じてステートを更新します。

```js
import { createStore } from 'redux';
import { INCREMENT_COUNTER, DECREMENT_COUNTER } from './actiontypes';

function reducer(state = {count: 0}, action) {
  switch (action.type) {
    case INCREMENT_COUNTER;
      return {
        ...state,
        counter: state.counter + action.payload.count
      };
    case DECREMENT_COUNTER;
      return {
        ...state,
        counter: state.counter - action.payload.count
      };
  }
  return state;
}

export const store = createStore(reducer);
```

アクションを識別する定数。一番シンプルなのは文字列定数を使う方法でしょう。これを便利にするヘルパー関数もありました。

```ts
export const INCREMENT_COUNTER = "INCREMENT_COUNTER";
export const DECREMENT_COUNTER = "DECREMENT_COUNTER";
```

TypeScriptを導入すると、StateとActionの型定義が入り、それを使うようにaction creatorも書き換えます。

```ts
export type State = {
  counter: number;
}

export function incrementCounter(count: number): IncrementCounterAction {
  return {
    type: INCREMENT_COUNTER,
    count
  };
}

export function decrement(count: number): DecrementCounterAction {
  return {
    type: DECREMENT_COUNTER,
    count
  };
}

export type IncrementCounterAction = {
  type: INCREMENT_COUNTER,
  count: number;
}

export type DecrementCounterAction = {
  type: DECREMENT_COUNTER,
  count: number;
}
```

アクションの型が揃うと、ようやくreducerが作成できます。

```ts
import { IncrementCounterAction, DecrementCounterAction } from './actions';

type RootAction = IncrementCounterAction | DecrementCounterAction;

function reducer(state: State, action: RootAction) {
    :
}
```

どのファイルからどの順番でコードを書けばよかったんですかね？何度かトライしているものの、いつもなんかいまいちに感じていました。
