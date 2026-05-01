import fs from 'fs';
import path from 'path';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const csvPath = 'D:/IPE-24 Classroom/Artifacts/_IUT IPE-24 OFFICIAL  - Student Info.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV File not found at:', csvPath);
    process.exit(1);
  }
  
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = csvData.split(/\r?\n/).filter(line => line.trim().length > 0);
  lines.shift(); // Remove header

  const passwordHash = await bcrypt.hash('password123', 10);
  
  console.log(`Found ${lines.length} rows in CSV.`);
  
  const processedIds = new Set();
  
  let successCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    const fields = line.split(',');
    if (fields.length < 8) continue;

    const name = fields[0].trim();
    const nickname = fields[1].trim();
    const studentId = fields[2].trim();
    const email = fields[3].trim().toLowerCase().replace(/\s+/g, '');
    const phone = fields[4].trim();
    const dob = fields[5].trim();
    const gender = fields[6].trim();
    const bloodGroup = fields[7].trim();

    if (!email.endsWith('@iut-dhaka.edu') && !email.endsWith('@iut_dhaka.edu')) {
      console.log(`Skipping non-IUT email: ${email}`);
      skippedCount++;
      continue;
    }

    const cleanEmail = email.replace('@iut_dhaka.edu', '@iut-dhaka.edu');

    if (processedIds.has(studentId)) {
      console.log(`Skipping duplicate student ID: ${studentId} for ${cleanEmail}`);
      skippedCount++;
      continue;
    }
    
    processedIds.add(studentId);

    const role = (cleanEmail === 'syedmahi@iut-dhaka.edu' || cleanEmail === 'cr@iut-dhaka.edu') 
      ? Role.super_admin 
      : Role.student;

    try {
      await prisma.user.upsert({
        where: { email: cleanEmail },
        update: {
          name,
          nickname,
          studentId,
          phone,
          dob,
          gender,
          bloodGroup,
          role
        },
        create: {
          email: cleanEmail,
          name,
          nickname,
          studentId,
          phone,
          dob,
          gender,
          bloodGroup,
          passwordHash,
          role
        }
      });
      console.log(`✅ Upserted ${cleanEmail} (${role})`);
      successCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Failed to upsert ${cleanEmail}:`, message);
    }
  }

  console.log(`\n🎉 Done! Seeded ${successCount} students. Skipped ${skippedCount}.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
