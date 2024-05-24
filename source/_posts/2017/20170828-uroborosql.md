---
title: "uroboroSQL x Spring BootによるWebアプリケーション開発"
date: 2017/08/28 12:00:00
postid: ""
tag:
  - uroboroSQL
  - Java
  - SQL
  - SpringBoot
category:
  - Programming
thumbnail: /images/20170828/thumbnail_20170828.jpg
author: 星賢一
lede: "弊社発のOSSプロダクト「uroboroSQL」をSpring Boot上で動かすサンプルアプリケーションを作ってみました。"
-------------------------------------------------------------------------------------------------------

# uroboroSQLについて

こんにちは。星です。

今回は本技術ブログにもロゴが掲載されている弊社OSSプロダクトの一つ、「[uroboroSQL](/uroborosql-doc/)」を利用してWebアプリケーションをどうやって開発すればよいのか？という話をさせて頂きたいと思います。

今年3月に実施されたオープンソースカンファレンス2017 Tokyo/Springを皮切りに、5月の名古屋、そして、8月の京都の開催においてもブース出展・セミナーでご紹介してきましたが、来場者の方々に興味をもって頂き、さまざまなフィードバックを頂き、OSSにした実感を得ています。

JavaでRDBにアクセスするアプリケーションを開発する場合、Java標準のJPA(Java Persistence API)や、Hiberate、MyBatis、EclipseLink、DBFlute、Domaなど、多くの選択肢が存在しています。

uroboroSQLもこういったJavaにおけるDB永続化ライブラリの一つであり、ORマッピングの機能も持っていますが、基本的にはJavaからSQLを生成することよりも、SQLに足りないところをJavaで補うアプローチを採用しているのが特徴です。

> uroboroSQLに興味を持たれた方は、公式サイトおよび私がオープンソースカンファレンス2017 Nagoyaにて、講演した資料をご覧ください。
>
> uroboroSQL公式サイト
> https://future-architect.github.io/uroborosql-doc/
>
> uroboroSQLの紹介 (OSC2017 Nagoya) #oscnagoya
> https://www.slideshare.net/KenichiHoshi1/uroborosql-osc2017-nagoya-oscnagoya

# uroboroSQLを利用したSpring BootによるWebアプリケーション

さて、JavaでWebアプリケーションを開発するとき、いわゆるWebアプリケーションフレームワークをどうするかという話がありますが、有償のWebアプリケーションサーバを利用する前提であれば、JavaEEは有力な選択肢でしょうし、そうでなければ、Spring Framework(Spring Boot)、Play Frameworkなどが有力かなと思います。特に最近はPaaSなどでコンテナ上で動かす場合は、TomcatやJettyなどを組み込んで、実行可能jarにしてデプロイするという方式もトレンドでしょうか。

uroboroSQLは、特定のWebアプリケーションフレームワークには依存しませんが、現在コマンドラインのサンプルぐらいしか用意できていないので、実際にWebアプリケーションを開発する場合のイメージがわかないという声も聞こえてくるようになりました。

そこで、現在最も人気のあるJavaのWebアプリケーションフレームワークの一つである「Spring Boot」を採用して、uroboroSQLのリファレンスとなるWebアプリケーションを開発してみました。

そして、今回採用するSpring Bootが「Spring PetClinic」というサンプルアプリケーションを公開していることもあり、それを見習って、「uroboroSQL PetClinic」を作ってみました。

なお、最近フロントエンドはJSフレームワーク利用のケースが多いかと思いますので、Thymeleafによるサーバサイドレンダリングではなく、Vue.jsを用いて実装しています。本サンプルのメイン部分ではありませんので、本記事では詳細には触れませんが、興味がある方はソースをご覧ください。

- uroboroSQL PetClinic
  - https://github.com/shout-star/uroborosql-springboot-demo


# uroboroSQL PetClinic

<img src="/images/20170828/photo_20170828_01.jpg" class="img-middle-size" loading="lazy">

トップページはSpring PetClinicをご存じの方だったら、ピンと来るかなと思います。
基本的に仕様はほぼ踏襲しています。

簡単にこのアプリケーションの説明をすると、動物病院のペット・飼い主の管理システムですね。「Find Owner」から飼い主を検索して、その飼い主のペットの登録やペットの来院履歴の登録ができるといったものです。

<img src="/images/20170828/photo_20170828_02.png" class="img-middle-size" loading="lazy">

