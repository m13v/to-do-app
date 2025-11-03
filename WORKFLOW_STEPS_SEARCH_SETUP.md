# Workflow Steps Search System Setup Guide

**Two-Stage Search Architecture for Supabase**

This guide sets up a scalable workflow execution steps database with keyword + vector similarity search, optimized for 100k → 10M records.

---

## Architecture Overview

```
Stage 1: Postgres Full-Text Search
  ↓ Keywords + Filters + Ranking
  ↓ Returns: Top 500 step IDs

Stage 2: Postgres pgvector Search
  ↓ Similarity search within those 500 IDs
  ↓ Returns: Top 20 most similar steps

Cloudflare R2: Large UI/DOM trees (on-demand)
```

---

## Database Schema

### 1. Main Steps Table

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Main steps table
CREATE TABLE workflow_steps (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identifiers
  app_name TEXT NOT NULL,
  window_title TEXT NOT NULL,
  element_path TEXT NOT NULL,  -- JSON or text path
  
  -- Step definition
  step_name TEXT NOT NULL,
  definition TEXT,  -- Code snippet (keep if <10KB)
  
  -- Execution statistics
  succeeded INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  duration_ms INTEGER,  -- Average duration in milliseconds
  
  -- Computed ranking (updated periodically)
  ranking NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN (succeeded + failed) = 0 THEN 0
      ELSE (
        -- Success rate (40%)
        (succeeded::NUMERIC / (succeeded + failed)) * 0.4 +
        -- Frequency normalized (30%)
        LEAST((succeeded + failed)::NUMERIC / 100, 1.0) * 0.3 +
        -- Recency score (20%) - days since last execution
        GREATEST(1.0 - (EXTRACT(EPOCH FROM (NOW() - last_executed_at)) / 2592000), 0) * 0.2 +
        -- Speed score (10%) - inverse of duration
        CASE WHEN duration_ms > 0 
          THEN LEAST(1000.0 / duration_ms, 1.0) * 0.1 
          ELSE 0 
        END
      ) * 100
    END
  ) STORED,
  
  -- Large data references (store in R2, not in DB)
  state_object_key TEXT,  -- R2 key: {step_id}_state.json.gz
  outcome_diff_key TEXT,  -- R2 key: {step_id}_outcome.json.gz
  
  -- Metadata
  workflow_name TEXT NOT NULL,
  workflow_description TEXT,
  terminator_version TEXT,
  environment TEXT,
  author TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vector embeddings (for similarity search)
  definition_embedding vector(768),  -- For step definition similarity
  workflow_embedding vector(768),    -- For workflow similarity
  
  -- Full-text search (tsvector)
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(app_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(window_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(step_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(element_path, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(workflow_name, '')), 'B')
  ) STORED
);

-- Comments for documentation
COMMENT ON TABLE workflow_steps IS 'Stores workflow execution step history with search optimization';
COMMENT ON COLUMN workflow_steps.ranking IS 'Computed score based on success rate, frequency, recency, and speed';
COMMENT ON COLUMN workflow_steps.search_vector IS 'Full-text search index across searchable fields';
COMMENT ON COLUMN workflow_steps.state_object_key IS 'R2 reference to large state/UI tree JSON';
COMMENT ON COLUMN workflow_steps.outcome_diff_key IS 'R2 reference to before/after UI tree diffs';
```

### 2. Create Indexes

```sql
-- Primary search indexes
CREATE INDEX idx_steps_app ON workflow_steps(app_name);
CREATE INDEX idx_steps_window ON workflow_steps(window_title);
CREATE INDEX idx_steps_app_window ON workflow_steps(app_name, window_title);
CREATE INDEX idx_steps_workflow ON workflow_steps(workflow_name);
CREATE INDEX idx_steps_author ON workflow_steps(author);

-- Ranking index (for sorting)
CREATE INDEX idx_steps_ranking ON workflow_steps(ranking DESC);

