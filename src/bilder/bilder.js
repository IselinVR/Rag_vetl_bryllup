import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPA_URL = 'https://bevrttmvumfodpkauiio.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldnJ0dG12dW1mb2Rwa2F1aWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MTE4NjksImV4cCI6MjA2NjE4Nzg2OX0.DEZl36UgcM_KOlnbVlxfIdW_ZRdmkAMbbdHfF3KLCyk'
const BUCKET = 'bryllupsbilder'
const MAX_DIMENSION = 1800
const JPEG_QUALITY = 0.85
const CONVERTER_TIMEOUT_MS = 20000

const supabase = createClient(SUPA_URL, SUPA_KEY)

// Demo mode (/bilder?demo) fills the album with photos from the site itself,
// so layout and upload flow can be tested without the Supabase bucket.
const DEMO_MODE = new URLSearchParams(window.location.search).has('demo')
const DEMO_PHOTOS = [
  { url: '/Bilde ragvetle.jpg', byline: 'ragnhild' },
  { url: '/img/Nordre skøyen.JPG', byline: 'odin' },
  { url: '/Kampen kirke waterimg.png', byline: '' },
  { url: '/img/Skøyen hovedgård.jpg', byline: 'tante liv' },
  { url: '/Norde skøyen.png', byline: 'vetle' },
  { url: '/img/Skøyen hovedgård watercolor.png', byline: '' },
  { url: '/src/registrering/hovedbilde.jpg', byline: 'onkel jan' },
]

const uploadCard = document.getElementById('uploadcard')
const uploadButton = document.getElementById('uploadbutton')
const cameraButton = document.getElementById('camerabutton')
const fileInput = document.getElementById('fileinput')
const cameraInput = document.getElementById('camerainput')
const nameInput = document.getElementById('uploadername')
const statusEl = document.getElementById('uploadstatus')
const uploadList = document.getElementById('uploadlist')
const galleryGrid = document.getElementById('gallerygrid')
const galleryEmpty = document.getElementById('galleryempty')
const galleryHint = document.getElementById('galleryhint')
const lightbox = document.getElementById('lightbox')
const lightboxImage = document.getElementById('lightboximage')
const lightboxClose = document.getElementById('lightboxclose')
const lightboxSave = document.getElementById('lightboxsave')
const lightboxStatus = document.getElementById('lightboxstatus')
const selectBar = document.getElementById('selectbar')
const selectCount = document.getElementById('selectcount')
const selectStatus = document.getElementById('selectstatus')
const clearSelectionButton = document.getElementById('clearselection')
const saveSelectedButton = document.getElementById('saveselected')

// ---- Upload ----

uploadButton.addEventListener('click', () => fileInput.click())
cameraButton.addEventListener('click', () => cameraInput.click())

for (const input of [fileInput, cameraInput]) {
  input.addEventListener('change', () => {
    const files = Array.from(input.files)
    input.value = ''
    startUpload(files)
  })
}

uploadCard.addEventListener('dragover', event => {
  event.preventDefault()
  uploadCard.classList.add('dragover')
})

uploadCard.addEventListener('dragleave', () => {
  uploadCard.classList.remove('dragover')
})

uploadCard.addEventListener('drop', event => {
  event.preventDefault()
  uploadCard.classList.remove('dragover')
  // Don't filter on file.type here: browsers often report an empty type for
  // .heic, so a strict image/* test would silently discard the very files we
  // added HEIC support for. Drop obvious non-images by extension instead and
  // let prepareImage() judge the rest.
  const files = Array.from(event.dataTransfer.files).filter(isPlausibleImage)
  startUpload(files)
})

