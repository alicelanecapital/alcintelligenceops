export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_links: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          slug: string
          title: string
          updated_at: string
          user_email: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          slug: string
          title?: string
          updated_at?: string
          user_email: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          slug?: string
          title?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_link_id: string
          client_email: string
          client_name: string
          client_notes: string | null
          created_at: string
          end_time: string
          google_event_id: string | null
          id: string
          start_time: string
          status: string
        }
        Insert: {
          booking_link_id: string
          client_email: string
          client_name: string
          client_notes?: string | null
          created_at?: string
          end_time: string
          google_event_id?: string | null
          id?: string
          start_time: string
          status?: string
        }
        Update: {
          booking_link_id?: string
          client_email?: string
          client_name?: string
          client_notes?: string | null
          created_at?: string
          end_time?: string
          google_event_id?: string | null
          id?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          body: string | null
          created_at: string
          direction: string | null
          founder_id: string | null
          id: string
          kind: string | null
          occurred_at: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction?: string | null
          founder_id?: string | null
          id?: string
          kind?: string | null
          occurred_at?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: string | null
          founder_id?: string | null
          id?: string
          kind?: string | null
          occurred_at?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          business_model: string | null
          city: string | null
          country: string | null
          created_at: string
          current_funding: string | null
          customers: string | null
          employees: number | null
          founded_year: number | null
          id: string
          industry: string | null
          investment_stage: string | null
          linkedin: string | null
          logo_url: string | null
          name: string
          problem_solved: string | null
          products: string | null
          province: string | null
          registration_number: string | null
          relationship_owner: string | null
          revenue_band: string | null
          services: string | null
          status: string | null
          summary: string | null
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_model?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_funding?: string | null
          customers?: string | null
          employees?: number | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          investment_stage?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name: string
          problem_solved?: string | null
          products?: string | null
          province?: string | null
          registration_number?: string | null
          relationship_owner?: string | null
          revenue_band?: string | null
          services?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_model?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_funding?: string | null
          customers?: string | null
          employees?: number | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          investment_stage?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name?: string
          problem_solved?: string | null
          products?: string | null
          province?: string | null
          registration_number?: string | null
          relationship_owner?: string | null
          revenue_band?: string | null
          services?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          ai_summary: string | null
          category: string
          company: string | null
          company_description: string | null
          created_at: string
          date_met: string | null
          email: string | null
          id: string
          last_interaction_at: string | null
          legacy_founder_id: string | null
          legacy_org_id: string | null
          linkedin: string | null
          name: string
          notes: string | null
          organisation_id: string | null
          owner_id: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          relationship_score: number | null
          role: string | null
          source_event_id: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ai_summary?: string | null
          category?: string
          company?: string | null
          company_description?: string | null
          created_at?: string
          date_met?: string | null
          email?: string | null
          id?: string
          last_interaction_at?: string | null
          legacy_founder_id?: string | null
          legacy_org_id?: string | null
          linkedin?: string | null
          name: string
          notes?: string | null
          organisation_id?: string | null
          owner_id?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          relationship_score?: number | null
          role?: string | null
          source_event_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ai_summary?: string | null
          category?: string
          company?: string | null
          company_description?: string | null
          created_at?: string
          date_met?: string | null
          email?: string | null
          id?: string
          last_interaction_at?: string | null
          legacy_founder_id?: string | null
          legacy_org_id?: string | null
          linkedin?: string | null
          name?: string
          notes?: string | null
          organisation_id?: string | null
          owner_id?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          relationship_score?: number | null
          role?: string | null
          source_event_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_briefings: {
        Row: {
          briefing_date: string
          content: Json
          generated_at: string
          id: string
          model: string | null
          user_id: string
        }
        Insert: {
          briefing_date: string
          content: Json
          generated_at?: string
          id?: string
          model?: string | null
          user_id: string
        }
        Update: {
          briefing_date?: string
          content?: Json
          generated_at?: string
          id?: string
          model?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dd_framework_documents: {
        Row: {
          created_at: string
          id: string
          name: string
          purpose: string | null
          round: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          purpose?: string | null
          round: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          purpose?: string | null
          round?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dd_framework_documents_round_fkey"
            columns: ["round"]
            isOneToOne: false
            referencedRelation: "dd_framework_rounds"
            referencedColumns: ["round"]
          },
        ]
      }
      dd_framework_questions: {
        Row: {
          created_at: string
          id: string
          internal_steps: string[] | null
          question_text: string
          red_flags: Json | null
          round: number
          sort_order: number
          updated_at: string
          why_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          internal_steps?: string[] | null
          question_text: string
          red_flags?: Json | null
          round: number
          sort_order?: number
          updated_at?: string
          why_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          internal_steps?: string[] | null
          question_text?: string
          red_flags?: Json | null
          round?: number
          sort_order?: number
          updated_at?: string
          why_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dd_framework_questions_round_fkey"
            columns: ["round"]
            isOneToOne: false
            referencedRelation: "dd_framework_rounds"
            referencedColumns: ["round"]
          },
        ]
      }
      dd_framework_rounds: {
        Row: {
          duration: string | null
          purpose: string | null
          round: number
          subtitle: string | null
          title: string
        }
        Insert: {
          duration?: string | null
          purpose?: string | null
          round: number
          subtitle?: string | null
          title: string
        }
        Update: {
          duration?: string | null
          purpose?: string | null
          round?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      dd_internal_verification: {
        Row: {
          completed: boolean | null
          completion_date: string | null
          created_at: string
          findings: string | null
          id: string
          interview_id: string
          round: number
          step_description: string | null
          step_title: string
        }
        Insert: {
          completed?: boolean | null
          completion_date?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          interview_id: string
          round: number
          step_description?: string | null
          step_title: string
        }
        Update: {
          completed?: boolean | null
          completion_date?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          interview_id?: string
          round?: number
          step_description?: string | null
          step_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dd_internal_verification_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "dd_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_interview_custom_questions: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          question_text: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          question_text: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          question_text?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "dd_interview_custom_questions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "dd_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_interview_documents: {
        Row: {
          auto_analysis: Json | null
          document_category: string
          document_type: string | null
          extracted_text: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          interview_id: string
          parsed_data: Json | null
          round: number
          upload_channel: string | null
          uploaded_at: string
          verification_status: string | null
        }
        Insert: {
          auto_analysis?: Json | null
          document_category: string
          document_type?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          interview_id: string
          parsed_data?: Json | null
          round: number
          upload_channel?: string | null
          uploaded_at?: string
          verification_status?: string | null
        }
        Update: {
          auto_analysis?: Json | null
          document_category?: string
          document_type?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          interview_id?: string
          parsed_data?: Json | null
          round?: number
          upload_channel?: string | null
          uploaded_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dd_interview_documents_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "dd_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_interview_extra_questions: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          question_text: string
          rationale: string | null
          sort_order: number
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          question_text: string
          rationale?: string | null
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          question_text?: string
          rationale?: string | null
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dd_interview_extra_questions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "dd_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_interviews: {
        Row: {
          ai_analysis: Json | null
          completed_at: string | null
          created_at: string
          detected_sector: string | null
          hold_at: string | null
          hold_notes: string | null
          human_assessment: string | null
          id: string
          opportunity_id: string
          paused_at: string | null
          recording_duration_seconds: number | null
          recording_url: string | null
          round: number
          sector_confidence: number | null
          stakeholder_brief: Json | null
          started_at: string | null
          status: string
          terminated_at: string | null
          terminated_notes: string | null
          transcript: string | null
          transcript_source: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          completed_at?: string | null
          created_at?: string
          detected_sector?: string | null
          hold_at?: string | null
          hold_notes?: string | null
          human_assessment?: string | null
          id?: string
          opportunity_id: string
          paused_at?: string | null
          recording_duration_seconds?: number | null
          recording_url?: string | null
          round: number
          sector_confidence?: number | null
          stakeholder_brief?: Json | null
          started_at?: string | null
          status?: string
          terminated_at?: string | null
          terminated_notes?: string | null
          transcript?: string | null
          transcript_source?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          completed_at?: string | null
          created_at?: string
          detected_sector?: string | null
          hold_at?: string | null
          hold_notes?: string | null
          human_assessment?: string | null
          id?: string
          opportunity_id?: string
          paused_at?: string | null
          recording_duration_seconds?: number | null
          recording_url?: string | null
          round?: number
          sector_confidence?: number | null
          stakeholder_brief?: Json | null
          started_at?: string | null
          status?: string
          terminated_at?: string | null
          terminated_notes?: string | null
          transcript?: string | null
          transcript_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dd_interviews_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_round_responses: {
        Row: {
          created_at: string
          founder_response: string | null
          id: string
          interview_id: string
          question_number: number
          question_text: string
          response_source: string | null
          response_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder_response?: string | null
          id?: string
          interview_id: string
          question_number: number
          question_text: string
          response_source?: string | null
          response_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder_response?: string | null
          id?: string
          interview_id?: string
          question_number?: number
          question_text?: string
          response_source?: string | null
          response_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dd_round_responses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "dd_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_upload_channels: {
        Row: {
          channel_type: string
          created_at: string
          dedicated_email: string | null
          id: string
          interview_id: string | null
          opportunity_id: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          dedicated_email?: string | null
          id?: string
          interview_id?: string | null
          opportunity_id: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          dedicated_email?: string | null
          id?: string
          interview_id?: string | null
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dd_upload_channels_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_verification_claims: {
        Row: {
          claim_text: string
          claim_type: string | null
          created_at: string
          documents_support: boolean | null
          founder_word: boolean | null
          id: string
          independent_observation: boolean | null
          interview_id: string
          round: number
          variance_percent: number | null
          verification_complete: boolean | null
          verified_amount: number | null
          verified_at: string | null
        }
        Insert: {
          claim_text: string
          claim_type?: string | null
          created_at?: string
          documents_support?: boolean | null
          founder_word?: boolean | null
          id?: string
          independent_observation?: boolean | null
          interview_id: string
          round: number
          variance_percent?: number | null
          verification_complete?: boolean | null
          verified_amount?: number | null
          verified_at?: string | null
        }
        Update: {
          claim_text?: string
          claim_type?: string | null
          created_at?: string
          documents_support?: boolean | null
          founder_word?: boolean | null
          id?: string
          independent_observation?: boolean | null
          interview_id?: string
          round?: number
          variance_percent?: number | null
          verification_complete?: boolean | null
          verified_amount?: number | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dd_verification_claims_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "dd_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activity: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string
          id: string
          kind: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id: string
          id?: string
          kind: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string
          id?: string
          kind?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activity_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          ai_investment_score: number | null
          created_at: string
          founder_id: string | null
          id: string
          investment_size: string | null
          investment_stage: string | null
          organisation_id: string | null
          owner_id: string | null
          priority: string | null
          referral_contact_id: string | null
          source: string | null
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_investment_score?: number | null
          created_at?: string
          founder_id?: string | null
          id?: string
          investment_size?: string | null
          investment_stage?: string | null
          organisation_id?: string | null
          owner_id?: string | null
          priority?: string | null
          referral_contact_id?: string | null
          source?: string | null
          stage?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_investment_score?: number | null
          created_at?: string
          founder_id?: string | null
          id?: string
          investment_size?: string | null
          investment_stage?: string | null
          organisation_id?: string | null
          owner_id?: string | null
          priority?: string | null
          referral_contact_id?: string | null
          source?: string | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_referral_contact_id_fkey"
            columns: ["referral_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          interview_id: string
          reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          interview_id: string
          reason?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          interview_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_summary: string | null
          company_id: string | null
          created_at: string
          doc_type: string | null
          file_name: string | null
          file_size: number | null
          founder_id: string | null
          id: string
          mime_type: string | null
          opportunity_id: string | null
          storage_path: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          ai_summary?: string | null
          company_id?: string | null
          created_at?: string
          doc_type?: string | null
          file_name?: string | null
          file_size?: number | null
          founder_id?: string | null
          id?: string
          mime_type?: string | null
          opportunity_id?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          ai_summary?: string | null
          company_id?: string | null
          created_at?: string
          doc_type?: string | null
          file_name?: string | null
          file_size?: number | null
          founder_id?: string | null
          id?: string
          mime_type?: string | null
          opportunity_id?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_merges: {
        Row: {
          candidate_ids: string[]
          created_at: string
          entity_type: string
          id: string
          reason: string | null
          score: number | null
          status: string | null
        }
        Insert: {
          candidate_ids: string[]
          created_at?: string
          entity_type: string
          id?: string
          reason?: string | null
          score?: number | null
          status?: string | null
        }
        Update: {
          candidate_ids?: string[]
          created_at?: string
          entity_type?: string
          id?: string
          reason?: string | null
          score?: number | null
          status?: string | null
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          contact_id: string | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          ai_factors: Json | null
          ai_score: number | null
          ai_summary: string | null
          booked: boolean
          booked_at: string | null
          booked_by: string | null
          city: string | null
          cost: string | null
          cost_type: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          discovered_at: string | null
          end_date: string | null
          expected_audience: string | null
          id: string
          industry: string[] | null
          is_new: boolean | null
          name: string
          owner: string | null
          region: string | null
          registration_link: string | null
          source_url: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          venue: string | null
          website: string | null
          who_you_meet: string | null
        }
        Insert: {
          ai_factors?: Json | null
          ai_score?: number | null
          ai_summary?: string | null
          booked?: boolean
          booked_at?: string | null
          booked_by?: string | null
          city?: string | null
          cost?: string | null
          cost_type?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          discovered_at?: string | null
          end_date?: string | null
          expected_audience?: string | null
          id?: string
          industry?: string[] | null
          is_new?: boolean | null
          name: string
          owner?: string | null
          region?: string | null
          registration_link?: string | null
          source_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          venue?: string | null
          website?: string | null
          who_you_meet?: string | null
        }
        Update: {
          ai_factors?: Json | null
          ai_score?: number | null
          ai_summary?: string | null
          booked?: boolean
          booked_at?: string | null
          booked_by?: string | null
          city?: string | null
          cost?: string | null
          cost_type?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          discovered_at?: string | null
          end_date?: string | null
          expected_audience?: string | null
          id?: string
          industry?: string[] | null
          is_new?: boolean | null
          name?: string
          owner?: string | null
          region?: string | null
          registration_link?: string | null
          source_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          venue?: string | null
          website?: string | null
          who_you_meet?: string | null
        }
        Relationships: []
      }
      founder_companies: {
        Row: {
          company_id: string
          created_at: string
          founder_id: string
          id: string
          is_current: boolean | null
          role: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          founder_id: string
          id?: string
          is_current?: boolean | null
          role?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          founder_id?: string
          id?: string
          is_current?: boolean | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_companies_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_intelligence: {
        Row: {
          founder_id: string
          generated_at: string | null
          knowledge_gaps: Json | null
          next_best_actions: Json | null
          open_commitments: Json | null
          recent_developments: Json | null
          relationship_health: Json | null
          snapshot: string | null
          source_hash: string | null
          updated_at: string
        }
        Insert: {
          founder_id: string
          generated_at?: string | null
          knowledge_gaps?: Json | null
          next_best_actions?: Json | null
          open_commitments?: Json | null
          recent_developments?: Json | null
          relationship_health?: Json | null
          snapshot?: string | null
          source_hash?: string | null
          updated_at?: string
        }
        Update: {
          founder_id?: string
          generated_at?: string | null
          knowledge_gaps?: Json | null
          next_best_actions?: Json | null
          open_commitments?: Json | null
          recent_developments?: Json | null
          relationship_health?: Json | null
          snapshot?: string | null
          source_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_intelligence_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founders: {
        Row: {
          achievements: string | null
          ai_investment_score: number | null
          assigned_partner: string | null
          awards: string | null
          biography: string | null
          challenges: string | null
          contact_id: string | null
          created_at: string
          current_company_id: string | null
          education: Json | null
          email: string | null
          employees: number | null
          experience: Json | null
          first_met_date: string | null
          funding_sought: string | null
          id: string
          industry: string | null
          internal_notes: string | null
          linkedin: string | null
          location: string | null
          name: string
          opportunities_text: string | null
          organisation_id: string | null
          owner_id: string | null
          phone: string | null
          photo_url: string | null
          pitch_deck_url: string | null
          problem: string | null
          referral_source: string | null
          relationship_strength: number | null
          revenue: string | null
          sector: string | null
          skills: string[] | null
          socials: Json | null
          solution: string | null
          stage: string | null
          startup_name: string | null
          status: string | null
          traction: string | null
          updated_at: string
          website: string | null
          why_interesting: string | null
        }
        Insert: {
          achievements?: string | null
          ai_investment_score?: number | null
          assigned_partner?: string | null
          awards?: string | null
          biography?: string | null
          challenges?: string | null
          contact_id?: string | null
          created_at?: string
          current_company_id?: string | null
          education?: Json | null
          email?: string | null
          employees?: number | null
          experience?: Json | null
          first_met_date?: string | null
          funding_sought?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          linkedin?: string | null
          location?: string | null
          name: string
          opportunities_text?: string | null
          organisation_id?: string | null
          owner_id?: string | null
          phone?: string | null
          photo_url?: string | null
          pitch_deck_url?: string | null
          problem?: string | null
          referral_source?: string | null
          relationship_strength?: number | null
          revenue?: string | null
          sector?: string | null
          skills?: string[] | null
          socials?: Json | null
          solution?: string | null
          stage?: string | null
          startup_name?: string | null
          status?: string | null
          traction?: string | null
          updated_at?: string
          website?: string | null
          why_interesting?: string | null
        }
        Update: {
          achievements?: string | null
          ai_investment_score?: number | null
          assigned_partner?: string | null
          awards?: string | null
          biography?: string | null
          challenges?: string | null
          contact_id?: string | null
          created_at?: string
          current_company_id?: string | null
          education?: Json | null
          email?: string | null
          employees?: number | null
          experience?: Json | null
          first_met_date?: string | null
          funding_sought?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          linkedin?: string | null
          location?: string | null
          name?: string
          opportunities_text?: string | null
          organisation_id?: string | null
          owner_id?: string | null
          phone?: string | null
          photo_url?: string | null
          pitch_deck_url?: string | null
          problem?: string | null
          referral_source?: string | null
          relationship_strength?: number | null
          revenue?: string | null
          sector?: string | null
          skills?: string[] | null
          socials?: Json | null
          solution?: string | null
          stage?: string | null
          startup_name?: string | null
          status?: string | null
          traction?: string | null
          updated_at?: string
          website?: string | null
          why_interesting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founders_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_events: {
        Row: {
          attendees: Json | null
          calendar_id: string | null
          calendar_name: string | null
          created_at: string
          description: string | null
          end_time: string | null
          google_event_id: string
          id: string
          is_all_day: boolean | null
          location: string | null
          meeting_link: string | null
          start_time: string | null
          title: string | null
          updated_at: string
          user_email: string
        }
        Insert: {
          attendees?: Json | null
          calendar_id?: string | null
          calendar_name?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          google_event_id: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          meeting_link?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string
          user_email: string
        }
        Update: {
          attendees?: Json | null
          calendar_id?: string | null
          calendar_name?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          google_event_id?: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          meeting_link?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      google_oauth_connections: {
        Row: {
          access_token: string
          connected_at: string
          id: string
          last_synced_at: string | null
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          user_email: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_email: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      interview_analyses: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          kind: string
          payload: Json
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          kind: string
          payload: Json
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          kind?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "interview_analyses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_notes: {
        Row: {
          body: string | null
          created_at: string
          id: string
          interview_id: string
          section: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          interview_id: string
          section: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          interview_id?: string
          section?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_notes_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_reports: {
        Row: {
          body: Json
          generated_at: string
          id: string
          interview_id: string
        }
        Insert: {
          body: Json
          generated_at?: string
          id?: string
          interview_id: string
        }
        Update: {
          body?: Json
          generated_at?: string
          id?: string
          interview_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_reports_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_utterances: {
        Row: {
          confidence: number | null
          created_at: string
          edited: boolean
          id: string
          interview_id: string
          speaker: string
          text: string
          ts_ms: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          edited?: boolean
          id?: string
          interview_id: string
          speaker?: string
          text: string
          ts_ms: number
        }
        Update: {
          confidence?: number | null
          created_at?: string
          edited?: boolean
          id?: string
          interview_id?: string
          speaker?: string
          text?: string
          ts_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "interview_utterances_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          brief: Json | null
          business_name: string | null
          contact_id: string | null
          created_at: string
          current_stage: string | null
          deal_id: string | null
          ended_at: string | null
          event_id: string | null
          founder_id: string | null
          founder_name: string | null
          hidden: boolean
          id: string
          industry: string | null
          interviewer_name: string | null
          is_private: boolean
          meeting_type: string | null
          organisation_id: string | null
          started_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          brief?: Json | null
          business_name?: string | null
          contact_id?: string | null
          created_at?: string
          current_stage?: string | null
          deal_id?: string | null
          ended_at?: string | null
          event_id?: string | null
          founder_id?: string | null
          founder_name?: string | null
          hidden?: boolean
          id?: string
          industry?: string | null
          interviewer_name?: string | null
          is_private?: boolean
          meeting_type?: string | null
          organisation_id?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          brief?: Json | null
          business_name?: string | null
          contact_id?: string | null
          created_at?: string
          current_stage?: string | null
          deal_id?: string | null
          ended_at?: string | null
          event_id?: string | null
          founder_id?: string | null
          founder_name?: string | null
          hidden?: boolean
          id?: string
          industry?: string | null
          interviewer_name?: string | null
          is_private?: boolean
          meeting_type?: string | null
          organisation_id?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string
          founder_id: string | null
          id: string
          instrument: string | null
          invested_at: string | null
          notes: string | null
          opportunity_id: string | null
          status: string | null
          updated_at: string
          valuation: number | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string
          founder_id?: string | null
          id?: string
          instrument?: string | null
          invested_at?: string | null
          notes?: string | null
          opportunity_id?: string | null
          status?: string | null
          updated_at?: string
          valuation?: number | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string
          founder_id?: string | null
          id?: string
          instrument?: string | null
          invested_at?: string | null
          notes?: string | null
          opportunity_id?: string | null
          status?: string | null
          updated_at?: string
          valuation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          action_items: Json | null
          agenda: string | null
          attendees: Json | null
          company_id: string | null
          created_at: string
          decisions: string | null
          founder_id: string | null
          id: string
          location: string | null
          meeting_date: string | null
          opportunity_id: string | null
          outcome: string | null
          recording_url: string | null
          summary: string | null
          title: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          agenda?: string | null
          attendees?: Json | null
          company_id?: string | null
          created_at?: string
          decisions?: string | null
          founder_id?: string | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          recording_url?: string | null
          summary?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          agenda?: string | null
          attendees?: Json | null
          company_id?: string | null
          created_at?: string
          decisions?: string | null
          founder_id?: string | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          recording_url?: string | null
          summary?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          attachments: Json | null
          author: string | null
          body: string
          company_id: string | null
          created_at: string
          founder_id: string | null
          id: string
          mentions: Json | null
          opportunity_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          author?: string | null
          body: string
          company_id?: string | null
          created_at?: string
          founder_id?: string | null
          id?: string
          mentions?: Json | null
          opportunity_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          author?: string | null
          body?: string
          company_id?: string | null
          created_at?: string
          founder_id?: string | null
          id?: string
          mentions?: Json | null
          opportunity_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          ai_overview: Json | null
          assigned_partner: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          current_stage: string | null
          description: string | null
          disc_profile: Json | null
          estimated_investment: number | null
          event_id: string | null
          founder_id: string | null
          id: string
          industry: string | null
          meeting_id: string | null
          name: string
          priority: string | null
          probability: number | null
          source: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          ai_overview?: Json | null
          assigned_partner?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          current_stage?: string | null
          description?: string | null
          disc_profile?: Json | null
          estimated_investment?: number | null
          event_id?: string | null
          founder_id?: string | null
          id?: string
          industry?: string | null
          meeting_id?: string | null
          name: string
          priority?: string | null
          probability?: number | null
          source?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          ai_overview?: Json | null
          assigned_partner?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          current_stage?: string | null
          description?: string | null
          disc_profile?: Json | null
          estimated_investment?: number | null
          event_id?: string | null
          founder_id?: string | null
          id?: string
          industry?: string | null
          meeting_id?: string | null
          name?: string
          priority?: string | null
          probability?: number | null
          source?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          ai_relationship_score: number | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          deals_generated: number | null
          engagement_playbook: string | null
          fit_rating: string | null
          funding_available: string | null
          id: string
          industry: string | null
          kind: Database["public"]["Enums"]["org_kind"]
          last_contact_at: string | null
          logo_url: string | null
          name: string
          next_action: string | null
          notes: string | null
          owner_id: string | null
          province: string | null
          purpose: string | null
          referral_potential: number | null
          relationship_strength: number | null
          response_rate: number | null
          selection_criteria: string | null
          sme_quality: number | null
          source: string | null
          status: string | null
          strategic_importance: number | null
          trust_score: number | null
          updated_at: string
          website: string | null
          who_they_serve: string | null
        }
        Insert: {
          ai_relationship_score?: number | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deals_generated?: number | null
          engagement_playbook?: string | null
          fit_rating?: string | null
          funding_available?: string | null
          id?: string
          industry?: string | null
          kind: Database["public"]["Enums"]["org_kind"]
          last_contact_at?: string | null
          logo_url?: string | null
          name: string
          next_action?: string | null
          notes?: string | null
          owner_id?: string | null
          province?: string | null
          purpose?: string | null
          referral_potential?: number | null
          relationship_strength?: number | null
          response_rate?: number | null
          selection_criteria?: string | null
          sme_quality?: number | null
          source?: string | null
          status?: string | null
          strategic_importance?: number | null
          trust_score?: number | null
          updated_at?: string
          website?: string | null
          who_they_serve?: string | null
        }
        Update: {
          ai_relationship_score?: number | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deals_generated?: number | null
          engagement_playbook?: string | null
          fit_rating?: string | null
          funding_available?: string | null
          id?: string
          industry?: string | null
          kind?: Database["public"]["Enums"]["org_kind"]
          last_contact_at?: string | null
          logo_url?: string | null
          name?: string
          next_action?: string | null
          notes?: string | null
          owner_id?: string | null
          province?: string | null
          purpose?: string | null
          referral_potential?: number | null
          relationship_strength?: number | null
          response_rate?: number | null
          selection_criteria?: string | null
          sme_quality?: number | null
          source?: string | null
          status?: string | null
          strategic_importance?: number | null
          trust_score?: number | null
          updated_at?: string
          website?: string | null
          who_they_serve?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_suggestions: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          produced_signal: boolean
          question: string
          reason: string | null
          stage: string | null
          used: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          produced_signal?: boolean
          question: string
          reason?: string | null
          stage?: string | null
          used?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          produced_signal?: boolean
          question?: string
          reason?: string | null
          stage?: string | null
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "question_suggestions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_signals: {
        Row: {
          days_since_last: number | null
          founder_id: string
          interactions_90d: number | null
          last_contact_at: string | null
          strength_score: number | null
          updated_at: string
        }
        Insert: {
          days_since_last?: number | null
          founder_id: string
          interactions_90d?: number | null
          last_contact_at?: string | null
          strength_score?: number | null
          updated_at?: string
        }
        Update: {
          days_since_last?: number | null
          founder_id?: string
          interactions_90d?: number | null
          last_contact_at?: string | null
          strength_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_signals_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          company_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          founder_id: string | null
          id: string
          opportunity_id: string | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          founder_id?: string | null
          id?: string
          opportunity_id?: string | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          founder_id?: string | null
          id?: string
          opportunity_id?: string | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          color: string
          created_at: string
          display_name: string | null
          email: string
          id: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
        }
        Update: {
          color?: string
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          actor: string | null
          body: string | null
          company_id: string | null
          created_at: string
          event_type: string
          founder_id: string | null
          id: string
          occurred_at: string
          opportunity_id: string | null
          source_id: string | null
          source_type: string | null
          title: string | null
        }
        Insert: {
          actor?: string | null
          body?: string | null
          company_id?: string | null
          created_at?: string
          event_type: string
          founder_id?: string | null
          id?: string
          occurred_at?: string
          opportunity_id?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string | null
        }
        Update: {
          actor?: string | null
          body?: string | null
          company_id?: string | null
          created_at?: string
          event_type?: string
          founder_id?: string | null
          id?: string
          occurred_at?: string
          opportunity_id?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "member"
      org_kind: "ecosystem" | "sme"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      org_kind: ["ecosystem", "sme"],
    },
  },
} as const
