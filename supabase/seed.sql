-- ============================================================================
-- Sardar CRM - Seed Data
-- Run AFTER schema.sql. Resolves the first authenticated user automatically,
-- so it works in the Supabase SQL Editor.
-- ============================================================================

DO $$
DECLARE
  v_user_id uuid := (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
  v_account_upwork uuid;
  v_account_fiverr  uuid;
  v_client_sarah    uuid;
  v_client_tom      uuid;
  v_client_aisha    uuid;
  v_client_marco    uuid;
  v_client_nina     uuid;
  v_client_luis     uuid;
  v_opp_wp          uuid;
  v_opp_shopify     uuid;
  v_project_kite    uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Sign up first, then re-run this seed.';
    RETURN;
  END IF;

  -- profile (username = the login name for username+password auth; initial
  -- password is whatever you set when creating the auth user, change it via
  -- Settings -> Team access after first sign-in)
  INSERT INTO public.profiles (id, username, full_name, currency, default_fee_percent, role)
  VALUES (v_user_id, 'mamunur', 'Mamunur Roshid', 'USD', 20.00, 'ceo')
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username, role = EXCLUDED.role, updated_at = now();

  -- team members
  INSERT INTO public.team_members (user_id, name, email, role)
  VALUES
    (v_user_id, 'Mamunur Roshid', 'mamunur@sardaritbd.com', 'ceo'),
    (v_user_id, 'Zunaid Hasan', 'zunaid@sardaritbd.com', 'executive')
  ON CONFLICT DO NOTHING;

  -- accounts
  INSERT INTO public.accounts (user_id, name, platform, username, profile_url)
  VALUES
    (v_user_id, 'SardarIT Fiverr', 'fiverr', 'sardarit', 'https://www.fiverr.com/sardarit'),
    (v_user_id, 'SardarIT Upwork', 'upwork', 'sardaritbd', 'https://www.upwork.com/freelancers/sardaritbd'),
    (v_user_id, 'SardarIT Design', 'fiverr', 'sardaritdesign', 'https://www.fiverr.com/sardaritdesign')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_account_upwork FROM public.accounts WHERE user_id = v_user_id AND platform = 'upwork' LIMIT 1;
  SELECT id INTO v_account_fiverr  FROM public.accounts WHERE user_id = v_user_id AND platform = 'fiverr'  LIMIT 1;

  -- clients
  INSERT INTO public.clients (user_id, name, email, platform, username, category)
  VALUES
    (v_user_id, 'Sarah Mitchell', 'sarah@brightpath.io', 'upwork', 'brightpath', 'WordPress'),
    (v_user_id, 'Tom Hendricks', 'tom@eleventystudios.com', 'fiverr', 'eleventystudios', 'Shopify'),
    (v_user_id, 'Aisha Rahman', 'aisha@lumenlabs.co', 'fiverr', 'lumenlabs', 'Landing Page'),
    (v_user_id, 'Marco Rossi', 'marco@deltastartups.com', 'upwork', 'deltastartups', 'Web App'),
    (v_user_id, 'Nina Patel', 'nina@kitecrm.io', 'fiverr', 'kitecrm', 'CRM'),
    (v_user_id, 'Luis Garcia', 'luis@verkta.de', 'upwork', 'verkta', 'E-commerce')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_client_sarah FROM public.clients WHERE user_id = v_user_id AND name = 'Sarah Mitchell';
  SELECT id INTO v_client_tom   FROM public.clients WHERE user_id = v_user_id AND name = 'Tom Hendricks';
  SELECT id INTO v_client_aisha FROM public.clients WHERE user_id = v_user_id AND name = 'Aisha Rahman';
  SELECT id INTO v_client_marco FROM public.clients WHERE user_id = v_user_id AND name = 'Marco Rossi';
  SELECT id INTO v_client_nina  FROM public.clients WHERE user_id = v_user_id AND name = 'Nina Patel';
  SELECT id INTO v_client_luis  FROM public.clients WHERE user_id = v_user_id AND name = 'Luis Garcia';

  -- opportunities
  INSERT INTO public.opportunities (user_id, title, client_id, account_id, platform, type, stage, status, amount, connects_spent, source_url, next_follow_up, notes)
  VALUES
    (v_user_id, 'WordPress migration for BrightPath', v_client_sarah, v_account_upwork, 'upwork', 'bid', 'lead', 'no_response', 1800, 6, 'https://www.upwork.com/jobs/~01brightpath', CURRENT_DATE + 5, 'Sent proposal Mon, awaiting response.'),
    (v_user_id, 'Shopify store rebuild', v_client_tom, v_account_fiverr, 'fiverr', 'pre_sales', 'proposal', NULL, 950, 0, 'https://www.fiverr.com/inbox/conversation/88231', CURRENT_DATE + 2, 'Quoted $950, client asked about timeline.'),
    (v_user_id, 'Landing page for new SaaS launch', v_client_aisha, v_account_fiverr, 'fiverr', 'pre_sales', 'negotiation', NULL, 750, 0, 'https://www.fiverr.com/inbox/conversation/77420', CURRENT_DATE + 1, 'Negotiating scope, wants 3 revisions.'),
    (v_user_id, 'Web app MVP for Delta Startups', v_client_marco, v_account_upwork, 'upwork', 'bid', 'active', 'interview', 6500, 12, 'https://www.upwork.com/jobs/~01deltamvp', NULL, 'Interview scheduled, strong fit.'),
    (v_user_id, 'CRM portal integration', v_client_nina, v_account_fiverr, 'fiverr', 'pre_sales', 'won', NULL, 1200, 0, 'https://www.fiverr.com/inbox/conversation/66501', NULL, 'Won! Creating project.'),
    (v_user_id, 'E-commerce redesign quote', v_client_luis, v_account_upwork, 'upwork', 'bid', 'lost', 'rejected', 2400, 8, 'https://www.upwork.com/jobs/~01verkta', NULL, 'Client went with another freelancer.')
  ON CONFLICT DO NOTHING;

  -- projects
  INSERT INTO public.projects (user_id, project_name, client_id, account_id, order_date, assigned_to, developer, website_link, project_type, delivery_deadline, gross_amount, fee_percent, fee_amount, net_amount, bonus, status, priority, progress)
  VALUES
    (v_user_id, 'BrightPath - WordPress migration', v_client_sarah, v_account_upwork, '2026-05-02', 'Sardar IT', 'Alex Kim', 'https://brightpath.io', 'Migration', '2026-05-20', 1800, 10, 180, 1620, 0, 'delivered', 'high', 100),
    (v_user_id, 'LumenLabs - SaaS landing page', v_client_aisha, v_account_fiverr, '2026-05-06', 'Sardar IT', 'Priya Shah', 'https://lumenlabs.co', 'Landing Page', '2026-05-18', 750, 20, 150, 600, 50, 'complete', 'medium', 100),
    (v_user_id, 'KiteCRM - portal integration', v_client_nina, v_account_fiverr, '2026-05-12', 'Sardar IT', 'Alex Kim', 'https://kitecrm.io', 'Integration', '2026-05-30', 1200, 20, 240, 960, 0, 'wip', 'high', 55),
    (v_user_id, 'Delta Startups - MVP build', v_client_marco, v_account_upwork, '2026-05-14', 'Sardar IT', 'Maya Chen', 'https://deltastartups.com', 'Web App', '2026-06-25', 6500, 10, 650, 5850, 0, 'revision', 'high', 70),
    (v_user_id, 'Verkta - shop redesign', v_client_luis, v_account_upwork, '2026-04-28', 'Sardar IT', 'Priya Shah', 'https://verkta.de', 'E-commerce', '2026-05-15', 2400, 10, 240, 2160, 0, 'cancelled', 'low', 0),
    (v_user_id, 'Eleventy - Shopify rebuild', v_client_tom, v_account_fiverr, '2026-04-20', 'Sardar IT', 'Maya Chen', 'https://eleventystudios.com', 'Shopify', '2026-05-10', 950, 20, 190, 760, 0, 'complete', 'medium', 100)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_project_kite FROM public.projects WHERE user_id = v_user_id AND project_name = 'KiteCRM - portal integration';

  -- milestones for KiteCRM
  IF v_project_kite IS NOT NULL THEN
    INSERT INTO public.milestones (user_id, project_id, title, order_index, status, due_date, completed_at)
    VALUES
      (v_user_id, v_project_kite, 'Requirements & wireframes', 0, 'done', '2026-05-15', now()),
      (v_user_id, v_project_kite, 'Build integration API', 1, 'done', '2026-05-22', now()),
      (v_user_id, v_project_kite, 'Frontend portal screens', 2, 'in_progress', '2026-05-28', NULL),
      (v_user_id, v_project_kite, 'Testing & handover', 3, 'pending', '2026-05-30', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- activities
  INSERT INTO public.activities (user_id, entity_type, entity_id, activity_type, subject, body)
  VALUES
    (v_user_id, 'opportunity', (SELECT id FROM public.opportunities WHERE user_id = v_user_id AND title = 'WordPress migration for BrightPath'), 'bid', 'Proposal sent', 'Submitted proposal for WordPress migration, spent 6 connects.'),
    (v_user_id, 'opportunity', (SELECT id FROM public.opportunities WHERE user_id = v_user_id AND title = 'Shopify store rebuild'), 'proposal_sent', 'Quote sent', 'Sent $950 Shopify rebuild quote.'),
    (v_user_id, 'project', v_project_kite, 'status_change', 'Milestone updated', 'Frontend portal screens marked in progress.'),
    (v_user_id, 'client', v_client_sarah, 'email', 'Intro email', 'Kickoff email sent to BrightPath.')
  ON CONFLICT DO NOTHING;

  -- invoices
  INSERT INTO public.invoices (user_id, invoice_number, client_id, project_id, issue_date, due_date, amount, status, paid_at)
  VALUES
    (v_user_id, 'INV-2026-001', v_client_sarah, (SELECT id FROM public.projects WHERE user_id = v_user_id AND project_name = 'BrightPath - WordPress migration'), '2026-05-20', '2026-06-03', 1620, 'paid', '2026-05-27'),
    (v_user_id, 'INV-2026-002', v_client_aisha, (SELECT id FROM public.projects WHERE user_id = v_user_id AND project_name = 'LumenLabs - SaaS landing page'), '2026-05-18', '2026-06-01', 600, 'pending', NULL),
    (v_user_id, 'INV-2026-003', v_client_nina, v_project_kite, '2026-05-30', '2026-06-13', 480, 'pending', NULL),
    (v_user_id, 'INV-2026-004', v_client_marco, (SELECT id FROM public.projects WHERE user_id = v_user_id AND project_name = 'Delta Startups - MVP build'), '2026-04-15', '2026-04-29', 1950, 'overdue', NULL)
  ON CONFLICT DO NOTHING;

  -- email templates
  INSERT INTO public.email_templates (user_id, name, category, subject, body)
  VALUES
    (v_user_id, 'Initial Proposal Follow-Up', 'follow_up', 'Quick follow-up on {{client_name}}',
      E'Hi {{client_name}},\n\nI wanted to follow up on my proposal for {{project_name}}. Have you had a chance to review it? I am happy to answer any questions.\n\nBest regards,\n{{your_name}}'),
    (v_user_id, 'Pre-Sales Nurture (Fiverr)', 'nurture', 'Ideas for {{project_name}}',
      E'Hi {{client_name}},\n\nWhile you are deciding, I put together a few ideas for {{project_name}} that could help hit your goals faster.\n\nBest,\n{{your_name}}'),
    (v_user_id, 'Delivery Handover', 'delivery', '{{project_name}} is ready!',
      E'Hi {{client_name}},\n\n{{project_name}} is complete. You can review it here: {{website_link}}. Let me know if you need any tweaks.\n\nBest,\n{{your_name}}')
  ON CONFLICT DO NOTHING;

  -- automation rules
  INSERT INTO public.automation_rules (user_id, name, trigger_event, trigger_value, action_type, action_data)
  VALUES
    (v_user_id, 'Deal active -> create project', 'opportunity.stage_changed', 'active', 'create_project',
     '{"project_name_template": "{{opportunity.title}}"}'),
    (v_user_id, 'Won deal -> log activity', 'opportunity.stage_changed', 'won', 'log_activity',
     '{"subject": "Deal won", "body": "Opportunity moved to won automatically."}')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed complete for user %', v_user_id;
END $$;
