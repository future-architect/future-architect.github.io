---
title: "cuDNN の CUDA API の紹介"
date: 2022/04/13 00:00:00
postid: a
tag:
  - GPGPU
  - DeepLearning
category:
  - DataScience
thumbnail: /images/2022/20220413a/thumbnail.png
author: 松崎功也
lede: "NVIDIA 社が提供するディープラーニング用の GPGPU ライブラリ「cuDNN」の CUDA API を紹介したいと思います。cuDNN は TensorFlow や Keras で学習や推論を高速化するためのバックエンドとしてよく使われていますが、CUDA API を直接たたいたことがある方は少ないのではないでしょうか？個人的に作成したアプリケーションで CUDA API を叩く機会があり、社内の技術勉強会で紹介したところ好評だったため、こちらにも寄稿することにしました。"
---
# はじめに

こんにちは、2021年新卒入社の SAIG 松崎功也です。Tech Blog 初投稿です。

NVIDIA 社が提供するディープラーニング用の GPGPU ライブラリ「cuDNN」の CUDA API を紹介します。

cuDNN は TensorFlow や Keras で学習や推論を高速化するためのバックエンドとしてよく使われていますが、CUDA API を直接たたいたことがある方は少ないのではないでしょうか？

個人的に作成したアプリケーションで CUDA API を叩く機会があり、社内の技術勉強会で紹介したところ好評だったため、こちらにも寄稿します。

<img src="/images/2022/20220413a/ファイル名.png" alt="システム概念図" width="1200" height="591" loading="lazy">

# cuDNN を叩くことになったきっかけ

私はレトロゲームを遊ぶことが多いのですが、解像度が低いため 4K ディスプレイだと拡大した際に非常に粗が目立ってしまいます。これをなんとかしたかったのがきっかけです。
最終的には以下の手法で解決することにしました。

1. Windows API でゲームウィンドウをキャプチャ
1. [waifu2x]("https://github.com/nagadomi/waifu2x") という CNN の超解像モデルでキレイに拡大
1. ウィンドウをもう一枚作り、拡大後の画像を表示

この一連のフローをリアルタイムで行います。Python でもできないことはないのですが、今回はパフォーマンスチューニングのしやすさを考慮して CUDA を選択しました。

この記事では、1., 3. の部分の説明は行いません。3. において使用した cuDNN API にのみ焦点を当てて紹介します。

# cuDNN で畳込みを行う流れ

流れは以下の通りです。

次の章で、1項目ずつコードと一緒に紹介していきます。なお、コードは正確に書くと量が多くなりすぎるためある程度端折って掲載しています。そのため、単純にコピー&ペーストしてつなげても動きませんのでご了承ください。

1. cuDNN ライブラリの初期化
1. モデルのフィルタの重みをRAM（ホスト）に読み込む
1. RAM（ホスト）に読み込んだフィルタの重みを VRAM へ転送する
1. フィルタ記述子（フィルターのサイズなどを定義）の準備
1. バイアス記述子の準備
1. 畳込み記述子（パディング、ストライドなどを定義）の準備
1. 活性化関数の記述子（ReLU, Swish などの係数を含めて定義）の準備
1. 畳込みの内部アルゴリズムを設定する
1. 拡大したい画像データをRAM（ホスト）→ VRAM へ転送
1. 畳込みを行う

## 1. cuDNN ライブラリの初期化

ライブラリの初期化は以下のように行います。

```c++ cuDNN の初期化
// ハンドルを表す変数を用意
cudnnHandle_t cudnn_handle = nullptr;
// ハンドルのポインタを渡してハンドルを受け取る
cudnnCreate(&cudnn_handle);
```

## 2. モデルのフィルタの重みをRAM（ホスト）に読み込む

今回は JSON 形式で保存されているモデルのフィルタの重みを、[picojson]("https://github.com/kazuho/picojson") で読込みました。

<img src="/images/2022/20220413a/0cda6e32-95a9-385b-22fb-726db27156b6.png" alt="モデルをRAMに読み込む概念図" width="1089" height="523" loading="lazy">

```c++ 重みの読込み
// picojson で kernels に JSON ファイルを読込んでおく　

for (int i = 0; i < layer.nOutputPlane_; i++) {
    auto& kernel = kernels[i].get<picojson::array>();
    for (int j = 0; j < layer.nInputPlane_; j++) {
        auto& mat = kernel[j].get<picojson::array>();
        for (int k = 0; k < layer.kH_; k++) {
            auto& row = mat[k].get<picojson::array>();
            for (int l = 0; l < layer.kW_; l++) {
                layer.host_weight_[
                    i * (layer.nInputPlane_ * layer.kH_ * layer.kW_)
                        + j * (layer.kH_ * layer.kW_)
                        + k * layer.kW_
                        + l
                ] = row[l].get<double>();
            }
        }
    }
}
```

