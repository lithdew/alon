import { useMemo } from "react";
import { useAccountInfo, useTokenAccounts, useTokenList } from "./useWeb3";
import * as web3 from "@solana/web3.js";
import { RefreshIcon } from "@heroicons/react/outline";

export const TokenAccounts = () => {
    const accountInfo = useAccountInfo();
    const { tokenAccounts, refreshTokenAccounts } = useTokenAccounts();

    const tokenList = useTokenList();

    const balance = useMemo<string | null>(() => {
        if (!accountInfo) return null;
        const numDecimals = 9 - Math.max(0, accountInfo.lamports.toString().indexOf('.'));
        return (accountInfo.lamports / web3.LAMPORTS_PER_SOL).toFixed(numDecimals)
    }, [accountInfo]);

    const tokenAccountContent = useMemo(() => {
        if (!tokenList) return [];

        const sorted = tokenAccounts.sort((a, b) => {
            return Number.parseFloat(b.account.data.parsed.info.tokenAmount.uiAmountString) - Number.parseFloat(a.account.data.parsed.info.tokenAmount.uiAmountString);
        });

        return sorted.map((tokenAccount) => {
            const key = tokenAccount.pubkey.toBase58();
            const mintKey = tokenAccount.account.data.parsed.info.mint;
            const amount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmountString;
            const info = tokenList.find((tokenInfo) => tokenInfo.address === mintKey);

            return { key, mintKey, amount, info };
        });
    }, [tokenAccounts, tokenList]);

    return (
        <>
            <div className="font-lg leading-6 mb-1 flex justify-between">
                Tokens
                <button onClick={refreshTokenAccounts}>
                    <RefreshIcon className="w-5 h-5 p-0.5 bg-gray-100 hover:bg-gray-300 rounded-lg" />
                </button>
            </div>

            <dl className="h-36 bg-gray-100 border grid auto-rows-min gap-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                <div className="grid grid-cols-2 gap-1 px-2 py-1 text-xs bg-white whitespace-nowrap">
                    <dt className="font-medium text-gray-500">Solana</dt>
                    <dd className="text-gray-900">{balance ?? "-"} SOL</dd>
                </div>
                {tokenAccountContent.map(tokenAccount => {
                    return (
                        <div key={tokenAccount.key} className="grid grid-cols-2 gap-1 px-2 py-1 text-xs whitespace-nowrap bg-white">
                            <dt className="font-medium">
                                <a href={`https://explorer.solana.com/address/${tokenAccount.mintKey}`} target="_blank" rel="noreferrer" className="block overflow-hidden overflow-ellipsis text-gray-500 hover:underline">{tokenAccount.info?.name ?? "Unknown"}</a>
                            </dt>
                            <dd className="">
                                <a href={`https://explorer.solana.com/address/${tokenAccount.key}`} target="_blank" rel="noreferrer" className="block overflow-hidden overflow-ellipsis text-gray-900 hover:underline">{tokenAccount.amount} {tokenAccount.info?.symbol ?? ""}</a>
                            </dd>
                        </div>
                    )
                })}
            </dl>
        </>
    )
};