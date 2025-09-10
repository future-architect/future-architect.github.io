---
title: "FlutterFlowを触ってみる"
date: 2022/03/25 00:00:00
postid: a
tag:
  - Flutter
  - UI/UX
  - ノーコード
  - ローコード
category:
  - Mobile
thumbnail: /images/2022/20220325a/thumbnail.png
author: 宮崎将太
lede: "Flutter連載6回目としてFlutterFlowについて調べてみました。GoogleI/O'21でFlutterFlowというFlutterのノーコードのサービスが発表されました。"
---
<img src="/images/2022/20220325a/image.png" alt="image.png" width="1200" height="675" loading="lazy">

# はじめに

TIGの宮崎将太です。

[Flutter連載6回目](/articles/20220315a/)としてFlutterFlowについて調べてみました。
※2022年3月時点でFreeプランで検証しています。

# What's Flutter Flow

GoogleI/O'21でFlutterFlowというFlutterのノーコードのサービスが発表されました。

GUIだけでグリグリアプリが作れちゃうという例のアレですね。

個人的にノーコードツールに懐疑的な印象を持っているので、実際に現場に適用できそうかという観点で調べてみました。

# 機能&料金体型

出落ちになりますが、プラン別の機能と料金体系です。

|              **機能**              |                                                                                                                         **説明**                                                                                                                        | **Free Plan** | **Standard Plan** | **Pro Plan** |
|:----------------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-------------:|:-----------------:|:------------:|
| **標準コンポーネント**             | Flutter Flowで事前定義されたコンポーネントの使用可否です。<br>簡素なモバイルアプリであれば標準コンポーネントのみで構築も可能なくらい多くの部品が事前定義されています。                                                                                  |       ○       |         ○         |       ○      |
| **カスタムウィジェット**                 | カスタムコンポーネントの作成可否です。<br>全プランでGUIベース、コードベースの双方でコンポーネントを作成可能です。                                                                                                                                       |       ○       |         ○         |       ○      |
| **カスタムFuctiion**               | 自作関数作成可否です。<br>関数として登録しておくと、複数画面で処理を使い回すことができます。                                                                                                                                                            |       ○       |         ○         |       ○      |
| **画面テンプレート**               | 50以上の画面テンプレートの利用可否。<br>よくあるアプリケーションデザインがテンプレート化されており、これを使うだけでもある程度見れる見た目になります。                                                                                                  |       ○       |         ○         |       ○      |
| **アプリケーション実行**           | FlutterFlow上でのアプリケーション実行可否です。<br>設定にエラーがなければweb上でアプリケーションを実行できます。                                                                                                                                        |       ○       |         ○         |       ○      |
| **Firebaseとの統合**               | 全環境でbackendとしてFirebaseを統合的に使用できます。<br>プロジェクト作成時か、後からFirebaseプロジェクトをFlutter Flowプロジェクト側に登録することで利用が可能になります。<br>※Firebase側でFlutterFlowアカウントに対して権限を付与する必要があります。 |       ○       |         ○         |       ○      |
| **3rd Partyライブラリとの統合**    | pub.devから依存ライブラリをDLしてきて参照できます。<br>通常のFlutter開発相当のことができると考えてOKです。                                                                                                                                              |       ○       |         ○         |       ○      |
| **チーム共有**                     | FlutterFlowプロジェクトに対してメールアドレスを登録することで共同編集が可能です。                                                                                                                                                                       |       ○       |         ○         |       ○      |
| **サンプルアプリ**                 | Standardプラン以上だと作成済みのサンプルアプリを動作させることができます。<br>※Freeプランでもサンプルプロジェクトを動かすことはできましたが、アプリとして動作させようとするとエラーが発生していました。                                                 |               |         ○         |       ○      |
| **APKダウンロード**                | Standartdプラン以上であればAPKダウンロードが可能です。                                                                                                                                                                                                  |               |         ○         |       ○      |
| **ソースコードダウンロード**       | Standartdプラン以上であればFlutterプロジェクトとしてダウンロードが可能です。<br>Freeプランでもコンポーネント単位でのソース閲覧は可能ですが、プロジェクト丸ごとのDLは不可でした。                                                                        |               |         ○         |       ○      |
| **AppStore/PlayStoreへのデプロイ** | Proプランでのみ、直接アプリをストアにデプロイできるとのこと。                                                                                                                                                                                           |               |                   |       ○      |
| **カスタムAPI**                    | Proプランのみ任意のAPIコールを可能とのこと。<br>※試せていませんが、FreeとStandadだと相当カスタマイズしない限りFirebase固定になるかも？                                                                                                                  |               |                   |       ○      |
| **Githubとの統合**                 | ProプランのみソースコードをGithubリポジトリベースで管理できるとのこと。<br>FlutterFlowにもバージョンの概念はありますが、アプリ全体で断面を切るくらいしかできませんでした。                                                                              |               |                   |       ○      |
| **Firebase ContentMangeer**        | ProプランのみFirestoreデータをFlutterFlowGUI上で編集できるようになるとのこと。                                                                                                                                                                          |               |                   |       ○      |
| **料金**                           | per month                                                                                                                                                                                                                                               |       0$      |        30$        |      70$     |

