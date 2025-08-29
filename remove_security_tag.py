import os
import re
from ruamel.yaml import YAML

# --- 設定 ---
POSTS_DIRECTORY = 'source/_posts'
TARGET_TAG_TO_REMOVE = 'Security'
# --- 設定ここまで ---

def remove_tag_in_file(file_path):
    """ファイルのfront matterを解析し、特定のタグを削除する。"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        match = re.search(r'^---\s*([\s\S]*?)\s*---', content)
        if not match: return False

        front_matter_str = match.group(1)

        yaml = YAML()
        yaml.indent(mapping=2, sequence=4, offset=2) # 正しいインデントを設定
        data = yaml.load(front_matter_str)

        tags = []
        if 'tag' in data: tags = data.get('tag', [])
        elif 'tags' in data: tags = data.get('tags', [])

        if tags is None: tags = []
        if not isinstance(tags, list): tags = [tags]

        if TARGET_TAG_TO_REMOVE in tags:
            tags.remove(TARGET_TAG_TO_REMOVE)
            if 'tags' in data: del data['tags']
            data['tag'] = tags

            from io import StringIO
            string_stream = StringIO()
            yaml.dump(data, string_stream)
            new_front_matter_str = string_stream.getvalue()

            new_content = content.replace(front_matter_str, new_front_matter_str, 1)

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

            print(f"✅ 更新 (Securityタグ削除): {file_path}")
            return True
    except Exception as e:
        print(f"❌ エラー: {file_path} - {e}")
    return False

def main():
    """メイン処理"""
    if not os.path.isdir(POSTS_DIRECTORY):
        print(f"エラー: '{POSTS_DIRECTORY}' が見つかりません。")
        return

    print(f"タグ '{TARGET_TAG_TO_REMOVE}' の削除を開始します...")
    count = sum(1 for root, _, files in os.walk(POSTS_DIRECTORY) for file in files if file.endswith('.md') and remove_tag_in_file(os.path.join(root, file)))

    print(f"\n完了しました。合計 {count} 個のファイルを更新しました。")

if __name__ == '__main__':
    main()
