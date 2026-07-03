export const SHAREPOINT_TENANT_ID = process.env.SHAREPOINT_TENANT_ID || 'bsnengineering.onmicrosoft.com'
export const SHAREPOINT_CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID || '61f259ef-4e2e-4c38-bc99-ca678686e880'
export const SHAREPOINT_CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET || 'AiS8Q~TxiKlRqXI1u41C-X2UKCz8axF~vZgg2b0j'
export const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID || 'bsnengineering.sharepoint.com,0d7e6c64-ddf4-4178-8522-d5704ce1689a,6d53cb76-0c55-46e4-b30c-c33e33fcacc2'
export const SHAREPOINT_DRIVE_ID = process.env.SHAREPOINT_DRIVE_ID || 'b!ZGx-DfTdeEGFItVwTOFomnbLU21VDORGswzDPjP8rMI6FDfn-7Q8RrYA8X0flvrS'

// This gets the application access token
async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: SHAREPOINT_CLIENT_ID,
      scope: 'https://graph.microsoft.com/.default',
      client_secret: SHAREPOINT_CLIENT_SECRET,
      grant_type: 'client_credentials',
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('SharePoint Token Error:', error)
    throw new Error('Failed to get SharePoint access token')
  }

  const data = await response.json()
  return data.access_token
}

// Create a folder for the collaborator in the HR onboarding section
export async function createCollaboratorFolder(folderName: string) {
  const token = await getAccessToken()
  const basePath = 'Collaborateurs/Onboarding'
  
  const url = `https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/root:/${basePath}:/children`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename' // Or 'fail'/'replace'
    })
  })

  if (!response.ok) {
    // If the parent folder doesn't exist, this might throw a 404 or 400.
    const error = await response.text()
    console.error('SharePoint Folder Creation Error:', error)
    
    // Attempting to create parent folders first if 404
    if (response.status === 404) {
        console.warn('Parent folder might not exist. Attempting to create Collaborateurs/Onboarding first...');
        await createFolderInRoot('Collaborateurs');
        await createFolderInRoot('Collaborateurs/Onboarding');
        
        // Retry
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
        });
        
        if (!retryResponse.ok) {
            throw new Error(`Failed to create collaborator folder after retrying: ${await retryResponse.text()}`);
        }
        const data = await retryResponse.json()
        return {
          id: data.id,
          webUrl: data.webUrl
        }
    }
    
    throw new Error('Failed to create SharePoint folder')
  }

  const data = await response.json()
  return {
    id: data.id,
    webUrl: data.webUrl
  }
}

// Helper to create a folder if it doesn't exist
async function createFolderInRoot(path: string) {
    const token = await getAccessToken()
    
    const parts = path.split('/')
    const newFolderName = parts.pop()
    const parentPath = parts.join('/')
    
    const parentEndpoint = parentPath ? `root:/${parentPath}:/children` : `root/children`
    
    const url = `https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/${parentEndpoint}`
    
    await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFolderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'fail' // Fails if exists, which is fine
        })
    }).catch(e => console.warn('Folder might already exist', e))
}

export async function uploadFileToFolder(folderId: string, fileName: string, fileBuffer: Buffer) {
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
    console.error('SharePoint File Upload Error:', error)
    
    // Check if it's payload too large (413 or 400 with specific error)
    if (response.status === 413 || response.status === 400) {
        console.warn('File might be too large, attempting large file upload session...');
        return await uploadLargeFileToFolder(folderId, fileName, fileBuffer, token);
    }
    
    throw new Error('Failed to upload file to SharePoint')
  }

  return response.json()
}

// Helper for large files
async function uploadLargeFileToFolder(folderId: string, fileName: string, fileBuffer: Buffer, token: string) {
    const sessionUrl = `https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/items/${folderId}:/${fileName}:/createUploadSession`
    
    const sessionRes = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            item: {
                "@microsoft.graph.conflictBehavior": "replace",
                "name": fileName
            }
        })
    });
    
    if (!sessionRes.ok) throw new Error(`Could not create upload session: ${await sessionRes.text()}`);
    
    const sessionData = await sessionRes.json();
    const uploadUrl = sessionData.uploadUrl;
    
    // Chunk upload logic
    const fileSize = fileBuffer.length;
    const chunkSize = 320 * 1024 * 10; // 3.2 MB chunks (must be multiple of 320 KB)
    let uploadedBytes = 0;
    
    let result = null;
    while (uploadedBytes < fileSize) {
        const chunk = fileBuffer.subarray(uploadedBytes, Math.min(uploadedBytes + chunkSize, fileSize));
        const currentEnd = uploadedBytes + chunk.length - 1;
        
        const chunkRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': chunk.length.toString(),
                'Content-Range': `bytes ${uploadedBytes}-${currentEnd}/${fileSize}`
            },
            body: chunk
        });
        
        if (!chunkRes.ok) {
            // Some final chunks return 201/200, intermediate ones return 202
            throw new Error(`Chunk upload failed: ${await chunkRes.text()}`);
        }
        
        // Only the final response has the item data
        if (chunkRes.status === 201 || chunkRes.status === 200) {
           result = await chunkRes.json();
        }
        uploadedBytes += chunk.length;
    }
    
    return result;
}
