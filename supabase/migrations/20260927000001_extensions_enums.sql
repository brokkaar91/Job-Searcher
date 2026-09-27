-- JobMatch – extensions and enum types
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.user_role as enum ('user', 'admin');

create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

create type public.remote_policy as enum ('onsite', 'hybrid', 'remote');

create type public.employment_type as enum (
  'full_time', 'part_time', 'contract', 'temporary', 'internship', 'freelance'
);

create type public.seniority_level as enum ('intern', 'junior', 'medior', 'senior', 'lead', 'executive');

create type public.company_size as enum ('micro', 'small', 'medium', 'large', 'enterprise');

create type public.company_type as enum ('startup', 'scaleup', 'sme', 'corporate', 'public', 'nonprofit', 'agency');

create type public.job_status as enum ('draft', 'pending_review', 'published', 'expired', 'rejected', 'archived');

create type public.connector_type as enum ('adzuna', 'greenhouse', 'lever', 'recruitee', 'personio', 'generic_feed');

create type public.run_status as enum ('queued', 'running', 'succeeded', 'partial', 'failed');

create type public.cv_parse_status as enum ('pending', 'parsing', 'parsed', 'failed');

create type public.feedback_type as enum ('saved', 'dismissed', 'applied', 'unsaved');

create type public.application_status as enum ('saved', 'applied', 'interview', 'offer', 'rejected');

create type public.consent_type as enum ('terms_privacy', 'ai_processing', 'employer_sharing', 'marketing');

create type public.deletion_status as enum ('pending', 'processing', 'completed', 'cancelled');

create type public.alert_frequency as enum ('instant', 'daily', 'weekly');
