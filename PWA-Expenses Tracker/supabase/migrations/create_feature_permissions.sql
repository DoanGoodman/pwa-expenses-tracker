-- Migration: Create feature_permissions table for receipt scanner access control
-- Created: 2026-01-13

-- Create feature_permissions table
CREATE TABLE IF NOT EXISTS feature_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL DEFAULT 'receipt_scanner',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    responded_by TEXT, -- Telegram admin username or ID
    user_email TEXT, -- Store email for display in Telegram notification
    UNIQUE(user_id, feature_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feature_permissions_user_feature 
ON feature_permissions(user_id, feature_name);

CREATE INDEX IF NOT EXISTS idx_feature_permissions_status 
ON feature_permissions(status);

-- Enable Row Level Security
ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions" ON feature_permissions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can request permissions (insert)
CREATE POLICY "Users can request permissions" ON feature_permissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update (for Telegram webhook to approve/reject)
-- This is handled by service_role key in Cloudflare Worker
