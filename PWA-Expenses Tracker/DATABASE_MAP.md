# Database Structure Map

> **⚠️ CRITICAL: Primary Key Type Differences**
> - **UUID PKs**: `profiles`, `project_assignments`, `feature_permissions`, `daily_upload_counts`
> - **BigInt PKs**: `projects`, `expenses`, `categories`, `expense_audit_logs`, `users`
> - When joining tables, ensure data type compatibility to avoid errors

---

## Table of Contents
1. [profiles](#1-profiles) (UUID PK)
2. [projects](#2-projects) (BigInt PK)
3. [expenses](#3-expenses) (BigInt PK)
4. [categories](#4-categories) (BigInt PK)
5. [project_assignments](#5-project_assignments) (UUID PK)
6. [feature_permissions](#6-feature_permissions) (UUID PK)
7. [daily_upload_counts](#7-daily_upload_counts) (UUID PK)
8. [expense_audit_logs](#8-expense_audit_logs) (BigInt PK)
9. [users](#9-users) (BigInt PK)

---

## 1. profiles
**Primary Key**: `id` (UUID) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `uuid` | - | NO | Primary key |
| username | `text` | - | YES | User display name |
| email | `text` | - | YES | User email address |
| role | `text` | `'owner'` | YES | User role (owner/staff) |
| parent_id | `uuid` | - | YES | FK to parent owner (for staff accounts) |
| created_at | `timestamptz` | `now()` | YES | Record creation timestamp |
| updated_at | `timestamptz` | `now()` | YES | Record update timestamp |
| is_active | `boolean` | `true` | YES | Account active status |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Self-referential | parent_id | profiles(id) | Staff accounts link to owner accounts |
| Referenced By | - | project_assignments(staff_id) | Staff assignments |
| Referenced By | - | feature_permissions(user_id) | User permissions |
| Referenced By | - | daily_upload_counts(owner_id) | Upload tracking |

### RLS Policies

#### SELECT Policies
- **Read accessible profiles** (authenticated)
  - `(id = auth.uid()) OR ((parent_id = auth.uid()) AND is_owner())`
  - Allows users to view own profile or staff profiles they own

- **Users can view own profile and staff profiles** (public)
  - `(auth.uid() = id) OR (parent_id = auth.uid())`
  - Similar access for all users

#### INSERT Policies
- **Service role can insert profiles** (public)
  - `WITH CHECK: true`
  - Allows profile creation via service role

#### UPDATE Policies
- **Users can update own profile** (public)
  - `USING: (auth.uid() = id)`
  - Self-update only

- **Users can update own profiles** (public)
  - `USING: (id = auth.uid())`
  - `WITH CHECK: (id = auth.uid())`
  - Full self-management

- **Owner can update staff profiles** (public)
  - `USING: (parent_id = auth.uid())`
  - `WITH CHECK: true`
  - Owners manage their staff

---

## 2. projects
**Primary Key**: `id` (BigInt - Auto-increment) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `bigint` | AUTO INCREMENT | NO | Primary key |
| name | `text` | - | YES | Project name |
| user_id | `uuid` | `auth.uid()` | YES | FK to project owner |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Belongs To | user_id | profiles(id) | ⚠️ **BigInt PK → UUID FK** |
| Referenced By | - | expenses(project_id) | Project expenses |
| Referenced By | - | project_assignments(project_id) | Staff assignments to project |

### RLS Policies

#### SELECT Policies
- **Enable read access for user based on user_id** (public)
  - `(auth.uid() = user_id)`
  - Users view own projects

- **Staff can view assigned projects** (public)
  - `(user_id = auth.uid()) OR (id IN (SELECT project_id FROM project_assignments WHERE staff_id = auth.uid()))`
  - Staff can see assigned projects

#### INSERT Policies
- **Enable insert for users based on user_id** (public)
  - `WITH CHECK: (auth.uid() = user_id)`
  - Users create own projects

#### ALL (SELECT, INSERT, UPDATE, DELETE) Policies
- **Users can manage own projects** (public)
  - `USING: (user_id = auth.uid())`
  - `WITH CHECK: (user_id = auth.uid())`
  - Full CRUD for own projects

---

## 3. expenses
**Primary Key**: `id` (BigInt - Auto-increment) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `bigint` | AUTO INCREMENT | NO | Primary key |
| date | `timestamptz` | `now()` | NO | Expense date |
| project_id | `bigint` | - | YES | FK to projects |
| category_id | `bigint` | - | YES | FK to categories |
| amount | `numeric` | - | YES | Total expense amount |
| description | `text` | - | YES | Expense description |
| quantity | `numeric` | - | YES | Item quantity |
| unit_price | `numeric` | - | YES | Price per unit |
| user_id | `uuid` | `auth.uid()` | YES | FK to creator |
| unit | `text` | - | YES | Unit of measurement |
| last_change_reason | `text` | - | YES | Reason for last edit |
| created_at | `timestamptz` | `now()` | YES | Record creation timestamp |
| image_url | `text` | - | YES | Receipt image URL |
| confidence | `float8` | - | YES | AI processing confidence |
| ai_processed | `boolean` | - | YES | AI processing flag |
| file_hash | `text` | - | YES | File hash for duplicates |
| deleted_at | `timestamptz` | - | YES | Soft delete timestamp |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Belongs To | project_id | projects(id) | ⚠️ **BigInt → BigInt** |
| Belongs To | category_id | categories(id) | ⚠️ **BigInt → BigInt** |
| Belongs To | user_id | profiles(id) | ⚠️ **BigInt PK → UUID FK** |
| Referenced By | - | expense_audit_logs(expense_id) | Audit trail |

### RLS Policies

#### SELECT Policies
- **Users can view related expenses** (public)
  - `(user_id = auth.uid()) OR (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))`
  - View own expenses or expenses in owned projects

- **expenses_select_policy** (public)
  - `(user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expenses.user_id AND profiles.parent_id = auth.uid())`
  - Owners can view staff expenses

#### INSERT Policies
- **expenses_insert_policy** (public)
  - `WITH CHECK: (user_id = auth.uid())`
  - Users create own expenses

#### UPDATE Policies
- **Owner and Creator can update expenses** (public)
  - `(user_id = auth.uid()) OR (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))`
  - Creator or project owner can update

- **expenses_update_policy** (public)
  - `(user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expenses.user_id AND profiles.parent_id = auth.uid())`
  - Owner can update staff expenses

#### DELETE Policies
- **Owner and Creator can delete expenses** (public)
  - `(user_id = auth.uid()) OR (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))`
  - Creator or project owner can delete

- **expenses_delete_policy** (public)
  - `(user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expenses.user_id AND profiles.parent_id = auth.uid())`
  - Owner can delete staff expenses

---

## 4. categories
**Primary Key**: `id` (BigInt - Auto-increment) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `bigint` | AUTO INCREMENT | NO | Primary key |
| name | `text` | - | YES | Category name |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Referenced By | - | expenses(category_id) | Expenses categorization |

### RLS Policies

#### SELECT Policies
- **Enable read access for all users** (authenticated)
  - `true`
  - All authenticated users can view categories

---

## 5. project_assignments
**Primary Key**: `id` (UUID) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `uuid` | `gen_random_uuid()` | NO | Primary key |
| staff_id | `uuid` | - | YES | FK to profiles (staff member) |
| project_id | `bigint` | - | YES | FK to projects |
| assigned_at | `timestamptz` | `now()` | YES | Assignment timestamp |
| assigned_by | `uuid` | - | YES | FK to profiles (assigner) |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Belongs To | staff_id | profiles(id) | ⚠️ **UUID → UUID** |
| Belongs To | project_id | projects(id) | ⚠️ **UUID PK → BigInt FK** |
| Belongs To | assigned_by | profiles(id) | ⚠️ **UUID → UUID** |

### RLS Policies

#### SELECT Policies
- **Staff view own assignments** (authenticated)
  - `(staff_id = auth.uid())`
  - Staff can see their assignments

#### ALL (SELECT, INSERT, UPDATE, DELETE) Policies
- **Owners manage all assignments** (authenticated)
  - `USING: is_owner()`
  - `WITH CHECK: is_owner()`
  - Only owners can manage assignments

---

## 6. feature_permissions
**Primary Key**: `id` (UUID) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `uuid` | `gen_random_uuid()` | NO | Primary key |
| user_id | `uuid` | - | YES | FK to profiles |
| feature_name | `text` | `'receipt_scanner'` | NO | Feature identifier |
| status | `text` | `'pending'` | NO | Approval status |
| requested_at | `timestamptz` | `now()` | YES | Request timestamp |
| responded_at | `timestamptz` | - | YES | Response timestamp |
| responded_by | `text` | - | YES | Responder identifier |
| user_email | `text` | - | YES | Requester email |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Belongs To | user_id | profiles(id) | ⚠️ **UUID → UUID** |

### RLS Policies

#### SELECT Policies
- **Users can view own permissions** (public)
  - `(auth.uid() = user_id)`
  - View own permission requests

- **Users can view own and parent permissions** (public)
  - `(user_id = auth.uid()) OR (user_id IN (SELECT parent_id FROM profiles WHERE id = auth.uid()))`
  - Staff can see parent (owner) permissions

#### INSERT Policies
- **Users can request permissions** (public)
  - `WITH CHECK: (auth.uid() = user_id)`
  - Self-request only

---

## 7. daily_upload_counts
**Primary Key**: `id` (UUID) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `uuid` | `gen_random_uuid()` | NO | Primary key |
| owner_id | `uuid` | - | NO | FK to profiles |
| upload_date | `date` | `CURRENT_DATE` | NO | Date of uploads |
| count | `integer` | `0` | YES | Number of uploads |
| created_at | `timestamptz` | `now()` | YES | Record creation timestamp |
| updated_at | `timestamptz` | `now()` | YES | Record update timestamp |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Belongs To | owner_id | profiles(id) | ⚠️ **UUID → UUID** |

### RLS Policies

#### SELECT Policies
- **Users can view own upload counts** (public)
  - `(owner_id = auth.uid())`
  - View own upload statistics

#### INSERT Policies
- **Users can insert own upload counts** (public)
  - `WITH CHECK: (owner_id = auth.uid())`
  - Self-tracking only

#### UPDATE Policies
- **Users can update own upload counts** (public)
  - `(owner_id = auth.uid())`
  - Self-update only

---

## 8. expense_audit_logs
**Primary Key**: `id` (BigInt - Auto-increment) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `bigint` | AUTO INCREMENT | NO | Primary key |
| expense_id | `bigint` | - | YES | FK to expenses |
| action | `varchar(10)` | - | NO | Action type (INSERT/UPDATE/DELETE) |
| old_data | `jsonb` | - | YES | Previous state snapshot |
| new_data | `jsonb` | - | YES | New state snapshot |
| change_reason | `text` | - | YES | Reason for change |
| changed_by | `uuid` | - | YES | FK to profiles |
| changed_at | `timestamptz` | `now()` | YES | Change timestamp |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Belongs To | expense_id | expenses(id) | ⚠️ **BigInt → BigInt** |
| Belongs To | changed_by | profiles(id) | ⚠️ **BigInt PK → UUID FK** |

### RLS Policies

#### SELECT Policies
- **Users can read their own audit logs** (public)
  - `(changed_by = auth.uid())`
  - View own change history

---

## 9. users
**Primary Key**: `id` (BigInt - Auto-increment) ⚠️

### Schema
| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| **id** | `bigint` | AUTO INCREMENT | NO | Primary key |
| user_id | `uuid` | `auth.uid()` | YES | Link to auth.users |

### Relationships
| Relationship Type | Foreign Key | References | Description |
|-------------------|-------------|------------|-------------|
| Links To | user_id | auth.users(id) | ⚠️ **BigInt PK → UUID FK** |

### RLS Policies

#### INSERT Policies
- **Allow insert for all users** (anon, authenticated)
  - `WITH CHECK: (auth.uid() = user_id)`
  - Self-registration

- **Enable insert for authenticated users only** (authenticated)
  - `WITH CHECK: (auth.uid() = user_id)`
  - Authenticated self-registration

---

## Critical Notes for Developers

### 1. Primary Key Type Mapping
```sql
-- UUID Primary Keys
profiles.id          → UUID
project_assignments.id → UUID
feature_permissions.id → UUID
daily_upload_counts.id → UUID

-- BigInt Primary Keys
projects.id          → BigInt (Auto-increment)
expenses.id          → BigInt (Auto-increment)
categories.id        → BigInt (Auto-increment)
expense_audit_logs.id → BigInt (Auto-increment)
users.id             → BigInt (Auto-increment)
```

### 2. Common JOIN Patterns

#### ✅ Safe JOINs (Matching Types)
```sql
-- UUID to UUID
profiles ← project_assignments.staff_id
profiles ← feature_permissions.user_id
profiles ← daily_upload_counts.owner_id

-- BigInt to BigInt
projects ← expenses.project_id
categories ← expenses.category_id
expenses ← expense_audit_logs.expense_id
```

#### ⚠️ Cross-Type JOINs (UUID ↔ BigInt)
```sql
-- These work because foreign key is correctly typed
projects.user_id (UUID) → profiles.id (UUID)
expenses.user_id (UUID) → profiles.id (UUID)
project_assignments.project_id (BigInt) → projects.id (BigInt)
expense_audit_logs.changed_by (UUID) → profiles.id (UUID)
```

### 3. RLS Policy Helpers
```sql
-- is_owner() function checks if current user is an owner
CREATE OR REPLACE FUNCTION is_owner() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### 4. Migration Sequence
Migrations are located in `supabase/migrations/` and should be run in order:
1. `001_expense_audit_log.sql` - Audit logging
2. `002_staff_management.sql` - Staff system
3. `003_optimize_profile_fetch.sql` - Performance
4. `004_share_projects_with_staff.sql` - Project sharing
5. `005_project_assignments.sql` - Assignment system
6. `006_fix_expenses_rls_for_owner.sql` - RLS fixes
7. `007_add_is_active_to_profiles.sql` - Active status
8. `008_daily_upload_limit.sql` - Upload tracking
9. `009_fix_profiles_rls_for_owner_update.sql` - RLS fixes
10. `010_disable_staff_function.sql` - Staff management
11. `011_optimize_rls_with_indexes.sql` - Performance indexes
12. `012_fix_profiles_select_rls.sql` - RLS fixes
13. `013_fix_profiles_infinite_recursion.sql` - Recursion fix
14. `014_fix_project_assignments_rls.sql` - Assignment RLS
15. `015_fix_project_assignments_rls_performance.sql` - Performance
16. `016_consolidate_profiles_rls.sql` - RLS consolidation
17. `017_staff_view_assigned_project_expenses.sql` - **Pending execution**

### 5. Performance Indexes
Key indexes for optimal query performance:
- `idx_project_assignments_staff_project` on project_assignments(staff_id, project_id)
- `idx_expenses_project_id` on expenses(project_id)
- Additional indexes defined in migration 011

---

**Document Version**: 1.0  
**Last Updated**: January 17, 2026  
**Maintained By**: Database Architecture Team
