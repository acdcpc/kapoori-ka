-- Account deletion integrity.
--
-- Ten public foreign keys pointing at auth.users used NO ACTION, so deleting an
-- account that had any audit / approval / caregiver-attribution history failed
-- with a foreign-key violation (surfaced as HTTP 500 in the admin user list).
--
-- Rules applied here:
--   * History and audit rows (payment_audit_log, record_export_audit,
--     activation_codes, payments, app_admins) are KEPT and merely lose the link
--     to the deleted account (ON DELETE SET NULL).
--   * Caregiver-attributed clinical rows (clinic_visits, feeding_records) belong
--     to the child, not the caregiver, so the child keeps its history and the
--     attribution becomes null.
--   * child_invitations are useless without their creator, so they are removed
--     together with the account (ON DELETE CASCADE).

-- Audit of payment approvals
alter table public.payment_audit_log
  drop constraint payment_audit_log_actor_id_fkey,
  add constraint payment_audit_log_actor_id_fkey
    foreign key (actor_id) references auth.users(id) on delete set null;

-- Audit of record exports (actor_id becomes nullable: export log is retained)
alter table public.record_export_audit alter column actor_id drop not null;
alter table public.record_export_audit
  drop constraint record_export_audit_actor_id_fkey,
  add constraint record_export_audit_actor_id_fkey
    foreign key (actor_id) references auth.users(id) on delete set null;

-- Activation codes: keep the code history, drop who used/voided it
alter table public.activation_codes
  drop constraint activation_codes_used_by_fkey,
  add constraint activation_codes_used_by_fkey
    foreign key (used_by) references auth.users(id) on delete set null;
alter table public.activation_codes
  drop constraint activation_codes_voided_by_fkey,
  add constraint activation_codes_voided_by_fkey
    foreign key (voided_by) references auth.users(id) on delete set null;

-- Admin grants: keep the record, drop who granted it
alter table public.app_admins
  drop constraint app_admins_granted_by_fkey,
  add constraint app_admins_granted_by_fkey
    foreign key (granted_by) references auth.users(id) on delete set null;

-- Payments: keep the financial record, drop reviewer/issuer attribution
alter table public.payments
  drop constraint payments_verified_by_fkey,
  add constraint payments_verified_by_fkey
    foreign key (verified_by) references auth.users(id) on delete set null;
alter table public.payments
  drop constraint payments_activation_code_issued_by_fkey,
  add constraint payments_activation_code_issued_by_fkey
    foreign key (activation_code_issued_by) references auth.users(id) on delete set null;

-- Invitations created by a deleted account are removed with it
alter table public.child_invitations
  drop constraint child_invitations_created_by_fkey,
  add constraint child_invitations_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete cascade;

-- Child clinical history is preserved when the recording caregiver is deleted
alter table public.clinic_visits alter column recorded_by drop not null;
alter table public.clinic_visits
  drop constraint clinic_visits_recorded_by_fkey,
  add constraint clinic_visits_recorded_by_fkey
    foreign key (recorded_by) references auth.users(id) on delete set null;

alter table public.feeding_records alter column recorded_by drop not null;
alter table public.feeding_records
  drop constraint feeding_records_recorded_by_fkey,
  add constraint feeding_records_recorded_by_fkey
    foreign key (recorded_by) references auth.users(id) on delete set null;
