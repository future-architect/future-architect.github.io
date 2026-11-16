import re,glob,subprocess,sys
AG=sys.argv[1]
rows=[]
for f in sorted(glob.glob(AG+'/documents/*/index.md')):
    s=open(f,encoding='utf8').read()
    m=re.search(r'\*\*作成者\*\*:\s*(.+)',s)
    if not m: continue
    d=f.split('/')[-2]
    title=re.search(r'^\s+name:\s*"?(.+?)"?\s*$',s,re.M).group(1).replace('<wbr>','')
    split=lambda t:[n.strip() for n in t.split('、') if n.strip() and n.strip()!='募集中']
    r=re.search(r'\*\*レビュアー\*\*:\s*(.+)',s)
    arts=re.search(r'## Articles\n(.*?)(\n## |\n<div|\Z)',s,re.S)
    dates=sorted(re.findall(r'^- (\d{4})\.(\d{2})\.(\d{2})',arts.group(1),re.M)) if arts else []
    if dates: date='-'.join(dates[0])
    else: date=subprocess.run(['git','-C',AG,'log','--diff-filter=A','--format=%as','--',f'documents/{d}'],capture_output=True,text=True).stdout.split()[-1]
    rows.append((date,title,d,split(m.group(1)),split(r.group(1)) if r else []))
rows.sort(reverse=True)
print('# アーキテクチャガイドラインの作成者・レビュアー。各ガイドラインの index.md の「謝辞」から写す。')
print('# date は Articles の最も古い告知記事の日付。告知記事が無いものはリポジトリに入った日')
for date,title,d,a,r in rows:
    print(f'- title: "{title}"\n  url: https://future-architect.github.io/arch-guidelines/documents/{d}/\n  date: {date}')
    print('  authors: ['+', '.join(a)+']')
    if r: print('  reviewers: ['+', '.join(r)+']')
