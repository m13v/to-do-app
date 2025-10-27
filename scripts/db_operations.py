#!/usr/bin/env python3

"""
Database operations script using psycopg2
Similar to the reference script provided
"""

import psycopg2
import os
from dotenv import load_dotenv
import time

def get_database_connection():
    """
    Get database connection using credentials from .env.local
    """
    load_dotenv('.env.local')
    conn_string = os.getenv('SUPABASE_CONNECTION_STRING')
    
    if not conn_string:
        raise Exception("SUPABASE_CONNECTION_STRING not found in .env.local")
    
    # Connect to database
    conn = psycopg2.connect(conn_string)
    return conn

def create_tables():
    """
    Create todoapp_tasks table if it doesn't exist
    """
    try:
        conn = get_database_connection()
        conn.autocommit = True
        cur = conn.cursor()
        
        print("🔧 CREATING DATABASE TABLES")
        print("=" * 60)
        print()
        
        # Read and execute schema
        print("1️⃣ Creating todoapp_tasks table...")
        
        start_time = time.time()
        
        # Create table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS todoapp_tasks (
              id BIGSERIAL PRIMARY KEY,
              user_id TEXT NOT NULL,
              content TEXT NOT NULL,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        
        # Create unique index
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS todoapp_tasks_user_id_key 
            ON todoapp_tasks(user_id);
        """)
        
        # Enable RLS
        cur.execute("""
            ALTER TABLE todoapp_tasks ENABLE ROW LEVEL SECURITY;
        """)
        
        duration = time.time() - start_time
        print(f"   ✅ Table created successfully ({duration:.2f}s)")
        print()
        
        # Create policies
        print("2️⃣ Creating RLS policies...")
        
        # Drop existing policies if they exist
        cur.execute("""
            DROP POLICY IF EXISTS "Users can view their own tasks" ON todoapp_tasks;
        """)
        cur.execute("""
            DROP POLICY IF EXISTS "Users can insert their own tasks" ON todoapp_tasks;
        """)
        cur.execute("""
            DROP POLICY IF EXISTS "Users can update their own tasks" ON todoapp_tasks;
        """)
        cur.execute("""
            DROP POLICY IF EXISTS "Users can delete their own tasks" ON todoapp_tasks;
        """)
        
        # Create new policies
        cur.execute("""
            CREATE POLICY "Users can view their own tasks"
              ON todoapp_tasks
              FOR SELECT
              USING (auth.uid()::text = user_id);
        """)
        
        cur.execute("""
            CREATE POLICY "Users can insert their own tasks"
              ON todoapp_tasks
              FOR INSERT
              WITH CHECK (auth.uid()::text = user_id);
        """)
        
        cur.execute("""
            CREATE POLICY "Users can update their own tasks"
              ON todoapp_tasks
              FOR UPDATE
              USING (auth.uid()::text = user_id)
              WITH CHECK (auth.uid()::text = user_id);
        """)
        
        cur.execute("""
            CREATE POLICY "Users can delete their own tasks"
              ON todoapp_tasks
              FOR DELETE
              USING (auth.uid()::text = user_id);
        """)
        
        print("   ✅ RLS policies created successfully")
        print()
        
        # Verify table
        print("3️⃣ Verifying table creation...")
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'todoapp_tasks'
            ORDER BY ordinal_position;
        """)
        
        columns = cur.fetchall()
        print("   ✅ Table structure:")
        for col_name, col_type in columns:
            print(f"     - {col_name}: {col_type}")
        print()
        
        # Check current row count
        cur.execute("SELECT COUNT(*) FROM todoapp_tasks;")
        count = cur.fetchone()[0]
        print(f"   📊 Current row count: {count}")
        print()
        
        print("🎯 TABLE CREATION COMPLETE!")
        print()
        
        cur.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def query_database():
    """
    Query database and show results
    """
    try:
        conn = get_database_connection()
        cur = conn.cursor()
        
        print("📊 QUERYING DATABASE")
        print("=" * 60)
        print()
        
        # Get table info
        print("1️⃣ Table statistics...")
        cur.execute("SELECT COUNT(*) FROM todoapp_tasks;")
        count = cur.fetchone()[0]
        print(f"   Total rows: {count}")
        print()
        
        if count > 0:
            # Get recent tasks
            print("2️⃣ Recent tasks (last 5)...")
            cur.execute("""
                SELECT id, user_id, LEFT(content, 50) as content_preview, 
                       created_at, updated_at
                FROM todoapp_tasks 
                ORDER BY created_at DESC 
                LIMIT 5;
            """)
            
            rows = cur.fetchall()
            for row in rows:
                print(f"   ID {row[0]}: {row[1]}")
                print(f"      Content: {row[2]}...")
                print(f"      Created: {row[3]}")
                print()
            
            # User statistics
            print("3️⃣ User statistics...")
            cur.execute("""
                SELECT user_id, COUNT(*) as task_count
                FROM todoapp_tasks
                GROUP BY user_id
                ORDER BY task_count DESC;
            """)
            
            user_stats = cur.fetchall()
            for user_id, task_count in user_stats:
                print(f"   User {user_id}: {task_count} task list(s)")
        else:
            print("   No tasks found in database")
        
        print()
        print("🎯 QUERY COMPLETE!")
        
        cur.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_connection():
    """
    Test database connection
    """
    try:
        print("🔌 TESTING DATABASE CONNECTION")
        print("=" * 60)
        print()
        
        conn = get_database_connection()
        cur = conn.cursor()
        
        # Get PostgreSQL version
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"✅ Connected successfully!")
        print(f"📊 PostgreSQL version: {version[:80]}...")
        print()
        
        # List tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cur.fetchall()
        print(f"📋 Tables in database: {len(tables)}")
        for table in tables:
            print(f"   • {table[0]}")
        print()
        
        cur.close()
        conn.close()
        
        print("🎯 CONNECTION TEST COMPLETE!")
        return True
        
    except Exception as e:
        print(f"❌ CONNECTION FAILED: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 db_operations.py test      # Test connection")
        print("  python3 db_operations.py create    # Create tables")
        print("  python3 db_operations.py query     # Query database")
        print()
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "test":
        success = test_connection()
    elif command == "create":
        success = create_tables()
    elif command == "query":
        success = query_database()
    else:
        print(f"Unknown command: {command}")
        success = False
    
    sys.exit(0 if success else 1)

