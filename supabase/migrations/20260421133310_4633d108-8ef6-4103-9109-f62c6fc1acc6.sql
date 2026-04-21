CREATE OR REPLACE FUNCTION public.check_scan_quota(p_device_id text, p_limit integer DEFAULT 10)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN p_device_id = ANY (ARRAY['92e79e2f-5822-43cc-85d4-5eee3524a83d']) THEN true
      ELSE (
        SELECT COUNT(*)
        FROM public.scans
        WHERE device_id = p_device_id
          AND created_at > now() - interval '24 hours'
      ) < p_limit
    END;
$function$;