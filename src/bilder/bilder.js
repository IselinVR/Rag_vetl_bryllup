import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPA_URL = 'https://bevrttmvumfodpkauiio.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldnJ0dG12dW1mb2Rwa2F1aWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MTE4NjksImV4cCI6MjA2NjE4Nzg2OX0.DEZl36UgcM_KOlnbVlxfIdW_ZRdmkAMbbdHfF3KLCyk'
const BUCKET = 'bryllupsbilder'
const MAX_DIMENSION = 1800
const JPEG_QUALITY = 0.85
const HEIC_RE = /\.(heic|heif)$/i

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
const lightbox = document.getElementById('lightbox')
const lightboxImage = document.getElementById('lightboximage')
const lightboxClose = document.getElementById('lightboxclose')

// ---- Upload ----

uploadButton.addEventListener('click', () => fileInput.click())
cameraButton.addEventListener('click', () => cameraInput.click())

for (const input of [fileInput, cameraInput]) {
  input.addEventListener('change', () => {
    const files = Array.from(input.files)
    input.value = ''
    uploadFiles(files)
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
  const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  uploadFiles(files)
})

async function uploadFiles(files) {
  if (!files.length) return

  uploadButton.disabled = true
  cameraButton.disabled = true
  setStatus('')

  // One progress row per file, so a guest can see exactly which photos went
  // through and which (if any) had trouble — instead of a single vague message.
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

  uploadButton.disabled = false
  cameraButton.disabled = false
  if (uploaded && !DEMO_MODE) loadGallery()
}

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.classList.toggle('error', isError)
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
      const img = document.createElement('img')
      img.alt = ''
      img.src = URL.createObjectURL(blob)
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
  try {
    return { ok: true, blob: await shrinkToJpeg(file) }
  } catch {
    // Direct decode failed — most likely HEIC on a non-Safari browser.
  }

  if (looksLikeHeic(file)) {
    try {
      const converted = await convertHeic(file)
      return { ok: true, blob: await shrinkToJpeg(converted) }
    } catch (err) {
      console.error('HEIC-konvertering feilet:', err)
      return { ok: false, message: 'HEIC-bilde – klarte ikke å lese det i denne nettleseren. Prøv Safari, eller send det til oss på melding.' }
    }
  }

  return { ok: false, message: 'Klarte ikke å lese denne filen – er det et bilde?' }
}

// Downscale before upload so the album loads fast on venue wifi. Throws if the
// browser can't decode the source (caller handles the fallback).
async function shrinkToJpeg(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('canvas.toBlob returnerte null')
  return blob
}

function looksLikeHeic(file) {
  return /image\/hei[cf]/i.test(file.type) || HEIC_RE.test(file.name)
}

// Lazy-loaded only when a HEIC actually needs converting, so normal JPEG
// uploads never pay for the library.
let heic2anyPromise
async function convertHeic(file) {
  if (!heic2anyPromise) {
    heic2anyPromise = import('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/+esm').then(m => m.default || m)
  }
  const heic2any = await heic2anyPromise
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
  if (DEMO_MODE) {
    galleryEmpty.hidden = true
    galleryGrid.replaceChildren(...DEMO_PHOTOS.map(buildGalleryItem))
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

  const images = data.filter(item => /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(item.name))
  galleryEmpty.hidden = images.length > 0
  galleryGrid.replaceChildren(...images.map(item => buildGalleryItem({
    url: supabase.storage.from(BUCKET).getPublicUrl(item.name).data.publicUrl,
    byline: uploaderFromFilename(item.name),
  })))
}

function buildGalleryItem({ url, byline }) {
  const link = document.createElement('a')
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
    lightboxImage.src = url
    lightbox.showModal()
  })

  return link
}

function uploaderFromFilename(filename) {
  const match = filename.match(/__([a-z0-9-]+)\.[a-zA-Z0-9]+$/)
  if (!match || match[1] === 'gjest') return ''
  return match[1].replaceAll('-', ' ')
}

// ---- Lightbox ----

lightboxClose.addEventListener('click', () => lightbox.close())

lightbox.addEventListener('click', event => {
  if (event.target === lightbox) lightbox.close()
})

lightbox.addEventListener('close', () => {
  lightboxImage.src = ''
})

loadGallery()
