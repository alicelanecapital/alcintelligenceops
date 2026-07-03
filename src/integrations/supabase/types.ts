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
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          linkedin: string | null
          name: string
          notes: string | null
          organisation_id: string | null
          owner_id: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          linkedin?: string | null
          name: string
          notes?: string | null
          organisation_id?: string | null
          owner_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          linkedin?: string | null
          name?: string
          notes?: string | null
          organisation_id?: string | null
          owner_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
          city: string | null
          cost: string | null
          cost_type: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          discovered_at: string | null
          end_date: string | null
          expected_audience: string | null
          id: string
          industry: string[] | null
          name: string
          owner: string | null
          registration_link: string | null
          source_url: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          venue: string | null
          website: string | null
        }
        Insert: {
          ai_factors?: Json | null
          ai_score?: number | null
          ai_summary?: string | null
          city?: string | null
          cost?: string | null
          cost_type?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          discovered_at?: string | null
          end_date?: string | null
          expected_audience?: string | null
          id?: string
          industry?: string[] | null
          name: string
          owner?: string | null
          registration_link?: string | null
          source_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          venue?: string | null
          website?: string | null
        }
        Update: {
          ai_factors?: Json | null
          ai_score?: number | null
          ai_summary?: string | null
          city?: string | null
          cost?: string | null
          cost_type?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          discovered_at?: string | null
          end_date?: string | null
          expected_audience?: string | null
          id?: string
          industry?: string[] | null
          name?: string
          owner?: string | null
          registration_link?: string | null
          source_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          venue?: string | null
          website?: string | null
        }
        Relationships: []
      }
      founders: {
        Row: {
          ai_investment_score: number | null
          contact_id: string | null
          created_at: string
          employees: number | null
          funding_sought: string | null
          id: string
          internal_notes: string | null
          linkedin: string | null
          location: string | null
          name: string
          organisation_id: string | null
          owner_id: string | null
          photo_url: string | null
          pitch_deck_url: string | null
          problem: string | null
          referral_source: string | null
          revenue: string | null
          sector: string | null
          solution: string | null
          stage: string | null
          startup_name: string | null
          traction: string | null
          updated_at: string
          website: string | null
          why_interesting: string | null
        }
        Insert: {
          ai_investment_score?: number | null
          contact_id?: string | null
          created_at?: string
          employees?: number | null
          funding_sought?: string | null
          id?: string
          internal_notes?: string | null
          linkedin?: string | null
          location?: string | null
          name: string
          organisation_id?: string | null
          owner_id?: string | null
          photo_url?: string | null
          pitch_deck_url?: string | null
          problem?: string | null
          referral_source?: string | null
          revenue?: string | null
          sector?: string | null
          solution?: string | null
          stage?: string | null
          startup_name?: string | null
          traction?: string | null
          updated_at?: string
          website?: string | null
          why_interesting?: string | null
        }
        Update: {
          ai_investment_score?: number | null
          contact_id?: string | null
          created_at?: string
          employees?: number | null
          funding_sought?: string | null
          id?: string
          internal_notes?: string | null
          linkedin?: string | null
          location?: string | null
          name?: string
          organisation_id?: string | null
          owner_id?: string | null
          photo_url?: string | null
          pitch_deck_url?: string | null
          problem?: string | null
          referral_source?: string | null
          revenue?: string | null
          sector?: string | null
          solution?: string | null
          stage?: string | null
          startup_name?: string | null
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
          created_at: string
          current_stage: string | null
          deal_id: string | null
          ended_at: string | null
          founder_id: string | null
          founder_name: string | null
          id: string
          industry: string | null
          interviewer_name: string | null
          organisation_id: string | null
          started_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          brief?: Json | null
          business_name?: string | null
          created_at?: string
          current_stage?: string | null
          deal_id?: string | null
          ended_at?: string | null
          founder_id?: string | null
          founder_name?: string | null
          id?: string
          industry?: string | null
          interviewer_name?: string | null
          organisation_id?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          brief?: Json | null
          business_name?: string | null
          created_at?: string
          current_stage?: string | null
          deal_id?: string | null
          ended_at?: string | null
          founder_id?: string | null
          founder_name?: string | null
          id?: string
          industry?: string | null
          interviewer_name?: string | null
          organisation_id?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
