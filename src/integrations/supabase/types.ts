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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assistant_knowledge: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_knowledge_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_plan_meetings: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          meeting_id: string | null
          meeting_number: number
          plan_id: string
          scheduled_date: string
          status: string
          theme: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          meeting_id?: string | null
          meeting_number: number
          plan_id: string
          scheduled_date: string
          status?: string
          theme: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          meeting_id?: string | null
          meeting_number?: number
          plan_id?: string
          scheduled_date?: string
          status?: string
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_plan_meetings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_meetings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "client_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_plans: {
        Row: {
          contact_id: string
          contract_id: string | null
          contract_value: number
          created_at: string
          created_by: string
          end_date: string
          id: string
          notes: string | null
          owner_id: string
          start_date: string
          status: string
          total_meetings: number
          updated_at: string
        }
        Insert: {
          contact_id: string
          contract_id?: string | null
          contract_value: number
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          notes?: string | null
          owner_id: string
          start_date: string
          status?: string
          total_meetings: number
          updated_at?: string
        }
        Update: {
          contact_id?: string
          contract_id?: string | null
          contract_value?: number
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          notes?: string | null
          owner_id?: string
          start_date?: string
          status?: string
          total_meetings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_plans_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plans_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_history: {
        Row: {
          action: string
          changed_by: string
          contact_id: string
          created_at: string
          from_stage_id: string | null
          id: string
          notes: string | null
          to_stage_id: string | null
        }
        Insert: {
          action: string
          changed_by: string
          contact_id: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          to_stage_id?: string | null
        }
        Update: {
          action?: string
          changed_by?: string
          contact_id?: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contact_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "funnel_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "funnel_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_prospection_list: {
        Row: {
          added_at: string
          contact_id: string
          id: string
          owner_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          id?: string
          owner_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_prospection_list_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          birth_date: string | null
          campaign: string | null
          client_code: string | null
          cpf: string | null
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          gender: string | null
          id: string
          income: number | null
          is_dirty_base: boolean
          marital_status: string | null
          notes: string | null
          owner_id: string | null
          phone: string
          profession: string | null
          qualification: number | null
          referred_by: string | null
          rg: string | null
          rg_issue_date: string | null
          rg_issuer: string | null
          source: string | null
          source_detail: string | null
          temperature: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          campaign?: string | null
          client_code?: string | null
          cpf?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          income?: number | null
          is_dirty_base?: boolean
          marital_status?: string | null
          notes?: string | null
          owner_id?: string | null
          phone: string
          profession?: string | null
          qualification?: number | null
          referred_by?: string | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          source?: string | null
          source_detail?: string | null
          temperature?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          campaign?: string | null
          client_code?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          income?: number | null
          is_dirty_base?: boolean
          marital_status?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string
          profession?: string | null
          qualification?: number | null
          referred_by?: string | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          source?: string | null
          source_detail?: string | null
          temperature?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contacts_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          calculated_pbs: number
          contact_id: string
          contract_value: number
          created_at: string
          custom_data: Json
          end_date: string | null
          id: string
          installment_value: number | null
          installments: number | null
          notes: string | null
          opportunity_id: string | null
          owner_id: string
          payment_type: string | null
          product_id: string
          reported_at: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          calculated_pbs: number
          contact_id: string
          contract_value: number
          created_at?: string
          custom_data?: Json
          end_date?: string | null
          id?: string
          installment_value?: number | null
          installments?: number | null
          notes?: string | null
          opportunity_id?: string | null
          owner_id: string
          payment_type?: string | null
          product_id: string
          reported_at?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          calculated_pbs?: number
          contact_id?: string
          contract_value?: number
          created_at?: string
          custom_data?: Json
          end_date?: string | null
          id?: string
          installment_value?: number | null
          installments?: number | null
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string
          payment_type?: string | null
          product_id?: string
          reported_at?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_product_categories: {
        Row: {
          category_id: string
          created_at: string
          funnel_id: string
          id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          funnel_id: string
          id?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          funnel_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_product_categories_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_stages: {
        Row: {
          color: string
          created_at: string
          funnel_id: string
          id: string
          name: string
          order_position: number
          sla_hours: number | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          funnel_id: string
          id?: string
          name: string
          order_position: number
          sla_hours?: number | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          funnel_id?: string
          id?: string
          name?: string
          order_position?: number
          sla_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_stages_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_suggested_products: {
        Row: {
          funnel_id: string
          id: string
          is_default: boolean
          order_position: number
          product_id: string
        }
        Insert: {
          funnel_id: string
          id?: string
          is_default?: boolean
          order_position?: number
          product_id: string
        }
        Update: {
          funnel_id?: string
          id?: string
          is_default?: boolean
          order_position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_suggested_products_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_suggested_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          auto_create_next: boolean
          contract_prompt_text: string | null
          created_at: string
          generates_contract: boolean
          id: string
          is_active: boolean
          name: string
          order_position: number
          updated_at: string
        }
        Insert: {
          auto_create_next?: boolean
          contract_prompt_text?: string | null
          created_at?: string
          generates_contract?: boolean
          id?: string
          is_active?: boolean
          name: string
          order_position: number
          updated_at?: string
        }
        Update: {
          auto_create_next?: boolean
          contract_prompt_text?: string | null
          created_at?: string
          generates_contract?: boolean
          id?: string
          is_active?: boolean
          name?: string
          order_position?: number
          updated_at?: string
        }
        Relationships: []
      }
      institutional_presentations: {
        Row: {
          created_at: string
          file_path: string
          file_type: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_presentations_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lost_reasons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      meeting_minutes: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          meeting_id: string | null
          meeting_type: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          meeting_date: string
          meeting_id?: string | null
          meeting_type: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          meeting_id?: string | null
          meeting_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          allows_companion: boolean
          contact_id: string
          created_at: string
          duration_minutes: number
          id: string
          meeting_type: string
          notes: string | null
          opportunity_id: string | null
          parent_meeting_id: string | null
          participants: string[] | null
          reschedule_count: number
          scheduled_at: string
          scheduled_by: string
          status: string
          updated_at: string
        }
        Insert: {
          allows_companion?: boolean
          contact_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_type: string
          notes?: string | null
          opportunity_id?: string | null
          parent_meeting_id?: string | null
          participants?: string[] | null
          reschedule_count?: number
          scheduled_at: string
          scheduled_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          allows_companion?: boolean
          contact_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_type?: string
          notes?: string | null
          opportunity_id?: string | null
          parent_meeting_id?: string | null
          participants?: string[] | null
          reschedule_count?: number
          scheduled_at?: string
          scheduled_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_parent_meeting_id_fkey"
            columns: ["parent_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      opportunities: {
        Row: {
          contact_id: string
          converted_at: string | null
          created_at: string
          created_by: string
          current_funnel_id: string
          current_stage_id: string
          id: string
          lost_at: string | null
          lost_from_stage_id: string | null
          lost_reason_id: string | null
          notes: string | null
          proposal_value: number | null
          qualification: number | null
          stage_entered_at: string
          status: Database["public"]["Enums"]["contact_status"]
          temperature: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          converted_at?: string | null
          created_at?: string
          created_by: string
          current_funnel_id: string
          current_stage_id: string
          id?: string
          lost_at?: string | null
          lost_from_stage_id?: string | null
          lost_reason_id?: string | null
          notes?: string | null
          proposal_value?: number | null
          qualification?: number | null
          stage_entered_at?: string
          status?: Database["public"]["Enums"]["contact_status"]
          temperature?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          converted_at?: string | null
          created_at?: string
          created_by?: string
          current_funnel_id?: string
          current_stage_id?: string
          id?: string
          lost_at?: string | null
          lost_from_stage_id?: string | null
          lost_reason_id?: string | null
          notes?: string | null
          proposal_value?: number | null
          qualification?: number | null
          stage_entered_at?: string
          status?: Database["public"]["Enums"]["contact_status"]
          temperature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_current_funnel_id_fkey"
            columns: ["current_funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "funnel_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lost_from_stage_id_fkey"
            columns: ["lost_from_stage_id"]
            isOneToOne: false
            referencedRelation: "funnel_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lost_reason_id_fkey"
            columns: ["lost_reason_id"]
            isOneToOne: false
            referencedRelation: "lost_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_history: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          from_stage_id: string | null
          id: string
          notes: string | null
          opportunity_id: string
          to_stage_id: string | null
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          to_stage_id?: string | null
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "funnel_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "funnel_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      outlook_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_profiles: {
        Row: {
          career_achievements: string | null
          certifications: string | null
          created_at: string
          display_name: string | null
          education: string | null
          id: string
          life_achievements: string | null
          photo_url: string | null
          professional_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          career_achievements?: string | null
          certifications?: string | null
          created_at?: string
          display_name?: string | null
          education?: string | null
          id?: string
          life_achievements?: string | null
          photo_url?: string | null
          professional_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          career_achievements?: string | null
          certifications?: string | null
          created_at?: string
          display_name?: string | null
          education?: string | null
          id?: string
          life_achievements?: string | null
          photo_url?: string | null
          professional_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          order_position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_position?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          base_value: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          has_validity: boolean
          id: string
          is_active: boolean
          is_partner_product: boolean
          name: string
          order_position: number
          partner_name: string | null
          pb_calculation_type: string
          pb_constants: Json | null
          pb_formula: string | null
          pb_value: number
          pb_variables: Json | null
          requires_payment_type: boolean
          updated_at: string
        }
        Insert: {
          base_value?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          has_validity?: boolean
          id?: string
          is_active?: boolean
          is_partner_product?: boolean
          name: string
          order_position?: number
          partner_name?: string | null
          pb_calculation_type?: string
          pb_constants?: Json | null
          pb_formula?: string | null
          pb_value?: number
          pb_variables?: Json | null
          requires_payment_type?: boolean
          updated_at?: string
        }
        Update: {
          base_value?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          has_validity?: boolean
          id?: string
          is_active?: boolean
          is_partner_product?: boolean
          name?: string
          order_position?: number
          partner_name?: string | null
          pb_calculation_type?: string
          pb_constants?: Json | null
          pb_formula?: string | null
          pb_value?: number
          pb_variables?: Json | null
          requires_payment_type?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          position: Database["public"]["Enums"]["user_position"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          position?: Database["public"]["Enums"]["user_position"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          position?: Database["public"]["Enums"]["user_position"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          daily_reminder_sent_at: string | null
          description: string | null
          id: string
          opportunity_id: string | null
          reminder_sent_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          daily_reminder_sent_at?: string | null
          description?: string | null
          id?: string
          opportunity_id?: string | null
          reminder_sent_at?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          daily_reminder_sent_at?: string | null
          description?: string | null
          id?: string
          opportunity_id?: string | null
          reminder_sent_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
      user_hierarchy: {
        Row: {
          created_at: string
          id: string
          manager_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wiki_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          order_position: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          order_position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          order_position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      wiki_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          href: string | null
          icon: string | null
          id: string
          is_active: boolean
          item_type: string
          keywords: string[]
          order_position: number
          parent_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          href?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          item_type: string
          keywords?: string[]
          order_position?: number
          parent_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          href?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          keywords?: string[]
          order_position?: number
          parent_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "wiki_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "wiki_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_user: {
        Args: { _accessor_id: string; _target_id: string }
        Returns: boolean
      }
      can_view_unassigned_contacts: {
        Args: { _user_id: string }
        Returns: boolean
      }
      get_accessible_user_ids: {
        Args: { _accessor_id: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "planejador" | "lider" | "supervisor" | "gerente" | "superadmin"
      contact_status: "active" | "lost" | "won"
      task_status: "pending" | "completed" | "overdue"
      task_type:
        | "call"
        | "email"
        | "meeting"
        | "follow_up"
        | "proposal"
        | "document"
        | "whatsapp"
        | "other"
      user_position:
        | "planejador_financeiro"
        | "planejador_prime"
        | "planejador_exclusive"
        | "lider_comercial"
        | "especialista"
        | "especialista_private"
        | "coordenador_comercial"
        | "coordenador_executivo"
        | "gerente_comercial"
        | "superintendente"
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
      app_role: ["planejador", "lider", "supervisor", "gerente", "superadmin"],
      contact_status: ["active", "lost", "won"],
      task_status: ["pending", "completed", "overdue"],
      task_type: [
        "call",
        "email",
        "meeting",
        "follow_up",
        "proposal",
        "document",
        "whatsapp",
        "other",
      ],
      user_position: [
        "planejador_financeiro",
        "planejador_prime",
        "planejador_exclusive",
        "lider_comercial",
        "especialista",
        "especialista_private",
        "coordenador_comercial",
        "coordenador_executivo",
        "gerente_comercial",
        "superintendente",
      ],
    },
  },
} as const
