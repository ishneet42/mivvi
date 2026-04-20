-- Mivvi: pgvector for the RAG balance assistant.
-- text-embedding-3-small produces 1536-dim vectors.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- IVFFlat index with cosine distance. `lists = 100` is a reasonable default
-- for <~100k rows; retune if the corpus grows.
CREATE INDEX IF NOT EXISTS "Expense_embedding_idx"
  ON "Expense" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
