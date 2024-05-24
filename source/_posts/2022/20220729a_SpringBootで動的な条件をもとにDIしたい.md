---
title: "SpringBootで動的な条件をもとにDIしたい"
date: 2022/07/29 00:00:00
postid: a
tag:
  - SpringBoot
  - DI
  - Java
category:
  - Programming
thumbnail: /images/20220729a/thumbnail.png
author: 澁川喜規
lede: "SpringBootのDependency Injection（DI）は便利ですよね？利用する側にコンストラクタインジェクションやら、フィールドインジェクションやらセッターインジェクションやらの形式で書いておくと、DIコンテナが勝手に実行時に対象となるクラスをもってきてインスタンスの生成をしてくれますし、インスタンスのライフサイクルをインジェクションされるクラス側に書けます。実行時にDIしてくれるとはいっても..."
---
SpringBootのDependency Injection（DI）は便利ですよね？利用する側にコンストラクタインジェクションやら、フィールドインジェクションやらセッターインジェクションやらの形式で書いておくと、DIコンテナが勝手に実行時に対象となるクラスをもってきてインスタンスの生成をしてくれますし、インスタンスのライフサイクルをインジェクションされるクラス側に書けます。

```java
@Component
public class UseDI {
    private final MyService myService;

    @Autowired
    public UseDI(MyService myService) {
        this.myService = myService;
    }
}

@Service
public class MyService {
    public MyService() {
        System.out.println("DIコンテナがnewしてくれたよ");
    }
}
```

実行時にDIしてくれるとはいっても、コンストラクタのパラメータとかクラスのフィールドはコンパイル前にソースコードにハードコードされてしまいます。本当に実行時に決まるような値をもとに動的に生成するクラスを変えたいという要件があったのでやり方を調べてみました。SpringBoot上だったので、汎用的な仕組みではなくてSpringBootの仕組みに乗っかるようにしています。

動的というのは、例えば、リクエストしてくるユーザーのランクを見て、VIPユーザー用ロジックを選択したい、みたいなストラテジーパターンです。ユーザーのランクの種類は動的に増えたりするのでハードコードしたくない、みたいな感じの要件だとします。

<img src="/images/20220729a/名称未設定ファイル.drawio.png" alt="名称未設定ファイル.drawio.png" width="460" height="191" loading="lazy">


# まずはロジックの登録機構

やはりDIするにはアノテーションですよね。 ``@UserRank``アノテーションを作ります。1つだけ引数を持つ単一値アノテーションとします。で、アノテーションの合成を使って、`@Component`もつけています。これは、このアノテーションをつけたら、即座にDI対象（別途`@Service`やら`@Component`やら`@Bean`をつける必要はない）とするためのものです。

```java src/main/java/com/example/annotations/UserRank.java
package com.example.annotations;


import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.stereotype.Component;


@Retention(RetentionPolicy.RUNTIME)
@Target({
    ElementType.TYPE,
})
@Component // ここに並べると合成となって、UserRankアノテーションをつけたものにComponentをつけたのと同じ効果も付与される
public @interface UserRank{
    String value();
}
```

``String value()``のところが引数で、``value``という名前であれば、``@UserRank("VIP")``と書けますが、仮に``type``だと、``@UserRank(type="VIP")``とする必要があります。また、複数個パラメータをつけることも可能です。VIPになった勤続回数でも選択したいが、特別な場合以外は省略したい場合、``int streak() default 0;``みたいに``default``をつけると省略可能になります。

これで、ロジック側に動的にフィルタリングするためのアノテーションが作れました。

実際にはアノテーションを使わないでも、特定インタフェースを実装しているものとか、クラス名でなどの条件でコンポーネントは探せるのですが、やはりアノテーションのほうがアスペクト指向っぽい感じで、ロジックの中身と探索ルールを切り離して表現できるのでアノテーションにしています。

# 動的に選択したいサービスクラスを実装する。

まずは実装につけるインタフェースを作っておきます。

```java src/main/java/com/example/UserService.java
package com.example;

public interface UserService {
    abstract public String execute();
}
```

実装を2つ作ります。

```java src/main/java/com/example/services/VIPService.java
package com.example.services;

import com.example.annotations.UserRank;
import com.example.UserService;

/**
 * VIP用ロジック
 */
@UserRank("VIP")
public class VIPService implements UserService {
	@Override
    public String execute() {
        System.out.println("VIP用ロジック");
        return "VIP";
    }
}
```


```java src/main/java/com/example/services/GenericUserService.java
package com.example.services;

import com.example.annotations.UserRank;
import com.example.UserService;
import org.springframework.stereotype.Service;

/**
 * 一般用ロジック
 */
@Service
@UserRank("一般")
public class GeneralUserService implements UserService {
    public String execute() {
        System.out.println("一般人用ロジック");
        return "一般人";
    }
}
```

# コンポーネントをスキャンしてコンポーネントのマップを作る

ちょっと長いですが、コンポーネントのマップを作るクラスが以下の通りです。

``ClassPathScanningCandidateComponentProvider``クラスを使うと特定のパッケージ以下のクラス群を取得できます。取得時には名前とかいろいろフィルタが設定できるのですが、ここでは``UserRank``というアノテーションがついているクラスを全取得しています。一度スキャンしたらその結果使いまわしたいので``static``な``Map``に入れています。

