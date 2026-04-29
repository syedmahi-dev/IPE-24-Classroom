'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function addWhitelistedStudent(formData: FormData) {
  const session = await auth() as any
  if (session?.user?.role !== 'super_admin') {
    return { error: 'Unauthorized. Only super admin can add students.' }
  }

  const email = formData.get('email') as string
  const name = formData.get('name') as string

  if (!email || !email.includes('@')) {
    return { error: 'Valid email is required.' }
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { error: 'User already exists.' }
    }

    await prisma.user.create({
      data: {
        email,
        name: name || 'Student',
        role: Role.student,
      }
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to add student:', error)
    return { error: 'Failed to add student to whitelist.' }
  }
}

export async function changeUserRole(userId: string, newRole: string) {
  const session = await auth() as any
  if (session?.user?.role !== 'super_admin') {
    return { error: 'Unauthorized.' }
  }

  // Prevent super_admin promotion from UI
  if (newRole === 'super_admin') {
    return { error: 'Super Admin can only be added by codebase or directly in DB.' }
  }

  if (!['student', 'admin'].includes(newRole)) {
    return { error: 'Invalid role.' }
  }

  try {
    const userToUpdate = await prisma.user.findUnique({ where: { id: userId } })
    if (!userToUpdate) return { error: 'User not found.' }
    
    if (userToUpdate.role === 'super_admin') {
      return { error: 'Cannot modify a super admin.' }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as Role }
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Failed to update role:', error)
    return { error: 'Failed to update role.' }
  }
}

