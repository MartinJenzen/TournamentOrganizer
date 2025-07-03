import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import cookieParser from 'cookie-parser';
import protectedRouter from './routes/protected'; // Assuming you have a protected route
import { requireAuth } from './routes/auth';
import { PrismaClient } from '@prisma/client';


const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(authRouter);
app.use('/protected', requireAuth, protectedRouter); // Protect this route with requireAuth middleware

app.get('/', (_, res) => res.send('API is running'));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);