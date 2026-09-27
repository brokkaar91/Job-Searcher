
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "alert_deliveries": {
                  Row: {
                    "id": string,"match_ids": (string)[],"sent_at": string,"user_id": string
                  }
                  Insert: {
                    "id"?: string,"match_ids": (string)[],"sent_at"?: string,"user_id": string
                  }
                  Update: {
                    "id"?: string,"match_ids"?: (string)[],"sent_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_deliveries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"alert_settings": {
                  Row: {
                    "enabled": boolean,"frequency": Database["public"]['Enums']["alert_frequency"],"min_score": number,"only_sponsoring": boolean,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "enabled"?: boolean,"frequency"?: Database["public"]['Enums']["alert_frequency"],"min_score"?: number,"only_sponsoring"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "enabled"?: boolean,"frequency"?: Database["public"]['Enums']["alert_frequency"],"min_score"?: number,"only_sponsoring"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"applications": {
                  Row: {
                    "applied_at": string | null,"created_at": string,"id": string,"interview_at": string | null,"job_id": string,"notes": string | null,"offer_at": string | null,"position": number,"rejected_at": string | null,"saved_at": string,"status": Database["public"]['Enums']["application_status"],"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "applied_at"?: string | null,"created_at"?: string,"id"?: string,"interview_at"?: string | null,"job_id": string,"notes"?: string | null,"offer_at"?: string | null,"position"?: number,"rejected_at"?: string | null,"saved_at"?: string,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "applied_at"?: string | null,"created_at"?: string,"id"?: string,"interview_at"?: string | null,"job_id"?: string,"notes"?: string | null,"offer_at"?: string | null,"position"?: number,"rejected_at"?: string | null,"saved_at"?: string,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_role": string | null,"created_at": string,"entity_id": string | null,"entity_type": string | null,"id": number,"input_hash": string | null,"metadata": NonNullable<Json>,"model_version_id": string | null
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_role"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: never,"input_hash"?: string | null,"metadata"?: NonNullable<Json>,"model_version_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_role"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: never,"input_hash"?: string | null,"metadata"?: NonNullable<Json>,"model_version_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"candidate_experiences": {
                  Row: {
                    "created_at": string,"description": string | null,"embedding": string | null,"end_date": string | null,"esco_occupation_uri": string | null,"id": string,"is_current": boolean,"isco_code": string | null,"organisation": string | null,"sort_order": number,"start_date": string | null,"title": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"embedding"?: string | null,"end_date"?: string | null,"esco_occupation_uri"?: string | null,"id"?: string,"is_current"?: boolean,"isco_code"?: string | null,"organisation"?: string | null,"sort_order"?: number,"start_date"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"embedding"?: string | null,"end_date"?: string | null,"esco_occupation_uri"?: string | null,"id"?: string,"is_current"?: boolean,"isco_code"?: string | null,"organisation"?: string | null,"sort_order"?: number,"start_date"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_experiences_esco_occupation_uri_fkey"
      columns: ["esco_occupation_uri"]
isOneToOne: false
      referencedRelation: "esco_occupations"
      referencedColumns: ["uri"]
    },{
      foreignKeyName: "candidate_experiences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_languages": {
                  Row: {
                    "id": string,"language": string,"level": Database["public"]['Enums']["cefr_level"],"user_id": string
                  }
                  Insert: {
                    "id"?: string,"language": string,"level": Database["public"]['Enums']["cefr_level"],"user_id": string
                  }
                  Update: {
                    "id"?: string,"language"?: string,"level"?: Database["public"]['Enums']["cefr_level"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_languages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_profiles": {
                  Row: {
                    "created_at": string,"current_cv_id": string | null,"education_level": number | null,"embedding": string | null,"embedding_updated_at": string | null,"headline": string | null,"needs_sponsorship": boolean | null,"onboarding_completed_at": string | null,"onboarding_step": number,"parsed_cv": Json | null,"permit_type": Database["public"]['Enums']["work_permit_type"] | null,"preferences": NonNullable<Json>,"riasec": Json | null,"riasec_answers": Json | null,"salary_norm_category": Database["public"]['Enums']["salary_norm_category"] | null,"seniority": Database["public"]['Enums']["seniority_level"] | null,"summary": string | null,"updated_at": string,"user_id": string,"work_values": Json | null
                  }
                  Insert: {
                    "created_at"?: string,"current_cv_id"?: string | null,"education_level"?: number | null,"embedding"?: string | null,"embedding_updated_at"?: string | null,"headline"?: string | null,"needs_sponsorship"?: boolean | null,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"parsed_cv"?: Json | null,"permit_type"?: Database["public"]['Enums']["work_permit_type"] | null,"preferences"?: NonNullable<Json>,"riasec"?: Json | null,"riasec_answers"?: Json | null,"salary_norm_category"?: Database["public"]['Enums']["salary_norm_category"] | null,"seniority"?: Database["public"]['Enums']["seniority_level"] | null,"summary"?: string | null,"updated_at"?: string,"user_id": string,"work_values"?: Json | null
                  }
                  Update: {
                    "created_at"?: string,"current_cv_id"?: string | null,"education_level"?: number | null,"embedding"?: string | null,"embedding_updated_at"?: string | null,"headline"?: string | null,"needs_sponsorship"?: boolean | null,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"parsed_cv"?: Json | null,"permit_type"?: Database["public"]['Enums']["work_permit_type"] | null,"preferences"?: NonNullable<Json>,"riasec"?: Json | null,"riasec_answers"?: Json | null,"salary_norm_category"?: Database["public"]['Enums']["salary_norm_category"] | null,"seniority"?: Database["public"]['Enums']["seniority_level"] | null,"summary"?: string | null,"updated_at"?: string,"user_id"?: string,"work_values"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_profiles_current_cv_id_fkey"
      columns: ["current_cv_id"]
isOneToOne: false
      referencedRelation: "cv_files"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidate_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_skills": {
                  Row: {
                    "confirmed": boolean,"created_at": string,"esco_uri": string | null,"evidence": string | null,"id": string,"label": string,"last_used_year": number | null,"source": string,"user_id": string
                  }
                  Insert: {
                    "confirmed"?: boolean,"created_at"?: string,"esco_uri"?: string | null,"evidence"?: string | null,"id"?: string,"label": string,"last_used_year"?: number | null,"source"?: string,"user_id": string
                  }
                  Update: {
                    "confirmed"?: boolean,"created_at"?: string,"esco_uri"?: string | null,"evidence"?: string | null,"id"?: string,"label"?: string,"last_used_year"?: number | null,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_skills_esco_uri_fkey"
      columns: ["esco_uri"]
isOneToOne: false
      referencedRelation: "esco_skills"
      referencedColumns: ["uri"]
    },{
      foreignKeyName: "candidate_skills_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"city_locations": {
                  Row: {
                    "id": number,"lat": number,"lng": number,"name": string,"name_normalized": string,"province": string | null
                  }
                  Insert: {
                    "id"?: number,"lat": number,"lng": number,"name": string,"name_normalized": string,"province"?: string | null
                  }
                  Update: {
                    "id"?: number,"lat"?: number,"lng"?: number,"name"?: string,"name_normalized"?: string,"province"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"companies": {
                  Row: {
                    "created_at": string,"description": string | null,"domain": string | null,"id": string,"is_recognised_sponsor": boolean,"kvk_number": string | null,"name": string,"size": Database["public"]['Enums']["company_size"] | null,"sponsor_checked_at": string | null,"type": Database["public"]['Enums']["company_type"] | null,"updated_at": string,"website": string | null
                  }
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"domain"?: string | null,"id"?: string,"is_recognised_sponsor"?: boolean,"kvk_number"?: string | null,"name": string,"size"?: Database["public"]['Enums']["company_size"] | null,"sponsor_checked_at"?: string | null,"type"?: Database["public"]['Enums']["company_type"] | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"domain"?: string | null,"id"?: string,"is_recognised_sponsor"?: boolean,"kvk_number"?: string | null,"name"?: string,"size"?: Database["public"]['Enums']["company_size"] | null,"sponsor_checked_at"?: string | null,"type"?: Database["public"]['Enums']["company_type"] | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"connector_runs": {
                  Row: {
                    "connector_id": string,"counts": NonNullable<Json>,"created_at": string,"errors": NonNullable<Json>,"finished_at": string | null,"id": string,"log": (string)[],"started_at": string | null,"status": Database["public"]['Enums']["run_status"],"trigger": string,"triggered_by": string | null
                  }
                  Insert: {
                    "connector_id": string,"counts"?: NonNullable<Json>,"created_at"?: string,"errors"?: NonNullable<Json>,"finished_at"?: string | null,"id"?: string,"log"?: (string)[],"started_at"?: string | null,"status"?: Database["public"]['Enums']["run_status"],"trigger"?: string,"triggered_by"?: string | null
                  }
                  Update: {
                    "connector_id"?: string,"counts"?: NonNullable<Json>,"created_at"?: string,"errors"?: NonNullable<Json>,"finished_at"?: string | null,"id"?: string,"log"?: (string)[],"started_at"?: string | null,"status"?: Database["public"]['Enums']["run_status"],"trigger"?: string,"triggered_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "connector_runs_connector_id_fkey"
      columns: ["connector_id"]
isOneToOne: false
      referencedRelation: "connectors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connector_runs_triggered_by_fkey"
      columns: ["triggered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"connector_secrets": {
                  Row: {
                    "ciphertext": string,"connector_id": string,"updated_at": string
                  }
                  Insert: {
                    "ciphertext": string,"connector_id": string,"updated_at"?: string
                  }
                  Update: {
                    "ciphertext"?: string,"connector_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "connector_secrets_connector_id_fkey"
      columns: ["connector_id"]
isOneToOne: true
      referencedRelation: "connectors"
      referencedColumns: ["id"]
    }
                  ]
                },"connectors": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"created_by": string | null,"enabled": boolean,"expire_after_missed_runs": number,"id": string,"last_health": Json | null,"last_sync_at": string | null,"may_republish": boolean,"name": string,"source_priority": number,"sync_interval_minutes": number,"type": Database["public"]['Enums']["connector_type"],"updated_at": string
                  }
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"enabled"?: boolean,"expire_after_missed_runs"?: number,"id"?: string,"last_health"?: Json | null,"last_sync_at"?: string | null,"may_republish"?: boolean,"name": string,"source_priority"?: number,"sync_interval_minutes"?: number,"type": Database["public"]['Enums']["connector_type"],"updated_at"?: string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"enabled"?: boolean,"expire_after_missed_runs"?: number,"id"?: string,"last_health"?: Json | null,"last_sync_at"?: string | null,"may_republish"?: boolean,"name"?: string,"source_priority"?: number,"sync_interval_minutes"?: number,"type"?: Database["public"]['Enums']["connector_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "connectors_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "created_at": string,"granted": boolean,"id": string,"policy_version": string,"type": Database["public"]['Enums']["consent_type"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"granted": boolean,"id"?: string,"policy_version": string,"type": Database["public"]['Enums']["consent_type"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted"?: boolean,"id"?: string,"policy_version"?: string,"type"?: Database["public"]['Enums']["consent_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "company": string | null,"created_at": string,"email": string,"handled_at": string | null,"id": string,"locale": string | null,"message": string,"name": string
                  }
                  Insert: {
                    "company"?: string | null,"created_at"?: string,"email": string,"handled_at"?: string | null,"id"?: string,"locale"?: string | null,"message": string,"name": string
                  }
                  Update: {
                    "company"?: string | null,"created_at"?: string,"email"?: string,"handled_at"?: string | null,"id"?: string,"locale"?: string | null,"message"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cv_files": {
                  Row: {
                    "created_at": string,"file_name": string,"id": string,"mime_type": string,"parse_error": string | null,"parse_status": Database["public"]['Enums']["cv_parse_status"],"parsed_at": string | null,"size_bytes": number,"storage_path": string,"user_id": string,"version": number
                  }
                  Insert: {
                    "created_at"?: string,"file_name": string,"id"?: string,"mime_type": string,"parse_error"?: string | null,"parse_status"?: Database["public"]['Enums']["cv_parse_status"],"parsed_at"?: string | null,"size_bytes": number,"storage_path": string,"user_id": string,"version": number
                  }
                  Update: {
                    "created_at"?: string,"file_name"?: string,"id"?: string,"mime_type"?: string,"parse_error"?: string | null,"parse_status"?: Database["public"]['Enums']["cv_parse_status"],"parsed_at"?: string | null,"size_bytes"?: number,"storage_path"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "cv_files_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dedup_groups": {
                  Row: {
                    "created_at": string,"golden_job_id": string | null,"id": string
                  }
                  Insert: {
                    "created_at"?: string,"golden_job_id"?: string | null,"id"?: string
                  }
                  Update: {
                    "created_at"?: string,"golden_job_id"?: string | null,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dedup_groups_golden_fk"
      columns: ["golden_job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"deletion_requests": {
                  Row: {
                    "email_hash": string,"id": string,"processed_at": string | null,"reason": string | null,"requested_at": string,"source": string,"status": Database["public"]['Enums']["deletion_status"],"user_id": string | null
                  }
                  Insert: {
                    "email_hash": string,"id"?: string,"processed_at"?: string | null,"reason"?: string | null,"requested_at"?: string,"source"?: string,"status"?: Database["public"]['Enums']["deletion_status"],"user_id"?: string | null
                  }
                  Update: {
                    "email_hash"?: string,"id"?: string,"processed_at"?: string | null,"reason"?: string | null,"requested_at"?: string,"source"?: string,"status"?: Database["public"]['Enums']["deletion_status"],"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deletion_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"employer_accounts": {
                  Row: {
                    "company_id": string | null,"created_at": string,"id": string,"role": string,"user_id": string | null
                  }
                  Insert: {
                    "company_id"?: string | null,"created_at"?: string,"id"?: string,"role"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "company_id"?: string | null,"created_at"?: string,"id"?: string,"role"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "employer_accounts_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employer_accounts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"esco_occupations": {
                  Row: {
                    "alt_labels": (string)[],"code": string | null,"created_at": string,"essential_skill_uris": (string)[],"isco_code": string,"optional_skill_uris": (string)[],"preferred_label_en": string,"preferred_label_nl": string | null,"riasec": Json | null,"search_text": string | null,"uri": string,"work_values": Json | null
                  }
                  Insert: {
                    "alt_labels"?: (string)[],"code"?: string | null,"created_at"?: string,"essential_skill_uris"?: (string)[],"isco_code": string,"optional_skill_uris"?: (string)[],"preferred_label_en": string,"preferred_label_nl"?: string | null,"riasec"?: Json | null,"search_text"?: never,"uri": string,"work_values"?: Json | null
                  }
                  Update: {
                    "alt_labels"?: (string)[],"code"?: string | null,"created_at"?: string,"essential_skill_uris"?: (string)[],"isco_code"?: string,"optional_skill_uris"?: (string)[],"preferred_label_en"?: string,"preferred_label_nl"?: string | null,"riasec"?: Json | null,"search_text"?: never,"uri"?: string,"work_values"?: Json | null
                  }
                  Relationships: [
                    
                  ]
                },"esco_skills": {
                  Row: {
                    "alt_labels": (string)[],"broader_uris": (string)[],"created_at": string,"preferred_label_en": string,"preferred_label_nl": string | null,"search_text": string | null,"skill_type": string,"uri": string
                  }
                  Insert: {
                    "alt_labels"?: (string)[],"broader_uris"?: (string)[],"created_at"?: string,"preferred_label_en": string,"preferred_label_nl"?: string | null,"search_text"?: never,"skill_type"?: string,"uri": string
                  }
                  Update: {
                    "alt_labels"?: (string)[],"broader_uris"?: (string)[],"created_at"?: string,"preferred_label_en"?: string,"preferred_label_nl"?: string | null,"search_text"?: never,"skill_type"?: string,"uri"?: string
                  }
                  Relationships: [
                    
                  ]
                },"field_mappings": {
                  Row: {
                    "connector_id": string,"created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"mapping": NonNullable<Json>,"sample_record": Json | null,"version": number
                  }
                  Insert: {
                    "connector_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"mapping": NonNullable<Json>,"sample_record"?: Json | null,"version": number
                  }
                  Update: {
                    "connector_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"mapping"?: NonNullable<Json>,"sample_record"?: Json | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "field_mappings_connector_id_fkey"
      columns: ["connector_id"]
isOneToOne: false
      referencedRelation: "connectors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "field_mappings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"job_raw": {
                  Row: {
                    "connector_id": string,"external_id": string,"fetched_at": string,"id": string,"payload": NonNullable<Json>,"payload_hash": string,"run_id": string | null
                  }
                  Insert: {
                    "connector_id": string,"external_id": string,"fetched_at"?: string,"id"?: string,"payload": NonNullable<Json>,"payload_hash": string,"run_id"?: string | null
                  }
                  Update: {
                    "connector_id"?: string,"external_id"?: string,"fetched_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"payload_hash"?: string,"run_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_raw_connector_id_fkey"
      columns: ["connector_id"]
isOneToOne: false
      referencedRelation: "connectors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_raw_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "connector_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "apply_url": string | null,"apply_url_normalized": string | null,"city": string | null,"classification_confidence": number | null,"company_id": string | null,"content_hash": string | null,"country": string,"created_at": string,"created_by": string | null,"date_posted": string | null,"dedup_group_id": string | null,"dedup_key": string | null,"description": string,"education_requirement": Json | null,"embedding": string | null,"employment_types": (Database["public"]['Enums']["employment_type"])[],"esco_occupation_uri": string | null,"esco_skills": NonNullable<Json>,"external_id": string | null,"first_seen": string,"hiring_organization_name": string | null,"hours_max": number | null,"hours_min": number | null,"id": string,"is_golden": boolean,"isco_code": string | null,"language": string | null,"language_requirements": NonNullable<Json>,"last_seen": string,"lat": number | null,"lng": number | null,"missed_runs": number,"moderation_note": string | null,"needs_review": boolean,"postal_code": string | null,"region": string | null,"remote_policy": Database["public"]['Enums']["remote_policy"] | null,"review_reasons": (string)[],"salary_currency": string,"salary_max_month": number | null,"salary_min_month": number | null,"salary_raw": Json | null,"seniority": Database["public"]['Enums']["seniority_level"] | null,"source_id": string | null,"source_priority": number,"source_url": string | null,"status": Database["public"]['Enums']["job_status"],"title": string,"updated_at": string,"valid_through": string | null,"visa_sponsorship": boolean | null,"work_values": Json | null
                  }
                  Insert: {
                    "apply_url"?: string | null,"apply_url_normalized"?: string | null,"city"?: string | null,"classification_confidence"?: number | null,"company_id"?: string | null,"content_hash"?: string | null,"country"?: string,"created_at"?: string,"created_by"?: string | null,"date_posted"?: string | null,"dedup_group_id"?: string | null,"dedup_key"?: string | null,"description"?: string,"education_requirement"?: Json | null,"embedding"?: string | null,"employment_types"?: (Database["public"]['Enums']["employment_type"])[],"esco_occupation_uri"?: string | null,"esco_skills"?: NonNullable<Json>,"external_id"?: string | null,"first_seen"?: string,"hiring_organization_name"?: string | null,"hours_max"?: number | null,"hours_min"?: number | null,"id"?: string,"is_golden"?: boolean,"isco_code"?: string | null,"language"?: string | null,"language_requirements"?: NonNullable<Json>,"last_seen"?: string,"lat"?: number | null,"lng"?: number | null,"missed_runs"?: number,"moderation_note"?: string | null,"needs_review"?: boolean,"postal_code"?: string | null,"region"?: string | null,"remote_policy"?: Database["public"]['Enums']["remote_policy"] | null,"review_reasons"?: (string)[],"salary_currency"?: string,"salary_max_month"?: number | null,"salary_min_month"?: number | null,"salary_raw"?: Json | null,"seniority"?: Database["public"]['Enums']["seniority_level"] | null,"source_id"?: string | null,"source_priority"?: number,"source_url"?: string | null,"status"?: Database["public"]['Enums']["job_status"],"title": string,"updated_at"?: string,"valid_through"?: string | null,"visa_sponsorship"?: boolean | null,"work_values"?: Json | null
                  }
                  Update: {
                    "apply_url"?: string | null,"apply_url_normalized"?: string | null,"city"?: string | null,"classification_confidence"?: number | null,"company_id"?: string | null,"content_hash"?: string | null,"country"?: string,"created_at"?: string,"created_by"?: string | null,"date_posted"?: string | null,"dedup_group_id"?: string | null,"dedup_key"?: string | null,"description"?: string,"education_requirement"?: Json | null,"embedding"?: string | null,"employment_types"?: (Database["public"]['Enums']["employment_type"])[],"esco_occupation_uri"?: string | null,"esco_skills"?: NonNullable<Json>,"external_id"?: string | null,"first_seen"?: string,"hiring_organization_name"?: string | null,"hours_max"?: number | null,"hours_min"?: number | null,"id"?: string,"is_golden"?: boolean,"isco_code"?: string | null,"language"?: string | null,"language_requirements"?: NonNullable<Json>,"last_seen"?: string,"lat"?: number | null,"lng"?: number | null,"missed_runs"?: number,"moderation_note"?: string | null,"needs_review"?: boolean,"postal_code"?: string | null,"region"?: string | null,"remote_policy"?: Database["public"]['Enums']["remote_policy"] | null,"review_reasons"?: (string)[],"salary_currency"?: string,"salary_max_month"?: number | null,"salary_min_month"?: number | null,"salary_raw"?: Json | null,"seniority"?: Database["public"]['Enums']["seniority_level"] | null,"source_id"?: string | null,"source_priority"?: number,"source_url"?: string | null,"status"?: Database["public"]['Enums']["job_status"],"title"?: string,"updated_at"?: string,"valid_through"?: string | null,"visa_sponsorship"?: boolean | null,"work_values"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_dedup_group_id_fkey"
      columns: ["dedup_group_id"]
isOneToOne: false
      referencedRelation: "dedup_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_esco_occupation_uri_fkey"
      columns: ["esco_occupation_uri"]
isOneToOne: false
      referencedRelation: "esco_occupations"
      referencedColumns: ["uri"]
    },{
      foreignKeyName: "jobs_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "connectors"
      referencedColumns: ["id"]
    }
                  ]
                },"match_feedback": {
                  Row: {
                    "comment": string | null,"created_at": string,"id": string,"job_id": string,"match_id": string | null,"reason": string | null,"type": Database["public"]['Enums']["feedback_type"],"user_id": string
                  }
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"job_id": string,"match_id"?: string | null,"reason"?: string | null,"type": Database["public"]['Enums']["feedback_type"],"user_id": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"job_id"?: string,"match_id"?: string | null,"reason"?: string | null,"type"?: Database["public"]['Enums']["feedback_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_feedback_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_feedback_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_feedback_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "component_scores": NonNullable<Json>,"created_at": string,"explanation": NonNullable<Json>,"id": string,"input_hash": string,"job_id": string,"knocked_out": boolean,"knockouts": NonNullable<Json>,"label": string,"limited_data": boolean,"model_version_id": string,"seen_at": string | null,"total_score": number,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "component_scores": NonNullable<Json>,"created_at"?: string,"explanation": NonNullable<Json>,"id"?: string,"input_hash": string,"job_id": string,"knocked_out"?: boolean,"knockouts": NonNullable<Json>,"label": string,"limited_data"?: boolean,"model_version_id": string,"seen_at"?: string | null,"total_score": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "component_scores"?: NonNullable<Json>,"created_at"?: string,"explanation"?: NonNullable<Json>,"id"?: string,"input_hash"?: string,"job_id"?: string,"knocked_out"?: boolean,"knockouts"?: NonNullable<Json>,"label"?: string,"limited_data"?: boolean,"model_version_id"?: string,"seen_at"?: string | null,"total_score"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_model_version_id_fkey"
      columns: ["model_version_id"]
isOneToOne: false
      referencedRelation: "matching_model_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matching_model_versions": {
                  Row: {
                    "activated_at": string | null,"activated_by": string | null,"config": NonNullable<Json>,"created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"name": string,"notes": string | null,"version": number
                  }
                  Insert: {
                    "activated_at"?: string | null,"activated_by"?: string | null,"config": NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"notes"?: string | null,"version": number
                  }
                  Update: {
                    "activated_at"?: string | null,"activated_by"?: string | null,"config"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"notes"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "matching_model_versions_activated_by_fkey"
      columns: ["activated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matching_model_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"deletion_requested_at": string | null,"email": string | null,"id": string,"last_active_at": string,"locale": string,"retention_warning_sent_at": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"deletion_requested_at"?: string | null,"email"?: string | null,"id": string,"last_active_at"?: string,"locale"?: string,"retention_warning_sent_at"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deletion_requested_at"?: string | null,"email"?: string | null,"id"?: string,"last_active_at"?: string,"locale"?: string,"retention_warning_sent_at"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "current_consents": {
                  Row: {
                    "created_at": string | null,"granted": boolean | null,"policy_version": string | null,"type": Database["public"]['Enums']["consent_type"] | null,"user_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"label_search_text":
{ Args: { "alts": (string)[],"en": string,"nl": string }; Returns: string
                           },
"search_esco_occupations":
{ Args: { "lim"?: number,"q": string }; Returns: {
              "isco_code": string,"preferred_label_en": string,"preferred_label_nl": string,"score": number,"uri": string
            }[]
                           },
"search_esco_skills":
{ Args: { "lim"?: number,"q": string }; Returns: {
              "preferred_label_en": string,"preferred_label_nl": string,"score": number,"skill_type": string,"uri": string
            }[]
                           },
"similar_jobs":
{ Args: { "p_job_id": string,"p_limit"?: number,"p_min_similarity"?: number }; Returns: {
              "job_id": string,"similarity": number
            }[]
                           },
"touch_last_active":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           }
          }
          Enums: {
            "alert_frequency": "instant"|"daily"|"weekly","application_status": "saved"|"applied"|"interview"|"offer"|"rejected","cefr_level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2","company_size": "micro"|"small"|"medium"|"large"|"enterprise","company_type": "startup"|"scaleup"|"sme"|"corporate"|"public"|"nonprofit"|"agency","connector_type": "adzuna"|"greenhouse"|"lever"|"recruitee"|"personio"|"generic_feed","consent_type": "terms_privacy"|"ai_processing"|"employer_sharing"|"marketing","cv_parse_status": "pending"|"parsing"|"parsed"|"failed","deletion_status": "pending"|"processing"|"completed"|"cancelled","employment_type": "full_time"|"part_time"|"contract"|"temporary"|"internship"|"freelance","feedback_type": "saved"|"dismissed"|"applied"|"unsaved","job_status": "draft"|"pending_review"|"published"|"expired"|"rejected"|"archived","remote_policy": "onsite"|"hybrid"|"remote","run_status": "queued"|"running"|"succeeded"|"partial"|"failed","salary_norm_category": "standard"|"reduced"|"graduate","seniority_level": "intern"|"junior"|"medior"|"senior"|"lead"|"executive","user_role": "user"|"admin","work_permit_type": "unrestricted"|"highly_skilled_migrant"|"eu_blue_card"|"orientation_year"|"dependent_free_labour"|"intra_company_transfer"|"student"|"needs_permit"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "alert_frequency": ["instant", "daily", "weekly"],"application_status": ["saved", "applied", "interview", "offer", "rejected"],"cefr_level": ["A1", "A2", "B1", "B2", "C1", "C2"],"company_size": ["micro", "small", "medium", "large", "enterprise"],"company_type": ["startup", "scaleup", "sme", "corporate", "public", "nonprofit", "agency"],"connector_type": ["adzuna", "greenhouse", "lever", "recruitee", "personio", "generic_feed"],"consent_type": ["terms_privacy", "ai_processing", "employer_sharing", "marketing"],"cv_parse_status": ["pending", "parsing", "parsed", "failed"],"deletion_status": ["pending", "processing", "completed", "cancelled"],"employment_type": ["full_time", "part_time", "contract", "temporary", "internship", "freelance"],"feedback_type": ["saved", "dismissed", "applied", "unsaved"],"job_status": ["draft", "pending_review", "published", "expired", "rejected", "archived"],"remote_policy": ["onsite", "hybrid", "remote"],"run_status": ["queued", "running", "succeeded", "partial", "failed"],"salary_norm_category": ["standard", "reduced", "graduate"],"seniority_level": ["intern", "junior", "medior", "senior", "lead", "executive"],"user_role": ["user", "admin"],"work_permit_type": ["unrestricted", "highly_skilled_migrant", "eu_blue_card", "orientation_year", "dependent_free_labour", "intra_company_transfer", "student", "needs_permit", "other"]
          }
        }
} as const

