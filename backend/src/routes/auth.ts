import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

// Middleware to check authentication
// This function checks if any request that requires authentication has a valid JWT token in the cookies
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.authToken;

  if (!token)
    return res.status(401).json({ error: 'Not authenticated!' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };    // Verify token and extract payload
    (req as any).user = payload;  // Attach payload (user ID) to request object
    return next();                // Proceed to the next middleware or route handler
  } 
  catch {
    return res.status(401).json({ error: 'Invalid token!' });
  }
}

// Sign-up endpoint
router.post('/signup', async (req, res) => {
  const { email, password, username } = req.body
  if (!email || !password) 
    return res.status(400).json({ error: 'Email and password are required!' })
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists!' })
  }
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, username },
      select: { id: true, email: true, username: true }
    })

    if (!user) 
      return res.status(500).json({ error: 'Failed to create user!' });
    else
      console.log('User created successfully:', user);
    
    // Generate JWT token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

    return res
      // Set an HttpOnly, Secure, SameSite cookie
      .cookie('authToken', token, {
        httpOnly: true,                                 // Prevents client-side JS access
        secure: process.env.NODE_ENV === 'production',  // Use secure cookies in production
        sameSite: 'lax',                                // CSRF protection
        maxAge: 60 * 60 * 1000                          // 1 hour
      })
      .status(201)
      .json(user)
  } 
  catch (err: any) {
    console.error('Error occurred during sign up:', err);
    return res.status(400).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found:', email);
    return res.status(401).json({ error: 'Invalid email or password!' });  
  }

  // Validate password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    console.log('Invalid password attempt for user:', email);
    return res.status(401).json({ error: 'Invalid email or password!' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

  if (token) {
    console.log('User logged in successfully:', {
      id: user.id,
      email: user.email,
      username: user.username
    });
  }

  return res
    .cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000
    })
    .status(200)
    .json({ id: user.id, email: user.email, username: user.username })
})

router.post('/logout', (_, res) => {
  return res
    .clearCookie('authToken', { 
      sameSite: 'lax', 
      secure: process.env.NODE_ENV === 'production' 
    })
    .status(204)
    .send();
})

export default router