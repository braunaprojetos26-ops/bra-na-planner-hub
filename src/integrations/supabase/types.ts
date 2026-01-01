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
      contact_data_collections: {
        Row: {
          collected_at: string | null
          collected_by: string
          contact_id: string
          created_at: string
          data_collection: Json
          id: string
          schema_id: string
          status: string
          updated_at: string
        }
        Insert: {
          collected_at?: string | null
          collected_by: string
          contact_id: string
          created_at?: string
          data_collection?: Json
          id?: string
          schema_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          collected_at?: string | null
          collected_by?: string
          contact_id?: string
          created_at?: string
          data_collection?: Json
          id?: string
          schema_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_data_collections_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contact_data_collections_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_data_collections_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "data_collection_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_diagnostics: {
        Row: {
          category_scores: Json
          contact_id: string
          created_at: string
          generated_by: string
          id: string
          overall_score: number
          schema_version: string
        }
        Insert: {
          category_scores?: Json
          contact_id: string
          created_at?: string
          generated_by: string
          id?: string
          overall_score: number
          schema_version?: string
        }
        Update: {
          category_scores?: Json
          contact_id?: string
          created_at?: string
          generated_by?: string
          id?: string
          overall_score?: number
          schema_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_diagnostics_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_diagnostics_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          city: string | null
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
          state: string | null
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
          city?: string | null
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
          state?: string | null
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
          city?: string | null
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
          state?: string | null
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
          billing_date: string | null
          billing_type: string | null
          calculated_pbs: number
          clicksign_document_key: string | null
          clicksign_status: string | null
          contact_id: string
          contract_value: number
          created_at: string
          custom_data: Json
          end_date: string | null
          id: string
          installment_value: number | null
          installments: number | null
          meeting_count: number | null
          notes: string | null
          opportunity_id: string | null
          owner_id: string
          payment_method_code: string | null
          payment_type: string | null
          plan_type: string | null
          product_id: string
          reported_at: string
          start_date: string | null
          status: string
          updated_at: string
          vindi_bill_id: string | null
          vindi_customer_id: string | null
          vindi_status: string | null
          vindi_subscription_id: string | null
        }
        Insert: {
          billing_date?: string | null
          billing_type?: string | null
          calculated_pbs: number
          clicksign_document_key?: string | null
          clicksign_status?: string | null
          contact_id: string
          contract_value: number
          created_at?: string
          custom_data?: Json
          end_date?: string | null
          id?: string
          installment_value?: number | null
          installments?: number | null
          meeting_count?: number | null
          notes?: string | null
          opportunity_id?: string | null
          owner_id: string
          payment_method_code?: string | null
          payment_type?: string | null
          plan_type?: string | null
          product_id: string
          reported_at?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          vindi_bill_id?: string | null
          vindi_customer_id?: string | null
          vindi_status?: string | null
          vindi_subscription_id?: string | null
        }
        Update: {
          billing_date?: string | null
          billing_type?: string | null
          calculated_pbs?: number
          clicksign_document_key?: string | null
          clicksign_status?: string | null
          contact_id?: string
          contract_value?: number
          created_at?: string
          custom_data?: Json
          end_date?: string | null
          id?: string
          installment_value?: number | null
          installments?: number | null
          meeting_count?: number | null
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string
          payment_method_code?: string | null
          payment_type?: string | null
          plan_type?: string | null
          product_id?: string
          reported_at?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          vindi_bill_id?: string | null
          vindi_customer_id?: string | null
          vindi_status?: string | null
          vindi_subscription_id?: string | null
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
      data_collection_fields: {
        Row: {
          conditional_on: Json | null
          created_at: string
          data_path: string
          default_value: Json | null
          description: string | null
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          key: string
          label: string
          options: Json | null
          order_position: number
          placeholder: string | null
          section_id: string
          updated_at: string
          validation: Json | null
        }
        Insert: {
          conditional_on?: Json | null
          created_at?: string
          data_path: string
          default_value?: Json | null
          description?: string | null
          field_type: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          key: string
          label: string
          options?: Json | null
          order_position?: number
          placeholder?: string | null
          section_id: string
          updated_at?: string
          validation?: Json | null
        }
        Update: {
          conditional_on?: Json | null
          created_at?: string
          data_path?: string
          default_value?: Json | null
          description?: string | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          key?: string
          label?: string
          options?: Json | null
          order_position?: number
          placeholder?: string | null
          section_id?: string
          updated_at?: string
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "data_collection_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "data_collection_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      data_collection_schemas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_collection_schemas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      data_collection_sections: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          order_position: number
          schema_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          order_position?: number
          schema_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          order_position?: number
          schema_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_collection_sections_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "data_collection_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          order_position: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          order_position?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          order_position?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      diagnostic_rules: {
        Row: {
          category_id: string
          created_at: string
          data_paths: Json
          evaluation_prompt: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          data_paths?: Json
          evaluation_prompt: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          data_paths?: Json
          evaluation_prompt?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_categories"
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
      health_score_snapshots: {
        Row: {
          category: string
          contact_id: string
          created_at: string
          cross_sell_score: number | null
          days_since_last_meeting: number | null
          days_since_last_whatsapp: number | null
          extra_products_count: number | null
          has_referrals: boolean | null
          id: string
          meetings_score: number | null
          nps_score: number | null
          nps_value: number | null
          owner_id: string | null
          payment_days_late: number | null
          payment_score: number | null
          referrals_score: number | null
          snapshot_date: string
          total_score: number
          whatsapp_score: number | null
        }
        Insert: {
          category: string
          contact_id: string
          created_at?: string
          cross_sell_score?: number | null
          days_since_last_meeting?: number | null
          days_since_last_whatsapp?: number | null
          extra_products_count?: number | null
          has_referrals?: boolean | null
          id?: string
          meetings_score?: number | null
          nps_score?: number | null
          nps_value?: number | null
          owner_id?: string | null
          payment_days_late?: number | null
          payment_score?: number | null
          referrals_score?: number | null
          snapshot_date: string
          total_score?: number
          whatsapp_score?: number | null
        }
        Update: {
          category?: string
          contact_id?: string
          created_at?: string
          cross_sell_score?: number | null
          days_since_last_meeting?: number | null
          days_since_last_whatsapp?: number | null
          extra_products_count?: number | null
          has_referrals?: boolean | null
          id?: string
          meetings_score?: number | null
          nps_score?: number | null
          nps_value?: number | null
          owner_id?: string | null
          payment_days_late?: number | null
          payment_score?: number | null
          referrals_score?: number | null
          snapshot_date?: string
          total_score?: number
          whatsapp_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_score_snapshots_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_score_snapshots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      leadership_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          source: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leadership_knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leadership_meeting_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_position: number | null
          template_content: string
          topics: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_position?: number | null
          template_content: string
          topics?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_position?: number | null
          template_content?: string
          topics?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leadership_meeting_templates_created_by_fkey"
            columns: ["created_by"]
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nps_imports: {
        Row: {
          created_at: string
          error_count: number
          errors: Json | null
          file_name: string
          id: string
          imported_by: string
          success_count: number
          total_records: number
        }
        Insert: {
          created_at?: string
          error_count?: number
          errors?: Json | null
          file_name: string
          id?: string
          imported_by: string
          success_count?: number
          total_records?: number
        }
        Update: {
          created_at?: string
          error_count?: number
          errors?: Json | null
          file_name?: string
          id?: string
          imported_by?: string
          success_count?: number
          total_records?: number
        }
        Relationships: [
          {
            foreignKeyName: "nps_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          import_batch_id: string | null
          imported_by: string | null
          nps_value: number
          response_date: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          import_batch_id?: string | null
          imported_by?: string | null
          nps_value: number
          response_date: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          import_batch_id?: string | null
          imported_by?: string | null
          nps_value?: number
          response_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      one_on_one_meetings: {
        Row: {
          ai_preparation: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          leader_id: string
          leader_inputs: Json | null
          notes: string | null
          planner_id: string
          scheduled_date: string | null
          status: string | null
          template_id: string | null
          topic_responses: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_preparation?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          leader_id: string
          leader_inputs?: Json | null
          notes?: string | null
          planner_id: string
          scheduled_date?: string | null
          status?: string | null
          template_id?: string | null
          topic_responses?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_preparation?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          leader_id?: string
          leader_inputs?: Json | null
          notes?: string | null
          planner_id?: string
          scheduled_date?: string | null
          status?: string | null
          template_id?: string | null
          topic_responses?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_meetings_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "one_on_one_meetings_planner_id_fkey"
            columns: ["planner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "one_on_one_meetings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "leadership_meeting_templates"
            referencedColumns: ["id"]
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
      planner_behavioral_profiles: {
        Row: {
          analista_score: number | null
          areas_to_develop: string | null
          auto_motivation: string | null
          communication_style: string | null
          comunicador_score: number | null
          created_at: string | null
          created_by: string | null
          decision_making: string | null
          distancing_factors: string | null
          energy_level: string | null
          executor_score: number | null
          external_demand: string | null
          extracted_at: string | null
          flexibility: string | null
          id: string
          leadership_style: string | null
          motivational_factors: string | null
          planejador_score: number | null
          profile_date: string | null
          raw_report_url: string | null
          self_confidence: string | null
          self_esteem: string | null
          strengths: string | null
          updated_at: string | null
          user_id: string
          work_environment: string | null
        }
        Insert: {
          analista_score?: number | null
          areas_to_develop?: string | null
          auto_motivation?: string | null
          communication_style?: string | null
          comunicador_score?: number | null
          created_at?: string | null
          created_by?: string | null
          decision_making?: string | null
          distancing_factors?: string | null
          energy_level?: string | null
          executor_score?: number | null
          external_demand?: string | null
          extracted_at?: string | null
          flexibility?: string | null
          id?: string
          leadership_style?: string | null
          motivational_factors?: string | null
          planejador_score?: number | null
          profile_date?: string | null
          raw_report_url?: string | null
          self_confidence?: string | null
          self_esteem?: string | null
          strengths?: string | null
          updated_at?: string | null
          user_id: string
          work_environment?: string | null
        }
        Update: {
          analista_score?: number | null
          areas_to_develop?: string | null
          auto_motivation?: string | null
          communication_style?: string | null
          comunicador_score?: number | null
          created_at?: string | null
          created_by?: string | null
          decision_making?: string | null
          distancing_factors?: string | null
          energy_level?: string | null
          executor_score?: number | null
          external_demand?: string | null
          extracted_at?: string | null
          flexibility?: string | null
          id?: string
          leadership_style?: string | null
          motivational_factors?: string | null
          planejador_score?: number | null
          profile_date?: string | null
          raw_report_url?: string | null
          self_confidence?: string | null
          self_esteem?: string | null
          strengths?: string | null
          updated_at?: string | null
          user_id?: string
          work_environment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planner_behavioral_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "planner_behavioral_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      planner_cases: {
        Row: {
          advantage: number | null
          created_at: string
          description: string | null
          final_value: number | null
          id: string
          initial_value: number | null
          is_active: boolean
          order_position: number
          planner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          advantage?: number | null
          created_at?: string
          description?: string | null
          final_value?: number | null
          id?: string
          initial_value?: number | null
          is_active?: boolean
          order_position?: number
          planner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          advantage?: number | null
          created_at?: string
          description?: string | null
          final_value?: number | null
          id?: string
          initial_value?: number | null
          is_active?: boolean
          order_position?: number
          planner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      planner_feedbacks: {
        Row: {
          client_name: string
          created_at: string
          feedback_text: string | null
          id: string
          is_active: boolean
          media_type: string | null
          media_url: string | null
          order_position: number
          planner_id: string
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_active?: boolean
          media_type?: string | null
          media_url?: string | null
          order_position?: number
          planner_id: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_active?: boolean
          media_type?: string | null
          media_url?: string | null
          order_position?: number
          planner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      planner_goals: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          goal_type: string
          id: string
          status: string | null
          target_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          goal_type: string
          id?: string
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          goal_type?: string
          id?: string
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "planner_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      planner_profiles: {
        Row: {
          career_achievements: string | null
          certifications: string | null
          created_at: string
          display_name: string | null
          education: string | null
          id: string
          instagram_handle: string | null
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
          instagram_handle?: string | null
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
          instagram_handle?: string | null
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
      proposals: {
        Row: {
          base_value: number
          complexity: number
          contact_id: string
          created_at: string
          created_by: string
          diagnostic_score: number | null
          diagnostic_scores: Json | null
          discount_applied: boolean
          final_value: number
          id: string
          installment_value: number
          installments: number
          meetings: number
          monthly_income: number
          months_of_income: number
          opportunity_id: string | null
          presented_at: string | null
          proposal_type: string
          selected_topics: Json | null
          show_cases: boolean
          show_feedbacks: boolean
          status: string
          updated_at: string
        }
        Insert: {
          base_value: number
          complexity?: number
          contact_id: string
          created_at?: string
          created_by: string
          diagnostic_score?: number | null
          diagnostic_scores?: Json | null
          discount_applied?: boolean
          final_value: number
          id?: string
          installment_value: number
          installments: number
          meetings: number
          monthly_income: number
          months_of_income: number
          opportunity_id?: string | null
          presented_at?: string | null
          proposal_type?: string
          selected_topics?: Json | null
          show_cases?: boolean
          show_feedbacks?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          base_value?: number
          complexity?: number
          contact_id?: string
          created_at?: string
          created_by?: string
          diagnostic_score?: number | null
          diagnostic_scores?: Json | null
          discount_applied?: boolean
          final_value?: number
          id?: string
          installment_value?: number
          installments?: number
          meetings?: number
          monthly_income?: number
          months_of_income?: number
          opportunity_id?: string | null
          presented_at?: string | null
          proposal_type?: string
          selected_topics?: Json | null
          show_cases?: boolean
          show_feedbacks?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_opportunities_created: {
        Row: {
          client_plan_id: string
          created_at: string
          id: string
          opportunity_id: string
        }
        Insert: {
          client_plan_id: string
          created_at?: string
          id?: string
          opportunity_id: string
        }
        Update: {
          client_plan_id?: string
          created_at?: string
          id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_opportunities_created_client_plan_id_fkey"
            columns: ["client_plan_id"]
            isOneToOne: true
            referencedRelation: "client_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_opportunities_created_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
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
      ticket_messages: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_internal: boolean
          message: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_internal?: boolean
          message: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_internal?: boolean
          message?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          department: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          department: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          department?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
      whatsapp_messages: {
        Row: {
          contact_id: string
          created_at: string
          direction: string
          id: string
          message_text: string
          message_timestamp: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          direction: string
          id?: string
          message_text: string
          message_timestamp: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_text?: string
          message_timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
      is_any_operations_staff: { Args: { _user_id: string }; Returns: boolean }
      is_operations_staff: {
        Args: { _department: string; _user_id: string }
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
        | "operacoes_administrativo"
        | "operacoes_investimentos"
        | "operacoes_treinamentos"
        | "operacoes_rh"
        | "operacoes_marketing"
        | "operacoes_aquisicao_bens"
        | "operacoes_patrimonial"
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
        "operacoes_administrativo",
        "operacoes_investimentos",
        "operacoes_treinamentos",
        "operacoes_rh",
        "operacoes_marketing",
        "operacoes_aquisicao_bens",
        "operacoes_patrimonial",
      ],
    },
  },
} as const
