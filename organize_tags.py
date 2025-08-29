import os
import re
from ruamel.yaml import YAML

# Hexoプロジェクトの投稿フォルダを指定
POSTS_DIRECTORY = 'source/_posts'
TARGET_CATEGORY = 'DB'
TARGET_TAG = 'DB'

def organize_tags_in_file(file_path):
    """
    指定されたMarkdownファイルのfront matterを解析し、
    カテゴリとタグの重複を整理する。
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # front matter部分を抽出する正規表現
        # --- で囲まれた部分を探す
        match = re.search(r'^---\s*([\s\S]*?)\s*---', content)
        if not match:
            return False

        front_matter_str = match.group(1)

        # YAMLパーサーを初期化
        yaml = YAML()
        data = yaml.load(front_matter_str)

        # categoryとtagsが存在するか確認
        categories = data.get('category', [])
        tags = data.get('tag', []) # Hexoではtagとtagsの両方が使われる可能性がある

        # tagsがNoneの場合を考慮
        if tags is None:
            tags = []

        # categoriesがリストでない場合（単一指定の場合）はリストに変換
        if not isinstance(categories, list):
            categories = [categories]
        if not isinstance(tags, list):
            tags = [tags]

        # --- 整理ロジック ---
        # 1. ターゲットカテゴリがcategoriesに含まれているか確認
        # 2. ターゲットタグがtagsに含まれているか確認
        if TARGET_CATEGORY in categories and TARGET_TAG in tags:

            # tagsからターゲットタグを削除
            tags.remove(TARGET_TAG)

            # 変更後のtagsをセット
            data['tag'] = tags

            # 新しいfront matterを文字列に変換
            from io import StringIO
            string_stream = StringIO()
            yaml.dump(data, string_stream)
            new_front_matter_str = string_stream.getvalue()

            # 元のファイル内容を新しいfront matterで置換
            new_content = content.replace(front_matter_str, new_front_matter_str, 1)

            # ファイルを上書き保存
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

            print(f"✅ 更新しました: {file_path} (タグ '{TARGET_TAG}' を削除)")
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

    print(f"カテゴリとタグの重複整理を開始します (対象カテゴリ/タグ: '{TARGET_CATEGORY}')...")
    updated_files_count = 0

    # 必要なライブラリをインストール
    try:
        import ruamel.yaml
    except ImportError:
        print("必要なライブラリ 'ruamel.yaml' をインストールします...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "ruamel.yaml"])

    for root, _, files in os.walk(POSTS_DIRECTORY):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                if organize_tags_in_file(file_path):
                    updated_files_count += 1

    if updated_files_count == 0:
        print("\n置換対象のファイルは見つかりませんでした。")
    else:
        print(f"\n完了しました。合計 {updated_files_count} 個のファイルを更新しました。")

if __name__ == '__main__':
    main()
