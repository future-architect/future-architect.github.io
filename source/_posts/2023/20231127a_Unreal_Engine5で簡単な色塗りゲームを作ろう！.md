---
title: "Unreal Engine5で簡単な色塗りゲームを作ろう！"
date: 2023/11/27 00:00:00
postid: a
tag:
  - UnrealEngine
  - ゲーム制作
  - 初心者向け
category:
  - Programming
thumbnail: /images/2023/20231127a/thumbnail.jpg
author: 関根正大
lede: "Unreal Engine5を使って簡単な「色塗りゲーム」を作ってみよます。"
---
# はじめに

関根です。
Unreal Engine5を使って簡単な「色塗りゲーム」を作ってみます。

次の画像のような Blueprintを作成しながら、キャラクターが歩いた箇所のブロックの色を変える、2秒時間が経過したら元の色に戻す、といった簡易的なものを作成します。

この記事で作成するもの
<img src="/images/2023/20231127a/スクリーンショット_(159)_R.jpg" alt="" width="1200" height="675" loading="lazy">

## 想定読者

想定している読者は、Unreal Engine5をインストールした直後の初学者及び、Unreal Engine5の具体的な使い方は知らないけれども、何か手を動かしながら作ってみたい人向けに記事を作成しました。

それでは早速始めていこうと思います。

# 新規プロジェクトを立ち上げる。

それではまず新規プロジェクトを作成しましょう。

EpicGameLauncherの`ライブラリ`、`Engineバージョン`から、Unreal Engine5を起動します。

今回の記事では5.3.1のバージョンを使用します。
(右上の起動ボタンからでもUnreal Engineの起動は行えます。)
<img src="/images/2023/20231127a/スクリーンショット_(22)_R.jpg" alt="" width="1200" height="675" loading="lazy">

Engineを起動すると、プロジェクトを設定する画面が出てきます。

左の`ゲーム`を選択し、その中の`サードパーソン`を選択します。

そして今回は`GameProject`というフォルダの中に`MyProject`というプロジェクトを作成します。

それ以外は変更せずに作成ボタンを押します。

<img src="/images/2023/20231127a/スクリーンショット_(23)_R.jpg" alt="" width="1200" height="675" loading="lazy">

しららく待つとこちらのような画面になります。

今回は`サードパーソン`というパックを選択したため、サードパーソンゲーム(TPS)で使われる最低限のロジック(キャラクターを動かす、カメラ移動など)はすでにある状態でプロジェクトがスタートしています。

こちらの画面はデモマップなので、少しこちらでゲームを動かしてみましょう。

`画面上部の緑色の再生ボタン`もしくは`Alt+P`でゲームを開始できます。
<img src="/images/2023/20231127a/スクリーンショット_(32)_R.jpg" alt="" width="1200" height="675" loading="lazy">

するとキャラクターが出現し、ゲームをプレイできるようになります。

WASDで移動、Spaceキーでジャンプ、マウスでカメラ操作が行えます。

ゲームを終了する際は停止ボタン、もしくは`esc`キーを押すことで終了する事が出来ます。
(もしキャラクターの操作が出来ない場合は、ゲーム画面をクリックしてみてください。)
<img src="/images/2023/20231127a/スクリーンショット_(33)_R.jpg" alt="" width="1200" height="675" loading="lazy">

# 新しいマップを作成する、光源の設置

今回はこちらのデモマップは使用せず、一からマップを作成しようと思います。

画面上部の`ファイル`から`新規レベル`を選択します。

<img src="/images/2023/20231127a/スクリーンショット_(34)_R.jpg" alt="" width="1200" height="675" loading="lazy">

何もないマップからゲームを作成していくため、`空のレベル`を選択します。
<img src="/images/2023/20231127a/スクリーンショット_(35)_R.jpg" alt="" width="1200" height="675" loading="lazy">

そうすると新規レベル(新しいマップ)が立ち上がります。

しかし文字通り空のレベルのため、光源も何もありません。そのため画面が真っ黒になってしまっています。

<img src="/images/2023/20231127a/スクリーンショット_(36)_R.jpg" alt="" width="1200" height="675" loading="lazy">

そこでまずは光源を設置しようと思います。`ウィンドウ`の`環境ライトミキサー`を選択します。

<img src="/images/2023/20231127a/スクリーンショット_(37)_R.jpg" alt="" width="1200" height="675" loading="lazy">

画面が出てきたら、`スカイライトを作成`、`大気ライトを作成`、`Sky Atmosphereを作成`、`ボリュメトリッククラウドを作成`を全てクリックします。
<img src="/images/2023/20231127a/スクリーンショット_(38)_R.jpg" alt="" width="1200" height="675" loading="lazy">

そうすると光源の他に空や雲がマップに作成されます。

