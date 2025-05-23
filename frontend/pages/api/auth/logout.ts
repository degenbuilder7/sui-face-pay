import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Clear all possible session cookies
    const cookiesToClear = [
      'zklogin-session',
      'iron-session/zklogin',
      'sui-zklogin-session',
    ]

    cookiesToClear.forEach(cookieName => {
      res.setHeader('Set-Cookie', `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`)
    })

    return res.status(200).json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Error during logout:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 