-- Full-text search index (GIN)
CREATE INDEX idx_steps_search_vector ON workflow_steps USING GIN(search_vector);

-- Timestamp indexes (for filtering by date)
CREATE INDEX idx_steps_created_at ON workflow_steps(created_at DESC);
CREATE INDEX idx_steps_last_executed ON workflow_steps(last_executed_at DESC);

-- Vector similarity indexes (HNSW for fast similarity search)
CREATE INDEX idx_steps_definition_embedding ON workflow_steps 
USING hnsw (definition_embedding vector_cosine_ops);

CREATE INDEX idx_steps_workflow_embedding ON workflow_steps 
USING hnsw (workflow_embedding vector_cosine_ops);

-- Composite indexes for common query patterns
CREATE INDEX idx_steps_app_ranking ON workflow_steps(app_name, ranking DESC);
CREATE INDEX idx_steps_workflow_ranking ON workflow_steps(workflow_name, ranking DESC);
```

### 3. Optional: Usage Analytics Table (Separate)

```sql
-- Track usage without polluting main table with frequent updates
CREATE TABLE step_analytics (
  step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
  month DATE NOT NULL,  -- Partition key: YYYY-MM-01
  times_appeared_in_search INTEGER DEFAULT 0,
  times_viewed INTEGER DEFAULT 0,
  times_executed INTEGER DEFAULT 0,
  PRIMARY KEY (step_id, month)
);

