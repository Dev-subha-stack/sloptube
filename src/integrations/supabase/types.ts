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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_meta: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bug_report_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          report_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          report_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          reporter_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          reporter_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          reporter_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_stats_daily: {
        Row: {
          channel_id: string
          day: string
          subs_gained: number
          subs_lost: number
          updated_at: string
          views: number
          watch_s: number
        }
        Insert: {
          channel_id: string
          day: string
          subs_gained?: number
          subs_lost?: number
          updated_at?: string
          views?: number
          watch_s?: number
        }
        Update: {
          channel_id?: string
          day?: string
          subs_gained?: number
          subs_lost?: number
          updated_at?: string
          views?: number
          watch_s?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_stats_daily_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_strikes: {
        Row: {
          actor_id: string | null
          channel_id: string
          created_at: string
          id: string
          reason: string
          target_id: string | null
          target_kind: string | null
        }
        Insert: {
          actor_id?: string | null
          channel_id: string
          created_at?: string
          id?: string
          reason?: string
          target_id?: string | null
          target_kind?: string | null
        }
        Update: {
          actor_id?: string | null
          channel_id?: string
          created_at?: string
          id?: string
          reason?: string
          target_id?: string | null
          target_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_strikes_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_strikes_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          comments_default: string
          created_at: string
          description: string
          handle: string
          handle_changed_at: string | null
          id: string
          links: Json
          name: string
          owner_id: string
          subscriber_count: number
          suspended_at: string | null
          suspended_reason: string | null
          video_count: number
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          comments_default?: string
          created_at?: string
          description?: string
          handle: string
          handle_changed_at?: string | null
          id?: string
          links?: Json
          name?: string
          owner_id: string
          subscriber_count?: number
          suspended_at?: string | null
          suspended_reason?: string | null
          video_count?: number
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          comments_default?: string
          created_at?: string
          description?: string
          handle?: string
          handle_changed_at?: string | null
          id?: string
          links?: Json
          name?: string
          owner_id?: string
          subscriber_count?: number
          suspended_at?: string | null
          suspended_reason?: string | null
          video_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "channels_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comment_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_requests: {
        Row: {
          at: string
          bucket: string
          user_id: string
        }
        Insert: {
          at?: string
          bucket: string
          user_id: string
        }
        Update: {
          at?: string
          bucket?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hearted: boolean
          hidden_at: string | null
          id: string
          like_count: number
          parent_id: string | null
          pinned: boolean
          removed_at: string | null
          reply_count: number
          video_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hearted?: boolean
          hidden_at?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
          pinned?: boolean
          removed_at?: string | null
          reply_count?: number
          video_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hearted?: boolean
          hidden_at?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
          pinned?: boolean
          removed_at?: string | null
          reply_count?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comment_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          body: string
          created_at: string
          email: string
          handled_at: string | null
          handled_by: string | null
          id: string
          name: string
          sender_key: string | null
          topic: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          name: string
          sender_key?: string | null
          topic?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          name?: string
          sender_key?: string | null
          topic?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encode_jobs: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          progress: number
          started_at: string | null
          status: string
          video_id: string
          worker: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          progress?: number
          started_at?: string | null
          status?: string
          video_id: string
          worker?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          progress?: number
          started_at?: string | null
          status?: string
          video_id?: string
          worker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encode_jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_requests: {
        Row: {
          at: string
          bucket: string
          key: string
        }
        Insert: {
          at?: string
          bucket: string
          key: string
        }
        Update: {
          at?: string
          bucket?: string
          key?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string
          key: string
          label: string
          mode: string
          updated_at: string
          users: string[]
        }
        Insert: {
          description?: string
          key: string
          label?: string
          mode?: string
          updated_at?: string
          users?: string[]
        }
        Update: {
          description?: string
          key?: string
          label?: string
          mode?: string
          updated_at?: string
          users?: string[]
        }
        Relationships: []
      }
      mod_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          reason: string
          target_id: string | null
          target_kind: string
          target_label: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          target_id?: string | null
          target_kind: string
          target_label?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          target_id?: string | null
          target_kind?: string
          target_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "mod_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_requests: {
        Row: {
          at: string
          bucket: string
          user_id: string
        }
        Insert: {
          at?: string
          bucket: string
          user_id: string
        }
        Update: {
          at?: string
          bucket?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_words: {
        Row: {
          added_by: string | null
          created_at: string
          word: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          word: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_words_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          bug_report_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          actor_id?: string | null
          bug_report_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          actor_id?: string | null
          bug_report_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comment_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string
          birthdate: string | null
          created_at: string
          display_name: string
          email_placeholder: boolean
          history_paused: boolean
          id: string
          onboarded: boolean
          role: string
          username: string
          yapin_id: string | null
          yapin_username: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string
          birthdate?: string | null
          created_at?: string
          display_name?: string
          email_placeholder?: boolean
          history_paused?: boolean
          id: string
          onboarded?: boolean
          role?: string
          username: string
          yapin_id?: string | null
          yapin_username?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string
          birthdate?: string | null
          created_at?: string
          display_name?: string
          email_placeholder?: boolean
          history_paused?: boolean
          id?: string
          onboarded?: boolean
          role?: string
          username?: string
          yapin_id?: string | null
          yapin_username?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string
          id: string
          kind: string
          reason: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          kind?: string
          reason: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_kind: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          kind?: string
          reason?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_requests: {
        Row: {
          at: string
          bucket: string
          key: string
        }
        Insert: {
          at?: string
          bucket: string
          key: string
        }
        Update: {
          at?: string
          bucket?: string
          key?: string
        }
        Relationships: []
      }
      short_watches: {
        Row: {
          user_id: string
          video_id: string
          watched_at: string
        }
        Insert: {
          user_id: string
          video_id: string
          watched_at?: string
        }
        Update: {
          user_id?: string
          video_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_watches_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_requests: {
        Row: {
          at: string
          bucket: string
          key: string
        }
        Insert: {
          at?: string
          bucket: string
          key: string
        }
        Update: {
          at?: string
          bucket?: string
          key?: string
        }
        Relationships: []
      }
      storage_cleanup: {
        Row: {
          attempts: number
          deleted_objects: number | null
          error: string | null
          finished_at: string | null
          id: string
          prefix: string
          queued_at: string
          started_at: string | null
          status: string
          video_id: string
          worker: string | null
        }
        Insert: {
          attempts?: number
          deleted_objects?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          prefix: string
          queued_at?: string
          started_at?: string | null
          status?: string
          video_id: string
          worker?: string | null
        }
        Update: {
          attempts?: number
          deleted_objects?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          prefix?: string
          queued_at?: string
          started_at?: string | null
          status?: string
          video_id?: string
          worker?: string | null
        }
        Relationships: []
      }
      studio_requests: {
        Row: {
          at: string
          bucket: string
          user_id: string
        }
        Insert: {
          at?: string
          bucket: string
          user_id: string
        }
        Update: {
          at?: string
          bucket?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_changes: {
        Row: {
          at: string
          subscriber_id: string
        }
        Insert: {
          at?: string
          subscriber_id: string
        }
        Update: {
          at?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_changes_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          channel_id: string
          created_at: string
          notify: boolean
          subscriber_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          notify?: boolean
          subscriber_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          notify?: boolean
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      video_dislike_counts: {
        Row: {
          dislike_count: number
          video_id: string
        }
        Insert: {
          dislike_count?: number
          video_id: string
        }
        Update: {
          dislike_count?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_dislike_counts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_rating_totals: {
        Row: {
          ratings: number
          stars_sum: number
          updated_at: string
          video_id: string
        }
        Insert: {
          ratings?: number
          stars_sum?: number
          updated_at?: string
          video_id: string
        }
        Update: {
          ratings?: number
          stars_sum?: number
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_rating_totals_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_ratings: {
        Row: {
          created_at: string
          stars: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          stars: number
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          stars?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_ratings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reactions: {
        Row: {
          created_at: string
          kind: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_reactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_retention_daily: {
        Row: {
          buckets: number[]
          day: string
          updated_at: string
          video_id: string
          viewers: number
        }
        Insert: {
          buckets?: number[]
          day: string
          updated_at?: string
          video_id: string
          viewers?: number
        }
        Update: {
          buckets?: number[]
          day?: string
          updated_at?: string
          video_id?: string
          viewers?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_retention_daily_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_source_daily: {
        Row: {
          day: string
          source: string
          updated_at: string
          video_id: string
          views: number
          watch_s: number
        }
        Insert: {
          day: string
          source: string
          updated_at?: string
          video_id: string
          views?: number
          watch_s?: number
        }
        Update: {
          day?: string
          source?: string
          updated_at?: string
          video_id?: string
          views?: number
          watch_s?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_source_daily_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_stats_daily: {
        Row: {
          day: string
          dislikes: number
          likes: number
          updated_at: string
          video_id: string
          views: number
          watch_s: number
        }
        Insert: {
          day: string
          dislikes?: number
          likes?: number
          updated_at?: string
          video_id: string
          views?: number
          watch_s?: number
        }
        Update: {
          day?: string
          dislikes?: number
          likes?: number
          updated_at?: string
          video_id?: string
          views?: number
          watch_s?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_stats_daily_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          channel_id: string
          comment_count: number
          comments_mode: string | null
          created_at: string
          deleted_at: string | null
          description: string
          duration_s: number | null
          error: string | null
          height: number | null
          held_visibility: string | null
          hls_key: string | null
          id: string
          is_short: boolean
          like_count: number
          owner_id: string
          preview_sprite_key: string | null
          published_at: string | null
          removed_at: string | null
          removed_reason: string | null
          removed_visibility: string | null
          renditions: Json | null
          search_doc: unknown
          short_choice: boolean | null
          source_bytes: number | null
          source_key: string | null
          source_mime: string | null
          status: string
          tags: string[]
          thumbnail_name: string | null
          thumbnail_url: string | null
          title: string
          trash_visibility: string | null
          updated_at: string
          views: number
          visibility: string
          width: number | null
        }
        Insert: {
          channel_id: string
          comment_count?: number
          comments_mode?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          duration_s?: number | null
          error?: string | null
          height?: number | null
          held_visibility?: string | null
          hls_key?: string | null
          id?: string
          is_short?: boolean
          like_count?: number
          owner_id: string
          preview_sprite_key?: string | null
          published_at?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          removed_visibility?: string | null
          renditions?: Json | null
          search_doc?: unknown
          short_choice?: boolean | null
          source_bytes?: number | null
          source_key?: string | null
          source_mime?: string | null
          status?: string
          tags?: string[]
          thumbnail_name?: string | null
          thumbnail_url?: string | null
          title: string
          trash_visibility?: string | null
          updated_at?: string
          views?: number
          visibility?: string
          width?: number | null
        }
        Update: {
          channel_id?: string
          comment_count?: number
          comments_mode?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          duration_s?: number | null
          error?: string | null
          height?: number | null
          held_visibility?: string | null
          hls_key?: string | null
          id?: string
          is_short?: boolean
          like_count?: number
          owner_id?: string
          preview_sprite_key?: string | null
          published_at?: string | null
          removed_at?: string | null
          removed_reason?: string | null
          removed_visibility?: string | null
          renditions?: Json | null
          search_doc?: unknown
          short_choice?: boolean | null
          source_bytes?: number | null
          source_key?: string | null
          source_mime?: string | null
          status?: string
          tags?: string[]
          thumbnail_name?: string | null
          thumbnail_url?: string | null
          title?: string
          trash_visibility?: string | null
          updated_at?: string
          views?: number
          visibility?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      view_events: {
        Row: {
          counted: boolean
          counted_at: string | null
          day: string
          first_at: string
          last_at: string
          reached: number
          source: string | null
          video_id: string
          viewer_key: string
          watched_s: number
        }
        Insert: {
          counted?: boolean
          counted_at?: string | null
          day: string
          first_at?: string
          last_at?: string
          reached?: number
          source?: string | null
          video_id: string
          viewer_key: string
          watched_s?: number
        }
        Update: {
          counted?: boolean
          counted_at?: string | null
          day?: string
          first_at?: string
          last_at?: string
          reached?: number
          source?: string | null
          video_id?: string
          viewer_key?: string
          watched_s?: number
        }
        Relationships: [
          {
            foreignKeyName: "view_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_history: {
        Row: {
          duration_s: number | null
          last_at: string
          position_s: number
          user_id: string
          video_id: string
        }
        Insert: {
          duration_s?: number | null
          last_at?: string
          position_s?: number
          user_id: string
          video_id: string
        }
        Update: {
          duration_s?: number | null
          last_at?: string
          position_s?: number
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      yapin_posts: {
        Row: {
          attempts: number
          channel_id: string
          error: string | null
          finished_at: string | null
          id: string
          queued_at: string
          started_at: string | null
          status: string
          video_id: string
          webhook_id: string | null
          worker: string | null
        }
        Insert: {
          attempts?: number
          channel_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          queued_at?: string
          started_at?: string | null
          status?: string
          video_id: string
          webhook_id?: string | null
          worker?: string | null
        }
        Update: {
          attempts?: number
          channel_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          queued_at?: string
          started_at?: string | null
          status?: string
          video_id?: string
          webhook_id?: string | null
          worker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yapin_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yapin_posts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yapin_posts_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "yapin_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      yapin_requests: {
        Row: {
          at: string
          user_id: string
        }
        Insert: {
          at?: string
          user_id: string
        }
        Update: {
          at?: string
          user_id?: string
        }
        Relationships: []
      }
      yapin_webhooks: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          owner_id: string
          updated_at: string
          url: string
          url_hint: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          owner_id: string
          updated_at?: string
          url: string
          url_hint?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          updated_at?: string
          url?: string
          url_hint?: string
        }
        Relationships: [
          {
            foreignKeyName: "yapin_webhooks_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yapin_webhooks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      comment_cards: {
        Row: {
          author_avatar_url: string | null
          author_handle: string | null
          author_name: string | null
          body: string | null
          by_owner: boolean | null
          created_at: string | null
          deleted: boolean | null
          edited_at: string | null
          hearted: boolean | null
          hidden: boolean | null
          id: string | null
          like_count: number | null
          liked: boolean | null
          mine: boolean | null
          parent_id: string | null
          pinned: boolean | null
          removed: boolean | null
          reply_count: number | null
          video_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comment_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abandon_upload: {
        Args: { reason?: string; video_id: string }
        Returns: string
      }
      admin_contact_mark: {
        Args: { handled?: boolean; id: string }
        Returns: undefined
      }
      admin_contact_messages: {
        Args: { include_handled?: boolean; lim?: number }
        Returns: {
          body: string
          created_at: string
          email: string
          handled_at: string
          id: string
          name: string
          sender_handle: string
          topic: string
        }[]
      }
      admin_log: {
        Args: { before?: string; lim?: number }
        Returns: {
          action: string
          actor_name: string
          created_at: string
          id: string
          reason: string
          target_id: string
          target_kind: string
          target_label: string
        }[]
      }
      admin_reports: {
        Args: { lim?: number }
        Returns: {
          channel_handle: string
          channel_id: string
          channel_name: string
          channel_strikes: number
          channel_suspended: boolean
          created_at: string
          details: string
          id: string
          kind: string
          owner_admin: boolean
          owner_banned: boolean
          reason: string
          reporter_name: string
          target_gone: boolean
          target_id: string
          target_kind: string
          target_label: string
          target_removed: boolean
          video_id: string
        }[]
      }
      admin_set_ban: {
        Args: { banned: boolean; reason?: string; target: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          enabled: boolean
          role: Database["public"]["Enums"]["app_role"]
          target: string
        }
        Returns: undefined
      }
      admin_set_word: {
        Args: { on?: boolean; word: string }
        Returns: undefined
      }
      admin_suspended: {
        Args: never
        Returns: {
          banned: boolean
          channel_id: string
          handle: string
          name: string
          reason: string
          strikes: number
          suspended_at: string
        }[]
      }
      admin_users: {
        Args: { lim?: number; off?: number; q?: string }
        Returns: {
          avatar_url: string
          ban_reason: string
          banned_at: string
          channel_handle: string
          channel_id: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_owner: boolean
          last_sign_in_at: string
          roles: string[]
          subscriber_count: number
          total: number
          username: string
          video_count: number
        }[]
      }
      admin_words: {
        Args: never
        Returns: {
          added_by: string
          created_at: string
          word: string
        }[]
      }
      age_on: { Args: { birthdate: string; today?: string }; Returns: number }
      appeal_removal: {
        Args: { details?: string; video_id: string }
        Returns: string
      }
      auto_remove_nsfw: {
        Args: { reason: string; video_id: string }
        Returns: boolean
      }
      channel_active_strikes: { Args: { channel_id: string }; Returns: number }
      channel_handle_available: { Args: { handle: string }; Returns: boolean }
      channel_handle_is_valid: { Args: { handle: string }; Returns: boolean }
      channel_handle_problem: { Args: { handle: string }; Returns: string }
      channel_links_are_valid: { Args: { links: Json }; Returns: boolean }
      claim_cleanup: {
        Args: { lim?: number; worker: string }
        Returns: {
          attempt: number
          id: string
          prefix: string
        }[]
      }
      claim_encode_job: {
        Args: { worker: string }
        Returns: {
          attempt: number
          job_id: string
          owner_id: string
          source_bytes: number
          source_key: string
          source_mime: string
          video_id: string
        }[]
      }
      claim_yapin_posts: {
        Args: { lim?: number; worker: string }
        Returns: {
          attempts: number
          channel_handle: string
          channel_name: string
          description: string
          hls_key: string
          id: string
          thumbnail_url: string
          title: string
          url: string
          video_id: string
        }[]
      }
      cleanup_done: {
        Args: { cleanup_id: string; deleted?: number }
        Returns: undefined
      }
      cleanup_failed: {
        Args: { cleanup_id: string; error: string }
        Returns: undefined
      }
      clear_history: { Args: never; Returns: number }
      comment_clean_body: { Args: { body: string }; Returns: string }
      comment_for_owner: {
        Args: { comment_id: string; me: string }
        Returns: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hearted: boolean
          hidden_at: string | null
          id: string
          like_count: number
          parent_id: string | null
          pinned: boolean
          removed_at: string | null
          reply_count: number
          video_id: string
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      comment_throttle: {
        Args: { bucket: string; who: string }
        Returns: undefined
      }
      comments_flag_on: { Args: { uid: string }; Returns: boolean }
      comments_info: {
        Args: { video_id: string }
        Returns: {
          comment_count: number
          is_owner: boolean
          mode: string
        }[]
      }
      comments_since: {
        Args: { cursor: Json; lim?: number; video_id: string }
        Returns: {
          author_avatar_url: string | null
          author_handle: string | null
          author_name: string | null
          body: string | null
          by_owner: boolean | null
          created_at: string | null
          deleted: boolean | null
          edited_at: string | null
          hearted: boolean | null
          hidden: boolean | null
          id: string | null
          like_count: number | null
          liked: boolean | null
          mine: boolean | null
          parent_id: string | null
          pinned: boolean | null
          removed: boolean | null
          reply_count: number | null
          video_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "comment_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      comments_video_visible: {
        Args: { uid: string; video_id: string }
        Returns: boolean
      }
      comments_writer: { Args: never; Returns: string }
      complete_signup: {
        Args: { birthdate: string; username: string }
        Returns: undefined
      }
      contact_per_day: { Args: never; Returns: number }
      contact_send: {
        Args: { body: string; email: string; name: string; topic: string }
        Returns: string
      }
      create_upload: {
        Args: { bytes: number; mime: string; title: string }
        Returns: {
          source_key: string
          video_id: string
        }[]
      }
      creator_hide_comment: {
        Args: { comment_id: string; hidden: boolean }
        Returns: undefined
      }
      delete_account: { Args: never; Returns: undefined }
      delete_comment: { Args: { comment_id: string }; Returns: boolean }
      edit_comment: {
        Args: { body: string; comment_id: string }
        Returns: {
          author_avatar_url: string | null
          author_handle: string | null
          author_name: string | null
          body: string | null
          by_owner: boolean | null
          created_at: string | null
          deleted: boolean | null
          edited_at: string | null
          hearted: boolean | null
          hidden: boolean | null
          id: string | null
          like_count: number | null
          liked: boolean | null
          mine: boolean | null
          parent_id: string | null
          pinned: boolean | null
          removed: boolean | null
          reply_count: number | null
          video_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "comment_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      encode_done: {
        Args: {
          duration_s: number
          height: number
          hls_key: string
          job_id: string
          preview_sprite_key: string
          renditions: Json
          thumbnail_url: string
          width: number
        }
        Returns: string
      }
      encode_failed: {
        Args: { error: string; job_id: string; retry?: boolean }
        Returns: string
      }
      encode_give_up_attempt: {
        Args: {
          job: Database["public"]["Tables"]["encode_jobs"]["Row"]
          reason: string
          retry: boolean
        }
        Returns: string
      }
      encode_max_attempts: { Args: never; Returns: number }
      encode_progress: {
        Args: { job_id: string; pct: number }
        Returns: boolean
      }
      encode_stale_after: { Args: never; Returns: string }
      engagement_flag_on: { Args: { uid: string }; Returns: boolean }
      engagement_limit_per_minute: { Args: { bucket: string }; Returns: number }
      engagement_throttle: {
        Args: { bucket: string; who: string }
        Returns: undefined
      }
      engagement_viewer_key: { Args: never; Returns: string }
      feed_videos: {
        Args: {
          cursor?: string
          cursor_id?: string
          exclude_shorts?: boolean
          for_channel?: string
          kind?: string
          lim?: number
        }
        Returns: {
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          duration_s: number
          hls_key: string
          id: string
          is_short: boolean
          preview_sprite_key: string
          published_at: string
          score: number
          thumbnail_url: string
          title: string
          views: number
        }[]
      }
      finish_upload: { Args: { video_id: string }; Returns: string }
      generate_channel_handle: { Args: { seed: string }; Returns: string }
      generate_username: { Args: { seed: string }; Returns: string }
      get_short: {
        Args: { video_id: string }
        Returns: {
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          comment_count: number
          comments_mode: string
          duration_s: number
          height: number
          hls_key: string
          id: string
          is_short: boolean
          like_count: number
          my_reaction: string
          published_at: string
          thumbnail_url: string
          title: string
          views: number
          width: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      heart_comment: {
        Args: { comment_id: string; on?: boolean }
        Returns: boolean
      }
      history_paused: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      launch_flag_on: { Args: { uid: string }; Returns: boolean }
      like_comment: {
        Args: { comment_id: string; on?: boolean }
        Returns: {
          like_count: number
          liked: boolean
        }[]
      }
      link_yapin: {
        Args: { user_id: string; yapin_id: string; yapin_username?: string }
        Returns: undefined
      }
      list_comments: {
        Args: { cursor?: Json; lim?: number; sort?: string; video_id: string }
        Returns: {
          author_avatar_url: string | null
          author_handle: string | null
          author_name: string | null
          body: string | null
          by_owner: boolean | null
          created_at: string | null
          deleted: boolean | null
          edited_at: string | null
          hearted: boolean | null
          hidden: boolean | null
          id: string | null
          like_count: number | null
          liked: boolean | null
          mine: boolean | null
          parent_id: string | null
          pinned: boolean | null
          removed: boolean | null
          reply_count: number | null
          video_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "comment_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_replies: {
        Args: { cursor?: Json; lim?: number; parent_id: string }
        Returns: {
          author_avatar_url: string | null
          author_handle: string | null
          author_name: string | null
          body: string | null
          by_owner: boolean | null
          created_at: string | null
          deleted: boolean | null
          edited_at: string | null
          hearted: boolean | null
          hidden: boolean | null
          id: string | null
          like_count: number | null
          liked: boolean | null
          mine: boolean | null
          parent_id: string | null
          pinned: boolean | null
          removed: boolean | null
          reply_count: number | null
          video_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "comment_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_shorts: {
        Args: { cursor?: Json; lim?: number }
        Returns: {
          as_of: string
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          comment_count: number
          comments_mode: string
          duration_s: number
          height: number
          hls_key: string
          id: string
          like_count: number
          my_reaction: string
          published_at: string
          score: number
          thumbnail_url: string
          tier: number
          title: string
          views: number
          width: number
        }[]
      }
      list_yapin_posts: {
        Args: { lim?: number }
        Returns: {
          attempts: number
          connected: boolean
          error: string
          finished_at: string
          id: string
          queued_at: string
          status: string
          title: string
          url_hint: string
          video_id: string
        }[]
      }
      mark_notifications_read: { Args: { ids?: string[] }; Returns: undefined }
      mod_action: {
        Args: {
          action: string
          kind?: string
          reason?: string
          target_id: string
          target_kind: string
        }
        Returns: Json
      }
      mod_suspend_channel: {
        Args: { ch: string; why: string }
        Returns: boolean
      }
      mod_unsuspend_channel: { Args: { ch: string }; Returns: boolean }
      mod_write_log: {
        Args: {
          action: string
          actor: string
          label: string
          reason: string
          target_id: string
          target_kind: string
        }
        Returns: undefined
      }
      moderation_admin: { Args: never; Returns: string }
      moderation_block_for: { Args: { uid: string }; Returns: string }
      moderation_blocked_word: { Args: { body: string }; Returns: string }
      moderation_caller: { Args: never; Returns: string }
      moderation_flag_on: { Args: { uid: string }; Returns: boolean }
      moderation_link_count: { Args: { body: string }; Returns: number }
      moderation_link_limit: { Args: never; Returns: number }
      moderation_pre_request: { Args: never; Returns: undefined }
      moderation_reports_per_day: { Args: never; Returns: number }
      moderation_status: { Args: never; Returns: Json }
      moderation_strike_days: { Args: never; Returns: number }
      moderation_strike_limit: { Args: never; Returns: number }
      moderation_throttle: {
        Args: { bucket: string; who: string }
        Returns: undefined
      }
      moderation_word_is_valid: { Args: { word: string }; Returns: boolean }
      my_history: {
        Args: { cursor?: string; cursor_id?: string; lim?: number }
        Returns: {
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          description: string
          duration_s: number
          hls_key: string
          id: string
          position_s: number
          preview_sprite_key: string
          progress: number
          published_at: string
          thumbnail_url: string
          title: string
          views: number
          watched_at: string
        }[]
      }
      my_notifications: {
        Args: { lim?: number }
        Returns: {
          actor_avatar_url: string
          actor_name: string
          bug_report_id: string
          comment_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          video_id: string
        }[]
      }
      my_progress: {
        Args: { video_ids: string[] }
        Returns: {
          duration_s: number
          position_s: number
          video_id: string
        }[]
      }
      my_ratings: {
        Args: { lim?: number }
        Returns: {
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          duration_s: number
          hls_key: string
          id: string
          is_short: boolean
          preview_sprite_key: string
          published_at: string
          rated_at: string
          stars: number
          thumbnail_url: string
          title: string
          views: number
        }[]
      }
      my_subscriptions: {
        Args: never
        Returns: {
          avatar_url: string
          channel_id: string
          handle: string
          latest_upload_at: string
          name: string
          notify: boolean
          subscribed_at: string
          unseen: number
        }[]
      }
      owner_email: { Args: never; Returns: string }
      pin_comment: {
        Args: { comment_id: string; on?: boolean }
        Returns: boolean
      }
      post_comment: {
        Args: { body: string; parent_id?: string; video_id: string }
        Returns: {
          author_avatar_url: string | null
          author_handle: string | null
          author_name: string | null
          body: string | null
          by_owner: boolean | null
          created_at: string | null
          deleted: boolean | null
          edited_at: string | null
          hearted: boolean | null
          hidden: boolean | null
          id: string | null
          like_count: number | null
          liked: boolean | null
          mine: boolean | null
          parent_id: string | null
          pinned: boolean | null
          removed: boolean | null
          reply_count: number | null
          video_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "comment_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      processing_flag_on: { Args: { uid: string }; Returns: boolean }
      purge_trash: { Args: { lim?: number }; Returns: number }
      rate_video: {
        Args: { stars: number; video_id: string }
        Returns: {
          average: number
          my_stars: number
          ratings: number
        }[]
      }
      react: {
        Args: { kind: string; video_id: string }
        Returns: {
          dislike_count: number
          like_count: number
          reaction: string
        }[]
      }
      realtime_views: { Args: { video_id?: string }; Returns: Json }
      related_videos: {
        Args: { lim?: number; video_id: string }
        Returns: {
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          duration_s: number
          hls_key: string
          id: string
          preview_sprite_key: string
          published_at: string
          thumbnail_url: string
          title: string
          views: number
        }[]
      }
      remove_from_history: { Args: { video_id: string }; Returns: boolean }
      report_target: {
        Args: {
          details?: string
          reason: string
          target_id: string
          target_kind: string
        }
        Returns: string
      }
      rollup_video_stats: { Args: { days?: number }; Returns: number }
      search_channels: {
        Args: { lim?: number; q: string }
        Returns: {
          avatar_url: string
          description: string
          handle: string
          id: string
          name: string
          score: number
          subscriber_count: number
          video_count: number
        }[]
      }
      search_limit_per_minute: { Args: { bucket: string }; Returns: number }
      search_normalize: { Args: { q: string }; Returns: string }
      search_suggest: {
        Args: { lim?: number; q: string }
        Returns: {
          suggestion: string
        }[]
      }
      search_throttle: { Args: { bucket: string }; Returns: undefined }
      search_tsquery: { Args: { q: string }; Returns: unknown }
      search_videos: {
        Args: {
          cursor_id?: string
          cursor_rank?: number
          filters?: Json
          lim?: number
          q: string
        }
        Returns: {
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          description: string
          duration_s: number
          hls_key: string
          id: string
          preview_sprite_key: string
          published_at: string
          score: number
          sort_key: number
          thumbnail_url: string
          title: string
          views: number
        }[]
      }
      set_channel_comments_default: { Args: { mode: string }; Returns: string }
      set_channel_handle: { Args: { new_handle: string }; Returns: string }
      set_comments_mode: {
        Args: { mode: string; video_id: string }
        Returns: string
      }
      set_feature_flag: {
        Args: { p_key: string; p_mode: string }
        Returns: Json
      }
      set_history_paused: { Args: { on: boolean }; Returns: boolean }
      set_notify: {
        Args: { channel_id: string; on: boolean }
        Returns: {
          notify: boolean
          subscribed: boolean
          subscriber_count: number
        }[]
      }
      set_short_choice: {
        Args: { on: boolean; video_id: string }
        Returns: boolean
      }
      set_video_thumbnail: {
        Args: { name: string; url?: string; video_id: string }
        Returns: undefined
      }
      set_yapin_webhook: { Args: { url: string }; Returns: string }
      shorts_flag_on: { Args: { uid: string }; Returns: boolean }
      shorts_score: {
        Args: {
          as_of: string
          comments: number
          likes: number
          published_at: string
          views: number
        }
        Returns: number
      }
      shorts_throttle: { Args: { bucket: string }; Returns: undefined }
      sitemap_channels: {
        Args: { page?: number; per?: number }
        Returns: {
          created_at: string
          handle: string
          name: string
        }[]
      }
      sitemap_counts: {
        Args: never
        Returns: {
          channels: number
          videos: number
        }[]
      }
      sitemap_videos: {
        Args: { page?: number; per?: number }
        Returns: {
          channel_handle: string
          description: string
          duration_s: number
          hls_key: string
          id: string
          is_short: boolean
          published_at: string
          thumbnail_url: string
          title: string
          updated_at: string
        }[]
      }
      staff_badges: {
        Args: never
        Returns: {
          badge: string
          channel_handle: string
          user_id: string
          username: string
        }[]
      }
      staff_recent_comments: {
        Args: { lim?: number; only_reported?: boolean }
        Returns: {
          author_handle: string
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          open_reports: number
          removed: boolean
          video_id: string
          video_title: string
        }[]
      }
      staff_remove_comment: {
        Args: { comment_id: string; reason?: string }
        Returns: undefined
      }
      stats_caller: { Args: never; Returns: string }
      stats_flag_on: { Args: { uid: string }; Returns: boolean }
      stats_range_from: { Args: { range: string }; Returns: string }
      stats_reached: {
        Args: { duration: number; from_s: number; mask: number; to_s: number }
        Returns: number
      }
      stats_source_is_valid: { Args: { source: string }; Returns: boolean }
      studio_analytics: { Args: { range?: string }; Returns: Json }
      studio_bulk: {
        Args: { action: string; video_ids: string[]; visibility?: string }
        Returns: number
      }
      studio_caller: { Args: never; Returns: string }
      studio_comments: {
        Args: { lim?: number }
        Returns: {
          author_avatar_url: string
          author_handle: string
          author_name: string
          body: string
          by_owner: boolean
          channel_default: string
          created_at: string
          edited_at: string
          hearted: boolean
          id: string
          like_count: number
          parent_id: string
          pinned: boolean
          reply_count: number
          video_id: string
          video_title: string
        }[]
      }
      studio_comments_all: {
        Args: { lim?: number }
        Returns: {
          author_avatar_url: string
          author_handle: string
          author_name: string
          body: string
          by_owner: boolean
          channel_default: string
          created_at: string
          edited_at: string
          hearted: boolean
          hidden: boolean
          id: string
          like_count: number
          parent_id: string
          pinned: boolean
          reply_count: number
          video_id: string
          video_title: string
        }[]
      }
      studio_flag_on: { Args: { uid: string }; Returns: boolean }
      studio_overview: { Args: never; Returns: Json }
      studio_throttle: {
        Args: { bucket: string; who: string }
        Returns: undefined
      }
      studio_trash_days: { Args: never; Returns: number }
      studio_videos: {
        Args: { trash?: boolean }
        Returns: {
          appeal: string
          comment_count: number
          comments_mode: string
          created_at: string
          deleted_at: string
          description: string
          duration_s: number
          hls_key: string
          id: string
          is_short: boolean
          like_count: number
          published_at: string
          purge_at: string
          removed_at: string
          removed_reason: string
          short_choice: boolean
          status: string
          tags: string[]
          thumbnail_name: string
          thumbnail_url: string
          title: string
          trash_visibility: string
          views: number
          visibility: string
        }[]
      }
      subscribe: {
        Args: { channel_id: string }
        Returns: {
          notify: boolean
          subscribed: boolean
          subscriber_count: number
        }[]
      }
      subscription_change_guard: {
        Args: { counts: boolean; need_flag: boolean; target: string }
        Returns: string
      }
      subscription_changes_per_hour: { Args: never; Returns: number }
      subscriptions_feed: {
        Args: {
          cursor?: string
          cursor_id?: string
          lim?: number
          only_notify?: boolean
        }
        Returns: {
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          duration_s: number
          hls_key: string
          id: string
          preview_sprite_key: string
          published_at: string
          thumbnail_url: string
          title: string
          views: number
        }[]
      }
      subscriptions_flag_on: { Args: { uid: string }; Returns: boolean }
      top_rated_videos: {
        Args: { lim?: number }
        Returns: {
          average: number
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          duration_s: number
          hls_key: string
          id: string
          is_short: boolean
          preview_sprite_key: string
          published_at: string
          ratings: number
          thumbnail_url: string
          title: string
          views: number
        }[]
      }
      unlink_yapin: { Args: never; Returns: undefined }
      unsubscribe: {
        Args: { channel_id: string }
        Returns: {
          notify: boolean
          subscribed: boolean
          subscriber_count: number
        }[]
      }
      update_upload_details: {
        Args: {
          description: string
          title: string
          video_id: string
          visibility: string
        }
        Returns: undefined
      }
      update_video: {
        Args: {
          description: string
          tags?: string[]
          title: string
          video_id: string
          visibility: string
        }
        Returns: undefined
      }
      upload_flag_on: { Args: { uid: string }; Returns: boolean }
      username_available: { Args: { name: string }; Returns: boolean }
      username_is_valid: { Args: { name: string }; Returns: boolean }
      video_analytics: {
        Args: { range?: string; video_id: string }
        Returns: Json
      }
      video_comments_mode: { Args: { video_id: string }; Returns: string }
      video_engagement: {
        Args: { video_id: string }
        Returns: {
          dislike_count: number
          duration_s: number
          like_count: number
          my_reaction: string
          position_s: number
        }[]
      }
      video_extension_for: { Args: { mime: string }; Returns: string }
      video_is_short: {
        Args: {
          choice: boolean
          duration: number
          height: number
          width: number
        }
        Returns: boolean
      }
      video_rating: {
        Args: { video_id: string }
        Returns: {
          average: number
          my_stars: number
          ratings: number
        }[]
      }
      video_tags_are_valid: { Args: { tags: string[] }; Returns: boolean }
      video_thumbnail_name_is_valid: {
        Args: { name: string }
        Returns: boolean
      }
      view_threshold_s:
        | { Args: { duration: number }; Returns: number }
        | { Args: { duration: number; is_short: boolean }; Returns: number }
      watch_ping: {
        Args: {
          played_s: number
          position_s: number
          source?: string
          video_id: string
        }
        Returns: {
          counted: boolean
          views: number
          watched_s: number
        }[]
      }
      watch_video: {
        Args: { video_id: string }
        Returns: {
          channel_avatar_url: string
          channel_handle: string
          channel_id: string
          channel_name: string
          channel_subscriber_count: number
          created_at: string
          description: string
          duration_s: number
          height: number
          hls_key: string
          id: string
          is_owner: boolean
          preview_sprite_key: string
          published_at: string
          renditions: Json
          status: string
          thumbnail_url: string
          title: string
          views: number
          visibility: string
          width: number
        }[]
      }
      yapin_caller: { Args: never; Returns: string }
      yapin_find_user: {
        Args: { yapin_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      yapin_flag_on: { Args: { uid: string }; Returns: boolean }
      yapin_is_placeholder_email: { Args: { email: string }; Returns: boolean }
      yapin_mark_placeholder: { Args: { user_id: string }; Returns: undefined }
      yapin_per_minute: { Args: never; Returns: number }
      yapin_post_result: {
        Args: { error?: string; ok: boolean; post_id: string; tries: number }
        Returns: undefined
      }
      yapin_status: {
        Args: never
        Returns: {
          linked: boolean
          needs_email: boolean
          yapin_username: string
        }[]
      }
      yapin_webhook_is_valid: { Args: { url: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
