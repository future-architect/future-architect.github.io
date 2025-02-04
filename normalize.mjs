/** ファイル正規化スクリプト */
import fs from 'fs'
import path from 'path'

const __dirname = new URL('.', import.meta.url).pathname
const srcRoot = path.resolve(__dirname, './source')

for (const dirent of fs.readdirSync(srcRoot, { withFileTypes: true, recursive: true })) {
  if (!dirent.isFile()) continue

  const filePath = path.resolve(srcRoot, dirent.parentPath, dirent.name)
  if(path.extname(dirent.name)==='.md') {
    fs.writeFileSync(filePath, fs.readFileSync(filePath, 'utf-8').normalize())
  }
  const normalized = filePath.normalize()
  if(normalized !== filePath) {
    console.log(`Normalize: ${filePath}`)
    fs.renameSync(filePath, normalized)
  }
}

