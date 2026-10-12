-- Phase 1 follow-up: public help-request inserts need to evaluate the
-- server-generated reference default. The function has no caller-controlled
-- SQL and retains its fixed search_path, so grant only execute, not sequence
-- access, to the two API roles.

alter function public.next_help_request_reference() security definer;
revoke all on function public.next_help_request_reference() from public;
grant execute on function public.next_help_request_reference() to anon, authenticated;
