---
title: "Sentence-Transformersを使ってみた！YouTube動画のセリフを手軽にセマンティック検索"
date: 2023/09/06 00:00:00
postid: a
tag:
  - ChatGPT
  - embedding
  - SentenceTransformers
  - AI
category:
  - DataScience
thumbnail: /images/2023/20230906a/thumbnail.jpg
author: 王紹宇
lede: "テキストの埋め込みエンコーダーを使ってセマンティック検索をおもちゃレベルで簡単に実装する方法を紹介します。分かりやすいように、YouTubeの動画のセリフをコーパスとして使用します。"
---
## はじめに

こんにちは。フューチャーTIG DXユニット所属の王です。

本記事は、[夏の自由研究ブログ連載2023](/articles/20230830a/)の4本目です。

今回はテキストの埋め込みエンコーダーを使ってセマンティック検索をおもちゃレベルで簡単に実装する方法を紹介します。分かりやすいように、YouTubeの動画のセリフをコーパスとして使用します。将来的に時間軸のメタ情報も利用したら、検索結果には動画の何分何秒に特定、遷移リンクの生成などもいろいろ面白いことができると思います。

## 目次

- セマンティック検索を注目するきっかけ
- セマンティック検索とは
- 原理
  - 埋め込みベクトル(Embedding Vector)
  - 埋め込みベクトルを使ったセマンティック検索
- 実装
  - 使ったライブラリ
  - Semantic Searchの実装
- まとめ

## セマンティック検索を注目するきっかけ

ChatGPTなどの生成AIが大ヒットしている現在、その応用場面は増加しており、自然言語で機械と会話し指示を与えたり情報を引いたりすることは今どきのトレンドになっています。しかし、生成AIを使用する際には、情報の最新性やファクトチェックの不足などの懸念点が存在します。これらの問題を低減するためには、なるべくコンテキストや背景情報など、比較的な高品質のインプットを提供し、生成式AIが得意な情報の抽出、変換、整形などのみ任せるのがうまい使い方でしょう。

生成AIに１回のクエリでインプットできる情報は限られていますので、事前に関係しそうな情報を粗く抽出するために、公開していないデータや特定のコーパスを使って、自然言語でクエリする際に、セマンティック検索が必要となります。

## セマンティック検索(Semantic Search)とは

最初に、セマンティック検索と典型的なレキシカル検索（語彙検索、字句検索、Lexical Search）を比較します。レキシカル検索は、テキスト内の文字列や単語の表面的な一致に焦点を当てます。特定の文字列や単語がテキスト内に存在するかどうかを確認し、その一致度に基づいて情報を選別します。そのため、同義語や関連語、コンテキストに対応することが難しく、意味的な関連性を欠いた検索結果になり、自然言語のクエリに対する弱点があります。

一方、セマンティック検索は、キーワードだけでなく、文脈や意味に基づいて情報を検索するアプローチです。関連性やコンテキストを考慮し、より高度な情報検索を実現でき、同義語や関連語、さらに部分的な誤字などにも対応できるため、自然言語のクエリに適しています。

## 原理

テキストの埋め込みによってセマンティック検索の原理を簡単に説明します。

### 埋め込みベクトル(Embedding Vector)

コンピュータの世界には、文字だけではなく、画像、音声、動画などすべてのデータは符号化(Encoding)での表現ができます。それと似た思想で、単語、文、段落などを表す「意味」や「関連性」を数値のベクトルの表現で符号化に変換することは「埋め込み」と言います。その変換の条件は、意味が近い原文の変換後の埋め込みベクトルも距離が近いことです。

そうすることによって、統一化された表現形式「埋め込みベクトル」で「意味」の近さが定量的に表現で切るようになります。もちろん、文に対してベクトルの埋め込みは、深層学習などの技術を使って大量な事前計算が必要ですが、自ら訓練しても良いですし、後述のSentence-Transformerを利用して、公開の事前訓練された公開のモデルを簡単に使用できます。

ところで、ここの「距離」の定義は、ベクトルのドット積、コサイン類似度、ユークリッド距離など多数の形式はできますが、予め選定したら良いです。計算の簡単さを考慮したら、ユークリッド距離よりドット積、コサイン類似度のほうがよく採用されるでしょう。そしてベクトルを正規化（長さ1に統一する）のテクニックを使ったら、みんな等価になります。

