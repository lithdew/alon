// An example memo program. Assumes a global state account with PDA seed ["state"]
// is initialized and owned by the program containing 32 bytes of data designating
// the public key of a user that is authorized to issue memoes as BLAKE3 hashes.

// The memo is assumed to be provided as instruction data to the program.

// Note that the entrypoint of the Solana program in Alon must be a function with
// the following signature: `uint64_t entrypoint(const uint8_t *input)`.

#include <solana_sdk.h>

void broadcast_memo(SolParameters *params);

// The main entrypoint of the memo program.
uint64_t entrypoint(const uint8_t *input)
{
  // Load 2 accounts.
  // Account 1: User (must have signed this transaction)
  // Account 2: State Program-Derived Account (must not {be writable, have signed this transaction})

  SolAccountInfo accounts[2];
  SolParameters params = {.ka = accounts};

  sol_assert(sol_deserialize(input, &params, SOL_ARRAY_SIZE(accounts)));

  broadcast_memo(&params);

  return SUCCESS;
}

void broadcast_memo(SolParameters *params)
{
  sol_log("Instruction: Broadcast Memo");

  // Assert that all accounts are valid.

  SolAccountInfo *user_acct = &params->ka[0];
  sol_assert(user_acct->is_signer);
  sol_assert(!user_acct->is_writable);

  SolAccountInfo *state_acct = &params->ka[1];
  sol_assert(!state_acct->is_signer);
  sol_assert(!state_acct->is_writable);
  sol_assert(SolPubkey_same(state_acct->owner, params->program_id));

  // Assert that the program-derived address of the state account is correct.

  const SolSignerSeed state_seeds[] = {{(const uint8_t *)"state", sizeof("state") - 1}};
  SolPubkey expected_state_key;
  uint8_t expected_state_bump_seed;

  sol_assert(sol_try_find_program_address(
                 state_seeds,
                 SOL_ARRAY_SIZE(state_seeds),
                 params->program_id,
                 &expected_state_key,
                 &expected_state_bump_seed) == SUCCESS);

  sol_assert(SolPubkey_same(&expected_state_key, state_acct->key));

  // Assert that the state account has exactly 32 bytes worth of data designating
  // a public key of the authority which may issue memoes as BLAKE3 hashes.

  sol_assert(state_acct->data_len == SIZE_PUBKEY);

  // Assert that the user is authorized to issue a memo.

  sol_assert(SolPubkey_same(user_acct->key, (const SolPubkey *)(state_acct->data)));

  // Assert that the memo is not zero-length.

  sol_assert(params->data_len > 0);

  SolBytes memo[] = {{params->data, params->data_len}};

  // Derive the BLAKE3 hash of the memo provided.

  uint8_t memo_hash[BLAKE3_RESULT_LENGTH];
  sol_assert(sol_blake3(memo, SOL_ARRAY_SIZE(memo), memo_hash) == SUCCESS);

  // Log the user's public key alongside BLAKE3 hash of the memo.

  sol_log_pubkey(user_acct->key);
  sol_log_pubkey((const SolPubkey *)(memo_hash));
}

void test_broadcast_memo__works()
{
  uint8_t instruction_data[] = "hello world";

  SolPubkey program_id = {{1}};
  SolPubkey user_key = {{2}};

  const SolSignerSeed state_seeds[] = {{(const uint8_t *)"state", sizeof("state") - 1}};
  SolPubkey state_key;
  uint8_t state_bump_seed;

  sol_assert(sol_try_find_program_address(
                 state_seeds,
                 SOL_ARRAY_SIZE(state_seeds),
                 &program_id,
                 &state_key,
                 &state_bump_seed) == SUCCESS);

  uint64_t lamports = 1;

  uint8_t *user_acct_data;
  uint8_t *state_acct_data = (uint8_t *)(&user_key);

  SolAccountInfo accounts[] = {
      {&user_key, &lamports, 0, user_acct_data, 0, 0, true, false, false},
      {&state_key, &lamports, SIZE_PUBKEY, state_acct_data, &program_id, 0, false, false, false},
  };

  SolParameters params = {
      accounts,
      sizeof(accounts),
      instruction_data,
      SOL_ARRAY_SIZE(instruction_data) - 1,
      &program_id,
  };

  broadcast_memo(&params);
}