<img src="/images/20170828/photo_20170828_03.png" class="img-middle-size" loading="lazy">

ログイン不要で利用できたり、DBの排他制御がなかったりと、あくまでサンプルという位置づけですね。


# uroboroSQLとSpring Boot連携

Spring Bootだと、通常はSpring Data JPAを利用することが多いかと思いますが、今回は uroboroSQLと連携させるので、application.ymlで定義した`DataSource`を、uroboroSQLのSqlConfigに渡してやる必要があります。

今回はSpring BootのControllerの親クラス(BaseController)にて、その実装をしてみました。

なお、RDBはH2 Database、コネクションプールは、Tomcat JDBC Connection Poolを利用しています。

**application.yml（抜粋）**

```yml
spring:
  datasource:
    url: jdbc:h2:file:./target/db/petclinic;AUTOCOMMIT=FALSE
    username: sa
    password:
    driver-class-name: org.h2.Driver
    name: jdbc/petclinic
```

**BaseController.java（抜粋）**

```java
public abstract class BaseController {
    private final DataSource dataSource;

    @Autowired
    public BaseController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * create <code>SqlAgent</code> instance.
     *
     * @return <code>SqlAgent</code>
     */
    SqlAgent createAgent() {
        try {
            SqlConfig config = DefaultSqlConfig.getConfig(dataSource.getConnection());

            config.getSqlFilterManager().addSqlFilter(new DebugSqlFilter());
            config.getSqlFilterManager().initialize();

            return config.createAgent();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    /* 以下略 */
}
```

本来は`DefaultSqlConfig#getConfig`に直接`DataSource`を渡したいところだったんですが、uroboroSQL v0.2ではそのインタフェースがなくて、`getConnection`することにしました。ちなみに、v0.3では`DataSource`を直接渡せるようにする予定です。

# 検索処理の実装

飼い主の検索画面(Find Owner)で、飼い主(Owner)の名字(LastName)で検索ボタンを押下したときに呼び出される実装は下記のようになります。

**OwnerController.java（抜粋）**

```java
@RestController
@CrossOrigin
@RequestMapping("/api/owners")
public class OwnerController extends BaseController {

    public OwnerController(DataSource dataSource) {
        super(dataSource);
    }

    @RequestMapping(method = RequestMethod.GET)
    public List<Map<String, Object>> find(@RequestParam(required = false) String lastName) throws SQLException {
        try (SqlAgent agent = createAgent()) {
            return agent.query("owners-find")
                .param("lastName", lastName)
                .collect(CaseFormat.CamelCase);
        }
    }
    /* 以下略 */
}
```

**owner-find.sql**

```sql
SELECT /* _SQL_ID_ */
  OWNERS.ID
, OWNERS.FIRST_NAME
, OWNERS.LAST_NAME
, OWNERS.ADDRESS
, OWNERS.CITY
, OWNERS.TELEPHONE
, GROUP_CONCAT(PETS.NAME)   AS  PETS_NAME
FROM
  OWNERS
LEFT OUTER JOIN
  PETS
ON
  OWNERS.ID = PETS.OWNER_ID
/*BEGIN*/
WHERE
/*IF SF.isNotEmpty(lastName) */
  LAST_NAME   LIKE  '%' ||  /*lastName*/''  ||  '%'
/*END*/
/*END*/
GROUP BY OWNERS.ID
ORDER BY OWNERS.ID
```

uroboroSQLはSQLを実装する方式のライブラリなので、ご覧の通りControllerの実装は非常に簡潔で、パラメータを渡して呼び出すのみの実装です。

実際にSQL出力する際は、uroboroSQLの2-way SQLの機能により、名字(lastName)が未入力ならWHERE句自体がなくなり、全件検索するSQLになります。

なお、実際に自分で実装してみて、`SQLException`の検査例外が邪魔に感じたので、uroboroSQL v0.3からは実行時例外にする予定です。
やはり自身で実装してみると気づきがあるものですね。

# 登録処理の実装

<img src="/images/20170828/photo_20170828_04.png" class="img-middle-size" loading="lazy">

次に飼い主の登録画面の実装を見てみます。

**OwnerController.java（抜粋）**

```java
@RestController
@CrossOrigin
@RequestMapping("/api/owners")
public class OwnerController extends BaseController {

    @RequestMapping(value = "/new", method = RequestMethod.POST)
    public Map<String, Object> create(@Validated @RequestBody Owner owner) throws SQLException {
        return handleCreate(owner);
    }

    /* 以下略 */

}
```

