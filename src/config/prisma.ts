import { PrismaClient } from "@prisma/client";
import { dbQueryDuration } from '../infrastructure/metrics'

export const prisma = new PrismaClient().$extends({
	query: {
		$allModels: {
			async $allOperations({ operation, query, args }: { operation: string; query: (args: unknown) => Promise<unknown>; args: unknown }) {
				const started = process.hrtime.bigint()
				try {
					return await query(args)
				} finally {
					const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000_000
					dbQueryDuration.observe({ operation }, elapsed)
				}
			},
		},
	},
})