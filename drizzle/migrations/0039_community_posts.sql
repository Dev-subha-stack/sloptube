CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  image_path text,
  poll_options jsonb,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_poll_valid CHECK (
    poll_options IS NULL OR (
      jsonb_typeof(poll_options) = 'array'
      AND jsonb_array_length(poll_options) BETWEEN 2 AND 5
    )
  )
);

CREATE INDEX community_posts_created_idx ON public.community_posts (created_at DESC, id DESC);
CREATE INDEX community_posts_channel_idx ON public.community_posts (channel_id, created_at DESC);

GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community posts"
  ON public.community_posts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Channel owners can create community posts"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id
        AND c.owner_id = auth.uid()
        AND c.suspended_at IS NULL
    )
  );

CREATE POLICY "Authors and staff can update community posts"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_staff())
  WITH CHECK (auth.uid() = author_id OR public.is_staff());

CREATE POLICY "Authors and staff can delete community posts"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_staff());

CREATE TABLE public.community_post_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

GRANT SELECT ON public.community_post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON public.community_post_likes TO service_role;

ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post likes"
  ON public.community_post_likes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can like posts as themselves"
  ON public.community_post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own post likes"
  ON public.community_post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.community_post_votes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index smallint NOT NULL CHECK (option_index >= 0 AND option_index < 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX community_post_votes_post_idx ON public.community_post_votes (post_id);

GRANT SELECT ON public.community_post_votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_post_votes TO authenticated;
GRANT ALL ON public.community_post_votes TO service_role;

ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll votes"
  ON public.community_post_votes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can vote in polls as themselves"
  ON public.community_post_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their own poll vote"
  ON public.community_post_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own poll vote"
  ON public.community_post_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX community_post_comments_post_idx ON public.community_post_comments (post_id, created_at ASC);

GRANT SELECT ON public.community_post_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.community_post_comments TO authenticated;
GRANT ALL ON public.community_post_comments TO service_role;

ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post comments"
  ON public.community_post_comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can comment on posts as themselves"
  ON public.community_post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Comment authors, post authors, and staff can delete post comments"
  ON public.community_post_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.community_post_likes_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_community_post_likes_sync
  AFTER INSERT OR DELETE ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.community_post_likes_sync();

CREATE OR REPLACE FUNCTION public.community_post_comments_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_community_post_comments_sync
  AFTER INSERT OR DELETE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_post_comments_sync();

CREATE POLICY "Users can upload their own post images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
