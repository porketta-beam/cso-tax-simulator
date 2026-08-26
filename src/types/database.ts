/**
 * Supabase 스키마 타입
 *
 * ⚠️ `supabase gen types typescript --linked > src/types/database.ts` 로 교체할 것 —
 * CLI 링크 전 임시 수기 작성. 스키마 원본은 `supabase/migrations/*.sql` 이다.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          business_type: string;
          created_at: string;
          deactivated_at: string | null;
          email: string | null;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          business_type?: string;
          created_at?: string;
          deactivated_at?: string | null;
          email?: string | null;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          business_type?: string;
          created_at?: string;
          deactivated_at?: string | null;
          email?: string | null;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