## 3. RAM（ホスト）に読み込んだフィルタの重みを VRAM へ転送する

VRAM のメモリを確保して、読み込んだモデルのフィルタを VRAM へ転送します。
メモリ管理はスマートポインタで行っているので、それに合わせたラッパーを自作し使用しています（cuda_memory_allocate）。
<img src="/images/2022/20220413a/ファイル名_2.png" alt="VRAMへ転送する" width="1200" height="454" loading="lazy">

```c++ VRAM へ重みを転送する
// VRAM のメモリを確保
layer.device_weight_ptr_ = cuda_memory_allocate(sizeof(float) * layer.host_weight_.size());

// RAM（ホスト）のデータを VRAM へ転送する。転送の方向は引数の最後で指定する。
cudaMemcpy(layer.device_weight_ptr_.get(), layer.host_weight_.data(),
           sizeof(float) * layer.host_weight_.size(), cudaMemcpyKind::cudaMemcpyHostToDevice);
```

```c++ cuda_memory_allocate（自作のメモリ確保ラッパー）
// 解放処理
struct cuda_device_memory_delete {
    void operator()(void* ptr) const {
        cudaFree(ptr);
    }
};

// C++11 のスマートポインタを使ってみる
using device_unique_ptr = std::unique_ptr<void, cuda_device_memory_delete>;

device_unique_ptr cuda_memory_allocate(size_t n) {
    void* ptr = nullptr;
    cudaMalloc(&ptr, n);

    return device_unique_ptr(ptr);
}
```

## 4. フィルタ記述子（フィルターのサイズなどを定義）の準備

フィルタ記述子では、フィルタの枚数やサイズなどを設定します。
<img src="/images/2022/20220413a/ファイル名_3.png" alt="フィルタ記述子" width="1200" height="577" loading="lazy">

```c++ フィルタ記述子の準備
// 生のフィルタ記述子を作成
cudnnFilterDescriptor_t temp_filter_desc;
cudnnCreateFilterDescriptor(&temp_filter_desc);

// スマートポインタに移管
filter_desc_.reset(temp_filter_desc);

// 2番目以降の引数は、「データ型」、「データの配置順番」、「出力枚数」、「入力枚数」、「フィルターのサイズ」
cudnnSetFilter4dDescriptor(filter_desc_.get(), CUDNN_DATA_FLOAT, CUDNN_TENSOR_NCHW, nOutputPlane_, nInputPlane_, kH_, kW_);
```

## 5. バイアス記述子の準備

畳込み処理後に加算するバイアスの準備を行います。バイアスは1次元ベクトルなので、テンソルの記述子を流用します。

<img src="/images/2022/20220413a/バイアス.png" alt="バイアス" width="1200" height="409" loading="lazy">

```c++ バイアス記述子の準備
// 生のテンソル記述子の準備
cudnnTensorDescriptor_t temp_bias_desc;
(cudnnCreateTensorDescriptor(&temp_bias_desc);

// スマートポインタに移管
bias_desc_.reset(temp_bias_desc);

// 1次元ベクトルとして、バイアスを設定する
cudnnSetTensor4dDescriptor(bias_desc_.get(), CUDNN_TENSOR_NCHW, CUDNN_DATA_FLOAT, 1, nOutputPlane, 1, 1);
```

## 6. 畳込み記述子（パディング、ストライドなどを定義）の準備

畳込み記述子では、フィルタの動かし方（パディング、ストライド、ディレーションなど）を設定します。

```c++ 畳込み記述子の準備
// 生の畳込み記述子を作成
cudnnConvolutionDescriptor_t temp_conv_desc;
(cudnnCreateConvolutionDescriptor(&temp_conv_desc);

// スマートポインタに移管
conv_desc_.reset(temp_conv_desc);

// 2番目以降の引数は、「パディング」、「ストライド」、「ディレーション」、「畳込みのタイプ」、「データ型」
cudnnSetConvolution2dDescriptor(conv_desc_.get(), padH, padW, dH, dW, 1, 1, cudnnConvolutionMode_t::CUDNN_CONVOLUTION, cudnnDataType_t::CUDNN_DATA_FLOAT);
```

