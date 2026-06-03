param($script = "src/tests/chaos_tester.ts", $suite = "")

$env:USE_MOCK_SUPABASE = "true"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://sfjmuciupsmvoqchvfwx.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmam11Y2l1cHNtdm9xY2h2Znd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI3MTMsImV4cCI6MjA5NTMzODcxM30.4jetwiWK2tmweo-iwYqsVQviK7Zol6es8aVpwNQNBxE"
$env:SUPABASE_SERVICE_ROLE_KEY = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY # Fallback

npx tsx $script $suite
