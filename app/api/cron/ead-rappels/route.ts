import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { getEadRappelEmailHtml } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────────────────────────────
// Helper : date locale UTC sous forme YYYY-MM-DD
// ─────────────────────────────────────────────────────────────
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

// ─────────────────────────────────────────────────────────────
// Route GET — déclenchée par Vercel Cron chaque matin à 7h UTC
// Sécurisée par CRON_SECRET
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // 1. Vérification du secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = toDateString(today)

  // 2. Récupérer tous les entretiens éligibles :
  //    date_heure_prevue non nulle, statut != signe
  const { data: entretiens, error } = await admin
    .from('ead_entretiens')
    .select('id, collaborator_id, date_heure_prevue, statut')
    .not('date_heure_prevue', 'is', null)
    .neq('statut', 'signe')

  if (error) {
    console.error('Erreur cron ead-rappels:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const entretien of entretiens ?? []) {
    const dateHeure = new Date(entretien.date_heure_prevue!)
    const j7Target = toDateString(addDays(dateHeure, -7))
    const j1Target = toDateString(addDays(dateHeure, -1))

    // Récupérer les logs existants pour cet entretien (déduplication)
    const { data: logs } = await admin
      .from('ead_notifications')
      .select('type, date_cible')
      .eq('entretien_id', entretien.id)
      .in('type', ['rappel_j7', 'rappel_j1'])

    const hasJ7 = logs?.some(l => l.type === 'rappel_j7' && l.date_cible === j7Target)
    const hasJ1 = logs?.some(l => l.type === 'rappel_j1' && l.date_cible === j1Target)

    // Déterminer si on est à J-7 ou J-1
    const shouldSendJ7 = todayStr === j7Target && !hasJ7
    const shouldSendJ1 = todayStr === j1Target && !hasJ1

    if (!shouldSendJ7 && !shouldSendJ1) {
      skipped++
      continue
    }

    // Récupérer le profil du collaborateur
    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, email')
      .eq('id', entretien.collaborator_id)
      .single()

    if (!profile?.email) {
      skipped++
      continue
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bsn-onboarding.vercel.app'
    const lienEad = `${appUrl}/ead/${entretien.id}`
    const firstName = profile.first_name || 'Collaborateur'

    // Envoyer le(s) rappel(s) nécessaire(s)
    for (const [shouldSend, type, dateCible, jours] of [
      [shouldSendJ7, 'rappel_j7', j7Target, 7] as const,
      [shouldSendJ1, 'rappel_j1', j1Target, 1] as const,
    ]) {
      if (!shouldSend) continue

      const html = getEadRappelEmailHtml(firstName, dateHeure, jours, lienEad)
      const subject = jours === 1
        ? 'BSN Engineering — Rappel : votre EAD demain'
        : 'BSN Engineering — Rappel : votre EAD dans 7 jours'

      try {
        await resend.emails.send({
          from: 'BSN Engineering <satisfaction@bsnengineering.com>',
          to: [profile.email],
          subject,
          html,
        })
      } catch (err) {
        console.error(`Erreur Resend rappel (${type}):`, err)
      }

      // Log dans ead_notifications — date_cible est la clé de déduplication
      await admin.from('ead_notifications').insert({
        entretien_id: entretien.id,
        type,
        date_cible: dateCible,
        destinataire_email: profile.email,
      })

      sent++
    }
  }

  console.log(`[cron/ead-rappels] ${todayStr} — sent: ${sent}, skipped: ${skipped}`)
  return NextResponse.json({ date: todayStr, sent, skipped })
}
