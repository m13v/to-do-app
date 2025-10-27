# Database Connection Guide

## 🎯 Summary

**Status**: ✅ Database connection works via Supabase Python client  
**Issue**: ❌ Direct psycopg2 connection not working (DNS resolution fails)

## 📋 What I Found

### Working Methods
1. **Supabase REST API** - Fully functional
2. **Supabase Python Client** - Works perfectly (recommended)

### Not Working
1. **Direct psycopg2 connection** - DNS hostname doesn't resolve
   - `db.degqfkytflmqwguhmxqt.supabase.co` → DNS lookup fails
2. **Pooler connections** - "Tenant or user not found" across all regions

## 🔧 Quick Start

### 1. Install Required Package
```bash
pip3 install supabase python-dotenv
```

### 2. Test Connection (Recommended Method)
```bash
python3 test_supabase_python.py
```

This uses the Supabase Python client which works reliably.

### 3. Setup Database Table
The `todoapp_tasks` table doesn't exist yet. You have two options:

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `degqfkytflmqwguhmxqt`
3. Go to SQL Editor
4. Copy and paste contents of `supabase-schema.sql`
5. Click "Run"

#### Option B: Check Status
```bash
python3 setup_database.py
```

## 📝 Scripts Created

| Script | Purpose | Status |
|--------|---------|--------|
| `test_db_connection.py` | Try psycopg2 connections | ❌ Not working |
| `test_supabase_api.py` | Test REST API | ✅ Works |
| `test_supabase_python.py` | Test Python client | ✅ Works |
| `setup_database.py` | Setup and test DB | ✅ Works (after table creation) |

## 💡 Why psycopg2 Doesn't Work

The direct database connection string in `.env.local` is not working because:

1. **DNS Resolution Fails**: `db.degqfkytflmqwguhmxqt.supabase.co` doesn't resolve
2. **Possible Causes**:
   - Direct database access might be disabled on your Supabase plan
   - Project was migrated and connection string is outdated  
   - Supabase changed their infrastructure

## 🔑 To Fix psycopg2 Connection

If you specifically need psycopg2 (like the reference script):

1. Go to Supabase Dashboard → Settings → Database → Connection Info
2. Look for "Connection Pooling" section
3. Select "Session" mode
4. Copy the connection string (should look like):
   ```
   postgresql://postgres.PROJECT:[PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres
   ```
5. Update `SUPABASE_CONNECTION_STRING` in `.env.local`
6. Run `python3 test_db_connection.py` again

## 🚀 Using Supabase Python Client (Recommended)

This is the modern, recommended approach:

```python
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Create client
supabase = create_client(url, key)

# Query data
response = supabase.table('todoapp_tasks').select("*").execute()
print(response.data)

# Insert data
supabase.table('todoapp_tasks').insert({
    "user_id": "test_user",
    "content": "My tasks..."
}).execute()
```

## 📊 Current Status

- ✅ Supabase project is **active**
- ✅ API endpoint is **responding**  
- ✅ Credentials are **valid**
- ⚠️ Table `todoapp_tasks` **needs to be created**
- ❌ Direct DB connection **not configured properly**

## 🎓 Next Steps

1. ✅ **Connection working** - Use `test_supabase_python.py`
2. ⏳ **Create table** - Run `supabase-schema.sql` in Supabase Dashboard
3. ✅ **Test again** - Run `setup_database.py` to verify
4. 🔄 **Optional** - Update connection pooler string if you need psycopg2

## 📞 Need Direct psycopg2 Access?

If you specifically need raw psycopg2 (for the reference script's functionality):

1. Check Supabase Dashboard for updated connection string
2. Ensure your Supabase plan supports direct database connections
3. Consider if Supabase Python client can meet your needs instead

The Supabase client provides the same functionality with better error handling and automatic connection pooling.