CREATE INDEX idx_analytics_month ON step_analytics(month);
```

---

## Two-Stage Search Implementation

### Stage 1: Keyword Search + Filters

```sql
-- Function: Keyword search with metadata filters
CREATE OR REPLACE FUNCTION search_steps_keyword(
  search_query TEXT,
  filter_app TEXT DEFAULT NULL,
  filter_window TEXT DEFAULT NULL,
  filter_workflow TEXT DEFAULT NULL,
  filter_author TEXT DEFAULT NULL,
  date_from TIMESTAMPTZ DEFAULT NULL,
  date_to TIMESTAMPTZ DEFAULT NULL,
  min_succeeded INTEGER DEFAULT 0,
  result_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  step_id UUID,
  app_name TEXT,
  window_title TEXT,
  step_name TEXT,
  workflow_name TEXT,
  ranking NUMERIC,
  succeeded INTEGER,
  failed INTEGER,
  last_executed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.id,
    ws.app_name,
    ws.window_title,
    ws.step_name,
    ws.workflow_name,
    ws.ranking,
    ws.succeeded,
    ws.failed,
    ws.last_executed_at
  FROM workflow_steps ws
  WHERE 
    -- Full-text search
    (search_query IS NULL OR ws.search_vector @@ websearch_to_tsquery('english', search_query))
    -- Metadata filters
    AND (filter_app IS NULL OR ws.app_name = filter_app)
    AND (filter_window IS NULL OR ws.window_title = filter_window)
    AND (filter_workflow IS NULL OR ws.workflow_name = filter_workflow)
    AND (filter_author IS NULL OR ws.author = filter_author)
    -- Date range
    AND (date_from IS NULL OR ws.last_executed_at >= date_from)
    AND (date_to IS NULL OR ws.last_executed_at <= date_to)
    -- Quality filter
    AND ws.succeeded >= min_succeeded
  ORDER BY 
    ws.ranking DESC,
    ts_rank_cd(ws.search_vector, websearch_to_tsquery('english', search_query)) DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Stage 2: Vector Similarity Search

```sql
-- Function: Vector similarity search on filtered subset
CREATE OR REPLACE FUNCTION search_steps_similarity(
  step_ids UUID[],
  query_embedding vector(768),
  embedding_type TEXT DEFAULT 'definition',  -- 'definition' or 'workflow'
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  step_id UUID,
  app_name TEXT,
  window_title TEXT,
  step_name TEXT,
  definition TEXT,
  workflow_name TEXT,
  ranking NUMERIC,
  similarity_score NUMERIC
) AS $$
BEGIN
  IF embedding_type = 'definition' THEN
    RETURN QUERY
    SELECT 
      ws.id,
      ws.app_name,
      ws.window_title,
      ws.step_name,
      ws.definition,
      ws.workflow_name,
      ws.ranking,
      (1 - (ws.definition_embedding <=> query_embedding))::NUMERIC as similarity_score
    FROM workflow_steps ws
    WHERE 
      ws.id = ANY(step_ids)
      AND ws.definition_embedding IS NOT NULL
    ORDER BY ws.definition_embedding <=> query_embedding
    LIMIT result_limit;
  ELSE
    RETURN QUERY
    SELECT 
      ws.id,
      ws.app_name,
      ws.window_title,
      ws.step_name,
      ws.definition,
      ws.workflow_name,
      ws.ranking,
      (1 - (ws.workflow_embedding <=> query_embedding))::NUMERIC as similarity_score
    FROM workflow_steps ws
    WHERE 
      ws.id = ANY(step_ids)
      AND ws.workflow_embedding IS NOT NULL
    ORDER BY ws.workflow_embedding <=> query_embedding
    LIMIT result_limit;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Combined Two-Stage Function

```sql
-- Function: Complete two-stage search
CREATE OR REPLACE FUNCTION search_steps_two_stage(
  search_query TEXT,
  query_embedding vector(768) DEFAULT NULL,
  filter_app TEXT DEFAULT NULL,
  filter_window TEXT DEFAULT NULL,
  filter_workflow TEXT DEFAULT NULL,
  stage1_limit INTEGER DEFAULT 500,
  stage2_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  step_id UUID,
  app_name TEXT,
  window_title TEXT,
  step_name TEXT,
  definition TEXT,
  workflow_name TEXT,
  ranking NUMERIC,
  keyword_rank INTEGER,
  similarity_score NUMERIC,
  combined_score NUMERIC
) AS $$
DECLARE
  filtered_ids UUID[];
BEGIN
  -- Stage 1: Keyword search
  SELECT ARRAY_AGG(id) INTO filtered_ids
  FROM (
    SELECT ws.id
    FROM workflow_steps ws
    WHERE 
      (search_query IS NULL OR ws.search_vector @@ websearch_to_tsquery('english', search_query))
      AND (filter_app IS NULL OR ws.app_name = filter_app)
      AND (filter_window IS NULL OR ws.window_title = filter_window)
      AND (filter_workflow IS NULL OR ws.workflow_name = filter_workflow)
    ORDER BY ws.ranking DESC
    LIMIT stage1_limit
  ) stage1_results;

  -- Stage 2: Vector similarity (if embedding provided)
  IF query_embedding IS NOT NULL AND filtered_ids IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      ws.id,
      ws.app_name,
      ws.window_title,
      ws.step_name,
      ws.definition,
      ws.workflow_name,
      ws.ranking,
      NULL::INTEGER as keyword_rank,
      (1 - (ws.definition_embedding <=> query_embedding))::NUMERIC as similarity_score,
      -- Combined score: 30% ranking, 70% similarity
      (ws.ranking * 0.003 + (1 - (ws.definition_embedding <=> query_embedding)) * 0.7)::NUMERIC as combined_score
    FROM workflow_steps ws
    WHERE 
      ws.id = ANY(filtered_ids)
      AND ws.definition_embedding IS NOT NULL
    ORDER BY combined_score DESC
    LIMIT stage2_limit;
  ELSE
    -- No embedding: return keyword results only
    RETURN QUERY
    SELECT 
      ws.id,
      ws.app_name,
      ws.window_title,
      ws.step_name,
      ws.definition,
      ws.workflow_name,
      ws.ranking,
      ROW_NUMBER() OVER ()::INTEGER as keyword_rank,
      NULL::NUMERIC as similarity_score,
      (ws.ranking / 100.0)::NUMERIC as combined_score
    FROM workflow_steps ws
    WHERE ws.id = ANY(filtered_ids)
    ORDER BY ws.ranking DESC
    LIMIT stage2_limit;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Cloudflare R2 Integration

### Setup R2 Bucket

```bash
# Using Wrangler CLI
wrangler r2 bucket create workflow-steps-storage

# Or use Cloudflare Dashboard:
# 1. Go to R2 in Cloudflare Dashboard
# 2. Create bucket: workflow-steps-storage
# 3. Get access credentials
```

### Environment Variables (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=workflow-steps-storage
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### Helper Functions for R2

```typescript
// lib/r2-storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  key: string,
  data: any,
  compress: boolean = true
): Promise<string> {
  const jsonString = JSON.stringify(data);
  const content = compress 
    ? await gzipAsync(Buffer.from(jsonString))
    : Buffer.from(jsonString);
  
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: content,
      ContentType: compress ? 'application/gzip' : 'application/json',
    })
  );
  
  return key;
}

export async function downloadFromR2(
  key: string,
  compressed: boolean = true
): Promise<any> {
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
  
  const bodyBuffer = await response.Body?.transformToByteArray();
  if (!bodyBuffer) throw new Error('Empty response from R2');
  
  const content = compressed
    ? await gunzipAsync(Buffer.from(bodyBuffer))
    : Buffer.from(bodyBuffer);
  
  return JSON.parse(content.toString());
}
```

---

## API Implementation

### Create Step API

```typescript
// app/api/steps/route.ts
import { createClient } from '@supabase/supabase-js';
import { uploadToR2 } from '@/lib/r2-storage';
import { generateEmbedding } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();
  
  const {
    app_name,
    window_title,
    element_path,
    step_name,
    definition,
    current_state,     // Large object
    outcome_diff,      // Large object
    workflow_name,
    workflow_description,
    terminator_version,
    environment,
    author,
  } = body;
  
  // Generate embeddings
  const definition_embedding = await generateEmbedding(
    `${step_name} ${definition}`
  );
  const workflow_embedding = await generateEmbedding(
    `${workflow_name} ${workflow_description}`
  );
  
  // Upload large objects to R2
  const step_id = crypto.randomUUID();
  const state_object_key = current_state 
    ? await uploadToR2(`${step_id}_state.json.gz`, current_state)
    : null;
  const outcome_diff_key = outcome_diff
    ? await uploadToR2(`${step_id}_outcome.json.gz`, outcome_diff)
    : null;
  
  // Insert into Supabase
  const { data, error } = await supabase
    .from('workflow_steps')
    .insert({
      id: step_id,
      app_name,
      window_title,
      element_path,
      step_name,
      definition,
      state_object_key,
      outcome_diff_key,
      workflow_name,
      workflow_description,
      terminator_version,
      environment,
      author,
      definition_embedding,
      workflow_embedding,
    })
    .select()
    .single();
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ data });
}
```

### Two-Stage Search API

```typescript
// app/api/steps/search/route.ts
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();
  
  const {
    search_query,
    similarity_query,  // Text to generate embedding from
    filter_app,
    filter_window,
    filter_workflow,
    stage1_limit = 500,
    stage2_limit = 20,
  } = body;
  
  // Generate embedding if similarity search requested
  const query_embedding = similarity_query
    ? await generateEmbedding(similarity_query)
    : null;
  
  // Call two-stage search function
  const { data, error } = await supabase.rpc('search_steps_two_stage', {
    search_query,
    query_embedding,
    filter_app,
    filter_window,
    filter_workflow,
    stage1_limit,
    stage2_limit,
  });
  
  if (error) {
    console.error('Search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ 
    results: data,
    stage1_limit,
    stage2_limit,
    has_similarity: !!query_embedding,
  });
}
```

### Update Execution Stats API

```typescript
// app/api/steps/[id]/execute/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { success, duration_ms } = body;
  
  // Atomic increment
  const { data, error } = await supabase.rpc('increment_step_stats', {
    step_id: params.id,
    is_success: success,
    execution_duration: duration_ms,
  });
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ data });
}

// SQL function for atomic updates
/*
CREATE OR REPLACE FUNCTION increment_step_stats(
  step_id UUID,
  is_success BOOLEAN,
  execution_duration INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE workflow_steps
  SET 
    succeeded = CASE WHEN is_success THEN succeeded + 1 ELSE succeeded END,
    failed = CASE WHEN NOT is_success THEN failed + 1 ELSE failed END,
    duration_ms = CASE 
      WHEN duration_ms IS NULL THEN execution_duration
      ELSE (duration_ms * 0.8 + execution_duration * 0.2)::INTEGER  -- Moving average
    END,
    last_executed_at = NOW()
  WHERE id = step_id;
END;
$$ LANGUAGE plpgsql;
*/
```

---

## Embedding Generation

### Using OpenAI API

```typescript
// lib/embeddings.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate to ~8000 tokens (model limit)
  const truncated = text.slice(0, 30000);
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',  // 768 dimensions, cheap
    input: truncated,
  });
  
  return response.data[0].embedding;
}

export async function generateEmbeddingBatch(
  texts: string[]
): Promise<number[][]> {
  const truncated = texts.map(t => t.slice(0, 30000));
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncated,
  });
  
  return response.data.map(d => d.embedding);
}
```

### Alternative: Using Supabase Edge Functions

```typescript
// supabase/functions/generate-embedding/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { text } = await req.json();
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 30000),
    }),
  });
  
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Performance Optimization

### 1. Vacuum and Analyze (Periodic Maintenance)

```sql
-- Run weekly (or use Supabase's auto-vacuum)
VACUUM ANALYZE workflow_steps;

-- Reindex if needed
REINDEX TABLE workflow_steps;
```

### 2. Monitor Query Performance

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Check slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%workflow_steps%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 3. Connection Pooling

```typescript
// Use Supabase's built-in pooling
import { createClient } from '@supabase/supabase-js';

// For serverless (Next.js API routes)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
  }
);
```

---

## Testing the Setup

### 1. Insert Test Data

```sql
-- Insert sample step
INSERT INTO workflow_steps (
  app_name,
  window_title,
  element_path,
  step_name,
  definition,
  workflow_name,
  workflow_description,
  terminator_version,
  environment,
  author,
  succeeded,
  failed,
  duration_ms
) VALUES (
  'Chrome',
  'Settings',
  'Window > Panel > Button[name="Save"]',
  'Click save button',
  'await element.click({ button: "left" })',
  'Form Submission Workflow',
  'Workflow for submitting forms with validation',
  'v1.0.0',
  'production',
  'user@example.com',
  100,
  5,
  250
);
```

### 2. Test Keyword Search

```sql
-- Search for "button" in Chrome
SELECT * FROM search_steps_keyword(
  search_query := 'button',
  filter_app := 'Chrome',
  result_limit := 20
);
```

### 3. Test Two-Stage Search (from API)

```bash
curl -X POST http://localhost:3000/api/steps/search \
  -H "Content-Type: application/json" \
  -d '{
    "search_query": "button click",
    "similarity_query": "click the save button after validation",
    "filter_app": "Chrome",
    "stage2_limit": 10
  }'