// Single entry point: guarantees a guest can never start two overlapping runs
// (which used to let one run wipe the other's rows and report a wrong result),
// and that a crash can never leave the buttons stuck disabled.
let isUploading = false
async function startUpload(files) {
  if (isUploading) return
  if (!files.length) {
    setStatus('Fant ingen bilder å laste opp. Velg bildefiler og prøv igjen.', true)
    return
  }

  isUploading = true
  uploadButton.disabled = true
  cameraButton.disabled = true

  try {
    await uploadFiles(files)
  } catch (err) {
    console.error('Uventet feil under opplasting:', err)
    setStatus('Noe gikk galt under opplastingen. Prøv igjen, eller send bildene til oss på melding.', true)
  } finally {
    isUploading = false
    uploadButton.disabled = false
    cameraButton.disabled = false
  }
}

function isPlausibleImage(file) {
  if (file.type) return file.type.startsWith('image/')
  // No type reported — accept anything that looks like a photo by extension.
  return /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i.test(file.name)
}

async function uploadFiles(files) {
  setStatus('')

  // One progress row per file, so a guest can see exactly which photos went
  // through and which (if any) had trouble — instead of a single vague message.
  revokeThumbUrls()
  uploadList.replaceChildren()
  uploadList.hidden = false
  const rows = files.map(buildProgressRow)
  rows.forEach(row => uploadList.appendChild(row.el))

  const uploaderSlug = slugify(nameInput.value)
  const byline = nameInput.value.trim().toLowerCase()
  let uploaded = 0
  let failed = 0

  for (const [index, file] of files.entries()) {
    const row = rows[index]
    setStatus(`Behandler bilde ${index + 1} av ${files.length} …`)
    row.set('uploading', 'Behandler …')

    const prepared = await prepareImage(file)
    if (!prepared.ok) {
      row.set('error', prepared.message)
      failed++
      continue
    }

    // Preview from the processed JPEG, so it renders even for converted HEIC.
    row.showThumb(prepared.blob)
    row.set('uploading', 'Laster opp …')

    if (DEMO_MODE) {
      galleryGrid.prepend(buildGalleryItem({ url: URL.createObjectURL(prepared.blob), byline }))
      galleryEmpty.hidden = true
      row.set('done', 'Delt')
      uploaded++
      continue
    }

    const path = `${Date.now()}-${randomId()}__${uploaderSlug}.jpg`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, prepared.blob, { contentType: 'image/jpeg', cacheControl: '31536000' })

    if (error) {
      console.error('Supabase upload error:', error)
      row.set('error', uploadErrorMessage(error))
      failed++
      continue
    }
    row.set('done', 'Delt')
    uploaded++
  }

  if (failed === 0) {
    setStatus(uploaded === 1 ? 'Bildet er lastet opp – tusen takk!' : `${uploaded} bilder er lastet opp – tusen takk!`)
  } else if (uploaded === 0) {
    setStatus('Ingen bilder ble lastet opp. Se detaljene over, eller send bildene til oss på melding.', true)
  } else {
    setStatus(`${uploaded} av ${files.length} bilder ble lastet opp. Se detaljene over.`, true)
  }

  if (uploaded && !DEMO_MODE) loadGallery()
}

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.classList.toggle('error', isError)
}

// Thumbnails hold blob URLs alive until revoked; release the previous batch so
// a guest uploading many photos doesn't accumulate them for the page lifetime.
const thumbUrls = []
function revokeThumbUrls() {
  while (thumbUrls.length) URL.revokeObjectURL(thumbUrls.pop())
}

// A live status row for a single file: thumbnail + name + state.
function buildProgressRow(file) {
  const el = document.createElement('li')
  el.className = 'upload-item is-pending'

  const thumb = document.createElement('span')
  thumb.className = 'upload-thumb'

  const meta = document.createElement('span')
  meta.className = 'upload-item-meta'
  const nameEl = document.createElement('span')
  nameEl.className = 'upload-item-name'
  nameEl.textContent = shortName(file.name)
  const stateEl = document.createElement('span')
  stateEl.className = 'upload-item-status'
  stateEl.textContent = 'I kø …'
  meta.append(nameEl, stateEl)

  el.append(thumb, meta)

  return {
    el,
    showThumb(blob) {
      const url = URL.createObjectURL(blob)
      thumbUrls.push(url)
      const img = document.createElement('img')
      img.alt = ''
      img.src = url
      thumb.replaceChildren(img)
    },
    set(state, message) {
      el.classList.remove('is-pending', 'is-uploading', 'is-done', 'is-error')
      el.classList.add(`is-${state}`)
      stateEl.textContent = message
    },
  }
}