# 使い方

FlutterFlowアカウント自体は無料で作成が可能です。
https://app.flutterflow.io/create-account

以降はアカウントを作成した前提で話を進めます。

## プロジェクト作成

テンプレートからプロジェクトを作成するかblankプロジェクトを作成するか選択可能です。
Freeプランで利用可能なテンプレートは現時点で8種類あり、大半がFirebase利用を前提としていました。

<img src="/images/2022/20220325a/ec121a83-71d8-4a99-c03a-edc8e266c128.png" alt="プロジェクト作成の流れ1" width="1200" height="931" loading="lazy">

<img src="/images/2022/20220325a/ad4b708f-b9d3-769c-2fb4-645c88d5d69f.png" alt="プロジェクト作成の流れ2" width="848" height="620" loading="lazy">

<img src="/images/2022/20220325a/909972bf-5d96-3dc5-4a1e-22fc212e209d.png" alt="プロジェクト作成の流れ3" width="816" height="646" loading="lazy">

## 画面デザイン

メインのデザイン画面はこんな感じです

<img src="/images/2022/20220325a/image_2.png" alt="画面デザイン" width="1200" height="563" loading="lazy">

コンポーネント選択パネルから部品をDrag&Dropで画面に配置できます。
TextやColumn、RowなどおなじみのWigdetがデフォルトで登録されています。
配置された部品はプロパティ設定パネルで細かな調整が可能です。
ざっと見た感じウィジェットコンストラクタの属性がそのままGUIで設定可能なように見受けられました。
ちなみに、デバイス選択ではiPhone/AndroidのほかにiPadとMac/Windowsも選択可能です。
右上のRunボタンでweb上でアプリ実行もできます。

ナビゲーションバーでタブを切り替えると画面ごとの表示やウィジェットのツリー表示も可能です。

<img src="/images/2022/20220325a/image_3.png" alt="画面ごとの表示やWidgetのツリー表示" width="354" height="906" loading="lazy">

## Action設定

配置した部品にGUIでActionを設定できます。
設定可能なActionはデフォルトで用意されているものとカスタムで作成できるものがあり、Navigatorの使用やAlertなんかはデフォルトで用意されています。

<img src="/images/2022/20220325a/image_4.png" alt="GUIを用いたAction設定" width="1200" height="515" loading="lazy">

## コンポーネント作成

GUIとコードベースでコンポーネントを作成できます。
部品として永続化してDRYに書くことは問題なくできそうです。
※コンポーネントとは別にCustom ウィジェットという概念もありますが、こちらはコードベースで作成するコンポーネントを指すようです。

<img src="/images/2022/20220325a/ezgif.com-gif-maker.gif" alt="コンポーネント作成のGifどうが" width="800" height="544" loading="lazy">

## LocalState

アプリケーショングローバルな値をLocalStateとして設定しておけます。
ローカルDBへの永続化も可能です。
ActionやCustomFunctionから適宜参照、設定ができます。

<img src="/images/2022/20220325a/image_5.png" alt="アプリケーショングローバルな値をLocalStateとして設定" width="1200" height="734" loading="lazy">

## APICall

ここが残念なところ....
FreePlan/Standardでは任意のAPICall設定ができません。Backendを簡単に使用する場合はFirebaseを使うことが縛りになってしまうよう。
※CustomFunctionとしてAPICallをコーディングしておけばなんとでもなる気がするけど、そこまでやるとFlutterFlowを使用する理由が消失する。

<img src="/images/2022/20220325a/image_6.png" alt="API呼び出し" width="1200" height="745" loading="lazy">

