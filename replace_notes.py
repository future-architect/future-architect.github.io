import os
import re

# Hexoプロジェクトの投稿フォルダを指定
# このスクリプトをHexoのルートディレクトリに置いて実行する場合、このままでOKです。
POSTS_DIRECTORY = 'source/_posts'

def replace_note_blocks(file_path):
    """
    指定されたファイル内の古いHTML noteブロックを新しい ::: note 記法に置換する。
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 置換対象のHTMLパターンを定義する正規表現
        # <div class="note info" ...><span ...>コンテンツ</div> を探す
        # (info|warn)でクラス名をキャプチャし、([\s\S]*?)で内部のコンテンツをキャプチャする
        regex = re.compile(
            r'<div class="note (info|warn)" style="[^"]*">'  # classがinfoかwarnのdivタグ
            r'<span class="fa fa-fw fa-check-circle"></span>'  # 直後のアイコンspanタグ
            r'([\s\S]*?)'                                     # 内部のコンテンツ（複数行対応）
            r'</div>',                                        # 閉じタグ
            re.IGNORECASE
        )

        # 置換後の文字列を生成する関数
        def replacer(match):
            class_name = match.group(1)  # 'info' or 'warn'
            inner_content = match.group(2).strip() # 内部のコンテンツ

            # 新しい ::: note 記法を組み立てる
            return f"::: note {class_name}\n{inner_content}\n:::"

        # re.subを使って、見つかったすべてのブロックを置換
        new_content, num_replacements = regex.subn(replacer, content)

        # 置換が行われた場合のみファイルを上書き
        if num_replacements > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✅ 更新しました: {file_path} ({num_replacements}箇所置換)")
            return True

    except Exception as e:
        print(f"❌ エラーが発生しました: {file_path} - {e}")

    return False

def main():
    """
    指定されたディレクトリ内のすべてのMarkdownファイルを処理する。
    """
    if not os.path.isdir(POSTS_DIRECTORY):
        print(f"エラー: '{POSTS_DIRECTORY}' が見つかりません。")
        print("このスクリプトはHexoプロジェクトのルートディレクトリで実行してください。")
        return

    print("古いHTML noteブロックの置換を開始します...")
    updated_files_count = 0

    for root, _, files in os.walk(POSTS_DIRECTORY):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                if replace_note_blocks(file_path):
                    updated_files_count += 1

    if updated_files_count == 0:
        print("\n置換対象のファイルは見つかりませんでした。")
    else:
        print(f"\n完了しました。合計 {updated_files_count} 個のファイルを更新しました。")

if __name__ == '__main__':
    main()
