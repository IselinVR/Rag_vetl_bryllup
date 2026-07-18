import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPA_URL = 'https://bevrttmvumfodpkauiio.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldnJ0dG12dW1mb2Rwa2F1aWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MTE4NjksImV4cCI6MjA2NjE4Nzg2OX0.DEZl36UgcM_KOlnbVlxfIdW_ZRdmkAMbbdHfF3KLCyk'
const BUCKET = 'bryllupsbilder'
const MAX_DIMENSION = 1800
const JPEG_QUALITY = 0.85

const supabase = createClient(SUPA_URL, SUPA_KEY)

const uploadCard = document.getElementById('uploadcard')
const uploadButton = document.getElementById('uploadbutton')
const fileInput = document.getElementById('fileinput')
const nameInput = document.getElementById('uploadername')
const statusEl = document.getElementById('uploadstatus')
const galleryGrid = document.getElementById('gallerygrid')
const galleryEmpty = document.getElementById('galleryempty')
const lightbox = document.getElementById('lightbox')
const lightboxImage = document.getElementById('lightboximage')
const lightboxClose = document.getElementById('lightboxclose')

// ---- Upload ----

uploadButton.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files)
  fileInput.value = ''
  uploadFiles(files)
})

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
  setStatus('')

  const uploaderSlug = slugify(nameInput.value)
  let uploaded = 0

  for (const [index, file] of files.entries()) {
    setStatus(`Laster opp bilde ${index + 1} av ${files.length} …`)

    const blob = await shrinkImage(file)
    const extension = blob === file ? fileExtension(file.name) : 'jpg'
    const path = `${Date.now()}-${randomId()}__${uploaderSlug}.${extension}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: blob.type || file.type, cacheControl: '31536000' })

    if (error) {
      console.error('Supabase upload error:', error)
      setStatus('Noe gikk galt under opplastingen. Prøv igjen, eller send bildene til oss på melding.', true)
      uploadButton.disabled = false
      if (uploaded) loadGallery()
      return
    }
    uploaded++
  }

  setStatus(uploaded === 1 ? 'Bildet er lastet opp – tusen takk!' : `${uploaded} bilder er lastet opp – tusen takk!`)
  uploadButton.disabled = false
  loadGallery()
}

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.classList.toggle('error', isError)
}

// Downscale large phone photos before upload so the album loads fast on venue wifi.
// Falls back to the original file if the browser can't decode it (e.g. HEIC).
async function shrinkImage(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
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

function fileExtension(filename) {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1].toLowerCase() : 'jpg'
}

// ---- Gallery ----

async function loadGallery() {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 300, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    console.error('Supabase list error:', error)
    galleryEmpty.textContent = 'Albumet kunne ikke lastes akkurat nå. Prøv igjen litt senere.'
    galleryEmpty.hidden = false
    return
  }

  const images = data.filter(item => /\.(jpe?g|png|gif|webp|avif)$/i.test(item.name))
  galleryEmpty.hidden = images.length > 0
  galleryGrid.replaceChildren(...images.map(buildGalleryItem))
}

function buildGalleryItem(item) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(item.name)
  const url = data.publicUrl

  const link = document.createElement('a')
  link.href = url

  const img = document.createElement('img')
  img.src = url
  img.alt = 'Bryllupsbilde delt av en gjest'
  img.loading = 'lazy'
  link.appendChild(img)

  const uploader = uploaderFromFilename(item.name)
  if (uploader) {
    const byline = document.createElement('span')
    byline.classList.add('gallery-byline')
    byline.textContent = uploader
    link.appendChild(byline)
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