## 生成ソースコード

最後に、FreePlanでも画面のソース閲覧は可能です（プロジェクト全体のダウンロードやGithub接続は不可）。
ちょっとコードを眺めてみましょう。

<img src="/images/2022/20220325a/image_7.png" alt="コード出力ボタン" width="1154" height="376" loading="lazy">
↓
<img src="/images/2022/20220325a/image_8.png" alt="生成されたコード" width="1200" height="518" loading="lazy">

```dart
import '../backend/api_requests/api_calls.dart';
import '../department_highlights_page/department_highlights_page_widget.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import '../flutter_flow/flutter_flow_util.dart';
import '../search_results_page/search_results_page_widget.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HomePageWidget extends StatefulWidget {
  const HomePageWidget({Key key}) : super(key: key);

  @override
  _HomePageWidgetState createState() => _HomePageWidgetState();
}

class _HomePageWidgetState extends State<HomePageWidget> {
  TextEditingController textController;
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    textController = TextEditingController();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: scaffoldKey,
      backgroundColor: FlutterFlowTheme.of(context).secondaryColor,
      body: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.max,
          children: [
            Stack(
              children: [
                Align(
                  alignment: AlignmentDirectional(0, 0),
                  child: Image.asset(
                    'assets/images/home_image.png',
                    width: double.infinity,
                    height: 255,
                    fit: BoxFit.cover,
                  ),
                ),
                Align(
                  alignment: AlignmentDirectional(0, 0),
                  child: Padding(
                    padding: EdgeInsetsDirectional.fromSTEB(20, 60, 20, 0),
                    child: Column(
                      mainAxisSize: MainAxisSize.max,
                      children: [
                        Padding(
                          padding: EdgeInsetsDirectional.fromSTEB(0, 0, 0, 17),
                          child: Image.asset(
                            'assets/images/logo_flutterMet_white.png',
                            width: 120,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Text(
                          'Your place for searching ART.',
                          style: FlutterFlowTheme.of(context)
                              .bodyText1
                              .override(
                                fontFamily: 'Playfair Display',
                                color:
                                    FlutterFlowTheme.of(context).secondaryColor,
                                fontSize: 16,
                                fontStyle: FontStyle.italic,
                              ),
                        ),
                        Padding(
                          padding: EdgeInsetsDirectional.fromSTEB(0, 27, 0, 0),
                          child: Container(
                            width: double.infinity,
                            height: 52,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Padding(
                              padding:
                                  EdgeInsetsDirectional.fromSTEB(15, 0, 15, 0),
                              child: Row(
                                mainAxisSize: MainAxisSize.max,
                                children: [
                                  InkWell(
                                    onTap: () async {
                                      await Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              SearchResultsPageWidget(
                                            searchTerm: textController.text,
                                          ),
                                        ),
                                      );
                                      await GetDepartmentsCall.call();
                                    },
                                    child: Icon(
                                      Icons.search,
                                      color: FlutterFlowTheme.of(context)
                                          .tertiaryColor,
                                      size: 24,
                                    ),
                                  ),
                                  Expanded(
                                    child: Padding(
                                      padding: EdgeInsetsDirectional.fromSTEB(
                                          5, 0, 0, 2),
                                      child: TextFormField(
                                        controller: textController,
                                        obscureText: false,
                                        decoration: InputDecoration(
                                          hintText:
                                              'Search artist, maker, department...',
                                          enabledBorder: UnderlineInputBorder(
                                            borderSide: BorderSide(
                                              color: Color(0x00000000),
                                              width: 1,
                                            ),
                                            borderRadius:
                                                const BorderRadius.only(
                                              topLeft: Radius.circular(4.0),
                                              topRight: Radius.circular(4.0),
                                            ),
                                          ),
                                          focusedBorder: UnderlineInputBorder(
                                            borderSide: BorderSide(
                                              color: Color(0x00000000),
                                              width: 1,
                                            ),
                                            borderRadius:
                                                const BorderRadius.only(
                                              topLeft: Radius.circular(4.0),
                                              topRight: Radius.circular(4.0),
                                            ),
                                          ),
                                        ),
                                        style: FlutterFlowTheme.of(context)
                                            .bodyText1
                                            .override(
                                              fontFamily: 'Playfair Display',
                                              fontSize: 16,
                                            ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Align(
                          alignment: AlignmentDirectional(-1, 0),
                          child: Padding(
                            padding:
                                EdgeInsetsDirectional.fromSTEB(10, 15, 0, 20),
                            child: Text(
                              'Museum Departments',
                              style: FlutterFlowTheme.of(context)
                                  .bodyText1
                                  .override(
                                    fontFamily: 'Playfair Display',
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ),
                        ),
                        FutureBuilder<ApiCallResponse>(
                          future: GetDepartmentsCall.call(),
                          builder: (context, snapshot) {
                            // Customize what your widget looks like when it's loading.
                            if (!snapshot.hasData) {
                              return Center(
                                child: SizedBox(
                                  width: 50,
                                  height: 50,
                                  child: CircularProgressIndicator(
                                    color: FlutterFlowTheme.of(context)
                                        .primaryColor,
                                  ),
                                ),
                              );
                            }
                            final gridViewGetDepartmentsResponse =
                                snapshot.data;
                            return Builder(
                              builder: (context) {
                                final departments = (getJsonField(
                                          (gridViewGetDepartmentsResponse
                                                  ?.jsonBody ??
                                              ''),
                                          r'''$.departments''',
                                        )?.toList() ??
                                        [])
                                    .take(30)
                                    .toList();
                                return GridView.builder(
                                  padding: EdgeInsets.zero,
                                  gridDelegate:
                                      SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 2,
                                    crossAxisSpacing: 10,
                                    mainAxisSpacing: 10,
                                    childAspectRatio: 1.6,
                                  ),
                                  primary: false,
                                  shrinkWrap: true,
                                  scrollDirection: Axis.vertical,
                                  itemCount: departments.length,
                                  itemBuilder: (context, departmentsIndex) {
                                    final departmentsItem =
                                        departments[departmentsIndex];
                                    return InkWell(
                                      onTap: () async {
                                        await Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) =>
                                                DepartmentHighlightsPageWidget(
                                              departmentId: getJsonField(
                                                departmentsItem,
                                                r'''$.departmentId''',
                                              ),
                                              displayName: getJsonField(
                                                departmentsItem,
                                                r'''$.displayName''',
                                              ).toString(),
                                            ),
                                          ),
                                        );
                                      },
                                      child: Card(
                                        clipBehavior:
                                            Clip.antiAliasWithSaveLayer,
                                        color: Colors.white,
                                        elevation: 4,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Align(
                                          alignment: AlignmentDirectional(0, 0),
                                          child: Padding(
                                            padding:
                                                EdgeInsetsDirectional.fromSTEB(
                                                    5, 0, 5, 0),
                                            child: Text(
                                              getJsonField(
                                                departmentsItem,
                                                r'''$.displayName''',
                                              ).toString(),
                                              textAlign: TextAlign.center,
                                              style:
                                                  FlutterFlowTheme.of(context)
                                                      .title1,
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                );
                              },
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

```

