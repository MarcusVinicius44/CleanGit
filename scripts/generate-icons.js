import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SOURCE = 'src/assets/Logo.png'
const OUT_DIR = 'public/icons'
const SIZES = [16, 48, 128]

mkdirSync(OUT_DIR, { recursive: true })

for (const size of SIZES) {
  await sharp(SOURCE)
    .resize(size, size)
    .toFile(`${OUT_DIR}/icon${size}.png`)
  console.log(`Gerado ${OUT_DIR}/icon${size}.png`)
}
