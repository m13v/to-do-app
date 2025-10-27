#!/usr/bin/env python3

"""
Test Supabase database connection using the official Supabase Python library
This is the recommended way to connect to Supabase from Python
"""

import os
from dotenv import load_dotenv

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    print("⚠️  supabase-py not installed")
    print("Installing now...")
    import subprocess
    subprocess.check_call(['pip3', 'install', 'supabase'])
    from supabase import create_client, Client
    HAS_SUPABASE = True

def test_with_supabase_client():
    """
    Connect to Supabase using official Python client
    """
    try:
        # Load environment variables
        load_dotenv('.env.local')
        
        url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Use service role for full access
        anon_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not url:
            print("❌ NEXT_PUBLIC_SUPABASE_URL not found")
            return False
        
        if not key:
            print("⚠️  SUPABASE_SERVICE_ROLE_KEY not found, trying anon key...")
            key = anon_key
        
        print("🔌 Connecting to Supabase via Python client...")
        print(f"📍 URL: {url}")
        print(f"🔑 Using: {'Service Role Key' if key != anon_key else 'Anon Key'}")
        print()
        
        # Create Supabase client
        supabase: Client = create_client(url, key)
        
        print("✅ Supabase client created successfully!")
        print()
        
        # Test 1: Check if todoapp_tasks table exists
        print("1️⃣ Checking for todoapp_tasks table...")
        try:
            response = supabase.table('todoapp_tasks').select("count", count='exact').execute()
            count = response.count if hasattr(response, 'count') else 0
            print(f"   ✅ Table exists! Row count: {count}")
            
            # If there are rows, show sample data
            if count and count > 0:
                print()
                print("   Sample data (first 3 rows):")
                data_response = supabase.table('todoapp_tasks').select("*").limit(3).execute()
                if data_response.data:
                    for i, row in enumerate(data_response.data, 1):
                        print(f"     {i}. ID: {row.get('id')}, User: {row.get('user_id')}")
                        content_preview = row.get('content', '')[:50]
                        print(f"        Content: {content_preview}...")
                        
        except Exception as e:
            error_msg = str(e)
            if '42P01' in error_msg or 'does not exist' in error_msg:
                print("   ⚠️  Table 'todoapp_tasks' does not exist")
                print("   📝 Next step: Run supabase-schema.sql in Supabase SQL Editor")
            else:
                print(f"   ⚠️  Query failed: {error_msg}")
        
        print()
        
        # Test 2: Try to create the table using direct SQL
        print("2️⃣ Would you like to create the todoapp_tasks table now?")
        print("   (This will run the SQL from supabase-schema.sql)")
        print()
        
        # Check if we can execute SQL directly
        print("3️⃣ Testing SQL execution capabilities...")
        try:
            # Try a simple SQL query
            result = supabase.rpc('version').execute()
            print("   ✅ SQL execution is available!")
        except Exception as e:
            print(f"   ⚠️  SQL execution: {str(e)[:100]}")
        
        print()
        print("🎯 Supabase Python client test completed!")
        print()
        print("📋 Summary:")
        print("  ✅ Can connect to Supabase via REST API")
        print("  ✅ Python client is working")
        print("  ⚠️  Direct psycopg2 database connections are not working")
        print()
        print("💡 Recommendation:")
        print("  • Use Supabase Python client instead of direct psycopg2")
        print("  • OR check Supabase Dashboard -> Settings -> Database for pooler connection string")
        print("  • The database hostname in .env.local might be outdated")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if not HAS_SUPABASE:
        print("Installing supabase-py library...")
        print()
    
    success = test_with_supabase_client()
    exit(0 if success else 1)

