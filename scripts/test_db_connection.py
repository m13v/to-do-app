#!/usr/bin/env python3

import psycopg2
import os
from dotenv import load_dotenv
import re

def test_database_connection():
    """
    Test database connection using credentials from .env.local
    Tries multiple connection methods: pooler and direct connection
    """
    try:
        # Load environment variables from .env.local
        load_dotenv('.env.local')
        
        # Get connection details
        conn_string = os.getenv('SUPABASE_CONNECTION_STRING')
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        
        if not conn_string:
            print("❌ SUPABASE_CONNECTION_STRING not found in .env.local")
            return False
        
        print("🔌 Attempting database connections...")
        print()
        
        # Parse connection string to extract components
        # Format: postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
        match = re.match(r'postgresql://([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:(\d+)/(\w+)', conn_string)
        
        if match:
            user, password, project_ref, port, database = match.groups()
            
            # Method 1: Try pooler connection (AWS region-based)
            # Correct format: postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres
            # Note: Uses aws-1 (not aws-0) and port 5432 (not 6543)
            regions = [
                'us-east-2', 'us-east-1', 'us-west-1', 'us-west-2',
                'eu-central-1', 'eu-west-1', 'eu-west-2',
                'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1'
            ]
            
            for region in regions:
                # Pooler format: username is "postgres.PROJECT_REF", uses aws-1, port 5432
                pooler_conn_string = f"postgresql://{user}.{project_ref}:{password}@aws-1-{region}.pooler.supabase.com:5432/{database}"
                
                print(f"🔄 Trying pooler connection (region: {region})...")
                try:
                    conn = psycopg2.connect(pooler_conn_string, connect_timeout=5)
                    print(f"✅ Pooler connection successful (region: {region})!")
                    print(f"📍 Working connection string format:")
                    print(f"   postgresql://{user}.{project_ref}:PASSWORD@aws-1-{region}.pooler.supabase.com:5432/{database}")
                    print()
                    return test_queries(conn)
                except Exception as e:
                    error_msg = str(e)
                    print(f"  ⚠️  Failed: {error_msg}")
                    # Also log if authentication failed specifically
                    if "authentication" in error_msg.lower() or "password" in error_msg.lower():
                        print(f"     (Authentication issue detected)")
                    continue
        
        # Method 2: Try direct connection (original)
        print()
        print("🔄 Trying direct database connection...")
        print(f"📍 Host: {conn_string.split('@')[1].split(':')[0] if '@' in conn_string else 'hidden'}")
        
        try:
            conn = psycopg2.connect(conn_string, connect_timeout=10)
            print("✅ Direct connection successful!")
            print()
            return test_queries(conn)
        except Exception as e:
            print(f"❌ Direct connection failed: {e}")
            print()
        
        # Method 3: Try IPv6 connection
        if match:
            print("🔄 Trying IPv6 connection...")
            ipv6_conn_string = f"postgresql://{user}:{password}@db.{project_ref}.supabase.co:{port}/{database}?options=-c%20client_encoding=utf8"
            try:
                conn = psycopg2.connect(ipv6_conn_string, connect_timeout=10)
                print("✅ IPv6 connection successful!")
                print()
                return test_queries(conn)
            except Exception as e:
                print(f"❌ IPv6 connection failed: {str(e)[:80]}")
                print()
        
        print("❌ All connection methods failed")
        print()
        print("Troubleshooting tips:")
        print("  1. Check Supabase project settings for correct database host/region")
        print("  2. Verify database credentials are correct in .env.local")
        print("  3. Check firewall/network settings")
        print("  4. Ensure psycopg2 is installed: pip install psycopg2-binary")
        print("  5. Try accessing Supabase dashboard to verify project is active")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_queries(conn):
    """
    Run test queries on the database connection
    """
    try:
        cur = conn.cursor()
        
        # Test: Get PostgreSQL version
        print("📊 Database Information:")
        cur.execute("SELECT version();")
        version = cur.fetchone()
        print(f"  PostgreSQL Version: {version[0][:80]}...")
        print()
        
        # Test: List all tables in public schema
        print("📋 Tables in public schema:")
        cur.execute("""
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        
        tables = cur.fetchall()
        if tables:
            for table, col_count in tables:
                print(f"  • {table} ({col_count} columns)")
        else:
            print("  (No tables found)")
        print()
        
        # Test: Check for todoapp_tasks table
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'todoapp_tasks'
            );
        """)
        
        if cur.fetchone()[0]:
            cur.execute("SELECT COUNT(*) FROM todoapp_tasks;")
            count = cur.fetchone()[0]
            print(f"📝 todoapp_tasks: {count} rows")
            
            # Show sample data if exists
            if count > 0:
                cur.execute("""
                    SELECT id, user_id, LEFT(content, 50) as content_preview, created_at 
                    FROM todoapp_tasks 
                    ORDER BY created_at DESC 
                    LIMIT 3;
                """)
                print("  Recent entries:")
                for row in cur.fetchall():
                    print(f"    - ID {row[0]}: {row[1]} | {row[2]}... | {row[3]}")
        else:
            print("⚠️  todoapp_tasks table not found - run supabase-schema.sql first")
        
        print()
        
        # Close connection
        cur.close()
        conn.close()
        
        print("🎯 Connection test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Query execution failed: {e}")
        if conn:
            conn.close()
        return False

if __name__ == "__main__":
    success = test_database_connection()
    if not success:
        exit(1)