細かい設定等も行えますが、今回はこちらで進めていきます。

<img src="/images/2023/20231127a/スクリーンショット_(39)_R.jpg" alt="" width="1200" height="675" loading="lazy">

ここまで行えたら、一度レベル(マップ)の保存をします。`Ctrl+shift+S`ですべてを保存します。

するとどこに保存するのかを問われるため、今回は`コンテンツ`直下に右クリックをして新たに`MyStuff`というフォルダを作成します。
<img src="/images/2023/20231127a/スクリーンショット_(104)_R.jpg" alt="" width="1200" height="675" loading="lazy">

作成したフォルダをダブルクリックし、その中に`ColoringMap`という名前で現在のレベルを保存します。
<img src="/images/2023/20231127a/スクリーンショット_(105)_R.jpg" alt="" width="1200" height="675" loading="lazy">

# ステージの床を作ろう！

続いて床の配置をしていきます。

今回はキャラクターが歩いたブロックの色を変えたいので、複数ブロックを使用して床を作成していきます。

`ウィンドウ`から`アクタを配置`を選択します。
<img src="/images/2023/20231127a/スクリーンショット_(106)_R.jpg" alt="" width="1200" height="675" loading="lazy">

この画面からレベル上にオブジェクトを配置していくことができます。

この中から`キューブ`を選択し、ビューポート(画面中央の画面)にドラッグ&ドロップします。

<img src="/images/2023/20231127a/スクリーンショット_(107)_R.jpg" alt="" width="1200" height="675" loading="lazy">

すると白いキューブが配置されました。

今回はこのキューブに「操作キャラクターが上を歩いたら、色を変える」というロジックを入れたいです。

そのロジックを入れるためには、`Blueprint`というものを作成していく必要があります。

配置したキューブのBlueprintを作成するために、右下の`詳細`にある`+追加ボタンの右のアイコン`をクリックします。

<img src="/images/2023/20231127a/スクリーンショット_(108)_R.jpg" alt="" width="1200" height="675" loading="lazy">

`ブループリント名`を`BP_Cube`に変更し、`パス`を先ほど作成した`MyStuff`に変更します。
ここまで完了したら`選択`を押します。
<img src="/images/2023/20231127a/スクリーンショット_(109)_R.jpg" alt="" width="1200" height="675" loading="lazy">

すると`BP_Cube`の編集画面が表示されます。
<img src="/images/2023/20231127a/スクリーンショット_(110)_R.jpg" alt="" width="1200" height="675" loading="lazy">

すぐにBluePrintを書いていきたいところですが、まずは`Collision(コリジョン)`と呼ばれる当たり判定をCubeに追加していきます。

「CubeのこのCollisionにキャラクターが当たったら、色を変える」というロジックを作成するために必要となります。

それでは画面左の`コンポーネント`の下にある`+追加`ボタンをクリックし、検索欄に`box`と入力します。すると`box collision`が出てくるので、そちらをクリックします。そしてこのbox Collisionの名前を`Trigger`に変更します。`F2`か、右クリックをおして`名前変更`で名称を変更できます。
<img src="/images/2023/20231127a/スクリーンショット_(111)_R.jpg" alt="" width="1200" height="675" loading="lazy">

これでbox collisionがTriggerという名前で生成されました。

そうしたらこのTriggerの大きさ、位置を調整していきます。

画面右の`詳細`画面上部にある`トランスフォーム`で位置を調整できます。

今回は

* 位置をそれぞれ`(x, y, z) = (0, 0, 50)`
* 拡大縮小をそれぞれ`(x, y, z) = (1.2, 1.2, 0.2)`
に変更します。

これでキューブの上部にTriggerが表示されるようになります。
<img src="/images/2023/20231127a/スクリーンショット_(112)_R.jpg" alt="" width="1200" height="675" loading="lazy">

ここまで完了したら画面上部のタブから一度ColoringMapに戻ります。

そうすると先ほど作成したTriggerが、先ほど配置したキューブに反映されているのが確認できます。
<img src="/images/2023/20231127a/スクリーンショット_(113)_R.jpg" alt="" width="1200" height="675" loading="lazy">

そうしましたら、こちらのキューブの位置を調整し、複製をして床を作成していきます。
`詳細`の`トランスフォーム`を全て0に設定します。
<img src="/images/2023/20231127a/スクリーンショット_(114)_R.jpg" alt="" width="1200" height="675" loading="lazy">

そしたらこちらを複製していきます。`Alt`を押しながら、ギズモ(3方向に延びている矢印)をドラッグします。
(ギズモの中央ではなく、矢印を選択するとやりやすいです。)

これでキューブを2つに複製できました。
<img src="/images/2023/20231127a/スクリーンショット_(115)_R.jpg" alt="" width="1200" height="675" loading="lazy">

