-- SQL Migration: Reset and Add Auth Support to Messages
-- This script will recreate the messages table to ensure a clean foundation with Auth.

-- 1. Drop the existing table to avoid "NOT NULL" errors with existing test data.
-- CAUTION: In a real production environment with live data, you would use a 
-- more complex migration strategy. But for foundation setup, a clean start is best.
DROP TABLE IF EXISTS messages CASCADE;

-- 2. Create the messages table with user_id from the start
CREATE TABLE messages (
    -- Unique ID for each message
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The content of the message
    content TEXT NOT NULL,
    
    -- user_id: Links the message to the Supabase Auth user.
    -- auth.uid() is the default, ensuring the DB knows who created the record.
    user_id UUID DEFAULT auth.uid() NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timestamp for when it was created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Enable Row Level Security (RLS)
-- This tells PostgreSQL to check our policies before allowing any data access.
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Create secure policies
-- These policies ensure that users can ONLY interact with their own data.

-- Policy: Users can only see their own messages
CREATE POLICY "Users can view own messages" 
ON messages FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own messages
CREATE POLICY "Users can insert own messages" 
ON messages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own messages
CREATE POLICY "Users can delete own messages" 
ON messages FOR DELETE 
USING (auth.uid() = user_id);

-- Reasoning:
-- The error "column 'user_id' contains null values" happened because we had
-- test messages from Step 5 that didn't have a user attached. 
-- PostgreSQL cannot add a "NOT NULL" column to a table that already has data
-- unless you provide a value for every existing row. 
-- By dropping and recreating, we ensure the table structure is perfect for Auth.
