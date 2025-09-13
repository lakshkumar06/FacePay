use anchor_lang::prelude::*;
use anchor_lang::solana_program::{system_instruction, program::invoke};
use anchor_lang::solana_program::clock::Clock;

declare_id!("BDxWn2UWjfanhXvCWxzRoJjbDRqeVmd28rU3gADt23k");

#[program]
pub mod facepay_program {
    use super::*;

    // Buyer calls this to pay 0.01 SOL (10,000,000 lamports) to merchant
    pub fn buy(ctx: Context<Buy>) -> Result<()> {
        let amount = 10_000_000; // 0.01 SOL in lamports
        // CPI: transfer lamports from payer to merchant
        let ix = system_instruction::transfer(
            &ctx.accounts.payer.key(),
            &ctx.accounts.merchant.key(),
            amount,
        );

        // invoke system transfer; payer must be signer in the transaction
        invoke(
            &ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.merchant.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Emit event with timestamp
        let ts = Clock::get()?.unix_timestamp;
        emit!(Purchase {
            buyer: ctx.accounts.payer.key(),
            merchant: ctx.accounts.merchant.key(),
            amount,
            timestamp: ts,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Buy<'info> {
    /// CHECK: payer must be a signer (wallet)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: recipient of funds
    /// (can be any account, merchant's pubkey)
    #[account(mut)]
    pub merchant: UncheckedAccount<'info>,

    /// System program for transfer CPI
    pub system_program: Program<'info, System>,
}

#[event]
pub struct Purchase {
    pub buyer: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
