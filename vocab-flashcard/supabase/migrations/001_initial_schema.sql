-- ============================================
-- VocabFlash 資料庫 Schema
-- ============================================

-- 1. 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. Decks 表 - 單字庫
-- ============================================
CREATE TABLE public.decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_decks_created_by ON public.decks(created_by);
CREATE INDEX idx_decks_is_public ON public.decks(is_public);

-- 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_decks_updated_at
    BEFORE UPDATE ON public.decks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Words 表 - 單字卡
-- ============================================
CREATE TABLE public.words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    word VARCHAR(200) NOT NULL,
    meaning_zh TEXT NOT NULL,
    example_sentence TEXT,
    pronunciation VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 確保同一個 deck 內單字不重複
    UNIQUE(deck_id, word)
);

-- 索引
CREATE INDEX idx_words_deck_id ON public.words(deck_id);
CREATE INDEX idx_words_word ON public.words(word);

CREATE TRIGGER update_words_updated_at
    BEFORE UPDATE ON public.words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. User Words 表 - 個人學習進度 (SM-2 狀態)
-- ============================================
CREATE TABLE public.user_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,

    -- SM-2 演算法參數
    repetitions INTEGER DEFAULT 0,           -- 連續正確次數
    ease_factor DECIMAL(4,2) DEFAULT 2.5,    -- 難易度因子 (EF)
    interval INTEGER DEFAULT 0,              -- 下次複習間隔（天）

    -- 排程相關
    due_at TIMESTAMPTZ DEFAULT NOW(),        -- 下次複習時間
    last_review_at TIMESTAMPTZ,              -- 上次複習時間

    -- 統計
    total_reviews INTEGER DEFAULT 0,         -- 總複習次數
    correct_reviews INTEGER DEFAULT 0,       -- 正確次數

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 每個用戶對每個單字只有一條記錄
    UNIQUE(user_id, word_id)
);

-- 索引（對查詢效能至關重要）
CREATE INDEX idx_user_words_user_id ON public.user_words(user_id);
CREATE INDEX idx_user_words_deck_id ON public.user_words(deck_id);
CREATE INDEX idx_user_words_due_at ON public.user_words(due_at);
CREATE INDEX idx_user_words_user_deck ON public.user_words(user_id, deck_id);
CREATE INDEX idx_user_words_user_due ON public.user_words(user_id, due_at);

CREATE TRIGGER update_user_words_updated_at
    BEFORE UPDATE ON public.user_words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Review Logs 表 - 複習歷史記錄
-- ============================================
CREATE TABLE public.review_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,

    quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
    ease_factor_before DECIMAL(4,2),
    ease_factor_after DECIMAL(4,2),
    interval_before INTEGER,
    interval_after INTEGER,

    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_logs_user_id ON public.review_logs(user_id);
CREATE INDEX idx_review_logs_reviewed_at ON public.review_logs(reviewed_at);
CREATE INDEX idx_review_logs_user_date ON public.review_logs(user_id, reviewed_at);

-- ============================================
-- 6. Row Level Security (RLS) 政策
-- ============================================

-- 啟用 RLS
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

-- Decks 政策
CREATE POLICY "Users can view public decks or own decks" ON public.decks
    FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create decks" ON public.decks
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own decks" ON public.decks
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own decks" ON public.decks
    FOR DELETE USING (created_by = auth.uid());

-- Words 政策
CREATE POLICY "Users can view words in accessible decks" ON public.words
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.decks
            WHERE decks.id = words.deck_id
            AND (decks.is_public = true OR decks.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can insert words in own decks" ON public.words
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.decks
            WHERE decks.id = deck_id
            AND decks.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update words in own decks" ON public.words
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.decks
            WHERE decks.id = words.deck_id
            AND decks.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete words in own decks" ON public.words
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.decks
            WHERE decks.id = words.deck_id
            AND decks.created_by = auth.uid()
        )
    );

-- User Words 政策（用戶只能存取自己的學習進度）
CREATE POLICY "Users can view own user_words" ON public.user_words
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own user_words" ON public.user_words
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own user_words" ON public.user_words
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own user_words" ON public.user_words
    FOR DELETE USING (user_id = auth.uid());

-- Review Logs 政策
CREATE POLICY "Users can view own review_logs" ON public.review_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own review_logs" ON public.review_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());
