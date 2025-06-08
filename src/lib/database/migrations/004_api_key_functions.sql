-- Database function for incrementing API usage count
-- Task 13: Supporting function for API key usage tracking

CREATE OR REPLACE FUNCTION increment_api_usage_count(key_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.api_keys
    SET usage_count = usage_count + 1
    WHERE id = key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_api_usage_count(UUID) TO authenticated;
