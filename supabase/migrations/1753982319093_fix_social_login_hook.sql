-- Migration: Fix Social Login Hook
-- Created: 2025-08-02
-- Purpose: Update validate_signup_hook to allow social logins while maintaining IP protection

DROP FUNCTION IF EXISTS public.validate_signup_hook(jsonb);

CREATE OR REPLACE FUNCTION public.validate_signup_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    client_ip inet;
    is_blacklisted boolean := false;
    existing_user_id uuid;
    blacklist_reason text;
    expires_at timestamp with time zone;
    provider_name text;
BEGIN
    -- Extract provider information to detect social login
    provider_name := event->'user_metadata'->>'provider';
    IF provider_name IS NULL THEN
        provider_name := event->'app_metadata'->>'provider';
    END IF;
    IF provider_name IS NULL AND event->'identities' IS NOT NULL THEN
        provider_name := event->'identities'->0->>'provider';
    END IF;
    
    -- Allow social logins without IP validation
    IF provider_name IS NOT NULL AND provider_name != 'email' THEN
        INSERT INTO admin_logs (action_type, details)
        VALUES (
            'social_signup_allowed',
            jsonb_build_object(
                'provider', provider_name,
                'email', event->>'email',
                'user_id', event->>'id'
            )
        );
        
        RETURN event;
    END IF;
    
    -- For email/password signups, apply IP validation
    BEGIN
        client_ip := split_part(
            event->'request'->'headers'->>'x-forwarded-for',
            ',', 1
        )::inet;
    EXCEPTION
        WHEN OTHERS THEN
            client_ip := '0.0.0.0'::inet;
    END;
    
    -- Block if we can't get a valid IP for email signups
    IF client_ip = '0.0.0.0'::inet AND (provider_name IS NULL OR provider_name = 'email') THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 400,
                'message', 'Unable to verify request origin'
            )
        );
    END IF;
    
    -- Check blacklist
    SELECT 
        b.reason,
        b.expires_at
    INTO blacklist_reason, expires_at
    FROM ip_blacklist b
    WHERE b.ip_address = client_ip 
    AND (b.expires_at IS NULL OR b.expires_at > NOW());
    
    IF blacklist_reason IS NOT NULL THEN
        INSERT INTO admin_logs (action_type, details, ip_address)
        VALUES (
            'signup_blocked_blacklist',
            jsonb_build_object(
                'ip', client_ip::text,
                'reason', blacklist_reason,
                'expires_at', expires_at
            ),
            client_ip
        );
        
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 403,
                'message', 'Account creation is temporarily blocked for this IP address'
            )
        );
    END IF;
    
    -- Check if IP already used (only for email signups)
    IF provider_name IS NULL OR provider_name = 'email' THEN
        SELECT user_id INTO existing_user_id
        FROM user_ip_tracking
        WHERE ip_address = client_ip;
        
        IF existing_user_id IS NOT NULL THEN
            INSERT INTO ip_blacklist (ip_address, reason, expires_at, auto_blocked)
            VALUES (
                client_ip,
                'Attempted multiple account creation',
                NOW() + INTERVAL '24 hours',
                true
            )
            ON CONFLICT (ip_address) DO UPDATE SET
                expires_at = NOW() + INTERVAL '24 hours',
                violation_count = ip_blacklist.violation_count + 1;
            
            INSERT INTO admin_logs (action_type, details, ip_address)
            VALUES (
                'signup_blocked_duplicate_ip',
                jsonb_build_object(
                    'ip', client_ip::text,
                    'existing_user_id', existing_user_id,
                    'auto_blacklisted', true
                ),
                client_ip
            );
            
            RETURN jsonb_build_object(
                'error', jsonb_build_object(
                    'http_code', 429,
                    'message', 'Only one account per IP address is allowed'
                )
            );
        END IF;
    END IF;
    
    -- Allow signup
    INSERT INTO admin_logs (action_type, details, ip_address)
    VALUES (
        'signup_allowed',
        jsonb_build_object(
            'ip', client_ip::text,
            'provider', COALESCE(provider_name, 'email'),
            'user_agent', event->'request'->'headers'->>'user-agent'
        ),
        CASE WHEN client_ip = '0.0.0.0'::inet THEN NULL ELSE client_ip END
    );
    
    RETURN event;
END;
$$;