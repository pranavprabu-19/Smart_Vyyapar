// Run with: npx tsx scripts/export-transactions.ts
// Outputs: ml-service/transactions.json

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    // Fetch every invoice with its product list
    const invoices = await prisma.invoice.findMany({
        include: { items: true },
        // Only use invoices with 2+ items - 1-item bills teach nothing
        where: { items: { some: {} } }
    })

    // Shape each invoice into a flat basket: { invoiceId, productIds[], productNames[] }
    const baskets = invoices
        .map(inv => ({
            invoiceId: inv.id,
            productIds: inv.items.map(i => i.productId),
            productNames: inv.items.map(i => i.description)
        }))
        .filter(b => b.productIds.length >= 2) // discard single-item baskets

    const targetPath = path.join(process.cwd(), 'ml-service', 'transactions.json')
    
    fs.writeFileSync(
        targetPath,
        JSON.stringify(baskets, null, 2)
    )

    console.log(`Exported ${baskets.length} baskets from ${invoices.length} invoices to ${targetPath}`)
    await prisma.$disconnect()
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