function shortName(name) {
  return name.length > 28 ? name.slice(0, 25) + '…' : name
}

function uploadErrorMessage(error) {
  const msg = (error && error.message) || ''
  if (/exceeded|too large|maximum|payload/i.test(msg)) return 'Bildet er for stort.'
  if (/network|fetch|timeout|connection/i.test(msg)) return 'Nettverksfeil – sjekk tilkoblingen og prøv igjen.'
  return 'Kunne ikke lastes opp. Prøv igjen.'
}

// Turn any picked file into a downscaled JPEG the whole album can render.
// iPhone HEIC is the tricky case: most non-Safari browsers can't decode it, so
// an un-converted HEIC would upload but never appear in the gallery. We convert
// it first, and if that's impossible we report it clearly instead of silently
// dropping the photo. Returns { ok, blob } or { ok:false, message }.
async function prepareImage(file) {
  if (!file.size) return { ok: false, message: 'Filen er tom.' }

  try {
    return { ok: true, blob: await shrinkToJpeg(file) }
  } catch (err) {
    // Direct decode failed — most likely HEIC on a non-Safari browser, but the
    // file may also be a HEIC mislabelled as .jpg (common when a photo arrives
    // via WhatsApp or Drive), so we don't gate the retry on name or MIME type.
    console.error('Kunne ikke dekode bildet direkte, prøver konvertering:', file.name, err)
  }

  try {
    const converted = await convertHeic(file)
    return { ok: true, blob: await shrinkToJpeg(converted) }
  } catch (err) {
    console.error('Konvertering feilet:', file.name, err)
    return { ok: false, message: heicErrorMessage(err) }
  }
}

function heicErrorMessage(err) {
  if (err && err.message === CONVERTER_UNAVAILABLE) {
    return 'Fikk ikke lastet bildeverktøyet – sjekk nettet og prøv igjen.'
  }
  return 'Klarte ikke å lese dette bildet. Prøv å dele det fra Bilder-appen, eller send det til oss på melding.'
}

// Downscale before upload so the album loads fast on venue wifi. Throws if the
// browser can't decode the source (caller handles the fallback).
async function shrinkToJpeg(file) {
  // imageOrientation: 'from-image' applies the EXIF rotation while decoding.
  // Without it, portrait phone photos land in the album sideways, because the
  // canvas re-encode drops the EXIF tag that would have told viewers to rotate.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    // iOS Safari refuses new contexts once its total canvas memory cap is hit.
    throw new Error('Fikk ikke 2d-kontekst (minnegrense i nettleseren?)')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  // Release the backing store right away instead of waiting for GC, so a long
  // batch doesn't pile up full-size canvases.
  canvas.width = canvas.height = 0
  if (!blob) throw new Error('canvas.toBlob returnerte null')
  return blob
}

// Lazy-loaded only when a photo actually needs converting, so normal JPEG
// uploads never pay for the library. Deliberately NOT caching a rejected
// promise: a single flaky moment on venue wifi must not disable conversion for
// the rest of the session.
const CONVERTER_UNAVAILABLE = 'converter-unavailable'
const CONVERTER_URL = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/+esm'
let heic2anyPromise
let converterAttempt = 0
function loadConverter() {
  if (!heic2anyPromise) {
    // A failed import() is remembered by the browser's module map, so retrying
    // the same URL would fail without even refetching. A fresh query string
    // gives each attempt its own module-map entry (jsDelivr ignores the param).
    const url = converterAttempt === 0 ? CONVERTER_URL : `${CONVERTER_URL}?retry=${converterAttempt}`
    converterAttempt++

    heic2anyPromise = Promise.race([
      import(/* @vite-ignore */ url).then(m => m.default || m),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(CONVERTER_UNAVAILABLE)), CONVERTER_TIMEOUT_MS)),
    ]).catch(err => {
      heic2anyPromise = undefined
      throw err
    })
  }
  return heic2anyPromise
}

