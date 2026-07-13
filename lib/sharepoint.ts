export const SHAREPOINT_TENANT_ID = process.env.SHAREPOINT_TENANT_ID || 'bsnengineering.onmicrosoft.com'
export const SHAREPOINT_CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID || '61f259ef-4e2e-4c38-bc99-ca678686e880'
export const SHAREPOINT_CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET || 'AiS8Q~TxiKlRqXI1u41C-X2UKCz8axF~vZgg2b0j'
export const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID || 'bsnengineering.sharepoint.com,252088c2-72b7-4f26-a9a1-2fbcdf3f11c5,6b218fad-7cb9-46ad-9325-5e3beee1f2a3'
export const SHAREPOINT_DRIVE_ID = process.env.SHAREPOINT_DRIVE_ID || 'b!woggJbdyJk-poS-83z8Rxa2PIWu5fK1GkyVeO-7h8qMLHDBweRC8S6tlcvpAfWUz'

const SP_LOG = '[SharePoint]'

// This gets the application access token
async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`
  console.log(`${SP_LOG} 🔑 Récupération du token Azure AD...`)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SHAREPOINT_CLIENT_ID,
      scope: 'https://graph.microsoft.com/.default',
      client_secret: SHAREPOINT_CLIENT_SECRET,
      grant_type: 'client_credentials',
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`${SP_LOG} ❌ Erreur token (HTTP ${response.status}):`, error)
    throw new Error('Failed to get SharePoint access token')
  }

  const data = await response.json()
  console.log(`${SP_LOG} ✅ Token obtenu avec succès`)
  return data.access_token
}

// Helper to create a folder if it doesn't exist
async function createFolderInRoot(path: string) {
  const token = await getAccessToken()
  const parts = path.split('/')
  const newFolderName = parts.pop()
  const parentPath = parts.join('/')
  const parentEndpoint = parentPath ? `root:/${parentPath}:/children` : `root/children`
  const url = `https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/${parentEndpoint}`

  console.log(`${SP_LOG} 📁 Création dossier parent "${path}"...`)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: newFolderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'fail'
    })
  })

  if (!res.ok) {
    const body = await res.text()
    if (res.status === 409) {
      console.log(`${SP_LOG} ℹ️ Dossier "${path}" existe déjà (409), on continue.`)
    } else {
      console.error(`${SP_LOG} ❌ Erreur création dossier parent "${path}" (HTTP ${res.status}):`, body)
    }
  } else {
    console.log(`${SP_LOG} ✅ Dossier parent "${path}" créé.`)
  }
}

// Create a folder for the collaborator in the HR onboarding section
export async function createCollaboratorFolder(folderName: string) {
  console.log(`${SP_LOG} ─────────────────────────────────────`)
  console.log(`${SP_LOG} 🚀 Création du dossier collaborateur: "${folderName}"`)
  console.log(`${SP_LOG} 📂 Drive ID: ${SHAREPOINT_DRIVE_ID}`)

  const token = await getAccessToken()
  const basePath = 'Collaborateurs/Onboarding'
  const url = `https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/root:/${basePath}:/children`

  console.log(`${SP_LOG} 📡 POST ${url}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    })
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`${SP_LOG} ❌ Erreur création dossier (HTTP ${response.status}):`, errorBody)

    if (response.status === 404) {
      console.warn(`${SP_LOG} ⚠️ Dossier parent introuvable. Tentative de création de "Collaborateurs" puis "Collaborateurs/Onboarding"...`)
      await createFolderInRoot('Collaborateurs')
      await createFolderInRoot('Collaborateurs/Onboarding')

      console.log(`${SP_LOG} 🔄 Nouvelle tentative de création du dossier collaborateur...`)
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        })
      })

      if (!retryResponse.ok) {
        const retryError = await retryResponse.text()
        console.error(`${SP_LOG} ❌ Échec après retry (HTTP ${retryResponse.status}):`, retryError)
        throw new Error(`Failed to create collaborator folder after retrying: ${retryError}`)
      }

      const retryData = await retryResponse.json()
      console.log(`${SP_LOG} ✅ Dossier créé après retry! ID: ${retryData.id}`)
      console.log(`${SP_LOG} 🔗 URL: ${retryData.webUrl}`)
      console.log(`${SP_LOG} ─────────────────────────────────────`)
      return { id: retryData.id, webUrl: retryData.webUrl }
    }

    throw new Error('Failed to create SharePoint folder')
  }

  const data = await response.json()
  console.log(`${SP_LOG} ✅ Dossier créé! ID: ${data.id}`)
  console.log(`${SP_LOG} 🔗 URL: ${data.webUrl}`)
  console.log(`${SP_LOG} ─────────────────────────────────────`)
  return { id: data.id, webUrl: data.webUrl }
}

export async function uploadFileToFolder(folderId: string, fileName: string, fileBuffer: Buffer) {
  console.log(`${SP_LOG} 📤 Upload fichier "${fileName}" vers dossier ID: ${folderId}`)
  const token = await getAccessToken()
  const url = `https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/items/${folderId}:/${fileName}:/content`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/octet-stream'
    },
    body: fileBuffer
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`${SP_LOG} ❌ Erreur upload fichier (HTTP ${response.status}):`, error)

    if (response.status === 413 || response.status === 400) {
      console.warn(`${SP_LOG} ⚠️ Fichier trop volumineux, passage en upload par chunks...`)
      return await uploadLargeFileToFolder(folderId, fileName, fileBuffer, token)
    }

    throw new Error('Failed to upload file to SharePoint')
  }

  console.log(`${SP_LOG} ✅ Fichier "${fileName}" uploadé avec succès.`)
  return response.json()
}

// Helper for large files
async function uploadLargeFileToFolder(folderId: string, fileName: string, fileBuffer: Buffer, token: string) {
  const sessionUrl = `https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/items/${folderId}:/${fileName}:/createUploadSession`
  console.log(`${SP_LOG} 📦 Création session upload pour fichier volumineux...`)

  const sessionRes = await fetch(sessionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item: {
        '@microsoft.graph.conflictBehavior': 'replace',
        'name': fileName
      }
    })
  })

  if (!sessionRes.ok) throw new Error(`Could not create upload session: ${await sessionRes.text()}`)

  const sessionData = await sessionRes.json()
  const uploadUrl = sessionData.uploadUrl
  const fileSize = fileBuffer.length
  const chunkSize = 320 * 1024 * 10 // 3.2 MB chunks
  let uploadedBytes = 0
  let result = null

  console.log(`${SP_LOG} 📦 Upload par chunks (taille totale: ${(fileSize / 1024 / 1024).toFixed(2)} MB)`)

  while (uploadedBytes < fileSize) {
    const chunk = fileBuffer.subarray(uploadedBytes, Math.min(uploadedBytes + chunkSize, fileSize))
    const currentEnd = uploadedBytes + chunk.length - 1

    const chunkRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': chunk.length.toString(),
        'Content-Range': `bytes ${uploadedBytes}-${currentEnd}/${fileSize}`
      },
      body: chunk
    })

    if (!chunkRes.ok) {
      throw new Error(`Chunk upload failed: ${await chunkRes.text()}`)
    }

    if (chunkRes.status === 201 || chunkRes.status === 200) {
      result = await chunkRes.json()
      console.log(`${SP_LOG} ✅ Upload par chunks terminé.`)
    }
    uploadedBytes += chunk.length
  }

  return result
}
