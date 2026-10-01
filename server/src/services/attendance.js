import { prisma } from '../config/db.js';
function startOfDay(d=new Date()){return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));}
export async function checkIn(user){
  const workDate=startOfDay();
  const existing=await prisma.attendance.findUnique({where:{employeeId_workDate:{employeeId:user.id,workDate}}});
  if(existing)return {error:'Already checked in today',status:409};
  const now=new Date();
  const shift=user.shiftId?await prisma.shift.findUnique({where:{id:user.shiftId}}):null;
  const minutes=now.getUTCHours()*60+now.getUTCMinutes();
  const status=shift&&minutes>shift.startMinutes+shift.graceMinutes?'LATE':'PRESENT';
  return {data:await prisma.attendance.create({data:{employeeId:user.id,workDate,checkInAt:now,status,shiftId:user.shiftId||null}})};
}
export async function checkOut(user){
  const workDate=startOfDay();
  const record=await prisma.attendance.findUnique({where:{employeeId_workDate:{employeeId:user.id,workDate}}});
  if(!record)return {error:'Check in first',status:400};
  if(record.checkOutAt)return {error:'Already checked out',status:409};
  const now=new Date();
  const workedMinutes=Math.max(0,Math.round((now-record.checkInAt)/60000));
  return {data:await prisma.attendance.update({where:{id:record.id},data:{checkOutAt:now,workedMinutes}})};
}