async function convertHeic(file) {
  let heic2any
  try {
    heic2any = await loadConverter()
  } catch {
    throw new Error(CONVERTER_UNAVAILABLE)
  }
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  return Array.isArray(out) ? out[0] : out
}

function slugify(value) {
  const slug = value
    .trim()
    .toLowerCase()
    .replaceAll('æ', 'ae').replaceAll('ø', 'o').replaceAll('å', 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'gjest'
}

function randomId() {
  return Math.random().toString(36).slice(2, 8)
}

// ---- Gallery ----

async function loadGallery() {
  // Rebuilding the grid detaches the selected nodes, so drop the stale selection.
  clearSelection()

  if (DEMO_MODE) {
    galleryEmpty.hidden = true
    galleryGrid.replaceChildren(...DEMO_PHOTOS.map(buildGalleryItem))
    galleryHint.hidden = DEMO_PHOTOS.length === 0
    return
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 300, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    console.error('Supabase list error:', error)
    galleryEmpty.textContent = 'Albumet kunne ikke lastes akkurat nå. Prøv igjen litt senere.'
    galleryEmpty.hidden = false
    return
  }

  // Only formats browsers can actually render. Uploads are always .jpg now, but
  // any raw .heic left by the old code path would show as a broken image.
  const images = data.filter(item => /\.(jpe?g|png|gif|webp|avif)$/i.test(item.name))
  galleryEmpty.hidden = images.length > 0
  galleryHint.hidden = images.length === 0
  galleryGrid.replaceChildren(...images.map(item => buildGalleryItem({
    url: supabase.storage.from(BUCKET).getPublicUrl(item.name).data.publicUrl,
    byline: uploaderFromFilename(item.name),
  })))
}

function buildGalleryItem({ url, byline }) {
  const item = document.createElement('div')
  item.className = 'gallery-item'

  const link = document.createElement('a')
  link.className = 'gallery-link'
  link.href = url

  const img = document.createElement('img')
  img.src = url
  img.alt = 'Bryllupsbilde delt av en gjest'
  img.loading = 'lazy'
  link.appendChild(img)

  if (byline) {
    const bylineEl = document.createElement('span')
    bylineEl.classList.add('gallery-byline')
    bylineEl.textContent = byline
    link.appendChild(bylineEl)
  }

  link.addEventListener('click', event => {
    event.preventDefault()
    openLightbox(url)
  })

  // Always-visible checkbox rather than a separate "select mode": one less
  // state to explain, and tapping the photo still just opens it.
  const select = document.createElement('button')
  select.type = 'button'
  select.className = 'gallery-select'
  select.setAttribute('aria-pressed', 'false')
  select.setAttribute('aria-label', 'Velg dette bildet')
  select.addEventListener('click', () => toggleSelection(url, item, select))

  item.append(link, select)
  return item
}

// ---- Selection + saving ----

const selected = new Map()   // url -> { item, button }

function toggleSelection(url, item, button) {
  if (selected.has(url)) {
    selected.delete(url)
    item.classList.remove('is-selected')
    button.setAttribute('aria-pressed', 'false')
    button.setAttribute('aria-label', 'Velg dette bildet')
  } else {
    selected.set(url, { item, button })
    item.classList.add('is-selected')
    button.setAttribute('aria-pressed', 'true')
    button.setAttribute('aria-label', 'Fjern dette bildet fra utvalget')
  }
  updateSelectBar()
}

function clearSelection() {
  for (const { item, button } of selected.values()) {
    item.classList.remove('is-selected')
    button.setAttribute('aria-pressed', 'false')
    button.setAttribute('aria-label', 'Velg dette bildet')
  }
  selected.clear()
  updateSelectBar()
}

function updateSelectBar() {
  const n = selected.size
  selectBar.hidden = n === 0
  document.body.classList.toggle('has-selection', n > 0)
  selectCount.textContent = n === 1 ? '1 bilde valgt' : `${n} bilder valgt`
  saveSelectedButton.textContent = n === 1 ? 'Lagre bildet' : `Lagre ${n} bilder`
  if (n === 0) selectStatus.textContent = ''
}

clearSelectionButton.addEventListener('click', clearSelection)

saveSelectedButton.addEventListener('click', async () => {
  const urls = [...selected.keys()]
  if (!urls.length) return

  saveSelectedButton.disabled = true
  clearSelectionButton.disabled = true
  try {
    const result = await savePhotos(urls, msg => { selectStatus.textContent = msg })
    // Keep the selection so the confirmation stays on screen — clearing it here
    // would hide the bar, and the message with it. Guests tap Nullstill when done.
    selectStatus.textContent = result.message
  } finally {
    saveSelectedButton.disabled = false
    clearSelectionButton.disabled = false
  }
})

// Saving many full-size photos means holding them all in memory at once, which
// is where phones fall over — so ask for it in batches rather than failing.
const MAX_SAVE_AT_ONCE = 20

async function savePhotos(urls, onProgress) {
  if (urls.length > MAX_SAVE_AT_ONCE) {
    return { ok: false, message: `Velg maks ${MAX_SAVE_AT_ONCE} bilder om gangen.` }
  }

  onProgress(urls.length === 1 ? 'Henter bildet …' : `Henter ${urls.length} bilder …`)

  let files
  try {
    files = await Promise.all(urls.map(async (url, i) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      return new File([blob], photoFilename(url, i, urls.length), { type: blob.type || 'image/jpeg' })
    }))
  } catch (err) {
    console.error('Kunne ikke hente bilde(r):', err)
    return { ok: false, message: 'Fikk ikke hentet bildene. Sjekk nettet og prøv igjen.' }
  }

  // On phones the native share sheet is the only route into the camera roll,
  // and it handles several files at once. Desktop falls back to downloads.
  if (navigator.canShare?.({ files })) {
    try {
      onProgress('Åpner lagringsvalg …')
      await navigator.share({ files })
      return { ok: true, message: 'Ferdig!' }
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, message: '' }
      console.error('Deling feilet, faller tilbake til nedlasting:', err)
    }
  }

  onProgress('Laster ned …')
  for (const file of files) downloadFile(file)
  return { ok: true, message: files.length === 1 ? 'Bildet er lastet ned.' : `${files.length} bilder er lastet ned.` }
}

