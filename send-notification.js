import emailjs from '@emailjs/nodejs'
import { createClient } from '@supabase/supabase-js'

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// All values come from the environment. Nothing secret belongs in this file:
// the whole repo is published to GitHub Pages, so anything hardcoded here is
// downloadable by anyone. Copy .env.example to .env and fill it in, then run:
//   set -a && . ./.env && set +a && node send-notification.js --dry-run
//
// SUPABASE_SERVICE_ROLE_KEY must be the service_role key, not the anon key —
// anon has no read access to `responses` (guest names/emails are not public).
const {
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_PRIVATE_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  DRY_RUN_EMAIL,
} = process.env
// ────────────────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run')

const required = isDryRun
  ? { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, DRY_RUN_EMAIL }
  : { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }

const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k)
if (missing.length) {
  console.error('Missing required environment variable(s):', missing.join(', '))
  console.error('See .env.example — copy it to .env and fill in the values.')
  process.exit(1)
}

if (isDryRun) {
  console.log('DRY RUN — all emails will be sent to', DRY_RUN_EMAIL)
}

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY, privateKey: EMAILJS_PRIVATE_KEY })

let targets

if (isDryRun) {
  targets = [{ first_name: 'Test', last_name: '', email: DRY_RUN_EMAIL }]
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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
