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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      annotations: {
        Row: {
          color: string
          created_at: string
          document_id: string | null
          document_page_number: number | null
          id: string
          kind: string
          notebook_page_id: string | null
          opacity: number
          owner_id: string
          points: Json
          revision: number
          updated_at: string
          width: number
          z_index: number
        }
        Insert: {
          color: string
          created_at?: string
          document_id?: string | null
          document_page_number?: number | null
          id?: string
          kind: string
          notebook_page_id?: string | null
          opacity?: number
          owner_id: string
          points: Json
          revision?: number
          updated_at?: string
          width: number
          z_index?: number
        }
        Update: {
          color?: string
          created_at?: string
          document_id?: string | null
          document_page_number?: number | null
          id?: string
          kind?: string
          notebook_page_id?: string | null
          opacity?: number
          owner_id?: string
          points?: Json
          revision?: number
          updated_at?: string
          width?: number
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "annotations_document_owner_fk"
            columns: ["document_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "annotations_notebook_page_owner_fk"
            columns: ["notebook_page_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "notebook_pages"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "annotations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          accent_color: string
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          byte_size: number
          created_at: string
          deleted_at: string | null
          failure_code: string | null
          id: string
          indexed_at: string | null
          media_type: string
          notebook_id: string
          original_filename: string
          owner_id: string
          page_count: number | null
          parser_version: string | null
          revision: number
          sanitized_object_path: string | null
          sha256: string | null
          source_object_path: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          byte_size: number
          created_at?: string
          deleted_at?: string | null
          failure_code?: string | null
          id?: string
          indexed_at?: string | null
          media_type: string
          notebook_id: string
          original_filename: string
          owner_id: string
          page_count?: number | null
          parser_version?: string | null
          revision?: number
          sanitized_object_path?: string | null
          sha256?: string | null
          source_object_path?: string | null
          source_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          byte_size?: number
          created_at?: string
          deleted_at?: string | null
          failure_code?: string | null
          id?: string
          indexed_at?: string | null
          media_type?: string
          notebook_id?: string
          original_filename?: string
          owner_id?: string
          page_count?: number | null
          parser_version?: string | null
          revision?: number
          sanitized_object_path?: string | null
          sha256?: string | null
          source_object_path?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_notebook_owner_fk"
            columns: ["notebook_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_pages: {
        Row: {
          after_document_page_number: number | null
          created_at: string
          document_id: string | null
          id: string
          notebook_id: string
          owner_id: string
          paper_style: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          after_document_page_number?: number | null
          created_at?: string
          document_id?: string | null
          id?: string
          notebook_id: string
          owner_id: string
          paper_style: string
          position?: number
          title?: string
          updated_at?: string
        }
        Update: {
          after_document_page_number?: number | null
          created_at?: string
          document_id?: string | null
          id?: string
          notebook_id?: string
          owner_id?: string
          paper_style?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_pages_document_notebook_owner_fk"
            columns: ["document_id", "notebook_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "notebook_id", "owner_id"]
          },
          {
            foreignKeyName: "notebook_pages_notebook_owner_fk"
            columns: ["notebook_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "notebook_pages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_bookmarks: {
        Row: {
          created_at: string
          document_id: string | null
          document_page_number: number | null
          id: string
          notebook_id: string
          notebook_page_id: string | null
          owner_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          document_page_number?: number | null
          id?: string
          notebook_id: string
          notebook_page_id?: string | null
          owner_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          document_page_number?: number | null
          id?: string
          notebook_id?: string
          notebook_page_id?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_bookmarks_document_notebook_owner_fk"
            columns: ["document_id", "notebook_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "notebook_id", "owner_id"]
          },
          {
            foreignKeyName: "page_bookmarks_notebook_owner_fk"
            columns: ["notebook_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "page_bookmarks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_bookmarks_page_notebook_owner_fk"
            columns: ["notebook_page_id", "notebook_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "notebook_pages"
            referencedColumns: ["id", "notebook_id", "owner_id"]
          },
        ]
      }
      notebooks: {
        Row: {
          archived_at: string | null
          course_id: string | null
          cover_color: string
          created_at: string
          description: string | null
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          course_id?: string | null
          cover_color?: string
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          course_id?: string | null
          cover_color?: string
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebooks_course_owner_fk"
            columns: ["course_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "notebooks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          onboarding_completed_at: string | null
          study_program: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_completed_at?: string | null
          study_program?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          study_program?: string | null
          timezone?: string
          updated_at?: string
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
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