function downloadFile(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on a later tick so the download has definitely started.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function photoFilename(url, index, total) {
  const ext = (url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || 'jpg').toLowerCase()
  const suffix = total > 1 ? `-${index + 1}` : ''
  return `ragnhild-og-vetle${suffix}.${ext}`
}

function uploaderFromFilename(filename) {
  const match = filename.match(/__([a-z0-9-]+)\.[a-zA-Z0-9]+$/)
  if (!match || match[1] === 'gjest') return ''
  return match[1].replaceAll('-', ' ')
}

// ---- Lightbox ----

let lightboxUrl = ''

function openLightbox(url) {
  lightboxUrl = url
  lightboxImage.src = url
  lightboxStatus.textContent = ''
  lightbox.showModal()
}

lightboxClose.addEventListener('click', () => lightbox.close())

lightbox.addEventListener('click', event => {
  if (event.target === lightbox) lightbox.close()
})

lightbox.addEventListener('close', () => {
  lightboxImage.src = ''
  lightboxUrl = ''
})

lightboxSave.addEventListener('click', async () => {
  if (!lightboxUrl) return
  lightboxSave.disabled = true
  try {
    const result = await savePhotos([lightboxUrl], msg => { lightboxStatus.textContent = msg })
    lightboxStatus.textContent = result.message
  } finally {
    lightboxSave.disabled = false
  }
})

loadGallery()
