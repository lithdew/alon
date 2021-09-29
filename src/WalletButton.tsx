import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal, WalletIcon } from "@solana/wallet-adapter-react-ui";
import { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react";

import "@solana/wallet-adapter-react-ui/styles.css";

const WalletButton = ({ ...props }) => {
    const { publicKey, wallet, connect, connecting, connected, disconnect } =
        useWallet();
    const { setVisible } = useWalletModal();
    const [copied, setCopied] = useState(false);
    const [active, setActive] = useState(false);
    const ref = useRef<HTMLUListElement>(null);

    const base58 = useMemo(() => publicKey?.toBase58(), [publicKey]);
    const content = useMemo(() => {
        if (!wallet) {
            return null;
        }
        if (!base58) {
            if (connecting) return "Connecting...";
            if (connected) return "Connected";
            return "Connect Wallet";
        }
        return base58.slice(0, 8) + "…" + base58.slice(-8);
    }, [wallet, connecting, connected, base58]);

    const copyAddress = useCallback(async () => {
        if (base58) {
            await navigator.clipboard.writeText(base58);
            setCopied(true);
            setTimeout(() => setCopied(false), 400);
        }
    }, [base58]);

    const openDropdown = useCallback(() => setActive(true), [setActive]);

    const closeDropdown = useCallback(() => setActive(false), [setActive]);

    const openModal = useCallback(() => {
        setVisible(true);
        closeDropdown();
    }, [setVisible, closeDropdown]);

    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const node = ref.current;
            if (!node || node.contains(event.target as Node)) {
                return;
            }
            closeDropdown();
        };

        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);

        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, closeDropdown]);

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        async (event) => {
            if (event.defaultPrevented) return;
            if (!wallet) return openModal();
            if (!base58) return await connect();
            return openDropdown();
        },
        [wallet, base58, connect, openModal, openDropdown]
    );

    const handleDisconnectClick: MouseEventHandler<HTMLLIElement> = useCallback(async (event) => {
        if (event.defaultPrevented) return;
        closeDropdown();
        await disconnect();
    }, [disconnect, closeDropdown])

    return (
        <div className={`relative inline-block ${props.className}`}>
            <button
                aria-expanded={active}
                className={`w-full bg-gray-100 hover:bg-gray-300 rounded inline-flex justify-center gap-2 items-center px-2 py-1 ${active ? `pointer-events-none` : `pointer-events-auto`
                    } `}
                onClick={handleClick}
            >
                <WalletIcon wallet={wallet} className="fill-current w-4 h-4" />
                <span>{content || "Select Wallet"}</span>
            </button>
            <ul
                aria-label="dropdown-list"
                className={`wallet-adapter-dropdown-list ${active ? "wallet-adapter-dropdown-list-active" : ""} `}
                ref={ref}
                role="menu"
            >
                <li
                    onClick={copyAddress}
                    className="wallet-adapter-dropdown-list-item"
                    role="menuitem"
                >
                    {copied ? "Copied" : "Copy address"}
                </li>
                <li
                    onClick={openModal}
                    className="wallet-adapter-dropdown-list-item"
                    role="menuitem"
                >
                    Connect a different wallet
                </li>
                <li
                    onClick={handleDisconnectClick}
                    className="wallet-adapter-dropdown-list-item"
                    role="menuitem"
                >
                    Disconnect
                </li>
            </ul>
        </div>
    );
};


export default WalletButton;