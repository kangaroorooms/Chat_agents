import { Request, Response } from 'express'
import { z } from 'zod'

import { UserService } from './user.service'
import { CreateUserSchema, UpdateUserSchema, ListUsersQuerySchema } from './user.dto'
import { auditLogService } from '../audit/audit.service'

const userService = new UserService()

export const getMe = async (req: Request, res: Response) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ message: 'Missing auth' })

  const user = await userService.getMe(userId)
  return res.json(user)
}

export const getUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Missing auth' })

    const parsed = ListUsersQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid query parameters', details: parsed.error.format() })
    }

    const users = await userService.getUsers(userId, parsed.data)
    return res.json(users)
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(String(req.params.id))
    return res.json(user)
  } catch (error) {
    return res.status(404).json({ message: error instanceof Error ? error.message : 'User not found' })
  }
}

export const createUser = async (req: Request, res: Response) => {
  try {
    const parsed = CreateUserSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', details: parsed.error.format() })
    }

    const user = await userService.createUser(parsed.data)
    if (user.companyId) await auditLogService.log(user.companyId, 'USER_CREATED', 'user', user.id, req.userId)
    return res.status(201).json(user)
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Unable to create user' })
  }
}

export const updateUser = async (req: Request, res: Response) => {
  try {
    const parsed = UpdateUserSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', details: parsed.error.format() })
    }

    const user = await userService.updateUser(String(req.params.id), parsed.data)
    if (user.companyId) await auditLogService.log(user.companyId, 'USER_UPDATED', 'user', user.id, req.userId)
    return res.json(user)
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to update user' })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const target = await userService.getUserById(String(req.params.id))
    await userService.deleteUser(String(req.params.id))
    if (target.companyId) await auditLogService.log(target.companyId, 'USER_DELETED', 'user', target.id, req.userId)
    return res.json({ success: true })
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to delete user' })
  }
}

export const searchAgents = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Missing auth', data: null })

    const rawLimit = Number(req.query.limit ?? 20)
    const limit = Number.isFinite(rawLimit) ? rawLimit : 20
    const result = await userService.searchAgents(
      userId,
      typeof req.query.search === 'string' ? req.query.search : undefined,
      typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
      limit,
    )

    return res.json({ success: true, data: result.items, pagination: result.pagination })
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to search support agents', data: null })
  }
}