さらに、もとの情報は文字に限らず、画像や音声、マルチメディアの情報も埋め込みベクトルに変換して数値化にしたら、文字と画像の距離や画像と音声の距離なども測ることが可能になります。画像や音声の類似検索、タグや説明文との紐付けなどいろいろ応用場面が可能になります。

### 埋め込みベクトルを使ったセマンティック検索

余談ですが、RDF (Resource Description Framework) を使用したセマンティック検索もありましたが、高度な事前定義と複雑のアルゴリズムが必要で実装は難しいです。今回ご紹介している埋め込みベクトルの手法は、事前のモデルの訓練での大量な計算でカバーしています。ただし、そのモデルの計算は、車輪の発明のように、大手が1度作ったら、誰でも繰り返して利用できて、恩恵を受けられます。これまで以上にAIの民主化を進めていますね。

さて、埋め込みベクトルを使ったセマンティック検索の手順を簡単にまとめます。

1. 事前にデータベースやコーパスの情報を文や段落粒度を分割し、それぞれ高次元(数百から数千次元)のベクトルに埋め込みエンコーディング変換しておきます。
1. クエリ文も同様に埋め込みエンコーディングして、ベクトル化して、それと距離が近いものが検索の候補結果になります。
1. 計算した距離（近似度）がの検索のランキングになります。
1. （Optional）そして、検索の動作を高速化するために、事前のコーパスにベクトルによってインデックスをつけることができます。後述のSimple Neighborsはインデックスの構造と高速化検索をやってくれます。

## 実装

### 使ったライブラリ

以下の2つのライブラリを使って実装しています。どれもシンプルなインタフェースを持って使いやすいと思います。

#### Sentence-Transformers

https://sbert.net/

pipを使用して簡単にインストールできます。

```sh
pip install sentence-transformers
```

