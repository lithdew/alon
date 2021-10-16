// An extremely basic lottery program. DO NOT use real SOL with this program.

// Note that the entrypoint of the Solana program in Alon must be a function with
// the following signature: `uint64_t entrypoint(const uint8_t *input)`.

#include "example_lottery.h"

// Set of all possible instruction opcodes for this lottery program.

#define CMD_CREATE (0)
#define CMD_BUY (1)
#define CMD_END (2)
#define CMD_SEND (3)

// Fetch the public key of the user that bought a ticket with an assigned index.
SolPubkey *get_ticket(SolAccountInfo *lottery_acct, uint64_t index)
{
    uint64_t offset = 64 + (index * sizeof(SolPubkey));
    sol_assert(offset + sizeof(SolPubkey) <= lottery_acct->data_len);
    return (SolPubkey *)(lottery_acct->data + offset);
}

// Instantiate a new lottery, with the signer assigned to be the lottery's authority.
// A default set of parameters are used to instantiate the lottery. A better revision
// of this program would allow for these parameters to be configurable.
uint64_t create_lottery(struct lottery *lottery, SolParameters *params)
{
    sol_assert(lottery->count == 0);

    *lottery = (struct lottery){
        .lamports_per_ticket = 100000,
        .max_tickets = 100,
        .deadline = 0,
        .count = 0,
        .winner = {
            .is_set = 0,
            .val = 0,
        },
    };

    return SUCCESS;
}

// Purchase a lottery ticket 0.0001 SOL (100,000 lamports).
uint64_t buy_ticket(struct lottery *lottery, SolParameters *params)
{
    SolAccountInfo *lottery_acct = &params->ka[0];
    SolAccountInfo *customer_acct = &params->ka[1];
    SolAccountInfo *system_program_acct = &params->ka[2];

    // Assert that the lottery isn't over yet, and that there are tickets
    // left that may still be bought.

    sol_assert(!lottery->winner.is_set);
    sol_assert(lottery->count < lottery->max_tickets);
    sol_assert(!lottery_acct->is_signer);
    sol_assert(lottery_acct->is_writable);

    // Assert that the customer has signed this transaction.
    sol_assert(customer_acct->is_signer);
    sol_assert(customer_acct->is_writable);
    sol_assert(*customer_acct->lamports > lottery->lamports_per_ticket);

    // Assert that the lottery account is a valid program-derived account.

    sol_assert(SolPubkey_same(lottery_acct->owner, params->program_id));

    // Transfer funds.

    SolAccountMeta arguments[] = {
        {customer_acct->key, true, true},
        {lottery_acct->key, true, false}};

    uint8_t data[12];
    *(uint32_t *)data = 2;
    *(uint64_t *)(data + 4) = lottery->lamports_per_ticket;

    const SolInstruction instruction = {
        system_program_acct->key,
        arguments,
        SOL_ARRAY_SIZE(arguments),
        data,
        SOL_ARRAY_SIZE(data),
    };

    // Provide the buyer a ticket.

    sol_assert(SUCCESS == sol_invoke(&instruction, params->ka, params->ka_num));
    sol_memcpy(get_ticket(lottery_acct, lottery->count), customer_acct->key, sizeof(SolPubkey));
    lottery->count += 1;

    return SUCCESS;
}

// Randomly select 1 of the lottery tickets and designate it as the lottery's
// winner. Only the lottery's authority may invoke this instruction.
uint64_t end_lottery(struct lottery *lottery, struct cmd *cmd, SolParameters *params)
{
    SolAccountInfo *lottery_acct = &params->ka[0];
    SolAccountInfo *admin_acct = &params->ka[1];

    // Assert that a lottery winner has not been chosen yet.

    sol_assert(!lottery->winner.is_set);
    sol_assert(lottery_acct->is_writable);

    // Assert that the lottery account is a valid program-derived account.

    sol_assert(SolPubkey_same(lottery_acct->owner, params->program_id));

    // Assert that the lottery's admin authority has signed this transaction.

    sol_assert(admin_acct->is_signer);

    // Assert that a random seed has been provided to pick the winner of this
    // lottery.

    sol_assert(cmd->seed.is_set);

    // Use the seed to pick a random ticket as the winning ticket for this lottery.

    lottery->winner.val = cmd->seed.val % lottery->count;
    lottery->winner.is_set = true;

    // Log the winner's public key.

    SolPubkey *winner = get_ticket(lottery_acct, lottery->winner.val);
    sol_log("winner:");
    sol_log_pubkey(winner);

    return SUCCESS;
}

// Transfer all locked SOL in this lottery program to the the lottery's
// winner. Only the lottery's authority may invoke this instruction.
uint64_t send_winnings(struct lottery *lottery, SolParameters *params)
{
    SolAccountInfo *lottery_acct = &params->ka[0];
    SolAccountInfo *customer_acct = &params->ka[1];

    // Assert that a lottery winner has already been selected.

    sol_assert(lottery->winner.is_set);

    // Assert that the lottery account is a valid program-derived account.

    sol_assert(SolPubkey_same(lottery_acct->owner, params->program_id));

    // Assert that the customer account is the lottery winner.

    sol_assert(SolPubkey_same(customer_acct->key, get_ticket(lottery_acct, lottery->winner.val)));

    // Transfer SOL rewards to the winner.

    *customer_acct->lamports += *lottery_acct->lamports;
    *lottery_acct->lamports = 0;

    return SUCCESS;
}

// The main entrypoint of the lottery program. Rename `lottery_entrypoint` to `entrypoint` in
// order to compile this Solana program with Alon.
uint64_t lottery_entrypoint(const uint8_t *input)
{
    // Load 3 accounts.
    // Account 1: Lottery Program-Derived Account (derived with seeds [admin_public_key, "lottery"])
    // Account 2: User Account (must not {be writable, have signed this transaction})

    SolAccountInfo accounts[3];
    SolParameters params = {.ka = accounts};
    sol_assert(sol_deserialize(input, &params, SOL_ARRAY_SIZE(accounts)));

    // Deserialize the instruction, and invoke the appropriate instruction that
    // was requested by the transaction sender.

    struct cmd cmd;
    struct lottery lottery;

    sol_assert(0 == cmd_deserialize_instruction(&params, &cmd));
    sol_assert(0 == lottery_deserialize_account(&params.ka[0], &lottery));

    switch (cmd.which)
    {
    case CMD_CREATE:
        sol_assert(0 == create_lottery(&lottery, &params));
        break;
    case CMD_BUY:
        sol_assert(0 == buy_ticket(&lottery, &params));
        break;
    case CMD_END:
        sol_assert(0 == end_lottery(&lottery, &cmd, &params));
        break;
    case CMD_SEND:
        sol_assert(0 == send_winnings(&lottery, &params));
        break;
    default:
        return ERROR_INVALID_ARGUMENT;
    }

    // Re-serialize all changes made to the lottery state.

    sol_assert(0 == lottery_serialize_account(&lottery, &params.ka[0]));

    return SUCCESS;
}

void test_get_ticket__works()
{
    uint8_t data[5 * 32] = {0};
    SolAccountInfo lottery = {
        .data = data,
        .data_len = 5 * 32,
    };

    sol_assert((lottery.data + 64) == (uint8_t *)get_ticket(&lottery, 0));
    sol_assert(NULL != get_ticket(&lottery, 1));
    sol_assert(NULL != get_ticket(&lottery, 2));
}