同様の作業を繰り返して床を作成します。

1つずつ複製していると大変なため、`Controll`を押しながら画面上のキューブを複数選択した状態で、`Alt`キーを使って同時に複数複製していきます。
数が多くなったら、画面右上の`アウトライナー`で`shift`を使って複数選択すると効率的に行えます。

<img src="/images/2023/20231127a/スクリーンショット_(116)_R.jpg" alt="" width="1200" height="675" loading="lazy">

これで床は完成しました。

しかしゲームスタート地点を設定していません。そのためこのまま再生ボタンをおすとキャラクターがそのまま落下してしまいます。`アクタを配置`から`Player Start`を選択しビューポート(中央の画面)にドラッグ&ドロップします。

<img src="/images/2023/20231127a/スクリーンショット_(117)_R.jpg" alt="" width="1200" height="675" loading="lazy">

そして`詳細`の`トランスフォーム`を変更します。
位置を`(x, y, z) = (0, 0, 150)`
回転を`(x, y, z) = (0, 0, -135)`
にします。
<img src="/images/2023/20231127a/スクリーンショット_(118)_R.jpg" alt="" width="1200" height="675" loading="lazy">

ここまできたら`Alt+P(もしくは上部の再生ボタン)`を押して、ゲームを再生します。設置した`Player Start`の位置、向きにキャラクターが出現し、WASDで移動、Spaceでジャンプ、マウスでカメラ操作が行えるようになります。
<img src="/images/2023/20231127a/スクリーンショット_(119)_R.jpg" alt="" width="1200" height="675" loading="lazy">

# 色が変わる床に修正しよう！ (Blueprintの作成)

それでは実際に`Trigger`に触れたら、キューブのマテリアル(色)を変えるようなBlueprintを組んでみましょう。
`BP_Cube`を再度開きます。

BP_Cubeを既に閉じてしまっている場合は

* `Ctrl+Space`でコンテンツドロワーを開き、`MyStruff`から`BP_Cube`を選択
* ビューポートの任意のキューブを選択して、`Ctrl+E`
のどちらかの手順で開く事ができます。
<img src="/images/2023/20231127a/スクリーンショット_(120)_R.jpg" alt="" width="1200" height="675" loading="lazy">

こちらのキューブにはまだ何もマテリアルを設定していないため、マテリアルを設定しましょう。
`詳細`の`マテリアル`から`M_Basic_Floor`を選択します。
(マテリアルはどれでも良いので好きな物を選んでください。)
<img src="/images/2023/20231127a/スクリーンショット_(141)_R.jpg" alt="" width="1200" height="675" loading="lazy">

するとキューブにマテリアルが適用されます。
<img src="/images/2023/20231127a/スクリーンショット_(142)_R.jpg" alt="" width="1200" height="675" loading="lazy">

ColoringMapに戻ってみると、すべてのキューブにマテリアルが適用されていることがわかります。
<img src="/images/2023/20231127a/スクリーンショット_(143)_R.jpg" alt="" width="1200" height="675" loading="lazy">

それでは再度`BP_Cube`に戻ります。
画面上部の`イベントグラフ`を選択します。
<img src="/images/2023/20231127a/スクリーンショット_(144)_R.jpg" alt="" width="1200" height="675" loading="lazy">

こちらの画面でBlueprintを作成していきます。
<img src="/images/2023/20231127a/スクリーンショット_(145)_R.jpg" alt="" width="1200" height="675" loading="lazy">

