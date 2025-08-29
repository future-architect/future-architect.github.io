import os

# チェック対象のディレクトリと文字列を指定
PUBLIC_DIRECTORY = 'public'
SEARCH_STRING = '::: note'

def check_file_for_string(file_path):
    """
    指定されたファイル内に検索文字列が含まれているかチェックし、
    見つかった場合はその行番号と内容をリストで返す。
    """
    found_lines = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            # enumerateを使って行番号を取得しながらループ
            for line_num, line in enumerate(f, 1):
                if SEARCH_STRING in line:
                    found_lines.append({
                        'line_number': line_num,
                        'content': line.strip() # 前後の空白を削除して見やすくする
                    })
    except Exception as e:
        print(f"⚠️ ファイル読み込みエラー: {file_path} - {e}")

    return found_lines

def main():
    """
    publicディレクトリをスキャンし、変換漏れがないかチェックする。
    """
    if not os.path.isdir(PUBLIC_DIRECTORY):
        print(f"❌ エラー: '{PUBLIC_DIRECTORY}' フォルダが見つかりません。")
        print("先に 'hexo generate' コマンドを実行してください。")
        return

    print(f"'{PUBLIC_DIRECTORY}' フォルダをスキャンして、変換されていない '{SEARCH_STRING}' を探します...")

    issues_found = []

    # publicフォルダ内を再帰的に探索
    for root, _, files in os.walk(PUBLIC_DIRECTORY):
        for file in files:
            # .htmlファイルのみを対象とする
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                found_in_file = check_file_for_string(file_path)

                if found_in_file:
                    issues_found.append({
                        'path': file_path,
                        'findings': found_in_file
                    })

    print("-" * 40)
    # 結果の報告
    if not issues_found:
        print("✅ 問題は見つかりませんでした！")
        print("すべての '::: note' 記法は正しくHTMLに変換されているようです。")
    else:
        print(f"🚨 {len(issues_found)}個のファイルで変換漏れの可能性があります。")
        for issue in issues_found:
            print(f"\n📄 ファイル: {issue['path']}")
            for finding in issue['findings']:
                print(f"  - 行 {finding['line_number']}: {finding['content']}")
        print("\n上記のファイルの元となるMarkdownファイルを確認・修正してください。")
    print("-" * 40)


if __name__ == '__main__':
    main()
