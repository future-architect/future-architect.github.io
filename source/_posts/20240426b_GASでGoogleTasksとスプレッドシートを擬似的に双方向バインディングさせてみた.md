---
title: "GASでGoogleTasksとスプレッドシートを擬似的に双方向バインディングさせてみた"
date: 2024/04/26 00:00:01
postid: b
tag:
  - GAS
  - スプレッドシート
  - 初心者
  - Vue.js
category:
  - Programming
thumbnail: /images/20240426b/thumbnail.png
author: 後藤喜斗
lede: "フロントエンドの開発をする際にはVueを使用しています。Vueでの開発に慣れていくにつれて、「Vue使いやすいな、よくできているなぁ。」と思うとともに、普段何気なく使っているスプレッドシートに対して、今まで感じたことのなかった不便さを感じるようになりました。"
---

[春の入門連載](/articles/20240408a/)の13本目です。

こんにちは。TIG所属の後藤喜斗です。

同じプロジェクトで活躍されている[伊藤太斉さん](/authors/%E4%BC%8A%E8%97%A4%E5%A4%AA%E6%96%89/) にお誘いいただき、初めて技術ブログを書かせていただきます。

# 取り組みの経緯

業務ではアプリチームに所属していて、フロントエンドの開発をする際にはVueを使用しています。

Vueでの開発に慣れていくにつれて、「Vue使いやすいな、よくできているなぁ。」と思うとともに、普段何気なく使っているスプレッドシートに対して、今まで感じたことのなかった不便さを感じるようになりました。

そして、その朧げながら見えてきた不便さの正体が、スプレッドシートでは双方向バインディングができないからではないか、と思い至りました。

そのため今回は、Vueを使うことで当たり前のように利便性を享受していた双方向バインディングについて改めて調べるとともに、実践編ということで、スプレッドシートに出力したGoogleTasksのタスク一覧と、GoogleTasks本体とを擬似的に双方向バインディングさせてみることにしました。

# そもそも双方向バインディングとは

まずは双方向バインディングについて調べてみます。Wikiには下記のように記載がありました。

## データバインディングとは

> データバインディングは、コンピュータプログラミングにおいて、データ（ソースオブジェクト）とそれに対応する対象要素（ターゲットオブジェクト）を結びつけ、データあるいは対象の変更を暗黙的に（自動的に）もう一方に反映（同期）することであり、またそれを実現する仕組みのことである。
データバインディングは特にGUIを持つアプリケーションソフトウェアの効率的な開発を目的とした技術であり、Model-View-ViewModel (MVVM) パターンの実現に必須の技術でもある。

### 単方向と双方向のデータバインディング

>データバインディングには変更反映の方向性によって以下の2種類が存在する。
単方向バインディング (one-way): 「ソース ⇒ ターゲット」あるいは「ターゲット ⇒ ソース」のみの一方向の暗黙的反映
双方向バインディング (two-way): ソース ⇔ ターゲット間の双方向の暗黙的反映

