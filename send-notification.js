import emailjs from '@emailjs/nodejs'
import { createClient } from '@supabase/supabase-js'

// ─── CONFIG — fill in before running ────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_o3qutk5'
const EMAILJS_TEMPLATE_ID = 'template_soe821c'   // create in EmailJS dashboard
const EMAILJS_PUBLIC_KEY  = 'TsxEMZ_HueJzgKhtQ'
const EMAILJS_PRIVATE_KEY = 'xHF4Q93-IUVPjZ1QSukZl'       // EmailJS dashboard → Account → Private Key

const SUPABASE_URL = 'https://bevrttmvumfodpkauiio.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldnJ0dG12dW1mb2Rwa2F1aWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MTE4NjksImV4cCI6MjA2NjE4Nzg2OX0.DEZl36UgcM_KOlnbVlxfIdW_ZRdmkAMbbdHfF3KLCyk'

const DRY_RUN_EMAIL = 'aleksdokken@gmail.com'
// ────────────────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  console.log('DRY RUN — all emails will be sent to', DRY_RUN_EMAIL)
}

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY, privateKey: EMAILJS_PRIVATE_KEY })

let targets

if (isDryRun) {
  targets = [{ first_name: 'Test', last_name: '', email: DRY_RUN_EMAIL }]
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: guests, error } = await supabase
    .from('responses')
    .select('first_name, last_name, email')
    .eq('attending', true)

  if (error) {
    console.error('Failed to fetch guests from Supabase:', error.message)
    process.exit(1)
  }

  // deduplicate by email, keeping the first occurrence
  const seen = new Set()
  const unique = guests.filter(g => {
    if (seen.has(g.email)) return false
    seen.add(g.email)
    return true
  })

  console.log(`Found ${guests.length} attending guest(s), ${unique.length} unique email(s)`)
  targets = unique
}

let sent = 0
let failed = 0

for (const guest of targets) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email:   guest.email,
      first_name: guest.first_name,
    })
    console.log(`Sent to ${guest.first_name} ${guest.last_name} <${guest.email}>`)
    sent++
  } catch (err) {
    console.error(`Failed for ${guest.first_name} ${guest.last_name} <${guest.email}>:`, err?.text ?? err)
    failed++
  }

  // small delay to avoid hitting EmailJS rate limits
  await new Promise(r => setTimeout(r, 300))
}

console.log(`\nDone. ${sent} sent, ${failed} failed.`)
