import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
export async function requireAuth(req,res,next){
  try {
    const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null;
    if(!token) return res.status(401).json({message:'Authentication required'});
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    const user=await prisma.user.findUnique({where:{id:payload.userId}});
    if(!user||user.status!=='ACTIVE') return res.status(401).json({message:'Invalid user'});
    req.user=user; next();
  } catch { return res.status(401).json({message:'Invalid or expired token'}); }
}
export function allowRoles(...roles){return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({message:'Forbidden'});}
