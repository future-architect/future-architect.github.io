---
title: "Transformerの文章生成の仕組みを理解する"
date: 2025/02/26 00:00:00
postid: a
tag:
  - AI
  - LLM
  - Transformer
  - 論文紹介
category:
  - DataScience
thumbnail: /images/2025/20250226a/thumbnail.jpg
author: 森友雅
lede: "Transformerを知っていて、その理解を深めたい人、大規模言語モデル  がどのようにして推論しているのかを知りたい人向けに..."
mathjax: true
---
# 本記事の前提

## 読んでほしい人

- [Transformer](https://arxiv.org/abs/1706.03762)を知っていて、その理解を深めたい人
- 大規模言語モデル (LLM: Large Language Model) がどのようにして推論しているのかを知りたい人

## 触れている内容

- ユーザが質問をして、Transformerが回答を生成するまでの一連(end-to-end)の処理
- Transformerの仕組みについて広く浅く

## 触れていない内容

- 学習時に行われる処理（MaskやDropoutなど）
- Pythonなどのプログラミング言語を用いたTransformerの実装方法

# 最初に「構成図」で理解する

まずは元論文「Attention Is All You Need」から引用したTransformerの構成図を図1に示します。

<img src="/images/2025/20250226a/new_ModalNet-21.jpg" alt="" width="759" height="1105" loading="lazy">

図 1．元論文から引用したTransformerの構成図

とても簡潔ですが、図からは理解できない内容が多々あるかと思います。そのため、少しだけ具体化した構成図を図2に示します。できるだけ見やすく作りたかったのですが、どうしても複雑になる箇所があるため、拡大して見ていただければと思います。図2の補足ですが、EmbeddingやLinear、Layer Normalization、Softmaxは行方向（＝各Tokenのベクトル方向）に対して行われる処理であることに注意してください。

<img src="/images/2025/20250226a/Screenshot_2025-02-26_101047.png" alt="" width="1105" height="459" loading="lazy">

図 2．私が作った、元論文の構成図を具体化させたTransformerの構成図

# 次に「処理フロー」で理解する

前章で示した構成図だけでは説明が不十分であるため、次は処理フローの側面から理解を深めていただこうと思います。図2と照らし合わせながら読み進めていただくと理解しやすい気がします。

※以下の処理フローの「3-1-2～4」や「6-3-2～4」で出てくるQ,K,VはそれぞれQuery,Key,Valueのことです。図3に図2の構成図内のどれがQ,K,Vなのかを示します。

<img src="/images/2025/20250226a/76fa3ac9-6b02-48c1-a1a2-8dd97951d03e.png" alt="" width="558" height="592" loading="lazy">

図 3．図2のQ,K,Vの対応

```txt
1.質問を入力

2.エンコードのための前処理
　├ 1.Tokenizerで質問をTokenに変換(Tokenization)
　├ 2.変換したTokenの潜在表現を抽出(Input Embedding)
　└ 3.時系列情報を付与(Positional Encoding)

3.質問をエンコード
　├ 1.「2の結果」を用い、質問に含まれる単語間の関連度を算出(Multi-Head Attention)
　| 　├ 1.ヘッド数分、各Tokenのベクトル方向に次元を分割
　| 　├ 2.Q,K,Vの3つに複製し、それぞれ線形変換(Linear)
　| 　├ 3.「Q」と「転置したK」で行列積をとり(MatMul)、確率に変換(Softmax)
　| 　├ 4.「3-1-3の結果」と「V」で行列積をとり(MatMul)、Tokenに重みづけをする
　|　 └ 5.分割した行列を結合し、線形変換(Linear)
　├ 2.「2の結果」と「3-1の結果」の和を取り（Residual Connection）、各Tokenのベクトル方向に正規化(Layer Normalization)
　├ 3.各Tokenに対し、ベクトル間の潜在表現を抽出する(Feed Forward)
　| 　├ 1.線形変換で次元を拡張(Linear)
　| 　├ 2.非線形変換(ReLU)
　| 　└ 3.線形変換で次元を元に戻す(Linear)
　├ 4.「3-2の結果」と「3-3の結果」の和を取り（Residual Connection）、各Tokenのベクトル方向に正規化(Layer Normalization)
　└ 5.「3-1」~「3-4」の処理をN回分ループ

4.生成中の文章を入力（最初は生成の開始を表す文字(BOS: Beginning of Sequence)を入力）

5.デコードのための前処理（「2-1」~「2-3」と同じ）

6.回答をデコード（生成）
　├ 1.「5の結果」を用い、生成中の回答に含まれる単語間の関連度を算出(Multi-Head Attention)（「3-1-1」~「3-1-5」と同じ）
　├ 2.「5の結果」と「6-1の結果」の和を取り（Residual Connection）、各Tokenのベクトル方向に正規化(Layer Normalization)
　├ 3.「6-2の結果」と「3の結果」を用い、質問と生成中の回答の対応関係を算出(Multi-Head Attention)
　| 　├ 1.「3」の出力と「6-2」の出力に対し、ヘッド数分、各Tokenのベクトル方向に次元を分割
　| 　├ 2.「6-2の出力」をQとし、「3の出力」をK,Vとしてそれぞれ線形変換(Linear)
　| 　├ 3.「Q」と「転置したK」で行列積をとり(MatMul)、確率に変換(Softmax)
　| 　├ 4.「6-3-3の結果」と「V」で行列積をとり(MatMul)、Tokenに重みづけをする
　| 　└ 5.分割した行列を結合し、線形変換(Linear)
　├ 4.「6-2の結果」と「6-3の結果」の和を取り（Residual Connection）、各Tokenのベクトル方向に正規化(Layer Normalization)
　├ 5.各Tokenに対し、ベクトル間の潜在表現を抽出する(Feed Forward)（「3-3」と同じ）
　├ 6.「6-4の結果」と「6-5の結果」の和を取り（Residual Connection）、各Tokenのベクトル方向に正規化(Layer Normalization)
　├ 7.「6-1」~「6-6」の処理をN回分ループ
　├ 8.各Tokenのベクトル方向の次元を表現可能な単語数に増加させ(Linear)、確率に変換(Softmax)
　└ 9.生成中の最交尾のTokenに対し、最も確率の高いTokenを次に生成する単語とする

7.生成の終了を表す文字（EOS: End of Sequence）が生成されるか、生成Token数が上限になるまで「4」~「6」を繰り返す。
```

# 最後に「各処理の深掘り」で理解する

これまで「構成図」と「処理フロー」で見てきましたが各段階の処理を深ぼる説明がありませんでした。そのため、最後にTransformerで利用されている処理を軽く解説します。本章で触れるのは以下の処理です。

- トークナイザ(Tokenizer)
- 潜在表現(Latent Representation)
  - 埋め込み(Embedding)
  - 線形/全結合(Linear/Fully Connected)
- 位置符号化(Positional Encoding)
- 注意機構(Attention)
  - マルチヘッド注意機構(Multi-Head Attention)
  - スケール化内積注意機構(Scaled Dot-Product Attention)
    - 自己注意(Self-Attention)
    - 相互注意(Cross-Attention)
- 正規化(Normalization)
  - レイヤー正規化(LN:Layer Normalization)
- 活性化関数(Activation Function)
  - ReLU:Rectified Linear Unit
- 出力関数(Output Function)
  - Softmax

## [トークナイザ(Tokenizer)](https://paperswithcode.com/methods/category/tokenizers)

Transformerは入力された文章（自然言語）のまま扱うことができません。

代わりに「Token」というものを扱います。Tokenとは文章を「Subword」に分割したものを指します。例えば「`日本の首都は？`」が入力された場合、「`[日本, の, 首都, は, ？]`」のように単語単位(Subword)に分割し、「`[1234, 654, 58295, 219, 179]`」のように 各自然言語に対応する ID に変換します。

この処理を行うものが「Tokenizer」であり、「[Word Piece](https://arxiv.org/abs/1609.08144v2)」や「[BPE: Byte Pair Encoding](https://arxiv.org/abs/1508.07909)」が有名です。「[Learn about language model tokenization](https://platform.openai.com/tokenizer)」ではGPT4やGPT4oのTokenizerのデモができます。

このサイトのTokenizerはBPEベースの「[Tiktoken](https://github.com/openai/tiktoken)」というモデルを利用しています。

## [埋め込み(Embedding)](https://pytorch.org/docs/stable/generated/torch.nn.Embedding.html)

Tokenizerで得たTokenの潜在表現を抽出します。例えば「`[1234, 654, 58295, 219, 179]`」のようなTokenを「`[[1.0, 0.2, ..., 0.3], [0.4, 0.2, ..., 1.0], [0.2, 0.2, ..., 0.1], [0.5, 0.3, ..., 0.7], [0.9, 0.2, ..., 0.1]]`」のように、各Tokenの値をD次元に拡張します。そうすることで、類似した意味を持つTokenを同じ方向や、同じ大きさのベクトルとして表現することができます。

Embeddingは事前に学習された重みを利用することもあります。

## [線形/全結合(Linear/Fully Connected)](https://pytorch.org/docs/stable/generated/torch.nn.Linear.html)

学習可能なパラメータを利用して入力した潜在表現を変換します。学習可能なパラメータの数は調整することができ、この調整次第で変換後の次元数を増減させることができます。

## 位置符号化(Positional Encoding)

Embeddingで得られた潜在表現には 時系列情報がありません。これは「`[日本, の, 首都, は, ？]`」と「`[の, 首都, ？, 日本, は]`」が同じ文章と言っているようなものです。そのため、時系列の意味合いを持つ値を各潜在表現に加算することで時系列情報を付与します。

Embeddingで得られた潜在表現に悪影響を及ぼさない大きさで、相対的な変化を持たせやすい値を加算する必要があります。元論文では以下の式で算出される値を加算しています。sinとcosの1波長は2πであるため、「pos = 2π\*10000」が一意の位置情報を付与できるToken数の上限であることがわかります。

$$
PositionalEncoding = \left\\{
\begin{array}{ll}
sin(pos/10000^{i/D})　(i=0,even) \\\\
cos(pos/10000^{i/D})　(i=odd)
\end{array}
\right.
$$

## [マルチヘッド注意機構(Multi-Head Attention)](https://paperswithcode.com/method/multi-head-attention)

次で説明する「Scaled Dot-Product Attention」をN個に分割して処理するための機構です。

Embeddingで各TokenをD次元に拡張しますが、分割がない場合、1点の尺度でToken間の関連度を求めることになります。Multi-Head Attentionを導入し、D次元をN個に分割して並列で処理させることで、N点の尺度でToken間の関連度を求めることができるようになります。

これがMulti-Head Attentionの強みです。各ヘッドの次元数は「D/ヘッド数」です。

<img src="/images/2025/20250226a/multi-head-attention_l1A3G7a.png" alt="" width="576" height="746" loading="lazy">

図 4．元論文から引用したMulti-Head Attentionの構成図

## [スケール化内積注意機構(Scaled Dot-Product Attention)](https://paperswithcode.com/method/scaled)

トークン間の類似度を内積で求めます。はじめに、QとKで行列積をとり、Dの平方根で除算します。Dの平方根を除算している理由はQとKの行列積の値を標準化するためです。

行列積の値はDの値が大きくなるほど最大値が大きくなります。それだと学習が進まなくなるため、Dの平方根を除算して学習の安定化をしています。次に、除算した行列とVで行列積をとり、後で説明するSoftmax関数に通すことでトークン間の類似度が確率分布で求まります。

<img src="/images/2025/20250226a/35184258-10f5-4cd0-8de3-bd9bc8f88dc3.png" alt="" width="684" height="732" loading="lazy">

図 5．元論文から引用したScaled-Dot Product Attentionの構成図

$$
\begin{align}
Scaled Dot Product Attention = Softmax(\frac{QK^T}{\sqrt{D}})V
\end{align}
$$

Transformerでは「自己注意(Self-Attention)」と「相互注意(Cross-Attention)」が登場します。Self-AttentionとはEncoderとDecoderで登場し、「Q」と「K」と「V」に同じ行列を与える方法です。Cross-AttentionとはDecoderでのみ登場する「Q」と「KとV」で異なる行列を与える方法です。

## [レイヤー正規化(LN:Layer Normalization)](https://paperswithcode.com/method/layer-normalization)

各Tokenのベクトル方向に正規化行う手法です。正規化手法には他にもBatch NormalizationやInstance Normalizationなどありますが、入力長が可変のTransformerではInstance Normalizationが有効です。

## [ReLU:Rectified Linear Unit](https://paperswithcode.com/method/relu)

非線形変換を行う関数です。0以下の入力を0にするだけのシンプルな関数です。ReLUの傾きは0か1なので、層を増やしても勾配を消失させにくい特性があります。（最近は活性化関数として使われることが少なくなりましたが、[Sigmoid](https://paperswithcode.com/method/sigmoid-activation)関数は傾きの範囲が0~0.25で、層が増えると勾配が0になってしまう「勾配消失問題」が発生します。）

## [Softmax](https://paperswithcode.com/method/softmax)

行列の和が1.0(100%)になるように確率分布に変換します。Transformerではvocab size分の単語が生成対象として存在しています。eで計算している理由は、出力がマイナスにならないことや微分してもeのままであること、値の強調（＝非線形な変化）が可能なことがあります。

$$
\text{Softmax}(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{vocab size} e^{x_j}}
$$

# おわりに

Transformerの仕組みを「構成図」「処理フロー」「各処理の深掘り」で解説してきました。今回は推論の処理の理解を深めることができましたが、学習時の理解はまだできておりません。今後は学習時の理解も深め、続編を出したいなと思っています。少しでも皆様のTransformerの理解を深めることへの手助けになれば幸いです。
