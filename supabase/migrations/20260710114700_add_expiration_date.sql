-- Migration to add expiration_date to onboarding_documents
ALTER TABLE onboarding_documents ADD COLUMN expiration_date DATE;
