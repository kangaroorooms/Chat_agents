import { z } from 'zod'
import type { AITool } from './tool.types'
import { UserService } from '../../users/user.service'

const schema = z.object({
  customerId: z.string(),
})

const userService = new UserService()

export const LookupCustomerTool: AITool<z.infer<typeof schema>, any> = {
  name: 'lookupCustomer',
  description: 'Lookup basic customer information via UserService',
  inputSchema: schema,
  async execute(input) {
    return userService.getMe(input.customerId)
  },
}
