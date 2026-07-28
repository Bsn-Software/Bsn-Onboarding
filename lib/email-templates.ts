export function getInvitationEmailHtml(firstName: string, magicLink: string) {
  const greeting = `Bonjour ${firstName},`
  const mainText = `Nous sommes ravis de vous compter parmi nous ! Votre espace d'intégration (Onboarding) a été créé et n'attend plus que vous.`
  const subText = `C'est ici que vous pourrez suivre vos démarches d'intégration, fournir vos documents, et découvrir notre fonctionnement avant et pendant vos premiers jours.<br><br>Cliquez ci-dessous pour créer votre mot de passe et accéder à votre espace.`
  const clientUrl = magicLink
  const buttonText = `Créer mon mot de passe`
  const footerSalutation = `À très bientôt,`

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
                /* Header with Logo */
                .header { background-color: #00a0e3; padding: 30px 20px; text-align: center; }
                
                .content { padding: 40px; color: #333; line-height: 1.6; font-size: 16px; }
                .buttons { margin: 30px 0; text-align: center; }
                .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; margin: 0 10px; transition: opacity 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .btn-primary { background-color: #00a0e3; color: white; } /* BSN Blue */
                .btn-secondary { background-color: #f0f9ff; color: #00a0e3; border: 1px solid #00a0e3; }
                
                .footer { background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666; }
                .signature-line { border-left: 4px solid #00a0e3; padding-left: 15px; margin-top: 20px; }
                .signature strong { color: #0f172a; font-size: 16px; }
                .signature p { margin: 3px 0; }
                .signature a { color: #00a0e3; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                   <img src="https://dhqyngvrmlgmexdleonk.supabase.co/storage/v1/object/public/reports/Logo_rectangle_bsn-removebg-preview.png" alt="BSN Engineering" width="280" style="display: block; margin: 0 auto;">
                </div>

                <div class="content">
                    <p>${greeting}</p>
                    <p>${mainText}</p>
                    <p>${subText}</p>
                    
                     <div class="buttons">
                        <a href="${clientUrl}" class="btn btn-secondary">${buttonText}</a>
                    </div>
                </div>

                <div class="footer">
                    <p>${footerSalutation}</p>
                    <div class="signature-line">
                        <p><strong>L'équipe BSN Engineering</strong></p>
                        
                        <p>📧 Email : <a href="mailto:contact@bsnengineering.com">contact@bsnengineering.com</a></p>
                        <p>🌐 Site : <a href="https://www.bsnengineering.com">www.bsnengineering.com</a></p>
                        <br>
                        <p style="font-size: 12px; color: #94a3b8;">📍 Siège : Tour Silex 13 Rue des Cuirassiers | 69003 Lyon</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
  `
}

export function getDocumentReminderEmailHtml(firstName: string, documentLabel: string, appUrl: string) {
  const greeting = `Bonjour ${firstName},`
  const mainText = `Nous sommes en train de finaliser votre dossier d'intégration chez BSN Engineering.`
  const subText = `Il semble que nous n'ayons pas encore reçu votre <strong>${documentLabel}</strong>, ou que celui-ci nécessite une correction.<br><br>Pourriez-vous vous connecter à votre espace collaborateur et nous transmettre ce document dès que possible ?`
  const buttonText = `Accéder à mon espace`
  const footerSalutation = `Merci d'avance pour votre réactivité,<br>À très bientôt,`

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
                /* Header with Logo */
                .header { background-color: #00a0e3; padding: 30px 20px; text-align: center; }
                
                .content { padding: 40px; color: #333; line-height: 1.6; font-size: 16px; }
                .buttons { margin: 30px 0; text-align: center; }
                .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; margin: 0 10px; transition: opacity 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .btn-primary { background-color: #00a0e3; color: white; } /* BSN Blue */
                .btn-secondary { background-color: #f0f9ff; color: #00a0e3; border: 1px solid #00a0e3; }
                
                .footer { background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666; }
                .signature-line { border-left: 4px solid #00a0e3; padding-left: 15px; margin-top: 20px; }
                .signature strong { color: #0f172a; font-size: 16px; }
                .signature p { margin: 3px 0; }
                .signature a { color: #00a0e3; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                   <img src="https://dhqyngvrmlgmexdleonk.supabase.co/storage/v1/object/public/reports/Logo_rectangle_bsn-removebg-preview.png" alt="BSN Engineering" width="280" style="display: block; margin: 0 auto;">
                </div>

                <div class="content">
                    <p>${greeting}</p>
                    <p>${mainText}</p>
                    <p>${subText}</p>
                    
                     <div class="buttons">
                        <a href="${appUrl}" class="btn btn-secondary">${buttonText}</a>
                    </div>
                </div>

                <div class="footer">
                    <p>${footerSalutation}</p>
                    <div class="signature-line">
                        <p><strong>L'équipe RH BSN Engineering</strong></p>
                        
                        <p>📧 Email : <a href="mailto:contact@bsnengineering.com">contact@bsnengineering.com</a></p>
                        <p>🌐 Site : <a href="https://www.bsnengineering.com">www.bsnengineering.com</a></p>
                        <br>
                        <p style="font-size: 12px; color: #94a3b8;">📍 Siège : Tour Silex 13 Rue des Cuirassiers | 69003 Lyon</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
  `
}

export function getGroupedDocumentReminderEmailHtml(firstName: string, missingDocuments: string[], appUrl: string) {
  const greeting = `Bonjour ${firstName},`
  const mainText = `Nous sommes en train de finaliser votre dossier d'intégration chez BSN Engineering.`
  const subText = `Il semble que nous n'ayons pas encore reçu les documents suivants, ou que certains nécessitent une correction :`
  const listHtml = `<ul style="margin: 15px 0 25px 20px; padding: 0;">` + missingDocuments.map(doc => `<li style="margin-bottom: 8px;"><strong>${doc}</strong></li>`).join('') + `</ul>`
  const callToAction = `Pourriez-vous vous connecter à votre espace collaborateur et nous transmettre ces documents dès que possible ?`
  const buttonText = `Accéder à mon espace`
  const footerSalutation = `Merci d'avance pour votre réactivité,<br>À très bientôt,`

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
                /* Header with Logo */
                .header { background-color: #00a0e3; padding: 30px 20px; text-align: center; }
                
                .content { padding: 40px; color: #333; line-height: 1.6; font-size: 16px; }
                .buttons { margin: 30px 0; text-align: center; }
                .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; margin: 0 10px; transition: opacity 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .btn-primary { background-color: #00a0e3; color: white; } /* BSN Blue */
                .btn-secondary { background-color: #f0f9ff; color: #00a0e3; border: 1px solid #00a0e3; }
                
                .footer { background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666; }
                .signature-line { border-left: 4px solid #00a0e3; padding-left: 15px; margin-top: 20px; }
                .signature strong { color: #0f172a; font-size: 16px; }
                .signature p { margin: 3px 0; }
                .signature a { color: #00a0e3; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                   <img src="https://dhqyngvrmlgmexdleonk.supabase.co/storage/v1/object/public/reports/Logo_rectangle_bsn-removebg-preview.png" alt="BSN Engineering" width="280" style="display: block; margin: 0 auto;">
                </div>

                <div class="content">
                    <p>${greeting}</p>
                    <p>${mainText}</p>
                    <p>${subText}</p>
                    ${listHtml}
                    <p>${callToAction}</p>
                    
                     <div class="buttons">
                        <a href="${appUrl}" class="btn btn-secondary">${buttonText}</a>
                    </div>
                </div>

                <div class="footer">
                    <p>${footerSalutation}</p>
                    <div class="signature-line">
                        <p><strong>L'équipe RH BSN Engineering</strong></p>
                        
                        <p>📧 Email : <a href="mailto:contact@bsnengineering.com">contact@bsnengineering.com</a></p>
                        <p>🌐 Site : <a href="https://www.bsnengineering.com">www.bsnengineering.com</a></p>
                        <br>
                        <p style="font-size: 12px; color: #94a3b8;">📍 Siège : Tour Silex 13 Rue des Cuirassiers | 69003 Lyon</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// EAD — Email de confirmation de planification
// ─────────────────────────────────────────────────────────────────────────────
export function getEadConfirmationEmailHtml(
  firstName: string,
  dateHeure: Date,
  lienEad: string,
) {
  const dateStr = dateHeure.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const heureStr = dateHeure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .header { background-color: #00a0e3; padding: 30px 20px; text-align: center; }
    .content { padding: 40px; color: #333; line-height: 1.6; font-size: 16px; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
    .info-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; font-weight: 600; margin-bottom: 4px; }
    .info-box .value { font-size: 18px; font-weight: 700; color: #0f172a; }
    .buttons { margin: 30px 0; text-align: center; }
    .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .btn-primary { background-color: #00a0e3; color: white; }
    .footer { background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666; }
    .signature-line { border-left: 4px solid #00a0e3; padding-left: 15px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://dhqyngvrmlgmexdleonk.supabase.co/storage/v1/object/public/reports/Logo_rectangle_bsn-removebg-preview.png" alt="BSN Engineering" width="280" style="display:block;margin:0 auto;">
    </div>
    <div class="content">
      <p>Bonjour ${firstName},</p>
      <p>Votre <strong>Entretien Annuel de Développement (EAD)</strong> vient d'être planifié. Voici les informations :</p>
      <div class="info-box">
        <div class="label">📅 Date</div>
        <div class="value">${dateStr}</div>
        <div class="label" style="margin-top:12px;">🕐 Heure</div>
        <div class="value">${heureStr}</div>
      </div>
      <p>Vous pouvez consulter et préparer votre formulaire EAD dès maintenant en cliquant ci-dessous.</p>
      <div class="buttons">
        <a href="${lienEad}" class="btn btn-primary">Accéder à mon EAD</a>
      </div>
      <p style="font-size:14px;color:#64748b;">Si vous avez des questions, n'hésitez pas à contacter votre manager ou l'équipe RH.</p>
    </div>
    <div class="footer">
      <p>À bientôt,</p>
      <div class="signature-line">
        <p><strong>L'équipe RH BSN Engineering</strong></p>
        <p>📧 <a href="mailto:contact@bsnengineering.com" style="color:#00a0e3;">contact@bsnengineering.com</a></p>
        <p>🌐 <a href="https://www.bsnengineering.com" style="color:#00a0e3;">www.bsnengineering.com</a></p>
        <br>
        <p style="font-size:12px;color:#94a3b8;">📍 Tour Silex 13 Rue des Cuirassiers | 69003 Lyon</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// EAD — Email de rappel (J-7 ou J-1)
// ─────────────────────────────────────────────────────────────────────────────
export function getEadRappelEmailHtml(
  firstName: string,
  dateHeure: Date,
  joursRestants: 7 | 1,
  lienEad: string,
) {
  const dateStr = dateHeure.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const heureStr = dateHeure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const urgenceLabel = joursRestants === 1 ? '🔔 Rappel — Demain !' : '⏰ Rappel — Dans 7 jours'
  const urgenceColor = joursRestants === 1 ? '#f97316' : '#00a0e3'
  const message = joursRestants === 1
    ? 'Votre entretien a lieu <strong>demain</strong>. Assurez-vous que votre formulaire EAD est bien préparé.'
    : 'Votre entretien approche. Il vous reste <strong>7 jours</strong> pour préparer votre formulaire EAD.'

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .header { background-color: #00a0e3; padding: 30px 20px; text-align: center; }
    .urgence-banner { background: ${urgenceColor}15; border-left: 4px solid ${urgenceColor}; padding: 12px 20px; margin: 20px 40px 0; border-radius: 0 8px 8px 0; font-weight: 700; color: ${urgenceColor}; font-size: 15px; }
    .content { padding: 28px 40px 40px; color: #333; line-height: 1.6; font-size: 16px; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 20px 24px; margin: 20px 0; }
    .info-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; font-weight: 600; margin-bottom: 4px; }
    .info-box .value { font-size: 18px; font-weight: 700; color: #0f172a; }
    .buttons { margin: 28px 0; text-align: center; }
    .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .btn-primary { background-color: ${urgenceColor}; color: white; }
    .footer { background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666; }
    .signature-line { border-left: 4px solid #00a0e3; padding-left: 15px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://dhqyngvrmlgmexdleonk.supabase.co/storage/v1/object/public/reports/Logo_rectangle_bsn-removebg-preview.png" alt="BSN Engineering" width="280" style="display:block;margin:0 auto;">
    </div>
    <div class="urgence-banner">${urgenceLabel}</div>
    <div class="content">
      <p>Bonjour ${firstName},</p>
      <p>${message}</p>
      <div class="info-box">
        <div class="label">📅 Date de l'entretien</div>
        <div class="value">${dateStr}</div>
        <div class="label" style="margin-top:12px;">🕐 Heure</div>
        <div class="value">${heureStr}</div>
      </div>
      <div class="buttons">
        <a href="${lienEad}" class="btn btn-primary">Préparer mon EAD</a>
      </div>
    </div>
    <div class="footer">
      <p>À bientôt,</p>
      <div class="signature-line">
        <p><strong>L'équipe RH BSN Engineering</strong></p>
        <p>📧 <a href="mailto:contact@bsnengineering.com" style="color:#00a0e3;">contact@bsnengineering.com</a></p>
        <p>🌐 <a href="https://www.bsnengineering.com" style="color:#00a0e3;">www.bsnengineering.com</a></p>
        <br>
        <p style="font-size:12px;color:#94a3b8;">📍 Tour Silex 13 Rue des Cuirassiers | 69003 Lyon</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
