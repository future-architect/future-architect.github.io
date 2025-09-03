---
title: "Future Tech Night #17 embeddingを用いた分析・検索・推薦の技術"
date: 2022/06/13 00:00:00
postid: a
tag:
  - TensorFlow
  - NLP
  - embedding
  - 機械学習
  - TechNight
  - 登壇レポート
category:
  - DataScience
thumbnail: /images/2022/20220613a/thumbnail.png
author: 金子剛士
lede: "Future Tech Night #17「embeddingの活用」と「MLOps」のAI勉強会を開催し、「embeddingを用いた分析・検索・推薦の技術」というタイトルで発表しました。当日の勉強会の様子は[YouTubeで公開しており..."
---
<img src="/images/2022/20220613a/top.png" alt="" width="600" height="263">

# はじめに

こんにちは。Strategic AI Group所属の金子剛士です。

2021年11月26日に[Future Tech Night #17「embeddingの活用」と「MLOps」のAI勉強会](https://future.connpass.com/event/231310/)を開催し、「embeddingを用いた分析・検索・推薦の技術」というタイトルで発表しました。

当日の勉強会の様子は[YouTubeで公開しており](https://www.youtube.com/watch?v=6_C-GnwIz3U)、発表スライドも公開しています。

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/c424fa8e8ec24dab980b0f3ba0905502" title="embeddingを用いた分析・検索・推薦の技術" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 560px; height: 314px;" data-ratio="1.78343949044586"></iframe>

# 発表の概要

深層学習のモデルは画像や自然言語に対して高い精度の予測を行うことが可能ですが、その処理の過程で様々な意味を含んだベクトル(=embedding)を作ります。これを活用することで、どのデータとどのデータが意味的に似ているかを計算し分析できるようになります。

本発表の前半では学習済みの自然言語モデルを用いて技術ブログの文章をembeddingに変換し、類似記事の検索や記事のクラスタリングを行いました。embeddingを活用することで、過去の類似記事やタグを効率的に探すことができ、かつ意味的にクラスタリングすることで記事の傾向について考察できました。これと同様の分析は画像やログデータのデータベースにも適用可能で、人の手で付与したラベルやカテゴリを越えた多くの気づきを与えてくれます。

本発表の後半ではgensimや対照学習によるembeddingを作成するモデルの学習方法や、embeddingを高速に検索するための近似近傍探索といった最先端のトピックを紹介しました。ログデータからのembeddingを学習・分析は[医薬品副作用データベースから医薬品同士の関係を学習・評価・可視化する](https://future-architect.github.io/articles/20210901a/)の記事で紹介したこともありますが、例えidだけでもログデータを用いて適切に学習すればそれだけで意味のあるembeddingを学習でき、かつ深層学習モデルをスクラッチで組めばデータのカテゴリ情報や画像・言語情報も考慮したうえでデータ同士の関係性を分析できます。また、[Vertex Matching Engine](https://cloud.google.com/blog/ja/products/ai-machine-learning/vertex-matching-engine-blazing-fast-and-massively-scalable-nearest-neighbor-search)にも採用されている、コサイン類似度に適した近似近傍探索手法のScaNNについても紹介・実験を行いパフォーマンスを比較しました。

# まとめ

普段自身で研究していたembedding関連の技術の一部をTechNightの場を借りて発表させていただきました。多くの方から反応をいただき嬉しかったです。また、参加者の方とのdiscussionでよりembeddingに関連した技術の幅を広げられました。感謝しております。

深層学習を通じて得られるembeddingには多種多様な可能性があり、非常にホットな分野です。
今後も動向を追いつつ、社会実装を行っていきたいと思います。
