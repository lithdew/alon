import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import * as web3 from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import { TokenInfo, TokenListProvider } from "@solana/spl-token-registry";

export const useAccountInfo = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [accountInfo, setAccountInfo] = useState<web3.AccountInfo<Buffer> | null>(null);

    useEffect(() => {
        if (!connection || !publicKey) {
            return setAccountInfo(null);
        }

        let cancelled = false;

        (async () => {
            const info = await connection.getAccountInfo(publicKey)
            if (!cancelled) setAccountInfo(info);
        })()

        return () => {
            cancelled = true
        }
    }, [connection, publicKey])

    return accountInfo;
}

export const useSlotInfo = () => {
    const { connection } = useConnection();
    const [slotInfo, setSlotInfo] = useState<web3.SlotInfo | null>(null);

    useEffect(() => {
        if (!connection) {
            return setSlotInfo(null);
        }
        let cancelled = false;
        const handle = connection.onSlotChange((newSlotInfo) => {
            if (!cancelled) {
                setSlotInfo(newSlotInfo);
            }
        });
        return () => {
            cancelled = true;
            connection.removeSlotChangeListener(handle);
        }
    }, [connection]);

    return slotInfo;
}

export const useTokenAccounts = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [tokenAccounts, setTokenAccounts] = useState<{ pubkey: web3.PublicKey, account: web3.AccountInfo<web3.ParsedAccountData> }[]>([]);
    useEffect(() => {
        if (!connection || !publicKey) {
            return setTokenAccounts([]);
        }
        let cancelled = false;

        (async () => {
            const response = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: spl.TOKEN_PROGRAM_ID })
            if (!cancelled) setTokenAccounts(response.value);
        })()

        return () => {
            cancelled = true
        }
    }, [connection, publicKey])

    return tokenAccounts
}

export const useTokenList = () => {
    const [tokenList, setTokenList] = useState<TokenInfo[] | null>(null);

    useEffect(() => {
        (async () => {
            const list = await new TokenListProvider().resolve();
            setTokenList(list.getList());
        })();
    }, []);

    return tokenList;
}