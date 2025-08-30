import os

# --- 設定 ---
POSTS_DIRECTORY = 'source/_posts'
# 上記リストから、実際に移行したいタグをここに列挙します
TARGET_TAGS = [
    '自作キーボード'
]
# 上書きする新しいカテゴリ
NEW_CATEGORY = 'IoT'
# --- 設定ここまで ---

def replace_category_for_mobile_tags(file_path):
    """
    ファイルのfront matterをチェックし、ターゲットタグが含まれていれば
    カテゴリを'Mobile'に置換する。他の行のフォーマットは保持する。
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # --- ステップ1: まず対象ファイルか判定する ---
        in_front_matter = False
        in_tags_list = False
        has_target_tag = False
        for line in lines:
            if line.strip() == '---':
                if in_front_matter: # front matterの終わり
                    break
                else: # front matterの始まり
                    in_front_matter = True
                    continue

            if in_front_matter:
                stripped_line = line.strip()
                if not line.startswith((' ', '\t')):
                    in_tags_list = stripped_line.startswith(('tag:', 'tags:'))

                if in_tags_list and stripped_line.startswith('-'):
                    tag_value = stripped_line[1:].strip().strip('\'"')
                    if tag_value in TARGET_TAGS:
                        has_target_tag = True
                        break

        # ターゲットタグがなければ、何もせず終了
        if not has_target_tag:
            return False, "対象外"

        # --- ステップ2: 対象ファイルだった場合、内容を書き換える ---
        new_lines = []
        in_front_matter = False
        in_category_list = False
        was_modified = False

        for line in lines:
            if line.strip() == '---':
                if in_front_matter:
                    in_front_matter = False
                    in_category_list = False
                else:
                    in_front_matter = True
                new_lines.append(line)
                continue

            if in_front_matter:
                stripped_line = line.strip()

                if not line.startswith((' ', '\t')):
                    # categoryキーを見つけたら、新しい定義に置き換える
                    if stripped_line.startswith(('category:', 'categories:')):
                        new_lines.append(f'category:\n  - {NEW_CATEGORY}\n')
                        in_category_list = True
                        was_modified = True
                        continue
                    else:
                        in_category_list = False

                # 古いcategoryリスト内のアイテム行ならスキップ（削除）
                if in_category_list and stripped_line.startswith('-'):
                    was_modified = True
                    continue

                # その他の行はそのまま追加
                new_lines.append(line)
            else:
                new_lines.append(line)

        if was_modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            return True, "カテゴリを'Mobile'に置換しました"
        else:
            return False, "カテゴリが元々ないため処理スキップ"

    except Exception as e:
        return False, f"エラー: {e}"

def main():
    """メイン処理"""
    if not os.path.isdir(POSTS_DIRECTORY):
        print(f"エラー: '{POSTS_DIRECTORY}' が見つかりません。")
        return

    print(f"カテゴリ置換処理を開始します (対象タグ: {', '.join(TARGET_TAGS)})...")
    updated_files_count = 0

    for root, _, files in os.walk(POSTS_DIRECTORY):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                was_updated, message = replace_category_for_mobile_tags(file_path)
                if was_updated:
                    updated_files_count += 1
                    print(f"✅ {message}: {file_path}")

    if updated_files_count > 0:
        print(f"\n完了しました。合計 {updated_files_count} 個のファイルを修正しました。")
    else:
        print("\n完了しました。修正対象のファイルは見つかりませんでした。")

if __name__ == '__main__':
    main()