テンプレート画面をそのまま出力したこともあり、`Scaffold`の中にゴリゴリ実装されていますね。
コンポーネントをうまく使えばもうちょっとプロダクト寄りの実装にはなりそうです。
ただし、素で`StatefulWidget`を使用している部分はどうにもならなそうで、このままコピー&ペーストは難しそう。
あくまでデザイン部分の参考程度の使い道にな理想です。
ちなみに、テーマはFlutterFlowプロジェクトでグローバル設定が可能で、`FlutterFlowTheme`はその設定にアクセスしているものと思われます。

# 使い所

軽く触ってみた感触と料金体系を見た感じ、以下の感触でした。

* ProPlanであればPoCプロジェクトは十分に回せそう。ただし、状態管理などより作りを意識する必要があるプロダクト版開発はProPlanでも限定的な使い方になる（デザイン部分だけをFlutterFlowで作るなど）。
* Firebase前提でプロトタイプのみを作成するのであればStandardPlanが適当。ソースダウンロードができるので、どこかのリポジトリに保存しておけばプロジェクト終了後も月額費を払い続けるということは必要なし。
* FreePlanはデザインコードの参考程度の使い道。画面単位でソースコード表示はできるので、部分的にコピー&ペーストすることで若干開発は早くなるか。

有料プランでも14日間は使用ができそうなので、次はProPlanを試してみようと思います。
正直FreeとStandardでは実プロジェクトへの導入はなかなか難しそう..
Proでも料金は70$/月程度なので、プロジェクトで数アカウントだけ取るのはギリギリありかどうか..？ といったところです。