今回はキャラクターがCubeの上を通過したら、マテリアルを変更したいので、`Event ActorBeginOverlap`を使用します。(overlapは物体同氏が重なったときに発火するものです。詳しくは[overlapに関する公式ドキュメント](https://docs.unrealengine.com/4.27/ja/InteractiveExperiences/Physics/Collision/Overview/)を参照ください)

`Event ActorBeginOverlap`の右矢印をドラッグします。
<img src="/images/2023/20231127a/スクリーンショット_(146)_R.jpg" alt="" width="1200" height="675" loading="lazy">

するとどのBlueprintを`Event ActorBeginOverlap`と接続したいのかを聞かれます。

今回はoverlapしたらマテリアルを変更するようにしたいので`Set Material(StaticMeshComponent)`を検索し、クリックします。検索しても出てこない場合は左上の`コンポーネント`で`Static Mesh Component(StaticMeshComponent)`をクリックするか、検索画面の右上にある`状況に合わせた表示`のチェックを外します。

::: note warn
検索すると`Set Material(Trigger)`などが出てくることもあります。
しかし今回overlapした後に変更したいのはキューブ自体のマテリアルです。
そのため、こちらは選択せずに`set Material(StaticMeshComponent)`を選択するようにしてください。
:::

<img src="/images/2023/20231127a/スクリーンショット_(147)_R.jpg" alt="" width="1200" height="675" loading="lazy">

配置をするとこちらのようになります。
ドラッグするとBlueprintの位置を変更できるので見やすい位置に配置をしてください。
<img src="/images/2023/20231127a/スクリーンショット_(148)_R.jpg" alt="" width="1200" height="675" loading="lazy">

`Set Material`を設置したら、どのマテリアルに変更したいのかを決める必要があります。
`Set Material`内の`Material`から今回は`M_Ground_Grass`を選択します。

これで

1. キャラクターがCubeのTriggerと重なったら(Event ActorBeginOverlap)
2. `Static Mesh Component`のマテリアルを`M_Ground_Grass`に変更する(Set Material)

というBlueprintを作成できました！
<img src="/images/2023/20231127a/スクリーンショット_(149)_R.jpg" alt="スクリーンショット_(149)_R.jpg" width="1200" height="675" loading="lazy">

ここまで出来たら`再生ボタンを押す`もしくは`Alt+P`でゲームを再生してみましょう。
キャラクターが歩いた所のマテリアルが変わっていくようになっていることを確認します。
<img src="/images/2023/20231127a/スクリーンショット_(150)_R.jpg" alt="スクリーンショット_(150)_R.jpg" width="1200" height="675" loading="lazy">

# 2秒経過したら元の色に戻そう

練習として2秒経過したらマテリアルを元に戻す、というBlueprintも作成してみましょう。

今回はoverlapが終了したら、つまりキャラクターがキューブの上から離れたら、元のマテリアルに戻す、といったBlueprintを作成しようと思います。
そのためには新たにイベントを追加する必要があります。

画面左下の`マイブループリント`の`関数`にある`オーバーライド`から`ActorEndOverlap`を選択します。
<img src="/images/2023/20231127a/スクリーンショット_(151)_R.jpg" alt="スクリーンショット_(151)_R.jpg" width="1200" height="675" loading="lazy">

すると画面に`Event ActorEndOverlap`が追加されます。
<img src="/images/2023/20231127a/スクリーンショット_(152)_R.jpg" alt="スクリーンショット_(152)_R.jpg" width="1200" height="675" loading="lazy">

そうしたら`Event ActorEndOverlap`の右矢印をドラッグします。
前述のとおり、この`Event ActorEndOverlap`が呼び出されるのはキャラクターがキューブの上から離れたとき、になります。
離れてから2秒後にマテリアルを変更したいため、任意秒処理を遅らせる事ができる`Delay`を選択します。
<img src="/images/2023/20231127a/スクリーンショット_(153)_R.jpg" alt="スクリーンショット_(153)_R.jpg" width="1200" height="675" loading="lazy">

`Delay`の設置が出来たら、`Duration`を2.0に設定し、2秒間遅らせるようにします。
<img src="/images/2023/20231127a/スクリーンショット_(157)_R.jpg" alt="スクリーンショット_(157)_R.jpg" width="1200" height="675" loading="lazy">

その後の処理は先ほどと同じになります。
`Delay`の右矢印をドラッグし、`Set Material(Static Mesh Component)`を選択します。
今回の`Material`は[こちら](#色が変わる床に修正しよう！(Blueprint))で設定した`M_Basic_Floor`を選択します。
<img src="/images/2023/20231127a/スクリーンショット_(158)_R.jpg" alt="スクリーンショット_(158)_R.jpg" width="1200" height="675" loading="lazy">

これで今回作成するBlueprintは以上になります。
`Alt+P`でゲームを再生すると、歩いた箇所が2秒後に元の色に戻るようになりました。
これで簡易的な色塗りゲームが完成しました。
<img src="/images/2023/20231127a/スクリーンショット_(159)_R_2.jpg" alt="スクリーンショット_(159)_R.jpg" width="1200" height="675" loading="lazy">

# 終わりに

この記事では以下の事を行いました。

* プロジェクトの立ち上げ方
* レベルをどのように作るのか
* 空などの設置方法
* アクタ(オブジェクト)の配置方法、位置の変え方など
* Blueprintを使った色塗りゲームのロジック開発

かなり初歩的な所ではありますが、UnrealEngineの基本的な所に触れることができたのではないかと思います。

ここから自分で拡張してみても面白いかもしれません。

* ステージが狭いのでもう少し広げてみる
* ジャンプしたときは別のマテリアルに変える
* 色を変えるではなく、歩いたところのブロックが落下するようにしてみる

今回使用したノード(`Delay`や`Set Material`の事)は2つだけです。ノードはまだまだ沢山あるのでぜひ調べてみてください。

最後まで読んでいただきありがとうございました。
