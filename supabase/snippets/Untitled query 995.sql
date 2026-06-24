INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, role, aud
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'melboumyaoui@bsnengineering.com',
  crypt('motdepasse123', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"first_name": "Marwane", "last_name": "El Boumyaoui", "role": "collaborator"}'::jsonb,
  'authenticated',
  'authenticated'
);