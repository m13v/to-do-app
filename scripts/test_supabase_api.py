#!/usr/bin/env python3

import os
import requests
from dotenv import load_dotenv

def test_supabase_api():
    """
    Test Supabase API connectivity using REST API
    This will help determine if the project is active
    """
    try:
        # Load environment variables
        load_dotenv('.env.local')
        
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_anon_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_anon_key:
            print("❌ Missing Supabase credentials in .env.local")
            return False
        
        print("🌐 Testing Supabase API connectivity...")
        print(f"📍 URL: {supabase_url}")
        print()
        
        # Test 1: Check if API is responding
        print("1️⃣ Testing API health...")
        try:
            response = requests.get(
                f"{supabase_url}/rest/v1/",
                headers={
                    "apikey": supabase_anon_key,
                    "Authorization": f"Bearer {supabase_anon_key}"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                print("   ✅ API is responding!")
            elif response.status_code == 404:
                print("   ✅ API is responding (404 expected for root endpoint)")
            else:
                print(f"   ⚠️  API returned status code: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ API request failed: {e}")
            print()
            print("This suggests the Supabase project might be:")
            print("  • Paused (check Supabase dashboard)")
            print("  • Deleted or recreated with new credentials")
            print("  • Having network issues")
            return False
        
        print()
        
        # Test 2: Try to query todoapp_tasks table
        print("2️⃣ Testing database access via REST API...")
        try:
            response = requests.get(
                f"{supabase_url}/rest/v1/todoapp_tasks?select=count",
                headers={
                    "apikey": supabase_anon_key,
                    "Authorization": f"Bearer {supabase_anon_key}",
                    "Prefer": "count=exact"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                count = response.headers.get('content-range', '0').split('/')[-1]
                print(f"   ✅ Table exists! Row count: {count}")
            elif response.status_code == 404:
                print("   ⚠️  Table 'todoapp_tasks' not found")
                print("   Run: supabase-schema.sql in Supabase SQL Editor")
            elif response.status_code == 401 or response.status_code == 403:
                print("   ⚠️  Access denied (might be RLS policy)")
            else:
                print(f"   ⚠️  Query returned status: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Query failed: {e}")
        
        print()
        
        # Test 3: List all tables
        print("3️⃣ Checking database configuration...")
        try:
            # Try to get OpenAPI spec which lists tables
            response = requests.get(
                f"{supabase_url}/rest/v1/",
                headers={
                    "apikey": supabase_anon_key,
                    "Accept": "application/json"
                },
                timeout=10
            )
            
            if response.status_code in [200, 404]:
                print("   ✅ Database API is accessible")
            else:
                print(f"   ⚠️  Unexpected response: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Failed: {e}")
        
        print()
        print("🎯 Supabase API test completed!")
        print()
        print("📝 Next steps:")
        print("  • If API is working, the project is active")
        print("  • Direct database connections might be disabled")
        print("  • Check Supabase dashboard -> Settings -> Database for connection pooler details")
        print("  • You may need to enable 'Connection Pooler' in project settings")
        
        return True
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    test_supabase_api()

