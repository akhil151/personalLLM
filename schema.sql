-- SQL Schema for Messages Table
-- This script can be run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS messages (
    -- id: A unique identifier for each message. 
    -- uuid_generate_v4() is a common PostgreSQL function for generating random UUIDs.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- content: The text content of the message.
    content TEXT NOT NULL,
    
    -- created_at: Timestamp of when the message was created.
    -- DEFAULT now() ensures that PostgreSQL automatically sets this on insert.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
-- In a production app, you would define policies to restrict who can read/write.
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to insert (for testing purposes)
CREATE POLICY "Allow public insert access" ON messages FOR INSERT WITH CHECK (true);

-- Create a policy that allows anyone to read (for testing purposes)
CREATE POLICY "Allow public read access" ON messages FOR SELECT USING (true);
