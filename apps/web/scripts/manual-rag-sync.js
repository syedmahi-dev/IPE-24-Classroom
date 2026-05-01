const { PrismaClient } = require('@prisma/client')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const prisma = new PrismaClient()

// Quick embedding logic (copies what embeddings.ts does)
async function getEmbedding(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(text)
  return result.embedding.values
}

// Quick chunking logic
function chunkText(text) {
  const chunks = []
  const sentences = text.split('\n\n')
  for (const s of sentences) {
    if (s.trim().length > 10) chunks.push(s.trim())
  }
  return chunks
}

async function main() {
  console.log('--- RE-SYNCING RAG VIRTUAL CR ---')

  const docs = await prisma.knowledgeDocument.findMany()
  if (docs.length === 0) {
    console.log('No documents found to reindex! Please run the API endpoint when the server is up.')
    return
  }

  console.log(`Found ${docs.length} documents. Indexing...`)
  
  for (const doc of docs) {
    await prisma.knowledgeChunk.deleteMany({ where: { documentId: doc.id } })
    const textChunks = chunkText(doc.content)
    
    for (let i = 0; i < textChunks.length; i++) {
      try {
        const embedding = await getEmbedding(textChunks[i])
        await prisma.$executeRaw`
          INSERT INTO knowledge_chunks (id, "documentId", "chunkIndex", content, embedding, "createdAt")
          VALUES (gen_random_uuid(), ${doc.id}::text, ${i}, ${textChunks[i]}, ${embedding}::vector, NOW())
        `
        console.log(`Indexed chunk ${i+1}/${textChunks.length} for doc: ${doc.title}`)
      } catch (err) {
        console.error(`Failed chunk ${i}:`, err.message)
      }
    }
  }

  console.log('✅ RAG SYSTEM RESTORED')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