```

---

## Migration from Existing Data

### If you have existing step data

```typescript
// scripts/migrate-to-new-schema.ts
import { createClient } from '@supabase/supabase-js';
import { generateEmbeddingBatch } from './lib/embeddings';
import { uploadToR2 } from './lib/r2-storage';

async function migrateSteps() {
  const supabase = createClient(/*...*/);
  
  // Fetch existing steps in batches
  const batchSize = 100;
  let offset = 0;
  
  while (true) {
    const { data: steps } = await supabase
      .from('old_steps_table')
      .select('*')
      .range(offset, offset + batchSize - 1);
    
    if (!steps || steps.length === 0) break;
    
    // Generate embeddings in batch
    const texts = steps.map(s => `${s.step_name} ${s.definition}`);
    const embeddings = await generateEmbeddingBatch(texts);
    
    // Process each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Upload large objects to R2
      const state_key = step.large_state
        ? await uploadToR2(`${step.id}_state.json.gz`, step.large_state)
        : null;
      
      // Insert into new schema
      await supabase.from('workflow_steps').insert({
        ...step,
        definition_embedding: embeddings[i],
        state_object_key: state_key,
      });
    }
    
    offset += batchSize;
    console.log(`Migrated ${offset} steps...`);
  }
}
```

---

## Cost Estimates

### Supabase (10M records)

**Pro Plan ($25/month):**
- 8GB database (plenty for metadata)
- 100GB bandwidth
- 50GB file storage (not using this, using R2)
- 500k Edge Function invocations

**Database add-on if needed:**
- Large compute: +$100/month (for high query volume)

**Total: $25-125/month**

### Cloudflare R2

**Storage (10M records × 100KB avg tree = 1TB):**
- $0.015/GB/month = $15/month

**Operations:**
- Class A (writes): $4.50 per million
- Class B (reads): $0.36 per million
- Estimate: $5-20/month

**Total: $20-35/month**

### OpenAI Embeddings

**text-embedding-3-small:**
- $0.02 per 1M tokens
- ~500 tokens per step = 5B tokens for 10M steps
- **One-time cost: $100 for initial embeddings**
- **Ongoing: $1-5/month for new steps**

### Total Cost

**Initial: $100 (embeddings)**
**Monthly: $45-160/month** (depending on traffic)

---

## Monitoring and Maintenance

### 1. Set up monitoring

```sql
-- Create monitoring view
CREATE OR REPLACE VIEW step_stats AS
SELECT 
  COUNT(*) as total_steps,
  COUNT(*) FILTER (WHERE succeeded > 0) as steps_with_success,
  AVG(ranking) as avg_ranking,
  SUM(succeeded) as total_successes,
  SUM(failed) as total_failures,
  pg_size_pretty(pg_total_relation_size('workflow_steps')) as table_size
