-- AddConstraint
-- Garante que o saldo de créditos nunca seja negativo no banco de dados.
-- Proteção em nível de DB complementa a validação em deductCredits() (Story 3.1).
ALTER TABLE "User" ADD CONSTRAINT "user_credits_non_negative" CHECK (credits >= 0);
