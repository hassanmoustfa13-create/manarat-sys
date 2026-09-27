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
      grid_settings: {
        Row: {
          grid_key: string
          settings: Json
          updated_at: string
        }
        Insert: {
          grid_key: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          grid_key?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      office_visas: {
        Row: {
          created_at: string
          created_by: string | null
          holder_name: string
          holder_phone: string
          id: string
          new_sponsor_name: string
          new_sponsor_phone: string
          payment_status: string
          seq: number
          updated_at: string
          updated_by: string | null
          visa_number: string
          visa_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          holder_name?: string
          holder_phone?: string
          id?: string
          new_sponsor_name?: string
          new_sponsor_phone?: string
          payment_status?: string
          seq?: number
          updated_at?: string
          updated_by?: string | null
          visa_number?: string
          visa_status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          holder_name?: string
          holder_phone?: string
          id?: string
          new_sponsor_name?: string
          new_sponsor_phone?: string
          payment_status?: string
          seq?: number
          updated_at?: string
          updated_by?: string | null
          visa_number?: string
          visa_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          action_status: string
          created_at: string
          created_by: string | null
          customer_name: string
          id: string
          lead_source: string
          nationality: string
          notes: string
          phone: string
          pref_age: string
          pref_driving_license: string
          pref_experience: string
          pref_languages: string
          pref_religion: string
          profession: string
          request_date: string | null
          request_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_status?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          lead_source?: string
          nationality?: string
          notes?: string
          phone?: string
          pref_age?: string
          pref_driving_license?: string
          pref_experience?: string
          pref_languages?: string
          pref_religion?: string
          profession?: string
          request_date?: string | null
          request_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_status?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          lead_source?: string
          nationality?: string
          notes?: string
          phone?: string
          pref_age?: string
          pref_driving_license?: string
          pref_experience?: string
          pref_languages?: string
          pref_religion?: string
          profession?: string
          request_date?: string | null
          request_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: string
          event_type: string
          id: string
          identifier: string
          success: boolean
          target_user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: string
          event_type: string
          id?: string
          identifier?: string
          success?: boolean
          target_user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: string
          event_type?: string
          id?: string
          identifier?: string
          success?: boolean
          target_user_id?: string | null
        }
        Relationships: []
      }
      transfers: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          down_payment: number
          id: string
          medical_exam: string
          new_sponsor_name: string
          new_sponsor_phone: string
          notes: string
          old_sponsor_dues: number
          old_sponsor_name: string
          old_sponsor_phone: string
          payment_status: string
          period_end: string | null
          period_start: string | null
          remaining_amount: number | null
          residency_status: string
          salary_dues_amount: number
          salary_dues_status: string
          transfer_date: string | null
          transfer_stage: string
          transfer_type: string
          updated_at: string
          updated_by: string | null
          visa_type: string
          worker_condition: string
          worker_id: string
          worker_location: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          down_payment?: number
          id?: string
          medical_exam?: string
          new_sponsor_name?: string
          new_sponsor_phone?: string
          notes?: string
          old_sponsor_dues?: number
          old_sponsor_name?: string
          old_sponsor_phone?: string
          payment_status?: string
          period_end?: string | null
          period_start?: string | null
          remaining_amount?: number | null
          residency_status?: string
          salary_dues_amount?: number
          salary_dues_status?: string
          transfer_date?: string | null
          transfer_stage?: string
          transfer_type?: string
          updated_at?: string
          updated_by?: string | null
          visa_type?: string
          worker_condition?: string
          worker_id: string
          worker_location?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          down_payment?: number
          id?: string
          medical_exam?: string
          new_sponsor_name?: string
          new_sponsor_phone?: string
          notes?: string
          old_sponsor_dues?: number
          old_sponsor_name?: string
          old_sponsor_phone?: string
          payment_status?: string
          period_end?: string | null
          period_start?: string | null
          remaining_amount?: number | null
          residency_status?: string
          salary_dues_amount?: number
          salary_dues_status?: string
          transfer_date?: string | null
          transfer_stage?: string
          transfer_type?: string
          updated_at?: string
          updated_by?: string | null
          visa_type?: string
          worker_condition?: string
          worker_id?: string
          worker_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
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
      workers: {
        Row: {
          arrival_date: string | null
          arrival_status: string
          arrival_time: string
          created_at: string
          created_by: string | null
          current_location: string
          current_sponsor_name: string
          current_sponsor_phone: string
          entry_date: string | null
          flight_group: string
          id: string
          monthly_salary: number
          name: string
          nationality: string
          notes: string
          passport_number: string
          profession: string
          residency_number: string
          residency_status: string
          transfer_status: string
          updated_at: string
          updated_by: string | null
          visa_type: string
        }
        Insert: {
          arrival_date?: string | null
          arrival_status?: string
          arrival_time?: string
          created_at?: string
          created_by?: string | null
          current_location?: string
          current_sponsor_name?: string
          current_sponsor_phone?: string
          entry_date?: string | null
          flight_group?: string
          id?: string
          monthly_salary?: number
          name: string
          nationality?: string
          notes?: string
          passport_number: string
          profession?: string
          residency_number?: string
          residency_status?: string
          transfer_status?: string
          updated_at?: string
          updated_by?: string | null
          visa_type?: string
        }
        Update: {
          arrival_date?: string | null
          arrival_status?: string
          arrival_time?: string
          created_at?: string
          created_by?: string | null
          current_location?: string
          current_sponsor_name?: string
          current_sponsor_phone?: string
          entry_date?: string | null
          flight_group?: string
          id?: string
          monthly_salary?: number
          name?: string
          nationality?: string
          notes?: string
          passport_number?: string
          profession?: string
          residency_number?: string
          residency_status?: string
          transfer_status?: string
          updated_at?: string
          updated_by?: string | null
          visa_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_transfer: { Args: { _transfer_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      staff_names: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
