import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import * as web3 from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import { TokenInfo, TokenListProvider } from "@solana/spl-token-registry";
import { useIsMounted } from "./useIsMounted";
import { useCallback } from "react";

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

        const handle = connection.onAccountChange(publicKey, (newAccountInfo) => {
            if (!cancelled) {
                setAccountInfo(newAccountInfo);
            }
        });

        return () => {
            connection.removeAccountChangeListener(handle);
            cancelled = true;
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
    const mounted = useIsMounted();

    const refresh = useCallback(async () => {
        if (!connection || !publicKey) {
            if (mounted) {
                setTokenAccounts([]);
            }
            return;
        }

        const response = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: spl.TOKEN_PROGRAM_ID })
        if (mounted) setTokenAccounts(response.value);
    }, [connection, publicKey, mounted]);

    useEffect(() => {
        if (!connection || !publicKey) {
            return setTokenAccounts([]);
        }
        refresh()
    }, [connection, publicKey, refresh])

    return { tokenAccounts, refreshTokenAccounts: refresh };
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