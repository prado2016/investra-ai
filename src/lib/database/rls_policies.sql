-- Row Level Security (RLS) Policies for Stock Tracker
-- These policies ensure users can only access their own data

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_data ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- PORTFOLIOS POLICIES
-- =====================================================
-- Users can view their own portfolios
CREATE POLICY "Users can view own portfolios" ON public.portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON public.portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON public.portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- POSITIONS POLICIES
-- =====================================================
-- Users can view positions in their portfolios
CREATE POLICY "Users can view own positions" ON public.positions
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own positions" ON public.positions
  FOR INSERT WITH CHECK (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own positions" ON public.positions
  FOR UPDATE USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own positions" ON public.positions
  FOR DELETE USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================
-- Users can view transactions in their portfolios
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- ASSETS POLICIES (Public read, admin write)
-- =====================================================
-- Assets are public for reading (everyone needs to see stock symbols)
-- But only authenticated users or admins can modify them
CREATE POLICY "Anyone can view assets" ON public.assets
  FOR SELECT USING (true);

-- Only authenticated users can suggest new assets
CREATE POLICY "Authenticated users can insert assets" ON public.assets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- PRICE DATA POLICIES (Public read, system write)
-- =====================================================
-- Price data is public for reading
CREATE POLICY "Anyone can view price data" ON public.price_data
  FOR SELECT USING (true);

-- Only authenticated users/services can insert price data
CREATE POLICY "Authenticated users can insert price data" ON public.price_data
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update price data" ON public.price_data
  FOR UPDATE USING (auth.role() = 'authenticated');