## 7. 活性化関数の記述子の準備

cuDNN ではデフォルトで ReLU や Swish などの活性化関数が準備されています（[提供されている活性化関数の一覧]("https://docs.nvidia.com/deeplearning/cudnn/api/index.html#cudnnActivationMode_t")）。

ただ、waifu2x で使用されている leakyReLU は cuDNN では提供されていないため、自前で準備する必要があります。

そのため、活性化関数には IDENTITY（何もしない恒等関数）を指定し、CUDA で leakyReLU を実装しました。

<img src="/images/2022/20220413a/ファイル名_4.png" alt="活性化関数の記述子" width="1200" height="679" loading="lazy">

```c++ 活性化関数の記述子の準備
// 生の活性化関数の記述子を作成
cudnnActivationDescriptor_t temp_activation_desc;
cudnnCreateActivationDescriptor(&temp_activation_desc);

//スマートポインタに移管
activation_desc_.reset(temp_activation_desc);

// 2番目以降の引数は、「活性化関数」、「NaN を伝播させるかどうか」、「活性化関数の係数」（無い場合は適当な数値を入れておけばOK）
cudnnSetActivationDescriptor(activation_desc_.get(), cudnnActivationMode_t::CUDNN_ACTIVATION_IDENTITY,, cudnnNanPropagation_t::CUDNN_PROPAGATE_NAN, 0.0);
```

```c++ leakyReLU.cu
__global__ void leakyRelu_(float* vec, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n)
        vec[i] = 0.1f * fminf(vec[i], 0.f) + fmaxf(vec[i], 0.f);
}
```

## 8. 畳込みの内部アルゴリズムを設定する

cuDNN では畳込みの内部アルゴリズムがいくつか用意されていて、それぞれメモリ使用量や計算速度にトレードオフがあります（[提供されている内部アルゴリズムの一覧]("https://docs.nvidia.com/deeplearning/cudnn/api/index.html#cudnnConvolutionFwdAlgo_t")）。

これまで設定してきたフィルタ記述子や畳込み記述子の情報を使用して、cuDNN に自動で選択させることもできます。

ただ、同じ記述子を使用した場合でも、実行のたびに自動選択されるアルゴリズムが異なることがありました。そのため、使用するメモリ使用量や処理時間に再現性が欲しい場合は自分で指定するのが吉です。

```c++ 畳込みの内部アルゴリズムの設定
// 内部アルゴリズムを自動で設定する場合
cudnnFindConvolutionForwardAlgorithm(handle, src, filter_desc_.get(), conv_desc_.get(), dst, 1, &nAlgos, &forward_algo_);

// 内部アルゴリズムを手動で設定する場合
forward_algo_.algo = cudnnConvolutionFwdAlgo_t::CUDNN_CONVOLUTION_FWD_ALGO_IMPLICIT_PRECOMP_GEMM;

// 内部アルゴリズムの作業領域のサイズを計算する
cudnnGetConvolutionForwardWorkspaceSize(handle, src, filter_desc_.get(), conv_desc_.get(), dst, forward_algo_.algo, &workspace_size);
```

## 9. 拡大したい画像データをRAM（ホスト）→ VRAM へ転送

あともう一息です。

拡大したい画像データを VRAM へ転送します。

```c++ 画像の転送
// VRAM を確保
auto image0 = cuda_memory_allocate(image_size);

// image_float にはウィンドウをキャプチャしたデータが入っている
cudaMemcpy(image0.get(), image_float.data(), sizeof(float) * image_float.size(), cudaMemcpyKind::cudaMemcpyHostToDevice);
```

## 10. 畳込みを行う

最後にここまで設定してきた記述子を元に、VRAM へコピーした画像データに畳込み処理を行います。
関数名から分かるように、畳込み、バイアスの加算、活性化関数の適用を一気に行います。

```c++ 畳込みを行う
cudnnConvolutionBiasActivationForward(
        handle,
        &one, src, src_data,
        filter_desc_.get(), device_weight_ptr_.get(),
        conv_desc_.get(), forward_algo_.algo,
        workspace, workspace_size,
        &zero, dst, dst_data,
        bias_desc_.get(), device_bias_ptr_.get(),
        activation_desc_.get(),
        dst, dst_data
        );
```

# さいごに

cuDNN の CUDA API による畳込みの流れを紹介しました。

普段なかなか見ることのないバックエンド側の API でしたが、興味を持ってもらえるきっかけになればうれしいです。
