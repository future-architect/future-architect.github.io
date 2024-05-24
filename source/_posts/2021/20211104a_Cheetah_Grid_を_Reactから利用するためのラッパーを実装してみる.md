---
title: "Cheetah Grid を Reactから利用するためのラッパーを実装してみる"
date: 2021/11/04 00:00:00
postid: a
tag:
  - フロントエンド
  - TypeScript
  - React
  - CheetahGrid
  - OSS
category:
  - Programming
thumbnail: /images/20211104a/thumbnail.png
author: 澁川喜規
lede: "秋のブログ週間連載の6本目です。FutureにはCheetah Gridという最速のウェブフロントエンド用のテーブルコンポーネントがあります。会社のお仕事コードは基本的にVue.jsが採用されることが多く、Cheetah GridもVue.js版のコンポーネントも提供されています。僕はなぜかReact案件が多くて慣れていることもあり、ちょっとしたコードもReactで書きたいと思っています。ちょっとしたツールを実装する上でかっこよくて性能が良いテーブルコンポーネントも欲しいのでCheetah GridのReact版が欲しいなとずっと思っていたので、今回作ってみました。"
---
[秋のブログ週間](/articles/20211027a/)連載の6本目です。

Futureには[Cheetah Grid](https://future-architect.github.io/cheetah-grid/#/)という最速のウェブフロントエンド用のテーブルコンポーネントがあります。会社のお仕事コードは基本的にVue.jsが採用されることが多く、Cheetah GridもVue.js版のコンポーネントも提供されています。

僕はなぜかReact案件が多くて慣れていることもあり、ちょっとしたコードもReactで書きたいと思っています。ちょっとしたツールを実装する上でかっこよくて性能が良いテーブルコンポーネントも欲しいのでCheetah GridのReact版が欲しいなとずっと思っていたので、今回作ってみました。半分お仕事で半分趣味みたいなコーディングですが、趣味の素振り的な気持ちで取り組みました。本エントリーも技術要素半分、スキルアップの心構え半分な内容でお届けします。

↓CheetahGridの各種カラム形式に対応したバージョンが公開中です。

<img src="/images/20211104a/columns.png" alt="columns.png" width="1200" height="334" loading="lazy">


# 今時のフロントエンドと、巨大コンポーネントのギャップ

JavaScript界隈では、いくつかの大きなコンポーネント部品が作られてきました。主に、表コンポーネントとかリッテキストエディタコンポーネントとかです。印象としてはjQueryの部品としてリリースされたり、ピュアJSなライブラリとして開発されて、その後React/Vue/Angular対応を果たしている、みたいな感じがあります。

たいてい、このようなライブラリの生のAPIは、マウントする先のDOM要素と設定を行うための大量のJSONを食わせると、そのコンポーネントのオブジェクトが生成され、そのオブジェクトのメソッドを通じて、いろいろ操作を行ったりできるような設計がされている印象があります。

```js
// JS界隈の巨大コンポーネントライブラリのAPIのイメージ
var instance = new BigComponent(document.querySelector("#root"), {なにやら巨大な設定JSON})

<button onClick={() => {
  instance.reset();
}) >リセット</button>
```

一方で、今時のフロントエンドは、冪等なAPIを指向しており、そのようなライブラリをそのまま使おうとすると、ギャップを吸収しなければなりません。コンポーネントの形式に無理やりした結果、インスタンスへの指令もプロパティとして渡すようなライブラリを見かけたことがあります。

```jsx
<BigComponent config={{巨大な設定JSON}} update={更新情報を入れる} />
```

これはコンポーネント内部で、初期値のJSONを覚えておいた上で、コンポーネント側にその差分情報を入れる必要があるということで、新旧両方の情報を管理しなければなりません。また、ウェブサイトの画面の8割を覆うような部品で複雑な設定をJSONだけでやるというのも、違和感がありました。AngularでもReactでもVueでも、それぞれの作法があるのに、その作法にのっからずに、独自の方法を無理やり使わせているような、インピーダンスミスマッチを感じました。

せっかく作るのであれば、それを乗っけるフレームワーク（ここではReact）のお作法に従ったコンポーネントを作って行こうと思います。なお、Vue.js版はきちんと、カラム定義もVueのテンプレートのお作法で定義できるようになっており、React版も同じ作戦でいきたいな、と思っていました。複雑で機能が大きい部品は、やはりソースコード上の見た目も大きくなって欲しい。

```html vuejs
  <c-grid :data="records" :frozen-col-count="1">
    <c-grid-check-column field="check" width="50" />
    <c-grid-column field="personid" width= "85">
      ID
    </c-grid-column>
    <c-grid-column-group caption="Name">
      <c-grid-input-column field="fname" width="20%" min-width="150">
        First Name
      </c-grid-input-column>
      <c-grid-input-column field="lname" width= "20%" min-width="150">
        Last Name
      </c-grid-input-column>
    </c-grid-column-group>
  </c-grid>
```

# 最初の作戦

このように定義できるようにしたいという目標を立てました。

```jsx
<CheetahGrid>
  <Column field="name" width={100}>Name</Column>
</CheetahGrid>
```

親コンポーネントで子供コンポーネントの情報を習得する方法としてまず考えたのが、子供のカラムのコンポーネントでCheetahGridの定義に食わせられるJSONを作り、data属性に入れておく方法です。最終的にこのコンポーネント群で生成されたJSON片を親が集めてCheetah Gridのコンストラクタに渡します。

```jsx
function Column(props: ColumnProps) {
   const configJson = formatProps(props);
   return <div style={{visibility: hidden}} data-cg={encodeURIEncoding(JSON.stringify(configJson)})>
}
```

これを`<CheetahGrid>`の`useEffect()`内で実際のタグ情報を取得してきて取り出せばうまくいきました。もう消してしまったので、うろ覚えですが、こんな感じだったかと。本当の最初はfast-xml-parserを使ってパースしたりとか、heも使ったりしていた記憶。

```jsx
function CheetahGrid(props: CGProps) {
  const ref = useRef();
  const [cg, setCg] = useState();

  useEffect(() => {
    const header = [];
      for (const dom of document.querySelectorAll("[data-cg]")) {
        header.push(decodeURIComponent(dom.attribute("data-cg")));
      }
      setCg(new cheetahGrid.ListGrid(ref.current, { header }));

  }, [])
  return <div ref={ref}>{chidlren}</div>
}
```

最初の表は出力できたのですが、コールバック関数とかシリアライズできない情報が登場してこの方法はやめました。

# 次の作戦

つぎはContextを使いました。子供のコンポーネントではコンテキストにJSONを渡し、それを親が集約し使う作戦。親はContextでheaderというオブジェクトを渡し、それにあらかじめユニークにプロパティに渡したid（本当はkeyだったら違和感がなかったが、Reactのフレームワークで予約されている名前なので利用できない）を使って書き込むというもの。

```jsx
function Column(props: ColumnProps) {
   const { header } = useContext(CGContext);
   const configJson = formatProps(props);
   header[props.id] = configJson
   return <div></div>
}
```

オブジェクトをmutableに使っているのがいまいちだし、idを設定しなければならないので使う手間も増えます。なお、mutableに使わずに`useState()`で作ったオブジェクトと、set関数を両方渡す方法も試してみました。

```jsx
function CheetahGrid(props: CGProps) {
  const ref = useRef();
  const [header, setHeader] = useState<HeaderDef>({
    columns: {},
    columnId: [0],
  });
  const value = useMemo(
    () => ({ header, setHeader }),
    [version]
  );

  return <CGContext.Provider value={value}><div ref={ref} /><CGContext.Provider>;
}
```

しかし、子供のコンポーネントにはすべて同じタイミングのheaderが渡されるため、 `{ ...header, [id]: 自分の定義 }`とやったところで、最後のコンポーネントの情報以外が消えてしまうという問題があり、行儀の良い方法は使えませんでした。行儀悪いし、余計な属性が増えてしまう。

# 最後の作戦

子供のコンポーネントで情報を作って取り出す方法にチャレンジしてましたが、`props.children`には、コンポーネントに渡されたプロパティ情報がすべて格納されています。子供コンポーネントではなにもせずに、親のテーブルコンポーネントがすべて処理してしまえばよさそうです。

```jsx
// コンポーネントごとの処理の関数をmap化しておく
const childComponentTypes = new Map<
  string | JSXElementConstructor,
  { name: string; processFunc: (p: any) => any }
>([
  [Column, { name: "Column", processFunc: processColumnProps }],
  [NumberColumn, { name: "Column", processFunc: processNumberColumnProps }],
  [CheckColumn, { name: "Column", processFunc: processCheckColumnProps }],
]);

// 変換
function childrenToHeader(
  children: ReactElement | ReactElement[]
) {
  return Children.map(children, function makeHeaderDef(child) {
    const childComponentType = childComponentTypes.get(child.type);
    if (childComponentType) {
      return childComponentType.processFunc(child.props);
    } else {
      return { caption: "invalid column type" };
    }
  });
}

// 親のコンポーネントだけで処理する
function CheetahGrid(props: CGProps) {
  useEffect(() => {
    const opts {
      header: childrenToHeader(props.children)
    };
    grid = new ListGrid<T>(opt);
    :
  }, []);
  :
}
```

一部をコンポーネント化しておくとかはできませんが（単なる関数に切り出しはいける）、コールバック関数などもきちんと扱えるようになったし、余計な属性も不要だし、文字列化したのを取り出してデコードという余計な処理もなくなりました。

なお、このコードはかなり簡略版で、実際はもっと型情報をつけているし、属性の変更時の更新とかにも非対応です。属性が変わった場合には、refしていたDOM要素が毎回クリアされてCheetahGridのインスタンスが消え去ってしまうというのが関数コンポーネントでは発生し、仕方なくここだけクラスコンポーネントにしたりしました（`shouldComponentUpdate()`でfalseを返せば再生成は回避可能）が、おおむねこの方針の延長で一通り実装しました。

# インスタンスアクセス

巨大コンポーネント系のラッパーで違和感のあったインスタンスアクセスですが、hooksを使ってプロキシオブジェクトを取り出すようにしました。まだメソッドとか属性はあんまり実装していませんが、今時のReactっぽい感じにはなったかと思います。monaco editorとかよりも個人的にはイケてると思います。

```jsx
const [instance, instanceRef] = useCheetahGridInstance();

// 現在の選択範囲の情報を取得
const showSelection = useCallback(() => {
  if (instance) {
    alert(
      `Select: ${JSON.stringify(
        instance.selection.select
      )}, Range: ${JSON.stringify(instance.selection.range)}`
    );
  }
}, [instance]);

return <CheetahGrid instance={instanceRef}> ... </CheetahGrid>
```

めでたしめでたし。これで目標はほぼ達成しました。最終的にCheetah Gridのほとんどの機能がReact上で実現できるようになりました。

# 趣味的開発で心掛けていること

お仕事のコードだと、たいてい締めきりがありますし、ある程度実現方法がはっきりしている堅い方針でいくことが多いと思います。仕事コードであれば、とりあえずCheetah Gridの入力のJSONを外から渡す方式にしていたと思います。

趣味的な開発の場合は、まずは実現方法が現時点で分かっていない、ちょっと高い目標を掲げるようにしています。今回は「Reactユーザーが違和感を感じないAPIの実現」でした。最初に思いついた方法とかはことごとくダメで、何度もスクラップアンドビルドしています。今回ブログで書いたのは2回だけですが、大小何度もスクラップにしています。むしろ、Cheetah GridのReactラッパー自体、3度目のチャレンジかな？ スクラップしたまま戻ってこれなくなったこともありました。

今回はたまたま成功しましたが、まあ成功しなくてもいいや、という気持ちで取り組んでいます。最初に建てた目標が達成できなければ、自分でも使う気も起きないですしね。

どんなにチュートリアルを何本もやっても、初心者な力しかつかないな、と思っています。成功したかどうかに関わらず、悩めば悩んだ分だけ力になります。この本気の素振りは、使う技術の細かいところまで追いかける動機になりますし、自信をもって「わかる」という実感が得られます。

なお、素振りだからといって業務外である必要はないです。土日の生活を犠牲にして勉強しないと！ということは全然ないと思います。会社がOSS開発とか支援してくれて、会社のリポジトリに入れるなどすれば業務時間カウントとかもできるんじゃないかと思います。このあたり、80:20ルールだったり、職務開発の規定だったり、R&D開発の管理だったり、会社によってルールなどもだいぶ違うところですので、そこを確認してください。

なお、やってはいけないこのは業務でしか使わないコードを趣味時間に書くことです。これは労働基準法違反ですね。サービス残業。業務で使うなら、きちんと労働時間内でやらなければなりません。今時は、オフの時間の開発も職務開発扱いになって、会社の資産にする、みたいなルールの会社も多いと思いますので要注意です。外資系とかはほぼそうじゃないですかね。

フューチャーの場合は、[OSS開発やっていこうぜ](/articles/20201107/)、という話もありますし、技術ブログも業務時間に書けますし、技術ブログの題材ならその一環で良いだろう、ということでそっちの業務時間としてやっちゃうのも手ですよね。そう、いま皆さんが読んでいるこのエントリーです。


[秋のブログ週間](/articles/20211027a/)連載の6本目でした。
