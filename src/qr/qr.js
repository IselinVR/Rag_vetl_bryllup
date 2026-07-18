import qrcode from '/src/qr/qrcode-generator.mjs'

const ALBUM_URL = 'https://www.ragnhildogvetle.no/bilder'
const CARD_COUNT = 4

const sheet = document.getElementById('cardsheet')
const template = document.getElementById('cardtemplate')

const qr = qrcode(0, 'M')
qr.addData(ALBUM_URL)
qr.make()
const qrSvg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true })

template.querySelector('[data-qr]').innerHTML = qrSvg
template.removeAttribute('id')

for (let i = 1; i < CARD_COUNT; i++) {
  sheet.appendChild(template.cloneNode(true))
}

document.getElementById('printbutton').addEventListener('click', () => window.print())
