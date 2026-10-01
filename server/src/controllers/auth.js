import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/db.js';
const loginSchema=z.object({email:z.string().email(),password:z.string().min(8)});
const registerSchema=z.object({
  name:z.string().trim().min(2).max(100),
  email:z.string().trim().email().max(255),
  password:z.string().min(8).max(128),
});

function userResponse(user){
  return {id:user.id,name:user.name,email:user.email,role:user.role,employeeCode:user.employeeCode};
}

function createToken(userId){
  return jwt.sign({userId},process.env.JWT_SECRET,{expiresIn:'8h'});
}

export async function login(req,res){
  const parsed=loginSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({message:'Valid email and password required'});
  const user=await prisma.user.findFirst({where:{email:parsed.data.email.toLowerCase()}});
  if(!user||!(await bcrypt.compare(parsed.data.password,user.passwordHash)))return res.status(401).json({message:'Invalid credentials'});
  res.json({token:createToken(user.id),user:userResponse(user)});
}

export async function register(req,res){
  const parsed=registerSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:'Name, a valid email, and a password of at least 8 characters are required'});

  // Self-registration is safe only for this single-organisation MVP. Multi-tenant
  // deployments should provision employees through the HR admin flow instead.
  const organisations=await prisma.organisation.findMany({select:{id:true},take:2});
  if(organisations.length!==1)return res.status(409).json({message:'Self-registration requires exactly one organisation. Ask an administrator to create your account.'});

  const email=parsed.data.email.toLowerCase();
  const existing=await prisma.user.findUnique({where:{organisationId_email:{organisationId:organisations[0].id,email}}});
  if(existing)return res.status(409).json({message:'An account with this email already exists'});

  const passwordHash=await bcrypt.hash(parsed.data.password,12);
  for(let attempt=0;attempt<3;attempt+=1){
    try{
      const user=await prisma.user.create({data:{
        name:parsed.data.name,
        email,
        passwordHash,
        employeeCode:`EMP-${randomUUID().slice(0,8).toUpperCase()}`,
        organisationId:organisations[0].id,
        role:'EMPLOYEE',
      }});
      return res.status(201).json({token:createToken(user.id),user:userResponse(user)});
    }catch(error){
      if(error.code!=='P2002'||attempt===2)throw error;
    }
  }
}

export async function me(req,res){res.json({user:userResponse(req.user)})}
