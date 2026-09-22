/*
# Add User Profiles and Role-Based Access Control

## Overview
This migration adds a user profiles table for role-based access control and updates
all existing RLS policies from anon-accessible to authenticated-only, since the app
now requires sign-in. A trigger auto-creates a profile row when a new auth user signs up.

## New Tables
1. **user_profiles** - Extended user info beyond auth.users
   - id (uuid, PK, references auth.users)
   - full_name (text)
   - role (text: 'inspector' or 'admin', default 'inspector')
   - created_at (timestamp)

## Security Changes
- All existing tables: policies changed from `TO anon, authenticated` to `TO authenticated`
  with `USING (true)` since all authenticated users share the compliance data (this is an
  enforcement agency tool where all inspectors see all inspections).
- user_profiles: users can read all profiles (to see team members) but only update their own.
- A trigger `handle_new_user` auto-creates a profile when a new auth.users row is created.

## Important Notes
1. The app now requires authentication - all data is scoped to authenticated users.
2. All inspectors share the same compliance data (multi-user, shared data model).
3. The first user to sign up should be manually promoted to 'admin' role if needed.
*/

-- ============ USER PROFILES TABLE ============
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'inspector' CHECK (role IN ('inspector', 'admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see all profiles (team visibility)
DROP POLICY IF EXISTS "authenticated_select_profiles" ON user_profiles;
CREATE POLICY "authenticated_select_profiles" ON user_profiles FOR SELECT
  TO authenticated USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============ AUTO-CREATE PROFILE TRIGGER ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'inspector')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ UPDATE ALL EXISTING TABLE POLICIES ============

-- PRODUCTS: drop anon policies, replace with authenticated
DROP POLICY IF EXISTS "anon_select_products" ON products;
DROP POLICY IF EXISTS "anon_insert_products" ON products;
DROP POLICY IF EXISTS "anon_update_products" ON products;
DROP POLICY IF EXISTS "anon_delete_products" ON products;

CREATE POLICY "authenticated_select_products" ON products FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "authenticated_insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_products" ON products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_products" ON products FOR DELETE
  TO authenticated USING (true);

-- COMPLIANCE_RULES
DROP POLICY IF EXISTS "anon_select_rules" ON compliance_rules;
DROP POLICY IF EXISTS "anon_insert_rules" ON compliance_rules;
DROP POLICY IF EXISTS "anon_update_rules" ON compliance_rules;
DROP POLICY IF EXISTS "anon_delete_rules" ON compliance_rules;

CREATE POLICY "authenticated_select_rules" ON compliance_rules FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "authenticated_insert_rules" ON compliance_rules FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_rules" ON compliance_rules FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_rules" ON compliance_rules FOR DELETE
  TO authenticated USING (true);

-- INSPECTIONS
DROP POLICY IF EXISTS "anon_select_inspections" ON inspections;
DROP POLICY IF EXISTS "anon_insert_inspections" ON inspections;
DROP POLICY IF EXISTS "anon_update_inspections" ON inspections;
DROP POLICY IF EXISTS "anon_delete_inspections" ON inspections;

CREATE POLICY "authenticated_select_inspections" ON inspections FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "authenticated_insert_inspections" ON inspections FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_inspections" ON inspections FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_inspections" ON inspections FOR DELETE
  TO authenticated USING (true);

-- INSPECTION_RESULTS
DROP POLICY IF EXISTS "anon_select_results" ON inspection_results;
DROP POLICY IF EXISTS "anon_insert_results" ON inspection_results;
DROP POLICY IF EXISTS "anon_update_results" ON inspection_results;
DROP POLICY IF EXISTS "anon_delete_results" ON inspection_results;

CREATE POLICY "authenticated_select_results" ON inspection_results FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "authenticated_insert_results" ON inspection_results FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_results" ON inspection_results FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_results" ON inspection_results FOR DELETE
  TO authenticated USING (true);

-- VIOLATIONS
DROP POLICY IF EXISTS "anon_select_violations" ON violations;
DROP POLICY IF EXISTS "anon_insert_violations" ON violations;
DROP POLICY IF EXISTS "anon_update_violations" ON violations;
DROP POLICY IF EXISTS "anon_delete_violations" ON violations;

CREATE POLICY "authenticated_select_violations" ON violations FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "authenticated_insert_violations" ON violations FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_violations" ON violations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_violations" ON violations FOR DELETE
  TO authenticated USING (true);

-- EVIDENCE_ARTIFACTS
DROP POLICY IF EXISTS "anon_select_evidence" ON evidence_artifacts;
DROP POLICY IF EXISTS "anon_insert_evidence" ON evidence_artifacts;
DROP POLICY IF EXISTS "anon_update_evidence" ON evidence_artifacts;
DROP POLICY IF EXISTS "anon_delete_evidence" ON evidence_artifacts;

CREATE POLICY "authenticated_select_evidence" ON evidence_artifacts FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "authenticated_insert_evidence" ON evidence_artifacts FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_evidence" ON evidence_artifacts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_evidence" ON evidence_artifacts FOR DELETE
  TO authenticated USING (true);

-- AUDIT_LOG
DROP POLICY IF EXISTS "anon_select_audit" ON audit_log;
DROP POLICY IF EXISTS "anon_insert_audit" ON audit_log;

CREATE POLICY "authenticated_select_audit" ON audit_log FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "authenticated_insert_audit" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (true);
