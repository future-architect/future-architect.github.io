---
title: "Reduxを分かりやすく解説してみた"
date: 2020/04/29 17:05:22
postid: ""
tag:
  - React
  - Redux
  - フロントエンド
  - 初心者向け
category:
  - Programming
thumbnail: /images/20200429/thumbnail.png
author: 丸野大輔
lede: "はじめまして、2019年4月入社_FRX_DigitalLibraryチームの丸野です。研修修了後PJにアサインされて約4ヶ月ほどReact.jsを使って開発を行ってきましたが、Reduxの理解にとても苦しみました。そこで今回はReduxの概要を噛み砕いて説明していきます。同じ悩みを持つ人の理解の助けになればと思います。"
---

# はじめに

はじめまして、2019年4月入社の丸野です。[フロントエンドでシステム開発を2年半続けてハマったことから得た教訓3つ](/articles/20191029/) の記事を書いた柏木さんと同じチームに所属しています。

研修修了後PJにアサインされて約4ヶ月ほどReact.jsを使って開発を行ってきましたが、Reduxの理解にとても苦しみました。そこで今回はReduxの概要を噛み砕いて説明していきます。同じ悩みを持つ人の理解の助けになればと思います。
(Redux公式ドキュメントは[こちら](https://redux.js.org/)です。)


# 開発で使用している技術要素

* React.js（16.4.1）
* Redux（3.7.2）

# そもそもReduxって何か

Reduxとは、React.jsで使用するstateつまりアプリケーションの状態を管理するフレームワークです
簡単にReduxの概念の下記に図式化してみました


<img src="/images/20200429/1.png" alt="Redux概念図" loading="lazy">


**State**：アプリケーションの状態
**Action**：ユーザーが何押したいかという情報を持つオブジェクト
**Reducer**：Actionを元にStateを更新するメソッド
**Store**：Stateの情報を保持している場所

# Reduxのデータフロー
では上記で示した概略図をもとにReduxのデータフローをそれぞれ説明していきたいと思います

## ①ActionCreatorsによってActionを生成する
* ユーザーのインプットによってComponent上からAction作成依頼が飛びActionCreatorでActionが作成されます

<img src="/images/20200429/2.png" alt="Action作成" class="img-small-size" loading="lazy">


* 今回はStateの更新を目的としたActionを想定いたします
* 作成されるActionは下記のようなもので、type項目で他のActionと区別しています

```js Action.js
// Action
{
    type: "UpdateStateA",
    testStateA
}
```

* ActionCreatorとはActionを作成するメソッドのことをいいます
* 上記のActionを作成するActionCreatorのサンプルコードは下記のようになります

```js ActionCreater.js
// Action Creator
function testFunctionA(testStateA) {
    //Action
    return {
            type: "UpdateStateA",
            testStateA
        };
}
```

* コンポーネントで上記のActionをImportすることで、Action作成を依頼できます

```js Component.js
import { testFunctionA } from "testActionCreator";
```

## ②Actionをdispatchする

<img src="/images/20200429/3.png" alt="Actionのディスパッチ" class="img-small-size" loading="lazy">


* Actionを生成するだけではStore内のStateを更新することは出来ません
* dispatchすることによってActionをStoreに送ることが出来ます

```js Component.js
  // dispatch
  dispatch(testFunctionA());
```

## ③ReducerによってStore内のStateを更新する
* Reducerとは、Actionを元にStateを更新するメソッドのことを言います
* 引数のstateの更新するのではなく、新しいstateのオブジェクトを返します
* 各Actionのtypeごとによって処理内容を変更できます

```js Reducer.js
// Reducer
export const testReducer = ({ testStateA = "", testStateB = "" } = {}, action) => {
    switch (action.type) {
        case "UpdateStateA":
            testStateA = action.testStateA;
            break;
        case "UpdateStateB":
            testStateB = action.testStateB;
            break;
    }
    return {
        testStateA,
        testStateB
    };
};
```

## ④ReactとReduxを連携しStore内のStateをComponentで参照する

* mapStateToPropsを使用するとComponentのpropsにStateの中身を詰め込むことが出来ます
* それによって、Store内にあるStateををthis.props.testStateAとして使用することが出来ます

# まとめ

説明させていただいたReduxの概要は下記の通りです。

1. **ActionCreatorsによってActionを生成する**
2. **Actionをdispatchする**
3. **ReducerによってStore内のStateを更新する**
4. **ReactとReduxの連携しStore内のStateをComponentで参照する**

最後に、ご紹介したコード例全体像はこちらです。
(※今回はComponent、ActionCreater、Reducerをそれぞれ別ファイルで作成しています。）

```js Test.js
// Component
import { testFunctionA } from "testActionCreator";

class TestComponent extends Component {
    Update() {
        // dispatch
        dispatch(testFunctionA());
    }
    render(){
        ...
    }
};

// Action Creator
function testFunctionA(testStateA) {
    //Action
    return {
            type: "UpdateStateA",
            testStateA
        };
}

// Reducer
export const testReducer = ({ testStateA = "", testStateB = "" } = {}, action) => {
    switch (action.type) {
        case "UpdateStateA":
            testStateA = action.testStateA;
            break;
        case "UpdateStateB":
            testStateB = action.testStateB;
            break;
    }
    return {
        testStateA,
        testStateB
    };
};
```

# さいごに

今回はReduxの基礎的な部分の解説をさせていただきました。Redux理解の足がかりにしていただければ幸いです。

また、今後もよりReactの実装に踏み込んだ内容を投稿できたらと思っております。