**BaseController.java（抜粋）**

```java
public abstract class BaseController {

    /**
     * get generate keys.
     *
     * @param agent SqlAgent
     * @return keys as {@literal Map<String, Object>}
     * @throws SQLException SQLException
     */
    private Map<String, Object> generatedKeys(SqlAgent agent) throws SQLException {
        return agent.queryWith("SELECT SCOPE_IDENTITY() AS ID")
            .collect(CaseFormat.CamelCase)
            .get(0);
    }

    Map<String, Object> handleCreate(BaseModel model) throws SQLException {
        try (SqlAgent agent = createAgent()) {
            return agent.required(() -> {
                agent.insert(model);
                return generatedKeys(agent);
            });
        }
    }
}
```

**Owner.java（抜粋）**

```java
@Table(name = "OWNERS")
public class Owner extends BaseModel {

    @NotEmpty
    @Size(max = 30)
    private String firstName;

    @NotEmpty
    @Size(max = 30)
    private String lastName;

    @NotEmpty
    @Size(max = 255)
    private String address;

    @NotEmpty
    @Size(max = 80)
    private String city;

    @NotEmpty
    @Digits(fraction = 0, integer = 10)
    private String telephone;

    /* 以下getter/setter */
}
```

実際に呼ばれるControllerのメソッドは親に委譲しているだけにシンプルですね。
Spring Bootによって、フロントエンドから渡されたJSONがOwnerというエンティティクラスに自動的にマッピングされて、かつ、BeanValidationが実行され、問題なければDB登録処理が呼び出されます。

uroboroSQLもv0.2より、JPAライクなORマッピング機能を追加したことにより、INSERT/UPDATEといった処理はSQL不要でシンプルに実装することができました。

# まとめ

というわけで、uroboroSQLとSpring BootのWebアプリケーションの実装を見てきましたが、いかがでしたしょうか？

私自身、Spring Framework自体はこれまでも使ってきたものの、Spring Bootは初体験でしたが、うまい具合にSpring Frameworkの面倒だったところを隠していることもあり、非常にスマートですね。

RestControllerにおける検索処理では、uroboroSQLの`SqlAgent#query`の結果をそのまま返すだけでも事足りるケースも多く、Spring Bootとの相性は良いと感じました。
uroboroSQL自体がシンプルな仕様なこともあり、初見でも簡単に実装できることがわかって頂けたのではないかと思います。

むしろ、Vue.jsでのフロントエンドの実装ボリュームのほうが圧倒的に多いですね。。。

uroboroSQLは現在v0.3に向けて、鋭意開発を進めており、まだまだ進化していきますので、是非使ってみてください！！

uroboroSQL PetClinicも認証機能など、エンタープライズ用途の参考になるような機能をまだまだ追加していきたいと思っていますので、こちらもよろしくお願いします。


## 番外編：SQLログ表示機能

<img src="/images/20170828/photo_20170828_05.png" class="img-middle-size" loading="lazy">

本家Spring Clinicには存在しない機能ですが、サーバサイドで実行されたuroboroSQLの出力するログを画面上で表示する機能を追加してみました。画面左下の目のアイコンをクリックするとログウィンドウが表示されます。

もちろん、実業務ではこのような機能はセキュリティホールになってしまいますが、これでどんな操作によってどんなSQLが実行されたのか、画面から見ることができますので、uroboroSQLのデモにも使えるかなと思っています。

そういうわけで、2017/9/9(土)、2017/9/10(日)に開催されるオープンソースカンファレンス2017 Tokyo/Fallにて、ブースでお見せしたいと思いますので、興味のある方は是非、当日フューチャーアーキテクト  ブースまで足を運んでください！！

- オープンソースカンファレンス2017 Tokyo/Fall - オープンソースの文化祭！
  - https://www.ospn.jp/osc2017-fall/


# 関連サイト

- uroboroSQL PetClinic
  - https://github.com/shout-star/uroborosql-springboot-demo
- uroboroSQL Github Repository
  - https://github.com/future-architect/uroborosql
- uroboroSQL Document
  - https://future-architect.github.io/uroborosql-doc/

## 参考
- Spring Boot
  - https://projects.spring.io/spring-boot/
- Spring PetClinic
  - https://github.com/spring-projects/spring-petclinic)