```java src/main/java/com/example/UserServiceFactory.java
package com.example;

import java.util.HashMap;
import java.util.Map;

import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import com.example.annoatations.UserRank;

/**
 * ユーザーランクごとのサービスのマップをキャッシュし、必要に応じてインスタンスを作成する。
 *
 */
@Service
public class UserServiceFactory {
	/**
	 * コンポーネントスキャンするパッケージ。デフォルト値は与えているが、設定したい場合はmainでこれを呼ぶこと。
	 */
	static String[] scanTargets = {"com.example"};

	/*
	 * コンポーネントをスキャンするパッケージを設定
	 */
	static public void setScanTarget(String[] packages) {
		scanTargets = packages;
	}

	/**
	 * プログラム中に含まれるすべてのサービスを集めたもの
	 * 初期の取得時に初期化を行う
	 */
	static Map<String, Class<?>> services = null;

	/**
	 * サービスのMapを作成する
	 */
	static synchronized void initServiceMap() {
		services = new HashMap<>();

		var provider = new ClassPathScanningCandidateComponentProvider(false);
		provider.addIncludeFilter(new AnnotationTypeFilter(UserService.class));
		for (var scanTarget : scanTargets) {
			var beanSet = provider.findCandidateComponents(scanTarget);
			for (var def : beanSet) {
				try {
					Class<?> clazz = Class.forName(def.getBeanClassName());
					var annotation = (UserRank)clazz.getAnnotation(UserRank.class);
					services.put(annotation.value(), clazz);
				} catch (ClassNotFoundException e) {
					// 取得した名前でクラスをその場で取り出しているだけなのでClass.forNameがこの例外を投げることはない見込み
				}
			}
		}
	}
}
```

# インスタンス作成機構の追加

インスタンス作成はSpringBootの提供するDIコンテナの機構を使います。そうすれば、サービスクラスが何かしらの外部依存を持っていてもそれのDIも一緒に行えます。

DIのファクトリーは`BeanFactory`を使うのですが、これ自身はDIでインジェクションしてもらえばOKです。クラスの定義は前のコードで取得できていますので、あとは名前をもとにクラスをもってきて、``beanFactory.getBean()``を呼んでインスタンス化するだけです。


```java src/main/java/com/example/UserServiceFactory .java
import org.springframework.beans.factory.BeanFactory;

public class UserServiceFactory {
	// インスタンス生成に使うファクトリー
	@Autowired
	private BeanFactory beanFactory;

	/**
	 * ランクをもとにサービスを取得する
	 *
	 * @param rank ランク
	 */
	public UserService findService(String rank) {
		if (services == null) {
			initServiceMap(); //
		}
		var clazz = services.get(rank);
		if (clazz == null) {
			return null;
		}

		return (UserService) beanFactory.getBean(clazz);
	}
}
```

# 使ってみる

それではコントローラに組み込んでみます。

```java src/main/java/com/example/MyController.java
package com.example;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.CookieValue;

@RestController
class MyController {
    private final UserServiceFactory factory;

    @Autowired
    public MyController(UserServiceFactory factory) {
        this.factory= factory;
    }

    @PostMapping("/do")
    public String doService(@CookieValue("rank") String rank) {
        var service = factory.findService(rank); // 名前でインスタンスを取得
        if (service == null) {
            return "不正なランク";
        }
        return service.execute();                // ランクごとのロジック実行
    }
```

はい。これで動的にインスタンスをとってきて実行するより動的なDIコンテナが実装できました。

# もっと簡単な実装もあるよ

[@ryushi](https://twitter.com/ryushi)さんに[教えてもらった記事](https://www.baeldung.com/spring-dynamic-autowire)ではもっと簡単なやり方が書いてありました。

SpringBootのDIコンテナに自身に、コンポーネントに文字列で名前をつけて、その文字列を使ってインスタンス化を行う機構があります。

```java
@Service("GBregionService")
public class GBRegionService implements RegionService {
}
```

このようにDIのためのアノテーションに文字列をつけてあげて、`getBean()`にその名前を渡すと絞り込みを行ってくれるというものです（ちょっとサンプルを短くなるように改変しています）。

```java
@Service
public class BeanFactoryDynamicAutowireService {
    private static final String SERVICE_NAME_SUFFIX = "regionService";
    private final BeanFactory beanFactory;

    @Autowired
    public BeanFactoryDynamicAutowireService(BeanFactory beanFactory) {
        this.beanFactory = beanFactory;
    }

    public boolean isServerActive(String isoCountryCode, int serverId) {
        RegionService service = beanFactory.getBean(isoCountryCode + SERVICE_NAME_SUFFIX,
          RegionService.class);

        return service.isServerActive(serverId);
    }
}
```

最初の実装も今回はサンプルのためにだいぶシンプル化していますが、要件としてはDI対象を探すロジックは本当はもうちょっと複雑で、マッチしなかったときのフォールバックとかもやろうと思っていたので、このシンプルな実装とは別の`ClassPathScanningCandidateComponentProvider`でとってきたクラスリストをMapに入れて、いろいろな検索が行えるような実装にしました。
シンプルな機構で特殊な検索条件を実現するためには、アノテーションに入れるリテラルの名前のルールを作り、それを実装者が守る必要がありますが、たんなる文字列リテラルで複雑なルールを作ってもコンパイル時のチェックとかも効かないので不親切かなという点がネックでした。独自アノテーション作成時に`@AliasFor`で親のアノテーションに値を渡すときにパラメータの加工とか合成とかいろいろコードが書ければ実現できそうでしたが、そういうのはできなそうでしたので。

# まとめ

独立性の高いロジックをどかどか追加して、それを動的な条件をもとに選択して実行する、みたいなときに使える機構を作ってみました。

アノテーション単独での実装方法は調べるとすぐ出てきたのですが、その情報をもとにクラス一覧を取得してくるコード、またそのアノテーションの引数をもとにマップを作って、動的に選択してインスタンスを作るところなど、つなぎ合わせのサンプルは出てこなかったので、いろいろ調べながら書いてみました。

このようなロジックを実装したライブラリとかあるかもしれませんが、Javaのメタプログラミング的なところをいろいろ知れて楽しかったです。

