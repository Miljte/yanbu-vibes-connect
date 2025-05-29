export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_entity_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_entity_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_entity_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_promotion: boolean | null
          message: string
          message_type: Database["public"]["Enums"]["message_type"] | null
          place_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_promotion?: boolean | null
          message: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          place_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_promotion?: boolean | null
          message?: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          place_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string | null
          id: string
          registered_at: string | null
          user_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          registered_at?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          registered_at?: string | null
          user_id?: string | null
        }
        Relationships: [
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
          created_at: string | null
          current_attendees: number | null
          description: string | null
          end_time: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_attendees: number | null
          organizer_id: string
          place_id: string | null
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_attendees?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_attendees?: number | null
          organizer_id: string
          place_id?: string | null
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_attendees?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_attendees?: number | null
          organizer_id?: string
          place_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_subscriptions: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          merchant_id: string | null
          monthly_fee: number | null
          place_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          merchant_id?: string | null
          monthly_fee?: number | null
          place_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          merchant_id?: string | null
          monthly_fee?: number | null
          place_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_subscriptions_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          merchant_id: string
          place_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_id: string
          place_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_id?: string
          place_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          created_at: string | null
          crowd_level: Database["public"]["Enums"]["crowd_level"] | null
          description: string | null
          female_percentage: number | null
          id: string
          image_urls: string[] | null
          images: string[] | null
          is_active: boolean | null
          latitude: number
          longitude: number
          male_percentage: number | null
          merchant_id: string | null
          name: string
          type: Database["public"]["Enums"]["place_type"]
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          crowd_level?: Database["public"]["Enums"]["crowd_level"] | null
          description?: string | null
          female_percentage?: number | null
          id?: string
          image_urls?: string[] | null
          images?: string[] | null
          is_active?: boolean | null
          latitude: number
          longitude: number
          male_percentage?: number | null
          merchant_id?: string | null
          name: string
          type: Database["public"]["Enums"]["place_type"]
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          crowd_level?: Database["public"]["Enums"]["crowd_level"] | null
          description?: string | null
          female_percentage?: number | null
          id?: string
          image_urls?: string[] | null
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          male_percentage?: number | null
          merchant_id?: string | null
          name?: string
          type?: Database["public"]["Enums"]["place_type"]
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_preset: string | null
          created_at: string | null
          gender: string | null
          id: string
          interests: string[] | null
          location_sharing_enabled: boolean | null
          nickname: string
          notifications_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          avatar_preset?: string | null
          created_at?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          location_sharing_enabled?: boolean | null
          nickname: string
          notifications_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          avatar_preset?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          location_sharing_enabled?: boolean | null
          nickname?: string
          notifications_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reported_messages: {
        Row: {
          created_at: string | null
          id: string
          message_id: string | null
          reason: string | null
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          reason?: string | null
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          reason?: string | null
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reported_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          banned_at: string | null
          banned_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          accuracy: number | null
          id: string
          latitude: number
          longitude: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accuracy?: number | null
          id?: string
          latitude: number
          longitude: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accuracy?: number | null
          id?: string
          latitude?: number
          longitude?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_mutes: {
        Row: {
          expires_at: string | null
          id: string
          is_active: boolean | null
          muted_at: string | null
          muted_by: string
          reason: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          muted_at?: string | null
          muted_by: string
          reason?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          muted_at?: string | null
          muted_by?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
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
      calculate_distance: {
        Args: { lat1: number; lon1: number; lat2: number; lon2: number }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "merchant" | "admin"
      crowd_level: "low" | "medium" | "high"
      message_type: "user" | "merchant" | "system"
      place_type:
        | "cafe"
        | "restaurant"
        | "mall"
        | "beach"
        | "park"
        | "event_venue"
      subscription_status: "active" | "inactive" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "merchant", "admin"],
      crowd_level: ["low", "medium", "high"],
      message_type: ["user", "merchant", "system"],
      place_type: [
        "cafe",
        "restaurant",
        "mall",
        "beach",
        "park",
        "event_venue",
      ],
      subscription_status: ["active", "inactive", "suspended"],
    },
  },
} as const