参考）[データバインディング](https://ja.wikipedia.org/wiki/%E3%83%87%E3%83%BC%E3%82%BF%E3%83%90%E3%82%A4%E3%83%B3%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0)

名前の通りではあるのですが、改めてデータバインディングとは「データの変更があったときに一方から他方に同期を取る仕組み」です。すると、前出のスプレッドシートで双方向バインディングができないというのを具体的にいうと、「A1セルの変更がA2セルに反映される」かつ「A2セルの変更がA1セルに反映される」みたいな状態は作れない、ということです。

ちなみにこれだけなら、スプレッドシートの標準機能のマクロの記録を使って下記のようなGASのコードを自動生成して、編集時にトリガー実行すれば、誰でも簡単に実現可能なのですが、これだけだとあまり旨味がないですよね。

```js
function myFunction() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('A1').activate();
  spreadsheet.getRange('A2').copyTo(spreadsheet.getActiveRange(), SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);
};
```

ここで、データバインディングの定義に出てきている「MVVMパターン」という用語も押さえておきます。

## MVVMパターン

> Model-View-ViewModel (MVVM、モデル・ビュー・ビューモデル) はUIを持つソフトウェアに適用されるソフトウェアアーキテクチャの一種である。
MVVMはソフトウェアをModel・View・ViewModelの3要素に分割する。プレゼンテーションとドメインを分離し（V-VM / M）また宣言的Viewを分離し状態とマッピングを別にもつ（V / VM）ことでソフトウェアの保守性・開発生産性を向上させる。
Model-View-ViewModelパターンはModel-View-Controller (MVC) パターンの派生であり、特にPresentation Model パターンを直接の祖先に持つ。

参考）[Model View ViewModel](https://ja.wikipedia.org/wiki/Model_View_ViewModel)

MVVMパターンは、画面表示している項目（View）で使いたいデータと、システム側の処理（Model）で使いたいデータを、ViewModelがうまいこと相互に変換してくれる仕組みのようです。

すると確かに、MVVMパターンを実装する際に、ViewModelがデータ変換でデータバインディングをしてくれると良い感じに実装できそうです。前出のWikiに双方向バインディングがMVVMパターンで必須の技術だと書かれていたのも納得です。

これを踏まえると、先ほどのA1セルをA2セルにコピペする、みたいな使い方ではなく、「Viewにあたる表示部分のデータと、Modelにあたる何らかの処理機能を持つ部分のデータとを、自動的に連動させる仕組み」を作ったら、擬似的に双方向バインディングができているだけでなく、MVVMパターンのメリットも享受できていると言えそうです。

ということで前置きがかなり長くなりましたが、今回はModel側にあたるタスク管理機能はGoogleTasksを活用し、ViewとしてのスプレッドシートとGoogleTasksを自動でバインドさせる仕組みを作ってみました。

# 今回作った機能

スプレッドシートに出力されているGoogle TasksのTodoをスプレッドシート側からも自動で更新できる機能を、MVVMパターンを意識して下記のような構成で実装しました。

※シートからのタスク追加とタスクリストの変更は追加で実装が必要になり、主題からもそれていくので今回は割愛しました。

### View Model

Googleが公表している[GoogleTasksのREST Resourceの形式](https://developers.google.com/tasks/reference/rest/v1/tasks?hl=ja)と、スプレッドシートに表示しているタスクリストの各列の項目を連携（擬似的に双方向バインディング）させました。

- スプレッドシートの値を取得し、GoogleTasksにセットする（View→Model）
    - タスクリストの変更を検知
        - 変更のあった行の値を取得
    - スプレッドシートの値をTaskにセットして更新
- GoogleTasksの情報をスプレッドシートに反映させる（Model→View）
    - GoogleTaskの情報をスプレッドシートに自動的に反映させる（今回はトリガーを使用して定時実行）

構成図にするとこんなイメージです。

<img src="/images/20240426b/構成図.png" alt="" width="842" height="552" loading="lazy">

### View

スプレッドシートのタスクリスト表の各項目は以下の通り。

| タスクID | タスクリスト名 | タスク名 | ステータス | 更新日時 | 期限 | 完了日 | メモ |
|:-----------|:------------|:------------|:------------|:------------|:------------|:------------|:------------|
| abc... | マイリスト  | タスク名 | completed | 2024/04/01　 | 2024/04/01 | 2024/04/01 | 説明　|

### Model

GoogleTasksを利用。みなさんご存知のGoogleカレンダーとの連動だけでなく、最近はGoogleドキュメントやGmail、Googleチャットなどいろんなツールと連携して利用できて便利です。

## 実装したGASのコード

使い方は下記の通り。

1. スプレッドシート上部メニューの、拡張機能>Apps ScriptからGASのエディタを開いて下記を入力
2. Tasksサービスを使えるように権限設定
3. トリガーメニューから、以下のトリガーを設定
    1. onEditを編集時に実行
    2. getGoogleTasksを定時実行
```js
// シート取得
const spreadSheet = SpreadsheetApp.getActiveSpreadsheet()
const sheetToDo = spreadSheet.getSheetByName("GoogleTasks")
const lastRow = sheetToDo.getLastRow()
const lastColumn = sheetToDo.getLastColumn()

// Taskの項目をSheetの列番号へ変換する
// スプレッドシートの列を並び替えたい時は、この項目を書き換えるだけでOK。
const getColNum = {
    id: 0,
    taskListName: 1,
    title: 2,
    status: 3,
    updated: 4,
    due: 5,
    completed: 6,
    notes: 7
}

//タスク取得オプション
const options = {
    showCompleted: true,
    showDeleted: false,
    showHidden: true,
}

// 以下、SpreadSheetからGoogleTasksへ変更を反映
/**
 * Sheetの変更を検知
 */
function onEdit() {
    const editRow = spreadSheet.getActiveCell().getRow()
    const editColumn = spreadSheet.getActiveCell().getColumn()

    if (spreadSheet.getActiveSheet().getSheetId() != sheetToDo.getSheetId()) {
        // GoogleTasks以外のシートを編集した場合は即リターン
        return
    }

    if (editRow <= lastRow && editColumn <= lastColumn) {
        // Sheetに変更のあった行の値をGoogleTaskに反映する
        setTaskFromSheet(editRow)
    }
}

/**
 * Sheetの値を取得し、GoogleTasksに反映する
 */
function setTaskFromSheet(rowNumber) {

    // Sheetの変更のあった行の値を取得
    const sheetTask = sheetToDo.getRange(rowNumber, 1, 1, sheetToDo.getLastColumn()).getValues()[0]
    Logger.log(sheetTask)

    // タスクリスト名からタスクリストIDを取得（以下でTasksのメソッドの呼び出しに使用）
    const taskListId = getTaskListId(sheetTask[getColNum.taskListName]);

    // GoogleTasksのタスクを取得
    const task = Tasks.Tasks.get(taskListId, sheetTask[getColNum.id])

    // Sheetの情報をGoogleTasksにセット
    setSheetTask(task, sheetTask)

    // GoogleTaskを更新
    Tasks.Tasks.update(task, taskListId, task.id)
}

/**
 * タスクリスト名からタスクリストIDを取得
 */
function getTaskListId(taskListName) {
    // Sheetのタスクリスト名からタスクリストIDを取得
    const lists = Tasks.Tasklists.list().getItems()
    let taskListId
    for (let i = 0; i < lists.length; i++) {
        if (lists[i].title == taskListName) {
            taskListId = lists[i].id
        }
    }
    return taskListId
}

/**
 * Sheetの情報をGoogleTasksにセット
 */
function setSheetTask(task, sheetTask) {
    // Sheetの値をTaskにセット
    task.title = sheetTask[getColNum.title]
    task.status = sheetTask[getColNum.status]
    task.updated = sheetTask[getColNum.updated] ? sheetTask[getColNum.updated].toISOString() : ''
    task.due = sheetTask[getColNum.due] ? sheetTask[getColNum.due].toISOString() : ''
    task.completed = sheetTask[getColNum.completed] ? sheetTask[getColNum.completed].toISOString() : ''
    task.notes = sheetTask[getColNum.notes]
}


//　以下、GoogleTasksからSpreadSheetへタスク一覧を出力
/**
 * GoogleTasksのリストからタスクを取得してスプレッドシートにセット
 */
function getGoogleTasks() {
    // シート2行名以下をクリア
    const lastRow = sheetToDo.getLastRow()
    const lastColumn = sheetToDo.getLastColumn()
    sheetToDo.getRange(2, 1, lastRow, lastColumn).clearContent()

    // Google Tasksからタスクリストを取得してTaskの情報をSheetに反映させる
    const taskList = 　getTaskLists()
    sheetToDo.getRange(2, 1, taskList.length, lastColumn).setValues(taskList)
}

/**
 * GoogleTasksからタスクリストをすべて取得
 */
function getTaskLists() {
    const lists = Tasks.Tasklists.list().getItems()
    let taskLists = new Array()
    for (let i = 0; i < lists.length; i++) {
        taskLists = taskLists.concat(createTaskTable(lists[i]))
    }
    return taskLists
}

/**
 * タスクリストからタスクをすべて取得
 */
function createTaskTable(taskList) {
    const tasks = Tasks.Tasks.list(taskList.id, options).getItems()
    const table = new Array()
    const taskListName = taskList.title
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        let row = new Array()
        row[getColNum.id] = task.id
        row[getColNum.taskListName] = taskListName
        row[getColNum.title] = task.title
        row[getColNum.status] = task.status
        row[getColNum.updated] = task.updated ? new Date(task.updated) : ""
        row[getColNum.due] = task.due ? new Date(task.due) : ""
        row[getColNum.completed] = task.completed
        row[getColNum.notes] = task.notes
        table.push(row)
    }
    return table
}
```

## 動作イメージ

スプレッドシートからの変更は編集をトリガーに実行されます。

<img src="/images/20240426b/スプレッドシートから変更.gif" alt="スプレッドシートから変更.gif" width="1200" height="662" loading="lazy">

GoogleTasksからの変更は定時実行で最短1分ごとに取得できます。

<img src="/images/20240426b/GoogleTasksから変更.gif" alt="GoogleTasksから変更.gif" width="1200" height="662" loading="lazy">


# まとめ

わざわざ自分で手を動かしてはみたものの、イベントの監視や値の反映などもVueを使えば裏で自動的にやってくれて、しかも簡単な記法でよりリアルタイムに同期される双方向バインディングが実装できると思うと、非常にありがたいですね。

春の入門連載では、同期の吉原さんが[Vueを使ったオセロの制作](/articles/20240422a/)にも挑戦していますので、ぜひみてみてください。