FROM workflow_steps;

-- Check stats
SELECT * FROM step_stats;
```

### 2. Periodic cleanup

```sql
-- Archive old steps (>1 year)
-- Move to separate archive table or delete
DELETE FROM workflow_steps
WHERE created_at < NOW() - INTERVAL '1 year'
  AND succeeded = 0 
  AND failed = 0;
```

### 3. Ranking refresh (run daily)

```sql
-- Rankings auto-update via GENERATED column
-- But recompute if you change the formula:
-- ALTER TABLE workflow_steps DROP COLUMN ranking;
-- ALTER TABLE workflow_steps ADD COLUMN ranking ... (new formula)
```

---

## Next Steps

1. **Deploy the schema** to Supabase
2. **Set up R2 bucket** and credentials
3. **Implement APIs** for create/search/update
4. **Generate embeddings** for existing data
5. **Test two-stage search** with sample queries
6. **Monitor performance** and optimize indexes
7. **Set up periodic maintenance** jobs

---

## Troubleshooting

### Slow searches

- Check if indexes are being used: `EXPLAIN ANALYZE SELECT ...`
- Ensure `search_vector` generated column exists
- Verify HNSW indexes created for vector columns
- Check cache hit ratio (should be >95%)

### High costs

- Monitor R2 read operations (cache frequently accessed trees)
- Batch embedding generation
- Use connection pooling
- Implement result caching (Redis/KV)

### Out of memory

- Reduce `stage1_limit` (500 → 200)
- Upgrade Supabase compute tier
- Partition table by date if >10M records

---

## References

- [Supabase pgvector Guide](https://supabase.com/docs/guides/ai/vector-columns)
- [Postgres Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

