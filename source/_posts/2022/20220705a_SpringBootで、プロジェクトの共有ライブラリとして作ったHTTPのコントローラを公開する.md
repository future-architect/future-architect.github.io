---
title: "SpringBootで、プロジェクトの共有ライブラリとして作ったHTTPのコントローラを公開する"
date: 2022/07/05 00:00:00
postid: a
tag:
  - SpringBoot
  - Java
category:
  - Programming
thumbnail: /images/20220705a/thumbnail.png
author: 澁川喜規
lede: "アプリケーション開発のチームと、共有ライブラリチームに分かれているが、共有ライブラリ側でアプリ側にHTTPのエンドポイントを追加したい場合があると思います。例えば、特別なヘルスチェックのエンドポイントを足したいとか。SpringBootのデモアプリとして作成したもの（Spring Starter ProjectでSpring Webだけ足したもの）をベースにやり方をまとめていきます。"
---

<img src="/images/20220705a/springboot.png" alt="" width="800" height="251">

アプリケーション開発のチームと、共有ライブラリチームに分かれているが、共有ライブラリ側でアプリ側にHTTPのエンドポイントを追加したい場合があると思います。例えば、特別なヘルスチェックのエンドポイントを足したいとか。

SpringBootのデモアプリとして作成したもの（Spring Starter ProjectでSpring Webだけ足したもの）をベースにやり方をまとめていきます。

# SpringBootのコンポーネントスキャンの仕組み

SpringBootは、アプリケーションの骨格となるクラス（``@SpringBootApplication``アノテーションがついている）と同じパッケージかその配下にあるクラスであれば、``@RestController``をつければ即座にHTTPのエンドポイントになってくれます。

こういうパッケージ構成だったとします。

```
 ├─jp.co.future.app        // アプリケーション
 │ ├─MyApplication.java
 │ └─MyController.java
 └─jp.co.future.common     // 共有ライブラリ
   └─HealthController.java
```

自動で作られるアプリケーションのクラスはこんな感じですね。

```java /src/main/java/jp/co/future/app/MyApplication.java
package jp.co.future.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MyApplication {
	public static void main(String[] args) {
		SpringApplication.run(MyApplication .class, args);
	}
}
```

この場合、以下のように同一パッケージ配下に置いたクラスは自動で登録されます。

```java /src/main/java/jp/co/future/app/MyController.java
package jp.co.future.app;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
public class MyController {
    @RequestMapping("/hello")
    public String index() {
        return "Hello Spring Boot!";
    }
}
```

次のような、アプリケーションとは別のパッケージ配下のクラスで作ったヘルスチェック用のエンドポイントはそのままでは登録されないので、``/health``にアクセスするとエラー画面が出ます。

```java /src/main/java/jp/co/future/common/HealthController.java
package jp.co.future.app;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
public class HealthController{
    @RequestMapping("/health")
    public String health() {
        return "OK";
    }
}
```

SpringBootはデフォルトではアプリケーションと同一のパッケージかその下しかコンポーネントを探しに行かないので、スキャン先を教えてあげます。登録は``@ComponentScan``アノテーションを使うか、``@SpringBootApplication``にパラメータを渡すか、どちらかの方法でできます。

```java /src/main/java/jp/co/future/app/MyApplication.java
import org.springframework.context.annotation.ComponentScan;

@ComponentScan({ "jp.co.future.app", "jp.co.future.common" })
@SpringBootApplication
public class DemoApplication {
}
```

```java /src/main/java/jp/co/future/app/MyApplication.java
@SpringBootApplication(scanBasePackages = { "jp.co.future.app", "jp.co.future.common" })
public class DemoApplication {
}
```

これで使えるようになります、というところまでは調べれば出てくることではありますが、別の方式も試してみました。

# コンポーネントスキャンを設定しないで、共有ライブラリを利用する

コンポーネントスキャンを設定しないでHTTPのエンドポイントに登録してもらうには、``@RestController``アノテーションだけはアプリ側において、ライブラリは中の実装だけに集中するという2段階に分ける方法が使えます。

```
 ├─jp.co.future.app        // アプリケーション
 │ ├─MyApplication.java
 │ ├─MyController.java
 │ └─HealthController.java     // new
 └─jp.co.future.common     // 共有ライブラリ
   └─HelperBaseController.java // new
```

共有ライブラリの方は、先ほどの実装から``@RestController``を抜くだけです。

```java /src/main/java/jp/co/future/common/HealthBaseController.java
package jp.co.future.common;

import org.springframework.web.bind.annotation.RequestMapping;

public class HealthBaseController{
    @RequestMapping("/health")
    public String health() {
        return "OK";
    }
}
```

アプリ側の方は中身が空の``@RestController``だけがついているクラスを置いてあげればOKです。

```java /src/main/java/jp/co/future/app/HealthController.java
package jp.co.future.app;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import jp.co.future.common.HealthBaseController;

@RestController
@RequestMapping("/")
public class HealthController extends HealthBaseController {}
```

これでいけます。

この方式を使うメリットは、どこのURLでこの機能を提供するかをアプリ側で変更したりもしやすかったりします。今回のヘルスチェックの例だとメリットは感じにくいですが、ログ出力とか認証チェックとか前後の共通処理を行うコントローラを1つ作って、アプリケーション側は中のロジックだけに集中するようにしてあげるとか、そういう用途とかも考えられますね。

# まとめ

SpringBootのコンポーネントスキャン周りの仕組みを学びつつ、それを使わない方式とかも手元で試してみて動いたのでメモがてら書いてみました。前半の内容だけならググると出てくるのですが、後半の内容は見つからなかったのでブログにしてみました。

コンポーネントスキャンとかのこの手の「設定してね」は、個人的に、直感的でない作業感があるし、見落としがちだし、見落とした場合のデバッグが面倒というのもあり、そこまで好きではないです。宣言的なAPIとかはもてはやされたりもしますが、その宣言忘れの場合に何かチェックしてくれたり警告を出してくれるようなものがあれば良いのですが、だいたい存在しなかったりしますよね。``@RequestMapping("/エンドポイント")``はまだ、ブラウザにアクセスするときのURLがキーとなっているので、設定間違いを確認しやすいのでいいなと思うのですが、コンポーネントスキャンとかそういうのはなかなかたどり着くのが難しい。

宣言的APIはコードの短さゆえにいろいろなところで使われていますが、個人的にはバランスをとって使いたいなと思っているところです。