Sentence-Transformersは、テキストだけではなく、画像のembeddingも対応できますが、今回はテキストの検索にフォーカスしたいので割愛します。画像の検索の詳細は[このページ](https://sbert.net/examples/applications/image-search/README.html)をご参考ください。

Sentence-Transformersのフレームワークが[huggingface](https://huggingface.co/sentence-transformers)で多数のモデルが公開しています（執筆時点124個）。

モデルの命名について、`qa`がついているモデルは、(質問、回答) ペアのセットでトレーニングされて、セマンティック検索用です。つまり、クエリ/質問が与えられた場合、関連する文章を見つける用途です。そして、`multi`がついているモデルは、多言語対応のモデルです。違う言語のインプットであっても、意味が似たものなら埋め込みベクトルの距離が近いようにエンコーディングしてくれます。ちなみに、最初から多言語のデータを使わず、例えばまずは英語で訓練して、そのモデルを教師モデルとして利用し、更に多言語に拡張する手法もあるらしく、興味深いです。

#### Simple Neighbors

https://simpleneighbors.readthedocs.io/en/latest/

コーパスの項目に対して最近傍検索を実行するための簡単なインタフェースです。
`Annoy`、`Sklearn`、`BruteForcePurePython`の3つのバックエンドをサポートしていますが、`Annoy`が推奨していますので、それも一緒にインストールします。

```sh
pip install simpleneighbors annoy
```

高速に検索するため、事前にindexのツリーをビルドする必要があります。つまり、検索対象のデータを増加したら、改めてツイリーのビルドが必要という点に要注意です。

また、N-Neighborを探す結果は近似的な結果になることにもご注意ください。とはいえ、訓練のモデルから検索結果の精度はすべて有限であるので、近似と言っても十分な精度が保証できていると思います（参考: [Approximate Nearest Neighbors](https://en.wikipedia.org/wiki/Nearest_neighbor_search#Approximate_nearest_neighbor)）

### Semantic Searchの実装

今回はこのドキュメントを参考して、実装してみました。

https://www.sbert.net/examples/applications/semantic-search/README.html

まずは、[フューチャーの会社紹介ページ](https://www.youtube.com/watch?v=9tSEByUy47o&ab_channel=FUTURERecruiting%2F%E3%83%95%E3%83%A5%E3%83%BC%E3%83%81%E3%83%A3%E3%83%BC%E6%A0%AA%E5%BC%8F%E4%BC%9A%E7%A4%BE)のYouTube動画のセリフを`corpus/future.txt`ファイルに保存します。今回は手動で前処理として文と文の間に改行で区切りました。
（*※YouTubeから自動生成のセリフで誤字などが入っています。一旦無視します。
ただし、「フューチャー」が「Qちゃん」になっているのはみっともないので手修正を加えました。*）

```text
皆さん、こんにちは。
フューチャーのWebセミナーにアクセスいただき、ありがとうございます。
この動画ではフューチャーの会社概要とビジネスについてご紹介します。
早速、会社概要からご紹介します。
フューチャーは1989年にエンジニアが立ち上げたITコンサルティング企業です。
創業時から、ITでビジネスを牽引することをコンセプトに掲げ、いわゆるDXにあたることを推進してきました。
また、店頭公開時には日本で初めてITコンサルティング業として事業登録をされたのもフューチャーです。
日本初のITコンサルティング企業であり、DXを30年以上推進してきた会社と覚えていただければと思います。
業績も昨年は過去最高を更新するなど非常に順調です。
次に、私たちが大切にしている考え方、Our Philosophyをご紹介します。
「本質を見極める」、「大義を問う」、「初めてに挑戦する」、「難題を楽しむ」、「ないものはつくる」。
例えば、創業当社から他の会社がなかなか手がけないような案件であったり、難しい案件に積極的にチャレンジしてきましたので、初めてに挑戦する難題を楽しむであったり、エンジニアニメが作り上げた会社というところもあり、ないものは何でも自分たちで作ってしまおう、そういったカルチャーも深く浸透しています。
続いて、フューチャーのミッションを紹介します。
お客様の未来活用を最大化し、自らも新たな価値を創造する。
フューチャーグループには大きく2つの事業体があります。
1つは、ITコンサルティング&サービス事業です。
こちらはお客様向けの課題解決をしていく事業群で、フューチャーアーキテクトがコアカンパニーとして、ITコンサルティングを牽引しています。
もう一つはビジネスイノベーション事業です。
こちらはこれまでのノウハウを生かして、自社でサービスを立ち上げようというもので、まさにお客様の未来活用を最大化するITコンサルティングと、自分たちでも新たな価値を創造していく両軸で事業を展開しています。
ここからはフューチャーのビジネスについてご紹介します。
フューチャーのお客様は、様々な業界そしてそれぞれの業界を代表するような企業様です。
私たちは、私たちの強みであるITを用いて、それぞれのお客様の経営課題を解決したり、あるいはお客様と一緒に業界改革をIP戦略パートナーとしてになっています。
私たちのビジネスの特徴をご紹介します。
創業当初から、お客様の経営戦略、それを達成するための業務改革、そしてそれを支えているシステム改革。
これらを三位一体で捉えてプロジェクトを推進してきました。
昨今、DXと盛んに叫ばれるようになりましたが、私たちフューチャーは経営と業務、そしてその裏にあるシステムは切っても切り離せないものだと創業当初から考えて、それらを三位一体で捉えて推進するということを30年以上続けてきました。
さらに詳細にビジネスの流れや他社との違いについてご紹介します。
プロジェクトはどんな未来を描くのか、戦略を立て、計画に落として、その計画に則ってシステム的に具現化し、出来上がったシステムが価値を創造するという流れが一般的です。
プロジェクトの推進体制で見てみると、一般的には得意な領域ごとに会社が複数社にまたがって行っているケースが多いです。
例えば、未来を描くところはコンサル系の企業様が行って、具現化していくところはSIer系の企業様が行ってといった形です。
あるいは、一つの会社であるけれど、コンサルタントとエンジニアのように職種が分かれているケースも多いかなと思います。
では、フューチャーはどうかと言いますと、フィーチャーは図の通り、戦略からシステム構築運用まで一気通貫でになっています。
また、職種もITコンサルタント職一触者です。
戦略を立てるコンサルタントとしての部分と、システムを構築していくエンジニアとしての部分、どちらも一人一人のITコンサルタントが担っています。
ソースコードレベルで相手を理解しているITコンサルタントが担うからこそ、絵に描いた餅で終わるというのではなくて、しっかりと価値を想像するところまで伴走できる。
そしてそれを30年以上続けてきたというのはなかなか他の会社には簡単に真似できないフューチャーならではの強みになっています。
また、皆さんのキャリアというのを考えてみていただいても、コンサルタントとエンジニア、どちらも一つの会社で経験できるというのはキャリアの幅が広がり、市場価値の高い人材に成長できると思っていただけると思います。
最後に、フューチャーのことをもっと知りたい方に各種メディアをご紹介します。
フューチャーのオウンドメディア未来報では、フューチャーの人に焦点を当ててキャリアやカルチャーをご紹介しています。
フューチャーが大切にしている技術についてもっと深く知りたい方は、テックブログやテックキャストがおすすめです。
最後までご覧いただき、ありがとうございます。
皆さんと選考でお会いできることを楽しみにしております。
```

今回は[このページ](https://www.sbert.net/docs/pretrained_models.html)に紹介したモデルの中に、multi言語対応のモデルをピックアップし、予めメタデータとして用意します。モデル名`name`、ベクトルの次元`dims`、距離関数`metric`の属性を定義します。方便上、名前でモデルを引く関数`find_model_with_name`も定義します。

```python
models = [
    {
        # Multi-lingual model of Universal Sentence Encoder for 15 languages:
        # Arabic, Chinese, Dutch, English, French, German, Italian, Korean, Polish, Portuguese, Russian, Spanish, Turkish.
        "name": "distiluse-base-multilingual-cased-v1",
        "dims": 512,
        "metric": "angular",
    },
    {
        # Multi-lingual model of Universal Sentence Encoder for 50 languages.
        "name": "distiluse-base-multilingual-cased-v2",
        "dims": 512,
        "metric": "angular",
    },
    {
        # Multi-lingual model of paraphrase-multilingual-MiniLM-L12-v2, extended to 50+ languages.
        "name": "paraphrase-multilingual-MiniLM-L12-v2",
        "dims": 384,
        "metric": "angular",
    },
    {
        # Multi-lingual model of paraphrase-mpnet-base-v2, extended to 50+ languages.
        "name": "paraphrase-multilingual-mpnet-base-v2",
        "dims": 768,
        "metric": "angular",
    },
    {
        # This model was tuned for semantic search:
        # Given a query/question, if can find relevant passages.
        # It was trained on a large and diverse set of (question, answer) pairs.
        # 215M (question, answer) pairs from diverse sources.
        "name": "multi-qa-mpnet-base-dot-v1",
        "dims": 768,
        "metric": "dot"
    },
    {
        # This model was tuned for semantic search:
        # Given a query/question, if can find relevant passages.
        # It was trained on a large and diverse set of (question, answer) pairs.
        # 215M (question, answer) pairs from diverse sources.
        "name": "multi-qa-mpnet-base-cos-v1",
        "dims": 768,
        "metric": "angular"
    },
]

def find_model_with_name(models, name):
    for model in models:
        if model["name"] == name:
            return model
    raise NameError(f"Could not find model {name}.")
```

以下はSemanticSearchクラスでシンプルにベーシックな機能（モデルを読み込み、corpusの読み込み、エンコードして文をベクトル化すし、vector tree indexのビルド、そして、N個の最近傍探索）を実装します。

```python
from sentence_transformers import SentenceTransformer, util
from simpleneighbors import SimpleNeighbors


class SemanticSearch:
    def __init__(self, model):
        self.encoder = SentenceTransformer(model["name"])
        self.index = SimpleNeighbors(model["dims"], model["metric"])
        if model["metric"] == "angular":
            self.metric_func = util.cos_sim
        elif model["metric"] == "dot":
            self.metric_func = util.dot_score

    def load_corpus(self, filename):
        with open(f"corpus/{filename}") as f:
            self.feed(f.read().split("\n"))

    def feed(self, sentences):
        for sentence in sentences:
            vector = self.encoder.encode(sentence)
            self.index.add_one(sentence, vector)
        self.index.build()

    def find_nearest(self, query, n=5):
        vector = self.encoder.encode(query)
        nearests = self.index.nearest(vector, n)
        res = []
        for neighbor in nearests:
            dist = self.metric_func(vector, self.index.vec(neighbor))
            res.append((neighbor, float(dist)))
        return res
```

早速、クエリを投げてみます。

```python
if __name__ == "__main__":
    model = find_model_with_name(
        models, "distiluse-base-multilingual-cased-v2")
    ss = SemanticSearch(model)
    ss.load_corpus("future.txt")

    res = ss.find_nearest("フューチャーはいつ創立されましたか。")
    for r in res:
        print(r)
```

**出力結果1**

```text
('フューチャーは1989年にエンジニアが立ち上げたITコンサルティング企業です。', 0.2547425627708435)
('では、フューチャーはどうかと言いますと、フィーチャーは図の通り、戦略からシステム構築運用まで一気通貫でになっています。', 0.19687587022781372)
('創業時から、ITでビジネスを牽引することをコンセプトに掲げ、いわゆるDXにあたることを推進してきました。', 0.1668681502342224)
('フューチャーグループには大きく2つの事業体があります。', 0.164341002702713)
('昨今、DXと盛んに叫ばれるようになりましたが、私たちフューチャーは経営と業務、そしてその裏にあるシステムは切っても切り離せないものだと創業当初から考えて、それらを三位一体で捉えて推進するということを30年以上続けてきました。', 0.16331210732460022)
```

文章に「創立」などのキーワードが登場していないですけど、1個目近似度高い文（時間に関して述べているからかもしれません）がうまくヒットしています。

今度は他のモデルでやってみます。
モデル：`paraphrase-multilingual-MiniLM-L12-v2`
クエリ：`フューチャーはいつ創立されましたか。`
**出力結果2**

```text
('昨今、DXと盛んに叫ばれるようになりましたが、私たちフューチャーは経営と業務、そしてその裏にあるシステムは切っても切り離せないものだと創業当初から考えて、それらを三位一体で捉えて推進するということを30年以上続けてきました。', 0.45087340474128723)
('日本初のITコンサルティング企業であり、DXを30年以上推進してきた会社と覚えていただければと思います。', 0.3921096622943878)
('フューチャーは1989年にエンジニアが立ち上げたITコンサルティング企業です。', 0.36329418420791626)
('創業当初から、お客様の経営戦略、それを達成するための業務改革、そしてそれを支えているシステム改革。', 0.3592120409011841)
('創業時から、ITでビジネスを牽引することをコンセプトに掲げ、いわゆるDXにあたることを推進してきました。', 0.35177189111709595)
```

結果が変わりましたが、「昨今」や「創業」や「30年」が含まれた文はトップになっています。まあまあ許容できる結果でしょう。

他の質問とモデルでもやってみます。

モデル：`paraphrase-multilingual-MiniLM-L12-v2`
クエリ：`未来報はなんですか。`

**出力結果3**

```text
('フューチャーのオウンドメディア未来報では、フューチャーの人に焦点を当ててキャリアやカルチャーをご紹介しています。', 0.5177506804466248)
('最後に、フューチャーのことをもっと知りたい方に各種メディアをご紹介します。', 0.44624844193458557)
('プロジェクトはどんな未来を描くのか、戦略を立て、計画に落として、その計画に則ってシステム的に具現化し、出来上がったシステムが価値を創造するという流れが一般的です。', 0.4249690771102905)
('例えば、未来を描くところはコンサル系の企業様が行って、具現化していくところはSIer系の企業様が行ってといった形です。', 0.40904152393341064)
('次に、私たちが大切にしている考え方、Our', 0.40697067975997925)
```

モデル：`multi-qa-mpnet-base-dot-v1`
クエリ：`長所はなに`

**出力結果4**

（*※このモデルは、他のコサイン類似度とは違ってドット積で距離を評価しているので、1以上の距離結果がありうる*）

```text
('そしてそれを30年以上続けてきたというのはなかなか他の会社には簡単に真似できないフューチャーならではの強みになっています。', 18.705921173095703)
('さらに詳細にビジネスの流れや他社との違いについてご紹介します。', 18.43102264404297)
('皆さん、こんにちは。', 16.867801666259766)
('業績も昨年は過去最高を更新するなど非常に順調です。', 16.38519287109375)
('お客様の未来活用を最大化し、自らも新たな価値を創造する。', 15.685336112976074)
```

今度は、英語のコーパスを利用して、日本語で質問してみます。
HuggingFace出品の「Text embeddings & semantic search」を紹介する[このビデオ](https://www.youtube.com/watch?v=OATCgQtNX2o&ab_channel=HuggingFace)のセリフを引っ張ってきます。`corpus/semantic_search.txt`に保存します。

```text
Text embeddings and semantic search.
In this video we’ll explore how Transformer models represent text as embedding vectors and how these vectors can be used to find similar documents in a corpus.
Text embeddings are just a fancy way of saying that we can represent text as an array of numbers called a vector.
To create these embeddings we usually use an encoder-based model like BERT.
In this example, you can see how we feed three sentences to the encoder and get three vectors as the output.
Reading the text, we can see that walking the dog seems to be most similar to walking the cat, but let's see if we can quantify this.
The trick to do the comparison is to compute a similarity metric between each pair of embedding vectors.
These vectors usually live in a high-dimensional space, so a similarity metric can be anything that measures some sort of distance between vectors.
One popular metric is cosine similarity, which uses the angle between two vectors to measure how close they are.
In this example, our embedding vectors live in 3D and we can see that the orange and grey vectors are close to each other and have a smaller angle.
Now one problem we have to deal with is that Transformer models like BERT will actually return one embedding vector per token.
For example in the sentence "I took my dog for a walk", we can expect several embedding vectors, one for each word.
For example, here we can see the output of our model has produced 9 embedding vectors per sentence, and each vector has 384 dimensions.
But what we really want is a single embedding vector for the whole sentence.
To deal with this, we can use a technique called pooling.
The simplest pooling method is to just take the token embedding of the CLS token.
Alternatively, we can average the token embeddings which is called mean pooling.
With mean pooling only thing we need to make sure is that we don't include the padding tokens in the average, which is why you can see the attention mask being used here.
This now gives us one 384 dimensional vector per sentence which is exactly what we want.
And once we have our sentence embeddings, we can compute the cosine similarity for each pair of vectors.
In this example we use the function from scikit-learn and you can see that the sentence "I took my dog for a walk" has an overlap of 0.83 with "I took my cat for a walk". Hooray.
We can take this idea one step further by comparing the similarity between a question and a corpus of documents.
For example, suppose we embed every post in the Hugging Face forums.
We can then ask a question, embed it, and check which forum posts are most similar.
This process is often called semantic search, because it allows us to compare queries with context.
To create a semantic search engine is quite simple in Datasets.
First we need to embed all the documents.
In this example, we take a small sample from the SQUAD dataset and apply the same embedding logic as before.
This gives us a new column called "embeddings" that stores the embedding of every passage.
Once we have our embeddings, we need a way to find nearest neighbours to a query.
Datasets provides a special object called a FAISS index that allows you to quickly compare embedding vectors.
So we add the FAISS index, embed a question and voila. we've now found the 3 most similar articles which might store the answer.
```

同じように、それをロードして、日本語のクエリで投げてみます。

```python
if __name__ == "__main__":
    model = find_model_with_name(
        models, "paraphrase-multilingual-MiniLM-L12-v2")
    ss = SemanticSearch(model)
    ss.load_corpus("semantic_search.txt")

    res = ss.find_nearest("埋め込みベクトルでのエンコーディングについて、どんなモデルを使えますか")
    for r in res:
        print(r)
```

**出力結果5**

それなりにいい感じにヒットできていますね。

```text
('To create these embeddings we usually use an encoder-based model like BERT.', 0.6005619764328003)
('In this video we’ll explore how Transformer models represent text as embedding vectors and how these vectors can be used to find similar documents in a corpus.', 0.5864262580871582)
('For example, here we can see the output of our model has produced 9 embedding vectors per sentence, and each vector has 384 dimensions.', 0.5198760032653809)
('In this example, we take a small sample from the SQUAD dataset and apply the same embedding logic as before.', 0.4749892055988312)
('In this example, our embedding vectors live in 3D and we can see that the orange and grey vectors are close to each other and have a smaller angle.', 0.46906405687332153)
```

モデル：`distiluse-base-multilingual-cased-v1`
クエリ：`セマンティック検索には、どんなテクニックが使えるか`

**出力結果6**

```text
('Text embeddings and semantic search.', 0.3169878125190735)
('To create a semantic search engine is quite simple in Datasets.', 0.22516131401062012)
('To deal with this, we can use a technique called pooling.', 0.19742435216903687)
('This process is often called semantic search, because it allows us to compare queries with context.', 0.1717163324356079)
('Once we have our embeddings, we need a way to find nearest neighbours to a query.', 0.1544724851846695)
```

## まとめ

本記事では、セマンティック検索の概念や原理を簡単に説明しました。そして埋め込みベクトルの実装をシンプルに実現してデモしました。言語問わずにクエリを投げて、そこそこの精度の検索ランキングの結果が得ました。

AIの民主化が発展している現在、いろいろの技術のハードルが下がってきて、中小企業や一般の人々にも簡単に利用・導入可能になり、そのオポテュニティーをうまく掴める組織と人間こそ未来の勝者になるでしょう。

では、ようこそ〜　Futureへ！

<img src="/images/2023/20230906a/Future_Search_Semantic_HighTech.jpg" alt="Future_Search_Semantic_HighTech.jpg" width="768" height="768" loading="lazy">
*Image Generated by leonardo.ai*
